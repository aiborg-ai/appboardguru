/**
 * DocumentCollaborationController
 * Enterprise-grade collaborative document editing API controller
 * Provides real-time collaboration, operational transforms, and version control
 * 
 * OpenAPI Documentation:
 * - POST /api/collaboration/sessions - Create collaboration session
 * - GET /api/collaboration/sessions/{sessionId} - Get session details
 * - POST /api/collaboration/sessions/{sessionId}/operations - Apply document operation
 * - GET /api/collaboration/sessions/{sessionId}/operations - Get operation history
 * - POST /api/collaboration/sessions/{sessionId}/cursors - Update cursor position
 * - GET /api/collaboration/sessions/{sessionId}/cursors - Get active cursors
 * - POST /api/collaboration/sessions/{sessionId}/comments - Add comment
 * - GET /api/collaboration/sessions/{sessionId}/comments - Get comments
 * - POST /api/collaboration/sessions/{sessionId}/suggestions - Create suggestion
 * - GET /api/collaboration/sessions/{sessionId}/suggestions - Get suggestions
 * - POST /api/collaboration/documents/{documentId}/versions - Create version
 * - POST /api/collaboration/documents/{documentId}/branches - Create branch
 * - POST /api/collaboration/documents/{documentId}/merge-requests - Create merge request
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { EnhancedHandlers } from '@/lib/middleware/apiHandler'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { 
  DocumentCollaborationService,
  OperationalTransformService,
  CollaborationWebSocketService,
  CollaborationPermissionsService,
  DocumentVersionControlService
} from '@/lib/services'
import {
  CollaborationSessionId,
  DocumentId,
  UserId,
  OrganizationId,
  DocumentOperation,
  CursorPosition,
  DocumentComment,
  DocumentSuggestion,
  PermissionLevel,
  DocumentBranch,
  DocumentMergeRequest,
  CreateCollaborationSessionRequest,
  CreateCollaborationSessionResponse,
  ApplyOperationRequest,
  ApplyOperationResponse,
  UpdateCursorRequest,
  UpdateCursorResponse,
  CreateCommentRequest,
  CreateCommentResponse,
  CreateSuggestionRequest,
  CreateSuggestionResponse,
  BranchCreationRequest,
  MergeRequestCreationRequest,
  OperationType
} from '@/types/document-collaboration'
import { Result } from '@/lib/repositories'
import { logActivity, getRequestContext } from '@/lib/services/activity-logger'

// Validation schemas for API requests
const CreateSessionSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().default(''),
  permissions: z.object({
    canEdit: z.boolean().default(true),
    canComment: z.boolean().default(true),
    canSuggest: z.boolean().default(true),
    canViewHistory: z.boolean().default(true)
  }).default({}),
  settings: z.object({
    maxParticipants: z.number().int().min(1).max(100).default(50),
    sessionTimeout: z.number().int().min(300).max(86400).default(3600), // 1 hour default
    enableAutoSave: z.boolean().default(true),
    autoSaveInterval: z.number().int().min(5).max(300).default(30) // 30 seconds default
  }).default({})
})

const ApplyOperationSchema = z.object({
  operation: z.object({
    id: z.string().uuid(),
    type: z.enum(['insert', 'delete', 'retain', 'format', 'attribute']),
    position: z.number().int().min(0),
    content: z.string().optional(),
    length: z.number().int().min(0).optional(),
    attributes: z.record(z.any()).optional(),
    timestamp: z.number().int(),
    userId: z.string().uuid(),
    vectorClock: z.record(z.number().int())
  }),
  context: z.object({
    documentVersion: z.number().int().min(0),
    localOperationCount: z.number().int().min(0),
    expectedState: z.string().optional()
  })
})

const UpdateCursorSchema = z.object({
  position: z.object({
    start: z.number().int().min(0),
    end: z.number().int().min(0),
    line: z.number().int().min(1),
    column: z.number().int().min(1)
  }),
  selection: z.object({
    anchor: z.number().int().min(0),
    focus: z.number().int().min(0)
  }).optional(),
  metadata: z.object({
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    label: z.string().max(50).optional()
  }).optional()
})

const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000, 'Comment too long'),
  position: z.object({
    start: z.number().int().min(0),
    end: z.number().int().min(0),
    line: z.number().int().min(1).optional(),
    column: z.number().int().min(1).optional()
  }),
  parentId: z.string().uuid().optional(),
  mentions: z.array(z.string().uuid()).default([]),
  isResolved: z.boolean().default(false),
  metadata: z.object({
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    category: z.string().max(50).optional(),
    tags: z.array(z.string()).default([])
  }).optional()
})

const CreateSuggestionSchema = z.object({
  type: z.enum(['text-change', 'format-change', 'structure-change', 'ai-generated']),
  position: z.object({
    start: z.number().int().min(0),
    end: z.number().int().min(0)
  }),
  originalText: z.string(),
  suggestedText: z.string(),
  reason: z.string().max(500).optional(),
  confidence: z.number().min(0).max(1).default(0.8),
  category: z.enum(['grammar', 'style', 'clarity', 'factual', 'other']).default('other'),
  isAiGenerated: z.boolean().default(false),
  metadata: z.record(z.any()).optional()
})

const CreateBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(100, 'Branch name too long'),
  description: z.string().max(500).optional(),
  fromVersion: z.number().int().min(0).optional(),
  permissions: z.object({
    isProtected: z.boolean().default(false),
    allowedUsers: z.array(z.string().uuid()).default([]),
    requireReview: z.boolean().default(false)
  }).default({})
})

const CreateMergeRequestSchema = z.object({
  sourceBranch: z.string().min(1, 'Source branch is required'),
  targetBranch: z.string().min(1, 'Target branch is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000).optional(),
  reviewers: z.array(z.string().uuid()).default([]),
  assignees: z.array(z.string().uuid()).default([]),
  labels: z.array(z.string()).default([]),
  autoMerge: z.boolean().default(false),
  deleteSourceBranch: z.boolean().default(false)
})

const SessionFiltersSchema = z.object({
  documentId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'ended']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'updated_at', 'participant_count']).default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Helper function to create Supabase client
async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

// Helper function to check session access
async function checkSessionAccess(
  supabase: any,
  sessionId: string,
  userId: string,
  requiredPermission: PermissionLevel = 'viewer'
): Promise<{ hasAccess: boolean; session?: any }> {
  const { data: session, error } = await supabase
    .from('collaboration_sessions')
    .select(`
      *,
      session_participants(user_id, permission_level, is_active, joined_at),
      documents(id, title, organization_id, owner_id)
    `)
    .eq('id', sessionId)
    .eq('is_active', true)
    .single()

  if (error || !session) {
    return { hasAccess: false }
  }

  // Check if user is document owner
  if (session.documents?.owner_id === userId) {
    return { hasAccess: true, session }
  }

  // Check participant permissions
  const participant = session.session_participants?.find((p: any) => 
    p.user_id === userId && p.is_active
  )

  if (!participant) {
    return { hasAccess: false }
  }

  // Check permission hierarchy
  const permissionHierarchy = { 
    viewer: 1, 
    commenter: 2, 
    editor: 3, 
    admin: 4 
  }

  const hasPermission = permissionHierarchy[participant.permission_level] >= 
                       permissionHierarchy[requiredPermission]

  return { hasAccess: hasPermission, session }
}

// Initialize services
const collaborationService = new DocumentCollaborationService()
const operationalTransformService = new OperationalTransformService()
const websocketService = new CollaborationWebSocketService()
const permissionsService = new CollaborationPermissionsService()
const versionControlService = new DocumentVersionControlService()

/**
 * POST /api/collaboration/sessions
 * Create new collaboration session
 * 
 * @openapi
 * /api/collaboration/sessions:
 *   post:
 *     summary: Create collaboration session
 *     description: Creates a new real-time collaborative editing session for a document
 *     tags:
 *       - Document Collaboration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentId
 *               - organizationId
 *               - title
 *             properties:
 *               documentId:
 *                 type: string
 *                 format: uuid
 *                 description: Document ID to collaborate on
 *               organizationId:
 *                 type: string
 *                 format: uuid
 *                 description: Organization ID
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 description: Session title
 *               content:
 *                 type: string
 *                 description: Initial document content
 *               permissions:
 *                 type: object
 *                 properties:
 *                   canEdit:
 *                     type: boolean
 *                     default: true
 *                   canComment:
 *                     type: boolean
 *                     default: true
 *               settings:
 *                 type: object
 *                 properties:
 *                   maxParticipants:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 100
 *                     default: 50
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 session:
 *                   $ref: '#/components/schemas/CollaborationSession'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export const createCollaborationSession = EnhancedHandlers.post(
  CreateSessionSchema,
  {
    rateLimit: { requests: 10, window: '1m' },
    featureFlag: 'DOCUMENT_COLLABORATION',
    requireAuth: true
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const sessionData = req.validatedBody!

    // Check document access
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, organization_id, owner_id')
      .eq('id', sessionData.documentId)
      .single()

    if (docError || !document) {
      throw new Error('Document not found or access denied')
    }

    // Create collaboration session
    const createRequest: CreateCollaborationSessionRequest = {
      documentId: sessionData.documentId as DocumentId,
      organizationId: sessionData.organizationId as OrganizationId,
      createdBy: req.user!.id as UserId,
      title: sessionData.title,
      content: sessionData.content,
      permissions: sessionData.permissions,
      settings: sessionData.settings
    }

    const result = await collaborationService.createCollaborationSession(createRequest)

    if (!result.success) {
      throw new Error(`Failed to create session: ${result.error}`)
    }

    // Log activity
    await logActivity(
      req.user!.id,
      sessionData.organizationId,
      'collaboration_session_created',
      'collaboration_sessions',
      result.data.session.id,
      {
        ...getRequestContext(req.request as NextRequest),
        document_id: sessionData.documentId,
        session_title: sessionData.title
      }
    )

    return {
      session: result.data.session,
      websocketUrl: result.data.websocketUrl
    }
  }
)

/**
 * GET /api/collaboration/sessions/{sessionId}
 * Get collaboration session details
 */
