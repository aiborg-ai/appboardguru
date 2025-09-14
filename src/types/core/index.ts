/**
 * Core Type Library
 * Foundational types for the entire application
 */

// Brand type for nominal typing
export type Brand<T, B> = T & { __brand: B }

// Base Entity Types
export interface BaseEntity {
  readonly id: string
  readonly created_at: string
  readonly updated_at: string
}

export interface SoftDeletableEntity extends BaseEntity {
  readonly deleted_at: string | null
  readonly is_active: boolean
}

// Branded ID types
export type UserId = Brand<string, 'UserId'>
export type OrganizationId = Brand<string, 'OrganizationId'>
export type AssetId = Brand<string, 'AssetId'>
export type VaultId = Brand<string, 'VaultId'>
export type AnnotationId = Brand<string, 'AnnotationId'>
export type BoardMateId = Brand<string, 'BoardMateId'>
export type EventId = Brand<string, 'EventId'>
export type WorkflowId = Brand<string, 'WorkflowId'>
export type RuleId = Brand<string, 'RuleId'>
export type SessionId = Brand<string, 'SessionId'>
export type NotificationId = Brand<string, 'NotificationId'>
export type DocumentId = Brand<string, 'DocumentId'>

// Utility functions for creating branded IDs
export const createUserId = (id: string): UserId => id as UserId
export const createOrganizationId = (id: string): OrganizationId => id as OrganizationId
export const createAssetId = (id: string): AssetId => id as AssetId
export const createVaultId = (id: string): VaultId => id as VaultId
export const createAnnotationId = (id: string): AnnotationId => id as AnnotationId
export const createBoardMateId = (id: string): BoardMateId => id as BoardMateId
export const createEventId = (id: string): EventId => id as EventId
export const createWorkflowId = (id: string): WorkflowId => id as WorkflowId
export const createRuleId = (id: string): RuleId => id as RuleId
export const createSessionId = (id: string): SessionId => id as SessionId
export const createNotificationId = (id: string): NotificationId => id as NotificationId
export const createDocumentId = (id: string): DocumentId => id as DocumentId

// Pagination Types
export interface PaginationParams {
  readonly page: number
  readonly limit: number
}

export interface PaginationMeta {
  readonly page: number
  readonly limit: number
  readonly total: number
  readonly total_pages: number
  readonly has_next: boolean
  readonly has_prev: boolean
}

export interface PaginatedResponse<T> {
  readonly items: readonly T[]
  readonly pagination: PaginationMeta
}

// Pagination utility function
export const createPaginationMeta = (params: {
  total: number
  page: number
  limit: number
}): PaginationMeta => {
  const { total, page, limit } = params
  const total_pages = Math.ceil(total / limit)
  
  return {
    page,
    limit,
    total,
    total_pages,
    has_next: page < total_pages,
    has_prev: page > 1
  }
}

// Sorting and Filtering
export type SortOrder = 'asc' | 'desc'

export interface SortParams<T extends string = string> {
  readonly sort_by: T
  readonly sort_order: SortOrder
}

export interface FilterParams {
  readonly [key: string]: string | number | boolean | readonly (string | number)[] | undefined
}

// API Response Types
export interface SuccessResponse<T = unknown> {
  readonly success: true
  readonly data: T
  readonly meta?: {
    readonly timing?: {
      readonly duration: number
      readonly cached: boolean
    }
    readonly request_id?: string
  }
}

export interface ErrorResponse {
  readonly success: false
  readonly error: {
    readonly code: string
    readonly message: string
    readonly details?: unknown
    readonly timestamp: string
  }
}

export type APIResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

// Date/Time Types
export type ISODateString = Brand<string, 'ISODateString'>
export type Timestamp = Brand<number, 'Timestamp'>

export const createISODateString = (date: string): ISODateString => date as ISODateString
export const createTimestamp = (ts: number): Timestamp => ts as Timestamp

// Status Types
export type Status = 'active' | 'inactive' | 'pending' | 'archived' | 'deleted'
export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

// Permission Types
export type Permission = 'read' | 'write' | 'admin' | 'owner'
export type Role = 'guest' | 'member' | 'moderator' | 'admin' | 'owner'

// Utility Types
export type NonEmptyArray<T> = readonly [T, ...T[]]
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Deep readonly utility
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T[P] extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P]
}

// Type guards
export const isString = (value: unknown): value is string => typeof value === 'string'
export const isNumber = (value: unknown): value is number => typeof value === 'number'
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
export const isObject = (value: unknown): value is Record<string, unknown> => 
  typeof value === 'object' && value !== null && !Array.isArray(value)
export const isArray = <T>(value: unknown): value is T[] => Array.isArray(value)

// Validation result types
export interface ValidationResult<T = unknown> {
  readonly success: boolean
  readonly data?: T
  readonly errors?: readonly string[]
}

export const createValidationSuccess = <T>(data: T): ValidationResult<T> => ({
  success: true,
  data
})

export const createValidationError = (errors: readonly string[]): ValidationResult => ({
  success: false,
  errors
})

// Environment types
export type Environment = 'development' | 'staging' | 'production' | 'test'

// Feature flag types
export interface FeatureFlag {
  readonly name: string
  readonly enabled: boolean
  readonly rollout_percentage?: number
  readonly conditions?: Record<string, unknown>
}

// Audit log types
export interface AuditableAction {
  readonly action: string
  readonly actor_id: UserId
  readonly resource_type: string
  readonly resource_id: string
  readonly timestamp: ISODateString
  readonly metadata?: Record<string, unknown>
}