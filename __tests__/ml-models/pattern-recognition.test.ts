/**
 * Pattern Recognition Engine Tests
 * Tests for ML algorithms and pattern detection capabilities
 */

import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals'
import { patternRecognitionEngine } from '@/lib/services/pattern-recognition'
import { 
  generateSampleUserActivity, 
  generateSampleNotificationData,
  generateSampleBoardMeetingData,
  generateSeasonalPatterns,
  generateAnomalousData,
  type SampleUserActivity 
} from '@/lib/test-utils/sample-data-generators'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({ data: [] }))
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

describe('Pattern Recognition Engine', () => {
  let testData: {
    userActivities: SampleUserActivity[]
    notifications: any[]
    meetings: any[]
  }

  beforeAll(() => {
    // Generate comprehensive test dataset
    const organizationId = 'test-org-123'
    const userActivities = generateSampleUserActivity(20, organizationId, 90)
    const notifications = generateSampleNotificationData(organizationId, 90, 500)
    const meetings = generateSampleBoardMeetingData(organizationId, 12)
    
    // Add seasonal patterns
    const seasonalActivities = generateSeasonalPatterns(userActivities, {
      weeklyPattern: true,
      monthlyPattern: true,
      quarterlyPattern: true
    })
    
    // Add anomalies
    const anomalies = generateAnomalousData(seasonalActivities, 0.05)
    
    testData = {
      userActivities: [...seasonalActivities, ...anomalies],
      notifications,
      meetings
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Pattern Analysis', () => {
    test('should detect timing patterns in user activity', async () => {
      // Mock database responses with our test data
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_activity_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: testData.userActivities
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const patterns = await patternRecognitionEngine.analyzePatterns('test-org-123', {
        userId: 'user-001',
        lookbackDays: 30,
        patternTypes: ['timing'],
        minConfidence: 0.6
      })

      expect(patterns).toHaveLength(expect.any(Number))
      expect(patterns[0]).toMatchObject({
        pattern_type: 'timing',
        confidence: expect.any(Number),
        pattern_data: expect.any(Object)
      })
    })

    test('should detect engagement patterns', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_activity_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: testData.userActivities
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const patterns = await patternRecognitionEngine.analyzePatterns('test-org-123', {
        patternTypes: ['engagement'],
        minConfidence: 0.5
      })

      expect(patterns).toEqual(expect.arrayContaining([
        expect.objectContaining({
          pattern_type: 'engagement',
          confidence: expect.any(Number),
          pattern_data: expect.objectContaining({
            average_engagement: expect.any(Number),
            peak_engagement_times: expect.any(Array)
          })
        })
      ]))
    })

    test('should detect frequency patterns', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_activity_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: testData.userActivities.filter(a => a.user_id === 'user-001')
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const patterns = await patternRecognitionEngine.analyzePatterns('test-org-123', {
        userId: 'user-001',
        patternTypes: ['frequency'],
        lookbackDays: 30
      })

      expect(patterns).toEqual(expect.arrayContaining([
        expect.objectContaining({
          pattern_type: 'frequency',
          pattern_data: expect.objectContaining({
            average_daily_activity: expect.any(Number),
            activity_variance: expect.any(Number)
          })
        })
      ]))
    })

    test('should detect content patterns', async () => {
      const contentActivities = testData.userActivities.map(activity => ({
        ...activity,
        event_data: {
          ...activity.event_data,
          content_type: ['document', 'meeting', 'report', 'policy'][Math.floor(Math.random() * 4)],
          category: ['governance', 'compliance', 'financial', 'strategic'][Math.floor(Math.random() * 4)]
        }
      }))

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_activity_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: contentActivities
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const patterns = await patternRecognitionEngine.analyzePatterns('test-org-123', {
        patternTypes: ['content'],
        minConfidence: 0.4
      })

      expect(patterns).toEqual(expect.arrayContaining([
        expect.objectContaining({
          pattern_type: 'content',
          pattern_data: expect.objectContaining({
            preferred_content_types: expect.any(Array),
            content_engagement_scores: expect.any(Object)
          })
        })
      ]))
    })
  })

  describe('Anomaly Detection', () => {
    test('should detect volume anomalies', async () => {
      // Create data with volume spikes
      const anomalousData = generateAnomalousData(testData.userActivities, 0.1)
      const allData = [...testData.userActivities, ...anomalousData]

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_activity_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: allData
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { 
          select: jest.fn(() => ({ data: [] })),
          insert: jest.fn(() => ({ data: [], error: null }))
        }
      })

      const anomalies = await patternRecognitionEngine.detectAnomalies('test-org-123', {
        lookbackDays: 30,
        sensitivity: 'medium'
      })

      expect(anomalies).toHaveLength(expect.any(Number))
      expect(anomalies).toEqual(expect.arrayContaining([
        expect.objectContaining({
          anomaly_type: expect.stringMatching(/volume|timing|sequence|velocity/),
          severity: expect.stringMatching(/low|medium|high|critical/),
          confidence_score: expect.any(Number),
          anomaly_data: expect.any(Object)
        })
      ]))
    })

    test('should detect timing anomalies', async () => {
      // Create activities at unusual hours
      const unusualTimingData = testData.userActivities.map(activity => {
        const date = new Date(activity.timestamp)
        if (Math.random() < 0.1) { // 10% of activities at 3 AM
          date.setHours(3, Math.floor(Math.random() * 60), 0, 0)
          return {
            ...activity,
            timestamp: date.toISOString(),
            event_data: { ...activity.event_data, anomaly_marker: 'unusual_timing' }
          }
        }
        return activity
      })

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_activity_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: unusualTimingData
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { 
          select: jest.fn(() => ({ data: [] })),
          insert: jest.fn(() => ({ data: [], error: null }))
        }
      })

      const anomalies = await patternRecognitionEngine.detectAnomalies('test-org-123', {
        lookbackDays: 7,
        sensitivity: 'high'
      })

      const timingAnomalies = anomalies.filter(a => a.anomaly_type === 'timing')
      expect(timingAnomalies.length).toBeGreaterThan(0)
    })

    test('should adjust sensitivity correctly', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_activity_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: testData.userActivities
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { 
          select: jest.fn(() => ({ data: [] })),
          insert: jest.fn(() => ({ data: [], error: null }))
        }
      })

      // High sensitivity should detect more anomalies
      const highSensitivityAnomalies = await patternRecognitionEngine.detectAnomalies('test-org-123', {
        sensitivity: 'high'
      })

      // Low sensitivity should detect fewer anomalies
      const lowSensitivityAnomalies = await patternRecognitionEngine.detectAnomalies('test-org-123', {
        sensitivity: 'low'
      })

      expect(highSensitivityAnomalies.length).toBeGreaterThanOrEqual(lowSensitivityAnomalies.length)
    })
  })

  describe('User Engagement Profiles', () => {
    test('should generate comprehensive user profiles', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_activity_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: testData.userActivities
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        if (table === 'user_notifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  data: testData.notifications
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const profiles = await patternRecognitionEngine.generateUserEngagementProfiles(
        'test-org-123',
        ['user-001', 'user-002', 'user-003']
      )

      expect(profiles).toHaveLength(3)
      profiles.forEach(profile => {
        expect(profile).toMatchObject({
          userId: expect.any(String),
          behaviorSegment: expect.stringMatching(/highly_engaged|moderately_engaged|low_engagement|at_risk/),
          engagementScore: expect.any(Number),
          activityPatterns: expect.objectContaining({
            peakHours: expect.any(Array),
            averageDailyActivity: expect.any(Number),
            weeklyPattern: expect.any(Object)
          }),
          notificationPreferences: expect.objectContaining({
            preferredTimes: expect.any(Array),
            responseRate: expect.any(Number),
            engagementRate: expect.any(Number)
          }),
          riskFactors: expect.any(Array),
          recommendations: expect.any(Array)
        })
      })
    })

    test('should segment users correctly', async () => {
      // Create users with different engagement levels
      const highEngagementData = testData.userActivities.filter(a => 
        a.user_id === 'user-001' && (a.engagement_score || 0) > 7
      )
      const lowEngagementData = testData.userActivities.filter(a => 
        a.user_id === 'user-002' && (a.engagement_score || 0) < 3
      )

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_activity_logs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(userId => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: userId === 'user-001' ? highEngagementData : lowEngagementData
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const profiles = await patternRecognitionEngine.generateUserEngagementProfiles(
        'test-org-123',
        ['user-001', 'user-002']
      )

      const highEngagementProfile = profiles.find(p => p.userId === 'user-001')
      const lowEngagementProfile = profiles.find(p => p.userId === 'user-002')

      expect(highEngagementProfile?.behaviorSegment).toMatch(/highly_engaged|moderately_engaged/)
      expect(lowEngagementProfile?.behaviorSegment).toMatch(/low_engagement|at_risk/)
    })
  })

  describe('Optimal Timing Prediction', () => {
    test('should predict optimal notification timing', async () => {
      // Mock notification history with timing patterns
      const notificationHistory = testData.notifications.filter(n => 
        n.user_id === 'user-001' && n.opened_at
      ).map(n => ({
        ...n,
        sent_hour: new Date(n.sent_at).getHours(),
        response_time: n.engagement_metrics.response_time_hours || 2
      }))

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'user_notifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  order: jest.fn(() => ({
                    data: notificationHistory
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const prediction = await patternRecognitionEngine.predictOptimalTiming(
        'user-001',
        'meeting_reminder',
        'test-org-123'
      )

      expect(prediction).toMatchObject({
        optimalHour: expect.any(Number),
        confidence: expect.any(Number),
        expectedEngagementRate: expect.any(Number),
        alternativeTimes: expect.any(Array),
        reasoning: expect.any(String)
      })

      expect(prediction.optimalHour).toBeGreaterThanOrEqual(0)
      expect(prediction.optimalHour).toBeLessThan(24)
      expect(prediction.confidence).toBeGreaterThanOrEqual(0)
      expect(prediction.confidence).toBeLessThanOrEqual(1)
    })

    test('should handle users with no notification history', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                data: [] // No notification history
              }))
            }))
          }))
        }))
      }))

      const prediction = await patternRecognitionEngine.predictOptimalTiming(
        'new-user-001',
        'welcome',
        'test-org-123'
      )

      expect(prediction).toMatchObject({
        optimalHour: expect.any(Number),
        confidence: expect.any(Number),
        reasoning: expect.stringContaining('default')
      })

      // Should have low confidence for new users
      expect(prediction.confidence).toBeLessThan(0.5)
    })
  })

  describe('Board Activity Trends', () => {
    test('should analyze meeting frequency trends', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'board_meetings') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  order: jest.fn(() => ({
                    data: testData.meetings
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const trends = await patternRecognitionEngine.analyzeBoardActivityTrends(
        'test-org-123',
        'meeting_frequency',
        90
      )

      expect(trends).toMatchObject({
        metric: 'meeting_frequency',
        timeframe: 90,
        trend: expect.stringMatching(/increasing|decreasing|stable/),
        data: expect.any(Array),
        insights: expect.any(Array),
        forecast: expect.objectContaining({
          nextPeriod: expect.any(Number),
          confidence: expect.any(Number)
        })
      })
    })

    test('should analyze attendance trends', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'board_meetings') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  order: jest.fn(() => ({
                    data: testData.meetings
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn(() => ({ data: [] })) }
      })

      const trends = await patternRecognitionEngine.analyzeBoardActivityTrends(
        'test-org-123',
        'attendance_rate',
        60
      )

      expect(trends.data).toEqual(expect.arrayContaining([
        expect.objectContaining({
          period: expect.any(String),
          value: expect.any(Number),
          attendanceRate: expect.any(Number)
        })
      ]))
    })
  })

  describe('Performance and Validation', () => {
    test('should handle large datasets efficiently', async () => {
      // Generate large dataset
      const largeDataset = generateSampleUserActivity(100, 'test-org-123', 180)
      
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: largeDataset
                }))
              }))
            }))
          }))
        }))
      }))

      const startTime = Date.now()
      const patterns = await patternRecognitionEngine.analyzePatterns('test-org-123', {
        lookbackDays: 180,
        patternTypes: ['timing', 'frequency']
      })
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(10000) // Should complete in under 10 seconds
      expect(patterns).toHaveLength(expect.any(Number))
    })

    test('should validate confidence scores are reasonable', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: testData.userActivities
                }))
              }))
            }))
          }))
        }))
      }))

      const patterns = await patternRecognitionEngine.analyzePatterns('test-org-123', {
        patternTypes: ['timing', 'frequency', 'engagement'],
        minConfidence: 0.1 // Low threshold to get more results
      })

      patterns.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0)
        expect(pattern.confidence).toBeLessThanOrEqual(1)
        expect(pattern.confidence).toBeGreaterThanOrEqual(0.1) // Should meet minimum threshold
      })
    })

    test('should handle edge cases gracefully', async () => {
      // Empty dataset
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: []
                }))
              }))
            }))
          }))
        }))
      }))

      const patterns = await patternRecognitionEngine.analyzePatterns('empty-org', {
        lookbackDays: 30
      })

      expect(patterns).toHaveLength(0)

      // Single data point
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: [testData.userActivities[0]]
                }))
              }))
            }))
          }))
        }))
      }))

      const singlePointPatterns = await patternRecognitionEngine.analyzePatterns('single-org', {
        lookbackDays: 1
      })

      expect(Array.isArray(singlePointPatterns)).toBe(true)
    })
  })
})