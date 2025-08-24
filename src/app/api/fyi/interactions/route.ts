import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { FYIService } from '@/lib/services/fyi.service'

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
    const { insightId, action, organizationId } = body

    if (!insightId || !action) {
      return NextResponse.json(
        { error: 'Insight ID and action are required' },
        { status: 400 }
      )
    }

    // Get user's primary organization if not provided
    let orgId = organizationId
    if (!orgId) {
      const { data: userOrg } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .eq('status', 'active')
        .single()
      
      orgId = (userOrg as any)?.organization_id || 'default'
    }

    // Initialize FYI service
    const fyiService = new FYIService(supabase, {
      newsApiKey: process.env['NEWS_API_KEY'],
      alphaVantageKey: process.env['ALPHA_VANTAGE_API_KEY'],
      openRouterKey: process.env['OPENROUTER_API_KEY']
    })

    await fyiService.logUserInteraction(user.id, insightId, action, orgId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Log interaction error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}