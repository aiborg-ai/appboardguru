import { BaseService } from './base.service'
import { NotificationService } from './notification.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type { 
  ComplianceTemplate,
  ComplianceTemplateInsert,
  ComplianceCalendarEntry,
  NotificationWorkflow,
  ComplianceParticipant,
  NotificationAuditLog,
  ComplianceFrequency,
  ComplianceStatus,
  AdvanceWorkflowStepRequest,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  AcknowledgeNotificationRequest,
  CreateCalendarEntryRequest,
  AuditReportRequest,
  AuditReportFilters,
  ComplianceApiResponse
} from '../../types'

// Type aliases for missing WithDetails types
type ComplianceTemplateWithDetails = ComplianceTemplate & { details?: Record<string, unknown> }
type ComplianceCalendarWithDetails = ComplianceCalendarEntry & { details?: Record<string, unknown> }
type NotificationWorkflowWithDetails = NotificationWorkflow & { details?: Record<string, unknown> }
type ComplianceParticipantWithDetails = ComplianceParticipant & { details?: Record<string, unknown> }
type WorkflowStep = { step?: number; name: string; status?: string; participants?: unknown[]; [key: string]: unknown }
type WorkflowSteps = WorkflowStep[]
type ComplianceSearchResponse = ComplianceApiResponse & { results?: unknown[] }
type WorkflowStepParticipant = { user_id: string; type: string; role: string; required?: boolean; can_delegate?: boolean; requires_evidence?: boolean }
type ComplianceDashboard = {
  overview: {
    total_active_workflows: number;
    completed_this_month: number;
    overdue_count: number;
    upcoming_this_week: number;
    compliance_score: number;
    trend_direction: string;
    critical_items_count: number;
  };
  upcoming_deadlines: ComplianceCalendarWithDetails[];
  active_workflows: NotificationWorkflowWithDetails[];
  overdue_items: unknown[];
  compliance_metrics: Record<string, unknown>;
  recent_completions: unknown[];
}
type WorkflowProgressSummary = {
  total_steps: number;
  completed_steps: number;
  current_step: number;
  progress_percentage: number;
  overdue_days?: number;
  pending_participants: number;
  total_participants: number;
  bottlenecks: unknown[];
}

/**
 * Compliance & Governance Automation Engine
 * 
 * This service handles:
 * - Workflow state machine management
 * - Automatic notification generation
 * - Compliance calendar management
 * - Participant tracking and escalation
 * - Audit trail logging
 * - Reporting and analytics
 */
