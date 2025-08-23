/**
 * @deprecated This file is deprecated. Use the centralized branded type system from '../../types/branded' instead.
 * Re-exporting for backward compatibility only.
 */

// Re-export branded types from centralized system
export type {
  UserId,
  OrganizationId,
  VaultId,
  AssetId,
  NotificationId,
  CalendarEventId,
  MeetingId,
  MeetingResolutionId,
  MeetingActionableId,
  ActivityLogId,
  ComplianceWorkflowId,
  BoardId,
  CommitteeId,
  DocumentId,
  AnnotationId,
  TocId,
  SummaryId,
  PodcastId,
  MeetingVoteId,
  MeetingProxyId,
  MeetingWorkflowId,
  MeetingRoleId,
  VotingSessionId,
  WorkflowTransitionId,
  VotingSessionItemId
} from '../../types/branded'

// Re-export unsafe constructors for backward compatibility (internal use only)
export {
  unsafeUserId as createUserId,
  unsafeOrganizationId as createOrganizationId,
  unsafeVaultId as createVaultId,
  unsafeAssetId as createAssetId,
  unsafeNotificationId as createNotificationId,
  unsafeCalendarEventId as createCalendarEventId,
  unsafeMeetingId as createMeetingId,
  unsafeMeetingResolutionId as createMeetingResolutionId,
  unsafeMeetingActionableId as createMeetingActionableId,
  unsafeActivityLogId as createActivityLogId,
  unsafeComplianceWorkflowId as createComplianceWorkflowId,
  unsafeBoardId as createBoardId,
  unsafeCommitteeId as createCommitteeId,
  unsafeDocumentId as createDocumentId,
  unsafeAnnotationId as createAnnotationId,
  unsafeTocId as createTocId,
  unsafeSummaryId as createSummaryId,
  unsafePodcastId as createPodcastId,
  unsafeMeetingVoteId as createMeetingVoteId,
  unsafeMeetingProxyId as createMeetingProxyId,
  unsafeMeetingWorkflowId as createMeetingWorkflowId,
  unsafeMeetingRoleId as createMeetingRoleId,
  unsafeVotingSessionId as createVotingSessionId,
  unsafeWorkflowTransitionId as createWorkflowTransitionId,
  unsafeVotingSessionItemId as createVotingSessionItemId
} from '../../types/branded'

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