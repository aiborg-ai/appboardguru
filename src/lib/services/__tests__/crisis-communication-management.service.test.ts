/**
 * Crisis Communication Management Service Tests
 * Test suite for crisis communication templates, approval workflows, and distribution
 */

import { CrisisCommunicationManagementService } from '../crisis-communication-management.service';

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

describe('CrisisCommunicationManagementService', () => {
  let commService: CrisisCommunicationManagementService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    commService = new CrisisCommunicationManagementService(mockSupabaseClient as any);
  });

  describe('Template Management', () => {
    const mockTemplate = {
      name: 'Operational Incident Stakeholder Update',
      description: 'Template for updating stakeholders about operational incidents',
      category: 'stakeholder_update' as const,
      message_type: 'incident_notification' as const,
      subject: 'Important Update: {{incident_title}}',
      content: `Dear {{stakeholder_name}},

We are writing to inform you of an operational incident that occurred on {{incident_date}}. 

**Incident Summary:**
{{incident_description}}

**Current Status:**
{{current_status}}

**Impact Assessment:**
{{impact_assessment}}

**Next Steps:**
{{next_steps}}

We will continue to monitor the situation closely and provide updates as they become available.

Best regards,
{{sender_name}}
{{sender_title}}`,
      variables: [
        'incident_title',
        'stakeholder_name', 
        'incident_date',
        'incident_description',
        'current_status',
        'impact_assessment',
        'next_steps',
        'sender_name',
        'sender_title'
      ],
      target_audiences: ['investors', 'board_members', 'employees'],
      approval_required: true,
      pre_approved_scenarios: ['minor_operational_disruption'],
      compliance_notes: 'Ensure regulatory requirements are met for stakeholder communications',
      created_by: 'communications-manager'
    };

    it('should create communication template', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'template-123', ...mockTemplate },
        error: null
      });

      const result = await commService.createTemplate(mockTemplate);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('template-123');
      expect(result.data?.approval_required).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('communication_templates');
    });

    it('should get templates by category', async () => {
      const templates = [
        { id: 'template-1', name: 'Stakeholder Update', category: 'stakeholder_update' },
        { id: 'template-2', name: 'Media Statement', category: 'media_statement' }
      ];

      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: templates,
        error: null
      });

      const result = await commService.getTemplatesByCategory('stakeholder_update');
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[0].category).toBe('stakeholder_update');
    });

    it('should validate template variables', async () => {
      const templateData = mockTemplate.content;
      const providedVariables = {
        incident_title: 'Trading System Outage',
        stakeholder_name: 'John Doe',
        incident_date: '2024-01-15',
        // Missing required variables
      };

      const validationResult = {
        is_valid: false,
        missing_variables: ['incident_description', 'current_status', 'impact_assessment'],
        unused_variables: [],
        errors: ['Required variable incident_description not provided']
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: validationResult,
        error: null
      });

      const result = await commService.validateTemplateVariables(templateData, providedVariables);
      
      expect(result.success).toBe(true);
      expect(result.data?.is_valid).toBe(false);
      expect(result.data?.missing_variables).toContain('incident_description');
    });

    it('should render template with variables', async () => {
      const templateData = mockTemplate.content;
      const variables = {
        incident_title: 'Trading System Outage',
        stakeholder_name: 'John Doe',
        incident_date: '2024-01-15 14:30 UTC',
        incident_description: 'Primary trading system experienced complete outage',
        current_status: 'Systems restored, monitoring ongoing',
        impact_assessment: 'No data loss, minimal trading disruption',
        next_steps: 'Full system audit and enhanced monitoring implementation',
        sender_name: 'Jane Smith',
        sender_title: 'Chief Communications Officer'
      };

      const renderedContent = `Dear John Doe,

We are writing to inform you of an operational incident that occurred on 2024-01-15 14:30 UTC. 

**Incident Summary:**
Primary trading system experienced complete outage

**Current Status:**
Systems restored, monitoring ongoing

**Impact Assessment:**
No data loss, minimal trading disruption

**Next Steps:**
Full system audit and enhanced monitoring implementation

We will continue to monitor the situation closely and provide updates as they become available.

Best regards,
Jane Smith
Chief Communications Officer`;

      mockSupabaseClient.rpc.mockResolvedValue({
        data: { rendered_content: renderedContent },
        error: null
      });

      const result = await commService.renderTemplate('template-123', variables);
      
      expect(result.success).toBe(true);
      expect(result.data?.rendered_content).toContain('John Doe');
      expect(result.data?.rendered_content).toContain('Trading System Outage');
    });
  });

  describe('Message Creation and Management', () => {
    const mockMessage = {
      incident_id: 'incident-123',
      template_id: 'template-123',
      message_type: 'stakeholder_update' as const,
      subject: 'Important Update: Trading System Outage',
      content: 'Rendered message content here...',
      target_audiences: ['investors', 'board_members'],
      distribution_channels: ['email', 'website'],
      urgency_level: 'high' as const,
      scheduled_send_time: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
      approval_status: 'pending_review' as const,
      created_by: 'communications-manager',
      template_variables: {
        incident_title: 'Trading System Outage',
        incident_date: '2024-01-15 14:30 UTC'
      }
    };

    it('should create communication message', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'message-123', ...mockMessage },
        error: null
      });

      const result = await commService.createMessage(mockMessage);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('message-123');
      expect(result.data?.approval_status).toBe('pending_review');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('communication_messages');
    });

    it('should get messages by status', async () => {
      const pendingMessages = [
        {
          id: 'message-1',
          subject: 'Stakeholder Update',
          approval_status: 'pending_review',
          urgency_level: 'high'
        },
        {
          id: 'message-2', 
          subject: 'Media Statement',
          approval_status: 'pending_review',
          urgency_level: 'critical'
        }
      ];

      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: pendingMessages,
        error: null
      });

      const result = await commService.getMessagesByStatus('pending_review');
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[1].urgency_level).toBe('critical');
    });

    it('should update message content', async () => {
      const messageId = 'message-123';
      const updates = {
        content: 'Updated message content with additional details',
        subject: 'Updated: Trading System Outage Response',
        last_modified_by: 'legal-reviewer'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: messageId, ...updates },
        error: null
      });

      const result = await commService.updateMessage(messageId, updates);
      
      expect(result.success).toBe(true);
      expect(result.data?.last_modified_by).toBe('legal-reviewer');
    });
  });

  describe('Approval Workflow', () => {
    const mockApproval = {
      message_id: 'message-123',
      reviewer_id: 'legal-counsel',
      approval_step: 'legal_review' as const,
      status: 'approved' as const,
      comments: 'Content approved with minor suggestions for regulatory compliance',
      reviewed_at: new Date().toISOString(),
      suggestions: [
        'Add specific timeline for resolution',
        'Include reference to regulatory notification'
      ]
    };

    it('should submit message for approval', async () => {
      const approvalWorkflow = {
        message_id: 'message-123',
        workflow_steps: [
          { step: 'legal_review', reviewer_id: 'legal-counsel', required: true },
          { step: 'executive_approval', reviewer_id: 'ceo', required: true },
          { step: 'compliance_check', reviewer_id: 'compliance-officer', required: false }
        ],
        submitted_by: 'communications-manager',
        urgency_override: false
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'workflow-123', ...approvalWorkflow },
        error: null
      });

      const result = await commService.submitForApproval(approvalWorkflow);
      
      expect(result.success).toBe(true);
      expect(result.data?.workflow_steps.length).toBe(3);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('approval_workflows');
    });

    it('should process approval decision', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'approval-123', ...mockApproval },
        error: null
      });

      const result = await commService.processApproval(mockApproval);
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('approved');
      expect(result.data?.suggestions?.length).toBe(2);
    });

    it('should handle approval rejection', async () => {
      const rejectionData = {
        message_id: 'message-123',
        reviewer_id: 'legal-counsel',
        approval_step: 'legal_review' as const,
        status: 'rejected' as const,
        comments: 'Content requires significant revision for legal compliance',
        rejection_reasons: [
          'Potential liability exposure in current wording',
          'Missing required disclaimers'
        ],
        required_changes: [
          'Add standard liability disclaimer',
          'Revise impact assessment language'
        ]
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'rejection-123', ...rejectionData },
        error: null
      });

      const result = await commService.processApproval(rejectionData);
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('rejected');
      expect(result.data?.required_changes?.length).toBe(2);
    });

    it('should get pending approvals for reviewer', async () => {
      const reviewerId = 'legal-counsel';
      const pendingApprovals = [
        {
          message_id: 'message-123',
          subject: 'Trading System Incident Update',
          urgency_level: 'high',
          submitted_at: '2024-01-15T10:30:00Z',
          approval_step: 'legal_review'
        },
        {
          message_id: 'message-124',
          subject: 'Data Security Incident',
          urgency_level: 'critical',
          submitted_at: '2024-01-15T11:15:00Z',
          approval_step: 'legal_review'
        }
      ];

      mockSupabaseClient.from().select().eq().eq().order().mockResolvedValue({
        data: pendingApprovals,
        error: null
      });

      const result = await commService.getPendingApprovals(reviewerId);
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[1].urgency_level).toBe('critical');
    });
  });

  describe('Distribution Management', () => {
    const mockDistribution = {
      message_id: 'message-123',
      distribution_lists: [
        {
          name: 'Board Members',
          recipients: ['board-chair', 'board-member-1', 'board-member-2'],
          channel: 'email' as const
        },
        {
          name: 'Key Investors',
          recipients: ['investor-1', 'investor-2'],
          channel: 'email' as const
        }
      ],
      channels: ['email', 'website'],
      send_time: new Date().toISOString(),
      batch_size: 50,
      send_priority: 'high' as const
    };

    it('should schedule message distribution', async () => {
      const schedulingResult = {
        distribution_id: 'dist-123',
        total_recipients: 5,
        batches_created: 1,
        scheduled_send_time: mockDistribution.send_time,
        estimated_completion: new Date(Date.now() + 300000).toISOString() // 5 minutes
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: schedulingResult,
        error: null
      });

      const result = await commService.scheduleDistribution(mockDistribution);
      
      expect(result.success).toBe(true);
      expect(result.data?.total_recipients).toBe(5);
      expect(result.data?.batches_created).toBe(1);
    });

    it('should track delivery status', async () => {
      const deliveryStatus = {
        distribution_id: 'dist-123',
        total_sent: 5,
        successful_deliveries: 4,
        failed_deliveries: 1,
        pending_deliveries: 0,
        delivery_details: [
          { recipient_id: 'board-chair', channel: 'email', status: 'delivered', timestamp: '2024-01-15T12:00:00Z' },
          { recipient_id: 'board-member-1', channel: 'email', status: 'delivered', timestamp: '2024-01-15T12:00:15Z' },
          { recipient_id: 'investor-1', channel: 'email', status: 'failed', error: 'Invalid email address' }
        ]
      };

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: deliveryStatus,
        error: null
      });

      const result = await commService.getDeliveryStatus('dist-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.successful_deliveries).toBe(4);
      expect(result.data?.failed_deliveries).toBe(1);
    });

    it('should manage distribution lists', async () => {
      const distributionList = {
        name: 'Crisis Response Team',
        description: 'Core team members for crisis communications',
        category: 'internal' as const,
        recipients: [
          {
            user_id: 'crisis-manager',
            contact_methods: [
              { type: 'email', value: 'crisis@company.com', priority: 1 },
              { type: 'sms', value: '+1234567890', priority: 2 }
            ]
          },
          {
            user_id: 'board-chair',
            contact_methods: [
              { type: 'email', value: 'chair@company.com', priority: 1 }
            ]
          }
        ],
        active: true,
        created_by: 'communications-manager'
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'list-123', ...distributionList },
        error: null
      });

      const result = await commService.createDistributionList(distributionList);
      
      expect(result.success).toBe(true);
      expect(result.data?.recipients.length).toBe(2);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('distribution_lists');
    });
  });

  describe('Communication Analytics', () => {
    it('should get communication metrics', async () => {
      const dateRange = {
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-01-31T23:59:59Z'
      };

      const metrics = {
        total_messages: 45,
        messages_by_type: {
          stakeholder_update: 20,
          media_statement: 8,
          internal_alert: 12,
          customer_notification: 5
        },
        approval_metrics: {
          average_approval_time_hours: 2.5,
          approval_success_rate: 0.92,
          rejection_rate: 0.08
        },
        distribution_metrics: {
          total_recipients: 1250,
          average_delivery_rate: 0.97,
          channel_effectiveness: {
            email: 0.98,
            sms: 0.95,
            website: 1.0
          }
        },
        response_times: {
          average_creation_to_approval_hours: 3.2,
          average_approval_to_distribution_minutes: 15
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: metrics,
        error: null
      });

      const result = await commService.getCommunicationAnalytics(dateRange);
      
      expect(result.success).toBe(true);
      expect(result.data?.total_messages).toBe(45);
      expect(result.data?.approval_metrics?.approval_success_rate).toBeGreaterThan(0.9);
    });

    it('should analyze message effectiveness', async () => {
      const effectivenessData = {
        message_id: 'message-123',
        engagement_metrics: {
          open_rate: 0.89,
          click_rate: 0.34,
          response_rate: 0.12
        },
        sentiment_analysis: {
          positive: 0.65,
          neutral: 0.25,
          negative: 0.10
        },
        reach_metrics: {
          total_reach: 1200,
          unique_views: 1150,
          shares: 23
        },
        feedback_summary: {
          total_responses: 45,
          satisfaction_score: 4.2,
          common_themes: ['clarity', 'timeliness', 'transparency']
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: effectivenessData,
        error: null
      });

      const result = await commService.analyzeMessageEffectiveness('message-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.engagement_metrics.open_rate).toBeGreaterThan(0.8);
      expect(result.data?.sentiment_analysis.positive).toBeGreaterThan(0.6);
    });
  });

  describe('Emergency Broadcast Features', () => {
    const mockEmergencyBroadcast = {
      incident_id: 'incident-123',
      message_type: 'emergency_alert' as const,
      subject: 'URGENT: System Security Breach - Immediate Action Required',
      content: 'EMERGENCY ALERT: We have detected unauthorized access to our systems. Please change your passwords immediately.',
      target_audiences: ['all_employees', 'board_members'],
      channels: ['email', 'sms', 'push_notification'],
      priority: 'critical' as const,
      bypass_approval: true,
      send_immediately: true,
      emergency_contact_override: true,
      authorized_by: 'ceo'
    };

    it('should send emergency broadcast', async () => {
      const broadcastResult = {
        broadcast_id: 'broadcast-123',
        total_recipients: 2500,
        channels_used: ['email', 'sms', 'push_notification'],
        send_started_at: new Date().toISOString(),
        estimated_completion: new Date(Date.now() + 180000).toISOString(), // 3 minutes
        approval_bypassed: true,
        authorization_verified: true
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: broadcastResult,
        error: null
      });

      const result = await commService.sendEmergencyBroadcast(mockEmergencyBroadcast);
      
      expect(result.success).toBe(true);
      expect(result.data?.total_recipients).toBe(2500);
      expect(result.data?.approval_bypassed).toBe(true);
    });

    it('should verify emergency authorization', async () => {
      const authorizationCheck = {
        user_id: 'ceo',
        emergency_level: 'critical',
        authorization_valid: true,
        authorization_expires_at: new Date(Date.now() + 3600000).toISOString(),
        granted_permissions: ['bypass_approval', 'emergency_broadcast', 'all_channels']
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: authorizationCheck,
        error: null
      });

      const result = await commService.verifyEmergencyAuthorization('ceo', 'critical');
      
      expect(result.success).toBe(true);
      expect(result.data?.authorization_valid).toBe(true);
      expect(result.data?.granted_permissions).toContain('bypass_approval');
    });
  });

  describe('Error Handling', () => {
    it('should handle template rendering errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Template variable parsing failed', code: 'TEMPLATE_ERROR' }
      });

      const result = await commService.renderTemplate('template-123', { invalid: 'variables' });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Template variable parsing failed');
    });

    it('should handle distribution system failures', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Email service unavailable', code: 'DISTRIBUTION_ERROR' }
      });

      const result = await commService.scheduleDistribution({
        message_id: 'message-123',
        distribution_lists: [],
        channels: ['email'],
        send_time: new Date().toISOString()
      } as any);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Email service unavailable');
    });

    it('should validate message content', async () => {
      const invalidMessage = {
        incident_id: 'incident-123',
        message_type: 'stakeholder_update' as const,
        subject: '', // Invalid empty subject
        content: 'Test message',
        target_audiences: [], // Invalid empty audiences
        created_by: 'user-123'
      };

      const result = await commService.createMessage(invalidMessage);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('validation');
    });

    it('should handle approval workflow violations', async () => {
      const unauthorizedApproval = {
        message_id: 'message-123',
        reviewer_id: 'unauthorized-user',
        approval_step: 'executive_approval' as const,
        status: 'approved' as const
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: null,
        error: { code: 'AUTHORIZATION_ERROR', message: 'User not authorized for this approval step' }
      });

      const result = await commService.processApproval(unauthorizedApproval);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not authorized');
    });
  });
});