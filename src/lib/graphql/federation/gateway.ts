/**
 * GraphQL Federation Gateway - Apollo Federation Implementation
 * Provides schema stitching, query planning, and distributed execution
 */

import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway'
import { ApolloServer } from '@apollo/server'
import { buildSubgraphSchema } from '@apollo/subgraph'
import { NextRequest, NextResponse } from 'next/server'
import { DistributedTracer } from '../../api/observability/distributed-tracer'
import { MetricsCollector } from '../../api/observability/metrics-collector'

export interface SubgraphService {
  name: string
  url: string
  schema?: string
  health: 'healthy' | 'unhealthy' | 'unknown'
  lastHealthCheck: number
  version: string
  capabilities: string[]
}

export interface GraphQLFederationConfig {
  services: SubgraphService[]
  enableIntrospection: boolean
  enablePlayground: boolean
  enableTracing: boolean
  enableMetrics: boolean
  queryComplexity: {
    maximumComplexity: number
    maximumDepth: number
    introspectionComplexity?: number
  }
  caching: {
    enabled: boolean
    ttl: number
    redis?: {
      host: string
      port: number
      password?: string
    }
  }
  security: {
    enableQueryValidation: boolean
    allowedOrigins: string[]
    requireAuthentication: boolean
    rateLimiting: {
      maxRequests: number
      windowMs: number
    }
  }
}

export interface QueryPlan {
  queryHash: string
  complexity: number
  depth: number
  executionNodes: QueryExecutionNode[]
  estimatedDuration: number
}

export interface QueryExecutionNode {
  service: string
  query: string
  variables: Record<string, any>
  dependencies: string[]
  parallel: boolean
}

export class GraphQLFederationGateway {
  private gateway: ApolloGateway
  private server: ApolloServer
  private config: GraphQLFederationConfig
  private tracer: DistributedTracer
  private metrics: MetricsCollector
  private queryCache: Map<string, { result: any; timestamp: number; ttl: number }> = new Map()
  private queryPlans: Map<string, QueryPlan> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor(
    config: GraphQLFederationConfig,
    tracer: DistributedTracer,
    metrics: MetricsCollector
  ) {
    this.config = config
    this.tracer = tracer
    this.metrics = metrics
    
    this.initializeGateway()
    this.startHealthChecking()
  }

  /**
   * Initialize Apollo Federation Gateway
   */
  private initializeGateway(): void {
    // Configure subgraph services
    const serviceList = this.config.services.map(service => ({
      name: service.name,
      url: service.url
    }))

    this.gateway = new ApolloGateway({
      serviceList: serviceList.length > 0 ? serviceList : undefined,
      
      // Use introspection for dynamic schema composition
      supergraphSdl: serviceList.length === 0 ? undefined : new IntrospectAndCompose({
        serviceList,
        introspectionHeaders: {
          'User-Agent': 'GraphQL-Federation-Gateway/1.0'
        }
      }),

      // Enable experimental features
      experimental_approximateQueryPlanStoreSizeInBytes: 10 * 1024 * 1024, // 10MB

      buildService({ url }) {
        return {
          process({ request, context }) {
            return this.executeSubgraphRequest(url, request, context)
          }
        }
      }
    })

    this.initializeApolloServer()
  }

  /**
   * Initialize Apollo Server with federation gateway
   */
  private async initializeApolloServer(): Promise<void> {
    const { schema, executor } = await this.gateway.load()

    this.server = new ApolloServer({
      schema,
      executor,
      
      introspection: this.config.enableIntrospection,
      
      // Custom formatError to sanitize errors
      formatError: (formattedError, error) => {
        // Log the error for monitoring
        if (this.config.enableMetrics) {
          this.metrics.recordError({
            method: 'GRAPHQL',
            path: '/graphql',
            error: formattedError.message,
            duration: 0 // Would be calculated from context
          })
        }

        // Don't expose internal errors in production
        if (process.env.NODE_ENV === 'production') {
          return {
            message: formattedError.message,
            locations: formattedError.locations,
            path: formattedError.path,
            extensions: {
              code: formattedError.extensions?.code,
              timestamp: new Date().toISOString()
            }
          }
        }

        return formattedError
      },

      // Custom plugins
      plugins: [
        // Query complexity plugin
        {
          requestDidStart() {
            return {
              didResolveOperation: async ({ request, operationName, document }) => {
                if (this.config.queryComplexity) {
                  await this.validateQueryComplexity(document)
                }
              },
              
              willSendResponse: async ({ response, request, operationName }) => {
                // Add federation headers
                if (response.http) {
                  response.http.headers.set('X-GraphQL-Federation', 'true')
                  response.http.headers.set('X-Gateway-Version', '1.0.0')
                }
              }
            }
          }
        }.bind(this),

        // Tracing plugin
        ...(this.config.enableTracing ? [{
          requestDidStart: () => ({
            didResolveOperation: async ({ operationName, document }) => {
              const traceId = this.tracer.startTrace(`graphql.${operationName || 'anonymous'}`)
              return { traceId }
            },
            willSendResponse: async ({ contextValue }) => {
              if (contextValue?.traceId) {
                this.tracer.endTrace(contextValue.traceId)
              }
            }
          })
        }] : []),

        // Metrics plugin
        ...(this.config.enableMetrics ? [{
          requestDidStart: () => {
            const startTime = Date.now()
            return {
              willSendResponse: async ({ operationName, response }) => {
                const duration = Date.now() - startTime
                this.metrics.recordRequest({
                  method: 'GRAPHQL',
                  path: `/graphql/${operationName || 'anonymous'}`,
                  status: response.errors ? 400 : 200,
                  duration,
                  protocol: 'graphql',
                  cacheHit: false
                })
              }
            }
          }
        }] : [])
      ]
    })
  }

