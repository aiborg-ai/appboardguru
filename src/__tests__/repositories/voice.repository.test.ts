import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { VoiceRepository, CreateVoiceSessionData, VoiceSession } from '../../lib/repositories/voice.repository'
import { SupabaseClient } from '@supabase/supabase-js'
import { success, failure } from '../../lib/repositories/result'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          limit: vi.fn()
        }))
      })),
      or: vi.fn(() => ({
        order: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn()
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  })),
  sql: vi.fn()
} as unknown as SupabaseClient

describe('VoiceRepository', () => {
  let repository: VoiceRepository
  let mockFrom: Mock
  let mockInsert: Mock
  let mockSelect: Mock
  let mockUpdate: Mock
  let mockEq: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new VoiceRepository(mockSupabaseClient)
    
    mockFrom = mockSupabaseClient.from as Mock
    mockInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
    mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          limit: vi.fn()
        }))
      })),
      or: vi.fn(() => ({
        order: vi.fn()
      }))
    }))
    mockUpdate = vi.fn(() => ({
      eq: vi.fn()
    }))
    mockEq = vi.fn()

    mockFrom.mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: vi.fn(() => ({ eq: mockEq }))
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createSession', () => {
    it('should create a voice session successfully', async () => {
      const sessionData: CreateVoiceSessionData = {
        host_user_id: 'user123',
        name: 'Test Session',
        description: 'A test session',
        collaboration_type: 'brainstorming',
        spatial_audio_config: {
          enabled: true,
          room_size: 'medium',
          acoustics: 'conference'
        },
        permissions: {
          allow_screen_share: true,
          allow_file_share: true,
          allow_recording: false,
          participant_limit: 10
        }
      }

      const expectedSession: Partial<VoiceSession> = {
        host_user_id: 'user123',
        name: 'Test Session',
        description: 'A test session',
        collaboration_type: 'brainstorming',
        status: 'scheduled',
        participants: []
      }

      mockInsert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: expectedSession,
            error: null
          })
        }))
      })

      const result = await repository.createSession(sessionData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        host_user_id: 'user123',
        name: 'Test Session',
        status: 'scheduled'
      })
      expect(mockFrom).toHaveBeenCalledWith('voice_sessions')
    })

    it('should handle database errors when creating session', async () => {
      const sessionData: CreateVoiceSessionData = {
        host_user_id: 'user123',
        name: 'Test Session',
        collaboration_type: 'brainstorming',
        spatial_audio_config: {
          enabled: false,
          room_size: 'small',
          acoustics: 'studio'
        },
        permissions: {
          allow_screen_share: false,
          allow_file_share: false,
          allow_recording: false,
          participant_limit: 5
        }
      }

      const dbError = new Error('Database connection failed')
      mockInsert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: dbError
          })
        }))
      })

      const result = await repository.createSession(sessionData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should generate unique session IDs', async () => {
      const sessionData: CreateVoiceSessionData = {
        host_user_id: 'user123',
        name: 'Test Session',
        collaboration_type: 'discussion',
        spatial_audio_config: {
          enabled: true,
          room_size: 'large',
          acoustics: 'open_space'
        },
        permissions: {
          allow_screen_share: true,
          allow_file_share: true,
          allow_recording: true,
          participant_limit: 20
        }
      }

      let capturedSessionIds: string[] = []
      
      mockInsert.mockImplementation((data) => {
        capturedSessionIds.push(data.id)
        return {
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { ...data },
              error: null
            })
          }))
        }
      })

      // Create multiple sessions
      await repository.createSession(sessionData)
      await repository.createSession(sessionData)

      expect(capturedSessionIds).toHaveLength(2)
      expect(capturedSessionIds[0]).not.toBe(capturedSessionIds[1])
      expect(capturedSessionIds[0]).toMatch(/^vs_\d+_[a-z0-9]{6}$/)
    })
  })

  describe('findSessionById', () => {
    it('should find session with participants', async () => {
      const sessionId = 'vs_123_abc456'
      const mockSessionData = {
        id: sessionId,
        host_user_id: 'user123',
        name: 'Test Session',
        collaboration_type: 'presentation',
        status: 'active',
        voice_participants: [
          {
            user_id: 'user456',
            role: 'participant',
            spatial_position: { x: 1, y: 2, z: 3 },
            audio_settings: { muted: false, volume: 80, spatial_audio_enabled: true },
            joined_at: '2024-01-01T10:00:00Z',
            left_at: null
          }
        ]
      }

      mockSelect.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockSessionData,
            error: null
          })
        }))
      })

      const result = await repository.findSessionById(sessionId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: sessionId,
        host_user_id: 'user123',
        participants: expect.arrayContaining([
          expect.objectContaining({
            user_id: 'user456',
            role: 'participant'
          })
        ])
      })
    })

    it('should return null for non-existent session', async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        }))
      })

      const result = await repository.findSessionById('nonexistent')

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })
  })

  describe('updateSessionStatus', () => {
    it('should update session status to active', async () => {
      const sessionId = 'vs_123_abc456'
      
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })

      const result = await repository.updateSessionStatus(sessionId, 'active')

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('voice_sessions')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          started_at: expect.any(String)
        })
      )
    })

    it('should update session status to ended with end time', async () => {
      const sessionId = 'vs_123_abc456'
      
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null
        })
      })

      const result = await repository.updateSessionStatus(sessionId, 'ended')

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ended',
          ended_at: expect.any(String)
        })
      )
    })
  })

  describe('addParticipant', () => {
    it('should add participant to session', async () => {
      const sessionId = 'vs_123_abc456'
      const participant = {
        user_id: 'user789',
        role: 'presenter' as const,
        spatial_position: { x: 0, y: 0, z: 0 },
        audio_settings: {
          muted: false,
          volume: 100,
          spatial_audio_enabled: true
        },
        joined_at: '2024-01-01T11:00:00Z'
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: null
        })
      })

      const result = await repository.addParticipant(sessionId, participant)

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('voice_participants')
    })

    it('should handle participant addition errors', async () => {
      const sessionId = 'vs_123_abc456'
      const participant = {
        user_id: 'user789',
        role: 'participant' as const,
        audio_settings: {
          muted: true,
          volume: 50,
          spatial_audio_enabled: false
        },
        joined_at: '2024-01-01T11:00:00Z'
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: new Error('Constraint violation')
        })
      })

      const result = await repository.addParticipant(sessionId, participant)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('removeParticipant', () => {
    it('should mark participant as left', async () => {
      const sessionId = 'vs_123_abc456'
      const userId = 'user789'

      mockUpdate.mockReturnValue({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      })

      const result = await repository.removeParticipant(sessionId, userId)

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          left_at: expect.any(String)
        })
      )
    })
  })

  describe('updateParticipantPosition', () => {
    it('should update participant spatial position', async () => {
      const sessionId = 'vs_123_abc456'
      const userId = 'user789'
      const newPosition = { x: 5, y: 3, z: 1 }

      mockUpdate.mockReturnValue({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      })

      const result = await repository.updateParticipantPosition(sessionId, userId, newPosition)

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        spatial_position: newPosition
      })
    })
  })

  describe('findSessionsByUser', () => {
    it('should find sessions where user is host or participant', async () => {
      const userId = 'user123'
      const mockSessions = [
        {
          id: 'vs_123_abc456',
          host_user_id: userId,
          name: 'My Session',
          status: 'ended',
          voice_participants: []
        },
        {
          id: 'vs_789_def123',
          host_user_id: 'other_user',
          name: 'Other Session',
          status: 'active',
          voice_participants: [
            { user_id: userId, role: 'participant' }
          ]
        }
      ]

      mockSelect.mockReturnValue({
        or: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: mockSessions,
            error: null
          })
        }))
      })

      const result = await repository.findSessionsByUser(userId)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].host_user_id).toBe(userId)
    })
  })

  describe('generateSessionAnalytics', () => {
    it('should return analytics structure', async () => {
      const sessionId = 'vs_123_abc456'

      const result = await repository.generateSessionAnalytics(sessionId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        session_id: sessionId,
        total_duration: expect.any(Number),
        participant_count: expect.any(Number),
        engagement_metrics: expect.objectContaining({
          speaking_time_distribution: expect.any(Object),
          interruption_count: expect.any(Number),
          silence_periods: expect.any(Number),
          active_participation_rate: expect.any(Number)
        }),
        technical_metrics: expect.objectContaining({
          average_audio_quality: expect.any(Number),
          connection_stability: expect.any(Number),
          spatial_audio_usage: expect.any(Boolean)
        }),
        generated_at: expect.any(String)
      })
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const sessionData: CreateVoiceSessionData = {
        host_user_id: 'user123',
        name: 'Test Session',
        collaboration_type: 'brainstorming',
        spatial_audio_config: {
          enabled: true,
          room_size: 'medium',
          acoustics: 'conference'
        },
        permissions: {
          allow_screen_share: true,
          allow_file_share: true,
          allow_recording: false,
          participant_limit: 10
        }
      }

      mockInsert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn().mockRejectedValue(new Error('Network timeout'))
        }))
      })

      const result = await repository.createSession(sessionData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('internal')
    })

    it('should validate session status transitions', async () => {
      const sessionId = 'vs_123_abc456'
      
      // Test each valid status
      const validStatuses = ['scheduled', 'active', 'ended', 'cancelled'] as const
      
      for (const status of validStatuses) {
        mockUpdate.mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })

        const result = await repository.updateSessionStatus(sessionId, status)
        expect(result.success).toBe(true)
      }
    })

    it('should handle malformed participant data', async () => {
      const sessionId = 'vs_123_abc456'
      const malformedParticipant = {
        user_id: '', // Empty user ID
        role: 'invalid_role' as any,
        audio_settings: {
          muted: 'not_boolean' as any,
          volume: 'invalid_volume' as any,
          spatial_audio_enabled: true
        },
        joined_at: 'invalid_date'
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: new Error('Invalid data format')
        })
      })

      const result = await repository.addParticipant(sessionId, malformedParticipant)

      expect(result.success).toBe(false)
    })
  })
})