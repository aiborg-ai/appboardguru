/**
 * Advanced Metrics Collection System
 * Comprehensive metrics with Prometheus, custom metrics, and real-time monitoring
 */

import { EventEmitter } from 'events'
import { createPrometheusRegistry, register } from 'prom-client'
import { 
  Counter, 
  Gauge, 
  Histogram, 
  Summary,
  collectDefaultMetrics,
  register as defaultRegister
} from 'prom-client'
import { z } from 'zod'
import { Result, success, failure } from '../patterns/result'
import { nanoid } from 'nanoid'

// Metrics schemas
export const MetricDefinitionSchema = z.object({
  name: z.string(),
  type: z.enum(['counter', 'gauge', 'histogram', 'summary']),
  help: z.string(),
  labelNames: z.array(z.string()).optional(),
  buckets: z.array(z.number()).optional(),
  percentiles: z.array(z.number()).optional()
})

export const MetricConfigSchema = z.object({
  enablePrometheus: z.boolean(),
  enableCustomMetrics: z.boolean(),
  collectionInterval: z.number(),
  retentionPeriod: z.number(),
  exportEndpoint: z.string().optional()
})

// Core interfaces
export interface MetricDefinition {
  name: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary'
  help: string
  labelNames?: string[]
  buckets?: number[]
  percentiles?: number[]
}

export interface MetricValue {
  name: string
  value: number
  labels: Record<string, string>
  timestamp: number
  type: 'counter' | 'gauge' | 'histogram' | 'summary'
}

export interface MetricSeries {
  name: string
  type: string
  values: Array<{
    value: number
    timestamp: number
    labels: Record<string, string>
  }>
}

export interface MetricsConfiguration {
  enablePrometheus: boolean
  enableCustomMetrics: boolean
  collectionInterval: number // milliseconds
  retentionPeriod: number // hours
  exportEndpoint?: string
  defaultLabels: Record<string, string>
}

export interface MetricAggregation {
  metric: string
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'
  timeWindow: string // e.g., '5m', '1h', '1d'
  groupBy?: string[]
}

export interface Alert {
  id: string
  name: string
  metric: string
  condition: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte'
  threshold: number
  timeWindow: string
  labels?: Record<string, string>
  isActive: boolean
  lastTriggered?: string
}

export interface MetricDashboard {
  id: string
  name: string
  panels: DashboardPanel[]
  refreshInterval: number
  timeRange: string
}

export interface DashboardPanel {
  id: string
  title: string
  type: 'line' | 'bar' | 'gauge' | 'table' | 'stat'
  queries: MetricQuery[]
  position: { x: number; y: number; w: number; h: number }
}

export interface MetricQuery {
  metric: string
  aggregation?: MetricAggregation
  filters?: Record<string, string>
  timeRange?: string
}

/**
 * Advanced Metrics Manager
 */
export class AdvancedMetricsManager extends EventEmitter {
  private prometheusRegistry = createPrometheusRegistry()
  private customMetrics: Map<string, any> = new Map()
  private metricDefinitions: Map<string, MetricDefinition> = new Map()
  private metricValues: Map<string, MetricValue[]> = new Map()
  private alerts: Map<string, Alert> = new Map()
  private dashboards: Map<string, MetricDashboard> = new Map()
  private configuration: MetricsConfiguration
  private collectionTimer?: NodeJS.Timeout

  // Predefined metrics
  private httpRequestsTotal: Counter<string>
  private httpRequestDuration: Histogram<string>
  private httpRequestsInFlight: Gauge<string>
  private dbConnectionsActive: Gauge<string>
  private dbQueryDuration: Histogram<string>
  private cacheHitRate: Gauge<string>
  private apiErrorsTotal: Counter<string>
  private systemCpuUsage: Gauge<string>
  private systemMemoryUsage: Gauge<string>
  private customBusinessMetrics: Map<string, Counter<string> | Gauge<string> | Histogram<string>>

  constructor(config: MetricsConfiguration) {
    super()
    this.configuration = config
    this.customBusinessMetrics = new Map()
    this.setupPrometheusMetrics()
    this.setupDefaultMetrics()
    this.startMetricsCollection()
  }

