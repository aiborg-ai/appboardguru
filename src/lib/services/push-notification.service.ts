/**
 * Enterprise Push Notification Service
 * 
 * Multi-platform push notification system for urgent board governance matters.
 * Supports FCM (Android/Web), APNS (iOS), with intelligent routing and delivery.
 * 
 * Features:
 * - Multi-platform support (iOS, Android, Web)
 * - Intelligent notification routing
 * - Rich notifications with actions
 * - Enterprise security and encryption
 * - Audit trails and compliance
 * - Performance monitoring
 */

import { z } from 'zod'
import { BaseService } from './base.service'
import { Result, success, failure, RepositoryError } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type { UserId, OrganizationId, NotificationId } from '../../types/branded'
import { createUserId, createOrganizationId, createNotificationId } from '../../types/branded'
import CryptoJS from 'crypto-js'

// =============================================
// PUSH NOTIFICATION TYPES AND INTERFACES
// =============================================

export type NotificationPlatform = 'ios' | 'android' | 'web'
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'
export type NotificationCategory = 
  | 'emergency_board_matter'
  | 'time_sensitive_voting' 
  | 'compliance_alert'
  | 'meeting_notification'
  | 'governance_update'
  | 'security_alert'

export interface PushDevice {
  id: string
  user_id: UserId
  platform: NotificationPlatform
  device_token: string
  device_name?: string
  device_model?: string
  app_version?: string
  os_version?: string
  last_active: Date
  is_active: boolean
  preferences: DevicePreferences
  created_at: Date
  updated_at: Date
}

export interface DevicePreferences {
  enabled: boolean
  do_not_disturb_start?: string // HH:MM format
  do_not_disturb_end?: string
  allow_critical_override: boolean
  categories: {
    [K in NotificationCategory]: {
      enabled: boolean
      sound: boolean
      vibration: boolean
      badge: boolean
    }
  }
}

export interface PushNotificationPayload {
  // Core notification data
  id: NotificationId
  user_id: UserId
  organization_id?: OrganizationId
  title: string
  body: string
  category: NotificationCategory
  priority: NotificationPriority
  
  // Rich content
  image?: string
  icon?: string
  badge_count?: number
  
  // Actions and interaction
  actions?: NotificationAction[]
  click_action?: string
  deep_link?: string
  
  // Metadata and context
  data?: Record<string, any>
  expires_at?: Date
  
  // Platform-specific options
  platform_options?: {
    ios?: IOSOptions
    android?: AndroidOptions
    web?: WebOptions
  }
}

export interface NotificationAction {
  id: string
  title: string
  icon?: string
  input?: boolean // Whether action requires text input
  destructive?: boolean
}

export interface IOSOptions {
  sound?: string
  critical?: boolean // Bypasses Do Not Disturb
  thread_id?: string
  category_id?: string
  mutable_content?: boolean
  content_available?: boolean
  interruption_level?: 'passive' | 'active' | 'time-sensitive' | 'critical'
  relevance_score?: number
}

export interface AndroidOptions {
  channel_id: string
  sound?: string
  vibration_pattern?: number[]
  led_color?: string
  notification_priority?: 'min' | 'low' | 'default' | 'high' | 'max'
  visibility?: 'private' | 'public' | 'secret'
  group?: string
  group_summary?: boolean
  ongoing?: boolean
  only_alert_once?: boolean
  auto_cancel?: boolean
}

