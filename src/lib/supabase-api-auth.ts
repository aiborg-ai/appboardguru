import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import type { Database } from '../types/database'

/**
 * Create a Supabase client for API routes that uses JWT token from Authorization header
 * This bypasses the SSR cookie-based auth and uses the token directly
 */
export const createSupabaseApiClient = async (request: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  // Get the authorization header
  const authHeader = request.headers.get('authorization')
  
  // Create a client with the auth header
  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {}
    }
  })

  return supabase
}