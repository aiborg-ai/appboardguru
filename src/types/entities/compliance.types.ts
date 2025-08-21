// Compliance & Governance Automation Engine - Business Logic Types
// This file contains business logic types that build on the database types

import { Database } from '../database'
import { BaseEntity, AuditableEntity, ID, Timestamp, JSONValue } from '../common'

// Database table types
export type ComplianceTemplate = Database['public']['Tables']['compliance_templates']['Row']
export type ComplianceTemplateInsert = Database['public']['Tables']['compliance_templates']['Insert']
export type ComplianceTemplateUpdate = Database['public']['Tables']['compliance_templates']['Update']

export type ComplianceCalendarEntry = Database['public']['Tables']['compliance_calendar']['Row']
export type ComplianceCalendarInsert = Database['public']['Tables']['compliance_calendar']['Insert']
export type ComplianceCalendarUpdate = Database['public']['Tables']['compliance_calendar']['Update']

export type NotificationWorkflow = Database['public']['Tables']['notification_workflows']['Row']
export type NotificationWorkflowInsert = Database['public']['Tables']['notification_workflows']['Insert']
export type NotificationWorkflowUpdate = Database['public']['Tables']['notification_workflows']['Update']

export type ComplianceParticipant = Database['public']['Tables']['compliance_participants']['Row']
export type ComplianceParticipantInsert = Database['public']['Tables']['compliance_participants']['Insert']
export type ComplianceParticipantUpdate = Database['public']['Tables']['compliance_participants']['Update']

export type NotificationAuditLog = Database['public']['Tables']['notification_audit_log']['Row']
export type NotificationAuditLogInsert = Database['public']['Tables']['notification_audit_log']['Insert']
export type NotificationAuditLogUpdate = Database['public']['Tables']['notification_audit_log']['Update']

// Enum types
export type ComplianceFrequency = Database['public']['Enums']['compliance_frequency']
export type ComplianceStatus = Database['public']['Enums']['compliance_status']
export type WorkflowStatus = Database['public']['Enums']['workflow_status']
export type ParticipantType = Database['public']['Enums']['participant_type']
export type ParticipantStatus = Database['public']['Enums']['participant_status']
export type DeadlineType = Database['public']['Enums']['deadline_type']
export type AcknowledgmentMethod = Database['public']['Enums']['acknowledgment_method']
export type AuditOutcome = Database['public']['Enums']['audit_outcome']
export type RiskLevel = Database['public']['Enums']['risk_level']

// =============================================
// BUSINESS LOGIC INTERFACES
// =============================================

// Workflow Step Definition
export interface WorkflowStep {
  step: number
  name: string
  description: string
  estimated_days?: number
  participants?: WorkflowStepParticipant[]
  deliverables?: string[]
  requirements?: string[]
  auto_advance?: boolean
  parallel_execution?: boolean
  conditions?: WorkflowCondition[]
}

// Workflow Step Participant
export interface WorkflowStepParticipant {
  type: ParticipantType
  role?: string
  user_id?: ID
  required?: boolean
  can_delegate?: boolean
  requires_evidence?: boolean
}

// Workflow Condition (for conditional logic)
export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists'
  value: any
  logic?: 'and' | 'or'
}

// Reminder Schedule Configuration
export interface ReminderSchedule {
  [key: string]: boolean | number[] | string | undefined // e.g., "30_days": true, "14_days": true
  custom_days?: number[]
  business_days_only?: boolean
  time_of_day?: string // HH:MM format
  timezone?: string
}

// Escalation Rules Configuration
export interface EscalationRules {
  [key: string]: EscalationRule // e.g., "overdue_1_day": { escalate_to: "CEO" }
}

export interface EscalationRule {
  escalate_to: string // Role or user ID
  action?: 'notify' | 'reassign' | 'flag'
  message_template?: string
  additional_recipients?: string[]
}

// Recurrence Pattern
export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'
  interval?: number // e.g., every 2 weeks
  days_of_week?: number[] // 0-6, Sunday is 0
  day_of_month?: number // 1-31
  week_of_month?: number // 1-4, first, second, etc.
  months?: number[] // 1-12
  end_date?: string
  occurrences?: number // max number of occurrences
}

