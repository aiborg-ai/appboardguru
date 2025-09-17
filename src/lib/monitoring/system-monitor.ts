/**
 * System Monitor
 * - Application health monitoring
 * - Resource usage tracking
 * - Error rate monitoring
 * - User session analytics
 * - Real-time system alerts
 */

import { logger } from '@/lib/logging/advanced-logger'
import { performanceMonitor } from './performance-monitor'

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical'
  uptime: number
  timestamp: number
  checks: {
    database: boolean
    api: boolean
    memory: boolean
    performance: boolean
    errors: boolean
  }
  metrics: {
    activeUsers: number
    totalSessions: number
    errorRate: number
    averageResponseTime: number
    memoryUsage: number
  }
}

export interface UserSession {
  id: string
  userId?: string
  startTime: number
  lastActivity: number
  pageViews: number
  actions: number
  errors: number
  userAgent: string
  country?: string
  device: 'mobile' | 'tablet' | 'desktop'
}

export interface SystemAlert {
  id: string
  type: 'performance' | 'error' | 'security' | 'resource'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: number
  resolved: boolean
  resolvedAt?: number
  metadata?: Record<string, any>
}

export interface ResourceUsage {
  memory: {
    used: number
    total: number
    percentage: number
  }
  network: {
    requests: number
    bandwidth: number
    errors: number
  }
  storage: {
    local: number
    session: number
    indexedDB: number
  }
}

export class SystemMonitor {
  private startTime = Date.now()
  private sessions = new Map<string, UserSession>()
  private alerts: SystemAlert[] = []
  private healthChecks = new Map<string, () => Promise<boolean>>()
  private resourceMetrics: ResourceUsage = {
    memory: { used: 0, total: 0, percentage: 0 },
    network: { requests: 0, bandwidth: 0, errors: 0 },
    storage: { local: 0, session: 0, indexedDB: 0 }
  }
  private errorCounts = new Map<string, number>()
  private apiResponseTimes: number[] = []
  private monitoringInterval?: NodeJS.Timeout

  constructor() {
    this.initializeHealthChecks()
    this.startMonitoring()
    this.setupSessionTracking()
  }

  /**
   * Get current system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const checks = await this.runHealthChecks()
    const metrics = await this.collectMetrics()
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
    
    const failedChecks = Object.values(checks).filter(check => !check).length
    const criticalAlerts = this.alerts.filter(
      alert => !alert.resolved && alert.severity === 'critical'
    ).length

    if (criticalAlerts > 0 || failedChecks > 2) {
      status = 'critical'
    } else if (failedChecks > 0 || metrics.errorRate > 5) {
      status = 'degraded'
    }

    return {
      status,
      uptime: Date.now() - this.startTime,
      timestamp: Date.now(),
      checks,
      metrics
    }
  }

  /**
   * Track user session
   */
  trackUserSession(sessionId: string, userId?: string): void {
    const existingSession = this.sessions.get(sessionId)
    
    if (existingSession) {
      existingSession.lastActivity = Date.now()
      existingSession.actions++
    } else {
      const session: UserSession = {
        id: sessionId,
        userId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        pageViews: 1,
        actions: 1,
        errors: 0,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        device: this.detectDevice()
      }
      
      this.sessions.set(sessionId, session)
      logger.info('New user session started', { sessionId, userId })
    }
  }

  /**
   * Track page view
   */
  trackPageView(sessionId: string, path: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.pageViews++
      session.lastActivity = Date.now()
    }
    
