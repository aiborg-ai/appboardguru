/**
 * Observability Package Exports
 * Comprehensive monitoring, tracing, metrics, logging, and alerting
 */

// Core observability components
export { AdvancedTracingManager } from './advanced-tracing'
export type { 
  CustomSpan,
  TraceConfiguration,
  TraceExporter,
  SpanEvent,
  TraceContext,
  TraceAnalytics
} from './advanced-tracing'

export { AdvancedMetricsManager } from './advanced-metrics'
export type {
  CustomMetric,
  MetricType,
  MetricConfiguration,
  MetricAggregation,
  AlertRule,
  MetricQuery
} from './advanced-metrics'

export { CentralizedLoggingManager } from './centralized-logging'
export type {
  LogEntry,
  LogLevel,
  LogQuery,
  LogAggregation,
  LogAlert,
  LogProcessor,
  LogShipper
} from './centralized-logging'

export { AdvancedAlertingManager } from './alerting-system'
export type {
  Alert,
  AlertType,
  AlertSeverity,
  AlertStatus,
  AlertCondition,
  AlertAction,
  AlertIncident,
  AnomalyDetectionConfig,
  NotificationChannel
} from './alerting-system'

// Legacy exports for backward compatibility
export { MetricsCollector } from './metrics-collector'
export { DistributedTracer } from './distributed-tracer'

/**
 * Observability Factory
 * Creates and configures observability stack
 */
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { AdvancedTracingManager } from './advanced-tracing'
import { AdvancedMetricsManager } from './advanced-metrics'
import { CentralizedLoggingManager } from './centralized-logging'
import { AdvancedAlertingManager } from './alerting-system'

export interface ObservabilityConfig {
  // Tracing configuration
  tracing: {
    serviceName: string
    version: string
    environment: string
    exporters: Array<'jaeger' | 'zipkin' | 'otlp' | 'console'>
    sampleRate: number
    enableAutoInstrumentation: boolean
  }
  
  // Metrics configuration
  metrics: {
    exportInterval: number
    enableCustomMetrics: boolean
    enableBusinessMetrics: boolean
    prometheusEnabled: boolean
    datadogEnabled: boolean
  }
  
  // Logging configuration
  logging: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
    bufferSize: number
    flushInterval: number
    enableStructuredLogging: boolean
    enableSampling: boolean
    samplingRate: number
    retentionDays: number
    compressionEnabled: boolean
  }
  
  // Alerting configuration
  alerting: {
    evaluationInterval: number
    maxConcurrentEvaluations: number
    defaultEscalationDelay: number
    incidentAutoResolve: boolean
    enableAnomalyDetection: boolean
    notificationRetryAttempts: number
  }
}

export interface ObservabilityStack {
  tracing: AdvancedTracingManager
  metrics: AdvancedMetricsManager
  logging: CentralizedLoggingManager
  alerting: AdvancedAlertingManager
}

/**
 * Create comprehensive observability stack
 */
export async function createObservabilityStack(
  supabase: SupabaseClient<Database>,
  config: ObservabilityConfig
): Promise<ObservabilityStack> {
  // Initialize tracing
  const tracing = new AdvancedTracingManager({
    serviceName: config.tracing.serviceName,
    version: config.tracing.version,
    environment: config.tracing.environment,
    exporters: config.tracing.exporters.map(type => ({
      type,
      config: getExporterConfig(type)
    })),
    sampling: {
      type: 'probability',
      probability: config.tracing.sampleRate
    },
    enableAutoInstrumentation: config.tracing.enableAutoInstrumentation
  })

  // Initialize metrics
  const metrics = new AdvancedMetricsManager({
    exportInterval: config.metrics.exportInterval,
    enableCustomMetrics: config.metrics.enableCustomMetrics,
    enableBusinessMetrics: config.metrics.enableBusinessMetrics,
    exporters: getMetricsExporters(config.metrics)
  })

  // Initialize logging
  const logging = new CentralizedLoggingManager(supabase, {
    bufferSize: config.logging.bufferSize,
    flushInterval: config.logging.flushInterval,
    enableStructuredLogging: config.logging.enableStructuredLogging,
    enableSampling: config.logging.enableSampling,
    samplingRate: config.logging.samplingRate,
    retentionDays: config.logging.retentionDays,
    compressionEnabled: config.logging.compressionEnabled
  })

  // Initialize alerting
  const alerting = new AdvancedAlertingManager(supabase, logging, {
    evaluationInterval: config.alerting.evaluationInterval,
    maxConcurrentEvaluations: config.alerting.maxConcurrentEvaluations,
    defaultEscalationDelay: config.alerting.defaultEscalationDelay,
    incidentAutoResolve: config.alerting.incidentAutoResolve,
    enableAnomalyDetection: config.alerting.enableAnomalyDetection,
    notificationRetryAttempts: config.alerting.notificationRetryAttempts
  })

  // Setup cross-component integrations
  await setupIntegrations({ tracing, metrics, logging, alerting })

  return { tracing, metrics, logging, alerting }
}

/**
 * Setup integrations between observability components
 */
