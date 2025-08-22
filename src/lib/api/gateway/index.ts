/**
 * API Gateway
 * Intelligent routing, load balancing, caching, and version management
 */

import { NextRequest, NextResponse } from 'next/server'
import { AdaptiveRateLimiter } from '../rate-limiter/adaptive-limiter'
import { CacheManager } from './cache-manager'
import { LoadBalancer } from './load-balancer'
import { VersionManager } from './version-manager'
import { RequestRouter } from './router'
import { APIKeyManager } from './api-key-manager'
import { UsageAnalytics } from './usage-analytics'
import { ResponseTransformer } from './response-transformer'

export interface GatewayConfig {
  enableCaching: boolean
  enableLoadBalancing: boolean
  enableVersioning: boolean
  enableAnalytics: boolean
  enableRateLimit: boolean
  enableAPIKeys: boolean
  defaultVersion: string
  supportedVersions: string[]
  cacheConfig: {
    defaultTTL: number
    maxSize: number
    enableCompression: boolean
  }
  loadBalancerConfig: {
    strategy: 'round_robin' | 'weighted' | 'least_connections' | 'health_based'
    healthCheckInterval: number
    maxFailures: number
  }
}

export interface RouteConfig {
  path: string
  method: string
  version?: string
  backend: string
  cacheStrategy?: 'aggressive' | 'conservative' | 'bypass' | 'custom'
  cacheTTL?: number
  rateLimit?: {
    requests: number
    windowMs: number
    tier?: string
  }
  requiresAuth: boolean
  requiredScopes?: string[]
  transformRequest?: boolean
  transformResponse?: boolean
  healthCheck?: boolean
}

export interface APIGatewayContext {
  requestId: string
  userId?: string
  apiKey?: string
  version: string
  clientIp: string
  userAgent: string
  startTime: number
  route?: RouteConfig
  metadata: Record<string, any>
}

export class APIGateway {
  private rateLimiter: AdaptiveRateLimiter
  private cacheManager: CacheManager
  private loadBalancer: LoadBalancer
  private versionManager: VersionManager
  private router: RequestRouter
  private apiKeyManager: APIKeyManager
  private analytics: UsageAnalytics
  private responseTransformer: ResponseTransformer
  private config: GatewayConfig

  constructor(config: Partial<GatewayConfig> = {}) {
    this.config = {
      enableCaching: true,
      enableLoadBalancing: false,
      enableVersioning: true,
      enableAnalytics: true,
      enableRateLimit: true,
      enableAPIKeys: true,
      defaultVersion: 'v1',
      supportedVersions: ['v1', 'v2'],
      cacheConfig: {
        defaultTTL: 300, // 5 minutes
        maxSize: 1000,
        enableCompression: true
      },
      loadBalancerConfig: {
        strategy: 'health_based',
        healthCheckInterval: 30000,
        maxFailures: 3
      },
      ...config
    }

    this.rateLimiter = new AdaptiveRateLimiter()
    this.cacheManager = new CacheManager(this.config.cacheConfig)
    this.loadBalancer = new LoadBalancer(this.config.loadBalancerConfig)
    this.versionManager = new VersionManager(this.config.supportedVersions, this.config.defaultVersion)
    this.router = new RequestRouter()
    this.apiKeyManager = new APIKeyManager()
    this.analytics = new UsageAnalytics()
    this.responseTransformer = new ResponseTransformer()

    this.initializeRoutes()
  }

