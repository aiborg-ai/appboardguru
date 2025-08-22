/**
 * Comprehensive Transaction Monitoring and Metrics
 * 
 * Provides real-time monitoring, performance metrics, alerting, and analytics
 * for transaction systems with detailed reporting and observability.
 */

import { EventEmitter } from 'events'
import { Result, success, failure, RepositoryError } from './result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// Monitoring configuration
export interface MonitoringConfig {
  enableRealTimeMetrics: boolean
  metricsRetentionDays: number
  alertThresholds: AlertThresholds
  enableDetailed Tracing: boolean
  enablePerformanceAnalytics: boolean
  enableAnomalyDetection: boolean
  samplingRate: number // 0.0 to 1.0
  aggregationIntervalMs: number
}

export interface AlertThresholds {
  maxTransactionDurationMs: number
  maxErrorRate: number // 0.0 to 1.0
  maxConcurrentTransactions: number
  maxDeadlockRate: number
  maxRollbackRate: number
  maxLockWaitTimeMs: number
  minThroughput: number // transactions per second
}

// Transaction event types
export type TransactionEventType = 
  | 'TRANSACTION_STARTED'
  | 'TRANSACTION_COMMITTED'
  | 'TRANSACTION_ABORTED'
  | 'TRANSACTION_TIMEOUT'
  | 'OPERATION_STARTED'
  | 'OPERATION_COMPLETED' 
  | 'OPERATION_FAILED'
  | 'LOCK_ACQUIRED'
  | 'LOCK_RELEASED'
  | 'DEADLOCK_DETECTED'
  | 'COMPENSATION_EXECUTED'
  | 'ROLLBACK_STARTED'
  | 'ROLLBACK_COMPLETED'

// Transaction event
export interface TransactionEvent {
  id: string
  type: TransactionEventType
  transactionId: string
  timestamp: Date
  duration?: number
  metadata: {
    userId?: string
    organizationId?: string
    operationCount?: number
    affectedTables?: string[]
    errorCode?: string
    errorMessage?: string
    [key: string]: any
  }
}

// Real-time metrics
export interface RealTimeMetrics {
  timestamp: Date
  activeTransactions: number
  transactionsPerSecond: number
  averageTransactionDuration: number
  errorRate: number
  rollbackRate: number
  deadlockCount: number
  lockContentionEvents: number
  throughput: number
  responseTime: {
    p50: number
    p95: number
    p99: number
  }
  resourceUtilization: {
    connections: number
    memory: number
    cpu: number
  }
}

// Performance analytics
export interface PerformanceAnalytics {
  timeRange: { start: Date; end: Date }
  totalTransactions: number
  successfulTransactions: number
  failedTransactions: number
  averageDuration: number
  medianDuration: number
  transactionVolumeByHour: number[]
  errorsByType: Map<string, number>
  slowestTransactions: SlowTransactionInfo[]
  mostContentedResources: ContentionInfo[]
  performanceTrends: {
    duration: TrendData
    throughput: TrendData
    errorRate: TrendData
  }
}

export interface SlowTransactionInfo {
  transactionId: string
  duration: number
  operationCount: number
  startTime: Date
  userId?: string
  errorMessage?: string
}

export interface ContentionInfo {
  resource: string
  contentionCount: number
  averageWaitTime: number
  maxWaitTime: number
  affectedTransactions: number
}

export interface TrendData {
  values: number[]
  timestamps: Date[]
  trend: 'IMPROVING' | 'DEGRADING' | 'STABLE'
  changePercent: number
}

// Alert definition
export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  message: string
  threshold: number
  currentValue: number
  timestamp: Date
  resolved: boolean
  metadata?: Record<string, unknown>
}

export type AlertType = 
  | 'HIGH_ERROR_RATE'
  | 'LONG_TRANSACTION_DURATION'
  | 'HIGH_CONTENTION'
  | 'FREQUENT_DEADLOCKS'
  | 'LOW_THROUGHPUT'
  | 'RESOURCE_EXHAUSTION'
  | 'ANOMALY_DETECTED'

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

