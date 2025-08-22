import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  UserId, 
  OrganizationId, 
  ComplianceWorkflowId,
  QueryOptions, 
  PaginatedResult,
  Priority,
  createUserId,
  createOrganizationId,
  createComplianceWorkflowId
} from './types'
import type { Database } from '../../types/database'

type ComplianceWorkflow = Database['public']['Tables']['compliance_workflows']['Row']
type ComplianceTemplate = Database['public']['Tables']['compliance_templates']['Row']
type ComplianceCalendar = Database['public']['Tables']['compliance_calendar']['Row']
type WorkflowExecution = Database['public']['Tables']['workflow_executions']['Row']

export interface ComplianceWorkflowWithDetails extends ComplianceWorkflow {
  template?: ComplianceTemplate
  executions?: WorkflowExecution[]
  organization?: {
    id: string
    name: string
    slug: string
  }
  created_by_user?: {
    id: string
    full_name: string | null
    email: string
  }
  current_execution?: WorkflowExecution
}

export interface ComplianceFilters {
  status?: 'draft' | 'active' | 'completed' | 'failed' | 'cancelled'
  priority?: Priority
  compliance_type?: string
  organizationId?: OrganizationId
  assignedTo?: UserId
  dueDate?: {
    from?: Date
    to?: Date
  }
  templateId?: string
  is_recurring?: boolean
  tags?: string[]
}

export interface ComplianceWorkflowCreateData {
  title: string
  description?: string
  compliance_type: string
  organization_id: OrganizationId
  template_id?: string
  priority: Priority
  due_date: Date
  assigned_to?: UserId
  requirements: Array<{
    id: string
    title: string
    description: string
    is_required: boolean
    evidence_types: string[]
    completion_criteria?: string
  }>
  is_recurring?: boolean
  recurrence_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    interval: number
    end_date?: Date
  }
  notifications?: {
    reminder_days: number[]
    escalation_days: number[]
    recipients: UserId[]
  }
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface ComplianceExecution {
  workflow_id: ComplianceWorkflowId
  started_by: UserId
  started_at: Date
  target_completion_date: Date
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled'
  current_step: number
  total_steps: number
  completion_percentage: number
  evidence_submitted: Record<string, unknown>[]
  reviewer_notes?: string
  completed_at?: Date
  failure_reason?: string
}

export interface ComplianceStats {
  totalWorkflows: number
  activeWorkflows: number
  completedWorkflows: number
  overdue: number
  dueThisWeek: number
  dueThisMonth: number
  byComplianceType: Record<string, number>
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  completionRate: number
  averageCompletionDays: number
  upcomingDeadlines: Array<{
    workflow_id: string
    title: string
    due_date: string
    days_until_due: number
    priority: string
  }>
  complianceHealth: {
    score: number
    risks: Array<{
      type: string
      level: 'low' | 'medium' | 'high' | 'critical'
      description: string
    }>
  }
}

export interface ComplianceTemplate {
  id: string
  name: string
  description: string
  compliance_type: string
  organization_id?: OrganizationId
  is_public: boolean
  requirements: Array<{
    id: string
    title: string
    description: string
    is_required: boolean
    evidence_types: string[]
    completion_criteria?: string
    estimated_hours?: number
  }>
  default_priority: Priority
  default_due_days: number
  notification_settings: {
    reminder_days: number[]
    escalation_days: number[]
  }
  tags: string[]
  version: string
  created_by: UserId
  created_at: Date
  updated_at: Date
}

