/**
 * Mobile Authentication Service
 * Integrates with existing auth store and adds mobile-specific features
 */

import { createClient } from '@supabase/supabase-js';
import DeviceInfo from 'react-native-device-info';
import messaging from '@react-native-firebase/messaging';

import type { 
  Result, 
  UserId, 
  OrganizationId, 
  DeviceId, 
  PushToken,
  BiometricAuthResult,
} from '@/types/mobile';
import type { UserWithProfile } from '@/shared-types';
import { Environment } from '@/config/env';
import { biometricAuthService } from './BiometricAuthService';
import { secureStorageService } from './SecureStorageService';
import { deviceSecurityService } from '../security/DeviceSecurityService';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MobileAuthService');

export interface MobileLoginRequest {
  readonly email: string;
  readonly password: string;
  readonly useBiometric?: boolean;
  readonly deviceInfo?: {
    readonly name: string;
    readonly model: string;
    readonly osVersion: string;
  };
}

export interface MobileAuthSession {
  readonly user: UserWithProfile;
  readonly deviceId: DeviceId;
  readonly biometricEnabled: boolean;
  readonly pushTokenRegistered: boolean;
  readonly lastActivity: number;
  readonly expiresAt: number;
}

export class MobileAuthService {
  private readonly supabase = createClient(
    Environment.supabaseUrl,
    Environment.supabaseAnonKey
  );

  /**
   * Login with email/password and optional biometric setup
   */
  async login(request: MobileLoginRequest): Promise<Result<MobileAuthSession>> {
    try {
      logger.info('Starting mobile login process', { email: request.email });
      
      // Perform device security check first
      const securityResult = await deviceSecurityService.performSecurityCheck();
      if (!securityResult.success) {
        logger.error('Device security check failed', { error: securityResult.error });
        return {
          success: false,
          error: {
            code: 'DEVICE_SECURITY_FAILED',
            message: 'Device security verification failed',
            details: securityResult.error,
          },
        };
      }

      // Authenticate with Supabase
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: request.email,
        password: request.password,
      });

