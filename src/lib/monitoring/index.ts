/**
 * Comprehensive Monitoring System
 * - Performance monitoring (API calls, database queries, component renders)
 * - System health monitoring
 * - Business metrics and user engagement tracking
 * - Real-time alerts and reporting
 */

export { performanceMonitor } from './performance-monitor'
export type { 
  PerformanceMetric, 
  PerformanceAlert, 
  WebVitals, 
  ComponentPerformance,
  ApiPerformance 
} from './performance-monitor'

export { systemMonitor } from './system-monitor'
export type { 
  SystemHealth, 
  UserSession, 
  SystemAlert, 
  ResourceUsage 
} from './system-monitor'

export { businessMetrics } from './business-metrics'
export type { 
  UserEngagement, 
  FeatureUsage, 
  ConversionFunnel, 
  BusinessKPI,
  ABTestResult,
  UserRetention 
} from './business-metrics'

import { performanceMonitor } from './performance-monitor'
import { systemMonitor } from './system-monitor'
import { businessMetrics } from './business-metrics'
import { logger } from '@/lib/logging/advanced-logger'

interface MetricData {
  route?: string
  query?: string
  component?: string
  duration: number
  timestamp: number
  userId?: string
  organizationId?: string
  errorMessage?: string
  metadata?: Record<string, unknown>
}

interface PerformanceMetrics {
  apiCalls: Map<string, number[]>
  dbQueries: Map<string, number[]>
  components: Map<string, number[]>
  errors: MetricData[]
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    apiCalls: new Map(),
    dbQueries: new Map(),
    components: new Map(),
    errors: []
  }

  private maxStoredMetrics = 1000
  private flushInterval = 60000 // 1 minute

  constructor() {
    // Flush metrics periodically
    if (typeof window === 'undefined') {
      setInterval(() => this.flush(), this.flushInterval)
    }
  }

  /**
   * Track API call performance
   */
  trackAPICall(route: string, duration: number, metadata?: Record<string, unknown>) {
    this.addMetric('apiCalls', route, duration)
    
    // Log slow API calls
    if (duration > 1000) {
      console.warn(`Slow API call detected: ${route} took ${duration}ms`, metadata)
    }

    this.logMetric({
      route,
      duration,
      timestamp: Date.now(),
      metadata
    })
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(query: string, duration: number, metadata?: Record<string, unknown>) {
    // Normalize query for grouping
    const normalizedQuery = this.normalizeQuery(query)
    this.addMetric('dbQueries', normalizedQuery, duration)

    // Log slow queries
    if (duration > 500) {
      console.warn(`Slow database query detected: ${normalizedQuery} took ${duration}ms`)
    }

    this.logMetric({
      query: normalizedQuery,
      duration,
      timestamp: Date.now(),
      metadata
    })
  }

  /**
   * Track component render performance
   */
  trackComponentRender(component: string, duration: number, metadata?: Record<string, unknown>) {
    this.addMetric('components', component, duration)

    // Log slow renders
    if (duration > 100) {
      console.warn(`Slow component render detected: ${component} took ${duration}ms`)
    }

    this.logMetric({
      component,
      duration,
      timestamp: Date.now(),
      metadata
    })
  }

  /**
   * Track errors
   */
  trackError(context: string, error: Error, metadata?: Record<string, unknown>) {
    const errorData: MetricData = {
      route: context,
      duration: 0,
      timestamp: Date.now(),
      errorMessage: error.message,
      metadata: {
        stack: error.stack,
        ...metadata
      }
    }

    this.metrics.errors.push(errorData)
    
    // Keep only recent errors
    if (this.metrics.errors.length > this.maxStoredMetrics) {
      this.metrics.errors = this.metrics.errors.slice(-this.maxStoredMetrics / 2)
    }

    console.error(`Error in ${context}:`, error, metadata)
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      apiCalls: this.getMetricStats('apiCalls'),
      dbQueries: this.getMetricStats('dbQueries'),
      components: this.getMetricStats('components'),
      errors: this.metrics.errors.length
    }
  }

  /**
   * Get detailed metrics for a specific category
   */
  getDetailedStats(category: keyof PerformanceMetrics) {
    if (category === 'errors') {
      return this.metrics.errors.slice(-100) // Last 100 errors
    }

    const metrics = this.metrics[category] as Map<string, number[]>
    const detailed: Record<string, unknown> = {}

    for (const [key, values] of metrics.entries()) {
      detailed[key] = {
        count: values.length,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p95: this.calculatePercentile(values, 0.95),
        p99: this.calculatePercentile(values, 0.99)
      }
    }

    return detailed
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = {
      apiCalls: new Map(),
      dbQueries: new Map(),
      components: new Map(),
      errors: []
    }
  }

  private addMetric(category: 'apiCalls' | 'dbQueries' | 'components', key: string, duration: number) {
    if (!this.metrics[category].has(key)) {
      this.metrics[category].set(key, [])
    }

    const values = this.metrics[category].get(key)!
    values.push(duration)

    // Keep only recent metrics to prevent memory leaks
    if (values.length > this.maxStoredMetrics) {
      values.splice(0, values.length - this.maxStoredMetrics / 2)
    }
  }

  private getMetricStats(category: 'apiCalls' | 'dbQueries' | 'components') {
    const metrics = this.metrics[category]
    let totalCount = 0
    let totalDuration = 0

    for (const values of metrics.values()) {
      totalCount += values.length
      totalDuration += values.reduce((a, b) => a + b, 0)
    }

    return {
      totalCalls: totalCount,
      averageDuration: totalCount > 0 ? totalDuration / totalCount : 0,
      uniqueEndpoints: metrics.size
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil(sorted.length * percentile) - 1
    return sorted[index] || 0
  }

  private normalizeQuery(query: string): string {
    // Remove specific values to group similar queries
    return query
      .replace(/\$\d+/g, '$?') // Replace parameter placeholders
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/'[^']*'/g, "'?'") // Replace string literals
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  private logMetric(data: MetricData) {
    // In production, send to monitoring service
    if (process.env['NODE_ENV'] === 'production') {
      // TODO: Send to monitoring service (e.g., DataDog, New Relic)
      // this.sendToMonitoringService(data)
    }
  }

  private flush() {
    const stats = this.getStats()
    console.log('Performance metrics:', stats)
    
    // In production, flush to monitoring service
    if (process.env['NODE_ENV'] === 'production') {
      // TODO: Flush to monitoring service
      // this.flushToMonitoringService(stats)
    }
  }
}

