/**
 * Mobile Push Notifications API Endpoint
 * Handles push notification subscriptions and delivery
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import webpush from 'web-push';

// Configure web-push
webpush.setVapidDetails(
  'mailto:support@boardguru.ai',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (error) {
      throw error;
    }

    // Get notification preferences
    const { data: user } = await supabase
      .from('users')
      .select('notification_preferences, mobile_preferences')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      subscriptions: subscriptions || [],
      preferences: user?.notification_preferences || getDefaultNotificationPreferences(),
      mobilePreferences: user?.mobile_preferences || {},
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    });

  } catch (error) {
    console.error('Get push notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to get push notification data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, userId, subscription, preferences, message } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Verify user
    const { data: user } = await supabase.auth.getUser();
    if (!user.user || user.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'subscribe':
        if (!subscription) {
          return NextResponse.json(
            { error: 'Subscription data is required' },
            { status: 400 }
          );
        }

        // Store push subscription
        const { data: storedSubscription, error: subscribeError } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            user_agent: request.headers.get('user-agent') || '',
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (subscribeError) {
          throw subscribeError;
        }

        // Send welcome notification
        await sendWelcomeNotification(subscription);

        return NextResponse.json({
          success: true,
          subscription: storedSubscription,
          message: 'Push notifications enabled successfully',
        });

      case 'unsubscribe':
        if (!subscription?.endpoint) {
          return NextResponse.json(
            { error: 'Subscription endpoint is required' },
            { status: 400 }
          );
        }

        // Deactivate push subscription
        const { error: unsubscribeError } = await supabase
          .from('push_subscriptions')
          .update({
            active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint);

        if (unsubscribeError) {
          throw unsubscribeError;
        }

        return NextResponse.json({
          success: true,
          message: 'Push notifications disabled successfully',
        });

      case 'update_preferences':
        if (!preferences) {
          return NextResponse.json(
            { error: 'Preferences are required' },
            { status: 400 }
          );
        }

        // Update notification preferences
        const { data: updatedUser, error: prefsError } = await supabase
          .from('users')
          .update({
            notification_preferences: preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select('notification_preferences')
          .single();

        if (prefsError) {
          throw prefsError;
        }

        return NextResponse.json({
          success: true,
          preferences: updatedUser.notification_preferences,
          message: 'Notification preferences updated',
        });

      case 'send_test':
        // Send test notification
        const testResult = await sendTestNotification(userId);

        return NextResponse.json({
          success: testResult.success,
          message: testResult.message,
          sent: testResult.sent,
        });

      case 'send_message':
        if (!message) {
          return NextResponse.json(
            { error: 'Message is required' },
            { status: 400 }
          );
        }

        // Send custom notification
        const sendResult = await sendNotificationToUser(userId, message);

        return NextResponse.json({
          success: sendResult.success,
          message: sendResult.message,
          sent: sendResult.sent,
        });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Push notification action error:', error);
    return NextResponse.json(
      { error: 'Failed to process push notification action' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, notificationId, action } = await request.json();

    if (!userId || !notificationId || !action) {
      return NextResponse.json(
        { error: 'User ID, notification ID, and action are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    switch (action) {
      case 'mark_read':
        // Mark notification as read
        const { error: readError } = await supabase
          .from('notifications')
          .update({
            read_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', notificationId)
          .eq('user_id', userId);

        if (readError) {
          throw readError;
        }

        return NextResponse.json({
          success: true,
          message: 'Notification marked as read',
        });

      case 'dismiss':
        // Dismiss notification
        const { error: dismissError } = await supabase
          .from('notifications')
          .update({
            dismissed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', notificationId)
          .eq('user_id', userId);

        if (dismissError) {
          throw dismissError;
        }

        return NextResponse.json({
          success: true,
          message: 'Notification dismissed',
        });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Push notification update error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// Get notification analytics
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Get notification statistics
    const { data: stats, error } = await supabase
      .rpc('get_notification_stats', { user_id_param: userId });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      stats: stats || {
        total_sent: 0,
        total_delivered: 0,
        total_clicked: 0,
        total_dismissed: 0,
        delivery_rate: 0,
        click_rate: 0,
      },
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Notification analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to get notification analytics' },
      { status: 500 }
    );
  }
}

/**
 * Helper functions
 */

