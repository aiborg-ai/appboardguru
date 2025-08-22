import { NextRequest, NextResponse } from 'next/server'
import { EnhancedNotificationService, NotificationServiceInterface } from '../services/notification.service.enhanced'
import { createSupabaseServerClient } from '../supabase-server'
import { 
  Result, 
  isSuccess, 
  RepositoryError,
  ErrorCode 
} from '../repositories/result'
import { 
  createUserId,
  createOrganizationId,
  createNotificationId,
  isUserId,
  isOrganizationId,
  isNotificationId,
  UserId,
  OrganizationId,
  NotificationId
} from '../../types/branded'
import { z } from 'zod'

// ============================================
// REQUEST/RESPONSE SCHEMAS
// ============================================

const CreateNotificationRequestSchema = z.object({
  user_id: z.string().refine(isUserId, 'Invalid user ID format').optional(),
  organization_id: z.string().refine(isOrganizationId, 'Invalid organization ID format').optional(),
  type: z.string().min(1, 'Type is required'),
  category: z.string().min(1, 'Category is required'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  action_url: z.string().url('Invalid URL format').optional(),
  action_text: z.string().max(100, 'Action text too long').optional(),
  icon: z.string().max(50, 'Icon name too long').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  scheduled_for: z.string().datetime('Invalid datetime format').optional(),
  expires_at: z.string().datetime('Invalid datetime format').optional()
})

const BulkCreateNotificationRequestSchema = z.object({
  user_ids: z.array(z.string().refine(isUserId, 'Invalid user ID format')).min(1).max(1000),
  notification_data: CreateNotificationRequestSchema.omit({ user_id: true })
})

const QueryNotificationsSchema = z.object({
  limit: z.string().transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be 1-100').optional(),
  offset: z.string().transform(Number).refine(n => n >= 0, 'Offset must be non-negative').optional(),
  page: z.string().transform(Number).refine(n => n > 0, 'Page must be positive').optional(),
  status: z.enum(['unread', 'read', 'dismissed', 'archived']).optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  organization_id: z.string().refine(isOrganizationId, 'Invalid organization ID format').optional(),
  date_from: z.string().datetime('Invalid datetime format').optional(),
  date_to: z.string().datetime('Invalid datetime format').optional()
})

// ============================================
// CONTROLLER CLASS
// ============================================

/**
 * Consolidated notification controller following enterprise DDD architecture
 * Handles HTTP requests and delegates to service layer with proper error handling
 */
export class NotificationController {
  private notificationService: NotificationServiceInterface

  constructor(notificationService?: NotificationServiceInterface) {
    if (notificationService) {
      this.notificationService = notificationService
    } else {
      // Create default service with server client
      this.notificationService = this.createDefaultService()
    }
  }

  // ============================================
  // CORE NOTIFICATION OPERATIONS
  // ============================================

  /**
   * GET /api/notifications - Get user notifications with filtering and pagination
   */
  async getNotifications(request: NextRequest): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url)
      
      // Validate query parameters
      const queryValidation = this.validateQueryParams(searchParams)
      if (!queryValidation.success) {
        return this.createValidationErrorResponse(queryValidation.error)
      }

      const { limit = 50, offset = 0, page, ...filters } = queryValidation.data

      // Get current user
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        return this.handleError(userResult.error)
      }

      // Convert dates if provided
      const processedFilters = {
        ...filters,
        dateFrom: filters.date_from ? new Date(filters.date_from) : undefined,
        dateTo: filters.date_to ? new Date(filters.date_to) : undefined,
        organizationId: filters.organization_id ? createOrganizationId(filters.organization_id).data : undefined
      }

      // Calculate pagination
      const queryOptions = {
        limit,
        offset: page ? (page - 1) * limit : offset,
        page
      }

      // Get notifications
      const result = await this.notificationService.getUserNotifications(
        userResult.data.userId,
        processedFilters,
        queryOptions
      )

      if (!result.success) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data.data,
        pagination: {
          page: result.data.page,
          limit: result.data.limit,
          total: result.data.total,
          totalPages: result.data.totalPages,
          hasNext: result.data.page < result.data.totalPages,
          hasPrev: result.data.page > 1
        }
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  /**
   * POST /api/notifications - Create a new notification
   */
  async createNotification(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json()
      
      // Validate request body
      const validation = CreateNotificationRequestSchema.safeParse(body)
      if (!validation.success) {
        return this.createValidationErrorResponse(validation.error.message)
      }

      const data = validation.data

      // Get current user
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        return this.handleError(userResult.error)
      }

      // Prepare notification data
      const notificationData = {
        user_id: data.user_id ? createUserId(data.user_id).data! : userResult.data.userId,
        organization_id: data.organization_id ? createOrganizationId(data.organization_id).data : undefined,
        type: data.type,
        category: data.category,
        title: data.title,
        message: data.message,
        priority: data.priority,
        action_url: data.action_url,
        action_text: data.action_text,
        icon: data.icon,
        color: data.color,
        resource_type: data.resource_type,
        resource_id: data.resource_id,
        sender_id: userResult.data.userId,
        metadata: data.metadata,
        scheduled_for: data.scheduled_for ? new Date(data.scheduled_for) : undefined,
        expires_at: data.expires_at ? new Date(data.expires_at) : undefined
      }

      // Create notification
      const result = await this.notificationService.createNotification(notificationData)
      
      if (!result.success) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      }, { status: 201 })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  /**
   * POST /api/notifications/bulk - Create notifications for multiple users
   */
  async createBulkNotifications(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await request.json()
      
      // Validate request body
      const validation = BulkCreateNotificationRequestSchema.safeParse(body)
      if (!validation.success) {
        return this.createValidationErrorResponse(validation.error.message)
      }

      const { user_ids, notification_data } = validation.data

      // Get current user
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        return this.handleError(userResult.error)
      }

      // Convert user IDs to branded types
      const brandedUserIds = user_ids.map(id => createUserId(id).data!).filter(Boolean)

      // Prepare bulk data
      const bulkData = {
        user_ids: brandedUserIds,
        notification_data: {
          ...notification_data,
          organization_id: notification_data.organization_id ? createOrganizationId(notification_data.organization_id).data : undefined,
          sender_id: userResult.data.userId,
          scheduled_for: notification_data.scheduled_for ? new Date(notification_data.scheduled_for) : undefined,
          expires_at: notification_data.expires_at ? new Date(notification_data.expires_at) : undefined
        }
      }

      // Create bulk notifications
      const result = await this.notificationService.bulkCreateNotifications(bulkData)
      
      if (!result.success) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        count: result.data.length
      }, { status: 201 })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  // ============================================
  // NOTIFICATION LIFECYCLE OPERATIONS
  // ============================================

  /**
   * GET /api/notifications/[id] - Get specific notification
   */
  async getNotificationById(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const { id } = params
      
      // Validate notification ID
      const notificationIdResult = createNotificationId(id)
      if (!notificationIdResult.success) {
        return this.createValidationErrorResponse('Invalid notification ID format')
      }

      // Get notification
      const result = await this.notificationService.getNotificationById(notificationIdResult.data!)
      
      if (!result.success) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  /**
   * PATCH /api/notifications/[id]/read - Mark notification as read
   */
  async markAsRead(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const { id } = params
      
      // Validate notification ID
      const notificationIdResult = createNotificationId(id)
      if (!notificationIdResult.success) {
        return this.createValidationErrorResponse('Invalid notification ID format')
      }

      // Mark as read
      const result = await this.notificationService.markAsRead(notificationIdResult.data!)
      
      if (!result.success) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  /**
   * PATCH /api/notifications/mark-all-read - Mark all notifications as read
   */
  async markAllAsRead(request: NextRequest): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url)
      const organizationId = searchParams.get('organization_id')
      
      // Get current user
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        return this.handleError(userResult.error)
      }

      // Validate organization ID if provided
      let orgId: OrganizationId | undefined
      if (organizationId) {
        const orgIdResult = createOrganizationId(organizationId)
        if (!orgIdResult.success) {
          return this.createValidationErrorResponse('Invalid organization ID format')
        }
        orgId = orgIdResult.data
      }

      // Mark all as read
      const result = await this.notificationService.markAllAsRead(userResult.data.userId, orgId)
      
      if (!result.success) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  /**
   * PATCH /api/notifications/[id]/dismiss - Dismiss notification
   */
  async dismissNotification(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const { id } = params
      
      // Validate notification ID
      const notificationIdResult = createNotificationId(id)
      if (!notificationIdResult.success) {
        return this.createValidationErrorResponse('Invalid notification ID format')
      }

      // Dismiss notification
      const result = await this.notificationService.dismissNotification(notificationIdResult.data!)
      
      if (!result.success) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  /**
   * DELETE /api/notifications/[id] - Delete notification
   */
  async deleteNotification(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const { id } = params
      
      // Validate notification ID
      const notificationIdResult = createNotificationId(id)
      if (!notificationIdResult.success) {
        return this.createValidationErrorResponse('Invalid notification ID format')
      }

      // Delete notification
      const result = await this.notificationService.deleteNotification(notificationIdResult.data!)
      
      if (!result.success) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        message: 'Notification deleted successfully'
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  // ============================================
  // ANALYTICS AND STATS
  // ============================================

  /**
   * GET /api/notifications/stats - Get notification statistics
   */
  async getStats(request: NextRequest): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url)
      const organizationId = searchParams.get('organization_id')
      
      // Get current user
      const userResult = await this.getCurrentUser()
      if (!userResult.success) {
        return this.handleError(userResult.error)
      }

      // Validate organization ID if provided
      let orgId: OrganizationId | undefined
      if (organizationId) {
        const orgIdResult = createOrganizationId(organizationId)
        if (!orgIdResult.success) {
          return this.createValidationErrorResponse('Invalid organization ID format')
        }
        orgId = orgIdResult.data
      }

      // Get stats
      const result = await this.notificationService.getNotificationStats(userResult.data.userId, orgId)
      
      if (!result.success) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private async getCurrentUser(): Promise<Result<{ userId: UserId }>> {
    try {
      const supabase = await createSupabaseServerClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return {
          success: false,
          error: RepositoryError.unauthorized('Authentication required')
        }
      }

      const userIdResult = createUserId(user.id)
      if (!userIdResult.success) {
        return {
          success: false,
          error: RepositoryError.internal('Invalid user ID format')
        }
      }

      return {
        success: true,
        data: { userId: userIdResult.data! }
      }
    } catch (error) {
      return {
        success: false,
        error: RepositoryError.internal('Authentication check failed', error)
      }
    }
  }

  private createDefaultService(): NotificationServiceInterface {
    // This would ideally use dependency injection
    const createDefaultServiceAsync = async () => {
      const supabase = await createSupabaseServerClient()
      return new EnhancedNotificationService(supabase)
    }
    
    // For now, return a service that will be initialized on first use
    // In a real implementation, you'd use proper DI container
    let servicePromise: Promise<EnhancedNotificationService> | null = null
    
    return new Proxy({} as NotificationServiceInterface, {
      get(target, prop) {
        if (!servicePromise) {
          servicePromise = createDefaultServiceAsync()
        }
        
        return async (...args: any[]) => {
          const service = await servicePromise
          return (service as any)[prop](...args)
        }
      }
    })
  }

  private validateQueryParams(searchParams: URLSearchParams): Result<any> {
    const params = Object.fromEntries(searchParams.entries())
    const validation = QueryNotificationsSchema.safeParse(params)
    
    if (!validation.success) {
      return {
        success: false,
        error: RepositoryError.validation(validation.error.message)
      }
    }
    
    return {
      success: true,
      data: validation.data
    }
  }

  private createValidationErrorResponse(message: string): NextResponse {
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        category: 'client_error'
      }
    }, { status: 400 })
  }

  private handleError(error: RepositoryError): NextResponse {
    const status = this.mapErrorToHttpStatus(error.code)
    
    return NextResponse.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        category: error.category,
        ...(error.details && { details: error.details })
      }
    }, { status })
  }

  private handleUnexpectedError(error: any): NextResponse {
    console.error('Unexpected notification controller error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        category: 'server_error'
      }
    }, { status: 500 })
  }

  private mapErrorToHttpStatus(errorCode: ErrorCode): number {
    switch (errorCode) {
      case ErrorCode.VALIDATION_FAILED:
        return 400
      case ErrorCode.UNAUTHORIZED:
        return 401
      case ErrorCode.FORBIDDEN:
        return 403
      case ErrorCode.NOT_FOUND:
        return 404
      case ErrorCode.CONFLICT:
        return 409
      case ErrorCode.TIMEOUT:
        return 408
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return 429
      default:
        return 500
    }
  }
}

// ============================================
// CONTROLLER FACTORY
// ============================================

export function createNotificationController(
  notificationService?: NotificationServiceInterface
): NotificationController {
  return new NotificationController(notificationService)
}

// Export types for use in API routes
export type { NotificationController }