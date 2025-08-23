import { BaseService } from './base.service'
import { Result, success, failure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { z } from 'zod'
import { CrisisLevel, CrisisCategory } from './crisis-management.service'

export enum CommunicationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH_NOTIFICATION = 'push_notification',
  SLACK = 'slack',
  TEAMS = 'teams',
  SOCIAL_MEDIA = 'social_media',
  PRESS_RELEASE = 'press_release',
  WEBSITE_BANNER = 'website_banner',
  PHONE_CALL = 'phone_call',
  EMERGENCY_BROADCAST = 'emergency_broadcast'
}

export enum CommunicationType {
  INTERNAL_ALERT = 'internal_alert',
  STAKEHOLDER_UPDATE = 'stakeholder_update',
  CUSTOMER_NOTIFICATION = 'customer_notification',
  MEDIA_STATEMENT = 'media_statement',
  REGULATORY_FILING = 'regulatory_filing',
  INVESTOR_ALERT = 'investor_alert',
  EMPLOYEE_ANNOUNCEMENT = 'employee_announcement',
  BOARD_NOTIFICATION = 'board_notification',
  VENDOR_ALERT = 'vendor_alert',
  COMMUNITY_NOTICE = 'community_notice'
}

export enum ApprovalStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  LEGAL_REVIEW = 'legal_review',
  EXECUTIVE_APPROVAL = 'executive_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum MessagePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export interface CommunicationTemplate {
  id: string
  name: string
  description: string
  category: CrisisCategory
  severity: CrisisLevel
  communication_type: CommunicationType
  channel: CommunicationChannel
  subject_template: string
  content_template: string
  variables: TemplateVariable[]
  approval_workflow: ApprovalStep[]
  legal_requirements: LegalRequirement[]
  compliance_tags: string[]
  audience_segments: AudienceSegment[]
  timing_constraints: TimingConstraint[]
  personalization_options: PersonalizationOption[]
  translation_available: boolean
  supported_languages: string[]
  template_version: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  last_used?: string
  usage_count: number
}

export interface TemplateVariable {
  name: string
  description: string
  type: 'text' | 'number' | 'date' | 'url' | 'currency' | 'list'
  required: boolean
  default_value?: any
  validation_rules?: string[]
  example_value: string
}

export interface ApprovalStep {
  step_order: number
  approver_role: string[]
  required_approvals: number
  auto_approve_conditions?: string[]
  escalation_timeout_minutes: number
  can_reject: boolean
  can_edit: boolean
  instructions?: string
}

export interface LegalRequirement {
  jurisdiction: string
  requirement_type: 'regulatory_filing' | 'disclosure' | 'timing' | 'content_restriction'
  description: string
  compliance_check: string
  deadline_hours?: number
  mandatory_language?: string
  review_required: boolean
}

export interface AudienceSegment {
  id: string
  name: string
  description: string
  criteria: {
    roles?: string[]
    departments?: string[]
    locations?: string[]
    stakeholder_types?: string[]
    contact_preferences?: CommunicationChannel[]
  }
  size_estimate: number
}

export interface TimingConstraint {
  constraint_type: 'immediate' | 'business_hours' | 'delayed' | 'scheduled'
  parameters: {
    delay_minutes?: number
    schedule_time?: string
    timezone?: string
    business_hours_only?: boolean
    exclude_weekends?: boolean
  }
}

export interface PersonalizationOption {
  field_name: string
  source: 'user_profile' | 'organization_data' | 'incident_data' | 'custom'
  fallback_value: string
}

export interface CommunicationMessage {
  id: string
  incident_id?: string
  template_id?: string
  communication_type: CommunicationType
  channel: CommunicationChannel
  priority: MessagePriority
  subject: string
  content: string
  variables_used: Record<string, any>
  target_audiences: string[]
  recipient_count: number
  approval_status: ApprovalStatus
  approval_history: ApprovalRecord[]
  scheduled_at?: string
  sent_at?: string
  delivery_status: DeliveryStatus
  analytics: CommunicationAnalytics
  metadata: Record<string, any>
  created_by: string
  created_at: string
  updated_at: string
}

export interface ApprovalRecord {
  id: string
  step_order: number
  approver_id: string
  action: 'approved' | 'rejected' | 'requested_changes'
  timestamp: string
  comments?: string
  changes_made?: Record<string, any>
  escalation_triggered?: boolean
}

