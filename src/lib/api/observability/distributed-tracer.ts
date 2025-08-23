/**
 * Distributed Tracer - OpenTelemetry-compatible distributed tracing
 * Provides request tracing, span management, and trace correlation
 */

import { MetricsConfig } from './metrics-collector'

export interface TraceSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  operationName: string
  startTime: number
  endTime?: number
  duration?: number
  status: 'ok' | 'error' | 'timeout'
  tags: Record<string, string | number | boolean>
  logs: Array<{
    timestamp: number
    fields: Record<string, any>
  }>
}

export interface TraceContext {
  traceId: string
  spanId: string
  parentSpanId?: string
  baggage: Record<string, string>
}

export class DistributedTracer {
  private activeTraces: Map<string, TraceSpan[]> = new Map()
  private activeSpans: Map<string, TraceSpan> = new Map()
  private config: MetricsConfig
  private sampleRate: number
  private exportUrl?: string
  private exportBatch: TraceSpan[] = []
  private exportTimer?: NodeJS.Timeout

  constructor(config: MetricsConfig, exportUrl?: string) {
    this.config = config
    this.sampleRate = config.tracingSampleRate || 0.1
    this.exportUrl = exportUrl
    
    if (config.enableTracing) {
      this.startExportTimer()
    }
  }

  /**
   * Start a new trace
   */
  startTrace(operationName: string, parentContext?: TraceContext): string {
    if (!this.config.enableTracing) {
      return this.generateTraceId() // Return dummy ID if tracing disabled
    }

    // Sampling decision
    if (Math.random() > this.sampleRate) {
      return this.generateTraceId() // Return dummy ID if not sampled
    }

    const traceId = parentContext?.traceId || this.generateTraceId()
    const spanId = this.generateSpanId()
    const parentSpanId = parentContext?.spanId

    const span: TraceSpan = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: Date.now(),
      status: 'ok',
      tags: {
        'component': 'api-gateway',
        'span.kind': 'server'
      },
      logs: []
    }

    // Store span
    this.activeSpans.set(spanId, span)
    
    // Add to trace
    if (!this.activeTraces.has(traceId)) {
      this.activeTraces.set(traceId, [])
    }
    this.activeTraces.get(traceId)!.push(span)

