import * as React from "react"

/**
 * Enhanced useCallback that tracks dependencies more efficiently
 * and provides debugging information in development
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList,
  debugName?: string
): T {
  // In development, log when callback is recreated
  const callbackRef = React.useRef(callback)
  const depsRef = React.useRef(dependencies)

  if (process.env['NODE_ENV'] === 'development') {
    React.useEffect(() => {
      if (debugName) {
        console.log(`[useOptimizedCallback] ${debugName} callback recreated`)
      }
    }, dependencies)
  }

  return React.useCallback(callback, dependencies)
}

/**
 * useCallback that only recreates when dependencies actually change (deep comparison)
 */
export function useDeepCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList
): T {
  const depsRef = React.useRef<React.DependencyList>()
  const callbackRef = React.useRef<T>()

  // Deep compare dependencies
  const depsChanged = React.useMemo(() => {
    if (!depsRef.current) return true
    if (depsRef.current.length !== dependencies.length) return true
    
    return dependencies.some((dep, index) => {
      const prevDep = depsRef.current![index]
      return JSON.stringify(dep) !== JSON.stringify(prevDep)
    })
  }, dependencies)

  if (depsChanged) {
    depsRef.current = dependencies
    callbackRef.current = callback
  }

  return callbackRef.current!
}

/**
 * Throttled callback hook
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  dependencies: React.DependencyList
): T {
  const throttleRef = React.useRef<NodeJS.Timeout>()
  const argsRef = React.useRef<Parameters<T>>()

  const throttledCallback = React.useCallback(
    (...args: Parameters<T>) => {
      argsRef.current = args

      if (throttleRef.current) return

      throttleRef.current = setTimeout(() => {
        if (argsRef.current) {
          callback(...argsRef.current)
        }
        throttleRef.current = undefined
      }, delay)
    },
    [callback, delay, ...dependencies]
  ) as T

  React.useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current)
      }
    }
  }, [])

  return throttledCallback
}

/**
 * Debounced callback hook
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  dependencies: React.DependencyList
): T {
  const timeoutRef = React.useRef<NodeJS.Timeout>()

  const debouncedCallback = React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay, ...dependencies]
  ) as T

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}