/**
 * Error Recovery Strategies
 * Implements retry logic and error recovery patterns
 */

import { BaseError, EnhancedBaseError } from './base'
import { ExternalServiceError, DatabaseError, ServiceUnavailableError, RateLimitError } from './types'

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterMs?: number
  shouldRetry?: (error: Error, attempt: number) => boolean
}

/**
 * Default retry configurations for different error types
 */
export const DEFAULT_RETRY_CONFIGS: Record<string, RetryConfig> = {
  database: {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitterMs: 50,
    shouldRetry: (error) => error instanceof DatabaseError && error.isRetryable()
  },
  externalService: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMs: 200,
    shouldRetry: (error) => error instanceof ExternalServiceError && error.isRetryable()
  },
  rateLimit: {
    maxAttempts: 2,
    baseDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 1,
    shouldRetry: (error) => {
      if (error instanceof RateLimitError) {
        return error.retryAfter < 60 // Only retry if retry-after is less than 60 seconds
      }
      return false
    }
  },
  serviceUnavailable: {
    maxAttempts: 2,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    backoffMultiplier: 1.5,
    shouldRetry: (error) => error instanceof ServiceUnavailableError && error.isRetryable()
  }
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeoutMs: number
  monitoringWindowMs: number
  halfOpenMaxCalls: number
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state = CircuitBreakerState.CLOSED
  private failureCount = 0
  private lastFailureTime = 0
  private halfOpenCalls = 0
  private windowStart = Date.now()
  private windowFailures = 0

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeoutMs) {
        throw new ServiceUnavailableError(
          this.name,
          `Circuit breaker is OPEN for ${this.name}`
        )
      }
      this.state = CircuitBreakerState.HALF_OPEN
      this.halfOpenCalls = 0
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new ServiceUnavailableError(
          this.name,
          `Circuit breaker is HALF_OPEN and max calls exceeded for ${this.name}`
        )
      }
      this.halfOpenCalls++
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED
      this.failureCount = 0
    }
    this.resetWindow()
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    // Track failures in current window
    if (Date.now() - this.windowStart > this.config.monitoringWindowMs) {
      this.windowStart = Date.now()
      this.windowFailures = 0
    }
    this.windowFailures++

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN
    } else if (this.windowFailures >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN
    }
  }

  private resetWindow(): void {
    if (Date.now() - this.windowStart > this.config.monitoringWindowMs) {
      this.windowStart = Date.now()
      this.windowFailures = 0
    }
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      windowFailures: this.windowFailures,
      lastFailureTime: this.lastFailureTime,
      halfOpenCalls: this.halfOpenCalls
    }
  }
}

/**
 * Global circuit breaker registry
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>()

  get(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeoutMs: 30000,
        monitoringWindowMs: 60000,
        halfOpenMaxCalls: 3,
        ...config
      }
      this.breakers.set(name, new CircuitBreaker(name, defaultConfig))
    }
    return this.breakers.get(name)!
  }

  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers)
  }

  remove(name: string): boolean {
    return this.breakers.delete(name)
  }

  clear(): void {
    this.breakers.clear()
  }
}

export const circuitBreakers = new CircuitBreakerRegistry()

/**
 * Retry with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  operationName?: string
): Promise<T> {
  let lastError: Error
  let attempt = 0

  while (attempt < config.maxAttempts) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      attempt++

      // Check if we should retry
      if (config.shouldRetry && !config.shouldRetry(lastError, attempt)) {
        break
      }

      // Don't wait after the last attempt
      if (attempt >= config.maxAttempts) {
        break
      }

      // Calculate delay with exponential backoff and jitter
      let delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      )

      if (config.jitterMs) {
        delay += Math.random() * config.jitterMs
      }

      // Special handling for rate limit errors
      if (lastError instanceof RateLimitError) {
        delay = Math.max(delay, lastError.retryAfter * 1000)
      }

      await sleep(delay)
    }
  }

  // Wrap the error with retry information
  if (lastError instanceof EnhancedBaseError) {
    lastError.withContext({
      retryAttempts: attempt,
      maxAttempts: config.maxAttempts,
      operationName
    })
  }

  throw lastError
}

/**
 * Retry with circuit breaker
 */
