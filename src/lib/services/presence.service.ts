/**
 * Presence Service
 * Live user presence and document collaboration service following DDD architecture
 */

import { BaseService } from './base.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type { Result } from '../repositories/result'
import type {
  UserPresence,
  DocumentCursor,
  RoomId,
  SocketId,
  SessionId,
  Room,
  WebSocketMessage,
  WebSocketEventType
} from '../../types/websocket'
import type { UserId, OrganizationId, AssetId } from '../../types/branded'
import { WebSocketRepository } from '../repositories/websocket.repository'
import { DocumentRepository } from '../repositories/document.repository'
import { createRoomId, createSessionId } from '../../types/branded'
import { nanoid } from 'nanoid'

/**
 * Document Collaboration Configuration
 */
interface PresenceConfig {
  presenceUpdateInterval: number
  stalePresenceTimeout: number
  maxCursorsPerDocument: number
  presenceBroadcastThrottle: number
  enablePresenceAnalytics: boolean
}

/**
 * Presence Analytics Data
 */
interface PresenceAnalytics {
  totalActiveUsers: number
  averageSessionDuration: number
  mostActiveDocuments: Array<{
    assetId: AssetId
    activeUsers: number
    averageEngagementTime: number
  }>
  collaborationMetrics: {
    documentsWithMultipleUsers: number
    averageCollaboratorsPerDocument: number
    peakConcurrentUsers: number
  }
}

/**
 * Live Presence Service Implementation
 * Manages real-time user presence for document collaboration
 */
export class PresenceService extends BaseService {
  private websocketRepository: WebSocketRepository
  private documentRepository: DocumentRepository
  private config: PresenceConfig
  private presenceCache = new Map<UserId, UserPresence>()
  private documentCursors = new Map<AssetId, Map<UserId, DocumentCursor>>()
  private presenceCleanupInterval: NodeJS.Timeout | null = null

  constructor(
    supabase: SupabaseClient<Database>,
    config: Partial<PresenceConfig> = {}
  ) {
    super(supabase)
    this.websocketRepository = new WebSocketRepository(supabase)
    this.documentRepository = new DocumentRepository(supabase)
    
    this.config = {
      presenceUpdateInterval: 30000, // 30 seconds
      stalePresenceTimeout: 300000, // 5 minutes
      maxCursorsPerDocument: 50,
      presenceBroadcastThrottle: 1000, // 1 second
      enablePresenceAnalytics: true,
      ...config
    }

    this.initializePresenceCleanup()
  }

  // =============================================
  // PRESENCE MANAGEMENT
  // =============================================

  /**
   * Update user presence for document collaboration
   */
  async updateUserPresence(
    userId: UserId,
    organizationId: OrganizationId,
    assetId: AssetId,
    socketId: SocketId,
    sessionId: SessionId,
    status: UserPresence['status'] = 'online'
  ): Promise<Result<UserPresence>> {
    return this.executeServiceOperation(async () => {
      // Create or update presence
      const presence: UserPresence = {
        userId,
        socketId,
        sessionId,
        organizationId,
        status,
        lastSeen: new Date().toISOString(),
        currentRoom: createRoomId(`document_${assetId}`),
        deviceInfo: {
          type: 'desktop', // Would be detected from user agent
          browser: 'unknown',
          os: 'unknown'
        },
        metadata: {
          assetId,
          documentTitle: await this.getDocumentTitle(assetId),
          collaborationMode: 'active'
        }
      }

      // Store in database
      const storeResult = await this.websocketRepository.storeUserPresence(presence)
      if (!storeResult.success) {
        throw new Error(`Failed to store presence: ${storeResult.error.message}`)
      }

      // Update local cache
      this.presenceCache.set(userId, presence)

      // Broadcast presence update to other users in the document
      await this.broadcastPresenceUpdate(assetId, presence, 'updated')

      // Log activity for analytics
      await this.logActivity('presence_update', 'collaboration', userId, {
        assetId,
        organizationId,
        status,
        sessionId
      })

      return presence
    })
  }

