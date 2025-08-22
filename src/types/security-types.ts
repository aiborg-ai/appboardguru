/**
 * Security and Activity Management Types
 * 
 * Comprehensive type definitions for enterprise security features including
 * authentication, authorization, activity monitoring, threat detection,
 * and compliance management.
 */

import { Database } from './database'

// Brand types for security entities
export type SecurityEventId = string & { readonly __brand: unique symbol }
export type SessionId = string & { readonly __brand: unique symbol }
export type ThreatId = string & { readonly __brand: unique symbol }
export type IncidentId = string & { readonly __brand: unique symbol }
export type RiskAssessmentId = string & { readonly __brand: unique symbol }

// Database enum types
export type AuditEventType = Database['public']['Enums']['audit_event_type']
export type AuditSeverity = Database['public']['Enums']['audit_severity']
export type AuditOutcome = Database['public']['Enums']['audit_outcome']

// Security Posture and Dashboard Types
export interface SecurityPosture {
  overall_score: number // 0-100
  authentication_score: number
  access_control_score: number
  data_protection_score: number
  compliance_score: number
  threat_detection_score: number
  last_assessment: string
  trending: 'up' | 'down' | 'stable'
}

export interface SecurityMetric {
  id: string
  name: string
  value: number
  previous_value: number
  change_percentage: number
  trend: 'up' | 'down' | 'stable'
  threshold_warning: number
  threshold_critical: number
  unit: string
  category: 'authentication' | 'access' | 'threats' | 'compliance' | 'data'
}

export interface SecurityAlert {
  id: string
  title: string
  description: string
  severity: AuditSeverity
  category: string
  status: 'open' | 'investigating' | 'resolved' | 'dismissed'
  created_at: string
  resolved_at?: string
  assigned_to?: string
  metadata: Record<string, any>
}

// Authentication and Session Management Types
export interface AuthenticationMethod {
  id: string
  type: 'password' | 'sms' | 'totp' | 'webauthn' | 'biometric'
  name: string
  description: string
  enabled: boolean
  is_primary: boolean
  last_used?: string
  setup_date: string
  backup_codes_count?: number
}

export interface UserSession {
  id: SessionId
  user_id: string
  device_info: DeviceInfo
  location: GeolocationInfo
  created_at: string
  last_activity: string
  is_current: boolean
  is_trusted: boolean
  session_duration: number
  ip_address: string
  user_agent: string
  login_method: string
}

export interface DeviceInfo {
  device_id: string
  device_name: string
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  os: string
  os_version: string
  browser: string
  browser_version: string
  is_trusted: boolean
}

export interface GeolocationInfo {
  country?: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
  timezone?: string
  is_suspicious?: boolean
}

export interface LoginAttempt {
  id: string
  email: string
  ip_address: string
  user_agent: string
  location: GeolocationInfo
  success: boolean
  failure_reason?: string
  timestamp: string
  risk_score: number
  is_blocked: boolean
  attempt_number: number
}

// Activity Monitoring Types
export interface ActivityEvent {
  id: string
  user_id?: string
  session_id?: SessionId
  event_type: AuditEventType
  event_category: string
  action: string
  resource_type: string
  resource_id?: string
  description: string
  timestamp: string
  ip_address?: string
  user_agent?: string
  location?: GeolocationInfo
  severity: AuditSeverity
  outcome: AuditOutcome
  risk_score: number
  metadata: Record<string, any>
  correlation_id?: string
}

export interface ActivityFilter {
  event_type?: AuditEventType[]
  severity?: AuditSeverity[]
  outcome?: AuditOutcome[]
  user_id?: string
  resource_type?: string
  date_from?: string
  date_to?: string
  risk_score_min?: number
  risk_score_max?: number
  search_query?: string
  limit?: number
  offset?: number
}

