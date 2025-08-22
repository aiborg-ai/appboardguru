/**
 * Cursor Tracking Service
 * Real-time cursor position and selection tracking for collaborative editing
 * Following CLAUDE.md patterns with DDD and Result handling
 */

import { BaseService } from './base.service'
import { Result } from '../repositories/result'
import type { AssetId, UserId, OrganizationId } from '../../types/database'
import type { WebSocketService } from './websocket.service'
import type { RoomId } from '../../types/websocket'
import { createRoomId } from '../../types/websocket'

export interface CursorPosition {
  line: number
  column: number
  offset: number // Absolute character position
}

export interface SelectionRange {
  start: CursorPosition
  end: CursorPosition
  direction: 'forward' | 'backward'
}

export interface UserCursor {
  userId: UserId
  assetId: AssetId
  position: CursorPosition
  selection?: SelectionRange
  color: string
  userName: string
  userAvatar?: string
  isActive: boolean
  lastUpdate: Date
  metadata?: {
    isTyping?: boolean
    isIdle?: boolean
    scrollPosition?: { top: number; left: number }
    viewportBounds?: { top: number; bottom: number }
  }
}

export interface CursorUpdateEvent {
  type: 'cursor_moved' | 'selection_changed' | 'cursor_idle' | 'cursor_active'
  cursor: UserCursor
  timestamp: Date
}

export interface CursorBatch {
  cursors: UserCursor[]
  timestamp: Date
  version: number
}

export class CursorTrackingService extends BaseService {
  private cursors = new Map<string, UserCursor>() // key: `${assetId}_${userId}`
  private cursorHistory = new Map<string, CursorPosition[]>()
  private subscriptions = new Map<AssetId, Set<(event: CursorUpdateEvent) => void>>()
  private typingTimeouts = new Map<string, NodeJS.Timeout>()
  private idleTimeouts = new Map<string, NodeJS.Timeout>()
  
  private readonly TYPING_TIMEOUT = 2000 // 2 seconds
  private readonly IDLE_TIMEOUT = 30000 // 30 seconds
  private readonly HISTORY_LIMIT = 50 // Keep last 50 cursor positions per user

  constructor(
    repositoryFactory: any,
    private websocketService?: WebSocketService
  ) {
    super(repositoryFactory)
  }

