import { NextRequest, NextResponse } from 'next/server'
import { createTypedSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-typed'
import type { VaultAssetUpdate } from '@/types/api'

interface UpdateVaultAssetRequest {
  folderPath?: string
  displayOrder?: number
  isFeatured?: boolean
  isRequiredReading?: boolean
  visibility?: 'inherit' | 'public' | 'members' | 'admin'
  downloadPermissions?: 'inherit' | 'all' | 'members' | 'admin' | 'none'
}

// GET /api/vaults/[id]/assets/[assetId] - Get specific vault asset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const supabase = await createTypedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    const vaultId = (await params).id
    const assetId = (await params).assetId

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

    // Get vault asset details
    const { data: vaultAsset, error: assetError } = await supabase
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
      .eq('asset_id', assetId)
      .single()

    if (assetError || !vaultAsset) {
      return NextResponse.json({ error: 'Asset not found in vault' }, { status: 404 })
    }

    // Increment view count
    await supabase
      .from('vault_assets')
      .update({ 
        view_count: vaultAsset.view_count + 1 
      })
      .eq('id', vaultAsset.id)

    // Log access activity
    await supabase
      .from('vault_activity_log')
      .insert({
        vault_id: vaultId,
        organization_id: membership.organization_id,
        activity_type: 'asset_viewed',
        performed_by_user_id: user.id,
        affected_asset_id: assetId,
        activity_details: {
          asset_title: vaultAsset.asset.title,
          folder_path: vaultAsset.folder_path,
          view_method: 'api'
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    // Transform response
    const transformedAsset = {
      id: vaultAsset.id,
      folderPath: vaultAsset.folder_path,
      displayOrder: vaultAsset.display_order,
      isFeatured: vaultAsset.is_featured,
      isRequiredReading: vaultAsset.is_required_reading,
      addedAt: vaultAsset.added_at,
      viewCount: vaultAsset.view_count + 1, // Include the increment
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
    }

    return NextResponse.json({
      success: true,
      asset: transformedAsset
    })

  } catch (error) {
    console.error('Vault asset details API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/vaults/[id]/assets/[assetId] - Update vault asset settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
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

    const vaultId = (await params).id
    const assetId = (await params).assetId
    const updates: UpdateVaultAssetRequest = await request.json()

    // Check vault access and permissions
    const { data: membership, error: membershipError } = await (supabase as any)
      .from('vault_members')
      .select('id, role, status, organization_id')
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only contributors and above can update asset settings
    if (!['owner', 'admin', 'moderator', 'contributor'].includes((membership as any).role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to update vault asset settings' 
      }, { status: 403 })
    }

    // Check if vault asset exists
    const { data: existingAsset, error: existingError } = await (supabase as any)
      .from('vault_assets')
      .select('id, asset_id, folder_path, display_order, is_featured, is_required_reading')
      .eq('vault_id', vaultId)
      .eq('asset_id', assetId)
      .single()

    if (existingError || !existingAsset) {
      return NextResponse.json({ error: 'Asset not found in vault' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}
    if (updates.folderPath !== undefined) updateData.folder_path = updates.folderPath
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder
    if (updates.isFeatured !== undefined) updateData.is_featured = updates.isFeatured
    if (updates.isRequiredReading !== undefined) updateData.is_required_reading = updates.isRequiredReading
    if (updates.visibility !== undefined) updateData.visibility = updates.visibility
    if (updates.downloadPermissions !== undefined) updateData.download_permissions = updates.downloadPermissions

    // Only update if there are actual changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        message: 'No changes provided',
        success: true
      })
    }

    // Update vault asset
    const { data: updatedAsset, error: updateError } = await (supabase as any)
      .from('vault_assets')
      .update(updateData)
      .eq('id', existingAsset.id)
      .select(`
        id, folder_path, display_order, is_featured, is_required_reading,
        visibility, download_permissions,
        asset:assets!inner(id, title, file_name)
      `)
      .single()

    if (updateError) {
      console.error('Vault asset update error:', updateError)
      return NextResponse.json({ error: 'Failed to update vault asset' }, { status: 500 })
    }

    // Log activity
    await (supabase as any)
      .from('vault_activity_log')
      .insert({
        vault_id: vaultId,
        organization_id: (membership as any).organization_id,
        activity_type: 'asset_updated',
        performed_by_user_id: user.id,
        affected_asset_id: assetId,
        activity_details: {
          asset_title: (updatedAsset as any).asset.title,
          updated_fields: Object.keys(updates),
          previous_values: {
            folder_path: existingAsset.folder_path,
            display_order: existingAsset.display_order,
            is_featured: existingAsset.is_featured,
            is_required_reading: existingAsset.is_required_reading
          },
          new_values: updateData
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      success: true,
      message: 'Vault asset updated successfully',
      asset: {
        id: updatedAsset.id,
        folderPath: updatedAsset.folder_path,
        displayOrder: updatedAsset.display_order,
        isFeatured: updatedAsset.is_featured,
        isRequiredReading: updatedAsset.is_required_reading,
        visibility: updatedAsset.visibility,
        downloadPermissions: updatedAsset.download_permissions,
        asset: updatedAsset.asset
      }
    })

  } catch (error) {
    console.error('Update vault asset API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/vaults/[id]/assets/[assetId] - Remove asset from vault
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
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

    const vaultId = (await params).id
    const assetId = (await params).assetId

    // Check vault access and permissions
    const { data: membership, error: membershipError } = await (supabase as any)
      .from('vault_members')
      .select('id, role, status, organization_id')
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only moderators and above can remove assets from vaults
    if (!['owner', 'admin', 'moderator'].includes((membership as any).role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to remove assets from vault' 
      }, { status: 403 })
    }

    // Get asset details before deletion for logging
    const { data: vaultAsset, error: assetError } = await (supabase as any)
      .from('vault_assets')
      .select(`
        id, folder_path, 
        asset:assets!inner(id, title, file_name)
      `)
      .eq('vault_id', vaultId)
      .eq('asset_id', assetId)
      .single()

    if (assetError || !vaultAsset) {
      return NextResponse.json({ error: 'Asset not found in vault' }, { status: 404 })
    }

    // Remove asset from vault
    const { error: deleteError } = await (supabase as any)
      .from('vault_assets')
      .delete()
      .eq('id', (vaultAsset as any).id)

    if (deleteError) {
      console.error('Vault asset deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove asset from vault' }, { status: 500 })
    }

    // Log activity
    await (supabase as any)
      .from('vault_activity_log')
      .insert({
        vault_id: vaultId,
        organization_id: (membership as any).organization_id,
        activity_type: 'asset_removed',
        performed_by_user_id: user.id,
        affected_asset_id: assetId,
        activity_details: {
          asset_title: (vaultAsset as any).asset.title,
          asset_file_name: (vaultAsset as any).asset.file_name,
          folder_path: (vaultAsset as any).folder_path,
          removal_reason: 'manual_removal'
        },
        risk_level: 'low',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      success: true,
      message: 'Asset removed from vault successfully'
    })

  } catch (error) {
    console.error('Remove vault asset API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}