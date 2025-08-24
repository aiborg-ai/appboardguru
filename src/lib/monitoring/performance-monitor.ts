/**
 * Advanced Performance Monitor
 * - Real-time performance tracking and alerting
 * - Component render performance monitoring
 * - API response time tracking
 * - Memory usage and leak detection
 * - Core Web Vitals monitoring
 */

import { logger } from '@/lib/logging/advanced-logger'

export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  tags?: Record<string, string>
  unit: 'ms' | 'bytes' | 'count' | 'percentage' | 'score'
}

export interface PerformanceAlert {
  id: string
  metric: string
  threshold: number
  actualValue: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
  component?: string
  url?: string
  userAgent?: string
}

export interface WebVitals {
  LCP: number // Largest Contentful Paint
  FID: number // First Input Delay
  CLS: number // Cumulative Layout Shift
  FCP: number // First Contentful Paint
  TTFB: number // Time to First Byte
}

export interface ComponentPerformance {
  name: string
  renderCount: number
  totalRenderTime: number
  averageRenderTime: number
  lastRenderTime: number
  propsChanges: number
  memoryUsage: number
  rerenderReasons: string[]
}

export interface ApiPerformance {
  endpoint: string
  method: string
  responseTime: number
  statusCode: number
  size: number
  timestamp: number
  error?: string
}

