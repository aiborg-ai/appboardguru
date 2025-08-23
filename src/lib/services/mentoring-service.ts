import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export interface MentorProfile {
  id: string;
  user_id: string;
  bio: string | null;
  expertise_areas: string[];
  industries: string[];
  board_roles: string[];
  years_experience: number | null;
  max_mentees: number;
  current_mentees: number;
  is_available: boolean;
  languages: string[];
  time_zone: string | null;
  preferred_communication: any;
  mentoring_style: string | null;
  achievements: string[];
  created_at: string;
  updated_at: string;
}

export interface MentorshipRelationship {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: string;
  match_score: number | null;
  matching_criteria: any;
  start_date: string | null;
  end_date: string | null;
  program_duration_months: number;
  goals: string[];
  meeting_frequency: string | null;
  progress_notes: string | null;
  satisfaction_rating: number | null;
  completion_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface MentorshipSession {
  id: string;
  relationship_id: string;
  scheduled_at: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  agenda: string | null;
  notes: string | null;
  action_items: any;
  next_session_date: string | null;
  mentor_rating: number | null;
  mentee_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface MentorWithDetails extends MentorProfile {
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
  };
  active_relationships?: number;
  average_rating?: number;
  total_sessions?: number;
}

export interface RelationshipWithDetails extends MentorshipRelationship {
  mentor?: {
    user_id: string;
    user?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      avatar_url: string;
    };
    bio: string;
    expertise_areas: string[];
    industries: string[];
  };
  mentee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
  };
  recent_sessions?: MentorshipSession[];
}

export interface MatchingCriteria {
  expertise_areas?: string[];
  industries?: string[];
  board_roles?: string[];
  years_experience_min?: number;
  languages?: string[];
  time_zone?: string;
  meeting_frequency?: string;
  mentoring_style?: string;
  goals?: string[];
}

export class MentoringService {
  private supabase = createClientComponentClient<Database>();

