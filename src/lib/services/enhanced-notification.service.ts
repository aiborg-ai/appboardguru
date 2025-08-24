/**
 * Enhanced Notification Service with Advanced Async Patterns
 * - Multi-channel notification delivery (email, push, SMS, in-app)
 * - Advanced batching and queue management
 * - Circuit breaker protection for external notification services
 * - Intelligent retry strategies with exponential backoff
 * - Performance monitoring and delivery analytics
 */

import { EnhancedBaseService } from './enhanced-base-service'
import { Result, success, failure, RepositoryError } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export interface Notification {
  id: string
  user_id: string
  organization_id: string
  type: NotificationType
  channel: NotificationChannel[]
  title: string
  message: string
  data?: Record<string, any>
  status: NotificationStatus
  priority: NotificationPriority
  scheduled_for?: string
  delivered_at?: string
  read_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export type NotificationType = 
  | 'board_meeting'
  | 'document_shared'
  | 'task_assigned'
  | 'compliance_deadline'
  | 'system_alert'
  | 'user_mention'
  | 'approval_request'

export type NotificationChannel = 'email' | 'push' | 'sms' | 'in_app' | 'webhook'

export type NotificationStatus = 
  | 'pending'
  | 'queued'
  | 'sending'
  | 'delivered'
  | 'failed'
  | 'cancelled'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface NotificationTemplate {
  id: string
  type: NotificationType
  channel: NotificationChannel
  title: string
  body: string
  variables: string[]
  is_active: boolean
}

export interface BulkNotificationRequest {
  notifications: CreateNotificationRequest[]
  batchSize?: number
  maxRetries?: number
  scheduleDelay?: number
}

export interface CreateNotificationRequest {
  userIds: string[]
  organizationId: string
  type: NotificationType
  channels: NotificationChannel[]
  title: string
  message: string
  data?: Record<string, any>
  priority?: NotificationPriority
  scheduledFor?: Date
  expiresAt?: Date
  templateId?: string
  templateVariables?: Record<string, any>
}

export interface NotificationPreferences {
  userId: string
  emailEnabled: boolean
  pushEnabled: boolean
  smsEnabled: boolean
  inAppEnabled: boolean
  quietHours: {
    enabled: boolean
    start: string // HH:MM format
    end: string   // HH:MM format
    timezone: string
  }
  categoryPreferences: Record<NotificationType, {
    enabled: boolean
    channels: NotificationChannel[]
    priority: NotificationPriority
  }>
}

export interface NotificationAnalytics {
  deliveryStats: {
    total: number
    delivered: number
    failed: number
    pending: number
    deliveryRate: number
  }
  channelStats: Record<NotificationChannel, {
    sent: number
    delivered: number
    failed: number
    averageDeliveryTime: number
  }>
  typeStats: Record<NotificationType, number>
  priorityStats: Record<NotificationPriority, number>
  userEngagement: {
    totalUsers: number
    activeUsers: number
    readRate: number
    averageReadTime: number
  }
}

export interface DeliveryJob {
  notificationId: string
  channel: NotificationChannel
  attempts: number
  maxAttempts: number
  nextAttempt: Date
  lastError?: string
}

export class EnhancedNotificationService extends EnhancedBaseService {
  private deliveryQueue = new Map<string, DeliveryJob[]>()
  private processingBatches = new Set<string>()

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, {
      maxConcurrent: 25, // High concurrency for notifications
      timeoutMs: 30000,
      retryConfig: {
        attempts: 5,
        backoff: 'exponential',
        maxDelay: 30000
      }
    })

    // Start background processing
    this.startDeliveryProcessor()
  }

  /**
   * Send single notification with intelligent delivery
   */
  async sendNotification(request: CreateNotificationRequest): Promise<Result<{
    notificationIds: string[]
    scheduledDeliveries: number
    failedUsers: string[]
  }>> {
    const startTime = Date.now()

    const result = await this.executeWithConcurrencyControl(async () => {
      // Validate and filter users based on preferences
      const eligibleUsers = await this.filterUsersByPreferences(
        request.userIds,
        request.type,
        request.channels
      )

      if (!eligibleUsers.success) {
        throw eligibleUsers.error
      }

      if (eligibleUsers.data.length === 0) {
        return {
          notificationIds: [],
          scheduledDeliveries: 0,
          failedUsers: request.userIds
        }
      }

      // Create notification records
      const notifications = await this.createNotificationRecords(
        request,
        eligibleUsers.data
      )

      if (!notifications.success) {
        throw notifications.error
      }

      // Queue for delivery
      const queuedCount = await this.queueNotificationsForDelivery(
        notifications.data,
        request.channels
      )

      return {
        notificationIds: notifications.data.map(n => n.id),
        scheduledDeliveries: queuedCount,
        failedUsers: request.userIds.filter(
          userId => !eligibleUsers.data.some(u => u.id === userId)
        )
      }
    })

    this.recordPerformanceMetric('sendNotification', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'sendNotification', {
        userCount: request.userIds.length,
        type: request.type
      }))
    }

    return result
  }

  /**
   * Bulk send notifications with advanced batching
   */
  async sendBulkNotifications(request: BulkNotificationRequest): Promise<Result<{
    successful: number
    failed: number
    totalDeliveries: number
    processingTime: number
    batchResults: Array<{
      batchId: string
      notificationIds: string[]
      deliveries: number
      errors: string[]
    }>
  }>> {
    const startTime = Date.now()
    const { notifications, batchSize = 50, maxRetries = 3 } = request

    const result = await this.executeBulkOperation({
      items: notifications,
      batchSize,
      processor: async (batch: CreateNotificationRequest[]) => {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Process batch with error isolation
        const batchResults = await this.executeParallel(
          batch.map(notif => () => this.sendNotification(notif)),
          {
            maxConcurrency: 5,
            failFast: false,
            aggregateErrors: false
          }
        )

        if (!batchResults.success) {
          throw batchResults.error
        }

        return {
          batchId,
          results: batchResults.data,
          notificationCount: batch.length
        }
      },
      onProgress: (processed, total) => {
        console.log(`Bulk notification progress: ${processed}/${total} batches`)
      },
      onError: (error, batch) => {
        console.error(`Notification batch failed:`, batch.length, 'notifications', error.message)
      }
    })

    this.recordPerformanceMetric('sendBulkNotifications', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'sendBulkNotifications', {
        notificationCount: notifications.length
      }))
    }

    // Aggregate results
    let totalSuccessful = 0
    let totalFailed = 0
    let totalDeliveries = 0
    const batchResults: any[] = []

    for (const batchData of result.data) {
      let batchSuccessful = 0
      let batchDeliveries = 0
      const errors: string[] = []

      for (const notifResult of batchData.results) {
        if (notifResult) {
          batchSuccessful++
          batchDeliveries += notifResult.scheduledDeliveries
        } else {
          errors.push('Failed to process notification')
        }
      }

      totalSuccessful += batchSuccessful
      totalFailed += (batchData.notificationCount - batchSuccessful)
      totalDeliveries += batchDeliveries

      batchResults.push({
        batchId: batchData.batchId,
        notificationIds: batchData.results.flatMap(r => r?.notificationIds || []),
        deliveries: batchDeliveries,
        errors
      })
    }

    return success({
      successful: totalSuccessful,
      failed: totalFailed,
      totalDeliveries,
      processingTime: Date.now() - startTime,
      batchResults
    })
  }

  /**
   * Get notifications for user with advanced filtering
   */
  async getUserNotifications(
    userId: string,
    options: {
      types?: NotificationType[]
      status?: NotificationStatus[]
      priority?: NotificationPriority[]
      unreadOnly?: boolean
      limit?: number
      offset?: number
      includeExpired?: boolean
    } = {}
  ): Promise<Result<{
    notifications: Notification[]
    unreadCount: number
    totalCount: number
    hasMore: boolean
  }>> {
    const startTime = Date.now()
    const { limit = 50, offset = 0, unreadOnly = false } = options

    const result = await this.executeWithCache(
      `notifications:user:${userId}:${JSON.stringify(options)}`,
      async () => {
        return this.executeWithCircuitBreaker('database', async () => {
          let query = this.supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)

          // Apply filters
          if (options.types && options.types.length > 0) {
            query = query.in('type', options.types)
          }
          if (options.status && options.status.length > 0) {
            query = query.in('status', options.status)
          }
          if (options.priority && options.priority.length > 0) {
            query = query.in('priority', options.priority)
          }
          if (unreadOnly) {
            query = query.is('read_at', null)
          }
          if (!options.includeExpired) {
            query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
          }

          // Apply sorting and pagination
          query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

          const { data, error, count } = await query

          if (error) {
            throw RepositoryError.database('Failed to fetch notifications', error, 'getUserNotifications')
          }

          // Get unread count separately
          const { count: unreadCount, error: unreadError } = await this.supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('read_at', null)

          if (unreadError) {
            console.warn('Failed to get unread count:', unreadError)
          }

          return {
            notifications: data as Notification[],
            unreadCount: unreadCount || 0,
            totalCount: count || 0
          }
        })
      },
      {
        ttl: 60000, // 1 minute - short cache for real-time updates
        tags: ['notifications', `user:${userId}`],
        refreshThreshold: 0.9
      }
    )

    this.recordPerformanceMetric('getUserNotifications', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'getUserNotifications', { userId, options }))
    }

    const { notifications, unreadCount, totalCount } = result.data

    return success({
      notifications,
      unreadCount,
      totalCount,
      hasMore: offset + limit < totalCount
    })
  }

  /**
   * Mark notifications as read with bulk support
   */
  async markNotificationsRead(
    userId: string,
    notificationIds?: string[]
  ): Promise<Result<{ updatedCount: number }>> {
    const startTime = Date.now()

    const result = await this.executeWithConcurrencyControl(async () => {
      return this.executeWithCircuitBreaker('database', async () => {
        let query = this.supabase
          .from('notifications')
          .update({
            read_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .is('read_at', null)

        if (notificationIds && notificationIds.length > 0) {
          query = query.in('id', notificationIds)
        }

        const { count, error } = await query.select('*', { count: 'exact', head: true })

        if (error) {
          throw RepositoryError.database('Failed to mark notifications read', error, 'markNotificationsRead')
        }

        // Invalidate user notifications cache
        await this.invalidateUserNotificationCache(userId)

        return { updatedCount: count || 0 }
      })
    })

    this.recordPerformanceMetric('markNotificationsRead', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'markNotificationsRead', {
        userId,
        notificationIds: notificationIds?.length
      }))
    }

    return result
  }

  /**
   * Get notification analytics with advanced metrics
   */
  async getNotificationAnalytics(
    organizationId: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<Result<NotificationAnalytics>> {
    const startTime = Date.now()

    const result = await this.executeWithCache(
      `analytics:notifications:${organizationId}:${period}`,
      async () => {
        return this.executeWithCircuitBreaker('database', async () => {
          const dateFilter = this.getDateFilter(period)

          // Run parallel queries for different analytics
          const analyticsQueries = await this.executeParallel([
            // Delivery stats
            async () => {
              const { data, error } = await this.supabase
                .from('notifications')
                .select('status')
                .eq('organization_id', organizationId)
                .gte('created_at', dateFilter.toISOString())

              if (error) throw error
              return this.aggregateDeliveryStats(data)
            },

            // Channel performance
            async () => {
              const { data, error } = await this.supabase
                .from('notification_deliveries')
                .select('channel, status, delivered_at, created_at')
                .eq('organization_id', organizationId)
                .gte('created_at', dateFilter.toISOString())

              if (error) throw error
              return this.aggregateChannelStats(data)
            },

            // User engagement
            async () => {
              const { data, error } = await this.supabase
                .from('notifications')
                .select('user_id, read_at, created_at')
                .eq('organization_id', organizationId)
                .gte('created_at', dateFilter.toISOString())

              if (error) throw error
              return this.aggregateEngagementStats(data)
            }
          ])

          if (!analyticsQueries.success) {
            throw analyticsQueries.error
          }

          const [deliveryStats, channelStats, userEngagement] = analyticsQueries.data

          return {
            deliveryStats,
            channelStats,
            typeStats: {},
            priorityStats: {},
            userEngagement
          } as NotificationAnalytics
        })
      },
      {
        ttl: 1800000, // 30 minutes
        tags: ['analytics', `org:${organizationId}`],
        refreshThreshold: 0.8
      }
    )

    this.recordPerformanceMetric('getNotificationAnalytics', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'getNotificationAnalytics', {
        organizationId,
        period
      }))
    }

    return result
  }

  /**
   * Private helper methods
   */
  private async filterUsersByPreferences(
    userIds: string[],
    type: NotificationType,
    channels: NotificationChannel[]
  ): Promise<Result<Array<{ id: string; preferredChannels: NotificationChannel[] }>>> {
    // Get user preferences and filter based on their notification settings
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .select('user_id, category_preferences, quiet_hours')
      .in('user_id', userIds)

    if (error) {
      return failure(RepositoryError.database('Failed to get user preferences', error))
    }

    // Filter users and channels based on preferences and quiet hours
    const eligibleUsers = userIds.map(userId => {
      const preferences = data.find(p => p.user_id === userId)
      
      if (!preferences) {
        return { id: userId, preferredChannels: channels }
      }

      // Check if user has this notification type enabled
      const typePrefs = preferences.category_preferences?.[type]
      if (!typePrefs?.enabled) {
        return null
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences.quiet_hours)) {
        return null
      }

      // Filter channels based on user preferences
      const preferredChannels = channels.filter(channel => 
        typePrefs.channels?.includes(channel) ?? true
      )

      return preferredChannels.length > 0 
        ? { id: userId, preferredChannels }
        : null
    }).filter(Boolean) as Array<{ id: string; preferredChannels: NotificationChannel[] }>

    return success(eligibleUsers)
  }

  private async createNotificationRecords(
    request: CreateNotificationRequest,
    users: Array<{ id: string; preferredChannels: NotificationChannel[] }>
  ): Promise<Result<Notification[]>> {
    const notifications = users.map(user => ({
      user_id: user.id,
      organization_id: request.organizationId,
      type: request.type,
      channel: user.preferredChannels,
      title: request.title,
      message: request.message,
      data: request.data,
      priority: request.priority || 'normal',
      status: 'pending' as NotificationStatus,
      scheduled_for: request.scheduledFor?.toISOString(),
      expires_at: request.expiresAt?.toISOString()
    }))

    const { data, error } = await this.supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      return failure(RepositoryError.database('Failed to create notification records', error))
    }

    return success(data as Notification[])
  }

  private async queueNotificationsForDelivery(
    notifications: Notification[],
    channels: NotificationChannel[]
  ): Promise<number> {
    let queuedCount = 0

    for (const notification of notifications) {
      for (const channel of channels) {
        const job: DeliveryJob = {
          notificationId: notification.id,
          channel,
          attempts: 0,
          maxAttempts: 5,
          nextAttempt: notification.scheduled_for 
            ? new Date(notification.scheduled_for)
            : new Date()
        }

        const channelKey = `${channel}:${notification.organization_id}`
        if (!this.deliveryQueue.has(channelKey)) {
          this.deliveryQueue.set(channelKey, [])
        }
        
        this.deliveryQueue.get(channelKey)!.push(job)
        queuedCount++
      }
    }

    return queuedCount
  }

  private startDeliveryProcessor(): void {
    // Background processor that handles delivery queue
    setInterval(() => {
      this.processDeliveryQueue().catch(error => {
        console.error('Delivery processor error:', error)
      })
    }, 30000) // Process every 30 seconds
  }

  private async processDeliveryQueue(): Promise<void> {
    const now = new Date()

    for (const [channelKey, jobs] of this.deliveryQueue) {
      const readyJobs = jobs.filter(job => job.nextAttempt <= now)
      
      if (readyJobs.length === 0) continue

      // Process jobs for this channel
      const channelResult = await this.executeWithCircuitBreaker(
        `delivery:${channelKey}`,
        async () => {
          return this.processChannelJobs(channelKey, readyJobs)
        }
      )

      if (!channelResult.success) {
        console.error(`Failed to process jobs for channel ${channelKey}:`, channelResult.error)
      }
    }
  }

  private async processChannelJobs(channelKey: string, jobs: DeliveryJob[]): Promise<void> {
    // Implementation would handle actual delivery to external services
    // This is a simplified version
    console.log(`Processing ${jobs.length} delivery jobs for channel: ${channelKey}`)
    
    for (const job of jobs) {
      try {
        // Simulate delivery
        await this.deliverNotification(job)
        
        // Remove from queue on success
        this.removeJobFromQueue(channelKey, job)
      } catch (error) {
        // Handle retry logic
        this.handleDeliveryFailure(channelKey, job, error as Error)
      }
    }
  }

  private async deliverNotification(job: DeliveryJob): Promise<void> {
    // This would integrate with actual delivery services
    // Email: SendGrid, SES, etc.
    // Push: Firebase, APNs, etc.
    // SMS: Twilio, AWS SNS, etc.
    console.debug(`Delivering notification ${job.notificationId} via ${job.channel}`)
  }

  private removeJobFromQueue(channelKey: string, job: DeliveryJob): void {
    const jobs = this.deliveryQueue.get(channelKey)
    if (jobs) {
      const index = jobs.findIndex(j => 
        j.notificationId === job.notificationId && j.channel === job.channel
      )
      if (index >= 0) {
        jobs.splice(index, 1)
      }
    }
  }

  private handleDeliveryFailure(channelKey: string, job: DeliveryJob, error: Error): void {
    job.attempts++
    job.lastError = error.message

    if (job.attempts >= job.maxAttempts) {
      // Mark as failed and remove from queue
      this.markNotificationFailed(job.notificationId, job.channel, error.message)
      this.removeJobFromQueue(channelKey, job)
    } else {
      // Schedule retry with exponential backoff
      const delay = Math.pow(2, job.attempts) * 1000 * 60 // Start at 2 minutes
      job.nextAttempt = new Date(Date.now() + delay)
    }
  }

  private async markNotificationFailed(
    notificationId: string, 
    channel: NotificationChannel, 
    error: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('notifications')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
          data: this.supabase.raw(`coalesce(data, '{}') || '{"delivery_errors": ["${error}"]}'`)
        })
        .eq('id', notificationId)
    } catch (updateError) {
      console.error(`Failed to mark notification as failed: ${notificationId}`, updateError)
    }
  }

  private isInQuietHours(quietHours: any): boolean {
    if (!quietHours?.enabled) return false
    
    const now = new Date()
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    
    return currentTime >= quietHours.start && currentTime <= quietHours.end
  }

  private getDateFilter(period: string): Date {
    const now = new Date()
    switch (period) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }
  }

  private aggregateDeliveryStats(data: any[]): any {
    const stats = data.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})

    const total = data.length
    const delivered = stats.delivered || 0

    return {
      total,
      delivered,
      failed: stats.failed || 0,
      pending: stats.pending || 0,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0
    }
  }

  private aggregateChannelStats(data: any[]): any {
    return data.reduce((acc, item) => {
      if (!acc[item.channel]) {
        acc[item.channel] = {
          sent: 0,
          delivered: 0,
          failed: 0,
          averageDeliveryTime: 0
        }
      }

      acc[item.channel].sent++
      if (item.status === 'delivered') {
        acc[item.channel].delivered++
        
        if (item.delivered_at) {
          const deliveryTime = new Date(item.delivered_at).getTime() - 
            new Date(item.created_at).getTime()
          acc[item.channel].averageDeliveryTime = 
            (acc[item.channel].averageDeliveryTime + deliveryTime) / acc[item.channel].delivered
        }
      } else if (item.status === 'failed') {
        acc[item.channel].failed++
      }

      return acc
    }, {})
  }

  private aggregateEngagementStats(data: any[]): any {
    const uniqueUsers = new Set(data.map(item => item.user_id)).size
    const readNotifications = data.filter(item => item.read_at).length
    const totalNotifications = data.length

    return {
      totalUsers: uniqueUsers,
      activeUsers: uniqueUsers, // Simplified
      readRate: totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 0,
      averageReadTime: 0 // Would calculate from actual read times
    }
  }

  private async invalidateUserNotificationCache(userId: string): Promise<void> {
    // Implementation would invalidate cache entries with user notification tags
    console.debug(`Invalidating notification cache for user: ${userId}`)
  }

  /**
   * Get notification service-specific metrics
   */
  getNotificationServiceMetrics() {
    return {
      performance: this.getPerformanceStats(),
      circuitBreakers: this.getCircuitBreakerStats(),
      concurrency: this.concurrencyManager.getStats(),
      queueStats: {
        totalQueues: this.deliveryQueue.size,
        totalJobs: Array.from(this.deliveryQueue.values()).reduce((sum, jobs) => sum + jobs.length, 0),
        processingBatches: this.processingBatches.size
      }
    }
  }

  /**
   * Health check with notification-specific checks
   */
  async healthCheck(): Promise<Result<any>> {
    const baseHealth = await super.healthCheck()
    
    if (!baseHealth.success) {
      return baseHealth
    }

    // Add notification-specific health checks
    const deliveryQueueHealth = {
      status: this.deliveryQueue.size > 0 ? 'active' : 'idle',
      queueCount: this.deliveryQueue.size,
      totalJobs: Array.from(this.deliveryQueue.values()).reduce((sum, jobs) => sum + jobs.length, 0)
    }

    return success({
      ...baseHealth.data,
      dependencies: {
        ...baseHealth.data.dependencies,
        deliveryQueue: deliveryQueueHealth
      }
    })
  }
}