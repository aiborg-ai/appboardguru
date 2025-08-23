/**
 * Post-Incident Analysis Service Tests
 * Test suite for comprehensive post-incident analysis, lessons learned, and process improvements
 */

import { PostIncidentAnalysisService } from '../post-incident-analysis.service';

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

describe('PostIncidentAnalysisService', () => {
  let analysisService: PostIncidentAnalysisService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    analysisService = new PostIncidentAnalysisService(mockSupabaseClient as any);
  });

  describe('Analysis Creation and Management', () => {
    const mockAnalysis = {
      incident_id: 'incident-123',
      analysis_type: 'comprehensive' as const,
      title: 'Trading System Outage - Post-Incident Analysis',
      executive_summary: 'Comprehensive analysis of the January 15th trading system outage that affected operations for 2.5 hours.',
      incident_timeline: [
        {
          timestamp: '2024-01-15T14:30:00Z',
          event: 'Initial alert received - high CPU usage on trading servers',
          source: 'monitoring_system',
          impact_level: 'low'
        },
        {
          timestamp: '2024-01-15T14:45:00Z',
          event: 'Trading system became unresponsive',
          source: 'trading_floor',
          impact_level: 'high'
        },
        {
          timestamp: '2024-01-15T15:30:00Z',
          event: 'Primary database failover initiated',
          source: 'operations_team',
          impact_level: 'medium'
        }
      ],
      root_cause_analysis: {
        primary_cause: 'Database connection pool exhaustion due to memory leak',
        contributing_factors: [
          'Insufficient monitoring of connection pool metrics',
          'Delayed response to initial performance alerts',
          'Lack of automated failover for database connections'
        ],
        methodology: 'fishbone_analysis' as const,
        analysis_depth: 'deep' as const
      },
      impact_assessment: {
        financial_impact: {
          direct_losses: 125000.00,
          indirect_losses: 75000.00,
          recovery_costs: 25000.00,
          currency: 'USD'
        },
        operational_impact: {
          systems_affected: ['trading', 'order_management', 'position_tracking'],
          duration_minutes: 150,
          transactions_failed: 2847,
          clients_affected: 156
        },
        reputational_impact: {
          media_coverage: 'limited',
          client_complaints: 23,
          regulatory_inquiries: 1,
          social_media_mentions: 45
        }
      },
      lessons_learned: [
        {
          category: 'technical',
          lesson: 'Connection pool monitoring is critical for early detection of resource exhaustion',
          importance: 'high' as const,
          applicable_scenarios: ['database_issues', 'performance_problems']
        },
        {
          category: 'process',
          lesson: 'Response procedures should include automated escalation triggers',
          importance: 'medium' as const,
          applicable_scenarios: ['incident_response', 'escalation_procedures']
        }
      ],
      recommendations: [
        {
          title: 'Implement Enhanced Database Monitoring',
          description: 'Deploy comprehensive monitoring for database connection pools, memory usage, and query performance',
          priority: 'high' as const,
          category: 'technical' as const,
          estimated_effort: 'medium',
          timeline: '4-6 weeks',
          assigned_to: 'database_team',
          success_criteria: 'Connection pool alerts trigger before exhaustion, memory leak detection automated'
        }
      ],
      analysis_status: 'draft' as const,
      lead_analyst: 'senior-engineer',
      review_participants: ['ops-manager', 'db-admin', 'business-analyst'],
      analysis_start_date: '2024-01-16T09:00:00Z',
      target_completion_date: '2024-01-23T17:00:00Z'
    };

    it('should create post-incident analysis', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'analysis-123', ...mockAnalysis },
        error: null
      });

      const result = await analysisService.createAnalysis(mockAnalysis);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('analysis-123');
      expect(result.data?.analysis_type).toBe('comprehensive');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('post_incident_analyses');
    });

    it('should validate analysis data', async () => {
      const invalidAnalysis = {
        ...mockAnalysis,
        incident_id: '', // Invalid empty incident ID
        root_cause_analysis: {
          primary_cause: '', // Invalid empty cause
          contributing_factors: [],
          methodology: 'invalid' as any
        }
      };

      const result = await analysisService.createAnalysis(invalidAnalysis);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('validation failed');
    });

    it('should get analyses by incident', async () => {
      const analyses = [
        {
          id: 'analysis-1',
          incident_id: 'incident-123',
          title: 'Initial Analysis',
          analysis_status: 'completed'
        },
        {
          id: 'analysis-2', 
          incident_id: 'incident-123',
          title: 'Follow-up Analysis',
          analysis_status: 'in_progress'
        }
      ];

      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: analyses,
        error: null
      });

      const result = await analysisService.getAnalysesByIncident('incident-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[0].analysis_status).toBe('completed');
    });

    it('should update analysis status', async () => {
      const analysisId = 'analysis-123';
      const statusUpdate = {
        analysis_status: 'under_review' as const,
        review_notes: 'Initial analysis complete, pending stakeholder review',
        updated_by: 'lead-analyst'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: analysisId, ...statusUpdate },
        error: null
      });

      const result = await analysisService.updateAnalysisStatus(analysisId, statusUpdate);
      
      expect(result.success).toBe(true);
      expect(result.data?.analysis_status).toBe('under_review');
    });
  });

  describe('Root Cause Analysis', () => {
    it('should perform automated root cause analysis', async () => {
      const incidentData = {
        incident_id: 'incident-123',
        symptoms: [
          'High CPU usage on database servers',
          'Connection timeouts from application servers',
          'Memory usage climbing steadily'
        ],
        timeline: [
          { time: '14:30', event: 'CPU spike detected' },
          { time: '14:45', event: 'Connection failures began' },
          { time: '15:00', event: 'System became unresponsive' }
        ],
        affected_components: ['database', 'application_server', 'load_balancer']
      };

      const rootCauseResult = {
        primary_cause: 'Memory leak in database connection pooling library',
        confidence_score: 0.89,
        contributing_factors: [
          {
            factor: 'Insufficient connection pool monitoring',
            contribution_weight: 0.35,
            evidence: ['No alerts configured for pool exhaustion']
          },
          {
            factor: 'Legacy library version with known memory issues',
            contribution_weight: 0.25,
            evidence: ['Library version 2.1.3 has documented memory leaks']
          }
        ],
        analysis_method: 'ml_assisted_fishbone',
        supporting_evidence: [
          'Memory usage logs show steady increase over 6 hours',
          'Connection pool metrics indicate resource exhaustion',
          'Similar pattern observed in test environment'
        ]
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: rootCauseResult,
        error: null
      });

      const result = await analysisService.performRootCauseAnalysis(incidentData);
      
      expect(result.success).toBe(true);
      expect(result.data?.confidence_score).toBeGreaterThan(0.8);
      expect(result.data?.contributing_factors.length).toBe(2);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'analyze_root_cause_ml',
        expect.objectContaining({ incident_data: incidentData })
      );
    });

    it('should generate fishbone diagram data', async () => {
      const fishboneData = {
        problem_statement: 'Trading system became unresponsive for 2.5 hours',
        categories: [
          {
            name: 'Technology',
            causes: [
              'Database connection pool exhaustion',
              'Memory leak in pooling library',
              'Insufficient monitoring alerts'
            ]
          },
          {
            name: 'Process',
            causes: [
              'Delayed response to initial alerts',
              'Manual failover procedures',
              'Lack of automated recovery'
            ]
          },
          {
            name: 'People',
            causes: [
              'Weekend skeleton crew',
              'Unfamiliarity with new monitoring system'
            ]
          },
          {
            name: 'Environment',
            causes: [
              'High trading volume day',
              'Database server under capacity stress'
            ]
          }
        ],
        primary_cause: 'Database connection pool exhaustion',
        analysis_confidence: 0.92
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: fishboneData,
        error: null
      });

      const result = await analysisService.generateFishboneDiagram('analysis-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.categories.length).toBe(4);
      expect(result.data?.analysis_confidence).toBeGreaterThan(0.9);
    });

    it('should analyze failure patterns', async () => {
      const patternAnalysis = {
        incident_id: 'incident-123',
        patterns_identified: [
          {
            pattern_type: 'resource_exhaustion',
            frequency: 'monthly',
            similar_incidents: ['incident-098', 'incident-087'],
            pattern_strength: 0.78,
            description: 'Resource exhaustion leading to system failure'
          },
          {
            pattern_type: 'cascade_failure',
            frequency: 'quarterly', 
            similar_incidents: ['incident-102'],
            pattern_strength: 0.65,
            description: 'Single point of failure causing cascade'
          }
        ],
        risk_indicators: [
          'Memory usage trending upward over multiple days',
          'Connection pool utilization above 80% for extended periods'
        ],
        preventive_measures: [
          'Implement proactive memory monitoring',
          'Set up automated connection pool scaling'
        ]
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: patternAnalysis,
        error: null
      });

      const result = await analysisService.analyzeFailurePatterns('incident-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.patterns_identified.length).toBe(2);
      expect(result.data?.risk_indicators.length).toBe(2);
    });
  });

  describe('Impact Assessment', () => {
    it('should calculate financial impact', async () => {
      const impactData = {
        incident_duration_minutes: 150,
        systems_affected: ['trading', 'settlement'],
        transactions_lost: 2847,
        clients_affected: 156,
        business_context: {
          avg_transaction_value: 45000,
          peak_trading_period: true,
          client_tier_distribution: {
            tier1: 23,
            tier2: 89,
            tier3: 44
          }
        }
      };

      const financialImpact = {
        direct_losses: {
          trading_commissions_lost: 125000,
          settlement_fees_lost: 15000,
          penalty_payments: 25000,
          total_direct: 165000
        },
        indirect_losses: {
          client_compensation: 50000,
          regulatory_fines: 100000,
          reputational_damage_estimate: 75000,
          total_indirect: 225000
        },
        recovery_costs: {
          emergency_response: 15000,
          system_repairs: 30000,
          additional_monitoring: 10000,
          total_recovery: 55000
        },
        total_impact: 445000,
        currency: 'USD',
        confidence_level: 0.85
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: financialImpact,
        error: null
      });

      const result = await analysisService.calculateFinancialImpact(impactData);
      
      expect(result.success).toBe(true);
      expect(result.data?.total_impact).toBe(445000);
      expect(result.data?.confidence_level).toBeGreaterThan(0.8);
    });

    it('should assess operational impact', async () => {
      const operationalImpact = {
        systems_impact: [
          {
            system: 'trading',
            downtime_minutes: 150,
            functionality_lost: ['order_execution', 'position_tracking'],
            recovery_time_minutes: 180,
            data_integrity: 'maintained'
          },
          {
            system: 'settlement',
            downtime_minutes: 75,
            functionality_lost: ['trade_settlement'],
            recovery_time_minutes: 90,
            data_integrity: 'maintained'
          }
        ],
        business_process_impact: [
          {
            process: 'client_trading',
            disruption_level: 'severe',
            workaround_available: false,
            sla_breach: true
          },
          {
            process: 'risk_reporting',
            disruption_level: 'moderate',
            workaround_available: true,
            sla_breach: false
          }
        ],
        stakeholder_impact: {
          internal_teams: ['trading_floor', 'risk_management', 'client_services'],
          external_clients: 156,
          regulatory_bodies: ['SEC', 'FINRA'],
          vendors: ['market_data_provider']
        },
        productivity_loss_hours: 450,
        client_satisfaction_impact: -0.3
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: operationalImpact,
        error: null
      });

      const result = await analysisService.assessOperationalImpact('incident-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.systems_impact.length).toBe(2);
      expect(result.data?.productivity_loss_hours).toBe(450);
    });

    it('should analyze reputational impact', async () => {
      const reputationalAnalysis = {
        media_coverage: {
          articles_published: 3,
          sentiment_score: -0.4,
          reach_estimate: 15000,
          key_publications: ['Financial Times', 'Reuters']
        },
        social_media_impact: {
          mentions: 45,
          sentiment_breakdown: {
            positive: 0.1,
            neutral: 0.6,
            negative: 0.3
          },
          influential_accounts: 2
        },
        client_feedback: {
          complaints_received: 23,
          satisfaction_survey_impact: -0.3,
          client_retention_risk: 0.15
        },
        regulatory_attention: {
          inquiries_received: 1,
          compliance_review_triggered: true,
          potential_penalties: 100000
        },
        competitor_advantage: {
          market_share_at_risk: 0.02,
          competitive_response: 'increased_marketing'
        },
        long_term_impact_score: 0.25,
        recovery_timeframe_months: 6
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: reputationalAnalysis,
        error: null
      });

      const result = await analysisService.analyzeReputationalImpact('incident-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.media_coverage.articles_published).toBe(3);
      expect(result.data?.recovery_timeframe_months).toBe(6);
    });
  });

  describe('Lessons Learned Management', () => {
    const mockLesson = {
      analysis_id: 'analysis-123',
      category: 'technical' as const,
      title: 'Database Connection Pool Monitoring is Critical',
      description: 'Comprehensive monitoring of database connection pools is essential for early detection of resource exhaustion before it impacts system availability.',
      context: 'During the trading system outage, the root cause was connection pool exhaustion that went undetected until system failure occurred.',
      key_insights: [
        'Connection pool metrics are leading indicators of potential failures',
        'Automated alerts should trigger well before pool exhaustion',
        'Connection pool sizing should account for peak load plus buffer'
      ],
      applicable_systems: ['trading', 'settlement', 'reporting'],
      applicable_scenarios: ['high_load', 'peak_trading', 'database_maintenance'],
      importance_level: 'high' as const,
      implementation_complexity: 'medium' as const,
      business_value: 'high' as const,
      similar_incidents: ['incident-098', 'incident-087'],
      validation_criteria: [
        'Connection pool alerts trigger before 80% utilization',
        'Automated scaling responds within 30 seconds',
        'No system failures due to pool exhaustion for 6 months'
      ],
      created_by: 'senior-engineer',
      review_status: 'approved' as const
    };

    it('should capture lessons learned', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'lesson-123', ...mockLesson },
        error: null
      });

      const result = await analysisService.captureLessonsLearned(mockLesson);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('lesson-123');
      expect(result.data?.importance_level).toBe('high');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('lessons_learned');
    });

    it('should search lessons learned', async () => {
      const searchCriteria = {
        keywords: ['database', 'connection'],
        categories: ['technical'],
        systems: ['trading'],
        importance_levels: ['high', 'critical']
      };

      const searchResults = [
        {
          id: 'lesson-123',
          title: 'Database Connection Pool Monitoring',
          relevance_score: 0.95,
          match_reasons: ['keyword match: database', 'system match: trading']
        },
        {
          id: 'lesson-124',
          title: 'Connection Timeout Configuration',
          relevance_score: 0.78,
          match_reasons: ['keyword match: connection']
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: searchResults,
        error: null
      });

      const result = await analysisService.searchLessonsLearned(searchCriteria);
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[0].relevance_score).toBeGreaterThan(0.9);
    });

    it('should generate lessons learned report', async () => {
      const reportConfig = {
        analysis_ids: ['analysis-123', 'analysis-124'],
        include_categories: ['technical', 'process'],
        format: 'comprehensive' as const,
        target_audience: 'engineering_team' as const
      };

      const lessonsReport = {
        report_id: 'report-123',
        generation_date: new Date().toISOString(),
        summary: {
          total_lessons: 15,
          high_importance: 8,
          medium_importance: 5,
          low_importance: 2
        },
        key_themes: [
          {
            theme: 'monitoring_gaps',
            lessons_count: 6,
            systems_affected: ['trading', 'settlement'],
            priority: 'high'
          },
          {
            theme: 'response_procedures',
            lessons_count: 4,
            systems_affected: ['all'],
            priority: 'medium'
          }
        ],
        actionable_recommendations: [
          'Implement comprehensive database monitoring across all systems',
          'Establish automated escalation procedures for critical alerts',
          'Create standardized incident response playbooks'
        ],
        implementation_roadmap: {
          immediate_actions: 5,
          short_term_actions: 7,
          long_term_actions: 3
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: lessonsReport,
        error: null
      });

      const result = await analysisService.generateLessonsLearnedReport(reportConfig);
      
      expect(result.success).toBe(true);
      expect(result.data?.summary.total_lessons).toBe(15);
      expect(result.data?.key_themes.length).toBe(2);
    });
  });

  describe('Recommendation Management', () => {
    const mockRecommendation = {
      analysis_id: 'analysis-123',
      title: 'Implement Real-time Database Connection Pool Monitoring',
      description: 'Deploy comprehensive monitoring solution for all database connection pools with proactive alerting and automated scaling capabilities.',
      category: 'technical' as const,
      priority: 'high' as const,
      estimated_effort: 'medium' as const,
      estimated_timeline: '4-6 weeks',
      estimated_cost: 75000,
      assigned_team: 'database_infrastructure',
      assigned_owner: 'senior-dba',
      success_criteria: [
        'Connection pool utilization alerts trigger at 70% capacity',
        'Automated scaling responds within 30 seconds',
        'Zero incidents due to pool exhaustion for 6 months'
      ],
      dependencies: ['monitoring_platform_upgrade', 'database_cluster_optimization'],
      risks: [
        {
          risk: 'Performance impact during monitoring implementation',
          mitigation: 'Implement during low-traffic maintenance windows',
          likelihood: 'low',
          impact: 'medium'
        }
      ],
      business_justification: 'Prevent future trading system outages that could result in $400K+ losses',
      implementation_status: 'planned' as const,
      target_completion_date: '2024-03-15T00:00:00Z'
    };

    it('should create recommendation', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'recommendation-123', ...mockRecommendation },
        error: null
      });

      const result = await analysisService.createRecommendation(mockRecommendation);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('recommendation-123');
      expect(result.data?.priority).toBe('high');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('improvement_recommendations');
    });

    it('should track recommendation implementation', async () => {
      const recommendationId = 'recommendation-123';
      const progressUpdate = {
        implementation_status: 'in_progress' as const,
        progress_percentage: 35,
        status_notes: 'Monitoring platform upgrade completed, beginning pool monitoring configuration',
        completed_milestones: [
          'Monitoring platform upgrade',
          'Test environment configuration'
        ],
        upcoming_milestones: [
          'Production deployment',
          'Alert configuration',
          'Team training'
        ],
        updated_by: 'project-manager'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: recommendationId, ...progressUpdate },
        error: null
      });

      const result = await analysisService.trackRecommendationProgress(recommendationId, progressUpdate);
      
      expect(result.success).toBe(true);
      expect(result.data?.progress_percentage).toBe(35);
      expect(result.data?.completed_milestones.length).toBe(2);
    });

    it('should prioritize recommendations', async () => {
      const prioritizationCriteria = {
        analysis_ids: ['analysis-123', 'analysis-124'],
        weighting_factors: {
          risk_reduction: 0.4,
          implementation_effort: 0.2,
          cost_benefit: 0.25,
          strategic_alignment: 0.15
        }
      };

      const prioritizedRecommendations = [
        {
          id: 'recommendation-123',
          title: 'Database Monitoring Enhancement',
          priority_score: 0.89,
          ranking: 1,
          justification: 'High risk reduction with moderate effort'
        },
        {
          id: 'recommendation-124',
          title: 'Incident Response Automation',
          priority_score: 0.76,
          ranking: 2,
          justification: 'Good cost-benefit ratio'
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: prioritizedRecommendations,
        error: null
      });

      const result = await analysisService.prioritizeRecommendations(prioritizationCriteria);
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[0].priority_score).toBeGreaterThan(0.8);
    });
  });

  describe('Analytics and Reporting', () => {
    it('should generate analytics report', async () => {
      const dateRange = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-03-31T23:59:59Z'
      };

      const analyticsReport = {
        period: dateRange,
        summary_metrics: {
          total_analyses: 25,
          completed_analyses: 22,
          avg_completion_time_days: 8.5,
          total_recommendations: 78,
          implemented_recommendations: 45
        },
        incident_categories: [
          { category: 'technical', count: 15, percentage: 0.60 },
          { category: 'process', count: 7, percentage: 0.28 },
          { category: 'human_error', count: 3, percentage: 0.12 }
        ],
        root_cause_patterns: [
          { pattern: 'monitoring_gaps', frequency: 8, trend: 'decreasing' },
          { pattern: 'capacity_issues', frequency: 6, trend: 'stable' }
        ],
        recommendation_effectiveness: {
          avg_implementation_rate: 0.68,
          high_priority_completion: 0.85,
          roi_estimate: 3.2
        },
        lessons_learned_utilization: {
          total_lessons: 156,
          referenced_in_new_analyses: 89,
          applied_to_improvements: 67
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: analyticsReport,
        error: null
      });

      const result = await analysisService.generateAnalyticsReport(dateRange);
      
      expect(result.success).toBe(true);
      expect(result.data?.summary_metrics.total_analyses).toBe(25);
      expect(result.data?.recommendation_effectiveness.roi_estimate).toBeGreaterThan(3.0);
    });

    it('should analyze improvement trends', async () => {
      const trendAnalysis = {
        analysis_period: {
          start: '2024-01-01',
          end: '2024-03-31'
        },
        mttr_trends: {
          current_quarter: 4.2,
          previous_quarter: 6.8,
          improvement_percentage: 38,
          trend_direction: 'improving'
        },
        incident_recurrence: {
          total_incidents: 45,
          recurring_incidents: 8,
          recurrence_rate: 0.18,
          trend_direction: 'stable'
        },
        process_maturity: {
          analysis_quality_score: 0.87,
          recommendation_implementation_rate: 0.72,
          lessons_learned_application_rate: 0.65,
          overall_maturity_level: 'advanced'
        },
        predictive_insights: [
          {
            insight: 'Database-related incidents likely to decrease by 40% with current improvements',
            confidence: 0.78,
            timeframe: '6_months'
          }
        ]
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: trendAnalysis,
        error: null
      });

      const result = await analysisService.analyzeImprovementTrends();
      
      expect(result.success).toBe(true);
      expect(result.data?.mttr_trends.improvement_percentage).toBe(38);
      expect(result.data?.process_maturity.overall_maturity_level).toBe('advanced');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid analysis data', async () => {
      const invalidAnalysis = {
        incident_id: '',
        analysis_type: 'invalid_type' as any,
        title: '',
        root_cause_analysis: null
      };

      const result = await analysisService.createAnalysis(invalidAnalysis);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('validation failed');
    });

    it('should handle ML service failures', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Root cause analysis ML service unavailable', code: 'ML_ERROR' }
      });

      const result = await analysisService.performRootCauseAnalysis({
        incident_id: 'incident-123',
        symptoms: [],
        timeline: [],
        affected_components: []
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('ML service unavailable');
    });

    it('should handle missing incident data', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Incident not found' }
      });

      const result = await analysisService.getAnalysesByIncident('non-existent-incident');
      
      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(404);
    });

    it('should handle calculation errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Financial impact calculation failed', code: 'CALCULATION_ERROR' }
      });

      const result = await analysisService.calculateFinancialImpact({
        incident_duration_minutes: 150,
        systems_affected: [],
        transactions_lost: 0,
        clients_affected: 0
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('calculation failed');
    });
  });
});