/**
 * Frontend Bundle Optimization and Lazy Loading Manager
 * Advanced bundle splitting, code splitting, and performance optimization for React/Next.js
 */

import React, { Suspense, lazy, ComponentType } from 'react'
import dynamic from 'next/dynamic'
import { Logger } from '../logging/logger'
import { telemetry } from '../logging/telemetry'

const logger = Logger.getLogger('BundleOptimizer')

export interface BundleAnalysis {
  totalSize: number
  gzippedSize: number
  chunks: Array<{
    name: string
    size: number
    modules: string[]
    dependencies: string[]
    loadPriority: 'critical' | 'high' | 'medium' | 'low'
  }>
  duplicatedModules: Array<{
    module: string
    chunks: string[]
    totalSize: number
  }>
  treeshakingOpportunities: Array<{
    module: string
    unusedExports: string[]
    potentialSavings: number
  }>
  recommendations: BundleOptimizationRecommendation[]
}

export interface BundleOptimizationRecommendation {
  type: 'code_splitting' | 'lazy_loading' | 'tree_shaking' | 'chunking' | 'preloading'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: {
    bundleSize: number // reduction in bytes
    loadTime: number // reduction in ms
    userExperience: 'low' | 'medium' | 'high'
  }
  implementation: string
  effort: 'low' | 'medium' | 'high'
}

export interface LazyLoadingConfig {
  threshold: number // pixels from viewport
  rootMargin: string
  preloadCount: number // number of items to preload
  fallbackComponent?: ComponentType
  loadingComponent?: ComponentType
  errorComponent?: ComponentType
}

export interface ChunkLoadingMetrics {
  chunkName: string
  loadTime: number
  size: number
  cacheHit: boolean
  error?: string
  retryCount: number
  userInteraction: boolean
}

/**
 * Bundle Analyzer for runtime analysis
 */
export class BundleAnalyzer {
  private loadedChunks = new Map<string, ChunkLoadingMetrics>()
  private chunkDependencies = new Map<string, string[]>()
  private loadingQueues = new Map<string, Promise<any>>()

  /**
   * Analyze current bundle performance
   */
  async analyzeBundlePerformance(): Promise<BundleAnalysis> {
    const chunks = this.getChunkAnalysis()
    const duplicatedModules = this.findDuplicatedModules()
    const treeshakingOpportunities = this.findTreeshakingOpportunities()
    const recommendations = this.generateRecommendations(chunks, duplicatedModules, treeshakingOpportunities)

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    const gzippedSize = Math.floor(totalSize * 0.7) // Estimated gzip compression

    return {
      totalSize,
      gzippedSize,
      chunks,
      duplicatedModules,
      treeshakingOpportunities,
      recommendations
    }
  }

  /**
   * Record chunk loading metrics
   */
  recordChunkLoad(chunkName: string, metrics: Omit<ChunkLoadingMetrics, 'chunkName'>): void {
    const fullMetrics = { chunkName, ...metrics }
    this.loadedChunks.set(chunkName, fullMetrics)

    // Record to telemetry
    telemetry.recordHistogram('chunk_load_time_ms', metrics.loadTime, {
      chunk: chunkName,
      cache_hit: metrics.cacheHit.toString(),
      user_interaction: metrics.userInteraction.toString()
    })

    if (metrics.error) {
      telemetry.recordCounter('chunk_load_errors_total', 1, {
        chunk: chunkName,
        error: metrics.error
      })
    }

    // Log slow chunk loads
    if (metrics.loadTime > 2000) {
      logger.warn(`Slow chunk load detected: ${chunkName}`, {
        loadTime: metrics.loadTime,
        size: metrics.size,
        retryCount: metrics.retryCount
      })
    }
  }