export const getCollaborationSession = EnhancedHandlers.get(
  {
    rateLimit: { requests: 100, window: '1m' },
    cache: { ttl: 30 }, // 30 seconds cache for session data
    featureFlag: 'DOCUMENT_COLLABORATION',
    requireAuth: true
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    const { hasAccess, session } = await checkSessionAccess(
      supabase, 
      sessionId, 
      req.user!.id, 
      'viewer'
    )

    if (!hasAccess || !session) {
      throw new Error('Session not found or access denied')
    }

    // Get additional session details
    const { data: sessionDetails, error } = await supabase
      .from('collaboration_sessions')
      .select(`
        *,
        documents(id, title, organization_id),
        session_participants(
          user_id, permission_level, is_active, joined_at, last_seen_at,
          users(id, name, email, avatar_url)
        ),
        document_operations(
          id, type, position, content, timestamp, user_id,
          users(id, name)
        ),
        document_cursors(
          user_id, position, selection, last_updated,
          users(id, name, avatar_url)
        ),
        document_comments(
          id, content, position, user_id, created_at, is_resolved,
          users(id, name, avatar_url),
          comment_replies(
            id, content, user_id, created_at,
            users(id, name, avatar_url)
          )
        )
      `)
      .eq('id', sessionId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch session details: ${error.message}`)
    }

    return {
      session: {
        ...sessionDetails,
        activeParticipants: sessionDetails.session_participants?.filter((p: any) => p.is_active) || [],
        recentOperations: sessionDetails.document_operations?.slice(-50) || [], // Last 50 operations
        activeCursors: sessionDetails.document_cursors || [],
        comments: sessionDetails.document_comments || []
      }
    }
  }
)

/**
 * POST /api/collaboration/sessions/{sessionId}/operations
 * Apply document operation (insert, delete, format, etc.)
 */
export const applyDocumentOperation = EnhancedHandlers.post(
  ApplyOperationSchema,
  {
    rateLimit: { requests: 200, window: '1m' }, // High rate limit for operations
    featureFlag: 'DOCUMENT_COLLABORATION',
    requireAuth: true
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    const { hasAccess } = await checkSessionAccess(
      supabase, 
      sessionId, 
      req.user!.id, 
      'editor'
    )

    if (!hasAccess) {
      throw new Error('Insufficient permissions to edit')
    }

    const operationData = req.validatedBody!

    // Apply operational transform
    const applyRequest: ApplyOperationRequest = {
      sessionId: sessionId as CollaborationSessionId,
      operation: operationData.operation as DocumentOperation,
      context: operationData.context
    }

    const result = await collaborationService.applyOperation(
      sessionId as CollaborationSessionId, 
      applyRequest
    )

    if (!result.success) {
      throw new Error(`Failed to apply operation: ${result.error}`)
    }

    return {
      operation: result.data.transformedOperation,
      newState: result.data.newDocumentState,
      conflicts: result.data.conflicts || [],
      version: result.data.documentVersion
    }
  }
)

/**
 * GET /api/collaboration/sessions/{sessionId}/operations
 * Get operation history with pagination
 */
export const getOperationHistory = EnhancedHandlers.get(
  {
    rateLimit: { requests: 50, window: '1m' },
    cache: { ttl: 60 },
    featureFlag: 'DOCUMENT_COLLABORATION',
    requireAuth: true
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    const { hasAccess } = await checkSessionAccess(
      supabase, 
      sessionId, 
      req.user!.id, 
      'viewer'
    )

    if (!hasAccess) {
      throw new Error('Session not found or access denied')
    }

    const offset = (page - 1) * limit

    const { data: operations, error, count } = await supabase
      .from('document_operations')
      .select(`
        *,
        users(id, name, avatar_url)
      `, { count: 'exact' })
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to fetch operations: ${error.message}`)
    }

    return {
      operations: operations || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  }
)

