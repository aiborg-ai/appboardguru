/**
 * API Route for Board Secretary - Individual Action Item Management
 * PUT /api/board-secretary/action-items/[id] - Update action item progress
 * DELETE /api/board-secretary/action-items/[id] - Delete action item
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AIBoardSecretaryService } from '@/lib/services/ai-board-secretary.service'
import { z } from 'zod'

const UpdateActionItemSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'overdue']).optional(),
  completion_percentage: z.number().min(0).max(100).optional(),
  progress_notes: z.string().optional(),
})

/**
 * PUT /api/board-secretary/action-items/[id]
 * Update action item progress and status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const service = new AIBoardSecretaryService(supabase)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: actionItemId } = params

    if (!actionItemId) {
      return NextResponse.json({ error: 'Action item ID is required' }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = UpdateActionItemSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 })
    }

    // Verify user has access to this action item
    const { data: actionItem, error: actionError } = await supabase
      .from('action_items')
      .select(`
        *,
        board_meetings (
          boards (
            id,
            board_members!inner (
              user_id,
              role,
              status
            )
          )
        )
      `)
      .eq('id', actionItemId)
      .eq('board_meetings.boards.board_members.user_id', user.id)
      .eq('board_meetings.boards.board_members.status', 'active')
      .single()

    if (actionError || !actionItem) {
      return NextResponse.json({ error: 'Action item not found or access denied' }, { status: 404 })
    }

    // Update action item
    const result = await service.updateActionItemProgress(actionItemId, validation.data)

    if (!result.success) {
      console.error('Error updating action item:', result.error)
      return NextResponse.json({
        error: 'Failed to update action item',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Action item updated successfully',
      data: result.data
    })

  } catch (error) {
    console.error('Error in PUT /api/board-secretary/action-items/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/board-secretary/action-items/[id]
 * Delete an action item (soft delete by setting status to cancelled)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: actionItemId } = params

    if (!actionItemId) {
      return NextResponse.json({ error: 'Action item ID is required' }, { status: 400 })
    }

    // Verify user has access to this action item (must be assigned user, creator, or board admin)
    const { data: actionItem, error: actionError } = await supabase
      .from('action_items')
      .select(`
        *,
        board_meetings (
          boards (
            id,
            board_members!inner (
              user_id,
              role,
              status
            )
          )
        )
      `)
      .eq('id', actionItemId)
      .single()

    if (actionError || !actionItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 })
    }

    // Check if user has permission to delete
    const canDelete = 
      actionItem.created_by === user.id || 
      actionItem.assigned_to === user.id ||
      actionItem.board_meetings?.boards?.board_members?.some((member: any) => 
        member.user_id === user.id && 
        ['chairman', 'secretary', 'admin'].includes(member.role) &&
        member.status === 'active'
      )

    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied to delete this action item' }, { status: 403 })
    }

    // Soft delete by updating status
    const { data: updatedItem, error: updateError } = await supabase
      .from('action_items')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', actionItemId)
      .select()
      .single()

    if (updateError) {
      console.error('Error deleting action item:', updateError)
      return NextResponse.json({
        error: 'Failed to delete action item',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Action item deleted successfully',
      data: updatedItem
    })

  } catch (error) {
    console.error('Error in DELETE /api/board-secretary/action-items/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}