/**
 * Enhanced Base Service with Advanced Performance and Reliability Features
 * - Circuit breaker pattern for external services
 * - Advanced async patterns and concurrency control
 * - Comprehensive error handling with recovery strategies
 * - Performance monitoring and optimization
 * - Type-safe service composition
 */

import { RepositoryFactory } from '../repositories'
import {
  Result,
  RepositoryError,
  ErrorCode,
  ErrorCategory,
  success,
  failure,
  wrapAsync,
  wrapAsyncWithTimeout,
  withRecovery,
  RetryStrategy,
  FallbackStrategy,
  CacheStrategy,
  type RecoveryStrategy
} from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// Circuit breaker interfaces
interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
  minimumThroughput: number
}

interface CircuitBreakerStats {
  state: 'closed' | 'open' | 'half-open'
  failures: number
  successes: number
  consecutiveFailures: number
  lastFailureTime?: number
  nextAttemptTime?: number
}

// Async pattern interfaces
interface ConcurrencyConfig {
  maxConcurrent: number
  timeoutMs: number
  retryConfig: {
    attempts: number
    backoff: 'linear' | 'exponential'
    maxDelay: number
  }
}

interface BulkOperation<T, R> {
  items: T[]
  batchSize: number
  processor: (batch: T[]) => Promise<Result<R[]>>
  onProgress?: (processed: number, total: number) => void
  onError?: (error: Error, batch: T[]) => void
}

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  private config: CircuitBreakerConfig
  private stats: CircuitBreakerStats
  private serviceId: string

  constructor(serviceId: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.serviceId = serviceId
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
      minimumThroughput: 10,
      ...config
    }
    
    this.stats = {
      state: 'closed',
      failures: 0,
      successes: 0,
      consecutiveFailures: 0
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<Result<T>> {
    if (this.stats.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.stats.state = 'half-open'
      } else {
        return failure(RepositoryError.serviceUnavailable(
          `Circuit breaker is OPEN for service: ${this.serviceId}`,
          { nextAttemptTime: this.stats.nextAttemptTime }
        ))
      }
    }

    try {
      const result = await operation()
      this.recordSuccess()
      return success(result)
    } catch (error) {
      this.recordFailure()
      return failure(error as RepositoryError)
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() >= (this.stats.nextAttemptTime || 0)
  }

  private recordSuccess(): void {
    this.stats.successes++
    this.stats.consecutiveFailures = 0
    
    if (this.stats.state === 'half-open') {
      this.stats.state = 'closed'
    }
  }

  private recordFailure(): void {
    this.stats.failures++
    this.stats.consecutiveFailures++
    this.stats.lastFailureTime = Date.now()
    
    if (this.stats.consecutiveFailures >= this.config.failureThreshold) {
      this.stats.state = 'open'
      this.stats.nextAttemptTime = Date.now() + this.config.resetTimeout
    }
  }

  getStats(): CircuitBreakerStats {
    return { ...this.stats }
  }

  reset(): void {
    this.stats = {
      state: 'closed',
      failures: 0,
      successes: 0,
      consecutiveFailures: 0
    }
  }
}

/**
 * Concurrency Control Manager
 */
class ConcurrencyManager {
  private runningTasks = new Set<Promise<any>>()
  private config: ConcurrencyConfig

  constructor(config: Partial<ConcurrencyConfig> = {}) {
    this.config = {
      maxConcurrent: 10,
      timeoutMs: 30000,
      retryConfig: {
        attempts: 3,
        backoff: 'exponential',
        maxDelay: 5000
      },
      ...config
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<Result<T>> {
    // Wait if at max concurrency
    while (this.runningTasks.size >= this.config.maxConcurrent) {
      await Promise.race(this.runningTasks)
    }

    const taskPromise = this.executeWithRetry(operation)
    this.runningTasks.add(taskPromise)
    
    try {
      const result = await taskPromise
      return result
    } finally {
      this.runningTasks.delete(taskPromise)
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<Result<T>> {
    let lastError: Error
    const { attempts, backoff, maxDelay } = this.config.retryConfig

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), this.config.timeoutMs)
          )
        ])
        
