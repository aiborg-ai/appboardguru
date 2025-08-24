/**
 * Push Notification Send API Route
 * 
 * Handles sending push notifications with intelligent routing.
 * Supports individual and bulk notification delivery.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';
import { EnterprisePushNotificationService } from '@/lib/services/push-notification.service';
import { IntelligentNotificationRouterService } from '@/lib/services/intelligent-notification-router.service';
import { createUserId, createOrganizationId, createNotificationId } from '@/types/branded';
import { rateLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/auth-middleware';
import { withErrorHandling } from '@/lib/error-middleware';
import type { NotificationCategory, NotificationPriority, PushNotificationPayload } from '@/lib/services/push-notification.service';

// Request validation schemas
const SendNotificationSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  organization_id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  body: z.string().min(1, 'Body is required').max(500, 'Body too long'),
  category: z.enum([
    'emergency_board_matter',
    'time_sensitive_voting',
    'compliance_alert',
    'meeting_notification',
    'governance_update',
    'security_alert'
  ]),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  image: z.string().url().optional(),
  icon: z.string().url().optional(),
  badge_count: z.number().int().min(0).optional(),
  actions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    icon: z.string().optional(),
    input: z.boolean().optional(),
    destructive: z.boolean().optional()
  })).optional(),
  click_action: z.string().url().optional(),
  deep_link: z.string().optional(),
  data: z.record(z.any()).optional(),
  expires_at: z.string().datetime().optional(),
  platform_options: z.object({
    ios: z.object({
      sound: z.string().optional(),
      critical: z.boolean().optional(),
      thread_id: z.string().optional(),
      category_id: z.string().optional(),
      mutable_content: z.boolean().optional(),
      content_available: z.boolean().optional(),
      interruption_level: z.enum(['passive', 'active', 'time-sensitive', 'critical']).optional(),
      relevance_score: z.number().min(0).max(1).optional()
    }).optional(),
    android: z.object({
      channel_id: z.string().default('board_governance'),
      sound: z.string().optional(),
      vibration_pattern: z.array(z.number()).optional(),
      led_color: z.string().optional(),
      notification_priority: z.enum(['min', 'low', 'default', 'high', 'max']).optional(),
      visibility: z.enum(['private', 'public', 'secret']).optional(),
      group: z.string().optional(),
      group_summary: z.boolean().optional(),
      ongoing: z.boolean().optional(),
      only_alert_once: z.boolean().optional(),
      auto_cancel: z.boolean().optional()
    }).optional(),
    web: z.object({
      tag: z.string().optional(),
      icon: z.string().url().optional(),
      image: z.string().url().optional(),
      badge: z.string().url().optional(),
      silent: z.boolean().optional(),
      require_interaction: z.boolean().optional(),
      actions: z.array(z.object({
        action: z.string(),
        title: z.string(),
        icon: z.string().url().optional()
      })).optional()
    }).optional()
  }).optional()
});

const BulkSendNotificationSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1, 'At least one user ID required').max(1000, 'Too many users'),
  notification: SendNotificationSchema.omit({ user_id: true })
});

const TestNotificationSchema = z.object({
  device_id: z.string().uuid('Invalid device ID'),
  title: z.string().default('Test Notification'),
  body: z.string().default('This is a test notification from BoardGuru'),
  category: z.enum([
    'emergency_board_matter',
    'time_sensitive_voting',
    'compliance_alert',
    'meeting_notification',
    'governance_update',
    'security_alert'
  ]).default('governance_update'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium')
});

/**
 * POST /api/push-notifications/send
 * Send a push notification to a specific user
 */