// Anomaly detection
export interface AnomalyDetectionResult {
  isAnomaly: boolean
  confidence: number
  expectedRange: { min: number; max: number }
  actualValue: number
  anomalyType: 'SPIKE' | 'DIP' | 'TREND_BREAK' | 'PATTERN_DEVIATION'
  description: string
}

/**
 * Comprehensive Transaction Monitor
 */
export class TransactionMonitor extends EventEmitter {
  private events: TransactionEvent[] = []
  private metrics: RealTimeMetrics[] = []
  private alerts: Alert[] = []
  private metricsBuffer: Map<string, number[]> = new Map()
  private performanceBaseline: PerformanceBaseline = new PerformanceBaseline()
  private anomalyDetector: AnomalyDetector = new AnomalyDetector()

  constructor(
    private config: MonitoringConfig,
    private supabase?: SupabaseClient<Database>
  ) {
    super()
    this.setupMetricsCollection()
    this.setupAlertingSystem()
  }

  /**
   * Record transaction event
   */
  recordEvent(event: Omit<TransactionEvent, 'id'>): void {
    const fullEvent: TransactionEvent = {
      id: this.generateEventId(),
      ...event
    }

    // Apply sampling if configured
    if (Math.random() > this.config.samplingRate) {
      return
    }

    this.events.push(fullEvent)
    this.emit('event:recorded', fullEvent)

    // Update real-time metrics
    this.updateRealTimeMetrics(fullEvent)

    // Check for alerts
    this.checkAlerts(fullEvent)

    // Persist event if database available
    if (this.supabase) {
      this.persistEvent(fullEvent).catch(error => {
        console.warn('Failed to persist monitoring event:', error)
      })
    }

    // Cleanup old events
    this.cleanupOldEvents()
  }

  /**
   * Get current real-time metrics
   */
  getCurrentMetrics(): RealTimeMetrics {
    const now = new Date()
    const recent = this.getRecentEvents(300000) // Last 5 minutes
    
    const activeTransactions = new Set(
      recent
        .filter(e => e.type === 'TRANSACTION_STARTED')
        .map(e => e.transactionId)
    ).size

    const completedRecent = recent.filter(e => 
      e.type === 'TRANSACTION_COMMITTED' || e.type === 'TRANSACTION_ABORTED'
    )

    const transactionsPerSecond = completedRecent.length / 300 // 5 minutes in seconds

    const durations = completedRecent
      .map(e => e.duration || 0)
      .filter(d => d > 0)

    const averageTransactionDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0

    const errorRate = recent.filter(e => e.type === 'OPERATION_FAILED').length / 
                     Math.max(1, recent.filter(e => e.type === 'OPERATION_STARTED').length)

    const rollbackRate = recent.filter(e => e.type === 'ROLLBACK_STARTED').length /
                        Math.max(1, recent.filter(e => e.type === 'TRANSACTION_STARTED').length)

    const deadlockCount = recent.filter(e => e.type === 'DEADLOCK_DETECTED').length

    const lockContentionEvents = recent.filter(e => 
      e.type === 'LOCK_ACQUIRED' && (e.duration || 0) > 1000
    ).length

    const responseTimes = this.calculateResponseTimePercentiles(durations)

    return {
      timestamp: now,
      activeTransactions,
      transactionsPerSecond,
      averageTransactionDuration,
      errorRate,
      rollbackRate,
      deadlockCount,
      lockContentionEvents,
      throughput: transactionsPerSecond,
      responseTime: responseTimes,
      resourceUtilization: {
        connections: 0, // Would be provided by connection pool
        memory: 0,      // Would need system monitoring
        cpu: 0          // Would need system monitoring
      }
    }
  }

