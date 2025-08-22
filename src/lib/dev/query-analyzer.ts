/**
 * Database Query Analyzer
 * Advanced database optimization and query performance analysis tool
 */

import { Logger } from '../logging/logger'
import { businessMetrics } from '../telemetry/business-metrics'

const logger = Logger.getLogger('QueryAnalyzer')

// Query analysis interfaces
export interface QueryAnalysisResult {
  query: string
  sanitizedQuery: string
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT' | 'UNKNOWN'
  tables: string[]
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex'
  estimatedCost: number
  potentialIssues: QueryIssue[]
  optimizationSuggestions: OptimizationSuggestion[]
  indexRecommendations: IndexRecommendation[]
  performance: QueryPerformanceMetrics
}

export interface QueryIssue {
  type: 'performance' | 'security' | 'maintainability' | 'correctness'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location?: string
  suggestion: string
}

export interface OptimizationSuggestion {
  type: 'index' | 'rewrite' | 'pagination' | 'join' | 'cache' | 'partition'
  priority: 'low' | 'medium' | 'high'
  description: string
  expectedImprovement: string
  implementationComplexity: 'easy' | 'medium' | 'hard'
}

export interface IndexRecommendation {
  table: string
  columns: string[]
  indexType: 'btree' | 'hash' | 'gin' | 'gist' | 'partial' | 'unique'
  reason: string
  estimatedBenefit: 'low' | 'medium' | 'high'
  creationSQL: string
}

export interface QueryPerformanceMetrics {
  executionTime?: number
  planningTime?: number
  bufferHits?: number
  bufferReads?: number
  tempFiles?: number
  tempBytes?: number
  rows?: number
  cost?: number
}

export interface TableSchema {
  name: string
  columns: ColumnDefinition[]
  indexes: IndexDefinition[]
  constraints: ConstraintDefinition[]
  statistics: TableStatistics
}

export interface ColumnDefinition {
  name: string
  type: string
  nullable: boolean
  default?: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  referencedTable?: string
  referencedColumn?: string
}

export interface IndexDefinition {
  name: string
  columns: string[]
  type: string
  isUnique: boolean
  isPartial: boolean
  condition?: string
  size: number
  usage: IndexUsageStats
}

export interface ConstraintDefinition {
  name: string
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check'
  columns: string[]
  referencedTable?: string
  referencedColumns?: string[]
}

export interface TableStatistics {
  rowCount: number
  size: number
  lastAnalyze?: Date
  mostUsedColumns: string[]
  selectivity: Record<string, number>
}

export interface IndexUsageStats {
  scans: number
  tuplesRead: number
  tuplesReturned: number
  lastUsed?: Date
  efficiency: number
}

// Main Query Analyzer class
export class DatabaseQueryAnalyzer {
  private schemaCache = new Map<string, TableSchema>()
  private queryHistory: QueryAnalysisResult[] = []
  private performanceBaseline = new Map<string, QueryPerformanceMetrics>()

  constructor() {
    // Load schema cache on initialization
    this.initializeSchemaCache()
  }

  /**
   * Analyze a SQL query for optimization opportunities
   */
  async analyzeQuery(
    query: string,
    parameters?: any[],
    executionMetrics?: QueryPerformanceMetrics
  ): Promise<QueryAnalysisResult> {
    const startTime = performance.now()

    // Parse and normalize query
    const sanitized = this.sanitizeQuery(query)
    const parsed = this.parseQuery(sanitized)
    
    // Extract query components
    const queryType = this.detectQueryType(sanitized)
    const tables = this.extractTables(sanitized)
    const complexity = this.assessComplexity(sanitized, parsed)
    
    // Analyze for issues and optimizations
    const potentialIssues = await this.detectIssues(sanitized, parsed, tables)
    const optimizationSuggestions = await this.generateOptimizations(sanitized, parsed, tables)
    const indexRecommendations = await this.recommendIndexes(sanitized, parsed, tables)
    
    // Calculate estimated cost
    const estimatedCost = this.calculateQueryCost(sanitized, parsed)
    
    const result: QueryAnalysisResult = {
      query,
      sanitizedQuery: sanitized,
      queryType,
      tables,
      complexity,
      estimatedCost,
      potentialIssues,
      optimizationSuggestions,
      indexRecommendations,
      performance: executionMetrics || {
        executionTime: performance.now() - startTime
      }
    }

    // Store in history
    this.queryHistory.push(result)
    if (this.queryHistory.length > 1000) {
      this.queryHistory.splice(0, this.queryHistory.length - 1000)
    }

    // Record metrics
    businessMetrics.record('query_analysis_complexity', this.complexityToNumber(complexity), {
      query_type: queryType,
      table_count: tables.length.toString(),
      issues_count: potentialIssues.length.toString()
    })

    logger.debug('Query analyzed', {
      queryType,
      complexity,
      issuesFound: potentialIssues.length,
      optimizationsFound: optimizationSuggestions.length
    })

    return result
  }

