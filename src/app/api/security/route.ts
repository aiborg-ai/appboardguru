/**
 * Security Monitoring API Endpoints
 * Provides security status, reporting, and audit log access
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  requireAuth, 
  requireAdminAccess, 
  requireRole,
  validateApiKey 
} from '@/lib/security/auth-guard'
import { 
  logSecurityEvent, 
  generateSecurityReport,
  SecurityAuditLogger 
} from '@/lib/security/audit'
import { 
  validateApiInput, 
  ApiSchemas, 
  CommonSchemas 
} from '@/lib/security/validation'
import { 
  getRateLimitStats, 
  rateLimiters 
} from '@/lib/security/rate-limiter'
import { 
  generateSecurityReport as generateHeadersReport 
} from '@/lib/security/security-headers'
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  withErrorHandling,
  getClientIP
} from '@/lib/api-response'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { z } from 'zod'

/**
 * Security status schema
 */
const SecurityStatusSchema = z.object({
  includeDetails: z.boolean().default(false),
  organizationId: CommonSchemas.id.optional()
})

/**
 * Security report schema
 */
const SecurityReportSchema = z.object({
  organizationId: CommonSchemas.id.optional(),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  eventTypes: z.array(z.string()).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  format: z.enum(['json', 'csv']).default('json')
})

/**
 * Audit log query schema
 */
const AuditLogQuerySchema = z.object({
  organizationId: CommonSchemas.id.optional(),
  userId: CommonSchemas.id.optional(),
  eventType: z.enum([
    'authentication',
    'authorization', 
    'data_access',
    'data_modification',
    'system_admin',
    'security_event',
    'compliance',
    'user_action'
  ]).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(50),
  sortBy: z.enum(['created_at', 'severity', 'risk_score']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

/**
 * GET /api/security/status - Get security system status
 */
async function handleGetSecurityStatus(request: NextRequest) {
  const ip = getClientIP(request)
  
  // Check rate limit
  const rateLimit = await rateLimiters.api.checkRateLimit(ip, 'security_status')
  if (!rateLimit.allowed) {
    return createErrorResponse('Rate limit exceeded', 429)
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      includeDetails: searchParams.get('includeDetails') === 'true',
      organizationId: searchParams.get('organizationId') || undefined
    }

    const validation = await validateApiInput(SecurityStatusSchema, queryParams)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors!)
    }

    const { includeDetails, organizationId } = validation.data!

    // Check authorization - only admin users can access security status
    const authResult = await requireRole(request, 'admin')
    if (!authResult.success) {
      return createUnauthorizedResponse('Admin access required')
    }

    // Log access attempt
    await logSecurityEvent('security_status_accessed', {
      userId: authResult.user!.id,
      ip,
      includeDetails,
      organizationId
    }, 'low')

    // Gather security status information
    const status = {
      timestamp: new Date().toISOString(),
      system: {
        status: 'operational',
        version: '1.0.0',
        environment: process.env['NODE_ENV'] || 'development'
      },
      rateLimiting: {
        status: 'active',
        stats: getRateLimitStats()
      },
      headers: {
        status: 'active',
        report: generateHeadersReport()
      },
      monitoring: {
        status: 'active',
        alertsActive: true,
        loggingActive: true
      }
    }

    // Include detailed information if requested
    if (includeDetails) {
      // Get recent security events count
      const { count: recentEventsCount } = await supabaseAdmin
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'security_event')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

      // Get high-risk events in last hour
      const { count: highRiskEventsCount } = await supabaseAdmin
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('risk_score', 70)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour

      Object.assign(status, {
        details: {
          recentSecurityEvents: recentEventsCount || 0,
          highRiskEventsLastHour: highRiskEventsCount || 0,
          activeBlocks: status.rateLimiting.stats.blockedIPs,
          systemHealth: 'healthy'
        }
      })
    }

    const response = createSuccessResponse(status, 'Security status retrieved successfully')
    return response

  } catch (error) {
    console.error('Error getting security status:', error)
    return createErrorResponse('Failed to retrieve security status', 500)
  }
}

/**
 * POST /api/security/report - Report a security incident
 */
