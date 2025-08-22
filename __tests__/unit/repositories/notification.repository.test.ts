/**
 * @jest-environment jsdom
 */
import { NotificationRepository } from '@/lib/repositories/notification.repository'
import { createSupabaseAdminClient } from '@/config/database.config'
import { testDb } from '../../../tests/utils/test-database'
import { NotificationFactory, UserFactory, OrganizationFactory } from '../../factories'
import { testAssertions, dbHelpers } from '../../utils/test-helpers'
import { createUserId, createOrganizationId, createNotificationId } from '@/types/branded'

// Mock Supabase client
jest.mock('@/config/database.config', () => ({
  createSupabaseAdminClient: jest.fn(),
}))

describe('NotificationRepository', () => {
  let notificationRepository: NotificationRepository
  let mockSupabase: any
  let testUser: any
  let testOrganization: any
  let testNotification: any

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    }

    ;(createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    notificationRepository = new NotificationRepository(mockSupabase)

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

    testNotification = NotificationFactory.build(testUser.id, {
      organization_id: testOrganization.id,
    })
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('should return notification when found', async () => {
      const notificationId = createNotificationId(testNotification.id).data!
      
      mockSupabase.single.mockResolvedValue({
        data: testNotification,
        error: null,
      })

      const result = await notificationRepository.findById(notificationId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(testNotification)
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', notificationId)
    })

    it('should return error when notification not found', async () => {
      const notificationId = createNotificationId('non-existent-id').data!
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })

      const result = await notificationRepository.findById(notificationId)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('NOT_FOUND')
    })

    it('should handle database errors', async () => {
      const notificationId = createNotificationId(testNotification.id).data!
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'CONNECTION_ERROR', message: 'Database connection failed' },
      })

      const result = await notificationRepository.findById(notificationId)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('findByUserId', () => {
    it('should return paginated notifications for user', async () => {
      const userId = createUserId(testUser.id).data!
      const notifications = NotificationFactory.buildList(testUser.id, 3)
      
      mockSupabase.mockResolvedValue({
        data: notifications,
        error: null,
        count: 3,
      })

      const result = await notificationRepository.findByUserId(userId, {}, { limit: 10, offset: 0 })

      expect(result.success).toBe(true)
      expect(result.data.data).toEqual(notifications)
      expect(result.data.total).toBe(3)
      expect(result.data.limit).toBe(10)
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId)
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should apply status filter correctly', async () => {
      const userId = createUserId(testUser.id).data!
      const notifications = [NotificationFactory.buildRead(testUser.id)]
      
      mockSupabase.mockResolvedValue({
        data: notifications,
        error: null,
        count: 1,
      })

      const result = await notificationRepository.findByUserId(userId, { status: 'read' })

      expect(result.success).toBe(true)
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'read')
    })

    it('should apply organization filter correctly', async () => {
      const userId = createUserId(testUser.id).data!
      const organizationId = createOrganizationId(testOrganization.id).data!
      const notifications = [NotificationFactory.build(testUser.id, { organization_id: testOrganization.id })]
      
      mockSupabase.mockResolvedValue({
        data: notifications,
        error: null,
        count: 1,
      })

      const result = await notificationRepository.findByUserId(userId, { organizationId })

      expect(result.success).toBe(true)
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', organizationId)
    })

    it('should apply date range filters correctly', async () => {
      const userId = createUserId(testUser.id).data!
      const dateFrom = new Date('2024-01-01')
      const dateTo = new Date('2024-12-31')
      
      mockSupabase.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      })

      await notificationRepository.findByUserId(userId, { dateFrom, dateTo })

      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', dateFrom.toISOString())
      expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', dateTo.toISOString())
    })
  })

  describe('create', () => {
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

      mockSupabase.single.mockResolvedValue({
        data: { ...notificationData, id: 'new-notification-id' },
        error: null,
      })

      const result = await notificationRepository.create(notificationData)

      expect(result.success).toBe(true)
      expect(result.data.title).toBe('Test Notification')
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
      expect(mockSupabase.insert).toHaveBeenCalled()
      expect(mockSupabase.select).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required fields
        user_id: createUserId(testUser.id).data!,
      } as any

      const result = await notificationRepository.create(invalidData)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('VALIDATION_FAILED')
    })

    it('should handle database errors on create', async () => {
      const notificationData = {
        user_id: createUserId(testUser.id).data!,
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
      }

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Unique constraint violation' },
      })

      const result = await notificationRepository.create(notificationData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('bulkCreate', () => {
    it('should create multiple notifications successfully', async () => {
      const notifications = [
        {
          user_id: createUserId(testUser.id).data!,
          type: 'info',
          category: 'system',
          title: 'Notification 1',
          message: 'Message 1',
        },
        {
          user_id: createUserId(testUser.id).data!,
          type: 'warning',
          category: 'system',
          title: 'Notification 2',
          message: 'Message 2',
        },
      ]

      const createdNotifications = notifications.map((n, i) => ({ ...n, id: `bulk-${i}` }))

      mockSupabase.mockResolvedValue({
        data: createdNotifications,
        error: null,
      })

      const result = await notificationRepository.bulkCreate(notifications)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Notification 1' }),
          expect.objectContaining({ title: 'Notification 2' }),
        ])
      )
    })

    it('should handle empty array', async () => {
      const result = await notificationRepository.bulkCreate([])

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
      expect(mockSupabase.insert).not.toHaveBeenCalled()
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = createNotificationId(testNotification.id).data!
      const readNotification = { ...testNotification, status: 'read', read_at: new Date().toISOString() }

      mockSupabase.single.mockResolvedValue({
        data: readNotification,
        error: null,
      })

      const result = await notificationRepository.markAsRead(notificationId)

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('read')
      expect(result.data.read_at).toBeDefined()
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'read',
          read_at: expect.any(String),
          updated_at: expect.any(String),
        })
      )
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      const userId = createUserId(testUser.id).data!

      mockSupabase.mockResolvedValue({
        error: null,
      })

      const result = await notificationRepository.markAllAsRead(userId)

      expect(result.success).toBe(true)
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'read',
          read_at: expect.any(String),
          updated_at: expect.any(String),
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId)
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'unread')
    })

    it('should mark all organization notifications as read', async () => {
      const userId = createUserId(testUser.id).data!
      const organizationId = createOrganizationId(testOrganization.id).data!

      mockSupabase.mockResolvedValue({
        error: null,
      })

      const result = await notificationRepository.markAllAsRead(userId, organizationId)

      expect(result.success).toBe(true)
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', organizationId)
    })
  })

  describe('dismiss', () => {
    it('should dismiss notification', async () => {
      const notificationId = createNotificationId(testNotification.id).data!
      const dismissedNotification = { 
        ...testNotification, 
        status: 'dismissed', 
        dismissed_at: new Date().toISOString() 
      }

      mockSupabase.single.mockResolvedValue({
        data: dismissedNotification,
        error: null,
      })

      const result = await notificationRepository.dismiss(notificationId)

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('dismissed')
      expect(result.data.dismissed_at).toBeDefined()
    })
  })

  describe('archive', () => {
    it('should archive notification', async () => {
      const notificationId = createNotificationId(testNotification.id).data!
      const archivedNotification = { 
        ...testNotification, 
        status: 'archived', 
        archived_at: new Date().toISOString() 
      }

      mockSupabase.single.mockResolvedValue({
        data: archivedNotification,
        error: null,
      })

      const result = await notificationRepository.archive(notificationId)

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('archived')
      expect(result.data.archived_at).toBeDefined()
    })
  })

  describe('delete', () => {
    it('should delete notification', async () => {
      const notificationId = createNotificationId(testNotification.id).data!

      mockSupabase.mockResolvedValue({
        error: null,
      })

      const result = await notificationRepository.delete(notificationId)

      expect(result.success).toBe(true)
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', notificationId)
    })

    it('should handle delete errors', async () => {
      const notificationId = createNotificationId(testNotification.id).data!

      mockSupabase.mockResolvedValue({
        error: { code: 'DELETE_ERROR', message: 'Failed to delete' },
      })

      const result = await notificationRepository.delete(notificationId)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('bulkDelete', () => {
    it('should delete multiple notifications', async () => {
      const ids = [
        createNotificationId('id-1').data!,
        createNotificationId('id-2').data!,
      ]

      mockSupabase.mockResolvedValue({
        error: null,
      })

      const result = await notificationRepository.bulkDelete(ids)

      expect(result.success).toBe(true)
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.in).toHaveBeenCalledWith('id', ids)
    })
  })

  describe('getStats', () => {
    it('should return notification statistics', async () => {
      const userId = createUserId(testUser.id).data!
      const notifications = [
        NotificationFactory.build(testUser.id, { status: 'unread', type: 'info', priority: 'high' }),
        NotificationFactory.buildRead(testUser.id, { type: 'warning', priority: 'medium' }),
        NotificationFactory.build(testUser.id, { status: 'unread', type: 'info', priority: 'low' }),
      ]

      mockSupabase.mockResolvedValue({
        data: notifications,
        error: null,
        count: 3,
      })

      const result = await notificationRepository.getStats(userId)

      expect(result.success).toBe(true)
      expect(result.data.total).toBe(3)
      expect(result.data.unread).toBe(2)
      expect(result.data.read).toBe(1)
      expect(result.data.byType.info).toBe(2)
      expect(result.data.byType.warning).toBe(1)
      expect(result.data.byPriority.high).toBe(1)
      expect(result.data.byPriority.medium).toBe(1)
      expect(result.data.byPriority.low).toBe(1)
    })

    it('should calculate recent activity correctly', async () => {
      const userId = createUserId(testUser.id).data!
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const notifications = [
        NotificationFactory.build(testUser.id, { created_at: today.toISOString() }),
        NotificationFactory.build(testUser.id, { created_at: thisWeek.toISOString() }),
        NotificationFactory.build(testUser.id, { created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() }),
      ]

      mockSupabase.mockResolvedValue({
        data: notifications,
        error: null,
        count: 3,
      })

      const result = await notificationRepository.getStats(userId)

      expect(result.success).toBe(true)
      expect(result.data.recentActivity.today).toBe(1)
      expect(result.data.recentActivity.thisWeek).toBe(2)
      expect(result.data.recentActivity.thisMonth).toBe(3)
    })
  })

  describe('findExpiredNotifications', () => {
    it('should find expired notifications', async () => {
      const expiredNotifications = [
        NotificationFactory.build(testUser.id, { 
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'unread'
        }),
      ]

      mockSupabase.mockResolvedValue({
        data: expiredNotifications,
        error: null,
      })

      const result = await notificationRepository.findExpiredNotifications()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(expiredNotifications)
      expect(mockSupabase.not).toHaveBeenCalledWith('expires_at', 'is', null)
      expect(mockSupabase.lte).toHaveBeenCalledWith('expires_at', expect.any(String))
      expect(mockSupabase.neq).toHaveBeenCalledWith('status', 'archived')
    })
  })

  describe('cleanupExpired', () => {
    it('should cleanup expired notifications', async () => {
      const expiredNotifications = [
        { id: 'expired-1', ...NotificationFactory.build(testUser.id) },
        { id: 'expired-2', ...NotificationFactory.build(testUser.id) },
      ]

      // Mock findExpiredNotifications
      mockSupabase.mockResolvedValueOnce({
        data: expiredNotifications,
        error: null,
      })

      // Mock bulkDelete
      mockSupabase.mockResolvedValueOnce({
        error: null,
      })

      const result = await notificationRepository.cleanupExpired()

      expect(result.success).toBe(true)
      expect(result.data).toBe(2) // Number of cleaned up notifications
    })

    it('should return 0 when no expired notifications', async () => {
      mockSupabase.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await notificationRepository.cleanupExpired()

      expect(result.success).toBe(true)
      expect(result.data).toBe(0)
    })
  })

  describe('processScheduledNotifications', () => {
    it('should process scheduled notifications', async () => {
      const scheduledNotifications = [
        { id: 'scheduled-1', ...NotificationFactory.build(testUser.id) },
        { id: 'scheduled-2', ...NotificationFactory.build(testUser.id) },
      ]

      // Mock findScheduledNotifications
      mockSupabase.mockResolvedValueOnce({
        data: scheduledNotifications,
        error: null,
      })

      // Mock update
      mockSupabase.mockResolvedValueOnce({
        error: null,
      })

      const result = await notificationRepository.processScheduledNotifications()

      expect(result.success).toBe(true)
      expect(result.data).toBe(2) // Number of processed notifications
    })
  })
})