/**
 * POST /api/collaboration/sessions/{sessionId}/cursors
 * Update cursor position
 */
export const updateCursorPosition = EnhancedHandlers.post(
  UpdateCursorSchema,
  {
    rateLimit: { requests: 500, window: '1m' }, // Very high rate limit for cursor updates
    featureFlag: 'DOCUMENT_COLLABORATION',
    requireAuth: true
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    const { hasAccess } = await checkSessionAccess(
      supabase, 
      sessionId, 
      req.user!.id, 
      'viewer'
    )

    if (!hasAccess) {
      throw new Error('Session not found or access denied')
    }

    const cursorData = req.validatedBody!

    const updateRequest: UpdateCursorRequest = {
      sessionId: sessionId as CollaborationSessionId,
      userId: req.user!.id as UserId,
      position: cursorData.position as CursorPosition,
      selection: cursorData.selection,
      metadata: cursorData.metadata
    }

    const result = await collaborationService.updateCursor(
      sessionId as CollaborationSessionId,
      updateRequest
    )

    if (!result.success) {
      throw new Error(`Failed to update cursor: ${result.error}`)
    }

    return {
      cursor: result.data.cursor,
      activeCursors: result.data.activeCursors
    }
  }
)

/**
 * POST /api/collaboration/sessions/{sessionId}/comments
 * Add comment to document
 */
