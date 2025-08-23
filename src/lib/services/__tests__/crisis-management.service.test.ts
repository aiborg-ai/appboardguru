/**
 * Crisis Management Service Tests
 * Comprehensive test suite for the core Crisis Management service
 */

import { CrisisManagementService } from '../crisis-management.service';
import { createClient } from '@supabase/supabase-js';

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
  rpc: jest.fn(),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn()
  }))
};

describe('CrisisManagementService', () => {
  let crisisService: CrisisManagementService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    crisisService = new CrisisManagementService(mockSupabaseClient as any);
  });

  describe('Incident Management', () => {
    const mockIncident = {
      title: 'Test Crisis Incident',
      description: 'This is a test crisis incident for unit testing',
      category: 'operational' as const,
      severity_level: 'high' as const,
      status: 'active' as const,
      reported_by: 'test-user-id',
      affected_systems: ['trading', 'compliance'],
      estimated_impact: 'High impact on trading operations',
      response_priority: 1,
      tags: ['trading', 'urgent'],
      location: 'New York Office',
      external_agencies_notified: false
    };

    it('should create incident successfully', async () => {
      const mockResponse = {
        data: [{ id: 'incident-123', ...mockIncident }],
        error: null
      };
      
      mockSupabaseClient.from().insert().single.mockResolvedValue(mockResponse);

      const result = await crisisService.createIncident(mockIncident);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('incident-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('crisis_incidents');
    });

    it('should handle incident creation failure', async () => {
      const mockError = { message: 'Database error', code: 'DB_ERROR' };
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: null,
        error: mockError
      });

      const result = await crisisService.createIncident(mockIncident);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Database error');
    });

    it('should update incident status', async () => {
      const incidentId = 'incident-123';
      const updates = {
        status: 'resolved' as const,
        resolution_summary: 'Issue resolved successfully',
        resolved_at: new Date().toISOString()
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: incidentId, ...updates },
        error: null
      });

      const result = await crisisService.updateIncident(incidentId, updates);
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('resolved');
    });

    it('should get incident by ID', async () => {
      const incidentId = 'incident-123';
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: { id: incidentId, ...mockIncident },
        error: null
      });

      const result = await crisisService.getIncidentById(incidentId);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(incidentId);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('crisis_incidents');
    });

    it('should list incidents with filters', async () => {
      const filters = {
        status: 'active' as const,
        category: 'operational' as const,
        severity_level: 'high' as const
      };

      mockSupabaseClient.from().select().eq().eq().eq().order().mockResolvedValue({
        data: [{ id: 'incident-123', ...mockIncident }],
        error: null
      });

      const result = await crisisService.getIncidents(filters);
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should escalate incident', async () => {
      const incidentId = 'incident-123';
      const escalationDetails = {
        escalated_to: 'board-chair',
        escalation_reason: 'Critical impact requires board attention',
        escalated_by: 'crisis-manager'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: incidentId, escalation_level: 'board', ...escalationDetails },
        error: null
      });

      const result = await crisisService.escalateIncident(incidentId, escalationDetails);
      
      expect(result.success).toBe(true);
      expect(result.data?.escalation_level).toBe('board');
    });
  });

  describe('Emergency Meeting Management', () => {
    const mockMeeting = {
      incident_id: 'incident-123',
      meeting_type: 'emergency_board' as const,
      urgency_level: 'critical' as const,
      scheduled_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      duration_minutes: 60,
      meeting_platform: 'zoom',
      agenda_items: ['Incident Review', 'Response Strategy'],
      required_attendees: ['board-chair', 'ceo', 'legal-counsel'],
      optional_attendees: ['cfo'],
      background_materials: [],
      security_classification: 'confidential' as const,
      scheduled_by: 'crisis-manager'
    };

    it('should schedule emergency meeting', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'meeting-123', ...mockMeeting },
        error: null
      });

      const result = await crisisService.scheduleEmergencyMeeting(mockMeeting);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('meeting-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('emergency_board_meetings');
    });

    it('should get upcoming meetings', async () => {
      mockSupabaseClient.from().select().gte().order().mockResolvedValue({
        data: [{ id: 'meeting-123', ...mockMeeting }],
        error: null
      });

      const result = await crisisService.getUpcomingMeetings();
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should update meeting status', async () => {
      const meetingId = 'meeting-123';
      const updates = {
        status: 'completed' as const,
        actual_duration: 75,
        meeting_notes: 'Crisis response strategy approved'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: meetingId, ...updates },
        error: null
      });

      const result = await crisisService.updateMeetingStatus(meetingId, updates);
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
    });
  });

  describe('Crisis Communication Management', () => {
    const mockCommunication = {
      incident_id: 'incident-123',
      message_type: 'stakeholder_update' as const,
      content: 'We are aware of the current situation and are working to resolve it.',
      target_audiences: ['investors', 'employees'],
      channels: ['email', 'website'],
      approval_status: 'pending_review' as const,
      scheduled_send_time: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
      urgency_level: 'high' as const,
      created_by: 'communications-manager',
      template_used: 'stakeholder-incident-update'
    };

    it('should create crisis communication', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'comm-123', ...mockCommunication },
        error: null
      });

      const result = await crisisService.createCrisisCommunication(mockCommunication);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('comm-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('crisis_communications');
    });

    it('should approve communication message', async () => {
      const messageId = 'comm-123';
      const approvalData = {
        approved_by: 'legal-counsel',
        approval_notes: 'Content approved for release'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: messageId, approval_status: 'approved', ...approvalData },
        error: null
      });

      const result = await crisisService.approveCommunication(messageId, approvalData);
      
      expect(result.success).toBe(true);
      expect(result.data?.approval_status).toBe('approved');
    });

    it('should get pending communications', async () => {
      mockSupabaseClient.from().select().in().order().mockResolvedValue({
        data: [{ id: 'comm-123', ...mockCommunication }],
        error: null
      });

      const result = await crisisService.getPendingCommunications();
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });
  });

  describe('Situation Monitoring', () => {
    it('should get active alerts', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          alert_type: 'market_volatility',
          severity: 'high',
          status: 'active',
          description: 'Unusual market activity detected'
        }
      ];

      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: mockAlerts,
        error: null
      });

      const result = await crisisService.getActiveAlerts();
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('situation_alerts');
    });

    it('should create monitoring alert', async () => {
      const alertData = {
        alert_type: 'news_mention' as const,
        severity: 'medium' as const,
        source: 'Reuters',
        description: 'Negative news article published',
        metadata: { url: 'https://reuters.com/article', sentiment: 'negative' },
        detected_at: new Date().toISOString()
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'alert-123', ...alertData },
        error: null
      });

      const result = await crisisService.createMonitoringAlert(alertData);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('alert-123');
    });
  });

  describe('Analytics and Reporting', () => {
    it('should get crisis analytics', async () => {
      const dateRange = {
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-12-31T23:59:59Z'
      };

      const mockAnalytics = {
        total_incidents: 25,
        resolved_incidents: 20,
        active_incidents: 5,
        avg_resolution_time_hours: 18.5,
        incidents_by_category: {
          operational: 10,
          financial: 8,
          regulatory: 4,
          reputational: 3
        },
        incidents_by_severity: {
          low: 5,
          medium: 12,
          high: 6,
          critical: 2
        },
        monthly_trend: []
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockAnalytics,
        error: null
      });

      const result = await crisisService.getCrisisAnalytics(dateRange);
      
      expect(result.success).toBe(true);
      expect(result.data?.total_incidents).toBe(25);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_crisis_analytics',
        expect.objectContaining(dateRange)
      );
    });

    it('should get dashboard summary', async () => {
      const mockSummary = {
        active_incidents: 3,
        pending_communications: 2,
        upcoming_meetings: 1,
        active_alerts: 5,
        recent_activity: []
      };

      mockSupabaseClient.from().select().single.mockResolvedValue({
        data: mockSummary,
        error: null
      });

      const result = await crisisService.getDashboardSummary();
      
      expect(result.success).toBe(true);
      expect(result.data?.active_incidents).toBe(3);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('crisis_dashboard_summary');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseClient.from().select().single.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await crisisService.getIncidentById('test-id');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Connection failed');
    });

    it('should handle validation errors', async () => {
      const invalidIncident = {
        title: '', // Invalid empty title
        description: 'Test',
        category: 'invalid-category' as any,
        severity_level: 'invalid-severity' as any
      };

      const result = await crisisService.createIncident(invalidIncident);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('validation');
    });

    it('should handle missing resource errors', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      });

      const result = await crisisService.getIncidentById('non-existent-id');
      
      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(404);
    });
  });

  describe('Real-time Features', () => {
    it('should set up real-time subscriptions', () => {
      const mockCallback = jest.fn();
      
      crisisService.subscribeToIncidentUpdates(mockCallback);
      
      expect(mockSupabaseClient.channel).toHaveBeenCalled();
    });

    it('should handle real-time incident updates', () => {
      const mockCallback = jest.fn();
      const mockUpdate = {
        eventType: 'UPDATE',
        new: { id: 'incident-123', status: 'resolved' },
        old: { id: 'incident-123', status: 'active' }
      };

      crisisService.subscribeToIncidentUpdates(mockCallback);
      
      // Simulate real-time update
      const channelMock = mockSupabaseClient.channel();
      const onCallback = channelMock.on.mock.calls[0][2];
      onCallback(mockUpdate);
      
      expect(mockCallback).toHaveBeenCalledWith(mockUpdate);
    });
  });

  describe('Integration Features', () => {
    it('should trigger automated workflows', async () => {
      const incidentId = 'incident-123';
      
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { workflows_triggered: ['escalation', 'notification'] },
        error: null
      });

      const result = await crisisService.triggerAutomatedWorkflows(incidentId);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'trigger_incident_workflows',
        { incident_id: incidentId }
      );
    });

    it('should export crisis data', async () => {
      const exportConfig = {
        format: 'json' as const,
        include_resolved: true,
        date_range: {
          start: '2024-01-01',
          end: '2024-12-31'
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: { export_id: 'export-123', download_url: 'https://example.com/download' },
        error: null
      });

      const result = await crisisService.exportCrisisData(exportConfig);
      
      expect(result.success).toBe(true);
      expect(result.data?.export_id).toBe('export-123');
    });
  });
});