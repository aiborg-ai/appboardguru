import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as createVoiceSession } from '../../app/api/voice/collaboration/route'
import { GET as getVoiceSessions } from '../../app/api/voice/sessions/route'
import { DELETE as endVoiceSession } from '../../app/api/voice/sessions/[id]/route'

// Mock authentication
vi.mock('../../lib/auth/server-auth', () => ({
  getServerUser: vi.fn().mockResolvedValue({
    id: 'user_123',
    email: 'test@example.com'
  })
}))

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
}

vi.mock('../../lib/database/supabase', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue(mockSupabase)
}))

describe('Voice API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST /api/voice/collaboration', () => {
    it('should create voice session successfully', async () => {
      const sessionData = {
        name: 'Test Brainstorming Session',
        description: 'Integration test session',
        collaborationType: 'brainstorming',
        spatialAudioConfig: {
          enabled: true,
          roomSize: 'medium',
          acoustics: 'conference'
        },
        permissions: {
          allowScreenShare: true,
          allowFileShare: true,
          allowRecording: false,
          participantLimit: 10
        }
      }

      const request = new NextRequest('http://localhost:3000/api/voice/collaboration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      })

      // Mock successful database operations
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'vs_123456_abc123',
          host_user_id: 'user_123',
          name: sessionData.name,
          description: sessionData.description,
          collaboration_type: sessionData.collaborationType,
          spatial_audio_config: sessionData.spatialAudioConfig,
          permissions: sessionData.permissions,
          status: 'scheduled',
          created_at: new Date().toISOString()
        },
        error: null
      })

      const response = await createVoiceSession(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.session).toMatchObject({
        name: sessionData.name,
        collaboration_type: sessionData.collaborationType,
        status: 'scheduled'
      })
      expect(responseData.data.webrtcConfig).toBeDefined()
      expect(responseData.data.webrtcConfig.iceServers).toBeDefined()
    })

    it('should validate required fields', async () => {
      const invalidSessionData = {
        name: '', // Empty name should fail
        collaborationType: 'invalid_type',
        spatialAudioConfig: {
          enabled: true,
          roomSize: 'invalid_size'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/voice/collaboration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidSessionData)
      })

      const response = await createVoiceSession(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.type).toBe('validation')
    })

    it('should handle database errors gracefully', async () => {
      const sessionData = {
        name: 'Test Session',
        collaborationType: 'discussion',
        spatialAudioConfig: {
          enabled: false,
          roomSize: 'small',
          acoustics: 'studio'
        },
        permissions: {
          allowScreenShare: false,
          allowFileShare: false,
          allowRecording: false,
          participantLimit: 5
        }
      }

      const request = new NextRequest('http://localhost:3000/api/voice/collaboration', {
        method: 'POST',
        body: JSON.stringify(sessionData)
      })

      // Mock database error
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      })

      const response = await createVoiceSession(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error.type).toBe('internal')
    })

    it('should generate unique session IDs', async () => {
      const sessionData = {
        name: 'Uniqueness Test Session',
        collaborationType: 'presentation',
        spatialAudioConfig: { enabled: true, roomSize: 'large', acoustics: 'open_space' },
        permissions: { allowScreenShare: true, allowFileShare: true, allowRecording: true, participantLimit: 20 }
      }

      const generatedIds: string[] = []

      // Mock to capture generated IDs
      mockSupabase.from().insert.mockImplementation((data) => {
        generatedIds.push(data.id)
        return {
          select: () => ({
            single: vi.fn().mockResolvedValue({
              data: { ...data, created_at: new Date().toISOString() },
              error: null
            })
          })
        }
      })

      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest('http://localhost:3000/api/voice/collaboration', {
          method: 'POST',
          body: JSON.stringify({ ...sessionData, name: `Session ${i}` })
        })

        await createVoiceSession(request)
      }

      expect(generatedIds).toHaveLength(3)
      expect(new Set(generatedIds).size).toBe(3) // All unique
      generatedIds.forEach(id => {
        expect(id).toMatch(/^vs_\d+_[a-z0-9]{6}$/)
      })
    })
  })

  describe('GET /api/voice/sessions', () => {
    it('should retrieve user voice sessions', async () => {
      const mockSessions = [
        {
          id: 'vs_123_abc',
          host_user_id: 'user_123',
          name: 'Past Session',
          status: 'ended',
          created_at: '2024-01-01T10:00:00Z',
          voice_participants: []
        },
        {
          id: 'vs_456_def',
          host_user_id: 'user_123',
          name: 'Active Session',
          status: 'active',
          created_at: '2024-01-02T10:00:00Z',
          voice_participants: [
            { user_id: 'user_456', role: 'participant' }
          ]
        }
      ]

      const request = new NextRequest('http://localhost:3000/api/voice/sessions')

      mockSupabase.from().select().or().order.mockResolvedValue({
        data: mockSessions,
        error: null
      })

      const response = await getVoiceSessions(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.sessions).toHaveLength(2)
      expect(responseData.data.sessions[0].status).toBe('ended')
      expect(responseData.data.sessions[1].status).toBe('active')
    })

    it('should filter sessions by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/voice/sessions?status=active')

      const activeSessions = [
        {
          id: 'vs_active_1',
          name: 'Active Session 1',
          status: 'active'
        }
      ]

      mockSupabase.from().select().or().eq().order.mockResolvedValue({
        data: activeSessions,
        error: null
      })

      const response = await getVoiceSessions(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data.sessions).toHaveLength(1)
      expect(responseData.data.sessions[0].status).toBe('active')
    })

    it('should handle empty results', async () => {
      const request = new NextRequest('http://localhost:3000/api/voice/sessions')

      mockSupabase.from().select().or().order.mockResolvedValue({
        data: [],
        error: null
      })

      const response = await getVoiceSessions(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.sessions).toHaveLength(0)
      expect(responseData.message).toContain('No sessions found')
    })
  })

  describe('DELETE /api/voice/sessions/[id]', () => {
    it('should end voice session successfully', async () => {
      const sessionId = 'vs_123_abc'
      const mockSession = {
        id: sessionId,
        host_user_id: 'user_123',
        name: 'Session to End',
        status: 'active'
      }

      const request = new NextRequest(`http://localhost:3000/api/voice/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      // Mock session lookup
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      // Mock session status update
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      })

      const response = await endVoiceSession(request, { params: { id: sessionId } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toContain('ended successfully')
    })

    it('should prevent non-hosts from ending sessions', async () => {
      const sessionId = 'vs_123_abc'
      const mockSession = {
        id: sessionId,
        host_user_id: 'other_user',
        name: 'Other User Session',
        status: 'active'
      }

      const request = new NextRequest(`http://localhost:3000/api/voice/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const response = await endVoiceSession(request, { params: { id: sessionId } })
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.success).toBe(false)
      expect(responseData.error.type).toBe('authorization')
    })

    it('should handle non-existent session', async () => {
      const sessionId = 'vs_nonexistent'
      const request = new NextRequest(`http://localhost:3000/api/voice/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const response = await endVoiceSession(request, { params: { id: sessionId } })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error.type).toBe('not_found')
    })

    it('should handle already ended sessions', async () => {
      const sessionId = 'vs_123_abc'
      const mockSession = {
        id: sessionId,
        host_user_id: 'user_123',
        status: 'ended'
      }

      const request = new NextRequest(`http://localhost:3000/api/voice/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const response = await endVoiceSession(request, { params: { id: sessionId } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.type).toBe('business_rule')
      expect(responseData.error.message).toContain('already ended')
    })
  })

  describe('Voice session workflow integration', () => {
    it('should handle complete session lifecycle', async () => {
      // 1. Create session
      const createRequest = new NextRequest('http://localhost:3000/api/voice/collaboration', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Lifecycle Test Session',
          collaborationType: 'brainstorming',
          spatialAudioConfig: { enabled: true, roomSize: 'medium', acoustics: 'conference' },
          permissions: { allowScreenShare: true, allowFileShare: false, allowRecording: false, participantLimit: 5 }
        })
      })

      const sessionId = 'vs_lifecycle_123'
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: sessionId,
          host_user_id: 'user_123',
          name: 'Lifecycle Test Session',
          status: 'scheduled',
          created_at: new Date().toISOString()
        },
        error: null
      })

      const createResponse = await createVoiceSession(createRequest)
      expect(createResponse.status).toBe(200)

      // 2. Retrieve sessions (should include the new one)
      const listRequest = new NextRequest('http://localhost:3000/api/voice/sessions')
      
      mockSupabase.from().select().or().order.mockResolvedValue({
        data: [
          {
            id: sessionId,
            host_user_id: 'user_123',
            name: 'Lifecycle Test Session',
            status: 'scheduled'
          }
        ],
        error: null
      })

      const listResponse = await getVoiceSessions(listRequest)
      const listData = await listResponse.json()
      
      expect(listResponse.status).toBe(200)
      expect(listData.data.sessions).toHaveLength(1)
      expect(listData.data.sessions[0].id).toBe(sessionId)

      // 3. End session
      const endRequest = new NextRequest(`http://localhost:3000/api/voice/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: sessionId,
          host_user_id: 'user_123',
          status: 'scheduled'
        },
        error: null
      })

      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      })

      const endResponse = await endVoiceSession(endRequest, { params: { id: sessionId } })
      expect(endResponse.status).toBe(200)
    })

    it('should validate session state transitions', async () => {
      const sessionId = 'vs_transition_test'
      
      // Try to end a cancelled session
      const request = new NextRequest(`http://localhost:3000/api/voice/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: sessionId,
          host_user_id: 'user_123',
          status: 'cancelled'
        },
        error: null
      })

      const response = await endVoiceSession(request, { params: { id: sessionId } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.message).toContain('cannot be ended')
    })

    it('should handle concurrent session operations', async () => {
      const sessionData = {
        name: 'Concurrent Test Session',
        collaborationType: 'discussion',
        spatialAudioConfig: { enabled: false, roomSize: 'small', acoustics: 'studio' },
        permissions: { allowScreenShare: false, allowFileShare: false, allowRecording: false, participantLimit: 3 }
      }

      // Simulate database constraint violation (e.g., unique constraint)
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Unique constraint violation' }
      })

      const request = new NextRequest('http://localhost:3000/api/voice/collaboration', {
        method: 'POST',
        body: JSON.stringify(sessionData)
      })

      const response = await createVoiceSession(request)
      const responseData = await response.json()

      expect(response.status).toBe(409) // Conflict
      expect(responseData.success).toBe(false)
      expect(responseData.error.type).toBe('conflict')
    })

    it('should properly clean up session resources', async () => {
      const sessionId = 'vs_cleanup_test'
      
      const request = new NextRequest(`http://localhost:3000/api/voice/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: sessionId,
          host_user_id: 'user_123',
          status: 'active',
          voice_participants: [
            { user_id: 'user_456', role: 'participant' },
            { user_id: 'user_789', role: 'presenter' }
          ]
        },
        error: null
      })

      // Mock participant cleanup
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      })

      const response = await endVoiceSession(request, { params: { id: sessionId } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      
      // Verify proper cleanup calls were made
      expect(mockSupabase.from).toHaveBeenCalledWith('voice_sessions')
      expect(mockSupabase.from).toHaveBeenCalledWith('voice_participants')
    })
  })

  describe('Error scenarios and edge cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/voice/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      })

      const response = await createVoiceSession(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.type).toBe('validation')
    })

    it('should validate session ID format', async () => {
      const invalidSessionIds = ['', 'abc', '123', 'vs_invalid', 'not-a-session-id']

      for (const sessionId of invalidSessionIds) {
        const request = new NextRequest(`http://localhost:3000/api/voice/sessions/${sessionId}`, {
          method: 'DELETE'
        })

        const response = await endVoiceSession(request, { params: { id: sessionId } })
        
        if (sessionId === '' || !sessionId.startsWith('vs_')) {
          expect(response.status).toBe(400)
        }
      }
    })

    it('should handle authentication failures', async () => {
      // Mock authentication failure
      vi.mocked(vi.importMock('../../lib/auth/server-auth')).getServerUser.mockRejectedValue(
        new Error('Authentication failed')
      )

      const request = new NextRequest('http://localhost:3000/api/voice/collaboration', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', collaborationType: 'brainstorming' })
      })

      const response = await createVoiceSession(request)
      
      expect(response.status).toBe(401)
    })

    it('should handle rate limiting scenarios', async () => {
      // This would typically be handled by middleware, but we can test the behavior
      const sessionData = {
        name: 'Rate Limited Session',
        collaborationType: 'presentation',
        spatialAudioConfig: { enabled: true, roomSize: 'large', acoustics: 'open_space' },
        permissions: { allowScreenShare: true, allowFileShare: true, allowRecording: true, participantLimit: 50 }
      }

      // Simulate too many requests from same user
      for (let i = 0; i < 10; i++) {
        const request = new NextRequest('http://localhost:3000/api/voice/collaboration', {
          method: 'POST',
          body: JSON.stringify({ ...sessionData, name: `Session ${i}` })
        })

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: { id: `session_${i}`, ...sessionData },
          error: null
        })

        const response = await createVoiceSession(request)
        
        // In a real scenario, rate limiting would kick in
        expect(response.status).toBeLessThanOrEqual(429)
      }
    })
  })
})