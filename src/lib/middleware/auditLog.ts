/**
 * Audit Log Middleware
 * Middleware wrapper for API endpoints to automatically log audit events
 */

import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAuditLogger } from '@/lib/audit/enhanced-audit-logger'

export interface AuditLogOptions {
  eventType?: string
  eventCategory?: string
  action?: string
  resourceType?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  includeRequestBody?: boolean
  includeResponseBody?: boolean
}

/**
 * Middleware to automatically log audit events for API endpoints
 */
export function withAuditLog(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: AuditLogOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const auditLogger = new EnhancedAuditLogger()
    
    // Extract basic info from request
    const method = req.method
    const url = req.url
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    
    let response: NextResponse
    let error: Error | null = null
    
    try {
      // Execute the handler
      response = await handler(req)
      
      // Log successful audit event
      await auditLogger.logEvent({
        eventType: options.eventType || 'api_request',
        eventCategory: options.eventCategory || 'api',
        action: options.action || `${method} ${url}`,
        outcome: response.status >= 400 ? 'failure' : 'success',
        severity: options.severity || (response.status >= 500 ? 'high' : 'low'),
        resourceType: options.resourceType || 'api_endpoint',
        requestData: options.includeRequestBody ? {
          method,
          url,
          headers: Object.fromEntries(req.headers.entries()),
          body: method !== 'GET' ? await req.text() : undefined
        } : { method, url },
        responseData: options.includeResponseBody ? {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        } : { status: response.status },
        metadata: {
          userAgent,
          ip,
          processingTimeMs: Date.now() - startTime
        }
      })
      
      return response
      
    } catch (err) {
      error = err as Error
      
      // Log error audit event
      await auditLogger.logEvent({
        eventType: 'api_error',
        eventCategory: 'api',
        action: `${method} ${url}`,
        outcome: 'failure',
        severity: 'high',
        resourceType: options.resourceType || 'api_endpoint',
        requestData: {
          method,
          url
        },
        errorData: {
          message: error.message,
          stack: error.stack
        },
        metadata: {
          userAgent,
          ip,
          processingTimeMs: Date.now() - startTime
        }
      })
      
      // Re-throw the error
      throw error
    }
  }
}

export default withAuditLog