export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>()
  private alerts: PerformanceAlert[] = []
  private thresholds = new Map<string, number>()
  private componentMetrics = new Map<string, ComponentPerformance>()
  private apiMetrics: ApiPerformance[] = []
  private webVitals: Partial<WebVitals> = {}
  private observers = new Map<string, PerformanceObserver>()
  private alertListeners: Array<(alert: PerformanceAlert) => void> = []

  constructor() {
    this.initializeDefaultThresholds()
    // Only initialize browser-specific features on the client side
    if (typeof window !== 'undefined') {
      this.initializePerformanceObservers()
    }
    this.startPeriodicCleanup()
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count' | 'percentage' | 'score' = 'ms',
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      unit
    }

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const metricHistory = this.metrics.get(name)!
    metricHistory.push(metric)
    
    // Keep only last 1000 metrics per type
    if (metricHistory.length > 1000) {
      metricHistory.shift()
    }

    // Check thresholds and generate alerts
    this.checkThreshold(name, value, tags)

    // Log significant metrics
    if (unit === 'ms' && value > 100) {
      logger.debug(`Performance metric: ${name} = ${value}ms`, { tags })
    }
  }

  /**
   * Record component render performance
   */
  recordComponentRender(
    componentName: string,
    renderTime: number,
    propsChanged: boolean = false,
    rerenderReason?: string
  ): void {
    let component = this.componentMetrics.get(componentName)
    
    if (!component) {
      component = {
        name: componentName,
        renderCount: 0,
        totalRenderTime: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        propsChanges: 0,
        memoryUsage: 0,
        rerenderReasons: []
      }
      this.componentMetrics.set(componentName, component)
    }

    // Update metrics
    component.renderCount++
    component.totalRenderTime += renderTime
    component.averageRenderTime = component.totalRenderTime / component.renderCount
    component.lastRenderTime = renderTime
    
    if (propsChanged) {
      component.propsChanges++
    }

    if (rerenderReason) {
      component.rerenderReasons.push(rerenderReason)
      // Keep only last 10 reasons
      if (component.rerenderReasons.length > 10) {
        component.rerenderReasons.shift()
      }
    }

    // Estimate memory usage (simplified)
    if (typeof (performance as any).measureUserAgentSpecificMemory === 'function') {
      (performance as any).measureUserAgentSpecificMemory().then((result: any) => {
        component!.memoryUsage = result.bytes
      }).catch(() => {
        // Fallback to heap size estimation
        component!.memoryUsage = (performance as any).memory?.usedJSHeapSize || 0
      })
    }

    // Record as general metric
    this.recordMetric(`component_render_${componentName}`, renderTime, 'ms', {
      component: componentName,
      propsChanged: propsChanged.toString()
    })

    // Alert on slow renders
    if (renderTime > 16) { // 60fps threshold
      this.generateAlert(
        `component_slow_render`,
        16,
        renderTime,
        renderTime > 50 ? 'high' : 'medium',
        { component: componentName }
      )
    }
  }

  /**
   * Record API performance
   */
  recordApiPerformance(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    size: number = 0,
    error?: string
  ): void {
    const apiMetric: ApiPerformance = {
      endpoint,
      method,
      responseTime,
      statusCode,
      size,
      timestamp: Date.now(),
      error
    }

    this.apiMetrics.push(apiMetric)
    
    // Keep only last 1000 API metrics
    if (this.apiMetrics.length > 1000) {
      this.apiMetrics.shift()
    }

    // Record as general metric
    this.recordMetric(`api_response_time`, responseTime, 'ms', {
      endpoint,
      method,
      statusCode: statusCode.toString(),
      hasError: (!!error).toString()
    })

    // Alert on slow APIs
    const slowThreshold = endpoint.includes('/api/auth') ? 500 : 1000
    if (responseTime > slowThreshold) {
      this.generateAlert(
        'api_slow_response',
        slowThreshold,
        responseTime,
        responseTime > slowThreshold * 2 ? 'critical' : 'high',
        { endpoint, method }
      )
    }

    // Alert on errors
    if (statusCode >= 500) {
      this.generateAlert(
        'api_server_error',
        0,
        statusCode,
        'critical',
        { endpoint, method, error }
      )
    }
  }

  /**
   * Record Web Vitals
   */
  recordWebVital(name: keyof WebVitals, value: number): void {
    this.webVitals[name] = value
    this.recordMetric(`web_vital_${name.toLowerCase()}`, value, 'score')

    // Check Web Vitals thresholds
    const thresholds = {
      LCP: 2500,  // Good: < 2.5s
      FID: 100,   // Good: < 100ms
      CLS: 0.1,   // Good: < 0.1
      FCP: 1800,  // Good: < 1.8s
      TTFB: 800   // Good: < 800ms
    }

    const threshold = thresholds[name]
    if (value > threshold) {
      this.generateAlert(
        `web_vital_${name.toLowerCase()}`,
        threshold,
        value,
        value > threshold * 1.5 ? 'high' : 'medium'
      )
    }
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring(): void {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
        const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024)
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)

        this.recordMetric('memory_used', usedMB, 'bytes', { type: 'heap' })
        this.recordMetric('memory_total', totalMB, 'bytes', { type: 'heap' })
        this.recordMetric('memory_limit', limitMB, 'bytes', { type: 'heap' })

        // Alert on high memory usage
        const usagePercentage = (usedMB / limitMB) * 100
        if (usagePercentage > 80) {
          this.generateAlert(
            'high_memory_usage',
            80,
            usagePercentage,
            usagePercentage > 90 ? 'critical' : 'high'
          )
        }

        // Detect potential memory leaks
        this.detectMemoryLeaks(usedMB)
      }
    }

    checkMemory()
    setInterval(checkMemory, 30000) // Check every 30 seconds
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    webVitals: Partial<WebVitals>
    components: ComponentPerformance[]
    recentApis: ApiPerformance[]
    alerts: PerformanceAlert[]
    memoryUsage?: {
      used: number
      total: number
      percentage: number
    }
  } {
    const components = Array.from(this.componentMetrics.values())
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 20) // Top 20 slowest components

    const recentApis = this.apiMetrics
      .slice(-50) // Last 50 API calls
      .sort((a, b) => b.responseTime - a.responseTime)

    const recentAlerts = this.alerts
      .filter(alert => alert.timestamp > Date.now() - 3600000) // Last hour
      .sort((a, b) => b.timestamp - a.timestamp)

    let memoryUsage
    if ('memory' in performance) {
      const memory = (performance as any).memory
      memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      }
    }

    return {
      webVitals: this.webVitals,
      components,
      recentApis,
      alerts: recentAlerts,
      memoryUsage
    }
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(name: string, limit: number = 100): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || []
    return metrics.slice(-limit)
  }

  /**
   * Set performance threshold
   */
  setThreshold(metricName: string, threshold: number): void {
    this.thresholds.set(metricName, threshold)
    logger.info(`Performance threshold set: ${metricName} = ${threshold}`)
  }

  /**
   * Add alert listener
   */
  onAlert(listener: (alert: PerformanceAlert) => void): () => void {
    this.alertListeners.push(listener)
    return () => {
      const index = this.alertListeners.indexOf(listener)
      if (index > -1) {
        this.alertListeners.splice(index, 1)
      }
    }
  }

  /**
   * Clear all metrics and alerts
   */
  clearAll(): void {
    this.metrics.clear()
    this.alerts = []
    this.componentMetrics.clear()
    this.apiMetrics = []
    this.webVitals = {}
    logger.info('All performance metrics cleared')
  }

  // Private methods

  private initializeDefaultThresholds(): void {
    const defaults = {
      'component_render': 16,    // 60fps = 16.67ms per frame
      'api_response_time': 1000, // 1 second
      'memory_used': 100,        // 100MB
      'web_vital_lcp': 2500,     // 2.5s
      'web_vital_fid': 100,      // 100ms
      'web_vital_cls': 0.1,      // 0.1
      'bundle_size': 500000      // 500KB
    }

    for (const [name, threshold] of Object.entries(defaults)) {
      this.thresholds.set(name, threshold)
    }
  }

  private initializePerformanceObservers(): void {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    // Navigation timing observer
    if ('PerformanceObserver' in window) {
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              this.recordWebVital('TTFB', navEntry.responseStart - navEntry.requestStart)
            }
          }
        })
        navigationObserver.observe({ entryTypes: ['navigation'] })
        this.observers.set('navigation', navigationObserver)
      } catch (error) {
        logger.warn('Could not create navigation observer', error as Error)
      }

      // Paint timing observer
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.recordWebVital('FCP', entry.startTime)
            }
          }
        })
        paintObserver.observe({ entryTypes: ['paint'] })
        this.observers.set('paint', paintObserver)
      } catch (error) {
        logger.warn('Could not create paint observer', error as Error)
      }

      // Layout shift observer
      try {
        const layoutObserver = new PerformanceObserver((list) => {
          let clsValue = 0
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          if (clsValue > 0) {
            this.recordWebVital('CLS', clsValue)
          }
        })
        layoutObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.set('layout-shift', layoutObserver)
      } catch (error) {
        logger.warn('Could not create layout shift observer', error as Error)
      }
    }
  }

  private checkThreshold(metricName: string, value: number, tags?: Record<string, string>): void {
    const threshold = this.thresholds.get(metricName)
    if (threshold && value > threshold) {
      const severity: 'low' | 'medium' | 'high' | 'critical' = 
        value > threshold * 2 ? 'critical' :
        value > threshold * 1.5 ? 'high' :
        'medium'

      this.generateAlert(metricName, threshold, value, severity, tags)
    }
  }

  private generateAlert(
    metric: string,
    threshold: number,
    actualValue: number,
    severity: 'low' | 'medium' | 'high' | 'critical',
    tags?: Record<string, string>
  ): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metric,
      threshold,
      actualValue,
      severity,
      timestamp: Date.now(),
      component: tags?.component,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    }

    this.alerts.push(alert)
    
    // Keep only last 500 alerts
    if (this.alerts.length > 500) {
      this.alerts.shift()
    }

    // Notify listeners
    this.alertListeners.forEach(listener => {
      try {
        listener(alert)
      } catch (error) {
        logger.error('Alert listener error', error as Error)
      }
    })

    // Log alert
    const logLevel = severity === 'critical' ? 'error' : 
                    severity === 'high' ? 'warn' : 'info'
    
    logger[logLevel](`Performance alert: ${metric}`, undefined, {
      threshold,
      actualValue,
      severity,
      tags
    })
  }

  private detectMemoryLeaks(currentUsage: number): void {
    const memoryHistory = this.getMetrics('memory_used', 10)
    
    if (memoryHistory.length >= 5) {
      // Check if memory is consistently increasing
      const increases = memoryHistory
        .slice(1)
        .map((metric, index) => metric.value > memoryHistory[index].value)
        .filter(Boolean).length

      if (increases >= 4) { // 4 out of 5 increases
        this.generateAlert(
          'potential_memory_leak',
          0,
          currentUsage,
          'high'
        )
      }
    }
  }

  private startPeriodicCleanup(): void {
    // Clean up old data every 5 minutes
    setInterval(() => {
      const fiveMinutesAgo = Date.now() - 300000
      
      // Clean old alerts
      this.alerts = this.alerts.filter(alert => alert.timestamp > fiveMinutesAgo)
      
      // Clean old API metrics
      this.apiMetrics = this.apiMetrics.filter(api => api.timestamp > fiveMinutesAgo)
      
      logger.debug('Performance monitor cleanup completed')
    }, 300000)
  }

  /**
   * Cleanup observers on destroy
   */
  destroy(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect()
    }
    this.observers.clear()
    this.alertListeners = []
    logger.info('Performance monitor destroyed')
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Start memory monitoring automatically
if (typeof window !== 'undefined') {
  performanceMonitor.startMemoryMonitoring()
}

// Web Vitals integration
if (typeof window !== 'undefined') {
  // LCP detection
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1] as PerformancePaintTiming
    performanceMonitor.recordWebVital('LCP', lastEntry.startTime)
  })
  
  try {
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
  } catch (error) {
    // Browser doesn't support LCP
  }

  // FID detection (simplified)
  let firstInputDelay: number | null = null
  const firstInputHandler = (event: Event) => {
    if (firstInputDelay === null) {
      firstInputDelay = performance.now()
      performanceMonitor.recordWebVital('FID', firstInputDelay)
      
      // Remove listener after first input
      window.removeEventListener('click', firstInputHandler)
      window.removeEventListener('keydown', firstInputHandler)
    }
  }
  
  window.addEventListener('click', firstInputHandler)
  window.addEventListener('keydown', firstInputHandler)
}