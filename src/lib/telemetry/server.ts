/**
 * Server-Side OpenTelemetry Configuration
 * Only for server-side usage to avoid bundling Node.js dependencies in browser
 */

// Try to import OpenTelemetry packages, but make them optional
let NodeSDK: any = null
let Resource: any = null
let ATTR_SERVICE_NAME: any = null
let ATTR_SERVICE_VERSION: any = null
let getNodeAutoInstrumentations: any = null
let ConsoleSpanExporter: any = null
let PeriodicExportingMetricReader: any = null
let ConsoleMetricExporter: any = null
let trace: any = null
let metrics: any = null
let SpanStatusCode: any = null
let SpanKind: any = null
let AsyncLocalStorageContextManager: any = null
let W3CTraceContextPropagator: any = null

try {
  const sdkNode = require('@opentelemetry/sdk-node')
  NodeSDK = sdkNode.NodeSDK
  
  const resources = require('@opentelemetry/resources')
  Resource = resources.Resource
  
  const semanticConventions = require('@opentelemetry/semantic-conventions')
  ATTR_SERVICE_NAME = semanticConventions.ATTR_SERVICE_NAME
  ATTR_SERVICE_VERSION = semanticConventions.ATTR_SERVICE_VERSION
  
  const autoInstrumentations = require('@opentelemetry/auto-instrumentations-node')
  getNodeAutoInstrumentations = autoInstrumentations.getNodeAutoInstrumentations
  
  const traceBase = require('@opentelemetry/sdk-trace-base')
  ConsoleSpanExporter = traceBase.ConsoleSpanExporter
  
  const sdkMetrics = require('@opentelemetry/sdk-metrics')
  PeriodicExportingMetricReader = sdkMetrics.PeriodicExportingMetricReader
  ConsoleMetricExporter = sdkMetrics.ConsoleMetricExporter
  
  const api = require('@opentelemetry/api')
  trace = api.trace
  metrics = api.metrics
  SpanStatusCode = api.SpanStatusCode
  SpanKind = api.SpanKind
  
  const contextAsyncHooks = require('@opentelemetry/context-async-hooks')
  AsyncLocalStorageContextManager = contextAsyncHooks.AsyncLocalStorageContextManager
  
  const core = require('@opentelemetry/core')
  W3CTraceContextPropagator = core.W3CTraceContextPropagator
} catch (error) {
  console.warn('OpenTelemetry packages not available, using stub implementation:', error.message)
}

// Configuration
const config = {
  serviceName: 'appboardguru',
  serviceVersion: process.env['npm_package_version'] || '1.0.0',
  environment: process.env['NODE_ENV'] || 'development',
  enableConsoleExporter: process.env['NODE_ENV'] === 'development',
  enableOtlpExporter: process.env['NODE_ENV'] === 'production',
  otlpEndpoint: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || 'http://localhost:4318',
  sampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
}

// Initialize OpenTelemetry SDK (server-side only)
export const initializeServerTelemetry = () => {
  if (!NodeSDK || !Resource || !trace || !metrics) {
    console.warn('OpenTelemetry packages not available, skipping telemetry initialization')
    return
  }

  try {
    const sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: config.serviceName,
        [ATTR_SERVICE_VERSION]: config.serviceVersion,
        'deployment.environment': config.environment,
      }),
      
      traceExporter: config.enableConsoleExporter && ConsoleSpanExporter ? new ConsoleSpanExporter() : undefined,
      
      metricReader: PeriodicExportingMetricReader && ConsoleMetricExporter ? new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter(),
        exportIntervalMillis: 30000, // Export metrics every 30 seconds
      }) : undefined,

      instrumentations: getNodeAutoInstrumentations ? [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable filesystem instrumentation for performance
          },
          '@opentelemetry/instrumentation-dns': {
            enabled: false, // Disable DNS instrumentation for performance
          },
        }),
      ] : [],

      contextManager: AsyncLocalStorageContextManager ? new AsyncLocalStorageContextManager() : undefined,
      textMapPropagator: W3CTraceContextPropagator ? new W3CTraceContextPropagator() : undefined,
    })

    sdk.start()
    console.log('Server OpenTelemetry initialized successfully')
    
    // Set up process exit handlers
    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => console.log('OpenTelemetry shut down successfully'))
        .catch((error) => console.log('Error shutting down OpenTelemetry', error))
        .finally(() => process.exit(0))
    })
  } catch (error) {
    console.error('Error initializing server OpenTelemetry:', error)
  }
}

// Server-side telemetry client class
export class ServerTelemetryClient {
  private tracer = trace ? trace.getTracer(config.serviceName, config.serviceVersion) : null
  private meter = metrics ? metrics.getMeter(config.serviceName, config.serviceVersion) : null
  
  // Metrics
  private apiCallsCounter = this.meter ? this.meter.createCounter('api_calls_total', {
    description: 'Total number of API calls'
  }) : null
  
  private apiCallDurationHistogram = this.meter ? this.meter.createHistogram('api_call_duration_ms', {
    description: 'API call duration in milliseconds'
  }) : null
  
  private dbQueryCounter = this.meter ? this.meter.createCounter('db_queries_total', {
    description: 'Total number of database queries'
  }) : null
  
  private dbQueryDurationHistogram = this.meter ? this.meter.createHistogram('db_query_duration_ms', {
    description: 'Database query duration in milliseconds'
  }) : null
  
  private errorCounter = this.meter ? this.meter.createCounter('errors_total', {
    description: 'Total number of errors'
  }) : null
  
  private componentRenderHistogram = this.meter ? this.meter.createHistogram('component_render_duration_ms', {
    description: 'Component render duration in milliseconds'
  }) : null

  // Active users gauge
  private activeUsersGauge = this.meter ? this.meter.createUpDownCounter('active_users', {
    description: 'Number of currently active users'
  }) : null

  /**
   * Start a new span for API call tracking
   */
  startApiSpan(operation: string, attributes?: Record<string, string | number | boolean>) {
    if (!this.tracer || !SpanKind) {
      return { end: () => {}, recordException: () => {}, setStatus: () => {}, setAttributes: () => {} }
    }
    
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
    if (!this.apiCallsCounter || !this.apiCallDurationHistogram) return

    const attributes = {
      route,
      method,
      status_code: statusCode,
      user_id: userId || 'anonymous'
    }

    this.apiCallsCounter.add(1, attributes)
    this.apiCallDurationHistogram.record(duration, attributes)

    // Track errors
    if (statusCode >= 400 && this.errorCounter) {
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

// Global server telemetry client instance
export const serverTelemetry = new ServerTelemetryClient()