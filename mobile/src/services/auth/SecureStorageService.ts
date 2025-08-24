/**
 * Secure Storage Service
 * Enterprise-grade secure storage with encryption for sensitive data
 */

import EncryptedStorage from 'react-native-encrypted-storage';
import { Keychain, ACCESSIBLE, ACCESS_CONTROL } from 'react-native-keychain';
import DeviceInfo from 'react-native-device-info';

import type { Result, UserId, OrganizationId, DeviceId } from '@/types/mobile';
import { SECURITY } from '@/config/constants';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SecureStorageService');

export interface SecureSessionData {
  readonly userId: UserId;
  readonly organizationId?: OrganizationId;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly deviceId: DeviceId;
  readonly storedAt: string;
  readonly lastAuthTime: number;
}

export interface DeviceSecurityInfo {
  readonly deviceId: DeviceId;
  readonly isJailbroken: boolean;
  readonly isRooted: boolean;
  readonly isDebuggable: boolean;
  readonly lastSecurityCheck: string;
  readonly securityLevel: 'high' | 'medium' | 'low';
}

export class SecureStorageService {
  private readonly serviceId = SECURITY.SECURE_STORAGE_SERVICE;
  private readonly encryptionKeyAlias = `${this.serviceId}.encryption`;

  /**
   * Store session data with biometric protection
   */
  async storeSessionData(sessionData: SecureSessionData): Promise<Result<void>> {
    try {
      logger.info('Storing session data with biometric protection');
      
      // Store sensitive auth tokens in keychain with biometric protection
      await Keychain.setInternetCredentials(
        `${this.serviceId}.session`,
        sessionData.userId,
        JSON.stringify({
          accessToken: sessionData.accessToken,
          refreshToken: sessionData.refreshToken,
          expiresAt: sessionData.expiresAt,
        }),
        {
          accessControl: ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
          service: this.serviceId,
        }
      );

      // Store non-sensitive session metadata in encrypted storage
      await EncryptedStorage.setItem('session_metadata', JSON.stringify({
        userId: sessionData.userId,
        organizationId: sessionData.organizationId,
        deviceId: sessionData.deviceId,
        storedAt: sessionData.storedAt,
        lastAuthTime: sessionData.lastAuthTime,
      }));

      logger.info('Session data stored successfully');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to store session data', { error });
      return {
        success: false,
        error: {
          code: 'SESSION_STORAGE_FAILED',
          message: 'Failed to store session data securely',
          details: error,
        },
      };
    }
  }

  /**
   * Retrieve session data with biometric authentication
   */
  async getSessionData(): Promise<Result<SecureSessionData | null>> {
    try {
      logger.info('Retrieving session data');
      
      // Get session metadata first (doesn't require biometric)
      const metadataJson = await EncryptedStorage.getItem('session_metadata');
      if (!metadataJson) {
        logger.info('No session metadata found');
        return { success: true, data: null };
      }

      const metadata = JSON.parse(metadataJson);
      
      // Get sensitive tokens with biometric authentication
      const credentials = await Keychain.getInternetCredentials(`${this.serviceId}.session`);
      if (!credentials || credentials === false) {
        logger.warn('No session credentials found in keychain');
        return { success: true, data: null };
      }

      const tokens = JSON.parse(credentials.password);
      
      const sessionData: SecureSessionData = {
        userId: metadata.userId,
        organizationId: metadata.organizationId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        deviceId: metadata.deviceId,
        storedAt: metadata.storedAt,
        lastAuthTime: metadata.lastAuthTime,
      };

      logger.info('Session data retrieved successfully');
      return { success: true, data: sessionData };
    } catch (error) {
      logger.error('Failed to retrieve session data', { error });
      return {
        success: false,
        error: {
          code: 'SESSION_RETRIEVAL_FAILED',
          message: 'Failed to retrieve session data',
          details: error,
        },
      };
    }
  }

  /**
   * Clear all session data
   */
  async clearSessionData(): Promise<Result<void>> {
    try {
      logger.info('Clearing session data');
      
      // Clear keychain
      await Keychain.resetInternetCredentials(`${this.serviceId}.session`);
      
      // Clear encrypted storage
      await EncryptedStorage.removeItem('session_metadata');
      await EncryptedStorage.removeItem('user_preferences');
      await EncryptedStorage.removeItem('offline_queue');
      
      logger.info('Session data cleared successfully');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to clear session data', { error });
      return {
        success: false,
        error: {
          code: 'SESSION_CLEAR_FAILED',
          message: 'Failed to clear session data',
          details: error,
        },
      };
    }
  }

