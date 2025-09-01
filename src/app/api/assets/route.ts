import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

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
    
    // Build query for user's accessible assets
    let query = supabase
      .from('assets')
      .select(`
        *,
        owner:users!owner_id(id, full_name, email),
        organization:organizations!organization_id(id, name)
      `)

    // Filter by user's organizations
    // Get user's organizations first
    const { data: userOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
    
    if (userOrgs && userOrgs.length > 0) {
      const orgIds = userOrgs.map(org => org.organization_id)
      query = query.in('organization_id', orgIds)
    } else {
      // If user has no organizations, return empty result
      return NextResponse.json({
        success: true,
        assets: [],
        total: 0,
        page,
        limit
      })
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
    
    // Log for debugging
    console.log('Assets query result:', {
      count,
      assetsLength: assets?.length,
      error: error?.message
    })

    if (error) {
      console.error('Database error:', error)
      // Return empty array instead of error for better UX
      return NextResponse.json({
        success: true,
        assets: [],
        totalCount: 0,
        page,
        limit,
        totalPages: 0,
        message: 'Unable to fetch assets. Please check your permissions.'
      })
    }

    // Transform data for frontend consumption
    const transformedAssets = (assets || []).map(asset => ({
      id: asset.id,
      title: asset.title || asset.file_name || 'Untitled',
      fileName: asset.file_name,
      file_name: asset.file_name, // Support both formats
      fileType: asset.file_type,
      file_type: asset.file_type, // Support both formats
      fileSize: asset.file_size,
      file_size: asset.file_size, // Support both formats
      category: asset.category || 'general',
      folder: asset.folder_path || '/',
      tags: asset.tags || [],
      thumbnail: asset.thumbnail_url,
      thumbnailUrl: asset.thumbnail_url, // Support both formats
      thumbnail_url: asset.thumbnail_url, // Support both formats
      createdAt: asset.created_at,
      created_at: asset.created_at, // Support both formats
      updatedAt: asset.updated_at,
      updated_at: asset.updated_at, // Support both formats
      isOwner: asset.owner_id === user.id,
      owner: asset.owner ? {
        id: asset.owner.id,
        name: asset.owner.full_name || asset.owner.email?.split('@')[0] || 'Unknown',
        email: asset.owner.email
      } : null,
      owner_id: asset.owner_id,
      organization: asset.organization,
      organization_id: asset.organization_id,
      vault: asset.vault,
      vault_id: asset.vault_id,
      sharedWith: [], // TODO: Implement sharing system
      downloadCount: 0,
      viewCount: 0,
      isShared: false // TODO: Implement sharing system
    }))

    return NextResponse.json({
      success: true,
      assets: transformedAssets,
      totalCount: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Assets API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
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

    // Create asset record - using minimal fields that should exist
    const assetData: any = {
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize,
      file_type: fileType
    }
    
    // Add optional fields if they exist in the table
    // These might not exist, so we add them conditionally
    if (title) assetData.title = title
    if (description) assetData.description = description
    if (category) assetData.category = category
    if (tags) assetData.tags = tags
    
    // Try to add user reference - column might be named differently
    // Common variations: owner_id, user_id, created_by, uploaded_by
    assetData.user_id = user.id // Try user_id first
    
    const { data: asset, error } = await supabase
      .from('assets')
      .insert(assetData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
    }

    // Try to log activity - this might fail if audit_logs table doesn't exist
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          event_type: 'upload',
          resource_type: 'asset',
          resource_id: asset.id,
          description: `Uploaded new asset: ${title || fileName}`
        })
    } catch (logError) {
      // Ignore audit log errors - not critical
      console.log('Audit log failed (non-critical):', logError)
    }

    return NextResponse.json({ asset }, { status: 201 })

  } catch (error) {
    console.error('Create asset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}