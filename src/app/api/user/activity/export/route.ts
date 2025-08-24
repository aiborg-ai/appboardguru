/**
 * User Activity Export API Endpoint
 * Allows users to export their activity data in CSV format for compliance/backup
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { 
  createErrorResponse,
  createValidationErrorResponse,
  withErrorHandling,
  addSecurityHeaders,
  validateRequestMethod
} from '@/lib/api-response'

// Export query parameters validation schema
const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  eventType: z.enum(['authentication', 'authorization', 'data_access', 'data_modification', 'user_action']).optional(),
  includeMetadata: z.enum(['true', 'false']).default('false').transform(val => val === 'true')
})

/**
 * Convert activity logs to CSV format
 */
function convertToCSV(activityLogs: any[]): string {
  if (!activityLogs.length) {
    return 'timestamp,type,action,description,outcome,severity,ip_address,user_agent\n'
  }

  const headers = [
    'timestamp',
    'type', 
    'category',
    'action',
    'description',
    'outcome',
    'severity',
    'resource_type',
    'ip_address',
    'user_agent',
    'endpoint',
    'response_status'
  ]

  const csvRows = [
    headers.join(','),
    ...activityLogs.map(log => [
      log.created_at,
      log.event_type,
      log.event_category,
      log.action,
      `"${log.event_description.replace(/"/g, '""')}"`, // Escape quotes
      log.outcome,
      log.severity,
      log.resource_type || '',
      log.ip_address || '',
      `"${(log.user_agent || '').replace(/"/g, '""')}"`,
      log.endpoint || '',
      log.response_status || ''
    ].join(','))
  ]

  return csvRows.join('\n')
}

/**
 * GET /api/user/activity/export
 * Export user's activity data in specified format
 */
async function handleExportUserActivity(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['GET'])) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    const supabase = await createSupabaseServerClient()
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
      format,
      fromDate,
      toDate,
      eventType,
      includeMetadata
    } = exportQuerySchema.parse(queryParams)

    // Build query for user's audit logs (no pagination for export)
    let query = supabase
      .from('audit_logs')
      .select(`
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
        ${includeMetadata ? 'metadata,' : ''}
        session_id
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10000) // Safety limit for exports

    // Apply filters
    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }

    if (toDate) {
      query = query.lte('created_at', toDate)
    }

    const { data: activityLogs, error: queryError } = await query

    if (queryError) {
      console.error('Error querying user activity logs for export:', queryError)
      return createErrorResponse('Failed to retrieve activity logs for export', 500)
    }

    if (!activityLogs || activityLogs.length === 0) {
      return createErrorResponse('No activity data found for the specified criteria', 404)
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `boardguru-activity-export-${timestamp}`

    if (format === 'csv') {
      const csvContent = convertToCSV(activityLogs)
      
      console.log(`📄 Exported ${activityLogs.length} activity records as CSV for user ${userId}`)
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
          'Cache-Control': 'no-cache',
          'X-Content-Length': csvContent.length.toString()
        }
      })
    } else if (format === 'json') {
      const jsonContent = JSON.stringify({
        exportDate: new Date().toISOString(),
        userId: userId,
        totalRecords: activityLogs.length,
        filters: { eventType, fromDate, toDate },
        activities: activityLogs
      }, null, 2)

      console.log(`📄 Exported ${activityLogs.length} activity records as JSON for user ${userId}`)

      return new NextResponse(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
          'Cache-Control': 'no-cache',
          'X-Content-Length': jsonContent.length.toString()
        }
      })
    }

    return createErrorResponse('Unsupported export format', 400)

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`)
      return createValidationErrorResponse(errors)
    }

    console.error('User activity export API error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to export activity data',
      500
    )
  }
}

/**
 * Export the GET handler wrapped with error handling and security headers
 */
export async function GET(request: NextRequest) {
  const response = await withErrorHandling(handleExportUserActivity)(request)
  return addSecurityHeaders(response)
}