export interface ActivityStats {
  total_events: number
  events_by_type: Record<AuditEventType, number>
  events_by_severity: Record<AuditSeverity, number>
  events_by_outcome: Record<AuditOutcome, number>
  top_users: Array<{ user_id: string; event_count: number }>
  peak_hours: Array<{ hour: number; event_count: number }>
  risk_distribution: Array<{ risk_range: string; count: number }>
}

// Threat Detection Types
export interface ThreatEvent {
  id: ThreatId
  type: 'brute_force' | 'anomalous_access' | 'data_exfiltration' | 'privilege_escalation' | 'suspicious_location' | 'malware' | 'phishing'
  title: string
  description: string
  severity: AuditSeverity
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'false_positive'
  detected_at: string
  resolved_at?: string
  affected_users: string[]
  affected_resources: string[]
  indicators: ThreatIndicator[]
  mitigation_steps: string[]
  analyst_notes?: string
  risk_score: number
  confidence: number
}

export interface ThreatIndicator {
  type: 'ip' | 'user_agent' | 'geolocation' | 'behavior' | 'file_hash' | 'domain'
  value: string
  description: string
  confidence: number
}

export interface SecurityIncident {
  id: IncidentId
  title: string
  description: string
  category: 'data_breach' | 'account_compromise' | 'malware' | 'phishing' | 'insider_threat' | 'system_compromise'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  resolved_at?: string
  reporter: string
  assigned_to?: string
  affected_systems: string[]
  affected_users: string[]
  timeline: IncidentTimelineEntry[]
  evidence: IncidentEvidence[]
  mitigation_actions: string[]
  root_cause?: string
  lessons_learned?: string
}

export interface IncidentTimelineEntry {
  timestamp: string
  action: string
  actor: string
  description: string
  evidence_refs?: string[]
}

export interface IncidentEvidence {
  id: string
  type: 'log' | 'screenshot' | 'file' | 'network_capture' | 'forensic_image'
  description: string
  file_path?: string
  collected_by: string
  collected_at: string
  chain_of_custody: Array<{
    transferred_to: string
    transferred_at: string
    notes?: string
  }>
}

// Risk Management Types
export interface RiskAssessment {
  id: RiskAssessmentId
  title: string
  description: string
  category: 'operational' | 'strategic' | 'financial' | 'compliance' | 'reputation' | 'technology'
  likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
  impact: 'negligible' | 'minor' | 'moderate' | 'major' | 'catastrophic'
  risk_score: number // Calculated from likelihood x impact
  inherent_risk: number
  residual_risk: number
  risk_appetite: number
  status: 'identified' | 'analyzed' | 'evaluated' | 'treated' | 'monitored' | 'closed'
  owner: string
  created_at: string
  updated_at: string
  next_review: string
  mitigation_controls: RiskControl[]
  risk_indicators: RiskIndicator[]
}

export interface RiskControl {
  id: string
  name: string
  description: string
  type: 'preventive' | 'detective' | 'corrective' | 'compensating'
  effectiveness: 'low' | 'medium' | 'high'
  implementation_status: 'planned' | 'in_progress' | 'implemented' | 'tested' | 'operating'
  owner: string
  cost: number
  last_tested?: string
  test_results?: string
}

export interface RiskIndicator {
  id: string
  name: string
  description: string
  metric: string
  current_value: number
  threshold_green: number
  threshold_yellow: number
  threshold_red: number
  trend: 'improving' | 'stable' | 'deteriorating'
  measurement_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  last_measured: string
}

// Compliance and Audit Types
export interface ComplianceFramework {
  id: string
  name: string
  description: string
  version: string
  applicable: boolean
  certification_status: 'not_started' | 'in_progress' | 'certified' | 'expired'
  certification_date?: string
  expiry_date?: string
  next_audit_date?: string
  controls: ComplianceControl[]
}

