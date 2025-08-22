/**
 * Lazy Component Wrapper with Performance Monitoring
 * Provides code splitting and performance tracking for components
 */

import React, { Suspense, ComponentType, lazy, useEffect, useState } from 'react'
import { telemetry } from '@/lib/telemetry'
import { monitor } from '@/lib/monitoring'

interface LazyWrapperProps {
  componentName: string
  fallback?: React.ReactNode
  children?: React.ReactNode
  onLoadStart?: () => void
  onLoadComplete?: (duration: number) => void
  preload?: boolean
  retryCount?: number
}

interface ComponentMetrics {
  loadTime: number
  renderTime: number
  errorCount: number
  retryCount: number
}

const componentMetrics = new Map<string, ComponentMetrics>()

/**
 * Enhanced Suspense wrapper with performance tracking
 */
export function LazyComponentWrapper({
  componentName,
  fallback = <div className="animate-pulse bg-gray-100 h-32 rounded" />,
  children,
  onLoadStart,
  onLoadComplete,
  preload = false,
  retryCount = 3
}: LazyWrapperProps) {
  const [loadStartTime] = useState(Date.now())
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retries, setRetries] = useState(0)

  useEffect(() => {
    onLoadStart?.()
    
    // Record component load start
    telemetry.addSpanAttributes({
      'component.name': componentName,
      'component.load_start': loadStartTime
    })

    return () => {
      if (isLoaded) {
        const duration = Date.now() - loadStartTime
        onLoadComplete?.(duration)
        
        // Record component load metrics
        monitor.trackComponentRender(componentName, duration, {
          loadType: 'lazy',
          preloaded: preload
        })

        // Update component metrics
        const metrics = componentMetrics.get(componentName) || {
          loadTime: 0,
          renderTime: 0,
          errorCount: 0,
          retryCount: 0
        }
        
        metrics.loadTime = duration
        metrics.retryCount = retries
        componentMetrics.set(componentName, metrics)
      }
    }
  }, [componentName, loadStartTime, isLoaded, onLoadComplete, onLoadStart, preload, retries])

  const handleLoad = () => {
    setIsLoaded(true)
    setError(null)
  }

  const handleError = (error: Error) => {
    setError(error)
    
    // Record error
    monitor.trackError(`component:${componentName}`, error, {
      retryCount: retries,
      loadTime: Date.now() - loadStartTime
    })

    // Update error metrics
    const metrics = componentMetrics.get(componentName) || {
      loadTime: 0,
      renderTime: 0,
      errorCount: 0,
      retryCount: 0
    }
    
    metrics.errorCount++
    componentMetrics.set(componentName, metrics)

    // Retry loading if attempts remaining
    if (retries < retryCount) {
      setTimeout(() => {
        setRetries(retries + 1)
        setError(null)
      }, Math.pow(2, retries) * 1000) // Exponential backoff
    }
  }

  if (error && retries >= retryCount) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <h3 className="text-red-800 font-medium">Component Load Error</h3>
        <p className="text-red-600 text-sm mt-1">
          Failed to load {componentName} after {retries} attempts
        </p>
        <button 
          onClick={() => {
            setRetries(0)
            setError(null)
          }}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <Suspense fallback={fallback}>
      <ComponentLoadTracker
        componentName={componentName}
        onLoad={handleLoad}
        onError={handleError}
      >
        {children}
      </ComponentLoadTracker>
    </Suspense>
  )
}

/**
 * Component load tracking wrapper
 */
function ComponentLoadTracker({
  componentName,
  onLoad,
  onError,
  children
}: {
  componentName: string
  onLoad: () => void
  onError: (error: Error) => void
  children: React.ReactNode
}) {
  useEffect(() => {
    try {
      onLoad()
    } catch (error) {
      onError(error as Error)
    }
  }, [onLoad, onError])

  return <>{children}</>
}

/**
 * Higher-order component for lazy loading with performance tracking
 */
export function withLazyLoading<P extends object>(
  componentFactory: () => Promise<{ default: ComponentType<P> }>,
  componentName: string,
  options: Partial<LazyWrapperProps> = {}
) {
  const LazyComponent = lazy(componentFactory)

  return function WrappedComponent(props: P) {
    return (
      <LazyComponentWrapper
        componentName={componentName}
        {...options}
      >
        <LazyComponent {...props} />
      </LazyComponentWrapper>
    )
  }
}

/**
 * Performance-optimized Image component with lazy loading
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  onLoadComplete
}: {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  onLoadComplete?: (duration: number) => void
}) {
  const [loadStart] = useState(Date.now())
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(false)

  const handleLoad = () => {
    setIsLoaded(true)
    const duration = Date.now() - loadStart
    onLoadComplete?.(duration)
    
    // Track image load performance
    monitor.trackComponentRender('image', duration, {
      src: src.substring(0, 50),
      width,
      height,
      priority
    })
  }

  const handleError = () => {
    setError(true)
    monitor.trackError('image', new Error(`Failed to load image: ${src}`))
  }

  if (error) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-sm">Image unavailable</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-100 animate-pulse"
          style={{ width, height }}
        />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}

/**
 * Code splitting utility for route-based components
 */
export const createLazyRoute = (
  routeName: string,
  importFunction: () => Promise<{ default: ComponentType<any> }>
) => {
  return withLazyLoading(
    importFunction,
    `route-${routeName}`,
    {
      fallback: (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      ),
      preload: true
    }
  )
}

/**
 * Get component performance metrics
 */
export function getComponentMetrics(componentName?: string) {
  if (componentName) {
    return componentMetrics.get(componentName)
  }
  
  return Object.fromEntries(componentMetrics.entries())
}

/**
 * Preload component for better performance
 */
export function preloadComponent(importFunction: () => Promise<any>) {
  if (typeof window !== 'undefined') {
    // Preload during idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        importFunction().catch(error => {
          console.warn('Component preload failed:', error)
        })
      })
    } else {
      setTimeout(() => {
        importFunction().catch(error => {
          console.warn('Component preload failed:', error)
        })
      }, 100)
    }
  }
}