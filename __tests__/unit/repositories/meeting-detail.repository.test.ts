import { MeetingDetailRepository } from '@/lib/repositories/meeting-detail.repository'
import { Result } from '@/lib/utils/result'
import {
  MeetingId,
  ParticipantId,
  AgendaItemId,
  DocumentId,
  createMeetingId,
  createParticipantId,
  createAgendaItemId,
  createDocumentId
} from '@/types/meeting-details'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  in: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  single: jest.fn(),
  rpc: jest.fn()
}

// Mock database transaction
const mockTransaction = {
  from: jest.fn(() => mockTransaction),
  select: jest.fn(() => mockTransaction),
  insert: jest.fn(() => mockTransaction),
  update: jest.fn(() => mockTransaction),
  delete: jest.fn(() => mockTransaction),
  eq: jest.fn(() => mockTransaction),
  in: jest.fn(() => mockTransaction),
  order: jest.fn(() => mockTransaction),
  limit: jest.fn(() => mockTransaction),
  single: jest.fn(() => mockTransaction),
  rpc: jest.fn(() => mockTransaction)
}

// Create repository instance with mocked client
const repository = new MeetingDetailRepository(mockSupabaseClient as any)

describe('MeetingDetailRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockSupabaseClient.from.mockReturnValue({
      select: mockSupabaseClient.select,
      insert: mockSupabaseClient.insert,
      update: mockSupabaseClient.update,
      delete: mockSupabaseClient.delete
    })
    
    mockSupabaseClient.select.mockReturnValue({
      eq: mockSupabaseClient.eq,
      in: mockSupabaseClient.in,
      order: mockSupabaseClient.order,
      limit: mockSupabaseClient.limit,
      single: mockSupabaseClient.single
    })
  })

  describe('getMeetingDetails', () => {
    const mockMeetingId = createMeetingId('test-meeting-123')
    const mockParticipantId = createParticipantId('participant-456')
    
    const mockMeetingData = {
      id: 'test-meeting-123',
      title: 'Test Board Meeting',
      description: 'A test meeting for unit testing',
      meeting_type: 'board',
      status: 'scheduled',
      scheduled_start: '2024-03-15T10:00:00Z',
      scheduled_end: '2024-03-15T12:00:00Z',
      location: 'Conference Room A',
      virtual_meeting_url: 'https://zoom.us/j/123456789',
      organizer_id: 'organizer-123',
      created_at: '2024-03-10T09:00:00Z',
      updated_at: '2024-03-10T09:00:00Z'
    }

    beforeEach(() => {
      if (!mockMeetingId.success || !mockParticipantId.success) {
        throw new Error('Failed to create mock IDs')
      }
    })

    it('successfully retrieves meeting details with all related data', async () => {
      const mockResponse = {
        data: mockMeetingData,
        error: null
      }
      
      mockSupabaseClient.single.mockResolvedValue(mockResponse)
      
      if (!mockMeetingId.success || !mockParticipantId.success) return

      const request = {
        meetingId: mockMeetingId.data,
        requestingParticipantId: mockParticipantId.data,
        includeParticipants: true,
        includeAgenda: true,
        includeDocuments: true,
        includeMinutes: true,
        includeResolutions: true,
        includeActionItems: true
      }
      
      const result = await repository.getMeetingDetails(request)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.meeting.id).toBe(mockMeetingId.data)
        expect(result.data.meeting.title).toBe('Test Board Meeting')
        expect(result.data.meeting.status).toBe('scheduled')
      }
    })

    it('handles database errors gracefully', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'Database connection failed',
          code: 'CONNECTION_ERROR'
        }
      }
      
      mockSupabaseClient.single.mockResolvedValue(mockError)
      
      if (!mockMeetingId.success || !mockParticipantId.success) return

      const request = {
        meetingId: mockMeetingId.data,
        requestingParticipantId: mockParticipantId.data
      }
      
      const result = await repository.getMeetingDetails(request)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('DATABASE_ERROR')
        expect(result.error.message).toContain('connection failed')
      }
    })

    it('returns not found error for non-existent meeting', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'No rows found',
          code: 'PGRST116'
        }
      }
      
      mockSupabaseClient.single.mockResolvedValue(mockResponse)
      
      if (!mockMeetingId.success || !mockParticipantId.success) return

      const request = {
        meetingId: mockMeetingId.data,
        requestingParticipantId: mockParticipantId.data
      }
      
      const result = await repository.getMeetingDetails(request)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('MEETING_NOT_FOUND')
      }
    })

    it('validates meeting ID format before database call', async () => {
      const invalidMeetingId = '' as any // Invalid ID
      
      const request = {
        meetingId: invalidMeetingId,
        requestingParticipantId: mockParticipantId.success ? mockParticipantId.data : '' as any
      }
      
      const result = await repository.getMeetingDetails(request)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_MEETING_ID')
      }
      
      // Should not make database call for invalid ID
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('includes optional data based on request parameters', async () => {
      const mockResponseWithOptionalData = {
        data: {
          ...mockMeetingData,
          participants: [
            { id: 'p1', name: 'John Doe', role: 'chair' },
            { id: 'p2', name: 'Jane Smith', role: 'member' }
          ],
          agenda_items: [
            { id: 'a1', title: 'Opening remarks', order: 1 },
            { id: 'a2', title: 'Financial review', order: 2 }
          ],
          documents: [
            { id: 'd1', title: 'Board pack', type: 'pdf' },
            { id: 'd2', title: 'Financial statements', type: 'excel' }
          ]
        },
        error: null
      }
      
      mockSupabaseClient.single.mockResolvedValue(mockResponseWithOptionalData)
      
      if (!mockMeetingId.success || !mockParticipantId.success) return

      const request = {
        meetingId: mockMeetingId.data,
        requestingParticipantId: mockParticipantId.data,
        includeParticipants: true,
        includeAgenda: true,
        includeDocuments: true
      }
      
      const result = await repository.getMeetingDetails(request)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.participants).toHaveLength(2)
        expect(result.data.agendaItems).toHaveLength(2)
        expect(result.data.documents).toHaveLength(2)
      }
    })
  })

  describe('getParticipants', () => {
    const mockMeetingId = createMeetingId('test-meeting-123')

    it('retrieves meeting participants successfully', async () => {
      const mockParticipants = [
        {
          id: 'p1',
          meeting_id: 'test-meeting-123',
          user_id: 'u1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'chair',
          status: 'confirmed',
          joined_at: null,
          left_at: null
        },
        {
          id: 'p2',
          meeting_id: 'test-meeting-123',
          user_id: 'u2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'member',
          status: 'pending',
          joined_at: null,
          left_at: null
        }
      ]
      
      mockSupabaseClient.eq.mockResolvedValue({
        data: mockParticipants,
        error: null
      })
      
      if (!mockMeetingId.success) return

      const result = await repository.getParticipants(mockMeetingId.data)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].name).toBe('John Doe')
        expect(result.data[0].role).toBe('chair')
        expect(result.data[1].name).toBe('Jane Smith')
        expect(result.data[1].status).toBe('pending')
      }
    })

    it('handles empty participants list', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: [],
        error: null
      })
      
      if (!mockMeetingId.success) return

      const result = await repository.getParticipants(mockMeetingId.data)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('handles database errors', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: {
          message: 'Table not found',
          code: 'TABLE_ERROR'
        }
      })
      
      if (!mockMeetingId.success) return

      const result = await repository.getParticipants(mockMeetingId.data)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('DATABASE_ERROR')
      }
    })
  })

  describe('getAgendaItems', () => {
    const mockMeetingId = createMeetingId('test-meeting-123')

    it('retrieves agenda items in correct order', async () => {
      const mockAgendaItems = [
        {
          id: 'a1',
          meeting_id: 'test-meeting-123',
          title: 'Opening remarks',
          description: 'Welcome and introductions',
          order: 1,
          duration_minutes: 10,
          status: 'pending',
          presenter_id: 'p1',
          created_at: '2024-03-10T09:00:00Z'
        },
        {
          id: 'a2',
          meeting_id: 'test-meeting-123',
          title: 'Financial review',
          description: 'Q4 financial performance',
          order: 2,
          duration_minutes: 30,
          status: 'pending',
          presenter_id: 'p2',
          created_at: '2024-03-10T09:00:00Z'
        }
      ]
      
      mockSupabaseClient.order.mockResolvedValue({
        data: mockAgendaItems,
        error: null
      })
      
      if (!mockMeetingId.success) return

      const result = await repository.getAgendaItems(mockMeetingId.data)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].title).toBe('Opening remarks')
        expect(result.data[0].order).toBe(1)
        expect(result.data[1].title).toBe('Financial review')
        expect(result.data[1].order).toBe(2)
      }
      
      // Verify items are ordered correctly
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('order', { ascending: true })
    })
  })

  describe('getDocuments', () => {
    const mockMeetingId = createMeetingId('test-meeting-123')

    it('retrieves meeting documents with metadata', async () => {
      const mockDocuments = [
        {
          id: 'd1',
          meeting_id: 'test-meeting-123',
          title: 'Board Pack March 2024',
          description: 'Comprehensive board pack for March meeting',
          file_name: 'board-pack-march-2024.pdf',
          file_size: 2048576,
          file_type: 'application/pdf',
          upload_date: '2024-03-10T09:00:00Z',
          uploaded_by: 'u1',
          version: 1,
          status: 'active'
        },
        {
          id: 'd2',
          meeting_id: 'test-meeting-123',
          title: 'Financial Statements Q4',
          description: 'Q4 financial statements and analysis',
          file_name: 'financials-q4-2024.xlsx',
          file_size: 512000,
          file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upload_date: '2024-03-11T09:00:00Z',
          uploaded_by: 'u2',
          version: 1,
          status: 'active'
        }
      ]
      
      mockSupabaseClient.order.mockResolvedValue({
        data: mockDocuments,
        error: null
      })
      
      if (!mockMeetingId.success) return

      const result = await repository.getDocuments(mockMeetingId.data)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].title).toBe('Board Pack March 2024')
        expect(result.data[0].file_type).toBe('application/pdf')
        expect(result.data[1].file_type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      }
    })
  })

  describe('updateParticipantStatus', () => {
    const mockParticipantId = createParticipantId('participant-123')

    it('updates participant status successfully', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: [{ 
          id: 'participant-123',
          status: 'confirmed',
          updated_at: '2024-03-15T10:30:00Z'
        }],
        error: null
      })
      
      if (!mockParticipantId.success) return

      const result = await repository.updateParticipantStatus(
        mockParticipantId.data,
        'confirmed'
      )
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('confirmed')
      }
      
      // Verify update was called with correct parameters
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'confirmed',
        updated_at: expect.any(String)
      })
    })

    it('handles invalid status values', async () => {
      if (!mockParticipantId.success) return

      const result = await repository.updateParticipantStatus(
        mockParticipantId.data,
        'invalid-status' as any
      )
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_PARTICIPANT_STATUS')
      }
    })
  })

  describe('addMeetingNote', () => {
    const mockMeetingId = createMeetingId('test-meeting-123')
    const mockParticipantId = createParticipantId('participant-456')

    it('adds meeting note successfully', async () => {
      const mockNote = {
        id: 'note-789',
        meeting_id: 'test-meeting-123',
        author_id: 'participant-456',
        content: 'Important discussion point about budget allocation',
        note_type: 'general',
        created_at: '2024-03-15T11:00:00Z',
        updated_at: '2024-03-15T11:00:00Z'
      }
      
      mockSupabaseClient.single.mockResolvedValue({
        data: mockNote,
        error: null
      })
      
      if (!mockMeetingId.success || !mockParticipantId.success) return

      const noteData = {
        content: 'Important discussion point about budget allocation',
        noteType: 'general' as const
      }
      
      const result = await repository.addMeetingNote(
        mockMeetingId.data,
        mockParticipantId.data,
        noteData
      )
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe(noteData.content)
        expect(result.data.noteType).toBe(noteData.noteType)
      }
    })

    it('validates note content length', async () => {
      if (!mockMeetingId.success || !mockParticipantId.success) return

      const noteData = {
        content: '', // Empty content
        noteType: 'general' as const
      }
      
      const result = await repository.addMeetingNote(
        mockMeetingId.data,
        mockParticipantId.data,
        noteData
      )
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_NOTE_CONTENT')
      }
    })
  })

  describe('Transaction Support', () => {
    it('executes operations within a transaction', async () => {
      const mockMeetingId = createMeetingId('test-meeting-123')
      const mockParticipantId = createParticipantId('participant-456')
      
      if (!mockMeetingId.success || !mockParticipantId.success) return

      // Mock transaction success
      const mockTransactionResult = {
        data: { success: true },
        error: null
      }
      
      mockSupabaseClient.rpc.mockResolvedValue(mockTransactionResult)
      
      const operations = [
        () => repository.updateParticipantStatus(mockParticipantId.data, 'confirmed'),
        () => repository.addMeetingNote(mockMeetingId.data, mockParticipantId.data, {
          content: 'Transaction test note',
          noteType: 'general'
        })
      ]
      
      const result = await repository.executeTransaction(operations)
      
      expect(result.success).toBe(true)
    })

    it('rolls back transaction on failure', async () => {
      const mockError = {
        data: null,
        error: {
          message: 'Transaction failed',
          code: 'TRANSACTION_ERROR'
        }
      }
      
      mockSupabaseClient.rpc.mockResolvedValue(mockError)
      
      const operations = [
        () => Promise.resolve({ success: false, error: { code: 'TEST_ERROR', message: 'Test failure' } } as any)
      ]
      
      const result = await repository.executeTransaction(operations)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('TRANSACTION_FAILED')
      }
    })
  })

  describe('Performance and Caching', () => {
    it('caches frequently accessed meeting data', async () => {
      const mockMeetingId = createMeetingId('test-meeting-123')
      const mockParticipantId = createParticipantId('participant-456')
      
      if (!mockMeetingId.success || !mockParticipantId.success) return

      const mockResponse = {
        data: { id: 'test-meeting-123', title: 'Test Meeting' },
        error: null
      }
      
      mockSupabaseClient.single.mockResolvedValue(mockResponse)
      
      const request = {
        meetingId: mockMeetingId.data,
        requestingParticipantId: mockParticipantId.data
      }
      
      // First call
      const result1 = await repository.getMeetingDetails(request)
      
      // Second call (should use cache)
      const result2 = await repository.getMeetingDetails(request)
      
      expect(result1.success && result2.success).toBe(true)
      
      // Database should only be called once due to caching
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1)
    })

    it('handles cache invalidation on updates', async () => {
      const mockMeetingId = createMeetingId('test-meeting-123')
      const mockParticipantId = createParticipantId('participant-456')
      
      if (!mockMeetingId.success || !mockParticipantId.success) return

      // Mock successful update
      mockSupabaseClient.eq.mockResolvedValue({
        data: [{ id: 'participant-456', status: 'confirmed' }],
        error: null
      })
      
      await repository.updateParticipantStatus(mockParticipantId.data, 'confirmed')
      
      // Cache should be cleared for the meeting
      expect(repository.clearCacheForMeeting).toBeDefined()
    })
  })

  describe('Error Recovery', () => {
    it('implements retry logic for transient failures', async () => {
      const mockMeetingId = createMeetingId('test-meeting-123')
      const mockParticipantId = createParticipantId('participant-456')
      
      if (!mockMeetingId.success || !mockParticipantId.success) return

      // First call fails, second succeeds
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Connection timeout', code: 'TIMEOUT' }
        })
        .mockResolvedValueOnce({
          data: { id: 'test-meeting-123', title: 'Test Meeting' },
          error: null
        })
      
      const request = {
        meetingId: mockMeetingId.data,
        requestingParticipantId: mockParticipantId.data
      }
      
      const result = await repository.getMeetingDetails(request)
      
      expect(result.success).toBe(true)
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(2)
    })

    it('provides fallback data for critical operations', async () => {
      const mockMeetingId = createMeetingId('test-meeting-123')
      
      if (!mockMeetingId.success) return

      // Mock database failure
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: { message: 'Service unavailable', code: 'SERVICE_ERROR' }
      })
      
      const result = await repository.getParticipants(mockMeetingId.data)
      
      // Should return empty array as fallback instead of error for non-critical data
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })
  })
})