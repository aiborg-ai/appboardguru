/**
 * AssetController
 * Consolidates asset management routes
 * Replaces: assets/*, assets/[id]/*, assets/upload, assets/search, assets/enhanced-example
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { EnhancedHandlers } from '@/lib/middleware/apiHandler'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logAssetActivity, getRequestContext } from '@/lib/services/activity-logger'

// Constants
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = [
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/markdown',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv',
  'audio/mpeg', 'audio/wav', 'audio/mp4',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
]

// Validation schemas
const AssetListFiltersSchema = z.object({
  category: z.string().optional(),
  folder: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['name', 'size', 'type', 'updated_at']).default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  organizationId: z.string().uuid().optional(),
  vaultId: z.string().uuid().optional(),
  sharedOnly: z.boolean().default(false)
})

const CreateAssetSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
  fileName: z.string().min(1, 'File name is required'),
  filePath: z.string().min(1, 'File path is required'),
  fileSize: z.number().int().min(1, 'File size must be greater than 0'),
  fileType: z.string().min(1, 'File type is required'),
  category: z.string().default('general'),
  folderPath: z.string().default('/'),
  tags: z.array(z.string()).default([]),
  vaultId: z.string().uuid().optional(),
  visibility: z.enum(['private', 'organization', 'public']).default('private')
})

const UpdateAssetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().optional(),
  folderPath: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['private', 'organization', 'public']).optional()
})

const ShareAssetSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least one user ID is required'),
  permission: z.enum(['view', 'download', 'edit', 'admin']),
  message: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  notifyUsers: z.boolean().default(true)
})

const AssetSearchSchema = z.object({
  q: z.string().default(''),
  limit: z.number().int().min(1).max(100).default(50),
  organizationId: z.string().uuid().optional(),
  vaultId: z.string().uuid().optional(),
  fileTypes: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
})

// Helper function to create Supabase client
async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

// Helper function to get file extension
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

// Helper function to check asset access
async function checkAssetAccess(
  supabase: any, 
  assetId: string, 
  userId: string, 
  requiredPermission: 'view' | 'edit' | 'admin' = 'view'
): Promise<{ hasAccess: boolean; asset?: any; isOwner?: boolean }> {
  const { data: asset, error } = await supabase
    .from('assets')
    .select(`
      *,
      asset_shares(shared_with_user_id, permission_level, is_active, expires_at)
    `)
    .eq('id', assetId)
    .eq('is_deleted', false)
    .single()

  if (error || !asset) {
    return { hasAccess: false }
  }

  const isOwner = asset.owner_id === userId
  if (isOwner) {
    return { hasAccess: true, asset, isOwner: true }
  }

  // Check shared access
  const hasSharedAccess = asset.asset_shares?.some((share: any) => {
    if (share.shared_with_user_id !== userId || !share.is_active) return false
    if (share.expires_at && new Date(share.expires_at) <= new Date()) return false
    
    const permissionHierarchy = { view: 1, download: 2, edit: 3, admin: 4 }
    return permissionHierarchy[share.permission_level] >= permissionHierarchy[requiredPermission]
  })

  return { hasAccess: hasSharedAccess, asset, isOwner: false }
}

/**
 * GET /api/assets
 * List assets with filtering, searching, and pagination
 */
