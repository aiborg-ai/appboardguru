/**
 * Presence API Controller
 * RESTful API for user presence and document collaboration
 * Following CLAUDE.md API patterns with Result handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRepositoryFactory } from '../../../lib/repositories'
import { PresenceService } from '../../../lib/services/presence.service'
import { ApiResponse } from '../../../lib/api/response'
import { validateRequest } from '../../../lib/middleware/validation'
import { createUserId, createOrganizationId, createAssetId, createSocketId, createSessionId } from '../../../types/branded'
import { rateLimit } from '../../../lib/rate-limiter'
import { requireAuth } from '../../../lib/api/middleware/auth'

// Validation schemas following CLAUDE.md patterns
const updatePresenceSchema = z.object({
  assetId: z.string().min(1),
  socketId: z.string().min(1),
  sessionId: z.string().min(1),
  status: z.enum(['online', 'away', 'busy', 'offline']).optional()
})

const updateCursorSchema = z.object({
  assetId: z.string().min(1),
  position: z.object({
    line: z.number().min(0),
    column: z.number().min(0)
  }),
  selection: z.object({
    start: z.object({
      line: z.number().min(0),
      column: z.number().min(0)
    }),
    end: z.object({
      line: z.number().min(0),
      column: z.number().min(0)
    })
  }).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
})

/**
 * POST /api/presence - Update user presence
 * Rate limited and authenticated endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting and authentication middleware
    const rateLimitResult = await rateLimit(request, { 
      requestsPerMinute: 120, // Higher limit for presence updates
      identifier: 'presence-update'
    })
    if (!rateLimitResult.success) {
      return ApiResponse.tooManyRequests('Rate limit exceeded for presence updates')
    }

    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { user, organizationId } = authResult.data

    // Validate request body
    const validation = await validateRequest(request, updatePresenceSchema)
    if (!validation.success) {
      return ApiResponse.badRequest('Invalid request data', validation.errors)
    }

    const { assetId, socketId, sessionId, status = 'online' } = validation.data

    // Create service instance
    const repositoryFactory = await createServerRepositoryFactory()
    const presenceService = new PresenceService(repositoryFactory['monitoredClient'])

    // Update user presence
    const result = await presenceService.updateUserPresence(
      createUserId(user.id),
      createOrganizationId(organizationId),
      createAssetId(assetId),
      createSocketId(socketId),
      createSessionId(sessionId),
      status
    )

    if (!result.success) {
      return ApiResponse.internalError('Failed to update presence', result.error.message)
    }

    return ApiResponse.success(result.data, 'Presence updated successfully')

  } catch (error) {
    console.error('Presence API error:', error)
    return ApiResponse.internalError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * GET /api/presence - Get document collaborators
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting and authentication
    const rateLimitResult = await rateLimit(request, { 
      requestsPerMinute: 60,
      identifier: 'presence-fetch'
    })
    if (!rateLimitResult.success) {
      return ApiResponse.tooManyRequests('Rate limit exceeded')
    }

    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')
    const action = searchParams.get('action')

    if (!assetId) {
      return ApiResponse.badRequest('assetId parameter is required')
    }

    // Create service instance
    const repositoryFactory = await createServerRepositoryFactory()
    const presenceService = new PresenceService(repositoryFactory['monitoredClient'])

    switch (action) {
      case 'analytics':
        // Get collaboration analytics
        const analyticsResult = await presenceService.getDocumentCollaborationInsights(
          createAssetId(assetId)
        )

        if (!analyticsResult.success) {
          return ApiResponse.internalError('Failed to get analytics', analyticsResult.error.message)
        }

        return ApiResponse.success(analyticsResult.data, 'Analytics retrieved successfully')

      case 'cursors':
        // Get document cursors
        const cursorsResult = await presenceService.getDocumentCursors(
          createAssetId(assetId)
        )

        if (!cursorsResult.success) {
          return ApiResponse.internalError('Failed to get cursors', cursorsResult.error.message)
        }

        return ApiResponse.success(cursorsResult.data, 'Cursors retrieved successfully')

      default:
        // Get document collaborators (default action)
        const collaboratorsResult = await presenceService.getDocumentCollaborators(
          createAssetId(assetId)
        )

        if (!collaboratorsResult.success) {
          return ApiResponse.internalError('Failed to get collaborators', collaboratorsResult.error.message)
        }

        return ApiResponse.success(collaboratorsResult.data, 'Collaborators retrieved successfully')
    }

  } catch (error) {
    console.error('Presence GET API error:', error)
    return ApiResponse.internalError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * PUT /api/presence - Update cursor position
 */
export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting (higher limit for cursor updates)
    const rateLimitResult = await rateLimit(request, { 
      requestsPerMinute: 300, // High frequency for smooth cursor tracking
      identifier: 'cursor-update'
    })
    if (!rateLimitResult.success) {
      return ApiResponse.tooManyRequests('Rate limit exceeded for cursor updates')
    }

    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { user } = authResult.data

    // Validate request body
    const validation = await validateRequest(request, updateCursorSchema)
    if (!validation.success) {
      return ApiResponse.badRequest('Invalid cursor data', validation.errors)
    }

    const { assetId, position, selection, color } = validation.data

    // Create service instance
    const repositoryFactory = await createServerRepositoryFactory()
    const presenceService = new PresenceService(repositoryFactory['monitoredClient'])

    // Update cursor position
    const result = await presenceService.updateDocumentCursor(
      createUserId(user.id),
      createAssetId(assetId),
      {
        position,
        selection,
        color
      }
    )

    if (!result.success) {
      return ApiResponse.internalError('Failed to update cursor', result.error.message)
    }

    return ApiResponse.success(result.data, 'Cursor updated successfully')

  } catch (error) {
    console.error('Cursor update API error:', error)
    return ApiResponse.internalError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * DELETE /api/presence - Remove user from document
 */
export async function DELETE(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, { 
      requestsPerMinute: 60,
      identifier: 'presence-removal'
    })
    if (!rateLimitResult.success) {
      return ApiResponse.tooManyRequests('Rate limit exceeded')
    }

    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { user } = authResult.data
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')

    if (!assetId) {
      return ApiResponse.badRequest('assetId parameter is required')
    }

    // Create service instance
    const repositoryFactory = await createServerRepositoryFactory()
    const presenceService = new PresenceService(repositoryFactory['monitoredClient'])

    // Remove user from document collaboration
    const result = await presenceService.removeUserFromDocument(
      createUserId(user.id),
      createAssetId(assetId)
    )

    if (!result.success) {
      return ApiResponse.internalError('Failed to remove user presence', result.error.message)
    }

    return ApiResponse.success(null, 'User removed from document collaboration')

  } catch (error) {
    console.error('Presence removal API error:', error)
    return ApiResponse.internalError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}