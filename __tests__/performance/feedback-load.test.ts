/**
 * @jest-environment jsdom
 */
import { performance } from 'perf_hooks'
import { FeedbackRepository } from '@/lib/repositories/feedback.repository'
import { NotificationService } from '@/lib/services/notification.service'
import { FeedbackFactory } from '../factories'
import { performanceHelpers } from '../utils/test-helpers'

// Mock external dependencies for performance testing
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

const mockNotificationService = {
  sendEmail: jest.fn()
}

jest.mock('@/lib/supabase', () => mockSupabase)

describe('Feedback System Performance Tests', () => {
  let feedbackRepository: FeedbackRepository
  let notificationService: NotificationService

  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    SINGLE_CREATE: 100,
    BATCH_CREATE_100: 2000,
    BATCH_CREATE_1000: 15000,
    QUERY_SIMPLE: 50,
    QUERY_COMPLEX: 200,
    QUERY_LARGE_DATASET: 500,
    EMAIL_SINGLE: 200,
    EMAIL_BATCH_10: 1000,
    EMAIL_BATCH_100: 8000,
    TEMPLATE_GENERATION: 10,
    TEMPLATE_LARGE_CONTENT: 50,
    REPOSITORY_INITIALIZATION: 10
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful responses with realistic delays
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    })

    feedbackRepository = new FeedbackRepository(mockSupabase as any)
    notificationService = new NotificationService(mockSupabase as any)
    notificationService.sendEmail = mockNotificationService.sendEmail
  })

  describe('Repository Performance', () => {
    test('should initialize repository within performance threshold', async () => {
      const duration = await performanceHelpers.measureExecutionTime(async () => {
        new FeedbackRepository(mockSupabase as any)
      })

      expect(duration.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.REPOSITORY_INITIALIZATION)
    })

    test('should create single feedback within performance threshold', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'feedback-123', ...FeedbackFactory.build() },
        error: null
      })

      const feedbackData = FeedbackFactory.build()

      const result = await performanceHelpers.assertWithinTimeLimit(
        () => feedbackRepository.create(feedbackData),
        PERFORMANCE_THRESHOLDS.SINGLE_CREATE
      )

      expect(result.success).toBe(true)
    })

    test('should handle batch creation of 100 feedback items efficiently', async () => {
      const feedbackList = FeedbackFactory.buildList(100)
      
      // Mock responses with small delays to simulate database operations
      mockSupabase.single.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: { id: `feedback-${Date.now()}-${Math.random()}`, ...feedbackList[0] },
            error: null
          }), Math.random() * 10) // 0-10ms random delay
        )
      )

      const startTime = performance.now()
      
      // Create all feedback items concurrently
      const promises = feedbackList.map(feedback => 
        feedbackRepository.create(feedback)
      )
      
      const results = await Promise.all(promises)
      const duration = performance.now() - startTime

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_CREATE_100)
    })

    test('should handle batch creation of 1000 feedback items within threshold', async () => {
      const feedbackList = FeedbackFactory.buildList(1000)
      
      mockSupabase.single.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: { id: `feedback-${Date.now()}-${Math.random()}`, ...feedbackList[0] },
            error: null
          }), Math.random() * 5) // 0-5ms delay for larger batch
        )
      )

      const startTime = performance.now()
      
      // Process in chunks to avoid overwhelming the system
      const chunkSize = 50
      const chunks = []
      for (let i = 0; i < feedbackList.length; i += chunkSize) {
        chunks.push(feedbackList.slice(i, i + chunkSize))
      }

      const allResults = []
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(feedback => 
          feedbackRepository.create(feedback)
        )
        const chunkResults = await Promise.all(chunkPromises)
        allResults.push(...chunkResults)
      }

      const duration = performance.now() - startTime

      expect(allResults).toHaveLength(1000)
      allResults.forEach(result => {
        expect(result.success).toBe(true)
      })

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_CREATE_1000)
    })

    test('should perform simple queries within performance threshold', async () => {
      const mockFeedback = FeedbackFactory.build()
      mockSupabase.single.mockResolvedValue({
        data: mockFeedback,
        error: null
      })

      const result = await performanceHelpers.assertWithinTimeLimit(
        () => feedbackRepository.findById('feedback-123'),
        PERFORMANCE_THRESHOLDS.QUERY_SIMPLE
      )

      expect(result.success).toBe(true)
    })

    test('should perform complex queries within performance threshold', async () => {
      const mockFeedbackList = FeedbackFactory.buildList(50).map((f, index) => ({
        ...f,
        id: `feedback-${index}`,
        user: { id: 'user-123', email: 'user@example.com', full_name: 'Test User' }
      }))

      mockSupabase.mockResolvedValue({
        data: mockFeedbackList,
        error: null,
        count: 50
      })

      const result = await performanceHelpers.assertWithinTimeLimit(
        () => feedbackRepository.findAll({
          type: 'bug',
          status: 'new',
          organization_id: 'org-123',
          page: 1,
          limit: 50,
          sortBy: 'created_at',
          sortOrder: 'desc'
        }),
        PERFORMANCE_THRESHOLDS.QUERY_COMPLEX
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(50)
      }
    })

    test('should handle large dataset queries within performance threshold', async () => {
      const largeFeedbackList = Array.from({ length: 1000 }, (_, index) => ({
        ...FeedbackFactory.build(),
        id: `feedback-${index}`,
        user: { id: 'user-123', email: 'user@example.com', full_name: 'Test User' }
      }))

      mockSupabase.mockResolvedValue({
        data: largeFeedbackList.slice(0, 100), // Paginated result
        error: null,
        count: 1000
      })

      const result = await performanceHelpers.assertWithinTimeLimit(
        () => feedbackRepository.findAll({
          page: 1,
          limit: 100
        }),
        PERFORMANCE_THRESHOLDS.QUERY_LARGE_DATASET
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.pagination.total).toBe(1000)
        expect(result.data.data).toHaveLength(100)
      }
    })

    test('should generate statistics efficiently for large datasets', async () => {
      const statisticsData = Array.from({ length: 10000 }, (_, index) => ({
        status: ['new', 'in_progress', 'resolved', 'closed'][index % 4],
        type: ['bug', 'feature', 'improvement', 'other'][index % 4],
        priority: ['low', 'medium', 'high'][index % 3],
        created_at: new Date(Date.now() - (index * 60000)).toISOString() // 1 minute intervals
      }))

      mockSupabase.mockResolvedValue({
        data: statisticsData,
        error: null
      })

      const result = await performanceHelpers.assertWithinTimeLimit(
        () => feedbackRepository.getStatistics('org-123'),
        PERFORMANCE_THRESHOLDS.QUERY_LARGE_DATASET
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.total).toBe(10000)
        expect(Object.keys(result.data.by_status)).toContain('new')
        expect(Object.keys(result.data.by_type)).toContain('bug')
        expect(Object.keys(result.data.by_priority)).toContain('high')
      }
    })

    test('should handle concurrent read operations efficiently', async () => {
      const mockFeedbackList = FeedbackFactory.buildList(10)
      mockSupabase.mockResolvedValue({
        data: mockFeedbackList,
        error: null,
        count: 10
      })

      const concurrentOperations = [
        () => feedbackRepository.findAll({ type: 'bug' }),
        () => feedbackRepository.findAll({ status: 'new' }),
        () => feedbackRepository.findAll({ organization_id: 'org-1' }),
        () => feedbackRepository.getStatistics('org-1'),
        () => feedbackRepository.findByUser('user-1'),
        () => feedbackRepository.findAll({ page: 1, limit: 5 }),
        () => feedbackRepository.findAll({ page: 2, limit: 5 }),
        () => feedbackRepository.getStatistics(),
      ]

      const startTime = performance.now()
      const results = await Promise.all(
        concurrentOperations.map(operation => operation())
      )
      const duration = performance.now() - startTime

      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      // Concurrent operations should be faster than sequential
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.QUERY_COMPLEX * concurrentOperations.length / 2)
    })
  })

  describe('Email Service Performance', () => {
    beforeEach(() => {
      mockNotificationService.sendEmail.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve(true), Math.random() * 100) // 0-100ms delay
        )
      )
    })

    test('should send single email within performance threshold', async () => {
      const result = await performanceHelpers.assertWithinTimeLimit(
        () => notificationService.sendEmail(
          'test@example.com',
          {
            subject: 'Test Subject',
            html: '<html>Test Email</html>',
            text: 'Test Email'
          },
          'feedback'
        ),
        PERFORMANCE_THRESHOLDS.EMAIL_SINGLE
      )

      expect(result).toBe(true)
    })

    test('should send batch of 10 emails efficiently', async () => {
      const emailPromises = Array.from({ length: 10 }, (_, index) =>
        notificationService.sendEmail(
          `test${index}@example.com`,
          {
            subject: `Test Email ${index}`,
            html: `<html>Test Email ${index}</html>`,
            text: `Test Email ${index}`
          },
          'feedback'
        )
      )

      const duration = await performanceHelpers.measureExecutionTime(async () => {
        const results = await Promise.all(emailPromises)
        results.forEach(result => {
          expect(result).toBe(true)
        })
      })

      expect(duration.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.EMAIL_BATCH_10)
    })

    test('should send batch of 100 emails within threshold', async () => {
      const emailPromises = Array.from({ length: 100 }, (_, index) =>
        notificationService.sendEmail(
          `test${index}@example.com`,
          {
            subject: `Test Email ${index}`,
            html: `<html>Test Email ${index}</html>`,
            text: `Test Email ${index}`
          },
          'feedback'
        )
      )

      const startTime = performance.now()
      
      // Process emails in chunks to simulate real-world constraints
      const chunkSize = 10
      const chunks = []
      for (let i = 0; i < emailPromises.length; i += chunkSize) {
        chunks.push(emailPromises.slice(i, i + chunkSize))
      }

      const allResults = []
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk)
        allResults.push(...chunkResults)
        
        // Brief pause between chunks to simulate rate limiting
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      const duration = performance.now() - startTime

      expect(allResults).toHaveLength(100)
      allResults.forEach(result => {
        expect(result).toBe(true)
      })

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.EMAIL_BATCH_100)
    })

    test('should handle email service failures without performance degradation', async () => {
      // Mock intermittent failures
      let callCount = 0
      mockNotificationService.sendEmail.mockImplementation(() => {
        callCount++
        const shouldFail = callCount % 3 === 0 // Every 3rd call fails
        
        return new Promise(resolve => 
          setTimeout(() => resolve(!shouldFail), Math.random() * 50)
        )
      })

      const emailPromises = Array.from({ length: 20 }, (_, index) =>
        notificationService.sendEmail(
          `test${index}@example.com`,
          {
            subject: `Test Email ${index}`,
            html: `<html>Test Email ${index}</html>`,
            text: `Test Email ${index}`
          },
          'feedback'
        )
      )

      const duration = await performanceHelpers.measureExecutionTime(async () => {
        const results = await Promise.all(emailPromises)
        
        // Should have mix of successes and failures
        const successes = results.filter(r => r === true).length
        const failures = results.filter(r => r === false).length
        
        expect(successes).toBeGreaterThan(0)
        expect(failures).toBeGreaterThan(0)
        expect(successes + failures).toBe(20)
      })

      // Failures shouldn't significantly impact performance
      expect(duration.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.EMAIL_BATCH_10 * 2)
    })
  })

  describe('Template Generation Performance', () => {
    test('should generate basic email templates within threshold', async () => {
      const { createAdminFeedbackTemplate, createUserConfirmationTemplate } = require('@/lib/services/feedback-templates')
      
      const feedbackData = {
        type: 'bug' as const,
        title: 'Performance Test Bug Report',
        description: 'Testing template generation performance',
        userEmail: 'test@example.com',
        userName: 'Test User',
        timestamp: new Date().toISOString()
      }

      const confirmationData = {
        title: feedbackData.title,
        type: feedbackData.type,
        userEmail: feedbackData.userEmail,
        userName: feedbackData.userName,
        timestamp: feedbackData.timestamp,
        referenceId: 'FB-PERF123'
      }

      // Test admin template generation
      const adminDuration = await performanceHelpers.measureExecutionTime(async () => {
        const template = createAdminFeedbackTemplate(feedbackData)
        expect(template.subject).toBeTruthy()
        expect(template.html).toBeTruthy()
      })

      expect(adminDuration.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.TEMPLATE_GENERATION)

      // Test user confirmation template generation
      const userDuration = await performanceHelpers.measureExecutionTime(async () => {
        const template = createUserConfirmationTemplate(confirmationData)
        expect(template.subject).toBeTruthy()
        expect(template.html).toBeTruthy()
      })

      expect(userDuration.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.TEMPLATE_GENERATION)
    })

    test('should generate templates with large content efficiently', async () => {
      const { createAdminFeedbackTemplate } = require('@/lib/services/feedback-templates')
      
      const largeFeedbackData = {
        type: 'bug' as const,
        title: 'A'.repeat(200), // Max title length
        description: 'B'.repeat(2000), // Max description length
        userEmail: 'test@example.com',
        userName: 'User with Very Long Name That Could Impact Performance',
        screenshot: 'data:image/png;base64,' + 'c'.repeat(100000), // Large screenshot data
        timestamp: new Date().toISOString(),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        url: 'https://very-long-url.example.com/with/many/path/segments/that/could/impact/template/generation/performance'
      }

      const duration = await performanceHelpers.measureExecutionTime(async () => {
        const template = createAdminFeedbackTemplate(largeFeedbackData)
        expect(template.subject).toBeTruthy()
        expect(template.html).toBeTruthy()
        expect(template.html.length).toBeGreaterThan(2000) // Should contain all the content
      })

      expect(duration.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.TEMPLATE_LARGE_CONTENT)
    })

    test('should generate multiple templates concurrently', async () => {
      const { createAdminFeedbackTemplate, createUserConfirmationTemplate } = require('@/lib/services/feedback-templates')
      
      const feedbackDataList = FeedbackFactory.buildList(20).map((feedback, index) => ({
        type: feedback.type as 'bug' | 'feature' | 'improvement' | 'other',
        title: feedback.title,
        description: feedback.description,
        userEmail: feedback.user_email,
        userName: `User ${index}`,
        timestamp: new Date().toISOString()
      }))

      const startTime = performance.now()
      
      const templatePromises = feedbackDataList.map(data => 
        Promise.all([
          Promise.resolve(createAdminFeedbackTemplate(data)),
          Promise.resolve(createUserConfirmationTemplate({
            ...data,
            referenceId: `FB-PERF-${Date.now()}-${Math.random()}`
          }))
        ])
      )

      const results = await Promise.all(templatePromises)
      const duration = performance.now() - startTime

      // Verify all templates were generated
      expect(results).toHaveLength(20)
      results.forEach(([adminTemplate, userTemplate]) => {
        expect(adminTemplate.subject).toBeTruthy()
        expect(adminTemplate.html).toBeTruthy()
        expect(userTemplate.subject).toBeTruthy()
        expect(userTemplate.html).toBeTruthy()
      })

      // Should be faster than sequential generation
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.TEMPLATE_GENERATION * 40 / 2)
    })
  })

  describe('End-to-End Workflow Performance', () => {
    test('should complete full feedback submission workflow efficiently', async () => {
      const { createAdminFeedbackTemplate, createUserConfirmationTemplate } = require('@/lib/services/feedback-templates')
      
      // Mock successful repository operations
      mockSupabase.single.mockResolvedValue({
        data: { id: 'feedback-perf-123', ...FeedbackFactory.build() },
        error: null
      })

      // Mock successful email operations
      mockNotificationService.sendEmail.mockResolvedValue(true)

      const feedbackData = FeedbackFactory.build({
        title: 'End-to-End Performance Test',
        description: 'Testing complete workflow performance from creation to email delivery',
        type: 'bug'
      })

      const startTime = performance.now()

      // 1. Create feedback in repository
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

      const userTemplate = createUserConfirmationTemplate({
        title: feedbackData.title,
        type: feedbackData.type,
        userEmail: feedbackData.user_email,
        timestamp: feedbackData.created_at || new Date().toISOString(),
        referenceId: 'FB-E2E-PERF-123'
      })

      // 3. Send emails concurrently
      const [adminEmailResult, userEmailResult] = await Promise.all([
        notificationService.sendEmail(
          'admin@boardguru.ai',
          {
            subject: adminTemplate.subject,
            html: adminTemplate.html,
            text: 'Admin text fallback'
          },
          'feedback'
        ),
        notificationService.sendEmail(
          feedbackData.user_email,
          {
            subject: userTemplate.subject,
            html: userTemplate.html,
            text: 'User text fallback'
          },
          'feedback_confirmation'
        )
      ])

      const duration = performance.now() - startTime

      // Verify workflow completed successfully
      expect(adminEmailResult).toBe(true)
      expect(userEmailResult).toBe(true)

      // Complete workflow should be efficient
      expect(duration).toBeLessThan(500) // 500ms for complete workflow
    })

    test('should handle high-concurrency feedback submissions', async () => {
      mockSupabase.single.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: { id: `feedback-${Date.now()}-${Math.random()}`, ...FeedbackFactory.build() },
            error: null
          }), Math.random() * 50)
        )
      )

      mockNotificationService.sendEmail.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve(true), Math.random() * 100)
        )
      )

      const concurrentSubmissions = 50
      const feedbackList = FeedbackFactory.buildList(concurrentSubmissions)

      const startTime = performance.now()

      const workflowPromises = feedbackList.map(async (feedback, index) => {
        // Simulate API endpoint processing
        const createResult = await feedbackRepository.create(feedback)
        
        if (createResult.success) {
          // Send emails in parallel
          const emailPromises = [
            notificationService.sendEmail(
              'admin@boardguru.ai',
              { subject: `Feedback ${index}`, html: '<html>Admin</html>', text: 'Admin' },
              'feedback'
            ),
            notificationService.sendEmail(
              feedback.user_email,
              { subject: `Confirmation ${index}`, html: '<html>User</html>', text: 'User' },
              'feedback_confirmation'
            )
          ]
          
          const emailResults = await Promise.all(emailPromises)
          return {
            createSuccess: createResult.success,
            emailsSuccess: emailResults.every(r => r === true)
          }
        }
        
        return { createSuccess: false, emailsSuccess: false }
      })

      const results = await Promise.all(workflowPromises)
      const duration = performance.now() - startTime

      // Verify results
      const successfulCreations = results.filter(r => r.createSuccess).length
      const successfulEmails = results.filter(r => r.emailsSuccess).length

      expect(successfulCreations).toBe(concurrentSubmissions)
      expect(successfulEmails).toBeGreaterThan(concurrentSubmissions * 0.9) // Allow for some email failures

      // High concurrency should complete within reasonable time
      expect(duration).toBeLessThan(5000) // 5 seconds for 50 concurrent submissions

      // Log performance metrics
      console.log(`Processed ${concurrentSubmissions} submissions in ${duration.toFixed(2)}ms`)
      console.log(`Average time per submission: ${(duration / concurrentSubmissions).toFixed(2)}ms`)
    })
  })

  describe('Memory and Resource Usage', () => {
    test('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const feedback = FeedbackFactory.build()
        mockSupabase.single.mockResolvedValue({
          data: { id: `feedback-${i}`, ...feedback },
          error: null
        })
        
        const result = await feedbackRepository.create(feedback)
        expect(result.success).toBe(true)

        // Force garbage collection periodically
        if (i % 100 === 0 && global.gc) {
          global.gc()
        }
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryGrowth = finalMemory - initialMemory

      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024)
    })

    test('should handle large data structures efficiently', async () => {
      // Create feedback with very large content
      const largeFeedback = FeedbackFactory.build({
        title: 'A'.repeat(200),
        description: 'B'.repeat(2000),
        screenshot_included: true
      })

      const largeDataList = Array.from({ length: 100 }, () => largeFeedback)

      mockSupabase.mockResolvedValue({
        data: largeDataList.map((f, i) => ({ ...f, id: `feedback-${i}` })),
        error: null,
        count: 100
      })

      const startTime = performance.now()
      
      const result = await feedbackRepository.findAll({
        page: 1,
        limit: 100
      })
      
      const duration = performance.now() - startTime

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(100)
      }

      // Should handle large data efficiently
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.QUERY_LARGE_DATASET)
    })
  })
})