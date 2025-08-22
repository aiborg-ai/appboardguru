/**
 * Cache Manager for API Gateway
 * Intelligent caching with invalidation strategies and compression
 */

import Redis from 'ioredis'
import { NextResponse } from 'next/server'
import { gzipSync, gunzipSync } from 'zlib'
import { APIGatewayContext } from './index'

export interface CacheConfig {
  defaultTTL: number
  maxSize: number
  enableCompression: boolean
  compressionThreshold?: number
}

export interface CacheEntry {
  body: any
  headers: Record<string, string>
  status: number
  timestamp: number
  compressed: boolean
  etag: string
  size: number
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
  totalRequests: number
  evictions: number
  compressionRatio: number
}

export interface InvalidationPattern {
  pattern: string
  method?: string
  tags?: string[]
  condition?: (key: string, entry: CacheEntry) => boolean
}

export class CacheManager {
  private redis: Redis
  private config: CacheConfig
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    totalRequests: 0,
    evictions: 0,
    compressionRatio: 0
  }

  private compressionThreshold: number
  private invalidationPatterns: Map<string, InvalidationPattern> = new Map()

  constructor(config: CacheConfig, redisUrl?: string) {
    this.config = config
    this.compressionThreshold = config.compressionThreshold || 1024 // 1KB
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379')
    
    this.setupInvalidationPatterns()
    this.startStatsCollection()
  }

  /**
   * Get cached response
   */
  async get(url: string, context: APIGatewayContext): Promise<CacheEntry | null> {
    const key = this.generateCacheKey(url, context)
    
    try {
      const cached = await this.redis.get(key)
      if (!cached) {
        this.stats.misses++
        this.stats.totalRequests++
        return null
      }

      const entry: CacheEntry = JSON.parse(cached)
      
      // Check if entry is expired (additional check beyond Redis TTL)
      if (this.isExpired(entry)) {
        await this.redis.del(key)
        this.stats.misses++
        this.stats.totalRequests++
        return null
      }

      // Decompress if necessary
      if (entry.compressed && entry.body) {
        try {
          const compressedBuffer = Buffer.from(entry.body, 'base64')
          const decompressed = gunzipSync(compressedBuffer)
          entry.body = JSON.parse(decompressed.toString())
        } catch (error) {
          console.error('Cache decompression error:', error)
          await this.redis.del(key)
          this.stats.misses++
          this.stats.totalRequests++
          return null
        }
      }

      this.stats.hits++
      this.stats.totalRequests++
      this.updateHitRate()

      // Update last access time for LRU
      await this.redis.zadd('cache:access', Date.now(), key)

      return entry
    } catch (error) {
      console.error('Cache get error:', error)
      this.stats.misses++
      this.stats.totalRequests++
      return null
    }
  }

  /**
   * Store response in cache
   */
  async set(
    url: string, 
    response: NextResponse, 
    ttl: number, 
    context: APIGatewayContext,
    tags: string[] = []
  ): Promise<void> {
    const key = this.generateCacheKey(url, context)
    
    try {
      // Clone response to read body without consuming original
      const responseClone = response.clone()
      const bodyText = await responseClone.text()
      let body: any

      try {
        body = JSON.parse(bodyText)
      } catch {
        body = bodyText
      }

      // Create cache entry
      let entry: CacheEntry = {
        body,
        headers: this.serializeHeaders(response.headers),
        status: response.status,
        timestamp: Date.now(),
        compressed: false,
        etag: this.generateETag(body),
        size: bodyText.length
      }

      // Compress large responses
      if (this.config.enableCompression && bodyText.length > this.compressionThreshold) {
        try {
          const compressed = gzipSync(bodyText)
          entry.body = compressed.toString('base64')
          entry.compressed = true
          entry.size = compressed.length
          
          this.updateCompressionRatio(bodyText.length, compressed.length)
        } catch (error) {
          console.error('Cache compression error:', error)
          // Continue without compression
        }
      }

      // Check cache size limit
      await this.enforceMaxSize()

      // Store in Redis with TTL
      await this.redis.setex(key, ttl, JSON.stringify(entry))

      // Update access tracking for LRU
      await this.redis.zadd('cache:access', Date.now(), key)

      // Store tags for invalidation
      if (tags.length > 0) {
        const tagKey = `cache:tags:${key}`
        await this.redis.setex(tagKey, ttl, JSON.stringify(tags))
        
        // Add reverse mapping for fast tag-based invalidation
        for (const tag of tags) {
          await this.redis.sadd(`cache:tag:${tag}`, key)
          await this.redis.expire(`cache:tag:${tag}`, ttl + 60) // Slightly longer TTL
        }
      }

      // Store cache metadata
      await this.redis.hset('cache:metadata', key, JSON.stringify({
        size: entry.size,
        compressed: entry.compressed,
        timestamp: entry.timestamp,
        ttl,
        url,
        tags
      }))

      this.stats.size++
      
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length === 0) return 0

      // Remove from cache
      await this.redis.del(...keys)

      // Clean up metadata
      await this.redis.hdel('cache:metadata', ...keys)

      // Clean up access tracking
      await this.redis.zrem('cache:access', ...keys)

      this.stats.size -= keys.length
      this.stats.evictions += keys.length

      return keys.length
    } catch (error) {
      console.error('Cache invalidation error:', error)
      return 0
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0

    for (const tag of tags) {
      try {
        const keys = await this.redis.smembers(`cache:tag:${tag}`)
        if (keys.length > 0) {
          await this.redis.del(...keys)
          await this.redis.hdel('cache:metadata', ...keys)
          await this.redis.zrem('cache:access', ...keys)
          await this.redis.del(`cache:tag:${tag}`)
          
          totalInvalidated += keys.length
          this.stats.size -= keys.length
          this.stats.evictions += keys.length
        }
      } catch (error) {
        console.error(`Cache tag invalidation error for tag ${tag}:`, error)
      }
    }

    return totalInvalidated
  }

  /**
   * Smart invalidation based on URL patterns and HTTP methods
   */
  async smartInvalidate(url: string, method: string, context?: APIGatewayContext): Promise<number> {
    let totalInvalidated = 0

    // Apply registered invalidation patterns
    for (const [name, pattern] of this.invalidationPatterns) {
      if (this.matchesInvalidationPattern(url, method, pattern)) {
        const invalidated = await this.invalidate(pattern.pattern)
        totalInvalidated += invalidated
        console.log(`Smart invalidation ${name}: ${invalidated} entries`)
      }
    }

    // Auto-invalidation rules based on RESTful conventions
    const autoPatterns = this.generateAutoInvalidationPatterns(url, method)
    for (const pattern of autoPatterns) {
      const invalidated = await this.invalidate(pattern)
      totalInvalidated += invalidated
    }

    return totalInvalidated
  }

  /**
   * Conditional cache refresh
   */
  async refreshIfStale(url: string, context: APIGatewayContext, maxAge: number): Promise<boolean> {
    const key = this.generateCacheKey(url, context)
    
    try {
      const metadata = await this.redis.hget('cache:metadata', key)
      if (!metadata) return false

      const { timestamp } = JSON.parse(metadata)
      const age = Date.now() - timestamp

      if (age > maxAge) {
        await this.redis.del(key)
        await this.redis.hdel('cache:metadata', key)
        await this.redis.zrem('cache:access', key)
        this.stats.size--
        return true
      }

      return false
    } catch (error) {
      console.error('Cache refresh check error:', error)
      return false
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Get detailed cache information
   */
  async getCacheInfo(): Promise<{
    totalKeys: number
    memoryUsage: string
    keysByPattern: Record<string, number>
    topAccessedKeys: Array<{ key: string; score: number }>
    compressionStats: { ratio: number; compressed: number; uncompressed: number }
  }> {
    const totalKeys = await this.redis.dbsize()
    const info = await this.redis.info('memory')
    const memoryUsage = info.match(/used_memory_human:(.+)/)?.[1] || 'unknown'

    // Count keys by pattern
    const patterns = ['cache:*', 'cache:tags:*', 'cache:tag:*', 'cache:access', 'cache:metadata']
    const keysByPattern: Record<string, number> = {}
    
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern)
      keysByPattern[pattern] = keys.length
    }

    // Top accessed keys
    const topAccessedKeys = await this.redis.zrevrange('cache:access', 0, 9, 'WITHSCORES')
    const topKeys = []
    for (let i = 0; i < topAccessedKeys.length; i += 2) {
      topKeys.push({
        key: topAccessedKeys[i],
        score: parseFloat(topAccessedKeys[i + 1])
      })
    }

    // Compression stats
    const allMetadata = await this.redis.hgetall('cache:metadata')
    let compressed = 0
    let uncompressed = 0
    let totalOriginalSize = 0
    let totalCompressedSize = 0

    Object.values(allMetadata).forEach(metadataStr => {
      try {
        const metadata = JSON.parse(metadataStr)
        if (metadata.compressed) {
          compressed++
          totalCompressedSize += metadata.size
        } else {
          uncompressed++
        }
        totalOriginalSize += metadata.originalSize || metadata.size
      } catch (error) {
        // Skip invalid metadata
      }
    })

    const compressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1

    return {
      totalKeys,
      memoryUsage,
      keysByPattern,
      topAccessedKeys: topKeys,
      compressionStats: {
        ratio: compressionRatio,
        compressed,
        uncompressed
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    try {
      const start = Date.now()
      await this.redis.ping()
      const latency = Date.now() - start

      const info = await this.getCacheInfo()
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      
      if (latency > 100) {
        status = 'degraded'
      }
      
      if (latency > 1000) {
        status = 'unhealthy'
      }

      return {
        status,
        details: {
          latency,
          hitRate: this.stats.hitRate,
          totalKeys: info.totalKeys,
          memoryUsage: info.memoryUsage
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  private generateCacheKey(url: string, context: APIGatewayContext): string {
    const urlObj = new URL(url)
    
    // Include version in cache key
    const baseKey = `cache:${context.version}:${urlObj.pathname}`
    
    // Include relevant query parameters (sorted for consistency)
    const searchParams = new URLSearchParams(urlObj.search)
    const sortedParams = Array.from(searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
    
    const cacheKey = sortedParams ? `${baseKey}?${sortedParams}` : baseKey
    
    // Include user context if relevant (for personalized responses)
    if (context.userId && this.isPersonalizedEndpoint(urlObj.pathname)) {
      return `${cacheKey}:user:${context.userId}`
    }
    
    return cacheKey
  }

  private isPersonalizedEndpoint(pathname: string): boolean {
    const personalizedPatterns = [
      '/api/user',
      '/api/me',
      '/api/notifications',
      '/api/dashboard'
    ]
    
    return personalizedPatterns.some(pattern => pathname.includes(pattern))
  }

  private generateETag(body: any): string {
    const content = typeof body === 'string' ? body : JSON.stringify(body)
    return Buffer.from(content).toString('base64').substr(0, 16)
  }

  private serializeHeaders(headers: Headers): Record<string, string> {
    const serialized: Record<string, string> = {}
    headers.forEach((value, key) => {
      // Exclude hop-by-hop headers
      const hopByHopHeaders = ['connection', 'keep-alive', 'proxy-authenticate', 
                              'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade']
      
      if (!hopByHopHeaders.includes(key.toLowerCase())) {
        serialized[key] = value
      }
    })
    
    return serialized
  }

  private isExpired(entry: CacheEntry): boolean {
    // This is a secondary check - Redis TTL is the primary expiration mechanism
    // Could implement more sophisticated expiration logic here
    return false
  }

  private async enforceMaxSize(): Promise<void> {
    if (this.stats.size <= this.config.maxSize) return

    try {
      // Use LRU eviction - remove least recently accessed keys
      const toEvict = this.stats.size - this.config.maxSize + 10 // Evict a few extra
      const oldestKeys = await this.redis.zrange('cache:access', 0, toEvict - 1)
      
      if (oldestKeys.length > 0) {
        await this.redis.del(...oldestKeys)
        await this.redis.hdel('cache:metadata', ...oldestKeys)
        await this.redis.zrem('cache:access', ...oldestKeys)
        
        this.stats.size -= oldestKeys.length
        this.stats.evictions += oldestKeys.length
      }
    } catch (error) {
      console.error('Cache size enforcement error:', error)
    }
  }

  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0
  }

  private updateCompressionRatio(originalSize: number, compressedSize: number): void {
    const ratio = compressedSize / originalSize
    this.stats.compressionRatio = (this.stats.compressionRatio + ratio) / 2 // Running average
  }

  private setupInvalidationPatterns(): void {
    // Asset-related invalidations
    this.invalidationPatterns.set('asset_mutations', {
      pattern: 'cache:*/api/assets*',
      method: 'POST|PUT|DELETE',
      tags: ['assets']
    })

    // Organization-related invalidations
    this.invalidationPatterns.set('org_mutations', {
      pattern: 'cache:*/api/organizations*',
      method: 'POST|PUT|DELETE',
      tags: ['organizations']
    })

    // User-related invalidations
    this.invalidationPatterns.set('user_mutations', {
      pattern: 'cache:*/api/user*',
      method: 'POST|PUT|DELETE',
      tags: ['users']
    })

    // Vault-related invalidations
    this.invalidationPatterns.set('vault_mutations', {
      pattern: 'cache:*/api/vaults*',
      method: 'POST|PUT|DELETE',
      tags: ['vaults']
    })
  }

  private matchesInvalidationPattern(url: string, method: string, pattern: InvalidationPattern): boolean {
    if (pattern.method && !pattern.method.includes(method)) {
      return false
    }

    // Simple pattern matching - could be enhanced with regex
    const urlPattern = pattern.pattern.replace(/\*/g, '.*')
    return new RegExp(urlPattern).test(url)
  }

  private generateAutoInvalidationPatterns(url: string, method: string): string[] {
    const patterns: string[] = []
    
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      
      // Invalidate collection endpoints when items are modified
      if (pathParts.length >= 3) { // /api/resource/id
        const collectionPath = `/${pathParts.slice(0, -1).join('/')}`
        patterns.push(`cache:*${collectionPath}`)
        patterns.push(`cache:*${collectionPath}?*`)
      }
      
      // Invalidate related endpoints
      if (url.includes('/assets')) {
        patterns.push('cache:*/api/vaults*') // Assets might affect vaults
        patterns.push('cache:*/api/search*') // Assets might affect search results
      }
      
      if (url.includes('/organizations')) {
        patterns.push('cache:*/api/users*') // Org changes might affect user data
        patterns.push('cache:*/api/assets*') // Org changes might affect assets
      }
    }
    
    return patterns
  }

  private startStatsCollection(): void {
    // Reset stats periodically to prevent memory bloat
    setInterval(() => {
      if (this.stats.totalRequests > 1000000) {
        // Reset but keep hit rate calculation reasonable
        this.stats.hits = Math.floor(this.stats.hits / 2)
        this.stats.misses = Math.floor(this.stats.misses / 2)
        this.stats.totalRequests = this.stats.hits + this.stats.misses
        this.updateHitRate()
      }
    }, 3600000) // Every hour
  }

  /**
   * Warm up cache with frequently accessed endpoints
   */
  async warmup(urls: Array<{ url: string; context: APIGatewayContext }>): Promise<void> {
    console.log('Starting cache warmup...')
    
    for (const { url, context } of urls) {
      try {
        // This would typically make requests to populate the cache
        // For now, we'll just mark these URLs as high priority
        const key = this.generateCacheKey(url, context)
        await this.redis.zadd('cache:priority', Date.now(), key)
      } catch (error) {
        console.error(`Cache warmup error for ${url}:`, error)
      }
    }
    
    console.log(`Cache warmup completed for ${urls.length} URLs`)
  }
}