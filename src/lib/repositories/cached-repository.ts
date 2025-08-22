/**
 * Cached Repository Layer
 * Extends BaseRepository with intelligent caching, TTL-based invalidation,
 * and cache warming strategies
 */

import { BaseRepository } from './base.repository'
import { CacheManager, CacheConfig, cached } from '../cache/CacheManager'
import { Result, success, failure, RepositoryError, isSuccess } from './result'
import type { Database } from '../../types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// Cache configuration presets
export const CachePresets = {
  // Short-lived cache for frequently changing data
  REALTIME: { ttl: 30, priority: 'high' as const },
  
  // Medium-lived cache for user data
  USER_DATA: { ttl: 300, priority: 'normal' as const }, // 5 minutes
  
  // Long-lived cache for relatively static data
  STATIC_DATA: { ttl: 1800, priority: 'normal' as const }, // 30 minutes
  
  // Very long-lived cache for rarely changing data
  CONFIG_DATA: { ttl: 3600, priority: 'low' as const }, // 1 hour
  
  // Session-based cache for user-specific data
  SESSION_DATA: { ttl: 900, priority: 'high' as const }, // 15 minutes
} as const

export interface CacheInvalidationStrategy {
  // Patterns to invalidate when this operation occurs
  patterns: string[]
  
  // Tags to invalidate
  tags?: string[]
  
  // Whether to invalidate immediately or defer
  immediate?: boolean
  
  // Custom invalidation logic
  customLogic?: () => Promise<void>
}

export interface CacheStatistics {
  hits: number
  misses: number
  hitRate: number
  avgResponseTime: number
  cacheSize: number
  lastAccessed: Date
  topKeys: Array<{ key: string; hits: number; lastAccessed: Date }>
}

export interface CacheWarmingStrategy {
  // Data to pre-load into cache
  keys: string[]
  
  // Warming priority
  priority: 'low' | 'medium' | 'high'
  
  // Warming schedule (cron-like)
  schedule?: string
  
  // Custom warming logic
  warmingLogic?: () => Promise<void>
}

/**
 * Enhanced repository with intelligent caching capabilities
 */
export abstract class CachedRepository extends BaseRepository {
  protected cacheManager: CacheManager
  protected defaultCacheConfig: CacheConfig = CachePresets.USER_DATA
  private stats: Map<string, { hits: number; misses: number; times: number[] }> = new Map()

  constructor(
    supabase: SupabaseClient<Database>,
    cacheManager?: CacheManager
  ) {
    super(supabase)
    this.cacheManager = cacheManager || this.createDefaultCacheManager()
  }

  /**
   * Create default cache manager if none provided
   */
  private createDefaultCacheManager(): CacheManager {
    // This would typically be injected, but providing fallback
    const { CacheManager: CacheManagerClass, MemoryCache } = require('../cache/CacheManager')
    const memoryCache = new MemoryCache(1000, 300)
    return new CacheManagerClass([memoryCache])
  }

  /**
   * Execute cached query with automatic cache key generation
   */
  protected async executeWithCache<T>(
    operation: () => Promise<Result<T>>,
    cacheKeyPrefix: string,
    keyParams: Record<string, any> = {},
    config: CacheConfig = this.defaultCacheConfig,
    invalidationStrategy?: CacheInvalidationStrategy
  ): Promise<Result<T>> {
    const startTime = Date.now()
    const cacheKey = this.cacheManager.generateKey(
      `${this.getEntityName()}:${cacheKeyPrefix}`,
      '',
      keyParams
    )

    try {
      // Try to get from cache first
      const cached = await this.cacheManager.get<T>(cacheKey)
      if (cached !== null) {
        this.recordCacheHit(cacheKey, Date.now() - startTime)
        return success(cached, { cached: true, cacheKey })
      }

      // Cache miss - execute operation
      this.recordCacheMiss(cacheKey)
      const result = await operation()

      // Cache successful results
      if (isSuccess(result) && result.data !== null) {
        await this.cacheManager.set(cacheKey, result.data, config)

        // Set up cache invalidation if strategy provided
        if (invalidationStrategy) {
          await this.setupCacheInvalidation(cacheKey, invalidationStrategy)
        }
      }

      const responseTime = Date.now() - startTime
      return isSuccess(result) 
        ? success(result.data, { ...result.metadata, cached: false, cacheKey, responseTime })
        : result

    } catch (error) {
      return failure(RepositoryError.internal('Cache operation failed', error))
    }
  }