async function handleReportSecurityIncident(request: NextRequest) {
  const ip = getClientIP(request)
  
  // Check rate limit (stricter for reporting)
  const rateLimit = await rateLimiters.auth.checkRateLimit(ip, 'security_report')
  if (!rateLimit.allowed) {
    return createErrorResponse('Rate limit exceeded', 429)
  }

  try {
    // Parse request body
    const body = await request.json()
    
    const validation = await validateApiInput(ApiSchemas.securityReport, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors!)
    }

    const reportData = validation.data!

    // Basic authentication required
    const authResult = await requireAuth(request)
    if (!authResult.success) {
      return createUnauthorizedResponse('Authentication required')
    }

    // Log the security incident report
    const correlationId = await logSecurityEvent('security_incident_reported', {
      reportedBy: authResult.user!.id,
      eventType: reportData.eventType,
      description: reportData.description,
      severity: reportData.severity || 'medium',
      additionalInfo: reportData.additionalInfo,
      ip
    }, reportData.severity || 'medium')

    // Store additional report details if needed
    // In production, you might want to store this in a separate incidents table
    
    const response = createSuccessResponse({
      correlationId,
      status: 'received',
      message: 'Security incident reported successfully'
    }, 'Security incident reported and logged')

    return response

  } catch (error) {
    console.error('Error reporting security incident:', error)
    return createErrorResponse('Failed to report security incident', 500)
  }
}

/**
 * GET /api/security/audit - Get audit logs (admin only)
 */
async function handleGetAuditLogs(request: NextRequest) {
  const ip = getClientIP(request)
  
  // Check rate limit
  const rateLimit = await rateLimiters.admin.checkRateLimit(ip, 'audit_logs')
  if (!rateLimit.allowed) {
    return createErrorResponse('Rate limit exceeded', 429)
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validation = await validateApiInput(AuditLogQuerySchema, queryParams)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors!)
    }

    const query = validation.data!

    // Check admin authorization
    const authResult = await requireAdminAccess(request, query.organizationId)
    if (!authResult.success) {
      return createUnauthorizedResponse('Admin access required')
    }

    // Log audit log access
    await logSecurityEvent('audit_logs_accessed', {
      userId: authResult.user!.id,
      ip,
      queryParams: query,
      isSystemAdmin: authResult.isSystemAdmin
    }, 'medium', 'system_action')

    // Build database query
    let dbQuery = supabaseAdmin
      .from('audit_logs')
      .select(`
        id,
        organization_id,
        user_id,
        event_type,
        event_category,
        action,
        resource_type,
        resource_id,
        event_description,
        severity,
        outcome,
        risk_score,
        ip_address,
        created_at,
        correlation_id
      `, { count: 'exact' })

    // Apply filters
    if (query.organizationId) {
      dbQuery = dbQuery.eq('organization_id', query.organizationId)
    }

    if (query.userId) {
      dbQuery = dbQuery.eq('user_id', query.userId)
    }

    if (query.eventType) {
      dbQuery = dbQuery.eq('event_type', query.eventType)
    }

    if (query.severity) {
      dbQuery = dbQuery.eq('severity', query.severity)
    }

    if (query.startDate) {
      dbQuery = dbQuery.gte('created_at', query.startDate)
    }

    if (query.endDate) {
      dbQuery = dbQuery.lte('created_at', query.endDate)
    }

    // Apply sorting and pagination
    dbQuery = dbQuery
      .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
      .range((query.page - 1) * query.limit, query.page * query.limit - 1)

    const { data: logs, error, count } = await dbQuery

    if (error) {
      throw error
    }

    const response = createSuccessResponse({
      logs: logs || [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / query.limit)
      }
    }, 'Audit logs retrieved successfully')

    return response

  } catch (error) {
    console.error('Error getting audit logs:', error)
    return createErrorResponse('Failed to retrieve audit logs', 500)
  }
}

/**
 * GET /api/security/reports - Generate security reports (admin only)
 */
