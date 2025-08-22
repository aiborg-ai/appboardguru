/**
 * Performance Monitoring React Hook
 * Provides comprehensive client-side performance tracking
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import { monitor } from '@/lib/monitoring'
import { telemetry } from '@/lib/telemetry'

interface PerformanceMetrics {
  renderTime: number
  reRenderCount: number
  memorUsage?: {
    used: number
    total: number
  }
  networkRequests: number
  errorCount: number
}

interface UsePerformanceMonitoringOptions {
  componentName: string
  trackRenders?: boolean
  trackMemory?: boolean
  trackNetwork?: boolean
  trackErrors?: boolean
  thresholds?: {
    renderTime?: number
    memoryUsage?: number
    reRenderCount?: number
  }
}

export function usePerformanceMonitoring({
  componentName,
  trackRenders = true,
  trackMemory = false,
  trackNetwork = false,
  trackErrors = true,
  thresholds = {}
}: UsePerformanceMonitoringOptions) {
  const renderStartTime = useRef<number>(Date.now())
  const renderCount = useRef<number>(0)
  const networkRequestCount = useRef<number>(0)
  const errorCount = useRef<number>(0)
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    reRenderCount: 0,
    networkRequests: 0,
    errorCount: 0
  })

  // Track component renders
  useEffect(() => {
    if (!trackRenders) return

    const renderTime = Date.now() - renderStartTime.current
    renderCount.current++
    
    // Update metrics
    setMetrics(prev => ({
      ...prev,
      renderTime,
      reRenderCount: renderCount.current
    }))

    // Record telemetry
    monitor.trackComponentRender(componentName, renderTime, {
      renderCount: renderCount.current
    })

    telemetry.recordComponentRender(componentName, renderTime)

    // Check thresholds
    if (thresholds.renderTime && renderTime > thresholds.renderTime) {
      console.warn(`Component ${componentName} render time exceeded threshold: ${renderTime}ms > ${thresholds.renderTime}ms`)
    }

    if (thresholds.reRenderCount && renderCount.current > thresholds.reRenderCount) {
      console.warn(`Component ${componentName} re-render count exceeded threshold: ${renderCount.current} > ${thresholds.reRenderCount}`)
    }
  })

  // Track memory usage
  useEffect(() => {
    if (!trackMemory || typeof window === 'undefined' || !('memory' in performance)) return

    const measureMemory = () => {
      const memory = (performance as any).memory
      const memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) // MB
      }

      setMetrics(prev => ({
        ...prev,
        memorUsage: memoryUsage
      }))

      // Check memory threshold
      if (thresholds.memoryUsage && memoryUsage.used > thresholds.memoryUsage) {
        console.warn(`Component ${componentName} memory usage exceeded threshold: ${memoryUsage.used}MB > ${thresholds.memoryUsage}MB`)
      }
    }

    const interval = setInterval(measureMemory, 5000) // Every 5 seconds
    measureMemory() // Initial measurement

    return () => clearInterval(interval)
  }, [componentName, trackMemory, thresholds.memoryUsage])

  // Track network requests
  useEffect(() => {
    if (!trackNetwork || typeof window === 'undefined') return

    const originalFetch = window.fetch
    let requestCount = 0

    window.fetch = async (...args) => {
      requestCount++
      networkRequestCount.current = requestCount
      
      setMetrics(prev => ({
        ...prev,
        networkRequests: requestCount
      }))

      const startTime = Date.now()
      
      try {
        const response = await originalFetch(...args)
        const duration = Date.now() - startTime
        
        // Track network performance
        telemetry.recordBusinessMetric('network_request', 1, {
          component: componentName,
          status: response.status,
          duration
        })

        return response
      } catch (error) {
        const duration = Date.now() - startTime
        
        // Track network errors
        telemetry.recordError(error as Error)
        errorCount.current++
        
        setMetrics(prev => ({
          ...prev,
          errorCount: errorCount.current
        }))

        throw error
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [componentName, trackNetwork])

  // Error tracking
  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    if (!trackErrors) return

    errorCount.current++
    
    setMetrics(prev => ({
      ...prev,
      errorCount: errorCount.current
    }))

    monitor.trackError(`component:${componentName}`, error, {
      context,
      renderCount: renderCount.current,
      metrics
    })

    telemetry.recordError(error)
  }, [componentName, trackErrors, metrics])

  // Performance mark utilities
  const mark = useCallback((markName: string) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${componentName}-${markName}`)
    }
  }, [componentName])

  const measure = useCallback((measureName: string, startMark: string, endMark?: string) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const fullStartMark = `${componentName}-${startMark}`
      const fullEndMark = endMark ? `${componentName}-${endMark}` : undefined
      
      try {
        performance.measure(`${componentName}-${measureName}`, fullStartMark, fullEndMark)
        
        const entries = performance.getEntriesByName(`${componentName}-${measureName}`)
        if (entries.length > 0) {
          const duration = entries[0].duration
          monitor.trackComponentRender(componentName, duration, {
            measureName,
            type: 'custom-measure'
          })
        }
      } catch (error) {
        console.warn(`Performance measure failed for ${componentName}-${measureName}:`, error)
      }
    }
  }, [componentName])

  // Clear performance marks
  const clearMarks = useCallback(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.clearMarks()
      performance.clearMeasures()
    }
  }, [])

  return {
    metrics,
    trackError,
    mark,
    measure,
    clearMarks
  }
}

/**
 * Hook for tracking specific operations
 */
