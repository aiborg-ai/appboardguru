import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database'

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Please check your .env.local file.'
  )
}

/**
 * Parse cookies from document.cookie string
 */
function parseCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {}
  
  const cookies: Record<string, string> = {}
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies[name] = decodeURIComponent(value)
    }
  })
  return cookies
}

/**
 * Get a specific cookie value
 */
function getCookie(name: string): string | undefined {
  const cookies = parseCookies()
  return cookies[name]
}

/**
 * Set a cookie with proper attributes
 */
function setCookie(name: string, value: string, options?: any) {
  if (typeof document === 'undefined') return
  
  let cookieString = `${name}=${encodeURIComponent(value)}`
  
  // Add cookie attributes
  if (options?.maxAge) {
    cookieString += `; Max-Age=${options.maxAge}`
  }
  if (options?.expires) {
    cookieString += `; Expires=${options.expires.toUTCString()}`
  }
  cookieString += `; Path=${options?.path || '/'}`
  cookieString += '; SameSite=Lax'
  
  // Only add Secure for HTTPS (not localhost development)
  if (window.location.protocol === 'https:') {
    cookieString += '; Secure'
  }
  
  document.cookie = cookieString
}

/**
 * Remove a cookie
 */
function removeCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT`
}

/**
 * Create the Supabase browser client with proper cookie handling
 * This is the ONLY client that should be used throughout the app
 */
export const createSupabaseBrowserClient = () => {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          // Handle chunked cookies (Supabase may split large tokens)
          const mainCookie = getCookie(name)
          if (mainCookie) return mainCookie
          
          // Try to get chunked cookies
          let chunkedValue = ''
          for (let i = 0; i < 10; i++) {
            const chunk = getCookie(`${name}.${i}`)
            if (!chunk) break
            chunkedValue += chunk
          }
          
          return chunkedValue || undefined
        },
        set(name: string, value: string, options?: any) {
          // If value is too large, it might need to be chunked
          // But for now, just set it directly
          setCookie(name, value, options)
        },
        remove(name: string, options?: any) {
          // Remove main cookie
          removeCookie(name)
          
          // Also remove any chunked versions
          for (let i = 0; i < 10; i++) {
            removeCookie(`${name}.${i}`)
          }
        }
      }
    }
  )
}

/**
 * Singleton instance of the browser client
 * Use this for consistent session management across the app
 */
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export const supabase = (() => {
  if (typeof window === 'undefined') {
    // During SSR, return a placeholder that will be replaced on client
    return createSupabaseBrowserClient()
  }
  
  // Create singleton instance for client-side
  if (!clientInstance) {
    clientInstance = createSupabaseBrowserClient()
  }
  return clientInstance
})()

// Export the createSupabaseBrowserClient as the default way to create clients
export default createSupabaseBrowserClient

// Backward compatibility exports (all use the same browser client)
export const createSupabaseClient = createSupabaseBrowserClient
export const createClient = createSupabaseBrowserClient