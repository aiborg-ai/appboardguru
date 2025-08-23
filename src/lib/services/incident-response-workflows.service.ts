import { BaseService } from './base.service'
import { Result, success, failure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { CrisisManagementService, CrisisLevel, CrisisCategory, CrisisStatus } from './crisis-management.service'

export enum WorkflowStage {
  DETECTION = 'detection',
  ASSESSMENT = 'assessment',
  CLASSIFICATION = 'classification',
  ESCALATION = 'escalation',
  RESPONSE = 'response',
  MONITORING = 'monitoring',
  RESOLUTION = 'resolution',
  POST_INCIDENT = 'post_incident'
}

export enum EscalationLevel {
  TEAM_LEAD = 'team_lead',
  DEPARTMENT_HEAD = 'department_head',
  EXECUTIVE_TEAM = 'executive_team',
  BOARD_EMERGENCY = 'board_emergency',
  EXTERNAL_AUTHORITIES = 'external_authorities'
}

export interface WorkflowRule {
  id: string
  name: string
  description: string
  trigger_conditions: {
    categories?: CrisisCategory[]
    levels?: CrisisLevel[]
    keywords?: string[]
    impact_threshold?: number
    time_criteria?: string
    source_types?: string[]
  }
  actions: WorkflowAction[]
  escalation_path: EscalationStep[]
  enabled: boolean
  priority: number
  created_at: string
  updated_at: string
}

export interface WorkflowAction {
  type: 'notify' | 'escalate' | 'create_meeting' | 'send_communication' | 'execute_playbook' | 'trigger_monitoring'
  parameters: Record<string, any>
  delay_seconds?: number
  conditions?: Record<string, any>
}

export interface EscalationStep {
  level: EscalationLevel
  trigger_after_minutes: number
  notify_roles: string[]
  automatic: boolean
  approval_required: boolean
  actions: WorkflowAction[]
}

export interface IncidentClassification {
  category: CrisisCategory
  level: CrisisLevel
  confidence_score: number
  classification_factors: {
    keyword_matches: string[]
    impact_indicators: string[]
    source_credibility: number
    historical_patterns: string[]
  }
  suggested_playbook?: string
  auto_actions: WorkflowAction[]
}

export interface ResponsePlaybook {
  id: string
  name: string
  category: CrisisCategory
  level: CrisisLevel
  stages: PlaybookStage[]
  estimated_duration_hours: number
  required_roles: string[]
  success_criteria: string[]
  created_at: string
  updated_at: string
}

export interface PlaybookStage {
  name: string
  description: string
  duration_minutes: number
  required_actions: PlaybookAction[]
  success_criteria: string[]
  dependencies: string[]
  parallel_execution: boolean
}

export interface PlaybookAction {
  id: string
  title: string
  description: string
  type: 'assessment' | 'communication' | 'coordination' | 'technical' | 'legal' | 'media'
  responsible_role: string
  estimated_minutes: number
  checklist: string[]
  templates?: string[]
  dependencies: string[]
  critical_path: boolean
}

export interface WorkflowExecution {
  id: string
  incident_id: string
  workflow_rule_id: string
  playbook_id?: string
  current_stage: WorkflowStage
  started_at: string
  estimated_completion: string
  actual_completion?: string
  stage_history: StageExecution[]
  escalation_history: EscalationExecution[]
  performance_metrics: {
    total_duration?: number
    response_time: number
    stages_completed: number
    actions_executed: number
    escalations_triggered: number
  }
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
}

export interface StageExecution {
  stage: WorkflowStage
  started_at: string
  completed_at?: string
  actions_executed: number
  success_rate: number
  issues: string[]
  duration_minutes?: number
}

export interface EscalationExecution {
  level: EscalationLevel
  triggered_at: string
  completed_at?: string
  notified_users: string[]
  approval_status: 'pending' | 'approved' | 'rejected' | 'timeout'
  actions_taken: string[]
}

export class IncidentResponseWorkflowService extends BaseService {
  private crisisService: CrisisManagementService

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.crisisService = new CrisisManagementService(supabase)
  }

  /**
   * AUTOMATED INCIDENT DETECTION AND CLASSIFICATION
   */

  async detectAndClassifyIncident(
    source: string,
    rawData: any,
    context?: Record<string, any>
  ): Promise<Result<{
    classification: IncidentClassification
    workflow_execution?: WorkflowExecution
    incident_id?: string
  }>> {
    return this.executeDbOperation(async () => {
      // Step 1: Classify the incident using ML and rules
      const classification = await this.classifyIncident(rawData, context)
      
      // Step 2: Check if classification meets incident threshold
      if (classification.confidence_score < 0.7 || classification.level === CrisisLevel.LOW) {
        return {
          classification,
          workflow_execution: undefined,
          incident_id: undefined
        }
      }

      // Step 3: Create incident automatically
      const incidentResult = await this.crisisService.createIncident({
        title: this.generateIncidentTitle(rawData, classification),
        description: this.generateIncidentDescription(rawData, classification),
        category: classification.category,
        level: classification.level,
        source: source,
        impact_assessment: this.assessImpact(rawData, classification),
        metadata: {
          auto_detected: true,
          classification_score: classification.confidence_score,
          raw_source_data: rawData,
          detection_context: context
        }
      })

      if (!incidentResult.success) {
        throw new Error(`Failed to create incident: ${incidentResult.error}`)
      }

      const incident = incidentResult.data

      // Step 4: Find matching workflow rules
      const workflowRules = await this.findMatchingWorkflowRules(classification, rawData)

      let workflowExecution: WorkflowExecution | undefined

      if (workflowRules.length > 0) {
        // Use highest priority rule
        const selectedRule = workflowRules.sort((a, b) => b.priority - a.priority)[0]
        
        // Step 5: Start workflow execution
        const executionResult = await this.startWorkflowExecution(
          incident.id,
          selectedRule,
          classification
        )
        
        if (executionResult.success) {
          workflowExecution = executionResult.data
        }
      }

      return {
        classification,
        workflow_execution: workflowExecution,
        incident_id: incident.id
      }
    }, 'detectAndClassifyIncident')
  }

  private async classifyIncident(
    rawData: any,
    context?: Record<string, any>
  ): Promise<IncidentClassification> {
    // Advanced classification logic
    const keywordAnalysis = this.analyzeKeywords(rawData)
    const impactAnalysis = this.analyzeImpact(rawData, context)
    const sourceAnalysis = this.analyzeSource(rawData)
    const historicalAnalysis = await this.analyzeHistoricalPatterns(rawData)

    // ML-based classification (simplified for demo)
    const category = this.determineCategoryFromKeywords(keywordAnalysis.matches)
    const level = this.determineLevelFromImpact(impactAnalysis)
    
    // Calculate confidence score
    const confidence_score = this.calculateConfidenceScore({
      keyword_strength: keywordAnalysis.strength,
      impact_clarity: impactAnalysis.clarity,
      source_reliability: sourceAnalysis.credibility,
      historical_match: historicalAnalysis.similarity
    })

    // Determine suggested actions
    const auto_actions = this.determineSuggestedActions(category, level, confidence_score)

    return {
      category,
      level,
      confidence_score,
      classification_factors: {
        keyword_matches: keywordAnalysis.matches,
        impact_indicators: impactAnalysis.indicators,
        source_credibility: sourceAnalysis.credibility,
        historical_patterns: historicalAnalysis.patterns
      },
      suggested_playbook: this.suggestPlaybook(category, level),
      auto_actions
    }
  }

  /**
   * WORKFLOW RULE MANAGEMENT
   */

  async createWorkflowRule(
    ruleData: Omit<WorkflowRule, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Result<WorkflowRule>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const rule = {
        ...ruleData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdRule, error } = await this.supabase
        .from('workflow_rules')
        .insert(rule)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('create_workflow_rule', 'workflow_rule', createdRule.id)
      
      return createdRule as WorkflowRule
    }, 'createWorkflowRule')
  }

  async updateWorkflowRule(
    ruleId: string,
    updates: Partial<Omit<WorkflowRule, 'id' | 'created_at'>>
  ): Promise<Result<WorkflowRule>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const { data: rule, error } = await this.supabase
        .from('workflow_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('update_workflow_rule', 'workflow_rule', ruleId)
      
      return rule as WorkflowRule
    }, 'updateWorkflowRule')
  }

  private async findMatchingWorkflowRules(
    classification: IncidentClassification,
    rawData: any
  ): Promise<WorkflowRule[]> {
    const { data: rules, error } = await this.supabase
      .from('workflow_rules')
      .select('*')
      .eq('enabled', true)
      .order('priority', { ascending: false })

    if (error) throw error

    return rules.filter(rule => this.ruleMatches(rule, classification, rawData))
  }

  private ruleMatches(
    rule: WorkflowRule,
    classification: IncidentClassification,
    rawData: any
  ): boolean {
    const conditions = rule.trigger_conditions

    // Check category match
    if (conditions.categories && !conditions.categories.includes(classification.category)) {
      return false
    }

    // Check level match
    if (conditions.levels && !conditions.levels.includes(classification.level)) {
      return false
    }

    // Check keyword matches
    if (conditions.keywords && conditions.keywords.length > 0) {
      const text = this.extractTextFromRawData(rawData)
      const keywordMatch = conditions.keywords.some(keyword =>
        text.toLowerCase().includes(keyword.toLowerCase())
      )
      if (!keywordMatch) return false
    }

    // Check impact threshold
    if (conditions.impact_threshold && classification.confidence_score < conditions.impact_threshold) {
      return false
    }

    return true
  }

  /**
   * WORKFLOW EXECUTION
   */

  async startWorkflowExecution(
    incidentId: string,
    rule: WorkflowRule,
    classification: IncidentClassification
  ): Promise<Result<WorkflowExecution>> {
    return this.executeDbOperation(async () => {
      const execution: WorkflowExecution = {
        id: crypto.randomUUID(),
        incident_id: incidentId,
        workflow_rule_id: rule.id,
        current_stage: WorkflowStage.ASSESSMENT,
        started_at: new Date().toISOString(),
        estimated_completion: this.calculateEstimatedCompletion(rule),
        stage_history: [],
        escalation_history: [],
        performance_metrics: {
          response_time: 0,
          stages_completed: 0,
          actions_executed: 0,
          escalations_triggered: 0
        },
        status: 'running'
      }

      const { data: createdExecution, error } = await this.supabase
        .from('workflow_executions')
        .insert(execution)
        .select()
        .single()

      if (error) throw error

      // Start executing the workflow
      await this.executeWorkflowActions(execution, rule.actions)

      // Setup escalation monitoring
      await this.setupEscalationMonitoring(execution, rule.escalation_path)

      await this.logActivity('start_workflow_execution', 'workflow_execution', execution.id)
      
      return createdExecution as WorkflowExecution
    }, 'startWorkflowExecution')
  }

  private async executeWorkflowActions(
    execution: WorkflowExecution,
    actions: WorkflowAction[]
  ): Promise<void> {
    for (const action of actions) {
      try {
        // Apply delay if specified
        if (action.delay_seconds && action.delay_seconds > 0) {
          await new Promise(resolve => setTimeout(resolve, action.delay_seconds! * 1000))
        }

        await this.executeAction(execution, action)
        
        // Update execution metrics
        await this.updateExecutionMetrics(execution.id, {
          actions_executed: execution.performance_metrics.actions_executed + 1
        })

      } catch (error) {
        console.error(`Failed to execute workflow action:`, error)
        // Log the error but continue with other actions
        await this.logActivity('workflow_action_error', 'workflow_execution', execution.id, {
          action_type: action.type,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }

  private async executeAction(execution: WorkflowExecution, action: WorkflowAction): Promise<void> {
    switch (action.type) {
      case 'notify':
        await this.executeNotifyAction(execution, action)
        break
      
      case 'escalate':
        await this.executeEscalateAction(execution, action)
        break
      
      case 'create_meeting':
        await this.executeCreateMeetingAction(execution, action)
        break
      
      case 'send_communication':
        await this.executeSendCommunicationAction(execution, action)
        break
      
      case 'execute_playbook':
        await this.executePlaybookAction(execution, action)
        break
      
      case 'trigger_monitoring':
        await this.executeTriggerMonitoringAction(execution, action)
        break
      
      default:
        console.warn(`Unknown action type: ${action.type}`)
    }
  }

  private async executeNotifyAction(execution: WorkflowExecution, action: WorkflowAction): Promise<void> {
    const { recipients, message, priority } = action.parameters

    // Send notifications to specified recipients
    const notifications = recipients.map((userId: string) => ({
      user_id: userId,
      type: 'workflow_notification',
      title: `Crisis Workflow: ${execution.current_stage}`,
      message: message || `Automated workflow notification for incident ${execution.incident_id}`,
      priority: priority || 'medium',
      metadata: {
        incident_id: execution.incident_id,
        workflow_execution_id: execution.id,
        stage: execution.current_stage
      }
    }))

    await this.supabase.from('notifications').insert(notifications)
  }

  private async executeEscalateAction(execution: WorkflowExecution, action: WorkflowAction): Promise<void> {
    const { level, immediate } = action.parameters

    if (immediate) {
      await this.triggerEscalation(execution, level)
    } else {
      // Schedule escalation based on workflow rules
      await this.scheduleEscalation(execution, level, action.parameters.delay_minutes || 30)
    }
  }

  private async executeCreateMeetingAction(execution: WorkflowExecution, action: WorkflowAction): Promise<void> {
    const { meeting_type, attendees, duration_minutes } = action.parameters

    await this.crisisService.scheduleEmergencyMeeting({
      incident_id: execution.incident_id,
      title: `Emergency Response: ${meeting_type}`,
      type: meeting_type,
      scheduled_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      duration_minutes: duration_minutes || 60,
      attendees: attendees,
      agenda: ['Crisis situation review', 'Response strategy', 'Next actions']
    })
  }

  private async executeSendCommunicationAction(execution: WorkflowExecution, action: WorkflowAction): Promise<void> {
    const { communication_type, channel, audience, template_id } = action.parameters

    await this.crisisService.createCrisisCommunication({
      incident_id: execution.incident_id,
      communication_type,
      channel,
      audience,
      subject: `Crisis Update - Incident ${execution.incident_id}`,
      content: `This is an automated crisis communication update.`,
      message_template_id: template_id
    })
  }

  private async executePlaybookAction(execution: WorkflowExecution, action: WorkflowAction): Promise<void> {
    const { playbook_id } = action.parameters

    // Load and execute playbook
    const playbookResult = await this.loadPlaybook(playbook_id)
    if (playbookResult.success) {
      await this.executePlaybook(execution, playbookResult.data)
    }
  }

  private async executeTriggerMonitoringAction(execution: WorkflowExecution, action: WorkflowAction): Promise<void> {
    const { monitor_types, keywords } = action.parameters

    // Create or activate monitoring for the incident
    for (const monitorType of monitor_types) {
      await this.crisisService.createSituationMonitor({
        name: `Auto-Monitor: ${execution.incident_id}`,
        category: CrisisCategory.OPERATIONAL, // Default
        monitor_type: monitorType,
        keywords: keywords || [],
        sources: [],
        alert_threshold: 5,
        configuration: {
          incident_id: execution.incident_id,
          auto_created: true
        }
      })
    }
  }

  /**
   * ESCALATION MANAGEMENT
   */

  private async setupEscalationMonitoring(
    execution: WorkflowExecution,
    escalationPath: EscalationStep[]
  ): Promise<void> {
    for (const step of escalationPath) {
      if (step.automatic) {
        // Schedule automatic escalation
        setTimeout(async () => {
          await this.checkAndTriggerEscalation(execution, step)
        }, step.trigger_after_minutes * 60 * 1000)
      }
    }
  }

  private async checkAndTriggerEscalation(
    execution: WorkflowExecution,
    escalationStep: EscalationStep
  ): Promise<void> {
    // Check if incident is still active and hasn't been resolved
    const incident = await this.crisisService.getIncident(execution.incident_id)
    if (!incident.success) return

    if (incident.data.status === CrisisStatus.RESOLVED || 
        incident.data.status === CrisisStatus.POST_INCIDENT) {
      return // Don't escalate resolved incidents
    }

    await this.triggerEscalation(execution, escalationStep.level, escalationStep)
  }

  private async triggerEscalation(
    execution: WorkflowExecution,
    level: EscalationLevel,
    escalationStep?: EscalationStep
  ): Promise<void> {
    const escalationExecution: EscalationExecution = {
      level,
      triggered_at: new Date().toISOString(),
      notified_users: [],
      approval_status: 'pending',
      actions_taken: []
    }

    // Get users to notify based on escalation level
    const usersToNotify = await this.getUsersForEscalationLevel(level, escalationStep?.notify_roles)

    // Send escalation notifications
    const notifications = usersToNotify.map(userId => ({
      user_id: userId,
      type: 'crisis_escalation',
      title: `ESCALATION: ${level.replace('_', ' ').toUpperCase()}`,
      message: `Crisis incident ${execution.incident_id} has been escalated to ${level} level`,
      priority: 'urgent',
      metadata: {
        incident_id: execution.incident_id,
        escalation_level: level,
        workflow_execution_id: execution.id
      }
    }))

    await this.supabase.from('notifications').insert(notifications)

    escalationExecution.notified_users = usersToNotify

    // Execute escalation actions if provided
    if (escalationStep?.actions) {
      await this.executeWorkflowActions(execution, escalationStep.actions)
      escalationExecution.actions_taken = escalationStep.actions.map(a => a.type)
    }

    // Update execution with escalation history
    const { data: currentExecution } = await this.supabase
      .from('workflow_executions')
      .select('escalation_history')
      .eq('id', execution.id)
      .single()

    if (currentExecution) {
      const updatedHistory = [...(currentExecution.escalation_history || []), escalationExecution]
      
      await this.supabase
        .from('workflow_executions')
        .update({ 
          escalation_history: updatedHistory,
          performance_metrics: {
            ...execution.performance_metrics,
            escalations_triggered: execution.performance_metrics.escalations_triggered + 1
          }
        })
        .eq('id', execution.id)
    }

    await this.logActivity('trigger_escalation', 'workflow_execution', execution.id, {
      escalation_level: level,
      users_notified: usersToNotify.length
    })
  }

  private async getUsersForEscalationLevel(
    level: EscalationLevel,
    specificRoles?: string[]
  ): Promise<string[]> {
    let roles: string[]

    switch (level) {
      case EscalationLevel.TEAM_LEAD:
        roles = ['team_lead', 'project_manager']
        break
      case EscalationLevel.DEPARTMENT_HEAD:
        roles = ['department_head', 'director']
        break
      case EscalationLevel.EXECUTIVE_TEAM:
        roles = ['executive', 'ceo', 'coo', 'cfo']
        break
      case EscalationLevel.BOARD_EMERGENCY:
        roles = ['board_member', 'board_chair']
        break
      case EscalationLevel.EXTERNAL_AUTHORITIES:
        roles = ['legal_counsel', 'compliance_officer']
        break
      default:
        roles = ['admin']
    }

    if (specificRoles?.length) {
      roles = [...roles, ...specificRoles]
    }

    const { data: users, error } = await this.supabase
      .from('organization_members')
      .select('user_id')
      .in('role', roles)

    if (error) {
      console.error('Failed to get users for escalation:', error)
      return []
    }

    return users.map(u => u.user_id)
  }

  /**
   * PLAYBOOK EXECUTION
   */

  async loadPlaybook(playbookId: string): Promise<Result<ResponsePlaybook>> {
    return this.executeDbOperation(async () => {
      const { data: playbook, error } = await this.supabase
        .from('response_playbooks')
        .select('*')
        .eq('id', playbookId)
        .single()

      if (error) throw error
      return playbook as ResponsePlaybook
    }, 'loadPlaybook')
  }

  private async executePlaybook(execution: WorkflowExecution, playbook: ResponsePlaybook): Promise<void> {
    // Update execution with playbook info
    await this.supabase
      .from('workflow_executions')
      .update({ playbook_id: playbook.id })
      .eq('id', execution.id)

    // Execute playbook stages
    for (const stage of playbook.stages) {
      await this.executePlaybookStage(execution, stage)
    }
  }

  private async executePlaybookStage(execution: WorkflowExecution, stage: PlaybookStage): Promise<void> {
    const stageExecution: StageExecution = {
      stage: stage.name as WorkflowStage,
      started_at: new Date().toISOString(),
      actions_executed: stage.required_actions.length,
      success_rate: 100, // Will be updated based on actual execution
      issues: []
    }

    try {
      // Execute stage actions (simplified)
      for (const action of stage.required_actions) {
        // Convert playbook action to workflow action and execute
        const workflowAction: WorkflowAction = {
          type: this.mapPlaybookActionType(action.type),
          parameters: {
            title: action.title,
            description: action.description,
            checklist: action.checklist
          }
        }
        await this.executeAction(execution, workflowAction)
      }

      stageExecution.completed_at = new Date().toISOString()
      stageExecution.duration_minutes = this.calculateDuration(
        stageExecution.started_at, 
        stageExecution.completed_at
      )

    } catch (error) {
      stageExecution.issues.push(error instanceof Error ? error.message : String(error))
      stageExecution.success_rate = 0
    }

    // Update execution with stage history
    const { data: currentExecution } = await this.supabase
      .from('workflow_executions')
      .select('stage_history')
      .eq('id', execution.id)
      .single()

    if (currentExecution) {
      const updatedHistory = [...(currentExecution.stage_history || []), stageExecution]
      
      await this.supabase
        .from('workflow_executions')
        .update({ stage_history: updatedHistory })
        .eq('id', execution.id)
    }
  }

  /**
   * HELPER METHODS
   */

  private analyzeKeywords(rawData: any): { matches: string[], strength: number } {
    const criticalKeywords = [
      'critical', 'urgent', 'emergency', 'breach', 'failure', 'down', 'attack',
      'crisis', 'disaster', 'incident', 'outage', 'vulnerability'
    ]

    const text = this.extractTextFromRawData(rawData).toLowerCase()
    const matches = criticalKeywords.filter(keyword => text.includes(keyword))
    const strength = matches.length / criticalKeywords.length

    return { matches, strength }
  }

  private analyzeImpact(rawData: any, context?: Record<string, any>): { 
    clarity: number, 
    indicators: string[] 
  } {
    const indicators = []
    let clarity = 0.5 // Default

    // Analyze for impact indicators
    if (this.containsFinancialImpact(rawData)) {
      indicators.push('financial_impact')
      clarity += 0.2
    }

    if (this.containsOperationalImpact(rawData)) {
      indicators.push('operational_impact')
      clarity += 0.2
    }

    if (this.containsReputationalImpact(rawData)) {
      indicators.push('reputational_impact')
      clarity += 0.1
    }

    return { clarity: Math.min(clarity, 1), indicators }
  }

  private analyzeSource(rawData: any): { credibility: number } {
    // Simplified source credibility analysis
    const credibility = 0.8 // Default credibility
    return { credibility }
  }

  private async analyzeHistoricalPatterns(rawData: any): Promise<{ 
    similarity: number, 
    patterns: string[] 
  }> {
    // Simplified historical analysis
    return {
      similarity: 0.3,
      patterns: ['similar_incident_last_month']
    }
  }

  private calculateConfidenceScore(factors: {
    keyword_strength: number
    impact_clarity: number
    source_reliability: number
    historical_match: number
  }): number {
    return (
      factors.keyword_strength * 0.3 +
      factors.impact_clarity * 0.3 +
      factors.source_reliability * 0.25 +
      factors.historical_match * 0.15
    )
  }

  private determineCategoryFromKeywords(matches: string[]): CrisisCategory {
    if (matches.some(m => ['breach', 'attack', 'vulnerability'].includes(m))) {
      return CrisisCategory.CYBERSECURITY
    }
    if (matches.some(m => ['financial', 'revenue', 'cost'].includes(m))) {
      return CrisisCategory.FINANCIAL
    }
    return CrisisCategory.OPERATIONAL // Default
  }

  private determineLevelFromImpact(analysis: { clarity: number, indicators: string[] }): CrisisLevel {
    if (analysis.indicators.length >= 3) return CrisisLevel.CRITICAL
    if (analysis.indicators.length === 2) return CrisisLevel.HIGH
    if (analysis.indicators.length === 1) return CrisisLevel.MEDIUM
    return CrisisLevel.LOW
  }

  private determineSuggestedActions(
    category: CrisisCategory,
    level: CrisisLevel,
    confidence: number
  ): WorkflowAction[] {
    const actions: WorkflowAction[] = []

    if (level === CrisisLevel.CRITICAL || level === CrisisLevel.HIGH) {
      actions.push({
        type: 'escalate',
        parameters: { level: EscalationLevel.EXECUTIVE_TEAM, immediate: true }
      })
    }

    if (category === CrisisCategory.CYBERSECURITY) {
      actions.push({
        type: 'notify',
        parameters: { 
          recipients: ['security_team'], 
          message: 'Security incident detected',
          priority: 'urgent'
        }
      })
    }

    return actions
  }

  private suggestPlaybook(category: CrisisCategory, level: CrisisLevel): string | undefined {
    // Return suggested playbook ID based on category and level
    return `${category}_${level}_playbook`
  }

  private extractTextFromRawData(rawData: any): string {
    if (typeof rawData === 'string') return rawData
    if (rawData?.message) return rawData.message
    if (rawData?.description) return rawData.description
    if (rawData?.title) return rawData.title
    return JSON.stringify(rawData)
  }

  private containsFinancialImpact(rawData: any): boolean {
    const text = this.extractTextFromRawData(rawData).toLowerCase()
    return ['revenue', 'cost', 'financial', 'budget', 'loss'].some(term => text.includes(term))
  }

  private containsOperationalImpact(rawData: any): boolean {
    const text = this.extractTextFromRawData(rawData).toLowerCase()
    return ['outage', 'down', 'failure', 'service', 'system'].some(term => text.includes(term))
  }

  private containsReputationalImpact(rawData: any): boolean {
    const text = this.extractTextFromRawData(rawData).toLowerCase()
    return ['reputation', 'image', 'brand', 'customer', 'public'].some(term => text.includes(term))
  }

  private generateIncidentTitle(rawData: any, classification: IncidentClassification): string {
    return `${classification.category.toUpperCase()}: ${this.extractTextFromRawData(rawData).substring(0, 100)}`
  }

  private generateIncidentDescription(rawData: any, classification: IncidentClassification): string {
    return `Auto-detected ${classification.category} incident with ${classification.level} severity (${Math.round(classification.confidence_score * 100)}% confidence).\n\nSource data: ${this.extractTextFromRawData(rawData)}`
  }

  private assessImpact(rawData: any, classification: IncidentClassification): any {
    return {
      financial_impact: this.containsFinancialImpact(rawData) ? 50000 : undefined,
      operational_impact: this.containsOperationalImpact(rawData) ? 'Service disruption possible' : undefined,
      reputational_risk: this.containsReputationalImpact(rawData) ? 'Medium risk' : undefined
    }
  }

  private calculateEstimatedCompletion(rule: WorkflowRule): string {
    // Estimate 4-8 hours for workflow completion
    const hours = 4 + (rule.escalation_path.length * 2)
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
  }

  private async updateExecutionMetrics(
    executionId: string, 
    updates: Partial<WorkflowExecution['performance_metrics']>
  ): Promise<void> {
    const { data: current } = await this.supabase
      .from('workflow_executions')
      .select('performance_metrics')
      .eq('id', executionId)
      .single()

    if (current) {
      await this.supabase
        .from('workflow_executions')
        .update({
          performance_metrics: {
            ...current.performance_metrics,
            ...updates
          }
        })
        .eq('id', executionId)
    }
  }

  private mapPlaybookActionType(playbookType: string): WorkflowAction['type'] {
    switch (playbookType) {
      case 'communication': return 'send_communication'
      case 'coordination': return 'create_meeting'
      case 'assessment': return 'notify'
      default: return 'notify'
    }
  }

  private calculateDuration(start: string, end: string): number {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60))
  }
}