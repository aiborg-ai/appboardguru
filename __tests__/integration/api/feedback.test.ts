/**
 * @jest-environment jsdom
 */
import { NextRequest, NextResponse } from 'next/server'
import { POST, GET, PUT, DELETE } from '@/app/api/feedback/route'
import { FeedbackFactory } from '../../factories'
import { createApiMocks, testAssertions, dbHelpers } from '../../utils/test-helpers'

// Mock external dependencies
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn(),
}

jest.mock('@/lib/supabase', () => mockSupabase)

// Mock notification service
const mockNotificationService = {
  sendEmail: jest.fn(),
}

jest.mock('@/lib/services/notification.service', () => ({
  NotificationService: jest.fn(() => mockNotificationService),
}))

// Mock feedback templates
jest.mock('@/lib/services/feedback-templates', () => ({
  createAdminFeedbackTemplate: jest.fn(() => ({
    subject: 'Test Admin Subject',
    html: '<html>Admin Template</html>'
  })),
  createUserConfirmationTemplate: jest.fn(() => ({
    subject: 'Test User Subject',
    html: '<html>User Template</html>'
  })),
  generateFeedbackTextFallback: jest.fn(() => 'Admin text fallback'),
  generateConfirmationTextFallback: jest.fn(() => 'User text fallback'),
}))

