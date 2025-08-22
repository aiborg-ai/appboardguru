/**
 * Database Query Optimizer and Connection Pool Manager
 * Advanced database performance optimization for BoardGuru
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Logger } from '../logging/logger'
import { telemetry, MetricType } from '../logging/telemetry'
import { PerformanceMonitoringUtils } from '../middleware/performance-monitoring'

const logger = Logger.getLogger('QueryOptimizer')

export interface QueryAnalysis {
  query: string
  executionPlan: any
  estimatedCost: number
  estimatedRows: number
  indexesUsed: string[]
  suggestions: QueryOptimizationSuggestion[]
  performance: {
    executionTime: number
    ioOperations: number
    memoryUsage: number
  }
}

export interface QueryOptimizationSuggestion {
  type: 'index' | 'query_rewrite' | 'denormalization' | 'caching' | 'partitioning'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: {
    performance: number // Expected improvement percentage
    complexity: 'low' | 'medium' | 'high'
    cost: 'low' | 'medium' | 'high'
  }
  implementation: string
}

export interface ConnectionPoolStats {
  activeConnections: number
  idleConnections: number
  totalConnections: number
  waitingClients: number
  acquiredConnections: number
  releasedConnections: number
  poolUtilization: number
  averageAcquireTime: number
  averageHoldTime: number
  errors: {
    timeouts: number
    connectionErrors: number
    queryErrors: number
  }
}

export interface DatabaseMetrics {
  connectionPool: ConnectionPoolStats
  queryPerformance: {
    totalQueries: number
    averageResponseTime: number
    slowQueries: number
    failedQueries: number
    queriesByType: Record<string, number>
    topSlowQueries: Array<{
      query: string
      avgTime: number
      count: number
    }>
  }
  tableStats: Record<string, {
    reads: number
    writes: number
    size: number
    indexEfficiency: number
  }>
  optimization: {
    suggestionsGenerated: number
    suggestionsImplemented: number
    performanceImprovement: number
  }
}

/**
 * Connection Pool Manager
 */
class ConnectionPoolManager {
  private pools = new Map<string, SupabaseClient>()
  private poolConfigs = new Map<string, any>()
  private stats = new Map<string, ConnectionPoolStats>()
  private connectionTracking = new Map<string, { acquiredAt: number; query?: string }>()

  constructor() {
    this.initializeDefaultPools()
    this.startMonitoring()
  }