export const POST = withErrorHandling(
  withAuth(async (request: NextRequest, { user }) => {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      limit: 100,
      window: 60000 // 100 notifications per minute
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    try {
      const body = await request.json();
      
      // Validate request body
      const validation = SendNotificationSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validation.error.format()
          },
          { status: 400 }
        );
      }

      const notificationData = validation.data;
      const supabase = createServerSupabaseClient();
      const pushService = new EnterprisePushNotificationService(supabase);
      const routerService = new IntelligentNotificationRouterService(supabase, pushService);

      // Check if user has permission to send notifications to target user
      const canSend = await checkNotificationPermissions(
        user.id,
        notificationData.user_id,
        notificationData.organization_id,
        supabase
      );

      if (!canSend) {
        return NextResponse.json(
          { error: 'Insufficient permissions to send notification' },
          { status: 403 }
        );
      }

      // Create notification payload
      const payload: PushNotificationPayload = {
        id: createNotificationId(crypto.randomUUID()),
        user_id: createUserId(notificationData.user_id),
        organization_id: notificationData.organization_id 
          ? createOrganizationId(notificationData.organization_id) 
          : undefined,
        title: notificationData.title,
        body: notificationData.body,
        category: notificationData.category as NotificationCategory,
        priority: notificationData.priority as NotificationPriority,
        image: notificationData.image,
        icon: notificationData.icon,
        badge_count: notificationData.badge_count,
        actions: notificationData.actions,
        click_action: notificationData.click_action,
        deep_link: notificationData.deep_link,
        data: notificationData.data,
        expires_at: notificationData.expires_at ? new Date(notificationData.expires_at) : undefined,
        platform_options: notificationData.platform_options
      };

      // Make routing decision
      const routingResult = await routerService.makeRoutingDecision(payload, {
        sender_id: user.id,
        request_origin: 'api'
      });

      if (!routingResult.success) {
        console.error('Routing decision failed:', routingResult.error);
        return NextResponse.json(
          { error: 'Failed to determine notification routing' },
          { status: 500 }
        );
      }

      const decision = routingResult.data;

      // If decision is not to deliver, return early
      if (!decision.should_deliver) {
        return NextResponse.json({
          message: 'Notification not delivered based on routing rules',
          routing_decision: decision,
          delivery_results: []
        });
      }

      // Send notification
      const sendResult = await pushService.sendNotification(payload);

      if (!sendResult.success) {
        console.error('Failed to send push notification:', sendResult.error);
        return NextResponse.json(
          { error: 'Failed to send notification' },
          { status: 500 }
        );
      }

      // Log notification in database
      await logNotificationToDatabase(payload, user.id, supabase);

      return NextResponse.json({
        message: 'Notification sent successfully',
        notification_id: payload.id,
        routing_decision: decision,
        delivery_results: sendResult.data,
        summary: {
          total_devices: sendResult.data.length,
          successful_deliveries: sendResult.data.filter(r => r.success).length,
          failed_deliveries: sendResult.data.filter(r => !r.success).length
        }
      });

    } catch (error) {
      console.error('Error sending push notification:', error);
      return NextResponse.json(
        { error: 'Failed to send notification' },
        { status: 500 }
      );
    }
  })
);

/**
 * POST /api/push-notifications/send/bulk
 * Send notifications to multiple users
 */
export const PUT = withErrorHandling(
  withAuth(async (request: NextRequest, { user }) => {
    // Rate limiting (stricter for bulk operations)
    const rateLimitResult = await rateLimit(request, {
      limit: 10,
      window: 60000 // 10 bulk operations per minute
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    try {
      const body = await request.json();
      
      // Validate request body
      const validation = BulkSendNotificationSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validation.error.format()
          },
          { status: 400 }
        );
      }

      const { user_ids, notification } = validation.data;
      const supabase = createServerSupabaseClient();
      const pushService = new EnterprisePushNotificationService(supabase);

      // Check bulk notification permissions
      const canSendBulk = await checkBulkNotificationPermissions(
        user.id,
        user_ids,
        notification.organization_id,
        supabase
      );

      if (!canSendBulk) {
        return NextResponse.json(
          { error: 'Insufficient permissions for bulk notification' },
          { status: 403 }
        );
      }

      // Create user IDs array
      const userIds = user_ids.map(id => createUserId(id));

      // Prepare notification data
      const notificationData = {
        ...notification,
        organization_id: notification.organization_id 
          ? createOrganizationId(notification.organization_id) 
          : undefined,
        category: notification.category as NotificationCategory,
        priority: notification.priority as NotificationPriority,
        expires_at: notification.expires_at ? new Date(notification.expires_at) : undefined
      };

      // Send bulk notifications
      const bulkResult = await pushService.sendBulkNotifications(userIds, notificationData);

      if (!bulkResult.success) {
        console.error('Failed to send bulk notifications:', bulkResult.error);
        return NextResponse.json(
          { error: 'Failed to send bulk notifications' },
          { status: 500 }
        );
      }

      // Calculate summary statistics
      const results = bulkResult.data;
      const totalDeliveries = Object.values(results).flat().length;
      const successfulDeliveries = Object.values(results)
        .flat()
        .filter(r => r.success).length;

      return NextResponse.json({
        message: 'Bulk notifications sent successfully',
        users_targeted: user_ids.length,
        delivery_results: results,
        summary: {
          users_targeted: user_ids.length,
          total_devices: totalDeliveries,
          successful_deliveries: successfulDeliveries,
          failed_deliveries: totalDeliveries - successfulDeliveries
        }
      });

    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      return NextResponse.json(
        { error: 'Failed to send bulk notifications' },
        { status: 500 }
      );
    }
  })
);

