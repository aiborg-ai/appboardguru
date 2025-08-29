/**
 * Centralized Environment Configuration
 * Handles all environment variables with proper validation and fallbacks
 */

import { z } from 'zod'

// Environment variable schema with validation
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Application URLs
  APP_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),
  
  // Database Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Email Configuration
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  
  // Security
  NEXTAUTH_SECRET: z.string().optional(),
  
  // AI Configuration
  OPENROUTER_API_KEY: z.string().optional(),
  
  // File Storage
  MAX_FILE_SIZE: z.string().default('50MB'),
  ALLOWED_FILE_TYPES: z.string().default('pdf,docx,pptx,xlsx,txt')
})

// Type for validated environment variables
export type Environment = z.infer<typeof envSchema>

/**
 * Get and validate environment variables
 */
function getEnvironment(): Environment {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Environment validation failed:')
    if (error instanceof z.ZodError) {
      error.issues.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`)
      })
    }
    throw new Error('Invalid environment configuration')
  }
}

// Validated environment variables
export const env = getEnvironment()

/**
 * Get the application base URL with proper fallback logic
 */
export function getAppUrl(): string {
  // Priority order for URL determination:
  // 1. APP_URL environment variable (explicit override - highest priority)
  // 2. NEXTAUTH_URL (usually set to main domain)
  // 3. VERCEL_URL for Vercel deployments (automatic but includes preview URLs)
  // 4. localhost fallback for development
  
  // Check for explicit APP_URL first (recommended for production)
  if (env.APP_URL) {
    console.log('🔗 Using APP_URL:', env.APP_URL)
    return env.APP_URL
  }
  
  // Use NEXTAUTH_URL if set (usually the main domain)
  if (env.NEXTAUTH_URL) {
    console.log('🔗 Using NEXTAUTH_URL:', env.NEXTAUTH_URL)
    return env.NEXTAUTH_URL
  }
  
  // Fall back to VERCEL_URL if available (includes preview deployments)
  if (env.VERCEL_URL) {
    // VERCEL_URL doesn't include protocol, so add it
    const url = env.VERCEL_URL.startsWith('http') 
      ? env.VERCEL_URL 
      : `https://${env.VERCEL_URL}`
    console.log('🔗 Using VERCEL_URL:', url)
    return url
  }
  
  console.log('🔗 Using localhost fallback')
  return 'http://localhost:3000'
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development'
}

/**
 * Get SMTP configuration
 */
export function getSmtpConfig() {
  return {
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT),
    secure: env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  }
}

/**
 * Get file upload configuration
 */
export function getFileConfig() {
  const maxSize = env.MAX_FILE_SIZE
  const sizeInBytes = maxSize.endsWith('MB') 
    ? parseInt(maxSize.replace('MB', '')) * 1024 * 1024
    : parseInt(maxSize)
    
  return {
    maxSize: sizeInBytes,
    allowedTypes: env.ALLOWED_FILE_TYPES.split(',').map(type => type.trim()),
  }
}

/**
 * Log environment configuration (safe for production)
 */
export function logEnvironmentInfo() {
  if (isDevelopment()) {
    console.log('🔧 Environment Configuration:')
    console.log(`   Environment: ${env.NODE_ENV}`)
    console.log(`   App URL: ${getAppUrl()}`)
    console.log(`   SMTP Host: ${env.SMTP_HOST}`)
    console.log(`   Admin Email: ${env.ADMIN_EMAIL}`)
    console.log(`   OpenRouter API: ${env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Missing'}`)
  }
}