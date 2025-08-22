/**
 * WebSocket Repository
 * Database operations for WebSocket messages, presence, and sessions
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { BaseRepository } from './base.repository'
import type { Result } from './result'
import type {
  UserPresence,
  WebSocketMessage,
  WebSocketConnection,
  Room,
  RoomId,
  SocketId,
  SessionId,
  WebSocketMetrics
} from '../../types/websocket'
import type { UserId, OrganizationId } from '../../types/database'

export class WebSocketRepository extends BaseRepository {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  // =============================================
  // USER PRESENCE OPERATIONS
  // =============================================

  async storeUserPresence(presence: UserPresence): Promise<Result<void>> {
    return this.executeWithResult(async () => {
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
    })
  }

  async getUserPresence(userId: UserId): Promise<Result<UserPresence | null>> {
    return this.executeWithResult(async () => {
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
    })
  }

  async getOrganizationPresence(organizationId: OrganizationId): Promise<Result<UserPresence[]>> {
    return this.executeWithResult(async () => {
      const { data } = await this.supabase
        .from('user_presence')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'online')

      if (!data) return []

      return data.map(row => ({
        userId: row.user_id as UserId,
        socketId: row.socket_id as SocketId,
        sessionId: row.session_id as SessionId,
        organizationId: row.organization_id as OrganizationId,
        status: row.status as UserPresence['status'],
        lastSeen: row.last_seen,
        currentRoom: row.current_room as RoomId | undefined,
        deviceInfo: row.device_info,
        metadata: row.metadata
      }))
    })
  }

  async getRoomPresence(roomId: RoomId): Promise<Result<UserPresence[]>> {
    return this.executeWithResult(async () => {
      const { data } = await this.supabase
        .from('user_presence')
        .select('*')
        .eq('current_room', roomId)
        .eq('status', 'online')

      if (!data) return []

      return data.map(row => ({
        userId: row.user_id as UserId,
        socketId: row.socket_id as SocketId,
        sessionId: row.session_id as SessionId,
        organizationId: row.organization_id as OrganizationId,
        status: row.status as UserPresence['status'],
        lastSeen: row.last_seen,
        currentRoom: row.current_room as RoomId | undefined,
        deviceInfo: row.device_info,
        metadata: row.metadata
      }))
    })
  }

  async cleanupStalePresence(timeoutMs: number = 300000): Promise<Result<void>> {
    return this.executeWithResult(async () => {
      const cutoffTime = new Date(Date.now() - timeoutMs).toISOString()
      
      await this.supabase
        .from('user_presence')
        .delete()
        .lt('last_seen', cutoffTime)
    })
  }

  // =============================================
  // MESSAGE OPERATIONS
  // =============================================

  async storeMessage(message: WebSocketMessage): Promise<Result<void>> {
    return this.executeWithResult(async () => {
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
    })
  }

  async getRecentMessages(
    roomId: RoomId, 
    limit: number = 50,
    before?: string
  ): Promise<Result<WebSocketMessage[]>> {
    return this.executeWithResult(async () => {
      let query = this.supabase
        .from('websocket_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (before) {
        query = query.lt('timestamp', before)
      }

      const { data } = await query

      if (!data) return []

      return data.map(row => ({
        id: row.id,
        type: row.type as WebSocketMessage['type'],
        roomId: row.room_id as RoomId,
        userId: row.user_id as UserId,
        timestamp: row.timestamp,
        data: row.data,
        metadata: row.metadata
      }))
    })
  }

  async deleteMessage(messageId: string): Promise<Result<void>> {
    return this.executeWithResult(async () => {
      await this.supabase
        .from('websocket_messages')
        .delete()
        .eq('id', messageId)
    })
  }

  async getMessageHistory(
    userId: UserId,
    organizationId: OrganizationId,
    fromDate?: string,
    toDate?: string
  ): Promise<Result<WebSocketMessage[]>> {
    return this.executeWithResult(async () => {
      let query = this.supabase
        .from('websocket_messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })

      if (fromDate) {
        query = query.gte('timestamp', fromDate)
      }
      if (toDate) {
        query = query.lte('timestamp', toDate)
      }

      const { data } = await query

      if (!data) return []

      return data.map(row => ({
        id: row.id,
        type: row.type as WebSocketMessage['type'],
        roomId: row.room_id as RoomId,
        userId: row.user_id as UserId,
        timestamp: row.timestamp,
        data: row.data,
        metadata: row.metadata
      }))
    })
  }

  // =============================================
  // SESSION OPERATIONS
  // =============================================

  async createSession(
    sessionId: SessionId,
    userId: UserId,
    organizationId: OrganizationId,
    socketId: SocketId,
    metadata?: Record<string, unknown>
  ): Promise<Result<void>> {
    return this.executeWithResult(async () => {
      await this.supabase
        .from('websocket_sessions')
        .insert({
          session_id: sessionId,
          user_id: userId,
          organization_id: organizationId,
          socket_id: socketId,
          started_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          metadata: metadata || {},
          status: 'active'
        })
    })
  }

  async updateSessionActivity(sessionId: SessionId): Promise<Result<void>> {
    return this.executeWithResult(async () => {
      await this.supabase
        .from('websocket_sessions')
        .update({
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId)
    })
  }

  async endSession(sessionId: SessionId): Promise<Result<void>> {
    return this.executeWithResult(async () => {
      await this.supabase
        .from('websocket_sessions')
        .update({
          ended_at: new Date().toISOString(),
          status: 'ended'
        })
        .eq('session_id', sessionId)
    })
  }

  async getActiveSessions(organizationId: OrganizationId): Promise<Result<any[]>> {
    return this.executeWithResult(async () => {
      const { data } = await this.supabase
        .from('websocket_sessions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      return data || []
    })
  }

  async cleanupExpiredSessions(timeoutMs: number = 3600000): Promise<Result<void>> {
    return this.executeWithResult(async () => {
      const cutoffTime = new Date(Date.now() - timeoutMs).toISOString()
      
      await this.supabase
        .from('websocket_sessions')
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('last_activity', cutoffTime)
    })
  }

  // =============================================
  // ROOM OPERATIONS
  // =============================================

  async createRoom(room: Omit<Room, 'participants'>): Promise<Result<void>> {
    return this.executeWithResult(async () => {
      await this.supabase
        .from('websocket_rooms')
        .insert({
          id: room.id,
          type: room.type,
          name: room.name,
          organization_id: room.organizationId,
          resource_id: room.resourceId,
          permissions: room.permissions,
          settings: room.settings,
          created_at: room.createdAt,
          updated_at: room.updatedAt
        })
    })
  }

  async getRoom(roomId: RoomId): Promise<Result<Room | null>> {
    return this.executeWithResult(async () => {
      const { data } = await this.supabase
        .from('websocket_rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (!data) return null

      // Get current participants from presence
      const presenceResult = await this.getRoomPresence(roomId)
      const participants = presenceResult.success ? presenceResult.data : []

      return {
        id: data.id as RoomId,
        type: data.type as Room['type'],
        name: data.name,
        organizationId: data.organization_id as OrganizationId,
        resourceId: data.resource_id,
        participants,
        permissions: data.permissions,
        settings: data.settings,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    })
  }

  async updateRoom(
    roomId: RoomId, 
    updates: Partial<Pick<Room, 'name' | 'permissions' | 'settings'>>
  ): Promise<Result<void>> {
    return this.executeWithResult(async () => {
      await this.supabase
        .from('websocket_rooms')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)
    })
  }

  async deleteRoom(roomId: RoomId): Promise<Result<void>> {
    return this.executeWithResult(async () => {
      // Clean up related data first
      await this.supabase
        .from('user_presence')
        .update({ current_room: null })
        .eq('current_room', roomId)

      await this.supabase
        .from('websocket_messages')
        .delete()
        .eq('room_id', roomId)

      await this.supabase
        .from('websocket_rooms')
        .delete()
        .eq('id', roomId)
    })
  }

  async getOrganizationRooms(organizationId: OrganizationId): Promise<Result<Room[]>> {
    return this.executeWithResult(async () => {
      const { data } = await this.supabase
        .from('websocket_rooms')
        .select('*')
        .eq('organization_id', organizationId)

      if (!data) return []

      // Get participants for each room
      const rooms = await Promise.all(
        data.map(async (row) => {
          const roomId = row.id as RoomId
          const presenceResult = await this.getRoomPresence(roomId)
          const participants = presenceResult.success ? presenceResult.data : []

          return {
            id: roomId,
            type: row.type as Room['type'],
            name: row.name,
            organizationId: row.organization_id as OrganizationId,
            resourceId: row.resource_id,
            participants,
            permissions: row.permissions,
            settings: row.settings,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }
        })
      )

      return rooms
    })
  }

  // =============================================
  // METRICS OPERATIONS
  // =============================================

  async getConnectionMetrics(organizationId: OrganizationId): Promise<Result<WebSocketMetrics['connections']>> {
    return this.executeWithResult(async () => {
      // Get current active connections
      const { data: presenceData } = await this.supabase
        .from('user_presence')
        .select('current_room')
        .eq('organization_id', organizationId)
        .eq('status', 'online')

      const total = presenceData?.length || 0
      const authenticated = total // All stored presence is authenticated

      // Count users per room
      const rooms: Record<string, number> = {}
      if (presenceData) {
        for (const presence of presenceData) {
          if (presence.current_room) {
            rooms[presence.current_room] = (rooms[presence.current_room] || 0) + 1
          }
        }
      }

      return { total, authenticated, rooms }
    })
  }

  async getMessageMetrics(
    organizationId: OrganizationId,
    fromDate?: string,
    toDate?: string
  ): Promise<Result<WebSocketMetrics['messages']>> {
    return this.executeWithResult(async () => {
      let query = this.supabase
        .from('websocket_messages')
        .select('type, timestamp')

      if (fromDate) {
        query = query.gte('timestamp', fromDate)
      }
      if (toDate) {
        query = query.lte('timestamp', toDate)
      }

      const { data } = await query

      const sent = data?.length || 0
      const received = sent // For now, sent = received in our model
      const errors = 0 // Would need separate error tracking
      const rateLimit = 0 // Would need separate rate limit tracking

      return { sent, received, errors, rateLimit }
    })
  }

  // =============================================
  // CLEANUP OPERATIONS
  // =============================================

  async performMaintenance(): Promise<Result<void>> {
    return this.executeWithResult(async () => {
      // Clean up stale presence
      await this.cleanupStalePresence()
      
      // Clean up expired sessions
      await this.cleanupExpiredSessions()

      // Clean up old messages (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      await this.supabase
        .from('websocket_messages')
        .delete()
        .lt('timestamp', thirtyDaysAgo)
        .is('metadata->persistent', false)
    })
  }
}