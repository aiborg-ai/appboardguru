/**
 * Organization Presence Analytics API
 * GET /api/presence/organization/[organizationId]/analytics
 * Following CLAUDE.md API controller patterns
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerRepositoryFactory } from '../../../../../../lib/repositories'
import { PresenceService } from '../../../../../../lib/services/presence.service'
import { ApiResponse } from '../../../../../../lib/api/response'
import { createOrganizationId } from '../../../../../../types/branded'
import { rateLimiter } from '../../../../../../lib/rate-limiter'
import { validateAuth } from '../../../../../../lib/api/middleware/auth'

interface RouteParams {
  params: {
    organizationId: string
  }
}

/**
 * GET - Organization presence analytics
 * Provides insights into collaboration activity across the organization
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, { 
      requestsPerMinute: 30,
      identifier: 'org-analytics'
    })
    if (!rateLimitResult.success) {
      return ApiResponse.tooManyRequests('Rate limit exceeded for organization analytics')
    }

    // Require authentication
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return ApiResponse.unauthorized('Authentication required')
    }

    const { user, organizationId: userOrgId } = authResult.data
    const requestedOrgId = params.organizationId

    // Verify user has access to this organization
    if (userOrgId !== requestedOrgId) {
      return ApiResponse.forbidden('Access denied to organization analytics')
    }

    // Create service instance
    const repositoryFactory = await createServerRepositoryFactory()
    const presenceService = new PresenceService(repositoryFactory['monitoredClient'])

    // Get organization presence analytics
    const analyticsResult = await presenceService.getOrganizationPresenceAnalytics(
      createOrganizationId(requestedOrgId)
    )

    if (!analyticsResult.success) {
      return ApiResponse.internalError(
        'Failed to retrieve organization analytics', 
        analyticsResult.error.message
      )
    }

    // Format response with additional insights
    const responseData = {
      analytics: analyticsResult.data,
      totalActiveUsers: analyticsResult.data.totalActiveUsers,
      mostActiveDocuments: analyticsResult.data.mostActiveDocuments,
      organizationId: requestedOrgId,
      generatedAt: new Date().toISOString(),
      cacheDuration: 30000 // 30 seconds cache hint
    }

    return ApiResponse.success(
      responseData,
      'Organization presence analytics retrieved successfully'
    )

  } catch (error) {
    console.error('Organization presence analytics API error:', error)
    return ApiResponse.internalError(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}