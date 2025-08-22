import { BaseService } from './base.service'
import { EventBus, DomainEvent, DomainEventTypes } from './event-bus.service'
import { Result, success, failure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  version: string
  trigger_type: 'manual' | 'event' | 'schedule' | 'webhook'
  trigger_config: Record<string, any>
  steps: WorkflowStep[]
  variables: WorkflowVariable[]
  status: 'draft' | 'active' | 'inactive' | 'archived'
  organization_id?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface WorkflowStep {
  id: string
  name: string
  type: 'action' | 'condition' | 'wait' | 'approval' | 'notification' | 'integration'
  config: WorkflowStepConfig
  next_steps: string[]
  timeout_seconds?: number
  retry_policy?: RetryPolicy
  order: number
}

export interface WorkflowStepConfig {
  action_type?: string
  conditions?: WorkflowCondition[]
  wait_duration?: number
  approval_config?: ApprovalConfig
  notification_config?: NotificationConfig
  integration_config?: IntegrationConfig
  variables?: Record<string, any>
}

export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
  logic_operator?: 'and' | 'or'
}

export interface ApprovalConfig {
  approvers: string[]
  approval_type: 'any' | 'all' | 'majority'
  timeout_action: 'approve' | 'reject' | 'escalate'
  escalation_users?: string[]
  reminder_intervals?: number[]
}

export interface NotificationConfig {
  recipients: string[]
  template: string
  channel: 'email' | 'push' | 'sms' | 'webhook'
  variables?: Record<string, any>
}

export interface IntegrationConfig {
  service: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  payload?: Record<string, any>
  auth_config?: Record<string, any>
}

export interface WorkflowVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'
  default_value?: any
  required: boolean
  description?: string
}

export interface RetryPolicy {
  max_attempts: number
  delay_seconds: number
  backoff_multiplier?: number
  max_delay_seconds?: number
}

export interface WorkflowExecution {
  id: string
  workflow_id: string
  trigger_data: Record<string, any>
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
  current_step_id?: string
  variables: Record<string, any>
  execution_log: WorkflowExecutionLog[]
  started_by?: string
  started_at: string
  completed_at?: string
  error_message?: string
}

export interface WorkflowExecutionLog {
  id: string
  execution_id: string
  step_id: string
  step_name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  started_at: string
  completed_at?: string
  input_data?: Record<string, any>
  output_data?: Record<string, any>
  error_message?: string
  retry_count: number
}

export interface WorkflowApproval {
  id: string
  execution_id: string
  step_id: string
  approver_id: string
  status: 'pending' | 'approved' | 'rejected'
  comment?: string
  responded_at?: string
  created_at: string
}

export interface WorkflowTrigger {
  id: string
  workflow_id: string
  trigger_type: string
  event_type?: string
  schedule_cron?: string
  webhook_url?: string
  is_active: boolean
  last_triggered?: string
  trigger_count: number
}

export class WorkflowService extends BaseService {
  constructor(
    supabase: SupabaseClient<Database>,
    private eventBus: EventBus
  ) {
    super(supabase)
    this.setupEventHandlers()
  }

