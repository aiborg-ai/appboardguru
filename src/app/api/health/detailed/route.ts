/**
 * Detailed Health Check API Endpoint
 * Provides comprehensive health information with detailed component status
 */

import { NextRequest, NextResponse } from 'next/server'
import { healthMonitor, HealthStatus } from '@/lib/monitoring/health'
import { Logger } from '@/lib/logging/logger'

const logger = Logger.getLogger('DetailedHealthAPI')

/**
 * GET /api/health/detailed - Detailed health check
 * Returns comprehensive health information for monitoring dashboards
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const systemHealth = await healthMonitor.executeAll()
    
    // Determine appropriate HTTP status code
    let statusCode = 200
    if (systemHealth.status === HealthStatus.UNHEALTHY) {
      statusCode = 503
    } else if (systemHealth.status === HealthStatus.DEGRADED) {
      statusCode = 200 // Still operational, but with warnings
    }

    // Enhanced response with detailed information
    const response = {
      status: systemHealth.status,
      timestamp: systemHealth.timestamp.toISOString(),
      uptime: systemHealth.uptime,
      version: systemHealth.version,
      environment: systemHealth.details.environment,
      service: systemHealth.details.service,
      
      // Summary statistics
      summary: systemHealth.summary,
      
      // Individual check results
      checks: systemHealth.checks.map(check => ({
        name: check.name,
        status: check.status,
        message: check.message,
        duration: check.duration,
        timestamp: check.timestamp.toISOString(),
        details: check.details,
        ...(check.error && { error: check.error })
      })),
      
      // System metrics
      metrics: {
        memory: {
          heapUsed: Math.round(systemHealth.details.memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(systemHealth.details.memoryUsage.heapTotal / 1024 / 1024),
          heapUsedPercentage: Math.round(
            (systemHealth.details.memoryUsage.heapUsed / systemHealth.details.memoryUsage.heapTotal) * 100
          ),
          rss: Math.round(systemHealth.details.memoryUsage.rss / 1024 / 1024),
          external: Math.round(systemHealth.details.memoryUsage.external / 1024 / 1024),
          arrayBuffers: Math.round((systemHealth.details.memoryUsage as any).arrayBuffers / 1024 / 1024)
        },
        cpu: {
          user: systemHealth.details.cpuUsage.user,
          system: systemHealth.details.cpuUsage.system
        },
        uptime: {
          seconds: Math.floor(systemHealth.uptime / 1000),
          human: formatUptime(systemHealth.uptime)
        }
      },
      
      // Additional runtime information
      runtime: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        pid: process.pid,
        ...(process.env['NODE_ENV'] !== 'production' && {
          environmentVariables: getEnvironmentInfo()
        })
      }
    }

    logger.info('Detailed health check requested', {
      status: systemHealth.status,
      statusCode,
      checkCount: systemHealth.checks.length,
      failedChecks: systemHealth.summary.unhealthy,
      degradedChecks: systemHealth.summary.degraded
    })

    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    logger.error('Detailed health check failed', error)
    
    return NextResponse.json(
      {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        error: 'Detailed health check execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`)

  return parts.join(' ')
}

/**
 * Get safe environment information (non-sensitive)
 */
function getEnvironmentInfo(): Record<string, any> {
  const safeEnvVars = [
    'NODE_ENV',
    'VERSION',
    'SERVICE_NAME',
    'PORT',
    'HOSTNAME'
  ]

  const envInfo: Record<string, any> = {}
  for (const key of safeEnvVars) {
    if (process.env[key]) {
      envInfo[key] = process.env[key]
    }
  }

  return envInfo
}