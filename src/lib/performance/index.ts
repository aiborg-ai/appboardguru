/**
 * Performance Optimization Package Exports
 * Comprehensive performance optimization with caching, query optimization, and resource management
 */

// Core performance components
export { IntelligentCachingManager } from './intelligent-caching'
export type { 
  CacheEntry,
  CacheMetadata,
  CachePriority,
  CacheLayer,
  CacheLayerType,
  EvictionPolicy,
  CachePattern,
  RevalidationStrategy,
  WarmingStrategy,
  CacheStats,
  CacheWarmer
} from './intelligent-caching'

export { AdvancedQueryOptimizationManager } from './query-optimization'
export type {
  QueryPlan,
  QueryOptimization,
  OptimizationType,
  CacheStrategy,
  IndexRecommendation,
  QueryAnalysis,
  PerformanceMetrics,
  QueryOptimizer
} from './query-optimization'

export { AdvancedResourceOptimizationManager } from './resource-optimization'
export type {
  ResourceMetrics,
  CPUMetrics,
  MemoryMetrics,
  DiskMetrics,
  NetworkMetrics,
  ApplicationMetrics,
  ResourceThreshold,
  ThresholdAction,
  OptimizationRule,
  OptimizationCondition,
  ResourcePool,
  ScalePolicy
} from './resource-optimization'

/**
 * Performance Factory
 * Creates and configures complete performance optimization stack
 */
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { IntelligentCachingManager } from './intelligent-caching'
import { AdvancedQueryOptimizationManager } from './query-optimization'
import { AdvancedResourceOptimizationManager } from './resource-optimization'

export interface PerformanceConfig {
  // Caching configuration
  caching: {
    defaultTtl: number
    maxMemoryUsage: number
    compressionThreshold: number
    encryptionEnabled: boolean
    enablePredictiveWarming: boolean
    enableAdaptiveEviction: boolean
    metricsInterval: number
  }
  
  // Query optimization configuration
  queryOptimization: {
    enableQueryPlanCaching: boolean
    slowQueryThreshold: number
    analysisRetentionDays: number
    enableAutoIndexing: boolean
    enableQueryRewriting: boolean
    maxConcurrentOptimizations: number
  }
  
  // Resource optimization configuration
  resourceOptimization: {
    metricsInterval: number
    retentionPeriod: number
    enableAutoOptimization: boolean
    enablePredictiveScaling: boolean
    gcOptimizationEnabled: boolean
    maxMemoryThreshold: number
    cpuOptimizationThreshold: number
  }
}

export interface PerformanceStack {
  caching: IntelligentCachingManager
  queryOptimization: AdvancedQueryOptimizationManager
  resourceOptimization: AdvancedResourceOptimizationManager
}

/**
 * Create comprehensive performance optimization stack
 */
export async function createPerformanceStack(
  supabase: SupabaseClient<Database>,
  config: PerformanceConfig
): Promise<PerformanceStack> {
  // Initialize caching system
  const caching = new IntelligentCachingManager(config.caching)

  // Initialize query optimization
  const queryOptimization = new AdvancedQueryOptimizationManager(
    supabase,
    caching,
    config.queryOptimization
  )

  // Initialize resource optimization
  const resourceOptimization = new AdvancedResourceOptimizationManager(
    config.resourceOptimization
  )

  // Setup cross-component integrations
  await setupPerformanceIntegrations({ caching, queryOptimization, resourceOptimization })

  return { caching, queryOptimization, resourceOptimization }
}

/**
 * Setup integrations between performance components
 */
async function setupPerformanceIntegrations(stack: PerformanceStack): Promise<void> {
  // Integrate caching with query optimization
  stack.queryOptimization.on('slowQueryDetected', async (event) => {
    // Automatically create cache patterns for slow queries
    if (event.plan.estimatedCost > 10000) {
      stack.caching.addCachePattern({
        name: `auto_${event.queryHash}`,
        pattern: event.queryHash,
        ttl: 3600000, // 1 hour
        tags: ['slow_query', 'auto_generated'],
        revalidation: {
          type: 'time_based',
          config: { interval: 1800000 } // 30 minutes
        },
        warmingStrategy: {
          type: 'scheduled',
          config: { cron: '0 */30 * * * *' } // Every 30 minutes
        }
      })
    }
  })

  // Integrate resource optimization with caching
  stack.resourceOptimization.on('thresholdTriggered', async (event) => {
    if (event.threshold.metric === 'memory.usage' && event.threshold.severity === 'high') {
      // Clear non-essential caches when memory is high
      const stats = stack.caching.getCacheStats()
      if (stats.memoryUsage > 0.8) {
        await stack.caching.invalidateByTags(['low_priority', 'temporary'])
      }
    }
  })

  // Integrate query optimization with resource optimization
  stack.queryOptimization.on('performanceDegradation', async (event) => {
    // Trigger resource optimization when query performance degrades
    await stack.resourceOptimization.optimizeResources()
  })

  // Setup performance monitoring dashboard
  setInterval(async () => {
    const cachingStats = stack.caching.getCacheStats()
    const queryMetrics = stack.queryOptimization.getPerformanceMetrics()
    const resourceReport = stack.resourceOptimization.getResourceUtilizationReport()

    // Emit comprehensive performance report
    const performanceReport = {
      timestamp: new Date().toISOString(),
      caching: {
        hitRate: cachingStats.hitRate,
        memoryUsage: cachingStats.memoryUsage,
        itemCount: cachingStats.itemCount
      },
      queries: {
        avgResponseTime: queryMetrics.overallPerformance.avgResponseTime,
        slowQueryCount: queryMetrics.slowQueries.length,
        throughput: queryMetrics.overallPerformance.throughput
      },
      resources: {
        cpuUsage: resourceReport.current?.cpu.usage || 0,
        memoryUsage: resourceReport.current?.memory.usage || 0,
        diskUsage: resourceReport.current?.disk.usage || 0
      },
      health: {
        cachingHealth: stack.caching.getCacheHealth(),
        overallStatus: calculateOverallHealth(cachingStats, queryMetrics, resourceReport)
      }
    }

    // Emit performance report for monitoring systems
    stack.caching.emit('performanceReport', performanceReport)

  }, 60000) // Every minute
}

