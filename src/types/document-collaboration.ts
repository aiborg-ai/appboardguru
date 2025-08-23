/**
 * Real-time Collaborative Document Editing Types
 * Enterprise-grade types for collaborative document editing with operational transforms
 */

import { z } from 'zod'
import type { 
  UserId, 
  OrganizationId, 
  AssetId, 
  DocumentId,
  SessionId,
  RoomId,
  Brand,
  ISODateString
} from './branded'

// ==== Collaborative Document Branded Types ====

export type DocumentCollaborationId = Brand<string, 'DocumentCollaborationId'>
export type OperationId = Brand<string, 'OperationId'>
export type CursorId = Brand<string, 'CursorId'>
export type CollaborationSessionId = Brand<string, 'CollaborationSessionId'>
export type DocumentVersionId = Brand<string, 'DocumentVersionId'>
export type DocumentLockId = Brand<string, 'DocumentLockId'>
export type CommentThreadId = Brand<string, 'CommentThreadId'>
export type SuggestionId = Brand<string, 'SuggestionId'>
export type RevisionId = Brand<string, 'RevisionId'>
export type BranchId = Brand<string, 'BranchId'>
export type MergeRequestId = Brand<string, 'MergeRequestId'>
export type ConflictId = Brand<string, 'ConflictId'>

// ==== Validation Schemas ====

export const DocumentCollaborationIdSchema = z.string().uuid()
export const OperationIdSchema = z.string().uuid()
export const CursorIdSchema = z.string().uuid()
export const CollaborationSessionIdSchema = z.string().uuid()
export const DocumentVersionIdSchema = z.string().uuid()
export const DocumentLockIdSchema = z.string().uuid()
export const CommentThreadIdSchema = z.string().uuid()
export const SuggestionIdSchema = z.string().uuid()
export const RevisionIdSchema = z.string().uuid()
export const BranchIdSchema = z.string().uuid()
export const MergeRequestIdSchema = z.string().uuid()
export const ConflictIdSchema = z.string().uuid()

// ==== Core Collaboration Types ====

/**
 * Operational Transform Operation Types
 */
export type OperationType = 
  | 'insert'
  | 'delete' 
  | 'retain'
  | 'format'
  | 'attribute'

export type OperationPriority = 'low' | 'normal' | 'high' | 'critical'

/**
 * Document Operation for Operational Transform
 */
export interface DocumentOperation {
  id: OperationId
  type: OperationType
  sessionId: CollaborationSessionId
  userId: UserId
  documentId: DocumentId
  position: number
  length?: number
  content?: string
  attributes?: Record<string, unknown>
  timestamp: ISODateString
  vectorClock: VectorClock
  metadata?: {
    priority: OperationPriority
    source: 'user' | 'system' | 'ai'
    deviceType: 'desktop' | 'mobile' | 'tablet'
    clientVersion: string
  }
}

/**
 * Vector Clock for operation ordering
 */
export interface VectorClock {
  [userId: string]: number
}

/**
 * Document Position for precise cursor placement
 */
export interface DocumentPosition {
  line: number
  column: number
  offset?: number
}

/**
 * Document Selection Range
 */
export interface DocumentSelection {
  start: DocumentPosition
  end: DocumentPosition
  direction: 'forward' | 'backward' | 'none'
}

/**
 * Collaborative Cursor
 */
export interface CollaborativeCursor {
  id: CursorId
  userId: UserId
  sessionId: CollaborationSessionId
  documentId: DocumentId
  position: DocumentPosition
  selection?: DocumentSelection
  color: string
  label: string
  isActive: boolean
  lastActivity: ISODateString
  metadata?: {
    deviceType: 'desktop' | 'mobile' | 'tablet'
    viewport: {
      top: number
      bottom: number
    }
  }
}

/**
 * User Presence in Document Collaboration
 */
export interface DocumentPresence {
  userId: UserId
  sessionId: CollaborationSessionId
  documentId: DocumentId
  status: 'viewing' | 'editing' | 'commenting' | 'idle' | 'away'
  cursor?: CollaborativeCursor
  permissions: CollaborationPermissions
  joinedAt: ISODateString
  lastActivity: ISODateString
  metadata?: {
    username: string
    avatar?: string
    role: string
    timezone: string
  }
}

/**
 * Collaboration Permissions
 */
export interface CollaborationPermissions {
  canView: boolean
  canEdit: boolean
  canComment: boolean
  canSuggest: boolean
  canResolveComments: boolean
  canManageVersions: boolean
  canLockSections: boolean
  canMerge: boolean
  canApprove: boolean
  expiresAt?: ISODateString
}

