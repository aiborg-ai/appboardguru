import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string | null;
  role_type: string;
  experience_level: string;
  estimated_duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStep {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  step_order: number;
  step_type: string;
  estimated_duration_hours: number | null;
  is_required: boolean;
  prerequisites: any;
  resources: any;
  completion_criteria: string | null;
}

export interface MemberOnboarding {
  id: string;
  user_id: string;
  board_id: string | null;
  template_id: string;
  status: string;
  start_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  progress_percentage: number;
  current_step_id: string | null;
  notes: string | null;
  assigned_mentor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingProgress {
  id: string;
  onboarding_id: string;
  step_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  time_spent_minutes: number | null;
  feedback: string | null;
  attachments: any;
  score: number | null;
}

export interface OnboardingWithDetails extends MemberOnboarding {
  template: OnboardingTemplate;
  steps: (OnboardingStep & { progress?: OnboardingProgress })[];
  mentor?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export class OnboardingService {
  private supabase = createClientComponentClient<Database>();

  /**
   * Get all available onboarding templates
   */
  async getOnboardingTemplates(filters?: {
    role_type?: string;
    experience_level?: string;
    is_active?: boolean;
  }) {
    let query = this.supabase
      .from('onboarding_templates')
      .select('*')
      .order('role_type', { ascending: true });

    if (filters?.role_type) {
      query = query.eq('role_type', filters.role_type);
    }
    if (filters?.experience_level) {
      query = query.eq('experience_level', filters.experience_level);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as OnboardingTemplate[];
  }

  /**
   * Get onboarding template with steps
   */
  async getOnboardingTemplate(templateId: string) {
    const { data: template, error: templateError } = await this.supabase
      .from('onboarding_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    const { data: steps, error: stepsError } = await this.supabase
      .from('onboarding_steps')
      .select('*')
      .eq('template_id', templateId)
      .order('step_order', { ascending: true });

    if (stepsError) throw stepsError;

    return {
      template: template as OnboardingTemplate,
      steps: steps as OnboardingStep[]
    };
  }

  /**
   * Create a new onboarding instance for a user
   */
  async createOnboardingInstance(data: {
    user_id: string;
    template_id: string;
    board_id?: string;
    assigned_mentor_id?: string;
    target_completion_date?: string;
    start_date?: string;
  }) {
    const { data: onboarding, error: onboardingError } = await this.supabase
      .from('member_onboarding')
      .insert({
        user_id: data.user_id,
        template_id: data.template_id,
        board_id: data.board_id,
        assigned_mentor_id: data.assigned_mentor_id,
        target_completion_date: data.target_completion_date,
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        status: 'not_started'
      })
      .select()
      .single();

    if (onboardingError) throw onboardingError;

    // Create progress entries for all steps
    const { data: steps } = await this.supabase
      .from('onboarding_steps')
      .select('id')
      .eq('template_id', data.template_id)
      .order('step_order', { ascending: true });

    if (steps && steps.length > 0) {
      const progressEntries = steps.map(step => ({
        onboarding_id: onboarding.id,
        step_id: step.id,
        status: 'not_started'
      }));

      await this.supabase
        .from('member_onboarding_progress')
        .insert(progressEntries);
    }

    return onboarding as MemberOnboarding;
  }

  /**
   * Get user's onboarding instances
   */
  async getUserOnboardings(userId: string) {
    const { data, error } = await this.supabase
      .from('member_onboarding')
      .select(`
        *,
        template:onboarding_templates(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Get detailed onboarding with progress
   */
  async getOnboardingWithProgress(onboardingId: string): Promise<OnboardingWithDetails> {
    const { data: onboarding, error: onboardingError } = await this.supabase
      .from('member_onboarding')
      .select(`
        *,
        template:onboarding_templates(*)
      `)
      .eq('id', onboardingId)
      .single();

    if (onboardingError) throw onboardingError;

    const { data: steps, error: stepsError } = await this.supabase
      .from('onboarding_steps')
      .select(`
        *,
        progress:member_onboarding_progress!member_onboarding_progress_step_id_fkey(*)
      `)
      .eq('template_id', onboarding.template_id)
      .order('step_order', { ascending: true });

    if (stepsError) throw stepsError;

    // Get mentor details if assigned
    let mentor;
    if (onboarding.assigned_mentor_id) {
      const { data: mentorData } = await this.supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('id', onboarding.assigned_mentor_id)
        .single();
      mentor = mentorData;
    }

    return {
      ...onboarding,
      template: onboarding.template,
      steps: steps.map(step => ({
        ...step,
        progress: step.progress?.find((p: any) => p.onboarding_id === onboardingId)
      })),
      mentor
    } as OnboardingWithDetails;
  }

  /**
   * Update onboarding step progress
   */
  async updateStepProgress(
    onboardingId: string,
    stepId: string,
    updates: {
      status?: string;
      started_at?: string;
      completed_at?: string;
      time_spent_minutes?: number;
      feedback?: string;
      attachments?: any;
      score?: number;
    }
  ) {
    const { data, error } = await this.supabase
      .from('member_onboarding_progress')
      .update(updates)
      .eq('onboarding_id', onboardingId)
      .eq('step_id', stepId)
      .select()
      .single();

    if (error) throw error;

    // Recalculate overall progress
    await this.recalculateProgress(onboardingId);

    return data as OnboardingProgress;
  }

  /**
   * Start an onboarding step
   */
  async startStep(onboardingId: string, stepId: string) {
    return this.updateStepProgress(onboardingId, stepId, {
      status: 'in_progress',
      started_at: new Date().toISOString()
    });
  }

  /**
   * Complete an onboarding step
   */
  async completeStep(
    onboardingId: string,
    stepId: string,
    data?: {
      feedback?: string;
      attachments?: any;
      score?: number;
      time_spent_minutes?: number;
    }
  ) {
    return this.updateStepProgress(onboardingId, stepId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      ...data
    });
  }

  /**
   * Recalculate onboarding progress percentage
   */
  private async recalculateProgress(onboardingId: string) {
    const { data, error } = await this.supabase
      .rpc('calculate_onboarding_progress', {
        onboarding_id: onboardingId
      });

    if (error) throw error;
    return data;
  }

  /**
   * Get onboarding analytics
   */
  async getOnboardingAnalytics(filters?: {
    role_type?: string;
    experience_level?: string;
    date_range?: { start: string; end: string };
  }) {
    let query = this.supabase
      .from('onboarding_progress_summary')
      .select('*');

    if (filters?.role_type) {
      query = query.eq('role_type', filters.role_type);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Calculate analytics
    const total = data.length;
    const completed = data.filter(item => item.status === 'completed').length;
    const inProgress = data.filter(item => item.status === 'in_progress').length;
    const overdue = data.filter(item => item.is_overdue).length;
    const averageProgress = data.reduce((acc, item) => acc + (item.progress_percentage || 0), 0) / total;

    return {
      total_onboardings: total,
      completed_onboardings: completed,
      in_progress_onboardings: inProgress,
      overdue_onboardings: overdue,
      completion_rate: total > 0 ? (completed / total) * 100 : 0,
      average_progress: averageProgress,
      data
    };
  }

  /**
   * Suggest mentors for a user based on their profile and onboarding needs
   */
  async suggestMentors(userId: string, criteria?: {
    expertise_areas?: string[];
    industries?: string[];
    board_roles?: string[];
  }) {
    const { data, error } = await this.supabase
      .from('mentor_availability')
      .select('*')
      .eq('is_available', true)
      .gt('available_slots', 0)
      .order('average_satisfaction', { ascending: false, nullsLast: true });

    if (error) throw error;

    // In a real implementation, you would apply matching algorithms here
    // based on expertise areas, industries, board roles, etc.
    return data.slice(0, 5); // Return top 5 matches
  }

  /**
   * Assign mentor to onboarding
   */
  async assignMentor(onboardingId: string, mentorId: string) {
    const { data, error } = await this.supabase
      .from('member_onboarding')
      .update({ assigned_mentor_id: mentorId })
      .eq('id', onboardingId)
      .select()
      .single();

    if (error) throw error;
    return data as MemberOnboarding;
  }

  /**
   * Get recommended next steps for a user's onboarding
   */
  async getRecommendedNextSteps(onboardingId: string) {
    const onboarding = await this.getOnboardingWithProgress(onboardingId);
    
    const nextSteps = onboarding.steps
      .filter(step => {
        const progress = step.progress;
        if (!progress || progress.status === 'not_started') {
          // Check if prerequisites are met
          if (step.prerequisites && Array.isArray(step.prerequisites)) {
            const prerequisitesMet = step.prerequisites.every(prereqId => {
              const prereqStep = onboarding.steps.find(s => s.id === prereqId);
              return prereqStep?.progress?.status === 'completed';
            });
            return prerequisitesMet;
          }
          return true;
        }
        return false;
      })
      .slice(0, 3); // Return next 3 available steps

    return nextSteps;
  }

  /**
   * Update onboarding status
   */
  async updateOnboardingStatus(
    onboardingId: string,
    status: string,
    data?: {
      actual_completion_date?: string;
      notes?: string;
    }
  ) {
    const updates: any = { status, ...data };
    
    if (status === 'completed' && !data?.actual_completion_date) {
      updates.actual_completion_date = new Date().toISOString().split('T')[0];
    }

    const { data: result, error } = await this.supabase
      .from('member_onboarding')
      .update(updates)
      .eq('id', onboardingId)
      .select()
      .single();

    if (error) throw error;
    return result as MemberOnboarding;
  }

  /**
   * Generate onboarding completion certificate
   */
  async generateCompletionCertificate(onboardingId: string) {
    const onboarding = await this.getOnboardingWithProgress(onboardingId);
    
    if (onboarding.status !== 'completed') {
      throw new Error('Onboarding must be completed to generate certificate');
    }

    // In a real implementation, you would generate a PDF certificate
    // and store it in cloud storage, then return the URL
    const certificateData = {
      onboarding_id: onboardingId,
      user_id: onboarding.user_id,
      template_name: onboarding.template.name,
      completion_date: onboarding.actual_completion_date,
      certificate_number: `OB-${onboardingId.slice(-8).toUpperCase()}`,
      // certificate_url would be the actual URL to the generated PDF
    };

    return certificateData;
  }

  /**
   * Clone an onboarding template with customizations
   */
  async cloneTemplate(
    templateId: string,
    customizations: {
      name: string;
      description?: string;
      role_type?: string;
      experience_level?: string;
      step_modifications?: Array<{
        step_id: string;
        is_required?: boolean;
        estimated_duration_hours?: number;
      }>;
    }
  ) {
    const { template, steps } = await this.getOnboardingTemplate(templateId);

    // Create new template
    const { data: newTemplate, error: templateError } = await this.supabase
      .from('onboarding_templates')
      .insert({
        name: customizations.name,
        description: customizations.description || template.description,
        role_type: customizations.role_type || template.role_type,
        experience_level: customizations.experience_level || template.experience_level,
        estimated_duration_days: template.estimated_duration_days,
        is_active: true
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // Clone steps with modifications
    const newSteps = steps.map(step => {
      const modification = customizations.step_modifications?.find(m => m.step_id === step.id);
      return {
        template_id: newTemplate.id,
        title: step.title,
        description: step.description,
        step_order: step.step_order,
        step_type: step.step_type,
        estimated_duration_hours: modification?.estimated_duration_hours ?? step.estimated_duration_hours,
        is_required: modification?.is_required ?? step.is_required,
        prerequisites: step.prerequisites,
        resources: step.resources,
        completion_criteria: step.completion_criteria
      };
    });

    const { data: clonedSteps, error: stepsError } = await this.supabase
      .from('onboarding_steps')
      .insert(newSteps)
      .select();

    if (stepsError) throw stepsError;

    return {
      template: newTemplate,
      steps: clonedSteps
    };
  }
}

export const onboardingService = new OnboardingService();