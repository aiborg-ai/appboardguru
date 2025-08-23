/**
 * API Routes for Board Secretary - Action Items Management
 * GET /api/board-secretary/action-items - Get action items with filtering
 * POST /api/board-secretary/action-items - Create manual action item
 * PUT /api/board-secretary/action-items/[id] - Update action item progress
 * POST /api/board-secretary/action-items/extract - Extract action items from meeting transcription
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AIBoardSecretaryService } from '@/lib/services/ai-board-secretary.service'
import { z } from 'zod'

const CreateActionItemSchema = z.object({
  meeting_id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).default([]),
})

const ExtractActionItemsSchema = z.object({
  meeting_id: z.string().uuid(),
  transcription_text: z.string().optional(),
})

const UpdateActionItemSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'overdue']).optional(),
  completion_percentage: z.number().min(0).max(100).optional(),
  progress_notes: z.string().optional(),
})

const GetActionItemsSchema = z.object({
  meeting_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  overdue_only: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

/**
 * GET /api/board-secretary/action-items
 * Get action items with filtering and pagination
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
      meeting_id: searchParams.get('meeting_id') || undefined,
      assigned_to: searchParams.get('assigned_to') || undefined,
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      overdue_only: searchParams.get('overdue_only') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    }

    const validation = GetActionItemsSchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.errors
      }, { status: 400 })
    }

    // Get action items
    const result = await service.getActionItems(validation.data)

    if (!result.success) {
      console.error('Error getting action items:', result.error)
      return NextResponse.json({
        error: 'Failed to get action items',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data.action_items,
      pagination: {
        page: validation.data.page,
        limit: validation.data.limit,
        total: result.data.total,
        total_pages: Math.ceil(result.data.total / validation.data.limit),
        has_next: validation.data.page < Math.ceil(result.data.total / validation.data.limit),
        has_prev: validation.data.page > 1
      }
    })

  } catch (error) {
    console.error('Error in GET /api/board-secretary/action-items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/board-secretary/action-items
 * Create a manual action item
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
    const validation = CreateActionItemSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 })
    }

    // If meeting_id provided, verify user has access
    if (validation.data.meeting_id) {
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
        .eq('id', validation.data.meeting_id)
        .eq('boards.board_members.user_id', user.id)
        .eq('boards.board_members.status', 'active')
        .single()

      if (meetingError || !meeting) {
        return NextResponse.json({ error: 'Access denied to meeting' }, { status: 403 })
      }
    }

    // Create action item
    const result = await service.createActionItem(validation.data)

    if (!result.success) {
      console.error('Error creating action item:', result.error)
      return NextResponse.json({
        error: 'Failed to create action item',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Action item created successfully',
      data: result.data
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/board-secretary/action-items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}