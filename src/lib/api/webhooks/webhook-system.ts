/**
 * Webhook System
 * Reliable webhook delivery with retry mechanisms, signatures, and management
 */

import { createHmac, timingSafeEqual } from 'crypto'
import Redis from 'ioredis'
import { Queue, Worker, Job } from 'bullmq'
import { logSecurityEvent } from '../../security/audit'

export interface WebhookEndpoint {
  id: string
  organizationId: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  description?: string
  metadata?: Record<string, any>
  retryConfig?: {
    maxAttempts: number
    backoffMultiplier: number
    maxDelay: number
  }
}

export interface WebhookEvent {
  id: string
  type: string
  data: any
  organizationId: string
  occurredAt: Date
  version: string
}

export interface WebhookDelivery {
  id: string
  webhookEndpointId: string
  eventId: string
  url: string
  httpMethod: string
  headers: Record<string, string>
  payload: any
  signature: string
  status: 'pending' | 'success' | 'failed' | 'retry'
  attempts: number
  maxAttempts: number
  nextAttemptAt?: Date
  responseStatus?: number
  responseHeaders?: Record<string, string>
  responseBody?: string
  error?: string
  createdAt: Date
  deliveredAt?: Date
}

export interface WebhookRetryConfig {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableStatusCodes: number[]
}

export class WebhookSystem {
  private redis: Redis
  private queue: Queue
  private worker: Worker
  private endpoints: Map<string, WebhookEndpoint> = new Map()
  private defaultRetryConfig: WebhookRetryConfig = {
    maxAttempts: 5,
    initialDelay: 1000, // 1 second
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
  }

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379')
    
