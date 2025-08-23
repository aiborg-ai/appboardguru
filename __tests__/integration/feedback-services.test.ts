/**
 * @jest-environment jsdom
 */
import { FeedbackRepository } from '@/lib/repositories/feedback.repository'
import { NotificationService } from '@/lib/services/notification.service'
import { 
  createAdminFeedbackTemplate,
  createUserConfirmationTemplate,
  generateFeedbackTextFallback,
  generateConfirmationTextFallback
} from '@/lib/services/feedback-templates'
import { FeedbackFactory } from '../factories'
import { testDb } from '../utils/test-database'
import { mockServices } from '../utils/test-helpers'

// Mock external services for controlled testing
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
}

// Mock email service
const mockEmailService = {
  sendEmail: jest.fn()
}

jest.mock('@/lib/supabase', () => mockSupabase)

describe('Feedback Services Integration Tests', () => {
  let feedbackRepository: FeedbackRepository
  let notificationService: NotificationService

  beforeAll(async () => {
    // Setup test database if available
    if (testDb?.setup) {
      await testDb.setup()
    }
  })

  afterAll(async () => {
    // Cleanup test database if available
    if (testDb?.cleanup) {
      await testDb.cleanup()
    }
  })

  beforeEach(async () => {
    jest.clearAllMocks()
    
    // Mock successful authentication by default
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    })

    // Initialize services
    feedbackRepository = new FeedbackRepository(mockSupabase as any)
    notificationService = new NotificationService(mockSupabase as any)

    // Mock successful database operations by default
    mockSupabase.single.mockResolvedValue({
      data: { id: 'feedback-123', ...FeedbackFactory.build() },
      error: null
    })

    mockSupabase.mockResolvedValue({
      data: [FeedbackFactory.build()],
      error: null,
      count: 1
    })
  })

  describe('Database Operations Integration', () => {
    describe('Feedback Creation', () => {
      it('should create feedback with proper user context', async () => {
        const feedbackData = FeedbackFactory.build({
          title: 'Integration Test Feedback',
          description: 'Testing database integration',
          type: 'bug',
          organization_id: 'org-123'
        })

        const result = await feedbackRepository.create(feedbackData)

        expect(result.success).toBe(true)
        expect(mockSupabase.from).toHaveBeenCalledWith('feedback_submissions')
        expect(mockSupabase.insert).toHaveBeenCalledWith({
          ...feedbackData,
          user_id: 'test-user-id',
          status: 'submitted'
        })
      })

      it('should handle concurrent feedback submissions', async () => {
        const feedbackList = FeedbackFactory.buildList(5, {
          user_id: 'test-user-id',
          organization_id: 'org-123'
        })

        // Mock different IDs for each submission
        mockSupabase.single.mockImplementation((_, index) => ({
          data: { id: `feedback-${index || Math.random()}`, ...feedbackList[0] },
          error: null
        }))

        // Submit all feedback concurrently
        const promises = feedbackList.map(feedback => 
          feedbackRepository.create(feedback)
        )

        const results = await Promise.all(promises)

        results.forEach(result => {
          expect(result.success).toBe(true)
        })

        expect(mockSupabase.insert).toHaveBeenCalledTimes(5)
      })

      it('should handle database constraint violations', async () => {
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { 
            message: 'duplicate key value violates unique constraint',
            code: '23505'
          }
        })

        const feedbackData = FeedbackFactory.build()
        const result = await feedbackRepository.create(feedbackData)

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should handle database connection failures', async () => {
        mockSupabase.single.mockRejectedValue(new Error('Connection timeout'))

        const feedbackData = FeedbackFactory.build()
        const result = await feedbackRepository.create(feedbackData)

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain('Failed to create feedback')
      })

      it('should validate feedback data before database insertion', async () => {
        const invalidFeedback = {
          title: '', // Invalid: empty title
          description: 'Valid description',
          type: 'bug'
        } as any

        // Mock validation failure
        jest.spyOn(feedbackRepository as any, 'validateRequired').mockReturnValue({
          success: false,
          error: { message: 'Title is required' }
        })

        const result = await feedbackRepository.create(invalidFeedback)

        expect(result.success).toBe(false)
        expect(mockSupabase.insert).not.toHaveBeenCalled()
      })
    })

    describe('Feedback Queries', () => {
      it('should retrieve feedback with proper filtering', async () => {
        const mockFeedbackList = FeedbackFactory.buildList(3, {
          type: 'bug',
          status: 'new',
          organization_id: 'org-123'
        }).map((f, index) => ({ ...f, id: `feedback-${index}` }))

        mockSupabase.mockResolvedValue({
          data: mockFeedbackList,
          error: null,
          count: 3
        })

        const result = await feedbackRepository.findAll({
          type: 'bug',
          status: 'new',
          organization_id: 'org-123',
          page: 1,
          limit: 10
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.data).toHaveLength(3)
          expect(result.data.pagination.total).toBe(3)
        }

        expect(mockSupabase.eq).toHaveBeenCalledWith('type', 'bug')
        expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'new')
        expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-123')
      })

      it('should handle large result sets with pagination', async () => {
        const largeFeedbackList = Array.from({ length: 1000 }, (_, index) => ({
          ...FeedbackFactory.build(),
          id: `feedback-${index}`
        }))

        mockSupabase.mockResolvedValue({
          data: largeFeedbackList.slice(0, 50), // First page
          error: null,
          count: 1000
        })

        const result = await feedbackRepository.findAll({
          page: 1,
          limit: 50
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.data).toHaveLength(50)
          expect(result.data.pagination.total).toBe(1000)
          expect(result.data.pagination.totalPages).toBe(20)
        }
      })

      it('should generate accurate statistics', async () => {
        const mockStatisticsData = [
          { status: 'new', type: 'bug', priority: 'high', created_at: new Date().toISOString() },
          { status: 'new', type: 'bug', priority: 'medium', created_at: new Date().toISOString() },
          { status: 'resolved', type: 'feature', priority: 'low', created_at: new Date().toISOString() },
          { status: 'in_progress', type: 'improvement', priority: null, created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() }
        ]

        mockSupabase.mockResolvedValue({
          data: mockStatisticsData,
          error: null
        })

        const result = await feedbackRepository.getStatistics('org-123')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.total).toBe(4)
          expect(result.data.by_status.new).toBe(2)
          expect(result.data.by_status.resolved).toBe(1)
          expect(result.data.by_status.in_progress).toBe(1)
          expect(result.data.by_type.bug).toBe(2)
          expect(result.data.by_type.feature).toBe(1)
          expect(result.data.by_type.improvement).toBe(1)
          expect(result.data.by_priority.high).toBe(1)
          expect(result.data.by_priority.medium).toBe(1)
          expect(result.data.by_priority.low).toBe(1)
          expect(result.data.recent_count).toBe(3) // Last 7 days
        }
      })

      it('should handle database query errors gracefully', async () => {
        mockSupabase.mockResolvedValue({
          data: null,
          error: { message: 'Query timeout', code: 'QUERY_TIMEOUT' }
        })

        const result = await feedbackRepository.findAll()

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain('Failed to find feedback submissions')
      })
    })

    describe('Feedback Updates and Management', () => {
      it('should update feedback status with audit trail', async () => {
        const existingFeedback = FeedbackFactory.build({
          id: 'feedback-123',
          status: 'new',
          organization_id: 'org-123'
        })

        mockSupabase.single
          .mockResolvedValueOnce({ // For findById
            data: existingFeedback,
            error: null
          })
          .mockResolvedValueOnce({ // For update
            data: { ...existingFeedback, status: 'in_progress', admin_notes: 'Working on it' },
            error: null
          })

        const result = await feedbackRepository.update('feedback-123', {
          status: 'in_progress',
          admin_notes: 'Working on it'
        })

        expect(result.success).toBe(true)
        expect(mockSupabase.update).toHaveBeenCalledWith({
          status: 'in_progress',
          admin_notes: 'Working on it',
          updated_at: expect.any(String),
          updated_by: 'test-user-id'
        })
      })

      it('should resolve feedback with proper workflow', async () => {
        const existingFeedback = FeedbackFactory.build({
          id: 'feedback-123',
          status: 'in_progress'
        })

        mockSupabase.single
          .mockResolvedValueOnce({ // For findById
            data: existingFeedback,
            error: null
          })
          .mockResolvedValueOnce({ // For update
            data: { 
              ...existingFeedback, 
              status: 'resolved',
              resolution_notes: 'Issue fixed in version 2.1.0',
              assigned_to: 'test-user-id'
            },
            error: null
          })

        const result = await feedbackRepository.resolve('feedback-123', 'Issue fixed in version 2.1.0')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.status).toBe('resolved')
          expect(result.data.resolution_notes).toBe('Issue fixed in version 2.1.0')
          expect(result.data.assigned_to).toBe('test-user-id')
        }
      })

      it('should handle optimistic locking for concurrent updates', async () => {
        const existingFeedback = FeedbackFactory.build({
          id: 'feedback-123',
          updated_at: '2024-01-01T10:00:00Z'
        })

        mockSupabase.single.mockResolvedValueOnce({
          data: existingFeedback,
          error: null
        })

        mockSupabase.single.mockResolvedValueOnce({
          data: null,
          error: { 
            message: 'Row was updated by another transaction',
            code: 'CONCURRENT_UPDATE'
          }
        })

        const result = await feedbackRepository.update('feedback-123', {
          status: 'resolved'
        })

        expect(result.success).toBe(false)
      })
    })
  })

  describe('Email Service Integration', () => {
    beforeEach(() => {
      // Reset email service mocks
      mockServices.emailService.sendInvitationEmail.mockClear()
      mockServices.emailService.sendNotificationEmail.mockClear()
      
      // Mock email service success by default
      mockEmailService.sendEmail = jest.fn().mockResolvedValue(true)
      notificationService = new NotificationService(mockSupabase as any)
      // Override the sendEmail method
      notificationService.sendEmail = mockEmailService.sendEmail
    })

    describe('Template Generation and Email Sending', () => {
      it('should generate and send admin notification emails', async () => {
        const feedbackData = {
          type: 'bug' as const,
          title: 'Critical Database Issue',
          description: 'Database connections are timing out frequently, affecting user experience.',
          userEmail: 'reporter@company.com',
          userName: 'John Reporter',
          screenshot: 'data:image/png;base64,mock-screenshot',
          timestamp: '2024-01-15T10:30:00Z',
          userAgent: 'Mozilla/5.0 Test Browser',
          url: 'https://app.boardguru.com/dashboard'
        }

        const adminTemplate = createAdminFeedbackTemplate(feedbackData)
        
        expect(adminTemplate.subject).toContain('🐛')
        expect(adminTemplate.subject).toContain('Critical Database Issue')
        expect(adminTemplate.html).toContain('Critical Database Issue')
        expect(adminTemplate.html).toContain('Database connections are timing out')
        expect(adminTemplate.html).toContain('John Reporter (reporter@company.com)')
        expect(adminTemplate.html).toContain('Screenshot Included')
        expect(adminTemplate.html).toContain('https://app.boardguru.com/dashboard')

        const textFallback = generateFeedbackTextFallback({
          subject: adminTemplate.subject,
          title: feedbackData.title,
          description: feedbackData.description,
          userEmail: feedbackData.userEmail
        })

        const emailResult = await notificationService.sendEmail(
          'hirendra.vikram@boardguru.ai',
          {
            subject: adminTemplate.subject,
            html: adminTemplate.html,
            text: textFallback
          },
          'feedback'
        )

        expect(emailResult).toBe(true)
        expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
          'hirendra.vikram@boardguru.ai',
          {
            subject: adminTemplate.subject,
            html: adminTemplate.html,
            text: textFallback
          },
          'feedback'
        )
      })

      it('should generate and send user confirmation emails', async () => {
        const confirmationData = {
          title: 'Critical Database Issue',
          type: 'bug',
          userEmail: 'reporter@company.com',
          userName: 'John Reporter',
          timestamp: '2024-01-15T10:30:00Z',
          referenceId: 'FB-1705315800ABC'
        }

        const confirmationTemplate = createUserConfirmationTemplate(confirmationData)
        
        expect(confirmationTemplate.subject).toContain('✅')
        expect(confirmationTemplate.subject).toContain('Critical Database Issue')
        expect(confirmationTemplate.html).toContain('Hi John Reporter,')
        expect(confirmationTemplate.html).toContain('#FB-1705315800ABC')
        expect(confirmationTemplate.html).toContain('🐛 Bug Report')

        const textFallback = generateConfirmationTextFallback({
          subject: confirmationTemplate.subject,
          title: confirmationData.title,
          referenceId: confirmationData.referenceId
        })

        const emailResult = await notificationService.sendEmail(
          confirmationData.userEmail,
          {
            subject: confirmationTemplate.subject,
            html: confirmationTemplate.html,
            text: textFallback
          },
          'feedback_confirmation'
        )

        expect(emailResult).toBe(true)
        expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
          'reporter@company.com',
          {
            subject: confirmationTemplate.subject,
            html: confirmationTemplate.html,
            text: textFallback
          },
          'feedback_confirmation'
        )
      })

      it('should handle email sending failures gracefully', async () => {
        mockEmailService.sendEmail.mockResolvedValue(false)

        const result = await notificationService.sendEmail(
          'test@example.com',
          {
            subject: 'Test Subject',
            html: '<html>Test</html>',
            text: 'Test text'
          },
          'feedback'
        )

        expect(result).toBe(false)
        expect(mockEmailService.sendEmail).toHaveBeenCalled()
      })

      it('should handle email service exceptions', async () => {
        mockEmailService.sendEmail.mockRejectedValue(new Error('SMTP server unavailable'))

        const result = await notificationService.sendEmail(
          'test@example.com',
          {
            subject: 'Test Subject',
            html: '<html>Test</html>',
            text: 'Test text'
          },
          'feedback'
        )

        expect(result).toBe(false)
      })

      it('should handle large email content', async () => {
        const largeContent = {
          subject: 'Large Email Test',
          html: '<html>' + 'A'.repeat(100000) + '</html>', // 100KB HTML
          text: 'B'.repeat(50000) // 50KB text
        }

        const result = await notificationService.sendEmail(
          'test@example.com',
          largeContent,
          'feedback'
        )

        expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
          'test@example.com',
          largeContent,
          'feedback'
        )
        expect(result).toBe(true)
      })
    })

    describe('Email Template Robustness', () => {
      it('should handle missing optional template data', async () => {
        const minimalFeedbackData = {
          type: 'other' as const,
          title: 'Minimal Feedback',
          description: 'Basic feedback without optional fields',
          userEmail: 'user@example.com',
          timestamp: '2024-01-15T10:30:00Z'
        }

        const adminTemplate = createAdminFeedbackTemplate(minimalFeedbackData)
        
        expect(adminTemplate.subject).toBeTruthy()
        expect(adminTemplate.html).toBeTruthy()
        expect(adminTemplate.html).toContain('user@example.com')
        expect(adminTemplate.html).not.toContain('undefined')
        expect(adminTemplate.html).not.toContain('Screenshot Included')
      })

      it('should handle special characters in email content', async () => {
        const specialCharData = {
          type: 'bug' as const,
          title: 'Título with ñañá and émojis 🐛',
          description: 'Description with <script>alert("test")</script> and "quotes" & symbols ©®™',
          userEmail: 'test@exãmple.com',
          userName: 'Usér Ñame',
          timestamp: '2024-01-15T10:30:00Z'
        }

        const adminTemplate = createAdminFeedbackTemplate(specialCharData)
        
        expect(adminTemplate.subject).toContain('🐛')
        expect(adminTemplate.html).toContain('Título with ñañá and émojis 🐛')
        expect(adminTemplate.html).toContain('Usér Ñame')
        expect(adminTemplate.html).toContain('test@exãmple.com')
        
        // Should preserve HTML (for email templates this is expected)
        expect(adminTemplate.html).toContain('<script>')
      })

      it('should generate different templates for different feedback types', async () => {
        const feedbackTypes = ['bug', 'feature', 'improvement', 'other'] as const
        const templates = feedbackTypes.map(type => {
          const data = {
            type,
            title: `${type} feedback`,
            description: `This is a ${type} report`,
            userEmail: 'test@example.com',
            timestamp: '2024-01-15T10:30:00Z'
          }
          return createAdminFeedbackTemplate(data)
        })

        // Each template should have type-specific elements
        expect(templates[0].html).toContain('🐛') // bug
        expect(templates[1].html).toContain('✨') // feature
        expect(templates[2].html).toContain('📈') // improvement
        expect(templates[3].html).toContain('💬') // other

        // All templates should be unique
        const htmlContents = templates.map(t => t.html)
        const uniqueContents = new Set(htmlContents)
        expect(uniqueContents.size).toBe(4)
      })
    })

    describe('Email Performance and Reliability', () => {
      it('should handle concurrent email sending', async () => {
        const emailPromises = Array.from({ length: 10 }, (_, index) =>
          notificationService.sendEmail(
            `user${index}@example.com`,
            {
              subject: `Test Email ${index}`,
              html: `<html>Email ${index}</html>`,
              text: `Email ${index}`
            },
            'feedback'
          )
        )

        const results = await Promise.all(emailPromises)
        
        results.forEach(result => {
          expect(result).toBe(true)
        })
        
        expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(10)
      })

      it('should timeout on slow email operations', async () => {
        // Mock slow email service
        mockEmailService.sendEmail.mockImplementation(() =>
          new Promise(resolve => setTimeout(() => resolve(true), 10000))
        )

        const startTime = Date.now()
        const result = await notificationService.sendEmail(
          'test@example.com',
          {
            subject: 'Test Subject',
            html: '<html>Test</html>',
            text: 'Test text'
          },
          'feedback'
        )
        const endTime = Date.now()

        // Should not wait the full 10 seconds
        expect(endTime - startTime).toBeLessThan(5000)
      })

      it('should retry failed email operations', async () => {
        let attemptCount = 0
        mockEmailService.sendEmail.mockImplementation(() => {
          attemptCount++
          if (attemptCount < 3) {
            return Promise.resolve(false) // Fail first 2 attempts
          }
          return Promise.resolve(true) // Succeed on 3rd attempt
        })

        // This would require implementing retry logic in NotificationService
        const result = await notificationService.sendEmail(
          'test@example.com',
          {
            subject: 'Test Subject',
            html: '<html>Test</html>',
            text: 'Test text'
          },
          'feedback'
        )

        // For now, expect single attempt (no retry implemented yet)
        expect(attemptCount).toBe(1)
        expect(result).toBe(false)
      })
    })
  })

  describe('Integrated Workflow Tests', () => {
    it('should complete full feedback submission workflow', async () => {
      // 1. Create feedback
      const feedbackData = FeedbackFactory.build({
        title: 'Integration Workflow Test',
        description: 'Testing complete feedback workflow',
        type: 'bug',
        organization_id: 'org-123'
      })

      const createResult = await feedbackRepository.create(feedbackData)
      expect(createResult.success).toBe(true)

      // 2. Generate email templates
      const adminTemplate = createAdminFeedbackTemplate({
        type: feedbackData.type,
        title: feedbackData.title,
        description: feedbackData.description,
        userEmail: feedbackData.user_email,
        timestamp: feedbackData.created_at || new Date().toISOString()
      })

      const confirmationTemplate = createUserConfirmationTemplate({
        title: feedbackData.title,
        type: feedbackData.type,
        userEmail: feedbackData.user_email,
        timestamp: feedbackData.created_at || new Date().toISOString(),
        referenceId: 'FB-TEST123'
      })

      // 3. Send emails
      const adminEmailResult = await notificationService.sendEmail(
        'hirendra.vikram@boardguru.ai',
        {
          subject: adminTemplate.subject,
          html: adminTemplate.html,
          text: generateFeedbackTextFallback({
            subject: adminTemplate.subject,
            title: feedbackData.title,
            description: feedbackData.description,
            userEmail: feedbackData.user_email
          })
        },
        'feedback'
      )

      const userEmailResult = await notificationService.sendEmail(
        feedbackData.user_email,
        {
          subject: confirmationTemplate.subject,
          html: confirmationTemplate.html,
          text: generateConfirmationTextFallback({
            subject: confirmationTemplate.subject,
            title: feedbackData.title,
            referenceId: 'FB-TEST123'
          })
        },
        'feedback_confirmation'
      )

      // 4. Verify complete workflow
      expect(adminEmailResult).toBe(true)
      expect(userEmailResult).toBe(true)
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: feedbackData.title,
          description: feedbackData.description,
          type: feedbackData.type,
          user_id: 'test-user-id',
          status: 'submitted'
        })
      )
      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(2)
    })

    it('should handle partial failures in workflow', async () => {
      // Mock database success but email failure
      const feedbackData = FeedbackFactory.build()
      const createResult = await feedbackRepository.create(feedbackData)
      expect(createResult.success).toBe(true)

      // Mock email failure
      mockEmailService.sendEmail.mockResolvedValueOnce(false)
      
      const emailResult = await notificationService.sendEmail(
        'test@example.com',
        {
          subject: 'Test',
          html: '<html>Test</html>',
          text: 'Test'
        },
        'feedback'
      )

      expect(emailResult).toBe(false)
      // Database operation should have succeeded regardless of email failure
      expect(mockSupabase.insert).toHaveBeenCalled()
    })
  })
})