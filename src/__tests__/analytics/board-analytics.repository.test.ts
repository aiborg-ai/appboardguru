/**
 * Board Analytics Repository Tests
 * 
 * Comprehensive test suite for the board analytics repository,
 * testing complex aggregations, queries, and data processing.
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals'
import { BoardAnalyticsRepository } from '../../lib/repositories/board-analytics.repository'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn()
} as unknown as SupabaseClient<any>

// Mock data
const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000'

const mockEngagementAggregations = [
  {
    user_id: '123e4567-e89b-12d3-a456-426614174001',
    full_name: 'John Smith',
    avatar_url: null,
    total_meetings: 12,
    attended_meetings: 10,
    attendance_rate: 83.33,
    speaking_time_minutes: 180,
    questions_asked: 24,
    contributions_made: 36,
    documents_accessed: 48,
    prep_time_minutes: 45,
    peer_interactions: 15
  },
  {
    user_id: '123e4567-e89b-12d3-a456-426614174002',
    full_name: 'Jane Doe',
    avatar_url: 'https://example.com/avatar.jpg',
    total_meetings: 12,
    attended_meetings: 12,
    attendance_rate: 100,
    speaking_time_minutes: 200,
    questions_asked: 30,
    contributions_made: 42,
    documents_accessed: 60,
    prep_time_minutes: 55,
    peer_interactions: 20
  }
]

const mockMeetingEffectivenessAggregations = [
  {
    meeting_id: '123e4567-e89b-12d3-a456-426614174003',
    meeting_date: '2024-02-15',
    meeting_type: 'board',
    duration_minutes: 120,
    total_decisions: 5,
    average_decision_time: 25.5,
    decisions_deferred: 1,
    action_items_created: 8,
    action_items_completed: 6,
    completion_rate: 75,
    average_satisfaction_score: 8.2,
    preparation_satisfaction: 7.8,
    discussion_satisfaction: 8.5,
    participation_data: [
      {
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        speaking_time_percentage: 15,
        questions_asked: 3,
        contributions_made: 4
      }
    ]
  }
]

const mockSkillsAggregations = [
  {
    skill_category: 'technical',
    skill_name: 'Digital Transformation',
    member_count: 3,
    average_level: 7.2,
    max_level: 9,
    min_level: 5,
    verified_count: 2,
    gap_severity: 'low',
    level_distribution: {
      level_1_3: 0,
      level_4_6: 1,
      level_7_8: 1,
      level_9_10: 1
    },
    last_skill_update: '2024-02-15T10:00:00Z',
    recent_updates: 1
  },
  {
    skill_category: 'governance',
    skill_name: 'Risk Management',
    member_count: 4,
    average_level: 8.5,
    max_level: 10,
    min_level: 7,
    verified_count: 4,
    gap_severity: 'low',
    level_distribution: {
      level_1_3: 0,
      level_4_6: 0,
      level_7_8: 2,
      level_9_10: 2
    },
    last_skill_update: '2024-02-10T14:30:00Z',
    recent_updates: 2
  }
]

const mockPerformanceTrends = [
  {
    period: '2024-01-01T00:00:00Z',
    metric_name: 'attendance_rate',
    metric_value: 85.5,
    trend_direction: 'up',
    change_percentage: 3.2,
    confidence_score: 0.85
  },
  {
    period: '2024-02-01T00:00:00Z',
    metric_name: 'attendance_rate',
    metric_value: 88.7,
    trend_direction: 'up',
    change_percentage: 3.7,
    confidence_score: 0.89
  }
]

const mockBenchmarkComparisons = [
  {
    metric_name: 'attendance_rate',
    organization_value: 88.7,
    industry_median: 82.3,
    industry_top_quartile: 91.2,
    peer_average: 85.1,
    percentile_rank: 72
  },
  {
    metric_name: 'decision_velocity',
    organization_value: 25.5,
    industry_median: 35.2,
    industry_top_quartile: 22.1,
    peer_average: 32.8,
    percentile_rank: 85
  }
]

describe('BoardAnalyticsRepository', () => {
  let repository: BoardAnalyticsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repository = new BoardAnalyticsRepository(mockSupabaseClient)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getMemberEngagementAggregations', () => {
    it('should retrieve member engagement aggregations successfully', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: mockEngagementAggregations,
        error: null
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const result = await repository.getMemberEngagementAggregations(mockOrganizationId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockEngagementAggregations)
      expect(mockRpc).toHaveBeenCalledWith('execute_analytics_query', {
        query_sql: expect.stringContaining('SELECT'),
        query_params: expect.arrayContaining([mockOrganizationId])
      })
    })

    it('should handle time period filtering', async () => {
      const timePeriod = {
        start_date: '2024-01-01',
        end_date: '2024-02-28',
        granularity: 'monthly' as const
      }

      const mockRpc = jest.fn().mockResolvedValue({
        data: mockEngagementAggregations,
        error: null
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const result = await repository.getMemberEngagementAggregations(
        mockOrganizationId,
        timePeriod
      )

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('execute_analytics_query', {
        query_sql: expect.stringContaining('m.meeting_date >= $3 AND m.meeting_date <= $4'),
        query_params: expect.arrayContaining([
          mockOrganizationId,
          null,
          timePeriod.start_date,
          timePeriod.end_date
        ])
      })
    })

    it('should handle member filters', async () => {
      const filters = {
        member_ids: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002']
      }

      const mockRpc = jest.fn().mockResolvedValue({
        data: mockEngagementAggregations,
        error: null
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const result = await repository.getMemberEngagementAggregations(
        mockOrganizationId,
        undefined,
        filters
      )

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('execute_analytics_query', {
        query_sql: expect.stringContaining('om.user_id = ANY($2)'),
        query_params: expect.arrayContaining([mockOrganizationId, filters.member_ids])
      })
    })

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed')
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: mockError
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const result = await repository.getMemberEngagementAggregations(mockOrganizationId)

      expect(result.success).toBe(false)
      expect(result.error).toBe(mockError)
    })
  })

  describe('getMeetingEffectivenessAggregations', () => {
    it('should retrieve meeting effectiveness aggregations successfully', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: mockMeetingEffectivenessAggregations,
        error: null
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const result = await repository.getMeetingEffectivenessAggregations(mockOrganizationId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMeetingEffectivenessAggregations)
    })

    it('should handle meeting type filters', async () => {
      const filters = {
        meeting_types: ['board', 'committee']
      }

      const mockRpc = jest.fn().mockResolvedValue({
        data: mockMeetingEffectivenessAggregations,
        error: null
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const result = await repository.getMeetingEffectivenessAggregations(
        mockOrganizationId,
        undefined,
        filters
      )

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('execute_analytics_query', {
        query_sql: expect.stringContaining('m.meeting_type = ANY($2)'),
        query_params: expect.arrayContaining([mockOrganizationId, filters.meeting_types])
      })
    })
  })

  describe('getSkillsAggregations', () => {
    it('should retrieve skills aggregations successfully', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: mockSkillsAggregations,
        error: null
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const result = await repository.getSkillsAggregations(mockOrganizationId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockSkillsAggregations)
    })

    it('should handle skill category filters', async () => {
      const filters = {
        skill_categories: ['technical', 'governance']
      }

      const mockRpc = jest.fn().mockResolvedValue({
        data: mockSkillsAggregations,
        error: null
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const result = await repository.getSkillsAggregations(mockOrganizationId, filters)

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('execute_analytics_query', {
        query_sql: expect.stringContaining('s.category = ANY($2)'),
        query_params: expect.arrayContaining([mockOrganizationId, filters.skill_categories])
      })
    })
  })

  describe('getPerformanceTrends', () => {
    it('should calculate performance trends successfully', async () => {
      const mockRpc = jest.fn()
        .mockResolvedValueOnce({
          data: [
            { period: '2024-01-01T00:00:00Z', metric_name: 'attendance_rate', metric_value: 85.5 },
            { period: '2024-02-01T00:00:00Z', metric_name: 'attendance_rate', metric_value: 88.7 }
          ],
          error: null
        })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const timePeriod = {
        start_date: '2024-01-01',
        end_date: '2024-02-28',
        granularity: 'monthly' as const
      }

      const result = await repository.getPerformanceTrends(
        mockOrganizationId,
        ['attendance_rate'],
        timePeriod
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0]).toHaveProperty('trend_direction')
      expect(result.data?.[0]).toHaveProperty('change_percentage')
      expect(result.data?.[0]).toHaveProperty('confidence_score')
    })

    it('should handle multiple metrics', async () => {
      const mockRpc = jest.fn()
        .mockResolvedValueOnce({
          data: [{ period: '2024-01-01T00:00:00Z', metric_name: 'attendance_rate', metric_value: 85.5 }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{ period: '2024-01-01T00:00:00Z', metric_name: 'satisfaction_score', metric_value: 8.2 }],
          error: null
        })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const timePeriod = {
        start_date: '2024-01-01',
        end_date: '2024-02-28',
        granularity: 'monthly' as const
      }

      const result = await repository.getPerformanceTrends(
        mockOrganizationId,
        ['attendance_rate', 'satisfaction_score'],
        timePeriod
      )

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledTimes(2)
    })

    it('should calculate trend direction correctly', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: [
          { period: '2024-01-01T00:00:00Z', metric_name: 'attendance_rate', metric_value: 85.5 },
          { period: '2024-02-01T00:00:00Z', metric_name: 'attendance_rate', metric_value: 88.7 },
          { period: '2024-03-01T00:00:00Z', metric_name: 'attendance_rate', metric_value: 82.1 }
        ],
        error: null
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const timePeriod = {
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        granularity: 'monthly' as const
      }

      const result = await repository.getPerformanceTrends(
        mockOrganizationId,
        ['attendance_rate'],
        timePeriod
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      
      // First point should be stable (no previous)
      expect(result.data?.[0]?.trend_direction).toBe('stable')
      
      // Second point should be up (88.7 > 85.5)
      expect(result.data?.[1]?.trend_direction).toBe('up')
      
      // Third point should be down (82.1 < 88.7)
      expect(result.data?.[2]?.trend_direction).toBe('down')
    })
  })

  describe('getBenchmarkComparisons', () => {
    it('should retrieve benchmark comparisons successfully', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            { metric_name: 'attendance_rate', median_value: 82.3, top_quartile_value: 91.2, peer_average: 85.1 }
          ],
          error: null
        })
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockFrom)

      // Mock getOrganizationMetric
      jest.spyOn(repository as any, 'getOrganizationMetric').mockResolvedValue({
        success: true,
        data: 88.7
      })

      // Mock calculatePercentileRank
      jest.spyOn(repository as any, 'calculatePercentileRank').mockResolvedValue({
        success: true,
        data: 72
      })

      const result = await repository.getBenchmarkComparisons(
        mockOrganizationId,
        'technology',
        ['attendance_rate']
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0]).toMatchObject({
        metric_name: 'attendance_rate',
        organization_value: 88.7,
        industry_median: 82.3,
        industry_top_quartile: 91.2,
        peer_average: 85.1,
        percentile_rank: 72
      })
    })

    it('should handle missing benchmark data', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [], // No benchmark data available
          error: null
        })
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockFrom)

      const result = await repository.getBenchmarkComparisons(
        mockOrganizationId,
        'technology',
        ['attendance_rate']
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('generatePredictiveMetrics', () => {
    it('should generate predictive metrics using historical data', async () => {
      // Mock getHistoricalMetricData
      jest.spyOn(repository as any, 'getHistoricalMetricData').mockResolvedValue({
        success: true,
        data: [
          { period: '2023-09', value: 80 },
          { period: '2023-10', value: 82 },
          { period: '2023-11', value: 85 },
          { period: '2023-12', value: 87 },
          { period: '2024-01', value: 88 }
        ]
      })

      const result = await repository.generatePredictiveMetrics(
        mockOrganizationId,
        ['attendance_rate'],
        3 // 3 periods forecast
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0]).toMatchObject({
        metric_name: 'attendance_rate',
        current_value: 88,
        predicted_value: expect.any(Number),
        confidence_interval_lower: expect.any(Number),
        confidence_interval_upper: expect.any(Number),
        key_factors: expect.arrayContaining(['historical_trend']),
        prediction_accuracy: expect.any(Number)
      })
    })

    it('should handle insufficient historical data', async () => {
      // Mock insufficient data
      jest.spyOn(repository as any, 'getHistoricalMetricData').mockResolvedValue({
        success: true,
        data: [
          { period: '2024-01', value: 88 }
        ] // Only one data point
      })

      const result = await repository.generatePredictiveMetrics(
        mockOrganizationId,
        ['attendance_rate']
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0) // Should skip metrics with insufficient data
    })
  })

  describe('saveAnalyticsSnapshot', () => {
    it('should save analytics snapshot successfully', async () => {
      const mockSnapshot = {
        snapshot_date: '2024-02-15T10:00:00Z',
        organization_id: mockOrganizationId,
        metric_type: 'member_engagement',
        metric_value: { test: 'data' },
        metadata: { source: 'test' }
      }

      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'snapshot-id-123' },
          error: null
        })
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockFrom)

      const result = await repository.saveAnalyticsSnapshot(mockSnapshot)

      expect(result.success).toBe(true)
      expect(result.data).toBe('snapshot-id-123')
      expect(mockFrom.insert).toHaveBeenCalledWith({
        snapshot_date: mockSnapshot.snapshot_date,
        organization_id: mockSnapshot.organization_id,
        metric_type: mockSnapshot.metric_type,
        metric_value: mockSnapshot.metric_value,
        metadata: mockSnapshot.metadata
      })
    })

    it('should handle duplicate snapshot errors', async () => {
      const mockSnapshot = {
        snapshot_date: '2024-02-15T10:00:00Z',
        organization_id: mockOrganizationId,
        metric_type: 'member_engagement',
        metric_value: { test: 'data' },
        metadata: { source: 'test' }
      }

      const mockError = { code: '23505', message: 'duplicate key value violates unique constraint' }
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockFrom)

      const result = await repository.saveAnalyticsSnapshot(mockSnapshot)

      expect(result.success).toBe(false)
      expect(result.error).toBe(mockError)
    })
  })

  describe('getAnalyticsSnapshots', () => {
    it('should retrieve analytics snapshots successfully', async () => {
      const mockSnapshots = [
        {
          id: 'snapshot-1',
          snapshot_date: '2024-02-15T10:00:00Z',
          organization_id: mockOrganizationId,
          metric_type: 'member_engagement',
          metric_value: { engagement: 85 },
          metadata: { source: 'dashboard' }
        },
        {
          id: 'snapshot-2',
          snapshot_date: '2024-02-14T10:00:00Z',
          organization_id: mockOrganizationId,
          metric_type: 'member_engagement',
          metric_value: { engagement: 82 },
          metadata: { source: 'scheduled' }
        }
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockSnapshots,
          error: null
        })
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await repository.getAnalyticsSnapshots(
        mockOrganizationId,
        'member_engagement',
        '2024-02-01',
        '2024-02-28'
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockSnapshots)
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', mockOrganizationId)
      expect(mockQuery.eq).toHaveBeenCalledWith('metric_type', 'member_engagement')
      expect(mockQuery.gte).toHaveBeenCalledWith('snapshot_date', '2024-02-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('snapshot_date', '2024-02-28')
    })
  })

  describe('executeComplexAggregation', () => {
    it('should execute complex custom queries', async () => {
      const customQuery = `
        SELECT 
          user_id,
          AVG(engagement_score) as avg_engagement,
          COUNT(*) as activity_count
        FROM user_activities 
        WHERE organization_id = $1 
        GROUP BY user_id
      `
      const params = [mockOrganizationId]

      const mockRpc = jest.fn().mockResolvedValue({
        data: [
          { user_id: 'user-1', avg_engagement: 8.5, activity_count: 12 },
          { user_id: 'user-2', avg_engagement: 7.2, activity_count: 9 }
        ],
        error: null
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const result = await repository.executeComplexAggregation(customQuery, params)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(mockRpc).toHaveBeenCalledWith('execute_analytics_query', {
        query_sql: customQuery,
        query_params: params
      })
    })
  })

  describe('batchInsertAnalyticsData', () => {
    it('should batch insert multiple records', async () => {
      const records = [
        { metric_name: 'attendance', metric_value: 85 },
        { metric_name: 'satisfaction', metric_value: 8.2 }
      ]

      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'record-1' }, { id: 'record-2' }],
          error: null
        })
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockFrom)

      const result = await repository.batchInsertAnalyticsData('performance_metrics', records)

      expect(result.success).toBe(true)
      expect(result.data).toBe(2)
      expect(mockFrom.insert).toHaveBeenCalledWith(records)
    })

    it('should handle empty record arrays', async () => {
      const result = await repository.batchInsertAnalyticsData('performance_metrics', [])

      expect(result.success).toBe(true)
      expect(result.data).toBe(0)
    })
  })

  describe('getRealtimeAnalytics', () => {
    it('should retrieve real-time analytics with caching', async () => {
      const cacheKey = `analytics_${mockOrganizationId}_realtime`
      
      // Mock cache miss first, then data generation
      jest.spyOn(repository as any, 'getCachedAnalytics')
        .mockResolvedValueOnce({ success: false }) // Cache miss
      
      jest.spyOn(repository, 'getMemberEngagementAggregations')
        .mockResolvedValue({ success: true, data: mockEngagementAggregations })
      
      jest.spyOn(repository, 'getMeetingEffectivenessAggregations')
        .mockResolvedValue({ success: true, data: mockMeetingEffectivenessAggregations })
      
      jest.spyOn(repository, 'getSkillsAggregations')
        .mockResolvedValue({ success: true, data: mockSkillsAggregations })
      
      jest.spyOn(repository as any, 'setCachedAnalytics')
        .mockResolvedValue({ success: true })

      const result = await repository.getRealtimeAnalytics(
        mockOrganizationId,
        ['engagement_summary', 'meeting_summary', 'skills_summary'],
        cacheKey
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('engagement_summary')
      expect(result.data).toHaveProperty('meeting_summary')
      expect(result.data).toHaveProperty('skills_summary')
    })

    it('should return cached data when available', async () => {
      const cacheKey = `analytics_${mockOrganizationId}_realtime`
      const cachedData = { engagement_summary: 'cached_data' }
      
      // Mock cache hit
      jest.spyOn(repository as any, 'getCachedAnalytics')
        .mockResolvedValue({ success: true, data: cachedData })

      const result = await repository.getRealtimeAnalytics(
        mockOrganizationId,
        ['engagement_summary'],
        cacheKey
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(cachedData)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle SQL injection attempts', async () => {
      const maliciousQuery = "'; DROP TABLE users; --"
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Query failed')
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const result = await repository.executeComplexAggregation(maliciousQuery, [])

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
    })

    it('should handle large result sets efficiently', async () => {
      const largeDataset = Array(10000).fill(null).map((_, index) => ({
        id: `item-${index}`,
        value: Math.random() * 100
      }))

      const mockRpc = jest.fn().mockResolvedValue({
        data: largeDataset,
        error: null
      })
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const startTime = Date.now()
      const result = await repository.getMemberEngagementAggregations(mockOrganizationId)
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(10000)
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000)
    })

    it('should handle network timeouts gracefully', async () => {
      const mockRpc = jest.fn().mockRejectedValue(new Error('Network timeout'))
      ;(mockSupabaseClient.rpc as jest.Mock) = mockRpc

      const result = await repository.getMemberEngagementAggregations(mockOrganizationId)

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toContain('Network timeout')
    })
  })
})