  /**
   * Get active users collaborating on a document
   */
  async getDocumentCollaborators(assetId: AssetId): Promise<Result<UserPresence[]>> {
    return this.executeServiceOperation(async () => {
      const roomId = createRoomId(`document_${assetId}`)
      
      // Get from database
      const presenceResult = await this.websocketRepository.getRoomPresence(roomId)
      if (!presenceResult.success) {
        throw new Error(`Failed to get room presence: ${presenceResult.error.message}`)
      }

      // Filter active users and add enhanced metadata
      const activeCollaborators = await Promise.all(
        presenceResult.data
          .filter(p => p.status === 'online')
          .slice(0, this.config.maxCursorsPerDocument)
          .map(async (presence) => {
            // Get user profile for display
            const user = await this.getCurrentUser() // This would fetch user details
            return {
              ...presence,
              metadata: {
                ...presence.metadata,
                displayName: user?.email || 'Unknown User',
                avatarUrl: user?.user_metadata?.avatar_url,
                lastActiveAction: await this.getLastUserAction(presence.userId, assetId)
              }
            }
          })
      )

      return activeCollaborators
    })
  }

  /**
   * Update document cursor position for real-time tracking
   */
  async updateDocumentCursor(
    userId: UserId,
    assetId: AssetId,
    cursor: Omit<DocumentCursor, 'userId' | 'assetId' | 'timestamp'>
  ): Promise<Result<DocumentCursor>> {
    return this.executeServiceOperation(async () => {
      const fullCursor: DocumentCursor = {
        ...cursor,
        userId,
        assetId,
        timestamp: new Date().toISOString()
      }

      // Store in local cache for fast access
      if (!this.documentCursors.has(assetId)) {
        this.documentCursors.set(assetId, new Map())
      }
      
      const documentCursors = this.documentCursors.get(assetId)!
      documentCursors.set(userId, fullCursor)

      // Broadcast cursor update to other collaborators
      await this.broadcastCursorUpdate(assetId, fullCursor)

      // Update user's last activity
      const presence = this.presenceCache.get(userId)
      if (presence) {
        presence.lastSeen = new Date().toISOString()
        await this.websocketRepository.storeUserPresence(presence)
      }

      return fullCursor
    })
  }

  /**
   * Remove user from document collaboration
   */
  async removeUserFromDocument(
    userId: UserId,
    assetId: AssetId
  ): Promise<Result<void>> {
    return this.executeServiceOperation(async () => {
      // Remove from cursor tracking
      const documentCursors = this.documentCursors.get(assetId)
      if (documentCursors) {
        documentCursors.delete(userId)
      }

      // Update presence to reflect leaving document
      const presence = this.presenceCache.get(userId)
      if (presence && presence.currentRoom === createRoomId(`document_${assetId}`)) {
        presence.currentRoom = undefined
        presence.metadata = { ...presence.metadata, assetId: undefined }
        
        await this.websocketRepository.storeUserPresence(presence)
        this.presenceCache.set(userId, presence)

        // Broadcast user left document
        await this.broadcastPresenceUpdate(assetId, presence, 'left')
      }

      // Log activity
      await this.logActivity('presence_document_leave', 'collaboration', userId, {
        assetId,
        timestamp: new Date().toISOString()
      })
    })
  }

  /**
   * Get document cursor positions for all active users
   */
  async getDocumentCursors(assetId: AssetId): Promise<Result<DocumentCursor[]>> {
    return this.executeServiceOperation(async () => {
      const documentCursors = this.documentCursors.get(assetId)
      if (!documentCursors) {
        return []
      }

      // Return cursors for active users only
      const activeCursors = Array.from(documentCursors.values())
        .filter(cursor => {
          const presence = this.presenceCache.get(cursor.userId)
          return presence?.status === 'online'
        })
        .slice(0, this.config.maxCursorsPerDocument)

      return activeCursors
    })
  }

  // =============================================
  // PRESENCE ANALYTICS
  // =============================================

