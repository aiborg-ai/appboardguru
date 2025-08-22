import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const folder = searchParams.get('folder')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const sortBy = searchParams.get('sortBy') || 'updated_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Build query for user's accessible board packs/assets
    let query = supabase
      .from('board_packs')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by(id, full_name, email)
      `)
      .is('archived_at', null)

    // Filter by user access (uploaded by user or organization member)
    if (user) {
      query = query.or(`uploaded_by.eq.${user.id},organization_id.in.(SELECT organization_id FROM organization_members WHERE user_id = '${user.id}' AND status = 'active')`)
    }

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }
    
    if (folder && folder !== 'all') {
      query = query.eq('folder_path', folder)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,file_name.ilike.%${search}%,description.ilike.%${search}%`)
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

    // Transform data for frontend consumption
    const transformedAssets = assets?.map(asset => ({
      ...asset,
      isOwner: asset.uploaded_by === user.id,
      owner: asset.uploaded_by_user,
      sharedWith: [], // TODO: Implement sharing system
      isShared: false // TODO: Implement sharing system
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

    const body = await request.json()
    const {
      title,
      description,
      fileName,
      filePath,
      fileSize,
      fileType,
      category,
      tags
    } = body

    // Validate required fields
    if (!title || !fileName || !filePath || !fileSize || !fileType) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, fileName, filePath, fileSize, fileType' 
      }, { status: 400 })
    }

    // Create board pack record
    const { data: asset, error } = await supabase
      .from('board_packs')
      .insert({
        uploaded_by: user.id,
        title,
        description,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize,
        file_type: fileType,
        category: category || 'other',
        tags: tags || [],
        status: 'ready',
        watermark_applied: false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: asset.organization_id,
        event_type: 'data_modification',
        event_category: 'asset_management',
        action: 'upload',
        resource_type: 'board_pack',
        resource_id: asset.id,
        event_description: `Uploaded new asset: ${title}`,
        outcome: 'success',
        severity: 'low',
        details: {
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
          category: category || 'other'
        }
      })

    return NextResponse.json({ asset }, { status: 201 })

  } catch (error) {
    console.error('Create asset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}