async function handleGenerateSecurityReport(request: NextRequest) {
  const ip = getClientIP(request)
  
  // Check rate limit (lower limit for resource-intensive reports)
  const rateLimit = await rateLimiters.admin.checkRateLimit(ip, 'security_reports')
  if (!rateLimit.allowed) {
    return createErrorResponse('Rate limit exceeded', 429)
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Handle time range parsing
    if (queryParams.timeRange) {
      try {
        queryParams.timeRange = JSON.parse(queryParams.timeRange)
      } catch {
        return createValidationErrorResponse(['Invalid timeRange format'])
      }
    }
    
    const validation = await validateApiInput(SecurityReportSchema, queryParams)
    if (!validation.success) {
      return createValidationErrorResponse(validation.errors!)
    }

    const reportQuery = validation.data!

    // Check admin authorization
    const authResult = await requireAdminAccess(request, reportQuery.organizationId)
    if (!authResult.success) {
      return createUnauthorizedResponse('Admin access required')
    }

    // Log report generation
    await logSecurityEvent('security_report_generated', {
      userId: authResult.user!.id,
      ip,
      organizationId: reportQuery.organizationId,
      timeRange: reportQuery.timeRange,
      format: reportQuery.format
    }, 'low', 'admin_action')

    // Generate the report
    const timeRange = reportQuery.timeRange ? {
      start: new Date(reportQuery.timeRange.start),
      end: new Date(reportQuery.timeRange.end)
    } : undefined

    const report = await generateSecurityReport(reportQuery.organizationId, timeRange)

    // Format response based on requested format
    if (reportQuery.format === 'csv') {
      // Convert to CSV format
      const csvData = [
        'Event Type,Count',
        ...Object.entries(report.eventsByType).map(([type, count]) => `${type},${count}`),
        '',
        'Severity,Count',
        ...Object.entries(report.eventsBySeverity).map(([severity, count]) => `${severity},${count}`),
        '',
        'Top Risks',
        'Description,Count,Risk Score',
        ...report.topRisks.map(risk => `"${risk.description}",${risk.count},${risk.riskScore}`)
      ].join('\n')

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="security-report-${Date.now()}.csv"`
        }
      })
    }

    const response = createSuccessResponse({
      report: {
        ...report,
        generatedAt: new Date().toISOString(),
        generatedBy: authResult.user!.id,
        organizationId: reportQuery.organizationId,
        timeRange
      }
    }, 'Security report generated successfully')

    return response

  } catch (error) {
    console.error('Error generating security report:', error)
    return createErrorResponse('Failed to generate security report', 500)
  }
}

/**
 * POST /api/security/webhook - Security webhook endpoint for external systems
 */
async function handleSecurityWebhook(request: NextRequest) {
  const ip = getClientIP(request)

  try {
    // Validate API key for webhook access
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return createUnauthorizedResponse('API key required')
    }

    const apiKey = authHeader.substring(7)
    const apiValidation = await validateApiKey(apiKey)
    
    if (!apiValidation.success || !apiValidation.permissions?.includes('write')) {
      return createUnauthorizedResponse('Invalid API key or insufficient permissions')
    }

    // Parse webhook payload
    const body = await request.json()
    
    // Validate basic webhook structure
    if (!body.eventType || !body.description) {
      return createValidationErrorResponse(['eventType and description are required'])
    }

    // Log the webhook event
    await logSecurityEvent('external_security_webhook', {
      source: apiValidation.service,
      eventType: body.eventType,
      description: body.description,
      severity: body.severity || 'medium',
      details: body.details || {},
      ip
    }, body.severity || 'medium')

    const response = createSuccessResponse({
      status: 'processed',
      correlationId: `webhook_${Date.now()}`
    }, 'Webhook processed successfully')

    return response

  } catch (error) {
    console.error('Error processing security webhook:', error)
    return createErrorResponse('Failed to process webhook', 500)
  }
}

/**
 * Main request handler
 */
async function handleSecurityRequest(request: NextRequest) {
  const { pathname } = new URL(request.url)
  const method = request.method

  try {
    // Route to specific handlers
    if (method === 'GET' && pathname.endsWith('/status')) {
      return await handleGetSecurityStatus(request)
    }
    
    if (method === 'POST' && pathname.endsWith('/report')) {
      return await handleReportSecurityIncident(request)
    }
    
    if (method === 'GET' && pathname.endsWith('/audit')) {
      return await handleGetAuditLogs(request)
    }
    
    if (method === 'GET' && pathname.endsWith('/reports')) {
      return await handleGenerateSecurityReport(request)
    }
    
    if (method === 'POST' && pathname.endsWith('/webhook')) {
      return await handleSecurityWebhook(request)
    }

    // Default handler for /api/security
    if (method === 'GET' && pathname.endsWith('/security')) {
      // Simple health check
      return createSuccessResponse({
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: [
          'GET /api/security/status',
          'POST /api/security/report',
          'GET /api/security/audit',
          'GET /api/security/reports',
          'POST /api/security/webhook'
        ]
      }, 'Security API is operational')
    }

    return createErrorResponse('Endpoint not found', 404)

  } catch (error) {
    console.error('Unexpected error in security API:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Export route handlers
export const GET = withErrorHandling(handleSecurityRequest)
export const POST = withErrorHandling(handleSecurityRequest)

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}