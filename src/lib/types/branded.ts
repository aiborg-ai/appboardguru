/**
 * Enhanced Branded Types System
 * Runtime validation, type guards, and serialization for branded types
 */

import { z } from 'zod'
import { Brand, ValidatedBrand } from './utilities'

// ==== Core Brand Types ====

export type UserId = Brand<string, 'UserId'>
export type OrganizationId = Brand<string, 'OrganizationId'>
export type VaultId = Brand<string, 'VaultId'>
export type AssetId = Brand<string, 'AssetId'>
export type NotificationId = Brand<string, 'NotificationId'>
export type CalendarEventId = Brand<string, 'CalendarEventId'>
export type MeetingId = Brand<string, 'MeetingId'>
export type ActivityLogId = Brand<string, 'ActivityLogId'>
export type ComplianceWorkflowId = Brand<string, 'ComplianceWorkflowId'>
export type BoardId = Brand<string, 'BoardId'>
export type CommitteeId = Brand<string, 'CommitteeId'>
export type DocumentId = Brand<string, 'DocumentId'>
export type AnnotationId = Brand<string, 'AnnotationId'>
export type TocId = Brand<string, 'TocId'>
export type SummaryId = Brand<string, 'SummaryId'>
export type PodcastId = Brand<string, 'PodcastId'>
export type MeetingResolutionId = Brand<string, 'MeetingResolutionId'>
export type ResolutionVoteId = Brand<string, 'ResolutionVoteId'>
export type MeetingActionableId = Brand<string, 'MeetingActionableId'>
export type ActionableUpdateId = Brand<string, 'ActionableUpdateId'>

// ==== Validation Schemas ====

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const BrandedIdSchema = z
  .string()
  .min(1, 'ID cannot be empty')
  .regex(UUID_REGEX, 'ID must be a valid UUID format')

export const UserIdSchema = BrandedIdSchema.refine(
  (id) => id.length >= 36,
  'User ID must be at least 36 characters'
)

export const OrganizationIdSchema = BrandedIdSchema

export const VaultIdSchema = BrandedIdSchema

export const AssetIdSchema = BrandedIdSchema

export const NotificationIdSchema = BrandedIdSchema

export const CalendarEventIdSchema = BrandedIdSchema

export const MeetingIdSchema = BrandedIdSchema

export const ActivityLogIdSchema = BrandedIdSchema

export const ComplianceWorkflowIdSchema = BrandedIdSchema

export const BoardIdSchema = BrandedIdSchema

export const CommitteeIdSchema = BrandedIdSchema

export const DocumentIdSchema = BrandedIdSchema

export const AnnotationIdSchema = BrandedIdSchema

export const TocIdSchema = BrandedIdSchema

export const SummaryIdSchema = BrandedIdSchema

export const PodcastIdSchema = BrandedIdSchema

export const MeetingResolutionIdSchema = BrandedIdSchema

export const ResolutionVoteIdSchema = BrandedIdSchema

export const MeetingActionableIdSchema = BrandedIdSchema

export const ActionableUpdateIdSchema = BrandedIdSchema

// ==== Validation Results ====

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
  issues?: Array<{ message: string; path?: string[] }>
}

// ==== Type Constructors with Validation ====

function createValidatedId<T extends Brand<string, any>>(
  id: string,
  schema: z.ZodSchema<string>,
  brandName: string
): ValidationResult<T> {
  const result = schema.safeParse(id)
  
  if (!result.success) {
    return {
      success: false,
      error: `Invalid ${brandName}: ${result.error.message}`,
      issues: result.error.issues.map(issue => ({
        message: issue.message,
        path: issue.path.map(p => String(p))
      }))
    }
  }
  
  return {
    success: true,
    data: id as T
  }
}

export function createUserId(id: string): ValidationResult<UserId> {
  return createValidatedId<UserId>(id, UserIdSchema, 'UserId')
}

