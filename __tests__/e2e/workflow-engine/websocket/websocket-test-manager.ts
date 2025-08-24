/**
 * WebSocket Test Manager
 * 
 * Manages WebSocket connections during workflow testing to test real-time
 * features like live collaboration, voting, and AI analysis updates.
 */

export interface WebSocketTestManagerConfig {
  enabled: boolean
  connectionPoolSize: number
  reconnectAttempts?: number
  heartbeatInterval?: number
}

export class WebSocketTestManager {
  private config: WebSocketTestManagerConfig
  private connections: Map<string, any> = new Map()
  private messageLog: Array<{ connectionId: string; message: any; timestamp: number }> = []

  constructor(config: WebSocketTestManagerConfig) {
    this.config = {
      reconnectAttempts: 3,
      heartbeatInterval: 30000,
      ...config
    }
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    console.log(`WebSocket Test Manager initialized with pool size: ${this.config.connectionPoolSize}`)
  }

  async cleanup(): Promise<void> {
    for (const [connectionId, connection] of this.connections) {
      try {
        this.closeConnection(connectionId)
      } catch (error) {
        console.warn(`Failed to close WebSocket connection ${connectionId}:`, error)
      }
    }

    this.connections.clear()
    this.messageLog = []
  }

  async createConnection(connectionId: string, url: string): Promise<void> {
    if (this.connections.has(connectionId)) {
      throw new Error(`Connection ${connectionId} already exists`)
    }

    // Mock WebSocket connection for testing
    const connection = {
      id: connectionId,
      url,
      status: 'connected',
      lastHeartbeat: Date.now(),
      messagesSent: 0,
      messagesReceived: 0
    }

    this.connections.set(connectionId, connection)
  }

  async sendMessage(connectionId: string, message: any): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`)
    }

    connection.messagesSent++
    this.logMessage(connectionId, message, 'sent')
  }

  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.status = 'closed'
      this.connections.delete(connectionId)
    }
  }

  private logMessage(connectionId: string, message: any, direction: 'sent' | 'received'): void {
    this.messageLog.push({
      connectionId,
      message: { ...message, direction },
      timestamp: Date.now()
    })

    // Keep only recent messages to prevent memory bloat
    if (this.messageLog.length > 1000) {
      this.messageLog = this.messageLog.slice(-1000)
    }
  }

  getConnectionStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    
    for (const [connectionId, connection] of this.connections) {
      stats[connectionId] = {
        status: connection.status,
        messagesSent: connection.messagesSent,
        messagesReceived: connection.messagesReceived,
        uptime: Date.now() - connection.lastHeartbeat
      }
    }

    return stats
  }

  getMessageLog(): Array<{ connectionId: string; message: any; timestamp: number }> {
    return [...this.messageLog]
  }
}