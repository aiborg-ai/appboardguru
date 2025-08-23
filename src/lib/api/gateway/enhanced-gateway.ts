/**
 * Enhanced API Gateway - Best-in-Class Enterprise Architecture
 * Extends the existing gateway with advanced enterprise features:
 * - Circuit breaker pattern with fallback strategies
 * - Advanced metrics and observability
 * - Request/response transformation pipeline
 * - Multi-protocol support (REST/GraphQL/WebSocket)
 * - Enhanced security with rate limiting tiers
 * - Service mesh integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { APIGateway, GatewayConfig, RouteConfig, APIGatewayContext } from './index'
import { CircuitBreaker, CircuitBreakerConfig } from '../patterns/circuit-breaker'
import { RequestPipeline } from '../pipelines/request-pipeline'
import { ResponsePipeline } from '../pipelines/response-pipeline'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { SecurityEnforcer } from '../security/security-enforcer'
import { ProtocolAdapter } from '../adapters/protocol-adapter'
import { FallbackHandler } from '../fallback/fallback-handler'
import { Result, Ok, Err } from '../../result'

export interface EnhancedGatewayConfig extends GatewayConfig {
  // Circuit breaker configuration
  circuitBreaker: {
    enabled: boolean
    failureThreshold: number
    resetTimeout: number
    monitoringPeriod: number
    fallbackStrategy: 'static' | 'cached' | 'degraded' | 'circuit'
  }
  
  // Advanced observability
  observability: {
    enableMetrics: boolean
    enableTracing: boolean
    enableProfiling: boolean
    metricsInterval: number
    tracingSampleRate: number
    customMetrics: string[]
  }
  
  // Multi-protocol support
  protocols: {
    rest: boolean
    graphql: boolean
    websocket: boolean
    grpc: boolean
  }
  
  // Enhanced security
  security: {
    enableTLS: boolean
    enableMTLS: boolean
    corsPolicy: {
      origins: string[]
      methods: string[]
      headers: string[]
      credentials: boolean
    }
    rateLimitTiers: Record<string, {
      requests: number
      windowMs: number
      burstLimit: number
    }>
    ipWhitelist: string[]
    ipBlacklist: string[]
    enableDDoSProtection: boolean
  }
  
  // Service mesh integration
  serviceMesh: {
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
  }
  
  // Performance optimization
  performance: {
    enableRequestBatching: boolean
    enableResponseStreaming: boolean
    enableCompression: boolean
    compressionLevel: number
    connectionPoolSize: number
    keepAliveTimeout: number
  }
}

export interface EnhancedRouteConfig extends RouteConfig {
  // Circuit breaker per route
  circuitBreaker?: Partial<CircuitBreakerConfig>
  
  // Protocol-specific settings
  protocol: 'http' | 'websocket' | 'grpc'
  
  // Enhanced caching
  caching: {
    strategy: 'memory' | 'redis' | 'cdn' | 'hybrid'
    ttl: number
    tags: string[]
    invalidationPolicy: 'manual' | 'time' | 'event'
  }
  
  // Request/response transformation
  transformations: {
    request?: {
      headers?: Record<string, string>
      body?: 'passthrough' | 'transform' | 'validate'
      queryParams?: Record<string, string>
    }
    response?: {
      headers?: Record<string, string>
      body?: 'passthrough' | 'transform' | 'filter'
      statusCode?: 'passthrough' | 'normalize'
    }
  }
  
  // Security per route
  security: {
    authRequired: boolean
    authMethods: ('apikey' | 'jwt' | 'oauth' | 'mtls')[]
    scopes: string[]
    rateLimitTier: string
    ipRestrictions?: {
      whitelist?: string[]
      blacklist?: string[]
    }
  }
  
  // Fallback configuration
  fallback: {
    enabled: boolean
    strategy: 'static' | 'cached' | 'alternate'
    staticResponse?: any
    alternateBackend?: string
    timeout: number
  }
  
  // Observability per route
  observability: {
    enableCustomMetrics: boolean
    enableRequestLogging: boolean
    enableResponseLogging: boolean
    sensitiveHeaders: string[]
    sensitiveBodyFields: string[]
  }
}

export class EnhancedAPIGateway extends APIGateway {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map()
  private requestPipeline: RequestPipeline
  private responsePipeline: ResponsePipeline
  private metricsCollector: MetricsCollector
  private distributedTracer: DistributedTracer
  private securityEnforcer: SecurityEnforcer
  private protocolAdapter: ProtocolAdapter
  private fallbackHandler: FallbackHandler
  private enhancedConfig: EnhancedGatewayConfig

  constructor(config: Partial<EnhancedGatewayConfig> = {}) {
    // Initialize base gateway with enhanced defaults
    const baseConfig: Partial<GatewayConfig> = {
      enableCaching: true,
      enableVersioning: true,
      enableAnalytics: true,
      enableRateLimit: true,
      enableAPIKeys: true,
      defaultVersion: 'v1',
      supportedVersions: ['v1', 'v2', 'v3'],
      cacheConfig: {
        defaultTTL: 300,
        maxSize: 10000,
        enableCompression: true
      },
      loadBalancerConfig: {
        strategy: 'health_based',
        healthCheckInterval: 15000,
        maxFailures: 2
      },
      ...config
    }

    super(baseConfig)

    // Enhanced configuration
    this.enhancedConfig = {
      ...baseConfig as GatewayConfig,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 30000,
        monitoringPeriod: 10000,
        fallbackStrategy: 'cached',
        ...config.circuitBreaker
      },
      observability: {
        enableMetrics: true,
        enableTracing: true,
        enableProfiling: process.env.NODE_ENV === 'development',
        metricsInterval: 10000,
        tracingSampleRate: 0.1,
        customMetrics: ['request_duration', 'error_rate', 'cache_hit_ratio'],
        ...config.observability
      },
      protocols: {
        rest: true,
        graphql: true,
        websocket: true,
        grpc: false,
        ...config.protocols
      },
      security: {
        enableTLS: true,
        enableMTLS: false,
        corsPolicy: {
          origins: process.env.NODE_ENV === 'development' ? ['*'] : ['https://app.boardguru.ai'],
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          headers: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
          credentials: true
        },
        rateLimitTiers: {
          free: { requests: 100, windowMs: 3600000, burstLimit: 10 },
          pro: { requests: 1000, windowMs: 3600000, burstLimit: 50 },
          enterprise: { requests: 10000, windowMs: 3600000, burstLimit: 200 }
        },
        ipWhitelist: [],
        ipBlacklist: [],
        enableDDoSProtection: true,
        ...config.security
      },
      serviceMesh: {
        enabled: false,
        meshType: 'custom',
        enableServiceDiscovery: true,
        enableAutoRetry: true,
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential',
          initialDelay: 100,
          maxDelay: 5000
        },
        ...config.serviceMesh
      },
      performance: {
        enableRequestBatching: false,
        enableResponseStreaming: true,
        enableCompression: true,
        compressionLevel: 6,
        connectionPoolSize: 100,
        keepAliveTimeout: 30000,
        ...config.performance
      }
    }

    this.initializeEnhancedComponents()
  }

  private initializeEnhancedComponents(): void {
    // Initialize advanced components
    this.requestPipeline = new RequestPipeline()
    this.responsePipeline = new ResponsePipeline()
    this.metricsCollector = new MetricsCollector(this.enhancedConfig.observability)
    this.distributedTracer = new DistributedTracer(this.enhancedConfig.observability)
    this.securityEnforcer = new SecurityEnforcer(this.enhancedConfig.security)
    this.protocolAdapter = new ProtocolAdapter(this.enhancedConfig.protocols)
    this.fallbackHandler = new FallbackHandler()

    // Initialize metrics collection
    if (this.enhancedConfig.observability.enableMetrics) {
      this.startMetricsCollection()
    }

    // Setup request/response pipelines
    this.setupPipelines()
  }

  /**
   * Enhanced request handler with advanced features
   */
  async handleEnhancedRequest(request: NextRequest): Promise<NextResponse> {
    const traceId = this.distributedTracer.startTrace('gateway.request')
    const startTime = performance.now()
    
    try {
      // Security enforcement (DDoS protection, IP filtering)
      const securityCheck = await this.securityEnforcer.enforceRequest(request)
      if (!securityCheck.allowed) {
        return this.createSecurityErrorResponse(securityCheck.reason, 403, traceId)
      }

      // Protocol detection and adaptation
      const protocol = await this.protocolAdapter.detectProtocol(request)
      const adaptedRequest = await this.protocolAdapter.adaptRequest(request, protocol)

      // Enhanced request processing through pipeline
      const pipelineResult = await this.requestPipeline.process(adaptedRequest)
      if (!pipelineResult.success) {
        return this.createErrorResponse(pipelineResult.error!, 400, traceId)
      }

      // Route resolution with enhanced features
      const route = await this.resolveEnhancedRoute(adaptedRequest, protocol)
      if (!route) {
        return this.createErrorResponse('Enhanced route not found', 404, traceId)
      }

      // Circuit breaker check
      const circuitBreaker = this.getOrCreateCircuitBreaker(route)
      if (circuitBreaker.isOpen()) {
        const fallbackResponse = await this.fallbackHandler.handleFallback(adaptedRequest, route)
        if (fallbackResponse) {
          return fallbackResponse
        }
        return this.createErrorResponse('Service temporarily unavailable', 503, traceId)
      }

      let response: NextResponse
      
      try {
        // Execute through circuit breaker
        response = await circuitBreaker.execute(async () => {
          return await this.executeEnhancedRequest(adaptedRequest, route, traceId)
        })
        
        // Process response through pipeline
        const processedResponse = await this.responsePipeline.process(response, route)
        
        // Record metrics
        this.recordRequestMetrics(adaptedRequest, processedResponse, performance.now() - startTime, route)
        
        return processedResponse
        
      } catch (error) {
        // Handle circuit breaker failures
        console.error(`Circuit breaker execution failed:`, error)
        
        const fallbackResponse = await this.fallbackHandler.handleFallback(adaptedRequest, route)
        if (fallbackResponse) {
          return fallbackResponse
        }
        
        throw error
      }

    } catch (error) {
      console.error(`Enhanced gateway error:`, error)
      
      // Record error metrics
      this.recordErrorMetrics(request, error as Error, performance.now() - startTime)
      
      return this.createErrorResponse('Internal gateway error', 500, traceId)
      
    } finally {
      this.distributedTracer.endTrace(traceId)
    }
  }

  private async resolveEnhancedRoute(request: NextRequest, protocol: string): Promise<EnhancedRouteConfig | null> {
    // Enhanced route resolution with protocol awareness
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // Example enhanced routes (would be loaded from configuration)
    const enhancedRoutes: EnhancedRouteConfig[] = [
      {
        path: '/api/v1/assets',
        method: 'GET',
        backend: process.env.ASSETS_SERVICE_URL || 'http://localhost:3001',
        protocol: 'http',
        requiresAuth: true,
        caching: {
          strategy: 'redis',
          ttl: 300,
          tags: ['assets'],
          invalidationPolicy: 'event'
        },
        transformations: {
          response: {
            body: 'filter',
            headers: { 'X-Content-Source': 'gateway' }
          }
        },
        security: {
          authRequired: true,
          authMethods: ['jwt', 'apikey'],
          scopes: ['assets:read'],
          rateLimitTier: 'pro'
        },
        fallback: {
          enabled: true,
          strategy: 'cached',
          timeout: 5000
        },
        observability: {
          enableCustomMetrics: true,
          enableRequestLogging: false,
          enableResponseLogging: false,
          sensitiveHeaders: ['authorization'],
          sensitiveBodyFields: []
        }
      },
      {
        path: '/api/graphql',
        method: 'POST',
        backend: process.env.GRAPHQL_SERVICE_URL || 'http://localhost:3002',
        protocol: 'http',
        requiresAuth: true,
        caching: {
          strategy: 'memory',
          ttl: 60,
          tags: ['graphql'],
          invalidationPolicy: 'manual'
        },
        security: {
          authRequired: true,
          authMethods: ['jwt'],
          scopes: ['graphql:execute'],
          rateLimitTier: 'enterprise'
        },
        fallback: {
          enabled: true,
          strategy: 'static',
          staticResponse: { errors: [{ message: 'GraphQL service unavailable' }] },
          timeout: 10000
        },
        observability: {
          enableCustomMetrics: true,
          enableRequestLogging: true,
          enableResponseLogging: true,
          sensitiveHeaders: ['authorization'],
          sensitiveBodyFields: ['variables.password', 'variables.token']
        }
      }
    ]

    // Simple matching logic (in production, this would be more sophisticated)
    for (const route of enhancedRoutes) {
      if (route.method === method && this.pathMatches(path, route.path)) {
        return route
      }
    }

    return null
  }

  private pathMatches(requestPath: string, routePath: string): boolean {
    // Support for path parameters and wildcards
    const routeRegex = routePath
      .replace(/:\w+/g, '([^/]+)')  // :id -> ([^/]+)
      .replace(/\*/g, '.*')         // * -> .*
    
    return new RegExp(`^${routeRegex}$`).test(requestPath)
  }

  private getOrCreateCircuitBreaker(route: EnhancedRouteConfig): CircuitBreaker {
    const key = `${route.method}:${route.path}`
    
    if (!this.circuitBreakers.has(key)) {
      const config: CircuitBreakerConfig = {
        failureThreshold: route.circuitBreaker?.failureThreshold ?? this.enhancedConfig.circuitBreaker.failureThreshold,
        resetTimeout: route.circuitBreaker?.resetTimeout ?? this.enhancedConfig.circuitBreaker.resetTimeout,
        monitoringPeriod: route.circuitBreaker?.monitoringPeriod ?? this.enhancedConfig.circuitBreaker.monitoringPeriod
      }
      
      this.circuitBreakers.set(key, new CircuitBreaker(config))
    }
    
    return this.circuitBreakers.get(key)!
  }

  private async executeEnhancedRequest(
    request: NextRequest,
    route: EnhancedRouteConfig,
    traceId: string
  ): Promise<NextResponse> {
    // Enhanced request execution with retry logic, timeout, and monitoring
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), route.fallback.timeout)

    try {
      // Apply request transformations
      const transformedRequest = await this.applyRequestTransformations(request, route)
      
      // Add tracing headers
      const headers = new Headers(transformedRequest.headers)
      headers.set('X-Trace-ID', traceId)
      headers.set('X-Gateway-Version', 'enhanced-v1')
      
      const backendRequest = new Request(this.buildBackendUrl(transformedRequest, route.backend), {
        method: transformedRequest.method,
        headers,
        body: transformedRequest.method !== 'GET' ? transformedRequest.body : undefined,
        signal: controller.signal
      })

      // Execute request with retry logic if enabled
      let response: Response
      if (this.enhancedConfig.serviceMesh.enableAutoRetry) {
        response = await this.executeWithRetry(backendRequest, route)
      } else {
        response = await fetch(backendRequest)
      }

      clearTimeout(timeoutId)

      // Apply response transformations
      const transformedResponse = await this.applyResponseTransformations(response, route)
      
      return transformedResponse

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${route.fallback.timeout}ms`)
      }
      
      throw error
    }
  }

  private async executeWithRetry(request: Request, route: EnhancedRouteConfig): Promise<Response> {
    const retryPolicy = this.enhancedConfig.serviceMesh.retryPolicy
    let lastError: Error | null = null
    let delay = retryPolicy.initialDelay

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        const clonedRequest = request.clone()
        const response = await fetch(clonedRequest)
        
        // Only retry on 5xx errors or network failures
        if (response.status < 500) {
          return response
        }
        
        if (attempt === retryPolicy.maxRetries) {
          return response // Return last response even if it's an error
        }
        
      } catch (error) {
        lastError = error as Error
        
        if (attempt === retryPolicy.maxRetries) {
          throw lastError
        }
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Calculate next delay based on strategy
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
    }

    throw lastError || new Error('Max retries exceeded')
  }

  private async applyRequestTransformations(
    request: NextRequest,
    route: EnhancedRouteConfig
  ): Promise<NextRequest> {
    if (!route.transformations?.request) {
      return request
    }

    const transformations = route.transformations.request
    const headers = new Headers(request.headers)

    // Apply header transformations
    if (transformations.headers) {
      for (const [key, value] of Object.entries(transformations.headers)) {
        headers.set(key, value)
      }
    }

    // Apply query parameter transformations
    const url = new URL(request.url)
    if (transformations.queryParams) {
      for (const [key, value] of Object.entries(transformations.queryParams)) {
        url.searchParams.set(key, value)
      }
    }

    return new NextRequest(url.toString(), {
      method: request.method,
      headers,
      body: request.body
    })
  }

  private async applyResponseTransformations(
    response: Response,
    route: EnhancedRouteConfig
  ): Promise<NextResponse> {
    if (!route.transformations?.response) {
      const body = await response.arrayBuffer()
      return new NextResponse(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    }

    const transformations = route.transformations.response
    const headers = new Headers(response.headers)

    // Apply header transformations
    if (transformations.headers) {
      for (const [key, value] of Object.entries(transformations.headers)) {
        headers.set(key, value)
      }
    }

    let body: any
    let status = response.status

    // Handle response body transformations
    if (transformations.body === 'transform' || transformations.body === 'filter') {
      try {
        const responseData = await response.json()
        
        if (transformations.body === 'filter') {
          // Filter out sensitive fields based on route configuration
          body = this.filterSensitiveData(responseData, route)
        } else {
          // Apply custom transformations (would be configurable)
          body = responseData
        }
        
        body = JSON.stringify(body)
        headers.set('Content-Type', 'application/json')
        
      } catch (error) {
        // If not JSON, pass through as-is
        body = await response.arrayBuffer()
      }
    } else {
      body = await response.arrayBuffer()
    }

    // Handle status code transformations
    if (transformations.statusCode === 'normalize') {
      // Normalize certain error codes (example: 404 -> 200 with empty result)
      if (status === 404) {
        status = 200
        body = JSON.stringify({ data: null, message: 'Resource not found' })
        headers.set('Content-Type', 'application/json')
      }
    }

    return new NextResponse(body, {
      status,
      statusText: response.statusText,
      headers
    })
  }

  private filterSensitiveData(data: any, route: EnhancedRouteConfig): any {
    // Filter sensitive data based on route configuration
    const sensitiveFields = route.observability.sensitiveBodyFields
    
    if (!sensitiveFields.length || typeof data !== 'object' || data === null) {
      return data
    }

    const filtered = JSON.parse(JSON.stringify(data))
    
    sensitiveFields.forEach(field => {
      const keys = field.split('.')
      let current = filtered
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (current && typeof current === 'object' && keys[i] in current) {
          current = current[keys[i]]
        } else {
          return // Field doesn't exist
        }
      }
      
      if (current && typeof current === 'object' && keys[keys.length - 1] in current) {
        current[keys[keys.length - 1]] = '[FILTERED]'
      }
    })

    return filtered
  }

  private buildBackendUrl(request: NextRequest, backend: string): string {
    const url = new URL(request.url)
    
    // Remove version from path if it was in the URL
    let pathname = url.pathname
    const versionPattern = /\/api\/v\d+\//
    if (versionPattern.test(pathname)) {
      pathname = pathname.replace(versionPattern, '/api/')
    }

    return `${backend}${pathname}${url.search}`
  }

  private recordRequestMetrics(
    request: NextRequest,
    response: NextResponse,
    duration: number,
    route: EnhancedRouteConfig
  ): void {
    if (!this.enhancedConfig.observability.enableMetrics) return

    this.metricsCollector.recordRequest({
      method: request.method,
      path: route.path,
      status: response.status,
      duration,
      protocol: route.protocol,
      cacheHit: response.headers.get('X-Cache') === 'HIT'
    })
  }

  private recordErrorMetrics(request: NextRequest, error: Error, duration: number): void {
    if (!this.enhancedConfig.observability.enableMetrics) return

    this.metricsCollector.recordError({
      method: request.method,
      path: new URL(request.url).pathname,
      error: error.message,
      duration
    })
  }

  private createSecurityErrorResponse(reason: string, status: number, traceId: string): NextResponse {
    return NextResponse.json({
      success: false,
      error: 'Security policy violation',
      reason,
      traceId,
      timestamp: new Date().toISOString()
    }, { status })
  }

  private createErrorResponse(message: string, status: number, traceId: string): NextResponse {
    return NextResponse.json({
      success: false,
      error: message,
      traceId,
      timestamp: new Date().toISOString()
    }, { status })
  }

  private setupPipelines(): void {
    // Configure request pipeline
    this.requestPipeline
      .addValidator('content-type', (req) => this.validateContentType(req))
      .addTransformer('normalize-headers', (req) => this.normalizeHeaders(req))
      .addEnricher('add-metadata', (req) => this.addRequestMetadata(req))

    // Configure response pipeline
    this.responsePipeline
      .addTransformer('compress', (res) => this.compressResponse(res))
      .addEnricher('add-headers', (res) => this.addResponseHeaders(res))
      .addValidator('sanitize', (res) => this.sanitizeResponse(res))
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.metricsCollector.collectSystemMetrics()
    }, this.enhancedConfig.observability.metricsInterval)
  }

  // Placeholder methods for pipeline operations (to be implemented)
  private async validateContentType(req: NextRequest): Promise<Result<NextRequest, Error>> {
    // Content type validation logic
    return Ok(req)
  }

  private async normalizeHeaders(req: NextRequest): Promise<Result<NextRequest, Error>> {
    // Header normalization logic
    return Ok(req)
  }

  private async addRequestMetadata(req: NextRequest): Promise<Result<NextRequest, Error>> {
    // Add metadata to request
    return Ok(req)
  }

  private async compressResponse(res: NextResponse): Promise<Result<NextResponse, Error>> {
    // Response compression logic
    return Ok(res)
  }

  private async addResponseHeaders(res: NextResponse): Promise<Result<NextResponse, Error>> {
    // Add standard response headers
    return Ok(res)
  }

  private async sanitizeResponse(res: NextResponse): Promise<Result<NextResponse, Error>> {
    // Response sanitization logic
    return Ok(res)
  }

  /**
   * Get enhanced gateway statistics
   */
  async getEnhancedStats(): Promise<{
    requests: {
      total: number
      successful: number
      failed: number
      averageResponseTime: number
    }
    circuitBreakers: Record<string, {
      state: 'closed' | 'open' | 'half-open'
      failures: number
      successRate: number
    }>
    protocols: Record<string, number>
    security: {
      blockedRequests: number
      rateLimitHits: number
      authFailures: number
    }
    performance: {
      p50ResponseTime: number
      p95ResponseTime: number
      p99ResponseTime: number
      cacheHitRate: number
    }
  }> {
    return this.metricsCollector.getEnhancedStats()
  }
}