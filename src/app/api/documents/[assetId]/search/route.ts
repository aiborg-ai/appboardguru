import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = params
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json([])
    }

    // Verify user has access to this asset
    const { data: asset, error: assetError } = await supabase
      .from('vault_assets')
      .select('*, vaults!inner(user_id)')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if (asset.vaults.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if search results exist in cache
    const { data: cachedResults, error: cacheError } = await supabase
      .from('document_search_cache')
      .select('*')
      .eq('asset_id', assetId)
      .eq('query', query.toLowerCase())
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 1 hour cache
      .order('created_at', { ascending: false })
      .limit(1)

    if (cacheError) {
      console.error('Error checking search cache:', cacheError)
    }

    if (cachedResults && cachedResults.length > 0) {
      return NextResponse.json(cachedResults[0].results)
    }

    // Perform document search
    const searchResults = await performDocumentSearch(asset, query)

    // Cache the search results
    const { error: saveError } = await supabase
      .from('document_search_cache')
      .insert({
        asset_id: assetId,
        query: query.toLowerCase(),
        results: searchResults,
        user_id: user.id
      })

    if (saveError) {
      console.error('Error caching search results:', saveError)
    }

    return NextResponse.json(searchResults)

  } catch (error) {
    console.error('Error performing search:', error)
    return NextResponse.json(
      { error: 'Failed to search document' },
      { status: 500 }
    )
  }
}

async function performDocumentSearch(asset: any, query: string) {
  // This is a simplified search implementation for demonstration
  // In a real implementation, you would:
  // 1. Extract and index the document text
  // 2. Use full-text search or vector search
  // 3. Return actual matches with coordinates

  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0)
  
  // Mock search results based on common document content
  const mockContent = [
    { page: 1, text: "executive summary", context: "This executive summary provides an overview of the key findings and recommendations presented in this comprehensive report." },
    { page: 2, text: "introduction and background", context: "The introduction and background section establishes the context and rationale for this study, outlining the methodology and approach." },
    { page: 3, text: "methodology", context: "Our methodology employs a mixed-methods approach combining quantitative analysis with qualitative insights." },
    { page: 4, text: "data collection", context: "Data collection was conducted over a six-month period using standardized instruments and protocols." },
    { page: 5, text: "analysis", context: "The analysis reveals significant trends and patterns that inform our recommendations." },
    { page: 6, text: "results", context: "Results indicate a strong correlation between the variables studied and demonstrate statistical significance." },
    { page: 7, text: "findings", context: "Key findings suggest that implementation of the proposed solutions could yield substantial benefits." },
    { page: 8, text: "discussion", context: "The discussion section interprets these findings within the broader context of existing research." },
    { page: 9, text: "recommendations", context: "Based on our analysis, we recommend the following strategic actions and implementation steps." },
    { page: 10, text: "conclusions", context: "In conclusion, this study provides evidence-based insights that can guide future decision-making." },
    { page: 11, text: "future research", context: "Future research should focus on longitudinal studies to validate these preliminary findings." },
    { page: 12, text: "references", context: "The references section contains comprehensive citations of all sources used in this analysis." }
  ]

  // Filter content based on search terms
  const results = mockContent
    .filter(content => 
      searchTerms.some(term => 
        content.text.includes(term) || 
        content.context.toLowerCase().includes(term)
      )
    )
    .map((content, index) => ({
      page: content.page,
      text: content.text,
      context: content.context,
      coordinates: {
        x: 100 + (index * 50) % 400,
        y: 200 + (index * 30) % 600,
        width: 200 + (index * 20) % 100,
        height: 20
      }
    }))

  // Simulate search processing delay
  await new Promise(resolve => setTimeout(resolve, 500))

  return results
}