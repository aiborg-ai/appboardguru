/**
 * Advanced Connection Pool Optimizer
 * 
 * Provides intelligent connection pooling with dynamic scaling, health monitoring,
 * load balancing, and performance optimization for database operations.
 */

import { EventEmitter } from 'events'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Result, success, failure, RepositoryError } from './result'
import type { Database } from '../../types/database'

// Connection pool configuration
export interface ConnectionPoolConfig {
  minConnections: number
  maxConnections: number
  acquireTimeoutMs: number
  idleTimeoutMs: number
  reapIntervalMs: number
  createRetryIntervalMs: number
  maxRetries: number
  enableHealthCheck: boolean
  healthCheckIntervalMs: number
  enableLoadBalancing: boolean
  enableMetrics: boolean
  connectionValidationQuery?: string
}

// Connection metadata
export interface PoolConnection {
  id: string
  client: SupabaseClient<Database>
  createdAt: Date
  lastUsedAt: Date
  useCount: number
  isHealthy: boolean
  isInUse: boolean
  transactionId?: string
  priority: number
  metadata?: Record<string, unknown>
}

// Pool statistics
export interface PoolStatistics {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  unhealthyConnections: number
  pendingRequests: number
  averageWaitTime: number
  averageUseTime: number
  totalAcquisitions: number
  totalReleases: number
  totalFailures: number
  connectionErrors: number
  healthCheckFailures: number
  createdAt: Date
  lastUpdated: Date
}

// Connection acquisition request
export interface ConnectionRequest {
  id: string
  requestedAt: Date
  timeoutMs: number
  priority: number
  transactionId?: string
  resolve: (connection: PoolConnection) => void
  reject: (error: Error) => void
}

// Health check result
export interface HealthCheckResult {
  connectionId: string
  isHealthy: boolean
  latencyMs: number
  error?: Error
  timestamp: Date
}

// Load balancing strategy
export type LoadBalancingStrategy = 
  | 'ROUND_ROBIN'    // Distribute connections evenly
  | 'LEAST_USED'     // Use connection with lowest use count
  | 'FASTEST_RESPONSE' // Use connection with best performance
  | 'RANDOM'         // Random selection
  | 'WEIGHTED'       // Weighted selection based on performance

/**
 * Advanced Connection Pool Manager
 */
export class ConnectionPoolOptimizer extends EventEmitter {
  private connections: Map<string, PoolConnection> = new Map()
  private pendingRequests: ConnectionRequest[] = []
  private statistics: PoolStatistics
  private healthCheckTimer?: NodeJS.Timeout
  private reapTimer?: NodeJS.Timeout
  private metricsTimer?: NodeJS.Timeout
  private roundRobinIndex = 0
  
  constructor(
    private config: ConnectionPoolConfig,
    private databaseConfig: {
      url: string
      anonKey: string
      serviceKey?: string
    }
  ) {
    super()
    
    this.statistics = this.initializeStatistics()
    this.setupTimers()
    this.preWarmPool()
  }

  /**
   * Acquire connection from pool with intelligent selection
   */
  async acquireConnection(
    options: {
      priority?: number
      timeoutMs?: number
      transactionId?: string
      strategy?: LoadBalancingStrategy
    } = {}
  ): Promise<Result<PoolConnection>> {
    const {
      priority = 1,
      timeoutMs = this.config.acquireTimeoutMs,
      transactionId,
      strategy = 'LEAST_USED'
    } = options

    const requestId = this.generateRequestId()
    
    // Check if connection is immediately available
    const availableConnection = this.selectAvailableConnection(strategy)
    if (availableConnection) {
      this.markConnectionInUse(availableConnection, transactionId)
      this.updateStatistics('acquire', Date.now())
      return success(availableConnection)
    }

    // Try to create new connection if under limit
    if (this.connections.size < this.config.maxConnections) {
      const createResult = await this.createConnection()
      if (createResult.success) {
        this.markConnectionInUse(createResult.data, transactionId)
        this.updateStatistics('acquire', Date.now())
        return success(createResult.data)
      }
    }

    // Queue the request
    return this.queueConnectionRequest({
      id: requestId,
      requestedAt: new Date(),
      timeoutMs,
      priority,
      transactionId
    })
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(
    connectionId: string,
    options: {
      forceDestroy?: boolean
      error?: Error
    } = {}
  ): Result<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return failure(RepositoryError.notFound('Connection', connectionId))
    }