export const createComment = EnhancedHandlers.post(
  CreateCommentSchema,
  {
    rateLimit: { requests: 30, window: '1m' },
    featureFlag: 'DOCUMENT_COLLABORATION',
    requireAuth: true
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    const { hasAccess } = await checkSessionAccess(
      supabase, 
      sessionId, 
      req.user!.id, 
      'commenter'
    )

    if (!hasAccess) {
      throw new Error('Insufficient permissions to comment')
    }

    const commentData = req.validatedBody!

    const createRequest: CreateCommentRequest = {
      sessionId: sessionId as CollaborationSessionId,
      userId: req.user!.id as UserId,
      content: commentData.content,
      position: commentData.position,
      parentId: commentData.parentId,
      mentions: commentData.mentions,
      isResolved: commentData.isResolved,
      metadata: commentData.metadata
    }

    const result = await collaborationService.createComment(
      sessionId as CollaborationSessionId,
      createRequest
    )

    if (!result.success) {
      throw new Error(`Failed to create comment: ${result.error}`)
    }

    return {
      comment: result.data.comment,
      mentions: result.data.mentions || []
    }
  }
)

/**
 * POST /api/collaboration/sessions/{sessionId}/suggestions
 * Create suggestion for text improvement
 */
export const createSuggestion = EnhancedHandlers.post(
  CreateSuggestionSchema,
  {
    rateLimit: { requests: 20, window: '1m' },
    featureFlag: 'DOCUMENT_COLLABORATION',
    requireAuth: true
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      throw new Error('Session ID is required')
    }

    const { hasAccess } = await checkSessionAccess(
      supabase, 
      sessionId, 
      req.user!.id, 
      'commenter'
    )

    if (!hasAccess) {
      throw new Error('Insufficient permissions to suggest')
    }

    const suggestionData = req.validatedBody!

    const createRequest: CreateSuggestionRequest = {
      sessionId: sessionId as CollaborationSessionId,
      userId: req.user!.id as UserId,
      type: suggestionData.type,
      position: suggestionData.position,
      originalText: suggestionData.originalText,
      suggestedText: suggestionData.suggestedText,
      reason: suggestionData.reason,
      confidence: suggestionData.confidence,
      category: suggestionData.category,
      isAiGenerated: suggestionData.isAiGenerated,
      metadata: suggestionData.metadata
    }

    const result = await collaborationService.createSuggestion(
      sessionId as CollaborationSessionId,
      createRequest
    )

    if (!result.success) {
      throw new Error(`Failed to create suggestion: ${result.error}`)
    }

    return {
      suggestion: result.data.suggestion
    }
  }
)

