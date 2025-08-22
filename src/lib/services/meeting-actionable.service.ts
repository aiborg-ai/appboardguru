import { BaseService } from './base.service'
import { Result, success, failure, RepositoryError, wrapAsync } from '../repositories/result'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import {
  MeetingActionable,
  CreateActionableRequest,
  UpdateActionableRequest,
  ActionableStatus,
  ActionablePriority,
  ActionableCategory,
  ActionableUpdate,
  CreateActionableUpdateRequest,
  ActionableWithUpdates,
  ActionablesAnalytics
} from '../../types/meetings'
import { 
  MeetingActionableId, 
  MeetingId, 
  UserId, 
  OrganizationId,
  QueryOptions,
  PaginatedResult
} from '../repositories/types'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateActionableSchema = z.object({
  meetingId: z.string().min(1),
  agendaItemId: z.string().optional(),
  resolutionId: z.string().optional(),
  assignedTo: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  detailedRequirements: z.string().max(5000).optional(),
  category: z.enum(['follow_up', 'research', 'implementation', 'compliance', 'reporting', 'communication', 'approval', 'review', 'other']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  estimatedEffortHours: z.number().positive().optional(),
  dueDate: z.string().datetime(),
  reminderIntervals: z.array(z.number().positive()).optional(),
  dependsOnActionableIds: z.array(z.string()).optional(),
  requiresApproval: z.boolean().optional(),
  deliverableType: z.string().max(100).optional(),
  successMetrics: z.string().max(1000).optional(),
  stakeholdersToNotify: z.array(z.string()).optional(),
  communicationRequired: z.boolean().optional(),
  escalationPath: z.array(z.string()).optional()
})

const UpdateActionableSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  detailedRequirements: z.string().max(5000).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['assigned', 'in_progress', 'blocked', 'under_review', 'completed', 'cancelled', 'overdue']).optional(),
  progressPercentage: z.number().int().min(0).max(100).optional(),
  completionNotes: z.string().max(2000).optional(),
  actualEffortHours: z.number().positive().optional(),
  deliverableLocation: z.string().max(500).optional(),
  actualResults: z.string().max(2000).optional(),
  escalationReason: z.string().max(1000).optional()
})

const CreateActionableUpdateSchema = z.object({
  actionableId: z.string().min(1),
  updateType: z.enum(['progress', 'status_change', 'deadline_extension', 'delegation', 'completion']),
  newStatus: z.enum(['assigned', 'in_progress', 'blocked', 'under_review', 'completed', 'cancelled', 'overdue']).optional(),
  newProgress: z.number().int().min(0).max(100).optional(),
  updateNotes: z.string().max(2000).optional(),
  challengesFaced: z.string().max(1000).optional(),
  nextSteps: z.string().max(1000).optional(),
  supportNeeded: z.string().max(1000).optional(),
  hoursWorked: z.number().positive().optional(),
  timePeriodStart: z.string().datetime().optional(),
  timePeriodEnd: z.string().datetime().optional(),
  supportingFiles: z.array(z.string()).optional()
})

// ============================================================================
// BUSINESS CONFIGURATION
// ============================================================================

interface EscalationConfig {
  overdueThresholdDays: number
  escalationLevels: {
    level: 1 | 2 | 3 | 4 | 5
    daysOverdue: number
    description: string
  }[]
}

interface ReminderConfig {
  defaultIntervals: number[] // Days before due date
  maxReminders: number
  escalationAfterMissedReminders: number
}

interface DependencyConfig {
  maxDependencyDepth: number
  allowCircularDependencies: boolean
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class MeetingActionableService extends BaseService {
  private static readonly DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
    overdueThresholdDays: 1,
    escalationLevels: [
      { level: 1, daysOverdue: 0, description: 'Initial assignment' },
      { level: 2, daysOverdue: 1, description: 'One day overdue - supervisor notification' },
      { level: 3, daysOverdue: 3, description: 'Three days overdue - manager escalation' },
      { level: 4, daysOverdue: 7, description: 'One week overdue - senior management' },
      { level: 5, daysOverdue: 14, description: 'Two weeks overdue - executive escalation' }
    ]
  }

  private static readonly DEFAULT_REMINDER_CONFIG: ReminderConfig = {
    defaultIntervals: [7, 3, 1], // 7 days, 3 days, 1 day before due
    maxReminders: 5,
    escalationAfterMissedReminders: 3
  }

  private static readonly DEFAULT_DEPENDENCY_CONFIG: DependencyConfig = {
    maxDependencyDepth: 5,
    allowCircularDependencies: false
  }

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  // ============================================================================
  // PUBLIC METHODS - ACTIONABLE MANAGEMENT
  // ============================================================================

