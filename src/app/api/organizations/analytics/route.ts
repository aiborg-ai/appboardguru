import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Types
interface OrganizationAnalytics {
  organizationId: string
  memberCount: number
  activeMembers: number
  totalAssets: number
  totalBoardPacks: number
  recentMeetings: number
  activityScore: number
  lastActivity: string
  memberActivity: MemberActivity[]
  weeklyStats: WeeklyActivity[]
  quickStats: {
    totalDocuments: number
    totalVaults: number
    totalNotifications: number
    totalCalendarEvents: number
  }
}

interface MemberActivity {
  userId: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  role: string
  lastAccessed: string | null
  isOnline: boolean
  activityCount: number
  joinedAt: string | null
}

interface WeeklyActivity {
  date: string
  totalActivities: number
  assetUploads: number
  meetingsCreated: number
  boardPacksCreated: number
}

// Helper to generate realistic mock data for development
function generateMockWeeklyData(): WeeklyActivity[] {
  const data: WeeklyActivity[] = []
  const now = new Date()
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    data.push({
      date: date.toISOString().split('T')[0],
      totalActivities: Math.floor(Math.random() * 50) + 10,
      assetUploads: Math.floor(Math.random() * 15) + 2,
      meetingsCreated: Math.floor(Math.random() * 5) + 1,
      boardPacksCreated: Math.floor(Math.random() * 3) + 0
    })
  }
  
  return data
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const url = new URL(request.url)
    const organizationId = url.searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is a member of the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 }
      )
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get member count and details
    const { data: membersData } = await supabase
      .from('organization_members')
      .select(`
        user_id,
        role,
        last_accessed,
        joined_at,
        access_count,
        users (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    const members = membersData || []
    const memberCount = members.length

    // Calculate active members (accessed in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const activeMembers = members.filter(member => {
      if (!member.last_accessed) return false
      return new Date(member.last_accessed) > thirtyDaysAgo
    }).length

    // Get asset count
    const { count: assetCount } = await supabase
      .from('assets')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('is_deleted', false)

    // Get board pack count
    const { count: boardPackCount } = await supabase
      .from('board_packs')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)

    // Get recent meetings (last 30 days)
    const { count: recentMeetingsCount } = await supabase
      .from('meetings')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Get vault count
    const { count: vaultCount } = await supabase
      .from('vaults')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)

    // Get notification count (last 30 days)
    const { count: notificationCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Get calendar events count (upcoming)
    const { count: calendarEventCount } = await supabase
      .from('calendar_events')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .gte('start_datetime', new Date().toISOString())

    // Get most recent activity
    const { data: recentActivity } = await supabase
      .from('user_activity_feed')
      .select('created_at')
      .eq('metadata->organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)

    // Calculate activity score (simple algorithm based on engagement)
    const activityScore = Math.min(100, Math.round(
      (activeMembers / memberCount * 40) +
      (Math.min(assetCount || 0, 20) / 20 * 30) +
      (Math.min(recentMeetingsCount || 0, 10) / 10 * 30)
    ))

    // Process member activities
    const memberActivity: MemberActivity[] = members.map(member => {
      const isOnline = member.last_accessed ? 
        new Date(member.last_accessed) > new Date(Date.now() - 15 * 60 * 1000) : false // Online if active in last 15 minutes
      
      return {
        userId: member.user_id,
        fullName: (member.users as any)?.full_name || null,
        email: (member.users as any)?.email || '',
        avatarUrl: (member.users as any)?.avatar_url || null,
        role: member.role,
        lastAccessed: member.last_accessed,
        isOnline,
        activityCount: member.access_count || 0,
        joinedAt: member.joined_at
      }
    })

    // Generate weekly stats (mock data for now - in production this would come from analytics tables)
    const weeklyStats = generateMockWeeklyData()

    const analytics: OrganizationAnalytics = {
      organizationId,
      memberCount,
      activeMembers,
      totalAssets: assetCount || 0,
      totalBoardPacks: boardPackCount || 0,
      recentMeetings: recentMeetingsCount || 0,
      activityScore,
      lastActivity: recentActivity?.[0]?.created_at || organization.updated_at || organization.created_at,
      memberActivity: memberActivity.sort((a, b) => (b.activityCount || 0) - (a.activityCount || 0)),
      weeklyStats,
      quickStats: {
        totalDocuments: assetCount || 0,
        totalVaults: vaultCount || 0,
        totalNotifications: notificationCount || 0,
        totalCalendarEvents: calendarEventCount || 0
      }
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Organization analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization analytics' },
      { status: 500 }
    )
  }
}

// Optional: POST endpoint for updating analytics preferences
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { organizationId, preferences } = await request.json()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has admin access to this organization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Update organization settings with analytics preferences
    const { data, error } = await supabase
      .from('organizations')
      .update({
        settings: {
          analytics: preferences
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Update analytics preferences error:', error)
    return NextResponse.json(
      { error: 'Failed to update analytics preferences' },
      { status: 500 }
    )
  }
}