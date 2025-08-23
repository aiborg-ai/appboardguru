import { NextRequest } from 'next/server'
import { BoardmatesController } from '@/lib/api/controllers/boardmates.controller'
import { RateLimiter } from '@/lib/security'
import {
  createRateLimitErrorResponse,
  withErrorHandling,
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

  // Delegate to controller
  const controller = new BoardmatesController()
  return await controller.validateInvitation(request)
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

  // Delegate to controller
  const controller = new BoardmatesController()
  return await controller.acceptInvitation(request)
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