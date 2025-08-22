// Export all middleware
export * from './logging-middleware'
export * from './persistence-middleware'
export * from './devtools-middleware'

// Middleware composition utilities
import { StateCreator } from 'zustand'
import { logging, LoggingConfig } from './logging-middleware'
import { enhancedPersist, EnhancedPersistOptions } from './persistence-middleware'
import { enhancedDevtools, EnhancedDevtoolsOptions } from './devtools-middleware'

// Combined middleware options
export interface MiddlewareOptions<T> {
  logging?: {
    enabled?: boolean
    storeName?: string
    config?: Partial<LoggingConfig>
  }
  persistence?: EnhancedPersistOptions<T>
  devtools?: EnhancedDevtoolsOptions
}

// Middleware composer for applying multiple middleware
export function composeMiddleware<T>(
  storeInitializer: StateCreator<T, [], [], T>,
  options: MiddlewareOptions<T> = {}
): StateCreator<T, [], [], T> {
  let composedStore = storeInitializer

  // Apply logging middleware
  if (options.logging?.enabled !== false) {
    composedStore = logging(
      composedStore,
      options.logging?.storeName,
      options.logging?.config
    )
  }

  // Apply persistence middleware
  if (options.persistence) {
    composedStore = enhancedPersist(options.persistence)(composedStore)
  }

  // Apply devtools middleware
  if (options.devtools?.enabled !== false) {
    composedStore = enhancedDevtools(options.devtools)(composedStore)
  }

  return composedStore
}

// Pre-configured middleware combinations
export const middlewarePresets = {
  // Development preset with all features enabled
  development: <T>(storeName: string, persistOptions?: Partial<EnhancedPersistOptions<T>>) => ({
    logging: {
      enabled: true,
      storeName,
      config: {
        logLevel: 'debug' as const,
        includeState: true,
        includePreviousState: true,
        includeTimestamp: true,
        includeStackTrace: true
      }
    },
    persistence: {
      name: storeName,
      storage: 'localStorage' as const,
      ...persistOptions
    },
    devtools: {
      enabled: true,
      name: storeName,
      timeTravel: {
        enabled: true,
        maxSnapshots: 50,
        autoSave: true
      },
      actionLogging: {
        enabled: true,
        logLevel: 'debug' as const,
        includeState: true,
        includeTimestamp: true
      }
    }
  }),

  // Production preset with minimal overhead
  production: <T>(storeName: string, persistOptions?: Partial<EnhancedPersistOptions<T>>) => ({
    logging: {
      enabled: false
    },
    persistence: {
      name: storeName,
      storage: 'localStorage' as const,
      encryption: {
        enabled: true
      },
      compression: {
        enabled: true
      },
      ...persistOptions
    },
    devtools: {
      enabled: false
    }
  }),

  // Testing preset optimized for test environments
  testing: <T>(storeName: string) => ({
    logging: {
      enabled: true,
      storeName,
      config: {
        logLevel: 'warn' as const,
        includeState: false,
        includePreviousState: false,
        includeTimestamp: false
      }
    },
    persistence: {
      name: storeName,
      storage: 'memory' as const
    },
    devtools: {
      enabled: false
    }
  }),

  // Minimal preset with basic features
  minimal: <T>(storeName: string) => ({
    logging: {
      enabled: false
    },
    persistence: {
      name: storeName,
      storage: 'memory' as const
    },
    devtools: {
      enabled: false
    }
  })
}