export interface ComplianceControl {
  id: string
  control_id: string
  title: string
  description: string
  category: string
  implementation_status: 'not_implemented' | 'partially_implemented' | 'implemented' | 'not_applicable'
  testing_status: 'not_tested' | 'tested_passed' | 'tested_failed' | 'testing_in_progress'
  last_tested?: string
  next_test_date?: string
  evidence: string[]
  gaps: string[]
  remediation_plan?: string
  owner: string
}

export interface AuditReport {
  id: string
  title: string
  audit_type: 'internal' | 'external' | 'regulatory' | 'self_assessment'
  framework: string
  period_start: string
  period_end: string
  status: 'planning' | 'fieldwork' | 'reporting' | 'complete'
  auditor: string
  findings: AuditFinding[]
  recommendations: AuditRecommendation[]
  management_response?: string
  follow_up_date?: string
  created_at: string
  updated_at: string
}

export interface AuditFinding {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  control_reference: string
  evidence: string[]
  impact: string
  likelihood: string
  risk_rating: string
  management_response?: string
  remediation_plan?: string
  target_date?: string
  status: 'open' | 'in_progress' | 'closed' | 'accepted_risk'
}

export interface AuditRecommendation {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  category: string
  implementation_complexity: 'low' | 'medium' | 'high'
  estimated_effort: string
  expected_benefit: string
  assigned_to?: string
  target_date?: string
  status: 'proposed' | 'accepted' | 'in_progress' | 'implemented' | 'rejected'
}

// Data Protection and Privacy Types
export interface DataClassification {
  id: string
  resource_id: string
  resource_type: 'file' | 'database' | 'api_endpoint' | 'system'
  classification_level: 'public' | 'internal' | 'confidential' | 'restricted'
  data_types: DataType[]
  retention_period: number // in days
  geographic_restrictions: string[]
  access_controls: AccessControl[]
  encryption_required: boolean
  backup_required: boolean
  audit_required: boolean
  classified_by: string
  classified_at: string
  last_reviewed: string
  next_review: string
}

export interface DataType {
  category: 'pii' | 'phi' | 'financial' | 'intellectual_property' | 'trade_secret' | 'legal' | 'hr'
  subcategory: string
  sensitivity_level: 'low' | 'medium' | 'high' | 'critical'
  regulatory_requirements: string[]
}

export interface AccessControl {
  type: 'role_based' | 'attribute_based' | 'mandatory' | 'discretionary'
  policy: string
  authorized_roles: string[]
  authorized_users: string[]
  conditions: AccessCondition[]
}

export interface AccessCondition {
  type: 'time' | 'location' | 'device' | 'network' | 'mfa_required'
  value: string
  operator: 'equals' | 'not_equals' | 'contains' | 'in_range'
}

export interface DataRetentionPolicy {
  id: string
  name: string
  description: string
  data_categories: string[]
  retention_period: number // in days
  deletion_method: 'soft_delete' | 'hard_delete' | 'anonymization' | 'archival'
  legal_basis: string[]
  exceptions: DataRetentionException[]
  approval_required: boolean
  auto_apply: boolean
  created_by: string
  created_at: string
  last_updated: string
}

export interface DataRetentionException {
  reason: 'legal_hold' | 'ongoing_investigation' | 'regulatory_requirement' | 'business_need'
  description: string
  approved_by: string
  approved_at: string
  expiry_date?: string
}

// Security Configuration Types
export interface SecurityPolicy {
  id: string
  name: string
  description: string
  category: 'access' | 'authentication' | 'data_protection' | 'incident_response' | 'business_continuity'
  status: 'draft' | 'under_review' | 'approved' | 'active' | 'deprecated'
  version: string
  effective_date: string
  review_date: string
  owner: string
  approver: string
  scope: string[]
  policy_statements: PolicyStatement[]
  controls: PolicyControl[]
  exceptions: PolicyException[]
}

export interface PolicyStatement {
  id: string
  statement: string
  rationale: string
  mandatory: boolean
  applicable_roles: string[]
  applicable_systems: string[]
}

