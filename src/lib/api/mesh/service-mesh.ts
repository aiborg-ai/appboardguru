/**
 * Service Mesh Integration - Advanced Service Discovery and Management
 * Provides service discovery, health checking, load balancing, and retry logic
 */

import { CircuitBreaker } from '../patterns/circuit-breaker'
import { Result, Ok, Err } from '../../result'

export interface ServiceInstance {
  id: string
  name: string
  host: string
  port: number
  protocol: 'http' | 'https' | 'grpc'
  version: string
  metadata: Record<string, string>
  health: 'healthy' | 'unhealthy' | 'unknown'
  lastHealthCheck: number
  registeredAt: number
  weight?: number
  tags: string[]
}

export interface ServiceMeshConfig {
  enabled: boolean
  meshType: 'istio' | 'linkerd' | 'consul' | 'custom'
  enableServiceDiscovery: boolean
  enableAutoRetry: boolean
  retryPolicy: {
    maxRetries: number
    backoffStrategy: 'exponential' | 'linear' | 'constant'
    initialDelay: number
    maxDelay: number
  }
  healthCheck: {
    interval: number
    timeout: number
    healthyThreshold: number
    unhealthyThreshold: number
    path?: string
  }
  loadBalancing: {
    strategy: 'round_robin' | 'weighted_round_robin' | 'least_connections' | 'random' | 'consistent_hash'
    stickySession?: boolean
    sessionAffinityKey?: string
  }
}

export interface HealthCheckResult {
  service: string
  instance: string
  healthy: boolean
  responseTime: number
  error?: string
  details?: any
}

export class ServiceMesh {
  private services: Map<string, ServiceInstance[]> = new Map()
  private loadBalancerState: Map<string, any> = new Map()
  private circuitBreakers: Map<string, CircuitBreaker> = new Map()
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map()
  private config: ServiceMeshConfig

  constructor(config: ServiceMeshConfig) {
    this.config = config
    
    if (config.enabled && config.enableServiceDiscovery) {
      this.initializeServiceDiscovery()
    }
  }

