import { StakeholderEngagementService } from '../stakeholder-engagement.service'
import { createMockSupabaseClient } from '@/testing/mocks/supabase.mock'
import { success, failure } from '../repositories/result'
import type { Database } from '@/types/database'

// Mock data
const mockInvestorData = {
  id: 'investor-1',
  organization_id: 'org-1',
  name: 'Test Investor',
  email: 'investor@test.com',
  type: 'institutional' as const,
  investment_amount: 1000000,
  shareholding_percentage: 5.5,
  access_level: 'premium' as const,
  contact_preferences: {
    email: true,
    phone: true,
    meetings: true,
    reports: true
  },
  status: 'active' as const,
  last_engagement: '2024-01-15T10:00:00Z',
  interaction_history: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z'
}

const mockVoteData = {
  meeting_id: 'meeting-1',
  proposal_id: 'proposal-1',
  voter_id: 'voter-1',
  vote_type: 'for' as const,
  shares_voted: 1000,
  is_proxy: false
}

const mockESGMetricData = {
  category: 'environmental' as const,
  metric_name: 'Carbon Emissions Reduction',
  value: 25.5,
  unit: 'percentage',
  reporting_period: 'Q4 2023',
  data_source: 'Internal Audit',
  verification_status: 'third_party' as const
}

const mockSentimentData = {
  content: 'Great quarterly results and strong forward guidance',
  source: 'analyst_reports' as const,
  stakeholder_type: 'institutional_investor',
  metadata: {
    analyst_firm: 'Goldman Sachs',
    rating: 'buy'
  }
}

