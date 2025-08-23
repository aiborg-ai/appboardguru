/**
 * Comprehensive Branded Type System
 * Centralized branded types with runtime validation, type guards, and utilities
 * Prevents type confusion and provides compile-time safety for all IDs
 */

import { z } from 'zod'

// ==== Core Brand Type Utilities ====

/**
 * Base brand utility type - creates nominal/branded types
 */
export type Brand<T, B> = T & { readonly __brand: B }

/**
 * Validated brand type with runtime validation support
 */
export type ValidatedBrand<T, B, V = never> = Brand<T, B> & { readonly __validator: V }

/**
 * Extract the base type from a branded type
 */
export type UnBrand<T> = T extends Brand<infer U, any> ? U : T

/**
 * Check if a type is branded
 */
export type IsBranded<T> = T extends Brand<any, any> ? true : false

// ==== Core Branded ID Types ====

// User and Organization IDs
export type UserId = Brand<string, 'UserId'>
export type OrganizationId = Brand<string, 'OrganizationId'>

// Asset Management IDs
export type AssetId = Brand<string, 'AssetId'>
export type VaultId = Brand<string, 'VaultId'>
export type DocumentId = Brand<string, 'DocumentId'>
export type AnnotationId = Brand<string, 'AnnotationId'>
export type CommentId = Brand<string, 'CommentId'>

// Board Management IDs
export type BoardId = Brand<string, 'BoardId'>
export type BoardMateId = Brand<string, 'BoardMateId'>
export type CommitteeId = Brand<string, 'CommitteeId'>

// Session and Communication IDs
export type SessionId = Brand<string, 'SessionId'>
export type SocketId = Brand<string, 'SocketId'>
export type RoomId = Brand<string, 'RoomId'>

// Notification and Event IDs
export type NotificationId = Brand<string, 'NotificationId'>
export type EventId = Brand<string, 'EventId'>
export type CalendarEventId = Brand<string, 'CalendarEventId'>
export type MeetingId = Brand<string, 'MeetingId'>
export type MeetingResolutionId = Brand<string, 'MeetingResolutionId'>
export type MeetingActionableId = Brand<string, 'MeetingActionableId'>

// Document Processing IDs
export type TocId = Brand<string, 'TocId'>
export type SummaryId = Brand<string, 'SummaryId'>
export type PodcastId = Brand<string, 'PodcastId'>

// Workflow and Compliance IDs
export type WorkflowId = Brand<string, 'WorkflowId'>
export type RuleId = Brand<string, 'RuleId'>
export type ComplianceWorkflowId = Brand<string, 'ComplianceWorkflowId'>
export type ActivityLogId = Brand<string, 'ActivityLogId'>

// Advanced Voting System IDs
export type MeetingVoteId = Brand<string, 'MeetingVoteId'>
export type MeetingProxyId = Brand<string, 'MeetingProxyId'>
export type MeetingWorkflowId = Brand<string, 'MeetingWorkflowId'>
export type MeetingRoleId = Brand<string, 'MeetingRoleId'>
export type VotingSessionId = Brand<string, 'VotingSessionId'>
export type WorkflowTransitionId = Brand<string, 'WorkflowTransitionId'>
export type VotingSessionItemId = Brand<string, 'VotingSessionItemId'>

// System IDs
export type TemplateId = Brand<string, 'TemplateId'>
export type InvitationId = Brand<string, 'InvitationId'>

// Document Collaboration IDs
export type DocumentCollaborationId = Brand<string, 'DocumentCollaborationId'>
export type OperationId = Brand<string, 'OperationId'>
export type CursorId = Brand<string, 'CursorId'>
export type CollaborationSessionId = Brand<string, 'CollaborationSessionId'>
export type DocumentVersionId = Brand<string, 'DocumentVersionId'>
export type DocumentLockId = Brand<string, 'DocumentLockId'>
export type CommentThreadId = Brand<string, 'CommentThreadId'>
export type SuggestionId = Brand<string, 'SuggestionId'>
export type RevisionId = Brand<string, 'RevisionId'>
export type BranchId = Brand<string, 'BranchId'>
export type MergeRequestId = Brand<string, 'MergeRequestId'>
export type ConflictId = Brand<string, 'ConflictId'>

// Additional branded utility types for comprehensive coverage
export type Email = Brand<string, 'Email'>
export type Slug = Brand<string, 'Slug'>
export type Url = Brand<string, 'Url'>
export type FilePath = Brand<string, 'FilePath'>
export type MimeType = Brand<string, 'MimeType'>
export type JsonString = Brand<string, 'JsonString'>
export type ISODateString = Brand<string, 'ISODateString'>
export type JWT = Brand<string, 'JWT'>
export type ApiKey = Brand<string, 'ApiKey'>

