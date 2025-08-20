import { NextRequest } from 'next/server'
import { 
  validateInvitationToken,
  type DeviceInfo 
} from '@/lib/services/invitations'
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

// Rate limiter for validation requests
const validateInvitationRateLimiter = new RateLimiter(50, 25, 60 * 1000) // 25 validations per minute per IP

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
 * Calculate time remaining until expiration
 */
function getTimeRemaining(expiresAt: string): {
  totalMinutes: number
  days: number
  hours: number
  minutes: number
  isExpired: boolean
  isExpiringSoon: boolean // < 24 hours
} {
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diffMs = expiry.getTime() - now.getTime()
  
  const isExpired = diffMs <= 0
  const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)))
  
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  
  const isExpiringSoon = totalMinutes < (24 * 60) // Less than 24 hours
  
  return {
    totalMinutes,
    days,
    hours,
    minutes,
    isExpired,
    isExpiringSoon
  }
}

/**
 * Get role display information
 */
function getRoleDisplayInfo(role: string): {
  displayName: string
  description: string
  permissions: string[]
} {
  switch (role) {
    case 'owner':
      return {
        displayName: 'Owner',
        description: 'Full control over the organization',
        permissions: [
          'Manage all organization settings',
          'Invite and remove members',
          'Access all board packs',
          'Delete organization',
          'Transfer ownership'
        ]
      }
    case 'admin':
      return {
        displayName: 'Administrator',
        description: 'Manage organization and members',
        permissions: [
          'Manage organization settings',
          'Invite and remove members',
          'Access all board packs',
          'Manage permissions'
        ]
      }
    case 'member':
      return {
        displayName: 'Member',
        description: 'Create and access board packs',
        permissions: [
          'Create and upload board packs',
          'Access shared board packs',
          'Collaborate with team members',
          'Use AI summarization tools'
        ]
      }
    case 'viewer':
      return {
        displayName: 'Viewer',
        description: 'View-only access to shared content',
        permissions: [
          'View shared board packs',
          'Download permitted content',
          'Limited collaboration features'
        ]
      }
    default:
      return {
        displayName: role,
        description: 'Custom role with specific permissions',
        permissions: ['Permissions as defined by organization administrators']
      }
  }
}

/**
 * GET /api/invitations/validate - Validate an invitation token
 */
async function handleValidateInvitation(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!validateInvitationRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(60) // 1 minute
  }

  // Get token from query parameters
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return createValidationErrorResponse(['Invitation token is required'])
  }

  if (typeof token !== 'string' || token.length !== 64) {
    return createValidationErrorResponse(['Invalid invitation token format'])
  }

  try {
    // Validate the invitation token
    const result = await validateInvitationToken(token)

    if (!result.success || !result.invitation) {
      return createErrorResponse(
        result.error || 'Invalid or expired invitation', 
        400
      )
    }

    const invitation = result.invitation
    const timeRemaining = getTimeRemaining(invitation.token_expires_at)
    const roleInfo = getRoleDisplayInfo(invitation.role)

    // Calculate security risk level based on various factors
    let riskLevel = 'low'
    let riskFactors: string[] = []

    if (invitation.attempt_count > 0) {
      riskFactors.push(`${invitation.attempt_count} previous failed attempts`)
    }

    if (timeRemaining.isExpiringSoon && !timeRemaining.isExpired) {
      riskFactors.push('Invitation expires soon')
    }

    if (invitation.attempt_count >= 2) {
      riskLevel = 'medium'
    }

    if (invitation.attempt_count >= invitation.max_attempts - 1) {
      riskLevel = 'high'
      riskFactors.push('Maximum attempts will be reached soon')
    }

    // Return comprehensive invitation details
    const response = createSuccessResponse({
      invitation: {
        id: invitation.id,
        organizationId: invitation.organization_id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        createdAt: invitation.created_at,
        expiresAt: invitation.token_expires_at,
        attemptCount: invitation.attempt_count,
        maxAttempts: invitation.max_attempts,
        personalMessage: invitation.personal_message,
        // Don't return sensitive tokens in validation response
      },
      organization: invitation.organization ? {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
        logoUrl: invitation.organization.logo_url
      } : null,
      inviter: invitation.inviter ? {
        email: invitation.inviter.email,
        fullName: invitation.inviter.full_name
      } : null,
      roleInfo,
      timeRemaining: {
        ...timeRemaining,
        displayText: timeRemaining.isExpired 
          ? 'Expired'
          : timeRemaining.days > 0
            ? `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m`
            : timeRemaining.hours > 0
              ? `${timeRemaining.hours}h ${timeRemaining.minutes}m`
              : `${timeRemaining.minutes}m`,
        urgency: timeRemaining.isExpired 
          ? 'expired'
          : timeRemaining.isExpiringSoon
            ? 'urgent'
            : 'normal'
      },
      security: {
        riskLevel,
        riskFactors,
        requiresEmailVerification: false, // Could be enhanced in future
        allowedAttempts: invitation.max_attempts - invitation.attempt_count
      },
      actions: {
        canAccept: invitation.status === 'pending' && !timeRemaining.isExpired && invitation.attempt_count < invitation.max_attempts,
        canReject: invitation.status === 'pending' && !timeRemaining.isExpired,
        requiresLogin: true // Always require authentication to accept
      }
    }, 'Invitation validated successfully')

    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Error validating invitation:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * Route handler for GET requests
 */
async function handleValidateInvitationRequest(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['GET'])) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    return await handleValidateInvitation(request)
  } catch (error) {
    console.error('Unexpected error in validate invitation API:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Export route handler
export const GET = withErrorHandling(handleValidateInvitationRequest)