describe('StakeholderEngagementService', () => {
  let service: StakeholderEngagementService
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    service = new StakeholderEngagementService(mockSupabase)

    // Mock auth user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    })
  })

  describe('Investor Relations Hub', () => {
    describe('createInvestor', () => {
      it('should successfully create a new investor', async () => {
        const { id, created_at, updated_at, last_engagement, interaction_history, ...investorInput } = mockInvestorData
        
        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockInvestorData,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.createInvestor(investorInput)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockInvestorData)
        expect(mockSupabase.from).toHaveBeenCalledWith('stakeholder_investors')
      })

      it('should handle validation errors', async () => {
        const invalidData = {
          name: '', // Invalid: empty name
          email: 'invalid-email', // Invalid: not a valid email
          type: 'invalid' as any // Invalid: not in enum
        }

        const result = await service.createInvestor(invalidData as any)

        expect(result.success).toBe(false)
        expect(result.error.code).toBe('VALIDATION_ERROR')
      })

      it('should handle database errors', async () => {
        const { id, created_at, updated_at, last_engagement, interaction_history, ...investorInput } = mockInvestorData

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'DB_ERROR' }
        })

        const result = await service.createInvestor(investorInput)

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    describe('getInvestorsByAccessLevel', () => {
      it('should return investors filtered by access level', async () => {
        const mockInvestors = [mockInvestorData]

        mockSupabase.from().select().eq().eq().eq().order.mockResolvedValue({
          data: mockInvestors,
          error: null
        })

        const result = await service.getInvestorsByAccessLevel('premium', 'org-1')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockInvestors)
        expect(mockSupabase.from().select().eq().eq().eq().order).toHaveBeenCalled()
      })

      it('should handle authentication errors', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' }
        })

        const result = await service.getInvestorsByAccessLevel('premium', 'org-1')

        expect(result.success).toBe(false)
        expect(result.error.code).toBe('UNAUTHORIZED')
      })
    })

    describe('trackInvestorEngagement', () => {
      it('should track investor engagement successfully', async () => {
        mockSupabase.from().update().eq.mockResolvedValue({
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.trackInvestorEngagement(
          'investor-1',
          'quarterly_call',
          { duration: 45, topics: ['financial_performance', 'strategy'] }
        )

        expect(result.success).toBe(true)
        expect(mockSupabase.from).toHaveBeenCalledWith('stakeholder_investors')
        expect(mockSupabase.from).toHaveBeenCalledWith('stakeholder_engagement_logs')
      })
    })
  })

  describe('Shareholder Voting Platform', () => {
    describe('submitVote', () => {
      it('should submit a valid vote successfully', async () => {
        // Mock existing vote check (no existing vote)
        mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
          data: null,
          error: null
        })

        // Mock investor verification
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: { id: 'voter-1', shareholding_percentage: 5.5 },
          error: null
        })

        const mockVoteResult = {
          ...mockVoteData,
          id: 'vote-1',
          vote_timestamp: '2024-01-15T10:00:00Z',
          verification_status: 'pending' as const,
          audit_trail: {
            submitted_at: '2024-01-15T10:00:00Z',
            submitted_by: 'test-user-id',
            ip_address: 'masked_for_privacy',
            user_agent: 'masked_for_privacy',
            verification_method: 'digital_signature'
          }
        }

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockVoteResult,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.submitVote(mockVoteData)

        expect(result.success).toBe(true)
        expect(result.data.vote_type).toBe('for')
        expect(result.data.verification_status).toBe('pending')
      })

      it('should prevent duplicate voting', async () => {
        // Mock existing vote found
        mockSupabase.from().select().eq().eq().single.mockResolvedValue({
          data: { id: 'existing-vote' },
          error: null
        })

        const result = await service.submitVote(mockVoteData)

        expect(result.success).toBe(false)
        expect(result.error.code).toBe('CONFLICT')
        expect(result.error.message).toContain('already submitted')
      })

      it('should validate voter exists', async () => {
        // Mock no existing vote
        mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
          data: null,
          error: null
        })

        // Mock investor not found
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: null,
          error: null
        })

        const result = await service.submitVote(mockVoteData)

        expect(result.success).toBe(false)
        expect(result.error.code).toBe('NOT_FOUND')
      })
    })

    describe('getVotingResults', () => {
      it('should calculate voting results correctly', async () => {
        const mockVotes = [
          { vote_type: 'for', shares_voted: 1000 },
          { vote_type: 'for', shares_voted: 500 },
          { vote_type: 'against', shares_voted: 200 },
          { vote_type: 'abstain', shares_voted: 100 }
        ]

        mockSupabase.from().select().eq().eq.mockResolvedValueOnce({
          data: mockVotes,
          error: null
        })

        mockSupabase.from().select().eq.mockResolvedValueOnce({
          data: [{ shareholding_percentage: 10 }],
          error: null
        })

        const result = await service.getVotingResults('proposal-1')

        expect(result.success).toBe(true)
        expect(result.data.votes_for).toBe(2)
        expect(result.data.votes_against).toBe(1)
        expect(result.data.abstentions).toBe(1)
        expect(result.data.shares_for).toBe(1500)
        expect(result.data.shares_against).toBe(200)
        expect(result.data.shares_abstained).toBe(100)
      })
    })
  })

  describe('ESG Reporting Dashboard', () => {
    describe('createESGMetric', () => {
      it('should create ESG metric successfully', async () => {
        const mockMetric = {
          ...mockESGMetricData,
          id: 'esg-1',
          last_updated: '2024-01-15T10:00:00Z'
        }

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockMetric,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.createESGMetric(mockESGMetricData)

        expect(result.success).toBe(true)
        expect(result.data.category).toBe('environmental')
        expect(result.data.metric_name).toBe('Carbon Emissions Reduction')
      })

      it('should validate ESG metric data', async () => {
        const invalidMetric = {
          category: 'invalid' as any,
          metric_name: '',
          value: -1,
          unit: '',
          reporting_period: '',
          data_source: '',
          verification_status: 'invalid' as any
        }

        const result = await service.createESGMetric(invalidMetric)

        expect(result.success).toBe(false)
        expect(result.error.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('getESGDashboard', () => {
      it('should return comprehensive ESG dashboard data', async () => {
        const mockMetrics = [
          { ...mockESGMetricData, id: 'esg-1', value: 25 },
          { ...mockESGMetricData, id: 'esg-2', category: 'social', value: 30 }
        ]

        mockSupabase.from().select().eq().order.mockResolvedValue({
          data: mockMetrics,
          error: null
        })

        const result = await service.getESGDashboard('org-1')

        expect(result.success).toBe(true)
        expect(result.data.metrics).toHaveLength(2)
        expect(result.data.performance_summary).toBeDefined()
        expect(result.data.peer_comparison).toBeDefined()
        expect(result.data.improvement_recommendations).toBeDefined()
        expect(Array.isArray(result.data.improvement_recommendations)).toBe(true)
      })

      it('should filter by category when specified', async () => {
        const mockMetrics = [
          { ...mockESGMetricData, id: 'esg-1', category: 'environmental' }
        ]

        mockSupabase.from().select().eq().order().eq.mockResolvedValue({
          data: mockMetrics,
          error: null
        })

        const result = await service.getESGDashboard('org-1', 'environmental')

        expect(result.success).toBe(true)
        expect(mockSupabase.from().select().eq().order().eq).toHaveBeenCalledWith('category', 'environmental')
      })
    })
  })

  describe('Stakeholder Sentiment Analysis', () => {
    describe('analyzeSentiment', () => {
      it('should analyze sentiment successfully', async () => {
        const mockAnalysis = {
          id: 'sentiment-1',
          source: 'analyst_reports',
          content: mockSentimentData.content,
          sentiment_score: 0.75,
          confidence: 0.85,
          keywords: ['great', 'strong', 'results'],
          stakeholder_type: 'institutional_investor',
          analyzed_at: '2024-01-15T10:00:00Z',
          platform: undefined,
          author: undefined,
          reach: undefined
        }

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockAnalysis,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.analyzeSentiment(
          mockSentimentData.content,
          mockSentimentData.source,
          mockSentimentData.stakeholder_type,
          mockSentimentData.metadata
        )

        expect(result.success).toBe(true)
        expect(result.data.sentiment_score).toBeGreaterThan(0)
        expect(result.data.keywords).toContain('great')
      })

      it('should handle negative sentiment', async () => {
        const negativeContent = 'Poor performance and weak guidance disappointing results'
        
        const mockAnalysis = {
          id: 'sentiment-2',
          source: 'news',
          content: negativeContent,
          sentiment_score: -0.65,
          confidence: 0.80,
          keywords: ['poor', 'weak', 'disappointing'],
          stakeholder_type: 'general_public',
          analyzed_at: '2024-01-15T10:00:00Z'
        }

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockAnalysis,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.analyzeSentiment(
          negativeContent,
          'news',
          'general_public'
        )

        expect(result.success).toBe(true)
        expect(result.data.sentiment_score).toBeLessThan(0)
        expect(result.data.keywords).toContain('poor')
      })
    })

    describe('getSentimentTrends', () => {
      it('should return sentiment trends with analysis', async () => {
        const mockSentiments = [
          {
            id: '1',
            sentiment_score: 0.5,
            analyzed_at: '2024-01-15T10:00:00Z',
            source: 'social_media',
            keywords: ['positive', 'growth']
          },
          {
            id: '2',
            sentiment_score: -0.2,
            analyzed_at: '2024-01-14T10:00:00Z',
            source: 'news',
            keywords: ['concern', 'market']
          }
        ]

        mockSupabase.from().select().eq().gte().lte().mockResolvedValue({
          data: mockSentiments,
          error: null
        })

        const result = await service.getSentimentTrends('org-1', '7d')

        expect(result.success).toBe(true)
        expect(result.data.overall_sentiment).toBeDefined()
        expect(result.data.trend_direction).toMatch(/positive|negative|neutral/)
        expect(result.data.sentiment_by_source).toBeDefined()
        expect(result.data.timeline).toBeInstanceOf(Array)
        expect(result.data.key_themes).toBeInstanceOf(Array)
      })

      it('should handle empty sentiment data', async () => {
        mockSupabase.from().select().eq().gte().lte().mockResolvedValue({
          data: [],
          error: null
        })

        const result = await service.getSentimentTrends('org-1', '7d')

        expect(result.success).toBe(true)
        expect(result.data.overall_sentiment).toBe(0)
        expect(result.data.trend_direction).toBe('neutral')
        expect(result.data.timeline).toHaveLength(0)
      })
    })
  })

  describe('Communication Management', () => {
    describe('createCommunicationTemplate', () => {
      it('should create communication template successfully', async () => {
        const templateData = {
          name: 'Q4 Earnings Report',
          type: 'earnings_report' as const,
          subject: 'Q4 2023 Earnings Results',
          content: 'Dear {investor_name}, Our Q4 results show...',
          variables: ['investor_name', 'quarter', 'year'],
          approval_required: true,
          compliance_reviewed: true,
          target_audience: ['all_investors'],
          channels: ['email', 'portal']
        }

        const mockTemplate = {
          ...templateData,
          id: 'template-1',
          created_by: 'test-user-id',
          last_modified: '2024-01-15T10:00:00Z'
        }

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: mockTemplate,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.createCommunicationTemplate(templateData)

        expect(result.success).toBe(true)
        expect(result.data.name).toBe('Q4 Earnings Report')
        expect(result.data.type).toBe('earnings_report')
        expect(result.data.variables).toContain('investor_name')
      })
    })

    describe('sendCommunication', () => {
      it('should send communication successfully', async () => {
        const mockTemplate = {
          id: 'template-1',
          name: 'Test Template',
          type: 'investor_update',
          content: 'Hello {name}'
        }

        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: mockTemplate,
          error: null
        })

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: {
            id: 'comm-1',
            status: 'sent',
            recipient_count: 50
          },
          error: null
        })

        mockSupabase.from().update().eq.mockResolvedValue({
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.sendCommunication(
          'template-1',
          ['all_investors'],
          ['email', 'portal'],
          { name: 'John Doe' }
        )

        expect(result.success).toBe(true)
        expect(result.data.communication_id).toBe('comm-1')
        expect(result.data.channels_used).toContain('email')
        expect(result.data.recipients_count).toBeGreaterThan(0)
      })

      it('should handle template not found', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({
          data: null,
          error: null
        })

        const result = await service.sendCommunication(
          'invalid-template',
          ['all_investors'],
          ['email']
        )

        expect(result.success).toBe(false)
        expect(result.error.code).toBe('NOT_FOUND')
      })
    })

    describe('getCommunicationMetrics', () => {
      it('should return communication effectiveness metrics', async () => {
        const mockCommunications = [
          {
            id: '1',
            recipient_count: 100,
            delivery_status: {
              email: { sent: 95, failed: 5, pending: 0 }
            },
            channels_used: ['email']
          }
        ]

        mockSupabase.from().select().eq().gte().lte().mockResolvedValue({
          data: mockCommunications,
          error: null
        })

        const result = await service.getCommunicationMetrics('org-1', '30d')

        expect(result.success).toBe(true)
        expect(result.data.total_communications).toBeDefined()
        expect(result.data.avg_delivery_rate).toBeDefined()
        expect(result.data.engagement_rate).toBeDefined()
        expect(result.data.channel_performance).toBeDefined()
      })
    })
  })

  describe('Crisis Communication Monitoring', () => {
    describe('monitorCrisisSituations', () => {
      it('should detect crisis indicators', async () => {
        const mockSentiments = [
          {
            id: '1',
            sentiment_score: -0.8,
            analyzed_at: '2024-01-15T10:00:00Z',
            source: 'social_media'
          },
          {
            id: '2',
            sentiment_score: -0.7,
            analyzed_at: '2024-01-15T09:00:00Z',
            source: 'news'
          }
        ]

        mockSupabase.from().select().eq().gte().order.mockResolvedValue({
          data: mockSentiments,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.monitorCrisisSituations('org-1')

        expect(result.success).toBe(true)
        expect(result.data.crisis_level).toMatch(/low|medium|high|critical/)
        expect(result.data.indicators).toBeInstanceOf(Array)
        expect(result.data.recommended_actions).toBeInstanceOf(Array)
        expect(result.data.communication_templates).toBeInstanceOf(Array)
      })

      it('should return low crisis level for positive sentiment', async () => {
        const mockSentiments = [
          {
            id: '1',
            sentiment_score: 0.5,
            analyzed_at: '2024-01-15T10:00:00Z',
            source: 'social_media'
          }
        ]

        mockSupabase.from().select().eq().gte().order.mockResolvedValue({
          data: mockSentiments,
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.monitorCrisisSituations('org-1')

        expect(result.success).toBe(true)
        expect(result.data.crisis_level).toBe('low')
        expect(result.data.indicators).toHaveLength(0)
      })
    })
  })

  describe('Regulatory Compliance', () => {
    describe('trackDisclosureCompliance', () => {
      it('should track compliance for upcoming deadline', async () => {
        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        
        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: {
            id: 'disclosure-1',
            compliance_status: 'compliant'
          },
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.trackDisclosureCompliance(
          'org-1',
          '10-K Annual Report',
          futureDate,
          'Annual report content...'
        )

        expect(result.success).toBe(true)
        expect(result.data.disclosure_id).toBe('disclosure-1')
        expect(result.data.compliance_status).toBe('compliant')
        expect(result.data.next_action).toContain('preparation')
      })

      it('should flag overdue disclosures', async () => {
        const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        
        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: {
            id: 'disclosure-2',
            compliance_status: 'overdue'
          },
          error: null
        })

        mockSupabase.from().insert.mockResolvedValue({
          error: null
        })

        const result = await service.trackDisclosureCompliance(
          'org-1',
          'Quarterly Report',
          pastDate,
          'Quarterly report content...'
        )

        expect(result.success).toBe(true)
        expect(result.data.compliance_status).toBe('overdue')
        expect(result.data.next_action).toContain('immediately')
        expect(result.data.stakeholder_notification_sent).toBe(true)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication failures', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Authentication failed' }
      })

      const { id, created_at, updated_at, last_engagement, interaction_history, ...investorInput } = mockInvestorData
      const result = await service.createInvestor(investorInput)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle database connection errors', async () => {
      const { id, created_at, updated_at, last_engagement, interaction_history, ...investorInput } = mockInvestorData
      
      mockSupabase.from().insert().select().single.mockRejectedValue(new Error('Connection failed'))

      const result = await service.createInvestor(investorInput)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle timeout errors', async () => {
      const { id, created_at, updated_at, last_engagement, interaction_history, ...investorInput } = mockInvestorData
      
      mockSupabase.from().insert().select().single.mockRejectedValue(new Error('Request timeout'))

      const result = await service.createInvestor(investorInput)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const largeSentimentDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `sentiment-${i}`,
        sentiment_score: (Math.random() - 0.5) * 2,
        analyzed_at: new Date(Date.now() - i * 60 * 1000).toISOString(),
        source: 'social_media',
        keywords: [`keyword-${i}`]
      }))

      mockSupabase.from().select().eq().gte().lte().mockResolvedValue({
        data: largeSentimentDataset,
        error: null
      })

      const startTime = Date.now()
      const result = await service.getSentimentTrends('org-1', '30d')
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(result.data.timeline).toBeDefined()
      expect(result.data.key_themes).toHaveLength(10) // Should limit to top 10 themes
    })

    it('should handle concurrent operations', async () => {
      const concurrentOperations = [
        service.getSentimentTrends('org-1'),
        service.getESGDashboard('org-1'),
        service.getCommunicationMetrics('org-1'),
        service.monitorCrisisSituations('org-1')
      ]

      // Mock responses for all operations
      mockSupabase.from().select().eq().gte().lte().mockResolvedValue({
        data: [],
        error: null
      })

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: [],
        error: null
      })

      mockSupabase.from().insert.mockResolvedValue({
        error: null
      })

      const results = await Promise.all(concurrentOperations)

      results.forEach(result => {
        expect(result.success).toBe(true)
      })
    })
  })
})