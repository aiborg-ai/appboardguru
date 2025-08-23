import { BaseService } from './base.service'
import { Result, success, failure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { z } from 'zod'

export enum MeetingUrgency {
  IMMEDIATE = 'immediate',      // Within 1 hour
  URGENT = 'urgent',           // Within 4 hours
  HIGH = 'high',               // Within 24 hours
  STANDARD = 'standard'        // Within 48 hours
}

export enum MeetingFormat {
  VIDEO_CONFERENCE = 'video_conference',
  CONFERENCE_CALL = 'conference_call',
  IN_PERSON = 'in_person',
  HYBRID = 'hybrid'
}

export enum AttendeeStatus {
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  NO_RESPONSE = 'no_response',
  ATTENDED = 'attended',
  ABSENT = 'absent'
}

export enum MeetingStatus {
  SCHEDULING = 'scheduling',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled'
}

export interface EmergencyBoardMeeting {
  id: string
  incident_id: string
  title: string
  description: string
  urgency: MeetingUrgency
  format: MeetingFormat
  scheduled_at: string
  duration_minutes: number
  timezone: string
  meeting_link?: string
  dial_in_info?: {
    phone_numbers: string[]
    access_code: string
    moderator_code?: string
  }
  physical_location?: {
    address: string
    room: string
    building: string
  }
  agenda: AgendaItem[]
  attendees: MeetingAttendee[]
  quorum_required: number
  quorum_achieved: boolean
  status: MeetingStatus
  meeting_materials: MeetingMaterial[]
  decisions: BoardDecision[]
  action_items: ActionItem[]
  recording_info?: {
    recording_url: string
    transcript_url?: string
    recording_consent_obtained: boolean
  }
  security_settings: {
    waiting_room_enabled: boolean
    password_required: boolean
    recording_restricted: boolean
    chat_disabled: boolean
  }
  created_by: string
  created_at: string
  updated_at: string
  meeting_notes?: string
  follow_up_required: boolean
}

export interface AgendaItem {
  id: string
  order: number
  title: string
  description: string
  presenter: string
  allocated_minutes: number
  item_type: 'presentation' | 'discussion' | 'decision' | 'update' | 'vote'
  supporting_materials: string[]
  decision_required: boolean
  voting_required: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'deferred'
  actual_minutes?: number
  notes?: string
}

export interface MeetingAttendee {
  id: string
  user_id: string
  role: 'chair' | 'board_member' | 'executive' | 'advisor' | 'observer' | 'presenter'
  invitation_sent_at: string
  response_required: boolean
  status: AttendeeStatus
  responded_at?: string
  join_time?: string
  leave_time?: string
  voting_rights: boolean
  proxy_holder?: string
  meeting_materials_accessed: boolean
  pre_meeting_briefed: boolean
}

export interface MeetingMaterial {
  id: string
  title: string
  type: 'presentation' | 'document' | 'report' | 'briefing' | 'legal_document'
  file_path: string
  file_size: number
  uploaded_by: string
  uploaded_at: string
  confidentiality_level: 'public' | 'internal' | 'confidential' | 'board_only'
  access_log: MaterialAccess[]
  version: number
  is_active: boolean
}

export interface MaterialAccess {
  user_id: string
  accessed_at: string
  action: 'viewed' | 'downloaded' | 'shared'
  ip_address?: string
  duration_seconds?: number
}

export interface BoardDecision {
  id: string
  agenda_item_id?: string
  title: string
  description: string
  decision_type: 'strategic' | 'operational' | 'financial' | 'governance' | 'crisis_response'
  proposed_by: string
  decision_text: string
  voting_results?: VotingResults
  implementation_plan?: {
    responsible_party: string
    deadline: string
    milestones: string[]
    budget_required?: number
  }
  legal_review_required: boolean
  compliance_impact: string
  status: 'proposed' | 'under_discussion' | 'voted' | 'approved' | 'rejected' | 'implemented'
  created_at: string
  finalized_at?: string
}

export interface VotingResults {
  total_eligible: number
  votes_cast: number
  in_favor: number
  against: number
  abstentions: number
  absent: number
  result: 'passed' | 'failed' | 'tied' | 'pending'
  individual_votes?: Array<{
    user_id: string
    vote: 'in_favor' | 'against' | 'abstain'
    timestamp: string
  }>
  quorum_met: boolean
}

export interface ActionItem {
  id: string
  title: string
  description: string
  assigned_to: string[]
  due_date: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
  progress_percentage: number
  updates: ActionItemUpdate[]
  created_at: string
  completed_at?: string
}

export interface ActionItemUpdate {
  id: string
  user_id: string
  update_text: string
  progress_percentage: number
  timestamp: string
  attachments?: string[]
}

export interface MeetingInvitation {
  id: string
  meeting_id: string
  invitee_user_id: string
  invitation_method: 'email' | 'sms' | 'push' | 'calendar'
  sent_at: string
  opened_at?: string
  responded_at?: string
  response: AttendeeStatus
  reminder_sent: boolean
  calendar_event_created: boolean
}

export interface MeetingTemplate {
  id: string
  name: string
  description: string
  urgency: MeetingUrgency
  default_duration_minutes: number
  default_format: MeetingFormat
  agenda_template: Omit<AgendaItem, 'id' | 'status' | 'actual_minutes' | 'notes'>[]
  required_attendee_roles: string[]
  default_materials: string[]
  security_template: EmergencyBoardMeeting['security_settings']
  created_at: string
  updated_at: string
}

// Input validation schemas
const CreateEmergencyMeetingSchema = z.object({
  incident_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  urgency: z.nativeEnum(MeetingUrgency),
  format: z.nativeEnum(MeetingFormat),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().min(15).max(480).default(90),
  timezone: z.string().default('UTC'),
  attendee_user_ids: z.array(z.string().uuid()).min(1),
  agenda_items: z.array(z.object({
    title: z.string().min(1),
    description: z.string(),
    presenter: z.string().uuid(),
    allocated_minutes: z.number().min(1).max(120),
    item_type: z.enum(['presentation', 'discussion', 'decision', 'update', 'vote']),
    decision_required: z.boolean().default(false),
    voting_required: z.boolean().default(false)
  })).optional(),
  template_id: z.string().uuid().optional()
})

const UpdateMeetingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().min(15).max(480).optional(),
  status: z.nativeEnum(MeetingStatus).optional(),
  meeting_notes: z.string().optional(),
  follow_up_required: z.boolean().optional()
})

