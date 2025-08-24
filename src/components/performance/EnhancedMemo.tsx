/**
 * Enhanced React.memo with Intelligent Comparison Strategies
 * - Smart prop comparison with configurable strategies
 * - Performance tracking and optimization hints
 * - Automatic render reason detection
 * - Memory-efficient implementations
 */

import React, { 
  ComponentType, 
  MemoExoticComponent, 
  ReactElement,
  useRef,
  useEffect
} from 'react'

// Types for comparison strategies
type ComparisonStrategy = 
  | 'shallow'
  | 'deep'
  | 'reference'
  | 'custom'
  | 'smart'

interface EnhancedMemoOptions<P = any> {
  strategy?: ComparisonStrategy
  customComparator?: (prevProps: P, nextProps: P) => boolean
  ignoreProps?: (keyof P)[]
  trackRenders?: boolean
  debugName?: string
  maxRenderTime?: number
  onRenderTimeExceeded?: (renderTime: number) => void
  memoizeCallbacks?: boolean
  deepCompareKeys?: (keyof P)[]
  stableKeys?: (keyof P)[]
}

interface RenderTrackingData {
  componentName: string
  renderCount: number
  skippedRenders: number
  lastRenderTime: number
  averageRenderTime: number
  propChanges: Array<{
    prop: string
    from: any
    to: any
    timestamp: number
  }>
}

// Global render tracking
const renderTracking = new Map<string, RenderTrackingData>()

/**
 * Enhanced React.memo with intelligent comparison and performance tracking
 */
