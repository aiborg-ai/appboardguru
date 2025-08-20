import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assetId = params.id
    const body = await request.json()
    const { userIds, permission, message, expiresAt, notifyUsers } = body

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ 
        error: 'userIds array is required and must not be empty' 
      }, { status: 400 })
    }

    if (!permission || !['view', 'download', 'edit', 'admin'].includes(permission)) {
      return NextResponse.json({ 
        error: 'Valid permission level is required' 
      }, { status: 400 })
    }

    // Check if user owns the asset or has admin permission
    const { data: asset, error: fetchError } = await supabase
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
    const hasAdminAccess = asset.asset_shares?.some(share => 
      share.shared_with_user_id === user.id && 
      share.is_active &&
      share.permission_level === 'admin' &&
      (!share.expires_at || new Date(share.expires_at) > new Date())
    )

    if (!isOwner && !hasAdminAccess) {
      return NextResponse.json({ 
        error: 'Only the owner or users with admin permission can share this asset' 
      }, { status: 403 })
    }

    // Validate that target users exist
    const { data: targetUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds)

    if (usersError || !targetUsers || targetUsers.length !== userIds.length) {
      return NextResponse.json({ error: 'Some target users do not exist' }, { status: 400 })
    }

    // Prepare sharing data
    const sharingData = userIds.map(userId => ({
      asset_id: assetId,
      shared_by_user_id: user.id,
      shared_with_user_id: userId,
      permission_level: permission,
      share_message: message || null,
      expires_at: expiresAt || null,
      is_active: true
    }))

    // Insert or update sharing records (upsert)
    const { data: shares, error: shareError } = await supabase
      .from('asset_shares')
      .upsert(sharingData, {
        onConflict: 'asset_id,shared_with_user_id',
        ignoreDuplicates: false
      })
      .select(`
        *,
        users!asset_shares_shared_with_user_id_fkey(id, name, email)
      `)

    if (shareError) {
      console.error('Share error:', shareError)
      return NextResponse.json({ error: 'Failed to share asset' }, { status: 500 })
    }

    // Log activity for each share
    const activityLogs = userIds.map(userId => ({
      asset_id: assetId,
      user_id: user.id,
      activity_type: 'share',
      activity_details: {
        shared_with_user_id: userId,
        permission_level: permission,
        message: message || null
      }
    }))

    await supabase
      .from('asset_activity_log')
      .insert(activityLogs)

    // Send notifications if requested
    if (notifyUsers) {
      // In a real implementation, you would send email notifications here
      // For now, we'll just log it
      console.log('Notification emails would be sent to:', targetUsers.map(u => u.email))
      
      // You could call an email service here:
      // await sendShareNotificationEmails(asset, targetUsers, user, permission, message)
    }

    // Transform response data
    const shareResults = shares?.map(share => ({
      id: share.id,
      assetId: share.asset_id,
      sharedWithUserId: share.shared_with_user_id,
      sharedWithUserName: share.users?.name || '',
      sharedWithUserEmail: share.users?.email || '',
      permission: share.permission_level,
      message: share.share_message,
      expiresAt: share.expires_at,
      createdAt: share.created_at
    })) || []

    return NextResponse.json({ 
      success: true,
      shares: shareResults,
      message: `Asset shared successfully with ${userIds.length} user${userIds.length > 1 ? 's' : ''}`
    })

  } catch (error) {
    console.error('Asset sharing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assetId = params.id

    // Check if user has access to view sharing information
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select(`
        owner_id,
        asset_shares(shared_with_user_id, permission_level, is_active, expires_at)
      `)
      .eq('id', assetId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const isOwner = asset.owner_id === user.id
    const hasAccess = isOwner || asset.asset_shares?.some(share => 
      share.shared_with_user_id === user.id && 
      share.is_active &&
      (!share.expires_at || new Date(share.expires_at) > new Date())
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get sharing details
    const { data: shares, error: sharesError } = await supabase
      .from('asset_shares')
      .select(`
        *,
        shared_with_user:users!asset_shares_shared_with_user_id_fkey(id, name, email),
        shared_by_user:users!asset_shares_shared_by_user_id_fkey(id, name, email)
      `)
      .eq('asset_id', assetId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (sharesError) {
      console.error('Shares fetch error:', sharesError)
      return NextResponse.json({ error: 'Failed to fetch sharing information' }, { status: 500 })
    }

    const transformedShares = shares?.map(share => ({
      id: share.id,
      sharedWithUser: {
        id: share.shared_with_user?.id,
        name: share.shared_with_user?.name,
        email: share.shared_with_user?.email
      },
      sharedByUser: {
        id: share.shared_by_user?.id,
        name: share.shared_by_user?.name,
        email: share.shared_by_user?.email
      },
      permission: share.permission_level,
      message: share.share_message,
      expiresAt: share.expires_at,
      createdAt: share.created_at,
      accessedAt: share.accessed_at,
      downloadCount: share.download_count || 0
    })) || []

    return NextResponse.json({ shares: transformedShares })

  } catch (error) {
    console.error('Get shares error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assetId = params.id
    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get('shareId')
    const userId = searchParams.get('userId')

    if (!shareId && !userId) {
      return NextResponse.json({ 
        error: 'Either shareId or userId parameter is required' 
      }, { status: 400 })
    }

    // Check if user owns the asset or has admin permission
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select(`
        owner_id,
        asset_shares(shared_with_user_id, permission_level, is_active, expires_at)
      `)
      .eq('id', assetId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const isOwner = asset.owner_id === user.id
    const hasAdminAccess = asset.asset_shares?.some(share => 
      share.shared_with_user_id === user.id && 
      share.is_active &&
      share.permission_level === 'admin' &&
      (!share.expires_at || new Date(share.expires_at) > new Date())
    )

    if (!isOwner && !hasAdminAccess) {
      return NextResponse.json({ 
        error: 'Only the owner or users with admin permission can revoke sharing' 
      }, { status: 403 })
    }

    // Remove sharing
    let deleteQuery = supabase
      .from('asset_shares')
      .delete()
      .eq('asset_id', assetId)

    if (shareId) {
      deleteQuery = deleteQuery.eq('id', shareId)
    } else if (userId) {
      deleteQuery = deleteQuery.eq('shared_with_user_id', userId)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('Delete share error:', deleteError)
      return NextResponse.json({ error: 'Failed to revoke sharing' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('asset_activity_log')
      .insert({
        asset_id: assetId,
        user_id: user.id,
        activity_type: 'unshare',
        activity_details: {
          revoked_share_id: shareId,
          revoked_user_id: userId
        }
      })

    return NextResponse.json({ 
      success: true, 
      message: 'Sharing revoked successfully' 
    })

  } catch (error) {
    console.error('Revoke sharing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}