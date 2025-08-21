/**
 * Activity & Compliance Services - Comprehensive Type Definitions
 * This file contains all type safety definitions for activity tracking, 
 * audit trails, compliance monitoring, and notification systems.
 */

import { Database } from '../database'
import { BaseEntity, AuditableEntity, ID, Timestamp, JSONValue } from '../common'

// =============================================
// AUDIT LOG & ACTIVITY TYPES
// =============================================

// Core ActivityLog interface with strict typing
export interface ActivityLog extends AuditableEntity {
  id: ID
  organization_id: ID
  user_id: ID
  session_id?: string
  
  // Event classification
  event_type: ActivityEventType
  event_category: ActivityEventCategory
  action: string
  resource_type?: string
  resource_id?: ID
  
  // Event details
  event_description: string
  outcome: AuditOutcome
  severity: ActivitySeverity
  
  // Context and metadata
  ip_address?: string
  user_agent?: string
  device_fingerprint?: string
  geolocation?: GeoLocation
  request_headers?: Record<string, string>
  
  // Audit trail data
  before_state?: JSONValue
  after_state?: JSONValue
  changes?: ActivityChange[]
  
  // Performance and metrics
  response_time_ms?: number
  error_details?: ActivityError
  
  // Security and compliance
  signature_hash?: string
  legal_hold: boolean
  retention_policy?: string
  
  // Additional structured metadata
  metadata: ActivityMetadata
}

export type ActivityEventType = 
  | 'authentication'
  | 'authorization' 
  | 'data_access'
  | 'data_modification'
  | 'system_event'
  | 'security_event'
  | 'compliance_event'
  | 'user_action'
  | 'admin_action'
  | 'api_call'
  | 'file_operation'
  | 'workflow_event'

export type ActivityEventCategory =
  | 'access_control'
  | 'authentication'
  | 'change_management'
  | 'data_processing'
  | 'file_management'
  | 'monitoring'
  | 'notification'
  | 'policy_enforcement'
  | 'reporting'
  | 'security'
  | 'system_maintenance'
  | 'user_management'
  | 'vault_management'
  | 'workflow_management'

export type AuditOutcome = 'success' | 'failure' | 'partial' | 'error' | 'blocked'

export type ActivitySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

// Geolocation information
export interface GeoLocation {
  readonly country?: string
  readonly region?: string
  readonly city?: string
  readonly latitude?: number
  readonly longitude?: number
  readonly timezone?: string
  readonly isp?: string
}

// Activity change tracking
export interface ActivityChange {
  readonly field: string
  readonly old_value: JSONValue
  readonly new_value: JSONValue
  readonly change_type: 'create' | 'update' | 'delete'
  readonly timestamp: Timestamp
}

// Activity error details
export interface ActivityError {
  readonly code: string
  readonly message: string
  readonly stack_trace?: string
  readonly additional_context?: Record<string, any>
}

// Activity metadata structure
export interface ActivityMetadata {
  readonly client_info?: {
    readonly browser?: string
    readonly os?: string
    readonly device_type?: string
    readonly screen_resolution?: string
  }
  readonly business_context?: {
    readonly feature_flag?: string
    readonly experiment_id?: string
    readonly user_segment?: string
    readonly workflow_id?: ID
    readonly compliance_type?: string
  }
  readonly technical_context?: {
    readonly api_version?: string
    readonly request_id?: string
    readonly correlation_id?: string
    readonly trace_id?: string
    readonly session_duration?: number
  }
  readonly security_context?: {
    readonly risk_score?: number
    readonly anomaly_indicators?: string[]
    readonly threat_intelligence?: Record<string, any>
    readonly mfa_method?: string
  }
  readonly compliance_context?: {
    readonly regulation_type?: string
    readonly data_classification?: string
    readonly retention_period?: string
    readonly legal_basis?: string
    readonly anonymization_applied?: boolean
  }
  [key: string]: any
}

// =============================================
// IMMUTABLE AUDIT TRAIL TYPES
// =============================================

export interface ImmutableAuditEntry {
  readonly id: string
  readonly previous_hash: string
  readonly current_hash: string
  readonly block_number: number
  readonly timestamp: Timestamp
  readonly event_data: ActivityLog
  readonly signature: string
  readonly merkle_root: string
  readonly verification_status: 'verified' | 'pending' | 'failed'
}

