import { NextRequest, NextResponse } from 'next/server'
import { createNotificationController } from '@/lib/controllers/notification.controller'

// Initialize controller instance
const controller = createNotificationController()

/**
 * POST /api/notifications/bulk - Create notifications for multiple users
 * 
 * Request Body:
 * {
 *   user_ids: string[] (array of UUIDs, max 1000)
 *   notification_data: {
 *     organization_id?: string (UUID)
 *     type: string (required)
 *     category: string (required)
 *     title: string (required, max 255 chars)
 *     message: string (required)
 *     priority?: 'low' | 'medium' | 'high' | 'critical' (default: 'medium')
 *     action_url?: string (URL)
 *     action_text?: string (max 100 chars)
 *     icon?: string (max 50 chars)
 *     color?: string (hex color #RRGGBB)
 *     resource_type?: string
 *     resource_id?: string
 *     metadata?: Record<string, any>
 *     scheduled_for?: string (ISO datetime)
 *     expires_at?: string (ISO datetime)
 *   }
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return controller.createBulkNotifications(request)
}

/**
 * PATCH /api/notifications/bulk - Bulk update notifications
 * 
 * Request Body:
 * {
 *   action: 'mark_read' | 'mark_unread' | 'archive' | 'dismiss'
 *   notification_ids: string[] (array of notification UUIDs)
 * }
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  // For now, keep the legacy implementation as the controller doesn't have bulk update yet
  // TODO: Move this to the controller when bulk update methods are implemented
  const { createSupabaseServerClient } = await import('@/lib/supabase-server')
  
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          category: 'auth_error'
        }
      }, { status: 401 })
    }

    const { action, notification_ids } = body

    if (!action || !notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request. action and notification_ids array required',
          category: 'client_error'
        }
      }, { status: 400 })
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
        updateData.dismissed_at = new Date().toISOString()
        break
      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid action. Must be: mark_read, mark_unread, archive, or dismiss',
            category: 'client_error'
          }
        }, { status: 400 })
    }

    const { data, error } = await (supabase as any)
      .from('notifications')
      .update(updateData)
      .in('id', notification_ids)
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('Error bulk updating notifications:', error)
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update notifications',
          category: 'server_error'
        }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        updated_count: data.length,
        action,
        notification_ids: data.map((n: any) => n.id)
      }
    })

  } catch (error) {
    console.error('Notifications bulk API error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        category: 'server_error'
      }
    }, { status: 500 })
  }
}

/**
 * DELETE /api/notifications/bulk - Bulk delete notifications
 * 
 * Request Body:
 * {
 *   notification_ids: string[] (array of notification UUIDs)
 * }
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  // For now, keep the legacy implementation as the controller doesn't have bulk delete yet
  // TODO: Move this to the controller when bulk delete methods are implemented
  const { createSupabaseServerClient } = await import('@/lib/supabase-server')
  
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          category: 'auth_error'
        }
      }, { status: 401 })
    }

    const { notification_ids } = body

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request. notification_ids array required',
          category: 'client_error'
        }
      }, { status: 400 })
    }

    const { error } = await (supabase as any)
      .from('notifications')
      .delete()
      .in('id', notification_ids)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error bulk deleting notifications:', error)
      return NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete notifications',
          category: 'server_error'
        }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted_count: notification_ids.length,
        deleted_ids: notification_ids
      }
    })

  } catch (error) {
    console.error('Notifications bulk delete API error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        category: 'server_error'
      }
    }, { status: 500 })
  }
}