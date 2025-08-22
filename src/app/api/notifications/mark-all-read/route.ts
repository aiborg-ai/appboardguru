import { NextRequest, NextResponse } from 'next/server'
import { createNotificationController } from '@/lib/controllers/notification.controller'

// Initialize controller instance
const controller = createNotificationController()

/**
 * PATCH /api/notifications/mark-all-read - Mark all notifications as read
 * 
 * Query Parameters:
 * - organization_id?: string (UUID) - Only mark notifications from this organization as read
 * 
 * Returns:
 * {
 *   success: true,
 *   message: "All notifications marked as read"
 * }
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return controller.markAllAsRead(request)
}