  /**
   * Analyze table schema and suggest optimizations
   */
  async analyzeTable(tableName: string): Promise<{
    schema: TableSchema
    issues: QueryIssue[]
    recommendations: OptimizationSuggestion[]
    indexOptimizations: IndexRecommendation[]
  }> {
    const schema = await this.getTableSchema(tableName)
    
    const issues = this.analyzeTableIssues(schema)
    const recommendations = this.generateTableOptimizations(schema)
    const indexOptimizations = this.optimizeTableIndexes(schema)

    return {
      schema,
      issues,
      recommendations,
      indexOptimizations
    }
  }

  /**
   * Compare query performance against baseline
   */
  comparePerformance(query: string, currentMetrics: QueryPerformanceMetrics): {
    improvement: number
    status: 'better' | 'worse' | 'similar'
    recommendation: string
  } {
    const baseline = this.performanceBaseline.get(this.normalizeQuery(query))
    
    if (!baseline || !baseline.executionTime || !currentMetrics.executionTime) {
      return {
        improvement: 0,
        status: 'similar',
        recommendation: 'No baseline available for comparison'
      }
    }

    const improvement = ((baseline.executionTime - currentMetrics.executionTime) / baseline.executionTime) * 100
    let status: 'better' | 'worse' | 'similar'
    let recommendation: string

    if (improvement > 10) {
      status = 'better'
      recommendation = `Query performance improved by ${improvement.toFixed(1)}%`
    } else if (improvement < -10) {
      status = 'worse'
      recommendation = `Query performance degraded by ${Math.abs(improvement).toFixed(1)}%`
    } else {
      status = 'similar'
      recommendation = 'Query performance is similar to baseline'
    }

    return { improvement, status, recommendation }
  }

  /**
   * Generate comprehensive database optimization report
   */
  generateOptimizationReport(): {
    summary: {
      totalQueries: number
      averageComplexity: string
      topIssues: { type: string; count: number }[]
      improvementOpportunities: number
    }
    slowQueries: QueryAnalysisResult[]
    indexRecommendations: IndexRecommendation[]
    schemaIssues: { table: string; issues: QueryIssue[] }[]
    bestPracticesViolations: QueryIssue[]
  } {
    const totalQueries = this.queryHistory.length
    const complexities = this.queryHistory.map(q => q.complexity)
    const averageComplexity = this.calculateAverageComplexity(complexities)

    // Count issue types
    const issueTypes = new Map<string, number>()
    this.queryHistory.forEach(result => {
      result.potentialIssues.forEach(issue => {
        issueTypes.set(issue.type, (issueTypes.get(issue.type) || 0) + 1)
      })
    })

    const topIssues = Array.from(issueTypes.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Find slow queries (top 10%)
    const sortedByTime = this.queryHistory
      .filter(q => q.performance.executionTime)
      .sort((a, b) => (b.performance.executionTime || 0) - (a.performance.executionTime || 0))
    const slowQueries = sortedByTime.slice(0, Math.ceil(sortedByTime.length * 0.1))

    // Aggregate index recommendations
    const allIndexRecommendations = this.queryHistory
      .flatMap(q => q.indexRecommendations)
      .filter((rec, index, arr) => 
        arr.findIndex(r => r.table === rec.table && r.columns.join(',') === rec.columns.join(',')) === index
      )

    const improvementOpportunities = this.queryHistory
      .reduce((sum, q) => sum + q.optimizationSuggestions.length, 0)

    return {
      summary: {
        totalQueries,
        averageComplexity,
        topIssues,
        improvementOpportunities
      },
      slowQueries,
      indexRecommendations: allIndexRecommendations,
      schemaIssues: [],
      bestPracticesViolations: this.queryHistory
        .flatMap(q => q.potentialIssues)
        .filter(issue => issue.type === 'maintainability' || issue.severity === 'high')
    }
  }

  /**
   * Track query performance baseline
   */
  updatePerformanceBaseline(query: string, metrics: QueryPerformanceMetrics): void {
    const normalized = this.normalizeQuery(query)
    const existing = this.performanceBaseline.get(normalized)
    
    if (!existing || !existing.executionTime || 
        (metrics.executionTime && metrics.executionTime < existing.executionTime)) {
      this.performanceBaseline.set(normalized, metrics)
    }
  }

  /**
   * Private helper methods
   */
  private async initializeSchemaCache(): Promise<void> {
    // This would typically load from database INFORMATION_SCHEMA
    // For now, we'll use mock data
    logger.debug('Initializing schema cache...')
  }

  private sanitizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  }

