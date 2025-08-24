/**
 * Biometric Authentication Service
 * Enterprise-grade biometric authentication with secure storage
 */

import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { Keychain, ACCESSIBLE, ACCESS_CONTROL } from 'react-native-keychain';
import EncryptedStorage from 'react-native-encrypted-storage';
import DeviceInfo from 'react-native-device-info';

import type {
  BiometricConfig,
  BiometricType,
  BiometricPromptConfig,
  BiometricAuthResult,
  DeviceId,
  PushToken,
  UserId,
  Result,
} from '@/types/mobile';
import { SECURITY, BIOMETRIC } from '@/config/constants';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BiometricAuthService');

export class BiometricAuthService {
  private readonly rnBiometrics: ReactNativeBiometrics;
  private readonly serviceId = SECURITY.SECURE_STORAGE_SERVICE;
  
  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: false,
    });
  }

  /**
   * Initialize biometric authentication system
   */
  async initialize(): Promise<Result<BiometricConfig>> {
    try {
      logger.info('Initializing biometric authentication system');
      
      // Check device capabilities
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      
      if (!available) {
        logger.warn('Biometric authentication not available on this device');
        return {
          success: true,
          data: {
            enabled: false,
            availableTypes: [],
            fallbackEnabled: true,
            maxAttempts: 3,
          },
        };
      }

      const availableTypes = this.mapBiometryTypes(biometryType);
      
      logger.info('Biometric authentication available', { types: availableTypes });
      
      return {
        success: true,
        data: {
          enabled: true,
          availableTypes,
          fallbackEnabled: true,
          maxAttempts: 3,
        },
      };
    } catch (error) {
      logger.error('Failed to initialize biometric authentication', { error });
      return {
        success: false,
        error: {
          code: 'BIOMETRIC_INIT_FAILED',
          message: 'Failed to initialize biometric authentication',
          details: error,
        },
      };
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(config: BiometricPromptConfig): Promise<BiometricAuthResult> {
    try {
      logger.info('Starting biometric authentication');
      
      const promptConfig = {
        promptMessage: config.title,
        ...BIOMETRIC.PROMPT_CONFIG,
      };

      const { success, signature } = await this.rnBiometrics.createSignature({
        promptMessage: config.title,
        payload: this.generateAuthPayload(),
        ...promptConfig,
      });

      if (success && signature) {
        logger.info('Biometric authentication successful');
        
        // Store authentication timestamp
        await this.storeLastAuthTime();
        
        return {
          success: true,
          biometricType: await this.getCurrentBiometricType(),
        };
      } else {
        logger.warn('Biometric authentication failed');
        return {
          success: false,
          error: {
            code: BIOMETRIC.ERROR_CODES.BIOMETRIC_AUTHENTICATION_FAILED,
            message: 'Biometric authentication failed',
            type: 'authentication_failed',
          },
        };
      }
    } catch (error: any) {
      logger.error('Biometric authentication error', { error });
      
      return {
        success: false,
        error: {
          code: error.code || BIOMETRIC.ERROR_CODES.BIOMETRIC_UNKNOWN_ERROR,
          message: this.getErrorMessage(error),
          type: this.getErrorType(error),
        },
      };
    }
  }

  /**
   * Store secure credentials using biometric protection
   */
  async storeSecureCredentials(
    userId: UserId,
    accessToken: string,
    refreshToken: string
  ): Promise<Result<void>> {
    try {
      logger.info('Storing secure credentials with biometric protection');
      
      const credentials = {
        userId,
        accessToken,
        refreshToken,
        storedAt: new Date().toISOString(),
        deviceId: await this.getDeviceId(),
      };

      // Store in iOS/Android secure keychain with biometric protection
      await Keychain.setInternetCredentials(
        this.serviceId,
        userId,
        JSON.stringify(credentials),
        {
          accessControl: ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
          service: this.serviceId,
        }
      );

      // Also store encrypted session info
      await EncryptedStorage.setItem('user_session', JSON.stringify({
        userId,
        lastAuthTime: Date.now(),
        biometricEnabled: true,
      }));

      logger.info('Secure credentials stored successfully');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to store secure credentials', { error });
      return {
        success: false,
        error: {
          code: 'CREDENTIAL_STORAGE_FAILED',
          message: 'Failed to store secure credentials',
          details: error,
        },
      };
    }
  }

  /**
   * Retrieve secure credentials with biometric authentication
   */
  async getSecureCredentials(): Promise<Result<{
    userId: UserId;
    accessToken: string;
    refreshToken: string;
    storedAt: string;
  }>> {
    try {
      logger.info('Retrieving secure credentials');
      
      const result = await Keychain.getInternetCredentials(this.serviceId);
      
      if (!result || result === false) {
        logger.warn('No stored credentials found');
        return {
          success: false,
          error: {
            code: 'NO_CREDENTIALS',
            message: 'No stored credentials found',
          },
        };
      }

      const credentials = JSON.parse(result.password);
      
      // Validate credential structure
      if (!credentials.userId || !credentials.accessToken || !credentials.refreshToken) {
        logger.error('Invalid credential structure');
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid stored credentials',
          },
        };
      }

      logger.info('Secure credentials retrieved successfully');
      return {
        success: true,
        data: credentials,
      };
    } catch (error) {
      logger.error('Failed to retrieve secure credentials', { error });
      return {
        success: false,
        error: {
          code: 'CREDENTIAL_RETRIEVAL_FAILED',
          message: 'Failed to retrieve secure credentials',
          details: error,
        },
      };
    }
  }

  /**
   * Clear all stored credentials and biometric data
   */
  async clearSecureCredentials(): Promise<Result<void>> {
    try {
      logger.info('Clearing secure credentials');
      
      // Clear keychain
      await Keychain.resetInternetCredentials(this.serviceId);
      
      // Clear encrypted storage
      await EncryptedStorage.removeItem('user_session');
      await EncryptedStorage.removeItem('biometric_config');
      
      // Clear any biometric keys
      await this.rnBiometrics.deleteKeys();
      
      logger.info('Secure credentials cleared successfully');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to clear secure credentials', { error });
      return {
        success: false,
        error: {
          code: 'CREDENTIAL_CLEAR_FAILED',
          message: 'Failed to clear secure credentials',
          details: error,
        },
      };
    }
  }

  /**
   * Setup biometric authentication for new user
   */
  async setupBiometricAuth(userId: UserId): Promise<Result<void>> {
    try {
      logger.info('Setting up biometric authentication', { userId });
      
      // Check if biometrics are available
      const { available } = await this.rnBiometrics.isSensorAvailable();
      if (!available) {
        return {
          success: false,
          error: {
            code: 'BIOMETRIC_UNAVAILABLE',
            message: 'Biometric authentication is not available on this device',
          },
        };
      }

      // Create biometric key pair
      const { publicKey } = await this.rnBiometrics.createKeys();
      
      // Store biometric configuration
      const config: BiometricConfig = {
        enabled: true,
        availableTypes: await this.getAvailableBiometricTypes(),
        fallbackEnabled: true,
        maxAttempts: 3,
      };

      await EncryptedStorage.setItem('biometric_config', JSON.stringify({
        ...config,
        publicKey,
        setupDate: new Date().toISOString(),
        userId,
      }));

      logger.info('Biometric authentication setup completed');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to setup biometric authentication', { error });
      return {
        success: false,
        error: {
          code: 'BIOMETRIC_SETUP_FAILED',
          message: 'Failed to setup biometric authentication',
          details: error,
        },
      };
    }
  }

  /**
   * Check if biometric authentication is properly configured
   */
  async isBiometricConfigured(): Promise<boolean> {
    try {
      const config = await EncryptedStorage.getItem('biometric_config');
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      
      return !!(config && keysExist);
    } catch (error) {
      logger.error('Failed to check biometric configuration', { error });
      return false;
    }
  }

  /**
   * Get device unique identifier
   */
  async getDeviceId(): Promise<DeviceId> {
    const deviceId = await DeviceInfo.getUniqueId();
    return deviceId as DeviceId;
  }

  /**
   * Store push notification token securely
   */
  async storePushToken(token: PushToken): Promise<Result<void>> {
    try {
      await EncryptedStorage.setItem('push_token', JSON.stringify({
        token,
        storedAt: new Date().toISOString(),
        deviceId: await this.getDeviceId(),
      }));
      
      logger.info('Push token stored securely');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to store push token', { error });
      return {
        success: false,
        error: {
          code: 'PUSH_TOKEN_STORAGE_FAILED',
          message: 'Failed to store push notification token',
          details: error,
        },
      };
    }
  }

  /**
   * Get stored push notification token
   */
  async getPushToken(): Promise<Result<PushToken | null>> {
    try {
      const tokenData = await EncryptedStorage.getItem('push_token');
      if (!tokenData) {
        return { success: true, data: null };
      }

      const parsed = JSON.parse(tokenData);
      return { success: true, data: parsed.token as PushToken };
    } catch (error) {
      logger.error('Failed to retrieve push token', { error });
      return {
        success: false,
        error: {
          code: 'PUSH_TOKEN_RETRIEVAL_FAILED',
          message: 'Failed to retrieve push notification token',
          details: error,
        },
      };
    }
  }

  // Private helper methods
  private generateAuthPayload(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      deviceId: DeviceInfo.getUniqueId(),
      challenge: Math.random().toString(36).substring(7),
    });
  }

  private async storeLastAuthTime(): Promise<void> {
    await EncryptedStorage.setItem('last_auth_time', Date.now().toString());
  }

  private async getCurrentBiometricType(): Promise<BiometricType | undefined> {
    try {
      const { biometryType } = await this.rnBiometrics.isSensorAvailable();
      return this.mapBiometryType(biometryType);
    } catch {
      return undefined;
    }
  }

  private async getAvailableBiometricTypes(): Promise<BiometricType[]> {
    try {
      const { biometryType } = await this.rnBiometrics.isSensorAvailable();
      return this.mapBiometryTypes(biometryType);
    } catch {
      return [];
    }
  }

  private mapBiometryType(type: BiometryTypes | undefined): BiometricType | undefined {
    switch (type) {
      case BiometryTypes.TouchID:
        return 'TouchID';
      case BiometryTypes.FaceID:
        return 'FaceID';
      case BiometryTypes.Biometrics:
        return 'Fingerprint';
      default:
        return undefined;
    }
  }

  private mapBiometryTypes(type: BiometryTypes | undefined): BiometricType[] {
    const mapped = this.mapBiometryType(type);
    return mapped ? [mapped] : [];
  }

  private getErrorMessage(error: any): string {
    switch (error.code) {
      case BIOMETRIC.ERROR_CODES.BIOMETRIC_UNAVAILABLE:
        return 'Biometric authentication is not available on this device';
      case BIOMETRIC.ERROR_CODES.BIOMETRIC_NOT_ENROLLED:
        return 'Please set up biometric authentication in device settings';
      case BIOMETRIC.ERROR_CODES.BIOMETRIC_USER_CANCEL:
        return 'Authentication was cancelled';
      case BIOMETRIC.ERROR_CODES.BIOMETRIC_AUTHENTICATION_FAILED:
        return 'Biometric authentication failed. Please try again';
      case BIOMETRIC.ERROR_CODES.BIOMETRIC_PASSCODE_NOT_SET:
        return 'Please set up a passcode in device settings';
      default:
        return error.message || 'Biometric authentication error occurred';
    }
  }

  private getErrorType(error: any): BiometricAuthResult['error']['type'] {
    switch (error.code) {
      case BIOMETRIC.ERROR_CODES.BIOMETRIC_USER_CANCEL:
        return 'user_cancel';
      case BIOMETRIC.ERROR_CODES.BIOMETRIC_SYSTEM_CANCEL:
        return 'system_cancel';
      case BIOMETRIC.ERROR_CODES.BIOMETRIC_AUTHENTICATION_FAILED:
        return 'authentication_failed';
      case BIOMETRIC.ERROR_CODES.BIOMETRIC_UNAVAILABLE:
      case BIOMETRIC.ERROR_CODES.BIOMETRIC_NOT_ENROLLED:
      case BIOMETRIC.ERROR_CODES.BIOMETRIC_PASSCODE_NOT_SET:
        return 'biometric_unavailable';
      default:
        return 'authentication_failed';
    }
  }
}

export const biometricAuthService = new BiometricAuthService();