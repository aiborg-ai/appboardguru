/**
 * Comprehensive API Performance Monitoring Middleware
 * Advanced performance tracking, alerting, and optimization for BoardGuru APIs
 */

import { NextRequest, NextResponse } from 'next/server'
import { APIMiddleware, MiddlewareContext } from './types'
import { Logger } from '../logging/logger'
import { telemetry, MetricType, TelemetryManager } from '../logging/telemetry'
import { enhancedCacheManager } from '../performance/enhanced-cache-manager'
import { enhancedPerformanceMonitor } from '../telemetry/performance'

const logger = Logger.getLogger('PerformanceMonitoring')

export interface PerformanceMetrics {
  requestId: string
  endpoint: string
  method: string
  statusCode: number
  duration: number
  responseSize: number
  requestSize: number
  databaseQueries: number
  databaseQueryTime: number
  cacheHits: number
  cacheMisses: number
  memoryUsage: {
    before: NodeJS.MemoryUsage
    after: NodeJS.MemoryUsage
    delta: NodeJS.MemoryUsage
  }
  userAgent: string
  ipAddress?: string
  userId?: string
  organizationId?: string
  errorDetails?: {
    type: string
    message: string
    stack?: string
  }
  performanceBreakdown: {
    parsing: number
    validation: number
    authentication: number
    businessLogic: number
    database: number
    cache: number
    serialization: number
    networking: number
  }
  warnings: string[]
  recommendations: string[]
}

export interface PerformanceAlert {
  id: string
  type: 'slow_response' | 'high_memory' | 'error_rate' | 'throughput' | 'cache_miss'
  severity: 'low' | 'medium' | 'high' | 'critical'
  threshold: number
  currentValue: number
  message: string
  endpoint: string
  timestamp: Date
  context: Record<string, any>
}

export interface PerformanceConfiguration {
  enableDetailedProfiling: boolean
  enableMemoryTracking: boolean
  enableDatabaseProfiling: boolean
  enableCacheAnalysis: boolean
  slowRequestThreshold: number // milliseconds
  highMemoryThreshold: number // bytes
  alerting: {
    enabled: boolean
    channels: Array<'console' | 'webhook' | 'email'>
    webhookUrl?: string
    emailRecipients?: string[]
  }
  sampling: {
    enabled: boolean
    rate: number // 0-1, percentage of requests to monitor
  }
  retention: {
    metricsRetentionDays: number
    alertsRetentionDays: number
  }
}

/**
 * Performance data collector and analyzer
 */
class PerformanceCollector {
  private metrics: PerformanceMetrics[] = []
  private alerts: PerformanceAlert[] = []
  private requestsInFlight = new Map<string, any>()
  private alertThresholds = new Map<string, number>()

  constructor(private config: PerformanceConfiguration) {
    this.setupAlertThresholds()
    this.startBackgroundTasks()
  }

  /**
   * Start tracking a request
   */
  startRequest(requestId: string, req: NextRequest): void {
    const startData = {
      requestId,
      startTime: performance.now(),
      memoryBefore: process.memoryUsage(),
      endpoint: new URL(req.url).pathname,
      method: req.method,
      userAgent: req.headers.get('user-agent') || 'unknown',
      requestSize: this.calculateRequestSize(req),
      breakdown: {
        parsing: 0,
        validation: 0,
        authentication: 0,
        businessLogic: 0,
        database: 0,
        cache: 0,
        serialization: 0,
        networking: 0
      },
      databaseQueries: 0,
      databaseQueryTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      warnings: [],
      recommendations: []
    }

    this.requestsInFlight.set(requestId, startData)

    // Record request start
    telemetry.recordCounter('api_requests_started', 1, {
      endpoint: startData.endpoint,
      method: startData.method
    })
  }

  /**
   * Record phase timing
   */
  recordPhase(requestId: string, phase: keyof PerformanceMetrics['performanceBreakdown'], duration: number): void {
    const requestData = this.requestsInFlight.get(requestId)
    if (requestData) {
      requestData.breakdown[phase] = duration
    }
  }