  private parseQuery(query: string): any {
    // Simple query parsing - in production, use a proper SQL parser
    return {
      type: this.detectQueryType(query),
      tables: this.extractTables(query),
      columns: this.extractColumns(query),
      conditions: this.extractConditions(query),
      joins: this.extractJoins(query),
      orderBy: query.includes('order by'),
      groupBy: query.includes('group by'),
      having: query.includes('having'),
      limit: this.extractLimit(query)
    }
  }

  private detectQueryType(query: string): QueryAnalysisResult['queryType'] {
    const q = query.toLowerCase().trim()
    if (q.startsWith('select')) return 'SELECT'
    if (q.startsWith('insert')) return 'INSERT'
    if (q.startsWith('update')) return 'UPDATE'
    if (q.startsWith('delete')) return 'DELETE'
    if (q.includes('on conflict') || q.includes('on duplicate')) return 'UPSERT'
    return 'UNKNOWN'
  }

  private extractTables(query: string): string[] {
    const tables: string[] = []
    const q = query.toLowerCase()
    
    // Extract FROM clause tables
    const fromMatch = q.match(/from\s+(\w+)/g)
    if (fromMatch) {
      tables.push(...fromMatch.map(m => m.replace(/from\s+/, '')))
    }
    
    // Extract JOIN tables
    const joinMatch = q.match(/join\s+(\w+)/g)
    if (joinMatch) {
      tables.push(...joinMatch.map(m => m.replace(/join\s+/, '')))
    }
    
    // Extract UPDATE tables
    const updateMatch = q.match(/update\s+(\w+)/g)
    if (updateMatch) {
      tables.push(...updateMatch.map(m => m.replace(/update\s+/, '')))
    }
    
    return [...new Set(tables)]
  }

  private extractColumns(query: string): string[] {
    // Simple column extraction - would need proper parser for complex queries
    const selectMatch = query.match(/select\s+(.*?)\s+from/i)
    if (!selectMatch) return []
    
    return selectMatch[1]
      .split(',')
      .map(col => col.trim().replace(/.*\s+as\s+/i, ''))
      .filter(col => col !== '*')
  }

  private extractConditions(query: string): string[] {
    const whereMatch = query.match(/where\s+(.*?)(?:\s+(?:order|group|limit|$))/i)
    return whereMatch ? [whereMatch[1]] : []
  }

  private extractJoins(query: string): string[] {
    const joinMatches = query.match(/\b(?:inner|left|right|full|cross)\s+join\b/gi)
    return joinMatches || []
  }

  private extractLimit(query: string): number | null {
    const limitMatch = query.match(/limit\s+(\d+)/i)
    return limitMatch ? parseInt(limitMatch[1]) : null
  }

  private assessComplexity(query: string, parsed: any): QueryAnalysisResult['complexity'] {
    let score = 0
    
    // Base complexity
    if (parsed.joins?.length > 0) score += parsed.joins.length * 2
    if (parsed.orderBy) score += 1
    if (parsed.groupBy) score += 2
    if (parsed.having) score += 2
    if (parsed.tables.length > 3) score += parsed.tables.length
    
    // Subqueries
    const subqueryCount = (query.match(/\(/g) || []).length
    score += subqueryCount * 3
    
    // Functions and expressions
    const functionCount = (query.match(/\w+\(/g) || []).length
    score += functionCount
    
    if (score <= 3) return 'simple'
    if (score <= 8) return 'moderate' 
    if (score <= 15) return 'complex'
    return 'very_complex'
  }

  private calculateQueryCost(query: string, parsed: any): number {
    // Simplified cost calculation
    let cost = 1
    
    cost += parsed.tables.length * 10
    cost += (parsed.joins?.length || 0) * 50
    cost += parsed.orderBy ? 20 : 0
    cost += parsed.groupBy ? 30 : 0
    
    return cost
  }

  private async detectIssues(query: string, parsed: any, tables: string[]): Promise<QueryIssue[]> {
    const issues: QueryIssue[] = []
    
    // Missing WHERE clause in UPDATE/DELETE
    if ((parsed.type === 'UPDATE' || parsed.type === 'DELETE') && 
        !query.includes('where')) {
      issues.push({
        type: 'correctness',
        severity: 'high',
        description: 'Missing WHERE clause in UPDATE/DELETE statement',
        suggestion: 'Always use WHERE clause to prevent unintended bulk operations'
      })
    }
    
    // SELECT without LIMIT
    if (parsed.type === 'SELECT' && !parsed.limit && !query.includes('count(')) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        description: 'SELECT without LIMIT clause may return excessive rows',
        suggestion: 'Consider adding LIMIT clause or pagination'
      })
    }
    
