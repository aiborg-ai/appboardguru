/**
 * Asset Annotation Repository
 * Data access layer for annotation operations following Repository Pattern
 */

import { BaseRepository } from './base.repository'
import { Result } from '@/lib/result/types'
import { 
  AssetAnnotation, 
  AnnotationId, 
  AssetId, 
  UserId, 
  OrganizationId,
  CreateAnnotationRequest,
  UpdateAnnotationRequest,
  AnnotationQueryCriteria,
  AnnotationReply
} from '@/types/annotation-types'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface IAnnotationRepository {
  findById(id: AnnotationId): Promise<Result<AssetAnnotation | null>>
  findByAssetId(assetId: AssetId, criteria?: Partial<AnnotationQueryCriteria>): Promise<Result<AssetAnnotation[]>>
  findByPageNumber(assetId: AssetId, pageNumber: number): Promise<Result<AssetAnnotation[]>>
  create(data: CreateAnnotationRequest, assetId: AssetId, userId: UserId, organizationId: OrganizationId): Promise<Result<AssetAnnotation>>
  update(id: AnnotationId, data: UpdateAnnotationRequest): Promise<Result<AssetAnnotation>>
  softDelete(id: AnnotationId, deletedBy: UserId): Promise<Result<void>>
  hardDelete(id: AnnotationId): Promise<Result<void>>
  count(criteria: AnnotationQueryCriteria): Promise<Result<number>>
  findReplies(annotationId: AnnotationId): Promise<Result<AnnotationReply[]>>
  createReply(annotationId: AnnotationId, replyText: string, userId: UserId): Promise<Result<AnnotationReply>>
  updateReply(replyId: string, replyText: string, userId: UserId): Promise<Result<AnnotationReply>>
  deleteReply(replyId: string): Promise<Result<void>>
}

export class AnnotationRepository extends BaseRepository implements IAnnotationRepository {
  private readonly tableName = 'asset_annotations'
  private readonly repliesTableName = 'annotation_replies'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  async findById(id: AnnotationId): Promise<Result<AssetAnnotation | null>> {
    return this.executeQuery(
      () => {
        const query = this.queryBuilder()
          .from(this.tableName)
          .select(`
            *,
            users!created_by (
              id,
              full_name,
              avatar_url
            ),
            annotation_replies (
              id,
              reply_text,
              created_by,
              created_at,
              updated_at,
              is_edited,
              edited_at,
              users!created_by (
                id,
                full_name,
                avatar_url
              )
            )
          `)
          .eq('id', id)
          .eq('is_deleted', false)
          .single()

        return query
      },
      (data) => data ? this.transformToAnnotation(data) : null
    )
  }

  async findByAssetId(
    assetId: AssetId, 
    criteria?: Partial<AnnotationQueryCriteria>
  ): Promise<Result<AssetAnnotation[]>> {
    return this.executeQuery(
      () => {
        let query = this.queryBuilder()
          .from(this.tableName)
          .select(`
            *,
            users!created_by (
              id,
              full_name,
              avatar_url
            ),
            annotation_replies (
              id,
              reply_text,
              created_by,
              created_at,
              updated_at,
              is_edited,
              edited_at,
              users!created_by (
                id,
                full_name,
                avatar_url
              )
            )
          `)
          .eq('asset_id', assetId)
          .eq('is_deleted', false)

        // Apply filtering criteria
        if (criteria?.pageNumber) {
          query = query.eq('page_number', criteria.pageNumber)
        }
        if (criteria?.annotationType) {
          query = query.eq('annotation_type', criteria.annotationType)
        }
        if (criteria?.isPrivate !== undefined) {
          query = query.eq('is_private', criteria.isPrivate)
        }
        if (criteria?.isResolved !== undefined) {
          query = query.eq('is_resolved', criteria.isResolved)
        }
        if (criteria?.createdBy) {
          query = query.eq('created_by', criteria.createdBy)
        }

        // Apply pagination
        if (criteria?.limit) {
          query = query.limit(criteria.limit)
        }
        if (criteria?.offset) {
          query = query.range(criteria.offset, criteria.offset + (criteria.limit || 50) - 1)
        }

        // Order by creation date (newest first)
        query = query.order('created_at', { ascending: false })

        return query
      },
      (data) => data.map(this.transformToAnnotation.bind(this))
    )
  }

  async findByPageNumber(assetId: AssetId, pageNumber: number): Promise<Result<AssetAnnotation[]>> {
    return this.findByAssetId(assetId, { pageNumber })
  }

  async create(
    data: CreateAnnotationRequest, 
    assetId: AssetId, 
    userId: UserId, 
    organizationId: OrganizationId
  ): Promise<Result<AssetAnnotation>> {
    return this.executeQuery(
      () => {
        const insertData = {
          asset_id: assetId,
          organization_id: organizationId,
          created_by: userId,
          annotation_type: data.annotationType,
          content: data.content,
          page_number: data.pageNumber,
          position: data.position,
          selected_text: data.selectedText,
          comment_text: data.commentText,
          color: data.color || '#FFFF00',
          opacity: data.opacity ?? 0.3,
          is_private: data.isPrivate ?? false,
          is_resolved: false,
          is_deleted: false,
          created_at: new Date().toISOString()
        }

        return this.queryBuilder()
          .from(this.tableName)
          .insert(insertData)
          .select(`
            *,
            users!created_by (
              id,
              full_name,
              avatar_url
            )
          `)
          .single()
      },
      (data) => this.transformToAnnotation(data)
    )
  }

