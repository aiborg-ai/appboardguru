/**
 * Cursor Tracking API Controller
 * GET /api/cursors/[assetId] - Get document cursors
 * POST /api/cursors/[assetId] - Update cursor position
 * DELETE /api/cursors/[assetId] - Remove cursor
 * Following CLAUDE.md API controller patterns
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerRepositoryFactory } from '../../../../../lib/repositories'
import { CursorTrackingService } from '../../../../../lib/services/cursor-tracking.service'
import { ApiResponse } from '../../../../../lib/api/response'
import { createAssetId, createUserId } from '../../../../../types/branded'
import { rateLimiter } from '../../../../../lib/rate-limiter'
import { validateAuth } from '../../../../../lib/api/middleware/auth'
import { z } from 'zod'

interface RouteParams {
  params: {
    assetId: string
  }
}

const UpdateCursorSchema = z.object({
  position: z.object({
    line: z.number().min(0),
    column: z.number().min(0),
    offset: z.number().min(0)
  }),
  selection: z.object({
    start: z.object({
      line: z.number().min(0),
      column: z.number().min(0),
      offset: z.number().min(0)
    }),
    end: z.object({
      line: z.number().min(0),
      column: z.number().min(0),
      offset: z.number().min(0)
    }),
    direction: z.enum(['forward', 'backward'])
  }).optional(),
  metadata: z.object({
    isTyping: z.boolean().optional(),
    isIdle: z.boolean().optional(),
    scrollPosition: z.object({
      top: z.number(),
      left: z.number()
    }).optional(),
    viewportBounds: z.object({
      top: z.number(),
      bottom: z.number()
    }).optional()
  }).optional()
})

/**
 * GET - Get all cursors for a document
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter(request, { 
      requestsPerMinute: 120,
      identifier: 'cursor-get'
    })
    if (!rateLimitResult.success) {
      return ApiResponse.tooManyRequests('Rate limit exceeded for cursor retrieval')
    }

    // Require authentication
    const authResult = await validateAuth(request)
    if (!authResult.success) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { user, organizationId } = authResult.data
    const assetId = createAssetId(params.assetId)

    // Verify user has access to this asset
    const repositoryFactory = await createServerRepositoryFactory()
    const assetRepository = repositoryFactory.createAssetRepository()
    
    const assetResult = await assetRepository.findById(assetId)
    if (!assetResult.success) {
      return ApiResponse.notFound('Asset not found')
    }

    if (assetResult.data.organizationId !== organizationId) {
      return ApiResponse.forbidden('Access denied to this asset')
    }

    // Get document cursors
    const cursorService = new CursorTrackingService(repositoryFactory)
    const cursorsResult = await cursorService.getDocumentCursors(
      assetId,
      createUserId(user.id) // Exclude own cursor by default
    )

    if (!cursorsResult.success) {
      return ApiResponse.internalError(
        'Failed to retrieve cursors',
        cursorsResult.error.message
      )
    }

    // Include cursor statistics
    const cursorBatchResult = await cursorService.getCursorBatch(assetId)
    const cursorBatch = cursorBatchResult.success ? cursorBatchResult.data : null

    const responseData = {
      cursors: cursorsResult.data,
      batch: cursorBatch,
      assetId: params.assetId,
      retrievedAt: new Date().toISOString(),
      statistics: {
        total: cursorsResult.data.length,
        active: cursorsResult.data.filter(c => c.isActive).length,
        typing: cursorsResult.data.filter(c => c.metadata?.isTyping).length,
        idle: cursorsResult.data.filter(c => c.metadata?.isIdle).length
      }
    }

    return ApiResponse.success(
      responseData,
      'Document cursors retrieved successfully'
    )

  } catch (error) {
    console.error('Cursor GET API error:', error)
    return ApiResponse.internalError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * POST - Update cursor position
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Apply rate limiting (higher limit for cursor updates)
    const rateLimitResult = await rateLimiter(request, { 
      requestsPerMinute: 300,
      identifier: 'cursor-update'
    })
    if (!rateLimitResult.success) {
      return ApiResponse.tooManyRequests('Rate limit exceeded for cursor updates')
    }

    // Require authentication
    const authResult = await validateAuth(request)
    if (!authResult.success) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { user, organizationId } = authResult.data
    const assetId = createAssetId(params.assetId)

    // Parse request body
    const body = await request.json()
    const validationResult = UpdateCursorSchema.safeParse(body)
    
    if (!validationResult.success) {
      return ApiResponse.badRequest(
        'Invalid cursor data',
        validationResult.error.errors
      )
    }

    const { position, selection, metadata } = validationResult.data

    // Verify user has access to this asset
    const repositoryFactory = await createServerRepositoryFactory()
    const assetRepository = repositoryFactory.createAssetRepository()
    
    const assetResult = await assetRepository.findById(assetId)
    if (!assetResult.success) {
      return ApiResponse.notFound('Asset not found')
    }

    if (assetResult.data.organizationId !== organizationId) {
      return ApiResponse.forbidden('Access denied to this asset')
    }

    // Update cursor position
    const cursorService = new CursorTrackingService(repositoryFactory)
    const updateResult = await cursorService.updateCursor(
      createUserId(user.id),
      assetId,
      position,
      selection,
      metadata
    )

    if (!updateResult.success) {
      return ApiResponse.internalError(
        'Failed to update cursor',
        updateResult.error.message
      )
    }

    return ApiResponse.success(
      {
        cursor: updateResult.data,
        assetId: params.assetId,
        updatedAt: new Date().toISOString()
      },
      'Cursor position updated successfully'
    )

  } catch (error) {
    console.error('Cursor POST API error:', error)
    return ApiResponse.internalError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * DELETE - Remove cursor (user leaving document)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter(request, { 
      requestsPerMinute: 60,
      identifier: 'cursor-remove'
    })
    if (!rateLimitResult.success) {
      return ApiResponse.tooManyRequests('Rate limit exceeded for cursor removal')
    }

    // Require authentication
    const authResult = await validateAuth(request)
    if (!authResult.success) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { user, organizationId } = authResult.data
    const assetId = createAssetId(params.assetId)

    // Verify user has access to this asset
    const repositoryFactory = await createServerRepositoryFactory()
    const assetRepository = repositoryFactory.createAssetRepository()
    
    const assetResult = await assetRepository.findById(assetId)
    if (!assetResult.success) {
      return ApiResponse.notFound('Asset not found')
    }

    if (assetResult.data.organizationId !== organizationId) {
      return ApiResponse.forbidden('Access denied to this asset')
    }

    // Remove cursor
    const cursorService = new CursorTrackingService(repositoryFactory)
    const removeResult = await cursorService.removeCursor(
      createUserId(user.id),
      assetId
    )

    if (!removeResult.success) {
      return ApiResponse.internalError(
        'Failed to remove cursor',
        removeResult.error.message
      )
    }

    return ApiResponse.success(
      {
        userId: user.id,
        assetId: params.assetId,
        removedAt: new Date().toISOString()
      },
      'Cursor removed successfully'
    )

  } catch (error) {
    console.error('Cursor DELETE API error:', error)
    return ApiResponse.internalError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * PUT - Batch cursor operations (for performance)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter(request, { 
      requestsPerMinute: 60,
      identifier: 'cursor-batch'
    })
    if (!rateLimitResult.success) {
      return ApiResponse.tooManyRequests('Rate limit exceeded for cursor batch operations')
    }

    // Require authentication
    const authResult = await validateAuth(request)
    if (!authResult.success) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { user, organizationId } = authResult.data
    const assetId = createAssetId(params.assetId)

    // Verify user has access to this asset
    const repositoryFactory = await createServerRepositoryFactory()
    const assetRepository = repositoryFactory.createAssetRepository()
    
    const assetResult = await assetRepository.findById(assetId)
    if (!assetResult.success) {
      return ApiResponse.notFound('Asset not found')
    }

    if (assetResult.data.organizationId !== organizationId) {
      return ApiResponse.forbidden('Access denied to this asset')
    }

    // Get cursor batch for efficient updates
    const cursorService = new CursorTrackingService(repositoryFactory)
    const batchResult = await cursorService.getCursorBatch(assetId)

    if (!batchResult.success) {
      return ApiResponse.internalError(
        'Failed to get cursor batch',
        batchResult.error.message
      )
    }

    return ApiResponse.success(
      {
        ...batchResult.data,
        assetId: params.assetId,
        retrievedAt: new Date().toISOString()
      },
      'Cursor batch retrieved successfully'
    )

  } catch (error) {
    console.error('Cursor PUT API error:', error)
    return ApiResponse.internalError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}