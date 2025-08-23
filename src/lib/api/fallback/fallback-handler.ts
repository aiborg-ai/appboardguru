/**
 * Fallback Handler - Circuit Breaker Fallback Strategies
 * Provides fallback responses when services are unavailable
 */

import { NextRequest, NextResponse } from 'next/server'
import { EnhancedRouteConfig } from '../gateway/enhanced-gateway'

export interface FallbackStrategy {
  type: 'static' | 'cached' | 'alternate' | 'degraded'
  config: any
}

export interface FallbackResponse {
  response: NextResponse
  strategy: string
  timestamp: number
}

export class FallbackHandler {
  private cachedResponses: Map<string, { response: any; timestamp: number; ttl: number }> = new Map()
  private fallbackMetrics: Map<string, { count: number; lastUsed: number }> = new Map()

  /**
   * Handle fallback when service is unavailable
   */
  async handleFallback(
    request: NextRequest,
    route: EnhancedRouteConfig
  ): Promise<NextResponse | null> {
    if (!route.fallback?.enabled) {
      return null
    }

    const fallbackConfig = route.fallback
    const cacheKey = this.generateCacheKey(request, route)

    // Record fallback usage
    this.recordFallbackUsage(route.path, fallbackConfig.strategy)

    switch (fallbackConfig.strategy) {
      case 'static':
        return this.handleStaticFallback(request, route, fallbackConfig.staticResponse)
      
      case 'cached':
        return this.handleCachedFallback(request, route, cacheKey)
      
      case 'alternate':
        return this.handleAlternateFallback(request, route, fallbackConfig.alternateBackend)
      
      default:
        return this.handleDefaultFallback(request, route)
    }
  }

  /**
   * Cache a successful response for future fallback use
   */
  cacheResponse(
    request: NextRequest,
    route: EnhancedRouteConfig,
    response: NextResponse,
    ttl: number = 300000 // 5 minutes default
  ): void {
    if (!route.fallback?.enabled || route.fallback.strategy !== 'cached') {
      return
    }

    const cacheKey = this.generateCacheKey(request, route)
    
    // Only cache successful responses
    if (response.status >= 200 && response.status < 400) {
      response.clone().json().then(data => {
        this.cachedResponses.set(cacheKey, {
          response: {
            data,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
          },
          timestamp: Date.now(),
          ttl
        })
      }).catch(() => {
        // If not JSON, cache as text
        response.clone().text().then(text => {
          this.cachedResponses.set(cacheKey, {
            response: {
              data: text,
              status: response.status,
              headers: Object.fromEntries(response.headers.entries())
            },
            timestamp: Date.now(),
            ttl
          })
        }).catch(() => {
          // Ignore cache errors
        })
      })
    }
  }

  /**
   * Get fallback statistics
   */
  getFallbackStats(): {
    totalFallbacks: number
    fallbacksByStrategy: Record<string, number>
    cacheSize: number
    cacheHitRate: number
  } {
    const fallbacksByStrategy: Record<string, number> = {}
    let totalFallbacks = 0

    this.fallbackMetrics.forEach((metrics, route) => {
      totalFallbacks += metrics.count
      const strategy = route.split(':')[1] || 'unknown'
      fallbacksByStrategy[strategy] = (fallbacksByStrategy[strategy] || 0) + metrics.count
    })

    return {
      totalFallbacks,
      fallbacksByStrategy,
      cacheSize: this.cachedResponses.size,
      cacheHitRate: 0 // Would be calculated from cache hits/misses
    }
  }