  /**
   * Generate comprehensive performance analytics
   */
  getPerformanceAnalytics(timeRange: { start: Date; end: Date }): PerformanceAnalytics {
    const relevantEvents = this.events.filter(e => 
      e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
    )

    const transactionEvents = relevantEvents.filter(e => 
      e.type === 'TRANSACTION_COMMITTED' || e.type === 'TRANSACTION_ABORTED'
    )

    const totalTransactions = transactionEvents.length
    const successfulTransactions = transactionEvents.filter(e => 
      e.type === 'TRANSACTION_COMMITTED'
    ).length
    const failedTransactions = totalTransactions - successfulTransactions

    const durations = transactionEvents
      .map(e => e.duration || 0)
      .filter(d => d > 0)
      .sort((a, b) => a - b)

    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0

    const medianDuration = durations.length > 0 
      ? durations[Math.floor(durations.length / 2)] 
      : 0

    const transactionVolumeByHour = this.calculateHourlyVolume(transactionEvents, timeRange)
    const errorsByType = this.analyzeErrorTypes(relevantEvents)
    const slowestTransactions = this.findSlowestTransactions(transactionEvents, 10)
    const mostContentedResources = this.analyzeResourceContention(relevantEvents)
    const performanceTrends = this.calculatePerformanceTrends(timeRange)

    return {
      timeRange,
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      averageDuration,
      medianDuration,
      transactionVolumeByHour,
      errorsByType,
      slowestTransactions,
      mostContentedResources,
      performanceTrends
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): Result<void> {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) {
      return failure(RepositoryError.notFound('Alert', alertId))
    }

    alert.resolved = true
    this.emit('alert:resolved', alert)
    return success(undefined)
  }

  /**
   * Detect anomalies in current metrics
   */
  detectAnomalies(): AnomalyDetectionResult[] {
    const currentMetrics = this.getCurrentMetrics()
    const results: AnomalyDetectionResult[] = []

    // Check transaction duration anomalies
    const durationAnomaly = this.anomalyDetector.detectDurationAnomaly(
      currentMetrics.averageTransactionDuration,
      this.performanceBaseline.getAverageTransactionDuration()
    )
    if (durationAnomaly.isAnomaly) {
      results.push(durationAnomaly)
    }

    // Check throughput anomalies
    const throughputAnomaly = this.anomalyDetector.detectThroughputAnomaly(
      currentMetrics.throughput,
      this.performanceBaseline.getAverageThroughput()
    )
    if (throughputAnomaly.isAnomaly) {
      results.push(throughputAnomaly)
    }

    // Check error rate anomalies
    const errorRateAnomaly = this.anomalyDetector.detectErrorRateAnomaly(
      currentMetrics.errorRate,
      this.performanceBaseline.getAverageErrorRate()
    )
    if (errorRateAnomaly.isAnomaly) {
      results.push(errorRateAnomaly)
    }

    return results
  }

  /**
   * Generate monitoring report
   */
  generateReport(timeRange: { start: Date; end: Date }): {
    summary: {
      totalTransactions: number
      successRate: number
      averageResponseTime: number
      alertsTriggered: number
    }
    analytics: PerformanceAnalytics
    alerts: Alert[]
    recommendations: string[]
  } {
    const analytics = this.getPerformanceAnalytics(timeRange)
    const alerts = this.alerts.filter(a => 
      a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
    )

    const successRate = analytics.totalTransactions > 0 
      ? analytics.successfulTransactions / analytics.totalTransactions 
      : 0

    const recommendations = this.generateRecommendations(analytics, alerts)

    return {
      summary: {
        totalTransactions: analytics.totalTransactions,
        successRate,
        averageResponseTime: analytics.averageDuration,
        alertsTriggered: alerts.length
      },
      analytics,
      alerts,
      recommendations
    }
  }

  /**
   * Update real-time metrics based on event
   */
  private updateRealTimeMetrics(event: TransactionEvent): void {
    const metricKey = this.getMetricKey(event.timestamp)
    
    // Update metrics buffer
    this.updateMetricsBuffer('events', 1)
    
    if (event.duration) {
      this.updateMetricsBuffer('durations', event.duration)
    }

    switch (event.type) {
      case 'TRANSACTION_STARTED':
        this.updateMetricsBuffer('transactions_started', 1)
        break
      case 'TRANSACTION_COMMITTED':
        this.updateMetricsBuffer('transactions_committed', 1)
        break
      case 'TRANSACTION_ABORTED':
        this.updateMetricsBuffer('transactions_aborted', 1)
        break
      case 'OPERATION_FAILED':
        this.updateMetricsBuffer('operation_errors', 1)
        break
      case 'DEADLOCK_DETECTED':
        this.updateMetricsBuffer('deadlocks', 1)
        break
    }

    // Update performance baseline
    this.performanceBaseline.update(event)
  }

