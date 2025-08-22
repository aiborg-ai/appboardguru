/**
 * HealthController
 * Consolidates health check and monitoring routes
 * Replaces: health/*, health/detailed/*, health/live/*, health/ready/*
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { EnhancedHandlers } from '@/lib/middleware/apiHandler'
import { healthMonitor, HealthStatus } from '@/lib/monitoring/health'
import { Logger } from '@/lib/logging/logger'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const logger = Logger.getLogger('HealthController')

// Validation schemas
const HealthCheckParamsSchema = z.object({
  includeMetrics: z.boolean().default(false),
  includeDependencies: z.boolean().default(true),
  format: z.enum(['json', 'prometheus']).default('json')
})

// Helper function to format uptime
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

// Helper function to get safe environment information
function getEnvironmentInfo(): Record<string, any> {
  const safeEnvVars = [
    'NODE_ENV',
    'VERSION',
    'SERVICE_NAME',
    'PORT',
    'HOSTNAME',
    'NEXT_PUBLIC_APP_URL'
  ]

  const envInfo: Record<string, any> = {}
  for (const key of safeEnvVars) {
    if (process.env[key]) {
      envInfo[key] = process.env[key]
    }
  }

  return envInfo
}

// Helper function to check database connectivity
async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  try {
    const startTime = Date.now()
    const supabase = await createSupabaseServerClient()
    
    // Simple connectivity check
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single()
    
    const latency = Date.now() - startTime
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found" which is OK for health check
      return { healthy: false, latency, error: error.message }
    }
    
    return { healthy: true, latency }
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    }
  }
}

/**
 * GET /api/health
 * Basic health check for load balancers and monitoring systems
 */
