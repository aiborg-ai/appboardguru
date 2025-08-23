import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { CrisisCommunicationManagementService } from '@/lib/services/crisis-communication-management.service'
import type { Database } from '@/types/database'
import { z } from 'zod'

const CreateCommunicationSchema = z.object({
  incident_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  communication_type: z.enum(['internal_alert', 'stakeholder_update', 'customer_notification', 'media_statement', 'regulatory_filing', 'investor_alert', 'employee_announcement', 'board_notification', 'vendor_alert', 'community_notice']),
  channel: z.enum(['email', 'sms', 'push_notification', 'slack', 'teams', 'social_media', 'press_release', 'website_banner', 'phone_call', 'emergency_broadcast']),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']),
  subject: z.string().min(1).max(300),
  content: z.string().min(1),
  target_audiences: z.array(z.string()).min(1),
  variables_used: z.record(z.any()).optional(),
  scheduled_at: z.string().datetime().optional()
})

const ListCommunicationsSchema = z.object({
  status: z.array(z.enum(['draft', 'pending_review', 'legal_review', 'executive_approval', 'approved', 'rejected', 'sent', 'failed', 'cancelled'])).optional(),
  communication_type: z.array(z.enum(['internal_alert', 'stakeholder_update', 'customer_notification', 'media_statement', 'regulatory_filing', 'investor_alert', 'employee_announcement', 'board_notification', 'vendor_alert', 'community_notice'])).optional(),
  priority: z.array(z.enum(['low', 'medium', 'high', 'urgent', 'critical'])).optional(),
  incident_id: z.string().uuid().optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

const ApproveCommunicationSchema = z.object({
  action: z.enum(['approved', 'rejected', 'requested_changes']),
  comments: z.string().optional(),
  changes: z.record(z.any()).optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    // Convert array parameters
    ['status', 'communication_type', 'priority'].forEach(param => {
      if (queryParams[param]) {
        queryParams[param] = queryParams[param].split(',')
      }
    })

    const validatedParams = ListCommunicationsSchema.parse({
      ...queryParams,
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20
    })

    // Build query
    let query = supabase
      .from('communication_messages')
      .select(`
        *,
        crisis_incidents(id, title, category, level),
        communication_templates(id, name, category)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (validatedParams.status) {
      query = query.in('approval_status', validatedParams.status)
    }
    if (validatedParams.communication_type) {
      query = query.in('communication_type', validatedParams.communication_type)
    }
    if (validatedParams.priority) {
      query = query.in('priority', validatedParams.priority)
    }
    if (validatedParams.incident_id) {
      query = query.eq('incident_id', validatedParams.incident_id)
    }
    if (validatedParams.from_date) {
      query = query.gte('created_at', validatedParams.from_date)
    }
    if (validatedParams.to_date) {
      query = query.lte('created_at', validatedParams.to_date)
    }

    // Pagination
    const from = (validatedParams.page - 1) * validatedParams.limit
    const to = from + validatedParams.limit - 1
    query = query.range(from, to)

    // Get count for pagination
    const { count } = await supabase
      .from('communication_messages')
      .select('*', { count: 'exact', head: true })

    const { data: communications, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    const totalPages = Math.ceil((count || 0) / validatedParams.limit)

    return NextResponse.json({
      communications,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: count || 0,
        totalPages,
        hasNext: validatedParams.page < totalPages,
        hasPrev: validatedParams.page > 1
      }
    })
  } catch (error) {
    console.error('GET /api/crisis/communications error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const communicationService = new CrisisCommunicationManagementService(supabase)

    const body = await request.json()
    const validatedData = CreateCommunicationSchema.parse(body)

    const result = await communicationService.createMessage(validatedData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.statusCode || 400 }
      )
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('POST /api/crisis/communications error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}