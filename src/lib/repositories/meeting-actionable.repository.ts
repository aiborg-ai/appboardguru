import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import {
  QueryOptions,
  PaginatedResult,
  UserId,
  OrganizationId,
  MeetingId,
  MeetingActionableId,
  createMeetingActionableId
} from './types'
import { Database } from '../../types/database'
import {
  MeetingActionable,
  CreateActionableRequest,
  UpdateActionableRequest,
  ActionableStatus,
  ActionablePriority,
  ActionableCategory,
  ActionableUpdate,
  CreateActionableUpdateRequest,
  ActionableWithUpdates
} from '../../types/meetings'

// Database types from schema
type MeetingActionableRow = Database['public']['Tables']['meeting_actionables']['Row']
type MeetingActionableInsert = Database['public']['Tables']['meeting_actionables']['Insert']
type MeetingActionableUpdate = Database['public']['Tables']['meeting_actionables']['Update']

// Extended interfaces
export interface ActionableAssignment {
  actionableId: MeetingActionableId
  assignedTo: UserId
  assignedBy: UserId
  assignedAt: string
  delegatedFrom?: UserId
}

export interface ActionableStats {
  totalActionables: number
  completedActionables: number
  overdueActionables: number
  inProgressActionables: number
  averageCompletionTime: number // in days
  completionRate: number // percentage
}

export interface EscalationInfo {
  actionableId: MeetingActionableId
  escalationLevel: 1 | 2 | 3 | 4 | 5
  escalatedTo?: UserId
  escalatedAt?: string
  escalationReason?: string
  escalationPath: UserId[]
}

