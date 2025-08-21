import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { RateLimiter } from '@/lib/security'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createRateLimitErrorResponse,
  withErrorHandling,
  addSecurityHeaders,
  validateRequestMethod,
  getClientIP
} from '@/lib/api-response'
import {
  CreateBoardMateRequest,
  BoardMateCreationResponse,
  BOARD_ROLES
} from '@/features/boardmates/types'

// Rate limiter for BoardMate creation
const createBoardMateRateLimiter = new RateLimiter(10, 5, 60 * 60 * 1000) // 5 per hour per IP

/**
 * Get device information from request
 */
function getDeviceInfo(request: NextRequest) {
  return {
    userAgent: request.headers.get('user-agent') || 'Unknown',
    fingerprint: request.headers.get('x-device-fingerprint') || 'unknown',
    ip: getClientIP(request)
  }
}

/**
 * Validate BoardMate creation request
 */
function validateCreateRequest(data: any): { isValid: boolean; errors: string[]; sanitizedData?: CreateBoardMateRequest } {
  const errors: string[] = []

  // Validate personal info
  if (!data.personalInfo || typeof data.personalInfo !== 'object') {
    errors.push('Personal information is required')
  } else {
    const personal = data.personalInfo

    if (!personal.fullName || typeof personal.fullName !== 'string') {
      errors.push('Full name is required')
    } else if (personal.fullName.length < 2 || personal.fullName.length > 100) {
      errors.push('Full name must be between 2 and 100 characters')
    }

    if (!personal.email || typeof personal.email !== 'string') {
      errors.push('Email address is required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)) {
      errors.push('Valid email address is required')
    }

    if (!personal.organization || typeof personal.organization !== 'string') {
      errors.push('Organization is required')
    } else if (personal.organization.length < 2 || personal.organization.length > 100) {
      errors.push('Organization name must be between 2 and 100 characters')
    }

    if (!personal.role || !BOARD_ROLES.find(role => role.value === personal.role)) {
      errors.push('Valid board role is required')
    }

    if (personal.phoneNumber && typeof personal.phoneNumber === 'string') {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
      if (!phoneRegex.test(personal.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
        errors.push('Invalid phone number format')
      }
    }

    if (personal.bio && (typeof personal.bio !== 'string' || personal.bio.length > 1000)) {
      errors.push('Bio must be a string with maximum 1000 characters')
    }

    if (personal.linkedinProfile && typeof personal.linkedinProfile === 'string') {
      try {
        new URL(personal.linkedinProfile)
      } catch {
        errors.push('LinkedIn profile must be a valid URL')
      }
    }
  }

  // Validate invite settings
  if (!data.inviteSettings || typeof data.inviteSettings !== 'object') {
    errors.push('Invite settings are required')
  } else {
    const invite = data.inviteSettings

    if (typeof invite.inviteToBoardUser !== 'boolean') {
      errors.push('Invite to BoardUser setting must be boolean')
    }

    if (typeof invite.sendWelcomeEmail !== 'boolean') {
      errors.push('Send welcome email setting must be boolean')
    }

    if (typeof invite.grantImmediateAccess !== 'boolean') {
      errors.push('Grant immediate access setting must be boolean')
    }

    if (!['full', 'restricted', 'view_only'].includes(invite.accessLevel)) {
      errors.push('Invalid access level')
    }

    if (invite.customMessage && (typeof invite.customMessage !== 'string' || invite.customMessage.length > 500)) {
      errors.push('Custom message must be a string with maximum 500 characters')
    }
  }

  // Validate organization and user IDs
  if (!data.organizationId || typeof data.organizationId !== 'string') {
    errors.push('Organization ID is required')
  }

  if (!data.createdBy || typeof data.createdBy !== 'string') {
    errors.push('Creator user ID is required')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: {
      personalInfo: {
        fullName: data.personalInfo.fullName.trim(),
        email: data.personalInfo.email.toLowerCase().trim(),
        phoneNumber: data.personalInfo.phoneNumber?.trim() || '',
        address: {
          street: data.personalInfo.address?.street?.trim() || '',
          city: data.personalInfo.address?.city?.trim() || '',
          state: data.personalInfo.address?.state?.trim() || '',
          postalCode: data.personalInfo.address?.postalCode?.trim() || '',
          country: data.personalInfo.address?.country?.trim() || 'United States'
        },
        organization: data.personalInfo.organization.trim(),
        role: data.personalInfo.role,
        title: data.personalInfo.title?.trim(),
        department: data.personalInfo.department?.trim(),
        linkedinProfile: data.personalInfo.linkedinProfile?.trim(),
        bio: data.personalInfo.bio?.trim()
      },
      inviteSettings: data.inviteSettings,
      organizationId: data.organizationId,
      createdBy: data.createdBy,
      notificationPreferences: data.notificationPreferences || {
        emailUpdates: true,
        smsNotifications: false,
        meetingReminders: true,
        documentAlerts: true
      }
    }
  }
}

/**
 * Create BoardMate profile in database
 */
async function createBoardMateProfile(data: CreateBoardMateRequest) {
  try {
    // First check if BoardMate with this email already exists in this organization
    const { data: existingBoardMate, error: checkError } = await supabaseAdmin
      .from('board_members')
      .select('id, email')
      .eq('email', data.personalInfo.email)
      .eq('organization_id', data.organizationId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing BoardMate:', checkError)
      return { success: false, error: checkError.message }
    }

    if (existingBoardMate) {
      return { success: false, error: 'A BoardMate with this email already exists in this organization' }
    }

    // Create BoardMate profile
    const { data: boardMate, error: createError } = await supabaseAdmin
      .from('board_members')
      .insert({
        organization_id: data.organizationId,
        full_name: data.personalInfo.fullName,
        email: data.personalInfo.email,
        phone_number: data.personalInfo.phoneNumber,
        address: data.personalInfo.address,
        organization_name: data.personalInfo.organization,
        board_role: data.personalInfo.role,
        title: data.personalInfo.title,
        department: data.personalInfo.department,
        linkedin_profile: data.personalInfo.linkedinProfile,
        bio: data.personalInfo.bio,
        created_by: data.createdBy,
        is_active: true,
        status: data.inviteSettings.inviteToBoardUser ? 'invited' : 'contact',
        access_level: data.inviteSettings.accessLevel,
        permissions: {
          board_pack_access: data.inviteSettings.boardPackAccess,
          meeting_access: data.inviteSettings.meetingAccess,
          document_access: data.inviteSettings.documentAccess
        },
        notification_preferences: data.notificationPreferences
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating BoardMate:', createError)
      return { success: false, error: createError.message }
    }

    return { success: true, boardMate }
  } catch (error) {
    console.error('Unexpected error creating BoardMate:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Create invitation record and send email
 */
async function createInvitation(boardMateId: string, data: CreateBoardMateRequest) {
  try {
    if (!data.inviteSettings.inviteToBoardUser) {
      return { success: true, emailSent: false }
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('board_member_invitations')
      .insert({
        board_member_id: boardMateId,
        organization_id: data.organizationId,
        invited_by: data.createdBy,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        access_level: data.inviteSettings.accessLevel,
        custom_message: data.inviteSettings.customMessage,
        send_welcome_email: data.inviteSettings.sendWelcomeEmail,
        grant_immediate_access: data.inviteSettings.grantImmediateAccess,
        status: 'pending'
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return { success: false, error: inviteError.message }
    }

    // TODO: Send email invitation
    // This would integrate with your email service (SendGrid, Mailgun, etc.)
    let emailSent = false
    if (data.inviteSettings.sendWelcomeEmail) {
      try {
        // TODO: Implement email sending logic
        // await sendBoardMateInvitationEmail({
        //   to: data.personalInfo.email,
        //   boardMateName: data.personalInfo.fullName,
        //   organizationName: data.personalInfo.organization,
        //   invitationToken: invitationToken,
        //   customMessage: data.inviteSettings.customMessage,
        //   createdBy: data.createdBy
        // })
        emailSent = true
        console.log(`Would send invitation email to ${data.personalInfo.email}`)
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError)
        // Don't fail the entire process if email fails
      }
    }

    return { 
      success: true, 
      invitation: {
        id: invitation.id,
        invitationToken,
        expiresAt: expiresAt.toISOString()
      },
      emailSent 
    }
  } catch (error) {
    console.error('Unexpected error creating invitation:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Create audit log for BoardMate creation
 */
async function createAuditLog(boardMateId: string, data: CreateBoardMateRequest) {
  try {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        organization_id: data.organizationId,
        user_id: data.createdBy,
        event_type: 'user_action',
        action: 'create_board_mate',
        resource_type: 'board_member',
        resource_id: boardMateId,
        details: {
          board_mate_name: data.personalInfo.fullName,
          board_mate_email: data.personalInfo.email,
          board_role: data.personalInfo.role,
          invited_to_platform: data.inviteSettings.inviteToBoardUser,
          access_level: data.inviteSettings.accessLevel
        },
        outcome: 'success',
        severity: 'low',
        event_category: 'user_action',
        event_description: `Created BoardMate profile for ${data.personalInfo.fullName}`,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error creating audit log:', error)
    // Don't throw - audit logging failures shouldn't break business operations
  }
}

/**
 * POST /api/boardmates/create - Create BoardMate with invitation
 */
async function handleCreateBoardMate(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!createBoardMateRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(60 * 60) // 1 hour
  }

  let body: any
  try {
    body = await request.json()
  } catch (error) {
    return createErrorResponse('Invalid JSON in request body', 400)
  }

  // Validate request data
  const validation = validateCreateRequest(body)
  if (!validation.isValid) {
    return createValidationErrorResponse(validation.errors)
  }

  const { sanitizedData } = validation
  if (!sanitizedData) {
    return createErrorResponse('Data validation failed', 500)
  }

  try {
    // Create BoardMate profile
    const profileResult = await createBoardMateProfile(sanitizedData)
    if (!profileResult.success) {
      return createErrorResponse(profileResult.error || 'Failed to create BoardMate profile', 400)
    }

    const boardMate = profileResult.boardMate!

    // Create invitation if needed
    const invitationResult = await createInvitation(boardMate.id, sanitizedData)
    if (!invitationResult.success) {
      // Cleanup BoardMate if invitation creation fails
      await supabaseAdmin
        .from('board_members')
        .delete()
        .eq('id', boardMate.id)
      
      return createErrorResponse(invitationResult.error || 'Failed to create invitation', 400)
    }

    // Create audit log
    await createAuditLog(boardMate.id, sanitizedData)

    const response: BoardMateCreationResponse = {
      success: true,
      boardMate: {
        id: boardMate.id,
        fullName: boardMate.full_name,
        email: boardMate.email,
        role: boardMate.board_role
      },
      ...(invitationResult.invitation && { invitation: invitationResult.invitation }),
      emailSent: invitationResult.emailSent || false
    }

    const apiResponse = createSuccessResponse(
      response,
      'BoardMate created successfully'
    )

    return addSecurityHeaders(apiResponse)
  } catch (error) {
    console.error('Error creating BoardMate:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * Route handlers
 */
async function handleBoardMateCreate(request: NextRequest) {
  const allowedMethods = ['POST']
  if (!validateRequestMethod(request, allowedMethods)) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    switch (request.method) {
      case 'POST':
        return await handleCreateBoardMate(request)
      default:
        return createErrorResponse('Method not allowed', 405)
    }
  } catch (error) {
    console.error('Unexpected error in BoardMate create API:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Export route handlers
export const POST = withErrorHandling(handleBoardMateCreate)