/**
 * Document Lock for section-level locking
 */
export interface DocumentLock {
  id: DocumentLockId
  documentId: DocumentId
  userId: UserId
  sessionId: CollaborationSessionId
  startPosition: number
  endPosition: number
  type: 'exclusive' | 'shared' | 'comment-only'
  acquiredAt: ISODateString
  expiresAt?: ISODateString
  autoRelease: boolean
  metadata?: {
    reason: string
    section: string
    priority: OperationPriority
  }
}

/**
 * Collaborative Comment with Threading
 */
export interface CollaborativeComment {
  id: CommentThreadId
  documentId: DocumentId
  userId: UserId
  sessionId: CollaborationSessionId
  position: DocumentPosition
  anchorText?: string
  content: string
  status: 'open' | 'resolved' | 'dismissed'
  type: 'comment' | 'suggestion' | 'approval-request' | 'question'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  mentions: UserId[]
  replies: CollaborativeCommentReply[]
  attachments: CollaborativeAttachment[]
  reactions: CollaborativeReaction[]
  createdAt: ISODateString
  updatedAt: ISODateString
  resolvedAt?: ISODateString
  resolvedBy?: UserId
  metadata?: {
    tags: string[]
    category: string
    linkedIssues: string[]
    estimatedResolutionTime: number
  }
}

export interface CollaborativeCommentReply {
  id: string
  userId: UserId
  sessionId: CollaborationSessionId
  content: string
  mentions: UserId[]
  attachments: CollaborativeAttachment[]
  reactions: CollaborativeReaction[]
  createdAt: ISODateString
  updatedAt: ISODateString
  metadata?: {
    isAIGenerated: boolean
    confidence?: number
  }
}

export interface CollaborativeAttachment {
  id: string
  type: 'file' | 'image' | 'link' | 'reference'
  url: string
  name: string
  size?: number
  mimeType?: string
  thumbnail?: string
}

export interface CollaborativeReaction {
  emoji: string
  userId: UserId
  timestamp: ISODateString
}

/**
 * Document Suggestion for Track Changes
 */
export interface DocumentSuggestion {
  id: SuggestionId
  documentId: DocumentId
  userId: UserId
  sessionId: CollaborationSessionId
  type: 'insert' | 'delete' | 'replace' | 'format' | 'move'
  position: DocumentPosition
  originalContent?: string
  suggestedContent: string
  formatting?: Record<string, unknown>
  status: 'pending' | 'accepted' | 'rejected' | 'superseded'
  reason?: string
  createdAt: ISODateString
  reviewedAt?: ISODateString
  reviewedBy?: UserId
  metadata?: {
    confidence: number
    aiGenerated: boolean
    impact: 'minor' | 'moderate' | 'major'
    category: string[]
  }
}

/**
 * Document Version with Branching
 */
export interface DocumentVersion {
  id: DocumentVersionId
  documentId: DocumentId
  branchId: BranchId
  versionNumber: number
  content: string
  createdBy: UserId
  createdAt: ISODateString
  commitMessage: string
  operations: OperationId[]
  parentVersionId?: DocumentVersionId
  mergedFrom?: BranchId[]
  checksum: string
  size: number
  metadata?: {
    tags: string[]
    milestone: string
    significance: 'patch' | 'minor' | 'major'
    automatedChanges: boolean
  }
}

/**
 * Document Branch for Version Control
 */
export interface DocumentBranch {
  id: BranchId
  documentId: DocumentId
  name: string
  description?: string
  createdBy: UserId
  createdAt: ISODateString
  lastCommitId: DocumentVersionId
  isProtected: boolean
  mergeStrategy: 'auto' | 'manual' | 'fast-forward' | 'squash'
  parentBranchId?: BranchId
  status: 'active' | 'merged' | 'abandoned'
  metadata?: {
    reviewRequired: boolean
    autoMerge: boolean
    conflictResolution: 'manual' | 'automated' | 'ai-assisted'
  }
}

/**
 * Merge Request for Branch Integration
 */
export interface DocumentMergeRequest {
  id: MergeRequestId
  documentId: DocumentId
  sourceBranchId: BranchId
  targetBranchId: BranchId
  title: string
  description: string
  createdBy: UserId
  assignedTo: UserId[]
  status: 'draft' | 'ready' | 'approved' | 'merged' | 'closed' | 'conflicts'
  conflicts: ConflictId[]
  reviewers: MergeReviewer[]
  approvals: number
  requiredApprovals: number
  createdAt: ISODateString
  updatedAt: ISODateString
  mergedAt?: ISODateString
  mergedBy?: UserId
  metadata?: {
    priority: 'low' | 'normal' | 'high' | 'critical'
    deadline?: ISODateString
    estimatedReviewTime: number
    linkedIssues: string[]
    automatedChecks: MergeCheck[]
  }
}