  /**
   * Update cursor position for a user
   */
  async updateCursor(
    userId: UserId,
    assetId: AssetId,
    position: CursorPosition,
    selection?: SelectionRange,
    metadata?: UserCursor['metadata']
  ): Promise<Result<UserCursor>> {
    try {
      const cursorKey = `${assetId}_${userId}`
      const existingCursor = this.cursors.get(cursorKey)
      
      // Get user info (simplified - in real implementation, fetch from user service)
      const userName = await this.getUserName(userId)
      const userColor = this.generateUserColor(userId)
      
      const cursor: UserCursor = {
        userId,
        assetId,
        position,
        selection,
        color: userColor,
        userName,
        userAvatar: existingCursor?.userAvatar,
        isActive: true,
        lastUpdate: new Date(),
        metadata: {
          ...existingCursor?.metadata,
          ...metadata,
          isTyping: true,
          isIdle: false
        }
      }

      // Store cursor
      this.cursors.set(cursorKey, cursor)

      // Update cursor history
      this.updateCursorHistory(cursorKey, position)

      // Handle typing indicators
      this.handleTypingIndicator(cursorKey, cursor)

      // Handle idle detection
      this.handleIdleDetection(cursorKey, cursor)

      // Broadcast cursor update via WebSocket
      if (this.websocketService) {
        const roomId = createRoomId(`document_${assetId}`)
        await this.websocketService.broadcastToRoom(roomId, {
          id: `cursor_${Date.now()}`,
          type: 'cursor_movement',
          roomId,
          userId,
          timestamp: new Date().toISOString(),
          data: { cursor }
        })
      }

      // Notify subscribers
      this.notifySubscribers(assetId, {
        type: 'cursor_moved',
        cursor,
        timestamp: new Date()
      })

      await this.logActivity('cursor_updated', {
        userId,
        assetId,
        position,
        hasSelection: !!selection
      })

      return Result.success(cursor)

    } catch (error) {
      return Result.failure(
        'CURSOR_UPDATE_ERROR',
        `Failed to update cursor: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get all active cursors for a document
   */
  async getDocumentCursors(
    assetId: AssetId,
    excludeUserId?: UserId
  ): Promise<Result<UserCursor[]>> {
    try {
      const cursors: UserCursor[] = []
      
      for (const [key, cursor] of this.cursors.entries()) {
        if (cursor.assetId === assetId && cursor.userId !== excludeUserId) {
          // Check if cursor is still active (not older than 5 minutes)
          const isStale = Date.now() - cursor.lastUpdate.getTime() > 300000
          
          if (!isStale && cursor.isActive) {
            cursors.push(cursor)
          } else if (isStale) {
            // Remove stale cursors
            this.cursors.delete(key)
            this.clearTimeouts(key)
          }
        }
      }

      return Result.success(cursors)

    } catch (error) {
      return Result.failure(
        'GET_CURSORS_ERROR',
        `Failed to get document cursors: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Remove cursor for a user (when they leave the document)
   */
  async removeCursor(userId: UserId, assetId: AssetId): Promise<Result<void>> {
    try {
      const cursorKey = `${assetId}_${userId}`
      const cursor = this.cursors.get(cursorKey)
      
      if (cursor) {
        // Mark as inactive
        cursor.isActive = false
        cursor.lastUpdate = new Date()

        // Broadcast cursor removal
        if (this.websocketService) {
          const roomId = createRoomId(`document_${assetId}`)
          await this.websocketService.broadcastToRoom(roomId, {
            id: `cursor_remove_${Date.now()}`,
            type: 'cursor_removed',
            roomId,
            userId,
            timestamp: new Date().toISOString(),
            data: { cursor }
          })
        }

        // Clean up after delay to allow smooth animations
        setTimeout(() => {
          this.cursors.delete(cursorKey)
          this.cursorHistory.delete(cursorKey)
          this.clearTimeouts(cursorKey)
        }, 1000)

        // Notify subscribers
        this.notifySubscribers(assetId, {
          type: 'cursor_idle',
          cursor,
          timestamp: new Date()
        })

        await this.logActivity('cursor_removed', { userId, assetId })
      }

      return Result.success(undefined)

    } catch (error) {
      return Result.failure(
        'CURSOR_REMOVE_ERROR',
        `Failed to remove cursor: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get cursor history for a user
   */
  getCursorHistory(userId: UserId, assetId: AssetId): Result<CursorPosition[]> {
    try {
      const cursorKey = `${assetId}_${userId}`
      const history = this.cursorHistory.get(cursorKey) || []
      
      return Result.success([...history]) // Return copy

    } catch (error) {
      return Result.failure(
        'CURSOR_HISTORY_ERROR',
        `Failed to get cursor history: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Subscribe to cursor updates for a document
   */
  subscribeToCursors(
    assetId: AssetId,
    callback: (event: CursorUpdateEvent) => void
  ): Result<() => void> {
    try {
      if (!this.subscriptions.has(assetId)) {
        this.subscriptions.set(assetId, new Set())
      }

      const subscribers = this.subscriptions.get(assetId)!
      subscribers.add(callback)

      // Return unsubscribe function
      const unsubscribe = () => {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          this.subscriptions.delete(assetId)
        }
      }

      return Result.success(unsubscribe)

    } catch (error) {
      return Result.failure(
        'SUBSCRIBE_ERROR',
        `Failed to subscribe to cursors: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get cursor batch for efficient updates
   */
  async getCursorBatch(assetId: AssetId): Promise<Result<CursorBatch>> {
    try {
      const cursorsResult = await this.getDocumentCursors(assetId)
      
      if (!cursorsResult.success) {
        return Result.failure(cursorsResult.error.code, cursorsResult.error.message)
      }

      const batch: CursorBatch = {
        cursors: cursorsResult.data,
        timestamp: new Date(),
        version: Date.now() // Simple versioning
      }

      return Result.success(batch)

    } catch (error) {
      return Result.failure(
        'CURSOR_BATCH_ERROR',
        `Failed to get cursor batch: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Update cursor history
   */
  private updateCursorHistory(cursorKey: string, position: CursorPosition): void {
    if (!this.cursorHistory.has(cursorKey)) {
      this.cursorHistory.set(cursorKey, [])
    }

    const history = this.cursorHistory.get(cursorKey)!
    history.push(position)

    // Keep only recent history
    if (history.length > this.HISTORY_LIMIT) {
      history.splice(0, history.length - this.HISTORY_LIMIT)
    }
  }

  /**
   * Handle typing indicators
   */
  private handleTypingIndicator(cursorKey: string, cursor: UserCursor): void {
    // Clear existing typing timeout
    const existingTimeout = this.typingTimeouts.get(cursorKey)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new typing timeout
    const timeout = setTimeout(() => {
      const currentCursor = this.cursors.get(cursorKey)
      if (currentCursor && currentCursor.metadata) {
        currentCursor.metadata.isTyping = false
        currentCursor.lastUpdate = new Date()

        // Notify subscribers
        this.notifySubscribers(cursor.assetId, {
          type: 'cursor_idle',
          cursor: currentCursor,
          timestamp: new Date()
        })
      }
    }, this.TYPING_TIMEOUT)

    this.typingTimeouts.set(cursorKey, timeout)
  }

  /**
   * Handle idle detection
   */
  private handleIdleDetection(cursorKey: string, cursor: UserCursor): void {
    // Clear existing idle timeout
    const existingTimeout = this.idleTimeouts.get(cursorKey)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new idle timeout
    const timeout = setTimeout(() => {
      const currentCursor = this.cursors.get(cursorKey)
      if (currentCursor && currentCursor.metadata) {
        currentCursor.metadata.isIdle = true
        currentCursor.lastUpdate = new Date()

        // Notify subscribers
        this.notifySubscribers(cursor.assetId, {
          type: 'cursor_idle',
          cursor: currentCursor,
          timestamp: new Date()
        })
      }
    }, this.IDLE_TIMEOUT)

    this.idleTimeouts.set(cursorKey, timeout)
  }

  /**
   * Clear timeouts for a cursor
   */
  private clearTimeouts(cursorKey: string): void {
    const typingTimeout = this.typingTimeouts.get(cursorKey)
    if (typingTimeout) {
      clearTimeout(typingTimeout)
      this.typingTimeouts.delete(cursorKey)
    }

    const idleTimeout = this.idleTimeouts.get(cursorKey)
    if (idleTimeout) {
      clearTimeout(idleTimeout)
      this.idleTimeouts.delete(cursorKey)
    }
  }

  /**
   * Notify subscribers of cursor updates
   */
  private notifySubscribers(assetId: AssetId, event: CursorUpdateEvent): void {
    const subscribers = this.subscriptions.get(assetId)
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(event)
        } catch (error) {
          console.error('Error in cursor subscription callback:', error)
        }
      })
    }
  }

  /**
   * Generate consistent color for user
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#AED6F1', '#F1948A', '#D7DBDD'
    ]
    
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  /**
   * Get user name (simplified implementation)
   */
  private async getUserName(userId: UserId): Promise<string> {
    try {
      // In real implementation, fetch from user repository
      return `User ${userId.slice(-4)}`
    } catch {
      return 'Unknown User'
    }
  }

  /**
   * Cleanup stale cursors (should be called periodically)
   */
  async cleanupStaleCursors(): Promise<Result<number>> {
    try {
      let cleanedCount = 0
      const staleThreshold = Date.now() - 300000 // 5 minutes

      for (const [key, cursor] of this.cursors.entries()) {
        if (cursor.lastUpdate.getTime() < staleThreshold) {
          this.cursors.delete(key)
          this.cursorHistory.delete(key)
          this.clearTimeouts(key)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        await this.logActivity('stale_cursors_cleaned', { count: cleanedCount })
      }

      return Result.success(cleanedCount)

    } catch (error) {
      return Result.failure(
        'CLEANUP_ERROR',
        `Failed to cleanup stale cursors: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}