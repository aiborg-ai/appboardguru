/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by monitoring service health and providing fail-fast behavior
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if service has recovered
 */

export interface CircuitBreakerConfig {
  failureThreshold: number        // Number of failures to trigger open state
  resetTimeout: number           // Time to wait before attempting recovery (ms)
  monitoringPeriod: number       // Time window for failure counting (ms)
  successThreshold?: number      // Successes needed in half-open to close (default: 1)
  timeout?: number              // Request timeout (ms)
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState
  failures: number
  successes: number
  requests: number
  lastFailureTime: number | null
  lastSuccessTime: number | null
  nextAttempt: number | null
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failures: number = 0
  private successes: number = 0
  private requests: number = 0
  private lastFailureTime: number | null = null
  private lastSuccessTime: number | null = null
  private nextAttempt: number | null = null
  private config: Required<CircuitBreakerConfig>

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      successThreshold: 1,
      timeout: 30000,
      ...config
    }
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const currentState = this.getState()
    
    switch (currentState) {
      case CircuitBreakerState.OPEN:
        throw new CircuitBreakerOpenError('Circuit breaker is OPEN')
      
      case CircuitBreakerState.HALF_OPEN:
        return this.executeInHalfOpen(operation)
      
      case CircuitBreakerState.CLOSED:
      default:
        return this.executeInClosed(operation)
    }
  }

  private async executeInClosed<T>(operation: () => Promise<T>): Promise<T> {
    try {
      const result = await this.executeWithTimeout(operation)
      this.recordSuccess()
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }

  private async executeInHalfOpen<T>(operation: () => Promise<T>): Promise<T> {
    try {
      const result = await this.executeWithTimeout(operation)
      this.recordSuccess()
      
      // Check if we have enough successes to close the circuit
      if (this.successes >= this.config.successThreshold) {
        this.closeCircuit()
      }
      
      return result
    } catch (error) {
      this.recordFailure()
      this.openCircuit()
      throw error
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      // Note: This is a simplified timeout implementation
      // In a real-world scenario, you'd want to pass the abort signal to the operation
      const result = await operation()
      clearTimeout(timeoutId)
      return result
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private recordSuccess(): void {
    this.successes++
    this.requests++
    this.lastSuccessTime = Date.now()
    
    // Clear old failures that are outside the monitoring period
    this.clearOldFailures()
  }

  private recordFailure(): void {
    this.failures++
    this.requests++
    this.lastFailureTime = Date.now()
    
    // Check if we should open the circuit
    if (this.state === CircuitBreakerState.CLOSED && 
        this.failures >= this.config.failureThreshold) {
      this.openCircuit()
    }
  }

  private openCircuit(): void {
    this.state = CircuitBreakerState.OPEN
    this.nextAttempt = Date.now() + this.config.resetTimeout
    this.successes = 0 // Reset successes when opening
    
    console.warn(`Circuit breaker opened due to ${this.failures} failures`)
  }

  private closeCircuit(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failures = 0
    this.successes = 0
    this.nextAttempt = null
    
    console.info('Circuit breaker closed - service recovered')
  }

  private halfOpenCircuit(): void {
    this.state = CircuitBreakerState.HALF_OPEN
    this.nextAttempt = null
    this.successes = 0 // Reset successes when entering half-open
    
    console.info('Circuit breaker half-open - testing service recovery')
  }

  private clearOldFailures(): void {
    const now = Date.now()
    const cutoff = now - this.config.monitoringPeriod
    
    if (this.lastFailureTime && this.lastFailureTime < cutoff) {
      this.failures = 0
      this.lastFailureTime = null
    }
  }

  private getState(): CircuitBreakerState {
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if we should transition to half-open
      const now = Date.now()
      if (this.nextAttempt && now >= this.nextAttempt) {
        this.halfOpenCircuit()
        return CircuitBreakerState.HALF_OPEN
      }
    }
    
    return this.state
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen(): boolean {
    return this.getState() === CircuitBreakerState.OPEN
  }

  /**
   * Check if circuit breaker is closed
   */
  isClosed(): boolean {
    return this.getState() === CircuitBreakerState.CLOSED
  }

  /**
   * Check if circuit breaker is half-open
   */
  isHalfOpen(): boolean {
    return this.getState() === CircuitBreakerState.HALF_OPEN
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(): void {
    this.openCircuit()
  }

  /**
   * Force circuit breaker to closed state
   */
  forceClose(): void {
    this.closeCircuit()
  }

  /**
   * Reset circuit breaker statistics
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failures = 0
    this.successes = 0
    this.requests = 0
    this.lastFailureTime = null
    this.lastSuccessTime = null
    this.nextAttempt = null
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      requests: this.requests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttempt: this.nextAttempt
    }
  }

  /**
   * Get failure rate (0-1)
   */
  getFailureRate(): number {
    if (this.requests === 0) return 0
    return this.failures / this.requests
  }

  /**
   * Get success rate (0-1)
   */
  getSuccessRate(): number {
    if (this.requests === 0) return 0
    return this.successes / this.requests
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    const state = this.getState()
    
    if (state === CircuitBreakerState.OPEN) {
      return false
    }
    
    if (state === CircuitBreakerState.HALF_OPEN) {
      return false // Consider half-open as unhealthy for conservative health checks
    }
    
    // For closed state, check failure rate
    const failureRate = this.getFailureRate()
    return failureRate < (this.config.failureThreshold / Math.max(this.requests, this.config.failureThreshold))
  }

  /**
   * Get time until next attempt (for open state)
   */
  getTimeUntilNextAttempt(): number {
    if (this.state !== CircuitBreakerState.OPEN || !this.nextAttempt) {
      return 0
    }
    
    return Math.max(0, this.nextAttempt - Date.now())
  }

  /**
   * Create a circuit breaker wrapper for a function
   */
  static wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    config: CircuitBreakerConfig
  ): T & { circuitBreaker: CircuitBreaker } {
    const breaker = new CircuitBreaker(config)
    
    const wrapped = (async (...args: Parameters<T>) => {
      return await breaker.execute(() => fn(...args))
    }) as T & { circuitBreaker: CircuitBreaker }
    
    wrapped.circuitBreaker = breaker
    
    return wrapped
  }

  /**
   * Create multiple circuit breakers for different services
   */
  static createMultiple(configs: Record<string, CircuitBreakerConfig>): Record<string, CircuitBreaker> {
    const breakers: Record<string, CircuitBreaker> = {}
    
    for (const [name, config] of Object.entries(configs)) {
      breakers[name] = new CircuitBreaker(config)
    }
    
    return breakers
  }
}

/**
 * Custom error for circuit breaker open state
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CircuitBreakerOpenError'
  }
}

/**
 * Circuit breaker monitor for health checks and metrics
 */
export class CircuitBreakerMonitor {
  private breakers: Map<string, CircuitBreaker> = new Map()
  private metricsInterval: NodeJS.Timeout | null = null

  constructor(private onMetrics?: (metrics: Record<string, CircuitBreakerStats>) => void) {}

  /**
   * Register a circuit breaker for monitoring
   */
  register(name: string, breaker: CircuitBreaker): void {
    this.breakers.set(name, breaker)
  }

  /**
   * Unregister a circuit breaker
   */
  unregister(name: string): void {
    this.breakers.delete(name)
  }

  /**
   * Start metrics collection
   */
  startMetrics(intervalMs: number = 30000): void {
    if (this.metricsInterval) {
      this.stopMetrics()
    }

    this.metricsInterval = setInterval(() => {
      const metrics: Record<string, CircuitBreakerStats> = {}
      
      for (const [name, breaker] of this.breakers.entries()) {
        metrics[name] = breaker.getStats()
      }
      
      if (this.onMetrics) {
        this.onMetrics(metrics)
      }
    }, intervalMs)
  }

  /**
   * Stop metrics collection
   */
  stopMetrics(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {}
    
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats()
    }
    
    return stats
  }

  /**
   * Get health status of all circuit breakers
   */
  getHealthStatus(): Record<string, boolean> {
    const health: Record<string, boolean> = {}
    
    for (const [name, breaker] of this.breakers.entries()) {
      health[name] = breaker.isHealthy()
    }
    
    return health
  }

  /**
   * Force open all circuit breakers (emergency stop)
   */
  forceOpenAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.forceOpen()
    }
    
    console.warn('All circuit breakers forced open')
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset()
    }
    
    console.info('All circuit breakers reset')
  }
}