export interface MergeReviewer {
  userId: UserId
  status: 'pending' | 'approved' | 'rejected' | 'changes-requested'
  reviewedAt?: ISODateString
  comments: string
}

export interface MergeCheck {
  name: string
  status: 'pending' | 'passed' | 'failed' | 'skipped'
  details?: string
  url?: string
}

/**
 * Document Conflict Resolution
 */
export interface DocumentConflict {
  id: ConflictId
  documentId: DocumentId
  mergeRequestId?: MergeRequestId
  type: 'content' | 'format' | 'structure' | 'metadata'
  position: DocumentPosition
  sourceContent: string
  targetContent: string
  commonAncestor?: string
  status: 'unresolved' | 'resolved' | 'auto-resolved'
  resolution?: 'accept-source' | 'accept-target' | 'manual-merge' | 'ai-suggested'
  resolvedContent?: string
  resolvedBy?: UserId
  resolvedAt?: ISODateString
  metadata?: {
    confidence: number
    aiAssisted: boolean
    resolutionStrategy: string
    impactScore: number
  }
}

/**
 * Real-time Collaboration Session
 */
export interface DocumentCollaborationSession {
  id: CollaborationSessionId
  documentId: DocumentId
  organizationId: OrganizationId
  roomId: RoomId
  participants: DocumentPresence[]
  operations: DocumentOperation[]
  locks: DocumentLock[]
  comments: CollaborativeComment[]
  suggestions: DocumentSuggestion[]
  activeVersion: DocumentVersionId
  currentBranch: BranchId
  settings: CollaborationSettings
  startedAt: ISODateString
  lastActivity: ISODateString
  isActive: boolean
  metadata?: {
    sessionType: 'editing' | 'review' | 'planning' | 'approval'
    recordingEnabled: boolean
    aiAssistanceLevel: 'none' | 'basic' | 'advanced' | 'full'
    qualityGate: CollaborationQualityGate
  }
}

export interface CollaborationSettings {
  maxParticipants: number
  allowAnonymous: boolean
  requireApproval: boolean
  autoSave: boolean
  autoSaveInterval: number
  conflictResolution: 'manual' | 'auto' | 'last-writer-wins' | 'ai-assisted'
  permissions: {
    defaultRole: 'viewer' | 'commenter' | 'editor' | 'approver'
    allowRoleEscalation: boolean
    sessionTimeout: number
    idleTimeout: number
  }
  notifications: {
    mentions: boolean
    comments: boolean
    suggestions: boolean
    presenceChanges: boolean
    versionChanges: boolean
  }
  ai: {
    enabled: boolean
    features: ('grammar' | 'style' | 'suggestions' | 'translation' | 'summarization')[]
    confidenceThreshold: number
    autoAcceptThreshold: number
  }
}

export interface CollaborationQualityGate {
  enabled: boolean
  checks: ('spell-check' | 'grammar' | 'style' | 'compliance' | 'accessibility' | 'structure')[]
  threshold: number
  blockMergeOnFailure: boolean
  autoFixEnabled: boolean
}

/**
 * Operational Transform Context
 */
export interface OperationalTransformContext {
  serverState: DocumentState
  clientStates: Map<UserId, DocumentState>
  pendingOperations: DocumentOperation[]
  acknowledgedOperations: Set<OperationId>
  transformationMatrix: TransformationMatrix
  conflictResolutionStrategy: ConflictResolutionStrategy
}

export interface DocumentState {
  content: string
  vectorClock: VectorClock
  operationHistory: OperationId[]
  lastSyncedOperation: OperationId
  checksum: string
}

export interface TransformationMatrix {
  [operationType: string]: {
    [againstType: string]: TransformFunction
  }
}

export type TransformFunction = (
  op1: DocumentOperation,
  op2: DocumentOperation
) => [DocumentOperation, DocumentOperation]

export type ConflictResolutionStrategy = 
  | 'operational-transform'
  | 'last-writer-wins'
  | 'manual-resolution'
  | 'ai-assisted'
  | 'three-way-merge'

/**
 * Analytics and Metrics
 */
export interface CollaborationMetrics {
  sessionId: CollaborationSessionId
  documentId: DocumentId
  participants: {
    total: number
    active: number
    peak: number
  }
  operations: {
    total: number
    byType: Record<OperationType, number>
    averageLatency: number
    conflictRate: number
    transformationRate: number
  }
  engagement: {
    averageSessionTime: number
    operationsPerMinute: number
    commentsPerSession: number
    suggestionsAcceptanceRate: number
  }
  performance: {
    averageResponseTime: number
    operationThroughput: number
    memoryUsage: number
    networkBandwidth: number
  }
  quality: {
    errorRate: number
    rollbackRate: number
    conflictResolutionTime: number
    userSatisfactionScore?: number
  }
}