  /**
   * Record database activity
   */
  recordDatabaseActivity(requestId: string, queryCount: number, queryTime: number): void {
    const requestData = this.requestsInFlight.get(requestId)
    if (requestData) {
      requestData.databaseQueries += queryCount
      requestData.databaseQueryTime += queryTime
    }
  }

  /**
   * Record cache activity
   */
  recordCacheActivity(requestId: string, hits: number, misses: number): void {
    const requestData = this.requestsInFlight.get(requestId)
    if (requestData) {
      requestData.cacheHits += hits
      requestData.cacheMisses += misses
    }
  }

  /**
   * Add warning to request
   */
  addWarning(requestId: string, warning: string): void {
    const requestData = this.requestsInFlight.get(requestId)
    if (requestData) {
      requestData.warnings.push(warning)
    }
  }

  /**
   * Add recommendation to request
   */
  addRecommendation(requestId: string, recommendation: string): void {
    const requestData = this.requestsInFlight.get(requestId)
    if (requestData) {
      requestData.recommendations.push(recommendation)
    }
  }

  /**
   * Finish tracking a request
   */
  finishRequest(requestId: string, res: NextResponse, error?: Error): PerformanceMetrics | null {
    const requestData = this.requestsInFlight.get(requestId)
    if (!requestData) return null

    const endTime = performance.now()
    const duration = endTime - requestData.startTime
    const memoryAfter = process.memoryUsage()
    const memoryDelta = this.calculateMemoryDelta(requestData.memoryBefore, memoryAfter)

    const metrics: PerformanceMetrics = {
      requestId,
      endpoint: requestData.endpoint,
      method: requestData.method,
      statusCode: res.status,
      duration,
      responseSize: this.calculateResponseSize(res),
      requestSize: requestData.requestSize,
      databaseQueries: requestData.databaseQueries,
      databaseQueryTime: requestData.databaseQueryTime,
      cacheHits: requestData.cacheHits,
      cacheMisses: requestData.cacheMisses,
      memoryUsage: {
        before: requestData.memoryBefore,
        after: memoryAfter,
        delta: memoryDelta
      },
      userAgent: requestData.userAgent,
      ipAddress: this.extractIpAddress(requestData),
      performanceBreakdown: requestData.breakdown,
      warnings: requestData.warnings,
      recommendations: requestData.recommendations,
      ...(error && {
        errorDetails: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack
        }
      })
    }

    // Analyze and add recommendations
    this.analyzePerformance(metrics)

    // Store metrics
    this.storeMetrics(metrics)

    // Check for alerts
    this.checkAlerts(metrics)

    // Clean up
    this.requestsInFlight.delete(requestId)

