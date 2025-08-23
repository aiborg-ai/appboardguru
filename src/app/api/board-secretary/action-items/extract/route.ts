/**
 * API Route for Board Secretary - Extract Action Items from Meeting
 * POST /api/board-secretary/action-items/extract - Extract action items from transcription
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AIBoardSecretaryService } from '@/lib/services/ai-board-secretary.service'
import { z } from 'zod'

const ExtractActionItemsSchema = z.object({
  meeting_id: z.string().uuid(),
  transcription_text: z.string().optional(),
})

/**
 * POST /api/board-secretary/action-items/extract
 * Extract action items from meeting transcription using AI
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
    const validation = ExtractActionItemsSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { meeting_id, transcription_text } = validation.data

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
      .in('boards.board_members.role', ['chairman', 'secretary', 'admin', 'member'])
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Access denied to meeting' }, { status: 403 })
    }

    // Extract action items
    const result = await service.extractActionItems(meeting_id, transcription_text)

    if (!result.success) {
      console.error('Error extracting action items:', result.error)
      return NextResponse.json({
        error: 'Failed to extract action items',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully extracted ${result.data.length} action items`,
      data: result.data
    }, { status: 200 })

  } catch (error) {
    console.error('Error in POST /api/board-secretary/action-items/extract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}