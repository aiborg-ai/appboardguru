/**
 * Organization WebSocket Channel Management
 * Handles real-time organization data updates and subscriptions
 */

import type {
  WebSocketMessage,
  RoomId,
  UserPresence,
  SocketId
} from '../../types/websocket'
import type { UserId, OrganizationId } from '../../types/database'
import { createRoomId } from '../../types/websocket'
import { nanoid } from 'nanoid'

export type OrganizationEventType = 
  | 'organization_created'
  | 'organization_updated'
  | 'organization_deleted'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'activity_updated'
  | 'status_changed'
  | 'data_refresh'
  | 'presence_updated'

export interface OrganizationEvent {
  id: string
  type: OrganizationEventType
  organizationId: OrganizationId
  userId?: UserId
  timestamp: string
  data: any
  metadata?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    persistent?: boolean
    source?: 'user' | 'system' | 'api'
    version?: number
  }
}

export interface OrganizationSubscription {
  id: string
  userId: UserId
  organizationIds: OrganizationId[]
  eventTypes: OrganizationEventType[]
  roomId: RoomId
  isActive: boolean
  lastActivity: string
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  retryCount: number
  autoRefreshInterval?: number
}

export interface ConnectionMetrics {
  connectTime: number
  lastMessageTime: number
  messagesReceived: number
  messagesSent: number
  reconnectAttempts: number
  averageLatency: number
}

export interface OrganizationChannelConfig {
  autoReconnect: boolean
  maxReconnectAttempts: number
  reconnectDelay: number
  heartbeatInterval: number
  autoRefreshEnabled: boolean
  defaultRefreshInterval: number
  backgroundRefreshEnabled: boolean
  backgroundRefreshInterval: number
  queueOfflineMessages: boolean
  maxOfflineQueue: number
  enablePresence: boolean
  compressionEnabled: boolean
}

const defaultConfig: OrganizationChannelConfig = {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
  autoRefreshEnabled: true,
  defaultRefreshInterval: 30000, // 30 seconds
  backgroundRefreshEnabled: true,
  backgroundRefreshInterval: 300000, // 5 minutes when tab is hidden
  queueOfflineMessages: true,
  maxOfflineQueue: 100,
  enablePresence: true,
  compressionEnabled: true
}

export class OrganizationChannel {
  private subscription: OrganizationSubscription | null = null
  private eventHandlers = new Map<OrganizationEventType, Set<(event: OrganizationEvent) => void>>()
  private connectionHandlers = new Set<(connected: boolean, status: string) => void>()
  private errorHandlers = new Set<(error: string, context?: any) => void>()
  private presenceHandlers = new Set<(presence: UserPresence[]) => void>()
  
  private metrics: ConnectionMetrics = {
    connectTime: 0,
    lastMessageTime: 0,
    messagesReceived: 0,
    messagesSent: 0,
    reconnectAttempts: 0,
    averageLatency: 0
  }

  private offlineQueue: OrganizationEvent[] = []
  private refreshTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private visibilityHandler: (() => void) | null = null
  private isVisible = true
  private config: OrganizationChannelConfig

  constructor(
    private userId: UserId,
    private organizationIds: OrganizationId[],
    private socketService: any, // WebSocketService
    config: Partial<OrganizationChannelConfig> = {}
  ) {
    this.config = { ...defaultConfig, ...config }
    this.setupVisibilityHandling()
  }

  /**
   * Initialize the channel and create subscription
   */
  async initialize(): Promise<void> {
    try {
      const roomId = createRoomId(`org_channel_${this.userId}`)
      
      this.subscription = {
        id: nanoid(),
        userId: this.userId,
        organizationIds: this.organizationIds,
        eventTypes: [
          'organization_created',
          'organization_updated', 
          'organization_deleted',
          'member_added',
          'member_removed',
          'member_role_changed',
          'activity_updated',
          'status_changed',
          'data_refresh'
        ],
        roomId,
        isActive: false,
        lastActivity: new Date().toISOString(),
        connectionStatus: 'disconnected',
        retryCount: 0
      }

      await this.connect()
      this.startAutoRefresh()
      this.startHeartbeat()

    } catch (error) {
      this.handleError('Failed to initialize organization channel', { error })
      throw error
    }
  }

