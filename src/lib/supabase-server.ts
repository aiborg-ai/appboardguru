import { createServerClient as createSupabaseServerClientBase } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../types/database'

export const createSupabaseServerClient = async () => {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase Server] Missing environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    })
    throw new Error('Supabase environment variables are not configured')
  }
  
  const cookieStore = await cookies()

  return createSupabaseServerClientBase<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// Safe wrapper that returns null if Supabase is not configured
export const createSupabaseServerClientSafe = async () => {
  try {
    return await createSupabaseServerClient()
  } catch (error) {
    console.error('[Supabase Safe] Failed to create client:', error)
    return null
  }
}

// Alternative export names for compatibility
export const createServerSupabaseClient = createSupabaseServerClient
export const createServerClient = createSupabaseServerClient

// Direct supabase instance export removed to fix cookies() scope issues
// Use createSupabaseServerClient() in route handlers instead

// Re-export the base createServerClient from @supabase/ssr for direct access
export { createServerClient as createSupabaseServerClientBase } from '@supabase/ssr'