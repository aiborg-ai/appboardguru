/**
 * Distributed Tracing and Request Correlation System
 * Advanced request tracking and distributed system observability for BoardGuru
 */

import { NextRequest, NextResponse } from 'next/server'
import { Logger } from '../logging/logger'
import { telemetry, TelemetryManager, Span, SpanStatusCode } from '../logging/telemetry'
import { enhancedPerformanceMonitor } from '../telemetry/performance'

const logger = Logger.getLogger('DistributedTracing')

export interface TraceContext {
  traceId: string
  spanId: string
  parentSpanId?: string
  sampled: boolean
  baggage: Record<string, string>
}

export interface RequestCorrelation {
  requestId: string
  userId?: string
  organizationId?: string
  sessionId?: string
  userAgent: string
  ipAddress?: string
  referrer?: string
  timestamp: Date
  route: string
  method: string
}

export interface DistributedSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  operationName: string
  startTime: number
  endTime?: number
  duration?: number
  tags: Record<string, unknown>
  logs: Array<{
    timestamp: number
    level: 'debug' | 'info' | 'warn' | 'error'
    message: string
    fields: Record<string, unknown>
  }>
  status: {
    code: SpanStatusCode
    message?: string
  }
  service: string
  component: string
  kind: 'server' | 'client' | 'producer' | 'consumer' | 'internal'
}

export interface TracingSamplingConfig {
  globalSampleRate: number // 0-1, percentage of traces to sample
  operationSampleRates: Record<string, number> // Per-operation sampling rates
  userSampleRates: Record<string, number> // Per-user sampling rates
  prioritySampling: {
    errorSampleRate: number // Always sample errors
    slowRequestThreshold: number // Always sample slow requests
    criticalOperations: string[] // Always sample these operations
  }
}

/**
 * Distributed Tracing Manager
 */
export class DistributedTracingManager {
  private telemetryManager: TelemetryManager
  private activeTraces = new Map<string, DistributedSpan[]>()
  private correlationContext = new Map<string, RequestCorrelation>()
  private samplingConfig: TracingSamplingConfig

  constructor(
    telemetryManager: TelemetryManager,
    samplingConfig: Partial<TracingSamplingConfig> = {}
  ) {
    this.telemetryManager = telemetryManager
    this.samplingConfig = {
      globalSampleRate: 0.1, // 10% by default
      operationSampleRates: {},
      userSampleRates: {},
      prioritySampling: {
        errorSampleRate: 1.0, // Always sample errors
        slowRequestThreshold: 1000, // 1 second
        criticalOperations: ['user_auth', 'payment', 'data_export']
      },
      ...samplingConfig
    }
  }

  /**
   * Start a new distributed trace for an incoming request
   */
  startTrace(
    req: NextRequest,
    operationName: string,
    options: {
      service?: string
      component?: string
      kind?: DistributedSpan['kind']
      tags?: Record<string, unknown>
    } = {}
  ): { traceContext: TraceContext; span: DistributedSpan } {
    // Extract existing trace context from headers
    const existingContext = this.extractTraceContext(req)
    
    // Generate new span
    const traceId = existingContext?.traceId || this.generateTraceId()
    const spanId = this.generateSpanId()
    const parentSpanId = existingContext?.spanId

    // Determine if this trace should be sampled
    const sampled = this.shouldSample(operationName, req, existingContext)

    const traceContext: TraceContext = {
      traceId,
      spanId,
      parentSpanId,
      sampled,
      baggage: existingContext?.baggage || {}
    }

    // Create distributed span
    const span: DistributedSpan = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: Date.now(),
      tags: {
        'http.method': req.method,
        'http.url': req.url,
        'http.user_agent': req.headers.get('user-agent') || '',
        'service.name': options.service || 'boardguru-api',
        'component': options.component || 'api',
        ...options.tags
      },
      logs: [],
      status: { code: SpanStatusCode.UNSET },
      service: options.service || 'boardguru-api',
      component: options.component || 'api',
      kind: options.kind || 'server'
    }

    // Store span if sampled
    if (sampled) {
      this.addSpanToTrace(traceId, span)
    }

    // Create request correlation
    const correlation: RequestCorrelation = {
      requestId: spanId,
      userId: this.extractUserId(req),
      organizationId: this.extractOrganizationId(req),
      sessionId: this.extractSessionId(req),
      userAgent: req.headers.get('user-agent') || '',
      ipAddress: this.extractIpAddress(req),
      referrer: req.headers.get('referer') || undefined,
      timestamp: new Date(),
      route: new URL(req.url).pathname,
      method: req.method
    }

    this.correlationContext.set(spanId, correlation)

    // Record trace start metrics
    telemetry.recordCounter('distributed_traces_started', 1, {
      operation: operationName,
      service: span.service,
      sampled: sampled.toString()
    })