export function createOrganizationId(id: string): ValidationResult<OrganizationId> {
  return createValidatedId<OrganizationId>(id, OrganizationIdSchema, 'OrganizationId')
}

export function createVaultId(id: string): ValidationResult<VaultId> {
  return createValidatedId<VaultId>(id, VaultIdSchema, 'VaultId')
}

export function createAssetId(id: string): ValidationResult<AssetId> {
  return createValidatedId<AssetId>(id, AssetIdSchema, 'AssetId')
}

export function createNotificationId(id: string): ValidationResult<NotificationId> {
  return createValidatedId<NotificationId>(id, NotificationIdSchema, 'NotificationId')
}

export function createCalendarEventId(id: string): ValidationResult<CalendarEventId> {
  return createValidatedId<CalendarEventId>(id, CalendarEventIdSchema, 'CalendarEventId')
}

export function createMeetingId(id: string): ValidationResult<MeetingId> {
  return createValidatedId<MeetingId>(id, MeetingIdSchema, 'MeetingId')
}

export function createActivityLogId(id: string): ValidationResult<ActivityLogId> {
  return createValidatedId<ActivityLogId>(id, ActivityLogIdSchema, 'ActivityLogId')
}

export function createComplianceWorkflowId(id: string): ValidationResult<ComplianceWorkflowId> {
  return createValidatedId<ComplianceWorkflowId>(id, ComplianceWorkflowIdSchema, 'ComplianceWorkflowId')
}

export function createBoardId(id: string): ValidationResult<BoardId> {
  return createValidatedId<BoardId>(id, BoardIdSchema, 'BoardId')
}

export function createCommitteeId(id: string): ValidationResult<CommitteeId> {
  return createValidatedId<CommitteeId>(id, CommitteeIdSchema, 'CommitteeId')
}

export function createDocumentId(id: string): ValidationResult<DocumentId> {
  return createValidatedId<DocumentId>(id, DocumentIdSchema, 'DocumentId')
}

export function createAnnotationId(id: string): ValidationResult<AnnotationId> {
  return createValidatedId<AnnotationId>(id, AnnotationIdSchema, 'AnnotationId')
}

export function createTocId(id: string): ValidationResult<TocId> {
  return createValidatedId<TocId>(id, TocIdSchema, 'TocId')
}

export function createSummaryId(id: string): ValidationResult<SummaryId> {
  return createValidatedId<SummaryId>(id, SummaryIdSchema, 'SummaryId')
}

export function createPodcastId(id: string): ValidationResult<PodcastId> {
  return createValidatedId<PodcastId>(id, PodcastIdSchema, 'PodcastId')
}

export function createMeetingResolutionId(id: string): ValidationResult<MeetingResolutionId> {
  return createValidatedId<MeetingResolutionId>(id, MeetingResolutionIdSchema, 'MeetingResolutionId')
}

export function createResolutionVoteId(id: string): ValidationResult<ResolutionVoteId> {
  return createValidatedId<ResolutionVoteId>(id, ResolutionVoteIdSchema, 'ResolutionVoteId')
}

export function createMeetingActionableId(id: string): ValidationResult<MeetingActionableId> {
  return createValidatedId<MeetingActionableId>(id, MeetingActionableIdSchema, 'MeetingActionableId')
}

export function createActionableUpdateId(id: string): ValidationResult<ActionableUpdateId> {
  return createValidatedId<ActionableUpdateId>(id, ActionableUpdateIdSchema, 'ActionableUpdateId')
}

// ==== Unsafe Constructors (for internal use) ====

export function unsafeCreateUserId(id: string): UserId {
  return id as UserId
}

export function unsafeCreateOrganizationId(id: string): OrganizationId {
  return id as OrganizationId
}

export function unsafeCreateVaultId(id: string): VaultId {
  return id as VaultId
}

export function unsafeCreateAssetId(id: string): AssetId {
  return id as AssetId
}

