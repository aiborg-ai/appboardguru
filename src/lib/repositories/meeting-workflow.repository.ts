import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import {
  QueryOptions,
  PaginatedResult,
  UserId,
  OrganizationId,
  MeetingId,
  MeetingWorkflowId,
  WorkflowTransitionId,
  createMeetingWorkflowId,
  createWorkflowTransitionId
} from './types'
import { Database } from '../../types/database'
import { 
  MeetingWorkflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowTransition,
  WorkflowType,
  WorkflowStage,
  WorkflowStatus,
  WorkflowFilters,
  WorkflowEfficiencyMetrics,
  RobertsRulesCompliance
} from '../../types/advanced-voting'

// Database types from schema
type MeetingWorkflowRow = Database['public']['Tables']['meeting_workflows']['Row']
type MeetingWorkflowInsert = Database['public']['Tables']['meeting_workflows']['Insert']
type MeetingWorkflowUpdate = Database['public']['Tables']['meeting_workflows']['Update']
type WorkflowTransitionRow = Database['public']['Tables']['meeting_workflow_transitions']['Row']
type WorkflowTransitionInsert = Database['public']['Tables']['meeting_workflow_transitions']['Insert']

// Extended interfaces for repository operations
export interface WorkflowWithTransitions extends MeetingWorkflow {
  transitions: WorkflowTransition[]
  averageStageTime: Record<WorkflowStage, number>
  stageCompletionRate: number
}

export interface WorkflowAutomationRule {
  readonly id: string
  readonly workflowId: MeetingWorkflowId
  readonly fromStage: WorkflowStage
  readonly toStage: WorkflowStage
  readonly conditions: Record<string, unknown>
  readonly autoExecute: boolean
  readonly requiresApproval: boolean
  readonly approvalRoles: readonly string[]
  readonly timeoutMinutes?: number
}

export interface StageExecutionContext {
  readonly workflowId: MeetingWorkflowId
  readonly currentStage: WorkflowStage
  readonly nextStage: WorkflowStage
  readonly triggeredBy: UserId
  readonly conditions: Record<string, unknown>
  readonly requiresApproval: boolean
  readonly timeoutAt?: string
}

