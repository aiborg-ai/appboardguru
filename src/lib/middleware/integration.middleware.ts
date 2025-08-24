/**
 * Integration Middleware
 * 
 * Middleware for cross-feature integration operations
 * Handles validation, performance monitoring, and error recovery
 * 
 * Follows CLAUDE.md patterns with Result pattern and enterprise reliability
 */

import { NextRequest, NextResponse } from 'next/server'
import { Result, success, failure } from '../repositories/result'
import { supabaseServer } from '../supabase-server'
import {
  OrganizationId,
  UserId,
  createOrganizationId,
  createUserId
} from '../../types/branded'
import { z } from 'zod'

// =============================================
// MIDDLEWARE CONFIGURATION
// =============================================

export interface IntegrationMiddlewareConfig {
  readonly enablePerformanceMonitoring: boolean
  readonly enableRateLimiting: boolean
  readonly enableMetricsCollection: boolean
  readonly maxRequestsPerMinute: number
  readonly performanceThresholdMs: number
  readonly enableFeatureFlags: boolean
  readonly auditIntegrationRequests: boolean
}

const DEFAULT_CONFIG: IntegrationMiddlewareConfig = {
  enablePerformanceMonitoring: true,
  enableRateLimiting: true,
  enableMetricsCollection: true,
  maxRequestsPerMinute: 100,
  performanceThresholdMs: 200,
  enableFeatureFlags: true,
  auditIntegrationRequests: true
}

// =============================================
// REQUEST CONTEXT TYPES
// =============================================

export interface IntegrationRequestContext {
  readonly requestId: string
  readonly userId: UserId
  readonly organizationId: OrganizationId
  readonly features: string[]
  readonly operation: 'read' | 'write' | 'sync' | 'process'
  readonly priority: 'low' | 'medium' | 'high' | 'critical'
  readonly startTime: number
  readonly metadata: Record<string, any>
}

export interface IntegrationMiddlewareOptions {
  readonly requiredFeatures?: string[]
  readonly requiredPermissions?: Array<{
    readonly resource: string
    readonly action: string
  }>
  readonly enableCaching?: boolean
  readonly cacheKeyGenerator?: (context: IntegrationRequestContext) => string
  readonly performanceTarget?: number
  readonly customValidation?: (request: NextRequest, context: IntegrationRequestContext) => Promise<Result<boolean>>
}

// =============================================
// RATE LIMITING
// =============================================

class IntegrationRateLimiter {
  private requests = new Map<string, Array<{ timestamp: number; operation: string }>>()
  private config: IntegrationMiddlewareConfig

  constructor(config: IntegrationMiddlewareConfig) {
    this.config = config
    this.startCleanupInterval()
  }

  async checkRateLimit(
    userId: UserId,
    organizationId: OrganizationId,
    operation: string
  ): Promise<Result<{
    allowed: boolean
    remaining: number
    resetTime: number
  }>> {
    if (!this.config.enableRateLimiting) {
      return success({
        allowed: true,
        remaining: this.config.maxRequestsPerMinute,
        resetTime: Date.now() + 60000
      })
    }

    const key = `${organizationId}_${userId}`
    const now = Date.now()
    const windowStart = now - 60000 // 1 minute window

    // Get current requests for this user/org
    let userRequests = this.requests.get(key) || []
    
    // Remove old requests outside the window
    userRequests = userRequests.filter(req => req.timestamp >= windowStart)

    // Check if limit exceeded
    const requestCount = userRequests.length
    const allowed = requestCount < this.config.maxRequestsPerMinute

    if (allowed) {
      // Add new request
      userRequests.push({ timestamp: now, operation })
      this.requests.set(key, userRequests)
    }

    const remaining = Math.max(0, this.config.maxRequestsPerMinute - requestCount - (allowed ? 1 : 0))
    const resetTime = Math.max(...userRequests.map(r => r.timestamp)) + 60000

    return success({
      allowed,
      remaining,
      resetTime
    })
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now()
      const windowStart = now - 60000

      // Clean up old entries
      for (const [key, requests] of this.requests.entries()) {
        const filteredRequests = requests.filter(req => req.timestamp >= windowStart)
        
        if (filteredRequests.length === 0) {
          this.requests.delete(key)
        } else {
          this.requests.set(key, filteredRequests)
        }
      }
    }, 30000) // Clean up every 30 seconds
  }
}

// =============================================
// PERFORMANCE MONITORING
// =============================================

class IntegrationPerformanceMonitor {
  private metrics = new Map<string, Array<{
    duration: number
    timestamp: number
    operation: string
    success: boolean
  }>>()
  
  private config: IntegrationMiddlewareConfig

  constructor(config: IntegrationMiddlewareConfig) {
    this.config = config
  }

