import { BaseService } from './base.service'
import { Result, success, failure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { z } from 'zod'

// Crisis Management Types
export enum CrisisLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum CrisisStatus {
  MONITORING = 'monitoring',
  ACTIVE = 'active',
  ESCALATED = 'escalated',
  RESOLVING = 'resolving',
  RESOLVED = 'resolved',
  POST_INCIDENT = 'post_incident'
}

export enum CrisisCategory {
  OPERATIONAL = 'operational',
  FINANCIAL = 'financial',
  REGULATORY = 'regulatory',
  REPUTATIONAL = 'reputational',
  CYBERSECURITY = 'cybersecurity',
  LEGAL = 'legal',
  ENVIRONMENTAL = 'environmental',
  STRATEGIC = 'strategic'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  PHONE = 'phone',
  SLACK = 'slack',
  TEAMS = 'teams'
}

export interface CrisisIncident {
  id: string
  title: string
  description: string
  category: CrisisCategory
  level: CrisisLevel
  status: CrisisStatus
  source: string
  impact_assessment: {
    financial_impact?: number
    operational_impact?: string
    reputational_risk?: string
    regulatory_exposure?: string
    stakeholder_impact?: string[]
  }
  timeline: CrisisTimelineEvent[]
  assigned_team: string[]
  created_at: string
  updated_at: string
  resolved_at?: string
  metadata: Record<string, any>
}

export interface CrisisTimelineEvent {
  id: string
  incident_id: string
  event_type: 'detection' | 'escalation' | 'action' | 'communication' | 'decision' | 'resolution'
  title: string
  description: string
  user_id: string
  timestamp: string
  metadata: Record<string, any>
}

export interface EmergencyMeeting {
  id: string
  incident_id: string
  title: string
  type: 'emergency_board' | 'crisis_team' | 'stakeholder' | 'media'
  scheduled_at: string
  duration_minutes: number
  attendees: string[]
  meeting_link?: string
  agenda: string[]
  decisions: MeetingDecision[]
  recording_url?: string
  transcript?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
}

export interface MeetingDecision {
  id: string
  title: string
  description: string
  decision_type: 'strategic' | 'operational' | 'communication' | 'financial'
  approved_by: string[]
  implementation_timeline: string
  responsible_party: string
  status: 'pending' | 'approved' | 'rejected' | 'implemented'
  created_at: string
}

export interface CrisisCommunication {
  id: string
  incident_id: string
  communication_type: 'internal' | 'external' | 'media' | 'regulatory' | 'stakeholder'
  channel: NotificationChannel
  audience: string[]
  message_template_id?: string
  subject: string
  content: string
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'failed'
  approved_by?: string
  sent_at?: string
  delivery_stats?: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    failed: number
  }
  created_at: string
}

export interface MessageTemplate {
  id: string
  name: string
  category: CrisisCategory
  severity: CrisisLevel
  template_type: 'email' | 'sms' | 'press_release' | 'internal_memo' | 'board_notice'
  subject_template: string
  content_template: string
  variables: string[]
  approval_required: boolean
  legal_reviewed: boolean
  created_at: string
  updated_at: string
}

export interface SituationMonitor {
  id: string
  name: string
  category: CrisisCategory
  monitor_type: 'news' | 'social_media' | 'market' | 'regulatory' | 'competitor' | 'internal'
  keywords: string[]
  sources: string[]
  alert_threshold: number
  enabled: boolean
  last_scan: string
  alerts_today: number
  configuration: Record<string, any>
}

export interface CrisisAlert {
  id: string
  monitor_id: string
  alert_type: 'threshold_breach' | 'sentiment_change' | 'news_mention' | 'market_movement' | 'regulatory_update'
  severity: CrisisLevel
  title: string
  description: string
  source_url?: string
  data_snapshot: Record<string, any>
  auto_escalated: boolean
  incident_id?: string
  acknowledged_by?: string
  acknowledged_at?: string
  created_at: string
}

export interface PostIncidentAnalysis {
  id: string
  incident_id: string
  analysis_type: 'immediate' | 'comprehensive' | 'lessons_learned'
  timeline_accuracy: number
  response_effectiveness: number
  communication_quality: number
  stakeholder_satisfaction: number
  financial_impact_final: number
  key_findings: string[]
  improvement_recommendations: string[]
  training_needs: string[]
  process_changes: string[]
  responsible_for_improvements: string[]
  follow_up_date: string
  completed: boolean
  created_at: string
}