        return success(result)
      } catch (error) {
        lastError = error as Error
        
        if (attempt === attempts) break
        
        // Calculate delay
        let delay: number
        if (backoff === 'exponential') {
          delay = Math.min(Math.pow(2, attempt - 1) * 1000, maxDelay)
        } else {
          delay = Math.min(attempt * 1000, maxDelay)
        }
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    return failure(RepositoryError.internal(
      `Operation failed after ${attempts} attempts: ${lastError.message}`,
      { attempts, lastError: lastError.message }
    ))
  }

  getStats() {
    return {
      runningTasks: this.runningTasks.size,
      maxConcurrent: this.config.maxConcurrent
    }
  }
}

/**
 * Enhanced Base Service with advanced patterns
 */
export abstract class EnhancedBaseService {
  protected repositories: RepositoryFactory
  protected supabase: SupabaseClient<Database>
  protected circuitBreakers = new Map<string, CircuitBreaker>()
  protected concurrencyManager: ConcurrencyManager
  private recoveryStrategies: Map<string, RecoveryStrategy<any>[]> = new Map()
  private performanceMetrics = new Map<string, number[]>()

  constructor(supabase: SupabaseClient<Database>, concurrencyConfig?: Partial<ConcurrencyConfig>) {
    this.supabase = supabase
    this.repositories = new RepositoryFactory(supabase)
    this.concurrencyManager = new ConcurrencyManager(concurrencyConfig)
    this.setupDefaultRecoveryStrategies()
  }

  /**
   * Execute operation with circuit breaker protection
   */
  protected async executeWithCircuitBreaker<T>(
    serviceId: string,
    operation: () => Promise<T>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ): Promise<Result<T>> {
    if (!this.circuitBreakers.has(serviceId)) {
      this.circuitBreakers.set(serviceId, new CircuitBreaker(serviceId, circuitBreakerConfig))
    }
    
    const circuitBreaker = this.circuitBreakers.get(serviceId)!
    return circuitBreaker.execute(operation)
  }

  /**
   * Execute operation with concurrency control
   */
  protected async executeWithConcurrencyControl<T>(
    operation: () => Promise<T>
  ): Promise<Result<T>> {
    return this.concurrencyManager.execute(operation)
  }

  /**
   * Execute bulk operation with batching and error handling
   */
  protected async executeBulkOperation<T, R>(
    operation: BulkOperation<T, R>
  ): Promise<Result<R[]>> {
    const { items, batchSize, processor, onProgress, onError } = operation
    const results: R[] = []
    const batches = this.chunk(items, batchSize)
    let processedCount = 0

    for (const batch of batches) {
      try {
        const batchResult = await this.concurrencyManager.execute(() => processor(batch))
        
        if (batchResult.success) {
          results.push(...batchResult.data)
        } else {
          onError?.(new Error(batchResult.error.message), batch)
          // Continue with other batches or fail fast based on configuration
          if (operation.failFast !== false) {
            return batchResult as Result<R[]>
          }
        }
      } catch (error) {
        const err = error as Error
        onError?.(err, batch)
        
        if (operation.failFast !== false) {
          return failure(RepositoryError.internal(
            `Bulk operation failed: ${err.message}`,
            { processedCount, totalCount: items.length }
          ))
        }
      }
      
      processedCount += batch.length
      onProgress?.(processedCount, items.length)
    }

    return success(results)
  }

