/**
 * Real-Time Notification Push System
 * Advanced notification system with WebSocket integration, push notifications,
 * intelligent batching, and cross-platform delivery
 * 
 * Features:
 * - Real-time WebSocket notifications
 * - Browser push notifications with service worker
 * - Email and SMS fallback for offline users
 * - Intelligent notification batching and grouping
 * - User preferences and do-not-disturb modes
 * - Notification analytics and delivery tracking
 * - Cross-device synchronization
 * - Rich notification templates
 */

import { EventEmitter } from 'events'
import { useWebSocketCollaboration } from '@/lib/websocket/websocket-client'
import { NotificationService } from '@/lib/services/notification.service'
import { useAuthStore } from '@/lib/stores/auth-store'
import { createNotificationId } from '@/lib/utils/branded-type-helpers'
import { logError, logActivity } from '@/lib/utils/logging'

export interface RealTimeNotification {
  id: string
  type: NotificationTypeEnum
  title: string
  message: string
  data?: Record<string, any>
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: NotificationCategoryEnum
  userId: string
  organizationId?: string
  resourceId?: string
  resourceType?: 'document' | 'meeting' | 'vault' | 'user' | 'board'
  actionUrl?: string
  actionText?: string
  imageUrl?: string
  timestamp: string
  expiresAt?: string
  deliveryMethods: ('websocket' | 'push' | 'email' | 'sms')[]
  deliveryStatus: {
    websocket?: 'pending' | 'delivered' | 'failed'
    push?: 'pending' | 'delivered' | 'failed'
    email?: 'pending' | 'delivered' | 'failed'
    sms?: 'pending' | 'delivered' | 'failed'
  }
  readAt?: string
  clickedAt?: string
  dismissedAt?: string
  groupKey?: string
  metadata?: Record<string, any>
}

export enum NotificationTypeEnum {
  DOCUMENT_SHARED = 'document_shared',
  DOCUMENT_COMMENTED = 'document_commented',
  DOCUMENT_EDITED = 'document_edited',
  MEETING_SCHEDULED = 'meeting_scheduled',
  MEETING_REMINDER = 'meeting_reminder',
  MEETING_STARTED = 'meeting_started',
  MEETING_CANCELLED = 'meeting_cancelled',
  VAULT_ACCESS_GRANTED = 'vault_access_granted',
  VAULT_ACCESS_REVOKED = 'vault_access_revoked',
  USER_MENTIONED = 'user_mentioned',
  USER_INVITED = 'user_invited',
  BOARD_DECISION_REQUIRED = 'board_decision_required',
  COMPLIANCE_DEADLINE = 'compliance_deadline',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  SYSTEM_ALERT = 'system_alert',
  SECURITY_ALERT = 'security_alert'
}

export enum NotificationCategoryEnum {
  COLLABORATION = 'collaboration',
  MEETINGS = 'meetings',
  DOCUMENTS = 'documents',
  SECURITY = 'security',
  SYSTEM = 'system',
  SOCIAL = 'social',
  TASKS = 'tasks'
}

interface NotificationTemplate {
  title: (data: any) => string
  message: (data: any) => string
  actionText?: (data: any) => string
  actionUrl?: (data: any) => string
  imageUrl?: (data: any) => string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: NotificationCategoryEnum
  deliveryMethods: ('websocket' | 'push' | 'email' | 'sms')[]
  groupingKey?: (data: any) => string
  expiryHours?: number
}

interface UserNotificationPreferences {
  userId: string
  globalEnabled: boolean
  doNotDisturb: boolean
  quietHours: {
    enabled: boolean
    startTime: string // HH:mm format
    endTime: string // HH:mm format
    timezone: string
  }
  categories: Record<NotificationCategoryEnum, {
    enabled: boolean
    websocket: boolean
    push: boolean
    email: boolean
    sms: boolean
    priority: 'low' | 'normal' | 'high' | 'urgent'
  }>
  devices: Array<{
    id: string
    type: 'web' | 'mobile' | 'desktop'
    endpoint: string
    keys: any
    active: boolean
    lastSeen: string
  }>
}

interface NotificationBatch {
  groupKey: string
  notifications: RealTimeNotification[]
  createdAt: string
  scheduledFor: string
  delivered: boolean
}

