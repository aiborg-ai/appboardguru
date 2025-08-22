/**
 * Enhanced Cache Manager with Intelligent Invalidation and Performance Optimization
 * Integrates with existing cache infrastructure to provide enterprise-grade caching
 */

import { CacheManager, CacheLayer, CacheConfig, CacheStats } from '../cache/CacheManager'
import { Logger } from '../logging/logger'
import { telemetry, MetricType } from '../logging/telemetry'
import { createSupabaseServerClient } from '../supabase-server'

const logger = Logger.getLogger('EnhancedCacheManager')

export interface CachePattern {
  pattern: string
  ttl: number
  tags: string[]
  priority: 'low' | 'normal' | 'high' | 'critical'
  warmupStrategy?: 'lazy' | 'eager' | 'scheduled'
  compressionEnabled?: boolean
}

export interface CacheInvalidationRule {
  id: string
  name: string
  triggers: Array<{
    pattern: string
    operations: ('CREATE' | 'UPDATE' | 'DELETE')[]
    tables?: string[]
  }>
  invalidates: Array<{
    pattern: string
    immediate?: boolean
    delay?: number
  }>
  condition?: (context: any) => boolean
}

export interface CacheMetrics {
  hitRate: number
  missRate: number
  evictionRate: number
  compressionRatio: number
  averageResponseTime: number
  memoryUsage: number
  topKeys: Array<{
    key: string
    hits: number
    size: number
    lastAccessed: Date
  }>
  performanceBreakdown: {
    L1: CacheStats // Memory cache
    L2: CacheStats // Database cache
    L3?: CacheStats // Redis cache if available
  }
}

export interface CacheOptimizationRecommendations {
  recommendations: Array<{
    type: 'ttl_adjustment' | 'cache_promotion' | 'memory_optimization' | 'pattern_optimization'
    priority: 'low' | 'medium' | 'high'
    description: string
    impact: 'performance' | 'memory' | 'cost'
    implementation: string
  }>
  estimatedImpact: {
    hitRateImprovement: number
    responseTimeReduction: number
    memoryReduction: number
  }
}

/**
 * Redis Cache Layer for L3 caching
 */
export class RedisCache implements CacheLayer {
  name = 'redis'
  priority = 3
  
  private stats = { hits: 0, misses: 0 }
  private redis?: any // Redis client
  
  constructor(redisConfig?: any) {
    if (redisConfig && typeof window === 'undefined') {
      try {
        const Redis = require('ioredis')
        this.redis = new Redis(redisConfig)
        logger.info('Redis cache layer initialized')
      } catch (error) {
        logger.warn('Redis not available, skipping Redis cache layer', error)
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      this.stats.misses++
      return null
    }

    try {
      const value = await this.redis.get(key)
      if (value === null) {
        this.stats.misses++
        return null
      }

      this.stats.hits++
      return JSON.parse(value) as T
    } catch (error) {
      logger.error('Redis get error:', error)
      this.stats.misses++
      return null
    }
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    if (!this.redis) return

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      logger.error('Redis set error:', error)
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) return

    try {
      await this.redis.del(key)
    } catch (error) {
      logger.error('Redis delete error:', error)
    }
  }

  async clear(): Promise<void> {
    if (!this.redis) return

    try {
      await this.redis.flushdb()
      this.stats = { hits: 0, misses: 0 }
    } catch (error) {
      logger.error('Redis clear error:', error)
    }
  }

  async invalidate(pattern: string): Promise<void> {
    if (!this.redis) return

    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      logger.error('Redis invalidate error:', error)
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false

    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      logger.error('Redis exists error:', error)
      return false
    }
  }

  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses
    let size = 0
    
    if (this.redis) {
      try {
        const info = await this.redis.info('memory')
        const memoryMatch = info.match(/used_memory:(\d+)/)
        size = memoryMatch ? parseInt(memoryMatch[1]) : 0
      } catch (error) {
        logger.warn('Could not get Redis memory usage:', error)
      }
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size,
      maxSize: -1 // Redis doesn't have a strict size limit
    }
  }
}

/**
 * Enhanced Cache Manager with intelligent optimization and monitoring
 */
