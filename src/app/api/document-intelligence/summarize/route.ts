/**
 * Document Summarization API Endpoint
 * Advanced AI-powered document summarization with priority scoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { smartSummarizationService } from '@/lib/services/smart-summarization.service'
import { aiDocumentIntelligenceService } from '@/lib/services/ai-document-intelligence.service'
import { z } from 'zod'

// Request validation schema
const SummarizeRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  summaryTypes: z.array(z.enum(['executive', 'detailed', 'key-insights', 'action-items', 'risk-assessment'])).min(1),
  options: z.object({
    priorityScoring: z.boolean().optional(),
    maxLength: z.enum(['short', 'medium', 'long']).optional(),
    targetAudience: z.enum(['board', 'executives', 'managers', 'analysts']).optional(),
    focusAreas: z.array(z.string()).optional(),
    includeMetrics: z.boolean().optional(),
    customInstructions: z.string().optional()
  }).optional()
})

const BoardPackSummarizeSchema = z.object({
  documentIds: z.array(z.string()).min(1, 'At least one document ID is required'),
  options: z.object({
    generateExecutiveSummary: z.boolean().default(true),
    prioritizeByUrgency: z.boolean().default(true),
    includeRiskDashboard: z.boolean().default(true),
    maxSummaryLength: z.number().min(100).max(5000).default(1000)
  })
})

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation') || 'single'

    if (operation === 'board-pack') {
      // Board pack summarization
      const validatedData = BoardPackSummarizeSchema.parse(body)
      
      const result = await smartSummarizationService.summarizeBoardPack(
        validatedData.documentIds,
        validatedData.options
      )

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error || 'Failed to summarize board pack'
        }, { status: 500 })
      }

      // Log activity
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        event_type: 'document_intelligence',
        event_category: 'board_pack_summarization',
        action: 'summarize',
        resource_type: 'board_pack',
        resource_id: validatedData.documentIds.join(','),
        event_description: `Generated board pack summary for ${validatedData.documentIds.length} documents`,
        outcome: 'success',
        details: {
          document_count: validatedData.documentIds.length,
          options: validatedData.options
        }
      })

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } else {
      // Single document summarization
      const validatedData = SummarizeRequestSchema.parse(body)
      
      const result = await smartSummarizationService.generateSmartSummary({
        documentId: validatedData.documentId,
        summaryTypes: validatedData.summaryTypes,
        options: validatedData.options || {}
      })

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error || 'Failed to generate summary'
        }, { status: 500 })
      }

      // Log activity
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        event_type: 'document_intelligence',
        event_category: 'document_summarization',
        action: 'summarize',
        resource_type: 'document',
        resource_id: validatedData.documentId,
        event_description: `Generated ${validatedData.summaryTypes.join(', ')} summary`,
        outcome: 'success',
        details: {
          summary_types: validatedData.summaryTypes,
          options: validatedData.options
        }
      })

      return NextResponse.json({
        success: true,
        data: result.data
      })
    }

  } catch (error) {
    console.error('Document summarization API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const summaryType = searchParams.get('summaryType')

    if (!documentId) {
      return NextResponse.json({
        success: false,
        error: 'Document ID is required'
      }, { status: 400 })
    }

    // Get existing summaries for the document
    const { data: summaries, error } = await supabase
      .from('document_summaries')
      .select('*')
      .eq('document_id', documentId)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve summaries'
      }, { status: 500 })
    }

    let filteredSummaries = summaries
    if (summaryType) {
      filteredSummaries = summaries.filter(s => s.summary_type === summaryType)
    }

    return NextResponse.json({
      success: true,
      data: {
        summaries: filteredSummaries,
        totalCount: filteredSummaries.length
      }
    })

  } catch (error) {
    console.error('Get summaries API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}