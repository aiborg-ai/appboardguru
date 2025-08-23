import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AnalystBriefingService } from '@/lib/services/analyst-briefing.service'
import { z } from 'zod'
import { createAPIHandler } from '@/lib/api/createAPIHandler'
import type { Database } from '@/types/database'

// Input validation schemas
const CreateAnalystProfileSchema = z.object({
  name: z.string().min(1),
  firm: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  specialization: z.array(z.string()).min(1),
  coverage_sectors: z.array(z.string()).min(1),
  rating: z.enum(['buy', 'hold', 'sell', 'neutral']),
  target_price: z.number().positive().optional(),
  relationship_status: z.enum(['active', 'inactive', 'prospective']),
  preference_profile: z.object({
    communication_style: z.enum(['formal', 'casual', 'technical']),
    preferred_meeting_length: z.number().min(15).max(180),
    preferred_channels: z.array(z.string()),
    information_focus: z.array(z.string())
  }),
  influence_score: z.number().min(0).max(100)
})

const ScheduleBriefingSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['earnings', 'strategy', 'product', 'market_update', 'crisis', 'ipo', 'merger']),
  scheduled_date: z.string().datetime(),
  duration: z.number().min(30).max(480),
  participants: z.object({
    internal: z.array(z.object({
      id: z.string(),
      name: z.string(),
      role: z.string()
    })),
    analysts: z.array(z.object({
      id: z.string(),
      name: z.string(),
      firm: z.string(),
      confirmed: z.boolean()
    }))
  }),
  agenda: z.array(z.object({
    order: z.number().min(1),
    title: z.string().min(1),
    description: z.string(),
    duration: z.number().min(5),
    presenter: z.string(),
    materials: z.array(z.string()),
    key_points: z.array(z.string())
  })),
  materials: z.array(z.object({
    title: z.string(),
    type: z.enum(['presentation', 'financial_statement', 'press_release', 'fact_sheet', 'research_note']),
    file_path: z.string(),
    access_level: z.enum(['public', 'restricted', 'confidential'])
  })).optional(),
  performance_expectations: z.array(z.object({
    metric: z.string(),
    period: z.string(),
    analyst_estimate: z.number(),
    company_guidance: z.number().optional(),
    consensus_estimate: z.number().optional(),
    confidence_level: z.number().min(0).max(100)
  })).optional()
})

const AddQuestionSchema = z.object({
  session_id: z.string().uuid(),
  question: z.string().min(1),
  category: z.enum(['financial', 'strategic', 'operational', 'market', 'regulatory']),
  priority: z.enum(['high', 'medium', 'low']),
  answer: z.string().optional(),
  sources: z.array(z.string()).optional(),
  confidence_level: z.number().min(0).max(100).optional()
})

const AnswerQuestionSchema = z.object({
  answer: z.string().min(1),
  sources: z.array(z.string()).optional(),
  confidence_level: z.number().min(0).max(100).optional()
})

const TrackExpectationSchema = z.object({
  metric: z.string().min(1),
  period: z.string().min(1),
  analyst_estimate: z.number(),
  company_guidance: z.number().optional(),
  consensus_estimate: z.number().optional(),
  actual_result: z.number().optional(),
  confidence_level: z.number().min(0).max(100)
})

const TrackSentimentSchema = z.object({
  source: z.enum(['analyst_note', 'rating_change', 'price_target', 'earnings_estimate']),
  analyst_id: z.string().uuid(),
  sentiment: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative']),
  impact_score: z.number().min(0).max(100),
  content_summary: z.string().min(1),
  key_factors: z.array(z.string()),
  price_impact: z.number().optional(),
  publication_date: z.string().datetime()
})

const CreateFollowUpSchema = z.object({
  session_id: z.string().uuid(),
  description: z.string().min(1),
  assigned_to: z.string().min(1),
  due_date: z.string().datetime(),
  priority: z.enum(['high', 'medium', 'low'])
})

// Initialize service
async function getAnalystBriefingService() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  return new AnalystBriefingService(supabase)
}

// ============================================================================
// GET - Retrieve analyst data
// ============================================================================

