/**
 * Client-side environment variables
 * Safe to use in browser code
 */

// Check if we're in browser
export const isBrowser = typeof window !== 'undefined';

// Safe environment variable access that works in both server and client
function getEnvVar(key: string, defaultValue?: string): string | undefined {
  if (isBrowser) {
    // In browser, only NEXT_PUBLIC_ variables are available
    if (key.startsWith('NEXT_PUBLIC_')) {
      return (window as any).__ENV?.[key] || defaultValue;
    }
    // For NODE_ENV, check if it's set on window
    if (key === 'NODE_ENV') {
      return (window as any).__ENV?.NODE_ENV || 'production';
    }
    return defaultValue;
  }
  // On server, use process.env
  return process.env[key] || defaultValue;
}

// Use Next.js public environment variables
export const clientEnv = {
  // Supabase configuration
  SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL', ''),
  SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''),
  
  // Analytics
  ANALYTICS_ENDPOINT: getEnvVar('NEXT_PUBLIC_ANALYTICS_ENDPOINT'),
  
  // Environment
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  IS_PRODUCTION: getEnvVar('NODE_ENV', 'development') === 'production',
  
  // Application URLs
  APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL', isBrowser ? window.location.origin : 'http://localhost:3000'),
} as const;

// Type-safe getter for client environment variables
export function getClientEnv<K extends keyof typeof clientEnv>(key: K): typeof clientEnv[K] {
  return clientEnv[key];
}

// Check if we're in production
export const isProduction = clientEnv.NODE_ENV === 'production';

// Initialize environment variables on window object for client-side access
if (isBrowser && !(window as any).__ENV) {
  (window as any).__ENV = {
    NEXT_PUBLIC_SUPABASE_URL: '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    NODE_ENV: 'production'
  };
}