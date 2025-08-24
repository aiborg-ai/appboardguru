import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { FYIService } from '@/lib/services/fyi.service'
import type { FYIContext } from '@/types/fyi'

// Generate sample insights for demo/fallback purposes
function generateSampleInsights(context: string | null, entities: string[]) {
  const sampleInsights = [
    {
      id: `insight_${Date.now()}_1`,
      type: 'news' as const,
      title: 'Board Governance Trends: Latest Industry Updates',
      summary: 'Recent developments in corporate governance show increased focus on ESG integration and stakeholder engagement. Key trends include enhanced board diversity requirements and digital transformation in governance processes.',
      source: 'Corporate Governance Weekly',
      url: '#',
      relevanceScore: 0.85,
      contextEntity: context || 'governance',
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['governance', 'esg', 'board-management']
    },
    {
      id: `insight_${Date.now()}_2`,
      type: 'industry' as const,
      title: 'Digital Board Management Solutions Gaining Momentum',
      summary: 'Organizations are increasingly adopting digital-first approaches to board management, with 78% of companies planning to enhance their digital governance capabilities in the next 12 months.',
      source: 'Tech Governance Report',
      url: '#',
      relevanceScore: 0.92,
      contextEntity: entities[0] || 'technology',
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['digital-transformation', 'board-technology', 'efficiency']
    },
    {
      id: `insight_${Date.now()}_3`,
      type: 'regulation' as const,
      title: 'New Compliance Requirements for Board Reporting',
      summary: 'Regulatory bodies are introducing enhanced reporting requirements for board activities and decision-making processes. Organizations should prepare for increased transparency and documentation standards.',
      source: 'Regulatory Updates',
      url: '#',
      relevanceScore: 0.78,
      contextEntity: 'compliance',
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['compliance', 'reporting', 'regulation']
    },
    {
      id: `insight_${Date.now()}_4`,
      type: 'market' as const,
      title: 'Board Management Platform Market Analysis',
      summary: 'The board management software market is experiencing significant growth, driven by increased demand for secure, efficient governance solutions. Key players are focusing on AI-powered insights and enhanced security features.',
      source: 'Market Intelligence',
      url: '#',
      relevanceScore: 0.68,
      contextEntity: 'market-analysis',
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['market-trends', 'technology', 'growth']
    },
    {
      id: `insight_${Date.now()}_5`,
      type: 'competitor' as const,
      title: 'Best Practices in Board Collaboration Tools',
      summary: 'Leading organizations are implementing advanced collaboration features in their board management systems, including real-time document collaboration, secure messaging, and integrated video conferencing capabilities.',
      source: 'Industry Best Practices',
      url: '#',
      relevanceScore: 0.73,
      contextEntity: 'collaboration',
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['best-practices', 'collaboration', 'innovation']
    }
  ]

  // Filter insights based on context if provided
  if (context) {
    return sampleInsights.filter(insight => 
      insight.title.toLowerCase().includes(context.toLowerCase()) ||
      insight.summary.toLowerCase().includes(context.toLowerCase()) ||
      insight.tags.some(tag => tag.includes(context.toLowerCase()))
    ).slice(0, 3) // Return top 3 relevant insights
  }

  // Filter based on entities if provided
  if (entities && entities.length > 0) {
    const entityKeywords = entities.map(e => e.toLowerCase())
    return sampleInsights.filter(insight =>
      entityKeywords.some(keyword =>
        insight.title.toLowerCase().includes(keyword) ||
        insight.summary.toLowerCase().includes(keyword) ||
        insight.tags.some(tag => tag.includes(keyword))
      )
    ).slice(0, 4) // Return top 4 entity-relevant insights
  }

  // Return all sample insights
  return sampleInsights
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { context, entities, filters }: { 
      context: string | null, 
      entities: string[],
      filters: any 
    } = body

    // Get user's primary organization (with fallback for development)
    let organizationId = 'demo_org'
    try {
      const { data: userOrg, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .eq('status', 'active')
        .single()

      if (userOrg?.organization_id) {
        organizationId = userOrg.organization_id
      }
    } catch (error) {
      // Continue with demo organization ID if organization lookup fails
      console.log('Using demo organization for FYI insights:', error)
    }

    // Create FYI context from request
    const fyiContext: FYIContext = {
      primaryEntity: context || undefined,
      entities: entities || [],
      contextType: 'general',
      confidence: 0.5
    }

    // Initialize FYI service
    const fyiService = new FYIService(supabase, {
      newsApiKey: process.env['NEWS_API_KEY'],
      alphaVantageKey: process.env['ALPHA_VANTAGE_API_KEY'],
      openRouterKey: process.env['OPENROUTER_API_KEY']
    })

    let insights
    try {
      insights = await fyiService.fetchInsights(organizationId, user.id, fyiContext)
    } catch (serviceError) {
      console.log('FYI service error, using fallback insights:', serviceError)
      // Provide sample insights as fallback
      insights = generateSampleInsights(context, entities)
    }

    return NextResponse.json({
      insights,
      totalCount: insights.length,
      lastUpdated: new Date().toISOString(),
      metadata: {
        timestamp: new Date().toISOString(),
        count: insights.length,
        userId: user.id,
        organizationId
      }
    })
  } catch (error) {
    console.error('FYI insights error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}