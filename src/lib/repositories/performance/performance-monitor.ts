/**
 * Comprehensive Performance Monitor
 * Centralized performance monitoring for repositories with real-time metrics,
 * alerting, and performance optimization recommendations
 */

import { EventEmitter } from 'events'
import { Result, success, failure, RepositoryError } from '../result'
import { QueryAnalyzer } from './query-optimizer'

export interface PerformanceMetrics {
  // Query metrics
  totalQueries: number
  averageResponseTime: number
  slowQueries: number
  failedQueries: number
  
  // Cache metrics
  cacheHitRate: number
  cacheSize: number
  cacheEvictions: number
  
  // Connection metrics
  activeConnections: number
  connectionPoolUtilization: number
  connectionErrors: number
  
  // Resource metrics
  memoryUsage: number
  cpuUsage: number
  diskIO: number
  
  // Repository-specific metrics
  repositoryMetrics: Map<string, RepositoryMetrics>
  
  timestamp: Date
}

export interface RepositoryMetrics {
  name: string
  queryCount: number
  averageResponseTime: number
  errorRate: number
  cacheHitRate: number
  slowQueryCount: number
  lastActivity: Date
  topQueries: Array<{
    query: string
    count: number
    totalTime: number
    averageTime: number
  }>
}

export interface PerformanceAlert {
  id: string
  type: 'slow_query' | 'high_error_rate' | 'cache_miss' | 'connection_pool' | 'memory_usage'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  threshold: number
  currentValue: number
  repository?: string
  query?: string
  timestamp: Date
  acknowledged: boolean
  metadata?: Record<string, unknown>
}

export interface AlertRule {
  id: string
  type: PerformanceAlert['type']
  threshold: number
  enabled: boolean
  repository?: string
  cooldownMinutes: number
  lastTriggered?: Date
}

export interface PerformanceReport {
  period: {
    start: Date
    end: Date
  }
  summary: {
    totalQueries: number
    averageResponseTime: number
    errorRate: number
    cacheHitRate: number
    peakThroughput: number
    slowQueryCount: number
  }
  trends: {
    responseTimeHistory: Array<{ timestamp: Date; value: number }>
    errorRateHistory: Array<{ timestamp: Date; value: number }>
    throughputHistory: Array<{ timestamp: Date; value: number }>
  }
  topQueries: Array<{
    query: string
    count: number
    totalTime: number
    averageTime: number
    errorRate: number
  }>
  recommendations: string[]
  alerts: PerformanceAlert[]
}

