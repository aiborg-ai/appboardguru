/**
 * Asset Annotation Repository
 * Data access layer for annotation operations following Repository Pattern
 */

import { BaseRepository } from './base.repository'
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
  findById(id: AnnotationId): Promise<AssetAnnotation | null>
  findByAssetId(assetId: AssetId, criteria?: Partial<AnnotationQueryCriteria>): Promise<AssetAnnotation[]>
  findByPageNumber(assetId: AssetId, pageNumber: number): Promise<AssetAnnotation[]>
  create(data: CreateAnnotationRequest, assetId: AssetId, userId: UserId, organizationId: OrganizationId): Promise<AssetAnnotation>
  update(id: AnnotationId, data: UpdateAnnotationRequest): Promise<AssetAnnotation>
  softDelete(id: AnnotationId, deletedBy: UserId): Promise<void>
  hardDelete(id: AnnotationId): Promise<void>
  count(criteria: AnnotationQueryCriteria): Promise<number>
  findReplies(annotationId: AnnotationId): Promise<AnnotationReply[]>
  createReply(annotationId: AnnotationId, replyText: string, userId: UserId): Promise<AnnotationReply>
  updateReply(replyId: string, replyText: string, userId: UserId): Promise<AnnotationReply>
  deleteReply(replyId: string): Promise<void>
}

export class AnnotationRepository extends BaseRepository implements IAnnotationRepository {
  private readonly tableName = 'asset_annotations'
  private readonly repliesTableName = 'annotation_replies'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  async findById(id: AnnotationId): Promise<AssetAnnotation | null> {
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

    const result = await this.executeQuery(query, 'findById')
    if (!result.success || !result.data) {
      return null
    }

    return this.transformToAnnotation(result.data)
  }

  async findByAssetId(
    assetId: AssetId, 
    criteria?: Partial<AnnotationQueryCriteria>
  ): Promise<AssetAnnotation[]> {
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

    const result = await this.executeQuery(query, 'findByAssetId')
    if (!result.success) {
      return []
    }

    return result.data.map(this.transformToAnnotation)
  }

  async findByPageNumber(assetId: AssetId, pageNumber: number): Promise<AssetAnnotation[]> {
    return this.findByAssetId(assetId, { pageNumber })
  }

  async create(
    data: CreateAnnotationRequest, 
    assetId: AssetId, 
    userId: UserId, 
    organizationId: OrganizationId
  ): Promise<AssetAnnotation> {
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

    const query = this.queryBuilder()
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

    const result = await this.executeQuery(query, 'create')
    if (!result.success) {
      throw new Error(`Failed to create annotation: ${result.error.message}`)
    }

    return this.transformToAnnotation(result.data)
  }

  async update(id: AnnotationId, data: UpdateAnnotationRequest): Promise<AssetAnnotation> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    }

    const query = this.queryBuilder()
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

    const result = await this.executeQuery(query, 'update')
    if (!result.success) {
      throw new Error(`Failed to update annotation: ${result.error.message}`)
    }

    return this.transformToAnnotation(result.data)
  }

  async softDelete(id: AnnotationId, deletedBy: UserId): Promise<void> {
    const query = this.queryBuilder()
      .from(this.tableName)
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy
      })
      .eq('id', id)

    const result = await this.executeQuery(query, 'softDelete')
    if (!result.success) {
      throw new Error(`Failed to delete annotation: ${result.error.message}`)
    }
  }

  async hardDelete(id: AnnotationId): Promise<void> {
    const query = this.queryBuilder()
      .from(this.tableName)
      .delete()
      .eq('id', id)

    const result = await this.executeQuery(query, 'hardDelete')
    if (!result.success) {
      throw new Error(`Failed to permanently delete annotation: ${result.error.message}`)
    }
  }

  async count(criteria: AnnotationQueryCriteria): Promise<number> {
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

    const result = await this.executeQuery(query, 'count')
    return result.success ? (result.count || 0) : 0
  }

  async findReplies(annotationId: AnnotationId): Promise<AnnotationReply[]> {
    const query = this.queryBuilder()
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

    const result = await this.executeQuery(query, 'findReplies')
    if (!result.success) {
      return []
    }

    return result.data.map(this.transformToReply)
  }

  async createReply(annotationId: AnnotationId, replyText: string, userId: UserId): Promise<AnnotationReply> {
    const insertData = {
      annotation_id: annotationId,
      reply_text: replyText,
      created_by: userId,
      created_at: new Date().toISOString(),
      is_edited: false
    }

    const query = this.queryBuilder()
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

    const result = await this.executeQuery(query, 'createReply')
    if (!result.success) {
      throw new Error(`Failed to create reply: ${result.error.message}`)
    }

    return this.transformToReply(result.data)
  }

  async updateReply(replyId: string, replyText: string, userId: UserId): Promise<AnnotationReply> {
    const updateData = {
      reply_text: replyText,
      updated_at: new Date().toISOString(),
      is_edited: true,
      edited_at: new Date().toISOString()
    }

    const query = this.queryBuilder()
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

    const result = await this.executeQuery(query, 'updateReply')
    if (!result.success) {
      throw new Error(`Failed to update reply: ${result.error.message}`)
    }

    return this.transformToReply(result.data)
  }

  async deleteReply(replyId: string): Promise<void> {
    const query = this.queryBuilder()
      .from(this.repliesTableName)
      .delete()
      .eq('id', replyId)

    const result = await this.executeQuery(query, 'deleteReply')
    if (!result.success) {
      throw new Error(`Failed to delete reply: ${result.error.message}`)
    }
  }

  private transformToAnnotation(data: any): AssetAnnotation {
    return {
      id: data.id as AnnotationId,
      assetId: data.asset_id as AssetId,
      organizationId: data.organization_id as OrganizationId,
      createdBy: data.created_by as UserId,
      annotationType: data.annotation_type,
      content: data.content,
      pageNumber: data.page_number,
      position: data.position,
      selectedText: data.selected_text,
      commentText: data.comment_text,
      color: data.color,
      opacity: data.opacity,
      isPrivate: data.is_private,
      isResolved: data.is_resolved,
      isDeleted: data.is_deleted,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
      deletedBy: data.deleted_by as UserId | undefined,
      user: {
        id: data.users?.id as UserId,
        fullName: data.users?.full_name || 'Unknown User',
        avatarUrl: data.users?.avatar_url
      },
      replies: (data.annotation_replies || []).map(this.transformToReply),
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
      isEdited: data.is_edited,
      editedAt: data.edited_at,
      user: {
        id: data.users?.id as UserId,
        fullName: data.users?.full_name || 'Unknown User',
        avatarUrl: data.users?.avatar_url
      }
    }
  }
}