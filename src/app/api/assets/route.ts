import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const folder = searchParams.get('folder')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const sortBy = searchParams.get('sortBy') || 'updated_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Build query for user's accessible assets
    let query = supabase
      .from('assets')
      .select(`
        *,
        owner:users!assets_owner_id_fkey(id, name, email),
        asset_shares!inner(
          id,
          shared_with_user_id,
          permission_level,
          shared_by_user_id,
          users!asset_shares_shared_with_user_id_fkey(id, name, email)
        )
      `)
      .eq('is_deleted', false)

    // Filter by ownership or shared access
    query = query.or(`owner_id.eq.${user.id},asset_shares.shared_with_user_id.eq.${user.id}`)

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }
    
    if (folder && folder !== 'all') {
      query = query.eq('folder_path', folder)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,file_name.ilike.%${search}%,tags.cs.{${search}}`)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    switch (sortBy) {
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
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: assets, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
    }

    // Transform data to include sharing information
    const transformedAssets = assets?.map(asset => ({
      ...asset,
      isOwner: asset.owner_id === user.id,
      sharedWith: asset.asset_shares?.filter(share => 
        share.shared_with_user_id !== user.id
      ).map(share => ({
        userId: share.shared_with_user_id,
        userName: share.users?.name || '',
        permission: share.permission_level
      })) || [],
      isShared: (asset.asset_shares?.length || 0) > 0
    }))

    return NextResponse.json({
      assets: transformedAssets,
      totalCount: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Assets API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      fileName,
      originalFileName,
      filePath,
      fileSize,
      fileType,
      mimeType,
      category,
      folderPath,
      tags,
      thumbnailUrl,
      previewUrl
    } = body

    // Validate required fields
    if (!title || !fileName || !filePath || !fileSize || !fileType) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, fileName, filePath, fileSize, fileType' 
      }, { status: 400 })
    }

    // Create asset record
    const { data: asset, error } = await supabase
      .from('assets')
      .insert({
        owner_id: user.id,
        title,
        description,
        file_name: fileName,
        original_file_name: originalFileName || fileName,
        file_path: filePath,
        file_size: fileSize,
        file_type: fileType,
        mime_type: mimeType || 'application/octet-stream',
        category: category || 'general',
        folder_path: folderPath || '/',
        tags: tags || [],
        thumbnail_url: thumbnailUrl,
        preview_url: previewUrl,
        is_processed: true,
        processing_status: 'completed'
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('asset_activity_log')
      .insert({
        asset_id: asset.id,
        user_id: user.id,
        activity_type: 'upload',
        activity_details: {
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType
        }
      })

    return NextResponse.json({ asset }, { status: 201 })

  } catch (error) {
    console.error('Create asset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}