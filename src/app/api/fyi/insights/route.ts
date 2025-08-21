import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { rateLimiter } from '@/lib/rate-limiter'
import { llmSummarizer } from '@/lib/services/llm-summarizer'

interface FYIInsight {
  id: string
  type: 'news' | 'competitor' | 'industry' | 'regulation' | 'market'
  title: string
  summary: string
  source: string
  url: string
  relevanceScore: number
  contextEntity?: string
  publishedAt: string
  tags: string[]
}

interface ExternalDataSource {
  name: string
  apiKey?: string
  baseUrl: string
  enabled: boolean
}

interface NewsAPIArticle {
  title: string
  description: string
  url: string
  source: { name: string }
  publishedAt: string
  content?: string
}

// Configure external data sources
const dataSources: ExternalDataSource[] = [
  {
    name: 'NewsAPI',
    baseUrl: 'https://newsapi.org/v2',
    enabled: !!process.env.NEWS_API_KEY
  },
  {
    name: 'AlphaVantage',
    baseUrl: 'https://www.alphavantage.co/query',
    enabled: !!process.env.ALPHA_VANTAGE_API_KEY
  }
]

async function fetchNewsAPIData(query: string, entities: string[]): Promise<Partial<FYIInsight>[]> {
  if (!process.env.NEWS_API_KEY) {
    return []
  }

  // Check rate limit for NewsAPI
  const newsRateLimit = await rateLimiter.checkLimit('newsapi', 'global')
  if (!newsRateLimit.allowed) {
    console.warn('NewsAPI rate limit exceeded')
    return []
  }

  try {
    const searchTerms = [query, ...entities.slice(0, 3)].filter(Boolean).join(' OR ')
    const url = new URL('https://newsapi.org/v2/everything')
    
    url.searchParams.append('q', searchTerms)
    url.searchParams.append('apiKey', process.env.NEWS_API_KEY)
    url.searchParams.append('language', 'en')
    url.searchParams.append('sortBy', 'relevancy')
    url.searchParams.append('pageSize', '20')
    url.searchParams.append('from', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      console.warn('NewsAPI request failed:', response.status)
      return []
    }

    const data = await response.json()
    
    if (!data.articles) {
      return []
    }

    return data.articles.map((article: NewsAPIArticle): Partial<FYIInsight> => ({
      type: 'news',
      title: article.title,
      summary: article.description || article.content?.substring(0, 300) || '',
      source: article.source.name,
      url: article.url,
      publishedAt: article.publishedAt,
      tags: []
    }))
  } catch (error) {
    console.error('Error fetching NewsAPI data:', error)
    return []
  }
}

async function fetchMarketData(entities: string[]): Promise<Partial<FYIInsight>[]> {
  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    return []
  }

  // Check rate limit for Alpha Vantage
  const alphaRateLimit = await rateLimiter.checkLimit('alphavantage', 'global')
  if (!alphaRateLimit.allowed) {
    console.warn('Alpha Vantage rate limit exceeded')
    return []
  }

  try {
    const insights: Partial<FYIInsight>[] = []
    
    // Search for company symbols among entities
    for (const entity of entities.slice(0, 2)) {
      try {
        const url = new URL('https://www.alphavantage.co/query')
        url.searchParams.append('function', 'SYMBOL_SEARCH')
        url.searchParams.append('keywords', entity)
        url.searchParams.append('apikey', process.env.ALPHA_VANTAGE_API_KEY)

        const response = await fetch(url.toString())
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.bestMatches && data.bestMatches.length > 0) {
            const match = data.bestMatches[0]
            insights.push({
              type: 'market',
              title: `${match['2. name']} (${match['1. symbol']}) - Market Analysis`,
              summary: `Latest market data and performance metrics for ${match['2. name']}`,
              source: 'Alpha Vantage',
              url: `https://finance.yahoo.com/quote/${match['1. symbol']}`,
              publishedAt: new Date().toISOString(),
              contextEntity: entity,
              tags: ['market', 'finance', 'stock']
            })
          }
        }

        // Add delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error fetching market data for ${entity}:`, error)
      }
    }

    return insights
  } catch (error) {
    console.error('Error fetching market data:', error)
    return []
  }
}

function calculateRelevanceScore(
  insight: Partial<FYIInsight>,
  context: string | null,
  entities: string[]
): number {
  let score = 0.5 // Base score

  const title = insight.title?.toLowerCase() || ''
  const summary = insight.summary?.toLowerCase() || ''
  const combinedText = `${title} ${summary}`

  // Context matching
  if (context && combinedText.includes(context.toLowerCase())) {
    score += 0.3
  }

  // Entity matching
  let entityMatches = 0
  entities.forEach(entity => {
    if (combinedText.includes(entity.toLowerCase())) {
      entityMatches++
    }
  })

  if (entityMatches > 0) {
    score += Math.min(entityMatches * 0.15, 0.4)
  }

  // Recency bonus
  if (insight.publishedAt) {
    const publishedDate = new Date(insight.publishedAt)
    const hoursSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60)
    
    if (hoursSincePublished < 24) {
      score += 0.1
    } else if (hoursSincePublished < 72) {
      score += 0.05
    }
  }

  return Math.min(score, 1.0)
}

