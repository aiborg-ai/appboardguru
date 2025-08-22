/**
 * WebSocket Service
 * Real-time communication service following DDD architecture
 */

import { BaseService } from './base.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type {
  WebSocketMessage,
  WebSocketConnection,
  UserPresence,
  Room,
  RoomId,
  SocketId,
  SessionId,
  WebSocketEventType,
  WebSocketConfig,
  WebSocketError,
  WebSocketMetrics
} from '../../types/websocket'
import type { UserId, OrganizationId } from '../../types/database'
import { createSocketId, createRoomId, createSessionId } from '../../types/websocket'
import { nanoid } from 'nanoid'

/**
 * WebSocket Service Implementation
 * Manages real-time connections, rooms, and message broadcasting
 */
export class WebSocketService extends BaseService {
  private connections = new Map<SocketId, WebSocketConnection>()
  private rooms = new Map<RoomId, Room>()
  private userSessions = new Map<UserId, Set<SocketId>>()
  private config: WebSocketConfig
  private metrics: WebSocketMetrics = {
    connections: { total: 0, authenticated: 0, rooms: {} },
    messages: { sent: 0, received: 0, errors: 0, rateLimit: 0 },
    performance: { averageLatency: 0, messageQueue: 0, memoryUsage: 0 },
    uptime: Date.now()
  }

  constructor(supabase: SupabaseClient<Database>, config: WebSocketConfig) {
    super(supabase)
    this.config = config
    this.initializeMetricsCollection()
  }

  // =============================================
  // CONNECTION MANAGEMENT
  // =============================================

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(
    socketId: SocketId, 
    userId: UserId, 
    organizationId: OrganizationId
  ): Promise<void> {
    try {
      // Validate user authentication
      const user = await this.getCurrentUser()
      if (!user || user.id !== userId) {
        throw new Error('Authentication failed')
      }

      // Create session ID
      const sessionId = createSessionId(`session_${nanoid()}`)

      // Create connection record
      const connection: WebSocketConnection = {
        id: socketId,
        userId,
        organizationId,
        sessionId,
        rooms: new Set(),
        isAuthenticated: true,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        metadata: {}
      }

      // Store connection
      this.connections.set(socketId, connection)

      // Update user sessions
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set())
      }
      this.userSessions.get(userId)!.add(socketId)

      // Create user presence
      const presence: UserPresence = {
        userId,
        socketId,
        sessionId,
        organizationId,
        status: 'online',
        lastSeen: new Date().toISOString(),
        deviceInfo: {
          type: 'desktop', // Would be detected from user agent
          browser: 'unknown',
          os: 'unknown'
        }
      }

      // Store presence in database
      await this.storeUserPresence(presence)

      // Update metrics
      this.metrics.connections.total++
      this.metrics.connections.authenticated++

      // Log activity
      await this.logActivity('websocket_connection', 'websocket', socketId, {
        userId,
        organizationId,
        sessionId
      })