  /**
   * Check alert thresholds
   */
  private checkAlerts(event: TransactionEvent): void {
    const currentMetrics = this.getCurrentMetrics()

    // Check transaction duration
    if (event.duration && event.duration > this.config.alertThresholds.maxTransactionDurationMs) {
      this.createAlert(
        'LONG_TRANSACTION_DURATION',
        'HIGH',
        `Transaction exceeded duration threshold: ${event.duration}ms`,
        this.config.alertThresholds.maxTransactionDurationMs,
        event.duration,
        { transactionId: event.transactionId }
      )
    }

    // Check error rate
    if (currentMetrics.errorRate > this.config.alertThresholds.maxErrorRate) {
      this.createAlert(
        'HIGH_ERROR_RATE',
        'HIGH',
        `Error rate exceeded threshold: ${currentMetrics.errorRate * 100}%`,
        this.config.alertThresholds.maxErrorRate,
        currentMetrics.errorRate
      )
    }

    // Check concurrent transactions
    if (currentMetrics.activeTransactions > this.config.alertThresholds.maxConcurrentTransactions) {
      this.createAlert(
        'RESOURCE_EXHAUSTION',
        'MEDIUM',
        `High concurrent transactions: ${currentMetrics.activeTransactions}`,
        this.config.alertThresholds.maxConcurrentTransactions,
        currentMetrics.activeTransactions
      )
    }

    // Check throughput
    if (currentMetrics.throughput < this.config.alertThresholds.minThroughput) {
      this.createAlert(
        'LOW_THROUGHPUT',
        'MEDIUM',
        `Throughput below threshold: ${currentMetrics.throughput} TPS`,
        this.config.alertThresholds.minThroughput,
        currentMetrics.throughput
      )
    }

    // Check deadlock rate
    if (currentMetrics.deadlockCount > 0) {
      this.createAlert(
        'FREQUENT_DEADLOCKS',
        'HIGH',
        `Deadlocks detected: ${currentMetrics.deadlockCount}`,
        0,
        currentMetrics.deadlockCount
      )
    }
  }

  /**
   * Create and emit alert
   */
  private createAlert(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    threshold: number,
    currentValue: number,
    metadata?: Record<string, unknown>
  ): void {
    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity,
      message,
      threshold,
      currentValue,
      timestamp: new Date(),
      resolved: false,
      metadata
    }

    this.alerts.push(alert)
    this.emit('alert:triggered', alert)