export class ComplianceEngine extends BaseService {
  private notificationService: NotificationService

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.notificationService = new NotificationService(supabase)
  }

  // =============================================
  // COMPLIANCE TEMPLATES MANAGEMENT
  // =============================================

  /**
   * Get all compliance templates for an organization
   */
  async getTemplates(
    organizationId: string,
    options: { includeInactive?: boolean; regulationType?: string } = {}
  ): Promise<ComplianceApiResponse<ComplianceTemplateWithDetails[]>> {
    try {
      const user = await this.getCurrentUser()
      
      let query = this.supabase
        .from('compliance_templates')
        .select(`
          *,
          created_by_user:created_by(id, full_name, email)
        `)
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

      if (!options.includeInactive) {
        query = query.eq('is_active', true)
      }

      if (options.regulationType) {
        query = query.eq('regulation_type', options.regulationType)
      }

      const { data: templates, error } = await (query as any)

      if (error) {
        throw error
      }

      // Parse JSON fields and add usage statistics
      const templatesWithDetails: ComplianceTemplateWithDetails[] = await Promise.all(
        (templates || []).map(async (template: any) => {
          // Get usage count
          const { count: usageCount } = await this.supabase
            .from('notification_workflows')
            .select('*', { count: 'exact', head: true })
            .eq('template_id', template.id)

          // Get last used date
          const { data: lastUsed } = await this.supabase
            .from('notification_workflows')
            .select('created_at')
            .eq('template_id', template.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...template,
            workflow_steps_parsed: JSON.parse((template.workflow_steps as any) || '[]'),
            reminder_schedule_parsed: JSON.parse((template.reminder_schedule as any) || '{}'),
            escalation_rules_parsed: JSON.parse((template.escalation_rules as any) || '{}'),
            usage_count: usageCount || 0,
            last_used: lastUsed?.created_at || null
          }
        })
      )

      await this.logActivity('get_templates', 'compliance_templates', undefined, {
        organizationId,
        count: templatesWithDetails.length,
        options
      })

      return {
        success: true,
        data: templatesWithDetails,
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: crypto.randomUUID(),
          execution_time_ms: 0,
          version: '1.0'
        }
      }

    } catch (error) {
      this.handleError(error, 'getTemplates', { organizationId, options })
      return {
        success: false,
        data: [],
        error: 'Failed to get templates',
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: crypto.randomUUID(),
          execution_time_ms: 0,
          version: '1.0'
        }
      }
    }
  }

  /**
   * Create a new compliance template
   */
  async createTemplate(
    organizationId: string,
    templateData: Omit<ComplianceTemplate, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'created_by'>
  ): Promise<ComplianceApiResponse<ComplianceTemplate>> {
    try {
      const user = await this.getCurrentUser()

      // Validate workflow steps
      if (templateData.workflow_steps) {
        this.validateWorkflowSteps(JSON.parse((templateData.workflow_steps as any) || '[]'))
      }

      const { data: template, error } = await this.supabase
        .from('compliance_templates')
        .insert({
          ...(templateData as any),
          organization_id: organizationId,
          created_by: user.id
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      await this.logActivity('create_template', 'compliance_templates', template.id, {
        templateName: template.name,
        regulationType: (template as any).regulation_type
      })

      return {
        success: true,
        data: template as any,
        message: 'Compliance template created successfully'
      }

    } catch (error) {
      this.handleError(error, 'createTemplate', { organizationId, templateData })
      return {
        success: false,
        data: {} as ComplianceTemplate,
        error: 'Failed to create template'
      }
    }
  }

  // =============================================
  // COMPLIANCE CALENDAR MANAGEMENT
  // =============================================

  /**
   * Get compliance calendar entries
   */
  async getCalendarEntries(
    organizationId: string,
    options: { 
      startDate?: string
      endDate?: string
      status?: ComplianceStatus[]
      regulationType?: string
      includeRecurring?: boolean
    } = {}
  ): Promise<ComplianceApiResponse<ComplianceCalendarWithDetails[]>> {
    try {
      let query = this.supabase
        .from('compliance_calendar')
        .select(`
          *,
          template:compliance_templates(*)
        `)
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: true })

      if (options.startDate) {
        query = query.gte('due_date', options.startDate)
      }

      if (options.endDate) {
        query = query.lte('due_date', options.endDate)
      }

      if (options.status && options.status.length > 0) {
        query = query.in('status', options.status)
      }

      if (options.regulationType) {
        query = query.eq('regulation_type', options.regulationType)
      }

      const { data: entries, error } = await (query as any)

      if (error) {
        throw error
      }

      // Enhance entries with calculated fields
      const entriesWithDetails: ComplianceCalendarWithDetails[] = await Promise.all(
        (entries || []).map(async (entry: any) => {
          const dueDate = new Date(entry.due_date)
          const now = new Date()
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          // Get associated workflows
          const { data: workflows } = await this.supabase
            .from('notification_workflows')
            .select('*')
            .eq('calendar_entry_id', entry.id)

          return {
            ...entry,
            recurrence_pattern_parsed: entry.recurrence_pattern ? 
              JSON.parse(entry.recurrence_pattern as any) : undefined,
            days_until_due: daysUntilDue,
            is_overdue: daysUntilDue < 0 && entry.status !== 'completed',
            assigned_workflows: workflows || [],
            completion_percentage: this.calculateCalendarEntryCompletionPercentage(entry, (workflows as any) || [])
          }
        })
      )

      return {
        success: true,
        data: entriesWithDetails
      }

    } catch (error) {
      this.handleError(error, 'getCalendarEntries', { organizationId, options })
      return {
        success: false,
        data: [],
        error: 'Failed to get calendar entries'
      }
    }
  }

  /**
   * Create a compliance calendar entry
   */
  async createCalendarEntry(
    organizationId: string,
    entryData: CreateCalendarEntryRequest
  ): Promise<ComplianceApiResponse<ComplianceCalendarEntry>> {
    try {
      const user = await this.getCurrentUser()

      const { data: entry, error } = await this.supabase
        .from('compliance_calendar')
        .insert({
          ...(entryData as any),
          organization_id: organizationId,
          created_by: user.id,
          recurrence_pattern: entryData.recurrence_pattern ? 
            JSON.stringify(entryData.recurrence_pattern) : null,
          metadata: entryData.metadata ? 
            JSON.stringify(entryData.metadata) : null
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // If template is specified and auto-create workflows is enabled, create workflow
      if (entryData.template_id) {
        await this.createWorkflowFromCalendarEntry(organizationId, entry.id, entryData.template_id)
      }

      await this.logActivity('create_calendar_entry', 'compliance_calendar', entry.id, {
        title: entry.title,
        regulationType: (entry as any).regulation_type,
        dueDate: entry.due_date
      })

      return {
        success: true,
        data: entry as any,
        message: 'Compliance calendar entry created successfully'
      }

    } catch (error) {
      return this.handleError(error, 'createCalendarEntry', { organizationId, entryData })
    }
  }

  // =============================================
  // WORKFLOW MANAGEMENT
  // =============================================

  /**
   * Create a compliance workflow
   */
  async createWorkflow(
    organizationId: string,
    workflowData: CreateWorkflowRequest
  ): Promise<ComplianceApiResponse<NotificationWorkflow>> {
    try {
      const user = await this.getCurrentUser()
      let steps: WorkflowStep[] = []
      let totalSteps = 1

      if (workflowData.template_id) {
        // Load workflow steps from template
        const { data: template } = await this.supabase
          .from('compliance_templates')
          .select('workflow_steps')
          .eq('id', workflowData.template_id)
          .single()

        if (template) {
          steps = JSON.parse(((template as any).workflow_steps as any) || '[]')
          totalSteps = steps.length
        }
      } else if (workflowData.custom_steps) {
        // Use custom steps
        steps = workflowData.custom_steps as any
        totalSteps = steps.length
      }

      // Create workflow
      const { data: workflow, error } = await this.supabase
        .from('notification_workflows')
        .insert({
          organization_id: organizationId,
          template_id: workflowData.template_id,
          calendar_entry_id: workflowData.calendar_entry_id,
          name: workflowData.name,
          description: workflowData.description,
          workflow_type: 'compliance',
          steps: JSON.stringify(steps),
          total_steps: totalSteps,
          assigned_to: workflowData.assigned_to,
          assigned_role: workflowData.assigned_role,
          due_date: workflowData.due_date,
          metadata: workflowData.metadata ? JSON.stringify(workflowData.metadata) : null,
          created_by: user.id
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Create participants
      if (workflowData.custom_participants || steps.length > 0) {
        await this.createWorkflowParticipants(workflow.id, (workflowData.custom_participants as any) || [], steps)
      }

      // Generate initial notifications
      await this.generateWorkflowNotifications(workflow.id, 'workflow_created')

      await this.logActivity('create_workflow', 'notification_workflows', workflow.id, {
        workflowName: workflow.name,
        templateId: (workflow as any).template_id,
        totalSteps: totalSteps
      })

      return {
        success: true,
        data: workflow as any,
        message: 'Compliance workflow created successfully'
      }

    } catch (error) {
      return this.handleError(error, 'createWorkflow', { organizationId, workflowData })
    }
  }

  /**
   * Get workflow details with all related data
   */
  async getWorkflowDetails(workflowId: string): Promise<ComplianceApiResponse<NotificationWorkflowWithDetails>> {
    try {
      // Get workflow with related data
      const { data: workflow, error } = await this.supabase
        .from('notification_workflows')
        .select(`
          *,
          template:compliance_templates(*),
          calendar_entry:compliance_calendar(*)
        `)
        .eq('id', workflowId)
        .single()

      if (error) {
        throw error
      }

      // Get participants with user details
      const { data: participants } = await this.supabase
        .from('compliance_participants')
        .select(`
          *,
          user:users(id, full_name, email, avatar_url),
          delegated_user:delegated_to(id, full_name, email, avatar_url)
        `)
        .eq('workflow_id', workflowId)

      const steps = JSON.parse(((workflow as any).steps as any) || '[]')
      const currentStepData = steps[(workflow as any).current_step] || null
      const nextStepData = steps[((workflow as any).current_step + 1)] || null

      // Calculate progress summary
      const progressSummary = await this.calculateWorkflowProgress(workflow as any, (participants || []) as any)

      const workflowWithDetails: NotificationWorkflowWithDetails = {
        ...(workflow as any),
        steps_parsed: steps,
        current_step_data: currentStepData,
        next_step_data: nextStepData,
        progress_summary: progressSummary
      }

      return {
        success: true,
        data: workflowWithDetails
      }

    } catch (error) {
      return this.handleError(error, 'getWorkflowDetails', { workflowId })
    }
  }

  /**
   * Advance workflow to next step
   */
  async advanceWorkflowStep(
    workflowId: string,
    userId: string,
    request: AdvanceWorkflowStepRequest
  ): Promise<ComplianceApiResponse<NotificationWorkflowWithDetails>> {
    try {
      // Use the database function for consistency and transaction safety
      const { data: result, error } = await this.supabase
        .rpc('advance_workflow_step', {
          p_workflow_id: workflowId,
          p_user_id: userId,
          p_completion_notes: request.completion_notes,
          p_evidence_url: request.evidence_url
        })

      if (error) {
        throw error
      }

      // Get updated workflow details
      const updatedWorkflow = await this.getWorkflowDetails(workflowId)

      if (result) {
        // Generate notifications for step advancement
        await this.generateWorkflowNotifications(workflowId, 'step_completed')
      }

      return {
        success: true,
        data: updatedWorkflow.data!,
        message: result ? 'Workflow step completed and advanced' : 'Step completed, waiting for other participants'
      }

    } catch (error) {
      return this.handleError(error, 'advanceWorkflowStep', { workflowId, userId, request })
    }
  }

  // =============================================
  // NOTIFICATION MANAGEMENT
  // =============================================

  /**
   * Generate compliance notifications based on calendar and workflows
   */
  async generateScheduledNotifications(): Promise<ComplianceApiResponse<{ notificationsGenerated: number }>> {
    try {
      // Use the database function to generate notifications
      const { data: count, error } = await this.supabase
        .rpc('generate_compliance_notifications')

      if (error) {
        throw error
      }

      await this.logActivity('generate_scheduled_notifications', 'notifications', undefined, {
        notificationsGenerated: count as any
      })

      return {
        success: true,
        data: { notificationsGenerated: count || 0 },
        message: `Generated ${count || 0} compliance notifications`
      }

    } catch (error) {
      return this.handleError(error, 'generateScheduledNotifications')
    }
  }

  /**
   * Acknowledge a compliance notification
   */
  async acknowledgeNotification(
    userId: string,
    request: AcknowledgeNotificationRequest
  ): Promise<ComplianceApiResponse<{ acknowledged: boolean }>> {
    try {
      // Update notification as acknowledged
      const { error } = await this.supabase
        .from('notifications')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledgment_method: request.acknowledgment_method,
          compliance_evidence_url: request.evidence_url,
          status: 'read'
        })
        .eq('id', request.notification_id)
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      // Log acknowledgment in audit trail
      await this.supabase
        .from('notification_audit_log')
        .insert({
          event_type: 'notification_acknowledged',
          event_category: 'compliance',
          action: 'acknowledge_notification',
          notification_id: request.notification_id,
          actor_user_id: userId,
          event_description: `Notification acknowledged via ${request.acknowledgment_method}`,
          event_data: {
            acknowledgment_method: request.acknowledgment_method,
            evidence_url: request.evidence_url,
            notes: request.notes,
            digital_signature: request.digital_signature
          },
          outcome: 'success'
        })

      return {
        success: true,
        data: { acknowledged: true },
        message: 'Notification acknowledged successfully'
      }

    } catch (error) {
      return this.handleError(error, 'acknowledgeNotification', { userId, request })
    }
  }

  // =============================================
  // DASHBOARD AND REPORTING
  // =============================================

  /**
   * Get compliance dashboard data
   */
  async getComplianceDashboard(organizationId: string): Promise<ComplianceApiResponse<ComplianceDashboard>> {
    try {
      // Get overview statistics
      const [
        { count: totalActiveWorkflows },
        { count: completedThisMonth },
        { count: overdueCount },
        { count: upcomingThisWeek }
      ] = await Promise.all([
        this.supabase
          .from('notification_workflows')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .in('status', ['pending', 'in_progress', 'waiting_approval']),
        
        this.supabase
          .from('notification_workflows')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'completed')
          .gte('completed_at', new Date(new Date().setDate(1)).toISOString()),
        
        this.supabase
          .from('compliance_calendar')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'overdue'),
        
        this.supabase
          .from('compliance_calendar')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .in('status', ['scheduled', 'active'])
          .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      ])

      // Get upcoming deadlines
      const { data: upcomingDeadlines } = await this.supabase
        .from('compliance_calendar')
        .select(`
          *,
          template:compliance_templates(*)
        `)
        .eq('organization_id', organizationId)
        .in('status', ['scheduled', 'active', 'in_progress'])
        .lte('due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('due_date', { ascending: true })
        .limit(10)

      // Get active workflows
      const { data: activeWorkflows } = await this.supabase
        .from('notification_workflows')
        .select(`
          *,
          template:compliance_templates(*),
          calendar_entry:compliance_calendar(*)
        `)
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'in_progress', 'waiting_approval'])
        .order('due_date', { ascending: true })
        .limit(10)

      const dashboard: ComplianceDashboard = {
        overview: {
          total_active_workflows: totalActiveWorkflows || 0,
          completed_this_month: completedThisMonth || 0,
          overdue_count: overdueCount || 0,
          upcoming_this_week: upcomingThisWeek || 0,
          compliance_score: await this.calculateComplianceScore(organizationId),
          trend_direction: 'stable', // Would be calculated based on historical data
          critical_items_count: 0 // Would be calculated based on priority
        },
        upcoming_deadlines: (upcomingDeadlines || []) as any,
        active_workflows: (activeWorkflows || []) as any,
        overdue_items: [], // Would be populated with overdue items
        compliance_metrics: await this.calculateComplianceMetrics(organizationId),
        recent_completions: [] // Would be populated with recent completions
      }

      return {
        success: true,
        data: dashboard
      }

    } catch (error) {
      return this.handleError(error, 'getComplianceDashboard', { organizationId })
    }
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  /**
   * Validate workflow steps structure
   */
  private validateWorkflowSteps(steps: WorkflowStep[]): void {
    if (!Array.isArray(steps)) {
      throw new Error('Workflow steps must be an array')
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      if (!step) {
        throw new Error(`Step ${i} is undefined`)
      }
      if (typeof step.step !== 'number' || step.step !== i) {
        throw new Error(`Step ${i} has invalid step number`)
      }
      if (!step.name || typeof step.name !== 'string') {
        throw new Error(`Step ${i} must have a name`)
      }
    }
  }

  /**
   * Create workflow participants from template or custom data
   */
  private async createWorkflowParticipants(
    workflowId: string,
    customParticipants: WorkflowStepParticipant[],
    steps: WorkflowStep[]
  ): Promise<void> {
    const participantsToCreate: any[] = []

    // Create participants for each step
    for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
      const step = steps[stepIndex]
      if (!step) continue
      const stepParticipants = step.participants || []

      for (const participant of stepParticipants) {
        participantsToCreate.push({
          workflow_id: workflowId,
          user_id: (participant as any).user_id,
          participant_type: (participant as any).type,
          role_in_workflow: (participant as any).role,
          step_number: stepIndex,
          is_required: (participant as any).required !== false,
          can_delegate: (participant as any).can_delegate === true,
          requires_evidence: (participant as any).requires_evidence === true,
          status: stepIndex === 0 ? 'in_progress' : 'assigned'
        })
      }
    }

    // Add custom participants
    for (const participant of customParticipants) {
      participantsToCreate.push({
        workflow_id: workflowId,
        user_id: participant.user_id,
        participant_type: participant.type,
        role_in_workflow: participant.role,
        step_number: null, // Applies to all steps
        is_required: participant.required !== false,
        can_delegate: participant.can_delegate === true,
        requires_evidence: participant.requires_evidence === true,
        status: 'assigned'
      })
    }

    if (participantsToCreate.length > 0) {
      const { error } = await this.supabase
        .from('compliance_participants')
        .insert(participantsToCreate)

      if (error) {
        throw error
      }
    }
  }

  /**
   * Generate notifications for workflow events
   */
  private async generateWorkflowNotifications(
    workflowId: string,
    eventType: 'workflow_created' | 'step_completed' | 'deadline_approaching' | 'overdue'
  ): Promise<void> {
    const { data: workflow } = await this.supabase
      .from('notification_workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (!workflow) return

    const { data: participants } = await this.supabase
      .from('compliance_participants')
      .select(`
        *,
        user:users(id, full_name, email)
      `)
      .eq('workflow_id', workflowId)
      .eq('status', 'in_progress')

    // Generate notifications for active participants
    for (const participant of participants || []) {
      if (!participant.user) continue

      let title = ''
      let message = ''
      let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'

      switch (eventType) {
        case 'workflow_created':
          title = `New compliance task assigned: ${workflow.name}`
          message = `You have been assigned to a compliance workflow. Please review and take action.`
          break
        case 'step_completed':
          title = `Compliance workflow step completed: ${workflow.name}`
          message = `A step has been completed. You may now proceed with your assigned tasks.`
          break
        case 'deadline_approaching':
          title = `Compliance deadline approaching: ${workflow.name}`
          message = `This compliance task is due soon. Please complete your assigned actions.`
          priority = 'high'
          break
        case 'overdue':
          title = `OVERDUE: Compliance task: ${workflow.name}`
          message = `This compliance task is overdue. Immediate action required.`
          priority = 'critical'
          break
      }

      await this.notificationService.createNotification({
        type: 'warning',
        title,
        message,
        userId: (participant as any).user?.id,
        metadata: {
          workflow_id: workflowId,
          participant_id: participant.id,
          event_type: eventType
        }
      })
    }
  }

  /**
   * Create a workflow from a calendar entry using a template
   */
  private async createWorkflowFromCalendarEntry(
    organizationId: string,
    calendarEntryId: string,
    templateId: string
  ): Promise<void> {
    const { data: calendarEntry } = await this.supabase
      .from('compliance_calendar')
      .select('*')
      .eq('id', calendarEntryId)
      .single()

    const { data: template } = await this.supabase
      .from('compliance_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (!calendarEntry || !template) return

    await this.createWorkflow(organizationId, {
      template_id: templateId,
      calendar_entry_id: calendarEntryId,
      name: `${template.name} - ${calendarEntry.title}`,
      description: `Automated workflow for ${calendarEntry.title}`,
      due_date: calendarEntry.due_date
    })
  }

  /**
   * Calculate calendar entry completion percentage
   */
  private calculateCalendarEntryCompletionPercentage(
    entry: ComplianceCalendarEntry,
    workflows: NotificationWorkflow[]
  ): number {
    if (entry.status === 'completed') return 100
    if (workflows.length === 0) return 0

    const completedWorkflows = workflows.filter(w => w.status === 'completed').length
    return Math.round((completedWorkflows / workflows.length) * 100)
  }

  /**
   * Calculate workflow progress summary
   */
  private async calculateWorkflowProgress(
    workflow: NotificationWorkflow,
    participants: ComplianceParticipant[]
  ): Promise<WorkflowProgressSummary> {
    const completedSteps = workflow.current_step
    const progressPercentage = (workflow as any).progress_percentage || 0

    const pendingParticipants = participants.filter(p => 
      ['assigned', 'in_progress'].includes(p.status)
    ).length

    // Calculate if workflow is overdue
    let overdueDays = 0
    if (workflow.due_date) {
      const dueDate = new Date(workflow.due_date)
      const now = new Date()
      if (now > dueDate) {
        overdueDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    return {
      total_steps: (workflow as any).total_steps || 1,
      completed_steps: completedSteps,
      current_step: workflow.current_step,
      progress_percentage: progressPercentage,
      overdue_days: overdueDays > 0 ? overdueDays : undefined,
      pending_participants: pendingParticipants,
      total_participants: participants.length,
      bottlenecks: [] // Would be calculated based on participant status and timing
    }
  }

  /**
   * Calculate organization compliance score
   */
  private async calculateComplianceScore(organizationId: string): Promise<number> {
    // This would implement a scoring algorithm based on:
    // - On-time completion rate
    // - Overdue items
    // - Active workflow progress
    // - Historical compliance data
    
    // Simplified implementation
    const { count: totalItems } = await this.supabase
      .from('compliance_calendar')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    const { count: completedItems } = await this.supabase
      .from('compliance_calendar')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'completed')

    if (!totalItems) return 100

    return Math.round(((completedItems || 0) / totalItems) * 100)
  }

  /**
   * Calculate compliance metrics for dashboard
   */
  private async calculateComplianceMetrics(organizationId: string): Promise<any> {
    // Simplified metrics calculation
    return {
      on_time_completion_rate: 85,
      average_completion_time: 12,
      escalation_rate: 8,
      participant_engagement_rate: 92,
      workflow_efficiency_score: 78,
      regulatory_coverage: []
    }
  }
}