  /**
   * Execute operations in parallel with error aggregation
   */
  protected async executeParallel<T>(
    operations: Array<() => Promise<Result<T>>>,
    options: {
      maxConcurrency?: number
      failFast?: boolean
      aggregateErrors?: boolean
    } = {}
  ): Promise<Result<T[]>> {
    const { maxConcurrency = 5, failFast = false, aggregateErrors = true } = options
    const results: T[] = []
    const errors: RepositoryError[] = []
    
    // Create semaphore for concurrency control
    const semaphore = new Array(maxConcurrency).fill(null).map(() => Promise.resolve())
    let semaphoreIndex = 0

    const executeWithSemaphore = async (operation: () => Promise<Result<T>>) => {
      const currentIndex = semaphoreIndex % maxConcurrency
      semaphoreIndex++
      
      await semaphore[currentIndex]
      
      const promise = (async () => {
        try {
          const result = await operation()
          if (result.success) {
            results.push(result.data)
          } else {
            errors.push(result.error)
            if (failFast) {
              throw result.error
            }
          }
        } catch (error) {
          errors.push(error as RepositoryError)
          if (failFast) {
            throw error
          }
        }
      })()
      
      semaphore[currentIndex] = promise
      return promise
    }

    try {
      await Promise.all(operations.map(executeWithSemaphore))
    } catch (error) {
      if (failFast) {
        return failure(error as RepositoryError)
      }
    }

    if (errors.length > 0 && !aggregateErrors) {
      return failure(errors[0])
    }

    if (errors.length > 0 && results.length === 0) {
      return failure(RepositoryError.internal(
        'All parallel operations failed',
        { errorCount: errors.length, errors: errors.map(e => e.message) }
      ))
    }

    return success(results)
  }

  /**
   * Advanced caching with invalidation strategies
   */
  protected async executeWithCache<T>(
    cacheKey: string,
    operation: () => Promise<Result<T>>,
    options: {
      ttl?: number
      tags?: string[]
      invalidateOnMutation?: boolean
      refreshThreshold?: number
    } = {}
  ): Promise<Result<T>> {
    const { ttl = 300000, tags = [], refreshThreshold = 0.8 } = options
    
    // Try to get from cache
    const cached = await this.getFromCache<T>(cacheKey)
    if (cached) {
      // Check if needs refresh (background refresh)
      const cacheAge = Date.now() - (cached.timestamp || 0)
      if (cacheAge > (ttl * refreshThreshold)) {
        // Refresh in background
        this.refreshCacheInBackground(cacheKey, operation, ttl, tags)
      }
      
      return success(cached.data)
    }

    // Execute operation and cache result
    const result = await operation()
    if (result.success) {
      await this.setCache(cacheKey, result.data, ttl, tags)
    }

    return result
  }