export interface PolicyControl {
  id: string
  control_description: string
  implementation_guidance: string
  testing_procedure: string
  responsible_party: string
  frequency: string
}

export interface PolicyException {
  id: string
  description: string
  justification: string
  approved_by: string
  approved_at: string
  expiry_date: string
  review_frequency: string
  compensating_controls: string[]
}

// Alert and Notification Types
export interface SecurityAlertRule {
  id: string
  name: string
  description: string
  enabled: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  conditions: AlertCondition[]
  actions: AlertAction[]
  suppression_rules: SuppressionRule[]
  created_by: string
  created_at: string
  last_triggered?: string
  trigger_count: number
}

export interface AlertCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range'
  value: string | number
  time_window?: number // in minutes
  threshold?: number
}

export interface AlertAction {
  type: 'email' | 'sms' | 'webhook' | 'ticket' | 'slack' | 'teams'
  recipients: string[]
  template: string
  delay?: number // in minutes
}

export interface SuppressionRule {
  type: 'time_based' | 'condition_based' | 'count_based'
  duration?: number // in minutes
  max_count?: number
  conditions?: AlertCondition[]
}

// Reporting and Analytics Types
export interface SecurityReport {
  id: string
  title: string
  description: string
  report_type: 'security_posture' | 'compliance' | 'incident_summary' | 'risk_assessment' | 'audit_findings'
  schedule: 'on_demand' | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  recipients: string[]
  filters: ReportFilter[]
  generated_at: string
  generated_by: string
  file_path?: string
  status: 'generating' | 'ready' | 'error' | 'expired'
}

export interface ReportFilter {
  field: string
  operator: string
  value: string | number | boolean
}

export interface SecurityDashboard {
  id: string
  name: string
  description: string
  widgets: DashboardWidget[]
  layout: DashboardLayout
  visibility: 'private' | 'shared' | 'public'
  owner: string
  created_at: string
  updated_at: string
}

export interface DashboardWidget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'alert_summary' | 'risk_heatmap'
  title: string
  configuration: Record<string, any>
  position: { x: number; y: number; width: number; height: number }
  refresh_interval: number // in seconds
}

export interface DashboardLayout {
  columns: number
  rows: number
  responsive: boolean
  auto_refresh: boolean
  refresh_interval: number
}

// API Response Types
export interface SecurityApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    timestamp: string
    request_id: string
    pagination?: PaginationInfo
  }
}

export interface PaginationInfo {
  page: number
  page_size: number
  total_pages: number
  total_items: number
  has_next: boolean
  has_previous: boolean
}

// Loading States for UI Components
export type SecurityLoadingState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }

// Component Props Types
export interface SecurityTabProps {
  accountType: 'superuser' | 'administrator' | 'user' | 'viewer'
  userId: string
  organizationId?: string
}

export interface SecurityDashboardProps extends SecurityTabProps {
  refreshInterval?: number
  autoRefresh?: boolean
}

export interface ActivityMonitoringProps extends SecurityTabProps {
  defaultFilters?: ActivityFilter
  realTimeUpdates?: boolean
}

export interface ThreatDetectionProps extends SecurityTabProps {
  showResolved?: boolean
  severityFilter?: AuditSeverity[]
}

export interface AuditComplianceProps extends SecurityTabProps {
  framework?: string
  showOnlyGaps?: boolean
}

export interface DataProtectionProps extends SecurityTabProps {
  classificationLevels?: string[]
  showMetrics?: boolean
}

export interface SecurityAlertsProps extends SecurityTabProps {
  showConfiguration?: boolean
  alertTypes?: string[]
}

export interface SecurityReportsProps extends SecurityTabProps {
  defaultReportType?: string
  autoGenerate?: boolean
}

export interface RiskManagementProps extends SecurityTabProps {
  riskCategories?: string[]
  showMatrix?: boolean
}