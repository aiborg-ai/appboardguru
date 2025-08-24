/**
 * GraphQL WebSocket Server - Real-time Subscriptions
 * Implements GraphQL subscriptions over WebSocket with authentication and security
 */

import { WebSocketServer, WebSocket } from 'ws'
import { Server as HTTPServer } from 'http'
import { parse, validate, execute, subscribe } from 'graphql'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { PubSub } from 'graphql-subscriptions'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { EventEmitter } from 'events'
import { RateLimiter } from '../../api/security/rate-limiter'
import { JWTValidator } from '../../api/security/jwt-validator'
import { MetricsCollector } from '../../observability/metrics-collector'
import { DistributedTracer } from '../../observability/distributed-tracer'

export interface WebSocketConnection {
  id: string
  socket: WebSocket
  userId?: string
  subscriptions: Map<string, AsyncIterator<any>>
  metadata: {
    userAgent: string
    ip: string
    connectedAt: number
    lastActivity: number
  }
  rateLimiter: RateLimiter
}

export interface SubscriptionContext {
  connectionId: string
  userId?: string
  user?: any
  pubsub: PubSub
  connection: WebSocketConnection
}

export interface GraphQLSubscriptionMessage {
  id?: string
  type: 'connection_init' | 'start' | 'stop' | 'connection_terminate' | 'data' | 'error' | 'complete'
  payload?: any
}

export class GraphQLWebSocketServer {
  private wss: WebSocketServer
  private connections: Map<string, WebSocketConnection> = new Map()
  private pubsub: PubSub
  private schema: any
  private subscriptionServer?: SubscriptionServer
  private eventBus: EventEmitter
  private metrics: MetricsCollector
  private tracer: DistributedTracer
  private jwtValidator: JWTValidator

  constructor(
    server: HTTPServer,
    options: {
      path?: string
      maxConnections?: number
      heartbeatInterval?: number
      connectionTimeout?: number
      rateLimitConfig?: {
        windowMs: number
        max: number
      }
    } = {}
  ) {
    this.eventBus = new EventEmitter()
    this.pubsub = new PubSub()
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
    this.jwtValidator = new JWTValidator()

    // WebSocket Server setup
    this.wss = new WebSocketServer({
      server,
      path: options.path || '/graphql-ws',
      maxPayload: 1024 * 1024 // 1MB max message size
    })

    this.initializeSchema()
    this.setupWebSocketHandlers(options)
    this.startHeartbeat(options.heartbeatInterval || 30000)
    this.setupCleanupHandlers()
  }