    logger.debug('Started distributed trace', {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      sampled
    })

    return { traceContext, span }
  }

  /**
   * Create a child span within an existing trace
   */
  createChildSpan(
    parentContext: TraceContext,
    operationName: string,
    options: {
      service?: string
      component?: string
      kind?: DistributedSpan['kind']
      tags?: Record<string, unknown>
    } = {}
  ): DistributedSpan {
    const spanId = this.generateSpanId()

    const span: DistributedSpan = {
      traceId: parentContext.traceId,
      spanId,
      parentSpanId: parentContext.spanId,
      operationName,
      startTime: Date.now(),
      tags: {
        'service.name': options.service || 'boardguru-api',
        'component': options.component || 'internal',
        ...options.tags
      },
      logs: [],
      status: { code: SpanStatusCode.UNSET },
      service: options.service || 'boardguru-api',
      component: options.component || 'internal',
      kind: options.kind || 'internal'
    }

    // Store span if parent trace is sampled
    if (parentContext.sampled) {
      this.addSpanToTrace(parentContext.traceId, span)
    }

    return span
  }

  /**
   * Finish a span and record its completion
   */
  finishSpan(
    span: DistributedSpan,
    status: SpanStatusCode = SpanStatusCode.OK,
    error?: Error
  ): void {
    span.endTime = Date.now()
    span.duration = span.endTime - span.startTime
    span.status.code = status

    if (error) {
      span.status.message = error.message
      span.tags['error'] = true
      span.tags['error.type'] = error.constructor.name
      span.tags['error.message'] = error.message
      
      this.addSpanLog(span, 'error', error.message, {
        stack: error.stack,
        errorType: error.constructor.name
      })
    }

    // Record span completion metrics
    telemetry.recordHistogram('span_duration_ms', span.duration!, {
      operation: span.operationName,
      service: span.service,
      component: span.component,
      status: status === SpanStatusCode.OK ? 'success' : 'error'
    })

    // Check for slow operations
    if (span.duration! > this.samplingConfig.prioritySampling.slowRequestThreshold) {
      telemetry.recordCounter('slow_operations_total', 1, {
        operation: span.operationName,
        service: span.service
      })
    }

    logger.debug('Finished span', {
      traceId: span.traceId,
      spanId: span.spanId,
      operationName: span.operationName,
      duration: span.duration,
      status
    })
  }

  /**
   * Add a log entry to a span
   */
  addSpanLog(
    span: DistributedSpan,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    fields: Record<string, unknown> = {}
  ): void {
    span.logs.push({
      timestamp: Date.now(),
      level,
      message,
      fields
    })
  }

  /**
   * Add tags to a span
   */
  addSpanTags(span: DistributedSpan, tags: Record<string, unknown>): void {
    Object.assign(span.tags, tags)
  }

  /**
   * Get request correlation data
   */
  getRequestCorrelation(requestId: string): RequestCorrelation | undefined {
    return this.correlationContext.get(requestId)
  }

  /**
   * Get all spans for a trace
   */
  getTraceSpans(traceId: string): DistributedSpan[] {
    return this.activeTraces.get(traceId) || []
  }

  /**
   * Export trace data (for sending to external tracing systems)
   */
  exportTrace(traceId: string): {
    traceId: string
    spans: DistributedSpan[]
    correlation: RequestCorrelation[]
    metrics: {
      totalSpans: number
      totalDuration: number
      errorCount: number
      services: string[]
    }
  } {
    const spans = this.getTraceSpans(traceId)
    const correlations = spans
      .map(span => this.correlationContext.get(span.spanId))
      .filter(Boolean) as RequestCorrelation[]

    const metrics = {
      totalSpans: spans.length,
      totalDuration: Math.max(...spans.map(s => s.duration || 0)),
      errorCount: spans.filter(s => s.status.code === SpanStatusCode.ERROR).length,
      services: [...new Set(spans.map(s => s.service))]
    }

    return {
      traceId,
      spans,
      correlation: correlations,
      metrics
    }
  }

  /**
   * Inject trace context into outgoing requests
   */
  injectTraceContext(traceContext: TraceContext, headers: Headers): void {
    headers.set('x-trace-id', traceContext.traceId)
    headers.set('x-span-id', traceContext.spanId)
    
    if (traceContext.parentSpanId) {
      headers.set('x-parent-span-id', traceContext.parentSpanId)
    }
    
    headers.set('x-sampled', traceContext.sampled ? '1' : '0')
    
    // Inject baggage
    if (Object.keys(traceContext.baggage).length > 0) {
      headers.set('x-baggage', Object.entries(traceContext.baggage)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join(','))
    }
  }

  /**
   * Extract trace context from incoming request headers
   */
  extractTraceContext(req: NextRequest): TraceContext | null {
    const traceId = req.headers.get('x-trace-id')
    const spanId = req.headers.get('x-span-id')
    const parentSpanId = req.headers.get('x-parent-span-id') || undefined
    const sampled = req.headers.get('x-sampled') === '1'
    
    if (!traceId || !spanId) {
      return null
    }

    // Parse baggage
    const baggageHeader = req.headers.get('x-baggage')
    const baggage: Record<string, string> = {}
    
    if (baggageHeader) {
      baggageHeader.split(',').forEach(item => {
        const [key, value] = item.split('=')
        if (key && value) {
          baggage[key] = decodeURIComponent(value)
        }
      })
    }

    return {
      traceId,
      spanId,
      parentSpanId,
      sampled,
      baggage
    }
  }

  /**
   * Get tracing statistics
   */
  getTracingStatistics(): {
    activeTraces: number
    totalSpans: number
    samplingRate: number
    averageTraceSize: number
    topOperations: Array<{ operation: string; count: number; avgDuration: number }>
    errorRate: number
  } {
    const allSpans = Array.from(this.activeTraces.values()).flat()
    const totalSpans = allSpans.length
    const activeTraces = this.activeTraces.size
    
    // Calculate operation statistics
    const operationStats = new Map<string, { count: number; totalDuration: number; errors: number }>()
    
    allSpans.forEach(span => {
      const stats = operationStats.get(span.operationName) || { count: 0, totalDuration: 0, errors: 0 }
      stats.count++
      stats.totalDuration += span.duration || 0
      if (span.status.code === SpanStatusCode.ERROR) stats.errors++
      operationStats.set(span.operationName, stats)
    })

    const topOperations = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        avgDuration: stats.count > 0 ? stats.totalDuration / stats.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const errorCount = allSpans.filter(s => s.status.code === SpanStatusCode.ERROR).length
    const errorRate = totalSpans > 0 ? errorCount / totalSpans : 0

    return {
      activeTraces,
      totalSpans,
      samplingRate: this.samplingConfig.globalSampleRate,
      averageTraceSize: activeTraces > 0 ? totalSpans / activeTraces : 0,
      topOperations,
      errorRate
    }
  }

  /**
   * Cleanup old traces to prevent memory leaks
   */
  cleanup(maxAge: number = 3600000): void { // 1 hour default
    const cutoff = Date.now() - maxAge
    const tracesToRemove: string[] = []

    for (const [traceId, spans] of this.activeTraces.entries()) {
      const oldestSpan = spans.reduce((oldest, span) => 
        span.startTime < oldest.startTime ? span : oldest
      )
      
      if (oldestSpan.startTime < cutoff) {
        tracesToRemove.push(traceId)
        
        // Cleanup correlations
        spans.forEach(span => {
          this.correlationContext.delete(span.spanId)
        })
      }
    }

    tracesToRemove.forEach(traceId => {
      this.activeTraces.delete(traceId)
    })

    if (tracesToRemove.length > 0) {
      logger.debug(`Cleaned up ${tracesToRemove.length} old traces`)
    }
  }

  // Private helper methods
  private shouldSample(
    operationName: string,
    req: NextRequest,
    existingContext?: TraceContext | null
  ): boolean {
    // Always sample if parent is sampled
    if (existingContext?.sampled) {
      return true
    }

    // Always sample critical operations
    if (this.samplingConfig.prioritySampling.criticalOperations.includes(operationName)) {
      return true
    }

    // Check operation-specific sampling rate
    const operationSampleRate = this.samplingConfig.operationSampleRates[operationName]
    if (operationSampleRate !== undefined) {
      return Math.random() < operationSampleRate
    }

    // Check user-specific sampling rate
    const userId = this.extractUserId(req)
    if (userId) {
      const userSampleRate = this.samplingConfig.userSampleRates[userId]
      if (userSampleRate !== undefined) {
        return Math.random() < userSampleRate
      }
    }

    // Use global sampling rate
    return Math.random() < this.samplingConfig.globalSampleRate
  }

  private addSpanToTrace(traceId: string, span: DistributedSpan): void {
    const spans = this.activeTraces.get(traceId) || []
    spans.push(span)
    this.activeTraces.set(traceId, spans)
  }

  private generateTraceId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private generateSpanId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private extractUserId(req: NextRequest): string | undefined {
    // This would extract user ID from JWT token or session
    // For now, return undefined
    return undefined
  }

  private extractOrganizationId(req: NextRequest): string | undefined {
    // This would extract organization ID from headers or token
    return undefined
  }

  private extractSessionId(req: NextRequest): string | undefined {
    // This would extract session ID from headers or cookies
    return undefined
  }

  private extractIpAddress(req: NextRequest): string | undefined {
    // Extract from various possible headers
    return req.headers.get('x-forwarded-for')?.split(',')[0] ||
           req.headers.get('x-real-ip') ||
           req.headers.get('x-client-ip') ||
           undefined
  }
}