  /**
   * Create a new workflow definition
   */
  async createWorkflow(workflowData: Omit<WorkflowDefinition, 'id' | 'created_at' | 'updated_at'>): Promise<Result<WorkflowDefinition>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    // Validate workflow definition
    const validationResult = this.validateWorkflowDefinition(workflowData)
    if (!validationResult.success) {
      return validationResult
    }

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('workflow_definitions')
        .insert({
          ...workflowData,
          created_by: currentUserResult.data.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Create workflow trigger if specified
      if (workflowData.trigger_type !== 'manual') {
        await this.createWorkflowTrigger(data.id, workflowData.trigger_type, workflowData.trigger_config)
      }

      // Publish workflow created event
      await this.eventBus.publish(this.eventBus.createEvent(
        'workflow.created',
        data.id,
        'workflow',
        { workflowId: data.id, name: data.name, createdBy: currentUserResult.data.id }
      ))

      // Log the activity
      await this.logActivity('create_workflow', 'workflow', data.id, workflowData)

      return data as WorkflowDefinition
    }, 'createWorkflow', workflowData)
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: Record<string, any> = {},
    triggeredBy?: string
  ): Promise<Result<WorkflowExecution>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      // Get workflow definition
      const { data: workflow, error: workflowError } = await this.supabase
        .from('workflow_definitions')
        .select('*')
        .eq('id', workflowId)
        .eq('status', 'active')
        .single()

      if (workflowError || !workflow) {
        throw new Error('Workflow not found or inactive')
      }

      // Create execution record
      const { data: execution, error: executionError } = await this.supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflowId,
          trigger_data: triggerData,
          status: 'running',
          variables: this.initializeWorkflowVariables(workflow.variables, triggerData),
          started_by: triggeredBy || currentUserResult.data.id,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (executionError) {
        throw executionError
      }

      // Publish workflow execution started event
      await this.eventBus.publish(this.eventBus.createEvent(
        'workflow.execution_started',
        execution.id,
        'workflow_execution',
        { 
          workflowId, 
          executionId: execution.id, 
          triggerData,
          startedBy: triggeredBy || currentUserResult.data.id
        }
      ))

      // Start executing workflow steps asynchronously
      this.executeWorkflowSteps(execution.id, workflow).catch(error => {
        console.error('Workflow execution failed:', error)
        this.markExecutionFailed(execution.id, error.message)
      })

      return execution as WorkflowExecution
    }, 'executeWorkflow', { workflowId, triggerData, triggeredBy })
  }

  /**
   * Get workflow execution status
   */
  async getWorkflowExecution(executionId: string): Promise<Result<WorkflowExecution & { logs: WorkflowExecutionLog[] }>> {
    return this.executeDbOperation(async () => {
      const { data: execution, error: executionError } = await this.supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .single()

      if (executionError) {
        throw executionError
      }

      const { data: logs, error: logsError } = await this.supabase
        .from('workflow_execution_logs')
        .select('*')
        .eq('execution_id', executionId)
        .order('started_at', { ascending: true })

      if (logsError) {
        throw logsError
      }

      return {
        ...execution,
        logs: logs || []
      } as WorkflowExecution & { logs: WorkflowExecutionLog[] }
    }, 'getWorkflowExecution', { executionId })
  }

  /**
   * Cancel a running workflow execution
   */
  async cancelWorkflowExecution(executionId: string, reason?: string): Promise<Result<void>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      const { error } = await this.supabase
        .from('workflow_executions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          error_message: reason
        })
        .eq('id', executionId)
        .eq('status', 'running')

      if (error) {
        throw error
      }

      // Publish workflow cancelled event
      await this.eventBus.publish(this.eventBus.createEvent(
        'workflow.execution_cancelled',
        executionId,
        'workflow_execution',
        { executionId, reason, cancelledBy: currentUserResult.data.id }
      ))

      // Log the activity
      await this.logActivity('cancel_workflow_execution', 'workflow_execution', executionId, { reason })

    }, 'cancelWorkflowExecution', { executionId, reason })
  }

  /**
   * Approve workflow step
   */
  async approveWorkflowStep(
    executionId: string,
    stepId: string,
    comment?: string
  ): Promise<Result<void>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      // Create approval record
      const { error: approvalError } = await this.supabase
        .from('workflow_approvals')
        .insert({
          execution_id: executionId,
          step_id: stepId,
          approver_id: currentUserResult.data.id,
          status: 'approved',
          comment,
          responded_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      if (approvalError) {
        throw approvalError
      }

      // Check if all required approvals are received
      const approvalComplete = await this.checkApprovalComplete(executionId, stepId)
      
      if (approvalComplete) {
        await this.continueWorkflowExecution(executionId, stepId)
      }

      // Publish approval event
      await this.eventBus.publish(this.eventBus.createEvent(
        'workflow.step_approved',
        executionId,
        'workflow_execution',
        { 
          executionId, 
          stepId, 
          approverId: currentUserResult.data.id,
          comment,
          approvalComplete
        }
      ))

      // Log the activity
      await this.logActivity('approve_workflow_step', 'workflow_execution', executionId, { 
        stepId, 
        comment 
      })

    }, 'approveWorkflowStep', { executionId, stepId, comment })
  }

  /**
   * Reject workflow step
   */
  async rejectWorkflowStep(
    executionId: string,
    stepId: string,
    comment?: string
  ): Promise<Result<void>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      // Create rejection record
      const { error: approvalError } = await this.supabase
        .from('workflow_approvals')
        .insert({
          execution_id: executionId,
          step_id: stepId,
          approver_id: currentUserResult.data.id,
          status: 'rejected',
          comment,
          responded_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      if (approvalError) {
        throw approvalError
      }

      // Mark execution as failed due to rejection
      await this.markExecutionFailed(executionId, `Step ${stepId} was rejected: ${comment || 'No reason provided'}`)

      // Publish rejection event
      await this.eventBus.publish(this.eventBus.createEvent(
        'workflow.step_rejected',
        executionId,
        'workflow_execution',
        { 
          executionId, 
          stepId, 
          rejectedBy: currentUserResult.data.id,
          comment
        }
      ))

      // Log the activity
      await this.logActivity('reject_workflow_step', 'workflow_execution', executionId, { 
        stepId, 
        comment 
      })

    }, 'rejectWorkflowStep', { executionId, stepId, comment })
  }

  /**
   * Get workflow definitions for an organization
   */
  async getWorkflows(
    organizationId?: string,
    options: {
      status?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<Result<{ workflows: WorkflowDefinition[], total: number }>> {
    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('workflow_definitions')
        .select('*', { count: 'exact' })

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      if (options.status) {
        query = query.eq('status', options.status)
      }

      query = query
        .order('created_at', { ascending: false })
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1)

      const { data, error, count } = await query

      if (error) {
        throw error
      }

      return {
        workflows: data as WorkflowDefinition[],
        total: count || 0
      }
    }, 'getWorkflows', { organizationId, options })
  }

  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(
    workflowId?: string,
    options: {
      status?: string
      limit?: number
      offset?: number
      startDate?: string
      endDate?: string
    } = {}
  ): Promise<Result<{ executions: WorkflowExecution[], total: number }>> {
    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('workflow_executions')
        .select('*', { count: 'exact' })

      if (workflowId) {
        query = query.eq('workflow_id', workflowId)
      }

      if (options.status) {
        query = query.eq('status', options.status)
      }

      if (options.startDate) {
        query = query.gte('started_at', options.startDate)
      }

      if (options.endDate) {
        query = query.lte('started_at', options.endDate)
      }

      query = query
        .order('started_at', { ascending: false })
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1)

      const { data, error, count } = await query

      if (error) {
        throw error
      }

      return {
        executions: data as WorkflowExecution[],
        total: count || 0
      }
    }, 'getWorkflowExecutions', { workflowId, options })
  }

  /**
   * Private helper methods
   */
  private validateWorkflowDefinition(workflow: Omit<WorkflowDefinition, 'id' | 'created_at' | 'updated_at'>): Result<void> {
    if (!workflow.name || workflow.name.trim().length === 0) {
      return failure(new Error('Workflow name is required'))
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      return failure(new Error('Workflow must have at least one step'))
    }

    // Validate step references
    const stepIds = new Set(workflow.steps.map(s => s.id))
    for (const step of workflow.steps) {
      for (const nextStepId of step.next_steps) {
        if (!stepIds.has(nextStepId)) {
          return failure(new Error(`Step ${step.id} references non-existent step ${nextStepId}`))
        }
      }
    }

    return success(undefined)
  }

  private async createWorkflowTrigger(
    workflowId: string,
    triggerType: string,
    triggerConfig: Record<string, any>
  ): Promise<void> {
    const triggerData: any = {
      workflow_id: workflowId,
      trigger_type: triggerType,
      is_active: true,
      trigger_count: 0
    }

    if (triggerType === 'event') {
      triggerData.event_type = triggerConfig.event_type
    } else if (triggerType === 'schedule') {
      triggerData.schedule_cron = triggerConfig.cron_expression
    } else if (triggerType === 'webhook') {
      triggerData.webhook_url = `/api/workflows/${workflowId}/webhook`
    }

    await this.supabase
      .from('workflow_triggers')
      .insert(triggerData)
  }

  private initializeWorkflowVariables(
    variableDefinitions: WorkflowVariable[],
    triggerData: Record<string, any>
  ): Record<string, any> {
    const variables: Record<string, any> = {}

    // Set default values
    variableDefinitions.forEach(variable => {
      variables[variable.name] = variable.default_value
    })

    // Override with trigger data
    Object.assign(variables, triggerData)

    return variables
  }

  private async executeWorkflowSteps(executionId: string, workflow: WorkflowDefinition): Promise<void> {
    const steps = workflow.steps.sort((a, b) => a.order - b.order)
    let currentStepIndex = 0

    while (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex]
      
      try {
        await this.executeWorkflowStep(executionId, step, workflow.variables)
        
        // Check if step completed successfully
        const stepCompleted = await this.isStepCompleted(executionId, step.id)
        if (!stepCompleted) {
          // Step is waiting (e.g., for approval), exit execution loop
          return
        }

        // Move to next steps
        if (step.next_steps.length === 0) {
          // No more steps, mark workflow as completed
          await this.markExecutionCompleted(executionId)
          return
        }

        // For simplicity, just move to the first next step
        // In a real implementation, this would handle conditional branching
        const nextStepId = step.next_steps[0]
        const nextStepIndex = steps.findIndex(s => s.id === nextStepId)
        
        if (nextStepIndex === -1) {
          throw new Error(`Next step ${nextStepId} not found`)
        }

        currentStepIndex = nextStepIndex

      } catch (error) {
        await this.markStepFailed(executionId, step.id, error instanceof Error ? error.message : String(error))
        await this.markExecutionFailed(executionId, `Step ${step.name} failed: ${error instanceof Error ? error.message : String(error)}`)
        return
      }
    }

    await this.markExecutionCompleted(executionId)
  }

  private async executeWorkflowStep(
    executionId: string,
    step: WorkflowStep,
    workflowVariables: WorkflowVariable[]
  ): Promise<void> {
    // Log step start
    const { data: logEntry } = await this.supabase
      .from('workflow_execution_logs')
      .insert({
        execution_id: executionId,
        step_id: step.id,
        step_name: step.name,
        status: 'running',
        started_at: new Date().toISOString(),
        retry_count: 0
      })
      .select()
      .single()

    if (!logEntry) {
      throw new Error('Failed to create execution log')
    }

    try {
      switch (step.type) {
        case 'action':
          await this.executeActionStep(executionId, step)
          break
        case 'condition':
          await this.executeConditionStep(executionId, step)
          break
        case 'wait':
          await this.executeWaitStep(executionId, step)
          break
        case 'approval':
          await this.executeApprovalStep(executionId, step)
          return // Approval steps don't complete immediately
        case 'notification':
          await this.executeNotificationStep(executionId, step)
          break
        case 'integration':
          await this.executeIntegrationStep(executionId, step)
          break
        default:
          throw new Error(`Unknown step type: ${step.type}`)
      }

      // Mark step as completed
      await this.markStepCompleted(executionId, step.id)

    } catch (error) {
      await this.markStepFailed(executionId, step.id, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  private async executeActionStep(executionId: string, step: WorkflowStep): Promise<void> {
    // Execute custom action based on action_type
    const actionType = step.config.action_type
    
    switch (actionType) {
      case 'create_task':
        await this.createTask(executionId, step.config)
        break
      case 'send_email':
        await this.sendEmail(executionId, step.config)
        break
      case 'update_record':
        await this.updateRecord(executionId, step.config)
        break
      default:
        console.log(`Executing action: ${actionType}`)
    }
  }

  private async executeConditionStep(executionId: string, step: WorkflowStep): Promise<void> {
    const conditions = step.config.conditions || []
    let conditionMet = true

    for (const condition of conditions) {
      const result = await this.evaluateCondition(executionId, condition)
      
      if (condition.logic_operator === 'or') {
        conditionMet = conditionMet || result
      } else {
        conditionMet = conditionMet && result
      }
    }

    if (!conditionMet) {
      throw new Error('Workflow condition not met')
    }
  }

  private async executeWaitStep(executionId: string, step: WorkflowStep): Promise<void> {
    const waitDuration = step.config.wait_duration || 0
    
    if (waitDuration > 0) {
      // In a real implementation, this would schedule the next step
      await new Promise(resolve => setTimeout(resolve, waitDuration * 1000))
    }
  }

  private async executeApprovalStep(executionId: string, step: WorkflowStep): Promise<void> {
    const approvalConfig = step.config.approval_config
    if (!approvalConfig) {
      throw new Error('Approval step missing approval configuration')
    }

    // Create approval requests
    for (const approverId of approvalConfig.approvers) {
      await this.supabase
        .from('workflow_approvals')
        .insert({
          execution_id: executionId,
          step_id: step.id,
          approver_id: approverId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
    }

    // Send approval notifications
    await this.sendApprovalNotifications(executionId, step.id, approvalConfig)
  }

  private async executeNotificationStep(executionId: string, step: WorkflowStep): Promise<void> {
    const notificationConfig = step.config.notification_config
    if (!notificationConfig) {
      throw new Error('Notification step missing notification configuration')
    }

    // Send notifications to recipients
    for (const recipientId of notificationConfig.recipients) {
      await this.sendNotification(recipientId, notificationConfig)
    }
  }

  private async executeIntegrationStep(executionId: string, step: WorkflowStep): Promise<void> {
    const integrationConfig = step.config.integration_config
    if (!integrationConfig) {
      throw new Error('Integration step missing integration configuration')
    }

    // Make HTTP request to external service
    const response = await fetch(integrationConfig.endpoint, {
      method: integrationConfig.method,
      headers: integrationConfig.headers,
      body: integrationConfig.payload ? JSON.stringify(integrationConfig.payload) : undefined
    })

    if (!response.ok) {
      throw new Error(`Integration request failed: ${response.statusText}`)
    }
  }

  private async markStepCompleted(executionId: string, stepId: string): Promise<void> {
    await this.supabase
      .from('workflow_execution_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('execution_id', executionId)
      .eq('step_id', stepId)
  }

  private async markStepFailed(executionId: string, stepId: string, errorMessage: string): Promise<void> {
    await this.supabase
      .from('workflow_execution_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('execution_id', executionId)
      .eq('step_id', stepId)
  }

  private async markExecutionCompleted(executionId: string): Promise<void> {
    await this.supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId)

    // Publish workflow completed event
    await this.eventBus.publish(this.eventBus.createEvent(
      'workflow.execution_completed',
      executionId,
      'workflow_execution',
      { executionId }
    ))
  }

  private async markExecutionFailed(executionId: string, errorMessage: string): Promise<void> {
    await this.supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', executionId)

    // Publish workflow failed event
    await this.eventBus.publish(this.eventBus.createEvent(
      'workflow.execution_failed',
      executionId,
      'workflow_execution',
      { executionId, errorMessage }
    ))
  }

  private async isStepCompleted(executionId: string, stepId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('workflow_execution_logs')
      .select('status')
      .eq('execution_id', executionId)
      .eq('step_id', stepId)
      .single()

    return data?.status === 'completed'
  }

  private async checkApprovalComplete(executionId: string, stepId: string): Promise<boolean> {
    // Get approval configuration for this step
    const { data: execution } = await this.supabase
      .from('workflow_executions')
      .select(`
        workflow_definitions!inner(steps)
      `)
      .eq('id', executionId)
      .single()

    if (!execution) return false

    const workflow = execution.workflow_definitions as any
    const step = workflow.steps.find((s: any) => s.id === stepId)
    const approvalConfig = step?.config?.approval_config

    if (!approvalConfig) return false

    // Count approvals
    const { data: approvals } = await this.supabase
      .from('workflow_approvals')
      .select('status')
      .eq('execution_id', executionId)
      .eq('step_id', stepId)
      .in('status', ['approved', 'rejected'])

    if (!approvals) return false

    const approvedCount = approvals.filter(a => a.status === 'approved').length
    const rejectedCount = approvals.filter(a => a.status === 'rejected').length

    switch (approvalConfig.approval_type) {
      case 'any':
        return approvedCount > 0
      case 'all':
        return approvedCount === approvalConfig.approvers.length
      case 'majority':
        return approvedCount > approvalConfig.approvers.length / 2
      default:
        return false
    }
  }

  private async continueWorkflowExecution(executionId: string, stepId: string): Promise<void> {
    await this.markStepCompleted(executionId, stepId)
    
    // In a real implementation, this would continue the workflow execution
    // For now, just log that the workflow should continue
    console.log(`Continuing workflow execution ${executionId} after step ${stepId}`)
  }

  private async evaluateCondition(executionId: string, condition: WorkflowCondition): Promise<boolean> {
    // Get execution variables
    const { data: execution } = await this.supabase
      .from('workflow_executions')
      .select('variables')
      .eq('id', executionId)
      .single()

    if (!execution) return false

    const variables = execution.variables || {}
    const fieldValue = variables[condition.field]

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value
      case 'not_equals':
        return fieldValue !== condition.value
      case 'contains':
        return String(fieldValue).includes(String(condition.value))
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value)
      case 'less_than':
        return Number(fieldValue) < Number(condition.value)
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue)
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue)
      default:
        return false
    }
  }

  private async createTask(executionId: string, config: any): Promise<void> {
    // Implementation for creating a task
    console.log('Creating task:', config)
  }

  private async sendEmail(executionId: string, config: any): Promise<void> {
    // Implementation for sending email
    console.log('Sending email:', config)
  }

  private async updateRecord(executionId: string, config: any): Promise<void> {
    // Implementation for updating database record
    console.log('Updating record:', config)
  }

  private async sendApprovalNotifications(
    executionId: string,
    stepId: string,
    approvalConfig: ApprovalConfig
  ): Promise<void> {
    // Send notifications to approvers
    for (const approverId of approvalConfig.approvers) {
      await this.supabase
        .from('notifications')
        .insert({
          user_id: approverId,
          type: 'workflow_approval',
          title: 'Workflow Approval Required',
          message: `A workflow step requires your approval`,
          data: { executionId, stepId },
          created_at: new Date().toISOString()
        })
    }
  }

  private async sendNotification(recipientId: string, config: NotificationConfig): Promise<void> {
    await this.supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'workflow_notification',
        title: 'Workflow Notification',
        message: config.template,
        data: config.variables || {},
        created_at: new Date().toISOString()
      })
  }

  private setupEventHandlers(): void {
    // Listen for domain events that might trigger workflows
    this.eventBus.subscribe(DomainEventTypes.ASSET_UPLOADED, async (event) => {
      await this.triggerWorkflowsByEvent('asset.uploaded', event.data)
    })

    this.eventBus.subscribe(DomainEventTypes.USER_CREATED, async (event) => {
      await this.triggerWorkflowsByEvent('user.created', event.data)
    })

    this.eventBus.subscribe(DomainEventTypes.COMPLIANCE_VIOLATION_DETECTED, async (event) => {
      await this.triggerWorkflowsByEvent('compliance.violation_detected', event.data)
    })
  }

  private async triggerWorkflowsByEvent(eventType: string, eventData: any): Promise<void> {
    try {
      // Find workflows triggered by this event
      const { data: triggers } = await this.supabase
        .from('workflow_triggers')
        .select('workflow_id')
        .eq('trigger_type', 'event')
        .eq('event_type', eventType)
        .eq('is_active', true)

      if (!triggers) return

      // Execute each triggered workflow
      for (const trigger of triggers) {
        await this.executeWorkflow(trigger.workflow_id, eventData)
      }
    } catch (error) {
      console.error('Failed to trigger workflows by event:', error)
    }
  }
}