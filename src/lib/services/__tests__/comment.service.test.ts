/**
 * Comment Service Unit Tests
 * Following CLAUDE.md testing guidelines with 80% coverage target
 */

import { CommentService } from '../comment.service'
import { Result } from '../../core/result'
import type { 
  Comment, 
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentThread,
  UserId,
  OrganizationId,
  ThreadId,
  CommentId
} from '../../../types/database'

// Mock dependencies
jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn(),
    })),
    rpc: jest.fn(),
  },
}))

jest.mock('../websocket.service', () => ({
  WebSocketService: {
    getInstance: jest.fn(() => ({
      emit: jest.fn(),
      emitToRoom: jest.fn(),
    })),
  },
}))

const mockSupabase = require('../../supabase').supabase
const mockWebSocketService = require('../websocket.service').WebSocketService

describe('CommentService', () => {
  let commentService: CommentService
  const mockUserId = 'user-123' as UserId
  const mockOrganizationId = 'org-456' as OrganizationId
  const mockThreadId = 'thread-789' as ThreadId
  const mockCommentId = 'comment-101' as CommentId

  const mockComment: Comment = {
    id: mockCommentId,
    threadId: mockThreadId,
    threadDepth: 0,
    content: 'Test comment content',
    contentType: 'text',
    authorId: mockUserId,
    authorName: 'Test User',
    authorEmail: 'test@example.com',
    authorAvatar: null,
    mentions: [],
    reactions: [],
    attachments: [],
    isEdited: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    editedAt: null,
    deletedAt: null,
  }

  const mockThread: CommentThread = {
    id: mockThreadId,
    contextType: 'asset',
    contextId: 'asset-123',
    organizationId: mockOrganizationId,
    title: 'Test Thread',
    description: null,
    status: 'active',
    isLocked: false,
    isPinned: false,
    commentsCount: 1,
    participantsCount: 1,
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    commentService = new CommentService()
    jest.clearAllMocks()
  })

  describe('createComment', () => {
    const mockRequest: CreateCommentRequest = {
      threadId: mockThreadId,
      content: 'New comment content',
      contentType: 'text',
      parentCommentId: null,
      mentions: [],
      attachments: [],
    }

    it('should successfully create a comment', async () => {
      // Mock successful database operations
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'comment_threads') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockThread,
              error: null,
            }),
          }
        }
        if (table === 'enhanced_comments') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockComment,
              error: null,
            }),
          }
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockThread, commentsCount: 2 },
            error: null,
          }),
        }
      })

      const mockWsInstance = { emit: jest.fn(), emitToRoom: jest.fn() }
      mockWebSocketService.getInstance.mockReturnValue(mockWsInstance)

      const result = await commentService.createComment(
        mockUserId,
        mockOrganizationId,
        mockRequest
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mockComment)
      }

      // Verify WebSocket events
      expect(mockWsInstance.emitToRoom).toHaveBeenCalledWith(
        `thread_${mockThreadId}`,
        'comment:created',
        expect.objectContaining({
          comment: mockComment,
          threadId: mockThreadId,
        })
      )
    })

    it('should handle missing thread error', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Thread not found' },
        }),
      }))

      const result = await commentService.createComment(
        mockUserId,
        mockOrganizationId,
        mockRequest
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('thread not found')
      }
    })

    it('should validate comment content length', async () => {
      const invalidRequest: CreateCommentRequest = {
        ...mockRequest,
        content: 'x'.repeat(10001), // Exceeds max length
      }

      const result = await commentService.createComment(
        mockUserId,
        mockOrganizationId,
        invalidRequest
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('content length')
      }
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockThread,
          error: null,
        }),
      }))

      // Simulate insert error
      mockSupabase.from.mockImplementationOnce((table: string) => {
        if (table === 'enhanced_comments') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }
        }
      })

      const result = await commentService.createComment(
        mockUserId,
        mockOrganizationId,
        mockRequest
      )

      expect(result.success).toBe(false)
    })
  })

  describe('updateComment', () => {
    const mockRequest: UpdateCommentRequest = {
      content: 'Updated comment content',
      mentions: [],
    }

    it('should successfully update a comment', async () => {
      const updatedComment = {
        ...mockComment,
        content: mockRequest.content,
        isEdited: true,
        editedAt: new Date(),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'enhanced_comments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValueOnce({
              data: mockComment,
              error: null,
            }).mockResolvedValueOnce({
              data: updatedComment,
              error: null,
            }),
            update: jest.fn().mockReturnThis(),
          }
        }
      })

      const mockWsInstance = { emitToRoom: jest.fn() }
      mockWebSocketService.getInstance.mockReturnValue(mockWsInstance)

      const result = await commentService.updateComment(
        mockUserId,
        mockCommentId,
        mockRequest
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe(mockRequest.content)
        expect(result.data.isEdited).toBe(true)
      }

      expect(mockWsInstance.emitToRoom).toHaveBeenCalledWith(
        `thread_${mockThreadId}`,
        'comment:updated',
        expect.objectContaining({
          comment: updatedComment,
        })
      )
    })

    it('should prevent unauthorized updates', async () => {
      const unauthorizedComment = {
        ...mockComment,
        authorId: 'different-user' as UserId,
      }

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: unauthorizedComment,
          error: null,
        }),
      }))

      const result = await commentService.updateComment(
        mockUserId,
        mockCommentId,
        mockRequest
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('permission')
      }
    })
  })

  describe('deleteComment', () => {
    it('should soft delete a comment', async () => {
      const deletedComment = {
        ...mockComment,
        isDeleted: true,
        deletedAt: new Date(),
      }

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockComment,
          error: null,
        }).mockResolvedValueOnce({
          data: deletedComment,
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      }))

      const mockWsInstance = { emitToRoom: jest.fn() }
      mockWebSocketService.getInstance.mockReturnValue(mockWsInstance)

      const result = await commentService.deleteComment(mockUserId, mockCommentId)

      expect(result.success).toBe(true)
      expect(mockWsInstance.emitToRoom).toHaveBeenCalledWith(
        `thread_${mockThreadId}`,
        'comment:deleted',
        expect.objectContaining({
          commentId: mockCommentId,
        })
      )
    })

    it('should prevent unauthorized deletions', async () => {
      const unauthorizedComment = {
        ...mockComment,
        authorId: 'different-user' as UserId,
      }

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: unauthorizedComment,
          error: null,
        }),
      }))

      const result = await commentService.deleteComment(mockUserId, mockCommentId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('permission')
      }
    })
  })

  describe('getCommentsByThread', () => {
    const mockComments = [
      mockComment,
      { ...mockComment, id: 'comment-102' as CommentId, threadDepth: 1 },
    ]

    it('should retrieve comments with proper threading', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockComments,
          error: null,
          count: mockComments.length,
        }),
      }))

      const result = await commentService.getCommentsByThread(
        mockUserId,
        mockThreadId,
        { page: 1, limit: 50 }
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.comments).toHaveLength(2)
        expect(result.data.pagination.total).toBe(2)
      }
    })

    it('should handle pagination correctly', async () => {
      const paginationOptions = { page: 2, limit: 1 }

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockComments[1]],
          error: null,
          count: mockComments.length,
        }),
      }))

      const result = await commentService.getCommentsByThread(
        mockUserId,
        mockThreadId,
        paginationOptions
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.pagination.page).toBe(2)
        expect(result.data.pagination.limit).toBe(1)
        expect(result.data.pagination.hasNext).toBe(false)
      }
    })
  })

  describe('addReaction', () => {
    const reactionType = '👍'

    it('should add reaction to comment', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'enhanced_comments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockComment,
              error: null,
            }),
          }
        }
        return {
          upsert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockResolvedValue({
            data: [{ id: 'reaction-1', type: reactionType }],
            error: null,
          }),
        }
      })

      const mockWsInstance = { emitToRoom: jest.fn() }
      mockWebSocketService.getInstance.mockReturnValue(mockWsInstance)

      const result = await commentService.addReaction(
        mockUserId,
        mockCommentId,
        reactionType
      )

      expect(result.success).toBe(true)
      expect(mockWsInstance.emitToRoom).toHaveBeenCalledWith(
        `thread_${mockThreadId}`,
        'reaction:added',
        expect.any(Object)
      )
    })
  })

  describe('processMentions', () => {
    it('should process and validate mentions', async () => {
      const content = 'Hello @testuser and @admin, please review this'
      const mentions = [
        { username: 'testuser', userId: 'user-1' as UserId },
        { username: 'admin', userId: 'user-2' as UserId },
      ]

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { id: 'user-1', username: 'testuser', full_name: 'Test User' },
            { id: 'user-2', username: 'admin', full_name: 'Admin User' },
          ],
          error: null,
        }),
      }))

      const result = await commentService.processMentions(
        mockOrganizationId,
        content,
        mentions
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].isValid).toBe(true)
        expect(result.data[1].isValid).toBe(true)
      }
    })

    it('should mark invalid mentions', async () => {
      const content = 'Hello @nonexistentuser'
      const mentions = [{ username: 'nonexistentuser', userId: null }]

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }))

      const result = await commentService.processMentions(
        mockOrganizationId,
        content,
        mentions
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].isValid).toBe(false)
      }
    })
  })

  describe('Error Handling', () => {
    it('should wrap service errors in Result pattern', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const result = await commentService.createComment(
        mockUserId,
        mockOrganizationId,
        {
          threadId: mockThreadId,
          content: 'Test',
          contentType: 'text',
          parentCommentId: null,
          mentions: [],
          attachments: [],
        }
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBeDefined()
        expect(result.error.message).toContain('Database connection failed')
      }
    })
  })

  describe('Performance', () => {
    it('should handle large comment threads efficiently', async () => {
      const largeCommentSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockComment,
        id: `comment-${i}` as CommentId,
      }))

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: largeCommentSet.slice(0, 50), // Paginated
          error: null,
          count: largeCommentSet.length,
        }),
      }))

      const startTime = Date.now()
      const result = await commentService.getCommentsByThread(
        mockUserId,
        mockThreadId,
        { page: 1, limit: 50 }
      )
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(1000) // Should be fast
      if (result.success) {
        expect(result.data.comments).toHaveLength(50) // Properly paginated
      }
    })
  })
})