export interface AuditTrailIntegrity {
  readonly is_valid: boolean
  readonly total_entries: number
  readonly verified_entries: number
  readonly corrupted_entries: readonly string[]
  readonly integrity_score: number
  readonly last_verified_at: Timestamp
  readonly verification_method: string
}

export interface ZeroKnowledgeProof {
  readonly proof: string
  readonly public_inputs: Record<string, any>
  readonly verification_key: string
  readonly description: string
  readonly generated_at: Timestamp
  readonly proof_system: string
  readonly circuit_hash?: string
}

// =============================================
// COMPLIANCE REPORT TYPES
// =============================================

export interface ComplianceReport {
  readonly id: ID
  readonly report_type: ComplianceReportType
  readonly organization_id: ID
  readonly period_start: Timestamp
  readonly period_end: Timestamp
  readonly generated_at: Timestamp
  readonly generated_by: ID
  readonly status: ComplianceReportStatus
  readonly findings: readonly ComplianceFinding[]
  readonly summary: ComplianceSummary
  readonly evidence: readonly ComplianceEvidence[]
  readonly signature_hash: string
  readonly retention_until: Timestamp
  readonly regulatory_framework: string
  readonly attestation?: ComplianceAttestation
}

export type ComplianceReportType = 
  | 'SOC2' 
  | 'GDPR' 
  | 'HIPAA' 
  | 'SOX' 
  | 'ISO27001' 
  | 'CCPA' 
  | 'PCI_DSS'
  | 'NIST'
  | 'custom'

export type ComplianceReportStatus = 
  | 'draft' 
  | 'review' 
  | 'approved' 
  | 'submitted' 
  | 'accepted' 
  | 'rejected'

export interface ComplianceFinding {
  readonly id: string
  readonly requirement_id: string
  readonly requirement_title: string
  readonly status: ComplianceFindingStatus
  readonly evidence_references: readonly string[]
  readonly risk_level: RiskLevel
  readonly remediation_actions?: readonly string[]
  readonly due_date?: Timestamp
  readonly responsible_party?: string
  readonly verification_method: string
  readonly last_assessment_date: Timestamp
  readonly notes?: string
}

export type ComplianceFindingStatus = 
  | 'compliant' 
  | 'non_compliant' 
  | 'partially_compliant' 
  | 'not_applicable' 
  | 'under_review'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ComplianceSummary {
  readonly total_requirements: number
  readonly compliant_count: number
  readonly non_compliant_count: number
  readonly partially_compliant_count: number
  readonly not_applicable_count: number
  readonly overall_score: number
  readonly risk_score: number
  readonly previous_score?: number
  readonly trend: 'improving' | 'stable' | 'declining'
  readonly key_risks: readonly string[]
  readonly recommendations: readonly string[]
}

export interface ComplianceEvidence {
  readonly id: string
  readonly type: ComplianceEvidenceType
  readonly title: string
  readonly description: string
  readonly evidence_data: JSONValue
  readonly collected_at: Timestamp
  readonly collected_by: ID
  readonly verification_hash: string
  readonly storage_location?: string
  readonly retention_period: string
  readonly access_restrictions?: string[]
}

export type ComplianceEvidenceType = 
  | 'audit_log' 
  | 'policy_document' 
  | 'access_control_matrix'
  | 'encryption_certificate'
  | 'backup_verification'
  | 'training_record'
  | 'vulnerability_scan'
  | 'penetration_test'
  | 'risk_assessment'
  | 'incident_report'

export interface ComplianceAttestation {
  readonly attested_by: ID
  readonly attested_at: Timestamp
  readonly attestation_level: 'self_assessment' | 'third_party' | 'independent_audit'
  readonly attestor_qualifications?: string
  readonly digital_signature: string
  readonly certificate_chain?: string[]
}

// =============================================
// NOTIFICATION SYSTEM TYPES
// =============================================

export interface NotificationPayload {
  readonly id: ID
  readonly organization_id: ID
  readonly user_id?: ID
  readonly type: NotificationType
  readonly category: NotificationCategory
  readonly title: string
  readonly message: string
  readonly priority: NotificationPriority
  readonly channels: readonly NotificationChannel[]
  readonly delivery_config: NotificationDeliveryConfig
  readonly metadata: NotificationMetadata
  readonly created_at: Timestamp
  readonly scheduled_for?: Timestamp
  readonly expires_at?: Timestamp
  readonly requires_acknowledgment: boolean
  readonly acknowledgment_deadline?: Timestamp
}

