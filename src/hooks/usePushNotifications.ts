/**
 * Push Notifications Hook
 * 
 * React hook for managing push notifications in the enterprise board governance system.
 * Provides device registration, preference management, and notification sending capabilities.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/features/shared/ui/use-toast';
import type { 
  PushDevice, 
  NotificationCategory, 
  NotificationPriority, 
  DevicePreferences,
  NotificationPlatform 
} from '@/lib/services/push-notification.service';

// Interfaces for hook options and state
interface UsePushNotificationsOptions {
  autoRegister?: boolean; // Auto-register device on first load
  enableServiceWorker?: boolean; // Enable service worker for web push
  vapidPublicKey?: string; // VAPID public key for web push
  debug?: boolean; // Enable debug logging
}

interface PushNotificationState {
  devices: PushDevice[];
  currentDevice: PushDevice | null;
  isSupported: boolean;
  isRegistered: boolean;
  permission: NotificationPermission;
  loading: boolean;
  error: string | null;
}

interface SendNotificationOptions {
  userId: string;
  organizationId?: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  image?: string;
  icon?: string;
  actions?: Array<{
    id: string;
    title: string;
    icon?: string;
  }>;
  clickAction?: string;
  deepLink?: string;
  data?: Record<string, any>;
  expiresAt?: Date;
}

interface BulkSendNotificationOptions {
  userIds: string[];
  notification: Omit<SendNotificationOptions, 'userId'>;
}

export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const {
    autoRegister = true,
    enableServiceWorker = true,
    vapidPublicKey,
    debug = false
  } = options;

  const [state, setState] = useState<PushNotificationState>({
    devices: [],
    currentDevice: null,
    isSupported: false,
    isRegistered: false,
    permission: 'default',
    loading: false,
    error: null
  });

  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  // Debug logging
  const log = useCallback((message: string, ...args: any[]) => {
    if (debug) {
      console.log(`[PushNotifications] ${message}`, ...args);
    }
  }, [debug]);

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    const isSupported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
    
    setState(prev => ({ 
      ...prev, 
      isSupported,
      permission: isSupported ? Notification.permission : 'denied'
    }));
    
    log('Push notification support:', isSupported);
    return isSupported;
  }, [log]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      throw new Error('Push notifications not supported');
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      log('Permission result:', permission);
      
      if (permission === 'denied') {
        toast({
          title: 'Notifications blocked',
          description: 'Please enable notifications in your browser settings to receive important governance alerts.',
          variant: 'destructive',
        });
      }
      
      return permission;
    } catch (error) {
      log('Permission request error:', error);
      throw error;
    }
  }, [state.isSupported, toast, log]);

  // Register service worker for web push
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!enableServiceWorker || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      // Register the service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      serviceWorkerRef.current = registration;
      log('Service worker registered:', registration);
      
      return registration;
    } catch (error) {
      log('Service worker registration failed:', error);
      throw error;
    }
  }, [enableServiceWorker, log]);

  // Get push subscription for web push
  const getPushSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    const registration = serviceWorkerRef.current;
    
    if (!registration || !vapidPublicKey) {
      return null;
    }

    try {
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey
        });
      }

      log('Push subscription obtained:', subscription);
      return subscription;
    } catch (error) {
      log('Failed to get push subscription:', error);
      throw error;
    }
  }, [vapidPublicKey, log]);

  // Detect device platform
  const detectPlatform = useCallback((): NotificationPlatform => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    } else {
      return 'web';
    }
  }, []);

  // Register device for push notifications
  const registerDevice = useCallback(async (preferences?: Partial<DevicePreferences>): Promise<PushDevice> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Check support and permission
      if (!checkSupport()) {
        throw new Error('Push notifications not supported');
      }

      let permission = state.permission;
      if (permission !== 'granted') {
        permission = await requestPermission();
      }

      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      let deviceToken: string;
      const platform = detectPlatform();

      if (platform === 'web') {
        // Register service worker and get push subscription for web
        await registerServiceWorker();
        const subscription = await getPushSubscription();
        
        if (!subscription) {
          throw new Error('Failed to get push subscription');
        }
        
        deviceToken = JSON.stringify(subscription);
      } else {
        // For iOS/Android, this would typically be handled by a mobile app
        // For demo purposes, we'll generate a mock token
        deviceToken = `${platform}_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Prepare device data
      const deviceData = {
        platform,
        device_token: deviceToken,
        device_name: navigator.platform || 'Unknown Device',
        device_model: navigator.userAgent.split('(')[1]?.split(';')[0] || 'Unknown',
        app_version: '1.0.0',
        os_version: navigator.userAgent,
        preferences: preferences || {
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

      // Register with backend
      const response = await fetch('/api/push-notifications/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register device');
      }

      const device: PushDevice = await response.json();
      log('Device registered successfully:', device);

      setState(prev => ({ 
        ...prev, 
        currentDevice: device, 
        isRegistered: true,
        loading: false 
      }));

      toast({
        title: 'Notifications enabled',
        description: 'You will now receive important governance notifications.',
      });

      return device;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('Device registration failed:', error);
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));

      toast({
        title: 'Failed to enable notifications',
        description: errorMessage,
        variant: 'destructive',
      });

      throw error;
    }
  }, [state.permission, checkSupport, requestPermission, detectPlatform, registerServiceWorker, getPushSubscription, toast, log]);

  // Load user's registered devices
  const loadDevices = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/push-notifications/devices');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load devices');
      }

      const data = await response.json();
      const devices: PushDevice[] = data.devices;

      // Find current device based on platform
      const platform = detectPlatform();
      const currentDevice = devices.find(device => device.platform === platform && device.is_active);

      setState(prev => ({ 
        ...prev, 
        devices, 
        currentDevice: currentDevice || null,
        isRegistered: !!currentDevice,
        loading: false 
      }));

      log('Devices loaded:', devices);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('Failed to load devices:', error);
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
    }
  }, [detectPlatform, log]);

  // Update device preferences
  const updateDevicePreferences = useCallback(async (
    deviceId: string, 
    preferences: DevicePreferences
  ): Promise<PushDevice> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/push-notifications/devices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_id: deviceId, preferences })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      const updatedDevice: PushDevice = await response.json();
      log('Device preferences updated:', updatedDevice);

      setState(prev => ({
        ...prev,
        devices: prev.devices.map(device => 
          device.id === deviceId ? updatedDevice : device
        ),
        currentDevice: prev.currentDevice?.id === deviceId ? updatedDevice : prev.currentDevice,
        loading: false
      }));

      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been saved.',
      });

      return updatedDevice;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('Failed to update device preferences:', error);
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));

      toast({
        title: 'Failed to update preferences',
        description: errorMessage,
        variant: 'destructive',
      });

      throw error;
    }
  }, [toast, log]);

  // Unregister device
  const unregisterDevice = useCallback(async (deviceId: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/push-notifications/devices?device_id=${deviceId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unregister device');
      }

      log('Device unregistered:', deviceId);

      setState(prev => ({
        ...prev,
        devices: prev.devices.filter(device => device.id !== deviceId),
        currentDevice: prev.currentDevice?.id === deviceId ? null : prev.currentDevice,
        isRegistered: prev.currentDevice?.id === deviceId ? false : prev.isRegistered,
        loading: false
      }));

      toast({
        title: 'Device unregistered',
        description: 'You will no longer receive notifications on this device.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('Failed to unregister device:', error);
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));

      toast({
        title: 'Failed to unregister device',
        description: errorMessage,
        variant: 'destructive',
      });

      throw error;
    }
  }, [toast, log]);

  // Send notification to user
  const sendNotification = useCallback(async (options: SendNotificationOptions): Promise<any> => {
    try {
      const response = await fetch('/api/push-notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
      }

      const result = await response.json();
      log('Notification sent:', result);

      return result;
    } catch (error) {
      log('Failed to send notification:', error);
      throw error;
    }
  }, [log]);

  // Send bulk notifications
  const sendBulkNotification = useCallback(async (options: BulkSendNotificationOptions): Promise<any> => {
    try {
      const response = await fetch('/api/push-notifications/send', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send bulk notification');
      }

      const result = await response.json();
      log('Bulk notification sent:', result);

      return result;
    } catch (error) {
      log('Failed to send bulk notification:', error);
      throw error;
    }
  }, [log]);

  // Send test notification
  const sendTestNotification = useCallback(async (deviceId: string): Promise<any> => {
    try {
      const response = await fetch('/api/push-notifications/send', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_id: deviceId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test notification');
      }

      const result = await response.json();
      log('Test notification sent:', result);

      toast({
        title: 'Test notification sent',
        description: 'Check your device for the test notification.',
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('Failed to send test notification:', error);

      toast({
        title: 'Failed to send test notification',
        description: errorMessage,
        variant: 'destructive',
      });

      throw error;
    }
  }, [toast, log]);

  // Initialize on mount
  useEffect(() => {
    checkSupport();
    loadDevices();

    // Auto-register if enabled and supported
    if (autoRegister && state.isSupported && !state.isRegistered) {
      registerDevice().catch(error => {
        log('Auto-registration failed:', error);
      });
    }
  }, [autoRegister, checkSupport, loadDevices, registerDevice, state.isSupported, state.isRegistered, log]);

  // Listen for service worker messages (for web push)
  useEffect(() => {
    if (!enableServiceWorker || !('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION') {
        log('Push notification received via service worker:', event.data);
        
        // Handle push notification actions
        if (event.data.action) {
          // Process notification actions
          log('Push notification action:', event.data.action);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [enableServiceWorker, log]);

  return {
    // State
    ...state,
    
    // Actions
    registerDevice,
    updateDevicePreferences,
    unregisterDevice,
    loadDevices,
    requestPermission,
    sendNotification,
    sendBulkNotification,
    sendTestNotification,
    
    // Utilities
    checkSupport
  };
}