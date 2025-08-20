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

// Rate limiter for invitation operations
const inviteRateLimiter = new RateLimiter(20, 10, 60 * 1000) // 10 per minute per IP

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
 * GET /api/boardmates/invite - Validate invitation token and get invitation details
 */
async function handleValidateInvitation(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!inviteRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(60) // 1 minute
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return createValidationErrorResponse(['Invitation token is required'])
  }

  try {
    // Find invitation by token
    const { data: invitation, error } = await supabaseAdmin
      .from('board_member_invitations')
      .select(`
        id,
        invitation_token,
        expires_at,
        status,
        access_level,
        custom_message,
        created_at,
        board_members!inner (
          id,
          full_name,
          email,
          board_role,
          organization_name
        ),
        organizations!inner (
          id,
          name,
          slug
        )
      `)
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single()

    if (error || !invitation) {
      return createErrorResponse('Invalid or expired invitation token', 404)
    }

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {
      // Mark invitation as expired
      await supabaseAdmin
        .from('board_member_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return createErrorResponse('Invitation has expired', 410)
    }

    const response = createSuccessResponse(
      {
        invitation: {
          id: invitation.id,
          token: invitation.invitation_token,
          expiresAt: invitation.expires_at,
          customMessage: invitation.custom_message,
          accessLevel: invitation.access_level,
          createdAt: invitation.created_at
        },
        boardMate: {
          id: invitation.board_members.id,
          fullName: invitation.board_members.full_name,
          email: invitation.board_members.email,
          role: invitation.board_members.board_role,
          organizationName: invitation.board_members.organization_name
        },
        organization: {
          id: invitation.organizations.id,
          name: invitation.organizations.name,
          slug: invitation.organizations.slug
        }
      },
      'Invitation details retrieved successfully'
    )

    return addSecurityHeaders(response)
  } catch (error) {
    console.error('Error validating invitation:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * POST /api/boardmates/invite - Accept invitation and create user account
 */
async function handleAcceptInvitation(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!inviteRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(60) // 1 minute
  }

  let body: any
  try {
    body = await request.json()
  } catch (error) {
    return createErrorResponse('Invalid JSON in request body', 400)
  }

  const { token, password, firstName, lastName } = body

  if (!token || typeof token !== 'string') {
    return createValidationErrorResponse(['Invitation token is required'])
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return createValidationErrorResponse(['Password must be at least 8 characters'])
  }

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
    return createValidationErrorResponse(['First name is required'])
  }

  if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
    return createValidationErrorResponse(['Last name is required'])
  }

  try {
    // Find and validate invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('board_member_invitations')
      .select(`
        id,
        expires_at,
        status,
        board_member_id,
        organization_id,
        board_members!inner (
          id,
          email,
          full_name
        )
      `)
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      return createErrorResponse('Invalid or expired invitation token', 404)
    }

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {
      await supabaseAdmin
        .from('board_member_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return createErrorResponse('Invitation has expired', 410)
    }

    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', invitation.board_members.email)
      .single()

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('Error checking existing user:', userCheckError)
      return createErrorResponse('Failed to validate user', 500)
    }

    if (existingUser) {
      return createErrorResponse('User already exists with this email address', 409)
    }

    // Create user account with Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.board_members.email,
      password: password,
      email_confirm: true, // Auto-confirm since they were invited
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        invited_via_board_mate: true,
        board_member_id: invitation.board_member_id,
        organization_id: invitation.organization_id
      }
    })

    if (authError) {
      console.error('Error creating user account:', authError)
      return createErrorResponse('Failed to create user account', 500)
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email: authUser.user.email,
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        avatar_url: null,
        role: 'board_member',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Cleanup auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return createErrorResponse('Failed to create user profile', 500)
    }

    // Link user to board member record
    const { error: linkError } = await supabaseAdmin
      .from('board_members')
      .update({
        user_id: authUser.user.id,
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .eq('id', invitation.board_member_id)

    if (linkError) {
      console.error('Error linking user to board member:', linkError)
      // Don't fail here - user is created, just not linked properly
    }

    // Add user to organization
    const { error: orgMemberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: authUser.user.id,
        role: 'member', // Default role, can be updated later
        invited_by: invitation.board_member_id,
        approved_by: invitation.board_member_id,
        status: 'active',
        is_primary: false,
        receive_notifications: true,
        joined_at: new Date().toISOString()
      })

    if (orgMemberError) {
      console.error('Error adding user to organization:', orgMemberError)
      // Don't fail here - user is created, just not added to org properly
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('board_member_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: authUser.user.id
      })
      .eq('id', invitation.id)

    // Create audit log
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        organization_id: invitation.organization_id,
        user_id: authUser.user.id,
        event_type: 'user_action',
        action: 'accept_board_mate_invitation',
        resource_type: 'board_member',
        resource_id: invitation.board_member_id,
        details: {
          invitation_id: invitation.id,
          board_mate_email: authUser.user.email,
          full_name: `${firstName.trim()} ${lastName.trim()}`
        },
        outcome: 'success',
        severity: 'low',
        event_category: 'user_action',
        event_description: `BoardMate accepted invitation and created account`,
        created_at: new Date().toISOString()
      })

    const response = createSuccessResponse(
      {
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          fullName: `${firstName.trim()} ${lastName.trim()}`
        },
        boardMember: {
          id: invitation.board_member_id
        },
        organization: {
          id: invitation.organization_id
        }
      },
      'Account created successfully! You can now sign in.'
    )

    return addSecurityHeaders(response)
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * Route handlers
 */
async function handleBoardMateInvite(request: NextRequest) {
  const allowedMethods = ['GET', 'POST']
  if (!validateRequestMethod(request, allowedMethods)) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    switch (request.method) {
      case 'GET':
        return await handleValidateInvitation(request)
      case 'POST':
        return await handleAcceptInvitation(request)
      default:
        return createErrorResponse('Method not allowed', 405)
    }
  } catch (error) {
    console.error('Unexpected error in BoardMate invite API:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Export route handlers
export const GET = withErrorHandling(handleBoardMateInvite)
export const POST = withErrorHandling(handleBoardMateInvite)