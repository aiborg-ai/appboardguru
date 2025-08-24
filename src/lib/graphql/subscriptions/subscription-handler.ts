/**
 * GraphQL Subscription Handler - Integration with Next.js API
 * Handles GraphQL subscription setup and integration with existing services
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { Server as HTTPServer } from 'http'
import { GraphQLWebSocketServer } from './websocket-server'
import { ServiceFactory } from '../../services'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../../types/database'

export interface SubscriptionHandlerOptions {
  httpServer: HTTPServer
  supabaseUrl: string
  supabaseServiceKey: string
  enableMetrics?: boolean
  enableTracing?: boolean
  rateLimitConfig?: {
    windowMs: number
    max: number
  }
}

export class GraphQLSubscriptionHandler {
  private wsServer: GraphQLWebSocketServer
  private services: ServiceFactory
  private eventPublisher: SubscriptionEventPublisher

  constructor(options: SubscriptionHandlerOptions) {
    // Initialize Supabase client for server-side operations
    const supabase = createClient<Database>(
      options.supabaseUrl,
      options.supabaseServiceKey
    )

    this.services = new ServiceFactory(supabase)
    
    // Initialize WebSocket server
    this.wsServer = new GraphQLWebSocketServer(options.httpServer, {
      path: '/graphql-subscriptions',
      maxConnections: 1000,
      heartbeatInterval: 30000,
      connectionTimeout: 30000,
      rateLimitConfig: options.rateLimitConfig
    })

    // Initialize event publisher
    this.eventPublisher = new SubscriptionEventPublisher(this.wsServer)
    
    this.setupServiceEventListeners()
    this.setupSystemEventListeners()
  }

  /**
   * Setup listeners for service events to publish to subscribers
   */
  private setupServiceEventListeners(): void {
    const eventBus = this.services.eventBus

    // Asset events
    eventBus.on('asset.created', (asset) => {
      this.eventPublisher.publishAssetChange('ASSETS_CHANGED', [asset])
      this.eventPublisher.publishAssetUpdate(`ASSET_UPDATED_${asset.id}`, asset)
    })

    eventBus.on('asset.updated', (asset) => {
      this.eventPublisher.publishAssetChange('ASSETS_CHANGED', [asset])
      this.eventPublisher.publishAssetUpdate(`ASSET_UPDATED_${asset.id}`, asset)
    })

    eventBus.on('asset.deleted', (assetId) => {
      this.eventPublisher.publishAssetChange('ASSETS_CHANGED', null)
      this.eventPublisher.publishAssetUpdate(`ASSET_UPDATED_${assetId}`, { 
        id: assetId, 
        status: 'deleted' 
      })
    })

    // Notification events
    eventBus.on('notification.created', (notification) => {
      this.eventPublisher.publishNotification(
        `NOTIFICATIONS_${notification.userId}`,
        notification
      )
    })

    // Document collaboration events
    eventBus.on('document.updated', (document) => {
      this.eventPublisher.publishDocumentUpdate(
        `DOCUMENT_UPDATED_${document.id}`,
        document
      )
    })

    eventBus.on('document.collaboration', (event) => {
      this.eventPublisher.publishCollaborationEvent(
        `DOCUMENT_COLLAB_${event.documentId}`,
        event
      )
    })

    // User presence events
    eventBus.on('user.presence.changed', (presence) => {
      this.eventPublisher.publishUserPresence(
        `PRESENCE_${presence.roomId}`,
        presence
      )
    })

    // Chat events
    eventBus.on('chat.message', (message) => {
      this.eventPublisher.publishChatMessage(
        `CHAT_${message.roomId}`,
        message
      )
    })

    // Audit events
    eventBus.on('audit.logged', (auditEvent) => {
      this.eventPublisher.publishAuditEvent('AUDIT_LOG', auditEvent)
    })
  }

  /**
   * Setup system-level event listeners
   */
  private setupSystemEventListeners(): void {
    // System status updates
    setInterval(async () => {
      const systemStatus = await this.getSystemStatus()
      this.eventPublisher.publishSystemStatus('SYSTEM_STATUS', systemStatus)
    }, 30000) // Every 30 seconds

    // Service health monitoring
    setInterval(async () => {
      const healthCheck = await this.services.healthCheck()
      if (this.hasUnhealthyServices(healthCheck)) {
        this.eventPublisher.publishSystemStatus('SYSTEM_STATUS', {
          status: 'degraded',
          services: Object.entries(healthCheck).map(([name, status]) => ({
            name,
            status: status.status,
            details: status.details
          })),
          timestamp: new Date().toISOString()
        })
      }
    }, 60000) // Every minute
  }

  /**
   * Get current system status
   */
  private async getSystemStatus(): Promise<any> {
    const healthCheck = await this.services.healthCheck()
    const wsStats = this.wsServer.getStats()
    
    return {
      status: this.hasUnhealthyServices(healthCheck) ? 'degraded' : 'healthy',
      services: Object.entries(healthCheck).map(([name, status]) => ({
        name,
        status: status.status,
        responseTime: status.details?.responseTime || 0
      })),
      websockets: {
        totalConnections: wsStats.totalConnections,
        authenticatedConnections: wsStats.authenticatedConnections,
        totalSubscriptions: wsStats.totalSubscriptions
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Check if any services are unhealthy
   */
  private hasUnhealthyServices(healthCheck: any): boolean {
    return Object.values(healthCheck).some((status: any) => status.status === 'unhealthy')
  }

  /**
   * Handle HTTP upgrade for WebSocket connections
   */
  handleUpgrade(request: any, socket: any, head: any): void {
    // This would be called by Next.js server to handle WebSocket upgrades
    console.log('WebSocket upgrade handled by subscription handler')
  }

  /**
   * Get subscription statistics
   */
  getStats(): any {
    return this.wsServer.getStats()
  }

  /**
   * Shutdown subscription handler
   */
  async shutdown(): Promise<void> {
    await this.wsServer.shutdown()
    await this.services.shutdown()
  }
}

/**
 * Event publisher for GraphQL subscriptions
 */
class SubscriptionEventPublisher {
  constructor(private wsServer: GraphQLWebSocketServer) {}

  async publishAssetChange(trigger: string, assets: any): Promise<void> {
    await this.wsServer.publish(trigger, { assetsChanged: assets })
  }

  async publishAssetUpdate(trigger: string, asset: any): Promise<void> {
    await this.wsServer.publish(trigger, { assetUpdated: asset })
  }

  async publishNotification(trigger: string, notification: any): Promise<void> {
    await this.wsServer.publish(trigger, { notifications: notification })
  }

  async publishDocumentUpdate(trigger: string, document: any): Promise<void> {
    await this.wsServer.publish(trigger, { documentUpdated: document })
  }

  async publishCollaborationEvent(trigger: string, event: any): Promise<void> {
    await this.wsServer.publish(trigger, { documentCollaboration: event })
  }

  async publishUserPresence(trigger: string, presence: any): Promise<void> {
    await this.wsServer.publish(trigger, { userPresence: presence })
  }

  async publishChatMessage(trigger: string, message: any): Promise<void> {
    await this.wsServer.publish(trigger, { chatMessage: message })
  }

  async publishSystemStatus(trigger: string, status: any): Promise<void> {
    await this.wsServer.publish(trigger, { systemStatus: status })
  }

  async publishAuditEvent(trigger: string, auditEvent: any): Promise<void> {
    await this.wsServer.publish(trigger, { auditLog: auditEvent })
  }
}

/**
 * Next.js API route handler for GraphQL subscriptions info
 */
export async function handleSubscriptionInfo(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: GraphQLSubscriptionHandler
): Promise<void> {
  if (req.method === 'GET') {
    try {
      const stats = handler.getStats()
      res.status(200).json({
        success: true,
        data: {
          websocketEndpoint: '/graphql-subscriptions',
          stats,
          supportedSubscriptions: [
            'assetUpdated',
            'assetsChanged',
            'notifications',
            'chatMessage',
            'userPresence',
            'documentUpdated',
            'documentCollaboration',
            'systemStatus',
            'auditLog'
          ]
        }
      })
    } catch (error) {
      console.error('Subscription info error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription info'
      })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}

/**
 * Utility function to trigger subscription events from API routes
 */
export class SubscriptionTrigger {
  private static instance: GraphQLSubscriptionHandler | null = null

  static setHandler(handler: GraphQLSubscriptionHandler): void {
    this.instance = handler
  }

  static async triggerAssetUpdate(asset: any): Promise<void> {
    if (this.instance) {
      await this.instance['eventPublisher'].publishAssetUpdate(`ASSET_UPDATED_${asset.id}`, asset)
      await this.instance['eventPublisher'].publishAssetChange('ASSETS_CHANGED', [asset])
    }
  }

  static async triggerNotification(userId: string, notification: any): Promise<void> {
    if (this.instance) {
      await this.instance['eventPublisher'].publishNotification(`NOTIFICATIONS_${userId}`, notification)
    }
  }

  static async triggerChatMessage(roomId: string, message: any): Promise<void> {
    if (this.instance) {
      await this.instance['eventPublisher'].publishChatMessage(`CHAT_${roomId}`, message)
    }
  }

  static async triggerDocumentUpdate(documentId: string, document: any): Promise<void> {
    if (this.instance) {
      await this.instance['eventPublisher'].publishDocumentUpdate(`DOCUMENT_UPDATED_${documentId}`, document)
    }
  }

  static async triggerAuditLog(auditEvent: any): Promise<void> {
    if (this.instance) {
      await this.instance['eventPublisher'].publishAuditEvent('AUDIT_LOG', auditEvent)
    }
  }
}

/**
 * Configuration helper for subscription setup
 */
export const createSubscriptionConfig = (httpServer: HTTPServer) => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required environment variables for subscriptions')
  }

  return {
    httpServer,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    enableMetrics: true,
    enableTracing: true,
    rateLimitConfig: {
      windowMs: 60000, // 1 minute
      max: 100 // 100 requests per minute per connection
    }
  }
}