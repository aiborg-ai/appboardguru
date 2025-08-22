import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  UserId, 
  OrganizationId, 
  NotificationId,
  QueryOptions, 
  PaginatedResult, 
  EntityStatus,
  Priority,
  createUserId,
  createOrganizationId,
  createNotificationId
} from './types'
import type { Database } from '../../types/database'

type Notification = Database['public']['Tables']['notifications']['Row']
type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

export interface NotificationFilters {
  status?: 'unread' | 'read' | 'dismissed' | 'archived'
  type?: string
  category?: string
  priority?: Priority
  organizationId?: OrganizationId
  dateFrom?: Date
  dateTo?: Date
}

export interface NotificationCreateData {
  user_id: UserId
  organization_id?: OrganizationId
  type: string
  category: string
  title: string
  message: string
  priority?: Priority
  status?: 'unread' | 'read' | 'dismissed' | 'archived'
  action_url?: string
  action_text?: string
  icon?: string
  color?: string
  resource_type?: string
  resource_id?: string
  sender_id?: UserId
  metadata?: Record<string, unknown>
  scheduled_for?: Date
  expires_at?: Date
}

export interface NotificationStats {
  total: number
  unread: number
  read: number
  byType: Record<string, number>
  byPriority: Record<string, number>
  recentActivity: {
    today: number
    thisWeek: number
    thisMonth: number
  }
}

