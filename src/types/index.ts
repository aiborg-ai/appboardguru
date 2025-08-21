// Type system barrel exports

// Database types
export * from './database'

// Entity types (specific exports to avoid conflicts)
export type { User, UserInsert, UserUpdate, UserRole, UserStatus } from './entities/user.types'
export type { 
  Organization, 
  OrganizationInsert, 
  OrganizationUpdate, 
  OrganizationMember,
  OrganizationInvitation,
  OrganizationFeatures,
  OrganizationSize
} from './entities/organization.types'
export type { 
  Vault, 
  VaultInsert, 
  VaultUpdate, 
  VaultMember, 
  VaultInvitation, 
  VaultAsset,
  VaultWithDetails,
  VaultBroadcast,
  VaultStatus,
  VaultPriority,
  VaultRole
} from './entities/vault.types'
export type { Asset, AssetInsert, AssetUpdate, AssetPermission, AssetAnnotation } from './entities/asset.types'

// Compliance types
export type {
  ComplianceTemplate,
  ComplianceTemplateInsert,
  ComplianceTemplateUpdate,
  ComplianceTemplateWithDetails,
  ComplianceCalendarEntry,
  ComplianceCalendarInsert,
  ComplianceCalendarUpdate,
  ComplianceCalendarWithDetails,
  NotificationWorkflow,
  NotificationWorkflowInsert,
  NotificationWorkflowUpdate,
  NotificationWorkflowWithDetails,
  ComplianceParticipant,
  ComplianceParticipantInsert,
  ComplianceParticipantUpdate,
  ComplianceParticipantWithDetails,
  NotificationAuditLog,
  NotificationAuditLogInsert,
  NotificationAuditLogUpdate,
  WorkflowStep,
  WorkflowStepParticipant,
  WorkflowCondition,
  ReminderSchedule,
  EscalationRules,
  EscalationRule,
  RecurrencePattern,
  WorkflowProgressSummary,
  WorkflowBottleneck,
  ComplianceDashboard,
  ComplianceOverview,
  ComplianceOverdueItem,
  ComplianceMetrics,
  RegulatoryCoverage,
  ComplianceCompletionSummary,
  AuditReportRequest,
  AuditReportResponse,
  AuditReportSummary,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  AcknowledgeNotificationRequest,
  AdvanceWorkflowStepRequest,
  CreateCalendarEntryRequest,
  ComplianceSearchRequest,
  ComplianceSearchResponse,
  ComplianceSearchResult,
  ComplianceNotificationTemplate,
  ComplianceApiResponse,
  BulkOperationRequest,
  BulkOperationResponse,
  ComplianceFrequency,
  ComplianceStatus,
  WorkflowStatus,
  ParticipantType,
  ParticipantStatus,
  DeadlineType,
  AcknowledgmentMethod,
  RiskLevel
} from './entities/compliance.types'

// API types
export * from './api/requests'
export * from './api/responses'

// Common types
export * from './common'

// Legacy exports for backward compatibility
export type { Database } from './database'