/**
 * Event Types for Real-time Updates
 */
export type CollaborationEventType =
  | 'operation-applied'
  | 'operation-transformed'
  | 'cursor-moved'
  | 'selection-changed'
  | 'user-joined'
  | 'user-left'
  | 'presence-updated'
  | 'lock-acquired'
  | 'lock-released'
  | 'comment-added'
  | 'comment-updated'
  | 'comment-resolved'
  | 'suggestion-made'
  | 'suggestion-accepted'
  | 'suggestion-rejected'
  | 'version-created'
  | 'branch-created'
  | 'merge-requested'
  | 'conflict-detected'
  | 'conflict-resolved'
  | 'session-started'
  | 'session-ended'

export interface CollaborationEvent<T = unknown> {
  id: string
  type: CollaborationEventType
  sessionId: CollaborationSessionId
  documentId: DocumentId
  userId: UserId
  timestamp: ISODateString
  data: T
  metadata?: {
    priority: OperationPriority
    broadcast: boolean
    persistent: boolean
    retryable: boolean
  }
}

/**
 * API Request/Response Types
 */
export interface CreateCollaborationSessionRequest {
  documentId: DocumentId
  organizationId: OrganizationId
  settings?: Partial<CollaborationSettings>
  initialBranch?: BranchId
}

export interface CreateCollaborationSessionResponse {
  session: DocumentCollaborationSession
  accessToken: string
  websocketUrl: string
  permissions: CollaborationPermissions
}

export interface JoinCollaborationSessionRequest {
  sessionId: CollaborationSessionId
  permissions?: Partial<CollaborationPermissions>
}

export interface JoinCollaborationSessionResponse {
  session: DocumentCollaborationSession
  currentState: DocumentState
  participants: DocumentPresence[]
  accessToken: string
}

export interface ApplyOperationRequest {
  operation: Omit<DocumentOperation, 'id' | 'timestamp' | 'vectorClock'>
  expectedState?: {
    vectorClock: VectorClock
    checksum: string
  }
}

export interface ApplyOperationResponse {
  operationId: OperationId
  transformedOperation?: DocumentOperation
  newState: DocumentState
  conflicts?: DocumentConflict[]
}

/**
 * Configuration Types
 */
export interface CollaborationConfig {
  operational_transform: {
    max_operations_per_batch: number
    operation_timeout_ms: number
    max_transform_iterations: number
    enable_optimistic_transforms: boolean
  }
  session_management: {
    max_participants_per_session: number
    session_timeout_ms: number
    idle_timeout_ms: number
    auto_save_interval_ms: number
  }
  conflict_resolution: {
    default_strategy: ConflictResolutionStrategy
    auto_resolve_threshold: number
    manual_review_required: boolean
    ai_assistance_enabled: boolean
  }
  performance: {
    max_operation_history_size: number
    operation_cleanup_interval_ms: number
    state_snapshot_interval: number
    enable_compression: boolean
  }
  security: {
    require_encrypted_transport: boolean
    operation_signing_enabled: boolean
    audit_all_operations: boolean
    max_operation_size_bytes: number
  }
}

// Validation Schemas for Request/Response Types
export const CreateCollaborationSessionRequestSchema = z.object({
  documentId: z.string().uuid(),
  organizationId: z.string().uuid(),
  settings: z.object({
    maxParticipants: z.number().min(1).max(100).optional(),
    allowAnonymous: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    autoSave: z.boolean().optional(),
    autoSaveInterval: z.number().min(1000).max(300000).optional(),
    conflictResolution: z.enum(['manual', 'auto', 'last-writer-wins', 'ai-assisted']).optional()
  }).optional(),
  initialBranch: z.string().uuid().optional()
})

export const ApplyOperationRequestSchema = z.object({
  operation: z.object({
    type: z.enum(['insert', 'delete', 'retain', 'format', 'attribute']),
    position: z.number().min(0),
    length: z.number().min(0).optional(),
    content: z.string().optional(),
    attributes: z.record(z.unknown()).optional(),
    metadata: z.object({
      priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
      source: z.enum(['user', 'system', 'ai']).optional(),
      deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional(),
      clientVersion: z.string().optional()
    }).optional()
  }),
  expectedState: z.object({
    vectorClock: z.record(z.number()),
    checksum: z.string()
  }).optional()
})