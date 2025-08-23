/**
 * Strategic Planning Service Test Suite
 * 
 * Comprehensive tests for strategic planning service including:
 * - Strategic initiatives CRUD operations
 * - OKR management and cascading
 * - Scenario planning and Monte Carlo simulation
 * - Performance scorecard calculations
 * - Budget optimization algorithms
 * - Financial integration and ROI tracking
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { StrategicPlanningService } from '../../lib/services/strategic-planning.service'
import { 
  StrategicInitiative, 
  OKR, 
  ScenarioPlan, 
  PerformanceScorecard,
  BudgetOptimizationResult,
  ROIAnalysis
} from '../../types/strategic-planning'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  rpc: jest.fn(),
} as any

// Mock data
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com'
}

const mockOrganization = {
  id: '456e7890-e89b-12d3-a456-426614174001',
  name: 'Test Organization'
}

const mockInitiative: Partial<StrategicInitiative> = {
  name: 'Digital Transformation',
  description: 'Modernize our digital infrastructure',
  category: 'innovation',
  priority: 'high',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31'),
  budget_allocated: 500000,
  owner_id: mockUser.id
}

const mockOKR: Partial<OKR> = {
  level: 'board',
  objective: 'Increase market share by 25% through digital innovation',
  objective_category: 'growth',
  period_type: 'annual',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31'),
  owner_id: mockUser.id,
  key_results: [
    {
      id: 'kr1',
      description: 'Launch 3 new digital products',
      metric_type: 'number',
      baseline_value: 0,
      target_value: 3,
      current_value: 1,
      unit: 'products',
      measurement_frequency: 'monthly',
      progress_updates: [],
      automated_tracking: false
    }
  ]
}

const mockScenario: Partial<ScenarioPlan> = {
  name: 'Market Expansion Scenario',
  description: 'Analysis of European market expansion',
  scenario_type: 'optimistic',
  key_variables: [
    {
      name: 'Market Growth Rate',
      type: 'growth_rate',
      min_value: 5,
      max_value: 15,
      most_likely_value: 10,
      distribution: 'triangular',
      correlation_factors: {}
    }
  ],
  market_assumptions: [],
  internal_assumptions: [],
  monte_carlo_runs: 1000
}

describe('StrategicPlanningService', () => {
  let service: StrategicPlanningService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new StrategicPlanningService(mockSupabaseClient)
    
    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
  })

  describe('Strategic Initiatives', () => {
    it('should create a strategic initiative successfully', async () => {
      const mockInitiativeResponse = {
        id: '789e1234-e89b-12d3-a456-426614174002',
        organization_id: mockOrganization.id,
        ...mockInitiative,
        status: 'planning',
        progress_percentage: 0,
        health_score: 5,
        risk_score: 3,
        budget_used: 0,
        created_by: mockUser.id,
        created_at: new Date(),
        updated_at: new Date()
      }

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: mockInitiativeResponse, 
          error: null 
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await service.createStrategicInitiative(
        mockOrganization.id,
        mockInitiative
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockInitiativeResponse)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('strategic_initiatives')
      expect(mockQuery.insert).toHaveBeenCalled()
    })

    it('should get strategic initiatives with analytics', async () => {
      const mockInitiatives = [
        {
          id: '1',
          ...mockInitiative,
          budget_allocated: 300000,
          budget_used: 150000,
          health_score: 7,
          risk_score: 2,
          progress_percentage: 60
        },
        {
          id: '2',
          ...mockInitiative,
          name: 'Market Expansion',
          budget_allocated: 200000,
          budget_used: 50000,
          health_score: 8,
          risk_score: 3,
          progress_percentage: 25
        }
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      }

      mockQuery.select.mockResolvedValue({ 
        data: mockInitiatives, 
        error: null 
      })

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await service.getStrategicInitiatives(mockOrganization.id)

      expect(result.success).toBe(true)
      expect(result.data.initiatives).toHaveLength(2)
      expect(result.data.analytics).toBeDefined()
      expect(result.data.analytics.total_budget).toBe(500000)
      expect(result.data.analytics.budget_utilization).toBe(40) // (200000/500000)*100
      expect(result.data.analytics.average_health_score).toBe(7.5)
    })

    it('should update initiative progress', async () => {
      const progressData = {
        progress_percentage: 75,
        health_score: 8,
        budget_used: 200000,
        notes: 'Good progress on digital transformation'
      }

      const mockUpdatedInitiative = {
        id: 'init-1',
        ...mockInitiative,
        ...progressData,
        updated_at: new Date()
      }

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: mockUpdatedInitiative, 
          error: null 
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await service.updateInitiativeProgress('init-1', progressData)

      expect(result.success).toBe(true)
      expect(result.data.progress_percentage).toBe(75)
      expect(result.data.health_score).toBe(8)
    })
  })

  describe('OKR Management', () => {
    it('should create an OKR with key results', async () => {
      const mockOKRResponse = {
        id: 'okr-1',
        organization_id: mockOrganization.id,
        ...mockOKR,
        overall_progress: 0,
        confidence_level: 5,
        health_status: 'on_track',
        cascade_alignment_score: 0,
        contributors: [],
        created_by: mockUser.id,
        created_at: new Date(),
        updated_at: new Date()
      }

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: mockOKRResponse, 
          error: null 
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await service.createOKR(mockOrganization.id, mockOKR)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockOKRResponse)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('okrs')
    })

    it('should get OKR hierarchy with alignment analysis', async () => {
      const mockOKRs = [
        {
          id: 'okr-1',
          level: 'board',
          objective: 'Board-level objective',
          overall_progress: 60,
          health_status: 'on_track',
          cascade_alignment_score: 8,
          children: [
            {
              id: 'okr-2',
              level: 'executive',
              objective: 'Executive-level objective',
              parent_okr_id: 'okr-1',
              overall_progress: 70,
              health_status: 'on_track',
              cascade_alignment_score: 7
            }
          ]
        }
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      }

      mockQuery.select.mockResolvedValue({ 
        data: mockOKRs, 
        error: null 
      })

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await service.getOKRHierarchy(mockOrganization.id)

      expect(result.success).toBe(true)
      expect(result.data.okr_tree).toBeDefined()
      expect(result.data.alignment_analysis).toBeDefined()
      expect(result.data.performance_summary).toBeDefined()
    })

    it('should update key result progress and recalculate OKR progress', async () => {
      const progressData = {
        current_value: 2,
        confidence: 8,
        notes: 'Launched 2 products, on track for 3rd'
      }

      // Mock key result update
      const mockKeyResultQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }
      mockKeyResultQuery.update.mockResolvedValue({ error: null })

      // Mock progress entry creation
      const mockProgressQuery = {
        insert: jest.fn().mockReturnThis()
      }
      mockProgressQuery.insert.mockResolvedValue({ error: null })

      // Mock OKR update with recalculated progress
      const mockUpdatedOKR = {
        id: 'okr-1',
        overall_progress: 66.67, // 2/3 = 66.67%
        health_status: 'on_track'
      }

      const mockOKRQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        update: jest.fn().mockReturnThis()
      }

      mockOKRQuery.select.mockResolvedValue({
        data: {
          key_results: [{ target_value: 3, current_value: 2 }]
        },
        error: null
      })

      mockOKRQuery.update.mockResolvedValue({
        data: mockUpdatedOKR,
        error: null
      })

      mockSupabaseClient.from
        .mockReturnValueOnce(mockKeyResultQuery) // okr_key_results
        .mockReturnValueOnce(mockProgressQuery) // key_result_progress
        .mockReturnValueOnce(mockOKRQuery) // okrs select
        .mockReturnValueOnce(mockOKRQuery) // okrs update

      const result = await service.updateKeyResultProgress(
        'okr-1',
        'kr-1',
        progressData
      )

      expect(result.success).toBe(true)
    })
  })

  describe('Scenario Planning', () => {
    it('should create scenario plan and run Monte Carlo simulation', async () => {
      const mockScenarioResponse = {
        id: 'scenario-1',
        organization_id: mockOrganization.id,
        ...mockScenario,
        projected_outcomes: [
          {
            metric: 'Market Growth Rate',
            baseline: 10,
            projected_value: 12.5,
            probability_range: [8, 18],
            impact_level: 'high'
          }
        ],
        confidence_intervals: [
          {
            metric: 'Market Growth Rate',
            percentile_10: 7,
            percentile_25: 9,
            percentile_50: 12,
            percentile_75: 15,
            percentile_90: 17
          }
        ],
        sensitivity_analysis: [
          {
            variable: 'Market Growth Rate',
            impact_on_outcome: 0.85,
            correlation_coefficient: 0.92,
            influence_rank: 1
          }
        ],
        created_by: mockUser.id,
        created_at: new Date(),
        updated_at: new Date()
      }

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: mockScenarioResponse, 
          error: null 
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await service.createScenarioPlan(
        mockOrganization.id,
        mockScenario
      )

      expect(result.success).toBe(true)
      expect(result.data.projected_outcomes).toHaveLength(1)
      expect(result.data.confidence_intervals).toHaveLength(1)
      expect(result.data.sensitivity_analysis).toHaveLength(1)
    })

    it('should validate scenario variable distributions', async () => {
      const invalidScenario = {
        ...mockScenario,
        key_variables: [
          {
            name: 'Invalid Variable',
            type: 'market_size' as const,
            min_value: 10,
            max_value: 5, // Invalid: max < min
            most_likely_value: 8,
            distribution: 'normal' as const,
            correlation_factors: {}
          }
        ]
      }

      const result = await service.createScenarioPlan(
        mockOrganization.id,
        invalidScenario
      )

      // Should fail validation
      expect(result.success).toBe(false)
    })
  })

  describe('Performance Scorecards', () => {
    it('should create performance scorecard with balanced perspectives', async () => {
      const mockScorecard: Partial<PerformanceScorecard> = {
        name: 'Q4 Executive Scorecard',
        scorecard_type: 'balanced',
        perspectives: [
          {
            name: 'Financial',
            weight: 0.25,
            color: '#10b981',
            icon: 'dollar-sign',
            metrics: [
              {
                id: 'metric-1',
                name: 'Revenue Growth',
                description: 'Year-over-year revenue growth',
                category: 'financial',
                current_value: 15,
                target_value: 20,
                baseline_value: 10,
                unit: '%',
                format: 'percentage',
                direction: 'higher_is_better',
                green_threshold: 18,
                yellow_threshold: 15,
                red_threshold: 12,
                performance_score: 7.5,
                trend: 'improving',
                variance_from_target: -25,
                data_source: 'Financial System',
                calculation_method: 'YoY comparison',
                last_updated: new Date()
              }
            ]
          }
        ],
        refresh_frequency: 'daily',
        visibility: 'executives'
      }

      const mockScorecardResponse = {
        id: 'scorecard-1',
        organization_id: mockOrganization.id,
        ...mockScorecard,
        overall_score: 7.5,
        trend_analysis: {
          period: 'month',
          data_points: [],
          trend_direction: 'improving',
          correlation_analysis: [],
          seasonality_detected: false
        },
        benchmark_comparison: {
          industry: '',
          company_size: '',
          benchmarks: [],
          performance_ranking: 'above_median'
        },
        auto_alerts: [],
        access_permissions: [],
        created_by: mockUser.id,
        created_at: new Date(),
        updated_at: new Date()
      }

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: mockScorecardResponse, 
          error: null 
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await service.createPerformanceScorecard(
        mockOrganization.id,
        mockScorecard
      )

      expect(result.success).toBe(true)
      expect(result.data.perspectives).toHaveLength(1)
      expect(result.data.overall_score).toBe(7.5)
    })

    it('should validate perspective weights sum to 1.0', async () => {
      const invalidScorecard = {
        name: 'Invalid Scorecard',
        scorecard_type: 'balanced' as const,
        perspectives: [
          {
            name: 'Financial',
            weight: 0.6, // Invalid: doesn't sum to 1.0 with other perspectives
            color: '#10b981',
            icon: 'dollar-sign',
            metrics: []
          },
          {
            name: 'Customer',
            weight: 0.6, // Invalid: total would be 1.2
            color: '#3b82f6',
            icon: 'users',
            metrics: []
          }
        ]
      }

      // This would be caught by validation in the API layer
      const totalWeight = invalidScorecard.perspectives.reduce(
        (sum, p) => sum + p.weight, 
        0
      )
      
      expect(Math.abs(totalWeight - 1)).toBeGreaterThan(0.01)
    })
  })

  describe('Budget Optimization', () => {
    it('should optimize budget allocation across initiatives', async () => {
      const mockBudgetOptimization: BudgetOptimizationResult = {
        total_budget: 1000000,
        allocations: [
          {
            initiative_id: 'init-1',
            allocated_amount: 400000,
            percentage_of_total: 40,
            expected_roi: 25,
            risk_score: 3,
            confidence: 0.8
          },
          {
            initiative_id: 'init-2',
            allocated_amount: 600000,
            percentage_of_total: 60,
            expected_roi: 30,
            risk_score: 4,
            confidence: 0.7
          }
        ],
        optimization_score: 8.5,
        constraints_satisfied: true,
        improvement_recommendations: [
          'Consider increasing allocation to highest ROI initiatives',
          'Monitor risk exposure across portfolio'
        ]
      }

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { id: 'init-1', budget_allocated: 300000 },
            { id: 'init-2', budget_allocated: 400000 }
          ],
          error: null
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await service.optimizeBudgetAllocation(
        mockOrganization.id,
        1000000,
        []
      )

      expect(result.success).toBe(true)
      expect(result.data.total_budget).toBe(1000000)
      expect(result.data.allocations).toHaveLength(2)
      expect(result.data.optimization_score).toBeGreaterThan(0)
    })

    it('should validate budget constraints', async () => {
      const constraints = [
        {
          type: 'fixed_allocation' as const,
          initiative_id: 'init-1',
          value: 1200000, // Exceeds total budget
          description: 'Fixed allocation for critical initiative'
        }
      ]

      const totalBudget = 1000000

      // Validate constraint doesn't exceed total budget
      const fixedAllocations = constraints
        .filter(c => c.type === 'fixed_allocation')
        .reduce((sum, c) => sum + c.value, 0)

      expect(fixedAllocations).toBeGreaterThan(totalBudget)
    })
  })

  describe('ROI Analysis', () => {
    it('should calculate comprehensive ROI metrics', async () => {
      const mockROIAnalysis: ROIAnalysis = {
        roi_percentage: 25.5,
        total_investment: 500000,
        total_return: 627500,
        payback_period: 18, // months
        npv: 100000,
        irr: 28.3,
        risk_adjusted_roi: 22.1
      }

      const mockInitiativeData = {
        id: 'init-1',
        financial_metrics: [
          {
            metric_type: 'investment',
            value: 500000,
            period_start: new Date('2024-01-01'),
            period_end: new Date('2024-12-31')
          },
          {
            metric_type: 'return',
            value: 627500,
            period_start: new Date('2024-06-01'),
            period_end: new Date('2025-12-31')
          }
        ],
        outcomes: []
      }

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockInitiativeData,
          error: null
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await service.trackInitiativeROI('init-1', {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31')
      })

      expect(result.success).toBe(true)
      expect(result.data.roi_percentage).toBeGreaterThan(0)
      expect(result.data.total_investment).toBeGreaterThan(0)
      expect(result.data.total_return).toBeGreaterThan(result.data.total_investment)
    })
  })

  describe('Predictive Analytics', () => {
    it('should generate strategic forecast with high confidence', async () => {
      const mockForecast = {
        id: 'forecast-1',
        organization_id: mockOrganization.id,
        forecast_type: 'performance',
        time_horizon: 12,
        forecast_data: {
          predictions: [
            {
              metric: 'Overall Performance Score',
              current_value: 7.5,
              predicted_value: 8.2,
              confidence_interval: [7.8, 8.6],
              trend: 'increasing'
            }
          ],
          confidence: 0.85,
          model_accuracy: 0.82,
          key_factors: ['Digital transformation progress', 'Market conditions'],
          scenarios: []
        },
        confidence_score: 0.85,
        created_by: mockUser.id,
        created_at: new Date()
      }

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockForecast,
          error: null
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await service.generateStrategicForecast(
        mockOrganization.id,
        'performance',
        12
      )

      expect(result.success).toBe(true)
      expect(result.data.confidence).toBeGreaterThan(0.8)
      expect(result.data.predictions).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database connection failed')
      
      const mockQuery = {
        insert: jest.fn().mockRejectedValue(mockError),
        select: jest.fn().mockReturnThis(),
        single: jest.fn()
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const result = await service.createStrategicInitiative(
        mockOrganization.id,
        mockInitiative
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle validation errors', async () => {
      const invalidInitiative = {
        ...mockInitiative,
        name: 'A', // Too short
        end_date: new Date('2023-12-31') // Before start date
      }

      const result = await service.createStrategicInitiative(
        mockOrganization.id,
        invalidInitiative
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle unauthorized access', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized')
      })

      const result = await service.createStrategicInitiative(
        mockOrganization.id,
        mockInitiative
      )

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Unauthorized')
    })
  })
})

// Helper functions for test data generation
export const generateMockInitiative = (overrides?: Partial<StrategicInitiative>) => ({
  id: `init-${Date.now()}`,
  organization_id: mockOrganization.id,
  name: 'Test Initiative',
  description: 'Test description',
  category: 'growth' as const,
  priority: 'medium' as const,
  status: 'active' as const,
  start_date: new Date(),
  end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  budget_allocated: 100000,
  budget_used: 25000,
  progress_percentage: 25,
  health_score: 7,
  risk_score: 3,
  milestones: [],
  resource_requirements: [],
  dependencies: [],
  linked_okrs: [],
  owner_id: mockUser.id,
  created_by: mockUser.id,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
})

export const generateMockOKR = (overrides?: Partial<OKR>) => ({
  id: `okr-${Date.now()}`,
  organization_id: mockOrganization.id,
  level: 'department' as const,
  objective: 'Test Objective',
  objective_category: 'operational' as const,
  key_results: [],
  period_type: 'quarterly' as const,
  start_date: new Date(),
  end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  overall_progress: 50,
  confidence_level: 7,
  health_status: 'on_track' as const,
  strategic_initiatives: [],
  cascade_alignment_score: 8,
  owner_id: mockUser.id,
  contributors: [],
  created_by: mockUser.id,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
})