/**
 * @jest-environment jsdom
 */
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/notifications/route'
import { GET as getById, PATCH, DELETE } from '@/app/api/notifications/[id]/route'
import { POST as bulkCreate } from '@/app/api/notifications/bulk/route'
import { GET as getStats } from '@/app/api/notifications/stats/route'
import { testDb } from '../../utils/test-database'
import { NotificationFactory, UserFactory, OrganizationFactory } from '../../factories'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn(),
  channel: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(),
}

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn().mockResolvedValue(mockSupabase),
}))

describe('Notifications API Integration Tests', () => {
  let testUser: any
  let testOrganization: any

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    jest.clearAllMocks()

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

    // Mock authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: testUser.id } },
      error: null,
    })
  })

  const createMockRequest = (url: string, method: string = 'GET', body?: any): NextRequest => {
    return new NextRequest(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  describe('GET /api/notifications', () => {
    it('should get user notifications successfully', async () => {
      const notifications = NotificationFactory.buildList(testUser.id, 3)
      
      mockSupabase.mockResolvedValue({
        data: notifications,
        error: null,
        count: 3,
      })

      const request = createMockRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toHaveLength(3)
      expect(responseData.pagination).toBeDefined()
      expect(responseData.pagination.total).toBe(3)
    })

    it('should apply query filters', async () => {
      const notifications = [NotificationFactory.buildRead(testUser.id)]
      
      mockSupabase.mockResolvedValue({
        data: notifications,
        error: null,
        count: 1,
      })

      const request = createMockRequest('http://localhost/api/notifications?status=read&limit=10')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.pagination.limit).toBe(10)
    })

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Authentication required' },
      })

      const request = createMockRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.success).toBe(false)
    })

    it('should handle database errors', async () => {
      mockSupabase.mockResolvedValue({
        data: null,
        error: { code: 'CONNECTION_ERROR', message: 'Database connection failed' },
        count: null,
      })

      const request = createMockRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
    })
  })

  describe('POST /api/notifications', () => {
    it('should create notification successfully', async () => {
      const notificationData = {
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium',
      }

      const createdNotification = NotificationFactory.build(testUser.id, {
        ...notificationData,
        id: 'new-notification-id',
      })

      mockSupabase.single.mockResolvedValue({
        data: createdNotification,
        error: null,
      })

      const request = createMockRequest('http://localhost/api/notifications', 'POST', notificationData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.success).toBe(true)
      expect(responseData.data.title).toBe('Test Notification')
    })

    it('should validate required fields', async () => {
      const invalidData = {
        type: 'info',
        // Missing required fields
      }

      const request = createMockRequest('http://localhost/api/notifications', 'POST', invalidData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle database creation errors', async () => {
      const notificationData = {
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification',
      }

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Unique constraint violation' },
      })

      const request = createMockRequest('http://localhost/api/notifications', 'POST', notificationData)
      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
    })
  })

  describe('GET /api/notifications/[id]', () => {
    it('should get notification by ID', async () => {
      const notification = NotificationFactory.build(testUser.id, { id: 'notification-id' })
      
      mockSupabase.single.mockResolvedValue({
        data: notification,
        error: null,
      })

      const request = createMockRequest('http://localhost/api/notifications/notification-id')
      const response = await getById(request, {
        params: Promise.resolve({ id: 'notification-id' })
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(notification)
    })

    it('should handle notification not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })

      const request = createMockRequest('http://localhost/api/notifications/non-existent-id')
      const response = await getById(request, {
        params: Promise.resolve({ id: 'non-existent-id' })
      })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
    })
  })

  describe('PATCH /api/notifications/[id]', () => {
    it('should mark notification as read', async () => {
      const notification = NotificationFactory.build(testUser.id, { id: 'notification-id' })
      const readNotification = NotificationFactory.buildRead(testUser.id, { id: 'notification-id' })

      // Mock findById first
      mockSupabase.single.mockResolvedValueOnce({
        data: notification,
        error: null,
      })

      // Mock markAsRead
      mockSupabase.single.mockResolvedValueOnce({
        data: readNotification,
        error: null,
      })

      const request = createMockRequest(
        'http://localhost/api/notifications/notification-id',
        'PATCH',
        { status: 'read' }
      )
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'notification-id' })
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.status).toBe('read')
    })

    it('should dismiss notification', async () => {
      const notification = NotificationFactory.build(testUser.id, { id: 'notification-id' })
      const dismissedNotification = { ...notification, status: 'dismissed' }

      // Mock findById first
      mockSupabase.single.mockResolvedValueOnce({
        data: notification,
        error: null,
      })

      // Mock dismiss
      mockSupabase.single.mockResolvedValueOnce({
        data: dismissedNotification,
        error: null,
      })

      const request = createMockRequest(
        'http://localhost/api/notifications/notification-id',
        'PATCH',
        { status: 'dismissed' }
      )
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'notification-id' })
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.status).toBe('dismissed')
    })

    it('should reject unsupported operations', async () => {
      const request = createMockRequest(
        'http://localhost/api/notifications/notification-id',
        'PATCH',
        { status: 'invalid' }
      )
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'notification-id' })
      })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('UNSUPPORTED_OPERATION')
    })
  })

  describe('DELETE /api/notifications/[id]', () => {
    it('should delete notification', async () => {
      const notification = NotificationFactory.build(testUser.id, { id: 'notification-id' })

      // Mock findById first
      mockSupabase.single.mockResolvedValueOnce({
        data: notification,
        error: null,
      })

      // Mock delete
      mockSupabase.mockResolvedValueOnce({
        error: null,
      })

      const request = createMockRequest('http://localhost/api/notifications/notification-id', 'DELETE')
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'notification-id' })
      })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('Notification deleted successfully')
    })

    it('should handle delete errors', async () => {
      const notification = NotificationFactory.build(testUser.id, { id: 'notification-id' })

      // Mock findById first
      mockSupabase.single.mockResolvedValueOnce({
        data: notification,
        error: null,
      })

      // Mock delete error
      mockSupabase.mockResolvedValueOnce({
        error: { code: 'DELETE_ERROR', message: 'Failed to delete' },
      })

      const request = createMockRequest('http://localhost/api/notifications/notification-id', 'DELETE')
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'notification-id' })
      })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
    })
  })

  describe('POST /api/notifications/bulk', () => {
    it('should create bulk notifications', async () => {
      const bulkData = {
        user_ids: [testUser.id, 'user-2'],
        notification_data: {
          type: 'info',
          category: 'system',
          title: 'Bulk Notification',
          message: 'This is a bulk notification',
        },
      }

      const createdNotifications = [
        NotificationFactory.build(testUser.id, bulkData.notification_data),
        NotificationFactory.build('user-2', bulkData.notification_data),
      ]

      mockSupabase.mockResolvedValue({
        data: createdNotifications,
        error: null,
      })

      const request = createMockRequest('http://localhost/api/notifications/bulk', 'POST', bulkData)
      const response = await bulkCreate(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toHaveLength(2)
      expect(responseData.count).toBe(2)
    })

    it('should validate bulk data', async () => {
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
      const response = await bulkCreate(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/notifications/stats', () => {
    it('should get notification statistics', async () => {
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

      const request = createMockRequest('http://localhost/api/notifications/stats')
      const response = await getStats(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.total).toBe(3)
      expect(responseData.data.unread).toBe(2)
      expect(responseData.data.read).toBe(1)
    })

    it('should filter stats by organization', async () => {
      const notifications = [
        NotificationFactory.build(testUser.id, { 
          organization_id: testOrganization.id,
          status: 'unread'
        }),
      ]

      mockSupabase.mockResolvedValue({
        data: notifications,
        error: null,
        count: 1,
      })

      const request = createMockRequest(`http://localhost/api/notifications/stats?organization_id=${testOrganization.id}`)
      const response = await getStats(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.total).toBe(1)
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle authentication failures consistently', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      })

      const endpoints = [
        () => GET(createMockRequest('http://localhost/api/notifications')),
        () => POST(createMockRequest('http://localhost/api/notifications', 'POST', {})),
        () => getStats(createMockRequest('http://localhost/api/notifications/stats')),
      ]

      for (const endpoint of endpoints) {
        const response = await endpoint()
        expect(response.status).toBe(401)
      }
    })

    it('should handle database connection errors consistently', async () => {
      mockSupabase.mockResolvedValue({
        data: null,
        error: { code: 'CONNECTION_ERROR', message: 'Database unavailable' },
        count: null,
      })

      const request = createMockRequest('http://localhost/api/notifications')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error.category).toBe('server_error')
    })
  })

  describe('Performance and pagination', () => {
    it('should handle large result sets with proper pagination', async () => {
      const largeNotificationSet = Array.from({ length: 100 }, (_, i) =>
        NotificationFactory.build(testUser.id, { title: `Notification ${i + 1}` })
      )

      mockSupabase.mockResolvedValue({
        data: largeNotificationSet.slice(0, 50), // First page
        error: null,
        count: 100,
      })

      const request = createMockRequest('http://localhost/api/notifications?limit=50&page=1')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toHaveLength(50)
      expect(responseData.pagination.total).toBe(100)
      expect(responseData.pagination.totalPages).toBe(2)
      expect(responseData.pagination.hasNext).toBe(true)
      expect(responseData.pagination.hasPrev).toBe(false)
    })

    it('should validate pagination limits', async () => {
      const request = createMockRequest('http://localhost/api/notifications?limit=1000') // Too large
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })
  })
})