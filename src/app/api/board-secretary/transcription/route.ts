/**
 * API Routes for Board Secretary - Meeting Transcription
 * POST /api/board-secretary/transcription - Request transcription
 * GET /api/board-secretary/transcription - Get transcription status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AIBoardSecretaryService } from '@/lib/services/ai-board-secretary.service'
import { z } from 'zod'

const TranscriptionRequestSchema = z.object({
  meeting_id: z.string().uuid(),
  audio_file_url: z.string().url().optional(),
  video_file_url: z.string().url().optional(),
  language: z.string().default('en'),
}).refine(
  (data) => data.audio_file_url || data.video_file_url,
  {
    message: "Either audio_file_url or video_file_url is required",
    path: ["audio_file_url", "video_file_url"],
  }
)

/**
 * POST /api/board-secretary/transcription
 * Request transcription for a meeting recording
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
    const validation = TranscriptionRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { meeting_id } = validation.data

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
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Access denied to meeting' }, { status: 403 })
    }

    // Request transcription
    const result = await service.requestTranscription(validation.data)

    if (!result.success) {
      console.error('Error requesting transcription:', result.error)
      return NextResponse.json({
        error: 'Failed to request transcription',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Transcription requested successfully',
      data: result.data
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/board-secretary/transcription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/board-secretary/transcription
 * Get transcription status and results
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
    const transcriptionId = searchParams.get('transcription_id')
    const meetingId = searchParams.get('meeting_id')

    if (!transcriptionId && !meetingId) {
      return NextResponse.json({
        error: 'Either transcription_id or meeting_id is required'
      }, { status: 400 })
    }

    let query = supabase
      .from('meeting_transcriptions')
      .select(`
        *,
        board_meetings!inner (
          *,
          boards!inner (
            id,
            board_members!inner (
              user_id,
              role,
              status
            )
          )
        )
      `)
      .eq('board_meetings.boards.board_members.user_id', user.id)
      .eq('board_meetings.boards.board_members.status', 'active')

    if (transcriptionId) {
      query = query.eq('id', transcriptionId).single()
    } else {
      query = query.eq('meeting_id', meetingId).single()
    }

    const { data: transcription, error } = await query

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Transcription not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: transcription
    })

  } catch (error) {
    console.error('Error in GET /api/board-secretary/transcription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}