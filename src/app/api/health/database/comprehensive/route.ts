/**
 * Comprehensive Database Test API Endpoint
 * Runs extensive database tests including transactions, constraints, and performance
 */

import { NextRequest, NextResponse } from 'next/server'
import { DatabaseTestRunner, quickHealthCheck } from '@/lib/database/test-utilities'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const testType = searchParams.get('type') || 'quick'

  try {
    console.log(`🔬 Starting ${testType} database tests...`)
    
    let results
    
    if (testType === 'comprehensive') {
      // Run full test suite
      const runner = new DatabaseTestRunner()
      const suites = await runner.runAllTests()
      
      results = {
        type: 'comprehensive',
        timestamp: new Date().toISOString(),
        suites,
        summary: {
          totalSuites: suites.length,
          totalTests: suites.reduce((sum, suite) => sum + suite.summary.total, 0),
          totalPassed: suites.reduce((sum, suite) => sum + suite.summary.passed, 0),
          totalFailed: suites.reduce((sum, suite) => sum + suite.summary.failed, 0),
          totalDuration: suites.reduce((sum, suite) => sum + suite.summary.duration, 0),
          overallSuccess: suites.every(suite => suite.summary.success)
        }
      }
    } else {
      // Run quick health check
      const healthCheck = await quickHealthCheck()
      
      results = {
        type: 'quick',
        timestamp: new Date().toISOString(),
        status: healthCheck.overall ? 'healthy' : 'issues_detected',
        suites: healthCheck.suites,
        summary: {
          overallSuccess: healthCheck.overall,
          totalSuites: healthCheck.suites.length,
          passedSuites: healthCheck.suites.filter(s => s.success).length
        }
      }
    }

    const statusCode = results.summary?.overallSuccess ? 200 : 503

    return NextResponse.json(results, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Database comprehensive test failed:', error)
    
    return NextResponse.json({
      type: testType,
      timestamp: new Date().toISOString(),
      status: 'error',
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error as Error)?.stack : undefined
      },
      summary: {
        overallSuccess: false,
        totalTests: 0,
        totalPassed: 0
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}