  /**
   * Connect to the WebSocket channel
   */
  async connect(): Promise<void> {
    if (!this.subscription) {
      throw new Error('Channel not initialized')
    }

    try {
      this.subscription.connectionStatus = 'reconnecting'
      this.notifyConnectionChange(false, 'connecting')

      // Join the organization room
      await this.socketService.joinRoom(this.subscription.roomId)

      // Subscribe to organization events
      const subscribeMessage: WebSocketMessage = {
        id: nanoid(),
        type: 'organization_subscribe',
        roomId: this.subscription.roomId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        data: {
          subscriptionId: this.subscription.id,
          organizationIds: this.organizationIds,
          eventTypes: this.subscription.eventTypes,
          enablePresence: this.config.enablePresence
        },
        metadata: {
          priority: 'high',
          persistent: false
        }
      }

      await this.socketService.sendMessage('organization_subscribe', subscribeMessage.data, this.subscription.roomId)

      // Set up message handlers
      this.setupMessageHandlers()

      this.subscription.isActive = true
      this.subscription.connectionStatus = 'connected'
      this.subscription.retryCount = 0
      this.metrics.connectTime = Date.now()

      this.notifyConnectionChange(true, 'connected')

      console.log('Organization channel connected:', this.subscription.roomId)

    } catch (error) {
      this.subscription.connectionStatus = 'disconnected'
      this.handleConnectionError(error)
      throw error
    }
  }

  /**
   * Disconnect from the channel
   */
  async disconnect(): Promise<void> {
    if (!this.subscription) return

    try {
      this.subscription.isActive = false
      this.subscription.connectionStatus = 'disconnected'

      // Clean up timers
      this.stopAutoRefresh()
      this.stopHeartbeat()
      this.cleanupVisibilityHandling()

      // Leave the room
      await this.socketService.leaveRoom(this.subscription.roomId)

      // Send unsubscribe message
      const unsubscribeMessage: WebSocketMessage = {
        id: nanoid(),
        type: 'organization_unsubscribe',
        roomId: this.subscription.roomId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        data: {
          subscriptionId: this.subscription.id
        }
      }

      await this.socketService.sendMessage('organization_unsubscribe', unsubscribeMessage.data, this.subscription.roomId)

      this.notifyConnectionChange(false, 'disconnected')
      console.log('Organization channel disconnected')

    } catch (error) {
      this.handleError('Failed to disconnect organization channel', { error })
    }
  }

  /**
   * Subscribe to organization events
   */
  onEvent(eventType: OrganizationEventType, handler: (event: OrganizationEvent) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }

    const handlers = this.eventHandlers.get(eventType)!
    handlers.add(handler)

