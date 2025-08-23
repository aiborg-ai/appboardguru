/**
 * Protocol Adapter - Multi-Protocol Support and Request Adaptation
 * Handles HTTP, WebSocket, gRPC protocol detection and adaptation
 */

import { NextRequest } from 'next/server'

export interface ProtocolConfig {
  rest: boolean
  graphql: boolean
  websocket: boolean
  grpc: boolean
}

export interface AdaptedRequest extends NextRequest {
  adaptedProtocol?: string
  originalProtocol?: string
  adaptationMetadata?: Record<string, any>
}

export class ProtocolAdapter {
  private config: ProtocolConfig

  constructor(config: ProtocolConfig) {
    this.config = config
  }

  /**
   * Detect the protocol of incoming request
   */
  async detectProtocol(request: NextRequest): Promise<string> {
    const url = new URL(request.url)
    const path = url.pathname
    const contentType = request.headers.get('content-type') || ''
    const upgrade = request.headers.get('upgrade') || ''
    const connection = request.headers.get('connection') || ''

    // WebSocket detection
    if (upgrade.toLowerCase() === 'websocket' && connection.toLowerCase().includes('upgrade')) {
      return 'websocket'
    }

    // GraphQL detection
    if (path.includes('/graphql') || contentType.includes('application/graphql')) {
      return 'graphql'
    }

    // gRPC detection
    if (contentType.includes('application/grpc')) {
      return 'grpc'
    }

    // Default to HTTP/REST
    return 'http'
  }

  /**
   * Adapt request based on protocol
   */
  async adaptRequest(request: NextRequest, protocol: string): Promise<AdaptedRequest> {
    const adaptedRequest = request as AdaptedRequest
    adaptedRequest.originalProtocol = await this.detectProtocol(request)
    adaptedRequest.adaptedProtocol = protocol
    adaptedRequest.adaptationMetadata = {}

    switch (protocol) {
      case 'websocket':
        return this.adaptWebSocketRequest(adaptedRequest)
      case 'graphql':
        return this.adaptGraphQLRequest(adaptedRequest)
      case 'grpc':
        return this.adaptGRPCRequest(adaptedRequest)
      case 'http':
      default:
        return this.adaptHTTPRequest(adaptedRequest)
    }
  }

  /**
   * Check if protocol is supported
   */
  isProtocolSupported(protocol: string): boolean {
    switch (protocol) {
      case 'http':
        return this.config.rest
      case 'websocket':
        return this.config.websocket
      case 'graphql':
        return this.config.graphql
      case 'grpc':
        return this.config.grpc
      default:
        return false
    }
  }

  /**
   * Get supported protocols
   */
  getSupportedProtocols(): string[] {
    const protocols: string[] = []
    
    if (this.config.rest) protocols.push('http')
    if (this.config.websocket) protocols.push('websocket')
    if (this.config.graphql) protocols.push('graphql')
    if (this.config.grpc) protocols.push('grpc')
    
    return protocols
  }

  private async adaptHTTPRequest(request: AdaptedRequest): Promise<AdaptedRequest> {
    // HTTP requests typically don't need adaptation
    request.adaptationMetadata = {
      ...request.adaptationMetadata,
      method: request.method,
      contentType: request.headers.get('content-type'),
      acceptType: request.headers.get('accept')
    }
    
    return request
  }

  private async adaptWebSocketRequest(request: AdaptedRequest): Promise<AdaptedRequest> {
    // WebSocket adaptation - add WebSocket-specific metadata
    request.adaptationMetadata = {
      ...request.adaptationMetadata,
      webSocketKey: request.headers.get('sec-websocket-key'),
      webSocketVersion: request.headers.get('sec-websocket-version'),
      webSocketProtocol: request.headers.get('sec-websocket-protocol'),
      webSocketExtensions: request.headers.get('sec-websocket-extensions')
    }
    
    return request
  }

  private async adaptGraphQLRequest(request: AdaptedRequest): Promise<AdaptedRequest> {
    // GraphQL adaptation - parse and validate GraphQL query
    const contentType = request.headers.get('content-type') || ''
    
    if (request.method === 'POST' && contentType.includes('application/json')) {
      try {
        const body = await request.clone().json()
        request.adaptationMetadata = {
          ...request.adaptationMetadata,
          query: body.query,
          variables: body.variables,
          operationName: body.operationName,
          queryType: this.detectGraphQLOperation(body.query)
        }
      } catch (error) {
        request.adaptationMetadata = {
          ...request.adaptationMetadata,
          parseError: 'Invalid GraphQL JSON body'
        }
      }
    } else if (request.method === 'GET') {
      // GET GraphQL request
      const url = new URL(request.url)
      const query = url.searchParams.get('query')
      const variables = url.searchParams.get('variables')
      const operationName = url.searchParams.get('operationName')
      
      request.adaptationMetadata = {
        ...request.adaptationMetadata,
        query,
        variables: variables ? JSON.parse(variables) : undefined,
        operationName,
        queryType: query ? this.detectGraphQLOperation(query) : undefined
      }
    }
    
    return request
  }