/**
 * Calculate overall system health
 */
function calculateOverallHealth(
  cacheStats: any,
  queryMetrics: any,
  resourceReport: any
): 'healthy' | 'degraded' | 'unhealthy' {
  const healthFactors = []

  // Cache health
  if (cacheStats.hitRate < 0.5) healthFactors.push('cache_low_hit_rate')
  if (cacheStats.memoryUsage > 0.9) healthFactors.push('cache_memory_high')

  // Query performance health
  if (queryMetrics.overallPerformance.avgResponseTime > 1000) healthFactors.push('slow_queries')
  if (queryMetrics.overallPerformance.errorRate > 0.05) healthFactors.push('high_error_rate')

  // Resource health
  if (resourceReport.current?.cpu.usage > 90) healthFactors.push('high_cpu')
  if (resourceReport.current?.memory.usage > 90) healthFactors.push('high_memory')

  if (healthFactors.length === 0) return 'healthy'
  if (healthFactors.length <= 2) return 'degraded'
  return 'unhealthy'
}

/**
 * Performance middleware for Next.js
 */
export function createPerformanceMiddleware(stack: PerformanceStack) {
  return async (request: Request): Promise<Response | undefined> => {
    const startTime = Date.now()
    const url = new URL(request.url)
    const cacheKey = `${request.method}:${url.pathname}${url.search}`

    // Try to get cached response
    const cachedResponse = await stack.caching.get(cacheKey)
    if (cachedResponse.success && cachedResponse.data) {
      // Return cached response
      return new Response(JSON.stringify(cachedResponse.data), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Age': String(Date.now() - cachedResponse.data.timestamp)
        }
      })
    }

    // Continue to next middleware/handler
    return undefined
  }
}

/**
 * Performance optimization utilities
 */
export class PerformanceUtils {
  /**
   * Measure function execution time
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T>,
    label?: string
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = Date.now()
    const result = await fn()
    const executionTime = Date.now() - startTime
    
    if (label) {
      console.log(`${label} executed in ${executionTime}ms`)
    }
    
    return { result, executionTime }
  }

  /**
   * Create cache key from object
   */
  static createCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key]
        return acc
      }, {} as Record<string, any>)
    
    const paramString = JSON.stringify(sortedParams)
    const hash = require('crypto').createHash('md5').update(paramString).digest('hex')
    
    return `${prefix}:${hash}`
  }

  /**
   * Batch multiple async operations
   */
  static async batchAsync<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    batchSize: number = 10
  ): Promise<R[]> {
    const results: R[] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(fn))
      results.push(...batchResults)
    }
    
    return results
  }

  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delay)
    }
  }

  /**
   * Throttle function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        fn(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxAttempts) {
          throw lastError
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError!
  }
}

/**
 * Default performance configuration
 */
export const defaultPerformanceConfig: PerformanceConfig = {
  caching: {
    defaultTtl: 3600000, // 1 hour
    maxMemoryUsage: 536870912, // 512MB
    compressionThreshold: 1024, // 1KB
    encryptionEnabled: false,
    enablePredictiveWarming: true,
    enableAdaptiveEviction: true,
    metricsInterval: 60000 // 1 minute
  },
  queryOptimization: {
    enableQueryPlanCaching: true,
    slowQueryThreshold: 1000, // 1 second
    analysisRetentionDays: 30,
    enableAutoIndexing: false, // Requires careful consideration
    enableQueryRewriting: true,
    maxConcurrentOptimizations: 5
  },
  resourceOptimization: {
    metricsInterval: 30000, // 30 seconds
    retentionPeriod: 86400000, // 24 hours
    enableAutoOptimization: true,
    enablePredictiveScaling: false, // Requires ML models
    gcOptimizationEnabled: true,
    maxMemoryThreshold: 85, // 85%
    cpuOptimizationThreshold: 80 // 80%
  }
}

/**
 * Performance monitoring hooks for React components
 */
export const usePerformanceMonitoring = (componentName: string) => {
  const startTime = Date.now()
  
  return {
    recordRender: () => {
      const renderTime = Date.now() - startTime
      console.log(`${componentName} rendered in ${renderTime}ms`)
    },
    
    recordInteraction: (interactionType: string) => {
      const interactionTime = Date.now() - startTime
      console.log(`${componentName} ${interactionType} in ${interactionTime}ms`)
    }
  }
}