/**
 * Main performance monitoring class
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics
  private queryAnalyzer: QueryAnalyzer
  private alertRules: Map<string, AlertRule> = new Map()
  private activeAlerts: Map<string, PerformanceAlert> = new Map()
  private metricsHistory: PerformanceMetrics[] = []
  private queryHistory: Array<{
    query: string
    repository: string
    startTime: Date
    endTime?: Date
    duration?: number
    error?: Error
    cached?: boolean
  }> = []
  private isMonitoring: boolean = false
  private monitoringInterval?: NodeJS.Timeout
  private readonly MAX_HISTORY_SIZE = 10000

  constructor() {
    super()
    this.queryAnalyzer = new QueryAnalyzer()
    this.metrics = this.createInitialMetrics()
    this.setupDefaultAlertRules()
  }

  /**
   * Start performance monitoring
   */
  start(options: {
    intervalMs?: number
    enableAlerting?: boolean
    historySize?: number
  } = {}): void {
    if (this.isMonitoring) return

    const { intervalMs = 30000, enableAlerting = true } = options

    this.isMonitoring = true
    
    // Collect metrics periodically
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
      
      if (enableAlerting) {
        this.checkAlertRules()
      }
      
      this.cleanupHistory()
    }, intervalMs)

    this.emit('monitoring:started')
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }

    this.emit('monitoring:stopped')
  }

  /**
   * Record query execution
   */
  recordQuery(
    query: string,
    repository: string,
    duration: number,
    error?: Error,
    cached: boolean = false
  ): void {
    const record = {
      query,
      repository,
      startTime: new Date(Date.now() - duration),
      endTime: new Date(),
      duration,
      error,
      cached
    }

    this.queryHistory.push(record)

    // Update metrics
    this.updateQueryMetrics(record)

    // Emit event
    this.emit('query:recorded', record)

    // Check for immediate alerts (slow query, error)
    this.checkImmediateAlerts(record)
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get performance report for time period
   */
  async generateReport(
    startDate: Date,
    endDate: Date
  ): Promise<Result<PerformanceReport>> {
    try {
      const periodQueries = this.queryHistory.filter(
        q => q.startTime >= startDate && q.startTime <= endDate
      )

      const summary = this.calculateSummary(periodQueries)
      const trends = this.calculateTrends(startDate, endDate)
      const topQueries = this.calculateTopQueries(periodQueries)
      const recommendations = await this.generateRecommendations(periodQueries)
      const alerts = Array.from(this.activeAlerts.values()).filter(
        alert => alert.timestamp >= startDate && alert.timestamp <= endDate
      )

      const report: PerformanceReport = {
        period: { start: startDate, end: endDate },
        summary,
        trends,
        topQueries,
        recommendations,
        alerts
      }

      return success(report)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to generate performance report', error))
    }
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule)
    this.emit('alert_rule:added', rule)
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId)
    if (removed) {
      this.emit('alert_rule:removed', { ruleId })
    }
    return removed
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId)
    if (alert) {
      alert.acknowledged = true
      this.emit('alert:acknowledged', alert)
      return true
    }
    return false
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.acknowledged)
  }

  /**
   * Get repository-specific metrics
   */
  getRepositoryMetrics(repositoryName: string): RepositoryMetrics | null {
    return this.metrics.repositoryMetrics.get(repositoryName) || null
  }

  /**
   * Clear metrics and history
   */
  reset(): void {
    this.metrics = this.createInitialMetrics()
    this.metricsHistory = []
    this.queryHistory = []
    this.activeAlerts.clear()
    this.emit('monitoring:reset')
  }

  private createInitialMetrics(): PerformanceMetrics {
    return {
      totalQueries: 0,
      averageResponseTime: 0,
      slowQueries: 0,
      failedQueries: 0,
      cacheHitRate: 0,
      cacheSize: 0,
      cacheEvictions: 0,
      activeConnections: 0,
      connectionPoolUtilization: 0,
      connectionErrors: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      diskIO: 0,
      repositoryMetrics: new Map(),
      timestamp: new Date()
    }
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'slow_query_alert',
        type: 'slow_query',
        threshold: 5000, // 5 seconds
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'high_error_rate',
        type: 'high_error_rate',
        threshold: 0.05, // 5% error rate
        enabled: true,
        cooldownMinutes: 10
      },
      {
        id: 'low_cache_hit_rate',
        type: 'cache_miss',
        threshold: 0.7, // Below 70% hit rate
        enabled: true,
        cooldownMinutes: 15
      },
      {
        id: 'connection_pool_exhaustion',
        type: 'connection_pool',
        threshold: 0.9, // 90% pool utilization
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'high_memory_usage',
        type: 'memory_usage',
        threshold: 0.85, // 85% memory usage
        enabled: true,
        cooldownMinutes: 10
      }
    ]

    defaultRules.forEach(rule => this.alertRules.set(rule.id, rule))
  }

  private collectMetrics(): void {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)
    
    // Filter recent queries
    const recentQueries = this.queryHistory.filter(q => q.startTime >= oneMinuteAgo)
    
    // Update overall metrics
    this.metrics.totalQueries = this.queryHistory.length
    this.metrics.averageResponseTime = this.calculateAverageResponseTime(recentQueries)
    this.metrics.slowQueries = recentQueries.filter(q => q.duration && q.duration > 5000).length
    this.metrics.failedQueries = recentQueries.filter(q => q.error).length
    
    const cachedQueries = recentQueries.filter(q => q.cached).length
    this.metrics.cacheHitRate = recentQueries.length > 0 ? cachedQueries / recentQueries.length : 0
    
    // Update repository-specific metrics
    this.updateRepositoryMetrics(recentQueries)
    
    this.metrics.timestamp = now
    
    // Store in history
    this.metricsHistory.push({ ...this.metrics })
    
    // Limit history size
    if (this.metricsHistory.length > this.MAX_HISTORY_SIZE / 10) {
      this.metricsHistory = this.metricsHistory.slice(-this.MAX_HISTORY_SIZE / 20)
    }

    this.emit('metrics:collected', this.metrics)
  }

  private updateQueryMetrics(record: {
    query: string
    repository: string
    duration?: number
    error?: Error
    cached?: boolean
  }): void {
    // This would be called for each query to update running totals
    // For now, we'll update in collectMetrics() instead
  }

  private updateRepositoryMetrics(queries: Array<{
    repository: string
    duration?: number
    error?: Error
    cached?: boolean
    query: string
  }>): void {
    const repositoryGroups = new Map<string, typeof queries>()
    
    // Group queries by repository
    queries.forEach(query => {
      const group = repositoryGroups.get(query.repository) || []
      group.push(query)
      repositoryGroups.set(query.repository, group)
    })

    // Calculate metrics for each repository
    repositoryGroups.forEach((repoQueries, repoName) => {
      const totalQueries = repoQueries.length
      const errorCount = repoQueries.filter(q => q.error).length
      const cachedCount = repoQueries.filter(q => q.cached).length
      const slowQueryCount = repoQueries.filter(q => q.duration && q.duration > 5000).length
      
      const totalTime = repoQueries.reduce((sum, q) => sum + (q.duration || 0), 0)
      const averageResponseTime = totalQueries > 0 ? totalTime / totalQueries : 0
      
      // Calculate top queries
      const queryGroups = new Map<string, { count: number; totalTime: number }>()
      repoQueries.forEach(q => {
        const existing = queryGroups.get(q.query) || { count: 0, totalTime: 0 }
        existing.count++
        existing.totalTime += q.duration || 0
        queryGroups.set(q.query, existing)
      })

      const topQueries = Array.from(queryGroups.entries())
        .map(([query, stats]) => ({
          query,
          count: stats.count,
          totalTime: stats.totalTime,
          averageTime: stats.totalTime / stats.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const repoMetrics: RepositoryMetrics = {
        name: repoName,
        queryCount: totalQueries,
        averageResponseTime,
        errorRate: totalQueries > 0 ? errorCount / totalQueries : 0,
        cacheHitRate: totalQueries > 0 ? cachedCount / totalQueries : 0,
        slowQueryCount,
        lastActivity: new Date(),
        topQueries
      }

      this.metrics.repositoryMetrics.set(repoName, repoMetrics)
    })
  }

  private checkAlertRules(): void {
    const now = new Date()

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownEnd = new Date(rule.lastTriggered.getTime() + rule.cooldownMinutes * 60000)
        if (now < cooldownEnd) continue
      }

      let shouldAlert = false
      let currentValue = 0
      let alertContext: Partial<PerformanceAlert> = {}

      switch (rule.type) {
        case 'slow_query':
          // Check for recent slow queries
          const recentSlowQueries = this.queryHistory
            .filter(q => q.duration && q.duration > rule.threshold && q.startTime > new Date(now.getTime() - 60000))
          shouldAlert = recentSlowQueries.length > 0
          currentValue = recentSlowQueries[0]?.duration || 0
          if (shouldAlert) {
            alertContext.query = recentSlowQueries[0].query
            alertContext.repository = recentSlowQueries[0].repository
          }
          break

        case 'high_error_rate':
          currentValue = this.metrics.failedQueries / Math.max(this.metrics.totalQueries, 1)
          shouldAlert = currentValue > rule.threshold
          break

        case 'cache_miss':
          currentValue = this.metrics.cacheHitRate
          shouldAlert = currentValue < rule.threshold
          break

        case 'connection_pool':
          currentValue = this.metrics.connectionPoolUtilization
          shouldAlert = currentValue > rule.threshold
          break

        case 'memory_usage':
          currentValue = this.metrics.memoryUsage
          shouldAlert = currentValue > rule.threshold
          break
      }

      if (shouldAlert) {
        this.triggerAlert(rule, currentValue, alertContext)
        rule.lastTriggered = now
      }
    }
  }

  private checkImmediateAlerts(record: {
    query: string
    repository: string
    duration?: number
    error?: Error
  }): void {
    // Check for slow query
    if (record.duration && record.duration > 5000) {
      const slowQueryRule = this.alertRules.get('slow_query_alert')
      if (slowQueryRule?.enabled) {
        this.triggerAlert(slowQueryRule, record.duration, {
          query: record.query,
          repository: record.repository
        })
      }
    }

    // Check for errors
    if (record.error) {
      // Could trigger error-specific alerts
      this.emit('query:error', record)
    }
  }

  private triggerAlert(
    rule: AlertRule, 
    currentValue: number, 
    context: Partial<PerformanceAlert> = {}
  ): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: rule.type,
      severity: this.calculateSeverity(rule.type, currentValue, rule.threshold),
      title: this.generateAlertTitle(rule.type),
      message: this.generateAlertMessage(rule.type, currentValue, rule.threshold),
      threshold: rule.threshold,
      currentValue,
      timestamp: new Date(),
      acknowledged: false,
      ...context
    }

    this.activeAlerts.set(alert.id, alert)
    this.emit('alert:triggered', alert)
  }

  private calculateSeverity(
    type: PerformanceAlert['type'], 
    currentValue: number, 
    threshold: number
  ): PerformanceAlert['severity'] {
    const ratio = type === 'cache_miss' ? threshold / currentValue : currentValue / threshold
    
    if (ratio >= 2) return 'critical'
    if (ratio >= 1.5) return 'high'
    if (ratio >= 1.2) return 'medium'
    return 'low'
  }

  private generateAlertTitle(type: PerformanceAlert['type']): string {
    const titles = {
      slow_query: 'Slow Query Detected',
      high_error_rate: 'High Error Rate',
      cache_miss: 'Low Cache Hit Rate',
      connection_pool: 'Connection Pool Near Capacity',
      memory_usage: 'High Memory Usage'
    }
    return titles[type]
  }

  private generateAlertMessage(
    type: PerformanceAlert['type'], 
    currentValue: number, 
    threshold: number
  ): string {
    const messages = {
      slow_query: `Query execution time (${currentValue}ms) exceeded threshold (${threshold}ms)`,
      high_error_rate: `Error rate (${(currentValue * 100).toFixed(1)}%) exceeded threshold (${(threshold * 100).toFixed(1)}%)`,
      cache_miss: `Cache hit rate (${(currentValue * 100).toFixed(1)}%) below threshold (${(threshold * 100).toFixed(1)}%)`,
      connection_pool: `Connection pool utilization (${(currentValue * 100).toFixed(1)}%) exceeded threshold (${(threshold * 100).toFixed(1)}%)`,
      memory_usage: `Memory usage (${(currentValue * 100).toFixed(1)}%) exceeded threshold (${(threshold * 100).toFixed(1)}%)`
    }
    return messages[type]
  }

  private calculateAverageResponseTime(queries: Array<{ duration?: number }>): number {
    const validQueries = queries.filter(q => q.duration)
    if (validQueries.length === 0) return 0
    
    const totalTime = validQueries.reduce((sum, q) => sum + (q.duration || 0), 0)
    return totalTime / validQueries.length
  }

  private calculateSummary(queries: Array<{
    duration?: number
    error?: Error
    cached?: boolean
  }>) {
    const totalQueries = queries.length
    const totalTime = queries.reduce((sum, q) => sum + (q.duration || 0), 0)
    const errorCount = queries.filter(q => q.error).length
    const cachedCount = queries.filter(q => q.cached).length
    const slowQueryCount = queries.filter(q => q.duration && q.duration > 5000).length

    return {
      totalQueries,
      averageResponseTime: totalQueries > 0 ? totalTime / totalQueries : 0,
      errorRate: totalQueries > 0 ? errorCount / totalQueries : 0,
      cacheHitRate: totalQueries > 0 ? cachedCount / totalQueries : 0,
      peakThroughput: 0, // Would calculate from time-based grouping
      slowQueryCount
    }
  }

  private calculateTrends(startDate: Date, endDate: Date) {
    // Would implement time-series calculation from metrics history
    return {
      responseTimeHistory: [],
      errorRateHistory: [],
      throughputHistory: []
    }
  }

  private calculateTopQueries(queries: Array<{ query: string; duration?: number; error?: Error }>) {
    const queryGroups = new Map<string, {
      count: number
      totalTime: number
      errorCount: number
    }>()

    queries.forEach(q => {
      const existing = queryGroups.get(q.query) || {
        count: 0,
        totalTime: 0,
        errorCount: 0
      }
      existing.count++
      existing.totalTime += q.duration || 0
      if (q.error) existing.errorCount++
      queryGroups.set(q.query, existing)
    })

    return Array.from(queryGroups.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        totalTime: stats.totalTime,
        averageTime: stats.totalTime / stats.count,
        errorRate: stats.errorCount / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }

  private async generateRecommendations(queries: Array<{ query: string }>): Promise<string[]> {
    const recommendations: string[] = []
    
    // Analyze queries for common patterns
    const uniqueQueries = [...new Set(queries.map(q => q.query))]
    
    if (uniqueQueries.length > 0) {
      try {
        const analysisResult = await this.queryAnalyzer.analyzeQueries(
          uniqueQueries.map(query => ({ query }))
        )
        
        if (analysisResult.success) {
          const highPriorityIssues = analysisResult.data
            .flatMap(analysis => analysis.suggestions)
            .filter(suggestion => suggestion.priority === 'high')
          
          highPriorityIssues.forEach(issue => {
            recommendations.push(issue.description)
          })
        }
      } catch (error) {
        console.warn('Failed to generate query recommendations:', error)
      }
    }
    
    // Add general recommendations based on metrics
    if (this.metrics.cacheHitRate < 0.8) {
      recommendations.push('Consider implementing more aggressive caching strategies')
    }
    
    if (this.metrics.slowQueries > 10) {
      recommendations.push('Review and optimize slow queries')
    }
    
    return recommendations
  }

  private cleanupHistory(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
    
    // Clean query history
    this.queryHistory = this.queryHistory.filter(q => q.startTime > cutoff)
    
    // Clean acknowledged alerts
    for (const [id, alert] of this.activeAlerts.entries()) {
      if (alert.acknowledged && alert.timestamp < cutoff) {
        this.activeAlerts.delete(id)
      }
    }
  }
}