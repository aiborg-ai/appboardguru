import { BaseService } from './base.service'
import { 
  Result, 
  success, 
  failure, 
  RepositoryError 
} from '../repositories/result'
import { 
  NotificationRepository, 
  NotificationCreateData, 
  NotificationFilters,
  NotificationStats 
} from '../repositories/notification.repository'
import { z } from 'zod'
import type { 
  UserId, 
  OrganizationId, 
  NotificationId 
} from '../../types/branded'
import { 
  createUserId,
  createOrganizationId,
  createNotificationId,
  isUserId,
  isOrganizationId,
  isNotificationId
} from '../../types/branded'
import type { 
  QueryOptions, 
  PaginatedResult 
} from '../repositories/types'
import type { Database } from '../../types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

type Notification = Database['public']['Tables']['notifications']['Row']

// ============================================
// VALIDATION SCHEMAS WITH BRANDED TYPES
// ============================================

// Custom branded ID validators
const BrandedUserIdSchema = z.string().refine(isUserId, 'Invalid UserId format')
const BrandedOrganizationIdSchema = z.string().refine(isOrganizationId, 'Invalid OrganizationId format')
const BrandedNotificationIdSchema = z.string().refine(isNotificationId, 'Invalid NotificationId format')

const CreateNotificationSchema = z.object({
  user_id: BrandedUserIdSchema,
  organization_id: BrandedOrganizationIdSchema.optional(),
  type: z.string().min(1),
  category: z.string().min(1),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  action_url: z.string().url().optional(),
  action_text: z.string().max(100).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  sender_id: BrandedUserIdSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  scheduled_for: z.date().optional(),
  expires_at: z.date().optional()
})

const BulkNotificationSchema = z.object({
  user_ids: z.array(BrandedUserIdSchema).min(1).max(1000),
  notification_data: CreateNotificationSchema.omit({ user_id: true })
})

const NotificationFiltersSchema = z.object({
  status: z.enum(['unread', 'read', 'dismissed', 'archived']).optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  organizationId: BrandedOrganizationIdSchema.optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional()
})

// ============================================
// SERVICE INTERFACES
// ============================================

export interface NotificationServiceInterface {
  // Core notification operations
  createNotification(data: NotificationCreateData): Promise<Result<Notification>>
  bulkCreateNotifications(data: { user_ids: UserId[], notification_data: Omit<NotificationCreateData, 'user_id'> }): Promise<Result<Notification[]>>
  
  // Notification lifecycle
  markAsRead(id: NotificationId): Promise<Result<Notification>>
  markAllAsRead(userId: UserId, organizationId?: OrganizationId): Promise<Result<void>>
  dismissNotification(id: NotificationId): Promise<Result<Notification>>
  archiveNotification(id: NotificationId): Promise<Result<Notification>>
  deleteNotification(id: NotificationId): Promise<Result<void>>
  
  // Queries
  getUserNotifications(userId: UserId, filters?: NotificationFilters, options?: QueryOptions): Promise<Result<PaginatedResult<Notification>>>
  getNotificationById(id: NotificationId): Promise<Result<Notification>>
  getNotificationStats(userId: UserId, organizationId?: OrganizationId): Promise<Result<NotificationStats>>
  
  // Advanced features
  scheduleNotification(data: NotificationCreateData & { scheduled_for: Date }): Promise<Result<Notification>>
  processScheduledNotifications(): Promise<Result<number>>
  cleanupExpiredNotifications(): Promise<Result<number>>
  
  // Real-time features
  subscribeToUserNotifications(userId: UserId): Promise<Result<any>>
  unsubscribeFromNotifications(subscription: any): Promise<Result<void>>
}

// ============================================
// ENHANCED NOTIFICATION SERVICE
// ============================================