describe('/api/feedback Integration Tests', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User'
    }
  }

  const validFeedbackData = {
    type: 'bug',
    title: 'Test Bug Report',
    description: 'This is a test bug report with detailed description of the issue.',
    screenshot: null
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset rate limiting store
    const rateLimitStore = new Map()
    jest.doMock('@/app/api/feedback/route', () => ({
      ...jest.requireActual('@/app/api/feedback/route'),
      rateLimitStore
    }))

    // Mock successful authentication by default
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Mock successful database operations by default
    mockSupabase.single.mockResolvedValue({
      data: { id: 'feedback-123', ...validFeedbackData, user_id: mockUser.id },
      error: null
    })

    // Mock successful email sending by default
    mockNotificationService.sendEmail.mockResolvedValue(true)
  })

  describe('POST /api/feedback', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        })

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Authentication required')
      })

      it('should accept authenticated requests', async () => {
        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should handle auth service errors gracefully', async () => {
        mockSupabase.auth.getUser.mockRejectedValue(new Error('Auth service down'))

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Authentication required')
      })
    })

    describe('Input Validation', () => {
      it('should validate required fields', async () => {
        const invalidData = {
          type: 'bug',
          title: '', // Invalid: empty title
          description: 'Valid description'
        }

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(invalidData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid input data')
        expect(data.details).toBeDefined()
      })

      it('should validate feedback type enum', async () => {
        const invalidData = {
          type: 'invalid-type',
          title: 'Valid Title',
          description: 'Valid description'
        }

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(invalidData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid input data')
      })

      it('should validate title length limits', async () => {
        const invalidData = {
          type: 'bug',
          title: 'A'.repeat(201), // Exceeds 200 character limit
          description: 'Valid description'
        }

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(invalidData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid input data')
      })

      it('should validate description length limits', async () => {
        const invalidData = {
          type: 'bug',
          title: 'Valid Title',
          description: 'A'.repeat(2001) // Exceeds 2000 character limit
        }

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(invalidData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid input data')
      })

      it('should validate screenshot size limits', async () => {
        const largeScreenshot = 'data:image/png;base64,' + 'A'.repeat(7000000) // ~5.25MB (exceeds 5MB limit)
        const invalidData = {
          ...validFeedbackData,
          screenshot: largeScreenshot
        }

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(invalidData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Screenshot too large. Maximum size is 5MB.')
      })

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: '{ invalid json'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error. Please try again later.')
      })
    })

    describe('Rate Limiting', () => {
      it('should allow requests within rate limit', async () => {
        // Send 5 requests (within limit)
        for (let i = 0; i < 5; i++) {
          const request = new NextRequest('http://localhost:3000/api/feedback', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer token'
            },
            body: JSON.stringify({
              ...validFeedbackData,
              title: `Request ${i + 1}`
            })
          })

          const response = await POST(request)
          expect(response.status).toBe(200)
        }
      })

      it('should reject requests exceeding rate limit', async () => {
        // Send 6 requests (exceeds 5 per hour limit)
        for (let i = 0; i < 5; i++) {
          const request = new NextRequest('http://localhost:3000/api/feedback', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer token'
            },
            body: JSON.stringify({
              ...validFeedbackData,
              title: `Request ${i + 1}`
            })
          })

          await POST(request)
        }

        // 6th request should be rate limited
        const excessRequest = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(excessRequest)
        const data = await response.json()

        expect(response.status).toBe(429)
        expect(data.error).toBe('Rate limit exceeded. Please wait before submitting more feedback.')
      })

      it('should reset rate limit after time window', async () => {
        // Mock Date.now to control time
        const originalDateNow = Date.now
        let mockTime = 1000000000
        Date.now = jest.fn(() => mockTime)

        try {
          // Send 5 requests
          for (let i = 0; i < 5; i++) {
            const request = new NextRequest('http://localhost:3000/api/feedback', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer token'
              },
              body: JSON.stringify({
                ...validFeedbackData,
                title: `Request ${i + 1}`
              })
            })
            await POST(request)
          }

          // Advance time by 1 hour + 1 minute
          mockTime += (60 * 60 * 1000) + (60 * 1000)

          // Should allow new request after time window
          const request = new NextRequest('http://localhost:3000/api/feedback', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer token'
            },
            body: JSON.stringify(validFeedbackData)
          })

          const response = await POST(request)
          expect(response.status).toBe(200)
        } finally {
          Date.now = originalDateNow
        }
      })

      it('should track rate limits per user email', async () => {
        const user1 = { ...mockUser, email: 'user1@example.com' }
        const user2 = { ...mockUser, email: 'user2@example.com' }

        // User 1 sends 5 requests
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: user1 }, error: null })
        for (let i = 0; i < 5; i++) {
          const request = new NextRequest('http://localhost:3000/api/feedback', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer token1'
            },
            body: JSON.stringify(validFeedbackData)
          })
          await POST(request)
        }

        // User 2 should still be able to send requests
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: user2 }, error: null })
        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token2'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      })
    })

    describe('Database Integration', () => {
      it('should store feedback in database', async () => {
        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        expect(response.status).toBe(200)

        expect(mockSupabase.from).toHaveBeenCalledWith('feedback_submissions')
        expect(mockSupabase.insert).toHaveBeenCalledWith({
          reference_id: expect.stringMatching(/^FB-[A-Z0-9]+$/),
          user_id: mockUser.id,
          user_email: mockUser.email,
          type: validFeedbackData.type,
          title: validFeedbackData.title,
          description: validFeedbackData.description,
          screenshot_included: false,
          user_agent: undefined,
          page_url: undefined,
          admin_email_sent: true,
          user_email_sent: true,
          created_at: expect.any(String)
        })
      })

      it('should handle database errors gracefully', async () => {
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'DB_ERROR' }
        })

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        const data = await response.json()

        // Should continue with email sending even if DB logging fails
        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        // Should log warning about DB failure but not fail the request
      })

      it('should store screenshot inclusion flag', async () => {
        const dataWithScreenshot = {
          ...validFeedbackData,
          screenshot: 'data:image/png;base64,mockdata'
        }

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(dataWithScreenshot)
        })

        const response = await POST(request)
        expect(response.status).toBe(200)

        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            screenshot_included: true
          })
        )
      })

      it('should store request metadata', async () => {
        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token',
            'User-Agent': 'Mozilla/5.0 Test Browser',
            'Referer': 'https://app.boardguru.com/dashboard'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        expect(response.status).toBe(200)

        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_agent: 'Mozilla/5.0 Test Browser',
            page_url: 'https://app.boardguru.com/dashboard'
          })
        )
      })
    })

    describe('Email Integration', () => {
      it('should send both admin and user emails', async () => {
        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(mockNotificationService.sendEmail).toHaveBeenCalledTimes(2)

        // Check admin email
        expect(mockNotificationService.sendEmail).toHaveBeenCalledWith(
          'hirendra.vikram@boardguru.ai',
          {
            subject: 'Test Admin Subject',
            html: '<html>Admin Template</html>',
            text: 'Admin text fallback'
          },
          'feedback'
        )

        // Check user confirmation email
        expect(mockNotificationService.sendEmail).toHaveBeenCalledWith(
          mockUser.email,
          {
            subject: 'Test User Subject',
            html: '<html>User Template</html>',
            text: 'User text fallback'
          },
          'feedback_confirmation'
        )

        expect(data.emailsSent.admin).toBe(true)
        expect(data.emailsSent.user).toBe(true)
      })

      it('should handle partial email failures', async () => {
        mockNotificationService.sendEmail
          .mockResolvedValueOnce(false) // Admin email fails
          .mockResolvedValueOnce(true)  // User email succeeds

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.emailsSent.admin).toBe(false)
        expect(data.emailsSent.user).toBe(true)
        expect(data.message).toContain('Some email notifications may have failed to send')
      })

      it('should handle complete email service failure', async () => {
        mockNotificationService.sendEmail.mockResolvedValue(false)

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.emailsSent.admin).toBe(false)
        expect(data.emailsSent.user).toBe(false)
        expect(data.message).toContain('Some email notifications may have failed to send')
      })

      it('should send emails in parallel for performance', async () => {
        const emailPromises: Promise<boolean>[] = []
        mockNotificationService.sendEmail.mockImplementation(() => {
          const promise = new Promise<boolean>(resolve => 
            setTimeout(() => resolve(true), 100)
          )
          emailPromises.push(promise)
          return promise
        })

        const startTime = Date.now()
        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        const endTime = Date.now()

        expect(response.status).toBe(200)
        // Should complete in ~100ms (parallel) rather than ~200ms (sequential)
        expect(endTime - startTime).toBeLessThan(150)
      })
    })

    describe('Response Format', () => {
      it('should return correct success response format', async () => {
        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toEqual({
          success: true,
          referenceId: expect.stringMatching(/^FB-[A-Z0-9]+$/),
          message: 'Feedback submitted successfully',
          emailsSent: {
            admin: true,
            user: true
          }
        })
      })

      it('should generate unique reference IDs', async () => {
        const referenceIds = new Set()

        for (let i = 0; i < 10; i++) {
          const request = new NextRequest('http://localhost:3000/api/feedback', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer token'
            },
            body: JSON.stringify(validFeedbackData)
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(referenceIds.has(data.referenceId)).toBe(false)
          referenceIds.add(data.referenceId)
        }

        expect(referenceIds.size).toBe(10)
      })

      it('should handle internal server errors', async () => {
        // Mock an unexpected error
        mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected error'))

        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token'
          },
          body: JSON.stringify(validFeedbackData)
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error. Please try again later.')
      })
    })

    describe('Different Feedback Types', () => {
      const feedbackTypes = ['bug', 'feature', 'improvement', 'other'] as const

      feedbackTypes.forEach(type => {
        it(`should handle ${type} feedback type`, async () => {
          const typeData = { ...validFeedbackData, type }

          const request = new NextRequest('http://localhost:3000/api/feedback', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer token'
            },
            body: JSON.stringify(typeData)
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.success).toBe(true)
          expect(mockSupabase.insert).toHaveBeenCalledWith(
            expect.objectContaining({ type })
          )
        })
      })
    })
  })

  describe('Unsupported HTTP Methods', () => {
    it('should reject GET requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'GET'
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed. Use POST to submit feedback.')
    })

    it('should reject PUT requests', async () => {
      const response = await PUT()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed. Use POST to submit feedback.')
    })

    it('should reject DELETE requests', async () => {
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed. Use POST to submit feedback.')
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle user with missing metadata', async () => {
      const userWithoutMetadata = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: null
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: userWithoutMetadata },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify(validFeedbackData)
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Should use email prefix as name fallback
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userWithoutMetadata.id,
          user_email: userWithoutMetadata.email
        })
      )
    })

    it('should handle missing authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validFeedbackData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should handle extremely long valid inputs', async () => {
      const longValidData = {
        type: 'bug',
        title: 'A'.repeat(200), // Max valid length
        description: 'B'.repeat(2000), // Max valid length
        screenshot: null
      }

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify(longValidData)
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle special characters in feedback content', async () => {
      const specialCharsData = {
        type: 'bug',
        title: 'Bug with émojis 🐛 and ñañá characters',
        description: 'Description with <html>, "quotes", & symbols ©®™ and newlines\n\ttabs',
        screenshot: null
      }

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify(specialCharsData)
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: specialCharsData.title,
          description: specialCharsData.description
        })
      )
    })
  })
})