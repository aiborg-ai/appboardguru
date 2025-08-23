/**
 * FYI Preferences API Integration Tests
 * Tests complete request/response cycles for FYI preferences management
 * Following CLAUDE.md testing guidelines with 80% coverage target
 */

import { NextRequest, NextResponse } from 'next/server'
import { fyiController } from '@/lib/api/controllers/fyi.controller'
import { FYIService } from '@/lib/services/fyi.service'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { SettingsTestFactories } from '@/testing/settings-test-factories'

// Mock dependencies
jest.mock('@/lib/supabase-server')
jest.mock('@/lib/services/fyi.service')

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  }
}

const mockFYIService = {
  getUserPreferences: jest.fn(),
  updateUserPreferences: jest.fn(),
  fetchInsights: jest.fn(),
  logUserInteraction: jest.fn()
}

const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>
const MockFYIService = FYIService as jest.MockedClass<typeof FYIService>

describe('FYI Preferences API Integration Tests', () => {
  const mockUserId = 'user-123' as const
  const mockUser = {
    id: mockUserId,
    email: 'test@appboardguru.com'
  }

  beforeAll(() => {
    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabaseClient as any)
    MockFYIService.mockImplementation(() => mockFYIService as any)
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default auth mock
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Reset service mocks
    Object.values(mockFYIService).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset()
      }
    })
  })

  describe('GET /api/fyi/preferences - Get User Preferences', () => {
    test('should return user preferences successfully', async () => {
      const mockPreferences = SettingsTestFactories.createFYIPreferences({
        userId: mockUserId,
        newsCategories: ['technology', 'business', 'science'],
        updateFrequency: 'daily',
        digestEnabled: true,
        insightTypes: {
          market: true,
          news: true,
          weather: false,
          calendar: true
        },
        notificationSettings: {
          email: true,
          push: false,
          inApp: true
        }
      })

      mockFYIService.getUserPreferences.mockResolvedValue(mockPreferences)

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'GET'
      })

      const response = await fyiController.getUserPreferences(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        preferences: mockPreferences
      })
      expect(mockFYIService.getUserPreferences).toHaveBeenCalledWith(mockUserId)
    })

    test('should handle authentication failure', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'GET'
      })

      const response = await fyiController.getUserPreferences(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toContain('Authentication required')
      expect(mockFYIService.getUserPreferences).not.toHaveBeenCalled()
    })

    test('should handle service errors gracefully', async () => {
      mockFYIService.getUserPreferences.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'GET'
      })

      const response = await fyiController.getUserPreferences(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Database connection failed')
    })

    test('should handle missing user preferences', async () => {
      mockFYIService.getUserPreferences.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'GET'
      })

      const response = await fyiController.getUserPreferences(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        preferences: null
      })
    })
  })

  describe('POST /api/fyi/preferences - Update User Preferences', () => {
    test('should update user preferences successfully', async () => {
      const preferencesUpdate = {
        newsCategories: ['technology', 'health'],
        updateFrequency: 'hourly',
        digestEnabled: false,
        insightTypes: {
          market: false,
          news: true,
          weather: true,
          calendar: false
        },
        notificationSettings: {
          email: false,
          push: true,
          inApp: true
        },
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'America/New_York'
        }
      }

      const updatedPreferences = SettingsTestFactories.createFYIPreferences({
        userId: mockUserId,
        ...preferencesUpdate
      })

      mockFYIService.updateUserPreferences.mockResolvedValue(updatedPreferences)

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify({ preferences: preferencesUpdate })
      })

      const response = await fyiController.updateUserPreferences(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        preferences: updatedPreferences
      })
      expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
        mockUserId,
        preferencesUpdate
      )
    })

    test('should validate required preferences data', async () => {
      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify({}) // Missing preferences
      })

      const response = await fyiController.updateUserPreferences(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Preferences data is required')
      expect(mockFYIService.updateUserPreferences).not.toHaveBeenCalled()
    })

    test('should handle partial preference updates', async () => {
      const partialUpdate = {
        digestEnabled: false,
        updateFrequency: 'weekly'
      }

      const updatedPreferences = SettingsTestFactories.createFYIPreferences({
        userId: mockUserId,
        digestEnabled: false,
        updateFrequency: 'weekly'
      })

      mockFYIService.updateUserPreferences.mockResolvedValue(updatedPreferences)

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify({ preferences: partialUpdate })
      })

      const response = await fyiController.updateUserPreferences(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.preferences).toEqual(updatedPreferences)
      expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
        mockUserId,
        partialUpdate
      )
    })

    test('should handle service update errors', async () => {
      mockFYIService.updateUserPreferences.mockRejectedValue(
        new Error('Validation failed: Invalid category')
      )

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify({
          preferences: { newsCategories: ['invalid-category'] }
        })
      })

      const response = await fyiController.updateUserPreferences(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Validation failed: Invalid category')
    })

    test('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: 'invalid-json'
      })

      const response = await fyiController.updateUserPreferences(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBeDefined()
      expect(mockFYIService.updateUserPreferences).not.toHaveBeenCalled()
    })

    test('should handle empty preferences object', async () => {
      const emptyPreferences = {}
      const updatedPreferences = SettingsTestFactories.createFYIPreferences({
        userId: mockUserId
      })

      mockFYIService.updateUserPreferences.mockResolvedValue(updatedPreferences)

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify({ preferences: emptyPreferences })
      })

      const response = await fyiController.updateUserPreferences(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
        mockUserId,
        emptyPreferences
      )
    })
  })

  describe('POST /api/fyi/insights - Get Insights', () => {
    test('should fetch insights with valid context', async () => {
      const organizationId = 'org-123'
      const context = {
        documentCount: 150,
        activeProjects: 8,
        recentActivity: {
          uploads: 12,
          views: 89,
          shares: 5
        },
        userRole: 'administrator',
        preferences: {
          newsCategories: ['technology', 'business']
        }
      }

      const mockInsights = [
        SettingsTestFactories.createFYIInsight({
          type: 'market',
          title: 'Tech Stock Market Update',
          summary: 'Technology sector shows positive growth',
          relevance: 0.85,
          source: 'market-data'
        }),
        SettingsTestFactories.createFYIInsight({
          type: 'news',
          title: 'Industry News Update',
          summary: 'Latest developments in your industry',
          relevance: 0.72,
          source: 'news-api'
        })
      ]

      mockFYIService.fetchInsights.mockResolvedValue(mockInsights)

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify({ organizationId, context })
      })

      const response = await fyiController.getInsights(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        insights: mockInsights,
        context,
        metadata: {
          timestamp: expect.any(String),
          count: mockInsights.length,
          userId: mockUserId,
          organizationId
        }
      })
      expect(mockFYIService.fetchInsights).toHaveBeenCalledWith(
        organizationId,
        mockUserId,
        context
      )
    })

    test('should validate required parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify({}) // Missing organizationId and context
      })

      const response = await fyiController.getInsights(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Organization ID and context are required')
      expect(mockFYIService.fetchInsights).not.toHaveBeenCalled()
    })

    test('should handle missing organization ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify({
          context: { documentCount: 10 }
        })
      })

      const response = await fyiController.getInsights(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Organization ID and context are required')
    })

    test('should handle service fetch errors', async () => {
      mockFYIService.fetchInsights.mockRejectedValue(
        new Error('External API unavailable')
      )

      const request = new NextRequest('http://localhost:3000/api/fyi/insights', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: 'org-123',
          context: { documentCount: 10 }
        })
      })

      const response = await fyiController.getInsights(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('External API unavailable')
    })
  })

  describe('POST /api/fyi/interactions - Log User Interaction', () => {
    test('should log interaction successfully', async () => {
      const interactionData = {
        insightId: 'insight-123',
        action: 'view',
        organizationId: 'org-123'
      }

      mockFYIService.logUserInteraction.mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/fyi/interactions', {
        method: 'POST',
        body: JSON.stringify(interactionData)
      })

      const response = await fyiController.logInteraction(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({ success: true })
      expect(mockFYIService.logUserInteraction).toHaveBeenCalledWith(
        mockUserId,
        interactionData.insightId,
        interactionData.action,
        interactionData.organizationId
      )
    })

    test('should validate required interaction parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/fyi/interactions', {
        method: 'POST',
        body: JSON.stringify({
          insightId: 'insight-123'
          // Missing action
        })
      })

      const response = await fyiController.logInteraction(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Insight ID and action are required')
      expect(mockFYIService.logUserInteraction).not.toHaveBeenCalled()
    })

    test('should handle interaction logging errors', async () => {
      mockFYIService.logUserInteraction.mockRejectedValue(
        new Error('Database write failed')
      )

      const request = new NextRequest('http://localhost:3000/api/fyi/interactions', {
        method: 'POST',
        body: JSON.stringify({
          insightId: 'insight-123',
          action: 'click'
        })
      })

      const response = await fyiController.logInteraction(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Database write failed')
    })

    test('should handle interaction without organization ID', async () => {
      const interactionData = {
        insightId: 'insight-123',
        action: 'dismiss'
      }

      mockFYIService.logUserInteraction.mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/fyi/interactions', {
        method: 'POST',
        body: JSON.stringify(interactionData)
      })

      const response = await fyiController.logInteraction(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(mockFYIService.logUserInteraction).toHaveBeenCalledWith(
        mockUserId,
        interactionData.insightId,
        interactionData.action,
        undefined // organizationId not provided
      )
    })
  })

  describe('Authentication and Error Handling', () => {
    test('should handle authentication errors consistently', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' }
      })

      const endpoints = [
        { method: 'GET', url: '/api/fyi/preferences' },
        { method: 'POST', url: '/api/fyi/preferences', body: { preferences: {} } },
        { method: 'POST', url: '/api/fyi/insights', body: { organizationId: 'org', context: {} } },
        { method: 'POST', url: '/api/fyi/interactions', body: { insightId: 'insight', action: 'view' } }
      ]

      for (const endpoint of endpoints) {
        const request = new NextRequest(`http://localhost:3000${endpoint.url}`, {
          method: endpoint.method,
          ...(endpoint.body && { body: JSON.stringify(endpoint.body) })
        })

        let response: Response
        switch (endpoint.url) {
          case '/api/fyi/preferences':
            response = endpoint.method === 'GET' 
              ? await fyiController.getUserPreferences(request)
              : await fyiController.updateUserPreferences(request)
            break
          case '/api/fyi/insights':
            response = await fyiController.getInsights(request)
            break
          case '/api/fyi/interactions':
            response = await fyiController.logInteraction(request)
            break
          default:
            throw new Error(`Unknown endpoint: ${endpoint.url}`)
        }

        expect(response.status).toBe(401)
        const responseData = await response.json()
        expect(responseData.error).toContain('Authentication required')
      }
    })

    test('should handle service initialization failures', async () => {
      // Mock process.env to be undefined to simulate missing API keys
      const originalEnv = process.env
      process.env = {}

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'GET'
      })

      const response = await fyiController.getUserPreferences(request)
      
      // The service should still be created even with missing keys
      expect(response.status).toBe(200)
      
      // Restore original env
      process.env = originalEnv
    })

    test('should handle concurrent request processing', async () => {
      const mockPreferences = SettingsTestFactories.createFYIPreferences({
        userId: mockUserId
      })

      mockFYIService.getUserPreferences.mockResolvedValue(mockPreferences)

      // Create multiple concurrent requests
      const requests = Array(5).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/fyi/preferences', { method: 'GET' })
      )

      const responses = await Promise.all(
        requests.map(request => fyiController.getUserPreferences(request))
      )

      // All requests should succeed
      responses.forEach(async (response) => {
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.preferences).toEqual(mockPreferences)
      })

      expect(mockFYIService.getUserPreferences).toHaveBeenCalledTimes(5)
    })
  })

  describe('Data Integrity and Performance', () => {
    test('should handle large preference objects efficiently', async () => {
      const largePreferences = {
        newsCategories: Array(100).fill(0).map((_, i) => `category-${i}`),
        customFilters: Array(50).fill(0).map((_, i) => ({
          id: `filter-${i}`,
          name: `Custom Filter ${i}`,
          rules: Array(10).fill(0).map((_, j) => ({
            field: `field-${j}`,
            operator: 'contains',
            value: `value-${j}`
          }))
        })),
        metadata: {
          largeObject: Array(1000).fill(0).reduce((acc, _, i) => ({
            ...acc,
            [`key-${i}`]: `value-${i}`
          }), {})
        }
      }

      mockFYIService.updateUserPreferences.mockResolvedValue(
        SettingsTestFactories.createFYIPreferences({
          userId: mockUserId,
          ...largePreferences
        })
      )

      const request = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify({ preferences: largePreferences })
      })

      const startTime = Date.now()
      const response = await fyiController.updateUserPreferences(request)
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      expect(mockFYIService.updateUserPreferences).toHaveBeenCalledWith(
        mockUserId,
        largePreferences
      )
    })

    test('should maintain preference data consistency', async () => {
      const preferences1 = { digestEnabled: true }
      const preferences2 = { digestEnabled: false }

      mockFYIService.updateUserPreferences
        .mockResolvedValueOnce(SettingsTestFactories.createFYIPreferences({
          userId: mockUserId,
          digestEnabled: true
        }))
        .mockResolvedValueOnce(SettingsTestFactories.createFYIPreferences({
          userId: mockUserId,
          digestEnabled: false
        }))

      const request1 = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify({ preferences: preferences1 })
      })

      const request2 = new NextRequest('http://localhost:3000/api/fyi/preferences', {
        method: 'POST',
        body: JSON.stringify({ preferences: preferences2 })
      })

      const [response1, response2] = await Promise.all([
        fyiController.updateUserPreferences(request1),
        fyiController.updateUserPreferences(request2)
      ])

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)

      const data1 = await response1.json()
      const data2 = await response2.json()

      expect(data1.preferences.digestEnabled).toBe(true)
      expect(data2.preferences.digestEnabled).toBe(false)
    })
  })
})