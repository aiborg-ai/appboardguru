// Branded types for better type safety
export type UserId = string & { __brand: 'UserId' }
export type OrganizationId = string & { __brand: 'OrganizationId' }
export type VaultId = string & { __brand: 'VaultId' }
export type AssetId = string & { __brand: 'AssetId' }
export type NotificationId = string & { __brand: 'NotificationId' }
export type CalendarEventId = string & { __brand: 'CalendarEventId' }
export type MeetingId = string & { __brand: 'MeetingId' }
export type ActivityLogId = string & { __brand: 'ActivityLogId' }
export type ComplianceWorkflowId = string & { __brand: 'ComplianceWorkflowId' }
export type BoardId = string & { __brand: 'BoardId' }
export type CommitteeId = string & { __brand: 'CommitteeId' }
export type DocumentId = string & { __brand: 'DocumentId' }
export type AnnotationId = string & { __brand: 'AnnotationId' }
export type TocId = string & { __brand: 'TocId' }
export type SummaryId = string & { __brand: 'SummaryId' }
export type PodcastId = string & { __brand: 'PodcastId' }

// Type constructors for branded types
export const createUserId = (id: string): UserId => id as UserId
export const createOrganizationId = (id: string): OrganizationId => id as OrganizationId
export const createVaultId = (id: string): VaultId => id as VaultId
export const createAssetId = (id: string): AssetId => id as AssetId
export const createNotificationId = (id: string): NotificationId => id as NotificationId
export const createCalendarEventId = (id: string): CalendarEventId => id as CalendarEventId
export const createMeetingId = (id: string): MeetingId => id as MeetingId
export const createActivityLogId = (id: string): ActivityLogId => id as ActivityLogId
export const createComplianceWorkflowId = (id: string): ComplianceWorkflowId => id as ComplianceWorkflowId
export const createBoardId = (id: string): BoardId => id as BoardId
export const createCommitteeId = (id: string): CommitteeId => id as CommitteeId
export const createDocumentId = (id: string): DocumentId => id as DocumentId
export const createAnnotationId = (id: string): AnnotationId => id as AnnotationId
export const createTocId = (id: string): TocId => id as TocId
export const createSummaryId = (id: string): SummaryId => id as SummaryId
export const createPodcastId = (id: string): PodcastId => id as PodcastId

// Common query options
export interface PaginationOptions {
  limit?: number
  offset?: number
  page?: number
}

export interface SortOptions {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface QueryOptions extends PaginationOptions, SortOptions {
  search?: string
  filters?: Record<string, unknown>
}

// Repository result types
export interface PaginatedResult<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  page: number
  totalPages: number
}

export interface RepositoryResult<T> {
  data: T | null
  success: boolean
  error?: string
  metadata?: Record<string, unknown>
}

export interface RepositoryListResult<T> {
  data: T[]
  success: boolean
  error?: string
  pagination?: PaginatedResult<T>['pagination']
}

// Common status enums
export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  OWNER = 'owner'
}

// Audit log types
export interface AuditLogEntry {
  user_id: UserId
  organization_id?: OrganizationId
  event_type: string
  event_category: string
  action: string
  resource_type: string
  resource_id: string
  event_description: string
  outcome: 'success' | 'failure' | 'partial'
  severity: 'low' | 'medium' | 'high' | 'critical'
  details?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}

// Filter builder types
export interface FilterCriteria {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'like' | 'ilike' | 'is' | 'not_is'
  value: string | number | boolean | null | string[] | number[]
}

export interface QueryBuilder {
  filters: FilterCriteria[]
  sorts: Array<{ field: string; direction: 'asc' | 'desc' }>
  pagination: { limit: number; offset: number }
  includes: string[]
}