    // Potential SQL injection
    if (query.includes("'") && !query.match(/'[^']*'/)) {
      issues.push({
        type: 'security',
        severity: 'critical',
        description: 'Potential SQL injection vulnerability',
        suggestion: 'Use parameterized queries instead of string concatenation'
      })
    }
    
    // Missing indexes for JOIN conditions
    for (const table of tables) {
      const schema = this.schemaCache.get(table)
      if (schema) {
        // Check if JOIN columns have indexes
        // This is simplified - would need proper analysis
      }
    }
    
    return issues
  }

  private async generateOptimizations(query: string, parsed: any, tables: string[]): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest pagination for large result sets
    if (parsed.type === 'SELECT' && !parsed.limit) {
      suggestions.push({
        type: 'pagination',
        priority: 'medium',
        description: 'Implement pagination to reduce memory usage and improve response times',
        expectedImprovement: 'Reduced memory usage by 80-90%',
        implementationComplexity: 'easy'
      })
    }
    
    // Suggest caching for repeated queries
    if (this.isRepeatQuery(query)) {
      suggestions.push({
        type: 'cache',
        priority: 'high',
        description: 'Cache results for frequently executed query',
        expectedImprovement: 'Response time improvement of 70-95%',
        implementationComplexity: 'medium'
      })
    }
    
    // Suggest query rewrite for complex JOINs
    if (parsed.joins && parsed.joins.length > 3) {
      suggestions.push({
        type: 'rewrite',
        priority: 'medium',
        description: 'Consider breaking complex JOIN into multiple simpler queries',
        expectedImprovement: 'Improved query planning and execution',
        implementationComplexity: 'hard'
      })
    }
    
    return suggestions
  }

  private async recommendIndexes(query: string, parsed: any, tables: string[]): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = []
    
    // Analyze WHERE conditions for index opportunities
    for (const table of tables) {
      const whereColumns = this.extractWhereColumns(query, table)
      if (whereColumns.length > 0) {
        recommendations.push({
          table,
          columns: whereColumns,
          indexType: 'btree',
          reason: 'Optimize WHERE clause filtering',
          estimatedBenefit: 'high',
          creationSQL: `CREATE INDEX idx_${table}_${whereColumns.join('_')} ON ${table} (${whereColumns.join(', ')})`
        })
      }
    }
    
    return recommendations
  }

  private extractWhereColumns(query: string, table: string): string[] {
    // Simplified extraction - would need proper SQL parser
    const whereMatch = query.match(/where\s+(.*?)(?:\s+(?:order|group|limit|$))/i)
    if (!whereMatch) return []
    
    const conditions = whereMatch[1]
    const columns: string[] = []
    
    // Extract column names from conditions
    const columnMatches = conditions.match(/(\w+)\s*[=<>!]/g)
    if (columnMatches) {
      columns.push(...columnMatches.map(m => m.replace(/\s*[=<>!].*/, '')))
    }
    
    return [...new Set(columns)]
  }

  private async getTableSchema(tableName: string): Promise<TableSchema> {
    let schema = this.schemaCache.get(tableName)
    
    if (!schema) {
      // In production, this would query INFORMATION_SCHEMA
      schema = {
        name: tableName,
        columns: [],
        indexes: [],
        constraints: [],
        statistics: {
          rowCount: 0,
          size: 0,
          mostUsedColumns: [],
          selectivity: {}
        }
      }
      
      this.schemaCache.set(tableName, schema)
    }
    
    return schema
  }

  private analyzeTableIssues(schema: TableSchema): QueryIssue[] {
    const issues: QueryIssue[] = []
    
    // Check for missing primary key
    const hasPrimaryKey = schema.columns.some(col => col.isPrimaryKey)
    if (!hasPrimaryKey) {
      issues.push({
        type: 'maintainability',
        severity: 'high',
        description: 'Table missing primary key',
        suggestion: 'Add a primary key column for better data integrity and replication'
      })
    }
    
    // Check for unused indexes
    const unusedIndexes = schema.indexes.filter(idx => 
      idx.usage.scans === 0 && idx.usage.lastUsed && 
      idx.usage.lastUsed < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    )
    
    if (unusedIndexes.length > 0) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        description: `Found ${unusedIndexes.length} unused indexes`,
        suggestion: 'Consider dropping unused indexes to improve write performance'
      })
    }
    
    return issues
  }

  private generateTableOptimizations(schema: TableSchema): OptimizationSuggestion[] {
    const recommendations: OptimizationSuggestion[] = []
    
    // Large table partitioning
    if (schema.statistics.rowCount > 1000000) {
      recommendations.push({
        type: 'partition',
        priority: 'high',
        description: 'Large table could benefit from partitioning',
        expectedImprovement: 'Query performance improvement of 50-80%',
        implementationComplexity: 'hard'
      })
    }
    
    return recommendations
  }

  private optimizeTableIndexes(schema: TableSchema): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = []
    
    // Analyze column selectivity for index recommendations
    for (const [column, selectivity] of Object.entries(schema.statistics.selectivity)) {
      if (selectivity > 0.1 && selectivity < 0.9) { // Good selectivity for indexing
        const hasIndex = schema.indexes.some(idx => 
          idx.columns.length === 1 && idx.columns[0] === column
        )
        
        if (!hasIndex) {
          recommendations.push({
            table: schema.name,
            columns: [column],
            indexType: 'btree',
            reason: `High selectivity column (${(selectivity * 100).toFixed(1)}%) without index`,
            estimatedBenefit: 'high',
            creationSQL: `CREATE INDEX idx_${schema.name}_${column} ON ${schema.name} (${column})`
          })
        }
      }
    }
    
    return recommendations
  }

  private normalizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/\d+/g, 'N')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  }

  private isRepeatQuery(query: string): boolean {
    const normalized = this.normalizeQuery(query)
    const occurrences = this.queryHistory.filter(q => 
      this.normalizeQuery(q.query) === normalized
    ).length
    
    return occurrences > 3
  }

  private complexityToNumber(complexity: string): number {
    switch (complexity) {
      case 'simple': return 1
      case 'moderate': return 2
      case 'complex': return 3
      case 'very_complex': return 4
      default: return 0
    }
  }

  private calculateAverageComplexity(complexities: string[]): string {
    if (complexities.length === 0) return 'simple'
    
    const sum = complexities.reduce((acc, c) => acc + this.complexityToNumber(c), 0)
    const avg = sum / complexities.length
    
    if (avg <= 1.5) return 'simple'
    if (avg <= 2.5) return 'moderate'
    if (avg <= 3.5) return 'complex'
    return 'very_complex'
  }
}

