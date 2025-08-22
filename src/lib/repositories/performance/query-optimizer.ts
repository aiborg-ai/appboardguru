/**
 * Query Optimization Analyzer
 * Analyzes queries for performance bottlenecks and suggests optimizations
 */

import { Result, success, failure, RepositoryError } from '../result'

// Query analysis types
export interface QueryPlan {
  query: string
  estimatedCost: number
  estimatedRows: number
  executionTime?: number
  actualRows?: number
  indexUsage: IndexUsage[]
  joins: JoinAnalysis[]
  filters: FilterAnalysis[]
  sorting: SortAnalysis[]
  aggregations: AggregationAnalysis[]
}

export interface IndexUsage {
  table: string
  index: string
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin'
  used: boolean
  effectiveness: 'high' | 'medium' | 'low'
  cardinality?: number
}

export interface JoinAnalysis {
  type: 'inner' | 'left' | 'right' | 'full' | 'cross'
  tables: string[]
  condition: string
  estimatedRows: number
  joinMethod: 'nested_loop' | 'hash_join' | 'merge_join'
  cost: number
}

export interface FilterAnalysis {
  column: string
  operator: string
  selectivity: number
  indexAvailable: boolean
  indexUsed: boolean
}

export interface SortAnalysis {
  columns: string[]
  direction: 'asc' | 'desc'
  cost: number
  memoryUsage: number
  spillsToDisk: boolean
}

export interface AggregationAnalysis {
  functions: string[]
  groupBy: string[]
  having: string[]
  estimatedGroups: number
  memoryUsage: number
}

// Optimization suggestion types
export interface OptimizationSuggestion {
  type: 'index' | 'query_rewrite' | 'schema' | 'configuration'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  effort: string
  before: string
  after: string
  estimatedImprovement: number // percentage
  metadata?: Record<string, any>
}

export interface QueryPattern {
  pattern: RegExp
  description: string
  issues: string[]
  suggestions: OptimizationSuggestion[]
}

/**
 * Query performance analyzer and optimizer
 */
export class QueryAnalyzer {
  private queryPatterns: QueryPattern[] = []
  private indexRecommendations: Map<string, string[]> = new Map()
  private queryCache: Map<string, QueryPlan> = new Map()

  constructor() {
    this.initializePatterns()
  }

  /**
   * Analyze a query for performance issues
   */
  async analyzeQuery(
    query: string,
    params?: any[],
    executionStats?: { time: number; rowCount: number }
  ): Promise<Result<{
    plan: QueryPlan
    suggestions: OptimizationSuggestion[]
    score: number
  }>> {
    try {
      // Parse and analyze the query
      const plan = await this.createQueryPlan(query, params, executionStats)
      const suggestions = this.generateSuggestions(query, plan)
      const score = this.calculatePerformanceScore(plan, suggestions)

      return success({ plan, suggestions, score })
    } catch (error) {
      return failure(RepositoryError.internal('Query analysis failed', error))
    }
  }

  /**
   * Batch analyze multiple queries
   */
  async analyzeQueries(
    queries: Array<{ query: string; params?: any[]; stats?: { time: number; rowCount: number } }>
  ): Promise<Result<Array<{
    query: string
    plan: QueryPlan
    suggestions: OptimizationSuggestion[]
    score: number
  }>>> {
    const results = await Promise.allSettled(
      queries.map(async ({ query, params, stats }) => {
        const analysis = await this.analyzeQuery(query, params, stats)
        if (analysis.success) {
          return {
            query,
            ...analysis.data
          }
        }
        throw analysis.error
      })
    )

    const successful = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)

    const failed = results.filter(result => result.status === 'rejected')
    
    if (failed.length > 0) {
      console.warn(`${failed.length} query analyses failed`)
    }