  /**
   * Execute cached paginated query
   */
  protected async executeWithPaginatedCache<T>(
    operation: () => Promise<Result<{ data: T[]; count: number }>>,
    cacheKeyPrefix: string,
    keyParams: Record<string, any> = {},
    config: CacheConfig = CachePresets.USER_DATA
  ): Promise<Result<{ data: T[]; count: number }>> {
    // Include pagination parameters in cache key
    const paginationKey = `${cacheKeyPrefix}:${JSON.stringify(keyParams)}`
    
    return this.executeWithCache(
      operation,
      paginationKey,
      keyParams,
      config,
      {
        patterns: [`${this.getEntityName()}:${cacheKeyPrefix}:*`],
        immediate: false
      }
    )
  }

  /**
   * Cached find by ID with optimistic updates
   */
  protected async cachedFindById<T>(
    id: string,
    operation: () => Promise<Result<T | null>>,
    config: CacheConfig = CachePresets.USER_DATA
  ): Promise<Result<T | null>> {
    return this.executeWithCache(
      operation,
      'findById',
      { id },
      config,
      {
        patterns: [`${this.getEntityName()}:findById:${id}`],
        immediate: true
      }
    )
  }

  /**
   * Cached create with automatic invalidation
   */
  protected async cachedCreate<T>(
    operation: () => Promise<Result<T>>,
    invalidationPatterns: string[] = []
  ): Promise<Result<T>> {
    const result = await operation()

    if (isSuccess(result)) {
      // Invalidate relevant cache patterns
      const patterns = [
        `${this.getEntityName()}:find*`,
        `${this.getEntityName()}:search*`,
        `${this.getEntityName()}:count*`,
        ...invalidationPatterns
      ]

      await Promise.allSettled(
        patterns.map(pattern => this.cacheManager.invalidate(pattern))
      )
    }

    return result
  }

  /**
   * Cached update with targeted invalidation
   */
  protected async cachedUpdate<T>(
    id: string,
    operation: () => Promise<Result<T>>,
    invalidationPatterns: string[] = []
  ): Promise<Result<T>> {
    const result = await operation()

    if (isSuccess(result)) {
      // Invalidate specific entity and related patterns
      const patterns = [
        `${this.getEntityName()}:findById:${id}`,
        `${this.getEntityName()}:find*`,
        `${this.getEntityName()}:search*`,
        ...invalidationPatterns
      ]

      await Promise.allSettled(
        patterns.map(pattern => this.cacheManager.invalidate(pattern))
      )
    }

    return result
  }

  /**
   * Cached delete with comprehensive invalidation
   */
  protected async cachedDelete(
    id: string,
    operation: () => Promise<Result<void>>,
    invalidationPatterns: string[] = []
  ): Promise<Result<void>> {
    const result = await operation()

    if (isSuccess(result)) {
      // Invalidate all related cache entries
      const patterns = [
        `${this.getEntityName()}:findById:${id}`,
        `${this.getEntityName()}:find*`,
        `${this.getEntityName()}:search*`,
        `${this.getEntityName()}:count*`,
        ...invalidationPatterns
      ]

      await Promise.allSettled(
        patterns.map(pattern => this.cacheManager.invalidate(pattern))
      )
    }

    return result
  }

  /**
   * Cached search with intelligent key generation
   */
  protected async cachedSearch<T>(
    searchParams: Record<string, any>,
    operation: () => Promise<Result<T[]>>,
    config: CacheConfig = CachePresets.USER_DATA
  ): Promise<Result<T[]>> {
    return this.executeWithCache(
      operation,
      'search',
      searchParams,
      config,
      {
        patterns: [`${this.getEntityName()}:search:*`],
        immediate: false
      }
    )
  }

  /**
   * Preload commonly accessed data into cache
   */
  async warmCache(strategies: CacheWarmingStrategy[]): Promise<Result<{ warmed: number; failed: number }>> {
    let warmed = 0
    let failed = 0

    for (const strategy of strategies) {
      try {
        if (strategy.customLogic) {
          await strategy.customLogic()
          warmed += strategy.keys.length
        } else {
          // Default warming logic for common keys
          const results = await Promise.allSettled(
            strategy.keys.map(key => this.warmCacheKey(key))
          )

          warmed += results.filter(r => r.status === 'fulfilled').length
          failed += results.filter(r => r.status === 'rejected').length
        }
      } catch (error) {
        failed += strategy.keys.length
        console.error(`Cache warming failed for strategy:`, error)
      }
    }

    return success({ warmed, failed })
  }

