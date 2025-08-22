/**
 * Readiness Check API Endpoint
 * Kubernetes/Docker readiness probe endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { healthMonitor, HealthStatus } from '@/lib/monitoring/health'
import { Logger } from '@/lib/logging/logger'

const logger = Logger.getLogger('ReadinessAPI')

/**
 * GET /api/health/ready - Readiness check
 * Returns 200 if the application is ready to serve traffic
 * Returns 503 if the application is not ready (starting up or critical services down)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const systemHealth = await healthMonitor.executeAll()
    
    // Check if any critical services are unhealthy
    const criticalChecks = systemHealth.checks.filter(check => 
      // Assume database and other core services are critical
      ['database', 'memory'].includes(check.name.toLowerCase())
    )

    const criticalFailures = criticalChecks.filter(check => 
      check.status === HealthStatus.UNHEALTHY
    )

    const isReady = criticalFailures.length === 0
    const statusCode = isReady ? 200 : 503

    const response = {
      ready: isReady,
      timestamp: new Date().toISOString(),
      critical_checks: criticalChecks.map(check => ({
        name: check.name,
        status: check.status,
        message: check.message
      })),
      ...(criticalFailures.length > 0 && {
        critical_failures: criticalFailures.map(check => ({
          name: check.name,
          message: check.message
        }))
      })
    }

    logger.debug('Readiness check requested', {
      ready: isReady,
      statusCode,
      criticalChecks: criticalChecks.length,
      criticalFailures: criticalFailures.length
    })

    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    logger.error('Readiness check failed', error)
    
    return NextResponse.json(
      {
        ready: false,
        timestamp: new Date().toISOString(),
        error: 'Readiness check execution failed'
      },
      { status: 503 }
    )
  }
}