export class MeetingWorkflowRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'MeetingWorkflow'
  }

  protected getSearchFields(): string[] {
    return ['workflow_name', 'workflow_description']
  }

  protected getTableName(): string {
    return 'meeting_workflows'
  }

  // ============================================================================
  // WORKFLOW MANAGEMENT OPERATIONS
  // ============================================================================

  /**
   * Create a new meeting workflow
   */
  async createWorkflow(request: CreateWorkflowRequest): Promise<Result<MeetingWorkflow>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Validate required fields
      const validationResult = this.validateRequired(request, ['meetingId', 'workflowType'])
      if (!validationResult.success) return validationResult

      // Check meeting access
      const meetingResult = await this.getMeetingWithOrgCheck(request.meetingId, userId)
      if (!meetingResult.success) return meetingResult

      return await this.withTransaction([
        async () => {
          // Check for existing workflow for this meeting
          const existingResult = await this.findByMeetingId(request.meetingId)
          if (existingResult.success) {
            return failure(RepositoryError.conflict(
              'workflow',
              'Meeting already has an active workflow',
              { existingWorkflowId: existingResult.data.id }
            ))
          }

          // Set default stage sequence based on workflow type
          const defaultStageSequence = this.getDefaultStageSequence(request.workflowType)
          
          const workflowData: MeetingWorkflowInsert = {
            meeting_id: request.meetingId,
            workflow_type: request.workflowType,
            workflow_name: request.workflowName || this.getDefaultWorkflowName(request.workflowType),
            workflow_description: request.workflowDescription,
            current_stage: 'pre_meeting',
            status: 'not_started',
            progress_percentage: 0,
            stages_completed: [],
            stages_sequence: request.stagesSequence || defaultStageSequence,
            current_stage_index: 0,
            auto_progression: request.autoProgression || false,
            require_chair_approval: request.requireChairApproval !== false, // Default true
            stage_time_limits: request.stageTimeLimits || {},
            initiated_by: userId,
            current_controller: userId,
            quorum_required: request.quorumRequired,
            quorum_achieved: false,
            attendance_count: 0,
            active_voting_session: false,
            roberts_rules_enabled: request.robertsRulesEnabled !== false, // Default true
            point_of_order_raised: false,
            speaking_order: [],
            allow_late_arrivals: request.allowLateArrivals !== false, // Default true
            require_unanimous_consent: request.requireUnanimousConsent || false,
            enable_executive_session: request.enableExecutiveSession !== false, // Default true
            error_state: false,
            recovery_attempted: false
          }

          const { data: workflow, error } = await this.supabase
            .from('meeting_workflows')
            .insert(workflowData)
            .select()
            .single()

          if (error) {
            throw RepositoryError.fromSupabaseError(error, 'create workflow')
          }

          // Create initial transition record
          await this.createTransition({
            workflowId: workflow.id,
            meetingId: request.meetingId,
            fromStage: undefined,
            toStage: 'pre_meeting',
            transitionType: 'automatic',
            triggeredBy: userId,
            conditions: { reason: 'workflow_initialized' },
            context: { workflowType: request.workflowType }
          })

          // Log workflow creation
          await this.logActivity({
            user_id: userId,
            organization_id: meetingResult.data.organization_id,
            event_type: 'workflow.created',
            event_category: 'governance',
            action: 'create',
            resource_type: 'meeting_workflow',
            resource_id: workflow.id,
            event_description: `Created ${request.workflowType} workflow`,
            outcome: 'success',
            severity: 'medium',
            details: {
              meeting_id: request.meetingId,
              workflow_type: request.workflowType,
              auto_progression: request.autoProgression,
              roberts_rules_enabled: request.robertsRulesEnabled
            }
          })

          return success(this.transformWorkflowToDomain(workflow))
        }
      ])
        .then(results => results.success ? success(results.data[0]) : results)
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to create workflow', error))
    }
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(
    workflowId: MeetingWorkflowId,
    updates: UpdateWorkflowRequest
  ): Promise<Result<MeetingWorkflow>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Get current workflow
      const currentResult = await this.findById(workflowId)
      if (!currentResult.success) return currentResult

      const current = currentResult.data

      // Check permissions
      const meetingResult = await this.getMeetingWithOrgCheck(current.meetingId, userId)
      if (!meetingResult.success) return meetingResult

      // Validate permissions (current controller or meeting organizer)
      if (current.currentController !== userId && meetingResult.data.created_by !== userId) {
        const permissionResult = await this.checkOrganizationPermission(
          userId,
          meetingResult.data.organization_id,
          ['admin', 'owner']
        )
        if (!permissionResult.success) return permissionResult
      }

      return await this.withTransaction([
        async () => {
          const updateData: MeetingWorkflowUpdate = {
            ...updates,
            updated_at: new Date().toISOString()
          }

          // Handle stage transitions
          if (updates.currentStage && updates.currentStage !== current.currentStage) {
            const transitionResult = await this.validateStageTransition(
              current,
              updates.currentStage
            )
            if (!transitionResult.success) return transitionResult

            // Update stage-related fields
            updateData.current_stage_index = current.stagesSequence.indexOf(updates.currentStage)
            updateData.stages_completed = [...current.stagesCompleted, current.currentStage]
            updateData.stage_started_at = new Date().toISOString()
            updateData.progress_percentage = Math.round(
              ((updateData.current_stage_index + 1) / current.stagesSequence.length) * 100
            )

            // Create transition record
            await this.createTransition({
              workflowId,
              meetingId: current.meetingId,
              fromStage: current.currentStage,
              toStage: updates.currentStage,
              transitionType: 'manual',
              triggeredBy: userId,
              conditions: { manual_transition: true },
              context: updates
            })
          }

          // Handle workflow completion
          if (updates.status === 'completed' && current.status !== 'completed') {
            updateData.workflow_completed_at = new Date().toISOString()
            updateData.actual_completion = new Date().toISOString()
          }

          // Handle error states
          if (updates.errorState && !current.errorState) {
            updateData.last_error_at = new Date().toISOString()
            updateData.recovery_attempted = false
          }

          // Remove undefined values
          Object.keys(updateData).forEach(key => {
            if (updateData[key as keyof typeof updateData] === undefined) {
              delete updateData[key as keyof typeof updateData]
            }
          })

          const { data: workflow, error } = await this.supabase
            .from('meeting_workflows')
            .update(updateData)
            .eq('id', workflowId)
            .select()
            .single()

          if (error) {
            throw RepositoryError.fromSupabaseError(error, 'update workflow')
          }

          // Log workflow update
          await this.logActivity({
            user_id: userId,
            organization_id: meetingResult.data.organization_id,
            event_type: 'workflow.updated',
            event_category: 'governance',
            action: 'update',
            resource_type: 'meeting_workflow',
            resource_id: workflowId,
            event_description: updates.currentStage 
              ? `Transitioned to stage: ${updates.currentStage}`
              : 'Updated workflow',
            outcome: 'success',
            severity: 'low',
            details: {
              changes: updates,
              previous_stage: current.currentStage,
              new_stage: updates.currentStage
            }
          })

          return success(this.transformWorkflowToDomain(workflow))
        }
      ])
        .then(results => results.success ? success(results.data[0]) : results)
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to update workflow', error))
    }
  }

  /**
   * Execute stage transition with automation rules
   */
  async executeStageTransition(
    context: StageExecutionContext
  ): Promise<Result<{ workflow: MeetingWorkflow; transition: WorkflowTransition }>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Get current workflow
      const workflowResult = await this.findById(context.workflowId)
      if (!workflowResult.success) return workflowResult

      const workflow = workflowResult.data

      // Validate transition is allowed
      const transitionValidation = await this.validateStageTransition(workflow, context.nextStage)
      if (!transitionValidation.success) return transitionValidation

      // Check automation rules
      const automationRules = await this.getAutomationRules(
        context.workflowId,
        context.currentStage,
        context.nextStage
      )

      // Evaluate conditions for automated transition
      const conditionsResult = await this.evaluateTransitionConditions(
        workflow,
        context.nextStage,
        context.conditions
      )
      if (!conditionsResult.success) return conditionsResult

      return await this.withTransaction([
        async () => {
          // Update workflow stage
          const updateResult = await this.updateWorkflow(context.workflowId, {
            currentStage: context.nextStage,
            currentController: context.triggeredBy
          })
          if (!updateResult.success) return updateResult

          // Create transition record with approval tracking
          const transition = await this.createTransition({
            workflowId: context.workflowId,
            meetingId: workflow.meetingId,
            fromStage: context.currentStage,
            toStage: context.nextStage,
            transitionType: automationRules.length > 0 ? 'automatic' : 'manual',
            triggeredBy: context.triggeredBy,
            conditions: context.conditions,
            context: { automation_rules: automationRules.length },
            requiresApproval: context.requiresApproval,
            timeoutAt: context.timeoutAt
          })

          // Handle Robert's Rules compliance
          if (workflow.robertsRulesEnabled) {
            await this.checkRobertsRulesCompliance(workflow, context.nextStage)
          }

          // Set up stage timeout if specified
          if (context.timeoutAt) {
            await this.scheduleStageTimeout(context.workflowId, context.timeoutAt)
          }

          return success({
            workflow: updateResult.data,
            transition
          })
        }
      ])
        .then(results => results.success ? success(results.data[0]) : results)
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to execute stage transition', error))
    }
  }

  /**
   * Find workflows with filters
   */
  async findWorkflowsWithFilters(
    filters: WorkflowFilters,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<MeetingWorkflow>>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      let query = this.supabase
        .from('meeting_workflows')
        .select('*', { count: 'exact' })

      // Apply filters
      if (filters.meetingId) {
        const meetingResult = await this.getMeetingWithOrgCheck(filters.meetingId, userId)
        if (!meetingResult.success) return meetingResult
        
        query = query.eq('meeting_id', filters.meetingId)
      } else {
        // Apply organization filter if no specific meeting
        query = this.applyOrganizationFilter(query, userId)
      }

      if (filters.workflowType) {
        query = query.eq('workflow_type', filters.workflowType)
      }

      if (filters.currentStage) {
        query = query.eq('current_stage', filters.currentStage)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.initiatedBy) {
        query = query.eq('initiated_by', filters.initiatedBy)
      }

      if (filters.robertsRulesEnabled !== undefined) {
        query = query.eq('roberts_rules_enabled', filters.robertsRulesEnabled)
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'find workflows with filters'))
      }

      const workflows = (data || []).map(this.transformWorkflowToDomain)
      return this.createPaginatedResult(workflows, count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find workflows with filters', error))
    }
  }

  /**
   * Get workflow with transition history
   */
  async findWorkflowWithTransitions(
    workflowId: MeetingWorkflowId
  ): Promise<Result<WorkflowWithTransitions>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Get workflow
      const workflowResult = await this.findById(workflowId)
      if (!workflowResult.success) return workflowResult

      const workflow = workflowResult.data

      // Check permissions
      const meetingResult = await this.getMeetingWithOrgCheck(workflow.meetingId, userId)
      if (!meetingResult.success) return meetingResult

      // Get transitions
      const { data: transitions, error: transitionsError } = await this.supabase
        .from('meeting_workflow_transitions')
        .select(`
          *,
          triggered_by_user:triggered_by(full_name),
          authorized_by_user:authorized_by(full_name),
          approved_by_user:approved_by(full_name)
        `)
        .eq('workflow_id', workflowId)
        .order('executed_at', { ascending: true })

      if (transitionsError) {
        return failure(RepositoryError.fromSupabaseError(transitionsError, 'get workflow transitions'))
      }

      // Calculate metrics
      const averageStageTime = this.calculateAverageStageTime(transitions || [])
      const stageCompletionRate = this.calculateStageCompletionRate(workflow, transitions || [])

      const workflowWithTransitions: WorkflowWithTransitions = {
        ...workflow,
        transitions: (transitions || []).map(this.transformTransitionToDomain),
        averageStageTime,
        stageCompletionRate
      }

      return success(workflowWithTransitions)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find workflow with transitions', error))
    }
  }

  // ============================================================================
  // ANALYTICS AND REPORTING
  // ============================================================================

  /**
   * Get workflow efficiency metrics
   */
  async getWorkflowEfficiencyMetrics(
    meetingId: MeetingId
  ): Promise<Result<WorkflowEfficiencyMetrics>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Check meeting access
      const meetingResult = await this.getMeetingWithOrgCheck(meetingId, userId)
      if (!meetingResult.success) return meetingResult

      const { data, error } = await this.supabase
        .rpc('get_workflow_efficiency_metrics', { meeting_id: meetingId })

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'get workflow efficiency metrics'))
      }

      const metrics = this.transformEfficiencyMetrics(data)
      return success(metrics)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get workflow efficiency metrics', error))
    }
  }

  /**
   * Get Robert's Rules compliance report
   */
  async getRobertsRulesCompliance(
    meetingId: MeetingId
  ): Promise<Result<RobertsRulesCompliance>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Check meeting access
      const meetingResult = await this.getMeetingWithOrgCheck(meetingId, userId)
      if (!meetingResult.success) return meetingResult

      const { data, error } = await this.supabase
        .rpc('get_roberts_rules_compliance', { meeting_id: meetingId })

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'get Roberts Rules compliance'))
      }

      const compliance = this.transformRobertsRulesCompliance(data)
      return success(compliance)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get Roberts Rules compliance', error))
    }
  }

  // ============================================================================
  // AUTOMATION AND RULES ENGINE
  // ============================================================================

  /**
   * Add automation rule for stage transitions
   */
  async addAutomationRule(
    workflowId: MeetingWorkflowId,
    rule: Omit<WorkflowAutomationRule, 'id' | 'workflowId'>
  ): Promise<Result<WorkflowAutomationRule>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Get workflow and check permissions
      const workflowResult = await this.findById(workflowId)
      if (!workflowResult.success) return workflowResult

      const workflow = workflowResult.data

      // Check permissions
      const meetingResult = await this.getMeetingWithOrgCheck(workflow.meetingId, userId)
      if (!meetingResult.success) return meetingResult

      const ruleData = {
        workflow_id: workflowId,
        from_stage: rule.fromStage,
        to_stage: rule.toStage,
        conditions: rule.conditions,
        auto_execute: rule.autoExecute,
        requires_approval: rule.requiresApproval,
        approval_roles: rule.approvalRoles,
        timeout_minutes: rule.timeoutMinutes
      }

      const { data, error } = await this.supabase
        .from('workflow_automation_rules')
        .insert(ruleData)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'add automation rule'))
      }

      return success({
        id: data.id,
        workflowId,
        fromStage: data.from_stage,
        toStage: data.to_stage,
        conditions: data.conditions,
        autoExecute: data.auto_execute,
        requiresApproval: data.requires_approval,
        approvalRoles: data.approval_roles,
        timeoutMinutes: data.timeout_minutes
      })
    } catch (error) {
      return failure(RepositoryError.internal('Failed to add automation rule', error))
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async findByMeetingId(meetingId: MeetingId): Promise<Result<MeetingWorkflow>> {
    const { data, error } = await this.supabase
      .from('meeting_workflows')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('status', 'not_started')
      .or('status', 'in_progress')
      .maybeSingle()

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'find workflow by meeting'))
    }

    if (!data) {
      return failure(RepositoryError.notFound('Active workflow not found for meeting'))
    }

    return success(this.transformWorkflowToDomain(data))
  }

  private async findById(workflowId: MeetingWorkflowId): Promise<Result<MeetingWorkflow>> {
    const { data, error } = await this.supabase
      .from('meeting_workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'find workflow by id'))
    }

    return success(this.transformWorkflowToDomain(data))
  }

  private async createTransition(data: {
    workflowId: MeetingWorkflowId
    meetingId: MeetingId
    fromStage?: WorkflowStage
    toStage: WorkflowStage
    transitionType: string
    triggeredBy: UserId
    conditions: Record<string, unknown>
    context?: Record<string, unknown>
    requiresApproval?: boolean
    timeoutAt?: string
  }): Promise<WorkflowTransition> {
    const transitionData: WorkflowTransitionInsert = {
      workflow_id: data.workflowId,
      meeting_id: data.meetingId,
      from_stage: data.fromStage,
      to_stage: data.toStage,
      transition_type: data.transitionType,
      triggered_by: data.triggeredBy,
      conditions_met: data.conditions,
      context_data: data.context || {},
      requires_approval: data.requiresApproval || false,
      planned_at: data.timeoutAt,
      executed_at: new Date().toISOString()
    }

    const { data: transition, error } = await this.supabase
      .from('meeting_workflow_transitions')
      .insert(transitionData)
      .select()
      .single()

    if (error) {
      throw RepositoryError.fromSupabaseError(error, 'create transition')
    }

    return this.transformTransitionToDomain(transition)
  }

  private async validateStageTransition(
    workflow: MeetingWorkflow,
    nextStage: WorkflowStage
  ): Promise<Result<boolean>> {
    // Check if stage is in the sequence
    if (!workflow.stagesSequence.includes(nextStage)) {
      return failure(RepositoryError.businessRule(
        'invalid_stage_transition',
        'Stage is not in the workflow sequence',
        { 
          currentStage: workflow.currentStage,
          requestedStage: nextStage,
          allowedStages: workflow.stagesSequence
        }
      ))
    }

    // Check if we're moving forward in the sequence (allow backward for corrections)
    const currentIndex = workflow.stagesSequence.indexOf(workflow.currentStage)
    const nextIndex = workflow.stagesSequence.indexOf(nextStage)

    // Allow backward transitions only if not completed
    if (nextIndex < currentIndex && workflow.status === 'completed') {
      return failure(RepositoryError.businessRule(
        'backward_transition_not_allowed',
        'Cannot move backward in a completed workflow',
        { currentStage: workflow.currentStage, requestedStage: nextStage }
      ))
    }

    // Check stage-specific business rules
    const stageValidation = await this.validateStageSpecificRules(workflow, nextStage)
    if (!stageValidation.success) return stageValidation

    return success(true)
  }

  private async validateStageSpecificRules(
    workflow: MeetingWorkflow,
    nextStage: WorkflowStage
  ): Promise<Result<boolean>> {
    switch (nextStage) {
      case 'quorum_check':
        if (workflow.attendanceCount < (workflow.quorumRequired || 0)) {
          return failure(RepositoryError.businessRule(
            'insufficient_quorum',
            'Cannot proceed without sufficient quorum',
            { 
              required: workflow.quorumRequired,
              present: workflow.attendanceCount
            }
          ))
        }
        break
      
      case 'voting_session':
        if (!workflow.motionOnFloor) {
          return failure(RepositoryError.businessRule(
            'no_motion_on_floor',
            'Cannot start voting without a motion on the floor',
            { currentStage: workflow.currentStage }
          ))
        }
        break

      case 'closing':
        if (workflow.activeVotingSession) {
          return failure(RepositoryError.businessRule(
            'active_voting_session',
            'Cannot close meeting with active voting session',
            { currentStage: workflow.currentStage }
          ))
        }
        break
    }

    return success(true)
  }

  private async evaluateTransitionConditions(
    workflow: MeetingWorkflow,
    nextStage: WorkflowStage,
    conditions: Record<string, unknown>
  ): Promise<Result<boolean>> {
    // Implementation would evaluate complex conditions based on meeting state
    // For now, return success
    return success(true)
  }

  private async getAutomationRules(
    workflowId: MeetingWorkflowId,
    fromStage: WorkflowStage,
    toStage: WorkflowStage
  ): Promise<WorkflowAutomationRule[]> {
    const { data, error } = await this.supabase
      .from('workflow_automation_rules')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('from_stage', fromStage)
      .eq('to_stage', toStage)

    if (error) {
      return []
    }

    return data.map(rule => ({
      id: rule.id,
      workflowId,
      fromStage: rule.from_stage,
      toStage: rule.to_stage,
      conditions: rule.conditions,
      autoExecute: rule.auto_execute,
      requiresApproval: rule.requires_approval,
      approvalRoles: rule.approval_roles,
      timeoutMinutes: rule.timeout_minutes
    }))
  }

  private async checkRobertsRulesCompliance(
    workflow: MeetingWorkflow,
    stage: WorkflowStage
  ): Promise<void> {
    // Implementation would check Robert's Rules compliance
    // This is a placeholder for the comprehensive rules engine
  }

  private async scheduleStageTimeout(
    workflowId: MeetingWorkflowId,
    timeoutAt: string
  ): Promise<void> {
    // Implementation would schedule a timeout job
    // This could integrate with a job queue system
  }

  private getDefaultStageSequence(workflowType: WorkflowType): WorkflowStage[] {
    const sequences: Record<WorkflowType, WorkflowStage[]> = {
      'standard_board': [
        'pre_meeting',
        'opening',
        'roll_call',
        'quorum_check',
        'agenda_approval',
        'regular_business',
        'voting_session',
        'new_business',
        'executive_session',
        'closing',
        'post_meeting'
      ],
      'agm': [
        'pre_meeting',
        'opening',
        'roll_call',
        'quorum_check',
        'agenda_approval',
        'regular_business',
        'voting_session',
        'new_business',
        'closing',
        'post_meeting'
      ],
      'emergency': [
        'pre_meeting',
        'opening',
        'roll_call',
        'quorum_check',
        'regular_business',
        'voting_session',
        'closing',
        'post_meeting'
      ],
      'committee': [
        'pre_meeting',
        'opening',
        'roll_call',
        'regular_business',
        'voting_session',
        'closing',
        'post_meeting'
      ],
      'custom': [
        'pre_meeting',
        'regular_business',
        'closing',
        'post_meeting'
      ]
    }

    return sequences[workflowType] || sequences['custom']
  }

  private getDefaultWorkflowName(workflowType: WorkflowType): string {
    const names: Record<WorkflowType, string> = {
      'standard_board': 'Standard Board Meeting Workflow',
      'agm': 'Annual General Meeting Workflow',
      'emergency': 'Emergency Meeting Workflow',
      'committee': 'Committee Meeting Workflow',
      'custom': 'Custom Meeting Workflow'
    }

    return names[workflowType] || names['custom']
  }

  private calculateAverageStageTime(transitions: WorkflowTransitionRow[]): Record<WorkflowStage, number> {
    const stageTimes: Record<string, number[]> = {}

    for (let i = 1; i < transitions.length; i++) {
      const currentTransition = transitions[i]
      const previousTransition = transitions[i - 1]
      
      const duration = new Date(currentTransition.executed_at).getTime() - 
                      new Date(previousTransition.executed_at).getTime()
      
      const stage = previousTransition.to_stage
      if (!stageTimes[stage]) {
        stageTimes[stage] = []
      }
      stageTimes[stage].push(duration / 1000 / 60) // Convert to minutes
    }

    const averageTimes: Record<WorkflowStage, number> = {} as any

    Object.entries(stageTimes).forEach(([stage, times]) => {
      averageTimes[stage as WorkflowStage] = times.reduce((sum, time) => sum + time, 0) / times.length
    })

    return averageTimes
  }

  private calculateStageCompletionRate(
    workflow: MeetingWorkflow,
    transitions: WorkflowTransitionRow[]
  ): number {
    const completedStages = transitions.length - 1 // Subtract initial creation transition
    const totalStages = workflow.stagesSequence.length
    return totalStages > 0 ? (completedStages / totalStages) * 100 : 0
  }

  private applyOrganizationFilter(query: any, userId: UserId): any {
    // Filter workflows based on user's organization memberships
    return query.in('meeting_id', 
      this.supabase
        .from('meetings')
        .select('id')
        .in('organization_id', 
          this.supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', userId)
            .eq('status', 'active')
        )
    )
  }

  private async getMeetingWithOrgCheck(
    meetingId: MeetingId,
    userId: UserId
  ): Promise<Result<{ organization_id: string; created_by?: string }>> {
    const { data: meeting, error } = await this.supabase
      .from('meetings')
      .select('organization_id, created_by')
      .eq('id', meetingId)
      .single()

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'get meeting'))
    }

    const permissionResult = await this.checkOrganizationPermission(
      userId,
      meeting.organization_id
    )
    if (!permissionResult.success) return permissionResult

    return success(meeting)
  }

  // ============================================================================
  // DOMAIN TRANSFORMATION METHODS
  // ============================================================================

  private transformWorkflowToDomain(row: MeetingWorkflowRow): MeetingWorkflow {
    return {
      id: row.id,
      meetingId: row.meeting_id,
      workflowType: row.workflow_type as WorkflowType,
      workflowName: row.workflow_name,
      workflowDescription: row.workflow_description,
      currentStage: row.current_stage as WorkflowStage,
      status: row.status as WorkflowStatus,
      progressPercentage: row.progress_percentage,
      stagesCompleted: row.stages_completed as WorkflowStage[],
      stagesSequence: row.stages_sequence as WorkflowStage[],
      currentStageIndex: row.current_stage_index,
      autoProgression: row.auto_progression,
      requireChairApproval: row.require_chair_approval,
      stageTimeLimits: row.stage_time_limits as Record<string, unknown>,
      initiatedBy: row.initiated_by,
      currentController: row.current_controller,
      quorumRequired: row.quorum_required,
      quorumAchieved: row.quorum_achieved,
      quorumCheckedAt: row.quorum_checked_at,
      attendanceCount: row.attendance_count,
      activeVotingSession: row.active_voting_session,
      votingMethod: row.voting_method as any,
      votesInProgress: row.votes_in_progress as string[],
      robertsRulesEnabled: row.roberts_rules_enabled,
      pointOfOrderRaised: row.point_of_order_raised,
      motionOnFloor: row.motion_on_floor,
      speakingOrder: row.speaking_order as string[],
      currentSpeaker: row.current_speaker,
      stageStartedAt: row.stage_started_at,
      stageDeadline: row.stage_deadline,
      estimatedCompletion: row.estimated_completion,
      actualCompletion: row.actual_completion,
      allowLateArrivals: row.allow_late_arrivals,
      requireUnanimousConsent: row.require_unanimous_consent,
      enableExecutiveSession: row.enable_executive_session,
      errorState: row.error_state,
      errorMessage: row.error_message,
      lastErrorAt: row.last_error_at,
      recoveryAttempted: row.recovery_attempted,
      workflowStartedAt: row.workflow_started_at,
      workflowCompletedAt: row.workflow_completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private transformTransitionToDomain(row: any): WorkflowTransition {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      meetingId: row.meeting_id,
      fromStage: row.from_stage,
      toStage: row.to_stage,
      transitionType: row.transition_type,
      triggeredBy: row.triggered_by,
      authorizedBy: row.authorized_by,
      requiresApproval: row.requires_approval,
      approvedBy: row.approved_by,
      conditionsMet: row.conditions_met,
      contextData: row.context_data,
      transitionDuration: row.transition_duration,
      plannedAt: row.planned_at,
      executedAt: row.executed_at,
      quorumCheckPassed: row.quorum_check_passed,
      votingCompleted: row.voting_completed,
      requiredApprovalsReceived: row.required_approvals_received,
      transitionNotes: row.transition_notes,
      systemNotes: row.system_notes,
      createdAt: row.created_at
    }
  }

  private transformEfficiencyMetrics(data: any): WorkflowEfficiencyMetrics {
    return {
      totalWorkflowTime: data.total_workflow_time || 0,
      averageStageTime: data.average_stage_time || {},
      stageCompletionRate: data.stage_completion_rate || {},
      automationEffectiveness: data.automation_effectiveness || 0,
      manualInterventions: data.manual_interventions || 0,
      errorsEncountered: data.errors_encountered || 0,
      recoverySuccessRate: data.recovery_success_rate || 0
    }
  }

  private transformRobertsRulesCompliance(data: any): RobertsRulesCompliance {
    return {
      motionsProposed: data.motions_proposed || 0,
      motionsSeconded: data.motions_seconded || 0,
      amendmentsOffered: data.amendments_offered || 0,
      pointsOfOrderRaised: data.points_of_order_raised || 0,
      privilegedMotions: data.privileged_motions || 0,
      complianceScore: data.compliance_score || 0,
      procedureViolations: data.procedure_violations || []
    }
  }
}