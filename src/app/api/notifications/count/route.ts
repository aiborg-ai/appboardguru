import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'unread')

    if (unreadError) {
      console.error('Error fetching unread count:', unreadError)
      return NextResponse.json(
        { error: 'Failed to fetch notification count' },
        { status: 500 }
      )
    }

    const { count: totalCount, error: totalError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (totalError) {
      console.error('Error fetching total count:', totalError)
      return NextResponse.json(
        { error: 'Failed to fetch notification count' },
        { status: 500 }
      )
    }

    const { count: criticalCount, error: criticalError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'unread')
      .eq('priority', 'critical')

    if (criticalError) {
      console.error('Error fetching critical count:', criticalError)
      return NextResponse.json(
        { error: 'Failed to fetch notification count' },
        { status: 500 }
      )
    }

    const { count: highCount, error: highError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'unread')
      .eq('priority', 'high')

    if (highError) {
      console.error('Error fetching high count:', highError)
      return NextResponse.json(
        { error: 'Failed to fetch notification count' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      unread: unreadCount || 0,
      total: totalCount || 0,
      critical_unread: criticalCount || 0,
      high_unread: highCount || 0
    })

  } catch (error) {
    console.error('Notifications count API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}