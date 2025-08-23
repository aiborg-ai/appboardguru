import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export interface TrainingCategory {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  color: string | null;
  display_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingCourse {
  id: string;
  title: string;
  description: string | null;
  category_id: string;
  course_type: string;
  difficulty_level: string;
  estimated_duration_hours: number | null;
  content_url: string | null;
  content_data: any;
  prerequisites: any;
  learning_objectives: string[];
  tags: string[];
  is_required: boolean;
  is_active: boolean;
  provider_name: string | null;
  provider_url: string | null;
  credits: number | null;
  expiry_months: number | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TrainingEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrollment_date: string;
  status: string;
  progress_percentage: number;
  started_at: string | null;
  completed_at: string | null;
  expiry_date: string | null;
  final_score: number | null;
  certificate_url: string | null;
  time_spent_minutes: number;
  last_accessed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingProgress {
  id: string;
  enrollment_id: string;
  module_id: string;
  module_title: string | null;
  progress_data: any;
  completed_at: string | null;
  score: number | null;
  attempts: number;
  time_spent_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CourseWithProgress extends TrainingCourse {
  enrollment?: TrainingEnrollment;
  category?: TrainingCategory;
  progress_modules?: TrainingProgress[];
}

export interface LearningPath {
  id: string;
  name: string;
  description: string | null;
  target_role: string | null;
  difficulty_level: string;
  estimated_duration_months: number | null;
  required_courses: string[];
  optional_courses: string[];
  milestones: any;
  prerequisites: string | null;
  learning_outcomes: string[];
  is_template: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserLearningPath {
  id: string;
  user_id: string;
  path_id: string;
  enrollment_date: string;
  target_completion_date: string | null;
  status: string;
  progress_percentage: number;
  current_course_id: string | null;
  personalized_plan: any;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class TrainingService {
  private supabase = createClientComponentClient<Database>();

  /**
   * Get all training categories
   */
  async getTrainingCategories(includeInactive = false) {
    let query = this.supabase
      .from('training_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as TrainingCategory[];
  }

  /**
   * Get training courses with optional filtering
   */
  async getTrainingCourses(filters?: {
    category_id?: string;
    course_type?: string;
    difficulty_level?: string;
    tags?: string[];
    is_required?: boolean;
    is_active?: boolean;
    search?: string;
  }) {
    let query = this.supabase
      .from('training_courses')
      .select(`
        *,
        category:training_categories(*)
      `)
      .order('title', { ascending: true });

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters?.course_type) {
      query = query.eq('course_type', filters.course_type);
    }
    if (filters?.difficulty_level) {
      query = query.eq('difficulty_level', filters.difficulty_level);
    }
    if (filters?.is_required !== undefined) {
      query = query.eq('is_required', filters.is_required);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as CourseWithProgress[];
  }

  /**
   * Get course details with user enrollment status
   */
  async getCourseDetails(courseId: string, userId?: string) {
    const { data: course, error: courseError } = await this.supabase
      .from('training_courses')
      .select(`
        *,
        category:training_categories(*)
      `)
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    let enrollment = null;
    let progressModules = null;

    if (userId) {
      // Get user's enrollment
      const { data: enrollmentData } = await this.supabase
        .from('training_enrollments')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      enrollment = enrollmentData;

      // Get progress modules if enrolled
      if (enrollmentData) {
        const { data: progressData } = await this.supabase
          .from('training_progress')
          .select('*')
          .eq('enrollment_id', enrollmentData.id)
          .order('module_id', { ascending: true });

        progressModules = progressData;
      }
    }

    return {
      ...course,
      enrollment,
      progress_modules: progressModules
    } as CourseWithProgress;
  }

  /**
   * Enroll user in a course
   */
  async enrollInCourse(userId: string, courseId: string) {
    // Check if already enrolled
    const { data: existing } = await this.supabase
      .from('training_enrollments')
      .select('id, status')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (existing) {
      if (['completed', 'expired'].includes(existing.status)) {
        // Allow re-enrollment for completed/expired courses
        const { data, error } = await this.supabase
          .from('training_enrollments')
          .update({
            status: 'enrolled',
            enrollment_date: new Date().toISOString(),
            progress_percentage: 0,
            started_at: null,
            completed_at: null,
            final_score: null,
            time_spent_minutes: 0
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as TrainingEnrollment;
      } else {
        throw new Error('Already enrolled in this course');
      }
    }

    // Get course details to set expiry
    const { data: course } = await this.supabase
      .from('training_courses')
      .select('expiry_months')
      .eq('id', courseId)
      .single();

    let expiryDate = null;
    if (course?.expiry_months) {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + course.expiry_months);
      expiryDate = expiry.toISOString();
    }

    const { data, error } = await this.supabase
      .from('training_enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        status: 'enrolled',
        expiry_date: expiryDate
      })
      .select()
      .single();

    if (error) throw error;
    return data as TrainingEnrollment;
  }

  /**
   * Start a course (update enrollment to in_progress)
   */
  async startCourse(userId: string, courseId: string) {
    const { data, error } = await this.supabase
      .from('training_enrollments')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error) throw error;
    return data as TrainingEnrollment;
  }

  /**
   * Update course progress
   */
  async updateCourseProgress(
    enrollmentId: string,
    moduleId: string,
    progressData: {
      module_title?: string;
      progress_data?: any;
      completed_at?: string;
      score?: number;
      time_spent_minutes?: number;
    }
  ) {
    const { data, error } = await this.supabase
      .from('training_progress')
      .upsert({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        module_title: progressData.module_title,
        progress_data: progressData.progress_data,
        completed_at: progressData.completed_at,
        score: progressData.score,
        time_spent_minutes: progressData.time_spent_minutes || 0
      })
      .select()
      .single();

    if (error) throw error;

    // Update enrollment last accessed time
    await this.supabase
      .from('training_enrollments')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', enrollmentId);

    // Recalculate overall progress
    await this.recalculateCourseProgress(enrollmentId);

    return data as TrainingProgress;
  }

  /**
   * Complete a course
   */
  async completeCourse(
    userId: string,
    courseId: string,
    completionData: {
      final_score?: number;
      time_spent_minutes?: number;
      certificate_url?: string;
    }
  ) {
    const { data, error } = await this.supabase
      .from('training_enrollments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_percentage: 100,
        final_score: completionData.final_score,
        time_spent_minutes: completionData.time_spent_minutes,
        certificate_url: completionData.certificate_url
      })
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error) throw error;

    // Log completion analytics
    await this.logLearningAnalytics(userId, 'course_completion', 1, {
      course_id: courseId,
      final_score: completionData.final_score,
      time_spent: completionData.time_spent_minutes
    });

    return data as TrainingEnrollment;
  }

  /**
   * Get user's course enrollments
   */
  async getUserEnrollments(
    userId: string,
    filters?: {
      status?: string;
      category_id?: string;
    }
  ) {
    let query = this.supabase
      .from('training_enrollments')
      .select(`
        *,
        course:training_courses(
          *,
          category:training_categories(*)
        )
      `)
      .eq('user_id', userId)
      .order('enrollment_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Recalculate course progress based on module completion
   */
  private async recalculateCourseProgress(enrollmentId: string) {
    // Get all progress modules for this enrollment
    const { data: modules, error } = await this.supabase
      .from('training_progress')
      .select('completed_at')
      .eq('enrollment_id', enrollmentId);

    if (error) throw error;

    if (!modules || modules.length === 0) return;

    const totalModules = modules.length;
    const completedModules = modules.filter(m => m.completed_at).length;
    const progressPercentage = Math.round((completedModules / totalModules) * 100);

    // Update enrollment progress
    await this.supabase
      .from('training_enrollments')
      .update({ progress_percentage: progressPercentage })
      .eq('id', enrollmentId);
  }

  /**
   * Get learning paths
   */
  async getLearningPaths(filters?: {
    target_role?: string;
    difficulty_level?: string;
    is_active?: boolean;
  }) {
    let query = this.supabase
      .from('learning_paths')
      .select('*')
      .order('name', { ascending: true });

    if (filters?.target_role) {
      query = query.eq('target_role', filters.target_role);
    }
    if (filters?.difficulty_level) {
      query = query.eq('difficulty_level', filters.difficulty_level);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as LearningPath[];
  }

  /**
   * Get learning path details with courses
   */
  async getLearningPathDetails(pathId: string) {
    const { data: path, error: pathError } = await this.supabase
      .from('learning_paths')
      .select('*')
      .eq('id', pathId)
      .single();

    if (pathError) throw pathError;

    // Get required and optional courses
    const allCourseIds = [...(path.required_courses || []), ...(path.optional_courses || [])];
    
    let courses = [];
    if (allCourseIds.length > 0) {
      const { data: coursesData, error: coursesError } = await this.supabase
        .from('training_courses')
        .select(`
          *,
          category:training_categories(*)
        `)
        .in('id', allCourseIds);

      if (coursesError) throw coursesError;
      courses = coursesData || [];
    }

    return {
      ...path,
      required_courses_details: courses.filter(c => path.required_courses?.includes(c.id)),
      optional_courses_details: courses.filter(c => path.optional_courses?.includes(c.id))
    };
  }

  /**
   * Enroll user in learning path
   */
  async enrollInLearningPath(
    userId: string,
    pathId: string,
    targetCompletionDate?: string
  ) {
    // Check if already enrolled
    const { data: existing } = await this.supabase
      .from('user_learning_paths')
      .select('id, status')
      .eq('user_id', userId)
      .eq('path_id', pathId)
      .single();

    if (existing && ['active', 'paused'].includes(existing.status)) {
      throw new Error('Already enrolled in this learning path');
    }

    const { data, error } = await this.supabase
      .from('user_learning_paths')
      .insert({
        user_id: userId,
        path_id: pathId,
        target_completion_date: targetCompletionDate,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return data as UserLearningPath;
  }

  /**
   * Get user's learning paths
   */
  async getUserLearningPaths(userId: string) {
    const { data, error } = await this.supabase
      .from('user_learning_paths')
      .select(`
        *,
        path:learning_paths(*)
      `)
      .eq('user_id', userId)
      .order('enrollment_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Get course completion statistics
   */
  async getCourseStatistics(courseId?: string) {
    let query = this.supabase
      .from('course_completion_stats')
      .select('*');

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Log learning analytics
   */
  async logLearningAnalytics(
    userId: string,
    metricType: string,
    metricValue: number,
    context?: any
  ) {
    const { data, error } = await this.supabase
      .from('learning_analytics')
      .insert({
        user_id: userId,
        metric_type: metricType,
        metric_value: metricValue,
        metric_date: new Date().toISOString().split('T')[0],
        context
      });

    if (error) throw error;
    return data;
  }

  /**
   * Get user learning analytics
   */
  async getUserLearningAnalytics(
    userId: string,
    dateRange?: { start: string; end: string },
    metricTypes?: string[]
  ) {
    let query = this.supabase
      .from('learning_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('metric_date', { ascending: false });

    if (dateRange) {
      query = query
        .gte('metric_date', dateRange.start)
        .lte('metric_date', dateRange.end);
    }

    if (metricTypes && metricTypes.length > 0) {
      query = query.in('metric_type', metricTypes);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate data by metric type
    const aggregated = data.reduce((acc: any, item) => {
      if (!acc[item.metric_type]) {
        acc[item.metric_type] = [];
      }
      acc[item.metric_type].push(item);
      return acc;
    }, {});

    return {
      raw_data: data,
      aggregated_data: aggregated
    };
  }

  /**
   * Get recommended courses for user based on their profile and progress
   */
  async getRecommendedCourses(userId: string, limit = 10) {
    // This would implement a recommendation algorithm based on:
    // - User's completed courses
    // - User's role and skills
    // - Popular courses in similar roles
    // - Prerequisites and learning paths

    // For now, return courses the user hasn't completed, prioritizing required ones
    const { data: userEnrollments } = await this.supabase
      .from('training_enrollments')
      .select('course_id')
      .eq('user_id', userId)
      .eq('status', 'completed');

    const completedCourseIds = userEnrollments?.map(e => e.course_id) || [];

    let query = this.supabase
      .from('training_courses')
      .select(`
        *,
        category:training_categories(*)
      `)
      .eq('is_active', true)
      .order('is_required', { ascending: false })
      .order('title', { ascending: true })
      .limit(limit);

    if (completedCourseIds.length > 0) {
      query = query.not('id', 'in', `(${completedCourseIds.join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as CourseWithProgress[];
  }

  /**
   * Search courses and learning content
   */
  async searchLearningContent(
    searchTerm: string,
    filters?: {
      content_type?: 'course' | 'learning_path' | 'all';
      difficulty_level?: string;
      tags?: string[];
    }
  ) {
    const results: any = {
      courses: [],
      learning_paths: []
    };

    if (!filters?.content_type || filters.content_type === 'course' || filters.content_type === 'all') {
      let courseQuery = this.supabase
        .from('training_courses')
        .select(`
          *,
          category:training_categories(*)
        `)
        .eq('is_active', true)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

      if (filters?.difficulty_level) {
        courseQuery = courseQuery.eq('difficulty_level', filters.difficulty_level);
      }
      if (filters?.tags && filters.tags.length > 0) {
        courseQuery = courseQuery.overlaps('tags', filters.tags);
      }

      const { data: courses } = await courseQuery.limit(20);
      results.courses = courses || [];
    }

    if (!filters?.content_type || filters.content_type === 'learning_path' || filters.content_type === 'all') {
      let pathQuery = this.supabase
        .from('learning_paths')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

      if (filters?.difficulty_level) {
        pathQuery = pathQuery.eq('difficulty_level', filters.difficulty_level);
      }

      const { data: paths } = await pathQuery.limit(20);
      results.learning_paths = paths || [];
    }

    return results;
  }
}

export const trainingService = new TrainingService();