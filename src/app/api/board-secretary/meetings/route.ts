/**
 * API Routes for Board Secretary - Meetings Management
 * GET /api/board-secretary/meetings - Get meetings for a board
 * POST /api/board-secretary/meetings - Create a new meeting
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AIBoardSecretaryService } from '@/lib/services/ai-board-secretary.service'
import { z } from 'zod'

const CreateMeetingSchema = z.object({
  board_id: z.string().uuid(),
  meeting_title: z.string().min(1).max(255),
  meeting_type: z.enum(['regular', 'special', 'annual', 'emergency']).default('regular'),
  scheduled_date: z.string().datetime(),
  location: z.string().optional(),
  is_virtual: z.boolean().default(false),
  virtual_meeting_url: z.string().url().optional(),
})

const GetMeetingsSchema = z.object({
  board_id: z.string().uuid(),
  status: z.string().optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

/**
 * GET /api/board-secretary/meetings
 * Get meetings for a board with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const service = new AIBoardSecretaryService(supabase)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      board_id: searchParams.get('board_id'),
      status: searchParams.get('status') || undefined,
      from_date: searchParams.get('from_date') || undefined,
      to_date: searchParams.get('to_date') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    }

    const validation = GetMeetingsSchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { board_id, ...filters } = validation.data

    // Verify user has access to this board
    const { data: boardAccess, error: accessError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', board_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (accessError || !boardAccess) {
      return NextResponse.json({ error: 'Access denied to board' }, { status: 403 })
    }

    // Get meetings
    const result = await service.getMeetings(board_id, filters)

    if (!result.success) {
      console.error('Error getting meetings:', result.error)
      return NextResponse.json({
        error: 'Failed to get meetings',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.data.total,
        total_pages: Math.ceil(result.data.total / filters.limit),
        has_next: filters.page < Math.ceil(result.data.total / filters.limit),
        has_prev: filters.page > 1
      }
    })

  } catch (error) {
    console.error('Error in GET /api/board-secretary/meetings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/board-secretary/meetings
 * Create a new board meeting
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const service = new AIBoardSecretaryService(supabase)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = CreateMeetingSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { board_id } = validation.data

    // Verify user has admin access to this board
    const { data: boardMember, error: accessError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', board_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['chairman', 'secretary', 'admin'])
      .single()

    if (accessError || !boardMember) {
      return NextResponse.json({
        error: 'Access denied - admin role required'
      }, { status: 403 })
    }

    // Create the meeting
    const result = await service.createMeeting(validation.data)

    if (!result.success) {
      console.error('Error creating meeting:', result.error)
      return NextResponse.json({
        error: 'Failed to create meeting',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting created successfully',
      data: result.data
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/board-secretary/meetings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}