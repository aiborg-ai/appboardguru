import { AnalystBriefingService } from '../analyst-briefing.service'
import { createMockSupabaseClient } from '@/testing/mocks/supabase.mock'
import { success, failure } from '../repositories/result'
import type { Database } from '@/types/database'

// Mock data
const mockAnalystProfile = {
  id: 'analyst-1',
  organization_id: 'org-1',
  name: 'John Smith',
  firm: 'Goldman Sachs',
  email: 'john.smith@gs.com',
  phone: '+1-555-0123',
  specialization: ['financial_analysis', 'market_research'],
  coverage_sectors: ['technology', 'healthcare'],
  rating: 'buy' as const,
  target_price: 150.00,
  price_updated: '2024-01-15T10:00:00Z',
  relationship_status: 'active' as const,
  last_interaction: '2024-01-15T10:00:00Z',
  preference_profile: {
    communication_style: 'formal' as const,
    preferred_meeting_length: 60,
    preferred_channels: ['email', 'phone'],
    information_focus: ['financial', 'strategic']
  },
  influence_score: 85,
  interaction_history: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z'
}

const mockBriefingSession = {
  id: 'session-1',
  organization_id: 'org-1',
  title: 'Q4 2023 Earnings Briefing',
  type: 'earnings' as const,
  scheduled_date: '2024-02-01T15:00:00Z',
  duration: 90,
  status: 'scheduled' as const,
  participants: {
    internal: [
      { id: 'user-1', name: 'CEO', role: 'Chief Executive Officer' },
      { id: 'user-2', name: 'CFO', role: 'Chief Financial Officer' }
    ],
    analysts: [
      { id: 'analyst-1', name: 'John Smith', firm: 'Goldman Sachs', confirmed: true },
      { id: 'analyst-2', name: 'Jane Doe', firm: 'Morgan Stanley', confirmed: false }
    ]
  },
  agenda: [
    {
      order: 1,
      title: 'Financial Results Overview',
      description: 'Q4 2023 financial performance highlights',
      duration: 20,
      presenter: 'CFO',
      materials: ['financial-report.pdf'],
      key_points: ['Revenue growth', 'Margin improvement', 'Cash flow']
    }
  ],
  materials: [
    {
      title: 'Q4 Financial Report',
      type: 'financial_statement' as const,
      file_path: '/documents/q4-report.pdf',
      access_level: 'restricted' as const,
      uploaded_by: 'user-1',
      uploaded_at: '2024-01-20T10:00:00Z',
      download_count: 5,
      last_accessed: '2024-01-21T14:30:00Z'
    }
  ],
  q_and_a: [],
  performance_expectations: [],
  follow_up_actions: [],
  created_by: 'test-user-id',
  created_at: '2024-01-20T10:00:00Z',
  updated_at: '2024-01-20T10:00:00Z'
}

const mockQuestion = {
  id: 'question-1',
  question: 'What is the expected impact of the new product launch on Q1 revenues?',
  category: 'financial' as const,
  priority: 'high' as const,
  status: 'pending' as const,
  answer: undefined,
  answered_by: undefined,
  answered_at: undefined,
  sources: [],
  confidence_level: undefined
}

const mockPerformanceExpectation = {
  id: 'expectation-1',
  metric: 'Revenue',
  period: 'Q1 2024',
  analyst_estimate: 1250000000,
  company_guidance: 1200000000,
  consensus_estimate: 1225000000,
  actual_result: undefined,
  confidence_level: 85,
  notes: 'Based on new product launch timing'
}

const mockMarketSentiment = {
  id: 'sentiment-1',
  source: 'analyst_note' as const,
  analyst_id: 'analyst-1',
  sentiment: 'positive' as const,
  impact_score: 75,
  content_summary: 'Positive outlook on Q4 results and strategic direction',
  key_factors: ['strong_financials', 'market_expansion', 'product_innovation'],
  price_impact: 5.2,
  publication_date: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T10:00:00Z'
}

