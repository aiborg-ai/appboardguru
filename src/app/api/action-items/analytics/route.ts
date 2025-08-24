import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// GET /api/action-items/analytics - Get action item analytics
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const userId = searchParams.get('userId')

    if (!organizationId && !userId) {
      return NextResponse.json(
        { error: 'Either organizationId or userId is required' },
        { status: 400 }
      )
    }

    let analytics

    if (userId) {
      // Get user-specific analytics
      const { data, error } = await supabase
        .from('user_action_item_dashboard')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      analytics = data || {
        user_id: userId,
        total_assigned: 0,
        pending_count: 0,
        in_progress_count: 0,
        completed_count: 0,
        overdue_count: 0,
        due_this_week: 0,
        avg_urgency: 0,
        avg_complexity: 0
      }

    } else if (organizationId) {
      // Get organization analytics
      const { data, error } = await supabase
        .from('action_item_analytics')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      analytics = data || {
        organization_id: organizationId,
        total_items: 0,
        completed_items: 0,
        overdue_items: 0,
        high_priority_items: 0,
        avg_urgency_score: 0,
        avg_complexity_score: 0,
        avg_extraction_confidence: 0,
        unique_assignees: 0,
        avg_completion_hours: 0,
        due_this_week: 0,
        due_this_month: 0,
        financial_items: 0,
        operational_items: 0,
        strategic_items: 0,
        compliance_items: 0
      }

      // Add additional insights for organization
      if (analytics.total_items > 0) {
        analytics.completion_rate = (analytics.completed_items / analytics.total_items * 100).toFixed(1)
        analytics.overdue_rate = (analytics.overdue_items / analytics.total_items * 100).toFixed(1)
      } else {
        analytics.completion_rate = '0.0'
        analytics.overdue_rate = '0.0'
      }
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('Error retrieving action item analytics:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve analytics' },
      { status: 500 }
    )
  }
}