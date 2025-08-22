import * as React from "react"

/**
 * Enhanced useMemo with debugging and performance tracking
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  dependencies: React.DependencyList,
  debugName?: string
): T {
  // Track computation count in development
  const computeCountRef = React.useRef(0)

  if (process.env.NODE_ENV === 'development') {
    React.useEffect(() => {
      computeCountRef.current++
      if (debugName) {
        console.log(
          `[useOptimizedMemo] ${debugName} computed ${computeCountRef.current} times`
        )
      }
    }, dependencies)
  }

  return React.useMemo(factory, dependencies)
}

/**
 * useMemo with deep comparison of dependencies
 */
export function useDeepMemo<T>(
  factory: () => T,
  dependencies: React.DependencyList
): T {
  const depsRef = React.useRef<React.DependencyList>()
  const valueRef = React.useRef<T>()

  // Deep compare dependencies
  const depsChanged = React.useMemo(() => {
    if (!depsRef.current) return true
    if (depsRef.current.length !== dependencies.length) return true
    
    return dependencies.some((dep, index) => {
      const prevDep = depsRef.current![index]
      return JSON.stringify(dep) !== JSON.stringify(prevDep)
    })
  }, dependencies)

  if (depsChanged || valueRef.current === undefined) {
    depsRef.current = dependencies
    valueRef.current = factory()
  }

  return valueRef.current!
}

/**
 * Memoize expensive calculations with automatic cache eviction
 */
export function useMemoWithCache<T, K extends string | number>(
  factory: (key: K) => T,
  key: K,
  maxCacheSize: number = 10
): T {
  const cacheRef = React.useRef(new Map<K, T>())

  return React.useMemo(() => {
    const cache = cacheRef.current

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const value = factory(key)

    // Evict oldest entries if cache is full
    if (cache.size >= maxCacheSize) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }

    cache.set(key, value)
    return value
  }, [key, maxCacheSize])
}

/**
 * Stable reference memoization - only updates if value actually changed
 */
export function useStableMemo<T>(value: T): T {
  const ref = React.useRef<T>(value)

  // Only update if value is different (using Object.is for comparison)
  if (!Object.is(ref.current, value)) {
    ref.current = value
  }

  return ref.current
}

/**
 * Memoize arrays to prevent unnecessary re-renders
 */
export function useStableArray<T>(array: T[]): T[] {
  return React.useMemo(() => array, [
    array.length,
    ...array.map(item => 
      typeof item === 'object' && item !== null 
        ? JSON.stringify(item) 
        : item
    )
  ])
}

/**
 * Memoize objects to prevent unnecessary re-renders
 */
export function useStableObject<T extends Record<string, any>>(obj: T): T {
  return React.useMemo(() => obj, [
    Object.keys(obj).length,
    ...Object.entries(obj).flat().map(value =>
      typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : value
    )
  ])
}