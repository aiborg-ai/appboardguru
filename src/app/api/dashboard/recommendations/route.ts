import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * GET /api/dashboard/recommendations
 * 
 * Returns personalized recommendations for the authenticated user
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
    const limit = parseInt(url.searchParams.get('limit') || '5')
    const type = url.searchParams.get('type') // filter by recommendation type

    // Get user's primary organization
    const { data: userOrg } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    // Sample recommendations data (in real implementation, this would come from user_recommendations table)
    const sampleRecommendations = [
      {
        id: '1',
        type: 'feature',
        title: 'Try AI Board Pack Generator',
        description: 'Generate board materials 10x faster',
        action_url: '/features/ai-generator',
        priority: 9,
        icon: 'wand-2',
        color: 'purple'
      },
      {
        id: '2',
        type: 'feature',
        title: 'Explore New ESG Features',
        description: '7 new sustainability datasets available',
        action_url: '/features/esg',
        priority: 7,
        icon: 'leaf',
        color: 'green'
      },
      {
        id: '3',
        type: 'action',
        title: 'Review Governance Framework',
        description: 'Your governance framework needs updating based on new regulations',
        action_url: '/governance/review',
        priority: 8,
        icon: 'shield-check',
        color: 'amber'
      },
      {
        id: '4',
        type: 'content',
        title: 'Q3 Board Pack Templates Available',
        description: 'New quarterly reporting templates are ready for use',
        action_url: '/templates/q3',
        priority: 6,
        icon: 'file-template',
        color: 'blue'
      }
    ]

    // Filter by type if specified
    let filteredRecommendations = sampleRecommendations
    if (type) {
      filteredRecommendations = sampleRecommendations.filter(rec => rec.type === type)
    }

    // Sort by priority and limit
    const recommendations = filteredRecommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit)
      .map(rec => ({
        ...rec,
        is_active: true,
        is_dismissed: false,
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      }))

    // In a real implementation, we would query the user_recommendations table:
    /*
    let query = supabase
      .from('user_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_dismissed', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) {
      query = query.eq('recommendation_type', type)
    }

    const { data: recommendations, error } = await query
    */

    const response = {
      recommendations,
      user_id: user.id,
      organization_id: (userOrg as any)?.organization_id,
      total_count: filteredRecommendations.length,
      fetched_at: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Dashboard recommendations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/dashboard/recommendations
 * 
 * Update recommendation status (dismiss, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recommendation_id, action } = body

    if (!recommendation_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: recommendation_id, action' },
        { status: 400 }
      )
    }

    // Validate action
    if (!['dismiss', 'undismiss', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: dismiss, undismiss, or deactivate' },
        { status: 400 }
      )
    }

    // In a real implementation, update the user_recommendations table:
    /*
    const updateData: any = { updated_at: new Date().toISOString() }
    
    switch (action) {
      case 'dismiss':
        updateData.is_dismissed = true
        updateData.dismissed_at = new Date().toISOString()
        break
      case 'undismiss':
        updateData.is_dismissed = false
        updateData.dismissed_at = null
        break
      case 'deactivate':
        updateData.is_active = false
        break
    }

    const { data: recommendation, error } = await supabase
      .from('user_recommendations')
      .update(updateData)
      .eq('id', recommendation_id)
      .eq('user_id', user.id) // Ensure user can only update their own recommendations
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    */

    // For now, return a success response
    const recommendation = {
      id: recommendation_id,
      action_performed: action,
      updated_at: new Date().toISOString()
    }

    return NextResponse.json({ recommendation })

  } catch (error) {
    console.error('Update recommendation error:', error)
    return NextResponse.json(
      { error: 'Failed to update recommendation' },
      { status: 500 }
    )
  }
}