export const basicHealthCheck = EnhancedHandlers.get(
  {
    authenticate: false,
    rateLimit: { requests: 1000, window: '1m' },
    cache: { ttl: 30 }, // 30 seconds cache
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    try {
      const systemHealth = await healthMonitor.executeAll()
      
      const isHealthy = systemHealth.status === HealthStatus.HEALTHY
      const response = {
        status: systemHealth.status,
        timestamp: systemHealth.timestamp.toISOString(),
        uptime: systemHealth.uptime,
        version: systemHealth.version || process.env['VERSION'] || '1.0.0'
      }

      if (!isHealthy) {
        throw new Error(`System health status: ${systemHealth.status}`)
      }

      logger.debug('Basic health check completed', { status: systemHealth.status })
      
      return response
    } catch (error) {
      logger.error('Basic health check failed', error)
      
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        error: 'Health check execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
)

/**
 * GET /api/health/detailed
 * Comprehensive health check with detailed component status
 */
export const detailedHealthCheck = EnhancedHandlers.get(
  {
    validation: { query: HealthCheckParamsSchema },
    authenticate: false,
    rateLimit: { requests: 100, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    try {
      const params = req.validatedQuery!
      const systemHealth = await healthMonitor.executeAll()
      
      // Check database health
      const dbHealth = await checkDatabaseHealth()
      
      const response = {
        status: systemHealth.status,
        timestamp: systemHealth.timestamp.toISOString(),
        uptime: systemHealth.uptime,
        version: systemHealth.version || process.env['VERSION'] || '1.0.0',
        environment: systemHealth.details?.environment || process.env['NODE_ENV'] || 'unknown',
        service: systemHealth.details?.service || 'appboardguru-api',
        
        // Summary statistics
        summary: systemHealth.summary,
        
        // Individual check results
        checks: [
          ...systemHealth.checks.map(check => ({
            name: check.name,
            status: check.status,
            message: check.message,
            duration: check.duration,
            timestamp: check.timestamp.toISOString(),
            details: check.details,
            ...(check.error && { error: check.error })
          })),
          // Add database health check
          {
            name: 'database',
            status: dbHealth.healthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
            message: dbHealth.healthy ? 'Database connection successful' : dbHealth.error || 'Database connection failed',
            duration: dbHealth.latency || 0,
            timestamp: new Date().toISOString(),
            details: dbHealth.latency ? { latency: `${dbHealth.latency}ms` } : undefined
          }
        ]
      }

      // Add metrics if requested
      if (params.includeMetrics) {
        const memUsage = process.memoryUsage()
        const cpuUsage = process.cpuUsage()
        
        response['metrics'] = {
          memory: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsedPercentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
            rss: Math.round(memUsage.rss / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          },
          uptime: {
            seconds: Math.floor(systemHealth.uptime / 1000),
            human: formatUptime(systemHealth.uptime)
          }
        }

        response['runtime'] = {
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch,
          pid: process.pid,
          ...(process.env['NODE_ENV'] !== 'production' && {
            environmentVariables: getEnvironmentInfo()
          })
        }
      }

      const isHealthy = systemHealth.status === HealthStatus.HEALTHY && dbHealth.healthy
      
      if (!isHealthy) {
        throw new Error(`System health status: ${systemHealth.status}, DB healthy: ${dbHealth.healthy}`)
      }

      logger.info('Detailed health check completed', {
        status: systemHealth.status,
        checkCount: response.checks.length,
        dbHealthy: dbHealth.healthy
      })

      return response
    } catch (error) {
      logger.error('Detailed health check failed', error)
      
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        error: 'Detailed health check execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
)

/**
 * GET /api/health/live
 * Kubernetes liveness probe endpoint
 */
export const livenessCheck = EnhancedHandlers.get(
  {
    authenticate: false,
    rateLimit: { requests: 2000, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    try {
      // Minimal check - just verify the application is running
      const response = {
        status: 'alive',
        timestamp: new Date().toISOString(),
        pid: process.pid,
        uptime: Math.floor(process.uptime() * 1000)
      }

      logger.debug('Liveness check completed')
      return response
    } catch (error) {
      logger.error('Liveness check failed', error)
      throw new Error('Application not responding')
    }
  }
)

/**
 * GET /api/health/ready
 * Kubernetes readiness probe endpoint
 */
export const readinessCheck = EnhancedHandlers.get(
  {
    authenticate: false,
    rateLimit: { requests: 1000, window: '1m' },
    cache: { ttl: 15 }, // 15 seconds cache
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    try {
      // Check critical dependencies for readiness
      const dbHealth = await checkDatabaseHealth()
      
      const checks = [
        {
          name: 'database',
          healthy: dbHealth.healthy,
          details: dbHealth.latency ? `${dbHealth.latency}ms` : undefined,
          error: dbHealth.error
        }
      ]

      const allHealthy = checks.every(check => check.healthy)
      
      const response = {
        status: allHealthy ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        checks: checks.map(check => ({
          name: check.name,
          status: check.healthy ? 'healthy' : 'unhealthy',
          details: check.details,
          ...(check.error && { error: check.error })
        }))
      }

      if (!allHealthy) {
        throw new Error('System not ready - dependency checks failed')
      }

      logger.debug('Readiness check completed', { allHealthy })
      return response
    } catch (error) {
      logger.error('Readiness check failed', error)
      
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Readiness check execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
)

/**
 * GET /api/health/metrics
 * Prometheus-compatible metrics endpoint
 */
export const metricsCheck = EnhancedHandlers.get(
  {
    authenticate: false,
    rateLimit: { requests: 200, window: '1m' },
    cache: { ttl: 60 }, // 1 minute cache
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    try {
      const memUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()
      const uptime = process.uptime()
      
      const dbHealth = await checkDatabaseHealth()
      
      // Generate Prometheus-style metrics
      const metrics = [
        `# HELP nodejs_memory_heap_used_bytes Node.js heap memory used`,
        `# TYPE nodejs_memory_heap_used_bytes gauge`,
        `nodejs_memory_heap_used_bytes ${memUsage.heapUsed}`,
        '',
        `# HELP nodejs_memory_heap_total_bytes Node.js heap memory total`,
        `# TYPE nodejs_memory_heap_total_bytes gauge`,
        `nodejs_memory_heap_total_bytes ${memUsage.heapTotal}`,
        '',
        `# HELP nodejs_memory_rss_bytes Node.js resident set size`,
        `# TYPE nodejs_memory_rss_bytes gauge`,
        `nodejs_memory_rss_bytes ${memUsage.rss}`,
        '',
        `# HELP nodejs_process_uptime_seconds Node.js process uptime`,
        `# TYPE nodejs_process_uptime_seconds gauge`,
        `nodejs_process_uptime_seconds ${uptime}`,
        '',
        `# HELP database_connection_healthy Database connection status`,
        `# TYPE database_connection_healthy gauge`,
        `database_connection_healthy ${dbHealth.healthy ? 1 : 0}`,
        ''
      ]

      if (dbHealth.latency) {
        metrics.push(
          `# HELP database_connection_latency_ms Database connection latency`,
          `# TYPE database_connection_latency_ms gauge`,
          `database_connection_latency_ms ${dbHealth.latency}`,
          ''
        )
      }

      return {
        contentType: 'text/plain',
        body: metrics.join('\n')
      }
    } catch (error) {
      logger.error('Metrics check failed', error)
      throw new Error('Failed to generate metrics')
    }
  }
)

// Export all handlers with proper naming for Next.js App Router
export {
  basicHealthCheck as GET_health,
  detailedHealthCheck as GET_health_detailed,
  livenessCheck as GET_health_live,
  readinessCheck as GET_health_ready,
  metricsCheck as GET_health_metrics
}