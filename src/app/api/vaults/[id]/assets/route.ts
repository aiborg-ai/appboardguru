import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface AddAssetsRequest {
  assetIds: string[]
  folderPath?: string
  displayOrder?: number
  isFeatured?: boolean
  isRequiredReading?: boolean
}

interface UpdateAssetRequest {
  folderPath?: string
  displayOrder?: number
  isFeatured?: boolean
  isRequiredReading?: boolean
  visibility?: 'inherit' | 'public' | 'members' | 'admin'
  downloadPermissions?: 'inherit' | 'all' | 'members' | 'admin' | 'none'
}

// GET /api/vaults/[id]/assets - List vault assets
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vaultId = params.id
    const { searchParams } = new URL(request.url)
    const folderPath = searchParams.get('folderPath') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    // Check vault access
    const { data: membership, error: membershipError } = await supabase
      .from('vault_members')
      .select('id, role, status')
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('vault_assets')
      .select(`
        id, folder_path, display_order, is_featured, is_required_reading,
        added_at, view_count, download_count, visibility, download_permissions,
        asset:assets!inner(
          id, title, description, file_name, original_file_name,
          file_size, file_type, mime_type, category, tags,
          thumbnail_url, created_at, updated_at,
          owner:auth.users!assets_owner_id_fkey(id, email)
        ),
        added_by:auth.users!vault_assets_added_by_user_id_fkey(
          id, email
        )
      `)
      .eq('vault_id', vaultId)

    // Filter by folder if specified
    if (folderPath) {
      query = query.eq('folder_path', folderPath)
    }

    // Apply pagination and ordering
    query = query
      .order('is_featured', { ascending: false })
      .order('is_required_reading', { ascending: false })
      .order('display_order', { ascending: true })
      .order('added_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: vaultAssets, error: assetsError, count } = await query

    if (assetsError) {
      console.error('Vault assets query error:', assetsError)
      return NextResponse.json({ error: 'Failed to fetch vault assets' }, { status: 500 })
    }

    // Transform response data
    const transformedAssets = vaultAssets?.map(vaultAsset => ({
      id: vaultAsset.id,
      folderPath: vaultAsset.folder_path,
      displayOrder: vaultAsset.display_order,
      isFeatured: vaultAsset.is_featured,
      isRequiredReading: vaultAsset.is_required_reading,
      addedAt: vaultAsset.added_at,
      viewCount: vaultAsset.view_count,
      downloadCount: vaultAsset.download_count,
      visibility: vaultAsset.visibility,
      downloadPermissions: vaultAsset.download_permissions,
      asset: {
        id: vaultAsset.asset.id,
        title: vaultAsset.asset.title,
        description: vaultAsset.asset.description,
        fileName: vaultAsset.asset.file_name,
        originalFileName: vaultAsset.asset.original_file_name,
        fileSize: vaultAsset.asset.file_size,
        fileType: vaultAsset.asset.file_type,
        mimeType: vaultAsset.asset.mime_type,
        category: vaultAsset.asset.category,
        tags: vaultAsset.asset.tags,
        thumbnailUrl: vaultAsset.asset.thumbnail_url,
        createdAt: vaultAsset.asset.created_at,
        updatedAt: vaultAsset.asset.updated_at,
        owner: vaultAsset.asset.owner
      },
      addedBy: vaultAsset.added_by
    })) || []

    // Get folder structure
    const { data: folders, error: foldersError } = await supabase
      .from('vault_assets')
      .select('folder_path')
      .eq('vault_id', vaultId)

    const uniqueFolders = [...new Set(folders?.map(f => f.folder_path) || [])]
      .filter(path => path !== '/')
      .sort()

    return NextResponse.json({
      success: true,
      assets: transformedAssets,
      folders: uniqueFolders,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    })

  } catch (error) {
    console.error('Vault assets API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/vaults/[id]/assets - Add assets to vault
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vaultId = params.id
    const body: AddAssetsRequest = await request.json()

    if (!body.assetIds || body.assetIds.length === 0) {
      return NextResponse.json({ 
        error: 'Asset IDs are required' 
      }, { status: 400 })
    }

    // Check vault access and permissions
    const { data: membership, error: membershipError } = await supabase
      .from('vault_members')
      .select(`
        id, role, status, organization_id,
        vault:vaults!inner(id, organization_id)
      `)
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only contributors and above can add assets
    if (!['owner', 'admin', 'moderator', 'contributor'].includes(membership.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to add assets to this vault' 
      }, { status: 403 })
    }

    // Verify all assets exist and user has access
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, title, file_size, organization_id')
      .in('id', body.assetIds)

    if (assetsError || !assets) {
      return NextResponse.json({ error: 'Failed to verify assets' }, { status: 500 })
    }

    if (assets.length !== body.assetIds.length) {
      return NextResponse.json({ 
        error: 'Some assets not found or not accessible' 
      }, { status: 400 })
    }

    // Check if any assets are already in the vault
    const { data: existingAssets, error: existingError } = await supabase
      .from('vault_assets')
      .select('asset_id')
      .eq('vault_id', vaultId)
      .in('asset_id', body.assetIds)

    if (existingError) {
      console.error('Existing assets check error:', existingError)
      return NextResponse.json({ error: 'Failed to check existing assets' }, { status: 500 })
    }

    const existingAssetIds = existingAssets?.map(va => va.asset_id) || []
    const newAssetIds = body.assetIds.filter(id => !existingAssetIds.includes(id))

    if (newAssetIds.length === 0) {
      return NextResponse.json({ 
        message: 'All assets are already in the vault',
        alreadyExists: true,
        existingCount: existingAssetIds.length
      })
    }

    // Prepare vault asset records
    const vaultAssetRecords = newAssetIds.map((assetId, index) => ({
      vault_id: vaultId,
      asset_id: assetId,
      organization_id: membership.organization_id,
      added_by_user_id: user.id,
      folder_path: body.folderPath || '/',
      display_order: (body.displayOrder || 0) + index,
      is_featured: body.isFeatured || false,
      is_required_reading: body.isRequiredReading || false
    }))

    // Insert vault asset records
    const { data: vaultAssets, error: insertError } = await supabase
      .from('vault_assets')
      .insert(vaultAssetRecords)
      .select(`
        id, folder_path, display_order, is_featured, is_required_reading, added_at,
        asset:assets!inner(
          id, title, file_name, file_size, file_type, mime_type
        )
      `)

    if (insertError) {
      console.error('Vault asset insertion error:', insertError)
      return NextResponse.json({ error: 'Failed to add assets to vault' }, { status: 500 })
    }

    // Log activity for each asset added
    const activityRecords = vaultAssets?.map(va => ({
      vault_id: vaultId,
      organization_id: membership.organization_id,
      activity_type: 'asset_added' as const,
      performed_by_user_id: user.id,
      affected_asset_id: va.asset.id,
      activity_details: {
        asset_title: va.asset.title,
        folder_path: va.folder_path,
        is_featured: va.is_featured,
        is_required_reading: va.is_required_reading
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent')
    })) || []

    if (activityRecords.length > 0) {
      await supabase
        .from('vault_activity_log')
        .insert(activityRecords)
    }

    return NextResponse.json({
      success: true,
      message: `${newAssetIds.length} assets added to vault`,
      addedCount: newAssetIds.length,
      skippedCount: existingAssetIds.length,
      assets: vaultAssets?.map(va => ({
        id: va.id,
        folderPath: va.folder_path,
        displayOrder: va.display_order,
        isFeatured: va.is_featured,
        isRequiredReading: va.is_required_reading,
        addedAt: va.added_at,
        asset: va.asset
      }))
    }, { status: 201 })

  } catch (error) {
    console.error('Add vault assets API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}