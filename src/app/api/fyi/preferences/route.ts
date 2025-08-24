import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { FYIService } from '@/lib/services/fyi.service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Initialize FYI service
    const fyiService = new FYIService(supabase, {
      newsApiKey: process.env['NEWS_API_KEY'],
      alphaVantageKey: process.env['ALPHA_VANTAGE_API_KEY'],
      openRouterKey: process.env['OPENROUTER_API_KEY']
    })

    const preferences = await fyiService.getUserPreferences(user.id)

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Get user preferences error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { preferences } = body

    if (!preferences) {
      return NextResponse.json(
        { error: 'Preferences data is required' },
        { status: 400 }
      )
    }

    // Initialize FYI service
    const fyiService = new FYIService(supabase, {
      newsApiKey: process.env['NEWS_API_KEY'],
      alphaVantageKey: process.env['ALPHA_VANTAGE_API_KEY'],
      openRouterKey: process.env['OPENROUTER_API_KEY']
    })

    const updatedPreferences = await fyiService.updateUserPreferences(user.id, preferences)

    return NextResponse.json({ preferences: updatedPreferences })
  } catch (error) {
    console.error('Update user preferences error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}