    // Return unsubscribe function
    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType)
      }
    }
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(handler: (connected: boolean, status: string) => void): () => void {
    this.connectionHandlers.add(handler)

    return () => {
      this.connectionHandlers.delete(handler)
    }
  }

  /**
   * Subscribe to presence updates
   */
  onPresenceChange(handler: (presence: UserPresence[]) => void): () => void {
    this.presenceHandlers.add(handler)

    return () => {
      this.presenceHandlers.delete(handler)
    }
  }

  /**
   * Subscribe to errors
   */
  onError(handler: (error: string, context?: any) => void): () => void {
    this.errorHandlers.add(handler)

    return () => {
      this.errorHandlers.delete(handler)
    }
  }

  /**
   * Manually trigger data refresh
   */
  async refreshData(): Promise<void> {
    if (!this.subscription?.isActive) return

    try {
      const refreshMessage: WebSocketMessage = {
        id: nanoid(),
        type: 'organization_refresh',
        roomId: this.subscription.roomId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        data: {
          organizationIds: this.organizationIds,
          force: true
        },
        metadata: {
          priority: 'high'
        }
      }

      await this.socketService.sendMessage('organization_refresh', refreshMessage.data, this.subscription.roomId)
      this.metrics.messagesSent++

    } catch (error) {
      this.handleError('Failed to refresh organization data', { error })
    }
  }

  /**
   * Update subscription configuration
   */
  updateConfig(config: Partial<OrganizationChannelConfig>): void {
    this.config = { ...this.config, ...config }

    // Restart auto-refresh if interval changed
    if (config.defaultRefreshInterval || config.autoRefreshEnabled !== undefined) {
      this.stopAutoRefresh()
      if (this.config.autoRefreshEnabled) {
        this.startAutoRefresh()
      }
    }

    // Update heartbeat if interval changed
    if (config.heartbeatInterval) {
      this.stopHeartbeat()
      this.startHeartbeat()
    }
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics }
  }

  /**
   * Get current subscription info
   */
  getSubscription(): OrganizationSubscription | null {
    return this.subscription ? { ...this.subscription } : null
  }

  /**
   * Add organization to subscription
   */
  async addOrganization(organizationId: OrganizationId): Promise<void> {
    if (!this.subscription) return

    if (!this.organizationIds.includes(organizationId)) {
      this.organizationIds.push(organizationId)
      this.subscription.organizationIds = [...this.organizationIds]

      // Send update to server
      await this.updateSubscription()
    }
  }

  /**
   * Remove organization from subscription
   */
  async removeOrganization(organizationId: OrganizationId): Promise<void> {
    if (!this.subscription) return

    const index = this.organizationIds.indexOf(organizationId)
    if (index > -1) {
      this.organizationIds.splice(index, 1)
      this.subscription.organizationIds = [...this.organizationIds]

      // Send update to server
      await this.updateSubscription()
    }
  }

  // Private methods

  private async updateSubscription(): Promise<void> {
    if (!this.subscription?.isActive) return

    try {
      const updateMessage: WebSocketMessage = {
        id: nanoid(),
        type: 'organization_subscription_update',
        roomId: this.subscription.roomId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        data: {
          subscriptionId: this.subscription.id,
          organizationIds: this.organizationIds,
          eventTypes: this.subscription.eventTypes
        }
      }

      await this.socketService.sendMessage('organization_subscription_update', updateMessage.data, this.subscription.roomId)

    } catch (error) {
      this.handleError('Failed to update subscription', { error })
    }
  }

  private setupMessageHandlers(): void {
    // Handle organization events
    this.socketService.onMessage('organization_event', (data: any) => {
      this.handleOrganizationEvent(data)
    })

    // Handle presence updates
    if (this.config.enablePresence) {
      this.socketService.onPresenceChange((presence: UserPresence[]) => {
        this.presenceHandlers.forEach(handler => handler(presence))
      })
    }

    // Handle connection errors
    this.socketService.onError((error: string) => {
      this.handleError(error)
    })
  }

  private handleOrganizationEvent(data: any): void {
    try {
      const event: OrganizationEvent = {
        id: data.id || nanoid(),
        type: data.type,
        organizationId: data.organizationId,
        userId: data.userId,
        timestamp: data.timestamp || new Date().toISOString(),
        data: data.payload || data.data,
        metadata: data.metadata
      }

      // Update metrics
      this.metrics.messagesReceived++
      this.metrics.lastMessageTime = Date.now()

      // Calculate latency if timestamp is available
      if (event.timestamp) {
        const eventTime = new Date(event.timestamp).getTime()
        const latency = Date.now() - eventTime
        this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2
      }

      // Process offline queue if needed
      if (this.offlineQueue.length > 0 && this.subscription?.connectionStatus === 'connected') {
        this.processOfflineQueue()
      }

      // Notify event handlers
      const handlers = this.eventHandlers.get(event.type)
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event)
          } catch (error) {
            this.handleError('Event handler error', { error, event })
          }
        })
      }

    } catch (error) {
      this.handleError('Failed to process organization event', { error, data })
    }
  }

  private handleConnectionError(error: any): void {
    if (!this.subscription) return

    this.subscription.retryCount++
    this.metrics.reconnectAttempts++

    this.handleError('Connection error', { error, retryCount: this.subscription.retryCount })

    // Auto-reconnect if enabled
    if (this.config.autoReconnect && this.subscription.retryCount < this.config.maxReconnectAttempts) {
      const delay = this.config.reconnectDelay * Math.pow(2, this.subscription.retryCount - 1)
      
      setTimeout(() => {
        if (this.subscription?.connectionStatus === 'disconnected') {
          this.connect().catch(error => {
            this.handleError('Reconnection failed', { error })
          })
        }
      }, delay)
    }
  }

  private processOfflineQueue(): void {
    const events = [...this.offlineQueue]
    this.offlineQueue = []

    events.forEach(event => {
      const handlers = this.eventHandlers.get(event.type)
      if (handlers) {
        handlers.forEach(handler => handler(event))
      }
    })
  }

  private startAutoRefresh(): void {
    if (!this.config.autoRefreshEnabled) return

    const interval = this.isVisible 
      ? this.config.defaultRefreshInterval 
      : this.config.backgroundRefreshInterval

    this.refreshTimer = setInterval(() => {
      this.refreshData()
    }, interval)
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.subscription?.isActive) {
        this.sendHeartbeat()
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.subscription?.isActive) return

    try {
      const heartbeatMessage: WebSocketMessage = {
        id: nanoid(),
        type: 'organization_heartbeat',
        roomId: this.subscription.roomId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        data: {
          subscriptionId: this.subscription.id,
          metrics: this.metrics
        }
      }

      await this.socketService.sendMessage('organization_heartbeat', heartbeatMessage.data, this.subscription.roomId)

    } catch (error) {
      this.handleError('Heartbeat failed', { error })
    }
  }

  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined') return

    this.visibilityHandler = () => {
      const wasVisible = this.isVisible
      this.isVisible = !document.hidden

      // Adjust refresh interval based on visibility
      if (wasVisible !== this.isVisible && this.config.backgroundRefreshEnabled) {
        this.stopAutoRefresh()
        this.startAutoRefresh()

        // Refresh immediately when becoming visible
        if (this.isVisible && !wasVisible) {
          this.refreshData()
        }
      }
    }

    document.addEventListener('visibilitychange', this.visibilityHandler)
  }

  private cleanupVisibilityHandling(): void {
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }
  }

  private notifyConnectionChange(connected: boolean, status: string): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected, status)
      } catch (error) {
        console.error('Connection handler error:', error)
      }
    })
  }

  private handleError(message: string, context?: any): void {
    console.error('OrganizationChannel error:', message, context)
    
    this.errorHandlers.forEach(handler => {
      try {
        handler(message, context)
      } catch (error) {
        console.error('Error handler error:', error)
      }
    })

    // Queue event if offline and queueing is enabled
    if (this.config.queueOfflineMessages && 
        this.subscription?.connectionStatus === 'disconnected' &&
        this.offlineQueue.length < this.config.maxOfflineQueue) {
      
      const errorEvent: OrganizationEvent = {
        id: nanoid(),
        type: 'data_refresh',
        organizationId: this.organizationIds[0] || '' as OrganizationId,
        timestamp: new Date().toISOString(),
        data: { error: message, context },
        metadata: { priority: 'low', source: 'system' }
      }
      
      this.offlineQueue.push(errorEvent)
    }
  }
}