  /**
   * Warm specific cache key with data
   */
  protected async warmCacheKey(key: string): Promise<void> {
    // This would typically fetch data and cache it
    // Implementation depends on specific repository needs
    console.log(`Warming cache key: ${key}`)
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStatistics(): Promise<Result<CacheStatistics>> {
    try {
      const cacheStats = await this.cacheManager.getStats()
      const repoStats = this.getRepositoryStats()

      const topKeys = Array.from(this.stats.entries())
        .map(([key, stats]) => ({
          key,
          hits: stats.hits,
          lastAccessed: new Date() // Simplified
        }))
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 10)

      const totalHits = repoStats.totalHits
      const totalMisses = repoStats.totalMisses
      const totalRequests = totalHits + totalMisses

      const statistics: CacheStatistics = {
        hits: totalHits,
        misses: totalMisses,
        hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
        avgResponseTime: repoStats.avgResponseTime,
        cacheSize: Object.values(cacheStats).reduce((sum, stat) => sum + stat.size, 0),
        lastAccessed: new Date(),
        topKeys
      }

      return success(statistics)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get cache statistics', error))
    }
  }

  /**
   * Clear cache for this repository
   */
  async clearCache(patterns?: string[]): Promise<Result<void>> {
    try {
      if (patterns) {
        await Promise.allSettled(
          patterns.map(pattern => this.cacheManager.invalidate(pattern))
        )
      } else {
        // Clear all cache entries for this entity
        await this.cacheManager.invalidate(`${this.getEntityName()}:*`)
      }

      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to clear cache', error))
    }
  }

  /**
   * Set up cache invalidation strategy
   */
  private async setupCacheInvalidation(
    cacheKey: string,
    strategy: CacheInvalidationStrategy
  ): Promise<void> {
    // This would integrate with a more sophisticated cache invalidation system
    // For now, just store the strategy for reference
    console.log(`Setting up cache invalidation for key: ${cacheKey}`, strategy)
  }

  /**
   * Record cache hit for statistics
   */
  private recordCacheHit(key: string, responseTime: number): void {
    const stats = this.stats.get(key) || { hits: 0, misses: 0, times: [] }
    stats.hits++
    stats.times.push(responseTime)
    
    // Keep only last 100 response times
    if (stats.times.length > 100) {
      stats.times = stats.times.slice(-100)
    }
    
    this.stats.set(key, stats)
  }

  /**
   * Record cache miss for statistics
   */
  private recordCacheMiss(key: string): void {
    const stats = this.stats.get(key) || { hits: 0, misses: 0, times: [] }
    stats.misses++
    this.stats.set(key, stats)
  }

  /**
   * Get repository-level statistics
   */
  private getRepositoryStats() {
    const allStats = Array.from(this.stats.values())
    const totalHits = allStats.reduce((sum, stat) => sum + stat.hits, 0)
    const totalMisses = allStats.reduce((sum, stat) => sum + stat.misses, 0)
    
    const allTimes = allStats.flatMap(stat => stat.times)
    const avgResponseTime = allTimes.length > 0 
      ? allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length
      : 0

    return {
      totalHits,
      totalMisses,
      avgResponseTime
    }
  }

  /**
   * Decorator for automatic caching
   */
  protected withCache<T extends any[], R>(
    config: CacheConfig,
    keyGenerator: (...args: T) => string
  ) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value

      descriptor.value = async function (...args: T) {
        const cacheKey = keyGenerator(...args)
        
        // Try cache first
        const cached = await this.cacheManager.get(cacheKey)
        if (cached !== null) {
          this.recordCacheHit(cacheKey, 0) // Immediate response
          return success(cached, { cached: true })
        }

        // Execute original method
        const result = await originalMethod.apply(this, args)
        
        // Cache successful results
        if (isSuccess(result) && result.data !== null) {
          await this.cacheManager.set(cacheKey, result.data, config)
        }

        this.recordCacheMiss(cacheKey)
        return result
      }

      return descriptor
    }
  }
}

/**
 * Cache-aware repository mixin
 * Adds caching capabilities to existing repositories without requiring inheritance
 */
