import type { 
  FYIInsight,
  FYIContext,
  FYIUserPreferences,
  FYIFilters
} from '@/types/fyi'
import type { 
  Database
} from '@/types/database'

type FYIInsightCache = Database['public']['Tables']['fyi_insights_cache']['Row']
type FYIInsightCacheInsert = Database['public']['Tables']['fyi_insights_cache']['Insert']

/**
 * FYI factory for creating test FYI insights and related data
 * Following CLAUDE.md factory patterns and comprehensive coverage requirements
 */
export const FYIFactory = {
  /**
   * Create a basic FYI insight cache entry
   */
  buildInsightCache(overrides: Partial<FYIInsightCacheInsert> = {}): FYIInsightCacheInsert {
    const timestamp = new Date().toISOString()
    const randomId = Math.random().toString(36).substr(2, 9)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    
    return {
      insight_id: `insight-${randomId}`,
      title: `Market Update: Technology Sector Performance ${randomId}`,
      summary: `Key insights on technology sector performance and market trends affecting board decisions - ${randomId}`,
      type: 'financial',
      source: 'Bloomberg API',
      url: `https://api.bloomberg.com/insights/${randomId}`,
      published_at: timestamp,
      expires_at: expiresAt,
      relevance_score: 0.85,
      context_entity: 'technology,market,performance',
      tags: ['technology', 'market-analysis', 'board-insights'],
      raw_data: {
        symbols: ['TECH', 'NASDAQ'],
        metrics: {
          volatility: 0.23,
          volume: 1250000,
          change: '+2.5%'
        },
        confidence: 0.85,
        data_sources: ['bloomberg', 'reuters']
      },
      ...overrides,
    }
  },

  /**
   * Create a news-type FYI insight
   */
  buildNewsInsight(overrides: Partial<FYIInsightCacheInsert> = {}): FYIInsightCacheInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toISOString()
    
    return this.buildInsightCache({
      insight_id: `news-${randomId}`,
      title: `Industry News: Major Regulatory Changes Impact ${randomId}`,
      summary: `Breaking news on regulatory changes that may impact corporate governance and compliance requirements - ${randomId}`,
      type: 'news',
      source: 'Reuters API',
      url: `https://api.reuters.com/news/${randomId}`,
      relevance_score: 0.92,
      context_entity: 'regulation,compliance,governance',
      tags: ['regulatory', 'compliance', 'breaking-news'],
      raw_data: {
        category: 'regulatory',
        urgency: 'high',
        geographic_scope: ['US', 'EU'],
        affected_sectors: ['financial-services', 'technology'],
        confidence: 0.92
      },
      ...overrides,
    })
  },

  /**
   * Create a regulatory FYI insight
   */
  buildRegulatoryInsight(overrides: Partial<FYIInsightCacheInsert> = {}): FYIInsightCacheInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.buildInsightCache({
      insight_id: `regulatory-${randomId}`,
      title: `Regulatory Alert: New ESG Reporting Requirements ${randomId}`,
      summary: `New environmental, social, and governance reporting requirements that will affect board oversight responsibilities - ${randomId}`,
      type: 'regulatory',
      source: 'SEC Filing System',
      url: `https://sec.gov/alerts/${randomId}`,
      relevance_score: 0.95,
      context_entity: 'ESG,reporting,compliance',
      tags: ['ESG', 'regulatory', 'reporting', 'compliance'],
      raw_data: {
        regulation_type: 'ESG',
        effective_date: '2024-07-01',
        compliance_deadline: '2024-12-31',
        scope: 'public-companies',
        requirements: ['carbon-footprint', 'diversity-metrics', 'governance-structure'],
        confidence: 0.95
      },
      ...overrides,
    })
  },

  /**
   * Create a competitive intelligence insight
   */
  buildCompetitiveInsight(overrides: Partial<FYIInsightCacheInsert> = {}): FYIInsightCacheInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.buildInsightCache({
      insight_id: `competitive-${randomId}`,
      title: `Competitive Intelligence: Market Leader Announces Strategic Partnership ${randomId}`,
      summary: `Major competitor announces strategic partnership that could reshape industry dynamics and competitive landscape - ${randomId}`,
      type: 'competitive',
      source: 'Market Intelligence API',
      url: `https://marketintel.com/insights/${randomId}`,
      relevance_score: 0.78,
      context_entity: 'competition,partnership,strategy',
      tags: ['competitive-intelligence', 'partnerships', 'market-dynamics'],
      raw_data: {
        competitor: 'Major Corp Inc',
        partnership_type: 'strategic',
        market_impact: 'significant',
        timeline: 'Q2 2024',
        affected_markets: ['enterprise-software', 'cloud-services'],
        confidence: 0.78
      },
      ...overrides,
    })
  },

  /**
   * Create financial insight
   */
  buildFinancialInsight(overrides: Partial<FYIInsightCacheInsert> = {}): FYIInsightCacheInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.buildInsightCache({
      insight_id: `financial-${randomId}`,
      title: `Financial Alert: Interest Rate Changes Impact Industry ${randomId}`,
      summary: `Federal Reserve interest rate changes and their projected impact on industry financing and investment strategies - ${randomId}`,
      type: 'financial',
      source: 'Federal Reserve API',
      url: `https://fed.gov/data/rates/${randomId}`,
      relevance_score: 0.88,
      context_entity: 'interest-rates,financing,investment',
      tags: ['federal-reserve', 'interest-rates', 'financial-planning'],
      raw_data: {
        rate_change: '+0.25%',
        new_rate: '5.50%',
        effective_date: '2024-03-20',
        industry_impact: 'moderate-to-high',
        sectors_affected: ['real-estate', 'banking', 'manufacturing'],
        confidence: 0.88
      },
      ...overrides,
    })
  },

  /**
   * Create expired insight (for cache cleanup testing)
   */
  buildExpiredInsight(overrides: Partial<FYIInsightCacheInsert> = {}): FYIInsightCacheInsert {
    const expiredTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() // 48 hours ago
    
    return this.buildInsightCache({
      title: 'Expired Market Analysis',
      summary: 'This insight has expired and should be cleaned up from cache',
      expires_at: expiredTimestamp,
      relevance_score: 0.65,
      ...overrides,
    })
  },

  /**
   * Create low relevance insight (for filtering testing)
   */
  buildLowRelevanceInsight(overrides: Partial<FYIInsightCacheInsert> = {}): FYIInsightCacheInsert {
    return this.buildInsightCache({
      title: 'Low Relevance Market Note',
      summary: 'Minor market update with low relevance to board decisions',
      relevance_score: 0.25,
      context_entity: 'general,low-priority',
      tags: ['general', 'low-priority'],
      ...overrides,
    })
  },

  /**
   * Build multiple insights with varied types and relevance
   */
  buildMany(count: number, overrides: Partial<FYIInsightCacheInsert> = {}): FYIInsightCacheInsert[] {
    const builders = [
      () => this.buildNewsInsight(),
      () => this.buildFinancialInsight(),
      () => this.buildRegulatoryInsight(),
      () => this.buildCompetitiveInsight(),
    ]
    
    return Array.from({ length: count }, (_, index) => {
      const builder = builders[index % builders.length]!
      return builder({
        insight_id: `bulk-insight-${index}-${Date.now()}`,
        title: `Bulk Insight ${index + 1}`,
        ...overrides,
      })
    })
  },

  /**
   * Build insights with different relevance scores (for testing filtering)
   */
  buildWithRelevanceScores(): FYIInsightCacheInsert[] {
    return [
      this.buildInsightCache({ relevance_score: 0.95, title: 'Critical Board Alert' }),
      this.buildInsightCache({ relevance_score: 0.75, title: 'Important Market Update' }),
      this.buildInsightCache({ relevance_score: 0.55, title: 'Moderate Industry News' }),
      this.buildInsightCache({ relevance_score: 0.25, title: 'Low Priority Information' }),
    ]
  },

  /**
   * Build insights for performance testing (large dataset)
   */
  buildLargeDataset(count: number = 1000): FYIInsightCacheInsert[] {
    return this.buildMany(count, {
      summary: 'Performance test insight with substantial content to test rendering and virtual scrolling capabilities in the FYI panel',
    })
  }
}

