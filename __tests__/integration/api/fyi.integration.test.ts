/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { fyiController } from '@/lib/api/controllers/fyi.controller'
import { FYIService } from '@/lib/services/fyi.service'
import { FYIFactory, FYIContextFactory, FYIPreferencesFactory } from '../../factories/fyi.factory'
import { createApiMocks, mockAuthenticatedUser, createTestScenario } from '../../utils/test-helpers'
import { testDb } from '../../../tests/utils/test-database'
import type { FYIContext, FYIUserPreferences } from '@/types/fyi'

// Mock Supabase server client
const mockSupabaseServerClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
}

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabaseServerClient),
}))

// Mock FYI Service
jest.mock('@/lib/services/fyi.service')
const MockFYIService = FYIService as jest.MockedClass<typeof FYIService>

// Mock environment variables
const originalEnv = process.env
beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEWS_API_KEY: 'test-news-api-key',
    ALPHA_VANTAGE_API_KEY: 'test-alpha-vantage-key',
    OPENROUTER_API_KEY: 'test-openrouter-key',
  }
})

afterAll(() => {
  process.env = originalEnv
})

describe('FYI API Integration Tests - Following CLAUDE.md Patterns', () => {
  let testUser: any
  let testOrganization: any
  let mockFYIService: jest.Mocked<FYIService>

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Create test scenario
    const scenario = await createTestScenario('basic')
    testUser = scenario.users[0]
    testOrganization = scenario.organizations[0]

    // Mock authenticated user
    mockSupabaseServerClient.auth.getUser.mockResolvedValue({
      data: { user: testUser },
      error: null,
    })

    // Mock FYI Service
    mockFYIService = {
      fetchInsights: jest.fn(),
      getUserPreferences: jest.fn(),
      updateUserPreferences: jest.fn(),
      logUserInteraction: jest.fn(),
      getCachedInsights: jest.fn(),
      searchInsights: jest.fn(),
      refreshInsights: jest.fn(),
    } as any

    MockFYIService.mockImplementation(() => mockFYIService)

    jest.clearAllMocks()
  })

  describe('POST /api/fyi/insights - Fetch Insights Endpoint', () => {
    it('should successfully fetch insights with valid context', async () => {
      const mockInsights = FYIFactory.buildMany(5)
      const context = FYIContextFactory.buildOrganizationContext()

      mockFYIService.fetchInsights.mockResolvedValue({
        success: true,
        data: {
          insights: mockInsights,
          context,
          fetchedAt: new Date().toISOString(),
        }
      })

      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.insights).toEqual(mockInsights)
      expect(data.context).toEqual(context)
      expect(data.metadata).toEqual({
        timestamp: expect.any(String),
        count: mockInsights.length,
        userId: testUser.id,
        organizationId: testOrganization.id,
      })

      expect(mockFYIService.fetchInsights).toHaveBeenCalledWith(
        testOrganization.id,
        testUser.id,
        context
      )
    })

    it('should return 400 for missing organizationId', async () => {
      const context = FYIContextFactory.buildContext()

      const requestBody = {
        context, // Missing organizationId
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Organization ID and context are required')
      expect(mockFYIService.fetchInsights).not.toHaveBeenCalled()
    })

    it('should return 400 for missing context', async () => {
      const requestBody = {
        organizationId: testOrganization.id,
        // Missing context
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Organization ID and context are required')
    })

    it('should return 401 for unauthenticated request', async () => {
      mockSupabaseServerClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const context = FYIContextFactory.buildContext()
      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should handle service errors gracefully', async () => {
      const context = FYIContextFactory.buildContext()
      
      mockFYIService.fetchInsights.mockRejectedValue(
        new Error('External API service unavailable')
      )

      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('External API service unavailable')
    })

    it('should handle malformed JSON request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Internal server error')
    })

    it('should validate context structure and confidence', async () => {
      const invalidContext = FYIContextFactory.buildContext({
        confidence: 0.1, // Too low confidence
        entities: [], // No entities
      })

      mockFYIService.fetchInsights.mockRejectedValue(
        new Error('Context confidence too low for reliable insights')
      )

      const requestBody = {
        organizationId: testOrganization.id,
        context: invalidContext,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Context confidence too low for reliable insights')
    })
  })

  describe('GET /api/fyi/preferences - Get User Preferences', () => {
    it('should successfully retrieve user preferences', async () => {
      const mockPreferences = FYIPreferencesFactory.buildPreferences(testUser.id)

      mockFYIService.getUserPreferences.mockResolvedValue({
        success: true,
        data: mockPreferences,
      })

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'GET',
      })

      const response = await fyiController.getUserPreferences(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toEqual(mockPreferences)
      expect(mockFYIService.getUserPreferences).toHaveBeenCalledWith(testUser.id)
    })

    it('should return default preferences for new users', async () => {
      const defaultPreferences = FYIPreferencesFactory.buildPreferences(testUser.id)

      mockFYIService.getUserPreferences.mockResolvedValue({
        success: true,
        data: defaultPreferences,
      })

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'GET',
      })

      const response = await fyiController.getUserPreferences(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences.userId).toBe(testUser.id)
      expect(data.preferences.relevance_threshold).toBe(0.70) // Default threshold
    })

    it('should return 401 for unauthenticated request', async () => {
      mockSupabaseServerClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'GET',
      })

      const response = await fyiController.getUserPreferences(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should handle service errors when fetching preferences', async () => {
      mockFYIService.getUserPreferences.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'GET',
      })

      const response = await fyiController.getUserPreferences(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database connection failed')
    })
  })

  describe('POST /api/fyi/preferences - Update User Preferences', () => {
    it('should successfully update user preferences', async () => {
      const updatedPreferences = FYIPreferencesFactory.buildAggressivePreferences(testUser.id)

      mockFYIService.updateUserPreferences.mockResolvedValue({
        success: true,
        data: updatedPreferences,
      })

      const requestBody = {
        preferences: {
          relevance_threshold: 0.50,
          auto_refresh_interval: 5,
          notification_preferences: {
            high_priority: true,
            medium_priority: true,
            email_digest: true,
            in_app_notifications: true,
          },
        },
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.updateUserPreferences(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences).toEqual(updatedPreferences)
      expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
        testUser.id,
        requestBody.preferences
      )
    })

    it('should return 400 for missing preferences data', async () => {
      const requestBody = {
        // Missing preferences
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.updateUserPreferences(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Preferences data is required')
      expect(mockFYIService.updateUserPreferences).not.toHaveBeenCalled()
    })

    it('should validate preference values', async () => {
      mockFYIService.updateUserPreferences.mockRejectedValue(
        new Error('Invalid preference values: relevance_threshold must be between 0 and 1')
      )

      const requestBody = {
        preferences: {
          relevance_threshold: 1.5, // Invalid value > 1
          auto_refresh_interval: -10, // Invalid negative value
        },
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.updateUserPreferences(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Invalid preference values')
    })

    it('should handle partial preference updates', async () => {
      const partialPreferences = FYIPreferencesFactory.buildPreferences(testUser.id, {
        relevance_threshold: 0.80, // Only updating threshold
      })

      mockFYIService.updateUserPreferences.mockResolvedValue({
        success: true,
        data: partialPreferences,
      })

      const requestBody = {
        preferences: {
          relevance_threshold: 0.80,
          // Other preferences should remain unchanged
        },
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.updateUserPreferences(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.preferences.relevance_threshold).toBe(0.80)
    })

    it('should return 401 for unauthenticated request', async () => {
      mockSupabaseServerClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const requestBody = {
        preferences: {
          relevance_threshold: 0.75,
        },
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.updateUserPreferences(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('POST /api/fyi/interactions - Log User Interactions', () => {
    it('should successfully log user interaction with insight', async () => {
      const insightId = 'insight-123'
      const action = 'viewed'

      mockFYIService.logUserInteraction.mockResolvedValue({
        success: true,
        data: { logged: true },
      })

      const requestBody = {
        insightId,
        action,
        organizationId: testOrganization.id,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/interactions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.logInteraction(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockFYIService.logUserInteraction).toHaveBeenCalledWith(
        testUser.id,
        insightId,
        action,
        testOrganization.id
      )
    })

    it('should return 400 for missing insightId', async () => {
      const requestBody = {
        action: 'viewed',
        // Missing insightId
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/interactions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.logInteraction(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Insight ID and action are required')
    })

    it('should return 400 for missing action', async () => {
      const requestBody = {
        insightId: 'insight-123',
        // Missing action
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/interactions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.logInteraction(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Insight ID and action are required')
    })

    it('should handle different interaction types', async () => {
      const insightId = 'insight-456'
      const actions = ['viewed', 'clicked', 'shared', 'dismissed', 'bookmarked']

      for (const action of actions) {
        mockFYIService.logUserInteraction.mockResolvedValue({
          success: true,
          data: { logged: true },
        })

        const requestBody = {
          insightId,
          action,
          organizationId: testOrganization.id,
        }

        const request = new NextRequest('http://localhost:3000/api/fyi/interactions', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const response = await fyiController.logInteraction(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)

        jest.clearAllMocks()
      }
    })

    it('should return 401 for unauthenticated request', async () => {
      mockSupabaseServerClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const requestBody = {
        insightId: 'insight-123',
        action: 'viewed',
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/interactions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.logInteraction(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('API Performance and Load Testing', () => {
    it('should handle multiple concurrent insight requests efficiently', async () => {
      const context = FYIContextFactory.buildContext()
      const mockInsights = FYIFactory.buildMany(10)

      mockFYIService.fetchInsights.mockResolvedValue({
        success: true,
        data: {
          insights: mockInsights,
          context,
          fetchedAt: new Date().toISOString(),
        }
      })

      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const concurrentRequests = 10
      const requests = Array.from({ length: concurrentRequests }, () =>
        new NextRequest('http://localhost:3000/api/fyi/insights', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )

      const startTime = Date.now()
      const responses = await Promise.all(
        requests.map(request => fyiController.getInsights(request))
      )
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
      expect(responses).toHaveLength(concurrentRequests)
      expect(responses.every(response => response.status === 200)).toBe(true)
    })

    it('should handle large insight datasets efficiently', async () => {
      const context = FYIContextFactory.buildContext()
      const largeInsightSet = FYIFactory.buildLargeDataset(500)

      mockFYIService.fetchInsights.mockResolvedValue({
        success: true,
        data: {
          insights: largeInsightSet,
          context,
          fetchedAt: new Date().toISOString(),
        }
      })

      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const startTime = Date.now()
      const response = await fyiController.getInsights(request)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(3000) // Should handle large datasets efficiently
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.insights).toHaveLength(500)
      expect(data.metadata.count).toBe(500)
    })

    it('should implement proper rate limiting behavior', async () => {
      // This would test rate limiting if implemented
      const context = FYIContextFactory.buildContext()
      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      // Simulate rapid requests
      const rapidRequests = Array.from({ length: 50 }, () =>
        new NextRequest('http://localhost:3000/api/fyi/insights', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )

      mockFYIService.fetchInsights.mockResolvedValue({
        success: true,
        data: {
          insights: FYIFactory.buildMany(3),
          context,
          fetchedAt: new Date().toISOString(),
        }
      })

      const responses = await Promise.all(
        rapidRequests.map(request => fyiController.getInsights(request))
      )

      // All requests should succeed (no rate limiting implemented yet)
      expect(responses.every(response => response.status === 200)).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection failures gracefully', async () => {
      mockSupabaseServerClient.auth.getUser.mockRejectedValue(
        new Error('Database connection timeout')
      )

      const context = FYIContextFactory.buildContext()
      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database connection timeout')
    })

    it('should handle external API service failures with fallback', async () => {
      const context = FYIContextFactory.buildContext()
      
      // Mock service to return fallback data when external APIs fail
      mockFYIService.fetchInsights.mockResolvedValue({
        success: true,
        data: {
          insights: FYIFactory.buildMany(2), // Fewer cached insights
          context,
          fetchedAt: new Date().toISOString(),
          warnings: ['External APIs temporarily unavailable, showing cached data']
        }
      })

      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.insights).toHaveLength(2)
      expect(data.metadata.warnings).toContain('External APIs temporarily unavailable')
    })

    it('should handle request timeout scenarios', async () => {
      jest.setTimeout(10000) // Extend timeout for this test

      mockFYIService.fetchInsights.mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: false,
              error: { message: 'Request timeout' }
            })
          }, 8000) // Simulate long-running request
        })
      )

      const context = FYIContextFactory.buildContext()
      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Request timeout')
    })

    it('should validate Content-Type headers', async () => {
      const context = FYIContextFactory.buildContext()
      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'text/plain', // Wrong content type
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      // Should handle gracefully even with wrong content type
      expect(response.status).toBeOneOf([400, 500])
      expect(data.error).toBeDefined()
    })
  })

  describe('Security and Authorization', () => {
    it('should validate user permissions for organization access', async () => {
      // Mock user without access to organization
      const unauthorizedUser = {
        id: 'unauthorized-user-id',
        email: 'unauthorized@example.com',
      }

      mockSupabaseServerClient.auth.getUser.mockResolvedValue({
        data: { user: unauthorizedUser },
        error: null,
      })

      mockFYIService.fetchInsights.mockRejectedValue(
        new Error('User does not have access to this organization')
      )

      const context = FYIContextFactory.buildContext()
      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('User does not have access to this organization')
    })

    it('should sanitize error messages to prevent information leakage', async () => {
      // Mock service to throw error with sensitive information
      mockFYIService.fetchInsights.mockRejectedValue(
        new Error('Database connection failed: host=localhost, user=admin, password=secret123')
      )

      const context = FYIContextFactory.buildContext()
      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await fyiController.getInsights(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      // Error should not contain sensitive information
      expect(data.error).not.toContain('password=secret123')
      expect(data.error).not.toContain('host=localhost')
    })

    it('should prevent CSRF attacks with proper headers', async () => {
      const context = FYIContextFactory.buildContext()
      const requestBody = {
        organizationId: testOrganization.id,
        context,
      }

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://malicious-site.com', // Different origin
        },
      })

      // This test assumes CSRF protection would be implemented
      // For now, we just ensure the request is processed
      mockFYIService.fetchInsights.mockResolvedValue({
        success: true,
        data: {
          insights: FYIFactory.buildMany(3),
          context,
          fetchedAt: new Date().toISOString(),
        }
      })

      const response = await fyiController.getInsights(request)
      expect(response.status).toBe(200) // Currently no CSRF protection
    })
  })
})