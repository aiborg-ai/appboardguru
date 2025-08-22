/**
 * Asset Annotation Domain Types
 * Following DDD patterns with branded types and discriminated unions
 */

// Import branded types from centralized system
export type {
  AnnotationId,
  AssetId,
  UserId,
  OrganizationId,
  CommentId
} from './branded'

// Annotation type discriminated union
export type AnnotationType = 'highlight' | 'area' | 'textbox' | 'drawing' | 'stamp'

// Position data for PDF coordinates
export interface AnnotationPosition {
  pageNumber: number
  rects: Array<{
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
  }>
  boundingRect: {
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
  }
}

// Content data for annotation
export interface AnnotationContent {
  text?: string
  image?: string
}

// User information embedded in annotation
export interface AnnotationUser {
  id: UserId
  fullName: string
  avatarUrl?: string
}

// Reply to an annotation
export interface AnnotationReply {
  id: string
  replyText: string
  createdBy: UserId
  createdAt: string
  updatedAt?: string
  isEdited: boolean
  editedAt?: string
  user: AnnotationUser
}

// Main annotation entity
export interface AssetAnnotation {
  id: AnnotationId
  assetId: AssetId
  organizationId: OrganizationId
  createdBy: UserId
  annotationType: AnnotationType
  content: AnnotationContent
  pageNumber: number
  position: AnnotationPosition
  selectedText?: string
  commentText?: string
  color: string
  opacity: number
  isPrivate: boolean
  isResolved: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt?: string
  deletedAt?: string
  deletedBy?: UserId
  user: AnnotationUser
  replies: AnnotationReply[]
  repliesCount: number
}

// Request/Response types for API
export interface CreateAnnotationRequest {
  annotationType: AnnotationType
  content: AnnotationContent
  pageNumber: number
  position: AnnotationPosition
  selectedText?: string
  commentText?: string
  color?: string
  opacity?: number
  isPrivate?: boolean
}

export interface UpdateAnnotationRequest {
  commentText?: string
  color?: string
  opacity?: number
  isPrivate?: boolean
  isResolved?: boolean
}

export interface AnnotationQueryCriteria {
  assetId: AssetId
  pageNumber?: number
  annotationType?: AnnotationType
  isPrivate?: boolean
  isResolved?: boolean
  createdBy?: UserId
  limit?: number
  offset?: number
}

// Result types following the Result pattern
export type AnnotationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: Error }

export type AnnotationsResult = AnnotationResult<AssetAnnotation[]>
export type SingleAnnotationResult = AnnotationResult<AssetAnnotation>
export type AnnotationCountResult = AnnotationResult<number>

// Domain events for real-time updates
export type AnnotationEvent = 
  | { type: 'annotation_created'; annotation: AssetAnnotation }
  | { type: 'annotation_updated'; annotation: AssetAnnotation }
  | { type: 'annotation_deleted'; annotationId: AnnotationId }
  | { type: 'reply_created'; annotationId: AnnotationId; reply: AnnotationReply }

// Validation schemas
export interface AnnotationValidationError {
  field: string
  message: string
  code: string
}

export interface AnnotationValidationResult {
  valid: boolean
  errors: AnnotationValidationError[]
}