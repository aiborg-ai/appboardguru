/**
 * WebSocket Client for Real-Time Collaboration
 * Frontend WebSocket client with automatic reconnection, message queuing,
 * and typed event handling for seamless real-time collaboration
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queuing during disconnection
 * - Typed event handlers for type safety
 * - Room management and presence tracking
 * - Document operation synchronization
 * - Real-time chat integration
 * - Performance monitoring and debugging
 */

import { EventEmitter } from 'events'
import { WebSocketMessage, DocumentOperation, PresenceUpdate, ChatMessage } from './websocket-server'

export type WebSocketClientEvents = {
  connected: () => void
  disconnected: (reason?: string) => void
  error: (error: Error) => void
  message: (message: WebSocketMessage) => void
  room_joined: (data: { roomId: string; participants: PresenceUpdate[]; version: number }) => void
  room_left: (data: { roomId: string }) => void
  participant_joined: (data: { userId: string; userName: string }) => void
  participant_left: (data: { userId: string; userName: string }) => void
  document_operation_applied: (operation: DocumentOperation) => void
  presence_updated: (presence: PresenceUpdate) => void
  chat_message_received: (message: ChatMessage) => void
  typing_indicator: (data: { userId: string; userName: string; isTyping: boolean }) => void
  document_state_response: (data: { 
    roomId: string; 
    documentState: string; 
    version: number; 
    operationHistory: DocumentOperation[] 
  }) => void
}

interface WebSocketClientConfig {
  url?: string
  token: string
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
  debug?: boolean
}

interface QueuedMessage {
  message: WebSocketMessage
  timestamp: number
  retries: number
}

export class WebSocketCollaborationClient extends EventEmitter {
  private ws: WebSocket | null = null
  private config: Required<WebSocketClientConfig>
  private reconnectAttempts: number = 0
  private messageQueue: QueuedMessage[] = []
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnecting: boolean = false
  private isAuthenticated: boolean = false
  private currentRooms: Set<string> = new Set()
  private lastMessageId: number = 0

  // Connection state
  public connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected'
  public userId: string | null = null
  public userName: string | null = null
  public organizationId: string | null = null

