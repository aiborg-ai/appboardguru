/**
 * Unit Tests for AI Member Recommendations Service
 * Testing enterprise-grade AI recommendation engine
 */

import { AIMemberRecommendationsService } from '@/lib/services/ai-member-recommendations.service'
import { 
  EnhancedBoardMate, 
  MemberRecommendation, 
  TeamCompositionAnalysis,
  VoiceQueryContext 
} from '@/types/boardmates'

// Mock OpenRouter API
jest.mock('@/lib/api/openrouter', () => ({
  openRouterClient: {
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }
}))

// Mock data factories
const createMockBoardMate = (overrides: Partial<EnhancedBoardMate> = {}): EnhancedBoardMate => ({
  id: 'test-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'member',
  status: 'active',
  joined_at: '2024-01-01T00:00:00Z',
  ai_score: {
    overall_match: 0.85,
    skill_alignment: 0.8,
    cultural_fit: 0.9,
    risk_factor: 0.1,
    growth_potential: 0.85,
    leadership_capacity: 0.75
  },
  expertise_profile: {
    core_competencies: ['Leadership', 'Strategy', 'Finance'],
    industry_experience: 'Technology',
    years_experience: 15,
    innovation_index: 0.8,
    collaboration_style: 'Collaborative'
  },
  performance_metrics: {
    overall_score: 0.88,
    decision_quality: 0.9,
    strategic_impact: 0.85,
    team_effectiveness: 0.87,
    stakeholder_satisfaction: 0.9
  },
  risk_assessment: {
    overall_risk_level: 0.15,
    compliance_risk: 0.1,
    reputation_risk: 0.1,
    performance_risk: 0.2
  },
  network_position: {
    influence_score: 0.75,
    centrality_measure: 0.6,
    connection_strength: 0.8
  },
  ...overrides
})

const createMockRecommendationCriteria = () => ({
  required_skills: ['Leadership', 'Finance'],
  preferred_experience: 10,
  diversity_goals: {
    gender: 'balanced',
    ethnicity: 'diverse',
    age_range: { min: 35, max: 65 },
    geographic: 'global'
  },
  risk_tolerance: 'medium',
  innovation_focus: 'high',
  board_size_target: 7,
  expertise_gaps: ['Digital Transformation', 'ESG']
})