export class NotificationRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'Notification'
  }

  protected getSearchFields(): string[] {
    return ['title', 'message', 'type', 'category']
  }

  async findById(id: NotificationId): Promise<Result<Notification>> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single()

    return this.createResult(data, error, 'findById')
  }

  async findByUserId(
    userId: UserId, 
    filters: NotificationFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<Notification>>> {
    let query = this.supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString())
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString())
    }

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data || [], count, options, error)
  }

  async create(notificationData: NotificationCreateData): Promise<Result<Notification>> {
    // Validate required fields
    const validation = this.validateRequired(notificationData, ['user_id', 'type', 'category', 'title', 'message'])
    if (!validation.success) {
      return validation
    }

    const insertData: NotificationInsert = {
      user_id: notificationData.user_id,
      organization_id: notificationData.organization_id,
      type: notificationData.type,
      category: notificationData.category,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || 'medium',
      status: notificationData.status || 'unread',
      action_url: notificationData.action_url,
      action_text: notificationData.action_text,
      icon: notificationData.icon,
      color: notificationData.color,
      resource_type: notificationData.resource_type,
      resource_id: notificationData.resource_id,
      sender_id: notificationData.sender_id,
      metadata: notificationData.metadata,
      scheduled_for: notificationData.scheduled_for?.toISOString(),
      expires_at: notificationData.expires_at?.toISOString(),
      created_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('notifications')
      .insert(insertData)
      .select()
      .single()

    const result = this.createResult(data, error, 'create')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: notificationData.sender_id || notificationData.user_id,
        organization_id: notificationData.organization_id,
        event_type: 'notification_management',
        event_category: 'notification_lifecycle',
        action: 'create',
        resource_type: 'notification',
        resource_id: data.id,
        event_description: `Notification created: ${data.title}`,
        outcome: 'success',
        severity: 'low'
      })
    }

    return result
  }

  async bulkCreate(notifications: NotificationCreateData[]): Promise<Result<Notification[]>> {
    if (notifications.length === 0) {
      return success([])
    }

    const insertData = notifications.map(notification => ({
      user_id: notification.user_id,
      organization_id: notification.organization_id,
      type: notification.type,
      category: notification.category,
      title: notification.title,
      message: notification.message,
      priority: notification.priority || 'medium',
      status: notification.status || 'unread',
      action_url: notification.action_url,
      action_text: notification.action_text,
      icon: notification.icon,
      color: notification.color,
      resource_type: notification.resource_type,
      resource_id: notification.resource_id,
      sender_id: notification.sender_id,
      metadata: notification.metadata,
      scheduled_for: notification.scheduled_for?.toISOString(),
      expires_at: notification.expires_at?.toISOString(),
      created_at: new Date().toISOString()
    }))

    const { data, error } = await this.supabase
      .from('notifications')
      .insert(insertData)
      .select()

    return this.createResult(data || [], error, 'bulkCreate')
  }

  async markAsRead(id: NotificationId): Promise<Result<Notification>> {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    return this.createResult(data, error, 'markAsRead')
  }

  async markAllAsRead(userId: UserId, organizationId?: OrganizationId): Promise<Result<void>> {
    let query = this.supabase
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'unread')

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { error } = await query

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'markAllAsRead'))
    }

    return success(undefined)
  }

  async dismiss(id: NotificationId): Promise<Result<Notification>> {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    return this.createResult(data, error, 'dismiss')
  }

  async archive(id: NotificationId): Promise<Result<Notification>> {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    return this.createResult(data, error, 'archive')
  }

  async delete(id: NotificationId): Promise<Result<void>> {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'delete'))
    }

    return success(undefined)
  }

  async bulkDelete(ids: NotificationId[]): Promise<Result<void>> {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .in('id', ids)

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'bulkDelete'))
    }

    return success(undefined)
  }

  async getStats(userId: UserId, organizationId?: OrganizationId): Promise<Result<NotificationStats>> {
    // Get basic counts
    let countQuery = this.supabase
      .from('notifications')
      .select('status, type, priority, created_at', { count: 'exact' })
      .eq('user_id', userId)

    if (organizationId) {
      countQuery = countQuery.eq('organization_id', organizationId)
    }

    const { data: notifications, error, count } = await countQuery

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'getStats'))
    }

    const stats: NotificationStats = {
      total: count || 0,
      unread: 0,
      read: 0,
      byType: {},
      byPriority: {},
      recentActivity: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0
      }
    }

    if (notifications) {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      notifications.forEach(notification => {
        // Count by status
        if (notification.status === 'unread') stats.unread++
        if (notification.status === 'read') stats.read++

        // Count by type
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1

        // Count by priority
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1

        // Count recent activity
        const createdAt = new Date(notification.created_at)
        if (createdAt >= today) stats.recentActivity.today++
        if (createdAt >= thisWeek) stats.recentActivity.thisWeek++
        if (createdAt >= thisMonth) stats.recentActivity.thisMonth++
      })
    }

    return success(stats)
  }

  async findExpiredNotifications(): Promise<Result<Notification[]>> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .not('expires_at', 'is', null)
      .lte('expires_at', new Date().toISOString())
      .neq('status', 'archived')

    return this.createResult(data || [], error, 'findExpiredNotifications')
  }

  async cleanupExpired(): Promise<Result<number>> {
    const expiredResult = await this.findExpiredNotifications()
    if (!expiredResult.success) {
      return expiredResult
    }

    if (expiredResult.data.length === 0) {
      return success(0)
    }

    const ids = expiredResult.data.map(n => createNotificationId(n.id))
    const deleteResult = await this.bulkDelete(ids)
    
    if (!deleteResult.success) {
      return deleteResult
    }

    return success(expiredResult.data.length)
  }

  async findScheduledNotifications(): Promise<Result<Notification[]>> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', new Date().toISOString())
      .eq('status', 'scheduled')

    return this.createResult(data || [], error, 'findScheduledNotifications')
  }

  async processScheduledNotifications(): Promise<Result<number>> {
    const scheduledResult = await this.findScheduledNotifications()
    if (!scheduledResult.success) {
      return scheduledResult
    }

    if (scheduledResult.data.length === 0) {
      return success(0)
    }

    // Update scheduled notifications to unread
    const ids = scheduledResult.data.map(n => n.id)
    const { error } = await this.supabase
      .from('notifications')
      .update({
        status: 'unread',
        updated_at: new Date().toISOString()
      })
      .in('id', ids)

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'processScheduledNotifications'))
    }

    return success(scheduledResult.data.length)
  }
}