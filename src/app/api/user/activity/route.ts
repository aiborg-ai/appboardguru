/**
 * User Activity API Endpoint
 * Allows users to retrieve their own activity logs from the audit system
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { 
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  withErrorHandling,
  addSecurityHeaders,
  validateRequestMethod,
  getClientIP
} from '@/lib/api-response'

// Query parameters validation schema
const activityQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  eventType: z.enum(['authentication', 'authorization', 'data_access', 'data_modification', 'user_action']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  outcome: z.enum(['success', 'failure', 'error', 'blocked']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  search: z.string().min(1).max(100).optional()
})

/**
 * Transform audit log entry to user-friendly format
 */
function transformAuditLogForUser(log: any) {
  return {
    id: log.id,
    timestamp: log.created_at,
    type: log.event_type,
    category: log.event_category,
    action: log.action,
    description: log.event_description,
    outcome: log.outcome,
    severity: log.severity,
    details: {
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      endpoint: log.endpoint,
      httpMethod: log.http_method,
      responseStatus: log.response_status,
      responseTime: log.response_time_ms
    },
    metadata: log.metadata,
    sessionId: log.session_id
  }
}

/**
 * GET /api/user/activity
 * Retrieve user's own activity logs with filtering and pagination
 */
async function handleGetUserActivity(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['GET'])) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return createErrorResponse('Authentication required', 401)
    }

    const userId = session.user.id

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const {
      limit,
      offset,
      eventType,
      severity,
      outcome,
      fromDate,
      toDate,
      search
    } = activityQuerySchema.parse(queryParams)

    // Build query for user's audit logs
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        created_at,
        event_type,
        event_category,
        action,
        resource_type,
        resource_id,
        event_description,
        outcome,
        severity,
        ip_address,
        user_agent,
        endpoint,
        http_method,
        response_status,
        response_time_ms,
        metadata,
        session_id
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (outcome) {
      query = query.eq('outcome', outcome)
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }

    if (toDate) {
      query = query.lte('created_at', toDate)
    }

    if (search) {
      query = query.or(`event_description.ilike.%${search}%,action.ilike.%${search}%,resource_type.ilike.%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: activityLogs, error: queryError } = await query

    if (queryError) {
      console.error('Error querying user activity logs:', queryError)
      return createErrorResponse('Failed to retrieve activity logs', 500)
    }

    // Transform logs for user-friendly display
    const transformedLogs = activityLogs?.map(transformAuditLogForUser) || []

    // Get total count for pagination
    const { count, error: countError } = await (supabase as any)
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError) {
      console.error('Error counting user activity logs:', countError)
    }

    console.log(`📊 Retrieved ${transformedLogs.length} activity logs for user ${userId}`)

    return createSuccessResponse({
      activities: transformedLogs,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      },
      filters: {
        eventType,
        severity,
        outcome,
        fromDate,
        toDate,
        search
      }
    }, 'Activity logs retrieved successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`)
      return createValidationErrorResponse(errors)
    }

    console.error('User activity API error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to retrieve activity logs',
      500
    )
  }
}

/**
 * Export the GET handler wrapped with error handling and security headers
 */
export async function GET(request: NextRequest) {
  const response = await withErrorHandling(handleGetUserActivity)(request)
  return addSecurityHeaders(response)
}