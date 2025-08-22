import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import type { TypedSupabaseClient } from '@/types/api'

/**
 * Create a properly typed Supabase server client for API routes
 */
export async function createTypedSupabaseClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies()
  
  return createServerClient<Database>(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

/**
 * Common pattern for API route handlers with proper typing
 */
export interface ApiRouteContext {
  supabase: TypedSupabaseClient
  user: {
    id: string
    email?: string
  }
  request: Request
  params: Record<string, string>
}

/**
 * Utility function to get authenticated user from Supabase client
 */
export async function getAuthenticatedUser(supabase: TypedSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Unauthorized')
  }
  
  return user
}