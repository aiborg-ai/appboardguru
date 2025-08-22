import { NextRequest, NextResponse } from 'next/server'
import { createServerRepositoryFactory } from '@/lib/repositories'
import { 
  createUserId, 
  createOrganizationId,
  isSuccess,
  Priority 
} from '@/lib/repositories/types'

export async function GET(request: NextRequest) {
  try {
    const repositories = await createServerRepositoryFactory()
    const { searchParams } = new URL(request.url)
    
    // Get current user from repository instead of direct Supabase call
    const userResult = await repositories.users.getCurrentUserId()
    if (!userResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = userResult.data

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') as 'unread' | 'read' | 'dismissed' | 'archived' | null
    const type = searchParams.get('type')
    const priority = searchParams.get('priority') as Priority | null
    const organizationId = searchParams.get('organizationId')

    // Build filters
    const filters = {
      ...(status && { status }),
      ...(type && { type }),
      ...(priority && { priority }),
      ...(organizationId && { organizationId: createOrganizationId(organizationId) })
    }

    // Use repository method instead of direct database query
    const notificationsResult = await repositories.notifications.findByUserId(
      userId,
      filters,
      {
        limit,
        offset,
        sortBy: 'created_at',
        sortOrder: 'desc'
      }
    )

    if (!notificationsResult.success) {
      return NextResponse.json(
        { error: notificationsResult.error.message },
        { status: 500 }
      )
    }

    const { data, total, limit: actualLimit, offset: actualOffset } = notificationsResult.data

    return NextResponse.json({
      notifications: data,
      total,
      limit: actualLimit,
      offset: actualOffset,
      hasMore: actualOffset + data.length < total
    })

  } catch (error) {
    console.error('Notifications API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const repositories = await createServerRepositoryFactory()
    const body = await request.json()
    
    // Get current user
    const userResult = await repositories.users.getCurrentUserId()
    if (!userResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = userResult.data

    // Validate and prepare notification data using repository interface
    const notificationData = {
      user_id: body.user_id ? createUserId(body.user_id) : userId,
      organization_id: body.organization_id ? createOrganizationId(body.organization_id) : undefined,
      type: body.type,
      category: body.category,
      title: body.title,
      message: body.message,
      priority: body.priority || 'medium' as Priority,
      status: body.status || 'unread' as const,
      action_url: body.action_url,
      action_text: body.action_text,
      icon: body.icon,
      color: body.color,
      resource_type: body.resource_type,
      resource_id: body.resource_id,
      sender_id: userId,
      metadata: body.metadata,
      scheduled_for: body.scheduled_for ? new Date(body.scheduled_for) : undefined,
      expires_at: body.expires_at ? new Date(body.expires_at) : undefined
    }

    // Use repository method with proper error handling
    const createResult = await repositories.notifications.create(notificationData)
    
    if (!createResult.success) {
      return NextResponse.json(
        { 
          error: createResult.error.message,
          code: createResult.error.code 
        },
        { status: createResult.error.code === 'VALIDATION_ERROR' ? 400 : 500 }
      )
    }

    return NextResponse.json(createResult.data, { status: 201 })

  } catch (error) {
    console.error('Notifications POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// New endpoint to mark notifications as read using repository
export async function PATCH(request: NextRequest) {
  try {
    const repositories = await createServerRepositoryFactory()
    const body = await request.json()
    const { action, notification_ids, organization_id } = body
    
    // Get current user
    const userResult = await repositories.users.getCurrentUserId()
    if (!userResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = userResult.data

    switch (action) {
      case 'mark_all_read':
        const markAllResult = await repositories.notifications.markAllAsRead(
          userId,
          organization_id ? createOrganizationId(organization_id) : undefined
        )
        
        if (!markAllResult.success) {
          return NextResponse.json(
            { error: markAllResult.error.message },
            { status: 500 }
          )
        }
        
        return NextResponse.json({ success: true, message: 'All notifications marked as read' })

      case 'bulk_delete':
        if (!notification_ids || !Array.isArray(notification_ids)) {
          return NextResponse.json(
            { error: 'notification_ids array is required for bulk_delete' },
            { status: 400 }
          )
        }
        
        const deleteResult = await repositories.notifications.bulkDelete(
          notification_ids.map(id => createNotificationId(id))
        )
        
        if (!deleteResult.success) {
          return NextResponse.json(
            { error: deleteResult.error.message },
            { status: 500 }
          )
        }
        
        return NextResponse.json({ 
          success: true, 
          message: `${notification_ids.length} notifications deleted` 
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: mark_all_read, bulk_delete' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Notifications PATCH API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}