const NOTIFICATION_TEMPLATES: Record<NotificationTypeEnum, NotificationTemplate> = {
  [NotificationTypeEnum.DOCUMENT_SHARED]: {
    title: (data) => `Document shared: ${data.documentName}`,
    message: (data) => `${data.sharerName} shared "${data.documentName}" with you`,
    actionText: () => 'View Document',
    actionUrl: (data) => `/vaults/${data.vaultId}/documents/${data.documentId}`,
    priority: 'normal',
    category: NotificationCategoryEnum.DOCUMENTS,
    deliveryMethods: ['websocket', 'push', 'email'],
    groupingKey: (data) => `document-${data.documentId}`,
    expiryHours: 168 // 7 days
  },
  [NotificationTypeEnum.USER_MENTIONED]: {
    title: (data) => `You were mentioned`,
    message: (data) => `${data.mentionerName} mentioned you in ${data.contextName}`,
    actionText: () => 'View Context',
    actionUrl: (data) => data.contextUrl,
    priority: 'high',
    category: NotificationCategoryEnum.SOCIAL,
    deliveryMethods: ['websocket', 'push', 'email'],
    expiryHours: 72 // 3 days
  },
  [NotificationTypeEnum.MEETING_REMINDER]: {
    title: (data) => `Meeting reminder: ${data.meetingTitle}`,
    message: (data) => `Your meeting starts in ${data.timeUntil}`,
    actionText: () => 'Join Meeting',
    actionUrl: (data) => `/meetings/${data.meetingId}`,
    priority: 'urgent',
    category: NotificationCategoryEnum.MEETINGS,
    deliveryMethods: ['websocket', 'push', 'email', 'sms'],
    expiryHours: 2
  },
  [NotificationTypeEnum.SECURITY_ALERT]: {
    title: () => 'Security Alert',
    message: (data) => data.alertMessage,
    actionText: () => 'Review Security',
    actionUrl: () => '/settings/security',
    priority: 'urgent',
    category: NotificationCategoryEnum.SECURITY,
    deliveryMethods: ['websocket', 'push', 'email', 'sms'],
    expiryHours: 24
  },
  // ... other templates (abbreviated for brevity)
  [NotificationTypeEnum.DOCUMENT_COMMENTED]: {
    title: (data) => `New comment on ${data.documentName}`,
    message: (data) => `${data.commenterName}: ${data.commentPreview}`,
    actionText: () => 'View Comment',
    actionUrl: (data) => data.commentUrl,
    priority: 'normal',
    category: NotificationCategoryEnum.COLLABORATION,
    deliveryMethods: ['websocket', 'push'],
    groupingKey: (data) => `document-comments-${data.documentId}`,
    expiryHours: 48
  },
  [NotificationTypeEnum.MEETING_SCHEDULED]: {
    title: (data) => `Meeting scheduled: ${data.meetingTitle}`,
    message: (data) => `Meeting on ${data.meetingDate} at ${data.meetingTime}`,
    actionText: () => 'View Meeting',
    actionUrl: (data) => `/meetings/${data.meetingId}`,
    priority: 'normal',
    category: NotificationCategoryEnum.MEETINGS,
    deliveryMethods: ['websocket', 'push', 'email'],
    expiryHours: 168
  },
  [NotificationTypeEnum.VAULT_ACCESS_GRANTED]: {
    title: (data) => `Vault access granted: ${data.vaultName}`,
    message: (data) => `You now have ${data.accessLevel} access to ${data.vaultName}`,
    actionText: () => 'Open Vault',
    actionUrl: (data) => `/vaults/${data.vaultId}`,
    priority: 'normal',
    category: NotificationCategoryEnum.DOCUMENTS,
    deliveryMethods: ['websocket', 'push', 'email'],
    expiryHours: 72
  },
  [NotificationTypeEnum.TASK_ASSIGNED]: {
    title: (data) => `Task assigned: ${data.taskTitle}`,
    message: (data) => `${data.assignerName} assigned you a task due ${data.dueDate}`,
    actionText: () => 'View Task',
    actionUrl: (data) => data.taskUrl,
    priority: 'high',
    category: NotificationCategoryEnum.TASKS,
    deliveryMethods: ['websocket', 'push', 'email'],
    expiryHours: 168
  },
  [NotificationTypeEnum.COMPLIANCE_DEADLINE]: {
    title: (data) => `Compliance deadline: ${data.requirementName}`,
    message: (data) => `Due in ${data.timeRemaining}`,
    actionText: () => 'Complete Now',
    actionUrl: (data) => data.complianceUrl,
    priority: 'urgent',
    category: NotificationCategoryEnum.SYSTEM,
    deliveryMethods: ['websocket', 'push', 'email', 'sms'],
    expiryHours: 6
  },
  [NotificationTypeEnum.DOCUMENT_EDITED]: {
    title: (data) => `Document updated: ${data.documentName}`,
    message: (data) => `${data.editorName} made changes`,
    actionText: () => 'View Changes',
    actionUrl: (data) => data.documentUrl,
    priority: 'low',
    category: NotificationCategoryEnum.COLLABORATION,
    deliveryMethods: ['websocket'],
    groupingKey: (data) => `document-edits-${data.documentId}`,
    expiryHours: 24
  },
  [NotificationTypeEnum.MEETING_STARTED]: {
    title: (data) => `Meeting started: ${data.meetingTitle}`,
    message: (data) => `The meeting has begun`,
    actionText: () => 'Join Now',
    actionUrl: (data) => data.meetingUrl,
    priority: 'urgent',
    category: NotificationCategoryEnum.MEETINGS,
    deliveryMethods: ['websocket', 'push'],
    expiryHours: 1
  },
  [NotificationTypeEnum.MEETING_CANCELLED]: {
    title: (data) => `Meeting cancelled: ${data.meetingTitle}`,
    message: (data) => `The meeting scheduled for ${data.meetingTime} has been cancelled`,
    priority: 'normal',
    category: NotificationCategoryEnum.MEETINGS,
    deliveryMethods: ['websocket', 'push', 'email'],
    expiryHours: 24
  },
  [NotificationTypeEnum.VAULT_ACCESS_REVOKED]: {
    title: (data) => `Vault access revoked: ${data.vaultName}`,
    message: (data) => `Your access to ${data.vaultName} has been revoked`,
    priority: 'high',
    category: NotificationCategoryEnum.SECURITY,
    deliveryMethods: ['websocket', 'push', 'email'],
    expiryHours: 48
  },
  [NotificationTypeEnum.USER_INVITED]: {
    title: (data) => `Invitation to join ${data.organizationName}`,
    message: (data) => `${data.inviterName} invited you to join as ${data.role}`,
    actionText: () => 'Accept Invitation',
    actionUrl: (data) => data.invitationUrl,
    priority: 'high',
    category: NotificationCategoryEnum.SOCIAL,
    deliveryMethods: ['email', 'sms'],
    expiryHours: 168
  },
  [NotificationTypeEnum.BOARD_DECISION_REQUIRED]: {
    title: (data) => `Board decision required: ${data.proposalTitle}`,
    message: (data) => `Your vote is needed`,
    actionText: () => 'Review & Vote',
    actionUrl: (data) => data.proposalUrl,
    priority: 'urgent',
    category: NotificationCategoryEnum.SYSTEM,
    deliveryMethods: ['websocket', 'push', 'email', 'sms'],
    expiryHours: 48
  },
  [NotificationTypeEnum.TASK_COMPLETED]: {
    title: (data) => `Task completed: ${data.taskTitle}`,
    message: (data) => `${data.completerName} completed the task`,
    actionText: () => 'View Task',
    actionUrl: (data) => data.taskUrl,
    priority: 'low',
    category: NotificationCategoryEnum.TASKS,
    deliveryMethods: ['websocket'],
    expiryHours: 48
  },
  [NotificationTypeEnum.SYSTEM_ALERT]: {
    title: (data) => data.alertTitle,
    message: (data) => data.alertMessage,
    actionText: (data) => data.actionText,
    actionUrl: (data) => data.actionUrl,
    priority: 'high',
    category: NotificationCategoryEnum.SYSTEM,
    deliveryMethods: ['websocket', 'push', 'email'],
    expiryHours: 72
  }
}

