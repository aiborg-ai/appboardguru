import { createClient } from '@supabase/supabase-js'
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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export const createSupabaseBrowserClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
  
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}

export const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
  
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}

// Alias for backward compatibility
export { createSupabaseClient as createClient }