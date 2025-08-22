/**
 * Database Query Analyzer
 * Analyzes database queries for performance optimization opportunities
 */

// import { createEnhancedAdminClient } from './enhanced-client' // Temporarily disabled for build compatibility
import { createClient } from '@supabase/supabase-js'
// import { telemetry } from '@/lib/telemetry' // Temporarily disabled for build compatibility

interface QueryAnalysis {
  query: string
  table: string
  averageDuration: number
  callCount: number
  p95Duration: number
  p99Duration: number
  optimization: {
    needsIndex: boolean
    suggestedIndexes: string[]
    queryOptimization: string[]
    estimatedImprovement: string
  }
}

interface TableAnalysis {
  table: string
  rowCount: number
  tableSize: string
  indexCount: number
  missingIndexes: string[]
  slowQueries: QueryAnalysis[]
  recommendedOptimizations: string[]
}

interface DatabaseAnalysis {
  timestamp: string
  totalQueries: number
  slowQueries: number
  averageQueryTime: number
  tables: TableAnalysis[]
  globalOptimizations: string[]
  performanceScore: number
}

export class DatabaseQueryAnalyzer {
  private adminClient = createClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!
  )

  /**
   * Analyze database performance and query patterns
   */
  async analyzeDatabase(): Promise<DatabaseAnalysis> {
    console.log('Starting database analysis...')
    
    try {
      const [tableStats, queryStats, indexAnalysis] = await Promise.all([
        this.getTableStatistics(),
        this.getQueryStatistics(),
        this.analyzeIndexUsage()
      ])

      const tables = await this.analyzeIndividualTables(tableStats)
      const slowQueries = this.identifySlowQueries(queryStats)
      
      const analysis: DatabaseAnalysis = {
        timestamp: new Date().toISOString(),
        totalQueries: queryStats.totalQueries,
        slowQueries: slowQueries.length,
        averageQueryTime: queryStats.averageTime,
        tables,
        globalOptimizations: this.generateGlobalOptimizations(tables),
        performanceScore: this.calculatePerformanceScore(tables, slowQueries)
      }

      console.log(`Database analysis completed. Performance score: ${analysis.performanceScore}/100`)
      return analysis

    } catch (error) {
      console.error('Database analysis failed:', error)
      // telemetry.recordError(error as Error) // Temporarily disabled for build compatibility
      throw error
    }
  }

  /**
   * Get table statistics from information schema
   */
  private async getTableStatistics() {
    try {
      const { data: tables, error } = await this.adminClient.rpc('get_table_stats')
      
      if (error) {
        console.warn('Could not get table statistics, using fallback method')
        return await this.getTableStatisticsFallback()
      }
      
      return tables || []
    } catch (error) {
      console.warn('Table statistics query failed, using fallback')
      return await this.getTableStatisticsFallback()
    }
  }

  /**
   * Fallback method to get basic table info
   */
  private async getTableStatisticsFallback() {
    const commonTables = [
      'users', 'organizations', 'organization_members', 
      'board_packs', 'vaults', 'vault_members', 
      'meetings', 'audit_logs', 'notifications'
    ]

    const tableStats = []
    
    for (const table of commonTables) {
      try {
        const { count, error } = await this.adminClient.raw
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (!error) {
          tableStats.push({
            table_name: table,
            row_count: count || 0,
            table_size: 'Unknown',
            index_count: 0
          })
        }
      } catch (error) {
        console.warn(`Could not get stats for table ${table}:`, error)
      }
    }
    
    return tableStats
  }

  /**
   * Get query performance statistics
   */
  private async getQueryStatistics() {
    // In a real implementation, you'd query pg_stat_statements
    // For now, return mock data structure
    return {
      totalQueries: 1000,
      averageTime: 150,
      queries: []
    }
  }

  /**
   * Analyze index usage patterns
   */
  private async analyzeIndexUsage() {
    try {
      // This would query pg_stat_user_indexes in a real implementation
      const { data, error } = await this.adminClient.rpc('analyze_index_usage')
      
      if (error) {
        console.warn('Index usage analysis failed:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.warn('Index analysis not available')
      return []
    }
  }

  /**
   * Analyze individual tables for optimization opportunities
   */
  private async analyzeIndividualTables(tableStats: any[]): Promise<TableAnalysis[]> {
    const analyses: TableAnalysis[] = []
    
    for (const table of tableStats) {
      const analysis = await this.analyzeTable(table)
      analyses.push(analysis)
    }
    
    return analyses.sort((a, b) => b.rowCount - a.rowCount)
  }

  /**
   * Analyze a specific table
   */
  private async analyzeTable(tableStats: any): Promise<TableAnalysis> {
    const tableName = tableStats.table_name
    const rowCount = tableStats.row_count || 0
    
    const missingIndexes = this.identifyMissingIndexes(tableName, rowCount)
    const recommendations = this.generateTableRecommendations(tableName, rowCount, missingIndexes)
    
    return {
      table: tableName,
      rowCount,
      tableSize: tableStats.table_size || 'Unknown',
      indexCount: tableStats.index_count || 0,
      missingIndexes,
      slowQueries: [], // Would be populated from pg_stat_statements
      recommendedOptimizations: recommendations
    }
  }

  /**
   * Identify missing indexes based on common patterns
   */
  private identifyMissingIndexes(tableName: string, rowCount: number): string[] {
    const indexes: string[] = []
    
    // High-value indexes for specific tables
    const indexRecommendations: Record<string, string[]> = {
      'board_packs': [
        'CREATE INDEX idx_board_packs_organization_id ON board_packs(organization_id)',
        'CREATE INDEX idx_board_packs_uploaded_by ON board_packs(uploaded_by)',
        'CREATE INDEX idx_board_packs_category ON board_packs(category)',
        'CREATE INDEX idx_board_packs_created_at ON board_packs(created_at DESC)',
        'CREATE INDEX idx_board_packs_status ON board_packs(status) WHERE status IS NOT NULL'
      ],
      'users': [
        'CREATE INDEX idx_users_email ON users(email)',
        'CREATE INDEX idx_users_last_sign_in ON users(last_sign_in_at DESC)',
        'CREATE INDEX idx_users_created_at ON users(created_at DESC)'
      ],
      'organization_members': [
        'CREATE INDEX idx_org_members_org_id ON organization_members(organization_id)',
        'CREATE INDEX idx_org_members_user_id ON organization_members(user_id)',
        'CREATE INDEX idx_org_members_status ON organization_members(status)',
        'CREATE INDEX idx_org_members_composite ON organization_members(organization_id, user_id, status)'
      ],
      'vault_members': [
        'CREATE INDEX idx_vault_members_vault_id ON vault_members(vault_id)',
        'CREATE INDEX idx_vault_members_user_id ON vault_members(user_id)',
        'CREATE INDEX idx_vault_members_composite ON vault_members(vault_id, user_id)'
      ],
      'audit_logs': [
        'CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id)',
        'CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC)',
        'CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type)',
        'CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id)'
      ],
      'notifications': [
        'CREATE INDEX idx_notifications_user_id ON notifications(user_id)',
        'CREATE INDEX idx_notifications_read_at ON notifications(read_at)',
        'CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC)',
        'CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL'
      ],
      'meetings': [
        'CREATE INDEX idx_meetings_scheduled_start ON meetings(scheduled_start)',
        'CREATE INDEX idx_meetings_organization_id ON meetings(organization_id)',
        'CREATE INDEX idx_meetings_created_by ON meetings(created_by)'
      ]
    }

    // Only recommend indexes for tables with significant data
    if (rowCount > 100 && indexRecommendations[tableName]) {
      indexes.push(...indexRecommendations[tableName])
    }

    return indexes
  }

  /**
   * Generate table-specific optimization recommendations
   */
  private generateTableRecommendations(tableName: string, rowCount: number, missingIndexes: string[]): string[] {
    const recommendations: string[] = []

    if (rowCount > 10000) {
      recommendations.push(`Consider partitioning ${tableName} table due to high row count (${rowCount.toLocaleString()} rows)`)
    }

    if (missingIndexes.length > 0) {
      recommendations.push(`Add ${missingIndexes.length} missing indexes to improve query performance`)
    }

    // Table-specific recommendations
    if (tableName === 'board_packs' && rowCount > 1000) {
      recommendations.push('Consider implementing full-text search for board pack titles and descriptions')
      recommendations.push('Add composite index for common filter combinations (category, status, organization_id)')
    }

    if (tableName === 'audit_logs' && rowCount > 10000) {
      recommendations.push('Implement audit log archiving for records older than 1 year')
      recommendations.push('Consider using time-series database for audit logs')
    }

    if (tableName === 'notifications' && rowCount > 5000) {
      recommendations.push('Implement notification cleanup for read notifications older than 30 days')
    }

    return recommendations
  }

  /**
   * Identify slow queries from monitoring data
   */
  private identifySlowQueries(queryStats: any): QueryAnalysis[] {
    // Would integrate with pg_stat_statements in a real implementation
    return []
  }

  /**
   * Generate global database optimizations
   */
  private generateGlobalOptimizations(tables: TableAnalysis[]): string[] {
    const optimizations: string[] = []

    const totalRows = tables.reduce((sum, table) => sum + table.rowCount, 0)
    const tablesNeedingIndexes = tables.filter(table => table.missingIndexes.length > 0)

    if (totalRows > 100000) {
      optimizations.push('Consider implementing read replicas for heavy read workloads')
      optimizations.push('Implement connection pooling to reduce connection overhead')
    }

    if (tablesNeedingIndexes.length > 0) {
      optimizations.push(`${tablesNeedingIndexes.length} tables would benefit from additional indexes`)
    }

    optimizations.push('Enable query plan caching for frequently executed queries')
    optimizations.push('Consider implementing query result caching for expensive operations')
    optimizations.push('Review and optimize long-running queries during low-traffic periods')

    return optimizations
  }

  /**
   * Calculate overall database performance score
   */
  private calculatePerformanceScore(tables: TableAnalysis[], slowQueries: QueryAnalysis[]): number {
    let score = 100

    // Penalize for missing indexes
    const totalMissingIndexes = tables.reduce((sum, table) => sum + table.missingIndexes.length, 0)
    score -= Math.min(totalMissingIndexes * 2, 30) // Max 30 point deduction

    // Penalize for slow queries
    score -= Math.min(slowQueries.length * 5, 25) // Max 25 point deduction

    // Penalize for large tables without optimization
    const largeTablesWithoutIndexes = tables.filter(table => 
      table.rowCount > 10000 && table.missingIndexes.length > 2
    ).length
    score -= largeTablesWithoutIndexes * 10

    return Math.max(score, 0)
  }

  /**
   * Generate optimization SQL script
   */
  async generateOptimizationScript(): Promise<string> {
    const analysis = await this.analyzeDatabase()
    
    let script = `-- Database Optimization Script
-- Generated on ${analysis.timestamp}
-- Performance Score: ${analysis.performanceScore}/100

-- IMPORTANT: Run these optimizations during low-traffic periods
-- Test in staging environment before applying to production

BEGIN;

`

    // Add missing indexes
    for (const table of analysis.tables) {
      if (table.missingIndexes.length > 0) {
        script += `-- Optimize ${table.table} table (${table.rowCount.toLocaleString()} rows)\n`
        for (const index of table.missingIndexes) {
          script += `${index};\n`
        }
        script += '\n'
      }
    }

    // Add table-specific optimizations
    script += '-- Table-specific optimizations\n'
    for (const table of analysis.tables) {
      if (table.recommendedOptimizations.length > 0) {
        script += `-- ${table.table}:\n`
        for (const recommendation of table.recommendedOptimizations) {
          script += `-- ${recommendation}\n`
        }
        script += '\n'
      }
    }

    script += `COMMIT;

-- Global optimization recommendations:
${analysis.globalOptimizations.map(opt => `-- ${opt}`).join('\n')}
`

    return script
  }
}

export const queryAnalyzer = new DatabaseQueryAnalyzer()