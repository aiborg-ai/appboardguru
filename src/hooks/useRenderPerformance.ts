import { useRef, useEffect, useCallback } from 'react'

interface RenderMetrics {
  componentName: string
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
  totalRenderTime: number
  props: Record<string, any>
}

interface PerformanceAlert {
  componentName: string
  type: 'excessive_renders' | 'slow_render' | 'memory_leak'
  threshold: number
  actual: number
  timestamp: number
}

// Global performance tracking
class PerformanceTracker {
  private metrics: Map<string, RenderMetrics> = new Map()
  private alerts: PerformanceAlert[] = []
  private observers: ((metrics: RenderMetrics[]) => void)[] = []

  // Performance thresholds
  private readonly RENDER_COUNT_THRESHOLD = 50 // renders per minute
  private readonly RENDER_TIME_THRESHOLD = 16 // ms (60 FPS target)
  private readonly MAX_ALERTS = 100

  recordRender(componentName: string, renderTime: number, props: Record<string, any>) {
    const existing = this.metrics.get(componentName)
    
    if (existing) {
      existing.renderCount++
      existing.lastRenderTime = renderTime
      existing.totalRenderTime += renderTime
      existing.averageRenderTime = existing.totalRenderTime / existing.renderCount
      existing.props = props
    } else {
      this.metrics.set(componentName, {
        componentName,
        renderCount: 1,
        lastRenderTime: renderTime,
        averageRenderTime: renderTime,
        totalRenderTime: renderTime,
        props
      })
    }

    this.checkForAlerts(componentName, renderTime)
    this.notifyObservers()
  }

  private checkForAlerts(componentName: string, renderTime: number) {
    const metrics = this.metrics.get(componentName)!
    
    // Check for slow renders
    if (renderTime > this.RENDER_TIME_THRESHOLD) {
      this.addAlert({
        componentName,
        type: 'slow_render',
        threshold: this.RENDER_TIME_THRESHOLD,
        actual: renderTime,
        timestamp: Date.now()
      })
    }

    // Check for excessive renders (more than threshold in last minute)
    if (metrics.renderCount > this.RENDER_COUNT_THRESHOLD) {
      this.addAlert({
        componentName,
        type: 'excessive_renders',
        threshold: this.RENDER_COUNT_THRESHOLD,
        actual: metrics.renderCount,
        timestamp: Date.now()
      })
    }
  }

  private addAlert(alert: PerformanceAlert) {
    this.alerts.push(alert)
    
    // Keep only latest alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts.shift()
    }

    // Log critical performance issues
    if (alert.type === 'slow_render' && alert.actual > this.RENDER_TIME_THRESHOLD * 2) {
      console.warn(`🐌 Slow render detected in ${alert.componentName}: ${alert.actual}ms (threshold: ${alert.threshold}ms)`)
    }
    
    if (alert.type === 'excessive_renders' && alert.actual > this.RENDER_COUNT_THRESHOLD * 2) {
      console.warn(`🔄 Excessive renders detected in ${alert.componentName}: ${alert.actual} renders (threshold: ${alert.threshold})`)
    }
  }

  getMetrics(): RenderMetrics[] {
    return Array.from(this.metrics.values())
  }

  getAlerts(): PerformanceAlert[] {
    return [...this.alerts]
  }

  getComponentMetrics(componentName: string): RenderMetrics | undefined {
    return this.metrics.get(componentName)
  }

  subscribe(observer: (metrics: RenderMetrics[]) => void) {
    this.observers.push(observer)
    return () => {
      const index = this.observers.indexOf(observer)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  private notifyObservers() {
    const metrics = this.getMetrics()
    this.observers.forEach(observer => observer(metrics))
  }

  reset() {
    this.metrics.clear()
    this.alerts.length = 0
  }

  // Performance report generation
  generateReport(): string {
    const metrics = this.getMetrics()
    const slowComponents = metrics
      .filter(m => m.averageRenderTime > this.RENDER_TIME_THRESHOLD)
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
    
    const highRenderComponents = metrics
      .filter(m => m.renderCount > this.RENDER_COUNT_THRESHOLD)
      .sort((a, b) => b.renderCount - a.renderCount)

    let report = '🚀 React Performance Report\n'
    report += '===========================\n\n'
    
    if (slowComponents.length > 0) {
      report += '⏱️ Slow Rendering Components:\n'
      slowComponents.forEach(m => {
        report += `  ${m.componentName}: ${m.averageRenderTime.toFixed(2)}ms avg (${m.renderCount} renders)\n`
      })
      report += '\n'
    }

    if (highRenderComponents.length > 0) {
      report += '🔄 High Render Count Components:\n'
      highRenderComponents.forEach(m => {
        report += `  ${m.componentName}: ${m.renderCount} renders (${m.averageRenderTime.toFixed(2)}ms avg)\n`
      })
      report += '\n'
    }

    const recentAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 60000) // Last minute
    if (recentAlerts.length > 0) {
      report += '🚨 Recent Performance Alerts:\n'
      recentAlerts.forEach(a => {
        report += `  ${a.componentName}: ${a.type} (${a.actual} > ${a.threshold})\n`
      })
    }

    return report
  }
}

