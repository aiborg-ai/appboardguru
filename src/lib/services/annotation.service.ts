/**
 * Asset Annotation Service
 * Business logic layer for annotation operations following DDD patterns
 */

import { 
  AssetAnnotation, 
  AnnotationId, 
  AssetId, 
  UserId, 
  OrganizationId,
  CreateAnnotationRequest,
  UpdateAnnotationRequest,
  AnnotationQueryCriteria,
  AnnotationsResult,
  SingleAnnotationResult,
  AnnotationCountResult,
  AnnotationValidationResult,
  AnnotationValidationError,
  AnnotationReply
} from '@/types/annotation-types'
import { IAnnotationRepository } from '@/lib/repositories/annotation.repository'
import { Result } from '@/lib/result/types'

export interface IAnnotationService {
  getAnnotationsByAssetId(assetId: AssetId, criteria?: Partial<AnnotationQueryCriteria>): Promise<AnnotationsResult>
  getAnnotationById(id: AnnotationId): Promise<SingleAnnotationResult>
  getAnnotationsByPage(assetId: AssetId, pageNumber: number): Promise<AnnotationsResult>
  createAnnotation(data: CreateAnnotationRequest, assetId: AssetId, userId: UserId, organizationId: OrganizationId): Promise<SingleAnnotationResult>
  updateAnnotation(id: AnnotationId, data: UpdateAnnotationRequest, userId: UserId): Promise<SingleAnnotationResult>
  deleteAnnotation(id: AnnotationId, userId: UserId): Promise<Result<void>>
  countAnnotations(criteria: AnnotationQueryCriteria): Promise<AnnotationCountResult>
  validateAnnotationData(data: CreateAnnotationRequest): AnnotationValidationResult
  validateUpdateData(data: UpdateAnnotationRequest): AnnotationValidationResult
  canUserAccessAnnotation(annotationId: AnnotationId, userId: UserId): Promise<boolean>
  canUserEditAnnotation(annotationId: AnnotationId, userId: UserId): Promise<boolean>
  canUserDeleteAnnotation(annotationId: AnnotationId, userId: UserId): Promise<boolean>
}

export class AnnotationService implements IAnnotationService {
  constructor(private annotationRepository: IAnnotationRepository) {}

  async getAnnotationsByAssetId(
    assetId: AssetId, 
    criteria?: Partial<AnnotationQueryCriteria>
  ): Promise<AnnotationsResult> {
    try {
      const annotations = await this.annotationRepository.findByAssetId(assetId, criteria)
      return { success: true, data: annotations }
    } catch (error) {
      return { 
        success: false, 
        error: new Error(`Failed to fetch annotations: ${error instanceof Error ? error.message : 'Unknown error'}`) 
      }
    }
  }

  async getAnnotationById(id: AnnotationId): Promise<SingleAnnotationResult> {
    try {
      const annotation = await this.annotationRepository.findById(id)
      if (!annotation) {
        return { success: false, error: new Error('Annotation not found') }
      }
      return { success: true, data: annotation }
    } catch (error) {
      return { 
        success: false, 
        error: new Error(`Failed to fetch annotation: ${error instanceof Error ? error.message : 'Unknown error'}`) 
      }
    }
  }

  async getAnnotationsByPage(assetId: AssetId, pageNumber: number): Promise<AnnotationsResult> {
    try {
      const annotations = await this.annotationRepository.findByPageNumber(assetId, pageNumber)
      return { success: true, data: annotations }
    } catch (error) {
      return { 
        success: false, 
        error: new Error(`Failed to fetch page annotations: ${error instanceof Error ? error.message : 'Unknown error'}`) 
      }
    }
  }

  async createAnnotation(
    data: CreateAnnotationRequest, 
    assetId: AssetId, 
    userId: UserId, 
    organizationId: OrganizationId
  ): Promise<SingleAnnotationResult> {
    // Validate input data
    const validation = this.validateAnnotationData(data)
    if (!validation.valid) {
      const errorMessage = validation.errors.map(e => e.message).join(', ')
      return { success: false, error: new Error(`Validation failed: ${errorMessage}`) }
    }

    try {
      const annotation = await this.annotationRepository.create(data, assetId, userId, organizationId)
      return { success: true, data: annotation }
    } catch (error) {
      return { 
        success: false, 
        error: new Error(`Failed to create annotation: ${error instanceof Error ? error.message : 'Unknown error'}`) 
      }
    }
  }

  async updateAnnotation(
    id: AnnotationId, 
    data: UpdateAnnotationRequest, 
    userId: UserId
  ): Promise<SingleAnnotationResult> {
    // Check permissions
    const canEdit = await this.canUserEditAnnotation(id, userId)
    if (!canEdit) {
      return { success: false, error: new Error('Permission denied: Cannot edit this annotation') }
    }

    // Validate input data
    const validation = this.validateUpdateData(data)
    if (!validation.valid) {
      const errorMessage = validation.errors.map(e => e.message).join(', ')
      return { success: false, error: new Error(`Validation failed: ${errorMessage}`) }
    }

    try {
      const annotation = await this.annotationRepository.update(id, data)
      return { success: true, data: annotation }
    } catch (error) {
      return { 
        success: false, 
        error: new Error(`Failed to update annotation: ${error instanceof Error ? error.message : 'Unknown error'}`) 
      }
    }
  }

