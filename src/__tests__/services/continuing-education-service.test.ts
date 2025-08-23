import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { continuingEducationService } from '@/lib/services/continuing-education-service';

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
  ilike: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  contains: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(),
  rpc: jest.fn()
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase
}));

describe('ContinuingEducationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getExternalCourses', () => {
    it('should return external courses with filters', async () => {
      const mockCourses = [
        {
          id: 'course-1',
          title: 'Advanced Governance Principles',
          provider: { name: 'NACD', reputation_score: 0.95 },
          category: 'governance',
          duration_hours: 8,
          credits_available: 2,
          price: 299.99,
          rating: 4.8
        },
        {
          id: 'course-2',
          title: 'Cyber Risk Management',
          provider: { name: 'IIA', reputation_score: 0.90 },
          category: 'cybersecurity',
          duration_hours: 6,
          credits_available: 1.5,
          price: 199.99,
          rating: 4.6
        }
      ];

      mockSupabase.single.mockResolvedValue({
        data: mockCourses,
        error: null
      });

      const filters = {
        category: 'governance',
        provider_id: 'provider-1',
        min_credits: 1,
        max_price: 300,
        format: 'online' as const
      };

      const result = await continuingEducationService.getExternalCourses(filters);

      expect(mockSupabase.from).toHaveBeenCalledWith('external_courses');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_available', true);
      expect(mockSupabase.eq).toHaveBeenCalledWith('category', 'governance');
      expect(mockSupabase.eq).toHaveBeenCalledWith('provider_id', 'provider-1');
      expect(mockSupabase.gte).toHaveBeenCalledWith('credits_available', 1);
      expect(mockSupabase.lte).toHaveBeenCalledWith('price', 300);
      expect(mockSupabase.eq).toHaveBeenCalledWith('format', 'online');
      expect(result).toEqual(mockCourses);
    });

    it('should search by keywords', async () => {
      mockSupabase.single.mockResolvedValue({
        data: [],
        error: null
      });

      await continuingEducationService.getExternalCourses({
        search: 'board governance'
      });

      expect(mockSupabase.or).toHaveBeenCalledWith(
        expect.stringContaining('title.ilike.%board governance%')
      );
    });
  });

  describe('enrollInExternalCourse', () => {
    it('should create enrollment successfully', async () => {
      const mockEnrollment = {
        id: 'enrollment-1',
        user_id: 'user-1',
        course_id: 'course-1',
        status: 'enrolled',
        enrolled_at: '2024-01-15T10:00:00Z'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockEnrollment,
        error: null
      });

      const enrollmentData = {
        user_id: 'user-1',
        course_id: 'course-1',
        enrollment_method: 'direct' as const,
        payment_status: 'pending' as const
      };

      const result = await continuingEducationService.enrollInExternalCourse(enrollmentData);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-1',
        course_id: 'course-1',
        status: 'enrolled',
        enrollment_method: 'direct',
        payment_status: 'pending'
      }));
      expect(result).toEqual(mockEnrollment);
    });
  });

  describe('updateEnrollmentProgress', () => {
    it('should update progress and complete course', async () => {
      const mockUpdatedEnrollment = {
        id: 'enrollment-1',
        progress_percentage: 100,
        status: 'completed',
        completion_date: '2024-02-15T15:30:00Z'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedEnrollment,
        error: null
      });

      const result = await continuingEducationService.updateEnrollmentProgress(
        'enrollment-1',
        100,
        { final_score: 95, time_spent_minutes: 480 }
      );

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        progress_percentage: 100,
        status: 'completed',
        completion_date: expect.any(String),
        final_score: 95,
        time_spent_minutes: 480
      }));
      expect(result).toEqual(mockUpdatedEnrollment);
    });

    it('should update progress without completing', async () => {
      const mockUpdatedEnrollment = {
        id: 'enrollment-1',
        progress_percentage: 60,
        status: 'in_progress'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedEnrollment,
        error: null
      });

      const result = await continuingEducationService.updateEnrollmentProgress(
        'enrollment-1',
        60
      );

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        progress_percentage: 60,
        status: 'in_progress'
      }));
      expect(result).toEqual(mockUpdatedEnrollment);
    });
  });

  describe('trackCredits', () => {
    it('should create credit record for completed course', async () => {
      const mockCreditRecord = {
        id: 'credit-1',
        user_id: 'user-1',
        enrollment_id: 'enrollment-1',
        credits_earned: 2.5,
        credit_type: 'continuing_education',
        earned_date: '2024-02-15'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockCreditRecord,
        error: null
      });

      const creditData = {
        user_id: 'user-1',
        enrollment_id: 'enrollment-1',
        credits_earned: 2.5,
        credit_type: 'continuing_education' as const,
        accreditation_body: 'NACD',
        certificate_url: 'https://example.com/cert.pdf'
      };

      const result = await continuingEducationService.trackCredits(creditData);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-1',
        enrollment_id: 'enrollment-1',
        credits_earned: 2.5,
        credit_type: 'continuing_education',
        earned_date: expect.any(String),
        accreditation_body: 'NACD',
        certificate_url: 'https://example.com/cert.pdf'
      }));
      expect(result).toEqual(mockCreditRecord);
    });
  });

  describe('getCreditSummary', () => {
    it('should return comprehensive credit summary', async () => {
      const mockSummary = {
        total_credits: 15.5,
        credits_by_type: {
          continuing_education: 10.0,
          certification: 3.5,
          webinar: 2.0
        },
        credits_by_year: {
          '2024': 8.5,
          '2023': 7.0
        },
        recent_credits: [
          {
            credits_earned: 2.5,
            earned_date: '2024-02-15',
            course_title: 'Advanced Governance',
            provider_name: 'NACD'
          }
        ],
        upcoming_expirations: []
      };

      mockSupabase.single.mockResolvedValue({
        data: mockSummary,
        error: null
      });

      const result = await continuingEducationService.getCreditSummary('user-1', 2024);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_credit_summary', {
        user_uuid: 'user-1',
        year_filter: 2024
      });
      expect(result).toEqual(mockSummary);
    });
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return recommendations based on user profile', async () => {
      const mockRecommendations = [
        {
          course_id: 'course-1',
          title: 'ESG Governance Essentials',
          provider_name: 'IIA',
          relevance_score: 0.92,
          recommendation_reason: 'Matches your sustainability focus and governance expertise',
          credits_available: 2.0,
          price: 249.99
        },
        {
          course_id: 'course-2',
          title: 'Digital Transformation Leadership',
          provider_name: 'NACD',
          relevance_score: 0.88,
          recommendation_reason: 'Complements your technology industry background',
          credits_available: 1.5,
          price: 199.99
        }
      ];

      mockSupabase.single.mockResolvedValue({
        data: mockRecommendations,
        error: null
      });

      const result = await continuingEducationService.getPersonalizedRecommendations('user-1');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_personalized_course_recommendations', {
        user_uuid: 'user-1',
        limit_count: 10
      });
      expect(result).toEqual(mockRecommendations);
    });
  });

  describe('scheduleWebinar', () => {
    it('should create webinar event', async () => {
      const mockWebinar = {
        id: 'webinar-1',
        title: 'Quarterly Governance Update',
        description: 'Latest trends in board governance',
        scheduled_date: '2024-03-15T14:00:00Z',
        duration_minutes: 90,
        max_attendees: 100,
        presenter_name: 'Dr. Sarah Johnson',
        is_free: true,
        credits_available: 1.0
      };

      mockSupabase.single.mockResolvedValue({
        data: mockWebinar,
        error: null
      });

      const webinarData = {
        title: 'Quarterly Governance Update',
        description: 'Latest trends in board governance',
        scheduled_date: '2024-03-15T14:00:00Z',
        duration_minutes: 90,
        max_attendees: 100,
        presenter_name: 'Dr. Sarah Johnson',
        presenter_bio: 'Expert in corporate governance',
        is_free: true,
        credits_available: 1.0,
        category: 'governance' as const
      };

      const result = await continuingEducationService.scheduleWebinar(webinarData);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Quarterly Governance Update',
        scheduled_date: '2024-03-15T14:00:00Z',
        duration_minutes: 90,
        max_attendees: 100,
        is_free: true,
        credits_available: 1.0,
        status: 'scheduled'
      }));
      expect(result).toEqual(mockWebinar);
    });
  });

  describe('registerForWebinar', () => {
    it('should register user for webinar', async () => {
      const mockRegistration = {
        id: 'registration-1',
        webinar_id: 'webinar-1',
        user_id: 'user-1',
        registration_date: '2024-03-01T10:00:00Z',
        attendance_status: 'registered'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockRegistration,
        error: null
      });

      const result = await continuingEducationService.registerForWebinar('webinar-1', 'user-1');

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        webinar_id: 'webinar-1',
        user_id: 'user-1',
        attendance_status: 'registered',
        registration_date: expect.any(String)
      }));
      expect(result).toEqual(mockRegistration);
    });
  });

  describe('syncExternalProvider', () => {
    it('should sync courses from external provider', async () => {
      const mockSyncResult = {
        provider_id: 'provider-1',
        courses_synced: 25,
        courses_updated: 5,
        courses_added: 3,
        sync_status: 'completed',
        last_sync_at: '2024-01-15T12:00:00Z'
      };

      // Mock the provider sync
      const service = continuingEducationService as any;
      const mockProviderSync = jest.spyOn(service, 'syncProviderCourses');
      mockProviderSync.mockResolvedValue(mockSyncResult);

      const result = await continuingEducationService.syncExternalProvider('provider-1');

      expect(mockProviderSync).toHaveBeenCalledWith('provider-1');
      expect(result).toEqual(mockSyncResult);

      mockProviderSync.mockRestore();
    });
  });

  describe('syncProviderCourses', () => {
    it('should handle NACD provider sync', async () => {
      const service = continuingEducationService as any;
      
      // Mock database operations for sync
      mockSupabase.single.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await service.syncProviderCourses('provider-nacd');

      expect(result.provider_id).toBe('provider-nacd');
      expect(result.sync_status).toBe('completed');
      expect(result.courses_synced).toBeGreaterThan(0);
    });

    it('should handle IIA provider sync', async () => {
      const service = continuingEducationService as any;
      
      mockSupabase.single.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await service.syncProviderCourses('provider-iia');

      expect(result.provider_id).toBe('provider-iia');
      expect(result.sync_status).toBe('completed');
      expect(result.courses_synced).toBeGreaterThan(0);
    });

    it('should handle unsupported provider', async () => {
      const service = continuingEducationService as any;
      
      const result = await service.syncProviderCourses('unknown-provider');

      expect(result.sync_status).toBe('error');
      expect(result.error_message).toContain('Unsupported provider');
    });
  });

  describe('getCertificationRequirements', () => {
    it('should return certification requirements for role', async () => {
      const mockRequirements = [
        {
          id: 'req-1',
          certification_name: 'Certified Director',
          required_credits: 10,
          credit_types: ['continuing_education', 'governance'],
          renewal_period_months: 24,
          accreditation_body: 'NACD'
        },
        {
          id: 'req-2',
          certification_name: 'Audit Committee Specialist',
          required_credits: 15,
          credit_types: ['audit', 'financial_reporting'],
          renewal_period_months: 36,
          accreditation_body: 'IIA'
        }
      ];

      mockSupabase.single.mockResolvedValue({
        data: mockRequirements,
        error: null
      });

      const result = await continuingEducationService.getCertificationRequirements('board_member');

      expect(mockSupabase.from).toHaveBeenCalledWith('certification_requirements');
      expect(mockSupabase.contains).toHaveBeenCalledWith('applicable_roles', ['board_member']);
      expect(result).toEqual(mockRequirements);
    });
  });

  describe('getProviderAnalytics', () => {
    it('should return provider performance metrics', async () => {
      const mockAnalytics = {
        total_providers: 5,
        active_providers: 4,
        total_courses: 150,
        total_enrollments: 500,
        completion_rate: 0.85,
        avg_course_rating: 4.6,
        popular_categories: [
          { category: 'governance', course_count: 45, enrollment_count: 180 },
          { category: 'cybersecurity', course_count: 30, enrollment_count: 120 }
        ],
        provider_performance: [
          { provider_name: 'NACD', course_count: 60, avg_rating: 4.8, enrollment_count: 200 }
        ]
      };

      mockSupabase.single.mockResolvedValue({
        data: mockAnalytics,
        error: null
      });

      const result = await continuingEducationService.getProviderAnalytics();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_continuing_education_analytics');
      expect(result).toEqual(mockAnalytics);
    });
  });
});