// Global instance
const performanceTracker = new PerformanceTracker()

/**
 * Hook to monitor component render performance
 * Usage: const renderMetrics = useRenderPerformance('ComponentName', props)
 */
export function useRenderPerformance(
  componentName: string, 
  props: Record<string, any> = {},
  options: {
    enabled?: boolean
    logToConsole?: boolean
    alertOnSlow?: boolean
  } = {}
) {
  const { enabled = true, logToConsole = false, alertOnSlow = true } = options
  
  const renderStartTime = useRef<number>(0)
  const renderCount = useRef<number>(0)
  const isFirstRender = useRef<boolean>(true)

  useEffect(() => {
    if (!enabled) return
    
    renderStartTime.current = performance.now()
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current
      renderCount.current++
      
      performanceTracker.recordRender(componentName, renderTime, props)

      if (logToConsole) {
        console.log(`🔍 ${componentName} rendered in ${renderTime.toFixed(2)}ms (render #${renderCount.current})`)
      }

      if (alertOnSlow && renderTime > 16) {
        console.warn(`⚠️ ${componentName} took ${renderTime.toFixed(2)}ms to render (>16ms)`)
      }
    }
  })

  // Track props changes
  const prevProps = useRef(props)
  useEffect(() => {
    if (!enabled || isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const propsChanged = Object.keys({ ...props, ...prevProps.current }).some(
      key => props[key] !== prevProps.current[key]
    )

    if (propsChanged && logToConsole) {
      console.log(`🔄 ${componentName} props changed:`, {
        prev: prevProps.current,
        current: props
      })
    }

    prevProps.current = props
  }, [props, enabled, logToConsole, componentName])

  return {
    renderCount: renderCount.current,
    componentName,
    getMetrics: () => performanceTracker.getComponentMetrics(componentName),
  }
}

/**
 * Hook to monitor all component performance metrics
 */
export function usePerformanceMetrics() {
  const metrics = useRef<RenderMetrics[]>([])
  const [, forceUpdate] = useCallback(() => ({}), [])

  useEffect(() => {
    const unsubscribe = performanceTracker.subscribe((newMetrics) => {
      metrics.current = newMetrics
      forceUpdate()
    })

    return unsubscribe
  }, [forceUpdate])

  return {
    metrics: metrics.current,
    alerts: performanceTracker.getAlerts(),
    generateReport: performanceTracker.generateReport.bind(performanceTracker),
    reset: performanceTracker.reset.bind(performanceTracker),
    getComponentMetrics: performanceTracker.getComponentMetrics.bind(performanceTracker)
  }
}

/**
 * Higher-order component for performance monitoring
 * Usage: export default withRenderPerformance('ComponentName')(MyComponent)
 */
export function withRenderPerformance<P extends object>(
  componentName: string,
  options?: {
    enabled?: boolean
    logToConsole?: boolean
    alertOnSlow?: boolean
  }
) {
  return function<T extends React.ComponentType<P>>(Component: T): T {
    const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
      useRenderPerformance(componentName, props, options)
      return <Component {...props} ref={ref} />
    }) as any

    WrappedComponent.displayName = `withRenderPerformance(${componentName})`
    
    return WrappedComponent
  }
}

/**
 * Performance profiler component for measuring render times
 */
export const PerformanceProfiler: React.FC<{
  id: string
  children: React.ReactNode
  onRender?: (id: string, phase: 'mount' | 'update', actualDuration: number) => void
}> = ({ id, children, onRender }) => {
  const handleRender = useCallback((
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    performanceTracker.recordRender(id, actualDuration, { phase })
    onRender?.(id, phase, actualDuration)
    
    if (actualDuration > 16) {
      console.warn(`⚠️ Profiler ${id} (${phase}): ${actualDuration.toFixed(2)}ms`)
    }
  }, [onRender])

  return (
    <React.Profiler id={id} onRender={handleRender}>
      {children}
    </React.Profiler>
  )
}

export { performanceTracker }