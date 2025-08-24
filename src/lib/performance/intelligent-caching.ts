/**
 * Intelligent Caching System
 * Multi-layer caching with smart invalidation, warming, and optimization
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { Result, success, failure } from '../patterns/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { createHash } from 'crypto'
import { nanoid } from 'nanoid'

// Core interfaces
export interface CacheEntry<T = any> {
  key: string
  value: T
  metadata: CacheMetadata
  createdAt: number
  accessedAt: number
  expiresAt: number
  tags: string[]
  size: number
  hitCount: number
  version: string
}

export interface CacheMetadata {
  ttl: number
  priority: CachePriority
  revalidateAfter?: number
  compressed: boolean
  encrypted: boolean
  source: string
  dependencies: string[]
  computationTime: number
}

export type CachePriority = 'low' | 'medium' | 'high' | 'critical'

export interface CacheLayer {
  name: string
  type: CacheLayerType
  capacity: number
  ttl: number
  evictionPolicy: EvictionPolicy
  config: Record<string, any>
}

export type CacheLayerType = 'memory' | 'redis' | 'memcached' | 'database' | 'cdn' | 'browser'
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl' | 'adaptive'

export interface CachePattern {
  name: string
  pattern: string
  ttl: number
  tags: string[]
  revalidation: RevalidationStrategy
  warmingStrategy?: WarmingStrategy
}

export interface RevalidationStrategy {
  type: 'time_based' | 'dependency_based' | 'event_based' | 'stale_while_revalidate'
  config: Record<string, any>
}

export interface WarmingStrategy {
  type: 'scheduled' | 'predictive' | 'on_demand'
  config: Record<string, any>
}

export interface CacheStats {
  hitRate: number
  missRate: number
  totalRequests: number
  totalHits: number
  totalMisses: number
  averageResponseTime: number
  memoryUsage: number
  itemCount: number
  evictions: number
  layerStats: Record<string, LayerStats>
}

export interface LayerStats {
  hitRate: number
  itemCount: number
  memoryUsage: number
  averageResponseTime: number
}

export interface CacheWarmer {
  name: string
  execute(): Promise<Result<void, string>>
  schedule: string // cron expression
  priority: number
  enabled: boolean
}

/**
 * Intelligent Caching Manager
 */
export class IntelligentCachingManager extends EventEmitter {
  private layers: Map<string, CacheLayer> = new Map()
  private entries: Map<string, Map<string, CacheEntry>> = new Map() // layerName -> entries
  private patterns: Map<string, CachePattern> = new Map()
  private warmers: Map<string, CacheWarmer> = new Map()
  private dependencyGraph: Map<string, Set<string>> = new Map()
  private stats: CacheStats
  private metrics: MetricsCollector
  private tracer: DistributedTracer

  constructor(
    private options: {
      defaultTtl: number
      maxMemoryUsage: number
      compressionThreshold: number
      encryptionEnabled: boolean
      enablePredictiveWarming: boolean
      enableAdaptiveEviction: boolean
      metricsInterval: number
    }
  ) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
    