export function enhancedMemo<P extends object>(
  Component: ComponentType<P>,
  options: EnhancedMemoOptions<P> = {}
): MemoExoticComponent<ComponentType<P>> {
  const {
    strategy = 'smart',
    customComparator,
    ignoreProps = [],
    trackRenders = process.env.NODE_ENV === 'development',
    debugName = Component.displayName || Component.name || 'Anonymous',
    maxRenderTime = 16, // 60fps budget
    onRenderTimeExceeded,
    memoizeCallbacks = true,
    deepCompareKeys = [],
    stableKeys = []
  } = options

  // Initialize tracking data
  if (trackRenders && !renderTracking.has(debugName)) {
    renderTracking.set(debugName, {
      componentName: debugName,
      renderCount: 0,
      skippedRenders: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      propChanges: []
    })
  }

  // Create the comparison function based on strategy
  const areEqual = createComparisonFunction(strategy, {
    customComparator,
    ignoreProps,
    deepCompareKeys,
    stableKeys,
    memoizeCallbacks,
    debugName,
    trackRenders
  })

  // Wrap component with performance tracking
  const WrappedComponent = React.memo((props: P) => {
    const renderStartTime = useRef<number>(0)
    const trackingData = renderTracking.get(debugName)

    // Start render timing
    useEffect(() => {
      renderStartTime.current = performance.now()
    })

    // Track render completion
    useEffect(() => {
      if (!trackRenders || !trackingData) return

      const renderTime = performance.now() - renderStartTime.current
      trackingData.renderCount++
      trackingData.lastRenderTime = renderTime
      trackingData.averageRenderTime = 
        (trackingData.averageRenderTime * (trackingData.renderCount - 1) + renderTime) / trackingData.renderCount

      // Check render time budget
      if (renderTime > maxRenderTime) {
        onRenderTimeExceeded?.(renderTime)
        console.warn(
          `🚨 ${debugName} exceeded render budget: ${renderTime.toFixed(2)}ms > ${maxRenderTime}ms`
        )
      }

      // Log performance in development
      if (process.env.NODE_ENV === 'development' && renderTime > maxRenderTime) {
        console.log(`📊 ${debugName} render metrics:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          averageRenderTime: `${trackingData.averageRenderTime.toFixed(2)}ms`,
          totalRenders: trackingData.renderCount,
          skippedRenders: trackingData.skippedRenders,
          efficiency: `${((trackingData.skippedRenders / (trackingData.renderCount + trackingData.skippedRenders)) * 100).toFixed(1)}%`
        })
      }
    })

    return React.createElement(Component, props)
  }, areEqual)

  // Preserve component metadata
  WrappedComponent.displayName = `EnhancedMemo(${debugName})`
  ;(WrappedComponent as any).__enhancedMemo = {
    originalComponent: Component,
    options,
    getMetrics: () => renderTracking.get(debugName)
  }

  return WrappedComponent
}

/**
 * Create comparison function based on strategy
 */
function createComparisonFunction<P extends object>(
  strategy: ComparisonStrategy,
  options: {
    customComparator?: (prevProps: P, nextProps: P) => boolean
    ignoreProps?: (keyof P)[]
    deepCompareKeys?: (keyof P)[]
    stableKeys?: (keyof P)[]
    memoizeCallbacks?: boolean
    debugName?: string
    trackRenders?: boolean
  }
): (prevProps: P, nextProps: P) => boolean {
  const {
    customComparator,
    ignoreProps = [],
    deepCompareKeys = [],
    stableKeys = [],
    memoizeCallbacks = true,
    debugName = 'Component',
    trackRenders = false
  } = options

  return (prevProps: P, nextProps: P): boolean => {
    const trackingData = renderTracking.get(debugName)

    // Custom comparator takes precedence
    if (strategy === 'custom' && customComparator) {
      const result = customComparator(prevProps, nextProps)
      
      if (trackRenders && trackingData && !result) {
        trackingData.skippedRenders++
      }
      
      return result
    }

    // Filter props to compare
    const prevFiltered = filterProps(prevProps, ignoreProps)
    const nextFiltered = filterProps(nextProps, ignoreProps)

    let hasChanges = false
    const propChanges: Array<{ prop: string; from: any; to: any; timestamp: number }> = []

    // Check each prop based on strategy
    for (const [key, nextValue] of Object.entries(nextFiltered)) {
      const prevValue = prevFiltered[key]
      let isEqual: boolean

      // Determine comparison method for this prop
      if (stableKeys.includes(key as keyof P)) {
        // Stable keys should never change - warn if they do
        isEqual = prevValue === nextValue
        if (!isEqual && process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ ${debugName}: Stable prop '${key}' changed unexpectedly`)
        }
      } else if (deepCompareKeys.includes(key as keyof P)) {
        // Deep compare for specified keys
        isEqual = deepEqual(prevValue, nextValue)
      } else if (memoizeCallbacks && typeof nextValue === 'function' && typeof prevValue === 'function') {
        // Smart callback comparison
        isEqual = compareFunctions(prevValue, nextValue)
      } else {
        // Apply strategy-specific comparison
        switch (strategy) {
          case 'reference':
            isEqual = prevValue === nextValue
            break
          case 'shallow':
            isEqual = shallowEqual(prevValue, nextValue)
            break
          case 'deep':
            isEqual = deepEqual(prevValue, nextValue)
            break
          case 'smart':
            isEqual = smartEqual(prevValue, nextValue)
            break
          default:
            isEqual = prevValue === nextValue
        }
      }

      if (!isEqual) {
        hasChanges = true
        propChanges.push({
          prop: key,
          from: prevValue,
          to: nextValue,
          timestamp: Date.now()
        })

        // Early exit if we found changes and not tracking
        if (!trackRenders) {
          break
        }
      }
    }

    // Track render decisions
    if (trackRenders && trackingData) {
      if (!hasChanges) {
        trackingData.skippedRenders++
      } else {
        // Store prop changes (keep last 50)
        trackingData.propChanges.push(...propChanges)
        if (trackingData.propChanges.length > 50) {
          trackingData.propChanges.splice(0, trackingData.propChanges.length - 50)
        }
      }
    }

    // Return true if props are equal (should skip render)
    return !hasChanges
  }
}

/**
 * Enhanced shallow comparison with better object/array handling
 */
function smartEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a == null || b == null) return a === b

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => {
      const bItem = b[index]
      // Shallow compare for array items
      return typeof item === 'object' ? shallowEqual(item, bItem) : item === bItem
    })
  }

  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    return shallowEqual(a, b)
  }

  // Handle functions
  if (typeof a === 'function' && typeof b === 'function') {
    return compareFunctions(a, b)
  }

  return false
}

/**
 * Shallow equality check
 */
function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b
  }

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  return keysA.every(key => a[key] === b[key])
}

/**
 * Deep equality check with circular reference handling
 */
function deepEqual(a: any, b: any, visited = new WeakMap()): boolean {
  if (a === b) return true
  if (a == null || b == null) return a === b

  // Handle circular references
  if (typeof a === 'object' && visited.has(a)) {
    return visited.get(a) === b
  }

  if (typeof a === 'object') {
    visited.set(a, b)
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index], visited))
  }

  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => deepEqual(a[key], b[key], visited))
  }

  return false
}

/**
 * Smart function comparison
 */
function compareFunctions(a: Function, b: Function): boolean {
  // Reference equality first
  if (a === b) return true
  
  // Compare function source (expensive, use carefully)
  if (process.env.NODE_ENV === 'development') {
    try {
      // Only compare simple functions, not complex ones
      const aStr = a.toString()
      const bStr = b.toString()
      
      if (aStr.length < 200 && bStr.length < 200) {
        return aStr === bStr
      }
    } catch {
      // Ignore errors in function comparison
    }
  }
  
  return false
}