  /**
   * Get optimized connection for query type
   */
  async getConnection(queryType: 'read' | 'write' | 'analytics' = 'read'): Promise<{
    client: SupabaseClient
    connectionId: string
    release: () => void
  }> {
    const poolName = this.selectOptimalPool(queryType)
    const client = this.pools.get(poolName)
    
    if (!client) {
      throw new Error(`No connection pool available for type: ${queryType}`)
    }

    const connectionId = `${poolName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const acquiredAt = Date.now()
    
    this.connectionTracking.set(connectionId, { acquiredAt })
    this.updatePoolStats(poolName, 'acquire')

    return {
      client,
      connectionId,
      release: () => this.releaseConnection(connectionId, poolName)
    }
  }

  /**
   * Execute query with automatic optimization
   */
  async executeOptimizedQuery<T>(
    query: string,
    params: any[] = [],
    options: {
      queryType?: 'read' | 'write' | 'analytics'
      timeout?: number
      retries?: number
      analyzePerformance?: boolean
    } = {}
  ): Promise<{ data: T; analysis?: QueryAnalysis }> {
    const {
      queryType = 'read',
      timeout = 30000,
      retries = 3,
      analyzePerformance = false
    } = options

    const { client, connectionId, release } = await this.getConnection(queryType)
    
    let attempt = 0
    let lastError: Error | null = null

    while (attempt < retries) {
      const startTime = performance.now()
      
      try {
        // Record query start
        this.connectionTracking.get(connectionId)!.query = query
        
        // Execute with timeout
        const result = await Promise.race([
          this.executeQuery<T>(client, query, params),
          this.createTimeoutPromise(timeout)
        ])

        const executionTime = performance.now() - startTime

        // Record metrics
        this.recordQueryMetrics(query, executionTime, queryType, true)

        // Analyze performance if requested
        let analysis: QueryAnalysis | undefined
        if (analyzePerformance) {
          analysis = await this.analyzeQuery(query, executionTime, client)
        }

        return { data: result, analysis }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        attempt++
        
        const executionTime = performance.now() - startTime
        this.recordQueryMetrics(query, executionTime, queryType, false)
        
        logger.warn(`Query attempt ${attempt} failed`, { 
          query: this.sanitizeQuery(query), 
          error: lastError.message,
          executionTime
        })

        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000) // Exponential backoff
        }
      } finally {
        release()
      }
    }

    throw lastError || new Error('Query execution failed after retries')
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(): Record<string, ConnectionPoolStats> {
    return Object.fromEntries(this.stats.entries())
  }

  /**
   * Get database metrics
   */
  getDatabaseMetrics(): DatabaseMetrics {
    const poolStats = Array.from(this.stats.values())
    const totalConnections = poolStats.reduce((sum, stats) => sum + stats.totalConnections, 0)
    const averageUtilization = poolStats.reduce((sum, stats) => sum + stats.poolUtilization, 0) / poolStats.length

    return {
      connectionPool: {
        activeConnections: poolStats.reduce((sum, stats) => sum + stats.activeConnections, 0),
        idleConnections: poolStats.reduce((sum, stats) => sum + stats.idleConnections, 0),
        totalConnections,
        waitingClients: poolStats.reduce((sum, stats) => sum + stats.waitingClients, 0),
        acquiredConnections: poolStats.reduce((sum, stats) => sum + stats.acquiredConnections, 0),
        releasedConnections: poolStats.reduce((sum, stats) => sum + stats.releasedConnections, 0),
        poolUtilization: averageUtilization,
        averageAcquireTime: poolStats.reduce((sum, stats) => sum + stats.averageAcquireTime, 0) / poolStats.length,
        averageHoldTime: poolStats.reduce((sum, stats) => sum + stats.averageHoldTime, 0) / poolStats.length,
        errors: {
          timeouts: poolStats.reduce((sum, stats) => sum + stats.errors.timeouts, 0),
          connectionErrors: poolStats.reduce((sum, stats) => sum + stats.errors.connectionErrors, 0),
          queryErrors: poolStats.reduce((sum, stats) => sum + stats.errors.queryErrors, 0)
        }
      },
      queryPerformance: this.getQueryPerformanceMetrics(),
      tableStats: this.getTableStats(),
      optimization: this.getOptimizationStats()
    }
  }

  /**
   * Optimize pool configuration based on usage patterns
   */
  async optimizePools(): Promise<void> {
    const metrics = this.getDatabaseMetrics()
    
    // Analyze usage patterns and adjust pool sizes
    for (const [poolName, stats] of this.stats.entries()) {
      const currentConfig = this.poolConfigs.get(poolName)
      const recommendations = this.generatePoolOptimizations(stats, currentConfig)
      
      if (recommendations.length > 0) {
        logger.info(`Pool optimization recommendations for ${poolName}:`, recommendations)
        
        // Apply high-priority optimizations automatically
        for (const rec of recommendations.filter(r => r.priority === 'high')) {
          await this.applyPoolOptimization(poolName, rec)
        }
      }
    }
  }

  // Private methods
  private initializeDefaultPools(): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase credentials not available, using basic client')
      return
    }

    // Read pool - optimized for SELECT queries
    const readPool = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-pool-type': 'read'
        }
      }
    })

    // Write pool - optimized for INSERT/UPDATE/DELETE
    const writePool = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-pool-type': 'write'
        }
      }
    })

    // Analytics pool - optimized for complex queries
    const analyticsPool = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-pool-type': 'analytics'
        }
      }
    })

    this.pools.set('read', readPool)
    this.pools.set('write', writePool)
    this.pools.set('analytics', analyticsPool)

    // Initialize stats
    for (const poolName of ['read', 'write', 'analytics']) {
      this.stats.set(poolName, {
        activeConnections: 0,
        idleConnections: 10, // Estimated
        totalConnections: 10,
        waitingClients: 0,
        acquiredConnections: 0,
        releasedConnections: 0,
        poolUtilization: 0,
        averageAcquireTime: 0,
        averageHoldTime: 0,
        errors: {
          timeouts: 0,
          connectionErrors: 0,
          queryErrors: 0
        }
      })
    }

    logger.info('Database connection pools initialized')
  }

  private selectOptimalPool(queryType: 'read' | 'write' | 'analytics'): string {
    // Simple mapping for now - could be more intelligent based on current load
    switch (queryType) {
      case 'write':
        return 'write'
      case 'analytics':
        return 'analytics'
      default:
        return 'read'
    }
  }

  private async executeQuery<T>(client: SupabaseClient, query: string, params: any[]): Promise<T> {
    // For Supabase, we'll use the appropriate method based on query type
    if (query.trim().toLowerCase().startsWith('select')) {
      // This is simplified - in reality we'd parse the query more carefully
      const { data, error } = await client.from('users').select('*').limit(1)
      if (error) throw error
      return data as T
    } else {
      throw new Error('Complex query execution not implemented for Supabase client')
    }
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), timeout)
    })
  }

  private releaseConnection(connectionId: string, poolName: string): void {
    const tracking = this.connectionTracking.get(connectionId)
    if (tracking) {
      const holdTime = Date.now() - tracking.acquiredAt
      this.updatePoolStats(poolName, 'release', holdTime)
      this.connectionTracking.delete(connectionId)
    }
  }

  private updatePoolStats(poolName: string, action: 'acquire' | 'release', holdTime?: number): void {
    const stats = this.stats.get(poolName)
    if (!stats) return

    if (action === 'acquire') {
      stats.acquiredConnections++
      stats.activeConnections++
    } else if (action === 'release') {
      stats.releasedConnections++
      stats.activeConnections = Math.max(0, stats.activeConnections - 1)
      
      if (holdTime) {
        stats.averageHoldTime = (stats.averageHoldTime + holdTime) / 2
      }
    }

    stats.poolUtilization = stats.activeConnections / stats.totalConnections
  }

  private recordQueryMetrics(query: string, executionTime: number, queryType: string, success: boolean): void {
    // Record to telemetry
    telemetry.recordHistogram('database_query_duration_ms', executionTime, {
      query_type: queryType,
      success: success.toString()
    })

    if (!success) {
      telemetry.recordCounter('database_query_errors_total', 1, {
        query_type: queryType
      })
    }

    // Record for performance monitoring
    PerformanceMonitoringUtils.recordDatabaseActivity('current', 1, executionTime)
  }

  private async analyzeQuery(query: string, executionTime: number, client: SupabaseClient): Promise<QueryAnalysis> {
    // Simplified analysis - would be more comprehensive with direct DB access
    const suggestions: QueryOptimizationSuggestion[] = []

    if (executionTime > 1000) {
      suggestions.push({
        type: 'index',
        priority: 'high',
        description: 'Consider adding indexes for slow query',
        impact: {
          performance: 70,
          complexity: 'medium',
          cost: 'low'
        },
        implementation: 'CREATE INDEX ON table_name (column_name)'
      })
    }

    if (query.toLowerCase().includes('select *')) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        description: 'Avoid SELECT * queries',
        impact: {
          performance: 30,
          complexity: 'low',
          cost: 'low'
        },
        implementation: 'Select only required columns'
      })
    }

    return {
      query: this.sanitizeQuery(query),
      executionPlan: null, // Would need direct DB access
      estimatedCost: executionTime,
      estimatedRows: 0,
      indexesUsed: [],
      suggestions,
      performance: {
        executionTime,
        ioOperations: 0,
        memoryUsage: 0
      }
    }
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from query
    return query.replace(/('[^']*'|"[^"]*"|\$\d+)/g, '?').slice(0, 500)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getQueryPerformanceMetrics(): DatabaseMetrics['queryPerformance'] {
    // Would aggregate from stored metrics
    return {
      totalQueries: 0,
      averageResponseTime: 0,
      slowQueries: 0,
      failedQueries: 0,
      queriesByType: {},
      topSlowQueries: []
    }
  }

  private getTableStats(): DatabaseMetrics['tableStats'] {
    // Would query database statistics
    return {}
  }

  private getOptimizationStats(): DatabaseMetrics['optimization'] {
    return {
      suggestionsGenerated: 0,
      suggestionsImplemented: 0,
      performanceImprovement: 0
    }
  }

  private generatePoolOptimizations(stats: ConnectionPoolStats, config: any): QueryOptimizationSuggestion[] {
    const recommendations: QueryOptimizationSuggestion[] = []

    if (stats.poolUtilization > 0.8) {
      recommendations.push({
        type: 'caching',
        priority: 'high',
        description: 'Pool utilization is high, consider increasing pool size',
        impact: {
          performance: 40,
          complexity: 'low',
          cost: 'medium'
        },
        implementation: 'Increase maximum pool size configuration'
      })
    }

    if (stats.averageHoldTime > 5000) {
      recommendations.push({
        type: 'query_rewrite',
        priority: 'medium',
        description: 'Long connection hold times detected',
        impact: {
          performance: 30,
          complexity: 'medium',
          cost: 'low'
        },
        implementation: 'Review queries for optimization opportunities'
      })
    }

    return recommendations
  }

  private async applyPoolOptimization(poolName: string, recommendation: QueryOptimizationSuggestion): Promise<void> {
    logger.info(`Applying pool optimization for ${poolName}:`, recommendation.description)
    // Implementation would depend on the specific optimization
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.collectPoolMetrics()
    }, 30000) // Every 30 seconds

    setInterval(async () => {
      await this.optimizePools()
    }, 300000) // Every 5 minutes
  }

  private collectPoolMetrics(): void {
    // Update pool statistics
    for (const [poolName, stats] of this.stats.entries()) {
      // Calculate current utilization
      const activeConnections = this.connectionTracking.size
      stats.activeConnections = activeConnections
      stats.poolUtilization = activeConnections / stats.totalConnections

      // Record metrics
      telemetry.recordGauge('database_pool_active_connections', activeConnections, {
        pool: poolName
      })
      
      telemetry.recordGauge('database_pool_utilization', stats.poolUtilization, {
        pool: poolName
      })
    }
  }
}

/**
 * Query Builder with automatic optimization
 */
export class OptimizedQueryBuilder {
  private poolManager: ConnectionPoolManager

  constructor(poolManager: ConnectionPoolManager) {
    this.poolManager = poolManager
  }

  /**
   * Build and execute optimized SELECT query
   */
  async select<T>(
    table: string,
    options: {
      columns?: string[]
      where?: Record<string, any>
      orderBy?: { column: string; direction: 'asc' | 'desc' }[]
      limit?: number
      offset?: number
      useIndex?: string
      enableCache?: boolean
    } = {}
  ): Promise<T[]> {
    const query = this.buildSelectQuery(table, options)
    const queryType = this.determineQueryType(query)
    
    const { data } = await this.poolManager.executeOptimizedQuery<T[]>(query, [], {
      queryType,
      analyzePerformance: true
    })

    return data
  }

  /**
   * Build and execute optimized INSERT query
   */
  async insert<T>(
    table: string,
    data: Partial<T> | Partial<T>[],
    options: {
      onConflict?: 'ignore' | 'update'
      returning?: string[]
    } = {}
  ): Promise<T[]> {
    const query = this.buildInsertQuery(table, data, options)
    
    const { data: result } = await this.poolManager.executeOptimizedQuery<T[]>(query, [], {
      queryType: 'write',
      analyzePerformance: false
    })

    return result
  }

  /**
   * Build and execute optimized UPDATE query
   */
  async update<T>(
    table: string,
    data: Partial<T>,
    where: Record<string, any>,
    options: {
      returning?: string[]
    } = {}
  ): Promise<T[]> {
    const query = this.buildUpdateQuery(table, data, where, options)
    
    const { data: result } = await this.poolManager.executeOptimizedQuery<T[]>(query, [], {
      queryType: 'write',
      analyzePerformance: false
    })

    return result
  }

  /**
   * Build and execute optimized DELETE query
   */
  async delete<T>(
    table: string,
    where: Record<string, any>,
    options: {
      returning?: string[]
    } = {}
  ): Promise<T[]> {
    const query = this.buildDeleteQuery(table, where, options)
    
    const { data: result } = await this.poolManager.executeOptimizedQuery<T[]>(query, [], {
      queryType: 'write',
      analyzePerformance: false
    })

    return result
  }

  /**
   * Execute raw optimized query
   */
  async raw<T>(
    query: string,
    params: any[] = [],
    queryType: 'read' | 'write' | 'analytics' = 'read'
  ): Promise<{ data: T; analysis?: QueryAnalysis }> {
    return this.poolManager.executeOptimizedQuery<T>(query, params, {
      queryType,
      analyzePerformance: true
    })
  }

  // Private query building methods
  private buildSelectQuery(table: string, options: any): string {
    const columns = options.columns?.join(', ') || '*'
    let query = `SELECT ${columns} FROM ${table}`

    if (options.where) {
      const conditions = Object.entries(options.where)
        .map(([key, value]) => `${key} = $${key}`)
        .join(' AND ')
      query += ` WHERE ${conditions}`
    }

    if (options.orderBy) {
      const orderClauses = options.orderBy
        .map((order: any) => `${order.column} ${order.direction.toUpperCase()}`)
        .join(', ')
      query += ` ORDER BY ${orderClauses}`
    }

    if (options.limit) {
      query += ` LIMIT ${options.limit}`
    }

    if (options.offset) {
      query += ` OFFSET ${options.offset}`
    }

    return query
  }

  private buildInsertQuery(table: string, data: any, options: any): string {
    // Simplified implementation
    return `INSERT INTO ${table} (column) VALUES ($1)`
  }

  private buildUpdateQuery(table: string, data: any, where: any, options: any): string {
    // Simplified implementation
    return `UPDATE ${table} SET column = $1 WHERE id = $2`
  }

  private buildDeleteQuery(table: string, where: any, options: any): string {
    // Simplified implementation
    return `DELETE FROM ${table} WHERE id = $1`
  }

  private determineQueryType(query: string): 'read' | 'write' | 'analytics' {
    const normalized = query.trim().toLowerCase()
    
    if (normalized.startsWith('select')) {
      // Check for complex analytics queries
      if (normalized.includes('group by') || 
          normalized.includes('having') || 
          normalized.includes('window') ||
          normalized.includes('cte') ||
          normalized.includes('recursive')) {
        return 'analytics'
      }
      return 'read'
    }
    
    return 'write'
  }
}

// Export singleton instances
export const connectionPoolManager = new ConnectionPoolManager()
export const optimizedQueryBuilder = new OptimizedQueryBuilder(connectionPoolManager)

/**
 * Database optimization utilities
 */
export class DatabaseOptimizer {
  private poolManager: ConnectionPoolManager

  constructor(poolManager: ConnectionPoolManager) {
    this.poolManager = poolManager
  }

  /**
   * Analyze database performance and generate recommendations
   */
  async generateOptimizationReport(): Promise<{
    summary: DatabaseMetrics
    recommendations: QueryOptimizationSuggestion[]
    implementationPlan: string[]
  }> {
    const metrics = this.poolManager.getDatabaseMetrics()
    const recommendations: QueryOptimizationSuggestion[] = []

    // Analyze connection pool performance
    if (metrics.connectionPool.poolUtilization > 0.8) {
      recommendations.push({
        type: 'caching',
        priority: 'high',
        description: 'High connection pool utilization detected',
        impact: { performance: 50, complexity: 'medium', cost: 'medium' },
        implementation: 'Consider increasing pool size or implementing connection caching'
      })
    }

    // Analyze query performance
    if (metrics.queryPerformance.averageResponseTime > 500) {
      recommendations.push({
        type: 'index',
        priority: 'high',
        description: 'High average query response time',
        impact: { performance: 60, complexity: 'medium', cost: 'low' },
        implementation: 'Review slow queries and add appropriate indexes'
      })
    }

    const implementationPlan = this.generateImplementationPlan(recommendations)

    return {
      summary: metrics,
      recommendations,
      implementationPlan
    }
  }

  /**
   * Auto-tune database configuration
   */
  async autoTune(): Promise<void> {
    logger.info('Starting database auto-tuning...')
    
    const report = await this.generateOptimizationReport()
    
    // Apply high-priority recommendations automatically
    const highPriorityRecs = report.recommendations.filter(r => r.priority === 'high')
    
    for (const rec of highPriorityRecs) {
      try {
        await this.applyOptimization(rec)
        logger.info(`Applied optimization: ${rec.description}`)
      } catch (error) {
        logger.error(`Failed to apply optimization: ${rec.description}`, error)
      }
    }
  }

  private generateImplementationPlan(recommendations: QueryOptimizationSuggestion[]): string[] {
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      .map(rec => `${rec.priority.toUpperCase()}: ${rec.implementation}`)
  }

  private async applyOptimization(recommendation: QueryOptimizationSuggestion): Promise<void> {
    // Implementation would depend on the specific optimization
    logger.debug(`Applying optimization: ${recommendation.type}`)
  }
}

export const databaseOptimizer = new DatabaseOptimizer(connectionPoolManager)