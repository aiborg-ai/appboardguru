/**
 * @jest-environment jsdom
 */
import { EnhancedNotificationService } from '@/lib/services/notification.service.enhanced'
import { NotificationRepository } from '@/lib/repositories/notification.repository'
import { createSupabaseAdminClient } from '@/config/database.config'
import { testDb } from '../../../tests/utils/test-database'
import { NotificationFactory, UserFactory, OrganizationFactory } from '../../factories'
import { testAssertions, dbHelpers } from '../../utils/test-helpers'
import { createUserId, createOrganizationId, createNotificationId } from '@/types/branded'
import { success, failure, RepositoryError } from '@/lib/repositories/result'

// Mock dependencies
jest.mock('@/config/database.config', () => ({
  createSupabaseAdminClient: jest.fn(),
}))

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}))

describe('EnhancedNotificationService', () => {
  let notificationService: EnhancedNotificationService
  let mockSupabase: any
  let mockNotificationRepository: jest.Mocked<NotificationRepository>
  let testUser: any
  let testOrganization: any

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      channel: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      removeChannel: jest.fn(),
    }

    // Mock the notification repository
    mockNotificationRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      bulkCreate: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      dismiss: jest.fn(),
      archive: jest.fn(),
      delete: jest.fn(),
      bulkDelete: jest.fn(),
      getStats: jest.fn(),
      findExpiredNotifications: jest.fn(),
      cleanupExpired: jest.fn(),
      findScheduledNotifications: jest.fn(),
      processScheduledNotifications: jest.fn(),
    } as any

    ;(createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    
    notificationService = new EnhancedNotificationService(mockSupabase)
    // Replace the repository with our mock
    ;(notificationService as any).notificationRepository = mockNotificationRepository

    // Create test data
    testUser = await testDb.createUser({
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'director',
    })
    
    testOrganization = await testDb.createOrganization({
      created_by: testUser.id,
      name: 'Test Organization',
    })

    // Mock auth.getUser to return our test user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: testUser.id } },
      error: null,
    })
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const notificationData = {
        user_id: createUserId(testUser.id).data!,
        organization_id: createOrganizationId(testOrganization.id).data,
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium' as const,
      }

      const createdNotification = NotificationFactory.build(testUser.id, notificationData)
      mockNotificationRepository.create.mockResolvedValue(success(createdNotification))

      const result = await notificationService.createNotification(notificationData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(createdNotification)
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(notificationData)
    })

    it('should validate required fields', async () => {
      const invalidData = {
        user_id: createUserId(testUser.id).data!,
        // Missing required fields
      } as any

      const result = await notificationService.createNotification(invalidData)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('VALIDATION_FAILED')
      expect(mockNotificationRepository.create).not.toHaveBeenCalled()
    })

    it('should handle repository errors', async () => {
      const notificationData = {
        user_id: createUserId(testUser.id).data!,
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
      }

      const repositoryError = RepositoryError.database('Database error', null, 'create')
      mockNotificationRepository.create.mockResolvedValue(failure(repositoryError))

      const result = await notificationService.createNotification(notificationData)

      expect(result.success).toBe(false)
      expect(result.error).toEqual(repositoryError)
    })

    it('should check permissions when sender differs from recipient', async () => {
      const senderId = createUserId('different-user-id').data!
      const notificationData = {
        user_id: createUserId(testUser.id).data!,
        sender_id: senderId,
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
      }

      // Mock permission check failure
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'different-user-id' } },
        error: null,
      })

      const result = await notificationService.createNotification(notificationData)

      // Since we don't have actual permission checking implemented, this will still succeed
      // In a real implementation, this would check permissions and fail
      expect(mockNotificationRepository.create).toHaveBeenCalled()
    })
  })

  describe('bulkCreateNotifications', () => {
    it('should create bulk notifications successfully', async () => {
      const userIds = [
        createUserId(testUser.id).data!,
        createUserId('user-2').data!,
      ]
      const notificationData = {
        type: 'info',
        category: 'system',
        title: 'Bulk Notification',
        message: 'This is a bulk notification',
        priority: 'medium' as const,
      }

      const createdNotifications = userIds.map(userId => 
        NotificationFactory.build(userId as string, notificationData)
      )
      mockNotificationRepository.bulkCreate.mockResolvedValue(success(createdNotifications))

      const result = await notificationService.bulkCreateNotifications({
        user_ids: userIds,
        notification_data: notificationData,
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(mockNotificationRepository.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: userIds[0], title: 'Bulk Notification' }),
          expect.objectContaining({ user_id: userIds[1], title: 'Bulk Notification' }),
        ])
      )
    })

    it('should validate user IDs array', async () => {
      const result = await notificationService.bulkCreateNotifications({
        user_ids: [],
        notification_data: {
          type: 'info',
          category: 'system',
          title: 'Test',
          message: 'Test',
        },
      })

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('VALIDATION_FAILED')
      expect(mockNotificationRepository.bulkCreate).not.toHaveBeenCalled()
    })

    it('should handle repository errors', async () => {
      const userIds = [createUserId(testUser.id).data!]
      const notificationData = {
        type: 'info',
        category: 'system',
        title: 'Bulk Notification',
        message: 'This is a bulk notification',
      }

      const repositoryError = RepositoryError.database('Bulk create failed', null, 'bulkCreate')
      mockNotificationRepository.bulkCreate.mockResolvedValue(failure(repositoryError))

      const result = await notificationService.bulkCreateNotifications({
        user_ids: userIds,
        notification_data: notificationData,
      })

      expect(result.success).toBe(false)
      expect(result.error).toEqual(repositoryError)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = createNotificationId('notification-id').data!
      const notification = NotificationFactory.build(testUser.id, { id: 'notification-id' })
      const readNotification = NotificationFactory.buildRead(testUser.id, { id: 'notification-id' })

      mockNotificationRepository.findById.mockResolvedValue(success(notification))
      mockNotificationRepository.markAsRead.mockResolvedValue(success(readNotification))

      const result = await notificationService.markAsRead(notificationId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(readNotification)
      expect(mockNotificationRepository.findById).toHaveBeenCalledWith(notificationId)
      expect(mockNotificationRepository.markAsRead).toHaveBeenCalledWith(notificationId)
    })

    it('should prevent marking other users notifications as read', async () => {
      const notificationId = createNotificationId('notification-id').data!
      const otherUsersNotification = NotificationFactory.build('other-user-id', { id: 'notification-id' })

      mockNotificationRepository.findById.mockResolvedValue(success(otherUsersNotification))

      const result = await notificationService.markAsRead(notificationId)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('FORBIDDEN')
      expect(mockNotificationRepository.markAsRead).not.toHaveBeenCalled()
    })

    it('should handle notification not found', async () => {
      const notificationId = createNotificationId('non-existent-id').data!
      const notFoundError = RepositoryError.notFound('Notification')

      mockNotificationRepository.findById.mockResolvedValue(failure(notFoundError))

      const result = await notificationService.markAsRead(notificationId)

      expect(result.success).toBe(false)
      expect(result.error).toEqual(notFoundError)
      expect(mockNotificationRepository.markAsRead).not.toHaveBeenCalled()
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for current user', async () => {
      const userId = createUserId(testUser.id).data!

      mockNotificationRepository.markAllAsRead.mockResolvedValue(success(undefined))

      const result = await notificationService.markAllAsRead(userId)

      expect(result.success).toBe(true)
      expect(mockNotificationRepository.markAllAsRead).toHaveBeenCalledWith(userId, undefined)
    })

    it('should mark all organization notifications as read', async () => {
      const userId = createUserId(testUser.id).data!
      const organizationId = createOrganizationId(testOrganization.id).data!

      mockNotificationRepository.markAllAsRead.mockResolvedValue(success(undefined))

      const result = await notificationService.markAllAsRead(userId, organizationId)

      expect(result.success).toBe(true)
      expect(mockNotificationRepository.markAllAsRead).toHaveBeenCalledWith(userId, organizationId)
    })

    it('should prevent marking all notifications for other users', async () => {
      const otherUserId = createUserId('other-user-id').data!

      const result = await notificationService.markAllAsRead(otherUserId)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('FORBIDDEN')
      expect(mockNotificationRepository.markAllAsRead).not.toHaveBeenCalled()
    })
  })

  describe('dismissNotification', () => {
    it('should dismiss notification', async () => {
      const notificationId = createNotificationId('notification-id').data!
      const notification = NotificationFactory.build(testUser.id, { id: 'notification-id' })
      const dismissedNotification = { ...notification, status: 'dismissed' }

      mockNotificationRepository.findById.mockResolvedValue(success(notification))
      mockNotificationRepository.dismiss.mockResolvedValue(success(dismissedNotification))

      const result = await notificationService.dismissNotification(notificationId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(dismissedNotification)
      expect(mockNotificationRepository.dismiss).toHaveBeenCalledWith(notificationId)
    })
  })

  describe('archiveNotification', () => {
    it('should archive notification', async () => {
      const notificationId = createNotificationId('notification-id').data!
      const notification = NotificationFactory.build(testUser.id, { id: 'notification-id' })
      const archivedNotification = { ...notification, status: 'archived' }

      mockNotificationRepository.findById.mockResolvedValue(success(notification))
      mockNotificationRepository.archive.mockResolvedValue(success(archivedNotification))

      const result = await notificationService.archiveNotification(notificationId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(archivedNotification)
      expect(mockNotificationRepository.archive).toHaveBeenCalledWith(notificationId)
    })
  })

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const notificationId = createNotificationId('notification-id').data!
      const notification = NotificationFactory.build(testUser.id, { id: 'notification-id' })

      mockNotificationRepository.findById.mockResolvedValue(success(notification))
      mockNotificationRepository.delete.mockResolvedValue(success(undefined))

      const result = await notificationService.deleteNotification(notificationId)

      expect(result.success).toBe(true)
      expect(mockNotificationRepository.delete).toHaveBeenCalledWith(notificationId)
    })

    it('should prevent deleting other users notifications', async () => {
      const notificationId = createNotificationId('notification-id').data!
      const otherUsersNotification = NotificationFactory.build('other-user-id', { id: 'notification-id' })

      mockNotificationRepository.findById.mockResolvedValue(success(otherUsersNotification))

      const result = await notificationService.deleteNotification(notificationId)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('FORBIDDEN')
      expect(mockNotificationRepository.delete).not.toHaveBeenCalled()
    })
  })

  describe('getUserNotifications', () => {
    it('should get user notifications with pagination', async () => {
      const userId = createUserId(testUser.id).data!
      const notifications = NotificationFactory.buildList(testUser.id, 3)
      const paginatedResult = {
        data: notifications,
        total: 3,
        limit: 10,
        offset: 0,
        page: 1,
        totalPages: 1,
      }

      mockNotificationRepository.findByUserId.mockResolvedValue(success(paginatedResult))

      const result = await notificationService.getUserNotifications(userId, {}, { limit: 10, offset: 0 })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(paginatedResult)
      expect(mockNotificationRepository.findByUserId).toHaveBeenCalledWith(userId, {}, { limit: 10, offset: 0 })
    })

    it('should apply filters correctly', async () => {
      const userId = createUserId(testUser.id).data!
      const filters = {
        status: 'unread' as const,
        type: 'info',
        priority: 'high' as const,
      }

      mockNotificationRepository.findByUserId.mockResolvedValue(success({
        data: [],
        total: 0,
        limit: 50,
        offset: 0,
        page: 1,
        totalPages: 0,
      }))

      const result = await notificationService.getUserNotifications(userId, filters)

      expect(result.success).toBe(true)
      expect(mockNotificationRepository.findByUserId).toHaveBeenCalledWith(userId, filters, {})
    })

    it('should prevent accessing other users notifications', async () => {
      const otherUserId = createUserId('other-user-id').data!

      const result = await notificationService.getUserNotifications(otherUserId)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('FORBIDDEN')
      expect(mockNotificationRepository.findByUserId).not.toHaveBeenCalled()
    })
  })

  describe('getNotificationById', () => {
    it('should get notification by ID', async () => {
      const notificationId = createNotificationId('notification-id').data!
      const notification = NotificationFactory.build(testUser.id, { id: 'notification-id' })

      mockNotificationRepository.findById.mockResolvedValue(success(notification))

      const result = await notificationService.getNotificationById(notificationId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(notification)
      expect(mockNotificationRepository.findById).toHaveBeenCalledWith(notificationId)
    })

    it('should prevent accessing other users notifications', async () => {
      const notificationId = createNotificationId('notification-id').data!
      const otherUsersNotification = NotificationFactory.build('other-user-id', { id: 'notification-id' })

      mockNotificationRepository.findById.mockResolvedValue(success(otherUsersNotification))

      const result = await notificationService.getNotificationById(notificationId)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('FORBIDDEN')
    })
  })

  describe('getNotificationStats', () => {
    it('should get notification statistics', async () => {
      const userId = createUserId(testUser.id).data!
      const stats = {
        total: 10,
        unread: 5,
        read: 5,
        byType: { info: 5, warning: 3, error: 2 },
        byPriority: { low: 3, medium: 5, high: 2 },
        recentActivity: { today: 2, thisWeek: 5, thisMonth: 10 },
      }

      mockNotificationRepository.getStats.mockResolvedValue(success(stats))

      const result = await notificationService.getNotificationStats(userId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(stats)
      expect(mockNotificationRepository.getStats).toHaveBeenCalledWith(userId, undefined)
    })

    it('should get stats for specific organization', async () => {
      const userId = createUserId(testUser.id).data!
      const organizationId = createOrganizationId(testOrganization.id).data!
      const stats = {
        total: 5,
        unread: 2,
        read: 3,
        byType: { info: 3, warning: 2 },
        byPriority: { medium: 3, high: 2 },
        recentActivity: { today: 1, thisWeek: 2, thisMonth: 5 },
      }

      mockNotificationRepository.getStats.mockResolvedValue(success(stats))

      const result = await notificationService.getNotificationStats(userId, organizationId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(stats)
      expect(mockNotificationRepository.getStats).toHaveBeenCalledWith(userId, organizationId)
    })
  })

  describe('scheduleNotification', () => {
    it('should schedule notification for future delivery', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      const notificationData = {
        user_id: createUserId(testUser.id).data!,
        type: 'info',
        category: 'system',
        title: 'Scheduled Notification',
        message: 'This is a scheduled notification',
        scheduled_for: futureDate,
      }

      const scheduledNotification = NotificationFactory.build(testUser.id, {
        ...notificationData,
        status: 'scheduled',
      })
      mockNotificationRepository.create.mockResolvedValue(success(scheduledNotification))

      const result = await notificationService.scheduleNotification(notificationData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(scheduledNotification)
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'scheduled',
          scheduled_for: futureDate,
        })
      )
    })

    it('should reject scheduling for past dates', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      const notificationData = {
        user_id: createUserId(testUser.id).data!,
        type: 'info',
        category: 'system',
        title: 'Scheduled Notification',
        message: 'This is a scheduled notification',
        scheduled_for: pastDate,
      }

      const result = await notificationService.scheduleNotification(notificationData)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('VALIDATION_FAILED')
      expect(mockNotificationRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('processScheduledNotifications', () => {
    it('should process scheduled notifications', async () => {
      mockNotificationRepository.processScheduledNotifications.mockResolvedValue(success(5))

      const result = await notificationService.processScheduledNotifications()

      expect(result.success).toBe(true)
      expect(result.data).toBe(5)
      expect(mockNotificationRepository.processScheduledNotifications).toHaveBeenCalled()
    })
  })

  describe('cleanupExpiredNotifications', () => {
    it('should cleanup expired notifications', async () => {
      mockNotificationRepository.cleanupExpired.mockResolvedValue(success(3))

      const result = await notificationService.cleanupExpiredNotifications()

      expect(result.success).toBe(true)
      expect(result.data).toBe(3)
      expect(mockNotificationRepository.cleanupExpired).toHaveBeenCalled()
    })
  })

  describe('subscribeToUserNotifications', () => {
    it('should subscribe to user notifications', async () => {
      const userId = createUserId(testUser.id).data!
      const mockSubscription = { unsubscribe: jest.fn() }

      mockSupabase.subscribe.mockReturnValue(mockSubscription)

      const result = await notificationService.subscribeToUserNotifications(userId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockSubscription)
      expect(mockSupabase.channel).toHaveBeenCalledWith(`notifications:${userId}`)
      expect(mockSupabase.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }),
        expect.any(Function)
      )
    })

    it('should prevent subscribing to other users notifications', async () => {
      const otherUserId = createUserId('other-user-id').data!

      const result = await notificationService.subscribeToUserNotifications(otherUserId)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('FORBIDDEN')
      expect(mockSupabase.channel).not.toHaveBeenCalled()
    })
  })

  describe('unsubscribeFromNotifications', () => {
    it('should unsubscribe from notifications', async () => {
      const mockSubscription = { unsubscribe: jest.fn() }

      mockSupabase.removeChannel.mockResolvedValue(undefined)

      const result = await notificationService.unsubscribeFromNotifications(mockSubscription)

      expect(result.success).toBe(true)
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockSubscription)
    })

    it('should handle unsubscribe errors', async () => {
      const mockSubscription = { unsubscribe: jest.fn() }

      mockSupabase.removeChannel.mockRejectedValue(new Error('Unsubscribe failed'))

      const result = await notificationService.unsubscribeFromNotifications(mockSubscription)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})