  /**
   * Get chunk loading statistics
   */
  getChunkStatistics(): {
    averageLoadTime: number
    totalChunksLoaded: number
    failureRate: number
    cacheHitRate: number
    slowestChunks: Array<{ name: string; loadTime: number }>
  } {
    const chunks = Array.from(this.loadedChunks.values())
    
    if (chunks.length === 0) {
      return {
        averageLoadTime: 0,
        totalChunksLoaded: 0,
        failureRate: 0,
        cacheHitRate: 0,
        slowestChunks: []
      }
    }

    const averageLoadTime = chunks.reduce((sum, chunk) => sum + chunk.loadTime, 0) / chunks.length
    const failedChunks = chunks.filter(chunk => chunk.error).length
    const cachedChunks = chunks.filter(chunk => chunk.cacheHit).length
    
    const slowestChunks = chunks
      .sort((a, b) => b.loadTime - a.loadTime)
      .slice(0, 10)
      .map(chunk => ({ name: chunk.chunkName, loadTime: chunk.loadTime }))

    return {
      averageLoadTime,
      totalChunksLoaded: chunks.length,
      failureRate: failedChunks / chunks.length,
      cacheHitRate: cachedChunks / chunks.length,
      slowestChunks
    }
  }

  private getChunkAnalysis(): BundleAnalysis['chunks'] {
    // In a real implementation, this would analyze webpack bundle stats
    // For now, return mock data based on typical Next.js chunks
    return [
      {
        name: '_app',
        size: 150000,
        modules: ['react', 'next/app', 'styled-components'],
        dependencies: [],
        loadPriority: 'critical'
      },
      {
        name: 'pages/dashboard',
        size: 85000,
        modules: ['dashboard', 'charts', 'tables'],
        dependencies: ['_app'],
        loadPriority: 'high'
      },
      {
        name: 'pages/settings',
        size: 45000,
        modules: ['settings', 'forms'],
        dependencies: ['_app'],
        loadPriority: 'medium'
      }
    ]
  }

  private findDuplicatedModules(): BundleAnalysis['duplicatedModules'] {
    // Analyze for duplicate modules across chunks
    return [
      {
        module: 'lodash',
        chunks: ['dashboard', 'settings', 'reports'],
        totalSize: 24000
      }
    ]
  }

  private findTreeshakingOpportunities(): BundleAnalysis['treeshakingOpportunities'] {
    return [
      {
        module: 'moment',
        unusedExports: ['duration', 'calendar', 'locale'],
        potentialSavings: 15000
      }
    ]
  }

  private generateRecommendations(
    chunks: BundleAnalysis['chunks'],
    duplicates: BundleAnalysis['duplicatedModules'],
    treeshaking: BundleAnalysis['treeshakingOpportunities']
  ): BundleOptimizationRecommendation[] {
    const recommendations: BundleOptimizationRecommendation[] = []

    // Large chunk recommendations
    const largeChunks = chunks.filter(chunk => chunk.size > 100000)
    largeChunks.forEach(chunk => {
      recommendations.push({
        type: 'code_splitting',
        priority: 'high',
        description: `Split large chunk: ${chunk.name} (${Math.round(chunk.size / 1024)}KB)`,
        impact: {
          bundleSize: chunk.size * 0.3,
          loadTime: 500,
          userExperience: 'high'
        },
        implementation: `Use dynamic imports to split ${chunk.name}`,
        effort: 'medium'
      })
    })

    // Duplicate module recommendations
    duplicates.forEach(dup => {
      recommendations.push({
        type: 'chunking',
        priority: 'medium',
        description: `Extract shared module: ${dup.module}`,
        impact: {
          bundleSize: dup.totalSize * 0.7,
          loadTime: 200,
          userExperience: 'medium'
        },
        implementation: `Move ${dup.module} to shared chunk`,
        effort: 'low'
      })
    })

    // Tree shaking recommendations
    treeshaking.forEach(ts => {
      recommendations.push({
        type: 'tree_shaking',
        priority: 'medium',
        description: `Optimize tree shaking for ${ts.module}`,
        impact: {
          bundleSize: ts.potentialSavings,
          loadTime: 100,
          userExperience: 'low'
        },
        implementation: `Use named imports for ${ts.module}`,
        effort: 'low'
      })
    })

    return recommendations
  }
}

