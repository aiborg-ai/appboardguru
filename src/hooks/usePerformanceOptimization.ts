/**
 * Performance Optimization Hooks for React Components
 * - Automatic re-render detection and optimization
 * - Memory leak detection and prevention
 * - Bundle size optimization utilities
 * - Performance budget tracking
 */

import { 
  useEffect, 
  useRef, 
  useState, 
  useCallback,
  useMemo,
  RefObject,
  DependencyList
} from 'react'
import { useAdvancedMemoization } from './useAdvancedMemoization'

// Performance metrics interfaces
interface ComponentPerformanceMetrics {
  renderCount: number
  averageRenderTime: number
  lastRenderTime: number
  reRenderReasons: Record<string, number>
  memoryUsage: number
  mountTime: number
  unmountTime?: number
  errorCount: number
  warningCount: number
}

interface PerformanceBudget {
  maxRenderTime: number
  maxMemoryUsage: number
  maxReRenders: number
  trackingEnabled: boolean
}

interface RenderProfileData {
  componentName: string
  renderTime: number
  propsChanges: Record<string, { from: any; to: any }>
  stateChanges: Record<string, { from: any; to: any }>
  timestamp: number
}

// Global performance tracking
const componentMetrics = new Map<string, ComponentPerformanceMetrics>()
const renderProfiles = new Map<string, RenderProfileData[]>()
const performanceBudgets = new Map<string, PerformanceBudget>()

/**
 * Comprehensive component performance monitoring
 */
