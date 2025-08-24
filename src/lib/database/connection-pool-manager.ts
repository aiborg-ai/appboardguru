/**
 * Advanced Database Connection Pool Manager
 * - Dynamic connection pooling with load balancing
 * - Query performance monitoring and optimization
 * - Connection health monitoring and automatic recovery
 * - Read/write replica support with intelligent routing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { logger } from '../logging/advanced-logger'
import { errorHandler, EnhancedError } from '../error-handling/advanced-error-handler'

// Pool configuration interfaces
export interface ConnectionPoolConfig {
  primary: DatabaseConfig
  replicas?: DatabaseConfig[]
  poolSettings: {
    min: number
    max: number
    acquireTimeoutMillis: number
    createTimeoutMillis: number
    destroyTimeoutMillis: number
    idleTimeoutMillis: number
    reapIntervalMillis: number
    createRetryIntervalMillis: number
    propagateCreateError: boolean
  }
  healthCheck: {
    enabled: boolean
    intervalMs: number
    timeoutMs: number
    retryCount: number
  }
  queryOptimization: {
    enabled: boolean
    slowQueryThresholdMs: number
    explainAnalyzeThreshold: number
    cacheSize: number
  }
  loadBalancing: {
    strategy: 'round-robin' | 'least-connections' | 'weighted' | 'response-time'
    weights?: Record<string, number>
  }
  monitoring: {
    enabled: boolean
    metricsIntervalMs: number
    alertThresholds: {
      connectionUsage: number
      queryLatency: number
      errorRate: number
    }
  }
}

export interface DatabaseConfig {
  id: string
  url: string
  key: string
  role: 'primary' | 'replica'
  region?: string
  weight?: number
  maxConnections?: number
  priority?: number
}

export interface ConnectionMetrics {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingConnections: number
  connectionErrors: number
  avgConnectionTime: number
  avgQueryTime: number
  queryCount: number
  errorRate: number
  lastHealthCheck: number
  isHealthy: boolean
}

export interface QueryMetrics {
  queryId: string
  sql: string
  duration: number
  timestamp: number
  connectionId: string
  cached: boolean
  rowCount?: number
  error?: string
}

export interface PoolConnection {
  id: string
  client: SupabaseClient<Database>
  config: DatabaseConfig
  isActive: boolean
  createdAt: number
  lastUsed: number
  queryCount: number
  errorCount: number
  avgResponseTime: number
}

/**
 * Advanced Connection Pool Manager
 */
export class ConnectionPoolManager {
  private static instance: ConnectionPoolManager
  private config: ConnectionPoolConfig
  private connections = new Map<string, PoolConnection>()
  private activeQueries = new Map<string, QueryMetrics>()
  private metrics = new Map<string, ConnectionMetrics>()
  private queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>()
  private healthCheckTimer?: NodeJS.Timeout
  private metricsTimer?: NodeJS.Timeout
  private connectionIndex = 0
  private isInitialized = false

  private constructor(config: ConnectionPoolConfig) {
    this.config = config
    this.setupEventHandlers()
  }

