/**
 * Situation Monitoring Service Tests
 * Test suite for real-time situation monitoring, alerting, and dashboard management
 */

import { SituationMonitoringService } from '../situation-monitoring.service';

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

describe('SituationMonitoringService', () => {
  let monitoringService: SituationMonitoringService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    monitoringService = new SituationMonitoringService(mockSupabaseClient as any);
  });

  describe('Monitoring Configuration', () => {
    const mockMonitoringConfig = {
      name: 'Trading System Health Monitor',
      description: 'Monitors trading system performance and availability',
      monitor_type: 'system_health' as const,
      data_sources: [
        {
          name: 'Prometheus Metrics',
          type: 'prometheus',
          endpoint: 'https://prometheus.company.com/api/v1',
          authentication: {
            type: 'bearer_token',
            token: 'prom_token_123'
          },
          polling_interval: 30
        },
        {
          name: 'Application Logs',
          type: 'elasticsearch',
          endpoint: 'https://elastic.company.com',
          authentication: {
            type: 'api_key',
            key: 'elastic_key_456'
          },
          polling_interval: 60
        }
      ],
      alert_thresholds: [
        {
          metric: 'cpu_usage_percent',
          operator: 'greater_than',
          value: 80,
          severity: 'high' as const,
          duration_seconds: 300
        },
        {
          metric: 'error_rate_percent',
          operator: 'greater_than',
          value: 5,
          severity: 'critical' as const,
          duration_seconds: 60
        }
      ],
      notification_channels: ['email', 'slack'],
      escalation_rules: [
        {
          condition: 'no_acknowledgment_after_minutes',
          value: 15,
          action: 'escalate_to_manager'
        }
      ],
      enabled: true,
      created_by: 'ops-manager'
    };

    it('should create monitoring configuration', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'monitor-123', ...mockMonitoringConfig },
        error: null
      });

      const result = await monitoringService.createMonitoringConfig(mockMonitoringConfig);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('monitor-123');
      expect(result.data?.monitor_type).toBe('system_health');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('monitoring_configurations');
    });

    it('should validate monitoring configuration', async () => {
      const invalidConfig = {
        ...mockMonitoringConfig,
        name: '', // Invalid empty name
        data_sources: [], // Invalid empty data sources
        alert_thresholds: [] // Invalid empty thresholds
      };

      const result = await monitoringService.createMonitoringConfig(invalidConfig);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('validation failed');
    });

    it('should get monitoring configurations', async () => {
      const configs = [
        { id: 'monitor-1', name: 'System Health', enabled: true },
        { id: 'monitor-2', name: 'Security Events', enabled: false }
      ];

      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: configs,
        error: null
      });

      const result = await monitoringService.getMonitoringConfigs({ enabled: true });
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it('should update monitoring configuration', async () => {
      const configId = 'monitor-123';
      const updates = {
        enabled: false,
        polling_interval: 60,
        last_modified_by: 'admin-user'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: configId, ...updates },
        error: null
      });

      const result = await monitoringService.updateMonitoringConfig(configId, updates);
      
      expect(result.success).toBe(true);
      expect(result.data?.enabled).toBe(false);
    });
  });

  describe('Alert Processing', () => {
    const mockAlert = {
      monitoring_config_id: 'monitor-123',
      alert_type: 'threshold_exceeded' as const,
      severity: 'high' as const,
      title: 'High CPU Usage Detected',
      description: 'CPU usage exceeded 80% threshold for 5 minutes',
      source_system: 'prometheus',
      metric_name: 'cpu_usage_percent',
      metric_value: 87.5,
      threshold_value: 80,
      detected_at: new Date().toISOString(),
      metadata: {
        instance: 'trading-server-01',
        service: 'order-processing',
        datacenter: 'us-east-1'
      },
      correlation_id: 'corr-123',
      tags: ['performance', 'trading']
    };

    it('should process incoming alert', async () => {
      const processedAlert = {
        id: 'alert-123',
        ...mockAlert,
        status: 'active',
        processed_at: new Date().toISOString()
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: processedAlert,
        error: null
      });

      const result = await monitoringService.processAlert(mockAlert);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('alert-123');
      expect(result.data?.status).toBe('active');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('situation_alerts');
    });

    it('should correlate related alerts', async () => {
      const correlationResult = {
        primary_alert_id: 'alert-123',
        related_alerts: [
          {
            alert_id: 'alert-124',
            correlation_score: 0.85,
            relationship_type: 'cascading_failure'
          },
          {
            alert_id: 'alert-125',
            correlation_score: 0.72,
            relationship_type: 'same_component'
          }
        ],
        suggested_grouping: 'trading_system_performance',
        confidence_score: 0.90
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: correlationResult,
        error: null
      });

      const result = await monitoringService.correlateAlerts('alert-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.related_alerts.length).toBe(2);
      expect(result.data?.confidence_score).toBeGreaterThan(0.8);
    });

    it('should acknowledge alert', async () => {
      const alertId = 'alert-123';
      const acknowledgmentData = {
        acknowledged_by: 'ops-engineer',
        acknowledgment_time: new Date().toISOString(),
        comments: 'Investigating CPU spike, likely due to batch processing job'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: {
          id: alertId,
          status: 'acknowledged',
          ...acknowledgmentData
        },
        error: null
      });

      const result = await monitoringService.acknowledgeAlert(alertId, acknowledgmentData);
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('acknowledged');
      expect(result.data?.acknowledged_by).toBe('ops-engineer');
    });

    it('should resolve alert', async () => {
      const alertId = 'alert-123';
      const resolutionData = {
        resolved_by: 'ops-engineer',
        resolution_time: new Date().toISOString(),
        resolution_summary: 'CPU usage normalized after batch job completion',
        resolution_actions: [
          'Monitored system performance',
          'Confirmed batch job completion',
          'Verified CPU levels returned to normal'
        ]
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: {
          id: alertId,
          status: 'resolved',
          ...resolutionData
        },
        error: null
      });

      const result = await monitoringService.resolveAlert(alertId, resolutionData);
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('resolved');
      expect(result.data?.resolution_actions.length).toBe(3);
    });

    it('should escalate unacknowledged alerts', async () => {
      const escalationResult = {
        alerts_escalated: 3,
        escalation_details: [
          {
            alert_id: 'alert-123',
            escalated_to: 'senior-ops-manager',
            escalation_reason: 'No acknowledgment after 15 minutes'
          }
        ]
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: escalationResult,
        error: null
      });

      const result = await monitoringService.escalateUnacknowledgedAlerts();
      
      expect(result.success).toBe(true);
      expect(result.data?.alerts_escalated).toBe(3);
    });
  });

  describe('Dashboard Management', () => {
    const mockDashboard = {
      name: 'Crisis Command Center',
      description: 'Real-time situation awareness dashboard',
      dashboard_type: 'crisis_command' as const,
      layout_config: {
        columns: 3,
        rows: 4,
        widgets: [
          {
            id: 'widget-1',
            type: 'alert_summary',
            position: { x: 0, y: 0, width: 1, height: 1 },
            config: {
              severity_filter: ['high', 'critical'],
              time_range: '1h'
            }
          },
          {
            id: 'widget-2',
            type: 'system_health_metrics',
            position: { x: 1, y: 0, width: 2, height: 2 },
            config: {
              metrics: ['cpu_usage', 'memory_usage', 'disk_usage'],
              systems: ['trading', 'settlement', 'reporting']
            }
          }
        ]
      },
      access_control: {
        required_roles: ['ops_manager', 'crisis_manager'],
        security_classification: 'confidential'
      },
      refresh_interval: 30,
      auto_refresh: true,
      created_by: 'dashboard-admin'
    };

    it('should create dashboard configuration', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'dashboard-123', ...mockDashboard },
        error: null
      });

      const result = await monitoringService.createDashboard(mockDashboard);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('dashboard-123');
      expect(result.data?.dashboard_type).toBe('crisis_command');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('monitoring_dashboards');
    });

    it('should get dashboard data', async () => {
      const dashboardData = {
        dashboard_id: 'dashboard-123',
        generated_at: new Date().toISOString(),
        widgets: [
          {
            widget_id: 'widget-1',
            type: 'alert_summary',
            data: {
              total_alerts: 15,
              critical_alerts: 2,
              high_alerts: 6,
              medium_alerts: 7
            }
          },
          {
            widget_id: 'widget-2',
            type: 'system_health_metrics',
            data: {
              trading: { cpu: 65, memory: 78, disk: 42 },
              settlement: { cpu: 43, memory: 56, disk: 38 }
            }
          }
        ],
        alerts_summary: {
          active: 12,
          acknowledged: 3,
          resolved_today: 28
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: dashboardData,
        error: null
      });

      const result = await monitoringService.getDashboardData('dashboard-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.widgets.length).toBe(2);
      expect(result.data?.alerts_summary.active).toBe(12);
    });

    it('should update dashboard layout', async () => {
      const dashboardId = 'dashboard-123';
      const layoutUpdates = {
        layout_config: {
          columns: 4,
          rows: 3,
          widgets: [
            {
              id: 'widget-1',
              type: 'alert_summary',
              position: { x: 0, y: 0, width: 2, height: 1 }
            }
          ]
        },
        last_modified_by: 'dashboard-admin'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: dashboardId, ...layoutUpdates },
        error: null
      });

      const result = await monitoringService.updateDashboardLayout(dashboardId, layoutUpdates);
      
      expect(result.success).toBe(true);
      expect(result.data?.layout_config.columns).toBe(4);
    });
  });

  describe('Trend Analysis', () => {
    it('should analyze alert trends', async () => {
      const trendAnalysis = {
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z'
        },
        alert_volume_trends: [
          { date: '2024-01-01', count: 45, severity_breakdown: { critical: 3, high: 12, medium: 20, low: 10 } },
          { date: '2024-01-02', count: 52, severity_breakdown: { critical: 5, high: 15, medium: 22, low: 10 } }
        ],
        top_alert_sources: [
          { source: 'trading_system', count: 120, percentage: 35.2 },
          { source: 'network_monitoring', count: 87, percentage: 25.5 }
        ],
        resolution_time_trends: {
          average_hours: 2.3,
          median_hours: 1.8,
          trend_direction: 'improving'
        },
        recurring_patterns: [
          {
            pattern: 'daily_peak',
            description: 'Alert volume peaks between 9-11 AM',
            confidence: 0.87
          }
        ]
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: trendAnalysis,
        error: null
      });

      const result = await monitoringService.analyzeAlertTrends({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.alert_volume_trends.length).toBe(2);
      expect(result.data?.resolution_time_trends.trend_direction).toBe('improving');
    });

    it('should identify risk indicators', async () => {
      const riskIndicators = {
        risk_level: 'elevated' as const,
        risk_score: 0.72,
        contributing_factors: [
          {
            factor: 'increased_error_rate',
            weight: 0.35,
            current_value: 8.2,
            threshold_value: 5.0,
            trend: 'increasing'
          },
          {
            factor: 'system_performance_degradation',
            weight: 0.28,
            current_value: 0.65,
            threshold_value: 0.8,
            trend: 'decreasing'
          }
        ],
        recommended_actions: [
          'Investigate error rate increase in trading system',
          'Review system capacity planning',
          'Consider scaling infrastructure'
        ],
        forecast: {
          next_24h_risk_level: 'high',
          confidence: 0.68
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: riskIndicators,
        error: null
      });

      const result = await monitoringService.identifyRiskIndicators();
      
      expect(result.success).toBe(true);
      expect(result.data?.risk_level).toBe('elevated');
      expect(result.data?.contributing_factors.length).toBe(2);
    });
  });

  describe('Real-time Features', () => {
    it('should set up real-time alert subscription', () => {
      const mockCallback = jest.fn();
      
      monitoringService.subscribeToAlerts(mockCallback);
      
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('situation_alerts');
    });

    it('should handle real-time alert updates', () => {
      const mockCallback = jest.fn();
      const mockAlertUpdate = {
        eventType: 'INSERT',
        new: {
          id: 'alert-123',
          severity: 'critical',
          title: 'System Down',
          status: 'active'
        }
      };

      monitoringService.subscribeToAlerts(mockCallback);
      
      // Simulate real-time update
      const channelMock = mockSupabaseClient.channel();
      const onCallback = channelMock.on.mock.calls[0][2];
      onCallback(mockAlertUpdate);
      
      expect(mockCallback).toHaveBeenCalledWith(mockAlertUpdate);
    });

    it('should process streaming data', async () => {
      const streamingData = {
        source: 'prometheus',
        timestamp: new Date().toISOString(),
        metrics: [
          { name: 'cpu_usage', value: 85.2, instance: 'server-01' },
          { name: 'memory_usage', value: 76.8, instance: 'server-01' }
        ]
      };

      const processingResult = {
        alerts_generated: 1,
        metrics_processed: 2,
        thresholds_evaluated: 5
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: processingResult,
        error: null
      });

      const result = await monitoringService.processStreamingData(streamingData);
      
      expect(result.success).toBe(true);
      expect(result.data?.alerts_generated).toBe(1);
    });
  });

  describe('Integration Features', () => {
    it('should integrate with external monitoring systems', async () => {
      const integrationConfig = {
        system_name: 'Datadog',
        integration_type: 'webhook',
        endpoint: 'https://api.datadoghq.com/api/v1/events',
        authentication: {
          type: 'api_key',
          api_key: 'datadog_key_123'
        },
        event_mapping: {
          alert_created: 'incident.triggered',
          alert_resolved: 'incident.resolved'
        },
        enabled: true
      };

      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'integration-123', ...integrationConfig },
        error: null
      });

      const result = await monitoringService.createExternalIntegration(integrationConfig);
      
      expect(result.success).toBe(true);
      expect(result.data?.system_name).toBe('Datadog');
    });

    it('should sync with incident management system', async () => {
      const syncResult = {
        incidents_created: 3,
        alerts_linked: 8,
        status_updates: 12,
        sync_timestamp: new Date().toISOString()
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: syncResult,
        error: null
      });

      const result = await monitoringService.syncWithIncidentManagement();
      
      expect(result.success).toBe(true);
      expect(result.data?.incidents_created).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle data source connection failures', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Prometheus endpoint unreachable', code: 'CONNECTION_ERROR' }
      });

      const result = await monitoringService.processStreamingData({
        source: 'prometheus',
        timestamp: new Date().toISOString(),
        metrics: []
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Prometheus endpoint unreachable');
    });

    it('should handle invalid alert data', async () => {
      const invalidAlert = {
        alert_type: 'threshold_exceeded',
        // Missing required fields
        severity: null,
        title: '',
        detected_at: 'invalid-date'
      };

      const result = await monitoringService.processAlert(invalidAlert as any);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('validation');
    });

    it('should handle dashboard rendering errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Widget configuration invalid', code: 'DASHBOARD_ERROR' }
      });

      const result = await monitoringService.getDashboardData('dashboard-123');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Widget configuration invalid');
    });

    it('should handle alert correlation failures', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'ML correlation service unavailable', code: 'ML_ERROR' }
      });

      const result = await monitoringService.correlateAlerts('alert-123');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('ML correlation service unavailable');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume alert processing', async () => {
      const bulkAlerts = Array.from({ length: 100 }, (_, i) => ({
        alert_type: 'threshold_exceeded',
        severity: 'medium',
        title: `Alert ${i}`,
        description: `Test alert ${i}`,
        source_system: 'test',
        detected_at: new Date().toISOString()
      }));

      mockSupabaseClient.rpc.mockResolvedValue({
        data: {
          processed_count: 100,
          failed_count: 0,
          processing_time_ms: 2500
        },
        error: null
      });

      const result = await monitoringService.processBulkAlerts(bulkAlerts);
      
      expect(result.success).toBe(true);
      expect(result.data?.processed_count).toBe(100);
      expect(result.data?.processing_time_ms).toBeLessThan(5000);
    });

    it('should optimize alert storage and retrieval', async () => {
      const optimizationResult = {
        alerts_archived: 5000,
        storage_freed_mb: 150,
        query_performance_improvement: 0.35,
        optimization_completed_at: new Date().toISOString()
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: optimizationResult,
        error: null
      });

      const result = await monitoringService.optimizeAlertStorage();
      
      expect(result.success).toBe(true);
      expect(result.data?.alerts_archived).toBe(5000);
      expect(result.data?.query_performance_improvement).toBeGreaterThan(0.3);
    });
  });
});