    // Track popular pages
    performanceMonitor.recordMetric('page_view', 1, 'count', { path })
  }

  /**
   * Track user action
   */
  trackUserAction(sessionId: string, action: string, metadata?: Record<string, any>): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.actions++
      session.lastActivity = Date.now()
    }
    
    performanceMonitor.recordMetric('user_action', 1, 'count', { 
      action, 
      ...metadata 
    })
  }

  /**
   * Track error occurrence
   */
  trackError(
    sessionId: string, 
    error: Error, 
    context?: {
      component?: string
      api?: string
      severity?: 'low' | 'medium' | 'high' | 'critical'
    }
  ): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.errors++
    }

    // Update error counts
    const errorKey = context?.component || context?.api || 'unknown'
    const currentCount = this.errorCounts.get(errorKey) || 0
    this.errorCounts.set(errorKey, currentCount + 1)

    // Generate alert for high error rates
    if (currentCount > 10) {
      this.generateAlert(
        'error',
        'high',
        `High error rate detected: ${errorKey}`,
        { errorKey, count: currentCount, error: error.message }
      )
    }

    // Track in performance monitor
    performanceMonitor.recordMetric('error_count', 1, 'count', {
      type: error.name,
      component: context?.component,
      api: context?.api,
      severity: context?.severity || 'medium'
    })

    logger.error('Application error tracked', error, {
      sessionId,
      context
    })
  }

  /**
   * Track API response
   */
  trackApiResponse(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    size?: number
  ): void {
    this.apiResponseTimes.push(responseTime)
    
    // Keep only last 100 response times
    if (this.apiResponseTimes.length > 100) {
      this.apiResponseTimes.shift()
    }

    // Track network metrics
    this.resourceMetrics.network.requests++
    if (size) {
      this.resourceMetrics.network.bandwidth += size
    }
    if (statusCode >= 400) {
      this.resourceMetrics.network.errors++
    }

    // Use performance monitor for detailed tracking
    performanceMonitor.recordApiPerformance(
      endpoint,
      method,
      responseTime,
      statusCode,
      size || 0,
      statusCode >= 400 ? `HTTP ${statusCode}` : undefined
    )
  }

  /**
   * Add custom health check
   */
  addHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check)
    logger.info(`Health check added: ${name}`)
  }

  /**
   * Generate system alert
   */
  generateAlert(
    type: 'performance' | 'error' | 'security' | 'resource',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    metadata?: Record<string, any>
  ): void {
    const alert: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      timestamp: Date.now(),
      resolved: false,
      metadata
    }

    this.alerts.push(alert)
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.shift()
    }

    // Log alert
    const logLevel = severity === 'critical' ? 'error' : 
                    severity === 'high' ? 'warn' : 'info'
    
    logger[logLevel](`System alert: ${message}`, undefined, {
      type,
      severity,
      metadata
    })

    // Auto-resolve low priority alerts after 1 hour
    if (severity === 'low') {
      setTimeout(() => {
        this.resolveAlert(alert.id)
      }, 3600000)
    }
  }

  /**
   * Resolve system alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = Date.now()
      
      logger.info(`System alert resolved: ${alert.message}`, {
        alertId,
        resolutionTime: alert.resolvedAt - alert.timestamp
      })
    }
  }

  /**
   * Get active user sessions
   */
  getActiveSessions(): UserSession[] {
    const fiveMinutesAgo = Date.now() - 300000
    
    return Array.from(this.sessions.values())
      .filter(session => session.lastActivity > fiveMinutesAgo)
      .sort((a, b) => b.lastActivity - a.lastActivity)
  }

  /**
   * Get system alerts
   */
  getAlerts(includeResolved: boolean = false): SystemAlert[] {
    return this.alerts
      .filter(alert => includeResolved || !alert.resolved)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Get resource usage
   */
  getResourceUsage(): ResourceUsage {
    this.updateResourceMetrics()
    return { ...this.resourceMetrics }
  }

  /**
   * Get system statistics
   */
  getSystemStatistics(): {
    sessions: {
      active: number
      total: number
      averageDuration: number
      topPages: Array<{ path: string; views: number }>
    }
    errors: {
      total: number
      byType: Record<string, number>
      errorRate: number
    }
    performance: {
      averageResponseTime: number
      slowEndpoints: number
      memoryUsage: number
    }
  } {
    const activeSessions = this.getActiveSessions()
    const totalErrors = Array.from(this.errorCounts.values())
      .reduce((sum, count) => sum + count, 0)
    
    const averageResponseTime = this.apiResponseTimes.length > 0
      ? this.apiResponseTimes.reduce((sum, time) => sum + time, 0) / this.apiResponseTimes.length
      : 0

    const slowEndpoints = this.apiResponseTimes.filter(time => time > 1000).length

    return {
      sessions: {
        active: activeSessions.length,
        total: this.sessions.size,
        averageDuration: this.calculateAverageSessionDuration(),
        topPages: this.getTopPages()
      },
      errors: {
        total: totalErrors,
        byType: Object.fromEntries(this.errorCounts.entries()),
        errorRate: this.calculateErrorRate()
      },
      performance: {
        averageResponseTime,
        slowEndpoints,
        memoryUsage: this.resourceMetrics.memory.percentage
      }
    }
  }

  /**
   * Export system data for analysis
   */
  exportSystemData(): {
    health: SystemHealth
    sessions: UserSession[]
    alerts: SystemAlert[]
    statistics: ReturnType<typeof this.getSystemStatistics>
    exportedAt: number
  } {
    return {
      health: this.getSystemHealth() as any, // Will be resolved async
      sessions: Array.from(this.sessions.values()),
      alerts: this.alerts,
      statistics: this.getSystemStatistics(),
      exportedAt: Date.now()
    }
  }

  // Private methods

  private initializeHealthChecks(): void {
    // Database health check
    this.addHealthCheck('database', async () => {
      // Simple connectivity test - would be replaced with actual DB ping
      return true
    })

    // API health check
    this.addHealthCheck('api', async () => {
      const recentApiErrors = this.resourceMetrics.network.errors
      const recentApiRequests = this.resourceMetrics.network.requests
      
      if (recentApiRequests === 0) return true
      return (recentApiErrors / recentApiRequests) < 0.1 // Less than 10% error rate
    })

    // Memory health check
    this.addHealthCheck('memory', async () => {
      return this.resourceMetrics.memory.percentage < 90
    })

    // Performance health check
    this.addHealthCheck('performance', async () => {
      const avgResponseTime = this.apiResponseTimes.length > 0
        ? this.apiResponseTimes.reduce((sum, time) => sum + time, 0) / this.apiResponseTimes.length
        : 0
      return avgResponseTime < 2000 // Less than 2 seconds
    })

    // Error rate health check
    this.addHealthCheck('errors', async () => {
      return this.calculateErrorRate() < 5 // Less than 5% error rate
    })
  }

  private async runHealthChecks(): Promise<SystemHealth['checks']> {
    const checks: SystemHealth['checks'] = {
      database: false,
      api: false,
      memory: false,
      performance: false,
      errors: false
    }

    for (const [name, check] of this.healthChecks.entries()) {
      try {
        checks[name as keyof SystemHealth['checks']] = await check()
      } catch (error) {
        logger.error(`Health check failed: ${name}`, error as Error)
        checks[name as keyof SystemHealth['checks']] = false
      }
    }

    return checks
  }

  private async collectMetrics(): Promise<SystemHealth['metrics']> {
    const activeSessions = this.getActiveSessions()
    const totalErrors = Array.from(this.errorCounts.values())
      .reduce((sum, count) => sum + count, 0)
    
    const averageResponseTime = this.apiResponseTimes.length > 0
      ? this.apiResponseTimes.reduce((sum, time) => sum + time, 0) / this.apiResponseTimes.length
      : 0

    return {
      activeUsers: activeSessions.length,
      totalSessions: this.sessions.size,
      errorRate: this.calculateErrorRate(),
      averageResponseTime,
      memoryUsage: this.resourceMetrics.memory.percentage
    }
  }

  private updateResourceMetrics(): void {
    // Update memory metrics
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      this.resourceMetrics.memory = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      }
    }

    // Update storage metrics
    if (typeof window !== 'undefined') {
      try {
        this.resourceMetrics.storage = {
          local: this.estimateStorageSize(localStorage),
          session: this.estimateStorageSize(sessionStorage),
          indexedDB: 0 // Would need async calculation
        }
      } catch (error) {
        logger.debug('Could not calculate storage metrics', error as Error)
      }
    }
  }

  private estimateStorageSize(storage: Storage): number {
    let size = 0
    try {
      for (const key in storage) {
        if (storage.hasOwnProperty(key)) {
          size += storage.getItem(key)?.length || 0
        }
      }
    } catch (error) {
      // Storage not accessible
    }
    return Math.round(size / 1024) // KB
  }

  private detectDevice(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop'
    
    const userAgent = navigator.userAgent
    const isMobile = /iPhone|iPod|Android|BlackBerry|Opera Mini|IEMobile/i.test(userAgent)
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent)
    
    return isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  }

  private setupSessionTracking(): void {
    if (typeof window !== 'undefined') {
      // Track page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // User switched away
          performanceMonitor.recordMetric('page_hidden', 1, 'count')
        } else {
          // User returned
          performanceMonitor.recordMetric('page_visible', 1, 'count')
        }
      })

      // Track page unload
      window.addEventListener('beforeunload', () => {
        const activeSessions = this.getActiveSessions()
        logger.info('Page unload', {
          activeSessions: activeSessions.length,
          uptime: Date.now() - this.startTime
        })
      })
    }
  }

  private startMonitoring(): void {
    // Run monitoring tasks every minute
    this.monitoringInterval = setInterval(async () => {
      // Clean up old sessions
      this.cleanupOldSessions()
      
      // Update resource metrics
      this.updateResourceMetrics()
      
      // Check for anomalies
      await this.checkForAnomalies()
      
      // Reset hourly counters
      if (Date.now() % 3600000 < 60000) { // Every hour
        this.resetHourlyCounters()
      }
      
    }, 60000) // Every minute
  }

  private cleanupOldSessions(): void {
    const thirtyMinutesAgo = Date.now() - 1800000
    let cleanedCount = 0
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < thirtyMinutesAgo) {
        this.sessions.delete(sessionId)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} inactive sessions`)
    }
  }

  private async checkForAnomalies(): void {
    // Check for memory leaks
    if (this.resourceMetrics.memory.percentage > 85) {
      this.generateAlert(
        'resource',
        'high',
        `High memory usage: ${this.resourceMetrics.memory.percentage}%`,
        { memoryUsage: this.resourceMetrics.memory }
      )
    }

    // Check for high error rates
    const errorRate = this.calculateErrorRate()
    if (errorRate > 10) {
      this.generateAlert(
        'error',
        'critical',
        `Critical error rate: ${errorRate}%`,
        { errorRate, totalErrors: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0) }
      )
    }

    // Check for slow API responses
    const avgResponseTime = this.apiResponseTimes.length > 0
      ? this.apiResponseTimes.reduce((sum, time) => sum + time, 0) / this.apiResponseTimes.length
      : 0
      
    if (avgResponseTime > 3000) {
      this.generateAlert(
        'performance',
        'high',
        `Slow API responses: ${Math.round(avgResponseTime)}ms average`,
        { averageResponseTime: avgResponseTime }
      )
    }
  }

  private resetHourlyCounters(): void {
    this.errorCounts.clear()
    this.apiResponseTimes = []
    this.resourceMetrics.network = { requests: 0, bandwidth: 0, errors: 0 }
    
    logger.info('Hourly counters reset')
  }

  private calculateErrorRate(): number {
    const totalErrors = Array.from(this.errorCounts.values())
      .reduce((sum, count) => sum + count, 0)
    const totalRequests = this.resourceMetrics.network.requests || 1
    
    return Math.round((totalErrors / totalRequests) * 100)
  }

  private calculateAverageSessionDuration(): number {
    const sessions = Array.from(this.sessions.values())
    if (sessions.length === 0) return 0
    
    const totalDuration = sessions.reduce((sum, session) => {
      return sum + (session.lastActivity - session.startTime)
    }, 0)
    
    return Math.round(totalDuration / sessions.length / 1000) // seconds
  }

  private getTopPages(): Array<{ path: string; views: number }> {
    // This would typically come from actual page view tracking
    // For now, return empty array
    return []
  }

  /**
   * Clean up monitoring resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    this.sessions.clear()
    this.alerts = []
    this.healthChecks.clear()
    
    logger.info('System monitor destroyed')
  }
}

// Export singleton instance
export const systemMonitor = new SystemMonitor()

// Auto-start session tracking in browser
if (typeof window !== 'undefined') {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  systemMonitor.trackUserSession(sessionId)
  
  // Store session ID for use across the app
  ;(window as any).__APP_SESSION_ID = sessionId
}