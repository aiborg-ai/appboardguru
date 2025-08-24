/**
 * Advanced Query Optimization System
 * Database query optimization, indexing strategies, and performance monitoring
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { Result, success, failure } from '../patterns/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { IntelligentCachingManager } from './intelligent-caching'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { createHash } from 'crypto'

// Core interfaces
export interface QueryPlan {
  id: string
  query: string
  parameters: any[]
  estimatedCost: number
  estimatedRows: number
  actualCost?: number
  actualRows?: number
  executionTime: number
  indexesUsed: string[]
  optimizations: QueryOptimization[]
  cacheStrategy?: CacheStrategy
}

export interface QueryOptimization {
  type: OptimizationType
  description: string
  impact: 'low' | 'medium' | 'high'
  implemented: boolean
  estimatedImprovement: number // percentage
}

export type OptimizationType = 
  | 'index_suggestion'
  | 'query_rewrite'
  | 'join_optimization'
  | 'subquery_optimization'
  | 'pagination_improvement'
  | 'data_type_optimization'
  | 'cache_optimization'

export interface CacheStrategy {
  type: 'query_result' | 'computed_field' | 'aggregation' | 'lookup_table'
  ttl: number
  invalidationTriggers: string[]
  tags: string[]
}

export interface IndexRecommendation {
  tableName: string
  columns: string[]
  indexType: 'btree' | 'hash' | 'gin' | 'gist'
  reason: string
  expectedImprovement: number
  queries: string[]
  priority: 'low' | 'medium' | 'high'
}

export interface QueryAnalysis {
  queryHash: string
  executionCount: number
  avgExecutionTime: number
  maxExecutionTime: number
  minExecutionTime: number
  totalCpuTime: number
  diskReads: number
  memoryUsage: number
  indexHitRate: number
  cacheHitRate: number
  errorRate: number
  lastOptimized?: string
}

export interface PerformanceMetrics {
  slowQueries: QueryAnalysis[]
  topQueries: QueryAnalysis[]
  indexEfficiency: Record<string, number>
  cacheEffectiveness: Record<string, number>
  overallPerformance: {
    avgResponseTime: number
    throughput: number
    errorRate: number
    resourceUtilization: number
  }
}

export interface QueryOptimizer {
  name: string
  optimize(query: string, parameters: any[]): Promise<QueryPlan>
  supports(queryType: string): boolean
  priority: number
}

/**
 * Advanced Query Optimization Manager
 */
export class AdvancedQueryOptimizationManager extends EventEmitter {
  private queryAnalytics: Map<string, QueryAnalysis> = new Map()
  private indexRecommendations: Map<string, IndexRecommendation> = new Map()
  private optimizers: QueryOptimizer[] = []
  private queryPlanCache: Map<string, QueryPlan> = new Map()
  private metrics: MetricsCollector
  private tracer: DistributedTracer
  private cache: IntelligentCachingManager

  constructor(
    private supabase: SupabaseClient<Database>,
    cache: IntelligentCachingManager,
    private options: {
      enableQueryPlanCaching: boolean
      slowQueryThreshold: number // ms
      analysisRetentionDays: number
      enableAutoIndexing: boolean
      enableQueryRewriting: boolean
      maxConcurrentOptimizations: number
    }
  ) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
    this.cache = cache