export function usePerformanceOptimization(
  componentName: string,
  options: {
    trackRenders?: boolean
    trackMemory?: boolean
    detectMemoryLeaks?: boolean
    profileProps?: boolean
    performanceBudget?: Partial<PerformanceBudget>
    onBudgetExceeded?: (metric: string, value: number, budget: number) => void
    debugMode?: boolean
  } = {}
) {
  const {
    trackRenders = true,
    trackMemory = false,
    detectMemoryLeaks = true,
    profileProps = false,
    performanceBudget = {},
    onBudgetExceeded,
    debugMode = process.env.NODE_ENV === 'development'
  } = options

  const renderStartTime = useRef<number>(0)
  const renderCount = useRef<number>(0)
  const mountTime = useRef<number>(Date.now())
  const lastProps = useRef<any>()
  const lastState = useRef<any>()
  const memoryBaseline = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout>()

  // Initialize metrics
  useEffect(() => {
    if (!componentMetrics.has(componentName)) {
      componentMetrics.set(componentName, {
        renderCount: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        reRenderReasons: {},
        memoryUsage: 0,
        mountTime: Date.now(),
        errorCount: 0,
        warningCount: 0
      })
    }

    if (Object.keys(performanceBudget).length > 0) {
      performanceBudgets.set(componentName, {
        maxRenderTime: 16, // 60fps budget
        maxMemoryUsage: 10 * 1024 * 1024, // 10MB
        maxReRenders: 50,
        trackingEnabled: true,
        ...performanceBudget
      })
    }

    // Set memory baseline
    if (trackMemory && typeof window !== 'undefined' && 'memory' in performance) {
      memoryBaseline.current = (performance as any).memory.usedJSHeapSize
    }
  }, [componentName, trackMemory, performanceBudget])

  // Track renders
  useEffect(() => {
    if (!trackRenders) return

    renderStartTime.current = performance.now()
    renderCount.current++

    return () => {
      const renderTime = performance.now() - renderStartTime.current
      const metrics = componentMetrics.get(componentName)!
      
      metrics.renderCount++
      metrics.lastRenderTime = renderTime
      metrics.averageRenderTime = 
        (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount

      // Check performance budget
      const budget = performanceBudgets.get(componentName)
      if (budget && budget.trackingEnabled) {
        if (renderTime > budget.maxRenderTime) {
          onBudgetExceeded?.('renderTime', renderTime, budget.maxRenderTime)
          if (debugMode) {
            console.warn(
              `🚨 Performance Budget Exceeded: ${componentName} render took ${renderTime.toFixed(2)}ms (budget: ${budget.maxRenderTime}ms)`
            )
          }
        }

        if (metrics.renderCount > budget.maxReRenders) {
          onBudgetExceeded?.('reRenders', metrics.renderCount, budget.maxReRenders)
          if (debugMode) {
            console.warn(
              `🚨 Performance Budget Exceeded: ${componentName} has ${metrics.renderCount} renders (budget: ${budget.maxReRenders})`
            )
          }
        }
      }
    }
  })

  // Memory monitoring
  useEffect(() => {
    if (!trackMemory || typeof window === 'undefined' || !('memory' in performance)) return

    const checkMemory = () => {
      const currentMemory = (performance as any).memory.usedJSHeapSize
      const memoryIncrease = currentMemory - memoryBaseline.current
      
      const metrics = componentMetrics.get(componentName)!
      metrics.memoryUsage = memoryIncrease

      const budget = performanceBudgets.get(componentName)
      if (budget && memoryIncrease > budget.maxMemoryUsage) {
        onBudgetExceeded?.('memoryUsage', memoryIncrease, budget.maxMemoryUsage)
        if (debugMode) {
          console.warn(
            `🚨 Memory Budget Exceeded: ${componentName} using ${(memoryIncrease / (1024 * 1024)).toFixed(2)}MB extra (budget: ${(budget.maxMemoryUsage / (1024 * 1024)).toFixed(2)}MB)`
          )
        }
      }
    }

    intervalRef.current = setInterval(checkMemory, 5000)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [componentName, trackMemory, onBudgetExceeded, debugMode])

  // Memory leak detection
  useEffect(() => {
    if (!detectMemoryLeaks) return

    const timers: NodeJS.Timeout[] = []
    const intervals: NodeJS.Timeout[] = []
    const listeners = new Map<string, EventListener[]>()

    // Override setTimeout to track timers
    const originalSetTimeout = window.setTimeout
    window.setTimeout = ((callback: any, delay?: number) => {
      const timer = originalSetTimeout(callback, delay)
      timers.push(timer)
      return timer
    }) as typeof setTimeout

    // Override setInterval to track intervals
    const originalSetInterval = window.setInterval
    window.setInterval = ((callback: any, delay?: number) => {
      const interval = originalSetInterval(callback, delay)
      intervals.push(interval)
      return interval
    }) as typeof setInterval

    // Override addEventListener to track listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function(type: string, listener: EventListener, options?: any) {
      if (!listeners.has(type)) listeners.set(type, [])
      listeners.get(type)!.push(listener)
      return originalAddEventListener.call(this, type, listener, options)
    }

    return () => {
      // Restore original functions
      window.setTimeout = originalSetTimeout
      window.setInterval = originalSetInterval
      EventTarget.prototype.addEventListener = originalAddEventListener

      // Clean up any remaining timers/intervals
      timers.forEach(timer => clearTimeout(timer))
      intervals.forEach(interval => clearInterval(interval))

      // Log potential memory leaks
      if (debugMode && (timers.length > 0 || intervals.length > 0 || listeners.size > 0)) {
        console.warn(`🚨 Potential Memory Leaks in ${componentName}:`, {
          timers: timers.length,
          intervals: intervals.length,
          eventListeners: Array.from(listeners.entries()).reduce((acc, [type, ls]) => ({ ...acc, [type]: ls.length }), {})
        })
      }
    }
  }, [componentName, detectMemoryLeaks, debugMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const metrics = componentMetrics.get(componentName)
      if (metrics) {
        metrics.unmountTime = Date.now()
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [componentName])

  return {
    metrics: componentMetrics.get(componentName),
    getPerformanceReport: () => getComponentPerformanceReport(componentName),
    clearMetrics: () => clearComponentMetrics(componentName),
    setBudget: (budget: Partial<PerformanceBudget>) => {
      performanceBudgets.set(componentName, {
        maxRenderTime: 16,
        maxMemoryUsage: 10 * 1024 * 1024,
        maxReRenders: 50,
        trackingEnabled: true,
        ...budget
      })
    }
  }
}

/**
 * Detects and analyzes unnecessary re-renders
 */
export function useRenderOptimization<TProps extends Record<string, any>>(
  componentName: string,
  props: TProps,
  options: {
    ignoreProps?: (keyof TProps)[]
    warnOnUnnecessaryRenders?: boolean
    trackPropChanges?: boolean
  } = {}
) {
  const { ignoreProps = [], warnOnUnnecessaryRenders = true, trackPropChanges = true } = options
  
  const previousProps = useRef<TProps>()
  const renderCount = useRef<number>(0)
  const unnecessaryRenders = useRef<number>(0)

  const { propChanges, hasUnnecessaryRender } = useMemo(() => {
    if (!previousProps.current) {
      previousProps.current = props
      return { propChanges: {}, hasUnnecessaryRender: false }
    }

    const changes: Record<string, { from: any; to: any }> = {}
    let hasChanges = false

    // Analyze prop changes
    for (const [key, value] of Object.entries(props)) {
      if (ignoreProps.includes(key as keyof TProps)) continue
      
      if (previousProps.current[key] !== value) {
        changes[key] = { from: previousProps.current[key], to: value }
        hasChanges = true
      }
    }

    // Check for removed props
    for (const key of Object.keys(previousProps.current)) {
      if (!(key in props) && !ignoreProps.includes(key as keyof TProps)) {
        changes[key] = { from: previousProps.current[key], to: undefined }
        hasChanges = true
      }
    }

    renderCount.current++
    const isUnnecessary = !hasChanges && renderCount.current > 1

    if (isUnnecessary) {
      unnecessaryRenders.current++
      
      if (warnOnUnnecessaryRenders && process.env.NODE_ENV === 'development') {
        console.warn(
          `🔄 Unnecessary Re-render in ${componentName} (${unnecessaryRenders.current} total)`,
          'Props:', props
        )
      }
    }

    previousProps.current = props
    return { propChanges: changes, hasUnnecessaryRender: isUnnecessary }
  }, [props, componentName, ignoreProps, warnOnUnnecessaryRenders])

  // Track render profile
  useEffect(() => {
    if (!trackPropChanges) return

    if (!renderProfiles.has(componentName)) {
      renderProfiles.set(componentName, [])
    }

    const profiles = renderProfiles.get(componentName)!
    profiles.push({
      componentName,
      renderTime: performance.now(),
      propsChanges: propChanges,
      stateChanges: {}, // Would need state tracking
      timestamp: Date.now()
    })

    // Keep only last 100 renders
    if (profiles.length > 100) {
      profiles.shift()
    }
  }, [componentName, propChanges, trackPropChanges])

  return {
    unnecessaryRenders: unnecessaryRenders.current,
    propChanges,
    hasUnnecessaryRender,
    renderCount: renderCount.current,
    getRenderProfile: () => renderProfiles.get(componentName) || []
  }
}

/**
 * Optimized event handlers that prevent unnecessary re-renders
 */
export function useOptimizedHandlers<T extends Record<string, (...args: any[]) => any>>(
  handlers: T,
  deps: DependencyList = []
): T {
  const handlersRef = useRef<T>()
  const stableHandlers = useRef<T>({} as T)

  // Update handlers reference when dependencies change
  useEffect(() => {
    handlersRef.current = handlers
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  // Create stable references
  return useMemo(() => {
    const newHandlers = {} as T

    for (const [key, handler] of Object.entries(handlers)) {
      if (typeof handler === 'function') {
        // Create stable wrapper that always calls the latest handler
        if (!stableHandlers.current[key as keyof T]) {
          stableHandlers.current[key as keyof T] = ((...args: any[]) => {
            return handlersRef.current?.[key as keyof T]?.(...args)
          }) as any
        }
        newHandlers[key as keyof T] = stableHandlers.current[key as keyof T]
      } else {
        newHandlers[key as keyof T] = handler
      }
    }

    return newHandlers
  }, [handlers])
}

/**
 * Intersection Observer hook with performance optimization
 */
export function useIntersectionOptimization(
  ref: RefObject<Element>,
  options: IntersectionObserverInit & {
    freezeOnceVisible?: boolean
    unobserveOnIntersect?: boolean
    debugName?: string
  } = {}
) {
  const { freezeOnceVisible = false, unobserveOnIntersect = false, debugName, ...observerOptions } = options
  
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [wasVisible, setWasVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver>()

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Don't create new observer if already visible and frozen
    if (freezeOnceVisible && wasVisible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting
        setIsIntersecting(isVisible)

        if (isVisible) {
          setWasVisible(true)
          
          if (debugName && process.env.NODE_ENV === 'development') {
            console.log(`👁️ ${debugName} became visible`)
          }

          if (unobserveOnIntersect) {
            observer.unobserve(element)
          }
        }
      },
      observerOptions
    )

    observer.observe(element)
    observerRef.current = observer

    return () => {
      observer.disconnect()
    }
  }, [ref, freezeOnceVisible, wasVisible, unobserveOnIntersect, debugName, JSON.stringify(observerOptions)])

  return {
    isIntersecting,
    wasVisible,
    observer: observerRef.current
  }
}

/**
 * Virtualization helper for large lists
 */
export function useVirtualization(
  itemCount: number,
  itemHeight: number | ((index: number) => number),
  containerHeight: number,
  options: {
    overscan?: number
    scrollingDelay?: number
    debugName?: string
  } = {}
) {
  const { overscan = 3, scrollingDelay = 100, debugName } = options
  
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollingTimeoutRef = useRef<NodeJS.Timeout>()

  const getItemHeight = useCallback((index: number) => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
  }, [itemHeight])

  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    if (itemCount === 0) {
      return { startIndex: 0, endIndex: 0, visibleItems: [] }
    }

    let start = 0
    let currentOffset = 0

    // Find start index
    for (let i = 0; i < itemCount; i++) {
      const height = getItemHeight(i)
      if (currentOffset + height > scrollTop) {
        start = Math.max(0, i - overscan)
        break
      }
      currentOffset += height
    }

    // Find end index
    let end = start
    let visibleHeight = 0
    
    for (let i = start; i < itemCount; i++) {
      const height = getItemHeight(i)
      visibleHeight += height
      end = i
      
      if (visibleHeight >= containerHeight + (overscan * 2 * height)) {
        break
      }
    }

    const items = Array.from({ length: end - start + 1 }, (_, i) => start + i)

    if (debugName && process.env.NODE_ENV === 'development') {
      console.log(`📊 ${debugName} virtualization:`, {
        total: itemCount,
        visible: items.length,
        range: `${start}-${end}`,
        scrollTop
      })
    }

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items
    }
  }, [scrollTop, itemCount, containerHeight, overscan, getItemHeight, debugName])

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const newScrollTop = event.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    setIsScrolling(true)

    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current)
    }

    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, scrollingDelay)
  }, [scrollingDelay])

  // Calculate total height
  const totalHeight = useMemo(() => {
    let height = 0
    for (let i = 0; i < itemCount; i++) {
      height += getItemHeight(i)
    }
    return height
  }, [itemCount, getItemHeight])

  return {
    startIndex,
    endIndex,
    visibleItems,
    totalHeight,
    isScrolling,
    handleScroll,
    getItemOffset: (index: number) => {
      let offset = 0
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i)
      }
      return offset
    }
  }
}

