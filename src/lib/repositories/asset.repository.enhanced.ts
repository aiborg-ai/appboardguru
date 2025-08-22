import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  UserId, 
  OrganizationId, 
  AssetId,
  VaultId,
  QueryOptions, 
  PaginatedResult,
  EntityStatus,
  Priority,
  createUserId,
  createOrganizationId,
  createAssetId,
  createVaultId
} from './types'
import type { Database } from '../../types/database'

type Asset = Database['public']['Tables']['assets']['Row']
type AssetInsert = Database['public']['Tables']['assets']['Insert']
type AssetUpdate = Database['public']['Tables']['assets']['Update']
type AssetShare = Database['public']['Tables']['asset_shares']['Row']
type AssetAnnotation = Database['public']['Tables']['asset_annotations']['Row']

export interface AssetWithDetails extends Asset {
  uploaded_by_user?: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
  }
  vault?: {
    id: string
    name: string
    organization_id: string
  }
  organization?: {
    id: string
    name: string
    slug: string
  }
  shares?: AssetShare[]
  annotations?: AssetAnnotation[]
  access_analytics?: {
    total_views: number
    total_downloads: number
    unique_viewers: number
    last_accessed: string
  }
}

export interface AssetFilters {
  category?: string
  file_type?: string
  status?: 'processing' | 'ready' | 'failed' | 'archived'
  uploadedBy?: UserId
  organizationId?: OrganizationId
  vaultId?: VaultId
  tags?: string[]
  dateFrom?: Date
  dateTo?: Date
  fileSize?: {
    min?: number
    max?: number
  }
}

export interface AssetCreateData {
  title: string
  description?: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  mime_type?: string
  category?: string
  tags?: string[]
  organization_id?: OrganizationId
  vault_id?: VaultId
  folder_path?: string
  is_public?: boolean
  watermark_applied?: boolean
  thumbnail_url?: string
  preview_url?: string
  metadata?: Record<string, unknown>
}

export interface AssetShareData {
  asset_id: AssetId
  shared_with_user_id?: UserId
  shared_by_user_id: UserId
  permission_level: 'read' | 'write' | 'download'
  expires_at?: Date
  share_message?: string
  is_active: boolean
}

export interface AssetStats {
  totalAssets: number
  totalSize: number
  averageSize: number
  byFileType: Record<string, number>
  byCategory: Record<string, number>
  byStatus: Record<string, number>
  uploadTrend: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  topViewedAssets: Array<{
    id: string
    title: string
    views: number
    downloads: number
  }>
}