const RecordDecisionSchema = z.object({
  agenda_item_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  decision_type: z.enum(['strategic', 'operational', 'financial', 'governance', 'crisis_response']),
  decision_text: z.string().min(1),
  implementation_plan: z.object({
    responsible_party: z.string().uuid(),
    deadline: z.string().datetime(),
    milestones: z.array(z.string()),
    budget_required: z.number().optional()
  }).optional(),
  legal_review_required: z.boolean().default(false),
  compliance_impact: z.string().default('None identified')
})

export class EmergencyMeetingCoordinationService extends BaseService {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * EMERGENCY MEETING CREATION AND SCHEDULING
   */

  async scheduleEmergencyMeeting(
    data: z.infer<typeof CreateEmergencyMeetingSchema>
  ): Promise<Result<EmergencyBoardMeeting>> {
    const validatedData = this.validateWithContext(data, CreateEmergencyMeetingSchema, 'schedule emergency meeting')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'emergency_meetings',
      'create'
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      // Calculate optimal meeting time if not provided
      const scheduledAt = validatedData.data.scheduled_at || 
        await this.calculateOptimalMeetingTime(
          validatedData.data.urgency, 
          validatedData.data.attendee_user_ids
        )

      // Load template if specified
      let agendaItems = validatedData.data.agenda_items || []
      let defaultDuration = validatedData.data.duration_minutes
      let securitySettings = this.getDefaultSecuritySettings()
      
      if (validatedData.data.template_id) {
        const template = await this.loadMeetingTemplate(validatedData.data.template_id)
        if (template.success) {
          agendaItems = agendaItems.length > 0 ? agendaItems : 
            template.data.agenda_template.map((item, index) => ({
              ...item,
              id: crypto.randomUUID(),
              order: index + 1,
              status: 'pending' as const
            }))
          defaultDuration = template.data.default_duration_minutes
          securitySettings = template.data.security_template
        }
      }

      // Generate meeting credentials
      const meetingCredentials = await this.generateMeetingCredentials(validatedData.data.format)

      const meetingData: EmergencyBoardMeeting = {
        id: crypto.randomUUID(),
        incident_id: validatedData.data.incident_id,
        title: validatedData.data.title,
        description: validatedData.data.description,
        urgency: validatedData.data.urgency,
        format: validatedData.data.format,
        scheduled_at: scheduledAt,
        duration_minutes: defaultDuration,
        timezone: validatedData.data.timezone,
        ...meetingCredentials,
        agenda: agendaItems.map((item, index) => ({
          ...item,
          id: crypto.randomUUID(),
          order: index + 1,
          status: 'pending' as const,
          supporting_materials: []
        })),
        attendees: await this.createAttendeeList(validatedData.data.attendee_user_ids),
        quorum_required: await this.calculateRequiredQuorum(validatedData.data.attendee_user_ids),
        quorum_achieved: false,
        status: MeetingStatus.SCHEDULING,
        meeting_materials: [],
        decisions: [],
        action_items: [],
        security_settings: securitySettings,
        created_by: user.data.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        follow_up_required: false
      }

      const { data: meeting, error } = await this.supabase
        .from('emergency_board_meetings')
        .insert(meetingData)
        .select()
        .single()

      if (error) throw error

      // Send immediate invitations
      await this.sendMeetingInvitations(meeting.id, validatedData.data.urgency)

      // Schedule reminders
      await this.scheduleReminders(meeting.id, validatedData.data.urgency)

      // Create calendar events
      await this.createCalendarEvents(meeting.id)

      // Log activity
      await this.logActivity('schedule_emergency_meeting', 'emergency_meeting', meeting.id, {
        urgency: validatedData.data.urgency,
        attendee_count: validatedData.data.attendee_user_ids.length,
        format: validatedData.data.format
      })

      return meeting as EmergencyBoardMeeting
    }, 'scheduleEmergencyMeeting')
  }

  async updateMeeting(
    meetingId: string,
    data: z.infer<typeof UpdateMeetingSchema>
  ): Promise<Result<EmergencyBoardMeeting>> {
    const validatedData = this.validateWithContext(data, UpdateMeetingSchema, 'update meeting')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'emergency_meetings',
      'update',
      meetingId
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      const { data: meeting, error } = await this.supabase
        .from('emergency_board_meetings')
        .update({
          ...validatedData.data,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)
        .select()
        .single()

      if (error) throw error

      // Handle status changes
      if (validatedData.data.status) {
        await this.handleStatusChange(meetingId, validatedData.data.status)
      }

      // Send update notifications if meeting details changed
      if (validatedData.data.scheduled_at || validatedData.data.title) {
        await this.sendMeetingUpdateNotifications(meetingId)
      }

      await this.logActivity('update_emergency_meeting', 'emergency_meeting', meetingId)
      
      return meeting as EmergencyBoardMeeting
    }, 'updateMeeting')
  }

  /**
   * ATTENDEE MANAGEMENT
   */

  async updateAttendeeResponse(
    meetingId: string,
    userId: string,
    response: AttendeeStatus,
    proxyHolder?: string
  ): Promise<Result<MeetingAttendee>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const { data: meeting, error: fetchError } = await this.supabase
        .from('emergency_board_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      if (fetchError) throw fetchError

      // Update attendee status
      const updatedAttendees = meeting.attendees.map((attendee: MeetingAttendee) => {
        if (attendee.user_id === userId) {
          return {
            ...attendee,
            status: response,
            responded_at: new Date().toISOString(),
            proxy_holder: proxyHolder
          }
        }
        return attendee
      })

      // Check if quorum is achieved
      const acceptedAttendees = updatedAttendees.filter((a: MeetingAttendee) => 
        a.status === AttendeeStatus.ACCEPTED && a.voting_rights
      )
      const quorumAchieved = acceptedAttendees.length >= meeting.quorum_required

      const { data: updatedMeeting, error } = await this.supabase
        .from('emergency_board_meetings')
        .update({
          attendees: updatedAttendees,
          quorum_achieved: quorumAchieved,
          status: quorumAchieved ? MeetingStatus.CONFIRMED : MeetingStatus.SCHEDULING,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)
        .select()
        .single()

      if (error) throw error

      const updatedAttendee = updatedAttendees.find((a: MeetingAttendee) => a.user_id === userId)

      // Send confirmation if quorum achieved
      if (quorumAchieved && !meeting.quorum_achieved) {
        await this.sendQuorumAchievedNotification(meetingId)
      }

      await this.logActivity('update_attendee_response', 'meeting_attendee', updatedAttendee?.id, {
        meeting_id: meetingId,
        response,
        quorum_achieved: quorumAchieved
      })

      return updatedAttendee!
    }, 'updateAttendeeResponse')
  }

  async recordAttendance(
    meetingId: string,
    attendeeId: string,
    joined: boolean,
    joinTime?: string,
    leaveTime?: string
  ): Promise<Result<MeetingAttendee>> {
    return this.executeDbOperation(async () => {
      const { data: meeting, error: fetchError } = await this.supabase
        .from('emergency_board_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      if (fetchError) throw fetchError

      const updatedAttendees = meeting.attendees.map((attendee: MeetingAttendee) => {
        if (attendee.id === attendeeId) {
          return {
            ...attendee,
            status: joined ? AttendeeStatus.ATTENDED : AttendeeStatus.ABSENT,
            join_time: joinTime || new Date().toISOString(),
            leave_time: leaveTime
          }
        }
        return attendee
      })

      const { data: updatedMeeting, error } = await this.supabase
        .from('emergency_board_meetings')
        .update({
          attendees: updatedAttendees,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)
        .select()
        .single()

      if (error) throw error

      const updatedAttendee = updatedAttendees.find((a: MeetingAttendee) => a.id === attendeeId)

      await this.logActivity('record_attendance', 'meeting_attendee', attendeeId, {
        meeting_id: meetingId,
        joined,
        join_time: joinTime
      })

      return updatedAttendee!
    }, 'recordAttendance')
  }

  /**
   * DECISION RECORDING AND VOTING
   */

  async recordBoardDecision(
    meetingId: string,
    data: z.infer<typeof RecordDecisionSchema>
  ): Promise<Result<BoardDecision>> {
    const validatedData = this.validateWithContext(data, RecordDecisionSchema, 'record board decision')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const decision: BoardDecision = {
        id: crypto.randomUUID(),
        agenda_item_id: validatedData.data.agenda_item_id,
        title: validatedData.data.title,
        description: validatedData.data.description,
        decision_type: validatedData.data.decision_type,
        proposed_by: user.data.id,
        decision_text: validatedData.data.decision_text,
        implementation_plan: validatedData.data.implementation_plan,
        legal_review_required: validatedData.data.legal_review_required,
        compliance_impact: validatedData.data.compliance_impact,
        status: 'proposed',
        created_at: new Date().toISOString()
      }

      // Add decision to meeting
      const { data: meeting, error: fetchError } = await this.supabase
        .from('emergency_board_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      if (fetchError) throw fetchError

      const updatedDecisions = [...meeting.decisions, decision]

      const { data: updatedMeeting, error } = await this.supabase
        .from('emergency_board_meetings')
        .update({
          decisions: updatedDecisions,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('record_board_decision', 'board_decision', decision.id, {
        meeting_id: meetingId,
        decision_type: validatedData.data.decision_type
      })

      return decision
    }, 'recordBoardDecision')
  }

  async conductVoting(
    meetingId: string,
    decisionId: string,
    votingMethod: 'voice' | 'roll_call' | 'secret_ballot' = 'roll_call'
  ): Promise<Result<VotingResults>> {
    return this.executeDbOperation(async () => {
      const { data: meeting, error: fetchError } = await this.supabase
        .from('emergency_board_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      if (fetchError) throw fetchError

      // Get eligible voters (attendees with voting rights who are present)
      const eligibleVoters = meeting.attendees.filter((a: MeetingAttendee) => 
        a.voting_rights && (a.status === AttendeeStatus.ATTENDED || a.status === AttendeeStatus.ACCEPTED)
      )

      // Initialize voting results
      const votingResults: VotingResults = {
        total_eligible: eligibleVoters.length,
        votes_cast: 0,
        in_favor: 0,
        against: 0,
        abstentions: 0,
        absent: 0,
        result: 'pending',
        individual_votes: [],
        quorum_met: eligibleVoters.length >= meeting.quorum_required
      }

      // Update decision with voting results
      const updatedDecisions = meeting.decisions.map((decision: BoardDecision) => {
        if (decision.id === decisionId) {
          return {
            ...decision,
            voting_results: votingResults,
            status: 'voted'
          }
        }
        return decision
      })

      const { data: updatedMeeting, error } = await this.supabase
        .from('emergency_board_meetings')
        .update({
          decisions: updatedDecisions,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)
        .select()
        .single()

      if (error) throw error

      // Send voting notifications to eligible voters
      await this.sendVotingNotifications(meetingId, decisionId, eligibleVoters.map(v => v.user_id))

      await this.logActivity('conduct_voting', 'board_decision', decisionId, {
        meeting_id: meetingId,
        voting_method: votingMethod,
        eligible_voters: eligibleVoters.length
      })

      return votingResults
    }, 'conductVoting')
  }

  async recordVote(
    meetingId: string,
    decisionId: string,
    vote: 'in_favor' | 'against' | 'abstain'
  ): Promise<Result<VotingResults>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const { data: meeting, error: fetchError } = await this.supabase
        .from('emergency_board_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      if (fetchError) throw fetchError

      // Find and update the decision
      const updatedDecisions = meeting.decisions.map((decision: BoardDecision) => {
        if (decision.id === decisionId && decision.voting_results) {
          const votingResults = decision.voting_results
          
          // Remove any existing vote from this user
          const existingVoteIndex = votingResults.individual_votes?.findIndex(v => v.user_id === user.data.id) ?? -1
          if (existingVoteIndex >= 0) {
            votingResults.individual_votes!.splice(existingVoteIndex, 1)
            votingResults.votes_cast--
            // Decrement the appropriate counter based on previous vote
          }

          // Add new vote
          const newVote = {
            user_id: user.data.id,
            vote,
            timestamp: new Date().toISOString()
          }
          
          if (!votingResults.individual_votes) votingResults.individual_votes = []
          votingResults.individual_votes.push(newVote)
          
          // Update counters
          votingResults.votes_cast++
          switch (vote) {
            case 'in_favor':
              votingResults.in_favor++
              break
            case 'against':
              votingResults.against++
              break
            case 'abstain':
              votingResults.abstentions++
              break
          }

          // Determine result
          const majorityRequired = Math.floor(votingResults.total_eligible / 2) + 1
          if (votingResults.in_favor >= majorityRequired) {
            votingResults.result = 'passed'
          } else if (votingResults.against >= majorityRequired) {
            votingResults.result = 'failed'
          } else if (votingResults.votes_cast === votingResults.total_eligible) {
            votingResults.result = votingResults.in_favor === votingResults.against ? 'tied' : 
                                  votingResults.in_favor > votingResults.against ? 'passed' : 'failed'
          }

          return {
            ...decision,
            voting_results: votingResults,
            status: votingResults.result !== 'pending' ? 
              (votingResults.result === 'passed' ? 'approved' : 'rejected') : 'voted'
          }
        }
        return decision
      })

      const { error } = await this.supabase
        .from('emergency_board_meetings')
        .update({
          decisions: updatedDecisions,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)

      if (error) throw error

      const updatedDecision = updatedDecisions.find(d => d.id === decisionId)
      const votingResults = updatedDecision?.voting_results!

      await this.logActivity('record_vote', 'board_decision', decisionId, {
        meeting_id: meetingId,
        vote,
        result: votingResults.result
      })

      return votingResults
    }, 'recordVote')
  }

  /**
   * MEETING MATERIALS MANAGEMENT
   */

  async uploadMeetingMaterial(
    meetingId: string,
    materialData: {
      title: string
      type: MeetingMaterial['type']
      file_path: string
      file_size: number
      confidentiality_level: MeetingMaterial['confidentiality_level']
    }
  ): Promise<Result<MeetingMaterial>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const material: MeetingMaterial = {
        id: crypto.randomUUID(),
        title: materialData.title,
        type: materialData.type,
        file_path: materialData.file_path,
        file_size: materialData.file_size,
        uploaded_by: user.data.id,
        uploaded_at: new Date().toISOString(),
        confidentiality_level: materialData.confidentiality_level,
        access_log: [],
        version: 1,
        is_active: true
      }

      // Add material to meeting
      const { data: meeting, error: fetchError } = await this.supabase
        .from('emergency_board_meetings')
        .select('meeting_materials')
        .eq('id', meetingId)
        .single()

      if (fetchError) throw fetchError

      const updatedMaterials = [...meeting.meeting_materials, material]

      const { error } = await this.supabase
        .from('emergency_board_meetings')
        .update({
          meeting_materials: updatedMaterials,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)

      if (error) throw error

      // Notify attendees of new material
      await this.notifyAttendeesOfNewMaterial(meetingId, material)

      await this.logActivity('upload_meeting_material', 'meeting_material', material.id, {
        meeting_id: meetingId,
        material_type: materialData.type,
        confidentiality_level: materialData.confidentiality_level
      })

      return material
    }, 'uploadMeetingMaterial')
  }

  async trackMaterialAccess(
    meetingId: string,
    materialId: string,
    action: MaterialAccess['action']
  ): Promise<Result<void>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const { data: meeting, error: fetchError } = await this.supabase
        .from('emergency_board_meetings')
        .select('meeting_materials')
        .eq('id', meetingId)
        .single()

      if (fetchError) throw fetchError

      const updatedMaterials = meeting.meeting_materials.map((material: MeetingMaterial) => {
        if (material.id === materialId) {
          const accessRecord: MaterialAccess = {
            user_id: user.data.id,
            accessed_at: new Date().toISOString(),
            action
          }
          
          return {
            ...material,
            access_log: [...material.access_log, accessRecord]
          }
        }
        return material
      })

      const { error } = await this.supabase
        .from('emergency_board_meetings')
        .update({
          meeting_materials: updatedMaterials,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)

      if (error) throw error

      // Update attendee material access tracking
      await this.updateAttendeeAccessTracking(meetingId, user.data.id, true)
    }, 'trackMaterialAccess')
  }

  /**
   * HELPER METHODS
   */

  private async calculateOptimalMeetingTime(
    urgency: MeetingUrgency,
    attendeeIds: string[]
  ): Promise<string> {
    const now = new Date()
    let meetingTime: Date

    switch (urgency) {
      case MeetingUrgency.IMMEDIATE:
        meetingTime = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
        break
      case MeetingUrgency.URGENT:
        meetingTime = new Date(now.getTime() + 4 * 60 * 60 * 1000) // 4 hours from now
        break
      case MeetingUrgency.HIGH:
        meetingTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
        break
      case MeetingUrgency.STANDARD:
        meetingTime = new Date(now.getTime() + 48 * 60 * 60 * 1000) // 48 hours from now
        break
    }

    // TODO: Implement calendar availability checking for optimal time
    return meetingTime.toISOString()
  }

  private async generateMeetingCredentials(format: MeetingFormat): Promise<Partial<EmergencyBoardMeeting>> {
    const credentials: Partial<EmergencyBoardMeeting> = {}

    switch (format) {
      case MeetingFormat.VIDEO_CONFERENCE:
        credentials.meeting_link = `https://meet.boardguru.com/${crypto.randomUUID()}`
        break
      
      case MeetingFormat.CONFERENCE_CALL:
      case MeetingFormat.HYBRID:
        credentials.dial_in_info = {
          phone_numbers: ['+1-555-0123'],
          access_code: Math.random().toString().substr(2, 6),
          moderator_code: Math.random().toString().substr(2, 6)
        }
        if (format === MeetingFormat.HYBRID) {
          credentials.meeting_link = `https://meet.boardguru.com/${crypto.randomUUID()}`
        }
        break
    }

    return credentials
  }

  private async createAttendeeList(userIds: string[]): Promise<MeetingAttendee[]> {
    const { data: users, error } = await this.supabase
      .from('organization_members')
      .select('user_id, role')
      .in('user_id', userIds)

    if (error) throw error

    return users.map(user => ({
      id: crypto.randomUUID(),
      user_id: user.user_id,
      role: this.mapRoleToMeetingRole(user.role),
      invitation_sent_at: new Date().toISOString(),
      response_required: true,
      status: AttendeeStatus.INVITED,
      voting_rights: this.hasVotingRights(user.role),
      meeting_materials_accessed: false,
      pre_meeting_briefed: false
    }))
  }

  private async calculateRequiredQuorum(userIds: string[]): Promise<number> {
    // Calculate quorum as simple majority of voting members
    const { data: members, error } = await this.supabase
      .from('organization_members')
      .select('role')
      .in('user_id', userIds)

    if (error) return Math.ceil(userIds.length / 2)

    const votingMembers = members.filter(m => this.hasVotingRights(m.role)).length
    return Math.ceil(votingMembers / 2)
  }

  private getDefaultSecuritySettings(): EmergencyBoardMeeting['security_settings'] {
    return {
      waiting_room_enabled: true,
      password_required: true,
      recording_restricted: true,
      chat_disabled: false
    }
  }

  private mapRoleToMeetingRole(orgRole: string): MeetingAttendee['role'] {
    switch (orgRole) {
      case 'board_chair': return 'chair'
      case 'board_member': return 'board_member'
      case 'ceo':
      case 'coo':
      case 'cfo': return 'executive'
      case 'advisor': return 'advisor'
      default: return 'observer'
    }
  }

  private hasVotingRights(role: string): boolean {
    return ['board_chair', 'board_member'].includes(role)
  }

  private async loadMeetingTemplate(templateId: string): Promise<Result<MeetingTemplate>> {
    return this.executeDbOperation(async () => {
      const { data: template, error } = await this.supabase
        .from('meeting_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) throw error
      return template as MeetingTemplate
    }, 'loadMeetingTemplate')
  }

  private async sendMeetingInvitations(meetingId: string, urgency: MeetingUrgency): Promise<void> {
    // Implementation would send actual invitations via configured channels
    console.log(`Sending ${urgency} meeting invitations for ${meetingId}`)
  }

  private async scheduleReminders(meetingId: string, urgency: MeetingUrgency): Promise<void> {
    // Implementation would schedule reminder notifications
    console.log(`Scheduling reminders for ${urgency} meeting ${meetingId}`)
  }

  private async createCalendarEvents(meetingId: string): Promise<void> {
    // Implementation would create calendar events for attendees
    console.log(`Creating calendar events for meeting ${meetingId}`)
  }

  private async handleStatusChange(meetingId: string, newStatus: MeetingStatus): Promise<void> {
    if (newStatus === MeetingStatus.IN_PROGRESS) {
      // Start meeting - send join notifications
      await this.sendMeetingStartNotifications(meetingId)
    } else if (newStatus === MeetingStatus.COMPLETED) {
      // End meeting - generate summary and action items
      await this.generateMeetingSummary(meetingId)
    }
  }

  private async sendMeetingUpdateNotifications(meetingId: string): Promise<void> {
    console.log(`Sending update notifications for meeting ${meetingId}`)
  }

  private async sendQuorumAchievedNotification(meetingId: string): Promise<void> {
    console.log(`Sending quorum achieved notification for meeting ${meetingId}`)
  }

  private async sendVotingNotifications(meetingId: string, decisionId: string, voterIds: string[]): Promise<void> {
    const notifications = voterIds.map(userId => ({
      user_id: userId,
      type: 'voting_request',
      title: 'Board Vote Required',
      message: 'Your vote is required on a board decision.',
      priority: 'urgent',
      metadata: { meeting_id: meetingId, decision_id: decisionId }
    }))

    await this.supabase.from('notifications').insert(notifications)
  }

  private async notifyAttendeesOfNewMaterial(meetingId: string, material: MeetingMaterial): Promise<void> {
    const { data: meeting } = await this.supabase
      .from('emergency_board_meetings')
      .select('attendees')
      .eq('id', meetingId)
      .single()

    if (meeting) {
      const notifications = meeting.attendees.map((attendee: MeetingAttendee) => ({
        user_id: attendee.user_id,
        type: 'meeting_material',
        title: 'New Meeting Material Available',
        message: `New material "${material.title}" has been uploaded for the meeting.`,
        priority: 'medium',
        metadata: { meeting_id: meetingId, material_id: material.id }
      }))

      await this.supabase.from('notifications').insert(notifications)
    }
  }

  private async updateAttendeeAccessTracking(meetingId: string, userId: string, accessed: boolean): Promise<void> {
    const { data: meeting } = await this.supabase
      .from('emergency_board_meetings')
      .select('attendees')
      .eq('id', meetingId)
      .single()

    if (meeting) {
      const updatedAttendees = meeting.attendees.map((attendee: MeetingAttendee) => {
        if (attendee.user_id === userId) {
          return { ...attendee, meeting_materials_accessed: accessed }
        }
        return attendee
      })

      await this.supabase
        .from('emergency_board_meetings')
        .update({ attendees: updatedAttendees })
        .eq('id', meetingId)
    }
  }

  private async sendMeetingStartNotifications(meetingId: string): Promise<void> {
    console.log(`Sending meeting start notifications for ${meetingId}`)
  }

  private async generateMeetingSummary(meetingId: string): Promise<void> {
    console.log(`Generating meeting summary for ${meetingId}`)
  }
}