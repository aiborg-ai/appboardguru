import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import {
  SearchRequest,
  SearchResponse,
  SearchResult,
  AssetSearchMetadata,
  SimilaritySearchRequest,
  SimilaritySearchResult,
  EmbeddingRequest,
  EmbeddingResponse,
  SearchConfig
} from '../../types/search'

export class SearchService {
  private supabase: SupabaseClient<Database> | null = null
  private config: SearchConfig

  constructor() {
    this.config = {
      max_results: 50,
      similarity_threshold: 0.7,
      boost_factors: {
        title: 2.0,
        content: 1.0,
        tags: 1.5,
        recency: 0.3,
        popularity: 0.4
      },
      embedding_model: 'text-embedding-3-small',
      enable_fuzzy_search: true,
      enable_stemming: true,
      language: 'english'
    }
  }

  private async getSupabaseClient(): Promise<SupabaseClient<Database>> {
    if (this.supabase) return this.supabase

    const cookieStore = await cookies()
    this.supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: unknown }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    return this.supabase
  }

  /**
   * Generate embeddings using OpenAI API
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env['OPENAI_API_KEY']}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: this.config.embedding_model,
          encoding_format: 'float'
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json() as { data: Array<{ embedding: number[] }> }
      return data.data[0]?.embedding || []
    } catch (error) {
      console.error('Failed to generate embedding:', error)
      return []
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i]
      const bVal = b[i]
      if (aVal !== undefined && bVal !== undefined && aVal !== null && bVal !== null) {
        dotProduct += aVal * bVal
        normA += aVal * aVal
        normB += bVal * bVal
      }
    }

    if (normA === 0 || normB === 0) return 0
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * Perform full-text search using PostgreSQL
   */
  private async fullTextSearch(
    query: string,
    filters: SearchRequest['filters'] = {},
    contextFilters: { organizationId?: string; vaultId?: string; assetId?: string } = {},
    limit: number = 20
  ): Promise<SearchResult[]> {
    const supabase = await this.getSupabaseClient()
    
    // Build the SQL query for full-text search
    let sqlQuery = `
      SELECT DISTINCT
        a.id,
        a.title,
        a.description,
        a.file_name,
        a.file_type,
        a.file_size,
        a.category,
        a.tags,
        a.thumbnail_url,
        a.created_at,
        a.updated_at,
        a.owner_id,
        asm.ai_summary,
        asm.ai_key_topics,
        asm.relevance_score,
        asm.popularity_score,
        asm.recency_score,
        asm.estimated_read_time,
        asm.complexity_level,
        -- Calculate rank for full-text search
        ts_rank(asm.search_vector, plainto_tsquery('english', $1)) as text_rank,
        -- Highlight matched terms
        ts_headline('english', COALESCE(a.description, a.title), plainto_tsquery('english', $1)) as highlight_content,
        ts_headline('english', a.title, plainto_tsquery('english', $1)) as highlight_title,
        -- Join vault and organization info
        v.id as vault_id,
        v.name as vault_name,
        org.id as organization_id,
        org.name as organization_name,
        u.full_name as owner_name,
        u.email as owner_email
      FROM assets a
      LEFT JOIN asset_search_metadata asm ON a.id = asm.asset_id
      LEFT JOIN vault_assets va ON a.id = va.asset_id
      LEFT JOIN vaults v ON va.vault_id = v.id
      LEFT JOIN organizations org ON v.organization_id = org.id
      LEFT JOIN auth.users u ON a.owner_id = u.id
      WHERE a.is_deleted = false
        AND (asm.search_vector @@ plainto_tsquery('english', $1) OR a.title ILIKE $2 OR a.description ILIKE $2)
    `

    const queryParams: unknown[] = [query, `%${query}%`]
    let paramIndex = 2

    // Add context filters
    if (contextFilters.organizationId) {
      sqlQuery += ` AND org.id = $${++paramIndex}`
      queryParams.push(contextFilters.organizationId)
    }

    if (contextFilters.vaultId) {
      sqlQuery += ` AND v.id = $${++paramIndex}`
      queryParams.push(contextFilters.vaultId)
    }

    if (contextFilters.assetId) {
      sqlQuery += ` AND a.id = $${++paramIndex}`
      queryParams.push(contextFilters.assetId)
    }

    // Add file type filters
    if (filters.file_types && filters.file_types.length > 0) {
      sqlQuery += ` AND a.file_type = ANY($${++paramIndex})`
      queryParams.push(filters.file_types)
    }

    // Add category filters
    if (filters.categories && filters.categories.length > 0) {
      sqlQuery += ` AND a.category = ANY($${++paramIndex})`
      queryParams.push(filters.categories)
    }

    // Add date range filter
    if (filters.date_range) {
      sqlQuery += ` AND a.created_at BETWEEN $${++paramIndex} AND $${++paramIndex}`
      queryParams.push(filters.date_range.start, filters.date_range.end)
    }

    // Add relevance threshold
    if (filters.min_relevance) {
      sqlQuery += ` AND COALESCE(asm.relevance_score, 0) >= $${++paramIndex}`
      queryParams.push(filters.min_relevance)
    }

    // Order by relevance
    sqlQuery += `
      ORDER BY 
        ts_rank(asm.search_vector, plainto_tsquery('english', $1)) DESC,
        asm.relevance_score DESC,
        asm.popularity_score DESC,
        a.created_at DESC
      LIMIT $${++paramIndex}
    `
    queryParams.push(limit)

    const { data, error } = await supabase.rpc('execute_sql', {
      sql: sqlQuery,
      params: queryParams
    })

    if (error) {
      console.error('Full-text search error:', error)
      return []
    }

    // Transform results to SearchResult format
    return (data as unknown[]).map((row: unknown) => this.transformToSearchResult(row as Record<string, unknown>))
  }

  /**
   * Perform semantic search using embeddings
   */
  private async semanticSearch(
    query: string,
    contextFilters: { organizationId?: string; vaultId?: string; assetId?: string } = {},
    limit: number = 20
  ): Promise<SearchResult[]> {
    const supabase = await this.getSupabaseClient()
    
    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query)
    if (queryEmbedding.length === 0) {
      return []
    }

    // Get assets with embeddings
    let query_builder = supabase
      .from('asset_search_metadata')
      .select(`
        *,
        asset:assets!inner(
          id, title, description, file_name, file_type, file_size,
          category, tags, thumbnail_url, created_at, updated_at, owner_id,
          owner:auth.users!assets_owner_id_fkey(id, full_name, email)
        )
      `)
      .not('title_embedding', 'is', null)

    // Apply context filters through joins
    if (contextFilters.organizationId || contextFilters.vaultId) {
      query_builder = query_builder
        .select(`
          *,
          asset:assets!inner(
            id, title, description, file_name, file_type, file_size,
            category, tags, thumbnail_url, created_at, updated_at, owner_id,
            owner:auth.users!assets_owner_id_fkey(id, full_name, email),
            vault_assets!inner(
              vault:vaults!inner(
                id, name, organization_id,
                organization:organizations!inner(id, name)
              )
            )
          )
        `)

      if (contextFilters.organizationId) {
        query_builder = query_builder
          .eq('asset.vault_assets.vault.organization_id', contextFilters.organizationId)
      }

      if (contextFilters.vaultId) {
        query_builder = query_builder
          .eq('asset.vault_assets.vault_id', contextFilters.vaultId)
      }
    }

    if (contextFilters.assetId) {
      query_builder = query_builder.eq('asset_id', contextFilters.assetId)
    }

    const { data, error } = await query_builder.limit(limit * 2) // Get more for similarity calculation

    if (error) {
      console.error('Semantic search error:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Calculate similarities and rank results
    const resultsWithSimilarity = data
      .map((row: Record<string, unknown>) => {
        const titleEmbedding = row.title_embedding
        const contentEmbedding = row.content_embedding

        let maxSimilarity = 0
        if (titleEmbedding && Array.isArray(titleEmbedding)) {
          const titleSim = this.cosineSimilarity(queryEmbedding, titleEmbedding)
          maxSimilarity = Math.max(maxSimilarity, titleSim * this.config.boost_factors.title)
        }

        if (contentEmbedding && Array.isArray(contentEmbedding)) {
          const contentSim = this.cosineSimilarity(queryEmbedding, contentEmbedding)
          maxSimilarity = Math.max(maxSimilarity, contentSim * this.config.boost_factors.content)
        }

        return {
          ...row,
          similarity_score: maxSimilarity
        }
      })
      .filter((row: Record<string, unknown> & { similarity_score: number }) => row.similarity_score >= this.config.similarity_threshold)
      .sort((a: Record<string, unknown> & { similarity_score: number }, b: Record<string, unknown> & { similarity_score: number }) => b.similarity_score - a.similarity_score)
      .slice(0, limit)

    return resultsWithSimilarity.map((row: unknown) => this.transformToSearchResult(row as Record<string, unknown>))
  }

  /**
   * Transform database row to SearchResult format
   */
  private transformToSearchResult(row: Record<string, unknown>): SearchResult {
    const asset = row.asset || row
    return {
      asset: {
        id: asset.id,
        title: asset.title,
        description: asset.description,
        file_name: asset.file_name,
        file_type: asset.file_type,
        file_size: asset.file_size,
        category: asset.category,
        tags: asset.tags || [],
        thumbnail_url: asset.thumbnail_url,
        created_at: asset.created_at,
        updated_at: asset.updated_at,
        owner: asset.owner ? {
          id: asset.owner.id,
          full_name: asset.owner.full_name,
          email: asset.owner.email
        } : undefined
      },
      metadata: {
        ai_summary: row.ai_summary,
        ai_key_topics: row.ai_key_topics || [],
        relevance_score: row.relevance_score || 0,
        popularity_score: row.popularity_score || 0,
        recency_score: row.recency_score || 0,
        estimated_read_time: row.estimated_read_time,
        complexity_level: row.complexity_level || 'medium'
      },
      vault: row.vault_name ? {
        id: row.vault_id,
        name: row.vault_name
      } : undefined,
      organization: row.organization_name ? {
        id: row.organization_id,
        name: row.organization_name
      } : undefined,
      highlight: {
        title: row.highlight_title,
        description: row.highlight_content,
        content: row.highlight_content
      },
      access_url: `/dashboard/assets/${asset.id}`,
      download_url: `/api/assets/${asset.id}/download`
    }
  }

  /**
   * Main search method that combines full-text and semantic search
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now()
    
    try {
      const {
        query,
        context_scope,
        context_id,
        limit = 20,
        offset = 0,
        filters = {},
        sort_by = 'relevance',
        search_type = 'hybrid'
      } = request

      // Determine context filters based on scope
      const contextFilters: { organizationId?: string; vaultId?: string; assetId?: string } = {}
      
      if (context_scope === 'organization' && context_id) {
        contextFilters.organizationId = context_id
      } else if (context_scope === 'vault' && context_id) {
        contextFilters.vaultId = context_id
      } else if (context_scope === 'asset' && context_id) {
        contextFilters.assetId = context_id
      }

      let results: SearchResult[] = []

      if (search_type === 'hybrid' || search_type === 'keyword') {
        // Perform full-text search
        const textResults = await this.fullTextSearch(
          query,
          filters,
          contextFilters,
          limit + offset
        )
        results = results.concat(textResults)
      }

      if (search_type === 'hybrid' || search_type === 'semantic') {
        // Perform semantic search
        const semanticResults = await this.semanticSearch(
          query,
          contextFilters,
          Math.ceil(limit / 2)
        )
        
        // Merge and deduplicate results
        const existingIds = new Set(results.map(r => r.asset.id))
        const newSemanticResults = semanticResults.filter(r => !existingIds.has(r.asset.id))
        results = results.concat(newSemanticResults)
      }

      // Remove duplicates and apply hybrid ranking
      const uniqueResults = this.deduplicateAndRank(results, sort_by)

      // Apply pagination
      const paginatedResults = uniqueResults.slice(offset, offset + limit)

      // Generate facets
      const facets = await this.generateFacets(query, contextFilters)

      const searchTime = Date.now() - startTime

      return {
        results: paginatedResults,
        total_count: uniqueResults.length,
        page: Math.floor(offset / limit) + 1,
        limit: limit,
        total_pages: Math.ceil(uniqueResults.length / limit),
        search_time_ms: searchTime,
        facets,
        suggestions: await this.generateSuggestions(query, context_scope)
      }

    } catch (error) {
      console.error('Search error:', error)
      const { limit = 20 } = request
      return {
        results: [],
        total_count: 0,
        page: 1,
        limit: limit,
        total_pages: 0,
        search_time_ms: Date.now() - startTime
      }
    }
  }

  /**
   * Deduplicate results and apply hybrid ranking
   */
  private deduplicateAndRank(results: SearchResult[], sortBy: string): SearchResult[] {
    const uniqueResults = new Map<string, SearchResult>()

    // Deduplicate and merge scores
    results.forEach(result => {
      const existingResult = uniqueResults.get(result.asset.id)
      if (existingResult) {
        // Merge scores (take the best)
        existingResult.metadata.relevance_score = Math.max(
          existingResult.metadata.relevance_score,
          result.metadata.relevance_score
        )
      } else {
        uniqueResults.set(result.asset.id, result)
      }
    })

    const deduplicated = Array.from(uniqueResults.values())

    // Apply sorting
    return deduplicated.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.metadata.relevance_score - a.metadata.relevance_score
        case 'popularity':
          return b.metadata.popularity_score - a.metadata.popularity_score
        case 'recency':
          return new Date(b.asset.created_at).getTime() - new Date(a.asset.created_at).getTime()
        case 'title':
          return a.asset.title.localeCompare(b.asset.title)
        case 'created_at':
          return new Date(b.asset.created_at).getTime() - new Date(a.asset.created_at).getTime()
        default:
          return b.metadata.relevance_score - a.metadata.relevance_score
      }
    })
  }

  /**
   * Generate search facets for filtering
   */
  private async generateFacets(
    query: string,
    contextFilters: { organizationId?: string; vaultId?: string; assetId?: string }
  ): Promise<SearchResponse['facets']> {
    const supabase = await this.getSupabaseClient()

    try {
      // Build base query for facets
      let baseQuery = supabase
        .from('assets')
        .select('file_type, category, vault_assets(vault:vaults(id, name, organization:organizations(id, name)))')
        .eq('is_deleted', false)

      // Apply context filters
      if (contextFilters.organizationId) {
        baseQuery = baseQuery.eq('vault_assets.vault.organization_id', contextFilters.organizationId)
      }
      if (contextFilters.vaultId) {
        baseQuery = baseQuery.eq('vault_assets.vault_id', contextFilters.vaultId)
      }

      const { data } = await baseQuery.limit(1000)

      if (!data) return undefined

      // Calculate facets
      const fileTypes = new Map<string, number>()
      const categories = new Map<string, number>()
      const organizations = new Map<string, { count: number; label: string }>()
      const vaults = new Map<string, { count: number; label: string }>()

      data.forEach((asset: Record<string, any>) => {
        // File types
        fileTypes.set(asset.file_type, (fileTypes.get(asset.file_type) || 0) + 1)
        
        // Categories
        categories.set(asset.category, (categories.get(asset.category) || 0) + 1)

        // Organizations and vaults from vault_assets
        if (asset.vault_assets && Array.isArray(asset.vault_assets)) {
          asset.vault_assets.forEach((va: Record<string, any>) => {
            if (va.vault?.organization) {
              const orgId = va.vault.organization.id
              const orgName = va.vault.organization.name
              const existing = organizations.get(orgId) || { count: 0, label: orgName }
              organizations.set(orgId, { count: existing.count + 1, label: orgName })
            }
            
            if (va.vault) {
              const vaultId = va.vault.id
              const vaultName = va.vault.name
              const existing = vaults.get(vaultId) || { count: 0, label: vaultName }
              vaults.set(vaultId, { count: existing.count + 1, label: vaultName })
            }
          })
        }
      })

      return {
        file_types: Array.from(fileTypes.entries()).map(([value, count]) => ({ value, count })),
        categories: Array.from(categories.entries()).map(([value, count]) => ({ value, count })),
        organizations: Array.from(organizations.entries()).map(([value, data]) => ({ 
          value, 
          count: data.count, 
          label: data.label 
        } as any)),
        vaults: Array.from(vaults.entries()).map(([value, data]) => ({ 
          value, 
          count: data.count, 
          label: data.label 
        } as any))
      }
    } catch (error) {
      console.error('Error generating facets:', error)
      return undefined
    }
  }

  /**
   * Generate search suggestions based on query and context
   */
  private async generateSuggestions(query: string, contextScope: string): Promise<string[]> {
    // Simple suggestion logic - can be enhanced with ML models
    const suggestions: string[] = []

    if (query.length > 2) {
      // Add common search variations
      suggestions.push(
        `${query} report`,
        `${query} analysis`,
        `${query} document`,
        `${query} presentation`
      )

      // Add context-specific suggestions
      if (contextScope === 'organization') {
        suggestions.push(
          `${query} board meeting`,
          `${query} governance`,
          `${query} compliance`
        )
      } else if (contextScope === 'vault') {
        suggestions.push(
          `${query} shared`,
          `${query} collaboration`
        )
      }
    }

    return suggestions.slice(0, 5)
  }

  /**
   * Update asset search metadata with AI-generated content
   */
  async updateAssetSearchMetadata(
    assetId: string,
    summary: string,
    keyTopics: string[],
    categories: string[] = []
  ): Promise<void> {
    const supabase = await this.getSupabaseClient()

    try {
      // Generate embeddings for title and summary
      const asset = await supabase
        .from('assets')
        .select('title, description')
        .eq('id', assetId)
        .single()

      if (!asset.data) return

      const titleEmbedding = await this.generateEmbedding(asset.data.title)
      const contentEmbedding = await this.generateEmbedding(summary || asset.data.description || '')

      // Update or insert search metadata
      const { error } = await supabase
        .from('asset_search_metadata')
        .upsert({
          asset_id: assetId,
          search_text: summary || '',
          keywords: keyTopics,
          indexed_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        } as any)

      if (error) {
        console.error('Error updating asset search metadata:', error)
      }

      // Update relevance score
      await (supabase as any).rpc('update_asset_relevance_score', { asset_uuid: assetId })

    } catch (error) {
      console.error('Error in updateAssetSearchMetadata:', error)
    }
  }

  /**
   * Track search query for analytics and learning
   */
  async trackSearchQuery(
    query: string,
    contextScope: string,
    contextId: string | undefined,
    userId: string | undefined,
    organizationId: string | undefined,
    resultsCount: number,
    searchDuration: number
  ): Promise<void> {
    const supabase = await this.getSupabaseClient()

    try {
      await supabase
        .from('search_queries')
        .insert({
          user_id: userId!,
          organization_id: organizationId,
          query_text: query,
          query_type: 'chat',
          context_scope: contextScope,
          context_id: contextId,
          results_count: resultsCount,
          search_duration_ms: searchDuration
        } as any)
    } catch (error) {
      console.error('Error tracking search query:', error)
    }
  }

  /**
   * Record asset access for analytics
   */
  async recordAssetAccess(
    assetId: string,
    userId: string | undefined,
    organizationId: string | undefined,
    accessType: 'view' | 'download' | 'search_result' | 'ai_reference',
    accessSource: 'chat' | 'search' | 'direct' | 'recommendation',
    contextData?: Record<string, any>
  ): Promise<void> {
    const supabase = await this.getSupabaseClient()

    try {
      await supabase
        .from('asset_access_analytics')
        .insert({
          asset_id: assetId,
          user_id: userId!,
          organization_id: organizationId,
          access_type: accessType,
          access_source: accessSource,
          context_data: contextData
        } as any)

      // Update asset view count
      if (accessType === 'view') {
        await (supabase as any).rpc('increment', {
          table_name: 'assets',
          row_id: assetId,
          column_name: 'view_count'
        } as any)
      } else if (accessType === 'download') {
        await (supabase as any).rpc('increment', {
          table_name: 'assets',
          row_id: assetId,
          column_name: 'download_count'
        } as any)
      }

    } catch (error) {
      console.error('Error recording asset access:', error)
    }
  }
}

// Singleton instance
export const searchService = new SearchService()