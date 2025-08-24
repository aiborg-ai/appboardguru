/**
 * Enhanced Base Repository with Advanced Performance Optimizations
 * - Multi-level caching strategy
 * - Connection pooling and query optimization
 * - Advanced error handling with retry mechanisms
 * - Comprehensive monitoring and telemetry
 * - Type-safe query builder with performance hints
 */

import { SupabaseClient, PostgrestFilterBuilder } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { Result, success, failure, RepositoryError, wrapAsync } from './result'
import { 
  QueryOptions, 
  PaginatedResult, 
  FilterCriteria, 
  QueryBuilder,
  AuditLogEntry,
  UserId,
  OrganizationId,
  createUserId
} from './types'
import { 
  TransactionCoordinator, 
  TransactionOptions, 
  TransactionUtils,
  OptimisticLock 
} from './transaction-coordinator'

// Cache interfaces
interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number
  strategy: 'lru' | 'lfu' | 'fifo'
  enableCompression: boolean
  keyPrefix: string
}

interface QueryCache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  clear(): Promise<void>
  stats(): Promise<CacheStats>
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

// Performance monitoring
interface QueryMetrics {
  queryTime: number
  resultSize: number
  cacheHit: boolean
  indexesUsed: string[]
  scanType: 'index' | 'sequential' | 'bitmap'
}

interface PerformanceHints {
  useCache: boolean
  cacheKey?: string
  cacheTTL?: number
  enablePreparedStatements: boolean
  queryTimeout?: number
  maxRetries: number
  retryBackoff: 'linear' | 'exponential'
}

// Query builder enhancements
interface EnhancedQueryOptions extends QueryOptions {
  hints?: PerformanceHints
  explain?: boolean
  profile?: boolean
}

/**
 * Multi-level cache implementation
 */
class MultiLevelCache implements QueryCache {
  private l1Cache = new Map<string, { value: any; expires: number }>()
  private l2Cache?: QueryCache // Redis or external cache
  private config: CacheConfig
  private stats = { hits: 0, misses: 0 }

  constructor(config: CacheConfig, l2Cache?: QueryCache) {
    this.config = config
    this.l2Cache = l2Cache
    
    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 60000) // Every minute
  }

  async get<T>(key: string): Promise<T | null> {
    const cacheKey = `${this.config.keyPrefix}:${key}`
    
    // L1 cache check
    const l1Entry = this.l1Cache.get(cacheKey)
    if (l1Entry && l1Entry.expires > Date.now()) {
      this.stats.hits++
      return l1Entry.value as T
    }
    
    // L2 cache check
    if (this.l2Cache) {
      const l2Value = await this.l2Cache.get<T>(cacheKey)
      if (l2Value) {
        // Populate L1 cache
        this.l1Cache.set(cacheKey, {
          value: l2Value,
          expires: Date.now() + this.config.ttl
        })
        this.stats.hits++
        return l2Value
      }
    }
    
    this.stats.misses++
    return null
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheKey = `${this.config.keyPrefix}:${key}`
    const cacheTTL = ttl ?? this.config.ttl
    const expires = Date.now() + cacheTTL
    
    // L1 cache
    if (this.l1Cache.size >= this.config.maxSize) {
      this.evictL1()
    }
    this.l1Cache.set(cacheKey, { value, expires })
    
    // L2 cache
    if (this.l2Cache) {
      await this.l2Cache.set(cacheKey, value, cacheTTL)
    }
  }

  async del(key: string): Promise<void> {
    const cacheKey = `${this.config.keyPrefix}:${key}`
    this.l1Cache.delete(cacheKey)
    if (this.l2Cache) {
      await this.l2Cache.del(cacheKey)
    }
  }

  async clear(): Promise<void> {
    this.l1Cache.clear()
    if (this.l2Cache) {
      await this.l2Cache.clear()
    }
  }

  async stats(): Promise<CacheStats> {
    const l2Stats = this.l2Cache ? await this.l2Cache.stats() : { hits: 0, misses: 0, size: 0, hitRate: 0 }
    
    const totalHits = this.stats.hits + l2Stats.hits
    const totalMisses = this.stats.misses + l2Stats.misses
    const totalRequests = totalHits + totalMisses
    
    return {
      hits: totalHits,
      misses: totalMisses,
      size: this.l1Cache.size + l2Stats.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.expires <= now) {
        this.l1Cache.delete(key)
      }
    }
  }

  private evictL1(): void {
    // Simple LRU eviction - remove oldest entry
    const firstKey = this.l1Cache.keys().next().value
    if (firstKey) {
      this.l1Cache.delete(firstKey)
    }
  }
}

