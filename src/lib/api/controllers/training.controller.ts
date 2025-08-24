/**
 * Training Controller
 * 
 * Consolidated controller for all learning management and training endpoints
 * Handles courses, enrollments, learning paths, recommendations, and progress tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BaseController } from '../base-controller'
import { Result, Ok, Err, ResultUtils } from '../../result'
import { TrainingService } from '../../services/training.service'

import type {
  UserId,
  CourseId,
  EnrollmentId,
  LearningPathId
} from '../../../types/branded'

// ==== Request/Response Schemas ====

const CreateCourseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  categoryId: z.string(),
  courseType: z.enum(['video', 'interactive', 'document', 'webinar', 'assessment', 'simulation']),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('beginner'),
  estimatedDurationHours: z.number().min(0.1).max(1000),
  contentUrl: z.string().url().optional(),
  contentData: z.record(z.any()).optional(),
  prerequisites: z.array(z.string()).optional(),
  learningObjectives: z.array(z.string()).min(1),
  tags: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  providerName: z.string().optional(),
  providerUrl: z.string().url().optional(),
  credits: z.number().min(0).optional(),
  expiryMonths: z.number().min(1).max(120).optional(),
  thumbnailUrl: z.string().url().optional()
})

const UpdateCourseSchema = CreateCourseSchema.partial()

const CreateEnrollmentSchema = z.object({
  courseId: z.string(),
  userId: z.string().optional(), // For admin enrollments
  enrollmentType: z.enum(['self', 'assigned', 'required', 'recommended']).default('self'),
  dueDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  notes: z.string().max(1000).optional(),
  autoEnroll: z.boolean().default(false)
})

const UpdateProgressSchema = z.object({
  progressPercent: z.number().min(0).max(100),
  currentSection: z.string().optional(),
  timeSpentMinutes: z.number().min(0).optional(),
  completedSections: z.array(z.string()).optional(),
  quizScores: z.array(z.object({
    sectionId: z.string(),
    score: z.number().min(0).max(100),
    completedAt: z.string()
  })).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'failed', 'expired']).optional()
})

const CreateLearningPathSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  category: z.enum(['onboarding', 'compliance', 'skills', 'leadership', 'technical', 'custom']),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']),
  estimatedDurationHours: z.number().min(0.1).max(2000),
  isRequired: z.boolean().default(false),
  targetRoles: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  courses: z.array(z.object({
    courseId: z.string(),
    order: z.number().min(1),
    isRequired: z.boolean().default(true),
    unlockConditions: z.array(z.string()).optional()
  })).min(1),
  tags: z.array(z.string()).optional(),
  thumbnailUrl: z.string().url().optional()
})

const TrainingRecommendationSchema = z.object({
  userId: z.string().optional(),
  roleType: z.enum(['board_member', 'executive', 'admin', 'staff']).optional(),
  skillGaps: z.array(z.string()).optional(),
  timeAvailableHours: z.number().min(1).max(40).optional(),
  priorityAreas: z.array(z.enum(['compliance', 'governance', 'leadership', 'technical', 'communication'])).optional(),
  includeCompleted: z.boolean().default(false),
  maxRecommendations: z.number().min(1).max(50).default(10)
})

// ==== Main Controller Class ====

export class TrainingController extends BaseController {
  private trainingService: TrainingService

  constructor() {
    super()
    this.trainingService = new TrainingService()
  }

  // ==== Course Management ====

  /**
   * GET /api/training/courses
   * Get training courses with filtering
   */
  async getCourses(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      categoryId: z.string().optional(),
      courseType: z.enum(['video', 'interactive', 'document', 'webinar', 'assessment', 'simulation']).optional(),
      difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
      isRequired: z.enum(['true', 'false']).optional(),
      isActive: z.enum(['true', 'false']).optional(),
      search: z.string().optional(),
      tags: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
      sortBy: z.enum(['title', 'created_at', 'difficulty_level', 'duration']).default('created_at'),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    }))

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { 
        categoryId, courseType, difficultyLevel, isRequired, isActive, 
        search, tags, limit, offset, sortBy, sortOrder 
      } = ResultUtils.unwrap(queryResult)

      try {
        // Mock courses data - replace with actual service call
        const allCourses = [
          {
            id: 'course-1',
            title: 'Board Governance Fundamentals',
            description: 'Essential principles of effective board governance and oversight',
            categoryId: 'governance',
            categoryName: 'Corporate Governance',
            courseType: 'video',
            difficultyLevel: 'beginner',
            estimatedDurationHours: 4.5,
            contentUrl: 'https://training.company.com/governance-101',
            prerequisites: [],
            learningObjectives: [
              'Understand board roles and responsibilities',
              'Learn governance best practices',
              'Apply oversight principles'
            ],
            tags: ['governance', 'compliance', 'fundamentals'],
            isRequired: true,
            isActive: true,
            providerName: 'BoardTraining Institute',
            credits: 4.5,
            expiryMonths: 24,
            thumbnailUrl: 'https://cdn.company.com/course-thumbnails/governance.jpg',
            enrollmentCount: 156,
            averageRating: 4.7,
            completionRate: 0.89,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'course-2',
            title: 'ESG Reporting and Sustainability',
            description: 'Environmental, Social, and Governance reporting requirements and best practices',
            categoryId: 'sustainability',
            categoryName: 'Sustainability & ESG',
            courseType: 'interactive',
            difficultyLevel: 'intermediate',
            estimatedDurationHours: 6.0,
            contentUrl: 'https://training.company.com/esg-reporting',
            prerequisites: ['course-1'],
            learningObjectives: [
              'Master ESG reporting frameworks',
              'Understand sustainability metrics',
              'Implement disclosure strategies'
            ],
            tags: ['esg', 'sustainability', 'reporting', 'compliance'],
            isRequired: false,
            isActive: true,
            providerName: 'Sustainability Academy',
            credits: 6.0,
            expiryMonths: 12,
            thumbnailUrl: 'https://cdn.company.com/course-thumbnails/esg.jpg',
            enrollmentCount: 89,
            averageRating: 4.8,
            completionRate: 0.82,
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]

        let filteredCourses = allCourses

        // Apply filters
        if (categoryId) {
          filteredCourses = filteredCourses.filter(c => c.categoryId === categoryId)
        }

        if (courseType) {
          filteredCourses = filteredCourses.filter(c => c.courseType === courseType)
        }

        if (difficultyLevel) {
          filteredCourses = filteredCourses.filter(c => c.difficultyLevel === difficultyLevel)
        }

        if (isRequired !== undefined) {
          const requiredBool = isRequired === 'true'
          filteredCourses = filteredCourses.filter(c => c.isRequired === requiredBool)
        }

        if (isActive !== undefined) {
          const activeBool = isActive === 'true'
          filteredCourses = filteredCourses.filter(c => c.isActive === activeBool)
        }

        if (search) {
          const searchLower = search.toLowerCase()
          filteredCourses = filteredCourses.filter(c => 
            c.title.toLowerCase().includes(searchLower) ||
            c.description.toLowerCase().includes(searchLower) ||
            c.tags.some(tag => tag.toLowerCase().includes(searchLower))
          )
        }

        if (tags) {
          const tagList = tags.split(',').map(tag => tag.trim().toLowerCase())
          filteredCourses = filteredCourses.filter(c =>
            tagList.some(tag => c.tags.some(courseTag => courseTag.toLowerCase().includes(tag)))
          )
        }

        // Apply pagination
        const paginatedCourses = filteredCourses.slice(offset, offset + limit)

        return Ok({
          success: true,
          data: {
            courses: paginatedCourses,
            pagination: {
              total: filteredCourses.length,
              limit,
              offset,
              totalPages: Math.ceil(filteredCourses.length / limit)
            },
            summary: {
              totalCourses: filteredCourses.length,
              requiredCourses: filteredCourses.filter(c => c.isRequired).length,
              averageCompletionRate: filteredCourses.reduce((sum, c) => sum + c.completionRate, 0) / filteredCourses.length,
              totalEnrollments: filteredCourses.reduce((sum, c) => sum + c.enrollmentCount, 0)
            }
          },
          message: 'Training courses retrieved successfully'
        })
      } catch (error) {
        return Err(new Error(`Failed to get courses: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  /**
   * POST /api/training/courses
   * Create new training course
   */
  async createCourse(request: NextRequest): Promise<NextResponse> {
    const bodyResult = await this.validateBody(request, CreateCourseSchema)

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const courseData = ResultUtils.unwrap(bodyResult)
      const userId = ResultUtils.unwrap(userIdResult)

      try {
        const newCourse = {
          id: `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` as CourseId,
          ...courseData,
          isActive: true,
          enrollmentCount: 0,
          averageRating: 0,
          completionRate: 0,
          createdBy: userId as UserId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // TODO: Save course through training service
        // await this.trainingService.createCourse(newCourse)

        return Ok({
          success: true,
          data: newCourse,
          message: 'Training course created successfully'
        })
      } catch (error) {
        return Err(new Error(`Failed to create course: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  /**
   * GET /api/training/courses/[id]
   * Get specific course details
   */
  async getCourse(
    request: NextRequest,
    context: { params: { id: string } }
  ): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { id } = this.getPathParams(context)

      try {
        // Mock course details - replace with actual service call
        const course = {
          id,
          title: 'Board Governance Fundamentals',
          description: 'Comprehensive course covering essential principles of effective board governance',
          fullDescription: 'This comprehensive course provides board members with the foundational knowledge needed for effective governance...',
          categoryId: 'governance',
          categoryName: 'Corporate Governance',
          courseType: 'video',
          difficultyLevel: 'beginner',
          estimatedDurationHours: 4.5,
          contentUrl: 'https://training.company.com/governance-101',
          prerequisites: [],
          learningObjectives: [
            'Understand board roles and responsibilities',
            'Learn governance best practices',
            'Apply oversight principles',
            'Master fiduciary duties'
          ],
          syllabus: [
            {
              id: 'section-1',
              title: 'Introduction to Board Governance',
              duration: 1.0,
              topics: ['Board purpose', 'Legal framework', 'Key responsibilities']
            },
            {
              id: 'section-2', 
              title: 'Fiduciary Duties',
              duration: 1.5,
              topics: ['Duty of care', 'Duty of loyalty', 'Business judgment rule']
            }
          ],
          assessments: [
            {
              id: 'quiz-1',
              title: 'Governance Fundamentals Quiz',
              type: 'multiple_choice',
              passingScore: 80,
              timeLimit: 30
            }
          ],
          resources: [
            {
              title: 'Board Charter Template',
              type: 'document',
              url: 'https://resources.company.com/board-charter.pdf'
            }
          ],
          tags: ['governance', 'compliance', 'fundamentals'],
          isRequired: true,
          providerName: 'BoardTraining Institute',
          credits: 4.5,
          expiryMonths: 24,
          enrollmentCount: 156,
          averageRating: 4.7,
          completionRate: 0.89,
          reviews: [
            {
              userId: 'user-1',
              rating: 5,
              comment: 'Excellent overview of governance principles',
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }

        return Ok({
          success: true,
          data: course,
          message: 'Course details retrieved successfully'
        })
      } catch (error) {
        return Err(new Error(`Failed to get course: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  // ==== Enrollment Management ====

  /**
   * GET /api/training/enrollments
   * Get user enrollments
   */
  async getEnrollments(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      userId: z.string().optional(),
      courseId: z.string().optional(),
      status: z.enum(['not_started', 'in_progress', 'completed', 'failed', 'expired']).optional(),
      enrollmentType: z.enum(['self', 'assigned', 'required', 'recommended']).optional(),
      dueWithinDays: z.coerce.number().min(1).max(365).optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0)
    }))

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { userId, courseId, status, enrollmentType, dueWithinDays, limit, offset } = ResultUtils.unwrap(queryResult)

      try {
        // Mock enrollments data
        const enrollments = [
          {
            id: 'enrollment-1',
            userId: userId || ResultUtils.unwrap(userIdResult),
            courseId: 'course-1',
            course: {
              id: 'course-1',
              title: 'Board Governance Fundamentals',
              thumbnailUrl: 'https://cdn.company.com/course-thumbnails/governance.jpg',
              estimatedDurationHours: 4.5,
              difficultyLevel: 'beginner'
            },
            enrollmentType: 'required',
            status: 'in_progress',
            progressPercent: 65,
            currentSection: 'section-2',
            timeSpentMinutes: 180,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            enrolledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            lastAccessedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            completedAt: null,
            certificateUrl: null
          }
        ]

        let filteredEnrollments = enrollments

        if (courseId) {
          filteredEnrollments = filteredEnrollments.filter(e => e.courseId === courseId)
        }

        if (status) {
          filteredEnrollments = filteredEnrollments.filter(e => e.status === status)
        }

        if (enrollmentType) {
          filteredEnrollments = filteredEnrollments.filter(e => e.enrollmentType === enrollmentType)
        }

        const paginatedEnrollments = filteredEnrollments.slice(offset, offset + limit)

        return Ok({
          success: true,
          data: {
            enrollments: paginatedEnrollments,
            pagination: {
              total: filteredEnrollments.length,
              limit,
              offset,
              totalPages: Math.ceil(filteredEnrollments.length / limit)
            },
            summary: {
              totalEnrollments: filteredEnrollments.length,
              inProgress: filteredEnrollments.filter(e => e.status === 'in_progress').length,
              completed: filteredEnrollments.filter(e => e.status === 'completed').length,
              overdue: filteredEnrollments.filter(e => 
                e.dueDate && new Date(e.dueDate) < new Date() && e.status !== 'completed'
              ).length,
              averageProgress: filteredEnrollments.reduce((sum, e) => sum + e.progressPercent, 0) / filteredEnrollments.length
            }
          },
          message: 'Enrollments retrieved successfully'
        })
      } catch (error) {
        return Err(new Error(`Failed to get enrollments: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  /**
   * POST /api/training/enrollments
   * Create new enrollment
   */
  async createEnrollment(request: NextRequest): Promise<NextResponse> {
    const bodyResult = await this.validateBody(request, CreateEnrollmentSchema)

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const enrollmentData = ResultUtils.unwrap(bodyResult)
      const enrollingUserId = ResultUtils.unwrap(userIdResult)

      try {
        const newEnrollment = {
          id: `enrollment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` as EnrollmentId,
          userId: (enrollmentData.userId || enrollingUserId) as UserId,
          courseId: enrollmentData.courseId as CourseId,
          enrollmentType: enrollmentData.enrollmentType,
          status: 'not_started',
          progressPercent: 0,
          timeSpentMinutes: 0,
          dueDate: enrollmentData.dueDate,
          priority: enrollmentData.priority,
          notes: enrollmentData.notes,
          enrolledBy: enrollingUserId as UserId,
          enrolledAt: new Date().toISOString(),
          lastAccessedAt: null,
          completedAt: null
        }

        // TODO: Save enrollment through training service
        // await this.trainingService.createEnrollment(newEnrollment)

        return Ok({
          success: true,
          data: newEnrollment,
          message: 'Enrollment created successfully'
        })
      } catch (error) {
        return Err(new Error(`Failed to create enrollment: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  /**
   * PUT /api/training/enrollments/[id]/progress
   * Update enrollment progress
   */
  async updateProgress(
    request: NextRequest,
    context: { params: { id: string } }
  ): Promise<NextResponse> {
    const bodyResult = await this.validateBody(request, UpdateProgressSchema)

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { id } = this.getPathParams(context)
      const progressData = ResultUtils.unwrap(bodyResult)

      try {
        const updatedEnrollment = {
          id: id as EnrollmentId,
          ...progressData,
          lastAccessedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: progressData.progressPercent === 100 ? new Date().toISOString() : null
        }

        // TODO: Update progress through training service
        // await this.trainingService.updateEnrollmentProgress(id, progressData)

        return Ok({
          success: true,
          data: updatedEnrollment,
          message: 'Progress updated successfully'
        })
      } catch (error) {
        return Err(new Error(`Failed to update progress: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  // ==== Learning Paths ====

  /**
   * GET /api/training/learning-paths
   * Get learning paths
   */
  async getLearningPaths(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      category: z.enum(['onboarding', 'compliance', 'skills', 'leadership', 'technical', 'custom']).optional(),
      difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']).optional(),
      isRequired: z.enum(['true', 'false']).optional(),
      targetRole: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0)
    }))

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { category, difficultyLevel, isRequired, targetRole, limit, offset } = ResultUtils.unwrap(queryResult)

      try {
        // Mock learning paths data
        const learningPaths = [
          {
            id: 'path-1',
            title: 'Board Member Onboarding',
            description: 'Complete onboarding curriculum for new board members',
            category: 'onboarding',
            difficultyLevel: 'beginner',
            estimatedDurationHours: 16.0,
            isRequired: true,
            targetRoles: ['board_member'],
            prerequisites: [],
            courses: [
              {
                courseId: 'course-1',
                order: 1,
                isRequired: true,
                unlockConditions: []
              },
              {
                courseId: 'course-2',
                order: 2,
                isRequired: true,
                unlockConditions: ['course-1-completed']
              }
            ],
            tags: ['onboarding', 'governance', 'fundamentals'],
            enrollmentCount: 45,
            completionRate: 0.78,
            averageRating: 4.6,
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]

        let filteredPaths = learningPaths

        if (category) {
          filteredPaths = filteredPaths.filter(p => p.category === category)
        }

        if (difficultyLevel) {
          filteredPaths = filteredPaths.filter(p => p.difficultyLevel === difficultyLevel)
        }

        if (isRequired !== undefined) {
          const requiredBool = isRequired === 'true'
          filteredPaths = filteredPaths.filter(p => p.isRequired === requiredBool)
        }

        if (targetRole) {
          filteredPaths = filteredPaths.filter(p => p.targetRoles.includes(targetRole))
        }

        const paginatedPaths = filteredPaths.slice(offset, offset + limit)

        return Ok({
          success: true,
          data: {
            learningPaths: paginatedPaths,
            pagination: {
              total: filteredPaths.length,
              limit,
              offset,
              totalPages: Math.ceil(filteredPaths.length / limit)
            },
            summary: {
              totalPaths: filteredPaths.length,
              requiredPaths: filteredPaths.filter(p => p.isRequired).length,
              averageCompletionRate: filteredPaths.reduce((sum, p) => sum + p.completionRate, 0) / filteredPaths.length,
              totalEnrollments: filteredPaths.reduce((sum, p) => sum + p.enrollmentCount, 0)
            }
          },
          message: 'Learning paths retrieved successfully'
        })
      } catch (error) {
        return Err(new Error(`Failed to get learning paths: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  /**
   * POST /api/training/learning-paths/[id]/enroll
   * Enroll in learning path
   */
  async enrollInLearningPath(
    request: NextRequest,
    context: { params: { id: string } }
  ): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { id } = this.getPathParams(context)
      const userId = ResultUtils.unwrap(userIdResult)

      try {
        const enrollment = {
          learningPathId: id as LearningPathId,
          userId: userId as UserId,
          status: 'enrolled',
          progressPercent: 0,
          currentCourse: null,
          enrolledAt: new Date().toISOString(),
          estimatedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }

        // TODO: Process learning path enrollment through training service
        // await this.trainingService.enrollInLearningPath(id, userId)

        return Ok({
          success: true,
          data: enrollment,
          message: 'Successfully enrolled in learning path'
        })
      } catch (error) {
        return Err(new Error(`Failed to enroll in learning path: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  // ==== Recommendations ====

  /**
   * GET /api/training/recommendations
   * Get personalized training recommendations
   */
  async getRecommendations(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, TrainingRecommendationSchema)

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const recommendationParams = ResultUtils.unwrap(queryResult)
      const userId = ResultUtils.unwrap(userIdResult)

      try {
        // Mock recommendations data - replace with ML service
        const recommendations = [
          {
            courseId: 'course-3',
            title: 'Advanced Risk Management',
            description: 'Deep dive into enterprise risk management frameworks',
            recommendationScore: 0.92,
            reasons: [
              'Matches your current role responsibilities',
              'Builds on completed governance training',
              'High priority for board members'
            ],
            estimatedDurationHours: 8.0,
            difficultyLevel: 'intermediate',
            tags: ['risk', 'management', 'governance'],
            priority: 'high',
            category: 'Risk Management'
          },
          {
            courseId: 'course-4',
            title: 'Digital Transformation Strategy',
            description: 'Understanding digital transformation in the boardroom',
            recommendationScore: 0.85,
            reasons: [
              'Popular among peers in similar roles',
              'Addresses identified skill gap',
              'Recently updated content'
            ],
            estimatedDurationHours: 6.5,
            difficultyLevel: 'intermediate',
            tags: ['digital', 'strategy', 'technology'],
            priority: 'medium',
            category: 'Technology'
          }
        ]

        return Ok({
          success: true,
          data: {
            recommendations,
            generatedFor: {
              userId: recommendationParams.userId || userId,
              roleType: recommendationParams.roleType,
              skillGaps: recommendationParams.skillGaps || [],
              priorityAreas: recommendationParams.priorityAreas || []
            },
            generatedAt: new Date().toISOString(),
            algorithm: {
              version: '2.1',
              confidence: 0.87,
              factors: [
                'Role-based matching',
                'Skill gap analysis', 
                'Peer recommendations',
                'Learning history'
              ]
            }
          },
          message: 'Training recommendations generated successfully'
        })
      } catch (error) {
        return Err(new Error(`Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  // ==== Categories ====

  /**
   * GET /api/training/categories
   * Get training categories
   */
  async getCategories(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      try {
        // Mock categories data
        const categories = [
          {
            id: 'governance',
            name: 'Corporate Governance',
            description: 'Board governance, oversight, and fiduciary responsibilities',
            courseCount: 24,
            color: '#1f77b4',
            icon: 'governance'
          },
          {
            id: 'sustainability',
            name: 'Sustainability & ESG',
            description: 'Environmental, social, and governance frameworks and reporting',
            courseCount: 18,
            color: '#2ca02c',
            icon: 'leaf'
          },
          {
            id: 'risk',
            name: 'Risk Management',
            description: 'Enterprise risk assessment, mitigation, and oversight',
            courseCount: 15,
            color: '#d62728',
            icon: 'shield'
          },
          {
            id: 'compliance',
            name: 'Regulatory Compliance',
            description: 'Legal and regulatory requirements and frameworks',
            courseCount: 32,
            color: '#ff7f0e',
            icon: 'scale'
          },
          {
            id: 'leadership',
            name: 'Leadership Development',
            description: 'Executive and board leadership skills and development',
            courseCount: 21,
            color: '#9467bd',
            icon: 'users'
          }
        ]

        return Ok({
          success: true,
          data: {
            categories,
            summary: {
              totalCategories: categories.length,
              totalCourses: categories.reduce((sum, c) => sum + c.courseCount, 0),
              mostPopularCategory: categories.sort((a, b) => b.courseCount - a.courseCount)[0]
            }
          },
          message: 'Training categories retrieved successfully'
        })
      } catch (error) {
        return Err(new Error(`Failed to get categories: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  // ==== Search ====

  /**
   * GET /api/training/search
   * Search training content
   */
  async searchTraining(request: NextRequest): Promise<NextResponse> {
    const queryResult = this.validateQuery(request, z.object({
      q: z.string().min(1),
      type: z.enum(['course', 'learning_path', 'all']).default('all'),
      categoryId: z.string().optional(),
      difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
      maxDuration: z.coerce.number().min(0.1).max(100).optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0)
    }))

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { q, type, categoryId, difficultyLevel, maxDuration, limit, offset } = ResultUtils.unwrap(queryResult)

      try {
        // Mock search results - replace with actual search service
        const searchResults = {
          courses: [
            {
              id: 'course-1',
              title: 'Board Governance Fundamentals',
              description: 'Essential principles of effective board governance',
              type: 'course',
              categoryId: 'governance',
              difficultyLevel: 'beginner',
              estimatedDurationHours: 4.5,
              tags: ['governance', 'fundamentals'],
              relevanceScore: 0.95,
              highlights: ['Board <mark>Governance</mark> Fundamentals']
            }
          ],
          learningPaths: type === 'course' ? [] : [
            {
              id: 'path-1',
              title: 'Board Member Onboarding',
              description: 'Complete governance training curriculum',
              type: 'learning_path',
              category: 'onboarding',
              estimatedDurationHours: 16.0,
              relevanceScore: 0.88,
              highlights: ['Board Member <mark>Governance</mark> Training']
            }
          ],
          total: 2
        }

        const allResults = [...searchResults.courses, ...searchResults.learningPaths]
        const paginatedResults = allResults.slice(offset, offset + limit)

        return Ok({
          success: true,
          data: {
            results: paginatedResults,
            pagination: {
              total: allResults.length,
              limit,
              offset,
              totalPages: Math.ceil(allResults.length / limit)
            },
            query: q,
            filters: { type, categoryId, difficultyLevel, maxDuration },
            summary: {
              totalResults: allResults.length,
              courseResults: searchResults.courses.length,
              learningPathResults: searchResults.learningPaths.length
            }
          },
          message: 'Search completed successfully'
        })
      } catch (error) {
        return Err(new Error(`Failed to search training: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }
}