/**
 * External Intelligence Service
 * Integrates with external data sources for market intelligence, news, and regulatory updates
 */

import { createSupabaseServerClient } from '../supabase-server'
import { Database } from '../../types/database'
import axios from 'axios'
type AxiosInstance = any
type AxiosRequestConfig = any

// Type workarounds for missing table definitions
type IntelligenceSourceRow = { id: string; source_type: string; source_name: string; [key: string]: any }
type IntelligenceInsightRow = { id: string; source_type: string; source_name: string; [key: string]: any }
import type { SupabaseClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

type IntelligenceSource = Database['public']['Tables']['intelligence_sources']['Row']
type IntelligenceInsight = Database['public']['Tables']['intelligence_insights']['Row']

export interface MarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap?: number
  timestamp: Date
  source: string
}

export interface NewsItem {
  title: string
  summary: string
  url: string
  publishedAt: Date
  source: string
  relevanceScore: number
  sentiment: 'positive' | 'negative' | 'neutral'
  tags: string[]
  impactLevel: 'low' | 'medium' | 'high'
}

export interface RegulatoryUpdate {
  title: string
  description: string
  effectiveDate?: Date
  agency: string
  category: string
  impactAssessment: string
  affectedIndustries: string[]
  complianceDeadline?: Date
  url?: string
}

export interface EconomicIndicator {
  indicator: string
  value: number
  previousValue?: number
  change?: number
  changePercent?: number
  reportDate: Date
  nextReleaseDate?: Date
  significance: 'high' | 'medium' | 'low'
}

// Type-safe intelligence data based on alert type
type IntelligenceAlertData = 
  | { type: 'market'; symbols: readonly string[]; trends: readonly { symbol: string; direction: 'up' | 'down'; magnitude: number }[]; timeframe: string }
  | { type: 'news'; articles: readonly string[]; sentiment: 'positive' | 'negative' | 'neutral'; topics: readonly string[] }
  | { type: 'regulatory'; regulations: readonly string[]; deadline: Date; compliance: readonly string[] }
  | { type: 'economic'; indicators: readonly string[]; forecast: 'positive' | 'negative' | 'stable'; impact: number }
  | (MarketData & Record<string, unknown>)
  | (NewsItem & Record<string, unknown>)
  | Record<string, unknown>;

export interface IntelligenceAlert {
  readonly id: string
  readonly type: 'market' | 'news' | 'regulatory' | 'economic'
  readonly title: string
  readonly description: string
  readonly severity: 'info' | 'warning' | 'critical'
  readonly relevantOrganizations: readonly string[]
  readonly actionRequired: boolean
  readonly data: IntelligenceAlertData
  readonly createdAt: Date
}

export class ExternalIntelligenceService {
  private supabase: SupabaseClient<Database> | null = null
  private httpClient: AxiosInstance
  private rateLimiter: Map<string, { count: number; resetTime: number }> = new Map()

