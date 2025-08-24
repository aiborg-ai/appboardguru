/**
 * Advanced Memoization Hooks for React Components
 * - Smart memoization with dependency tracking
 * - Automatic invalidation strategies
 * - Performance-aware caching
 * - Memory-efficient implementations
 */

import { 
  useMemo, 
  useCallback, 
  useRef, 
  useEffect, 
  useState,
  DependencyList,
  MutableRefObject
} from 'react'

// Types
interface MemoizationMetrics {
  hitCount: number
  missCount: number
  lastHit: number
  lastMiss: number
  averageComputeTime: number
  memoryUsage: number
}

interface SmartMemoOptions<T> {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum cache size
  computeKey?: (...args: any[]) => string
  shouldInvalidate?: (oldValue: T, newValue: T) => boolean
  trackMetrics?: boolean
  debugName?: string
}

interface DeepCompareOptions {
  maxDepth?: number
  ignoreKeys?: string[]
  customComparers?: Record<string, (a: any, b: any) => boolean>
}

// Global cache and metrics
const globalMemoCache = new Map<string, any>()
const memoMetrics = new Map<string, MemoizationMetrics>()
const computeTimings = new Map<string, number[]>()

/**
 * Smart useMemo with TTL, size limits, and performance tracking
 */
export function useSmartMemo<T>(
  factory: () => T,
  deps: DependencyList,
  options: SmartMemoOptions<T> = {}
): T {
  const {
    ttl = 300000, // 5 minutes default
    maxSize = 1000,
    computeKey,
    shouldInvalidate,
    trackMetrics = true,
    debugName = 'anonymous'
  } = options

  const lastDepsRef = useRef<DependencyList>()
  const cacheKeyRef = useRef<string>()
  const lastResultRef = useRef<T>()
  const timestampRef = useRef<number>(0)

  return useMemo(() => {
    const startTime = Date.now()
    
    // Generate cache key
    const cacheKey = computeKey 
      ? computeKey(...(deps || []))
      : `${debugName}:${JSON.stringify(deps)}`
    
    cacheKeyRef.current = cacheKey

    // Check if we can reuse the cached value
    const now = Date.now()
    const isExpired = ttl > 0 && (now - timestampRef.current) > ttl
    const hasDepsChanged = !shallowEqual(deps, lastDepsRef.current)

    if (!isExpired && !hasDepsChanged && lastResultRef.current !== undefined) {
      // Cache hit
      if (trackMetrics) {
        updateMetrics(cacheKey, 'hit', 0)
      }
      return lastResultRef.current
    }

    // Custom invalidation check
    if (shouldInvalidate && lastResultRef.current !== undefined) {
      const newResult = factory()
      if (!shouldInvalidate(lastResultRef.current, newResult)) {
        return lastResultRef.current
      }
    }

    // Compute new value
    const result = factory()
    const computeTime = Date.now() - startTime

    // Update cache and metrics
    lastDepsRef.current = deps
    lastResultRef.current = result
    timestampRef.current = now

    if (trackMetrics) {
      updateMetrics(cacheKey, 'miss', computeTime)
    }

    // Global cache management
    if (globalMemoCache.size >= maxSize) {
      cleanupGlobalCache(maxSize)
    }
    globalMemoCache.set(cacheKey, { result, timestamp: now })

    return result
  }, deps)
}

/**
 * Deep comparison memo that handles complex objects efficiently
 */
export function useDeepMemo<T>(
  factory: () => T,
  deps: DependencyList,
  options: DeepCompareOptions = {}
): T {
  const {
    maxDepth = 10,
    ignoreKeys = [],
    customComparers = {}
  } = options

  const lastDepsRef = useRef<DependencyList>()
  const lastResultRef = useRef<T>()

  return useMemo(() => {
    const hasChanged = !deepEqual(
      deps, 
      lastDepsRef.current, 
      0, 
      maxDepth, 
      ignoreKeys, 
      customComparers
    )

    if (!hasChanged && lastResultRef.current !== undefined) {
      return lastResultRef.current
    }

    const result = factory()
    lastDepsRef.current = deps
    lastResultRef.current = result
    return result
  }, [deps, factory, maxDepth, JSON.stringify(ignoreKeys)]) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Stable callback with automatic dependency optimization
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList,
  options: {
    debounce?: number
    throttle?: number
    immediate?: boolean
    debugName?: string
  } = {}
): T {
  const { debounce, throttle, immediate = true, debugName = 'callback' } = options
  
  // Create stable reference to the latest callback
  const callbackRef = useRef<T>(callback)
  const lastCallRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Update callback reference when dependencies change
  useEffect(() => {
    callbackRef.current = callback
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Throttling logic
      if (throttle && (now - lastCallRef.current) < throttle) {
        return
      }

      // Debouncing logic
      if (debounce) {
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now()
          return callbackRef.current(...args)
        }, debounce)
        return
      }

      // Immediate execution
      if (immediate || (now - lastCallRef.current) >= (throttle || 0)) {
        lastCallRef.current = now
        return callbackRef.current(...args)
      }
    }) as T,
    [] // Empty dependency array - we manage deps internally
  )
}

