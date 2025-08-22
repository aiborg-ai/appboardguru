/**
 * Health Check System
 * Comprehensive health monitoring for all application components
 */

import { Logger } from '../logging/logger'
import { telemetry, MetricType } from '../logging/telemetry'

/**
 * Health check status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  name: string
  status: HealthStatus
  message?: string
  duration: number
  timestamp: Date
  details?: Record<string, any>
  error?: {
    message: string
    stack?: string
  }
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  name: string
  timeout: number
  interval: number
  retries: number
  retryDelay: number
  critical: boolean
  tags: Record<string, string>
}

/**
 * Health check function type
 */
export type HealthCheckFunction = () => Promise<{
  status: HealthStatus
  message?: string
  details?: Record<string, any>
}>

/**
 * Individual health check
 */
export class HealthCheck {
  private logger: Logger
  private lastResult?: HealthCheckResult
  private consecutiveFailures = 0
  private lastRunTime = 0

  constructor(
    private config: HealthCheckConfig,
    private checkFunction: HealthCheckFunction
  ) {
    this.logger = Logger.getLogger(`HealthCheck:${config.name}`)
  }

  /**
   * Execute the health check
   */
  async execute(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    const now = Date.now()

    // Skip if interval hasn't passed
    if (now - this.lastRunTime < this.config.interval) {
      if (this.lastResult) {
        return this.lastResult
      }
    }

    this.lastRunTime = now

    let attempt = 0
    let lastError: Error | undefined

    while (attempt <= this.config.retries) {
      try {
        const checkPromise = this.checkFunction()
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), this.config.timeout)
        })

        const result = await Promise.race([checkPromise, timeoutPromise])
        const duration = Date.now() - startTime

        const healthResult: HealthCheckResult = {
          name: this.config.name,
          status: result.status,
          message: result.message,
          duration,
          timestamp: new Date(),
          details: result.details
        }

        // Reset failure count on success
        if (result.status === HealthStatus.HEALTHY) {
          this.consecutiveFailures = 0
        } else {
          this.consecutiveFailures++
        }

        this.lastResult = healthResult
        this.recordMetrics(healthResult)
        
        return healthResult

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        attempt++

        if (attempt <= this.config.retries) {
          await this.sleep(this.config.retryDelay)
        }
      }
    }

    // All attempts failed
    this.consecutiveFailures++
    const duration = Date.now() - startTime

    const healthResult: HealthCheckResult = {
      name: this.config.name,
      status: HealthStatus.UNHEALTHY,
      message: `Health check failed after ${this.config.retries + 1} attempts`,
      duration,
      timestamp: new Date(),
      error: lastError ? {
        message: lastError.message,
        stack: lastError.stack
      } : undefined
    }

    this.lastResult = healthResult
    this.recordMetrics(healthResult)
    
    return healthResult
  }

  /**
   * Get the last health check result
   */
  getLastResult(): HealthCheckResult | undefined {
    return this.lastResult
  }

  /**
   * Get consecutive failure count
   */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures
  }

  /**
   * Check if this health check is critical
   */
  isCritical(): boolean {
    return this.config.critical
  }

  /**
   * Record metrics for the health check
   */
  private recordMetrics(result: HealthCheckResult): void {
    const labels = {
      ...this.config.tags,
      check_name: this.config.name,
      status: result.status
    }

    telemetry.recordHistogram('health_check_duration_ms', result.duration, labels)
    
    telemetry.recordCounter('health_check_total', 1, labels)

    if (result.status !== HealthStatus.HEALTHY) {
      telemetry.recordCounter('health_check_failures_total', 1, {
        ...labels,
        check_name: this.config.name
      })
    }

    telemetry.recordGauge('health_check_consecutive_failures', this.consecutiveFailures, {
      check_name: this.config.name
    })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Overall system health status
 */
export interface SystemHealth {
  status: HealthStatus
  timestamp: Date
  uptime: number
  version: string
  checks: HealthCheckResult[]
  summary: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
    critical: number
    criticalUnhealthy: number
  }
  details: {
    memoryUsage: NodeJS.MemoryUsage
    cpuUsage: NodeJS.CpuUsage
    environment: string
    service: string
  }
}

