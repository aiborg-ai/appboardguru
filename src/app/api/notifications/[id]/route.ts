import { NextRequest, NextResponse } from 'next/server'
import { createNotificationController } from '@/lib/controllers/notification.controller'

// Initialize controller instance
const controller = createNotificationController()

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/notifications/[id] - Get specific notification by ID
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const params = await context.params
  return controller.getNotificationById(request, { params })
}

/**
 * PATCH /api/notifications/[id] - Update notification (mark as read, dismiss, etc.)
 * 
 * Request Body:
 * {
 *   status?: 'read' | 'dismissed' | 'archived'
 *   // Or any other updatable fields
 * }
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const params = await context.params
  const body = await request.json()
  
  // Route to specific action based on status or body content
  if (body.status === 'read') {
    return controller.markAsRead(request, { params })
  } else if (body.status === 'dismissed') {
    return controller.dismissNotification(request, { params })
  } else {
    // For other updates, we could add a generic update method
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'UNSUPPORTED_OPERATION',
          message: 'Use specific endpoints for notification updates'
        }
      }, 
      { status: 400 }
    )
  }
}

/**
 * DELETE /api/notifications/[id] - Delete notification permanently
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const params = await context.params
  return controller.deleteNotification(request, { params })
}