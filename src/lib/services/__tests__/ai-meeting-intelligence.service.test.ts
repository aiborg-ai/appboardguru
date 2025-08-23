/**
 * AI Meeting Intelligence Service Tests
 * 
 * Comprehensive test coverage for AI meeting intelligence service
 * Tests service logic, AI integration, and business workflows
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { AIMeetingIntelligenceService } from '../ai-meeting-intelligence.service'
import { AIMeetingTranscriptionRepository } from '../../repositories/ai-meeting-transcription.repository'
import { AIMeetingInsightsRepository } from '../../repositories/ai-meeting-insights.repository'
import { createSupabaseClient } from '../../supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../types/database'
import type {
  MeetingTranscriptionId,
  OrganizationId,
  MeetingId,
  UserId
} from '../../../types/branded'

// ==== Test Setup ====

// Mock dependencies
vi.mock('../../supabase-client')
vi.mock('../../repositories/ai-meeting-transcription.repository')
vi.mock('../../repositories/ai-meeting-insights.repository')

// Mock fetch for AI API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock environment variables
vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
} as unknown as SupabaseClient<Database>

const createMockSupabaseClient = createSupabaseClient as MockedFunction<typeof createSupabaseClient>
createMockSupabaseClient.mockReturnValue(mockSupabaseClient)

// Test data
const mockUserId = 'user-123' as UserId
const mockOrganizationId = 'org-123' as OrganizationId
const mockMeetingId = 'meeting-123' as MeetingId
const mockTranscriptionId = 'trans-123' as MeetingTranscriptionId

const mockUser = {
  id: mockUserId,
  email: 'test@example.com'
}

const mockTranscription = {
  id: mockTranscriptionId,
  meetingId: mockMeetingId,
  organizationId: mockOrganizationId,
  title: 'Test Meeting',
  status: 'initializing' as const,
  audioConfig: {
    sampleRate: 44100,
    channels: 2,
    bitDepth: 16,
    format: 'wav' as const,
    noiseReduction: true,
    echoCancellation: true,
    autoGainControl: true
  },
  segments: [],
  speakers: [],
  metadata: {},
  createdBy: mockUserId,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

const mockSegment = {
  id: 'segment-123',
  transcriptionId: mockTranscriptionId,
  text: 'This is a test segment about budget approval',
  originalAudioHash: 'hash123',
  startTime: 1000,
  endTime: 2000,
  speakerId: 'speaker-123',
  confidence: 0.95,
  language: 'en',
  translations: {},
  sentiment: {
    polarity: 0.2,
    magnitude: 0.5,
    category: 'positive' as const,
    confidence: 0.8
  },
  topics: ['budget'],
  actionItems: ['Approve budget increase'],
  decisions: ['Budget approved'],
  keywords: ['budget', 'approval'],
  processing: {
    transcribed: true,
    speakerIdentified: true,
    sentimentAnalyzed: true,
    topicExtracted: true,
    actionItemsExtracted: true,
    decisionsExtracted: true
  },
  createdAt: '2024-01-01T00:00:00Z'
}

// ==== Test Suite ====

describe('AIMeetingIntelligenceService', () => {
  let service: AIMeetingIntelligenceService
  let mockTranscriptionRepo: AIMeetingTranscriptionRepository
  let mockInsightsRepo: AIMeetingInsightsRepository

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock repositories
    mockTranscriptionRepo = new AIMeetingTranscriptionRepository(mockSupabaseClient)
    mockInsightsRepo = new AIMeetingInsightsRepository(mockSupabaseClient)
    
    service = new AIMeetingIntelligenceService(mockSupabaseClient)
    
    // Replace repositories with mocks
    service['transcriptionRepository'] = mockTranscriptionRepo as any
    service['insightsRepository'] = mockInsightsRepo as any

    // Mock auth
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ==== Start Transcription Tests ====

  describe('startTranscription', () => {
    const startRequest = {
      meetingId: mockMeetingId,
      organizationId: mockOrganizationId,
      title: 'Test Meeting',
      participants: [
        { name: 'John Doe', email: 'john@example.com', role: 'Chair' },
        { name: 'Jane Smith', email: 'jane@example.com', role: 'Member' }
      ],
      createdBy: mockUserId
    }

    it('should start transcription successfully', async () => {
      // Mock repository methods
      const mockCreateTranscription = vi.fn().mockResolvedValue({
        success: true,
        data: mockTranscription
      })
      const mockAddSpeaker = vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'speaker-123',
          transcriptionId: mockTranscriptionId,
          name: 'John Doe',
          confidence: 0.5
        }
      })

      mockTranscriptionRepo.createTranscription = mockCreateTranscription
      mockTranscriptionRepo.addSpeaker = mockAddSpeaker

      const result = await service.startTranscription(startRequest)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.transcription.id).toBe(mockTranscriptionId)
        expect(result.data.sessionId).toMatch(/^meeting_/)
        expect(result.data.transcription.speakers).toHaveLength(2)
      }

      expect(mockCreateTranscription).toHaveBeenCalledWith({
        meetingId: mockMeetingId,
        organizationId: mockOrganizationId,
        title: 'Test Meeting',
        audioConfig: undefined,
        createdBy: mockUserId
      })

      expect(mockAddSpeaker).toHaveBeenCalledTimes(2)
    })

    it('should handle permission check failure', async () => {
      // Mock unauthorized user
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' }
      })

      const result = await service.startTranscription(startRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Authentication required')
      }
    })

    it('should handle transcription creation failure', async () => {
      const mockCreateTranscription = vi.fn().mockResolvedValue({
        success: false,
        error: { message: 'Database error' }
      })

      mockTranscriptionRepo.createTranscription = mockCreateTranscription

      const result = await service.startTranscription(startRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create transcription')
      }
    })

    it('should continue even if some speakers fail to create', async () => {
      const mockCreateTranscription = vi.fn().mockResolvedValue({
        success: true,
        data: mockTranscription
      })

      // First speaker succeeds, second fails
      const mockAddSpeaker = vi.fn()
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'speaker-1', name: 'John Doe' }
        })
        .mockResolvedValueOnce({
          success: false,
          error: { message: 'Speaker creation failed' }
        })

      mockTranscriptionRepo.createTranscription = mockCreateTranscription
      mockTranscriptionRepo.addSpeaker = mockAddSpeaker

      const result = await service.startTranscription(startRequest)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.transcription.speakers).toHaveLength(1)
      }
    })
  })

  // ==== Process Segment Tests ====

  describe('processSegment', () => {
    const processRequest = {
      transcriptionId: mockTranscriptionId,
      text: 'We need to approve the budget increase for Q4',
      startTime: 1000,
      endTime: 3000,
      confidence: 0.95
    }

    beforeEach(() => {
      // Mock AI API responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: '["Approve budget increase for Q4"]'
            }
          }]
        })
      })
    })

    it('should process segment with AI analysis', async () => {
      const mockAddSegment = vi.fn().mockResolvedValue({
        success: true,
        data: mockSegment
      })

      mockTranscriptionRepo.addSegment = mockAddSegment

      const result = await service.processSegment(processRequest)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.segment.text).toBe(processRequest.text)
        expect(result.data.actionItems).toContain('Approve budget increase for Q4')
      }

      expect(mockAddSegment).toHaveBeenCalledWith({
        transcriptionId: mockTranscriptionId,
        text: processRequest.text,
        startTime: processRequest.startTime,
        endTime: processRequest.endTime,
        speakerId: undefined,
        confidence: processRequest.confidence,
        language: undefined
      })
    })

    it('should handle AI API failure gracefully', async () => {
      // Mock AI API failure
      mockFetch.mockRejectedValue(new Error('API Error'))

      const mockAddSegment = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockSegment, actionItems: [], decisions: [], sentiment: undefined }
      })

      mockTranscriptionRepo.addSegment = mockAddSegment

      const result = await service.processSegment(processRequest)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.segment.text).toBe(processRequest.text)
        expect(result.data.actionItems).toEqual([])
        expect(result.data.decisions).toEqual([])
      }
    })

    it('should handle segment creation failure', async () => {
      const mockAddSegment = vi.fn().mockResolvedValue({
        success: false,
        error: { message: 'Database error' }
      })

      mockTranscriptionRepo.addSegment = mockAddSegment

      const result = await service.processSegment(processRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create segment')
      }
    })
  })

  // ==== Complete Transcription Tests ====

  describe('completeTranscription', () => {
    beforeEach(() => {
      // Mock AI API for summary generation
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                executiveSummary: 'Meeting discussed budget approval',
                keyTopics: [{ topic: 'Budget', category: 'financial', timeSpent: 15 }],
                majorDecisions: [{ title: 'Budget Approval', description: 'Approved Q4 budget increase' }],
                actionItemsSummary: { total: 2, byPriority: { high: 1, medium: 1 } },
                participantInsights: [{ name: 'John Doe', participationScore: 85 }],
                meetingEffectiveness: { overall: 82 },
                complianceFlags: [],
                followUpRecommendations: [],
                confidence: 0.88
              })
            }
          }]
        })
      })
    })

    it('should complete transcription with full analysis', async () => {
      // Mock repository methods
      const mockUpdateTranscription = vi.fn()
        .mockResolvedValueOnce({ success: true, data: { ...mockTranscription, status: 'analyzing' } })
        .mockResolvedValueOnce({ success: true, data: { ...mockTranscription, status: 'completed' } })
      
      const mockFindSegmentsByTranscriptionId = vi.fn().mockResolvedValue({
        success: true,
        data: { data: [mockSegment] }
      })

      const mockCreateSummary = vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'summary-123',
          executiveSummary: 'Meeting discussed budget approval',
          confidence: 0.88
        }
      })

      const mockCreateMeetingInsights = vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'insights-123',
          effectivenessScore: { overall: 82 },
          engagementMetrics: { averageEngagement: 75 },
          productivityMetrics: { decisionsPerHour: 2.5 }
        }
      })

      const mockCreateActionItem = vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'action-123',
          processedDescription: 'Approve budget increase',
          priority: { level: 'high' },
          status: 'extracted'
        }
      })

      mockTranscriptionRepo.updateTranscription = mockUpdateTranscription
      mockTranscriptionRepo.findSegmentsByTranscriptionId = mockFindSegmentsByTranscriptionId
      mockInsightsRepo.createSummary = mockCreateSummary
      mockInsightsRepo.createMeetingInsights = mockCreateMeetingInsights
      mockInsightsRepo.createActionItem = mockCreateActionItem

      const result = await service.completeTranscription(mockTranscriptionId, mockUserId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.transcription.status).toBeDefined()
        expect(result.data.summary).toBeDefined()
        expect(result.data.insights).toBeDefined()
        expect(result.data.actionItems).toHaveLength(1)
      }

      expect(mockUpdateTranscription).toHaveBeenCalledTimes(2)
      expect(mockCreateSummary).toHaveBeenCalled()
      expect(mockCreateMeetingInsights).toHaveBeenCalled()
    })

    it('should handle segments fetch failure', async () => {
      const mockUpdateTranscription = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockTranscription, status: 'analyzing' }
      })

      const mockFindSegmentsByTranscriptionId = vi.fn().mockResolvedValue({
        success: false,
        error: { message: 'Segments not found' }
      })

      mockTranscriptionRepo.updateTranscription = mockUpdateTranscription
      mockTranscriptionRepo.findSegmentsByTranscriptionId = mockFindSegmentsByTranscriptionId

      const result = await service.completeTranscription(mockTranscriptionId, mockUserId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Failed to get segments')
      }
    })
  })

  // ==== AI Analysis Methods Tests ====

  describe('AI Analysis Methods', () => {
    describe('extractActionItems', () => {
      it('should extract action items from text', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: '["Prepare quarterly report", "Schedule follow-up meeting"]'
              }
            }]
          })
        })

        const result = await service['extractActionItems']('We need to prepare the quarterly report and schedule a follow-up meeting')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toHaveLength(2)
          expect(result.data).toContain('Prepare quarterly report')
          expect(result.data).toContain('Schedule follow-up meeting')
        }
      })

      it('should handle AI API failure', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500
        })

        const result = await service['extractActionItems']('Some text')

        expect(result.success).toBe(false)
      })

      it('should handle invalid JSON response', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: 'Invalid JSON response'
              }
            }]
          })
        })

        const result = await service['extractActionItems']('Some text')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual([])
        }
      })
    })

    describe('analyzeSentiment', () => {
      it('should analyze sentiment correctly', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: '{"polarity": 0.6, "magnitude": 0.8, "category": "positive"}'
              }
            }]
          })
        })

        const result = await service['analyzeSentiment']('This is a great meeting!')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.polarity).toBe(0.6)
          expect(result.data.magnitude).toBe(0.8)
          expect(result.data.category).toBe('positive')
        }
      })

      it('should provide fallback values for invalid response', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: 'Invalid response'
              }
            }]
          })
        })

        const result = await service['analyzeSentiment']('Some text')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.polarity).toBe(0)
          expect(result.data.magnitude).toBe(0)
          expect(result.data.category).toBe('neutral')
          expect(result.data.confidence).toBe(0.5)
        }
      })
    })
  })

  // ==== Analytics Generation Tests ====

  describe('generateAnalytics', () => {
    const analyticsRequest = {
      organizationId: mockOrganizationId,
      dateRange: {
        start: '2024-01-01T00:00:00Z' as any,
        end: '2024-01-31T23:59:59Z' as any
      }
    }

    it('should generate comprehensive analytics', async () => {
      const mockGetOrganizationStatistics = vi.fn().mockResolvedValue({
        success: true,
        data: {
          totalTranscriptions: 10,
          completedTranscriptions: 8,
          totalMeetingHours: 25.5,
          averageParticipants: 4.2,
          topLanguages: [{ language: 'en', count: 15 }]
        }
      })

      const mockGetEffectivenessTrends = vi.fn().mockResolvedValue({
        success: true,
        data: {
          averageEffectiveness: 78.5,
          trendDirection: 'improving' as const,
          dataPoints: []
        }
      })

      mockTranscriptionRepo.getOrganizationStatistics = mockGetOrganizationStatistics
      mockInsightsRepo.getEffectivenessTrends = mockGetEffectivenessTrends

      const result = await service.generateAnalytics(analyticsRequest)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.summary.totalMeetings).toBe(10)
        expect(result.data.summary.averageEffectiveness).toBe(78.5)
        expect(result.data.trends.effectivenessTrend).toBe('improving')
        expect(result.data.recommendations).toBeInstanceOf(Array)
      }
    })

    it('should handle statistics fetch failure', async () => {
      const mockGetOrganizationStatistics = vi.fn().mockResolvedValue({
        success: false,
        error: { message: 'Database error' }
      })

      mockTranscriptionRepo.getOrganizationStatistics = mockGetOrganizationStatistics

      const result = await service.generateAnalytics(analyticsRequest)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Failed to get statistics')
      }
    })
  })

  // ==== Configuration and Environment Tests ====

  describe('Configuration', () => {
    it('should handle missing API key', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', '')
      
      const result = await service['callAIModel']('test prompt', 'analysis')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('API key not configured')
      }
    })

    it('should use correct model configuration', () => {
      expect(service['aiConfig'].models.transcription).toBe('openai/whisper-large-v3')
      expect(service['aiConfig'].models.analysis).toBe('anthropic/claude-3-5-sonnet')
      expect(service['aiConfig'].models.sentiment).toBe('openai/gpt-4-turbo')
    })
  })

  // ==== Performance and Edge Cases ====

  describe('Performance and Edge Cases', () => {
    it('should handle empty segments array', async () => {
      const mockFindSegmentsByTranscriptionId = vi.fn().mockResolvedValue({
        success: true,
        data: { data: [] }
      })

      mockTranscriptionRepo.findSegmentsByTranscriptionId = mockFindSegmentsByTranscriptionId

      const result = await service['generateActionItems'](mockTranscriptionId, [])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })

    it('should batch process large segment arrays', async () => {
      const largeSegmentArray = Array(25).fill(mockSegment) // 25 segments
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: { content: '["Action item"]' }
          }]
        })
      })

      const mockCreateActionItem = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'action-123' }
      })

      mockInsightsRepo.createActionItem = mockCreateActionItem

      const result = await service['generateActionItems'](mockTranscriptionId, largeSegmentArray)

      expect(result.success).toBe(true)
      // Should process in batches of 10, so 3 batches for 25 segments
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle concurrent analysis requests', async () => {
      const promises = [
        service['extractActionItems']('Text 1'),
        service['extractDecisions']('Text 2'),
        service['analyzeSentiment']('Text 3')
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '[]' } }]
        })
      })

      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result.success).toBe(true)
      })
    })
  })
})