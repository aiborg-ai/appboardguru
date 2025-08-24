/**
 * PDF Performance Hook
 * Optimizes PDF rendering and annotation performance
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { throttle, debounce } from 'lodash'

interface PDFPerformanceConfig {
  enableVirtualization?: boolean
  maxCacheSize?: number
  throttleRender?: number
  debounceAnnotations?: number
  enableWorker?: boolean
}

interface PDFPerformanceMetrics {
  renderTime: number
  annotationCount: number
  pageLoadTime: number
  memoryUsage: number
  fps: number
}

export function usePDFPerformance(config: PDFPerformanceConfig = {}) {
  const {
    enableVirtualization = true,
    maxCacheSize = 10,
    throttleRender = 16, // 60fps
    debounceAnnotations = 100,
    enableWorker = true
  } = config

  const [metrics, setMetrics] = useState<PDFPerformanceMetrics>({
    renderTime: 0,
    annotationCount: 0,
    pageLoadTime: 0,
    memoryUsage: 0,
    fps: 0
  })

  const [isOptimized, setIsOptimized] = useState<boolean>(false)
  const renderTimeRef = useRef<number>(0)
  const fpsRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(performance.now())

  // Page cache for better performance
  const pageCacheRef = useRef<Map<number, any>>(new Map())

  // Throttled render function
  const throttledRender = useCallback(
    throttle((renderFn: () => void) => {
      const startTime = performance.now()
      renderFn()
      const endTime = performance.now()
      
      renderTimeRef.current = endTime - startTime
      updateMetrics()
    }, throttleRender),
    [throttleRender]
  )

  // Debounced annotation update
  const debouncedAnnotationUpdate = useCallback(
    debounce((updateFn: () => void) => {
      updateFn()
    }, debounceAnnotations),
    [debounceAnnotations]
  )

  // Update performance metrics
  const updateMetrics = useCallback(() => {
    const now = performance.now()
    const deltaTime = now - lastFrameTimeRef.current
    
    frameCountRef.current++
    
    if (deltaTime >= 1000) { // Update FPS every second
      fpsRef.current = Math.round((frameCountRef.current * 1000) / deltaTime)
      frameCountRef.current = 0
      lastFrameTimeRef.current = now
    }

    // Get memory usage (if available)
    let memoryUsage = 0
    if ('memory' in performance) {
      const memory = (performance as any).memory
      memoryUsage = memory.usedJSHeapSize / (1024 * 1024) // Convert to MB
    }

    setMetrics(prev => ({
      ...prev,
      renderTime: renderTimeRef.current,
      memoryUsage,
      fps: fpsRef.current
    }))
  }, [])

  // Page cache management
  const cachePage = useCallback((pageNumber: number, pageData: any) => {
    if (!enableVirtualization) return

    const cache = pageCacheRef.current
    
    // Remove oldest entries if cache is full
    if (cache.size >= maxCacheSize) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
    
    cache.set(pageNumber, {
      data: pageData,
      timestamp: Date.now()
    })
  }, [enableVirtualization, maxCacheSize])

  const getCachedPage = useCallback((pageNumber: number) => {
    if (!enableVirtualization) return null
    
    const cached = pageCacheRef.current.get(pageNumber)
    if (cached) {
      // Check if cache is still fresh (5 minutes)
      const isStale = Date.now() - cached.timestamp > 5 * 60 * 1000
      if (isStale) {
        pageCacheRef.current.delete(pageNumber)
        return null
      }
      return cached.data
    }
    return null
  }, [enableVirtualization])

  // Clear cache
  const clearCache = useCallback(() => {
    pageCacheRef.current.clear()
  }, [])

  // Optimize rendering based on device capabilities
  const optimizeRendering = useCallback(() => {
    // Check device capabilities
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) return

    // Test rendering performance
    const testStart = performance.now()
    
    // Draw a complex shape to test performance
    canvas.width = 1000
    canvas.height = 1000
    context.fillStyle = '#ff0000'
    for (let i = 0; i < 1000; i++) {
      context.fillRect(Math.random() * 1000, Math.random() * 1000, 10, 10)
    }
    
    const testEnd = performance.now()
    const testTime = testEnd - testStart
    
    // Set optimization level based on performance
    const isHighPerformance = testTime < 50 // Less than 50ms for the test
    
    setIsOptimized(isHighPerformance)
    
    return {
      isHighPerformance,
      testTime,
      recommendations: {
        enableAntiAliasing: isHighPerformance,
        useHighQuality: isHighPerformance,
        enableSmoothScrolling: isHighPerformance,
        maxAnnotationsPerPage: isHighPerformance ? 100 : 20
      }
    }
  }, [])

  // Monitor performance and adjust settings
  useEffect(() => {
    const interval = setInterval(() => {
      updateMetrics()
      
      // Auto-adjust performance settings based on FPS
      if (metrics.fps < 30 && metrics.fps > 0) {
        console.warn('PDF performance degraded, consider reducing quality')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [updateMetrics, metrics.fps])

  // Initialize performance monitoring
  useEffect(() => {
    optimizeRendering()
  }, [optimizeRendering])

  return {
    // Performance metrics
    metrics,
    isOptimized,
    
    // Optimized functions
    throttledRender,
    debouncedAnnotationUpdate,
    
    // Cache management
    cachePage,
    getCachedPage,
    clearCache,
    
    // Performance optimization
    optimizeRendering,
    
    // Utility functions
    measureRenderTime: (renderFn: () => void) => {
      const start = performance.now()
      renderFn()
      const end = performance.now()
      return end - start
    },
    
    // Check if we should reduce quality
    shouldReduceQuality: () => {
      return metrics.fps < 30 || metrics.memoryUsage > 100 // 100MB threshold
    },
    
    // Get recommended settings
    getRecommendedSettings: () => ({
      quality: isOptimized ? 'high' : 'medium',
      enableAntiAliasing: isOptimized && metrics.fps > 45,
      maxAnnotationsPerPage: isOptimized ? 100 : 20,
      enableSmoothScrolling: metrics.fps > 30,
      prefetchPages: isOptimized ? 3 : 1
    })
  }
}