  /**
   * Initialize GraphQL schema with subscription types
   */
  private initializeSchema(): void {
    const typeDefs = `
      type Query {
        ping: String
      }

      type Mutation {
        publishMessage(channel: String!, message: String!): Boolean
      }

      type Subscription {
        # Asset management subscriptions
        assetUpdated(assetId: ID): Asset
        assetsChanged: [Asset]
        
        # Notification subscriptions
        notifications(userId: ID!): Notification
        
        # Chat/Collaboration subscriptions
        chatMessage(roomId: ID!): ChatMessage
        userPresence(roomId: ID!): UserPresence
        
        # Document subscriptions
        documentUpdated(documentId: ID!): Document
        documentCollaboration(documentId: ID!): CollaborationEvent
        
        # System subscriptions
        systemStatus: SystemStatus
        auditLog: AuditEvent
      }

      type Asset {
        id: ID!
        name: String!
        type: String!
        updatedAt: String!
        status: String!
      }

      type Notification {
        id: ID!
        userId: ID!
        type: String!
        title: String!
        message: String!
        createdAt: String!
        read: Boolean!
      }

      type ChatMessage {
        id: ID!
        roomId: ID!
        userId: ID!
        username: String!
        message: String!
        timestamp: String!
      }

      type UserPresence {
        userId: ID!
        username: String!
        status: String!
        lastSeen: String!
      }

      type Document {
        id: ID!
        title: String!
        content: String!
        version: Int!
        updatedAt: String!
        updatedBy: ID!
      }

      type CollaborationEvent {
        type: String!
        userId: ID!
        documentId: ID!
        change: String!
        timestamp: String!
      }

      type SystemStatus {
        status: String!
        services: [ServiceStatus]
        timestamp: String!
      }

      type ServiceStatus {
        name: String!
        status: String!
        responseTime: Float
      }

      type AuditEvent {
        id: ID!
        userId: ID!
        action: String!
        resource: String!
        timestamp: String!
        details: String
      }
    `

    const resolvers = {
      Query: {
        ping: () => 'pong'
      },

      Mutation: {
        publishMessage: async (_: any, { channel, message }: any, context: SubscriptionContext) => {
          await this.pubsub.publish(channel, { message, userId: context.userId })
          return true
        }
      },

      Subscription: {
        assetUpdated: {
          subscribe: this.withAuth((_: any, { assetId }: any) => 
            this.pubsub.asyncIterator(assetId ? `ASSET_UPDATED_${assetId}` : 'ASSET_UPDATED')
          )
        },

        assetsChanged: {
          subscribe: this.withAuth(() => this.pubsub.asyncIterator('ASSETS_CHANGED'))
        },

        notifications: {
          subscribe: this.withAuth((_: any, { userId }: any, context: SubscriptionContext) => {
            if (context.userId !== userId) {
              throw new Error('Unauthorized: Can only subscribe to own notifications')
            }
            return this.pubsub.asyncIterator(`NOTIFICATIONS_${userId}`)
          })
        },

        chatMessage: {
          subscribe: this.withAuth((_: any, { roomId }: any) => 
            this.pubsub.asyncIterator(`CHAT_${roomId}`)
          )
        },

        userPresence: {
          subscribe: this.withAuth((_: any, { roomId }: any) => 
            this.pubsub.asyncIterator(`PRESENCE_${roomId}`)
          )
        },

        documentUpdated: {
          subscribe: this.withAuth((_: any, { documentId }: any) => 
            this.pubsub.asyncIterator(`DOCUMENT_UPDATED_${documentId}`)
          )
        },

        documentCollaboration: {
          subscribe: this.withAuth((_: any, { documentId }: any) => 
            this.pubsub.asyncIterator(`DOCUMENT_COLLAB_${documentId}`)
          )
        },

        systemStatus: {
          subscribe: this.withRoleAuth(['admin'])(() => 
            this.pubsub.asyncIterator('SYSTEM_STATUS')
          )
        },

        auditLog: {
          subscribe: this.withRoleAuth(['admin', 'auditor'])(() => 
            this.pubsub.asyncIterator('AUDIT_LOG')
          )
        }
      }
    }

    this.schema = makeExecutableSchema({ typeDefs, resolvers })
  }

