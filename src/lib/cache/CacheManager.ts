/**
 * Multi-Layer Cache Manager
 * Implements intelligent caching with automatic promotion and invalidation
 */

import { createHash } from 'crypto'

// Database cache item interface
interface CacheItem {
  key: string
  value?: any
  expires_at?: string
  created_at?: string
}

// Cache layer interface
export interface CacheLayer {
  name: string
  priority: number
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  invalidate(pattern: string): Promise<void>
  exists(key: string): Promise<boolean>
  getStats(): Promise<CacheStats>
}

// Cache statistics
export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  maxSize: number
}

// Cache configuration
export interface CacheConfig {
  ttl: number // seconds
  tags?: string[]
  varyBy?: string[]
  priority?: 'low' | 'normal' | 'high'
}

/**
 * In-Memory Cache Layer (fastest, limited size)
 */
export class MemoryCache implements CacheLayer {
  name = 'memory'
  priority = 1
  
  private cache = new Map<string, { value: any; expiry: number; lastAccess: number }>()
  private stats = { hits: 0, misses: 0 }
  
  constructor(
    private maxSize = 1000,
    private defaultTTL = 300 // 5 minutes
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      return null
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }
    
    // Update last access time
    item.lastAccess = Date.now()
    this.stats.hits++
    
    return item.value as T
  }

  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    // Evict oldest items if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }
    
    const expiry = Date.now() + (ttl * 1000)
    this.cache.set(key, {
      value,
      expiry,
      lastAccess: Date.now()
    })
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'))
    
    for (const [key] of this.cache.entries()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key)
    return item ? Date.now() <= item.expiry : false
  }

  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size,
      maxSize: this.maxSize
    }
  }

  private evictOldest(): void {
    let oldestKey = ''
    let oldestTime = Date.now()
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccess < oldestTime) {
        oldestTime = item.lastAccess
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }
}

/**
 * Database Cache Layer (persistent, slower than memory)
 */
export class DatabaseCache implements CacheLayer {
  name = 'database'
  priority = 2
  
  private tableName = 'cache_entries'
  private stats = { hits: 0, misses: 0 }
  
  constructor(
    private supabase: any, // SupabaseClient
    private defaultTTL = 3600 // 1 hour
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('value, expires_at')
        .eq('key', key)
        .single()

      if (error || !data) {
        this.stats.misses++
        return null
      }

      if (new Date(data.expires_at) < new Date()) {
        // Cleanup expired entry
        await this.delete(key)
        this.stats.misses++
        return null
      }

      this.stats.hits++
      return JSON.parse(data.value) as T
    } catch (error) {
      console.error('Database cache get error:', error)
      this.stats.misses++
      return null
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
      
      await this.supabase
        .from(this.tableName)
        .upsert({
          key,
          value: JSON.stringify(value),
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Database cache set error:', error)
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.supabase
        .from(this.tableName)
        .delete()
        .eq('key', key)
    } catch (error) {
      console.error('Database cache delete error:', error)
    }
  }

  async clear(): Promise<void> {
    try {
      await this.supabase
        .from(this.tableName)
        .delete()
        .neq('key', '') // Delete all
      
      this.stats = { hits: 0, misses: 0 }
    } catch (error) {
      console.error('Database cache clear error:', error)
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const { data } = await this.supabase
        .from(this.tableName)
        .select('key')

      if (data) {
        const regex = new RegExp(pattern.replace('*', '.*'))
        const keysToDelete = (data as CacheItem[])
          .filter((item: CacheItem) => regex.test(item.key))
          .map((item: CacheItem) => item.key)

        if (keysToDelete.length > 0) {
          await this.supabase
            .from(this.tableName)
            .delete()
            .in('key', keysToDelete)
        }
      }
    } catch (error) {
      console.error('Database cache invalidate error:', error)
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('expires_at')
        .eq('key', key)
        .single()

      if (error || !data) return false
      
      return new Date(data.expires_at) > new Date()
    } catch (error) {
      return false
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const { count } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })

      const total = this.stats.hits + this.stats.misses
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: total > 0 ? this.stats.hits / total : 0,
        size: count || 0,
        maxSize: -1 // Unlimited for database
      }
    } catch (error) {
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        size: 0,
        maxSize: -1
      }
    }
  }
}

