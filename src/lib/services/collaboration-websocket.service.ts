/**
 * Collaboration WebSocket Service
 * Real-time event handling for document collaboration
 * Handles operations, cursors, presence, and conflict resolution
 * Following CLAUDE.md patterns with Result pattern and enterprise-grade reliability
 */

import { WebSocketService } from './websocket.service'
import { DocumentCollaborationService } from './document-collaboration.service'
import { OperationalTransformService } from './operational-transform.service'
import { CursorTrackingService } from './cursor-tracking.service'
import { PresenceService } from './presence.service'
import { BaseService } from './base.service'
import { Result, success, failure, wrapAsync, isFailure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type {
  CollaborationEvent,
  CollaborationEventType,
  DocumentOperation,
  CollaborativeCursor,
  DocumentPresence,
  DocumentCollaborationSession,
  CollaborationSessionId,
  DocumentId,
  UserId,
  OperationId,
  RoomId
} from '../../types/document-collaboration'
import type { WebSocketMessage, WebSocketConnection } from '../../types/websocket'

export interface CollaborationWebSocketConfig {
  maxConnectionsPerSession: number
  operationBatchSize: number
  operationBatchTimeout: number
  heartbeatInterval: number
  reconnectInterval: number
  maxReconnectAttempts: number
  compressionEnabled: boolean
  rateLimitOperationsPerSecond: number
}

const DEFAULT_WEBSOCKET_CONFIG: CollaborationWebSocketConfig = {
  maxConnectionsPerSession: 100,
  operationBatchSize: 10,
  operationBatchTimeout: 100, // ms
  heartbeatInterval: 30000,   // 30 seconds
  reconnectInterval: 5000,    // 5 seconds
  maxReconnectAttempts: 5,
  compressionEnabled: true,
  rateLimitOperationsPerSecond: 10
}

export interface CollaborationConnection extends WebSocketConnection {
  sessionId: CollaborationSessionId
  documentId: DocumentId
  userId: UserId
  permissions: {
    canEdit: boolean
    canComment: boolean
    canViewCursors: boolean
  }
  lastActivity: Date
  operationQueue: DocumentOperation[]
  rateLimitBucket: {
    tokens: number
    lastRefill: Date
  }
}

export class CollaborationWebSocketService extends BaseService {
  private webSocketService: WebSocketService
  private collaborationService: DocumentCollaborationService
  private otService: OperationalTransformService
  private cursorService: CursorTrackingService
  private presenceService: PresenceService
  private config: CollaborationWebSocketConfig

  // Connection management
  private connections = new Map<string, CollaborationConnection>()
  private sessionConnections = new Map<CollaborationSessionId, Set<string>>()
  private operationBatches = new Map<CollaborationSessionId, {
    operations: DocumentOperation[]
    timeout: NodeJS.Timeout
  }>()

  // Performance monitoring
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    operationsProcessed: 0,
    averageLatency: 0,
    errorRate: 0,
    lastUpdated: new Date()
  }

  constructor(
    supabase: SupabaseClient<Database>,
    config: Partial<CollaborationWebSocketConfig> = {}
  ) {
    super(supabase)
    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...config }
    
    this.webSocketService = new WebSocketService(supabase)
    this.collaborationService = new DocumentCollaborationService(supabase)
    this.otService = new OperationalTransformService(supabase)
    this.cursorService = new CursorTrackingService(supabase)
    this.presenceService = new PresenceService(supabase)

    this.setupEventHandlers()
    this.startHeartbeat()
  }

  // ================================
  // Connection Management
  // ================================

  /**
   * Handle new collaboration connection
   */
  async handleConnection(
    connectionId: string,
    sessionId: CollaborationSessionId,
    userId: UserId,
    websocket: WebSocket
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      // Validate session exists and user has permissions
      const sessionResult = await this.collaborationService.getCollaborationSession(sessionId)
      if (!sessionResult.success) {
        throw sessionResult.error
      }

      const session = sessionResult.data
      
      // Check connection limits
      const sessionConnections = this.sessionConnections.get(sessionId)
      if (sessionConnections && sessionConnections.size >= this.config.maxConnectionsPerSession) {
        throw new Error('Maximum connections per session exceeded')
      }

      // Create collaboration connection
      const connection: CollaborationConnection = {
        id: connectionId,
        userId,
        websocket,
        isConnected: true,
        connectedAt: new Date(),
        sessionId,
        documentId: session.documentId,
        permissions: {
          canEdit: true, // TODO: Get from session permissions
          canComment: true,
          canViewCursors: true
        },
        lastActivity: new Date(),
        operationQueue: [],
        rateLimitBucket: {
          tokens: this.config.rateLimitOperationsPerSecond,
          lastRefill: new Date()
        }
      }

      // Store connection
      this.connections.set(connectionId, connection)
      
      if (!this.sessionConnections.has(sessionId)) {
        this.sessionConnections.set(sessionId, new Set())
      }
      this.sessionConnections.get(sessionId)!.add(connectionId)

      // Update presence
      await this.presenceService.updateUserPresence(sessionId, userId, {
        status: 'viewing',
        connectionId,
        joinedAt: new Date().toISOString()
      })

      // Send initial state to client
      await this.sendInitialState(connection, session)

      // Broadcast user joined event to others
      await this.broadcastToSession(sessionId, {
        type: 'user-joined',
        userId,
        data: {
          connectionId,
          joinedAt: new Date().toISOString()
        }
      }, connectionId)

      // Update metrics
      this.metrics.totalConnections++
      this.metrics.activeConnections++
      this.metrics.lastUpdated = new Date()

      // Log activity
      await this.logActivity('collaboration_connect', 'websocket', sessionId, {
        userId,
        connectionId,
        documentId: session.documentId
      })
    })
  }

  /**
   * Handle connection disconnection
   */
  async handleDisconnection(connectionId: string): Promise<Result<void>> {
    return wrapAsync(async () => {
      const connection = this.connections.get(connectionId)
      if (!connection) {
        return // Connection already cleaned up
      }

      // Process any remaining operations in queue
      if (connection.operationQueue.length > 0) {
        await this.processOperationBatch(connection.sessionId, connection.operationQueue)
      }

      // Update presence to offline
      await this.presenceService.updateUserPresence(
        connection.sessionId,
        connection.userId,
        { status: 'away', leftAt: new Date().toISOString() }
      )

      // Remove from session connections
      const sessionConnections = this.sessionConnections.get(connection.sessionId)
      if (sessionConnections) {
        sessionConnections.delete(connectionId)
        if (sessionConnections.size === 0) {
          this.sessionConnections.delete(connection.sessionId)
        }
      }

      // Broadcast user left event
      await this.broadcastToSession(connection.sessionId, {
        type: 'user-left',
        userId: connection.userId,
        data: {
          connectionId,
          leftAt: new Date().toISOString(),
          sessionDuration: Date.now() - connection.connectedAt.getTime()
        }
      }, connectionId)

      // Cleanup connection
      this.connections.delete(connectionId)

      // Update metrics
      this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1)
      this.metrics.lastUpdated = new Date()

      // Log activity
      await this.logActivity('collaboration_disconnect', 'websocket', connection.sessionId, {
        userId: connection.userId,
        connectionId,
        sessionDuration: Date.now() - connection.connectedAt.getTime()
      })
    })
  }

  // ================================
  // Event Handlers
  // ================================

  /**
   * Handle incoming operation from client
   */
  async handleOperationEvent(
    connectionId: string,
    operation: Omit<DocumentOperation, 'id' | 'timestamp' | 'vectorClock'>
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const connection = this.connections.get(connectionId)
      if (!connection) {
        throw new Error('Connection not found')
      }

      // Check permissions
      if (!connection.permissions.canEdit && 
          ['insert', 'delete', 'format'].includes(operation.type)) {
        throw new Error('Insufficient permissions for edit operation')
      }

      // Rate limiting
      const rateLimitResult = this.checkRateLimit(connection)
      if (!rateLimitResult) {
        throw new Error('Rate limit exceeded')
      }

      // Add to operation queue
      const fullOperation: DocumentOperation = {
        ...operation,
        id: crypto.randomUUID() as OperationId,
        timestamp: new Date().toISOString(),
        vectorClock: {} // Will be set by collaboration service
      }

      connection.operationQueue.push(fullOperation)
      connection.lastActivity = new Date()

      // Process batch if size reached or start batch timeout
      if (connection.operationQueue.length >= this.config.operationBatchSize) {
        await this.processOperationBatch(connection.sessionId, connection.operationQueue)
        connection.operationQueue = []
      } else {
        this.scheduleBatchTimeout(connection.sessionId)
      }
    })
  }

  /**
   * Handle cursor update from client
   */
  async handleCursorUpdateEvent(
    connectionId: string,
    cursor: Omit<CollaborativeCursor, 'id' | 'lastActivity'>
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const connection = this.connections.get(connectionId)
      if (!connection || !connection.permissions.canViewCursors) {
        return // Skip if no permission
      }

      // Update cursor in cursor service
      const cursorResult = await this.cursorService.updateCursor({
        ...cursor,
        userId: connection.userId,
        sessionId: connection.sessionId,
        documentId: connection.documentId
      })

      if (cursorResult.success) {
        // Broadcast cursor update to other session participants
        await this.broadcastToSession(connection.sessionId, {
          type: 'cursor-moved',
          userId: connection.userId,
          data: cursorResult.data
        }, connectionId)
      }

      connection.lastActivity = new Date()
    })
  }

  /**
   * Handle presence update from client
   */
  async handlePresenceUpdateEvent(
    connectionId: string,
    presence: Partial<DocumentPresence>
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const connection = this.connections.get(connectionId)
      if (!connection) {
        return
      }

      // Update presence
      await this.presenceService.updateUserPresence(
        connection.sessionId,
        connection.userId,
        {
          ...presence,
          lastActivity: new Date().toISOString()
        }
      )

      // Broadcast presence update
      await this.broadcastToSession(connection.sessionId, {
        type: 'presence-updated',
        userId: connection.userId,
        data: presence
      }, connectionId)

      connection.lastActivity = new Date()
    })
  }

  /**
   * Handle comment events
   */
  async handleCommentEvent(
    connectionId: string,
    eventType: 'comment-added' | 'comment-updated' | 'comment-resolved',
    commentData: any
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const connection = this.connections.get(connectionId)
      if (!connection || !connection.permissions.canComment) {
        throw new Error('Insufficient permissions for comment operation')
      }

      // Process comment through collaboration service
      // This would integrate with the comment management system

      // Broadcast comment event
      await this.broadcastToSession(connection.sessionId, {
        type: eventType,
        userId: connection.userId,
        data: commentData
      }, connectionId)

      connection.lastActivity = new Date()
    })
  }

  // ================================
  // Batch Processing
  // ================================

  private async processOperationBatch(
    sessionId: CollaborationSessionId,
    operations: DocumentOperation[]
  ): Promise<void> {
    if (operations.length === 0) return

    const startTime = Date.now()

    try {
      // Apply operations through collaboration service
      for (const operation of operations) {
        const result = await this.collaborationService.applyOperation(sessionId, {
          operation: {
            type: operation.type,
            position: operation.position,
            length: operation.length,
            content: operation.content,
            attributes: operation.attributes,
            metadata: operation.metadata
          }
        })

        if (result.success) {
          // Broadcast successful operation to all session participants
          await this.broadcastToSession(sessionId, {
            type: 'operation-applied',
            userId: operation.userId,
            data: {
              operation: result.data.transformedOperation || operation,
              operationId: result.data.operationId,
              newState: result.data.newState,
              conflicts: result.data.conflicts
            }
          })

          this.metrics.operationsProcessed++
        }
      }

      // Update performance metrics
      const processingTime = Date.now() - startTime
      this.metrics.averageLatency = 
        (this.metrics.averageLatency + processingTime) / 2

    } catch (error) {
      console.error('Failed to process operation batch:', error)
      this.metrics.errorRate = 
        (this.metrics.errorRate * 0.9) + 0.1 // Exponential smoothing
    }

    // Clear batch timeout if exists
    const batch = this.operationBatches.get(sessionId)
    if (batch) {
      clearTimeout(batch.timeout)
      this.operationBatches.delete(sessionId)
    }
  }

  private scheduleBatchTimeout(sessionId: CollaborationSessionId): void {
    // Clear existing timeout
    const existingBatch = this.operationBatches.get(sessionId)
    if (existingBatch) {
      clearTimeout(existingBatch.timeout)
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      const connections = this.sessionConnections.get(sessionId)
      if (connections) {
        const allOperations: DocumentOperation[] = []
        
        // Collect operations from all connections
        for (const connectionId of connections) {
          const connection = this.connections.get(connectionId)
          if (connection && connection.operationQueue.length > 0) {
            allOperations.push(...connection.operationQueue)
            connection.operationQueue = []
          }
        }

        if (allOperations.length > 0) {
          await this.processOperationBatch(sessionId, allOperations)
        }
      }

      this.operationBatches.delete(sessionId)
    }, this.config.operationBatchTimeout)

    this.operationBatches.set(sessionId, {
      operations: [],
      timeout
    })
  }

  // ================================
  // Broadcasting
  // ================================

  /**
   * Broadcast event to all connections in a session
   */
  private async broadcastToSession(
    sessionId: CollaborationSessionId,
    event: Omit<CollaborationEvent, 'id' | 'timestamp' | 'sessionId' | 'documentId'>,
    excludeConnectionId?: string
  ): Promise<void> {
    const sessionConnections = this.sessionConnections.get(sessionId)
    if (!sessionConnections) return

    const fullEvent: CollaborationEvent = {
      id: crypto.randomUUID(),
      type: event.type,
      sessionId,
      documentId: '' as DocumentId, // Will be filled from connection
      userId: event.userId,
      timestamp: new Date().toISOString(),
      data: event.data,
      metadata: {
        priority: 'normal',
        broadcast: true,
        persistent: false,
        retryable: true,
        ...event.metadata
      }
    }

    const promises: Promise<void>[] = []

    for (const connectionId of sessionConnections) {
      if (connectionId === excludeConnectionId) continue

      const connection = this.connections.get(connectionId)
      if (connection && connection.isConnected) {
        fullEvent.documentId = connection.documentId
        promises.push(this.sendEventToConnection(connection, fullEvent))
      }
    }

    await Promise.allSettled(promises)
  }

  /**
   * Send event to a specific connection
   */
  private async sendEventToConnection(
    connection: CollaborationConnection,
    event: CollaborationEvent
  ): Promise<void> {
    try {
      const message: WebSocketMessage = {
        type: 'collaboration-event',
        data: event
      }

      if (connection.websocket.readyState === WebSocket.OPEN) {
        const messageStr = JSON.stringify(message)
        connection.websocket.send(messageStr)
      }
    } catch (error) {
      console.error('Failed to send event to connection:', error)
      // Mark connection as disconnected and clean up
      connection.isConnected = false
      await this.handleDisconnection(connection.id)
    }
  }

  // ================================
  // Helper Methods
  // ================================

  private async sendInitialState(
    connection: CollaborationConnection,
    session: DocumentCollaborationSession
  ): Promise<void> {
    try {
      // Send session details
      await this.sendEventToConnection(connection, {
        id: crypto.randomUUID(),
        type: 'session-started',
        sessionId: connection.sessionId,
        documentId: connection.documentId,
        userId: connection.userId,
        timestamp: new Date().toISOString(),
        data: {
          session,
          permissions: connection.permissions,
          serverTime: new Date().toISOString()
        }
      })

      // Send current participants
      const participantsResult = await this.presenceService.getSessionParticipants(connection.sessionId)
      if (participantsResult.success) {
        await this.sendEventToConnection(connection, {
          id: crypto.randomUUID(),
          type: 'presence-updated',
          sessionId: connection.sessionId,
          documentId: connection.documentId,
          userId: connection.userId,
          timestamp: new Date().toISOString(),
          data: {
            participants: participantsResult.data
          }
        })
      }

      // Send current cursors if permitted
      if (connection.permissions.canViewCursors) {
        const cursorsResult = await this.cursorService.getActiveCursors(
          connection.documentId,
          connection.userId
        )
        if (cursorsResult.success && cursorsResult.data.length > 0) {
          await this.sendEventToConnection(connection, {
            id: crypto.randomUUID(),
            type: 'cursor-moved',
            sessionId: connection.sessionId,
            documentId: connection.documentId,
            userId: connection.userId,
            timestamp: new Date().toISOString(),
            data: {
              cursors: cursorsResult.data
            }
          })
        }
      }

    } catch (error) {
      console.error('Failed to send initial state:', error)
    }
  }

  private checkRateLimit(connection: CollaborationConnection): boolean {
    const now = new Date()
    const timeSinceRefill = now.getTime() - connection.rateLimitBucket.lastRefill.getTime()
    
    // Refill tokens based on time elapsed
    if (timeSinceRefill >= 1000) { // 1 second
      const tokensToAdd = Math.floor(timeSinceRefill / 1000) * this.config.rateLimitOperationsPerSecond
      connection.rateLimitBucket.tokens = Math.min(
        this.config.rateLimitOperationsPerSecond,
        connection.rateLimitBucket.tokens + tokensToAdd
      )
      connection.rateLimitBucket.lastRefill = now
    }

    // Check if we have tokens available
    if (connection.rateLimitBucket.tokens > 0) {
      connection.rateLimitBucket.tokens--
      return true
    }

    return false
  }

  private setupEventHandlers(): void {
    this.webSocketService.on('message', async (data: any) => {
      const { connectionId, message } = data
      
      try {
        switch (message.type) {
          case 'operation':
            await this.handleOperationEvent(connectionId, message.data)
            break
          case 'cursor-update':
            await this.handleCursorUpdateEvent(connectionId, message.data)
            break
          case 'presence-update':
            await this.handlePresenceUpdateEvent(connectionId, message.data)
            break
          case 'comment':
            await this.handleCommentEvent(connectionId, message.data.type, message.data)
            break
          default:
            console.warn('Unknown message type:', message.type)
        }
      } catch (error) {
        console.error('Failed to handle WebSocket message:', error)
        
        // Send error response to client
        const connection = this.connections.get(connectionId)
        if (connection) {
          await this.sendEventToConnection(connection, {
            id: crypto.randomUUID(),
            type: 'session-ended', // Using available type
            sessionId: connection.sessionId,
            documentId: connection.documentId,
            userId: connection.userId,
            timestamp: new Date().toISOString(),
            data: {
              error: error.message || 'Unknown error',
              code: 'PROCESSING_ERROR'
            }
          })
        }
      }
    })

    this.webSocketService.on('connection', (data: any) => {
      const { connectionId, sessionId, userId, websocket } = data
      this.handleConnection(connectionId, sessionId, userId, websocket)
    })

    this.webSocketService.on('disconnection', (data: any) => {
      const { connectionId } = data
      this.handleDisconnection(connectionId)
    })
  }

  private startHeartbeat(): void {
    setInterval(async () => {
      const healthResult = await this.checkConnectionHealth()
      if (isFailure(healthResult)) {
        console.error('Connection health check failed:', healthResult.error)
      }
    }, this.config.heartbeatInterval)
  }

  private async checkConnectionHealth(): Promise<Result<void>> {
    const now = new Date()
    const staleConnections: string[] = []

    for (const [connectionId, connection] of this.connections) {
      const timeSinceActivity = now.getTime() - connection.lastActivity.getTime()
      
      // Check for stale connections
      if (timeSinceActivity > this.config.heartbeatInterval * 2) {
        staleConnections.push(connectionId)
      } else if (connection.websocket.readyState !== WebSocket.OPEN) {
        staleConnections.push(connectionId)
      } else {
        // Send heartbeat ping
        try {
          const heartbeatMessage: WebSocketMessage = {
            type: 'heartbeat',
            data: { timestamp: now.toISOString() }
          }
          connection.websocket.send(JSON.stringify(heartbeatMessage))
        } catch (error) {
          staleConnections.push(connectionId)
        }
      }
    }

    // Clean up stale connections
    for (const connectionId of staleConnections) {
      await this.handleDisconnection(connectionId)
    }

    // Update metrics
    this.metrics.lastUpdated = now
    
    return success(undefined)
  }

  /**
   * Get real-time collaboration metrics
   */
  getMetrics(): {
    totalConnections: number
    activeConnections: number
    operationsProcessed: number
    averageLatency: number
    errorRate: number
    lastUpdated: Date
    sessionsActive: number
    connectionsActive: number
    operationBatchesQueued: number
  } {
    return {
      ...this.metrics,
      sessionsActive: this.sessionConnections.size,
      connectionsActive: this.connections.size,
      operationBatchesQueued: this.operationBatches.size
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<Result<void>> {
    // Clear all batch timeouts
    for (const [sessionId, batch] of this.operationBatches) {
      clearTimeout(batch.timeout)
    }
    this.operationBatches.clear()

    // Disconnect all connections
    const disconnectPromises = Array.from(this.connections.keys())
      .map(connectionId => this.handleDisconnection(connectionId))

    await Promise.allSettled(disconnectPromises)

    // Clear maps
    this.connections.clear()
    this.sessionConnections.clear()
    
    return success(undefined)
  }
}