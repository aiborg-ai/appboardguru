import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import type { Database } from '../types/database'

/**
 * Create a Supabase server client that supports both cookie and header authentication
 * This is needed for API routes that receive Authorization headers from client-side fetch
 */
export const createSupabaseServerClientWithAuth = async (request?: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  
  const cookieStore = await cookies()

  // Create client with cookie support
  const supabase = createServerClient<Database>(
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

  // If request is provided and has Authorization header, use it
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      // For API requests with Bearer token, we need to validate it differently
      // Since setSession doesn't work properly with just access_token
      // We'll override the auth.getUser method to use the token directly
      const originalGetUser = supabase.auth.getUser
      supabase.auth.getUser = async () => {
        try {
          // Use the admin API to verify the JWT token
          const { data, error } = await supabase.auth.getUser(token)
          return { data, error }
        } catch (e) {
          // Fallback to cookie-based auth
          return originalGetUser.call(supabase.auth)
        }
      }
    }
  }

  return supabase
}