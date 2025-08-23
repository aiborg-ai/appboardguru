import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { trainingService } from '@/lib/services/training-service';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  overlaps: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(),
  upsert: jest.fn(() => mockSupabase)
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase
}));

describe('TrainingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTrainingCourses', () => {
    it('should fetch training courses successfully', async () => {
      const mockCourses = [
        {
          id: 'course-1',
          title: 'Board Governance Fundamentals',
          category: { name: 'Governance' },
          is_active: true
        }
      ];

      mockSupabase.single.mockResolvedValue({ data: mockCourses, error: null });

      const result = await trainingService.getTrainingCourses();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('training_courses');
      expect(mockSupabase.select).toHaveBeenCalledWith(expect.stringContaining('category:training_categories'));
      expect(result).toEqual(mockCourses);
    });

    it('should apply filters when provided', async () => {
      const filters = {
        category_id: 'cat-1',
        difficulty_level: 'intermediate',
        is_required: true,
        tags: ['governance', 'audit']
      };

      mockSupabase.single.mockResolvedValue({ data: [], error: null });

      await trainingService.getTrainingCourses(filters);
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('category_id', 'cat-1');
      expect(mockSupabase.eq).toHaveBeenCalledWith('difficulty_level', 'intermediate');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_required', true);
      expect(mockSupabase.overlaps).toHaveBeenCalledWith('tags', ['governance', 'audit']);
    });

    it('should handle search filter', async () => {
      const filters = { search: 'governance' };
      mockSupabase.single.mockResolvedValue({ data: [], error: null });

      await trainingService.getTrainingCourses(filters);
      
      expect(mockSupabase.or).toHaveBeenCalledWith(
        'title.ilike.%governance%,description.ilike.%governance%'
      );
    });
  });

  describe('enrollInCourse', () => {
    it('should enroll user in course successfully', async () => {
      const mockEnrollment = {
        id: 'enrollment-1',
        user_id: 'user-1',
        course_id: 'course-1',
        status: 'enrolled'
      };

      const mockCourse = { expiry_months: 12 };

      // Mock existing enrollment check (no existing enrollment)
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
      
      // Mock course details fetch
      mockSupabase.single.mockResolvedValueOnce({ data: mockCourse, error: null });
      
      // Mock enrollment creation
      mockSupabase.single.mockResolvedValueOnce({ data: mockEnrollment, error: null });

      const result = await trainingService.enrollInCourse('user-1', 'course-1');

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-1',
        course_id: 'course-1',
        status: 'enrolled',
        expiry_date: expect.any(String)
      }));
      expect(result).toEqual(mockEnrollment);
    });

    it('should allow re-enrollment for completed courses', async () => {
      const existingEnrollment = { 
        id: 'enrollment-1', 
        status: 'completed' 
      };
      
      const updatedEnrollment = {
        ...existingEnrollment,
        status: 'enrolled',
        progress_percentage: 0
      };

      // Mock existing enrollment check
      mockSupabase.single.mockResolvedValueOnce({ 
        data: existingEnrollment, 
        error: null 
      });
      
      // Mock enrollment update
      mockSupabase.single.mockResolvedValueOnce({ 
        data: updatedEnrollment, 
        error: null 
      });

      const result = await trainingService.enrollInCourse('user-1', 'course-1');

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'enrolled',
        progress_percentage: 0
      }));
      expect(result).toEqual(updatedEnrollment);
    });

    it('should throw error for existing active enrollment', async () => {
      const existingEnrollment = { 
        id: 'enrollment-1', 
        status: 'in_progress' 
      };

      mockSupabase.single.mockResolvedValue({ 
        data: existingEnrollment, 
        error: null 
      });

      await expect(
        trainingService.enrollInCourse('user-1', 'course-1')
      ).rejects.toThrow('Already enrolled in this course');
    });
  });

  describe('updateCourseProgress', () => {
    it('should update progress and recalculate overall progress', async () => {
      const mockProgress = {
        id: 'progress-1',
        enrollment_id: 'enrollment-1',
        module_id: 'module-1',
        completed_at: '2023-01-01T00:00:00Z'
      };

      // Mock progress upsert
      mockSupabase.single.mockResolvedValueOnce({ 
        data: mockProgress, 
        error: null 
      });

      // Mock enrollment update
      mockSupabase.single.mockResolvedValueOnce({ 
        data: {}, 
        error: null 
      });

      // Mock progress recalculation query
      mockSupabase.single.mockResolvedValueOnce({ 
        data: [
          { completed_at: '2023-01-01T00:00:00Z' },
          { completed_at: null }
        ], 
        error: null 
      });

      const result = await trainingService.updateCourseProgress(
        'enrollment-1',
        'module-1',
        {
          completed_at: '2023-01-01T00:00:00Z',
          score: 85
        }
      );

      expect(mockSupabase.upsert).toHaveBeenCalledWith({
        enrollment_id: 'enrollment-1',
        module_id: 'module-1',
        completed_at: '2023-01-01T00:00:00Z',
        score: 85,
        time_spent_minutes: 0
      });
      expect(result).toEqual(mockProgress);
    });
  });

  describe('completeCourse', () => {
    it('should mark course as completed and log analytics', async () => {
      const mockEnrollment = {
        id: 'enrollment-1',
        status: 'completed',
        progress_percentage: 100,
        final_score: 90
      };

      // Mock enrollment update
      mockSupabase.single.mockResolvedValueOnce({ 
        data: mockEnrollment, 
        error: null 
      });

      // Mock analytics logging
      mockSupabase.single.mockResolvedValueOnce({ 
        data: {}, 
        error: null 
      });

      const result = await trainingService.completeCourse(
        'user-1',
        'course-1',
        { final_score: 90, time_spent_minutes: 240 }
      );

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        progress_percentage: 100,
        final_score: 90,
        time_spent_minutes: 240
      }));
      expect(result).toEqual(mockEnrollment);
    });
  });

  describe('getRecommendedCourses', () => {
    it('should return courses user hasnt completed', async () => {
      const mockEnrollments = [
        { course_id: 'course-1' }
      ];
      
      const mockCourses = [
        { 
          id: 'course-2', 
          title: 'Advanced Governance',
          is_required: true,
          category: { name: 'Governance' }
        }
      ];

      // Mock user enrollments fetch
      mockSupabase.single.mockResolvedValueOnce({ 
        data: mockEnrollments, 
        error: null 
      });

      // Mock courses fetch
      mockSupabase.single.mockResolvedValueOnce({ 
        data: mockCourses, 
        error: null 
      });

      const result = await trainingService.getRecommendedCourses('user-1', 5);

      expect(mockSupabase.from).toHaveBeenCalledWith('training_enrollments');
      expect(mockSupabase.from).toHaveBeenCalledWith('training_courses');
      expect(result).toEqual(mockCourses);
    });

    it('should limit results to specified number', async () => {
      // Mock empty enrollments
      mockSupabase.single.mockResolvedValueOnce({ data: [], error: null });
      
      // Mock courses fetch
      mockSupabase.single.mockResolvedValueOnce({ data: [], error: null });

      await trainingService.getRecommendedCourses('user-1', 3);

      expect(mockSupabase.limit).toHaveBeenCalledWith(3);
    });
  });

  describe('searchLearningContent', () => {
    it('should search courses and learning paths', async () => {
      const mockResults = {
        courses: [{ id: 'course-1', title: 'Governance Basics' }],
        learning_paths: [{ id: 'path-1', name: 'Director Development' }]
      };

      // Mock courses search
      mockSupabase.single.mockResolvedValueOnce({ 
        data: mockResults.courses, 
        error: null 
      });

      // Mock learning paths search
      mockSupabase.single.mockResolvedValueOnce({ 
        data: mockResults.learning_paths, 
        error: null 
      });

      const result = await trainingService.searchLearningContent('governance');

      expect(mockSupabase.or).toHaveBeenCalledWith(
        'title.ilike.%governance%,description.ilike.%governance%'
      );
      expect(result.courses).toEqual(mockResults.courses);
      expect(result.learning_paths).toEqual(mockResults.learning_paths);
    });

    it('should filter by content type', async () => {
      mockSupabase.single.mockResolvedValue({ data: [], error: null });

      await trainingService.searchLearningContent('governance', {
        content_type: 'course'
      });

      // Should only call courses query, not learning paths
      expect(mockSupabase.from).toHaveBeenCalledWith('training_courses');
      expect(mockSupabase.from).not.toHaveBeenCalledWith('learning_paths');
    });
  });
});