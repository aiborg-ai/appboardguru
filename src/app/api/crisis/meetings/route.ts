import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { EmergencyMeetingCoordinationService } from '@/lib/services/emergency-meeting-coordination.service'
import type { Database } from '@/types/database'
import { z } from 'zod'

const CreateEmergencyMeetingSchema = z.object({
  incident_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  urgency: z.enum(['immediate', 'urgent', 'high', 'standard']),
  format: z.enum(['video_conference', 'conference_call', 'in_person', 'hybrid']),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().min(15).max(480).default(90),
  timezone: z.string().default('UTC'),
  attendee_user_ids: z.array(z.string().uuid()).min(1),
  agenda_items: z.array(z.object({
    title: z.string().min(1),
    description: z.string(),
    presenter: z.string().uuid(),
    allocated_minutes: z.number().min(1).max(120),
    item_type: z.enum(['presentation', 'discussion', 'decision', 'update', 'vote']),
    decision_required: z.boolean().default(false),
    voting_required: z.boolean().default(false)
  })).optional(),
  template_id: z.string().uuid().optional()
})

const ListMeetingsSchema = z.object({
  status: z.array(z.enum(['scheduling', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'])).optional(),
  urgency: z.array(z.enum(['immediate', 'urgent', 'high', 'standard'])).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  incident_id: z.string().uuid().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    // Convert array parameters
    if (queryParams.status) {
      queryParams.status = queryParams.status.split(',')
    }
    if (queryParams.urgency) {
      queryParams.urgency = queryParams.urgency.split(',')
    }

    const validatedParams = ListMeetingsSchema.parse({
      ...queryParams,
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20
    })

    // Build query
    let query = supabase
      .from('emergency_board_meetings')
      .select(`
        *,
        crisis_incidents!inner(id, title, category, level)
      `)
      .order('scheduled_at', { ascending: false })

    // Apply filters
    if (validatedParams.status) {
      query = query.in('status', validatedParams.status)
    }
    if (validatedParams.urgency) {
      query = query.in('urgency', validatedParams.urgency)
    }
    if (validatedParams.incident_id) {
      query = query.eq('incident_id', validatedParams.incident_id)
    }
    if (validatedParams.from_date) {
      query = query.gte('scheduled_at', validatedParams.from_date)
    }
    if (validatedParams.to_date) {
      query = query.lte('scheduled_at', validatedParams.to_date)
    }

    // Pagination
    const from = (validatedParams.page - 1) * validatedParams.limit
    const to = from + validatedParams.limit - 1
    query = query.range(from, to)

    // Get count for pagination
    const { count } = await supabase
      .from('emergency_board_meetings')
      .select('*', { count: 'exact', head: true })

    const { data: meetings, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    const totalPages = Math.ceil((count || 0) / validatedParams.limit)

    return NextResponse.json({
      meetings,
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
    console.error('GET /api/crisis/meetings error:', error)
    
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
    const meetingService = new EmergencyMeetingCoordinationService(supabase)

    const body = await request.json()
    const validatedData = CreateEmergencyMeetingSchema.parse(body)

    const result = await meetingService.scheduleEmergencyMeeting(validatedData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.statusCode || 400 }
      )
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('POST /api/crisis/meetings error:', error)
    
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