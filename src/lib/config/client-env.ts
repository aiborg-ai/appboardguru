/**
 * Client-side environment variables
 * Safe to use in browser code
 */

// Use Next.js public environment variables
export const clientEnv = {
  // Supabase configuration
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  
  // Analytics
  ANALYTICS_ENDPOINT: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || undefined,
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // Application URLs
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
} as const;

// Type-safe getter for client environment variables
export function getClientEnv<K extends keyof typeof clientEnv>(key: K): typeof clientEnv[K] {
  return clientEnv[key];
}

// Check if we're in browser
export const isBrowser = typeof window !== 'undefined';

// Check if we're in production
export const isProduction = clientEnv.NODE_ENV === 'production';