/**
 * FYI Context factory for testing context detection
 */
export const FYIContextFactory = {
  buildContext(overrides: Partial<FYIContext> = {}): FYIContext {
    return {
      entities: ['technology', 'board-governance', 'financial-performance'],
      contextType: 'organization',
      primaryEntity: 'board-governance',
      confidence: 0.85,
      ...overrides,
    }
  },

  buildDocumentContext(overrides: Partial<FYIContext> = {}): FYIContext {
    return this.buildContext({
      entities: ['quarterly-report', 'financial-analysis', 'performance-metrics'],
      contextType: 'document',
      primaryEntity: 'quarterly-report',
      confidence: 0.92,
      ...overrides,
    })
  },

  buildMeetingContext(overrides: Partial<FYIContext> = {}): FYIContext {
    return this.buildContext({
      entities: ['board-meeting', 'strategic-planning', 'risk-assessment'],
      contextType: 'meeting',
      primaryEntity: 'strategic-planning',
      confidence: 0.88,
      ...overrides,
    })
  },

  buildGeneralContext(overrides: Partial<FYIContext> = {}): FYIContext {
    return this.buildContext({
      entities: ['general-market', 'industry-trends'],
      contextType: 'general',
      confidence: 0.65,
      ...overrides,
    })
  }
}