    return metrics
  }

  /**
   * Get performance summary for time period
   */
  getPerformanceSummary(timeRangeMs: number = 3600000): {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    throughput: number
    slowestEndpoints: Array<{ endpoint: string; averageTime: number }>
    topErrors: Array<{ error: string; count: number }>
    cacheEfficiency: number
    memoryTrend: 'increasing' | 'stable' | 'decreasing'
  } {
    const now = Date.now()
    const cutoff = now - timeRangeMs
    
    const recentMetrics = this.metrics.filter(m => 
      Date.now() - timeRangeMs < timeRangeMs
    )

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        throughput: 0,
        slowestEndpoints: [],
        topErrors: [],
        cacheEfficiency: 0,
        memoryTrend: 'stable'
      }
    }

    const totalRequests = recentMetrics.length
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length
    const errorRate = errorCount / totalRequests
    const throughput = totalRequests / (timeRangeMs / 1000) // requests per second

    // Calculate slowest endpoints
    const endpointTimes = new Map<string, { total: number; count: number }>()
    recentMetrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`
      const stats = endpointTimes.get(key) || { total: 0, count: 0 }
      stats.total += m.duration
      stats.count++
      endpointTimes.set(key, stats)
    })

    const slowestEndpoints = Array.from(endpointTimes.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        averageTime: stats.total / stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10)

    // Calculate top errors
    const errorCounts = new Map<string, number>()
    recentMetrics
      .filter(m => m.errorDetails)
      .forEach(m => {
        const error = m.errorDetails!.type
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1)
      })

    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Calculate cache efficiency
    const totalCacheRequests = recentMetrics.reduce((sum, m) => sum + m.cacheHits + m.cacheMisses, 0)
    const totalCacheHits = recentMetrics.reduce((sum, m) => sum + m.cacheHits, 0)
    const cacheEfficiency = totalCacheRequests > 0 ? totalCacheHits / totalCacheRequests : 0

    // Analyze memory trend
    const memoryTrend = this.analyzeMemoryTrend(recentMetrics)

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      throughput,
      slowestEndpoints,
      topErrors,
      cacheEfficiency,
      memoryTrend
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    const now = Date.now()
    const oneHourAgo = now - 3600000
    
    return this.alerts.filter(alert => 
      alert.timestamp.getTime() > oneHourAgo
    )
  }

  // Private methods
  private calculateRequestSize(req: NextRequest): number {
    const contentLength = req.headers.get('content-length')
    if (contentLength) {
      return parseInt(contentLength)
    }
    
    // Estimate from headers and URL
    const headerSize = Array.from(req.headers.entries())
      .reduce((size, [key, value]) => size + key.length + value.length, 0)
    const urlSize = req.url.length
    
    return headerSize + urlSize
  }

  private calculateResponseSize(res: NextResponse): number {
    const contentLength = res.headers.get('content-length')
    if (contentLength) {
      return parseInt(contentLength)
    }
    
    // Estimate from headers
    return Array.from(res.headers.entries())
      .reduce((size, [key, value]) => size + key.length + value.length, 0)
  }

  private calculateMemoryDelta(before: NodeJS.MemoryUsage, after: NodeJS.MemoryUsage): NodeJS.MemoryUsage {
    return {
      rss: after.rss - before.rss,
      heapTotal: after.heapTotal - before.heapTotal,
      heapUsed: after.heapUsed - before.heapUsed,
      external: after.external - before.external,
      arrayBuffers: after.arrayBuffers - before.arrayBuffers
    }
  }

  private extractIpAddress(requestData: any): string | undefined {
    // Would extract from headers in real implementation
    return undefined
  }

  private analyzePerformance(metrics: PerformanceMetrics): void {
    // Add performance warnings and recommendations
    if (metrics.duration > this.config.slowRequestThreshold) {
      metrics.warnings.push(`Slow response time: ${metrics.duration.toFixed(2)}ms`)
      
      if (metrics.databaseQueryTime > metrics.duration * 0.5) {
        metrics.recommendations.push('Consider optimizing database queries or adding caching')
      }
      
      if (metrics.cacheHits === 0 && metrics.cacheMisses > 0) {
        metrics.recommendations.push('Consider implementing or optimizing caching strategy')
      }
    }

    if (metrics.memoryUsage.delta.heapUsed > 50 * 1024 * 1024) { // 50MB
      metrics.warnings.push('High memory allocation detected')
      metrics.recommendations.push('Review memory usage and consider object pooling')
    }

    if (metrics.databaseQueries > 10) {
      metrics.warnings.push(`High database query count: ${metrics.databaseQueries}`)
      metrics.recommendations.push('Consider query batching or denormalization')
    }

    const cacheEfficiency = metrics.cacheHits / Math.max(metrics.cacheHits + metrics.cacheMisses, 1)
    if (cacheEfficiency < 0.5 && metrics.cacheHits + metrics.cacheMisses > 0) {
      metrics.warnings.push(`Low cache efficiency: ${(cacheEfficiency * 100).toFixed(1)}%`)
      metrics.recommendations.push('Review cache TTL settings and invalidation strategy')
    }
  }

  private storeMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics)
    
    // Trim old metrics
    const retentionTime = this.config.retention.metricsRetentionDays * 24 * 60 * 60 * 1000
    const cutoff = Date.now() - retentionTime
    this.metrics = this.metrics.filter(m => Date.now() - retentionTime < retentionTime)

    // Record to telemetry
    telemetry.recordHistogram('api_request_duration_ms', metrics.duration, {
      endpoint: metrics.endpoint,
      method: metrics.method,
      status_code: metrics.statusCode.toString()
    })

    telemetry.recordHistogram('api_request_memory_delta_bytes', metrics.memoryUsage.delta.heapUsed, {
      endpoint: metrics.endpoint,
      method: metrics.method
    })

    if (metrics.databaseQueries > 0) {
      telemetry.recordHistogram('api_database_queries_count', metrics.databaseQueries, {
        endpoint: metrics.endpoint
      })
      
      telemetry.recordHistogram('api_database_time_ms', metrics.databaseQueryTime, {
        endpoint: metrics.endpoint
      })
    }

    if (metrics.cacheHits + metrics.cacheMisses > 0) {
      const cacheEfficiency = metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)
      telemetry.recordGauge('api_cache_efficiency', cacheEfficiency, {
        endpoint: metrics.endpoint
      })
    }
  }

  private checkAlerts(metrics: PerformanceMetrics): void {
    if (!this.config.alerting.enabled) return

    const alerts: PerformanceAlert[] = []

    // Slow response alert
    if (metrics.duration > this.config.slowRequestThreshold) {
      alerts.push({
        id: `slow_response_${Date.now()}`,
        type: 'slow_response',
        severity: this.getSeverity(metrics.duration, this.config.slowRequestThreshold),
        threshold: this.config.slowRequestThreshold,
        currentValue: metrics.duration,
        message: `Slow response detected: ${metrics.duration.toFixed(2)}ms`,
        endpoint: metrics.endpoint,
        timestamp: new Date(),
        context: { method: metrics.method, statusCode: metrics.statusCode }
      })
    }

    // High memory alert
    if (metrics.memoryUsage.delta.heapUsed > this.config.highMemoryThreshold) {
      alerts.push({
        id: `high_memory_${Date.now()}`,
        type: 'high_memory',
        severity: this.getSeverity(metrics.memoryUsage.delta.heapUsed, this.config.highMemoryThreshold),
        threshold: this.config.highMemoryThreshold,
        currentValue: metrics.memoryUsage.delta.heapUsed,
        message: `High memory usage: ${(metrics.memoryUsage.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        endpoint: metrics.endpoint,
        timestamp: new Date(),
        context: { requestId: metrics.requestId }
      })
    }

    // Process and store alerts
    alerts.forEach(alert => {
      this.alerts.push(alert)
      this.triggerAlert(alert)
    })

    // Trim old alerts
    const alertRetentionTime = this.config.retention.alertsRetentionDays * 24 * 60 * 60 * 1000
    const cutoff = Date.now() - alertRetentionTime
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() > cutoff)
  }

  private getSeverity(value: number, threshold: number): PerformanceAlert['severity'] {
    const ratio = value / threshold
    if (ratio >= 5) return 'critical'
    if (ratio >= 3) return 'high'
    if (ratio >= 2) return 'medium'
    return 'low'
  }

  private triggerAlert(alert: PerformanceAlert): void {
    logger.warn(`Performance alert: ${alert.message}`, alert)
    
    // Record alert to telemetry
    telemetry.recordCounter('performance_alerts_total', 1, {
      type: alert.type,
      severity: alert.severity,
      endpoint: alert.endpoint
    })

    // Send notifications based on configuration
    if (this.config.alerting.channels.includes('console')) {
      console.warn('🚨 Performance Alert:', alert)
    }

    // Additional notification channels would be implemented here
  }

  private setupAlertThresholds(): void {
    this.alertThresholds.set('slow_response', this.config.slowRequestThreshold)
    this.alertThresholds.set('high_memory', this.config.highMemoryThreshold)
    this.alertThresholds.set('error_rate', 0.05) // 5%
    this.alertThresholds.set('cache_miss', 0.8) // 80% miss rate
  }

  private analyzeMemoryTrend(metrics: PerformanceMetrics[]): 'increasing' | 'stable' | 'decreasing' {
    if (metrics.length < 10) return 'stable'
    
    const recent = metrics.slice(-10)
    const memoryValues = recent.map(m => m.memoryUsage.after.heapUsed)
    
    let increasing = 0
    let decreasing = 0
    
    for (let i = 1; i < memoryValues.length; i++) {
      if (memoryValues[i] > memoryValues[i - 1]) increasing++
      else if (memoryValues[i] < memoryValues[i - 1]) decreasing++
    }
    
    if (increasing > decreasing * 1.5) return 'increasing'
    if (decreasing > increasing * 1.5) return 'decreasing'
    return 'stable'
  }

  private startBackgroundTasks(): void {
    // Periodic cleanup and optimization
    setInterval(() => {
      this.cleanupOldData()
      this.optimizeMetricsStorage()
    }, 300000) // Every 5 minutes

    // Periodic performance analysis
    setInterval(() => {
      this.performPerformanceAnalysis()
    }, 60000) // Every minute
  }

  private cleanupOldData(): void {
    const now = Date.now()
    const metricsCutoff = now - (this.config.retention.metricsRetentionDays * 24 * 60 * 60 * 1000)
    const alertsCutoff = now - (this.config.retention.alertsRetentionDays * 24 * 60 * 60 * 1000)
    
    this.metrics = this.metrics.filter(m => Date.now() - metricsCutoff < this.config.retention.metricsRetentionDays * 24 * 60 * 60 * 1000)
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() > alertsCutoff)
  }

  private optimizeMetricsStorage(): void {
    // Compress old metrics or move to cold storage
    if (this.metrics.length > 10000) {
      logger.info('Optimizing metrics storage, current count:', this.metrics.length)
      // Keep only recent high-level metrics for old data
      const oneHourAgo = Date.now() - 3600000
      const recentMetrics = this.metrics.filter(m => Date.now() - oneHourAgo < 3600000)
      const oldMetrics = this.metrics.filter(m => Date.now() - oneHourAgo >= 3600000)
      
      // Aggregate old metrics
      const aggregated = this.aggregateMetrics(oldMetrics)
      this.metrics = [...recentMetrics, ...aggregated.slice(0, 1000)]
    }
  }

  private aggregateMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics[] {
    // Simple aggregation - would be more sophisticated in production
    return metrics.filter((_, index) => index % 10 === 0) // Keep every 10th metric
  }

  private performPerformanceAnalysis(): void {
    const summary = this.getPerformanceSummary(300000) // Last 5 minutes
    
    // Log performance insights
    if (summary.totalRequests > 0) {
      logger.debug('Performance summary', summary)
      
      // Check for performance degradation
      if (summary.errorRate > 0.1) {
        logger.warn('High error rate detected', { errorRate: summary.errorRate })
      }
      
      if (summary.averageResponseTime > this.config.slowRequestThreshold) {
        logger.warn('High average response time', { 
          averageResponseTime: summary.averageResponseTime 
        })
      }
      
      if (summary.cacheEfficiency < 0.5) {
        logger.warn('Low cache efficiency', { 
          cacheEfficiency: summary.cacheEfficiency 
        })
      }
    }
  }
}