export function unsafeCreateNotificationId(id: string): NotificationId {
  return id as NotificationId
}

export function unsafeCreateCalendarEventId(id: string): CalendarEventId {
  return id as CalendarEventId
}

export function unsafeCreateMeetingId(id: string): MeetingId {
  return id as MeetingId
}

export function unsafeCreateActivityLogId(id: string): ActivityLogId {
  return id as ActivityLogId
}

export function unsafeCreateComplianceWorkflowId(id: string): ComplianceWorkflowId {
  return id as ComplianceWorkflowId
}

export function unsafeCreateBoardId(id: string): BoardId {
  return id as BoardId
}

export function unsafeCreateCommitteeId(id: string): CommitteeId {
  return id as CommitteeId
}

export function unsafeCreateDocumentId(id: string): DocumentId {
  return id as DocumentId
}

export function unsafeCreateAnnotationId(id: string): AnnotationId {
  return id as AnnotationId
}

export function unsafeCreateTocId(id: string): TocId {
  return id as TocId
}

export function unsafeCreateSummaryId(id: string): SummaryId {
  return id as SummaryId
}

export function unsafeCreatePodcastId(id: string): PodcastId {
  return id as PodcastId
}

export function unsafeCreateMeetingResolutionId(id: string): MeetingResolutionId {
  return id as MeetingResolutionId
}

export function unsafeCreateResolutionVoteId(id: string): ResolutionVoteId {
  return id as ResolutionVoteId
}

export function unsafeCreateMeetingActionableId(id: string): MeetingActionableId {
  return id as MeetingActionableId
}

export function unsafeCreateActionableUpdateId(id: string): ActionableUpdateId {
  return id as ActionableUpdateId
}

// ==== Type Guards ====

export function isUserId(value: unknown): value is UserId {
  return typeof value === 'string' && UserIdSchema.safeParse(value).success
}

export function isOrganizationId(value: unknown): value is OrganizationId {
  return typeof value === 'string' && OrganizationIdSchema.safeParse(value).success
}

export function isVaultId(value: unknown): value is VaultId {
  return typeof value === 'string' && VaultIdSchema.safeParse(value).success
}

export function isAssetId(value: unknown): value is AssetId {
  return typeof value === 'string' && AssetIdSchema.safeParse(value).success
}

export function isNotificationId(value: unknown): value is NotificationId {
  return typeof value === 'string' && NotificationIdSchema.safeParse(value).success
}

export function isCalendarEventId(value: unknown): value is CalendarEventId {
  return typeof value === 'string' && CalendarEventIdSchema.safeParse(value).success
}

export function isMeetingId(value: unknown): value is MeetingId {
  return typeof value === 'string' && MeetingIdSchema.safeParse(value).success
}

export function isActivityLogId(value: unknown): value is ActivityLogId {
  return typeof value === 'string' && ActivityLogIdSchema.safeParse(value).success
}

export function isComplianceWorkflowId(value: unknown): value is ComplianceWorkflowId {
  return typeof value === 'string' && ComplianceWorkflowIdSchema.safeParse(value).success
}

export function isBoardId(value: unknown): value is BoardId {
  return typeof value === 'string' && BoardIdSchema.safeParse(value).success
}

export function isCommitteeId(value: unknown): value is CommitteeId {
  return typeof value === 'string' && CommitteeIdSchema.safeParse(value).success
}

export function isDocumentId(value: unknown): value is DocumentId {
  return typeof value === 'string' && DocumentIdSchema.safeParse(value).success
}

export function isAnnotationId(value: unknown): value is AnnotationId {
  return typeof value === 'string' && AnnotationIdSchema.safeParse(value).success
}

export function isTocId(value: unknown): value is TocId {
  return typeof value === 'string' && TocIdSchema.safeParse(value).success
}

export function isSummaryId(value: unknown): value is SummaryId {
  return typeof value === 'string' && SummaryIdSchema.safeParse(value).success
}

