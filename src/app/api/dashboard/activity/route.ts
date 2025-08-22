import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

/**
 * GET /api/dashboard/activity
 * 
 * Returns recent activity feed for the authenticated user
 * Includes user actions, system events, and team activities
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Get user's primary organization
    const { data: userOrg } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    const organizationId = (userOrg as any)?.organization_id

    // Generate sample activity data (in real implementation, this would come from audit_logs)
    const sampleActivities = [
      {
        id: '1',
        type: 'search',
        title: 'Searched for "quarterly board materials"',
        description: null,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        icon: 'search',
        resource_type: 'search',
        resource_id: null
      },
      {
        id: '2',
        type: 'generate',
        title: 'Generated governance analysis report',
        description: null,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        icon: 'file-text',
        resource_type: 'report',
        resource_id: null
      },
      {
        id: '3',
        type: 'update',
        title: 'Updated Project Alpha roadmap',
        description: null,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        icon: 'edit',
        resource_type: 'project',
        resource_id: null
      },
      {
        id: '4',
        type: 'review',
        title: 'Team reviewed 5 compliance documents',
        description: null,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        icon: 'users',
        resource_type: 'documents',
        resource_id: null
      }
    ]

    // In a real implementation, we would query the audit_logs table:
    /*
    const { data: activities, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        event_description,
        created_at,
        resource_type,
        resource_id,
        metadata
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    */

    // Format activities for the frontend
    const formattedActivities = sampleActivities.slice(offset, offset + limit).map(activity => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      timestamp: activity.timestamp,
      timeAgo: formatTimeAgo(new Date(activity.timestamp)),
      icon: activity.icon,
      resource_type: activity.resource_type,
      resource_id: activity.resource_id
    }))

    const response = {
      activities: formattedActivities,
      pagination: {
        offset,
        limit,
        total: sampleActivities.length,
        has_more: offset + limit < sampleActivities.length
      },
      organization_id: organizationId,
      fetched_at: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Dashboard activity error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard activity' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/activity
 * 
 * Log a new user activity
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, description, resource_type, resource_id, metadata } = body as {
      type: string
      title: string
      description?: string
      resource_type?: string
      resource_id?: string
      metadata?: Record<string, unknown>
    }

    // Validate required fields
    if (!type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title' },
        { status: 400 }
      )
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    // In a real implementation, insert into user_activity_feed table:
    /*
    const { data: activity, error } = await supabase
      .from('user_activity_feed')
      .insert({
        user_id: user.id,
        organization_id: (userOrg as any)?.organization_id,
        activity_type: type,
        activity_title: title,
        activity_description: description,
        resource_type,
        resource_id,
        metadata: metadata || {}
      })
      .select()
      .single()
    */

    // For now, return a success response
    const activity = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      organization_id: (userOrg as any)?.organization_id,
      activity_type: type,
      activity_title: title,
      activity_description: description,
      resource_type,
      resource_id,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    }

    return NextResponse.json({ activity }, { status: 201 })

  } catch (error) {
    console.error('Log activity error:', error)
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    )
  }
}

// Helper function to format relative time
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else if (diffInDays === 1) {
    return 'Yesterday'
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}