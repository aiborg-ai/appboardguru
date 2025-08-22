import { BaseService } from './base.service'
import { Result, success, failure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export interface Board {
  id: string
  name: string
  description?: string
  organization_id: string
  board_type: 'executive' | 'advisory' | 'committee' | 'governance'
  status: 'active' | 'inactive' | 'dissolved'
  meeting_frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'as_needed'
  next_meeting_date?: string
  chair_id?: string
  secretary_id?: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface BoardMember {
  id: string
  board_id: string
  user_id: string
  role: 'chair' | 'vice_chair' | 'secretary' | 'treasurer' | 'member' | 'advisor'
  status: 'active' | 'inactive' | 'resigned'
  appointed_date: string
  term_start?: string
  term_end?: string
  voting_rights: boolean
  attendance_required: boolean
  created_at: string
  updated_at: string
}

export interface BoardMeeting {
  id: string
  board_id: string
  title: string
  description?: string
  meeting_type: 'regular' | 'special' | 'emergency' | 'annual'
  scheduled_date: string
  start_time: string
  end_time?: string
  location?: string
  virtual_meeting_url?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  agenda: BoardAgendaItem[]
  minutes?: string
  resolutions: BoardResolution[]
  attendance: BoardAttendance[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface BoardAgendaItem {
  id: string
  meeting_id: string
  order: number
  title: string
  description?: string
  duration_minutes?: number
  presenter_id?: string
  item_type: 'discussion' | 'decision' | 'information' | 'presentation'
  attachments?: string[]
  status: 'pending' | 'in_progress' | 'completed' | 'deferred'
  notes?: string
}

export interface BoardResolution {
  id: string
  meeting_id: string
  title: string
  description: string
  resolution_text: string
  motion_by: string
  seconded_by?: string
  resolution_type: 'ordinary' | 'special' | 'unanimous'
  voting_results: BoardVote[]
  status: 'proposed' | 'under_discussion' | 'voted' | 'passed' | 'failed' | 'withdrawn'
  proposed_at: string
  voted_at?: string
  effective_date?: string
}

export interface BoardVote {
  id: string
  resolution_id: string
  member_id: string
  vote: 'for' | 'against' | 'abstain' | 'absent'
  vote_date: string
  notes?: string
}

export interface BoardAttendance {
  id: string
  meeting_id: string
  member_id: string
  status: 'present' | 'absent' | 'excused' | 'proxy'
  proxy_holder_id?: string
  check_in_time?: string
  check_out_time?: string
  notes?: string
}

export interface BoardCommittee {
  id: string
  board_id: string
  name: string
  description?: string
  committee_type: 'audit' | 'compensation' | 'nominating' | 'governance' | 'risk' | 'finance' | 'other'
  chair_id?: string
  members: string[]
  mandate: string
  status: 'active' | 'inactive' | 'dissolved'
  created_at: string
  updated_at: string
}

export interface BoardDocument {
  id: string
  board_id: string
  document_type: 'charter' | 'bylaws' | 'policy' | 'procedure' | 'report' | 'minutes' | 'resolution' | 'other'
  title: string
  description?: string
  file_url: string
  version: string
  effective_date?: string
  review_date?: string
  approved_by?: string
  approval_date?: string
  status: 'draft' | 'under_review' | 'approved' | 'archived'
  access_level: 'public' | 'board_only' | 'confidential'
  created_at: string
  updated_at: string
}

export interface BoardGovernance {
  id: string
  board_id: string
  governance_framework: string
  compliance_requirements: string[]
  risk_management_policies: string[]
  ethical_guidelines: string
  conflict_of_interest_policy: string
  transparency_requirements: string[]
  last_review_date: string
  next_review_date: string
  created_at: string
  updated_at: string
}

export class BoardService extends BaseService {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * Create a new board
   */
  async createBoard(boardData: Omit<Board, 'id' | 'created_at' | 'updated_at'>): Promise<Result<Board>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    // Validate board data
    const validationResult = this.validateBoardData(boardData)
    if (!validationResult.success) {
      return validationResult
    }

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('boards')
        .insert({
          ...boardData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Create default governance framework
      await this.createDefaultGovernanceFramework(data.id)

      // Log the activity
      await this.logActivity('create_board', 'board', data.id, boardData)

      return data as Board
    }, 'createBoard', boardData)
  }

  /**
   * Add member to board
   */
  async addBoardMember(
    boardId: string,
    memberData: Omit<BoardMember, 'id' | 'board_id' | 'created_at' | 'updated_at'>
  ): Promise<Result<BoardMember>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    // Check permissions
    const permissionResult = await this.checkPermissionWithContext(
      currentUserResult.data.id,
      'board',
      'manage_members',
      boardId
    )
    if (!permissionResult.success) {
      return permissionResult
    }

    return this.executeDbOperation(async () => {
      // Check if user is already a member
      const { data: existingMember } = await this.supabase
        .from('board_members')
        .select('id')
        .eq('board_id', boardId)
        .eq('user_id', memberData.user_id)
        .eq('status', 'active')
        .single()

      if (existingMember) {
        throw new Error('User is already an active member of this board')
      }

      const { data, error } = await this.supabase
        .from('board_members')
        .insert({
          board_id: boardId,
          ...memberData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Update board chair/secretary if role is assigned
      if (memberData.role === 'chair') {
        await this.supabase
          .from('boards')
          .update({ chair_id: memberData.user_id })
          .eq('id', boardId)
      } else if (memberData.role === 'secretary') {
        await this.supabase
          .from('boards')
          .update({ secretary_id: memberData.user_id })
          .eq('id', boardId)
      }

      // Log the activity
      await this.logActivity('add_board_member', 'board', boardId, {
        memberId: data.id,
        userId: memberData.user_id,
        role: memberData.role
      })

      return data as BoardMember
    }, 'addBoardMember', { boardId, memberData })
  }

  /**
   * Schedule board meeting
   */
  async scheduleBoardMeeting(
    meetingData: Omit<BoardMeeting, 'id' | 'created_at' | 'updated_at' | 'resolutions' | 'attendance'>
  ): Promise<Result<BoardMeeting>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    // Check permissions
    const permissionResult = await this.checkPermissionWithContext(
      currentUserResult.data.id,
      'board',
      'schedule_meeting',
      meetingData.board_id
    )
    if (!permissionResult.success) {
      return permissionResult
    }

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('board_meetings')
        .insert({
          ...meetingData,
          resolutions: [],
          attendance: [],
          created_by: currentUserResult.data.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Create agenda items
      if (meetingData.agenda && meetingData.agenda.length > 0) {
        await this.createAgendaItems(data.id, meetingData.agenda)
      }

      // Send meeting invitations to board members
      await this.sendMeetingInvitations(data.id)

      // Log the activity
      await this.logActivity('schedule_board_meeting', 'board_meeting', data.id, {
        boardId: meetingData.board_id,
        meetingType: meetingData.meeting_type,
        scheduledDate: meetingData.scheduled_date
      })

      return data as BoardMeeting
    }, 'scheduleBoardMeeting', meetingData)
  }

  /**
   * Record meeting attendance
   */
  async recordAttendance(
    meetingId: string,
    attendanceRecords: Omit<BoardAttendance, 'id' | 'meeting_id'>[]
  ): Promise<Result<BoardAttendance[]>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      const attendanceData = attendanceRecords.map(record => ({
        meeting_id: meetingId,
        ...record
      }))

      const { data, error } = await this.supabase
        .from('board_attendance')
        .upsert(attendanceData)
        .select()

      if (error) {
        throw error
      }

      // Log the activity
      await this.logActivity('record_attendance', 'board_meeting', meetingId, {
        attendanceCount: attendanceRecords.length
      })

      return data as BoardAttendance[]
    }, 'recordAttendance', { meetingId, recordsCount: attendanceRecords.length })
  }

  /**
   * Propose board resolution
   */
  async proposeResolution(
    resolutionData: Omit<BoardResolution, 'id' | 'voting_results' | 'status' | 'proposed_at' | 'voted_at' | 'effective_date'>
  ): Promise<Result<BoardResolution>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('board_resolutions')
        .insert({
          ...resolutionData,
          voting_results: [],
          status: 'proposed',
          proposed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Notify board members about new resolution
      await this.notifyMembersAboutResolution(data.id, 'proposed')

      // Log the activity
      await this.logActivity('propose_resolution', 'board_resolution', data.id, {
        meetingId: resolutionData.meeting_id,
        resolutionType: resolutionData.resolution_type,
        motionBy: resolutionData.motion_by
      })

      return data as BoardResolution
    }, 'proposeResolution', resolutionData)
  }

  /**
   * Vote on board resolution
   */
  async voteOnResolution(
    resolutionId: string,
    vote: 'for' | 'against' | 'abstain',
    notes?: string
  ): Promise<Result<BoardVote>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      // Verify user is a board member with voting rights
      const { data: resolution } = await this.supabase
        .from('board_resolutions')
        .select(`
          *,
          board_meetings!inner(board_id)
        `)
        .eq('id', resolutionId)
        .single()

      if (!resolution) {
        throw new Error('Resolution not found')
      }

      const { data: membership } = await this.supabase
        .from('board_members')
        .select('*')
        .eq('board_id', resolution.board_meetings.board_id)
        .eq('user_id', currentUserResult.data.id)
        .eq('status', 'active')
        .eq('voting_rights', true)
        .single()

      if (!membership) {
        throw new Error('User does not have voting rights on this board')
      }

      // Check if user has already voted
      const { data: existingVote } = await this.supabase
        .from('board_votes')
        .select('id')
        .eq('resolution_id', resolutionId)
        .eq('member_id', membership.id)
        .single()

      if (existingVote) {
        throw new Error('User has already voted on this resolution')
      }

      // Record the vote
      const { data, error } = await this.supabase
        .from('board_votes')
        .insert({
          resolution_id: resolutionId,
          member_id: membership.id,
          vote,
          vote_date: new Date().toISOString(),
          notes
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Check if all votes are in and update resolution status
      await this.checkResolutionVotingComplete(resolutionId)

      // Log the activity
      await this.logActivity('vote_on_resolution', 'board_resolution', resolutionId, {
        vote,
        memberId: membership.id
      })

      return data as BoardVote
    }, 'voteOnResolution', { resolutionId, vote })
  }

  /**
   * Create board committee
   */
  async createCommittee(
    committeeData: Omit<BoardCommittee, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Result<BoardCommittee>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    // Check permissions
    const permissionResult = await this.checkPermissionWithContext(
      currentUserResult.data.id,
      'board',
      'manage_committees',
      committeeData.board_id
    )
    if (!permissionResult.success) {
      return permissionResult
    }

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('board_committees')
        .insert({
          ...committeeData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Log the activity
      await this.logActivity('create_committee', 'board_committee', data.id, {
        boardId: committeeData.board_id,
        committeeType: committeeData.committee_type,
        membersCount: committeeData.members.length
      })

      return data as BoardCommittee
    }, 'createCommittee', committeeData)
  }

  /**
   * Upload board document
   */
  async uploadBoardDocument(
    documentData: Omit<BoardDocument, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Result<BoardDocument>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    // Check permissions
    const permissionResult = await this.checkPermissionWithContext(
      currentUserResult.data.id,
      'board',
      'manage_documents',
      documentData.board_id
    )
    if (!permissionResult.success) {
      return permissionResult
    }

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('board_documents')
        .insert({
          ...documentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Log the activity
      await this.logActivity('upload_board_document', 'board_document', data.id, {
        boardId: documentData.board_id,
        documentType: documentData.document_type,
        accessLevel: documentData.access_level
      })

      return data as BoardDocument
    }, 'uploadBoardDocument', documentData)
  }

  /**
   * Get board information
   */
  async getBoard(boardId: string): Promise<Result<Board & {
    members: BoardMember[]
    committees: BoardCommittee[]
    upcomingMeetings: BoardMeeting[]
  }>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      // Get board details
      const { data: board, error: boardError } = await this.supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single()

      if (boardError) {
        throw boardError
      }

      // Get board members
      const { data: members } = await this.supabase
        .from('board_members')
        .select('*')
        .eq('board_id', boardId)
        .eq('status', 'active')
        .order('role')

      // Get committees
      const { data: committees } = await this.supabase
        .from('board_committees')
        .select('*')
        .eq('board_id', boardId)
        .eq('status', 'active')

      // Get upcoming meetings
      const { data: upcomingMeetings } = await this.supabase
        .from('board_meetings')
        .select('*')
        .eq('board_id', boardId)
        .gte('scheduled_date', new Date().toISOString())
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true })
        .limit(5)

      return {
        ...board,
        members: members || [],
        committees: committees || [],
        upcomingMeetings: upcomingMeetings || []
      } as Board & {
        members: BoardMember[]
        committees: BoardCommittee[]
        upcomingMeetings: BoardMeeting[]
      }
    }, 'getBoard', { boardId })
  }

  /**
   * Get board meeting minutes
   */
  async getMeetingMinutes(meetingId: string): Promise<Result<BoardMeeting & {
    agenda_items: BoardAgendaItem[]
    resolutions: (BoardResolution & { votes: BoardVote[] })[]
    attendance: BoardAttendance[]
  }>> {
    return this.executeDbOperation(async () => {
      // Get meeting details
      const { data: meeting, error: meetingError } = await this.supabase
        .from('board_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      if (meetingError) {
        throw meetingError
      }

      // Get agenda items
      const { data: agendaItems } = await this.supabase
        .from('board_agenda_items')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('order')

      // Get resolutions with votes
      const { data: resolutions } = await this.supabase
        .from('board_resolutions')
        .select(`
          *,
          board_votes (*)
        `)
        .eq('meeting_id', meetingId)

      // Get attendance
      const { data: attendance } = await this.supabase
        .from('board_attendance')
        .select('*')
        .eq('meeting_id', meetingId)

      return {
        ...meeting,
        agenda_items: agendaItems || [],
        resolutions: resolutions?.map(r => ({
          ...r,
          votes: r.board_votes || []
        })) || [],
        attendance: attendance || []
      }
    }, 'getMeetingMinutes', { meetingId })
  }

  /**
   * Get board governance information
   */
  async getBoardGovernance(boardId: string): Promise<Result<BoardGovernance>> {
    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('board_governance')
        .select('*')
        .eq('board_id', boardId)
        .single()

      if (error) {
        throw error
      }

      return data as BoardGovernance
    }, 'getBoardGovernance', { boardId })
  }

  /**
   * Generate board analytics
   */
  async getBoardAnalytics(
    boardId: string,
    timeRange: { start: string, end: string }
  ): Promise<Result<{
    meetingFrequency: number
    averageAttendance: number
    resolutionStats: {
      total: number
      passed: number
      failed: number
      pending: number
    }
    memberEngagement: {
      memberId: string
      attendanceRate: number
      votingParticipation: number
    }[]
    governanceCompliance: number
  }>> {
    return this.executeDbOperation(async () => {
      // Get meetings in time range
      const { data: meetings } = await this.supabase
        .from('board_meetings')
        .select('id, status, scheduled_date')
        .eq('board_id', boardId)
        .gte('scheduled_date', timeRange.start)
        .lte('scheduled_date', timeRange.end)

      // Get resolutions in time range
      const { data: resolutions } = await this.supabase
        .from('board_resolutions')
        .select('status')
        .in('meeting_id', meetings?.map(m => m.id) || [])

      // Calculate analytics
      const meetingFrequency = meetings?.length || 0
      
      const resolutionStats = {
        total: resolutions?.length || 0,
        passed: resolutions?.filter(r => r.status === 'passed').length || 0,
        failed: resolutions?.filter(r => r.status === 'failed').length || 0,
        pending: resolutions?.filter(r => r.status === 'proposed' || r.status === 'under_discussion').length || 0
      }

      // Calculate attendance and engagement metrics
      const { data: attendance } = await this.supabase
        .from('board_attendance')
        .select('member_id, status')
        .in('meeting_id', meetings?.map(m => m.id) || [])

      const { data: votes } = await this.supabase
        .from('board_votes')
        .select('member_id, vote')
        .in('resolution_id', resolutions?.map(r => r.id) || [])

      const memberEngagement = this.calculateMemberEngagement(attendance || [], votes || [])
      const averageAttendance = this.calculateAverageAttendance(attendance || [])
      const governanceCompliance = this.calculateGovernanceCompliance(boardId, timeRange)

      return {
        meetingFrequency,
        averageAttendance,
        resolutionStats,
        memberEngagement,
        governanceCompliance
      }
    }, 'getBoardAnalytics', { boardId, timeRange })
  }

  /**
   * Private helper methods
   */
  private validateBoardData(boardData: any): Result<void> {
    if (!boardData.name || boardData.name.trim().length === 0) {
      return failure(new Error('Board name is required'))
    }

    if (!boardData.organization_id) {
      return failure(new Error('Organization ID is required'))
    }

    const validBoardTypes = ['executive', 'advisory', 'committee', 'governance']
    if (!validBoardTypes.includes(boardData.board_type)) {
      return failure(new Error('Invalid board type'))
    }

    return success(undefined)
  }

  private async createDefaultGovernanceFramework(boardId: string): Promise<void> {
    const defaultGovernance = {
      board_id: boardId,
      governance_framework: 'Standard Corporate Governance Framework',
      compliance_requirements: [
        'Annual board performance evaluation',
        'Quarterly financial review',
        'Annual compliance audit'
      ],
      risk_management_policies: [
        'Enterprise risk management policy',
        'Information security policy',
        'Financial risk policy'
      ],
      ethical_guidelines: 'Standard code of ethics and conduct',
      conflict_of_interest_policy: 'Standard conflict of interest policy',
      transparency_requirements: [
        'Public disclosure of material changes',
        'Annual governance report',
        'Board meeting minutes publication'
      ],
      last_review_date: new Date().toISOString(),
      next_review_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await this.supabase
      .from('board_governance')
      .insert(defaultGovernance)
  }

  private async createAgendaItems(meetingId: string, agendaItems: BoardAgendaItem[]): Promise<void> {
    const items = agendaItems.map(item => ({
      meeting_id: meetingId,
      ...item
    }))

    await this.supabase
      .from('board_agenda_items')
      .insert(items)
  }

  private async sendMeetingInvitations(meetingId: string): Promise<void> {
    // Get meeting details and board members
    const { data: meeting } = await this.supabase
      .from('board_meetings')
      .select(`
        *,
        boards!inner(
          id,
          board_members!inner(user_id, status)
        )
      `)
      .eq('id', meetingId)
      .single()

    if (!meeting) return

    // Send invitations to active board members
    const activeMembers = meeting.boards.board_members.filter((m: any) => m.status === 'active')
    
    for (const member of activeMembers) {
      await this.supabase
        .from('notifications')
        .insert({
          user_id: member.user_id,
          type: 'board_meeting_invitation',
          title: 'Board Meeting Invitation',
          message: `You are invited to the board meeting: ${meeting.title}`,
          data: { meetingId, scheduledDate: meeting.scheduled_date },
          created_at: new Date().toISOString()
        })
    }
  }

  private async notifyMembersAboutResolution(resolutionId: string, action: string): Promise<void> {
    // Implementation for notifying board members about resolution updates
    console.log(`Notifying members about resolution ${resolutionId} - ${action}`)
  }

  private async checkResolutionVotingComplete(resolutionId: string): Promise<void> {
    // Get resolution and voting requirements
    const { data: resolution } = await this.supabase
      .from('board_resolutions')
      .select(`
        *,
        board_meetings!inner(
          board_id,
          boards!inner(
            board_members!inner(id, voting_rights, status)
          )
        )
      `)
      .eq('id', resolutionId)
      .single()

    if (!resolution) return

    // Count eligible voters
    const eligibleVoters = resolution.board_meetings.boards.board_members.filter(
      (m: any) => m.status === 'active' && m.voting_rights
    )

    // Count votes received
    const { data: votes } = await this.supabase
      .from('board_votes')
      .select('vote')
      .eq('resolution_id', resolutionId)

    if (!votes || votes.length < eligibleVoters.length) {
      return // Voting not complete yet
    }

    // Determine voting outcome
    const forVotes = votes.filter(v => v.vote === 'for').length
    const againstVotes = votes.filter(v => v.vote === 'against').length
    const abstainVotes = votes.filter(v => v.vote === 'abstain').length

    let status: string
    let requiresUnanimous = resolution.resolution_type === 'unanimous'
    let requiresSpecial = resolution.resolution_type === 'special'

    if (requiresUnanimous && abstainVotes === 0 && againstVotes === 0 && forVotes === eligibleVoters.length) {
      status = 'passed'
    } else if (requiresSpecial && forVotes >= (eligibleVoters.length * 0.75)) {
      status = 'passed'
    } else if (!requiresUnanimous && !requiresSpecial && forVotes > againstVotes) {
      status = 'passed'
    } else {
      status = 'failed'
    }

    // Update resolution status
    await this.supabase
      .from('board_resolutions')
      .update({
        status,
        voted_at: new Date().toISOString(),
        effective_date: status === 'passed' ? new Date().toISOString() : undefined
      })
      .eq('id', resolutionId)
  }

  private calculateMemberEngagement(
    attendance: any[],
    votes: any[]
  ): { memberId: string, attendanceRate: number, votingParticipation: number }[] {
    const memberStats = new Map<string, { attended: number, total: number, votes: number, resolutions: number }>()

    // Calculate attendance
    attendance.forEach(a => {
      const stats = memberStats.get(a.member_id) || { attended: 0, total: 0, votes: 0, resolutions: 0 }
      stats.total++
      if (a.status === 'present') {
        stats.attended++
      }
      memberStats.set(a.member_id, stats)
    })

    // Calculate voting participation
    votes.forEach(v => {
      const stats = memberStats.get(v.member_id) || { attended: 0, total: 0, votes: 0, resolutions: 0 }
      stats.resolutions++
      if (v.vote !== 'absent') {
        stats.votes++
      }
      memberStats.set(v.member_id, stats)
    })

    return Array.from(memberStats.entries()).map(([memberId, stats]) => ({
      memberId,
      attendanceRate: stats.total > 0 ? (stats.attended / stats.total) * 100 : 0,
      votingParticipation: stats.resolutions > 0 ? (stats.votes / stats.resolutions) * 100 : 0
    }))
  }

  private calculateAverageAttendance(attendance: any[]): number {
    if (attendance.length === 0) return 0

    const presentCount = attendance.filter(a => a.status === 'present').length
    return (presentCount / attendance.length) * 100
  }

  private calculateGovernanceCompliance(boardId: string, timeRange: any): number {
    // Simplified compliance calculation
    // In a real implementation, this would check various compliance metrics
    return 85 // Mock compliance score
  }
}