  /**
   * Main gateway handler - processes all incoming API requests
   */
  async handleRequest(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()
    const clientIp = this.extractClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    let context: APIGatewayContext = {
      requestId,
      version: this.config.defaultVersion,
      clientIp,
      userAgent,
      startTime,
      metadata: {}
    }

    try {
      // 1. Request preprocessing
      context = await this.preprocessRequest(request, context)

      // 2. Authentication and API key validation
      if (this.config.enableAPIKeys) {
        const authResult = await this.authenticateRequest(request, context)
        if (!authResult.success) {
          return this.createErrorResponse(authResult.error!, 401, context)
        }
        context.userId = authResult.userId
        context.apiKey = authResult.apiKey
      }

      // 3. Route resolution
      const route = await this.router.resolveRoute(request.url, request.method, context.version)
      if (!route) {
        return this.createErrorResponse('Route not found', 404, context)
      }
      context.route = route

      // 4. Rate limiting
      if (this.config.enableRateLimit && route.rateLimit) {
        const rateLimitResult = await this.rateLimiter.checkAdaptiveRateLimit(
          context.userId || context.clientIp,
          route.path,
          route.method,
          route.rateLimit
        )

        if (!rateLimitResult.allowed) {
          await this.analytics.recordRequest(context, false, Date.now() - startTime)
          return this.createRateLimitResponse(rateLimitResult, context)
        }
      }

      // 5. Cache check (for GET requests)
      if (this.config.enableCaching && request.method === 'GET' && route.cacheStrategy !== 'bypass') {
        const cachedResponse = await this.cacheManager.get(request.url, context)
        if (cachedResponse) {
          await this.analytics.recordRequest(context, true, Date.now() - startTime, true)
          return this.createCachedResponse(cachedResponse, context)
        }
      }

      // 6. Request transformation
      let transformedRequest = request
      if (route.transformRequest) {
        transformedRequest = await this.responseTransformer.transformRequest(request, context)
      }

      // 7. Load balancing and backend selection
      const backend = this.config.enableLoadBalancing 
        ? await this.loadBalancer.selectBackend(route.backend, context)
        : route.backend

      // 8. Forward request to backend
      const backendResponse = await this.forwardToBackend(transformedRequest, backend, context)

      // 9. Response transformation
      let finalResponse = backendResponse
      if (route.transformResponse) {
        finalResponse = await this.responseTransformer.transformResponse(backendResponse, context)
      }

      // 10. Cache response (if cacheable)
      if (this.config.enableCaching && this.shouldCacheResponse(request, finalResponse, route)) {
        await this.cacheManager.set(
          request.url,
          finalResponse,
          route.cacheTTL || this.config.cacheConfig.defaultTTL,
          context
        )
      }

      // 11. Analytics recording
      if (this.config.enableAnalytics) {
        await this.analytics.recordRequest(context, true, Date.now() - startTime, false)
      }

      // 12. Add gateway headers
      this.addGatewayHeaders(finalResponse, context)

      return finalResponse

    } catch (error) {
      console.error(`Gateway error for request ${requestId}:`, error)
      
      if (this.config.enableAnalytics) {
        await this.analytics.recordRequest(context, false, Date.now() - startTime)
      }

      return this.createErrorResponse('Internal gateway error', 500, context)
    }
  }

  private async preprocessRequest(request: NextRequest, context: APIGatewayContext): Promise<APIGatewayContext> {
    // Extract version from URL, header, or query parameter
    const url = new URL(request.url)
    let version = this.config.defaultVersion

    // Check URL path for version (e.g., /api/v2/users)
    const pathVersionMatch = url.pathname.match(/\/api\/v(\d+)\//)
    if (pathVersionMatch) {
      version = `v${pathVersionMatch[1]}`
    }

    // Check headers for version
    const headerVersion = request.headers.get('API-Version')
    if (headerVersion && this.config.supportedVersions.includes(headerVersion)) {
      version = headerVersion
    }

    // Check query parameter for version
    const queryVersion = url.searchParams.get('version')
    if (queryVersion && this.config.supportedVersions.includes(queryVersion)) {
      version = queryVersion
    }

    // Validate version
    if (!this.config.supportedVersions.includes(version)) {
      version = this.config.defaultVersion
    }

    context.version = version
    context.metadata.originalUrl = request.url
    context.metadata.normalizedPath = this.normalizePath(url.pathname, version)

    return context
  }

  private async authenticateRequest(
    request: NextRequest,
    context: APIGatewayContext
  ): Promise<{ success: boolean; userId?: string; apiKey?: string; error?: string }> {
    // Check for API key in header
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!apiKey) {
      // Check if route requires authentication
      if (context.route?.requiresAuth) {
        return { success: false, error: 'API key required' }
      }
      return { success: true }
    }

    const validation = await this.apiKeyManager.validateKey(apiKey)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Check required scopes
    if (context.route?.requiredScopes) {
      const hasRequiredScopes = context.route.requiredScopes.every(scope => 
        validation.scopes?.includes(scope)
      )
      
      if (!hasRequiredScopes) {
        return { success: false, error: 'Insufficient permissions' }
      }
    }

    return {
      success: true,
      userId: validation.userId,
      apiKey
    }
  }

