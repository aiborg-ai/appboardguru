/**
 * NotificationController
 * Consolidates notification management routes
 * Replaces: notifications/*, notifications/[id]/*, notifications/bulk/*, 
 *          notifications/count/*, notifications/anomalies/*, notifications/predictions/*
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { EnhancedHandlers } from '@/lib/middleware/apiHandler'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Database } from '@/types/database'

type NotificationRow = Database['public']['Tables']['notifications']['Row']
type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

// Validation schemas
const NotificationListFiltersSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  status: z.enum(['unread', 'read', 'archived', 'dismissed']).optional(),
  type: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional()
})

const CreateNotificationSchema = z.object({
  user_id: z.string().uuid().optional(), // If not provided, defaults to current user
  organization_id: z.string().uuid().optional(),
  type: z.string().min(1, 'Type is required'),
  category: z.string().min(1, 'Category is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message must be at most 1000 characters'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['unread', 'read', 'archived', 'dismissed']).default('unread'),
  action_url: z.string().url().optional(),
  action_text: z.string().max(50).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
  scheduled_for: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional()
})

const UpdateNotificationSchema = z.object({
  status: z.enum(['unread', 'read', 'archived', 'dismissed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  read_at: z.string().datetime().optional(),
  archived_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
})

const BulkActionSchema = z.object({
  action: z.enum(['mark_read', 'mark_unread', 'archive', 'dismiss', 'delete']),
  notification_ids: z.array(z.string().uuid()).min(1, 'At least one notification ID is required'),
  filters: z.object({
    status: z.enum(['unread', 'read', 'archived', 'dismissed']).optional(),
    type: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    olderThan: z.string().datetime().optional()
  }).optional()
})

const NotificationPreferencesSchema = z.object({
  email_enabled: z.boolean().default(true),
  push_enabled: z.boolean().default(true),
  sms_enabled: z.boolean().default(false),
  frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).default('immediate'),
  types: z.record(z.string(), z.boolean()).optional(),
  quiet_hours: z.object({
    enabled: z.boolean().default(false),
    start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    timezone: z.string().optional()
  }).optional()
})

/**
 * GET /api/notifications
 * List notifications with filtering and pagination
 */
export const listNotifications = EnhancedHandlers.get(
  {
    validation: { query: NotificationListFiltersSchema },
    rateLimit: { requests: 100, window: '1m' },
    cache: { ttl: 60 }, // 1 minute cache
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseServerClient()
    const filters = req.validatedQuery!

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1)

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType)
    }
    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId)
    }
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    const { data: notifications, error } = await query

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`)
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user!.id)

    return {
      notifications: notifications || [],
      pagination: {
        offset: filters.offset,
        limit: filters.limit,
        total: count || 0,
        hasMore: (count || 0) > filters.offset + filters.limit
      }
    }
  }
)

/**
 * POST /api/notifications
 * Create new notification
 */
export const createNotification = EnhancedHandlers.post(
  CreateNotificationSchema,
  {
    rateLimit: { requests: 50, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseServerClient()
    const notificationData = req.validatedBody!

    const notificationInsert: NotificationInsert = {
      user_id: notificationData.user_id || req.user!.id,
      organization_id: notificationData.organization_id,
      type: notificationData.type,
      category: notificationData.category,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority,
      status: notificationData.status,
      action_url: notificationData.action_url,
      action_text: notificationData.action_text,
      icon: notificationData.icon,
      color: notificationData.color,
      resource_type: notificationData.resource_type,
      resource_id: notificationData.resource_id,
      sender_id: req.user!.id,
      metadata: notificationData.metadata,
      scheduled_for: notificationData.scheduled_for,
      expires_at: notificationData.expires_at
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert(notificationInsert)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`)
    }

    return { notification }
  }
)

/**
 * GET /api/notifications/[id]
 * Get specific notification
 */