/**
 * FYI User Preferences factory for testing user settings
 */
export const FYIPreferencesFactory = {
  buildPreferences(userId: string, overrides: Partial<FYIUserPreferences> = {}): FYIUserPreferences {
    const timestamp = new Date().toISOString()
    
    return {
      userId,
      enabled_sources: ['Bloomberg API', 'Reuters API', 'SEC Filing System'],
      relevance_threshold: 0.70,
      auto_refresh_interval: 15, // minutes
      notification_preferences: {
        high_priority: true,
        medium_priority: true,
        email_digest: false,
        in_app_notifications: true,
      },
      excluded_topics: ['celebrity-news', 'sports'],
      preferred_languages: ['en', 'en-US'],
      created_at: timestamp,
      updated_at: timestamp,
      ...overrides,
    }
  },

  buildConservativePreferences(userId: string): FYIUserPreferences {
    return this.buildPreferences(userId, {
      relevance_threshold: 0.85,
      auto_refresh_interval: 30,
      notification_preferences: {
        high_priority: true,
        medium_priority: false,
        email_digest: false,
        in_app_notifications: false,
      },
    })
  },

  buildAggressivePreferences(userId: string): FYIUserPreferences {
    return this.buildPreferences(userId, {
      relevance_threshold: 0.50,
      auto_refresh_interval: 5,
      notification_preferences: {
        high_priority: true,
        medium_priority: true,
        email_digest: true,
        in_app_notifications: true,
      },
    })
  }
}

/**
 * FYI Filters factory for testing query filtering
 */
export const FYIFiltersFactory = {
  buildFilters(overrides: Partial<FYIFilters> = {}): FYIFilters {
    return {
      type: 'financial',
      relevanceThreshold: 0.70,
      fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      toDate: new Date().toISOString(),
      search: '',
      ...overrides,
    }
  },

  buildNewsFilters(): FYIFilters {
    return this.buildFilters({
      type: 'news',
      relevanceThreshold: 0.80,
      search: 'regulatory',
    })
  },

  buildHighRelevanceFilters(): FYIFilters {
    return this.buildFilters({
      relevanceThreshold: 0.90,
    })
  },

  buildDateRangeFilters(fromDate: string, toDate: string): FYIFilters {
    return this.buildFilters({
      fromDate,
      toDate,
    })
  }
}

// Predefined scenarios for common testing scenarios following CLAUDE.md patterns
export const FYIScenarios = {
  // Critical board alert scenario
  criticalAlert: {
    title: 'Critical: Major Cybersecurity Breach Industry-Wide',
    summary: 'Industry-wide cybersecurity incident affecting multiple major corporations requiring immediate board attention and response planning',
    type: 'news',
    relevance_score: 0.98,
    context_entity: 'cybersecurity,incident-response,board-emergency',
    tags: ['critical', 'cybersecurity', 'incident-response', 'board-alert'],
  },

  // Regulatory compliance scenario
  complianceUpdate: {
    title: 'Regulatory Update: New Board Composition Requirements',
    summary: 'New regulatory requirements for board composition and diversity reporting with upcoming compliance deadlines',
    type: 'regulatory',
    relevance_score: 0.89,
    context_entity: 'board-composition,diversity,compliance',
    tags: ['regulatory', 'board-composition', 'diversity', 'compliance'],
  },

  // Market analysis scenario
  marketAnalysis: {
    title: 'Market Analysis: Sector Performance Review Q1 2024',
    summary: 'Comprehensive analysis of sector performance with implications for strategic planning and investment decisions',
    type: 'financial',
    relevance_score: 0.76,
    context_entity: 'market-analysis,sector-performance,strategic-planning',
    tags: ['market-analysis', 'performance', 'strategic-planning'],
  },

  // Competitive intelligence scenario
  competitiveIntel: {
    title: 'Competitive Intelligence: Major Competitor Acquisition',
    summary: 'Major competitor announces significant acquisition that will reshape competitive landscape and market dynamics',
    type: 'competitive',
    relevance_score: 0.82,
    context_entity: 'competition,acquisition,market-dynamics',
    tags: ['competitive-intelligence', 'acquisition', 'market-disruption'],
  }
}

export default FYIFactory