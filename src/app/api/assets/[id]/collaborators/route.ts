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
    
    const assetId = (await params).id

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, verify user has access to this asset
    const { data: asset, error: assetError } = await supabase
      .from('board_packs')
      .select(`
        id,
        title,
        organization_id,
        uploaded_by,
        visibility
      `)
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Get collaborators based on asset visibility and vault membership
    let collaboratorsQuery

    if (asset.organization_id) {
      // Get organization members who have access to this asset
      collaboratorsQuery = supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          last_accessed,
          users!inner(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('organization_id', asset.organization_id)
        .eq('status', 'active')
    } else {
      // For non-organization assets, get direct shares
      collaboratorsQuery = supabase
        .from('asset_shares')
        .select(`
          shared_with_user_id,
          permission_level,
          last_accessed,
          users!inner(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('asset_id', assetId)
    }

    const { data: collaboratorsData, error: collaboratorsError } = await collaboratorsQuery

    if (collaboratorsError) {
      console.error('Error fetching collaborators:', collaboratorsError)
      return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 })
    }

    // Get annotation counts for each collaborator
    const userIds = collaboratorsData?.map((c: any) => 
      c.user_id || c.shared_with_user_id
    ) || []

    const { data: annotationCounts } = await supabase
      .from('annotations')
      .select('created_by')
      .eq('asset_id', assetId)
      .in('created_by', userIds)

    // Count annotations per user
    const annotationCountMap = annotationCounts?.reduce((acc: any, annotation: any) => {
      acc[annotation.created_by] = (acc[annotation.created_by] || 0) + 1
      return acc
    }, {}) || {}

    // Transform data
    const collaborators = collaboratorsData?.map((item: any) => {
      const user = item.users
      const userId = user.id
      const role = item.role || item.permission_level || 'viewer'
      
      return {
        id: userId,
        fullName: user.full_name || 'Unknown User',
        email: user.email,
        avatarUrl: user.avatar_url,
        role: role,
        lastAccessed: item.last_accessed,
        annotationCount: annotationCountMap[userId] || 0,
        isOnline: false, // TODO: Implement real-time presence
        permissions: {
          canView: true,
          canComment: ['owner', 'admin', 'member', 'editor'].includes(role),
          canEdit: ['owner', 'admin', 'editor'].includes(role),
          canShare: ['owner', 'admin'].includes(role)
        }
      }
    }) || []

    // Sort by role priority and recent activity
    collaborators.sort((a, b) => {
      const rolePriority = { owner: 0, admin: 1, member: 2, viewer: 3 }
      const aPriority = rolePriority[a.role as keyof typeof rolePriority] ?? 4
      const bPriority = rolePriority[b.role as keyof typeof rolePriority] ?? 4
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      // Then by recent activity
      if (a.lastAccessed && b.lastAccessed) {
        return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
      }
      
      return a.fullName.localeCompare(b.fullName)
    })

    return NextResponse.json({
      success: true,
      data: collaborators
    })

  } catch (error) {
    console.error('Collaborators API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}