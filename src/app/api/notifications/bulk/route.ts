import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, notification_ids } = body

    if (!action || !notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json(
        { error: 'Invalid request. action and notification_ids array required' },
        { status: 400 }
      )
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    switch (action) {
      case 'mark_read':
        updateData.status = 'read'
        updateData.read_at = new Date().toISOString()
        break
      case 'mark_unread':
        updateData.status = 'unread'
        updateData.read_at = null
        break
      case 'archive':
        updateData.status = 'archived'
        updateData.archived_at = new Date().toISOString()
        break
      case 'dismiss':
        updateData.status = 'dismissed'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: mark_read, mark_unread, archive, or dismiss' },
          { status: 400 }
        )
    }

    const { data, error } = await (supabase as any)
      .from('notifications')
      .update(updateData)
      .in('id', notification_ids)
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('Error bulk updating notifications:', error)
      return NextResponse.json(
        { error: 'Failed to update notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updated_count: data.length,
      action
    })

  } catch (error) {
    console.error('Notifications bulk API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notification_ids } = body

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json(
        { error: 'Invalid request. notification_ids array required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notification_ids)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error bulk deleting notifications:', error)
      return NextResponse.json(
        { error: 'Failed to delete notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted_count: notification_ids.length
    })

  } catch (error) {
    console.error('Notifications bulk delete API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}