/**
 * Main Cache Manager
 */
export class CacheManager {
  private layers: CacheLayer[] = []
  private keyPrefix = 'app:'
  
  constructor(layers: CacheLayer[] = []) {
    this.layers = layers.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Get value from cache, checking layers in priority order
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.prefixKey(key)
    
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i]
      const value = await layer.get<T>(fullKey)
      
      if (value !== null) {
        // Promote to faster layers
        await this.promoteToFasterLayers(fullKey, value, i)
        return value
      }
    }
    
    return null
  }

  /**
   * Set value in all cache layers
   */
  async set<T>(key: string, value: T, config: CacheConfig): Promise<void> {
    const fullKey = this.prefixKey(key)
    
    // Set in all layers with appropriate TTLs
    const promises = this.layers.map(layer => {
      // Faster layers get shorter TTLs
      const adjustedTTL = config.ttl / Math.pow(2, layer.priority - 1)
      return layer.set(fullKey, value, adjustedTTL)
    })
    
    await Promise.allSettled(promises)
  }

  /**
   * Delete from all cache layers
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.prefixKey(key)
    
    const promises = this.layers.map(layer => layer.delete(fullKey))
    await Promise.allSettled(promises)
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    const fullPattern = this.prefixKey(pattern)
    
    const promises = this.layers.map(layer => layer.invalidate(fullPattern))
    await Promise.allSettled(promises)
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    const promises = this.layers.map(layer => layer.clear())
    await Promise.allSettled(promises)
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<Record<string, CacheStats>> {
    const stats: Record<string, CacheStats> = {}
    
    for (const layer of this.layers) {
      stats[layer.name] = await layer.getStats()
    }
    
    return stats
  }

  /**
   * Generate cache key with hashing for long keys
   */
  generateKey(namespace: string, identifier: string, params?: Record<string, any>): string {
    let key = `${namespace}:${identifier}`
    
    if (params) {
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, k) => ({ ...acc, [k]: params[k] }), {})
      
      const paramString = JSON.stringify(sortedParams)
      
      // Hash long parameter strings
      if (paramString.length > 100) {
        const hash = createHash('md5').update(paramString).digest('hex')
        key += `:${hash}`
      } else {
        key += `:${paramString}`
      }
    }
    
    return key
  }

  private prefixKey(key: string): string {
    return key.startsWith(this.keyPrefix) ? key : `${this.keyPrefix}${key}`
  }

  private async promoteToFasterLayers<T>(
    key: string, 
    value: T, 
    foundAtLayer: number
  ): Promise<void> {
    // Promote to all faster layers
    const promotionPromises = []
    
    for (let i = 0; i < foundAtLayer; i++) {
      const layer = this.layers[i]
      // Use shorter TTL for promoted values
      const ttl = 300 // 5 minutes
      promotionPromises.push(layer.set(key, value, ttl))
    }
    
    if (promotionPromises.length > 0) {
      await Promise.allSettled(promotionPromises)
    }
  }
}

/**
 * Create cache manager with default layers
 */
export function createCacheManager(supabase?: any): CacheManager {
  const layers: CacheLayer[] = [
    new MemoryCache(1000, 300) // 1000 items, 5 min TTL
  ]
  
  if (supabase) {
    layers.push(new DatabaseCache(supabase, 3600)) // 1 hour TTL
  }
  
  return new CacheManager(layers)
}

/**
 * Cached function decorator
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  cacheManager: CacheManager,
  keyGenerator: (...args: Parameters<T>) => string,
  config: CacheConfig
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: Parameters<T>) {
      const cacheKey = keyGenerator(...args)
      
      // Try to get from cache
      const cached = await cacheManager.get(cacheKey)
      if (cached !== null) {
        return cached
      }
      
      // Execute original method
      const result = await originalMethod.apply(this, args)
      
      // Cache the result
      if (result !== null && result !== undefined) {
        await cacheManager.set(cacheKey, result, config)
      }
      
      return result
    }

    return descriptor
  }
}

// Export default cache manager instance
export const defaultCacheManager = createCacheManager()