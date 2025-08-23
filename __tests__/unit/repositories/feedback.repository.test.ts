/**
 * @jest-environment jsdom
 */
import { FeedbackRepository } from '@/lib/repositories/feedback.repository'
import { success, failure } from '@/lib/repositories/result'
import { createSupabaseAdminClient } from '@/config/database.config'
import { FeedbackFactory } from '../../factories'
import { testAssertions, dbHelpers, mockAuthenticatedUser, testDataGenerators } from '../../utils/test-helpers'
import type { Database } from '@/types/database'

type FeedbackSubmission = Database['public']['Tables']['feedback_submissions']['Row']
type FeedbackSubmissionInsert = Database['public']['Tables']['feedback_submissions']['Insert']

// Mock Supabase client
jest.mock('@/config/database.config', () => ({
  createSupabaseAdminClient: jest.fn(),
}))

describe('FeedbackRepository', () => {
  let feedbackRepository: FeedbackRepository
  let mockSupabase: any
  let mockUser: any

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: mockAuthenticatedUser('test-user-id', 'director'),
    }

    // Mock getCurrentUserId method
    mockSupabase.getCurrentUserId = jest.fn().mockResolvedValue(success('test-user-id'))

    ;(createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    feedbackRepository = new FeedbackRepository(mockSupabase)

    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      full_name: 'Test User'
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create feedback submission successfully', async () => {
      const feedbackData = FeedbackFactory.build({
        title: 'Test Bug Report',
        description: 'Test description',
        type: 'bug',
        organization_id: 'org-123'
      })
      
      const expectedResult = { ...feedbackData, id: 'feedback-123' } as FeedbackSubmission

      mockSupabase.single.mockResolvedValue({
        data: expectedResult,
        error: null
      })

      // Mock the activity logging (assuming BaseRepository has this method)
      jest.spyOn(feedbackRepository as any, 'logActivity').mockResolvedValue(success(undefined))

      const result = await feedbackRepository.create(feedbackData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(expectedResult)
      }
      expect(mockSupabase.from).toHaveBeenCalledWith('feedback_submissions')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        ...feedbackData,
        user_id: 'test-user-id',
        status: 'submitted'
      })
    })

    it('should handle anonymous feedback (no user_id)', async () => {
      const feedbackData = FeedbackFactory.build({
        title: 'Anonymous Feedback',
        description: 'Anonymous description',
        type: 'other'
      })
      
      // Mock getCurrentUserId to return failure (no authentication)
      mockSupabase.getCurrentUserId = jest.fn().mockResolvedValue(failure({ message: 'Not authenticated' }))
      feedbackRepository = new FeedbackRepository(mockSupabase)
      
      const expectedResult = { ...feedbackData, id: 'feedback-124', user_id: null } as FeedbackSubmission

      mockSupabase.single.mockResolvedValue({
        data: expectedResult,
        error: null
      })

      const result = await feedbackRepository.create(feedbackData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.user_id).toBeNull()
      }
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        ...feedbackData,
        user_id: null,
        status: 'submitted'
      })
    })

    it('should validate required fields', async () => {
      const invalidFeedbackData = {
        title: '', // Invalid: empty title
        description: 'Valid description',
        type: 'bug'
      } as any

      // Mock validateRequired to return failure
      jest.spyOn(feedbackRepository as any, 'validateRequired').mockReturnValue(
        failure({ message: 'Title is required' })
      )

      const result = await feedbackRepository.create(invalidFeedbackData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Title is required')
      }
    })

    it('should handle database errors', async () => {
      const feedbackData = FeedbackFactory.build()

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'CONNECTION_ERROR' }
      })

      const result = await feedbackRepository.create(feedbackData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Database connection failed')
      }
    })
  })

  describe('findAll', () => {
    it('should return paginated feedback with filters', async () => {
      const feedbackList = FeedbackFactory.buildList(3)
      const mockResponse = {
        data: feedbackList.map((f, index) => ({ 
          ...f, 
          id: `feedback-${index}`,
          user: { id: 'user-123', email: 'user@example.com', full_name: 'Test User' }
        })),
        error: null,
        count: 3
      }

      mockSupabase.mockResolvedValue(mockResponse)

      const result = await feedbackRepository.findAll({
        type: 'bug',
        status: 'new',
        page: 1,
        limit: 10
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(3)
        expect(result.data.pagination.total).toBe(3)
        expect(result.data.pagination.page).toBe(1)
        expect(result.data.pagination.limit).toBe(10)
      }
      
      expect(mockSupabase.from).toHaveBeenCalledWith('feedback_submissions')
      expect(mockSupabase.eq).toHaveBeenCalledWith('type', 'bug')
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'new')
    })

    it('should apply default sorting by creation date', async () => {
      const feedbackList = FeedbackFactory.buildList(2)
      
      mockSupabase.mockResolvedValue({
        data: feedbackList,
        error: null,
        count: 2
      })

      await feedbackRepository.findAll()

      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should handle authentication failure', async () => {
      mockSupabase.getCurrentUserId = jest.fn().mockResolvedValue(failure({ message: 'Not authenticated' }))
      feedbackRepository = new FeedbackRepository(mockSupabase)

      const result = await feedbackRepository.findAll()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Not authenticated')
      }
    })
  })

  describe('findById', () => {
    it('should return feedback by ID with user details', async () => {
      const feedback = FeedbackFactory.build({ id: 'feedback-123' })
      const mockFeedbackWithUser = {
        ...feedback,
        user: { id: 'user-123', email: 'user@example.com', full_name: 'Test User' }
      }

      mockSupabase.single.mockResolvedValue({
        data: mockFeedbackWithUser,
        error: null
      })

      const result = await feedbackRepository.findById('feedback-123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('feedback-123')
        expect(result.data.user).toBeDefined()
      }
      
      expect(mockSupabase.from).toHaveBeenCalledWith('feedback_submissions')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'feedback-123')
    })

    it('should handle feedback not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found error
      })

      const result = await feedbackRepository.findById('non-existent-id')

      expect(result.success).toBe(false)
    })
  })

  describe('update', () => {
    it('should update feedback status successfully', async () => {
      const existingFeedback = FeedbackFactory.build({ 
        id: 'feedback-123',
        organization_id: 'org-123'
      })
      
      // Mock findById to return existing feedback
      jest.spyOn(feedbackRepository, 'findById').mockResolvedValue(success(existingFeedback as any))
      
      const updates = {
        status: 'in_progress' as const,
        priority: 'high' as const,
        admin_notes: 'Updated by admin'
      }
      
      const updatedFeedback = { ...existingFeedback, ...updates }

      mockSupabase.single.mockResolvedValue({
        data: updatedFeedback,
        error: null
      })

      jest.spyOn(feedbackRepository as any, 'logActivity').mockResolvedValue(success(undefined))

      const result = await feedbackRepository.update('feedback-123', updates)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('in_progress')
        expect(result.data.admin_notes).toBe('Updated by admin')
      }
      
      expect(mockSupabase.update).toHaveBeenCalledWith({
        ...updates,
        updated_at: expect.any(String),
        updated_by: 'test-user-id'
      })
    })

    it('should handle feedback not found during update', async () => {
      jest.spyOn(feedbackRepository, 'findById').mockResolvedValue(
        failure({ message: 'Feedback not found' })
      )

      const result = await feedbackRepository.update('non-existent-id', { status: 'resolved' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Feedback not found')
      }
    })
  })

  describe('delete', () => {
    it('should delete feedback successfully', async () => {
      const existingFeedback = FeedbackFactory.build({ 
        id: 'feedback-123',
        organization_id: 'org-123'
      })
      
      jest.spyOn(feedbackRepository, 'findById').mockResolvedValue(success(existingFeedback as any))

      mockSupabase.mockResolvedValue({ error: null })

      jest.spyOn(feedbackRepository as any, 'logActivity').mockResolvedValue(success(undefined))

      const result = await feedbackRepository.delete('feedback-123')

      expect(result.success).toBe(true)
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'feedback-123')
    })

    it('should handle feedback not found during delete', async () => {
      jest.spyOn(feedbackRepository, 'findById').mockResolvedValue(
        failure({ message: 'Feedback not found' })
      )

      const result = await feedbackRepository.delete('non-existent-id')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Feedback not found')
      }
    })
  })

  describe('findByUser', () => {
    it('should return feedback for specific user', async () => {
      const userFeedback = FeedbackFactory.buildList(2, { user_id: 'target-user-id' })

      mockSupabase.mockResolvedValue({
        data: userFeedback,
        error: null,
        count: 2
      })

      const result = await feedbackRepository.findByUser('target-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(2)
        result.data.data.forEach(feedback => {
          expect(feedback.user_id).toBe('target-user-id')
        })
      }

      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'target-user-id')
    })

    it('should apply default ordering', async () => {
      mockSupabase.mockResolvedValue({ data: [], error: null, count: 0 })

      await feedbackRepository.findByUser('user-id')

      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })
  })

  describe('getStatistics', () => {
    it('should return feedback statistics', async () => {
      const mockFeedbackData = [
        { status: 'new', type: 'bug', priority: 'high', created_at: new Date().toISOString() },
        { status: 'resolved', type: 'feature', priority: 'medium', created_at: new Date().toISOString() },
        { status: 'new', type: 'bug', priority: null, created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
      ]

      mockSupabase.mockResolvedValue({
        data: mockFeedbackData,
        error: null
      })

      const result = await feedbackRepository.getStatistics('org-123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.total).toBe(3)
        expect(result.data.by_status.new).toBe(2)
        expect(result.data.by_status.resolved).toBe(1)
        expect(result.data.by_type.bug).toBe(2)
        expect(result.data.by_type.feature).toBe(1)
        expect(result.data.by_priority.high).toBe(1)
        expect(result.data.by_priority.medium).toBe(1)
        expect(result.data.recent_count).toBe(2)
      }

      expect(mockSupabase.select).toHaveBeenCalledWith('status, type, priority, created_at')
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-123')
    })

    it('should handle empty statistics', async () => {
      mockSupabase.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await feedbackRepository.getStatistics()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.total).toBe(0)
        expect(result.data.recent_count).toBe(0)
      }
    })
  })

  describe('resolve', () => {
    it('should resolve feedback with resolution notes', async () => {
      const existingFeedback = FeedbackFactory.build({ id: 'feedback-123' })
      const resolvedFeedback = { ...existingFeedback, status: 'resolved', resolution_notes: 'Fixed the issue' }

      jest.spyOn(feedbackRepository, 'update').mockResolvedValue(success(resolvedFeedback as any))

      const result = await feedbackRepository.resolve('feedback-123', 'Fixed the issue')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('resolved')
        expect(result.data.resolution_notes).toBe('Fixed the issue')
      }

      expect(feedbackRepository.update).toHaveBeenCalledWith('feedback-123', {
        status: 'resolved',
        resolution_notes: 'Fixed the issue',
        assigned_to: 'test-user-id'
      })
    })
  })

  describe('assign', () => {
    it('should assign feedback to user', async () => {
      const existingFeedback = FeedbackFactory.build({ id: 'feedback-123' })
      const assignedFeedback = { ...existingFeedback, assigned_to: 'admin-user-id', status: 'in_progress' }

      jest.spyOn(feedbackRepository, 'update').mockResolvedValue(success(assignedFeedback as any))

      const result = await feedbackRepository.assign('feedback-123', 'admin-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.assigned_to).toBe('admin-user-id')
        expect(result.data.status).toBe('in_progress')
      }

      expect(feedbackRepository.update).toHaveBeenCalledWith('feedback-123', {
        assigned_to: 'admin-user-id',
        status: 'in_progress'
      })
    })
  })

  describe('Entity Name and Search Fields', () => {
    it('should return correct entity name', () => {
      const entityName = (feedbackRepository as any).getEntityName()
      expect(entityName).toBe('Feedback')
    })

    it('should return correct search fields', () => {
      const searchFields = (feedbackRepository as any).getSearchFields()
      expect(searchFields).toEqual(['title', 'description', 'category', 'type'])
    })
  })

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      const feedbackData = FeedbackFactory.build()

      // Simulate an internal error
      jest.spyOn(feedbackRepository as any, 'validateRequired').mockImplementation(() => {
        throw new Error('Internal validation error')
      })

      const result = await feedbackRepository.create(feedbackData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create feedback')
      }
    })

    it('should handle Supabase connection errors', async () => {
      mockSupabase.mockRejectedValue(new Error('Connection timeout'))

      const result = await feedbackRepository.findAll()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Failed to find feedback submissions')
      }
    })
  })

  describe('Activity Logging', () => {
    it('should log activity for authenticated users', async () => {
      const feedbackData = FeedbackFactory.build({
        organization_id: 'org-123',
        title: 'Test Activity Log'
      })
      
      const createdFeedback = { ...feedbackData, id: 'feedback-123' } as FeedbackSubmission

      mockSupabase.single.mockResolvedValue({
        data: createdFeedback,
        error: null
      })

      const mockLogActivity = jest.spyOn(feedbackRepository as any, 'logActivity').mockResolvedValue(success(undefined))

      await feedbackRepository.create(feedbackData)

      expect(mockLogActivity).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        organization_id: 'org-123',
        event_type: 'feedback.submitted',
        event_category: 'user_engagement',
        action: 'create',
        resource_type: 'feedback',
        resource_id: 'feedback-123',
        event_description: 'Submitted feedback: Test Activity Log',
        outcome: 'success',
        severity: 'low'
      })
    })

    it('should not log activity for anonymous feedback', async () => {
      const feedbackData = FeedbackFactory.build({
        title: 'Anonymous Feedback'
      })
      
      mockSupabase.getCurrentUserId = jest.fn().mockResolvedValue(failure({ message: 'Not authenticated' }))
      feedbackRepository = new FeedbackRepository(mockSupabase)
      
      const createdFeedback = { ...feedbackData, id: 'feedback-124', user_id: null } as FeedbackSubmission

      mockSupabase.single.mockResolvedValue({
        data: createdFeedback,
        error: null
      })

      const mockLogActivity = jest.spyOn(feedbackRepository as any, 'logActivity').mockResolvedValue(success(undefined))

      await feedbackRepository.create(feedbackData)

      expect(mockLogActivity).not.toHaveBeenCalled()
    })
  })
})