  /**
   * Create a new actionable with comprehensive validation
   */
  async createActionable(request: CreateActionableRequest): Promise<Result<MeetingActionable>> {
    return this.executeDbOperation(async () => {
      // Validate input data
      const validationResult = this.validateWithContext<CreateActionableRequest>(
        request,
        CreateActionableSchema,
        'actionable creation',
        'request'
      )
      if (!validationResult.success) return validationResult

      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult
      
      const user = userResult.data
      const validatedRequest = validationResult.data

      // Get meeting and validate permissions - use validation method
      const meetingCheckResult = await this.validateMeetingAccess(validatedRequest.meetingId, user.id)
      if (!meetingCheckResult.success) return meetingCheckResult

      // Check organization membership and permissions
      const permissionResult = await this.checkPermissionWithContext(
        user.id,
        'meeting_actionable',
        'create',
        validatedRequest.meetingId,
        { meetingId: validatedRequest.meetingId }
      )
      if (!permissionResult.success) return permissionResult

      // Validate assignee exists and has permission
      const assigneeValidationResult = await this.validateAssignee(
        validatedRequest.assignedTo,
        validatedRequest.meetingId
      )
      if (!assigneeValidationResult.success) return assigneeValidationResult

      // Validate due date
      const dueDateValidationResult = this.validateDueDate(validatedRequest.dueDate)
      if (!dueDateValidationResult.success) return dueDateValidationResult

      // Validate dependencies
      if (validatedRequest.dependsOnActionableIds && validatedRequest.dependsOnActionableIds.length > 0) {
        const dependencyValidationResult = await this.validateDependencies(
          validatedRequest.dependsOnActionableIds,
          validatedRequest.meetingId
        )
        if (!dependencyValidationResult.success) return dependencyValidationResult
      }

      // Validate escalation path
      if (validatedRequest.escalationPath && validatedRequest.escalationPath.length > 0) {
        const escalationValidationResult = await this.validateEscalationPath(
          validatedRequest.escalationPath,
          validatedRequest.meetingId
        )
        if (!escalationValidationResult.success) return escalationValidationResult
      }

      // Set default reminder intervals if not provided
      const finalRequest = {
        ...validatedRequest,
        reminderIntervals: validatedRequest.reminderIntervals || MeetingActionableService.DEFAULT_REMINDER_CONFIG.defaultIntervals
      }

      // Create actionable using repository
      const creationResult = await this.repositories.meetingActionabless.create(finalRequest)
      if (!creationResult.success) return creationResult

      const actionable = creationResult.data

      // Schedule reminders
      await this.scheduleReminders(actionable)

      // Notify stakeholders
      if (validatedRequest.stakeholdersToNotify && validatedRequest.stakeholdersToNotify.length > 0) {
        await this.notifyStakeholders(actionable, 'created', validatedRequest.stakeholdersToNotify)
      }

      // Log business event
      await this.logActivity(
        'actionable_created',
        'meeting_actionable',
        actionable.id,
        {
          meetingId: validatedRequest.meetingId,
          assignedTo: validatedRequest.assignedTo,
          priority: validatedRequest.priority,
          category: validatedRequest.category,
          dueDate: validatedRequest.dueDate,
          hasDependencies: (validatedRequest.dependsOnActionableIds?.length || 0) > 0
        }
      )

      return success(actionable)
    }, 'createActionable')
  }

  /**
   * Update an actionable with status transition validation
   */
  async updateActionable(
    actionableId: MeetingActionableId,
    updates: UpdateActionableRequest
  ): Promise<Result<MeetingActionable>> {
    return this.executeDbOperation(async () => {
      // Validate input
      const validationResult = this.validateWithContext<UpdateActionableRequest>(
        updates,
        UpdateActionableSchema,
        'actionable update',
        'updates'
      )
      if (!validationResult.success) return validationResult

      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      const user = userResult.data
      const validatedUpdates = validationResult.data

      // Get current actionable
      const currentResult = await this.repositories.meetingActionabless.findByIdWithUpdates(actionableId)
      if (!currentResult.success) return currentResult

      const current = currentResult.data

      // Validate permissions (assignee, assigner, or superuser)
      const permissionResult = await this.validateActionableUpdatePermission(user.id, current)
      if (!permissionResult.success) return permissionResult

      // Validate status transitions
      if (validatedUpdates.status) {
        const transitionResult = await this.validateStatusTransition(
          current.status,
          validatedUpdates.status,
          current,
          user.id
        )
        if (!transitionResult.success) return transitionResult
      }

      // Validate progress consistency
      if (validatedUpdates.progressPercentage !== undefined || validatedUpdates.status) {
        const progressResult = this.validateProgressConsistency(
          validatedUpdates.progressPercentage ?? current.progressPercentage,
          validatedUpdates.status ?? current.status
        )
        if (!progressResult.success) return progressResult
      }

      // Validate due date changes
      if (validatedUpdates.dueDate) {
        const dueDateResult = this.validateDueDateChange(current, validatedUpdates.dueDate, user.id)
        if (!dueDateResult.success) return dueDateResult
      }

      // Check for dependency completion before completing this actionable
      if (validatedUpdates.status === 'completed') {
        const dependencyCheckResult = await this.checkDependencyCompletion(current)
        if (!dependencyCheckResult.success) return dependencyCheckResult
      }

      // Update using repository
      const updateResult = await this.repositories.meetingActionabless.update(actionableId, validatedUpdates)
      if (!updateResult.success) return updateResult

      const updatedActionable = updateResult.data

      // Handle post-update actions
      await this.handlePostUpdateActions(current, updatedActionable, validatedUpdates, user.id)

      // Log significant changes
      if (validatedUpdates.status && validatedUpdates.status !== current.status) {
        await this.logActivity(
          'actionable_status_changed',
          'meeting_actionable',
          actionableId,
          {
            previousStatus: current.status,
            newStatus: validatedUpdates.status,
            progressPercentage: updatedActionable.progressPercentage,
            updatedBy: user.id
          }
        )
      }

      return success(updatedActionable)
    }, 'updateActionable')
  }

