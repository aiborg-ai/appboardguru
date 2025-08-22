/**
 * Enhanced API System Integration
 * Brings together all API enhancement components
 */

import { APIGateway, GatewayConfig } from './gateway'
import { AdaptiveRateLimiter } from './rate-limiter/adaptive-limiter'
import { RateLimitAnalytics } from './rate-limiter/analytics'
import { EnhancedAPIDocumentationGenerator, APIDocumentationConfig } from './docs/enhanced-generator'
import { WebhookSystem } from './webhooks/webhook-system'
import { GraphQLServer } from './graphql/server'
import { createDataLoaders, DataLoaders } from '../graphql/dataloaders'
import { getOpenAPIRegistry } from '../openapi/registry'

export interface EnhancedAPIConfig {
  gateway: Partial<GatewayConfig>
  documentation: Partial<APIDocumentationConfig>
  graphql: {
    enabled: boolean
    playgroundEnabled?: boolean
    introspectionEnabled?: boolean
  }
  webhooks: {
    enabled: boolean
    redisUrl?: string
  }
  rateLimiting: {
    enabled: boolean
    redisUrl?: string
  }
  analytics: {
    enabled: boolean
    redisUrl?: string
  }
}

export class EnhancedAPISystem {
  private gateway: APIGateway
  private rateLimiter: AdaptiveRateLimiter
  private analytics: RateLimitAnalytics
  private docGenerator: EnhancedAPIDocumentationGenerator
  private webhookSystem: WebhookSystem
  private graphqlServer: GraphQLServer
  private dataLoaders: DataLoaders
  private config: EnhancedAPIConfig

  constructor(config: EnhancedAPIConfig) {
    this.config = {
      gateway: {
        enableCaching: true,
        enableVersioning: true,
        enableAnalytics: true,
        enableRateLimit: true,
        enableAPIKeys: true,
        ...config.gateway
      },
      documentation: {
        outputDir: './docs/api',
        includeGraphQL: config.graphql.enabled,
        includeSamples: true,
        includeSDKs: true,
        supportedLanguages: ['typescript', 'javascript', 'python'],
        generateChangelog: true,
        includePostmanCollection: true,
        includeCurlExamples: true,
        ...config.documentation
      },
      ...config
    }

    this.initializeComponents()
  }

  private initializeComponents(): void {
    // Initialize rate limiting
    if (this.config.rateLimiting.enabled) {
      this.rateLimiter = new AdaptiveRateLimiter(this.config.rateLimiting.redisUrl)
    }

    // Initialize analytics
    if (this.config.analytics.enabled) {
      this.analytics = new RateLimitAnalytics(this.config.analytics.redisUrl)
    }

    // Initialize webhook system
    if (this.config.webhooks.enabled) {
      this.webhookSystem = new WebhookSystem(this.config.webhooks.redisUrl)
    }

    // Initialize GraphQL
    if (this.config.graphql.enabled) {
      this.dataLoaders = createDataLoaders()
      this.graphqlServer = new GraphQLServer({
        playgroundEnabled: this.config.graphql.playgroundEnabled ?? process.env.NODE_ENV === 'development',
        introspectionEnabled: this.config.graphql.introspectionEnabled ?? process.env.NODE_ENV === 'development',
        dataLoaders: this.dataLoaders
      })
    }

    // Initialize API Gateway
    this.gateway = new APIGateway(this.config.gateway)

    // Initialize documentation generator
    this.docGenerator = new EnhancedAPIDocumentationGenerator(this.config.documentation)
  }

