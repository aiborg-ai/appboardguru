/**
 * API Routes for Board Secretary - Smart Agenda Generation
 * POST /api/board-secretary/agenda/generate - Generate smart agenda for meeting
 * GET /api/board-secretary/agenda - Get meeting agendas
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AIBoardSecretaryService } from '@/lib/services/ai-board-secretary.service'
import { z } from 'zod'

const GenerateAgendaSchema = z.object({
  meeting_id: z.string().uuid(),
  include_previous_items: z.boolean().default(true),
  template_id: z.string().uuid().optional(),
  custom_items: z.array(z.object({
    title: z.string(),
    description: z.string().optional()
  })).default([]),
})

const GetAgendasSchema = z.object({
  meeting_id: z.string().uuid().optional(),
  board_id: z.string().uuid().optional(),
  status: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

/**
 * POST /api/board-secretary/agenda/generate
 * Generate a smart agenda for a meeting using AI
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
    const validation = GenerateAgendaSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { meeting_id, include_previous_items, template_id, custom_items } = validation.data

    // Verify user has access to this meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('board_meetings')
      .select(`
        *,
        boards!inner (
          id,
          board_members!inner (
            user_id,
            role,
            status
          )
        )
      `)
      .eq('id', meeting_id)
      .eq('boards.board_members.user_id', user.id)
      .eq('boards.board_members.status', 'active')
      .in('boards.board_members.role', ['chairman', 'secretary', 'admin'])
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Access denied to meeting' }, { status: 403 })
    }

    // Generate smart agenda
    const result = await service.generateSmartAgenda(meeting_id, {
      include_previous_items,
      template_id,
      custom_items
    })

    if (!result.success) {
      console.error('Error generating agenda:', result.error)
      return NextResponse.json({
        error: 'Failed to generate agenda',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Smart agenda generated successfully',
      data: result.data
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/board-secretary/agenda/generate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/board-secretary/agenda
 * Get meeting agendas with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      meeting_id: searchParams.get('meeting_id') || undefined,
      board_id: searchParams.get('board_id') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    }

    const validation = GetAgendasSchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { meeting_id, board_id, status, page, limit } = validation.data

    if (!meeting_id && !board_id) {
      return NextResponse.json({
        error: 'Either meeting_id or board_id is required'
      }, { status: 400 })
    }

    // Build query
    let query = supabase
      .from('meeting_agendas')
      .select(`
        *,
        board_meetings!inner (
          *,
          boards!inner (
            id,
            name,
            board_members!inner (
              user_id,
              role,
              status
            )
          )
        )
      `, { count: 'exact' })
      .eq('board_meetings.boards.board_members.user_id', user.id)
      .eq('board_meetings.boards.board_members.status', 'active')

    if (meeting_id) {
      query = query.eq('meeting_id', meeting_id)
    }

    if (board_id) {
      query = query.eq('board_meetings.board_id', board_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: agendas, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error('Error getting agendas:', error)
      return NextResponse.json({
        error: 'Failed to get agendas',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: agendas || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next: page < Math.ceil((count || 0) / limit),
        has_prev: page > 1
      }
    })

  } catch (error) {
    console.error('Error in GET /api/board-secretary/agenda:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}