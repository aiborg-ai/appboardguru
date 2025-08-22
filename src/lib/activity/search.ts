/**
 * Intelligent Activity Search Engine
 * Natural language search with advanced filtering and correlation
 */

import { createSupabaseServerClient } from '@/lib/supabase-server'

export interface SearchQuery {
  text?: string
  filters: {
    dateRange?: { start: string; end: string }
    activityTypes?: string[]
    userIds?: string[]
    resourceTypes?: string[]
    severity?: string[]
    outcome?: string[]
    departments?: string[]
  }
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
  limit?: number
  offset?: number
}

export interface SearchResult {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  user: {
    id: string
    name: string
    email: string
  }
  resource?: {
    type: string
    id: string
    name?: string
  }
  severity: string
  outcome: string
  correlatedEvents?: SearchResult[]
  relevanceScore: number
}

export interface SavedSearch {
  id: string
  name: string
  description?: string
  query: SearchQuery
  isPublic: boolean
  usageCount: number
  lastUsed: string
  createdBy: string
}

export class ActivitySearchEngine {
  /**
   * Natural language search with AI parsing
   */
  static async searchWithNaturalLanguage(
    organizationId: string,
    naturalQuery: string,
    userId: string
  ): Promise<{ results: SearchResult[]; parsedQuery: SearchQuery; confidence: number }> {
    try {
      // Parse natural language into structured query
      const parsedQuery = await this.parseNaturalLanguage(naturalQuery)
      
      // Execute the parsed query
      const results = await this.executeSearch(organizationId, parsedQuery)
      
      // Calculate relevance scores
      const scoredResults = await this.calculateRelevanceScores(results, naturalQuery)
      
      // Find correlated events
      const enrichedResults = await this.enrichWithCorrelations(scoredResults, organizationId)

      return {
        results: enrichedResults,
        parsedQuery,
        confidence: 0.85 // TODO: Implement confidence calculation
      }
    } catch (error) {
      console.error('Natural language search error:', error)
      throw error
    }
  }

  /**
   * Advanced structured search
   */
  static async executeSearch(
    organizationId: string,
    query: SearchQuery
  ): Promise<SearchResult[]> {
    try {
      const supabase = await createSupabaseServerClient()

      let dbQuery = supabase
        .from('audit_logs')
        .select(`
          id,
          event_type,
          event_category,
          action,
          event_description,
          created_at,
          user_id,
          resource_type,
          resource_id,
          outcome,
          severity,
          details,
          correlation_id,
          users(id, full_name, email)
        `)
        .eq('organization_id', organizationId)

      // Apply filters
      if (query.filters.dateRange) {
        dbQuery = dbQuery
          .gte('created_at', query.filters.dateRange.start)
          .lte('created_at', query.filters.dateRange.end)
      }

      if (query.filters.activityTypes?.length) {
        dbQuery = dbQuery.in('event_category', query.filters.activityTypes)
      }

      if (query.filters.userIds?.length) {
        dbQuery = dbQuery.in('user_id', query.filters.userIds)
      }

      if (query.filters.resourceTypes?.length) {
        dbQuery = dbQuery.in('resource_type', query.filters.resourceTypes)
      }

      if (query.filters.severity?.length) {
        dbQuery = dbQuery.in('severity', query.filters.severity)
      }

      if (query.filters.outcome?.length) {
        dbQuery = dbQuery.in('outcome', query.filters.outcome)
      }

      if (query.text) {
        dbQuery = dbQuery.ilike('event_description', `%${query.text}%`)
      }

      // Apply sorting
      const sortField = query.sort?.field || 'created_at'
      const sortDirection = query.sort?.direction || 'desc'
      dbQuery = dbQuery.order(sortField, { ascending: sortDirection === 'asc' })

      // Apply pagination
      if (query.offset) {
        dbQuery = dbQuery.range(query.offset, (query.offset + (query.limit || 50)) - 1)
      } else {
        dbQuery = dbQuery.limit(query.limit || 50)
      }

      const { data: activities } = await (dbQuery as any)

      if (!activities) return []

      // Transform to search results
      return activities.map(activity => ({
        id: activity.id,
        type: `${activity.event_category}:${activity.action}`,
        title: activity.event_description,
        description: this.generateDescription(activity),
        timestamp: activity.created_at,
        user: {
          id: activity.user_id || 'system',
          name: Array.isArray(activity.users) ? ((activity.users as any)[0] as any)?.full_name || 'System' : ((activity.users as any) as any)?.full_name || 'System',
          email: Array.isArray(activity.users) ? ((activity.users as any)[0] as any)?.email || '' : ((activity.users as any) as any)?.email || ''
        },
        resource: activity.resource_id ? {
          type: activity.resource_type,
          id: activity.resource_id,
          name: (activity.details as any)?.resource_name || activity.resource_id
        } : undefined,
        severity: activity.severity,
        outcome: activity.outcome,
        relevanceScore: 1.0 // Will be calculated later
      }))
    } catch (error) {
      console.error('Search execution error:', error)
      return []
    }
  }