export async function retryWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  serviceName: string,
  retryConfig?: Partial<RetryConfig>,
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>
): Promise<T> {
  const breaker = circuitBreakers.get(serviceName, circuitBreakerConfig)
  const config = { ...DEFAULT_RETRY_CONFIGS.externalService, ...retryConfig }

  return breaker.execute(async () => {
    return retry(operation, config, serviceName)
  })
}

/**
 * Bulk operation with partial failure handling
 */
export interface BulkOperationResult<T, E = Error> {
  successes: Array<{ index: number; result: T }>
  failures: Array<{ index: number; error: E }>
  totalCount: number
  successCount: number
  failureCount: number
}

export async function executeBulkOperation<T, I>(
  items: I[],
  operation: (item: I, index: number) => Promise<T>,
  options: {
    concurrency?: number
    continueOnFailure?: boolean
    retryConfig?: RetryConfig
  } = {}
): Promise<BulkOperationResult<T>> {
  const {
    concurrency = 5,
    continueOnFailure = true,
    retryConfig
  } = options

  const results: BulkOperationResult<T> = {
    successes: [],
    failures: [],
    totalCount: items.length,
    successCount: 0,
    failureCount: 0
  }

  // Process items in batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchPromises = batch.map(async (item, batchIndex) => {
      const itemIndex = i + batchIndex
      try {
        const operationWithRetry = retryConfig
          ? () => retry(() => operation(item, itemIndex), retryConfig)
          : () => operation(item, itemIndex)

        const result = await operationWithRetry()
        results.successes.push({ index: itemIndex, result })
        results.successCount++
      } catch (error) {
        results.failures.push({ index: itemIndex, error: error as Error })
        results.failureCount++

        if (!continueOnFailure) {
          throw error
        }
      }
    })

    await Promise.all(batchPromises)
  }

  return results
}

/**
 * Graceful degradation wrapper
 */
export async function withGracefulDegradation<T, F>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<F>,
  options: {
    timeout?: number
    shouldUseFallback?: (error: Error) => boolean
  } = {}
): Promise<T | F> {
  const { timeout = 5000, shouldUseFallback } = options

  try {
    if (timeout > 0) {
      return await Promise.race([
        primaryOperation(),
        sleep(timeout).then(() => {
          throw new Error('Operation timed out')
        })
      ])
    }
    return await primaryOperation()
  } catch (error) {
    if (shouldUseFallback && !shouldUseFallback(error as Error)) {
      throw error
    }
    
    console.warn('Primary operation failed, using fallback:', error)
    return await fallbackOperation()
  }
}

/**
 * Health check with recovery
 */
export class HealthCheck {
  private isHealthy = true
  private lastCheck = 0
  private consecutiveFailures = 0

  constructor(
    private name: string,
    private checkFunction: () => Promise<boolean>,
    private config: {
      intervalMs: number
      timeoutMs: number
      failureThreshold: number
    } = {
      intervalMs: 30000,
      timeoutMs: 5000,
      failureThreshold: 3
    }
  ) {}

  async check(): Promise<boolean> {
    const now = Date.now()
    if (now - this.lastCheck < this.config.intervalMs) {
      return this.isHealthy
    }

    try {
      const checkPromise = this.checkFunction()
      const timeoutPromise = sleep(this.config.timeoutMs).then(() => false)
      
      const result = await Promise.race([checkPromise, timeoutPromise])
      
      if (result) {
        this.isHealthy = true
        this.consecutiveFailures = 0
      } else {
        this.consecutiveFailures++
        if (this.consecutiveFailures >= this.config.failureThreshold) {
          this.isHealthy = false
        }
      }
    } catch (error) {
      this.consecutiveFailures++
      if (this.consecutiveFailures >= this.config.failureThreshold) {
        this.isHealthy = false
      }
    }

    this.lastCheck = now
    return this.isHealthy
  }

  getStatus() {
    return {
      name: this.name,
      isHealthy: this.isHealthy,
      consecutiveFailures: this.consecutiveFailures,
      lastCheck: this.lastCheck
    }
  }
}

/**
 * Utility function for sleeping
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}