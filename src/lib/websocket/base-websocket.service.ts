/**
 * Base WebSocket Service
 * Foundation class for WebSocket implementations with reconnection and error handling
 */

export abstract class BaseWebSocketService<T = any> {
  protected ws: WebSocket | null = null
  protected url: string
  protected reconnectInterval: number
  protected reconnectTimer: NodeJS.Timeout | null = null
  protected messageQueue: any[] = []
  protected isConnecting: boolean = false
  protected isConnected: boolean = false
  protected eventHandlers: {
    message: ((event: T) => void)[]
    open: (() => void)[]
    close: ((event: CloseEvent) => void)[]
    error: ((event: Event) => void)[]
  } = {
    message: [],
    open: [],
    close: [],
    error: []
  }

  constructor(url: string, reconnectInterval: number = 5000) {
    this.url = url
    this.reconnectInterval = reconnectInterval
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.isConnecting || this.isConnected) {
      console.warn('BaseWebSocketService: Already connected or connecting')
      return
    }

    try {
      this.isConnecting = true
      this.ws = new WebSocket(this.url)

      this.ws.onopen = (event) => {
        console.log('BaseWebSocketService: WebSocket connected')
        this.isConnecting = false
        this.isConnected = true
        this.clearReconnectTimer()
        this.flushMessageQueue()
        this.eventHandlers.open.forEach(handler => handler())
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.eventHandlers.message.forEach(handler => handler(data))
        } catch (error) {
          console.error('BaseWebSocketService: Error parsing message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('BaseWebSocketService: WebSocket closed', event.code, event.reason)
        this.isConnecting = false
        this.isConnected = false
        this.ws = null
        this.eventHandlers.close.forEach(handler => handler(event))
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (event) => {
        console.error('BaseWebSocketService: WebSocket error:', event)
        this.isConnecting = false
        this.eventHandlers.error.forEach(handler => handler(event))
      }

    } catch (error) {
      console.error('BaseWebSocketService: Error creating WebSocket:', error)
      this.isConnecting = false
      this.scheduleReconnect()
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearReconnectTimer()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    
    this.isConnecting = false
    this.isConnected = false
    this.messageQueue = []
  }

  /**
   * Send message to WebSocket server
   */
  send(message: any): void {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('BaseWebSocketService: Error sending message:', error)
        this.messageQueue.push(message)
      }
    } else {
      // Queue message if not connected
      this.messageQueue.push(message)
      
      // Attempt to connect if not already connecting
      if (!this.isConnecting) {
        this.connect()
      }
    }
  }

  /**
   * Add message event handler
   */
  onMessage(handler: (event: T) => void): void {
    this.eventHandlers.message.push(handler)
  }

  /**
   * Add open event handler
   */
  onOpen(handler: () => void): void {
    this.eventHandlers.open.push(handler)
  }

  /**
   * Add close event handler
   */
  onClose(handler: (event: CloseEvent) => void): void {
    this.eventHandlers.close.push(handler)
  }

  /**
   * Add error event handler
   */
  onError(handler: (event: Event) => void): void {
    this.eventHandlers.error.push(handler)
  }

  /**
   * Remove event handler
   */
  removeHandler(type: keyof typeof this.eventHandlers, handler: Function): void {
    const handlers = this.eventHandlers[type] as Function[]
    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean
    isConnecting: boolean
    readyState?: number
  } {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      readyState: this.ws?.readyState
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return
    }

    console.log(`BaseWebSocketService: Scheduling reconnect in ${this.reconnectInterval}ms`)
    
    this.reconnectTimer = setTimeout(() => {
      console.log('BaseWebSocketService: Attempting to reconnect...')
      this.reconnectTimer = null
      this.connect()
    }, this.reconnectInterval)
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return
    }

    console.log(`BaseWebSocketService: Flushing ${this.messageQueue.length} queued messages`)
    
    const messages = [...this.messageQueue]
    this.messageQueue = []
    
    messages.forEach(message => {
      this.send(message)
    })
  }
}

export default BaseWebSocketService