// =============================================
// ENHANCED BUSINESS LOGIC TYPES
// =============================================

// Compliance Template with enhanced metadata
export interface ComplianceTemplateWithDetails extends ComplianceTemplate {
  workflow_steps_parsed: WorkflowStep[]
  reminder_schedule_parsed: ReminderSchedule
  escalation_rules_parsed: EscalationRules
  usage_count?: number
  last_used?: Timestamp
  created_by_user?: {
    id: string
    full_name: string
    email: string
  }
}

// Calendar Entry with enhanced metadata
export interface ComplianceCalendarWithDetails extends ComplianceCalendarEntry {
  template?: ComplianceTemplate
  recurrence_pattern_parsed?: RecurrencePattern
  days_until_due?: number
  is_overdue?: boolean
  assigned_workflows?: NotificationWorkflow[]
  completion_percentage?: number
}

// Workflow with enhanced metadata and relationships
export interface NotificationWorkflowWithDetails extends NotificationWorkflow {
  template?: ComplianceTemplate
  calendar_entry?: ComplianceCalendarEntry
  participants?: ComplianceParticipantWithDetails[]
  steps_parsed: WorkflowStep[]
  current_step_data?: WorkflowStep
  next_step_data?: WorkflowStep
  progress_summary?: WorkflowProgressSummary
  assigned_user?: {
    id: string
    full_name: string
    email: string
    role?: string
  }
  escalated_user?: {
    id: string
    full_name: string
    email: string
    role?: string
  }
}

// Participant with enhanced metadata
export interface ComplianceParticipantWithDetails extends ComplianceParticipant {
  user?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
    role?: string
  }
  delegated_user?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
    role?: string
  }
  step_data?: WorkflowStep
  days_overdue?: number
  completion_percentage?: number
}

// Workflow Progress Summary
export interface WorkflowProgressSummary {
  total_steps: number
  completed_steps: number
  current_step: number
  progress_percentage: number
  estimated_completion_date?: Timestamp
  overdue_days?: number
  pending_participants: number
  total_participants: number
  bottlenecks?: WorkflowBottleneck[]
}

// Workflow Bottleneck Detection
export interface WorkflowBottleneck {
  type: 'participant_overdue' | 'step_blocked' | 'resource_unavailable'
  description: string
  affected_participants?: string[]
  suggested_action?: string
  severity: 'low' | 'medium' | 'high'
}

// =============================================
// COMPLIANCE REPORTING TYPES
// =============================================

// Compliance Dashboard Summary
export interface ComplianceDashboard {
  overview: ComplianceOverview
  upcoming_deadlines: ComplianceCalendarWithDetails[]
  active_workflows: NotificationWorkflowWithDetails[]
  overdue_items: ComplianceOverdueItem[]
  compliance_metrics: ComplianceMetrics
  recent_completions: ComplianceCompletionSummary[]
}

// Compliance Overview Stats
export interface ComplianceOverview {
  total_active_workflows: number
  completed_this_month: number
  overdue_count: number
  upcoming_this_week: number
  compliance_score: number // 0-100
  trend_direction: 'up' | 'down' | 'stable'
  critical_items_count: number
}

// Overdue Item
export interface ComplianceOverdueItem {
  id: string
  title: string
  type: 'workflow' | 'calendar_entry'
  due_date: Timestamp
  days_overdue: number
  assigned_to: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  regulation_type: string
  action_url: string
}

// Compliance Metrics
export interface ComplianceMetrics {
  on_time_completion_rate: number // percentage
  average_completion_time: number // days
  escalation_rate: number // percentage
  participant_engagement_rate: number // percentage
  workflow_efficiency_score: number // 0-100
  regulatory_coverage: RegulatoryCoverage[]
}

// Regulatory Coverage
export interface RegulatoryCoverage {
  regulation_type: string
  total_requirements: number
  completed_requirements: number
  overdue_requirements: number
  coverage_percentage: number
  next_deadline?: Timestamp
}