  /**
   * Clear expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now()
    
    for (const [key, cached] of this.cachedResponses.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cachedResponses.delete(key)
      }
    }
  }

  private async handleStaticFallback(
    request: NextRequest,
    route: EnhancedRouteConfig,
    staticResponse: any
  ): Promise<NextResponse> {
    const fallbackData = staticResponse || this.getDefaultStaticResponse(request, route)
    
    return NextResponse.json(fallbackData, {
      status: 200,
      headers: {
        'X-Fallback-Strategy': 'static',
        'X-Fallback-Route': route.path,
        'Cache-Control': 'no-cache'
      }
    })
  }

  private async handleCachedFallback(
    request: NextRequest,
    route: EnhancedRouteConfig,
    cacheKey: string
  ): Promise<NextResponse> {
    const cached = this.cachedResponses.get(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      const headers = new Headers(cached.response.headers)
      headers.set('X-Fallback-Strategy', 'cached')
      headers.set('X-Fallback-Route', route.path)
      headers.set('X-Cache-Age', Math.floor((Date.now() - cached.timestamp) / 1000).toString())
      
      return NextResponse.json(cached.response.data, {
        status: cached.response.status,
        headers
      })
    }
    
    // If no cache available, fall back to static response
    return this.handleStaticFallback(request, route, {
      success: false,
      error: 'Service temporarily unavailable',
      fallback: true,
      message: 'Cached response not available'
    })
  }

  private async handleAlternateFallback(
    request: NextRequest,
    route: EnhancedRouteConfig,
    alternateBackend?: string
  ): Promise<NextResponse> {
    if (!alternateBackend) {
      return this.handleStaticFallback(request, route, {
        success: false,
        error: 'No alternate backend configured',
        fallback: true
      })
    }

    try {
      // Construct alternate backend URL
      const url = new URL(request.url)
      const alternateUrl = `${alternateBackend}${url.pathname}${url.search}`
      
      const alternateRequest = new Request(alternateUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? request.body : undefined
      })

      // Set a shorter timeout for alternate backend
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), route.fallback.timeout / 2)

      const response = await fetch(alternateRequest, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const body = await response.arrayBuffer()
      const nextResponse = new NextResponse(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })

      nextResponse.headers.set('X-Fallback-Strategy', 'alternate')
      nextResponse.headers.set('X-Fallback-Route', route.path)
      nextResponse.headers.set('X-Fallback-Backend', alternateBackend)

      return nextResponse

    } catch (error) {
      console.warn('Alternate backend fallback failed:', error)
      
      // Fall back to static response
      return this.handleStaticFallback(request, route, {
        success: false,
        error: 'Service temporarily unavailable',
        fallback: true,
        message: 'Alternate backend also unavailable'
      })
    }
  }

  private async handleDefaultFallback(
    request: NextRequest,
    route: EnhancedRouteConfig
  ): Promise<NextResponse> {
    return NextResponse.json({
      success: false,
      error: 'Service temporarily unavailable',
      fallback: true,
      route: route.path,
      method: request.method,
      timestamp: new Date().toISOString(),
      message: 'Please try again later'
    }, {
      status: 503,
      headers: {
        'X-Fallback-Strategy': 'default',
        'X-Fallback-Route': route.path,
        'Retry-After': '30'
      }
    })
  }

  private getDefaultStaticResponse(request: NextRequest, route: EnhancedRouteConfig): any {
    const url = new URL(request.url)
    const path = url.pathname
    
    // Provide contextual fallback responses based on route
    if (path.includes('/api/assets')) {
      return {
        success: true,
        data: [],
        fallback: true,
        message: 'Asset service temporarily unavailable, showing cached results'
      }
    }
    
    if (path.includes('/api/notifications')) {
      return {
        success: true,
        data: [],
        fallback: true,
        message: 'Notification service temporarily unavailable'
      }
    }
    
    if (path.includes('/api/users')) {
      return {
        success: true,
        data: null,
        fallback: true,
        message: 'User service temporarily unavailable'
      }
    }
    
    if (path.includes('/graphql')) {
      return {
        data: null,
        errors: [{
          message: 'GraphQL service temporarily unavailable',
          extensions: {
            code: 'SERVICE_UNAVAILABLE',
            fallback: true
          }
        }],
        fallback: true
      }
    }
    
    // Generic fallback response
    return {
      success: false,
      error: 'Service temporarily unavailable',
      fallback: true,
      route: route.path,
      method: request.method,
      timestamp: new Date().toISOString()
    }
  }

  private generateCacheKey(request: NextRequest, route: EnhancedRouteConfig): string {
    const url = new URL(request.url)
    const cacheComponents = [
      route.path,
      request.method,
      url.search,
      // Include relevant headers that affect response
      request.headers.get('authorization') ? 'auth' : 'noauth',
      request.headers.get('accept') || 'default'
    ]
    
    return cacheComponents.join(':')
  }

  private recordFallbackUsage(routePath: string, strategy: string): void {
    const key = `${routePath}:${strategy}`
    const existing = this.fallbackMetrics.get(key) || { count: 0, lastUsed: 0 }
    
    this.fallbackMetrics.set(key, {
      count: existing.count + 1,
      lastUsed: Date.now()
    })
  }

  /**
   * Configure fallback for a specific route
   */
  configureFallback(
    routePath: string,
    fallbackConfig: {
      strategy: 'static' | 'cached' | 'alternate'
      staticResponse?: any
      alternateBackend?: string
      cacheTTL?: number
    }
  ): void {
    // In a real implementation, this would update route configuration
    console.log(`Configured fallback for ${routePath}:`, fallbackConfig)
  }

  /**
   * Test fallback strategies
   */
  async testFallback(
    request: NextRequest,
    route: EnhancedRouteConfig,
    strategy: 'static' | 'cached' | 'alternate'
  ): Promise<NextResponse> {
    const testRoute = {
      ...route,
      fallback: {
        enabled: true,
        strategy,
        staticResponse: { test: true, message: 'Fallback test response' },
        alternateBackend: 'http://localhost:3001',
        timeout: 5000
      }
    }
    
    return this.handleFallback(request, testRoute) || this.handleDefaultFallback(request, testRoute)
  }

  /**
   * Cleanup old metrics and cache
   */
  cleanup(): void {
    this.cleanupCache()
    
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    for (const [key, metrics] of this.fallbackMetrics.entries()) {
      if (now - metrics.lastUsed > maxAge) {
        this.fallbackMetrics.delete(key)
      }
    }
  }

  /**
   * Get cached response if available
   */
  getCachedResponse(request: NextRequest, route: EnhancedRouteConfig): any | null {
    const cacheKey = this.generateCacheKey(request, route)
    const cached = this.cachedResponses.get(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.response
    }
    
    return null
  }

  /**
   * Preload fallback responses
   */
  async preloadFallbacks(routes: EnhancedRouteConfig[]): Promise<void> {
    for (const route of routes) {
      if (route.fallback?.enabled && route.fallback.strategy === 'static') {
        // Pre-generate and cache static responses
        const staticResponse = route.fallback.staticResponse || this.getDefaultStaticResponse(
          new NextRequest('http://localhost' + route.path),
          route
        )
        
        const cacheKey = `${route.path}:static:preloaded`
        this.cachedResponses.set(cacheKey, {
          response: staticResponse,
          timestamp: Date.now(),
          ttl: 24 * 60 * 60 * 1000 // 24 hours
        })
      }
    }
    
    console.log(`Preloaded fallbacks for ${routes.length} routes`)
  }
}