// Utility functions
function getComponentPerformanceReport(componentName: string) {
  const metrics = componentMetrics.get(componentName)
  const profiles = renderProfiles.get(componentName) || []
  const budget = performanceBudgets.get(componentName)

  return {
    metrics,
    profiles: profiles.slice(-10), // Last 10 renders
    budget,
    summary: {
      efficiency: metrics ? (1 - (metrics.reRenderReasons.unnecessary || 0) / metrics.renderCount) * 100 : 0,
      memoryEfficiency: budget && metrics ? (1 - metrics.memoryUsage / budget.maxMemoryUsage) * 100 : 0,
      timeEfficiency: budget && metrics ? (1 - metrics.averageRenderTime / budget.maxRenderTime) * 100 : 0
    }
  }
}

function clearComponentMetrics(componentName: string) {
  componentMetrics.delete(componentName)
  renderProfiles.delete(componentName)
  performanceBudgets.delete(componentName)
}

// Export performance utilities
export const PerformanceUtils = {
  getAllMetrics: () => Object.fromEntries(componentMetrics.entries()),
  getGlobalReport: () => {
    const allMetrics = Object.fromEntries(componentMetrics.entries())
    
    return {
      totalComponents: Object.keys(allMetrics).length,
      averageRenderTime: Object.values(allMetrics).reduce((sum, m) => sum + m.averageRenderTime, 0) / Object.keys(allMetrics).length,
      totalRenders: Object.values(allMetrics).reduce((sum, m) => sum + m.renderCount, 0),
      memoryUsage: Object.values(allMetrics).reduce((sum, m) => sum + m.memoryUsage, 0),
      componentsExceedingBudget: Object.entries(allMetrics).filter(([name, metrics]) => {
        const budget = performanceBudgets.get(name)
        return budget && (
          metrics.averageRenderTime > budget.maxRenderTime ||
          metrics.memoryUsage > budget.maxMemoryUsage ||
          metrics.renderCount > budget.maxReRenders
        )
      }).map(([name]) => name)
    }
  },
  clearAllMetrics: () => {
    componentMetrics.clear()
    renderProfiles.clear()
    performanceBudgets.clear()
  }
}