// Completion Summary
export interface ComplianceCompletionSummary {
  id: string
  title: string
  completed_date: Timestamp
  completed_by: string
  regulation_type: string
  completion_time_days: number
  efficiency_score: number
}

// =============================================
// AUDIT AND REPORTING TYPES
// =============================================

// Audit Report Request
export interface AuditReportRequest {
  report_type: 'compliance_summary' | 'workflow_detail' | 'participant_activity' | 'regulatory_overview'
  date_range: {
    start_date: string
    end_date: string
  }
  filters?: AuditReportFilters
  format: 'json' | 'csv' | 'pdf'
  include_evidence?: boolean
  include_audit_trail?: boolean
}

// Audit Report Filters
export interface AuditReportFilters {
  regulation_types?: string[]
  workflow_ids?: string[]
  user_ids?: string[]
  statuses?: string[]
  priorities?: string[]
  categories?: string[]
}

// Audit Report Response
export interface AuditReportResponse {
  report_id: string
  report_type: string
  generated_at: Timestamp
  generated_by: string
  date_range: {
    start_date: string
    end_date: string
  }
  summary: AuditReportSummary
  data: any[] // The actual report data
  metadata: {
    total_records: number
    filters_applied: AuditReportFilters
    export_url?: string
    retention_until: Timestamp
  }
}

