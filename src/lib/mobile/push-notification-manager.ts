/**
 * Push Notification Manager for Mobile App
 * Handles push notification subscriptions, permissions, and delivery
 */

export interface NotificationPermission {
  state: 'granted' | 'denied' | 'default';
  canRequest: boolean;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPreferences {
  general: { enabled: boolean };
  assetUpdates: { enabled: boolean };
  meetingReminders: { enabled: boolean };
  organizationInvites: { enabled: boolean };
  systemAlerts: { enabled: boolean };
  marketingUpdates: { enabled: boolean };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: any;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export class PushNotificationManager {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private preferences: NotificationPreferences | null = null;
  private listeners = new Map<string, Set<Function>>();

  constructor() {
    this.init();
  }

  /**
   * Initialize push notification manager
   */
  private async init(): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
      this.subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      // Set up message listener
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });

    } catch (error) {
      console.error('Push notification init failed:', error);
    }
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Get current permission state
   */
  getPermissionState(): NotificationPermission {
    if (!this.isSupported()) {
      return { state: 'denied', canRequest: false };
    }

    const permission = Notification.permission;
    const canRequest = permission === 'default';

    return {
      state: permission as 'granted' | 'denied' | 'default',
      canRequest,
    };
  }

  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<'granted' | 'denied' | 'default'> {
    if (!this.isSupported()) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        this.emit('permission-granted');
      } else {
        this.emit('permission-denied');
      }

      return permission;
    } catch (error) {
      console.error('Permission request failed:', error);
      return 'denied';
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      throw new Error('Service worker not available');
    }

    if (Notification.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      this.subscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
        },
      };

      this.emit('subscribed', this.subscription);
      return this.subscription;

    } catch (error) {
      console.error('Push subscription failed:', error);
      this.emit('subscription-failed', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.serviceWorkerRegistration) {
      return false;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (subscription) {
        const success = await subscription.unsubscribe();
        
        if (success) {
          this.subscription = null;
          this.emit('unsubscribed');
        }

        return success;
      }

      return true;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (this.subscription) {
      return this.subscription;
    }

    if (!this.serviceWorkerRegistration) {
      return null;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (subscription) {
        this.subscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
          },
        };
      }

      return this.subscription;
    } catch (error) {
      console.error('Get subscription failed:', error);
      return null;
    }
  }

  /**
   * Check if currently subscribed
   */
  async isSubscribed(): Promise<boolean> {
    const subscription = await this.getSubscription();
    return subscription !== null;
  }

  /**
   * Set notification preferences
   */
  async setPreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.getDefaultPreferences(), ...preferences };
    this.emit('preferences-updated', this.preferences);
  }

  /**
   * Get notification preferences
   */
  getPreferences(): NotificationPreferences {
    return this.preferences || this.getDefaultPreferences();
  }

  /**
   * Show local notification
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    if (!this.serviceWorkerRegistration) {
      throw new Error('Service worker not available');
    }

    // Check preferences
    const type = payload.data?.type || 'general';
    if (!this.shouldShowNotification(type)) {
      return;
    }

    try {
      await this.serviceWorkerRegistration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        tag: payload.tag,
        requireInteraction: payload.requireInteraction,
        actions: payload.actions,
        data: payload.data,
        vibrate: [200, 100, 200],
        timestamp: Date.now(),
      });

      this.emit('notification-shown', payload);

    } catch (error) {
      console.error('Show notification failed:', error);
      this.emit('notification-error', error);
    }
  }

  /**
   * Handle notification click actions
   */
  async handleNotificationClick(event: any): Promise<void> {
    const { notification, action } = event;
    
    // Close notification
    notification.close();

    // Handle action
    switch (action) {
      case 'open':
        // Open app
        const clients = await (self as any).clients.matchAll({ type: 'window' });
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          (self as any).clients.openWindow('/dashboard');
        }
        break;

      case 'dismiss':
        // Just close notification
        break;

      default:
        // Handle custom actions
        this.emit('notification-action', { notification, action });
    }
  }

  /**
   * Schedule notification
   */
  async scheduleNotification(payload: NotificationPayload, delay: number): Promise<void> {
    setTimeout(() => {
      this.showNotification(payload);
    }, delay);
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      return;
    }

    try {
      const notifications = await this.serviceWorkerRegistration.getNotifications();
      notifications.forEach(notification => notification.close());
      
      this.emit('notifications-cleared');
    } catch (error) {
      console.error('Clear notifications failed:', error);
    }
  }

  /**
   * Get active notifications
   */
  async getActiveNotifications(): Promise<Notification[]> {
    if (!this.serviceWorkerRegistration) {
      return [];
    }

    try {
      return await this.serviceWorkerRegistration.getNotifications();
    } catch (error) {
      console.error('Get notifications failed:', error);
      return [];
    }
  }

  /**
   * Test notifications
   */
  async testNotification(): Promise<boolean> {
    try {
      await this.showNotification({
        title: 'BoardGuru Test',
        body: 'This is a test notification',
        tag: 'test',
        data: { type: 'test' },
      });
      return true;
    } catch (error) {
      console.error('Test notification failed:', error);
      return false;
    }
  }

  /**
   * Enable quiet hours
   */
  setQuietHours(enabled: boolean, start?: string, end?: string): void {
    const preferences = this.getPreferences();
    preferences.quietHours = {
      enabled,
      start: start || '22:00',
      end: end || '08:00',
    };
    this.setPreferences(preferences);
  }

  /**
   * Check if currently in quiet hours
   */
  isQuietTime(): boolean {
    const preferences = this.getPreferences();
    
    if (!preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Crosses midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Private helper methods
   */
  private shouldShowNotification(type: string): boolean {
    const preferences = this.getPreferences();
    
    // Check quiet hours
    if (this.isQuietTime()) {
      return type === 'systemAlerts'; // Only show critical alerts during quiet hours
    }

    // Check type preferences
    const typePrefs = preferences[type as keyof NotificationPreferences];
    return typePrefs && typeof typePrefs === 'object' && 'enabled' in typePrefs 
      ? typePrefs.enabled 
      : true;
  }

  private getDefaultPreferences(): NotificationPreferences {
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

  private handleServiceWorkerMessage(message: any): void {
    switch (message.type) {
      case 'NOTIFICATION_CLICKED':
        this.emit('notification-clicked', message.data);
        break;
      case 'NOTIFICATION_CLOSED':
        this.emit('notification-closed', message.data);
        break;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Event listener management
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in push notification event listener for '${event}':`, error);
      }
    });
  }

  /**
   * Get notification analytics
   */
  async getAnalytics(): Promise<{
    totalSent: number;
    totalClicked: number;
    clickRate: number;
    subscriptionStatus: 'active' | 'inactive';
  }> {
    // In a real implementation, this would fetch from analytics API
    return {
      totalSent: 0,
      totalClicked: 0,
      clickRate: 0,
      subscriptionStatus: await this.isSubscribed() ? 'active' : 'inactive',
    };
  }
}

// Create singleton instance
export const pushNotificationManager = new PushNotificationManager();
export default pushNotificationManager;