  public static getInstance(config?: ConnectionPoolConfig): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance && config) {
      ConnectionPoolManager.instance = new ConnectionPoolManager(config)
    }
    return ConnectionPoolManager.instance
  }

  /**
   * Initialize the connection pool
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    logger.info('Initializing connection pool', {
      component: 'ConnectionPoolManager',
      operation: 'initialize'
    })

    try {
      // Create initial connections for primary database
      await this.createInitialConnections(this.config.primary)

      // Create connections for replicas
      if (this.config.replicas) {
        for (const replica of this.config.replicas) {
          await this.createInitialConnections(replica)
        }
      }

      // Start health checks
      if (this.config.healthCheck.enabled) {
        this.startHealthChecks()
      }

      // Start metrics collection
      if (this.config.monitoring.enabled) {
        this.startMetricsCollection()
      }

      this.isInitialized = true
      
      logger.info('Connection pool initialized successfully', {
        component: 'ConnectionPoolManager',
        totalConnections: this.connections.size
      })

    } catch (error) {
      const poolError = new EnhancedError(
        'Failed to initialize connection pool',
        'POOL_INIT_FAILED',
        'system',
        {
          severity: 'critical',
          context: { component: 'ConnectionPoolManager' },
          originalError: error as Error
        }
      )
      
      await errorHandler.handleError(poolError)
      throw poolError
    }
  }

  /**
   * Get connection for query execution
   */
  public async getConnection(options: {
    readonly?: boolean
    preferredRegion?: string
    timeout?: number
  } = {}): Promise<PoolConnection> {
    const { readonly = false, preferredRegion, timeout = 5000 } = options
    
    const startTime = Date.now()
    
    try {
      // Apply load balancing strategy
      const connection = await this.selectConnection(readonly, preferredRegion)
      
      if (!connection) {
        throw new EnhancedError(
          'No available connections in pool',
          'NO_AVAILABLE_CONNECTIONS',
          'system',
          {
            severity: 'high',
            context: {
              component: 'ConnectionPoolManager',
              readonly,
              preferredRegion,
              poolSize: this.connections.size
            }
          }
        )
      }

      // Update connection metrics
      connection.lastUsed = Date.now()
      connection.isActive = true

      const acquisitionTime = Date.now() - startTime
      
      logger.debug('Connection acquired', {
        component: 'ConnectionPoolManager',
        connectionId: connection.id,
        acquisitionTime,
        readonly
      })

      return connection
      
    } catch (error) {
      const acquisitionTime = Date.now() - startTime
      
      logger.error('Failed to acquire connection', error as Error, {
        component: 'ConnectionPoolManager',
        acquisitionTime,
        readonly,
        preferredRegion
      })
      
      throw error
    }
  }

  /**
   * Release connection back to pool
   */
  public releaseConnection(connection: PoolConnection): void {
    connection.isActive = false
    connection.lastUsed = Date.now()
    
    logger.debug('Connection released', {
      component: 'ConnectionPoolManager',
      connectionId: connection.id
    })
  }

  /**
   * Execute query with connection pooling and monitoring
   */
  public async executeQuery<T>(
    query: string,
    params: any[] = [],
    options: {
      readonly?: boolean
      cached?: boolean
      cacheTtl?: number
      timeout?: number
      retries?: number
    } = {}
  ): Promise<T> {
    const {
      readonly = false,
      cached = false,
      cacheTtl = 300000, // 5 minutes
      timeout = 30000,
      retries = 2
    } = options

    const queryId = this.generateQueryId(query, params)
    const startTime = Date.now()

    // Check cache first
    if (cached) {
      const cachedResult = this.getFromCache<T>(queryId)
      if (cachedResult) {
        logger.debug('Query served from cache', {
          component: 'ConnectionPoolManager',
          queryId,
          cached: true
        })
        return cachedResult
      }
    }

    let connection: PoolConnection | null = null
    let lastError: Error | null = null

    // Retry logic
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        connection = await this.getConnection({ readonly, timeout })
        
        // Execute query
        const result = await this.executeQueryOnConnection<T>(
          connection,
          query,
          params,
          queryId,
          timeout
        )

        // Cache result if requested
        if (cached && result) {
          this.setCache(queryId, result, cacheTtl)
        }

        const duration = Date.now() - startTime
        
        // Log slow queries
        if (duration > this.config.queryOptimization.slowQueryThresholdMs) {
          logger.warn('Slow query detected', {
            component: 'ConnectionPoolManager',
            queryId,
            duration,
            query: query.substring(0, 100),
            attempt
          })
        }

        // Update connection metrics
        this.updateConnectionMetrics(connection, duration, true)
        
        return result

      } catch (error) {
        lastError = error as Error
        
        if (connection) {
          this.updateConnectionMetrics(connection, Date.now() - startTime, false)
        }

        logger.warn(`Query attempt ${attempt} failed`, {
          component: 'ConnectionPoolManager',
          queryId,
          error: (error as Error).message,
          attempt,
          maxAttempts: retries + 1
        })

        // Don't retry validation errors
        if ((error as any).code?.startsWith('23')) {
          break
        }

        // Exponential backoff for retries
        if (attempt <= retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000))
        }
      } finally {
        if (connection) {
          this.releaseConnection(connection)
        }
      }
    }

    // All retries failed
    const queryError = new EnhancedError(
      `Query failed after ${retries + 1} attempts`,
      'QUERY_EXECUTION_FAILED',
      'operational',
      {
        severity: 'medium',
        context: {
          component: 'ConnectionPoolManager',
          queryId,
          duration: Date.now() - startTime,
          retries
        },
        originalError: lastError || undefined
      }
    )

    await errorHandler.handleError(queryError)
    throw queryError
  }

  /**
   * Execute query with transaction support
   */
  public async executeTransaction<T>(
    operations: Array<{
      query: string
      params?: any[]
    }>,
    options: {
      isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE'
      timeout?: number
    } = {}
  ): Promise<T[]> {
    const { isolationLevel = 'READ_COMMITTED', timeout = 60000 } = options
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    let connection: PoolConnection | null = null

    try {
      connection = await this.getConnection({ readonly: false, timeout })
      
      logger.info('Transaction started', {
        component: 'ConnectionPoolManager',
        transactionId,
        operations: operations.length,
        isolationLevel
      })

      // Begin transaction
      await this.executeQueryOnConnection(
        connection,
        'BEGIN',
        [],
        `${transactionId}_begin`,
        timeout
      )

      // Set isolation level
      await this.executeQueryOnConnection(
        connection,
        `SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`,
        [],
        `${transactionId}_isolation`,
        timeout
      )

      // Execute all operations
      const results: T[] = []
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i]
        const result = await this.executeQueryOnConnection<T>(
          connection,
          operation.query,
          operation.params || [],
          `${transactionId}_op_${i}`,
          timeout
        )
        results.push(result)
      }

      // Commit transaction
      await this.executeQueryOnConnection(
        connection,
        'COMMIT',
        [],
        `${transactionId}_commit`,
        timeout
      )

      const duration = Date.now() - startTime
      
      logger.info('Transaction completed successfully', {
        component: 'ConnectionPoolManager',
        transactionId,
        duration,
        operations: operations.length
      })

      return results

    } catch (error) {
      // Rollback transaction
      if (connection) {
        try {
          await this.executeQueryOnConnection(
            connection,
            'ROLLBACK',
            [],
            `${transactionId}_rollback`,
            5000
          )
        } catch (rollbackError) {
          logger.error('Transaction rollback failed', rollbackError as Error, {
            component: 'ConnectionPoolManager',
            transactionId
          })
        }
      }

      const duration = Date.now() - startTime
      
      logger.error('Transaction failed', error as Error, {
        component: 'ConnectionPoolManager',
        transactionId,
        duration,
        operations: operations.length
      })

      const transactionError = new EnhancedError(
        'Transaction execution failed',
        'TRANSACTION_FAILED',
        'operational',
        {
          context: {
            component: 'ConnectionPoolManager',
            transactionId,
            duration,
            operations: operations.length
          },
          originalError: error as Error
        }
      )

      await errorHandler.handleError(transactionError)
      throw transactionError

    } finally {
      if (connection) {
        this.releaseConnection(connection)
      }
    }
  }

  /**
   * Get pool statistics and health metrics
   */
  public getPoolMetrics(): {
    connections: Record<string, ConnectionMetrics>
    pool: {
      totalConnections: number
      activeConnections: number
      idleConnections: number
      healthyConnections: number
    }
    queries: {
      total: number
      active: number
      cached: number
      avgDuration: number
    }
    cache: {
      size: number
      hitRate: number
      memoryUsage: number
    }
  } {
    const totalConnections = this.connections.size
    const activeConnections = Array.from(this.connections.values()).filter(c => c.isActive).length
    const healthyConnections = Array.from(this.metrics.values()).filter(m => m.isHealthy).length

    const totalQueries = Array.from(this.connections.values()).reduce((sum, c) => sum + c.queryCount, 0)
    const avgDuration = Array.from(this.connections.values())
      .reduce((sum, c) => sum + c.avgResponseTime, 0) / totalConnections

    return {
      connections: Object.fromEntries(this.metrics.entries()),
      pool: {
        totalConnections,
        activeConnections,
        idleConnections: totalConnections - activeConnections,
        healthyConnections
      },
      queries: {
        total: totalQueries,
        active: this.activeQueries.size,
        cached: this.queryCache.size,
        avgDuration
      },
      cache: {
        size: this.queryCache.size,
        hitRate: this.calculateCacheHitRate(),
        memoryUsage: this.estimateCacheMemoryUsage()
      }
    }
  }

  /**
   * Shutdown the connection pool gracefully
   */
  public async shutdown(timeoutMs: number = 10000): Promise<void> {
    logger.info('Shutting down connection pool', {
      component: 'ConnectionPoolManager',
      connections: this.connections.size
    })

    // Stop timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
    }

    // Wait for active queries to complete
    const shutdownStart = Date.now()
    while (this.activeQueries.size > 0 && (Date.now() - shutdownStart) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Force close remaining active queries
    if (this.activeQueries.size > 0) {
      logger.warn('Forcing shutdown with active queries', {
        component: 'ConnectionPoolManager',
        activeQueries: this.activeQueries.size
      })
    }

    // Clear all data
    this.connections.clear()
    this.metrics.clear()
    this.activeQueries.clear()
    this.queryCache.clear()

    this.isInitialized = false
    
    logger.info('Connection pool shutdown completed')
  }

  // Private methods
  private async createInitialConnections(config: DatabaseConfig): Promise<void> {
    const connectionCount = Math.max(this.config.poolSettings.min, 1)
    
    for (let i = 0; i < connectionCount; i++) {
      await this.createConnection(config)
    }
  }

  private async createConnection(config: DatabaseConfig): Promise<PoolConnection> {
    const connectionId = `${config.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      const client = createClient<Database>(config.url, config.key, {
        auth: {
          persistSession: false
        },
        db: {
          schema: 'public'
        },
        global: {
          fetch: (...args) => fetch(...args)
        }
      })

      const connection: PoolConnection = {
        id: connectionId,
        client,
        config,
        isActive: false,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        queryCount: 0,
        errorCount: 0,
        avgResponseTime: 0
      }

      this.connections.set(connectionId, connection)
      
      // Initialize metrics
      this.metrics.set(connectionId, {
        totalConnections: 1,
        activeConnections: 0,
        idleConnections: 1,
        waitingConnections: 0,
        connectionErrors: 0,
        avgConnectionTime: 0,
        avgQueryTime: 0,
        queryCount: 0,
        errorRate: 0,
        lastHealthCheck: Date.now(),
        isHealthy: true
      })

      logger.debug('Database connection created', {
        component: 'ConnectionPoolManager',
        connectionId,
        databaseId: config.id,
        role: config.role
      })

      return connection

    } catch (error) {
      const connectionError = new EnhancedError(
        `Failed to create database connection: ${config.id}`,
        'CONNECTION_CREATE_FAILED',
        'system',
        {
          context: { databaseId: config.id, role: config.role },
          originalError: error as Error
        }
      )

      await errorHandler.handleError(connectionError)
      throw connectionError
    }
  }

  private async selectConnection(readonly: boolean, preferredRegion?: string): Promise<PoolConnection | null> {
    const availableConnections = Array.from(this.connections.values()).filter(connection => {
      // Filter by read/write requirement
      if (readonly && connection.config.role === 'primary') {
        // For read-only, prefer replicas but allow primary as fallback
        const hasReplicas = Array.from(this.connections.values()).some(c => c.config.role === 'replica')
        if (hasReplicas) return false
      }
      
      // Filter by region preference
      if (preferredRegion && connection.config.region !== preferredRegion) {
        return false
      }
      
      // Filter by health status
      const metrics = this.metrics.get(connection.id)
      return metrics?.isHealthy !== false
    })

    if (availableConnections.length === 0) {
      return null
    }

    // Apply load balancing strategy
    switch (this.config.loadBalancing.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(availableConnections)
      
      case 'least-connections':
        return this.selectLeastConnections(availableConnections)
      
      case 'weighted':
        return this.selectWeighted(availableConnections)
      
      case 'response-time':
        return this.selectByResponseTime(availableConnections)
      
      default:
        return availableConnections[0]
    }
  }

  private selectRoundRobin(connections: PoolConnection[]): PoolConnection {
    const connection = connections[this.connectionIndex % connections.length]
    this.connectionIndex++
    return connection
  }

  private selectLeastConnections(connections: PoolConnection[]): PoolConnection {
    return connections.reduce((min, current) => {
      const minMetrics = this.metrics.get(min.id)!
      const currentMetrics = this.metrics.get(current.id)!
      return currentMetrics.activeConnections < minMetrics.activeConnections ? current : min
    })
  }

  private selectWeighted(connections: PoolConnection[]): PoolConnection {
    const weights = this.config.loadBalancing.weights || {}
    const totalWeight = connections.reduce((sum, conn) => sum + (weights[conn.config.id] || 1), 0)
    const random = Math.random() * totalWeight
    
    let currentWeight = 0
    for (const connection of connections) {
      currentWeight += weights[connection.config.id] || 1
      if (random <= currentWeight) {
        return connection
      }
    }
    
    return connections[0]
  }

  private selectByResponseTime(connections: PoolConnection[]): PoolConnection {
    return connections.reduce((fastest, current) => 
      current.avgResponseTime < fastest.avgResponseTime ? current : fastest
    )
  }

  private async executeQueryOnConnection<T>(
    connection: PoolConnection,
    query: string,
    params: any[],
    queryId: string,
    timeout: number
  ): Promise<T> {
    const startTime = Date.now()
    
    // Track active query
    this.activeQueries.set(queryId, {
      queryId,
      sql: query,
      duration: 0,
      timestamp: startTime,
      connectionId: connection.id,
      cached: false
    })

    try {
      // Execute query with timeout
      const result = await Promise.race([
        this.performQuery<T>(connection.client, query, params),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
      ])

      const duration = Date.now() - startTime
      
      // Update query metrics
      const queryMetrics = this.activeQueries.get(queryId)!
      queryMetrics.duration = duration
      queryMetrics.rowCount = Array.isArray(result) ? result.length : undefined

      return result

    } finally {
      this.activeQueries.delete(queryId)
    }
  }

  private async performQuery<T>(client: SupabaseClient<Database>, query: string, params: any[]): Promise<T> {
    // This is a simplified implementation
    // In a real scenario, you'd need to adapt this based on your actual query patterns
    
    // For Supabase, you would typically use the query builder
    // This is a placeholder for the actual query execution
    const { data, error } = await client.rpc('execute_sql', { 
      query, 
      params: params || [] 
    }) as { data: T; error: any }

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  private updateConnectionMetrics(connection: PoolConnection, duration: number, success: boolean): void {
    connection.queryCount++
    
    if (success) {
      connection.avgResponseTime = 
        (connection.avgResponseTime * (connection.queryCount - 1) + duration) / connection.queryCount
    } else {
      connection.errorCount++
    }

    // Update pool metrics
    const metrics = this.metrics.get(connection.id)!
    metrics.queryCount++
    metrics.avgQueryTime = (metrics.avgQueryTime * (metrics.queryCount - 1) + duration) / metrics.queryCount
    metrics.errorRate = (connection.errorCount / connection.queryCount) * 100
  }

  private generateQueryId(query: string, params: any[]): string {
    const queryHash = btoa(query + JSON.stringify(params)).slice(0, 16)
    return `query_${queryHash}`
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key)
      return null
    }
    
    return cached.result
  }

  private setCache<T>(key: string, result: T, ttl: number): void {
    this.queryCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl
    })
    
    // Cleanup old cache entries
    if (this.queryCache.size > this.config.queryOptimization.cacheSize) {
      const oldestKey = Array.from(this.queryCache.keys())[0]
      this.queryCache.delete(oldestKey)
    }
  }

  private calculateCacheHitRate(): number {
    // This would need to be tracked separately in a real implementation
    return 0
  }

  private estimateCacheMemoryUsage(): number {
    // Rough estimation
    return this.queryCache.size * 1024 // 1KB per cached item
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks()
    }, this.config.healthCheck.intervalMs)
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.connections.values()).map(connection => 
      this.checkConnectionHealth(connection)
    )
    
    await Promise.all(healthCheckPromises)
  }

  private async checkConnectionHealth(connection: PoolConnection): Promise<void> {
    try {
      await this.executeQueryOnConnection(
        connection,
        'SELECT 1',
        [],
        `health_${connection.id}`,
        this.config.healthCheck.timeoutMs
      )
      
      const metrics = this.metrics.get(connection.id)!
      metrics.isHealthy = true
      metrics.lastHealthCheck = Date.now()
      
    } catch (error) {
      const metrics = this.metrics.get(connection.id)!
      metrics.isHealthy = false
      metrics.connectionErrors++
      
      logger.warn('Connection health check failed', {
        component: 'ConnectionPoolManager',
        connectionId: connection.id,
        error: (error as Error).message
      })
    }
  }

  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectAndReportMetrics()
    }, this.config.monitoring.metricsIntervalMs)
  }

  private collectAndReportMetrics(): void {
    const metrics = this.getPoolMetrics()
    
    logger.info('Connection pool metrics', {
      component: 'ConnectionPoolManager',
      ...metrics
    })
    
    // Check alert thresholds
    const connectionUsage = metrics.pool.activeConnections / metrics.pool.totalConnections
    if (connectionUsage > this.config.monitoring.alertThresholds.connectionUsage) {
      logger.warn('High connection usage detected', {
        component: 'ConnectionPoolManager',
        usage: connectionUsage,
        threshold: this.config.monitoring.alertThresholds.connectionUsage
      })
    }
  }

  private setupEventHandlers(): void {
    // Cleanup on process exit
    process.on('SIGTERM', () => {
      this.shutdown().catch(error => 
        logger.error('Error during shutdown', error)
      )
    })

    process.on('SIGINT', () => {
      this.shutdown().catch(error => 
        logger.error('Error during shutdown', error)
      )
    })
  }
}

// Factory function for easy setup
export function createConnectionPool(config: ConnectionPoolConfig): ConnectionPoolManager {
  const pool = ConnectionPoolManager.getInstance(config)
  return pool
}

// Default configuration
export const defaultPoolConfig: ConnectionPoolConfig = {
  primary: {
    id: 'primary',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    role: 'primary'
  },
  poolSettings: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 5000,
    createTimeoutMillis: 3000,
    destroyTimeoutMillis: 1000,
    idleTimeoutMillis: 300000, // 5 minutes
    reapIntervalMillis: 60000, // 1 minute
    createRetryIntervalMillis: 200,
    propagateCreateError: false
  },
  healthCheck: {
    enabled: true,
    intervalMs: 30000, // 30 seconds
    timeoutMs: 5000,
    retryCount: 3
  },
  queryOptimization: {
    enabled: true,
    slowQueryThresholdMs: 1000,
    explainAnalyzeThreshold: 5000,
    cacheSize: 1000
  },
  loadBalancing: {
    strategy: 'round-robin'
  },
  monitoring: {
    enabled: true,
    metricsIntervalMs: 60000, // 1 minute
    alertThresholds: {
      connectionUsage: 0.8, // 80%
      queryLatency: 2000, // 2 seconds
      errorRate: 0.05 // 5%
    }
  }
}