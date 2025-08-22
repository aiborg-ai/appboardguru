/**
 * WebSocket Hook
 * Real-time communication client hook
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser, useAuth } from '../lib/stores'
import type {
  UseWebSocketReturn,
  WebSocketEventType,
  WebSocketMessage,
  RoomId,
  SocketId,
  WebSocketConfig,
  UserPresence
} from '../types/websocket'
import { createSocketId, createRoomId } from '../types/websocket'
import { nanoid } from 'nanoid'

const defaultConfig: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  heartbeatInterval: 30000,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  maxMessageSize: 1024 * 1024, // 1MB
  compression: true,
  authentication: {
    type: 'jwt',
    refreshThreshold: 300000 // 5 minutes
  },
  rooms: {
    maxParticipants: 100,
    defaultPermissions: {
      canView: [],
      canEdit: [],
      canComment: [],
      canModerate: [],
      publicAccess: true
    },
    sessionRecording: false
  },
  rateLimit: {
    messagesPerSecond: 10,
    burstLimit: 50,
    windowMs: 60000
  }
}

export function useWebSocket(config: Partial<WebSocketConfig> = {}): UseWebSocketReturn {
  const user = useUser()
  const { session } = useAuth()
  const wsConfig = { ...defaultConfig, ...config }
  
  // State
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<UseWebSocketReturn['connectionStatus']>('disconnected')
  const [lastError, setLastError] = useState<string | null>(null)

  // Refs
  const socketRef = useRef<WebSocket | null>(null)
  const socketId = useRef<SocketId>(createSocketId(`socket_${nanoid()}`))
  const heartbeatInterval = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)
  const reconnectTimeout = useRef<NodeJS.Timeout>()
  const messageHandlers = useRef<Map<WebSocketEventType, Set<(data: unknown) => void>>>(new Map())
  const presenceHandlers = useRef<Set<(presence: UserPresence[]) => void>>(new Set())
  const errorHandlers = useRef<Set<(error: string) => void>>(new Set())
  const currentRooms = useRef<Set<RoomId>>(new Set())

  // Rate limiting
  const messageQueue = useRef<Array<{ timestamp: number; message: WebSocketMessage }>>([])
  const rateLimitWindow = useRef<NodeJS.Timeout>()

  // Connection management
  const connect = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setConnectionStatus('connecting')
      setLastError(null)

      const ws = new WebSocket(wsConfig.url, wsConfig.protocols)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        socketRef.current = ws
        setSocket(ws)
        setIsConnected(true)
        setConnectionStatus('connected')
        reconnectAttempts.current = 0

        // Send authentication message
        ws.send(JSON.stringify({
          type: 'auth',
          token: session?.access_token,
          userId: user?.id,
          socketId: socketId.current
        }))

        // Start heartbeat
        heartbeatInterval.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, wsConfig.heartbeatInterval)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage

          // Handle system messages
          if (message.type === 'user_presence') {
            presenceHandlers.current.forEach(handler => {
              handler(message.data.presence ? [message.data.presence] : [])
            })
            return
          }

          // Handle regular messages
          const handlers = messageHandlers.current.get(message.type)
          if (handlers) {
            handlers.forEach(handler => handler(message.data))
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        const errorMsg = 'WebSocket connection error'
        setLastError(errorMsg)
        errorHandlers.current.forEach(handler => handler(errorMsg))
      }

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setSocket(null)
        setIsConnected(false)
        setConnectionStatus('disconnected')
        
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current)
        }

        // Attempt reconnection if not intentional
        if (event.code !== 1000 && reconnectAttempts.current < wsConfig.reconnectAttempts) {
          const delay = wsConfig.reconnectDelay * Math.pow(2, reconnectAttempts.current)
          reconnectAttempts.current++
          
          reconnectTimeout.current = setTimeout(() => {
            connect()
          }, delay)
        }
      }

    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      const errorMsg = error instanceof Error ? error.message : 'Connection failed'
      setLastError(errorMsg)
      setConnectionStatus('error')
      errorHandlers.current.forEach(handler => handler(errorMsg))
    }
  }, [user, wsConfig])

  const disconnect = useCallback((): void => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
    }
    
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current)
    }

    if (socketRef.current) {
      socketRef.current.close(1000, 'Client disconnect')
      socketRef.current = null
    }

    setSocket(null)
    setIsConnected(false)
    setConnectionStatus('disconnected')
    reconnectAttempts.current = 0
  }, [])

  const reconnect = useCallback(async (): Promise<void> => {
    disconnect()
    await connect()
  }, [connect, disconnect])

  // Room management
  const joinRoom = useCallback(async (roomId: RoomId): Promise<void> => {
    if (!socketRef.current || !isConnected) {
      throw new Error('WebSocket not connected')
    }

    const message = {
      type: 'join_room',
      roomId,
      socketId: socketId.current,
      timestamp: new Date().toISOString()
    }

    socketRef.current.send(JSON.stringify(message))
    currentRooms.current.add(roomId)
  }, [isConnected])

  const leaveRoom = useCallback(async (roomId: RoomId): Promise<void> => {
    if (!socketRef.current || !isConnected) {
      return
    }

    const message = {
      type: 'leave_room',
      roomId,
      socketId: socketId.current,
      timestamp: new Date().toISOString()
    }

    socketRef.current.send(JSON.stringify(message))
    currentRooms.current.delete(roomId)
  }, [isConnected])

  // Message handling with rate limiting
  const sendMessage = useCallback(<T>(
    type: WebSocketEventType,
    data: T,
    roomId?: RoomId
  ): void => {
    if (!socketRef.current || !isConnected || !user) {
      return
    }

    // Rate limiting check
    const now = Date.now()
    messageQueue.current = messageQueue.current.filter(
      msg => now - msg.timestamp < wsConfig.rateLimit.windowMs
    )

    if (messageQueue.current.length >= wsConfig.rateLimit.burstLimit) {
      console.warn('Rate limit exceeded, message dropped')
      return
    }

    const message: WebSocketMessage = {
      id: nanoid(),
      type,
      roomId: roomId || (currentRooms.current.values().next().value as RoomId),
      userId: user?.id,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        priority: 'normal',
        persistent: false,
        broadcast: true
      }
    }

    // Check message size
    const messageSize = JSON.stringify(message).length
    if (messageSize > wsConfig.maxMessageSize) {
      console.error('Message too large:', messageSize)
      return
    }

    socketRef.current.send(JSON.stringify(message))
    messageQueue.current.push({ timestamp: now, message })
  }, [isConnected, user, wsConfig])

  // Event listeners
  const onMessage = useCallback(<T>(
    type: WebSocketEventType,
    handler: (data: T) => void
  ): (() => void) => {
    if (!messageHandlers.current.has(type)) {
      messageHandlers.current.set(type, new Set())
    }
    
    const handlers = messageHandlers.current.get(type)!
    handlers.add(handler)

    // Return cleanup function
    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) {
        messageHandlers.current.delete(type)
      }
    }
  }, [])

  const onPresenceChange = useCallback((
    handler: (presence: UserPresence[]) => void
  ): (() => void) => {
    presenceHandlers.current.add(handler)

    return () => {
      presenceHandlers.current.delete(handler)
    }
  }, [])

  const onError = useCallback((
    handler: (error: string) => void
  ): (() => void) => {
    errorHandlers.current.add(handler)

    return () => {
      errorHandlers.current.delete(handler)
    }
  }, [])

  // Auto-connect when user is available
  useEffect(() => {
    if (user && !socket) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [user, socket, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rateLimitWindow.current) {
        clearTimeout(rateLimitWindow.current)
      }
      disconnect()
    }
  }, [disconnect])

  return {
    socket,
    isConnected,
    connectionStatus,
    lastError,
    connect,
    disconnect,
    reconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    onMessage,
    onPresenceChange,
    onError
  }
}