/**
 * @jest-environment jsdom
 */
import { NotificationController } from '@/lib/controllers/notification.controller'
import { EnhancedNotificationService } from '@/lib/services/notification.service.enhanced'
import { NextRequest } from 'next/server'
import { NotificationFactory } from '../../factories'
import { success, failure, RepositoryError } from '@/lib/repositories/result'
import { createUserId, createOrganizationId, createNotificationId } from '@/types/branded'

// Mock the service and Supabase
const mockNotificationService = {
  createNotification: jest.fn(),
  bulkCreateNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  dismissNotification: jest.fn(),
  archiveNotification: jest.fn(),
  deleteNotification: jest.fn(),
  getUserNotifications: jest.fn(),
  getNotificationById: jest.fn(),
  getNotificationStats: jest.fn(),
  scheduleNotification: jest.fn(),
  processScheduledNotifications: jest.fn(),
  cleanupExpiredNotifications: jest.fn(),
  subscribeToUserNotifications: jest.fn(),
  unsubscribeFromNotifications: jest.fn(),
} as jest.Mocked<EnhancedNotificationService>

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  }),
}))

describe('NotificationController', () => {
  let controller: NotificationController
  let testUser: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    controller = new NotificationController(mockNotificationService)
    testUser = { id: 'test-user-id' }
  })

  const createMockRequest = (url: string, method: string = 'GET', body?: any): NextRequest => {
    const request = new NextRequest(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return request
  }

  describe('getNotifications', () => {
    it('should get notifications with default pagination', async () => {
      const notifications = NotificationFactory.buildList('test-user-id', 3)
      const paginatedResult = {
        data: notifications,
        total: 3,
        limit: 50,
        offset: 0,
        page: 1,
        totalPages: 1,
      }

      mockNotificationService.getUserNotifications.mockResolvedValue(success(paginatedResult))

      const request = createMockRequest('http://localhost/api/notifications')
      const response = await controller.getNotifications(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(notifications)
      expect(responseData.pagination.total).toBe(3)
      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith(
        expect.any(String), // userId (branded type)
        {},
        { limit: 50, offset: 0 }
      )
    })

    it('should apply query filters correctly', async () => {
      const paginatedResult = {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        page: 1,
        totalPages: 0,
      }

      mockNotificationService.getUserNotifications.mockResolvedValue(success(paginatedResult))

      const request = createMockRequest(
        'http://localhost/api/notifications?limit=20&status=unread&type=info&priority=high'
      )
      const response = await controller.getNotifications(request)

      expect(response.status).toBe(200)
      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'unread',
          type: 'info',
          priority: 'high',
        }),
        { limit: 20, offset: 0 }
      )
    })

    it('should handle pagination with page parameter', async () => {
      const paginatedResult = {
        data: [],
        total: 100,
        limit: 25,
        offset: 50,
        page: 3,
        totalPages: 4,
      }

      mockNotificationService.getUserNotifications.mockResolvedValue(success(paginatedResult))

      const request = createMockRequest('http://localhost/api/notifications?page=3&limit=25')
      const response = await controller.getNotifications(request)

      expect(response.status).toBe(200)
      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith(
        expect.any(String),
        {},
        { limit: 25, offset: 50, page: 3 }
      )
    })

    it('should handle service errors', async () => {
      const serviceError = RepositoryError.database('Database error', null, 'findByUserId')
      mockNotificationService.getUserNotifications.mockResolvedValue(failure(serviceError))

      const request = createMockRequest('http://localhost/api/notifications')
      const response = await controller.getNotifications(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('DATABASE_ERROR')
    })

    it('should validate query parameters', async () => {
      const request = createMockRequest('http://localhost/api/notifications?limit=invalid')
      const response = await controller.getNotifications(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const notificationData = {
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium',
      }

      const createdNotification = NotificationFactory.build('test-user-id', notificationData)
      mockNotificationService.createNotification.mockResolvedValue(success(createdNotification))

      const request = createMockRequest('http://localhost/api/notifications', 'POST', notificationData)
      const response = await controller.createNotification(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(createdNotification)
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          category: 'system',
          title: 'Test Notification',
          message: 'This is a test notification',
          priority: 'medium',
        })
      )
    })

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required fields
        type: 'info',
      }

      const request = createMockRequest('http://localhost/api/notifications', 'POST', invalidData)
      const response = await controller.createNotification(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
      expect(mockNotificationService.createNotification).not.toHaveBeenCalled()
    })

    it('should validate URL format for action_url', async () => {
      const invalidData = {
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
        action_url: 'invalid-url',
      }

      const request = createMockRequest('http://localhost/api/notifications', 'POST', invalidData)
      const response = await controller.createNotification(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate color format', async () => {
      const invalidData = {
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
        color: 'invalid-color',
      }

      const request = createMockRequest('http://localhost/api/notifications', 'POST', invalidData)
      const response = await controller.createNotification(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle service errors', async () => {
      const notificationData = {
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
      }

      const serviceError = RepositoryError.database('Create failed', null, 'create')
      mockNotificationService.createNotification.mockResolvedValue(failure(serviceError))

      const request = createMockRequest('http://localhost/api/notifications', 'POST', notificationData)
      const response = await controller.createNotification(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('DATABASE_ERROR')
    })
  })

  describe('createBulkNotifications', () => {
    it('should create bulk notifications successfully', async () => {
      const bulkData = {
        user_ids: ['user-1', 'user-2'],
        notification_data: {
          type: 'info',
          category: 'system',
          title: 'Bulk Notification',
          message: 'This is a bulk notification',
        },
      }

      const createdNotifications = [
        NotificationFactory.build('user-1', bulkData.notification_data),
        NotificationFactory.build('user-2', bulkData.notification_data),
      ]
      mockNotificationService.bulkCreateNotifications.mockResolvedValue(success(createdNotifications))

      const request = createMockRequest('http://localhost/api/notifications/bulk', 'POST', bulkData)
      const response = await controller.createBulkNotifications(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(createdNotifications)
      expect(responseData.count).toBe(2)
    })

    it('should validate user IDs array', async () => {
      const invalidData = {
        user_ids: [], // Empty array
        notification_data: {
          type: 'info',
          category: 'system',
          title: 'Bulk Notification',
          message: 'This is a bulk notification',
        },
      }

      const request = createMockRequest('http://localhost/api/notifications/bulk', 'POST', invalidData)
      const response = await controller.createBulkNotifications(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate maximum user IDs limit', async () => {
      const invalidData = {
        user_ids: Array.from({ length: 1001 }, (_, i) => `user-${i}`), // Too many users
        notification_data: {
          type: 'info',
          category: 'system',
          title: 'Bulk Notification',
          message: 'This is a bulk notification',
        },
      }

      const request = createMockRequest('http://localhost/api/notifications/bulk', 'POST', invalidData)
      const response = await controller.createBulkNotifications(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('getNotificationById', () => {
    it('should get notification by ID', async () => {
      const notification = NotificationFactory.build('test-user-id', { id: 'notification-id' })
      mockNotificationService.getNotificationById.mockResolvedValue(success(notification))

      const response = await controller.getNotificationById(
        createMockRequest('http://localhost/api/notifications/notification-id'),
        { params: { id: 'notification-id' } }
      )
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(notification)
    })

    it('should validate notification ID format', async () => {
      const response = await controller.getNotificationById(
        createMockRequest('http://localhost/api/notifications/invalid-id'),
        { params: { id: 'invalid-id' } }
      )
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
      expect(mockNotificationService.getNotificationById).not.toHaveBeenCalled()
    })

    it('should handle notification not found', async () => {
      const notFoundError = RepositoryError.notFound('Notification')
      mockNotificationService.getNotificationById.mockResolvedValue(failure(notFoundError))

      const response = await controller.getNotificationById(
        createMockRequest('http://localhost/api/notifications/notification-id'),
        { params: { id: 'notification-id' } }
      )
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('NOT_FOUND')
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const readNotification = NotificationFactory.buildRead('test-user-id', { id: 'notification-id' })
      mockNotificationService.markAsRead.mockResolvedValue(success(readNotification))

      const response = await controller.markAsRead(
        createMockRequest('http://localhost/api/notifications/notification-id/read', 'PATCH'),
        { params: { id: 'notification-id' } }
      )
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(readNotification)
    })

    it('should validate notification ID format', async () => {
      const response = await controller.markAsRead(
        createMockRequest('http://localhost/api/notifications/invalid-id/read', 'PATCH'),
        { params: { id: 'invalid-id' } }
      )
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue(success(undefined))

      const response = await controller.markAllAsRead(
        createMockRequest('http://localhost/api/notifications/mark-all-read', 'PATCH')
      )
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('All notifications marked as read')
    })

    it('should mark organization notifications as read', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue(success(undefined))

      const response = await controller.markAllAsRead(
        createMockRequest('http://localhost/api/notifications/mark-all-read?organization_id=org-id', 'PATCH')
      )

      expect(response.status).toBe(200)
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith(
        expect.any(String), // userId
        expect.any(String)  // orgId
      )
    })

    it('should validate organization ID format', async () => {
      const response = await controller.markAllAsRead(
        createMockRequest('http://localhost/api/notifications/mark-all-read?organization_id=invalid-id', 'PATCH')
      )
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('dismissNotification', () => {
    it('should dismiss notification', async () => {
      const dismissedNotification = { ...NotificationFactory.build('test-user-id'), status: 'dismissed' }
      mockNotificationService.dismissNotification.mockResolvedValue(success(dismissedNotification))

      const response = await controller.dismissNotification(
        createMockRequest('http://localhost/api/notifications/notification-id/dismiss', 'PATCH'),
        { params: { id: 'notification-id' } }
      )
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(dismissedNotification)
    })
  })

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      mockNotificationService.deleteNotification.mockResolvedValue(success(undefined))

      const response = await controller.deleteNotification(
        createMockRequest('http://localhost/api/notifications/notification-id', 'DELETE'),
        { params: { id: 'notification-id' } }
      )
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('Notification deleted successfully')
    })
  })

  describe('getStats', () => {
    it('should get notification statistics', async () => {
      const stats = {
        total: 10,
        unread: 5,
        read: 5,
        byType: { info: 5, warning: 3, error: 2 },
        byPriority: { low: 3, medium: 5, high: 2 },
        recentActivity: { today: 2, thisWeek: 5, thisMonth: 10 },
      }

      mockNotificationService.getNotificationStats.mockResolvedValue(success(stats))

      const response = await controller.getStats(
        createMockRequest('http://localhost/api/notifications/stats')
      )
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(stats)
    })

    it('should get stats for specific organization', async () => {
      const stats = {
        total: 5,
        unread: 2,
        read: 3,
        byType: { info: 3, warning: 2 },
        byPriority: { medium: 3, high: 2 },
        recentActivity: { today: 1, thisWeek: 2, thisMonth: 5 },
      }

      mockNotificationService.getNotificationStats.mockResolvedValue(success(stats))

      const response = await controller.getStats(
        createMockRequest('http://localhost/api/notifications/stats?organization_id=org-id')
      )

      expect(response.status).toBe(200)
      expect(mockNotificationService.getNotificationStats).toHaveBeenCalledWith(
        expect.any(String), // userId
        expect.any(String)  // orgId
      )
    })
  })

  describe('error handling', () => {
    it('should handle unexpected errors', async () => {
      mockNotificationService.getUserNotifications.mockRejectedValue(new Error('Unexpected error'))

      const request = createMockRequest('http://localhost/api/notifications')
      const response = await controller.getNotifications(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('INTERNAL_ERROR')
      expect(responseData.error.message).toBe('An unexpected error occurred')
    })

    it('should map different error codes to appropriate HTTP status', async () => {
      const unauthorizedError = RepositoryError.unauthorized('Authentication required')
      mockNotificationService.getUserNotifications.mockResolvedValue(failure(unauthorizedError))

      const request = createMockRequest('http://localhost/api/notifications')
      const response = await controller.getNotifications(request)

      expect(response.status).toBe(401)

      const forbiddenError = RepositoryError.forbidden('action', 'Permission denied')
      mockNotificationService.getUserNotifications.mockResolvedValue(failure(forbiddenError))

      const response2 = await controller.getNotifications(request)
      expect(response2.status).toBe(403)
    })
  })
})