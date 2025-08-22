/**
 * Performance Monitoring System
 * Tracks API calls, database queries, and component renders
 */

interface MetricData {
  route?: string
  query?: string
  component?: string
  duration: number
  timestamp: number
  userId?: string
  organizationId?: string
  errorMessage?: string
  metadata?: Record<string, any>
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
  trackAPICall(route: string, duration: number, metadata?: Record<string, any>) {
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
  trackDatabaseQuery(query: string, duration: number, metadata?: Record<string, any>) {
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
  trackComponentRender(component: string, duration: number, metadata?: Record<string, any>) {
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
  trackError(context: string, error: Error, metadata?: Record<string, any>) {
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
    const detailed: Record<string, any> = {}

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

// Global monitor instance
export const monitor = new PerformanceMonitor()

/**
 * Higher-order function to wrap API handlers with monitoring
 */
export function withMonitoring<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = Date.now()
    try {
      const result = await handler(...args)
      monitor.trackAPICall(routeName, Date.now() - start)
      return result
    } catch (error) {
      monitor.trackError(routeName, error as Error)
      throw error
    }
  }) as T
}

/**
 * React hook for component performance monitoring
 */
export function usePerformanceMonitor(componentName: string) {
  if (typeof window === 'undefined') return

  const startTime = Date.now()

  React.useEffect(() => {
    const duration = Date.now() - startTime
    monitor.trackComponentRender(componentName, duration)
  }, [componentName, startTime])
}

/**
 * Decorator for monitoring database queries
 */
export function withQueryMonitoring<T extends (...args: any[]) => Promise<any>>(
  queryFn: T,
  queryName: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = Date.now()
    try {
      const result = await queryFn(...args)
      monitor.trackDatabaseQuery(queryName, Date.now() - start)
      return result
    } catch (error) {
      monitor.trackError(`query:${queryName}`, error as Error)
      throw error
    }
  }) as T
}

// React import for the hook
import React from 'react'