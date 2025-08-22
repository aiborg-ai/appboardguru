/**
 * Health Check API Endpoint
 * Provides comprehensive health information about the application
 */

import { NextRequest, NextResponse } from 'next/server'
import { healthMonitor, HealthStatus } from '@/lib/monitoring/health'
import { globalErrorHandler } from '@/lib/errors/handler'
import { Logger } from '@/lib/logging/logger'

const logger = Logger.getLogger('HealthAPI')

/**
 * GET /api/health - Basic health check
 * Returns simple status for load balancers and monitoring systems
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const systemHealth = await healthMonitor.executeAll()
    
    const isHealthy = systemHealth.status === HealthStatus.HEALTHY
    const statusCode = isHealthy ? 200 : 503

    // Simple response for basic health checks
    const response = {
      status: systemHealth.status,
      timestamp: systemHealth.timestamp.toISOString(),
      uptime: systemHealth.uptime,
      version: systemHealth.version
    }

    logger.debug('Health check requested', {
      status: systemHealth.status,
      statusCode,
      uptime: systemHealth.uptime
    })

    return NextResponse.json(response, { status: statusCode })

  } catch (error) {
    logger.error('Health check failed', error)
    
    return NextResponse.json(
      {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        error: 'Health check execution failed'
      },
      { status: 503 }
    )
  }
}