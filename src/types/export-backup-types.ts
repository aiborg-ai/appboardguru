'use client'

import type { UserId, OrganizationId, AssetId, VaultId } from './branded'

// Branded types for export/backup system
export type ExportJobId = string & { readonly __brand: unique symbol }
export type BackupPolicyId = string & { readonly __brand: unique symbol }
export type ExportTemplateId = string & { readonly __brand: unique symbol }
export type ScheduleId = string & { readonly __brand: unique symbol }

// Export data categories based on platform features
export type ExportCategory = 
  | 'board_governance'
  | 'documents'
  | 'communications'
  | 'calendar'
  | 'compliance'
  | 'security_logs'
  | 'user_data'
  | 'financial_records'
  | 'audit_trails'
  | 'system_logs'

// Specific exportable data types
export type ExportDataType = 
  // Board Governance
  | 'board_meetings'
  | 'meeting_minutes'
  | 'board_resolutions'
  | 'voting_records'
  | 'action_items'
  | 'board_member_records'
  | 'committee_structure'
  | 'governance_policies'
  
  // Document Management
  | 'vault_contents'
  | 'document_metadata'
  | 'version_history'
  | 'sharing_permissions'
  | 'document_approvals'
  | 'file_assets'
  | 'digital_signatures'
  
  // Communications
  | 'board_chat_messages'
  | 'voice_notes'
  | 'group_communications'
  | 'message_attachments'
  | 'communication_logs'
  
  // Calendar & Events
  | 'meeting_schedules'
  | 'calendar_events'
  | 'attendee_records'
  | 'room_bookings'
  | 'recurring_events'
  
  // Compliance & Workflows
  | 'compliance_workflows'
  | 'regulatory_submissions'
  | 'audit_documentation'
  | 'compliance_deadlines'
  | 'workflow_history'
  | 'regulatory_updates'
  
  // Security & Activity
  | 'login_records'
  | 'security_events'
  | 'access_logs'
  | 'permission_changes'
  | 'system_activities'
  | 'breach_incidents'
  
  // User & Organization
  | 'user_profiles'
  | 'organization_structure'
  | 'membership_history'
  | 'role_assignments'
  | 'user_preferences'
  | 'account_settings'

// Export file formats
export type ExportFormat = 
  | 'json'
  | 'csv'
  | 'xlsx'
  | 'pdf'
  | 'xml'
  | 'zip'
  | 'encrypted_zip'

// Export compression options
export type CompressionType = 'none' | 'zip' | 'gzip' | '7z'

// Export encryption methods
export type EncryptionMethod = 
  | 'none'
  | 'aes_256'
  | 'pgp'
  | 'organization_key'
  | 'custom_key'

// Export frequency for scheduled exports
export type ExportFrequency = 
  | 'manual'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'

// Backup retention policies
export type RetentionPeriod = 
  | '30_days'
  | '90_days'
  | '6_months'
  | '1_year'
  | '3_years'
  | '7_years'
  | '10_years'
  | 'permanent'

// Export scope and filtering
export interface ExportScope {
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  userFilter?: UserId[]
  organizationFilter?: OrganizationId[]
  vaultFilter?: VaultId[]
  statusFilter?: string[]
  customFilters?: Record<string, unknown>
}

// Export job configuration
export interface ExportJob {
  id: ExportJobId
  name: string
  description?: string
  userId: UserId
  organizationId: OrganizationId
  categories: ExportCategory[]
  dataTypes: ExportDataType[]
  format: ExportFormat
  compression: CompressionType
  encryption: EncryptionMethod
  encryptionKey?: string
  scope: ExportScope
  includeMetadata: boolean
  includeAttachments: boolean
  anonymizeData: boolean
  scheduled: boolean
  frequency?: ExportFrequency
  nextRun?: Date
  lastRun?: Date
  status: ExportJobStatus
  createdAt: Date
  updatedAt: Date
}

export type ExportJobStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'scheduled'

// Backup policy configuration
export interface BackupPolicy {
  id: BackupPolicyId
  name: string
  organizationId: OrganizationId
  enabled: boolean
  categories: ExportCategory[]
  frequency: ExportFrequency
  retentionPeriod: RetentionPeriod
  encryption: EncryptionMethod
  storageLocation: BackupStorageLocation
  includeFiles: boolean
  includeSystemLogs: boolean
  compressBackups: boolean
  verifyIntegrity: boolean
  notifyOnCompletion: boolean
  notifyOnFailure: boolean
  createdAt: Date
  updatedAt: Date
  lastBackup?: Date
  nextBackup?: Date
}

// Backup storage options
export type BackupStorageLocation = 
  | 'local_server'
  | 'aws_s3'
  | 'azure_blob'
  | 'google_cloud'
  | 'organization_storage'
  | 'encrypted_external'

// GDPR and compliance export requirements
export interface ComplianceExport {
  type: 'gdpr_request' | 'audit_export' | 'legal_hold' | 'regulatory_submission'
  requesterId: UserId
  subjectUserId?: UserId
  legalBasis: string
  purpose: string
  dataCategories: ExportCategory[]
  includePersonalData: boolean
  includeDeletedData: boolean
  anonymizationLevel: 'none' | 'pseudonymized' | 'fully_anonymized'
  certificationRequired: boolean
  expirationDate?: Date
  approvalRequired: boolean
  approvedBy?: UserId
  approvalDate?: Date
}

// Data export templates for common scenarios
export interface ExportTemplate {
  id: ExportTemplateId
  name: string
  description: string
  organizationId: OrganizationId
  category: 'governance' | 'compliance' | 'backup' | 'migration' | 'analysis'
  dataTypes: ExportDataType[]
  format: ExportFormat
  defaultScope: ExportScope
  encryption: EncryptionMethod
  includeMetadata: boolean
  includeAttachments: boolean
  isPublic: boolean
  createdBy: UserId
  usageCount: number
  lastUsed?: Date
  createdAt: Date
}

// Export analytics and insights
export interface ExportAnalytics {
  totalExports: number
  dataVolume: number // in MB
  mostExportedCategories: { category: ExportCategory; count: number }[]
  popularFormats: { format: ExportFormat; usage: number }[]
  averageExportSize: number
  exportFrequency: { period: string; count: number }[]
  complianceExports: number
  scheduledExports: number
  failureRate: number
}

// Account type-specific export permissions
export interface AccountTypeExportConfig {
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  allowedCategories: ExportCategory[]
  allowedFormats: ExportFormat[]
  canScheduleExports: boolean
  canCreateBackupPolicies: boolean
  maxExportSize: number // in MB
  canExportOtherUsers: boolean
  canAccessSystemLogs: boolean
  requiresApproval: boolean
  canUseEncryption: boolean
  allowedRetentionPeriods: RetentionPeriod[]
}

// Data residency and sovereignty requirements
export interface DataResidencyConfig {
  region: string
  country: string
  regulatoryFramework: string[]
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted'
  crossBorderRestrictions: boolean
  approvedStorageLocations: BackupStorageLocation[]
  encryptionRequired: boolean
  auditTrailRequired: boolean
}

// Export progress and monitoring
export interface ExportProgress {
  jobId: ExportJobId
  status: ExportJobStatus
  progress: number // 0-100
  currentStep: string
  totalSteps: number
  completedSteps: number
  estimatedTimeRemaining?: number // in seconds
  dataProcessed: number // in MB
  totalDataSize: number // in MB
  errors: string[]
  warnings: string[]
  startedAt: Date
  completedAt?: Date
}

// Props for export/backup settings components
export interface ExportBackupSettingsProps {
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  userId: UserId
  organizationId: OrganizationId
}