/**
 * Performance monitoring middleware
 */
export function createPerformanceMonitoringMiddleware(
  config: Partial<PerformanceConfiguration> = {}
): APIMiddleware {
  const defaultConfig: PerformanceConfiguration = {
    enableDetailedProfiling: process.env.NODE_ENV === 'development',
    enableMemoryTracking: true,
    enableDatabaseProfiling: true,
    enableCacheAnalysis: true,
    slowRequestThreshold: 1000, // 1 second
    highMemoryThreshold: 100 * 1024 * 1024, // 100MB
    alerting: {
      enabled: true,
      channels: ['console']
    },
    sampling: {
      enabled: false,
      rate: 1.0
    },
    retention: {
      metricsRetentionDays: 7,
      alertsRetentionDays: 30
    }
  }

  const finalConfig = { ...defaultConfig, ...config }
  const collector = new PerformanceCollector(finalConfig)

  return {
    name: 'performance-monitoring',
    
    async before(context: MiddlewareContext) {
      // Check if we should sample this request
      if (finalConfig.sampling.enabled && Math.random() > finalConfig.sampling.rate) {
        return
      }

      const requestId = context.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      context.requestId = requestId
      context.performanceCollector = collector

      // Start tracking
      collector.startRequest(requestId, context.request)

      // Track parsing phase
      const parseStart = performance.now()
      // Parsing would happen here
      const parseTime = performance.now() - parseStart
      collector.recordPhase(requestId, 'parsing', parseTime)

      logger.debug('Performance monitoring started', { requestId, endpoint: new URL(context.request.url).pathname })
    },

    async after(context: MiddlewareContext) {
      if (!context.performanceCollector || !context.requestId) return

      const collector = context.performanceCollector as PerformanceCollector
      
      // Record final metrics
      const metrics = collector.finishRequest(
        context.requestId,
        context.response,
        context.error
      )

      if (metrics && finalConfig.enableDetailedProfiling) {
        logger.info('Request performance metrics', {
          requestId: metrics.requestId,
          endpoint: metrics.endpoint,
          duration: metrics.duration,
          statusCode: metrics.statusCode,
          warnings: metrics.warnings,
          recommendations: metrics.recommendations
        })
      }

      // Add performance headers to response
      if (metrics) {
        context.response.headers.set('X-Response-Time', `${metrics.duration.toFixed(2)}ms`)
        context.response.headers.set('X-Database-Queries', metrics.databaseQueries.toString())
        context.response.headers.set('X-Cache-Hits', metrics.cacheHits.toString())
        context.response.headers.set('X-Cache-Misses', metrics.cacheMisses.toString())
        
        if (metrics.warnings.length > 0) {
          context.response.headers.set('X-Performance-Warnings', metrics.warnings.length.toString())
        }
      }
    },

    async onError(context: MiddlewareContext, error: Error) {
      if (context.performanceCollector && context.requestId) {
        const collector = context.performanceCollector as PerformanceCollector
        collector.addWarning(context.requestId, `Error occurred: ${error.message}`)
      }
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitoringUtils {
  private static collector?: PerformanceCollector

  static setCollector(collector: PerformanceCollector): void {
    this.collector = collector
  }

  /**
   * Record database activity for current request
   */
  static recordDatabaseActivity(requestId: string, queryCount: number, queryTime: number): void {
    if (this.collector) {
      this.collector.recordDatabaseActivity(requestId, queryCount, queryTime)
    }
  }

  /**
   * Record cache activity for current request
   */
  static recordCacheActivity(requestId: string, hits: number, misses: number): void {
    if (this.collector) {
      this.collector.recordCacheActivity(requestId, hits, misses)
    }
  }

  /**
   * Add warning to current request
   */
  static addWarning(requestId: string, warning: string): void {
    if (this.collector) {
      this.collector.addWarning(requestId, warning)
    }
  }

  /**
   * Add recommendation to current request
   */
  static addRecommendation(requestId: string, recommendation: string): void {
    if (this.collector) {
      this.collector.addRecommendation(requestId, recommendation)
    }
  }

  /**
   * Get current performance summary
   */
  static getPerformanceSummary(): any {
    return this.collector?.getPerformanceSummary()
  }

  /**
   * Get active alerts
   */
  static getActiveAlerts(): PerformanceAlert[] {
    return this.collector?.getActiveAlerts() || []
  }
}

// Export the configured middleware
export const performanceMonitoringMiddleware = createPerformanceMonitoringMiddleware({
  enableDetailedProfiling: process.env.NODE_ENV === 'development',
  slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000'),
  highMemoryThreshold: parseInt(process.env.HIGH_MEMORY_THRESHOLD || '104857600'), // 100MB
  alerting: {
    enabled: process.env.NODE_ENV === 'production',
    channels: ['console']
  }
})

export default performanceMonitoringMiddleware