function extractTags(title: string, summary: string, entities: string[]): string[] {
  const text = `${title} ${summary}`.toLowerCase()
  const tags: string[] = []

  // Industry tags
  const industryKeywords = {
    'technology': ['tech', 'software', 'ai', 'artificial intelligence', 'digital', 'cloud'],
    'finance': ['financial', 'banking', 'investment', 'market', 'stock', 'fund'],
    'healthcare': ['health', 'medical', 'pharmaceutical', 'biotech', 'drug'],
    'energy': ['energy', 'oil', 'gas', 'renewable', 'solar', 'wind'],
    'retail': ['retail', 'consumer', 'shopping', 'ecommerce'],
    'automotive': ['automotive', 'car', 'vehicle', 'tesla', 'ford']
  }

  Object.entries(industryKeywords).forEach(([industry, keywords]) => {
    if (keywords.some(keyword => text.includes(keyword))) {
      tags.push(industry)
    }
  })

  // Add relevant entities as tags
  entities.slice(0, 3).forEach(entity => {
    if (text.includes(entity.toLowerCase())) {
      tags.push(entity)
    }
  })

  return [...new Set(tags)] // Remove duplicates
}

async function generateAISummary(title: string, content: string, context?: string): Promise<{ summary: string; tags: string[] }> {
  try {
    const result = await llmSummarizer.summarizeInsight({
      title,
      content,
      context: context || '',
      maxLength: 250,
      style: 'brief'
    })

    return {
      summary: result.summary,
      tags: result.tags
    }
  } catch (error) {
    console.error('Error in AI summarization:', error)
    
    // Fallback to simple summarization
    const maxLength = 250
    if (content.length <= maxLength) {
      return { summary: content, tags: [] }
    }

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
    
    if (sentences.length <= 2) {
      return { 
        summary: content.substring(0, maxLength) + '...', 
        tags: [] 
      }
    }

    const summary = sentences.slice(0, 2).join('. ').trim()
    return {
      summary: summary.length > maxLength 
        ? summary.substring(0, maxLength) + '...'
        : summary + '.',
      tags: []
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check rate limit for user
    const userRateLimit = await rateLimiter.checkLimit('fyi-user', user.id)
    if (!userRateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          resetTime: userRateLimit.resetTime 
        },
        { status: 429 }
      )
    }

    const { context, entities, filters } = await request.json()

    // Validate request
    if (!Array.isArray(entities)) {
      return NextResponse.json(
        { error: 'Invalid entities parameter' },
        { status: 400 }
      )
    }

    const allInsights: Partial<FYIInsight>[] = []

    // Fetch data from multiple sources in parallel
    const fetchPromises = []

    // News data
    if (context || entities.length > 0) {
      fetchPromises.push(fetchNewsAPIData(context || '', entities))
    }

    // Market data
    if (entities.length > 0) {
      fetchPromises.push(fetchMarketData(entities))
    }

    // Execute all fetches
    const results = await Promise.allSettled(fetchPromises)
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allInsights.push(...result.value)
      }
    })

    // Process and enhance insights
    const processedInsights: FYIInsight[] = []

    for (const insight of allInsights) {
      if (!insight.title || !insight.summary) continue

      const relevanceScore = calculateRelevanceScore(insight, context, entities)
      
      // Filter by relevance threshold
      if (relevanceScore < (filters.relevanceThreshold || 0.6)) {
        continue
      }

      // Filter by type
      if (filters.type && insight.type !== filters.type) {
        continue
      }

      // Filter by search term
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const searchableText = `${insight.title} ${insight.summary}`.toLowerCase()
        if (!searchableText.includes(searchTerm)) {
          continue
        }
      }

      // Filter by date range
      if (filters.fromDate || filters.toDate) {
        const publishedDate = new Date(insight.publishedAt || Date.now())
        
        if (filters.fromDate && publishedDate < new Date(filters.fromDate)) {
          continue
        }
        if (filters.toDate && publishedDate > new Date(filters.toDate)) {
          continue
        }
      }

      // Enhance the insight with AI summarization
      const aiResult = await generateAISummary(
        insight.title, 
        insight.summary || '', 
        context
      )

      const enhancedInsight: FYIInsight = {
        id: `${insight.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: insight.type || 'news',
        title: insight.title,
        summary: aiResult.summary,
        source: insight.source || 'Unknown',
        url: insight.url || '',
        relevanceScore,
        contextEntity: insight.contextEntity || (entities.length > 0 ? entities[0] : undefined),
        publishedAt: insight.publishedAt || new Date().toISOString(),
        tags: aiResult.tags.length > 0 
          ? aiResult.tags 
          : extractTags(insight.title, insight.summary || '', entities)
      }

      processedInsights.push(enhancedInsight)
    }

    // Sort by relevance score and published date
    processedInsights.sort((a, b) => {
      if (Math.abs(a.relevanceScore - b.relevanceScore) > 0.1) {
        return b.relevanceScore - a.relevanceScore
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    // Limit results
    const limitedInsights = processedInsights.slice(0, 50)

    return NextResponse.json({
      insights: limitedInsights,
      totalCount: limitedInsights.length,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in FYI insights API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}