import { MeetingDetailService } from '@/lib/services/meeting-detail.service'
import { MeetingDetailRepository } from '@/lib/repositories/meeting-detail.repository'
import { EventBus } from '@/lib/services/event-bus.service'
import { Result } from '@/lib/utils/result'
import {
  MeetingId,
  ParticipantId,
  UserId,
  createMeetingId,
  createParticipantId,
  createUserId
} from '@/types/meeting-details'

// Mock repository
const mockRepository = {
  getMeetingDetails: jest.fn(),
  getParticipants: jest.fn(),
  getAgendaItems: jest.fn(),
  getDocuments: jest.fn(),
  getMinutes: jest.fn(),
  getResolutions: jest.fn(),
  getActionItems: jest.fn(),
  updateParticipantStatus: jest.fn(),
  addMeetingNote: jest.fn(),
  recordParticipantJoin: jest.fn(),
  recordParticipantLeave: jest.fn(),
  updateMeetingStatus: jest.fn(),
  addVote: jest.fn(),
  executeTransaction: jest.fn(),
  clearCacheForMeeting: jest.fn()
} as jest.Mocked<MeetingDetailRepository>

// Mock event bus
const mockEventBus = {
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn()
} as jest.Mocked<EventBus>

// Mock notification service
const mockNotificationService = {
  sendNotification: jest.fn(),
  sendBulkNotifications: jest.fn(),
  createNotificationTemplate: jest.fn()
}

// Mock permission service
const mockPermissionService = {
  checkMeetingAccess: jest.fn(),
  checkParticipantPermissions: jest.fn(),
  canViewMeetingDetails: jest.fn(),
  canEditMeetingDetails: jest.fn(),
  canAddNotes: jest.fn(),
  canVote: jest.fn()
}

// Create service instance
const service = new MeetingDetailService(
  mockRepository,
  mockEventBus,
  mockNotificationService as any,
  mockPermissionService as any
)