  async update(id: AnnotationId, data: UpdateAnnotationRequest): Promise<Result<AssetAnnotation>> {
    return this.executeQuery(
      () => {
        const updateData = {
          comment_text: data.commentText,
          color: data.color,
          opacity: data.opacity,
          is_private: data.isPrivate,
          is_resolved: data.isResolved,
          updated_at: new Date().toISOString()
        }

        return this.queryBuilder()
          .from(this.tableName)
          .update(updateData)
          .eq('id', id)
          .eq('is_deleted', false)
          .select(`
            *,
            users!created_by (
              id,
              full_name,
              avatar_url
            ),
            annotation_replies (
              id,
              reply_text,
              created_by,
              created_at,
              updated_at,
              is_edited,
              edited_at,
              users!created_by (
                id,
                full_name,
                avatar_url
              )
            )
          `)
          .single()
      },
      (data) => this.transformToAnnotation(data)
    )
  }

  async softDelete(id: AnnotationId, deletedBy: UserId): Promise<Result<void>> {
    return this.executeQuery(
      () => {
        return this.queryBuilder()
          .from(this.tableName)
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            deleted_by: deletedBy
          })
          .eq('id', id)
      },
      () => undefined
    )
  }

  async hardDelete(id: AnnotationId): Promise<Result<void>> {
    return this.executeQuery(
      () => {
        return this.queryBuilder()
          .from(this.tableName)
          .delete()
          .eq('id', id)
      },
      () => undefined
    )
  }

  async count(criteria: AnnotationQueryCriteria): Promise<Result<number>> {
    return this.executeQuery(
      () => {
        let query = this.queryBuilder()
          .from(this.tableName)
          .select('id', { count: 'exact', head: true })
          .eq('asset_id', criteria.assetId)
          .eq('is_deleted', false)

        if (criteria.pageNumber) {
          query = query.eq('page_number', criteria.pageNumber)
        }
        if (criteria.annotationType) {
          query = query.eq('annotation_type', criteria.annotationType)
        }
        if (criteria.isPrivate !== undefined) {
          query = query.eq('is_private', criteria.isPrivate)
        }
        if (criteria.createdBy) {
          query = query.eq('created_by', criteria.createdBy)
        }

        return query
      },
      (_, count) => count || 0
    )
  }

  async findReplies(annotationId: AnnotationId): Promise<Result<AnnotationReply[]>> {
    return this.executeQuery(
      () => {
        return this.queryBuilder()
          .from(this.repliesTableName)
          .select(`
            *,
            users!created_by (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('annotation_id', annotationId)
          .order('created_at', { ascending: true })
      },
      (data) => data.map(this.transformToReply.bind(this))
    )
  }

  async createReply(annotationId: AnnotationId, replyText: string, userId: UserId): Promise<Result<AnnotationReply>> {
    return this.executeQuery(
      () => {
        const insertData = {
          annotation_id: annotationId,
          reply_text: replyText,
          created_by: userId,
          created_at: new Date().toISOString(),
          is_edited: false
        }

        return this.queryBuilder()
          .from(this.repliesTableName)
          .insert(insertData)
          .select(`
            *,
            users!created_by (
              id,
              full_name,
              avatar_url
            )
          `)
          .single()
      },
      (data) => this.transformToReply(data)
    )
  }

  async updateReply(replyId: string, replyText: string, userId: UserId): Promise<Result<AnnotationReply>> {
    return this.executeQuery(
      () => {
        const updateData = {
          reply_text: replyText,
          updated_at: new Date().toISOString(),
          is_edited: true,
          edited_at: new Date().toISOString()
        }

        return this.queryBuilder()
          .from(this.repliesTableName)
          .update(updateData)
          .eq('id', replyId)
          .eq('created_by', userId) // Only allow creator to edit
          .select(`
            *,
            users!created_by (
              id,
              full_name,
              avatar_url
            )
          `)
          .single()
      },
      (data) => this.transformToReply(data)
    )
  }

  async deleteReply(replyId: string): Promise<Result<void>> {
    return this.executeQuery(
      () => {
        return this.queryBuilder()
          .from(this.repliesTableName)
          .delete()
          .eq('id', replyId)
      },
      () => undefined
    )
  }

  private transformToAnnotation(data: any): AssetAnnotation {
    return {
      id: data.id as AnnotationId,
      assetId: data.asset_id as AssetId,
      organizationId: data.organization_id as OrganizationId,
      createdBy: data.created_by as UserId,
      annotationType: data.annotation_type,
      content: data.content || { text: data.comment_text },
      pageNumber: data.page_number,
      position: data.position || {},
      selectedText: data.selected_text,
      commentText: data.comment_text,
      color: data.color || '#FFFF00',
      opacity: data.opacity || 0.3,
      isPrivate: data.is_private || false,
      isResolved: data.is_resolved || false,
      isDeleted: data.is_deleted || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
      deletedBy: data.deleted_by as UserId | undefined,
      user: {
        id: data.users?.id as UserId,
        fullName: data.users?.full_name || 'Unknown User',
        avatarUrl: data.users?.avatar_url
      },
      replies: (data.annotation_replies || []).map(this.transformToReply.bind(this)),
      repliesCount: (data.annotation_replies || []).length
    }
  }

  private transformToReply(data: any): AnnotationReply {
    return {
      id: data.id,
      replyText: data.reply_text,
      createdBy: data.created_by as UserId,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isEdited: data.is_edited || false,
      editedAt: data.edited_at,
      user: {
        id: data.users?.id as UserId,
        fullName: data.users?.full_name || 'Unknown User',
        avatarUrl: data.users?.avatar_url
      }
    }
  }
}