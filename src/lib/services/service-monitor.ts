import { EventBus, DomainEvent } from './event-bus.service'

export interface ServiceHealthStatus {
  serviceName: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  lastCheck: Date
  responseTime: number
  errorRate: number
  uptime: number
  details?: Record<string, any>
  dependencies?: ServiceDependencyStatus[]
}

export interface ServiceDependencyStatus {
  name: string
  status: 'available' | 'unavailable'
  responseTime?: number
  lastCheck: Date
}

export interface ServiceMetrics {
  serviceName: string
  timestamp: Date
  requestCount: number
  errorCount: number
  averageResponseTime: number
  memoryUsage?: number
  cpuUsage?: number
  activeConnections?: number
  customMetrics?: Record<string, number>
}

export interface HealthCheckConfig {
  interval: number // in milliseconds
  timeout: number // in milliseconds
  retryCount: number
  failureThreshold: number
  recoveryThreshold: number
  enabled: boolean
}

export interface AlertRule {
  id: string
  name: string
  condition: (metrics: ServiceMetrics, health: ServiceHealthStatus) => boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  cooldownMs: number
  enabled: boolean
}

export interface ServiceAlert {
  id: string
  ruleId: string
  serviceName: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  triggeredAt: Date
  resolvedAt?: Date
  isActive: boolean
  metadata?: Record<string, any>
}

export class ServiceMonitor {
  private services: Map<string, any> = new Map()
  private healthStatuses: Map<string, ServiceHealthStatus> = new Map()
  private metrics: Map<string, ServiceMetrics[]> = new Map()
  private alerts: Map<string, ServiceAlert> = new Map()
  private alertRules: Map<string, AlertRule> = new Map()
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map()
  private lastAlertTimes: Map<string, Date> = new Map()

  private defaultHealthCheckConfig: HealthCheckConfig = {
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    retryCount: 3,
    failureThreshold: 3,
    recoveryThreshold: 2,
    enabled: true
  }

  constructor(private eventBus: EventBus) {
    this.setupDefaultAlertRules()
    this.startMetricsCollection()
  }

  /**
   * Register a service for monitoring
   */
  registerService(
    serviceName: string,
    service: any,
    config?: Partial<HealthCheckConfig>
  ): void {
    this.services.set(serviceName, service)
    
    const healthConfig = { ...this.defaultHealthCheckConfig, ...config }
    
    // Initialize health status
    this.healthStatuses.set(serviceName, {
      serviceName,
      status: 'unknown',
      lastCheck: new Date(),
      responseTime: 0,
      errorRate: 0,
      uptime: 0
    })

    // Initialize metrics array
    this.metrics.set(serviceName, [])

    // Start health checking if enabled
    if (healthConfig.enabled) {
      this.startHealthChecking(serviceName, healthConfig)
    }

    // Publish service registered event
    this.eventBus.publish(this.eventBus.createEvent(
      'service.registered',
      serviceName,
      'service',
      { serviceName, config: healthConfig }
    ))
  }

  /**
   * Unregister a service
   */
  unregisterService(serviceName: string): void {
    this.services.delete(serviceName)
    this.healthStatuses.delete(serviceName)
    this.metrics.delete(serviceName)

    // Stop health checking
    const interval = this.healthCheckIntervals.get(serviceName)
    if (interval) {
      clearInterval(interval)
      this.healthCheckIntervals.delete(serviceName)
    }

    // Publish service unregistered event
    this.eventBus.publish(this.eventBus.createEvent(
      'service.unregistered',
      serviceName,
      'service',
      { serviceName }
    ))
  }

  /**
   * Get health status for a specific service
   */
  getServiceHealth(serviceName: string): ServiceHealthStatus | null {
    return this.healthStatuses.get(serviceName) || null
  }

  /**
   * Get health status for all services
   */
  getAllServiceHealth(): ServiceHealthStatus[] {
    return Array.from(this.healthStatuses.values())
  }

  /**
   * Check health of all services
   */
  async checkAllServices(): Promise<{[serviceName: string]: { status: 'healthy' | 'unhealthy', details?: any }}>  {
    const results: {[serviceName: string]: { status: 'healthy' | 'unhealthy', details?: any }} = {}

    const healthChecks = Array.from(this.services.entries()).map(async ([serviceName, service]) => {
      try {
        const health = await this.checkServiceHealth(serviceName, service)
        results[serviceName] = {
          status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
          details: health.details
        }
      } catch (error) {
        results[serviceName] = {
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : String(error) }
        }
      }
    })