describe('MeetingDetailService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMeetingDetails', () => {
    const mockMeetingId = createMeetingId('test-meeting-123')
    const mockUserId = createUserId('user-456')

    const mockMeetingDetailsResponse = {
      meeting: {
        id: 'test-meeting-123' as MeetingId,
        title: 'Q4 Board Meeting',
        description: 'Quarterly board meeting',
        status: 'scheduled' as const,
        scheduledStart: new Date('2024-03-15T10:00:00Z'),
        scheduledEnd: new Date('2024-03-15T12:00:00Z'),
        location: 'Conference Room A',
        virtualMeetingUrl: 'https://zoom.us/j/123456789'
      },
      participants: [],
      agendaItems: [],
      documents: [],
      minutes: null,
      resolutions: [],
      actionItems: [],
      metadata: {
        participantCount: 8,
        confirmedCount: 6,
        documentCount: 12,
        totalDuration: 120,
        lastUpdated: new Date()
      }
    }

    beforeEach(() => {
      if (!mockMeetingId.success || !mockUserId.success) {
        throw new Error('Failed to create mock IDs')
      }
    })

    it('retrieves meeting details successfully with permission check', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      // Mock permission check
      mockPermissionService.canViewMeetingDetails.mockResolvedValue({ 
        success: true, 
        data: { canView: true, reason: 'participant' } 
      })

      // Mock repository response
      mockRepository.getMeetingDetails.mockResolvedValue({
        success: true,
        data: mockMeetingDetailsResponse
      })

      const result = await service.getMeetingDetails(
        mockMeetingId.data,
        mockUserId.data,
        {
          includeParticipants: true,
          includeAgenda: true,
          includeDocuments: true
        }
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.meeting.title).toBe('Q4 Board Meeting')
        expect(result.data.meeting.status).toBe('scheduled')
      }

      // Verify permission check was called
      expect(mockPermissionService.canViewMeetingDetails).toHaveBeenCalledWith(
        mockUserId.data,
        mockMeetingId.data
      )
    })

    it('denies access when user lacks permissions', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      // Mock permission denial
      mockPermissionService.canViewMeetingDetails.mockResolvedValue({
        success: true,
        data: { canView: false, reason: 'not_participant' }
      })

      const result = await service.getMeetingDetails(
        mockMeetingId.data,
        mockUserId.data
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('ACCESS_DENIED')
        expect(result.error.message).toContain('not authorized')
      }

      // Repository should not be called
      expect(mockRepository.getMeetingDetails).not.toHaveBeenCalled()
    })

    it('handles repository errors gracefully', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canViewMeetingDetails.mockResolvedValue({
        success: true,
        data: { canView: true, reason: 'participant' }
      })

      mockRepository.getMeetingDetails.mockResolvedValue({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Connection failed' }
      })

      const result = await service.getMeetingDetails(
        mockMeetingId.data,
        mockUserId.data
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('DATABASE_ERROR')
      }
    })

    it('applies data transformations and business rules', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canViewMeetingDetails.mockResolvedValue({
        success: true,
        data: { canView: true, reason: 'participant' }
      })

      const mockRawData = {
        ...mockMeetingDetailsResponse,
        participants: [
          {
            id: 'p1' as ParticipantId,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'chair',
            status: 'confirmed',
            joinedAt: null,
            leftAt: null,
            conflictOfInterest: ['agenda-item-2']
          }
        ]
      }

      mockRepository.getMeetingDetails.mockResolvedValue({
        success: true,
        data: mockRawData
      })

      const result = await service.getMeetingDetails(
        mockMeetingId.data,
        mockUserId.data,
        { includeParticipants: true }
      )

      expect(result.success).toBe(true)
      if (result.success) {
        // Should include business logic transformations
        expect(result.data.participants).toHaveLength(1)
        expect(result.data.participants[0].role).toBe('chair')
        expect(result.data.metadata.confirmedCount).toBe(6)
      }
    })

    it('publishes events for audit trail', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canViewMeetingDetails.mockResolvedValue({
        success: true,
        data: { canView: true, reason: 'participant' }
      })

      mockRepository.getMeetingDetails.mockResolvedValue({
        success: true,
        data: mockMeetingDetailsResponse
      })

      await service.getMeetingDetails(mockMeetingId.data, mockUserId.data)

      // Should publish audit event
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MeetingDetailsViewed',
          meetingId: mockMeetingId.data,
          userId: mockUserId.data
        })
      )
    })

    it('applies privacy filters based on participant role', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canViewMeetingDetails.mockResolvedValue({
        success: true,
        data: { canView: true, reason: 'observer' }
      })

      const mockSensitiveData = {
        ...mockMeetingDetailsResponse,
        documents: [
          {
            id: 'doc1',
            title: 'Confidential CEO Report',
            type: 'pdf',
            classification: 'confidential',
            accessLevel: 'board-only'
          },
          {
            id: 'doc2',
            title: 'Public Minutes Draft',
            type: 'docx',
            classification: 'public',
            accessLevel: 'all'
          }
        ]
      }

      mockRepository.getMeetingDetails.mockResolvedValue({
        success: true,
        data: mockSensitiveData
      })

      const result = await service.getMeetingDetails(
        mockMeetingId.data,
        mockUserId.data,
        { includeDocuments: true }
      )

      expect(result.success).toBe(true)
      if (result.success) {
        // Observer should only see public documents
        expect(result.data.documents).toHaveLength(1)
        expect(result.data.documents[0].title).toBe('Public Minutes Draft')
      }
    })
  })

  describe('joinMeeting', () => {
    const mockMeetingId = createMeetingId('test-meeting-123')
    const mockUserId = createUserId('user-456')
    const mockParticipantId = createParticipantId('participant-789')

    it('allows participant to join meeting successfully', async () => {
      if (!mockMeetingId.success || !mockUserId.success || !mockParticipantId.success) return

      // Mock permission check
      mockPermissionService.checkParticipantPermissions.mockResolvedValue({
        success: true,
        data: { canJoin: true, participantId: mockParticipantId.data }
      })

      // Mock repository response
      mockRepository.recordParticipantJoin.mockResolvedValue({
        success: true,
        data: {
          participantId: mockParticipantId.data,
          joinedAt: new Date(),
          status: 'joined'
        }
      })

      const result = await service.joinMeeting(mockMeetingId.data, mockUserId.data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('joined')
        expect(result.data.joinedAt).toBeInstanceOf(Date)
      }

      // Should publish join event
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ParticipantJoined',
          meetingId: mockMeetingId.data,
          participantId: mockParticipantId.data
        })
      )
    })

    it('prevents unauthorized users from joining', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.checkParticipantPermissions.mockResolvedValue({
        success: true,
        data: { canJoin: false, reason: 'not_invited' }
      })

      const result = await service.joinMeeting(mockMeetingId.data, mockUserId.data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('JOIN_DENIED')
      }

      expect(mockRepository.recordParticipantJoin).not.toHaveBeenCalled()
    })

    it('handles duplicate join attempts gracefully', async () => {
      if (!mockMeetingId.success || !mockUserId.success || !mockParticipantId.success) return

      mockPermissionService.checkParticipantPermissions.mockResolvedValue({
        success: true,
        data: { canJoin: true, participantId: mockParticipantId.data }
      })

      mockRepository.recordParticipantJoin.mockResolvedValue({
        success: false,
        error: { code: 'ALREADY_JOINED', message: 'Participant already joined' }
      })

      const result = await service.joinMeeting(mockMeetingId.data, mockUserId.data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('ALREADY_JOINED')
      }
    })

    it('sends notifications to other participants on join', async () => {
      if (!mockMeetingId.success || !mockUserId.success || !mockParticipantId.success) return

      mockPermissionService.checkParticipantPermissions.mockResolvedValue({
        success: true,
        data: { canJoin: true, participantId: mockParticipantId.data }
      })

      mockRepository.recordParticipantJoin.mockResolvedValue({
        success: true,
        data: {
          participantId: mockParticipantId.data,
          joinedAt: new Date(),
          status: 'joined'
        }
      })

      // Mock other participants
      mockRepository.getParticipants.mockResolvedValue({
        success: true,
        data: [
          { id: 'p1', name: 'John Doe', status: 'joined' },
          { id: 'p2', name: 'Jane Smith', status: 'confirmed' }
        ]
      })

      await service.joinMeeting(mockMeetingId.data, mockUserId.data)

      // Should notify other joined participants
      expect(mockNotificationService.sendBulkNotifications).toHaveBeenCalled()
    })
  })

  describe('leaveMeeting', () => {
    const mockMeetingId = createMeetingId('test-meeting-123')
    const mockUserId = createUserId('user-456')
    const mockParticipantId = createParticipantId('participant-789')

    it('allows participant to leave meeting', async () => {
      if (!mockMeetingId.success || !mockUserId.success || !mockParticipantId.success) return

      mockPermissionService.checkParticipantPermissions.mockResolvedValue({
        success: true,
        data: { canLeave: true, participantId: mockParticipantId.data }
      })

      mockRepository.recordParticipantLeave.mockResolvedValue({
        success: true,
        data: {
          participantId: mockParticipantId.data,
          leftAt: new Date(),
          status: 'left'
        }
      })

      const result = await service.leaveMeeting(mockMeetingId.data, mockUserId.data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('left')
      }

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ParticipantLeft',
          meetingId: mockMeetingId.data,
          participantId: mockParticipantId.data
        })
      )
    })
  })

  describe('addMeetingNote', () => {
    const mockMeetingId = createMeetingId('test-meeting-123')
    const mockUserId = createUserId('user-456')

    it('adds meeting note with permission check', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canAddNotes.mockResolvedValue({
        success: true,
        data: { canAdd: true }
      })

      const noteData = {
        content: 'Important discussion about quarterly targets',
        noteType: 'general' as const,
        visibility: 'all' as const
      }

      mockRepository.addMeetingNote.mockResolvedValue({
        success: true,
        data: {
          id: 'note-123',
          content: noteData.content,
          noteType: noteData.noteType,
          authorId: mockUserId.data,
          createdAt: new Date()
        }
      })

      const result = await service.addMeetingNote(
        mockMeetingId.data,
        mockUserId.data,
        noteData
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe(noteData.content)
        expect(result.data.authorId).toBe(mockUserId.data)
      }
    })

    it('validates note content before saving', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canAddNotes.mockResolvedValue({
        success: true,
        data: { canAdd: true }
      })

      const invalidNoteData = {
        content: '', // Empty content
        noteType: 'general' as const,
        visibility: 'all' as const
      }

      const result = await service.addMeetingNote(
        mockMeetingId.data,
        mockUserId.data,
        invalidNoteData
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_NOTE_CONTENT')
      }

      expect(mockRepository.addMeetingNote).not.toHaveBeenCalled()
    })

    it('applies content filtering and sanitization', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canAddNotes.mockResolvedValue({
        success: true,
        data: { canAdd: true }
      })

      const noteWithUnsafeContent = {
        content: 'Discussion about <script>alert("xss")</script> quarterly targets',
        noteType: 'general' as const,
        visibility: 'all' as const
      }

      mockRepository.addMeetingNote.mockResolvedValue({
        success: true,
        data: {
          id: 'note-123',
          content: 'Discussion about  quarterly targets', // Sanitized
          noteType: noteWithUnsafeContent.noteType,
          authorId: mockUserId.data,
          createdAt: new Date()
        }
      })

      const result = await service.addMeetingNote(
        mockMeetingId.data,
        mockUserId.data,
        noteWithUnsafeContent
      )

      expect(result.success).toBe(true)
      if (result.success) {
        // Content should be sanitized
        expect(result.data.content).not.toContain('<script>')
        expect(result.data.content).toContain('quarterly targets')
      }
    })

    it('publishes note added event for real-time updates', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canAddNotes.mockResolvedValue({
        success: true,
        data: { canAdd: true }
      })

      const noteData = {
        content: 'Important discussion point',
        noteType: 'general' as const,
        visibility: 'all' as const
      }

      mockRepository.addMeetingNote.mockResolvedValue({
        success: true,
        data: {
          id: 'note-123',
          content: noteData.content,
          noteType: noteData.noteType,
          authorId: mockUserId.data,
          createdAt: new Date()
        }
      })

      await service.addMeetingNote(mockMeetingId.data, mockUserId.data, noteData)

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MeetingNoteAdded',
          meetingId: mockMeetingId.data,
          noteId: 'note-123'
        })
      )
    })
  })

  describe('castVote', () => {
    const mockMeetingId = createMeetingId('test-meeting-123')
    const mockUserId = createUserId('user-456')
    const mockResolutionId = 'resolution-789'

    it('casts vote successfully with permission check', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canVote.mockResolvedValue({
        success: true,
        data: { canVote: true, votingRights: 'full' }
      })

      const voteData = {
        vote: 'approve' as const,
        comment: 'I support this resolution'
      }

      mockRepository.addVote.mockResolvedValue({
        success: true,
        data: {
          id: 'vote-123',
          resolutionId: mockResolutionId,
          participantId: 'participant-456',
          vote: voteData.vote,
          comment: voteData.comment,
          votedAt: new Date()
        }
      })

      const result = await service.castVote(
        mockMeetingId.data,
        mockUserId.data,
        mockResolutionId,
        voteData
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.vote).toBe('approve')
        expect(result.data.comment).toBe(voteData.comment)
      }

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'VoteCast',
          meetingId: mockMeetingId.data,
          resolutionId: mockResolutionId,
          vote: 'approve'
        })
      )
    })

    it('prevents voting without proper permissions', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canVote.mockResolvedValue({
        success: true,
        data: { canVote: false, reason: 'observer_role' }
      })

      const voteData = {
        vote: 'approve' as const,
        comment: 'I support this resolution'
      }

      const result = await service.castVote(
        mockMeetingId.data,
        mockUserId.data,
        mockResolutionId,
        voteData
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('VOTING_DENIED')
      }

      expect(mockRepository.addVote).not.toHaveBeenCalled()
    })

    it('handles vote changes and audit trail', async () => {
      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canVote.mockResolvedValue({
        success: true,
        data: { canVote: true, votingRights: 'full' }
      })

      // Mock existing vote
      mockRepository.addVote.mockResolvedValue({
        success: false,
        error: { code: 'VOTE_EXISTS', message: 'Vote already cast' }
      })

      const voteData = {
        vote: 'reject' as const,
        comment: 'Changed my mind after discussion'
      }

      const result = await service.castVote(
        mockMeetingId.data,
        mockUserId.data,
        mockResolutionId,
        voteData
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('VOTE_EXISTS')
      }
    })
  })

  describe('Business Logic and Validation', () => {
    it('validates meeting timing constraints', async () => {
      const mockMeetingId = createMeetingId('past-meeting')
      const mockUserId = createUserId('user-123')

      if (!mockMeetingId.success || !mockUserId.success) return

      // Mock past meeting
      const pastMeetingData = {
        meeting: {
          id: mockMeetingId.data,
          title: 'Past Meeting',
          status: 'completed' as const,
          scheduledEnd: new Date(Date.now() - 86400000) // Yesterday
        },
        participants: [],
        agendaItems: [],
        documents: [],
        minutes: null,
        resolutions: [],
        actionItems: [],
        metadata: {
          participantCount: 0,
          confirmedCount: 0,
          documentCount: 0,
          totalDuration: 0,
          lastUpdated: new Date()
        }
      }

      mockPermissionService.checkParticipantPermissions.mockResolvedValue({
        success: true,
        data: { canJoin: true, participantId: 'participant-123' }
      })

      mockRepository.getMeetingDetails.mockResolvedValue({
        success: true,
        data: pastMeetingData
      })

      const result = await service.joinMeeting(mockMeetingId.data, mockUserId.data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('MEETING_ENDED')
      }
    })

    it('applies quorum validation for voting', async () => {
      const mockMeetingId = createMeetingId('test-meeting')
      const mockUserId = createUserId('user-123')

      if (!mockMeetingId.success || !mockUserId.success) return

      // Mock insufficient quorum
      mockRepository.getParticipants.mockResolvedValue({
        success: true,
        data: [
          { id: 'p1', status: 'joined', role: 'member' },
          { id: 'p2', status: 'confirmed', role: 'member' }
        ]
      })

      const result = await service.checkVotingEligibility(
        mockMeetingId.data,
        'resolution-123'
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INSUFFICIENT_QUORUM')
      }
    })
  })

  describe('Error Handling and Recovery', () => {
    it('implements circuit breaker for external service calls', async () => {
      const mockMeetingId = createMeetingId('test-meeting')
      const mockUserId = createUserId('user-123')

      if (!mockMeetingId.success || !mockUserId.success) return

      // Mock repeated failures
      mockPermissionService.canViewMeetingDetails
        .mockResolvedValueOnce({ success: false, error: { code: 'SERVICE_ERROR' } })
        .mockResolvedValueOnce({ success: false, error: { code: 'SERVICE_ERROR' } })
        .mockResolvedValueOnce({ success: false, error: { code: 'SERVICE_ERROR' } })

      // Multiple calls should trigger circuit breaker
      await service.getMeetingDetails(mockMeetingId.data, mockUserId.data)
      await service.getMeetingDetails(mockMeetingId.data, mockUserId.data)
      const result = await service.getMeetingDetails(mockMeetingId.data, mockUserId.data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('SERVICE_UNAVAILABLE')
      }
    })

    it('provides degraded functionality during outages', async () => {
      const mockMeetingId = createMeetingId('test-meeting')
      const mockUserId = createUserId('user-123')

      if (!mockMeetingId.success || !mockUserId.success) return

      // Mock service degradation
      mockPermissionService.canViewMeetingDetails.mockResolvedValue({
        success: true,
        data: { canView: true, reason: 'participant' }
      })

      mockRepository.getMeetingDetails.mockResolvedValue({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database temporarily unavailable' }
      })

      const result = await service.getMeetingDetails(
        mockMeetingId.data,
        mockUserId.data,
        { degradedMode: true }
      )

      // Should return basic meeting info from cache/fallback
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.meeting.id).toBe(mockMeetingId.data)
        expect(result.data.metadata.degradedMode).toBe(true)
      }
    })
  })

  describe('Performance and Caching', () => {
    it('implements intelligent caching for frequently accessed data', async () => {
      const mockMeetingId = createMeetingId('popular-meeting')
      const mockUserId = createUserId('user-123')

      if (!mockMeetingId.success || !mockUserId.success) return

      mockPermissionService.canViewMeetingDetails.mockResolvedValue({
        success: true,
        data: { canView: true, reason: 'participant' }
      })

      const mockData = {
        meeting: { id: mockMeetingId.data, title: 'Popular Meeting' },
        participants: [],
        agendaItems: [],
        documents: [],
        minutes: null,
        resolutions: [],
        actionItems: [],
        metadata: { participantCount: 0, confirmedCount: 0, documentCount: 0, totalDuration: 0, lastUpdated: new Date() }
      }

      mockRepository.getMeetingDetails.mockResolvedValue({
        success: true,
        data: mockData
      })

      // First call
      await service.getMeetingDetails(mockMeetingId.data, mockUserId.data)
      
      // Second call (should use cache)
      await service.getMeetingDetails(mockMeetingId.data, mockUserId.data)

      // Repository should only be called once due to caching
      expect(mockRepository.getMeetingDetails).toHaveBeenCalledTimes(1)
    })

    it('implements request batching for multiple concurrent calls', async () => {
      const mockMeetingId = createMeetingId('batch-meeting')
      const mockUserId1 = createUserId('user-1')
      const mockUserId2 = createUserId('user-2')

      if (!mockMeetingId.success || !mockUserId1.success || !mockUserId2.success) return

      mockPermissionService.canViewMeetingDetails.mockResolvedValue({
        success: true,
        data: { canView: true, reason: 'participant' }
      })

      mockRepository.getMeetingDetails.mockResolvedValue({
        success: true,
        data: {
          meeting: { id: mockMeetingId.data, title: 'Batch Meeting' },
          participants: [],
          agendaItems: [],
          documents: [],
          minutes: null,
          resolutions: [],
          actionItems: [],
          metadata: { participantCount: 0, confirmedCount: 0, documentCount: 0, totalDuration: 0, lastUpdated: new Date() }
        }
      })

      // Concurrent calls for same meeting
      const [result1, result2] = await Promise.all([
        service.getMeetingDetails(mockMeetingId.data, mockUserId1.data),
        service.getMeetingDetails(mockMeetingId.data, mockUserId2.data)
      ])

      expect(result1.success && result2.success).toBe(true)
      
      // Should batch requests and call repository only once
      expect(mockRepository.getMeetingDetails).toHaveBeenCalledTimes(1)
    })
  })

  describe('Real-time Updates and Events', () => {
    it('subscribes to relevant events on service initialization', () => {
      // Verify event subscriptions
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'ParticipantJoined',
        expect.any(Function)
      )
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'MeetingStatusChanged',
        expect.any(Function)
      )
      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'VoteCast',
        expect.any(Function)
      )
    })

    it('invalidates cache on relevant updates', async () => {
      const mockMeetingId = createMeetingId('test-meeting')

      if (!mockMeetingId.success) return

      // Simulate meeting update event
      const updateEvent = {
        type: 'MeetingStatusChanged',
        meetingId: mockMeetingId.data,
        newStatus: 'in_progress',
        timestamp: new Date()
      }

      // Trigger event handler
      await service.handleMeetingUpdate(updateEvent)

      // Should clear cache for the meeting
      expect(mockRepository.clearCacheForMeeting).toHaveBeenCalledWith(
        mockMeetingId.data
      )
    })
  })
})