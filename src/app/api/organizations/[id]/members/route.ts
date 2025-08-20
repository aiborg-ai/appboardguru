import { NextRequest } from 'next/server'
import { 
  updateMemberRole,
  removeMember,
  transferOwnership
} from '@/lib/services/membership'
import { getOrganizationMembers } from '@/lib/services/organization'
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

// Rate limiters
const membersRateLimiter = new RateLimiter(50, 30, 60 * 1000) // 30 per minute per IP

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
 * GET /api/organizations/[id]/members - Get organization members
 */
async function handleGetMembers(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!membersRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(60) // 1 minute
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return createValidationErrorResponse(['User ID is required'])
  }

  const organizationId = (await params).id

  try {
    const result = await getOrganizationMembers(organizationId, userId)

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to get organization members', 400)
    }

    const response = createSuccessResponse(
      {
        members: result.members || [],
        total: result.members?.length || 0
      },
      'Organization members retrieved successfully'
    )

    return addSecurityHeaders(response)
  } catch (error) {
    console.error('Error getting organization members:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * PATCH /api/organizations/[id]/members - Update member role or remove member
 */
async function handleUpdateMember(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deviceInfo = getDeviceInfo(request)
  
  // Rate limiting
  if (!membersRateLimiter.isAllowed(deviceInfo.ip)) {
    return createRateLimitErrorResponse(60) // 1 minute
  }

  let body: any
  try {
    body = await request.json()
  } catch (error) {
    return createErrorResponse('Invalid JSON in request body', 400)
  }

  const organizationId = (await params).id

  if (!body.action || !['updateRole', 'removeMember', 'transferOwnership'].includes(body.action)) {
    return createValidationErrorResponse(['Action must be one of: updateRole, removeMember, transferOwnership'])
  }

  if (!body.userId || typeof body.userId !== 'string') {
    return createValidationErrorResponse(['User ID is required'])
  }

  if (!body.targetUserId || typeof body.targetUserId !== 'string') {
    return createValidationErrorResponse(['Target user ID is required'])
  }

  try {
    switch (body.action) {
      case 'updateRole':
        if (!body.newRole || !['owner', 'admin', 'member', 'viewer'].includes(body.newRole)) {
          return createValidationErrorResponse(['Valid role is required'])
        }

        const updateResult = await updateMemberRole(
          organizationId,
          body.targetUserId,
          { role: body.newRole },
          body.userId
        )

        if (!updateResult.success) {
          return createErrorResponse(updateResult.error || 'Failed to update member role', 400)
        }

        const response = createSuccessResponse(
          updateResult.member,
          'Member role updated successfully'
        )

        return addSecurityHeaders(response)

      case 'removeMember':
        const removeResult = await removeMember(
          organizationId,
          body.targetUserId,
          body.userId
        )

        if (!removeResult.success) {
          return createErrorResponse(removeResult.error || 'Failed to remove member', 400)
        }

        const removeResponse = createSuccessResponse(
          { targetUserId: body.targetUserId },
          'Member removed successfully'
        )

        return addSecurityHeaders(removeResponse)

      case 'transferOwnership':
        const transferResult = await transferOwnership(
          organizationId,
          body.targetUserId,
          body.userId
        )

        if (!transferResult.success) {
          return createErrorResponse(transferResult.error || 'Failed to transfer ownership', 400)
        }

        const transferResponse = createSuccessResponse(
          { 
            targetUserId: body.targetUserId,
            previousOwnerId: body.userId
          },
          'Ownership transferred successfully'
        )

        return addSecurityHeaders(transferResponse)

      default:
        return createErrorResponse('Invalid action', 400)
    }
  } catch (error) {
    console.error('Error updating member:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

/**
 * Route handlers
 */
async function handleMembers(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const allowedMethods = ['GET', 'PATCH']
  if (!validateRequestMethod(request, allowedMethods)) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    switch (request.method) {
      case 'GET':
        return await handleGetMembers(request, context)
      case 'PATCH':
        return await handleUpdateMember(request, context)
      default:
        return createErrorResponse('Method not allowed', 405)
    }
  } catch (error) {
    console.error('Unexpected error in members API:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Export route handlers
export const GET = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  withErrorHandling(() => handleMembers(request, context))()

export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  withErrorHandling(() => handleMembers(request, context))()