export const listAssets = EnhancedHandlers.get(
  {
    validation: { query: AssetListFiltersSchema },
    rateLimit: { requests: 100, window: '1m' },
    cache: { ttl: 180 }, // 3 minutes cache
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const filters = req.validatedQuery!
    
    // Build base query
    let query = supabase
      .from('assets')
      .select(`
        *,
        owner:users!assets_owner_id_fkey(id, name, email),
        asset_shares(
          id, shared_with_user_id, permission_level, 
          is_active, expires_at, created_at,
          users!asset_shares_shared_with_user_id_fkey(id, name, email)
        ),
        vault:vaults(id, name, organization_id)
      `)
      .eq('is_deleted', false)

    // Filter by user access
    if (filters.sharedOnly) {
      query = query.neq('owner_id', req.user!.id)
        .eq('asset_shares.shared_with_user_id', req.user!.id)
        .eq('asset_shares.is_active', true)
    } else {
      query = query.or(`owner_id.eq.${req.user!.id},asset_shares.shared_with_user_id.eq.${req.user!.id}`)
    }

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }
    if (filters.folder && filters.folder !== 'all') {
      query = query.eq('folder_path', filters.folder)
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,file_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }
    if (filters.vaultId) {
      query = query.eq('vault_id', filters.vaultId)
    }

    // Apply sorting
    const ascending = filters.sortOrder === 'asc'
    switch (filters.sortBy) {
      case 'name':
        query = query.order('title', { ascending })
        break
      case 'size':
        query = query.order('file_size', { ascending })
        break
      case 'type':
        query = query.order('file_type', { ascending })
        break
      default:
        query = query.order('updated_at', { ascending })
    }

    // Apply pagination
    const offset = (filters.page - 1) * filters.limit
    query = query.range(offset, offset + filters.limit - 1)

    const { data: assets, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch assets: ${error.message}`)
    }

    // Transform data
    const transformedAssets = assets?.map(asset => ({
      ...asset,
      isOwner: asset.owner_id === req.user!.id,
      sharedWith: asset.asset_shares?.filter((share: any) => share.is_active && (!share.expires_at || new Date(share.expires_at) > new Date())).map((share: any) => ({
        id: share.id,
        userId: share.shared_with_user_id,
        userName: share.users?.name || '',
        userEmail: share.users?.email || '',
        permission: share.permission_level,
        sharedAt: share.created_at
      })) || [],
      isShared: asset.asset_shares?.some((share: any) => share.is_active && share.shared_with_user_id !== asset.owner_id) || false
    }))

    return {
      assets: transformedAssets,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit)
      }
    }
  }
)

/**
 * POST /api/assets
 * Create new asset record (after file upload)
 */
export const createAsset = EnhancedHandlers.post(
  CreateAssetSchema,
  {
    rateLimit: { requests: 20, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const assetData = req.validatedBody!

    // Create asset record
    const { data: asset, error } = await supabase
      .from('assets')
      .insert({
        owner_id: req.user!.id,
        title: assetData.title,
        description: assetData.description,
        file_name: assetData.fileName,
        original_file_name: assetData.fileName,
        file_path: assetData.filePath,
        file_size: assetData.fileSize,
        file_type: getFileExtension(assetData.fileName),
        mime_type: assetData.fileType,
        storage_bucket: 'assets',
        category: assetData.category,
        folder_path: assetData.folderPath,
        tags: assetData.tags,
        vault_id: assetData.vaultId,
        visibility: assetData.visibility,
        is_processed: true,
        processing_status: 'completed'
      })
      .select(`
        *,
        owner:users!assets_owner_id_fkey(id, name, email)
      `)
      .single()

    if (error) {
      throw new Error(`Failed to create asset: ${error.message}`)
    }

    // Log activity
    await logAssetActivity(
      req.user!.id,
      asset.organization_id || '',
      'created',
      asset.id,
      asset.title,
      {
        ...getRequestContext(req.request as NextRequest),
        file_size: assetData.fileSize,
        file_type: assetData.fileType,
        category: assetData.category
      }
    )

    return {
      asset: {
        ...asset,
        isOwner: true,
        sharedWith: [],
        isShared: false
      }
    }
  }
)

/**
 * GET /api/assets/[id]
 * Get specific asset details
 */
export const getAsset = EnhancedHandlers.get(
  {
    rateLimit: { requests: 200, window: '1m' },
    cache: { ttl: 300 },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const assetId = searchParams.get('id')

    if (!assetId) {
      throw new Error('Asset ID is required')
    }

    const { hasAccess, asset, isOwner } = await checkAssetAccess(supabase, assetId, req.user!.id, 'view')
    
    if (!hasAccess || !asset) {
      throw new Error('Asset not found or access denied')
    }

    // Get detailed asset information
    const { data: detailedAsset, error } = await supabase
      .from('assets')
      .select(`
        *,
        owner:users!assets_owner_id_fkey(id, name, email),
        asset_shares(
          id, shared_with_user_id, permission_level, share_message,
          expires_at, is_active, created_at,
          users!asset_shares_shared_with_user_id_fkey(id, name, email)
        ),
        asset_comments(
          id, comment_text, created_at,
          user:users!asset_comments_user_id_fkey(id, name, email)
        ),
        vault:vaults(id, name)
      `)
      .eq('id', assetId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch asset details: ${error.message}`)
    }

    // Increment view count
    await supabase
      .from('assets')
      .update({ view_count: (detailedAsset.view_count || 0) + 1 })
      .eq('id', assetId)

    // Log view activity
    await logAssetActivity(
      req.user!.id,
      detailedAsset.organization_id || '',
      'viewed',
      assetId,
      detailedAsset.title,
      {
        ...getRequestContext(req.request as NextRequest),
        view_count: (detailedAsset.view_count || 0) + 1
      }
    )

    // Transform response
    return {
      asset: {
        ...detailedAsset,
        isOwner,
        sharedWith: detailedAsset.asset_shares?.filter((share: any) => 
          share.is_active && (!share.expires_at || new Date(share.expires_at) > new Date())
        ).map((share: any) => ({
          id: share.id,
          userId: share.shared_with_user_id,
          userName: share.users?.name || '',
          userEmail: share.users?.email || '',
          permission: share.permission_level,
          message: share.share_message,
          expiresAt: share.expires_at,
          sharedAt: share.created_at
        })) || [],
        comments: detailedAsset.asset_comments?.map((comment: any) => ({
          id: comment.id,
          text: comment.comment_text,
          createdAt: comment.created_at,
          user: comment.user
        })) || []
      }
    }
  }
)

