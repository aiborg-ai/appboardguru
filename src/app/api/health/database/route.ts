/**
 * Database Health Check API Endpoint
 * Tests database connectivity and operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { performDatabaseHealthCheck, validateDatabaseSchema } from '@/lib/database/connection-test'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting database health check API...')
    
    // Perform comprehensive health check
    const healthCheck = await performDatabaseHealthCheck()
    
    // Validate schema
    const schemaValidation = await validateDatabaseSchema()
    
    const response = {
      timestamp: new Date().toISOString(),
      status: healthCheck.overall ? 'healthy' : 'unhealthy',
      checks: {
        connection: healthCheck.connection,
        authentication: healthCheck.authentication,
        organizations: healthCheck.organizations,
        permissions: healthCheck.permissions,
        schema: schemaValidation
      },
      summary: {
        overall: healthCheck.overall && schemaValidation.success,
        totalChecks: 5,
        passedChecks: [
          healthCheck.connection.success,
          healthCheck.authentication.success,
          healthCheck.organizations.success,
          healthCheck.permissions.success,
          schemaValidation.success
        ].filter(Boolean).length
      }
    }

    const statusCode = response.summary.overall ? 200 : 503

    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Database health check failed:', error)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error as Error)?.stack : undefined
      },
      summary: {
        overall: false,
        totalChecks: 5,
        passedChecks: 0
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