    // Initialize BullMQ for reliable job processing
    this.queue = new Queue('webhook-delivery', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    })

    this.worker = new Worker('webhook-delivery', this.processWebhookJob.bind(this), {
      connection: this.redis,
      concurrency: 10,
    })

    this.worker.on('completed', this.handleJobCompleted.bind(this))
    this.worker.on('failed', this.handleJobFailed.bind(this))

    this.loadWebhookEndpoints()
    this.startCleanupJob()
  }

  /**
   * Register a webhook endpoint
   */
  async registerEndpoint(
    organizationId: string,
    url: string,
    events: string[],
    options: {
      description?: string
      metadata?: Record<string, any>
      retryConfig?: Partial<WebhookRetryConfig>
    } = {}
  ): Promise<WebhookEndpoint> {
    const endpointId = this.generateId()
    const secret = this.generateSecret()

    const endpoint: WebhookEndpoint = {
      id: endpointId,
      organizationId,
      url,
      events,
      secret,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: options.description,
      metadata: options.metadata,
      retryConfig: {
        ...this.defaultRetryConfig,
        ...options.retryConfig
      }
    }

    // Store in Redis and local cache
    await this.redis.hset('webhook:endpoints', endpointId, JSON.stringify(endpoint))
    this.endpoints.set(endpointId, endpoint)

    // Index by organization for fast lookups
    await this.redis.sadd(`webhook:org:${organizationId}`, endpointId)

    await logSecurityEvent('webhook_endpoint_registered', {
      endpointId,
      organizationId,
      url,
      events
    }, 'medium')

    return endpoint
  }

  /**
   * Update webhook endpoint
   */
  async updateEndpoint(
    endpointId: string,
    updates: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'isActive' | 'description' | 'metadata' | 'retryConfig'>>
  ): Promise<WebhookEndpoint | null> {
    const existing = await this.getEndpoint(endpointId)
    if (!existing) {
      return null
    }

    const updated: WebhookEndpoint = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    }

    await this.redis.hset('webhook:endpoints', endpointId, JSON.stringify(updated))
    this.endpoints.set(endpointId, updated)

    return updated
  }

  /**
   * Delete webhook endpoint
   */
  async deleteEndpoint(endpointId: string): Promise<boolean> {
    const endpoint = await this.getEndpoint(endpointId)
    if (!endpoint) {
      return false
    }

    // Remove from Redis
    await this.redis.hdel('webhook:endpoints', endpointId)
    await this.redis.srem(`webhook:org:${endpoint.organizationId}`, endpointId)

    // Remove from local cache
    this.endpoints.delete(endpointId)

    // Cancel any pending deliveries
    await this.cancelPendingDeliveries(endpointId)

    await logSecurityEvent('webhook_endpoint_deleted', {
      endpointId,
      organizationId: endpoint.organizationId,
      url: endpoint.url
    }, 'medium')

    return true
  }

  /**
   * Get webhook endpoint
   */
  async getEndpoint(endpointId: string): Promise<WebhookEndpoint | null> {
    // Try local cache first
    const cached = this.endpoints.get(endpointId)
    if (cached) {
      return cached
    }

    // Load from Redis
    const data = await this.redis.hget('webhook:endpoints', endpointId)
    if (!data) {
      return null
    }

    const endpoint = JSON.parse(data) as WebhookEndpoint
    endpoint.createdAt = new Date(endpoint.createdAt)
    endpoint.updatedAt = new Date(endpoint.updatedAt)

    this.endpoints.set(endpointId, endpoint)
    return endpoint
  }

  /**
   * Get webhook endpoints for organization
   */
  async getEndpointsByOrganization(organizationId: string): Promise<WebhookEndpoint[]> {
    const endpointIds = await this.redis.smembers(`webhook:org:${organizationId}`)
    const endpoints = await Promise.all(
      endpointIds.map(id => this.getEndpoint(id))
    )

    return endpoints.filter((endpoint): endpoint is WebhookEndpoint => endpoint !== null)
  }

  /**
   * Publish webhook event
   */
  async publishEvent(event: Omit<WebhookEvent, 'id' | 'occurredAt' | 'version'>): Promise<void> {
    const webhookEvent: WebhookEvent = {
      ...event,
      id: this.generateId(),
      occurredAt: new Date(),
      version: '1.0'
    }

    // Store event for potential replays
    await this.redis.setex(
      `webhook:event:${webhookEvent.id}`,
      86400 * 7, // Keep for 7 days
      JSON.stringify(webhookEvent)
    )

    // Find matching endpoints
    const endpoints = await this.getEndpointsByOrganization(event.organizationId)
    const matchingEndpoints = endpoints.filter(endpoint => 
      endpoint.isActive && endpoint.events.includes(event.type)
    )

    // Queue deliveries
    for (const endpoint of matchingEndpoints) {
      await this.queueDelivery(webhookEvent, endpoint)
    }

    console.log(`Webhook event ${webhookEvent.type} published to ${matchingEndpoints.length} endpoints`)
  }

  /**
   * Validate webhook signature
   */
  validateSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = this.generateSignature(payload, secret)
      
      // Use timing-safe comparison to prevent timing attacks
      const providedBuffer = Buffer.from(signature, 'hex')
      const expectedBuffer = Buffer.from(expectedSignature, 'hex')
      
      return providedBuffer.length === expectedBuffer.length &&
             timingSafeEqual(providedBuffer, expectedBuffer)
    } catch (error) {
      console.error('Signature validation error:', error)
      return false
    }
  }

  /**
   * Test webhook endpoint
   */
  async testEndpoint(endpointId: string): Promise<{
    success: boolean
    status?: number
    responseTime?: number
    error?: string
  }> {
    const endpoint = await this.getEndpoint(endpointId)
    if (!endpoint) {
      return { success: false, error: 'Endpoint not found' }
    }

    const testEvent: WebhookEvent = {
      id: 'test-' + this.generateId(),
      type: 'webhook.test',
      data: {
        message: 'This is a test webhook from AppBoardGuru',
        timestamp: new Date().toISOString()
      },
      organizationId: endpoint.organizationId,
      occurredAt: new Date(),
      version: '1.0'
    }

    const startTime = Date.now()

    try {
      const result = await this.deliverWebhook(testEvent, endpoint)
      const responseTime = Date.now() - startTime

      return {
        success: result.success,
        status: result.status,
        responseTime,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Get delivery history for endpoint
   */
  async getDeliveryHistory(
    endpointId: string,
    options: {
      limit?: number
      offset?: number
      status?: string
      dateFrom?: Date
      dateTo?: Date
    } = {}
  ): Promise<{
    deliveries: WebhookDelivery[]
    total: number
    hasMore: boolean
  }> {
    const { limit = 50, offset = 0 } = options
    
    // Get delivery IDs for this endpoint
    const deliveryIds = await this.redis.lrange(
      `webhook:deliveries:${endpointId}`,
      offset,
      offset + limit - 1
    )

    // Get delivery details
    const deliveries = await Promise.all(
      deliveryIds.map(async (id) => {
        const data = await this.redis.hget('webhook:delivery', id)
        if (!data) return null
        
        const delivery = JSON.parse(data) as WebhookDelivery
        delivery.createdAt = new Date(delivery.createdAt)
        if (delivery.deliveredAt) {
          delivery.deliveredAt = new Date(delivery.deliveredAt)
        }
        if (delivery.nextAttemptAt) {
          delivery.nextAttemptAt = new Date(delivery.nextAttemptAt)
        }
        
        return delivery
      })
    )

    const filteredDeliveries = deliveries
      .filter((delivery): delivery is WebhookDelivery => delivery !== null)
      .filter(delivery => {
        if (options.status && delivery.status !== options.status) return false
        if (options.dateFrom && delivery.createdAt < options.dateFrom) return false
        if (options.dateTo && delivery.createdAt > options.dateTo) return false
        return true
      })

    const total = await this.redis.llen(`webhook:deliveries:${endpointId}`)

    return {
      deliveries: filteredDeliveries,
      total,
      hasMore: offset + filteredDeliveries.length < total
    }
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<boolean> {
    const data = await this.redis.hget('webhook:delivery', deliveryId)
    if (!data) {
      return false
    }

    const delivery = JSON.parse(data) as WebhookDelivery
    const endpoint = await this.getEndpoint(delivery.webhookEndpointId)
    const event = await this.getEvent(delivery.eventId)

    if (!endpoint || !event) {
      return false
    }

    // Queue for immediate retry
    await this.queueDelivery(event, endpoint, {
      priority: 10,
      delay: 0
    })

    return true
  }

  /**
   * Get webhook analytics
   */
  async getAnalytics(
    organizationId: string,
    timeRange: { from: Date; to: Date }
  ): Promise<{
    totalEvents: number
    totalDeliveries: number
    successfulDeliveries: number
    failedDeliveries: number
    averageResponseTime: number
    topEvents: Array<{ event: string; count: number }>
    deliverySuccessRate: number
    endpointHealthScores: Array<{ endpointId: string; url: string; healthScore: number }>
  }> {
    const endpoints = await this.getEndpointsByOrganization(organizationId)
    
    let totalEvents = 0
    let totalDeliveries = 0
    let successfulDeliveries = 0
    let failedDeliveries = 0
    let totalResponseTime = 0
    let responseCount = 0
    const eventCounts: Record<string, number> = {}
    const endpointHealthScores: Array<{ endpointId: string; url: string; healthScore: number }> = []

    for (const endpoint of endpoints) {
      const history = await this.getDeliveryHistory(endpoint.id, {
        limit: 1000,
        dateFrom: timeRange.from,
        dateTo: timeRange.to
      })

      totalDeliveries += history.deliveries.length

      for (const delivery of history.deliveries) {
        if (delivery.status === 'success') {
          successfulDeliveries++
        } else {
          failedDeliveries++
        }

        // Calculate response time for successful deliveries
        if (delivery.deliveredAt && delivery.responseStatus) {
          const responseTime = delivery.deliveredAt.getTime() - delivery.createdAt.getTime()
          totalResponseTime += responseTime
          responseCount++
        }

        // Count events by type
        const event = await this.getEvent(delivery.eventId)
        if (event) {
          eventCounts[event.type] = (eventCounts[event.type] || 0) + 1
          totalEvents++
        }
      }

      // Calculate health score for endpoint
      const recentDeliveries = history.deliveries.slice(0, 100) // Last 100 deliveries
      const successRate = recentDeliveries.length > 0
        ? recentDeliveries.filter(d => d.status === 'success').length / recentDeliveries.length
        : 1

      endpointHealthScores.push({
        endpointId: endpoint.id,
        url: endpoint.url,
        healthScore: Math.round(successRate * 100)
      })
    }

    const topEvents = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([event, count]) => ({ event, count }))

    return {
      totalEvents,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
      topEvents,
      deliverySuccessRate: totalDeliveries > 0 ? successfulDeliveries / totalDeliveries : 1,
      endpointHealthScores
    }
  }

  private async queueDelivery(
    event: WebhookEvent,
    endpoint: WebhookEndpoint,
    jobOptions: { priority?: number; delay?: number } = {}
  ): Promise<void> {
    const deliveryId = this.generateId()
    const payload = JSON.stringify({
      id: event.id,
      type: event.type,
      data: event.data,
      occurred_at: event.occurredAt.toISOString(),
      version: event.version
    })

    const signature = this.generateSignature(payload, endpoint.secret)

    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhookEndpointId: endpoint.id,
      eventId: event.id,
      url: endpoint.url,
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AppBoardGuru-Webhooks/1.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Delivery': deliveryId,
        'X-Webhook-Event': event.type,
        'X-Webhook-Timestamp': event.occurredAt.getTime().toString()
      },
      payload,
      signature,
      status: 'pending',
      attempts: 0,
      maxAttempts: endpoint.retryConfig?.maxAttempts || this.defaultRetryConfig.maxAttempts,
      createdAt: new Date()
    }

    // Store delivery
    await this.redis.hset('webhook:delivery', deliveryId, JSON.stringify(delivery))
    await this.redis.lpush(`webhook:deliveries:${endpoint.id}`, deliveryId)

    // Queue for processing
    await this.queue.add('deliver-webhook', {
      deliveryId,
      payload,
      endpoint,
      event
    }, {
      priority: jobOptions.priority || 1,
      delay: jobOptions.delay || 0,
      jobId: deliveryId
    })
  }

  private async processWebhookJob(job: Job): Promise<void> {
    const { deliveryId, payload, endpoint, event } = job.data

    try {
      const result = await this.deliverWebhook(event, endpoint)
      
      // Update delivery status
      await this.updateDeliveryStatus(deliveryId, {
        status: result.success ? 'success' : 'failed',
        responseStatus: result.status,
        responseHeaders: result.headers,
        responseBody: result.body,
        error: result.error,
        deliveredAt: result.success ? new Date() : undefined
      })

      if (!result.success) {
        throw new Error(result.error || 'Webhook delivery failed')
      }
    } catch (error) {
      await this.updateDeliveryStatus(deliveryId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error // Re-throw to trigger retry
    }
  }

  private async deliverWebhook(
    event: WebhookEvent,
    endpoint: WebhookEndpoint
  ): Promise<{
    success: boolean
    status?: number
    headers?: Record<string, string>
    body?: string
    error?: string
  }> {
    const payload = JSON.stringify({
      id: event.id,
      type: event.type,
      data: event.data,
      occurred_at: event.occurredAt.toISOString(),
      version: event.version
    })

    const signature = this.generateSignature(payload, endpoint.secret)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AppBoardGuru-Webhooks/1.0',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event.type,
          'X-Webhook-Timestamp': event.occurredAt.getTime().toString()
        },
        body: payload,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const responseBody = await response.text()
      const responseHeaders: Record<string, string> = {}
      
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      const success = response.status >= 200 && response.status < 300

      return {
        success,
        status: response.status,
        headers: responseHeaders,
        body: responseBody
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  private async updateDeliveryStatus(
    deliveryId: string,
    updates: Partial<WebhookDelivery>
  ): Promise<void> {
    const data = await this.redis.hget('webhook:delivery', deliveryId)
    if (!data) return

    const delivery = JSON.parse(data) as WebhookDelivery
    const updatedDelivery = { ...delivery, ...updates }
    updatedDelivery.attempts = (delivery.attempts || 0) + 1

    await this.redis.hset('webhook:delivery', deliveryId, JSON.stringify(updatedDelivery))
  }

  private async handleJobCompleted(job: Job): Promise<void> {
    console.log(`Webhook delivery completed: ${job.id}`)
  }

  private async handleJobFailed(job: Job, err: Error): Promise<void> {
    console.error(`Webhook delivery failed: ${job.id}`, err.message)
    
    // Log failed delivery for monitoring
    await logSecurityEvent('webhook_delivery_failed', {
      jobId: job.id,
      error: err.message,
      attempts: job.attemptsMade,
      data: job.data
    }, 'medium')
  }

  private generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSecret(): string {
    return Buffer.from(Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 256)
    )).toString('hex')
  }

  private async loadWebhookEndpoints(): Promise<void> {
    try {
      const endpoints = await this.redis.hgetall('webhook:endpoints')
      
      for (const [id, data] of Object.entries(endpoints)) {
        const endpoint = JSON.parse(data) as WebhookEndpoint
        endpoint.createdAt = new Date(endpoint.createdAt)
        endpoint.updatedAt = new Date(endpoint.updatedAt)
        this.endpoints.set(id, endpoint)
      }
      
      console.log(`Loaded ${this.endpoints.size} webhook endpoints`)
    } catch (error) {
      console.error('Failed to load webhook endpoints:', error)
    }
  }

  private async getEvent(eventId: string): Promise<WebhookEvent | null> {
    const data = await this.redis.get(`webhook:event:${eventId}`)
    if (!data) return null

    const event = JSON.parse(data) as WebhookEvent
    event.occurredAt = new Date(event.occurredAt)
    return event
  }

  private async cancelPendingDeliveries(endpointId: string): Promise<void> {
    // Cancel any pending jobs for this endpoint
    const jobs = await this.queue.getJobs(['waiting', 'delayed'])
    
    for (const job of jobs) {
      if (job.data.endpoint?.id === endpointId) {
        await job.remove()
      }
    }
  }

  private startCleanupJob(): void {
    // Clean up old webhook data every hour
    setInterval(async () => {
      try {
        await this.cleanupOldData()
      } catch (error) {
        console.error('Webhook cleanup error:', error)
      }
    }, 60 * 60 * 1000) // 1 hour
  }

  private async cleanupOldData(): Promise<void> {
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000) // 30 days ago

    // Clean up old events
    const eventKeys = await this.redis.keys('webhook:event:*')
    for (const key of eventKeys) {
      const eventId = key.split(':')[2]
      const timestamp = parseInt(eventId.split('_')[0])
      
      if (timestamp < cutoffTime) {
        await this.redis.del(key)
      }
    }

    // Clean up old deliveries
    const deliveryKeys = await this.redis.hkeys('webhook:delivery')
    for (const deliveryId of deliveryKeys) {
      const timestamp = parseInt(deliveryId.split('_')[0])
      
      if (timestamp < cutoffTime) {
        await this.redis.hdel('webhook:delivery', deliveryId)
      }
    }

    console.log('Webhook cleanup completed')
  }

  /**
   * Close connections and cleanup
   */
  async close(): Promise<void> {
    await this.worker.close()
    await this.queue.close()
    await this.redis.quit()
  }
}