export function withCaching<TBase extends new (...args: any[]) => BaseRepository>(
  Base: TBase,
  cacheManager?: CacheManager
) {
  return class extends Base {
    private cacheManager: CacheManager
    private stats: Map<string, { hits: number; misses: number; times: number[] }> = new Map()

    constructor(...args: any[]) {
      super(...args)
      this.cacheManager = cacheManager || this.createDefaultCacheManager()
    }

    private createDefaultCacheManager(): CacheManager {
      const { CacheManager: CacheManagerClass, MemoryCache } = require('../cache/CacheManager')
      const memoryCache = new MemoryCache(1000, 300)
      return new CacheManagerClass([memoryCache])
    }

    /**
     * Wrap any repository method with caching
     */
    async withCache<T>(
      operation: () => Promise<T>,
      cacheKey: string,
      config: CacheConfig = CachePresets.USER_DATA
    ): Promise<T> {
      const startTime = Date.now()

      try {
        // Try cache first
        const cached = await this.cacheManager.get<T>(cacheKey)
        if (cached !== null) {
          this.recordCacheHit(cacheKey, Date.now() - startTime)
          return cached
        }

        // Execute operation
        this.recordCacheMiss(cacheKey)
        const result = await operation()

        // Cache the result
        if (result !== null && result !== undefined) {
          await this.cacheManager.set(cacheKey, result, config)
        }

        return result
      } catch (error) {
        console.error(`Cache operation failed for key ${cacheKey}:`, error)
        // Fall back to original operation
        return await operation()
      }
    }

    /**
     * Invalidate cache patterns
     */
    async invalidateCache(...patterns: string[]): Promise<void> {
      await Promise.allSettled(
        patterns.map(pattern => this.cacheManager.invalidate(pattern))
      )
    }

    private recordCacheHit(key: string, responseTime: number): void {
      const stats = this.stats.get(key) || { hits: 0, misses: 0, times: [] }
      stats.hits++
      stats.times.push(responseTime)
      
      if (stats.times.length > 100) {
        stats.times = stats.times.slice(-100)
      }
      
      this.stats.set(key, stats)
    }

    private recordCacheMiss(key: string): void {
      const stats = this.stats.get(key) || { hits: 0, misses: 0, times: [] }
      stats.misses++
      this.stats.set(key, stats)
    }
  }
}

/**
 * Cache configuration builder for common patterns
 */
export class CacheConfigBuilder {
  private config: CacheConfig = { ttl: 300 }

  static create(): CacheConfigBuilder {
    return new CacheConfigBuilder()
  }

  ttl(seconds: number): this {
    this.config.ttl = seconds
    return this
  }

  priority(priority: 'low' | 'normal' | 'high'): this {
    this.config.priority = priority
    return this
  }

  tags(...tags: string[]): this {
    this.config.tags = (this.config.tags || []).concat(tags)
    return this
  }

  varyBy(...fields: string[]): this {
    this.config.varyBy = (this.config.varyBy || []).concat(fields)
    return this
  }

  build(): CacheConfig {
    return { ...this.config }
  }

  // Preset configurations
  static realtime(): CacheConfig {
    return CachePresets.REALTIME
  }

  static userData(): CacheConfig {
    return CachePresets.USER_DATA
  }

  static staticData(): CacheConfig {
    return CachePresets.STATIC_DATA
  }

  static configData(): CacheConfig {
    return CachePresets.CONFIG_DATA
  }

  static sessionData(): CacheConfig {
    return CachePresets.SESSION_DATA
  }
}

/**
 * Cache monitoring and health check utilities
 */
export class CacheMonitor {
  constructor(private cacheManager: CacheManager) {}

  /**
   * Get cache health metrics
   */
  async getHealthMetrics() {
    const stats = await this.cacheManager.getStats()
    const layerStats = Object.entries(stats)

    return {
      status: this.determineHealthStatus(stats),
      layers: layerStats.map(([name, stat]) => ({
        name,
        hitRate: stat.hitRate,
        size: stat.size,
        maxSize: stat.maxSize,
        utilizationPercent: stat.maxSize > 0 ? (stat.size / stat.maxSize) * 100 : 0
      })),
      overall: {
        totalHits: layerStats.reduce((sum, [, stat]) => sum + stat.hits, 0),
        totalMisses: layerStats.reduce((sum, [, stat]) => sum + stat.misses, 0),
        avgHitRate: layerStats.reduce((sum, [, stat]) => sum + stat.hitRate, 0) / layerStats.length
      }
    }
  }

  /**
   * Determine overall cache health status
   */
  private determineHealthStatus(stats: Record<string, any>) {
    const avgHitRate = Object.values(stats).reduce((sum: number, stat: any) => sum + stat.hitRate, 0) / Object.keys(stats).length

    if (avgHitRate >= 0.8) return 'healthy'
    if (avgHitRate >= 0.5) return 'warning'
    return 'critical'
  }

  /**
   * Generate cache performance report
   */
  async generateReport() {
    const metrics = await this.getHealthMetrics()
    
    return {
      timestamp: new Date().toISOString(),
      ...metrics,
      recommendations: this.generateRecommendations(metrics)
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: any) {
    const recommendations = []

    if (metrics.overall.avgHitRate < 0.5) {
      recommendations.push('Consider increasing cache TTL or warming strategies')
    }

    metrics.layers.forEach((layer: any) => {
      if (layer.utilizationPercent > 90) {
        recommendations.push(`${layer.name} layer is near capacity - consider increasing size`)
      }
    })

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal')
    }

    return recommendations
  }
}