/**
 * PUT /api/assets/[id]
 * Update asset metadata
 */
export const updateAsset = EnhancedHandlers.put(
  UpdateAssetSchema,
  {
    rateLimit: { requests: 50, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const assetId = searchParams.get('id')

    if (!assetId) {
      throw new Error('Asset ID is required')
    }

    const { hasAccess, asset } = await checkAssetAccess(supabase, assetId, req.user!.id, 'edit')
    
    if (!hasAccess || !asset) {
      throw new Error('Asset not found or insufficient permissions')
    }

    const updateData = req.validatedBody!
    const { data: updatedAsset, error } = await supabase
      .from('assets')
      .update(updateData)
      .eq('id', assetId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update asset: ${error.message}`)
    }

    // Log activity
    await logAssetActivity(
      req.user!.id,
      updatedAsset.organization_id || '',
      'updated',
      assetId,
      updatedAsset.title,
      {
        ...getRequestContext(req.request as NextRequest),
        changes: updateData
      }
    )

    return { asset: updatedAsset }
  }
)

/**
 * DELETE /api/assets/[id]
 * Soft delete asset
 */
export const deleteAsset = EnhancedHandlers.delete(
  {
    rateLimit: { requests: 20, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const assetId = searchParams.get('id')

    if (!assetId) {
      throw new Error('Asset ID is required')
    }

    const { hasAccess, asset, isOwner } = await checkAssetAccess(supabase, assetId, req.user!.id, 'admin')
    
    if (!hasAccess || !asset || !isOwner) {
      throw new Error('Asset not found or only owner can delete')
    }

    // Soft delete
    const { error } = await supabase
      .from('assets')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: req.user!.id
      })
      .eq('id', assetId)

    if (error) {
      throw new Error(`Failed to delete asset: ${error.message}`)
    }

    // Log activity
    await logAssetActivity(
      req.user!.id,
      asset.organization_id || '',
      'deleted',
      assetId,
      asset.title,
      getRequestContext(req.request as NextRequest)
    )

    return { 
      message: 'Asset deleted successfully',
      assetId
    }
  }
)

/**
 * POST /api/assets/[id]/share
 * Share asset with users
 */
export const shareAsset = EnhancedHandlers.post(
  ShareAssetSchema,
  {
    rateLimit: { requests: 30, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(req.url)
    const assetId = searchParams.get('id')

    if (!assetId) {
      throw new Error('Asset ID is required')
    }

    const { hasAccess, asset, isOwner } = await checkAssetAccess(supabase, assetId, req.user!.id, 'admin')
    
    if (!hasAccess || !asset || (!isOwner && !hasAccess)) {
      throw new Error('Asset not found or insufficient permissions to share')
    }

    const shareData = req.validatedBody!

    // Validate target users exist
    const { data: targetUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', shareData.userIds)

    if (usersError || targetUsers.length !== shareData.userIds.length) {
      throw new Error('Some target users do not exist')
    }

    // Create sharing records
    const sharingRecords = shareData.userIds.map(userId => ({
      asset_id: assetId,
      shared_by_user_id: req.user!.id,
      shared_with_user_id: userId,
      permission_level: shareData.permission,
      share_message: shareData.message,
      expires_at: shareData.expiresAt,
      is_active: true
    }))

    const { data: shares, error: shareError } = await supabase
      .from('asset_shares')
      .upsert(sharingRecords, { onConflict: 'asset_id,shared_with_user_id' })
      .select(`
        *,
        users!asset_shares_shared_with_user_id_fkey(id, name, email)
      `)

    if (shareError) {
      throw new Error(`Failed to share asset: ${shareError.message}`)
    }

    // Log activity
    await logAssetActivity(
      req.user!.id,
      asset.organization_id || '',
      'shared',
      assetId,
      asset.title,
      {
        ...getRequestContext(req.request as NextRequest),
        shared_with_count: shareData.userIds.length,
        permission_level: shareData.permission
      }
    )

    return {
      shares: shares?.map((share: any) => ({
        id: share.id,
        userId: share.shared_with_user_id,
        userName: share.users?.name || '',
        userEmail: share.users?.email || '',
        permission: share.permission_level,
        message: share.share_message,
        expiresAt: share.expires_at,
        createdAt: share.created_at
      })) || [],
      message: `Asset shared with ${shareData.userIds.length} user${shareData.userIds.length > 1 ? 's' : ''}`
    }
  }
)

/**
 * GET /api/assets/search
 * Advanced asset search
 */
export const searchAssets = EnhancedHandlers.get(
  {
    validation: { query: AssetSearchSchema },
    rateLimit: { requests: 100, window: '1m' },
    cache: { ttl: 120 },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseClient()
    const searchParams = req.validatedQuery!

    let query = supabase
      .from('assets')
      .select(`
        id, title, file_name, file_type, file_size, description,
        created_at, updated_at, category, tags,
        owner:users!assets_owner_id_fkey(id, name, email),
        vault:vaults(id, name, organization:organizations(id, name))
      `)
      .eq('is_deleted', false)
      .limit(searchParams.limit)
      .order('updated_at', { ascending: false })

    // Add text search
    if (searchParams.q.trim()) {
      query = query.or(`title.ilike.%${searchParams.q}%,file_name.ilike.%${searchParams.q}%,description.ilike.%${searchParams.q}%`)
    }

    // Add filters
    if (searchParams.organizationId) {
      query = query.eq('organization_id', searchParams.organizationId)
    }
    if (searchParams.vaultId) {
      query = query.eq('vault_id', searchParams.vaultId)
    }
    if (searchParams.fileTypes?.length) {
      query = query.in('file_type', searchParams.fileTypes)
    }
    if (searchParams.categories?.length) {
      query = query.in('category', searchParams.categories)
    }
    if (searchParams.dateFrom) {
      query = query.gte('created_at', searchParams.dateFrom)
    }
    if (searchParams.dateTo) {
      query = query.lte('created_at', searchParams.dateTo)
    }

    // Filter by user access
    query = query.or(`owner_id.eq.${req.user!.id},asset_shares.shared_with_user_id.eq.${req.user!.id}`)

    const { data: assets, error } = await query

    if (error) {
      throw new Error(`Search failed: ${error.message}`)
    }

    return {
      assets: assets?.map((asset: any) => ({
        ...asset,
        isOwner: asset.owner_id === req.user!.id,
        fileName: asset.file_name,
        fileType: asset.file_type,
        fileSize: asset.file_size,
        createdAt: asset.created_at,
        updatedAt: asset.updated_at
      })) || [],
      total: assets?.length || 0,
      query: searchParams.q
    }
  }
)

// Export all handlers with proper naming for Next.js App Router
export {
  listAssets as GET_assets,
  createAsset as POST_assets,
  getAsset as GET_asset_by_id,
  updateAsset as PUT_asset_by_id,
  deleteAsset as DELETE_asset_by_id,
  shareAsset as POST_share_asset,
  searchAssets as GET_search_assets
}