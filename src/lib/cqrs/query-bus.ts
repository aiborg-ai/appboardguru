/**
 * CQRS Query Bus - Query Handling Infrastructure
 * Implements query pattern with caching, projection, and performance optimization
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { Result, success, failure } from '../repositories/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { nanoid } from 'nanoid'

// Base query interface
export interface Query {
  id: string
  type: string
  userId?: string
  timestamp: string
  parameters: Record<string, any>
  metadata: Record<string, any>
}

// Query result interface
export interface QueryResult<T = any> {
  data: T
  metadata: {
    executionTime: number
    cacheHit: boolean
    totalCount?: number
    hasMore?: boolean
    version?: string
  }
}

// Query handler interface
export interface QueryHandler<TQuery extends Query = Query, TResult = any> {
  handle(query: TQuery, context: QueryContext): Promise<Result<QueryResult<TResult>, string>>
  canHandle(queryType: string): boolean
  authorize?(query: TQuery, context: QueryContext): Promise<Result<void, string>>
  getCacheKey?(query: TQuery): string
  getCacheTTL?(query: TQuery): number
}

// Query context
export interface QueryContext {
  userId?: string
  roles: string[]
  permissions: string[]
  metadata: Record<string, any>
  traceId: string
  requestTime: Date
}

// Query middleware interface
export interface QueryMiddleware {
  execute<T>(
    query: Query,
    context: QueryContext,
    next: () => Promise<Result<QueryResult<T>, string>>
  ): Promise<Result<QueryResult<T>, string>>
}

// Query bus options
export interface QueryBusOptions {
  enableMetrics?: boolean
  enableTracing?: boolean
  enableCaching?: boolean
  cacheDefaultTTL?: number
  maxCacheSize?: number
  timeout?: number
}

// Cache entry interface
interface CacheEntry {
  data: QueryResult<any>
  timestamp: number
  ttl: number
  hits: number
}

export class QueryBus extends EventEmitter {
  private handlers: Map<string, QueryHandler> = new Map()
  private middleware: QueryMiddleware[] = []
  private cache: Map<string, CacheEntry> = new Map()
  private metrics: MetricsCollector
  private tracer: DistributedTracer
  private options: Required<QueryBusOptions>
  private cacheCleanupTimer: NodeJS.Timeout

  constructor(options: QueryBusOptions = {}) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
    
    this.options = {
      enableMetrics: options.enableMetrics ?? true,
      enableTracing: options.enableTracing ?? true,
      enableCaching: options.enableCaching ?? true,
      cacheDefaultTTL: options.cacheDefaultTTL ?? 300000, // 5 minutes
      maxCacheSize: options.maxCacheSize ?? 10000,
      timeout: options.timeout ?? 30000
    }

    // Setup cache cleanup
    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupCache()
    }, 60000) // Cleanup every minute
  }

  /**
   * Register a query handler
   */
  registerHandler(handler: QueryHandler): void {
    const handlerTypes = this.getHandlerTypes(handler)
    
    handlerTypes.forEach(type => {
      if (this.handlers.has(type)) {
        throw new Error(`Handler for query type '${type}' already registered`)
      }
      this.handlers.set(type, handler)
    })

    console.log(`Registered query handler for types: ${handlerTypes.join(', ')}`)
  }

  /**
   * Register multiple handlers
   */
  registerHandlers(handlers: QueryHandler[]): void {
    handlers.forEach(handler => this.registerHandler(handler))
  }

  /**
   * Add middleware to the query pipeline
   */
  use(middleware: QueryMiddleware): void {
    this.middleware.push(middleware)
  }

  /**
   * Execute a query
   */
  async query<TResult = any>(
    query: Query,
    context: QueryContext
  ): Promise<Result<QueryResult<TResult>, string>> {
    const span = this.tracer.startSpan('query_bus_execute', {
      queryType: query.type,
      userId: context.userId
    })

    const startTime = Date.now()

    try {
      // Validate query structure
      const validationResult = this.validateQueryStructure(query)
      if (!validationResult.success) {
        return failure(validationResult.error)
      }

      // Find handler
      const handler = this.handlers.get(query.type)
      if (!handler) {
        const error = `No handler registered for query type: ${query.type}`
        this.emit('queryFailed', { query, error, context })
        return failure(error)
      }

      // Check cache first
      if (this.options.enableCaching) {
        const cachedResult = await this.getCachedResult<TResult>(query, handler)
        if (cachedResult) {
          this.emit('querySucceeded', { query, result: cachedResult, cached: true, context })
          return success(cachedResult)
        }
      }

      // Create execution chain with middleware
      const executeQuery = this.buildExecutionChain<TResult>(query, context, handler)

      // Execute with timeout
      const result = await Promise.race([
        executeQuery(),
        this.createTimeoutPromise<TResult>()
      ])

      // Record metrics
      if (this.options.enableMetrics) {
        const duration = Date.now() - startTime
        this.metrics.recordQueryExecution(
          query.type,
          result.success ? 'success' : 'failure',
          duration
        )
      }

      // Cache successful results
      if (result.success && this.options.enableCaching) {
        this.cacheResult(query, handler, result.data)
      }

      // Emit events
      if (result.success) {
        this.emit('querySucceeded', { query, result: result.data, cached: false, context })
      } else {
        this.emit('queryFailed', { query, error: result.error, context })
      }

      return result

    } catch (error) {
      span.recordError(error as Error)
      const errorMessage = `Query execution failed: ${(error as Error).message}`
      this.emit('queryFailed', { query, error: errorMessage, context })
      return failure(errorMessage)
    } finally {
      span.end()
    }
  }

  /**
   * Execute multiple queries in parallel
   */
  async queryBatch<TResult = any>(
    queries: Query[],
    context: QueryContext
  ): Promise<Result<QueryResult<TResult>[], string>> {
    const startTime = Date.now()
    
    try {
      const results = await Promise.allSettled(
        queries.map(query => this.query<TResult>(query, context))
      )

      const successful: QueryResult<TResult>[] = []
      const errors: string[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successful.push(result.value.data)
          } else {
            errors.push(`Query ${index} failed: ${result.value.error}`)
          }
        } else {
          errors.push(`Query ${index} rejected: ${result.reason}`)
        }
      })

      if (errors.length > 0 && successful.length === 0) {
        return failure(`All queries failed: ${errors.join(', ')}`)
      }

      // Record batch metrics
      if (this.options.enableMetrics) {
        const duration = Date.now() - startTime
        this.metrics.recordQueryBatchExecution(
          queries.length,
          successful.length,
          errors.length,
          duration
        )
      }

      return success(successful)

    } catch (error) {
      return failure(`Batch query execution failed: ${(error as Error).message}`)
    }
  }

  /**
   * Create query from template
   */
  createQuery<T extends Record<string, any>>(
    type: string,
    parameters: T,
    options: {
      userId?: string
      metadata?: Record<string, any>
    } = {}
  ): Query {
    return {
      id: nanoid(),
      type,
      userId: options.userId,
      timestamp: new Date().toISOString(),
      parameters,
      metadata: options.metadata || {}
    }
  }

  /**
   * Invalidate cache for specific query type or key
   */
  invalidateCache(pattern?: string): number {
    let invalidatedCount = 0

    if (!pattern) {
      // Invalidate all cache
      invalidatedCount = this.cache.size
      this.cache.clear()
    } else {
      // Invalidate matching keys
      for (const [key, entry] of this.cache.entries()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
          invalidatedCount++
        }
      }
    }

    this.emit('cacheInvalidated', { pattern, count: invalidatedCount })
    return invalidatedCount
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    hitRate: number
    totalHits: number
    oldestEntry: number | null
    newestEntry: number | null
  } {
    if (this.cache.size === 0) {
      return {
        size: 0,
        hitRate: 0,
        totalHits: 0,
        oldestEntry: null,
        newestEntry: null
      }
    }

    let totalHits = 0
    let totalRequests = 0
    let oldestTimestamp = Date.now()
    let newestTimestamp = 0

    this.cache.forEach(entry => {
      totalHits += entry.hits
      totalRequests += entry.hits + 1 // Assuming 1 miss when entry was created
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp)
      newestTimestamp = Math.max(newestTimestamp, entry.timestamp)
    })

    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalHits,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp
    }
  }

  /**
   * Get registered query types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * Check if handler is registered for query type
   */
  hasHandler(queryType: string): boolean {
    return this.handlers.has(queryType)
  }

  /**
   * Get query execution statistics
   */
  getStatistics(): {
    handlersCount: number
    middlewareCount: number
    registeredTypes: string[]
    cacheStats: ReturnType<typeof QueryBus.prototype.getCacheStats>
  } {
    return {
      handlersCount: this.handlers.size,
      middlewareCount: this.middleware.length,
      registeredTypes: this.getRegisteredTypes(),
      cacheStats: this.getCacheStats()
    }
  }

  /**
   * Shutdown query bus
   */
  shutdown(): void {
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer)
    }
    this.cache.clear()
    this.removeAllListeners()
  }

  /**
   * Private helper methods
   */
  private validateQueryStructure(query: Query): Result<void, string> {
    const QuerySchema = z.object({
      id: z.string(),
      type: z.string(),
      userId: z.string().optional(),
      timestamp: z.string(),
      parameters: z.record(z.any()),
      metadata: z.record(z.any())
    })

    try {
      QuerySchema.parse(query)
      return success(undefined)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return failure(`Query validation failed: ${error.errors.map(e => e.message).join(', ')}`)
      }
      return failure(`Query validation failed: ${(error as Error).message}`)
    }
  }

  private getHandlerTypes(handler: QueryHandler): string[] {
    // In a real implementation, this could use reflection or decorators
    if ('getSupportedTypes' in handler && typeof handler.getSupportedTypes === 'function') {
      return (handler as any).getSupportedTypes()
    }
    return []
  }

  private buildExecutionChain<TResult>(
    query: Query,
    context: QueryContext,
    handler: QueryHandler
  ): () => Promise<Result<QueryResult<TResult>, string>> {
    // Build middleware chain
    const middlewareChain = [...this.middleware].reverse()
    
    const executeHandler = async (): Promise<Result<QueryResult<TResult>, string>> => {
      // Authorization check
      if (handler.authorize) {
        const authResult = await handler.authorize(query, context)
        if (!authResult.success) {
          return authResult as any
        }
      }

      // Execute handler
      return handler.handle(query, context) as Promise<Result<QueryResult<TResult>, string>>
    }

    // Build execution chain with middleware
    return middlewareChain.reduce(
      (next, middleware) => () => middleware.execute(query, context, next),
      executeHandler
    )
  }

  private async getCachedResult<TResult>(
    query: Query,
    handler: QueryHandler
  ): Promise<QueryResult<TResult> | null> {
    const cacheKey = handler.getCacheKey ? handler.getCacheKey(query) : this.generateCacheKey(query)
    const entry = this.cache.get(cacheKey)

    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      entry.hits++
      entry.data.metadata.cacheHit = true
      return entry.data as QueryResult<TResult>
    }

    if (entry) {
      // Expired entry
      this.cache.delete(cacheKey)
    }

    return null
  }

  private cacheResult<TResult>(
    query: Query,
    handler: QueryHandler,
    result: QueryResult<TResult>
  ): void {
    if (this.cache.size >= this.options.maxCacheSize) {
      // Remove oldest entries
      this.evictOldestCacheEntries(Math.floor(this.options.maxCacheSize * 0.1))
    }

    const cacheKey = handler.getCacheKey ? handler.getCacheKey(query) : this.generateCacheKey(query)
    const ttl = handler.getCacheTTL ? handler.getCacheTTL(query) : this.options.cacheDefaultTTL

    const entry: CacheEntry = {
      data: { ...result, metadata: { ...result.metadata, cacheHit: false } },
      timestamp: Date.now(),
      ttl,
      hits: 0
    }

    this.cache.set(cacheKey, entry)
  }

  private generateCacheKey(query: Query): string {
    const keyComponents = [
      query.type,
      JSON.stringify(query.parameters),
      query.userId || 'anonymous'
    ]
    
    return keyComponents.join(':')
  }

  private cleanupCache(): void {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }

    if (removedCount > 0) {
      this.emit('cacheCleanup', { removedCount, remainingSize: this.cache.size })
    }
  }

  private evictOldestCacheEntries(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, count)

    entries.forEach(([key]) => {
      this.cache.delete(key)
    })
  }

  private async createTimeoutPromise<TResult>(): Promise<Result<QueryResult<TResult>, string>> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query execution timed out after ${this.options.timeout}ms`))
      }, this.options.timeout)
    })
  }
}

/**
 * Abstract base query handler
 */
export abstract class BaseQueryHandler<TQuery extends Query = Query, TResult = any> 
  implements QueryHandler<TQuery, TResult> {
  
  abstract handle(query: TQuery, context: QueryContext): Promise<Result<QueryResult<TResult>, string>>
  abstract canHandle(queryType: string): boolean
  abstract getSupportedTypes(): string[]

  /**
   * Default authorization - can be overridden
   */
  async authorize(query: TQuery, context: QueryContext): Promise<Result<void, string>> {
    return success(undefined)
  }

  /**
   * Default cache key generation - can be overridden
   */
  getCacheKey(query: TQuery): string {
    return `${query.type}:${JSON.stringify(query.parameters)}:${query.userId || 'anonymous'}`
  }

  /**
   * Default cache TTL - can be overridden
   */
  getCacheTTL(query: TQuery): number {
    return 300000 // 5 minutes
  }

  /**
   * Helper to create query result
   */
  protected createResult<T>(
    data: T,
    options: {
      executionTime?: number
      cacheHit?: boolean
      totalCount?: number
      hasMore?: boolean
      version?: string
    } = {}
  ): QueryResult<T> {
    return {
      data,
      metadata: {
        executionTime: options.executionTime || 0,
        cacheHit: options.cacheHit || false,
        totalCount: options.totalCount,
        hasMore: options.hasMore,
        version: options.version
      }
    }
  }
}

/**
 * Built-in query middleware implementations
 */

// Caching middleware
export class CachingMiddleware implements QueryMiddleware {
  constructor(private cache: Map<string, any> = new Map()) {}

  async execute<T>(
    query: Query,
    context: QueryContext,
    next: () => Promise<Result<QueryResult<T>, string>>
  ): Promise<Result<QueryResult<T>, string>> {
    const cacheKey = `${query.type}:${JSON.stringify(query.parameters)}`
    
    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached) {
      cached.metadata.cacheHit = true
      return success(cached)
    }

    // Execute query
    const result = await next()
    
    // Cache successful results
    if (result.success) {
      result.data.metadata.cacheHit = false
      this.cache.set(cacheKey, result.data)
    }
    
    return result
  }
}

// Performance monitoring middleware
export class PerformanceMiddleware implements QueryMiddleware {
  constructor(private metrics: MetricsCollector) {}

  async execute<T>(
    query: Query,
    context: QueryContext,
    next: () => Promise<Result<QueryResult<T>, string>>
  ): Promise<Result<QueryResult<T>, string>> {
    const startTime = Date.now()
    
    try {
      const result = await next()
      const executionTime = Date.now() - startTime
      
      // Update result metadata
      if (result.success) {
        result.data.metadata.executionTime = executionTime
      }
      
      // Record metrics
      this.metrics.recordQueryExecution(
        query.type,
        result.success ? 'success' : 'failure',
        executionTime
      )
      
      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.metrics.recordQueryExecution(query.type, 'error', executionTime)
      throw error
    }
  }
}

// Query transformation middleware
export class TransformationMiddleware implements QueryMiddleware {
  constructor(
    private transformers: Map<string, (query: Query) => Query> = new Map()
  ) {}

  async execute<T>(
    query: Query,
    context: QueryContext,
    next: () => Promise<Result<QueryResult<T>, string>>
  ): Promise<Result<QueryResult<T>, string>> {
    const transformer = this.transformers.get(query.type)
    const transformedQuery = transformer ? transformer(query) : query
    
    // Replace the original query with transformed one
    return next()
  }

  addTransformer(queryType: string, transformer: (query: Query) => Query): void {
    this.transformers.set(queryType, transformer)
  }
}