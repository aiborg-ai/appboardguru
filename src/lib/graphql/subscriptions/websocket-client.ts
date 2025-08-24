/**
 * GraphQL WebSocket Client - Real-time Subscriptions Client
 * Client-side implementation for GraphQL subscriptions over WebSocket
 */

import { EventEmitter } from 'events'

export interface WebSocketClientOptions {
  url: string
  protocols?: string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
  timeout?: number
  authentication?: {
    token: string
    refreshToken?: string
  }
}

export interface SubscriptionOptions {
  query: string
  variables?: Record<string, any>
  operationName?: string
  onData?: (data: any) => void
  onError?: (error: any) => void
  onComplete?: () => void
}

export interface GraphQLWebSocketMessage {
  id?: string
  type: string
  payload?: any
}

export class GraphQLWebSocketClient extends EventEmitter {
  private socket: WebSocket | null = null
  private subscriptions: Map<string, SubscriptionOptions> = new Map()
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'ready' = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private subscriptionIdCounter = 0
  private messageQueue: GraphQLWebSocketMessage[] = []

  constructor(private options: WebSocketClientOptions) {
    super()
    this.connect()
  }

  /**
   * Connect to WebSocket server
   */
  private connect(): void {
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      return
    }

    this.connectionState = 'connecting'
    this.emit('connecting')

    try {
      this.socket = new WebSocket(this.options.url, this.options.protocols)
      this.setupSocketHandlers()
    } catch (error) {
      console.error('WebSocket connection failed:', error)
      this.handleReconnect()
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return

    this.socket.onopen = () => {
      console.log('WebSocket connected')
      this.connectionState = 'connected'
      this.reconnectAttempts = 0
      this.emit('connected')
      
      // Initialize connection
      this.sendConnectionInit()
    }

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data)
    }

    this.socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      this.connectionState = 'disconnected'
      this.emit('disconnected', { code: event.code, reason: event.reason })
      
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer)
        this.heartbeatTimer = null
      }

      // Attempt reconnection if not intentionally closed
      if (event.code !== 1000 && event.code !== 1001) {
        this.handleReconnect()
      }
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.emit('error', error)
    }
  }

  /**
   * Send connection initialization message
   */
  private sendConnectionInit(): void {
    const initMessage: GraphQLWebSocketMessage = {
      type: 'connection_init',
      payload: this.options.authentication ? {
        authorization: `Bearer ${this.options.authentication.token}`
      } : undefined
    }

    this.send(initMessage)
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: string): void {
    try {
      const message: GraphQLWebSocketMessage = JSON.parse(data)

      switch (message.type) {
        case 'connection_ack':
          this.connectionState = 'ready'
          this.emit('ready')
          this.processMessageQueue()
          this.startHeartbeat()
          break

        case 'connection_error':
          console.error('Connection error:', message.payload)
          this.emit('connectionError', message.payload)
          break

        case 'ka': // keep-alive
          // Respond with keep-alive
          this.send({ type: 'ka' })
          break

        case 'data':
          this.handleSubscriptionData(message)
          break

        case 'error':
          this.handleSubscriptionError(message)
          break

        case 'complete':
          this.handleSubscriptionComplete(message)
          break

        default:
          console.warn('Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  /**
   * Handle subscription data
   */
  private handleSubscriptionData(message: GraphQLWebSocketMessage): void {
    const { id, payload } = message
    if (!id) return

    const subscription = this.subscriptions.get(id)
    if (subscription?.onData) {
      subscription.onData(payload)
    }

    this.emit('subscriptionData', { id, data: payload })
  }

  /**
   * Handle subscription error
   */
  private handleSubscriptionError(message: GraphQLWebSocketMessage): void {
    const { id, payload } = message
    if (!id) return

    const subscription = this.subscriptions.get(id)
    if (subscription?.onError) {
      subscription.onError(payload)
    }

    this.emit('subscriptionError', { id, error: payload })
  }

  /**
   * Handle subscription completion
   */
  private handleSubscriptionComplete(message: GraphQLWebSocketMessage): void {
    const { id } = message
    if (!id) return

    const subscription = this.subscriptions.get(id)
    if (subscription?.onComplete) {
      subscription.onComplete()
    }

    this.subscriptions.delete(id)
    this.emit('subscriptionComplete', { id })
  }

  /**
   * Send message to server
   */
  private send(message: GraphQLWebSocketMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    } else {
      // Queue message if not connected
      this.messageQueue.push(message)
    }
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ka' })
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 5)) {
      console.error('Max reconnection attempts reached')
      this.emit('maxReconnectAttemptsReached')
      return
    }

    const delay = Math.min(
      (this.options.reconnectInterval || 5000) * Math.pow(2, this.reconnectAttempts),
      30000
    )

    this.reconnectAttempts++
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)

    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay })
  }

  /**
   * Subscribe to GraphQL subscription
   */
  subscribe(options: SubscriptionOptions): string {
    const id = (++this.subscriptionIdCounter).toString()
    this.subscriptions.set(id, options)

    const message: GraphQLWebSocketMessage = {
      id,
      type: 'start',
      payload: {
        query: options.query,
        variables: options.variables,
        operationName: options.operationName
      }
    }

    if (this.connectionState === 'ready') {
      this.send(message)
    } else {
      this.messageQueue.push(message)
    }

    return id
  }

  /**
   * Unsubscribe from a subscription
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId)
    
    const message: GraphQLWebSocketMessage = {
      id: subscriptionId,
      type: 'stop'
    }

    this.send(message)
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    const subscriptionIds = Array.from(this.subscriptions.keys())
    subscriptionIds.forEach(id => this.unsubscribe(id))
  }

  /**
   * Close WebSocket connection
   */
  close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    this.unsubscribeAll()

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect')
      this.socket = null
    }

    this.connectionState = 'disconnected'
    this.emit('closed')
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    return this.connectionState
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return this.subscriptions.size
  }

  /**
   * Check if client is ready to send subscriptions
   */
  isReady(): boolean {
    return this.connectionState === 'ready'
  }

  /**
   * Update authentication token
   */
  updateAuth(token: string, refreshToken?: string): void {
    this.options.authentication = { token, refreshToken }
    
    // Reconnect if currently connected to update auth
    if (this.connectionState !== 'disconnected') {
      this.close()
      setTimeout(() => this.connect(), 1000)
    }
  }
}