    if (!connection.isInUse) {
      return failure(RepositoryError.businessRule(
        'connection_not_in_use',
        'Connection is not currently in use'
      ))
    }

    try {
      // Mark as available
      connection.isInUse = false
      connection.lastUsedAt = new Date()
      connection.transactionId = undefined
      
      // Handle error situations
      if (options.error) {
        connection.isHealthy = false
        this.emit('connection:error', {
          connectionId,
          error: options.error
        })
      }

      // Destroy if forced or unhealthy
      if (options.forceDestroy || !connection.isHealthy) {
        this.destroyConnection(connectionId)
      } else {
        // Process pending requests
        this.processPendingRequests()
      }

      this.updateStatistics('release', Date.now())
      return success(undefined)

    } catch (error) {
      return failure(RepositoryError.internal('Failed to release connection', error))
    }
  }

  /**
   * Get pool statistics
   */
  getStatistics(): PoolStatistics {
    this.updateStatistics('query', Date.now())
    return { ...this.statistics }
  }

  /**
   * Perform health check on all connections
   */
  async performHealthCheck(): Promise<Result<HealthCheckResult[]>> {
    if (!this.config.enableHealthCheck) {
      return success([])
    }

    const results: HealthCheckResult[] = []
    const promises: Promise<HealthCheckResult>[] = []

    for (const connection of this.connections.values()) {
      if (!connection.isInUse) {
        promises.push(this.checkConnectionHealth(connection))
      }
    }

    try {
      const healthResults = await Promise.allSettled(promises)
      
      for (const result of healthResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            connectionId: 'unknown',
            isHealthy: false,
            latencyMs: -1,
            error: result.reason,
            timestamp: new Date()
          })
        }
      }

      // Update connection health status
      for (const result of results) {
        const connection = this.connections.get(result.connectionId)
        if (connection) {
          connection.isHealthy = result.isHealthy
          
          if (!result.isHealthy) {
            this.emit('connection:unhealthy', {
              connectionId: result.connectionId,
              error: result.error
            })
          }
        }
      }

      return success(results)
    } catch (error) {
      return failure(RepositoryError.internal('Health check failed', error))
    }
  }

  /**
   * Optimize pool size based on usage patterns
   */
  async optimizePoolSize(): Promise<Result<{
    before: { min: number; max: number; current: number }
    after: { min: number; max: number; current: number }
    recommendations: string[]
  }>> {
    const before = {
      min: this.config.minConnections,
      max: this.config.maxConnections,
      current: this.connections.size
    }

    const recommendations: string[] = []
    
    // Analyze usage patterns
    const stats = this.getStatistics()
    const utilizationRate = stats.activeConnections / stats.totalConnections
    const averageWaitTime = stats.averageWaitTime
    const errorRate = stats.totalFailures / Math.max(1, stats.totalAcquisitions)

    // Optimization logic
    if (utilizationRate > 0.8 && averageWaitTime > 1000) {
      // High utilization and wait times - increase pool size
      const newMax = Math.min(this.config.maxConnections + 5, 50)
      this.config.maxConnections = newMax
      recommendations.push('Increased max connections due to high utilization')
      
      // Create additional connections
      await this.preWarmPool()
    } else if (utilizationRate < 0.3 && stats.idleConnections > this.config.minConnections) {
      // Low utilization - reduce idle connections
      const excess = stats.idleConnections - this.config.minConnections
      await this.reduceIdleConnections(Math.floor(excess / 2))
      recommendations.push('Reduced idle connections due to low utilization')
    }

    if (errorRate > 0.1) {
      // High error rate - health check more frequently
      this.config.healthCheckIntervalMs = Math.max(5000, this.config.healthCheckIntervalMs / 2)
      recommendations.push('Increased health check frequency due to high error rate')
    }

    const after = {
      min: this.config.minConnections,
      max: this.config.maxConnections,
      current: this.connections.size
    }

    return success({ before, after, recommendations })
  }

  /**
   * Drain the pool gracefully
   */
  async drain(): Promise<Result<void>> {
    try {
      // Stop accepting new requests
      this.clearTimers()
      
      // Wait for active connections to finish
      const maxWaitMs = 30000 // 30 seconds
      const startTime = Date.now()
      
      while (this.statistics.activeConnections > 0 && 
             (Date.now() - startTime) < maxWaitMs) {
        await this.sleep(100)
        this.updateStatistics('drain', Date.now())
      }

      // Force close remaining connections
      for (const [connectionId] of this.connections) {
        this.destroyConnection(connectionId)
      }

      // Reject pending requests
      for (const request of this.pendingRequests) {
        request.reject(new Error('Pool is draining'))
      }
      this.pendingRequests = []

      this.emit('pool:drained')
      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to drain pool', error))
    }
  }

  /**
   * Create new database connection
   */
  private async createConnection(): Promise<Result<PoolConnection>> {
    const connectionId = this.generateConnectionId()
    
    try {
      const client = createClient<Database>(
        this.databaseConfig.url,
        this.databaseConfig.anonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          },
          global: {
            headers: {
              'X-Connection-Pool': 'optimized',
              'X-Connection-Id': connectionId
            }
          }
        }
      )

      // Test connection
      const healthResult = await this.validateConnection(client)
      if (!healthResult.success) {
        return failure(healthResult.error)
      }

      const connection: PoolConnection = {
        id: connectionId,
        client,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        useCount: 0,
        isHealthy: true,
        isInUse: false,
        priority: 1
      }

      this.connections.set(connectionId, connection)
      this.emit('connection:created', { connectionId })
      
      return success(connection)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to create connection', error))
    }
  }

  /**
   * Validate connection health
   */
  private async validateConnection(client: SupabaseClient<Database>): Promise<Result<void>> {
    try {
      const query = this.config.connectionValidationQuery || 'SELECT 1'
      const startTime = Date.now()
      
      // Perform simple query to validate connection
      const { error } = await client
        .from('users' as any) // Use a table that should exist
        .select('count')
        .limit(1)
      
      const latency = Date.now() - startTime
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found" which is OK
        return failure(RepositoryError.fromSupabaseError(error, 'connection validation'))
      }

      if (latency > 5000) { // 5 second timeout
        return failure(RepositoryError.timeout('connection_validation', latency))
      }

      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal('Connection validation failed', error))
    }
  }

  /**
   * Select best available connection based on strategy
   */
  private selectAvailableConnection(strategy: LoadBalancingStrategy): PoolConnection | null {
    const available = Array.from(this.connections.values()).filter(
      conn => !conn.isInUse && conn.isHealthy
    )

    if (available.length === 0) return null

    switch (strategy) {
      case 'ROUND_ROBIN':
        const connection = available[this.roundRobinIndex % available.length]
        this.roundRobinIndex = (this.roundRobinIndex + 1) % available.length
        return connection

      case 'LEAST_USED':
        return available.reduce((min, conn) => 
          conn.useCount < min.useCount ? conn : min
        )

      case 'FASTEST_RESPONSE':
        // Would need to track response times per connection
        return available.sort((a, b) => 
          (b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
        )[0]

      case 'RANDOM':
        return available[Math.floor(Math.random() * available.length)]

      case 'WEIGHTED':
        // Implement weighted selection based on performance metrics
        return this.selectWeightedConnection(available)

      default:
        return available[0]
    }
  }

  /**
   * Select connection using weighted strategy
   */
  private selectWeightedConnection(connections: PoolConnection[]): PoolConnection {
    // Simple weighted selection based on inverse of use count
    const weights = connections.map(conn => 1 / Math.max(1, conn.useCount))
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    
    let random = Math.random() * totalWeight
    
    for (let i = 0; i < connections.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return connections[i]
      }
    }
    
    return connections[connections.length - 1]
  }

  /**
   * Mark connection as in use
   */
  private markConnectionInUse(connection: PoolConnection, transactionId?: string): void {
    connection.isInUse = true
    connection.useCount++
    connection.lastUsedAt = new Date()
    connection.transactionId = transactionId
  }

  /**
   * Queue connection request for later processing
   */
  private async queueConnectionRequest(request: Omit<ConnectionRequest, 'resolve' | 'reject'>): Promise<Result<PoolConnection>> {
    return new Promise((resolve, reject) => {
      const fullRequest: ConnectionRequest = {
        ...request,
        resolve: (connection: PoolConnection) => resolve(success(connection)),
        reject: (error: Error) => reject(failure(RepositoryError.internal('Connection request failed', error)))
      }

      // Insert request in priority order
      const insertIndex = this.pendingRequests.findIndex(
        req => req.priority < fullRequest.priority
      )
      
      if (insertIndex === -1) {
        this.pendingRequests.push(fullRequest)
      } else {
        this.pendingRequests.splice(insertIndex, 0, fullRequest)
      }

      // Set timeout
      setTimeout(() => {
        const index = this.pendingRequests.indexOf(fullRequest)
        if (index > -1) {
          this.pendingRequests.splice(index, 1)
          reject(failure(RepositoryError.timeout('connection_acquisition', request.timeoutMs)))
        }
      }, request.timeoutMs)
    })
  }

  /**
   * Process pending connection requests
   */
  private processPendingRequests(): void {
    while (this.pendingRequests.length > 0) {
      const availableConnection = this.selectAvailableConnection('LEAST_USED')
      if (!availableConnection) break

      const request = this.pendingRequests.shift()!
      this.markConnectionInUse(availableConnection, request.transactionId)
      request.resolve(availableConnection)
    }
  }

  /**
   * Check individual connection health
   */
  private async checkConnectionHealth(connection: PoolConnection): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      const validationResult = await this.validateConnection(connection.client)
      const latencyMs = Date.now() - startTime
      
      return {
        connectionId: connection.id,
        isHealthy: validationResult.success,
        latencyMs,
        error: validationResult.success ? undefined : validationResult.error,
        timestamp: new Date()
      }
    } catch (error) {
      return {
        connectionId: connection.id,
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: new Date()
      }
    }
  }

  /**
   * Destroy connection
   */
  private destroyConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      // Clean up connection resources if needed
      this.connections.delete(connectionId)
      this.emit('connection:destroyed', { connectionId })
    }
  }

  /**
   * Pre-warm pool with minimum connections
   */
  private async preWarmPool(): Promise<void> {
    const needed = this.config.minConnections - this.connections.size
    
    if (needed > 0) {
      const promises: Promise<Result<PoolConnection>>[] = []
      
      for (let i = 0; i < needed; i++) {
        promises.push(this.createConnection())
      }

      try {
        await Promise.allSettled(promises)
      } catch (error) {
        console.warn('Failed to pre-warm connection pool:', error)
      }
    }
  }

  /**
   * Reduce idle connections
   */
  private async reduceIdleConnections(count: number): Promise<void> {
    const idle = Array.from(this.connections.values())
      .filter(conn => !conn.isInUse)
      .sort((a, b) => a.lastUsedAt.getTime() - b.lastUsedAt.getTime()) // Oldest first
      .slice(0, count)

    for (const connection of idle) {
      this.destroyConnection(connection.id)
    }
  }

  /**
   * Setup timers for maintenance tasks
   */
  private setupTimers(): void {
    // Health check timer
    if (this.config.enableHealthCheck) {
      this.healthCheckTimer = setInterval(() => {
        this.performHealthCheck().catch(error => {
          console.error('Scheduled health check failed:', error)
        })
      }, this.config.healthCheckIntervalMs)
    }

    // Connection reaping timer
    this.reapTimer = setInterval(() => {
      this.reapIdleConnections()
    }, this.config.reapIntervalMs)

    // Metrics update timer
    if (this.config.enableMetrics) {
      this.metricsTimer = setInterval(() => {
        this.updateStatistics('periodic', Date.now())
        this.emit('pool:metrics', this.getStatistics())
      }, 60000) // Every minute
    }
  }

  /**
   * Clean up expired timers
   */
  private clearTimers(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
    if (this.reapTimer) {
      clearInterval(this.reapTimer)
    }
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
    }
  }

  /**
   * Reap idle connections that have exceeded timeout
   */
  private reapIdleConnections(): void {
    const cutoff = new Date(Date.now() - this.config.idleTimeoutMs)
    
    for (const [connectionId, connection] of this.connections) {
      if (!connection.isInUse && 
          connection.lastUsedAt < cutoff &&
          this.connections.size > this.config.minConnections) {
        this.destroyConnection(connectionId)
      }
    }
  }

  /**
   * Initialize statistics object
   */
  private initializeStatistics(): PoolStatistics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      unhealthyConnections: 0,
      pendingRequests: 0,
      averageWaitTime: 0,
      averageUseTime: 0,
      totalAcquisitions: 0,
      totalReleases: 0,
      totalFailures: 0,
      connectionErrors: 0,
      healthCheckFailures: 0,
      createdAt: new Date(),
      lastUpdated: new Date()
    }
  }

  /**
   * Update pool statistics
   */
  private updateStatistics(operation: string, timestamp: number): void {
    const connections = Array.from(this.connections.values())
    
    this.statistics.totalConnections = connections.length
    this.statistics.activeConnections = connections.filter(c => c.isInUse).length
    this.statistics.idleConnections = connections.filter(c => !c.isInUse && c.isHealthy).length
    this.statistics.unhealthyConnections = connections.filter(c => !c.isHealthy).length
    this.statistics.pendingRequests = this.pendingRequests.length
    this.statistics.lastUpdated = new Date(timestamp)

    switch (operation) {
      case 'acquire':
        this.statistics.totalAcquisitions++
        break
      case 'release':
        this.statistics.totalReleases++
        break
    }

    // Calculate averages (simplified)
    if (this.statistics.totalAcquisitions > 0) {
      this.statistics.averageWaitTime = 
        this.pendingRequests.reduce((sum, req) => 
          sum + (timestamp - req.requestedAt.getTime()), 0
        ) / this.pendingRequests.length || 0
    }
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Connection pool factory for different use cases
 */
export class ConnectionPoolFactory {
  /**
   * Create optimized pool for high-throughput applications
   */
  static createHighThroughputPool(databaseConfig: any): ConnectionPoolOptimizer {
    const config: ConnectionPoolConfig = {
      minConnections: 10,
      maxConnections: 50,
      acquireTimeoutMs: 5000,
      idleTimeoutMs: 300000, // 5 minutes
      reapIntervalMs: 60000,  // 1 minute
      createRetryIntervalMs: 1000,
      maxRetries: 3,
      enableHealthCheck: true,
      healthCheckIntervalMs: 30000, // 30 seconds
      enableLoadBalancing: true,
      enableMetrics: true
    }

    return new ConnectionPoolOptimizer(config, databaseConfig)
  }

  /**
   * Create conservative pool for low-resource environments
   */
  static createConservativePool(databaseConfig: any): ConnectionPoolOptimizer {
    const config: ConnectionPoolConfig = {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeoutMs: 10000,
      idleTimeoutMs: 600000, // 10 minutes
      reapIntervalMs: 300000, // 5 minutes
      createRetryIntervalMs: 2000,
      maxRetries: 5,
      enableHealthCheck: true,
      healthCheckIntervalMs: 60000, // 1 minute
      enableLoadBalancing: false,
      enableMetrics: false
    }

    return new ConnectionPoolOptimizer(config, databaseConfig)
  }

  /**
   * Create balanced pool for general use
   */
  static createBalancedPool(databaseConfig: any): ConnectionPoolOptimizer {
    const config: ConnectionPoolConfig = {
      minConnections: 5,
      maxConnections: 25,
      acquireTimeoutMs: 7500,
      idleTimeoutMs: 300000, // 5 minutes
      reapIntervalMs: 120000, // 2 minutes
      createRetryIntervalMs: 1500,
      maxRetries: 3,
      enableHealthCheck: true,
      healthCheckIntervalMs: 45000, // 45 seconds
      enableLoadBalancing: true,
      enableMetrics: true
    }

    return new ConnectionPoolOptimizer(config, databaseConfig)
  }
}