  /**
   * Add a progress update to an actionable
   */
  async addProgressUpdate(updateRequest: CreateActionableUpdateRequest): Promise<Result<{
    update: ActionableUpdate
    actionable: MeetingActionable
  }>> {
    return this.executeDbOperation(async () => {
      // Validate input
      const validationResult = this.validateWithContext<CreateActionableUpdateRequest>(
        updateRequest,
        CreateActionableUpdateSchema,
        'progress update',
        'updateRequest'
      )
      if (!validationResult.success) return validationResult

      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      const user = userResult.data
      const validatedRequest = validationResult.data

      // Get current actionable
      const actionableResult = await this.repositories.meetingActionabless.findByIdWithUpdates(validatedRequest.actionableId)
      if (!actionableResult.success) return actionableResult

      const actionable = actionableResult.data

      // Validate permissions
      const permissionResult = await this.validateActionableUpdatePermission(user.id, actionable)
      if (!permissionResult.success) return permissionResult

      // Validate update consistency
      const updateValidationResult = this.validateProgressUpdate(validatedRequest, actionable)
      if (!updateValidationResult.success) return updateValidationResult

      // Add the update using repository
      const updateResult = await this.repositories.meetingActionabless.addUpdate(validatedRequest)
      if (!updateResult.success) return updateResult

      const update = updateResult.data

      // Get updated actionable
      const updatedActionableResult = await this.repositories.meetingActionabless.findByIdWithUpdates(validatedRequest.actionableId)
      if (!updatedActionableResult.success) return updatedActionableResult

      const updatedActionable = updatedActionableResult.data

      // Handle automatic escalation if progress is concerning
      if (this.shouldTriggerEscalation(updatedActionable, update)) {
        await this.triggerAutomaticEscalation(updatedActionable, 'progress_concern')
      }

      // Notify stakeholders of significant updates
      if (validatedRequest.updateType === 'status_change' || validatedRequest.updateType === 'completion') {
        await this.notifyStakeholders(updatedActionable, 'progress_updated', actionable.stakeholdersToNotify)
      }

      await this.logActivity(
        'actionable_progress_updated',
        'actionable_update',
        update.id,
        {
          actionableId: validatedRequest.actionableId,
          updateType: validatedRequest.updateType,
          newStatus: validatedRequest.newStatus,
          newProgress: validatedRequest.newProgress,
          hoursWorked: validatedRequest.hoursWorked
        }
      )

      return success({
        update,
        actionable: updatedActionable
      })
    }, 'addProgressUpdate')
  }