/**
 * Tracing middleware for Next.js API routes
 */
export function createTracingMiddleware(
  tracingManager: DistributedTracingManager
) {
  return async function tracingMiddleware(
    req: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const operationName = `${req.method} ${new URL(req.url).pathname}`
    
    // Start trace
    const { traceContext, span } = tracingManager.startTrace(req, operationName, {
      kind: 'server',
      tags: {
        'http.scheme': new URL(req.url).protocol.replace(':', ''),
        'http.host': new URL(req.url).host,
        'http.target': new URL(req.url).pathname + new URL(req.url).search
      }
    })

    // Add trace context to request for downstream use
    const tracedRequest = new NextRequest(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body
    })
    
    // Store trace context in headers for middleware chain
    tracedRequest.headers.set('x-internal-trace-id', traceContext.traceId)
    tracedRequest.headers.set('x-internal-span-id', traceContext.spanId)

    let response: NextResponse
    let error: Error | undefined

    try {
      // Execute the request
      response = await next()
      
      // Add response tags
      tracingManager.addSpanTags(span, {
        'http.status_code': response.status,
        'http.response.size': response.headers.get('content-length') || 0
      })

      // Inject trace context into response headers for debugging
      if (process.env.NODE_ENV === 'development') {
        response.headers.set('x-trace-id', traceContext.traceId)
        response.headers.set('x-span-id', traceContext.spanId)
      }

    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err))
      
      // Create error response
      response = new NextResponse(
        JSON.stringify({ error: 'Internal Server Error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
      
      tracingManager.addSpanTags(span, {
        'http.status_code': 500,
        'error': true
      })
    } finally {
      // Finish span
      tracingManager.finishSpan(
        span,
        error ? SpanStatusCode.ERROR : SpanStatusCode.OK,
        error
      )
    }

    return response
  }
}

