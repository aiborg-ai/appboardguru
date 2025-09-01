import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientSafe } from '@/lib/supabase-server'

/**
 * GET /api/notifications/counts
 * Get notification counts for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientSafe()
    
    if (!supabase) {
      return NextResponse.json({ 
        counts: getDefaultCounts()
      }, { status: 200 })
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        counts: getDefaultCounts()
      }, { status: 200 }) // Return 200 with defaults to prevent console errors
    }
    
    // For now, return default counts
    // In the future, this would query actual notification tables
    const counts = await getNotificationCounts(supabase, user.id)
    
    return NextResponse.json({ 
      counts,
      userId: user.id
    })
    
  } catch (error) {
    console.error('[Notifications Counts] Error:', error)
    return NextResponse.json({ 
      counts: getDefaultCounts()
    }, { status: 200 })
  }
}

/**
 * Get default notification counts
 */
function getDefaultCounts() {
  return {
    total: 0,
    unread: 0,
    categories: {
      boardPacks: 0,
      meetings: 0,
      tasks: 0,
      comments: 0,
      system: 0
    }
  }
}

/**
 * Get actual notification counts from database
 * For now returns defaults, but can be expanded to query real data
 */
async function getNotificationCounts(supabase: any, userId: string) {
  // This is a placeholder - in a real implementation, 
  // this would query notification tables
  
  try {
    // Example query structure (commented out as tables don't exist yet):
    /*
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, category, is_read')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('[Notifications Counts] Query error:', error)
      return getDefaultCounts()
    }
    
    const counts = {
      total: notifications?.length || 0,
      unread: notifications?.filter(n => !n.is_read).length || 0,
      categories: {
        boardPacks: notifications?.filter(n => n.category === 'board_packs').length || 0,
        meetings: notifications?.filter(n => n.category === 'meetings').length || 0,
        tasks: notifications?.filter(n => n.category === 'tasks').length || 0,
        comments: notifications?.filter(n => n.category === 'comments').length || 0,
        system: notifications?.filter(n => n.category === 'system').length || 0
      }
    }
    
    return counts
    */
    
    // For now, return defaults
    return getDefaultCounts()
    
  } catch (error) {
    console.error('[Notifications Counts] Database error:', error)
    return getDefaultCounts()
  }
}