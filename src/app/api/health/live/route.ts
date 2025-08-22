/**
 * Liveness Check API Endpoint
 * Kubernetes/Docker liveness probe endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { Logger } from '@/lib/logging/logger'

const logger = Logger.getLogger('LivenessAPI')

/**
 * GET /api/health/live - Liveness check
 * Returns 200 if the application is alive (process is running)
 * This should only fail if the application is completely unresponsive
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Simple liveness check - just verify the process is responding
    const response = {
      alive: true,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version
    }

    logger.debug('Liveness check requested', {
      pid: process.pid,
      uptime: process.uptime()
    })

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    // If we reach here, something is seriously wrong
    logger.fatal('Liveness check failed', error)
    
    return NextResponse.json(
      {
        alive: false,
        timestamp: new Date().toISOString(),
        error: 'Liveness check execution failed'
      },
      { status: 503 }
    )
  }
}