export class EnhancedNotificationService extends BaseService implements NotificationServiceInterface {
  private notificationRepository: NotificationRepository

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.notificationRepository = this.repositories.notifications
  }

  // ============================================
  // CORE NOTIFICATION OPERATIONS
  // ============================================

  /**
   * Create a new notification with comprehensive validation and error handling
   */
  async createNotification(data: NotificationCreateData): Promise<Result<Notification>> {
    // Validate input data
    const validationResult = this.validateWithContext(
      data, 
      CreateNotificationSchema, 
      'create notification',
      'notification_data'
    )
    if (!validationResult.success) {
      return validationResult
    }

    // Check user permissions (if sender is different from recipient)
    if (data.sender_id && data.sender_id !== data.user_id) {
      const permissionResult = await this.checkPermissionWithContext(
        data.sender_id,
        'notification',
        'create',
        undefined,
        { recipientUserId: data.user_id, organizationId: data.organization_id }
      )
      if (!permissionResult.success) {
        return failure(permissionResult.error)
      }
    }

    // Create notification through repository
    const createResult = await this.executeDbOperation(
      () => this.notificationRepository.create(validationResult.data),
      'create_notification',
      { userId: data.user_id, type: data.type, category: data.category }
    )

    if (!createResult.success) {
      return createResult
    }

    // Log successful creation
    await this.logActivity(
      'create_notification',
      'notification',
      createResult.data.id,
      {
        type: data.type,
        category: data.category,
        priority: data.priority,
        recipientId: data.user_id,
        senderId: data.sender_id
      }
    )

    return createResult
  }

  /**
   * Create notifications for multiple users efficiently
   */
  async bulkCreateNotifications(data: {
    user_ids: UserId[]
    notification_data: Omit<NotificationCreateData, 'user_id'>
  }): Promise<Result<Notification[]>> {
    // Validate bulk operation data
    const validationResult = this.validateWithContext(
      data,
      BulkNotificationSchema,
      'bulk create notifications',
      'bulk_notification_data'
    )
    if (!validationResult.success) {
      return validationResult
    }

    const { user_ids, notification_data } = validationResult.data

    // Check permissions for bulk operation
    if (notification_data.sender_id) {
      const permissionResult = await this.checkPermissionWithContext(
        notification_data.sender_id,
        'notification',
        'bulk_create',
        undefined,
        { userCount: user_ids.length, organizationId: notification_data.organization_id }
      )
      if (!permissionResult.success) {
        return failure(permissionResult.error)
      }
    }

    // Create notification data for each user
    const notifications: NotificationCreateData[] = user_ids.map(userId => ({
      ...notification_data,
      user_id: userId
    }))

    // Execute bulk create operation
    const createResult = await this.executeDbOperation(
      () => this.notificationRepository.bulkCreate(notifications),
      'bulk_create_notifications',
      { userCount: user_ids.length, type: notification_data.type }
    )

    if (!createResult.success) {
      return createResult
    }

    // Log bulk operation
    await this.logActivity(
      'bulk_create_notifications',
      'notification',
      undefined,
      {
        userCount: user_ids.length,
        type: notification_data.type,
        category: notification_data.category,
        senderId: notification_data.sender_id,
        createdCount: createResult.data.length
      }
    )

    return createResult
  }

  // ============================================
  // NOTIFICATION LIFECYCLE MANAGEMENT
  // ============================================

  /**
   * Mark a notification as read
   */
  async markAsRead(id: NotificationId): Promise<Result<Notification>> {
    // Get current user for permission check
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    // Get notification first to verify ownership
    const notificationResult = await this.notificationRepository.findById(id)
    if (!notificationResult.success) {
      return notificationResult
    }

    // Check if user can modify this notification
    if (notificationResult.data.user_id !== userResult.data.id) {
      return failure(RepositoryError.forbidden(
        'mark_as_read',
        'Cannot modify notifications belonging to other users'
      ))
    }

    // Mark as read
    const updateResult = await this.executeDbOperation(
      () => this.notificationRepository.markAsRead(id),
      'mark_notification_read',
      { notificationId: id, userId: userResult.data.id }
    )

    if (updateResult.success) {
      await this.logActivity(
        'mark_notification_read',
        'notification',
        id,
        { userId: userResult.data.id }
      )
    }

    return updateResult
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: UserId, organizationId?: OrganizationId): Promise<Result<void>> {
    // Check permissions
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    // Users can only mark their own notifications as read
    if (userResult.data.id !== userId) {
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'notification',
        'mark_all_read',
        undefined,
        { targetUserId: userId, organizationId }
      )
      if (!permissionResult.success) {
        return failure(permissionResult.error)
      }
    }

    // Execute mark all as read
    const updateResult = await this.executeDbOperation(
      () => this.notificationRepository.markAllAsRead(userId, organizationId),
      'mark_all_notifications_read',
      { userId, organizationId }
    )

    if (updateResult.success) {
      await this.logActivity(
        'mark_all_notifications_read',
        'notification',
        undefined,
        { userId, organizationId }
      )
    }

    return updateResult
  }

  /**
   * Dismiss a notification
   */
  async dismissNotification(id: NotificationId): Promise<Result<Notification>> {
    return this.updateNotificationStatus(id, 'dismiss', (repo, notifId) => repo.dismiss(notifId))
  }

  /**
   * Archive a notification
   */
  async archiveNotification(id: NotificationId): Promise<Result<Notification>> {
    return this.updateNotificationStatus(id, 'archive', (repo, notifId) => repo.archive(notifId))
  }

  /**
   * Delete a notification permanently
   */
  async deleteNotification(id: NotificationId): Promise<Result<void>> {
    // Get current user for permission check
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    // Get notification first to verify ownership
    const notificationResult = await this.notificationRepository.findById(id)
    if (!notificationResult.success) {
      return failure(notificationResult.error)
    }

    // Check permissions
    if (notificationResult.data.user_id !== userResult.data.id) {
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'notification',
        'delete',
        id,
        { notificationUserId: notificationResult.data.user_id }
      )
      if (!permissionResult.success) {
        return failure(permissionResult.error)
      }
    }

    // Delete notification
    const deleteResult = await this.executeDbOperation(
      () => this.notificationRepository.delete(id),
      'delete_notification',
      { notificationId: id, userId: userResult.data.id }
    )

    if (deleteResult.success) {
      await this.logActivity(
        'delete_notification',
        'notification',
        id,
        { userId: userResult.data.id }
      )
    }

    return deleteResult
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Get notifications for a user with filtering and pagination
   */
  async getUserNotifications(
    userId: UserId,
    filters: NotificationFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<Notification>>> {
    // Validate filters
    const filterValidation = this.validateWithContext(
      filters,
      NotificationFiltersSchema,
      'notification filters',
      'filters'
    )
    if (!filterValidation.success) {
      return filterValidation
    }

    // Check permissions
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    if (userResult.data.id !== userId) {
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'notification',
        'read',
        undefined,
        { targetUserId: userId }
      )
      if (!permissionResult.success) {
        return failure(permissionResult.error)
      }
    }

    // Get notifications
    const notificationsResult = await this.executeDbOperation(
      () => this.notificationRepository.findByUserId(userId, filterValidation.data, options),
      'get_user_notifications',
      { userId, filters: filterValidation.data, options }
    )

    return notificationsResult
  }

  /**
   * Get a specific notification by ID
   */
  async getNotificationById(id: NotificationId): Promise<Result<Notification>> {
    const notificationResult = await this.executeDbOperation(
      () => this.notificationRepository.findById(id),
      'get_notification_by_id',
      { notificationId: id }
    )

    if (!notificationResult.success) {
      return notificationResult
    }

    // Check permissions
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    if (notificationResult.data.user_id !== userResult.data.id) {
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'notification',
        'read',
        id,
        { notificationUserId: notificationResult.data.user_id }
      )
      if (!permissionResult.success) {
        return failure(permissionResult.error)
      }
    }

    return notificationResult
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: UserId, organizationId?: OrganizationId): Promise<Result<NotificationStats>> {
    // Check permissions
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    if (userResult.data.id !== userId) {
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'notification',
        'read_stats',
        undefined,
        { targetUserId: userId, organizationId }
      )
      if (!permissionResult.success) {
        return failure(permissionResult.error)
      }
    }

    // Get stats
    return this.executeDbOperation(
      () => this.notificationRepository.getStats(userId, organizationId),
      'get_notification_stats',
      { userId, organizationId }
    )
  }

  // ============================================
  // ADVANCED FEATURES
  // ============================================

  /**
   * Schedule a notification for future delivery
   */
  async scheduleNotification(data: NotificationCreateData & { scheduled_for: Date }): Promise<Result<Notification>> {
    // Validate scheduled date is in the future
    if (data.scheduled_for <= new Date()) {
      return failure(RepositoryError.validation(
        'Scheduled date must be in the future',
        { scheduledFor: data.scheduled_for, currentTime: new Date() }
      ))
    }

    // Create notification with scheduled status
    return this.createNotification({
      ...data,
      status: 'scheduled' as any // Ensure this status exists in your database schema
    })
  }

  /**
   * Process scheduled notifications that are ready for delivery
   */
  async processScheduledNotifications(): Promise<Result<number>> {
    return this.executeDbOperation(
      () => this.notificationRepository.processScheduledNotifications(),
      'process_scheduled_notifications'
    )
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<Result<number>> {
    return this.executeDbOperation(
      () => this.notificationRepository.cleanupExpired(),
      'cleanup_expired_notifications'
    )
  }

  // ============================================
  // REAL-TIME FEATURES
  // ============================================

  /**
   * Subscribe to real-time notification updates for a user
   */
  async subscribeToUserNotifications(userId: UserId): Promise<Result<any>> {
    // Check permissions
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    if (userResult.data.id !== userId) {
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'notification',
        'subscribe',
        undefined,
        { targetUserId: userId }
      )
      if (!permissionResult.success) {
        return failure(permissionResult.error)
      }
    }

    try {
      const subscription = this.supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            // Handle real-time notification changes
            console.log('Notification change:', payload)
          }
        )
        .subscribe()

      await this.logActivity(
        'subscribe_notifications',
        'notification',
        undefined,
        { userId }
      )

      return success(subscription)
    } catch (error) {
      return this.handleError(error, 'subscribe_to_notifications', { userId })
    }
  }

  /**
   * Unsubscribe from notification updates
   */
  async unsubscribeFromNotifications(subscription: any): Promise<Result<void>> {
    try {
      await this.supabase.removeChannel(subscription)
      return success(undefined)
    } catch (error) {
      return this.handleError(error, 'unsubscribe_from_notifications')
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Helper method to update notification status with permission checks
   */
  private async updateNotificationStatus(
    id: NotificationId,
    action: string,
    updateFn: (repo: NotificationRepository, id: NotificationId) => Promise<Result<Notification>>
  ): Promise<Result<Notification>> {
    // Get current user for permission check
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    // Get notification first to verify ownership
    const notificationResult = await this.notificationRepository.findById(id)
    if (!notificationResult.success) {
      return notificationResult
    }

    // Check permissions
    if (notificationResult.data.user_id !== userResult.data.id) {
      return failure(RepositoryError.forbidden(
        action,
        'Cannot modify notifications belonging to other users'
      ))
    }

    // Execute update operation
    const updateResult = await this.executeDbOperation(
      () => updateFn(this.notificationRepository, id),
      `${action}_notification`,
      { notificationId: id, userId: userResult.data.id }
    )

    if (updateResult.success) {
      await this.logActivity(
        `${action}_notification`,
        'notification',
        id,
        { userId: userResult.data.id }
      )
    }

    return updateResult
  }
}

// ============================================
// SERVICE FACTORY
// ============================================

export function createNotificationService(supabase: SupabaseClient<Database>): EnhancedNotificationService {
  return new EnhancedNotificationService(supabase)
}

// Export the interface for dependency injection
export type { NotificationServiceInterface }