// React Hook for GraphQL WebSocket Subscriptions
export function useGraphQLSubscription(
  client: GraphQLWebSocketClient,
  subscription: SubscriptionOptions
) {
  const [data, setData] = React.useState<any>(null)
  const [error, setError] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const subscriptionId = client.subscribe({
      ...subscription,
      onData: (newData) => {
        setData(newData)
        setLoading(false)
        setError(null)
        subscription.onData?.(newData)
      },
      onError: (newError) => {
        setError(newError)
        setLoading(false)
        subscription.onError?.(newError)
      },
      onComplete: () => {
        setLoading(false)
        subscription.onComplete?.()
      }
    })

    return () => {
      client.unsubscribe(subscriptionId)
    }
  }, [client, subscription.query, JSON.stringify(subscription.variables)])

  return { data, error, loading }
}

// Utility functions for common subscription patterns
export class SubscriptionManager {
  private subscriptions: Map<string, string> = new Map()

  constructor(private client: GraphQLWebSocketClient) {}

  /**
   * Subscribe to asset updates
   */
  subscribeToAssets(callback: (assets: any[]) => void): string {
    const query = `
      subscription AssetsChanged {
        assetsChanged {
          id
          name
          type
          status
          updatedAt
        }
      }
    `

    return this.client.subscribe({
      query,
      onData: (data) => callback(data.assetsChanged)
    })
  }

  /**
   * Subscribe to user notifications
   */
  subscribeToNotifications(userId: string, callback: (notification: any) => void): string {
    const query = `
      subscription UserNotifications($userId: ID!) {
        notifications(userId: $userId) {
          id
          type
          title
          message
          createdAt
          read
        }
      }
    `

    return this.client.subscribe({
      query,
      variables: { userId },
      onData: (data) => callback(data.notifications)
    })
  }

  /**
   * Subscribe to chat messages
   */
  subscribeToChatMessages(roomId: string, callback: (message: any) => void): string {
    const query = `
      subscription ChatMessages($roomId: ID!) {
        chatMessage(roomId: $roomId) {
          id
          userId
          username
          message
          timestamp
        }
      }
    `

    return this.client.subscribe({
      query,
      variables: { roomId },
      onData: (data) => callback(data.chatMessage)
    })
  }

  /**
   * Subscribe to document collaboration events
   */
  subscribeToDocumentCollaboration(
    documentId: string, 
    callback: (event: any) => void
  ): string {
    const query = `
      subscription DocumentCollaboration($documentId: ID!) {
        documentCollaboration(documentId: $documentId) {
          type
          userId
          change
          timestamp
        }
      }
    `

    return this.client.subscribe({
      query,
      variables: { documentId },
      onData: (data) => callback(data.documentCollaboration)
    })
  }

  /**
   * Unsubscribe all managed subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscriptionId) => {
      this.client.unsubscribe(subscriptionId)
    })
    this.subscriptions.clear()
  }
}

// Export React for the hook
import * as React from 'react'