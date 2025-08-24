/**
 * Advanced Distributed Tracing System
 * OpenTelemetry-based distributed tracing with advanced features
 */

import { trace, context, SpanStatusCode, SpanKind, ROOT_CONTEXT } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin'
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http'
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { EventEmitter } from 'events'
import { z } from 'zod'
import { Result, success, failure } from '../repositories/result'
import { nanoid } from 'nanoid'

// Tracing schemas
export const SpanConfigSchema = z.object({
  name: z.string(),
  kind: z.enum(['internal', 'server', 'client', 'producer', 'consumer']),
  attributes: z.record(z.any()).optional(),
  links: z.array(z.object({
    traceId: z.string(),
    spanId: z.string(),
    attributes: z.record(z.any()).optional()
  })).optional()
})

export const TracingConfigSchema = z.object({
  serviceName: z.string(),
  serviceVersion: z.string(),
  environment: z.string(),
  exporters: z.array(z.enum(['jaeger', 'zipkin', 'otlp', 'console'])),
  samplingRate: z.number().min(0).max(1),
  enableAutoInstrumentation: z.boolean(),
  customInstrumentations: z.array(z.string()).optional()
})

// Core interfaces
export interface TraceContext {
  traceId: string
  spanId: string
  parentSpanId?: string
  baggage: Record<string, string>
  correlationId: string
  userId?: string
  sessionId?: string
}

export interface SpanMetrics {
  duration: number
  startTime: number
  endTime: number
  status: 'ok' | 'error' | 'timeout'
  errorCount: number
  attributes: Record<string, any>
}

export interface TracingConfiguration {
  serviceName: string
  serviceVersion: string
  environment: string
  exporters: ('jaeger' | 'zipkin' | 'otlp' | 'console')[]
  samplingRate: number
  enableAutoInstrumentation: boolean
  customInstrumentations?: string[]
  resourceAttributes?: Record<string, any>
}

export interface SpanEvent {
  name: string
  timestamp: number
  attributes: Record<string, any>
}

export interface CustomSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  operationName: string
  startTime: number
  endTime?: number
  duration?: number
  status: 'active' | 'completed' | 'error'
  kind: SpanKind
  attributes: Record<string, any>
  events: SpanEvent[]
  links: Array<{
    traceId: string
    spanId: string
    attributes: Record<string, any>
  }>
}

export interface TraceAnalytics {
  totalSpans: number
  totalTraces: number
  averageDuration: number
  errorRate: number
  throughput: number
  topOperations: Array<{
    name: string
    count: number
    avgDuration: number
    errorRate: number
  }>
  serviceMap: Array<{
    source: string
    target: string
    callCount: number
    avgDuration: number
  }>
}

/**
 * Advanced Distributed Tracing Manager
 */
export class AdvancedTracingManager extends EventEmitter {
  private sdk: NodeSDK
  private activeSpans: Map<string, CustomSpan> = new Map()
  private completedSpans: Map<string, CustomSpan> = new Map()
  private traceMetrics: Map<string, SpanMetrics> = new Map()
  private correlationMap: Map<string, string[]> = new Map() // correlationId -> spanIds
  private configuration: TracingConfiguration
  private isInitialized = false

  constructor(config: TracingConfiguration) {
    super()
    this.configuration = config
    this.setupSDK()
  }

  /**
   * Initialize tracing system
   */
  async initialize(): Promise<Result<void, string>> {
    try {
      if (this.isInitialized) {
        return success(undefined)
      }

      // Start the SDK
      this.sdk.start()

      // Setup custom instrumentations
      this.setupCustomInstrumentations()

      // Setup metrics collection
      this.setupMetricsCollection()

      // Setup span lifecycle handlers
      this.setupSpanHandlers()

      this.isInitialized = true
      this.emit('tracingInitialized', this.configuration)

      return success(undefined)

    } catch (error) {
      return failure(`Tracing initialization failed: ${(error as Error).message}`)
    }
  }

