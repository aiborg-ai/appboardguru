import { NextRequest } from 'next/server'
import nodemailer from 'nodemailer'
import { env, getSmtpConfig } from '@/config/environment'
import { 
  createInvitation,
  listPendingInvitations,
  revokeInvitation,
  resendInvitation,
  type CreateInvitationData,
  type DeviceInfo 
} from '@/lib/services/invitations'
import { 
  organizationInvitationTemplate,
  generateTextFallback 
} from '@/lib/services/email-templates'
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
import { supabaseAdmin } from '@/lib/supabase-admin'

// Rate limiters
const createInvitationRateLimiter = new RateLimiter(20, 10, 15 * 60 * 1000) // 10 per 15 minutes per IP
const listInvitationsRateLimiter = new RateLimiter(50, 30, 60 * 1000) // 30 per minute per IP

/**
 * Get device information from request
 */
function getDeviceInfo(request: NextRequest): DeviceInfo {
  return {
    userAgent: request.headers.get('user-agent') || 'Unknown',
    fingerprint: request.headers.get('x-device-fingerprint') || 'unknown',
    ip: getClientIP(request)
  }
}

/**
 * Validate invitation data
 */
function validateInvitationData(data: any): { isValid: boolean; errors: string[]; sanitizedData?: CreateInvitationData } {
  const errors: string[] = []

  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format')
  }

  if (!data.role || typeof data.role !== 'string') {
    errors.push('Role is required')
  } else if (!['owner', 'admin', 'member', 'viewer'].includes(data.role)) {
    errors.push('Invalid role. Must be one of: owner, admin, member, viewer')
  }

  if (data.personalMessage && typeof data.personalMessage !== 'string') {
    errors.push('Personal message must be a string')
  } else if (data.personalMessage && data.personalMessage.length > 500) {
    errors.push('Personal message cannot exceed 500 characters')
  }

  if (data.expiresIn !== undefined) {
    if (typeof data.expiresIn !== 'number' || data.expiresIn < 1 || data.expiresIn > 168) {
      errors.push('Expiration time must be between 1 and 168 hours (1 week)')
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: {
      email: data.email.toLowerCase().trim(),
      role: data.role,
      personalMessage: data.personalMessage?.trim(),
      expiresIn: data.expiresIn || 72
    }
  }
}

/**
 * POST /api/invitations - Create a new invitation
 */
