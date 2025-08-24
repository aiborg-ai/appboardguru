import { NextRequest, NextResponse } from 'next/server'
import { IntelligentActionItemsService } from '@/lib/services/intelligent-action-items.service'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const actionItemsService = new IntelligentActionItemsService()

// GET /api/action-items/[id] - Get specific action item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const actionItem = await actionItemsService.getActionItemById(params.id)
    
    if (!actionItem) {
      return NextResponse.json(
        { error: 'Action item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: actionItem
    })

  } catch (error) {
    console.error('Error retrieving action item:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve action item' },
      { status: 500 }
    )
  }
}

// PATCH /api/action-items/[id] - Update action item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()
    
    // Add completion tracking if status is being changed to completed
    if (updates.status === 'completed' && !updates.completedBy) {
      updates.completedBy = user.id
      updates.completedAt = new Date().toISOString()
    }

    const updatedActionItem = await actionItemsService.updateActionItem(params.id, updates)

    return NextResponse.json({
      success: true,
      data: updatedActionItem,
      message: 'Action item updated successfully'
    })

  } catch (error) {
    console.error('Error updating action item:', error)
    return NextResponse.json(
      { error: 'Failed to update action item' },
      { status: 500 }
    )
  }
}

// DELETE /api/action-items/[id] - Delete action item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await actionItemsService.deleteActionItem(params.id)

    return NextResponse.json({
      success: true,
      message: 'Action item deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting action item:', error)
    return NextResponse.json(
      { error: 'Failed to delete action item' },
      { status: 500 }
    )
  }
}