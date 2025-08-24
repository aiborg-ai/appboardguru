import { NextRequest, NextResponse } from 'next/server'
import { AIDocumentSummarizerService } from '@/lib/services/ai-document-summarizer.service'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const summarizerService = new AIDocumentSummarizerService()

// POST /api/documents/batch-summarize - Generate summaries for multiple documents
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      documentIds,
      summaryType = 'executive',
      organizationId
    } = body

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Document IDs array is required' },
        { status: 400 }
      )
    }

    if (documentIds.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 documents can be processed at once' },
        { status: 400 }
      )
    }

    // Get documents from database
    const { data: documents, error: docError } = await supabase
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
      .in('id', documentIds)
      .eq('vault.organization_members.user_id', user.id)

    if (docError) {
      throw docError
    }

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'No accessible documents found' },
        { status: 404 }
      )
    }

    // Process documents in parallel with concurrency limit
    const results = []
    const batchSize = 3 // Process 3 documents at a time
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (document) => {
        try {
          // Check for existing summary
          const { data: existingSummary } = await supabase
            .from('document_summaries')
            .select('*')
            .eq('document_id', document.id)
            .eq('summary_type', summaryType)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (existingSummary) {
            return {
              documentId: document.id,
              success: true,
              summary: existingSummary,
              cached: true
            }
          }

          // Get document content
          let content = ''
          if (document.content_text) {
            content = document.content_text
          } else {
            content = `Document: ${document.name}\nType: ${document.file_type}\nDescription: ${document.description || 'No description available'}`
          }

          // Generate summary
          const summary = await summarizerService.summarizeDocument({
            documentId: document.id,
            documentType: this.inferDocumentType(document.file_type, document.name),
            content,
            metadata: {
              title: document.name,
              author: document.uploaded_by_name || 'Unknown',
              dateCreated: document.created_at,
              wordCount: content.split(' ').length
            },
            summaryType: summaryType as any,
            organizationId: document.vault?.organization_id || organizationId,
            userId: user.id
          })

          // Store summary in database
          const { data: savedSummary, error: saveError } = await supabase
            .from('document_summaries')
            .insert({
              id: summary.id,
              document_id: document.id,
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
              organization_id: document.vault?.organization_id || organizationId
            })
            .select()
            .single()

          return {
            documentId: document.id,
            documentName: document.name,
            success: true,
            summary: savedSummary || summary,
            cached: false
          }

        } catch (error) {
          console.error(`Error processing document ${document.id}:`, error)
          return {
            documentId: document.id,
            documentName: document.name,
            success: false,
            error: error.message,
            cached: false
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Add small delay between batches to avoid overwhelming the AI service
      if (i + batchSize < documents.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Calculate summary statistics
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const cached = results.filter(r => r.cached)

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
          cached: cached.length,
          newlyGenerated: successful.length - cached.length
        }
      }
    })

  } catch (error) {
    console.error('Error in batch summarization:', error)
    return NextResponse.json(
      { error: 'Failed to process batch summarization' },
      { status: 500 }
    )
  }
}

// Helper function to infer document type
function inferDocumentType(fileType: string, fileName: string): string {
  const lowerFileName = fileName.toLowerCase()
  
  if (lowerFileName.includes('financial') || lowerFileName.includes('budget') || lowerFileName.includes('revenue')) {
    return 'financial_report'
  }
  
  if (lowerFileName.includes('contract') || lowerFileName.includes('agreement')) {
    return 'contract'
  }
  
  if (lowerFileName.includes('minutes') || lowerFileName.includes('meeting')) {
    return 'meeting_minutes'
  }
  
  if (lowerFileName.includes('board') || lowerFileName.includes('pack')) {
    return 'board_pack'
  }
  
  if (fileType === 'application/pdf') {
    return 'pdf'
  }
  
  return 'text'
}