export function isPodcastId(value: unknown): value is PodcastId {
  return typeof value === 'string' && PodcastIdSchema.safeParse(value).success
}

export function isMeetingResolutionId(value: unknown): value is MeetingResolutionId {
  return typeof value === 'string' && MeetingResolutionIdSchema.safeParse(value).success
}

export function isResolutionVoteId(value: unknown): value is ResolutionVoteId {
  return typeof value === 'string' && ResolutionVoteIdSchema.safeParse(value).success
}

export function isMeetingActionableId(value: unknown): value is MeetingActionableId {
  return typeof value === 'string' && MeetingActionableIdSchema.safeParse(value).success
}

export function isActionableUpdateId(value: unknown): value is ActionableUpdateId {
  return typeof value === 'string' && ActionableUpdateIdSchema.safeParse(value).success
}

// ==== Generic Brand Utilities ====

export type AnyBrandedId = 
  | UserId 
  | OrganizationId 
  | VaultId 
  | AssetId 
  | NotificationId 
  | CalendarEventId 
  | MeetingId 
  | ActivityLogId 
  | ComplianceWorkflowId 
  | BoardId 
  | CommitteeId
  | DocumentId
  | AnnotationId
  | TocId
  | SummaryId
  | PodcastId
  | MeetingResolutionId
  | ResolutionVoteId
  | MeetingActionableId
  | ActionableUpdateId

/**
 * Extract the underlying string value from any branded type
 */
export function extractId<T extends Brand<string, any>>(brandedId: T): string {
  return brandedId as string
}

/**
 * Check if a value is any branded ID
 */
export function isAnyBrandedId(value: unknown): value is AnyBrandedId {
  return isUserId(value) ||
    isOrganizationId(value) ||
    isVaultId(value) ||
    isAssetId(value) ||
    isNotificationId(value) ||
    isCalendarEventId(value) ||
    isMeetingId(value) ||
    isActivityLogId(value) ||
    isComplianceWorkflowId(value) ||
    isBoardId(value) ||
    isCommitteeId(value) ||
    isDocumentId(value) ||
    isAnnotationId(value) ||
    isTocId(value) ||
    isSummaryId(value) ||
    isPodcastId(value) ||
    isMeetingResolutionId(value) ||
    isResolutionVoteId(value) ||
    isMeetingActionableId(value) ||
    isActionableUpdateId(value)
}

// ==== Serialization Helpers ====

export interface SerializedBrandedId {
  value: string
  type: string
}

/**
 * Serialize a branded ID for storage/transmission
 */
export function serializeBrandedId<T extends Brand<string, any>>(
  brandedId: T,
  type: string
): SerializedBrandedId {
  return {
    value: extractId(brandedId),
    type
  }
}

/**
 * Deserialize a branded ID from storage/transmission
 */
export function deserializeBrandedId<T extends Brand<string, any>>(
  serialized: SerializedBrandedId,
  constructor: (id: string) => ValidationResult<T>
): ValidationResult<T> {
  return constructor(serialized.value)
}

// ==== Brand Composition Utilities ====

/**
 * Create a composite branded type from multiple brands
 */
export type ComposeBrands<T, B1, B2> = T & { __brand: B1 } & { __brand2: B2 }

/**
 * Map branded IDs using a transformation function
 */
export function mapBrandedIds<T extends Brand<string, any>, U extends Brand<string, any>>(
  ids: T[],
  transform: (id: T) => ValidationResult<U>
): { valid: U[]; invalid: { id: T; error: string }[] } {
  const valid: U[] = []
  const invalid: { id: T; error: string }[] = []

  for (const id of ids) {
    const result = transform(id)
    if (result.success && result.data) {
      valid.push(result.data)
    } else {
      invalid.push({ id, error: result.error || 'Unknown error' })
    }
  }

  return { valid, invalid }
}

/**
 * Batch validate multiple branded IDs
 */
