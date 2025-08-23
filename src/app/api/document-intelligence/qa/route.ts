/**
 * Document Q&A API Endpoint
 * RAG-based cross-document question answering system
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ragQAService } from '@/lib/services/rag-qa.service'
import { z } from 'zod'

// Request validation schemas
const QARequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
  documentIds: z.array(z.string()).optional(),
  conversationId: z.string().optional(),
  options: z.object({
    maxSources: z.number().min(1).max(50).optional(),
    similarityThreshold: z.number().min(0).max(1).optional(),
    includeMetadata: z.boolean().optional(),
    answerStyle: z.enum(['concise', 'detailed', 'analytical', 'comparative']).optional(),
    confidenceThreshold: z.number().min(0).max(1).optional(),
    enableMultiModal: z.boolean().optional(),
    contextWindow: z.number().min(5).max(50).optional(),
    temperature: z.number().min(0).max(2).optional()
  }).optional()
})

const CrossDocumentAnalysisSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  documentIds: z.array(z.string()).min(2, 'At least 2 documents required for cross-document analysis'),
  analysisType: z.enum(['comparison', 'trend', 'inconsistency', 'correlation'])
})

const ComparativeReportSchema = z.object({
  documentIds: z.array(z.string()).min(2, 'At least 2 documents required for comparison'),
  comparisonDimensions: z.array(z.string()).min(1, 'At least one comparison dimension required')
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
    const operation = searchParams.get('operation') || 'qa'

    switch (operation) {
      case 'qa': {
        // Standard Q&A operation
        const validatedData = QARequestSchema.parse(body)
        
        const result = await ragQAService.askQuestion({
          query: validatedData.query,
          documentIds: validatedData.documentIds,
          conversationId: validatedData.conversationId,
          options: validatedData.options || {}
        })

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Failed to process question'
          }, { status: 500 })
        }

        // Store Q&A interaction
        await supabase.from('document_qa_interactions').insert({
          user_id: user.id,
          query: validatedData.query,
          document_ids: validatedData.documentIds,
          conversation_id: validatedData.conversationId,
          answer: result.data.answer,
          confidence: result.data.confidence,
          sources_count: result.data.sources.length,
          response_time_ms: Date.now() - parseInt(result.data.id.split('_')[1])
        })

        // Log activity
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          event_type: 'document_intelligence',
          event_category: 'qa_interaction',
          action: 'ask_question',
          resource_type: 'document_qa',
          resource_id: result.data.id,
          event_description: `Asked question: "${validatedData.query.substring(0, 100)}..."`,
          outcome: 'success',
          details: {
            document_count: validatedData.documentIds?.length || 0,
            confidence: result.data.confidence,
            sources_used: result.data.sources.length
          }
        })

        return NextResponse.json({
          success: true,
          data: result.data
        })
      }

      case 'cross-analysis': {
        // Cross-document analysis
        const validatedData = CrossDocumentAnalysisSchema.parse(body)
        
        const result = await ragQAService.performCrossDocumentAnalysis(
          validatedData.query,
          validatedData.documentIds,
          validatedData.analysisType
        )

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Failed to perform cross-document analysis'
          }, { status: 500 })
        }

        // Log activity
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          event_type: 'document_intelligence',
          event_category: 'cross_document_analysis',
          action: 'analyze',
          resource_type: 'document_analysis',
          resource_id: validatedData.documentIds.join(','),
          event_description: `Performed ${validatedData.analysisType} analysis across ${validatedData.documentIds.length} documents`,
          outcome: 'success',
          details: {
            analysis_type: validatedData.analysisType,
            document_count: validatedData.documentIds.length,
            insights_count: result.data.length
          }
        })

        return NextResponse.json({
          success: true,
          data: result.data
        })
      }

      case 'comparative-report': {
        // Comparative report generation
        const validatedData = ComparativeReportSchema.parse(body)
        
        const result = await ragQAService.generateComparativeReport(
          validatedData.documentIds,
          validatedData.comparisonDimensions
        )

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Failed to generate comparative report'
          }, { status: 500 })
        }

        // Store comparative report
        const { data: reportRecord, error: storeError } = await supabase
          .from('comparative_reports')
          .insert({
            user_id: user.id,
            document_ids: validatedData.documentIds,
            comparison_dimensions: validatedData.comparisonDimensions,
            summary: result.data.summary,
            insights_count: result.data.insights.length,
            recommendations_count: result.data.recommendations.length
          })
          .select()
          .single()

        if (storeError) {
          console.error('Failed to store comparative report:', storeError)
        }

        return NextResponse.json({
          success: true,
          data: {
            ...result.data,
            reportId: reportRecord?.id
          }
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Document Q&A API error:', error)
    
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
    const operation = searchParams.get('operation') || 'history'
    const conversationId = searchParams.get('conversationId')
    const limit = parseInt(searchParams.get('limit') || '50')

    switch (operation) {
      case 'history': {
        // Get Q&A history
        let query = supabase
          .from('document_qa_interactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (conversationId) {
          query = query.eq('conversation_id', conversationId)
        }

        const { data: history, error } = await query

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve Q&A history'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            interactions: history,
            totalCount: history.length
          }
        })
      }

      case 'conversations': {
        // Get conversation list
        const { data: conversations, error } = await supabase
          .from('document_qa_interactions')
          .select('conversation_id, created_at, query')
          .eq('user_id', user.id)
          .not('conversation_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve conversations'
          }, { status: 500 })
        }

        // Group by conversation_id and get the latest message from each
        const conversationMap = new Map()
        conversations.forEach(conv => {
          if (!conversationMap.has(conv.conversation_id)) {
            conversationMap.set(conv.conversation_id, {
              id: conv.conversation_id,
              lastQuery: conv.query,
              lastActivity: conv.created_at
            })
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            conversations: Array.from(conversationMap.values()),
            totalCount: conversationMap.size
          }
        })
      }

      case 'reports': {
        // Get comparative reports
        const { data: reports, error } = await supabase
          .from('comparative_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve reports'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            reports,
            totalCount: reports.length
          }
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Get Q&A data API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({
        success: false,
        error: 'Conversation ID is required'
      }, { status: 400 })
    }

    // Delete conversation and all related interactions
    const { error } = await supabase
      .from('document_qa_interactions')
      .delete()
      .eq('user_id', user.id)
      .eq('conversation_id', conversationId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete conversation'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    })

  } catch (error) {
    console.error('Delete conversation API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}