    return success(successful)
  }

  /**
   * Generate index recommendations for a set of queries
   */
  generateIndexRecommendations(
    queries: string[],
    tableStructures: Map<string, TableStructure>
  ): Result<IndexRecommendation[]> {
    try {
      const recommendations: IndexRecommendation[] = []
      const columnUsage = this.analyzeColumnUsage(queries)

      for (const [table, columns] of columnUsage) {
        const structure = tableStructures.get(table)
        if (!structure) continue

        const tableRecommendations = this.generateTableIndexRecommendations(
          table,
          columns,
          structure
        )
        recommendations.push(...tableRecommendations)
      }

      // Sort by priority and estimated impact
      recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority] ||
               b.estimatedImpact - a.estimatedImpact
      })

      return success(recommendations)
    } catch (error) {
      return failure(RepositoryError.internal('Index recommendation generation failed', error))
    }
  }

  /**
   * Suggest query rewrites for better performance
   */
  suggestQueryRewrites(query: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    for (const pattern of this.queryPatterns) {
      if (pattern.pattern.test(query)) {
        suggestions.push(...pattern.suggestions)
      }
    }

    // Common anti-patterns
    suggestions.push(...this.detectAntiPatterns(query))
    
    return suggestions.filter(s => s.type === 'query_rewrite')
  }

  private async createQueryPlan(
    query: string,
    params?: any[],
    executionStats?: { time: number; rowCount: number }
  ): Promise<QueryPlan> {
    // This would typically use EXPLAIN functionality
    // For now, we'll create a mock analysis
    
    const normalizedQuery = query.toLowerCase().trim()
    const cacheKey = this.createCacheKey(normalizedQuery, params)
    
    // Check cache
    const cached = this.queryCache.get(cacheKey)
    if (cached && !executionStats) {
      return cached
    }

    // Analyze query components
    const plan: QueryPlan = {
      query: normalizedQuery,
      estimatedCost: this.estimateQueryCost(normalizedQuery),
      estimatedRows: this.estimateRowCount(normalizedQuery),
      executionTime: executionStats?.time,
      actualRows: executionStats?.rowCount,
      indexUsage: this.analyzeIndexUsage(normalizedQuery),
      joins: this.analyzeJoins(normalizedQuery),
      filters: this.analyzeFilters(normalizedQuery),
      sorting: this.analyzeSorting(normalizedQuery),
      aggregations: this.analyzeAggregations(normalizedQuery)
    }

    // Cache the plan
    this.queryCache.set(cacheKey, plan)
    
    // Limit cache size
    if (this.queryCache.size > 1000) {
      const firstKey = this.queryCache.keys().next().value
      this.queryCache.delete(firstKey)
    }

    return plan
  }

  private generateSuggestions(query: string, plan: QueryPlan): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    // Analyze index usage
    const unusedIndexSuggestions = this.suggestIndexOptimizations(plan.indexUsage)
    suggestions.push(...unusedIndexSuggestions)

    // Analyze joins
    const joinSuggestions = this.suggestJoinOptimizations(plan.joins)
    suggestions.push(...joinSuggestions)

    // Analyze filters
    const filterSuggestions = this.suggestFilterOptimizations(plan.filters)
    suggestions.push(...filterSuggestions)

    // Analyze sorting
    const sortSuggestions = this.suggestSortOptimizations(plan.sorting)
    suggestions.push(...sortSuggestions)

    // Check for query rewrites
    const rewriteSuggestions = this.suggestQueryRewrites(query)
    suggestions.push(...rewriteSuggestions)

    return suggestions
  }

  private calculatePerformanceScore(plan: QueryPlan, suggestions: OptimizationSuggestion[]): number {
    let score = 100 // Start with perfect score

    // Deduct points for high cost
    if (plan.estimatedCost > 1000) score -= 20
    else if (plan.estimatedCost > 500) score -= 10
    else if (plan.estimatedCost > 100) score -= 5

    // Deduct points for unused indexes
    const unusedIndexes = plan.indexUsage.filter(idx => !idx.used).length
    score -= unusedIndexes * 5

    // Deduct points for inefficient joins
    const expensiveJoins = plan.joins.filter(join => join.cost > 1000).length
    score -= expensiveJoins * 10

    // Deduct points for suggestions
    const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high').length
    const mediumPrioritySuggestions = suggestions.filter(s => s.priority === 'medium').length
    
    score -= highPrioritySuggestions * 15
    score -= mediumPrioritySuggestions * 10

    // Bonus points for good practices
    if (plan.indexUsage.some(idx => idx.used && idx.effectiveness === 'high')) {
      score += 5
    }

    return Math.max(0, Math.min(100, score))
  }

  private initializePatterns(): void {
    this.queryPatterns = [
      {
        pattern: /select \* from/i,
        description: 'SELECT * queries',
        issues: ['Retrieves unnecessary columns', 'Impacts network and memory usage'],
        suggestions: [{
          type: 'query_rewrite',
          priority: 'medium',
          title: 'Use specific column selection',
          description: 'Replace SELECT * with specific column names',
          impact: 'Reduces data transfer and memory usage',
          effort: 'Low',
          before: 'SELECT * FROM users',
          after: 'SELECT id, name, email FROM users',
          estimatedImprovement: 15
        }]
      },
      {
        pattern: /where.*like '%.*%'/i,
        description: 'Leading wildcard LIKE queries',
        issues: ['Cannot use indexes effectively', 'Full table scan required'],
        suggestions: [{
          type: 'index',
          priority: 'high',
          title: 'Consider full-text search or trigram indexes',
          description: 'Use specialized search indexes for pattern matching',
          impact: 'Dramatically improves search performance',
          effort: 'Medium',
          before: "WHERE name LIKE '%john%'",
          after: 'WHERE name @@@ \'john\' (with trigram index)',
          estimatedImprovement: 80
        }]
      },
      {
        pattern: /order by.*limit \d+/i,
        description: 'ORDER BY with LIMIT',
        issues: ['May sort entire result set before limiting'],
        suggestions: [{
          type: 'index',
          priority: 'medium',
          title: 'Add index on ORDER BY columns',
          description: 'Create index to avoid full sort',
          impact: 'Faster query execution for sorted limited results',
          effort: 'Low',
          before: 'ORDER BY created_at LIMIT 10',
          after: 'ORDER BY created_at LIMIT 10 (with index on created_at)',
          estimatedImprovement: 50
        }]
      }
    ]
  }

  // Mock analysis methods (would be replaced with actual database analysis)
  private estimateQueryCost(query: string): number {
    // Simple heuristic based on query complexity
    let cost = 10 // Base cost
    
    if (query.includes('join')) cost += 50
    if (query.includes('order by')) cost += 20
    if (query.includes('group by')) cost += 30
    if (query.includes('like')) cost += 25
    if (query.includes('*')) cost += 15
    
    return cost
  }

  private estimateRowCount(query: string): number {
    // Mock estimation - would use actual database statistics
    if (query.includes('limit')) {
      const match = query.match(/limit (\d+)/i)
      return match ? parseInt(match[1]) : 1000
    }
    return 1000 // Default estimate
  }

  private analyzeIndexUsage(query: string): IndexUsage[] {
    // Mock index analysis
    return [
      {
        table: 'users',
        index: 'users_email_idx',
        type: 'btree',
        used: query.includes('email'),
        effectiveness: 'high',
        cardinality: 10000
      }
    ]
  }

  private analyzeJoins(query: string): JoinAnalysis[] {
    const joins: JoinAnalysis[] = []
    const joinPattern = /(inner join|left join|right join|full join)\s+(\w+)/gi
    let match

    while ((match = joinPattern.exec(query)) !== null) {
      joins.push({
        type: match[1].toLowerCase().replace(' join', '') as any,
        tables: [match[2]],
        condition: 'mock condition',
        estimatedRows: 100,
        joinMethod: 'hash_join',
        cost: 50
      })
    }

    return joins
  }

  private analyzeFilters(query: string): FilterAnalysis[] {
    // Mock filter analysis
    return [
      {
        column: 'email',
        operator: '=',
        selectivity: 0.001,
        indexAvailable: true,
        indexUsed: true
      }
    ]
  }

  private analyzeSorting(query: string): SortAnalysis[] {
    if (!query.includes('order by')) return []

    return [{
      columns: ['created_at'],
      direction: 'desc',
      cost: 20,
      memoryUsage: 1024,
      spillsToDisk: false
    }]
  }

  private analyzeAggregations(query: string): AggregationAnalysis[] {
    if (!query.includes('group by') && !query.includes('count(') && 
        !query.includes('sum(') && !query.includes('avg(')) {
      return []
    }

    return [{
      functions: ['count'],
      groupBy: ['status'],
      having: [],
      estimatedGroups: 10,
      memoryUsage: 512
    }]
  }

  private suggestIndexOptimizations(indexUsage: IndexUsage[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    for (const index of indexUsage) {
      if (!index.used && index.effectiveness === 'low') {
        suggestions.push({
          type: 'index',
          priority: 'low',
          title: `Consider removing unused index: ${index.index}`,
          description: 'This index is not being used effectively',
          impact: 'Reduces storage and maintenance overhead',
          effort: 'Low',
          before: `Index exists: ${index.index}`,
          after: `Remove index: ${index.index}`,
          estimatedImprovement: 5
        })
      }
    }

    return suggestions
  }

  private suggestJoinOptimizations(joins: JoinAnalysis[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    for (const join of joins) {
      if (join.cost > 1000) {
        suggestions.push({
          type: 'query_rewrite',
          priority: 'high',
          title: `Optimize expensive ${join.type} join`,
          description: 'This join operation is expensive',
          impact: 'Significantly improves query performance',
          effort: 'Medium',
          before: 'Current join strategy',
          after: 'Optimized join with proper indexing',
          estimatedImprovement: 60
        })
      }
    }

    return suggestions
  }

  private suggestFilterOptimizations(filters: FilterAnalysis[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    for (const filter of filters) {
      if (filter.indexAvailable && !filter.indexUsed) {
        suggestions.push({
          type: 'index',
          priority: 'high',
          title: `Add index for filter on ${filter.column}`,
          description: 'Filter could benefit from an index',
          impact: 'Dramatic improvement in filter performance',
          effort: 'Low',
          before: `Unindexed filter on ${filter.column}`,
          after: `Indexed filter on ${filter.column}`,
          estimatedImprovement: 75
        })
      }
    }

    return suggestions
  }

  private suggestSortOptimizations(sorting: SortAnalysis[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    for (const sort of sorting) {
      if (sort.spillsToDisk) {
        suggestions.push({
          type: 'configuration',
          priority: 'medium',
          title: 'Increase sort memory allocation',
          description: 'Sort operation is spilling to disk',
          impact: 'Faster sorting operations',
          effort: 'Low',
          before: 'Sort spills to disk',
          after: 'Sort completes in memory',
          estimatedImprovement: 40
        })
      }
    }

    return suggestions
  }

  private detectAntiPatterns(query: string): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    // N+1 query pattern detection
    if (this.detectNPlusOnePattern(query)) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'high',
        title: 'Possible N+1 query pattern detected',
        description: 'Consider using joins or batch loading',
        impact: 'Reduces database round trips',
        effort: 'Medium',
        before: 'Multiple single-row queries',
        after: 'Single query with joins',
        estimatedImprovement: 90
      })
    }

    return suggestions
  }

  private detectNPlusOnePattern(query: string): boolean {
    // Simplified N+1 detection
    return query.includes('where id =') && !query.includes('join')
  }

  private analyzeColumnUsage(queries: string[]): Map<string, Set<string>> {
    const usage = new Map<string, Set<string>>()

    for (const query of queries) {
      // Simple pattern matching - would be more sophisticated in practice
      const whereMatches = query.match(/where\s+(\w+\.\w+|\w+)/gi)
      const joinMatches = query.match(/on\s+(\w+\.\w+|\w+)/gi)
      
      // Extract table.column or column references
      const allMatches = [...(whereMatches || []), ...(joinMatches || [])]
      
      for (const match of allMatches) {
        const cleaned = match.replace(/^(where|on)\s+/i, '')
        const [table, column] = cleaned.includes('.') ? 
          cleaned.split('.') : ['unknown', cleaned]
        
        if (!usage.has(table)) {
          usage.set(table, new Set())
        }
        usage.get(table)!.add(column)
      }
    }

    return usage
  }

  private generateTableIndexRecommendations(
    table: string,
    columns: Set<string>,
    structure: TableStructure
  ): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = []

    for (const column of columns) {
      if (!structure.indexes.some(idx => idx.columns.includes(column))) {
        recommendations.push({
          table,
          columns: [column],
          type: 'btree',
          priority: 'medium',
          estimatedImpact: 60,
          reason: `Frequently filtered column ${column} lacks index`
        })
      }
    }

    return recommendations
  }

  private createCacheKey(query: string, params?: any[]): string {
    const paramStr = params ? JSON.stringify(params) : ''
    return `${query}:${paramStr}`
  }
}