export class AssetRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'Asset'
  }

  protected getSearchFields(): string[] {
    return ['title', 'file_name', 'description', 'tags']
  }

  async findById(id: AssetId): Promise<Result<Asset>> {
    const { data, error } = await this.supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single()

    return this.createResult(data, error, 'findById')
  }

  async findWithDetails(id: AssetId): Promise<Result<AssetWithDetails>> {
    const { data, error } = await this.supabase
      .from('assets')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(
          id, full_name, email, avatar_url
        ),
        vault:vaults(
          id, name, organization_id
        ),
        organization:organizations(
          id, name, slug
        ),
        asset_shares(
          id, shared_with_user_id, permission_level, 
          expires_at, is_active, created_at
        ),
        asset_annotations(
          id, content, page_number, position,
          created_at, created_by
        )
      `)
      .eq('id', id)
      .single()

    return this.createResult(data as AssetWithDetails, error, 'findWithDetails')
  }

  async findByUser(
    userId: UserId,
    filters: AssetFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<AssetWithDetails>>> {
    let query = this.supabase
      .from('assets')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(
          id, full_name, email, avatar_url
        ),
        vault:vaults(id, name, organization_id),
        organization:organizations(id, name, slug)
      `, { count: 'exact' })
      .eq('uploaded_by', userId)

    query = this.applyFilters(query, filters)
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as AssetWithDetails[] || [], count, options, error)
  }

  async findByOrganization(
    organizationId: OrganizationId,
    userId: UserId,
    filters: AssetFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<AssetWithDetails>>> {
    // Check user has access to organization
    const permissionCheck = await this.checkOrganizationPermission(userId, organizationId)
    if (!permissionCheck.success) {
      return permissionCheck
    }

    let query = this.supabase
      .from('assets')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(
          id, full_name, email, avatar_url
        ),
        vault:vaults(id, name, organization_id),
        organization:organizations(id, name, slug)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)

    query = this.applyFilters(query, filters)
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as AssetWithDetails[] || [], count, options, error)
  }

  async findByVault(
    vaultId: VaultId,
    userId: UserId,
    filters: AssetFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<AssetWithDetails>>> {
    // TODO: Check vault access permissions

    let query = this.supabase
      .from('assets')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(
          id, full_name, email, avatar_url
        ),
        vault:vaults(id, name, organization_id),
        organization:organizations(id, name, slug)
      `, { count: 'exact' })
      .eq('vault_id', vaultId)

    query = this.applyFilters(query, filters)
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as AssetWithDetails[] || [], count, options, error)
  }

  async create(
    assetData: AssetCreateData,
    uploadedBy: UserId
  ): Promise<Result<Asset>> {
    // Validate required fields
    const validation = this.validateRequired(assetData, [
      'title', 'file_name', 'file_path', 'file_size', 'file_type'
    ])
    if (!validation.success) {
      return validation
    }

    const insertData: AssetInsert = {
      ...assetData,
      uploaded_by: uploadedBy,
      status: 'processing',
      upload_progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('assets')
      .insert(insertData)
      .select()
      .single()

    const result = this.createResult(data, error, 'create')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: uploadedBy,
        organization_id: assetData.organization_id,
        event_type: 'asset_management',
        event_category: 'asset_lifecycle',
        action: 'upload',
        resource_type: 'asset',
        resource_id: data.id,
        event_description: `Asset uploaded: ${data.title}`,
        outcome: 'success',
        severity: 'low',
        details: {
          file_type: data.file_type,
          file_size: data.file_size,
          category: data.category
        }
      })
    }

    return result
  }

  async update(
    id: AssetId,
    updates: AssetUpdate,
    updatedBy: UserId
  ): Promise<Result<Asset>> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    const result = this.createResult(data, error, 'update')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: updatedBy,
        organization_id: data.organization_id ? createOrganizationId(data.organization_id) : undefined,
        event_type: 'asset_management',
        event_category: 'asset_lifecycle',
        action: 'update',
        resource_type: 'asset',
        resource_id: data.id,
        event_description: `Asset updated: ${data.title}`,
        outcome: 'success',
        severity: 'low',
        details: Object.keys(updates)
      })
    }

    return result
  }

  async delete(id: AssetId, deletedBy: UserId): Promise<Result<void>> {
    // First get asset details for logging
    const assetResult = await this.findById(id)
    if (!assetResult.success) {
      return assetResult
    }

    const { error } = await this.supabase
      .from('assets')
      .delete()
      .eq('id', id)

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'delete'))
    }

    await this.logActivity({
      user_id: deletedBy,
      organization_id: assetResult.data.organization_id ? createOrganizationId(assetResult.data.organization_id) : undefined,
      event_type: 'asset_management',
      event_category: 'asset_lifecycle',
      action: 'delete',
      resource_type: 'asset',
      resource_id: id,
      event_description: `Asset deleted: ${assetResult.data.title}`,
      outcome: 'success',
      severity: 'medium'
    })

    return success(undefined)
  }

  async shareAsset(shareData: AssetShareData): Promise<Result<AssetShare>> {
    const insertData = {
      ...shareData,
      expires_at: shareData.expires_at?.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('asset_shares')
      .insert(insertData)
      .select()
      .single()

    const result = this.createResult(data, error, 'shareAsset')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: shareData.shared_by_user_id,
        event_type: 'asset_management',
        event_category: 'asset_sharing',
        action: 'share',
        resource_type: 'asset',
        resource_id: shareData.asset_id,
        event_description: `Asset shared with ${shareData.permission_level} permissions`,
        outcome: 'success',
        severity: 'low'
      })
    }

    return result
  }

  async getSharedAssets(
    userId: UserId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<AssetWithDetails>>> {
    let query = this.supabase
      .from('assets')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(
          id, full_name, email, avatar_url
        ),
        vault:vaults(id, name, organization_id),
        organization:organizations(id, name, slug),
        asset_shares!inner(
          id, permission_level, expires_at, is_active
        )
      `, { count: 'exact' })
      .eq('asset_shares.shared_with_user_id', userId)
      .eq('asset_shares.is_active', true)
      .or('asset_shares.expires_at.is.null,asset_shares.expires_at.gt.' + new Date().toISOString())

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as AssetWithDetails[] || [], count, options, error)
  }

  async searchAssets(
    searchTerm: string,
    userId: UserId,
    organizationId?: OrganizationId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<AssetWithDetails>>> {
    let query = this.supabase
      .from('assets')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(
          id, full_name, email, avatar_url
        ),
        vault:vaults(id, name, organization_id),
        organization:organizations(id, name, slug)
      `, { count: 'exact' })
      .or(`title.ilike.%${searchTerm}%,file_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .or(`uploaded_by.eq.${userId}` + 
           (organizationId ? `,organization_id.eq.${organizationId}` : ''))

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as AssetWithDetails[] || [], count, options, error)
  }

  async getStats(
    userId?: UserId,
    organizationId?: OrganizationId
  ): Promise<Result<AssetStats>> {
    let query = this.supabase
      .from('assets')
      .select('id, file_size, file_type, category, status, created_at')

    if (userId) {
      query = query.eq('uploaded_by', userId)
    }
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: assets, error } = await query

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'getStats'))
    }

    const stats: AssetStats = {
      totalAssets: assets?.length || 0,
      totalSize: 0,
      averageSize: 0,
      byFileType: {},
      byCategory: {},
      byStatus: {},
      uploadTrend: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0
      },
      topViewedAssets: []
    }

    if (assets) {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      let totalSize = 0

      assets.forEach(asset => {
        // Calculate totals
        totalSize += asset.file_size || 0

        // Count by file type
        stats.byFileType[asset.file_type] = (stats.byFileType[asset.file_type] || 0) + 1

        // Count by category
        const category = asset.category || 'uncategorized'
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1

        // Count by status
        stats.byStatus[asset.status] = (stats.byStatus[asset.status] || 0) + 1

        // Count upload trends
        const createdAt = new Date(asset.created_at)
        if (createdAt >= today) stats.uploadTrend.today++
        if (createdAt >= thisWeek) stats.uploadTrend.thisWeek++
        if (createdAt >= thisMonth) stats.uploadTrend.thisMonth++
      })

      stats.totalSize = totalSize
      stats.averageSize = assets.length > 0 ? totalSize / assets.length : 0
    }

    return success(stats)
  }

  async updateProcessingStatus(
    id: AssetId,
    status: 'processing' | 'ready' | 'failed',
    progress?: number,
    errorMessage?: string
  ): Promise<Result<Asset>> {
    const updateData: AssetUpdate = {
      status,
      updated_at: new Date().toISOString()
    }

    if (progress !== undefined) {
      updateData.upload_progress = progress
    }

    if (errorMessage) {
      updateData.processing_error = errorMessage
    }

    if (status === 'ready') {
      updateData.processed_at = new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    return this.createResult(data, error, 'updateProcessingStatus')
  }

  async logAccess(assetId: AssetId, userId: UserId, action: 'view' | 'download'): Promise<Result<void>> {
    const { error } = await this.supabase
      .from('asset_activity_log')
      .insert({
        asset_id: assetId,
        user_id: userId,
        activity_type: action,
        activity_details: {
          action,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'logAccess'))
    }

    return success(undefined)
  }

  private applyFilters(query: any, filters: AssetFilters): unknown {
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.file_type) {
      query = query.eq('file_type', filters.file_type)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.uploadedBy) {
      query = query.eq('uploaded_by', filters.uploadedBy)
    }
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }
    if (filters.vaultId) {
      query = query.eq('vault_id', filters.vaultId)
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString())
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString())
    }
    if (filters.fileSize?.min) {
      query = query.gte('file_size', filters.fileSize.min)
    }
    if (filters.fileSize?.max) {
      query = query.lte('file_size', filters.fileSize.max)
    }

    return query
  }
}