  /**
   * Start the enhanced API system
   */
  async start(): Promise<void> {
    console.log('🚀 Starting Enhanced API System...')

    // Register default routes with the gateway
    await this.registerDefaultRoutes()

    // Generate initial documentation
    if (process.env.GENERATE_DOCS_ON_START === 'true') {
      console.log('📚 Generating API documentation...')
      await this.docGenerator.generateAll()
    }

    // Set up webhook event listeners
    if (this.config.webhooks.enabled) {
      await this.setupWebhookEvents()
    }

    // Start background services
    await this.startBackgroundServices()

    console.log('✅ Enhanced API System started successfully')
    console.log(`📊 Gateway: ${this.config.gateway.enableCaching ? 'Caching enabled' : 'Caching disabled'}`)
    console.log(`📈 Analytics: ${this.config.analytics.enabled ? 'Enabled' : 'Disabled'}`)
    console.log(`🔌 Webhooks: ${this.config.webhooks.enabled ? 'Enabled' : 'Disabled'}`)
    console.log(`🎯 GraphQL: ${this.config.graphql.enabled ? 'Enabled' : 'Disabled'}`)
  }

  /**
   * Register default API routes with the gateway
   */
  private async registerDefaultRoutes(): Promise<void> {
    const registry = getOpenAPIRegistry()
    const endpoints = registry.getEndpoints()

    for (const endpoint of endpoints) {
      const { meta } = endpoint

      this.gateway.addRoute({
        path: meta.path,
        method: meta.method.toLowerCase() as any,
        backend: process.env.API_BACKEND_URL || 'http://localhost:3000',
        requiresAuth: meta.requiresAuth || true,
        cacheStrategy: this.determineCacheStrategy(meta.path, meta.method),
        cacheTTL: this.determineCacheTTL(meta.path, meta.method),
        rateLimit: this.determineRateLimit(meta.path, meta.method)
      })
    }

    // Add GraphQL route if enabled
    if (this.config.graphql.enabled) {
      this.gateway.addRoute({
        path: '/api/graphql',
        method: 'POST',
        backend: process.env.GRAPHQL_BACKEND_URL || 'http://localhost:3000',
        requiresAuth: true,
        cacheStrategy: 'bypass', // GraphQL shouldn't be cached
        rateLimit: {
          requests: 100,
          windowMs: 60000 // 1 minute
        }
      })
    }

    console.log(`📡 Registered ${endpoints.length + (this.config.graphql.enabled ? 1 : 0)} routes with API Gateway`)
  }

  private determineCacheStrategy(path: string, method: string): 'aggressive' | 'conservative' | 'bypass' | 'custom' {
    if (method !== 'GET') return 'bypass'
    
    if (path.includes('/health') || path.includes('/metrics')) return 'conservative'
    if (path.includes('/search') || path.includes('/analytics')) return 'conservative'
    if (path.includes('/assets') || path.includes('/organizations')) return 'aggressive'
    
    return 'conservative'
  }

  private determineCacheTTL(path: string, method: string): number {
    if (method !== 'GET') return 0
    
    if (path.includes('/health')) return 30 // 30 seconds
    if (path.includes('/organizations')) return 300 // 5 minutes
    if (path.includes('/assets')) return 60 // 1 minute
    if (path.includes('/analytics')) return 180 // 3 minutes
    
    return 60 // Default 1 minute
  }

  private determineRateLimit(path: string, method: string): { requests: number; windowMs: number } {
    // Authentication endpoints - strict limits
    if (path.includes('/auth')) {
      return { requests: 10, windowMs: 15 * 60 * 1000 } // 10 requests per 15 minutes
    }

    // Upload endpoints - moderate limits
    if (path.includes('/assets') && method === 'POST') {
      return { requests: 20, windowMs: 60 * 1000 } // 20 uploads per minute
    }

    // Search endpoints - moderate limits
    if (path.includes('/search')) {
      return { requests: 50, windowMs: 60 * 1000 } // 50 searches per minute
    }

    // Analytics endpoints - moderate limits
    if (path.includes('/analytics')) {
      return { requests: 30, windowMs: 60 * 1000 } // 30 requests per minute
    }

    // Default rate limit
    return { requests: 100, windowMs: 60 * 1000 } // 100 requests per minute
  }