export interface DeliveryStatus {
  total_recipients: number
  sent: number
  delivered: number
  failed: number
  bounced: number
  opened?: number
  clicked?: number
  unsubscribed?: number
  spam_reported?: number
  delivery_details: DeliveryDetail[]
}

export interface DeliveryDetail {
  recipient_id: string
  status: 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked'
  timestamp: string
  error_message?: string
  delivery_method: CommunicationChannel
}

export interface CommunicationAnalytics {
  open_rate?: number
  click_rate?: number
  response_rate?: number
  engagement_score?: number
  sentiment_analysis?: {
    positive: number
    negative: number
    neutral: number
  }
  feedback_received?: number
  follow_up_required?: number
}

export interface DistributionList {
  id: string
  name: string
  description: string
  list_type: 'static' | 'dynamic' | 'role_based' | 'emergency'
  criteria: {
    roles?: string[]
    departments?: string[]
    locations?: string[]
    stakeholder_types?: string[]
    emergency_contact?: boolean
  }
  contacts: ContactInfo[]
  auto_update: boolean
  last_updated: string
  created_by: string
  created_at: string
}

export interface ContactInfo {
  id: string
  user_id?: string
  name: string
  email?: string
  phone?: string
  preferred_channel: CommunicationChannel
  emergency_contact: boolean
  role: string
  department?: string
  location?: string
  timezone: string
  contact_restrictions?: {
    no_contact_hours?: { start: string; end: string }
    emergency_only?: boolean
    channels_blocked?: CommunicationChannel[]
  }
  last_contacted?: string
}

export interface CommunicationWorkflow {
  id: string
  name: string
  description: string
  trigger_conditions: {
    incident_categories?: CrisisCategory[]
    severity_levels?: CrisisLevel[]
    stakeholder_impact?: string[]
    time_based?: boolean
  }
  workflow_steps: WorkflowStep[]
  escalation_rules: EscalationRule[]
  success_criteria: string[]
  failure_conditions: string[]
  created_at: string
  updated_at: string
}

export interface WorkflowStep {
  step_order: number
  step_name: string
  action: 'send_message' | 'get_approval' | 'wait' | 'condition_check' | 'escalate'
  parameters: {
    template_id?: string
    audience_segments?: string[]
    approval_required?: boolean
    wait_minutes?: number
    condition?: string
    escalation_level?: string
  }
  success_conditions: string[]
  failure_actions: string[]
  timeout_minutes?: number
}

export interface EscalationRule {
  rule_id: string
  condition: string
  escalation_action: 'notify_management' | 'trigger_emergency' | 'involve_legal' | 'media_response'
  escalation_contacts: string[]
  timeout_minutes: number
}

// Input validation schemas
const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.nativeEnum(CrisisCategory),
  severity: z.nativeEnum(CrisisLevel),
  communication_type: z.nativeEnum(CommunicationType),
  channel: z.nativeEnum(CommunicationChannel),
  subject_template: z.string().min(1).max(300),
  content_template: z.string().min(1),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    type: z.enum(['text', 'number', 'date', 'url', 'currency', 'list']),
    required: z.boolean(),
    default_value: z.any().optional(),
    validation_rules: z.array(z.string()).optional(),
    example_value: z.string()
  })).optional(),
  approval_workflow: z.array(z.object({
    step_order: z.number(),
    approver_role: z.array(z.string()),
    required_approvals: z.number().min(1),
    escalation_timeout_minutes: z.number().min(1),
    can_reject: z.boolean(),
    can_edit: z.boolean()
  })).optional(),
  supported_languages: z.array(z.string()).optional()
})

const CreateMessageSchema = z.object({
  incident_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  communication_type: z.nativeEnum(CommunicationType),
  channel: z.nativeEnum(CommunicationChannel),
  priority: z.nativeEnum(MessagePriority),
  subject: z.string().min(1).max(300),
  content: z.string().min(1),
  target_audiences: z.array(z.string()).min(1),
  variables_used: z.record(z.any()).optional(),
  scheduled_at: z.string().datetime().optional()
})

export class CrisisCommunicationManagementService extends BaseService {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * TEMPLATE MANAGEMENT
   */

