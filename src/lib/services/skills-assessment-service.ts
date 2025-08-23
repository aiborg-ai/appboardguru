import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export interface SkillFramework {
  id: string;
  name: string;
  description: string | null;
  version: string;
  framework_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  framework_id: string;
  name: string;
  description: string | null;
  category: string | null;
  parent_skill_id: string | null;
  skill_level: string;
  assessment_criteria: string | null;
  training_recommendations: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSkillAssessment {
  id: string;
  user_id: string;
  skill_id: string;
  assessment_date: string;
  current_level: number;
  target_level: number | null;
  self_assessment_score: number | null;
  manager_assessment_score: number | null;
  peer_assessment_score: number | null;
  evidence: string | null;
  development_plan: string | null;
  next_review_date: string | null;
  assessor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillWithAssessment extends Skill {
  framework?: SkillFramework;
  assessment?: UserSkillAssessment;
  children?: SkillWithAssessment[];
  parent_skill?: Skill;
}

export interface SkillGapAnalysis {
  skill_id: string;
  skill_name: string;
  category: string;
  current_level: number;
  target_level: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  recommended_actions: string[];
  training_courses: any[];
}

export interface DevelopmentPlan {
  user_id: string;
  goals: string[];
  skill_gaps: SkillGapAnalysis[];
  recommended_courses: any[];
  recommended_mentors: any[];
  target_completion_date: string;
  progress_milestones: any[];
  created_at: string;
  updated_at: string;
}

export interface PerformanceMetrics {
  overall_skill_score: number;
  skill_category_scores: { [category: string]: number };
  improvement_rate: number;
  assessment_completion_rate: number;
  development_plan_progress: number;
  peer_feedback_score: number | null;
  manager_feedback_score: number | null;
}

export class SkillsAssessmentService {
  private supabase = createClientComponentClient<Database>();

  /**
   * Get all skill frameworks
   */
  async getSkillFrameworks(includeInactive = false) {
    let query = this.supabase
      .from('skill_frameworks')
      .select('*')
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as SkillFramework[];
  }

  /**
   * Get skills for a framework with user assessments
   */
  async getSkillsWithAssessments(frameworkId: string, userId?: string) {
    let query = this.supabase
      .from('skills')
      .select(`
        *,
        framework:skill_frameworks(*),
        parent_skill:skills!skills_parent_skill_id_fkey(id, name)
      `)
      .eq('framework_id', frameworkId)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    const { data: skills, error } = await query;
    if (error) throw error;

    // Get user assessments if userId provided
    let assessments: UserSkillAssessment[] = [];
    if (userId && skills && skills.length > 0) {
      const { data: assessmentData } = await this.supabase
        .from('user_skill_assessments')
        .select('*')
        .eq('user_id', userId)
        .in('skill_id', skills.map(s => s.id))
        .order('assessment_date', { ascending: false });

      assessments = assessmentData || [];
    }

    // Combine skills with their latest assessments
    const skillsWithAssessments = (skills || []).map(skill => {
      const latestAssessment = assessments.find(a => a.skill_id === skill.id);
      return {
        ...skill,
        assessment: latestAssessment
      };
    });

    // Build hierarchical structure
    const rootSkills = skillsWithAssessments.filter(s => !s.parent_skill_id);
    const childSkills = skillsWithAssessments.filter(s => s.parent_skill_id);

    const buildHierarchy = (skill: any): SkillWithAssessment => ({
      ...skill,
      children: childSkills
        .filter(child => child.parent_skill_id === skill.id)
        .map(buildHierarchy)
    });

    return rootSkills.map(buildHierarchy);
  }

  /**
   * Create or update skill assessment
   */
  async upsertSkillAssessment(data: {
    user_id: string;
    skill_id: string;
    assessment_date?: string;
    current_level: number;
    target_level?: number;
    self_assessment_score?: number;
    manager_assessment_score?: number;
    peer_assessment_score?: number;
    evidence?: string;
    development_plan?: string;
    next_review_date?: string;
    assessor_id?: string;
  }) {
    const assessmentData = {
      user_id: data.user_id,
      skill_id: data.skill_id,
      assessment_date: data.assessment_date || new Date().toISOString().split('T')[0],
      current_level: data.current_level,
      target_level: data.target_level,
      self_assessment_score: data.self_assessment_score,
      manager_assessment_score: data.manager_assessment_score,
      peer_assessment_score: data.peer_assessment_score,
      evidence: data.evidence,
      development_plan: data.development_plan,
      next_review_date: data.next_review_date,
      assessor_id: data.assessor_id,
      updated_at: new Date().toISOString()
    };

    const { data: assessment, error } = await this.supabase
      .from('user_skill_assessments')
      .upsert(assessmentData, {
        onConflict: 'user_id,skill_id,assessment_date'
      })
      .select()
      .single();

    if (error) throw error;
    return assessment as UserSkillAssessment;
  }

  /**
   * Get user's skill assessments
   */
  async getUserSkillAssessments(
    userId: string,
    frameworkId?: string,
    category?: string
  ) {
    let query = this.supabase
      .from('user_skill_assessments')
      .select(`
        *,
        skill:skills(
          *,
          framework:skill_frameworks(*)
        ),
        assessor:users!user_skill_assessments_assessor_id_fkey(id, first_name, last_name, email)
      `)
      .eq('user_id', userId)
      .order('assessment_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    let filteredData = data || [];

    if (frameworkId) {
      filteredData = filteredData.filter(
        assessment => assessment.skill?.framework_id === frameworkId
      );
    }

    if (category) {
      filteredData = filteredData.filter(
        assessment => assessment.skill?.category === category
      );
    }

    return filteredData;
  }

  /**
   * Conduct skill gap analysis
   */
  async analyzeSkillGaps(userId: string, frameworkId?: string): Promise<SkillGapAnalysis[]> {
    // Get user's latest assessments
    const assessments = await this.getUserSkillAssessments(userId, frameworkId);

    const skillGaps: SkillGapAnalysis[] = [];

    for (const assessment of assessments) {
      if (!assessment.skill || !assessment.target_level) continue;

      const gap = assessment.target_level - assessment.current_level;
      
      if (gap > 0) {
        const priority = this.calculateGapPriority(gap, assessment.skill.category);
        const recommendedActions = this.generateRecommendedActions(
          assessment.skill,
          assessment.current_level,
          assessment.target_level
        );

        // Get recommended training courses
        const trainingCourses = await this.getRecommendedTrainingForSkill(assessment.skill_id);

        skillGaps.push({
          skill_id: assessment.skill_id,
          skill_name: assessment.skill.name,
          category: assessment.skill.category || 'General',
          current_level: assessment.current_level,
          target_level: assessment.target_level,
          gap: gap,
          priority: priority,
          recommended_actions: recommendedActions,
          training_courses: trainingCourses
        });
      }
    }

    // Sort by priority and gap size
    skillGaps.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.gap - a.gap;
    });

    return skillGaps;
  }

  /**
   * Generate development plan
   */
  async generateDevelopmentPlan(
    userId: string,
    options?: {
      framework_id?: string;
      target_completion_months?: number;
      focus_areas?: string[];
      include_mentoring?: boolean;
    }
  ): Promise<DevelopmentPlan> {
    const skillGaps = await this.analyzeSkillGaps(userId, options?.framework_id);
    
    // Filter gaps based on focus areas if provided
    let filteredGaps = skillGaps;
    if (options?.focus_areas && options.focus_areas.length > 0) {
      filteredGaps = skillGaps.filter(gap => 
        options.focus_areas!.some(area => 
          gap.category.toLowerCase().includes(area.toLowerCase()) ||
          gap.skill_name.toLowerCase().includes(area.toLowerCase())
        )
      );
    }

    // Take top priority gaps (max 10)
    const priorityGaps = filteredGaps.slice(0, 10);

    // Generate goals based on skill gaps
    const goals = this.generateDevelopmentGoals(priorityGaps);

    // Get recommended courses
    const allRecommendedCourses = priorityGaps
      .flatMap(gap => gap.training_courses)
      .filter((course, index, self) => 
        self.findIndex(c => c.id === course.id) === index
      )
      .slice(0, 8); // Limit to 8 courses

    // Get recommended mentors if requested
    let recommendedMentors: any[] = [];
    if (options?.include_mentoring) {
      // Get mentors with relevant expertise
      const expertiseAreas = [...new Set(priorityGaps.map(gap => gap.category))];
      const { mentoringService } = await import('./mentoring-service');
      recommendedMentors = await mentoringService.getAvailableMentors({
        expertise_areas: expertiseAreas,
        limit: 3
      });
    }

    // Calculate target completion date
    const targetMonths = options?.target_completion_months || 6;
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + targetMonths);

    // Generate progress milestones
    const milestones = this.generateProgressMilestones(priorityGaps, targetMonths);

    const developmentPlan: DevelopmentPlan = {
      user_id: userId,
      goals,
      skill_gaps: priorityGaps,
      recommended_courses: allRecommendedCourses,
      recommended_mentors: recommendedMentors,
      target_completion_date: targetDate.toISOString().split('T')[0],
      progress_milestones: milestones,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return developmentPlan;
  }

  /**
   * Get performance metrics for a user
   */
  async getPerformanceMetrics(
    userId: string,
    frameworkId?: string,
    dateRange?: { start: string; end: string }
  ): Promise<PerformanceMetrics> {
    // Get user's assessments
    let assessments = await this.getUserSkillAssessments(userId, frameworkId);

    if (dateRange) {
      assessments = assessments.filter(assessment => 
        assessment.assessment_date >= dateRange.start &&
        assessment.assessment_date <= dateRange.end
      );
    }

    if (assessments.length === 0) {
      return {
        overall_skill_score: 0,
        skill_category_scores: {},
        improvement_rate: 0,
        assessment_completion_rate: 0,
        development_plan_progress: 0,
        peer_feedback_score: null,
        manager_feedback_score: null
      };
    }

    // Calculate overall skill score (average of current levels)
    const overallScore = assessments.reduce((sum, assessment) => 
      sum + assessment.current_level, 0) / assessments.length;

    // Calculate category scores
    const categoryScores: { [category: string]: number } = {};
    const categoryGroups = assessments.reduce((groups, assessment) => {
      const category = assessment.skill?.category || 'General';
      if (!groups[category]) groups[category] = [];
      groups[category].push(assessment);
      return groups;
    }, {} as { [category: string]: any[] });

    Object.keys(categoryGroups).forEach(category => {
      const categoryAssessments = categoryGroups[category];
      categoryScores[category] = categoryAssessments.reduce((sum, assessment) => 
        sum + assessment.current_level, 0) / categoryAssessments.length;
    });

    // Calculate improvement rate (comparing first and last assessments)
    let improvementRate = 0;
    const skillProgress = new Map();
    
    assessments.forEach(assessment => {
      const skillId = assessment.skill_id;
      if (!skillProgress.has(skillId)) {
        skillProgress.set(skillId, { first: assessment, last: assessment });
      } else {
        const current = skillProgress.get(skillId);
        if (assessment.assessment_date < current.first.assessment_date) {
          current.first = assessment;
        }
        if (assessment.assessment_date > current.last.assessment_date) {
          current.last = assessment;
        }
      }
    });

    const improvements = Array.from(skillProgress.values())
      .map(progress => progress.last.current_level - progress.first.current_level)
      .filter(improvement => improvement > 0);

    if (improvements.length > 0) {
      improvementRate = improvements.reduce((sum, improvement) => sum + improvement, 0) / improvements.length;
    }

    // Calculate assessment completion rate
    const totalSkills = await this.getTotalSkillsCount(frameworkId);
    const assessedSkills = new Set(assessments.map(a => a.skill_id)).size;
    const completionRate = totalSkills > 0 ? (assessedSkills / totalSkills) * 100 : 0;

    // Calculate average peer and manager feedback scores
    const peerScores = assessments
      .map(a => a.peer_assessment_score)
      .filter(score => score !== null) as number[];
    const managerScores = assessments
      .map(a => a.manager_assessment_score)
      .filter(score => score !== null) as number[];

    const avgPeerScore = peerScores.length > 0 
      ? peerScores.reduce((sum, score) => sum + score, 0) / peerScores.length 
      : null;
    const avgManagerScore = managerScores.length > 0 
      ? managerScores.reduce((sum, score) => sum + score, 0) / managerScores.length 
      : null;

    return {
      overall_skill_score: Math.round(overallScore * 100) / 100,
      skill_category_scores: Object.keys(categoryScores).reduce((scores, category) => {
        scores[category] = Math.round(categoryScores[category] * 100) / 100;
        return scores;
      }, {} as { [category: string]: number }),
      improvement_rate: Math.round(improvementRate * 100) / 100,
      assessment_completion_rate: Math.round(completionRate * 100) / 100,
      development_plan_progress: 0, // This would be calculated based on actual development plans
      peer_feedback_score: avgPeerScore ? Math.round(avgPeerScore * 100) / 100 : null,
      manager_feedback_score: avgManagerScore ? Math.round(avgManagerScore * 100) / 100 : null
    };
  }

  /**
   * Get recommended training for a specific skill
   */
  private async getRecommendedTrainingForSkill(skillId: string) {
    // Get skill details including training recommendations
    const { data: skill } = await this.supabase
      .from('skills')
      .select('training_recommendations')
      .eq('id', skillId)
      .single();

    if (skill?.training_recommendations?.course_ids) {
      const { data: courses } = await this.supabase
        .from('training_courses')
        .select(`
          *,
          category:training_categories(*)
        `)
        .in('id', skill.training_recommendations.course_ids)
        .eq('is_active', true);

      return courses || [];
    }

    return [];
  }

  /**
   * Calculate gap priority based on gap size and skill category
   */
  private calculateGapPriority(
    gap: number, 
    category: string | null
  ): 'high' | 'medium' | 'low' {
    // Critical categories get higher priority
    const criticalCategories = ['governance', 'financial', 'compliance', 'risk'];
    const isCritical = criticalCategories.some(crit => 
      category?.toLowerCase().includes(crit)
    );

    if (isCritical && gap >= 2) return 'high';
    if (gap >= 3) return 'high';
    if (gap >= 2) return 'medium';
    return 'low';
  }

  /**
   * Generate recommended actions for skill development
   */
  private generateRecommendedActions(
    skill: any,
    currentLevel: number,
    targetLevel: number
  ): string[] {
    const actions: string[] = [];
    const gap = targetLevel - currentLevel;

    // Basic training recommendation
    if (gap >= 1) {
      actions.push(`Complete foundational training in ${skill.name}`);
    }

    // Practical experience recommendation
    if (gap >= 2) {
      actions.push(`Seek practical experience opportunities in ${skill.category || skill.name}`);
      actions.push(`Find a mentor with expertise in ${skill.name}`);
    }

    // Advanced development recommendation
    if (gap >= 3) {
      actions.push(`Pursue advanced certification or specialization`);
      actions.push(`Lead projects that require ${skill.name} skills`);
    }

    // Add skill-specific recommendations based on assessment criteria
    if (skill.assessment_criteria) {
      actions.push(`Focus on: ${skill.assessment_criteria}`);
    }

    return actions;
  }

  /**
   * Generate development goals based on skill gaps
   */
  private generateDevelopmentGoals(skillGaps: SkillGapAnalysis[]): string[] {
    const goals: string[] = [];

    // High priority goals
    const highPriorityGaps = skillGaps.filter(gap => gap.priority === 'high');
    if (highPriorityGaps.length > 0) {
      goals.push(`Address ${highPriorityGaps.length} high-priority skill gaps in the next 3 months`);
    }

    // Category-specific goals
    const categories = [...new Set(skillGaps.map(gap => gap.category))];
    categories.slice(0, 3).forEach(category => {
      const categoryGaps = skillGaps.filter(gap => gap.category === category);
      const avgGap = categoryGaps.reduce((sum, gap) => sum + gap.gap, 0) / categoryGaps.length;
      goals.push(`Improve ${category} skills by ${Math.round(avgGap)} proficiency levels`);
    });

    // Overall development goal
    if (skillGaps.length > 0) {
      const avgGap = skillGaps.reduce((sum, gap) => sum + gap.gap, 0) / skillGaps.length;
      goals.push(`Achieve ${Math.round(avgGap * 20)}% improvement in overall skill competency`);
    }

    return goals;
  }

  /**
   * Generate progress milestones
   */
  private generateProgressMilestones(
    skillGaps: SkillGapAnalysis[],
    durationMonths: number
  ) {
    const milestones = [];
    const monthlyGoals = Math.ceil(skillGaps.length / durationMonths);

    for (let month = 1; month <= durationMonths; month++) {
      const startIndex = (month - 1) * monthlyGoals;
      const endIndex = Math.min(month * monthlyGoals, skillGaps.length);
      const monthGaps = skillGaps.slice(startIndex, endIndex);

      if (monthGaps.length > 0) {
        milestones.push({
          month: month,
          target_date: new Date(Date.now() + month * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          goals: monthGaps.map(gap => 
            `Improve ${gap.skill_name} from level ${gap.current_level} to ${gap.target_level}`
          ),
          success_criteria: monthGaps.map(gap => 
            `Complete recommended training and demonstrate ${gap.skill_name} competency`
          )
        });
      }
    }

    return milestones;
  }

  /**
   * Get total skills count for completion rate calculation
   */
  private async getTotalSkillsCount(frameworkId?: string): Promise<number> {
    let query = this.supabase
      .from('skills')
      .select('id', { count: 'exact' })
      .eq('is_active', true);

    if (frameworkId) {
      query = query.eq('framework_id', frameworkId);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  /**
   * Compare user performance against benchmarks
   */
  async getBenchmarkComparison(
    userId: string,
    frameworkId?: string,
    role?: string
  ) {
    const userMetrics = await this.getPerformanceMetrics(userId, frameworkId);
    
    // Get benchmark data (this would typically come from aggregated organizational data)
    const benchmarkData = await this.getBenchmarkData(frameworkId, role);

    return {
      user_metrics: userMetrics,
      benchmark_metrics: benchmarkData,
      comparison: {
        overall_score_percentile: this.calculatePercentile(
          userMetrics.overall_skill_score,
          benchmarkData.overall_score_distribution
        ),
        category_percentiles: Object.keys(userMetrics.skill_category_scores).reduce((percentiles, category) => {
          percentiles[category] = this.calculatePercentile(
            userMetrics.skill_category_scores[category],
            benchmarkData.category_distributions[category] || []
          );
          return percentiles;
        }, {} as { [category: string]: number }),
        improvement_rate_percentile: this.calculatePercentile(
          userMetrics.improvement_rate,
          benchmarkData.improvement_rate_distribution
        )
      }
    };
  }

  /**
   * Get benchmark data (mock implementation)
   */
  private async getBenchmarkData(frameworkId?: string, role?: string) {
    // This would typically aggregate data from the database
    // For now, returning mock benchmark data
    return {
      overall_score_distribution: [2.1, 2.3, 2.5, 2.8, 3.0, 3.2, 3.5, 3.8, 4.0, 4.2],
      category_distributions: {
        'Governance': [2.0, 2.2, 2.5, 2.7, 3.0, 3.3, 3.6, 3.9, 4.1, 4.3],
        'Financial': [1.9, 2.1, 2.4, 2.6, 2.9, 3.1, 3.4, 3.7, 4.0, 4.2],
        'Strategic': [2.2, 2.4, 2.6, 2.9, 3.1, 3.4, 3.7, 4.0, 4.2, 4.5]
      },
      improvement_rate_distribution: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.5]
    };
  }

  /**
   * Calculate percentile rank
   */
  private calculatePercentile(value: number, distribution: number[]): number {
    if (distribution.length === 0) return 50; // Default to 50th percentile
    
    const sorted = [...distribution].sort((a, b) => a - b);
    let rank = 0;
    
    for (let i = 0; i < sorted.length; i++) {
      if (value > sorted[i]) {
        rank = i + 1;
      } else {
        break;
      }
    }
    
    return Math.round((rank / sorted.length) * 100);
  }
}

export const skillsAssessmentService = new SkillsAssessmentService();