  /**
   * Escalate an actionable manually with business logic
   */
  async escalateActionable(
    actionableId: MeetingActionableId,
    escalationReason: string,
    escalatedTo?: UserId
  ): Promise<Result<MeetingActionable>> {
    return this.executeDbOperation(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      const user = userResult.data

      // Get current actionable
      const actionableResult = await this.repositories.meetingActionables.findByIdWithUpdates(actionableId)
      if (!actionableResult.success) return actionableResult

      const actionable = actionableResult.data

      // Validate permissions (assignee, supervisor, or superuser)
      const permissionResult = await this.validateEscalationPermission(user.id, actionable)
      if (!permissionResult.success) return permissionResult

      // Validate escalation is possible
      if (actionable.escalationLevel >= 5) {
        return failure(RepositoryError.businessRule(
          'maximum_escalation_reached',
          'Actionable has already reached maximum escalation level',
          { currentLevel: actionable.escalationLevel }
        ))
      }

      if (actionable.status === 'completed' || actionable.status === 'cancelled') {
        return failure(RepositoryError.businessRule(
          'cannot_escalate_closed_actionable',
          'Cannot escalate a completed or cancelled actionable',
          { currentStatus: actionable.status }
        ))
      }

      // Determine escalation target
      let finalEscalatedTo = escalatedTo
      if (!finalEscalatedTo && actionable.escalationPath.length > 0) {
        const nextLevelIndex = actionable.escalationLevel - 1
        if (nextLevelIndex < actionable.escalationPath.length) {
          finalEscalatedTo = actionable.escalationPath[nextLevelIndex]
        }
      }

      // Escalate using repository
      const escalationResult = await this.repositories.meetingActionables.escalate(
        actionableId,
        escalationReason
      )
      if (!escalationResult.success) return escalationResult

      const escalatedActionable = escalationResult.data

      // Notify escalation target
      if (finalEscalatedTo) {
        await this.notifyEscalation(escalatedActionable, finalEscalatedTo, escalationReason, user.id)
      }

      await this.logActivity(
        'actionable_escalated',
        'meeting_actionable',
        actionableId,
        {
          escalationLevel: escalatedActionable.escalationLevel,
          escalatedTo: finalEscalatedTo,
          escalationReason,
          escalatedBy: user.id,
          previousLevel: actionable.escalationLevel
        }
      )

      return success(escalatedActionable)
    }, 'escalateActionable')
  }

  /**
   * Delegate an actionable to another user
   */
  async delegateActionable(
    actionableId: MeetingActionableId,
    delegatedTo: UserId,
    delegationReason: string
  ): Promise<Result<MeetingActionable>> {
    return this.executeDbOperation(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      const user = userResult.data

      // Get current actionable
      const actionableResult = await this.repositories.meetingActionables.findByIdWithUpdates(actionableId)
      if (!actionableResult.success) return actionableResult

      const actionable = actionableResult.data

      // Validate permissions (current assignee or superuser)
      if (actionable.assignedTo !== user.id) {
        const superuserResult = await this.checkPermission(user.id, 'system', 'superuser')
        if (!superuserResult.success) {
          return failure(RepositoryError.forbidden(
            'actionable_delegation',
            'Only the current assignee or superuser can delegate actionables'
          ))
        }
      }

      // Validate delegate target
      const delegateValidationResult = await this.validateAssignee(
        delegatedTo,
        actionable.meetingId
      )
      if (!delegateValidationResult.success) return delegateValidationResult

      // Cannot delegate to self
      if (delegatedTo === user.id) {
        return failure(RepositoryError.businessRule(
          'self_delegation_not_allowed',
          'Cannot delegate actionable to yourself',
          { currentAssignee: user.id, delegatedTo }
        ))
      }

      // Update actionable assignment
      const updateResult = await this.repositories.meetingActionables.update(actionableId, {
        // Note: This would require extending the update schema to include delegation fields
        // For now, we'll handle this as a status update with notes
        status: 'assigned' as ActionableStatus
      })
      if (!updateResult.success) return updateResult

      // Create delegation record as an update
      const delegationUpdateResult = await this.repositories.meetingActionables.addUpdate({
        actionableId,
        updateType: 'delegation',
        updateNotes: `Delegated from ${user.id} to ${delegatedTo}. Reason: ${delegationReason}`
      })

      const delegatedActionable = updateResult.data

      // Notify new assignee
      await this.notifyDelegation(delegatedActionable, delegatedTo, user.id, delegationReason)

      await this.logActivity(
        'actionable_delegated',
        'meeting_actionable',
        actionableId,
        {
          delegatedFrom: user.id,
          delegatedTo,
          delegationReason,
          previousAssignee: actionable.assignedTo
        }
      )

      return success(delegatedActionable)
    }, 'delegateActionable')
  }

  // ============================================================================
  // PUBLIC METHODS - ANALYTICS AND REPORTING
  // ============================================================================

  /**
   * Get comprehensive actionable analytics
   */
  async getActionableAnalytics(
    organizationId: OrganizationId,
    timeframe?: { from: string; to: string }
  ): Promise<Result<ActionablesAnalytics>> {
    return this.executeDbOperation(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      // Check organization permissions
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'organization',
        'view_analytics',
        organizationId
      )
      if (!permissionResult.success) return permissionResult

      // Get actionable statistics
      const statsResult = await this.repositories.meetingActionables.getStats(organizationId)
      if (!statsResult.success) return statsResult

      const stats = statsResult.data

      // Calculate additional analytics
      const analytics: ActionablesAnalytics = {
        totalActionables: stats.totalActionables,
        completedActionables: stats.completedActionables,
        overdueActionables: stats.overdueActionables,
        averageCompletionTime: stats.averageCompletionTime,
        completionRate: stats.completionRate,
        actionablesByPriority: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        actionablesByCategory: {
          follow_up: 0,
          research: 0,
          implementation: 0,
          compliance: 0,
          reporting: 0,
          communication: 0,
          approval: 0,
          review: 0,
          other: 0
        },
        userProductivity: {}
      }

      await this.logActivity(
        'analytics_generated',
        'actionable_analytics',
        undefined,
        { organizationId, timeframe, totalActionables: stats.totalActionables }
      )

      return success(analytics)
    }, 'getActionableAnalytics')
  }

  /**
   * Get overdue actionables with escalation recommendations
   */
  async getOverdueActionables(
    organizationId: OrganizationId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<MeetingActionable & {
    daysOverdue: number
    recommendedEscalationLevel: number
    escalationReason: string
  }>>> {
    return this.executeDbOperation(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      // Check permissions
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'organization',
        'view_actionables',
        organizationId
      )
      if (!permissionResult.success) return permissionResult

      // Get overdue actionables
      const overdueResult = await this.repositories.meetingActionables.findOverdue(organizationId, options)
      if (!overdueResult.success) return overdueResult

      const now = new Date()
      const enrichedActionables = overdueResult.data.items.map(actionable => {
        const dueDate = new Date(actionable.dueDate)
        const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        
        const escalationLevel = this.calculateRecommendedEscalationLevel(daysOverdue)
        const escalationReason = this.generateEscalationReason(daysOverdue, actionable)

        return {
          ...actionable,
          daysOverdue,
          recommendedEscalationLevel: escalationLevel,
          escalationReason
        }
      })

      return success({
        ...overdueResult.data,
        items: enrichedActionables
      })
    }, 'getOverdueActionables')
  }

  /**
   * Process automatic escalations for overdue actionables
   */
  async processAutomaticEscalations(organizationId: OrganizationId): Promise<Result<{
    processedCount: number
    escalatedCount: number
    errors: string[]
  }>> {
    return this.executeDbOperation(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      // Check permissions (superuser only)
      const permissionResult = await this.checkPermission(userResult.data.id, 'system', 'superuser')
      if (!permissionResult.success) return permissionResult

      // Get all overdue actionables
      const overdueResult = await this.repositories.meetingActionables.findOverdue(organizationId)
      if (!overdueResult.success) return overdueResult

      const overdueActionables = overdueResult.data.items
      let processedCount = 0
      let escalatedCount = 0
      const errors: string[] = []

      // Process each overdue actionable
      for (const actionable of overdueActionables) {
        try {
          processedCount++
          
          const now = new Date()
          const dueDate = new Date(actionable.dueDate)
          const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

          // Check if escalation is warranted
          if (this.shouldAutoEscalate(actionable, daysOverdue)) {
            const escalationResult = await this.triggerAutomaticEscalation(
              actionable,
              'automatic_overdue_escalation'
            )
            
            if (escalationResult.success) {
              escalatedCount++
            } else {
              errors.push(`Failed to escalate ${actionable.id}: ${escalationResult.error.message}`)
            }
          }
        } catch (error) {
          errors.push(`Error processing ${actionable.id}: ${error}`)
        }
      }

      await this.logActivity(
        'automatic_escalations_processed',
        'system',
        undefined,
        {
          organizationId,
          processedCount,
          escalatedCount,
          errorCount: errors.length
        }
      )

      return success({
        processedCount,
        escalatedCount,
        errors
      })
    }, 'processAutomaticEscalations')
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private async validateAssignee(assigneeId: UserId, meetingId: MeetingId): Promise<Result<boolean>> {
    // Check if assignee exists - placeholder implementation
    // In real implementation, this would check user existence

    // Check if assignee has permission to be assigned actionables in this meeting
    const permissionResult = await this.checkPermission(
      assigneeId,
      'meeting_actionable',
      'be_assigned',
      meetingId
    )
    if (!permissionResult.success) {
      return failure(RepositoryError.businessRule(
        'assignee_no_permission',
        'Assignee does not have permission to receive actionables for this meeting',
        { assigneeId, meetingId }
      ))
    }

    return success(true)
  }

  private validateDueDate(dueDate: string): Result<boolean> {
    const date = new Date(dueDate)
    const now = new Date()
    
    // Due date must be in the future
    if (date <= now) {
      return failure(RepositoryError.businessRule(
        'due_date_past',
        'Due date must be in the future',
        { dueDate, currentDate: now.toISOString() }
      ))
    }

    // Due date cannot be more than 2 years in the future
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 2)
    
    if (date > maxDate) {
      return failure(RepositoryError.businessRule(
        'due_date_too_far',
        'Due date cannot be more than 2 years in the future',
        { dueDate, maxDate: maxDate.toISOString() }
      ))
    }

    return success(true)
  }

  private async validateDependencies(
    dependencyIds: string[],
    meetingId: MeetingId
  ): Promise<Result<boolean>> {
    // Check dependency limits
    if (dependencyIds.length > 10) {
      return failure(RepositoryError.businessRule(
        'too_many_dependencies',
        'Actionable cannot depend on more than 10 other actionables',
        { dependencyCount: dependencyIds.length }
      ))
    }

    // Validate each dependency exists and is accessible
    for (const depId of dependencyIds) {
      const depResult = await this.repositories.meetingActionables.findById(depId)
      if (!depResult.success) {
        return failure(RepositoryError.businessRule(
          'dependency_not_found',
          `Dependent actionable ${depId} not found`,
          { dependencyId: depId }
        ))
      }

      const dependency = depResult.data
      
      // Dependencies must be from the same meeting or completed actionables from previous meetings
      if (dependency.meetingId !== meetingId && dependency.status !== 'completed') {
        return failure(RepositoryError.businessRule(
          'cross_meeting_dependency',
          'Can only depend on actionables from the same meeting or completed actionables from other meetings',
          { dependencyId: depId, dependencyMeetingId: dependency.meetingId }
        ))
      }
    }

    // TODO: Check for circular dependencies
    return success(true)
  }

  private async validateEscalationPath(
    escalationPath: UserId[],
    meetingId: MeetingId
  ): Promise<Result<boolean>> {
    if (escalationPath.length > 5) {
      return failure(RepositoryError.businessRule(
        'escalation_path_too_long',
        'Escalation path cannot have more than 5 levels',
        { pathLength: escalationPath.length }
      ))
    }

    // Validate each user in the escalation path exists and has appropriate permissions
    for (let i = 0; i < escalationPath.length; i++) {
      const userId = escalationPath[i]
      
      const userResult = await this.repositories.user.findById(userId)
      if (!userResult.success) {
        return failure(RepositoryError.businessRule(
          'escalation_user_not_found',
          `Escalation path user ${userId} not found`,
          { userId, escalationLevel: i + 1 }
        ))
      }

      // Check if user has appropriate escalation permissions
      const permissionResult = await this.checkPermission(
        userId,
        'meeting_actionable',
        'escalation_target',
        meetingId
      )
      if (!permissionResult.success) {
        return failure(RepositoryError.businessRule(
          'escalation_user_no_permission',
          `User ${userId} cannot be in escalation path - insufficient permissions`,
          { userId, escalationLevel: i + 1 }
        ))
      }
    }

    return success(true)
  }

  private async validateActionableUpdatePermission(
    userId: UserId,
    actionable: ActionableWithUpdates
  ): Promise<Result<boolean>> {
    // Current assignee can always update
    if (actionable.assignedTo === userId) {
      return success(true)
    }

    // Assigner can update
    if (actionable.assignedBy === userId) {
      return success(true)
    }

    // Superuser can update
    const superuserResult = await this.checkPermission(userId, 'system', 'superuser')
    if (superuserResult.success) {
      return success(true)
    }

    // Meeting chair can update
    const chairResult = await this.checkPermission(userId, 'meeting', 'chair', actionable.meetingId)
    if (chairResult.success) {
      return success(true)
    }

    return failure(RepositoryError.forbidden(
      'actionable_update',
      'Insufficient permissions to update this actionable'
    ))
  }

  private async validateStatusTransition(
    currentStatus: ActionableStatus,
    newStatus: ActionableStatus,
    actionable: ActionableWithUpdates,
    userId: UserId
  ): Promise<Result<boolean>> {
    const allowedTransitions: Record<ActionableStatus, ActionableStatus[]> = {
      'assigned': ['in_progress', 'blocked', 'cancelled'],
      'in_progress': ['blocked', 'under_review', 'completed', 'cancelled'],
      'blocked': ['in_progress', 'cancelled'],
      'under_review': ['in_progress', 'completed', 'cancelled'],
      'completed': [], // Final state
      'cancelled': [], // Final state
      'overdue': ['in_progress', 'completed', 'cancelled'] // System-set status
    }

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      return failure(RepositoryError.businessRule(
        'invalid_status_transition',
        `Cannot transition from ${currentStatus} to ${newStatus}`,
        { 
          currentStatus, 
          newStatus, 
          allowedTransitions: allowedTransitions[currentStatus] 
        }
      ))
    }

    // Additional validation for specific transitions
    if (newStatus === 'completed') {
      // Check if dependencies are completed
      const dependencyCheckResult = await this.checkDependencyCompletion(actionable)
      if (!dependencyCheckResult.success) return dependencyCheckResult

      // Require completion notes for certain categories
      if (['compliance', 'reporting', 'approval'].includes(actionable.category)) {
        // This would be validated in the update request
      }
    }

    if (newStatus === 'under_review' && actionable.requiresApproval) {
      // Ensure deliverable is provided
      if (!actionable.deliverableLocation) {
        return failure(RepositoryError.businessRule(
          'deliverable_required_for_review',
          'Deliverable location must be provided before submitting for review',
          { actionableId: actionable.id }
        ))
      }
    }

    return success(true)
  }

  private validateProgressConsistency(
    progressPercentage: number,
    status: ActionableStatus
  ): Result<boolean> {
    // Status and progress must be consistent
    const expectedProgressRanges: Record<ActionableStatus, [number, number]> = {
      'assigned': [0, 10],
      'in_progress': [1, 99],
      'blocked': [0, 100],
      'under_review': [80, 100],
      'completed': [100, 100],
      'cancelled': [0, 100],
      'overdue': [0, 100]
    }

    const [minProgress, maxProgress] = expectedProgressRanges[status]
    
    if (progressPercentage < minProgress || progressPercentage > maxProgress) {
      return failure(RepositoryError.businessRule(
        'progress_status_mismatch',
        `Progress ${progressPercentage}% is not consistent with status ${status}`,
        { 
          progressPercentage, 
          status, 
          expectedRange: [minProgress, maxProgress] 
        }
      ))
    }

    return success(true)
  }

  private validateDueDateChange(
    currentActionable: ActionableWithUpdates,
    newDueDate: string,
    userId: UserId
  ): Result<boolean> {
    const currentDate = new Date(currentActionable.dueDate)
    const newDate = new Date(newDueDate)

    // Cannot move due date to the past
    if (newDate < new Date()) {
      return failure(RepositoryError.businessRule(
        'due_date_cannot_be_past',
        'Cannot set due date in the past',
        { newDueDate, currentDate: new Date().toISOString() }
      ))
    }

    // Significant extensions may require approval
    const extensionDays = Math.ceil((newDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (extensionDays > 30) {
      // This would require additional approval validation
      return failure(RepositoryError.businessRule(
        'large_extension_requires_approval',
        'Due date extensions over 30 days require additional approval',
        { extensionDays, currentDueDate: currentActionable.dueDate, newDueDate }
      ))
    }

    return success(true)
  }

  private validateProgressUpdate(
    updateRequest: CreateActionableUpdateRequest,
    actionable: ActionableWithUpdates
  ): Result<boolean> {
    // Validate consistency between update type and data
    if (updateRequest.updateType === 'completion' && updateRequest.newProgress !== 100) {
      return failure(RepositoryError.businessRule(
        'completion_update_progress_mismatch',
        'Completion updates must set progress to 100%',
        { updateType: updateRequest.updateType, newProgress: updateRequest.newProgress }
      ))
    }

    if (updateRequest.updateType === 'status_change' && !updateRequest.newStatus) {
      return failure(RepositoryError.businessRule(
        'status_change_missing_status',
        'Status change updates must specify new status',
        { updateType: updateRequest.updateType }
      ))
    }

    // Validate time period consistency
    if (updateRequest.timePeriodStart && updateRequest.timePeriodEnd) {
      const start = new Date(updateRequest.timePeriodStart)
      const end = new Date(updateRequest.timePeriodEnd)
      
      if (end <= start) {
        return failure(RepositoryError.businessRule(
          'invalid_time_period',
          'Time period end must be after start',
          { timePeriodStart: updateRequest.timePeriodStart, timePeriodEnd: updateRequest.timePeriodEnd }
        ))
      }
    }

    return success(true)
  }

  private async checkDependencyCompletion(actionable: ActionableWithUpdates): Promise<Result<boolean>> {
    // Check if all blocking actionables are completed
    for (const blockingActionable of actionable.blockingActionables) {
      if (blockingActionable.status !== 'completed') {
        return failure(RepositoryError.businessRule(
          'dependency_not_completed',
          `Cannot complete actionable while dependency "${blockingActionable.title}" is not completed`,
          { 
            actionableId: actionable.id,
            dependencyId: blockingActionable.id,
            dependencyStatus: blockingActionable.status 
          }
        ))
      }
    }

    return success(true)
  }

  // ============================================================================
  // PRIVATE METHODS - BUSINESS LOGIC
  // ============================================================================

  private async handlePostUpdateActions(
    previous: ActionableWithUpdates,
    updated: MeetingActionable,
    updates: UpdateActionableRequest,
    updatedBy: UserId
  ): Promise<void> {
    // Handle status-specific actions
    if (updates.status && updates.status !== previous.status) {
      switch (updates.status) {
        case 'completed':
          await this.handleActionableCompletion(updated, updatedBy)
          break
        case 'blocked':
          await this.handleActionableBlocked(updated, updatedBy)
          break
        case 'under_review':
          await this.handleActionableUnderReview(updated, updatedBy)
          break
      }
    }

    // Update reminder schedules if due date changed
    if (updates.dueDate) {
      await this.rescheduleReminders(updated)
    }

    // Check for automatic escalation triggers
    if (this.shouldTriggerEscalation(updated)) {
      await this.triggerAutomaticEscalation(updated, 'status_change')
    }
  }

  private async handleActionableCompletion(actionable: MeetingActionable, completedBy: UserId): Promise<void> {
    // Notify stakeholders of completion
    if (actionable.stakeholdersToNotify.length > 0) {
      await this.notifyStakeholders(actionable, 'completed', actionable.stakeholdersToNotify)
    }

    // Check if this unblocks any dependent actionables
    const dependentActionables = await this.getDependentActionables(actionable.id)
    for (const dependent of dependentActionables) {
      await this.checkAndNotifyUnblocked(dependent)
    }

    // Generate success metrics report if specified
    if (actionable.successMetrics) {
      await this.generateCompletionReport(actionable, completedBy)
    }
  }

  private async handleActionableBlocked(actionable: MeetingActionable, blockedBy: UserId): Promise<void> {
    // Escalate blocked items faster
    if (actionable.priority === 'critical' || actionable.priority === 'high') {
      await this.triggerAutomaticEscalation(actionable, 'blocked_high_priority')
    }

    // Notify assigner and escalation path
    await this.notifyActionableBlocked(actionable, blockedBy)
  }

  private async handleActionableUnderReview(actionable: MeetingActionable, submittedBy: UserId): Promise<void> {
    // Notify approvers if approval is required
    if (actionable.requiresApproval && actionable.approvedBy) {
      await this.notifyApprovalRequired(actionable, actionable.approvedBy, submittedBy)
    }

    // Set review deadline
    await this.setReviewDeadline(actionable)
  }

  private shouldTriggerEscalation(
    actionable: MeetingActionable,
    update?: ActionableUpdate
  ): boolean {
    const now = new Date()
    const dueDate = new Date(actionable.dueDate)
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Escalate if overdue
    if (daysUntilDue < 0) return true

    // Escalate high priority items approaching due date
    if (actionable.priority === 'critical' && daysUntilDue <= 1) return true
    if (actionable.priority === 'high' && daysUntilDue <= 2) return true

    // Escalate if progress is concerning
    if (update && this.isProgressConcerning(actionable, update)) return true

    // Escalate if blocked for too long
    if (actionable.status === 'blocked' && actionable.updatedAt) {
      const daysSinceUpdate = Math.ceil((now.getTime() - new Date(actionable.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceUpdate >= 3
    }

    return false
  }

  private isProgressConcerning(actionable: MeetingActionable, update: ActionableUpdate): boolean {
    // Check if challenges mentioned
    if (update.challengesFaced && update.challengesFaced.length > 100) return true

    // Check if support needed
    if (update.supportNeeded && update.supportNeeded.length > 50) return true

    // Check progress vs time remaining
    const now = new Date()
    const dueDate = new Date(actionable.dueDate)
    const startDate = new Date(actionable.assignedAt)
    
    const totalDuration = dueDate.getTime() - startDate.getTime()
    const elapsed = now.getTime() - startDate.getTime()
    const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100)

    // If actual progress is significantly behind expected progress
    return actionable.progressPercentage < (expectedProgress - 20)
  }

  private async triggerAutomaticEscalation(
    actionable: MeetingActionable,
    reason: string
  ): Promise<Result<MeetingActionable>> {
    if (actionable.escalationLevel >= 5) {
      return failure(RepositoryError.businessRule(
        'max_escalation_reached',
        'Cannot escalate further - maximum level reached'
      ))
    }

    return this.repositories.meetingActionables.escalate(actionable.id, `Automatic escalation: ${reason}`)
  }

  private shouldAutoEscalate(actionable: MeetingActionable, daysOverdue: number): boolean {
    const config = MeetingActionableService.DEFAULT_ESCALATION_CONFIG
    
    // Find appropriate escalation level for days overdue
    const targetLevel = config.escalationLevels
      .filter(level => daysOverdue >= level.daysOverdue)
      .pop()

    return targetLevel ? actionable.escalationLevel < targetLevel.level : false
  }

  private calculateRecommendedEscalationLevel(daysOverdue: number): number {
    const config = MeetingActionableService.DEFAULT_ESCALATION_CONFIG
    
    const targetLevel = config.escalationLevels
      .filter(level => daysOverdue >= level.daysOverdue)
      .pop()

    return targetLevel ? targetLevel.level : 1
  }

  private generateEscalationReason(daysOverdue: number, actionable: MeetingActionable): string {
    const config = MeetingActionableService.DEFAULT_ESCALATION_CONFIG
    const targetLevel = config.escalationLevels
      .filter(level => daysOverdue >= level.daysOverdue)
      .pop()

    return targetLevel 
      ? `${targetLevel.description} (${daysOverdue} days overdue)`
      : `Overdue by ${daysOverdue} days`
  }

  private async validateEscalationPermission(userId: UserId, actionable: ActionableWithUpdates): Promise<Result<boolean>> {
    // Current assignee can escalate
    if (actionable.assignedTo === userId) return success(true)

    // Assigner can escalate
    if (actionable.assignedBy === userId) return success(true)

    // Superuser can escalate
    const superuserResult = await this.checkPermission(userId, 'system', 'superuser')
    if (superuserResult.success) return success(true)

    // Meeting chair can escalate
    const chairResult = await this.checkPermission(userId, 'meeting', 'chair', actionable.meetingId)
    if (chairResult.success) return success(true)

    return failure(RepositoryError.forbidden('actionable_escalation', 'Insufficient permissions to escalate'))
  }

  // ============================================================================
  // PLACEHOLDER METHODS - TO BE IMPLEMENTED
  // ============================================================================

  private async scheduleReminders(actionable: MeetingActionable): Promise<void> {
    // Implementation would integrate with notification/scheduling system
    await this.logActivity('reminders_scheduled', 'meeting_actionable', actionable.id)
  }

  private async rescheduleReminders(actionable: MeetingActionable): Promise<void> {
    // Implementation would update scheduled reminders
    await this.logActivity('reminders_rescheduled', 'meeting_actionable', actionable.id)
  }

  private async notifyStakeholders(
    actionable: MeetingActionable, 
    eventType: string, 
    stakeholders: UserId[]
  ): Promise<void> {
    // Implementation would send notifications to stakeholders
    await this.logActivity(`stakeholders_notified_${eventType}`, 'meeting_actionable', actionable.id)
  }

  private async notifyEscalation(
    actionable: MeetingActionable,
    escalatedTo: UserId,
    reason: string,
    escalatedBy: UserId
  ): Promise<void> {
    // Implementation would send escalation notification
    await this.logActivity('escalation_notification_sent', 'meeting_actionable', actionable.id)
  }

  private async notifyDelegation(
    actionable: MeetingActionable,
    delegatedTo: UserId,
    delegatedBy: UserId,
    reason: string
  ): Promise<void> {
    // Implementation would send delegation notification
    await this.logActivity('delegation_notification_sent', 'meeting_actionable', actionable.id)
  }

  private async notifyActionableBlocked(actionable: MeetingActionable, blockedBy: UserId): Promise<void> {
    await this.logActivity('blocked_notification_sent', 'meeting_actionable', actionable.id)
  }

  private async notifyApprovalRequired(
    actionable: MeetingActionable,
    approver: UserId,
    submittedBy: UserId
  ): Promise<void> {
    await this.logActivity('approval_notification_sent', 'meeting_actionable', actionable.id)
  }

  private async getDependentActionables(actionableId: MeetingActionableId): Promise<MeetingActionable[]> {
    // Implementation would get actionables that depend on this one
    return []
  }

  private async checkAndNotifyUnblocked(actionable: MeetingActionable): Promise<void> {
    // Implementation would check if actionable is now unblocked and notify
    await this.logActivity('unblocked_check', 'meeting_actionable', actionable.id)
  }

  private async generateCompletionReport(actionable: MeetingActionable, completedBy: UserId): Promise<void> {
    // Implementation would generate completion report
    await this.logActivity('completion_report_generated', 'meeting_actionable', actionable.id)
  }

  private async setReviewDeadline(actionable: MeetingActionable): Promise<void> {
    // Implementation would set review deadline
    await this.logActivity('review_deadline_set', 'meeting_actionable', actionable.id)
  }

  /**
   * Validate meeting access and permissions
   */
  private async validateMeetingAccess(meetingId: MeetingId, userId: UserId): Promise<Result<boolean>> {
    // This would validate the meeting exists and user has access
    // For now, returning success as placeholder
    return success(true)
  }
}