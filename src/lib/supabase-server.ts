import { createServerClient as createSupabaseServerClientBase } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../types/database'

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies()

  return createSupabaseServerClientBase<Database>(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://placeholder.supabase.co',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 'placeholder-key',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// Alternative export names for compatibility
export const createServerSupabaseClient = createSupabaseServerClient
export const createServerClient = createSupabaseServerClient

// Direct supabase instance export for legacy compatibility
// Note: This creates a Promise, so files using this need to await it
export const supabase = createSupabaseServerClient()

// Re-export the base createServerClient from @supabase/ssr for direct access
export { createServerClient as createSupabaseServerClientBase } from '@supabase/ssr'