  /**
   * Performance monitoring
   */
  protected recordPerformanceMetric(operation: string, duration: number): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, [])
    }
    
    const metrics = this.performanceMetrics.get(operation)!
    metrics.push(duration)
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift()
    }
    
    // Log slow operations
    if (duration > 2000) {
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`)
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(operation?: string) {
    if (operation) {
      const metrics = this.performanceMetrics.get(operation) || []
      return this.calculateStats(metrics)
    }
    
    const stats: Record<string, any> = {}
    for (const [op, metrics] of this.performanceMetrics.entries()) {
      stats[op] = this.calculateStats(metrics)
    }
    return stats
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {}
    for (const [serviceId, circuitBreaker] of this.circuitBreakers.entries()) {
      stats[serviceId] = circuitBreaker.getStats()
    }
    return stats
  }

  /**
   * Health check for service dependencies
   */
  async healthCheck(): Promise<Result<{ status: string; dependencies: Record<string, any> }>> {
    const dependencies: Record<string, any> = {}
    
    // Check database connection
    try {
      const { error } = await this.supabase.from('health_check').select('1').limit(1)
      dependencies.database = error ? { status: 'unhealthy', error: error.message } : { status: 'healthy' }
    } catch (error) {
      dependencies.database = { status: 'unhealthy', error: (error as Error).message }
    }
    
    // Check circuit breaker status
    dependencies.circuitBreakers = this.getCircuitBreakerStats()
    
    // Check concurrency manager
    dependencies.concurrency = this.concurrencyManager.getStats()
    
    const allHealthy = Object.values(dependencies).every(dep => {
      if (typeof dep === 'object' && dep.status) {
        return dep.status === 'healthy'
      }
      return true
    })
    
    return success({
      status: allHealthy ? 'healthy' : 'degraded',
      dependencies
    })
  }

  /**
   * Enhanced error handling with context
   */
  protected handleError(
    error: Error,
    operation: string,
    context: Record<string, any> = {}
  ): RepositoryError {
    // Add performance context
    const metrics = this.performanceMetrics.get(operation)
    if (metrics && metrics.length > 0) {
      context.recentPerformance = {
        avg: metrics.reduce((a, b) => a + b, 0) / metrics.length,
        last: metrics[metrics.length - 1]
      }
    }
    
    // Add circuit breaker context
    const circuitBreakerStats = this.getCircuitBreakerStats()
    if (Object.keys(circuitBreakerStats).length > 0) {
      context.circuitBreakers = circuitBreakerStats
    }
    
    if (error instanceof RepositoryError) {
      error.addContext(context)
      return error
    }
    
    return RepositoryError.internal(
      `Service operation failed: ${operation}`,
      { originalError: error.message, ...context }
    )
  }

  /**
   * Setup default recovery strategies
   */
  private setupDefaultRecoveryStrategies(): void {
    // Default retry strategy
    this.recoveryStrategies.set('retry', [
      RetryStrategy.exponentialBackoff({ maxAttempts: 3, baseDelayMs: 1000 }),
      FallbackStrategy.returnDefault(null)
    ])
    
    // Database connection issues
    this.recoveryStrategies.set('database', [
      RetryStrategy.exponentialBackoff({ maxAttempts: 5, baseDelayMs: 2000 }),
      CacheStrategy.staleWhileRevalidate({ staleTime: 300000 })
    ])
  }

  /**
   * Utility methods
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private calculateStats(metrics: number[]) {
    if (metrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0, p99: 0 }
    }
    
    const sorted = [...metrics].sort((a, b) => a - b)
    const sum = metrics.reduce((a, b) => a + b, 0)
    
    return {
      count: metrics.length,
      avg: sum / metrics.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  // Cache implementation stubs - replace with actual cache implementation
  private async getFromCache<T>(key: string): Promise<{ data: T; timestamp: number } | null> {
    // Implement cache retrieval
    return null
  }

  private async setCache<T>(key: string, data: T, ttl: number, tags: string[]): Promise<void> {
    // Implement cache storage
  }

  private async refreshCacheInBackground<T>(
    cacheKey: string,
    operation: () => Promise<Result<T>>,
    ttl: number,
    tags: string[]
  ): Promise<void> {
    // Background refresh implementation
    try {
      const result = await operation()
      if (result.success) {
        await this.setCache(cacheKey, result.data, ttl, tags)
      }
    } catch (error) {
      console.warn(`Background cache refresh failed for ${cacheKey}:`, error)
    }
  }

  /**
   * Get current authenticated user with enhanced error handling
   */
  protected async getCurrentUser(): Promise<Result<any>> {
    return this.executeWithCircuitBreaker('auth', async () => {
      const startTime = Date.now()
      
      try {
        const { data: { user }, error } = await this.supabase.auth.getUser()
        
        if (error) {
          throw RepositoryError.unauthorized('Authentication failed', error.message)
        }
        if (!user) {
          throw RepositoryError.unauthorized('No authenticated user found')
        }
        
        this.recordPerformanceMetric('getCurrentUser', Date.now() - startTime)
        return user
      } catch (error) {
        this.recordPerformanceMetric('getCurrentUser', Date.now() - startTime)
        throw this.handleError(error as Error, 'getCurrentUser')
      }
    })
  }
}