  async createTemplate(
    data: z.infer<typeof CreateTemplateSchema>
  ): Promise<Result<CommunicationTemplate>> {
    const validatedData = this.validateWithContext(data, CreateTemplateSchema, 'create communication template')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'communication_templates',
      'create'
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      const template: CommunicationTemplate = {
        id: crypto.randomUUID(),
        name: validatedData.data.name,
        description: validatedData.data.description,
        category: validatedData.data.category,
        severity: validatedData.data.severity,
        communication_type: validatedData.data.communication_type,
        channel: validatedData.data.channel,
        subject_template: validatedData.data.subject_template,
        content_template: validatedData.data.content_template,
        variables: validatedData.data.variables || [],
        approval_workflow: validatedData.data.approval_workflow || this.getDefaultApprovalWorkflow(validatedData.data.communication_type),
        legal_requirements: this.getLegalRequirements(validatedData.data.communication_type, validatedData.data.category),
        compliance_tags: this.generateComplianceTags(validatedData.data.communication_type, validatedData.data.category),
        audience_segments: await this.getDefaultAudienceSegments(validatedData.data.communication_type),
        timing_constraints: this.getDefaultTimingConstraints(validatedData.data.channel),
        personalization_options: this.getDefaultPersonalizationOptions(),
        translation_available: (validatedData.data.supported_languages?.length || 0) > 1,
        supported_languages: validatedData.data.supported_languages || ['en'],
        template_version: 1,
        is_active: true,
        created_by: user.data.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0
      }

      const { data: createdTemplate, error } = await this.supabase
        .from('communication_templates')
        .insert(template)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('create_communication_template', 'communication_template', template.id, {
        name: template.name,
        communication_type: template.communication_type,
        channel: template.channel
      })

      return createdTemplate as CommunicationTemplate
    }, 'createTemplate')
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<CommunicationTemplate, 'id' | 'created_by' | 'created_at' | 'usage_count'>>
  ): Promise<Result<CommunicationTemplate>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'communication_templates',
      'update',
      templateId
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      // Increment version number
      const { data: currentTemplate } = await this.supabase
        .from('communication_templates')
        .select('template_version')
        .eq('id', templateId)
        .single()

      const { data: template, error } = await this.supabase
        .from('communication_templates')
        .update({
          ...updates,
          template_version: (currentTemplate?.template_version || 1) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('update_communication_template', 'communication_template', templateId)
      
      return template as CommunicationTemplate
    }, 'updateTemplate')
  }

  async getTemplatesByCategory(
    category: CrisisCategory,
    communicationType?: CommunicationType,
    channel?: CommunicationChannel
  ): Promise<Result<CommunicationTemplate[]>> {
    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('communication_templates')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('name')

      if (communicationType) {
        query = query.eq('communication_type', communicationType)
      }

      if (channel) {
        query = query.eq('channel', channel)
      }

      const { data: templates, error } = await query

      if (error) throw error
      return templates as CommunicationTemplate[]
    }, 'getTemplatesByCategory')
  }

  /**
   * MESSAGE CREATION AND MANAGEMENT
   */

  async createMessage(
    data: z.infer<typeof CreateMessageSchema>
  ): Promise<Result<CommunicationMessage>> {
    const validatedData = this.validateWithContext(data, CreateMessageSchema, 'create communication message')
    if (!validatedData.success) return validatedData

    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'communication_messages',
      'create'
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      // Load template if specified
      let template: CommunicationTemplate | undefined
      if (validatedData.data.template_id) {
        const templateResult = await this.getTemplate(validatedData.data.template_id)
        if (templateResult.success) {
          template = templateResult.data
        }
      }

      // Process variables and personalize content
      let processedSubject = validatedData.data.subject
      let processedContent = validatedData.data.content

      if (template && validatedData.data.variables_used) {
        processedSubject = this.processTemplate(template.subject_template, validatedData.data.variables_used)
        processedContent = this.processTemplate(template.content_template, validatedData.data.variables_used)
      }

      // Calculate recipient count
      const recipientCount = await this.calculateRecipientCount(validatedData.data.target_audiences)

      const message: CommunicationMessage = {
        id: crypto.randomUUID(),
        incident_id: validatedData.data.incident_id,
        template_id: validatedData.data.template_id,
        communication_type: validatedData.data.communication_type,
        channel: validatedData.data.channel,
        priority: validatedData.data.priority,
        subject: processedSubject,
        content: processedContent,
        variables_used: validatedData.data.variables_used || {},
        target_audiences: validatedData.data.target_audiences,
        recipient_count: recipientCount,
        approval_status: this.determineInitialApprovalStatus(validatedData.data.communication_type, template),
        approval_history: [],
        scheduled_at: validatedData.data.scheduled_at,
        delivery_status: {
          total_recipients: recipientCount,
          sent: 0,
          delivered: 0,
          failed: 0,
          bounced: 0,
          delivery_details: []
        },
        analytics: {
          engagement_score: 0
        },
        metadata: {
          template_version: template?.template_version
        },
        created_by: user.data.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdMessage, error } = await this.supabase
        .from('communication_messages')
        .insert(message)
        .select()
        .single()

      if (error) throw error

      // Start approval workflow if required
      if (template?.approval_workflow && template.approval_workflow.length > 0) {
        await this.initiateApprovalWorkflow(message.id, template.approval_workflow)
      } else if (message.approval_status === ApprovalStatus.APPROVED) {
        // Send immediately if no approval required
        await this.sendMessage(message.id)
      }

      // Update template usage count
      if (template) {
        await this.incrementTemplateUsage(template.id)
      }

      await this.logActivity('create_communication_message', 'communication_message', message.id, {
        communication_type: message.communication_type,
        channel: message.channel,
        recipient_count: recipientCount,
        template_used: !!template
      })

      return createdMessage as CommunicationMessage
    }, 'createMessage')
  }

  async approveMessage(
    messageId: string,
    action: 'approved' | 'rejected' | 'requested_changes',
    comments?: string,
    changes?: Record<string, any>
  ): Promise<Result<CommunicationMessage>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    const hasPermission = await this.checkPermissionWithContext(
      user.data.id,
      'communication_messages',
      'approve',
      messageId
    )
    if (!hasPermission.success) return hasPermission

    return this.executeDbOperation(async () => {
      const { data: message, error: fetchError } = await this.supabase
        .from('communication_messages')
        .select('*')
        .eq('id', messageId)
        .single()

      if (fetchError) throw fetchError

      // Create approval record
      const approvalRecord: ApprovalRecord = {
        id: crypto.randomUUID(),
        step_order: message.approval_history.length + 1,
        approver_id: user.data.id,
        action,
        timestamp: new Date().toISOString(),
        comments,
        changes_made: changes
      }

      const updatedApprovalHistory = [...message.approval_history, approvalRecord]

      // Determine new approval status
      let newApprovalStatus = message.approval_status
      if (action === 'approved') {
        // Check if all required approvals are received
        const template = message.template_id ? await this.getTemplate(message.template_id) : null
        if (template.success && this.allApprovalsReceived(updatedApprovalHistory, template.data.approval_workflow)) {
          newApprovalStatus = ApprovalStatus.APPROVED
        }
      } else if (action === 'rejected') {
        newApprovalStatus = ApprovalStatus.REJECTED
      } else if (action === 'requested_changes') {
        newApprovalStatus = ApprovalStatus.DRAFT
      }

      // Update message
      const updateData: any = {
        approval_status: newApprovalStatus,
        approval_history: updatedApprovalHistory,
        updated_at: new Date().toISOString()
      }

      // Apply changes if provided
      if (changes) {
        if (changes.subject) updateData.subject = changes.subject
        if (changes.content) updateData.content = changes.content
      }

      const { data: updatedMessage, error } = await this.supabase
        .from('communication_messages')
        .update(updateData)
        .eq('id', messageId)
        .select()
        .single()

      if (error) throw error

      // Send message if fully approved
      if (newApprovalStatus === ApprovalStatus.APPROVED) {
        await this.sendMessage(messageId)
      }

      await this.logActivity('approve_communication_message', 'communication_message', messageId, {
        action,
        new_status: newApprovalStatus,
        approver_role: user.data.role
      })

      return updatedMessage as CommunicationMessage
    }, 'approveMessage')
  }

  async sendMessage(messageId: string): Promise<Result<DeliveryStatus>> {
    return this.executeDbOperation(async () => {
      const { data: message, error: fetchError } = await this.supabase
        .from('communication_messages')
        .select('*')
        .eq('id', messageId)
        .single()

      if (fetchError) throw fetchError

      // Check if message is approved
      if (message.approval_status !== ApprovalStatus.APPROVED) {
        throw new Error('Message must be approved before sending')
      }

      // Get recipient list
      const recipients = await this.getRecipientsForAudiences(message.target_audiences, message.channel)

      // Send via appropriate channel
      const deliveryResults = await this.deliverMessage(message, recipients)

      // Update delivery status
      const deliveryStatus: DeliveryStatus = {
        total_recipients: recipients.length,
        sent: deliveryResults.filter(r => r.status === 'sent').length,
        delivered: deliveryResults.filter(r => r.status === 'delivered').length,
        failed: deliveryResults.filter(r => r.status === 'failed').length,
        bounced: deliveryResults.filter(r => r.status === 'bounced').length,
        delivery_details: deliveryResults
      }

      // Update message
      await this.supabase
        .from('communication_messages')
        .update({
          approval_status: ApprovalStatus.SENT,
          sent_at: new Date().toISOString(),
          delivery_status: deliveryStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)

      await this.logActivity('send_communication_message', 'communication_message', messageId, {
        channel: message.channel,
        recipients_count: recipients.length,
        delivery_success_rate: deliveryStatus.sent / deliveryStatus.total_recipients
      })

      return deliveryStatus
    }, 'sendMessage')
  }

  /**
   * DISTRIBUTION LIST MANAGEMENT
   */

  async createDistributionList(
    listData: Omit<DistributionList, 'id' | 'created_by' | 'created_at' | 'last_updated'>
  ): Promise<Result<DistributionList>> {
    const user = await this.getCurrentUser()
    if (!user.success) return user

    return this.executeDbOperation(async () => {
      const distributionList: DistributionList = {
        ...listData,
        id: crypto.randomUUID(),
        created_by: user.data.id,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      }

      const { data: createdList, error } = await this.supabase
        .from('distribution_lists')
        .insert(distributionList)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('create_distribution_list', 'distribution_list', distributionList.id, {
        name: listData.name,
        type: listData.list_type,
        contact_count: listData.contacts.length
      })

      return createdList as DistributionList
    }, 'createDistributionList')
  }

  async updateDistributionList(
    listId: string,
    updates: Partial<Omit<DistributionList, 'id' | 'created_by' | 'created_at'>>
  ): Promise<Result<DistributionList>> {
    return this.executeDbOperation(async () => {
      const { data: list, error } = await this.supabase
        .from('distribution_lists')
        .update({
          ...updates,
          last_updated: new Date().toISOString()
        })
        .eq('id', listId)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('update_distribution_list', 'distribution_list', listId)
      
      return list as DistributionList
    }, 'updateDistributionList')
  }

  /**
   * ANALYTICS AND REPORTING
   */

  async getCommunicationAnalytics(
    dateRange: { start_date: string; end_date: string },
    filters?: {
      communication_types?: CommunicationType[]
      channels?: CommunicationChannel[]
      incident_ids?: string[]
    }
  ): Promise<Result<{
    summary: {
      total_messages: number
      total_recipients: number
      average_delivery_rate: number
      average_open_rate: number
      average_click_rate: number
    }
    by_channel: Record<CommunicationChannel, {
      messages_sent: number
      delivery_rate: number
      engagement_rate: number
    }>
    by_type: Record<CommunicationType, {
      messages_sent: number
      approval_rate: number
      average_approval_time: number
    }>
    timeline: Array<{
      date: string
      messages_sent: number
      delivery_rate: number
      engagement_rate: number
    }>
  }>> {
    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('communication_messages')
        .select('*')
        .gte('created_at', dateRange.start_date)
        .lte('created_at', dateRange.end_date)

      // Apply filters
      if (filters?.communication_types) {
        query = query.in('communication_type', filters.communication_types)
      }
      if (filters?.channels) {
        query = query.in('channel', filters.channels)
      }
      if (filters?.incident_ids) {
        query = query.in('incident_id', filters.incident_ids)
      }

      const { data: messages, error } = await query

      if (error) throw error

      // Calculate analytics
      const summary = this.calculateSummaryStats(messages)
      const byChannel = this.groupMessagesByChannel(messages)
      const byType = this.groupMessagesByType(messages)
      const timeline = this.generateTimeline(messages, dateRange)

      return {
        summary,
        by_channel: byChannel,
        by_type: byType,
        timeline
      }
    }, 'getCommunicationAnalytics')
  }

  /**
   * WORKFLOW AUTOMATION
   */

  async createCommunicationWorkflow(
    workflowData: Omit<CommunicationWorkflow, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Result<CommunicationWorkflow>> {
    return this.executeDbOperation(async () => {
      const workflow: CommunicationWorkflow = {
        ...workflowData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdWorkflow, error } = await this.supabase
        .from('communication_workflows')
        .insert(workflow)
        .select()
        .single()

      if (error) throw error

      await this.logActivity('create_communication_workflow', 'communication_workflow', workflow.id)

      return createdWorkflow as CommunicationWorkflow
    }, 'createCommunicationWorkflow')
  }

  async executeCommunicationWorkflow(
    workflowId: string,
    incidentId: string,
    triggerData: Record<string, any>
  ): Promise<Result<string[]>> {
    return this.executeDbOperation(async () => {
      const { data: workflow, error } = await this.supabase
        .from('communication_workflows')
        .select('*')
        .eq('id', workflowId)
        .single()

      if (error) throw error

      const messageIds: string[] = []

      // Execute workflow steps
      for (const step of workflow.workflow_steps) {
        try {
          const stepResult = await this.executeWorkflowStep(step, incidentId, triggerData)
          if (stepResult.success && stepResult.data) {
            messageIds.push(stepResult.data)
          }
        } catch (error) {
          console.error(`Workflow step ${step.step_order} failed:`, error)
          // Continue with next step unless it's critical
        }
      }

      await this.logActivity('execute_communication_workflow', 'communication_workflow', workflowId, {
        incident_id: incidentId,
        messages_created: messageIds.length
      })

      return messageIds
    }, 'executeCommunicationWorkflow')
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private getDefaultApprovalWorkflow(communicationType: CommunicationType): ApprovalStep[] {
    switch (communicationType) {
      case CommunicationType.MEDIA_STATEMENT:
      case CommunicationType.REGULATORY_FILING:
        return [
          {
            step_order: 1,
            approver_role: ['legal_counsel'],
            required_approvals: 1,
            escalation_timeout_minutes: 60,
            can_reject: true,
            can_edit: true,
            instructions: 'Legal review required for external communications'
          },
          {
            step_order: 2,
            approver_role: ['ceo', 'board_chair'],
            required_approvals: 1,
            escalation_timeout_minutes: 30,
            can_reject: true,
            can_edit: false,
            instructions: 'Executive approval required for public statements'
          }
        ]
      
      case CommunicationType.INVESTOR_ALERT:
        return [
          {
            step_order: 1,
            approver_role: ['cfo', 'investor_relations'],
            required_approvals: 1,
            escalation_timeout_minutes: 45,
            can_reject: true,
            can_edit: true
          }
        ]
      
      default:
        return [
          {
            step_order: 1,
            approver_role: ['communications_manager'],
            required_approvals: 1,
            escalation_timeout_minutes: 60,
            can_reject: true,
            can_edit: true
          }
        ]
    }
  }

  private getLegalRequirements(
    communicationType: CommunicationType,
    category: CrisisCategory
  ): LegalRequirement[] {
    const requirements: LegalRequirement[] = []

    if (communicationType === CommunicationType.REGULATORY_FILING) {
      requirements.push({
        jurisdiction: 'US',
        requirement_type: 'regulatory_filing',
        description: 'SEC filing requirements for material events',
        compliance_check: 'material_event_disclosure',
        deadline_hours: 24,
        review_required: true
      })
    }

    if (category === CrisisCategory.FINANCIAL) {
      requirements.push({
        jurisdiction: 'US',
        requirement_type: 'disclosure',
        description: 'Material financial information disclosure',
        compliance_check: 'financial_materiality',
        review_required: true
      })
    }

    return requirements
  }

  private generateComplianceTags(
    communicationType: CommunicationType,
    category: CrisisCategory
  ): string[] {
    const tags = ['crisis_communication']

    if (communicationType === CommunicationType.REGULATORY_FILING) {
      tags.push('regulatory_compliance', 'sec_filing')
    }

    if (category === CrisisCategory.CYBERSECURITY) {
      tags.push('cybersecurity_disclosure', 'data_breach')
    }

    if (category === CrisisCategory.FINANCIAL) {
      tags.push('financial_disclosure', 'material_event')
    }

    return tags
  }

  private async getDefaultAudienceSegments(communicationType: CommunicationType): Promise<AudienceSegment[]> {
    const segments: AudienceSegment[] = []

    switch (communicationType) {
      case CommunicationType.EMPLOYEE_ANNOUNCEMENT:
        segments.push({
          id: 'employees',
          name: 'All Employees',
          description: 'All organization employees',
          criteria: { roles: ['employee'] },
          size_estimate: 100
        })
        break
      
      case CommunicationType.BOARD_NOTIFICATION:
        segments.push({
          id: 'board_members',
          name: 'Board Members',
          description: 'Board of Directors',
          criteria: { roles: ['board_member', 'board_chair'] },
          size_estimate: 12
        })
        break
      
      case CommunicationType.STAKEHOLDER_UPDATE:
        segments.push({
          id: 'key_stakeholders',
          name: 'Key Stakeholders',
          description: 'Primary organizational stakeholders',
          criteria: { stakeholder_types: ['investor', 'partner', 'customer'] },
          size_estimate: 50
        })
        break
    }

    return segments
  }

  private getDefaultTimingConstraints(channel: CommunicationChannel): TimingConstraint[] {
    switch (channel) {
      case CommunicationChannel.PHONE_CALL:
        return [{
          constraint_type: 'business_hours',
          parameters: {
            business_hours_only: true,
            exclude_weekends: true
          }
        }]
      
      case CommunicationChannel.EMERGENCY_BROADCAST:
        return [{
          constraint_type: 'immediate',
          parameters: {}
        }]
      
      default:
        return [{
          constraint_type: 'immediate',
          parameters: {}
        }]
    }
  }

  private getDefaultPersonalizationOptions(): PersonalizationOption[] {
    return [
      {
        field_name: 'first_name',
        source: 'user_profile',
        fallback_value: 'Stakeholder'
      },
      {
        field_name: 'organization_name',
        source: 'organization_data',
        fallback_value: 'Organization'
      },
      {
        field_name: 'incident_title',
        source: 'incident_data',
        fallback_value: 'Crisis Incident'
      }
    ]
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template

    // Replace template variables with actual values
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`
      const value = variables[key]
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value))
    })

    return processed
  }

  private async calculateRecipientCount(audienceIds: string[]): Promise<number> {
    // This would calculate based on distribution lists and audience segments
    return audienceIds.length * 10 // Placeholder
  }

  private determineInitialApprovalStatus(
    communicationType: CommunicationType,
    template?: CommunicationTemplate
  ): ApprovalStatus {
    if (template?.approval_workflow && template.approval_workflow.length > 0) {
      return ApprovalStatus.PENDING_REVIEW
    }

    // Auto-approve internal communications
    if ([
      CommunicationType.INTERNAL_ALERT,
      CommunicationType.EMPLOYEE_ANNOUNCEMENT
    ].includes(communicationType)) {
      return ApprovalStatus.APPROVED
    }

    return ApprovalStatus.PENDING_REVIEW
  }

  private async getTemplate(templateId: string): Promise<Result<CommunicationTemplate>> {
    return this.executeDbOperation(async () => {
      const { data: template, error } = await this.supabase
        .from('communication_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) throw error
      return template as CommunicationTemplate
    }, 'getTemplate')
  }

  private async initiateApprovalWorkflow(
    messageId: string,
    approvalWorkflow: ApprovalStep[]
  ): Promise<void> {
    // Send approval requests to the first step approvers
    const firstStep = approvalWorkflow[0]
    
    for (const role of firstStep.approver_role) {
      // Get users with this role and send approval request
      const { data: users } = await this.supabase
        .from('organization_members')
        .select('user_id')
        .eq('role', role)

      if (users) {
        const notifications = users.map(user => ({
          user_id: user.user_id,
          type: 'communication_approval',
          title: 'Communication Approval Required',
          message: 'A crisis communication requires your approval',
          priority: 'urgent',
          metadata: { message_id: messageId, approval_step: 1 }
        }))

        await this.supabase.from('notifications').insert(notifications)
      }
    }
  }

  private allApprovalsReceived(
    approvalHistory: ApprovalRecord[],
    workflow: ApprovalStep[]
  ): boolean {
    // Check if all required approvals have been received
    for (const step of workflow) {
      const stepApprovals = approvalHistory.filter(a => 
        a.step_order === step.step_order && a.action === 'approved'
      )
      if (stepApprovals.length < step.required_approvals) {
        return false
      }
    }
    return true
  }

  private async incrementTemplateUsage(templateId: string): Promise<void> {
    await this.supabase
      .from('communication_templates')
      .update({
        usage_count: this.supabase.from('communication_templates').select('usage_count').eq('id', templateId).single().then(r => (r.data?.usage_count || 0) + 1),
        last_used: new Date().toISOString()
      })
      .eq('id', templateId)
  }

  private async getRecipientsForAudiences(
    audienceIds: string[],
    channel: CommunicationChannel
  ): Promise<ContactInfo[]> {
    // This would resolve audience IDs to actual contact information
    return [] // Placeholder
  }

  private async deliverMessage(
    message: CommunicationMessage,
    recipients: ContactInfo[]
  ): Promise<DeliveryDetail[]> {
    // This would actually send the message via the specified channel
    return recipients.map(recipient => ({
      recipient_id: recipient.id,
      status: 'sent' as const,
      timestamp: new Date().toISOString(),
      delivery_method: message.channel
    }))
  }

  private calculateSummaryStats(messages: any[]): any {
    return {
      total_messages: messages.length,
      total_recipients: messages.reduce((sum, m) => sum + m.recipient_count, 0),
      average_delivery_rate: messages.length > 0 ? 
        messages.reduce((sum, m) => sum + (m.delivery_status?.sent || 0) / (m.delivery_status?.total_recipients || 1), 0) / messages.length : 0,
      average_open_rate: 0, // Placeholder
      average_click_rate: 0 // Placeholder
    }
  }

  private groupMessagesByChannel(messages: any[]): Record<CommunicationChannel, any> {
    const grouped = {} as Record<CommunicationChannel, any>
    
    Object.values(CommunicationChannel).forEach(channel => {
      const channelMessages = messages.filter(m => m.channel === channel)
      grouped[channel] = {
        messages_sent: channelMessages.length,
        delivery_rate: channelMessages.length > 0 ? 
          channelMessages.reduce((sum, m) => sum + (m.delivery_status?.sent || 0) / (m.delivery_status?.total_recipients || 1), 0) / channelMessages.length : 0,
        engagement_rate: 0 // Placeholder
      }
    })

    return grouped
  }

  private groupMessagesByType(messages: any[]): Record<CommunicationType, any> {
    const grouped = {} as Record<CommunicationType, any>
    
    Object.values(CommunicationType).forEach(type => {
      const typeMessages = messages.filter(m => m.communication_type === type)
      grouped[type] = {
        messages_sent: typeMessages.length,
        approval_rate: typeMessages.length > 0 ?
          typeMessages.filter(m => m.approval_status === ApprovalStatus.APPROVED).length / typeMessages.length : 0,
        average_approval_time: 0 // Placeholder
      }
    })

    return grouped
  }

  private generateTimeline(messages: any[], dateRange: { start_date: string; end_date: string }): any[] {
    // Generate daily timeline data
    return [] // Placeholder
  }

  private async executeWorkflowStep(
    step: WorkflowStep,
    incidentId: string,
    triggerData: Record<string, any>
  ): Promise<Result<string | null>> {
    switch (step.action) {
      case 'send_message':
        if (step.parameters.template_id) {
          return await this.createMessage({
            incident_id: incidentId,
            template_id: step.parameters.template_id,
            communication_type: CommunicationType.INTERNAL_ALERT, // Default
            channel: CommunicationChannel.EMAIL, // Default
            priority: MessagePriority.HIGH,
            subject: 'Automated Crisis Communication',
            content: 'This is an automated message from the crisis management workflow.',
            target_audiences: step.parameters.audience_segments || [],
            variables_used: triggerData
          }).then(result => result.success ? success(result.data.id) : result)
        }
        break
      
      case 'wait':
        if (step.parameters.wait_minutes) {
          await new Promise(resolve => setTimeout(resolve, step.parameters.wait_minutes! * 60 * 1000))
        }
        break
      
      // Add other workflow step types as needed
    }

    return success(null)
  }
}