import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { skillsAssessmentService } from '@/lib/services/skills-assessment-service';

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  neq: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(),
  rpc: jest.fn()
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase
}));

describe('SkillsAssessmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSkillFrameworks', () => {
    it('should return available skill frameworks', async () => {
      const mockFrameworks = [
        {
          id: 'framework-1',
          name: 'Board Governance Framework',
          description: 'Comprehensive governance skills assessment',
          version: '1.0',
          skill_categories: [
            { id: 'cat-1', name: 'Strategic Oversight', weight: 0.3 },
            { id: 'cat-2', name: 'Risk Management', weight: 0.25 }
          ]
        },
        {
          id: 'framework-2',
          name: 'Audit Committee Framework',
          description: 'Specialized audit committee competencies',
          version: '1.2',
          skill_categories: [
            { id: 'cat-3', name: 'Financial Reporting', weight: 0.4 },
            { id: 'cat-4', name: 'Internal Controls', weight: 0.35 }
          ]
        }
      ];

      mockSupabase.single.mockResolvedValue({
        data: mockFrameworks,
        error: null
      });

      const result = await skillsAssessmentService.getSkillFrameworks();

      expect(mockSupabase.from).toHaveBeenCalledWith('skill_frameworks');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockSupabase.order).toHaveBeenCalledWith('name');
      expect(result).toEqual(mockFrameworks);
    });
  });

  describe('createAssessment', () => {
    it('should create assessment successfully', async () => {
      const mockAssessment = {
        id: 'assessment-1',
        user_id: 'user-1',
        framework_id: 'framework-1',
        assessment_type: 'self_assessment',
        status: 'in_progress',
        created_at: '2024-01-15T10:00:00Z'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockAssessment,
        error: null
      });

      const assessmentData = {
        user_id: 'user-1',
        framework_id: 'framework-1',
        assessment_type: 'self_assessment' as const,
        assessed_by_id: 'user-1',
        context: 'Annual board evaluation'
      };

      const result = await skillsAssessmentService.createAssessment(assessmentData);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-1',
        framework_id: 'framework-1',
        assessment_type: 'self_assessment',
        status: 'in_progress',
        assessed_by_id: 'user-1',
        context: 'Annual board evaluation'
      }));
      expect(result).toEqual(mockAssessment);
    });
  });

  describe('updateAssessmentResponse', () => {
    it('should update skill rating and notes', async () => {
      const mockResponse = {
        id: 'response-1',
        assessment_id: 'assessment-1',
        skill_id: 'skill-1',
        proficiency_rating: 4,
        confidence_level: 3
      };

      mockSupabase.single.mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const responseData = {
        skill_id: 'skill-1',
        proficiency_rating: 4,
        confidence_level: 3,
        evidence_notes: 'Strong experience in financial oversight from previous audit committee role',
        development_interest: 5
      };

      const result = await skillsAssessmentService.updateAssessmentResponse(
        'assessment-1',
        responseData
      );

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        assessment_id: 'assessment-1',
        skill_id: 'skill-1',
        proficiency_rating: 4,
        confidence_level: 3,
        evidence_notes: 'Strong experience in financial oversight from previous audit committee role',
        development_interest: 5
      }));
      expect(result).toEqual(mockResponse);
    });
  });

  describe('completeAssessment', () => {
    it('should complete assessment and calculate scores', async () => {
      const mockCompletedAssessment = {
        id: 'assessment-1',
        status: 'completed',
        completion_date: '2024-01-20T15:30:00Z',
        overall_score: 85,
        category_scores: {
          'Strategic Oversight': 90,
          'Risk Management': 80,
          'Financial Literacy': 85
        }
      };

      mockSupabase.single.mockResolvedValue({
        data: mockCompletedAssessment,
        error: null
      });

      const result = await skillsAssessmentService.completeAssessment('assessment-1');

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        completion_date: expect.any(String)
      }));
      expect(result).toEqual(mockCompletedAssessment);
    });
  });

  describe('performGapAnalysis', () => {
    it('should identify skill gaps and provide recommendations', async () => {
      const mockGapAnalysis = {
        user_id: 'user-1',
        assessment_id: 'assessment-1',
        overall_gap_score: 2.3,
        priority_gaps: [
          {
            skill_name: 'Cybersecurity Oversight',
            current_level: 2,
            target_level: 4,
            gap_size: 2,
            priority_score: 0.9,
            development_recommendations: [
              'Complete cybersecurity fundamentals course',
              'Attend NACD cyber governance workshop'
            ]
          },
          {
            skill_name: 'ESG Strategy',
            current_level: 3,
            target_level: 4,
            gap_size: 1,
            priority_score: 0.7,
            development_recommendations: [
              'ESG reporting and disclosure training',
              'Sustainability leadership certification'
            ]
          }
        ],
        strengths: [
          {
            skill_name: 'Financial Analysis',
            current_level: 5,
            proficiency_percentile: 95
          }
        ],
        development_plan: {
          immediate_actions: ['Enroll in cybersecurity course'],
          short_term_goals: ['Complete ESG certification within 6 months'],
          long_term_objectives: ['Become cyber-risk committee chair ready']
        }
      };

      mockSupabase.single.mockResolvedValue({
        data: mockGapAnalysis,
        error: null
      });

      const result = await skillsAssessmentService.performGapAnalysis('user-1', 'assessment-1');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('perform_skills_gap_analysis', {
        user_uuid: 'user-1',
        assessment_uuid: 'assessment-1'
      });
      expect(result).toEqual(mockGapAnalysis);
    });
  });

  describe('getSkillBenchmarks', () => {
    it('should return role-based skill benchmarks', async () => {
      const mockBenchmarks = [
        {
          skill_name: 'Strategic Planning',
          role: 'board_chair',
          target_proficiency: 5,
          industry_average: 4.2,
          percentile_90: 4.8,
          importance_weight: 0.9
        },
        {
          skill_name: 'Financial Oversight',
          role: 'audit_committee',
          target_proficiency: 5,
          industry_average: 4.5,
          percentile_90: 4.9,
          importance_weight: 1.0
        }
      ];

      mockSupabase.single.mockResolvedValue({
        data: mockBenchmarks,
        error: null
      });

      const result = await skillsAssessmentService.getSkillBenchmarks('board_chair', 'technology');

      expect(mockSupabase.from).toHaveBeenCalledWith('skill_benchmarks');
      expect(mockSupabase.eq).toHaveBeenCalledWith('role', 'board_chair');
      expect(mockSupabase.eq).toHaveBeenCalledWith('industry', 'technology');
      expect(result).toEqual(mockBenchmarks);
    });
  });

  describe('generateDevelopmentPlan', () => {
    it('should create personalized development plan', async () => {
      const mockPlan = {
        id: 'plan-1',
        user_id: 'user-1',
        assessment_id: 'assessment-1',
        target_role: 'audit_committee_chair',
        development_timeline_months: 12,
        priority_skills: [
          {
            skill_name: 'Advanced Financial Analysis',
            current_level: 3,
            target_level: 5,
            learning_resources: [
              {
                type: 'course',
                title: 'Financial Statement Analysis for Directors',
                provider: 'NACD',
                duration_hours: 8,
                cost: 299
              }
            ],
            milestones: [
              { month: 3, description: 'Complete fundamentals course' },
              { month: 6, description: 'Apply skills in board simulation' }
            ]
          }
        ],
        estimated_cost: 1250,
        estimated_time_hours: 45
      };

      mockSupabase.single.mockResolvedValue({
        data: mockPlan,
        error: null
      });

      const planData = {
        user_id: 'user-1',
        assessment_id: 'assessment-1',
        target_role: 'audit_committee_chair',
        development_timeline_months: 12,
        budget_limit: 2000,
        time_commitment_hours_per_month: 5
      };

      const result = await skillsAssessmentService.generateDevelopmentPlan(planData);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-1',
        assessment_id: 'assessment-1',
        target_role: 'audit_committee_chair',
        development_timeline_months: 12
      }));
      expect(result).toEqual(mockPlan);
    });
  });

  describe('trackSkillProgress', () => {
    it('should update skill progress from learning activities', async () => {
      const mockProgressUpdate = {
        id: 'progress-1',
        user_id: 'user-1',
        skill_id: 'skill-1',
        previous_level: 3,
        new_level: 4,
        evidence_source: 'course_completion',
        updated_at: '2024-02-01T12:00:00Z'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockProgressUpdate,
        error: null
      });

      const progressData = {
        user_id: 'user-1',
        skill_id: 'skill-1',
        proficiency_change: 1,
        evidence_source: 'course_completion',
        evidence_details: 'Completed NACD Financial Oversight course with 95% score',
        verified_by_id: 'mentor-1'
      };

      const result = await skillsAssessmentService.trackSkillProgress(progressData);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-1',
        skill_id: 'skill-1',
        proficiency_change: 1,
        evidence_source: 'course_completion',
        evidence_details: 'Completed NACD Financial Oversight course with 95% score',
        verified_by_id: 'mentor-1'
      }));
      expect(result).toEqual(mockProgressUpdate);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return comprehensive performance analytics', async () => {
      const mockMetrics = {
        user_id: 'user-1',
        current_period: '2024-Q1',
        overall_competency_score: 87,
        competency_trend: 'improving',
        skill_velocity: 0.8, // skills improved per month
        assessment_frequency: 'quarterly',
        development_plan_adherence: 0.75,
        peer_comparison: {
          percentile_rank: 82,
          peer_group: 'technology_board_members',
          peer_group_size: 150
        },
        skill_category_scores: {
          'Strategic Leadership': 90,
          'Financial Oversight': 88,
          'Risk Management': 85,
          'Technology Governance': 82
        },
        recent_improvements: [
          {
            skill_name: 'Digital Transformation',
            improvement: 2,
            time_period: '2024-Q1'
          }
        ],
        upcoming_assessments: [
          {
            framework_name: 'Annual Board Evaluation',
            due_date: '2024-03-15'
          }
        ]
      };

      mockSupabase.single.mockResolvedValue({
        data: mockMetrics,
        error: null
      });

      const result = await skillsAssessmentService.getPerformanceMetrics('user-1', '2024-Q1');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_skills_performance_metrics', {
        user_uuid: 'user-1',
        period: '2024-Q1'
      });
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('getBoardReadinessScore', () => {
    it('should calculate board readiness score', async () => {
      const mockReadinessScore = {
        user_id: 'user-1',
        overall_readiness_score: 78,
        readiness_level: 'ready_with_development',
        role_specific_scores: {
          'board_member': 82,
          'audit_committee': 75,
          'compensation_committee': 70,
          'nominating_committee': 80
        },
        critical_gaps: [
          {
            skill_area: 'Cybersecurity Governance',
            gap_severity: 'high',
            impact_on_readiness: -8
          }
        ],
        development_priorities: [
          'Complete cybersecurity fundamentals',
          'Gain public company board experience',
          'Enhance ESG knowledge'
        ],
        estimated_readiness_timeline: {
          basic_readiness: '3 months',
          full_readiness: '8 months'
        }
      };

      mockSupabase.single.mockResolvedValue({
        data: mockReadinessScore,
        error: null
      });

      const result = await skillsAssessmentService.getBoardReadinessScore(
        'user-1',
        'public_company_board'
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_board_readiness_score', {
        user_uuid: 'user-1',
        target_board_type: 'public_company_board'
      });
      expect(result).toEqual(mockReadinessScore);
    });
  });

  describe('compareAssessments', () => {
    it('should compare multiple assessments and show progress', async () => {
      const mockComparison = {
        user_id: 'user-1',
        assessment_ids: ['assessment-1', 'assessment-2'],
        time_period: '6 months',
        overall_progress: {
          score_change: 12,
          percentage_improvement: 15.8
        },
        skill_changes: [
          {
            skill_name: 'Strategic Planning',
            initial_score: 3,
            final_score: 4,
            improvement: 1,
            improvement_percentage: 33.3
          },
          {
            skill_name: 'Financial Analysis',
            initial_score: 4,
            final_score: 5,
            improvement: 1,
            improvement_percentage: 25.0
          }
        ],
        category_progress: {
          'Leadership': { change: 15, trend: 'improving' },
          'Technical': { change: 8, trend: 'stable' }
        },
        development_effectiveness: {
          courses_completed: 3,
          mentoring_sessions: 8,
          practical_applications: 2,
          roi_on_development: 'high'
        }
      };

      mockSupabase.single.mockResolvedValue({
        data: mockComparison,
        error: null
      });

      const result = await skillsAssessmentService.compareAssessments([
        'assessment-1',
        'assessment-2'
      ]);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('compare_skill_assessments', {
        assessment_ids: ['assessment-1', 'assessment-2']
      });
      expect(result).toEqual(mockComparison);
    });
  });

  describe('getSkillTrends', () => {
    it('should return organization-wide skill trends', async () => {
      const mockTrends = {
        organization_id: 'org-1',
        period: '2024-Q1',
        board_composition_analysis: {
          total_members: 12,
          avg_experience_years: 15.2,
          diversity_score: 0.75,
          skill_coverage: 0.82
        },
        top_skill_gaps: [
          {
            skill_area: 'Digital Transformation',
            gap_percentage: 45,
            affected_members: 7,
            priority_level: 'high'
          },
          {
            skill_area: 'ESG Strategy',
            gap_percentage: 30,
            affected_members: 4,
            priority_level: 'medium'
          }
        ],
        emerging_skills: [
          {
            skill_name: 'AI Governance',
            adoption_rate: 0.25,
            growth_trend: 'rapid'
          }
        ],
        benchmark_comparison: {
          peer_organizations: 25,
          performance_percentile: 78,
          areas_above_average: ['Financial Oversight', 'Risk Management'],
          areas_below_average: ['Technology Governance', 'Sustainability']
        }
      };

      mockSupabase.single.mockResolvedValue({
        data: mockTrends,
        error: null
      });

      const result = await skillsAssessmentService.getSkillTrends('org-1');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_organizational_skill_trends', {
        org_id: 'org-1'
      });
      expect(result).toEqual(mockTrends);
    });
  });
});