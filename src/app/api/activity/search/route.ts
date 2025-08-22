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

    const { data: user } = await (supabase as any)
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
        (user as any)?.organization_id,
        query.trim(),
        { limit, offset, ...(filters as any) }
      )
      searchResults = {
        results: (nlResults as any)?.results,
        totalCount: (nlResults as any)?.results?.length || 0,
        parsedQuery: (nlResults as any)?.parsedQuery,
        confidence: (nlResults as any)?.confidence
      }
    } else {
      const supabaseQuery = (supabase as any)
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
        .eq('organization_id', (user as any)?.organization_id)
        .or(`event_type.ilike.%${query.trim()}%,entity_type.ilike.%${query.trim()}%,metadata->>'title'.ilike.%${query.trim()}%`)
        .order('timestamp', { ascending: false })
        .limit(limit)

      const { data: activities, error } = await supabaseQuery

      if (error) throw error

      const results = (activities as any)?.map((activity: any) => ({
        id: (activity as any)?.id,
        eventType: (activity as any)?.event_type,
        entityType: (activity as any)?.entity_type,
        entityId: (activity as any)?.entity_id,
        timestamp: (activity as any)?.timestamp,
        userId: (activity as any)?.users?.id || 'unknown',
        userName: (activity as any)?.users?.name || 'Unknown User',
        userEmail: (activity as any)?.users?.email || 'unknown',
        metadata: (activity as any)?.metadata,
        relevanceScore: 0.8,
        context: `${(activity as any)?.event_type} on ${(activity as any)?.entity_type}`,
        correlationId: (activity as any)?.correlation_id
      })) || []

      searchResults = {
        results,
        totalCount: (results as any)?.length || 0
      }
    }

    await (supabase as any)
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        organization_id: (user as any)?.organization_id,
        event_type: 'activity_search',
        entity_type: 'search_query',
        entity_id: `search-${Date.now()}`,
        metadata: {
          query: query.trim(),
          naturalLanguage,
          filters,
          resultCount: (searchResults as any)?.results?.length || 0,
          confidence: naturalLanguage ? (searchResults as any)?.confidence : undefined
        },
        timestamp: new Date().toISOString(),
        correlation_id: `search-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        session_id: `session-${authUser.id}-${Date.now()}`,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        source: 'activity_search'
      } as any)

    return NextResponse.json({
      success: true,
      ...(searchResults as any),
      meta: {
        query: query.trim(),
        naturalLanguage,
        filters,
        organizationId: (user as any)?.organization_id,
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

    const { data: user } = await (supabase as any)
      .from('users')
      .select('organization_id')
      .eq('id', authUser.id)
      .single()

    if (!(user as any)?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'templates': {
        const { data: customTemplates } = await (supabase as any)
          .from('activity_search_templates')
          .select('*')
          .eq('organization_id', (user as any)?.organization_id)
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
            ...((customTemplates as any) || [])
          ]
        })
      }

      case 'suggestions': {
        const suggestions = await ActivitySearchEngine.getSearchSuggestions(
          (user as any)?.organization_id,
          url.searchParams.get('query') || ''
        )
        
        return NextResponse.json({
          success: true,
          suggestions: suggestions as any
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