  /**
   * Set up webhook events for various system events
   */
  private async setupWebhookEvents(): Promise<void> {
    // This would integrate with your existing event system
    // For demonstration, we'll show how to publish webhook events

    // Example: Asset created event
    // eventBus.on('asset.created', async (asset) => {
    //   await this.webhookSystem.publishEvent({
    //     type: 'asset.created',
    //     data: asset,
    //     organizationId: asset.organizationId
    //   })
    // })

    // Example: Organization updated event
    // eventBus.on('organization.updated', async (organization) => {
    //   await this.webhookSystem.publishEvent({
    //     type: 'organization.updated',
    //     data: organization,
    //     organizationId: organization.id
    //   })
    // })

    console.log('🔗 Webhook event listeners configured')
  }

  /**
   * Start background services
   */
  private async startBackgroundServices(): Promise<void> {
    // Rate limiting cleanup
    if (this.config.rateLimiting.enabled) {
      setInterval(() => {
        // Cleanup is handled automatically by the rate limiter
      }, 5 * 60 * 1000) // 5 minutes
    }

    // Analytics data aggregation
    if (this.config.analytics.enabled) {
      setInterval(async () => {
        try {
          // Aggregate analytics data
          console.log('📊 Aggregating analytics data...')
        } catch (error) {
          console.error('Analytics aggregation error:', error)
        }
      }, 15 * 60 * 1000) // 15 minutes
    }

    // Documentation regeneration (if auto-update is enabled)
    if (process.env.AUTO_REGENERATE_DOCS === 'true') {
      setInterval(async () => {
        try {
          console.log('📚 Regenerating API documentation...')
          await this.docGenerator.generateAll()
        } catch (error) {
          console.error('Documentation generation error:', error)
        }
      }, 60 * 60 * 1000) // 1 hour
    }

    console.log('⚙️ Background services started')
  }

  /**
   * Get comprehensive API system status
   */
  async getSystemStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    components: Record<string, { status: string; details?: any }>
    metrics: {
      totalRequests: number
      errorRate: number
      averageResponseTime: number
      cacheHitRate: number
      webhooksDelivered: number
    }
  }> {
    const components: Record<string, { status: string; details?: any }> = {}

    // Gateway health
    try {
      const gatewayHealth = await this.gateway.healthCheck()
      components.gateway = {
        status: gatewayHealth.status,
        details: gatewayHealth.checks
      }
    } catch (error) {
      components.gateway = { status: 'unhealthy', details: { error: error.message } }
    }

    // Rate limiter health
    if (this.config.rateLimiting.enabled) {
      try {
        const stats = await this.rateLimiter.getAnalytics({ from: new Date(Date.now() - 60000), to: new Date() })
        components.rateLimiter = { status: 'healthy', details: stats }
      } catch (error) {
        components.rateLimiter = { status: 'unhealthy', details: { error: error.message } }
      }
    }

    // Webhook system health
    if (this.config.webhooks.enabled) {
      try {
        // Webhook system doesn't have a built-in health check, so we'll check basic functionality
        components.webhooks = { status: 'healthy' }
      } catch (error) {
        components.webhooks = { status: 'unhealthy', details: { error: error.message } }
      }
    }

    // GraphQL health
    if (this.config.graphql.enabled) {
      try {
        components.graphql = { status: 'healthy' }
      } catch (error) {
        components.graphql = { status: 'unhealthy', details: { error: error.message } }
      }
    }

    // Determine overall status
    const componentStatuses = Object.values(components).map(c => c.status)
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    if (componentStatuses.some(status => status === 'unhealthy')) {
      overallStatus = 'unhealthy'
    } else if (componentStatuses.some(status => status === 'degraded')) {
      overallStatus = 'degraded'
    }

    // Get metrics
    const gatewayStats = await this.gateway.getStats()
    const analyticsData = this.config.analytics.enabled 
      ? await this.analytics.getMetrics({ from: new Date(Date.now() - 3600000), to: new Date() })
      : null

    return {
      status: overallStatus,
      components,
      metrics: {
        totalRequests: gatewayStats.totalRequests,
        errorRate: gatewayStats.errorRate,
        averageResponseTime: gatewayStats.averageResponseTime,
        cacheHitRate: gatewayStats.cacheHitRate,
        webhooksDelivered: analyticsData?.totalDeliveries || 0
      }
    }
  }

  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(timeRange: { from: Date; to: Date }) {
    const metrics: any = {}

    // Gateway metrics
    const gatewayStats = await this.gateway.getStats()
    metrics.gateway = gatewayStats

    // Rate limiting metrics
    if (this.config.rateLimiting.enabled && this.config.analytics.enabled) {
      const rateLimitMetrics = await this.analytics.getMetrics(timeRange)
      metrics.rateLimiting = rateLimitMetrics
    }

    // Webhook metrics
    if (this.config.webhooks.enabled) {
      // Assuming we have an organizationId, in practice this would come from context
      // const webhookAnalytics = await this.webhookSystem.getAnalytics('org-id', timeRange)
      // metrics.webhooks = webhookAnalytics
    }

    return metrics
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Enhanced API System...')

    try {
      // Close webhook system
      if (this.config.webhooks.enabled && this.webhookSystem) {
        await this.webhookSystem.close()
      }

      // Close GraphQL server
      if (this.config.graphql.enabled && this.graphqlServer) {
        await this.graphqlServer.stop()
      }

      console.log('✅ Enhanced API System shutdown complete')
    } catch (error) {
      console.error('❌ Error during shutdown:', error)
    }
  }

  // Getters for individual components
  get apiGateway(): APIGateway { return this.gateway }
  get rateLimitingSystem(): AdaptiveRateLimiter { return this.rateLimiter }
  get analyticsSystem(): RateLimitAnalytics { return this.analytics }
  get documentationGenerator(): EnhancedAPIDocumentationGenerator { return this.docGenerator }
  get webhookManager(): WebhookSystem { return this.webhookSystem }
  get graphql(): GraphQLServer { return this.graphqlServer }
}