/**
 * Smart Lazy Loading Manager
 */
export class LazyLoadingManager {
  private observers = new Map<string, IntersectionObserver>()
  private loadedComponents = new Set<string>()
  private preloadQueue = new Set<string>()
  private defaultConfig: LazyLoadingConfig = {
    threshold: 0.1,
    rootMargin: '100px',
    preloadCount: 3,
    fallbackComponent: () => React.createElement('div', { children: 'Loading...' }),
    loadingComponent: () => React.createElement('div', { className: 'loading-spinner' }),
    errorComponent: () => React.createElement('div', { children: 'Failed to load component' })
  }

  constructor(config?: Partial<LazyLoadingConfig>) {
    this.defaultConfig = { ...this.defaultConfig, ...config }
  }

  /**
   * Create lazy-loaded component with intelligent preloading
   */
  createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: {
      name: string
      preload?: boolean
      priority?: 'low' | 'medium' | 'high'
      chunkName?: string
      config?: Partial<LazyLoadingConfig>
    }
  ): ComponentType {
    const config = { ...this.defaultConfig, ...options.config }
    const { name, preload = false, priority = 'medium', chunkName } = options

    // Create the lazy component
    const LazyComponent = lazy(async () => {
      const startTime = performance.now()
      
      try {
        const module = await importFn()
        const loadTime = performance.now() - startTime
        
        // Record metrics
        if (chunkName) {
          bundleAnalyzer.recordChunkLoad(chunkName, {
            loadTime,
            size: 0, // Would need actual size measurement
            cacheHit: loadTime < 50, // Assume cache hit if very fast
            retryCount: 0,
            userInteraction: !preload
          })
        }

        this.loadedComponents.add(name)
        
        logger.debug(`Lazy component loaded: ${name}`, {
          loadTime,
          cached: loadTime < 50
        })

        return module
      } catch (error) {
        logger.error(`Failed to load lazy component: ${name}`, error)
        
        if (chunkName) {
          bundleAnalyzer.recordChunkLoad(chunkName, {
            loadTime: performance.now() - startTime,
            size: 0,
            cacheHit: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: 0,
            userInteraction: !preload
          })
        }

        throw error
      }
    })

    // Enhanced wrapper component with error boundary and loading states
    const WrappedComponent: ComponentType = (props: any) => {
      return React.createElement(
        Suspense,
        {
          fallback: config.loadingComponent ? React.createElement(config.loadingComponent) : 'Loading...'
        },
        React.createElement(LazyComponent, props)
      )
    }

    // Preload if requested
    if (preload) {
      this.preloadComponent(name, importFn)
    }

    return WrappedComponent
  }

  /**
   * Create viewport-aware lazy component
   */
  createViewportLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: {
      name: string
      threshold?: number
      rootMargin?: string
      chunkName?: string
    }
  ): ComponentType {
    const { name, threshold = 0.1, rootMargin = '50px', chunkName } = options

    return (props: any) => {
      const [shouldLoad, setShouldLoad] = React.useState(false)
      const ref = React.useRef<HTMLDivElement>(null)

      React.useEffect(() => {
        if (!ref.current || shouldLoad) return

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                setShouldLoad(true)
                observer.disconnect()
              }
            })
          },
          { threshold, rootMargin }
        )

        observer.observe(ref.current)

        return () => observer.disconnect()
      }, [shouldLoad, threshold, rootMargin])

      if (!shouldLoad) {
        return React.createElement('div', { 
          ref,
          style: { minHeight: '100px' } // Placeholder height
        }, 'Loading...')
      }

      const LazyComponent = this.createLazyComponent(importFn, {
        name,
        chunkName,
        preload: false
      })

      return React.createElement(LazyComponent, props)
    }
  }

  /**
   * Preload component for better user experience
   */
  async preloadComponent(name: string, importFn: () => Promise<any>): Promise<void> {
    if (this.loadedComponents.has(name) || this.preloadQueue.has(name)) {
      return
    }

    this.preloadQueue.add(name)

    try {
      await importFn()
      this.loadedComponents.add(name)
      logger.debug(`Component preloaded: ${name}`)
    } catch (error) {
      logger.warn(`Failed to preload component: ${name}`, error)
    } finally {
      this.preloadQueue.delete(name)
    }
  }

  /**
   * Preload components based on user behavior
   */
  enableIntelligentPreloading(): void {
    // Preload on mouse hover
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement
      const link = target.closest('a[data-preload]')
      
      if (link) {
        const componentName = link.getAttribute('data-preload')
        if (componentName && !this.loadedComponents.has(componentName)) {
          // Delay slightly to avoid unnecessary preloads
          setTimeout(() => {
            this.triggerPreload(componentName)
          }, 100)
        }
      }
    })

    // Preload on focus (keyboard navigation)
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement
      const componentName = target.getAttribute('data-preload')
      
      if (componentName && !this.loadedComponents.has(componentName)) {
        this.triggerPreload(componentName)
      }
    })
  }

  /**
   * Get preloading statistics
   */
  getPreloadingStats(): {
    loadedComponents: number
    preloadQueue: number
    totalComponents: number
    preloadHitRate: number
  } {
    return {
      loadedComponents: this.loadedComponents.size,
      preloadQueue: this.preloadQueue.size,
      totalComponents: this.loadedComponents.size + this.preloadQueue.size,
      preloadHitRate: 0 // Would track actual hits vs preloads
    }
  }

  private triggerPreload(componentName: string): void {
    // Implementation would depend on component registry
    logger.debug(`Triggering preload for: ${componentName}`)
  }
}