  private async forwardToBackend(
    request: NextRequest,
    backend: string,
    context: APIGatewayContext
  ): Promise<NextResponse> {
    const backendUrl = this.buildBackendUrl(request, backend, context)
    
    // Create new request with gateway headers
    const headers = new Headers(request.headers)
    headers.set('X-Gateway-Request-ID', context.requestId)
    headers.set('X-Gateway-Version', context.version)
    headers.set('X-Client-IP', context.clientIp)
    
    if (context.userId) {
      headers.set('X-User-ID', context.userId)
    }

    const backendRequest = new Request(backendUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
    })

    // Add timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(backendRequest, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Clone the response to allow it to be consumed multiple times
      const responseClone = response.clone()
      const body = await response.arrayBuffer()
      
      return new NextResponse(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Backend request timeout')
      }
      
      throw error
    }
  }

  private buildBackendUrl(request: NextRequest, backend: string, context: APIGatewayContext): string {
    const url = new URL(request.url)
    
    // Remove version from path if it was in the URL
    let pathname = url.pathname
    const versionPattern = /\/api\/v\d+\//
    if (versionPattern.test(pathname)) {
      pathname = pathname.replace(versionPattern, '/api/')
    }

    // Construct backend URL
    return `${backend}${pathname}${url.search}`
  }

  private shouldCacheResponse(request: NextRequest, response: NextResponse, route: RouteConfig): boolean {
    // Only cache GET requests
    if (request.method !== 'GET') return false
    
    // Don't cache if explicitly disabled
    if (route.cacheStrategy === 'bypass') return false
    
    // Don't cache error responses
    if (response.status >= 400) return false
    
    // Don't cache if response has no-cache header
    const cacheControl = response.headers.get('Cache-Control')
    if (cacheControl?.includes('no-cache') || cacheControl?.includes('private')) return false
    
    return true
  }

  private createErrorResponse(message: string, status: number, context: APIGatewayContext): NextResponse {
    const errorResponse = {
      success: false,
      error: message,
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      version: context.version
    }

    const response = NextResponse.json(errorResponse, { status })
    this.addGatewayHeaders(response, context)
    return response
  }

  private createRateLimitResponse(rateLimitResult: any, context: APIGatewayContext): NextResponse {
    const response = NextResponse.json({
      success: false,
      error: 'Rate limit exceeded',
      requestId: context.requestId,
      retryAfter: rateLimitResult.retryAfter
    }, { status: 429 })

    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString())
    if (rateLimitResult.retryAfter) {
      response.headers.set('Retry-After', rateLimitResult.retryAfter.toString())
    }

    this.addGatewayHeaders(response, context)
    return response
  }

  private createCachedResponse(cachedData: any, context: APIGatewayContext): NextResponse {
    const response = NextResponse.json(cachedData.body, { 
      status: cachedData.status,
      headers: cachedData.headers 
    })
    
    response.headers.set('X-Cache', 'HIT')
    response.headers.set('X-Cache-Age', ((Date.now() - cachedData.timestamp) / 1000).toString())
    
    this.addGatewayHeaders(response, context)
    return response
  }

  private addGatewayHeaders(response: NextResponse, context: APIGatewayContext): void {
    response.headers.set('X-Gateway-Request-ID', context.requestId)
    response.headers.set('X-Gateway-Version', context.version)
    response.headers.set('X-Response-Time', (Date.now() - context.startTime).toString())
    response.headers.set('X-Powered-By', 'AppBoardGuru API Gateway')
  }

  private normalizePath(pathname: string, version: string): string {
    // Remove version from path for normalization
    return pathname.replace(/\/api\/v\d+\//, '/api/')
  }

  private extractClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
           request.headers.get('x-real-ip') ||
           request.headers.get('x-client-ip') ||
           'unknown'
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeRoutes(): void {
    // Initialize default routes - these would typically be loaded from configuration
    const routes: RouteConfig[] = [
      // GraphQL endpoint
      {
        path: '/api/graphql',
        method: 'POST',
        backend: process.env.GRAPHQL_BACKEND_URL || 'http://localhost:3000',
        cacheStrategy: 'bypass', // GraphQL shouldn't be cached due to dynamic nature
        requiresAuth: true,
        rateLimit: {
          requests: 100,
          windowMs: 60000 // 1 minute
        }
      },
      
      // Asset endpoints
      {
        path: '/api/assets',
        method: 'GET',
        backend: process.env.API_BACKEND_URL || 'http://localhost:3000',
        cacheStrategy: 'conservative',
        cacheTTL: 60,
        requiresAuth: true,
        rateLimit: {
          requests: 200,
          windowMs: 60000
        }
      },
      {
        path: '/api/assets',
        method: 'POST',
        backend: process.env.API_BACKEND_URL || 'http://localhost:3000',
        cacheStrategy: 'bypass',
        requiresAuth: true,
        rateLimit: {
          requests: 20,
          windowMs: 60000
        }
      },
      
      // Organization endpoints
      {
        path: '/api/organizations',
        method: 'GET',
        backend: process.env.API_BACKEND_URL || 'http://localhost:3000',
        cacheStrategy: 'aggressive',
        cacheTTL: 300,
        requiresAuth: true
      },
      
      // Health check
      {
        path: '/api/health',
        method: 'GET',
        backend: process.env.API_BACKEND_URL || 'http://localhost:3000',
        cacheStrategy: 'conservative',
        cacheTTL: 30,
        requiresAuth: false,
        healthCheck: true
      },
      
      // Analytics endpoints
      {
        path: '/api/analytics/*',
        method: 'GET',
        backend: process.env.ANALYTICS_BACKEND_URL || 'http://localhost:3000',
        cacheStrategy: 'conservative',
        cacheTTL: 180,
        requiresAuth: true,
        requiredScopes: ['analytics:read'],
        rateLimit: {
          requests: 50,
          windowMs: 60000
        }
      }
    ]

    routes.forEach(route => this.router.addRoute(route))
  }

  /**
   * Add a new route to the gateway
   */
  addRoute(route: RouteConfig): void {
    this.router.addRoute(route)
  }

  /**
   * Remove a route from the gateway
   */
  removeRoute(path: string, method: string, version?: string): void {
    this.router.removeRoute(path, method, version)
  }

  /**
   * Get gateway statistics
   */
  async getStats(): Promise<{
    totalRequests: number
    cacheHitRate: number
    averageResponseTime: number
    errorRate: number
    topEndpoints: Array<{ path: string; requests: number }>
    activeConnections: number
  }> {
    return this.analytics.getGatewayStats()
  }

  /**
   * Health check for the gateway
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, { status: string; message?: string }>
  }> {
    const checks: Record<string, { status: string; message?: string }> = {}

    // Check cache
    try {
      await this.cacheManager.healthCheck()
      checks.cache = { status: 'healthy' }
    } catch (error) {
      checks.cache = { status: 'unhealthy', message: 'Cache not responding' }
    }

    // Check rate limiter
    try {
      await this.rateLimiter.getAnalytics({ from: new Date(Date.now() - 60000), to: new Date() })
      checks.rateLimiter = { status: 'healthy' }
    } catch (error) {
      checks.rateLimiter = { status: 'unhealthy', message: 'Rate limiter not responding' }
    }

    // Check load balancer
    if (this.config.enableLoadBalancing) {
      const backendHealth = await this.loadBalancer.getBackendHealth()
      const healthyBackends = Object.values(backendHealth).filter(h => h.status === 'healthy').length
      const totalBackends = Object.keys(backendHealth).length
      
      if (healthyBackends === 0) {
        checks.loadBalancer = { status: 'unhealthy', message: 'No healthy backends' }
      } else if (healthyBackends < totalBackends) {
        checks.loadBalancer = { status: 'degraded', message: `${healthyBackends}/${totalBackends} backends healthy` }
      } else {
        checks.loadBalancer = { status: 'healthy' }
      }
    }

    // Determine overall status
    const statusPriority = { healthy: 0, degraded: 1, unhealthy: 2 }
    const overallStatus = Object.values(checks)
      .map(check => check.status)
      .reduce((worst, current) => 
        statusPriority[current as keyof typeof statusPriority] > statusPriority[worst as keyof typeof statusPriority] 
          ? current : worst
      , 'healthy') as 'healthy' | 'degraded' | 'unhealthy'

    return { status: overallStatus, checks }
  }
}