/**
 * POST /api/collaboration/documents/{documentId}/branches
 * Create new document branch
 */
export const createDocumentBranch = EnhancedHandlers.post(
  CreateBranchSchema,
  {
    rateLimit: { requests: 10, window: '1m' },
    featureFlag: 'DOCUMENT_COLLABORATION',
    requireAuth: true
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      throw new Error('Document ID is required')
    }

    const branchData = req.validatedBody!

    const createRequest: BranchCreationRequest = {
      documentId: documentId as DocumentId,
      createdBy: req.user!.id as UserId,
      name: branchData.name,
      description: branchData.description,
      fromVersion: branchData.fromVersion,
      permissions: branchData.permissions
    }

    const result = await versionControlService.createBranch(
      documentId as DocumentId,
      createRequest
    )

    if (!result.success) {
      throw new Error(`Failed to create branch: ${result.error}`)
    }

    return {
      branch: result.data
    }
  }
)

/**
 * POST /api/collaboration/documents/{documentId}/merge-requests
 * Create merge request between branches
 */
export const createMergeRequest = EnhancedHandlers.post(
  CreateMergeRequestSchema,
  {
    rateLimit: { requests: 5, window: '1m' },
    featureFlag: 'DOCUMENT_COLLABORATION',
    requireAuth: true
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      throw new Error('Document ID is required')
    }

    const mergeData = req.validatedBody!

    const createRequest: MergeRequestCreationRequest = {
      documentId: documentId as DocumentId,
      createdBy: req.user!.id as UserId,
      sourceBranch: mergeData.sourceBranch,
      targetBranch: mergeData.targetBranch,
      title: mergeData.title,
      description: mergeData.description,
      reviewers: mergeData.reviewers,
      assignees: mergeData.assignees,
      labels: mergeData.labels,
      autoMerge: mergeData.autoMerge,
      deleteSourceBranch: mergeData.deleteSourceBranch
    }

    const result = await versionControlService.createMergeRequest(
      documentId as DocumentId,
      createRequest
    )

    if (!result.success) {
      throw new Error(`Failed to create merge request: ${result.error}`)
    }

    return {
      mergeRequest: result.data
    }
  }
)

/**
 * GET /api/collaboration/sessions
 * List collaboration sessions with filtering
 */
export const listCollaborationSessions = EnhancedHandlers.get(
  {
    validation: { query: SessionFiltersSchema },
    rateLimit: { requests: 50, window: '1m' },
    cache: { ttl: 120 },
    featureFlag: 'DOCUMENT_COLLABORATION',
    requireAuth: true
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const filters = req.validatedQuery!

    let query = supabase
      .from('collaboration_sessions')
      .select(`
        *,
        documents(id, title, organization_id),
        session_participants(user_id, permission_level, is_active),
        _count_participants:session_participants(count)
      `)
      .eq('is_active', true)

    // Apply filters
    if (filters.documentId) {
      query = query.eq('document_id', filters.documentId)
    }
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }
    if (filters.status) {
      const statusMap = {
        active: true,
        inactive: false,
        ended: false
      }
      query = query.eq('is_active', statusMap[filters.status])
    }

    // Filter by user access (participant or document owner)
    query = query.or(`
      session_participants.user_id.eq.${req.user!.id},
      documents.owner_id.eq.${req.user!.id}
    `)

    // Apply sorting
    const ascending = filters.sortOrder === 'asc'
    query = query.order(filters.sortBy, { ascending })

    // Apply pagination
    const offset = (filters.page - 1) * filters.limit
    query = query.range(offset, offset + filters.limit - 1)

    const { data: sessions, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`)
    }

    return {
      sessions: sessions?.map((session: any) => ({
        ...session,
        participantCount: session._count_participants?.[0]?.count || 0,
        activeParticipants: session.session_participants?.filter((p: any) => p.is_active).length || 0
      })) || [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit)
      }
    }
  }
)

// Export handlers with proper naming for Next.js App Router
export {
  createCollaborationSession as POST_collaboration_sessions,
  getCollaborationSession as GET_collaboration_session_by_id,
  applyDocumentOperation as POST_apply_operation,
  getOperationHistory as GET_operation_history,
  updateCursorPosition as POST_update_cursor,
  createComment as POST_create_comment,
  createSuggestion as POST_create_suggestion,
  createDocumentBranch as POST_create_branch,
  createMergeRequest as POST_create_merge_request,
  listCollaborationSessions as GET_collaboration_sessions
}