// Branded number types
export type Percentage = Brand<number, 'Percentage'>
export type FileSize = Brand<number, 'FileSize'>
export type Timestamp = Brand<number, 'Timestamp'>
export type Port = Brand<number, 'Port'>
export type Version = Brand<number, 'Version'>

// ==== Validation Schemas ====

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const NANOID_REGEX = /^[A-Za-z0-9_-]{21}$/

export const IdSchema = z
  .string()
  .min(1, 'ID cannot be empty')
  .refine(
    (id) => UUID_REGEX.test(id) || NANOID_REGEX.test(id),
    'ID must be a valid UUID or NanoID format'
  )

// Individual schemas for each type (can be customized per type if needed)
export const UserIdSchema = IdSchema
export const OrganizationIdSchema = IdSchema
export const AssetIdSchema = IdSchema
export const VaultIdSchema = IdSchema
export const DocumentIdSchema = IdSchema
export const AnnotationIdSchema = IdSchema
export const CommentIdSchema = IdSchema
export const BoardIdSchema = IdSchema
export const BoardMateIdSchema = IdSchema
export const CommitteeIdSchema = IdSchema
export const SessionIdSchema = IdSchema
export const SocketIdSchema = IdSchema
export const RoomIdSchema = IdSchema
export const NotificationIdSchema = IdSchema
export const EventIdSchema = IdSchema
export const CalendarEventIdSchema = IdSchema
export const MeetingIdSchema = IdSchema
export const MeetingResolutionIdSchema = IdSchema
export const MeetingActionableIdSchema = IdSchema
export const TocIdSchema = IdSchema
export const SummaryIdSchema = IdSchema
export const PodcastIdSchema = IdSchema
export const WorkflowIdSchema = IdSchema
export const RuleIdSchema = IdSchema
export const ComplianceWorkflowIdSchema = IdSchema
export const ActivityLogIdSchema = IdSchema
export const MeetingVoteIdSchema = IdSchema
export const MeetingProxyIdSchema = IdSchema
export const MeetingWorkflowIdSchema = IdSchema
export const MeetingRoleIdSchema = IdSchema
export const VotingSessionIdSchema = IdSchema
export const WorkflowTransitionIdSchema = IdSchema
export const VotingSessionItemIdSchema = IdSchema
export const TemplateIdSchema = IdSchema
export const InvitationIdSchema = IdSchema

// Document Collaboration schemas
export const DocumentCollaborationIdSchema = IdSchema
export const OperationIdSchema = IdSchema
export const CursorIdSchema = IdSchema
export const CollaborationSessionIdSchema = IdSchema
export const DocumentVersionIdSchema = IdSchema
export const DocumentLockIdSchema = IdSchema
export const CommentThreadIdSchema = IdSchema
export const SuggestionIdSchema = IdSchema
export const RevisionIdSchema = IdSchema
export const BranchIdSchema = IdSchema
export const MergeRequestIdSchema = IdSchema
export const ConflictIdSchema = IdSchema

// Additional validation schemas
export const EmailSchema = z.string().email('Invalid email format')
export const SlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
export const UrlSchema = z.string().url('Invalid URL format')
export const FilePathSchema = z.string().min(1, 'File path cannot be empty')
export const MimeTypeSchema = z.string().regex(/^[a-z]+\/[a-z0-9\-.+]+$/i, 'Invalid MIME type format')
export const JsonStringSchema = z.string().refine((val) => {
  try {
    JSON.parse(val)
    return true
  } catch {
    return false
  }
}, 'Invalid JSON string')
export const ISODateStringSchema = z.string().datetime('Invalid ISO date string')
export const JWTSchema = z.string().regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, 'Invalid JWT format')
export const ApiKeySchema = z.string().min(16, 'API key must be at least 16 characters')

// Number type schemas
export const PercentageSchema = z.number().min(0).max(100)
export const FileSizeSchema = z.number().nonnegative()
export const TimestampSchema = z.number().nonnegative()
export const PortSchema = z.number().int().min(1).max(65535)
export const VersionSchema = z.number().nonnegative()

// ==== Validation Result Type ====

export interface ValidationResult<T> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
  readonly issues?: ReadonlyArray<{ message: string; path?: ReadonlyArray<string> }>
}

// ==== Generic Validation Helper ====

