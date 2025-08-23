/**
 * Component Tests for AI Member Recommendations Panel
 * Testing enterprise-grade AI recommendations UI component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIMemberRecommendationsPanel } from '@/components/boardmates/AIMemberRecommendationsPanel'
import { EnhancedBoardMate, MemberRecommendation } from '@/types/boardmates'
import { AIMemberRecommendationsService } from '@/lib/services/ai-member-recommendations.service'

// Mock the service
jest.mock('@/lib/services/ai-member-recommendations.service')
const MockedService = AIMemberRecommendationsService as jest.MockedClass<typeof AIMemberRecommendationsService>

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

const createMockRecommendation = (overrides: Partial<MemberRecommendation> = {}): MemberRecommendation => ({
  candidate_id: 'candidate-1',
  full_name: 'John Smith',
  email: 'john.smith@example.com',
  match_score: 0.92,
  rank: 1,
  strengths: [
    'Extensive experience in financial oversight and audit committee leadership',
    'Strong track record in technology transformation and digital innovation',
    'Proven expertise in regulatory compliance and risk management'
  ],
  concerns: [
    'Limited experience with early-stage companies',
    'May require additional time commitment due to other board positions'
  ],
  expected_impact: 'Would bring strong financial oversight and strategic digital transformation expertise to enhance board effectiveness and drive innovation initiatives.',
  risk_factors: ['Time commitment'],
  confidence_level: 0.89,
  ai_rationale: 'Candidate demonstrates exceptional alignment with board needs in financial expertise and digital transformation experience.',
  suggested_role: 'member',
  onboarding_timeline: '4-6 weeks',
  ...overrides
})

const createMockCurrentBoard = (): EnhancedBoardMate[] => [
  createMockBoardMate({ id: 'member-1', full_name: 'Jane Doe', role: 'owner' }),
  createMockBoardMate({ id: 'member-2', full_name: 'Bob Smith', role: 'admin' })
]

const createMockRecommendations = (): MemberRecommendation[] => [
  createMockRecommendation({ candidate_id: '1', full_name: 'John Smith', match_score: 0.92 }),
  createMockRecommendation({ candidate_id: '2', full_name: 'Sarah Johnson', match_score: 0.88, rank: 2 }),
  createMockRecommendation({ candidate_id: '3', full_name: 'Mike Wilson', match_score: 0.85, rank: 3 })
]

describe('AIMemberRecommendationsPanel', () => {
  const defaultProps = {
    currentBoardMembers: createMockCurrentBoard(),
    organizationId: 'org-123',
    vaultId: 'vault-123',
    onMemberSelect: jest.fn(),
    onRefreshRecommendations: jest.fn()
  }

  let mockServiceInstance: jest.Mocked<AIMemberRecommendationsService>

  beforeEach(() => {
    mockServiceInstance = {
      getRecommendations: jest.fn(),
      analyzeTeamComposition: jest.fn(),
      processVoiceQuery: jest.fn(),
      generateTeamDynamicsInsights: jest.fn()
    } as any

    MockedService.mockImplementation(() => mockServiceInstance)
    
    jest.clearAllMocks()
  })

  describe('Initial Rendering and Loading States', () => {
    it('should render with loading state initially', async () => {
      mockServiceInstance.getRecommendations.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createMockRecommendations()), 100))
      )

      render(<AIMemberRecommendationsPanel {...defaultProps} />)

      expect(screen.getByText('AI Member Recommendations')).toBeInTheDocument()
      expect(screen.getByText('Loading recommendations...')).toBeInTheDocument()
      
      // Should show loading spinner
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should display recommendations after loading', async () => {
      mockServiceInstance.getRecommendations.mockResolvedValue(createMockRecommendations())

      render(<AIMemberRecommendationsPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
        expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
        expect(screen.getByText('Mike Wilson')).toBeInTheDocument()
      })

      expect(screen.queryByText('Loading recommendations...')).not.toBeInTheDocument()
    })

    it('should handle empty recommendations gracefully', async () => {
      mockServiceInstance.getRecommendations.mockResolvedValue([])

      render(<AIMemberRecommendationsPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('No recommendations available')).toBeInTheDocument()
      })
    })
  })

  describe('Recommendation Display and Interaction', () => {
    beforeEach(async () => {
      mockServiceInstance.getRecommendations.mockResolvedValue(createMockRecommendations())
      render(<AIMemberRecommendationsPanel {...defaultProps} />)
      await waitFor(() => screen.getByText('John Smith'))
    })

    it('should display recommendation cards with proper information', () => {
      const johnCard = screen.getByTestId('recommendation-card-1')
      
      expect(within(johnCard).getByText('John Smith')).toBeInTheDocument()
      expect(within(johnCard).getByText('92%')).toBeInTheDocument() // Match score
      expect(within(johnCard).getByText('john.smith@example.com')).toBeInTheDocument()
      
      // Should show strengths
      expect(within(johnCard).getByText(/financial oversight/)).toBeInTheDocument()
      expect(within(johnCard).getByText(/digital innovation/)).toBeInTheDocument()
    })

    it('should show match score with appropriate styling', () => {
      const highScoreElement = screen.getByText('92%')
      expect(highScoreElement).toHaveClass('text-green-600') // High score styling
      
      const mediumScoreElement = screen.getByText('85%')
      expect(mediumScoreElement).toHaveClass('text-blue-600') // Medium score styling
    })

    it('should display AI confidence indicators', () => {
      expect(screen.getByText('AI Confidence: 89%')).toBeInTheDocument()
    })

    it('should show risk factors when present', () => {
      const recommendationCard = screen.getByTestId('recommendation-card-1')
      expect(within(recommendationCard).getByText('Time commitment')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    beforeEach(async () => {
      mockServiceInstance.getRecommendations.mockResolvedValue(createMockRecommendations())
      render(<AIMemberRecommendationsPanel {...defaultProps} />)
      await waitFor(() => screen.getByText('John Smith'))
    })

    it('should call onMemberSelect when selecting a recommendation', async () => {
      const selectButton = screen.getByTestId('select-candidate-1')
      
      await userEvent.click(selectButton)
      
      expect(defaultProps.onMemberSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          candidate_id: '1',
          full_name: 'John Smith',
          email: 'john.smith@example.com'
        })
      )
    })

    it('should expand/collapse recommendation details', async () => {
      const detailsButton = screen.getByTestId('details-toggle-1')
      
      // Initially collapsed
      expect(screen.queryByText('AI Rationale')).not.toBeInTheDocument()
      
      await userEvent.click(detailsButton)
      
      // Should expand and show details
      expect(screen.getByText('AI Rationale')).toBeInTheDocument()
      expect(screen.getByText(/Candidate demonstrates exceptional alignment/)).toBeInTheDocument()
    })

    it('should handle voice query input', async () => {
      mockServiceInstance.processVoiceQuery.mockResolvedValue(createMockRecommendations())
      
      const voiceButton = screen.getByTestId('voice-query-button')
      await userEvent.click(voiceButton)
      
      const voiceInput = screen.getByPlaceholderText('Ask AI about board member needs...')
      await userEvent.type(voiceInput, 'Find someone with cybersecurity experience')
      
      const submitButton = screen.getByTestId('submit-voice-query')
      await userEvent.click(submitButton)
      
      expect(mockServiceInstance.processVoiceQuery).toHaveBeenCalledWith(
        'Find someone with cybersecurity experience',
        expect.any(Object)
      )
    })

    it('should refresh recommendations when refresh button is clicked', async () => {
      const refreshButton = screen.getByTestId('refresh-recommendations')
      
      await userEvent.click(refreshButton)
      
      expect(mockServiceInstance.getRecommendations).toHaveBeenCalledTimes(2) // Initial load + refresh
      expect(defaultProps.onRefreshRecommendations).toHaveBeenCalled()
    })
  })

  describe('Filtering and Sorting', () => {
    beforeEach(async () => {
      const recommendations = [
        createMockRecommendation({ 
          candidate_id: '1', 
          full_name: 'John Smith', 
          match_score: 0.95,
          suggested_role: 'admin'
        }),
        createMockRecommendation({ 
          candidate_id: '2', 
          full_name: 'Sarah Johnson', 
          match_score: 0.88,
          suggested_role: 'member'
        }),
        createMockRecommendation({ 
          candidate_id: '3', 
          full_name: 'Mike Wilson', 
          match_score: 0.82,
          suggested_role: 'viewer'
        })
      ]
      
      mockServiceInstance.getRecommendations.mockResolvedValue(recommendations)
      render(<AIMemberRecommendationsPanel {...defaultProps} />)
      await waitFor(() => screen.getByText('John Smith'))
    })

    it('should filter recommendations by role', async () => {
      const roleFilter = screen.getByTestId('role-filter')
      
      await userEvent.selectOptions(roleFilter, 'admin')
      
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.queryByText('Sarah Johnson')).not.toBeInTheDocument()
      expect(screen.queryByText('Mike Wilson')).not.toBeInTheDocument()
    })

    it('should sort recommendations by match score', async () => {
      const sortButton = screen.getByTestId('sort-by-score')
      
      await userEvent.click(sortButton)
      
      const recommendationCards = screen.getAllByTestId(/recommendation-card-/)
      
      // Should be sorted by score (highest first)
      expect(within(recommendationCards[0]).getByText('John Smith')).toBeInTheDocument()
      expect(within(recommendationCards[1]).getByText('Sarah Johnson')).toBeInTheDocument()
      expect(within(recommendationCards[2]).getByText('Mike Wilson')).toBeInTheDocument()
    })

    it('should filter by minimum match score', async () => {
      const scoreFilter = screen.getByTestId('min-score-filter')
      
      await userEvent.type(scoreFilter, '90')
      
      expect(screen.getByText('John Smith')).toBeInTheDocument() // 95% score
      expect(screen.queryByText('Sarah Johnson')).not.toBeInTheDocument() // 88% score
      expect(screen.queryByText('Mike Wilson')).not.toBeInTheDocument() // 82% score
    })
  })

  describe('Team Composition Analysis', () => {
    it('should display current team analysis', async () => {
      const mockAnalysis = {
        overall_score: 78,
        diversity_metrics: {
          gender_balance: 0.6,
          experience_distribution: [5, 10, 15, 20],
          age_diversity: 0.7,
          geographic_spread: 0.8
        },
        skill_coverage: {
          covered_areas: ['Finance', 'Technology', 'Strategy'],
          gap_areas: ['Marketing', 'Legal', 'International'],
          redundancy_areas: ['Finance']
        },
        risk_profile: {
          overall_risk: 0.25,
          high_risk_members: 0,
          compliance_risks: []
        },
        improvement_areas: [
          'Add marketing expertise',
          'Increase international experience',
          'Improve age diversity'
        ],
        strengths: [
          'Strong financial oversight',
          'Excellent technology expertise',
          'Good governance practices'
        ]
      }
      
      mockServiceInstance.analyzeTeamComposition.mockResolvedValue(mockAnalysis)
      mockServiceInstance.getRecommendations.mockResolvedValue(createMockRecommendations())

      render(<AIMemberRecommendationsPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Current Board Analysis')).toBeInTheDocument()
        expect(screen.getByText('78%')).toBeInTheDocument() // Overall score
        expect(screen.getByText('Add marketing expertise')).toBeInTheDocument()
      })
    })

    it('should show skill coverage visualization', async () => {
      mockServiceInstance.analyzeTeamComposition.mockResolvedValue({
        overall_score: 85,
        skill_coverage: {
          covered_areas: ['Finance', 'Technology', 'Strategy'],
          gap_areas: ['Marketing', 'Legal'],
          redundancy_areas: ['Finance']
        }
      } as any)
      mockServiceInstance.getRecommendations.mockResolvedValue([])

      render(<AIMemberRecommendationsPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Covered Skills')).toBeInTheDocument()
        expect(screen.getByText('Finance')).toBeInTheDocument()
        expect(screen.getByText('Technology')).toBeInTheDocument()
        
        expect(screen.getByText('Skill Gaps')).toBeInTheDocument()
        expect(screen.getByText('Marketing')).toBeInTheDocument()
        expect(screen.getByText('Legal')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when recommendations fail to load', async () => {
      mockServiceInstance.getRecommendations.mockRejectedValue(
        new Error('Failed to fetch recommendations')
      )

      render(<AIMemberRecommendationsPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load recommendations')).toBeInTheDocument()
        expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      })
    })

    it('should retry loading recommendations on error', async () => {
      mockServiceInstance.getRecommendations
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockRecommendations())

      render(<AIMemberRecommendationsPanel {...defaultProps} />)

      await waitFor(() => screen.getByTestId('retry-button'))
      
      const retryButton = screen.getByTestId('retry-button')
      await userEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
        expect(screen.queryByText('Failed to load recommendations')).not.toBeInTheDocument()
      })
    })

    it('should handle voice query errors gracefully', async () => {
      mockServiceInstance.getRecommendations.mockResolvedValue(createMockRecommendations())
      mockServiceInstance.processVoiceQuery.mockRejectedValue(
        new Error('Voice processing failed')
      )

      render(<AIMemberRecommendationsPanel {...defaultProps} />)
      await waitFor(() => screen.getByText('John Smith'))

      const voiceButton = screen.getByTestId('voice-query-button')
      await userEvent.click(voiceButton)
      
      const voiceInput = screen.getByPlaceholderText('Ask AI about board member needs...')
      await userEvent.type(voiceInput, 'test query')
      
      const submitButton = screen.getByTestId('submit-voice-query')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Voice query failed. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockServiceInstance.getRecommendations.mockResolvedValue(createMockRecommendations())
      render(<AIMemberRecommendationsPanel {...defaultProps} />)
      await waitFor(() => screen.getByText('John Smith'))
    })

    it('should have proper ARIA labels and roles', () => {
      expect(screen.getByRole('region', { name: /AI Member Recommendations/ })).toBeInTheDocument()
      expect(screen.getByRole('list')).toBeInTheDocument()
      
      const recommendationCards = screen.getAllByRole('listitem')
      expect(recommendationCards).toHaveLength(3)
    })

    it('should support keyboard navigation', async () => {
      const selectButton = screen.getByTestId('select-candidate-1')
      
      selectButton.focus()
      expect(document.activeElement).toBe(selectButton)
      
      fireEvent.keyDown(selectButton, { key: 'Enter', code: 'Enter' })
      expect(defaultProps.onMemberSelect).toHaveBeenCalled()
    })

    it('should have proper contrast ratios for match scores', () => {
      const highScoreElement = screen.getByText('92%')
      const computedStyle = window.getComputedStyle(highScoreElement)
      
      // Should have appropriate color class applied
      expect(highScoreElement).toHaveClass('text-green-600')
    })

    it('should provide screen reader friendly content', () => {
      const matchScore = screen.getByLabelText('Match score: 92%')
      expect(matchScore).toBeInTheDocument()
      
      const confidence = screen.getByLabelText('AI Confidence: 89%')
      expect(confidence).toBeInTheDocument()
    })
  })

  describe('Performance and Optimization', () => {
    it('should not re-render unnecessarily when props change', async () => {
      const renderSpy = jest.spyOn(React, 'useState')
      mockServiceInstance.getRecommendations.mockResolvedValue(createMockRecommendations())
      
      const { rerender } = render(<AIMemberRecommendationsPanel {...defaultProps} />)
      await waitFor(() => screen.getByText('John Smith'))
      
      const initialRenderCount = renderSpy.mock.calls.length
      
      // Re-render with same props
      rerender(<AIMemberRecommendationsPanel {...defaultProps} />)
      
      const finalRenderCount = renderSpy.mock.calls.length
      expect(finalRenderCount).toBe(initialRenderCount) // Should not re-render
      
      renderSpy.mockRestore()
    })

    it('should handle large numbers of recommendations efficiently', async () => {
      const largeRecommendationsList = Array.from({ length: 100 }, (_, i) => 
        createMockRecommendation({ 
          candidate_id: `candidate-${i}`, 
          full_name: `Candidate ${i}`,
          match_score: Math.random() * 0.3 + 0.7 // 70-100%
        })
      )
      
      mockServiceInstance.getRecommendations.mockResolvedValue(largeRecommendationsList)
      
      const startTime = performance.now()
      render(<AIMemberRecommendationsPanel {...defaultProps} />)
      
      await waitFor(() => screen.getByText('Candidate 0'))
      const endTime = performance.now()
      
      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(2000)
    })

    it('should implement virtual scrolling for large datasets', async () => {
      const largeRecommendationsList = Array.from({ length: 50 }, (_, i) => 
        createMockRecommendation({ 
          candidate_id: `candidate-${i}`, 
          full_name: `Candidate ${i}`
        })
      )
      
      mockServiceInstance.getRecommendations.mockResolvedValue(largeRecommendationsList)
      render(<AIMemberRecommendationsPanel {...defaultProps} />)
      
      await waitFor(() => screen.getByText('Candidate 0'))
      
      // Should only render visible items (virtual scrolling)
      const renderedItems = screen.getAllByTestId(/recommendation-card-/)
      expect(renderedItems.length).toBeLessThan(50) // Not all items rendered at once
    })
  })
})