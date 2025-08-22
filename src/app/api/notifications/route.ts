import { NextRequest, NextResponse } from 'next/server'
import { createNotificationController } from '@/lib/controllers/notification.controller'

// Initialize controller instance
const controller = createNotificationController()

/**
 * GET /api/notifications - Get user notifications with filtering and pagination
 * 
 * Query Parameters:
 * - limit: number (1-100, default: 50)
 * - offset: number (default: 0) 
 * - page: number (alternative to offset)
 * - status: 'unread' | 'read' | 'dismissed' | 'archived'
 * - type: string
 * - category: string
 * - priority: 'low' | 'medium' | 'high' | 'critical'
 * - organization_id: string (UUID)
 * - date_from: ISO date string
 * - date_to: ISO date string
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return controller.getNotifications(request)
}

/**
 * POST /api/notifications - Create a new notification
 * 
 * Request Body:
 * {
 *   user_id?: string (UUID, defaults to current user)
 *   organization_id?: string (UUID)
 *   type: string (required)
 *   category: string (required)
 *   title: string (required, max 255 chars)
 *   message: string (required)
 *   priority?: 'low' | 'medium' | 'high' | 'critical' (default: 'medium')
 *   action_url?: string (URL)
 *   action_text?: string (max 100 chars)
 *   icon?: string (max 50 chars)
 *   color?: string (hex color #RRGGBB)
 *   resource_type?: string
 *   resource_id?: string
 *   metadata?: Record<string, any>
 *   scheduled_for?: string (ISO datetime)
 *   expires_at?: string (ISO datetime)
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return controller.createNotification(request)
}