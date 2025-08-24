/**
 * Push Notification Devices API Route
 * 
 * Handles device registration and management for push notifications.
 * Supports iOS, Android, and Web platforms with enterprise security.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';
import { EnterprisePushNotificationService } from '@/lib/services/push-notification.service';
import { createUserId } from '@/types/branded';
import { rateLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/auth-middleware';
import { withErrorHandling } from '@/lib/error-middleware';

// Request validation schemas
const RegisterDeviceSchema = z.object({
  platform: z.enum(['ios', 'android', 'web']),
  device_token: z.string().min(1, 'Device token is required'),
  device_name: z.string().optional(),
  device_model: z.string().optional(),
  app_version: z.string().optional(),
  os_version: z.string().optional(),
  preferences: z.object({
    enabled: z.boolean().default(true),
    do_not_disturb_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    do_not_disturb_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    allow_critical_override: z.boolean().default(true),
    categories: z.record(z.object({
      enabled: z.boolean().default(true),
      sound: z.boolean().default(true),
      vibration: z.boolean().default(true),
      badge: z.boolean().default(true)
    }))
  }).optional()
});

const UpdateDevicePreferencesSchema = z.object({
  device_id: z.string().uuid('Invalid device ID'),
  preferences: z.object({
    enabled: z.boolean(),
    do_not_disturb_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    do_not_disturb_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    allow_critical_override: z.boolean(),
    categories: z.record(z.object({
      enabled: z.boolean(),
      sound: z.boolean(),
      vibration: z.boolean(),
      badge: z.boolean()
    }))
  })
});

/**
 * GET /api/push-notifications/devices
 * Get user's registered push notification devices
 */
export const GET = withErrorHandling(
  withAuth(async (request: NextRequest, { user }) => {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, { 
      limit: 100, 
      window: 60000 // 100 requests per minute
    });
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    try {
      const supabase = createServerSupabaseClient();
      const pushService = new EnterprisePushNotificationService(supabase);

      // Get user's devices
      const devicesResult = await pushService.getUserDevices(createUserId(user.id));

      if (!devicesResult.success) {
        return NextResponse.json(
          { error: devicesResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        devices: devicesResult.data,
        total: devicesResult.data.length
      });

    } catch (error) {
      console.error('Error fetching push devices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch devices' },
        { status: 500 }
      );
    }
  })
);

/**
 * POST /api/push-notifications/devices
 * Register a new push notification device
 */
export const POST = withErrorHandling(
  withAuth(async (request: NextRequest, { user }) => {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      limit: 10,
      window: 60000 // 10 registrations per minute
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
      const validation = RegisterDeviceSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validation.error.format()
          },
          { status: 400 }
        );
      }

      const deviceData = validation.data;
      const supabase = createServerSupabaseClient();
      const pushService = new EnterprisePushNotificationService(supabase);

      // Create device registration data
      const registrationData = {
        ...deviceData,
        user_id: createUserId(user.id),
        preferences: deviceData.preferences || {
          enabled: true,
          allow_critical_override: true,
          categories: {
            emergency_board_matter: { enabled: true, sound: true, vibration: true, badge: true },
            time_sensitive_voting: { enabled: true, sound: true, vibration: true, badge: true },
            compliance_alert: { enabled: true, sound: true, vibration: false, badge: true },
            meeting_notification: { enabled: true, sound: false, vibration: false, badge: true },
            governance_update: { enabled: true, sound: false, vibration: false, badge: true },
            security_alert: { enabled: true, sound: true, vibration: true, badge: true }
          }
        }
      };

      // Register device
      const result = await pushService.registerDevice(registrationData);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: result.error.code === 'VALIDATION_ERROR' ? 400 : 500 }
        );
      }

      // Log successful registration
      console.log(`Device registered successfully: ${result.data.id} for user ${user.id}`);

      return NextResponse.json(result.data, { status: 201 });

    } catch (error) {
      console.error('Error registering push device:', error);
      return NextResponse.json(
        { error: 'Failed to register device' },
        { status: 500 }
      );
    }
  })
);

/**
 * PUT /api/push-notifications/devices
 * Update device preferences
 */
export const PUT = withErrorHandling(
  withAuth(async (request: NextRequest, { user }) => {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      limit: 50,
      window: 60000 // 50 updates per minute
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
      const validation = UpdateDevicePreferencesSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validation.error.format()
          },
          { status: 400 }
        );
      }

      const { device_id, preferences } = validation.data;
      const supabase = createServerSupabaseClient();
      const pushService = new EnterprisePushNotificationService(supabase);

      // Update device preferences
      const result = await pushService.updateDevicePreferences(device_id, preferences);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: result.error.code === 'NOT_FOUND' ? 404 : 500 }
        );
      }

      return NextResponse.json(result.data);

    } catch (error) {
      console.error('Error updating device preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update device preferences' },
        { status: 500 }
      );
    }
  })
);

/**
 * DELETE /api/push-notifications/devices
 * Unregister a push notification device
 */
export const DELETE = withErrorHandling(
  withAuth(async (request: NextRequest, { user }) => {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      limit: 20,
      window: 60000 // 20 deletions per minute
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    try {
      const { searchParams } = new URL(request.url);
      const deviceId = searchParams.get('device_id');

      if (!deviceId) {
        return NextResponse.json(
          { error: 'Device ID is required' },
          { status: 400 }
        );
      }

      const supabase = createServerSupabaseClient();

      // Verify device ownership and delete
      const { data: device, error: fetchError } = await supabase
        .from('push_devices')
        .select('id, user_id')
        .eq('id', deviceId)
        .single();

      if (fetchError || !device) {
        return NextResponse.json(
          { error: 'Device not found' },
          { status: 404 }
        );
      }

      if (device.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized to delete this device' },
          { status: 403 }
        );
      }

      // Mark device as inactive instead of deleting for audit purposes
      const { error: updateError } = await supabase
        .from('push_devices')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', deviceId);

      if (updateError) {
        console.error('Error deactivating device:', updateError);
        return NextResponse.json(
          { error: 'Failed to unregister device' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        message: 'Device unregistered successfully',
        device_id: deviceId
      });

    } catch (error) {
      console.error('Error unregistering push device:', error);
      return NextResponse.json(
        { error: 'Failed to unregister device' },
        { status: 500 }
      );
    }
  })
);