export interface CrisisSimulation {
  id: string
  name: string
  scenario_category: CrisisCategory
  scenario_description: string
  objectives: string[]
  participants: string[]
  duration_minutes: number
  scheduled_at: string
  simulation_data: {
    events: Array<{
      time_offset: number
      event_type: string
      description: string
      required_response: string
    }>
  }
  performance_metrics: {
    response_time: number
    decision_quality: number
    communication_effectiveness: number
    overall_score: number
  }
  lessons_learned: string[]
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
}

// Input Validation Schemas
const CreateIncidentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.nativeEnum(CrisisCategory),
  level: z.nativeEnum(CrisisLevel),
  source: z.string().min(1),
  impact_assessment: z.object({
    financial_impact: z.number().optional(),
    operational_impact: z.string().optional(),
    reputational_risk: z.string().optional(),
    regulatory_exposure: z.string().optional(),
    stakeholder_impact: z.array(z.string()).optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
})

const UpdateIncidentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  level: z.nativeEnum(CrisisLevel).optional(),
  status: z.nativeEnum(CrisisStatus).optional(),
  impact_assessment: z.object({
    financial_impact: z.number().optional(),
    operational_impact: z.string().optional(),
    reputational_risk: z.string().optional(),
    regulatory_exposure: z.string().optional(),
    stakeholder_impact: z.array(z.string()).optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
})

const CreateEmergencyMeetingSchema = z.object({
  incident_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  type: z.enum(['emergency_board', 'crisis_team', 'stakeholder', 'media']),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().min(15).max(480),
  attendees: z.array(z.string().uuid()).min(1),
  agenda: z.array(z.string()).optional()
})

const CreateCommunicationSchema = z.object({
  incident_id: z.string().uuid(),
  communication_type: z.enum(['internal', 'external', 'media', 'regulatory', 'stakeholder']),
  channel: z.nativeEnum(NotificationChannel),
  audience: z.array(z.string()).min(1),
  subject: z.string().min(1).max(200),
  content: z.string().min(1),
  message_template_id: z.string().uuid().optional()
})

export class CrisisManagementService extends BaseService {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * INCIDENT MANAGEMENT
   */
  