  private async adaptGRPCRequest(request: AdaptedRequest): Promise<AdaptedRequest> {
    // gRPC adaptation - extract gRPC-specific headers and metadata
    request.adaptationMetadata = {
      ...request.adaptationMetadata,
      grpcTimeout: request.headers.get('grpc-timeout'),
      grpcEncoding: request.headers.get('grpc-encoding'),
      grpcAcceptEncoding: request.headers.get('grpc-accept-encoding'),
      grpcUserAgent: request.headers.get('grpc-user-agent'),
      grpcPreviousRpcAttempts: request.headers.get('grpc-previous-rpc-attempts')
    }
    
    // Extract gRPC service and method from path
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    if (pathParts.length >= 3) {
      request.adaptationMetadata = {
        ...request.adaptationMetadata,
        grpcService: pathParts[pathParts.length - 2],
        grpcMethod: pathParts[pathParts.length - 1]
      }
    }
    
    return request
  }

  private detectGraphQLOperation(query: string): 'query' | 'mutation' | 'subscription' | 'unknown' {
    if (!query) return 'unknown'
    
    const trimmedQuery = query.trim()
    
    if (trimmedQuery.startsWith('query') || (!trimmedQuery.startsWith('mutation') && !trimmedQuery.startsWith('subscription'))) {
      return 'query'
    }
    
    if (trimmedQuery.startsWith('mutation')) {
      return 'mutation'
    }
    
    if (trimmedQuery.startsWith('subscription')) {
      return 'subscription'
    }
    
    return 'unknown'
  }

  /**
   * Convert between protocols (if needed)
   */
  async convertProtocol(
    request: AdaptedRequest,
    fromProtocol: string,
    toProtocol: string
  ): Promise<AdaptedRequest> {
    if (fromProtocol === toProtocol) {
      return request
    }
    
    // Protocol conversion logic
    switch (`${fromProtocol}->${toProtocol}`) {
      case 'http->graphql':
        return this.convertHTTPToGraphQL(request)
      case 'graphql->http':
        return this.convertGraphQLToHTTP(request)
      default:
        // No conversion needed or supported
        return request
    }
  }

  private async convertHTTPToGraphQL(request: AdaptedRequest): Promise<AdaptedRequest> {
    // Convert REST API call to GraphQL query
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method
    
    let graphqlQuery = ''
    let variables = {}
    
    // Simple conversion examples (would be more sophisticated in practice)
    if (method === 'GET' && path.includes('/users/')) {
      const userId = path.split('/').pop()
      graphqlQuery = `query GetUser($id: ID!) { user(id: $id) { id name email } }`
      variables = { id: userId }
    } else if (method === 'GET' && path.includes('/users')) {
      graphqlQuery = `query GetUsers { users { id name email } }`
    }
    
    // Create new request with GraphQL format
    const graphqlBody = JSON.stringify({
      query: graphqlQuery,
      variables
    })
    
    const adaptedRequest = new NextRequest(request.url.replace(path, '/graphql'), {
      method: 'POST',
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'content-type': 'application/json'
      },
      body: graphqlBody
    }) as AdaptedRequest
    
    adaptedRequest.originalProtocol = request.originalProtocol
    adaptedRequest.adaptedProtocol = 'graphql'
    adaptedRequest.adaptationMetadata = {
      ...request.adaptationMetadata,
      converted: true,
      originalPath: path,
      originalMethod: method
    }
    
    return adaptedRequest
  }

  private async convertGraphQLToHTTP(request: AdaptedRequest): Promise<AdaptedRequest> {
    // Convert GraphQL query to REST API call
    try {
      const body = await request.clone().json()
      const query = body.query
      const variables = body.variables || {}
      
      let restPath = ''
      let restMethod = 'GET'
      let restBody = undefined
      
      // Simple conversion examples (would use proper GraphQL parsing in practice)
      if (query.includes('user(id:') || query.includes('GetUser')) {
        restPath = `/users/${variables.id}`
        restMethod = 'GET'
      } else if (query.includes('users') || query.includes('GetUsers')) {
        restPath = '/users'
        restMethod = 'GET'
      } else if (query.includes('createUser') || query.includes('CreateUser')) {
        restPath = '/users'
        restMethod = 'POST'
        restBody = JSON.stringify(variables.input)
      }
      
      const url = new URL(request.url)
      url.pathname = restPath
      
      const adaptedRequest = new NextRequest(url.toString(), {
        method: restMethod,
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'content-type': 'application/json'
        },
        body: restBody
      }) as AdaptedRequest
      
      adaptedRequest.originalProtocol = request.originalProtocol
      adaptedRequest.adaptedProtocol = 'http'
      adaptedRequest.adaptationMetadata = {
        ...request.adaptationMetadata,
        converted: true,
        originalQuery: query,
        originalVariables: variables
      }
      
      return adaptedRequest
      
    } catch (error) {
      // If conversion fails, return original request
      console.warn('Failed to convert GraphQL to HTTP:', error)
      return request
    }
  }

  /**
   * Get protocol adapter statistics
   */
  getStats(): {
    supportedProtocols: string[]
    adaptedRequests: {
      http: number
      websocket: number
      graphql: number
      grpc: number
    }
    conversions: {
      httpToGraphql: number
      graphqlToHttp: number
    }
  } {
    // In a real implementation, these would be tracked metrics
    return {
      supportedProtocols: this.getSupportedProtocols(),
      adaptedRequests: {
        http: 0, // Would be tracked
        websocket: 0,
        graphql: 0,
        grpc: 0
      },
      conversions: {
        httpToGraphql: 0, // Would be tracked
        graphqlToHttp: 0
      }
    }
  }
}