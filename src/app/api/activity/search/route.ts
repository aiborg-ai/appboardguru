import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ActivitySearchEngine } from '@/lib/activity/search'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', authUser.id)
      .single()

    if (!user?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      query,
      naturalLanguage = false,
      filters = {},
      limit = 50,
      offset = 0
    } = body

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    let searchResults
    if (naturalLanguage) {
      const nlResults = await ActivitySearchEngine.searchWithNaturalLanguage(
        user.organization_id,
        query.trim(),
        { limit, offset, ...filters }
      )
      searchResults = {
        results: nlResults.results,
        totalCount: nlResults.results.length,
        parsedQuery: nlResults.parsedQuery,
        confidence: nlResults.confidence
      }
    } else {
      const supabaseQuery = supabase
        .from('audit_logs')
        .select(`
          id,
          event_type,
          entity_type,
          entity_id,
          metadata,
          timestamp,
          correlation_id,
          users!inner(id, name, email)
        `)
        .eq('organization_id', user.organization_id)
        .or(`event_type.ilike.%${query.trim()}%,entity_type.ilike.%${query.trim()}%,metadata->>'title'.ilike.%${query.trim()}%`)
        .order('timestamp', { ascending: false })
        .limit(limit)

      const { data: activities, error } = await supabaseQuery

      if (error) throw error

      const results = activities?.map(activity => ({
        id: activity.id,
        eventType: activity.event_type,
        entityType: activity.entity_type,
        entityId: activity.entity_id,
        timestamp: activity.timestamp,
        userId: (activity.users as any)?.id || 'unknown',
        userName: (activity.users as any)?.name || 'Unknown User',
        userEmail: (activity.users as any)?.email || 'unknown',
        metadata: activity.metadata,
        relevanceScore: 0.8,
        context: `${activity.event_type} on ${activity.entity_type}`,
        correlationId: activity.correlation_id
      })) || []

      searchResults = {
        results,
        totalCount: results.length
      }
    }

    await supabase
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        organization_id: user.organization_id,
        event_type: 'activity_search',
        entity_type: 'search_query',
        entity_id: `search-${Date.now()}`,
        metadata: {
          query: query.trim(),
          naturalLanguage,
          filters,
          resultCount: searchResults.results.length,
          confidence: naturalLanguage ? searchResults.confidence : undefined
        },
        timestamp: new Date().toISOString(),
        correlation_id: `search-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        session_id: `session-${authUser.id}-${Date.now()}`,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        source: 'activity_search'
      })

    return NextResponse.json({
      success: true,
      ...searchResults,
      meta: {
        query: query.trim(),
        naturalLanguage,
        filters,
        organizationId: user.organization_id,
        searchedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error searching activities:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', authUser.id)
      .single()

    if (!user?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'templates': {
        const { data: customTemplates } = await supabase
          .from('activity_search_templates')
          .select('*')
          .eq('organization_id', user.organization_id)
          .eq('is_active', true)
          .order('usage_count', { ascending: false })

        const builtInTemplates = [
          {
            id: 'recent-uploads',
            name: 'Recent Uploads',
            description: 'Files uploaded in the last 24 hours',
            query: 'uploaded files last 24 hours',
            filters: { eventTypes: ['asset_upload'], timeRange: '24h' }
          },
          {
            id: 'high-activity-users',
            name: 'Active Users',
            description: 'Users with high activity today',
            query: 'most active users today',
            filters: { timeRange: '24h', groupBy: 'user' }
          },
          {
            id: 'security-events',
            name: 'Security Events',
            description: 'Login and authentication activities',
            query: 'login logout security events',
            filters: { eventTypes: ['user_login', 'user_logout', 'failed_login'] }
          },
          {
            id: 'vault-activity',
            name: 'Vault Activity',
            description: 'Vault creation and modification',
            query: 'vault created modified',
            filters: { eventTypes: ['vault_create', 'vault_update'], entityTypes: ['vault'] }
          }
        ]
        
        return NextResponse.json({
          success: true,
          templates: [
            ...builtInTemplates,
            ...(customTemplates || [])
          ]
        })
      }

      case 'suggestions': {
        const suggestions = await ActivitySearchEngine.getSearchSuggestions(
          user.organization_id,
          url.searchParams.get('query') || ''
        )
        
        return NextResponse.json({
          success: true,
          suggestions
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error handling search request:', error)
    return NextResponse.json(
      { error: 'Request failed' },
      { status: 500 }
    )
  }
}