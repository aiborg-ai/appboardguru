import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Environment validation schema
const databaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().url().optional(),
})

// Parse environment variables with fallbacks for build-time safety
const getDatabaseEnv = () => {
  try {
    return databaseEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
      DATABASE_URL: process.env['DATABASE_URL'],
    })
  } catch (error) {
    // Fallback for build-time when env vars might not be available
    return {
      NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      DATABASE_URL: undefined,
    }
  }
}

const env = getDatabaseEnv()

// Database configuration
export const databaseConfig = {
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // Connection settings
  connection: {
    maxConnections: 20,
    idleTimeout: 30000, // 30 seconds
    connectionTimeout: 60000, // 60 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Query settings
  query: {
    timeout: 30000, // 30 seconds
    maxRows: 1000,
    defaultLimit: 50,
  },

  // Cache settings
  cache: {
    enabled: process.env['NODE_ENV'] === 'production',
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100, // Maximum cached queries
  },

  // Auth settings
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const,
  },

  // Security settings
  security: {
    enableRLS: true,
    requireAuth: true,
    auditChanges: process.env['NODE_ENV'] === 'production',
  },

  // Storage settings
  storage: {
    buckets: {
      boardPacks: 'board-packs',
      avatars: 'avatars',
      organizationLogos: 'organization-logos',
      temp: 'temp-uploads',
    },
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
} as const

// Client factory functions
export const createSupabaseClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('createSupabaseClient should only be called on the client side')
  }

  return createClient<Database>(
    databaseConfig.supabase.url,
    databaseConfig.supabase.anonKey,
    {
      auth: databaseConfig.auth,
      global: {
        headers: {
          'X-Client-Info': 'boardguru-web',
        },
      },
    }
  )
}

export const createSupabaseServerClient = (cookies: { get: (name: string) => string | undefined; set: (name: string, value: string, options?: any) => void }) => {
  return createServerClient<Database>(
    databaseConfig.supabase.url,
    databaseConfig.supabase.anonKey,
    {
      cookies,
      auth: databaseConfig.auth,
    }
  )
}

export const createSupabaseAdminClient = () => {
  if (!databaseConfig.supabase.serviceRoleKey) {
    throw new Error('Service role key is required for admin client')
  }

  return createClient<Database>(
    databaseConfig.supabase.url,
    databaseConfig.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'boardguru-admin',
        },
      },
    }
  )
}

// Helper functions
export const getStorageBucket = (type: keyof typeof databaseConfig.storage.buckets) => {
  return databaseConfig.storage.buckets[type]
}

export const isValidFileSize = (size: number) => {
  return size <= databaseConfig.storage.maxFileSize
}

export const isValidMimeType = (mimeType: string): mimeType is typeof databaseConfig.storage.allowedMimeTypes[number] => {
  return (databaseConfig.storage.allowedMimeTypes as readonly string[]).includes(mimeType)
}

// Connection health check
export const checkDatabaseConnection = async () => {
  try {
    const client = createSupabaseClient()
    const { data, error } = await client.from('users').select('id').limit(1)
    
    return {
      healthy: !error,
      error: error?.message,
      latency: Date.now(), // Could be improved with actual latency measurement
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: null,
    }
  }
}

// Type exports
export type DatabaseConfig = typeof databaseConfig
export type StorageBucket = keyof typeof databaseConfig.storage.buckets