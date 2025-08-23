/**
 * Board Secretary Meetings API Route Tests
 * Integration tests for the meetings API endpoints
 */

import { GET, POST } from '../meetings/route'
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AIBoardSecretaryService } from '@/lib/services/ai-board-secretary.service'

// Mock dependencies
jest.mock('@/lib/supabase-server')
jest.mock('@/lib/services/ai-board-secretary.service')

const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>
const MockAIBoardSecretaryService = AIBoardSecretaryService as jest.MockedClass<typeof AIBoardSecretaryService>

describe('/api/board-secretary/meetings', () => {
  let mockSupabase: any
  let mockService: any
  let mockUser: any

  beforeEach(() => {
    mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    }

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      }))
    }

    mockService = {
      getMeetings: jest.fn(),
      createMeeting: jest.fn()
    }

    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase)
    MockAIBoardSecretaryService.mockImplementation(() => mockService)

    jest.clearAllMocks()
  })

  describe('GET /api/board-secretary/meetings', () => {
    it('should get meetings successfully with valid permissions', async () => {
      // Mock board access check
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { role: 'member' },
        error: null
      })

      // Mock service response
      const mockMeetings = [
        {
          id: 'meeting-1',
          meeting_title: 'Board Meeting 1',
          status: 'scheduled'
        }
      ]

      mockService.getMeetings.mockResolvedValue({
        success: true,
        data: {
          meetings: mockMeetings,
          total: 1
        }
      })

      const url = new URL('http://localhost:3000/api/board-secretary/meetings?board_id=board-123&page=1&limit=20')
      const request = new NextRequest(url)

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.meetings).toEqual(mockMeetings)
      expect(responseData.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 1
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' }
      })

      const url = new URL('http://localhost:3000/api/board-secretary/meetings?board_id=board-123')
      const request = new NextRequest(url)

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
    })

    it('should return 403 for user without board access', async () => {
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const url = new URL('http://localhost:3000/api/board-secretary/meetings?board_id=board-123')
      const request = new NextRequest(url)

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.error).toBe('Access denied to board')
    })

    it('should return 400 for invalid query parameters', async () => {
      const url = new URL('http://localhost:3000/api/board-secretary/meetings?board_id=invalid-uuid')
      const request = new NextRequest(url)

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid query parameters')
      expect(responseData.details).toBeDefined()
    })

    it('should handle service errors gracefully', async () => {
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { role: 'member' },
        error: null
      })

      mockService.getMeetings.mockResolvedValue({
        success: false,
        error: {
          message: 'Database connection failed',
          code: 'DB_ERROR'
        }
      })

      const url = new URL('http://localhost:3000/api/board-secretary/meetings?board_id=board-123')
      const request = new NextRequest(url)

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to get meetings')
      expect(responseData.details).toBe('Database connection failed')
    })

    it('should apply filters correctly', async () => {
      mockSupabase.from().select().eq().eq().eq().single.mockResolvedValue({
        data: { role: 'member' },
        error: null
      })

      mockService.getMeetings.mockResolvedValue({
        success: true,
        data: { meetings: [], total: 0 }
      })

      const url = new URL('http://localhost:3000/api/board-secretary/meetings')
      url.searchParams.set('board_id', 'board-123')
      url.searchParams.set('status', 'completed')
      url.searchParams.set('from_date', '2024-01-01T00:00:00Z')
      url.searchParams.set('to_date', '2024-12-31T23:59:59Z')
      url.searchParams.set('page', '2')
      url.searchParams.set('limit', '10')

      const request = new NextRequest(url)
      await GET(request)

      expect(mockService.getMeetings).toHaveBeenCalledWith('board-123', {
        status: 'completed',
        from_date: '2024-01-01T00:00:00Z',
        to_date: '2024-12-31T23:59:59Z',
        page: 2,
        limit: 10
      })
    })
  })

  describe('POST /api/board-secretary/meetings', () => {
    const validMeetingData = {
      board_id: 'board-123',
      meeting_title: 'Quarterly Review',
      meeting_type: 'regular',
      scheduled_date: '2024-02-15T14:00:00Z',
      location: 'Conference Room A',
      is_virtual: false
    }

    it('should create meeting successfully with admin permissions', async () => {
      // Mock board admin access check
      mockSupabase.from().select().eq().eq().eq().in().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null
      })

      const mockCreatedMeeting = {
        id: 'meeting-123',
        ...validMeetingData,
        created_by: mockUser.id,
        status: 'scheduled'
      }

      mockService.createMeeting.mockResolvedValue({
        success: true,
        data: mockCreatedMeeting
      })

      const request = new NextRequest('http://localhost:3000/api/board-secretary/meetings', {
        method: 'POST',
        body: JSON.stringify(validMeetingData)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('Meeting created successfully')
      expect(responseData.data).toEqual(mockCreatedMeeting)
    })

    it('should return 403 for user without admin permissions', async () => {
      mockSupabase.from().select().eq().eq().eq().in().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const request = new NextRequest('http://localhost:3000/api/board-secretary/meetings', {
        method: 'POST',
        body: JSON.stringify(validMeetingData)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.error).toBe('Access denied - admin role required')
    })

    it('should return 400 for invalid meeting data', async () => {
      const invalidMeetingData = {
        board_id: 'invalid-uuid',
        meeting_title: '', // Required field empty
        scheduled_date: 'invalid-date'
      }

      const request = new NextRequest('http://localhost:3000/api/board-secretary/meetings', {
        method: 'POST',
        body: JSON.stringify(invalidMeetingData)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid request data')
      expect(responseData.details).toBeDefined()
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/board-secretary/meetings', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should validate required fields', async () => {
      const incompleteData = {
        meeting_title: 'Test Meeting'
        // Missing required board_id and scheduled_date
      }

      const request = new NextRequest('http://localhost:3000/api/board-secretary/meetings', {
        method: 'POST',
        body: JSON.stringify(incompleteData)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid request data')
    })

    it('should validate meeting type enum', async () => {
      const invalidTypeData = {
        ...validMeetingData,
        meeting_type: 'invalid_type'
      }

      const request = new NextRequest('http://localhost:3000/api/board-secretary/meetings', {
        method: 'POST',
        body: JSON.stringify(invalidTypeData)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid request data')
    })

    it('should validate virtual meeting URL when is_virtual is true', async () => {
      const virtualMeetingData = {
        ...validMeetingData,
        is_virtual: true,
        virtual_meeting_url: 'invalid-url'
      }

      const request = new NextRequest('http://localhost:3000/api/board-secretary/meetings', {
        method: 'POST',
        body: JSON.stringify(virtualMeetingData)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid request data')
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed'))

      const url = new URL('http://localhost:3000/api/board-secretary/meetings?board_id=board-123')
      const request = new NextRequest(url)

      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it('should handle service instantiation errors', async () => {
      MockAIBoardSecretaryService.mockImplementation(() => {
        throw new Error('Service initialization failed')
      })

      const url = new URL('http://localhost:3000/api/board-secretary/meetings?board_id=board-123')
      const request = new NextRequest(url)

      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })
})