// Legacy monitor instance (backwards compatibility)
export const monitor = new PerformanceMonitor()

/**
 * Unified Monitoring Dashboard
 */
export class MonitoringDashboard {
  private initialized = false

  /**
   * Initialize all monitoring systems
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      logger.info('Initializing monitoring dashboard...')

      // Set up cross-system integrations
      this.setupIntegrations()

      // Set up alert routing
      this.setupAlertRouting()

      this.initialized = true
      logger.info('Monitoring dashboard initialized successfully')

    } catch (error) {
      logger.error('Failed to initialize monitoring dashboard', error as Error)
      throw error
    }
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<{
    health: ReturnType<typeof systemMonitor.getSystemHealth>
    performance: ReturnType<typeof performanceMonitor.getPerformanceSummary>
    business: ReturnType<typeof businessMetrics.exportMetrics>
    timestamp: number
  }> {
    return {
      health: await systemMonitor.getSystemHealth(),
      performance: performanceMonitor.getPerformanceSummary(),
      business: businessMetrics.exportMetrics(),
      timestamp: Date.now()
    }
  }

  private setupIntegrations(): void {
    // Forward performance alerts to system monitor
    performanceMonitor.onAlert((alert) => {
      systemMonitor.generateAlert(
        'performance',
        alert.severity,
        `Performance issue: ${alert.metric} exceeded threshold`,
        {
          metric: alert.metric,
          threshold: alert.threshold,
          actualValue: alert.actualValue,
          component: alert.component,
          url: alert.url
        }
      )
    })

    logger.info('Monitoring system integrations established')
  }

  private setupAlertRouting(): void {
    logger.info('Alert routing configured')
  }
}

// Export singleton dashboard instance
export const monitoringDashboard = new MonitoringDashboard()

// Auto-initialize in browser environments
if (typeof window !== 'undefined') {
  monitoringDashboard.initialize().catch(error => {
    logger.error('Failed to auto-initialize monitoring dashboard', error)
  })
}

/**
 * Enhanced API handler monitoring with new system integration
 */
export function withMonitoring<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = Date.now()
    try {
      const result = await handler(...args)
      const duration = Date.now() - start
      
      // Track with legacy system
      monitor.trackAPICall(routeName, duration)
      
      // Track with new performance monitor
      performanceMonitor.recordApiPerformance(
        routeName,
        'unknown', // method would need to be passed
        duration,
        200, // success status
        JSON.stringify(result).length
      )
      
      return result
    } catch (error) {
      const duration = Date.now() - start
      
      // Track with legacy system
      monitor.trackError(routeName, error as Error)
      
      // Track with new systems
      performanceMonitor.recordApiPerformance(
        routeName,
        'unknown',
        duration,
        500, // error status
        0,
        (error as Error).message
      )
      
      const sessionId = (globalThis as any).__APP_SESSION_ID || 'unknown'
      systemMonitor.trackError(sessionId, error as Error, {
        api: routeName,
        severity: 'medium'
      })
      
      throw error
    }
  }) as T
}