export type NotificationType = 
  | 'info'
  | 'warning' 
  | 'error' 
  | 'success' 
  | 'reminder'
  | 'security'
  | 'system'
  | 'compliance'
  | 'audit'

export type NotificationCategory =
  | 'compliance_deadline'
  | 'workflow_assignment' 
  | 'escalation'
  | 'workflow_completion'
  | 'security_alert'
  | 'system_maintenance'
  | 'policy_update'
  | 'training_reminder'
  | 'audit_notification'
  | 'risk_alert'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'

export type NotificationChannel = 
  | 'in_app' 
  | 'email' 
  | 'sms' 
  | 'slack' 
  | 'teams' 
  | 'webhook' 
  | 'push_notification'

export interface NotificationDeliveryConfig {
  readonly email?: EmailDeliveryConfig
  readonly sms?: SMSDeliveryConfig
  readonly webhook?: WebhookDeliveryConfig
  readonly slack?: SlackDeliveryConfig
  readonly teams?: TeamsDeliveryConfig
  readonly push?: PushNotificationConfig
  readonly retry_policy: RetryPolicy
  readonly delivery_window?: DeliveryWindow
}

export interface EmailDeliveryConfig {
  readonly template: string
  readonly sender_name?: string
  readonly sender_email?: string
  readonly reply_to?: string
  readonly cc?: readonly string[]
  readonly bcc?: readonly string[]
  readonly attachments?: readonly EmailAttachment[]
  readonly tracking_enabled: boolean
}

export interface EmailAttachment {
  readonly filename: string
  readonly content_type: string
  readonly content: string | Buffer
  readonly size_bytes: number
}

export interface SMSDeliveryConfig {
  readonly sender_id?: string
  readonly message_encoding: 'GSM7' | 'UCS2'
  readonly delivery_receipt: boolean
}

export interface WebhookDeliveryConfig {
  readonly url: string
  readonly method: 'POST' | 'PUT' | 'PATCH'
  readonly headers?: Record<string, string>
  readonly authentication?: WebhookAuth
  readonly timeout_ms: number
  readonly signature_secret?: string
}

export interface WebhookAuth {
  readonly type: 'bearer' | 'basic' | 'api_key' | 'oauth'
  readonly credentials: Record<string, string>
}

export interface SlackDeliveryConfig {
  readonly webhook_url: string
  readonly channel?: string
  readonly username?: string
  readonly icon_emoji?: string
  readonly link_names: boolean
}

export interface TeamsDeliveryConfig {
  readonly webhook_url: string
  readonly theme_color?: string
  readonly activity_image?: string
}

export interface PushNotificationConfig {
  readonly badge_count?: number
  readonly sound?: string
  readonly category?: string
  readonly collapse_key?: string
  readonly time_to_live?: number
}

export interface RetryPolicy {
  readonly max_attempts: number
  readonly base_delay_ms: number
  readonly max_delay_ms: number
  readonly exponential_backoff: boolean
  readonly retry_on_codes?: readonly number[]
}

export interface DeliveryWindow {
  readonly start_time: string // HH:MM format
  readonly end_time: string   // HH:MM format
  readonly timezone: string
  readonly business_days_only: boolean
}

export interface NotificationMetadata {
  readonly source_system?: string
  readonly correlation_id?: string
  readonly workflow_id?: ID
  readonly compliance_type?: string
  readonly regulation_type?: string
  readonly resource_type?: string
  readonly resource_id?: ID
  readonly action_url?: string
  readonly action_text?: string
  readonly icon?: string
  readonly color?: string
  readonly tags?: readonly string[]
  readonly custom_data?: Record<string, any>
}

// =============================================
// NOTIFICATION DELIVERY TRACKING
// =============================================

export interface NotificationDelivery {
  readonly id: ID
  readonly notification_id: ID
  readonly channel: NotificationChannel
  readonly recipient: string
  readonly status: NotificationDeliveryStatus
  readonly attempted_at: Timestamp
  readonly delivered_at?: Timestamp
  readonly failed_at?: Timestamp
  readonly error_code?: string
  readonly error_message?: string
  readonly response_data?: JSONValue
  readonly retry_count: number
  readonly external_message_id?: string
}

export type NotificationDeliveryStatus = 
  | 'pending' 
  | 'sent' 
  | 'delivered' 
  | 'failed' 
  | 'bounced' 
  | 'undeliverable'
  | 'clicked'
  | 'opened'

// =============================================
// REAL-TIME COMPLIANCE MONITORING
// =============================================

