/**
 * Crisis Preparedness Service Tests  
 * Test suite for crisis scenario planning, simulations, training, and preparedness assessments
 */

import { CrisisPreparednessService } from '../crisis-preparedness.service';

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

describe('CrisisPreparednessService', () => {
  let preparednessService: CrisisPreparednessService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    preparednessService = new CrisisPreparednessService(mockSupabaseClient as any);
  });

  describe('Scenario Management', () => {
    const mockScenario = {
      name: 'Cybersecurity Data Breach Scenario',
      description: 'Comprehensive scenario simulating a major cybersecurity breach affecting customer data and trading systems',
      category: 'cybersecurity' as const,
      severity_level: 'critical' as const,
      scenario_details: {
        trigger_event: 'Unauthorized access detected to customer database',
        initial_scope: 'Customer PII database (50,000 records)',
        potential_escalation: 'Trading system compromise, regulatory violations',
        external_factors: ['Media attention', 'Regulatory scrutiny', 'Client panic']
      },
      affected_systems: ['customer_database', 'trading_platform', 'communication_systems'],
      stakeholders_involved: [
        'board_of_directors',
        'ceo',
        'ciso',
        'legal_counsel',
        'communications_team',
        'it_operations'
      ],
      timeline_phases: [
        {
          phase: 'detection',
          duration_minutes: 30,
          key_decisions: ['Assess breach scope', 'Activate incident response team'],
          critical_actions: ['Isolate affected systems', 'Preserve forensic evidence']
        },
        {
          phase: 'containment',
          duration_minutes: 120,
          key_decisions: ['Notify law enforcement', 'Activate board communication'],
          critical_actions: ['Implement containment measures', 'Begin stakeholder notifications']
        },
        {
          phase: 'recovery',
          duration_minutes: 480,
          key_decisions: ['Customer notification strategy', 'Public disclosure timing'],
          critical_actions: ['System restoration', 'Media response', 'Regulatory reporting']
        }
      ],
      learning_objectives: [
        'Test incident response coordination',
        'Evaluate board communication procedures',
        'Assess regulatory notification processes',
        'Practice crisis communications'
      ],
      complexity_level: 'advanced' as const,
      estimated_duration: 240, // minutes
      required_participants: [
        { role: 'incident_commander', required: true },
        { role: 'legal_counsel', required: true },
        { role: 'communications_lead', required: true },
        { role: 'technical_lead', required: true }
      ],
      success_criteria: [
        'Incident response team activated within 15 minutes',
        'Board notified within 30 minutes',
        'Regulatory authorities contacted within 2 hours',
        'Public statement prepared within 4 hours'
      ],
      created_by: 'crisis-planning-team',
      last_updated: new Date().toISOString()
    };

    it('should create crisis scenario', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'scenario-123', ...mockScenario },
        error: null
      });

      const result = await preparednessService.createScenario(mockScenario);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('scenario-123');
      expect(result.data?.category).toBe('cybersecurity');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('crisis_scenarios');
    });

    it('should validate scenario configuration', async () => {
      const invalidScenario = {
        ...mockScenario,
        name: '', // Invalid empty name
        timeline_phases: [], // Invalid empty phases
        required_participants: [] // Invalid empty participants
      };

      const result = await preparednessService.createScenario(invalidScenario);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('validation failed');
    });

    it('should get scenarios by category', async () => {
      const scenarios = [
        {
          id: 'scenario-1',
          name: 'Data Breach Response',
          category: 'cybersecurity',
          severity_level: 'critical'
        },
        {
          id: 'scenario-2',
          name: 'Insider Trading Investigation',
          category: 'regulatory',
          severity_level: 'high'
        }
      ];

      mockSupabaseClient.from().select().eq().order().mockResolvedValue({
        data: scenarios,
        error: null
      });

      const result = await preparednessService.getScenariosByCategory('cybersecurity');
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[0].category).toBe('cybersecurity');
    });

    it('should update scenario details', async () => {
      const scenarioId = 'scenario-123';
      const updates = {
        severity_level: 'high' as const,
        estimated_duration: 180,
        last_updated: new Date().toISOString(),
        updated_by: 'scenario-manager'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: scenarioId, ...updates },
        error: null
      });

      const result = await preparednessService.updateScenario(scenarioId, updates);
      
      expect(result.success).toBe(true);
      expect(result.data?.severity_level).toBe('high');
    });

    it('should generate scenario variations', async () => {
      const baseScenarioId = 'scenario-123';
      const variationConfig = {
        complexity_levels: ['intermediate', 'advanced'],
        stakeholder_variations: ['reduced_board_availability', 'weekend_skeleton_crew'],
        external_factors: ['media_frenzy', 'regulatory_holiday']
      };

      const generatedVariations = [
        {
          id: 'scenario-123-var1',
          name: 'Cybersecurity Breach - Weekend Response',
          complexity_level: 'intermediate',
          modifications: ['Reduced staff availability', 'Limited regulatory support']
        },
        {
          id: 'scenario-123-var2', 
          name: 'Cybersecurity Breach - Media Intensive',
          complexity_level: 'advanced',
          modifications: ['High media attention', 'Social media amplification']
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: generatedVariations,
        error: null
      });

      const result = await preparednessService.generateScenarioVariations(baseScenarioId, variationConfig);
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });
  });

  describe('Exercise Session Management', () => {
    const mockExerciseSession = {
      scenario_id: 'scenario-123',
      session_name: 'Q1 Cybersecurity Response Exercise',
      session_type: 'tabletop_exercise' as const,
      scheduled_date: new Date(Date.now() + 604800000).toISOString(), // 1 week from now
      duration_minutes: 180,
      facilitator_id: 'crisis-trainer',
      participants: [
        {
          user_id: 'board-chair',
          role: 'board_member',
          participation_type: 'required' as const,
          confirmed: true
        },
        {
          user_id: 'ceo',
          role: 'executive',
          participation_type: 'required' as const,
          confirmed: true
        },
        {
          user_id: 'legal-counsel',
          role: 'legal',
          participation_type: 'required' as const,
          confirmed: false
        }
      ],
      exercise_objectives: [
        'Evaluate incident response team coordination',
        'Test board notification procedures',
        'Assess crisis communication effectiveness',
        'Identify process improvement opportunities'
      ],
      exercise_format: 'hybrid' as const, // in-person + virtual
      location_details: {
        primary_location: 'Board Room A',
        virtual_platform: 'Microsoft Teams',
        backup_location: 'Conference Room B'
      },
      materials_needed: [
        'Scenario briefing packets',
        'Decision tracking sheets',
        'Communication templates',
        'Timeline tracking boards'
      ],
      success_metrics: [
        'All key decisions made within target timeframes',
        '95% participant engagement score',
        'No critical process gaps identified',
        'Action items captured for all improvement areas'
      ],
      prep_requirements: [
        'Participant briefing 1 week prior',
        'Materials distribution 3 days prior',
        'Technical setup 1 hour prior'
      ],
      created_by: 'training-coordinator'
    };

    it('should schedule exercise session', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'session-123', ...mockExerciseSession },
        error: null
      });

      const result = await preparednessService.scheduleExerciseSession(mockExerciseSession);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('session-123');
      expect(result.data?.session_type).toBe('tabletop_exercise');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('exercise_sessions');
    });

    it('should manage participant responses', async () => {
      const sessionId = 'session-123';
      const participantUpdates = [
        {
          user_id: 'legal-counsel',
          confirmed: true,
          response_notes: 'Will join virtually due to travel'
        },
        {
          user_id: 'cfo',
          confirmed: false,
          response_notes: 'Scheduling conflict, requesting reschedule'
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: { updated_count: 2, confirmation_rate: 0.85 },
        error: null
      });

      const result = await preparednessService.updateParticipantResponses(sessionId, participantUpdates);
      
      expect(result.success).toBe(true);
      expect(result.data?.updated_count).toBe(2);
    });

    it('should conduct exercise session', async () => {
      const sessionId = 'session-123';
      const sessionExecution = {
        start_time: new Date().toISOString(),
        actual_participants: ['board-chair', 'ceo', 'legal-counsel', 'ciso'],
        exercise_phases: [
          {
            phase: 'briefing',
            start_time: new Date().toISOString(),
            duration_minutes: 15,
            objectives_covered: ['Scenario overview', 'Exercise rules', 'Success criteria']
          },
          {
            phase: 'simulation',
            start_time: new Date(Date.now() + 900000).toISOString(), // 15 mins later
            duration_minutes: 120,
            key_decisions: [
              {
                decision_point: 'Activate incident response team',
                participants_involved: ['board-chair', 'ceo'],
                decision_time_minutes: 8,
                target_time_minutes: 15
              }
            ]
          }
        ],
        observations: [
          {
            observer_id: 'crisis-trainer',
            timestamp: new Date().toISOString(),
            observation: 'Board chair demonstrated strong leadership in initial response phase',
            category: 'leadership_effectiveness'
          }
        ],
        real_time_notes: 'Exercise proceeding smoothly, good engagement from all participants'
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: sessionId, status: 'in_progress', ...sessionExecution },
        error: null
      });

      const result = await preparednessService.conductExerciseSession(sessionId, sessionExecution);
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('in_progress');
    });

    it('should complete exercise evaluation', async () => {
      const sessionId = 'session-123';
      const evaluation = {
        completion_time: new Date().toISOString(),
        overall_score: 8.5,
        objective_scores: [
          { objective: 'Incident response coordination', score: 9.0, notes: 'Excellent coordination and communication' },
          { objective: 'Board notification procedures', score: 8.0, notes: 'Slight delay in initial notification' },
          { objective: 'Crisis communication', score: 8.5, notes: 'Clear and effective messaging' }
        ],
        participant_feedback: [
          {
            user_id: 'board-chair',
            satisfaction_score: 9,
            feedback: 'Excellent exercise, very realistic scenario',
            suggestions: ['Consider adding media simulation component']
          }
        ],
        identified_gaps: [
          {
            gap_category: 'process',
            description: 'Board notification checklist needs updating',
            severity: 'medium',
            recommended_action: 'Update notification procedures and templates'
          }
        ],
        lessons_learned: [
          {
            category: 'communication',
            lesson: 'Clear escalation paths are critical for rapid board engagement',
            importance: 'high' as const
          }
        ],
        action_items: [
          {
            title: 'Update board notification checklist',
            priority: 'medium' as const,
            assigned_to: 'governance-team',
            due_date: new Date(Date.now() + 1209600000).toISOString() // 2 weeks
          }
        ],
        next_exercise_recommendations: [
          'Increase scenario complexity',
          'Add regulatory interaction component'
        ]
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: sessionId, status: 'completed', ...evaluation },
        error: null
      });

      const result = await preparednessService.completeExerciseEvaluation(sessionId, evaluation);
      
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
      expect(result.data?.overall_score).toBe(8.5);
    });
  });

  describe('Training Program Management', () => {
    const mockTrainingProgram = {
      name: 'Board Crisis Response Certification',
      description: 'Comprehensive training program for board members on crisis response procedures and decision-making',
      program_type: 'certification' as const,
      target_audience: 'board_members' as const,
      difficulty_level: 'advanced' as const,
      total_duration_hours: 20,
      modules: [
        {
          module_id: 'module-1',
          title: 'Crisis Response Fundamentals',
          description: 'Core principles of crisis management and board responsibilities',
          duration_hours: 4,
          learning_objectives: [
            'Understand board role in crisis response',
            'Learn crisis escalation procedures',
            'Practice initial response protocols'
          ],
          content_type: 'interactive_workshop',
          prerequisites: [],
          assessment_required: true
        },
        {
          module_id: 'module-2',
          title: 'Communication and Media Relations',
          description: 'Crisis communication strategies and media management',
          duration_hours: 6,
          learning_objectives: [
            'Master crisis communication principles',
            'Practice stakeholder messaging',
            'Handle media interactions effectively'
          ],
          content_type: 'scenario_based',
          prerequisites: ['module-1'],
          assessment_required: true
        }
      ],
      certification_requirements: {
        passing_score: 80,
        practical_assessment: true,
        recertification_period_months: 24,
        continuing_education_hours: 8
      },
      delivery_methods: ['in_person', 'virtual', 'hybrid'],
      scheduling_flexibility: 'high',
      maximum_participants: 15,
      created_by: 'training-director'
    };

    it('should create training program', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'program-123', ...mockTrainingProgram },
        error: null
      });

      const result = await preparednessService.createTrainingProgram(mockTrainingProgram);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('program-123');
      expect(result.data?.program_type).toBe('certification');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('training_programs');
    });

    it('should enroll participants in training', async () => {
      const programId = 'program-123';
      const enrollments = [
        {
          user_id: 'board-member-1',
          enrollment_date: new Date().toISOString(),
          target_completion_date: new Date(Date.now() + 2592000000).toISOString(), // 30 days
          learning_preferences: {
            delivery_method: 'hybrid',
            scheduling_preference: 'weekends',
            special_accommodations: []
          }
        },
        {
          user_id: 'board-member-2',
          enrollment_date: new Date().toISOString(),
          target_completion_date: new Date(Date.now() + 2592000000).toISOString(),
          learning_preferences: {
            delivery_method: 'virtual',
            scheduling_preference: 'evenings',
            special_accommodations: ['closed_captioning']
          }
        }
      ];

      mockSupabaseClient.from().insert().mockResolvedValue({
        data: enrollments.map((e, i) => ({ id: `enrollment-${i + 1}`, program_id: programId, ...e })),
        error: null
      });

      const result = await preparednessService.enrollParticipants(programId, enrollments);
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it('should track training progress', async () => {
      const enrollmentId = 'enrollment-123';
      const progressUpdate = {
        modules_completed: ['module-1'],
        current_module: 'module-2',
        progress_percentage: 45,
        assessment_scores: [
          { module_id: 'module-1', score: 88, passed: true }
        ],
        learning_hours_completed: 6.5,
        last_activity_date: new Date().toISOString(),
        engagement_metrics: {
          session_attendance: 0.95,
          assignment_completion: 0.90,
          participation_score: 8.7
        }
      };

      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: { id: enrollmentId, ...progressUpdate },
        error: null
      });

      const result = await preparednessService.trackTrainingProgress(enrollmentId, progressUpdate);
      
      expect(result.success).toBe(true);
      expect(result.data?.progress_percentage).toBe(45);
      expect(result.data?.modules_completed.length).toBe(1);
    });

    it('should generate training certificates', async () => {
      const certificationRequest = {
        program_id: 'program-123',
        participant_id: 'board-member-1',
        completion_date: new Date().toISOString(),
        final_score: 92,
        competencies_demonstrated: [
          'Crisis response leadership',
          'Stakeholder communication',
          'Decision making under pressure'
        ]
      };

      const generatedCertificate = {
        certificate_id: 'cert-123',
        certificate_number: 'CRC-2024-001',
        issue_date: new Date().toISOString(),
        valid_until: new Date(Date.now() + 63072000000).toISOString(), // 2 years
        digital_signature: 'cert_signature_hash_123',
        verification_url: 'https://verify.company.com/cert-123',
        pdf_url: 'https://certificates.company.com/cert-123.pdf'
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: generatedCertificate,
        error: null
      });

      const result = await preparednessService.generateTrainingCertificate(certificationRequest);
      
      expect(result.success).toBe(true);
      expect(result.data?.certificate_number).toBe('CRC-2024-001');
    });
  });

  describe('Preparedness Assessment', () => {
    const mockAssessment = {
      assessment_name: 'Q1 2024 Crisis Preparedness Assessment',
      assessment_type: 'comprehensive' as const,
      scope: {
        assessment_areas: [
          'incident_response_procedures',
          'communication_protocols', 
          'stakeholder_management',
          'business_continuity',
          'regulatory_compliance'
        ],
        organizational_levels: ['board', 'executive', 'operational'],
        business_functions: ['trading', 'risk', 'compliance', 'it']
      },
      assessment_methodology: {
        data_collection_methods: [
          'surveys',
          'interviews', 
          'document_review',
          'process_observation',
          'scenario_testing'
        ],
        evaluation_criteria: [
          {
            criterion: 'response_time_effectiveness',
            weight: 0.25,
            measurement: 'quantitative'
          },
          {
            criterion: 'communication_clarity',
            weight: 0.20,
            measurement: 'qualitative'
          }
        ]
      },
      target_participants: [
        { role: 'board_members', required: 7, confirmed: 6 },
        { role: 'executives', required: 5, confirmed: 5 },
        { role: 'department_heads', required: 12, confirmed: 10 }
      ],
      timeline: {
        assessment_start: new Date().toISOString(),
        assessment_end: new Date(Date.now() + 1209600000).toISOString(), // 2 weeks
        report_delivery: new Date(Date.now() + 1814400000).toISOString() // 3 weeks
      },
      deliverables: [
        'Executive summary report',
        'Detailed findings analysis',
        'Risk assessment matrix',
        'Improvement recommendations',
        'Implementation roadmap'
      ],
      conducted_by: 'external_consultant'
    };

    it('should initiate preparedness assessment', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: { id: 'assessment-123', status: 'initiated', ...mockAssessment },
        error: null
      });

      const result = await preparednessService.initiatePreparednessAssessment(mockAssessment);
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('assessment-123');
      expect(result.data?.status).toBe('initiated');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('preparedness_assessments');
    });

    it('should conduct assessment evaluation', async () => {
      const assessmentId = 'assessment-123';
      const evaluationData = {
        assessment_areas_evaluated: [
          {
            area: 'incident_response_procedures',
            score: 8.2,
            strengths: [
              'Clear escalation procedures',
              'Well-defined roles and responsibilities'
            ],
            weaknesses: [
              'Response time targets not consistently met',
              'Limited after-hours coverage'
            ],
            evidence: [
              'Response time analysis from last 6 months',
              'Procedure documentation review'
            ]
          },
          {
            area: 'communication_protocols',
            score: 7.5,
            strengths: [
              'Comprehensive stakeholder mapping',
              'Multiple communication channels available'
            ],
            weaknesses: [
              'Message approval process too lengthy',
              'Inconsistent message templates'
            ],
            evidence: [
              'Communication timeline analysis',
              'Template effectiveness review'
            ]
          }
        ],
        overall_preparedness_score: 7.8,
        maturity_level: 'advanced' as const,
        benchmark_comparison: {
          industry_average: 6.9,
          peer_group_average: 7.2,
          best_in_class: 9.1
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: evaluationData,
        error: null
      });

      const result = await preparednessService.conductAssessmentEvaluation(assessmentId);
      
      expect(result.success).toBe(true);
      expect(result.data?.overall_preparedness_score).toBe(7.8);
      expect(result.data?.maturity_level).toBe('advanced');
    });

    it('should generate preparedness report', async () => {
      const reportConfig = {
        assessment_id: 'assessment-123',
        report_format: 'comprehensive' as const,
        include_sections: [
          'executive_summary',
          'detailed_findings',
          'risk_assessment',
          'recommendations',
          'implementation_plan'
        ],
        target_audience: 'board_and_executives' as const
      };

      const generatedReport = {
        report_id: 'report-123',
        generation_date: new Date().toISOString(),
        executive_summary: {
          overall_score: 7.8,
          key_findings: [
            'Strong foundation with room for improvement in response times',
            'Communication protocols need streamlining',
            'Technology infrastructure is adequate but aging'
          ],
          critical_recommendations: [
            'Implement automated alert systems',
            'Streamline approval processes',
            'Upgrade crisis management technology'
          ]
        },
        risk_assessment: {
          high_risk_areas: [
            { area: 'cyber_attack_response', risk_score: 8.5 },
            { area: 'regulatory_crisis_management', risk_score: 7.8 }
          ],
          medium_risk_areas: [
            { area: 'operational_disruption', risk_score: 6.2 }
          ],
          low_risk_areas: [
            { area: 'natural_disaster_response', risk_score: 3.1 }
          ]
        },
        implementation_roadmap: {
          immediate_actions: 5,
          short_term_initiatives: 12,
          long_term_strategic_changes: 4,
          estimated_investment: 450000,
          timeline_months: 18
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: generatedReport,
        error: null
      });

      const result = await preparednessService.generatePreparednessReport(reportConfig);
      
      expect(result.success).toBe(true);
      expect(result.data?.executive_summary.overall_score).toBe(7.8);
      expect(result.data?.implementation_roadmap.immediate_actions).toBe(5);
    });
  });

  describe('Analytics and Insights', () => {
    it('should analyze preparedness trends', async () => {
      const trendAnalysis = {
        analysis_period: {
          start_date: '2024-01-01',
          end_date: '2024-03-31'
        },
        preparedness_evolution: {
          baseline_score: 6.8,
          current_score: 7.8,
          improvement_rate: 0.15,
          trend_direction: 'improving'
        },
        exercise_effectiveness: {
          total_exercises: 8,
          average_score: 8.1,
          participant_satisfaction: 0.89,
          improvement_trend: 'stable'
        },
        training_impact: {
          programs_completed: 3,
          participants_certified: 45,
          competency_improvement: 0.23,
          retention_rate: 0.95
        },
        gap_closure_progress: {
          gaps_identified: 15,
          gaps_addressed: 11,
          closure_rate: 0.73,
          average_closure_time_days: 45
        },
        benchmark_positioning: {
          industry_percentile: 78,
          peer_group_ranking: 3,
          improvement_velocity: 'above_average'
        }
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: trendAnalysis,
        error: null
      });

      const result = await preparednessService.analyzePreparednessMetrics({
        start_date: '2024-01-01',
        end_date: '2024-03-31'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.preparedness_evolution.improvement_rate).toBe(0.15);
      expect(result.data?.gap_closure_progress.closure_rate).toBe(0.73);
    });

    it('should identify readiness gaps', async () => {
      const readinessGaps = {
        assessment_date: new Date().toISOString(),
        critical_gaps: [
          {
            gap_category: 'technology',
            gap_description: 'Automated incident detection system missing',
            risk_level: 'high',
            impact_assessment: 'Delayed incident response, potential escalation',
            remediation_priority: 'immediate',
            estimated_effort: 'high',
            estimated_timeline: '3-4 months'
          },
          {
            gap_category: 'process',
            gap_description: 'Board notification procedures lack automation',
            risk_level: 'medium',
            impact_assessment: 'Delayed board engagement in crisis situations',
            remediation_priority: 'high',
            estimated_effort: 'medium',
            estimated_timeline: '6-8 weeks'
          }
        ],
        moderate_gaps: [
          {
            gap_category: 'training',
            gap_description: 'Limited crisis simulation experience for new board members',
            risk_level: 'medium',
            impact_assessment: 'Reduced effectiveness in first crisis response',
            remediation_priority: 'medium',
            estimated_effort: 'low',
            estimated_timeline: '4-6 weeks'
          }
        ],
        overall_readiness_score: 7.2,
        readiness_level: 'good_with_gaps' as const,
        next_assessment_recommended: new Date(Date.now() + 15552000000).toISOString() // 6 months
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: readinessGaps,
        error: null
      });

      const result = await preparednessService.identifyReadinessGaps();
      
      expect(result.success).toBe(true);
      expect(result.data?.critical_gaps.length).toBe(2);
      expect(result.data?.overall_readiness_score).toBe(7.2);
    });

    it('should generate improvement recommendations', async () => {
      const recommendations = {
        assessment_basis: 'Q1 2024 Comprehensive Assessment',
        recommendation_categories: [
          {
            category: 'immediate_actions',
            priority: 'critical',
            recommendations: [
              {
                title: 'Deploy Automated Incident Detection',
                description: 'Implement ML-based incident detection system',
                business_justification: 'Reduce detection time from 30 min to 5 min',
                estimated_cost: 125000,
                timeline_weeks: 12,
                success_metrics: ['Detection time < 5 min', '95% accuracy rate']
              }
            ]
          },
          {
            category: 'process_improvements',
            priority: 'high',
            recommendations: [
              {
                title: 'Streamline Communication Approval',
                description: 'Implement tiered approval system with bypass options',
                business_justification: 'Reduce approval time by 60%',
                estimated_cost: 25000,
                timeline_weeks: 6,
                success_metrics: ['Approval time < 30 min', '98% stakeholder satisfaction']
              }
            ]
          }
        ],
        implementation_sequence: [
          { phase: 1, duration_weeks: 8, parallel_initiatives: 3 },
          { phase: 2, duration_weeks: 12, parallel_initiatives: 5 }
        ],
        total_investment_required: 275000,
        expected_roi: 3.2,
        risk_mitigation_value: 'high'
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: recommendations,
        error: null
      });

      const result = await preparednessService.generateImprovementRecommendations('assessment-123');
      
      expect(result.success).toBe(true);
      expect(result.data?.expected_roi).toBe(3.2);
      expect(result.data?.recommendation_categories.length).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid scenario configuration', async () => {
      const invalidScenario = {
        name: '',
        description: 'Test',
        category: 'invalid_category' as any,
        timeline_phases: []
      };

      const result = await preparednessService.createScenario(invalidScenario);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('validation failed');
    });

    it('should handle exercise scheduling conflicts', async () => {
      mockSupabaseClient.from().insert().single.mockResolvedValue({
        data: null,
        error: { code: 'SCHEDULING_CONFLICT', message: 'Facilitator unavailable at requested time' }
      });

      const result = await preparednessService.scheduleExerciseSession({
        scenario_id: 'scenario-123',
        session_name: 'Test Exercise',
        scheduled_date: new Date().toISOString(),
        facilitator_id: 'unavailable-facilitator'
      } as any);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('unavailable at requested time');
    });

    it('should handle assessment service failures', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Assessment analysis service unavailable', code: 'SERVICE_ERROR' }
      });

      const result = await preparednessService.conductAssessmentEvaluation('assessment-123');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('service unavailable');
    });

    it('should handle training enrollment failures', async () => {
      mockSupabaseClient.from().insert().mockResolvedValue({
        data: null,
        error: { message: 'Program capacity exceeded', code: 'CAPACITY_ERROR' }
      });

      const result = await preparednessService.enrollParticipants('program-123', [
        { user_id: 'user-1', enrollment_date: new Date().toISOString() }
      ] as any);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('capacity exceeded');
    });

    it('should handle certificate generation failures', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Certificate template service error', code: 'CERT_ERROR' }
      });

      const result = await preparednessService.generateTrainingCertificate({
        program_id: 'program-123',
        participant_id: 'user-123',
        completion_date: new Date().toISOString(),
        final_score: 85
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Certificate template service error');
    });
  });
});