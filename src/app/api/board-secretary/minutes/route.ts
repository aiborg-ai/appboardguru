/**
 * API Routes for Board Secretary - Meeting Minutes
 * POST /api/board-secretary/minutes/generate - Generate minutes from transcription
 * GET /api/board-secretary/minutes - Get meeting minutes
 * PUT /api/board-secretary/minutes/[id] - Update minutes status/content
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AIBoardSecretaryService } from '@/lib/services/ai-board-secretary.service'
import { z } from 'zod'

const GenerateMinutesSchema = z.object({
  meeting_id: z.string().uuid(),
  transcription_id: z.string().uuid(),
})

/**
 * POST /api/board-secretary/minutes/generate
 * Generate meeting minutes from transcription using AI
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
    const validation = GenerateMinutesSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { meeting_id, transcription_id } = validation.data

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

    // Generate minutes
    const result = await service.generateMeetingMinutes(meeting_id, transcription_id)

    if (!result.success) {
      console.error('Error generating minutes:', result.error)
      return NextResponse.json({
        error: 'Failed to generate minutes',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Minutes generated successfully',
      data: result.data
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/board-secretary/minutes/generate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/board-secretary/minutes
 * Get meeting minutes with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const meetingId = searchParams.get('meeting_id')
    const minutesId = searchParams.get('minutes_id')
    const boardId = searchParams.get('board_id')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    if (!meetingId && !minutesId && !boardId) {
      return NextResponse.json({
        error: 'Either meeting_id, minutes_id, or board_id is required'
      }, { status: 400 })
    }

    let query = supabase
      .from('meeting_minutes')
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

    if (minutesId) {
      query = query.eq('id', minutesId).single()
    } else {
      if (meetingId) {
        query = query.eq('meeting_id', meetingId)
      }
      
      if (boardId) {
        query = query.eq('board_meetings.board_id', boardId)
      }

      if (status) {
        query = query.eq('status', status)
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)
    }

    const { data: minutes, error, count } = await query

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Minutes not found' }, { status: 404 })
      }
      throw error
    }

    if (minutesId) {
      return NextResponse.json({
        success: true,
        data: minutes
      })
    }

    return NextResponse.json({
      success: true,
      data: minutes || [],
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
    console.error('Error in GET /api/board-secretary/minutes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}