export class RealTimeNotificationManager extends EventEmitter {
  private notificationService: NotificationService
  private webSocketClient: any = null
  private notificationQueue: RealTimeNotification[] = []
  private batchQueue: Map<string, NotificationBatch> = new Map()
  private userPreferences: Map<string, UserNotificationPreferences> = new Map()
  private deliveryTimers: Map<string, NodeJS.Timeout> = new Map()
  private isOnline: boolean = navigator.onLine
  private swRegistration: ServiceWorkerRegistration | null = null

  constructor(notificationService: NotificationService) {
    super()
    this.notificationService = notificationService
    this.initialize()
  }

  private async initialize(): Promise<void> {
    // Register service worker for push notifications
    await this.registerServiceWorker()
    
    // Setup online/offline listeners
    window.addEventListener('online', () => {
      this.isOnline = true
      this.processOfflineQueue()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    // Setup visibility change handler
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.syncNotifications()
      }
    })

    // Process batched notifications every 30 seconds
    setInterval(() => {
      this.processBatchedNotifications()
    }, 30000)
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.register('/sw-notifications.js')
        this.swRegistration = registration
        console.log('[NotificationManager] Service worker registered')
      } catch (error) {
        console.error('[NotificationManager] Service worker registration failed:', error)
      }
    }
  }

  public setWebSocketClient(client: any): void {
    this.webSocketClient = client
    
    if (client) {
      // Listen for notification events from WebSocket
      client.on('notification_received', (notification: RealTimeNotification) => {
        this.handleIncomingNotification(notification)
      })
      
      client.on('notification_read', (data: { notificationId: string; userId: string }) => {
        this.markAsRead(data.notificationId, data.userId)
      })
    }
  }

  public async sendNotification(
    type: NotificationTypeEnum,
    userId: string,
    data: Record<string, any>,
    options?: {
      organizationId?: string
      resourceId?: string
      resourceType?: string
      priority?: 'low' | 'normal' | 'high' | 'urgent'
      deliveryMethods?: ('websocket' | 'push' | 'email' | 'sms')[]
      expiresAt?: string
      groupKey?: string
    }
  ): Promise<RealTimeNotification> {
    const template = NOTIFICATION_TEMPLATES[type]
    if (!template) {
      throw new Error(`No template found for notification type: ${type}`)
    }

    // Get user preferences
    const preferences = await this.getUserPreferences(userId)
    
    // Check if notifications are enabled for this category
    const categoryPrefs = preferences.categories[template.category]
    if (!categoryPrefs.enabled || !preferences.globalEnabled) {
      console.log(`[NotificationManager] Notifications disabled for user ${userId}, category ${template.category}`)
      return this.createNotificationObject(type, userId, data, template, options)
    }

    // Check do not disturb
    if (this.isInDoNotDisturbMode(preferences)) {
      console.log(`[NotificationManager] User ${userId} is in do not disturb mode`)
      return this.createNotificationObject(type, userId, data, template, options)
    }

    // Create notification object
    const notification = this.createNotificationObject(type, userId, data, template, options)
    
    // Apply user delivery method preferences
    notification.deliveryMethods = notification.deliveryMethods.filter(method => {
      return categoryPrefs[method] || false
    })

    // Check if we should batch this notification
    if (notification.groupKey) {
      this.addToBatch(notification)
    } else {
      await this.deliverNotification(notification)
    }

    return notification
  }

  private createNotificationObject(
    type: NotificationTypeEnum,
    userId: string,
    data: Record<string, any>,
    template: NotificationTemplate,
    options?: any
  ): RealTimeNotification {
    const notification: RealTimeNotification = {
      id: createNotificationId(`${type}-${Date.now()}-${Math.random()}`).toString(),
      type,
      title: template.title(data),
      message: template.message(data),
      data,
      priority: options?.priority || template.priority,
      category: template.category,
      userId,
      organizationId: options?.organizationId,
      resourceId: options?.resourceId,
      resourceType: options?.resourceType,
      actionUrl: template.actionUrl?.(data),
      actionText: template.actionText?.(data),
      imageUrl: template.imageUrl?.(data),
      timestamp: new Date().toISOString(),
      expiresAt: options?.expiresAt || (template.expiryHours 
        ? new Date(Date.now() + template.expiryHours * 60 * 60 * 1000).toISOString() 
        : undefined),
      deliveryMethods: options?.deliveryMethods || template.deliveryMethods,
      deliveryStatus: {},
      groupKey: options?.groupKey || template.groupingKey?.(data),
      metadata: {
        template: type,
        createdAt: new Date().toISOString()
      }
    }

    return notification
  }

  private addToBatch(notification: RealTimeNotification): void {
    const batchKey = notification.groupKey!
    let batch = this.batchQueue.get(batchKey)
    
    if (!batch) {
      batch = {
        groupKey: batchKey,
        notifications: [],
        createdAt: new Date().toISOString(),
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minute delay
        delivered: false
      }
      this.batchQueue.set(batchKey, batch)
    }

    batch.notifications.push(notification)

    // Schedule delivery timer
    if (!this.deliveryTimers.has(batchKey)) {
      const timer = setTimeout(() => {
        this.deliverBatch(batchKey)
        this.deliveryTimers.delete(batchKey)
      }, 5 * 60 * 1000) // 5 minutes
      
      this.deliveryTimers.set(batchKey, timer)
    }
  }

  private async deliverBatch(batchKey: string): Promise<void> {
    const batch = this.batchQueue.get(batchKey)
    if (!batch || batch.delivered) return

    const notifications = batch.notifications
    if (notifications.length === 0) return

    // Create a summary notification for batched items
    if (notifications.length > 1) {
      const firstNotification = notifications[0]
      const summaryNotification: RealTimeNotification = {
        ...firstNotification,
        id: createNotificationId(`batch-${batchKey}-${Date.now()}`).toString(),
        title: this.createBatchTitle(notifications),
        message: this.createBatchMessage(notifications),
        data: { 
          ...firstNotification.data, 
          batchedNotifications: notifications.map(n => n.id),
          batchCount: notifications.length 
        }
      }

      await this.deliverNotification(summaryNotification)
    } else {
      await this.deliverNotification(notifications[0])
    }

    batch.delivered = true
    this.batchQueue.delete(batchKey)
  }

  private createBatchTitle(notifications: RealTimeNotification[]): string {
    const firstNotification = notifications[0]
    const count = notifications.length

    switch (firstNotification.category) {
      case NotificationCategoryEnum.DOCUMENTS:
        return `${count} document updates`
      case NotificationCategoryEnum.COLLABORATION:
        return `${count} new comments`
      case NotificationCategoryEnum.MEETINGS:
        return `${count} meeting updates`
      default:
        return `${count} new notifications`
    }
  }

  private createBatchMessage(notifications: RealTimeNotification[]): string {
    const uniqueAuthors = new Set(notifications.map(n => n.data?.authorName || n.data?.userName).filter(Boolean))
    const authorCount = uniqueAuthors.size

    if (authorCount === 1) {
      return `From ${Array.from(uniqueAuthors)[0]}`
    } else if (authorCount === 2) {
      return `From ${Array.from(uniqueAuthors).join(' and ')}`
    } else {
      return `From ${authorCount} people`
    }
  }

  private async deliverNotification(notification: RealTimeNotification): Promise<void> {
    console.log(`[NotificationManager] Delivering notification ${notification.id}:`, notification)

    // Deliver via each requested method
    for (const method of notification.deliveryMethods) {
      try {
        notification.deliveryStatus[method] = 'pending'
        
        switch (method) {
          case 'websocket':
            await this.deliverViaWebSocket(notification)
            break
          case 'push':
            await this.deliverViaPush(notification)
            break
          case 'email':
            await this.deliverViaEmail(notification)
            break
          case 'sms':
            await this.deliverViaSMS(notification)
            break
        }
        
        notification.deliveryStatus[method] = 'delivered'
      } catch (error) {
        console.error(`[NotificationManager] Failed to deliver via ${method}:`, error)
        notification.deliveryStatus[method] = 'failed'
        logError(`Notification delivery failed via ${method}`, error)
      }
    }

    // Store notification for history
    await this.storeNotification(notification)
    
    // Emit event
    this.emit('notification_delivered', notification)

    // Log activity
    await logActivity({
      userId: notification.userId,
      action: 'notification_delivered',
      details: {
        notificationId: notification.id,
        type: notification.type,
        deliveryMethods: notification.deliveryMethods,
        deliveryStatus: notification.deliveryStatus
      }
    })
  }

  private async deliverViaWebSocket(notification: RealTimeNotification): Promise<void> {
    if (!this.webSocketClient || !this.isOnline) {
      throw new Error('WebSocket not available')
    }

    // Send via WebSocket
    this.webSocketClient.emit('notification_push', notification)
  }

  private async deliverViaPush(notification: RealTimeNotification): Promise<void> {
    if (!this.swRegistration || !('showNotification' in this.swRegistration)) {
      throw new Error('Push notifications not supported')
    }

    // Request permission if needed
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Push notification permission denied')
      }
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Push notifications not permitted')
    }

    // Show notification
    await this.swRegistration.showNotification(notification.title, {
      body: notification.message,
      icon: notification.imageUrl || '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        notificationId: notification.id,
        actionUrl: notification.actionUrl,
        ...notification.data
      },
      actions: notification.actionText && notification.actionUrl ? [{
        action: 'open',
        title: notification.actionText
      }] : undefined,
      requireInteraction: notification.priority === 'urgent',
      silent: notification.priority === 'low',
      tag: notification.groupKey || notification.id,
      renotify: true,
      timestamp: new Date(notification.timestamp).getTime()
    })
  }

  private async deliverViaEmail(notification: RealTimeNotification): Promise<void> {
    // Use existing notification service for email delivery
    await this.notificationService.sendEmailNotification({
      userId: createUserId(notification.userId),
      subject: notification.title,
      content: notification.message,
      actionUrl: notification.actionUrl,
      actionText: notification.actionText,
      priority: notification.priority,
      metadata: notification.metadata
    })
  }

  private async deliverViaSMS(notification: RealTimeNotification): Promise<void> {
    // Use existing notification service for SMS delivery
    await this.notificationService.sendSMSNotification({
      userId: createUserId(notification.userId),
      message: `${notification.title}: ${notification.message}`,
      priority: notification.priority
    })
  }

  private async storeNotification(notification: RealTimeNotification): Promise<void> {
    // Store notification in database for history
    // This would integrate with your notification repository
    console.log(`[NotificationManager] Storing notification ${notification.id}`)
  }

  private handleIncomingNotification(notification: RealTimeNotification): void {
    console.log(`[NotificationManager] Handling incoming notification:`, notification)
    
    // Emit to UI components
    this.emit('notification_received', notification)
    
    // Show in-app notification if page is visible
    if (!document.hidden) {
      this.showInAppNotification(notification)
    }
  }

  private showInAppNotification(notification: RealTimeNotification): void {
    // Create and show in-app notification toast
    const event = new CustomEvent('show-notification', {
      detail: notification
    })
    window.dispatchEvent(event)
  }

  public async markAsRead(notificationId: string, userId: string): Promise<void> {
    // Update read status in database and sync across devices
    if (this.webSocketClient) {
      this.webSocketClient.emit('notification_read', { notificationId, userId })
    }
    
    this.emit('notification_read', { notificationId, userId })
  }

  public async markAsClicked(notificationId: string, userId: string): Promise<void> {
    // Track notification click analytics
    await logActivity({
      userId,
      action: 'notification_clicked',
      details: { notificationId }
    })
    
    this.emit('notification_clicked', { notificationId, userId })
  }

  private async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    // Check cache first
    if (this.userPreferences.has(userId)) {
      return this.userPreferences.get(userId)!
    }

    // Load from database/service
    // This is a simplified implementation - in practice, load from your user service
    const defaultPreferences: UserNotificationPreferences = {
      userId,
      globalEnabled: true,
      doNotDisturb: false,
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      categories: {
        [NotificationCategoryEnum.COLLABORATION]: {
          enabled: true, websocket: true, push: true, email: false, sms: false, priority: 'normal'
        },
        [NotificationCategoryEnum.MEETINGS]: {
          enabled: true, websocket: true, push: true, email: true, sms: false, priority: 'high'
        },
        [NotificationCategoryEnum.DOCUMENTS]: {
          enabled: true, websocket: true, push: true, email: false, sms: false, priority: 'normal'
        },
        [NotificationCategoryEnum.SECURITY]: {
          enabled: true, websocket: true, push: true, email: true, sms: true, priority: 'urgent'
        },
        [NotificationCategoryEnum.SYSTEM]: {
          enabled: true, websocket: true, push: true, email: true, sms: false, priority: 'high'
        },
        [NotificationCategoryEnum.SOCIAL]: {
          enabled: true, websocket: true, push: true, email: false, sms: false, priority: 'normal'
        },
        [NotificationCategoryEnum.TASKS]: {
          enabled: true, websocket: true, push: true, email: false, sms: false, priority: 'normal'
        }
      },
      devices: []
    }

    this.userPreferences.set(userId, defaultPreferences)
    return defaultPreferences
  }

  private isInDoNotDisturbMode(preferences: UserNotificationPreferences): boolean {
    if (!preferences.doNotDisturb && !preferences.quietHours.enabled) {
      return false
    }

    if (preferences.doNotDisturb) {
      return true
    }

    if (preferences.quietHours.enabled) {
      const now = new Date()
      const timezone = preferences.quietHours.timezone
      const startTime = preferences.quietHours.startTime
      const endTime = preferences.quietHours.endTime
      
      // Simple quiet hours check (could be more sophisticated)
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
      
      return currentTime >= startTime || currentTime <= endTime
    }

    return false
  }

  private async processOfflineQueue(): Promise<void> {
    if (this.notificationQueue.length === 0) return

    console.log(`[NotificationManager] Processing ${this.notificationQueue.length} queued notifications`)
    
    const queue = [...this.notificationQueue]
    this.notificationQueue = []
    
    for (const notification of queue) {
      try {
        await this.deliverNotification(notification)
      } catch (error) {
        console.error('[NotificationManager] Failed to deliver queued notification:', error)
        // Re-queue if still relevant
        if (!notification.expiresAt || new Date(notification.expiresAt) > new Date()) {
          this.notificationQueue.push(notification)
        }
      }
    }
  }

  private async syncNotifications(): Promise<void> {
    // Sync read/dismissed status across devices
    if (this.webSocketClient) {
      this.webSocketClient.emit('sync_notifications')
    }
  }

  private processBatchedNotifications(): void {
    const now = new Date()
    
    for (const [batchKey, batch] of this.batchQueue.entries()) {
      if (!batch.delivered && new Date(batch.scheduledFor) <= now) {
        this.deliverBatch(batchKey)
      }
    }
  }

  // Public API methods
  public getNotificationStats(): {
    queuedCount: number
    batchedCount: number
    deliveredCount: number
  } {
    const batchedCount = Array.from(this.batchQueue.values())
      .reduce((sum, batch) => sum + batch.notifications.length, 0)
    
    return {
      queuedCount: this.notificationQueue.length,
      batchedCount,
      deliveredCount: 0 // Would track this in a real implementation
    }
  }

  public clearBatch(groupKey: string): void {
    const timer = this.deliveryTimers.get(groupKey)
    if (timer) {
      clearTimeout(timer)
      this.deliveryTimers.delete(groupKey)
    }
    this.batchQueue.delete(groupKey)
  }

  public async updateUserPreferences(userId: string, preferences: Partial<UserNotificationPreferences>): Promise<void> {
    const existing = await this.getUserPreferences(userId)
    const updated = { ...existing, ...preferences }
    this.userPreferences.set(userId, updated)
    
    // Persist to database
    // await this.notificationService.updateUserPreferences(userId, updated)
  }
}