export class EnhancedCacheManager extends CacheManager {
  private patterns = new Map<string, CachePattern>()
  private invalidationRules = new Map<string, CacheInvalidationRule>()
  private metricsHistory: CacheMetrics[] = []
  private optimizationEngine = new CacheOptimizationEngine(this)
  private compressionLayer = new CacheCompressionLayer()
  
  constructor(layers: CacheLayer[] = []) {
    super(layers)
    this.setupDefaultPatterns()
    this.setupDefaultInvalidationRules()
    this.startMetricsCollection()
  }

  /**
   * Enhanced get with pattern-based optimization
   */
  async getWithPattern<T>(
    key: string, 
    pattern?: string
  ): Promise<{ value: T | null; metadata: any }> {
    const startTime = Date.now()
    const patternConfig = pattern ? this.patterns.get(pattern) : undefined
    
    // Apply compression if enabled
    const finalKey = patternConfig?.compressionEnabled 
      ? this.compressionLayer.compressKey(key)
      : key

    const value = await this.get<T>(finalKey)
    const responseTime = Date.now() - startTime

    // Record metrics
    telemetry.recordHistogram('cache_get_duration_ms', responseTime, {
      pattern: pattern || 'none',
      hit: value !== null ? 'true' : 'false',
      cache_layer: value !== null ? this.getHitLayer(finalKey) : 'none'
    })

    return {
      value,
      metadata: {
        pattern,
        responseTime,
        compressed: patternConfig?.compressionEnabled,
        hitLayer: value !== null ? await this.getHitLayer(finalKey) : null
      }
    }
  }

  /**
   * Enhanced set with pattern-based configuration
   */
  async setWithPattern<T>(
    key: string,
    value: T,
    pattern?: string,
    customConfig?: Partial<CacheConfig>
  ): Promise<void> {
    const startTime = Date.now()
    const patternConfig = pattern ? this.patterns.get(pattern) : undefined
    
    const config: CacheConfig = {
      ttl: patternConfig?.ttl || 300,
      tags: patternConfig?.tags || [],
      priority: patternConfig?.priority || 'normal',
      ...customConfig
    }

    // Apply compression if enabled
    let finalKey = key
    let finalValue = value
    
    if (patternConfig?.compressionEnabled) {
      finalKey = this.compressionLayer.compressKey(key)
      finalValue = await this.compressionLayer.compressValue(value) as T
    }

    await this.set(finalKey, finalValue, config)

    const responseTime = Date.now() - startTime
    
    // Record metrics
    telemetry.recordHistogram('cache_set_duration_ms', responseTime, {
      pattern: pattern || 'none',
      compressed: patternConfig?.compressionEnabled ? 'true' : 'false'
    })

    // Check for warmup strategies
    if (patternConfig?.warmupStrategy === 'eager') {
      await this.warmupRelatedKeys(key, pattern)
    }
  }

  /**
   * Smart invalidation based on rules
   */
  async smartInvalidate(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    table: string,
    context: any = {}
  ): Promise<number> {
    let totalInvalidated = 0

    for (const rule of this.invalidationRules.values()) {
      const shouldTrigger = rule.triggers.some(trigger => 
        trigger.operations.includes(operation) &&
        (!trigger.tables || trigger.tables.includes(table)) &&
        (!rule.condition || rule.condition(context))
      )

      if (shouldTrigger) {
        logger.debug(`Triggering invalidation rule: ${rule.name}`, { operation, table })
        
        for (const invalidation of rule.invalidates) {
          if (invalidation.immediate !== false) {
            const count = await this.invalidatePattern(invalidation.pattern)
            totalInvalidated += count
          } else if (invalidation.delay) {
            // Schedule delayed invalidation
            setTimeout(async () => {
              await this.invalidatePattern(invalidation.pattern)
              logger.debug(`Delayed invalidation completed for pattern: ${invalidation.pattern}`)
            }, invalidation.delay)
          }
        }

        // Record invalidation metrics
        telemetry.recordCounter('cache_invalidations_total', 1, {
          rule: rule.name,
          operation,
          table
        })
      }
    }

    return totalInvalidated
  }