export const getNotification = EnhancedHandlers.get(
  {
    rateLimit: { requests: 200, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(req.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      throw new Error('Notification ID is required')
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', req.user!.id)
      .single()

    if (error || !notification) {
      throw new Error('Notification not found')
    }

    return { notification }
  }
)

/**
 * PATCH /api/notifications/[id]
 * Update notification
 */
export const updateNotification = EnhancedHandlers.put(
  UpdateNotificationSchema,
  {
    rateLimit: { requests: 100, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(req.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      throw new Error('Notification ID is required')
    }

    const updateData = req.validatedBody!
    const finalUpdateData: NotificationUpdate = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    // Set automatic timestamps based on status
    if (updateData.status === 'read' && !updateData.read_at) {
      finalUpdateData.read_at = new Date().toISOString()
    }
    if (updateData.status === 'archived' && !updateData.archived_at) {
      finalUpdateData.archived_at = new Date().toISOString()
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .update(finalUpdateData)
      .eq('id', notificationId)
      .eq('user_id', req.user!.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update notification: ${error.message}`)
    }

    return { notification }
  }
)

/**
 * DELETE /api/notifications/[id]
 * Delete notification
 */
export const deleteNotification = EnhancedHandlers.delete(
  {
    rateLimit: { requests: 100, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(req.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      throw new Error('Notification ID is required')
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', req.user!.id)

    if (error) {
      throw new Error(`Failed to delete notification: ${error.message}`)
    }

    return { message: 'Notification deleted successfully' }
  }
)

/**
 * GET /api/notifications/count
 * Get notification counts by status and priority
 */
export const getNotificationCounts = EnhancedHandlers.get(
  {
    rateLimit: { requests: 200, window: '1m' },
    cache: { ttl: 30 }, // 30 seconds cache
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseServerClient()

    // Get counts in parallel
    const [
      { count: unreadCount },
      { count: totalCount },
      { count: criticalCount },
      { count: highCount },
      { count: archivedCount }
    ] = await Promise.all([
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user!.id)
        .eq('status', 'unread'),
      
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user!.id),
      
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user!.id)
        .eq('status', 'unread')
        .eq('priority', 'critical'),
      
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user!.id)
        .eq('status', 'unread')
        .eq('priority', 'high'),
      
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user!.id)
        .eq('status', 'archived')
    ])

    return {
      unread: unreadCount || 0,
      total: totalCount || 0,
      critical_unread: criticalCount || 0,
      high_unread: highCount || 0,
      archived: archivedCount || 0
    }
  }
)

/**
 * PATCH /api/notifications/bulk
 * Bulk update notifications
 */
export const bulkUpdateNotifications = EnhancedHandlers.put(
  BulkActionSchema,
  {
    rateLimit: { requests: 30, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseServerClient()
    const { action, notification_ids, filters } = req.validatedBody!

    let updateData: NotificationUpdate = {
      updated_at: new Date().toISOString()
    }

    // Set update data based on action
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
    }

    let query = supabase.from('notifications')

    if (action === 'delete') {
      query = query.delete()
    } else {
      query = query.update(updateData).select()
    }

    query = query
      .in('id', notification_ids)
      .eq('user_id', req.user!.id)

    // Apply additional filters if provided
    if (filters) {
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.type) {
        query = query.eq('type', filters.type)
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters.olderThan) {
        query = query.lt('created_at', filters.olderThan)
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to ${action} notifications: ${error.message}`)
    }

    return {
      success: true,
      action,
      affected_count: Array.isArray(data) ? data.length : notification_ids.length
    }
  }
)

/**
 * DELETE /api/notifications/bulk
 * Bulk delete notifications
 */
export const bulkDeleteNotifications = EnhancedHandlers.delete(
  {
    validation: { 
      body: z.object({
        notification_ids: z.array(z.string().uuid()).min(1)
      })
    },
    rateLimit: { requests: 20, window: '1m' },
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseServerClient()
    const { notification_ids } = req.validatedBody!

    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notification_ids)
      .eq('user_id', req.user!.id)

    if (error) {
      throw new Error(`Failed to delete notifications: ${error.message}`)
    }

    return {
      success: true,
      deleted_count: notification_ids.length
    }
  }
)

/**
 * GET /api/notifications/anomalies
 * Get notification pattern anomalies (ML-based insights)
 */
export const getNotificationAnomalies = EnhancedHandlers.get(
  {
    rateLimit: { requests: 20, window: '1m' },
    cache: { ttl: 300 }, // 5 minutes cache
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseServerClient()

    // Get notification patterns for anomaly detection
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('type, category, priority, created_at, metadata')
      .eq('user_id', req.user!.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch notification data: ${error.message}`)
    }

    // Simple anomaly detection based on frequency patterns
    const typeFrequency = notifications?.reduce((acc, notif) => {
      acc[notif.type] = (acc[notif.type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const categoryFrequency = notifications?.reduce((acc, notif) => {
      acc[notif.category] = (acc[notif.category] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Detect anomalies (simple threshold-based approach)
    const avgTypeFreq = Object.values(typeFrequency).reduce((a, b) => a + b, 0) / Object.keys(typeFrequency).length || 0
    const avgCategoryFreq = Object.values(categoryFrequency).reduce((a, b) => a + b, 0) / Object.keys(categoryFrequency).length || 0

    const anomalies = []

    // Type anomalies (unusually high frequency)
    for (const [type, freq] of Object.entries(typeFrequency)) {
      if (freq > avgTypeFreq * 2) {
        anomalies.push({
          type: 'type_spike',
          resource: type,
          frequency: freq,
          baseline: avgTypeFreq,
          severity: freq > avgTypeFreq * 3 ? 'high' : 'medium',
          description: `Unusual spike in ${type} notifications`
        })
      }
    }

    // Category anomalies
    for (const [category, freq] of Object.entries(categoryFrequency)) {
      if (freq > avgCategoryFreq * 2) {
        anomalies.push({
          type: 'category_spike',
          resource: category,
          frequency: freq,
          baseline: avgCategoryFreq,
          severity: freq > avgCategoryFreq * 3 ? 'high' : 'medium',
          description: `Unusual spike in ${category} category notifications`
        })
      }
    }

    return {
      anomalies,
      analysis_period: '7 days',
      total_notifications_analyzed: notifications?.length || 0
    }
  }
)

/**
 * GET /api/notifications/predictions
 * Get predictive insights about notification patterns
 */
export const getNotificationPredictions = EnhancedHandlers.get(
  {
    rateLimit: { requests: 10, window: '1m' },
    cache: { ttl: 600 }, // 10 minutes cache
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const supabase = await createSupabaseServerClient()

    // Get historical notification data for predictions
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('type, category, priority, created_at, status, read_at')
      .eq('user_id', req.user!.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch notification data: ${error.message}`)
    }

    const now = new Date()
    const predictions = []

    // Simple prediction based on historical patterns
    if (notifications && notifications.length > 0) {
      // Daily pattern analysis
      const dailyCount = notifications.filter(n => 
        new Date(n.created_at).toDateString() === now.toDateString()
      ).length

      const avgDailyCount = notifications.length / 30

      if (dailyCount > avgDailyCount * 1.5) {
        predictions.push({
          type: 'high_volume_day',
          confidence: 0.8,
          description: 'Higher than usual notification volume expected today',
          impact: 'medium'
        })
      }

      // Read rate analysis
      const readNotifications = notifications.filter(n => n.status === 'read').length
      const readRate = readNotifications / notifications.length

      if (readRate < 0.5) {
        predictions.push({
          type: 'low_engagement',
          confidence: 0.7,
          description: 'Low notification engagement rate detected',
          impact: 'high',
          recommendation: 'Consider reducing notification frequency or improving relevance'
        })
      }
    }

    return {
      predictions,
      analysis_period: '30 days',
      confidence_threshold: 0.6
    }
  }
)

// Export all handlers with proper naming for Next.js App Router
export {
  listNotifications as GET_notifications,
  createNotification as POST_notifications,
  getNotification as GET_notification_by_id,
  updateNotification as PATCH_notification_by_id,
  deleteNotification as DELETE_notification_by_id,
  getNotificationCounts as GET_notification_counts,
  bulkUpdateNotifications as PATCH_bulk_notifications,
  bulkDeleteNotifications as DELETE_bulk_notifications,
  getNotificationAnomalies as GET_notification_anomalies,
  getNotificationPredictions as GET_notification_predictions
}