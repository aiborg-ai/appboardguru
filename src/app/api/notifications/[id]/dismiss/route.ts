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
 * PATCH /api/notifications/[id]/dismiss - Dismiss specific notification
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const params = await context.params
  return controller.dismissNotification(request, { params })
}