// React Hook for using the notification system
import { useState, useEffect, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase-client'

export function useRealTimeNotifications() {
  const { user } = useAuthStore()
  const { client } = useWebSocketCollaboration()
  const [manager] = useState(() => new RealTimeNotificationManager(new NotificationService(createSupabaseClient())))
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (client) {
      manager.setWebSocketClient(client)
    }

    const handleNotificationReceived = (notification: RealTimeNotification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 99)]) // Keep last 100
      if (!notification.readAt) {
        setUnreadCount(prev => prev + 1)
      }
    }

    const handleNotificationRead = ({ notificationId }: { notificationId: string }) => {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    manager.on('notification_received', handleNotificationReceived)
    manager.on('notification_read', handleNotificationRead)

    return () => {
      manager.off('notification_received', handleNotificationReceived)
      manager.off('notification_read', handleNotificationRead)
    }
  }, [client, manager])

  const markAsRead = useCallback((notificationId: string) => {
    if (user) {
      manager.markAsRead(notificationId, user.id)
    }
  }, [manager, user])

  const markAsClicked = useCallback((notificationId: string) => {
    if (user) {
      manager.markAsClicked(notificationId, user.id)
    }
  }, [manager, user])

  const sendNotification = useCallback((
    type: NotificationTypeEnum,
    userId: string,
    data: Record<string, any>,
    options?: any
  ) => {
    return manager.sendNotification(type, userId, data, options)
  }, [manager])

  return {
    manager,
    notifications,
    unreadCount,
    markAsRead,
    markAsClicked,
    sendNotification,
    stats: manager.getNotificationStats()
  }
}

// Export types and constants
export {
  NOTIFICATION_TEMPLATES,
  RealTimeNotificationManager,
  type NotificationTemplate,
  type UserNotificationPreferences,
  type NotificationBatch
}

// Helper function to create ID from string
function createUserId(id: string) {
  return id as any // Simplified for this example
}