async function handleCreateInvitation(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!createInvitationRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(15 * 60) // 15 minutes
  }

  // Parse request body
  let body: any
  try {
    body = await request.json()
  } catch (error) {
    return createErrorResponse('Invalid JSON in request body', 400)
  }

  // Validate required fields
  if (!body.organizationId || typeof body.organizationId !== 'string') {
    return createValidationErrorResponse(['Organization ID is required'])
  }

  if (!body.invitedBy || typeof body.invitedBy !== 'string') {
    return createValidationErrorResponse(['Inviter ID is required'])
  }

  // Validate invitation data
  const validation = validateInvitationData(body)
  if (!validation.isValid) {
    return createValidationErrorResponse(validation.errors)
  }

  const { sanitizedData } = validation
  if (!sanitizedData) {
    return createErrorResponse('Data validation failed', 500)
  }

  try {
    // Create the invitation
    const result = await createInvitation(
      body.organizationId,
      sanitizedData,
      body.invitedBy,
      deviceInfo
    )

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to create invitation', 400)
    }

    if (!result.invitation) {
      return createErrorResponse('Invitation creation failed', 500)
    }

    const invitation = result.invitation

    // Generate accept URL
    const acceptUrl = `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/accept?token=${invitation.invitation_token}`
    
    // Generate reject URL (optional)
    const rejectUrl = `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/reject?token=${invitation.invitation_token}`

    // Generate email template
    const emailData = {
      invitationToken: invitation.invitation_token,
      organizationName: invitation.organization?.name || 'Unknown Organization',
      organizationSlug: invitation.organization?.slug || 'unknown',
      organizationLogo: invitation.organization?.logo_url,
      inviterName: invitation.inviter?.full_name || invitation.inviter?.email || 'Unknown',
      inviterEmail: invitation.inviter?.email || 'unknown@example.com',
      recipientEmail: invitation.email,
      role: invitation.role,
      personalMessage: invitation.personal_message,
      expiresAt: invitation.token_expires_at,
      acceptUrl,
      rejectUrl
    }

    const { subject, html } = organizationInvitationTemplate(emailData)
    const textFallback = generateTextFallback({
      subject,
      organizationName: emailData.organizationName,
      inviterName: emailData.inviterName
    })

    // Send email
    try {
      const transporter = nodemailer.createTransport(getSmtpConfig())
      
      await transporter.sendMail({
        from: `"BoardGuru - ${emailData.organizationName}" <${env.SMTP_USER}>`,
        to: invitation.email,
        subject,
        html,
        text: textFallback,
        // Security headers
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'BoardGuru Platform',
          'X-Auto-Response-Suppress': 'All',
        }
      })

      console.log(`📧 Invitation email sent to ${invitation.email} for organization ${emailData.organizationName}`)
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      
      // Don't fail the request if email fails - invitation is still created
      console.warn('Invitation created but email failed to send')
    }

    // Return success response with minimal data for security
    const response = createSuccessResponse({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.organization_id,
      status: invitation.status,
      expiresAt: invitation.token_expires_at,
      createdAt: invitation.created_at
    }, 'Invitation sent successfully')

    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Error creating invitation:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * GET /api/invitations - List pending invitations for an organization
 */
async function handleListInvitations(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!listInvitationsRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(60) // 1 minute
  }

  const { searchParams } = new URL(request.url)
  const organizationId = searchParams.get('organizationId')
  const userId = searchParams.get('userId')

  if (!organizationId) {
    return createValidationErrorResponse(['Organization ID is required'])
  }

  if (!userId) {
    return createValidationErrorResponse(['User ID is required'])
  }

  try {
    const result = await listPendingInvitations(organizationId, userId)

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to list invitations', 400)
    }

    // Return safe invitation data (without tokens)
    const safeInvitations = result.invitations?.map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      createdAt: inv.created_at,
      expiresAt: inv.token_expires_at,
      attemptCount: inv.attempt_count,
      personalMessage: inv.personal_message,
      inviter: inv.inviter ? {
        email: inv.inviter.email,
        fullName: inv.inviter.full_name
      } : null
    })) || []

    const response = createSuccessResponse({
      invitations: safeInvitations,
      total: safeInvitations.length
    }, 'Invitations retrieved successfully')

    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Error listing invitations:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * PATCH /api/invitations/[id] - Update invitation (resend or revoke)
 */