  /**
   * Parse natural language queries into structured search
   */
  private static async parseNaturalLanguage(query: string): Promise<SearchQuery> {
    // This is a simplified parser - in production, use OpenAI or similar
    const parsedQuery: SearchQuery = {
      filters: {}
    }

    const lowerQuery = query.toLowerCase()

    // Extract date references
    if (lowerQuery.includes('today')) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      parsedQuery.filters.dateRange = {
        start: today.toISOString(),
        end: tomorrow.toISOString()
      }
    } else if (lowerQuery.includes('yesterday')) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      const today = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
      parsedQuery.filters.dateRange = {
        start: yesterday.toISOString(),
        end: today.toISOString()
      }
    } else if (lowerQuery.includes('last week')) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      parsedQuery.filters.dateRange = {
        start: weekAgo.toISOString(),
        end: new Date().toISOString()
      }
    } else if (lowerQuery.includes('last month')) {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      parsedQuery.filters.dateRange = {
        start: monthAgo.toISOString(),
        end: new Date().toISOString()
      }
    }

    // Extract activity types
    const activityKeywords = {
      'asset': ['assets', 'asset', 'document', 'file', 'pdf', 'upload', 'download'],
      'vault': ['vault', 'vaults', 'folder', 'collection'],
      'annotation': ['annotation', 'annotations', 'comment', 'note', 'highlight'],
      'authentication': ['login', 'logout', 'signin', 'signout', 'auth'],
      'organization': ['organization', 'org', 'company', 'team']
    }

    const detectedTypes: string[] = []
    Object.entries(activityKeywords).forEach(([type, keywords]) => {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        detectedTypes.push(type)
      }
    })

    if (detectedTypes.length > 0) {
      parsedQuery.filters.activityTypes = detectedTypes
    }

    // Extract severity/outcome filters
    if (lowerQuery.includes('error') || lowerQuery.includes('failure') || lowerQuery.includes('failed')) {
      parsedQuery.filters.outcome = ['failure', 'error']
    }

    if (lowerQuery.includes('critical') || lowerQuery.includes('urgent')) {
      parsedQuery.filters.severity = ['critical', 'high']
    }

    // Extract resource types
    if (lowerQuery.includes('pdf')) {
      parsedQuery.filters.resourceTypes = ['asset']
      parsedQuery.text = 'pdf'
    }

    // Remove stop words and use remaining as text search
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'all', 'show', 'me', 'find', 'search']
    const words = lowerQuery.split(/\s+/).filter(word => 
      word.length > 2 && !stopWords.includes(word) && 
      !Object.values(activityKeywords).flat().includes(word)
    )

    if (words.length > 0 && !parsedQuery.text) {
      parsedQuery.text = words.join(' ')
    }

    return parsedQuery
  }

  /**
   * Calculate relevance scores for search results
   */
  private static async calculateRelevanceScores(
    results: SearchResult[],
    originalQuery: string
  ): Promise<SearchResult[]> {
    const queryTerms = originalQuery.toLowerCase().split(/\s+/)

    return results.map(result => {
      let score = 0

      // Text matching in title and description
      const text = `${result.title} ${result.description}`.toLowerCase()
      queryTerms.forEach(term => {
        if (text.includes(term)) {
          score += 1
        }
      })

      // Boost recent activities
      const age = Date.now() - new Date(result.timestamp).getTime()
      const ageBoost = Math.max(0, 1 - (age / (7 * 24 * 60 * 60 * 1000))) // Decay over 7 days
      score += ageBoost * 0.5

      // Boost based on severity
      if (result.severity === 'critical') score += 0.8
      else if (result.severity === 'high') score += 0.6
      else if (result.severity === 'medium') score += 0.4

      // Boost failed outcomes
      if (result.outcome === 'failure' || result.outcome === 'error') {
        score += 0.7
      }

      result.relevanceScore = Math.min(10, score)
      return result
    }).sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Find correlated events for each search result
   */
  private static async enrichWithCorrelations(
    results: SearchResult[],
    organizationId: string
  ): Promise<SearchResult[]> {
    try {
      const supabase = await createSupabaseServerClient()

      for (const result of results) {
        // Find events within 1 hour timeframe
        const timeWindow = 60 * 60 * 1000 // 1 hour
        const resultTime = new Date(result.timestamp).getTime()
        
        const { data: correlatedEvents } = await (supabase as any)
          .from('audit_logs')
          .select(`
            id, event_description, created_at, action, user_id,
            users(full_name, email)
          `)
          .eq('organization_id', organizationId)
          .neq('id', result.id)
          .gte('created_at', new Date(resultTime - timeWindow).toISOString())
          .lte('created_at', new Date(resultTime + timeWindow).toISOString())
          .limit(5)

        if (correlatedEvents?.length) {
          result.correlatedEvents = correlatedEvents.map((event: any) => ({
            id: event.id,
            type: 'correlated',
            title: event.event_description,
            description: `Related activity by ${(event.users as any)?.full_name || 'Unknown'}`,
            timestamp: event.created_at,
            user: {
              id: event.user_id || 'system',
              name: (event.users as any)?.full_name || 'System',
              email: (event.users as any)?.email || ''
            },
            severity: 'medium' as const,
            outcome: 'success' as const,
            relevanceScore: 0.5
          }))
        }
      }

      return results
    } catch (error) {
      console.error('Error finding correlations:', error)
      return results
    }
  }

  /**
   * Save search template for reuse
   */
  static async saveSearchTemplate(
    organizationId: string,
    userId: string,
    template: {
      name: string
      description?: string
      query: SearchQuery
      isPublic?: boolean
    }
  ): Promise<string> {
    try {
      const supabase = await createSupabaseServerClient()

      const { data: savedTemplate, error } = await (supabase as any)
        .from('activity_search_templates')
        .insert({
          organization_id: organizationId,
          created_by: userId,
          name: template.name,
          description: template.description,
          search_query: template.query,
          is_public: template.isPublic || false
        })
        .select()
        .single()

      if (error) throw error

      return savedTemplate.id
    } catch (error) {
      console.error('Error saving search template:', error)
      throw error
    }
  }

  /**
   * Get saved search templates
   */
  static async getSavedSearchTemplates(
    organizationId: string,
    userId: string
  ): Promise<SavedSearch[]> {
    try {
      const supabase = await createSupabaseServerClient()

      const { data: templates } = await (supabase as any)
        .from('activity_search_templates')
        .select(`
          id, name, description, search_query, is_public, 
          usage_count, last_used_at, created_by,
          users(full_name, email)
        `)
        .eq('organization_id', organizationId)
        .or(`created_by.eq.${userId},is_public.eq.true`)
        .order('usage_count', { ascending: false })

      return templates?.map((template: any) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        query: template.search_query as SearchQuery,
        isPublic: template.is_public,
        usageCount: template.usage_count,
        lastUsed: template.last_used_at || new Date().toISOString(),
        createdBy: (template.users as any)?.full_name || 'Unknown'
      })) || []
    } catch (error) {
      console.error('Error fetching search templates:', error)
      return []
    }
  }

  /**
   * Execute saved search template
   */
  static async executeSavedSearch(
    templateId: string,
    organizationId: string
  ): Promise<SearchResult[]> {
    try {
      const supabase = await createSupabaseServerClient()

      // Get the template
      const { data: template } = await (supabase as any)
        .from('activity_search_templates')
        .select('search_query')
        .eq('id', templateId)
        .eq('organization_id', organizationId)
        .single()

      if (!template) throw new Error('Search template not found')

      // Update usage count
      await (supabase as any)
        .from('activity_search_templates')
        .update({
          usage_count: 1, // Will be incremented via SQL function
          last_used_at: new Date().toISOString()
        })
        .eq('id', templateId)

      // Execute the search
      return this.executeSearch(organizationId, template.search_query as SearchQuery)
    } catch (error) {
      console.error('Error executing saved search:', error)
      throw error
    }
  }

  /**
   * Get search suggestions based on activity patterns
   */
  static async getSearchSuggestions(
    organizationId: string,
    userId: string
  ): Promise<Array<{ query: string; category: string; description: string }>> {
    try {
      const supabase = await createSupabaseServerClient()

      // Get user's recent activity patterns
      const { data: userActivity } = await (supabase as any)
        .from('audit_logs')
        .select('event_category, action, resource_type')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100)

      if (!userActivity?.length) {
        return this.getDefaultSuggestions()
      }

      // Analyze patterns and generate suggestions
      const categories = userActivity.reduce((acc: Record<string, number>, activity: any) => {
        acc[activity.event_category] = (acc[activity.event_category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const suggestions = []

      // Suggest searches based on user's top categories
      const topCategory = Object.entries(categories).sort(([,a], [,b]) => b - a)[0]
      if (topCategory) {
        suggestions.push({
          query: `Show me all ${topCategory[0]} activities from last week`,
          category: 'Recent Activity',
          description: `View your recent ${topCategory[0]} activities`
        })
      }

      // Add security-focused suggestions
      suggestions.push(
        {
          query: 'Show me failed login attempts today',
          category: 'Security',
          description: 'Monitor authentication failures'
        },
        {
          query: 'Find all critical severity events this month',
          category: 'Security',
          description: 'Review high-priority security events'
        },
        {
          query: 'Show document downloads after hours',
          category: 'Compliance',
          description: 'Monitor after-hours document access'
        }
      )

      return suggestions
    } catch (error) {
      console.error('Error generating search suggestions:', error)
      return this.getDefaultSuggestions()
    }
  }

  private static getDefaultSuggestions() {
    return [
      {
        query: 'Show me all activities today',
        category: 'Overview',
        description: 'View today\'s activity summary'
      },
      {
        query: 'Find failed events last week',
        category: 'Troubleshooting',
        description: 'Identify recent issues'
      },
      {
        query: 'Show asset downloads this month',
        category: 'Usage',
        description: 'Monitor document access patterns'
      },
      {
        query: 'Find critical security events',
        category: 'Security',
        description: 'Review high-priority security alerts'
      }
    ]
  }

  private static generateDescription(activity: any): string {
    const user = (activity.users as any)?.full_name || 'Unknown user'
    const action = (activity.action as string).replace(/_/g, ' ')
    const resource = activity.resource_type || 'system'
    
    return `${user} performed ${action} on ${resource} with ${activity.outcome} outcome`
  }

  /**
   * Advanced correlation analysis
   */
  static async findActivityCorrelations(
    organizationId: string,
    activityId: string,
    correlationWindow: number = 3600 // 1 hour in seconds
  ): Promise<{
    directCorrelations: SearchResult[]
    userCorrelations: SearchResult[]
    resourceCorrelations: SearchResult[]
    patternCorrelations: SearchResult[]
  }> {
    try {
      const supabase = await createSupabaseServerClient()

      // Get the source activity
      const { data: sourceActivity } = await (supabase as any)
        .from('audit_logs')
        .select('*')
        .eq('id', activityId)
        .single()

      if (!sourceActivity) {
        throw new Error('Source activity not found')
      }

      const activityTime = new Date(sourceActivity.created_at).getTime()
      const windowStart = new Date(activityTime - correlationWindow * 1000).toISOString()
      const windowEnd = new Date(activityTime + correlationWindow * 1000).toISOString()

      // Find different types of correlations
      const [directCorrelations, userCorrelations, resourceCorrelations] = await Promise.all([
        // Direct correlations (same correlation_id or session)
        this.findDirectCorrelations(supabase, sourceActivity, windowStart, windowEnd),
        
        // User correlations (same user, different activities)
        this.findUserCorrelations(supabase, sourceActivity, windowStart, windowEnd),
        
        // Resource correlations (same resource, different users)
        this.findResourceCorrelations(supabase, sourceActivity, windowStart, windowEnd)
      ])

      // Pattern correlations (similar activity patterns)
      const patternCorrelations = await this.findPatternCorrelations(
        supabase, 
        organizationId, 
        sourceActivity.event_category,
        sourceActivity.action
      )

      return {
        directCorrelations,
        userCorrelations,
        resourceCorrelations,
        patternCorrelations
      }
    } catch (error) {
      console.error('Error finding correlations:', error)
      return {
        directCorrelations: [],
        userCorrelations: [],
        resourceCorrelations: [],
        patternCorrelations: []
      }
    }
  }

  private static async findDirectCorrelations(
    supabase: any,
    sourceActivity: any,
    windowStart: string,
    windowEnd: string
  ): Promise<SearchResult[]> {
    const { data: correlations } = await (supabase as any)
      .from('audit_logs')
      .select(`
        id, event_description, created_at, event_category, action,
        user_id, resource_type, resource_id, outcome, severity,
        users(full_name, email)
      `)
      .neq('id', sourceActivity.id)
      .or(`correlation_id.eq.${sourceActivity.correlation_id},session_id.eq.${sourceActivity.session_id}`)
      .gte('created_at', windowStart)
      .lte('created_at', windowEnd)
      .limit(10)

    return this.transformToSearchResults(correlations || [])
  }

  private static async findUserCorrelations(
    supabase: any,
    sourceActivity: any,
    windowStart: string,
    windowEnd: string
  ): Promise<SearchResult[]> {
    const { data: correlations } = await (supabase as any)
      .from('audit_logs')
      .select(`
        id, event_description, created_at, event_category, action,
        user_id, resource_type, resource_id, outcome, severity,
        users(full_name, email)
      `)
      .eq('user_id', sourceActivity.user_id)
      .neq('id', sourceActivity.id)
      .gte('created_at', windowStart)
      .lte('created_at', windowEnd)
      .limit(10)

    return this.transformToSearchResults(correlations || [])
  }

  private static async findResourceCorrelations(
    supabase: any,
    sourceActivity: any,
    windowStart: string,
    windowEnd: string
  ): Promise<SearchResult[]> {
    if (!sourceActivity.resource_id) return []

    const { data: correlations } = await (supabase as any)
      .from('audit_logs')
      .select(`
        id, event_description, created_at, event_category, action,
        user_id, resource_type, resource_id, outcome, severity,
        users(full_name, email)
      `)
      .eq('resource_id', sourceActivity.resource_id)
      .neq('id', sourceActivity.id)
      .gte('created_at', windowStart)
      .lte('created_at', windowEnd)
      .limit(10)

    return this.transformToSearchResults(correlations || [])
  }

  private static async findPatternCorrelations(
    supabase: any,
    organizationId: string,
    eventCategory: string,
    action: string
  ): Promise<SearchResult[]> {
    // Find similar patterns in the past
    const { data: patterns } = await (supabase as any)
      .from('audit_logs')
      .select(`
        id, event_description, created_at, event_category, action,
        user_id, resource_type, resource_id, outcome, severity,
        users(full_name, email)
      `)
      .eq('organization_id', organizationId)
      .eq('event_category', eventCategory)
      .eq('action', action)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    return this.transformToSearchResults(patterns || [])
  }

  private static transformToSearchResults(data: any[]): SearchResult[] {
    return data.map((item: any) => ({
      id: item.id,
      type: `${item.event_category}:${item.action}`,
      title: item.event_description,
      description: this.generateDescription(item),
      timestamp: item.created_at,
      user: {
        id: item.user_id || 'system',
        name: (item.users as any)?.full_name || 'System',
        email: (item.users as any)?.email || ''
      },
      resource: item.resource_id ? {
        type: item.resource_type,
        id: item.resource_id
      } : undefined,
      severity: item.severity,
      outcome: item.outcome,
      relevanceScore: 1.0
    }))
  }
}

/**
 * Search query builder for complex searches
 */
export class SearchQueryBuilder {
  private query: SearchQuery = { filters: {} }

  static create(): SearchQueryBuilder {
    return new SearchQueryBuilder()
  }

  withText(text: string): SearchQueryBuilder {
    this.query.text = text
    return this
  }

  withDateRange(start: string, end: string): SearchQueryBuilder {
    this.query.filters.dateRange = { start, end }
    return this
  }

  withActivityTypes(types: string[]): SearchQueryBuilder {
    this.query.filters.activityTypes = types
    return this
  }

  withUsers(userIds: string[]): SearchQueryBuilder {
    this.query.filters.userIds = userIds
    return this
  }

  withSeverity(levels: string[]): SearchQueryBuilder {
    this.query.filters.severity = levels
    return this
  }

  withOutcome(outcomes: string[]): SearchQueryBuilder {
    this.query.filters.outcome = outcomes
    return this
  }

  sortBy(field: string, direction: 'asc' | 'desc' = 'desc'): SearchQueryBuilder {
    this.query.sort = { field, direction }
    return this
  }

  limit(count: number): SearchQueryBuilder {
    this.query.limit = count
    return this
  }

  offset(count: number): SearchQueryBuilder {
    this.query.offset = count
    return this
  }

  build(): SearchQuery {
    return this.query
  }
}

/**
 * Pre-defined search templates for common use cases
 */
export const COMMON_SEARCH_TEMPLATES = {
  SECURITY_OVERVIEW: {
    name: 'Security Overview',
    description: 'All security-related events in the past 7 days',
    query: SearchQueryBuilder.create()
      .withActivityTypes(['authentication', 'security_event'])
      .withDateRange(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
      )
      .sortBy('created_at', 'desc')
      .limit(100)
      .build()
  },

  FAILED_OPERATIONS: {
    name: 'Failed Operations',
    description: 'All failed operations in the past 24 hours',
    query: SearchQueryBuilder.create()
      .withOutcome(['failure', 'error'])
      .withDateRange(
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
      )
      .sortBy('created_at', 'desc')
      .limit(50)
      .build()
  },

  CRITICAL_EVENTS: {
    name: 'Critical Events',
    description: 'All critical severity events',
    query: SearchQueryBuilder.create()
      .withSeverity(['critical', 'high'])
      .withDateRange(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
      )
      .sortBy('created_at', 'desc')
      .limit(25)
      .build()
  },

  DOCUMENT_ACCESS: {
    name: 'Document Access',
    description: 'All document-related activities',
    query: SearchQueryBuilder.create()
      .withActivityTypes(['assets', 'vaults'])
      .withDateRange(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
      )
      .sortBy('created_at', 'desc')
      .limit(100)
      .build()
  }
}