  async createIncident(data: z.infer<typeof CreateIncidentSchema>): Promise<Result<CrisisIncident>> {
    // Validate input
    const validatedData = this.validateWithContext(data, CreateIncidentSchema, 'create incident')
    if (!validatedData.success) return validatedData

    // Check permissions
    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'crisis_incidents',
      'create'
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      const incidentData = {
        ...validatedData.data,
        status: CrisisStatus.ACTIVE,
        assigned_team: [user.data.id],
        timeline: [{
          event_type: 'detection',
          title: 'Crisis Incident Created',
          description: `Incident "${validatedData.data.title}" detected and logged`,
          user_id: user.data.id,
          timestamp: new Date().toISOString(),
          metadata: { source: validatedData.data.source }
        }]
      }

      const { data: incident, error } = await this.supabase
        .from('crisis_incidents')
        .insert(incidentData)
        .select()
        .single()

      if (error) throw error

      // Auto-escalate if critical
      if (validatedData.data.level === CrisisLevel.CRITICAL) {
        await this.autoEscalateIncident(incident.id)
      }

      // Send initial notifications
      await this.sendIncidentNotifications(incident.id, 'created')

      // Log activity
      await this.logActivity('create_crisis_incident', 'crisis_incident', incident.id, {
        level: validatedData.data.level,
        category: validatedData.data.category
      })

      return incident as CrisisIncident
    }, 'createIncident')
  }

  async updateIncident(
    incidentId: string, 
    data: z.infer<typeof UpdateIncidentSchema>
  ): Promise<Result<CrisisIncident>> {
    const validatedData = this.validateWithContext(data, UpdateIncidentSchema, 'update incident')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'crisis_incidents',
      'update',
      incidentId
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      // Get current incident
      const { data: currentIncident, error: fetchError } = await this.supabase
        .from('crisis_incidents')
        .select('*')
        .eq('id', incidentId)
        .single()

      if (fetchError) throw fetchError

      // Add timeline event for changes
      const timelineEvent = {
        event_type: 'action',
        title: 'Incident Updated',
        description: this.generateUpdateDescription(currentIncident, validatedData.data),
        user_id: user.data.id,
        timestamp: new Date().toISOString(),
        metadata: { changes: validatedData.data }
      }

      const updatedTimeline = [...(currentIncident.timeline || []), timelineEvent]

      const { data: incident, error } = await this.supabase
        .from('crisis_incidents')
        .update({
          ...validatedData.data,
          timeline: updatedTimeline,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId)
        .select()
        .single()

      if (error) throw error

      // Handle status changes
      if (validatedData.data.status) {
        await this.handleStatusChange(incidentId, validatedData.data.status)
      }

      // Handle escalation
      if (validatedData.data.level === CrisisLevel.CRITICAL && currentIncident.level !== CrisisLevel.CRITICAL) {
        await this.autoEscalateIncident(incidentId)
      }

      await this.logActivity('update_crisis_incident', 'crisis_incident', incidentId)
      
      return incident as CrisisIncident
    }, 'updateIncident')
  }

  async getIncident(incidentId: string): Promise<Result<CrisisIncident>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const { data: incident, error } = await this.supabase
        .from('crisis_incidents')
        .select('*')
        .eq('id', incidentId)
        .single()

      if (error) throw error
      return incident as CrisisIncident
    }, 'getIncident')
  }

  async listIncidents(filters?: {
    status?: CrisisStatus[]
    level?: CrisisLevel[]
    category?: CrisisCategory[]
    from_date?: string
    to_date?: string
    page?: number
    limit?: number
  }): Promise<Result<{ incidents: CrisisIncident[], total: number, pagination: any }>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('crisis_incidents')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status)
      }
      if (filters?.level?.length) {
        query = query.in('level', filters.level)
      }
      if (filters?.category?.length) {
        query = query.in('category', filters.category)
      }
      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date)
      }
      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date)
      }

      // Pagination
      const page = filters?.page || 1
      const limit = filters?.limit || 20
      const from = (page - 1) * limit
      const to = from + limit - 1

      query = query.range(from, to)

      const { data: incidents, error, count } = await query

      if (error) throw error

      const paginationResult = this.createPaginationMeta(count || 0, page, limit)
      if (!paginationResult.success) throw new Error('Invalid pagination parameters')

      return {
        incidents: incidents as CrisisIncident[],
        total: count || 0,
        pagination: paginationResult.data
      }
    }, 'listIncidents')
  }

  /**
   * EMERGENCY MEETING MANAGEMENT
   */

  async scheduleEmergencyMeeting(
    data: z.infer<typeof CreateEmergencyMeetingSchema>
  ): Promise<Result<EmergencyMeeting>> {
    const validatedData = this.validateWithContext(data, CreateEmergencyMeetingSchema, 'schedule emergency meeting')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'crisis_meetings',
      'create'
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      const meetingData = {
        ...validatedData.data,
        status: 'scheduled',
        decisions: []
      }

      const { data: meeting, error } = await this.supabase
        .from('emergency_meetings')
        .insert(meetingData)
        .select()
        .single()

      if (error) throw error

      // Send calendar invites
      await this.sendMeetingInvitations(meeting.id, validatedData.data.attendees)

      // Update incident timeline
      await this.addTimelineEvent(validatedData.data.incident_id, {
        event_type: 'action',
        title: 'Emergency Meeting Scheduled',
        description: `${validatedData.data.type} meeting scheduled for ${validatedData.data.scheduled_at}`,
        user_id: user.data.id,
        timestamp: new Date().toISOString(),
        metadata: { meeting_id: meeting.id }
      })

      await this.logActivity('schedule_emergency_meeting', 'emergency_meeting', meeting.id)
      
      return meeting as EmergencyMeeting
    }, 'scheduleEmergencyMeeting')
  }

  async recordMeetingDecision(
    meetingId: string,
    decision: Omit<MeetingDecision, 'id' | 'created_at'>
  ): Promise<Result<MeetingDecision>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const decisionData = {
        ...decision,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      }

      // Get current meeting
      const { data: meeting, error: fetchError } = await this.supabase
        .from('emergency_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      if (fetchError) throw fetchError

      const updatedDecisions = [...(meeting.decisions || []), decisionData]

      const { data: updatedMeeting, error } = await this.supabase
        .from('emergency_meetings')
        .update({ decisions: updatedDecisions })
        .eq('id', meetingId)
        .select()
        .single()

      if (error) throw error

      // Add to incident timeline
      await this.addTimelineEvent(meeting.incident_id, {
        event_type: 'decision',
        title: `Decision: ${decision.title}`,
        description: decision.description,
        user_id: user.data.id,
        timestamp: new Date().toISOString(),
        metadata: { 
          meeting_id: meetingId,
          decision_type: decision.decision_type,
          responsible_party: decision.responsible_party
        }
      })

      await this.logActivity('record_meeting_decision', 'meeting_decision', decisionData.id)
      
      return decisionData
    }, 'recordMeetingDecision')
  }

  /**
   * CRISIS COMMUNICATION
   */

  async createCrisisCommunication(
    data: z.infer<typeof CreateCommunicationSchema>
  ): Promise<Result<CrisisCommunication>> {
    const validatedData = this.validateWithContext(data, CreateCommunicationSchema, 'create crisis communication')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'crisis_communications',
      'create'
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      const communicationData = {
        ...validatedData.data,
        approval_status: validatedData.data.communication_type === 'external' || 
                        validatedData.data.communication_type === 'media' ? 'pending_approval' : 'approved',
        created_at: new Date().toISOString()
      }

      const { data: communication, error } = await this.supabase
        .from('crisis_communications')
        .insert(communicationData)
        .select()
        .single()

      if (error) throw error

      // Add to incident timeline
      await this.addTimelineEvent(validatedData.data.incident_id, {
        event_type: 'communication',
        title: `${validatedData.data.communication_type} Communication Created`,
        description: `${validatedData.data.channel} communication: "${validatedData.data.subject}"`,
        user_id: user.data.id,
        timestamp: new Date().toISOString(),
        metadata: { 
          communication_id: communication.id,
          channel: validatedData.data.channel,
          audience_count: validatedData.data.audience.length
        }
      })

      // Auto-send if approved
      if (communicationData.approval_status === 'approved') {
        await this.sendCrisisCommunication(communication.id)
      }

      await this.logActivity('create_crisis_communication', 'crisis_communication', communication.id)
      
      return communication as CrisisCommunication
    }, 'createCrisisCommunication')
  }

  async approveCommunication(communicationId: string): Promise<Result<CrisisCommunication>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'crisis_communications',
      'approve',
      communicationId
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      const { data: communication, error } = await this.supabase
        .from('crisis_communications')
        .update({
          approval_status: 'approved',
          approved_by: user.data.id
        })
        .eq('id', communicationId)
        .select()
        .single()

      if (error) throw error

      // Send the communication
      await this.sendCrisisCommunication(communicationId)

      await this.logActivity('approve_crisis_communication', 'crisis_communication', communicationId)
      
      return communication as CrisisCommunication
    }, 'approveCommunication')
  }

  /**
   * REAL-TIME MONITORING
   */

  async createSituationMonitor(monitorData: Omit<SituationMonitor, 'id' | 'created_at'>): Promise<Result<SituationMonitor>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const monitor = {
        ...monitorData,
        id: crypto.randomUUID(),
        enabled: true,
        last_scan: new Date().toISOString(),
        alerts_today: 0
      }

      const { data: createdMonitor, error } = await this.supabase
        .from('situation_monitors')
        .insert(monitor)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('create_situation_monitor', 'situation_monitor', createdMonitor.id)
      
      return createdMonitor as SituationMonitor
    }, 'createSituationMonitor')
  }

  async processMonitoringAlerts(): Promise<Result<CrisisAlert[]>> {
    return this.executeDbOperation(async () => {
      const { data: monitors, error } = await this.supabase
        .from('situation_monitors')
        .select('*')
        .eq('enabled', true)

      if (error) throw error

      const alerts: CrisisAlert[] = []

      for (const monitor of monitors) {
        try {
          const monitorAlerts = await this.scanMonitor(monitor)
          alerts.push(...monitorAlerts)
        } catch (error) {
          console.error(`Failed to scan monitor ${monitor.id}:`, error)
        }
      }

      // Process high-severity alerts for auto-escalation
      for (const alert of alerts) {
        if (alert.severity === CrisisLevel.CRITICAL || alert.severity === CrisisLevel.HIGH) {
          await this.processHighSeverityAlert(alert)
        }
      }

      return alerts
    }, 'processMonitoringAlerts')
  }

  /**
   * POST-INCIDENT ANALYSIS
   */

  async createPostIncidentAnalysis(
    incidentId: string,
    analysisData: Omit<PostIncidentAnalysis, 'id' | 'incident_id' | 'created_at'>
  ): Promise<Result<PostIncidentAnalysis>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const analysis = {
        ...analysisData,
        id: crypto.randomUUID(),
        incident_id: incidentId,
        completed: false,
        created_at: new Date().toISOString()
      }

      const { data: createdAnalysis, error } = await this.supabase
        .from('post_incident_analyses')
        .insert(analysis)
        .select()
        .single()

      if (error) throw error

      // Update incident status to post-incident
      await this.updateIncident(incidentId, { status: CrisisStatus.POST_INCIDENT })

      await this.logActivity('create_post_incident_analysis', 'post_incident_analysis', createdAnalysis.id)
      
      return createdAnalysis as PostIncidentAnalysis
    }, 'createPostIncidentAnalysis')
  }

  /**
   * CRISIS SIMULATION
   */

  async createCrisisSimulation(
    simulationData: Omit<CrisisSimulation, 'id' | 'created_at'>
  ): Promise<Result<CrisisSimulation>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const simulation = {
        ...simulationData,
        id: crypto.randomUUID(),
        status: 'planned',
        created_at: new Date().toISOString()
      }

      const { data: createdSimulation, error } = await this.supabase
        .from('crisis_simulations')
        .insert(simulation)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('create_crisis_simulation', 'crisis_simulation', createdSimulation.id)
      
      return createdSimulation as CrisisSimulation
    }, 'createCrisisSimulation')
  }

  /**
   * DASHBOARD AND ANALYTICS
   */

  async getCrisisAnalytics(timeRange: {
    start_date: string
    end_date: string
  }): Promise<Result<{
    incident_summary: {
      total: number
      by_level: Record<CrisisLevel, number>
      by_category: Record<CrisisCategory, number>
      by_status: Record<CrisisStatus, number>
    }
    response_times: {
      average_detection_to_response: number
      average_resolution_time: number
      escalation_rate: number
    }
    communication_metrics: {
      total_communications: number
      approval_rate: number
      delivery_success_rate: number
    }
    training_metrics: {
      simulations_completed: number
      average_performance_score: number
      improvement_areas: string[]
    }
  }>> {
    return this.executeDbOperation(async () => {
      // Get incident statistics
      const { data: incidents, error: incidentError } = await this.supabase
        .from('crisis_incidents')
        .select('*')
        .gte('created_at', timeRange.start_date)
        .lte('created_at', timeRange.end_date)

      if (incidentError) throw incidentError

      // Get communication statistics
      const { data: communications, error: commError } = await this.supabase
        .from('crisis_communications')
        .select('*')
        .gte('created_at', timeRange.start_date)
        .lte('created_at', timeRange.end_date)

      if (commError) throw commError

      // Get simulation statistics
      const { data: simulations, error: simError } = await this.supabase
        .from('crisis_simulations')
        .select('*')
        .gte('created_at', timeRange.start_date)
        .lte('created_at', timeRange.end_date)
        .eq('status', 'completed')

      if (simError) throw simError

      // Calculate metrics
      const incident_summary = {
        total: incidents.length,
        by_level: this.groupByField(incidents, 'level'),
        by_category: this.groupByField(incidents, 'category'),
        by_status: this.groupByField(incidents, 'status')
      }

      const response_times = this.calculateResponseTimes(incidents)
      const communication_metrics = this.calculateCommunicationMetrics(communications)
      const training_metrics = this.calculateTrainingMetrics(simulations)

      return {
        incident_summary,
        response_times,
        communication_metrics,
        training_metrics
      }
    }, 'getCrisisAnalytics')
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private async autoEscalateIncident(incidentId: string): Promise<void> {
    // Get organization leadership
    const { data: leadership, error } = await this.supabase
      .from('organization_members')
      .select('user_id, role')
      .in('role', ['admin', 'board_member', 'executive'])

    if (error) {
      console.error('Failed to get leadership for escalation:', error)
      return
    }

    // Send escalation notifications
    const notifications = leadership.map(member => ({
      user_id: member.user_id,
      type: 'crisis_escalation',
      title: 'CRITICAL: Crisis Incident Escalated',
      message: `A critical crisis incident has been automatically escalated and requires immediate attention.`,
      priority: 'urgent',
      metadata: { incident_id: incidentId, escalated_at: new Date().toISOString() }
    }))

    await this.supabase.from('notifications').insert(notifications)
  }

  private async sendIncidentNotifications(incidentId: string, action: 'created' | 'updated' | 'escalated'): Promise<void> {
    // Implementation would send notifications via configured channels
    console.log(`Sending ${action} notifications for incident ${incidentId}`)
  }

  private async sendMeetingInvitations(meetingId: string, attendees: string[]): Promise<void> {
    // Implementation would send calendar invites
    console.log(`Sending meeting invitations for ${meetingId} to ${attendees.length} attendees`)
  }

  private async sendCrisisCommunication(communicationId: string): Promise<void> {
    // Implementation would send via configured channels
    console.log(`Sending crisis communication ${communicationId}`)
  }

  private async addTimelineEvent(incidentId: string, event: Omit<CrisisTimelineEvent, 'id' | 'incident_id'>): Promise<void> {
    const timelineEvent = {
      ...event,
      id: crypto.randomUUID(),
      incident_id: incidentId
    }

    const { data: incident } = await this.supabase
      .from('crisis_incidents')
      .select('timeline')
      .eq('id', incidentId)
      .single()

    if (incident) {
      const updatedTimeline = [...(incident.timeline || []), timelineEvent]
      await this.supabase
        .from('crisis_incidents')
        .update({ timeline: updatedTimeline })
        .eq('id', incidentId)
    }
  }

  private generateUpdateDescription(current: any, updates: any): string {
    const changes = []
    for (const [key, value] of Object.entries(updates)) {
      if (current[key] !== value) {
        changes.push(`${key}: ${current[key]} → ${value}`)
      }
    }
    return `Updated: ${changes.join(', ')}`
  }

  private async handleStatusChange(incidentId: string, newStatus: CrisisStatus): Promise<void> {
    if (newStatus === CrisisStatus.RESOLVED) {
      await this.supabase
        .from('crisis_incidents')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', incidentId)
    }
  }

  private async scanMonitor(monitor: SituationMonitor): Promise<CrisisAlert[]> {
    // This would implement actual monitoring logic for different sources
    // For now, return empty array as placeholder
    return []
  }

  private async processHighSeverityAlert(alert: CrisisAlert): Promise<void> {
    // Auto-escalate high severity alerts to incidents
    if (alert.severity === CrisisLevel.CRITICAL) {
      await this.createIncident({
        title: `Automated Alert: ${alert.title}`,
        description: alert.description,
        category: CrisisCategory.OPERATIONAL, // Default category
        level: alert.severity,
        source: `monitor:${alert.monitor_id}`,
        metadata: {
          alert_id: alert.id,
          auto_generated: true,
          source_data: alert.data_snapshot
        }
      })
    }
  }

  private groupByField(items: any[], field: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = item[field] || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }

  private calculateResponseTimes(incidents: any[]): any {
    // Calculate various response time metrics
    return {
      average_detection_to_response: 0, // Placeholder
      average_resolution_time: 0, // Placeholder
      escalation_rate: 0 // Placeholder
    }
  }

  private calculateCommunicationMetrics(communications: any[]): any {
    const totalComms = communications.length
    const approved = communications.filter(c => c.approval_status === 'approved').length
    const sent = communications.filter(c => c.sent_at).length

    return {
      total_communications: totalComms,
      approval_rate: totalComms > 0 ? (approved / totalComms) * 100 : 0,
      delivery_success_rate: sent > 0 ? (sent / totalComms) * 100 : 0
    }
  }

  private calculateTrainingMetrics(simulations: any[]): any {
    const totalSims = simulations.length
    const avgScore = totalSims > 0 ? 
      simulations.reduce((sum, sim) => sum + (sim.performance_metrics?.overall_score || 0), 0) / totalSims : 0

    return {
      simulations_completed: totalSims,
      average_performance_score: avgScore,
      improvement_areas: [] // Placeholder
    }
  }
}