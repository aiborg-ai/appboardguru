/**
 * Mobile Auth Store
 * Zustand store for authentication state with mobile-specific features
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { 
  MobileAuthSession, 
  Result, 
  UserId, 
  OrganizationId,
  DeviceId,
} from '@/types/mobile';
import type { UserWithProfile } from '@/shared-types';
import { mobileAuthService } from '@/services/auth/MobileAuthService';
import { biometricAuthService } from '@/services/auth/BiometricAuthService';
import { secureStorageService } from '@/services/auth/SecureStorageService';
import { Environment } from '@/config/env';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AuthStore');

export interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserWithProfile | null;
  session: MobileAuthSession | null;
  error: string | null;
  
  // Biometric state
  biometricEnabled: boolean;
  biometricSupported: boolean;
  
  // Device state
  deviceId: DeviceId | null;
  lastActivity: number;
  
  // Actions
  login: (email: string, password: string, useBiometric?: boolean) => Promise<Result<void>>;
  loginWithBiometric: () => Promise<Result<void>>;
  logout: () => Promise<Result<void>>;
  refreshSession: () => Promise<Result<void>>;
  updateLastActivity: () => void;
  clearError: () => void;
  
  // Biometric actions
  setupBiometric: () => Promise<Result<void>>;
  disableBiometric: () => Promise<Result<void>>;
  
  // Internal actions
  _initialize: () => Promise<void>;
  _setSession: (session: MobileAuthSession) => void;
  _clearSession: () => void;
  _setError: (error: string) => void;
  _setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      isLoading: false,
      user: null,
      session: null,
      error: null,
      biometricEnabled: false,
      biometricSupported: false,
      deviceId: null,
      lastActivity: 0,

      // Login with email/password
      login: async (email: string, password: string, useBiometric = false) => {
        try {
          set({ isLoading: true, error: null });
          
          logger.info('Starting login process', { email, useBiometric });
          
          const result = await mobileAuthService.login({
            email,
            password,
            useBiometric,
          });

          if (!result.success) {
            set({ error: result.error.message, isLoading: false });
            return result;
          }

          // Update store state
          get()._setSession(result.data);
          
          logger.info('Login successful');
          return { success: true, data: undefined };
        } catch (error: any) {
          logger.error('Login process failed', { error });
          const errorMessage = error.message || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          return {
            success: false,
            error: {
              code: 'LOGIN_FAILED',
              message: errorMessage,
              details: error,
            },
          };
        }
      },

      // Login with biometric authentication
      loginWithBiometric: async () => {
        try {
          set({ isLoading: true, error: null });
          
          logger.info('Starting biometric login');
          
          const result = await mobileAuthService.authenticateWithBiometric();

          if (!result.success) {
            set({ error: result.error.message, isLoading: false });
            return result;
          }

          // Update store state
          get()._setSession(result.data);
          
          logger.info('Biometric login successful');
          return { success: true, data: undefined };
        } catch (error: any) {
          logger.error('Biometric login failed', { error });
          const errorMessage = error.message || 'Biometric authentication failed';
          set({ error: errorMessage, isLoading: false });
          return {
            success: false,
            error: {
              code: 'BIOMETRIC_LOGIN_FAILED',
              message: errorMessage,
              details: error,
            },
          };
        }
      },

      // Logout
      logout: async () => {
        try {
          set({ isLoading: true });
          
          logger.info('Starting logout process');
          
          const result = await mobileAuthService.logout();

          // Clear store state regardless of result
          get()._clearSession();
          
          if (!result.success) {
            logger.warn('Logout had issues but session cleared', { error: result.error });
          } else {
            logger.info('Logout successful');
          }
          
          return { success: true, data: undefined };
        } catch (error: any) {
          logger.error('Logout process failed', { error });
          
          // Clear session anyway for security
          get()._clearSession();
          
          return {
            success: false,
            error: {
              code: 'LOGOUT_FAILED',
              message: error.message || 'Logout failed',
              details: error,
            },
          };
        }
      },

      // Refresh session
      refreshSession: async () => {
        try {
          const result = await mobileAuthService.refreshSession();

          if (!result.success) {
            // Session refresh failed, clear session
            get()._clearSession();
            return result;
          }

          // Update store state
          get()._setSession(result.data);
          
          logger.info('Session refreshed successfully');
          return { success: true, data: undefined };
        } catch (error: any) {
          logger.error('Session refresh failed', { error });
          get()._clearSession();
          return {
            success: false,
            error: {
              code: 'SESSION_REFRESH_FAILED',
              message: error.message || 'Session refresh failed',
              details: error,
            },
          };
        }
      },

      // Update last activity
      updateLastActivity: () => {
        const now = Date.now();
        set({ lastActivity: now });
        
        // Update in session if available
        const { session, user } = get();
        if (session && user) {
          mobileAuthService.updateLastActivity(user.id);
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Setup biometric authentication
      setupBiometric: async () => {
        try {
          const { user } = get();
          if (!user) {
            return {
              success: false,
              error: {
                code: 'NO_USER',
                message: 'No authenticated user',
              },
            };
          }

          const result = await biometricAuthService.setupBiometricAuth(user.id);

          if (result.success) {
            set({ biometricEnabled: true });
            logger.info('Biometric authentication setup successful');
          }

          return result;
        } catch (error: any) {
          logger.error('Biometric setup failed', { error });
          return {
            success: false,
            error: {
              code: 'BIOMETRIC_SETUP_FAILED',
              message: error.message || 'Biometric setup failed',
              details: error,
            },
          };
        }
      },

      // Disable biometric authentication
      disableBiometric: async () => {
        try {
          const result = await biometricAuthService.clearSecureCredentials();

          if (result.success) {
            set({ biometricEnabled: false });
            logger.info('Biometric authentication disabled');
          }

          return result;
        } catch (error: any) {
          logger.error('Biometric disable failed', { error });
          return {
            success: false,
            error: {
              code: 'BIOMETRIC_DISABLE_FAILED',
              message: error.message || 'Failed to disable biometric authentication',
              details: error,
            },
          };
        }
      },

      // Initialize auth state
      _initialize: async () => {
        try {
          set({ isLoading: true });
          
          logger.info('Initializing auth store');

          // Check biometric support
          const biometricConfig = await biometricAuthService.initialize();
          const biometricSupported = biometricConfig.success && biometricConfig.data.enabled;
          const biometricEnabled = await biometricAuthService.isBiometricConfigured();

          // Check if user is authenticated
          const isAuthenticated = await mobileAuthService.isAuthenticated();

          if (isAuthenticated) {
            // Try to get existing session
            const sessionResult = await secureStorageService.getSessionData();
            
            if (sessionResult.success && sessionResult.data) {
              // Build session from stored data
              const session: MobileAuthSession = {
                user: {
                  id: sessionResult.data.userId,
                  email: '', // Will be populated when refreshed
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                } as UserWithProfile,
                deviceId: sessionResult.data.deviceId,
                biometricEnabled,
                pushTokenRegistered: true,
                lastActivity: sessionResult.data.lastAuthTime,
                expiresAt: sessionResult.data.expiresAt,
              };

              get()._setSession(session);
              
              // Refresh session to get full user data
              await get().refreshSession();
            }
          }

          set({
            biometricSupported,
            biometricEnabled,
            isLoading: false,
          });

          logger.info('Auth store initialized', {
            isAuthenticated,
            biometricSupported,
            biometricEnabled,
          });
        } catch (error) {
          logger.error('Auth store initialization failed', { error });
          set({ isLoading: false });
        }
      },

      // Set session
      _setSession: (session: MobileAuthSession) => {
        set({
          isAuthenticated: true,
          user: session.user,
          session,
          deviceId: session.deviceId,
          biometricEnabled: session.biometricEnabled,
          lastActivity: session.lastActivity,
          isLoading: false,
          error: null,
        });
      },

      // Clear session
      _clearSession: () => {
        set({
          isAuthenticated: false,
          user: null,
          session: null,
          isLoading: false,
          error: null,
          lastActivity: 0,
        });
      },

      // Set error
      _setError: (error: string) => {
        set({ error, isLoading: false });
      },

      // Set loading
      _setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist non-sensitive state
        biometricSupported: state.biometricSupported,
        biometricEnabled: state.biometricEnabled,
        deviceId: state.deviceId,
        lastActivity: state.lastActivity,
      }),
      onRehydrateStorage: () => (state) => {
        // Initialize after rehydration
        if (state) {
          state._initialize();
        }
      },
    }
  )
);