  /**
   * Setup WebSocket connection handlers
   */
  private setupWebSocketHandlers(options: any): void {
    this.wss.on('connection', async (socket: WebSocket, request) => {
      const connectionId = this.generateConnectionId()
      const rateLimiter = new RateLimiter({
        windowMs: options.rateLimitConfig?.windowMs || 60000,
        max: options.rateLimitConfig?.max || 100
      })

      const connection: WebSocketConnection = {
        id: connectionId,
        socket,
        subscriptions: new Map(),
        metadata: {
          userAgent: request.headers['user-agent'] || '',
          ip: request.socket.remoteAddress || '',
          connectedAt: Date.now(),
          lastActivity: Date.now()
        },
        rateLimiter
      }

      this.connections.set(connectionId, connection)
      this.metrics.recordWebSocketConnection(connectionId, 'connected')

      // Handle connection initialization
      socket.on('message', async (data: Buffer) => {
        await this.handleMessage(connection, data)
      })

      // Handle connection close
      socket.on('close', () => {
        this.handleDisconnection(connectionId)
      })

      // Handle errors
      socket.on('error', (error) => {
        console.error(`WebSocket error for connection ${connectionId}:`, error)
        this.handleDisconnection(connectionId)
      })

      // Connection timeout
      setTimeout(() => {
        if (!connection.userId && socket.readyState === WebSocket.OPEN) {
          socket.close(1008, 'Connection timeout - authentication required')
        }
      }, options.connectionTimeout || 30000)
    })

    // Handle server events
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error)
    })
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(connection: WebSocketConnection, data: Buffer): Promise<void> {
    const span = this.tracer.startSpan('websocket_message_handler')
    
    try {
      // Rate limiting
      if (!(await connection.rateLimiter.checkLimit(connection.metadata.ip))) {
        this.sendMessage(connection, {
          type: 'error',
          payload: { message: 'Rate limit exceeded' }
        })
        return
      }

      connection.metadata.lastActivity = Date.now()
      
      let message: GraphQLSubscriptionMessage
      try {
        message = JSON.parse(data.toString())
      } catch (error) {
        this.sendMessage(connection, {
          type: 'error',
          payload: { message: 'Invalid JSON message' }
        })
        return
      }

      switch (message.type) {
        case 'connection_init':
          await this.handleConnectionInit(connection, message)
          break

        case 'start':
          await this.handleSubscriptionStart(connection, message)
          break

        case 'stop':
          await this.handleSubscriptionStop(connection, message)
          break

        case 'connection_terminate':
          connection.socket.close()
          break

        default:
          this.sendMessage(connection, {
            type: 'error',
            payload: { message: `Unknown message type: ${message.type}` }
          })
      }

      this.metrics.recordWebSocketMessage(connection.id, message.type)

    } catch (error) {
      span.recordError(error as Error)
      console.error('WebSocket message handling error:', error)
      
      this.sendMessage(connection, {
        type: 'error',
        payload: { 
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      })
    } finally {
      span.end()
    }
  }

  /**
   * Handle connection initialization with authentication
   */
  private async handleConnectionInit(
    connection: WebSocketConnection, 
    message: GraphQLSubscriptionMessage
  ): Promise<void> {
    try {
      const { authorization } = message.payload || {}
      
      if (authorization) {
        const token = authorization.replace('Bearer ', '')
        const payload = await this.jwtValidator.validateToken(token)
        
        if (payload) {
          connection.userId = payload.sub
          // In a real implementation, fetch user details from database
        }
      }

      this.sendMessage(connection, {
        type: 'connection_ack'
      })

      // Send keep-alive
      this.sendMessage(connection, {
        type: 'ka' // keep-alive
      })

    } catch (error) {
      this.sendMessage(connection, {
        type: 'connection_error',
        payload: { message: 'Authentication failed' }
      })
      
      setTimeout(() => {
        connection.socket.close(1008, 'Authentication failed')
      }, 1000)
    }
  }

  /**
   * Handle subscription start
   */
  private async handleSubscriptionStart(
    connection: WebSocketConnection,
    message: GraphQLSubscriptionMessage
  ): Promise<void> {
    const { id, payload } = message
    
    if (!id) {
      this.sendMessage(connection, {
        type: 'error',
        payload: { message: 'Subscription ID required' }
      })
      return
    }

    try {
      const { query, variables, operationName } = payload
      const document = parse(query)

      // Validate query
      const validationErrors = validate(this.schema, document)
      if (validationErrors.length > 0) {
        this.sendMessage(connection, {
          id,
          type: 'error',
          payload: { errors: validationErrors }
        })
        return
      }

      // Create subscription context
      const context: SubscriptionContext = {
        connectionId: connection.id,
        userId: connection.userId,
        pubsub: this.pubsub,
        connection
      }

      // Execute subscription
      const result = await subscribe({
        schema: this.schema,
        document,
        variableValues: variables,
        contextValue: context,
        operationName
      })

      if ('next' in result) {
        // Store subscription
        connection.subscriptions.set(id, result)

        // Handle subscription results
        this.handleSubscriptionResults(connection, id, result)
      } else {
        // Execution error
        this.sendMessage(connection, {
          id,
          type: 'error',
          payload: result
        })
      }

    } catch (error) {
      console.error('Subscription start error:', error)
      this.sendMessage(connection, {
        id,
        type: 'error',
        payload: { message: 'Subscription failed to start' }
      })
    }
  }

  /**
   * Handle subscription results
   */
  private async handleSubscriptionResults(
    connection: WebSocketConnection,
    subscriptionId: string,
    asyncIterator: AsyncIterator<any>
  ): Promise<void> {
    try {
      for await (const result of asyncIterator) {
        if (connection.socket.readyState !== WebSocket.OPEN) {
          break
        }

        this.sendMessage(connection, {
          id: subscriptionId,
          type: 'data',
          payload: result
        })
      }
    } catch (error) {
      console.error('Subscription result error:', error)
      this.sendMessage(connection, {
        id: subscriptionId,
        type: 'error',
        payload: { message: 'Subscription error' }
      })
    } finally {
      this.sendMessage(connection, {
        id: subscriptionId,
        type: 'complete'
      })
      connection.subscriptions.delete(subscriptionId)
    }
  }

  /**
   * Handle subscription stop
   */
  private async handleSubscriptionStop(
    connection: WebSocketConnection,
    message: GraphQLSubscriptionMessage
  ): Promise<void> {
    const { id } = message
    
    if (id && connection.subscriptions.has(id)) {
      const iterator = connection.subscriptions.get(id)
      if (iterator && 'return' in iterator) {
        await iterator.return()
      }
      connection.subscriptions.delete(id)
      
      this.sendMessage(connection, {
        id,
        type: 'complete'
      })
    }
  }

  /**
   * Handle connection disconnection
   */
  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    // Clean up all subscriptions
    connection.subscriptions.forEach(async (iterator) => {
      if ('return' in iterator) {
        await iterator.return()
      }
    })

    this.connections.delete(connectionId)
    this.metrics.recordWebSocketConnection(connectionId, 'disconnected')
    
    console.log(`WebSocket connection ${connectionId} disconnected`)
  }

  /**
   * Send message to connection
   */
  private sendMessage(connection: WebSocketConnection, message: GraphQLSubscriptionMessage): void {
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message))
    }
  }

  /**
   * Authentication middleware for subscriptions
   */
  private withAuth(subscriptionResolver: Function) {
    return (root: any, args: any, context: SubscriptionContext) => {
      if (!context.userId) {
        throw new Error('Authentication required')
      }
      return subscriptionResolver(root, args, context)
    }
  }

  /**
   * Role-based authentication middleware
   */
  private withRoleAuth(requiredRoles: string[]) {
    return (subscriptionResolver: Function) => {
      return (root: any, args: any, context: SubscriptionContext) => {
        if (!context.userId) {
          throw new Error('Authentication required')
        }
        
        // In a real implementation, check user roles from database or JWT
        // For now, assume admin role for demonstration
        const userRoles = ['user'] // Would come from context.user.roles
        
        const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role))
        if (!hasRequiredRole) {
          throw new Error('Insufficient permissions')
        }
        
        return subscriptionResolver(root, args, context)
      }
    }
  }

  /**
   * Publish event to subscribers
   */
  async publish(trigger: string, payload: any): Promise<void> {
    await this.pubsub.publish(trigger, payload)
    this.metrics.recordSubscriptionEvent(trigger, payload)
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(interval: number): void {
    setInterval(() => {
      this.connections.forEach((connection) => {
        if (connection.socket.readyState === WebSocket.OPEN) {
          this.sendMessage(connection, { type: 'ka' })
        }
      })
    }, interval)
  }

  /**
   * Setup cleanup handlers
   */
  private setupCleanupHandlers(): void {
    // Clean up stale connections
    setInterval(() => {
      const now = Date.now()
      const staleTimeout = 5 * 60 * 1000 // 5 minutes

      this.connections.forEach((connection, id) => {
        if (now - connection.metadata.lastActivity > staleTimeout) {
          console.log(`Cleaning up stale connection: ${id}`)
          connection.socket.close()
          this.handleDisconnection(id)
        }
      })
    }, 60000) // Check every minute
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number
    authenticatedConnections: number
    totalSubscriptions: number
    connectionsByUser: Record<string, number>
  } {
    let authenticatedCount = 0
    let totalSubscriptions = 0
    const connectionsByUser: Record<string, number> = {}

    this.connections.forEach((connection) => {
      if (connection.userId) {
        authenticatedCount++
        connectionsByUser[connection.userId] = (connectionsByUser[connection.userId] || 0) + 1
      }
      totalSubscriptions += connection.subscriptions.size
    })

    return {
      totalConnections: this.connections.size,
      authenticatedConnections: authenticatedCount,
      totalSubscriptions,
      connectionsByUser
    }
  }

  /**
   * Shutdown WebSocket server
   */
  async shutdown(): Promise<void> {
    // Close all connections
    this.connections.forEach((connection) => {
      connection.socket.close(1001, 'Server shutdown')
    })

    // Close WebSocket server
    this.wss.close()

    console.log('GraphQL WebSocket server shut down')
  }
}