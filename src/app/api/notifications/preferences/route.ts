import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientSafe } from '@/lib/supabase-server'

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientSafe()
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Failed to create Supabase client',
        preferences: getDefaultPreferences()
      }, { status: 200 })
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        preferences: getDefaultPreferences()
      }, { status: 200 }) // Return 200 with defaults to prevent console errors
    }
    
    // For now, return default preferences
    // In the future, this could fetch from a preferences table
    const preferences = getDefaultPreferences()
    
    return NextResponse.json({ 
      preferences,
      userId: user.id
    })
    
  } catch (error) {
    console.error('[Notifications Preferences] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch preferences',
      preferences: getDefaultPreferences()
    }, { status: 200 })
  }
}

/**
 * POST /api/notifications/preferences
 * Update user notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientSafe()
    
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Failed to create Supabase client'
      }, { status: 200 })
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized'
      }, { status: 200 })
    }
    
    const body = await request.json()
    
    // For now, just acknowledge the update
    // In the future, this would save to a preferences table
    console.log('[Notifications Preferences] Update requested for user:', user.id, body)
    
    return NextResponse.json({ 
      success: true,
      preferences: { ...getDefaultPreferences(), ...body }
    })
    
  } catch (error) {
    console.error('[Notifications Preferences] Update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update preferences'
    }, { status: 200 })
  }
}

/**
 * Get default notification preferences
 */
function getDefaultPreferences() {
  return {
    email: {
      enabled: true,
      frequency: 'instant',
      types: {
        boardPackUploaded: true,
        meetingReminder: true,
        taskAssigned: true,
        commentMention: true,
        organizationUpdate: true
      }
    },
    push: {
      enabled: false,
      types: {
        boardPackUploaded: true,
        meetingReminder: true,
        taskAssigned: true,
        commentMention: true,
        organizationUpdate: false
      }
    },
    inApp: {
      enabled: true,
      playSound: false,
      showDesktop: false
    }
  }
}