    // Auto-resolve after time if appropriate
    if (type === 'LONG_TRANSACTION_DURATION') {
      setTimeout(() => {
        if (!alert.resolved) {
          this.resolveAlert(alert.id)
        }
      }, 60000) // Auto-resolve after 1 minute
    }
  }

  /**
   * Setup metrics collection timer
   */
  private setupMetricsCollection(): void {
    setInterval(() => {
      const metrics = this.getCurrentMetrics()
      this.metrics.push(metrics)
      this.emit('metrics:updated', metrics)

      // Keep only recent metrics
      const cutoff = new Date(Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000))
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
    }, this.config.aggregationIntervalMs)
  }

  /**
   * Setup alerting system
   */
  private setupAlertingSystem(): void {
    if (this.config.enableAnomalyDetection) {
      setInterval(() => {
        const anomalies = this.detectAnomalies()
        for (const anomaly of anomalies) {
          if (anomaly.confidence > 0.8) { // High confidence threshold
            this.createAlert(
              'ANOMALY_DETECTED',
              anomaly.confidence > 0.95 ? 'HIGH' : 'MEDIUM',
              `Anomaly detected: ${anomaly.description}`,
              anomaly.expectedRange.max,
              anomaly.actualValue,
              { anomalyType: anomaly.anomalyType, confidence: anomaly.confidence }
            )
          }
        }
      }, 60000) // Check every minute
    }
  }

  /**
   * Calculate response time percentiles
   */
  private calculateResponseTimePercentiles(durations: number[]): {
    p50: number
    p95: number
    p99: number
  } {
    if (durations.length === 0) {
      return { p50: 0, p95: 0, p99: 0 }
    }

    const sorted = [...durations].sort((a, b) => a - b)
    
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0
    }
  }

  /**
   * Calculate hourly transaction volume
   */
  private calculateHourlyVolume(events: TransactionEvent[], timeRange: { start: Date; end: Date }): number[] {
    const hours = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (60 * 60 * 1000))
    const volume = new Array(hours).fill(0)
    
    for (const event of events) {
      const hourIndex = Math.floor(
        (event.timestamp.getTime() - timeRange.start.getTime()) / (60 * 60 * 1000)
      )
      if (hourIndex >= 0 && hourIndex < hours) {
        volume[hourIndex]++
      }
    }
    
    return volume
  }

  /**
   * Analyze error types
   */
  private analyzeErrorTypes(events: TransactionEvent[]): Map<string, number> {
    const errorMap = new Map<string, number>()
    
    for (const event of events) {
      if (event.type === 'OPERATION_FAILED' && event.metadata.errorCode) {
        const errorCode = event.metadata.errorCode as string
        errorMap.set(errorCode, (errorMap.get(errorCode) || 0) + 1)
      }
    }
    
    return errorMap
  }

  /**
   * Find slowest transactions
   */
  private findSlowestTransactions(events: TransactionEvent[], limit: number): SlowTransactionInfo[] {
    return events
      .filter(e => e.duration && e.duration > 0)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit)
      .map(e => ({
        transactionId: e.transactionId,
        duration: e.duration || 0,
        operationCount: e.metadata.operationCount || 0,
        startTime: e.timestamp,
        userId: e.metadata.userId as string,
        errorMessage: e.metadata.errorMessage as string
      }))
  }

  /**
   * Analyze resource contention
   */
  private analyzeResourceContention(events: TransactionEvent[]): ContentionInfo[] {
    const contentionMap = new Map<string, {
      count: number
      totalWaitTime: number
      maxWaitTime: number
      transactions: Set<string>
    }>()

    for (const event of events) {
      if (event.type === 'LOCK_ACQUIRED' && event.duration && event.duration > 100) {
        const resource = event.metadata.resource as string || 'unknown'
        const existing = contentionMap.get(resource) || {
          count: 0,
          totalWaitTime: 0,
          maxWaitTime: 0,
          transactions: new Set()
        }

        existing.count++
        existing.totalWaitTime += event.duration
        existing.maxWaitTime = Math.max(existing.maxWaitTime, event.duration)
        existing.transactions.add(event.transactionId)
        
        contentionMap.set(resource, existing)
      }
    }

    return Array.from(contentionMap.entries())
      .map(([resource, stats]) => ({
        resource,
        contentionCount: stats.count,
        averageWaitTime: stats.totalWaitTime / stats.count,
        maxWaitTime: stats.maxWaitTime,
        affectedTransactions: stats.transactions.size
      }))
      .sort((a, b) => b.contentionCount - a.contentionCount)
  }

  /**
   * Calculate performance trends
   */
  private calculatePerformanceTrends(timeRange: { start: Date; end: Date }): {
    duration: TrendData
    throughput: TrendData
    errorRate: TrendData
  } {
    // Simplified trend calculation - would need more sophisticated analysis
    const relevantMetrics = this.metrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    )

    const durations = relevantMetrics.map(m => m.averageTransactionDuration)
    const throughputs = relevantMetrics.map(m => m.throughput)
    const errorRates = relevantMetrics.map(m => m.errorRate)
    const timestamps = relevantMetrics.map(m => m.timestamp)

    return {
      duration: this.calculateTrend(durations, timestamps),
      throughput: this.calculateTrend(throughputs, timestamps),
      errorRate: this.calculateTrend(errorRates, timestamps)
    }
  }

  /**
   * Calculate trend for data series
   */
  private calculateTrend(values: number[], timestamps: Date[]): TrendData {
    if (values.length < 2) {
      return {
        values,
        timestamps,
        trend: 'STABLE',
        changePercent: 0
      }
    }

    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    
    const firstAverage = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length
    const secondAverage = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length
    
    const changePercent = ((secondAverage - firstAverage) / firstAverage) * 100
    
    let trend: 'IMPROVING' | 'DEGRADING' | 'STABLE' = 'STABLE'
    if (Math.abs(changePercent) > 5) { // 5% threshold
      trend = changePercent > 0 ? 'DEGRADING' : 'IMPROVING'
    }

    return {
      values,
      timestamps,
      trend,
      changePercent
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(analytics: PerformanceAnalytics, alerts: Alert[]): string[] {
    const recommendations: string[] = []

    // Analyze success rate
    const successRate = analytics.successfulTransactions / Math.max(1, analytics.totalTransactions)
    if (successRate < 0.95) {
      recommendations.push('Consider investigating frequent transaction failures')
    }

    // Analyze duration
    if (analytics.averageDuration > 5000) {
      recommendations.push('Transaction duration is high - consider optimizing queries or adding indexes')
    }

    // Analyze contention
    if (analytics.mostContentedResources.length > 0) {
      const topContended = analytics.mostContentedResources[0]
      recommendations.push(`High contention on ${topContended.resource} - consider partitioning or optimizing access patterns`)
    }

    // Analyze error patterns
    if (analytics.errorsByType.size > 0) {
      const [topError] = Array.from(analytics.errorsByType.entries())
        .sort(([,a], [,b]) => b - a)
      recommendations.push(`Most frequent error: ${topError[0]} (${topError[1]} occurrences)`)
    }

    // Analyze trends
    if (analytics.performanceTrends.duration.trend === 'DEGRADING') {
      recommendations.push('Transaction duration is trending upward - monitor for performance degradation')
    }

    if (analytics.performanceTrends.throughput.trend === 'DEGRADING') {
      recommendations.push('Throughput is declining - consider scaling or optimization')
    }

    return recommendations
  }

  // Helper methods
  private getRecentEvents(timeWindowMs: number): TransactionEvent[] {
    const cutoff = new Date(Date.now() - timeWindowMs)
    return this.events.filter(e => e.timestamp > cutoff)
  }

  private updateMetricsBuffer(key: string, value: number): void {
    const values = this.metricsBuffer.get(key) || []
    values.push(value)
    
    // Keep only recent values
    if (values.length > 1000) {
      values.splice(0, values.length - 1000)
    }
    
    this.metricsBuffer.set(key, values)
  }

  private getMetricKey(timestamp: Date): string {
    return Math.floor(timestamp.getTime() / this.config.aggregationIntervalMs).toString()
  }

  private async persistEvent(event: TransactionEvent): Promise<void> {
    if (!this.supabase) return

    try {
      await this.supabase
        .from('transaction_monitoring_events' as any)
        .insert({
          id: event.id,
          type: event.type,
          transaction_id: event.transactionId,
          timestamp: event.timestamp.toISOString(),
          duration: event.duration,
          metadata: event.metadata
        })
    } catch (error) {
      // Silent fail for monitoring events
    }
  }

  private cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000))
    this.events = this.events.filter(e => e.timestamp > cutoff)
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Performance baseline calculator
 */