    await Promise.allSettled(healthChecks)
    return results
  }

  /**
   * Get metrics for a service
   */
  getServiceMetrics(serviceName: string, timeRangeMs?: number): ServiceMetrics[] {
    const allMetrics = this.metrics.get(serviceName) || []
    
    if (!timeRangeMs) {
      return allMetrics
    }

    const cutoffTime = new Date(Date.now() - timeRangeMs)
    return allMetrics.filter(metrics => metrics.timestamp >= cutoffTime)
  }

  /**
   * Record custom metrics for a service
   */
  recordMetrics(serviceName: string, metrics: Partial<ServiceMetrics>): void {
    const serviceMetrics = this.metrics.get(serviceName) || []
    
    const fullMetrics: ServiceMetrics = {
      serviceName,
      timestamp: new Date(),
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      ...metrics
    }

    serviceMetrics.push(fullMetrics)
    
    // Keep only last 1000 metrics to prevent memory issues
    if (serviceMetrics.length > 1000) {
      serviceMetrics.splice(0, serviceMetrics.length - 1000)
    }

    this.metrics.set(serviceName, serviceMetrics)

    // Check alert rules
    this.checkAlertRules(serviceName, fullMetrics)
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule)
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId)
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): ServiceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.isActive)
  }

  /**
   * Get all alerts for a service
   */
  getServiceAlerts(serviceName: string): ServiceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.serviceName === serviceName)
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId)
    if (alert && alert.isActive) {
      alert.isActive = false
      alert.resolvedAt = new Date()

      // Publish alert resolved event
      this.eventBus.publish(this.eventBus.createEvent(
        'alert.resolved',
        alertId,
        'alert',
        { 
          alertId, 
          serviceName: alert.serviceName, 
          ruleId: alert.ruleId,
          resolvedAt: alert.resolvedAt 
        }
      ))
    }
  }

  /**
   * Get system overview
   */
  getSystemOverview(): {
    totalServices: number
    healthyServices: number
    unhealthyServices: number
    activeAlerts: number
    averageResponseTime: number
    totalRequestCount: number
    totalErrorCount: number
  } {
    const allHealth = this.getAllServiceHealth()
    const activeAlerts = this.getActiveAlerts()
    
    const healthyServices = allHealth.filter(h => h.status === 'healthy').length
    const unhealthyServices = allHealth.filter(h => h.status === 'unhealthy' || h.status === 'degraded').length

    // Calculate aggregate metrics
    let totalResponseTime = 0
    let totalRequestCount = 0
    let totalErrorCount = 0
    let serviceCount = 0

    this.metrics.forEach((serviceMetrics) => {
      if (serviceMetrics.length > 0) {
        const latest = serviceMetrics[serviceMetrics.length - 1]
        totalResponseTime += latest.averageResponseTime
        totalRequestCount += latest.requestCount
        totalErrorCount += latest.errorCount
        serviceCount++
      }
    })

    return {
      totalServices: allHealth.length,
      healthyServices,
      unhealthyServices,
      activeAlerts: activeAlerts.length,
      averageResponseTime: serviceCount > 0 ? totalResponseTime / serviceCount : 0,
      totalRequestCount,
      totalErrorCount
    }
  }

  /**
   * Start health checking for a service
   */
  private startHealthChecking(serviceName: string, config: HealthCheckConfig): void {
    const interval = setInterval(async () => {
      const service = this.services.get(serviceName)
      if (service) {
        await this.performHealthCheck(serviceName, service, config)
      }
    }, config.interval)

    this.healthCheckIntervals.set(serviceName, interval)

    // Perform initial health check
    const service = this.services.get(serviceName)
    if (service) {
      this.performHealthCheck(serviceName, service, config)
    }
  }

  /**
   * Perform health check for a service
   */
  private async performHealthCheck(
    serviceName: string,
    service: any,
    config: HealthCheckConfig
  ): Promise<void> {
    try {
      const health = await this.checkServiceHealth(serviceName, service, config.timeout)
      
      // Update health status
      this.healthStatuses.set(serviceName, health)

      // Record metrics
      this.recordMetrics(serviceName, {
        requestCount: 1,
        errorCount: health.status === 'healthy' ? 0 : 1,
        averageResponseTime: health.responseTime
      })

      // Publish health check event
      this.eventBus.publish(this.eventBus.createEvent(
        'service.health_check',
        serviceName,
        'service',
        { serviceName, health }
      ))

    } catch (error) {
      console.error(`Health check failed for ${serviceName}:`, error)
      
      // Update to unhealthy status
      const unhealthyStatus: ServiceHealthStatus = {
        serviceName,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: config.timeout,
        errorRate: 1,
        uptime: 0,
        details: { error: error instanceof Error ? error.message : String(error) }
      }

      this.healthStatuses.set(serviceName, unhealthyStatus)
    }
  }

  /**
   * Check health of a specific service
   */
  private async checkServiceHealth(
    serviceName: string,
    service: any,
    timeout: number = 5000
  ): Promise<ServiceHealthStatus> {
    const startTime = Date.now()

    // Check if service has a health check method
    if (service.healthCheck && typeof service.healthCheck === 'function') {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      })

      const healthResult = await Promise.race([
        service.healthCheck(),
        timeoutPromise
      ])

      const responseTime = Date.now() - startTime

      return {
        serviceName,
        status: healthResult.status || 'healthy',
        lastCheck: new Date(),
        responseTime,
        errorRate: 0,
        uptime: healthResult.uptime || 0,
        details: healthResult.details,
        dependencies: healthResult.dependencies
      }
    }

    // Default health check - just verify service exists and is responsive
    const responseTime = Date.now() - startTime

    return {
      serviceName,
      status: 'healthy',
      lastCheck: new Date(),
      responseTime,
      errorRate: 0,
      uptime: Date.now(), // Simple uptime approximation
      details: { message: 'Basic health check passed' }
    }
  }

  /**
   * Check alert rules against metrics
   */
  private checkAlertRules(serviceName: string, metrics: ServiceMetrics): void {
    const health = this.healthStatuses.get(serviceName)
    if (!health) return

    this.alertRules.forEach((rule) => {
      if (!rule.enabled) return

      // Check cooldown
      const lastAlertTime = this.lastAlertTimes.get(rule.id)
      if (lastAlertTime && Date.now() - lastAlertTime.getTime() < rule.cooldownMs) {
        return
      }

      // Check condition
      if (rule.condition(metrics, health)) {
        this.triggerAlert(rule, serviceName, metrics, health)
      }
    })
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(
    rule: AlertRule,
    serviceName: string,
    metrics: ServiceMetrics,
    health: ServiceHealthStatus
  ): void {
    const alertId = this.generateAlertId()
    const alert: ServiceAlert = {
      id: alertId,
      ruleId: rule.id,
      serviceName,
      severity: rule.severity,
      message: rule.message,
      triggeredAt: new Date(),
      isActive: true,
      metadata: {
        metrics,
        health
      }
    }

    this.alerts.set(alertId, alert)
    this.lastAlertTimes.set(rule.id, new Date())

    // Publish alert event
    this.eventBus.publish(this.eventBus.createEvent(
      'alert.triggered',
      alertId,
      'alert',
      { 
        alertId, 
        serviceName, 
        severity: rule.severity, 
        message: rule.message,
        ruleId: rule.id 
      }
    ))
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    // High error rate alert
    this.addAlertRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: (metrics) => metrics.errorCount > 0 && (metrics.errorCount / metrics.requestCount) > 0.1,
      severity: 'high',
      message: 'Service error rate is above 10%',
      cooldownMs: 300000, // 5 minutes
      enabled: true
    })

    // High response time alert
    this.addAlertRule({
      id: 'high_response_time',
      name: 'High Response Time',
      condition: (metrics) => metrics.averageResponseTime > 5000,
      severity: 'medium',
      message: 'Service response time is above 5 seconds',
      cooldownMs: 300000, // 5 minutes
      enabled: true
    })

    // Service unhealthy alert
    this.addAlertRule({
      id: 'service_unhealthy',
      name: 'Service Unhealthy',
      condition: (_, health) => health.status === 'unhealthy',
      severity: 'critical',
      message: 'Service is in unhealthy state',
      cooldownMs: 60000, // 1 minute
      enabled: true
    })

    // High memory usage alert (if available)
    this.addAlertRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      condition: (metrics) => (metrics.memoryUsage || 0) > 0.9,
      severity: 'high',
      message: 'Service memory usage is above 90%',
      cooldownMs: 300000, // 5 minutes
      enabled: true
    })
  }

  /**
   * Start metrics collection (could be enhanced to collect system metrics)
   */
  private startMetricsCollection(): void {
    // This could be enhanced to collect system-wide metrics
    setInterval(() => {
      // Collect system metrics if needed
      this.collectSystemMetrics()
    }, 60000) // Every minute
  }

  /**
   * Collect system-wide metrics
   */
  private collectSystemMetrics(): void {
    // This could collect system metrics like CPU, memory, disk usage
    // For now, just clean up old metrics
    this.cleanupOldMetrics()
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 3600000) // 1 hour

    this.metrics.forEach((serviceMetrics, serviceName) => {
      const recentMetrics = serviceMetrics.filter(metrics => metrics.timestamp > oneHourAgo)
      this.metrics.set(serviceName, recentMetrics)
    })

    // Clean up resolved alerts older than 24 hours
    const oneDayAgo = new Date(Date.now() - 86400000) // 24 hours
    const alertsToKeep = new Map<string, ServiceAlert>()

    this.alerts.forEach((alert, alertId) => {
      if (alert.isActive || (alert.resolvedAt && alert.resolvedAt > oneDayAgo)) {
        alertsToKeep.set(alertId, alert)
      }
    })

    this.alerts = alertsToKeep
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Stop all health check intervals
    this.healthCheckIntervals.forEach((interval) => {
      clearInterval(interval)
    })

    this.healthCheckIntervals.clear()
    this.services.clear()
    this.healthStatuses.clear()
    this.metrics.clear()
    this.alerts.clear()
    this.alertRules.clear()
  }
}