export async function GET(request: NextRequest) {
  return createAPIHandler(async () => {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const organizationId = url.searchParams.get('organizationId')
    
    if (!organizationId && action !== 'qa-database' && action !== 'sentiment-analysis') {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const service = await getAnalystBriefingService()

    switch (action) {
      case 'analysts': {
        const filters = {
          firm: url.searchParams.get('firm') || undefined,
          specialization: url.searchParams.get('specialization') || undefined,
          rating: url.searchParams.get('rating') || undefined,
          relationship_status: url.searchParams.get('relationshipStatus') || undefined
        }
        
        const result = await service.getAnalysts(organizationId!, filters)
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          count: result.data.length 
        })
      }

      case 'briefing-sessions': {
        const sessionId = url.searchParams.get('sessionId')
        if (sessionId) {
          const result = await service.getBriefingSession(sessionId)
          if (!result.success) {
            return NextResponse.json({ error: result.error.message }, { status: 400 })
          }
          return NextResponse.json({ success: true, data: result.data })
        } else {
          const status = url.searchParams.get('status') || undefined
          const type = url.searchParams.get('type') || undefined
          const result = await service.getBriefingSessions(organizationId!, { status, type })
          if (!result.success) {
            return NextResponse.json({ error: result.error.message }, { status: 400 })
          }
          return NextResponse.json({ success: true, data: result.data })
        }
      }

      case 'qa-database': {
        const filters = {
          category: url.searchParams.get('category') || undefined,
          keyword: url.searchParams.get('keyword') || undefined,
          dateRange: url.searchParams.get('startDate') && url.searchParams.get('endDate') 
            ? { 
                start: url.searchParams.get('startDate')!, 
                end: url.searchParams.get('endDate')! 
              } 
            : undefined,
          answered: url.searchParams.get('answered') ? url.searchParams.get('answered') === 'true' : undefined
        }
        
        const result = await service.getQADatabase(organizationId!, filters)
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'performance-comparison': {
        const period = url.searchParams.get('period')
        if (!period) {
          return NextResponse.json({ error: 'Period is required' }, { status: 400 })
        }
        
        const result = await service.compareResultsVsExpectations(organizationId!, period)
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'sentiment-analysis': {
        const timeRange = url.searchParams.get('timeRange') || '30d'
        const result = await service.getSentimentAnalysis(organizationId!, timeRange)
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'follow-up-dashboard': {
        const filters = {
          status: url.searchParams.get('status') || undefined,
          priority: url.searchParams.get('priority') || undefined,
          assignedTo: url.searchParams.get('assignedTo') || undefined,
          overdue: url.searchParams.get('overdue') ? url.searchParams.get('overdue') === 'true' : undefined
        }
        
        const result = await service.getFollowUpDashboard(organizationId!, filters)
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ success: true, data: result.data })
      }

      default:
        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 })
    }
  })
}

// ============================================================================
// POST - Create analyst data
// ============================================================================

export async function POST(request: NextRequest) {
  return createAPIHandler(async () => {
    const body = await request.json()
    const { action, organizationId, ...data } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const service = await getAnalystBriefingService()

    switch (action) {
      case 'create-analyst-profile': {
        const validation = CreateAnalystProfileSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.createAnalystProfile({
          ...validation.data,
          organization_id: organizationId
        } as any)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Analyst profile created successfully' 
        })
      }

      case 'schedule-briefing': {
        const validation = ScheduleBriefingSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.scheduleBriefingSession({
          ...validation.data,
          organization_id: organizationId,
          materials: validation.data.materials || [],
          performance_expectations: validation.data.performance_expectations || []
        } as any)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Briefing session scheduled successfully' 
        })
      }

      case 'add-question': {
        const validation = AddQuestionSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.addQuestion(validation.data.session_id, {
          question: validation.data.question,
          category: validation.data.category,
          priority: validation.data.priority,
          answer: validation.data.answer,
          sources: validation.data.sources,
          confidence_level: validation.data.confidence_level
        } as any)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Question added successfully' 
        })
      }

      case 'track-expectation': {
        const validation = TrackExpectationSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.trackPerformanceExpectation({
          ...validation.data,
          organization_id: organizationId
        } as any)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Performance expectation tracked successfully' 
        })
      }

      case 'track-sentiment': {
        const validation = TrackSentimentSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.trackMarketSentiment({
          ...validation.data,
          organization_id: organizationId
        } as any)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Market sentiment tracked successfully' 
        })
      }

      case 'create-follow-up': {
        const validation = CreateFollowUpSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.createFollowUpAction(validation.data.session_id, {
          description: validation.data.description,
          assigned_to: validation.data.assigned_to,
          due_date: validation.data.due_date,
          priority: validation.data.priority
        } as any)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Follow-up action created successfully' 
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 })
    }
  })
}

// ============================================================================
// PUT - Update analyst data
// ============================================================================

export async function PUT(request: NextRequest) {
  return createAPIHandler(async () => {
    const body = await request.json()
    const { action, id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required for updates' }, { status: 400 })
    }

    const service = await getAnalystBriefingService()

    switch (action) {
      case 'update-analyst-profile': {
        const result = await service.updateAnalystProfile(id, data)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Analyst profile updated successfully' 
        })
      }

      case 'update-briefing-session': {
        const result = await service.updateBriefingSession(id, data)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Briefing session updated successfully' 
        })
      }

      case 'answer-question': {
        const validation = AnswerQuestionSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.answerQuestion(
          id,
          validation.data.answer,
          validation.data.sources || [],
          validation.data.confidence_level || 100
        )
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Question answered successfully' 
        })
      }

      case 'update-follow-up': {
        const result = await service.updateFollowUpAction(id, data)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Follow-up action updated successfully' 
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 })
    }
  })
}

// ============================================================================
// DELETE - Remove analyst data
// ============================================================================

export async function DELETE(request: NextRequest) {
  return createAPIHandler(async () => {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required for deletion' }, { status: 400 })
    }

    const service = await getAnalystBriefingService()

    switch (action) {
      case 'delete-analyst-profile': {
        const result = await service.deleteAnalystProfile(id)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Analyst profile deleted successfully' 
        })
      }

      case 'cancel-briefing-session': {
        const result = await service.cancelBriefingSession(id)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Briefing session cancelled successfully' 
        })
      }

      case 'delete-follow-up': {
        const result = await service.deleteFollowUpAction(id)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Follow-up action deleted successfully' 
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 })
    }
  })
}