    return spanId
  }

  /**
   * Start a child span
   */
  startChildSpan(operationName: string, parentSpanId: string): string {
    if (!this.config.enableTracing) {
      return this.generateSpanId()
    }

    const parentSpan = this.activeSpans.get(parentSpanId)
    if (!parentSpan) {
      console.warn(`Parent span ${parentSpanId} not found`)
      return this.startTrace(operationName)
    }

    const spanId = this.generateSpanId()
    
    const childSpan: TraceSpan = {
      traceId: parentSpan.traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: Date.now(),
      status: 'ok',
      tags: {
        'component': 'api-gateway',
        'span.kind': 'internal'
      },
      logs: []
    }

    this.activeSpans.set(spanId, childSpan)
    this.activeTraces.get(parentSpan.traceId)!.push(childSpan)

    return spanId
  }

  /**
   * End a trace/span
   */
  endTrace(spanId: string, status: 'ok' | 'error' | 'timeout' = 'ok'): void {
    if (!this.config.enableTracing) return

    const span = this.activeSpans.get(spanId)
    if (!span) {
      console.warn(`Span ${spanId} not found`)
      return
    }

    span.endTime = Date.now()
    span.duration = span.endTime - span.startTime
    span.status = status

    // Remove from active spans
    this.activeSpans.delete(spanId)

    // Add to export batch
    this.exportBatch.push(span)

    // If this was the root span, consider the trace complete
    if (!span.parentSpanId) {
      this.finalizeTrace(span.traceId)
    }
  }

  /**
   * Add tags to a span
   */
  addTags(spanId: string, tags: Record<string, string | number | boolean>): void {
    if (!this.config.enableTracing) return

    const span = this.activeSpans.get(spanId)
    if (span) {
      Object.assign(span.tags, tags)
    }
  }

  /**
   * Add a log entry to a span
   */
  addLog(spanId: string, fields: Record<string, any>): void {
    if (!this.config.enableTracing) return

    const span = this.activeSpans.get(spanId)
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        fields
      })
    }
  }

  /**
   * Set span status
   */
  setStatus(spanId: string, status: 'ok' | 'error' | 'timeout'): void {
    if (!this.config.enableTracing) return

    const span = this.activeSpans.get(spanId)
    if (span) {
      span.status = status
    }
  }

  /**
   * Extract trace context from headers
   */
  extractTraceContext(headers: Record<string, string>): TraceContext | null {
    // Support both standard and custom trace headers
    const traceId = headers['x-trace-id'] || 
                   headers['traceparent']?.split('-')[1] ||
                   headers['x-b3-traceid']

    const spanId = headers['x-span-id'] ||
                  headers['traceparent']?.split('-')[2] ||
                  headers['x-b3-spanid']

    const parentSpanId = headers['x-parent-span-id'] ||
                        headers['x-b3-parentspanid']

    if (!traceId) return null

    return {
      traceId,
      spanId: spanId || this.generateSpanId(),
      parentSpanId,
      baggage: this.extractBaggage(headers)
    }
  }

  /**
   * Inject trace context into headers
   */
  injectTraceContext(spanId: string): Record<string, string> {
    const span = this.activeSpans.get(spanId)
    if (!span) return {}

    return {
      'x-trace-id': span.traceId,
      'x-span-id': span.spanId,
      'x-parent-span-id': span.parentSpanId || '',
      'traceparent': this.formatTraceparent(span),
      'x-b3-traceid': span.traceId,
      'x-b3-spanid': span.spanId,
      'x-b3-parentspanid': span.parentSpanId || ''
    }
  }

  /**
   * Get trace information
   */
  getTrace(traceId: string): TraceSpan[] | null {
    return this.activeTraces.get(traceId) || null
  }

  /**
   * Get span information
   */
  getSpan(spanId: string): TraceSpan | null {
    return this.activeSpans.get(spanId) || null
  }

  /**
   * Get all active traces
   */
  getActiveTraces(): Record<string, TraceSpan[]> {
    const traces: Record<string, TraceSpan[]> = {}
    this.activeTraces.forEach((spans, traceId) => {
      traces[traceId] = spans
    })
    return traces
  }

  /**
   * Get tracing statistics
   */
  getStats(): {
    activeTraces: number
    activeSpans: number
    exportedSpans: number
    sampleRate: number
    enabled: boolean
  } {
    return {
      activeTraces: this.activeTraces.size,
      activeSpans: this.activeSpans.size,
      exportedSpans: this.exportBatch.length,
      sampleRate: this.sampleRate,
      enabled: this.config.enableTracing
    }
  }

  /**
   * Export traces in Jaeger format
   */
  exportJaegerFormat(): any[] {
    const jaegerSpans: any[] = []
    
    this.exportBatch.forEach(span => {
      const jaegerSpan = {
        traceID: span.traceId,
        spanID: span.spanId,
        parentSpanID: span.parentSpanId || '',
        operationName: span.operationName,
        startTime: span.startTime * 1000, // Jaeger expects microseconds
        duration: (span.duration || 0) * 1000,
        tags: Object.entries(span.tags).map(([key, value]) => ({
          key,
          type: typeof value === 'string' ? 'string' : 
                typeof value === 'number' ? 'number' : 'bool',
          value: String(value)
        })),
        logs: span.logs.map(log => ({
          timestamp: log.timestamp * 1000,
          fields: Object.entries(log.fields).map(([key, value]) => ({
            key,
            value: String(value)
          }))
        })),
        process: {
          serviceName: 'api-gateway',
          tags: [
            { key: 'hostname', value: process.env.HOSTNAME || 'localhost' },
            { key: 'ip', value: '127.0.0.1' },
            { key: 'jaeger.version', value: '1.0.0' }
          ]
        }
      }
      
      jaegerSpans.push(jaegerSpan)
    })

    return jaegerSpans
  }

  /**
   * Export traces in OpenTelemetry format
   */
  exportOpenTelemetryFormat(): any {
    const resourceSpans = {
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: 'api-gateway' } },
          { key: 'service.version', value: { stringValue: '1.0.0' } },
          { key: 'deployment.environment', value: { stringValue: process.env.NODE_ENV || 'development' } }
        ]
      },
      instrumentationLibrarySpans: [{
        instrumentationLibrary: {
          name: 'api-gateway-tracer',
          version: '1.0.0'
        },
        spans: this.exportBatch.map(span => ({
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId,
          name: span.operationName,
          kind: this.getSpanKind(span.tags['span.kind'] as string),
          startTimeUnixNano: span.startTime * 1000000,
          endTimeUnixNano: (span.endTime || span.startTime) * 1000000,
          attributes: Object.entries(span.tags).map(([key, value]) => ({
            key,
            value: this.formatOtelValue(value)
          })),
          events: span.logs.map(log => ({
            timeUnixNano: log.timestamp * 1000000,
            name: log.fields.event || 'log',
            attributes: Object.entries(log.fields).map(([key, value]) => ({
              key,
              value: this.formatOtelValue(value)
            }))
          })),
          status: {
            code: span.status === 'ok' ? 1 : 2,
            message: span.status === 'ok' ? 'OK' : 'ERROR'
          }
        }))
      }]
    }

    return {
      resourceSpans: [resourceSpans]
    }
  }

  /**
   * Clear old traces and spans
   */
  cleanup(maxAge: number = 3600000): void { // Default 1 hour
    const cutoff = Date.now() - maxAge
    
    // Clean up old traces
    for (const [traceId, spans] of this.activeTraces.entries()) {
      const oldestSpan = Math.min(...spans.map(s => s.startTime))
      if (oldestSpan < cutoff) {
        this.activeTraces.delete(traceId)
      }
    }

    // Clean up old active spans
    for (const [spanId, span] of this.activeSpans.entries()) {
      if (span.startTime < cutoff) {
        this.activeSpans.delete(spanId)
      }
    }
  }

  /**
   * Start export timer for batching
   */
  private startExportTimer(): void {
    this.exportTimer = setInterval(() => {
      if (this.exportBatch.length > 0) {
        this.flushExports()
      }
    }, 10000) // Export every 10 seconds
  }

  /**
   * Flush export batch
   */
  private async flushExports(): Promise<void> {
    if (this.exportBatch.length === 0) return

    try {
      if (this.exportUrl) {
        await this.exportToEndpoint(this.exportBatch)
      } else {
        // Log to console if no export endpoint
        console.log('Trace export:', JSON.stringify(this.exportOpenTelemetryFormat(), null, 2))
      }
      
      this.exportBatch = []
    } catch (error) {
      console.error('Failed to export traces:', error)
      // Keep traces for retry (with limit)
      if (this.exportBatch.length > 1000) {
        this.exportBatch = this.exportBatch.slice(-500) // Keep last 500
      }
    }
  }

  /**
   * Export to external endpoint
   */
  private async exportToEndpoint(spans: TraceSpan[]): Promise<void> {
    if (!this.exportUrl) return

    const payload = this.exportOpenTelemetryFormat()
    
    const response = await fetch(this.exportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`)
    }
  }

  private finalizeTrace(traceId: string): void {
    // Mark trace as complete and ready for export
    const spans = this.activeTraces.get(traceId)
    if (spans) {
      // All spans in the trace are now in exportBatch
      this.activeTraces.delete(traceId)
    }
  }

  private generateTraceId(): string {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  private generateSpanId(): string {
    return Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  private extractBaggage(headers: Record<string, string>): Record<string, string> {
    const baggage: Record<string, string> = {}
    
    // Extract from baggage header (W3C format)
    const baggageHeader = headers['baggage']
    if (baggageHeader) {
      baggageHeader.split(',').forEach(item => {
        const [key, value] = item.trim().split('=')
        if (key && value) {
          baggage[key] = decodeURIComponent(value)
        }
      })
    }
    
    // Extract from custom headers
    Object.entries(headers).forEach(([key, value]) => {
      if (key.startsWith('x-baggage-')) {
        const baggageKey = key.substring(10) // Remove 'x-baggage-' prefix
        baggage[baggageKey] = value
      }
    })
    
    return baggage
  }

  private formatTraceparent(span: TraceSpan): string {
    const version = '00'
    const traceId = span.traceId.padStart(32, '0')
    const spanId = span.spanId.padStart(16, '0')
    const flags = '01' // Sampled
    
    return `${version}-${traceId}-${spanId}-${flags}`
  }

  private getSpanKind(kind: string): number {
    switch (kind) {
      case 'internal': return 1
      case 'server': return 2
      case 'client': return 3
      case 'producer': return 4
      case 'consumer': return 5
      default: return 0 // UNSPECIFIED
    }
  }

  private formatOtelValue(value: string | number | boolean): any {
    if (typeof value === 'string') {
      return { stringValue: value }
    } else if (typeof value === 'number') {
      return Number.isInteger(value) ? { intValue: value } : { doubleValue: value }
    } else if (typeof value === 'boolean') {
      return { boolValue: value }
    } else {
      return { stringValue: String(value) }
    }
  }
}