// Export singleton instance
export const queryAnalyzer = new DatabaseQueryAnalyzer()

// Decorator for automatic query analysis
export function AnalyzeQuery(options: {
  trackPerformance?: boolean
  enableOptimizations?: boolean
  alertOnSlowQuery?: boolean
  slowQueryThreshold?: number
} = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const slowQueryThreshold = options.slowQueryThreshold || 1000 // 1 second

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now()
      let result: any
      let error: Error | null = null

      try {
        result = await method.apply(this, args)
        return result
      } catch (err) {
        error = err instanceof Error ? err : new Error('Unknown error')
        throw err
      } finally {
        const executionTime = performance.now() - startTime
        
        if (args[0] && typeof args[0] === 'string') {
          const analysis = await queryAnalyzer.analyzeQuery(args[0], args[1], {
            executionTime,
            rows: Array.isArray(result) ? result.length : result ? 1 : 0
          })

          if (options.trackPerformance) {
            queryAnalyzer.updatePerformanceBaseline(args[0], { executionTime })
          }

          if (options.alertOnSlowQuery && executionTime > slowQueryThreshold) {
            logger.warn('Slow query detected', {
              query: analysis.sanitizedQuery,
              executionTime,
              complexity: analysis.complexity,
              suggestions: analysis.optimizationSuggestions.length
            })
          }
        }
      }
    }

    return descriptor
  }
}