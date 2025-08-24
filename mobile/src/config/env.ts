/**
 * Environment Configuration for Mobile App
 * Validates and provides type-safe access to environment variables
 */

import { z } from 'zod';
import Config from 'react-native-config';

// Environment validation schema
const envSchema = z.object({
  // API Configuration
  API_URL: z.string().url('Invalid API URL'),
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key required'),
  
  // App Configuration
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  APP_VERSION: z.string().default('1.0.0'),
  
  // Security Configuration
  CERTIFICATE_PINS: z.string().optional(),
  ENABLE_SSL_PINNING: z.string().transform(val => val === 'true').default('false'),
  
  // Feature Flags
  ENABLE_BIOMETRIC_AUTH: z.string().transform(val => val === 'true').default('true'),
  ENABLE_OFFLINE_MODE: z.string().transform(val => val === 'true').default('true'),
  ENABLE_PUSH_NOTIFICATIONS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_VOICE_INPUT: z.string().transform(val => val === 'true').default('true'),
  
  // Performance Configuration
  OFFLINE_SYNC_INTERVAL: z.string().transform(val => parseInt(val, 10)).default('60000'),
  MAX_OFFLINE_STORAGE_MB: z.string().transform(val => parseInt(val, 10)).default('500'),
  
  // Analytics Configuration (optional)
  ANALYTICS_ENDPOINT: z.string().url().optional(),
  CRASHLYTICS_ENABLED: z.string().transform(val => val === 'true').default('false'),
});

// Parse and validate environment variables
const envVars = {
  API_URL: Config.API_URL,
  SUPABASE_URL: Config.SUPABASE_URL,
  SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY,
  APP_ENV: Config.APP_ENV,
  APP_VERSION: Config.APP_VERSION,
  CERTIFICATE_PINS: Config.CERTIFICATE_PINS,
  ENABLE_SSL_PINNING: Config.ENABLE_SSL_PINNING,
  ENABLE_BIOMETRIC_AUTH: Config.ENABLE_BIOMETRIC_AUTH,
  ENABLE_OFFLINE_MODE: Config.ENABLE_OFFLINE_MODE,
  ENABLE_PUSH_NOTIFICATIONS: Config.ENABLE_PUSH_NOTIFICATIONS,
  ENABLE_VOICE_INPUT: Config.ENABLE_VOICE_INPUT,
  OFFLINE_SYNC_INTERVAL: Config.OFFLINE_SYNC_INTERVAL,
  MAX_OFFLINE_STORAGE_MB: Config.MAX_OFFLINE_STORAGE_MB,
  ANALYTICS_ENDPOINT: Config.ANALYTICS_ENDPOINT,
  CRASHLYTICS_ENABLED: Config.CRASHLYTICS_ENABLED,
};

let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(envVars);
} catch (error) {
  console.error('Environment validation failed:', error);
  throw new Error('Invalid environment configuration. Check your .env file.');
}

export { env };

// Type-safe environment access
export const Environment = {
  // API Configuration
  get apiUrl() { return env.API_URL; },
  get supabaseUrl() { return env.SUPABASE_URL; },
  get supabaseAnonKey() { return env.SUPABASE_ANON_KEY; },
  
  // App Configuration
  get isDevelopment() { return env.APP_ENV === 'development'; },
  get isStaging() { return env.APP_ENV === 'staging'; },
  get isProduction() { return env.APP_ENV === 'production'; },
  get appVersion() { return env.APP_VERSION; },
  
  // Security Configuration
  get certificatePins() { 
    return env.CERTIFICATE_PINS ? env.CERTIFICATE_PINS.split(',') : [];
  },
  get sslPinningEnabled() { return env.ENABLE_SSL_PINNING; },
  
  // Feature Flags
  get biometricAuthEnabled() { return env.ENABLE_BIOMETRIC_AUTH; },
  get offlineModeEnabled() { return env.ENABLE_OFFLINE_MODE; },
  get pushNotificationsEnabled() { return env.ENABLE_PUSH_NOTIFICATIONS; },
  get voiceInputEnabled() { return env.ENABLE_VOICE_INPUT; },
  
  // Performance Configuration
  get offlineSyncInterval() { return env.OFFLINE_SYNC_INTERVAL; },
  get maxOfflineStorageMb() { return env.MAX_OFFLINE_STORAGE_MB; },
  
  // Analytics Configuration
  get analyticsEndpoint() { return env.ANALYTICS_ENDPOINT; },
  get crashlyticsEnabled() { return env.CRASHLYTICS_ENABLED; },
  
  // Computed values
  get isDebugMode() { 
    return this.isDevelopment || __DEV__;
  },
  
  get offlineStorageQuotaBytes() {
    return this.maxOfflineStorageMb * 1024 * 1024;
  }
} as const;

export default Environment;