  constructor(config: WebSocketClientConfig) {
    super()
    
    this.config = {
      url: config.url || `ws://${window.location.hostname}:8080`,
      token: config.token,
      reconnectAttempts: config.reconnectAttempts || 10,
      reconnectDelay: config.reconnectDelay || 1000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      debug: config.debug || false
    }

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // Handle visibility change to manage connection
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.debug('Page hidden - connection may be throttled')
      } else {
        this.debug('Page visible - ensuring connection')
        if (this.connectionState === 'disconnected') {
          this.connect()
        }
      }
    })

    // Handle before unload to clean up
    window.addEventListener('beforeunload', () => {
      this.disconnect()
    })
  }

  public async connect(): Promise<void> {
    if (this.isConnecting || this.connectionState === 'connected') {
      return
    }

    this.isConnecting = true
    this.connectionState = 'connecting'

    try {
      const wsUrl = `${this.config.url}?token=${encodeURIComponent(this.config.token)}`
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)

      this.debug(`Connecting to WebSocket: ${wsUrl}`)
      
    } catch (error) {
      this.debug('Failed to create WebSocket connection', error)
      this.handleConnectionError(error as Error)
    }
  }

  public disconnect(): void {
    this.debug('Disconnecting WebSocket')
    
    // Clear timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.onclose = null // Prevent reconnection
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.connectionState = 'disconnected'
    this.isConnecting = false
    this.isAuthenticated = false
    this.reconnectAttempts = 0
    this.currentRooms.clear()
    
    this.emit('disconnected', 'manual')
  }

  private handleOpen(): void {
    this.debug('WebSocket connection opened')
    this.connectionState = 'connected'
    this.isConnecting = false
    this.reconnectAttempts = 0
    
    this.startHeartbeat()
    this.processMessageQueue()
    
    this.emit('connected')
  }

  private handleClose(event: CloseEvent): void {
    this.debug(`WebSocket connection closed: ${event.code} - ${event.reason}`)
    
    this.connectionState = 'disconnected'
    this.isConnecting = false
    this.isAuthenticated = false
    
    // Clear heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    this.emit('disconnected', event.reason)

    // Attempt reconnection if not manually closed
    if (event.code !== 1000 && this.reconnectAttempts < this.config.reconnectAttempts) {
      this.scheduleReconnect()
    }
  }

  private handleError(event: Event): void {
    this.debug('WebSocket error:', event)
    this.emit('error', new Error('WebSocket connection error'))
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      this.debug('Received message:', message.type, message.payload)
      
      // Handle system messages
      switch (message.type) {
        case 'connection_established':
          this.handleConnectionEstablished(message.payload)
          break
        
        case 'error':
          this.emit('error', new Error(message.payload.message))
          break
        
        default:
          // Emit typed events for specific message types
          this.emit(message.type as keyof WebSocketClientEvents, message.payload)
          this.emit('message', message)
      }
    } catch (error) {
      this.debug('Failed to parse WebSocket message:', error)
    }
  }

  private handleConnectionEstablished(payload: any): void {
    this.debug('Connection established with payload:', payload)
    this.isAuthenticated = true
    this.userId = payload.userId
    this.userName = payload.userName
    this.organizationId = payload.organizationId
  }

  private handleConnectionError(error: Error): void {
    this.isConnecting = false
    this.connectionState = 'disconnected'
    this.emit('error', error)
    
    if (this.reconnectAttempts < this.config.reconnectAttempts) {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    this.connectionState = 'reconnecting'
    
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )
    
    this.debug(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'ping',
          payload: {},
          timestamp: new Date().toISOString(),
          messageId: this.generateMessageId()
        })
      }
    }, this.config.heartbeatInterval)
  }

  private processMessageQueue(): void {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    
    // Remove expired messages
    this.messageQueue = this.messageQueue.filter(
      queued => now - queued.timestamp < maxAge
    )
    
    // Send queued messages
    for (const queued of this.messageQueue) {
      this.sendMessage(queued.message)
    }
    
    this.messageQueue = []
    this.debug(`Processed ${this.messageQueue.length} queued messages`)
  }

  private sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      this.debug('Sent message:', message.type, message.payload)
    } else {
      // Queue message for later
      this.messageQueue.push({
        message,
        timestamp: Date.now(),
        retries: 0
      })
      this.debug('Queued message for later:', message.type)
    }
  }

  private generateMessageId(): string {
    return `client-${Date.now()}-${++this.lastMessageId}`
  }

  private debug(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WebSocketClient]', ...args)
    }
  }

  // Public API Methods

  /**
   * Join a collaboration room
   */
  public joinRoom(roomId: string, roomType: 'document' | 'meeting' | 'vault' | 'chat', resourceId: string): void {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated')
    }

    this.currentRooms.add(roomId)
    
    this.sendMessage({
      type: 'join_room',
      payload: { roomId, roomType, resourceId },
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId(),
      userId: this.userId!,
      roomId
    })
  }

  /**
   * Leave a collaboration room
   */
  public leaveRoom(roomId: string): void {
    if (!this.currentRooms.has(roomId)) {
      return
    }

    this.currentRooms.delete(roomId)
    
    this.sendMessage({
      type: 'leave_room',
      payload: { roomId },
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId(),
      userId: this.userId!,
      roomId
    })
  }

  /**
   * Send a document operation
   */
  public sendDocumentOperation(operation: DocumentOperation): void {
    this.sendMessage({
      type: 'document_operation',
      payload: operation,
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId(),
      userId: this.userId!
    })
  }

  /**
   * Update user presence
   */
  public updatePresence(presence: Partial<PresenceUpdate>): void {
    const fullPresence: PresenceUpdate = {
      userId: this.userId!,
      userName: this.userName!,
      status: 'active',
      lastSeen: new Date().toISOString(),
      ...presence
    }

    this.sendMessage({
      type: 'presence_update',
      payload: fullPresence,
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId(),
      userId: this.userId!
    })
  }

  /**
   * Send a chat message
   */
  public sendChatMessage(content: string, roomId: string, attachments?: any[], replyTo?: string): void {
    const message: Omit<ChatMessage, 'id' | 'timestamp' | 'author' | 'authorName'> = {
      content,
      type: 'text',
      attachments,
      replyTo
    }

    this.sendMessage({
      type: 'chat_message',
      payload: message,
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId(),
      userId: this.userId!,
      roomId
    })
  }

  /**
   * Send typing indicator
   */
  public sendTypingIndicator(roomId: string, isTyping: boolean): void {
    this.sendMessage({
      type: 'typing_indicator',
      payload: { roomId, isTyping },
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId(),
      userId: this.userId!,
      roomId
    })
  }

  /**
   * Request current document state
   */
  public requestDocumentState(roomId: string): void {
    this.sendMessage({
      type: 'request_document_state',
      payload: { roomId },
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId(),
      userId: this.userId!,
      roomId
    })
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    connectionState: string
    isAuthenticated: boolean
    currentRooms: string[]
    queuedMessages: number
    reconnectAttempts: number
  } {
    return {
      connectionState: this.connectionState,
      isAuthenticated: this.isAuthenticated,
      currentRooms: Array.from(this.currentRooms),
      queuedMessages: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts
    }
  }

  /**
   * Add typed event listener
   */
  public on<K extends keyof WebSocketClientEvents>(
    event: K,
    listener: WebSocketClientEvents[K]
  ): this {
    return super.on(event, listener)
  }

  /**
   * Remove typed event listener
   */
  public off<K extends keyof WebSocketClientEvents>(
    event: K,
    listener: WebSocketClientEvents[K]
  ): this {
    return super.off(event, listener)
  }

  /**
   * Emit typed event
   */
  public emit<K extends keyof WebSocketClientEvents>(
    event: K,
    ...args: Parameters<WebSocketClientEvents[K]>
  ): boolean {
    return super.emit(event, ...args)
  }
}

