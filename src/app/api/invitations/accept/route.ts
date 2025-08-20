import { NextRequest } from 'next/server'
import nodemailer from 'nodemailer'
import { env, getSmtpConfig } from '@/config/environment'
import { 
  acceptInvitation,
  validateInvitationToken,
  type DeviceInfo 
} from '@/lib/services/invitations'
import { 
  invitationAcceptedTemplate,
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

// Rate limiter for acceptance attempts (more strict than other endpoints)
const acceptInvitationRateLimiter = new RateLimiter(10, 5, 15 * 60 * 1000) // 5 attempts per 15 minutes per IP

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
 * Validate acceptance data
 */
function validateAcceptanceData(data: any): { isValid: boolean; errors: string[]; sanitizedData?: { token: string; userId: string; verificationCode?: string } } {
  const errors: string[] = []

  if (!data.token || typeof data.token !== 'string') {
    errors.push('Invitation token is required')
  } else if (data.token.length !== 64) { // hex string of 32 bytes
    errors.push('Invalid invitation token format')
  }

  if (!data.userId || typeof data.userId !== 'string') {
    errors.push('User ID is required')
  }

  if (data.verificationCode && typeof data.verificationCode !== 'string') {
    errors.push('Verification code must be a string')
  } else if (data.verificationCode && !/^\d{6}$/.test(data.verificationCode)) {
    errors.push('Verification code must be 6 digits')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: {
      token: data.token.toLowerCase().trim(),
      userId: data.userId.trim(),
      verificationCode: data.verificationCode?.trim()
    }
  }
}

/**
 * Send invitation accepted notification to inviter
 */
async function sendAcceptedNotification(
  invitation: any,
  membership: any
): Promise<void> {
  try {
    // Get inviter details
    const { data: inviter } = await supabaseAdmin
      .from('users')
      .select('email, full_name')
      .eq('id', invitation.invited_by)
      .single()

    if (!inviter?.email) {
      console.warn('Cannot send accepted notification - inviter email not found')
      return
    }

    // Get organization details
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('name, slug, logo_url')
      .eq('id', invitation.organization_id)
      .single()

    if (!organization) {
      console.warn('Cannot send accepted notification - organization not found')
      return
    }

    // Get member details
    const { data: member } = await supabaseAdmin
      .from('users')
      .select('email, full_name')
      .eq('id', membership.user_id)
      .single()

    if (!member) {
      console.warn('Cannot send accepted notification - member not found')
      return
    }

    // Generate dashboard URL
    const dashboardUrl = `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/organizations/${organization.slug}`

    // Generate email template
    const emailData = {
      organizationName: organization.name,
      organizationSlug: organization.slug,
      organizationLogo: organization.logo_url,
      memberName: member.full_name || member.email,
      memberEmail: member.email,
      role: invitation.role,
      acceptedAt: membership.joined_at || new Date().toISOString(),
      dashboardUrl
    }

    const { subject, html } = invitationAcceptedTemplate(emailData)
    const textFallback = generateTextFallback({
      subject,
      organizationName: emailData.organizationName
    })

    // Send email to inviter
    const transporter = nodemailer.createTransport(getSmtpConfig())
    
    await transporter.sendMail({
      from: `"BoardGuru - ${emailData.organizationName}" <${env.SMTP_USER}>`,
      to: inviter.email,
      subject,
      html,
      text: textFallback,
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'BoardGuru Platform',
        'X-Auto-Response-Suppress': 'All',
      }
    })

    console.log(`📧 Invitation accepted notification sent to ${inviter.email}`)
  } catch (error) {
    console.error('Failed to send invitation accepted notification:', error)
    // Don't throw - this is a nice-to-have feature
  }
}

/**
 * POST /api/invitations/accept - Accept an invitation
 */
async function handleAcceptInvitation(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting (strict for security)
  if (!acceptInvitationRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(15 * 60) // 15 minutes
  }

  // Parse request body
  let body: any
  try {
    body = await request.json()
  } catch (error) {
    return createErrorResponse('Invalid JSON in request body', 400)
  }

  // Validate acceptance data
  const validation = validateAcceptanceData(body)
  if (!validation.isValid) {
    return createValidationErrorResponse(validation.errors)
  }

  const { sanitizedData } = validation
  if (!sanitizedData) {
    return createErrorResponse('Data validation failed', 500)
  }

  try {
    // First validate the invitation token to get details
    const tokenValidation = await validateInvitationToken(sanitizedData.token)
    if (!tokenValidation.success || !tokenValidation.invitation) {
      return createErrorResponse(
        tokenValidation.error || 'Invalid or expired invitation', 
        400
      )
    }

    const invitation = tokenValidation.invitation

    // Verify email verification code if provided and required
    if (sanitizedData.verificationCode) {
      if (invitation.email_verification_code !== sanitizedData.verificationCode) {
        // Increment attempt count for wrong verification code
        await supabaseAdmin
          .from('organization_invitations')
          .update({ 
            attempt_count: invitation.attempt_count + 1 
          })
          .eq('id', invitation.id)

        return createErrorResponse('Invalid verification code', 400)
      }
    }

    // Accept the invitation
    const result = await acceptInvitation(
      sanitizedData.token,
      sanitizedData.userId,
      deviceInfo
    )

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to accept invitation', 400)
    }

    if (!result.membership) {
      return createErrorResponse('Failed to create membership', 500)
    }

    const membership = result.membership

    // Send notification to inviter (async, don't wait)
    sendAcceptedNotification(invitation, membership).catch(error => {
      console.error('Failed to send accepted notification:', error)
    })

    // Get organization details for response
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug, logo_url')
      .eq('id', invitation.organization_id)
      .single()

    // Return success response with membership details
    const response = createSuccessResponse({
      membership: {
        id: membership.id,
        organizationId: membership.organization_id,
        userId: membership.user_id,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joined_at,
        isPrimary: membership.is_primary
      },
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logoUrl: organization.logo_url
      } : null,
      redirectUrl: organization ? 
        `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/organizations/${organization.slug}` :
        `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`
    }, 'Invitation accepted successfully! Welcome to the organization.')

    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Error accepting invitation:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * Route handler for POST requests
 */
async function handleAcceptInvitationRequest(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['POST'])) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    return await handleAcceptInvitation(request)
  } catch (error) {
    console.error('Unexpected error in accept invitation API:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Export route handler
export const POST = withErrorHandling(handleAcceptInvitationRequest)