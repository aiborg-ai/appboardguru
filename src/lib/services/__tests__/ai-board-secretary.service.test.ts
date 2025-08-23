/**
 * AI Board Secretary Service Tests
 * Comprehensive test suite for the AI Board Secretary service
 */

import { AIBoardSecretaryService } from '../ai-board-secretary.service'
import { createClient } from '@supabase/supabase-js'
import { success, failure, RepositoryError } from '../../repositories/result'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  }))
} as any

// Mock fetch for OpenRouter API calls
global.fetch = jest.fn()

describe('AIBoardSecretaryService', () => {
  let service: AIBoardSecretaryService
  let mockUser: any

  beforeEach(() => {
    service = new AIBoardSecretaryService(mockSupabaseClient)
    mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    }

    // Reset all mocks
    jest.clearAllMocks()
    
    // Default user authentication mock
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
  })

  describe('Meeting Management', () => {
    describe('createMeeting', () => {
      const validMeetingData = {
        board_id: 'board-123',
        meeting_title: 'Quarterly Review',
        meeting_type: 'regular' as const,
        scheduled_date: '2024-02-15T14:00:00Z',
        location: 'Conference Room A',
        is_virtual: false
      }

      it('should create a meeting successfully', async () => {
        const mockMeeting = {
          id: 'meeting-123',
          ...validMeetingData,
          created_by: mockUser.id,
          status: 'scheduled'
        }

        const mockQuery = mockSupabaseClient.from().insert().select().single
        mockQuery.mockResolvedValue({
          data: mockMeeting,
          error: null
        })

        const result = await service.createMeeting(validMeetingData)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockMeeting)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('board_meetings')
      })

      it('should reject invalid meeting data', async () => {
        const invalidData = {
          board_id: 'invalid-uuid',
          meeting_title: '',
          scheduled_date: 'invalid-date'
        }

        const result = await service.createMeeting(invalidData as any)

        expect(result.success).toBe(false)
        expect(result.error).toBeInstanceOf(RepositoryError)
      })

      it('should handle database errors', async () => {
        const mockQuery = mockSupabaseClient.from().insert().select().single
        mockQuery.mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: '23505' }
        })

        const result = await service.createMeeting(validMeetingData)

        expect(result.success).toBe(false)
        expect(result.error).toBeInstanceOf(RepositoryError)
      })
    })

    describe('getMeetings', () => {
      it('should get meetings with filters', async () => {
        const mockMeetings = [
          { id: 'meeting-1', meeting_title: 'Meeting 1', status: 'scheduled' },
          { id: 'meeting-2', meeting_title: 'Meeting 2', status: 'completed' }
        ]

        const mockQuery = mockSupabaseClient.from().select().eq().order().range
        mockQuery.mockResolvedValue({
          data: mockMeetings,
          error: null,
          count: 2
        })

        const result = await service.getMeetings('board-123', {
          status: 'scheduled',
          page: 1,
          limit: 10
        })

        expect(result.success).toBe(true)
        expect(result.data.meetings).toEqual(mockMeetings)
        expect(result.data.total).toBe(2)
      })
    })
  })

  describe('Transcription Processing', () => {
    describe('requestTranscription', () => {
      const validTranscriptionData = {
        meeting_id: 'meeting-123',
        audio_file_url: 'https://example.com/audio.mp3',
        language: 'en'
      }

      it('should request transcription successfully', async () => {
        const mockTranscription = {
          id: 'transcription-123',
          ...validTranscriptionData,
          processing_status: 'queued'
        }

        const mockQuery = mockSupabaseClient.from().insert().select().single
        mockQuery.mockResolvedValue({
          data: mockTranscription,
          error: null
        })

        const result = await service.requestTranscription(validTranscriptionData)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockTranscription)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('meeting_transcriptions')
      })

      it('should reject request without audio or video URL', async () => {
        const invalidData = {
          meeting_id: 'meeting-123',
          language: 'en'
        }

        const result = await service.requestTranscription(invalidData as any)

        expect(result.success).toBe(false)
        expect(result.error.message).toContain('Either audio_file_url or video_file_url is required')
      })
    })
  })

  describe('Meeting Minutes Generation', () => {
    describe('generateMeetingMinutes', () => {
      const meetingId = 'meeting-123'
      const transcriptionId = 'transcription-123'

      beforeEach(() => {
        // Mock OpenRouter API response
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  content: { call_to_order: 'Meeting called to order at 2:00 PM' },
                  attendees: [{ name: 'John Doe', role: 'Chairman', present: true }],
                  absentees: [],
                  decisions: [],
                  voting_records: [],
                  resolutions: []
                })
              }
            }],
            usage: { prompt_tokens: 100, completion_tokens: 200 }
          })
        })
      })

      it('should generate meeting minutes successfully', async () => {
        // Mock transcription data
        const mockTranscription = {
          id: transcriptionId,
          meeting_id: meetingId,
          transcription_text: 'Meeting transcript content...',
          speakers: [{ id: 'speaker1', name: 'John Doe', segments: [] }]
        }

        const mockMeeting = {
          id: meetingId,
          meeting_title: 'Board Meeting',
          scheduled_date: '2024-02-15T14:00:00Z'
        }

        const mockMinutes = {
          id: 'minutes-123',
          meeting_id: meetingId,
          title: 'Minutes - Board Meeting',
          ai_generated: true
        }

        // Mock database calls
        mockSupabaseClient.from().select().eq().single
          .mockResolvedValueOnce({ data: mockTranscription, error: null })
          .mockResolvedValueOnce({ data: mockMeeting, error: null })

        mockSupabaseClient.from().insert().select().single
          .mockResolvedValue({ data: mockMinutes, error: null })

        const result = await service.generateMeetingMinutes(meetingId, transcriptionId)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockMinutes)
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('openrouter.ai'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer'),
              'Content-Type': 'application/json'
            })
          })
        )
      })

      it('should handle missing transcription', async () => {
        mockSupabaseClient.from().select().eq().single
          .mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

        const result = await service.generateMeetingMinutes(meetingId, transcriptionId)

        expect(result.success).toBe(false)
        expect(result.error.message).toContain('Transcription not found')
      })
    })
  })

  describe('Action Items Management', () => {
    describe('extractActionItems', () => {
      const meetingId = 'meeting-123'
      const transcriptionText = 'John needs to review the budget by next Friday. Sarah will prepare the quarterly report.'

      beforeEach(() => {
        // Mock OpenRouter API response
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify([
                  {
                    title: 'Review budget',
                    description: 'John needs to review the quarterly budget proposal',
                    priority: 'medium',
                    confidence_score: 0.95,
                    context_reference: 'John needs to review the budget by next Friday',
                    tags: ['budget', 'finance']
                  }
                ])
              }
            }],
            usage: { prompt_tokens: 150, completion_tokens: 100 }
          })
        })
      })

      it('should extract action items successfully', async () => {
        const mockActionItem = {
          id: 'action-123',
          meeting_id: meetingId,
          title: 'Review budget',
          ai_extracted: true,
          created_by: mockUser.id
        }

        mockSupabaseClient.from().insert().select().single
          .mockResolvedValue({ data: mockActionItem, error: null })

        const result = await service.extractActionItems(meetingId, transcriptionText)

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(1)
        expect(result.data[0]).toEqual(mockActionItem)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('action_items')
      })
    })

    describe('createActionItem', () => {
      const validActionItemData = {
        title: 'Review quarterly report',
        description: 'Review Q4 financial report and provide feedback',
        priority: 'high' as const,
        due_date: '2024-02-20T17:00:00Z',
        tags: ['finance', 'quarterly-review']
      }

      it('should create action item successfully', async () => {
        const mockActionItem = {
          id: 'action-123',
          ...validActionItemData,
          ai_extracted: false,
          created_by: mockUser.id
        }

        const mockQuery = mockSupabaseClient.from().insert().select().single
        mockQuery.mockResolvedValue({
          data: mockActionItem,
          error: null
        })

        const result = await service.createActionItem(validActionItemData)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockActionItem)
      })
    })

    describe('updateActionItemProgress', () => {
      const actionItemId = 'action-123'

      it('should update action item progress', async () => {
        const mockUpdatedItem = {
          id: actionItemId,
          completion_percentage: 75,
          status: 'in_progress',
          progress_notes: [
            {
              note: 'Made good progress on the review',
              added_by: mockUser.id,
              added_at: expect.any(String)
            }
          ]
        }

        // Mock getting current item
        mockSupabaseClient.from().select().eq().single
          .mockResolvedValue({
            data: { progress_notes: [] },
            error: null
          })

        // Mock update
        mockSupabaseClient.from().update().eq().select().single
          .mockResolvedValue({
            data: mockUpdatedItem,
            error: null
          })

        const result = await service.updateActionItemProgress(actionItemId, {
          completion_percentage: 75,
          progress_notes: 'Made good progress on the review'
        })

        expect(result.success).toBe(true)
        expect(result.data.completion_percentage).toBe(75)
      })
    })
  })

  describe('Compliance Management', () => {
    describe('createComplianceRequirement', () => {
      const validComplianceData = {
        board_id: 'board-123',
        requirement_name: 'Annual Filing',
        requirement_type: 'filing' as const,
        description: 'Submit annual corporate filing',
        frequency: 'annually' as const,
        next_due_date: '2024-12-31T23:59:59Z',
        is_mandatory: true
      }

      it('should create compliance requirement successfully', async () => {
        const mockRequirement = {
          id: 'compliance-123',
          ...validComplianceData,
          created_by: mockUser.id
        }

        const mockQuery = mockSupabaseClient.from().insert().select().single
        mockQuery.mockResolvedValue({
          data: mockRequirement,
          error: null
        })

        const result = await service.createComplianceRequirement(validComplianceData)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockRequirement)
      })
    })

    describe('checkComplianceAlerts', () => {
      const boardId = 'board-123'

      it('should generate compliance alerts for upcoming deadlines', async () => {
        const mockRequirements = [
          {
            id: 'req-1',
            requirement_name: 'Quarterly Report',
            next_due_date: '2024-02-20T23:59:59Z', // 5 days from now
            days_notice_required: 7,
            ai_monitored: true
          }
        ]

        // Mock getting requirements
        mockSupabaseClient.from().select().eq().eq()
          .mockResolvedValue({
            data: mockRequirements,
            error: null
          })

        // Mock checking for existing alerts
        mockSupabaseClient.from().select().eq().eq().gte().single
          .mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })

        // Mock creating alert
        const mockAlert = {
          id: 'alert-123',
          compliance_requirement_id: 'req-1',
          alert_type: 'upcoming_deadline',
          severity: 'medium'
        }

        mockSupabaseClient.from().insert().select().single
          .mockResolvedValue({
            data: mockAlert,
            error: null
          })

        const result = await service.checkComplianceAlerts(boardId)

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(1)
        expect(result.data[0]).toEqual(mockAlert)
      })
    })
  })

  describe('Smart Agenda Generation', () => {
    describe('generateSmartAgenda', () => {
      const meetingId = 'meeting-123'

      beforeEach(() => {
        // Mock OpenRouter API response
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  agenda_items: [
                    {
                      id: '1',
                      title: 'Call to Order',
                      description: 'Meeting called to order by the Chairman',
                      time_allocation: 5,
                      order: 1,
                      type: 'information'
                    }
                  ],
                  time_allocations: {
                    total_meeting_time: 120,
                    buffer_time: 15
                  }
                })
              }
            }],
            usage: { prompt_tokens: 200, completion_tokens: 150 }
          })
        })
      })

      it('should generate smart agenda successfully', async () => {
        const mockMeeting = {
          id: meetingId,
          board_id: 'board-123',
          meeting_title: 'Board Meeting',
          scheduled_date: '2024-02-15T14:00:00Z'
        }

        const mockAgenda = {
          id: 'agenda-123',
          meeting_id: meetingId,
          title: 'Agenda - Board Meeting',
          ai_generated: true
        }

        // Mock database calls
        mockSupabaseClient.from().select().eq().single
          .mockResolvedValue({ data: mockMeeting, error: null })

        mockSupabaseClient.from().select().eq().lt().order().limit
          .mockResolvedValue({ data: [], error: null })

        mockSupabaseClient.from().select().in().order().limit
          .mockResolvedValue({ data: [], error: null })

        mockSupabaseClient.from().insert().select().single
          .mockResolvedValue({ data: mockAgenda, error: null })

        const result = await service.generateSmartAgenda(meetingId)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockAgenda)
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('openrouter.ai'),
          expect.objectContaining({
            method: 'POST'
          })
        )
      })
    })
  })

  describe('Secretary Settings', () => {
    describe('updateSecretarySettings', () => {
      const boardId = 'board-123'
      const settings = {
        ai_transcription_enabled: true,
        auto_agenda_generation: false,
        language_preference: 'en'
      }

      it('should update secretary settings successfully', async () => {
        const mockSettings = {
          id: 'settings-123',
          board_id: boardId,
          ...settings
        }

        const mockQuery = mockSupabaseClient.from().upsert().select().single
        mockQuery.mockResolvedValue({
          data: mockSettings,
          error: null
        })

        const result = await service.updateSecretarySettings(boardId, settings)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockSettings)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('board_secretary_settings')
      })
    })

    describe('getSecretarySettings', () => {
      const boardId = 'board-123'

      it('should return existing settings', async () => {
        const mockSettings = {
          board_id: boardId,
          ai_transcription_enabled: true,
          auto_agenda_generation: true
        }

        const mockQuery = mockSupabaseClient.from().select().eq().single
        mockQuery.mockResolvedValue({
          data: mockSettings,
          error: null
        })

        const result = await service.getSecretarySettings(boardId)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockSettings)
      })

      it('should return default settings if none exist', async () => {
        const mockQuery = mockSupabaseClient.from().select().eq().single
        mockQuery.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })

        const result = await service.getSecretarySettings(boardId)

        expect(result.success).toBe(true)
        expect(result.data).toMatchObject({
          board_id: boardId,
          ai_transcription_enabled: true,
          auto_agenda_generation: true
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' }
      })

      const result = await service.createMeeting({
        board_id: 'board-123',
        meeting_title: 'Test Meeting',
        scheduled_date: '2024-02-15T14:00:00Z'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(RepositoryError)
    })

    it('should handle OpenRouter API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'API key invalid' })
      })

      const result = await service.extractActionItems('meeting-123', 'test transcript')

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('AI processing failed')
    })

    it('should handle network timeouts', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'))

      const result = await service.extractActionItems('meeting-123', 'test transcript')

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(RepositoryError)
    })
  })
})