class PerformanceBaseline {
  private durationHistory: number[] = []
  private throughputHistory: number[] = []
  private errorRateHistory: number[] = []
  private maxHistorySize = 1000

  update(event: TransactionEvent): void {
    if (event.duration) {
      this.durationHistory.push(event.duration)
      if (this.durationHistory.length > this.maxHistorySize) {
        this.durationHistory.shift()
      }
    }

    // Update other baselines based on event type
    // This is simplified - real implementation would be more sophisticated
  }

  getAverageTransactionDuration(): number {
    if (this.durationHistory.length === 0) return 1000 // Default baseline
    return this.durationHistory.reduce((sum, d) => sum + d, 0) / this.durationHistory.length
  }

  getAverageThroughput(): number {
    if (this.throughputHistory.length === 0) return 10 // Default baseline
    return this.throughputHistory.reduce((sum, t) => sum + t, 0) / this.throughputHistory.length
  }

  getAverageErrorRate(): number {
    if (this.errorRateHistory.length === 0) return 0.05 // Default 5% baseline
    return this.errorRateHistory.reduce((sum, e) => sum + e, 0) / this.errorRateHistory.length
  }
}

/**
 * Anomaly detection using statistical methods
 */
class AnomalyDetector {
  detectDurationAnomaly(current: number, baseline: number): AnomalyDetectionResult {
    const threshold = baseline * 2 // 2x baseline is anomalous
    const isAnomaly = current > threshold
    
    return {
      isAnomaly,
      confidence: isAnomaly ? Math.min(0.95, current / threshold - 1) : 0,
      expectedRange: { min: 0, max: threshold },
      actualValue: current,
      anomalyType: 'SPIKE',
      description: `Transaction duration ${current}ms exceeds baseline ${baseline}ms`
    }
  }