async function setupIntegrations(stack: ObservabilityStack): Promise<void> {
  // Integrate tracing with logging
  stack.tracing.on('spanFinished', (span) => {
    if (span.status?.code === 'ERROR') {
      stack.logging.error(`Span failed: ${span.name}`, {
        traceId: span.traceId,
        spanId: span.spanId,
        duration: span.duration,
        error: span.events.find(e => e.name === 'exception')?.attributes
      })
    }
  })

  // Integrate metrics with alerting
  stack.metrics.on('metricRecorded', async (metric) => {
    // Automatically create alerts for critical metrics
    if (metric.name.includes('error') || metric.name.includes('failure')) {
      // This would create alerts based on metric patterns
    }
  })

  // Integrate logging with alerting
  stack.logging.on('logEntry', async (entry) => {
    if (entry.level === 'error' || entry.level === 'fatal') {
      // Automatically trigger alerts for error logs
      await stack.alerting.evaluateAlert('error_log_alert')
    }
  })

  // Setup health checks
  setInterval(async () => {
    const tracingStats = stack.tracing.getTracingStats()
    const metricsStats = stack.metrics.getMetricsStats()
    const loggingStats = stack.logging.getLoggingStats()
    const alertingStats = stack.alerting.getAlertingStats()

    await stack.logging.info('Observability health check', {
      tracing: tracingStats,
      metrics: metricsStats,
      logging: loggingStats,
      alerting: alertingStats
    })
  }, 60 * 1000) // Every minute
}

/**
 * Get exporter configuration based on type
 */
function getExporterConfig(type: string): Record<string, any> {
  switch (type) {
    case 'jaeger':
      return {
        endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
      }
    case 'zipkin':
      return {
        endpoint: process.env.ZIPKIN_ENDPOINT || 'http://localhost:9411/api/v2/spans'
      }
    case 'otlp':
      return {
        endpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4317'
      }
    case 'console':
      return {}
    default:
      return {}
  }
}

/**
 * Get metrics exporters based on configuration
 */
function getMetricsExporters(config: ObservabilityConfig['metrics']): Array<{ type: string; config: Record<string, any> }> {
  const exporters: Array<{ type: string; config: Record<string, any> }> = []

  if (config.prometheusEnabled) {
    exporters.push({
      type: 'prometheus',
      config: {
        port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
        endpoint: process.env.PROMETHEUS_ENDPOINT || '/metrics'
      }
    })
  }

  if (config.datadogEnabled) {
    exporters.push({
      type: 'datadog',
      config: {
        apiKey: process.env.DATADOG_API_KEY,
        host: process.env.DATADOG_HOST || 'app.datadoghq.com'
      }
    })
  }

  return exporters
}

/**
 * Default observability configuration
 */
export const defaultObservabilityConfig: ObservabilityConfig = {
  tracing: {
    serviceName: 'boardguru-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    exporters: ['console', 'otlp'],
    sampleRate: 0.1,
    enableAutoInstrumentation: true
  },
  metrics: {
    exportInterval: 60000, // 1 minute
    enableCustomMetrics: true,
    enableBusinessMetrics: true,
    prometheusEnabled: true,
    datadogEnabled: !!process.env.DATADOG_API_KEY
  },
  logging: {
    level: 'info',
    bufferSize: 1000,
    flushInterval: 30000, // 30 seconds
    enableStructuredLogging: true,
    enableSampling: false,
    samplingRate: 1.0,
    retentionDays: 30,
    compressionEnabled: true
  },
  alerting: {
    evaluationInterval: 60000, // 1 minute
    maxConcurrentEvaluations: 10,
    defaultEscalationDelay: 300, // 5 minutes
    incidentAutoResolve: true,
    enableAnomalyDetection: true,
    notificationRetryAttempts: 3
  }
}

/**
 * Observability middleware for Next.js
 */
export function createObservabilityMiddleware(stack: ObservabilityStack) {
  return async (request: Request): Promise<Response | undefined> => {
    const startTime = Date.now()
    const traceId = stack.tracing.generateTraceId()
    
    // Start span for request
    const span = stack.tracing.startSpan('http_request', {
      attributes: {
        'http.method': request.method,
        'http.url': request.url,
        'http.user_agent': request.headers.get('user-agent') || '',
        'trace.id': traceId
      }
    })

    try {
      // Log request start
      await stack.logging.info('HTTP request started', {
        method: request.method,
        url: request.url,
        traceId,
        userAgent: request.headers.get('user-agent')
      })

      // Continue to next middleware/handler
      return undefined

    } finally {
      const duration = Date.now() - startTime
      
      // Record metrics
      stack.metrics.recordHttpRequest(
        request.method,
        new URL(request.url).pathname,
        200, // Would be actual status code
        duration
      )

      // Finish span
      span.setAttributes({
        'http.status_code': 200, // Would be actual status code
        'http.response_time': duration
      })
      span.end()

      // Log request completion
      await stack.logging.info('HTTP request completed', {
        method: request.method,
        url: request.url,
        traceId,
        duration,
        statusCode: 200 // Would be actual status code
      })
    }
  }
}