export function useOperationTracking(operationName: string) {
  const startTime = useRef<number>(0)

  const startOperation = useCallback(() => {
    startTime.current = Date.now()
    
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${operationName}-start`)
    }
  }, [operationName])

  const endOperation = useCallback((metadata?: Record<string, any>) => {
    const duration = Date.now() - startTime.current
    
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${operationName}-end`)
      performance.measure(operationName, `${operationName}-start`, `${operationName}-end`)
    }

    // Track operation performance
    monitor.trackAPICall(operationName, duration, metadata)
    telemetry.recordBusinessMetric(`operation_${operationName}`, 1, {
      duration,
      ...metadata
    })

    return duration
  }, [operationName])

  return { startOperation, endOperation }
}

/**
 * Hook for tracking page performance
 */
export function usePagePerformance(pageName: string) {
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    fcp?: number
    lcp?: number
    fid?: number
    cls?: number
    ttfb?: number
  }>({})

  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setPerformanceMetrics(prev => ({ ...prev, fcp: entry.startTime }))
              telemetry.recordBusinessMetric('first_contentful_paint', entry.startTime, { page: pageName })
            }
            break
          
          case 'largest-contentful-paint':
            setPerformanceMetrics(prev => ({ ...prev, lcp: entry.startTime }))
            telemetry.recordBusinessMetric('largest_contentful_paint', entry.startTime, { page: pageName })
            break
          
          case 'first-input':
            setPerformanceMetrics(prev => ({ ...prev, fid: (entry as any).processingStart - entry.startTime }))
            telemetry.recordBusinessMetric('first_input_delay', (entry as any).processingStart - entry.startTime, { page: pageName })
            break
          
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setPerformanceMetrics(prev => ({
                ...prev,
                cls: (prev.cls || 0) + (entry as any).value
              }))
            }
            break
          
          case 'navigation':
            const navEntry = entry as PerformanceNavigationTiming
            setPerformanceMetrics(prev => ({
              ...prev,
              ttfb: navEntry.responseStart - navEntry.requestStart
            }))
            telemetry.recordBusinessMetric('time_to_first_byte', navEntry.responseStart - navEntry.requestStart, { page: pageName })
            break
        }
      })
    })

    observer.observe({ 
      entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'] 
    })

    return () => observer.disconnect()
  }, [pageName])

  return performanceMetrics
}

/**
 * Hook for resource timing monitoring
 */
export function useResourceTiming() {
  const [resourceMetrics, setResourceMetrics] = useState<{
    totalResources: number
    totalSize: number
    slowResources: Array<{
      name: string
      duration: number
      size: number
    }>
  }>({
    totalResources: 0,
    totalSize: 0,
    slowResources: []
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const analyzeResources = () => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      let totalSize = 0
      const slowResources: Array<{ name: string; duration: number; size: number }> = []
      
      entries.forEach(entry => {
        const size = entry.transferSize || 0
        totalSize += size
        
        if (entry.duration > 1000) { // Resources taking more than 1 second
          slowResources.push({
            name: entry.name.split('/').pop() || entry.name,
            duration: Math.round(entry.duration),
            size: Math.round(size / 1024) // KB
          })
        }
      })

      setResourceMetrics({
        totalResources: entries.length,
        totalSize: Math.round(totalSize / 1024), // KB
        slowResources: slowResources.sort((a, b) => b.duration - a.duration).slice(0, 10)
      })

      // Track slow resources
      slowResources.forEach(resource => {
        telemetry.recordBusinessMetric('slow_resource', 1, {
          resource_name: resource.name,
          duration: resource.duration,
          size: resource.size
        })
      })
    }

    // Analyze resources after page load
    if (document.readyState === 'complete') {
      analyzeResources()
    } else {
      window.addEventListener('load', analyzeResources)
      return () => window.removeEventListener('load', analyzeResources)
    }
  }, [])

  return resourceMetrics
}