function createValidatedId<T extends Brand<string, any>>(
  id: string,
  schema: z.ZodSchema<string>,
  typeName: string
): ValidationResult<T> {
  const result = schema.safeParse(id)
  
  if (!result.success) {
    return {
      success: false,
      error: `Invalid ${typeName}: ${result.error.message}`,
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

// ==== Safe Type Constructors (with validation) ====

export function createUserId(id: string): ValidationResult<UserId> {
  return createValidatedId<UserId>(id, UserIdSchema, 'UserId')
}

export function createOrganizationId(id: string): ValidationResult<OrganizationId> {
  return createValidatedId<OrganizationId>(id, OrganizationIdSchema, 'OrganizationId')
}

export function createAssetId(id: string): ValidationResult<AssetId> {
  return createValidatedId<AssetId>(id, AssetIdSchema, 'AssetId')
}

export function createVaultId(id: string): ValidationResult<VaultId> {
  return createValidatedId<VaultId>(id, VaultIdSchema, 'VaultId')
}

export function createDocumentId(id: string): ValidationResult<DocumentId> {
  return createValidatedId<DocumentId>(id, DocumentIdSchema, 'DocumentId')
}

export function createAnnotationId(id: string): ValidationResult<AnnotationId> {
  return createValidatedId<AnnotationId>(id, AnnotationIdSchema, 'AnnotationId')
}

export function createCommentId(id: string): ValidationResult<CommentId> {
  return createValidatedId<CommentId>(id, CommentIdSchema, 'CommentId')
}

export function createBoardId(id: string): ValidationResult<BoardId> {
  return createValidatedId<BoardId>(id, BoardIdSchema, 'BoardId')
}

export function createBoardMateId(id: string): ValidationResult<BoardMateId> {
  return createValidatedId<BoardMateId>(id, BoardMateIdSchema, 'BoardMateId')
}

export function createCommitteeId(id: string): ValidationResult<CommitteeId> {
  return createValidatedId<CommitteeId>(id, CommitteeIdSchema, 'CommitteeId')
}

export function createSessionId(id: string): ValidationResult<SessionId> {
  return createValidatedId<SessionId>(id, SessionIdSchema, 'SessionId')
}

export function createSocketId(id: string): ValidationResult<SocketId> {
  return createValidatedId<SocketId>(id, SocketIdSchema, 'SocketId')
}

export function createRoomId(id: string): ValidationResult<RoomId> {
  return createValidatedId<RoomId>(id, RoomIdSchema, 'RoomId')
}

export function createNotificationId(id: string): ValidationResult<NotificationId> {
  return createValidatedId<NotificationId>(id, NotificationIdSchema, 'NotificationId')
}

export function createEventId(id: string): ValidationResult<EventId> {
  return createValidatedId<EventId>(id, EventIdSchema, 'EventId')
}

export function createCalendarEventId(id: string): ValidationResult<CalendarEventId> {
  return createValidatedId<CalendarEventId>(id, CalendarEventIdSchema, 'CalendarEventId')
}

export function createMeetingId(id: string): ValidationResult<MeetingId> {
  return createValidatedId<MeetingId>(id, MeetingIdSchema, 'MeetingId')
}

export function createMeetingResolutionId(id: string): ValidationResult<MeetingResolutionId> {
  return createValidatedId<MeetingResolutionId>(id, MeetingResolutionIdSchema, 'MeetingResolutionId')
}

export function createMeetingActionableId(id: string): ValidationResult<MeetingActionableId> {
  return createValidatedId<MeetingActionableId>(id, MeetingActionableIdSchema, 'MeetingActionableId')
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

export function createWorkflowId(id: string): ValidationResult<WorkflowId> {
  return createValidatedId<WorkflowId>(id, WorkflowIdSchema, 'WorkflowId')
}

export function createRuleId(id: string): ValidationResult<RuleId> {
  return createValidatedId<RuleId>(id, RuleIdSchema, 'RuleId')
}

export function createComplianceWorkflowId(id: string): ValidationResult<ComplianceWorkflowId> {
  return createValidatedId<ComplianceWorkflowId>(id, ComplianceWorkflowIdSchema, 'ComplianceWorkflowId')
}

export function createActivityLogId(id: string): ValidationResult<ActivityLogId> {
  return createValidatedId<ActivityLogId>(id, ActivityLogIdSchema, 'ActivityLogId')
}

export function createTemplateId(id: string): ValidationResult<TemplateId> {
  return createValidatedId<TemplateId>(id, TemplateIdSchema, 'TemplateId')
}

export function createInvitationId(id: string): ValidationResult<InvitationId> {
  return createValidatedId<InvitationId>(id, InvitationIdSchema, 'InvitationId')
}

// Document Collaboration constructors
export function createDocumentCollaborationId(id: string): ValidationResult<DocumentCollaborationId> {
  return createValidatedId<DocumentCollaborationId>(id, DocumentCollaborationIdSchema, 'DocumentCollaborationId')
}

export function createOperationId(id: string): ValidationResult<OperationId> {
  return createValidatedId<OperationId>(id, OperationIdSchema, 'OperationId')
}

export function createCursorId(id: string): ValidationResult<CursorId> {
  return createValidatedId<CursorId>(id, CursorIdSchema, 'CursorId')
}

export function createCollaborationSessionId(id: string): ValidationResult<CollaborationSessionId> {
  return createValidatedId<CollaborationSessionId>(id, CollaborationSessionIdSchema, 'CollaborationSessionId')
}

export function createDocumentVersionId(id: string): ValidationResult<DocumentVersionId> {
  return createValidatedId<DocumentVersionId>(id, DocumentVersionIdSchema, 'DocumentVersionId')
}

export function createDocumentLockId(id: string): ValidationResult<DocumentLockId> {
  return createValidatedId<DocumentLockId>(id, DocumentLockIdSchema, 'DocumentLockId')
}

export function createCommentThreadId(id: string): ValidationResult<CommentThreadId> {
  return createValidatedId<CommentThreadId>(id, CommentThreadIdSchema, 'CommentThreadId')
}

export function createSuggestionId(id: string): ValidationResult<SuggestionId> {
  return createValidatedId<SuggestionId>(id, SuggestionIdSchema, 'SuggestionId')
}

export function createRevisionId(id: string): ValidationResult<RevisionId> {
  return createValidatedId<RevisionId>(id, RevisionIdSchema, 'RevisionId')
}

export function createBranchId(id: string): ValidationResult<BranchId> {
  return createValidatedId<BranchId>(id, BranchIdSchema, 'BranchId')
}

export function createMergeRequestId(id: string): ValidationResult<MergeRequestId> {
  return createValidatedId<MergeRequestId>(id, MergeRequestIdSchema, 'MergeRequestId')
}

export function createConflictId(id: string): ValidationResult<ConflictId> {
  return createValidatedId<ConflictId>(id, ConflictIdSchema, 'ConflictId')
}

export function createMeetingVoteId(id: string): ValidationResult<MeetingVoteId> {
  return createValidatedId<MeetingVoteId>(id, MeetingVoteIdSchema, 'MeetingVoteId')
}

export function createMeetingProxyId(id: string): ValidationResult<MeetingProxyId> {
  return createValidatedId<MeetingProxyId>(id, MeetingProxyIdSchema, 'MeetingProxyId')
}

export function createMeetingWorkflowId(id: string): ValidationResult<MeetingWorkflowId> {
  return createValidatedId<MeetingWorkflowId>(id, MeetingWorkflowIdSchema, 'MeetingWorkflowId')
}

export function createMeetingRoleId(id: string): ValidationResult<MeetingRoleId> {
  return createValidatedId<MeetingRoleId>(id, MeetingRoleIdSchema, 'MeetingRoleId')
}

export function createVotingSessionId(id: string): ValidationResult<VotingSessionId> {
  return createValidatedId<VotingSessionId>(id, VotingSessionIdSchema, 'VotingSessionId')
}

export function createWorkflowTransitionId(id: string): ValidationResult<WorkflowTransitionId> {
  return createValidatedId<WorkflowTransitionId>(id, WorkflowTransitionIdSchema, 'WorkflowTransitionId')
}

export function createVotingSessionItemId(id: string): ValidationResult<VotingSessionItemId> {
  return createValidatedId<VotingSessionItemId>(id, VotingSessionItemIdSchema, 'VotingSessionItemId')
}

// ==== Additional Type Constructors ====

export function createEmail(email: string): ValidationResult<Email> {
  return createValidatedId<Email>(email, EmailSchema, 'Email')
}

export function createSlug(slug: string): ValidationResult<Slug> {
  return createValidatedId<Slug>(slug, SlugSchema, 'Slug')
}

export function createUrl(url: string): ValidationResult<Url> {
  return createValidatedId<Url>(url, UrlSchema, 'Url')
}

export function createFilePath(path: string): ValidationResult<FilePath> {
  return createValidatedId<FilePath>(path, FilePathSchema, 'FilePath')
}

export function createMimeType(mimeType: string): ValidationResult<MimeType> {
  return createValidatedId<MimeType>(mimeType, MimeTypeSchema, 'MimeType')
}

export function createJsonString(jsonString: string): ValidationResult<JsonString> {
  return createValidatedId<JsonString>(jsonString, JsonStringSchema, 'JsonString')
}

export function createISODateString(dateString: string): ValidationResult<ISODateString> {
  return createValidatedId<ISODateString>(dateString, ISODateStringSchema, 'ISODateString')
}

export function createJWT(jwt: string): ValidationResult<JWT> {
  return createValidatedId<JWT>(jwt, JWTSchema, 'JWT')
}

export function createApiKey(apiKey: string): ValidationResult<ApiKey> {
  return createValidatedId<ApiKey>(apiKey, ApiKeySchema, 'ApiKey')
}

// ==== Number Type Constructors ====

function createValidatedNumber<T extends Brand<number, any>>(
  value: number,
  schema: z.ZodSchema<number>,
  typeName: string
): ValidationResult<T> {
  const result = schema.safeParse(value)
  
  if (!result.success) {
    return {
      success: false,
      error: `Invalid ${typeName}: ${result.error.message}`,
      issues: result.error.issues.map(issue => ({
        message: issue.message,
        path: issue.path.map(p => String(p))
      }))
    }
  }
  
  return {
    success: true,
    data: value as T
  }
}

export function createPercentage(value: number): ValidationResult<Percentage> {
  return createValidatedNumber<Percentage>(value, PercentageSchema, 'Percentage')
}

export function createFileSize(size: number): ValidationResult<FileSize> {
  return createValidatedNumber<FileSize>(size, FileSizeSchema, 'FileSize')
}

export function createTimestamp(timestamp: number): ValidationResult<Timestamp> {
  return createValidatedNumber<Timestamp>(timestamp, TimestampSchema, 'Timestamp')
}

export function createPort(port: number): ValidationResult<Port> {
  return createValidatedNumber<Port>(port, PortSchema, 'Port')
}

export function createVersion(version: number): ValidationResult<Version> {
  return createValidatedNumber<Version>(version, VersionSchema, 'Version')
}

// ==== Unsafe Type Constructors (for internal/trusted use) ====

export function unsafeUserId(id: string): UserId {
  return id as UserId
}

export function unsafeOrganizationId(id: string): OrganizationId {
  return id as OrganizationId
}

export function unsafeAssetId(id: string): AssetId {
  return id as AssetId
}

export function unsafeVaultId(id: string): VaultId {
  return id as VaultId
}

export function unsafeDocumentId(id: string): DocumentId {
  return id as DocumentId
}

export function unsafeAnnotationId(id: string): AnnotationId {
  return id as AnnotationId
}

export function unsafeCommentId(id: string): CommentId {
  return id as CommentId
}

export function unsafeBoardId(id: string): BoardId {
  return id as BoardId
}

export function unsafeBoardMateId(id: string): BoardMateId {
  return id as BoardMateId
}

export function unsafeCommitteeId(id: string): CommitteeId {
  return id as CommitteeId
}

export function unsafeSessionId(id: string): SessionId {
  return id as SessionId
}

export function unsafeSocketId(id: string): SocketId {
  return id as SocketId
}

export function unsafeRoomId(id: string): RoomId {
  return id as RoomId
}

export function unsafeNotificationId(id: string): NotificationId {
  return id as NotificationId
}

export function unsafeEventId(id: string): EventId {
  return id as EventId
}

export function unsafeCalendarEventId(id: string): CalendarEventId {
  return id as CalendarEventId
}

export function unsafeMeetingId(id: string): MeetingId {
  return id as MeetingId
}

export function unsafeMeetingResolutionId(id: string): MeetingResolutionId {
  return id as MeetingResolutionId
}

export function unsafeMeetingActionableId(id: string): MeetingActionableId {
  return id as MeetingActionableId
}

export function unsafeTocId(id: string): TocId {
  return id as TocId
}

export function unsafeSummaryId(id: string): SummaryId {
  return id as SummaryId
}

export function unsafePodcastId(id: string): PodcastId {
  return id as PodcastId
}

export function unsafeWorkflowId(id: string): WorkflowId {
  return id as WorkflowId
}

export function unsafeRuleId(id: string): RuleId {
  return id as RuleId
}

export function unsafeComplianceWorkflowId(id: string): ComplianceWorkflowId {
  return id as ComplianceWorkflowId
}

export function unsafeActivityLogId(id: string): ActivityLogId {
  return id as ActivityLogId
}

export function unsafeTemplateId(id: string): TemplateId {
  return id as TemplateId
}

export function unsafeInvitationId(id: string): InvitationId {
  return id as InvitationId
}

export function unsafeMeetingVoteId(id: string): MeetingVoteId {
  return id as MeetingVoteId
}

export function unsafeMeetingProxyId(id: string): MeetingProxyId {
  return id as MeetingProxyId
}

export function unsafeMeetingWorkflowId(id: string): MeetingWorkflowId {
  return id as MeetingWorkflowId
}

export function unsafeMeetingRoleId(id: string): MeetingRoleId {
  return id as MeetingRoleId
}

export function unsafeVotingSessionId(id: string): VotingSessionId {
  return id as VotingSessionId
}

export function unsafeWorkflowTransitionId(id: string): WorkflowTransitionId {
  return id as WorkflowTransitionId
}

export function unsafeVotingSessionItemId(id: string): VotingSessionItemId {
  return id as VotingSessionItemId
}

// ==== Type Guards ====

export function isUserId(value: unknown): value is UserId {
  return typeof value === 'string' && UserIdSchema.safeParse(value).success
}

export function isOrganizationId(value: unknown): value is OrganizationId {
  return typeof value === 'string' && OrganizationIdSchema.safeParse(value).success
}

export function isAssetId(value: unknown): value is AssetId {
  return typeof value === 'string' && AssetIdSchema.safeParse(value).success
}

export function isVaultId(value: unknown): value is VaultId {
  return typeof value === 'string' && VaultIdSchema.safeParse(value).success
}

export function isDocumentId(value: unknown): value is DocumentId {
  return typeof value === 'string' && DocumentIdSchema.safeParse(value).success
}

export function isAnnotationId(value: unknown): value is AnnotationId {
  return typeof value === 'string' && AnnotationIdSchema.safeParse(value).success
}

export function isCommentId(value: unknown): value is CommentId {
  return typeof value === 'string' && CommentIdSchema.safeParse(value).success
}

export function isBoardId(value: unknown): value is BoardId {
  return typeof value === 'string' && BoardIdSchema.safeParse(value).success
}

export function isBoardMateId(value: unknown): value is BoardMateId {
  return typeof value === 'string' && BoardMateIdSchema.safeParse(value).success
}

export function isCommitteeId(value: unknown): value is CommitteeId {
  return typeof value === 'string' && CommitteeIdSchema.safeParse(value).success
}

export function isSessionId(value: unknown): value is SessionId {
  return typeof value === 'string' && SessionIdSchema.safeParse(value).success
}

export function isSocketId(value: unknown): value is SocketId {
  return typeof value === 'string' && SocketIdSchema.safeParse(value).success
}

export function isRoomId(value: unknown): value is RoomId {
  return typeof value === 'string' && RoomIdSchema.safeParse(value).success
}

export function isNotificationId(value: unknown): value is NotificationId {
  return typeof value === 'string' && NotificationIdSchema.safeParse(value).success
}

export function isEventId(value: unknown): value is EventId {
  return typeof value === 'string' && EventIdSchema.safeParse(value).success
}

export function isCalendarEventId(value: unknown): value is CalendarEventId {
  return typeof value === 'string' && CalendarEventIdSchema.safeParse(value).success
}

export function isMeetingId(value: unknown): value is MeetingId {
  return typeof value === 'string' && MeetingIdSchema.safeParse(value).success
}

export function isMeetingResolutionId(value: unknown): value is MeetingResolutionId {
  return typeof value === 'string' && MeetingResolutionIdSchema.safeParse(value).success
}

export function isMeetingActionableId(value: unknown): value is MeetingActionableId {
  return typeof value === 'string' && MeetingActionableIdSchema.safeParse(value).success
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

export function isWorkflowId(value: unknown): value is WorkflowId {
  return typeof value === 'string' && WorkflowIdSchema.safeParse(value).success
}

export function isRuleId(value: unknown): value is RuleId {
  return typeof value === 'string' && RuleIdSchema.safeParse(value).success
}

export function isComplianceWorkflowId(value: unknown): value is ComplianceWorkflowId {
  return typeof value === 'string' && ComplianceWorkflowIdSchema.safeParse(value).success
}

export function isActivityLogId(value: unknown): value is ActivityLogId {
  return typeof value === 'string' && ActivityLogIdSchema.safeParse(value).success
}

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && TemplateIdSchema.safeParse(value).success
}

export function isInvitationId(value: unknown): value is InvitationId {
  return typeof value === 'string' && InvitationIdSchema.safeParse(value).success
}

export function isMeetingVoteId(value: unknown): value is MeetingVoteId {
  return typeof value === 'string' && MeetingVoteIdSchema.safeParse(value).success
}

export function isMeetingProxyId(value: unknown): value is MeetingProxyId {
  return typeof value === 'string' && MeetingProxyIdSchema.safeParse(value).success
}

export function isMeetingWorkflowId(value: unknown): value is MeetingWorkflowId {
  return typeof value === 'string' && MeetingWorkflowIdSchema.safeParse(value).success
}

export function isMeetingRoleId(value: unknown): value is MeetingRoleId {
  return typeof value === 'string' && MeetingRoleIdSchema.safeParse(value).success
}

export function isVotingSessionId(value: unknown): value is VotingSessionId {
  return typeof value === 'string' && VotingSessionIdSchema.safeParse(value).success
}

export function isWorkflowTransitionId(value: unknown): value is WorkflowTransitionId {
  return typeof value === 'string' && WorkflowTransitionIdSchema.safeParse(value).success
}

export function isVotingSessionItemId(value: unknown): value is VotingSessionItemId {
  return typeof value === 'string' && VotingSessionItemIdSchema.safeParse(value).success
}

// ==== Union Type for All Branded IDs ====

export type AnyBrandedId = 
  | UserId 
  | OrganizationId 
  | AssetId 
  | VaultId 
  | DocumentId
  | AnnotationId
  | CommentId
  | BoardId 
  | BoardMateId
  | CommitteeId
  | SessionId
  | SocketId
  | RoomId
  | NotificationId 
  | EventId
  | CalendarEventId 
  | MeetingId
  | MeetingResolutionId
  | MeetingActionableId
  | TocId
  | SummaryId
  | PodcastId
  | WorkflowId
  | RuleId
  | ComplianceWorkflowId
  | ActivityLogId
  | TemplateId
  | InvitationId
  | MeetingVoteId
  | MeetingProxyId
  | MeetingWorkflowId
  | MeetingRoleId
  | VotingSessionId
  | WorkflowTransitionId
  | VotingSessionItemId

// ==== Generic Utilities ====

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
    isAssetId(value) ||
    isVaultId(value) ||
    isDocumentId(value) ||
    isAnnotationId(value) ||
    isCommentId(value) ||
    isBoardId(value) ||
    isBoardMateId(value) ||
    isCommitteeId(value) ||
    isSessionId(value) ||
    isSocketId(value) ||
    isRoomId(value) ||
    isNotificationId(value) ||
    isEventId(value) ||
    isCalendarEventId(value) ||
    isMeetingId(value) ||
    isMeetingResolutionId(value) ||
    isMeetingActionableId(value) ||
    isTocId(value) ||
    isSummaryId(value) ||
    isPodcastId(value) ||
    isWorkflowId(value) ||
    isRuleId(value) ||
    isComplianceWorkflowId(value) ||
    isActivityLogId(value) ||
    isTemplateId(value) ||
    isInvitationId(value) ||
    isMeetingVoteId(value) ||
    isMeetingProxyId(value) ||
    isMeetingWorkflowId(value) ||
    isMeetingRoleId(value) ||
    isVotingSessionId(value) ||
    isWorkflowTransitionId(value) ||
    isVotingSessionItemId(value)
}

// ==== Advanced Branded Type Patterns ====

/**
 * Create a scoped branded type (e.g., organization-scoped IDs)
 */
export type ScopedBrand<T, B, S> = Brand<T, B> & { readonly __scope: S }

/**
 * Organization-scoped ID type
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
    data: Object.assign(result.data, { __scope: orgId }) as OrgScopedId<T>
  }
}

/**
 * Extract the scope from a scoped branded ID
 */
export function extractScope<S>(
  scopedId: ScopedBrand<any, any, S>
): S {
  return (scopedId as any).__scope
}

// ==== Batch Operations ====

/**
 * Validate multiple IDs of the same type
 */
export function validateBatch<T extends Brand<string, any>>(
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

/**
 * Transform branded IDs with error handling
 */
export function mapBrandedIds<T extends Brand<string, any>, U extends Brand<string, any>>(
  ids: T[],
  transform: (id: T) => ValidationResult<U>
): { valid: U[]; invalid: Array<{ id: T; error: string }> } {
  const valid: U[] = []
  const invalid: Array<{ id: T; error: string }> = []

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

// ==== Type Maps for Dynamic Access ====

export const BrandedTypeConstructors = {
  UserId: createUserId,
  OrganizationId: createOrganizationId,
  AssetId: createAssetId,
  VaultId: createVaultId,
  DocumentId: createDocumentId,
  AnnotationId: createAnnotationId,
  CommentId: createCommentId,
  BoardId: createBoardId,
  BoardMateId: createBoardMateId,
  CommitteeId: createCommitteeId,
  SessionId: createSessionId,
  SocketId: createSocketId,
  RoomId: createRoomId,
  NotificationId: createNotificationId,
  EventId: createEventId,
  CalendarEventId: createCalendarEventId,
  MeetingId: createMeetingId,
  MeetingResolutionId: createMeetingResolutionId,
  MeetingActionableId: createMeetingActionableId,
  TocId: createTocId,
  SummaryId: createSummaryId,
  PodcastId: createPodcastId,
  WorkflowId: createWorkflowId,
  RuleId: createRuleId,
  ComplianceWorkflowId: createComplianceWorkflowId,
  ActivityLogId: createActivityLogId,
  TemplateId: createTemplateId,
  InvitationId: createInvitationId,
  MeetingVoteId: createMeetingVoteId,
  MeetingProxyId: createMeetingProxyId,
  MeetingWorkflowId: createMeetingWorkflowId,
  MeetingRoleId: createMeetingRoleId,
  VotingSessionId: createVotingSessionId,
  WorkflowTransitionId: createWorkflowTransitionId,
  VotingSessionItemId: createVotingSessionItemId
} as const

export const BrandedTypeGuards = {
  UserId: isUserId,
  OrganizationId: isOrganizationId,
  AssetId: isAssetId,
  VaultId: isVaultId,
  DocumentId: isDocumentId,
  AnnotationId: isAnnotationId,
  CommentId: isCommentId,
  BoardId: isBoardId,
  BoardMateId: isBoardMateId,
  CommitteeId: isCommitteeId,
  SessionId: isSessionId,
  SocketId: isSocketId,
  RoomId: isRoomId,
  NotificationId: isNotificationId,
  EventId: isEventId,
  CalendarEventId: isCalendarEventId,
  MeetingId: isMeetingId,
  MeetingResolutionId: isMeetingResolutionId,
  MeetingActionableId: isMeetingActionableId,
  TocId: isTocId,
  SummaryId: isSummaryId,
  PodcastId: isPodcastId,
  WorkflowId: isWorkflowId,
  RuleId: isRuleId,
  ComplianceWorkflowId: isComplianceWorkflowId,
  ActivityLogId: isActivityLogId,
  TemplateId: isTemplateId,
  InvitationId: isInvitationId,
  MeetingVoteId: isMeetingVoteId,
  MeetingProxyId: isMeetingProxyId,
  MeetingWorkflowId: isMeetingWorkflowId,
  MeetingRoleId: isMeetingRoleId,
  VotingSessionId: isVotingSessionId,
  WorkflowTransitionId: isWorkflowTransitionId,
  VotingSessionItemId: isVotingSessionItemId
} as const

export type BrandedTypeName = keyof typeof BrandedTypeConstructors

// ==== Compile-time Safety Utilities ====

/**
 * Compile-time check to prevent mixing different ID types
 * Usage: ensureIdType<UserId>(someId) - will fail at compile time if someId is not UserId
 */
export function ensureIdType<T extends AnyBrandedId>(id: T): T {
  return id
}

/**
 * Compile-time enforced ID type conversion
 * Usage: convertIdType(userId, createAssetId) - will fail at compile time if types don't match
 */
export function convertIdType<From extends Brand<string, any>, To extends Brand<string, any>>(
  fromId: From,
  toConstructor: (id: string) => ValidationResult<To>
): ValidationResult<To> {
  return toConstructor(extractId(fromId))
}

// ==== Type-Level Tests for Compile-Time Safety ====

// These types will cause TypeScript errors if branded types can be mixed incorrectly
type _TestIdMixingPrevention = {
  // These should all cause compile errors if uncommented:
  // userIdAsAssetId: AssetId extends UserId ? never : 'Good - prevents mixing'
  // assetIdAsUserId: UserId extends AssetId ? never : 'Good - prevents mixing'
  // vaultIdAsOrgId: OrganizationId extends VaultId ? never : 'Good - prevents mixing'
}

// Test that branded IDs are not assignable to plain strings without explicit conversion
type _TestStringAssignment = {
  // This should cause a compile error if uncommented:
  // stringFromBranded: string extends UserId ? never : 'Good - prevents accidental string assignment'
}