/**
 * Filter out ignored props
 */
function filterProps<P extends object>(props: P, ignoreProps: (keyof P)[]): Partial<P> {
  if (ignoreProps.length === 0) return props
  
  const filtered: Partial<P> = {}
  for (const [key, value] of Object.entries(props)) {
    if (!ignoreProps.includes(key as keyof P)) {
      filtered[key as keyof P] = value
    }
  }
  return filtered
}

/**
 * Performance-optimized memo for simple components
 */
export function fastMemo<P extends object>(
  Component: ComponentType<P>,
  propKeys?: (keyof P)[]
): MemoExoticComponent<ComponentType<P>> {
  return enhancedMemo(Component, {
    strategy: 'reference',
    ignoreProps: propKeys ? Object.keys({} as P).filter(k => !propKeys.includes(k as keyof P)) as (keyof P)[] : [],
    trackRenders: false,
    memoizeCallbacks: false
  })
}

/**
 * Deep memo for complex props
 */
export function deepMemo<P extends object>(
  Component: ComponentType<P>,
  options: Pick<EnhancedMemoOptions<P>, 'deepCompareKeys' | 'ignoreProps' | 'debugName'> = {}
): MemoExoticComponent<ComponentType<P>> {
  return enhancedMemo(Component, {
    strategy: 'deep',
    trackRenders: true,
    ...options
  })
}

/**
 * Callback-aware memo for components with many function props
 */
export function callbackMemo<P extends object>(
  Component: ComponentType<P>,
  options: Pick<EnhancedMemoOptions<P>, 'stableKeys' | 'ignoreProps' | 'debugName'> = {}
): MemoExoticComponent<ComponentType<P>> {
  return enhancedMemo(Component, {
    strategy: 'smart',
    memoizeCallbacks: true,
    trackRenders: true,
    ...options
  })
}

/**
 * Get render tracking data for a component
 */
export function getRenderMetrics(componentName: string): RenderTrackingData | undefined {
  return renderTracking.get(componentName)
}

/**
 * Get all render metrics
 */
export function getAllRenderMetrics(): Record<string, RenderTrackingData> {
  return Object.fromEntries(renderTracking.entries())
}

/**
 * Clear render metrics for a component or all components
 */
export function clearRenderMetrics(componentName?: string): void {
  if (componentName) {
    renderTracking.delete(componentName)
  } else {
    renderTracking.clear()
  }
}

/**
 * Performance report generator
 */
export function generatePerformanceReport(): {
  totalComponents: number
  totalRenders: number
  totalSkippedRenders: number
  averageEfficiency: number
  slowestComponents: Array<{
    name: string
    averageRenderTime: number
    efficiency: number
  }>
  mostActiveComponents: Array<{
    name: string
    renderCount: number
    efficiency: number
  }>
} {
  const metrics = Array.from(renderTracking.values())
  
  const totalRenders = metrics.reduce((sum, m) => sum + m.renderCount, 0)
  const totalSkipped = metrics.reduce((sum, m) => sum + m.skippedRenders, 0)
  const averageEfficiency = totalRenders > 0 ? (totalSkipped / (totalRenders + totalSkipped)) * 100 : 0

  const slowestComponents = metrics
    .filter(m => m.renderCount > 0)
    .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
    .slice(0, 10)
    .map(m => ({
      name: m.componentName,
      averageRenderTime: Math.round(m.averageRenderTime * 100) / 100,
      efficiency: Math.round(((m.skippedRenders / (m.renderCount + m.skippedRenders)) * 100) * 100) / 100
    }))

  const mostActiveComponents = metrics
    .sort((a, b) => b.renderCount - a.renderCount)
    .slice(0, 10)
    .map(m => ({
      name: m.componentName,
      renderCount: m.renderCount,
      efficiency: Math.round(((m.skippedRenders / (m.renderCount + m.skippedRenders)) * 100) * 100) / 100
    }))

  return {
    totalComponents: metrics.length,
    totalRenders,
    totalSkippedRenders: totalSkipped,
    averageEfficiency: Math.round(averageEfficiency * 100) / 100,
    slowestComponents,
    mostActiveComponents
  }
}

// Development-only debugging utilities
if (process.env.NODE_ENV === 'development') {
  // Add global performance debugging
  ;(window as any).__enhancedMemoDebug = {
    getRenderMetrics,
    getAllRenderMetrics,
    clearRenderMetrics,
    generatePerformanceReport
  }
}