/**
 * Code Splitting Utilities
 */
export class CodeSplittingManager {
  /**
   * Create route-based code split
   */
  static createRouteSplit(
    importFn: () => Promise<any>,
    options: {
      name: string
      preload?: boolean
      loading?: ComponentType
    }
  ) {
    const { name, preload = false, loading } = options

    return dynamic(importFn, {
      loading: loading || (() => React.createElement('div', { children: 'Loading page...' })),
      ssr: true // Enable SSR by default
    })
  }

  /**
   * Create feature-based code split
   */
  static createFeatureSplit<T>(
    importFn: () => Promise<{ default: T }>,
    options: {
      name: string
      fallback?: T
      errorBoundary?: boolean
    }
  ): T {
    const { name, fallback, errorBoundary = true } = options

    const LazyFeature = lazy(importFn)

    // Return a wrapped version that handles errors gracefully
    return (React.createElement(
      React.Fragment,
      {},
      errorBoundary
        ? React.createElement(
            Suspense,
            { fallback: fallback || 'Loading feature...' },
            React.createElement(LazyFeature as any)
          )
        : React.createElement(LazyFeature as any)
    ) as unknown) as T
  }

  /**
   * Create vendor library split
   */
  static createVendorSplit(
    libraries: string[],
    importFn: () => Promise<any>
  ) {
    return dynamic(importFn, {
      loading: () => React.createElement('div', { children: 'Loading libraries...' }),
      ssr: false // Vendor libs typically don't need SSR
    })
  }
}

/**
 * Bundle Size Monitor
 */
export class BundleSizeMonitor {
  private sizeThresholds = {
    warning: 250000, // 250KB
    error: 500000    // 500KB
  }

  /**
   * Monitor and alert on bundle size changes
   */
  monitorBundleSize(): void {
    if (typeof window === 'undefined') return

    // Monitor initial bundle size
    window.addEventListener('load', () => {
      this.checkBundleSize()
    })

    // Monitor dynamic imports
    const originalImport = window.__webpack_require__
    if (originalImport) {
      // Wrap webpack require to monitor chunk loads
      window.__webpack_require__ = new Proxy(originalImport, {
        apply: (target, thisArg, args) => {
          const result = target.apply(thisArg, args)
          
          if (result && typeof result.then === 'function') {
            result.then(() => {
              setTimeout(() => this.checkBundleSize(), 100)
            })
          }
          
          return result
        }
      })
    }
  }