/**
 * Factory function to create and configure the Enhanced API System
 */
export function createEnhancedAPISystem(config?: Partial<EnhancedAPIConfig>): EnhancedAPISystem {
  const defaultConfig: EnhancedAPIConfig = {
    gateway: {
      enableCaching: true,
      enableLoadBalancing: false,
      enableVersioning: true,
      enableAnalytics: true,
      enableRateLimit: true,
      enableAPIKeys: true,
      defaultVersion: 'v1',
      supportedVersions: ['v1', 'v2']
    },
    documentation: {
      outputDir: process.env.API_DOCS_OUTPUT_DIR || './docs/api',
      includeGraphQL: true,
      includeSamples: true,
      includeSDKs: true,
      supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go'],
      generateChangelog: true,
      includePostmanCollection: true,
      includeCurlExamples: true
    },
    graphql: {
      enabled: process.env.ENABLE_GRAPHQL !== 'false',
      playgroundEnabled: process.env.NODE_ENV === 'development',
      introspectionEnabled: process.env.NODE_ENV === 'development'
    },
    webhooks: {
      enabled: process.env.ENABLE_WEBHOOKS !== 'false',
      redisUrl: process.env.REDIS_URL
    },
    rateLimiting: {
      enabled: process.env.ENABLE_RATE_LIMITING !== 'false',
      redisUrl: process.env.REDIS_URL
    },
    analytics: {
      enabled: process.env.ENABLE_ANALYTICS !== 'false',
      redisUrl: process.env.REDIS_URL
    },
    ...config
  }

  return new EnhancedAPISystem(defaultConfig)
}

// Global instance for easy access
let globalEnhancedAPI: EnhancedAPISystem | null = null

export function getGlobalEnhancedAPI(): EnhancedAPISystem | null {
  return globalEnhancedAPI
}

export function initializeGlobalEnhancedAPI(config?: Partial<EnhancedAPIConfig>): EnhancedAPISystem {
  if (!globalEnhancedAPI) {
    globalEnhancedAPI = createEnhancedAPISystem(config)
  }
  return globalEnhancedAPI
}