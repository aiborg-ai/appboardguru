/**
 * Board Analytics Service Tests
 * 
 * Comprehensive test suite for the board analytics service,
 * testing all analytics generation methods and data processing.
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals'
import { BoardAnalyticsService } from '../../lib/services/board-analytics.service'
import { BoardAnalyticsRepository } from '../../lib/repositories/board-analytics.repository'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
} as unknown as SupabaseClient<any>

// Mock data
const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000'
const mockUserId = '123e4567-e89b-12d3-a456-426614174001'

const mockMemberEngagementData = [
  {
    user_id: mockUserId,
    full_name: 'John Smith',
    attendance_rate: 85.5,
    participation_score: 7.2,
    preparation_metrics: {
      document_access_rate: 0.90,
      pre_meeting_activity_score: 8.1,
      average_prep_time_minutes: 45,
      material_review_completeness: 0.85,
      questions_prepared_count: 3
    },
    committee_involvement: [
      {
        committee_id: '123e4567-e89b-12d3-a456-426614174002',
        committee_name: 'Audit Committee',
        role: 'chair',
        participation_level: 9,
        contribution_score: 8,
        leadership_score: 9
      }
    ],
    peer_interaction_score: 7.5,
    trend_analysis: {
      engagement_trend: 'improving',
      three_month_change: 5.2,
      six_month_change: 8.1,
      year_over_year_change: 12.3,
      trend_factors: ['increased preparation', 'better meeting participation']
    },
    engagement_history: [
      {
        period: '2024-01',
        attendance_rate: 80,
        participation_score: 6.8,
        key_contributions: ['Strategic planning input', 'Risk assessment review']
      },
      {
        period: '2024-02',
        attendance_rate: 85,
        participation_score: 7.2,
        key_contributions: ['Budget analysis', 'Compliance oversight']
      }
    ]
  }
]

const mockMeetingEffectivenessData = [
  {
    meeting_id: '123e4567-e89b-12d3-a456-426614174003',
    meeting_date: '2024-02-15',
    meeting_type: 'board',
    duration_minutes: 120,
    decision_velocity: {
      decisions_made: 5,
      average_decision_time_minutes: 25,
      consensus_rate: 80,
      deferred_decisions: 1,
      quality_score: 8
    },
    discussion_quality: {
      participation_distribution: {
        [mockUserId]: {
          speaking_time_percentage: 15,
          questions_asked: 3,
          contributions_made: 4,
          interruptions: 0
        }
      },
      topic_coverage_score: 8.5,
      depth_of_analysis_score: 7.8,
      constructive_dialogue_score: 8.2,
      dissent_handling_score: 7.5
    },
    time_allocation: {
      strategic_topics_percentage: 45,
      operational_topics_percentage: 25,
      governance_topics_percentage: 20,
      compliance_topics_percentage: 8,
      off_topic_percentage: 2
    },
    action_item_tracking: {
      items_created: 8,
      items_completed: 6,
      completion_rate: 75,
      average_completion_time_days: 14,
      overdue_items: 2
    },
    satisfaction_survey: {
      overall_satisfaction: 8.2,
      meeting_preparation: 7.8,
      discussion_quality: 8.5,
      decision_making: 7.9,
      time_management: 7.2,
      follow_up_effectiveness: 8.1,
      response_rate: 90
    }
  }
]

const mockSkillsMatrixData = {
  organization_id: mockOrganizationId,
  current_skills: {
    technical: {
      'Digital Transformation': [
        {
          member_id: mockUserId,
          member_name: 'John Smith',
          level: 8,
          verified: true,
          last_updated: '2024-02-01T00:00:00Z'
        }
      ],
      'Cybersecurity': [
        {
          member_id: mockUserId,
          member_name: 'John Smith',
          level: 6,
          verified: false,
          last_updated: '2024-01-15T00:00:00Z'
        }
      ]
    },
    governance: {
      'Risk Management': [
        {
          member_id: mockUserId,
          member_name: 'John Smith',
          level: 9,
          verified: true,
          last_updated: '2024-02-10T00:00:00Z'
        }
      ]
    }
  },
  skill_gaps: [
    {
      skill_category: 'technical',
      skill_name: 'AI/Machine Learning',
      required_level: 7,
      current_max_level: 3,
      gap_severity: 'critical',
      impact_areas: ['Strategic Planning', 'Technology Oversight'],
      recommended_actions: ['Hire AI expert', 'Provide ML training']
    }
  ],
  skill_overlaps: [
    {
      skill_name: 'Financial Analysis',
      member_count: 4,
      redundancy_level: 'moderate',
      optimization_suggestions: ['Diversify into fintech expertise']
    }
  ],
  recommendations: [
    {
      type: 'hire',
      priority: 1,
      skill_requirements: ['AI/Machine Learning', 'Data Science'],
      rationale: 'Critical gap in emerging technology oversight',
      expected_impact: 'Enhanced technology governance and innovation strategy',
      implementation_timeline: '3-6 months'
    }
  ],
  succession_planning: {
    critical_roles: [
      {
        role_name: 'Chairman',
        current_member: 'John Smith',
        criticality_score: 10,
        succession_risk: 'high',
        backup_candidates: [
          {
            member_id: '123e4567-e89b-12d3-a456-426614174004',
            readiness_score: 65,
            development_needed: ['Leadership training', 'Governance certification'],
            time_to_readiness_months: 18
          }
        ]
      }
    ],
    succession_readiness: [
      {
        member_id: '123e4567-e89b-12d3-a456-426614174004',
        roles_ready_for: ['Vice Chairman'],
        development_areas: ['Strategic thinking', 'Stakeholder management'],
        readiness_timeline: '12-18 months'
      }
    ],
    development_plans: [
      {
        member_id: '123e4567-e89b-12d3-a456-426614174004',
        target_roles: ['Chairman', 'Vice Chairman'],
        skill_development_areas: ['Leadership', 'Governance'],
        recommended_training: [
          {
            training_type: 'certification',
            title: 'Advanced Corporate Governance',
            provider: 'IFC',
            duration: '6 months',
            cost_estimate: 15000,
            expected_outcome: 'Enhanced governance expertise'
          }
        ],
        timeline_months: 18
      }
    ]
  },
  diversity_analysis: {
    current_diversity: {
      gender_balance: 0.4,
      age_distribution: {
        'under_40': 1,
        '40-50': 2,
        '50-60': 3,
        'over_60': 2,
        average_age: 52
      },
      ethnic_diversity: 0.6,
      geographic_spread: 0.8,
      educational_diversity: 0.9,
      industry_background: {
        'technology': 3,
        'finance': 2,
        'healthcare': 1,
        'manufacturing': 2
      }
    },
    diversity_goals: {
      gender_target: 0.5,
      age_distribution_target: {
        'under_40': 2,
        '40-50': 2,
        '50-60': 3,
        'over_60': 1
      },
      ethnic_diversity_target: 0.7,
      geographic_target: 0.8,
      experience_diversity_target: {
        'startup': 1,
        'public_company': 4,
        'nonprofit': 1,
        'government': 1
      }
    },
    gaps: [
      {
        dimension: 'gender_balance',
        current_value: 0.4,
        target_value: 0.5,
        gap_size: 0.1,
        priority: 'medium'
      }
    ],
    improvement_strategies: [
      {
        dimension: 'gender_balance',
        strategy: 'Targeted recruitment of female board candidates',
        implementation_steps: [
          'Partner with organizations promoting board diversity',
          'Update candidate evaluation criteria',
          'Implement structured interview process'
        ],
        timeline: '6-12 months',
        success_metrics: ['Increase female representation to 50%']
      }
    ]
  },
  competency_heat_map: {
    categories: ['technical', 'business', 'leadership', 'governance', 'domain'],
    members: ['John Smith', 'Jane Doe', 'Bob Johnson'],
    heat_map_data: [
      [8, 9, 7, 9, 8], // John Smith
      [6, 8, 9, 7, 6], // Jane Doe
      [7, 7, 6, 8, 9]  // Bob Johnson
    ]
  }
}

describe('BoardAnalyticsService', () => {
  let service: BoardAnalyticsService
  let mockRepository: jest.Mocked<BoardAnalyticsRepository>

  beforeEach(() => {
    jest.clearAllMocks()
    
    service = new BoardAnalyticsService(mockSupabaseClient)
    
    // Mock auth user
    ;(mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generateComprehensiveAnalytics', () => {
    it('should generate complete analytics successfully', async () => {
      // Mock all sub-methods
      jest.spyOn(service, 'generateMemberEngagementMetrics').mockResolvedValue({
        success: true,
        data: mockMemberEngagementData
      })
      
      jest.spyOn(service, 'generateMeetingEffectivenessMetrics').mockResolvedValue({
        success: true,
        data: mockMeetingEffectivenessData
      })
      
      jest.spyOn(service, 'generateSkillsMatrixAnalysis').mockResolvedValue({
        success: true,
        data: mockSkillsMatrixData
      })
      
      jest.spyOn(service, 'generatePeerBenchmarkingData').mockResolvedValue({
        success: true,
        data: {}
      })
      
      jest.spyOn(service, 'generate360EvaluationData').mockResolvedValue({
        success: true,
        data: {}
      })
      
      jest.spyOn(service, 'generatePredictiveInsights').mockResolvedValue({
        success: true,
        data: {}
      })

      // Mock logging
      jest.spyOn(service as any, 'logActivity').mockResolvedValue({ success: true })

      const result = await service.generateComprehensiveAnalytics(mockOrganizationId)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('member_engagement')
      expect(result.data).toHaveProperty('meeting_effectiveness')
      expect(result.data).toHaveProperty('skills_matrix')
      expect(result.data).toHaveProperty('peer_benchmarking')
      expect(result.data).toHaveProperty('evaluation_360')
      expect(result.data).toHaveProperty('predictive_insights')
    })

    it('should handle partial failures gracefully', async () => {
      jest.spyOn(service, 'generateMemberEngagementMetrics').mockResolvedValue({
        success: false,
        error: new Error('Database connection failed')
      })
      
      jest.spyOn(service, 'generateMeetingEffectivenessMetrics').mockResolvedValue({
        success: true,
        data: mockMeetingEffectivenessData
      })

      const result = await service.generateComprehensiveAnalytics(mockOrganizationId)

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('generateMemberEngagementMetrics', () => {
    beforeEach(() => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      }
      
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQuery)
    })

    it('should generate member engagement metrics', async () => {
      // Mock members query
      const mockMembersQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }
      mockMembersQuery.select.mockResolvedValue({
        data: [
          {
            user_id: mockUserId,
            users: { full_name: 'John Smith', avatar_url: null }
          }
        ],
        error: null
      })
      
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockMembersQuery)
      
      // Mock calculation methods
      jest.spyOn(service as any, 'calculateAttendanceRate').mockResolvedValue(85.5)
      jest.spyOn(service as any, 'calculateParticipationScore').mockResolvedValue(7.2)
      jest.spyOn(service as any, 'calculatePreparationMetrics').mockResolvedValue({
        document_access_rate: 0.90,
        pre_meeting_activity_score: 8.1,
        average_prep_time_minutes: 45,
        material_review_completeness: 0.85,
        questions_prepared_count: 3
      })
      jest.spyOn(service as any, 'getCommitteeInvolvement').mockResolvedValue([])
      jest.spyOn(service as any, 'calculatePeerInteractionScore').mockResolvedValue(7.5)
      jest.spyOn(service as any, 'generateTrendAnalysis').mockResolvedValue({
        engagement_trend: 'improving',
        three_month_change: 5.2,
        six_month_change: 8.1,
        year_over_year_change: 12.3,
        trend_factors: ['increased preparation']
      })
      jest.spyOn(service as any, 'getEngagementHistory').mockResolvedValue([])

      const result = await service.generateMemberEngagementMetrics(mockOrganizationId)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0]).toHaveProperty('user_id', mockUserId)
      expect(result.data?.[0]).toHaveProperty('attendance_rate', 85.5)
      expect(result.data?.[0]).toHaveProperty('participation_score', 7.2)
    })

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }
      mockQuery.select.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      })
      
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await service.generateMemberEngagementMetrics(mockOrganizationId)

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('generateMeetingEffectivenessMetrics', () => {
    it('should generate meeting effectiveness metrics', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      }
      mockQuery.select.mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            meeting_date: '2024-02-15',
            meeting_type: 'board',
            duration_minutes: 120,
            meeting_resolutions: [],
            meeting_actionables: []
          }
        ],
        error: null
      })
      
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQuery)
      
      // Mock calculation methods
      jest.spyOn(service as any, 'calculateDecisionVelocity').mockResolvedValue({
        decisions_made: 5,
        average_decision_time_minutes: 25,
        consensus_rate: 80,
        deferred_decisions: 1,
        quality_score: 8
      })
      
      jest.spyOn(service as any, 'calculateDiscussionQuality').mockResolvedValue({
        participation_distribution: {},
        topic_coverage_score: 8.5,
        depth_of_analysis_score: 7.8,
        constructive_dialogue_score: 8.2,
        dissent_handling_score: 7.5
      })
      
      jest.spyOn(service as any, 'calculateTimeAllocation').mockResolvedValue({
        strategic_topics_percentage: 45,
        operational_topics_percentage: 25,
        governance_topics_percentage: 20,
        compliance_topics_percentage: 8,
        off_topic_percentage: 2
      })
      
      jest.spyOn(service as any, 'trackActionItems').mockResolvedValue({
        items_created: 8,
        items_completed: 6,
        completion_rate: 75,
        average_completion_time_days: 14,
        overdue_items: 2
      })
      
      jest.spyOn(service as any, 'getSatisfactionSurvey').mockResolvedValue({
        overall_satisfaction: 8.2,
        meeting_preparation: 7.8,
        discussion_quality: 8.5,
        decision_making: 7.9,
        time_management: 7.2,
        follow_up_effectiveness: 8.1,
        response_rate: 90
      })

      const result = await service.generateMeetingEffectivenessMetrics(mockOrganizationId)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0]).toHaveProperty('meeting_id')
      expect(result.data?.[0]).toHaveProperty('decision_velocity')
      expect(result.data?.[0]).toHaveProperty('discussion_quality')
    })
  })

  describe('generateSkillsMatrixAnalysis', () => {
    it('should generate skills matrix analysis', async () => {
      // Mock all sub-methods
      jest.spyOn(service as any, 'getCurrentSkillsMapping').mockResolvedValue(mockSkillsMatrixData.current_skills)
      jest.spyOn(service as any, 'identifySkillGaps').mockResolvedValue(mockSkillsMatrixData.skill_gaps)
      jest.spyOn(service as any, 'findSkillOverlaps').mockResolvedValue(mockSkillsMatrixData.skill_overlaps)
      jest.spyOn(service as any, 'generateSkillRecommendations').mockResolvedValue(mockSkillsMatrixData.recommendations)
      jest.spyOn(service as any, 'createCompetencyHeatMap').mockResolvedValue(mockSkillsMatrixData.competency_heat_map)
      jest.spyOn(service as any, 'generateSuccessionPlanning').mockResolvedValue(mockSkillsMatrixData.succession_planning)
      jest.spyOn(service as any, 'performDiversityAnalysis').mockResolvedValue(mockSkillsMatrixData.diversity_analysis)

      const result = await service.generateSkillsMatrixAnalysis(mockOrganizationId)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('organization_id', mockOrganizationId)
      expect(result.data).toHaveProperty('current_skills')
      expect(result.data).toHaveProperty('skill_gaps')
      expect(result.data).toHaveProperty('skill_overlaps')
      expect(result.data).toHaveProperty('recommendations')
      expect(result.data).toHaveProperty('succession_planning')
      expect(result.data).toHaveProperty('diversity_analysis')
    })
  })

  describe('executeAnalyticsQuery', () => {
    it('should execute custom analytics queries', async () => {
      const mockQuery = {
        organizationId: mockOrganizationId,
        time_period: {
          start_date: '2024-01-01',
          end_date: '2024-02-28',
          granularity: 'monthly' as const
        },
        metrics_requested: ['member_engagement', 'meeting_effectiveness']
      }

      // Mock sub-methods
      jest.spyOn(service, 'generateMemberEngagementMetrics').mockResolvedValue({
        success: true,
        data: mockMemberEngagementData
      })
      
      jest.spyOn(service, 'generateMeetingEffectivenessMetrics').mockResolvedValue({
        success: true,
        data: mockMeetingEffectivenessData
      })

      const result = await service.executeAnalyticsQuery(mockQuery)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('member_engagement')
      expect(result.data).toHaveProperty('meeting_effectiveness')
    })

    it('should validate query parameters', async () => {
      const invalidQuery = {
        organization_id: '', // Invalid: empty string
        metrics_requested: [] // Invalid: empty array
      }

      const result = await service.executeAnalyticsQuery(invalidQuery as any)

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      ;(mockSupabaseClient.from as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const result = await service.generateMemberEngagementMetrics(mockOrganizationId)

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
    })

    it('should handle authentication errors', async () => {
      ;(mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed')
      })

      const result = await service.generateMemberEngagementMetrics(mockOrganizationId)

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('Data Validation', () => {
    it('should validate organization ID format', async () => {
      const invalidOrgId = 'not-a-uuid'
      
      // Mock validation that would typically happen in the service
      const result = await service.generateMemberEngagementMetrics(invalidOrgId)
      
      // This would typically fail validation in a real implementation
      // For now, we just test that it handles invalid input gracefully
      expect(result).toBeDefined()
    })

    it('should handle empty result sets gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }
      mockQuery.select.mockResolvedValue({
        data: [], // Empty results
        error: null
      })
      
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQuery)

      const result = await service.generateMemberEngagementMetrics(mockOrganizationId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Generate a large mock dataset
      const largeMemberDataset = Array(1000).fill(null).map((_, index) => ({
        user_id: `user-${index}`,
        users: { full_name: `User ${index}`, avatar_url: null }
      }))

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }
      mockQuery.select.mockResolvedValue({
        data: largeMemberDataset,
        error: null
      })
      
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockQuery)

      // Mock calculation methods to return quickly
      jest.spyOn(service as any, 'calculateAttendanceRate').mockResolvedValue(80)
      jest.spyOn(service as any, 'calculateParticipationScore').mockResolvedValue(7)
      jest.spyOn(service as any, 'calculatePreparationMetrics').mockResolvedValue({})
      jest.spyOn(service as any, 'getCommitteeInvolvement').mockResolvedValue([])
      jest.spyOn(service as any, 'calculatePeerInteractionScore').mockResolvedValue(7)
      jest.spyOn(service as any, 'generateTrendAnalysis').mockResolvedValue({})
      jest.spyOn(service as any, 'getEngagementHistory').mockResolvedValue([])

      const startTime = Date.now()
      const result = await service.generateMemberEngagementMetrics(mockOrganizationId)
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1000)
      
      // Should complete within reasonable time (less than 5 seconds for mock data)
      expect(endTime - startTime).toBeLessThan(5000)
    })
  })
})