      if (error || !data.user || !data.session) {
        logger.error('Supabase authentication failed', { error });
        return {
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: error?.message || 'Authentication failed',
            details: error,
          },
        };
      }

      // Get user profile and preferences
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      const { data: preferences } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      const userWithProfile: UserWithProfile = {
        id: data.user.id as UserId,
        email: data.user.email!,
        full_name: data.user.user_metadata?.full_name,
        avatar_url: data.user.user_metadata?.avatar_url,
        created_at: data.user.created_at!,
        updated_at: data.user.updated_at!,
        profile: profile || undefined,
        preferences: preferences || undefined,
      };

      const deviceId = await DeviceInfo.getUniqueId() as DeviceId;
      const expiresAt = data.session.expires_at ? 
        new Date(data.session.expires_at * 1000).getTime() : 
        Date.now() + (24 * 60 * 60 * 1000); // 24 hours default

      // Register device if not already registered
      await this.registerDevice(userWithProfile.id, deviceId);

      // Setup biometric authentication if requested and available
      let biometricEnabled = false;
      if (request.useBiometric && Environment.biometricAuthEnabled) {
        const biometricResult = await biometricAuthService.setupBiometricAuth(userWithProfile.id);
        if (biometricResult.success) {
          biometricEnabled = true;
          
          // Store credentials securely with biometric protection
          await biometricAuthService.storeSecureCredentials(
            userWithProfile.id,
            data.session.access_token,
            data.session.refresh_token
          );
        }
      }

      // Register for push notifications
      let pushTokenRegistered = false;
      if (Environment.pushNotificationsEnabled) {
        const pushResult = await this.registerForPushNotifications(userWithProfile.id);
        pushTokenRegistered = pushResult.success;
      }

      // Store session data securely
      const sessionData = {
        userId: userWithProfile.id,
        organizationId: userWithProfile.profile?.organization_id as OrganizationId,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt,
        deviceId,
        storedAt: new Date().toISOString(),
        lastAuthTime: Date.now(),
      };

      await secureStorageService.storeSessionData(sessionData);

      const session: MobileAuthSession = {
        user: userWithProfile,
        deviceId,
        biometricEnabled,
        pushTokenRegistered,
        lastActivity: Date.now(),
        expiresAt,
      };

      logger.info('Mobile login completed successfully', {
        userId: userWithProfile.id,
        biometricEnabled,
        pushTokenRegistered,
      });

      return { success: true, data: session };
    } catch (error) {
      logger.error('Mobile login failed', { error });
      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Login process failed',
          details: error,
        },
      };
    }
  }

  /**
   * Authenticate with biometrics (for returning users)
   */
  async authenticateWithBiometric(): Promise<Result<MobileAuthSession>> {
    try {
      logger.info('Authenticating with biometrics');
      
      // Check if biometric is configured
      const isConfigured = await biometricAuthService.isBiometricConfigured();
      if (!isConfigured) {
        return {
          success: false,
          error: {
            code: 'BIOMETRIC_NOT_CONFIGURED',
            message: 'Biometric authentication is not configured',
          },
        };
      }

      // Perform biometric authentication
      const authResult = await biometricAuthService.authenticate({
        title: 'Access BoardGuru',
        subtitle: 'Use biometric authentication to access your board documents',
        description: 'Secure access to your governance platform',
      });

      if (!authResult.success) {
        logger.warn('Biometric authentication failed', { error: authResult.error });
        return {
          success: false,
          error: {
            code: 'BIOMETRIC_AUTH_FAILED',
            message: authResult.error?.message || 'Biometric authentication failed',
            details: authResult.error,
          },
        };
      }

      // Retrieve stored session data
      const sessionResult = await secureStorageService.getSessionData();
      if (!sessionResult.success || !sessionResult.data) {
        logger.error('Failed to retrieve session data after biometric auth');
        return {
          success: false,
          error: {
            code: 'SESSION_RETRIEVAL_FAILED',
            message: 'Failed to retrieve session after biometric authentication',
          },
        };
      }

      const sessionData = sessionResult.data;

      // Validate session is still valid
      if (sessionData.expiresAt <= Date.now()) {
        logger.warn('Stored session has expired');
        return {
          success: false,
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Session has expired, please login again',
          },
        };
      }

      // Refresh session with Supabase
      const { data, error } = await this.supabase.auth.setSession({
        access_token: sessionData.accessToken,
        refresh_token: sessionData.refreshToken,
      });

      if (error || !data.user) {
        logger.error('Session refresh failed', { error });
        // Clear invalid session
        await secureStorageService.clearSessionData();
        return {
          success: false,
          error: {
            code: 'SESSION_REFRESH_FAILED',
            message: 'Session refresh failed, please login again',
            details: error,
          },
        };
      }

      // Get updated user profile
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      const { data: preferences } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      const userWithProfile: UserWithProfile = {
        id: data.user.id as UserId,
        email: data.user.email!,
        full_name: data.user.user_metadata?.full_name,
        avatar_url: data.user.user_metadata?.avatar_url,
        created_at: data.user.created_at!,
        updated_at: data.user.updated_at!,
        profile: profile || undefined,
        preferences: preferences || undefined,
      };

      const session: MobileAuthSession = {
        user: userWithProfile,
        deviceId: sessionData.deviceId,
        biometricEnabled: true,
        pushTokenRegistered: true, // Assume already registered
        lastActivity: Date.now(),
        expiresAt: data.session?.expires_at ? 
          new Date(data.session.expires_at * 1000).getTime() : 
          sessionData.expiresAt,
      };

      // Update last activity time
      await this.updateLastActivity(userWithProfile.id);

      logger.info('Biometric authentication successful');
      return { success: true, data: session };
    } catch (error) {
      logger.error('Biometric authentication process failed', { error });
      return {
        success: false,
        error: {
          code: 'BIOMETRIC_PROCESS_FAILED',
          message: 'Biometric authentication process failed',
          details: error,
        },
      };
    }
  }

  /**
   * Logout and clear all secure data
   */
  async logout(): Promise<Result<void>> {
    try {
      logger.info('Starting mobile logout process');
      
      // Sign out from Supabase
      await this.supabase.auth.signOut();
      
      // Clear all secure storage
      await secureStorageService.clearSessionData();
      await biometricAuthService.clearSecureCredentials();
      
      // Unregister push notifications
      try {
        await messaging().unsubscribeFromTopic('user_notifications');
        await messaging().deleteToken();
      } catch (pushError) {
        logger.warn('Failed to unregister push notifications', { pushError });
      }

      logger.info('Mobile logout completed successfully');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Mobile logout failed', { error });
      return {
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Logout process failed',
          details: error,
        },
      };
    }
  }

  /**
   * Register device with backend for push notifications and security
   */
  private async registerDevice(userId: UserId, deviceId: DeviceId): Promise<Result<void>> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      
      const { error } = await this.supabase
        .from('user_devices')
        .upsert({
          user_id: userId,
          device_id: deviceId,
          platform: deviceInfo.platform,
          os_version: deviceInfo.osVersion,
          app_version: deviceInfo.appVersion,
          device_name: deviceInfo.deviceName,
          device_model: deviceInfo.deviceModel,
          last_seen: new Date().toISOString(),
          is_active: true,
        });

      if (error) {
        logger.error('Device registration failed', { error });
        return {
          success: false,
          error: {
            code: 'DEVICE_REGISTRATION_FAILED',
            message: 'Failed to register device',
            details: error,
          },
        };
      }

      logger.info('Device registered successfully');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Device registration process failed', { error });
      return {
        success: false,
        error: {
          code: 'DEVICE_REGISTRATION_FAILED',
          message: 'Device registration process failed',
          details: error,
        },
      };
    }
  }

  /**
   * Register for push notifications
   */
  private async registerForPushNotifications(userId: UserId): Promise<Result<PushToken>> {
    try {
      logger.info('Registering for push notifications');
      
      // Request permission
      const authStatus = await messaging().requestPermission();
      
      if (authStatus !== messaging.AuthorizationStatus.AUTHORIZED) {
        logger.warn('Push notification permission denied');
        return {
          success: false,
          error: {
            code: 'PUSH_PERMISSION_DENIED',
            message: 'Push notification permission was denied',
          },
        };
      }

      // Get FCM token
      const token = await messaging().getToken() as PushToken;
      
      // Store token securely
      await biometricAuthService.storePushToken(token);
      
      // Register token with backend
      const { error } = await this.supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          token,
          platform: DeviceInfo.getSystemName().toLowerCase(),
          device_id: await DeviceInfo.getUniqueId(),
          created_at: new Date().toISOString(),
          is_active: true,
        });

      if (error) {
        logger.error('Failed to register push token with backend', { error });
        return {
          success: false,
          error: {
            code: 'PUSH_REGISTRATION_FAILED',
            message: 'Failed to register for push notifications',
            details: error,
          },
        };
      }

      // Subscribe to user-specific topics
      await messaging().subscribeToTopic(`user_${userId}`);
      await messaging().subscribeToTopic('all_users');

      logger.info('Push notifications registered successfully');
      return { success: true, data: token };
    } catch (error) {
      logger.error('Push notification registration failed', { error });
      return {
        success: false,
        error: {
          code: 'PUSH_REGISTRATION_FAILED',
          message: 'Failed to register for push notifications',
          details: error,
        },
      };
    }
  }

  /**
   * Refresh authentication session
   */
  async refreshSession(): Promise<Result<MobileAuthSession>> {
    try {
      logger.info('Refreshing authentication session');
      
      const sessionResult = await secureStorageService.getSessionData();
      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          error: {
            code: 'NO_SESSION_DATA',
            message: 'No session data found',
          },
        };
      }

      const sessionData = sessionResult.data;
      
      // Refresh with Supabase
      const { data, error } = await this.supabase.auth.setSession({
        access_token: sessionData.accessToken,
        refresh_token: sessionData.refreshToken,
      });

      if (error || !data.session) {
        logger.error('Session refresh failed', { error });
        return {
          success: false,
          error: {
            code: 'SESSION_REFRESH_FAILED',
            message: 'Failed to refresh session',
            details: error,
          },
        };
      }

      // Update stored session with new tokens
      const updatedSessionData = {
        ...sessionData,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ? 
          new Date(data.session.expires_at * 1000).getTime() : 
          sessionData.expiresAt,
        lastAuthTime: Date.now(),
      };

      await secureStorageService.storeSessionData(updatedSessionData);

      // Get updated user data
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      const userWithProfile: UserWithProfile = {
        id: data.user.id as UserId,
        email: data.user.email!,
        full_name: data.user.user_metadata?.full_name,
        avatar_url: data.user.user_metadata?.avatar_url,
        created_at: data.user.created_at!,
        updated_at: data.user.updated_at!,
        profile: profile || undefined,
        preferences: sessionData.organizationId ? undefined : undefined, // TODO: Fetch preferences
      };

      const session: MobileAuthSession = {
        user: userWithProfile,
        deviceId: sessionData.deviceId,
        biometricEnabled: await biometricAuthService.isBiometricConfigured(),
        pushTokenRegistered: true,
        lastActivity: Date.now(),
        expiresAt: updatedSessionData.expiresAt,
      };

      logger.info('Session refreshed successfully');
      return { success: true, data: session };
    } catch (error) {
      logger.error('Session refresh process failed', { error });
      return {
        success: false,
        error: {
          code: 'SESSION_REFRESH_FAILED',
          message: 'Session refresh process failed',
          details: error,
        },
      };
    }
  }

  /**
   * Check if user is authenticated and session is valid
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check if session exists and is valid
      const isValid = await secureStorageService.isSessionValid();
      if (!isValid) {
        return false;
      }

      // Additional device security check
      const securityResult = await deviceSecurityService.performSecurityCheck();
      return securityResult.success;
    } catch (error) {
      logger.error('Authentication check failed', { error });
      return false;
    }
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(userId: UserId): Promise<void> {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      
      await this.supabase
        .from('user_devices')
        .update({
          last_seen: new Date().toISOString(),
          last_activity: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('device_id', deviceId);
        
      logger.debug('Last activity updated');
    } catch (error) {
      logger.warn('Failed to update last activity', { error });
    }
  }

  /**
   * Get comprehensive device information
   */
  private async getDeviceInfo() {
    const [
      deviceName,
      deviceModel,
      systemName,
      systemVersion,
      appVersion,
      isTablet,
    ] = await Promise.all([
      DeviceInfo.getDeviceName(),
      DeviceInfo.getModel(),
      DeviceInfo.getSystemName(),
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getVersion(),
      DeviceInfo.isTablet(),
    ]);

    return {
      deviceName,
      deviceModel,
      platform: systemName.toLowerCase() as 'ios' | 'android',
      osVersion: systemVersion,
      appVersion,
      isTablet,
    };
  }

  /**
   * Remote logout (called from backend or MDM)
   */
  async remoteLogout(): Promise<Result<void>> {
    try {
      logger.info('Performing remote logout');
      
      // Clear all secure data
      await secureStorageService.performSecureCleanup();
      
      // Sign out from Supabase
      await this.supabase.auth.signOut();
      
      logger.info('Remote logout completed');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Remote logout failed', { error });
      return {
        success: false,
        error: {
          code: 'REMOTE_LOGOUT_FAILED',
          message: 'Remote logout failed',
          details: error,
        },
      };
    }
  }
}

export const mobileAuthService = new MobileAuthService();