  constructor() {
    this.setupHttpClient()
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = (await createSupabaseServerClient()) as any
    }
    return this.supabase
  }

  private setupHttpClient() {
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'BoardGuru-Intelligence/1.0',
        'Accept': 'application/json'
      }
    })

    // Add request interceptor for rate limiting
    this.httpClient.interceptors.request.use(async (config: AxiosRequestConfig) => {
      await this.checkRateLimit(config.url || '')
      return config
    })
  }

  /**
   * Fetch market data for relevant symbols
   */
  async fetchMarketData(symbols: string[]): Promise<MarketData[]> {
    try {
      const source = await this.getIntelligenceSource('Alpha Vantage')
      if (!source || !source.is_active) {
        console.warn('Alpha Vantage source not available')
        return []
      }

      const marketData: MarketData[] = []

      for (const symbol of symbols) {
        try {
          const data = await this.fetchAlphaVantageQuote(symbol, source)
          if (data) {
            marketData.push(data)
            await this.updateSourceUsage(source.id)
          }
        } catch (error) {
          console.error(`Failed to fetch data for ${symbol}:`, error)
        }

        // Respect rate limits
        await this.delay(200) // 200ms between requests
      }

      return marketData

    } catch (error) {
      console.error('Failed to fetch market data:', error)
      return []
    }
  }

  /**
   * Fetch relevant news articles
   */
  async fetchNews(
    keywords: string[],
    categories: string[] = ['business', 'technology'],
    maxArticles: number = 50
  ): Promise<NewsItem[]> {
    try {
      const source = await this.getIntelligenceSource('NewsAPI')
      if (!source || !source.is_active) {
        console.warn('NewsAPI source not available')
        return []
      }

      const query = keywords.join(' OR ')
      const newsItems: NewsItem[] = []

      for (const category of categories) {
        try {
          const articles = await this.fetchNewsAPIArticles(query, category, source)
          newsItems.push(...articles)
          await this.updateSourceUsage(source.id)

          if (newsItems.length >= maxArticles) break
        } catch (error) {
          console.error(`Failed to fetch news for category ${category}:`, error)
        }
      }

      // Sort by relevance and recency
      return newsItems
        .sort((a, b) => {
          const recencyScore = (new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
          const totalScoreA = a.relevanceScore + (recencyScore > 0 ? 0.1 : -0.1)
          const totalScoreB = b.relevanceScore + (recencyScore > 0 ? -0.1 : 0.1)
          return totalScoreB - totalScoreA
        })
        .slice(0, maxArticles)

    } catch (error) {
      console.error('Failed to fetch news:', error)
      return []
    }
  }

  /**
   * Fetch regulatory updates
   */
  async fetchRegulatoryUpdates(industries: string[]): Promise<RegulatoryUpdate[]> {
    try {
      const source = await this.getIntelligenceSource('SEC Edgar')
      if (!source || !source.is_active) {
        console.warn('SEC Edgar source not available')
        return []
      }

      // This would integrate with SEC Edgar API or similar regulatory data sources
      // For now, return mock data structure
      const updates: RegulatoryUpdate[] = []

      // In a real implementation, this would query regulatory databases
      // and parse filing updates, rule changes, etc.

      return updates

    } catch (error) {
      console.error('Failed to fetch regulatory updates:', error)
      return []
    }
  }

  /**
   * Fetch economic indicators
   */
  async fetchEconomicIndicators(indicators: string[] = ['GDP', 'INFLATION', 'INTEREST_RATES']): Promise<EconomicIndicator[]> {
    try {
      const source = await this.getIntelligenceSource('Federal Reserve Economic Data')
      if (!source || !source.is_active) {
        console.warn('FRED source not available')
        return []
      }

      const economicData: EconomicIndicator[] = []

      for (const indicator of indicators) {
        try {
          const data = await this.fetchFREDData(indicator, source)
          if (data) {
            economicData.push(data)
            await this.updateSourceUsage(source.id)
          }
        } catch (error) {
          console.error(`Failed to fetch ${indicator}:`, error)
        }
      }

      return economicData

    } catch (error) {
      console.error('Failed to fetch economic indicators:', error)
      return []
    }
  }

  /**
   * Generate intelligence insights from collected data
   */
  async generateIntelligenceInsights(
    organizationIds?: string[],
    industries?: string[]
  ): Promise<IntelligenceInsight[]> {
    try {
      // Fetch data from multiple sources
      const [marketData, newsItems, economicData] = await Promise.all([
        this.fetchMarketData(['SPY', 'QQQ', 'VTI']), // Major indices
        this.fetchNews(['board governance', 'corporate governance', 'regulatory'], ['business']),
        this.fetchEconomicIndicators()
      ])

      const insights: IntelligenceAlert[] = []

      // Analyze market trends for insights
      if (marketData.length > 0) {
        const marketInsights = this.analyzeMarketTrends(marketData)
        insights.push(...marketInsights)
      }

      // Analyze news for governance-relevant insights
      if (newsItems.length > 0) {
        const newsInsights = this.analyzeNewsForInsights(newsItems)
        insights.push(...newsInsights)
      }

      // Analyze economic data for business impact
      if (economicData.length > 0) {
        const economicInsights = this.analyzeEconomicIndicators(economicData)
        insights.push(...economicInsights)
      }

      // Store insights in database
      const storedInsights: IntelligenceInsight[] = []
      for (const insight of insights) {
        const stored = await this.storeInsight(insight, organizationIds)
        if (stored) storedInsights.push(stored)
      }

      return storedInsights

    } catch (error) {
      console.error('Failed to generate intelligence insights:', error)
      return []
    }
  }

  /**
   * Create intelligence alerts based on configured triggers
   */
  async createIntelligenceAlerts(
    organizationId: string,
    triggers: {
      marketThresholds?: { changePercent: number }
      newsKeywords?: string[]
      economicIndicators?: string[]
    }
  ): Promise<IntelligenceAlert[]> {
    try {
      const alerts: IntelligenceAlert[] = []

      // Market alerts
      if (triggers.marketThresholds) {
        const marketData = await this.fetchMarketData(['SPY', 'QQQ'])
        for (const data of marketData) {
          if (Math.abs(data.changePercent) > triggers.marketThresholds.changePercent) {
            alerts.push({
              id: `alert_${nanoid()}`,
              type: 'market',
              title: `Significant Market Movement: ${data.symbol}`,
              description: `${data.symbol} moved ${data.changePercent.toFixed(2)}% to ${data.price}`,
              severity: Math.abs(data.changePercent) > 5 ? 'critical' : 'warning',
              relevantOrganizations: [organizationId],
              actionRequired: Math.abs(data.changePercent) > 10,
              data: { ...data, type: 'market' } as IntelligenceAlertData,
              createdAt: new Date()
            })
          }
        }
      }

      // News alerts
      if (triggers.newsKeywords && triggers.newsKeywords.length > 0) {
        const newsItems = await this.fetchNews(triggers.newsKeywords)
        for (const news of newsItems.slice(0, 5)) { // Top 5 most relevant
          if (news.relevanceScore > 0.8) {
            alerts.push({
              id: `alert_${nanoid()}`,
              type: 'news',
              title: `High-Impact News Alert`,
              description: news.title,
              severity: news.impactLevel === 'high' ? 'critical' : 'warning',
              relevantOrganizations: [organizationId],
              actionRequired: news.impactLevel === 'high',
              data: { ...news, type: 'news' } as IntelligenceAlertData,
              createdAt: new Date()
            })
          }
        }
      }

      return alerts

    } catch (error) {
      console.error('Failed to create intelligence alerts:', error)
      return []
    }
  }

  /**
   * Update intelligence sources and refresh data
   */
  async refreshIntelligenceData(): Promise<{
    sourcesUpdated: number
    insightsGenerated: number
    errors: string[]
  }> {
    try {
      const supabase = await this.getSupabase()
      if (!supabase) throw new Error('Failed to initialize database connection')
      
      const { data: sources } = await supabase
        .from('intelligence_sources')
        .select('*')
        .eq('is_active', true)
        .lte('next_update_at', new Date().toISOString())

      let sourcesUpdated = 0
      let insightsGenerated = 0
      const errors: string[] = []

      if (!sources) return { sourcesUpdated: 0, insightsGenerated: 0, errors: ['No sources found'] }

      for (const source of sources) {
        try {
          // Update next update time - temporary skip due to TS issue
          // const frequencyHours: number = source.update_frequency_hours || 24
          // const currentTime: number = new globalThis.Date().getTime()
          // const nextUpdateTime: globalThis.Date = new globalThis.Date(currentTime + (frequencyHours * 60 * 60 * 1000))

          const supabase = await this.getSupabase()
          if (supabase) {
            await supabase
              .from('intelligence_sources')
              .update({
                updated_at: new Date().toISOString(),
                // next_update_at: nextUpdateTime.toISOString()
              })
              .eq('id', (source as any).id)
          }

          sourcesUpdated++

          // Generate insights based on source type
          if ((source as any).source_type === 'market_data') {
            const insights = await this.generateIntelligenceInsights()
            insightsGenerated += insights.length
          }

        } catch (error) {
          errors.push(`Failed to update source ${(source as any).source_name}: ${error}`)
        }
      }

      return { sourcesUpdated, insightsGenerated, errors }

    } catch (error) {
      console.error('Failed to refresh intelligence data:', error)
      return { sourcesUpdated: 0, insightsGenerated: 0, errors: [error as string] }
    }
  }

  // Private helper methods

  private async getIntelligenceSource(sourceName: string): Promise<IntelligenceSource | null> {
    const supabase = await this.getSupabase()
    if (!supabase) return null

    const { data } = await supabase
      .from('intelligence_sources')
      .select('*')
      .eq('source_name', sourceName)
      .eq('is_active', true)
      .single()

    return data || null
  }

  private async updateSourceUsage(sourceId: string): Promise<void> {
    const supabase = await this.getSupabase()
    if (supabase) {
      await supabase
        .from('intelligence_sources')
        .update({
          updated_at: new Date().toISOString() // Use available column
        })
        .eq('id', sourceId)
    }
  }

  private async checkRateLimit(url: string): Promise<void> {
    const domain = new URL(url).hostname
    const now = Date.now()
    const limit = this.rateLimiter.get(domain)

    if (limit) {
      if (now < limit.resetTime) {
        if (limit.count >= 5) { // Max 5 requests per minute per domain
          const waitTime = limit.resetTime - now
          await this.delay(waitTime)
        }
        limit.count++
      } else {
        // Reset the limit
        this.rateLimiter.set(domain, { count: 1, resetTime: now + 60000 })
      }
    } else {
      this.rateLimiter.set(domain, { count: 1, resetTime: now + 60000 })
    }
  }

  private async fetchAlphaVantageQuote(symbol: string, source: IntelligenceSource): Promise<MarketData | null> {
    try {
      // Mock implementation - in production this would call Alpha Vantage API
      // const response = await this.httpClient.get(`https://www.alphavantage.co/query`, {
      //   params: {
      //     function: 'GLOBAL_QUOTE',
      //     symbol: symbol,
      //     apikey: source.api_key_encrypted // Would need to decrypt
      //   }
      // })

      // Return mock data for demonstration
      return {
        symbol,
        price: 100 + Math.random() * 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date(),
        source: 'Alpha Vantage'
      }

    } catch (error) {
      console.error(`Failed to fetch Alpha Vantage data for ${symbol}:`, error)
      return null
    }
  }

  private async fetchNewsAPIArticles(query: string, category: string, source: IntelligenceSource): Promise<NewsItem[]> {
    try {
      // Mock implementation - in production this would call NewsAPI
      // const response = await this.httpClient.get(`https://newsapi.org/v2/everything`, {
      //   params: {
      //     q: query,
      //     category: category,
      //     language: 'en',
      //     sortBy: 'relevancy',
      //     pageSize: 20,
      //     apiKey: source.api_key_encrypted // Would need to decrypt
      //   }
      // })

      // Return mock data for demonstration
      const mockArticles: NewsItem[] = [
        {
          title: 'New Corporate Governance Regulations Announced',
          summary: 'Regulatory bodies announce new compliance requirements for board governance.',
          url: 'https://example.com/news/1',
          publishedAt: new Date(),
          source: 'NewsAPI',
          relevanceScore: 0.9,
          sentiment: 'neutral',
          tags: ['governance', 'regulation', 'compliance'],
          impactLevel: 'high'
        }
      ]

      return mockArticles

    } catch (error) {
      console.error(`Failed to fetch NewsAPI articles:`, error)
      return []
    }
  }

  private async fetchFREDData(indicator: string, source: IntelligenceSource): Promise<EconomicIndicator | null> {
    try {
      // Mock implementation - in production this would call FRED API
      // const response = await this.httpClient.get(`https://api.stlouisfed.org/fred/series/observations`, {
      //   params: {
      //     series_id: indicator,
      //     api_key: source.api_key_encrypted, // Would need to decrypt
      //     file_type: 'json',
      //     limit: 1,
      //     sort_order: 'desc'
      //   }
      // })

      // Return mock data for demonstration
      return {
        indicator,
        value: Math.random() * 10,
        previousValue: Math.random() * 10,
        change: (Math.random() - 0.5) * 2,
        changePercent: (Math.random() - 0.5) * 5,
        reportDate: new Date(),
        significance: 'high'
      }

    } catch (error) {
      console.error(`Failed to fetch FRED data for ${indicator}:`, error)
      return null
    }
  }

  private analyzeMarketTrends(marketData: readonly MarketData[]): IntelligenceAlert[] {
    const insights: IntelligenceAlert[] = []

    // Check for significant movements
    const significantMoves = marketData.filter(data => Math.abs(data.changePercent) > 2)
    if (significantMoves.length > 0) {
      insights.push({
        id: `alert_${Date.now()}`,
        type: 'market',
        title: 'Significant Market Movement Detected',
        description: `${significantMoves.length} major market indices showing significant movement`,
        severity: 'warning',
        relevantOrganizations: [],
        actionRequired: false,
        data: { type: 'market', symbols: significantMoves.map(d => d.symbol), trends: [], timeframe: '1d' } as IntelligenceAlertData,
        createdAt: new Date()
      })
    }

    return insights
  }

  private analyzeNewsForInsights(newsItems: readonly NewsItem[]): IntelligenceAlert[] {
    const insights: IntelligenceAlert[] = []

    // Check for high-impact governance news
    const highImpactNews = newsItems.filter(news => 
      news.impactLevel === 'high' && 
      news.tags.some(tag => ['governance', 'regulation', 'compliance'].includes(tag))
    )

    if (highImpactNews.length > 0) {
      insights.push({
        id: `alert_${Date.now()}`,
        type: 'news',
        title: 'Important Governance News Detected',
        description: `${highImpactNews.length} high-impact governance-related news items`,
        severity: 'warning',
        relevantOrganizations: [],
        actionRequired: true,
        data: { type: 'news', articles: highImpactNews.map(n => n.title), sentiment: 'neutral', topics: ['governance'] } as IntelligenceAlertData,
        createdAt: new Date()
      })
    }

    return insights
  }

  private analyzeEconomicIndicators(economicData: readonly EconomicIndicator[]): IntelligenceAlert[] {
    const insights: IntelligenceAlert[] = []

    // Check for significant economic changes
    const significantChanges = economicData.filter(data => 
      data.changePercent && Math.abs(data.changePercent) > 5
    )

    if (significantChanges.length > 0) {
      insights.push({
        id: `alert_${Date.now()}`,
        type: 'economic',
        title: 'Significant Economic Indicator Changes',
        description: `${significantChanges.length} economic indicators showing significant changes`,
        severity: 'info',
        relevantOrganizations: [],
        actionRequired: false,
        data: { type: 'economic', indicators: significantChanges.map(d => d.indicator), forecast: 'stable', impact: 0.5 } as IntelligenceAlertData,
        createdAt: new Date()
      })
    }

    return insights
  }

  private async storeInsight(insight: IntelligenceAlert, organizationIds?: readonly string[]): Promise<IntelligenceInsight | null> {
    try {
      const supabase = await this.getSupabase()
      if (!supabase) return null

      const { data } = await supabase
        .from('intelligence_insights')
        .insert({
          insight_id: `insight_${nanoid()}`,
          insight_type: insight.type,
          title: insight.title,
          content: insight.description,
          relevance_score: 0.8,
          impact_level: insight.severity === 'critical' ? 'high' : insight.severity === 'warning' ? 'medium' : 'low',
          tags: [insight.type],
          external_references: insight.data,
          affected_organizations: organizationIds || [],
          is_active: true
        })
        .select()
        .single()

      return data || null

    } catch (error) {
      console.error('Failed to store insight:', error)
      return null
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const externalIntelligenceService = new ExternalIntelligenceService()