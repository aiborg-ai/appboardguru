/**
 * Monitoring System Initialization
 * Initializes all monitoring and performance tracking systems
 */

import { initializeTelemetry } from '@/lib/telemetry'
import { monitor } from '@/lib/monitoring'

interface MonitoringConfig {
  enableTelemetry: boolean
  enablePerformanceTracking: boolean
  enableErrorTracking: boolean
  environment: string
  serviceName: string
}

/**
 * Initialize comprehensive monitoring system
 */
export function initializeMonitoring(config: Partial<MonitoringConfig> = {}) {
  const finalConfig: MonitoringConfig = {
    enableTelemetry: process.env.NODE_ENV === 'production',
    enablePerformanceTracking: true,
    enableErrorTracking: true,
    environment: process.env.NODE_ENV || 'development',
    serviceName: 'appboardguru',
    ...config
  }

  console.log('Initializing monitoring systems...', finalConfig)

  try {
    // Initialize OpenTelemetry if enabled
    if (finalConfig.enableTelemetry && typeof window === 'undefined') {
      initializeTelemetry()
    }

    // Initialize client-side monitoring
    if (typeof window !== 'undefined') {
      initializeClientSideMonitoring(finalConfig)
    }

    // Initialize server-side monitoring
    if (typeof window === 'undefined') {
      initializeServerSideMonitoring(finalConfig)
    }

    console.log('Monitoring systems initialized successfully')
  } catch (error) {
    console.error('Failed to initialize monitoring:', error)
  }
}

/**
 * Initialize client-side monitoring
 */
function initializeClientSideMonitoring(config: MonitoringConfig) {
  // Performance Observer for Core Web Vitals
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              monitor.trackComponentRender('fcp', entry.startTime, { type: 'paint' })
            }
            break
          
          case 'largest-contentful-paint':
            monitor.trackComponentRender('lcp', entry.startTime, { type: 'paint' })
            break
          
          case 'first-input':
            const fid = (entry as any).processingStart - entry.startTime
            monitor.trackComponentRender('fid', fid, { type: 'input' })
            break
          
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              monitor.trackComponentRender('cls', (entry as any).value, { type: 'layout' })
            }
            break
          
          case 'resource':
            const resourceEntry = entry as PerformanceResourceTiming
            if (resourceEntry.duration > 1000) {
              monitor.trackAPICall(
                `resource:${resourceEntry.name.split('/').pop()}`, 
                resourceEntry.duration,
                {
                  type: 'resource',
                  size: resourceEntry.transferSize,
                  cached: resourceEntry.transferSize === 0
                }
              )
            }
            break
        }
      })
    })

    observer.observe({ 
      entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'resource'] 
    })
  }

  // Global error handling
  if (config.enableErrorTracking) {
    window.addEventListener('error', (event) => {
      monitor.trackError('global-error', event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      monitor.trackError('unhandled-rejection', new Error(event.reason), {
        promise: true
      })
    })
  }

  // Memory monitoring
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory
      const memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024)
      }
      
      // Log memory warnings
      if (memoryUsage.used > 50) {
        console.warn(`High memory usage detected: ${memoryUsage.used}MB`)
      }
    }, 30000) // Every 30 seconds
  }

  // Network connection monitoring
  if ('connection' in navigator) {
    const connection = (navigator as any).connection
    monitor.trackAPICall('network-info', 0, {
      type: 'connection',
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    })
  }
}

/**
 * Initialize server-side monitoring
 */
function initializeServerSideMonitoring(config: MonitoringConfig) {
  // Process monitoring
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    monitor.trackError('uncaught-exception', error)
    
    // Give time for logging before exit
    setTimeout(() => {
      process.exit(1)
    }, 1000)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    monitor.trackError('unhandled-rejection', new Error(String(reason)))
  })

  // Memory usage monitoring
  setInterval(() => {
    const memUsage = process.memoryUsage()
    const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024)
    const heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024)
    const external = Math.round(memUsage.external / 1024 / 1024)
    
    if (heapUsed > 200) { // 200MB threshold
      console.warn(`High server memory usage: ${heapUsed}MB heap, ${external}MB external`)
    }
  }, 60000) // Every minute

  // CPU monitoring (basic)
  setInterval(() => {
    const cpuUsage = process.cpuUsage()
    monitor.trackAPICall('cpu-usage', 0, {
      type: 'system',
      userTime: cpuUsage.user,
      systemTime: cpuUsage.system
    })
  }, 60000) // Every minute
}

/**
 * Create monitoring middleware for API routes
 */
export function createMonitoringMiddleware() {
  return {
    before: (req: Request) => {
      const startTime = Date.now()
      
      // Add start time to request context
      ;(req as any)._monitoringStart = startTime
      
      // Track request start
      monitor.trackAPICall(
        new URL(req.url).pathname, 
        0, 
        { 
          method: req.method,
          phase: 'start'
        }
      )
    },
    
    after: (req: Request, res: Response) => {
      const startTime = (req as any)._monitoringStart
      if (!startTime) return
      
      const duration = Date.now() - startTime
      const pathname = new URL(req.url).pathname
      
      // Track request completion
      monitor.trackAPICall(pathname, duration, {
        method: req.method,
        status: res.status,
        phase: 'complete'
      })
      
      // Log slow requests
      if (duration > 2000) {
        console.warn(`Slow API request: ${req.method} ${pathname} - ${duration}ms`)
      }
    },
    
    error: (req: Request, error: Error) => {
      const startTime = (req as any)._monitoringStart
      const duration = startTime ? Date.now() - startTime : 0
      const pathname = new URL(req.url).pathname
      
      // Track error
      monitor.trackError(`api:${pathname}`, error, {
        method: req.method,
        duration,
        url: req.url
      })
    }
  }
}

/**
 * Performance optimization recommendations
 */
export function getPerformanceRecommendations() {
  const stats = monitor.getStats()
  const recommendations: string[] = []

  // API performance recommendations
  if (stats.apiCalls.averageDuration > 1000) {
    recommendations.push('Consider optimizing slow API endpoints (>1s average)')
  }

  // Database performance recommendations
  if (stats.dbQueries.averageDuration > 500) {
    recommendations.push('Consider adding database indexes for slow queries (>500ms average)')
  }

  // Component performance recommendations
  if (stats.components.averageDuration > 100) {
    recommendations.push('Consider optimizing slow component renders (>100ms average)')
  }

  // Error rate recommendations
  if (stats.errors > 10) {
    recommendations.push('High error rate detected - review error logs and implement fixes')
  }

  return recommendations
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeMonitoring())
  } else {
    initializeMonitoring()
  }
}

// Auto-initialize on server
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  initializeMonitoring()
}