/**
 * Memoized selector with automatic dependency tracking
 */
export function useSelector<TState, TSelected>(
  selector: (state: TState) => TSelected,
  state: TState,
  options: {
    equalityFn?: (a: TSelected, b: TSelected) => boolean
    debugName?: string
  } = {}
): TSelected {
  const { equalityFn = shallowEqual, debugName = 'selector' } = options
  
  const lastStateRef = useRef<TState>(state)
  const lastSelectedRef = useRef<TSelected>()
  const selectorRef = useRef(selector)

  // Update selector reference
  useEffect(() => {
    selectorRef.current = selector
  }, [selector])

  return useMemo(() => {
    // Check if state has changed
    if (state === lastStateRef.current && lastSelectedRef.current !== undefined) {
      return lastSelectedRef.current
    }

    const selected = selectorRef.current(state)

    // Check if selected value has actually changed
    if (lastSelectedRef.current !== undefined && equalityFn(selected, lastSelectedRef.current)) {
      return lastSelectedRef.current
    }

    lastStateRef.current = state
    lastSelectedRef.current = selected
    
    return selected
  }, [state, equalityFn])
}

/**
 * Memoized async computation with loading states
 */
export function useAsyncMemo<T>(
  asyncFactory: () => Promise<T>,
  deps: DependencyList,
  options: {
    initialValue?: T
    onError?: (error: Error) => void
    debounce?: number
    retryCount?: number
    debugName?: string
  } = {}
): {
  value: T | undefined
  loading: boolean
  error: Error | null
  retry: () => void
} {
  const {
    initialValue,
    onError,
    debounce = 0,
    retryCount = 0,
    debugName = 'asyncMemo'
  } = options

  const [state, setState] = useState<{
    value: T | undefined
    loading: boolean
    error: Error | null
  }>({
    value: initialValue,
    loading: false,
    error: null
  })

  const timeoutRef = useRef<NodeJS.Timeout>()
  const currentPromiseRef = useRef<Promise<T> | null>(null)
  const attemptsRef = useRef<number>(0)

  const executeAsync = useCallback(async () => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const execute = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }))
      attemptsRef.current++

      try {
        const promise = asyncFactory()
        currentPromiseRef.current = promise
        const result = await promise

        // Only update if this is still the current promise
        if (currentPromiseRef.current === promise) {
          setState({ value: result, loading: false, error: null })
          attemptsRef.current = 0
        }
      } catch (error) {
        const err = error as Error
        
        if (currentPromiseRef.current) {
          if (attemptsRef.current <= retryCount) {
            // Retry with exponential backoff
            setTimeout(() => executeAsync(), Math.pow(2, attemptsRef.current) * 1000)
          } else {
            setState(prev => ({ ...prev, loading: false, error: err }))
            onError?.(err)
            attemptsRef.current = 0
          }
        }
      }
    }

    if (debounce > 0) {
      timeoutRef.current = setTimeout(execute, debounce)
    } else {
      execute()
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  // Execute when dependencies change
  useEffect(() => {
    executeAsync()
    
    return () => {
      currentPromiseRef.current = null
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [executeAsync])

  const retry = useCallback(() => {
    attemptsRef.current = 0
    executeAsync()
  }, [executeAsync])

  return {
    value: state.value,
    loading: state.loading,
    error: state.error,
    retry
  }
}

/**
 * Memoization with LRU eviction and size management
 */
export function useLRUMemo<T>(
  factory: () => T,
  deps: DependencyList,
  maxSize: number = 100,
  debugName: string = 'lru'
): T {
  const cacheRef = useRef<Map<string, { value: T; timestamp: number }>>(new Map())
  const accessOrderRef = useRef<string[]>([])

  return useMemo(() => {
    const key = `${debugName}:${JSON.stringify(deps)}`
    const cache = cacheRef.current
    const accessOrder = accessOrderRef.current

    // Check if value exists in cache
    if (cache.has(key)) {
      // Update access order (move to end)
      const index = accessOrder.indexOf(key)
      if (index > -1) {
        accessOrder.splice(index, 1)
      }
      accessOrder.push(key)
      
      return cache.get(key)!.value
    }

    // Compute new value
    const value = factory()
    const now = Date.now()

    // Add to cache
    cache.set(key, { value, timestamp: now })
    accessOrder.push(key)

    // Evict oldest items if over limit
    while (cache.size > maxSize && accessOrder.length > 0) {
      const oldestKey = accessOrder.shift()!
      cache.delete(oldestKey)
    }

    return value
  }, deps)
}

/**
 * Get memoization performance metrics
 */
export function getMemoizationMetrics(key?: string): MemoizationMetrics | Record<string, MemoizationMetrics> {
  if (key) {
    return memoMetrics.get(key) || {
      hitCount: 0,
      missCount: 0,
      lastHit: 0,
      lastMiss: 0,
      averageComputeTime: 0,
      memoryUsage: 0
    }
  }
  
  return Object.fromEntries(memoMetrics.entries())
}

/**
 * Clear memoization cache and metrics
 */
export function clearMemoizationCache(pattern?: string): void {
  if (pattern) {
    const regex = new RegExp(pattern)
    for (const key of globalMemoCache.keys()) {
      if (regex.test(key)) {
        globalMemoCache.delete(key)
        memoMetrics.delete(key)
        computeTimings.delete(key)
      }
    }
  } else {
    globalMemoCache.clear()
    memoMetrics.clear()
    computeTimings.clear()
  }
}

// Helper functions
function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => item === b[index])
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => a[key] === b[key])
  }
  return false
}