  /**
   * Store device security information
   */
  async storeDeviceSecurityInfo(securityInfo: DeviceSecurityInfo): Promise<Result<void>> {
    try {
      await EncryptedStorage.setItem('device_security', JSON.stringify(securityInfo));
      logger.info('Device security info stored', { securityLevel: securityInfo.securityLevel });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to store device security info', { error });
      return {
        success: false,
        error: {
          code: 'DEVICE_SECURITY_STORAGE_FAILED',
          message: 'Failed to store device security information',
          details: error,
        },
      };
    }
  }

  /**
   * Get device security information
   */
  async getDeviceSecurityInfo(): Promise<Result<DeviceSecurityInfo | null>> {
    try {
      const securityData = await EncryptedStorage.getItem('device_security');
      if (!securityData) {
        return { success: true, data: null };
      }

      const securityInfo = JSON.parse(securityData) as DeviceSecurityInfo;
      return { success: true, data: securityInfo };
    } catch (error) {
      logger.error('Failed to retrieve device security info', { error });
      return {
        success: false,
        error: {
          code: 'DEVICE_SECURITY_RETRIEVAL_FAILED',
          message: 'Failed to retrieve device security information',
          details: error,
        },
      };
    }
  }

  /**
   * Store offline action queue
   */
  async storeOfflineActions(actions: any[]): Promise<Result<void>> {
    try {
      await EncryptedStorage.setItem('offline_queue', JSON.stringify({
        actions,
        updatedAt: new Date().toISOString(),
      }));
      
      logger.info('Offline actions stored', { count: actions.length });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to store offline actions', { error });
      return {
        success: false,
        error: {
          code: 'OFFLINE_STORAGE_FAILED',
          message: 'Failed to store offline actions',
          details: error,
        },
      };
    }
  }

  /**
   * Get stored offline actions
   */
  async getOfflineActions(): Promise<Result<any[]>> {
    try {
      const queueData = await EncryptedStorage.getItem('offline_queue');
      if (!queueData) {
        return { success: true, data: [] };
      }

      const parsed = JSON.parse(queueData);
      return { success: true, data: parsed.actions || [] };
    } catch (error) {
      logger.error('Failed to retrieve offline actions', { error });
      return {
        success: false,
        error: {
          code: 'OFFLINE_RETRIEVAL_FAILED',
          message: 'Failed to retrieve offline actions',
          details: error,
        },
      };
    }
  }

  /**
   * Check if stored session is still valid
   */
  async isSessionValid(): Promise<boolean> {
    try {
      const sessionResult = await this.getSessionData();
      if (!sessionResult.success || !sessionResult.data) {
        return false;
      }

      const session = sessionResult.data;
      const now = Date.now();
      
      // Check if token is expired
      if (session.expiresAt <= now) {
        logger.info('Session token expired');
        return false;
      }

      // Check last authentication time for biometric timeout
      const timeSinceLastAuth = now - session.lastAuthTime;
      const biometricTimeout = SECURITY.SESSION_TIMEOUT_MINUTES * 60 * 1000;
      
      if (timeSinceLastAuth > biometricTimeout) {
        logger.info('Biometric authentication timeout exceeded');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate session', { error });
      return false;
    }
  }

  /**
   * Perform secure storage cleanup
   */
  async performSecureCleanup(): Promise<Result<void>> {
    try {
      logger.info('Performing secure storage cleanup');
      
      // Clear all stored data
      await this.clearSessionData();
      
      // Clear all keychain entries for this service
      await Keychain.resetInternetCredentials(this.serviceId);
      await Keychain.resetInternetCredentials(`${this.serviceId}.session`);
      
      // Clear all encrypted storage
      await EncryptedStorage.clear();
      
      logger.info('Secure storage cleanup completed');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to perform secure cleanup', { error });
      return {
        success: false,
        error: {
          code: 'SECURE_CLEANUP_FAILED',
          message: 'Failed to perform secure storage cleanup',
          details: error,
        },
      };
    }
  }
}

export const secureStorageService = new SecureStorageService();