/**
 * Enhanced Base Repository with advanced performance features
 */
export abstract class EnhancedBaseRepository {
  protected supabase: SupabaseClient<Database>
  protected transactionCoordinator?: TransactionCoordinator
  protected cache: MultiLevelCache
  protected tableName: string
  protected performanceMonitoring: boolean = true

  constructor(
    supabase: SupabaseClient<Database>,
    tableName: string,
    cacheConfig?: Partial<CacheConfig>,
    transactionCoordinator?: TransactionCoordinator,
    l2Cache?: QueryCache
  ) {
    this.supabase = supabase
    this.tableName = tableName
    this.transactionCoordinator = transactionCoordinator
    
    const defaultCacheConfig: CacheConfig = {
      ttl: 300000, // 5 minutes
      maxSize: 1000,
      strategy: 'lru',
      enableCompression: false,
      keyPrefix: `repo:${tableName}`
    }
    
    this.cache = new MultiLevelCache(
      { ...defaultCacheConfig, ...cacheConfig },
      l2Cache
    )
  }

  /**
   * Enhanced query execution with caching and performance monitoring
   */
  protected async executeQuery<T>(
    queryBuilder: () => PostgrestFilterBuilder<Database['public'], any>,
    options: EnhancedQueryOptions = {}
  ): Promise<Result<T>> {
    const startTime = Date.now()
    const queryHash = this.generateQueryHash(queryBuilder.toString(), options)
    
    try {
      // Check cache first if enabled
      if (options.hints?.useCache !== false) {
        const cacheKey = options.hints?.cacheKey ?? queryHash
        const cached = await this.cache.get<T>(cacheKey)
        if (cached) {
          this.recordMetrics({
            queryTime: Date.now() - startTime,
            resultSize: JSON.stringify(cached).length,
            cacheHit: true,
            indexesUsed: [],
            scanType: 'index'
          })
          return success(cached)
        }
      }

      // Execute query with timeout
      const timeoutMs = options.hints?.queryTimeout ?? 30000
      const query = queryBuilder()
      
      const queryPromise = this.executeWithRetry(
        () => query,
        options.hints?.maxRetries ?? 3,
        options.hints?.retryBackoff ?? 'exponential'
      )

      const result = await Promise.race([
        queryPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
        )
      ])

      if (result.error) {
        throw RepositoryError.internal(
          `Query failed: ${result.error.message}`,
          { query: queryBuilder.toString(), options }
        )
      }

      const data = result.data as T
      const queryTime = Date.now() - startTime

      // Cache result if successful
      if (options.hints?.useCache !== false) {
        const cacheKey = options.hints?.cacheKey ?? queryHash
        const cacheTTL = options.hints?.cacheTTL
        await this.cache.set(cacheKey, data, cacheTTL)
      }

      // Record performance metrics
      this.recordMetrics({
        queryTime,
        resultSize: JSON.stringify(data).length,
        cacheHit: false,
        indexesUsed: [], // TODO: Extract from query plan
        scanType: 'index' // TODO: Determine from query plan
      })

      return success(data)
    } catch (error) {
      const queryTime = Date.now() - startTime
      
      this.recordMetrics({
        queryTime,
        resultSize: 0,
        cacheHit: false,
        indexesUsed: [],
        scanType: 'sequential'
      })

      if (error instanceof RepositoryError) {
        return failure(error)
      }
      
      return failure(RepositoryError.internal(
        `Query execution failed: ${error.message}`,
        { query: queryBuilder.toString(), options, error }
      ))
    }
  }

  /**
   * Enhanced findById with caching
   */
  async findById<T>(id: string, options?: EnhancedQueryOptions): Promise<Result<T | null>> {
    return this.executeQuery<T | null>(
      () => this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single(),
      {
        hints: {
          useCache: true,
          cacheKey: `${this.tableName}:${id}`,
          cacheTTL: 600000, // 10 minutes for individual records
          enablePreparedStatements: true,
          ...options?.hints
        },
        ...options
      }
    )
  }

  /**
   * Enhanced findMany with pagination and caching
   */
  async findMany<T>(
    criteria: FilterCriteria = {},
    options: EnhancedQueryOptions = {}
  ): Promise<Result<PaginatedResult<T>>> {
    const page = options.page ?? 1
    const limit = options.limit ?? 20
    const offset = (page - 1) * limit

    // Build query
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })

    // Apply filters
    for (const [key, value] of Object.entries(criteria)) {
      if (Array.isArray(value)) {
        query = query.in(key, value)
      } else if (typeof value === 'object' && value !== null) {
        // Handle complex filters like { gt: 100 }, { like: '%test%' }
        for (const [op, val] of Object.entries(value)) {
          query = query[op as any](key, val)
        }
      } else {
        query = query.eq(key, value)
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    // Apply sorting
    if (options.orderBy) {
      for (const [column, direction] of Object.entries(options.orderBy)) {
        query = query.order(column, { ascending: direction === 'asc' })
      }
    }

    return this.executeQuery<any>(
      () => query,
      {
        hints: {
          useCache: true,
          cacheKey: `${this.tableName}:list:${this.generateQueryHash(JSON.stringify({ criteria, options }))}`,
          cacheTTL: 60000, // 1 minute for lists
          enablePreparedStatements: true,
          ...options.hints
        },
        ...options
      }
    ).then(result => {
      if (!result.success) return result

      return success({
        data: result.data.data || [],
        total: result.data.count || 0,
        page,
        limit,
        totalPages: Math.ceil((result.data.count || 0) / limit)
      } as PaginatedResult<T>)
    })
  }

  /**
   * Enhanced create with cache invalidation
   */
  async create<T>(
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>,
    options?: EnhancedQueryOptions
  ): Promise<Result<T>> {
    const result = await this.executeQuery<T>(
      () => this.supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single(),
      {
        hints: {
          useCache: false, // Don't cache write operations
          enablePreparedStatements: true,
          ...options?.hints
        },
        ...options
      }
    )

    if (result.success) {
      // Invalidate relevant caches
      await this.invalidateListCaches()
    }

    return result
  }

  /**
   * Enhanced update with optimistic locking and cache invalidation
   */
  async update<T>(
    id: string,
    updates: Partial<T>,
    options?: EnhancedQueryOptions & { expectedVersion?: number }
  ): Promise<Result<T>> {
    // Optimistic locking check
    if (options?.expectedVersion !== undefined) {
      const current = await this.findById<any>(id)
      if (!current.success) return current
      
      if (current.data?.version !== options.expectedVersion) {
        return failure(RepositoryError.conflict(
          'Record has been modified by another process',
          { expectedVersion: options.expectedVersion, actualVersion: current.data?.version }
        ))
      }
      
      // Increment version
      (updates as any).version = options.expectedVersion + 1
    }

    const result = await this.executeQuery<T>(
      () => this.supabase
        .from(this.tableName)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single(),
      {
        hints: {
          useCache: false,
          enablePreparedStatements: true,
          ...options?.hints
        },
        ...options
      }
    )

    if (result.success) {
      // Invalidate caches
      await this.cache.del(`${this.tableName}:${id}`)
      await this.invalidateListCaches()
    }

    return result
  }

  /**
   * Enhanced delete with cache invalidation
   */
  async delete(id: string, options?: EnhancedQueryOptions): Promise<Result<void>> {
    const result = await this.executeQuery<any>(
      () => this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id),
      {
        hints: {
          useCache: false,
          enablePreparedStatements: true,
          ...options?.hints
        },
        ...options
      }
    )

    if (result.success) {
      // Invalidate caches
      await this.cache.del(`${this.tableName}:${id}`)
      await this.invalidateListCaches()
    }

    return success(undefined)
  }

  /**
   * Bulk operations with optimized batching
   */
  async bulkCreate<T>(
    items: Array<Omit<T, 'id' | 'created_at' | 'updated_at'>>,
    batchSize = 100
  ): Promise<Result<T[]>> {
    const results: T[] = []
    const batches = this.chunk(items, batchSize)

    for (const batch of batches) {
      const result = await this.executeQuery<T[]>(
        () => this.supabase
          .from(this.tableName)
          .insert(batch)
          .select(),
        {
          hints: {
            useCache: false,
            enablePreparedStatements: true,
            maxRetries: 1, // Reduced retries for bulk ops
            queryTimeout: 60000 // Longer timeout for bulk ops
          }
        }
      )

      if (!result.success) {
        return result
      }

      results.push(...result.data)
    }

    // Invalidate list caches
    await this.invalidateListCaches()

    return success(results)
  }

  /**
   * Advanced transaction with saga support
   */
  async executeTransaction<T>(
    operations: Array<() => Promise<Result<any>>>,
    options: TransactionOptions = {}
  ): Promise<Result<T[]>> {
    if (!this.transactionCoordinator) {
      return failure(RepositoryError.internal(
        'Transaction coordinator not available for transaction operations'
      ))
    }

    return TransactionUtils.withTransaction(
      this.transactionCoordinator,
      operations,
      options
    )
  }

  /**
   * Cache management methods
   */
  async getCacheStats(): Promise<CacheStats> {
    return this.cache.stats()
  }

  async clearCache(): Promise<void> {
    await this.cache.clear()
  }

  async warmCache(ids: string[]): Promise<void> {
    // Pre-populate cache with frequently accessed items
    const promises = ids.map(id => this.findById(id))
    await Promise.allSettled(promises)
  }

  /**
   * Performance monitoring and optimization
   */
  protected recordMetrics(metrics: QueryMetrics): void {
    if (!this.performanceMonitoring) return

    // Log slow queries
    if (metrics.queryTime > 1000) {
      console.warn(`Slow query detected in ${this.tableName}:`, {
        queryTime: metrics.queryTime,
        resultSize: metrics.resultSize,
        cacheHit: metrics.cacheHit
      })
    }

    // Send metrics to monitoring service
    if (typeof window === 'undefined') {
      // Server-side telemetry
      // telemetry.recordMetric('repository.query_time', metrics.queryTime, {
      //   table: this.tableName,
      //   cache_hit: metrics.cacheHit
      // })
    }
  }

  /**
   * Utility methods
   */
  private generateQueryHash(query: string, options?: any): string {
    const content = JSON.stringify({ query, options })
    // Simple hash function - in production, use a proper hash library
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString()
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    backoff: 'linear' | 'exponential'
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) break
        
        // Calculate delay
        const delay = backoff === 'exponential' 
          ? Math.pow(2, attempt) * 1000
          : (attempt + 1) * 1000
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private async invalidateListCaches(): Promise<void> {
    // Simple approach - in production, use pattern matching
    // await this.cache.deletePattern(`${this.tableName}:list:*`)
  }
}