async function handleUpdateInvitation(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!createInvitationRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(15 * 60) // 15 minutes
  }

  // Parse request body
  let body: any
  try {
    body = await request.json()
  } catch (error) {
    return createErrorResponse('Invalid JSON in request body', 400)
  }

  if (!body.action || !['resend', 'revoke'].includes(body.action)) {
    return createValidationErrorResponse(['Action must be either "resend" or "revoke"'])
  }

  if (!body.invitationId || typeof body.invitationId !== 'string') {
    return createValidationErrorResponse(['Invitation ID is required'])
  }

  if (!body.userId || typeof body.userId !== 'string') {
    return createValidationErrorResponse(['User ID is required'])
  }

  try {
    if (body.action === 'revoke') {
      const result = await revokeInvitation(
        body.invitationId,
        body.userId,
        body.reason,
        deviceInfo
      )

      if (!result.success) {
        return createErrorResponse(result.error || 'Failed to revoke invitation', 400)
      }

      const response = createSuccessResponse(
        { invitationId: body.invitationId, action: 'revoked' },
        'Invitation revoked successfully'
      )
      return addSecurityHeaders(response)

    } else if (body.action === 'resend') {
      const result = await resendInvitation(
        body.invitationId,
        body.userId,
        deviceInfo
      )

      if (!result.success) {
        return createErrorResponse(result.error || 'Failed to resend invitation', 400)
      }

      if (!result.invitation) {
        return createErrorResponse('Failed to resend invitation', 500)
      }

      const invitation = result.invitation

      // Generate new accept URL with new token
      const acceptUrl = `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/accept?token=${invitation.invitation_token}`

      // Send reminder email
      try {
        const emailData = {
          invitationToken: invitation.invitation_token,
          organizationName: invitation.organization?.name || 'Unknown Organization',
          organizationSlug: invitation.organization?.slug || 'unknown',
          organizationLogo: invitation.organization?.logo_url,
          inviterName: invitation.inviter?.full_name || invitation.inviter?.email || 'Unknown',
          inviterEmail: invitation.inviter?.email || 'unknown@example.com',
          recipientEmail: invitation.email,
          role: invitation.role,
          personalMessage: invitation.personal_message,
          expiresAt: invitation.token_expires_at,
          acceptUrl
        }

        const { subject, html } = organizationInvitationTemplate(emailData)
        const textFallback = generateTextFallback({
          subject: `[RESENT] ${subject}`,
          organizationName: emailData.organizationName,
          inviterName: emailData.inviterName
        })

        const transporter = nodemailer.createTransport(getSmtpConfig())
        
        await transporter.sendMail({
          from: `"BoardGuru - ${emailData.organizationName}" <${env.SMTP_USER}>`,
          to: invitation.email,
          subject: `[RESENT] ${subject}`,
          html,
          text: textFallback,
          headers: {
            'X-Priority': '3',
            'X-Mailer': 'BoardGuru Platform',
            'X-Auto-Response-Suppress': 'All',
          }
        })

        console.log(`📧 Resent invitation email to ${invitation.email}`)
      } catch (emailError) {
        console.error('Failed to send resent invitation email:', emailError)
        // Don't fail the request
      }

      const response = createSuccessResponse({
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.token_expires_at,
        action: 'resent'
      }, 'Invitation resent successfully')

      return addSecurityHeaders(response)
    }

  } catch (error) {
    console.error('Error updating invitation:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * DELETE /api/invitations/[id] - Delete invitation (same as revoke)
 */
async function handleDeleteInvitation(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  const { searchParams } = new URL(request.url)
  const invitationId = searchParams.get('id')
  const userId = searchParams.get('userId')
  const reason = searchParams.get('reason') || 'Invitation deleted by administrator'

  if (!invitationId) {
    return createValidationErrorResponse(['Invitation ID is required'])
  }

  if (!userId) {
    return createValidationErrorResponse(['User ID is required'])
  }

  try {
    const result = await revokeInvitation(invitationId, userId, reason, deviceInfo)

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to delete invitation', 400)
    }

    const response = createSuccessResponse(
      { invitationId, action: 'deleted' },
      'Invitation deleted successfully'
    )
    
    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Error deleting invitation:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * Route handlers
 */
async function handleInvitations(request: NextRequest) {
  // Validate request method
  const allowedMethods = ['GET', 'POST', 'PATCH', 'DELETE']
  if (!validateRequestMethod(request, allowedMethods)) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    switch (request.method) {
      case 'POST':
        return await handleCreateInvitation(request)
      case 'GET':
        return await handleListInvitations(request)
      case 'PATCH':
        return await handleUpdateInvitation(request)
      case 'DELETE':
        return await handleDeleteInvitation(request)
      default:
        return createErrorResponse('Method not allowed', 405)
    }
  } catch (error) {
    console.error('Unexpected error in invitations API:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Export route handlers
export const GET = withErrorHandling(handleInvitations)
export const POST = withErrorHandling(handleInvitations)
export const PATCH = withErrorHandling(handleInvitations)
export const DELETE = withErrorHandling(handleInvitations)