export interface ComplianceViolation {
  readonly id: ID
  readonly organization_id: ID
  readonly violation_type: ComplianceViolationType
  readonly severity: RiskLevel
  readonly detected_at: Timestamp
  readonly rule_id: string
  readonly rule_name: string
  readonly affected_resources: readonly string[]
  readonly evidence: ComplianceViolationEvidence
  readonly risk_assessment: RiskAssessment
  readonly remediation_required: boolean
  readonly auto_remediation_applied: boolean
  readonly escalation_level: number
  readonly responsible_party?: ID
  readonly due_date?: Timestamp
  readonly status: ComplianceViolationStatus
}

export type ComplianceViolationType =
  | 'data_retention_exceeded'
  | 'unauthorized_access'
  | 'policy_violation'
  | 'encryption_failure'
  | 'audit_gap'
  | 'control_failure'
  | 'regulatory_breach'
  | 'security_incident'
  | 'privacy_violation'

export type ComplianceViolationStatus = 
  | 'detected' 
  | 'investigating' 
  | 'confirmed' 
  | 'false_positive'
  | 'remediated' 
  | 'accepted_risk'

export interface ComplianceViolationEvidence {
  readonly audit_logs: readonly ID[]
  readonly affected_data: readonly string[]
  readonly system_state: JSONValue
  readonly user_actions: readonly ActivityLog[]
  readonly timeline: readonly ViolationTimelineEntry[]
}

export interface ViolationTimelineEntry {
  readonly timestamp: Timestamp
  readonly event: string
  readonly actor?: ID
  readonly details: JSONValue
}

export interface RiskAssessment {
  readonly impact_level: RiskLevel
  readonly likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
  readonly affected_systems: readonly string[]
  readonly potential_damage: readonly string[]
  readonly mitigation_controls: readonly string[]
  readonly residual_risk: RiskLevel
}

// =============================================
// ACTIVITY ANALYTICS & INSIGHTS
// =============================================

export interface ActivityInsight {
  readonly id: ID
  readonly organization_id: ID
  readonly insight_type: ActivityInsightType
  readonly title: string
  readonly description: string
  readonly confidence_score: number
  readonly generated_at: Timestamp
  readonly valid_until?: Timestamp
  readonly data_sources: readonly string[]
  readonly insights: JSONValue
  readonly recommendations: readonly string[]
  readonly impact_assessment: InsightImpact
}

export type ActivityInsightType =
  | 'anomaly'
  | 'trend'
  | 'pattern'
  | 'risk'
  | 'performance'
  | 'compliance'
  | 'security'
  | 'efficiency'

export interface InsightImpact {
  readonly business_impact: 'low' | 'medium' | 'high' | 'critical'
  readonly affected_processes: readonly string[]
  readonly cost_implication?: number
  readonly timeline_to_impact?: string
  readonly suggested_priority: NotificationPriority
}

// =============================================
// SESSION RECORDING & FORENSICS
// =============================================

export interface ActivitySession {
  readonly id: ID
  readonly user_id: ID
  readonly organization_id: ID
  readonly session_start: Timestamp
  readonly session_end?: Timestamp
  readonly recording_enabled: boolean
  readonly privacy_level: 'minimal' | 'standard' | 'detailed'
  readonly device_info: SessionDeviceInfo
  readonly events_data?: JSONValue
  readonly security_score: number
  readonly anomalies_detected: readonly SessionAnomaly[]
}

export interface SessionDeviceInfo {
  readonly device_id: string
  readonly device_type: string
  readonly operating_system: string
  readonly browser: string
  readonly ip_address: string
  readonly geolocation: GeoLocation
  readonly fingerprint: string
}

export interface SessionAnomaly {
  readonly type: 'unusual_activity' | 'location_change' | 'device_change' | 'velocity_anomaly'
  readonly confidence: number
  readonly description: string
  readonly detected_at: Timestamp
  readonly severity: ActivitySeverity
}

// =============================================
// DATA RETENTION & PRIVACY
// =============================================

export interface DataRetentionPolicy {
  readonly policy_name: string
  readonly applies_to: readonly string[]
  readonly retention_period: string
  readonly deletion_method: 'hard_delete' | 'soft_delete' | 'anonymize'
  readonly legal_hold_override: boolean
  readonly geographic_restrictions?: readonly string[]
  readonly compliance_requirements: readonly string[]
}

