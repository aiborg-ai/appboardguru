/**
 * OpenTelemetry Configuration
 * Provides distributed tracing, metrics collection, and observability
 */

import { NodeSDK } from '@opentelemetry/sdk-node'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { ConsoleMetricExporter } from '@opentelemetry/sdk-metrics'
import { trace, metrics, SpanStatusCode, SpanKind } from '@opentelemetry/api'
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks'
import { W3CTraceContextPropagator } from '@opentelemetry/core'

// Configuration
const config = {
  serviceName: 'appboardguru',
  serviceVersion: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  enableConsoleExporter: process.env.NODE_ENV === 'development',
  enableOtlpExporter: process.env.NODE_ENV === 'production',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
}

// Initialize OpenTelemetry SDK
export const initializeTelemetry = () => {
  if (typeof window !== 'undefined') {
    // Skip initialization on client-side
    return
  }

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      'deployment.environment': config.environment,
    }),
    
    traceExporter: config.enableConsoleExporter ? new ConsoleSpanExporter() : undefined,
    
    metricReader: new PeriodicExportingMetricReader({
      exporter: new ConsoleMetricExporter(),
      exportIntervalMillis: 30000, // Export metrics every 30 seconds
    }),

    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable filesystem instrumentation for performance
        },
        '@opentelemetry/instrumentation-dns': {
          enabled: false, // Disable DNS instrumentation for performance
        },
      }),
    ],

    contextManager: new AsyncLocalStorageContextManager(),
    textMapPropagator: new W3CTraceContextPropagator(),
  })

  try {
    sdk.start()
    console.log('OpenTelemetry initialized successfully')
    
    // Set up process exit handlers
    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => console.log('OpenTelemetry shut down successfully'))
        .catch((error) => console.log('Error shutting down OpenTelemetry', error))
        .finally(() => process.exit(0))
    })
  } catch (error) {
    console.error('Error initializing OpenTelemetry:', error)
  }
}

// Telemetry client class
export class TelemetryClient {
  private tracer = trace.getTracer(config.serviceName, config.serviceVersion)
  private meter = metrics.getMeter(config.serviceName, config.serviceVersion)
  
  // Metrics
  private apiCallsCounter = this.meter.createCounter('api_calls_total', {
    description: 'Total number of API calls'
  })
  
  private apiCallDurationHistogram = this.meter.createHistogram('api_call_duration_ms', {
    description: 'API call duration in milliseconds'
  })
  
  private dbQueryCounter = this.meter.createCounter('db_queries_total', {
    description: 'Total number of database queries'
  })
  
  private dbQueryDurationHistogram = this.meter.createHistogram('db_query_duration_ms', {
    description: 'Database query duration in milliseconds'
  })
  
  private errorCounter = this.meter.createCounter('errors_total', {
    description: 'Total number of errors'
  })
  
  private componentRenderHistogram = this.meter.createHistogram('component_render_duration_ms', {
    description: 'Component render duration in milliseconds'
  })

  // Active users gauge
  private activeUsersGauge = this.meter.createUpDownCounter('active_users', {
    description: 'Number of currently active users'
  })

