import { WebSocketMessage } from './types'
import { authStore } from './auth-store'
import { organizationStore } from './organization-store'
import { assetStore } from './asset-store'
import { vaultStore } from './vault-store'
import { notificationStore } from './notification-store'
import { uiStore } from './ui-store'
import { storeLogger } from './store-utils'

// WebSocket connection states
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'

// WebSocket configuration
export interface WebSocketConfig {
  url: string
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
  messageQueueSize: number
}

// Default configuration
const defaultConfig: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  messageQueueSize: 100
}

// WebSocket manager class
export class WebSocketManager {
  private ws: WebSocket | null = null
  private state: WebSocketState = 'disconnected'
  private config: WebSocketConfig
  private reconnectAttempts = 0
  private messageQueue: WebSocketMessage[] = []
  private heartbeatInterval: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map()

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.setupAuthListener()
  }

  // Setup authentication listener
  private setupAuthListener(): void {
    authStore.subscribe(
      (state) => state.isAuthenticated,
      (isAuthenticated, previousAuthenticated) => {
        if (isAuthenticated && !previousAuthenticated) {
          this.connect()
        } else if (!isAuthenticated && previousAuthenticated) {
          this.disconnect()
        }
      }
    )
  }

  // Connect to WebSocket
  connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') {
      return
    }

    const user = authStore.getState().user
    if (!user) {
      console.warn('Cannot connect WebSocket: User not authenticated')
      return
    }

    this.setState('connecting')

    try {
      // Build WebSocket URL with authentication
      const wsUrl = new URL(this.config.url)
      wsUrl.searchParams.set('userId', user.id)
      wsUrl.searchParams.set('token', user.id) // In production, use proper JWT token

      this.ws = new WebSocket(wsUrl.toString())

      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.setState('error')
      this.scheduleReconnect()
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    this.clearTimeouts()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.setState('disconnected')
    this.reconnectAttempts = 0
  }

  // Handle WebSocket open
  private handleOpen(): void {
    console.log('WebSocket connected')
    this.setState('connected')
    this.reconnectAttempts = 0
    this.startHeartbeat()
    this.processMessageQueue()
    
    // Notify listeners
    this.emit('connected', null)
    
    storeLogger.log('websocket', 'connected')
  }

  // Handle WebSocket message
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      this.handleWebSocketMessage(message)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  // Handle WebSocket close
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason)
    this.setState('disconnected')
    this.clearTimeouts()
    
    // Schedule reconnect if not a clean close
    if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect()
    }
    
    // Notify listeners
    this.emit('disconnected', { code: event.code, reason: event.reason })
    
    storeLogger.log('websocket', 'disconnected', { code: event.code, reason: event.reason })
  }

  // Handle WebSocket error
  private handleError(event: Event): void {
    console.error('WebSocket error:', event)
    this.setState('error')
    
    // Notify listeners
    this.emit('error', event)
    
    storeLogger.log('websocket', 'error', event)
  }

  // Handle incoming WebSocket messages
  private handleWebSocketMessage(message: WebSocketMessage): void {
    const { type, data, userId, organizationId } = message
    
    // Ignore messages not meant for current user/organization
    const currentUser = authStore.getState().user
    const currentOrg = organizationStore.getState().currentOrganization
    
    if (userId && currentUser?.id !== userId) {
      return
    }
    
    if (organizationId && currentOrg?.id !== organizationId) {
      return
    }

    storeLogger.log('websocket', `message:${type}`, data)

    switch (type) {
      case 'notification':
        this.handleNotificationMessage(data)
        break
      case 'asset_update':
        this.handleAssetUpdateMessage(data)
        break
      case 'vault_update':
        this.handleVaultUpdateMessage(data)
        break
      case 'organization_update':
        this.handleOrganizationUpdateMessage(data)
        break
      default:
        console.warn(`Unknown WebSocket message type: ${type}`)
    }
    
    // Emit to custom listeners
    this.emit(type, data)
  }

  // Handle notification messages
  private handleNotificationMessage(data: any): void {
    const notificationState = notificationStore.getState()
    
    if (data.action === 'created') {
      // Add new notification
      notificationState.fetchNotifications()
      notificationState.fetchCounts()
      
      // Show desktop notification if enabled
      const preferences = notificationState.preferences
      if (preferences?.desktop_notifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(data.notification.title, {
          body: data.notification.message || data.notification.description,
          icon: '/favicon.ico'
        })
      }
      
      // Show toast notification
      uiStore.getState().showToast({
        type: 'info',
        title: data.notification.title,
        message: data.notification.message,
        duration: 5000
      })
    } else if (data.action === 'updated' || data.action === 'deleted') {
      // Refresh notifications
      notificationState.fetchNotifications()
      notificationState.fetchCounts()
    }
  }

  // Handle asset update messages
  private handleAssetUpdateMessage(data: any): void {
    const assetState = assetStore.getState()
    
    switch (data.action) {
      case 'created':
        assetState.fetchAssets()
        break
      case 'updated':
        if (data.asset) {
          // Update specific asset
          if (assetState.currentAsset?.id === data.asset.id) {
            assetState.setCurrentAsset(data.asset)
          }
          assetState.fetchAssets() // Refresh list
        }
        break
      case 'deleted':
        if (data.assetId) {
          assetState.fetchAssets() // Refresh list
          if (assetState.currentAsset?.id === data.assetId) {
            assetState.setCurrentAsset(null)
          }
        }
        break
      case 'annotation_created':
      case 'annotation_updated':
      case 'annotation_deleted':
        if (data.assetId && assetState.currentAsset?.id === data.assetId) {
          assetState.fetchAnnotations(data.assetId)
        }
        break
      case 'share_created':
      case 'share_updated':
      case 'share_revoked':
        if (data.assetId && assetState.currentAsset?.id === data.assetId) {
          assetState.fetchShares(data.assetId)
        }
        break
    }
  }

  // Handle vault update messages
  private handleVaultUpdateMessage(data: any): void {
    const vaultState = vaultStore.getState()
    
    switch (data.action) {
      case 'created':
        vaultState.fetchVaults()
        break
      case 'updated':
        if (data.vault) {
          if (vaultState.currentVault?.id === data.vault.id) {
            vaultState.setCurrentVault(data.vault)
          }
          vaultState.fetchVaults() // Refresh list
        }
        break
      case 'deleted':
        if (data.vaultId) {
          vaultState.fetchVaults() // Refresh list
          if (vaultState.currentVault?.id === data.vaultId) {
            vaultState.setCurrentVault(null)
          }
        }
        break
      case 'member_added':
      case 'member_removed':
      case 'member_role_updated':
        if (data.vaultId && vaultState.currentVault?.id === data.vaultId) {
          vaultState.fetchVault(data.vaultId)
        }
        break
      case 'invitation_created':
      case 'invitation_accepted':
      case 'invitation_rejected':
        vaultState.fetchInvitations()
        break
    }
  }

  // Handle organization update messages
  private handleOrganizationUpdateMessage(data: any): void {
    const orgState = organizationStore.getState()
    
    switch (data.action) {
      case 'created':
        orgState.fetchOrganizations()
        break
      case 'updated':
        if (data.organization) {
          if (orgState.currentOrganization?.id === data.organization.id) {
            orgState.setCurrentOrganization(data.organization)
          }
          orgState.fetchOrganizations() // Refresh list
        }
        break
      case 'deleted':
        if (data.organizationId) {
          orgState.fetchOrganizations() // Refresh list
          if (orgState.currentOrganization?.id === data.organizationId) {
            orgState.setCurrentOrganization(null)
          }
        }
        break
      case 'member_invited':
      case 'member_joined':
      case 'member_left':
      case 'member_role_updated':
        if (data.organizationId && orgState.currentOrganization?.id === data.organizationId) {
          orgState.fetchMembers(data.organizationId)
        }
        break
    }
  }

  // Send message
  send(message: Omit<WebSocketMessage, 'timestamp'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: Date.now()
    }

    if (this.state === 'connected' && this.ws) {
      try {
        this.ws.send(JSON.stringify(fullMessage))
        storeLogger.log('websocket', `send:${message.type}`, message.data)
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        this.queueMessage(fullMessage)
      }
    } else {
      this.queueMessage(fullMessage)
    }
  }

  // Queue message for later sending
  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message)
    
    // Limit queue size
    if (this.messageQueue.length > this.config.messageQueueSize) {
      this.messageQueue = this.messageQueue.slice(-this.config.messageQueueSize)
    }
  }

  // Process queued messages
  private processMessageQueue(): void {
    if (this.state !== 'connected' || !this.ws) {
      return
    }

    const messages = [...this.messageQueue]
    this.messageQueue = []

    messages.forEach(message => {
      try {
        this.ws!.send(JSON.stringify(message))
        storeLogger.log('websocket', `send_queued:${message.type}`, message.data)
      } catch (error) {
        console.error('Failed to send queued message:', error)
        this.queueMessage(message)
      }
    })
  }

  // Start heartbeat
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.state === 'connected' && this.ws) {
        this.send({
          type: 'heartbeat',
          data: { timestamp: Date.now() }
        })
      }
    }, this.config.heartbeatInterval)
  }

  // Schedule reconnect
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached')
      this.setState('error')
      return
    }

    this.reconnectAttempts++
    this.setState('reconnecting')

    const delay = this.config.reconnectInterval * Math.pow(2, Math.min(this.reconnectAttempts - 1, 5))
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)

    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }

  // Set WebSocket state
  private setState(state: WebSocketState): void {
    this.state = state
    this.emit('stateChanged', state)
  }

  // Clear all timeouts
  private clearTimeouts(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  // Event listener methods
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    
    this.eventListeners.get(event)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback)
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error)
        }
      })
    }
  }

  // Get current state
  getState(): WebSocketState {
    return this.state
  }

  // Get connection info
  getConnectionInfo() {
    return {
      state: this.state,
      reconnectAttempts: this.reconnectAttempts,
      queueSize: this.messageQueue.length,
      isConnected: this.state === 'connected'
    }
  }
}

// Global WebSocket manager instance
export const webSocketManager = new WebSocketManager()

// React hooks for WebSocket
export const useWebSocket = () => {
  return {
    connect: () => webSocketManager.connect(),
    disconnect: () => webSocketManager.disconnect(),
    send: (message: Omit<WebSocketMessage, 'timestamp'>) => webSocketManager.send(message),
    getState: () => webSocketManager.getState(),
    getConnectionInfo: () => webSocketManager.getConnectionInfo(),
    on: (event: string, callback: (data: any) => void) => webSocketManager.on(event, callback)
  }
}

// Initialize WebSocket manager
if (typeof window !== 'undefined') {
  // Auto-connect when user is authenticated
  const user = authStore.getState().user
  if (user) {
    webSocketManager.connect()
  }
}