      console.log(`WebSocket connection established: ${socketId} for user ${userId}`)

    } catch (error) {
      await this.handleError(error, 'handleConnection', { socketId, userId, organizationId })
      throw error
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  async handleDisconnection(socketId: SocketId): Promise<void> {
    try {
      const connection = this.connections.get(socketId)
      if (!connection) return

      // Remove from all rooms
      for (const roomId of connection.rooms) {
        await this.leaveRoom(socketId, roomId)
      }

      // Update user sessions
      const userSockets = this.userSessions.get(connection.userId)
      if (userSockets) {
        userSockets.delete(socketId)
        if (userSockets.size === 0) {
          this.userSessions.delete(connection.userId)
          // User is completely offline, update presence
          await this.updateUserPresenceStatus(connection.userId, 'offline')
        }
      }

      // Remove connection
      this.connections.delete(socketId)

      // Update metrics
      this.metrics.connections.total--
      this.metrics.connections.authenticated--

      // Log activity
      await this.logActivity('websocket_disconnection', 'websocket', socketId, {
        userId: connection.userId,
        organizationId: connection.organizationId,
        sessionDuration: Date.now() - new Date(connection.connectedAt).getTime()
      })

      console.log(`WebSocket disconnection: ${socketId}`)

    } catch (error) {
      await this.handleError(error, 'handleDisconnection', { socketId })
    }
  }

  // =============================================
  // ROOM MANAGEMENT
  // =============================================

  /**
   * Join a room
   */
  async joinRoom(socketId: SocketId, roomId: RoomId): Promise<void> {
    try {
      const connection = this.connections.get(socketId)
      if (!connection || !connection.isAuthenticated) {
        throw new Error('Invalid or unauthenticated connection')
      }

      // Check if room exists
      let room = this.rooms.get(roomId)
      if (!room) {
        // Create room if it doesn't exist (for dynamic rooms)
        room = await this.createRoom(roomId, connection.organizationId, 'document', roomId)
      }

      // Check permissions
      if (!this.canUserJoinRoom(connection.userId, room)) {
        throw new Error('Permission denied to join room')
      }

      // Add to room
      connection.rooms.add(roomId)
      
      // Update user presence in room
      const userPresence = await this.getUserPresence(connection.userId)
      if (userPresence) {
        userPresence.currentRoom = roomId
        await this.storeUserPresence(userPresence)
      }

      // Update room participant count
      this.metrics.connections.rooms[roomId] = (this.metrics.connections.rooms[roomId] || 0) + 1

      // Broadcast user joined event
      await this.broadcastToRoom(roomId, {
        id: nanoid(),
        type: 'user_presence',
        roomId,
        userId: connection.userId,
        timestamp: new Date().toISOString(),
        data: {
          action: 'joined',
          presence: userPresence
        }
      })

      console.log(`User ${connection.userId} joined room ${roomId}`)

    } catch (error) {
      await this.handleError(error, 'joinRoom', { socketId, roomId })
      throw error
    }
  }

  /**
   * Leave a room
   */
  async leaveRoom(socketId: SocketId, roomId: RoomId): Promise<void> {
    try {
      const connection = this.connections.get(socketId)
      if (!connection) return

      // Remove from room
      connection.rooms.delete(roomId)

      // Update user presence
      const userPresence = await this.getUserPresence(connection.userId)
      if (userPresence && userPresence.currentRoom === roomId) {
        userPresence.currentRoom = undefined
        await this.storeUserPresence(userPresence)
      }

      // Update room participant count
      if (this.metrics.connections.rooms[roomId]) {
        this.metrics.connections.rooms[roomId]--
        if (this.metrics.connections.rooms[roomId] <= 0) {
          delete this.metrics.connections.rooms[roomId]
        }
      }

      // Broadcast user left event
      await this.broadcastToRoom(roomId, {
        id: nanoid(),
        type: 'user_presence',
        roomId,
        userId: connection.userId,
        timestamp: new Date().toISOString(),
        data: {
          action: 'left',
          presence: userPresence
        }
      })

      console.log(`User ${connection.userId} left room ${roomId}`)

    } catch (error) {
      await this.handleError(error, 'leaveRoom', { socketId, roomId })
    }
  }

  // =============================================
  // MESSAGE HANDLING
  // =============================================

  /**
   * Broadcast message to all users in a room
   */
  async broadcastToRoom(roomId: RoomId, message: WebSocketMessage): Promise<void> {
    try {
      const connectionsInRoom = Array.from(this.connections.values())
        .filter(conn => conn.rooms.has(roomId))

      const promises = connectionsInRoom.map(connection => 
        this.sendToSocket(connection.id, message)
      )

      await Promise.all(promises)
      this.metrics.messages.sent += connectionsInRoom.length

    } catch (error) {
      this.metrics.messages.errors++
      await this.handleError(error, 'broadcastToRoom', { roomId, messageType: message.type })
    }
  }

  /**
   * Send message to specific user (all their connections)
   */
  async sendToUser(userId: UserId, message: WebSocketMessage): Promise<void> {
    try {
      const userSockets = this.userSessions.get(userId)
      if (!userSockets || userSockets.size === 0) return

      const promises = Array.from(userSockets).map(socketId => 
        this.sendToSocket(socketId, message)
      )

      await Promise.all(promises)
      this.metrics.messages.sent += userSockets.size

    } catch (error) {
      this.metrics.messages.errors++
      await this.handleError(error, 'sendToUser', { userId, messageType: message.type })
    }
  }

  /**
   * Send message to specific socket
   */
  async sendToSocket(socketId: SocketId, message: WebSocketMessage): Promise<void> {
    try {
      const connection = this.connections.get(socketId)
      if (!connection) return

      // Update last activity
      connection.lastActivity = new Date().toISOString()

      // Here we would actually send the message via WebSocket
      // For now, we'll just log and store in database if persistent
      console.log(`Sending message to ${socketId}:`, message.type)

      if (message.metadata?.persistent) {
        await this.storeMessage(message)
      }

      this.metrics.messages.sent++

    } catch (error) {
      this.metrics.messages.errors++
      await this.handleError(error, 'sendToSocket', { socketId, messageType: message.type })
    }
  }

  // =============================================
  // PRESENCE MANAGEMENT
  // =============================================

  /**
   * Update user presence status
   */
  async updateUserPresenceStatus(
    userId: UserId, 
    status: UserPresence['status']
  ): Promise<void> {
    try {
      const presence = await this.getUserPresence(userId)
      if (presence) {
        presence.status = status
        presence.lastSeen = new Date().toISOString()
        await this.storeUserPresence(presence)

        // Broadcast presence update to all rooms user is in
        const userSockets = this.userSessions.get(userId)
        if (userSockets) {
          for (const socketId of userSockets) {
            const connection = this.connections.get(socketId)
            if (connection) {
              for (const roomId of connection.rooms) {
                await this.broadcastToRoom(roomId, {
                  id: nanoid(),
                  type: 'user_presence',
                  roomId,
                  userId,
                  timestamp: new Date().toISOString(),
                  data: {
                    action: 'updated',
                    presence
                  }
                })
              }
            }
          }
        }
      }
    } catch (error) {
      await this.handleError(error, 'updateUserPresenceStatus', { userId, status })
    }
  }

  /**
   * Get all users present in a room
   */
  async getRoomPresence(roomId: RoomId): Promise<UserPresence[]> {
    try {
      const usersInRoom = Array.from(this.connections.values())
        .filter(conn => conn.rooms.has(roomId))
        .map(conn => conn.userId)

      const presences = await Promise.all(
        usersInRoom.map(userId => this.getUserPresence(userId))
      )

      return presences.filter(Boolean) as UserPresence[]

    } catch (error) {
      await this.handleError(error, 'getRoomPresence', { roomId })
      return []
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  /**
   * Get WebSocket metrics
   */
  getMetrics(): WebSocketMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime
    }
  }

  /**
   * Check if user can join room
   */
  private canUserJoinRoom(userId: UserId, room: Room): boolean {
    return room.permissions.canView.includes(userId) || 
           room.permissions.publicAccess
  }

  /**
   * Create a new room
   */
  private async createRoom(
    roomId: RoomId,
    organizationId: OrganizationId, 
    type: Room['type'],
    resourceId: string
  ): Promise<Room> {
    const room: Room = {
      id: roomId,
      type,
      name: `Room ${roomId}`,
      organizationId,
      resourceId,
      participants: [],
      permissions: {
        canView: [],
        canEdit: [],
        canComment: [],
        canModerate: [],
        publicAccess: true
      },
      settings: {
        maxParticipants: 100,
        allowAnonymous: false,
        recordSession: false,
        requireApproval: false,
        notificationSettings: {
          mentions: true,
          allMessages: false,
          presenceChanges: true
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.rooms.set(roomId, room)
    return room
  }

  /**
   * Store user presence in database
   */
  private async storeUserPresence(presence: UserPresence): Promise<void> {
    try {
      await this.supabase
        .from('user_presence')
        .upsert({
          user_id: presence.userId,
          socket_id: presence.socketId,
          session_id: presence.sessionId,
          organization_id: presence.organizationId,
          status: presence.status,
          last_seen: presence.lastSeen,
          current_room: presence.currentRoom,
          device_info: presence.deviceInfo,
          metadata: presence.metadata || {}
        })
    } catch (error) {
      console.error('Failed to store user presence:', error)
    }
  }

  /**
   * Get user presence from database
   */
  private async getUserPresence(userId: UserId): Promise<UserPresence | null> {
    try {
      const { data } = await this.supabase
        .from('user_presence')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!data) return null

      return {
        userId: data.user_id as UserId,
        socketId: data.socket_id as SocketId,
        sessionId: data.session_id as SessionId,
        organizationId: data.organization_id as OrganizationId,
        status: data.status as UserPresence['status'],
        lastSeen: data.last_seen,
        currentRoom: data.current_room as RoomId | undefined,
        deviceInfo: data.device_info,
        metadata: data.metadata
      }
    } catch (error) {
      console.error('Failed to get user presence:', error)
      return null
    }
  }

  /**
   * Store message in database for persistence
   */
  private async storeMessage(message: WebSocketMessage): Promise<void> {
    try {
      await this.supabase
        .from('websocket_messages')
        .insert({
          id: message.id,
          type: message.type,
          room_id: message.roomId,
          user_id: message.userId,
          data: message.data,
          metadata: message.metadata || {},
          timestamp: message.timestamp
        })
    } catch (error) {
      console.error('Failed to store message:', error)
    }
  }

  /**
   * Initialize metrics collection
   */
  private initializeMetricsCollection(): void {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateMetrics()
    }, 30000)
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    this.metrics.performance.memoryUsage = process.memoryUsage().heapUsed
    this.metrics.connections.total = this.connections.size
    this.metrics.connections.authenticated = Array.from(this.connections.values())
      .filter(conn => conn.isAuthenticated).length
  }
}