  /**
   * Initialize metrics system
   */
  async initialize(): Promise<Result<void, string>> {
    try {
      if (this.configuration.enablePrometheus) {
        // Collect default Node.js metrics
        collectDefaultMetrics({
          register: this.prometheusRegistry,
          labels: this.configuration.defaultLabels
        })
      }

      // Setup custom metrics collection
      if (this.configuration.enableCustomMetrics) {
        this.setupCustomMetrics()
      }

      // Setup alerts monitoring
      this.setupAlertsMonitoring()

      this.emit('metricsInitialized', this.configuration)
      return success(undefined)

    } catch (error) {
      return failure(`Metrics initialization failed: ${(error as Error).message}`)
    }
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    userAgent?: string
  ): void {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
      user_agent: userAgent || 'unknown'
    }

    this.httpRequestsTotal.inc(labels)
    this.httpRequestDuration.observe(labels, duration / 1000) // Convert to seconds

    this.emit('httpRequestRecorded', { method, route, statusCode, duration })
  }

  /**
   * Record database metrics
   */
  recordDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean
  ): void {
    const labels = {
      operation,
      table,
      status: success ? 'success' : 'error'
    }

    this.dbQueryDuration.observe(labels, duration / 1000)

    if (!success) {
      this.apiErrorsTotal.inc({ type: 'database_error', operation })
    }

    this.emit('databaseOperationRecorded', { operation, table, duration, success })
  }

  /**
   * Record cache metrics
   */
  recordCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key?: string): void {
    if (operation === 'hit' || operation === 'miss') {
      // Update hit rate (simplified calculation)
      const currentHitRate = this.cacheHitRate.get() || 0
      const newHitRate = operation === 'hit' 
        ? Math.min(currentHitRate + 0.01, 1.0)
        : Math.max(currentHitRate - 0.01, 0.0)
      
      this.cacheHitRate.set(newHitRate)
    }

    this.emit('cacheOperationRecorded', { operation, key })
  }

  /**
   * Record authentication metrics
   */
  recordAuthenticationEvent(
    event: 'login_success' | 'login_failure' | 'logout' | 'token_refresh',
    userId?: string,
    method?: string
  ): void {
    const authMetric = this.getOrCreateCounter('auth_events_total', 'Total authentication events', [
      'event_type',
      'method',
      'user_id'
    ])

    authMetric.inc({
      event_type: event,
      method: method || 'unknown',
      user_id: userId || 'anonymous'
    })

    this.emit('authenticationEventRecorded', { event, userId, method })
  }

  /**
   * Record authorization metrics
   */
  recordAuthorizationCheck(
    userId: string,
    resource: string,
    action: string,
    allowed: boolean,
    duration: number,
    cached: boolean
  ): void {
    const authzMetric = this.getOrCreateCounter('authz_checks_total', 'Total authorization checks', [
      'user_id',
      'resource',
      'action',
      'result',
      'cached'
    ])

    const authzDuration = this.getOrCreateHistogram('authz_check_duration_seconds', 'Authorization check duration', [
      'resource',
      'action',
      'cached'
    ])

    authzMetric.inc({
      user_id: userId,
      resource,
      action,
      result: allowed ? 'allowed' : 'denied',
      cached: cached.toString()
    })

    authzDuration.observe({
      resource,
      action,
      cached: cached.toString()
    }, duration / 1000)

    this.emit('authorizationCheckRecorded', { userId, resource, action, allowed, duration, cached })
  }

  /**
   * Record security event metrics
   */
  recordSecurityEvent(
    eventType: string,
    severity: string,
    riskScore: number
  ): void {
    const securityMetric = this.getOrCreateCounter('security_events_total', 'Total security events', [
      'event_type',
      'severity'
    ])

    const riskScoreGauge = this.getOrCreateGauge('security_risk_score', 'Current security risk score')

    securityMetric.inc({
      event_type: eventType,
      severity
    })

    riskScoreGauge.set(riskScore)

    this.emit('securityEventRecorded', { eventType, severity, riskScore })
  }

  /**
   * Record encryption operation metrics
   */
  recordEncryptionOperation(
    operation: 'encrypt' | 'decrypt',
    keyId: string,
    dataSize: number
  ): void {
    const encryptionMetric = this.getOrCreateCounter('encryption_operations_total', 'Total encryption operations', [
      'operation',
      'key_id'
    ])

    const dataSizeHistogram = this.getOrCreateHistogram('encryption_data_size_bytes', 'Size of data encrypted/decrypted', [
      'operation'
    ], [1024, 10240, 102400, 1048576, 10485760]) // 1KB to 10MB buckets

    encryptionMetric.inc({
      operation,
      key_id: keyId
    })

    dataSizeHistogram.observe({ operation }, dataSize)

    this.emit('encryptionOperationRecorded', { operation, keyId, dataSize })
  }

  /**
   * Record tokenization metrics
   */
  recordTokenization(operation: 'tokenize' | 'detokenize', dataLength: number): void {
    const tokenizationMetric = this.getOrCreateCounter('tokenization_operations_total', 'Total tokenization operations', [
      'operation'
    ])

    tokenizationMetric.inc({ operation })

    this.emit('tokenizationRecorded', { operation, dataLength })
  }

  /**
   * Record audit event metrics
   */
  recordAuditEvent(
    category: string,
    severity: string,
    outcome: string
  ): void {
    const auditMetric = this.getOrCreateCounter('audit_events_total', 'Total audit events', [
      'category',
      'severity',
      'outcome'
    ])

    auditMetric.inc({
      category,
      severity,
      outcome
    })

    this.emit('auditEventRecorded', { category, severity, outcome })
  }

  /**
   * Record projection event metrics
   */
  recordProjectionEvent(
    projectionName: string,
    eventType: string,
    status: 'success' | 'failure'
  ): void {
    const projectionMetric = this.getOrCreateCounter('projection_events_total', 'Total projection events processed', [
      'projection_name',
      'event_type',
      'status'
    ])

    projectionMetric.inc({
      projection_name: projectionName,
      event_type: eventType,
      status
    })

    this.emit('projectionEventRecorded', { projectionName, eventType, status })
  }

  /**
   * Record command execution metrics
   */
  recordCommandExecution(
    commandType: string,
    status: 'success' | 'failure' | 'error',
    duration: number
  ): void {
    const commandMetric = this.getOrCreateCounter('commands_executed_total', 'Total commands executed', [
      'command_type',
      'status'
    ])

    const commandDuration = this.getOrCreateHistogram('command_duration_seconds', 'Command execution duration', [
      'command_type',
      'status'
    ])

    commandMetric.inc({
      command_type: commandType,
      status
    })

    commandDuration.observe({
      command_type: commandType,
      status
    }, duration / 1000)

    this.emit('commandExecutionRecorded', { commandType, status, duration })
  }

  /**
   * Record query execution metrics
   */
  recordQueryExecution(
    queryType: string,
    status: 'success' | 'failure' | 'error',
    duration: number
  ): void {
    const queryMetric = this.getOrCreateCounter('queries_executed_total', 'Total queries executed', [
      'query_type',
      'status'
    ])

    const queryDuration = this.getOrCreateHistogram('query_duration_seconds', 'Query execution duration', [
      'query_type',
      'status'
    ])

    queryMetric.inc({
      query_type: queryType,
      status
    })

    queryDuration.observe({
      query_type: queryType,
      status
    }, duration / 1000)

    this.emit('queryExecutionRecorded', { queryType, status, duration })
  }

  /**
   * Record batch query execution metrics
   */
  recordQueryBatchExecution(
    totalQueries: number,
    successCount: number,
    errorCount: number,
    duration: number
  ): void {
    const batchMetric = this.getOrCreateHistogram('query_batch_size', 'Query batch size distribution')
    const batchDuration = this.getOrCreateHistogram('query_batch_duration_seconds', 'Query batch execution duration')

    batchMetric.observe(totalQueries)
    batchDuration.observe(duration / 1000)

    if (errorCount > 0) {
      const errorRate = this.getOrCreateGauge('query_batch_error_rate', 'Query batch error rate')
      errorRate.set(errorCount / totalQueries)
    }

    this.emit('queryBatchExecutionRecorded', { totalQueries, successCount, errorCount, duration })
  }

  /**
   * Record WebSocket connection metrics
   */
  recordWebSocketConnection(connectionId: string, event: 'connected' | 'disconnected'): void {
    const wsMetric = this.getOrCreateGauge('websocket_connections_active', 'Active WebSocket connections')
    
    if (event === 'connected') {
      wsMetric.inc()
    } else {
      wsMetric.dec()
    }

    this.emit('webSocketConnectionRecorded', { connectionId, event })
  }

  /**
   * Record WebSocket message metrics
   */
  recordWebSocketMessage(connectionId: string, messageType: string): void {
    const messageMetric = this.getOrCreateCounter('websocket_messages_total', 'Total WebSocket messages', [
      'message_type'
    ])

    messageMetric.inc({ message_type: messageType })

    this.emit('webSocketMessageRecorded', { connectionId, messageType })
  }

  /**
   * Record subscription event metrics
   */
  recordSubscriptionEvent(trigger: string, payload: any): void {
    const subscriptionMetric = this.getOrCreateCounter('subscription_events_total', 'Total subscription events', [
      'trigger'
    ])

    subscriptionMetric.inc({ trigger })

    this.emit('subscriptionEventRecorded', { trigger, payload })
  }

  /**
   * Record event routing metrics
   */
  recordEventRouting(eventType: string, routeCount: number, hasError: boolean): void {
    const routingMetric = this.getOrCreateCounter('event_routing_total', 'Total event routing operations', [
      'event_type',
      'status'
    ])

    const routeCountGauge = this.getOrCreateGauge('event_routes_matched', 'Number of routes matched per event')

    routingMetric.inc({
      event_type: eventType,
      status: hasError ? 'error' : 'success'
    })

    routeCountGauge.set(routeCount)

    this.emit('eventRoutingRecorded', { eventType, routeCount, hasError })
  }

  /**
   * Record user registration metrics
   */
  recordUserRegistration(userId: string, ipAddress: string): void {
    const registrationMetric = this.getOrCreateCounter('user_registrations_total', 'Total user registrations')
    registrationMetric.inc()

    this.emit('userRegistrationRecorded', { userId, ipAddress })
  }

  /**
   * Record user login metrics
   */
  recordUserLogin(userId: string, ipAddress: string, riskScore: number): void {
    const loginMetric = this.getOrCreateCounter('user_logins_total', 'Total user logins')
    const riskScoreGauge = this.getOrCreateGauge('login_risk_score', 'Login risk score')

    loginMetric.inc()
    riskScoreGauge.set(riskScore)

    this.emit('userLoginRecorded', { userId, ipAddress, riskScore })
  }

  /**
   * Create custom metric
   */
  createMetric(definition: MetricDefinition): Result<void, string> {
    try {
      if (this.metricDefinitions.has(definition.name)) {
        return failure(`Metric ${definition.name} already exists`)
      }

      let metric: any

      switch (definition.type) {
        case 'counter':
          metric = new Counter({
            name: definition.name,
            help: definition.help,
            labelNames: definition.labelNames || [],
            registers: [this.prometheusRegistry]
          })
          break

        case 'gauge':
          metric = new Gauge({
            name: definition.name,
            help: definition.help,
            labelNames: definition.labelNames || [],
            registers: [this.prometheusRegistry]
          })
          break

        case 'histogram':
          metric = new Histogram({
            name: definition.name,
            help: definition.help,
            labelNames: definition.labelNames || [],
            buckets: definition.buckets,
            registers: [this.prometheusRegistry]
          })
          break

        case 'summary':
          metric = new Summary({
            name: definition.name,
            help: definition.help,
            labelNames: definition.labelNames || [],
            percentiles: definition.percentiles || [0.5, 0.9, 0.95, 0.99],
            registers: [this.prometheusRegistry]
          })
          break

        default:
          return failure(`Unsupported metric type: ${definition.type}`)
      }

      this.customMetrics.set(definition.name, metric)
      this.metricDefinitions.set(definition.name, definition)

      this.emit('customMetricCreated', definition)
      return success(undefined)

    } catch (error) {
      return failure(`Failed to create metric: ${(error as Error).message}`)
    }
  }

  /**
   * Get metric value
   */
  async getMetricValue(name: string, labels?: Record<string, string>): Promise<Result<number, string>> {
    try {
      const metric = this.customMetrics.get(name)
      if (!metric) {
        return failure(`Metric ${name} not found`)
      }

      // Get current value (simplified)
      const value = labels ? metric.get(labels) : metric.get()
      return success(value?.value || 0)

    } catch (error) {
      return failure(`Failed to get metric value: ${(error as Error).message}`)
    }
  }

  /**
   * Query metrics with time range
   */
  async queryMetrics(
    name: string,
    timeRange: { start: Date; end: Date },
    labels?: Record<string, string>
  ): Promise<Result<MetricSeries, string>> {
    try {
      // Simplified implementation - would integrate with time series DB
      const storedValues = this.metricValues.get(name) || []
      
      const filteredValues = storedValues.filter(value => {
        const timestamp = new Date(value.timestamp)
        const matchesTime = timestamp >= timeRange.start && timestamp <= timeRange.end
        const matchesLabels = !labels || Object.entries(labels).every(([key, val]) => 
          value.labels[key] === val
        )
        return matchesTime && matchesLabels
      })

      const series: MetricSeries = {
        name,
        type: this.metricDefinitions.get(name)?.type || 'unknown',
        values: filteredValues.map(v => ({
          value: v.value,
          timestamp: v.timestamp,
          labels: v.labels
        }))
      }

      return success(series)

    } catch (error) {
      return failure(`Failed to query metrics: ${(error as Error).message}`)
    }
  }

  /**
   * Create alert
   */
  createAlert(alert: Omit<Alert, 'id' | 'lastTriggered'>): Result<Alert, string> {
    try {
      const fullAlert: Alert = {
        id: nanoid(),
        lastTriggered: undefined,
        ...alert
      }

      this.alerts.set(fullAlert.id, fullAlert)
      this.emit('alertCreated', fullAlert)

      return success(fullAlert)

    } catch (error) {
      return failure(`Failed to create alert: ${(error as Error).message}`)
    }
  }

  /**
   * Get Prometheus metrics export
   */
  async getPrometheusMetrics(): Promise<string> {
    return this.prometheusRegistry.metrics()
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    totalMetrics: number
    customMetrics: number
    activeAlerts: number
    recentValues: number
    systemHealth: 'healthy' | 'degraded' | 'unhealthy'
  } {
    const recentValues = Array.from(this.metricValues.values())
      .reduce((sum, values) => sum + values.filter(v => 
        v.timestamp > Date.now() - 300000 // Last 5 minutes
      ).length, 0)

    // Simplified health calculation
    const systemHealth = recentValues > 0 ? 'healthy' : 'degraded'

    return {
      totalMetrics: this.metricDefinitions.size,
      customMetrics: this.customMetrics.size,
      activeAlerts: Array.from(this.alerts.values()).filter(a => a.isActive).length,
      recentValues,
      systemHealth
    }
  }

  /**
   * Private helper methods
   */
  private setupPrometheusMetrics(): void {
    // HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_agent'],
      registers: [this.prometheusRegistry]
    })

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [this.prometheusRegistry]
    })

    this.httpRequestsInFlight = new Gauge({
      name: 'http_requests_in_flight',
      help: 'Current HTTP requests being processed',
      registers: [this.prometheusRegistry]
    })

    // Database metrics
    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Active database connections',
      registers: [this.prometheusRegistry]
    })

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.prometheusRegistry]
    })

    // Cache metrics
    this.cacheHitRate = new Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate (0-1)',
      registers: [this.prometheusRegistry]
    })

    // Error metrics
    this.apiErrorsTotal = new Counter({
      name: 'api_errors_total',
      help: 'Total API errors',
      labelNames: ['type', 'operation'],
      registers: [this.prometheusRegistry]
    })

    // System metrics
    this.systemCpuUsage = new Gauge({
      name: 'system_cpu_usage_percent',
      help: 'System CPU usage percentage',
      registers: [this.prometheusRegistry]
    })

    this.systemMemoryUsage = new Gauge({
      name: 'system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      registers: [this.prometheusRegistry]
    })
  }

  private setupDefaultMetrics(): void {
    // Additional default metrics specific to our application
    this.createMetric({
      name: 'app_startup_time_seconds',
      type: 'gauge',
      help: 'Application startup time in seconds'
    })

    this.createMetric({
      name: 'app_version_info',
      type: 'gauge',
      help: 'Application version information',
      labelNames: ['version', 'build']
    })
  }

  private setupCustomMetrics(): void {
    // Setup custom business metrics
    // These would be created based on application requirements
  }

  private setupAlertsMonitoring(): void {
    // Monitor alerts every 30 seconds
    setInterval(() => {
      this.checkAlerts()
    }, 30000)
  }

  private startMetricsCollection(): void {
    // Collect system metrics periodically
    this.collectionTimer = setInterval(() => {
      this.collectSystemMetrics()
    }, this.configuration.collectionInterval)

    // Clean up old metric values
    setInterval(() => {
      this.cleanupOldMetrics()
    }, 3600000) // Every hour
  }

  private getOrCreateCounter(name: string, help: string, labelNames: string[] = []): Counter<string> {
    let metric = this.customBusinessMetrics.get(name) as Counter<string>
    
    if (!metric) {
      metric = new Counter({
        name,
        help,
        labelNames,
        registers: [this.prometheusRegistry]
      })
      this.customBusinessMetrics.set(name, metric)
    }
    
    return metric
  }

  private getOrCreateGauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
    let metric = this.customBusinessMetrics.get(name) as Gauge<string>
    
    if (!metric) {
      metric = new Gauge({
        name,
        help,
        labelNames,
        registers: [this.prometheusRegistry]
      })
      this.customBusinessMetrics.set(name, metric)
    }
    
    return metric
  }

  private getOrCreateHistogram(name: string, help: string, labelNames: string[] = [], buckets?: number[]): Histogram<string> {
    let metric = this.customBusinessMetrics.get(name) as Histogram<string>
    
    if (!metric) {
      metric = new Histogram({
        name,
        help,
        labelNames,
        buckets,
        registers: [this.prometheusRegistry]
      })
      this.customBusinessMetrics.set(name, metric)
    }
    
    return metric
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      // Collect CPU usage
      const cpuUsage = process.cpuUsage()
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 / 1000 * 100
      this.systemCpuUsage.set(cpuPercent)

      // Collect memory usage
      const memUsage = process.memoryUsage()
      this.systemMemoryUsage.set(memUsage.heapUsed)

    } catch (error) {
      console.error('Failed to collect system metrics:', error)
    }
  }

  private async checkAlerts(): Promise<void> {
    for (const alert of this.alerts.values()) {
      if (!alert.isActive) continue

      try {
        const shouldTrigger = await this.evaluateAlert(alert)
        
        if (shouldTrigger) {
          alert.lastTriggered = new Date().toISOString()
          this.emit('alertTriggered', alert)
        }
      } catch (error) {
        console.error(`Failed to evaluate alert ${alert.id}:`, error)
      }
    }
  }

  private async evaluateAlert(alert: Alert): Promise<boolean> {
    // Simplified alert evaluation
    try {
      const metricValue = await this.getMetricValue(alert.metric, alert.labels)
      
      if (!metricValue.success) return false

      const value = metricValue.data

      switch (alert.condition) {
        case 'gt': return value > alert.threshold
        case 'gte': return value >= alert.threshold
        case 'lt': return value < alert.threshold
        case 'lte': return value <= alert.threshold
        case 'eq': return value === alert.threshold
        case 'ne': return value !== alert.threshold
        default: return false
      }
    } catch (error) {
      return false
    }
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (this.configuration.retentionPeriod * 60 * 60 * 1000)

    for (const [metricName, values] of this.metricValues.entries()) {
      const filteredValues = values.filter(value => value.timestamp > cutoffTime)
      
      if (filteredValues.length === 0) {
        this.metricValues.delete(metricName)
      } else {
        this.metricValues.set(metricName, filteredValues)
      }
    }
  }
}