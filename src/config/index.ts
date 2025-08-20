// Configuration exports
export * from './app.config'
export * from './database.config'
export * from './email.config'
export * from './ai.config'

// Re-export commonly used configurations
export { appConfig } from './app.config'
export { databaseConfig } from './database.config'
export { emailConfig } from './email.config'
export { aiConfig } from './ai.config'

// Configuration validation helper
export const validateConfigurations = () => {
  const errors: string[] = []
  
  // Check critical configurations
  try {
    // Database configuration is critical
    if (!databaseConfig.supabase.url || databaseConfig.supabase.url.includes('placeholder')) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is not configured')
    }
    
    if (!databaseConfig.supabase.anonKey || databaseConfig.supabase.anonKey.includes('placeholder')) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured')
    }

    // Email configuration warnings (not critical for development)
    if (process.env.NODE_ENV === 'production' && !emailConfig.features.enabled) {
      errors.push('Email configuration is incomplete for production')
    }

    // AI configuration warnings
    if (!aiConfig.openrouter.apiKey && process.env.NODE_ENV === 'production') {
      console.warn('AI features disabled: OPENROUTER_API_KEY not configured')
    }

  } catch (error) {
    errors.push(`Configuration validation failed: ${error}`)
  }

  if (errors.length > 0) {
    console.error('Configuration errors:', errors)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`)
    }
  }

  return errors.length === 0
}

// Environment-based configuration selector
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV
  
  return {
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    isTest: env === 'test',
    
    // Feature flags based on environment
    features: {
      ...appConfig.features,
      // Override specific features based on environment
      errorReporting: env === 'production',
      analytics: env === 'production',
      betaFeatures: env === 'development',
    },
    
    // Performance settings
    performance: {
      caching: env === 'production',
      compression: env === 'production',
      minification: env === 'production',
      sourceMap: env === 'development',
    },
  }
}

// Configuration health check
export const healthCheck = async () => {
  const health = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {
      database: false,
      email: false,
      ai: false,
    },
    errors: [] as string[],
  }

  // Check database
  try {
    const { checkDatabaseConnection } = await import('./database.config')
    const dbHealth = await checkDatabaseConnection()
    health.services.database = dbHealth.healthy
    if (!dbHealth.healthy && dbHealth.error) {
      health.errors.push(`Database: ${dbHealth.error}`)
    }
  } catch (error) {
    health.services.database = false
    health.errors.push(`Database: ${error}`)
  }

  // Check email
  health.services.email = emailConfig.features.enabled

  // Check AI
  health.services.ai = aiConfig.features.summarization.enabled

  return health
}

// Type exports
export type EnvironmentConfig = ReturnType<typeof getEnvironmentConfig>
export type HealthCheckResult = Awaited<ReturnType<typeof healthCheck>>