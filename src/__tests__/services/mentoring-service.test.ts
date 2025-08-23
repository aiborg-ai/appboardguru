import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mentoringService } from '@/lib/services/mentoring-service';

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

describe('MentoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMentorProfile', () => {
    it('should create mentor profile successfully', async () => {
      const mockProfile = {
        id: 'mentor-1',
        user_id: 'user-1',
        years_of_experience: 15,
        max_mentees: 3,
        is_available: true
      };

      mockSupabase.single.mockResolvedValue({
        data: mockProfile,
        error: null
      });

      const profileData = {
        user_id: 'user-1',
        years_of_experience: 15,
        expertise_areas: ['governance', 'finance'],
        industries: ['technology', 'healthcare'],
        board_roles: ['chair', 'audit_committee'],
        max_mentees: 3,
        preferred_languages: ['en'],
        timezone: 'America/New_York',
        mentoring_style: 'collaborative',
        availability_notes: 'Evenings and weekends'
      };

      const result = await mentoringService.createMentorProfile(profileData);

      expect(mockSupabase.from).toHaveBeenCalledWith('mentor_profiles');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-1',
        years_of_experience: 15,
        max_mentees: 3,
        is_available: true,
        mentoring_approach: 'collaborative'
      }));
      expect(result).toEqual(mockProfile);
    });
  });

  describe('findMentorMatches', () => {
    it('should find and rank mentor matches', async () => {
      const mockMentors = [
        {
          id: 'mentor-1',
          user_id: 'user-1',
          years_of_experience: 20,
          expertise_areas: ['governance', 'risk_management'],
          industries: ['finance', 'technology'],
          board_roles: ['chair', 'audit_committee'],
          preferred_languages: ['en'],
          timezone: 'America/New_York',
          current_mentee_count: 1,
          max_mentees: 3,
          is_available: true,
          user: {
            first_name: 'John',
            last_name: 'Doe',
            profile_image_url: null
          }
        },
        {
          id: 'mentor-2', 
          user_id: 'user-2',
          years_of_experience: 10,
          expertise_areas: ['finance'],
          industries: ['healthcare'],
          board_roles: ['member'],
          preferred_languages: ['en', 'es'],
          timezone: 'America/Los_Angeles',
          current_mentee_count: 2,
          max_mentees: 2,
          is_available: true,
          user: {
            first_name: 'Jane',
            last_name: 'Smith',
            profile_image_url: null
          }
        }
      ];

      mockSupabase.single.mockResolvedValue({
        data: mockMentors,
        error: null
      });

      const criteria = {
        expertise_areas: ['governance'],
        industries: ['technology'],
        board_roles: ['chair'],
        preferred_languages: ['en'],
        timezone: 'America/New_York'
      };

      const result = await mentoringService.findMentorMatches(criteria);

      expect(mockSupabase.from).toHaveBeenCalledWith('mentor_profiles');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_available', true);
      expect(result).toHaveLength(2);
      
      // Verify scoring - mentor-1 should rank higher due to better matches
      expect(result[0].match_score).toBeGreaterThan(result[1].match_score);
      expect(result[0].id).toBe('mentor-1');
    });

    it('should handle empty mentor results', async () => {
      mockSupabase.single.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await mentoringService.findMentorMatches({
        expertise_areas: ['nonexistent']
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('createMentoringRelationship', () => {
    it('should create mentoring relationship successfully', async () => {
      const mockRelationship = {
        id: 'rel-1',
        mentor_id: 'mentor-1',
        mentee_id: 'mentee-1',
        status: 'pending',
        program_id: 'program-1'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockRelationship,
        error: null
      });

      const relationshipData = {
        mentor_id: 'mentor-1',
        mentee_id: 'mentee-1',
        program_id: 'program-1',
        goals: ['Improve board governance', 'Develop leadership skills'],
        duration_months: 6
      };

      const result = await mentoringService.createMentoringRelationship(relationshipData);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        mentor_id: 'mentor-1',
        mentee_id: 'mentee-1',
        program_id: 'program-1',
        status: 'pending',
        goals: ['Improve board governance', 'Develop leadership skills'],
        duration_months: 6
      }));
      expect(result).toEqual(mockRelationship);
    });
  });

  describe('updateRelationshipStatus', () => {
    it('should update relationship status', async () => {
      const mockUpdatedRelationship = {
        id: 'rel-1',
        status: 'active',
        start_date: '2024-01-15'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedRelationship,
        error: null
      });

      const result = await mentoringService.updateRelationshipStatus('rel-1', 'active');

      expect(mockSupabase.from).toHaveBeenCalledWith('mentoring_relationships');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'rel-1');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          start_date: expect.any(String)
        })
      );
      expect(result).toEqual(mockUpdatedRelationship);
    });

    it('should set end date when completing relationship', async () => {
      const mockCompletedRelationship = {
        id: 'rel-1',
        status: 'completed',
        end_date: '2024-07-15'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockCompletedRelationship,
        error: null
      });

      const result = await mentoringService.updateRelationshipStatus('rel-1', 'completed');

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          end_date: expect.any(String)
        })
      );
      expect(result).toEqual(mockCompletedRelationship);
    });
  });

  describe('scheduleMentoringSession', () => {
    it('should schedule session successfully', async () => {
      const mockSession = {
        id: 'session-1',
        relationship_id: 'rel-1',
        scheduled_for: '2024-02-01T10:00:00Z',
        session_type: 'video_call',
        status: 'scheduled'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockSession,
        error: null
      });

      const sessionData = {
        relationship_id: 'rel-1',
        scheduled_for: '2024-02-01T10:00:00Z',
        duration_minutes: 60,
        session_type: 'video_call' as const,
        agenda: 'Quarterly review and goal setting',
        meeting_link: 'https://zoom.us/j/123456789'
      };

      const result = await mentoringService.scheduleMentoringSession(sessionData);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        relationship_id: 'rel-1',
        scheduled_for: '2024-02-01T10:00:00Z',
        duration_minutes: 60,
        session_type: 'video_call',
        status: 'scheduled'
      }));
      expect(result).toEqual(mockSession);
    });
  });

  describe('updateSessionNotes', () => {
    it('should update session with notes and outcomes', async () => {
      const mockUpdatedSession = {
        id: 'session-1',
        status: 'completed',
        notes: 'Great progress discussion',
        action_items: ['Review governance framework', 'Schedule board observation']
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedSession,
        error: null
      });

      const updateData = {
        status: 'completed' as const,
        notes: 'Great progress discussion',
        action_items: ['Review governance framework', 'Schedule board observation'],
        mentee_feedback_rating: 5,
        mentor_feedback_rating: 4
      };

      const result = await mentoringService.updateSessionNotes('session-1', updateData);

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        notes: 'Great progress discussion',
        action_items: ['Review governance framework', 'Schedule board observation'],
        mentee_feedback_rating: 5,
        mentor_feedback_rating: 4
      }));
      expect(result).toEqual(mockUpdatedSession);
    });
  });

  describe('getMentoringAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      const mockAnalytics = {
        total_mentors: 25,
        active_mentors: 18,
        total_mentees: 45,
        active_relationships: 32,
        completed_relationships: 15,
        total_sessions: 150,
        avg_sessions_per_relationship: 4.7,
        avg_relationship_duration_days: 180,
        avg_mentor_rating: 4.6,
        avg_mentee_satisfaction: 4.5
      };

      mockSupabase.single.mockResolvedValue({
        data: mockAnalytics,
        error: null
      });

      const result = await mentoringService.getMentoringAnalytics('program-1');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_mentoring_analytics', {
        program_filter: 'program-1'
      });
      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('getBestPractices', () => {
    it('should return curated best practices', async () => {
      const mockBestPractices = [
        {
          id: 'bp-1',
          title: 'Effective Goal Setting',
          category: 'relationship_management',
          description: 'How to establish clear mentoring objectives',
          content: 'Best practices for goal setting...',
          helpful_count: 15
        },
        {
          id: 'bp-2',
          title: 'Virtual Mentoring Tips',
          category: 'communication',
          description: 'Making remote mentoring sessions effective',
          content: 'Tips for virtual engagement...',
          helpful_count: 12
        }
      ];

      mockSupabase.single.mockResolvedValue({
        data: mockBestPractices,
        error: null
      });

      const result = await mentoringService.getBestPractices('relationship_management');

      expect(mockSupabase.from).toHaveBeenCalledWith('mentoring_best_practices');
      expect(mockSupabase.eq).toHaveBeenCalledWith('category', 'relationship_management');
      expect(mockSupabase.order).toHaveBeenCalledWith('helpful_count', { ascending: false });
      expect(result).toEqual(mockBestPractices);
    });

    it('should return all practices when no category specified', async () => {
      mockSupabase.single.mockResolvedValue({
        data: [],
        error: null
      });

      await mentoringService.getBestPractices();

      expect(mockSupabase.from).toHaveBeenCalledWith('mentoring_best_practices');
      expect(mockSupabase.eq).not.toHaveBeenCalledWith('category', expect.anything());
    });
  });

  describe('calculateMatchScore', () => {
    const mentor = {
      expertise_areas: ['governance', 'risk_management'],
      industries: ['finance', 'technology'],
      board_roles: ['chair', 'audit_committee'],
      years_of_experience: 15,
      preferred_languages: ['en'],
      timezone: 'America/New_York'
    };

    it('should calculate high score for perfect match', () => {
      const criteria = {
        expertise_areas: ['governance'],
        industries: ['finance'],
        board_roles: ['chair'],
        preferred_languages: ['en'],
        timezone: 'America/New_York'
      };

      const service = mentoringService as any;
      const score = service.calculateMatchScore(mentor, criteria);

      expect(score).toBeGreaterThan(0.8); // High match score
    });

    it('should calculate lower score for partial match', () => {
      const criteria = {
        expertise_areas: ['marketing'], // No match
        industries: ['finance'], // Match
        board_roles: ['member'], // No match
        preferred_languages: ['en'], // Match
        timezone: 'America/Los_Angeles' // Different timezone
      };

      const service = mentoringService as any;
      const score = service.calculateMatchScore(mentor, criteria);

      expect(score).toBeLessThan(0.5); // Lower match score
    });

    it('should boost score for high experience', () => {
      const highExpMentor = { ...mentor, years_of_experience: 25 };
      const lowExpMentor = { ...mentor, years_of_experience: 5 };

      const criteria = {
        expertise_areas: ['governance'],
        industries: ['finance']
      };

      const service = mentoringService as any;
      const highScore = service.calculateMatchScore(highExpMentor, criteria);
      const lowScore = service.calculateMatchScore(lowExpMentor, criteria);

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('getMentorDashboard', () => {
    it('should return mentor dashboard data', async () => {
      const mockDashboard = {
        mentor_profile: {
          id: 'mentor-1',
          current_mentee_count: 2,
          max_mentees: 3,
          is_available: true
        },
        active_relationships: [
          { id: 'rel-1', mentee: { first_name: 'John', last_name: 'Doe' } }
        ],
        upcoming_sessions: [
          { id: 'session-1', scheduled_for: '2024-02-01T10:00:00Z' }
        ],
        recent_activity: [
          { type: 'session_completed', created_at: '2024-01-30T15:00:00Z' }
        ]
      };

      // Mock mentor profile
      mockSupabase.single.mockResolvedValueOnce({
        data: mockDashboard.mentor_profile,
        error: null
      });

      // Mock active relationships
      mockSupabase.single.mockResolvedValueOnce({
        data: mockDashboard.active_relationships,
        error: null
      });

      // Mock upcoming sessions
      mockSupabase.single.mockResolvedValueOnce({
        data: mockDashboard.upcoming_sessions,
        error: null
      });

      // Mock recent activity
      mockSupabase.single.mockResolvedValueOnce({
        data: mockDashboard.recent_activity,
        error: null
      });

      const result = await mentoringService.getMentorDashboard('user-1');

      expect(result.mentor_profile).toEqual(mockDashboard.mentor_profile);
      expect(result.active_relationships).toEqual(mockDashboard.active_relationships);
      expect(result.upcoming_sessions).toEqual(mockDashboard.upcoming_sessions);
      expect(result.recent_activity).toEqual(mockDashboard.recent_activity);
    });
  });
});