  recordRequest(
    context: IntegrationRequestContext,
    duration: number,
    success: boolean
  ): void {
    if (!this.config.enablePerformanceMonitoring) return

    const key = `${context.organizationId}_${context.operation}`
    const metrics = this.metrics.get(key) || []

    metrics.push({
      duration,
      timestamp: Date.now(),
      operation: context.operation,
      success
    })

    // Keep only last 1000 entries per key
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000)
    }

    this.metrics.set(key, metrics)

    // Alert if performance threshold exceeded
    if (duration > this.config.performanceThresholdMs) {
      console.warn(`Integration performance warning: ${context.operation} took ${duration}ms (threshold: ${this.config.performanceThresholdMs}ms)`, {
        requestId: context.requestId,
        organizationId: context.organizationId,
        features: context.features
      })
    }
  }

  getMetrics(organizationId: OrganizationId): {
    averageLatency: number
    p95Latency: number
    successRate: number
    requestCount: number
    slowRequests: number
  } {
    const allMetrics = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith(organizationId))
      .flatMap(([, metrics]) => metrics)
      .filter(metric => metric.timestamp > Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours

    if (allMetrics.length === 0) {
      return {
        averageLatency: 0,
        p95Latency: 0,
        successRate: 100,
        requestCount: 0,
        slowRequests: 0
      }
    }

    const durations = allMetrics.map(m => m.duration).sort((a, b) => a - b)
    const successCount = allMetrics.filter(m => m.success).length
    const slowRequests = allMetrics.filter(m => m.duration > this.config.performanceThresholdMs).length

    return {
      averageLatency: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p95Latency: durations[Math.floor(durations.length * 0.95)] || 0,
      successRate: (successCount / allMetrics.length) * 100,
      requestCount: allMetrics.length,
      slowRequests
    }
  }
}

// =============================================
// FEATURE FLAGS
// =============================================

class IntegrationFeatureFlags {
  private flags = new Map<string, {
    enabled: boolean
    organizationIds?: OrganizationId[]
    percentage?: number
  }>()

  constructor() {
    this.initializeDefaultFlags()
  }

  private initializeDefaultFlags(): void {
    this.flags.set('meeting_ai_integration', { enabled: true })
    this.flags.set('document_compliance_integration', { enabled: true })
    this.flags.set('voting_compliance_integration', { enabled: true })
    this.flags.set('cross_feature_sync', { enabled: true })
    this.flags.set('optimistic_updates', { enabled: true })
    this.flags.set('real_time_sync', { enabled: true })
  }

  isEnabled(flagName: string, organizationId?: OrganizationId): boolean {
    const flag = this.flags.get(flagName)
    if (!flag) return false

    // Check if globally disabled
    if (!flag.enabled) return false

    // Check organization-specific rules
    if (flag.organizationIds && organizationId) {
      return flag.organizationIds.includes(organizationId)
    }

    // Check percentage rollout
    if (flag.percentage && organizationId) {
      const hash = this.hashOrganizationId(organizationId)
      return hash < flag.percentage
    }

    return flag.enabled
  }

  private hashOrganizationId(organizationId: OrganizationId): number {
    // Simple hash function for percentage rollout
    let hash = 0
    const str = organizationId.toString()
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100
  }

  setFlag(flagName: string, enabled: boolean, options?: {
    organizationIds?: OrganizationId[]
    percentage?: number
  }): void {
    this.flags.set(flagName, {
      enabled,
      ...options
    })
  }
}

// =============================================
// MAIN MIDDLEWARE CLASS
// =============================================

export class IntegrationMiddleware {
  private config: IntegrationMiddlewareConfig
  private rateLimiter: IntegrationRateLimiter
  private performanceMonitor: IntegrationPerformanceMonitor
  private featureFlags: IntegrationFeatureFlags

  constructor(config: Partial<IntegrationMiddlewareConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.rateLimiter = new IntegrationRateLimiter(this.config)
    this.performanceMonitor = new IntegrationPerformanceMonitor(this.config)
    this.featureFlags = new IntegrationFeatureFlags()
  }