  /**
   * Create and start a new span
   */
  startSpan(
    name: string,
    options: {
      kind?: SpanKind
      parentContext?: any
      attributes?: Record<string, any>
      links?: Array<{
        traceId: string
        spanId: string
        attributes?: Record<string, any>
      }>
      correlationId?: string
      userId?: string
      sessionId?: string
    } = {}
  ): CustomSpan {
    const tracer = trace.getActiveTracer()
    const spanContext = options.parentContext || context.active()
    
    const span = tracer.startSpan(name, {
      kind: options.kind || SpanKind.INTERNAL,
      attributes: options.attributes,
      links: options.links?.map(link => ({
        context: {
          traceId: link.traceId,
          spanId: link.spanId,
          traceFlags: 1
        },
        attributes: link.attributes
      }))
    }, spanContext)

    const spanContext_extracted = span.spanContext()
    const customSpan: CustomSpan = {
      traceId: spanContext_extracted.traceId,
      spanId: spanContext_extracted.spanId,
      parentSpanId: this.getParentSpanId(spanContext),
      operationName: name,
      startTime: Date.now(),
      status: 'active',
      kind: options.kind || SpanKind.INTERNAL,
      attributes: {
        ...options.attributes,
        'correlation.id': options.correlationId,
        'user.id': options.userId,
        'session.id': options.sessionId,
        'service.name': this.configuration.serviceName,
        'service.version': this.configuration.serviceVersion
      },
      events: [],
      links: options.links || []
    }

    // Store active span
    this.activeSpans.set(customSpan.spanId, customSpan)

    // Update correlation mapping
    if (options.correlationId) {
      const spans = this.correlationMap.get(options.correlationId) || []
      spans.push(customSpan.spanId)
      this.correlationMap.set(options.correlationId, spans)
    }

    this.emit('spanStarted', customSpan)

    // Return wrapper with additional methods
    return this.createSpanWrapper(customSpan, span)
  }

  /**
   * Create span wrapper with additional functionality
   */
  private createSpanWrapper(customSpan: CustomSpan, otelSpan: any): CustomSpan {
    const wrapper = {
      ...customSpan,
      
      // Add event to span
      addEvent: (name: string, attributes?: Record<string, any>) => {
        const event: SpanEvent = {
          name,
          timestamp: Date.now(),
          attributes: attributes || {}
        }
        customSpan.events.push(event)
        otelSpan.addEvent(name, attributes)
        this.emit('spanEvent', { spanId: customSpan.spanId, event })
      },

      // Set span attributes
      setAttributes: (attributes: Record<string, any>) => {
        Object.assign(customSpan.attributes, attributes)
        otelSpan.setAttributes(attributes)
      },

      // Set span status
      setStatus: (status: 'ok' | 'error', description?: string) => {
        customSpan.status = status === 'ok' ? 'completed' : 'error'
        otelSpan.setStatus({
          code: status === 'ok' ? SpanStatusCode.OK : SpanStatusCode.ERROR,
          message: description
        })
      },

      // Record exception
      recordException: (exception: Error) => {
        customSpan.status = 'error'
        customSpan.attributes['error.message'] = exception.message
        customSpan.attributes['error.stack'] = exception.stack
        otelSpan.recordException(exception)
        this.emit('spanError', { spanId: customSpan.spanId, error: exception })
      },

      // End span
      end: () => {
        const endTime = Date.now()
        customSpan.endTime = endTime
        customSpan.duration = endTime - customSpan.startTime
        
        if (customSpan.status === 'active') {
          customSpan.status = 'completed'
        }

        // Move from active to completed
        this.activeSpans.delete(customSpan.spanId)
        this.completedSpans.set(customSpan.spanId, customSpan)

        // Record metrics
        this.recordSpanMetrics(customSpan)

        // End OpenTelemetry span
        otelSpan.end()

        this.emit('spanCompleted', customSpan)
      }
    }

    return wrapper
  }

  /**
   * Create child span from current context
   */
  createChildSpan(
    name: string,
    options: {
      attributes?: Record<string, any>
      kind?: SpanKind
    } = {}
  ): CustomSpan {
    return this.startSpan(name, {
      ...options,
      parentContext: context.active()
    })
  }

