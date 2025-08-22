import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * GET /api/dashboard/insights
 * 
 * Returns AI-powered insights and analysis for the authenticated user
 * Includes board pack analysis, governance alerts, and strategic opportunities
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
    const type = url.searchParams.get('type') // 'analysis', 'alert', 'opportunity'
    const limit = parseInt(url.searchParams.get('limit') || '10')

    // Get user's primary organization
    const { data: userOrg } = await supabase
      .from('organization_members')
      .select('organization_id, organization:organizations(name)')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    // Sample insights data (in real implementation, this would come from AI analysis results)
    const sampleInsights = [
      {
        id: '1',
        type: 'analysis',
        category: 'board_pack_analysis',
        title: 'Board Pack Analysis',
        description: 'AI analysis of board documents increased efficiency by 23% this quarter',
        status: 'positive',
        severity: 'low',
        action_required: false,
        action_url: '/insights/board-analysis',
        metadata: {
          efficiency_increase: '23%',
          period: 'this quarter',
          documents_analyzed: 45
        },
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        type: 'alert',
        category: 'governance',
        title: 'Governance Alert',
        description: 'New compliance requirement detected in your governance framework',
        status: 'warning',
        severity: 'medium',
        action_required: true,
        action_url: '/governance/compliance-review',
        metadata: {
          requirement_type: 'compliance',
          framework: 'governance',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        },
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        type: 'opportunity',
        category: 'strategic',
        title: 'Strategic Opportunity',
        description: 'Gap detected in ESG reporting that could enhance stakeholder value',
        status: 'opportunity',
        severity: 'low',
        action_required: false,
        action_url: '/esg/reporting-enhancement',
        metadata: {
          opportunity_type: 'ESG reporting',
          potential_impact: 'stakeholder value enhancement',
          effort_level: 'medium'
        },
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        type: 'analysis',
        category: 'risk_assessment',
        title: 'Risk Assessment Update',
        description: 'Monthly risk assessment completed with 2 medium-priority items identified',
        status: 'neutral',
        severity: 'medium',
        action_required: true,
        action_url: '/risk/assessment-results',
        metadata: {
          risk_items: 2,
          priority_level: 'medium',
          assessment_period: 'monthly'
        },
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    // Filter by type if specified
    let filteredInsights = sampleInsights
    if (type) {
      filteredInsights = sampleInsights.filter(insight => insight.type === type)
    }

    // Sort by created_at and limit
    const insights = filteredInsights
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
      .map(insight => ({
        ...insight,
        timeAgo: formatTimeAgo(new Date(insight.created_at)),
        organization_id: (userOrg as any)?.organization_id
      }))

    // Calculate summary statistics
    const summary = {
      total_insights: filteredInsights.length,
      by_type: {
        analysis: filteredInsights.filter(i => i.type === 'analysis').length,
        alert: filteredInsights.filter(i => i.type === 'alert').length,
        opportunity: filteredInsights.filter(i => i.type === 'opportunity').length
      },
      by_severity: {
        low: filteredInsights.filter(i => i.severity === 'low').length,
        medium: filteredInsights.filter(i => i.severity === 'medium').length,
        high: filteredInsights.filter(i => i.severity === 'high').length,
        critical: filteredInsights.filter(i => i.severity === 'critical').length
      },
      action_required: filteredInsights.filter(i => i.action_required).length
    }

    // In a real implementation, we would query an insights/analysis table:
    /*
    let query = supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) {
      query = query.eq('insight_type', type)
    }

    const { data: insights, error } = await query
    */

    const response = {
      insights,
      summary,
      organization: (userOrg as any)?.organization,
      user_id: user.id,
      fetched_at: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Dashboard insights error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/insights
 * 
 * Create a new AI insight (typically called by AI processing services)
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
    const { 
      type, 
      category, 
      title, 
      description, 
      status, 
      severity, 
      action_required, 
      action_url, 
      metadata 
    } = body

    // Validate required fields
    if (!type || !category || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: type, category, title, description' },
        { status: 400 }
      )
    }

    // Validate enum values
    const validTypes = ['analysis', 'alert', 'opportunity']
    const validStatuses = ['positive', 'neutral', 'warning', 'critical', 'opportunity']
    const validSeverities = ['low', 'medium', 'high', 'critical']

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    // In a real implementation, insert into ai_insights table:
    /*
    const { data: insight, error } = await supabase
      .from('ai_insights')
      .insert({
        user_id: user.id,
        organization_id: (userOrg as any)?.organization_id,
        insight_type: type,
        category,
        title,
        description,
        status: status || 'neutral',
        severity: severity || 'low',
        action_required: action_required || false,
        action_url,
        metadata: metadata || {}
      })
      .select()
      .single()
    */

    // For now, return a mock insight
    const insight = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      organization_id: (userOrg as any)?.organization_id,
      type,
      category,
      title,
      description,
      status: status || 'neutral',
      severity: severity || 'low',
      action_required: action_required || false,
      action_url,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return NextResponse.json({ insight }, { status: 201 })

  } catch (error) {
    console.error('Create insight error:', error)
    return NextResponse.json(
      { error: 'Failed to create insight' },
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