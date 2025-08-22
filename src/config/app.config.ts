import { z } from 'zod'

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('BoardGuru'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().default('Enterprise Board Management Platform'),
})

// Parse and validate environment variables
const env = envSchema.parse({
  NODE_ENV: process.env['NODE_ENV'],
  NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
  NEXT_PUBLIC_APP_NAME: process.env['NEXT_PUBLIC_APP_NAME'],
  NEXT_PUBLIC_APP_VERSION: process.env['npm_package_version'],
  NEXT_PUBLIC_APP_DESCRIPTION: process.env['NEXT_PUBLIC_APP_DESCRIPTION'],
})

// Application configuration
export const appConfig = {
  // Basic app info
  name: env.NEXT_PUBLIC_APP_NAME,
  version: env.NEXT_PUBLIC_APP_VERSION,
  description: env.NEXT_PUBLIC_APP_DESCRIPTION,
  url: env.NEXT_PUBLIC_APP_URL,
  environment: env.NODE_ENV,

  // Development settings
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  // Feature flags
  features: {
    aiSummarization: true,
    advancedPermissions: true,
    auditLogs: true,
    ssoIntegration: env.NODE_ENV === 'production',
    betaFeatures: env.NODE_ENV === 'development',
    analytics: env.NODE_ENV === 'production',
    errorReporting: env.NODE_ENV === 'production',
  },

  // UI Configuration
  ui: {
    defaultTheme: 'light' as const,
    supportedThemes: ['light', 'dark', 'system'] as const,
    defaultLocale: 'en',
    supportedLocales: ['en'] as const,
    dateFormat: 'MMM dd, yyyy',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'MMM dd, yyyy HH:mm',
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    defaultPage: 1,
  },

  // File upload limits
  uploads: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ],
    thumbnailSizes: {
      small: { width: 150, height: 150 },
      medium: { width: 300, height: 300 },
      large: { width: 600, height: 600 },
    },
  },

  // Security settings
  security: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    passwordMinLength: 8,
    passwordRequirements: {
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    },
    otpExpiration: 10 * 60 * 1000, // 10 minutes
    invitationExpiration: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
  },

  // API Configuration
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
  },

  // External URLs
  urls: {
    support: 'mailto:support@boardguru.ai',
    documentation: 'https://docs.boardguru.ai',
    privacy: 'https://boardguru.ai/privacy',
    terms: 'https://boardguru.ai/terms',
    status: 'https://status.boardguru.ai',
  },

  // Monitoring and analytics
  monitoring: {
    enableErrorTracking: env.NODE_ENV === 'production',
    enablePerformanceMonitoring: env.NODE_ENV === 'production',
    enableUserTracking: env.NODE_ENV === 'production',
    sampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  },

  // Toast notifications
  notifications: {
    position: 'top-right' as const,
    duration: 5000, // 5 seconds
    maxVisible: 3,
    pauseOnHover: true,
    closeOnClick: true,
  },

  // Organization settings
  organizations: {
    maxMembers: {
      free: 5,
      professional: 50,
      enterprise: 1000,
    },
    maxVaults: {
      free: 3,
      professional: 50,
      enterprise: 1000,
    },
    maxStorage: {
      free: 1024 * 1024 * 1024, // 1GB
      professional: 50 * 1024 * 1024 * 1024, // 50GB
      enterprise: 1000 * 1024 * 1024 * 1024, // 1TB
    },
  },

  // AI Configuration
  ai: {
    maxTokens: 4000,
    temperature: 0.7,
    summaryTypes: ['brief', 'detailed', 'executive'] as const,
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it'] as const,
    maxChatHistory: 20,
  },
} as const

// Type-safe configuration access
export type AppConfig = typeof appConfig

// Configuration helpers
export const getFeatureFlag = (feature: keyof typeof appConfig.features): boolean => {
  return appConfig.features[feature]
}

export const getUploadLimit = (planType?: 'free' | 'professional' | 'enterprise'): number => {
  if (!planType) return appConfig.uploads.maxFileSize
  return appConfig.organizations.maxStorage[planType] || appConfig.uploads.maxFileSize
}

export const isFeatureEnabled = (feature: keyof typeof appConfig.features): boolean => {
  return appConfig.features[feature]
}

// Development helpers
export const isDev = () => appConfig.isDevelopment
export const isProd = () => appConfig.isProduction
export const isTest = () => appConfig.isTest