// Environment-aware middleware configurator
export function createMiddlewareConfig<T>(
  storeName: string,
  customOptions: Partial<MiddlewareOptions<T>> = {}
): MiddlewareOptions<T> {
  const env = process.env.NODE_ENV

  let baseConfig: MiddlewareOptions<T>

  switch (env) {
    case 'development':
      baseConfig = middlewarePresets.development(storeName)
      break
    case 'test':
      baseConfig = middlewarePresets.testing(storeName)
      break
    case 'production':
      baseConfig = middlewarePresets.production(storeName)
      break
    default:
      baseConfig = middlewarePresets.minimal(storeName)
  }

  // Deep merge custom options
  return {
    logging: {
      ...baseConfig.logging,
      ...customOptions.logging,
      config: {
        ...baseConfig.logging?.config,
        ...customOptions.logging?.config
      }
    },
    persistence: {
      ...baseConfig.persistence,
      ...customOptions.persistence,
      encryption: {
        ...baseConfig.persistence?.encryption,
        ...customOptions.persistence?.encryption
      },
      compression: {
        ...baseConfig.persistence?.compression,
        ...customOptions.persistence?.compression
      },
      sync: {
        ...baseConfig.persistence?.sync,
        ...customOptions.persistence?.sync
      }
    },
    devtools: {
      ...baseConfig.devtools,
      ...customOptions.devtools,
      timeTravel: {
        ...baseConfig.devtools?.timeTravel,
        ...customOptions.devtools?.timeTravel
      },
      actionLogging: {
        ...baseConfig.devtools?.actionLogging,
        ...customOptions.devtools?.actionLogging
      }
    }
  }
}

// Enhanced store creator with middleware
export function createEnhancedStore<T>(
  storeInitializer: StateCreator<T, [], [], T>,
  storeName: string,
  customOptions: Partial<MiddlewareOptions<T>> = {}
) {
  const middlewareConfig = createMiddlewareConfig(storeName, customOptions)
  return composeMiddleware(storeInitializer, middlewareConfig)
}

// Utility for adding middleware to existing stores
export function enhanceExistingStore<T>(
  store: any,
  storeName: string,
  options: Partial<MiddlewareOptions<T>> = {}
) {
  console.warn(
    '[Middleware] enhanceExistingStore is for debugging only. ' +
    'Create stores with middleware from the beginning for best performance.'
  )

  // This is a debugging utility and shouldn't be used in production
  if (process.env.NODE_ENV !== 'development') {
    return store
  }

  // Add debugging capabilities to existing store
  return {
    ...store,
    $$enhanced: true,
    $$storeName: storeName,
    $$options: options
  }
}

// Middleware performance monitoring
export class MiddlewarePerformanceMonitor {
  private metrics: Map<string, {
    totalTime: number
    callCount: number
    averageTime: number
    maxTime: number
    minTime: number
  }> = new Map()

  startTiming(middlewareName: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      this.recordMetric(middlewareName, duration)
    }
  }

  private recordMetric(middlewareName: string, duration: number): void {
    const existing = this.metrics.get(middlewareName) || {
      totalTime: 0,
      callCount: 0,
      averageTime: 0,
      maxTime: 0,
      minTime: Infinity
    }

    existing.totalTime += duration
    existing.callCount++
    existing.averageTime = existing.totalTime / existing.callCount
    existing.maxTime = Math.max(existing.maxTime, duration)
    existing.minTime = Math.min(existing.minTime, duration)

    this.metrics.set(middlewareName, existing)
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {}
    
    for (const [name, metrics] of this.metrics) {
      result[name] = {
        ...metrics,
        minTime: metrics.minTime === Infinity ? 0 : metrics.minTime
      }
    }
    
    return result
  }

  reset(): void {
    this.metrics.clear()
  }

  logSummary(): void {
    const metrics = this.getMetrics()
    
    console.group('[Middleware Performance]')
    console.table(metrics)
    console.groupEnd()
  }
}

// Global performance monitor
export const middlewarePerformanceMonitor = new MiddlewarePerformanceMonitor()

// Development utilities
if (process.env.NODE_ENV === 'development') {
  // Make middleware utilities available globally
  (window as any).zustandMiddleware = {
    composeMiddleware,
    middlewarePresets,
    createMiddlewareConfig,
    createEnhancedStore,
    performanceMonitor: middlewarePerformanceMonitor
  }

  // Auto-log performance summary every 30 seconds
  setInterval(() => {
    const metrics = middlewarePerformanceMonitor.getMetrics()
    if (Object.keys(metrics).length > 0) {
      middlewarePerformanceMonitor.logSummary()
    }
  }, 30000)
}