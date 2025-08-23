/**
 * Document Collaboration Repository
 * Enterprise-grade repository for real-time collaborative document editing with operational transforms
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError, wrapAsync } from './result'
import { Database } from '../../types/database'
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
  CreateCollaborationSessionRequest,
  JoinCollaborationSessionRequest,
  ApplyOperationRequest,
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
  QueryOptions,
  PaginatedResult,
  FilterCriteria
} from './types'
import { TransactionCoordinator } from './transaction-coordinator'
import { createHash } from 'crypto'

export interface DocumentCollaborationFilters extends FilterCriteria {
  sessionId?: CollaborationSessionId
  documentId?: DocumentId
  userId?: UserId
  organizationId?: OrganizationId
  isActive?: boolean
  sessionType?: 'editing' | 'review' | 'planning' | 'approval'
  conflictResolution?: 'manual' | 'auto' | 'last-writer-wins' | 'ai-assisted'
}

export interface OperationFilters extends FilterCriteria {
  sessionId?: CollaborationSessionId
  documentId?: DocumentId
  userId?: UserId
  operationType?: 'insert' | 'delete' | 'retain' | 'format' | 'attribute'
  applied?: boolean
  acknowledged?: boolean
  priority?: 'low' | 'normal' | 'high' | 'critical'
}

export interface CommentFilters extends FilterCriteria {
  documentId?: DocumentId
  sessionId?: CollaborationSessionId
  userId?: UserId
  status?: 'open' | 'resolved' | 'dismissed'
  commentType?: 'comment' | 'suggestion' | 'approval-request' | 'question'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export interface VersionFilters extends FilterCriteria {
  documentId?: DocumentId
  branchId?: BranchId
  createdBy?: UserId
  significance?: 'patch' | 'minor' | 'major'
}

export class DocumentCollaborationRepository extends BaseRepository {
  constructor(
    supabase: SupabaseClient<Database>,
    transactionCoordinator?: TransactionCoordinator
  ) {
    super(supabase, transactionCoordinator)
  }

  protected getEntityName(): string {
    return 'DocumentCollaboration'
  }

  protected getTableName(): string {
    return 'document_collaboration_sessions'
  }

  protected getSearchFields(): string[] {
    return ['document_id', 'organization_id', 'session_type']
  }

  // ================================
  // Collaboration Session Management
  // ================================

  /**
   * Create a new collaboration session
   */
  async createSession(
    request: CreateCollaborationSessionRequest
  ): Promise<Result<DocumentCollaborationSession>> {
    return wrapAsync(async () => {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) {
        throw currentUserResult.error
      }

      const sessionData = {
        document_id: request.documentId,
        organization_id: request.organizationId,
        room_id: crypto.randomUUID(),
        session_type: 'editing',
        max_participants: request.settings?.maxParticipants || 10,
        allow_anonymous: request.settings?.allowAnonymous || false,
        require_approval: request.settings?.requireApproval || false,
        auto_save: request.settings?.autoSave ?? true,
        auto_save_interval: request.settings?.autoSaveInterval || 30000,
        conflict_resolution: request.settings?.conflictResolution || 'manual',
        created_by: currentUserResult.data,
        is_active: true
      }

      const { data, error } = await this.supabase
        .from('document_collaboration_sessions')
        .insert(sessionData)
        .select(`
          *,
          document:assets(*),
          organization:organizations(*),
          creator:users(*)
        `)
        .single()

      if (error) {
        throw RepositoryError.database('Failed to create collaboration session', error, 'insert')
      }

      return this.mapToCollaborationSession(data)
    })
  }

  /**
   * Get collaboration session by ID
   */
  async findSessionById(
    sessionId: CollaborationSessionId
  ): Promise<Result<DocumentCollaborationSession | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('document_collaboration_sessions')
        .select(`
          *,
          document:assets(*),
          organization:organizations(*),
          creator:users(*),
          participants:document_presence(
            *,
            user:users(*),
            cursor:document_cursors(*)
          )
        `)
        .eq('id', sessionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw RepositoryError.database('Failed to fetch collaboration session', error, 'select')
      }

      return this.mapToCollaborationSession(data)
    })
  }

  /**
   * Find active sessions for a document
   */
  async findActiveSessionsForDocument(
    documentId: DocumentId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<DocumentCollaborationSession>>> {
    return wrapAsync(async () => {
      const query = this.supabase
        .from('document_collaboration_sessions')
        .select(`
          *,
          document:assets(*),
          organization:organizations(*),
          creator:users(*),
          participants:document_presence(
            *,
            user:users(*),
            cursor:document_cursors(*)
          )
        `, { count: 'exact' })
        .eq('document_id', documentId)
        .eq('is_active', true)

      const modifiedQuery = this.applyQueryOptions(query, options)
      const { data, error, count } = await modifiedQuery

      if (error) {
        throw RepositoryError.database('Failed to fetch active sessions', error, 'select')
      }

      const sessions = (data || []).map(d => this.mapToCollaborationSession(d))
      return this.createPaginatedResult(sessions, count, options).data!
    })
  }

  /**
   * Update session activity timestamp
   */
  async updateSessionActivity(
    sessionId: CollaborationSessionId
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const { error } = await this.supabase
        .from('document_collaboration_sessions')
        .update({
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        throw RepositoryError.database('Failed to update session activity', error, 'update')
      }
    })
  }

  /**
   * End collaboration session
   */
  async endSession(
    sessionId: CollaborationSessionId
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const { error } = await this.supabase
        .from('document_collaboration_sessions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        throw RepositoryError.database('Failed to end collaboration session', error, 'update')
      }
    })
  }

  // ================================
  // Document Operations (OT Engine)
  // ================================

  /**
   * Apply a document operation
   */
  async applyOperation(
    sessionId: CollaborationSessionId,
    operation: Omit<DocumentOperation, 'id' | 'timestamp' | 'vectorClock'>
  ): Promise<Result<DocumentOperation>> {
    return wrapAsync(async () => {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) {
        throw currentUserResult.error
      }

      // Get current vector clock for the session
      const currentVectorClock = await this.getCurrentVectorClock(sessionId)
      if (!currentVectorClock.success) {
        throw currentVectorClock.error
      }

      // Increment user's clock
      const newVectorClock = { ...currentVectorClock.data }
      newVectorClock[operation.userId] = (newVectorClock[operation.userId] || 0) + 1

      const operationData = {
        session_id: sessionId,
        document_id: operation.documentId,
        user_id: operation.userId,
        operation_type: operation.type,
        position: operation.position,
        length: operation.length,
        content: operation.content,
        attributes: operation.attributes || {},
        vector_clock: newVectorClock,
        priority: operation.metadata?.priority || 'normal',
        source: operation.metadata?.source || 'user',
        device_type: operation.metadata?.deviceType,
        client_version: operation.metadata?.clientVersion,
        applied: false,
        acknowledged: false
      }

      const { data, error } = await this.supabase
        .from('document_operations')
        .insert(operationData)
        .select('*')
        .single()

      if (error) {
        throw RepositoryError.database('Failed to apply operation', error, 'insert')
      }

      // Update session activity
      await this.updateSessionActivity(sessionId)

      return this.mapToDocumentOperation(data)
    })
  }

  /**
   * Get pending operations for transformation
   */
  async getPendingOperations(
    sessionId: CollaborationSessionId,
    fromVectorClock?: VectorClock
  ): Promise<Result<DocumentOperation[]>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('document_operations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('applied', false)
        .order('created_at', { ascending: true })

      // If vector clock provided, filter operations newer than it
      if (fromVectorClock) {
        // This would require more complex filtering based on vector clock comparison
        // For now, we'll get all pending operations
      }

      const { data, error } = await query

      if (error) {
        throw RepositoryError.database('Failed to fetch pending operations', error, 'select')
      }

      return (data || []).map(d => this.mapToDocumentOperation(d))
    })
  }

  /**
   * Mark operation as applied
   */
  async markOperationApplied(
    operationId: OperationId
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const { error } = await this.supabase
        .from('document_operations')
        .update({
          applied: true,
          applied_at: new Date().toISOString()
        })
        .eq('id', operationId)

      if (error) {
        throw RepositoryError.database('Failed to mark operation as applied', error, 'update')
      }
    })
  }

  /**
   * Get operation history for a document
   */
  async getOperationHistory(
    documentId: DocumentId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<DocumentOperation>>> {
    return wrapAsync(async () => {
      const query = this.supabase
        .from('document_operations')
        .select('*, user:users(*)', { count: 'exact' })
        .eq('document_id', documentId)
        .eq('applied', true)
        .order('created_at', { ascending: false })

      const modifiedQuery = this.applyQueryOptions(query, options)
      const { data, error, count } = await modifiedQuery

      if (error) {
        throw RepositoryError.database('Failed to fetch operation history', error, 'select')
      }

      const operations = (data || []).map(d => this.mapToDocumentOperation(d))
      return this.createPaginatedResult(operations, count, options).data!
    })
  }

  // ================================
  // Cursor & Presence Management
  // ================================

  /**
   * Update cursor position
   */
  async updateCursor(
    cursor: Omit<CollaborativeCursor, 'id' | 'lastActivity'>
  ): Promise<Result<CollaborativeCursor>> {
    return wrapAsync(async () => {
      const cursorData = {
        user_id: cursor.userId,
        session_id: cursor.sessionId,
        document_id: cursor.documentId,
        position_line: cursor.position.line,
        position_column: cursor.position.column,
        position_offset: cursor.position.offset,
        has_selection: !!cursor.selection,
        selection_start_line: cursor.selection?.start.line,
        selection_start_column: cursor.selection?.start.column,
        selection_end_line: cursor.selection?.end.line,
        selection_end_column: cursor.selection?.end.column,
        selection_direction: cursor.selection?.direction,
        cursor_color: cursor.color,
        cursor_label: cursor.label,
        is_active: cursor.isActive,
        viewport_top: cursor.metadata?.viewport?.top,
        viewport_bottom: cursor.metadata?.viewport?.bottom,
        device_type: cursor.metadata?.deviceType,
        last_activity: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('document_cursors')
        .upsert(cursorData, {
          onConflict: 'user_id,document_id,session_id'
        })
        .select('*')
        .single()

      if (error) {
        throw RepositoryError.database('Failed to update cursor', error, 'upsert')
      }

      return this.mapToCollaborativeCursor(data)
    })
  }

  /**
   * Get active cursors for a document
   */
  async getActiveCursors(
    documentId: DocumentId,
    excludeUserId?: UserId
  ): Promise<Result<CollaborativeCursor[]>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('document_cursors')
        .select('*, user:users(*)')
        .eq('document_id', documentId)
        .eq('is_active', true)

      if (excludeUserId) {
        query = query.neq('user_id', excludeUserId)
      }

      const { data, error } = await query

      if (error) {
        throw RepositoryError.database('Failed to fetch active cursors', error, 'select')
      }

      return (data || []).map(d => this.mapToCollaborativeCursor(d))
    })
  }

  /**
   * Update user presence
   */
  async updatePresence(
    presence: Omit<DocumentPresence, 'joinedAt' | 'lastActivity'>
  ): Promise<Result<DocumentPresence>> {
    return wrapAsync(async () => {
      const presenceData = {
        user_id: presence.userId,
        session_id: presence.sessionId,
        document_id: presence.documentId,
        status: presence.status,
        cursor_id: presence.cursor?.id,
        can_view: presence.permissions.canView,
        can_edit: presence.permissions.canEdit,
        can_comment: presence.permissions.canComment,
        can_suggest: presence.permissions.canSuggest,
        can_resolve_comments: presence.permissions.canResolveComments,
        can_manage_versions: presence.permissions.canManageVersions,
        can_lock_sections: presence.permissions.canLockSections,
        can_merge: presence.permissions.canMerge,
        can_approve: presence.permissions.canApprove,
        permissions_expire_at: presence.permissions.expiresAt,
        username: presence.metadata?.username || '',
        avatar_url: presence.metadata?.avatar,
        user_role: presence.metadata?.role,
        timezone: presence.metadata?.timezone,
        last_activity: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('document_presence')
        .upsert(presenceData, {
          onConflict: 'user_id,session_id'
        })
        .select('*')
        .single()

      if (error) {
        throw RepositoryError.database('Failed to update presence', error, 'upsert')
      }

      return this.mapToDocumentPresence(data)
    })
  }

  /**
   * Get session participants
   */
  async getSessionParticipants(
    sessionId: CollaborationSessionId
  ): Promise<Result<DocumentPresence[]>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('document_presence')
        .select(`
          *,
          user:users(*),
          cursor:document_cursors(*)
        `)
        .eq('session_id', sessionId)
        .is('left_at', null)

      if (error) {
        throw RepositoryError.database('Failed to fetch session participants', error, 'select')
      }

      return (data || []).map(d => this.mapToDocumentPresence(d))
    })
  }

  // ================================
  // Document Locks
  // ================================

  /**
   * Acquire a document lock
   */
  async acquireLock(
    lock: Omit<DocumentLock, 'id' | 'acquiredAt'>
  ): Promise<Result<DocumentLock>> {
    return wrapAsync(async () => {
      // Check for overlapping locks
      const overlappingLocks = await this.getOverlappingLocks(
        lock.documentId,
        lock.startPosition,
        lock.endPosition
      )

      if (!overlappingLocks.success) {
        throw overlappingLocks.error
      }

      if (overlappingLocks.data.length > 0) {
        throw RepositoryError.conflict(
          'DocumentLock',
          'Cannot acquire lock: overlapping with existing locks'
        )
      }

      const lockData = {
        document_id: lock.documentId,
        session_id: lock.sessionId,
        user_id: lock.userId,
        start_position: lock.startPosition,
        end_position: lock.endPosition,
        lock_type: lock.type,
        reason: lock.metadata?.reason,
        section_name: lock.metadata?.section,
        priority: lock.metadata?.priority || 'normal',
        expires_at: lock.expiresAt,
        auto_release: lock.autoRelease,
        acquired_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('document_locks')
        .insert(lockData)
        .select('*')
        .single()

      if (error) {
        throw RepositoryError.database('Failed to acquire lock', error, 'insert')
      }

      return this.mapToDocumentLock(data)
    })
  }

  /**
   * Release a document lock
   */
  async releaseLock(
    lockId: DocumentLockId
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const { error } = await this.supabase
        .from('document_locks')
        .update({
          released_at: new Date().toISOString()
        })
        .eq('id', lockId)
        .is('released_at', null)

      if (error) {
        throw RepositoryError.database('Failed to release lock', error, 'update')
      }
    })
  }

  /**
   * Get overlapping locks for a position range
   */
  async getOverlappingLocks(
    documentId: DocumentId,
    startPosition: number,
    endPosition: number
  ): Promise<Result<DocumentLock[]>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('document_locks')
        .select('*')
        .eq('document_id', documentId)
        .is('released_at', null)
        .or(
          `and(start_position.lte.${endPosition},end_position.gte.${startPosition})`
        )

      if (error) {
        throw RepositoryError.database('Failed to fetch overlapping locks', error, 'select')
      }

      return (data || []).map(d => this.mapToDocumentLock(d))
    })
  }

  // ================================
  // Comments System
  // ================================

  /**
   * Add a comment
   */
  async addComment(
    comment: Omit<CollaborativeComment, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'attachments' | 'reactions'>
  ): Promise<Result<CollaborativeComment>> {
    return wrapAsync(async () => {
      const commentData = {
        document_id: comment.documentId,
        session_id: comment.sessionId,
        user_id: comment.userId,
        position_line: comment.position.line,
        position_column: comment.position.column,
        position_offset: comment.position.offset,
        anchor_text: comment.anchorText,
        content: comment.content,
        status: comment.status,
        comment_type: comment.type,
        priority: comment.priority,
        mentioned_users: comment.mentions,
        tags: comment.metadata?.tags || [],
        category: comment.metadata?.category,
        linked_issues: comment.metadata?.linkedIssues || [],
        estimated_resolution_time: comment.metadata?.estimatedResolutionTime
      }

      const { data, error } = await this.supabase
        .from('collaborative_comments')
        .insert(commentData)
        .select(`
          *,
          user:users(*),
          replies:collaborative_comment_replies(
            *,
            user:users(*)
          )
        `)
        .single()

      if (error) {
        throw RepositoryError.database('Failed to add comment', error, 'insert')
      }

      return this.mapToCollaborativeComment(data)
    })
  }

  /**
   * Get comments for a document
   */
  async getDocumentComments(
    documentId: DocumentId,
    filters: CommentFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<CollaborativeComment>>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('collaborative_comments')
        .select(`
          *,
          user:users(*),
          replies:collaborative_comment_replies(
            *,
            user:users(*),
            reactions:collaborative_comment_reactions(*)
          ),
          reactions:collaborative_comment_reactions(*)
        `, { count: 'exact' })
        .eq('document_id', documentId)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.commentType) {
        query = query.eq('comment_type', filters.commentType)
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      const modifiedQuery = this.applyQueryOptions(query, options)
      const { data, error, count } = await modifiedQuery

      if (error) {
        throw RepositoryError.database('Failed to fetch document comments', error, 'select')
      }

      const comments = (data || []).map(d => this.mapToCollaborativeComment(d))
      return this.createPaginatedResult(comments, count, options).data!
    })
  }

  /**
   * Resolve a comment
   */
  async resolveComment(
    commentId: CommentThreadId,
    resolvedBy: UserId
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const { error } = await this.supabase
        .from('collaborative_comments')
        .update({
          status: 'resolved',
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)

      if (error) {
        throw RepositoryError.database('Failed to resolve comment', error, 'update')
      }
    })
  }

  // ================================
  // Helper Methods
  // ================================

  private async getCurrentVectorClock(
    sessionId: CollaborationSessionId
  ): Promise<Result<VectorClock>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('document_operations')
        .select('vector_clock, user_id')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        throw RepositoryError.database('Failed to fetch vector clock', error, 'select')
      }

      if (!data || data.length === 0) {
        return {} // Empty vector clock for new sessions
      }

      return data[0].vector_clock as VectorClock
    })
  }

  private calculateDocumentChecksum(content: string): string {
    return createHash('md5').update(content).digest('hex')
  }

  // ================================
  // Mapping Functions
  // ================================

  private mapToCollaborationSession(data: any): DocumentCollaborationSession {
    return {
      id: data.id,
      documentId: data.document_id,
      organizationId: data.organization_id,
      roomId: data.room_id,
      participants: (data.participants || []).map((p: any) => this.mapToDocumentPresence(p)),
      operations: [], // Operations loaded separately
      locks: [], // Locks loaded separately
      comments: [], // Comments loaded separately
      suggestions: [], // Suggestions loaded separately
      activeVersion: data.active_version_id,
      currentBranch: data.current_branch_id,
      settings: {
        maxParticipants: data.max_participants,
        allowAnonymous: data.allow_anonymous,
        requireApproval: data.require_approval,
        autoSave: data.auto_save,
        autoSaveInterval: data.auto_save_interval,
        conflictResolution: data.conflict_resolution,
        permissions: {
          defaultRole: data.default_role,
          allowRoleEscalation: data.allow_role_escalation,
          sessionTimeout: data.session_timeout,
          idleTimeout: data.idle_timeout
        },
        notifications: {
          mentions: data.notify_mentions,
          comments: data.notify_comments,
          suggestions: data.notify_suggestions,
          presenceChanges: data.notify_presence_changes,
          versionChanges: data.notify_version_changes
        },
        ai: {
          enabled: data.ai_enabled,
          features: data.ai_features || [],
          confidenceThreshold: data.ai_confidence_threshold,
          autoAcceptThreshold: data.ai_auto_accept_threshold
        }
      },
      startedAt: data.started_at,
      lastActivity: data.last_activity,
      isActive: data.is_active,
      metadata: {
        sessionType: data.session_type,
        recordingEnabled: data.recording_enabled,
        aiAssistanceLevel: data.ai_assistance_level,
        qualityGate: {
          enabled: data.quality_gate_enabled,
          checks: data.quality_checks || [],
          threshold: data.quality_threshold,
          blockMergeOnFailure: data.block_merge_on_failure,
          autoFixEnabled: data.auto_fix_enabled
        }
      }
    }
  }

  private mapToDocumentOperation(data: any): DocumentOperation {
    return {
      id: data.id,
      type: data.operation_type,
      sessionId: data.session_id,
      userId: data.user_id,
      documentId: data.document_id,
      position: data.position,
      length: data.length,
      content: data.content,
      attributes: data.attributes || {},
      timestamp: data.created_at,
      vectorClock: data.vector_clock || {},
      metadata: {
        priority: data.priority,
        source: data.source,
        deviceType: data.device_type,
        clientVersion: data.client_version
      }
    }
  }

  private mapToCollaborativeCursor(data: any): CollaborativeCursor {
    return {
      id: data.id,
      userId: data.user_id,
      sessionId: data.session_id,
      documentId: data.document_id,
      position: {
        line: data.position_line,
        column: data.position_column,
        offset: data.position_offset
      },
      selection: data.has_selection ? {
        start: {
          line: data.selection_start_line,
          column: data.selection_start_column
        },
        end: {
          line: data.selection_end_line,
          column: data.selection_end_column
        },
        direction: data.selection_direction
      } : undefined,
      color: data.cursor_color,
      label: data.cursor_label,
      isActive: data.is_active,
      lastActivity: data.last_activity,
      metadata: {
        deviceType: data.device_type,
        viewport: {
          top: data.viewport_top,
          bottom: data.viewport_bottom
        }
      }
    }
  }

  private mapToDocumentPresence(data: any): DocumentPresence {
    return {
      userId: data.user_id,
      sessionId: data.session_id,
      documentId: data.document_id,
      status: data.status,
      cursor: data.cursor ? this.mapToCollaborativeCursor(data.cursor) : undefined,
      permissions: {
        canView: data.can_view,
        canEdit: data.can_edit,
        canComment: data.can_comment,
        canSuggest: data.can_suggest,
        canResolveComments: data.can_resolve_comments,
        canManageVersions: data.can_manage_versions,
        canLockSections: data.can_lock_sections,
        canMerge: data.can_merge,
        canApprove: data.can_approve,
        expiresAt: data.permissions_expire_at
      },
      joinedAt: data.joined_at,
      lastActivity: data.last_activity,
      metadata: {
        username: data.username,
        avatar: data.avatar_url,
        role: data.user_role,
        timezone: data.timezone
      }
    }
  }

  private mapToDocumentLock(data: any): DocumentLock {
    return {
      id: data.id,
      documentId: data.document_id,
      userId: data.user_id,
      sessionId: data.session_id,
      startPosition: data.start_position,
      endPosition: data.end_position,
      type: data.lock_type,
      acquiredAt: data.acquired_at,
      expiresAt: data.expires_at,
      autoRelease: data.auto_release,
      metadata: {
        reason: data.reason,
        section: data.section_name,
        priority: data.priority
      }
    }
  }

  private mapToCollaborativeComment(data: any): CollaborativeComment {
    return {
      id: data.id,
      documentId: data.document_id,
      userId: data.user_id,
      sessionId: data.session_id,
      position: {
        line: data.position_line,
        column: data.position_column,
        offset: data.position_offset
      },
      anchorText: data.anchor_text,
      content: data.content,
      status: data.status,
      type: data.comment_type,
      priority: data.priority,
      mentions: data.mentioned_users || [],
      replies: (data.replies || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        sessionId: r.session_id,
        content: r.content,
        mentions: r.mentioned_users || [],
        attachments: [], // Load separately
        reactions: (r.reactions || []).map((reaction: any) => ({
          emoji: reaction.emoji,
          userId: reaction.user_id,
          timestamp: reaction.reacted_at
        })),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        metadata: {
          isAIGenerated: r.is_ai_generated,
          confidence: r.ai_confidence
        }
      })),
      attachments: [], // Load separately
      reactions: (data.reactions || []).map((r: any) => ({
        emoji: r.emoji,
        userId: r.user_id,
        timestamp: r.reacted_at
      })),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      resolvedAt: data.resolved_at,
      resolvedBy: data.resolved_by,
      metadata: {
        tags: data.tags || [],
        category: data.category,
        linkedIssues: data.linked_issues || [],
        estimatedResolutionTime: data.estimated_resolution_time
      }
    }
  }
}