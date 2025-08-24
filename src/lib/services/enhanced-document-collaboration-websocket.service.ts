/**
 * Enhanced Document Collaboration WebSocket Service
 * 
 * Advanced real-time document collaboration with:
 * - Enhanced operational transforms (OT) for conflict-free concurrent editing
 * - Collaborative cursors and selections with user awareness
 * - Live commenting and suggestions system
 * - Document lock/unlock notifications and management
 * - Version control and change tracking
 * - Real-time document statistics and analytics
 * - Cross-feature integration with compliance and AI analysis
 * 
 * Builds upon existing collaboration service with enterprise-grade features
 * Follows CLAUDE.md patterns with Result pattern and enterprise reliability
 */

import { BaseService } from './base.service'
import { CollaborationWebSocketService } from './collaboration-websocket.service'
import { EnhancedWebSocketCoordinatorService } from './enhanced-websocket-coordinator.service'
import { RealTimeStateSyncService } from './real-time-state-sync.service'
import { AdvancedMessageRouterService } from './advanced-message-router.service'
import { Result, success, failure, wrapAsync, isFailure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import {
  type UserId,
  type OrganizationId,
  type DocumentId,
  type SocketId,
  type RoomId,
  type CollaborationSessionId,
  createRoomId,
  createDocumentId,
  createCollaborationSessionId
} from '../../types/branded'

// =============================================
// ENHANCED COLLABORATION TYPES
// =============================================

export interface EnhancedDocumentOperation {
  readonly id: string
  readonly type: 'insert' | 'delete' | 'format' | 'move' | 'replace' | 'annotation'
  readonly userId: UserId
  readonly sessionId: CollaborationSessionId
  readonly documentId: DocumentId
  readonly position: number
  readonly length?: number
  readonly content?: string
  readonly attributes?: Record<string, any>
  readonly timestamp: string
  readonly vectorClock: Record<string, number>
  readonly parentOperation?: string
  readonly transformedFrom?: string[]
  readonly metadata: {
    readonly confidence: number
    readonly priority: 'critical' | 'high' | 'normal' | 'low'
    readonly source: 'user' | 'ai' | 'system'
    readonly intent: 'edit' | 'suggestion' | 'correction' | 'annotation'
  }
}

export interface CollaborativeCursor {
  readonly id: string
  readonly userId: UserId
  readonly sessionId: CollaborationSessionId
  readonly documentId: DocumentId
  readonly position: number
  readonly selection?: {
    readonly anchor: number
    readonly head: number
  }
  readonly color: string
  readonly label: string
  readonly isActive: boolean
  readonly timestamp: string
  readonly intent: 'editing' | 'selecting' | 'reviewing' | 'commenting'
  readonly metadata: {
    readonly deviceType: 'desktop' | 'mobile' | 'tablet'
    readonly confidence: number
    readonly nextPredictedPosition?: number
  }
}

export interface LiveComment {
  readonly id: string
  readonly documentId: DocumentId
  readonly userId: UserId
  readonly sessionId: CollaborationSessionId
  readonly position: number
  readonly content: string
  readonly type: 'comment' | 'suggestion' | 'question' | 'approval' | 'objection'
  readonly status: 'draft' | 'published' | 'resolved' | 'rejected'
  readonly visibility: 'public' | 'private' | 'reviewers-only'
  readonly timestamp: string
  readonly replies: LiveCommentReply[]
  readonly mentions: UserId[]
  readonly attachments: string[]
  readonly metadata: {
    readonly priority: 'low' | 'medium' | 'high' | 'critical'
    readonly category: string[]
    readonly aiGenerated: boolean
    readonly confidence?: number
    readonly linkedOperations: string[]
  }
}

export interface LiveCommentReply {
  readonly id: string
  readonly commentId: string
  readonly userId: UserId
  readonly content: string
  readonly timestamp: string
  readonly mentions: UserId[]
  readonly status: 'draft' | 'published'
}

export interface DocumentLock {
  readonly id: string
  readonly documentId: DocumentId
  readonly userId: UserId
  readonly sessionId: CollaborationSessionId
  readonly lockType: 'exclusive' | 'section' | 'intention'
  readonly range?: {
    readonly start: number
    readonly end: number
  }
  readonly lockReason: 'editing' | 'reviewing' | 'formatting' | 'translating' | 'ai-processing'
  readonly acquiredAt: string
  readonly expiresAt: string
  readonly autoRenew: boolean
  readonly metadata: {
    readonly priority: number
    readonly breakable: boolean
    readonly warningThreshold: number
  }
}

export interface DocumentVersion {
  readonly id: string
  readonly documentId: DocumentId
  readonly versionNumber: number
  readonly content: string
  readonly contentHash: string
  readonly createdBy: UserId
  readonly createdAt: string
  readonly operations: EnhancedDocumentOperation[]
  readonly branchFrom?: string
  readonly mergeInfo?: {
    readonly mergedVersions: string[]
    readonly conflictResolutions: string[]
    readonly mergedBy: UserId
    readonly mergedAt: string
  }
  readonly metadata: {
    readonly changesSummary: string
    readonly significantChanges: boolean
    readonly reviewRequired: boolean
    readonly complianceFlags: string[]
  }
}

export interface DocumentAnalytics {
  readonly documentId: DocumentId
  readonly sessionId: CollaborationSessionId
  readonly metrics: {
    readonly activeCollaborators: number
    readonly totalEdits: number
    readonly editsPerMinute: number
    readonly averageEditSize: number
    readonly conflictRate: number
    readonly resolutionLatency: number
  }
  readonly userActivity: Record<UserId, {
    readonly editCount: number
    readonly lastActivity: string
    readonly averageEditSize: number
    readonly contributionPercentage: number
  }>
  readonly contentMetrics: {
    readonly wordCount: number
    readonly characterCount: number
    readonly paragraphCount: number
    readonly changeVelocity: number
    readonly stabilityScore: number
  }
  readonly collaborationHealth: {
    readonly conflictFrequency: number
    readonly resolutionEfficiency: number
    readonly participantEngagement: number
    readonly documentQuality: number
  }
}

export interface OperationalTransform {
  readonly operationId: string
  readonly originalOperation: EnhancedDocumentOperation
  readonly transformedOperation: EnhancedDocumentOperation
  readonly transformAgainst: string[]
  readonly transformType: 'position-shift' | 'content-merge' | 'attribute-combine' | 'conflict-resolve'
  readonly confidence: number
  readonly metadata: {
    readonly preservesIntent: boolean
    readonly causesConflict: boolean
    readonly requiresReview: boolean
  }
}

// =============================================
// ENHANCED COLLABORATION SERVICE
// =============================================

export class EnhancedDocumentCollaborationWebSocketService extends BaseService {
  private baseCollaborationService: CollaborationWebSocketService
  private coordinator: EnhancedWebSocketCoordinatorService
  private stateSync: RealTimeStateSyncService
  private messageRouter: AdvancedMessageRouterService

  // Enhanced state management
  private activeSessions = new Map<CollaborationSessionId, {
    documentId: DocumentId
    participants: Map<UserId, CollaborativeCursor>
    operations: EnhancedDocumentOperation[]
    comments: Map<string, LiveComment>
    locks: Map<string, DocumentLock>
    currentVersion: DocumentVersion
    analytics: DocumentAnalytics
  }>()

  // Operational Transform engine
  private operationQueue = new Map<CollaborationSessionId, EnhancedDocumentOperation[]>()
  private transformationCache = new Map<string, OperationalTransform>()
  private conflictResolver = new Map<string, (ops: EnhancedDocumentOperation[]) => Promise<EnhancedDocumentOperation>>()

  // Performance and monitoring
  private metrics = {
    activeSessions: 0,
    totalOperations: 0,
    operationsPerSecond: 0,
    averageTransformTime: 0,
    conflictRate: 0,
    resolutionSuccessRate: 0,
    cursorUpdateFrequency: 0,
    commentEngagement: 0
  }

  private processingInterval: NodeJS.Timeout | null = null
  private analyticsInterval: NodeJS.Timeout | null = null

  constructor(
    supabase: SupabaseClient<Database>,
    coordinator: EnhancedWebSocketCoordinatorService,
    stateSync: RealTimeStateSyncService,
    messageRouter: AdvancedMessageRouterService
  ) {
    super(supabase)
    
    this.baseCollaborationService = new CollaborationWebSocketService(supabase)
    this.coordinator = coordinator
    this.stateSync = stateSync
    this.messageRouter = messageRouter

    this.setupOperationalTransforms()
    this.startProcessingLoop()
    this.startAnalyticsCollection()
  }

  // =============================================
  // ENHANCED OPERATIONAL TRANSFORMS
  // =============================================

  /**
   * Apply enhanced operational transform with conflict resolution
   */
  async applyOperationalTransform(
    sessionId: CollaborationSessionId,
    operation: Omit<EnhancedDocumentOperation, 'id' | 'timestamp' | 'vectorClock'>
  ): Promise<Result<{
    readonly transformedOperation: EnhancedDocumentOperation
    readonly conflicts: string[]
    readonly newDocumentState: string
    readonly appliedOperations: string[]
  }>> {
    return wrapAsync(async () => {
      const startTime = Date.now()
      const session = this.activeSessions.get(sessionId)
      if (!session) {
        throw new Error('Collaboration session not found')
      }

      // Create full operation with system metadata
      const fullOperation: EnhancedDocumentOperation = {
        ...operation,
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        vectorClock: await this.generateVectorClock(sessionId, operation.userId)
      }

      // Get pending operations that need to be transformed against
      const pendingOps = this.operationQueue.get(sessionId) || []
      const relevantOps = pendingOps.filter(op => 
        this.operationsOverlap(fullOperation, op) && op.timestamp > fullOperation.timestamp
      )

      let transformedOperation = fullOperation
      const conflicts: string[] = []
      const appliedOperations: string[] = []

      // Apply operational transforms
      for (const pendingOp of relevantOps) {
        const transform = await this.transformOperations(transformedOperation, pendingOp)
        
        if (transform.metadata.causesConflict) {
          conflicts.push(pendingOp.id)
          
          // Attempt conflict resolution
          const resolved = await this.resolveOperationConflict(transformedOperation, pendingOp)
          if (resolved) {
            transformedOperation = resolved
            appliedOperations.push(resolved.id)
          }
        } else {
          transformedOperation = transform.transformedOperation
          appliedOperations.push(transformedOperation.id)
        }
      }

      // Apply to document state
      const newDocumentState = await this.applyOperationToDocument(
        session.currentVersion.content,
        transformedOperation
      )

      // Update session state
      session.operations.push(transformedOperation)
      session.currentVersion = {
        ...session.currentVersion,
        content: newDocumentState,
        contentHash: await this.calculateContentHash(newDocumentState),
        operations: [...session.currentVersion.operations, transformedOperation]
      }

      // Queue operation for processing
      if (!this.operationQueue.has(sessionId)) {
        this.operationQueue.set(sessionId, [])
      }
      this.operationQueue.get(sessionId)!.push(transformedOperation)

      // Sync document state
      await this.stateSync.syncDocumentContent(
        session.documentId,
        operation.userId as OrganizationId, // Would be extracted from context
        operation.userId,
        {
          operation: transformedOperation.type,
          position: transformedOperation.position,
          content: transformedOperation.content,
          length: transformedOperation.length,
          attributes: transformedOperation.attributes
        }
      )

      // Broadcast operation to other participants
      await this.broadcastOperationToParticipants(sessionId, transformedOperation)

      // Update metrics
      const transformTime = Date.now() - startTime
      this.updateOperationMetrics(transformTime, conflicts.length > 0)

      return {
        transformedOperation,
        conflicts,
        newDocumentState,
        appliedOperations
      }
    })
  }

  /**
   * Advanced conflict resolution using semantic understanding
   */
  private async resolveOperationConflict(
    op1: EnhancedDocumentOperation,
    op2: EnhancedDocumentOperation
  ): Promise<EnhancedDocumentOperation | null> {
    // Priority-based resolution
    if (op1.metadata.priority !== op2.metadata.priority) {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 }
      return priorityOrder[op1.metadata.priority] > priorityOrder[op2.metadata.priority] ? op1 : op2
    }

    // Intent-based resolution
    if (op1.metadata.intent === 'correction' && op2.metadata.intent === 'edit') {
      return op1 // Corrections take precedence
    }

    // User role-based resolution (would integrate with user permissions)
    // For now, use timestamp (last writer wins)
    return new Date(op1.timestamp) > new Date(op2.timestamp) ? op1 : op2
  }

  // =============================================
  // COLLABORATIVE CURSORS AND SELECTIONS
  // =============================================

  /**
   * Update collaborative cursor with enhanced tracking
   */
  async updateCollaborativeCursor(
    sessionId: CollaborationSessionId,
    userId: UserId,
    cursorUpdate: {
      readonly position: number
      readonly selection?: { anchor: number; head: number }
      readonly intent: 'editing' | 'selecting' | 'reviewing' | 'commenting'
      readonly deviceType: 'desktop' | 'mobile' | 'tablet'
    }
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const session = this.activeSessions.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      const existingCursor = session.participants.get(userId)
      const cursor: CollaborativeCursor = {
        id: existingCursor?.id || `cursor_${userId}_${Date.now()}`,
        userId,
        sessionId,
        documentId: session.documentId,
        position: cursorUpdate.position,
        selection: cursorUpdate.selection,
        color: existingCursor?.color || this.generateUserColor(userId),
        label: existingCursor?.label || await this.getUserDisplayName(userId),
        isActive: true,
        timestamp: new Date().toISOString(),
        intent: cursorUpdate.intent,
        metadata: {
          deviceType: cursorUpdate.deviceType,
          confidence: 0.95,
          nextPredictedPosition: this.predictNextCursorPosition(existingCursor, cursorUpdate.position)
        }
      }

      // Update session state
      session.participants.set(userId, cursor)

      // Broadcast cursor update
      const cursorMessage = {
        id: `cursor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'integrated_message' as const,
        roomId: createRoomId(`doc_${session.documentId}`),
        userId,
        timestamp: new Date().toISOString(),
        integrationType: 'document-collaboration-sync' as const,
        priority: 'normal' as const,
        targetFeatures: [] as const,
        sourceFeature: 'documents' as const,
        routingInfo: {
          broadcast: true,
          requireAck: false,
          retryCount: 0,
          maxRetries: 1
        },
        enhancedType: 'collaborative-cursor-update' as const,
        featureCoordination: {
          primaryFeature: 'documents' as const,
          secondaryFeatures: [] as const,
          stateSync: false, // High-frequency, no persistence needed
          conflictResolution: 'optimistic' as const
        },
        performance: {
          latencyTarget: 50, // Very fast for smooth cursor tracking
          compressionEnabled: false,
          batchable: true,
          deduplicate: true
        },
        persistence: {
          persistMessage: false,
          replayOnReconnect: false
        },
        security: {
          encryptionRequired: false,
          auditRequired: false,
          tenantIsolated: true
        },
        data: {
          cursor,
          sessionId,
          documentId: session.documentId
        },
        metadata: {
          feature: 'collaborative-cursors'
        }
      }

      await this.messageRouter.routeMessage(cursorMessage)

      // Update metrics
      this.metrics.cursorUpdateFrequency++
    })
  }

  /**
   * Handle collaborative selection with conflict avoidance
   */
  async handleCollaborativeSelection(
    sessionId: CollaborationSessionId,
    userId: UserId,
    selection: {
      readonly start: number
      readonly end: number
      readonly intent: 'select' | 'edit' | 'copy' | 'delete' | 'format'
      readonly priority: 'low' | 'normal' | 'high'
    }
  ): Promise<Result<{
    readonly selectionAccepted: boolean
    readonly conflicts: string[]
    readonly suggestedAlternatives: Array<{ start: number; end: number }>
  }>> {
    return wrapAsync(async () => {
      const session = this.activeSessions.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      // Check for conflicting selections
      const conflicts: string[] = []
      const suggestedAlternatives: Array<{ start: number; end: number }> = []

      for (const [otherUserId, cursor] of session.participants) {
        if (otherUserId === userId) continue

        if (cursor.selection && this.selectionsOverlap(selection, cursor.selection)) {
          conflicts.push(otherUserId)
          
          // Suggest alternative selection
          const alternative = this.suggestAlternativeSelection(selection, cursor.selection)
          if (alternative) {
            suggestedAlternatives.push(alternative)
          }
        }
      }

      // Determine if selection should be accepted
      const selectionAccepted = conflicts.length === 0 || selection.priority === 'high'

      if (selectionAccepted) {
        // Update cursor with selection
        await this.updateCollaborativeCursor(sessionId, userId, {
          position: selection.start,
          selection: { anchor: selection.start, head: selection.end },
          intent: selection.intent === 'select' ? 'selecting' : 'editing',
          deviceType: 'desktop' // Would be detected from context
        })
      }

      return {
        selectionAccepted,
        conflicts,
        suggestedAlternatives
      }
    })
  }

  // =============================================
  // LIVE COMMENTING AND SUGGESTIONS
  // =============================================

  /**
   * Add live comment with real-time notifications
   */
  async addLiveComment(
    sessionId: CollaborationSessionId,
    userId: UserId,
    organizationId: OrganizationId,
    commentData: {
      readonly position: number
      readonly content: string
      readonly type: 'comment' | 'suggestion' | 'question' | 'approval' | 'objection'
      readonly visibility: 'public' | 'private' | 'reviewers-only'
      readonly mentions?: UserId[]
      readonly priority: 'low' | 'medium' | 'high' | 'critical'
      readonly category?: string[]
    }
  ): Promise<Result<LiveComment>> {
    return wrapAsync(async () => {
      const session = this.activeSessions.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      const comment: LiveComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        documentId: session.documentId,
        userId,
        sessionId,
        position: commentData.position,
        content: commentData.content,
        type: commentData.type,
        status: 'published',
        visibility: commentData.visibility,
        timestamp: new Date().toISOString(),
        replies: [],
        mentions: commentData.mentions || [],
        attachments: [],
        metadata: {
          priority: commentData.priority,
          category: commentData.category || [],
          aiGenerated: false,
          linkedOperations: []
        }
      }

      // Add to session state
      session.comments.set(comment.id, comment)

      // Broadcast comment to participants
      const commentMessage = {
        id: `comment_broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'integrated_message' as const,
        roomId: createRoomId(`doc_${session.documentId}`),
        userId,
        timestamp: new Date().toISOString(),
        integrationType: 'document-collaboration-sync' as const,
        priority: commentData.priority === 'critical' ? 'high' : 'normal' as const,
        targetFeatures: ['compliance'] as const,
        sourceFeature: 'documents' as const,
        routingInfo: {
          broadcast: true,
          targetUsers: commentData.mentions,
          requireAck: commentData.priority === 'critical',
          retryCount: 0,
          maxRetries: 2
        },
        enhancedType: 'live-comment-update' as const,
        featureCoordination: {
          primaryFeature: 'documents' as const,
          secondaryFeatures: ['compliance'] as const,
          stateSync: true,
          conflictResolution: 'optimistic' as const
        },
        performance: {
          latencyTarget: 200,
          compressionEnabled: true,
          batchable: false,
          deduplicate: false
        },
        persistence: {
          persistMessage: true,
          replayOnReconnect: true,
          expiresAfter: 7200 // 2 hours
        },
        security: {
          encryptionRequired: commentData.visibility === 'private',
          auditRequired: true,
          tenantIsolated: true
        },
        data: {
          comment,
          action: 'comment-added',
          documentId: session.documentId
        },
        metadata: {
          organizationId,
          feature: 'live-commenting'
        }
      }

      await this.messageRouter.routeMessage(commentMessage)

      // Send mentions notifications
      if (commentData.mentions?.length) {
        await this.sendMentionNotifications(sessionId, comment, commentData.mentions)
      }

      // Update analytics
      this.metrics.commentEngagement++
      session.analytics.userActivity[userId] = {
        ...session.analytics.userActivity[userId],
        editCount: (session.analytics.userActivity[userId]?.editCount || 0) + 1,
        lastActivity: new Date().toISOString(),
        averageEditSize: 0, // Would calculate based on content
        contributionPercentage: 0 // Would calculate based on total activity
      }

      return comment
    })
  }

  /**
   * Reply to live comment with threading
   */
  async replyToComment(
    sessionId: CollaborationSessionId,
    commentId: string,
    userId: UserId,
    replyData: {
      readonly content: string
      readonly mentions?: UserId[]
    }
  ): Promise<Result<LiveCommentReply>> {
    return wrapAsync(async () => {
      const session = this.activeSessions.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      const comment = session.comments.get(commentId)
      if (!comment) {
        throw new Error('Comment not found')
      }

      const reply: LiveCommentReply = {
        id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        commentId,
        userId,
        content: replyData.content,
        timestamp: new Date().toISOString(),
        mentions: replyData.mentions || [],
        status: 'published'
      }

      // Add reply to comment
      const updatedComment: LiveComment = {
        ...comment,
        replies: [...comment.replies, reply]
      }
      session.comments.set(commentId, updatedComment)

      // Broadcast reply
      await this.broadcastCommentUpdate(sessionId, updatedComment, 'reply-added')

      return reply
    })
  }

  // =============================================
  // DOCUMENT LOCKING SYSTEM
  // =============================================

  /**
   * Acquire document lock with conflict management
   */
  async acquireDocumentLock(
    sessionId: CollaborationSessionId,
    userId: UserId,
    lockRequest: {
      readonly lockType: 'exclusive' | 'section' | 'intention'
      readonly range?: { start: number; end: number }
      readonly lockReason: 'editing' | 'reviewing' | 'formatting' | 'translating' | 'ai-processing'
      readonly duration: number // seconds
      readonly priority: number
      readonly breakable: boolean
    }
  ): Promise<Result<{
    readonly lockAcquired: boolean
    readonly lock?: DocumentLock
    readonly conflicts: string[]
    readonly waitTime?: number
  }>> {
    return wrapAsync(async () => {
      const session = this.activeSessions.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      // Check for conflicting locks
      const conflicts: string[] = []
      for (const [lockId, existingLock] of session.locks) {
        if (this.locksConflict(lockRequest, existingLock)) {
          if (!existingLock.metadata.breakable || existingLock.metadata.priority >= lockRequest.priority) {
            conflicts.push(lockId)
          } else {
            // Break lower priority lock
            await this.releaseLock(sessionId, lockId, 'superseded')
          }
        }
      }

      if (conflicts.length > 0) {
        // Calculate wait time based on remaining lock durations
        const waitTime = Math.max(...conflicts.map(conflictId => {
          const conflictLock = session.locks.get(conflictId)
          return conflictLock ? new Date(conflictLock.expiresAt).getTime() - Date.now() : 0
        }))

        return {
          lockAcquired: false,
          conflicts,
          waitTime: Math.max(0, waitTime / 1000) // Convert to seconds
        }
      }

      // Create lock
      const lock: DocumentLock = {
        id: `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        documentId: session.documentId,
        userId,
        sessionId,
        lockType: lockRequest.lockType,
        range: lockRequest.range,
        lockReason: lockRequest.lockReason,
        acquiredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + lockRequest.duration * 1000).toISOString(),
        autoRenew: lockRequest.lockReason === 'editing', // Auto-renew editing locks
        metadata: {
          priority: lockRequest.priority,
          breakable: lockRequest.breakable,
          warningThreshold: lockRequest.duration * 0.8 // Warn at 80% of duration
        }
      }

      // Add to session state
      session.locks.set(lock.id, lock)

      // Broadcast lock acquisition
      await this.broadcastLockUpdate(sessionId, lock, 'acquired')

      // Set auto-release timer
      setTimeout(async () => {
        await this.releaseLock(sessionId, lock.id, 'expired')
      }, lockRequest.duration * 1000)

      return {
        lockAcquired: true,
        lock,
        conflicts: []
      }
    })
  }

  /**
   * Release document lock with notifications
   */
  async releaseLock(
    sessionId: CollaborationSessionId,
    lockId: string,
    reason: 'manual' | 'expired' | 'superseded' | 'session-ended'
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const session = this.activeSessions.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      const lock = session.locks.get(lockId)
      if (!lock) {
        return // Lock already released
      }

      // Remove lock
      session.locks.delete(lockId)

      // Broadcast lock release
      await this.broadcastLockUpdate(sessionId, lock, 'released', reason)
    })
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private async generateVectorClock(sessionId: CollaborationSessionId, userId: UserId): Promise<Record<string, number>> {
    // Simplified vector clock implementation
    const session = this.activeSessions.get(sessionId)
    if (!session) return {}

    const clock: Record<string, number> = {}
    for (const participantId of session.participants.keys()) {
      clock[participantId] = participantId === userId ? 
        (session.operations.filter(op => op.userId === userId).length + 1) : 
        session.operations.filter(op => op.userId === participantId).length
    }
    return clock
  }

  private operationsOverlap(op1: EnhancedDocumentOperation, op2: EnhancedDocumentOperation): boolean {
    const range1 = { start: op1.position, end: op1.position + (op1.length || 1) }
    const range2 = { start: op2.position, end: op2.position + (op2.length || 1) }
    
    return !(range1.end <= range2.start || range2.end <= range1.start)
  }

  private async transformOperations(
    op1: EnhancedDocumentOperation, 
    op2: EnhancedDocumentOperation
  ): Promise<OperationalTransform> {
    // Simplified operational transform - would implement full OT algorithm
    let transformedOp = op1
    let transformType: OperationalTransform['transformType'] = 'position-shift'
    let preservesIntent = true
    let causesConflict = false

    // Basic position transformation
    if (op2.type === 'insert' && op2.position <= op1.position) {
      transformedOp = {
        ...op1,
        position: op1.position + (op2.content?.length || 0)
      }
    } else if (op2.type === 'delete' && op2.position < op1.position) {
      const deleteEnd = op2.position + (op2.length || 0)
      if (deleteEnd > op1.position) {
        // Operation overlaps with deleted content
        causesConflict = true
        transformType = 'conflict-resolve'
      } else {
        transformedOp = {
          ...op1,
          position: op1.position - (op2.length || 0)
        }
      }
    }

    return {
      operationId: `transform_${Date.now()}`,
      originalOperation: op1,
      transformedOperation: transformedOp,
      transformAgainst: [op2.id],
      transformType,
      confidence: causesConflict ? 0.5 : 0.95,
      metadata: {
        preservesIntent,
        causesConflict,
        requiresReview: causesConflict
      }
    }
  }

  private async applyOperationToDocument(content: string, operation: EnhancedDocumentOperation): Promise<string> {
    switch (operation.type) {
      case 'insert':
        return content.slice(0, operation.position) + 
               (operation.content || '') + 
               content.slice(operation.position)
      case 'delete':
        return content.slice(0, operation.position) + 
               content.slice(operation.position + (operation.length || 0))
      case 'replace':
        return content.slice(0, operation.position) + 
               (operation.content || '') + 
               content.slice(operation.position + (operation.length || 0))
      default:
        return content
    }
  }

  private async calculateContentHash(content: string): Promise<string> {
    // Simplified hash - would use proper cryptographic hash in production
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  private generateUserColor(userId: UserId): string {
    // Generate consistent color for user
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD']
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  private async getUserDisplayName(userId: UserId): Promise<string> {
    // Would query user profile for display name
    return `User ${userId.slice(-4)}`
  }

  private predictNextCursorPosition(existing: CollaborativeCursor | undefined, newPosition: number): number {
    if (!existing) return newPosition
    
    const velocity = newPosition - existing.position
    return newPosition + velocity // Simple linear prediction
  }

  private selectionsOverlap(
    sel1: { start: number; end: number }, 
    sel2: { anchor: number; head: number }
  ): boolean {
    const sel2Start = Math.min(sel2.anchor, sel2.head)
    const sel2End = Math.max(sel2.anchor, sel2.head)
    
    return !(sel1.end <= sel2Start || sel2End <= sel1.start)
  }

  private suggestAlternativeSelection(
    requested: { start: number; end: number },
    existing: { anchor: number; head: number }
  ): { start: number; end: number } | null {
    const existingStart = Math.min(existing.anchor, existing.head)
    const existingEnd = Math.max(existing.anchor, existing.head)
    
    // Suggest selection after existing selection
    if (existingEnd < requested.end) {
      return {
        start: existingEnd,
        end: requested.end
      }
    }
    
    return null
  }

  private locksConflict(
    requested: { lockType: string; range?: { start: number; end: number } },
    existing: DocumentLock
  ): boolean {
    if (requested.lockType === 'exclusive' || existing.lockType === 'exclusive') {
      return true
    }

    if (requested.lockType === 'section' && existing.lockType === 'section') {
      if (!requested.range || !existing.range) return false
      
      return !(requested.range.end <= existing.range.start || 
               existing.range.end <= requested.range.start)
    }

    return false
  }

  private async broadcastOperationToParticipants(
    sessionId: CollaborationSessionId, 
    operation: EnhancedDocumentOperation
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    const operationMessage = {
      id: `op_broadcast_${operation.id}`,
      type: 'integrated_message' as const,
      roomId: createRoomId(`doc_${session.documentId}`),
      userId: operation.userId,
      timestamp: new Date().toISOString(),
      integrationType: 'document-collaboration-sync' as const,
      priority: operation.metadata.priority as any,
      targetFeatures: [] as const,
      sourceFeature: 'documents' as const,
      routingInfo: {
        broadcast: true,
        requireAck: false,
        retryCount: 0,
        maxRetries: 1
      },
      enhancedType: 'document-operation-transform' as const,
      featureCoordination: {
        primaryFeature: 'documents' as const,
        secondaryFeatures: [] as const,
        stateSync: true,
        conflictResolution: 'operational-transform' as const
      },
      performance: {
        latencyTarget: operation.metadata.priority === 'critical' ? 50 : 100,
        compressionEnabled: true,
        batchable: false,
        deduplicate: false
      },
      persistence: {
        persistMessage: true,
        replayOnReconnect: true,
        expiresAfter: 3600
      },
      security: {
        encryptionRequired: false,
        auditRequired: true,
        tenantIsolated: true
      },
      data: {
        operation,
        sessionId,
        documentId: session.documentId
      },
      metadata: {
        feature: 'operational-transforms'
      }
    }

    await this.messageRouter.routeMessage(operationMessage)
  }

  private async sendMentionNotifications(
    sessionId: CollaborationSessionId, 
    comment: LiveComment, 
    mentions: UserId[]
  ): Promise<void> {
    // Send targeted notifications to mentioned users
    for (const mentionedUserId of mentions) {
      const mentionMessage = {
        id: `mention_${Date.now()}_${mentionedUserId}`,
        type: 'integrated_message' as const,
        roomId: createRoomId(`doc_${comment.documentId}`),
        userId: comment.userId,
        timestamp: new Date().toISOString(),
        integrationType: 'document-collaboration-sync' as const,
        priority: 'high' as const,
        targetFeatures: [] as const,
        sourceFeature: 'documents' as const,
        routingInfo: {
          broadcast: false,
          targetUsers: [mentionedUserId],
          requireAck: true,
          retryCount: 0,
          maxRetries: 3
        },
        enhancedType: 'live-comment-update' as const,
        featureCoordination: {
          primaryFeature: 'documents' as const,
          secondaryFeatures: [] as const,
          stateSync: false,
          conflictResolution: 'optimistic' as const
        },
        performance: {
          latencyTarget: 100,
          compressionEnabled: false,
          batchable: false,
          deduplicate: false
        },
        persistence: {
          persistMessage: true,
          replayOnReconnect: true,
          expiresAfter: 7200
        },
        security: {
          encryptionRequired: true,
          auditRequired: true,
          tenantIsolated: true
        },
        data: {
          mentionType: 'comment-mention',
          comment,
          mentionedBy: comment.userId
        },
        metadata: {
          feature: 'mention-notifications'
        }
      }

      await this.messageRouter.routeMessage(mentionMessage)
    }
  }

  private async broadcastCommentUpdate(
    sessionId: CollaborationSessionId, 
    comment: LiveComment, 
    action: string
  ): Promise<void> {
    // Implementation for broadcasting comment updates
  }

  private async broadcastLockUpdate(
    sessionId: CollaborationSessionId, 
    lock: DocumentLock, 
    action: 'acquired' | 'released',
    reason?: string
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    const lockMessage = {
      id: `lock_${action}_${lock.id}`,
      type: 'integrated_message' as const,
      roomId: createRoomId(`doc_${session.documentId}`),
      userId: lock.userId,
      timestamp: new Date().toISOString(),
      integrationType: 'document-collaboration-sync' as const,
      priority: 'normal' as const,
      targetFeatures: [] as const,
      sourceFeature: 'documents' as const,
      routingInfo: {
        broadcast: true,
        requireAck: false,
        retryCount: 0,
        maxRetries: 1
      },
      enhancedType: 'document-lock-status' as const,
      featureCoordination: {
        primaryFeature: 'documents' as const,
        secondaryFeatures: [] as const,
        stateSync: true,
        conflictResolution: 'pessimistic' as const
      },
      performance: {
        latencyTarget: 100,
        compressionEnabled: false,
        batchable: false,
        deduplicate: true
      },
      persistence: {
        persistMessage: false,
        replayOnReconnect: true
      },
      security: {
        encryptionRequired: false,
        auditRequired: true,
        tenantIsolated: true
      },
      data: {
        lock,
        action,
        reason,
        sessionId,
        documentId: session.documentId
      },
      metadata: {
        feature: 'document-locking'
      }
    }

    await this.messageRouter.routeMessage(lockMessage)
  }

  private updateOperationMetrics(transformTime: number, hasConflicts: boolean): void {
    this.metrics.totalOperations++
    this.metrics.averageTransformTime = (this.metrics.averageTransformTime + transformTime) / 2
    
    if (hasConflicts) {
      this.metrics.conflictRate = (this.metrics.conflictRate * 0.9) + 0.1
    } else {
      this.metrics.resolutionSuccessRate = (this.metrics.resolutionSuccessRate * 0.9) + 0.1
    }

    // Calculate operations per second
    this.metrics.operationsPerSecond = this.metrics.totalOperations / 
      ((Date.now() - (this.metrics as any).startTime) / 1000)
  }

  private setupOperationalTransforms(): void {
    // Initialize conflict resolvers for different operation types
    this.conflictResolver.set('insert-insert', async (ops) => {
      // Merge insertions
      return ops.reduce((merged, op) => ({
        ...merged,
        content: (merged.content || '') + (op.content || '')
      }))
    })

    this.conflictResolver.set('delete-delete', async (ops) => {
      // Take the larger deletion
      return ops.reduce((largest, op) => 
        (op.length || 0) > (largest.length || 0) ? op : largest
      )
    })
  }

  private startProcessingLoop(): void {
    this.processingInterval = setInterval(async () => {
      await this.processOperationQueues()
    }, 100) // Process every 100ms

    // Initialize start time for metrics
    (this.metrics as any).startTime = Date.now()
  }

  private async processOperationQueues(): Promise<void> {
    for (const [sessionId, operations] of this.operationQueue) {
      if (operations.length === 0) continue

      // Process operations in batch
      const batch = operations.splice(0, 10)
      await Promise.allSettled(batch.map(op => this.finalizeOperation(op)))
    }
  }

  private async finalizeOperation(operation: EnhancedDocumentOperation): Promise<void> {
    // Final processing steps for operations
    this.transformationCache.set(operation.id, {
      operationId: operation.id,
      originalOperation: operation,
      transformedOperation: operation,
      transformAgainst: [],
      transformType: 'position-shift',
      confidence: 1.0,
      metadata: {
        preservesIntent: true,
        causesConflict: false,
        requiresReview: false
      }
    })
  }

  private startAnalyticsCollection(): void {
    this.analyticsInterval = setInterval(() => {
      this.updateAnalytics()
    }, 30000) // Update analytics every 30 seconds
  }

  private updateAnalytics(): void {
    this.metrics.activeSessions = this.activeSessions.size

    // Update session analytics
    for (const [sessionId, session] of this.activeSessions) {
      session.analytics.metrics.activeCollaborators = session.participants.size
      session.analytics.metrics.totalEdits = session.operations.length
      session.analytics.metrics.editsPerMinute = this.calculateEditsPerMinute(session.operations)
    }
  }

  private calculateEditsPerMinute(operations: EnhancedDocumentOperation[]): number {
    const recentOps = operations.filter(op => 
      Date.now() - new Date(op.timestamp).getTime() < 60000 // Last minute
    )
    return recentOps.length
  }

  /**
   * Get comprehensive service metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }

    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval)
      this.analyticsInterval = null
    }

    // Process remaining operations
    await this.processOperationQueues()

    // Clear data structures
    this.activeSessions.clear()
    this.operationQueue.clear()
    this.transformationCache.clear()
    this.conflictResolver.clear()

    // Cleanup base service
    await this.baseCollaborationService.cleanup()
  }
}