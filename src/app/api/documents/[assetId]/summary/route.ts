import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../../../../../types/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
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
    ) as any

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = await params

    // Verify user has access to this asset
    const { data: asset, error: assetError } = await supabase
      .from('vault_assets')
      .select(`
        *,
        asset:assets!vault_assets_asset_id_fkey(*),
        vault:vaults!inner(created_by)
      `)
      .eq('asset_id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if ((asset as any)?.vault?.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if summary already exists and is recent
    const { data: existingSummary, error: summaryError } = await supabase
      .from('document_summaries')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (summaryError) {
      console.error('Error fetching existing summary:', summaryError)
    }

    // If summary exists and is recent (less than 24 hours), return it
    if (existingSummary && existingSummary.length > 0) {
      const summary = existingSummary[0]
      const createdAt = new Date((summary as any)?.created_at || '')
      const now = new Date()
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

      if (hoursDiff < 24) {
        return NextResponse.json({
          id: (summary as any)?.id,
          title: (summary as any)?.title,
          keyPoints: (summary as any)?.key_points,
          generatedAt: (summary as any)?.created_at,
          wordCount: (summary as any)?.word_count
        })
      }
    }

    // Generate new summary using AI
    const generatedSummary = await generateDocumentSummary(asset)

    // Save generated summary to database
    const summaryData: Database['public']['Tables']['document_summaries']['Insert'] = {
      asset_id: assetId,
      title: generatedSummary.title,
      key_points: generatedSummary.keyPoints,
      word_count: generatedSummary.wordCount,
      user_id: user.id
    }

    const { data: savedSummary, error: saveError } = await supabase
      .from('document_summaries')
      .insert(summaryData)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving summary:', saveError)
      // Still return the generated summary even if save fails
      return NextResponse.json(generatedSummary)
    }

    return NextResponse.json({
      id: (savedSummary as any)?.id,
      title: (savedSummary as any)?.title,
      keyPoints: (savedSummary as any)?.key_points,
      generatedAt: (savedSummary as any)?.created_at,
      wordCount: (savedSummary as any)?.word_count
    })

  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

async function generateDocumentSummary(asset: any): Promise<{
  id: string;
  title: string;
  keyPoints: string[];
  generatedAt: string;
  wordCount: number;
}> {
  // This is a simplified summary generation for demonstration
  // In a real implementation, you would:
  // 1. Extract text from the PDF/document
  // 2. Use an LLM to analyze the content and generate a summary
  // 3. Parse the response into the required format

  const documentType = (asset?.asset?.file_name || asset?.name || 'document').toLowerCase()
  let title: string = "Document Summary"
  let keyPoints: string[] = []

  if (documentType.includes('report')) {
    title = "Research Report Summary"
    keyPoints = [
      "Comprehensive analysis of the research topic with detailed methodology",
      "Significant findings that support the main hypothesis with statistical backing",
      "Clear recommendations for implementation based on evidence",
      "Identification of key risks and mitigation strategies",
      "Future research directions and areas for further investigation",
      "Stakeholder impact analysis and communication strategy",
      "Budget considerations and resource allocation requirements"
    ]
  } else if (documentType.includes('proposal')) {
    title = "Proposal Summary"
    keyPoints = [
      "Clear problem statement and project objectives outlined",
      "Detailed solution approach with implementation timeline",
      "Budget breakdown and resource requirements specified",
      "Expected outcomes and success metrics defined",
      "Risk assessment and contingency planning included"
    ]
  } else if (documentType.includes('analysis')) {
    title = "Analysis Summary"
    keyPoints = [
      "Thorough examination of the subject matter with data-driven insights",
      "Key trends and patterns identified through statistical analysis",
      "Comparative analysis with industry benchmarks and standards",
      "Critical success factors and performance indicators highlighted",
      "Strategic recommendations based on analytical findings"
    ]
  } else {
    title = `${asset?.asset?.file_name || 'Document'} - AI Summary`
    keyPoints = [
      "Document provides comprehensive coverage of the main topic areas",
      "Key concepts and methodologies are clearly explained and documented",
      "Important findings and conclusions are well-supported by evidence",
      "Practical applications and implementation guidance are included",
      "References and supporting materials enhance the document's credibility",
      "Clear structure and organization facilitate easy navigation and understanding"
    ]
  }

  const wordCount: number = keyPoints.join(' ').split(' ').length + title.split(' ').length

  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 2000))

  return {
    id: `summary-${Date.now()}`,
    title,
    keyPoints,
    generatedAt: new Date().toISOString(),
    wordCount
  }
}