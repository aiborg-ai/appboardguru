import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { StakeholderEngagementService } from '@/lib/services/stakeholder-engagement.service'
import { z } from 'zod'
import { createAPIHandler } from '@/lib/api/createAPIHandler'
import type { Database } from '@/types/database'

// Input validation schemas
const CreateInvestorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  type: z.enum(['individual', 'institutional', 'strategic']),
  investment_amount: z.number().min(0),
  shareholding_percentage: z.number().min(0).max(100),
  access_level: z.enum(['basic', 'premium', 'vip']),
  contact_preferences: z.object({
    email: z.boolean(),
    phone: z.boolean(),
    meetings: z.boolean(),
    reports: z.boolean()
  }),
  status: z.enum(['active', 'inactive', 'pending']),
  metadata: z.record(z.any()).optional()
})

const SubmitVoteSchema = z.object({
  meeting_id: z.string().uuid(),
  proposal_id: z.string().uuid(),
  vote_type: z.enum(['for', 'against', 'abstain']),
  shares_voted: z.number().min(0),
  is_proxy: z.boolean(),
  proxy_holder: z.string().optional(),
  voter_id: z.string().uuid()
})

const CreateESGMetricSchema = z.object({
  category: z.enum(['environmental', 'social', 'governance']),
  metric_name: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  reporting_period: z.string().min(1),
  benchmark_value: z.number().optional(),
  improvement_target: z.number().optional(),
  data_source: z.string().min(1),
  verification_status: z.enum(['unverified', 'internal', 'third_party'])
})

const AnalyzeSentimentSchema = z.object({
  content: z.string().min(1),
  source: z.string().min(1),
  stakeholder_type: z.string().min(1),
  metadata: z.record(z.any()).optional()
})

const SendCommunicationSchema = z.object({
  template_id: z.string().uuid(),
  audience_segment: z.array(z.string()),
  channels: z.array(z.string()),
  variables: z.record(z.any()).optional(),
  scheduled_date: z.string().datetime().optional()
})

const TrackEngagementSchema = z.object({
  investor_id: z.string().uuid(),
  engagement_type: z.string().min(1),
  details: z.record(z.any())
})

const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['earnings_report', 'investor_update', 'esg_report', 'crisis_communication', 'regulatory_filing']),
  subject: z.string().min(1),
  content: z.string().min(1),
  variables: z.array(z.string()),
  approval_required: z.boolean(),
  compliance_reviewed: z.boolean(),
  target_audience: z.array(z.string()),
  channels: z.array(z.string())
})

const TrackDisclosureSchema = z.object({
  disclosure_type: z.string().min(1),
  due_date: z.string().datetime(),
  content: z.string().min(1)
})

// Initialize service
async function getStakeholderService() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  return new StakeholderEngagementService(supabase)
}

// ============================================================================
// GET - Retrieve stakeholder data
// ============================================================================

export async function GET(request: NextRequest) {
  return createAPIHandler(async () => {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const organizationId = url.searchParams.get('organizationId')
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const service = await getStakeholderService()

    switch (action) {
      case 'investors': {
        const accessLevel = url.searchParams.get('accessLevel')
        if (!accessLevel) {
          return NextResponse.json({ error: 'Access level is required' }, { status: 400 })
        }
        
        const result = await service.getInvestorsByAccessLevel(accessLevel, organizationId)
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          count: result.data.length 
        })
      }

      case 'voting-results': {
        const proposalId = url.searchParams.get('proposalId')
        if (!proposalId) {
          return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 })
        }
        
        const result = await service.getVotingResults(proposalId)
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'esg-dashboard': {
        const category = url.searchParams.get('category') || undefined
        const result = await service.getESGDashboard(organizationId, category)
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'sentiment-trends': {
        const timeRange = url.searchParams.get('timeRange') || '30d'
        const source = url.searchParams.get('source') || undefined
        const result = await service.getSentimentTrends(organizationId, timeRange, source)
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'communication-metrics': {
        const timeRange = url.searchParams.get('timeRange') || '30d'
        const result = await service.getCommunicationMetrics(organizationId, timeRange)
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ success: true, data: result.data })
      }

      case 'crisis-monitoring': {
        const result = await service.monitorCrisisSituations(organizationId)
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
// POST - Create stakeholder data
// ============================================================================

export async function POST(request: NextRequest) {
  return createAPIHandler(async () => {
    const body = await request.json()
    const { action, organizationId, ...data } = body

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const service = await getStakeholderService()

    switch (action) {
      case 'create-investor': {
        const validation = CreateInvestorSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.createInvestor({
          ...validation.data,
          organization_id: organizationId
        } as any)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Investor created successfully' 
        })
      }

      case 'submit-vote': {
        const validation = SubmitVoteSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.submitVote(validation.data as any)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Vote submitted successfully' 
        })
      }

      case 'create-esg-metric': {
        const validation = CreateESGMetricSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.createESGMetric({
          ...validation.data,
          organization_id: organizationId
        } as any)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'ESG metric created successfully' 
        })
      }

      case 'analyze-sentiment': {
        const validation = AnalyzeSentimentSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.analyzeSentiment(
          validation.data.content,
          validation.data.source,
          validation.data.stakeholder_type,
          validation.data.metadata
        )
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Sentiment analyzed successfully' 
        })
      }

      case 'send-communication': {
        const validation = SendCommunicationSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.sendCommunication(
          validation.data.template_id,
          validation.data.audience_segment,
          validation.data.channels,
          validation.data.variables,
          validation.data.scheduled_date
        )
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Communication sent successfully' 
        })
      }

      case 'track-engagement': {
        const validation = TrackEngagementSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.trackInvestorEngagement(
          validation.data.investor_id,
          validation.data.engagement_type,
          validation.data.details
        )
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Engagement tracked successfully' 
        })
      }

      case 'create-template': {
        const validation = CreateTemplateSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.createCommunicationTemplate(validation.data as any)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Communication template created successfully' 
        })
      }

      case 'track-disclosure': {
        const validation = TrackDisclosureSchema.safeParse(data)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid input', 
            details: validation.error.errors 
          }, { status: 400 })
        }

        const result = await service.trackDisclosureCompliance(
          organizationId,
          validation.data.disclosure_type,
          validation.data.due_date,
          validation.data.content
        )
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Disclosure compliance tracked successfully' 
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 })
    }
  })
}

// ============================================================================
// PUT - Update stakeholder data
// ============================================================================

export async function PUT(request: NextRequest) {
  return createAPIHandler(async () => {
    const body = await request.json()
    const { action, id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required for updates' }, { status: 400 })
    }

    const service = await getStakeholderService()

    switch (action) {
      case 'update-investor': {
        // Partial validation for updates
        const result = await service.updateInvestor(id, data)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'Investor updated successfully' 
        })
      }

      case 'update-esg-metric': {
        const result = await service.updateESGMetric(id, data)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true, 
          data: result.data,
          message: 'ESG metric updated successfully' 
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 })
    }
  })
}

// ============================================================================
// DELETE - Remove stakeholder data
// ============================================================================

export async function DELETE(request: NextRequest) {
  return createAPIHandler(async () => {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required for deletion' }, { status: 400 })
    }

    const service = await getStakeholderService()

    switch (action) {
      case 'delete-investor': {
        const result = await service.deleteInvestor(id)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Investor deleted successfully' 
        })
      }

      case 'delete-template': {
        const result = await service.deleteCommunicationTemplate(id)
        
        if (!result.success) {
          return NextResponse.json({ error: result.error.message }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Communication template deleted successfully' 
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 })
    }
  })
}