/**
 * Health monitor class
 */
export class HealthMonitor {
  private checks = new Map<string, HealthCheck>()
  private logger = Logger.getLogger('HealthMonitor')
  private startTime = Date.now()
  private monitorInterval?: NodeJS.Timeout

  constructor() {
    // Add default system checks
    this.addDefaultChecks()
  }

  /**
   * Add a health check
   */
  addCheck(
    name: string,
    checkFunction: HealthCheckFunction,
    config: Partial<HealthCheckConfig> = {}
  ): void {
    const fullConfig: HealthCheckConfig = {
      name,
      timeout: 5000,
      interval: 30000, // 30 seconds
      retries: 2,
      retryDelay: 1000,
      critical: false,
      tags: {},
      ...config
    }

    const healthCheck = new HealthCheck(fullConfig, checkFunction)
    this.checks.set(name, healthCheck)

    this.logger.info(`Health check '${name}' registered`, {
      config: fullConfig
    })
  }

  /**
   * Remove a health check
   */
  removeCheck(name: string): boolean {
    const removed = this.checks.delete(name)
    if (removed) {
      this.logger.info(`Health check '${name}' removed`)
    }
    return removed
  }

  /**
   * Execute all health checks
   */
  async executeAll(): Promise<SystemHealth> {
    const startTime = Date.now()
    const checkPromises = Array.from(this.checks.values()).map(check => 
      check.execute().catch(error => ({
        name: check.getLastResult()?.name || 'unknown',
        status: HealthStatus.UNHEALTHY,
        message: `Check execution failed: ${error.message}`,
        duration: 0,
        timestamp: new Date(),
        error: {
          message: error.message,
          stack: error.stack
        }
      }))
    )

    const results = await Promise.all(checkPromises)
    const executionTime = Date.now() - startTime

    // Calculate summary
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === HealthStatus.HEALTHY).length,
      degraded: results.filter(r => r.status === HealthStatus.DEGRADED).length,
      unhealthy: results.filter(r => r.status === HealthStatus.UNHEALTHY).length,
      critical: Array.from(this.checks.values()).filter(c => c.isCritical()).length,
      criticalUnhealthy: 0
    }

    // Count critical unhealthy checks
    summary.criticalUnhealthy = Array.from(this.checks.values())
      .filter(check => {
        const result = results.find(r => r.name === check.getLastResult()?.name)
        return check.isCritical() && result?.status === HealthStatus.UNHEALTHY
      }).length

    // Determine overall system status
    let systemStatus = HealthStatus.HEALTHY
    if (summary.criticalUnhealthy > 0) {
      systemStatus = HealthStatus.UNHEALTHY
    } else if (summary.unhealthy > 0 || summary.degraded > 0) {
      systemStatus = HealthStatus.DEGRADED
    }

    const systemHealth: SystemHealth = {
      status: systemStatus,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      version: process.env['VERSION'] || '1.0.0',
      checks: results,
      summary,
      details: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        environment: process.env['NODE_ENV'] || 'development',
        service: process.env['SERVICE_NAME'] || 'appboardguru'
      }
    }

    // Record system-level metrics
    telemetry.recordGauge('system_health_status', systemStatus === HealthStatus.HEALTHY ? 1 : 0)
    telemetry.recordGauge('health_checks_total', summary.total)
    telemetry.recordGauge('health_checks_healthy', summary.healthy)
    telemetry.recordGauge('health_checks_degraded', summary.degraded)
    telemetry.recordGauge('health_checks_unhealthy', summary.unhealthy)
    telemetry.recordHistogram('health_check_execution_duration_ms', executionTime)

    // Log system health status
    if (systemStatus === HealthStatus.UNHEALTHY) {
      this.logger.error('System health check failed', { systemHealth })
    } else if (systemStatus === HealthStatus.DEGRADED) {
      this.logger.warn('System health degraded', { systemHealth })
    } else {
      this.logger.debug('System health check passed', { systemHealth })
    }

    return systemHealth
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitorInterval) {
      this.stopMonitoring()
    }

    this.monitorInterval = setInterval(async () => {
      try {
        await this.executeAll()
      } catch (error) {
        this.logger.error('Health monitoring failed', { error })
      }
    }, intervalMs)

    this.logger.info('Health monitoring started', { intervalMs })
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = undefined
      this.logger.info('Health monitoring stopped')
    }
  }

  /**
   * Get list of registered checks
   */
  getRegisteredChecks(): string[] {
    return Array.from(this.checks.keys())
  }

  /**
   * Add default system health checks
   */
  private addDefaultChecks(): void {
    // Memory usage check
    this.addCheck('memory', async () => {
      const memory = process.memoryUsage()
      const heapUsedMB = memory.heapUsed / 1024 / 1024
      const heapTotalMB = memory.heapTotal / 1024 / 1024
      const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100

      let status = HealthStatus.HEALTHY
      let message = `Memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${heapUsagePercent.toFixed(2)}%)`

      if (heapUsagePercent > 90) {
        status = HealthStatus.UNHEALTHY
        message = `High memory usage: ${heapUsagePercent.toFixed(2)}%`
      } else if (heapUsagePercent > 80) {
        status = HealthStatus.DEGRADED
        message = `Elevated memory usage: ${heapUsagePercent.toFixed(2)}%`
      }

      return {
        status,
        message,
        details: {
          memoryUsage: memory,
          heapUsagePercent
        }
      }
    }, {
      timeout: 1000,
      interval: 30000,
      critical: true,
      tags: { component: 'system', type: 'memory' }
    })

    // Database connectivity check (placeholder)
    this.addCheck('database', async () => {
      try {
        // This would check database connectivity
        // For now, just check if environment variables are set
        if (!process.env['NEXT_PUBLIC_SUPABASE_URL'] || !process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: 'Database configuration missing'
          }
        }

        // TODO: Implement actual database connectivity check
        return {
          status: HealthStatus.HEALTHY,
          message: 'Database connection healthy'
        }
      } catch (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    }, {
      timeout: 5000,
      interval: 30000,
      critical: true,
      tags: { component: 'database', type: 'connectivity' }
    })

    // External service checks could be added here
    // this.addCheck('openrouter', async () => { ... })
    // this.addCheck('email-service', async () => { ... })
  }
}

