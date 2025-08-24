import { NextRequest, NextResponse } from 'next/server'
import { AIDocumentSummarizerService } from '@/lib/services/ai-document-summarizer.service'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const summarizerService = new AIDocumentSummarizerService()

// POST /api/documents/[id]/summarize - Generate AI summary for a document
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const documentId = params.id
    const body = await request.json()
    const { 
      summaryType = 'executive',
      documentType = 'pdf',
      forceRegenerate = false 
    } = body

    // Get document from database
    const { data: document, error: docError } = await supabase
      .from('assets')
      .select(`
        *,
        vault:vaults(
          id,
          name,
          organization_id,
          organization_members!inner(user_id, role)
        )
      `)
      .eq('id', documentId)
      .eq('vault.organization_members.user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Check if summary already exists
    if (!forceRegenerate) {
      const { data: existingSummary } = await supabase
        .from('document_summaries')
        .select('*')
        .eq('document_id', documentId)
        .eq('summary_type', summaryType)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existingSummary) {
        return NextResponse.json({
          success: true,
          data: existingSummary,
          cached: true
        })
      }
    }

    // Get document content
    let content = ''
    if (document.content_text) {
      content = document.content_text
    } else if (document.file_path) {
      // In production, would extract text from file
      content = `Document: ${document.name}\nType: ${document.file_type}\nSize: ${document.file_size} bytes\n\nThis document requires text extraction for full summarization.`
    } else {
      content = document.description || `Document: ${document.name}`
    }

    // Generate summary
    const summary = await summarizerService.summarizeDocument({
      documentId,
      documentType: documentType as any,
      content,
      metadata: {
        title: document.name,
        author: document.uploaded_by_name || 'Unknown',
        dateCreated: document.created_at,
        wordCount: content.split(' ').length
      },
      summaryType: summaryType as any,
      organizationId: document.vault?.organization_id || 'unknown',
      userId: user.id
    })

    // Store summary in database
    const { data: savedSummary, error: saveError } = await supabase
      .from('document_summaries')
      .insert({
        id: summary.id,
        document_id: documentId,
        summary_type: summaryType,
        executive_summary: summary.executiveSummary,
        main_topics: summary.mainTopics,
        key_insights: summary.keyInsights,
        sections: summary.sections,
        reading_time: summary.readingTime,
        complexity_score: summary.complexityScore,
        sentiment_score: summary.sentimentScore,
        confidence_score: summary.confidenceScore,
        action_items: summary.actionItems || [],
        decisions: summary.decisions || [],
        risks: summary.risks || [],
        financial_highlights: summary.financialHighlights || [],
        processing_time_ms: summary.processingTimeMs,
        model_used: summary.modelUsed,
        created_by: user.id,
        organization_id: document.vault?.organization_id
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving summary:', saveError)
      // Return summary even if save failed
    }

    return NextResponse.json({
      success: true,
      data: savedSummary || summary,
      cached: false
    })

  } catch (error) {
    console.error('Error generating document summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate document summary' },
      { status: 500 }
    )
  }
}

// GET /api/documents/[id]/summarize - Get existing summaries for a document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const summaryType = searchParams.get('type')

    let query = supabase
      .from('document_summaries')
      .select(`
        *,
        document:assets(name, file_type),
        creator:profiles(name)
      `)
      .eq('document_id', params.id)

    if (summaryType) {
      query = query.eq('summary_type', summaryType)
    }

    const { data: summaries, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: summaries
    })

  } catch (error) {
    console.error('Error retrieving document summaries:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve summaries' },
      { status: 500 }
    )
  }
}