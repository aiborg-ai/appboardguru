/**
 * API Integration Tests for Notifications Predictions
 * Tests the prediction API endpoints with realistic scenarios
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import { 
  GET as predictionsGET, 
  POST as predictionsPOST,
  PUT as predictionsPUT 
} from '@/app/api/notifications/predictions/route'
import { generateCompleteTestDataset } from '@/lib/test-utils/sample-data-generators'

// Mock Supabase
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabase)
}))

// Mock pattern recognition engine
jest.mock('@/lib/services/pattern-recognition', () => ({
  patternRecognitionEngine: {
    predictOptimalTiming: jest.fn(),
    analyzePatterns: jest.fn()
  }
}))

// Mock predictive notification service
jest.mock('@/lib/services/predictive-notifications', () => ({
  predictiveNotificationService: {
    generatePredictiveInsights: jest.fn(),
    generatePerformanceReport: jest.fn(),
    generateSmartNotification: jest.fn(),
    optimizeBulkNotifications: jest.fn(),
    recordNotificationOutcome: jest.fn()
  }
}))

const mockSupabase = {
  auth: {
    getUser: jest.fn(() => ({
      data: { user: { id: 'test-user-123' } },
      error: null
    }))
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ data: [] }))
          }))
        }))
      }))
    })),
    insert: jest.fn(() => ({ data: [], error: null })),
    update: jest.fn(() => ({ data: [], error: null }))
  }))
}

describe('/api/notifications/predictions', () => {
  let testDataset: any

  beforeAll(() => {
    testDataset = generateCompleteTestDataset('test-org-123')
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  describe('GET /api/notifications/predictions', () => {
    test('should return insights when type=insights', async () => {
      const mockInsights = {
        organizationId: 'test-org-123',
        timeframe: 30,
        insights: [
          {
            type: 'engagement',
            title: 'Peak Engagement Times',
            description: 'Users are most engaged between 9-11 AM',
            impact: 'high',
            confidence: 0.85,
            actionItems: ['Schedule important notifications during peak hours']
          }
        ],
        patterns: {
          timing: { peakHours: [9, 10, 11] },
          engagement: { averageRate: 0.72 }
        },
        predictions: {
          nextWeekEngagement: 0.75,
          trends: ['increasing']
        },
        recommendations: ['Optimize notification timing', 'Personalize content']
      }

      const { predictiveNotificationService } = require('@/lib/services/predictive-notifications')
      predictiveNotificationService.generatePredictiveInsights.mockResolvedValue(mockInsights)

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/notifications/predictions?organizationId=test-org-123&type=insights&lookbackDays=30'
      })

      await predictionsGET(req as any)

      expect(predictiveNotificationService.generatePredictiveInsights).toHaveBeenCalledWith(
        'test-org-123',
        30
      )
    })

    test('should return predictions when type=predictions', async () => {
      const mockPredictions = [
        {
          prediction_id: 'pred-123',
          user_id: 'user-001',
          notification_type: 'meeting_reminder',
          predicted_time: new Date().toISOString(),
          confidence_score: 0.85,
          users: { full_name: 'John Doe', email: 'john@example.com' }
        }
      ]

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'predicted_notifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  order: jest.fn(() => ({
                    limit: jest.fn(() => ({
                      data: mockPredictions
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/notifications/predictions?organizationId=test-org-123&type=predictions'
      })

      const response = await predictionsGET(req as any)
      const data = await response.json()

      expect(data.predictions).toHaveLength(1)
      expect(data.predictions[0]).toMatchObject({
        prediction_id: 'pred-123',
        confidence_score: 0.85
      })
    })

    test('should return performance metrics when type=performance', async () => {
      const mockPerformance = {
        summary: {
          totalPredictions: 100,
          successfulPredictions: 85,
          averageConfidence: 0.78,
          accuracyScore: 0.82
        },
        metrics: {
          predictionAccuracy: 0.82,
          engagementPredictionError: 0.05,
          confidenceCalibration: 0.88
        },
        trends: {
          accuracyTrend: 'improving',
          accuracyImprovement: 0.03
        },
        recommendations: ['Increase training data', 'Adjust model parameters']
      }

      const { predictiveNotificationService } = require('@/lib/services/predictive-notifications')
      predictiveNotificationService.generatePerformanceReport.mockResolvedValue(mockPerformance)

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/notifications/predictions?organizationId=test-org-123&type=performance'
      })

      const response = await predictionsGET(req as any)
      const data = await response.json()

      expect(data.performance).toEqual(mockPerformance)
    })

    test('should return combined data when no specific type is requested', async () => {
      const mockInsights = { insights: [] }
      const mockPredictions = []
      const mockPerformance = { summary: {} }

      const { predictiveNotificationService } = require('@/lib/services/predictive-notifications')
      predictiveNotificationService.generatePredictiveInsights.mockResolvedValue(mockInsights)
      predictiveNotificationService.generatePerformanceReport.mockResolvedValue(mockPerformance)

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({
                  data: mockPredictions
                }))
              }))
            }))
          }))
        }))
      }))

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/notifications/predictions?organizationId=test-org-123'
      })

      const response = await predictionsGET(req as any)
      const data = await response.json()

      expect(data).toHaveProperty('insights')
      expect(data).toHaveProperty('predictions')
      expect(data).toHaveProperty('performance')
    })

    test('should require organizationId parameter', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/notifications/predictions'
      })

      const response = await predictionsGET(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Organization ID required')
    })

    test('should verify organization access', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: null // No membership found
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/notifications/predictions?organizationId=unauthorized-org'
      })

      const response = await predictionsGET(req as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })

  describe('POST /api/notifications/predictions', () => {
    test('should create smart notification', async () => {
      const mockResult = {
        predictionId: 'pred-new-123',
        scheduledTime: new Date().toISOString(),
        confidence: 0.85,
        optimization: {
          selectedTiming: { hour: 10, confidence: 0.85 },
          userSegment: 'highly_engaged',
          expectedEngagement: 0.78
        }
      }

      const { predictiveNotificationService } = require('@/lib/services/predictive-notifications')
      predictiveNotificationService.generateSmartNotification.mockResolvedValue(mockResult)

      // Mock organization membership check
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organization_members') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { role: 'admin' }
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const requestBody = {
        action: 'create_smart_notification',
        userId: 'user-001',
        organizationId: 'test-org-123',
        type: 'meeting_reminder',
        category: 'governance',
        title: 'Board Meeting Tomorrow',
        message: 'Don\'t forget about the board meeting scheduled for tomorrow',
        priority: 'high',
        resourceType: 'meeting',
        resourceId: 'meeting-456',
        metadata: { meetingId: 'meeting-456' }
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: requestBody
      })

      const response = await predictionsPOST(req as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        predictionId: 'pred-new-123',
        status: 'scheduled',
        confidence: 0.85
      })

      expect(predictiveNotificationService.generateSmartNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-001',
          type: 'meeting_reminder',
          title: 'Board Meeting Tomorrow'
        })
      )
    })

    test('should optimize bulk notifications', async () => {
      const notifications = [
        {
          userId: 'user-001',
          type: 'meeting_reminder',
          priority: 'high',
          content: 'Meeting in 1 hour'
        },
        {
          userId: 'user-002',
          type: 'document_shared',
          priority: 'medium',
          content: 'New document available'
        }
      ]

      const mockOptimizations = [
        {
          originalIndex: 0,
          optimizedTiming: { hour: 9, confidence: 0.8 },
          recommendation: 'Send immediately for high priority'
        },
        {
          originalIndex: 1,
          optimizedTiming: { hour: 11, confidence: 0.7 },
          recommendation: 'Delay to optimize engagement'
        }
      ]

      const { predictiveNotificationService } = require('@/lib/services/predictive-notifications')
      predictiveNotificationService.optimizeBulkNotifications.mockResolvedValue(mockOptimizations)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'bulk_optimize',
          notifications
        }
      })

      const response = await predictionsPOST(req as any)
      const data = await response.json()

      expect(data.optimizations).toHaveLength(2)
      expect(data.optimizations[0].optimizedTiming.hour).toBe(9)
    })

    test('should record notification outcome', async () => {
      const { predictiveNotificationService } = require('@/lib/services/predictive-notifications')
      predictiveNotificationService.recordNotificationOutcome.mockResolvedValue(undefined)

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'record_outcome',
          predictionId: 'pred-123',
          outcome: {
            opened: true,
            openedAt: new Date().toISOString(),
            clicked: true,
            engagementScore: 8.5
          }
        }
      })

      const response = await predictionsPOST(req as any)
      const data = await response.json()

      expect(data.status).toBe('recorded')
      expect(predictiveNotificationService.recordNotificationOutcome).toHaveBeenCalledWith(
        'pred-123',
        expect.objectContaining({
          opened: true,
          clicked: true
        })
      )
    })

    test('should validate required fields for smart notification', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'create_smart_notification',
          userId: 'user-001',
          // Missing required fields: type, title, message
        }
      })

      const response = await predictionsPOST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    test('should handle invalid actions', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'invalid_action'
        }
      })

      const response = await predictionsPOST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid action')
    })
  })

  describe('PUT /api/notifications/predictions', () => {
    test('should reschedule notification', async () => {
      const mockPrediction = {
        prediction_id: 'pred-123',
        user_id: 'test-user-123',
        organization_id: 'test-org-123',
        users: { id: 'test-user-123' }
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'predicted_notifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockPrediction
                }))
              }))
            })),
            update: jest.fn(() => ({ data: [], error: null }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const newTime = new Date().toISOString()

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          predictionId: 'pred-123',
          action: 'reschedule',
          newTime
        }
      })

      const response = await predictionsPUT(req as any)
      const data = await response.json()

      expect(data.status).toBe('rescheduled')
      expect(data.newTime).toBe(newTime)
    })

    test('should cancel notification', async () => {
      const mockPrediction = {
        prediction_id: 'pred-123',
        user_id: 'test-user-123',
        users: { id: 'test-user-123' }
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'predicted_notifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockPrediction
                }))
              }))
            })),
            update: jest.fn(() => ({ data: [], error: null }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          predictionId: 'pred-123',
          action: 'cancel'
        }
      })

      const response = await predictionsPUT(req as any)
      const data = await response.json()

      expect(data.status).toBe('cancelled')
    })

    test('should verify prediction ownership', async () => {
      const mockPrediction = {
        prediction_id: 'pred-123',
        user_id: 'other-user-456', // Different from authenticated user
        users: { id: 'other-user-456' }
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'predicted_notifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockPrediction
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          predictionId: 'pred-123',
          action: 'reschedule',
          newTime: new Date().toISOString()
        }
      })

      const response = await predictionsPUT(req as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })

    test('should handle non-existent predictions', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null
            }))
          }))
        }))
      }))

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          predictionId: 'non-existent-pred',
          action: 'reschedule',
          newTime: new Date().toISOString()
        }
      })

      const response = await predictionsPUT(req as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Prediction not found')
    })

    test('should validate required fields for reschedule', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          predictionId: 'pred-123',
          action: 'reschedule'
          // Missing newTime field
        }
      })

      const response = await predictionsPUT(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('newTime required')
    })
  })

  describe('Authentication and Authorization', () => {
    test('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('No user')
      })

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/notifications/predictions?organizationId=test-org-123'
      })

      const response = await predictionsGET(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth service unavailable')
      })

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/notifications/predictions?organizationId=test-org-123'
      })

      const response = await predictionsGET(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Error Handling', () => {
    test('should handle service errors gracefully', async () => {
      const { predictiveNotificationService } = require('@/lib/services/predictive-notifications')
      predictiveNotificationService.generatePredictiveInsights.mockRejectedValue(
        new Error('Service unavailable')
      )

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/notifications/predictions?organizationId=test-org-123&type=insights'
      })

      const response = await predictionsGET(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    test('should handle malformed request bodies', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: null // Malformed body
      })

      const response = await predictionsPOST(req as any)

      expect(response.status).toBe(500)
    })
  })
})