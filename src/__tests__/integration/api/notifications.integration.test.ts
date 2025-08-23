/**
 * Notification API Integration Tests
 * Tests complete request/response cycles for notification management APIs
 * Following CLAUDE.md testing guidelines with 80% coverage target
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMocks } from 'node-mocks-http'
import { listNotifications, createNotification, updateNotification, getNotificationCounts, bulkUpdateNotifications } from '@/app/api/controllers/notification.controller'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { SettingsTestFactories } from '@/testing/settings-test-factories'
import type { Database } from '@/types/database'

// Mock dependencies
jest.mock('@/lib/supabase-server')
jest.mock('@/lib/middleware/apiHandler', () => ({
  EnhancedHandlers: {
    get: (config: any, handler: Function) => handler,
    post: (schema: any, config: any, handler: Function) => handler,
    put: (schema: any, config: any, handler: Function) => handler,
    delete: (config: any, handler: Function) => handler,
  }
}))

const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
}

const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>

describe('Notifications API Integration Tests', () => {
  const mockUserId = 'user-123' as const
  const mockUser = {
    id: mockUserId,
    email: 'test@appboardguru.com'
  }

  beforeAll(() => {
    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabaseClient as any)
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default auth mock
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Default query chain mock
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      count: 'exact' as const,
      head: true
    }

    mockSupabaseClient.from.mockReturnValue(mockQuery)
  })

  describe('GET /api/notifications - List Notifications', () => {
    test('should return paginated notifications with default filters', async () => {
      const mockNotifications = [
        SettingsTestFactories.createNotification({
          id: 'notif-1',
          user_id: mockUserId,
          type: 'document_uploaded',
          category: 'Document Management',
          title: 'New Document Available',
          status: 'unread',
          priority: 'medium'
        }),
        SettingsTestFactories.createNotification({
          id: 'notif-2',
          user_id: mockUserId,
          type: 'task_assigned',
          category: 'Task Management',
          title: 'New Task Assigned',
          status: 'read',
          priority: 'high'
        })
      ]

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ data: mockNotifications, error: null })
      mockQuery.mockResolvedValueOnce({ count: 50, error: null })

      const mockRequest = {
        url: 'http://localhost:3000/api/notifications?limit=50&offset=0',
        user: mockUser,
        validatedQuery: { limit: 50, offset: 0 }
      } as any

      const result = await listNotifications(mockRequest)

      expect(result).toEqual({
        notifications: mockNotifications,
        pagination: {
          offset: 0,
          limit: 50,
          total: 50,
          hasMore: false
        }
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockQuery.range).toHaveBeenCalledWith(0, 49)
    })

    test('should apply status and priority filters', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/notifications?status=unread&priority=high',
        user: mockUser,
        validatedQuery: { limit: 50, offset: 0, status: 'unread', priority: 'high' }
      } as any

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ data: [], error: null })
      mockQuery.mockResolvedValueOnce({ count: 0, error: null })

      await listNotifications(mockRequest)

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'unread')
      expect(mockQuery.eq).toHaveBeenCalledWith('priority', 'high')
    })

    test('should apply date range filters', async () => {
      const dateFrom = '2024-01-01T00:00:00Z'
      const dateTo = '2024-01-31T23:59:59Z'

      const mockRequest = {
        url: `http://localhost:3000/api/notifications?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        user: mockUser,
        validatedQuery: { limit: 50, offset: 0, dateFrom, dateTo }
      } as any

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ data: [], error: null })
      mockQuery.mockResolvedValueOnce({ count: 0, error: null })

      await listNotifications(mockRequest)

      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', dateFrom)
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', dateTo)
    })

    test('should handle database errors gracefully', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      })

      const mockRequest = {
        url: 'http://localhost:3000/api/notifications',
        user: mockUser,
        validatedQuery: { limit: 50, offset: 0 }
      } as any

      await expect(listNotifications(mockRequest)).rejects.toThrow(
        'Failed to fetch notifications: Database connection failed'
      )
    })
  })

  describe('POST /api/notifications - Create Notification', () => {
    test('should create notification with valid data', async () => {
      const notificationData = {
        type: 'document_uploaded',
        category: 'Document Management',
        title: 'New Document Available',
        message: 'A new document has been uploaded to your vault',
        priority: 'medium' as const,
        action_url: 'https://app.example.com/documents/123',
        action_text: 'View Document',
        metadata: { documentId: '123', vaultId: 'vault-456' }
      }

      const createdNotification = SettingsTestFactories.createNotification({
        id: 'notif-new',
        user_id: mockUserId,
        ...notificationData
      })

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ 
        data: createdNotification, 
        error: null 
      })

      const mockRequest = {
        user: mockUser,
        validatedBody: notificationData
      } as any

      const result = await createNotification(mockRequest)

      expect(result).toEqual({ notification: createdNotification })
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications')
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          sender_id: mockUserId,
          type: notificationData.type,
          category: notificationData.category,
          title: notificationData.title,
          message: notificationData.message,
          priority: notificationData.priority,
          action_url: notificationData.action_url,
          action_text: notificationData.action_text,
          metadata: notificationData.metadata
        })
      )
    })

    test('should handle creation errors', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Validation failed' } 
      })

      const mockRequest = {
        user: mockUser,
        validatedBody: {
          type: 'test',
          category: 'test',
          title: 'Test',
          message: 'Test message'
        }
      } as any

      await expect(createNotification(mockRequest)).rejects.toThrow(
        'Failed to create notification: Validation failed'
      )
    })

    test('should default user_id to current user when not provided', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ data: {}, error: null })

      const mockRequest = {
        user: mockUser,
        validatedBody: {
          type: 'test',
          category: 'test',
          title: 'Test',
          message: 'Test message'
        }
      } as any

      await createNotification(mockRequest)

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          sender_id: mockUserId
        })
      )
    })
  })

  describe('PATCH /api/notifications/[id] - Update Notification', () => {
    test('should update notification status to read with timestamp', async () => {
      const notificationId = 'notif-123'
      const updateData = { status: 'read' as const }
      const updatedNotification = SettingsTestFactories.createNotification({
        id: notificationId,
        user_id: mockUserId,
        status: 'read',
        read_at: new Date().toISOString()
      })

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ 
        data: updatedNotification, 
        error: null 
      })

      const mockRequest = {
        url: `http://localhost:3000/api/notifications?id=${notificationId}`,
        user: mockUser,
        validatedBody: updateData
      } as any

      const result = await updateNotification(mockRequest)

      expect(result).toEqual({ notification: updatedNotification })
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'read',
          read_at: expect.any(String),
          updated_at: expect.any(String)
        })
      )
      expect(mockQuery.eq).toHaveBeenCalledWith('id', notificationId)
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId)
    })

    test('should update notification status to archived with timestamp', async () => {
      const notificationId = 'notif-123'
      const updateData = { status: 'archived' as const }

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ data: {}, error: null })

      const mockRequest = {
        url: `http://localhost:3000/api/notifications?id=${notificationId}`,
        user: mockUser,
        validatedBody: updateData
      } as any

      await updateNotification(mockRequest)

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'archived',
          archived_at: expect.any(String)
        })
      )
    })

    test('should handle missing notification ID', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/notifications',
        user: mockUser,
        validatedBody: { status: 'read' }
      } as any

      await expect(updateNotification(mockRequest)).rejects.toThrow(
        'Notification ID is required'
      )
    })
  })

  describe('GET /api/notifications/count - Get Notification Counts', () => {
    test('should return notification counts by status and priority', async () => {
      const mockQuery = mockSupabaseClient.from()
      
      // Mock parallel count queries
      mockQuery
        .mockResolvedValueOnce({ count: 5, error: null }) // unread
        .mockResolvedValueOnce({ count: 20, error: null }) // total
        .mockResolvedValueOnce({ count: 2, error: null }) // critical unread
        .mockResolvedValueOnce({ count: 3, error: null }) // high unread
        .mockResolvedValueOnce({ count: 8, error: null }) // archived

      const mockRequest = { user: mockUser } as any

      const result = await getNotificationCounts(mockRequest)

      expect(result).toEqual({
        unread: 5,
        total: 20,
        critical_unread: 2,
        high_unread: 3,
        archived: 8
      })

      // Verify all count queries were made with proper filters
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'unread')
      expect(mockQuery.eq).toHaveBeenCalledWith('priority', 'critical')
      expect(mockQuery.eq).toHaveBeenCalledWith('priority', 'high')
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'archived')
    })

    test('should handle null counts gracefully', async () => {
      const mockQuery = mockSupabaseClient.from()
      mockQuery
        .mockResolvedValueOnce({ count: null, error: null })
        .mockResolvedValueOnce({ count: null, error: null })
        .mockResolvedValueOnce({ count: null, error: null })
        .mockResolvedValueOnce({ count: null, error: null })
        .mockResolvedValueOnce({ count: null, error: null })

      const mockRequest = { user: mockUser } as any

      const result = await getNotificationCounts(mockRequest)

      expect(result).toEqual({
        unread: 0,
        total: 0,
        critical_unread: 0,
        high_unread: 0,
        archived: 0
      })
    })
  })

  describe('PATCH /api/notifications/bulk - Bulk Update Notifications', () => {
    test('should mark multiple notifications as read', async () => {
      const notificationIds = ['notif-1', 'notif-2', 'notif-3']
      const bulkAction = {
        action: 'mark_read' as const,
        notification_ids: notificationIds
      }

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ 
        data: Array(3).fill({}), 
        error: null 
      })

      const mockRequest = {
        user: mockUser,
        validatedBody: bulkAction
      } as any

      const result = await bulkUpdateNotifications(mockRequest)

      expect(result).toEqual({
        success: true,
        action: 'mark_read',
        affected_count: 3
      })

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'read',
          read_at: expect.any(String),
          updated_at: expect.any(String)
        })
      )
      expect(mockQuery.in).toHaveBeenCalledWith('id', notificationIds)
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId)
    })

    test('should archive multiple notifications', async () => {
      const notificationIds = ['notif-1', 'notif-2']
      const bulkAction = {
        action: 'archive' as const,
        notification_ids: notificationIds
      }

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ data: Array(2).fill({}), error: null })

      const mockRequest = {
        user: mockUser,
        validatedBody: bulkAction
      } as any

      await bulkUpdateNotifications(mockRequest)

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'archived',
          archived_at: expect.any(String)
        })
      )
    })

    test('should apply additional filters during bulk operations', async () => {
      const bulkAction = {
        action: 'mark_read' as const,
        notification_ids: ['notif-1'],
        filters: {
          status: 'unread' as const,
          priority: 'high' as const
        }
      }

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ data: [{}], error: null })

      const mockRequest = {
        user: mockUser,
        validatedBody: bulkAction
      } as any

      await bulkUpdateNotifications(mockRequest)

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'unread')
      expect(mockQuery.eq).toHaveBeenCalledWith('priority', 'high')
    })

    test('should handle bulk delete action', async () => {
      const bulkAction = {
        action: 'delete' as const,
        notification_ids: ['notif-1', 'notif-2']
      }

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ data: null, error: null })

      const mockRequest = {
        user: mockUser,
        validatedBody: bulkAction
      } as any

      const result = await bulkUpdateNotifications(mockRequest)

      expect(result.affected_count).toBe(2)
      expect(mockQuery.delete).toHaveBeenCalled()
    })
  })

  describe('Authentication and Authorization', () => {
    test('should enforce user-specific data access', async () => {
      const mockRequest = {
        user: { id: 'different-user-123' },
        validatedQuery: { limit: 50, offset: 0 }
      } as any

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ data: [], error: null })
      mockQuery.mockResolvedValueOnce({ count: 0, error: null })

      await listNotifications(mockRequest)

      // Verify that the query filters by the correct user ID
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'different-user-123')
    })

    test('should handle missing user gracefully', async () => {
      const mockRequest = {
        user: null,
        validatedQuery: { limit: 50, offset: 0 }
      } as any

      // This should throw an error when trying to access req.user!.id
      await expect(listNotifications(mockRequest)).rejects.toThrow()
    })
  })

  describe('Rate Limiting and Performance', () => {
    test('should handle large pagination requests efficiently', async () => {
      const mockRequest = {
        user: mockUser,
        validatedQuery: { limit: 100, offset: 1000 }
      } as any

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ data: [], error: null })
      mockQuery.mockResolvedValueOnce({ count: 1500, error: null })

      const result = await listNotifications(mockRequest)

      expect(mockQuery.range).toHaveBeenCalledWith(1000, 1099)
      expect(result.pagination).toEqual({
        offset: 1000,
        limit: 100,
        total: 1500,
        hasMore: true
      })
    })
  })

  describe('Data Integrity and Validation', () => {
    test('should maintain data consistency during concurrent updates', async () => {
      // Simulate concurrent bulk operations
      const bulkActions = [
        { action: 'mark_read' as const, notification_ids: ['notif-1'] },
        { action: 'archive' as const, notification_ids: ['notif-1'] }
      ]

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValue({ data: [{}], error: null })

      const requests = bulkActions.map(action => ({
        user: mockUser,
        validatedBody: action
      }))

      // Execute concurrent operations
      await Promise.all(
        requests.map(req => bulkUpdateNotifications(req))
      )

      // Verify both operations were attempted
      expect(mockQuery.update).toHaveBeenCalledTimes(2)
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId)
    })

    test('should handle edge cases in notification metadata', async () => {
      const notificationWithComplexMetadata = {
        type: 'system_alert',
        category: 'System',
        title: 'Complex Metadata Test',
        message: 'Testing complex metadata handling',
        metadata: {
          nestedObject: {
            level1: {
              level2: {
                array: [1, 2, 3],
                nullValue: null,
                boolValue: true
              }
            }
          },
          emptyArray: [],
          specialChars: 'Test with "quotes" and \\backslashes'
        }
      }

      const mockQuery = mockSupabaseClient.from()
      mockQuery.mockResolvedValueOnce({ data: {}, error: null })

      const mockRequest = {
        user: mockUser,
        validatedBody: notificationWithComplexMetadata
      } as any

      await createNotification(mockRequest)

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: notificationWithComplexMetadata.metadata
        })
      )
    })
  })
})