import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  assetId: z.string().optional(),
  annotationType: z.enum(['highlight', 'area', 'textbox', 'drawing', 'stamp', 'voice']).optional(),
  pageNumber: z.number().int().positive().optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  isPrivate: z.boolean().optional(),
  isResolved: z.boolean().optional(),
  includeReplies: z.boolean().default(false),
  searchMode: z.enum(['content', 'comments', 'transcripts', 'all']).default('all'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['relevance', 'date', 'type', 'user']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      )
    }

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    // Convert string values to appropriate types
    if (queryParams.pageNumber) queryParams.pageNumber = parseInt(queryParams.pageNumber)
    if (queryParams.limit) queryParams.limit = parseInt(queryParams.limit)
    if (queryParams.offset) queryParams.offset = parseInt(queryParams.offset)
    if (queryParams.includeReplies) queryParams.includeReplies = queryParams.includeReplies === 'true'
    if (queryParams.isPrivate) queryParams.isPrivate = queryParams.isPrivate === 'true'
    if (queryParams.isResolved) queryParams.isResolved = queryParams.isResolved === 'true'

    const validation = searchSchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid search parameters',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const params = validation.data

    // Build search query
    let query = supabase
      .from('asset_annotations')
      .select(`
        id,
        asset_id,
        organization_id,
        created_by,
        annotation_type,
        content,
        page_number,
        position,
        selected_text,
        comment_text,
        color,
        opacity,
        is_private,
        is_resolved,
        created_at,
        updated_at,
        users!created_by (
          id,
          full_name,
          avatar_url
        ),
        assets!asset_id (
          id,
          file_name,
          organization_id
        )
        ${params.includeReplies ? `,
        annotation_replies (
          id,
          reply_text,
          created_by,
          created_at,
          users!created_by (
            id,
            full_name,
            avatar_url
          )
        )` : ''}
      `)
      .eq('is_deleted', false)

    // Apply filters based on user permissions
    // Users can only see annotations from their organization
    const { data: userOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)

    if (userOrgs && userOrgs.length > 0) {
      const orgIds = userOrgs.map(org => org.organization_id)
      query = query.in('organization_id', orgIds)
    } else {
      // User has no organizations, return empty results
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          total: 0,
          query: params.query,
          filters: params,
          searchTime: Date.now()
        }
      })
    }

    // Apply search filters
    if (params.assetId) {
      query = query.eq('asset_id', params.assetId)
    }
    
    if (params.annotationType) {
      query = query.eq('annotation_type', params.annotationType)
    }
    
    if (params.pageNumber) {
      query = query.eq('page_number', params.pageNumber)
    }
    
    if (params.userId) {
      query = query.eq('created_by', params.userId)
    }
    
    if (params.isPrivate !== undefined) {
      query = query.eq('is_private', params.isPrivate)
    }
    
    if (params.isResolved !== undefined) {
      query = query.eq('is_resolved', params.isResolved)
    }
    
    if (params.dateFrom) {
      query = query.gte('created_at', params.dateFrom)
    }
    
    if (params.dateTo) {
      query = query.lte('created_at', params.dateTo)
    }

    // Apply text search based on search mode
    const searchText = params.query.toLowerCase()
    
    switch (params.searchMode) {
      case 'content':
        query = query.or(`selected_text.ilike.%${searchText}%,content->>text.ilike.%${searchText}%`)
        break
      case 'comments':
        query = query.ilike('comment_text', `%${searchText}%`)
        break
      case 'transcripts':
        query = query.ilike('content->>audioTranscription', `%${searchText}%`)
        break
      default: // 'all'
        query = query.or(`
          selected_text.ilike.%${searchText}%,
          comment_text.ilike.%${searchText}%,
          content->>text.ilike.%${searchText}%,
          content->>audioTranscription.ilike.%${searchText}%
        `)
    }

    // Apply sorting
    switch (params.sortBy) {
      case 'date':
        query = query.order('created_at', { ascending: params.sortOrder === 'asc' })
        break
      case 'type':
        query = query.order('annotation_type', { ascending: params.sortOrder === 'asc' })
        break
      case 'user':
        // Note: This requires a join, simplified approach
        query = query.order('created_by', { ascending: params.sortOrder === 'asc' })
        break
      default: // 'relevance'
        // For relevance, we'll order by match quality (simplified)
        query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    query = query.range(params.offset, params.offset + params.limit - 1)

    const startTime = Date.now()
    const { data: results, error: searchError } = await query

    if (searchError) {
      console.error('Search error:', searchError)
      return NextResponse.json(
        { success: false, error: 'Search failed' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('asset_annotations')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false)

    // Apply the same filters for count
    if (userOrgs && userOrgs.length > 0) {
      const orgIds = userOrgs.map(org => org.organization_id)
      countQuery = countQuery.in('organization_id', orgIds)
    }

    if (params.assetId) countQuery = countQuery.eq('asset_id', params.assetId)
    if (params.annotationType) countQuery = countQuery.eq('annotation_type', params.annotationType)
    if (params.pageNumber) countQuery = countQuery.eq('page_number', params.pageNumber)
    if (params.userId) countQuery = countQuery.eq('created_by', params.userId)
    if (params.isPrivate !== undefined) countQuery = countQuery.eq('is_private', params.isPrivate)
    if (params.isResolved !== undefined) countQuery = countQuery.eq('is_resolved', params.isResolved)
    if (params.dateFrom) countQuery = countQuery.gte('created_at', params.dateFrom)
    if (params.dateTo) countQuery = countQuery.lte('created_at', params.dateTo)

    // Apply text search to count query
    switch (params.searchMode) {
      case 'content':
        countQuery = countQuery.or(`selected_text.ilike.%${searchText}%,content->>text.ilike.%${searchText}%`)
        break
      case 'comments':
        countQuery = countQuery.ilike('comment_text', `%${searchText}%`)
        break
      case 'transcripts':
        countQuery = countQuery.ilike('content->>audioTranscription', `%${searchText}%`)
        break
      default:
        countQuery = countQuery.or(`
          selected_text.ilike.%${searchText}%,
          comment_text.ilike.%${searchText}%,
          content->>text.ilike.%${searchText}%,
          content->>audioTranscription.ilike.%${searchText}%
        `)
    }

    const { count } = await countQuery

    const searchTime = Date.now() - startTime

    // Process results to add search relevance scores and highlights
    const processedResults = results?.map(result => ({
      ...result,
      searchScore: calculateRelevanceScore(result, params.query),
      highlightedContent: highlightSearchTerms(result, params.query, params.searchMode)
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        results: processedResults,
        total: count || 0,
        query: params.query,
        filters: params,
        searchTime,
        aggregations: await getSearchAggregations(supabase, params, userOrgs?.map(org => org.organization_id) || [])
      }
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateRelevanceScore(annotation: any, query: string): number {
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
  let score = 0

  searchTerms.forEach(term => {
    // Higher score for exact matches in different fields
    if (annotation.selected_text?.toLowerCase().includes(term)) score += 3
    if (annotation.comment_text?.toLowerCase().includes(term)) score += 2
    if (annotation.content?.text?.toLowerCase().includes(term)) score += 2
    if (annotation.content?.audioTranscription?.toLowerCase().includes(term)) score += 1
  })

  return Math.min(score, 10) // Cap at 10
}

function highlightSearchTerms(annotation: any, query: string, mode: string): any {
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
  const highlighted = { ...annotation }

  const highlightText = (text: string | null | undefined): string => {
    if (!text) return ''
    
    let result = text
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      result = result.replace(regex, '<mark>$1</mark>')
    })
    return result
  }

  if (mode === 'all' || mode === 'content') {
    if (highlighted.selected_text) {
      highlighted.highlightedSelectedText = highlightText(highlighted.selected_text)
    }
    if (highlighted.content?.text) {
      highlighted.highlightedContentText = highlightText(highlighted.content.text)
    }
  }

  if (mode === 'all' || mode === 'comments') {
    if (highlighted.comment_text) {
      highlighted.highlightedCommentText = highlightText(highlighted.comment_text)
    }
  }

  if (mode === 'all' || mode === 'transcripts') {
    if (highlighted.content?.audioTranscription) {
      highlighted.highlightedTranscription = highlightText(highlighted.content.audioTranscription)
    }
  }

  return highlighted
}

async function getSearchAggregations(supabase: any, params: any, orgIds: string[]) {
  // Get aggregation data for search facets
  try {
    const [typeAggs, userAggs, dateAggs] = await Promise.all([
      // Annotation type aggregation
      supabase
        .from('asset_annotations')
        .select('annotation_type')
        .eq('is_deleted', false)
        .in('organization_id', orgIds),
      
      // User aggregation  
      supabase
        .from('asset_annotations')
        .select(`
          created_by,
          users!created_by (full_name)
        `)
        .eq('is_deleted', false)
        .in('organization_id', orgIds),
        
      // Date range aggregation (simplified)
      supabase
        .from('asset_annotations')
        .select('created_at')
        .eq('is_deleted', false)
        .in('organization_id', orgIds)
        .order('created_at', { ascending: false })
        .limit(1000)
    ])

    return {
      types: groupBy(typeAggs.data || [], 'annotation_type'),
      users: groupBy(userAggs.data || [], 'created_by'),
      dateRanges: getDateRangeAggregation(dateAggs.data || [])
    }
  } catch (error) {
    console.error('Aggregation error:', error)
    return { types: {}, users: {}, dateRanges: {} }
  }
}

function groupBy(array: any[], key: string): Record<string, number> {
  return array.reduce((acc, item) => {
    const value = item[key]
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}

function getDateRangeAggregation(dateData: any[]): Record<string, number> {
  const now = new Date()
  const ranges = {
    'today': 0,
    'this_week': 0,
    'this_month': 0,
    'this_year': 0,
    'older': 0
  }

  dateData.forEach(item => {
    const date = new Date(item.created_at)
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) ranges.today++
    else if (diffDays <= 7) ranges.this_week++
    else if (diffDays <= 30) ranges.this_month++
    else if (diffDays <= 365) ranges.this_year++
    else ranges.older++
  })

  return ranges
}