  /**
   * Start a new span for API call tracking
   */
  startApiSpan(operation: string, attributes?: Record<string, string | number | boolean>) {
    return this.tracer.startSpan(`api.${operation}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'operation.name': operation,
        'service.name': config.serviceName,
        ...attributes
      }
    })
  }

  /**
   * Start a new span for database operations
   */
  startDatabaseSpan(operation: string, table?: string, attributes?: Record<string, string | number | boolean>) {
    return this.tracer.startSpan(`db.${operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.operation': operation,
        'db.table': table,
        'db.system': 'postgresql',
        ...attributes
      }
    })
  }

  /**
   * Start a new span for external service calls
   */
  startExternalSpan(service: string, operation: string, attributes?: Record<string, string | number | boolean>) {
    return this.tracer.startSpan(`external.${service}.${operation}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'external.service': service,
        'external.operation': operation,
        ...attributes
      }
    })
  }

  /**
   * Track API call metrics
   */
  recordApiCall(route: string, method: string, statusCode: number, duration: number, userId?: string) {
    const attributes = {
      route,
      method,
      status_code: statusCode,
      user_id: userId || 'anonymous'
    }

    this.apiCallsCounter.add(1, attributes)
    this.apiCallDurationHistogram.record(duration, attributes)

    // Track errors
    if (statusCode >= 400) {
      this.errorCounter.add(1, {
        ...attributes,
        error_type: statusCode >= 500 ? 'server_error' : 'client_error'
      })
    }
  }

  /**
   * Track database query metrics
   */
  recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean = true) {
    const attributes = {
      operation,
      table,
      success: success.toString()
    }

    this.dbQueryCounter.add(1, attributes)
    this.dbQueryDurationHistogram.record(duration, attributes)

    if (!success) {
      this.errorCounter.add(1, {
        ...attributes,
        error_type: 'database_error'
      })
    }
  }

  /**
   * Track component render performance
   */
  recordComponentRender(component: string, duration: number) {
    this.componentRenderHistogram.record(duration, {
      component_name: component
    })
  }

  /**
   * Track active users
   */
  recordActiveUsers(count: number) {
    this.activeUsersGauge.add(count - this.getCurrentActiveUsers())
  }

  /**
   * Track custom business metrics
   */
  recordBusinessMetric(name: string, value: number, attributes?: Record<string, string | number>) {
    const metric = this.meter.createCounter(`business_${name}`, {
      description: `Business metric: ${name}`
    })
    metric.add(value, attributes)
  }

  /**
   * Add error to current span
   */
  recordError(error: Error, span?: any) {
    const activeSpan = span || trace.getActiveSpan()
    if (activeSpan) {
      activeSpan.recordException(error)
      activeSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      })
    }
  }

  /**
   * Add custom attributes to current span
   */
  addSpanAttributes(attributes: Record<string, string | number | boolean>) {
    const activeSpan = trace.getActiveSpan()
    if (activeSpan) {
      activeSpan.setAttributes(attributes)
    }
  }

  /**
   * Set span status
   */
  setSpanStatus(status: SpanStatusCode, message?: string) {
    const activeSpan = trace.getActiveSpan()
    if (activeSpan) {
      activeSpan.setStatus({ code: status, message })
    }
  }

  /**
   * Get current active users count (placeholder - implement actual logic)
   */
  private getCurrentActiveUsers(): number {
    // TODO: Implement actual active user tracking
    return 0
  }
}

// Global telemetry client instance
export const telemetry = new TelemetryClient()

/**
 * Middleware wrapper for API routes with telemetry
 */
export function withTelemetry<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  operationName: string
): T {
  return (async (...args: Parameters<T>) => {
    const span = telemetry.startApiSpan(operationName)
    const startTime = Date.now()
    
    try {
      const result = await handler(...args)
      const duration = Date.now() - startTime
      
      // Extract request details if available
      const request = args[0] as Request
      const method = request?.method || 'UNKNOWN'
      const url = request?.url || ''
      const route = new URL(url).pathname
      
      const status = result.status || 200
      
      telemetry.recordApiCall(route, method, status, duration)
      telemetry.setSpanStatus(status >= 400 ? SpanStatusCode.ERROR : SpanStatusCode.OK)
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      telemetry.recordError(error as Error, span)
      
      // Extract request details for error tracking
      const request = args[0] as Request
      const method = request?.method || 'UNKNOWN'
      const url = request?.url || ''
      const route = new URL(url).pathname
      
      telemetry.recordApiCall(route, method, 500, duration)
      throw error
    } finally {
      span.end()
    }
  }) as T
}

/**
 * Database query wrapper with telemetry
 */
export function withDatabaseTelemetry<T extends (...args: any[]) => Promise<any>>(
  queryFn: T,
  operation: string,
  table: string
): T {
  return (async (...args: Parameters<T>) => {
    const span = telemetry.startDatabaseSpan(operation, table)
    const startTime = Date.now()
    
    try {
      const result = await queryFn(...args)
      const duration = Date.now() - startTime
      
      telemetry.recordDatabaseQuery(operation, table, duration, true)
      telemetry.setSpanStatus(SpanStatusCode.OK)
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      telemetry.recordDatabaseQuery(operation, table, duration, false)
      telemetry.recordError(error as Error, span)
      throw error
    } finally {
      span.end()
    }
  }) as T
}

/**
 * External service call wrapper with telemetry
 */
export function withExternalServiceTelemetry<T extends (...args: any[]) => Promise<any>>(
  serviceFn: T,
  serviceName: string,
  operation: string
): T {
  return (async (...args: Parameters<T>) => {
    const span = telemetry.startExternalSpan(serviceName, operation)
    const startTime = Date.now()
    
    try {
      const result = await serviceFn(...args)
      telemetry.setSpanStatus(SpanStatusCode.OK)
      return result
    } catch (error) {
      telemetry.recordError(error as Error, span)
      throw error
    } finally {
      span.end()
    }
  }) as T
}

// React hook for component performance tracking
export function useComponentTelemetry(componentName: string) {
  if (typeof window === 'undefined') return

  const startTime = Date.now()

  React.useEffect(() => {
    const duration = Date.now() - startTime
    telemetry.recordComponentRender(componentName, duration)
  }, [componentName, startTime])
}

// Import React for the hook
import React from 'react'