  /**
   * Get presence analytics for organization
   */
  async getPresenceAnalytics(organizationId: OrganizationId): Promise<Result<PresenceAnalytics>> {
    return this.executeServiceOperation(async () => {
      if (!this.config.enablePresenceAnalytics) {
        throw new Error('Presence analytics disabled')
      }

      // Get organization presence data
      const presenceResult = await this.websocketRepository.getOrganizationPresence(organizationId)
      if (!presenceResult.success) {
        throw new Error(`Failed to get organization presence: ${presenceResult.error.message}`)
      }

      const activeUsers = presenceResult.data
      const totalActiveUsers = activeUsers.length

      // Calculate session durations
      const sessionDurations = activeUsers.map(presence => {
        const sessionStart = new Date(presence.lastSeen).getTime()
        return Date.now() - sessionStart
      })
      
      const averageSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
        : 0

      // Document activity analysis
      const documentActivity = new Map<AssetId, { users: Set<UserId>; totalTime: number }>()
      
      for (const presence of activeUsers) {
        if (presence.metadata?.assetId) {
          const assetId = presence.metadata.assetId as AssetId
          if (!documentActivity.has(assetId)) {
            documentActivity.set(assetId, { users: new Set(), totalTime: 0 })
          }
          
          const activity = documentActivity.get(assetId)!
          activity.users.add(presence.userId)
          activity.totalTime += sessionDurations[activeUsers.indexOf(presence)] || 0
        }
      }

      // Calculate most active documents
      const mostActiveDocuments = Array.from(documentActivity.entries())
        .map(([assetId, activity]) => ({
          assetId,
          activeUsers: activity.users.size,
          averageEngagementTime: activity.totalTime / activity.users.size
        }))
        .sort((a, b) => b.activeUsers - a.activeUsers)
        .slice(0, 10)

      // Collaboration metrics
      const documentsWithMultipleUsers = Array.from(documentActivity.values())
        .filter(activity => activity.users.size > 1).length
      
      const totalCollaborators = Array.from(documentActivity.values())
        .reduce((sum, activity) => sum + activity.users.size, 0)
      
      const averageCollaboratorsPerDocument = documentActivity.size > 0
        ? totalCollaborators / documentActivity.size
        : 0

      const analytics: PresenceAnalytics = {
        totalActiveUsers,
        averageSessionDuration,
        mostActiveDocuments,
        collaborationMetrics: {
          documentsWithMultipleUsers,
          averageCollaboratorsPerDocument,
          peakConcurrentUsers: totalActiveUsers // Would track historical peak
        }
      }

      return analytics
    })
  }

  // =============================================
  // PRIVATE METHODS
  // =============================================

  /**
   * Broadcast presence update to document collaborators
   */
  private async broadcastPresenceUpdate(
    assetId: AssetId,
    presence: UserPresence,
    action: 'joined' | 'left' | 'updated'
  ): Promise<void> {
    const roomId = createRoomId(`document_${assetId}`)
    
    const message: WebSocketMessage = {
      id: nanoid(),
      type: 'user_presence',
      roomId,
      userId: presence.userId,
      timestamp: new Date().toISOString(),
      data: {
        action,
        presence,
        assetId
      },
      metadata: {
        priority: 'normal',
        persistent: false,
        broadcast: true
      }
    }

    // Send via WebSocket service (would be injected in real implementation)
    console.log(`Broadcasting presence update for user ${presence.userId} in document ${assetId}`)
  }

  /**
   * Broadcast cursor update to document collaborators
   */
  private async broadcastCursorUpdate(
    assetId: AssetId,
    cursor: DocumentCursor
  ): Promise<void> {
    const roomId = createRoomId(`document_${assetId}`)
    
    const message: WebSocketMessage = {
      id: nanoid(),
      type: 'cursor_movement',
      roomId,
      userId: cursor.userId,
      timestamp: new Date().toISOString(),
      data: {
        cursor,
        assetId
      },
      metadata: {
        priority: 'normal',
        persistent: false,
        broadcast: true
      }
    }

    console.log(`Broadcasting cursor update for user ${cursor.userId} in document ${assetId}`)
  }

  /**
   * Get document title for presence metadata
   */
  private async getDocumentTitle(assetId: AssetId): Promise<string> {
    try {
      const documentResult = await this.documentRepository.findById(assetId)
      if (documentResult.success && documentResult.data) {
        return documentResult.data.filename || 'Untitled Document'
      }
      return 'Unknown Document'
    } catch (error) {
      return 'Unknown Document'
    }
  }

  /**
   * Get user's last action in document
   */
  private async getLastUserAction(userId: UserId, assetId: AssetId): Promise<string> {
    try {
      // Get recent activity for this user and document
      const activities = await this.getRecentActivities(userId, {
        entityType: 'asset',
        entityId: assetId,
        limit: 1
      })

      if (activities.length > 0) {
        return activities[0].action
      }

      return 'viewing'
    } catch (error) {
      return 'viewing'
    }
  }