describe('AnalystBriefingService', () => {
  let service: AnalystBriefingService
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    service = new AnalystBriefingService(mockSupabase)

    // Mock auth user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    })
  })

  describe('Analyst Profile Management', () => {
    describe('createAnalystProfile', () => {
      it('should successfully create a new analyst profile', async () => {
        const { id, last_interaction, interaction_history, created_at, updated_at, ...profileInput } = mockAnalystProfile

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockAnalystProfile,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.createAnalystProfile(profileInput)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockAnalystProfile)
        expect(mockSupabase.from).toHaveBeenCalledWith('analyst_profiles')
      })

      it('should validate analyst profile data', async () => {
        const invalidData = {
          name: '', // Invalid: empty name
          firm: '', // Invalid: empty firm
          email: 'invalid-email', // Invalid: not a valid email
          specialization: [], // Invalid: empty array
          coverage_sectors: [], // Invalid: empty array
          rating: 'invalid' as any, // Invalid: not in enum
          influence_score: -1 // Invalid: negative score
        }

        const result = await service.createAnalystProfile(invalidData as any)

        expect(result.success).toBe(false)
        expect(result.error.code).toBe('VALIDATION_ERROR')
      })

      it('should handle database errors', async () => {
        const { id, last_interaction, interaction_history, created_at, updated_at, ...profileInput } = mockAnalystProfile

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'DB_ERROR' }
        })

        const result = await service.createAnalystProfile(profileInput)

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    describe('updateAnalystProfile', () => {
      it('should update analyst profile successfully', async () => {
        const updates = {
          rating: 'hold' as const,
          target_price: 140.00,
          influence_score: 88
        }

        mockSupabase.from().update().eq().select().single.mockResolvedValue({
          data: { ...mockAnalystProfile, ...updates },
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.updateAnalystProfile('analyst-1', updates)

        expect(result.success).toBe(true)
        expect(result.data.rating).toBe('hold')
        expect(result.data.target_price).toBe(140.00)
        expect(mockSupabase.from().update().eq().select().single).toHaveBeenCalled()
      })
    })

    describe('getAnalysts', () => {
      it('should return analysts with filters', async () => {
        const mockAnalysts = [mockAnalystProfile]

        mockSupabase.from().select().eq().order.mockResolvedValue({
          data: mockAnalysts,
          error: null
        })

        const result = await service.getAnalysts('org-1', {
          firm: 'Goldman Sachs',
          rating: 'buy'
        })

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockAnalysts)
        expect(mockSupabase.from().select().eq().order).toHaveBeenCalled()
      })

      it('should return all analysts when no filters provided', async () => {
        const mockAnalysts = [mockAnalystProfile]

        mockSupabase.from().select().eq().order.mockResolvedValue({
          data: mockAnalysts,
          error: null
        })

        const result = await service.getAnalysts('org-1')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockAnalysts)
      })
    })
  })

  describe('Briefing Session Management', () => {
    describe('scheduleBriefingSession', () => {
      it('should schedule a new briefing session', async () => {
        const { id, status, q_and_a, follow_up_actions, created_by, created_at, updated_at, ...sessionInput } = mockBriefingSession

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockBriefingSession,
          error: null
        })

        // Mock invitation creation
        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.scheduleBriefingSession(sessionInput)

        expect(result.success).toBe(true)
        expect(result.data.title).toBe('Q4 2023 Earnings Briefing')
        expect(result.data.status).toBe('scheduled')
        expect(mockSupabase.from).toHaveBeenCalledWith('analyst_briefing_sessions')
      })

      it('should validate briefing session data', async () => {
        const invalidData = {
          title: '', // Invalid: empty title
          type: 'invalid' as any, // Invalid: not in enum
          scheduled_date: 'invalid-date', // Invalid: not a valid datetime
          duration: 0, // Invalid: too short
          participants: {
            internal: [],
            analysts: []
          },
          agenda: [] // Invalid: empty agenda
        }

        const result = await service.scheduleBriefingSession(invalidData as any)

        expect(result.success).toBe(false)
        expect(result.error.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('updateBriefingSession', () => {
      it('should update briefing session status', async () => {
        const updates = {
          status: 'completed' as const,
          recording_url: 'https://recordings.example.com/session-1'
        }

        mockSupabase.from().update().eq().select().single.mockResolvedValue({
          data: { ...mockBriefingSession, ...updates },
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.updateBriefingSession('session-1', updates)

        expect(result.success).toBe(true)
        expect(result.data.status).toBe('completed')
        expect(result.data.recording_url).toBe('https://recordings.example.com/session-1')
      })
    })
  })

  describe('Q&A Management', () => {
    describe('addQuestion', () => {
      it('should add a question successfully', async () => {
        const questionData = {
          question: 'What is the expected impact of the new product launch?',
          category: 'financial' as const,
          priority: 'high' as const
        }

        const mockQuestionResult = {
          ...questionData,
          id: 'question-1',
          status: 'pending' as const
        }

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockQuestionResult,
          error: null
        })

        // Mock session update
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: { q_and_a: [] },
          error: null
        })

        mockSupabase.from().update().eq.mockResolvedValue({
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.addQuestion('session-1', questionData)

        expect(result.success).toBe(true)
        expect(result.data.question).toBe(questionData.question)
        expect(result.data.status).toBe('pending')
        expect(mockSupabase.from).toHaveBeenCalledWith('analyst_questions')
      })

      it('should validate question data', async () => {
        const invalidData = {
          question: '', // Invalid: empty question
          category: 'invalid' as any, // Invalid: not in enum
          priority: 'invalid' as any // Invalid: not in enum
        }

        const result = await service.addQuestion('session-1', invalidData as any)

        expect(result.success).toBe(false)
        expect(result.error.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('answerQuestion', () => {
      it('should answer a question successfully', async () => {
        const answer = 'The new product launch is expected to contribute $50M to Q1 revenue.'
        const sources = ['internal_projections', 'market_analysis']
        const confidence = 85

        const answeredQuestion = {
          ...mockQuestion,
          answer,
          sources,
          confidence_level: confidence,
          answered_by: 'test-user-id',
          answered_at: '2024-01-15T10:00:00Z',
          status: 'answered' as const
        }

        mockSupabase.from().update().eq().select().single.mockResolvedValue({
          data: answeredQuestion,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.answerQuestion('question-1', answer, sources, confidence)

        expect(result.success).toBe(true)
        expect(result.data.answer).toBe(answer)
        expect(result.data.status).toBe('answered')
        expect(result.data.confidence_level).toBe(confidence)
      })
    })

    describe('getQADatabase', () => {
      it('should return Q&A data with analytics', async () => {
        const mockQuestions = [
          {
            ...mockQuestion,
            created_at: '2024-01-15T10:00:00Z',
            question_date: '2024-01-15T10:00:00Z'
          },
          {
            ...mockQuestion,
            id: 'question-2',
            category: 'strategic',
            status: 'answered',
            confidence_level: 90,
            created_at: '2024-01-14T10:00:00Z',
            question_date: '2024-01-14T10:00:00Z'
          }
        ]

        mockSupabase.from().select().eq().order.mockResolvedValue({
          data: mockQuestions,
          error: null
        })

        const result = await service.getQADatabase('org-1', {
          category: 'financial',
          answered: false
        })

        expect(result.success).toBe(true)
        expect(result.data.questions).toBeDefined()
        expect(result.data.categories).toBeDefined()
        expect(result.data.trends).toBeDefined()
        expect(result.data.categories.financial).toBeGreaterThan(0)
      })

      it('should filter questions by keyword', async () => {
        const mockQuestions = [
          {
            ...mockQuestion,
            question: 'What is the revenue impact?',
            answer: 'Revenue will increase by 20%',
            created_at: '2024-01-15T10:00:00Z'
          }
        ]

        mockSupabase.from().select().eq().or.mockResolvedValue({
          data: mockQuestions,
          error: null
        })

        const result = await service.getQADatabase('org-1', {
          keyword: 'revenue'
        })

        expect(result.success).toBe(true)
        expect(mockSupabase.from().select().eq().or).toHaveBeenCalledWith(
          expect.stringContaining('revenue')
        )
      })
    })
  })

  describe('Performance Expectation Management', () => {
    describe('trackPerformanceExpectation', () => {
      it('should track performance expectation successfully', async () => {
        const { id, updated_at, ...expectationData } = mockPerformanceExpectation

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockPerformanceExpectation,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.trackPerformanceExpectation(expectationData)

        expect(result.success).toBe(true)
        expect(result.data.metric).toBe('Revenue')
        expect(result.data.analyst_estimate).toBe(1250000000)
        expect(mockSupabase.from).toHaveBeenCalledWith('analyst_performance_expectations')
      })
    })

    describe('compareResultsVsExpectations', () => {
      it('should compare actual results vs expectations', async () => {
        const mockExpectations = [
          {
            ...mockPerformanceExpectation,
            actual_result: 1275000000, // Beat estimate
            analyst_id: 'analyst-1',
            analyst_profiles: { name: 'John Smith', firm: 'Goldman Sachs' }
          },
          {
            ...mockPerformanceExpectation,
            id: 'expectation-2',
            analyst_estimate: 1200000000,
            actual_result: 1180000000, // Missed estimate
            analyst_id: 'analyst-2',
            analyst_profiles: { name: 'Jane Doe', firm: 'Morgan Stanley' }
          }
        ]

        mockSupabase.from().select().eq().eq.mockResolvedValue({
          data: mockExpectations,
          error: null
        })

        const result = await service.compareResultsVsExpectations('org-1', 'Q1 2024')

        expect(result.success).toBe(true)
        expect(result.data.metrics).toHaveLength(1) // Should be grouped by metric
        expect(result.data.overall_performance).toBeDefined()
        expect(result.data.overall_performance.beats).toBeGreaterThan(0)
        expect(result.data.analyst_accuracy).toBeDefined()
        expect(result.data.analyst_accuracy[0].accuracy_rate).toBeGreaterThanOrEqual(0)
      })

      it('should handle no expectations data', async () => {
        mockSupabase.from().select().eq().eq.mockResolvedValue({
          data: [],
          error: null
        })

        const result = await service.compareResultsVsExpectations('org-1', 'Q1 2024')

        expect(result.success).toBe(true)
        expect(result.data.metrics).toHaveLength(0)
        expect(result.data.overall_performance.accuracy_score).toBe(0)
      })
    })
  })

  describe('Market Sentiment Monitoring', () => {
    describe('trackMarketSentiment', () => {
      it('should track market sentiment successfully', async () => {
        const { id, created_at, ...sentimentData } = mockMarketSentiment

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockMarketSentiment,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.trackMarketSentiment(sentimentData)

        expect(result.success).toBe(true)
        expect(result.data.sentiment).toBe('positive')
        expect(result.data.impact_score).toBe(75)
        expect(mockSupabase.from).toHaveBeenCalledWith('analyst_market_sentiment')
      })
    })

    describe('getSentimentAnalysis', () => {
      it('should return comprehensive sentiment analysis', async () => {
        const mockSentiments = [
          {
            ...mockMarketSentiment,
            analyst_profiles: { name: 'John Smith', firm: 'Goldman Sachs' }
          },
          {
            ...mockMarketSentiment,
            id: 'sentiment-2',
            sentiment: 'negative',
            impact_score: 60,
            analyst_id: 'analyst-2',
            analyst_profiles: { name: 'Jane Doe', firm: 'Morgan Stanley' }
          }
        ]

        mockSupabase.from().select().eq().gte().lte().order.mockResolvedValue({
          data: mockSentiments,
          error: null
        })

        const result = await service.getSentimentAnalysis('org-1', '30d')

        expect(result.success).toBe(true)
        expect(result.data.overall_sentiment).toMatch(/very_positive|positive|neutral|negative|very_negative/)
        expect(result.data.sentiment_score).toBeDefined()
        expect(result.data.trend_direction).toMatch(/improving|declining|stable/)
        expect(result.data.by_source).toBeDefined()
        expect(result.data.by_analyst).toHaveLength(2)
        expect(result.data.timeline).toBeDefined()
        expect(result.data.key_factors).toBeDefined()
      })

      it('should handle empty sentiment data', async () => {
        mockSupabase.from().select().eq().gte().lte().order.mockResolvedValue({
          data: [],
          error: null
        })

        const result = await service.getSentimentAnalysis('org-1', '30d')

        expect(result.success).toBe(true)
        expect(result.data.overall_sentiment).toBe('neutral')
        expect(result.data.sentiment_score).toBe(0)
        expect(result.data.trend_direction).toBe('stable')
      })
    })
  })

  describe('Follow-up Action Tracking', () => {
    describe('createFollowUpAction', () => {
      it('should create follow-up action successfully', async () => {
        const actionData = {
          description: 'Prepare detailed market analysis',
          assigned_to: 'analyst@company.com',
          due_date: '2024-01-30T17:00:00Z',
          priority: 'high' as const
        }

        const mockAction = {
          ...actionData,
          id: 'action-1',
          status: 'pending' as const
        }

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockAction,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.createFollowUpAction('session-1', actionData)

        expect(result.success).toBe(true)
        expect(result.data.description).toBe(actionData.description)
        expect(result.data.status).toBe('pending')
        expect(mockSupabase.from).toHaveBeenCalledWith('analyst_follow_up_actions')
      })
    })

    describe('updateFollowUpAction', () => {
      it('should update follow-up action status', async () => {
        const updates = {
          status: 'completed' as const,
          completion_notes: 'Market analysis completed and shared'
        }

        const updatedAction = {
          id: 'action-1',
          description: 'Prepare detailed market analysis',
          assigned_to: 'analyst@company.com',
          due_date: '2024-01-30T17:00:00Z',
          priority: 'high' as const,
          ...updates,
          completed_at: '2024-01-25T15:30:00Z'
        }

        mockSupabase.from().update().eq().select().single.mockResolvedValue({
          data: updatedAction,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.updateFollowUpAction('action-1', updates)

        expect(result.success).toBe(true)
        expect(result.data.status).toBe('completed')
        expect(result.data.completed_at).toBeDefined()
      })
    })

    describe('getFollowUpDashboard', () => {
      it('should return follow-up dashboard with analytics', async () => {
        const mockActions = [
          {
            id: 'action-1',
            description: 'Task 1',
            assigned_to: 'user1@company.com',
            due_date: '2024-02-01T17:00:00Z',
            priority: 'high',
            status: 'pending'
          },
          {
            id: 'action-2',
            description: 'Task 2',
            assigned_to: 'user2@company.com',
            due_date: '2024-01-01T17:00:00Z', // Overdue
            priority: 'medium',
            status: 'in_progress'
          },
          {
            id: 'action-3',
            description: 'Task 3',
            assigned_to: 'user1@company.com',
            due_date: '2024-01-20T17:00:00Z',
            priority: 'low',
            status: 'completed'
          }
        ]

        mockSupabase.from().select().eq().order.mockResolvedValue({
          data: mockActions,
          error: null
        })

        const result = await service.getFollowUpDashboard('org-1')

        expect(result.success).toBe(true)
        expect(result.data.actions).toHaveLength(3)
        expect(result.data.summary).toBeDefined()
        expect(result.data.summary.total).toBe(3)
        expect(result.data.summary.pending).toBe(1)
        expect(result.data.summary.completed).toBe(1)
        expect(result.data.summary.overdue).toBe(1)
        expect(result.data.by_priority).toBeDefined()
        expect(result.data.by_assignee).toBeDefined()
      })

      it('should filter actions by status', async () => {
        const mockActions = [
          {
            id: 'action-1',
            status: 'pending',
            assigned_to: 'user@company.com',
            due_date: '2024-02-01T17:00:00Z',
            priority: 'high'
          }
        ]

        mockSupabase.from().select().eq().eq().order.mockResolvedValue({
          data: mockActions,
          error: null
        })

        const result = await service.getFollowUpDashboard('org-1', {
          status: 'pending'
        })

        expect(result.success).toBe(true)
        expect(mockSupabase.from().select().eq().eq().order).toHaveBeenCalled()
      })
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete briefing workflow', async () => {
      // 1. Create analyst profile
      const { id: profileId, last_interaction, interaction_history, created_at, updated_at, ...profileInput } = mockAnalystProfile

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockAnalystProfile,
        error: null
      })

      const profileResult = await service.createAnalystProfile(profileInput)
      expect(profileResult.success).toBe(true)

      // 2. Schedule briefing session
      const { id: sessionId, status, q_and_a, follow_up_actions, created_by, created_at: sessionCreatedAt, updated_at: sessionUpdatedAt, ...sessionInput } = mockBriefingSession

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockBriefingSession,
        error: null
      })

      const sessionResult = await service.scheduleBriefingSession(sessionInput)
      expect(sessionResult.success).toBe(true)

      // 3. Add questions
      const questionData = {
        question: 'What is the revenue guidance for next quarter?',
        category: 'financial' as const,
        priority: 'high' as const
      }

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { ...questionData, id: 'question-1', status: 'pending' },
        error: null
      })

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { q_and_a: [] },
        error: null
      })

      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      })

      const questionResult = await service.addQuestion('session-1', questionData)
      expect(questionResult.success).toBe(true)

      // 4. Track sentiment
      const { id: sentimentId, created_at: sentimentCreatedAt, ...sentimentData } = mockMarketSentiment

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockMarketSentiment,
        error: null
      })

      const sentimentResult = await service.trackMarketSentiment(sentimentData)
      expect(sentimentResult.success).toBe(true)

      // Mock activity logging for all operations
      mockSupabase.from().insert.mockResolvedValue({
        error: null
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication failures', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Authentication failed' }
      })

      const { id, last_interaction, interaction_history, created_at, updated_at, ...profileInput } = mockAnalystProfile
      const result = await service.createAnalystProfile(profileInput)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle database connection errors', async () => {
      const { id, last_interaction, interaction_history, created_at, updated_at, ...profileInput } = mockAnalystProfile
      
      mockSupabase.from().insert().select().single.mockRejectedValue(new Error('Connection failed'))

      const result = await service.createAnalystProfile(profileInput)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle validation errors gracefully', async () => {
      const invalidSession = {
        title: '',
        type: 'invalid' as any,
        scheduled_date: 'invalid-date',
        duration: -1,
        participants: { internal: [], analysts: [] },
        agenda: []
      }

      const result = await service.scheduleBriefingSession(invalidSession)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('VALIDATION_ERROR')
      expect(result.error.details).toBeDefined()
    })
  })

  describe('Performance Tests', () => {
    it('should handle large Q&A datasets efficiently', async () => {
      const largeQADataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `question-${i}`,
        question: `Question ${i}`,
        category: ['financial', 'strategic', 'operational'][i % 3] as any,
        status: ['pending', 'answered'][i % 2] as any,
        confidence_level: i % 2 ? Math.floor(Math.random() * 100) : undefined,
        created_at: new Date(Date.now() - i * 1000).toISOString(),
        question_date: new Date(Date.now() - i * 1000).toISOString()
      }))

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: largeQADataset,
        error: null
      })

      const startTime = Date.now()
      const result = await service.getQADatabase('org-1')
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(2000) // Should complete within 2 seconds
      expect(result.data.questions).toHaveLength(1000)
      expect(result.data.categories).toBeDefined()
      expect(result.data.trends).toBeDefined()
    })

    it('should handle concurrent briefing operations', async () => {
      const concurrentOperations = [
        service.getAnalysts('org-1'),
        service.getSentimentAnalysis('org-1'),
        service.getFollowUpDashboard('org-1'),
        service.compareResultsVsExpectations('org-1', 'Q1 2024')
      ]

      // Mock responses for all operations
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [],
        error: null
      })

      mockSupabase.from().select().eq().gte().lte().order.mockResolvedValue({
        data: [],
        error: null
      })

      mockSupabase.from().select().eq().eq.mockResolvedValue({
        data: [],
        error: null
      })

      const results = await Promise.all(concurrentOperations)

      results.forEach(result => {
        expect(result.success).toBe(true)
      })
    })
  })
})