/**
 * Default health monitor instance
 */
export const healthMonitor = new HealthMonitor()

/**
 * Ready-to-use health checks
 */
export const HealthChecks = {
  /**
   * HTTP endpoint health check
   */
  httpEndpoint: (name: string, url: string, options: {
    method?: string
    timeout?: number
    expectedStatus?: number
    headers?: Record<string, string>
  } = {}): HealthCheckFunction => {
    return async () => {
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: options.headers,
          signal: AbortSignal.timeout(options.timeout || 5000)
        })

        const expectedStatus = options.expectedStatus || 200
        if (response.status !== expectedStatus) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: `HTTP ${response.status} (expected ${expectedStatus})`,
            details: { url, status: response.status, statusText: response.statusText }
          }
        }

        return {
          status: HealthStatus.HEALTHY,
          message: `HTTP ${response.status}`,
          details: { url, status: response.status }
        }
      } catch (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: `HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { url, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }
    }
  },

  /**
   * File system check
   */
  fileSystem: (path: string, operation: 'read' | 'write' = 'read'): HealthCheckFunction => {
    return async () => {
      try {
        const fs = await import('fs/promises')
        
        if (operation === 'read') {
          await fs.access(path)
          return {
            status: HealthStatus.HEALTHY,
            message: `File system readable: ${path}`
          }
        } else {
          const testFile = `${path}/health-check-${Date.now()}.tmp`
          await fs.writeFile(testFile, 'health-check')
          await fs.unlink(testFile)
          return {
            status: HealthStatus.HEALTHY,
            message: `File system writable: ${path}`
          }
        }
      } catch (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: `File system ${operation} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { path, operation }
        }
      }
    }
  },

  /**
   * Custom function check
   */
  custom: (checkFn: () => Promise<boolean> | boolean, name: string): HealthCheckFunction => {
    return async () => {
      try {
        const result = await checkFn()
        return {
          status: result ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
          message: `Custom check '${name}': ${result ? 'passed' : 'failed'}`
        }
      } catch (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: `Custom check '${name}' threw error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    }
  }
}