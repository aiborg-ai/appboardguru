/**
 * Document Collaboration Service
 * Enterprise-grade service for real-time collaborative document editing
 * Implements Operational Transform (OT) algorithm with vector clocks
 * Following CLAUDE.md patterns with Result pattern and dependency injection
 */

import { BaseService } from './base.service'
import { DocumentCollaborationRepository } from '../repositories/document-collaboration.repository'
import { WebSocketService } from './websocket.service'
import { CursorTrackingService } from './cursor-tracking.service'
import { PresenceService } from './presence.service'
import { Result, success, failure, wrapAsync } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type {
  DocumentCollaborationSession,
  DocumentOperation,
  CollaborativeCursor,
  DocumentPresence,
  DocumentLock,
  CollaborativeComment,
  DocumentSuggestion,
  DocumentVersion,
  DocumentBranch,
  DocumentMergeRequest,
  DocumentConflict,
  CollaborationMetrics,
  DocumentState,
  VectorClock,
  OperationalTransformContext,
  TransformFunction,
  CollaborationEvent,
  CreateCollaborationSessionRequest,
  CreateCollaborationSessionResponse,
  JoinCollaborationSessionRequest,
  JoinCollaborationSessionResponse,
  ApplyOperationRequest,
  ApplyOperationResponse,
  // Branded types
  CollaborationSessionId,
  DocumentId,
  UserId,
  OrganizationId,
  OperationId,
  CursorId,
  DocumentLockId,
  CommentThreadId,
  SuggestionId,
  DocumentVersionId,
  BranchId,
  MergeRequestId,
  ConflictId
} from '../../types/document-collaboration'
import {
  CreateCollaborationSessionRequestSchema,
  ApplyOperationRequestSchema
} from '../../types/document-collaboration'
import { TransactionCoordinator } from '../repositories/transaction-coordinator'
import { createHash } from 'crypto'

export interface DocumentCollaborationServiceConfig {
  maxParticipantsPerSession: number
  operationTimeoutMs: number
  maxTransformIterations: number
  enableOptimisticTransforms: boolean
  autoSaveInterval: number
  conflictResolutionStrategy: 'operational-transform' | 'last-writer-wins' | 'manual-resolution' | 'ai-assisted'
  performanceMonitoring: boolean
}

const DEFAULT_CONFIG: DocumentCollaborationServiceConfig = {
  maxParticipantsPerSession: 50,
  operationTimeoutMs: 5000,
  maxTransformIterations: 100,
  enableOptimisticTransforms: true,
  autoSaveInterval: 30000,
  conflictResolutionStrategy: 'operational-transform',
  performanceMonitoring: true
}

export class DocumentCollaborationService extends BaseService {
  private repository: DocumentCollaborationRepository
  private webSocketService: WebSocketService
  private cursorService: CursorTrackingService
  private presenceService: PresenceService
  private config: DocumentCollaborationServiceConfig
  private transactionCoordinator: TransactionCoordinator

  // In-memory state for active sessions
  private activeSessions = new Map<CollaborationSessionId, DocumentCollaborationSession>()
  private operationQueues = new Map<CollaborationSessionId, DocumentOperation[]>()
  private transformationContexts = new Map<DocumentId, OperationalTransformContext>()
  private performanceMetrics = new Map<CollaborationSessionId, CollaborationMetrics>()
  
  constructor(
    supabase: SupabaseClient<Database>,
    config: Partial<DocumentCollaborationServiceConfig> = {}
  ) {
    super(supabase)
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.transactionCoordinator = new TransactionCoordinator(supabase)
    this.repository = new DocumentCollaborationRepository(supabase, this.transactionCoordinator)
    this.webSocketService = new WebSocketService(supabase)
    this.cursorService = new CursorTrackingService(supabase)
    this.presenceService = new PresenceService(supabase)
    
    this.initializeTransformationMatrix()
    this.setupEventHandlers()
  }

  // ================================
  // Public API Methods
  // ================================

