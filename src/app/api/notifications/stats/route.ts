import { NextRequest, NextResponse } from 'next/server'
import { createNotificationController } from '@/lib/controllers/notification.controller'

// Initialize controller instance
const controller = createNotificationController()

/**
 * GET /api/notifications/stats - Get comprehensive notification statistics
 * 
 * Query Parameters:
 * - organization_id?: string (UUID) - Filter stats by organization
 * 
 * Returns:
 * {
 *   total: number
 *   unread: number
 *   read: number
 *   byType: Record<string, number>
 *   byPriority: Record<string, number>
 *   recentActivity: {
 *     today: number
 *     thisWeek: number
 *     thisMonth: number
 *   }
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return controller.getStats(request)
}