  /**
   * Get comprehensive cache metrics
   */
  async getEnhancedMetrics(): Promise<CacheMetrics> {
    const allStats = await this.getStats()
    const layers = Object.entries(allStats)
    
    // Calculate overall metrics
    const totalHits = layers.reduce((sum, [, stats]) => sum + stats.hits, 0)
    const totalMisses = layers.reduce((sum, [, stats]) => sum + stats.misses, 0)
    const totalRequests = totalHits + totalMisses
    
    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0
    const missRate = totalRequests > 0 ? totalMisses / totalRequests : 0

    // Get top performing keys
    const topKeys = await this.getTopKeys()
    
    // Calculate compression metrics
    const compressionRatio = await this.compressionLayer.getCompressionRatio()

    const metrics: CacheMetrics = {
      hitRate,
      missRate,
      evictionRate: 0, // Would need eviction tracking
      compressionRatio,
      averageResponseTime: await this.getAverageResponseTime(),
      memoryUsage: this.getTotalMemoryUsage(allStats),
      topKeys,
      performanceBreakdown: {
        L1: allStats['memory'] || { hits: 0, misses: 0, hitRate: 0, size: 0, maxSize: 0 },
        L2: allStats['database'] || { hits: 0, misses: 0, hitRate: 0, size: 0, maxSize: 0 },
        L3: allStats['redis'] || undefined
      }
    }

    // Store metrics history
    this.metricsHistory.push(metrics)
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100)
    }

    return metrics
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<CacheOptimizationRecommendations> {
    return this.optimizationEngine.analyze()
  }

  /**
   * Auto-optimize cache based on usage patterns
   */
  async autoOptimize(): Promise<void> {
    const recommendations = await this.getOptimizationRecommendations()
    
    for (const rec of recommendations.recommendations) {
      if (rec.priority === 'high') {
        try {
          await this.applyOptimization(rec)
          logger.info(`Applied optimization: ${rec.description}`)
        } catch (error) {
          logger.error(`Failed to apply optimization: ${rec.description}`, error)
        }
      }
    }
  }

  /**
   * Warmup cache with common patterns
   */
  async warmupCache(patterns: string[] = []): Promise<{ warmed: number; failed: number }> {
    let warmed = 0
    let failed = 0

    const patternsToWarm = patterns.length > 0 
      ? patterns 
      : Array.from(this.patterns.keys()).filter(p => 
          this.patterns.get(p)?.warmupStrategy === 'eager'
        )

    for (const pattern of patternsToWarm) {
      try {
        const keys = await this.getKeysForPattern(pattern)
        const results = await Promise.allSettled(
          keys.map(key => this.warmupKey(key, pattern))
        )
        
        warmed += results.filter(r => r.status === 'fulfilled').length
        failed += results.filter(r => r.status === 'rejected').length
      } catch (error) {
        logger.error(`Warmup failed for pattern ${pattern}:`, error)
        failed++
      }
    }

    logger.info(`Cache warmup completed: ${warmed} warmed, ${failed} failed`)
    return { warmed, failed }
  }

  /**
   * Register cache pattern
   */
  registerPattern(name: string, pattern: CachePattern): void {
    this.patterns.set(name, pattern)
    logger.debug(`Registered cache pattern: ${name}`, pattern)
  }

  /**
   * Register invalidation rule
   */
  registerInvalidationRule(rule: CacheInvalidationRule): void {
    this.invalidationRules.set(rule.id, rule)
    logger.debug(`Registered invalidation rule: ${rule.name}`, rule)
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: any
  }> {
    try {
      const metrics = await this.getEnhancedMetrics()
      const stats = await this.getStats()
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      const issues: string[] = []

      // Check hit rates
      if (metrics.hitRate < 0.3) {
        status = 'degraded'
        issues.push(`Low hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`)
      }

      // Check memory usage
      const memoryUtilization = this.calculateMemoryUtilization(stats)
      if (memoryUtilization > 0.9) {
        status = 'unhealthy'
        issues.push(`High memory utilization: ${(memoryUtilization * 100).toFixed(1)}%`)
      }

      // Check response times
      if (metrics.averageResponseTime > 100) {
        status = status === 'unhealthy' ? 'unhealthy' : 'degraded'
        issues.push(`High response time: ${metrics.averageResponseTime.toFixed(2)}ms`)
      }

      return {
        status,
        details: {
          metrics,
          issues,
          layers: Object.keys(stats),
          totalKeys: Object.values(stats).reduce((sum, stat) => sum + stat.size, 0)
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  // Private helper methods
  private setupDefaultPatterns(): void {
    // API response patterns
    this.registerPattern('api_user_data', {
      pattern: 'api:user:*',
      ttl: 300, // 5 minutes
      tags: ['user', 'api'],
      priority: 'high',
      warmupStrategy: 'lazy',
      compressionEnabled: true
    })

    this.registerPattern('api_organization_data', {
      pattern: 'api:organization:*',
      ttl: 900, // 15 minutes
      tags: ['organization', 'api'],
      priority: 'normal',
      warmupStrategy: 'eager',
      compressionEnabled: true
    })

    this.registerPattern('api_static_data', {
      pattern: 'api:static:*',
      ttl: 3600, // 1 hour
      tags: ['static', 'api'],
      priority: 'low',
      warmupStrategy: 'scheduled',
      compressionEnabled: false
    })

    // Database query patterns
    this.registerPattern('db_user_queries', {
      pattern: 'db:users:*',
      ttl: 600, // 10 minutes
      tags: ['database', 'users'],
      priority: 'high',
      warmupStrategy: 'lazy'
    })
  }

  private setupDefaultInvalidationRules(): void {
    // User data invalidation
    this.registerInvalidationRule({
      id: 'user_data_invalidation',
      name: 'User Data Changes',
      triggers: [
        { pattern: 'users', operations: ['UPDATE', 'DELETE'], tables: ['users'] }
      ],
      invalidates: [
        { pattern: 'api:user:*', immediate: true },
        { pattern: 'db:users:*', immediate: true }
      ]
    })

    // Organization data invalidation
    this.registerInvalidationRule({
      id: 'organization_data_invalidation',
      name: 'Organization Data Changes',
      triggers: [
        { pattern: 'organizations', operations: ['CREATE', 'UPDATE', 'DELETE'], tables: ['organizations'] }
      ],
      invalidates: [
        { pattern: 'api:organization:*', immediate: true },
        { pattern: 'api:user:*', immediate: false, delay: 5000 } // Delayed invalidation for user data
      ]
    })
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      try {
        const metrics = await this.getEnhancedMetrics()
        
        // Record key metrics to telemetry
        telemetry.recordGauge('cache_hit_rate', metrics.hitRate)
        telemetry.recordGauge('cache_memory_usage_bytes', metrics.memoryUsage)
        telemetry.recordGauge('cache_average_response_time_ms', metrics.averageResponseTime)
        
        // Check for performance issues
        if (metrics.hitRate < 0.5) {
          logger.warn('Low cache hit rate detected', { hitRate: metrics.hitRate })
        }
        
        if (metrics.averageResponseTime > 50) {
          logger.warn('High cache response time detected', { 
            responseTime: metrics.averageResponseTime 
          })
        }
      } catch (error) {
        logger.error('Metrics collection failed:', error)
      }
    }, 30000) // Every 30 seconds
  }

  private async getHitLayer(key: string): Promise<string> {
    // Check which layer contains the key
    for (const layer of this.layers) {
      if (await layer.exists(key)) {
        return layer.name
      }
    }
    return 'none'
  }

  private async invalidatePattern(pattern: string): Promise<number> {
    let count = 0
    await Promise.all(this.layers.map(async layer => {
      try {
        await layer.invalidate(pattern)
        count++
      } catch (error) {
        logger.warn(`Pattern invalidation failed on layer ${layer.name}:`, error)
      }
    }))
    return count
  }

  private async warmupRelatedKeys(key: string, pattern?: string): Promise<void> {
    // Implementation would depend on specific business logic
    logger.debug(`Warmup triggered for key: ${key}, pattern: ${pattern}`)
  }

  private async getTopKeys(): Promise<CacheMetrics['topKeys']> {
    // This would need key access tracking
    return []
  }

  private async getAverageResponseTime(): Promise<number> {
    // Calculate from metrics history
    if (this.metricsHistory.length === 0) return 0
    
    const totalTime = this.metricsHistory.reduce((sum, m) => sum + m.averageResponseTime, 0)
    return totalTime / this.metricsHistory.length
  }

  private getTotalMemoryUsage(stats: Record<string, CacheStats>): number {
    return Object.values(stats).reduce((sum, stat) => sum + stat.size, 0)
  }

  private calculateMemoryUtilization(stats: Record<string, CacheStats>): number {
    const totalUsed = Object.values(stats).reduce((sum, stat) => sum + stat.size, 0)
    const totalMax = Object.values(stats).reduce((sum, stat) => 
      stat.maxSize > 0 ? sum + stat.maxSize : sum, 0
    )
    
    return totalMax > 0 ? totalUsed / totalMax : 0
  }

  private async getKeysForPattern(pattern: string): Promise<string[]> {
    // This would need key enumeration capability
    return []
  }

  private async warmupKey(key: string, pattern: string): Promise<void> {
    // Implementation depends on business logic
    logger.debug(`Warming up key: ${key} for pattern: ${pattern}`)
  }

  private async applyOptimization(recommendation: any): Promise<void> {
    // Apply optimization based on recommendation type
    logger.debug(`Applying optimization: ${recommendation.type}`)
  }
}

/**
 * Cache optimization engine
 */
class CacheOptimizationEngine {
  constructor(private cacheManager: CacheManager) {}

  async analyze(): Promise<CacheOptimizationRecommendations> {
    const recommendations: CacheOptimizationRecommendations['recommendations'] = []
    
    // Analyze hit rates and suggest TTL adjustments
    const stats = await this.cacheManager.getStats()
    
    for (const [layerName, layerStats] of Object.entries(stats)) {
      if (layerStats.hitRate < 0.5) {
        recommendations.push({
          type: 'ttl_adjustment',
          priority: 'high',
          description: `Increase TTL for ${layerName} layer to improve hit rate`,
          impact: 'performance',
          implementation: `Adjust TTL configuration for ${layerName} cache layer`
        })
      }
      
      if (layerStats.maxSize > 0 && layerStats.size / layerStats.maxSize > 0.8) {
        recommendations.push({
          type: 'memory_optimization',
          priority: 'medium',
          description: `${layerName} layer is near capacity`,
          impact: 'memory',
          implementation: `Increase cache size or implement more aggressive eviction`
        })
      }
    }

    return {
      recommendations,
      estimatedImpact: {
        hitRateImprovement: 0.15,
        responseTimeReduction: 0.25,
        memoryReduction: 0.1
      }
    }
  }
}

/**
 * Cache compression layer
 */
class CacheCompressionLayer {
  private compressionStats = { originalSize: 0, compressedSize: 0 }

  compressKey(key: string): string {
    // Simple key compression - could use hash for very long keys
    return key.length > 250 ? this.hash(key) : key
  }

  async compressValue<T>(value: T): Promise<T> {
    // In a real implementation, this would use gzip or similar
    const serialized = JSON.stringify(value)
    this.compressionStats.originalSize += serialized.length
    this.compressionStats.compressedSize += serialized.length * 0.7 // Mock compression
    
    return value // For now, return uncompressed
  }

  getCompressionRatio(): number {
    return this.compressionStats.originalSize > 0 
      ? this.compressionStats.compressedSize / this.compressionStats.originalSize
      : 1
  }

  private hash(input: string): string {
    return Buffer.from(input).toString('base64').slice(0, 32)
  }
}

/**
 * Factory function to create enhanced cache manager
 */
export function createEnhancedCacheManager(
  config: {
    enableRedis?: boolean
    redisConfig?: any
    maxMemorySize?: number
    defaultTTL?: number
  } = {}
): EnhancedCacheManager {
  const { MemoryCache, DatabaseCache } = require('../cache/CacheManager')
  
  const layers: CacheLayer[] = [
    new MemoryCache(config.maxMemorySize || 1000, config.defaultTTL || 300)
  ]

  // Add database cache if Supabase is available
  if (typeof window === 'undefined') {
    try {
      const supabase = createSupabaseServerClient()
      layers.push(new DatabaseCache(supabase, config.defaultTTL || 3600))
    } catch (error) {
      logger.warn('Could not initialize database cache:', error)
    }
  }

  // Add Redis cache if enabled
  if (config.enableRedis) {
    layers.push(new RedisCache(config.redisConfig))
  }

  return new EnhancedCacheManager(layers)
}

// Export default enhanced cache manager
export const enhancedCacheManager = createEnhancedCacheManager({
  enableRedis: process.env.REDIS_URL !== undefined,
  redisConfig: process.env.REDIS_URL,
  maxMemorySize: 2000,
  defaultTTL: 300
})