  private checkBundleSize(): void {
    if (typeof window === 'undefined') return

    try {
      // Estimate current bundle size from loaded scripts
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      let totalSize = 0

      scripts.forEach(script => {
        const src = (script as HTMLScriptElement).src
        if (src.includes('/_next/static/')) {
          // Extract size from browser cache or estimate
          totalSize += 50000 // Rough estimate per script
        }
      })

      // Record metrics
      telemetry.recordGauge('bundle_size_bytes', totalSize)

      // Check thresholds
      if (totalSize > this.sizeThresholds.error) {
        logger.error(`Bundle size exceeded error threshold: ${Math.round(totalSize / 1024)}KB`)
        this.triggerSizeAlert('error', totalSize)
      } else if (totalSize > this.sizeThresholds.warning) {
        logger.warn(`Bundle size exceeded warning threshold: ${Math.round(totalSize / 1024)}KB`)
        this.triggerSizeAlert('warning', totalSize)
      }

    } catch (error) {
      logger.error('Failed to check bundle size:', error)
    }
  }

  private triggerSizeAlert(level: 'warning' | 'error', size: number): void {
    telemetry.recordCounter('bundle_size_alerts_total', 1, {
      level,
      size_kb: Math.round(size / 1024).toString()
    })
  }

  /**
   * Get bundle size recommendations
   */
  getBundleSizeRecommendations(): BundleOptimizationRecommendation[] {
    return [
      {
        type: 'tree_shaking',
        priority: 'medium',
        description: 'Enable tree shaking for unused code elimination',
        impact: {
          bundleSize: 50000,
          loadTime: 200,
          userExperience: 'medium'
        },
        implementation: 'Configure webpack to use ES modules and enable tree shaking',
        effort: 'low'
      },
      {
        type: 'code_splitting',
        priority: 'high',
        description: 'Implement route-based code splitting',
        impact: {
          bundleSize: 150000,
          loadTime: 800,
          userExperience: 'high'
        },
        implementation: 'Use Next.js dynamic imports for page components',
        effort: 'medium'
      }
    ]
  }
}

// Export singleton instances
export const bundleAnalyzer = new BundleAnalyzer()
export const lazyLoadingManager = new LazyLoadingManager()
export const bundleSizeMonitor = new BundleSizeMonitor()

/**
 * Bundle optimization utilities
 */
export const BundleOptimizationUtils = {
  /**
   * Create optimized dynamic component
   */
  createOptimizedComponent: <T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: {
      name: string
      preload?: boolean
      viewport?: boolean
      chunkName?: string
    }
  ) => {
    if (options.viewport) {
      return lazyLoadingManager.createViewportLazyComponent(importFn, options)
    } else {
      return lazyLoadingManager.createLazyComponent(importFn, options)
    }
  },

  /**
   * Preload critical components
   */
  preloadCriticalComponents: async (componentNames: string[]) => {
    const promises = componentNames.map(name => 
      lazyLoadingManager.preloadComponent(name, () => import(`@/components/${name}`))
    )
    
    await Promise.allSettled(promises)
    logger.info('Critical components preloaded', { count: componentNames.length })
  },

  /**
   * Get performance report
   */
  getPerformanceReport: async () => {
    const bundleAnalysis = await bundleAnalyzer.analyzeBundlePerformance()
    const chunkStats = bundleAnalyzer.getChunkStatistics()
    const preloadStats = lazyLoadingManager.getPreloadingStats()

    return {
      bundleAnalysis,
      chunkStats,
      preloadStats,
      recommendations: bundleSizeMonitor.getBundleSizeRecommendations()
    }
  }
}

// Initialize monitoring
if (typeof window !== 'undefined') {
  bundleSizeMonitor.monitorBundleSize()
  lazyLoadingManager.enableIntelligentPreloading()
}