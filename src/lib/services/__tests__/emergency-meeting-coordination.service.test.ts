/**
 * Emergency Meeting Coordination Service Tests
 * Test suite for emergency board meeting scheduling and coordination
 */

import { EmergencyMeetingCoordinationService } from '../emergency-meeting-coordination.service';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  })),
  rpc: jest.fn()
};

describe('EmergencyMeetingCoordinationService', () => {
  let meetingService: EmergencyMeetingCoordinationService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    meetingService = new EmergencyMeetingCoordinationService(mockSupabaseClient as any);
  });

  describe('Meeting Scheduling', () => {
    const mockMeetingData = {
      incident_id: 'incident-123',
      meeting_type: 'emergency_board' as const,
      urgency_level: 'critical' as const,
      scheduled_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      duration_minutes: 60,
      meeting_platform: 'zoom',
      platform_details: {
        meeting_url: 'https://zoom.us/j/123456789',
        meeting_id: '123456789',
        passcode: 'crisis2024'
      },
      agenda_items: [
        'Incident Overview and Current Status',
        'Response Strategy Discussion',
        'Communication Plan Approval'
      ],
      required_attendees: ['board-chair', 'ceo', 'legal-counsel'],
      optional_attendees: ['cfo', 'cto'],
      background_materials: [
        {
          title: 'Incident Report',
          url: 'https://secure.example.com/incident-report.pdf',
          access_level: 'confidential'
        }
      ],
      security_classification: 'confidential' as const,
      scheduled_by: 'crisis-manager'
    };

    it('should schedule emergency meeting successfully', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'meeting-123', ...mockMeetingData },
        error: null
      });

      const result = await meetingService.scheduleEmergencyMeeting(mockMeetingData);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('meeting-123');
      expect(result.data?.meeting_type).toBe('emergency_board');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('emergency_board_meetings');
    });

    it('should validate meeting scheduling parameters', async () => {
      const invalidMeeting = {
        ...mockMeetingData,
        scheduled_at: new Date(Date.now() - 3600000).toISOString(), // Past date
        required_attendees: [] // Empty required attendees
      };

      const result = await meetingService.scheduleEmergencyMeeting(invalidMeeting);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('validation');
    });

    it('should find available meeting slots', async () => {
      const attendeeIds = ['board-chair', 'ceo', 'legal-counsel'];
      const duration = 60;
      const urgencyLevel = 'critical';

      const availableSlots = [
        {
          start_time: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
          end_time: new Date(Date.now() + 5400000).toISOString(),   // 90 minutes from now
          availability_score: 0.95,
          conflicting_attendees: []
        },
        {
          start_time: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
          end_time: new Date(Date.now() + 10800000).toISOString(),  // 3 hours from now
          availability_score: 1.0,
          conflicting_attendees: []
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: availableSlots,
        error: null
      });

      const result = await meetingService.findAvailableSlots(
        attendeeIds,
        duration,
        urgencyLevel
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
      expect(result.data?.[1].availability_score).toBe(1.0);
    });

    it('should handle scheduling conflicts', async () => {
      const conflictingMeeting = {
        ...mockMeetingData,
        scheduled_at: new Date(Date.now() + 1800000).toISOString()
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: null,
        error: {
          code: 'SCHEDULING_CONFLICT',
          message: 'Board chair has conflicting meeting at requested time'
        }
      });

      const result = await meetingService.scheduleEmergencyMeeting(conflictingMeeting);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('conflicting meeting');
    });
  });

  describe('Attendee Management', () => {
    const mockAttendeeData = {
      meeting_id: 'meeting-123',
      user_id: 'board-member-1',
      role: 'required' as const,
      response_status: 'pending' as const,
      invited_at: new Date().toISOString()
    };

    it('should manage meeting attendees', async () => {
      mockSupabaseClient.from().insert().mockResolvedValue({
        data: [mockAttendeeData],
        error: null
      });

      const result = await meetingService.addAttendees('meeting-123', [
        { user_id: 'board-member-1', role: 'required' },
        { user_id: 'board-member-2', role: 'optional' }
      ]);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meeting_attendees');
    });

    it('should track attendee responses', async () => {
      const responseData = {
        response_status: 'accepted' as const,
        response_time: new Date().toISOString(),
        notes: 'Will join via mobile due to travel'
      };

      mockSupabaseClient.from().update().eq().eq().single.mockResolvedValue({
        data: { ...mockAttendeeData, ...responseData },
        error: null
      });

      const result = await meetingService.recordAttendeeResponse(
        'meeting-123',
        'board-member-1',
        responseData
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.response_status).toBe('accepted');
    });

    it('should check meeting quorum', async () => {
      const quorumStatus = {
        required_attendees: 7,
        confirmed_attendees: 5,
        pending_responses: 2,
        quorum_met: false,
        quorum_threshold: 6,
        missing_critical_roles: ['legal-counsel']
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: quorumStatus,
        error: null
      });

      const result = await meetingService.checkQuorumStatus('meeting-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.quorum_met).toBe(false);
      expect(result.data?.missing_critical_roles).toContain('legal-counsel');
    });

    it('should send meeting reminders', async () => {
      const reminderResult = {
        reminders_sent: 5,
        failed_reminders: 0,
        delivery_details: [
          { user_id: 'board-chair', channel: 'email', status: 'delivered' },
          { user_id: 'ceo', channel: 'sms', status: 'delivered' }
        ]
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: reminderResult,
        error: null
      });

      const result = await meetingService.sendMeetingReminders(
        'meeting-123',
        15 // 15 minutes before meeting
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.reminders_sent).toBe(5);
      expect(result.data?.failed_reminders).toBe(0);
    });
  });

  describe('Meeting Execution', () => {
    const mockMeetingUpdate = {
      status: 'in_progress' as const,
      started_at: new Date().toISOString(),
      actual_attendees: ['board-chair', 'ceo', 'legal-counsel'],
      meeting_notes: 'Crisis response meeting in progress'
    };

    it('should start meeting session', async () => {
      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: 'meeting-123', ...mockMeetingUpdate },
        error: null
      });

      const result = await meetingService.startMeeting('meeting-123', mockMeetingUpdate);
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('in_progress');
      expect(result.data?.actual_attendees).toContain('board-chair');
    });

    it('should record meeting decisions', async () => {
      const decisionData = {
        meeting_id: 'meeting-123',
        decision_type: 'response_approval' as const,
        description: 'Approved immediate public communication regarding the incident',
        proposed_by: 'ceo',
        voting_method: 'voice_vote' as const,
        votes: [
          { user_id: 'board-chair', vote: 'approve', timestamp: new Date().toISOString() },
          { user_id: 'ceo', vote: 'approve', timestamp: new Date().toISOString() },
          { user_id: 'legal-counsel', vote: 'approve', timestamp: new Date().toISOString() }
        ],
        outcome: 'approved' as const,
        implementation_deadline: new Date(Date.now() + 3600000).toISOString()
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'decision-123', ...decisionData },
        error: null
      });

      const result = await meetingService.recordDecision(decisionData);
      
      expect(result.success).toBe(true);
      expect(result.data?.outcome).toBe('approved');
      expect(result.data?.votes?.length).toBe(3);
    });

    it('should manage action items', async () => {
      const actionItems = [
        {
          meeting_id: 'meeting-123',
          title: 'Coordinate with external PR agency',
          description: 'Engage crisis communications specialist for media response',
          assigned_to: 'communications-director',
          priority: 'high' as const,
          due_date: new Date(Date.now() + 86400000).toISOString(), // 24 hours
          status: 'pending' as const
        },
        {
          meeting_id: 'meeting-123',
          title: 'Legal compliance review',
          description: 'Review regulatory notification requirements',
          assigned_to: 'legal-counsel',
          priority: 'critical' as const,
          due_date: new Date(Date.now() + 7200000).toISOString(), // 2 hours
          status: 'pending' as const
        }
      ];

      mockSupabaseClient.from().insert().mockResolvedValue({
        data: actionItems,
        error: null
      });

      const result = await meetingService.createActionItems('meeting-123', actionItems);
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[1].priority).toBe('critical');
    });

    it('should conclude meeting', async () => {
      const conclusionData = {
        status: 'completed' as const,
        ended_at: new Date().toISOString(),
        actual_duration: 75, // minutes
        meeting_summary: 'Crisis response plan approved and action items assigned',
        next_meeting_scheduled: new Date(Date.now() + 43200000).toISOString(), // 12 hours
        recording_available: true,
        recording_url: 'https://secure.example.com/meeting-recording-123'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: 'meeting-123', ...conclusionData },
        error: null
      });

      const result = await meetingService.concludeMeeting('meeting-123', conclusionData);
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
      expect(result.data?.actual_duration).toBe(75);
    });
  });

  describe('Meeting Materials Management', () => {
    const mockMaterial = {
      meeting_id: 'meeting-123',
      title: 'Incident Analysis Report',
      description: 'Comprehensive analysis of the current crisis situation',
      file_path: '/secure/documents/incident-analysis-123.pdf',
      file_size: 2048000, // 2MB
      access_level: 'confidential' as const,
      uploaded_by: 'crisis-manager',
      upload_time: new Date().toISOString()
    };

    it('should upload meeting materials', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'material-123', ...mockMaterial },
        error: null
      });

      const result = await meetingService.uploadMeetingMaterial(mockMaterial);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('material-123');
      expect(result.data?.access_level).toBe('confidential');
    });

    it('should track material access', async () => {
      const accessLog = {
        material_id: 'material-123',
        user_id: 'board-member-1',
        accessed_at: new Date().toISOString(),
        access_method: 'download' as const,
        ip_address: '192.168.1.100'
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'access-log-123', ...accessLog },
        error: null
      });

      const result = await meetingService.logMaterialAccess(accessLog);
      
      expect(result.success).toBe(true);
      expect(result.data?.access_method).toBe('download');
    });

    it('should get meeting materials with access control', async () => {
      const userId = 'board-member-1';
      const meetingId = 'meeting-123';

      const authorizedMaterials = [
        {
          id: 'material-123',
          title: 'Incident Analysis Report',
          access_level: 'confidential',
          user_has_access: true
        },
        {
          id: 'material-124',
          title: 'Board Resolution Draft',
          access_level: 'restricted',
          user_has_access: false
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: authorizedMaterials,
        error: null
      });

      const result = await meetingService.getMeetingMaterials(meetingId, userId);
      
      expect(result.success).toBe(true);
      expect(result.data?.[0].user_has_access).toBe(true);
      expect(result.data?.[1].user_has_access).toBe(false);
    });
  });

  describe('Meeting Analytics', () => {
    it('should get meeting effectiveness metrics', async () => {
      const metrics = {
        total_meetings: 12,
        average_response_time_minutes: 45,
        average_duration_minutes: 68,
        quorum_achievement_rate: 0.92,
        decision_rate_per_meeting: 3.2,
        action_item_completion_rate: 0.87,
        attendee_satisfaction_score: 4.3,
        most_active_participants: [
          { user_id: 'board-chair', participation_score: 0.95 },
          { user_id: 'ceo', participation_score: 0.88 }
        ]
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: metrics,
        error: null
      });

      const result = await meetingService.getMeetingMetrics({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.total_meetings).toBe(12);
      expect(result.data?.quorum_achievement_rate).toBeGreaterThan(0.9);
    });

    it('should analyze meeting patterns', async () => {
      const patterns = {
        peak_hours: [
          { hour: 9, meeting_count: 8 },
          { hour: 14, meeting_count: 12 },
          { hour: 16, meeting_count: 6 }
        ],
        common_urgency_levels: [
          { level: 'critical', count: 15, percentage: 0.45 },
          { level: 'high', count: 12, percentage: 0.36 }
        ],
        average_notice_time_minutes: 35,
        scheduling_success_rate: 0.94
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: patterns,
        error: null
      });

      const result = await meetingService.analyzeMeetingPatterns();
      
      expect(result.success).toBe(true);
      expect(result.data?.peak_hours?.length).toBeGreaterThan(0);
      expect(result.data?.scheduling_success_rate).toBeGreaterThan(0.9);
    });
  });

  describe('Error Handling', () => {
    it('should handle meeting platform integration failures', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: null,
        error: { message: 'Zoom integration failed', code: 'PLATFORM_ERROR' }
      });

      const result = await meetingService.scheduleEmergencyMeeting({
        incident_id: 'incident-123',
        meeting_type: 'emergency_board',
        urgency_level: 'critical',
        scheduled_at: new Date(Date.now() + 3600000).toISOString(),
        duration_minutes: 60,
        meeting_platform: 'zoom',
        required_attendees: ['board-chair'],
        scheduled_by: 'crisis-manager'
      } as any);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Zoom integration failed');
    });

    it('should handle insufficient attendee availability', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await meetingService.findAvailableSlots(
        ['board-chair', 'ceo', 'legal-counsel'],
        60,
        'critical'
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(0);
    });

    it('should validate meeting security requirements', async () => {
      const insecureMeeting = {
        incident_id: 'incident-123',
        meeting_type: 'emergency_board' as const,
        urgency_level: 'critical' as const,
        scheduled_at: new Date(Date.now() + 3600000).toISOString(),
        duration_minutes: 60,
        meeting_platform: 'unsecure-platform', // Invalid platform
        security_classification: 'confidential' as const,
        required_attendees: ['board-chair'],
        scheduled_by: 'crisis-manager'
      };

      const result = await meetingService.scheduleEmergencyMeeting(insecureMeeting);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('security requirements');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from().select().single.mockRejectedValue(
        new Error('Database connection lost')
      );

      const result = await meetingService.checkQuorumStatus('meeting-123');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Database connection lost');
    });
  });
});