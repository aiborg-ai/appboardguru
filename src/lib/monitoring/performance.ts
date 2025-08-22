/**
 * Performance Monitoring System
 * Comprehensive performance tracking and metrics collection
 */

import { Logger } from '../logging/logger'
import { telemetry, MetricType, Span } from '../logging/telemetry'

/**
 * Performance metric types
 */
export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: Date
  labels: Record<string, string>
  context?: Record<string, any>
}

/**
 * Request performance data
 */
export interface RequestPerformance {
  url: string
  method: string
  statusCode: number
  duration: number
  timestamp: Date
  userAgent?: string
  userId?: string
  organizationId?: string
  correlationId?: string
  error?: string
  memoryUsage: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  cpuUsage: {
    user: number
    system: number
  }
}

/**
 * Database performance data
 */
export interface DatabasePerformance {
  operation: string
  table: string
  duration: number
  rowCount?: number
  error?: string
  timestamp: Date
  query?: string
  correlationId?: string
}

/**
 * External service performance data
 */
export interface ExternalServicePerformance {
  service: string
  endpoint: string
  method: string
  duration: number
  statusCode?: number
  error?: string
  timestamp: Date
  correlationId?: string
  retryCount?: number
}

/**
 * Performance alert configuration
 */
export interface PerformanceAlertConfig {
  metric: string
  threshold: number
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne'
  duration: number // milliseconds
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
}

/**
 * Performance tracker class
 */
export class PerformanceMonitor {
  private logger = Logger.getLogger('PerformanceMonitor')
  private metrics: PerformanceMetric[] = []
  private requestMetrics: RequestPerformance[] = []
  private databaseMetrics: DatabasePerformance[] = []
  private externalServiceMetrics: ExternalServicePerformance[] = []
  private alerts: PerformanceAlertConfig[] = []
  private alertStates = new Map<string, { triggered: boolean; firstTriggered: number }>()