export function validateBrandedIds<T extends Brand<string, any>>(
  ids: string[],
  constructor: (id: string) => ValidationResult<T>
): ValidationResult<T[]> {
  const results = ids.map(id => constructor(id))
  const failed = results.filter(r => !r.success)
  
  if (failed.length > 0) {
    return {
      success: false,
      error: `Validation failed for ${failed.length} out of ${ids.length} IDs`,
      issues: failed.flatMap(r => r.issues || [{ message: r.error || 'Unknown error' }])
    }
  }
  
  return {
    success: true,
    data: results.map(r => r.data!).filter(Boolean)
  }
}

// ==== Advanced Brand Patterns ====

/**
 * Create a branded type with additional validation context
 */
export type ContextualBrand<T, B, C> = Brand<T, B> & { __context: C }

/**
 * Create a versioned branded type
 */
export type VersionedBrand<T, B, V extends number = 1> = Brand<T, B> & { __version: V }

/**
 * Create a scoped branded type (e.g., organization-scoped IDs)
 */
export type ScopedBrand<T, B, S> = Brand<T, B> & { __scope: S }

/**
 * Utility to create organization-scoped IDs
 */
export type OrgScopedId<T extends Brand<string, any>> = ScopedBrand<string, T['__brand'], OrganizationId>

/**
 * Create an organization-scoped branded ID
 */
export function createOrgScopedId<T extends Brand<string, any>>(
  id: string,
  orgId: OrganizationId,
  constructor: (id: string) => ValidationResult<T>
): ValidationResult<OrgScopedId<T>> {
  const result = constructor(id)
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
      issues: result.issues
    }
  }

  return {
    success: true,
    data: {
      ...result.data,
      __scope: orgId
    } as OrgScopedId<T>
  }
}

/**
 * Extract the scope from a scoped branded ID
 */
export function extractScope<T extends ScopedBrand<any, any, any>>(
  scopedId: T
): T['__scope'] {
  return (scopedId as any).__scope
}

// ==== Export type mapping for easier lookup ====

export const BrandedTypeMap = {
  UserId: createUserId,
  OrganizationId: createOrganizationId,
  VaultId: createVaultId,
  AssetId: createAssetId,
  NotificationId: createNotificationId,
  CalendarEventId: createCalendarEventId,
  MeetingId: createMeetingId,
  ActivityLogId: createActivityLogId,
  ComplianceWorkflowId: createComplianceWorkflowId,
  BoardId: createBoardId,
  CommitteeId: createCommitteeId,
  DocumentId: createDocumentId,
  AnnotationId: createAnnotationId,
  TocId: createTocId,
  SummaryId: createSummaryId,
  PodcastId: createPodcastId,
  MeetingResolutionId: createMeetingResolutionId,
  ResolutionVoteId: createResolutionVoteId,
  MeetingActionableId: createMeetingActionableId,
  ActionableUpdateId: createActionableUpdateId
} as const

export const TypeGuardMap = {
  UserId: isUserId,
  OrganizationId: isOrganizationId,
  VaultId: isVaultId,
  AssetId: isAssetId,
  NotificationId: isNotificationId,
  CalendarEventId: isCalendarEventId,
  MeetingId: isMeetingId,
  ActivityLogId: isActivityLogId,
  ComplianceWorkflowId: isComplianceWorkflowId,
  BoardId: isBoardId,
  CommitteeId: isCommitteeId,
  DocumentId: isDocumentId,
  AnnotationId: isAnnotationId,
  TocId: isTocId,
  SummaryId: isSummaryId,
  PodcastId: isPodcastId,
  MeetingResolutionId: isMeetingResolutionId,
  ResolutionVoteId: isResolutionVoteId,
  MeetingActionableId: isMeetingActionableId,
  ActionableUpdateId: isActionableUpdateId
} as const

export type BrandedTypeName = keyof typeof BrandedTypeMap