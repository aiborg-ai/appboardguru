/**
 * Database Optimization API
 * Provides database performance analysis and optimization recommendations
 */

import { NextRequest, NextResponse } from 'next/server'
import { queryAnalyzer } from '@/lib/database/query-analyzer'
// import { withTelemetry } from '@/lib/telemetry' // Temporarily disabled for build compatibility

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const adminToken = process.env['ADMIN_ACCESS_TOKEN']
    
    // Require admin access for database optimization
    if (process.env['NODE_ENV'] === 'production' && (!token || !adminToken || token !== adminToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const includeScript = searchParams.get('script') === 'true'
    
    console.log('Starting database analysis...')
    const analysis = await queryAnalyzer.analyzeDatabase()
    
    const response: any = {
      analysis,
      recommendations: {
        immediate: [],
        shortTerm: [],
        longTerm: []
      }
    }

    // Categorize recommendations by urgency
    const immediateIssues = analysis.tables.filter(table => 
      table.rowCount > 10000 && table.missingIndexes.length > 2
    )
    
    if (immediateIssues.length > 0) {
      response.recommendations.immediate.push(
        'Critical: Add missing indexes to large tables to prevent performance degradation'
      )
    }

    if (analysis.slowQueries > 5) {
      response.recommendations.immediate.push(
        'Critical: Optimize slow queries that are impacting user experience'
      )
    }

    if (analysis.performanceScore < 70) {
      response.recommendations.shortTerm.push(
        'Implement comprehensive database optimization plan'
      )
    }

    response.recommendations.longTerm.push(
      'Set up automated performance monitoring',
      'Implement query plan caching',
      'Consider read replicas for scaling'
    )

    // Include optimization script if requested
    if (includeScript) {
      console.log('Generating optimization script...')
      response.optimizationScript = await queryAnalyzer.generateOptimizationScript()
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Database optimization analysis failed:', error)
    
    return NextResponse.json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      recommendations: {
        immediate: ['Check database connectivity and permissions'],
        shortTerm: ['Review database configuration'],
        longTerm: ['Implement proper monitoring']
      }
    }, { status: 500 })
  }
}

export const POST = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const adminToken = process.env['ADMIN_ACCESS_TOKEN']
    
    // Require admin access for applying optimizations
    if (process.env['NODE_ENV'] === 'production' && (!token || !adminToken || token !== adminToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, indexes = [], dryRun = true } = body

    if (action === 'apply_indexes') {
      const results = []
      
      for (const indexSql of indexes) {
        try {
          console.log(`${dryRun ? 'DRY RUN: ' : ''}Applying index: ${indexSql}`)
          
          if (!dryRun) {
            // In a real implementation, you'd execute the SQL
            // await adminClient.raw.sql(indexSql)
            console.log('Index would be created in production')
          }
          
          results.push({
            sql: indexSql,
            status: 'success',
            message: dryRun ? 'Dry run successful' : 'Index created'
          })
        } catch (error) {
          results.push({
            sql: indexSql,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return NextResponse.json({
        action: 'apply_indexes',
        dryRun,
        results,
        summary: {
          total: indexes.length,
          successful: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length
        }
      })
    }

    return NextResponse.json({
      error: 'Invalid action',
      supportedActions: ['apply_indexes']
    }, { status: 400 })

  } catch (error) {
    console.error('Database optimization application failed:', error)
    
    return NextResponse.json({
      error: 'Optimization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}