  async deleteAnnotation(id: AnnotationId, userId: UserId): Promise<Result<void>> {
    // Check permissions
    const canDelete = await this.canUserDeleteAnnotation(id, userId)
    if (!canDelete) {
      return { success: false, error: new Error('Permission denied: Cannot delete this annotation') }
    }

    try {
      await this.annotationRepository.softDelete(id, userId)
      return { success: true, data: undefined }
    } catch (error) {
      return { 
        success: false, 
        error: new Error(`Failed to delete annotation: ${error instanceof Error ? error.message : 'Unknown error'}`) 
      }
    }
  }

  async countAnnotations(criteria: AnnotationQueryCriteria): Promise<AnnotationCountResult> {
    try {
      const count = await this.annotationRepository.count(criteria)
      return { success: true, data: count }
    } catch (error) {
      return { 
        success: false, 
        error: new Error(`Failed to count annotations: ${error instanceof Error ? error.message : 'Unknown error'}`) 
      }
    }
  }

  validateAnnotationData(data: CreateAnnotationRequest): AnnotationValidationResult {
    const errors: AnnotationValidationError[] = []

    // Validate annotation type
    const validTypes = ['highlight', 'area', 'textbox', 'drawing', 'stamp']
    if (!validTypes.includes(data.annotationType)) {
      errors.push({
        field: 'annotationType',
        message: 'Invalid annotation type',
        code: 'INVALID_TYPE'
      })
    }

    // Validate page number
    if (!data.pageNumber || data.pageNumber < 1) {
      errors.push({
        field: 'pageNumber',
        message: 'Page number must be a positive integer',
        code: 'INVALID_PAGE_NUMBER'
      })
    }

    // Validate position data
    if (!data.position) {
      errors.push({
        field: 'position',
        message: 'Position data is required',
        code: 'MISSING_POSITION'
      })
    } else {
      if (!data.position.boundingRect) {
        errors.push({
          field: 'position.boundingRect',
          message: 'Bounding rectangle is required',
          code: 'MISSING_BOUNDING_RECT'
        })
      }
      if (!Array.isArray(data.position.rects) || data.position.rects.length === 0) {
        errors.push({
          field: 'position.rects',
          message: 'At least one rectangle is required',
          code: 'MISSING_RECTS'
        })
      }
    }

    // Validate content
    if (!data.content || (!data.content.text && !data.content.image)) {
      errors.push({
        field: 'content',
        message: 'Annotation must have text or image content',
        code: 'MISSING_CONTENT'
      })
    }

    // Validate color format (hex color)
    if (data.color && !/^#[0-9A-Fa-f]{6}$/i.test(data.color)) {
      errors.push({
        field: 'color',
        message: 'Color must be a valid hex color (e.g., #FFFF00)',
        code: 'INVALID_COLOR_FORMAT'
      })
    }

    // Validate opacity range
    if (data.opacity !== undefined && (data.opacity < 0 || data.opacity > 1)) {
      errors.push({
        field: 'opacity',
        message: 'Opacity must be between 0 and 1',
        code: 'INVALID_OPACITY_RANGE'
      })
    }

    // Validate comment text length
    if (data.commentText && data.commentText.length > 2000) {
      errors.push({
        field: 'commentText',
        message: 'Comment text cannot exceed 2000 characters',
        code: 'COMMENT_TOO_LONG'
      })
    }

    // Validate selected text length
    if (data.selectedText && data.selectedText.length > 5000) {
      errors.push({
        field: 'selectedText',
        message: 'Selected text cannot exceed 5000 characters',
        code: 'SELECTED_TEXT_TOO_LONG'
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  validateUpdateData(data: UpdateAnnotationRequest): AnnotationValidationResult {
    const errors: AnnotationValidationError[] = []

    // Validate color format (hex color) if provided
    if (data.color && !/^#[0-9A-Fa-f]{6}$/i.test(data.color)) {
      errors.push({
        field: 'color',
        message: 'Color must be a valid hex color (e.g., #FFFF00)',
        code: 'INVALID_COLOR_FORMAT'
      })
    }

    // Validate opacity range if provided
    if (data.opacity !== undefined && (data.opacity < 0 || data.opacity > 1)) {
      errors.push({
        field: 'opacity',
        message: 'Opacity must be between 0 and 1',
        code: 'INVALID_OPACITY_RANGE'
      })
    }

    // Validate comment text length if provided
    if (data.commentText && data.commentText.length > 2000) {
      errors.push({
        field: 'commentText',
        message: 'Comment text cannot exceed 2000 characters',
        code: 'COMMENT_TOO_LONG'
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  async canUserAccessAnnotation(annotationId: AnnotationId, userId: UserId): Promise<boolean> {
    try {
      const annotation = await this.annotationRepository.findById(annotationId)
      if (!annotation) {
        return false
      }

      // User can access their own annotations
      if (annotation.createdBy === userId) {
        return true
      }

      // User can access public annotations
      if (!annotation.isPrivate) {
        return true
      }

      // For private annotations, additional organization/permission checks would go here
      // This would typically involve checking organization membership
      return false
    } catch (error) {
      return false
    }
  }

  async canUserEditAnnotation(annotationId: AnnotationId, userId: UserId): Promise<boolean> {
    try {
      const annotation = await this.annotationRepository.findById(annotationId)
      if (!annotation) {
        return false
      }

      // Only the creator can edit their annotation
      // In a more complex system, organization admins might also be allowed
      return annotation.createdBy === userId
    } catch (error) {
      return false
    }
  }

  async canUserDeleteAnnotation(annotationId: AnnotationId, userId: UserId): Promise<boolean> {
    try {
      const annotation = await this.annotationRepository.findById(annotationId)
      if (!annotation) {
        return false
      }

      // Only the creator can delete their annotation
      // In a more complex system, organization admins might also be allowed
      return annotation.createdBy === userId
    } catch (error) {
      return false
    }
  }
}