import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { onboardingService } from '@/lib/services/onboarding-service';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  single: jest.fn(),
  rpc: jest.fn()
};

// Mock the Supabase client creation
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase
}));

describe('OnboardingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOnboardingTemplates', () => {
    it('should fetch onboarding templates successfully', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'New Board Member',
          role_type: 'independent_director',
          experience_level: 'beginner',
          is_active: true
        }
      ];

      mockSupabase.single.mockResolvedValue({ data: mockTemplates, error: null });

      const result = await onboardingService.getOnboardingTemplates();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('onboarding_templates');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.order).toHaveBeenCalledWith('role_type', { ascending: true });
      expect(result).toEqual(mockTemplates);
    });

    it('should apply filters when provided', async () => {
      const filters = {
        role_type: 'audit_committee',
        experience_level: 'intermediate',
        is_active: true
      };

      mockSupabase.single.mockResolvedValue({ data: [], error: null });

      await onboardingService.getOnboardingTemplates(filters);
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('role_type', 'audit_committee');
      expect(mockSupabase.eq).toHaveBeenCalledWith('experience_level', 'intermediate');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should throw error when Supabase returns error', async () => {
      const mockError = new Error('Database error');
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      await expect(onboardingService.getOnboardingTemplates()).rejects.toThrow('Database error');
    });
  });

  describe('createOnboardingInstance', () => {
    it('should create onboarding instance with progress entries', async () => {
      const mockOnboarding = {
        id: 'onboarding-1',
        user_id: 'user-1',
        template_id: 'template-1',
        status: 'not_started'
      };

      const mockSteps = [
        { id: 'step-1' },
        { id: 'step-2' }
      ];

      // Mock the onboarding creation
      mockSupabase.single.mockResolvedValueOnce({ 
        data: mockOnboarding, 
        error: null 
      });

      // Mock the steps fetch
      mockSupabase.single.mockResolvedValueOnce({ 
        data: mockSteps, 
        error: null 
      });

      // Mock the progress entries creation
      mockSupabase.single.mockResolvedValueOnce({ 
        data: [], 
        error: null 
      });

      const data = {
        user_id: 'user-1',
        template_id: 'template-1'
      };

      const result = await onboardingService.createOnboardingInstance(data);

      expect(mockSupabase.from).toHaveBeenCalledWith('member_onboarding');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-1',
        template_id: 'template-1',
        status: 'not_started'
      }));
      expect(result).toEqual(mockOnboarding);
    });

    it('should set default start date if not provided', async () => {
      const mockOnboarding = { id: 'onboarding-1' };
      mockSupabase.single.mockResolvedValue({ data: mockOnboarding, error: null });

      const data = {
        user_id: 'user-1',
        template_id: 'template-1'
      };

      await onboardingService.createOnboardingInstance(data);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        start_date: expect.any(String)
      }));
    });
  });

  describe('updateStepProgress', () => {
    it('should update step progress and recalculate overall progress', async () => {
      const mockProgress = {
        id: 'progress-1',
        status: 'completed',
        completed_at: '2023-01-01T00:00:00Z'
      };

      mockSupabase.single.mockResolvedValueOnce({ 
        data: mockProgress, 
        error: null 
      });

      mockSupabase.rpc.mockResolvedValueOnce({ 
        data: 50, 
        error: null 
      });

      const result = await onboardingService.updateStepProgress(
        'onboarding-1',
        'step-1',
        { status: 'completed', completed_at: '2023-01-01T00:00:00Z' }
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('member_onboarding_progress');
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'completed',
        completed_at: '2023-01-01T00:00:00Z'
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_onboarding_progress', {
        onboarding_id: 'onboarding-1'
      });
      expect(result).toEqual(mockProgress);
    });
  });

  describe('getRecommendedNextSteps', () => {
    it('should return available steps that meet prerequisites', async () => {
      const mockOnboarding = {
        id: 'onboarding-1',
        steps: [
          {
            id: 'step-1',
            prerequisites: null,
            progress: { status: 'completed' }
          },
          {
            id: 'step-2',
            prerequisites: ['step-1'],
            progress: { status: 'not_started' }
          },
          {
            id: 'step-3',
            prerequisites: ['step-2'],
            progress: { status: 'not_started' }
          }
        ]
      };

      // Mock getOnboardingWithProgress
      const mockGetProgress = jest.spyOn(onboardingService as any, 'getOnboardingWithProgress');
      mockGetProgress.mockResolvedValue(mockOnboarding);

      const result = await onboardingService.getRecommendedNextSteps('onboarding-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('step-2');
      
      mockGetProgress.mockRestore();
    });

    it('should return steps without prerequisites when no progress exists', async () => {
      const mockOnboarding = {
        id: 'onboarding-1',
        steps: [
          {
            id: 'step-1',
            prerequisites: null,
            progress: null
          },
          {
            id: 'step-2',
            prerequisites: ['step-1'],
            progress: null
          }
        ]
      };

      const mockGetProgress = jest.spyOn(onboardingService as any, 'getOnboardingWithProgress');
      mockGetProgress.mockResolvedValue(mockOnboarding);

      const result = await onboardingService.getRecommendedNextSteps('onboarding-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('step-1');
      
      mockGetProgress.mockRestore();
    });
  });

  describe('generateCompletionCertificate', () => {
    it('should generate certificate for completed onboarding', async () => {
      const mockOnboarding = {
        id: 'onboarding-1',
        user_id: 'user-1',
        status: 'completed',
        actual_completion_date: '2023-01-01',
        template: { name: 'Board Member Onboarding' }
      };

      const mockGetProgress = jest.spyOn(onboardingService as any, 'getOnboardingWithProgress');
      mockGetProgress.mockResolvedValue(mockOnboarding);

      const result = await onboardingService.generateCompletionCertificate('onboarding-1');

      expect(result).toMatchObject({
        onboarding_id: 'onboarding-1',
        user_id: 'user-1',
        template_name: 'Board Member Onboarding',
        completion_date: '2023-01-01',
        certificate_number: expect.stringMatching(/^OB-[A-Z0-9]{8}$/)
      });

      mockGetProgress.mockRestore();
    });

    it('should throw error for incomplete onboarding', async () => {
      const mockOnboarding = {
        status: 'in_progress'
      };

      const mockGetProgress = jest.spyOn(onboardingService as any, 'getOnboardingWithProgress');
      mockGetProgress.mockResolvedValue(mockOnboarding);

      await expect(
        onboardingService.generateCompletionCertificate('onboarding-1')
      ).rejects.toThrow('Onboarding must be completed to generate certificate');

      mockGetProgress.mockRestore();
    });
  });
});