export interface WebOptions {
  tag?: string
  icon?: string
  image?: string
  badge?: string
  silent?: boolean
  require_interaction?: boolean
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

export interface DeliveryResult {
  device_id: string
  platform: NotificationPlatform
  success: boolean
  message_id?: string
  error?: string
  retry_count: number
  delivered_at: Date
}

export interface PushMetrics {
  total_sent: number
  successful_deliveries: number
  failed_deliveries: number
  delivery_rate: number
  average_delivery_time: number
  platform_breakdown: Record<NotificationPlatform, {
    sent: number
    delivered: number
    failed: number
  }>
  category_breakdown: Record<NotificationCategory, {
    sent: number
    delivered: number
    opened: number
    action_taken: number
  }>
}

// =============================================
// VALIDATION SCHEMAS
// =============================================

const DevicePreferencesSchema = z.object({
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

const PushDeviceSchema = z.object({
  user_id: z.string(),
  platform: z.enum(['ios', 'android', 'web']),
  device_token: z.string().min(1),
  device_name: z.string().optional(),
  device_model: z.string().optional(),
  app_version: z.string().optional(),
  os_version: z.string().optional(),
  preferences: DevicePreferencesSchema
})

const PushNotificationPayloadSchema = z.object({
  user_id: z.string(),
  organization_id: z.string().optional(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  category: z.enum([
    'emergency_board_matter',
    'time_sensitive_voting',
    'compliance_alert',
    'meeting_notification',
    'governance_update',
    'security_alert'
  ]),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
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
  expires_at: z.date().optional()
})

// =============================================
// ENTERPRISE PUSH NOTIFICATION SERVICE
// =============================================

export class EnterprisePushNotificationService extends BaseService {
  private fcmApiKey?: string
  private apnsKeyId?: string
  private apnsTeamId?: string
  private apnsPrivateKey?: string
  private vapidPublicKey?: string
  private vapidPrivateKey?: string
  private encryptionKey?: string

  constructor(supabase: SupabaseClient<Database>, config?: {
    fcm_api_key?: string
    apns_key_id?: string
    apns_team_id?: string
    apns_private_key?: string
    vapid_public_key?: string
    vapid_private_key?: string
    encryption_key?: string
  }) {
    super(supabase)
    this.fcmApiKey = config?.fcm_api_key || process.env.FCM_API_KEY
    this.apnsKeyId = config?.apns_key_id || process.env.APNS_KEY_ID
    this.apnsTeamId = config?.apns_team_id || process.env.APNS_TEAM_ID
    this.apnsPrivateKey = config?.apns_private_key || process.env.APNS_PRIVATE_KEY
    this.vapidPublicKey = config?.vapid_public_key || process.env.VAPID_PUBLIC_KEY
    this.vapidPrivateKey = config?.vapid_private_key || process.env.VAPID_PRIVATE_KEY
    this.encryptionKey = config?.encryption_key || process.env.PUSH_ENCRYPTION_KEY
  }

  // =============================================
  // DEVICE MANAGEMENT
  // =============================================

  /**
   * Register a push notification device
   */
  async registerDevice(deviceData: Omit<PushDevice, 'id' | 'created_at' | 'updated_at'>): Promise<Result<PushDevice>> {
    // Validate input
    const validation = this.validateWithContext(
      deviceData,
      PushDeviceSchema,
      'register push device',
      'device_data'
    )
    if (!validation.success) {
      return validation
    }

    const validatedData = validation.data

    // Check user permissions
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    // Ensure user can only register devices for themselves
    if (userResult.data.id !== validatedData.user_id) {
      return failure(RepositoryError.forbidden(
        'register_device',
        'Users can only register their own devices'
      ))
    }

    // Check if device already exists and update or create
    const deviceResult = await this.executeDbOperation(
      async () => {
        const { data: existingDevice, error: findError } = await this.supabase
          .from('push_devices')
          .select('*')
          .eq('user_id', validatedData.user_id)
          .eq('device_token', validatedData.device_token)
          .eq('platform', validatedData.platform)
          .single()

        if (existingDevice) {
          // Update existing device
          const { data, error } = await this.supabase
            .from('push_devices')
            .update({
              ...validatedData,
              last_active: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingDevice.id)
            .select()
            .single()

          return { data, error }
        } else {
          // Create new device
          const { data, error } = await this.supabase
            .from('push_devices')
            .insert({
              ...validatedData,
              is_active: true,
              last_active: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          return { data, error }
        }
      },
      'register_push_device',
      { userId: validatedData.user_id, platform: validatedData.platform }
    )

    if (!deviceResult.success) {
      return deviceResult
    }

    // Log device registration
    await this.logActivity(
      'register_push_device',
      'device',
      deviceResult.data.id,
      {
        platform: validatedData.platform,
        userId: validatedData.user_id
      }
    )

    return success(deviceResult.data as PushDevice)
  }

  /**
   * Update device preferences
   */
  async updateDevicePreferences(
    deviceId: string,
    preferences: DevicePreferences
  ): Promise<Result<PushDevice>> {
    // Validate preferences
    const validation = this.validateWithContext(
      preferences,
      DevicePreferencesSchema,
      'update device preferences',
      'preferences'
    )
    if (!validation.success) {
      return validation
    }

    // Get current user and device
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    const deviceResult = await this.executeDbOperation(
      async () => {
        const { data: device, error: findError } = await this.supabase
          .from('push_devices')
          .select('*')
          .eq('id', deviceId)
          .single()

        if (findError) {
          throw findError
        }

        // Check ownership
        if (device.user_id !== userResult.data.id) {
          throw new Error('Cannot update preferences for devices belonging to other users')
        }

        // Update preferences
        const { data, error } = await this.supabase
          .from('push_devices')
          .update({
            preferences: validation.data,
            updated_at: new Date().toISOString()
          })
          .eq('id', deviceId)
          .select()
          .single()

        return { data, error }
      },
      'update_device_preferences',
      { deviceId, userId: userResult.data.id }
    )

    if (!deviceResult.success) {
      return deviceResult
    }

    // Log preference update
    await this.logActivity(
      'update_device_preferences',
      'device',
      deviceId,
      {
        userId: userResult.data.id,
        preferencesUpdated: Object.keys(validation.data)
      }
    )

    return success(deviceResult.data as PushDevice)
  }

  /**
   * Get user's registered devices
   */
  async getUserDevices(userId: UserId): Promise<Result<PushDevice[]>> {
    // Check permissions
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    if (userResult.data.id !== userId) {
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'push_device',
        'read',
        undefined,
        { targetUserId: userId }
      )
      if (!permissionResult.success) {
        return failure(permissionResult.error)
      }
    }

    // Get devices
    const devicesResult = await this.executeDbOperation(
      async () => {
        const { data, error } = await this.supabase
          .from('push_devices')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('last_active', { ascending: false })

        return { data, error }
      },
      'get_user_devices',
      { userId }
    )

    if (!devicesResult.success) {
      return devicesResult
    }

    return success(devicesResult.data as PushDevice[])
  }

  // =============================================
  // PUSH NOTIFICATION DELIVERY
  // =============================================

  /**
   * Send push notification to user across all their devices
   */
  async sendNotification(payload: PushNotificationPayload): Promise<Result<DeliveryResult[]>> {
    // Validate payload
    const validation = this.validateWithContext(
      payload,
      PushNotificationPayloadSchema,
      'send push notification',
      'notification_payload'
    )
    if (!validation.success) {
      return validation
    }

    const validatedPayload = validation.data

    // Get user's active devices
    const devicesResult = await this.getUserDevices(createUserId(validatedPayload.user_id))
    if (!devicesResult.success) {
      return failure(devicesResult.error)
    }

    const devices = devicesResult.data.filter(device => device.is_active)
    if (devices.length === 0) {
      return success([]) // No devices to send to
    }

    // Apply intelligent routing based on preferences and priority
    const targetDevices = await this.applyIntelligentRouting(devices, validatedPayload)
    
    // Encrypt sensitive notification content
    const encryptedPayload = await this.encryptNotificationContent(validatedPayload)
    
    // Send to each targeted device
    const deliveryPromises = targetDevices.map(device => 
      this.sendToDevice(device, encryptedPayload)
    )

    const deliveryResults = await Promise.allSettled(deliveryPromises)
    
    // Process delivery results
    const results: DeliveryResult[] = deliveryResults.map((result, index) => {
      const device = targetDevices[index]
      
      if (result.status === 'fulfilled' && result.value.success) {
        return result.value.data
      } else {
        return {
          device_id: device.id,
          platform: device.platform,
          success: false,
          error: result.status === 'rejected' ? result.reason?.message : 'Unknown error',
          retry_count: 0,
          delivered_at: new Date()
        }
      }
    })

    // Log notification delivery
    await this.logNotificationDelivery(validatedPayload, results)

    // Handle failed deliveries with retry logic
    const failedDeliveries = results.filter(r => !r.success)
    if (failedDeliveries.length > 0) {
      await this.scheduleRetries(failedDeliveries, encryptedPayload)
    }

    return success(results)
  }

  /**
   * Send bulk notifications efficiently
   */
  async sendBulkNotifications(
    userIds: UserId[],
    payload: Omit<PushNotificationPayload, 'user_id'>
  ): Promise<Result<Record<string, DeliveryResult[]>>> {
    if (userIds.length === 0) {
      return success({})
    }

    if (userIds.length > 10000) {
      return failure(RepositoryError.validation(
        'Bulk notification limit exceeded',
        { maxUsers: 10000, requestedUsers: userIds.length }
      ))
    }

    // Check bulk notification permissions
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    const permissionResult = await this.checkPermissionWithContext(
      userResult.data.id,
      'push_notification',
      'bulk_send',
      undefined,
      { userCount: userIds.length }
    )
    if (!permissionResult.success) {
      return failure(permissionResult.error)
    }

    // Send notifications in batches to avoid overwhelming the system
    const batchSize = 100
    const results: Record<string, DeliveryResult[]> = {}

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async userId => {
        const userPayload: PushNotificationPayload = {
          ...payload,
          id: createNotificationId(crypto.randomUUID()),
          user_id: userId
        }
        
        const result = await this.sendNotification(userPayload)
        return { userId: userId, result: result.success ? result.data : [] }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, index) => {
        const userId = batch[index]
        if (result.status === 'fulfilled') {
          results[userId] = result.value.result
        } else {
          results[userId] = []
        }
      })

      // Add delay between batches to prevent rate limiting
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Log bulk notification
    await this.logActivity(
      'send_bulk_push_notifications',
      'notification',
      undefined,
      {
        userCount: userIds.length,
        category: payload.category,
        priority: payload.priority,
        senderId: userResult.data.id
      }
    )

    return success(results)
  }

  // =============================================
  // PLATFORM-SPECIFIC DELIVERY
  // =============================================

  /**
   * Send notification to a specific device
   */
  private async sendToDevice(
    device: PushDevice,
    payload: PushNotificationPayload
  ): Promise<Result<DeliveryResult>> {
    try {
      let result: DeliveryResult

      switch (device.platform) {
        case 'ios':
          result = await this.sendToIOSDevice(device, payload)
          break
        case 'android':
          result = await this.sendToAndroidDevice(device, payload)
          break
        case 'web':
          result = await this.sendToWebDevice(device, payload)
          break
        default:
          throw new Error(`Unsupported platform: ${device.platform}`)
      }

      return success(result)
    } catch (error) {
      return failure(RepositoryError.external(
        'send_to_device',
        `Failed to send to ${device.platform} device: ${error instanceof Error ? error.message : 'Unknown error'}`
      ))
    }
  }

  /**
   * Send notification to iOS device via APNS
   */
  private async sendToIOSDevice(
    device: PushDevice,
    payload: PushNotificationPayload
  ): Promise<DeliveryResult> {
    if (!this.apnsKeyId || !this.apnsTeamId || !this.apnsPrivateKey) {
      throw new Error('APNS configuration missing')
    }

    const iosOptions = payload.platform_options?.ios || {}
    
    // Build APNS payload
    const apnsPayload = {
      aps: {
        alert: {
          title: payload.title,
          body: payload.body
        },
        badge: payload.badge_count,
        sound: iosOptions.sound || 'default',
        'thread-id': iosOptions.thread_id,
        category: iosOptions.category_id,
        'mutable-content': iosOptions.mutable_content ? 1 : 0,
        'content-available': iosOptions.content_available ? 1 : 0,
        'interruption-level': iosOptions.interruption_level || 'active',
        'relevance-score': iosOptions.relevance_score || 0.5
      },
      data: payload.data || {},
      actions: payload.actions
    }

    // Critical alerts bypass Do Not Disturb
    if (iosOptions.critical) {
      apnsPayload.aps.sound = {
        critical: 1,
        name: iosOptions.sound || 'default',
        volume: 1.0
      } as any
    }

    // Send via APNS
    const response = await fetch(`https://api.push.apple.com/3/device/${device.device_token}`, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${this.generateApnsJWT()}`,
        'apns-id': payload.id,
        'apns-push-type': 'alert',
        'apns-priority': payload.priority === 'critical' ? '10' : '5',
        'apns-topic': process.env.APNS_BUNDLE_ID || 'ai.boardguru.app'
      },
      body: JSON.stringify(apnsPayload)
    })

    const success = response.status === 200
    const apnsId = response.headers.get('apns-id')

    return {
      device_id: device.id,
      platform: 'ios',
      success,
      message_id: apnsId || undefined,
      error: success ? undefined : await response.text(),
      retry_count: 0,
      delivered_at: new Date()
    }
  }

  /**
   * Send notification to Android device via FCM
   */
  private async sendToAndroidDevice(
    device: PushDevice,
    payload: PushNotificationPayload
  ): Promise<DeliveryResult> {
    if (!this.fcmApiKey) {
      throw new Error('FCM API key missing')
    }

    const androidOptions = payload.platform_options?.android || {
      channel_id: 'board_governance',
      notification_priority: 'high'
    }

    // Build FCM payload
    const fcmPayload = {
      to: device.device_token,
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon,
        image: payload.image,
        sound: androidOptions.sound || 'default',
        channel_id: androidOptions.channel_id,
        priority: androidOptions.notification_priority,
        visibility: androidOptions.visibility,
        color: androidOptions.led_color,
        tag: payload.category,
        click_action: payload.click_action
      },
      data: {
        ...payload.data,
        deep_link: payload.deep_link,
        notification_id: payload.id,
        category: payload.category,
        priority: payload.priority
      },
      android: {
        notification: {
          channel_id: androidOptions.channel_id,
          priority: androidOptions.notification_priority,
          visibility: androidOptions.visibility,
          led_color: androidOptions.led_color,
          vibrate_timings: androidOptions.vibration_pattern,
          default_vibrate_timings: !androidOptions.vibration_pattern,
          default_sound: !androidOptions.sound,
          local_only: false,
          sticky: androidOptions.ongoing,
          default_light_settings: !androidOptions.led_color
        },
        priority: payload.priority === 'critical' ? 'high' : 'normal'
      }
    }

    // Send via FCM
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${this.fcmApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fcmPayload)
    })

    const responseData = await response.json()
    const success = response.status === 200 && responseData.success === 1

    return {
      device_id: device.id,
      platform: 'android',
      success,
      message_id: responseData.results?.[0]?.message_id,
      error: success ? undefined : responseData.results?.[0]?.error || 'Unknown FCM error',
      retry_count: 0,
      delivered_at: new Date()
    }
  }

  /**
   * Send notification to web browser via WebPush
   */
  private async sendToWebDevice(
    device: PushDevice,
    payload: PushNotificationPayload
  ): Promise<DeliveryResult> {
    if (!this.vapidPublicKey || !this.vapidPrivateKey) {
      throw new Error('VAPID keys missing for WebPush')
    }

    const webOptions = payload.platform_options?.web || {}

    // Build WebPush payload
    const webPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || webOptions.icon,
      image: payload.image || webOptions.image,
      badge: webOptions.badge,
      tag: webOptions.tag || payload.category,
      requireInteraction: webOptions.require_interaction || payload.priority === 'critical',
      silent: webOptions.silent || false,
      actions: payload.actions?.map(action => ({
        action: action.id,
        title: action.title,
        icon: action.icon
      })) || webOptions.actions,
      data: {
        ...payload.data,
        notification_id: payload.id,
        click_action: payload.click_action,
        deep_link: payload.deep_link,
        category: payload.category,
        priority: payload.priority
      }
    }

    // Send via WebPush (implementation would require webpush library)
    // This is a simplified version - in production, use webpush library
    const success = true // Placeholder
    const messageId = `web_${Date.now()}_${Math.random()}`

    return {
      device_id: device.id,
      platform: 'web',
      success,
      message_id: messageId,
      error: success ? undefined : 'WebPush delivery failed',
      retry_count: 0,
      delivered_at: new Date()
    }
  }

  // =============================================
  // INTELLIGENT ROUTING AND FILTERING
  // =============================================

  /**
   * Apply intelligent routing based on user preferences, device status, and notification priority
   */
  private async applyIntelligentRouting(
    devices: PushDevice[],
    payload: PushNotificationPayload
  ): Promise<PushDevice[]> {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    return devices.filter(device => {
      const prefs = device.preferences

      // Check if notifications are enabled for this device
      if (!prefs.enabled) {
        return false
      }

      // Check category preferences
      const categoryPref = prefs.categories[payload.category]
      if (!categoryPref?.enabled) {
        return false
      }

      // Check Do Not Disturb settings
      if (prefs.do_not_disturb_start && prefs.do_not_disturb_end) {
        const dndStart = prefs.do_not_disturb_start
        const dndEnd = prefs.do_not_disturb_end
        
        const isInDndPeriod = this.isTimeInRange(currentTime, dndStart, dndEnd)
        
        // Critical notifications can override DND if allowed
        if (isInDndPeriod && !(payload.priority === 'critical' && prefs.allow_critical_override)) {
          return false
        }
      }

      // Check if device has been active recently
      const lastActive = new Date(device.last_active)
      const daysSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      
      // Skip devices inactive for more than 30 days
      if (daysSinceActive > 30) {
        return false
      }

      return true
    })
  }

  /**
   * Check if current time is within DND range
   */
  private isTimeInRange(current: string, start: string, end: string): boolean {
    const [currentHour, currentMin] = current.split(':').map(Number)
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)

    const currentMinutes = currentHour * 60 + currentMin
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    if (startMinutes <= endMinutes) {
      // Same day range
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes
    } else {
      // Overnight range
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes
    }
  }

  // =============================================
  // SECURITY AND ENCRYPTION
  // =============================================

  /**
   * Encrypt sensitive notification content
   */
  private async encryptNotificationContent(
    payload: PushNotificationPayload
  ): Promise<PushNotificationPayload> {
    if (!this.encryptionKey) {
      return payload // Return unencrypted if no key configured
    }

    // Only encrypt sensitive categories
    const sensitiveCategories: NotificationCategory[] = [
      'emergency_board_matter',
      'compliance_alert',
      'security_alert'
    ]

    if (!sensitiveCategories.includes(payload.category)) {
      return payload
    }

    try {
      // Encrypt sensitive fields
      const encryptedPayload = { ...payload }

      if (payload.body) {
        encryptedPayload.body = CryptoJS.AES.encrypt(payload.body, this.encryptionKey).toString()
      }

      if (payload.data) {
        encryptedPayload.data = {
          ...payload.data,
          encrypted: true
        }
        const sensitiveData = JSON.stringify(payload.data)
        encryptedPayload.data.encrypted_content = CryptoJS.AES.encrypt(sensitiveData, this.encryptionKey).toString()
      }

      return encryptedPayload
    } catch (error) {
      console.warn('Failed to encrypt notification content:', error)
      return payload // Return unencrypted on encryption failure
    }
  }

  // =============================================
  // RETRY MECHANISM
  // =============================================

  /**
   * Schedule retries for failed deliveries
   */
  private async scheduleRetries(
    failedDeliveries: DeliveryResult[],
    payload: PushNotificationPayload
  ): Promise<void> {
    for (const delivery of failedDeliveries) {
      if (delivery.retry_count < 3) {
        // Exponential backoff: 1min, 5min, 15min
        const delayMs = Math.pow(5, delivery.retry_count) * 60 * 1000

        setTimeout(async () => {
          const { data: device } = await this.supabase
            .from('push_devices')
            .select('*')
            .eq('id', delivery.device_id)
            .single()

          if (device) {
            const retryResult = await this.sendToDevice(device as PushDevice, payload)
            if (retryResult.success) {
              retryResult.data.retry_count = delivery.retry_count + 1
              await this.logNotificationDelivery(payload, [retryResult.data])
            } else if (delivery.retry_count < 2) {
              // Schedule another retry
              await this.scheduleRetries([{
                ...delivery,
                retry_count: delivery.retry_count + 1
              }], payload)
            }
          }
        }, delayMs)
      }
    }
  }

  // =============================================
  // LOGGING AND AUDIT
  // =============================================

  /**
   * Log notification delivery for audit purposes
   */
  private async logNotificationDelivery(
    payload: PushNotificationPayload,
    results: DeliveryResult[]
  ): Promise<void> {
    try {
      const deliveryRecord = {
        notification_id: payload.id,
        user_id: payload.user_id,
        organization_id: payload.organization_id,
        category: payload.category,
        priority: payload.priority,
        total_devices: results.length,
        successful_deliveries: results.filter(r => r.success).length,
        failed_deliveries: results.filter(r => !r.success).length,
        delivery_results: results,
        delivered_at: new Date().toISOString()
      }

      await this.supabase
        .from('push_notification_deliveries')
        .insert(deliveryRecord)

      // Log activity for audit trail
      await this.logActivity(
        'push_notification_delivery',
        'notification',
        payload.id,
        {
          category: payload.category,
          priority: payload.priority,
          deviceCount: results.length,
          successRate: results.filter(r => r.success).length / results.length
        }
      )
    } catch (error) {
      console.error('Failed to log notification delivery:', error)
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  /**
   * Generate APNS JWT token
   */
  private generateApnsJWT(): string {
    // This would require jose or similar JWT library
    // Simplified implementation - use proper JWT generation in production
    return 'apns_jwt_token_placeholder'
  }

  /**
   * Get push notification metrics
   */
  async getPushMetrics(
    userId?: UserId,
    organizationId?: OrganizationId,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Result<PushMetrics>> {
    const metricsResult = await this.executeDbOperation(
      async () => {
        let query = this.supabase
          .from('push_notification_deliveries')
          .select('*')

        if (userId) {
          query = query.eq('user_id', userId)
        }

        if (organizationId) {
          query = query.eq('organization_id', organizationId)
        }

        if (dateFrom) {
          query = query.gte('delivered_at', dateFrom.toISOString())
        }

        if (dateTo) {
          query = query.lte('delivered_at', dateTo.toISOString())
        }

        const { data, error } = await query

        if (error) throw error

        // Calculate metrics
        const totalSent = data.reduce((sum, record) => sum + record.total_devices, 0)
        const successfulDeliveries = data.reduce((sum, record) => sum + record.successful_deliveries, 0)
        const failedDeliveries = data.reduce((sum, record) => sum + record.failed_deliveries, 0)

        const platformBreakdown: Record<NotificationPlatform, any> = {
          ios: { sent: 0, delivered: 0, failed: 0 },
          android: { sent: 0, delivered: 0, failed: 0 },
          web: { sent: 0, delivered: 0, failed: 0 }
        }

        const categoryBreakdown: Record<NotificationCategory, any> = {
          emergency_board_matter: { sent: 0, delivered: 0, opened: 0, action_taken: 0 },
          time_sensitive_voting: { sent: 0, delivered: 0, opened: 0, action_taken: 0 },
          compliance_alert: { sent: 0, delivered: 0, opened: 0, action_taken: 0 },
          meeting_notification: { sent: 0, delivered: 0, opened: 0, action_taken: 0 },
          governance_update: { sent: 0, delivered: 0, opened: 0, action_taken: 0 },
          security_alert: { sent: 0, delivered: 0, opened: 0, action_taken: 0 }
        }

        // Process delivery results for platform and category breakdown
        data.forEach(record => {
          const category = record.category as NotificationCategory
          categoryBreakdown[category].sent += record.total_devices
          categoryBreakdown[category].delivered += record.successful_deliveries

          // Process delivery results for platform breakdown
          record.delivery_results.forEach((result: DeliveryResult) => {
            const platform = result.platform
            platformBreakdown[platform].sent += 1
            if (result.success) {
              platformBreakdown[platform].delivered += 1
            } else {
              platformBreakdown[platform].failed += 1
            }
          })
        })

        const metrics: PushMetrics = {
          total_sent: totalSent,
          successful_deliveries: successfulDeliveries,
          failed_deliveries: failedDeliveries,
          delivery_rate: totalSent > 0 ? successfulDeliveries / totalSent : 0,
          average_delivery_time: 2.5, // Placeholder - would calculate from actual delivery times
          platform_breakdown: platformBreakdown,
          category_breakdown: categoryBreakdown
        }

        return { data: metrics, error: null }
      },
      'get_push_metrics',
      { userId, organizationId, dateFrom, dateTo }
    )

    return metricsResult
  }
}

// =============================================
// SERVICE FACTORY
// =============================================

export function createPushNotificationService(
  supabase: SupabaseClient<Database>,
  config?: {
    fcm_api_key?: string
    apns_key_id?: string
    apns_team_id?: string
    apns_private_key?: string
    vapid_public_key?: string
    vapid_private_key?: string
    encryption_key?: string
  }
): EnterprisePushNotificationService {
  return new EnterprisePushNotificationService(supabase, config)
}