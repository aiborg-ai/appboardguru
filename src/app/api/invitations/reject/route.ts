import { NextRequest } from 'next/server'
import { 
  rejectInvitation,
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

// Rate limiter for rejection attempts
const rejectInvitationRateLimiter = new RateLimiter(20, 10, 15 * 60 * 1000) // 10 rejections per 15 minutes per IP

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
 * Validate rejection data
 */
function validateRejectionData(data: any): { 
  isValid: boolean; 
  errors: string[]; 
  sanitizedData?: { 
    token: string; 
    reason?: string; 
  } 
} {
  const errors: string[] = []

  if (!data.token || typeof data.token !== 'string') {
    errors.push('Invitation token is required')
  } else if (data.token.length !== 64) { // hex string of 32 bytes
    errors.push('Invalid invitation token format')
  }

  if (data.reason && typeof data.reason !== 'string') {
    errors.push('Rejection reason must be a string')
  } else if (data.reason && data.reason.length > 500) {
    errors.push('Rejection reason cannot exceed 500 characters')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: {
      token: data.token.toLowerCase().trim(),
      reason: data.reason?.trim()
    }
  }
}

/**
 * POST /api/invitations/reject - Reject an invitation
 */
async function handleRejectInvitation(request: NextRequest) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!rejectInvitationRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(15 * 60) // 15 minutes
  }

  // Parse request body
  let body: any
  try {
    body = await request.json()
  } catch (error) {
    return createErrorResponse('Invalid JSON in request body', 400)
  }

  // Validate rejection data
  const validation = validateRejectionData(body)
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

    // Reject the invitation
    const result = await rejectInvitation(
      sanitizedData.token,
      sanitizedData.reason || 'No reason provided',
      deviceInfo
    )

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to reject invitation', 400)
    }

    // Return success response
    const response = createSuccessResponse({
      invitationId: invitation.id,
      organizationName: invitation.organization?.name,
      action: 'rejected',
      message: 'Invitation rejected successfully'
    }, 'Invitation rejected successfully')

    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Error rejecting invitation:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * Route handler for POST requests
 */
async function handleRejectInvitationRequest(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['POST'])) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    return await handleRejectInvitation(request)
  } catch (error) {
    console.error('Unexpected error in reject invitation API:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Export route handler
export const POST = withErrorHandling(handleRejectInvitationRequest)