// React Hook for WebSocket integration
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

export function useWebSocketCollaboration(config?: Partial<WebSocketClientConfig>) {
  const { user, getToken } = useAuthStore()
  const [client, setClient] = useState<WebSocketCollaborationClient | null>(null)
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  
  const clientRef = useRef<WebSocketCollaborationClient | null>(null)

  useEffect(() => {
    if (!user) {
      // Clean up existing connection
      if (clientRef.current) {
        clientRef.current.disconnect()
        clientRef.current = null
        setClient(null)
      }
      return
    }

    // Create WebSocket client
    const createClient = async () => {
      try {
        const token = await getToken()
        if (!token) {
          throw new Error('No authentication token available')
        }

        const wsClient = new WebSocketCollaborationClient({
          token,
          debug: process.env.NODE_ENV === 'development',
          ...config
        })

        // Setup event listeners
        wsClient.on('connected', () => {
          setConnectionState('connected')
          setError(null)
        })

        wsClient.on('disconnected', (reason) => {
          setConnectionState('disconnected')
          if (reason && reason !== 'manual') {
            setError(`Disconnected: ${reason}`)
          }
        })

        wsClient.on('error', (err) => {
          setError(err.message)
        })

        // Update connection state
        const updateState = () => {
          setConnectionState(wsClient.connectionState)
        }
        
        const stateInterval = setInterval(updateState, 1000)

        // Connect
        await wsClient.connect()

        clientRef.current = wsClient
        setClient(wsClient)

        // Cleanup on unmount
        return () => {
          clearInterval(stateInterval)
          wsClient.disconnect()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed')
      }
    }

    createClient()
    
    // Cleanup on dependency change
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect()
        clientRef.current = null
        setClient(null)
      }
    }
  }, [user, config])

  return {
    client,
    connectionState,
    error,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting' || connectionState === 'reconnecting'
  }
}

// Export types for consumers
export type {
  WebSocketMessage,
  DocumentOperation,
  PresenceUpdate,
  ChatMessage,
  WebSocketClientEvents
}