/**
 * POST /api/push-notifications/send/test
 * Send a test notification to a specific device
 */
export const PATCH = withErrorHandling(
  withAuth(async (request: NextRequest, { user }) => {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      limit: 20,
      window: 60000 // 20 test notifications per minute
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    try {
      const body = await request.json();
      
      // Validate request body
      const validation = TestNotificationSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validation.error.format()
          },
          { status: 400 }
        );
      }

      const testData = validation.data;
      const supabase = createServerSupabaseClient();
      
      // Verify device ownership
      const { data: device, error: deviceError } = await supabase
        .from('push_devices')
        .select('id, user_id, platform, device_token')
        .eq('id', testData.device_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (deviceError || !device) {
        return NextResponse.json(
          { error: 'Device not found or access denied' },
          { status: 404 }
        );
      }

      const pushService = new EnterprisePushNotificationService(supabase);

      // Create test notification payload
      const testPayload: PushNotificationPayload = {
        id: createNotificationId(crypto.randomUUID()),
        user_id: createUserId(user.id),
        title: testData.title,
        body: testData.body,
        category: testData.category as NotificationCategory,
        priority: testData.priority as NotificationPriority,
        data: {
          test_notification: true,
          timestamp: new Date().toISOString()
        }
      };

      // Send test notification
      const result = await pushService.sendNotification(testPayload);

      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to send test notification' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Test notification sent successfully',
        device_id: testData.device_id,
        platform: device.platform,
        delivery_results: result.data
      });

    } catch (error) {
      console.error('Error sending test notification:', error);
      return NextResponse.json(
        { error: 'Failed to send test notification' },
        { status: 500 }
      );
    }
  })
);

// Helper function to check notification permissions
async function checkNotificationPermissions(
  senderId: string,
  targetUserId: string,
  organizationId: string | undefined,
  supabase: any
): Promise<boolean> {
  // Users can always send notifications to themselves
  if (senderId === targetUserId) {
    return true;
  }

  // Check if sender is admin
  const { data: senderUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', senderId)
    .single();

  if (senderUser?.role === 'admin') {
    return true;
  }

  // Check organization membership and roles if organization is specified
  if (organizationId) {
    const { data: senderMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', senderId)
      .single();

    const { data: targetMembership } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', targetUserId)
      .single();

    // Sender must be org admin/owner and target must be org member
    return (
      senderMembership?.role in ['admin', 'owner'] &&
      targetMembership !== null
    );
  }

  return false;
}

// Helper function to check bulk notification permissions
async function checkBulkNotificationPermissions(
  senderId: string,
  targetUserIds: string[],
  organizationId: string | undefined,
  supabase: any
): Promise<boolean> {
  // Check if sender is system admin
  const { data: senderUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', senderId)
    .single();

  if (senderUser?.role === 'admin') {
    return true;
  }

  // For bulk operations, require organization context and admin role
  if (!organizationId) {
    return false;
  }

  const { data: senderMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', senderId)
    .single();

  if (!senderMembership || !['admin', 'owner'].includes(senderMembership.role)) {
    return false;
  }

  // Verify all target users are members of the organization
  const { data: targetMemberships, count } = await supabase
    .from('organization_members')
    .select('user_id', { count: 'exact', head: false })
    .eq('organization_id', organizationId)
    .in('user_id', targetUserIds);

  return count === targetUserIds.length;
}

// Helper function to log notification to database
async function logNotificationToDatabase(
  payload: PushNotificationPayload,
  senderId: string,
  supabase: any
): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .insert({
        id: payload.id,
        user_id: payload.user_id,
        organization_id: payload.organization_id,
        type: 'push_notification',
        category: payload.category,
        title: payload.title,
        message: payload.body,
        priority: payload.priority,
        status: 'unread',
        sender_id: senderId,
        action_url: payload.click_action,
        icon: payload.icon,
        metadata: {
          ...payload.data,
          push_notification: true,
          platform_options: payload.platform_options
        },
        expires_at: payload.expires_at?.toISOString(),
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log notification to database:', error);
    // Don't throw error as the push notification was successful
  }
}