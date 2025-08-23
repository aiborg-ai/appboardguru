/**
 * Incident Response Workflows Service Tests
 * Test suite for automated incident detection, classification, and workflow execution
 */

import { IncidentResponseWorkflowsService } from '../incident-response-workflows.service';

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

describe('IncidentResponseWorkflowsService', () => {
  let workflowService: IncidentResponseWorkflowsService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    workflowService = new IncidentResponseWorkflowsService(mockSupabaseClient as any);
  });

  describe('Workflow Rule Management', () => {
    const mockWorkflowRule = {
      name: 'High Severity Auto-Escalation',
      description: 'Automatically escalate high severity incidents to board',
      trigger_conditions: {
        severity_levels: ['high', 'critical'],
        categories: ['operational', 'financial'],
        keywords: ['trading halt', 'data breach']
      },
      actions: [
        {
          type: 'escalate' as const,
          config: {
            escalate_to: 'board',
            notification_template: 'high-severity-escalation'
          },
          order: 1
        },
        {
          type: 'notify' as const,
          config: {
            recipients: ['board-chair', 'ceo'],
            channels: ['email', 'sms'],
            template: 'immediate-attention-required'
          },
          order: 2
        }
      ],
      enabled: true,
      priority: 1,
      created_by: 'system-admin'
    };

    it('should create workflow rule successfully', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'rule-123', ...mockWorkflowRule },
        error: null
      });

      const result = await workflowService.createWorkflowRule(mockWorkflowRule);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('rule-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('workflow_rules');
    });

    it('should validate workflow rule configuration', async () => {
      const invalidRule = {
        ...mockWorkflowRule,
        name: '', // Invalid empty name
        actions: [] // Invalid empty actions
      };

      const result = await workflowService.createWorkflowRule(invalidRule);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('validation failed');
    });

    it('should get workflow rules with filters', async () => {
      const filters = { enabled: true, category: 'operational' };
      
      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: [{ id: 'rule-123', ...mockWorkflowRule }],
        error: null
      });

      const result = await workflowService.getWorkflowRules(filters);
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should update workflow rule', async () => {
      const ruleId = 'rule-123';
      const updates = {
        enabled: false,
        priority: 2,
        updated_by: 'admin-user'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: ruleId, ...updates },
        error: null
      });

      const result = await workflowService.updateWorkflowRule(ruleId, updates);
      
      expect(result.success).toBe(true);
      expect(result.data?.enabled).toBe(false);
    });

    it('should delete workflow rule', async () => {
      const ruleId = 'rule-123';
      
      mockSupabaseClient.from().delete().eq().mockResolvedValue({
        data: null,
        error: null
      });

      const result = await workflowService.deleteWorkflowRule(ruleId);
      
      expect(result.success).toBe(true);
    });
  });

  describe('Incident Classification', () => {
    const mockIncidentData = {
      id: 'incident-123',
      title: 'Trading System Outage',
      description: 'Critical trading system experiencing complete outage affecting all operations',
      initial_reporter: 'ops-team',
      source_system: 'monitoring',
      raw_data: {
        alerts: ['high_cpu', 'connection_timeout', 'service_unavailable'],
        affected_services: ['trading-engine', 'order-management'],
        timestamp: new Date().toISOString()
      }
    };

    it('should classify incident automatically', async () => {
      const expectedClassification = {
        category: 'operational',
        severity_level: 'critical',
        priority: 1,
        estimated_impact: 'High - complete trading disruption',
        confidence_score: 0.95,
        classification_method: 'ml_model',
        suggested_actions: [
          'Immediate escalation to trading floor manager',
          'Activate backup trading systems',
          'Notify regulatory bodies'
        ]
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: expectedClassification,
        error: null
      });

      const result = await workflowService.classifyIncident(mockIncidentData);
      
      expect(result.success).toBe(true);
      expect(result.data?.category).toBe('operational');
      expect(result.data?.severity_level).toBe('critical');
      expect(result.data?.confidence_score).toBeGreaterThan(0.9);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'classify_incident_ml',
        expect.objectContaining({
          incident_data: mockIncidentData
        })
      );
    });

    it('should handle classification with low confidence', async () => {
      const lowConfidenceResult = {
        category: 'operational',
        severity_level: 'medium',
        priority: 3,
        confidence_score: 0.45, // Low confidence
        classification_method: 'rule_based',
        requires_manual_review: true
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: lowConfidenceResult,
        error: null
      });

      const result = await workflowService.classifyIncident(mockIncidentData);
      
      expect(result.success).toBe(true);
      expect(result.data?.requires_manual_review).toBe(true);
      expect(result.data?.confidence_score).toBeLessThan(0.5);
    });

    it('should handle classification failures', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'ML model unavailable', code: 'ML_ERROR' }
      });

      const result = await workflowService.classifyIncident(mockIncidentData);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('ML model unavailable');
    });
  });

  describe('Workflow Execution', () => {
    const mockWorkflowExecution = {
      rule_id: 'rule-123',
      incident_id: 'incident-123',
      trigger_data: {
        incident_severity: 'critical',
        incident_category: 'operational',
        matched_keywords: ['trading halt']
      }
    };

    it('should execute workflow successfully', async () => {
      const expectedExecution = {
        id: 'execution-123',
        status: 'completed',
        actions_executed: ['escalate', 'notify'],
        execution_time_ms: 1500,
        results: {
          escalate: { success: true, escalated_to: 'board' },
          notify: { success: true, notifications_sent: 2 }
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: expectedExecution,
        error: null
      });

      const result = await workflowService.executeWorkflow(
        mockWorkflowExecution.rule_id,
        mockWorkflowExecution.incident_id,
        mockWorkflowExecution.trigger_data
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
      expect(result.data?.actions_executed).toContain('escalate');
      expect(result.data?.actions_executed).toContain('notify');
    });

    it('should handle partial workflow execution', async () => {
      const partialExecution = {
        id: 'execution-123',
        status: 'partial_failure',
        actions_executed: ['escalate'],
        actions_failed: ['notify'],
        results: {
          escalate: { success: true, escalated_to: 'board' },
          notify: { success: false, error: 'SMTP server unavailable' }
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: partialExecution,
        error: null
      });

      const result = await workflowService.executeWorkflow(
        mockWorkflowExecution.rule_id,
        mockWorkflowExecution.incident_id,
        mockWorkflowExecution.trigger_data
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('partial_failure');
      expect(result.data?.actions_failed).toContain('notify');
    });

    it('should get workflow execution history', async () => {
      const executionHistory = [
        {
          id: 'execution-1',
          rule_name: 'High Severity Auto-Escalation',
          incident_title: 'Trading System Outage',
          status: 'completed',
          executed_at: '2024-01-15T10:30:00Z',
          execution_time_ms: 1200
        },
        {
          id: 'execution-2',
          rule_name: 'Security Alert Response',
          incident_title: 'Suspicious Login Activity',
          status: 'failed',
          executed_at: '2024-01-15T11:15:00Z',
          execution_time_ms: 500
        }
      ];

      mockSupabaseClient.from().select().order().limit().mockResolvedValue({
        data: executionHistory,
        error: null
      });

      const result = await workflowService.getWorkflowExecutionHistory();
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[0].status).toBe('completed');
    });
  });

  describe('Playbook Management', () => {
    const mockPlaybook = {
      name: 'Operational Incident Response',
      description: 'Standard response procedures for operational incidents',
      category: 'operational' as const,
      severity_levels: ['medium', 'high', 'critical'],
      steps: [
        {
          order: 1,
          title: 'Initial Assessment',
          description: 'Assess the scope and impact of the incident',
          actions: ['gather_information', 'assess_impact'],
          estimated_duration: 15,
          required_roles: ['incident_commander']
        },
        {
          order: 2,
          title: 'Stakeholder Notification',
          description: 'Notify relevant stakeholders',
          actions: ['send_notifications'],
          estimated_duration: 10,
          required_roles: ['communications_lead']
        }
      ],
      escalation_triggers: [
        {
          condition: 'duration > 60 minutes',
          action: 'escalate_to_board'
        }
      ],
      required_approvals: ['incident_commander'],
      version: '1.0',
      created_by: 'crisis-manager'
    };

    it('should create response playbook', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'playbook-123', ...mockPlaybook },
        error: null
      });

      const result = await workflowService.createResponsePlaybook(mockPlaybook);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('playbook-123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('response_playbooks');
    });

    it('should execute playbook steps', async () => {
      const playbookId = 'playbook-123';
      const incidentId = 'incident-123';
      const executionData = {
        assigned_commander: 'user-123',
        custom_parameters: {
          affected_systems: ['trading', 'settlement']
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          execution_id: 'playbook-exec-123',
          status: 'in_progress',
          current_step: 1,
          estimated_completion: '2024-01-15T12:00:00Z'
        },
        error: null
      });

      const result = await workflowService.executePlaybook(
        playbookId,
        incidentId,
        executionData
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('in_progress');
      expect(result.data?.current_step).toBe(1);
    });

    it('should get recommended playbooks', async () => {
      const incidentClassification = {
        category: 'operational',
        severity_level: 'high',
        keywords: ['trading', 'system']
      };

      const recommendedPlaybooks = [
        {
          id: 'playbook-123',
          name: 'Operational Incident Response',
          match_score: 0.95,
          match_reasons: ['category match', 'severity match', 'keyword match']
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: recommendedPlaybooks,
        error: null
      });

      const result = await workflowService.getRecommendedPlaybooks(incidentClassification);
      
      expect(result.success).toBe(true);
      expect(result.data?.[0].match_score).toBeGreaterThan(0.9);
    });
  });

  describe('Automated Detection', () => {
    it('should detect incidents from monitoring data', async () => {
      const monitoringData = {
        source: 'prometheus',
        alerts: [
          {
            name: 'HighCPUUsage',
            severity: 'critical',
            labels: { service: 'trading-engine', instance: 'prod-1' },
            value: 95.5,
            threshold: 80
          }
        ],
        timestamp: new Date().toISOString()
      };

      const detectedIncidents = [
        {
          title: 'High CPU Usage - Trading Engine',
          description: 'CPU usage exceeded 80% threshold on trading-engine prod-1',
          category: 'operational',
          severity_level: 'high',
          source_system: 'prometheus',
          auto_created: true
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: { incidents: detectedIncidents, detection_confidence: 0.88 },
        error: null
      });

      const result = await workflowService.detectIncidentsFromMonitoring(monitoringData);
      
      expect(result.success).toBe(true);
      expect(result.data?.incidents.length).toBeGreaterThan(0);
      expect(result.data?.detection_confidence).toBeGreaterThan(0.8);
    });

    it('should process external alerts', async () => {
      const externalAlert = {
        source: 'regulatory_feed',
        alert_type: 'market_volatility',
        content: 'Unusual trading volume detected in sector XYZ',
        severity: 'medium',
        received_at: new Date().toISOString(),
        metadata: {
          affected_symbols: ['XYZ', 'ABC'],
          volume_increase: 250
        }
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'alert-123', processed: true },
        error: null
      });

      const result = await workflowService.processExternalAlert(externalAlert);
      
      expect(result.success).toBe(true);
      expect(result.data?.processed).toBe(true);
    });
  });

  describe('Workflow Analytics', () => {
    it('should get workflow performance metrics', async () => {
      const dateRange = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const metrics = {
        total_executions: 45,
        successful_executions: 42,
        failed_executions: 3,
        average_execution_time_ms: 1200,
        most_triggered_rules: [
          { rule_name: 'High Severity Auto-Escalation', count: 12 },
          { rule_name: 'Security Alert Response', count: 8 }
        ],
        execution_trends: []
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: metrics,
        error: null
      });

      const result = await workflowService.getWorkflowMetrics(dateRange);
      
      expect(result.success).toBe(true);
      expect(result.data?.total_executions).toBe(45);
      expect(result.data?.successful_executions).toBe(42);
    });

    it('should optimize workflow rules based on performance', async () => {
      const optimizationResults = {
        rules_analyzed: 15,
        rules_optimized: 3,
        performance_improvements: [
          {
            rule_id: 'rule-123',
            optimization: 'reduced_false_positives',
            improvement_percentage: 25
          }
        ]
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: optimizationResults,
        error: null
      });

      const result = await workflowService.optimizeWorkflowRules();
      
      expect(result.success).toBe(true);
      expect(result.data?.rules_optimized).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow execution failures gracefully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Workflow execution failed', code: 'WORKFLOW_ERROR' }
      });

      const result = await workflowService.executeWorkflow('rule-123', 'incident-123', {});
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Workflow execution failed');
    });

    it('should validate playbook configuration', async () => {
      const invalidPlaybook = {
        name: '',
        description: 'Test',
        category: 'operational',
        steps: [] // Invalid empty steps
      };

      const result = await workflowService.createResponsePlaybook(invalidPlaybook as any);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('validation');
    });

    it('should handle missing workflow rules', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No workflow rule found' }
      });

      const result = await workflowService.executeWorkflow('non-existent-rule', 'incident-123', {});
      
      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(404);
    });
  });
});