    this.stats = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      itemCount: 0,
      evictions: 0,
      layerStats: {}
    }

    this.setupDefaultLayers()
    this.setupCleanupTasks()
    this.setupMetricsCollection()
    this.setupPredictiveWarming()
  }

  /**
   * Get cached value with intelligent layer selection
   */
  async get<T>(key: string, options?: {
    layerPreference?: string[]
    includeStale?: boolean
    revalidate?: boolean
  }): Promise<Result<T | null, string>> {
    const span = this.tracer.startSpan('cache_get')
    const startTime = Date.now()

    try {
      span.setAttributes({ 'cache.key': key })
      
      const layers = options?.layerPreference || Array.from(this.layers.keys())
      
      for (const layerName of layers) {
        const layerEntries = this.entries.get(layerName)
        const entry = layerEntries?.get(key)
        
        if (entry) {
          const now = Date.now()
          
          // Check if entry is expired
          if (now > entry.expiresAt && !options?.includeStale) {
            await this.invalidate(key, layerName)
            continue
          }
          
          // Update access info
          entry.accessedAt = now
          entry.hitCount++
          
          // Check if needs revalidation
          if (entry.metadata.revalidateAfter && now > entry.metadata.revalidateAfter) {
            if (options?.revalidate) {
              this.revalidateInBackground(key, entry)
            }
          }

          this.recordHit(layerName, Date.now() - startTime)
          
          span.setAttributes({
            'cache.hit': true,
            'cache.layer': layerName,
            'cache.age': now - entry.createdAt
          })

          return success(this.deserializeValue(entry.value))
        }
      }

      this.recordMiss(Date.now() - startTime)
      span.setAttributes({ 'cache.hit': false })
      
      return success(null)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Cache get failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Set cached value with intelligent placement
   */
  async set<T>(
    key: string, 
    value: T, 
    options?: {
      ttl?: number
      tags?: string[]
      priority?: CachePriority
      layers?: string[]
      dependencies?: string[]
      compress?: boolean
      encrypt?: boolean
    }
  ): Promise<Result<void, string>> {
    const span = this.tracer.startSpan('cache_set')

    try {
      span.setAttributes({ 'cache.key': key })

      const serializedValue = this.serializeValue(value)
      const size = this.calculateSize(serializedValue)
      const ttl = options?.ttl || this.options.defaultTtl
      const now = Date.now()

      const entry: CacheEntry<T> = {
        key,
        value: serializedValue,
        metadata: {
          ttl,
          priority: options?.priority || 'medium',
          revalidateAfter: options?.ttl ? now + (ttl * 0.8) : undefined,
          compressed: options?.compress || size > this.options.compressionThreshold,
          encrypted: options?.encrypt || this.options.encryptionEnabled,
          source: 'user',
          dependencies: options?.dependencies || [],
          computationTime: 0
        },
        createdAt: now,
        accessedAt: now,
        expiresAt: now + ttl,
        tags: options?.tags || [],
        size,
        hitCount: 0,
        version: nanoid()
      }

      // Apply compression if needed
      if (entry.metadata.compressed) {
        entry.value = await this.compressValue(entry.value)
      }

      // Apply encryption if needed
      if (entry.metadata.encrypted) {
        entry.value = await this.encryptValue(entry.value)
      }

      const targetLayers = options?.layers || this.selectOptimalLayers(entry)
      
      for (const layerName of targetLayers) {
        if (!this.entries.has(layerName)) {
          this.entries.set(layerName, new Map())
        }
        
        const layerEntries = this.entries.get(layerName)!
        
        // Check capacity and evict if needed
        await this.enforceCapacity(layerName)
        
        layerEntries.set(key, entry)
        
        // Update dependency tracking
        this.updateDependencies(key, entry.metadata.dependencies)
      }

      span.setAttributes({
        'cache.layers': targetLayers.length,
        'cache.size': size,
        'cache.compressed': entry.metadata.compressed
      })

      this.emit('cacheSet', { key, layers: targetLayers, size })
      return success(undefined)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Cache set failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(key: string, layerName?: string): Promise<Result<number, string>> {
    try {
      let invalidatedCount = 0
      
      if (layerName) {
        const layerEntries = this.entries.get(layerName)
        if (layerEntries?.has(key)) {
          layerEntries.delete(key)
          invalidatedCount++
        }
      } else {
        for (const [layer, entries] of this.entries.entries()) {
          if (entries.has(key)) {
            entries.delete(key)
            invalidatedCount++
          }
        }
      }

      // Invalidate dependent entries
      const dependents = this.findDependentKeys(key)
      for (const dependentKey of dependents) {
        const result = await this.invalidate(dependentKey)
        if (result.success) {
          invalidatedCount += result.data
        }
      }

      this.emit('cacheInvalidated', { key, layerName, count: invalidatedCount })
      return success(invalidatedCount)

    } catch (error) {
      return failure(`Cache invalidation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<Result<number, string>> {
    try {
      let invalidatedCount = 0
      
      for (const [layerName, entries] of this.entries.entries()) {
        const keysToDelete: string[] = []
        
        for (const [key, entry] of entries.entries()) {
          if (entry.tags.some(tag => tags.includes(tag))) {
            keysToDelete.push(key)
          }
        }
        
        for (const key of keysToDelete) {
          entries.delete(key)
          invalidatedCount++
        }
      }

      this.emit('cacheInvalidatedByTags', { tags, count: invalidatedCount })
      return success(invalidatedCount)

    } catch (error) {
      return failure(`Cache tag invalidation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Warm cache with predictive loading
   */
  async warmCache(pattern: string, data?: Record<string, any>): Promise<Result<number, string>> {
    const span = this.tracer.startSpan('cache_warm')

    try {
      span.setAttributes({ 'cache.pattern': pattern })
      
      const cachePattern = this.patterns.get(pattern)
      if (!cachePattern) {
        return failure(`Cache pattern not found: ${pattern}`)
      }

      let warmedCount = 0
      
      if (cachePattern.warmingStrategy) {
        switch (cachePattern.warmingStrategy.type) {
          case 'scheduled':
            warmedCount = await this.executeScheduledWarming(cachePattern)
            break
          case 'predictive':
            warmedCount = await this.executePredictiveWarming(cachePattern, data)
            break
          case 'on_demand':
            warmedCount = await this.executeOnDemandWarming(cachePattern)
            break
        }
      }

      span.setAttributes({ 'cache.warmed_count': warmedCount })
      return success(warmedCount)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Cache warming failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Get or set with function execution
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: {
      ttl?: number
      tags?: string[]
      priority?: CachePriority
      staleWhileRevalidate?: boolean
    }
  ): Promise<Result<T, string>> {
    const span = this.tracer.startSpan('cache_get_or_set')

    try {
      // Try to get from cache first
      const cachedResult = await this.get<T>(key, {
        includeStale: options?.staleWhileRevalidate
      })
      
      if (cachedResult.success && cachedResult.data !== null) {
        return cachedResult
      }

      // Execute function and cache result
      const startTime = Date.now()
      const value = await fetchFn()
      const computationTime = Date.now() - startTime

      await this.set(key, value, {
        ...options,
        dependencies: options?.tags
      })

      this.metrics.recordCacheComputation(key, computationTime)
      
      span.setAttributes({
        'cache.computed': true,
        'cache.computation_time': computationTime
      })

      return success(value)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Get or set failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Add cache pattern
   */
  addCachePattern(pattern: CachePattern): void {
    this.patterns.set(pattern.name, pattern)
  }

  /**
   * Add cache warmer
   */
  addCacheWarmer(warmer: CacheWarmer): void {
    this.warmers.set(warmer.name, warmer)
    
    if (warmer.enabled) {
      this.scheduleCacheWarmer(warmer)
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Get cache health
   */
  getCacheHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    if (this.stats.hitRate < 0.5) {
      issues.push('Low cache hit rate')
      recommendations.push('Consider adjusting TTL values or warming strategies')
    }

    if (this.stats.memoryUsage > 0.8) {
      issues.push('High memory usage')
      recommendations.push('Consider increasing eviction frequency or reducing TTL')
    }

    if (this.stats.averageResponseTime > 100) {
      issues.push('Slow cache response times')
      recommendations.push('Consider optimizing cache layer selection')
    }

    const status = issues.length === 0 ? 'healthy' : 
                  issues.length <= 2 ? 'degraded' : 'unhealthy'

    return { status, issues, recommendations }
  }

  /**
   * Private helper methods
   */
  private selectOptimalLayers(entry: CacheEntry): string[] {
    const layers = Array.from(this.layers.keys())
    
    // Select layers based on priority and size
    if (entry.metadata.priority === 'critical') {
      return layers.filter(name => ['memory', 'redis'].includes(this.layers.get(name)!.type))
    } else if (entry.size < 1024) {
      return layers.filter(name => this.layers.get(name)!.type === 'memory')
    } else {
      return layers.filter(name => ['redis', 'database'].includes(this.layers.get(name)!.type))
    }
  }

  private async enforceCapacity(layerName: string): Promise<void> {
    const layer = this.layers.get(layerName)
    const entries = this.entries.get(layerName)
    
    if (!layer || !entries) return

    if (entries.size >= layer.capacity) {
      await this.evictEntries(layerName, entries.size - layer.capacity + 1)
    }
  }

  private async evictEntries(layerName: string, count: number): Promise<void> {
    const layer = this.layers.get(layerName)!
    const entries = this.entries.get(layerName)!
    
    const entriesArray = Array.from(entries.values())
    let toEvict: CacheEntry[] = []

    switch (layer.evictionPolicy) {
      case 'lru':
        toEvict = entriesArray
          .sort((a, b) => a.accessedAt - b.accessedAt)
          .slice(0, count)
        break
      
      case 'lfu':
        toEvict = entriesArray
          .sort((a, b) => a.hitCount - b.hitCount)
          .slice(0, count)
        break
      
      case 'fifo':
        toEvict = entriesArray
          .sort((a, b) => a.createdAt - b.createdAt)
          .slice(0, count)
        break
      
      case 'ttl':
        toEvict = entriesArray
          .sort((a, b) => a.expiresAt - b.expiresAt)
          .slice(0, count)
        break
      
      case 'adaptive':
        toEvict = await this.adaptiveEviction(entriesArray, count)
        break
    }

    for (const entry of toEvict) {
      entries.delete(entry.key)
      this.stats.evictions++
    }

    this.emit('cacheEviction', { layerName, count: toEvict.length })
  }

  private async adaptiveEviction(entries: CacheEntry[], count: number): Promise<CacheEntry[]> {
    // Adaptive eviction considers multiple factors
    return entries
      .map(entry => ({
        entry,
        score: this.calculateEvictionScore(entry)
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, count)
      .map(item => item.entry)
  }

  private calculateEvictionScore(entry: CacheEntry): number {
    const now = Date.now()
    const age = now - entry.createdAt
    const timeSinceAccess = now - entry.accessedAt
    const timeToExpiry = entry.expiresAt - now
    
    // Lower score = higher eviction priority
    let score = 0
    
    // Favor frequently accessed items
    score += entry.hitCount * 10
    
    // Penalize old items
    score -= age / 1000
    
    // Penalize items not accessed recently  
    score -= timeSinceAccess / 1000
    
    // Consider priority
    const priorityBonus = {
      'low': 0,
      'medium': 50,
      'high': 100,
      'critical': 200
    }[entry.metadata.priority]
    
    score += priorityBonus
    
    return score
  }

  private updateDependencies(key: string, dependencies: string[]): void {
    for (const dependency of dependencies) {
      if (!this.dependencyGraph.has(dependency)) {
        this.dependencyGraph.set(dependency, new Set())
      }
      this.dependencyGraph.get(dependency)!.add(key)
    }
  }

  private findDependentKeys(key: string): string[] {
    const dependents = this.dependencyGraph.get(key)
    return dependents ? Array.from(dependents) : []
  }

  private async revalidateInBackground(key: string, entry: CacheEntry): Promise<void> {
    // Background revalidation logic would go here
    this.emit('cacheRevalidation', { key, entry })
  }

  private recordHit(layerName: string, responseTime: number): void {
    this.stats.totalRequests++
    this.stats.totalHits++
    this.stats.hitRate = this.stats.totalHits / this.stats.totalRequests
    this.stats.averageResponseTime = (this.stats.averageResponseTime + responseTime) / 2

    if (!this.stats.layerStats[layerName]) {
      this.stats.layerStats[layerName] = {
        hitRate: 0,
        itemCount: 0,
        memoryUsage: 0,
        averageResponseTime: 0
      }
    }
  }

  private recordMiss(responseTime: number): void {
    this.stats.totalRequests++
    this.stats.totalMisses++
    this.stats.missRate = this.stats.totalMisses / this.stats.totalRequests
    this.stats.averageResponseTime = (this.stats.averageResponseTime + responseTime) / 2
  }

  private serializeValue<T>(value: T): any {
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return value
  }

  private deserializeValue<T>(value: any): T {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return value as T
      }
    }
    return value as T
  }

  private calculateSize(value: any): number {
    return JSON.stringify(value).length * 2 // Approximate byte size
  }

  private async compressValue(value: any): Promise<any> {
    // Compression logic would go here (e.g., using gzip)
    return value
  }

  private async encryptValue(value: any): Promise<any> {
    // Encryption logic would go here
    return value
  }

  private async executeScheduledWarming(pattern: CachePattern): Promise<number> {
    // Scheduled warming implementation
    return 0
  }

  private async executePredictiveWarming(pattern: CachePattern, data?: Record<string, any>): Promise<number> {
    // Predictive warming implementation
    return 0
  }

  private async executeOnDemandWarming(pattern: CachePattern): Promise<number> {
    // On-demand warming implementation
    return 0
  }

  private scheduleCacheWarmer(warmer: CacheWarmer): void {
    // Cron-like scheduling implementation
  }

  private setupDefaultLayers(): void {
    // Memory layer
    this.layers.set('memory', {
      name: 'memory',
      type: 'memory',
      capacity: 10000,
      ttl: 300000, // 5 minutes
      evictionPolicy: 'lru',
      config: {}
    })

    // Redis layer (if available)
    if (process.env.REDIS_URL) {
      this.layers.set('redis', {
        name: 'redis',
        type: 'redis',
        capacity: 100000,
        ttl: 3600000, // 1 hour
        evictionPolicy: 'lru',
        config: { url: process.env.REDIS_URL }
      })
    }

    // Database layer
    this.layers.set('database', {
      name: 'database',
      type: 'database',
      capacity: 1000000,
      ttl: 86400000, // 24 hours
      evictionPolicy: 'ttl',
      config: {}
    })

    // Initialize entry maps
    for (const layerName of this.layers.keys()) {
      this.entries.set(layerName, new Map())
    }
  }

  private setupCleanupTasks(): void {
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries()
    }, 5 * 60 * 1000)

    // Cleanup dependency graph every hour
    setInterval(() => {
      this.cleanupDependencyGraph()
    }, 60 * 60 * 1000)
  }

  private setupMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics()
    }, this.options.metricsInterval)
  }

  private setupPredictiveWarming(): void {
    if (this.options.enablePredictiveWarming) {
      // Setup ML-based predictive warming
      setInterval(() => {
        this.runPredictiveWarming()
      }, 10 * 60 * 1000) // Every 10 minutes
    }
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now()
    let cleanedCount = 0

    for (const [layerName, entries] of this.entries.entries()) {
      const keysToDelete: string[] = []

      for (const [key, entry] of entries.entries()) {
        if (now > entry.expiresAt) {
          keysToDelete.push(key)
        }
      }

      for (const key of keysToDelete) {
        entries.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      this.emit('cacheCleanup', { cleanedCount })
    }
  }

  private cleanupDependencyGraph(): void {
    // Remove orphaned dependencies
    for (const [key, dependents] of this.dependencyGraph.entries()) {
      const validDependents = Array.from(dependents).filter(dep => 
        Array.from(this.entries.values()).some(entries => entries.has(dep))
      )

      if (validDependents.length === 0) {
        this.dependencyGraph.delete(key)
      } else {
        this.dependencyGraph.set(key, new Set(validDependents))
      }
    }
  }

  private collectMetrics(): void {
    let totalItems = 0
    let totalMemory = 0

    for (const [layerName, entries] of this.entries.entries()) {
      totalItems += entries.size
      
      let layerMemory = 0
      for (const entry of entries.values()) {
        layerMemory += entry.size
      }
      totalMemory += layerMemory

      this.stats.layerStats[layerName] = {
        ...this.stats.layerStats[layerName],
        itemCount: entries.size,
        memoryUsage: layerMemory
      }
    }

    this.stats.itemCount = totalItems
    this.stats.memoryUsage = totalMemory
  }

  private async runPredictiveWarming(): Promise<void> {
    // ML-based predictive warming implementation
    // This would analyze access patterns and pre-warm likely-to-be-accessed items
  }
}