  /**
   * Track HTTP request performance
   */
  async trackRequest<T>(
    request: {
      url: string
      method: string
      userAgent?: string
      userId?: string
      organizationId?: string
      correlationId?: string
    },
    operation: () => Promise<{ result: T; statusCode: number }>
  ): Promise<T> {
    const startTime = Date.now()
    const startMemory = process.memoryUsage()
    const startCpu = process.cpuUsage()

    let statusCode = 500
    let error: string | undefined

    try {
      const { result, statusCode: responseStatusCode } = await operation()
      statusCode = responseStatusCode
      return result
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = Date.now() - startTime
      const endMemory = process.memoryUsage()
      const endCpu = process.cpuUsage(startCpu)

      const performanceData: RequestPerformance = {
        url: request.url,
        method: request.method,
        statusCode,
        duration,
        timestamp: new Date(),
        userAgent: request.userAgent,
        userId: request.userId,
        organizationId: request.organizationId,
        correlationId: request.correlationId,
        error,
        memoryUsage: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal,
          external: endMemory.external - startMemory.external,
          rss: endMemory.rss - startMemory.rss
        },
        cpuUsage: {
          user: endCpu.user,
          system: endCpu.system
        }
      }

      await this.recordRequestPerformance(performanceData)
    }
  }

  /**
   * Track database operation performance
   */
  async trackDatabaseOperation<T>(
    operation: string,
    table: string,
    query: () => Promise<T>,
    options: {
      query?: string
      correlationId?: string
    } = {}
  ): Promise<T> {
    const startTime = Date.now()
    let error: string | undefined
    let result: T

    try {
      result = await query()
      return result
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = Date.now() - startTime

      const performanceData: DatabasePerformance = {
        operation,
        table,
        duration,
        error,
        timestamp: new Date(),
        query: options.query,
        correlationId: options.correlationId,
        rowCount: Array.isArray(result) ? result.length : result ? 1 : 0
      }

      await this.recordDatabasePerformance(performanceData)
    }
  }

  /**
   * Track external service call performance
   */
  async trackExternalService<T>(
    service: string,
    endpoint: string,
    method: string,
    operation: () => Promise<{ result: T; statusCode?: number }>,
    options: {
      correlationId?: string
      retryCount?: number
    } = {}
  ): Promise<T> {
    const startTime = Date.now()
    let statusCode: number | undefined
    let error: string | undefined

    try {
      const { result, statusCode: responseStatusCode } = await operation()
      statusCode = responseStatusCode
      return result
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = Date.now() - startTime

      const performanceData: ExternalServicePerformance = {
        service,
        endpoint,
        method,
        duration,
        statusCode,
        error,
        timestamp: new Date(),
        correlationId: options.correlationId,
        retryCount: options.retryCount
      }

      await this.recordExternalServicePerformance(performanceData)
    }
  }

  /**
   * Record custom performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    labels: Record<string, string> = {},
    context?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      labels,
      context
    }

    this.metrics.push(metric)
    this.checkAlerts(metric)

    // Record to telemetry system
    telemetry.recordMetric(name, value, MetricType.HISTOGRAM, labels)

    // Log if significant
    if (this.isSignificantMetric(metric)) {
      this.logger.info(`Performance metric recorded: ${name}`, {
        value,
        unit,
        labels,
        context
      })
    }
  }

  /**
   * Record request performance
   */
  private async recordRequestPerformance(data: RequestPerformance): Promise<void> {
    this.requestMetrics.push(data)

    // Record telemetry metrics
    const labels = {
      method: data.method,
      status_code: data.statusCode.toString(),
      ...(data.userId && { user_id: data.userId }),
      ...(data.organizationId && { organization_id: data.organizationId })
    }

    telemetry.recordHistogram('http_request_duration_ms', data.duration, labels)
    telemetry.recordCounter('http_requests_total', 1, labels)
    
    if (data.error) {
      telemetry.recordCounter('http_request_errors_total', 1, {
        ...labels,
        error_type: data.error
      })
    }

    // Memory and CPU metrics
    telemetry.recordGauge('request_memory_heap_used_bytes', data.memoryUsage.heapUsed, labels)
    telemetry.recordGauge('request_cpu_user_microseconds', data.cpuUsage.user, labels)
    telemetry.recordGauge('request_cpu_system_microseconds', data.cpuUsage.system, labels)

    // Log performance data
    const logLevel = this.getLogLevelForRequest(data)
    this.logger[logLevel]('HTTP request performance', {
      url: data.url,
      method: data.method,
      statusCode: data.statusCode,
      duration: data.duration,
      memoryDelta: data.memoryUsage.heapUsed,
      correlationId: data.correlationId,
      error: data.error
    })

    // Trim old metrics
    this.trimMetrics()
  }

  /**
   * Record database performance
   */
  private async recordDatabasePerformance(data: DatabasePerformance): Promise<void> {
    this.databaseMetrics.push(data)

    const labels = {
      operation: data.operation,
      table: data.table,
      status: data.error ? 'error' : 'success'
    }

    telemetry.recordHistogram('database_operation_duration_ms', data.duration, labels)
    telemetry.recordCounter('database_operations_total', 1, labels)
    
    if (data.rowCount !== undefined) {
      telemetry.recordHistogram('database_rows_affected', data.rowCount, labels)
    }

    if (data.error) {
      telemetry.recordCounter('database_errors_total', 1, {
        ...labels,
        error_type: data.error
      })
    }

    // Log database performance
    const logLevel = data.duration > 1000 ? 'warn' : 'debug'
    this.logger[logLevel]('Database operation performance', {
      operation: data.operation,
      table: data.table,
      duration: data.duration,
      rowCount: data.rowCount,
      correlationId: data.correlationId,
      error: data.error
    })
  }

  /**
   * Record external service performance
   */
  private async recordExternalServicePerformance(data: ExternalServicePerformance): Promise<void> {
    this.externalServiceMetrics.push(data)

    const labels = {
      service: data.service,
      method: data.method,
      status_code: data.statusCode?.toString() || 'unknown',
      status: data.error ? 'error' : 'success'
    }

    telemetry.recordHistogram('external_service_duration_ms', data.duration, labels)
    telemetry.recordCounter('external_service_requests_total', 1, labels)
    
    if (data.retryCount !== undefined && data.retryCount > 0) {
      telemetry.recordCounter('external_service_retries_total', data.retryCount, labels)
    }

    if (data.error) {
      telemetry.recordCounter('external_service_errors_total', 1, {
        ...labels,
        error_type: data.error
      })
    }

    // Log external service performance
    const logLevel = data.error ? 'warn' : 'debug'
    this.logger[logLevel]('External service performance', {
      service: data.service,
      endpoint: data.endpoint,
      method: data.method,
      duration: data.duration,
      statusCode: data.statusCode,
      correlationId: data.correlationId,
      retryCount: data.retryCount,
      error: data.error
    })
  }

  /**
   * Add performance alert
   */
  addAlert(config: PerformanceAlertConfig): void {
    this.alerts.push(config)
    this.logger.info('Performance alert added', { config })
  }

  /**
   * Remove performance alert
   */
  removeAlert(metric: string): boolean {
    const initialLength = this.alerts.length
    this.alerts = this.alerts.filter(alert => alert.metric !== metric)
    
    if (this.alerts.length < initialLength) {
      this.alertStates.delete(metric)
      this.logger.info('Performance alert removed', { metric })
      return true
    }
    
    return false
  }

  /**
   * Check performance alerts
   */
  private checkAlerts(metric: PerformanceMetric): void {
    for (const alert of this.alerts) {
      if (!alert.enabled || alert.metric !== metric.name) {
        continue
      }

      const triggered = this.evaluateAlert(alert, metric.value)
      const alertKey = alert.metric
      const currentState = this.alertStates.get(alertKey)

      if (triggered && !currentState?.triggered) {
        // Alert triggered
        this.alertStates.set(alertKey, {
          triggered: true,
          firstTriggered: Date.now()
        })

        this.sendPerformanceAlert(alert, metric, 'triggered')
      } else if (!triggered && currentState?.triggered) {
        // Alert resolved
        this.alertStates.set(alertKey, {
          triggered: false,
          firstTriggered: 0
        })

        this.sendPerformanceAlert(alert, metric, 'resolved')
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlert(alert: PerformanceAlertConfig, value: number): boolean {
    switch (alert.operator) {
      case 'gt': return value > alert.threshold
      case 'lt': return value < alert.threshold
      case 'gte': return value >= alert.threshold
      case 'lte': return value <= alert.threshold
      case 'eq': return value === alert.threshold
      case 'ne': return value !== alert.threshold
      default: return false
    }
  }

  /**
   * Send performance alert
   */
  private sendPerformanceAlert(
    alert: PerformanceAlertConfig,
    metric: PerformanceMetric,
    status: 'triggered' | 'resolved'
  ): void {
    const alertData = {
      metric: alert.metric,
      threshold: alert.threshold,
      currentValue: metric.value,
      severity: alert.severity,
      status,
      timestamp: new Date().toISOString(),
      labels: metric.labels,
      context: metric.context
    }

    // Log alert
    const logLevel = alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 'warn'
    this.logger[logLevel](`Performance alert ${status}: ${alert.metric}`, alertData)

    // Record alert metric
    telemetry.recordCounter('performance_alerts_total', 1, {
      metric: alert.metric,
      severity: alert.severity,
      status
    })

    // TODO: Send to external alerting system
    // await this.sendToAlertingService(alertData)
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeRange: { start: Date; end: Date }): {
    requests: {
      total: number
      averageDuration: number
      errorRate: number
      slowestEndpoints: Array<{ url: string; averageDuration: number }>
    }
    database: {
      total: number
      averageDuration: number
      errorRate: number
      slowestTables: Array<{ table: string; averageDuration: number }>
    }
    externalServices: {
      total: number
      averageDuration: number
      errorRate: number
      slowestServices: Array<{ service: string; averageDuration: number }>
    }
  } {
    const requests = this.requestMetrics.filter(r => 
      r.timestamp >= timeRange.start && r.timestamp <= timeRange.end
    )
    
    const database = this.databaseMetrics.filter(d => 
      d.timestamp >= timeRange.start && d.timestamp <= timeRange.end
    )
    
    const externalServices = this.externalServiceMetrics.filter(e => 
      e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
    )

    return {
      requests: {
        total: requests.length,
        averageDuration: requests.length > 0 
          ? requests.reduce((sum, r) => sum + r.duration, 0) / requests.length 
          : 0,
        errorRate: requests.length > 0 
          ? requests.filter(r => r.statusCode >= 400).length / requests.length 
          : 0,
        slowestEndpoints: this.getTopSlowestEndpoints(requests, 5)
      },
      database: {
        total: database.length,
        averageDuration: database.length > 0 
          ? database.reduce((sum, d) => sum + d.duration, 0) / database.length 
          : 0,
        errorRate: database.length > 0 
          ? database.filter(d => !!d.error).length / database.length 
          : 0,
        slowestTables: this.getTopSlowestTables(database, 5)
      },
      externalServices: {
        total: externalServices.length,
        averageDuration: externalServices.length > 0 
          ? externalServices.reduce((sum, e) => sum + e.duration, 0) / externalServices.length 
          : 0,
        errorRate: externalServices.length > 0 
          ? externalServices.filter(e => !!e.error).length / externalServices.length 
          : 0,
        slowestServices: this.getTopSlowestServices(externalServices, 5)
      }
    }
  }

  /**
   * Helper methods
   */
  private getLogLevelForRequest(data: RequestPerformance): 'debug' | 'info' | 'warn' | 'error' {
    if (data.error) return 'error'
    if (data.statusCode >= 400) return 'warn'
    if (data.duration > 5000) return 'warn'
    if (data.duration > 1000) return 'info'
    return 'debug'
  }

  private isSignificantMetric(metric: PerformanceMetric): boolean {
    return metric.value > 1000 || // > 1 second
           metric.name.includes('error') ||
           metric.name.includes('failure')
  }

  private getTopSlowestEndpoints(requests: RequestPerformance[], limit: number) {
    const endpointStats = new Map<string, { total: number; sum: number }>()
    
    for (const request of requests) {
      const key = `${request.method} ${request.url}`
      const stats = endpointStats.get(key) || { total: 0, sum: 0 }
      stats.total++
      stats.sum += request.duration
      endpointStats.set(key, stats)
    }

    return Array.from(endpointStats.entries())
      .map(([url, stats]) => ({
        url,
        averageDuration: stats.sum / stats.total
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit)
  }

  private getTopSlowestTables(operations: DatabasePerformance[], limit: number) {
    const tableStats = new Map<string, { total: number; sum: number }>()
    
    for (const operation of operations) {
      const stats = tableStats.get(operation.table) || { total: 0, sum: 0 }
      stats.total++
      stats.sum += operation.duration
      tableStats.set(operation.table, stats)
    }

    return Array.from(tableStats.entries())
      .map(([table, stats]) => ({
        table,
        averageDuration: stats.sum / stats.total
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit)
  }

  private getTopSlowestServices(services: ExternalServicePerformance[], limit: number) {
    const serviceStats = new Map<string, { total: number; sum: number }>()
    
    for (const service of services) {
      const stats = serviceStats.get(service.service) || { total: 0, sum: 0 }
      stats.total++
      stats.sum += service.duration
      serviceStats.set(service.service, stats)
    }

    return Array.from(serviceStats.entries())
      .map(([service, stats]) => ({
        service,
        averageDuration: stats.sum / stats.total
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit)
  }

  private trimMetrics(): void {
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    const cutoff = new Date(Date.now() - maxAge)

    this.requestMetrics = this.requestMetrics.filter(m => m.timestamp > cutoff)
    this.databaseMetrics = this.databaseMetrics.filter(m => m.timestamp > cutoff)
    this.externalServiceMetrics = this.externalServiceMetrics.filter(m => m.timestamp > cutoff)
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
  }
}

/**
 * Default performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor()

// Add default alerts
performanceMonitor.addAlert({
  metric: 'http_request_duration_ms',
  threshold: 5000,
  operator: 'gt',
  duration: 60000,
  severity: 'medium',
  enabled: true
})

performanceMonitor.addAlert({
  metric: 'database_operation_duration_ms',
  threshold: 2000,
  operator: 'gt',
  duration: 30000,
  severity: 'high',
  enabled: true
})

performanceMonitor.addAlert({
  metric: 'external_service_duration_ms',
  threshold: 10000,
  operator: 'gt',
  duration: 60000,
  severity: 'medium',
  enabled: true
})