  /**
   * Register a service instance
   */
  registerService(instance: ServiceInstance): Result<void, Error> {
    try {
      const serviceName = instance.name
      
      if (!this.services.has(serviceName)) {
        this.services.set(serviceName, [])
      }
      
      const instances = this.services.get(serviceName)!
      
      // Check if instance already exists
      const existingIndex = instances.findIndex(i => i.id === instance.id)
      if (existingIndex >= 0) {
        instances[existingIndex] = { ...instance, registeredAt: Date.now() }
      } else {
        instances.push({ ...instance, registeredAt: Date.now() })
      }
      
      // Start health checking
      if (this.config.healthCheck) {
        this.startHealthCheck(instance)
      }
      
      console.log(`Service ${serviceName} instance ${instance.id} registered`)
      return Ok(undefined)
      
    } catch (error) {
      return Err(new Error(`Failed to register service: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  }

  /**
   * Deregister a service instance
   */
  deregisterService(serviceName: string, instanceId: string): Result<void, Error> {
    try {
      const instances = this.services.get(serviceName)
      if (!instances) {
        return Err(new Error(`Service ${serviceName} not found`))
      }
      
      const index = instances.findIndex(i => i.id === instanceId)
      if (index === -1) {
        return Err(new Error(`Instance ${instanceId} not found in service ${serviceName}`))
      }
      
      instances.splice(index, 1)
      
      // Stop health checking
      const healthCheckKey = `${serviceName}:${instanceId}`
      const healthCheckInterval = this.healthCheckIntervals.get(healthCheckKey)
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval)
        this.healthCheckIntervals.delete(healthCheckKey)
      }
      
      // Clean up empty services
      if (instances.length === 0) {
        this.services.delete(serviceName)
      }
      
      console.log(`Service ${serviceName} instance ${instanceId} deregistered`)
      return Ok(undefined)
      
    } catch (error) {
      return Err(new Error(`Failed to deregister service: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  }

  /**
   * Discover services by name
   */
  discoverService(serviceName: string, tags?: string[]): ServiceInstance[] {
    const instances = this.services.get(serviceName) || []
    
    // Filter by tags if provided
    if (tags && tags.length > 0) {
      return instances.filter(instance => 
        tags.every(tag => instance.tags.includes(tag))
      )
    }
    
    return instances.filter(instance => instance.health === 'healthy')
  }

  /**
   * Select the best service instance using load balancing strategy
   */
  selectInstance(serviceName: string, clientId?: string): Result<ServiceInstance, Error> {
    const instances = this.discoverService(serviceName)
    
    if (instances.length === 0) {
      return Err(new Error(`No healthy instances found for service ${serviceName}`))
    }
    
    const strategy = this.config.loadBalancing.strategy
    let selectedInstance: ServiceInstance
    
    switch (strategy) {
      case 'round_robin':
        selectedInstance = this.selectRoundRobin(serviceName, instances)
        break
      case 'weighted_round_robin':
        selectedInstance = this.selectWeightedRoundRobin(serviceName, instances)
        break
      case 'least_connections':
        selectedInstance = this.selectLeastConnections(instances)
        break
      case 'random':
        selectedInstance = this.selectRandom(instances)
        break
      case 'consistent_hash':
        selectedInstance = this.selectConsistentHash(serviceName, instances, clientId)
        break
      default:
        selectedInstance = instances[0]
    }
    
    return Ok(selectedInstance)
  }

  /**
   * Execute request with retry logic and circuit breaker
   */
  async executeRequest<T>(
    serviceName: string,
    requestFn: (instance: ServiceInstance) => Promise<T>,
    clientId?: string
  ): Promise<Result<T, Error>> {
    const instanceResult = this.selectInstance(serviceName, clientId)
    if (!instanceResult.success) {
      return Err(instanceResult.error!)
    }
    
    const instance = instanceResult.value!
    const circuitBreaker = this.getOrCreateCircuitBreaker(instance)
    
    if (circuitBreaker.isOpen()) {
      return Err(new Error(`Circuit breaker open for ${serviceName}:${instance.id}`))
    }
    
    if (!this.config.enableAutoRetry) {
      try {
        const result = await circuitBreaker.execute(() => requestFn(instance))
        return Ok(result)
      } catch (error) {
        return Err(error as Error)
      }
    }
    
    // Execute with retry logic
    const retryPolicy = this.config.retryPolicy
    let lastError: Error | null = null
    let delay = retryPolicy.initialDelay
    
    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        const result = await circuitBreaker.execute(() => requestFn(instance))
        return Ok(result)
      } catch (error) {
        lastError = error as Error
        
        if (attempt === retryPolicy.maxRetries) {
          break
        }
        
        // Wait before retry
        await this.sleep(delay)
        
        // Calculate next delay
        switch (retryPolicy.backoffStrategy) {
          case 'exponential':
            delay = Math.min(delay * 2, retryPolicy.maxDelay)
            break
          case 'linear':
            delay = Math.min(delay + retryPolicy.initialDelay, retryPolicy.maxDelay)
            break
          case 'constant':
            // delay stays the same
            break
        }
        
        console.warn(`Request attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error)
      }
    }
    
    return Err(lastError || new Error('Max retries exceeded'))
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName: string): {
    total: number
    healthy: number
    unhealthy: number
    unknown: number
    instances: Array<{
      id: string
      health: string
      lastCheck: number
    }>
  } {
    const instances = this.services.get(serviceName) || []
    
    const health = {
      total: instances.length,
      healthy: 0,
      unhealthy: 0,
      unknown: 0,
      instances: instances.map(instance => ({
        id: instance.id,
        health: instance.health,
        lastCheck: instance.lastHealthCheck
      }))
    }
    
    instances.forEach(instance => {
      switch (instance.health) {
        case 'healthy':
          health.healthy++
          break
        case 'unhealthy':
          health.unhealthy++
          break
        default:
          health.unknown++
      }
    })
    
    return health
  }

  /**
   * Get all registered services
   */
  getAllServices(): Record<string, ServiceInstance[]> {
    const services: Record<string, ServiceInstance[]> = {}
    this.services.forEach((instances, serviceName) => {
      services[serviceName] = [...instances]
    })
    return services
  }

  /**
   * Get service mesh statistics
   */
  getStats(): {
    totalServices: number
    totalInstances: number
    healthyInstances: number
    circuitBreakersOpen: number
    averageResponseTime: number
  } {
    let totalInstances = 0
    let healthyInstances = 0
    let circuitBreakersOpen = 0
    
    this.services.forEach(instances => {
      totalInstances += instances.length
      healthyInstances += instances.filter(i => i.health === 'healthy').length
    })
    
    this.circuitBreakers.forEach(breaker => {
      if (breaker.isOpen()) {
        circuitBreakersOpen++
      }
    })
    
    return {
      totalServices: this.services.size,
      totalInstances,
      healthyInstances,
      circuitBreakersOpen,
      averageResponseTime: 0 // Would be calculated from metrics
    }
  }

  private initializeServiceDiscovery(): void {
    // Initialize service discovery based on mesh type
    switch (this.config.meshType) {
      case 'consul':
        this.initializeConsulDiscovery()
        break
      case 'istio':
        this.initializeIstioDiscovery()
        break
      case 'linkerd':
        this.initializeLinkerdDiscovery()
        break
      case 'custom':
        this.initializeCustomDiscovery()
        break
    }
  }

  private initializeConsulDiscovery(): void {
    // Consul service discovery integration
    console.log('Initializing Consul service discovery')
    // In a real implementation, this would connect to Consul agent
  }

  private initializeIstioDiscovery(): void {
    // Istio service discovery integration
    console.log('Initializing Istio service discovery')
    // In a real implementation, this would integrate with Istio pilot
  }

  private initializeLinkerdDiscovery(): void {
    // Linkerd service discovery integration
    console.log('Initializing Linkerd service discovery')
    // In a real implementation, this would integrate with Linkerd control plane
  }

  private initializeCustomDiscovery(): void {
    // Custom service discovery implementation
    console.log('Initializing custom service discovery')
    
    // Auto-register local services
    this.autoRegisterLocalServices()
  }

  private autoRegisterLocalServices(): void {
    // Auto-register common services based on environment
    const commonServices = [
      {
        id: 'assets-service-1',
        name: 'assets-service',
        host: process.env.ASSETS_SERVICE_HOST || 'localhost',
        port: parseInt(process.env.ASSETS_SERVICE_PORT || '3001'),
        protocol: 'http' as const,
        version: '1.0.0',
        metadata: { region: 'us-west-1' },
        health: 'unknown' as const,
        lastHealthCheck: 0,
        registeredAt: Date.now(),
        weight: 100,
        tags: ['api', 'assets']
      },
      {
        id: 'notification-service-1',
        name: 'notification-service',
        host: process.env.NOTIFICATION_SERVICE_HOST || 'localhost',
        port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3002'),
        protocol: 'http' as const,
        version: '1.0.0',
        metadata: { region: 'us-west-1' },
        health: 'unknown' as const,
        lastHealthCheck: 0,
        registeredAt: Date.now(),
        weight: 100,
        tags: ['api', 'notifications']
      }
    ]
    
    commonServices.forEach(service => {
      this.registerService(service)
    })
  }

  private startHealthCheck(instance: ServiceInstance): void {
    const healthCheckKey = `${instance.name}:${instance.id}`
    
    // Clear existing health check if any
    const existingInterval = this.healthCheckIntervals.get(healthCheckKey)
    if (existingInterval) {
      clearInterval(existingInterval)
    }
    
    // Start new health check
    const interval = setInterval(async () => {
      await this.performHealthCheck(instance)
    }, this.config.healthCheck.interval)
    
    this.healthCheckIntervals.set(healthCheckKey, interval)
  }

  private async performHealthCheck(instance: ServiceInstance): Promise<void> {
    const startTime = Date.now()
    const healthPath = this.config.healthCheck.path || '/health'
    const url = `${instance.protocol}://${instance.host}:${instance.port}${healthPath}`
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheck.timeout)
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ServiceMesh-HealthCheck/1.0'
        }
      })
      
      clearTimeout(timeoutId)
      
      const responseTime = Date.now() - startTime
      const healthy = response.ok
      
      this.updateInstanceHealth(instance, healthy, responseTime)
      
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.updateInstanceHealth(instance, false, responseTime, error as Error)
    }
  }

  private updateInstanceHealth(instance: ServiceInstance, healthy: boolean, responseTime: number, error?: Error): void {
    const instances = this.services.get(instance.name)
    if (!instances) return
    
    const targetInstance = instances.find(i => i.id === instance.id)
    if (!targetInstance) return
    
    targetInstance.lastHealthCheck = Date.now()
    
    // Implement threshold-based health checking
    const healthyThreshold = this.config.healthCheck.healthyThreshold
    const unhealthyThreshold = this.config.healthCheck.unhealthyThreshold
    
    // Simple implementation - in production, you'd track consecutive checks
    if (healthy) {
      if (targetInstance.health !== 'healthy') {
        targetInstance.health = 'healthy'
        console.log(`Instance ${instance.id} is now healthy (${responseTime}ms)`)
      }
    } else {
      if (targetInstance.health !== 'unhealthy') {
        targetInstance.health = 'unhealthy'
        console.warn(`Instance ${instance.id} is now unhealthy:`, error?.message)
      }
    }
  }

  private getOrCreateCircuitBreaker(instance: ServiceInstance): CircuitBreaker {
    const key = `${instance.name}:${instance.id}`
    
    if (!this.circuitBreakers.has(key)) {
      const breaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 30000,
        monitoringPeriod: 60000
      })
      
      this.circuitBreakers.set(key, breaker)
    }
    
    return this.circuitBreakers.get(key)!
  }

  private selectRoundRobin(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const stateKey = `${serviceName}:round_robin`
    let currentIndex = this.loadBalancerState.get(stateKey) || 0
    
    const selectedInstance = instances[currentIndex % instances.length]
    this.loadBalancerState.set(stateKey, currentIndex + 1)
    
    return selectedInstance
  }

  private selectWeightedRoundRobin(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + (instance.weight || 1), 0)
    const random = Math.random() * totalWeight
    
    let weightSum = 0
    for (const instance of instances) {
      weightSum += instance.weight || 1
      if (random <= weightSum) {
        return instance
      }
    }
    
    return instances[0] // Fallback
  }

  private selectLeastConnections(instances: ServiceInstance[]): ServiceInstance {
    // Simplified implementation - in production, you'd track actual connections
    return instances[Math.floor(Math.random() * instances.length)]
  }

  private selectRandom(instances: ServiceInstance[]): ServiceInstance {
    return instances[Math.floor(Math.random() * instances.length)]
  }

  private selectConsistentHash(serviceName: string, instances: ServiceInstance[], clientId?: string): ServiceInstance {
    if (!clientId) {
      return this.selectRandom(instances)
    }
    
    // Simple hash-based selection
    const hash = this.hashString(clientId + serviceName)
    const index = hash % instances.length
    return instances[index]
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all health check intervals
    this.healthCheckIntervals.forEach(interval => {
      clearInterval(interval)
    })
    this.healthCheckIntervals.clear()
    
    // Clear all circuit breakers
    this.circuitBreakers.clear()
    
    // Clear services
    this.services.clear()
    
    console.log('Service mesh destroyed')
  }
}