  /**
   * Create a new collaboration session
   */
  async createCollaborationSession(
    request: CreateCollaborationSessionRequest
  ): Promise<Result<CreateCollaborationSessionResponse>> {
    const validationResult = this.validateWithContext(
      request,
      CreateCollaborationSessionRequestSchema,
      'create_collaboration_session'
    )
    if (!validationResult.success) {
      return validationResult
    }

    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      // Check permissions
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'document',
        'collaborate',
        request.documentId,
        { organizationId: request.organizationId }
      )
      if (!permissionResult.success) {
        throw permissionResult.error
      }

      // Create session in database
      const sessionResult = await this.repository.createSession(request)
      if (!sessionResult.success) {
        throw sessionResult.error
      }

      const session = sessionResult.data

      // Initialize transformation context
      await this.initializeTransformationContext(session.documentId, session.id)

      // Store in active sessions
      this.activeSessions.set(session.id, session)

      // Initialize WebSocket room
      const websocketUrl = await this.webSocketService.createRoom(session.roomId, {
        maxParticipants: session.settings.maxParticipants,
        requireAuth: !session.settings.allowAnonymous
      })

      // Initialize presence tracking
      await this.presenceService.initializeSession(session.id, session.documentId)

      // Create access token for session
      const accessToken = await this.generateAccessToken(session.id, userResult.data.id)

      // Log activity
      await this.logActivity('create_collaboration_session', 'document', request.documentId, {
        sessionId: session.id,
        organizationId: request.organizationId
      })