async function sendWelcomeNotification(subscription: any): Promise<void> {
  const payload = JSON.stringify({
    title: 'BoardGuru Notifications Enabled',
    body: 'You\'ll now receive important updates and reminders',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'welcome',
    requireInteraction: false,
    actions: [
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
    data: {
      type: 'welcome',
      timestamp: Date.now(),
    },
  });

  try {
    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    console.error('Welcome notification failed:', error);
  }
}

async function sendTestNotification(userId: string): Promise<{
  success: boolean;
  message: string;
  sent: number;
}> {
  const supabase = createSupabaseServerClient();
  
  // Get user's active subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);

  if (!subscriptions || subscriptions.length === 0) {
    return {
      success: false,
      message: 'No active push subscriptions found',
      sent: 0,
    };
  }

  const payload = JSON.stringify({
    title: 'BoardGuru Test Notification',
    body: 'This is a test notification to verify your settings',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'test',
    requireInteraction: false,
    data: {
      type: 'test',
      timestamp: Date.now(),
    },
  });

  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      await webpush.sendNotification(pushSubscription, payload);
      sent++;
    } catch (error) {
      console.error(`Test notification failed for subscription ${subscription.id}:`, error);
      
      // Deactivate failed subscriptions
      if (error.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .update({ active: false })
          .eq('id', subscription.id);
      }
    }
  }

  return {
    success: sent > 0,
    message: sent > 0 ? `Test notification sent to ${sent} device(s)` : 'Failed to send test notification',
    sent,
  };
}

async function sendNotificationToUser(userId: string, message: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  actions?: any[];
  data?: any;
}): Promise<{
  success: boolean;
  message: string;
  sent: number;
}> {
  const supabase = createSupabaseServerClient();
  
  // Get user's active subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);

  if (!subscriptions || subscriptions.length === 0) {
    return {
      success: false,
      message: 'No active push subscriptions found',
      sent: 0,
    };
  }

  // Check user's notification preferences
  const { data: user } = await supabase
    .from('users')
    .select('notification_preferences')
    .eq('id', userId)
    .single();

  const preferences = user?.notification_preferences || getDefaultNotificationPreferences();
  
  // Check if notifications are enabled for this type
  const notificationType = message.data?.type || 'general';
  if (!preferences[notificationType]?.enabled) {
    return {
      success: false,
      message: 'Notifications disabled for this type',
      sent: 0,
    };
  }

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    icon: message.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: message.tag || 'notification',
    requireInteraction: message.data?.priority === 'high',
    actions: message.actions || [],
    data: {
      ...message.data,
      timestamp: Date.now(),
      userId,
    },
  });

  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      await webpush.sendNotification(pushSubscription, payload);
      sent++;

      // Log notification send
      await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          subscription_id: subscription.id,
          title: message.title,
          body: message.body,
          type: notificationType,
          sent_at: new Date().toISOString(),
          status: 'sent',
        });

    } catch (error) {
      console.error(`Notification failed for subscription ${subscription.id}:`, error);
      
      // Log failed notification
      await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          subscription_id: subscription.id,
          title: message.title,
          body: message.body,
          type: notificationType,
          sent_at: new Date().toISOString(),
          status: 'failed',
          error_message: error.message,
        });

      // Deactivate failed subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        await supabase
          .from('push_subscriptions')
          .update({ active: false })
          .eq('id', subscription.id);
      }
    }
  }

  return {
    success: sent > 0,
    message: sent > 0 ? `Notification sent to ${sent} device(s)` : 'Failed to send notification',
    sent,
  };
}

function getDefaultNotificationPreferences() {
  return {
    general: { enabled: true },
    assetUpdates: { enabled: true },
    meetingReminders: { enabled: true },
    organizationInvites: { enabled: true },
    systemAlerts: { enabled: true },
    marketingUpdates: { enabled: false },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  };
}