// Supporting types
interface TableStructure {
  columns: Array<{ name: string; type: string; nullable: boolean }>
  indexes: Array<{ name: string; columns: string[]; type: string; unique: boolean }>
  foreignKeys: Array<{ column: string; referencedTable: string; referencedColumn: string }>
}

interface IndexRecommendation {
  table: string
  columns: string[]
  type: 'btree' | 'hash' | 'gin' | 'gist'
  priority: 'high' | 'medium' | 'low'
  estimatedImpact: number
  reason: string
}

/**
 * Query optimizer that provides actionable optimization suggestions
 */
export class QueryOptimizer {
  private analyzer: QueryAnalyzer

  constructor() {
    this.analyzer = new QueryAnalyzer()
  }

  /**
   * Get comprehensive optimization report for a query
   */
  async optimizeQuery(query: string, context?: {
    params?: any[]
    executionStats?: { time: number; rowCount: number }
    tableStructures?: Map<string, TableStructure>
  }): Promise<Result<{
    original: QueryPlan
    suggestions: OptimizationSuggestion[]
    optimizedQuery?: string
    estimatedImprovement: number
  }>> {
    const analysisResult = await this.analyzer.analyzeQuery(
      query, 
      context?.params, 
      context?.executionStats
    )

    if (!analysisResult.success) {
      return failure(analysisResult.error)
    }

    const { plan, suggestions } = analysisResult.data

    // Generate optimized query if possible
    const optimizedQuery = this.generateOptimizedQuery(query, suggestions)
    
    // Estimate total improvement
    const estimatedImprovement = suggestions.reduce(
      (total, suggestion) => total + suggestion.estimatedImprovement,
      0
    ) / suggestions.length || 0

    return success({
      original: plan,
      suggestions,
      optimizedQuery,
      estimatedImprovement
    })
  }

  private generateOptimizedQuery(query: string, suggestions: OptimizationSuggestion[]): string | undefined {
    let optimized = query

    // Apply simple query rewrites
    for (const suggestion of suggestions) {
      if (suggestion.type === 'query_rewrite' && suggestion.before && suggestion.after) {
        // Simple string replacement - would be more sophisticated in practice
        optimized = optimized.replace(suggestion.before, suggestion.after)
      }
    }

    return optimized !== query ? optimized : undefined
  }
}