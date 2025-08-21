import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(
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
      const createdAt = new Date(summary.created_at)
      const now = new Date()
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

      if (hoursDiff < 24) {
        return NextResponse.json({
          id: summary.id,
          title: summary.title,
          keyPoints: summary.key_points,
          generatedAt: summary.created_at,
          wordCount: summary.word_count
        })
      }
    }

    // Generate new summary using AI
    const generatedSummary = await generateDocumentSummary(asset)

    // Save generated summary to database
    const { data: savedSummary, error: saveError } = await supabase
      .from('document_summaries')
      .insert({
        asset_id: assetId,
        title: generatedSummary.title,
        key_points: generatedSummary.keyPoints,
        word_count: generatedSummary.wordCount,
        user_id: user.id
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving summary:', saveError)
      // Still return the generated summary even if save fails
      return NextResponse.json(generatedSummary)
    }

    return NextResponse.json({
      id: savedSummary.id,
      title: savedSummary.title,
      keyPoints: savedSummary.key_points,
      generatedAt: savedSummary.created_at,
      wordCount: savedSummary.word_count
    })

  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

async function generateDocumentSummary(asset: any) {
  // This is a simplified summary generation for demonstration
  // In a real implementation, you would:
  // 1. Extract text from the PDF/document
  // 2. Use an LLM to analyze the content and generate a summary
  // 3. Parse the response into the required format

  const documentType = asset.name.toLowerCase()
  let title = "Document Summary"
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
    title = `${asset.name} - AI Summary`
    keyPoints = [
      "Document provides comprehensive coverage of the main topic areas",
      "Key concepts and methodologies are clearly explained and documented",
      "Important findings and conclusions are well-supported by evidence",
      "Practical applications and implementation guidance are included",
      "References and supporting materials enhance the document's credibility",
      "Clear structure and organization facilitate easy navigation and understanding"
    ]
  }

  const wordCount = keyPoints.join(' ').split(' ').length + title.split(' ').length

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