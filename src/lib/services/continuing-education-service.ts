import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export interface LearningProvider {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  api_endpoint: string | null;
  api_key_encrypted: string | null;
  provider_type: string;
  integration_status: string;
  sync_frequency: string;
  last_sync_at: string | null;
  supported_features: any;
  configuration: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExternalCourse {
  id: string;
  provider_id: string;
  external_course_id: string;
  title: string;
  description: string | null;
  category: string | null;
  duration_hours: number | null;
  credits: number | null;
  cost: number | null;
  currency: string;
  enrollment_url: string | null;
  skill_level: string | null;
  prerequisites: string | null;
  tags: string[];
  rating: number | null;
  review_count: number | null;
  is_available: boolean;
  last_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Certification {
  id: string;
  name: string;
  description: string | null;
  issuing_organization: string | null;
  certification_type: string;
  requirements: any;
  badge_image_url: string | null;
  certificate_template: string | null;
  validity_months: number | null;
  renewal_requirements: string | null;
  credits: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCertification {
  id: string;
  user_id: string;
  certification_id: string;
  earned_date: string;
  expiry_date: string | null;
  certificate_number: string | null;
  certificate_url: string | null;
  verification_code: string | null;
  renewal_date: string | null;
  status: string;
  earned_through: any;
  created_at: string;
  updated_at: string;
}

export interface CertificationWithDetails extends Certification {
  user_certification?: UserCertification;
  requirements_met?: boolean;
  progress_percentage?: number;
}

export interface ProviderSyncResult {
  provider_id: string;
  courses_added: number;
  courses_updated: number;
  courses_removed: number;
  sync_time: number;
  errors?: string[];
}

export class ContinuingEducationService {
  private supabase = createClientComponentClient<Database>();

  /**
   * Get all learning providers
   */
  async getLearningProviders(includeInactive = false) {
    let query = this.supabase
      .from('learning_providers')
      .select('*')
      .order('name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as LearningProvider[];
  }

  /**
   * Create a new learning provider
   */
  async createLearningProvider(data: {
    name: string;
    description?: string;
    website_url?: string;
    api_endpoint?: string;
    api_key?: string;
    provider_type: string;
    sync_frequency?: string;
    supported_features?: any;
    configuration?: any;
  }) {
    // Encrypt API key if provided
    let encryptedApiKey = null;
    if (data.api_key) {
      // In a real implementation, you would use proper encryption
      encryptedApiKey = Buffer.from(data.api_key).toString('base64');
    }

    const { data: provider, error } = await this.supabase
      .from('learning_providers')
      .insert({
        name: data.name,
        description: data.description,
        website_url: data.website_url,
        api_endpoint: data.api_endpoint,
        api_key_encrypted: encryptedApiKey,
        provider_type: data.provider_type,
        integration_status: 'inactive',
        sync_frequency: data.sync_frequency || 'daily',
        supported_features: data.supported_features || {},
        configuration: data.configuration || {},
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return provider as LearningProvider;
  }

  /**
   * Update learning provider
   */
  async updateLearningProvider(
    providerId: string,
    updates: {
      name?: string;
      description?: string;
      website_url?: string;
      api_endpoint?: string;
      api_key?: string;
      provider_type?: string;
      sync_frequency?: string;
      integration_status?: string;
      supported_features?: any;
      configuration?: any;
      is_active?: boolean;
    }
  ) {
    const updateData: any = { ...updates };

    // Encrypt API key if provided
    if (updates.api_key) {
      updateData.api_key_encrypted = Buffer.from(updates.api_key).toString('base64');
      delete updateData.api_key;
    }

    updateData.updated_at = new Date().toISOString();

    const { data: provider, error } = await this.supabase
      .from('learning_providers')
      .update(updateData)
      .eq('id', providerId)
      .select()
      .single();

    if (error) throw error;
    return provider as LearningProvider;
  }

  /**
   * Get external courses with filtering
   */
  async getExternalCourses(filters?: {
    provider_id?: string;
    category?: string;
    skill_level?: string;
    max_cost?: number;
    currency?: string;
    tags?: string[];
    search?: string;
    is_available?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let query = this.supabase
      .from('external_courses')
      .select(`
        *,
        provider:learning_providers(*)
      `)
      .order('rating', { ascending: false, nullsLast: true })
      .order('title', { ascending: true });

    if (filters?.provider_id) {
      query = query.eq('provider_id', filters.provider_id);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.skill_level) {
      query = query.eq('skill_level', filters.skill_level);
    }
    if (filters?.max_cost !== undefined) {
      query = query.lte('cost', filters.max_cost);
    }
    if (filters?.currency) {
      query = query.eq('currency', filters.currency);
    }
    if (filters?.is_available !== undefined) {
      query = query.eq('is_available', filters.is_available);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Sync courses from external provider
   */
  async syncProviderCourses(providerId: string): Promise<ProviderSyncResult> {
    const startTime = Date.now();
    const result: ProviderSyncResult = {
      provider_id: providerId,
      courses_added: 0,
      courses_updated: 0,
      courses_removed: 0,
      sync_time: 0,
      errors: []
    };

    try {
      // Get provider details
      const { data: provider, error: providerError } = await this.supabase
        .from('learning_providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (providerError) throw providerError;

      if (!provider.api_endpoint || provider.integration_status !== 'active') {
        throw new Error('Provider not configured for API integration');
      }

      // Simulate API call to external provider
      // In a real implementation, you would call the actual provider API
      const externalCourses = await this.mockProviderApiCall(provider);

      // Get existing courses for this provider
      const { data: existingCourses } = await this.supabase
        .from('external_courses')
        .select('external_course_id, id')
        .eq('provider_id', providerId);

      const existingIds = new Set(existingCourses?.map(c => c.external_course_id) || []);

      // Process each external course
      for (const course of externalCourses) {
        try {
          if (existingIds.has(course.external_id)) {
            // Update existing course
            await this.supabase
              .from('external_courses')
              .update({
                title: course.title,
                description: course.description,
                category: course.category,
                duration_hours: course.duration_hours,
                credits: course.credits,
                cost: course.cost,
                currency: course.currency,
                enrollment_url: course.enrollment_url,
                skill_level: course.skill_level,
                prerequisites: course.prerequisites,
                tags: course.tags,
                rating: course.rating,
                review_count: course.review_count,
                is_available: course.is_available,
                last_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('provider_id', providerId)
              .eq('external_course_id', course.external_id);
            
            result.courses_updated++;
            existingIds.delete(course.external_id);
          } else {
            // Add new course
            await this.supabase
              .from('external_courses')
              .insert({
                provider_id: providerId,
                external_course_id: course.external_id,
                title: course.title,
                description: course.description,
                category: course.category,
                duration_hours: course.duration_hours,
                credits: course.credits,
                cost: course.cost,
                currency: course.currency || 'USD',
                enrollment_url: course.enrollment_url,
                skill_level: course.skill_level,
                prerequisites: course.prerequisites,
                tags: course.tags || [],
                rating: course.rating,
                review_count: course.review_count,
                is_available: course.is_available ?? true,
                last_updated_at: new Date().toISOString()
              });
            
            result.courses_added++;
          }
        } catch (courseError) {
          result.errors?.push(`Error processing course ${course.external_id}: ${courseError}`);
        }
      }

      // Mark remaining courses as unavailable (they were removed from provider)
      if (existingIds.size > 0) {
        const remainingIds = Array.from(existingIds);
        await this.supabase
          .from('external_courses')
          .update({ 
            is_available: false,
            updated_at: new Date().toISOString()
          })
          .eq('provider_id', providerId)
          .in('external_course_id', remainingIds);
        
        result.courses_removed = remainingIds.length;
      }

      // Update provider sync timestamp
      await this.supabase
        .from('learning_providers')
        .update({ 
          last_sync_at: new Date().toISOString(),
          integration_status: 'active'
        })
        .eq('id', providerId);

    } catch (error) {
      result.errors?.push(`Sync failed: ${error}`);
      
      // Update provider status to error
      await this.supabase
        .from('learning_providers')
        .update({ integration_status: 'error' })
        .eq('id', providerId);
    }

    result.sync_time = Date.now() - startTime;
    return result;
  }

  /**
   * Mock API call to external provider (replace with real implementation)
   */
  private async mockProviderApiCall(provider: LearningProvider) {
    // This is a mock implementation
    // In real code, you would make HTTP requests to the provider's API
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

    return [
      {
        external_id: 'ext-001',
        title: 'Advanced Board Governance',
        description: 'Comprehensive course on modern board governance practices',
        category: 'Governance',
        duration_hours: 8,
        credits: 8,
        cost: 299,
        currency: 'USD',
        enrollment_url: `${provider.website_url}/courses/ext-001`,
        skill_level: 'advanced',
        prerequisites: 'Basic governance knowledge',
        tags: ['governance', 'board', 'leadership'],
        rating: 4.5,
        review_count: 127,
        is_available: true
      },
      {
        external_id: 'ext-002',
        title: 'Financial Oversight for Directors',
        description: 'Essential financial knowledge for board members',
        category: 'Financial',
        duration_hours: 6,
        credits: 6,
        cost: 199,
        currency: 'USD',
        enrollment_url: `${provider.website_url}/courses/ext-002`,
        skill_level: 'intermediate',
        prerequisites: null,
        tags: ['finance', 'oversight', 'accounting'],
        rating: 4.2,
        review_count: 89,
        is_available: true
      }
    ];
  }

  /**
   * Get available certifications
   */
  async getCertifications(filters?: {
    certification_type?: string;
    issuing_organization?: string;
    is_active?: boolean;
    user_id?: string; // To include user's certification status
  }) {
    let query = this.supabase
      .from('certifications')
      .select('*')
      .order('name', { ascending: true });

    if (filters?.certification_type) {
      query = query.eq('certification_type', filters.certification_type);
    }
    if (filters?.issuing_organization) {
      query = query.eq('issuing_organization', filters.issuing_organization);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data: certifications, error } = await query;
    if (error) throw error;

    // If user_id provided, get user's certification status
    if (filters?.user_id && certifications) {
      const { data: userCertifications } = await this.supabase
        .from('user_certifications')
        .select('*')
        .eq('user_id', filters.user_id)
        .in('certification_id', certifications.map(c => c.id));

      return certifications.map(cert => ({
        ...cert,
        user_certification: userCertifications?.find(uc => uc.certification_id === cert.id),
        requirements_met: this.checkCertificationRequirements(cert, filters.user_id!),
        progress_percentage: this.calculateCertificationProgress(cert, filters.user_id!)
      })) as CertificationWithDetails[];
    }

    return certifications as Certification[];
  }

  /**
   * Award certification to user
   */
  async awardCertification(
    userId: string,
    certificationId: string,
    data: {
      earned_through?: any;
      certificate_url?: string;
      validity_months?: number;
    }
  ) {
    // Check if user already has this certification
    const { data: existing } = await this.supabase
      .from('user_certifications')
      .select('id, status')
      .eq('user_id', userId)
      .eq('certification_id', certificationId)
      .single();

    if (existing && existing.status === 'active') {
      throw new Error('User already has an active certification');
    }

    // Get certification details
    const { data: certification } = await this.supabase
      .from('certifications')
      .select('validity_months')
      .eq('id', certificationId)
      .single();

    const earnedDate = new Date().toISOString().split('T')[0];
    let expiryDate = null;
    
    const validityMonths = data.validity_months || certification?.validity_months;
    if (validityMonths) {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + validityMonths);
      expiryDate = expiry.toISOString().split('T')[0];
    }

    const certificateNumber = `CERT-${certificationId.slice(-8).toUpperCase()}-${Date.now()}`;
    const verificationCode = `VER-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const { data: userCert, error } = await this.supabase
      .from('user_certifications')
      .insert({
        user_id: userId,
        certification_id: certificationId,
        earned_date: earnedDate,
        expiry_date: expiryDate,
        certificate_number: certificateNumber,
        certificate_url: data.certificate_url,
        verification_code: verificationCode,
        status: 'active',
        earned_through: data.earned_through
      })
      .select()
      .single();

    if (error) throw error;
    return userCert as UserCertification;
  }

  /**
   * Get user's certifications
   */
  async getUserCertifications(userId: string, status?: string) {
    let query = this.supabase
      .from('user_certifications')
      .select(`
        *,
        certification:certifications(*)
      `)
      .eq('user_id', userId)
      .order('earned_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Renew certification
   */
  async renewCertification(
    userCertificationId: string,
    data: {
      renewal_requirements_met?: any;
      new_expiry_date?: string;
      certificate_url?: string;
    }
  ) {
    const updates: any = {
      renewal_date: new Date().toISOString().split('T')[0],
      status: 'active',
      updated_at: new Date().toISOString()
    };

    if (data.new_expiry_date) {
      updates.expiry_date = data.new_expiry_date;
    }
    if (data.certificate_url) {
      updates.certificate_url = data.certificate_url;
    }

    const { data: renewed, error } = await this.supabase
      .from('user_certifications')
      .update(updates)
      .eq('id', userCertificationId)
      .select()
      .single();

    if (error) throw error;
    return renewed as UserCertification;
  }

  /**
   * Check if user meets certification requirements
   */
  private async checkCertificationRequirements(
    certification: Certification,
    userId: string
  ): Promise<boolean> {
    if (!certification.requirements) return true;

    const requirements = certification.requirements;
    
    // Check required courses
    if (requirements.required_courses && requirements.required_courses.length > 0) {
      const { data: completedCourses } = await this.supabase
        .from('training_enrollments')
        .select('course_id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .in('course_id', requirements.required_courses);

      if (!completedCourses || completedCourses.length < requirements.required_courses.length) {
        return false;
      }
    }

    // Check minimum score requirement
    if (requirements.minimum_score && requirements.assessment_required) {
      // This would check assessment scores
      // Implementation depends on assessment system
    }

    // Check experience requirement
    if (requirements.experience_requirement) {
      // This would check user's experience
      // Implementation depends on user profile system
    }

    return true;
  }

  /**
   * Calculate certification progress percentage
   */
  private async calculateCertificationProgress(
    certification: Certification,
    userId: string
  ): Promise<number> {
    if (!certification.requirements) return 100;

    const requirements = certification.requirements;
    let totalRequirements = 0;
    let metRequirements = 0;

    // Check completed courses
    if (requirements.required_courses && requirements.required_courses.length > 0) {
      totalRequirements += requirements.required_courses.length;
      
      const { data: completedCourses } = await this.supabase
        .from('training_enrollments')
        .select('course_id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .in('course_id', requirements.required_courses);

      metRequirements += completedCourses?.length || 0;
    }

    // Add other requirement checks as needed
    if (requirements.assessment_required) {
      totalRequirements += 1;
      // Check if assessment is completed
      // metRequirements += assessment completed ? 1 : 0;
    }

    if (totalRequirements === 0) return 100;
    return Math.round((metRequirements / totalRequirements) * 100);
  }

  /**
   * Get continuing education analytics
   */
  async getContinuingEducationAnalytics(userId?: string) {
    if (userId) {
      // User-specific analytics
      const { data: userCourses } = await this.supabase
        .from('training_enrollments')
        .select('status, final_score, time_spent_minutes, completed_at')
        .eq('user_id', userId);

      const { data: userCertifications } = await this.supabase
        .from('user_certifications')
        .select('status, earned_date')
        .eq('user_id', userId);

      const totalCourses = userCourses?.length || 0;
      const completedCourses = userCourses?.filter(c => c.status === 'completed').length || 0;
      const totalCredits = userCourses?.reduce((sum, c) => sum + (c.time_spent_minutes || 0), 0) || 0;
      const activeCertifications = userCertifications?.filter(c => c.status === 'active').length || 0;

      return {
        total_courses_enrolled: totalCourses,
        courses_completed: completedCourses,
        completion_rate: totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0,
        total_credits_earned: Math.round(totalCredits / 60), // Convert to hours
        active_certifications: activeCertifications,
        avg_score: userCourses?.length 
          ? userCourses.filter(c => c.final_score).reduce((sum, c) => sum + (c.final_score || 0), 0) / 
            userCourses.filter(c => c.final_score).length
          : null
      };
    } else {
      // Platform-wide analytics
      const { data: allCourses } = await this.supabase
        .from('training_enrollments')
        .select('status, user_id')
        .eq('status', 'completed');

      const { data: allCertifications } = await this.supabase
        .from('user_certifications')
        .select('status, user_id')
        .eq('status', 'active');

      const uniqueUsers = new Set([
        ...(allCourses?.map(c => c.user_id) || []),
        ...(allCertifications?.map(c => c.user_id) || [])
      ]).size;

      return {
        total_active_learners: uniqueUsers,
        total_courses_completed: allCourses?.length || 0,
        total_active_certifications: allCertifications?.length || 0,
        avg_courses_per_user: uniqueUsers > 0 ? (allCourses?.length || 0) / uniqueUsers : 0,
        avg_certifications_per_user: uniqueUsers > 0 ? (allCertifications?.length || 0) / uniqueUsers : 0
      };
    }
  }

  /**
   * Search across all learning content (internal + external)
   */
  async searchAllLearningContent(
    searchTerm: string,
    filters?: {
      content_type?: 'internal' | 'external' | 'certification' | 'all';
      max_cost?: number;
      skill_level?: string;
      tags?: string[];
      limit?: number;
    }
  ) {
    const results: any = {
      internal_courses: [],
      external_courses: [],
      certifications: []
    };

    const limit = filters?.limit || 20;

    if (!filters?.content_type || filters.content_type === 'internal' || filters.content_type === 'all') {
      const { data: internalCourses } = await this.supabase
        .from('training_courses')
        .select(`
          *,
          category:training_categories(*)
        `)
        .eq('is_active', true)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(limit);

      results.internal_courses = internalCourses || [];
    }

    if (!filters?.content_type || filters.content_type === 'external' || filters.content_type === 'all') {
      let externalQuery = this.supabase
        .from('external_courses')
        .select(`
          *,
          provider:learning_providers(*)
        `)
        .eq('is_available', true)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(limit);

      if (filters?.max_cost !== undefined) {
        externalQuery = externalQuery.lte('cost', filters.max_cost);
      }

      const { data: externalCourses } = await externalQuery;
      results.external_courses = externalCourses || [];
    }

    if (!filters?.content_type || filters.content_type === 'certification' || filters.content_type === 'all') {
      const { data: certifications } = await this.supabase
        .from('certifications')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(limit);

      results.certifications = certifications || [];
    }

    return results;
  }
}

export const continuingEducationService = new ContinuingEducationService();