/**
 * Distributed tracing utilities
 */
export class TracingUtils {
  /**
   * Instrument a function with tracing
   */
  static traceFunction<T extends (...args: any[]) => Promise<any>>(
    tracingManager: DistributedTracingManager,
    operationName: string,
    fn: T,
    options: {
      service?: string
      component?: string
      extractArgs?: (args: Parameters<T>) => Record<string, unknown>
    } = {}
  ): T {
    return (async (...args: Parameters<T>) => {
      // Get current trace context (would need context propagation)
      const parentContext: TraceContext = {
        traceId: 'current-trace', // Would get from context
        spanId: 'current-span',
        sampled: true,
        baggage: {}
      }

      const span = tracingManager.createChildSpan(parentContext, operationName, {
        service: options.service,
        component: options.component,
        kind: 'internal',
        tags: options.extractArgs ? options.extractArgs(args) : {}
      })

      try {
        const result = await fn(...args)
        tracingManager.finishSpan(span, SpanStatusCode.OK)
        return result
      } catch (error) {
        tracingManager.finishSpan(span, SpanStatusCode.ERROR, error as Error)
        throw error
      }
    }) as T
  }

  /**
   * Create a trace-aware HTTP client
   */
  static createTracedFetch(tracingManager: DistributedTracingManager) {
    return async function tracedFetch(
      url: string,
      options: RequestInit = {},
      traceContext?: TraceContext
    ): Promise<Response> {
      if (!traceContext) {
        // Would get from current context
        return fetch(url, options)
      }

      const span = tracingManager.createChildSpan(traceContext, `HTTP ${options.method || 'GET'}`, {
        kind: 'client',
        tags: {
          'http.method': options.method || 'GET',
          'http.url': url,
          'component': 'http_client'
        }
      })

      // Inject trace context into headers
      const headers = new Headers(options.headers)
      tracingManager.injectTraceContext(traceContext, headers)

      try {
        const response = await fetch(url, {
          ...options,
          headers
        })

        tracingManager.addSpanTags(span, {
          'http.status_code': response.status,
          'http.response.size': response.headers.get('content-length') || 0
        })

        tracingManager.finishSpan(span, response.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR)
        return response

      } catch (error) {
        tracingManager.finishSpan(span, SpanStatusCode.ERROR, error as Error)
        throw error
      }
    }
  }
}

// Global distributed tracing manager instance
export const distributedTracingManager = new DistributedTracingManager(
  TelemetryManager.getInstance(),
  {
    globalSampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE || '0.1'),
    prioritySampling: {
      errorSampleRate: 1.0,
      slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000'),
      criticalOperations: ['user_auth', 'payment', 'data_export', 'organization_create']
    }
  }
)

// Start periodic cleanup
if (typeof window === 'undefined') {
  setInterval(() => {
    distributedTracingManager.cleanup()
  }, 300000) // Cleanup every 5 minutes
}

export default distributedTracingManager