function deepEqual(
  a: any, 
  b: any, 
  depth: number = 0, 
  maxDepth: number = 10,
  ignoreKeys: string[] = [],
  customComparers: Record<string, (a: any, b: any) => boolean> = {}
): boolean {
  if (depth > maxDepth) return true
  if (a === b) return true
  if (!a || !b) return false

  // Custom comparer
  const type = typeof a
  if (customComparers[type]) {
    return customComparers[type](a, b)
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => 
      deepEqual(item, b[index], depth + 1, maxDepth, ignoreKeys, customComparers)
    )
  }

  if (type === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a).filter(key => !ignoreKeys.includes(key))
    const keysB = Object.keys(b).filter(key => !ignoreKeys.includes(key))
    
    if (keysA.length !== keysB.length) return false
    
    return keysA.every(key => 
      deepEqual(a[key], b[key], depth + 1, maxDepth, ignoreKeys, customComparers)
    )
  }

  return false
}

function updateMetrics(key: string, type: 'hit' | 'miss', computeTime: number): void {
  if (!memoMetrics.has(key)) {
    memoMetrics.set(key, {
      hitCount: 0,
      missCount: 0,
      lastHit: 0,
      lastMiss: 0,
      averageComputeTime: 0,
      memoryUsage: 0
    })
  }

  const metrics = memoMetrics.get(key)!
  const now = Date.now()

  if (type === 'hit') {
    metrics.hitCount++
    metrics.lastHit = now
  } else {
    metrics.missCount++
    metrics.lastMiss = now
    
    // Update average compute time
    if (!computeTimings.has(key)) {
      computeTimings.set(key, [])
    }
    const timings = computeTimings.get(key)!
    timings.push(computeTime)
    
    // Keep only last 100 timings
    if (timings.length > 100) {
      timings.shift()
    }
    
    metrics.averageComputeTime = timings.reduce((sum, time) => sum + time, 0) / timings.length
  }

  // Estimate memory usage (rough approximation)
  if (globalMemoCache.has(key)) {
    try {
      const cached = globalMemoCache.get(key)
      metrics.memoryUsage = JSON.stringify(cached).length * 2 // Rough byte estimate
    } catch {
      metrics.memoryUsage = 0
    }
  }
}

function cleanupGlobalCache(maxSize: number): void {
  const entries = Array.from(globalMemoCache.entries())
    .sort(([, a], [, b]) => a.timestamp - b.timestamp)

  const toRemove = entries.length - Math.floor(maxSize * 0.8) // Remove 20% when full
  
  for (let i = 0; i < toRemove; i++) {
    const [key] = entries[i]
    globalMemoCache.delete(key)
    memoMetrics.delete(key)
    computeTimings.delete(key)
  }
}