/**
 * Enhanced React hook for component performance monitoring
 */
export function usePerformanceMonitor(componentName: string) {
  if (typeof window === 'undefined') return

  const startTime = Date.now()

  React.useEffect(() => {
    const duration = Date.now() - startTime
    
    // Track with legacy system
    monitor.trackComponentRender(componentName, duration)
    
    // Track with new performance monitor
    performanceMonitor.recordComponentRender(componentName, duration)
    
  }, [componentName, startTime])
}

/**
 * Enhanced decorator for monitoring database queries
 */
export function withQueryMonitoring<T extends (...args: any[]) => Promise<any>>(
  queryFn: T,
  queryName: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = Date.now()
    try {
      const result = await queryFn(...args)
      const duration = Date.now() - start
      
      // Track with legacy system
      monitor.trackDatabaseQuery(queryName, duration)
      
      // Track with new performance monitor
      performanceMonitor.recordMetric(`db_query_${queryName}`, duration, 'ms', {
        query: queryName,
        success: 'true'
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - start
      
      // Track with legacy system
      monitor.trackError(`query:${queryName}`, error as Error)
      
      // Track with new systems
      performanceMonitor.recordMetric(`db_query_${queryName}`, duration, 'ms', {
        query: queryName,
        success: 'false',
        error: (error as Error).message
      })
      
      throw error
    }
  }) as T
}

/**
 * Convenience functions for common monitoring tasks
 */

// Track user actions across the app
export const trackUserAction = (action: string, properties?: Record<string, any>) => {
  const sessionId = (globalThis as any)?.__APP_SESSION_ID || 'unknown'
  const userId = 'anonymous' // Would get from auth context
  
  systemMonitor.trackUserAction(sessionId, action, properties)
  businessMetrics.trackEngagement(userId, sessionId, action, properties)
}

// Track feature usage
export const trackFeature = (feature: string, sessionTime?: number) => {
  const sessionId = (globalThis as any)?.__APP_SESSION_ID || 'unknown'
  const userId = 'anonymous' // Would get from auth context
  
  businessMetrics.trackFeatureUsage(userId, sessionId, feature, sessionTime)
}

// Track conversions
export const trackConversion = (funnel: string, step: string) => {
  const sessionId = (globalThis as any)?.__APP_SESSION_ID || 'unknown'
  const userId = 'anonymous' // Would get from auth context
  
  businessMetrics.trackConversion(userId, sessionId, funnel, step)
}

// Track errors with context
export const trackError = (error: Error, context?: {
  component?: string
  api?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}) => {
  const sessionId = (globalThis as any)?.__APP_SESSION_ID || 'unknown'
  
  systemMonitor.trackError(sessionId, error, context)
}

// React import for the hook
import React from 'react'