export class MeetingActionableRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'MeetingActionable'
  }

  protected getSearchFields(): string[] {
    return ['title', 'description']
  }

  protected getTableName(): string {
    return 'meeting_actionables'
  }

  /**
   * Find all actionables for a meeting
   */
  async findByMeeting(
    meetingId: MeetingId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<MeetingActionable>>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Check meeting and organization permissions
      const meetingResult = await this.getMeetingWithOrgCheck(meetingId, userResult.data)
      if (!meetingResult.success) return meetingResult

      let query = this.supabase
        .from('meeting_actionables')
        .select('*', { count: 'exact' })
        .eq('meeting_id', meetingId)

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findByMeeting'))
      }

      // Transform database rows to domain objects
      const actionables = (data || []).map(this.transformToDomain)

      return this.createPaginatedResult(actionables, count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find actionables by meeting', error))
    }
  }

  /**
   * Find actionables assigned to a specific user
   */
  async findByAssignee(
    assigneeId: UserId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<MeetingActionable>>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      let query = this.supabase
        .from('meeting_actionables')
        .select(`
          *,
          meeting:meetings!inner(organization_id)
        `, { count: 'exact' })
        .eq('assigned_to', assigneeId)

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findByAssignee'))
      }

      // Filter by organizations the user has access to
      const filteredData = []
      for (const item of data || []) {
        const orgPermissionResult = await this.checkOrganizationPermission(
          userResult.data,
          item.meeting.organization_id
        )
        if (orgPermissionResult.success) {
          filteredData.push(item)
        }
      }

      const actionables = filteredData.map(this.transformToDomain)

      return this.createPaginatedResult(actionables, count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find actionables by assignee', error))
    }
  }

  /**
   * Find overdue actionables across organization
   */
  async findOverdue(
    organizationId: OrganizationId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<MeetingActionable>>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Check organization permission
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        organizationId
      )
      if (!permissionResult.success) return permissionResult

      const currentDate = new Date().toISOString().split('T')[0]

      let query = this.supabase
        .from('meeting_actionables')
        .select(`
          *,
          meeting:meetings!inner(organization_id)
        `, { count: 'exact' })
        .eq('meeting.organization_id', organizationId)
        .lt('due_date', currentDate)
        .neq('status', 'completed')
        .neq('status', 'cancelled')

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findOverdue'))
      }

      const actionables = (data || []).map(this.transformToDomain)

      return this.createPaginatedResult(actionables, count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find overdue actionables', error))
    }
  }

  /**
   * Find actionable by ID with full details including updates
   */
  async findByIdWithUpdates(actionableId: MeetingActionableId): Promise<Result<ActionableWithUpdates>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get actionable with assignee details
      const { data: actionableData, error: actionableError } = await this.supabase
        .from('meeting_actionables')
        .select(`
          *,
          assignee:assigned_to(full_name, email),
          assigner:assigned_by(full_name, email),
          meeting:meetings(organization_id)
        `)
        .eq('id', actionableId)
        .single()

      if (actionableError) {
        return failure(RepositoryError.fromSupabaseError(actionableError, 'findByIdWithUpdates'))
      }

      // Check organization permissions via meeting
      const meetingResult = await this.getMeetingWithOrgCheck(
        actionableData.meeting_id, 
        userResult.data
      )
      if (!meetingResult.success) return meetingResult

      // Get updates for this actionable
      const { data: updatesData, error: updatesError } = await this.supabase
        .from('actionable_updates')
        .select(`
          *,
          updater:updated_by(full_name, email)
        `)
        .eq('actionable_id', actionableId)
        .order('created_at', { ascending: false })

      if (updatesError) {
        return failure(RepositoryError.fromSupabaseError(updatesError, 'get actionable updates'))
      }

      // Get dependent and blocking actionables
      const { data: dependentData } = await this.supabase
        .from('actionable_dependencies')
        .select(`
          dependent_actionable_id,
          dependent:meeting_actionables!dependent_actionable_id(*)
        `)
        .eq('actionable_id', actionableId)

      const { data: blockingData } = await this.supabase
        .from('actionable_dependencies')
        .select(`
          actionable_id,
          blocking:meeting_actionables!actionable_id(*)
        `)
        .eq('dependent_actionable_id', actionableId)

      const actionable = this.transformToDomain(actionableData)
      const updates = (updatesData || []).map(this.transformUpdateToDomain)
      const dependentActionables = (dependentData || []).map(item => 
        this.transformToDomain(item.dependent)
      )
      const blockingActionables = (blockingData || []).map(item => 
        this.transformToDomain(item.blocking)
      )

      const actionableWithUpdates: ActionableWithUpdates = {
        ...actionable,
        updates,
        dependentActionables,
        blockingActionables
      }

      return success(actionableWithUpdates)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find actionable with updates', error))
    }
  }

  /**
   * Create a new actionable
   */
  async create(
    requestData: CreateActionableRequest
  ): Promise<Result<MeetingActionable>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Validate required fields
      const validationResult = this.validateRequired(requestData, [
        'meetingId', 'assignedTo', 'title', 'description', 'dueDate'
      ])
      if (!validationResult.success) return validationResult

      // Check meeting exists and user has permissions
      const meetingResult = await this.getMeetingWithOrgCheck(requestData.meetingId, userResult.data)
      if (!meetingResult.success) return meetingResult

      // Validate due date is not in the past
      const dueDate = new Date(requestData.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dueDate < today) {
        return failure(RepositoryError.validation(
          'Due date cannot be in the past',
          { provided_date: requestData.dueDate }
        ))
      }

      return await this.withTransaction([
        async () => {
          // Generate actionable number
          const actionableNumber = await this.generateActionableNumber(
            requestData.meetingId,
            new Date().getFullYear()
          )

          if (!actionableNumber.success) return actionableNumber

          // Create the actionable
          const insertData: MeetingActionableInsert = {
            meeting_id: requestData.meetingId,
            title: requestData.title,
            description: requestData.description,
            assigned_to: requestData.assignedTo,
            assigned_by: userResult.data,
            actionable_number: actionableNumber.data,
            category: requestData.category || 'other',
            priority: requestData.priority || 'medium',
            due_date: requestData.dueDate,
            status: 'assigned',
            progress_percentage: 0,
            estimated_effort_hours: requestData.estimatedEffortHours,
            detailed_requirements: requestData.detailedRequirements,
            reminder_intervals: requestData.reminderIntervals || [],
            requires_approval: requestData.requiresApproval || false,
            deliverable_type: requestData.deliverableType,
            success_metrics: requestData.successMetrics,
            stakeholders_to_notify: requestData.stakeholdersToNotify || [],
            communication_required: requestData.communicationRequired || false,
            escalation_level: 1,
            escalation_path: requestData.escalationPath || [],
            assigned_at: new Date().toISOString()
          }

          const { data, error } = await this.supabase
            .from('meeting_actionables')
            .insert(insertData)
            .select()
            .single()

          if (error) {
            throw RepositoryError.fromSupabaseError(error, 'create actionable')
          }

          // Create dependencies if specified
          if (requestData.dependsOnActionableIds && requestData.dependsOnActionableIds.length > 0) {
            const dependencies = requestData.dependsOnActionableIds.map(depId => ({
              actionable_id: depId,
              dependent_actionable_id: data.id,
              created_by: userResult.data
            }))

            const { error: depsError } = await this.supabase
              .from('actionable_dependencies')
              .insert(dependencies)

            if (depsError) {
              throw RepositoryError.fromSupabaseError(depsError, 'create dependencies')
            }
          }

          // Log activity
          await this.logActivity({
            user_id: userResult.data,
            organization_id: meetingResult.data.organization_id,
            event_type: 'actionable.created',
            event_category: 'task_management',
            action: 'create',
            resource_type: 'meeting_actionable',
            resource_id: data.id,
            event_description: `Created actionable: ${data.title}`,
            outcome: 'success',
            severity: 'medium',
            details: {
              meeting_id: requestData.meetingId,
              assigned_to: requestData.assignedTo,
              due_date: requestData.dueDate,
              priority: requestData.priority,
              actionable_number: actionableNumber.data
            }
          })

          return success(this.transformToDomain(data))
        }
      ])
        .then(results => results.success ? success(results.data[0]) : results)
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to create actionable', error))
    }
  }

  /**
   * Update an actionable with optimistic locking
   */
  async update(
    actionableId: MeetingActionableId,
    updates: UpdateActionableRequest
  ): Promise<Result<MeetingActionable>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get current actionable
      const currentResult = await this.findById(actionableId)
      if (!currentResult.success) return currentResult

      const current = currentResult.data

      // Check permissions via meeting
      const meetingResult = await this.getMeetingWithOrgCheck(current.meetingId, userResult.data)
      if (!meetingResult.success) return meetingResult

      // Validate business rules
      if (current.status === 'completed' && updates.status && updates.status !== 'completed') {
        return failure(RepositoryError.businessRule(
          'completed_actionable_status_change',
          'Cannot change status of a completed actionable',
          { current_status: current.status }
        ))
      }

      // Use optimistic locking for concurrent updates
      return await this.withOptimisticLock(
        { id: actionableId, version: current.version || 0 },
        async (lock) => {
          const updateData: MeetingActionableUpdate = {
            title: updates.title,
            description: updates.description,
            detailed_requirements: updates.detailedRequirements,
            priority: updates.priority,
            due_date: updates.dueDate,
            status: updates.status,
            progress_percentage: updates.progressPercentage,
            completion_notes: updates.completionNotes,
            actual_effort_hours: updates.actualEffortHours,
            deliverable_location: updates.deliverableLocation,
            actual_results: updates.actualResults,
            escalation_reason: updates.escalationReason,
            updated_at: new Date().toISOString()
          }

          // Set completion timestamp if status changed to completed
          if (updates.status === 'completed' && current.status !== 'completed') {
            updateData.completed_at = new Date().toISOString()
          }

          // Remove undefined values
          Object.keys(updateData).forEach(key => {
            if (updateData[key as keyof typeof updateData] === undefined) {
              delete updateData[key as keyof typeof updateData]
            }
          })

          const { data, error } = await this.supabase
            .from('meeting_actionables')
            .update(updateData)
            .eq('id', actionableId)
            .select()
            .single()

          if (error) {
            throw RepositoryError.fromSupabaseError(error, 'update actionable')
          }

          // Log activity
          await this.logActivity({
            user_id: userResult.data,
            organization_id: meetingResult.data.organization_id,
            event_type: 'actionable.updated',
            event_category: 'task_management',
            action: 'update',
            resource_type: 'meeting_actionable',
            resource_id: actionableId,
            event_description: `Updated actionable: ${data.title}`,
            outcome: 'success',
            severity: 'low',
            details: {
              changes: updates,
              previous_status: current.status,
              new_status: updates.status
            }
          })

          return success(this.transformToDomain(data))
        }
      )
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to update actionable', error))
    }
  }

  /**
   * Add progress update to an actionable
   */
  async addUpdate(
    updateRequest: CreateActionableUpdateRequest
  ): Promise<Result<ActionableUpdate>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get actionable to check permissions
      const actionableResult = await this.findById(updateRequest.actionableId)
      if (!actionableResult.success) return actionableResult

      const actionable = actionableResult.data

      // Check permissions via meeting
      const meetingResult = await this.getMeetingWithOrgCheck(actionable.meetingId, userResult.data)
      if (!meetingResult.success) return meetingResult

      return await this.withTransaction([
        async () => {
          // Create the update record
          const updateData = {
            actionable_id: updateRequest.actionableId,
            updated_by: userResult.data,
            update_type: updateRequest.updateType,
            previous_status: actionable.status,
            new_status: updateRequest.newStatus,
            previous_progress: actionable.progressPercentage,
            new_progress: updateRequest.newProgress,
            update_notes: updateRequest.updateNotes,
            challenges_faced: updateRequest.challengesFaced,
            next_steps: updateRequest.nextSteps,
            support_needed: updateRequest.supportNeeded,
            hours_worked: updateRequest.hoursWorked,
            time_period_start: updateRequest.timePeriodStart,
            time_period_end: updateRequest.timePeriodEnd,
            supporting_files: updateRequest.supportingFiles || []
          }

          const { data: update, error: updateError } = await this.supabase
            .from('actionable_updates')
            .insert(updateData)
            .select()
            .single()

          if (updateError) {
            throw RepositoryError.fromSupabaseError(updateError, 'create actionable update')
          }

          // Update the actionable status and progress if provided
          const actionableUpdates: any = {
            updated_at: new Date().toISOString()
          }

          if (updateRequest.newStatus) {
            actionableUpdates.status = updateRequest.newStatus
            if (updateRequest.newStatus === 'completed') {
              actionableUpdates.completed_at = new Date().toISOString()
            }
          }

          if (updateRequest.newProgress !== undefined) {
            actionableUpdates.progress_percentage = updateRequest.newProgress
          }

          if (Object.keys(actionableUpdates).length > 1) { // More than just updated_at
            const { error: actionableUpdateError } = await this.supabase
              .from('meeting_actionables')
              .update(actionableUpdates)
              .eq('id', updateRequest.actionableId)

            if (actionableUpdateError) {
              throw RepositoryError.fromSupabaseError(actionableUpdateError, 'update actionable progress')
            }
          }

          // Log activity
          await this.logActivity({
            user_id: userResult.data,
            organization_id: meetingResult.data.organization_id,
            event_type: 'actionable.progress_updated',
            event_category: 'task_management',
            action: 'update',
            resource_type: 'actionable_update',
            resource_id: update.id,
            event_description: `Added progress update to actionable: ${actionable.title}`,
            outcome: 'success',
            severity: 'low',
            details: {
              actionable_id: updateRequest.actionableId,
              update_type: updateRequest.updateType,
              new_progress: updateRequest.newProgress,
              new_status: updateRequest.newStatus
            }
          })

          return success(this.transformUpdateToDomain(update))
        }
      ])
        .then(results => results.success ? success(results.data[0]) : results)
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to add actionable update', error))
    }
  }

  /**
   * Escalate an actionable to the next level
   */
  async escalate(
    actionableId: MeetingActionableId,
    escalationReason: string
  ): Promise<Result<MeetingActionable>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const actionableResult = await this.findById(actionableId)
      if (!actionableResult.success) return actionableResult

      const actionable = actionableResult.data

      // Check permissions
      const meetingResult = await this.getMeetingWithOrgCheck(actionable.meetingId, userResult.data)
      if (!meetingResult.success) return meetingResult

      // Validate escalation is possible
      if (actionable.escalationLevel >= 5) {
        return failure(RepositoryError.businessRule(
          'maximum_escalation_reached',
          'Actionable has already reached maximum escalation level',
          { current_level: actionable.escalationLevel }
        ))
      }

      if (actionable.status === 'completed' || actionable.status === 'cancelled') {
        return failure(RepositoryError.businessRule(
          'cannot_escalate_closed_actionable',
          'Cannot escalate a completed or cancelled actionable',
          { current_status: actionable.status }
        ))
      }

      const newEscalationLevel = (actionable.escalationLevel + 1) as 1 | 2 | 3 | 4 | 5
      const escalationPath = actionable.escalationPath
      const escalatedTo = escalationPath[newEscalationLevel - 2] // Array is 0-indexed

      const { data, error } = await this.supabase
        .from('meeting_actionables')
        .update({
          escalation_level: newEscalationLevel,
          escalated_to: escalatedTo,
          escalated_at: new Date().toISOString(),
          escalation_reason: escalationReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', actionableId)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'escalate actionable'))
      }

      // Log activity
      await this.logActivity({
        user_id: userResult.data,
        organization_id: meetingResult.data.organization_id,
        event_type: 'actionable.escalated',
        event_category: 'task_management',
        action: 'update',
        resource_type: 'meeting_actionable',
        resource_id: actionableId,
        event_description: `Escalated actionable: ${actionable.title}`,
        outcome: 'success',
        severity: 'high',
        details: {
          escalation_level: newEscalationLevel,
          escalated_to: escalatedTo,
          escalation_reason: escalationReason,
          previous_level: actionable.escalationLevel
        }
      })

      return success(this.transformToDomain(data))
    } catch (error) {
      return failure(RepositoryError.internal('Failed to escalate actionable', error))
    }
  }

  /**
   * Get actionable statistics for organization
   */
  async getStats(organizationId: OrganizationId): Promise<Result<ActionableStats>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Check organization permission
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        organizationId
      )
      if (!permissionResult.success) return permissionResult

      // Get all actionables for organization
      const { data: actionables, error } = await this.supabase
        .from('meeting_actionables')
        .select(`
          *,
          meeting:meetings!inner(organization_id)
        `)
        .eq('meeting.organization_id', organizationId)

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'get actionable stats'))
      }

      const now = new Date()
      const total = actionables?.length || 0
      const completed = actionables?.filter(a => a.status === 'completed').length || 0
      const overdue = actionables?.filter(a => 
        a.status !== 'completed' && 
        a.status !== 'cancelled' && 
        new Date(a.due_date) < now
      ).length || 0
      const inProgress = actionables?.filter(a => a.status === 'in_progress').length || 0

      // Calculate average completion time
      const completedWithDates = actionables?.filter(a => 
        a.status === 'completed' && a.assigned_at && a.completed_at
      ) || []

      let averageCompletionTime = 0
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((sum, a) => {
          const assigned = new Date(a.assigned_at!)
          const completed = new Date(a.completed_at!)
          const days = Math.ceil((completed.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0)
        averageCompletionTime = totalDays / completedWithDates.length
      }

      const completionRate = total > 0 ? (completed / total) * 100 : 0

      const stats: ActionableStats = {
        totalActionables: total,
        completedActionables: completed,
        overdueActionables: overdue,
        inProgressActionables: inProgress,
        averageCompletionTime,
        completionRate
      }

      return success(stats)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get actionable stats', error))
    }
  }

  /**
   * Generate auto-numbered actionable identifier
   */
  private async generateActionableNumber(
    meetingId: MeetingId,
    year: number
  ): Promise<Result<string>> {
    try {
      // Get count of actionables for this year
      const { count, error } = await this.supabase
        .from('meeting_actionables')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${year}-01-01`)
        .lt('created_at', `${year + 1}-01-01`)

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'generate actionable number'))
      }

      const sequenceNumber = (count || 0) + 1
      const actionableNumber = `A${year}-${sequenceNumber.toString().padStart(3, '0')}`

      return success(actionableNumber)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to generate actionable number', error))
    }
  }

  /**
   * Helper to get meeting and check organization permissions
   */
  private async getMeetingWithOrgCheck(
    meetingId: MeetingId,
    userId: UserId
  ): Promise<Result<{ organization_id: string }>> {
    const { data: meeting, error } = await this.supabase
      .from('meetings')
      .select('organization_id')
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

  /**
   * Get actionable by ID (internal method)
   */
  private async findById(actionableId: MeetingActionableId): Promise<Result<MeetingActionable>> {
    try {
      const { data, error } = await this.supabase
        .from('meeting_actionables')
        .select('*')
        .eq('id', actionableId)
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findById'))
      }

      return success(this.transformToDomain(data))
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find actionable by ID', error))
    }
  }

  /**
   * Transform database row to domain object
   */
  private transformToDomain(row: MeetingActionableRow): MeetingActionable {
    return {
      id: row.id,
      meetingId: row.meeting_id,
      assignedTo: row.assigned_to,
      assignedBy: row.assigned_by || '',
      actionNumber: row.actionable_number || undefined,
      title: row.title,
      description: row.description || '',
      detailedRequirements: row.detailed_requirements || undefined,
      category: (row.category as ActionableCategory) || 'other',
      priority: (row.priority as ActionablePriority) || 'medium',
      estimatedEffortHours: row.estimated_effort_hours || undefined,
      actualEffortHours: row.actual_effort_hours || undefined,
      dueDate: row.due_date,
      reminderIntervals: (row.reminder_intervals as number[]) || [],
      lastReminderSent: row.last_reminder_sent || undefined,
      status: row.status as ActionableStatus,
      progressPercentage: row.progress_percentage || 0,
      completionNotes: row.completion_notes || undefined,
      dependsOnActionableIds: [], // Loaded separately in detailed views
      blocksActionableIds: [], // Loaded separately in detailed views
      requiresApproval: row.requires_approval || false,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      approvalNotes: row.approval_notes || undefined,
      deliverableType: row.deliverable_type || undefined,
      deliverableLocation: row.deliverable_location || undefined,
      successMetrics: row.success_metrics || undefined,
      actualResults: row.actual_results || undefined,
      stakeholdersToNotify: (row.stakeholders_to_notify as UserId[]) || [],
      communicationRequired: row.communication_required || false,
      communicationTemplate: row.communication_template || undefined,
      escalationLevel: (row.escalation_level as 1 | 2 | 3 | 4 | 5) || 1,
      escalationPath: (row.escalation_path as UserId[]) || [],
      escalatedAt: row.escalated_at || undefined,
      escalatedTo: row.escalated_to || undefined,
      escalationReason: row.escalation_reason || undefined,
      assignedAt: row.assigned_at || row.created_at || '',
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      cancelledAt: row.cancelled_at || undefined,
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
      version: row.version || 0
    } as MeetingActionable
  }

  /**
   * Transform update database row to domain object
   */
  private transformUpdateToDomain(row: any): ActionableUpdate {
    return {
      id: row.id,
      actionableId: row.actionable_id,
      updatedBy: row.updated_by,
      updateType: row.update_type,
      previousStatus: row.previous_status || undefined,
      newStatus: row.new_status || undefined,
      previousProgress: row.previous_progress || undefined,
      newProgress: row.new_progress || undefined,
      updateNotes: row.update_notes || undefined,
      challengesFaced: row.challenges_faced || undefined,
      nextSteps: row.next_steps || undefined,
      supportNeeded: row.support_needed || undefined,
      hoursWorked: row.hours_worked || undefined,
      timePeriodStart: row.time_period_start || undefined,
      timePeriodEnd: row.time_period_end || undefined,
      supportingFiles: (row.supporting_files as string[]) || [],
      createdAt: row.created_at
    }
  }
}