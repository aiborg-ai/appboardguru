/**
 * Predictive Notifications Service Tests
 * Tests for smart notification generation and optimization
 */

import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals'
import { predictiveNotificationService } from '@/lib/services/predictive-notifications'
import { 
  generateSampleUserActivity, 
  generateSampleNotificationData 
} from '@/lib/test-utils/sample-data-generators'
import type { SmartNotificationRequest } from '@/types/entities/notification.types'

// Mock dependencies
jest.mock('@/lib/services/pattern-recognition', () => ({
  patternRecognitionEngine: {
    predictOptimalTiming: jest.fn(),
    analyzePatterns: jest.fn(),
    generateUserEngagementProfiles: jest.fn()
  }
}))

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabase)
}))

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({ data: [] })),
              single: jest.fn(() => ({ data: null }))
            }))
          }))
        }))
      }))
    })),
    insert: jest.fn(() => ({ data: [], error: null })),
    update: jest.fn(() => ({ data: [], error: null })),
    upsert: jest.fn(() => ({ data: [], error: null }))
  }))
}

describe('Predictive Notifications Service', () => {
  let testNotificationData: any[]
  let testUserActivities: any[]

  beforeAll(() => {
    testNotificationData = generateSampleNotificationData('test-org-123', 30, 100)
    testUserActivities = generateSampleUserActivity(10, 'test-org-123', 30)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Smart Notification Generation', () => {
    test('should generate optimized notification with timing prediction', async () => {
      const mockTimingPrediction = {
        optimalHour: 10,
        confidence: 0.85,
        expectedEngagementRate: 0.72,
        alternativeTimes: [9, 11, 14],
        reasoning: 'User typically engages most at 10 AM based on historical patterns'
      }

      const { patternRecognitionEngine } = require('@/lib/services/pattern-recognition')
      patternRecognitionEngine.predictOptimalTiming.mockResolvedValue(mockTimingPrediction)

      // Mock user profile
      patternRecognitionEngine.generateUserEngagementProfiles.mockResolvedValue([{
        userId: 'user-001',
        behaviorSegment: 'highly_engaged',
        engagementScore: 8.5,
        notificationPreferences: {
          preferredTimes: [9, 10, 11],
          responseRate: 0.78
        }
      }])

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'predicted_notifications') {
          return {
            insert: jest.fn(() => ({ 
              data: [{ prediction_id: 'pred-123', created_at: new Date().toISOString() }], 
              error: null 
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const request: SmartNotificationRequest = {
        userId: 'user-001',
        organizationId: 'test-org-123',
        type: 'meeting_reminder',
        category: 'governance',
        title: 'Board Meeting Tomorrow',
        message: 'Don\'t forget about the board meeting scheduled for tomorrow at 2 PM',
        priority: 'high',
        metadata: { meetingId: 'meeting-456' },
        scheduleOptions: {
          allowDelay: true,
          maxDelayHours: 6
        }
      }

      const result = await predictiveNotificationService.generateSmartNotification(request)

      expect(result).toMatchObject({
        predictionId: expect.any(String),
        scheduledTime: expect.any(String),
        confidence: expect.any(Number),
        optimization: expect.objectContaining({
          selectedTiming: expect.objectContaining({
            hour: 10,
            confidence: 0.85
          }),
          userSegment: 'highly_engaged',
          expectedEngagement: expect.any(Number)
        })
      })

      expect(patternRecognitionEngine.predictOptimalTiming).toHaveBeenCalledWith(
        'user-001',
        'meeting_reminder',
        'test-org-123'
      )
    })

    test('should handle users without historical data', async () => {
      const { patternRecognitionEngine } = require('@/lib/services/pattern-recognition')
      
      // Mock default timing for new user
      patternRecognitionEngine.predictOptimalTiming.mockResolvedValue({
        optimalHour: 10,
        confidence: 0.3,
        expectedEngagementRate: 0.5,
        reasoning: 'Default timing based on general patterns'
      })

      patternRecognitionEngine.generateUserEngagementProfiles.mockResolvedValue([{
        userId: 'new-user-001',
        behaviorSegment: 'new_user',
        engagementScore: 5.0,
        notificationPreferences: {
          preferredTimes: [9, 10, 11],
          responseRate: 0.5
        }
      }])

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'predicted_notifications') {
          return {
            insert: jest.fn(() => ({ 
              data: [{ prediction_id: 'pred-new-123' }], 
              error: null 
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const request: SmartNotificationRequest = {
        userId: 'new-user-001',
        organizationId: 'test-org-123',
        type: 'welcome',
        category: 'onboarding',
        title: 'Welcome to BoardGuru',
        message: 'Get started with your board governance journey',
        priority: 'medium'
      }

      const result = await predictiveNotificationService.generateSmartNotification(request)

      expect(result.confidence).toBeLessThan(0.5) // Lower confidence for new users
      expect(result.optimization.userSegment).toBe('new_user')
    })

    test('should respect scheduling constraints', async () => {
      const { patternRecognitionEngine } = require('@/lib/services/pattern-recognition')
      
      patternRecognitionEngine.predictOptimalTiming.mockResolvedValue({
        optimalHour: 22, // 10 PM - outside business hours
        confidence: 0.7,
        expectedEngagementRate: 0.6,
        alternativeTimes: [9, 10, 14]
      })

      patternRecognitionEngine.generateUserEngagementProfiles.mockResolvedValue([{
        userId: 'user-001',
        behaviorSegment: 'moderately_engaged',
        engagementScore: 6.5
      }])

      const request: SmartNotificationRequest = {
        userId: 'user-001',
        organizationId: 'test-org-123',
        type: 'document_shared',
        category: 'content',
        title: 'New Document Shared',
        message: 'A new board document has been shared with you',
        priority: 'medium',
        scheduleOptions: {
          allowDelay: true,
          maxDelayHours: 2,
          businessHoursOnly: true
        }
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'predicted_notifications') {
          return {
            insert: jest.fn(() => ({ 
              data: [{ prediction_id: 'pred-constrained-123' }], 
              error: null 
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const result = await predictiveNotificationService.generateSmartNotification(request)

      const scheduledHour = new Date(result.scheduledTime).getHours()
      expect(scheduledHour).toBeGreaterThanOrEqual(9) // Business hours constraint
      expect(scheduledHour).toBeLessThan(18)
    })
  })

  describe('Bulk Optimization', () => {
    test('should optimize timing for multiple notifications', async () => {
      const notifications = [
        {
          userId: 'user-001',
          type: 'meeting_reminder',
          priority: 'high',
          content: 'Meeting in 1 hour'
        },
        {
          userId: 'user-001',
          type: 'document_shared',
          priority: 'medium',
          content: 'New document available'
        },
        {
          userId: 'user-002',
          type: 'approval_request',
          priority: 'high',
          content: 'Approval needed'
        }
      ]

      const { patternRecognitionEngine } = require('@/lib/services/pattern-recognition')
      
      patternRecognitionEngine.predictOptimalTiming
        .mockResolvedValueOnce({
          optimalHour: 9,
          confidence: 0.8,
          expectedEngagementRate: 0.75
        })
        .mockResolvedValueOnce({
          optimalHour: 11,
          confidence: 0.7,
          expectedEngagementRate: 0.65
        })
        .mockResolvedValueOnce({
          optimalHour: 14,
          confidence: 0.85,
          expectedEngagementRate: 0.8
        })

      const optimizations = await predictiveNotificationService.optimizeBulkNotifications(notifications)

      expect(optimizations).toHaveLength(3)
      expect(optimizations).toEqual(expect.arrayContaining([
        expect.objectContaining({
          originalIndex: expect.any(Number),
          optimizedTiming: expect.objectContaining({
            hour: expect.any(Number),
            confidence: expect.any(Number)
          }),
          recommendation: expect.any(String)
        })
      ]))

      // High priority notifications should be prioritized
      const highPriorityOptimizations = optimizations.filter(opt => 
        notifications[opt.originalIndex].priority === 'high'
      )
      expect(highPriorityOptimizations.length).toBeGreaterThan(0)
    })

    test('should avoid notification flooding for same user', async () => {
      const notifications = Array(10).fill(null).map((_, index) => ({
        userId: 'user-001',
        type: 'document_shared',
        priority: 'medium',
        content: `Document ${index + 1} shared`
      }))

      const { patternRecognitionEngine } = require('@/lib/services/pattern-recognition')
      
      patternRecognitionEngine.predictOptimalTiming.mockResolvedValue({
        optimalHour: 10,
        confidence: 0.7,
        expectedEngagementRate: 0.6
      })

      const optimizations = await predictiveNotificationService.optimizeBulkNotifications(notifications)

      // Should spread notifications across time to avoid flooding
      const scheduledTimes = optimizations.map(opt => opt.optimizedTiming.hour)
      const uniqueTimes = new Set(scheduledTimes)
      
      expect(uniqueTimes.size).toBeGreaterThan(1) // Should not all be at same time
    })
  })

  describe('Predictive Insights Generation', () => {
    test('should generate comprehensive insights', async () => {
      // Mock notification data with engagement patterns
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_notifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  data: testNotificationData
                }))
              }))
            }))
          }
        }
        if (table === 'user_activity_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  data: testUserActivities
                }))
              }))
            }))
          }
        }
        if (table === 'predicted_notifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    data: [{
                      prediction_id: 'pred-123',
                      is_sent: true,
                      is_successful: true,
                      confidence_score: 0.85
                    }]
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const insights = await predictiveNotificationService.generatePredictiveInsights(
        'test-org-123',
        30
      )

      expect(insights).toMatchObject({
        organizationId: 'test-org-123',
        timeframe: 30,
        insights: expect.arrayContaining([
          expect.objectContaining({
            type: expect.stringMatching(/engagement|timing|content|user_behavior/),
            title: expect.any(String),
            description: expect.any(String),
            impact: expect.stringMatching(/high|medium|low/),
            confidence: expect.any(Number),
            actionItems: expect.any(Array)
          })
        ]),
        patterns: expect.any(Object),
        predictions: expect.any(Object),
        recommendations: expect.any(Array)
      })
    })

    test('should identify declining engagement trends', async () => {
      // Create mock data showing declining engagement
      const decliningData = testNotificationData.map((notification, index) => ({
        ...notification,
        opened_at: index < testNotificationData.length / 2 ? notification.sent_at : null,
        engagement_metrics: {
          ...notification.engagement_metrics,
          open_rate: Math.max(0.2, 0.8 - (index / testNotificationData.length))
        }
      }))

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_notifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  data: decliningData
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const insights = await predictiveNotificationService.generatePredictiveInsights(
        'test-org-123',
        30
      )

      const engagementInsights = insights.insights.filter(i => i.type === 'engagement')
      expect(engagementInsights.length).toBeGreaterThan(0)
      
      const decliningTrendInsight = engagementInsights.find(i => 
        i.description.toLowerCase().includes('declining') ||
        i.description.toLowerCase().includes('decreasing')
      )
      expect(decliningTrendInsight).toBeDefined()
    })
  })

  describe('Performance Reporting', () => {
    test('should generate accurate performance metrics', async () => {
      const mockPredictions = [
        { 
          prediction_id: 'pred-1', 
          confidence_score: 0.85, 
          is_successful: true,
          predicted_engagement_rate: 0.75,
          actual_engagement_rate: 0.78
        },
        { 
          prediction_id: 'pred-2', 
          confidence_score: 0.72, 
          is_successful: true,
          predicted_engagement_rate: 0.60,
          actual_engagement_rate: 0.58
        },
        { 
          prediction_id: 'pred-3', 
          confidence_score: 0.90, 
          is_successful: false,
          predicted_engagement_rate: 0.80,
          actual_engagement_rate: 0.45
        }
      ]

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'predicted_notifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  data: mockPredictions
                }))
              }))
            }))
          }
        }
        if (table === 'prediction_accuracy_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: [{
                  accuracy_score: 0.82,
                  prediction_error: 0.05,
                  model_version: '1.2'
                }]
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const performance = await predictiveNotificationService.generatePerformanceReport('test-org-123')

      expect(performance).toMatchObject({
        summary: expect.objectContaining({
          totalPredictions: expect.any(Number),
          successfulPredictions: expect.any(Number),
          averageConfidence: expect.any(Number),
          accuracyScore: expect.any(Number)
        }),
        metrics: expect.objectContaining({
          predictionAccuracy: expect.any(Number),
          engagementPredictionError: expect.any(Number),
          confidenceCalibration: expect.any(Number)
        }),
        trends: expect.any(Object),
        recommendations: expect.any(Array)
      })

      expect(performance.summary.successfulPredictions).toBe(2) // 2 out of 3 successful
      expect(performance.summary.averageConfidence).toBeCloseTo((0.85 + 0.72 + 0.90) / 3, 2)
    })

    test('should track model improvement over time', async () => {
      const mockAccuracyLogs = [
        { logged_at: '2024-01-01T00:00:00Z', accuracy_score: 0.75, model_version: '1.0' },
        { logged_at: '2024-01-15T00:00:00Z', accuracy_score: 0.78, model_version: '1.1' },
        { logged_at: '2024-02-01T00:00:00Z', accuracy_score: 0.82, model_version: '1.2' },
        { logged_at: '2024-02-15T00:00:00Z', accuracy_score: 0.85, model_version: '1.3' }
      ]

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'prediction_accuracy_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    data: mockAccuracyLogs
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const performance = await predictiveNotificationService.generatePerformanceReport('test-org-123')

      expect(performance.trends.accuracyTrend).toBe('improving')
      expect(performance.trends.accuracyImprovement).toBeGreaterThan(0)
    })
  })

  describe('Notification Outcome Recording', () => {
    test('should record successful notification outcomes', async () => {
      const outcome = {
        opened: true,
        openedAt: new Date().toISOString(),
        clicked: true,
        clickedAt: new Date().toISOString(),
        engagementScore: 8.5,
        userFeedback: 'helpful'
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'predicted_notifications') {
          return {
            update: jest.fn(() => ({ data: [], error: null }))
          }
        }
        if (table === 'prediction_accuracy_logs') {
          return {
            insert: jest.fn(() => ({ data: [], error: null }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      await predictiveNotificationService.recordNotificationOutcome('pred-123', outcome)

      expect(mockSupabase.from).toHaveBeenCalledWith('predicted_notifications')
      expect(mockSupabase.from).toHaveBeenCalledWith('prediction_accuracy_logs')
    })

    test('should handle failed notification outcomes', async () => {
      const outcome = {
        opened: false,
        deliveryFailed: true,
        errorReason: 'user_unavailable',
        engagementScore: 0
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'predicted_notifications') {
          return {
            update: jest.fn(() => ({ data: [], error: null }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      await predictiveNotificationService.recordNotificationOutcome('pred-failed-123', outcome)

      const updateCall = mockSupabase.from('predicted_notifications').update
      expect(updateCall).toHaveBeenCalledWith(expect.objectContaining({
        is_successful: false,
        actual_outcome: 'failed'
      }))
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        insert: jest.fn(() => ({ data: null, error: new Error('Database error') }))
      }))

      const request: SmartNotificationRequest = {
        userId: 'user-001',
        organizationId: 'test-org-123',
        type: 'test',
        category: 'test',
        title: 'Test',
        message: 'Test message',
        priority: 'medium'
      }

      await expect(
        predictiveNotificationService.generateSmartNotification(request)
      ).rejects.toThrow('Database error')
    })

    test('should handle invalid user IDs', async () => {
      const { patternRecognitionEngine } = require('@/lib/services/pattern-recognition')
      
      patternRecognitionEngine.predictOptimalTiming.mockRejectedValue(
        new Error('User not found')
      )

      const request: SmartNotificationRequest = {
        userId: 'invalid-user',
        organizationId: 'test-org-123',
        type: 'test',
        category: 'test',
        title: 'Test',
        message: 'Test message',
        priority: 'medium'
      }

      await expect(
        predictiveNotificationService.generateSmartNotification(request)
      ).rejects.toThrow('User not found')
    })

    test('should handle empty datasets', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              data: [] // Empty dataset
            }))
          }))
        }))
      }))

      const insights = await predictiveNotificationService.generatePredictiveInsights(
        'empty-org-123',
        30
      )

      expect(insights).toMatchObject({
        organizationId: 'empty-org-123',
        insights: [],
        patterns: {},
        predictions: {},
        recommendations: expect.arrayContaining([
          expect.stringContaining('insufficient data')
        ])
      })
    })
  })
})