export interface PrivacySettings {
  readonly anonymization_level: 'minimal' | 'standard' | 'aggressive'
  readonly data_minimization_enabled: boolean
  readonly consent_tracking_enabled: boolean
  readonly right_to_erasure_enabled: boolean
  readonly data_portability_enabled: boolean
  readonly purpose_limitation_rules: readonly string[]
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

export interface ActivitySearchRequest {
  readonly query?: string
  readonly filters: ActivitySearchFilters
  readonly sort?: {
    readonly field: string
    readonly direction: 'asc' | 'desc'
  }
  readonly pagination?: {
    readonly page: number
    readonly limit: number
  }
  readonly include_metadata?: boolean
}

export interface ActivitySearchFilters {
  readonly event_types?: readonly ActivityEventType[]
  readonly event_categories?: readonly ActivityEventCategory[]
  readonly outcomes?: readonly AuditOutcome[]
  readonly severities?: readonly ActivitySeverity[]
  readonly user_ids?: readonly ID[]
  readonly date_range?: {
    readonly start_date: Timestamp
    readonly end_date: Timestamp
  }
  readonly resource_types?: readonly string[]
  readonly has_changes?: boolean
  readonly ip_addresses?: readonly string[]
  readonly signature_verified?: boolean
}

export interface NotificationBatchRequest {
  readonly notifications: readonly NotificationPayload[]
  readonly delivery_options?: {
    readonly batch_size?: number
    readonly delay_between_batches?: number
    readonly fail_fast?: boolean
  }
}

export interface ComplianceMonitoringConfig {
  readonly enabled: boolean
  readonly monitoring_rules: readonly ComplianceMonitoringRule[]
  readonly alert_thresholds: ComplianceAlertThresholds
  readonly escalation_policies: readonly EscalationPolicy[]
  readonly reporting_schedule: ReportingSchedule
}

export interface ComplianceMonitoringRule {
  readonly rule_id: string
  readonly name: string
  readonly description: string
  readonly rule_type: string
  readonly conditions: readonly RuleCondition[]
  readonly actions: readonly RuleAction[]
  readonly enabled: boolean
  readonly priority: NotificationPriority
}

export interface RuleCondition {
  readonly field: string
  readonly operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex_match'
  readonly value: any
  readonly logical_operator?: 'and' | 'or'
}

export interface RuleAction {
  readonly action_type: 'alert' | 'block' | 'log' | 'escalate' | 'remediate'
  readonly configuration: Record<string, any>
  readonly delay_seconds?: number
}

export interface ComplianceAlertThresholds {
  readonly low_risk_threshold: number
  readonly medium_risk_threshold: number
  readonly high_risk_threshold: number
  readonly critical_risk_threshold: number
  readonly anomaly_detection_sensitivity: number
}

export interface EscalationPolicy {
  readonly policy_name: string
  readonly triggers: readonly string[]
  readonly escalation_levels: readonly EscalationLevel[]
  readonly timeout_minutes: number
}

export interface EscalationLevel {
  readonly level: number
  readonly recipients: readonly ID[]
  readonly notification_channels: readonly NotificationChannel[]
  readonly escalation_delay_minutes: number
  readonly auto_escalate: boolean
}

export interface ReportingSchedule {
  readonly frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  readonly day_of_week?: number
  readonly day_of_month?: number
  readonly time: string // HH:MM format
  readonly timezone: string
  readonly recipients: readonly ID[]
  readonly report_types: readonly ComplianceReportType[]
}

// =============================================
// UTILITY AND HELPER TYPES
// =============================================

export interface ActivityApiResponse<T = any> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
  readonly message?: string
  readonly metadata?: {
    readonly timestamp: Timestamp
    readonly request_id: string
    readonly execution_time_ms: number
    readonly total_records?: number
  }
}

export interface ActivityValidationResult {
  readonly is_valid: boolean
  readonly errors: readonly ValidationError[]
  readonly warnings: readonly ValidationWarning[]
}

export interface ValidationError {
  readonly field: string
  readonly code: string
  readonly message: string
  readonly severity: 'error' | 'warning'
}

export interface ValidationWarning {
  readonly field: string
  readonly code: string
  readonly message: string
  readonly recommendation?: string
}

// Export commonly used union types for convenience
export type ActivityAny = ActivityLog | ComplianceReport | NotificationPayload | ComplianceViolation
export type NotificationAny = NotificationPayload | NotificationDelivery
export type ComplianceAny = ComplianceReport | ComplianceFinding | ComplianceViolation