export class ComplianceRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'ComplianceWorkflow'
  }

  protected getSearchFields(): string[] {
    return ['title', 'description', 'compliance_type']
  }

  async findById(id: ComplianceWorkflowId): Promise<Result<ComplianceWorkflow>> {
    const { data, error } = await this.supabase
      .from('compliance_workflows')
      .select('*')
      .eq('id', id)
      .single()

    return this.createResult(data, error, 'findById')
  }

  async findWithDetails(id: ComplianceWorkflowId): Promise<Result<ComplianceWorkflowWithDetails>> {
    const { data, error } = await this.supabase
      .from('compliance_workflows')
      .select(`
        *,
        template:compliance_templates(
          id, name, description, requirements, 
          notification_settings, default_priority
        ),
        executions:workflow_executions(
          id, status, started_at, completed_at,
          current_step, completion_percentage
        ),
        organization:organizations(id, name, slug),
        created_by_user:users!created_by(id, full_name, email)
      `)
      .eq('id', id)
      .single()

    // Find current execution
    if (data && data.executions) {
      const currentExecution = data.executions.find((exec: any) => 
        exec.status === 'in_progress'
      )
      if (currentExecution) {
        data.current_execution = currentExecution
      }
    }

    return this.createResult(data as ComplianceWorkflowWithDetails, error, 'findWithDetails')
  }

  async findByOrganization(
    organizationId: OrganizationId,
    userId: UserId,
    filters: ComplianceFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<ComplianceWorkflowWithDetails>>> {
    // Check user has access to organization
    const permissionCheck = await this.checkOrganizationPermission(userId, organizationId)
    if (!permissionCheck.success) {
      return permissionCheck
    }

    let query = this.supabase
      .from('compliance_workflows')
      .select(`
        *,
        template:compliance_templates(id, name),
        organization:organizations(id, name, slug),
        created_by_user:users!created_by(id, full_name, email)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    query = this.applyFilters(query, filters)
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as ComplianceWorkflowWithDetails[] || [], count, options, error)
  }

  async findAssignedToUser(
    userId: UserId,
    filters: ComplianceFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<ComplianceWorkflowWithDetails>>> {
    let query = this.supabase
      .from('compliance_workflows')
      .select(`
        *,
        template:compliance_templates(id, name),
        organization:organizations(id, name, slug),
        created_by_user:users!created_by(id, full_name, email)
      `, { count: 'exact' })
      .eq('assigned_to', userId)
      .order('due_date', { ascending: true })

    query = this.applyFilters(query, filters)
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as ComplianceWorkflowWithDetails[] || [], count, options, error)
  }

  async findOverdue(
    organizationId?: OrganizationId
  ): Promise<Result<ComplianceWorkflowWithDetails[]>> {
    const now = new Date().toISOString()

    let query = this.supabase
      .from('compliance_workflows')
      .select(`
        *,
        template:compliance_templates(id, name),
        organization:organizations(id, name, slug),
        created_by_user:users!created_by(id, full_name, email)
      `)
      .lt('due_date', now)
      .in('status', ['active', 'in_progress'])
      .order('due_date', { ascending: true })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    return this.createResult(data as ComplianceWorkflowWithDetails[] || [], error, 'findOverdue')
  }

  async create(
    workflowData: ComplianceWorkflowCreateData,
    createdBy: UserId
  ): Promise<Result<ComplianceWorkflow>> {
    // Validate required fields
    const validation = this.validateRequired(workflowData, [
      'title', 'compliance_type', 'organization_id', 'priority', 'due_date'
    ])
    if (!validation.success) {
      return validation
    }

    // Check organization permission
    const permissionCheck = await this.checkOrganizationPermission(
      createdBy, 
      workflowData.organization_id,
      ['admin', 'owner']
    )
    if (!permissionCheck.success) {
      return permissionCheck
    }

    const insertData = {
      title: workflowData.title,
      description: workflowData.description,
      compliance_type: workflowData.compliance_type,
      organization_id: workflowData.organization_id,
      template_id: workflowData.template_id,
      priority: workflowData.priority,
      due_date: workflowData.due_date.toISOString(),
      assigned_to: workflowData.assigned_to,
      requirements: workflowData.requirements,
      is_recurring: workflowData.is_recurring || false,
      recurrence_pattern: workflowData.recurrence_pattern,
      notifications: workflowData.notifications,
      tags: workflowData.tags || [],
      metadata: workflowData.metadata,
      status: 'active' as const,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('compliance_workflows')
      .insert(insertData)
      .select()
      .single()

    const result = this.createResult(data, error, 'create')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: createdBy,
        organization_id: workflowData.organization_id,
        event_type: 'compliance_management',
        event_category: 'workflow_lifecycle',
        action: 'create',
        resource_type: 'compliance_workflow',
        resource_id: data.id,
        event_description: `Compliance workflow created: ${data.title}`,
        outcome: 'success',
        severity: 'low',
        details: {
          compliance_type: data.compliance_type,
          priority: data.priority,
          due_date: data.due_date
        }
      })

      // Schedule notifications if configured
      if (workflowData.notifications?.reminder_days) {
        await this.scheduleReminders(createComplianceWorkflowId(data.id), workflowData.notifications)
      }
    }

    return result
  }

  async update(
    id: ComplianceWorkflowId,
    updates: Partial<ComplianceWorkflowCreateData>,
    updatedBy: UserId
  ): Promise<Result<ComplianceWorkflow>> {
    const updateData = {
      ...updates,
      due_date: updates.due_date?.toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('compliance_workflows')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    const result = this.createResult(data, error, 'update')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: updatedBy,
        organization_id: data.organization_id ? createOrganizationId(data.organization_id) : undefined,
        event_type: 'compliance_management',
        event_category: 'workflow_lifecycle',
        action: 'update',
        resource_type: 'compliance_workflow',
        resource_id: data.id,
        event_description: `Compliance workflow updated: ${data.title}`,
        outcome: 'success',
        severity: 'low',
        details: Object.keys(updates)
      })
    }

    return result
  }

  async startExecution(
    workflowId: ComplianceWorkflowId,
    startedBy: UserId
  ): Promise<Result<WorkflowExecution>> {
    // Get workflow details
    const workflowResult = await this.findById(workflowId)
    if (!workflowResult.success) {
      return workflowResult
    }

    const workflow = workflowResult.data
    
    // Check for existing active execution
    const { data: existingExecution, error: checkError } = await this.supabase
      .from('workflow_executions')
      .select('id')
      .eq('workflow_id', workflowId)
      .eq('status', 'in_progress')
      .single()

    if (existingExecution) {
      return failure(RepositoryError.conflict('execution', 'Workflow execution already in progress'))
    }

    const executionData = {
      workflow_id: workflowId,
      started_by: startedBy,
      started_at: new Date().toISOString(),
      target_completion_date: workflow.due_date,
      status: 'in_progress' as const,
      current_step: 1,
      total_steps: (workflow.requirements as any)?.length || 1,
      completion_percentage: 0,
      evidence_submitted: [],
      created_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('workflow_executions')
      .insert(executionData)
      .select()
      .single()

    const result = this.createResult(data, error, 'startExecution')
    
    if (result.success && data) {
      // Update workflow status
      await this.supabase
        .from('compliance_workflows')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', workflowId)

      await this.logActivity({
        user_id: startedBy,
        organization_id: workflow.organization_id ? createOrganizationId(workflow.organization_id) : undefined,
        event_type: 'compliance_management',
        event_category: 'workflow_execution',
        action: 'start',
        resource_type: 'workflow_execution',
        resource_id: data.id,
        event_description: `Workflow execution started: ${workflow.title}`,
        outcome: 'success',
        severity: 'low'
      })
    }

    return result
  }

  async updateExecutionProgress(
    executionId: string,
    updates: {
      current_step?: number
      completion_percentage?: number
      evidence_submitted?: Record<string, unknown>[]
      reviewer_notes?: string
    },
    updatedBy: UserId
  ): Promise<Result<WorkflowExecution>> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('workflow_executions')
      .update(updateData)
      .eq('id', executionId)
      .select()
      .single()

    const result = this.createResult(data, error, 'updateExecutionProgress')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: updatedBy,
        event_type: 'compliance_management',
        event_category: 'workflow_execution',
        action: 'update_progress',
        resource_type: 'workflow_execution',
        resource_id: data.id,
        event_description: `Execution progress updated: ${updates.completion_percentage}% complete`,
        outcome: 'success',
        severity: 'low'
      })
    }

    return result
  }

  async completeExecution(
    executionId: string,
    completedBy: UserId,
    finalNotes?: string
  ): Promise<Result<WorkflowExecution>> {
    const { data, error } = await this.supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completion_percentage: 100,
        completed_at: new Date().toISOString(),
        reviewer_notes: finalNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId)
      .select()
      .single()

    const result = this.createResult(data, error, 'completeExecution')
    
    if (result.success && data) {
      // Update workflow status
      await this.supabase
        .from('compliance_workflows')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', data.workflow_id)

      await this.logActivity({
        user_id: completedBy,
        event_type: 'compliance_management',
        event_category: 'workflow_execution',
        action: 'complete',
        resource_type: 'workflow_execution',
        resource_id: data.id,
        event_description: `Workflow execution completed`,
        outcome: 'success',
        severity: 'low'
      })
    }

    return result
  }

  async getStats(
    organizationId: OrganizationId,
    userId: UserId
  ): Promise<Result<ComplianceStats>> {
    // Check permissions
    const permissionCheck = await this.checkOrganizationPermission(userId, organizationId)
    if (!permissionCheck.success) {
      return permissionCheck
    }

    const { data: workflows, error } = await this.supabase
      .from('compliance_workflows')
      .select('id, title, status, priority, compliance_type, due_date, created_at, completed_at')
      .eq('organization_id', organizationId)

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'getStats'))
    }

    const stats: ComplianceStats = {
      totalWorkflows: workflows?.length || 0,
      activeWorkflows: 0,
      completedWorkflows: 0,
      overdue: 0,
      dueThisWeek: 0,
      dueThisMonth: 0,
      byComplianceType: {},
      byStatus: {},
      byPriority: {},
      completionRate: 0,
      averageCompletionDays: 0,
      upcomingDeadlines: [],
      complianceHealth: {
        score: 0,
        risks: []
      }
    }

    if (workflows) {
      const now = new Date()
      const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      let totalCompletionDays = 0
      let completedCount = 0

      workflows.forEach(workflow => {
        // Count by status
        stats.byStatus[workflow.status] = (stats.byStatus[workflow.status] || 0) + 1
        
        if (workflow.status === 'active' || workflow.status === 'in_progress') {
          stats.activeWorkflows++
        } else if (workflow.status === 'completed') {
          stats.completedWorkflows++
          
          // Calculate completion days
          if (workflow.completed_at) {
            const completionDays = Math.ceil(
              (new Date(workflow.completed_at).getTime() - new Date(workflow.created_at).getTime()) 
              / (24 * 60 * 60 * 1000)
            )
            totalCompletionDays += completionDays
            completedCount++
          }
        }

        // Count by priority
        stats.byPriority[workflow.priority] = (stats.byPriority[workflow.priority] || 0) + 1

        // Count by compliance type
        stats.byComplianceType[workflow.compliance_type] = (stats.byComplianceType[workflow.compliance_type] || 0) + 1

        // Check due dates
        const dueDate = new Date(workflow.due_date)
        
        if (dueDate < now && (workflow.status === 'active' || workflow.status === 'in_progress')) {
          stats.overdue++
        } else if (dueDate <= oneWeek && workflow.status === 'active') {
          stats.dueThisWeek++
          
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          stats.upcomingDeadlines.push({
            workflow_id: workflow.id,
            title: workflow.title,
            due_date: workflow.due_date,
            days_until_due: daysUntilDue,
            priority: workflow.priority
          })
        } else if (dueDate <= oneMonth && workflow.status === 'active') {
          stats.dueThisMonth++
        }
      })

      // Calculate completion rate
      stats.completionRate = workflows.length > 0 
        ? (stats.completedWorkflows / workflows.length) * 100 
        : 0

      // Calculate average completion days
      stats.averageCompletionDays = completedCount > 0 
        ? Math.round(totalCompletionDays / completedCount) 
        : 0

      // Sort upcoming deadlines by due date
      stats.upcomingDeadlines.sort((a, b) => a.days_until_due - b.days_until_due)

      // Calculate compliance health score
      const healthScore = this.calculateHealthScore(stats)
      stats.complianceHealth.score = healthScore.score
      stats.complianceHealth.risks = healthScore.risks
    }

    return success(stats)
  }

  async findTemplates(
    organizationId?: OrganizationId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<ComplianceTemplate>>> {
    let query = this.supabase
      .from('compliance_templates')
      .select('*', { count: 'exact' })
      .or(`is_public.eq.true${organizationId ? `,organization_id.eq.${organizationId}` : ''}`)
      .order('name', { ascending: true })

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data || [], count, options, error)
  }

  private async scheduleReminders(
    workflowId: ComplianceWorkflowId,
    notifications: { reminder_days: number[]; recipients: UserId[] }
  ): Promise<void> {
    // This would integrate with a notification scheduling system
    // For now, we'll just log the scheduling intent
    console.log(`Scheduling reminders for workflow ${workflowId}`, notifications)
  }

  private calculateHealthScore(stats: ComplianceStats): {
    score: number
    risks: Array<{ type: string; level: 'low' | 'medium' | 'high' | 'critical'; description: string }>
  } {
    let score = 100
    const risks: Array<{ type: string; level: 'low' | 'medium' | 'high' | 'critical'; description: string }> = []

    // Penalize overdue workflows
    if (stats.overdue > 0) {
      const overdueRate = (stats.overdue / stats.totalWorkflows) * 100
      if (overdueRate > 20) {
        score -= 30
        risks.push({
          type: 'overdue_workflows',
          level: 'critical',
          description: `${stats.overdue} workflows are overdue`
        })
      } else if (overdueRate > 10) {
        score -= 20
        risks.push({
          type: 'overdue_workflows',
          level: 'high',
          description: `${stats.overdue} workflows are overdue`
        })
      } else {
        score -= 10
        risks.push({
          type: 'overdue_workflows',
          level: 'medium',
          description: `${stats.overdue} workflows are overdue`
        })
      }
    }

    // Penalize low completion rate
    if (stats.completionRate < 80) {
      score -= 15
      risks.push({
        type: 'low_completion_rate',
        level: stats.completionRate < 60 ? 'high' : 'medium',
        description: `Completion rate is ${stats.completionRate.toFixed(1)}%`
      })
    }

    // Penalize excessive upcoming deadlines
    if (stats.dueThisWeek > 5) {
      score -= 10
      risks.push({
        type: 'upcoming_deadlines',
        level: 'medium',
        description: `${stats.dueThisWeek} workflows due this week`
      })
    }

    return { score: Math.max(0, score), risks }
  }

  private applyFilters(query: any, filters: ComplianceFilters): unknown {
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters.compliance_type) {
      query = query.eq('compliance_type', filters.compliance_type)
    }
    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }
    if (filters.templateId) {
      query = query.eq('template_id', filters.templateId)
    }
    if (filters.is_recurring !== undefined) {
      query = query.eq('is_recurring', filters.is_recurring)
    }
    if (filters.dueDate?.from) {
      query = query.gte('due_date', filters.dueDate.from.toISOString())
    }
    if (filters.dueDate?.to) {
      query = query.lte('due_date', filters.dueDate.to.toISOString())
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    return query
  }
}