  detectThroughputAnomaly(current: number, baseline: number): AnomalyDetectionResult {
    const threshold = baseline * 0.5 // 50% of baseline is anomalous
    const isAnomaly = current < threshold
    
    return {
      isAnomaly,
      confidence: isAnomaly ? Math.min(0.95, 1 - (current / threshold)) : 0,
      expectedRange: { min: threshold, max: baseline * 2 },
      actualValue: current,
      anomalyType: 'DIP',
      description: `Throughput ${current} TPS below baseline ${baseline} TPS`
    }
  }

  detectErrorRateAnomaly(current: number, baseline: number): AnomalyDetectionResult {
    const threshold = baseline * 3 // 3x baseline error rate is anomalous
    const isAnomaly = current > threshold
    
    return {
      isAnomaly,
      confidence: isAnomaly ? Math.min(0.95, current / threshold - 1) : 0,
      expectedRange: { min: 0, max: threshold },
      actualValue: current,
      anomalyType: 'SPIKE',
      description: `Error rate ${(current * 100).toFixed(1)}% exceeds baseline ${(baseline * 100).toFixed(1)}%`
    }
  }
}

/**
 * Transaction monitoring factory
 */
export class TransactionMonitoringFactory {
  /**
   * Create production monitoring setup
   */
  static createProductionMonitor(supabase: SupabaseClient<Database>): TransactionMonitor {
    const config: MonitoringConfig = {
      enableRealTimeMetrics: true,
      metricsRetentionDays: 7,
      alertThresholds: {
        maxTransactionDurationMs: 30000, // 30 seconds
        maxErrorRate: 0.1, // 10%
        maxConcurrentTransactions: 100,
        maxDeadlockRate: 0.05, // 5%
        maxRollbackRate: 0.15, // 15%
        maxLockWaitTimeMs: 5000, // 5 seconds
        minThroughput: 1 // 1 TPS minimum
      },
      enableDetailedTracing: true,
      enablePerformanceAnalytics: true,
      enableAnomalyDetection: true,
      samplingRate: 1.0, // 100% sampling
      aggregationIntervalMs: 60000 // 1 minute
    }

    return new TransactionMonitor(config, supabase)
  }

  /**
   * Create development monitoring setup
   */
  static createDevelopmentMonitor(): TransactionMonitor {
    const config: MonitoringConfig = {
      enableRealTimeMetrics: true,
      metricsRetentionDays: 1,
      alertThresholds: {
        maxTransactionDurationMs: 60000, // 1 minute (more lenient)
        maxErrorRate: 0.3, // 30% (more lenient)
        maxConcurrentTransactions: 50,
        maxDeadlockRate: 0.1,
        maxRollbackRate: 0.3,
        maxLockWaitTimeMs: 10000,
        minThroughput: 0.1
      },
      enableDetailedTracing: false,
      enablePerformanceAnalytics: false,
      enableAnomalyDetection: false,
      samplingRate: 0.1, // 10% sampling
      aggregationIntervalMs: 300000 // 5 minutes
    }

    return new TransactionMonitor(config)
  }
}