describe('AIMemberRecommendationsService', () => {
  let service: AIMemberRecommendationsService
  let mockCurrentMembers: EnhancedBoardMate[]

  beforeEach(() => {
    service = new AIMemberRecommendationsService()
    mockCurrentMembers = [
      createMockBoardMate({ id: 'member-1', full_name: 'John Doe' }),
      createMockBoardMate({ id: 'member-2', full_name: 'Jane Smith', role: 'admin' })
    ]
    jest.clearAllMocks()
  })

  describe('getRecommendations', () => {
    it('should return member recommendations with proper scoring', async () => {
      const vaultId = 'vault-123' as any
      const organizationId = 'org-123' as any
      const criteria = createMockRecommendationCriteria()

      const recommendations = await service.getRecommendations(
        vaultId,
        organizationId,
        mockCurrentMembers,
        criteria
      )

      expect(recommendations).toHaveLength(5) // Default recommendation count
      expect(recommendations[0]).toHaveProperty('candidate_id')
      expect(recommendations[0]).toHaveProperty('match_score')
      expect(recommendations[0]).toHaveProperty('strengths')
      expect(recommendations[0]).toHaveProperty('concerns')
      expect(recommendations[0]).toHaveProperty('expected_impact')
      expect(recommendations[0].match_score).toBeGreaterThan(0.7) // High-quality recommendations
    })

    it('should handle empty current members list', async () => {
      const recommendations = await service.getRecommendations(
        'vault-123' as any,
        'org-123' as any,
        [],
        createMockRecommendationCriteria()
      )

      expect(recommendations).toHaveLength(5)
      expect(recommendations.every(r => r.match_score > 0)).toBe(true)
    })

    it('should respect risk tolerance in recommendations', async () => {
      const lowRiskCriteria = {
        ...createMockRecommendationCriteria(),
        risk_tolerance: 'low' as const
      }

      const recommendations = await service.getRecommendations(
        'vault-123' as any,
        'org-123' as any,
        mockCurrentMembers,
        lowRiskCriteria
      )

      // All recommendations should have low risk factors
      recommendations.forEach(rec => {
        expect(rec.risk_factors.length).toBeLessThanOrEqual(2)
        expect(rec.match_score).toBeGreaterThan(0.75) // Higher threshold for low risk
      })
    })

    it('should include diversity considerations', async () => {
      const diversityCriteria = {
        ...createMockRecommendationCriteria(),
        diversity_goals: {
          gender: 'balanced' as const,
          ethnicity: 'diverse' as const,
          age_range: { min: 30, max: 70 },
          geographic: 'global' as const
        }
      }

      const recommendations = await service.getRecommendations(
        'vault-123' as any,
        'org-123' as any,
        mockCurrentMembers,
        diversityCriteria
      )

      // Should include diversity insights in expected impact
      recommendations.forEach(rec => {
        expect(rec.expected_impact).toContain('diversity')
      })
    })
  })

  describe('analyzeTeamComposition', () => {
    it('should analyze current board composition thoroughly', async () => {
      const analysis = await service.analyzeTeamComposition(mockCurrentMembers)

      expect(analysis).toHaveProperty('overall_score')
      expect(analysis).toHaveProperty('diversity_metrics')
      expect(analysis).toHaveProperty('skill_coverage')
      expect(analysis).toHaveProperty('risk_profile')
      expect(analysis).toHaveProperty('improvement_areas')
      expect(analysis).toHaveProperty('strengths')

      expect(analysis.overall_score).toBeGreaterThanOrEqual(0)
      expect(analysis.overall_score).toBeLessThanOrEqual(100)
      expect(analysis.diversity_metrics).toHaveProperty('gender_balance')
      expect(analysis.diversity_metrics).toHaveProperty('experience_distribution')
      expect(analysis.skill_coverage.covered_areas).toBeInstanceOf(Array)
    })

    it('should identify skill gaps correctly', async () => {
      const membersWithGaps = [
        createMockBoardMate({
          expertise_profile: {
            ...createMockBoardMate().expertise_profile!,
            core_competencies: ['Finance'] // Limited skills
          }
        })
      ]

      const analysis = await service.analyzeTeamComposition(membersWithGaps)
      
      expect(analysis.skill_coverage.gap_areas.length).toBeGreaterThan(0)
      expect(analysis.improvement_areas).toContain('Expand skill diversity')
    })

    it('should handle single member boards', async () => {
      const singleMember = [mockCurrentMembers[0]]
      const analysis = await service.analyzeTeamComposition(singleMember)

      expect(analysis.overall_score).toBeLessThan(60) // Should indicate need for expansion
      expect(analysis.improvement_areas).toContain('Increase board size')
    })
  })

  describe('processVoiceQuery', () => {
    it('should process natural language queries correctly', async () => {
      const context: VoiceQueryContext = {
        user_id: 'user-123',
        current_board: mockCurrentMembers,
        organization_context: {
          industry: 'Technology',
          size: 'Large',
          stage: 'Growth',
          focus_areas: ['Innovation', 'Global Expansion']
        }
      }

      const query = "Find me someone with cybersecurity experience for our board"
      const recommendations = await service.processVoiceQuery(query, context)

      expect(recommendations).toHaveLength(5)
      recommendations.forEach(rec => {
        expect(rec.strengths.some(s => s.toLowerCase().includes('security'))).toBe(true)
      })
    })

    it('should handle complex multi-criteria voice queries', async () => {
      const context: VoiceQueryContext = {
        user_id: 'user-123',
        current_board: mockCurrentMembers,
        organization_context: {
          industry: 'Healthcare',
          size: 'Medium',
          stage: 'Scale',
          focus_areas: ['Regulatory Compliance', 'Digital Health']
        }
      }

      const query = "I need a board member with healthcare regulatory experience and digital transformation background who can help with FDA compliance"
      const recommendations = await service.processVoiceQuery(query, context)

      expect(recommendations.length).toBeGreaterThan(0)
      recommendations.forEach(rec => {
        const hasHealthcare = rec.strengths.some(s => 
          s.toLowerCase().includes('healthcare') || 
          s.toLowerCase().includes('regulatory') ||
          s.toLowerCase().includes('fda')
        )
        expect(hasHealthcare).toBe(true)
      })
    })

    it('should provide context-aware recommendations', async () => {
      const techContext: VoiceQueryContext = {
        user_id: 'user-123',
        current_board: mockCurrentMembers,
        organization_context: {
          industry: 'Technology',
          size: 'Startup',
          stage: 'Seed',
          focus_areas: ['Product Development', 'Fundraising']
        }
      }

      const query = "Find board members for a tech startup"
      const recommendations = await service.processVoiceQuery(query, techContext)

      recommendations.forEach(rec => {
        const hasTechExperience = rec.strengths.some(s =>
          s.toLowerCase().includes('technology') ||
          s.toLowerCase().includes('startup') ||
          s.toLowerCase().includes('venture')
        )
        expect(hasTechExperience).toBe(true)
      })
    })
  })

  describe('generateTeamDynamicsInsights', () => {
    it('should generate comprehensive team dynamics insights', async () => {
      const insights = await service.generateTeamDynamicsInsights(
        mockCurrentMembers,
        'technology'
      )

      expect(insights).toHaveProperty('collaboration_patterns')
      expect(insights).toHaveProperty('decision_making_style')
      expect(insights).toHaveProperty('conflict_resolution')
      expect(insights).toHaveProperty('communication_effectiveness')
      expect(insights).toHaveProperty('leadership_dynamics')
      expect(insights).toHaveProperty('innovation_capacity')

      expect(insights.collaboration_patterns.score).toBeGreaterThanOrEqual(0)
      expect(insights.collaboration_patterns.score).toBeLessThanOrEqual(100)
    })

    it('should identify potential team conflicts', async () => {
      const conflictingMembers = [
        createMockBoardMate({
          expertise_profile: {
            ...createMockBoardMate().expertise_profile!,
            collaboration_style: 'Direct'
          }
        }),
        createMockBoardMate({
          expertise_profile: {
            ...createMockBoardMate().expertise_profile!,
            collaboration_style: 'Consensus-driven'
          }
        })
      ]

      const insights = await service.generateTeamDynamicsInsights(
        conflictingMembers,
        'technology'
      )

      expect(insights.conflict_resolution.potential_conflicts.length).toBeGreaterThan(0)
    })

    it('should provide industry-specific insights', async () => {
      const healthcareInsights = await service.generateTeamDynamicsInsights(
        mockCurrentMembers,
        'healthcare'
      )

      const financeInsights = await service.generateTeamDynamicsInsights(
        mockCurrentMembers,
        'finance'
      )

      // Industry-specific insights should differ
      expect(healthcareInsights.decision_making_style.characteristics)
        .not.toEqual(financeInsights.decision_making_style.characteristics)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      // Mock API failure
      const mockError = new Error('OpenRouter API unavailable')
      jest.spyOn(service as any, 'callOpenRouterAPI').mockRejectedValue(mockError)

      const recommendations = await service.getRecommendations(
        'vault-123' as any,
        'org-123' as any,
        mockCurrentMembers,
        createMockRecommendationCriteria()
      )

      // Should return fallback recommendations
      expect(recommendations).toHaveLength(5)
      recommendations.forEach(rec => {
        expect(rec.match_score).toBeGreaterThan(0.6) // Reasonable fallback scores
      })
    })

    it('should validate input parameters', async () => {
      // Test with invalid criteria
      const invalidCriteria = {
        required_skills: [],
        preferred_experience: -5, // Invalid
        risk_tolerance: 'invalid' as any
      }

      await expect(
        service.getRecommendations(
          'vault-123' as any,
          'org-123' as any,
          mockCurrentMembers,
          invalidCriteria
        )
      ).resolves.not.toThrow() // Should handle gracefully
    })

    it('should handle large datasets efficiently', async () => {
      const largeMemberList = Array.from({ length: 100 }, (_, i) =>
        createMockBoardMate({ id: `member-${i}`, full_name: `Member ${i}` })
      )

      const startTime = Date.now()
      const analysis = await service.analyzeTeamComposition(largeMemberList)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(analysis.overall_score).toBeDefined()
    })
  })

  describe('Performance and Quality Metrics', () => {
    it('should maintain high recommendation quality scores', async () => {
      const recommendations = await service.getRecommendations(
        'vault-123' as any,
        'org-123' as any,
        mockCurrentMembers,
        createMockRecommendationCriteria()
      )

      const averageScore = recommendations.reduce((sum, rec) => sum + rec.match_score, 0) / recommendations.length
      expect(averageScore).toBeGreaterThan(0.75) // High average quality
    })

    it('should provide diverse recommendation profiles', async () => {
      const recommendations = await service.getRecommendations(
        'vault-123' as any,
        'org-123' as any,
        mockCurrentMembers,
        createMockRecommendationCriteria()
      )

      // Check that recommendations have diverse skills
      const allSkills = recommendations.flatMap(r => r.strengths)
      const uniqueSkills = new Set(allSkills)
      expect(uniqueSkills.size).toBeGreaterThan(recommendations.length) // More skills than candidates
    })

    it('should balance innovation and stability', async () => {
      const recommendations = await service.getRecommendations(
        'vault-123' as any,
        'org-123' as any,
        mockCurrentMembers,
        {
          ...createMockRecommendationCriteria(),
          innovation_focus: 'high'
        }
      )

      // Should have mix of innovative and stable candidates
      const hasInnovators = recommendations.some(r => 
        r.expected_impact.toLowerCase().includes('innovation')
      )
      const hasStabilizers = recommendations.some(r =>
        r.expected_impact.toLowerCase().includes('stability')
      )

      expect(hasInnovators).toBe(true)
      expect(hasStabilizers).toBe(true)
    })
  })
})