  /**
   * Get mentor profile by user ID
   */
  async getMentorProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('mentor_profiles')
      .select(`
        *,
        user:users(id, first_name, last_name, email, avatar_url)
      `)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Not found is ok
    return data as MentorWithDetails | null;
  }

  /**
   * Create or update mentor profile
   */
  async upsertMentorProfile(data: {
    user_id: string;
    bio?: string;
    expertise_areas?: string[];
    industries?: string[];
    board_roles?: string[];
    years_experience?: number;
    max_mentees?: number;
    is_available?: boolean;
    languages?: string[];
    time_zone?: string;
    preferred_communication?: any;
    mentoring_style?: string;
    achievements?: string[];
  }) {
    const { data: profile, error } = await this.supabase
      .from('mentor_profiles')
      .upsert({
        user_id: data.user_id,
        bio: data.bio,
        expertise_areas: data.expertise_areas || [],
        industries: data.industries || [],
        board_roles: data.board_roles || [],
        years_experience: data.years_experience,
        max_mentees: data.max_mentees || 3,
        is_available: data.is_available ?? true,
        languages: data.languages || ['English'],
        time_zone: data.time_zone,
        preferred_communication: data.preferred_communication,
        mentoring_style: data.mentoring_style,
        achievements: data.achievements || [],
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        user:users(id, first_name, last_name, email, avatar_url)
      `)
      .single();

    if (error) throw error;
    return profile as MentorWithDetails;
  }

  /**
   * Get available mentors with filtering
   */
  async getAvailableMentors(filters?: {
    expertise_areas?: string[];
    industries?: string[];
    board_roles?: string[];
    years_experience_min?: number;
    languages?: string[];
    time_zone?: string;
    limit?: number;
  }) {
    let query = this.supabase
      .from('mentor_availability')
      .select('*')
      .eq('is_available', true)
      .gt('available_slots', 0);

    if (filters?.expertise_areas && filters.expertise_areas.length > 0) {
      query = query.overlaps('expertise_areas', filters.expertise_areas);
    }
    if (filters?.industries && filters.industries.length > 0) {
      query = query.overlaps('industries', filters.industries);
    }
    if (filters?.board_roles && filters.board_roles.length > 0) {
      query = query.overlaps('board_roles', filters.board_roles);
    }
    if (filters?.years_experience_min) {
      query = query.gte('years_experience', filters.years_experience_min);
    }
    if (filters?.languages && filters.languages.length > 0) {
      query = query.overlaps('languages', filters.languages);
    }
    if (filters?.time_zone) {
      query = query.eq('time_zone', filters.time_zone);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('average_satisfaction', { ascending: false, nullsLast: true })
                 .order('years_experience', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data as MentorWithDetails[];
  }

  /**
   * Find mentor matches for a mentee using scoring algorithm
   */
  async findMentorMatches(
    menteeId: string,
    criteria?: MatchingCriteria,
    limit = 10
  ) {
    // Get available mentors
    const mentors = await this.getAvailableMentors({
      expertise_areas: criteria?.expertise_areas,
      industries: criteria?.industries,
      board_roles: criteria?.board_roles,
      years_experience_min: criteria?.years_experience_min,
      languages: criteria?.languages,
      time_zone: criteria?.time_zone,
      limit: limit * 2 // Get more to score and filter
    });

    // Calculate match scores
    const scoredMentors = mentors.map(mentor => ({
      ...mentor,
      match_score: this.calculateMatchScore(mentor, criteria || {}),
      matching_reasons: this.getMatchingReasons(mentor, criteria || {})
    }));

    // Sort by score and return top matches
    const topMatches = scoredMentors
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
      .slice(0, limit);

    return topMatches;
  }

  /**
   * Calculate compatibility score between mentor and criteria
   */
  private calculateMatchScore(mentor: any, criteria: MatchingCriteria): number {
    let score = 0;
    let maxScore = 0;

    // Expertise areas match (30 points)
    maxScore += 30;
    if (criteria.expertise_areas && criteria.expertise_areas.length > 0) {
      const expertiseMatch = this.calculateArrayOverlapScore(
        mentor.expertise_areas || [],
        criteria.expertise_areas
      );
      score += expertiseMatch * 30;
    } else {
      score += 15; // Partial score if no specific criteria
    }

    // Industry experience match (25 points)
    maxScore += 25;
    if (criteria.industries && criteria.industries.length > 0) {
      const industryMatch = this.calculateArrayOverlapScore(
        mentor.industries || [],
        criteria.industries
      );
      score += industryMatch * 25;
    } else {
      score += 12;
    }

    // Board roles experience match (20 points)
    maxScore += 20;
    if (criteria.board_roles && criteria.board_roles.length > 0) {
      const rolesMatch = this.calculateArrayOverlapScore(
        mentor.board_roles || [],
        criteria.board_roles
      );
      score += rolesMatch * 20;
    } else {
      score += 10;
    }

    // Experience level match (15 points)
    maxScore += 15;
    if (criteria.years_experience_min && mentor.years_experience) {
      if (mentor.years_experience >= criteria.years_experience_min) {
        score += 15;
        // Bonus for significantly more experience
        if (mentor.years_experience >= criteria.years_experience_min * 1.5) {
          score += 5;
          maxScore += 5;
        }
      }
    } else {
      score += 7;
    }

    // Language compatibility (5 points)
    maxScore += 5;
    if (criteria.languages && criteria.languages.length > 0) {
      const languageMatch = this.calculateArrayOverlapScore(
        mentor.languages || ['English'],
        criteria.languages
      );
      score += languageMatch * 5;
    } else {
      score += 5; // English is default
    }

    // Time zone compatibility (5 points)
    maxScore += 5;
    if (criteria.time_zone && mentor.time_zone) {
      if (mentor.time_zone === criteria.time_zone) {
        score += 5;
      } else {
        // Check if time zones are compatible (within 3 hours difference)
        // This is simplified - would need actual timezone calculation
        score += 2;
      }
    } else {
      score += 2;
    }

    // Availability and capacity bonus (5 points)
    maxScore += 5;
    if (mentor.available_slots && mentor.max_mentees) {
      const availabilityRatio = mentor.available_slots / mentor.max_mentees;
      score += availabilityRatio * 5;
    }

    // Historical performance bonus (up to 10 points)
    if (mentor.average_satisfaction && mentor.total_mentorships > 0) {
      const performanceBonus = (mentor.average_satisfaction / 5) * 10;
      score += performanceBonus;
      maxScore += 10;
    }

    // Return percentage score (0-100)
    return Math.min(100, Math.round((score / maxScore) * 100));
  }

  /**
   * Calculate overlap score between two arrays (0-1)
   */
  private calculateArrayOverlapScore(array1: string[], array2: string[]): number {
    if (array1.length === 0 || array2.length === 0) return 0;
    
    const intersection = array1.filter(item => 
      array2.some(criterion => 
        item.toLowerCase().includes(criterion.toLowerCase()) ||
        criterion.toLowerCase().includes(item.toLowerCase())
      )
    );
    
    return intersection.length / Math.max(array1.length, array2.length);
  }

  /**
   * Get human-readable matching reasons
   */
  private getMatchingReasons(mentor: any, criteria: MatchingCriteria): string[] {
    const reasons: string[] = [];

    if (criteria.expertise_areas) {
      const matches = criteria.expertise_areas.filter(area =>
        mentor.expertise_areas?.some((expertise: string) =>
          expertise.toLowerCase().includes(area.toLowerCase())
        )
      );
      if (matches.length > 0) {
        reasons.push(`Expertise in ${matches.join(', ')}`);
      }
    }

    if (criteria.industries) {
      const matches = criteria.industries.filter(industry =>
        mentor.industries?.some((mentorIndustry: string) =>
          mentorIndustry.toLowerCase().includes(industry.toLowerCase())
        )
      );
      if (matches.length > 0) {
        reasons.push(`${matches.join(', ')} industry experience`);
      }
    }

    if (criteria.board_roles) {
      const matches = criteria.board_roles.filter(role =>
        mentor.board_roles?.some((mentorRole: string) =>
          mentorRole.toLowerCase().includes(role.toLowerCase())
        )
      );
      if (matches.length > 0) {
        reasons.push(`Experience as ${matches.join(', ')}`);
      }
    }

    if (mentor.years_experience && criteria.years_experience_min) {
      if (mentor.years_experience >= criteria.years_experience_min) {
        reasons.push(`${mentor.years_experience} years of board experience`);
      }
    }

    if (mentor.average_satisfaction && mentor.average_satisfaction >= 4.0) {
      reasons.push(`High mentee satisfaction rating (${mentor.average_satisfaction}/5)`);
    }

    return reasons;
  }

  /**
   * Create a mentorship relationship
   */
  async createMentorshipRelationship(data: {
    mentor_id: string;
    mentee_id: string;
    matching_criteria?: any;
    goals?: string[];
    program_duration_months?: number;
    meeting_frequency?: string;
  }) {
    // Check if mentor is available
    const mentor = await this.getMentorProfile(data.mentor_id);
    if (!mentor || !mentor.is_available || mentor.current_mentees >= mentor.max_mentees) {
      throw new Error('Mentor is not available');
    }

    // Check for existing active relationship
    const { data: existing } = await this.supabase
      .from('mentorship_relationships')
      .select('id')
      .eq('mentor_id', data.mentor_id)
      .eq('mentee_id', data.mentee_id)
      .in('status', ['pending', 'active'])
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error('Active mentorship relationship already exists');
    }

    // Calculate match score if criteria provided
    let matchScore = null;
    if (data.matching_criteria) {
      matchScore = this.calculateMatchScore(mentor, data.matching_criteria);
    }

    const { data: relationship, error } = await this.supabase
      .from('mentorship_relationships')
      .insert({
        mentor_id: data.mentor_id,
        mentee_id: data.mentee_id,
        status: 'pending',
        match_score: matchScore,
        matching_criteria: data.matching_criteria,
        goals: data.goals || [],
        program_duration_months: data.program_duration_months || 6,
        meeting_frequency: data.meeting_frequency
      })
      .select()
      .single();

    if (error) throw error;
    return relationship as MentorshipRelationship;
  }

  /**
   * Update mentorship relationship status
   */
  async updateMentorshipStatus(
    relationshipId: string,
    status: string,
    data?: {
      start_date?: string;
      end_date?: string;
      satisfaction_rating?: number;
      completion_feedback?: string;
      progress_notes?: string;
    }
  ) {
    const updates: any = { status };
    
    if (data?.start_date) updates.start_date = data.start_date;
    if (data?.end_date) updates.end_date = data.end_date;
    if (data?.satisfaction_rating) updates.satisfaction_rating = data.satisfaction_rating;
    if (data?.completion_feedback) updates.completion_feedback = data.completion_feedback;
    if (data?.progress_notes) updates.progress_notes = data.progress_notes;

    const { data: relationship, error } = await this.supabase
      .from('mentorship_relationships')
      .update(updates)
      .eq('id', relationshipId)
      .select()
      .single();

    if (error) throw error;

    // Update mentor's current mentee count
    if (status === 'active') {
      await this.updateMentorMenteeCount(relationship.mentor_id, 1);
    } else if (['completed', 'cancelled'].includes(status)) {
      await this.updateMentorMenteeCount(relationship.mentor_id, -1);
    }

    return relationship as MentorshipRelationship;
  }

  /**
   * Get user's mentorship relationships
   */
  async getUserMentorships(
    userId: string,
    role: 'mentor' | 'mentee' | 'both' = 'both'
  ) {
    let query = this.supabase
      .from('mentorship_relationships')
      .select(`
        *,
        mentor:mentor_profiles!mentorship_relationships_mentor_id_fkey(
          *,
          user:users(id, first_name, last_name, email, avatar_url)
        ),
        mentee:users!mentorship_relationships_mentee_id_fkey(id, first_name, last_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (role === 'mentor') {
      query = query.eq('mentor_id', userId);
    } else if (role === 'mentee') {
      query = query.eq('mentee_id', userId);
    } else {
      query = query.or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as RelationshipWithDetails[];
  }

  /**
   * Get mentorship relationship details
   */
  async getMentorshipDetails(relationshipId: string) {
    const { data, error } = await this.supabase
      .from('mentorship_relationships')
      .select(`
        *,
        mentor:mentor_profiles!mentorship_relationships_mentor_id_fkey(
          *,
          user:users(id, first_name, last_name, email, avatar_url)
        ),
        mentee:users!mentorship_relationships_mentee_id_fkey(id, first_name, last_name, email, avatar_url),
        sessions:mentorship_sessions(*)
      `)
      .eq('id', relationshipId)
      .single();

    if (error) throw error;
    return data as RelationshipWithDetails;
  }

  /**
   * Create a mentorship session
   */
  async createMentorshipSession(data: {
    relationship_id: string;
    scheduled_at: string;
    duration_minutes?: number;
    session_type?: string;
    agenda?: string;
  }) {
    const { data: session, error } = await this.supabase
      .from('mentorship_sessions')
      .insert({
        relationship_id: data.relationship_id,
        scheduled_at: data.scheduled_at,
        duration_minutes: data.duration_minutes || 60,
        session_type: data.session_type || 'video_call',
        status: 'scheduled',
        agenda: data.agenda
      })
      .select()
      .single();

    if (error) throw error;
    return session as MentorshipSession;
  }

  /**
   * Update mentorship session
   */
  async updateMentorshipSession(
    sessionId: string,
    updates: {
      status?: string;
      notes?: string;
      action_items?: any;
      next_session_date?: string;
      mentor_rating?: number;
      mentee_rating?: number;
      actual_duration?: number;
    }
  ) {
    const { data: session, error } = await this.supabase
      .from('mentorship_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return session as MentorshipSession;
  }

  /**
   * Get sessions for a mentorship relationship
   */
  async getMentorshipSessions(relationshipId: string) {
    const { data, error } = await this.supabase
      .from('mentorship_sessions')
      .select('*')
      .eq('relationship_id', relationshipId)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data as MentorshipSession[];
  }

  /**
   * Get upcoming sessions for a user
   */
  async getUpcomingSessions(userId: string) {
    const { data, error } = await this.supabase
      .from('mentorship_sessions')
      .select(`
        *,
        relationship:mentorship_relationships(
          *,
          mentor:mentor_profiles!mentorship_relationships_mentor_id_fkey(
            user:users(id, first_name, last_name, email)
          ),
          mentee:users!mentorship_relationships_mentee_id_fkey(id, first_name, last_name, email)
        )
      `)
      .gte('scheduled_at', new Date().toISOString())
      .eq('status', 'scheduled')
      .or(`relationship.mentor_id.eq.${userId},relationship.mentee_id.eq.${userId}`)
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (error) throw error;
    return data;
  }

  /**
   * Update mentor's current mentee count
   */
  private async updateMentorMenteeCount(mentorId: string, delta: number) {
    const { error } = await this.supabase
      .rpc('update_mentor_mentee_count', {
        mentor_user_id: mentorId,
        delta: delta
      });

    if (error) console.error('Error updating mentor mentee count:', error);
  }

  /**
   * Get mentoring analytics for a mentor
   */
  async getMentorAnalytics(mentorId: string) {
    const { data: relationships } = await this.supabase
      .from('mentorship_relationships')
      .select('*')
      .eq('mentor_id', mentorId);

    const { data: sessions } = await this.supabase
      .from('mentorship_sessions')
      .select('*')
      .in('relationship_id', relationships?.map(r => r.id) || []);

    const totalMentorships = relationships?.length || 0;
    const activeMentorships = relationships?.filter(r => r.status === 'active').length || 0;
    const completedMentorships = relationships?.filter(r => r.status === 'completed').length || 0;
    const totalSessions = sessions?.length || 0;
    const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
    
    const avgSatisfactionRating = relationships && relationships.length > 0
      ? relationships
          .filter(r => r.satisfaction_rating)
          .reduce((sum, r) => sum + (r.satisfaction_rating || 0), 0) / 
        relationships.filter(r => r.satisfaction_rating).length
      : null;

    return {
      total_mentorships: totalMentorships,
      active_mentorships: activeMentorships,
      completed_mentorships: completedMentorships,
      total_sessions: totalSessions,
      completed_sessions: completedSessions,
      average_satisfaction_rating: avgSatisfactionRating
    };
  }

  /**
   * Send mentorship invitation
   */
  async sendMentorshipInvitation(
    relationshipId: string,
    message?: string
  ) {
    // This would typically integrate with email/notification service
    // For now, we'll just update the relationship status and add a note
    const { data, error } = await this.supabase
      .from('mentorship_relationships')
      .update({
        status: 'pending',
        progress_notes: message || 'Mentorship invitation sent'
      })
      .eq('id', relationshipId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get mentoring recommendations for a mentee
   */
  async getMentoringRecommendations(menteeId: string) {
    // This could analyze the mentee's profile, current skills, goals
    // and recommend mentors, resources, or actions
    
    // For now, return basic recommendations
    const mentorMatches = await this.findMentorMatches(menteeId, {}, 3);
    
    return {
      recommended_mentors: mentorMatches,
      suggested_goals: [
        'Develop board leadership skills',
        'Improve financial oversight capabilities',
        'Build industry network',
        'Enhance strategic thinking'
      ],
      recommended_frequency: 'monthly',
      program_duration: 6
    };
  }
}

export const mentoringService = new MentoringService();