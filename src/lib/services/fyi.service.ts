import { FYIRepository } from '../repositories/fyi.repository'
import { LLMSummarizer } from './llm-summarizer'
import { RateLimiter } from '../rate-limiter'
import type { FYIInsight, FYIContext } from '../../types/fyi'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export interface FYIServiceOptions {
  newsApiKey?: string
  alphaVantageKey?: string
  openRouterKey?: string
}

export class FYIService {
  private repository: FYIRepository
  private llmSummarizer: LLMSummarizer
  private rateLimiter: RateLimiter
  private newsApiKey?: string
  private alphaVantageKey?: string

  constructor(
    supabase: SupabaseClient<Database>,
    options: FYIServiceOptions = {}
  ) {
    this.repository = new FYIRepository(supabase)
    this.llmSummarizer = new LLMSummarizer({ apiKey: options.openRouterKey })
    this.rateLimiter = new RateLimiter()
    this.newsApiKey = options.newsApiKey
    this.alphaVantageKey = options.alphaVantageKey
  }

  async fetchInsights(
    organizationId: string,
    userId: string,
    context: FYIContext
  ): Promise<FYIInsight[]> {
    try {
      // Check rate limits
      const userRateLimit = await this.rateLimiter.checkLimit('fyi-user', userId)
      if (!userRateLimit.allowed) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }

      // Check cached insights first
      const cachedInsights = await this.repository.findCachedInsights(
        organizationId,
        context.primaryEntity,
        10
      )

      if (cachedInsights.length > 0) {
        return this.formatCachedInsights(cachedInsights)
      }

      // Fetch fresh insights from external sources
      const insights: FYIInsight[] = []

      // Fetch news insights
      if (this.newsApiKey && context.entities.length > 0) {
        const newsInsights = await this.fetchNewsInsights(context.entities)
        insights.push(...newsInsights)
      }

      // Fetch financial insights for public companies
      if (this.alphaVantageKey && context.contextType === 'organization') {
        const financialInsights = await this.fetchFinancialInsights(context.entities)
        insights.push(...financialInsights)
      }

      // Prioritize and enhance insights
      const enhancedInsights = await this.enhanceInsights(insights, context)
      
      // Cache the insights
      await this.cacheInsights(organizationId, enhancedInsights, context)

      return enhancedInsights
    } catch (error) {
      console.error('FYIService.fetchInsights error:', error)
      return []
    }
  }

  private async fetchNewsInsights(entities: string[]): Promise<FYIInsight[]> {
    if (!this.newsApiKey) return []

    try {
      const newsRateLimit = await this.rateLimiter.checkLimit('newsapi', 'global')
      if (!newsRateLimit.allowed) {
        console.warn('NewsAPI rate limit exceeded')
        return []
      }

      const query = entities.slice(0, 3).join(' OR ')
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=relevancy&pageSize=5`

      const response = await fetch(url, {
        headers: { 'X-API-Key': this.newsApiKey }
      })

      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.statusText}`)
      }

      const data = await response.json()
      const insights: FYIInsight[] = []

      for (const article of data.articles || []) {
        if (article.title && article.description && article.url) {
          insights.push({
            id: `news-${Date.now()}-${Math.random()}`,
            type: 'news',
            title: article.title,
            summary: article.description,
            content: article.content || article.description,
            source: article.source?.name || 'News',
            sourceUrl: article.url,
            publishedAt: new Date(article.publishedAt || Date.now()),
            relevanceScore: this.calculateRelevanceScore(article.title + ' ' + article.description, entities),
            entities: entities.filter(entity => 
              (article.title + ' ' + article.description).toLowerCase().includes(entity.toLowerCase())
            ),
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      }

      return insights
    } catch (error) {
      console.error('Error fetching news insights:', error)
      return []
    }
  }

  private async fetchFinancialInsights(entities: string[]): Promise<FYIInsight[]> {
    if (!this.alphaVantageKey) return []

    const insights: FYIInsight[] = []

    try {
      const alphaRateLimit = await this.rateLimiter.checkLimit('alphavantage', 'global')
      if (!alphaRateLimit.allowed) {
        console.warn('Alpha Vantage rate limit exceeded')
        return []
      }

      // Try to get stock data for the first entity (assuming it might be a company)
      const companyName = entities[0]
      const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(companyName)}&apikey=${this.alphaVantageKey}`

      const searchResponse = await fetch(searchUrl)
      if (!searchResponse.ok) return []

      const searchData = await searchResponse.json()
      const matches = searchData.bestMatches || []

      if (matches.length > 0) {
        const symbol = matches[0]['1. symbol']
        const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageKey}`

        const quoteResponse = await fetch(quoteUrl)
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json()
          const quote = quoteData['Global Quote']

          if (quote) {
            insights.push({
              id: `finance-${Date.now()}`,
              type: 'financial',
              title: `${companyName} Stock Update`,
              summary: `Current price: $${quote['05. price']}, Change: ${quote['09. change']} (${quote['10. change percent']})`,
              content: `Stock performance for ${companyName} (${symbol})`,
              source: 'Alpha Vantage',
              sourceUrl: `https://finance.yahoo.com/quote/${symbol}`,
              publishedAt: new Date(quote['07. latest trading day'] || Date.now()),
              relevanceScore: 0.8,
              entities: [companyName],
              createdAt: new Date(),
              updatedAt: new Date()
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching financial insights:', error)
    }

    return insights
  }

  private async enhanceInsights(insights: FYIInsight[], context: FYIContext): Promise<FYIInsight[]> {
    const enhancedInsights: FYIInsight[] = []

    for (const insight of insights) {
      try {
        // Use LLM to create better summaries
        const enhancedSummary = await this.llmSummarizer.summarizeInsight({
          title: insight.title,
          content: insight.content,
          context: context.primaryEntity || 'business context',
          maxLength: 150,
          style: 'business-friendly'
        })

        enhancedInsights.push({
          ...insight,
          summary: enhancedSummary || insight.summary,
          relevanceScore: this.calculateContextualRelevanceScore(insight, context)
        })
      } catch (error) {
        // If LLM enhancement fails, use original insight
        enhancedInsights.push(insight)
      }
    }

    // Sort by relevance score
    return enhancedInsights.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
  }

  private calculateRelevanceScore(text: string, entities: string[]): number {
    if (!text || entities.length === 0) return 0

    const textLower = text.toLowerCase()
    let score = 0

    entities.forEach(entity => {
      const entityLower = entity.toLowerCase()
      if (textLower.includes(entityLower)) {
        // Exact match gets higher score
        if (textLower === entityLower) score += 1
        else if (textLower.startsWith(entityLower) || textLower.endsWith(entityLower)) score += 0.8
        else score += 0.6
      }
    })

    return Math.min(score / entities.length, 1) // Normalize to 0-1 range
  }

  private calculateContextualRelevanceScore(insight: FYIInsight, context: FYIContext): number {
    let score = insight.relevanceScore || 0

    // Boost score based on context type
    if (context.contextType === 'organization' && insight.type === 'financial') {
      score += 0.2
    }

    // Boost recent content
    if (insight.publishedAt) {
      const daysDiff = (Date.now() - insight.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysDiff < 1) score += 0.3
      else if (daysDiff < 7) score += 0.2
      else if (daysDiff < 30) score += 0.1
    }

    return Math.min(score, 1) // Cap at 1.0
  }

  private formatCachedInsights(cachedInsights: any[]): FYIInsight[] {
    return cachedInsights.map(cached => ({
      id: cached.id,
      type: cached.insight_type,
      title: cached.title,
      summary: cached.summary,
      content: cached.content,
      source: cached.source,
      sourceUrl: cached.source_url,
      publishedAt: new Date(cached.published_at || cached.created_at),
      relevanceScore: cached.relevance_score,
      entities: cached.context_entities || [],
      createdAt: new Date(cached.created_at),
      updatedAt: new Date(cached.updated_at)
    }))
  }

  private async cacheInsights(
    organizationId: string,
    insights: FYIInsight[],
    context: FYIContext
  ): Promise<void> {
    try {
      for (const insight of insights.slice(0, 5)) { // Cache top 5 insights
        await this.repository.cacheInsight({
          organization_id: organizationId,
          insight_type: insight.type,
          title: insight.title,
          summary: insight.summary,
          content: insight.content,
          source: insight.source,
          source_url: insight.sourceUrl,
          published_at: insight.publishedAt?.toISOString(),
          relevance_score: insight.relevanceScore || 0,
          context_entities: insight.entities,
          context_type: context.contextType,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          is_active: true
        })
      }
    } catch (error) {
      console.error('Error caching insights:', error)
    }
  }

  async getUserPreferences(userId: string) {
    return await this.repository.findUserPreferences(userId)
  }

  async updateUserPreferences(userId: string, preferences: any) {
    return await this.repository.createOrUpdateUserPreferences(userId, preferences)
  }

  async logUserInteraction(userId: string, insightId: string, action: string, organizationId?: string) {
    await this.repository.logUserInteraction({
      user_id: userId,
      insight_id: insightId,
      action_type: action,
      organization_id: organizationId
    })
  }
}