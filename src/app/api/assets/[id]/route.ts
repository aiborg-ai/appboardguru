import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: assetId } = await params

    // Get asset with sharing information
    const { data: asset, error } = await (supabase as any)
      .from('assets')
      .select(`
        *,
        owner:users!assets_owner_id_fkey(id, name, email),
        asset_shares(
          id,
          shared_with_user_id,
          permission_level,
          share_message,
          expires_at,
          is_active,
          created_at,
          users!asset_shares_shared_with_user_id_fkey(id, name, email)
        ),
        asset_comments(
          id,
          comment_text,
          created_at,
          user:users!asset_comments_user_id_fkey(id, name, email)
        )
      `)
      .eq('id', assetId)
      .eq('is_deleted', false)
      .single()

    if (error || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Check if user has access to this asset
    const isOwner = asset.owner_id === user.id
    const hasSharedAccess = asset.asset_shares?.some((share: any) => 
      share.shared_with_user_id === user.id && 
      share.is_active &&
      (!share.expires_at || new Date(share.expires_at) > new Date())
    )

    if (!isOwner && !hasSharedAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Increment view count
    await (supabase as any)
      .from('assets')
      .update({ view_count: (asset.view_count || 0) + 1 })
      .eq('id', assetId)

    // Log activity using comprehensive logging system
    const { logAssetActivity, getRequestContext } = await import('@/lib/services/activity-logger')
    const requestContext = getRequestContext(request)
    
    await logAssetActivity(
      user.id,
      asset.organization_id || '',
      'opened',
      assetId,
      asset.title,
      {
        ...requestContext,
        asset_type: asset.file_type,
        asset_size: asset.file_size,
        view_count: asset.view_count + 1
      }
    )

    // Transform data
    const transformedAsset = {
      ...asset,
      isOwner,
      sharedWith: asset.asset_shares?.map((share: any) => ({
        id: share.id,
        userId: share.shared_with_user_id,
        userName: share.users?.name || '',
        userEmail: share.users?.email || '',
        permission: share.permission_level,
        message: share.share_message,
        expiresAt: share.expires_at,
        isActive: share.is_active,
        sharedAt: share.created_at
      })) || [],
      comments: asset.asset_comments?.map((comment: any) => ({
        id: comment.id,
        text: comment.comment_text,
        createdAt: comment.created_at,
        user: {
          id: comment.user?.id,
          name: comment.user?.name,
          email: comment.user?.email
        }
      })) || []
    }

    return NextResponse.json({ asset: transformedAsset })

  } catch (error) {
    console.error('Asset fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: assetId } = await params
    const body = await request.json()
    
    // Check if user owns the asset or has edit permission
    const { data: asset, error: fetchError } = await (supabase as any)
      .from('assets')
      .select(`
        *,
        asset_shares(shared_with_user_id, permission_level, is_active, expires_at)
      `)
      .eq('id', assetId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const isOwner = asset.owner_id === user.id
    const hasEditAccess = asset.asset_shares?.some((share: any) => 
      share.shared_with_user_id === user.id && 
      share.is_active &&
      ['edit', 'admin'].includes(share.permission_level) &&
      (!share.expires_at || new Date(share.expires_at) > new Date())
    )

    if (!isOwner && !hasEditAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update asset
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.folderPath !== undefined) updateData.folder_path = body.folderPath
    if (body.tags !== undefined) updateData.tags = body.tags

    const { data: updatedAsset, error: updateError } = await (supabase as any)
      .from('assets')
      .update(updateData)
      .eq('id', assetId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
    }

    // Log activity
    await (supabase as any)
      .from('asset_activity_log')
      .insert({
        asset_id: assetId,
        user_id: user.id,
        activity_type: 'edit',
        activity_details: { changes: updateData }
      })

    return NextResponse.json({ asset: updatedAsset })

  } catch (error) {
    console.error('Asset update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: assetId } = await params

    // Check if user owns the asset
    const { data: asset, error: fetchError } = await (supabase as any)
      .from('assets')
      .select('owner_id, title, file_path')
      .eq('id', assetId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if (asset.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the owner can delete this asset' }, { status: 403 })
    }

    // Soft delete the asset
    const { error: deleteError } = await (supabase as any)
      .from('assets')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', assetId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
    }

    // Log activity
    await (supabase as any)
      .from('asset_activity_log')
      .insert({
        asset_id: assetId,
        user_id: user.id,
        activity_type: 'delete',
        activity_details: { 
          title: asset.title,
          file_path: asset.file_path 
        }
      })

    return NextResponse.json({ success: true, message: 'Asset deleted successfully' })

  } catch (error) {
    console.error('Asset delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}