// Audit Report Summary
export interface AuditReportSummary {
  total_workflows: number
  completed_workflows: number
  overdue_workflows: number
  total_participants: number
  average_completion_time: number
  compliance_score: number
  regulatory_coverage: RegulatoryCoverage[]
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

// Create Workflow Request
export interface CreateWorkflowRequest {
  template_id?: string
  calendar_entry_id?: string
  name: string
  description?: string
  assigned_to?: string
  assigned_role?: string
  due_date?: Timestamp
  priority?: 'low' | 'medium' | 'high' | 'critical'
  custom_steps?: WorkflowStep[]
  custom_participants?: WorkflowStepParticipant[]
  metadata?: JSONValue
}

// Update Workflow Request
export interface UpdateWorkflowRequest {
  name?: string
  description?: string
  assigned_to?: string
  assigned_role?: string
  due_date?: Timestamp
  compliance_notes?: string
  risk_level?: RiskLevel
  metadata?: JSONValue
}

// Acknowledge Notification Request
export interface AcknowledgeNotificationRequest {
  notification_id: string
  acknowledgment_method: AcknowledgmentMethod
  evidence_url?: string
  notes?: string
  digital_signature?: {
    signature_data: string
    timestamp: Timestamp
    ip_address?: string
    user_agent?: string
  }
}

// Advance Workflow Step Request
export interface AdvanceWorkflowStepRequest {
  workflow_id: string
  completion_notes?: string
  evidence_url?: string
  force_advance?: boolean // Skip validation and force advance
}

// Create Calendar Entry Request
export interface CreateCalendarEntryRequest {
  template_id?: string
  title: string
  description?: string
  regulation_type: string
  category?: string
  due_date: string
  start_date?: string
  business_days_notice?: number
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern
  priority?: 'low' | 'medium' | 'high' | 'critical'
  is_mandatory?: boolean
  regulatory_authority?: string
  tags?: string[]
  external_reference?: string
  metadata?: JSONValue
}

// =============================================
// SEARCH AND FILTER TYPES
// =============================================

// Compliance Search Request
export interface ComplianceSearchRequest {
  query?: string
  entity_types?: ('templates' | 'workflows' | 'calendar' | 'participants')[]
  filters?: ComplianceSearchFilters
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
  pagination?: {
    page: number
    limit: number
  }
}

// Compliance Search Filters
export interface ComplianceSearchFilters {
  regulation_types?: string[]
  categories?: string[]
  statuses?: string[]
  priorities?: string[]
  assigned_to?: string[]
  date_range?: {
    start_date: string
    end_date: string
    field: 'due_date' | 'created_at' | 'completed_at'
  }
  tags?: string[]
  is_overdue?: boolean
  requires_attention?: boolean
}

// Compliance Search Response
export interface ComplianceSearchResponse {
  results: ComplianceSearchResult[]
  total: number
  facets?: {
    regulation_types: { [key: string]: number }
    categories: { [key: string]: number }
    statuses: { [key: string]: number }
    priorities: { [key: string]: number }
  }
  suggestions?: string[]
  search_metadata: {
    query: string
    execution_time_ms: number
    total_indexed: number
  }
}

// Compliance Search Result
export interface ComplianceSearchResult {
  id: string
  type: 'template' | 'workflow' | 'calendar' | 'participant'
  title: string
  description?: string
  regulation_type: string
  status: string
  priority: string
  due_date?: Timestamp
  assigned_to?: string
  organization_id: string
  url: string
  highlights?: string[]
  relevance_score: number
}

// =============================================
// NOTIFICATION TEMPLATE TYPES
// =============================================

// Compliance Notification Template
export interface ComplianceNotificationTemplate {
  template_id: string
  name: string
  regulation_type: string
  notification_type: 'deadline_reminder' | 'workflow_assignment' | 'overdue_alert' | 'completion_confirmation' | 'escalation_notice'
  priority: 'low' | 'medium' | 'high' | 'critical'
  channels: ('email' | 'in_app' | 'sms')[]
  subject_template: string
  body_template: string
  variables: NotificationTemplateVariable[]
  conditions?: NotificationTemplateCondition[]
  frequency_limits?: NotificationFrequencyLimits
}

// Notification Template Variable
export interface NotificationTemplateVariable {
  name: string
  description: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'array'
  required: boolean
  example_value: any
}

// Notification Template Condition
export interface NotificationTemplateCondition {
  field: string
  operator: string
  value: any
  description: string
}

// Notification Frequency Limits
export interface NotificationFrequencyLimits {
  max_per_day?: number
  max_per_week?: number
  min_interval_hours?: number
  quiet_hours?: {
    start_time: string // HH:MM
    end_time: string // HH:MM
    timezone?: string
  }
}

// =============================================
// INTEGRATION TYPES
// =============================================

// External System Integration
export interface ExternalIntegration {
  system_name: string
  system_type: 'regulatory_database' | 'document_management' | 'audit_tool' | 'calendar_system'
  api_endpoint: string
  authentication: {
    type: 'api_key' | 'oauth' | 'basic_auth'
    credentials?: JSONValue
  }
  sync_settings: {
    auto_sync: boolean
    sync_frequency: ComplianceFrequency
    last_sync?: Timestamp
    sync_fields: string[]
  }
  mapping: {
    [local_field: string]: string // external field
  }
}

// Sync Status
export interface SyncStatus {
  integration_id: string
  last_sync_at: Timestamp
  next_sync_at?: Timestamp
  status: 'success' | 'failed' | 'in_progress' | 'paused'
  records_processed?: number
  errors?: SyncError[]
  duration_ms?: number
}

// Sync Error
export interface SyncError {
  record_id?: string
  error_code: string
  error_message: string
  field?: string
  timestamp: Timestamp
  resolution_status: 'pending' | 'resolved' | 'ignored'
}

// =============================================
// UTILITY TYPES
// =============================================

// API Response wrapper
export interface ComplianceApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  metadata?: {
    timestamp: Timestamp
    request_id: string
    execution_time_ms: number
    version: string
  }
}

// Pagination metadata
export interface CompliancePaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

// Sort options
export interface ComplianceSortOptions {
  field: string
  direction: 'asc' | 'desc'
  secondary_sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
}

// Bulk operation request
export interface BulkOperationRequest {
  operation: 'update' | 'delete' | 'acknowledge' | 'escalate'
  entity_ids: string[]
  data?: JSONValue
  options?: {
    skip_validation?: boolean
    send_notifications?: boolean
    batch_size?: number
  }
}

// Bulk operation response
export interface BulkOperationResponse {
  total_requested: number
  successful: number
  failed: number
  skipped: number
  results: BulkOperationResult[]
  execution_time_ms: number
}

// Bulk operation result
export interface BulkOperationResult {
  entity_id: string
  status: 'success' | 'failed' | 'skipped'
  error?: string
  data?: JSONValue
}