  /**
   * Handle GraphQL requests
   */
  async handleGraphQLRequest(request: NextRequest): Promise<NextResponse> {
    try {
      // Extract GraphQL query
      const body = await request.json()
      const { query, variables, operationName } = body

      // Validate request
      if (!query) {
        return NextResponse.json({
          errors: [{ message: 'Query is required' }]
        }, { status: 400 })
      }

      // Check query cache
      if (this.config.caching.enabled) {
        const cacheKey = this.generateCacheKey(query, variables, operationName)
        const cached = this.queryCache.get(cacheKey)
        
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          return NextResponse.json(cached.result, {
            headers: {
              'X-Cache': 'HIT',
              'X-Cache-Age': Math.floor((Date.now() - cached.timestamp) / 1000).toString()
            }
          })
        }
      }

      // Start tracing
      const traceId = this.config.enableTracing 
        ? this.tracer.startTrace(`graphql.${operationName || 'anonymous'}`)
        : null

      try {
        // Execute GraphQL query through federation gateway
        const result = await this.server.executeOperation({
          query,
          variables,
          operationName
        }, {
          contextValue: {
            traceId,
            request,
            services: this.getHealthyServices()
          }
        })

        // Cache successful results
        if (this.config.caching.enabled && result.body.kind === 'single' && !result.body.singleResult.errors) {
          const cacheKey = this.generateCacheKey(query, variables, operationName)
          this.queryCache.set(cacheKey, {
            result: result.body.singleResult,
            timestamp: Date.now(),
            ttl: this.config.caching.ttl
          })
        }

        // End tracing
        if (traceId) {
          this.tracer.endTrace(traceId, result.body.kind === 'single' && result.body.singleResult.errors ? 'error' : 'ok')
        }

        // Return result
        if (result.body.kind === 'single') {
          return NextResponse.json(result.body.singleResult, {
            headers: {
              'X-Cache': 'MISS',
              'Content-Type': 'application/json'
            }
          })
        } else {
          // Handle incremental delivery (subscriptions/defer/stream)
          return new NextResponse('Incremental delivery not supported in this context', {
            status: 400
          })
        }

      } catch (error) {
        if (traceId) {
          this.tracer.endTrace(traceId, 'error')
        }
        throw error
      }

    } catch (error) {
      console.error('GraphQL Federation Gateway error:', error)
      
      return NextResponse.json({
        errors: [{
          message: 'Internal server error',
          extensions: {
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString()
          }
        }]
      }, { status: 500 })
    }
  }

  /**
   * Execute request to subgraph service
   */
  private async executeSubgraphRequest(
    serviceUrl: string,
    request: any,
    context: any
  ): Promise<any> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GraphQL-Federation-Gateway/1.0',
          ...(context.traceId && {
            'X-Trace-ID': context.traceId
          })
        },
        body: JSON.stringify(request.query ? {
          query: request.query,
          variables: request.variables
        } : request)
      })

      if (!response.ok) {
        throw new Error(`Subgraph request failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      // Record metrics
      if (this.config.enableMetrics) {
        this.metrics.recordRequest({
          method: 'GRAPHQL_SUBGRAPH',
          path: serviceUrl,
          status: response.status,
          duration: Date.now() - startTime,
          protocol: 'graphql',
          cacheHit: false
        })
      }

      return result

    } catch (error) {
      console.error(`Subgraph request failed for ${serviceUrl}:`, error)
      
      // Record error metrics
      if (this.config.enableMetrics) {
        this.metrics.recordError({
          method: 'GRAPHQL_SUBGRAPH',
          path: serviceUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        })
      }

      throw error
    }
  }

  /**
   * Validate query complexity and depth
   */
  private async validateQueryComplexity(document: any): Promise<void> {
    // Simplified complexity analysis - in production, use graphql-query-complexity
    const complexity = this.calculateQueryComplexity(document)
    const depth = this.calculateQueryDepth(document)

    if (complexity > this.config.queryComplexity.maximumComplexity) {
      throw new Error(`Query complexity ${complexity} exceeds maximum ${this.config.queryComplexity.maximumComplexity}`)
    }

    if (depth > this.config.queryComplexity.maximumDepth) {
      throw new Error(`Query depth ${depth} exceeds maximum ${this.config.queryComplexity.maximumDepth}`)
    }
  }

  /**
   * Calculate query complexity (simplified)
   */
  private calculateQueryComplexity(document: any): number {
    // Simplified complexity calculation
    // In production, use proper AST traversal
    const queryString = document.loc?.source?.body || ''
    const fieldCount = (queryString.match(/\w+\s*[\({]/g) || []).length
    const nestedDepth = this.calculateQueryDepth(document)
    
    return fieldCount * nestedDepth
  }

  /**
   * Calculate query depth (simplified)
   */
  private calculateQueryDepth(document: any): number {
    // Simplified depth calculation
    const queryString = document.loc?.source?.body || ''
    const openBraces = (queryString.match(/\{/g) || []).length
    const closeBraces = (queryString.match(/\}/g) || []).length
    
    return Math.min(openBraces, closeBraces)
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: string, variables: any, operationName?: string): string {
    const variablesKey = variables ? JSON.stringify(variables) : ''
    return `${operationName || 'anonymous'}:${Buffer.from(query + variablesKey).toString('base64').slice(0, 32)}`
  }

  /**
   * Get healthy services
   */
  private getHealthyServices(): SubgraphService[] {
    return this.config.services.filter(service => service.health === 'healthy')
  }

  /**
   * Start health checking for subgraph services
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks()
    }, 30000) // Every 30 seconds
  }

  /**
   * Perform health checks on all subgraph services
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = this.config.services.map(async (service) => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(service.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'GraphQL-Federation-Gateway/1.0'
          },
          body: JSON.stringify({
            query: 'query { __typename }'
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        service.health = response.ok ? 'healthy' : 'unhealthy'
        service.lastHealthCheck = Date.now()

        if (!response.ok) {
          console.warn(`Subgraph ${service.name} health check failed: ${response.status}`)
        }

      } catch (error) {
        service.health = 'unhealthy'
        service.lastHealthCheck = Date.now()
        console.warn(`Subgraph ${service.name} health check failed:`, error)
      }
    })

    await Promise.all(healthCheckPromises)
  }

  /**
   * Add new subgraph service
   */
  async addSubgraphService(service: SubgraphService): Promise<void> {
    // Add to services list
    this.config.services.push(service)

    // Perform initial health check
    await this.performHealthChecks()

    // Reload gateway with new service
    await this.reloadGateway()

    console.log(`Added subgraph service: ${service.name}`)
  }

  /**
   * Remove subgraph service
   */
  async removeSubgraphService(serviceName: string): Promise<void> {
    const index = this.config.services.findIndex(s => s.name === serviceName)
    if (index > -1) {
      this.config.services.splice(index, 1)
      
      // Reload gateway without the service
      await this.reloadGateway()
      
      console.log(`Removed subgraph service: ${serviceName}`)
    }
  }

  /**
   * Reload federation gateway
   */
  private async reloadGateway(): Promise<void> {
    try {
      // Stop current gateway
      await this.gateway.stop()
      
      // Reinitialize with new configuration
      this.initializeGateway()
      
      console.log('GraphQL Federation Gateway reloaded')
    } catch (error) {
      console.error('Failed to reload GraphQL Federation Gateway:', error)
    }
  }

  /**
   * Get gateway statistics
   */
  getGatewayStats(): {
    services: Array<{
      name: string
      health: string
      lastHealthCheck: Date
      responseTime?: number
    }>
    queryCache: {
      size: number
      hitRate: number
    }
    totalQueries: number
    averageComplexity: number
    errorRate: number
  } {
    const totalQueries = Array.from(this.queryPlans.values()).length
    const averageComplexity = totalQueries > 0 
      ? Array.from(this.queryPlans.values()).reduce((sum, plan) => sum + plan.complexity, 0) / totalQueries 
      : 0

    return {
      services: this.config.services.map(service => ({
        name: service.name,
        health: service.health,
        lastHealthCheck: new Date(service.lastHealthCheck),
        responseTime: 0 // Would be tracked from metrics
      })),
      queryCache: {
        size: this.queryCache.size,
        hitRate: 0 // Would be calculated from cache hits/misses
      },
      totalQueries,
      averageComplexity,
      errorRate: 0 // Would be calculated from error metrics
    }
  }

  /**
   * Clear query cache
   */
  clearQueryCache(): void {
    this.queryCache.clear()
    console.log('GraphQL query cache cleared')
  }

  /**
   * Get schema SDL for all services
   */
  async getComposedSchema(): Promise<string> {
    try {
      const { schema } = await this.gateway.load()
      // In a real implementation, you'd convert the schema back to SDL
      return 'type Query { hello: String }' // Placeholder
    } catch (error) {
      console.error('Failed to get composed schema:', error)
      return ''
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    if (this.server) {
      await this.server.stop()
    }

    if (this.gateway) {
      await this.gateway.stop()
    }

    this.queryCache.clear()
    
    console.log('GraphQL Federation Gateway destroyed')
  }
}