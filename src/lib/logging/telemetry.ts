/**
 * OpenTelemetry Integration
 * Distributed tracing and metrics collection
 */

import { Logger } from './logger'

/**
 * Trace context interface
 */
export interface TraceContext {
  traceId: string
  spanId: string
  parentSpanId?: string
  baggage?: Record<string, string>
}

/**
 * Span interface for our telemetry abstraction
 */
export interface Span {
  traceId: string
  spanId: string
  operationName: string
  startTime: number
  endTime?: number
  duration?: number
  tags: Record<string, any>
  logs: Array<{
    timestamp: number
    fields: Record<string, any>
  }>
  status: {
    code: SpanStatusCode
    message?: string
  }
  parentSpanId?: string
}

/**
 * Span status codes
 */
export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2
}

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  HISTOGRAM = 'histogram',
  GAUGE = 'gauge',
  SUMMARY = 'summary'
}

/**
 * Metric interface
 */
export interface Metric {
  name: string
  type: MetricType
  value: number
  labels: Record<string, string>
  timestamp: number
  description?: string
  unit?: string
}

/**
 * Telemetry provider interface
 */
export interface TelemetryProvider {
  createSpan(operationName: string, parentContext?: TraceContext): Span
  finishSpan(span: Span): void
  recordMetric(metric: Metric): void
  extractContext(carrier: any): TraceContext | undefined
  injectContext(context: TraceContext, carrier: any): void
}

/**
 * Simple in-memory telemetry provider for development
 */
class InMemoryTelemetryProvider implements TelemetryProvider {
  private spans: Map<string, Span> = new Map()
  private metrics: Metric[] = []
  private logger = Logger.getLogger('Telemetry')

  createSpan(operationName: string, parentContext?: TraceContext): Span {
    const spanId = this.generateId()
    const traceId = parentContext?.traceId || this.generateId()
    
    const span: Span = {
      traceId,
      spanId,
      operationName,
      startTime: Date.now(),
      tags: {},
      logs: [],
      status: { code: SpanStatusCode.UNSET },
      parentSpanId: parentContext?.spanId
    }

    this.spans.set(spanId, span)
    
    this.logger.debug('Span created', {
      traceId,
      spanId,
      operationName,
      parentSpanId: parentContext?.spanId
    })

    return span
  }

  finishSpan(span: Span): void {
    span.endTime = Date.now()
    span.duration = span.endTime - span.startTime

    this.logger.debug('Span finished', {
      traceId: span.traceId,
      spanId: span.spanId,
      operationName: span.operationName,
      duration: span.duration,
      status: span.status
    })

    // In production, this would send to telemetry backend
    console.log('SPAN:', JSON.stringify(span, null, 2))
  }

  recordMetric(metric: Metric): void {
    this.metrics.push(metric)
    
    this.logger.debug('Metric recorded', {
      name: metric.name,
      type: metric.type,
      value: metric.value,
      labels: metric.labels
    })

    // In production, this would send to metrics backend
    console.log('METRIC:', JSON.stringify(metric, null, 2))
  }

  extractContext(carrier: any): TraceContext | undefined {
    if (!carrier) return undefined

    const traceId = carrier['x-trace-id'] || carrier.traceId
    const spanId = carrier['x-span-id'] || carrier.spanId
    const parentSpanId = carrier['x-parent-span-id'] || carrier.parentSpanId

    if (!traceId || !spanId) return undefined

    return { traceId, spanId, parentSpanId }
  }