  /**
   * Execute function with automatic span
   */
  async withSpan<T>(
    name: string,
    fn: (span: CustomSpan) => Promise<T>,
    options: {
      attributes?: Record<string, any>
      kind?: SpanKind
    } = {}
  ): Promise<T> {
    const span = this.startSpan(name, options)
    
    try {
      const result = await fn(span)
      span.setStatus('ok')
      return result
    } catch (error) {
      span.recordException(error as Error)
      span.setStatus('error', (error as Error).message)
      throw error
    } finally {
      span.end()
    }
  }

  /**
   * Get current trace context
   */
  getCurrentTraceContext(): TraceContext | null {
    const span = trace.getActiveSpan()
    if (!span) return null

    const spanContext = span.spanContext()
    const baggage = this.getBaggageFromContext()

    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      baggage,
      correlationId: baggage['correlation.id'] || '',
      userId: baggage['user.id'],
      sessionId: baggage['session.id']
    }
  }

  /**
   * Inject trace context into headers
   */
  injectTraceContext(headers: Record<string, string>): Record<string, string> {
    const injectedHeaders = { ...headers }
    
    // Use OpenTelemetry propagation API
    trace.setSpanContext(context.active(), trace.getActiveSpan()?.spanContext() || {})
    
    // Manual injection for custom headers
    const traceContext = this.getCurrentTraceContext()
    if (traceContext) {
      injectedHeaders['x-trace-id'] = traceContext.traceId
      injectedHeaders['x-span-id'] = traceContext.spanId
      injectedHeaders['x-correlation-id'] = traceContext.correlationId
      
      if (traceContext.userId) {
        injectedHeaders['x-user-id'] = traceContext.userId
      }
      
      if (traceContext.sessionId) {
        injectedHeaders['x-session-id'] = traceContext.sessionId
      }
    }

    return injectedHeaders
  }

  /**
   * Extract trace context from headers
   */
  extractTraceContext(headers: Record<string, string>): TraceContext | null {
    const traceId = headers['x-trace-id']
    const spanId = headers['x-span-id']
    const correlationId = headers['x-correlation-id']

    if (!traceId || !spanId) return null

    return {
      traceId,
      spanId,
      baggage: {
        'correlation.id': correlationId || '',
        'user.id': headers['x-user-id'] || '',
        'session.id': headers['x-session-id'] || ''
      },
      correlationId: correlationId || '',
      userId: headers['x-user-id'],
      sessionId: headers['x-session-id']
    }
  }

  /**
   * Get trace analytics
   */
  getTraceAnalytics(timeWindow: { start: Date; end: Date }): TraceAnalytics {
    const spans = Array.from(this.completedSpans.values()).filter(span => {
      const spanTime = new Date(span.startTime)
      return spanTime >= timeWindow.start && spanTime <= timeWindow.end
    })

    const traceIds = new Set(spans.map(span => span.traceId))
    const totalDuration = spans.reduce((sum, span) => sum + (span.duration || 0), 0)
    const errorSpans = spans.filter(span => span.status === 'error')

    // Calculate operation statistics
    const operationStats = new Map<string, { count: number; totalDuration: number; errorCount: number }>()
    
    spans.forEach(span => {
      const current = operationStats.get(span.operationName) || { count: 0, totalDuration: 0, errorCount: 0 }
      current.count++
      current.totalDuration += span.duration || 0
      if (span.status === 'error') current.errorCount++
      operationStats.set(span.operationName, current)
    })

    const topOperations = Array.from(operationStats.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
        errorRate: stats.errorCount / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Build service map
    const serviceMap = this.buildServiceMap(spans)

    return {
      totalSpans: spans.length,
      totalTraces: traceIds.size,
      averageDuration: spans.length > 0 ? totalDuration / spans.length : 0,
      errorRate: spans.length > 0 ? errorSpans.length / spans.length : 0,
      throughput: spans.length / ((timeWindow.end.getTime() - timeWindow.start.getTime()) / 1000),
      topOperations,
      serviceMap
    }
  }

  /**
   * Get spans by correlation ID
   */
  getSpansByCorrelationId(correlationId: string): CustomSpan[] {
    const spanIds = this.correlationMap.get(correlationId) || []
    return spanIds.map(id => 
      this.activeSpans.get(id) || this.completedSpans.get(id)
    ).filter(span => span !== undefined) as CustomSpan[]
  }

  /**
   * Search spans by criteria
   */
  searchSpans(criteria: {
    serviceName?: string
    operationName?: string
    traceId?: string
    userId?: string
    status?: 'active' | 'completed' | 'error'
    timeRange?: { start: Date; end: Date }
    attributes?: Record<string, any>
    limit?: number
  }): CustomSpan[] {
    const allSpans = [
      ...Array.from(this.activeSpans.values()),
      ...Array.from(this.completedSpans.values())
    ]

    let filtered = allSpans

    if (criteria.serviceName) {
      filtered = filtered.filter(span => 
        span.attributes['service.name'] === criteria.serviceName
      )
    }

    if (criteria.operationName) {
      filtered = filtered.filter(span => 
        span.operationName.includes(criteria.operationName!)
      )
    }

    if (criteria.traceId) {
      filtered = filtered.filter(span => span.traceId === criteria.traceId)
    }

    if (criteria.userId) {
      filtered = filtered.filter(span => 
        span.attributes['user.id'] === criteria.userId
      )
    }

    if (criteria.status) {
      filtered = filtered.filter(span => span.status === criteria.status)
    }

    if (criteria.timeRange) {
      filtered = filtered.filter(span => {
        const spanTime = new Date(span.startTime)
        return spanTime >= criteria.timeRange!.start && spanTime <= criteria.timeRange!.end
      })
    }

    if (criteria.attributes) {
      filtered = filtered.filter(span => {
        return Object.entries(criteria.attributes!).every(([key, value]) => 
          span.attributes[key] === value
        )
      })
    }

    // Sort by start time (newest first) and apply limit
    filtered.sort((a, b) => b.startTime - a.startTime)

    if (criteria.limit) {
      filtered = filtered.slice(0, criteria.limit)
    }

    return filtered
  }

  /**
   * Export trace data
   */
  async exportTraces(
    criteria: {
      traceIds?: string[]
      timeRange?: { start: Date; end: Date }
      format: 'json' | 'jaeger' | 'zipkin'
    }
  ): Promise<Result<string, string>> {
    try {
      let spans: CustomSpan[]

      if (criteria.traceIds) {
        spans = Array.from(this.completedSpans.values()).filter(span => 
          criteria.traceIds!.includes(span.traceId)
        )
      } else if (criteria.timeRange) {
        spans = Array.from(this.completedSpans.values()).filter(span => {
          const spanTime = new Date(span.startTime)
          return spanTime >= criteria.timeRange!.start && spanTime <= criteria.timeRange!.end
        })
      } else {
        spans = Array.from(this.completedSpans.values())
      }

      switch (criteria.format) {
        case 'json':
          return success(JSON.stringify(spans, null, 2))
        
        case 'jaeger':
          return success(this.convertToJaegerFormat(spans))
        
        case 'zipkin':
          return success(this.convertToZipkinFormat(spans))
        
        default:
          return failure('Unsupported export format')
      }

    } catch (error) {
      return failure(`Export failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get tracing health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: {
      activeSpans: number
      completedSpans: number
      errorRate: number
      averageLatency: number
      exporterStatus: Record<string, 'connected' | 'disconnected' | 'error'>
    }
  } {
    const recentSpans = Array.from(this.completedSpans.values()).filter(span => 
      span.startTime > Date.now() - 300000 // Last 5 minutes
    )

    const errorSpans = recentSpans.filter(span => span.status === 'error')
    const errorRate = recentSpans.length > 0 ? errorSpans.length / recentSpans.length : 0
    const avgLatency = recentSpans.length > 0 
      ? recentSpans.reduce((sum, span) => sum + (span.duration || 0), 0) / recentSpans.length 
      : 0

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (errorRate > 0.1 || avgLatency > 5000) {
      status = 'degraded'
    }
    
    if (errorRate > 0.5 || avgLatency > 30000 || this.activeSpans.size > 10000) {
      status = 'unhealthy'
    }

    return {
      status,
      details: {
        activeSpans: this.activeSpans.size,
        completedSpans: this.completedSpans.size,
        errorRate,
        averageLatency: avgLatency,
        exporterStatus: this.getExporterStatus()
      }
    }
  }

  /**
   * Private helper methods
   */
  private setupSDK(): void {
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.configuration.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.configuration.serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.configuration.environment,
      ...this.configuration.resourceAttributes
    })

    // Setup exporters
    const exporters = this.createExporters()

    this.sdk = new NodeSDK({
      resource,
      spanProcessor: new BatchSpanProcessor(exporters[0]), // Primary exporter
      instrumentations: this.configuration.enableAutoInstrumentation 
        ? [getNodeAutoInstrumentations()] 
        : []
    })

    // Add additional exporters
    if (exporters.length > 1) {
      exporters.slice(1).forEach(exporter => {
        this.sdk.addSpanProcessor?.(new BatchSpanProcessor(exporter))
      })
    }
  }

  private createExporters(): any[] {
    const exporters: any[] = []

    this.configuration.exporters.forEach(exporterType => {
      switch (exporterType) {
        case 'jaeger':
          exporters.push(new JaegerExporter({
            endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
          }))
          break

        case 'zipkin':
          exporters.push(new ZipkinExporter({
            url: process.env.ZIPKIN_ENDPOINT || 'http://localhost:9411/api/v2/spans'
          }))
          break

        case 'otlp':
          exporters.push(new OTLPTraceExporter({
            url: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
          }))
          break

        case 'console':
          exporters.push(new (require('@opentelemetry/exporter-trace-otlp-http').ConsoleSpanExporter)())
          break
      }
    })

    return exporters
  }

  private setupCustomInstrumentations(): void {
    // Setup custom instrumentations for specific libraries
    if (this.configuration.customInstrumentations) {
      this.configuration.customInstrumentations.forEach(instrumentation => {
        try {
          const InstrumentationClass = require(instrumentation)
          this.sdk.addInstrumentation?.(new InstrumentationClass())
        } catch (error) {
          console.warn(`Failed to load instrumentation: ${instrumentation}`)
        }
      })
    }
  }

  private setupMetricsCollection(): void {
    // Collect span metrics periodically
    setInterval(() => {
      this.collectSpanMetrics()
    }, 60000) // Every minute

    // Clean up old spans
    setInterval(() => {
      this.cleanupOldSpans()
    }, 300000) // Every 5 minutes
  }

  private setupSpanHandlers(): void {
    this.on('spanCompleted', (span) => {
      // Additional processing for completed spans
      this.processCompletedSpan(span)
    })

    this.on('spanError', ({ spanId, error }) => {
      console.error(`Span error in ${spanId}:`, error)
    })
  }

  private getParentSpanId(context: any): string | undefined {
    // Extract parent span ID from context
    const span = trace.getSpan(context)
    return span?.spanContext().spanId
  }

  private getBaggageFromContext(): Record<string, string> {
    // Extract baggage from current context
    // This would use OpenTelemetry baggage API
    return {}
  }

  private recordSpanMetrics(span: CustomSpan): void {
    const metrics: SpanMetrics = {
      duration: span.duration || 0,
      startTime: span.startTime,
      endTime: span.endTime || Date.now(),
      status: span.status === 'error' ? 'error' : 'ok',
      errorCount: span.status === 'error' ? 1 : 0,
      attributes: span.attributes
    }

    this.traceMetrics.set(span.spanId, metrics)
  }

  private buildServiceMap(spans: CustomSpan[]): TraceAnalytics['serviceMap'] {
    const serviceConnections = new Map<string, { callCount: number; totalDuration: number }>()

    spans.forEach(span => {
      const serviceName = span.attributes['service.name'] || 'unknown'
      const parentSpan = spans.find(s => s.spanId === span.parentSpanId)
      
      if (parentSpan) {
        const parentService = parentSpan.attributes['service.name'] || 'unknown'
        const connectionKey = `${parentService}->${serviceName}`
        
        const current = serviceConnections.get(connectionKey) || { callCount: 0, totalDuration: 0 }
        current.callCount++
        current.totalDuration += span.duration || 0
        serviceConnections.set(connectionKey, current)
      }
    })

    return Array.from(serviceConnections.entries()).map(([connection, stats]) => {
      const [source, target] = connection.split('->')
      return {
        source,
        target,
        callCount: stats.callCount,
        avgDuration: stats.totalDuration / stats.callCount
      }
    })
  }

  private convertToJaegerFormat(spans: CustomSpan[]): string {
    // Convert spans to Jaeger JSON format
    const jaegerSpans = spans.map(span => ({
      traceID: span.traceId,
      spanID: span.spanId,
      parentSpanID: span.parentSpanId,
      operationName: span.operationName,
      startTime: span.startTime * 1000, // Jaeger uses microseconds
      duration: (span.duration || 0) * 1000,
      tags: Object.entries(span.attributes).map(([key, value]) => ({
        key,
        type: 'string',
        value: String(value)
      })),
      logs: span.events.map(event => ({
        timestamp: event.timestamp * 1000,
        fields: Object.entries(event.attributes).map(([key, value]) => ({
          key,
          value: String(value)
        }))
      }))
    }))

    return JSON.stringify({ data: [{ spans: jaegerSpans }] }, null, 2)
  }

  private convertToZipkinFormat(spans: CustomSpan[]): string {
    // Convert spans to Zipkin JSON format
    const zipkinSpans = spans.map(span => ({
      traceId: span.traceId,
      id: span.spanId,
      parentId: span.parentSpanId,
      name: span.operationName,
      timestamp: span.startTime * 1000,
      duration: (span.duration || 0) * 1000,
      kind: this.mapSpanKindToZipkin(span.kind),
      localEndpoint: {
        serviceName: span.attributes['service.name'] || this.configuration.serviceName
      },
      tags: span.attributes,
      annotations: span.events.map(event => ({
        timestamp: event.timestamp * 1000,
        value: event.name
      }))
    }))

    return JSON.stringify(zipkinSpans, null, 2)
  }

  private mapSpanKindToZipkin(kind: SpanKind): string {
    switch (kind) {
      case SpanKind.CLIENT: return 'CLIENT'
      case SpanKind.SERVER: return 'SERVER'
      case SpanKind.PRODUCER: return 'PRODUCER'
      case SpanKind.CONSUMER: return 'CONSUMER'
      default: return 'INTERNAL'
    }
  }

  private collectSpanMetrics(): void {
    // Collect and emit span metrics
    const recentSpans = Array.from(this.completedSpans.values()).filter(span => 
      span.startTime > Date.now() - 300000 // Last 5 minutes
    )

    const metrics = {
      activeSpans: this.activeSpans.size,
      completedSpans: this.completedSpans.size,
      errorRate: recentSpans.length > 0 
        ? recentSpans.filter(s => s.status === 'error').length / recentSpans.length 
        : 0,
      throughput: recentSpans.length / 300, // Per second
      averageDuration: recentSpans.length > 0
        ? recentSpans.reduce((sum, s) => sum + (s.duration || 0), 0) / recentSpans.length
        : 0
    }

    this.emit('metricsCollected', metrics)
  }

  private cleanupOldSpans(): void {
    const cutoffTime = Date.now() - 3600000 // 1 hour ago

    // Clean up completed spans older than 1 hour
    for (const [spanId, span] of this.completedSpans.entries()) {
      if (span.startTime < cutoffTime) {
        this.completedSpans.delete(spanId)
        this.traceMetrics.delete(spanId)
      }
    }

    // Clean up correlation mapping
    for (const [correlationId, spanIds] of this.correlationMap.entries()) {
      const activeSpanIds = spanIds.filter(id => 
        this.activeSpans.has(id) || this.completedSpans.has(id)
      )
      
      if (activeSpanIds.length === 0) {
        this.correlationMap.delete(correlationId)
      } else {
        this.correlationMap.set(correlationId, activeSpanIds)
      }
    }
  }

  private processCompletedSpan(span: CustomSpan): void {
    // Additional processing for completed spans
    // Could include alerting, analysis, etc.
    if (span.duration && span.duration > 10000) { // > 10 seconds
      this.emit('slowSpanDetected', span)
    }
  }

  private getExporterStatus(): Record<string, 'connected' | 'disconnected' | 'error'> {
    // Check exporter status - simplified implementation
    const status: Record<string, 'connected' | 'disconnected' | 'error'> = {}
    
    this.configuration.exporters.forEach(exporter => {
      status[exporter] = 'connected' // Would actually check connection
    })
    
    return status
  }
}