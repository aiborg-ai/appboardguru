import { NextRequest, NextResponse } from 'next/server'
import { createNotificationController } from '@/lib/controllers/notification.controller'

// Initialize controller instance
const controller = createNotificationController()

/**
 * GET /api/notifications/count - Get notification counts (legacy endpoint)
 * 
 * This endpoint provides a simplified view of notification counts for backward compatibility.
 * For more comprehensive statistics, use /api/notifications/stats
 * 
 * Query Parameters:
 * - organization_id?: string (UUID) - Filter counts by organization
 * 
 * Returns:
 * {
 *   unread: number
 *   total: number
 *   critical_unread: number
 *   high_unread: number
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get comprehensive stats from controller
    const statsResponse = await controller.getStats(request)
    const statsData = await statsResponse.json()
    
    if (!statsData.success) {
      return statsResponse // Forward the error response
    }
    
    const stats = statsData.data
    
    // Transform to legacy count format
    const counts = {
      unread: stats.unread || 0,
      total: stats.total || 0,
      critical_unread: stats.byPriority?.critical || 0,
      high_unread: stats.byPriority?.high || 0
    }
    
    return NextResponse.json(counts)
  } catch (error) {
    console.error('Notifications count API error:', error)
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