  /**
   * Initialize presence cleanup routine
   */
  private initializePresenceCleanup(): void {
    // Clean up stale presence every minute
    this.presenceCleanupInterval = setInterval(async () => {
      try {
        await this.cleanupStalePresence()
      } catch (error) {
        console.error('Presence cleanup failed:', error)
      }
    }, 60000)
  }

  /**
   * Clean up stale presence records
   */
  private async cleanupStalePresence(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.config.stalePresenceTimeout).toISOString()

    // Clean up database
    const cleanupResult = await this.websocketRepository.cleanupStalePresence(this.config.stalePresenceTimeout)
    if (!cleanupResult.success) {
      console.error('Failed to cleanup stale presence in database:', cleanupResult.error)
    }

    // Clean up local cache
    for (const [userId, presence] of this.presenceCache.entries()) {
      if (presence.lastSeen < cutoffTime) {
        this.presenceCache.delete(userId)
        
        // Broadcast user went offline
        if (presence.metadata?.assetId) {
          await this.broadcastPresenceUpdate(
            presence.metadata.assetId as AssetId,
            { ...presence, status: 'offline' },
            'left'
          )
        }
      }
    }

    // Clean up cursor cache
    for (const [assetId, cursors] of this.documentCursors.entries()) {
      for (const [userId, cursor] of cursors.entries()) {
        if (cursor.timestamp < cutoffTime) {
          cursors.delete(userId)
        }
      }
      
      // Remove empty document cursor maps
      if (cursors.size === 0) {
        this.documentCursors.delete(assetId)
      }
    }
  }

  /**
   * Cleanup on service destruction
   */
  destroy(): void {
    if (this.presenceCleanupInterval) {
      clearInterval(this.presenceCleanupInterval)
      this.presenceCleanupInterval = null
    }
  }

  // =============================================
  // COLLABORATION INSIGHTS
  // =============================================

  /**
   * Get real-time collaboration insights for document
   */
  async getDocumentCollaborationInsights(assetId: AssetId): Promise<Result<{
    activeUsers: UserPresence[]
    cursors: DocumentCursor[]
    collaborationScore: number
    engagementMetrics: {
      averageTimeSpent: number
      interactionCount: number
      lastActivity: string
    }
  }>> {
    return this.executeServiceOperation(async () => {
      // Get active collaborators
      const collaboratorsResult = await this.getDocumentCollaborators(assetId)
      if (!collaboratorsResult.success) {
        throw new Error(`Failed to get collaborators: ${collaboratorsResult.error.message}`)
      }

      // Get current cursors
      const cursorsResult = await this.getDocumentCursors(assetId)
      if (!cursorsResult.success) {
        throw new Error(`Failed to get cursors: ${cursorsResult.error.message}`)
      }

      const activeUsers = collaboratorsResult.data
      const cursors = cursorsResult.data

      // Calculate collaboration score (0-100)
      const collaborationScore = Math.min(100, 
        (activeUsers.length * 20) + // Base score for active users
        (cursors.length * 10) + // Bonus for active cursors
        (activeUsers.filter(u => u.status === 'online').length * 15) // Bonus for online users
      )

      // Calculate engagement metrics
      const sessionDurations = activeUsers.map(user => {
        const sessionStart = new Date(user.lastSeen).getTime()
        return Date.now() - sessionStart
      })

      const averageTimeSpent = sessionDurations.length > 0
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
        : 0

      const lastActivity = activeUsers.length > 0
        ? Math.max(...activeUsers.map(u => new Date(u.lastSeen).getTime()))
        : Date.now()

      return {
        activeUsers,
        cursors,
        collaborationScore,
        engagementMetrics: {
          averageTimeSpent,
          interactionCount: cursors.length + activeUsers.length,
          lastActivity: new Date(lastActivity).toISOString()
        }
      }
    })
  }

  /**
   * Get organization-wide presence analytics
   */
  async getOrganizationPresenceAnalytics(
    organizationId: OrganizationId
  ): Promise<Result<PresenceAnalytics>> {
    return this.executeServiceOperation(async () => {
      return this.getPresenceAnalytics(organizationId)
    })
  }
}