  injectContext(context: TraceContext, carrier: any): void {
    if (!carrier) return

    carrier['x-trace-id'] = context.traceId
    carrier['x-span-id'] = context.spanId
    if (context.parentSpanId) {
      carrier['x-parent-span-id'] = context.parentSpanId
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  getSpans(): Span[] {
    return Array.from(this.spans.values())
  }

  getMetrics(): Metric[] {
    return [...this.metrics]
  }

  clear(): void {
    this.spans.clear()
    this.metrics = []
  }
}

/**
 * OpenTelemetry integration (placeholder for real implementation)
 */
class OpenTelemetryProvider implements TelemetryProvider {
  // This would integrate with actual OpenTelemetry SDK
  // For now, fallback to in-memory provider
  private fallback = new InMemoryTelemetryProvider()

  createSpan(operationName: string, parentContext?: TraceContext): Span {
    // TODO: Integrate with OpenTelemetry tracer
    return this.fallback.createSpan(operationName, parentContext)
  }

  finishSpan(span: Span): void {
    // TODO: Integrate with OpenTelemetry tracer
    this.fallback.finishSpan(span)
  }

  recordMetric(metric: Metric): void {
    // TODO: Integrate with OpenTelemetry metrics
    this.fallback.recordMetric(metric)
  }

  extractContext(carrier: any): TraceContext | undefined {
    // TODO: Use OpenTelemetry context propagation
    return this.fallback.extractContext(carrier)
  }

  injectContext(context: TraceContext, carrier: any): void {
    // TODO: Use OpenTelemetry context propagation
    this.fallback.injectContext(context, carrier)
  }
}

/**
 * Telemetry manager
 */
export class TelemetryManager {
  private static instance: TelemetryManager
  private provider: TelemetryProvider
  private activeSpans: Map<string, Span> = new Map()
  private logger = Logger.getLogger('TelemetryManager')

  constructor(provider?: TelemetryProvider) {
    this.provider = provider || (
      process.env.NODE_ENV === 'production' 
        ? new OpenTelemetryProvider()
        : new InMemoryTelemetryProvider()
    )
  }

  static getInstance(): TelemetryManager {
    if (!TelemetryManager.instance) {
      TelemetryManager.instance = new TelemetryManager()
    }
    return TelemetryManager.instance
  }

  /**
   * Start a new span
   */
  startSpan(operationName: string, parentContext?: TraceContext): Span {
    const span = this.provider.createSpan(operationName, parentContext)
    this.activeSpans.set(span.spanId, span)
    return span
  }

  /**
   * Finish a span
   */
  finishSpan(span: Span, status?: SpanStatusCode, message?: string): void {
    span.status.code = status || SpanStatusCode.OK
    if (message) {
      span.status.message = message
    }

    this.provider.finishSpan(span)
    this.activeSpans.delete(span.spanId)
  }

  /**
   * Add tags to a span
   */
  addSpanTags(span: Span, tags: Record<string, any>): void {
    Object.assign(span.tags, tags)
  }

  /**
   * Add log to a span
   */
  addSpanLog(span: Span, fields: Record<string, any>): void {
    span.logs.push({
      timestamp: Date.now(),
      fields
    })
  }

  /**
   * Record a metric
   */
  recordMetric(
    name: string,
    value: number,
    type: MetricType = MetricType.COUNTER,
    labels: Record<string, string> = {},
    description?: string,
    unit?: string
  ): void {
    const metric: Metric = {
      name,
      type,
      value,
      labels,
      timestamp: Date.now(),
      description,
      unit
    }

    this.provider.recordMetric(metric)
  }

  /**
   * Record counter metric
   */
  recordCounter(
    name: string,
    value: number = 1,
    labels: Record<string, string> = {}
  ): void {
    this.recordMetric(name, value, MetricType.COUNTER, labels)
  }

  /**
   * Record histogram metric
   */
  recordHistogram(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    this.recordMetric(name, value, MetricType.HISTOGRAM, labels)
  }

  /**
   * Record gauge metric
   */
  recordGauge(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    this.recordMetric(name, value, MetricType.GAUGE, labels)
  }

  /**
   * Extract trace context from headers
   */
  extractTraceContext(headers: Record<string, string>): TraceContext | undefined {
    return this.provider.extractContext(headers)
  }

  /**
   * Inject trace context into headers
   */
  injectTraceContext(context: TraceContext, headers: Record<string, string>): void {
    this.provider.injectContext(context, headers)
  }

  /**
   * Execute function with tracing
   */
  async withSpan<T>(
    operationName: string,
    fn: (span: Span) => Promise<T>,
    parentContext?: TraceContext
  ): Promise<T> {
    const span = this.startSpan(operationName, parentContext)
    
    try {
      const result = await fn(span)
      this.finishSpan(span, SpanStatusCode.OK)
      return result
    } catch (error) {
      this.addSpanTags(span, { error: true })
      this.addSpanLog(span, {
        event: 'error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      this.finishSpan(span, SpanStatusCode.ERROR, 
        error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Get active spans (for debugging)
   */
  getActiveSpans(): Span[] {
    return Array.from(this.activeSpans.values())
  }
}

/**
 * Telemetry-enhanced logger
 */
export class TracedLogger extends Logger {
  private telemetry = TelemetryManager.getInstance()
  private currentSpan?: Span

  withSpan(span: Span): TracedLogger {
    const cloned = Object.create(this)
    cloned.currentSpan = span
    cloned.withCorrelation(span.traceId)
    return cloned
  }

  trace(message: string, data?: Record<string, any>): void {
    super.trace(message, data)
    if (this.currentSpan) {
      this.telemetry.addSpanLog(this.currentSpan, {
        level: 'trace',
        message,
        data
      })
    }
  }

  debug(message: string, data?: Record<string, any>): void {
    super.debug(message, data)
    if (this.currentSpan) {
      this.telemetry.addSpanLog(this.currentSpan, {
        level: 'debug',
        message,
        data
      })
    }
  }

  info(message: string, data?: Record<string, any>): void {
    super.info(message, data)
    if (this.currentSpan) {
      this.telemetry.addSpanLog(this.currentSpan, {
        level: 'info',
        message,
        data
      })
    }
  }

  warn(message: string, data?: Record<string, any>): void {
    super.warn(message, data)
    if (this.currentSpan) {
      this.telemetry.addSpanLog(this.currentSpan, {
        level: 'warn',
        message,
        data
      })
    }
  }

  error(message: string, error?: Error | Record<string, any>): void {
    super.error(message, error)
    if (this.currentSpan) {
      this.telemetry.addSpanTags(this.currentSpan, { error: true })
      this.telemetry.addSpanLog(this.currentSpan, {
        level: 'error',
        message,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      })
    }
  }
}

/**
 * Performance tracking utilities
 */
export class PerformanceTracker {
  private static telemetry = TelemetryManager.getInstance()

  /**
   * Track HTTP request performance
   */
  static async trackHTTPRequest<T>(
    method: string,
    url: string,
    fn: () => Promise<T>,
    labels: Record<string, string> = {}
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - startTime
      
      this.telemetry.recordHistogram('http_request_duration_ms', duration, {
        method,
        url: new URL(url).pathname,
        status: '2xx',
        ...labels
      })
      
      this.telemetry.recordCounter('http_requests_total', 1, {
        method,
        url: new URL(url).pathname,
        status: '2xx',
        ...labels
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const statusCategory = error instanceof Error && 'statusCode' in error
        ? `${Math.floor((error as any).statusCode / 100)}xx`
        : '5xx'
      
      this.telemetry.recordHistogram('http_request_duration_ms', duration, {
        method,
        url: new URL(url).pathname,
        status: statusCategory,
        ...labels
      })
      
      this.telemetry.recordCounter('http_requests_total', 1, {
        method,
        url: new URL(url).pathname,
        status: statusCategory,
        ...labels
      })
      
      this.telemetry.recordCounter('http_request_errors_total', 1, {
        method,
        url: new URL(url).pathname,
        error_type: error instanceof Error ? error.constructor.name : 'unknown',
        ...labels
      })
      
      throw error
    }
  }

  /**
   * Track database operation performance
   */
  static async trackDatabaseOperation<T>(
    operation: string,
    table: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - startTime
      
      this.telemetry.recordHistogram('database_operation_duration_ms', duration, {
        operation,
        table,
        status: 'success'
      })
      
      this.telemetry.recordCounter('database_operations_total', 1, {
        operation,
        table,
        status: 'success'
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      this.telemetry.recordHistogram('database_operation_duration_ms', duration, {
        operation,
        table,
        status: 'error'
      })
      
      this.telemetry.recordCounter('database_operations_total', 1, {
        operation,
        table,
        status: 'error'
      })
      
      this.telemetry.recordCounter('database_operation_errors_total', 1, {
        operation,
        table,
        error_type: error instanceof Error ? error.constructor.name : 'unknown'
      })
      
      throw error
    }
  }

  /**
   * Track memory usage
   */
  static recordMemoryUsage(labels: Record<string, string> = {}): void {
    const memoryUsage = process.memoryUsage()
    
    this.telemetry.recordGauge('process_memory_rss_bytes', memoryUsage.rss, labels)
    this.telemetry.recordGauge('process_memory_heap_used_bytes', memoryUsage.heapUsed, labels)
    this.telemetry.recordGauge('process_memory_heap_total_bytes', memoryUsage.heapTotal, labels)
    this.telemetry.recordGauge('process_memory_external_bytes', memoryUsage.external, labels)
  }
}

// Default instance
export const telemetry = TelemetryManager.getInstance()
export default telemetry