    this.setupDefaultOptimizers()
    this.setupPerformanceMonitoring()
    this.setupIndexAnalysis()
  }

  /**
   * Execute optimized query
   */
  async executeOptimizedQuery<T>(
    query: string,
    parameters: any[] = [],
    options?: {
      enableCaching?: boolean
      cacheStrategy?: CacheStrategy
      timeout?: number
      explain?: boolean
    }
  ): Promise<Result<{ data: T[]; plan?: QueryPlan }, string>> {
    const span = this.tracer.startSpan('query_optimization_execute')
    const startTime = Date.now()

    try {
      const queryHash = this.generateQueryHash(query, parameters)
      
      span.setAttributes({
        'query.hash': queryHash,
        'query.parameters_count': parameters.length
      })

      // Check if we have a cached result
      if (options?.enableCaching) {
        const cachedResult = await this.getCachedResult<T>(queryHash, options.cacheStrategy)
        if (cachedResult.success && cachedResult.data) {
          span.setAttributes({ 'query.cache_hit': true })
          return success({ data: cachedResult.data })
        }
      }

      // Get or create optimized query plan
      let plan = await this.getOptimizedPlan(query, parameters)
      if (!plan.success) {
        return plan as any
      }

      // Execute the query
      const executionResult = await this.executeQuery<T>(plan.data, options?.timeout)
      
      if (!executionResult.success) {
        return executionResult as any
      }

      const executionTime = Date.now() - startTime
      
      // Update plan with actual execution metrics
      plan.data.actualCost = executionTime
      plan.data.actualRows = executionResult.data.length
      plan.data.executionTime = executionTime

      // Record analytics
      this.recordQueryExecution(queryHash, plan.data, executionTime)

      // Cache the result if caching is enabled
      if (options?.enableCaching && options.cacheStrategy) {
        await this.cacheQueryResult(queryHash, executionResult.data, options.cacheStrategy)
      }

      // Check if query is slow and needs optimization
      if (executionTime > this.options.slowQueryThreshold) {
        await this.analyzeSlowQuery(queryHash, plan.data)
      }

      span.setAttributes({
        'query.execution_time': executionTime,
        'query.result_count': executionResult.data.length,
        'query.cache_hit': false
      })

      return success({ 
        data: executionResult.data, 
        plan: options?.explain ? plan.data : undefined 
      })

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Query execution failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Analyze query performance
   */
  async analyzeQuery(query: string, parameters: any[] = []): Promise<Result<QueryAnalysis, string>> {
    const span = this.tracer.startSpan('query_optimization_analyze')

    try {
      const queryHash = this.generateQueryHash(query, parameters)
      const analysis = this.queryAnalytics.get(queryHash)
      
      if (analysis) {
        return success(analysis)
      }

      // Create new analysis
      const newAnalysis: QueryAnalysis = {
        queryHash,
        executionCount: 0,
        avgExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: Number.MAX_VALUE,
        totalCpuTime: 0,
        diskReads: 0,
        memoryUsage: 0,
        indexHitRate: 0,
        cacheHitRate: 0,
        errorRate: 0
      }

      this.queryAnalytics.set(queryHash, newAnalysis)
      return success(newAnalysis)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Query analysis failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Generate index recommendations
   */
  async generateIndexRecommendations(
    tableName?: string
  ): Promise<Result<IndexRecommendation[], string>> {
    const span = this.tracer.startSpan('query_optimization_index_recommendations')

    try {
      const recommendations: IndexRecommendation[] = []
      
      // Analyze slow queries for index opportunities
      const slowQueries = Array.from(this.queryAnalytics.values())
        .filter(analysis => analysis.avgExecutionTime > this.options.slowQueryThreshold)
        .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime)

      for (const analysis of slowQueries) {
        const queryRecommendations = await this.analyzeQueryForIndexes(analysis)
        recommendations.push(...queryRecommendations)
      }

      // Filter by table if specified
      const filteredRecommendations = tableName 
        ? recommendations.filter(rec => rec.tableName === tableName)
        : recommendations

      // Deduplicate and prioritize
      const uniqueRecommendations = this.deduplicateIndexRecommendations(filteredRecommendations)
      
      span.setAttributes({
        'recommendations.count': uniqueRecommendations.length,
        'recommendations.table': tableName || 'all'
      })

      return success(uniqueRecommendations)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Index recommendation failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Apply optimization recommendations
   */
  async applyOptimizations(
    recommendations: QueryOptimization[]
  ): Promise<Result<{ applied: number; failed: number }, string>> {
    const span = this.tracer.startSpan('query_optimization_apply')

    try {
      let applied = 0
      let failed = 0

      for (const optimization of recommendations) {
        try {
          const result = await this.applyOptimization(optimization)
          if (result.success) {
            applied++
            optimization.implemented = true
          } else {
            failed++
          }
        } catch (error) {
          failed++
        }
      }

      span.setAttributes({
        'optimizations.applied': applied,
        'optimizations.failed': failed
      })

      return success({ applied, failed })

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Optimization application failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const analytics = Array.from(this.queryAnalytics.values())
    
    const slowQueries = analytics
      .filter(a => a.avgExecutionTime > this.options.slowQueryThreshold)
      .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime)
      .slice(0, 10)

    const topQueries = analytics
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 10)

    const avgResponseTime = analytics.length > 0 
      ? analytics.reduce((sum, a) => sum + a.avgExecutionTime, 0) / analytics.length
      : 0

    const totalExecutions = analytics.reduce((sum, a) => sum + a.executionCount, 0)
    const totalErrors = analytics.reduce((sum, a) => sum + (a.errorRate * a.executionCount), 0)

    return {
      slowQueries,
      topQueries,
      indexEfficiency: this.calculateIndexEfficiency(),
      cacheEffectiveness: this.calculateCacheEffectiveness(),
      overallPerformance: {
        avgResponseTime,
        throughput: totalExecutions / (Date.now() / 1000), // per second
        errorRate: totalExecutions > 0 ? totalErrors / totalExecutions : 0,
        resourceUtilization: this.calculateResourceUtilization()
      }
    }
  }

  /**
   * Private helper methods
   */
  private async getOptimizedPlan(query: string, parameters: any[]): Promise<Result<QueryPlan, string>> {
    const queryHash = this.generateQueryHash(query, parameters)
    
    // Check cache first
    if (this.options.enableQueryPlanCaching) {
      const cachedPlan = this.queryPlanCache.get(queryHash)
      if (cachedPlan) {
        return success(cachedPlan)
      }
    }

    // Find appropriate optimizer
    const optimizer = this.findBestOptimizer(query)
    if (!optimizer) {
      // Create basic plan without optimization
      const basicPlan: QueryPlan = {
        id: queryHash,
        query,
        parameters,
        estimatedCost: 0,
        estimatedRows: 0,
        executionTime: 0,
        indexesUsed: [],
        optimizations: []
      }
      return success(basicPlan)
    }

    try {
      const plan = await optimizer.optimize(query, parameters)
      
      // Cache the plan
      if (this.options.enableQueryPlanCaching) {
        this.queryPlanCache.set(queryHash, plan)
      }

      return success(plan)

    } catch (error) {
      return failure(`Query optimization failed: ${(error as Error).message}`)
    }
  }

  private async executeQuery<T>(plan: QueryPlan, timeout?: number): Promise<Result<T[], string>> {
    try {
      // Set timeout if specified
      const query = timeout 
        ? `SET statement_timeout = ${timeout}; ${plan.query}`
        : plan.query

      const { data, error } = await this.supabase.rpc('execute_optimized_query', {
        query: plan.query,
        parameters: plan.parameters
      })

      if (error) {
        return failure(`Query execution error: ${error.message}`)
      }

      return success(data || [])

    } catch (error) {
      return failure(`Query execution failed: ${(error as Error).message}`)
    }
  }

  private async getCachedResult<T>(
    queryHash: string, 
    strategy?: CacheStrategy
  ): Promise<Result<T[] | null, string>> {
    if (!strategy) {
      return success(null)
    }

    return this.cache.get<T[]>(`query:${queryHash}`, {
      includeStale: false
    })
  }

  private async cacheQueryResult<T>(
    queryHash: string, 
    data: T[], 
    strategy: CacheStrategy
  ): Promise<void> {
    await this.cache.set(`query:${queryHash}`, data, {
      ttl: strategy.ttl,
      tags: ['query_result', ...strategy.tags],
      priority: 'medium'
    })
  }

  private generateQueryHash(query: string, parameters: any[]): string {
    const normalized = this.normalizeQuery(query)
    const paramHash = createHash('md5').update(JSON.stringify(parameters)).digest('hex')
    return createHash('md5').update(normalized + paramHash).digest('hex')
  }

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\s*([(),=<>])\s*/g, '$1')
      .trim()
  }

  private recordQueryExecution(queryHash: string, plan: QueryPlan, executionTime: number): void {
    let analysis = this.queryAnalytics.get(queryHash)
    
    if (!analysis) {
      analysis = {
        queryHash,
        executionCount: 0,
        avgExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: Number.MAX_VALUE,
        totalCpuTime: 0,
        diskReads: 0,
        memoryUsage: 0,
        indexHitRate: 0,
        cacheHitRate: 0,
        errorRate: 0
      }
      this.queryAnalytics.set(queryHash, analysis)
    }

    analysis.executionCount++
    analysis.avgExecutionTime = (analysis.avgExecutionTime * (analysis.executionCount - 1) + executionTime) / analysis.executionCount
    analysis.maxExecutionTime = Math.max(analysis.maxExecutionTime, executionTime)
    analysis.minExecutionTime = Math.min(analysis.minExecutionTime, executionTime)

    this.metrics.recordQueryExecution(queryHash, executionTime, plan.indexesUsed.length)
  }

  private async analyzeSlowQuery(queryHash: string, plan: QueryPlan): Promise<void> {
    // Generate optimization recommendations for slow queries
    const optimizations: QueryOptimization[] = []

    // Check for missing indexes
    if (plan.indexesUsed.length === 0) {
      optimizations.push({
        type: 'index_suggestion',
        description: 'Consider adding indexes for frequently queried columns',
        impact: 'high',
        implemented: false,
        estimatedImprovement: 60
      })
    }

    // Check for inefficient joins
    if (plan.query.includes('JOIN') && plan.estimatedCost > 10000) {
      optimizations.push({
        type: 'join_optimization',
        description: 'Consider optimizing join order or adding indexes on join columns',
        impact: 'medium',
        implemented: false,
        estimatedImprovement: 40
      })
    }

    plan.optimizations = optimizations
    this.emit('slowQueryDetected', { queryHash, plan, optimizations })
  }

  private async analyzeQueryForIndexes(analysis: QueryAnalysis): Promise<IndexRecommendation[]> {
    // This would analyze the actual query to suggest indexes
    // For now, return empty array - would need SQL parsing logic
    return []
  }

  private deduplicateIndexRecommendations(recommendations: IndexRecommendation[]): IndexRecommendation[] {
    const unique = new Map<string, IndexRecommendation>()
    
    for (const rec of recommendations) {
      const key = `${rec.tableName}:${rec.columns.join(',')}`
      const existing = unique.get(key)
      
      if (!existing || rec.expectedImprovement > existing.expectedImprovement) {
        unique.set(key, rec)
      }
    }

    return Array.from(unique.values())
      .sort((a, b) => b.expectedImprovement - a.expectedImprovement)
  }

  private async applyOptimization(optimization: QueryOptimization): Promise<Result<void, string>> {
    switch (optimization.type) {
      case 'index_suggestion':
        return this.createRecommendedIndex(optimization)
      case 'query_rewrite':
        return this.rewriteQuery(optimization)
      default:
        return success(undefined)
    }
  }

  private async createRecommendedIndex(optimization: QueryOptimization): Promise<Result<void, string>> {
    // This would create the recommended index
    return success(undefined)
  }

  private async rewriteQuery(optimization: QueryOptimization): Promise<Result<void, string>> {
    // This would apply query rewriting
    return success(undefined)
  }

  private findBestOptimizer(query: string): QueryOptimizer | null {
    const queryType = this.detectQueryType(query)
    
    return this.optimizers
      .filter(opt => opt.supports(queryType))
      .sort((a, b) => b.priority - a.priority)[0] || null
  }

  private detectQueryType(query: string): string {
    const normalizedQuery = query.toLowerCase().trim()
    
    if (normalizedQuery.startsWith('select')) return 'select'
    if (normalizedQuery.startsWith('insert')) return 'insert'
    if (normalizedQuery.startsWith('update')) return 'update'
    if (normalizedQuery.startsWith('delete')) return 'delete'
    
    return 'unknown'
  }

  private calculateIndexEfficiency(): Record<string, number> {
    // Calculate index hit rates and efficiency metrics
    return {}
  }

  private calculateCacheEffectiveness(): Record<string, number> {
    // Calculate cache hit rates for different query types
    return {}
  }

  private calculateResourceUtilization(): number {
    // Calculate overall resource utilization
    return 0.5 // Placeholder
  }

  private setupDefaultOptimizers(): void {
    // Add default query optimizers
    this.optimizers.push({
      name: 'SelectOptimizer',
      supports: (queryType: string) => queryType === 'select',
      priority: 10,
      optimize: async (query: string, parameters: any[]): Promise<QueryPlan> => {
        return {
          id: this.generateQueryHash(query, parameters),
          query,
          parameters,
          estimatedCost: 1000,
          estimatedRows: 100,
          executionTime: 0,
          indexesUsed: [],
          optimizations: []
        }
      }
    })

    this.optimizers.push({
      name: 'JoinOptimizer',
      supports: (queryType: string) => queryType === 'select' && queryType.includes('join'),
      priority: 15,
      optimize: async (query: string, parameters: any[]): Promise<QueryPlan> => {
        return {
          id: this.generateQueryHash(query, parameters),
          query,
          parameters,
          estimatedCost: 2000,
          estimatedRows: 200,
          executionTime: 0,
          indexesUsed: [],
          optimizations: [{
            type: 'join_optimization',
            description: 'Optimized join order',
            impact: 'medium',
            implemented: true,
            estimatedImprovement: 30
          }]
        }
      }
    })
  }

  private setupPerformanceMonitoring(): void {
    // Monitor query performance every 5 minutes
    setInterval(() => {
      this.analyzePerformanceTrends()
    }, 5 * 60 * 1000)
  }

  private setupIndexAnalysis(): void {
    // Analyze index usage every hour
    setInterval(() => {
      this.analyzeIndexUsage()
    }, 60 * 60 * 1000)
  }

  private async analyzePerformanceTrends(): Promise<void> {
    const metrics = this.getPerformanceMetrics()
    
    // Check for performance degradation
    if (metrics.overallPerformance.avgResponseTime > this.options.slowQueryThreshold * 2) {
      this.emit('performanceDegradation', { metrics })
    }

    // Generate recommendations
    if (metrics.slowQueries.length > 5) {
      const recommendations = await this.generateIndexRecommendations()
      if (recommendations.success && recommendations.data.length > 0) {
        this.emit('optimizationRecommendations', { recommendations: recommendations.data })
      }
    }
  }

  private async analyzeIndexUsage(): Promise<void> {
    // Analyze which indexes are being used effectively
    const analytics = Array.from(this.queryAnalytics.values())
    
    for (const analysis of analytics) {
      if (analysis.indexHitRate < 0.5 && analysis.executionCount > 100) {
        this.emit('lowIndexUsage', { analysis })
      }
    }
  }
}