      return {
        session,
        accessToken,
        websocketUrl,
        permissions: {
          canView: true,
          canEdit: true,
          canComment: true,
          canSuggest: true,
          canResolveComments: false,
          canManageVersions: false,
          canLockSections: false,
          canMerge: false,
          canApprove: false
        }
      }
    })
  }

  /**
   * Join an existing collaboration session
   */
  async joinCollaborationSession(
    sessionId: CollaborationSessionId,
    request: JoinCollaborationSessionRequest
  ): Promise<Result<JoinCollaborationSessionResponse>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      // Get session from cache or database
      let session = this.activeSessions.get(sessionId)
      if (!session) {
        const sessionResult = await this.repository.findSessionById(sessionId)
        if (!sessionResult.success) {
          throw sessionResult.error
        }
        if (!sessionResult.data) {
          throw this.handleError(new Error('Session not found'), 'join_session').then(r => r.error)
        }
        session = sessionResult.data
        this.activeSessions.set(sessionId, session)
      }

      // Check permissions
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'document',
        'view',
        session.documentId,
        { sessionId, organizationId: session.organizationId }
      )
      if (!permissionResult.success) {
        throw permissionResult.error
      }

      // Get current document state
      const stateResult = await this.getCurrentDocumentState(session.documentId)
      if (!stateResult.success) {
        throw stateResult.error
      }

      // Get current participants
      const participantsResult = await this.repository.getSessionParticipants(sessionId)
      if (!participantsResult.success) {
        throw participantsResult.error
      }

      // Update user presence
      await this.presenceService.updateUserPresence(sessionId, userResult.data.id as UserId, {
        status: 'viewing',
        permissions: request.permissions || {
          canView: true,
          canEdit: false,
          canComment: true,
          canSuggest: false,
          canResolveComments: false,
          canManageVersions: false,
          canLockSections: false,
          canMerge: false,
          canApprove: false
        }
      })

      // Create access token
      const accessToken = await this.generateAccessToken(sessionId, userResult.data.id)

      // Broadcast user joined event
      await this.broadcastCollaborationEvent(sessionId, {
        type: 'user-joined',
        userId: userResult.data.id as UserId,
        data: {
          user: userResult.data,
          joinedAt: new Date().toISOString()
        }
      })

      return {
        session,
        currentState: stateResult.data,
        participants: participantsResult.data,
        accessToken
      }
    })
  }

  /**
   * Apply a document operation with operational transform
   */
  async applyOperation(
    sessionId: CollaborationSessionId,
    request: ApplyOperationRequest
  ): Promise<Result<ApplyOperationResponse>> {
    const validationResult = this.validateWithContext(
      request,
      ApplyOperationRequestSchema,
      'apply_operation'
    )
    if (!validationResult.success) {
      return validationResult
    }

    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      const session = this.activeSessions.get(sessionId)
      if (!session) {
        throw this.handleError(new Error('Session not found'), 'apply_operation').then(r => r.error)
      }

      // Check edit permissions
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'document',
        'edit',
        session.documentId,
        { sessionId }
      )
      if (!permissionResult.success) {
        throw permissionResult.error
      }

      // Start performance monitoring
      const startTime = Date.now()

      // Get transformation context
      const context = this.transformationContexts.get(session.documentId)
      if (!context) {
        throw new Error('Transformation context not initialized')
      }

      // Create full operation
      const operation: DocumentOperation = {
        id: crypto.randomUUID() as OperationId,
        type: request.operation.type,
        sessionId,
        userId: userResult.data.id as UserId,
        documentId: session.documentId,
        position: request.operation.position,
        length: request.operation.length,
        content: request.operation.content,
        attributes: request.operation.attributes,
        timestamp: new Date().toISOString(),
        vectorClock: this.incrementVectorClock(context.serverState.vectorClock, userResult.data.id),
        metadata: request.operation.metadata
      }

      // Apply operational transform
      const transformResult = await this.applyOperationalTransform(operation, context)
      if (!transformResult.success) {
        throw transformResult.error
      }

      const { transformedOperation, conflicts } = transformResult.data

      // Store operation in database
      const dbResult = await this.repository.applyOperation(sessionId, transformedOperation)
      if (!dbResult.success) {
        throw dbResult.error
      }

      // Update transformation context
      await this.updateTransformationContext(session.documentId, transformedOperation)

      // Get updated document state
      const newStateResult = await this.getCurrentDocumentState(session.documentId)
      if (!newStateResult.success) {
        throw newStateResult.error
      }

      // Broadcast operation to other participants
      await this.broadcastCollaborationEvent(sessionId, {
        type: 'operation-applied',
        userId: userResult.data.id as UserId,
        data: {
          operation: transformedOperation,
          newState: newStateResult.data,
          conflicts
        }
      })

      // Update performance metrics
      if (this.config.performanceMonitoring) {
        await this.updatePerformanceMetrics(sessionId, {
          operationLatency: Date.now() - startTime,
          conflictCount: conflicts?.length || 0,
          operationType: operation.type
        })
      }

      // Mark operation as applied
      await this.repository.markOperationApplied(dbResult.data.id)

      return {
        operationId: dbResult.data.id,
        transformedOperation: transformedOperation !== operation ? transformedOperation : undefined,
        newState: newStateResult.data,
        conflicts
      }
    })
  }

  /**
   * Get collaboration session details
   */
  async getCollaborationSession(
    sessionId: CollaborationSessionId
  ): Promise<Result<DocumentCollaborationSession>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      // Check from cache first
      let session = this.activeSessions.get(sessionId)
      if (!session) {
        const sessionResult = await this.repository.findSessionById(sessionId)
        if (!sessionResult.success) {
          throw sessionResult.error
        }
        if (!sessionResult.data) {
          throw new Error('Session not found')
        }
        session = sessionResult.data
      }

      // Check permissions
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'document',
        'view',
        session.documentId,
        { sessionId, organizationId: session.organizationId }
      )
      if (!permissionResult.success) {
        throw permissionResult.error
      }

      return session
    })
  }

  /**
   * End collaboration session
   */
  async endCollaborationSession(
    sessionId: CollaborationSessionId
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        throw userResult.error
      }

      const session = this.activeSessions.get(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      // Check permissions (creator or admin)
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'document',
        'manage',
        session.documentId,
        { sessionId }
      )
      if (!permissionResult.success) {
        throw permissionResult.error
      }

      // End session in database
      const result = await this.repository.endSession(sessionId)
      if (!result.success) {
        throw result.error
      }

      // Cleanup in-memory state
      this.activeSessions.delete(sessionId)
      this.operationQueues.delete(sessionId)
      this.performanceMetrics.delete(sessionId)

      // Cleanup transformation context if no other sessions
      const hasOtherSessions = Array.from(this.activeSessions.values())
        .some(s => s.documentId === session.documentId)
      if (!hasOtherSessions) {
        this.transformationContexts.delete(session.documentId)
      }

      // Close WebSocket room
      await this.webSocketService.closeRoom(session.roomId)

      // Broadcast session ended event
      await this.broadcastCollaborationEvent(sessionId, {
        type: 'session-ended',
        userId: userResult.data.id as UserId,
        data: {
          sessionId,
          endedAt: new Date().toISOString()
        }
      })

      // Log activity
      await this.logActivity('end_collaboration_session', 'document', session.documentId, {
        sessionId
      })
    })
  }

  // ================================
  // Operational Transform Engine
  // ================================

  private transformationMatrix = new Map<string, Map<string, TransformFunction>>()

  private initializeTransformationMatrix(): void {
    // Insert vs Insert
    this.setTransformFunction('insert', 'insert', (op1, op2) => {
      if (op1.position <= op2.position) {
        return [op1, { ...op2, position: op2.position + (op1.content?.length || 0) }]
      } else {
        return [{ ...op1, position: op1.position + (op2.content?.length || 0) }, op2]
      }
    })

    // Insert vs Delete
    this.setTransformFunction('insert', 'delete', (op1, op2) => {
      if (op1.position <= op2.position) {
        return [op1, { ...op2, position: op2.position + (op1.content?.length || 0) }]
      } else if (op1.position > op2.position + (op2.length || 0)) {
        return [{ ...op1, position: op1.position - (op2.length || 0) }, op2]
      } else {
        return [{ ...op1, position: op2.position }, op2]
      }
    })

    // Delete vs Insert
    this.setTransformFunction('delete', 'insert', (op1, op2) => {
      if (op2.position <= op1.position) {
        return [{ ...op1, position: op1.position + (op2.content?.length || 0) }, op2]
      } else if (op2.position > op1.position + (op1.length || 0)) {
        return [op1, { ...op2, position: op2.position - (op1.length || 0) }]
      } else {
        return [{ ...op1, length: (op1.length || 0) + (op2.content?.length || 0) }, { ...op2, position: op1.position }]
      }
    })

    // Delete vs Delete
    this.setTransformFunction('delete', 'delete', (op1, op2) => {
      if (op1.position + (op1.length || 0) <= op2.position) {
        return [op1, { ...op2, position: op2.position - (op1.length || 0) }]
      } else if (op2.position + (op2.length || 0) <= op1.position) {
        return [{ ...op1, position: op1.position - (op2.length || 0) }, op2]
      } else {
        // Overlapping deletes - complex case
        const start1 = op1.position
        const end1 = op1.position + (op1.length || 0)
        const start2 = op2.position
        const end2 = op2.position + (op2.length || 0)
        
        const newStart = Math.min(start1, start2)
        const newEnd = Math.max(end1, end2)
        const newLength = newEnd - newStart
        
        return [
          { ...op1, position: newStart, length: newLength },
          { ...op2, position: newStart, length: 0 } // Second operation becomes no-op
        ]
      }
    })

    // Retain operations (for formatting)
    this.setTransformFunction('retain', 'retain', (op1, op2) => [op1, op2])
    this.setTransformFunction('retain', 'insert', (op1, op2) => [op1, op2])
    this.setTransformFunction('retain', 'delete', (op1, op2) => [op1, op2])
    this.setTransformFunction('insert', 'retain', (op1, op2) => [op1, op2])
    this.setTransformFunction('delete', 'retain', (op1, op2) => [op1, op2])

    // Format operations
    this.setTransformFunction('format', 'format', (op1, op2) => [op1, op2])
    this.setTransformFunction('format', 'insert', (op1, op2) => [op1, op2])
    this.setTransformFunction('format', 'delete', (op1, op2) => [op1, op2])
    this.setTransformFunction('insert', 'format', (op1, op2) => [op1, op2])
    this.setTransformFunction('delete', 'format', (op1, op2) => [op1, op2])

    // Attribute operations
    this.setTransformFunction('attribute', 'attribute', (op1, op2) => [op1, op2])
    this.setTransformFunction('attribute', 'insert', (op1, op2) => [op1, op2])
    this.setTransformFunction('attribute', 'delete', (op1, op2) => [op1, op2])
    this.setTransformFunction('insert', 'attribute', (op1, op2) => [op1, op2])
    this.setTransformFunction('delete', 'attribute', (op1, op2) => [op1, op2])
  }

  private setTransformFunction(
    op1Type: string,
    op2Type: string,
    transformFn: TransformFunction
  ): void {
    if (!this.transformationMatrix.has(op1Type)) {
      this.transformationMatrix.set(op1Type, new Map())
    }
    this.transformationMatrix.get(op1Type)!.set(op2Type, transformFn)
  }

  private async applyOperationalTransform(
    operation: DocumentOperation,
    context: OperationalTransformContext
  ): Promise<Result<{ transformedOperation: DocumentOperation, conflicts?: DocumentConflict[] }>> {
    return wrapAsync(async () => {
      let transformedOp = operation
      const conflicts: DocumentConflict[] = []
      let iterations = 0

      // Get pending operations that need transformation
      const pendingOps = context.pendingOperations.filter(op => 
        this.needsTransformation(operation, op)
      )

      for (const pendingOp of pendingOps) {
        if (iterations++ > this.config.maxTransformIterations) {
          throw new Error('Maximum transformation iterations exceeded')
        }

        const transformFn = this.getTransformFunction(transformedOp.type, pendingOp.type)
        if (!transformFn) {
          throw new Error(`No transform function for ${transformedOp.type} vs ${pendingOp.type}`)
        }

        const [newTransformedOp, newPendingOp] = transformFn(transformedOp, pendingOp)
        
        // Check for conflicts
        if (this.detectConflict(operation, transformedOp, newTransformedOp)) {
          conflicts.push(await this.createConflictRecord(operation, pendingOp, context))
        }

        transformedOp = newTransformedOp
        
        // Update pending operation in context
        const pendingIndex = context.pendingOperations.findIndex(op => op.id === pendingOp.id)
        if (pendingIndex >= 0) {
          context.pendingOperations[pendingIndex] = newPendingOp
        }
      }

      return { transformedOperation: transformedOp, conflicts: conflicts.length > 0 ? conflicts : undefined }
    })
  }

  private needsTransformation(op1: DocumentOperation, op2: DocumentOperation): boolean {
    // Operations need transformation if they're concurrent (not causally ordered)
    return !this.isCausallyOrdered(op1.vectorClock, op2.vectorClock)
  }

  private isCausallyOrdered(clock1: VectorClock, clock2: VectorClock): boolean {
    const users = new Set([...Object.keys(clock1), ...Object.keys(clock2)])
    
    for (const user of users) {
      const c1 = clock1[user] || 0
      const c2 = clock2[user] || 0
      if (c1 > c2) return false
    }
    
    return true
  }

  private getTransformFunction(op1Type: string, op2Type: string): TransformFunction | null {
    return this.transformationMatrix.get(op1Type)?.get(op2Type) || null
  }

  private detectConflict(
    originalOp: DocumentOperation,
    initialTransform: DocumentOperation,
    finalTransform: DocumentOperation
  ): boolean {
    // Detect significant changes that might be conflicts
    return (
      originalOp.position !== finalTransform.position ||
      originalOp.content !== finalTransform.content ||
      originalOp.length !== finalTransform.length
    )
  }

  private async createConflictRecord(
    op1: DocumentOperation,
    op2: DocumentOperation,
    context: OperationalTransformContext
  ): Promise<DocumentConflict> {
    const conflict: DocumentConflict = {
      id: crypto.randomUUID() as ConflictId,
      documentId: op1.documentId,
      type: 'content',
      position: {
        line: Math.floor(op1.position / 80), // Estimate line number
        column: op1.position % 80,
        offset: op1.position
      },
      sourceContent: op1.content || '',
      targetContent: op2.content || '',
      status: 'unresolved',
      metadata: {
        confidence: 0.8,
        aiAssisted: false,
        resolutionStrategy: this.config.conflictResolutionStrategy,
        impactScore: this.calculateConflictImpact(op1, op2)
      }
    }

    return conflict
  }

  private calculateConflictImpact(op1: DocumentOperation, op2: DocumentOperation): number {
    // Calculate impact score based on operation size and type
    const op1Impact = (op1.content?.length || op1.length || 1) * this.getOperationWeight(op1.type)
    const op2Impact = (op2.content?.length || op2.length || 1) * this.getOperationWeight(op2.type)
    return Math.min(100, Math.max(1, (op1Impact + op2Impact) / 2))
  }

  private getOperationWeight(opType: string): number {
    switch (opType) {
      case 'delete': return 3
      case 'insert': return 2
      case 'format': return 1
      case 'retain': return 0.5
      case 'attribute': return 0.8
      default: return 1
    }
  }

  // ================================
  // Helper Methods
  // ================================

  private async initializeTransformationContext(
    documentId: DocumentId,
    sessionId: CollaborationSessionId
  ): Promise<void> {
    const stateResult = await this.getCurrentDocumentState(documentId)
    if (!stateResult.success) {
      throw stateResult.error
    }

    const context: OperationalTransformContext = {
      serverState: stateResult.data,
      clientStates: new Map(),
      pendingOperations: [],
      acknowledgedOperations: new Set(),
      transformationMatrix: this.transformationMatrix,
      conflictResolutionStrategy: this.config.conflictResolutionStrategy
    }

    this.transformationContexts.set(documentId, context)
    this.operationQueues.set(sessionId, [])
  }

  private async getCurrentDocumentState(documentId: DocumentId): Promise<Result<DocumentState>> {
    return wrapAsync(async () => {
      // Get latest operations for the document
      const opsResult = await this.repository.getOperationHistory(documentId, {
        limit: 1000,
        sortBy: 'created_at',
        sortOrder: 'desc'
      })
      
      if (!opsResult.success) {
        throw opsResult.error
      }

      // Build current state from operations
      let content = ''
      const vectorClock: VectorClock = {}
      const operationHistory: OperationId[] = []

      // Apply operations in chronological order
      const sortedOps = opsResult.data.items.reverse()
      for (const op of sortedOps) {
        content = this.applyOperationToContent(content, op)
        vectorClock[op.userId] = Math.max(vectorClock[op.userId] || 0, parseInt(op.vectorClock[op.userId]?.toString() || '0'))
        operationHistory.push(op.id)
      }

      return {
        content,
        vectorClock,
        operationHistory,
        lastSyncedOperation: operationHistory[operationHistory.length - 1] || ('' as OperationId),
        checksum: createHash('md5').update(content).digest('hex')
      }
    })
  }

  private applyOperationToContent(content: string, operation: DocumentOperation): string {
    switch (operation.type) {
      case 'insert':
        return content.slice(0, operation.position) + 
               (operation.content || '') + 
               content.slice(operation.position)
      
      case 'delete':
        return content.slice(0, operation.position) + 
               content.slice(operation.position + (operation.length || 0))
      
      case 'retain':
      case 'format':
      case 'attribute':
        return content // These don't modify content
      
      default:
        return content
    }
  }

  private async updateTransformationContext(
    documentId: DocumentId,
    operation: DocumentOperation
  ): Promise<void> {
    const context = this.transformationContexts.get(documentId)
    if (!context) return

    // Update server state
    context.serverState.content = this.applyOperationToContent(
      context.serverState.content,
      operation
    )
    
    // Update vector clock
    context.serverState.vectorClock = this.incrementVectorClock(
      context.serverState.vectorClock,
      operation.userId
    )
    
    // Add to operation history
    context.serverState.operationHistory.push(operation.id)
    context.serverState.lastSyncedOperation = operation.id
    
    // Update checksum
    context.serverState.checksum = createHash('md5')
      .update(context.serverState.content)
      .digest('hex')

    // Add to pending operations for other clients
    context.pendingOperations.push(operation)
    
    // Clean up old acknowledged operations
    if (context.pendingOperations.length > 1000) {
      context.pendingOperations = context.pendingOperations.slice(-500)
    }
  }

  private incrementVectorClock(clock: VectorClock, userId: string): VectorClock {
    return {
      ...clock,
      [userId]: (clock[userId] || 0) + 1
    }
  }

  private async generateAccessToken(sessionId: CollaborationSessionId, userId: string): string {
    // In a real implementation, this would use JWT or similar
    const payload = {
      sessionId,
      userId,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }
    
    return Buffer.from(JSON.stringify(payload)).toString('base64')
  }

  private async broadcastCollaborationEvent(
    sessionId: CollaborationSessionId,
    event: Omit<CollaborationEvent, 'id' | 'timestamp' | 'sessionId' | 'documentId'>
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    const fullEvent: CollaborationEvent = {
      id: crypto.randomUUID(),
      type: event.type,
      sessionId,
      documentId: session.documentId,
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

    await this.webSocketService.broadcastToRoom(session.roomId, fullEvent)
  }

  private async updatePerformanceMetrics(
    sessionId: CollaborationSessionId,
    update: {
      operationLatency?: number
      conflictCount?: number
      operationType?: string
    }
  ): Promise<void> {
    let metrics = this.performanceMetrics.get(sessionId)
    if (!metrics) {
      const session = this.activeSessions.get(sessionId)
      if (!session) return

      metrics = {
        sessionId,
        documentId: session.documentId,
        participants: { total: 0, active: 0, peak: 0 },
        operations: { 
          total: 0, 
          byType: { insert: 0, delete: 0, retain: 0, format: 0, attribute: 0 },
          averageLatency: 0,
          conflictRate: 0,
          transformationRate: 0
        },
        engagement: {
          averageSessionTime: 0,
          operationsPerMinute: 0,
          commentsPerSession: 0,
          suggestionsAcceptanceRate: 0
        },
        performance: {
          averageResponseTime: 0,
          operationThroughput: 0,
          memoryUsage: 0,
          networkBandwidth: 0
        },
        quality: {
          errorRate: 0,
          rollbackRate: 0,
          conflictResolutionTime: 0,
          userSatisfactionScore: 0
        }
      }
      this.performanceMetrics.set(sessionId, metrics)
    }

    // Update metrics
    if (update.operationLatency !== undefined) {
      metrics.performance.averageResponseTime = 
        (metrics.performance.averageResponseTime + update.operationLatency) / 2
    }

    if (update.conflictCount !== undefined) {
      metrics.operations.conflictRate = 
        ((metrics.operations.conflictRate * metrics.operations.total) + update.conflictCount) / 
        (metrics.operations.total + 1)
    }

    if (update.operationType) {
      metrics.operations.total++
      metrics.operations.byType[update.operationType as keyof typeof metrics.operations.byType]++
    }
  }

  private setupEventHandlers(): void {
    // Set up WebSocket event handlers
    this.webSocketService.on('connection', (data) => {
      this.handleUserConnection(data)
    })

    this.webSocketService.on('disconnection', (data) => {
      this.handleUserDisconnection(data)
    })

    this.webSocketService.on('cursor-update', (data) => {
      this.handleCursorUpdate(data)
    })

    this.webSocketService.on('operation-request', (data) => {
      this.handleOperationRequest(data)
    })
  }

  private async handleUserConnection(data: any): Promise<void> {
    // Handle user connecting to collaboration session
    console.log('User connected to collaboration:', data)
  }

  private async handleUserDisconnection(data: any): Promise<void> {
    // Handle user disconnecting from collaboration session
    console.log('User disconnected from collaboration:', data)
  }

  private async handleCursorUpdate(data: any): Promise<void> {
    // Handle cursor position updates
    console.log('Cursor update:', data)
  }

  private async handleOperationRequest(data: any): Promise<void> {
    // Handle incoming operation requests
    console.log('Operation request:', data)
  }
}