  /**
   * Main middleware function
   */
  async process(
    request: NextRequest,
    options: IntegrationMiddlewareOptions = {}
  ): Promise<Result<{
    context: IntegrationRequestContext
    response?: NextResponse
  }>> {
    const startTime = Date.now()
    const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Parse request and extract context
      const contextResult = await this.extractRequestContext(request, requestId, startTime)
      if (!contextResult.success) {
        return contextResult
      }

      const context = contextResult.data

      // Check rate limits
      const rateLimitResult = await this.rateLimiter.checkRateLimit(
        context.userId,
        context.organizationId,
        context.operation
      )

      if (!rateLimitResult.success || !rateLimitResult.data.allowed) {
        const response = new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            details: rateLimitResult.success ? {
              remaining: rateLimitResult.data.remaining,
              resetTime: rateLimitResult.data.resetTime
            } : {}
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': rateLimitResult.success ? rateLimitResult.data.remaining.toString() : '0',
              'X-RateLimit-Reset': rateLimitResult.success ? rateLimitResult.data.resetTime.toString() : Date.now().toString()
            }
          }
        )

        return success({ context, response })
      }

      // Check feature flags
      if (this.config.enableFeatureFlags && options.requiredFeatures) {
        for (const feature of options.requiredFeatures) {
          if (!this.featureFlags.isEnabled(feature, context.organizationId)) {
            const response = new NextResponse(
              JSON.stringify({
                error: 'Feature not available',
                details: { feature, organizationId: context.organizationId }
              }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
              }
            )

            return success({ context, response })
          }
        }
      }

      // Check permissions
      if (options.requiredPermissions) {
        const permissionResult = await this.checkPermissions(context, options.requiredPermissions)
        if (!permissionResult.success || !permissionResult.data) {
          const response = new NextResponse(
            JSON.stringify({
              error: 'Insufficient permissions',
              details: { requiredPermissions: options.requiredPermissions }
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          )

          return success({ context, response })
        }
      }

      // Custom validation
      if (options.customValidation) {
        const validationResult = await options.customValidation(request, context)
        if (!validationResult.success || !validationResult.data) {
          const response = new NextResponse(
            JSON.stringify({
              error: 'Custom validation failed',
              details: validationResult.success ? {} : { error: validationResult.error }
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          )

          return success({ context, response })
        }
      }

      // Audit request if enabled
      if (this.config.auditIntegrationRequests) {
        await this.auditRequest(context, request)
      }

      return success({ context })

    } catch (error) {
      console.error('Integration middleware error:', error)
      
      const response = new NextResponse(
        JSON.stringify({
          error: 'Middleware error',
          details: { requestId }
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )

      return success({
        context: {
          requestId,
          userId: '' as UserId,
          organizationId: '' as OrganizationId,
          features: [],
          operation: 'read',
          priority: 'low',
          startTime,
          metadata: { error: true }
        },
        response
      })
    }
  }

  /**
   * Record request completion for performance monitoring
   */
  recordCompletion(
    context: IntegrationRequestContext,
    success: boolean,
    error?: Error
  ): void {
    const duration = Date.now() - context.startTime

    this.performanceMonitor.recordRequest(context, duration, success)

    if (this.config.enableMetricsCollection) {
      console.log(`Integration request completed: ${context.requestId}`, {
        organizationId: context.organizationId,
        operation: context.operation,
        features: context.features,
        duration,
        success,
        error: error?.message
      })
    }
  }

  /**
   * Get performance metrics for organization
   */
  getPerformanceMetrics(organizationId: OrganizationId) {
    return this.performanceMonitor.getMetrics(organizationId)
  }

  /**
   * Configure feature flags
   */
  setFeatureFlag(flagName: string, enabled: boolean, options?: {
    organizationIds?: OrganizationId[]
    percentage?: number
  }) {
    this.featureFlags.setFlag(flagName, enabled, options)
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private async extractRequestContext(
    request: NextRequest,
    requestId: string,
    startTime: number
  ): Promise<Result<IntegrationRequestContext>> {
    try {
      // Extract user ID from headers or JWT
      const userIdHeader = request.headers.get('x-user-id')
      const organizationIdHeader = request.headers.get('x-organization-id')

      if (!userIdHeader || !organizationIdHeader) {
        return failure({
          code: 'MISSING_HEADERS',
          message: 'User ID and Organization ID headers are required',
          details: {}
        } as any)
      }

      const userIdResult = createUserId(userIdHeader)
      const organizationIdResult = createOrganizationId(organizationIdHeader)

      if (!userIdResult.success || !organizationIdResult.success) {
        return failure({
          code: 'INVALID_HEADERS',
          message: 'Invalid User ID or Organization ID format',
          details: {}
        } as any)
      }

      // Extract features from URL path
      const url = new URL(request.url)
      const pathSegments = url.pathname.split('/').filter(Boolean)
      const features = pathSegments.filter(segment => 
        ['meetings', 'compliance', 'documents', 'ai'].includes(segment)
      )

      // Determine operation from HTTP method
      const method = request.method.toLowerCase()
      const operation: IntegrationRequestContext['operation'] = 
        method === 'get' ? 'read' :
        method === 'post' || method === 'put' || method === 'patch' ? 'write' :
        method === 'delete' ? 'write' :
        url.pathname.includes('sync') ? 'sync' :
        url.pathname.includes('process') ? 'process' :
        'read'

      // Determine priority from headers or URL
      const priorityHeader = request.headers.get('x-priority')
      const priority: IntegrationRequestContext['priority'] = 
        priorityHeader as any || 'medium'

      return success({
        requestId,
        userId: userIdResult.data!,
        organizationId: organizationIdResult.data!,
        features,
        operation,
        priority,
        startTime,
        metadata: {
          method,
          url: request.url,
          userAgent: request.headers.get('user-agent'),
          contentType: request.headers.get('content-type')
        }
      })

    } catch (error) {
      return failure({
        code: 'CONTEXT_EXTRACTION_ERROR',
        message: `Failed to extract request context: ${error}`,
        details: { error }
      } as any)
    }
  }

  private async checkPermissions(
    context: IntegrationRequestContext,
    requiredPermissions: Array<{
      readonly resource: string
      readonly action: string
    }>
  ): Promise<Result<boolean>> {
    try {
      const supabase = await supabaseServer()

      // Check each required permission
      for (const permission of requiredPermissions) {
        // This would integrate with your permission system
        // For now, we'll do a basic organization membership check
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', context.organizationId)
          .eq('user_id', context.userId)
          .single()

        if (!membership) {
          return success(false)
        }

        // Basic role-based permission check
        const hasPermission = this.checkRolePermission(
          membership.role,
          permission.resource,
          permission.action
        )

        if (!hasPermission) {
          return success(false)
        }
      }

      return success(true)

    } catch (error) {
      return failure({
        code: 'PERMISSION_CHECK_ERROR',
        message: `Failed to check permissions: ${error}`,
        details: { error }
      } as any)
    }
  }

  private checkRolePermission(role: string, resource: string, action: string): boolean {
    // Simplified role-based permission logic
    const rolePermissions: Record<string, string[]> = {
      owner: ['*'],
      admin: ['meeting:*', 'compliance:*', 'document:*', 'ai:*'],
      member: ['meeting:read', 'meeting:write', 'document:read', 'document:write', 'ai:read'],
      viewer: ['meeting:read', 'document:read', 'ai:read']
    }

    const userPermissions = rolePermissions[role] || []
    const requiredPermission = `${resource}:${action}`

    return userPermissions.includes('*') || 
           userPermissions.includes(`${resource}:*`) ||
           userPermissions.includes(requiredPermission)
  }

  private async auditRequest(
    context: IntegrationRequestContext,
    request: NextRequest
  ): Promise<void> {
    try {
      const supabase = await supabaseServer()

      // Extract relevant request data
      const body = request.method !== 'GET' 
        ? await request.clone().text().catch(() => '')
        : ''

      await supabase.from('integration_audit_logs').insert({
        request_id: context.requestId,
        organization_id: context.organizationId,
        user_id: context.userId,
        operation: context.operation,
        features: context.features,
        priority: context.priority,
        method: request.method,
        url: request.url,
        user_agent: request.headers.get('user-agent'),
        request_size: body.length,
        timestamp: new Date().toISOString(),
        metadata: context.metadata
      })

    } catch (error) {
      // Don't fail the request if audit logging fails
      console.error('Failed to audit integration request:', error)
    }
  }
}

// =============================================
// GLOBAL MIDDLEWARE INSTANCE
// =============================================

export const globalIntegrationMiddleware = new IntegrationMiddleware({
  enablePerformanceMonitoring: true,
  enableRateLimiting: true,
  enableMetricsCollection: true,
  performanceThresholdMs: 200,
  auditIntegrationRequests: process.env.NODE_ENV === 'production'
})

// =============================================
// MIDDLEWARE HELPER FUNCTIONS
// =============================================

/**
 * Create middleware wrapper for integration endpoints
 */
export function withIntegrationMiddleware(
  handler: (request: NextRequest, context: IntegrationRequestContext) => Promise<NextResponse>,
  options: IntegrationMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const middlewareResult = await globalIntegrationMiddleware.process(request, options)
    
    if (!middlewareResult.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Middleware error',
          details: middlewareResult.error
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // If middleware returned a response (e.g., rate limit, validation error), return it
    if (middlewareResult.data.response) {
      return middlewareResult.data.response
    }

    const context = middlewareResult.data.context
    let response: NextResponse
    let success = true
    let error: Error | undefined

    try {
      response = await handler(request, context)
    } catch (err) {
      success = false
      error = err as Error
      response = new NextResponse(
        JSON.stringify({
          error: 'Request handler error',
          details: { message: error.message, requestId: context.requestId }
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } finally {
      globalIntegrationMiddleware.recordCompletion(context, success, error)
    }

    return response
  }
}