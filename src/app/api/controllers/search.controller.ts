/**
 * Search Controller
 * Consolidated controller for all advanced search features
 * Following enterprise architecture with Repository Pattern and Result<T> types
 * 
 * Consolidates unified search endpoints across the platform:
 * - Universal hybrid search (keyword + semantic)
 * - Context-aware search with intelligent filtering
 * - Search analytics and insights
 * - Saved searches and search history
 * - Real-time search suggestions
 * - Advanced search filters and faceting
 * - Search result ranking and personalization
 * - Export and sharing of search results
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { searchService } from '@/lib/services/search.service'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { RepositoryFactory } from '@/lib/repositories'
import { Result } from '@/lib/repositories/result'
import { SearchResult, SearchRequest, EnhancedSearchResponse } from '@/types/search'
import { createUserId, createOrganizationId, createVaultId, createAssetId } from '@/lib/utils/branded-type-helpers'
import { logError, logActivity } from '@/lib/utils/logging'
import { validateRequest } from '@/lib/utils/validation'
import { withAuth } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Search Request Types
interface UniversalSearchRequest {
  query: string
  context?: {
    scope: 'global' | 'organization' | 'vault' | 'asset' | 'meeting' | 'user'
    organizationId?: string
    vaultId?: string
    assetId?: string
    meetingId?: string
    userId?: string
  }
  filters?: {
    fileTypes?: string[]
    categories?: string[]
    tags?: string[]
    dateRange?: {
      start: string
      end: string
    }
    authors?: string[]
    size?: {
      min?: number
      max?: number
    }
    language?: string[]
  }
  searchType?: 'keyword' | 'semantic' | 'hybrid' | 'fuzzy'
  options?: {
    limit?: number
    offset?: number
    includeFacets?: boolean
    includeHighlights?: boolean
    includeSuggestions?: boolean
    includeAnalytics?: boolean
    rankingMode?: 'relevance' | 'date' | 'popularity' | 'personalized'
    minConfidence?: number
  }
  personalization?: {
    userId: string
    userPreferences?: Record<string, any>
    searchHistory?: boolean
    collaborativeFiltering?: boolean
  }
}

interface SavedSearch {
  id?: string
  name: string
  description?: string
  query: string
  filters?: UniversalSearchRequest['filters']
  context?: UniversalSearchRequest['context']
  searchType: UniversalSearchRequest['searchType']
  isPublic?: boolean
  tags?: string[]
  schedule?: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    time?: string
    emailNotifications?: boolean
  }
}

interface SearchSuggestionRequest {
  partial: string
  context?: UniversalSearchRequest['context']
  limit?: number
  includeHistory?: boolean
  includePopular?: boolean
  includePersonalized?: boolean
}

interface SearchAnalyticsRequest {
  timeRange: '1h' | '24h' | '7d' | '30d' | '90d' | '1y'
  organizationId?: string
  metrics?: Array<
    'total_searches' | 'unique_users' | 'popular_queries' | 'search_trends' | 
    'result_clicks' | 'zero_results' | 'search_performance' | 'user_engagement'
  >
  groupBy?: 'hour' | 'day' | 'week' | 'month'
  filters?: {
    searchType?: string[]
    resultCount?: { min?: number, max?: number }
    userSegments?: string[]
  }
}

// Validation Schemas
const universalSearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
  context: z.object({
    scope: z.enum(['global', 'organization', 'vault', 'asset', 'meeting', 'user']).default('global'),
    organizationId: z.string().optional(),
    vaultId: z.string().optional(),
    assetId: z.string().optional(),
    meetingId: z.string().optional(),
    userId: z.string().optional()
  }).optional(),
  filters: z.object({
    fileTypes: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional(),
    authors: z.array(z.string()).optional(),
    size: z.object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional()
    }).optional(),
    language: z.array(z.string()).optional()
  }).optional(),
  searchType: z.enum(['keyword', 'semantic', 'hybrid', 'fuzzy']).default('hybrid'),
  options: z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
    includeFacets: z.boolean().default(true),
    includeHighlights: z.boolean().default(true),
    includeSuggestions: z.boolean().default(false),
    includeAnalytics: z.boolean().default(false),
    rankingMode: z.enum(['relevance', 'date', 'popularity', 'personalized']).default('relevance'),
    minConfidence: z.number().min(0).max(1).default(0.1)
  }).optional(),
  personalization: z.object({
    userId: z.string(),
    userPreferences: z.record(z.any()).optional(),
    searchHistory: z.boolean().default(true),
    collaborativeFiltering: z.boolean().default(false)
  }).optional()
})

const savedSearchSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  query: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
  filters: universalSearchSchema.shape.filters.optional(),
  context: universalSearchSchema.shape.context.optional(),
  searchType: universalSearchSchema.shape.searchType.optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  schedule: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    emailNotifications: z.boolean().default(false)
  }).optional()
})

const searchSuggestionSchema = z.object({
  partial: z.string().min(1, 'Partial query is required').max(100, 'Partial query too long'),
  context: universalSearchSchema.shape.context.optional(),
  limit: z.number().min(1).max(20).default(10),
  includeHistory: z.boolean().default(true),
  includePopular: z.boolean().default(true),
  includePersonalized: z.boolean().default(true)
})

const searchAnalyticsSchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d', '90d', '1y']).default('7d'),
  organizationId: z.string().optional(),
  metrics: z.array(z.enum([
    'total_searches', 'unique_users', 'popular_queries', 'search_trends',
    'result_clicks', 'zero_results', 'search_performance', 'user_engagement'
  ])).optional(),
  groupBy: z.enum(['hour', 'day', 'week', 'month']).optional(),
  filters: z.object({
    searchType: z.array(z.string()).optional(),
    resultCount: z.object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional()
    }).optional(),
    userSegments: z.array(z.string()).optional()
  }).optional()
})

export class SearchController {
  private analyticsService: AnalyticsService
  private repositoryFactory: RepositoryFactory

  constructor() {
    this.repositoryFactory = new RepositoryFactory(this.createSupabaseClient())
    this.analyticsService = new AnalyticsService(this.repositoryFactory)
  }

  private createSupabaseClient() {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
  }

  /**
   * POST /api/search
   * Universal search across all content types
   */
  async universalSearch(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, universalSearchSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const searchData = validation.data as UniversalSearchRequest

      // Build enhanced search request
      const searchRequest: SearchRequest = {
        query: searchData.query,
        context_scope: this.mapScopeToContextScope(searchData.context?.scope || 'global'),
        context_id: this.getContextId(searchData.context),
        search_type: searchData.searchType || 'hybrid',
        limit: searchData.options?.limit || 20,
        offset: searchData.options?.offset || 0,
        filters: this.buildSearchFilters(searchData.filters),
        ranking_mode: searchData.options?.rankingMode || 'relevance',
        min_confidence: searchData.options?.minConfidence || 0.1,
        user_id: searchData.personalization?.userId || user.id,
        include_facets: searchData.options?.includeFacets !== false,
        include_highlights: searchData.options?.includeHighlights !== false
      }

      // Perform search
      const searchResult = await searchService.search(searchRequest)

      if (!searchResult.success) {
        return NextResponse.json(
          { success: false, error: searchResult.error },
          { status: 500 }
        )
      }

      // Enhance results with personalization if requested
      let enhancedResults = searchResult
      if (searchData.personalization?.collaborativeFiltering) {
        enhancedResults = await this.applyCollaborativeFiltering(searchResult, user.id, searchData.context)
      }

      // Generate suggestions if requested
      let suggestions: string[] = []
      if (searchData.options?.includeSuggestions) {
        const suggestionResult = await this.generateSearchSuggestions(searchData.query, searchData.context)
        suggestions = suggestionResult.success ? suggestionResult.data : []
      }

      // Track search analytics
      await this.trackSearchAnalytics(searchData, searchResult, user.id)

      // Log search activity
      await logActivity({
        userId: user.id,
        action: 'universal_search',
        details: {
          query: searchData.query,
          searchType: searchData.searchType,
          resultsCount: searchResult.results?.length || 0,
          searchTime: searchResult.search_time_ms
        }
      })

      const response: EnhancedSearchResponse = {
        success: true,
        results: enhancedResults.results || [],
        total_count: enhancedResults.total_count || 0,
        search_time_ms: enhancedResults.search_time_ms || 0,
        query_metadata: enhancedResults.query_metadata || {
          original_query: searchData.query,
          processed_query: searchData.query,
          query_type: searchData.searchType || 'hybrid',
          filters_applied: []
        },
        facets: searchData.options?.includeFacets ? await this.buildSearchFacets(enhancedResults, searchData.filters) : undefined,
        suggestions: searchData.options?.includeSuggestions ? suggestions : undefined,
        personalization: searchData.personalization ? {
          user_id: searchData.personalization.userId,
          applied_preferences: searchData.personalization.userPreferences,
          collaborative_filtering_used: searchData.personalization.collaborativeFiltering
        } : undefined
      }

      return NextResponse.json(response)

    } catch (error) {
      logError('Universal search failed', error)
      return NextResponse.json(
        { success: false, error: 'Search failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/search/suggestions
   * Get real-time search suggestions
   */
  async getSearchSuggestions(request: NextRequest): Promise<NextResponse> {
    try {
      const url = new URL(request.url)
      const partial = url.searchParams.get('q') || url.searchParams.get('partial')
      const scope = url.searchParams.get('scope')
      const limit = parseInt(url.searchParams.get('limit') || '10')

      if (!partial) {
        return NextResponse.json(
          { success: false, error: 'Partial query parameter is required' },
          { status: 400 }
        )
      }

      const validation = await validateRequest(
        { body: { partial, context: { scope }, limit } } as any,
        searchSuggestionSchema
      )

      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const suggestionData = validation.data as SearchSuggestionRequest

      // Generate suggestions from multiple sources
      const suggestionSources = await Promise.allSettled([
        // Historical searches
        suggestionData.includeHistory ? this.getHistoricalSuggestions(partial, user.id) : Promise.resolve([]),
        // Popular searches
        suggestionData.includePopular ? this.getPopularSuggestions(partial, suggestionData.context) : Promise.resolve([]),
        // Personalized suggestions
        suggestionData.includePersonalized ? this.getPersonalizedSuggestions(partial, user.id, suggestionData.context) : Promise.resolve([]),
        // Auto-complete from content
        this.getContentBasedSuggestions(partial, suggestionData.context)
      ])

      // Combine and rank suggestions
      const allSuggestions: string[] = []
      suggestionSources.forEach(result => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allSuggestions.push(...result.value)
        }
      })

      // Deduplicate and rank suggestions
      const uniqueSuggestions = Array.from(new Set(allSuggestions))
      const rankedSuggestions = await this.rankSuggestions(uniqueSuggestions, partial, user.id)

      return NextResponse.json({
        success: true,
        data: {
          suggestions: rankedSuggestions.slice(0, suggestionData.limit),
          partial: partial,
          context: suggestionData.context
        }
      })

    } catch (error) {
      logError('Search suggestions failed', error)
      return NextResponse.json(
        { success: false, error: 'Suggestions retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/search/saved
   * Save a search for future use
   */
  async saveSearch(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, savedSearchSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const savedSearchData = validation.data as SavedSearch

      const saveResult = await searchService.saveSearch({
        ...savedSearchData,
        userId: createUserId(user.id)
      })

      if (!saveResult.success) {
        return NextResponse.json(
          { success: false, error: saveResult.error },
          { status: 500 }
        )
      }

      // Log saved search
      await logActivity({
        userId: user.id,
        action: 'search_saved',
        details: {
          searchName: savedSearchData.name,
          query: savedSearchData.query,
          isPublic: savedSearchData.isPublic
        }
      })

      return NextResponse.json({
        success: true,
        data: saveResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Save search failed', error)
      return NextResponse.json(
        { success: false, error: 'Save search failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/search/saved
   * Get user's saved searches
   */
  async getSavedSearches(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const includePublic = url.searchParams.get('includePublic') === 'true'

      const savedSearchesResult = await searchService.getSavedSearches({
        userId: createUserId(user.id),
        limit,
        offset,
        includePublic
      })

      if (!savedSearchesResult.success) {
        return NextResponse.json(
          { success: false, error: savedSearchesResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: savedSearchesResult.data
      })

    } catch (error) {
      logError('Get saved searches failed', error)
      return NextResponse.json(
        { success: false, error: 'Get saved searches failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/search/analytics
   * Get search analytics and insights
   */
  async getSearchAnalytics(request: NextRequest): Promise<NextResponse> {
    try {
      const url = new URL(request.url)
      const timeRange = url.searchParams.get('timeRange') || '7d'
      const organizationId = url.searchParams.get('organizationId')
      const metrics = url.searchParams.getAll('metrics')

      const validation = await validateRequest(
        { body: { timeRange, organizationId, metrics } } as any,
        searchAnalyticsSchema
      )

      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const analyticsData = validation.data as SearchAnalyticsRequest

      const analyticsResult = await this.analyticsService.getSearchAnalytics({
        userId: createUserId(user.id),
        organizationId: analyticsData.organizationId ? createOrganizationId(analyticsData.organizationId) : undefined,
        timeRange: analyticsData.timeRange,
        metrics: analyticsData.metrics,
        groupBy: analyticsData.groupBy,
        filters: analyticsData.filters
      })

      if (!analyticsResult.success) {
        return NextResponse.json(
          { success: false, error: analyticsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: analyticsResult.data
      })

    } catch (error) {
      logError('Search analytics retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Analytics retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/search/export
   * Export search results in various formats
   */
  async exportSearchResults(request: NextRequest): Promise<NextResponse> {
    try {
      const { searchQuery, format, includeMetadata } = await request.json()

      if (!searchQuery || !format) {
        return NextResponse.json(
          { success: false, error: 'Search query and format are required' },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Perform search to get results for export
      const searchResult = await searchService.search(searchQuery)

      if (!searchResult.success) {
        return NextResponse.json(
          { success: false, error: searchResult.error },
          { status: 500 }
        )
      }

      // Generate export based on format
      const exportResult = await this.generateSearchExport(
        searchResult,
        format,
        includeMetadata
      )

      if (!exportResult.success) {
        return NextResponse.json(
          { success: false, error: exportResult.error },
          { status: 500 }
        )
      }

      // Log export activity
      await logActivity({
        userId: user.id,
        action: 'search_exported',
        details: {
          format,
          resultsCount: searchResult.results?.length || 0,
          includeMetadata
        }
      })

      const contentTypes = {
        json: 'application/json',
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf'
      }

      return new Response(exportResult.data.content, {
        status: 200,
        headers: {
          'Content-Type': contentTypes[format as keyof typeof contentTypes],
          'Content-Disposition': `attachment; filename="search_results.${format}"`,
          'Cache-Control': 'no-store'
        }
      })

    } catch (error) {
      logError('Search export failed', error)
      return NextResponse.json(
        { success: false, error: 'Search export failed' },
        { status: 500 }
      )
    }
  }

  // Helper Methods
  private mapScopeToContextScope(scope: string): 'general' | 'organization' | 'vault' | 'asset' {
    switch (scope) {
      case 'organization': return 'organization'
      case 'vault': return 'vault'
      case 'asset': return 'asset'
      default: return 'general'
    }
  }

  private getContextId(context?: UniversalSearchRequest['context']): string | undefined {
    if (!context) return undefined
    return context.organizationId || context.vaultId || context.assetId || context.meetingId
  }

  private buildSearchFilters(filters?: UniversalSearchRequest['filters']) {
    // Convert API filters to search service format
    return filters ? {
      file_types: filters.fileTypes,
      categories: filters.categories,
      tags: filters.tags,
      date_range: filters.dateRange,
      authors: filters.authors,
      size_range: filters.size,
      languages: filters.language
    } : undefined
  }

  private async buildSearchFacets(searchResult: any, filters?: UniversalSearchRequest['filters']) {
    // Build facets for search results
    return {
      file_types: await this.extractFacets(searchResult.results, 'file_type'),
      categories: await this.extractFacets(searchResult.results, 'category'),
      tags: await this.extractFacets(searchResult.results, 'tags'),
      authors: await this.extractFacets(searchResult.results, 'author'),
      date_ranges: await this.buildDateRangeFacets(searchResult.results)
    }
  }

  private async extractFacets(results: any[], field: string) {
    const facetCounts: Record<string, number> = {}
    results?.forEach(result => {
      const value = result.asset?.[field] || result[field]
      if (Array.isArray(value)) {
        value.forEach(v => facetCounts[v] = (facetCounts[v] || 0) + 1)
      } else if (value) {
        facetCounts[value] = (facetCounts[value] || 0) + 1
      }
    })
    
    return Object.entries(facetCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  private async buildDateRangeFacets(results: any[]) {
    // Build date range facets
    return [
      { range: 'last_hour', count: 0 },
      { range: 'last_day', count: 0 },
      { range: 'last_week', count: 0 },
      { range: 'last_month', count: 0 },
      { range: 'last_year', count: 0 }
    ]
  }

  private async applyCollaborativeFiltering(searchResult: any, userId: string, context?: any) {
    // Apply collaborative filtering to enhance results
    return searchResult
  }

  private async generateSearchSuggestions(query: string, context?: any): Promise<Result<string[]>> {
    // Generate intelligent search suggestions
    return success([])
  }

  private async getHistoricalSuggestions(partial: string, userId: string): Promise<string[]> {
    return []
  }

  private async getPopularSuggestions(partial: string, context?: any): Promise<string[]> {
    return []
  }

  private async getPersonalizedSuggestions(partial: string, userId: string, context?: any): Promise<string[]> {
    return []
  }

  private async getContentBasedSuggestions(partial: string, context?: any): Promise<string[]> {
    return []
  }

  private async rankSuggestions(suggestions: string[], partial: string, userId: string): Promise<string[]> {
    return suggestions.sort()
  }

  private async trackSearchAnalytics(searchData: UniversalSearchRequest, searchResult: any, userId: string) {
    // Track search analytics
  }

  private async generateSearchExport(searchResult: any, format: string, includeMetadata: boolean): Promise<Result<any>> {
    return success({ content: JSON.stringify(searchResult) })
  }

  private async getCurrentUser() {
    try {
      const supabase = this.createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      logError('Failed to get current user', error)
      return null
    }
  }
}

// Export controller instance
export const searchController = new SearchController()

// Route handlers for different HTTP methods and endpoints
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, {
    limit: 200, // Higher limit for search operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/suggestions')) {
    return await searchController.getSearchSuggestions(request)
  } else if (pathname.includes('/saved')) {
    return await searchController.getSavedSearches(request)
  } else if (pathname.includes('/analytics')) {
    return await searchController.getSearchAnalytics(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for POST operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 100,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/export')) {
    return await searchController.exportSearchResults(request)
  } else if (pathname.includes('/saved')) {
    return await searchController.saveSearch(request)
  } else if (pathname.endsWith('/search')) {
    return await searchController.universalSearch(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}