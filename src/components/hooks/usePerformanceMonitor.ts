import * as React from "react"

interface PerformanceMetrics {
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
  totalRenderTime: number
}

/**
 * Hook to monitor component performance
 */
export function usePerformanceMonitor(
  componentName: string,
  enabled: boolean = process.env['NODE_ENV'] === 'development'
): PerformanceMetrics {
  const metricsRef = React.useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
  })
  
  const startTimeRef = React.useRef<number>(0)

  // Start timing at beginning of render
  if (enabled) {
    startTimeRef.current = performance.now()
  }

  React.useEffect(() => {
    if (!enabled) return

    const endTime = performance.now()
    const renderTime = endTime - startTimeRef.current

    const metrics = metricsRef.current
    metrics.renderCount++
    metrics.lastRenderTime = renderTime
    metrics.totalRenderTime += renderTime
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount

    // Log performance warnings
    if (renderTime > 16) { // > 16ms might cause frame drops
      console.warn(
        `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (> 16ms)`
      )
    }

    // Log every 10 renders
    if (metrics.renderCount % 10 === 0) {
      console.log(
        `[Performance] ${componentName} metrics:`,
        {
          renders: metrics.renderCount,
          avgRenderTime: metrics.averageRenderTime.toFixed(2) + 'ms',
          lastRenderTime: metrics.lastRenderTime.toFixed(2) + 'ms',
        }
      )
    }
  })

  return metricsRef.current
}

/**
 * Hook to track expensive operations
 */
export function useOperationTimer() {
  const timers = React.useRef(new Map<string, number>())

  const startTimer = React.useCallback((operationName: string) => {
    timers.current.set(operationName, performance.now())
  }, [])

  const endTimer = React.useCallback((operationName: string) => {
    const startTime = timers.current.get(operationName)
    if (startTime) {
      const duration = performance.now() - startTime
      timers.current.delete(operationName)
      
      if (process.env['NODE_ENV'] === 'development') {
        console.log(`[Operation Timer] ${operationName}: ${duration.toFixed(2)}ms`)
      }
      
      return duration
    }
    return 0
  }, [])

  return { startTimer, endTimer }
}

/**
 * Hook to detect render causes
 */
export function useWhyDidYouUpdate(
  name: string,
  props: Record<string, unknown>,
  enabled: boolean = process.env['NODE_ENV'] === 'development'
) {
  const previousProps = React.useRef<Record<string, unknown>>()

  React.useEffect(() => {
    if (!enabled) return

    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props })
      const changedProps: Record<string, { from: any; to: any }> = {}

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          }
        }
      })

      if (Object.keys(changedProps).length) {
        console.log(`[WhyDidYouUpdate] ${name}`, changedProps)
      }
    }

    previousProps.current = props
  })
}

/**
 * Hook to measure component mount/unmount times
 */
export function useLifecycleTimer(componentName: string) {
  const mountTimeRef = React.useRef<number>(0)

  React.useEffect(() => {
    mountTimeRef.current = performance.now()
    
    if (process.env['NODE_ENV'] === 'development') {
      console.log(`[Lifecycle] ${componentName} mounted`)
    }

    return () => {
      const unmountTime = performance.now()
      const lifetimeDuration = unmountTime - mountTimeRef.current
      
      if (process.env['NODE_ENV'] === 'development') {
        console.log(
          `[Lifecycle] ${componentName} unmounted after ${lifetimeDuration.toFixed(2)}ms`
        )
      }
    }
  }, [componentName])
}