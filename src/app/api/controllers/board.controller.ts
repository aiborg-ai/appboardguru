/**
 * Board Controller
 * Consolidated controller for all board governance and corporate board management features
 * Following enterprise architecture with Repository Pattern and Result<T> types
 * 
 * Consolidates board-related API routes into a single controller:
 * - Board composition and member management
 * - Meeting scheduling and agenda management
 * - Decision tracking and voting systems
 * - Committee management and oversight
 * - Governance reporting and compliance
 * - Director onboarding and offboarding
 * - Board performance evaluation
 * - Document approval workflows
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BoardRepository } from '@/lib/repositories/board.repository'
import { BoardService } from '@/lib/services/board.service'
import { GovernanceService } from '@/lib/services/governance.service'
import { NotificationService } from '@/lib/services/notification.service'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { RepositoryFactory } from '@/lib/repositories'
import { Result } from '@/lib/repositories/result'
import { createUserId, createOrganizationId, createVaultId, createAssetId, createMeetingId } from '@/lib/utils/branded-type-helpers'
import { logError, logActivity } from '@/lib/utils/logging'
import { validateRequest } from '@/lib/utils/validation'
import { withAuth } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Board Types
export interface Board {
  id?: string
  name: string
  organizationId: string
  boardType: 'main_board' | 'advisory_board' | 'subsidiary_board' | 'committee'
  status: 'active' | 'inactive' | 'dissolved' | 'transitioning'
  composition: {
    totalSeats: number
    occupiedSeats: number
    independentDirectors: number
    executiveDirectors: number
    minimumMeetings: number // per year
    termLength: number // years
  }
  governance: {
    bylaws?: string
    charter?: string
    governanceFramework: string[]
    complianceStandards: string[]
    ethicsCode?: string
  }
  committees: Array<{
    id: string
    name: string
    type: 'audit' | 'compensation' | 'governance' | 'risk' | 'strategy' | 'nominating' | 'other'
    chairId: string
    memberIds: string[]
    mandate: string
    meetingFrequency: string
    status: 'active' | 'inactive'
  }>
  settings: {
    votingThreshold: number // percentage
    quorumRequirement: number // percentage
    allowVirtualMeetings: boolean
    recordingPolicy: 'always' | 'never' | 'optional'
    conflictOfInterestPolicy: boolean
    confidentialityLevel: 'standard' | 'high' | 'maximum'
  }
  metadata: {
    createdBy: string
    establishedDate: string
    lastReviewDate?: string
    nextReviewDate?: string
    jurisdiction: string
    regulatoryBody?: string
  }
}

interface BoardMember {
  id?: string
  userId: string
  boardId: string
  role: 'chairperson' | 'vice_chair' | 'director' | 'independent_director' | 'executive_director' | 'observer'
  appointmentDate: string
  termExpiration?: string
  status: 'active' | 'inactive' | 'resigned' | 'terminated' | 'retired'
  committees: string[]
  qualifications: {
    background: string[]
    expertise: string[]
    boardExperience: number // years
    certifications: string[]
    education: string[]
  }
  compensation: {
    retainer?: number
    meetingFees?: number
    equityGrants?: Array<{
      type: 'stock' | 'options'
      amount: number
      vestingSchedule: string
      grantDate: string
    }>
  }
  performance: {
    attendanceRate?: number // percentage
    engagementScore?: number // 1-10
    lastEvaluation?: string
    evaluationNotes?: string
  }
  disclosures: {
    conflictsOfInterest: Array<{
      description: string
      disclosureDate: string
      status: 'disclosed' | 'resolved' | 'ongoing'
    }>
    otherBoards: Array<{
      organizationName: string
      role: string
      startDate: string
      endDate?: string
    }>
  }
}

interface BoardMeeting {
  id?: string
  boardId: string
  meetingType: 'regular' | 'special' | 'emergency' | 'committee' | 'annual'
  title: string
  scheduledDate: string
  duration: number // minutes
  location?: string
  virtualMeetingUrl?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  agenda: {
    items: Array<{
      id: string
      title: string
      description?: string
      presenter: string
      estimatedDuration: number // minutes
      type: 'information' | 'discussion' | 'decision' | 'approval'
      supportingDocuments?: string[]
      priority: 'low' | 'medium' | 'high' | 'urgent'
    }>
    executiveSession?: boolean
    publicSession?: boolean
  }
  attendees: Array<{
    memberId: string
    status: 'invited' | 'accepted' | 'declined' | 'tentative' | 'attended' | 'absent'
    role: 'voting' | 'non_voting' | 'observer'
    joinedAt?: string
    leftAt?: string
  }>
  decisions: Array<{
    id: string
    agendaItemId: string
    title: string
    description: string
    proposer: string
    type: 'resolution' | 'motion' | 'approval' | 'ratification'
    voting: {
      method: 'voice' | 'show_hands' | 'ballot' | 'electronic'
      votesFor: number
      votesAgainst: number
      abstentions: number
      absent: number
      result: 'passed' | 'failed' | 'deferred' | 'withdrawn'
      details: Array<{
        memberId: string
        vote: 'for' | 'against' | 'abstain' | 'absent'
        timestamp: string
      }>
    }
    followUpActions?: Array<{
      description: string
      assignee: string
      dueDate: string
      status: 'pending' | 'in_progress' | 'completed'
    }>
  }>
  minutes: {
    recorder: string
    summary: string
    keyDiscussions: string[]
    actionItems: Array<{
      description: string
      assignee: string
      dueDate: string
      status: 'pending' | 'in_progress' | 'completed'
    }>
    nextMeetingDate?: string
    approvalStatus: 'draft' | 'pending_approval' | 'approved'
    approvedBy?: string
    approvalDate?: string
  }
}

interface BoardEvaluation {
  id?: string
  boardId: string
  evaluationType: 'board_effectiveness' | 'director_performance' | 'committee_performance' | 'governance_review'
  evaluationPeriod: {
    startDate: string
    endDate: string
  }
  scope: {
    evaluateBoard: boolean
    evaluateMembers: boolean
    evaluateCommittees: boolean
    evaluateProcesses: boolean
  }
  methodology: {
    selfAssessment: boolean
    peerReview: boolean
    externalFacilitator?: string
    surveys: boolean
    interviews: boolean
  }
  metrics: Array<{
    category: string
    criteria: string
    weight: number // percentage
    score: number // 1-5 scale
    comments?: string
  }>
  findings: {
    strengths: string[]
    areasForImprovement: string[]
    recommendations: Array<{
      priority: 'high' | 'medium' | 'low'
      description: string
      implementation: string
      timeline: string
      owner: string
    }>
  }
  status: 'planned' | 'in_progress' | 'completed' | 'approved'
  conductedBy: string
  completedDate?: string
}

interface GovernancePolicy {
  id?: string
  boardId: string
  title: string
  policyType: 'governance' | 'ethics' | 'compensation' | 'audit' | 'risk' | 'disclosure' | 'nomination'
  content: string
  version: string
  effectiveDate: string
  reviewDate?: string
  nextReviewDate: string
  approvalRequired: boolean
  approvals: Array<{
    memberId: string
    approvalDate: string
    comments?: string
  }>
  applicableRoles: string[]
  relatedPolicies: string[]
  status: 'draft' | 'pending_approval' | 'approved' | 'archived'
  metadata: {
    createdBy: string
    lastModifiedBy?: string
    regulatoryRequirements: string[]
    complianceFrameworks: string[]
  }
}

// Validation Schemas
const boardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  boardType: z.enum(['main_board', 'advisory_board', 'subsidiary_board', 'committee']),
  composition: z.object({
    totalSeats: z.number().min(1).max(50),
    independentDirectors: z.number().min(0),
    executiveDirectors: z.number().min(0),
    minimumMeetings: z.number().min(1).max(52),
    termLength: z.number().min(1).max(10)
  }),
  governance: z.object({
    bylaws: z.string().optional(),
    charter: z.string().optional(),
    governanceFramework: z.array(z.string()).default([]),
    complianceStandards: z.array(z.string()).default([]),
    ethicsCode: z.string().optional()
  }),
  settings: z.object({
    votingThreshold: z.number().min(50).max(100).default(50),
    quorumRequirement: z.number().min(25).max(100).default(50),
    allowVirtualMeetings: z.boolean().default(true),
    recordingPolicy: z.enum(['always', 'never', 'optional']).default('optional'),
    conflictOfInterestPolicy: z.boolean().default(true),
    confidentialityLevel: z.enum(['standard', 'high', 'maximum']).default('standard')
  }),
  metadata: z.object({
    establishedDate: z.string().datetime(),
    jurisdiction: z.string().min(1, 'Jurisdiction is required'),
    regulatoryBody: z.string().optional()
  })
})

const boardMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  boardId: z.string().min(1, 'Board ID is required'),
  role: z.enum(['chairperson', 'vice_chair', 'director', 'independent_director', 'executive_director', 'observer']),
  appointmentDate: z.string().datetime(),
  termExpiration: z.string().datetime().optional(),
  committees: z.array(z.string()).default([]),
  qualifications: z.object({
    background: z.array(z.string()).default([]),
    expertise: z.array(z.string()).default([]),
    boardExperience: z.number().min(0).default(0),
    certifications: z.array(z.string()).default([]),
    education: z.array(z.string()).default([])
  }),
  compensation: z.object({
    retainer: z.number().min(0).optional(),
    meetingFees: z.number().min(0).optional(),
    equityGrants: z.array(z.object({
      type: z.enum(['stock', 'options']),
      amount: z.number().min(0),
      vestingSchedule: z.string(),
      grantDate: z.string().datetime()
    })).default([])
  })
})

const boardMeetingSchema = z.object({
  boardId: z.string().min(1, 'Board ID is required'),
  meetingType: z.enum(['regular', 'special', 'emergency', 'committee', 'annual']),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  scheduledDate: z.string().datetime(),
  duration: z.number().min(30).max(480), // 30 minutes to 8 hours
  location: z.string().optional(),
  virtualMeetingUrl: z.string().url().optional(),
  agenda: z.object({
    items: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      presenter: z.string(),
      estimatedDuration: z.number().min(1),
      type: z.enum(['information', 'discussion', 'decision', 'approval']),
      supportingDocuments: z.array(z.string()).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent'])
    })),
    executiveSession: z.boolean().default(false),
    publicSession: z.boolean().default(false)
  }),
  attendees: z.array(z.object({
    memberId: z.string(),
    role: z.enum(['voting', 'non_voting', 'observer'])
  }))
})

const boardEvaluationSchema = z.object({
  boardId: z.string().min(1, 'Board ID is required'),
  evaluationType: z.enum(['board_effectiveness', 'director_performance', 'committee_performance', 'governance_review']),
  evaluationPeriod: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }),
  scope: z.object({
    evaluateBoard: z.boolean(),
    evaluateMembers: z.boolean(),
    evaluateCommittees: z.boolean(),
    evaluateProcesses: z.boolean()
  }),
  methodology: z.object({
    selfAssessment: z.boolean(),
    peerReview: z.boolean(),
    externalFacilitator: z.string().optional(),
    surveys: z.boolean(),
    interviews: z.boolean()
  })
})

const governancePolicySchema = z.object({
  boardId: z.string().min(1, 'Board ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  policyType: z.enum(['governance', 'ethics', 'compensation', 'audit', 'risk', 'disclosure', 'nomination']),
  content: z.string().min(1, 'Content is required'),
  version: z.string().min(1, 'Version is required'),
  effectiveDate: z.string().datetime(),
  nextReviewDate: z.string().datetime(),
  approvalRequired: z.boolean().default(true),
  applicableRoles: z.array(z.string()).default([]),
  relatedPolicies: z.array(z.string()).default([]),
  metadata: z.object({
    regulatoryRequirements: z.array(z.string()).default([]),
    complianceFrameworks: z.array(z.string()).default([])
  })
})

export class BoardController {
  private boardService: BoardService
  private governanceService: GovernanceService
  private notificationService: NotificationService
  private analyticsService: AnalyticsService
  private repositoryFactory: RepositoryFactory

  constructor() {
    this.repositoryFactory = new RepositoryFactory(this.createSupabaseClient())
    this.boardService = new BoardService(this.repositoryFactory)
    this.governanceService = new GovernanceService(this.repositoryFactory)
    this.notificationService = new NotificationService(this.repositoryFactory)
    this.analyticsService = new AnalyticsService(this.repositoryFactory)
  }

  private createSupabaseClient() {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
  }

  /**
   * GET /api/boards
   * Retrieve boards with filtering and pagination
   */
  async getBoards(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const organizationId = url.searchParams.get('organizationId')
      const boardType = url.searchParams.get('boardType')
      const status = url.searchParams.get('status')
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const boardsResult = await this.boardService.getBoards({
        userId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
        boardType: boardType as Board['boardType'] || undefined,
        status: status as Board['status'] || undefined,
        limit,
        offset
      })

      if (!boardsResult.success) {
        return NextResponse.json(
          { success: false, error: boardsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: boardsResult.data
      })

    } catch (error) {
      logError('Boards retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Boards retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/boards
   * Create a new board
   */
  async createBoard(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, boardSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const boardData = validation.data as Board

      const boardResult = await this.boardService.createBoard({
        ...boardData,
        organizationId: createOrganizationId(boardData.organizationId),
        status: 'active',
        composition: {
          ...boardData.composition,
          occupiedSeats: 0
        },
        committees: [],
        metadata: {
          ...boardData.metadata,
          createdBy: user.id
        }
      }, createUserId(user.id))

      if (!boardResult.success) {
        return NextResponse.json(
          { success: false, error: boardResult.error },
          { status: 500 }
        )
      }

      // Initialize board governance
      await this.governanceService.initializeBoardGovernance({
        boardId: boardResult.data.id,
        organizationId: createOrganizationId(boardData.organizationId),
        createdBy: createUserId(user.id)
      })

      // Log board creation
      await logActivity({
        userId: user.id,
        action: 'board_created',
        details: {
          boardId: boardResult.data.id,
          name: boardData.name,
          boardType: boardData.boardType,
          organizationId: boardData.organizationId
        }
      })

      return NextResponse.json({
        success: true,
        data: boardResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Board creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Board creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/boards/[id]
   * Get a specific board
   */
  async getBoard(request: NextRequest, boardId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const boardResult = await this.boardService.getBoardById({
        boardId,
        userId: createUserId(user.id)
      })

      if (!boardResult.success) {
        return NextResponse.json(
          { success: false, error: boardResult.error },
          { status: boardResult.error === 'Board not found' ? 404 : 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: boardResult.data
      })

    } catch (error) {
      logError('Board retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Board retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * PUT /api/boards/[id]
   * Update a board
   */
  async updateBoard(request: NextRequest, boardId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, boardSchema.partial())
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const updateData = validation.data

      const boardResult = await this.boardService.updateBoard({
        boardId,
        userId: createUserId(user.id),
        updateData: {
          ...updateData,
          organizationId: updateData.organizationId ? createOrganizationId(updateData.organizationId) : undefined
        }
      })

      if (!boardResult.success) {
        return NextResponse.json(
          { success: false, error: boardResult.error },
          { status: boardResult.error === 'Board not found' ? 404 : 500 }
        )
      }

      // Log board update
      await logActivity({
        userId: user.id,
        action: 'board_updated',
        details: {
          boardId,
          changesCount: Object.keys(updateData).length
        }
      })

      return NextResponse.json({
        success: true,
        data: boardResult.data
      })

    } catch (error) {
      logError('Board update failed', error)
      return NextResponse.json(
        { success: false, error: 'Board update failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/boards/[id]/members
   * Add a new board member
   */
  async addBoardMember(request: NextRequest, boardId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, boardMemberSchema.omit({ boardId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const memberData = validation.data

      const memberResult = await this.boardService.addBoardMember({
        ...memberData,
        boardId,
        status: 'active',
        performance: {},
        disclosures: {
          conflictsOfInterest: [],
          otherBoards: []
        }
      }, createUserId(user.id))

      if (!memberResult.success) {
        return NextResponse.json(
          { success: false, error: memberResult.error },
          { status: 500 }
        )
      }

      // Send onboarding notifications
      await this.notificationService.sendBoardMemberOnboarding({
        boardId,
        memberId: memberResult.data.id,
        memberUserId: memberData.userId,
        role: memberData.role,
        appointmentDate: memberData.appointmentDate
      })

      // Log member addition
      await logActivity({
        userId: user.id,
        action: 'board_member_added',
        details: {
          boardId,
          memberId: memberResult.data.id,
          memberUserId: memberData.userId,
          role: memberData.role
        }
      })

      return NextResponse.json({
        success: true,
        data: memberResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Board member addition failed', error)
      return NextResponse.json(
        { success: false, error: 'Member addition failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/boards/[id]/members
   * Get board members
   */
  async getBoardMembers(request: NextRequest, boardId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const status = url.searchParams.get('status')
      const role = url.searchParams.get('role')

      const membersResult = await this.boardService.getBoardMembers({
        boardId,
        userId: createUserId(user.id),
        status: status as BoardMember['status'] || undefined,
        role: role as BoardMember['role'] || undefined
      })

      if (!membersResult.success) {
        return NextResponse.json(
          { success: false, error: membersResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: membersResult.data
      })

    } catch (error) {
      logError('Board members retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Members retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/boards/[id]/meetings
   * Schedule a new board meeting
   */
  async scheduleMeeting(request: NextRequest, boardId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, boardMeetingSchema.omit({ boardId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const meetingData = validation.data

      const meetingResult = await this.boardService.scheduleMeeting({
        ...meetingData,
        boardId,
        status: 'scheduled',
        attendees: meetingData.attendees.map(attendee => ({
          ...attendee,
          status: 'invited'
        })),
        decisions: [],
        minutes: {
          recorder: user.id,
          summary: '',
          keyDiscussions: [],
          actionItems: [],
          approvalStatus: 'draft'
        }
      }, createUserId(user.id))

      if (!meetingResult.success) {
        return NextResponse.json(
          { success: false, error: meetingResult.error },
          { status: 500 }
        )
      }

      // Send meeting invitations
      await this.notificationService.sendBoardMeetingInvitations({
        meetingId: meetingResult.data.id,
        boardId,
        meetingDetails: meetingData,
        attendeeIds: meetingData.attendees.map(a => a.memberId)
      })

      // Log meeting scheduling
      await logActivity({
        userId: user.id,
        action: 'board_meeting_scheduled',
        details: {
          boardId,
          meetingId: meetingResult.data.id,
          meetingType: meetingData.meetingType,
          scheduledDate: meetingData.scheduledDate,
          attendeesCount: meetingData.attendees.length
        }
      })

      return NextResponse.json({
        success: true,
        data: meetingResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Board meeting scheduling failed', error)
      return NextResponse.json(
        { success: false, error: 'Meeting scheduling failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/boards/[id]/meetings
   * Get board meetings
   */
  async getBoardMeetings(request: NextRequest, boardId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const status = url.searchParams.get('status')
      const meetingType = url.searchParams.get('meetingType')
      const dateFrom = url.searchParams.get('dateFrom')
      const dateTo = url.searchParams.get('dateTo')
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const meetingsResult = await this.boardService.getBoardMeetings({
        boardId,
        userId: createUserId(user.id),
        status: status as BoardMeeting['status'] || undefined,
        meetingType: meetingType as BoardMeeting['meetingType'] || undefined,
        dateFrom,
        dateTo,
        limit,
        offset
      })

      if (!meetingsResult.success) {
        return NextResponse.json(
          { success: false, error: meetingsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: meetingsResult.data
      })

    } catch (error) {
      logError('Board meetings retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Meetings retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/boards/[id]/evaluations
   * Create a new board evaluation
   */
  async createEvaluation(request: NextRequest, boardId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, boardEvaluationSchema.omit({ boardId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const evaluationData = validation.data

      const evaluationResult = await this.boardService.createEvaluation({
        ...evaluationData,
        boardId,
        metrics: [],
        findings: {
          strengths: [],
          areasForImprovement: [],
          recommendations: []
        },
        status: 'planned',
        conductedBy: user.id
      }, createUserId(user.id))

      if (!evaluationResult.success) {
        return NextResponse.json(
          { success: false, error: evaluationResult.error },
          { status: 500 }
        )
      }

      // Log evaluation creation
      await logActivity({
        userId: user.id,
        action: 'board_evaluation_created',
        details: {
          boardId,
          evaluationId: evaluationResult.data.id,
          evaluationType: evaluationData.evaluationType,
          evaluationPeriod: evaluationData.evaluationPeriod
        }
      })

      return NextResponse.json({
        success: true,
        data: evaluationResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Board evaluation creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Evaluation creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/boards/[id]/policies
   * Create a new governance policy
   */
  async createPolicy(request: NextRequest, boardId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, governancePolicySchema.omit({ boardId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const policyData = validation.data

      const policyResult = await this.governanceService.createPolicy({
        ...policyData,
        boardId,
        approvals: [],
        status: 'draft',
        metadata: {
          ...policyData.metadata,
          createdBy: user.id
        }
      }, createUserId(user.id))

      if (!policyResult.success) {
        return NextResponse.json(
          { success: false, error: policyResult.error },
          { status: 500 }
        )
      }

      // Log policy creation
      await logActivity({
        userId: user.id,
        action: 'governance_policy_created',
        details: {
          boardId,
          policyId: policyResult.data.id,
          title: policyData.title,
          policyType: policyData.policyType
        }
      })

      return NextResponse.json({
        success: true,
        data: policyResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Governance policy creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Policy creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/boards/[id]/governance
   * Get board governance information
   */
  async getGovernance(request: NextRequest, boardId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const governanceResult = await this.governanceService.getBoardGovernance({
        boardId,
        userId: createUserId(user.id)
      })

      if (!governanceResult.success) {
        return NextResponse.json(
          { success: false, error: governanceResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: governanceResult.data
      })

    } catch (error) {
      logError('Board governance retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Governance retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/boards/analytics
   * Get board analytics and insights
   */
  async getAnalytics(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const organizationId = url.searchParams.get('organizationId')
      const boardId = url.searchParams.get('boardId')
      const timeRange = url.searchParams.get('timeRange') || '12m'
      const metrics = url.searchParams.getAll('metrics')

      const analyticsResult = await this.analyticsService.getBoardAnalytics({
        userId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
        boardId,
        timeRange,
        metrics: metrics.length > 0 ? metrics : undefined
      })

      if (!analyticsResult.success) {
        return NextResponse.json(
          { success: false, error: analyticsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: analyticsResult.data
      })

    } catch (error) {
      logError('Board analytics retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Analytics retrieval failed' },
        { status: 500 }
      )
    }
  }

  private async getCurrentUser() {
    try {
      const supabase = this.createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      logError('Failed to get current user', error)
      return null
    }
  }
}

// Export controller instance
export const boardController = new BoardController()

// Route handlers for different HTTP methods and endpoints
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, {
    limit: 100, // 100 requests per minute for read operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/analytics')) {
    return await boardController.getAnalytics(request)
  } else if (pathname.includes('/governance')) {
    const boardId = pathname.split('/boards/')[1]?.split('/')[0]
    if (boardId) {
      return await boardController.getGovernance(request, boardId)
    }
  } else if (pathname.includes('/meetings')) {
    const boardId = pathname.split('/boards/')[1]?.split('/')[0]
    if (boardId) {
      return await boardController.getBoardMeetings(request, boardId)
    }
  } else if (pathname.includes('/members')) {
    const boardId = pathname.split('/boards/')[1]?.split('/')[0]
    if (boardId) {
      return await boardController.getBoardMembers(request, boardId)
    }
  } else if (pathname.includes('/boards/')) {
    const boardId = pathname.split('/boards/')[1]?.split('/')[0]
    if (boardId) {
      return await boardController.getBoard(request, boardId)
    }
  } else if (pathname.includes('/boards')) {
    return await boardController.getBoards(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for POST operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 50, // 50 requests per minute for write operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const boardId = pathname.split('/boards/')[1]?.split('/')[0]

  if (pathname.includes('/policies') && boardId) {
    return await boardController.createPolicy(request, boardId)
  } else if (pathname.includes('/evaluations') && boardId) {
    return await boardController.createEvaluation(request, boardId)
  } else if (pathname.includes('/meetings') && boardId) {
    return await boardController.scheduleMeeting(request, boardId)
  } else if (pathname.includes('/members') && boardId) {
    return await boardController.addBoardMember(request, boardId)
  } else if (pathname.includes('/boards') && !boardId) {
    return await boardController.createBoard(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for PUT operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 50,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const boardId = pathname.split('/boards/')[1]?.split('/')[0]
  
  if (!boardId) {
    return NextResponse.json(
      { success: false, error: 'Board ID required' },
      { status: 400 }
    )
  }

  return await boardController.updateBoard(request, boardId)
}