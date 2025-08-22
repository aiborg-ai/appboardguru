/**
 * Enterprise-Grade Typed Supabase Client Wrapper
 * Implements DDD architecture with Result pattern and repository compatibility
 * Following AppBoardGuru architecture guidelines from CLAUDE.md
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import type { TypedSupabaseClient } from '@/types/api'
import { Result } from '@/lib/repositories/result'
import { RepositoryError } from '@/lib/repositories/document-errors'

/**
 * Branded type for Supabase operations to prevent misuse
 */
type SupabaseOperation<T> = T & { readonly __supabaseOp: unique symbol }

/**
 * Enhanced TypedSupabaseClient interface for repository pattern
 */
export interface EnhancedTypedSupabaseClient {
  readonly client: TypedSupabaseClient
  
  /**
   * Execute a safe query that returns a Result
   */
  executeQuery<T>(
    operation: () => Promise<{ data: T | null; error: any }>
  ): Promise<Result<T>>
  
  /**
   * Execute a safe query for arrays that returns a Result
   */
  executeArrayQuery<T>(
    operation: () => Promise<{ data: T[] | null; error: any }>
  ): Promise<Result<T[]>>
  
  /**
   * Execute a safe mutation that returns a Result
   */
  executeMutation<T>(
    operation: () => Promise<{ data: T | null; error: any }>
  ): Promise<Result<T>>
  
  /**
   * Get authenticated user safely with Result pattern
   */
  getAuthenticatedUser(): Promise<Result<Database['public']['Tables']['users']['Row']>>
  
  /**
   * Raw client access for repository patterns only
   * Should only be used within repository implementations
   */
  getRepositoryClient(): TypedSupabaseClient
}

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
 * Create enhanced Supabase client with Result pattern and repository compatibility
 */
export async function createEnhancedSupabaseClient(): Promise<Result<EnhancedTypedSupabaseClient>> {
  try {
    const client = await createTypedSupabaseClient()

    const enhancedClient: EnhancedTypedSupabaseClient = {
      client,
      
      async executeQuery<T>(
        operation: () => Promise<{ data: T | null; error: any }>
      ): Promise<Result<T>> {
        try {
          const { data, error } = await operation()
          
          if (error) {
            return {
              success: false,
              error: new RepositoryError(
                `Query failed: ${error.message}`,
                'QUERY_ERROR',
                { originalError: error },
                'medium',
                true
              )
            }
          }
          
          if (data === null) {
            return {
              success: false,
              error: new RepositoryError(
                'Query returned null data',
                'NOT_FOUND',
                {},
                'low',
                true
              )
            }
          }
          
          return { success: true, data }
        } catch (error) {
          return {
            success: false,
            error: new RepositoryError(
              `Unexpected query error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              'UNEXPECTED_ERROR',
              { originalError: error },
              'high',
              false
            )
          }
        }
      },
      
      async executeArrayQuery<T>(
        operation: () => Promise<{ data: T[] | null; error: any }>
      ): Promise<Result<T[]>> {
        try {
          const { data, error } = await operation()
          
          if (error) {
            return {
              success: false,
              error: new RepositoryError(
                `Array query failed: ${error.message}`,
                'QUERY_ERROR',
                { originalError: error },
                'medium',
                true
              )
            }
          }
          
          // For arrays, null means empty array
          return { success: true, data: data || [] }
        } catch (error) {
          return {
            success: false,
            error: new RepositoryError(
              `Unexpected array query error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              'UNEXPECTED_ERROR',
              { originalError: error },
              'high',
              false
            )
          }
        }
      },
      
      async executeMutation<T>(
        operation: () => Promise<{ data: T | null; error: any }>
      ): Promise<Result<T>> {
        try {
          const { data, error } = await operation()
          
          if (error) {
            return {
              success: false,
              error: new RepositoryError(
                `Mutation failed: ${error.message}`,
                'MUTATION_ERROR',
                { originalError: error },
                'high',
                true
              )
            }
          }
          
          if (data === null) {
            return {
              success: false,
              error: new RepositoryError(
                'Mutation returned null data',
                'MUTATION_NULL_RESULT',
                {},
                'medium',
                true
              )
            }
          }
          
          return { success: true, data }
        } catch (error) {
          return {
            success: false,
            error: new RepositoryError(
              `Unexpected mutation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              'UNEXPECTED_ERROR',
              { originalError: error },
              'critical',
              false
            )
          }
        }
      },
      
      async getAuthenticatedUser(): Promise<Result<Database['public']['Tables']['users']['Row']>> {
        try {
          const { data: { user }, error: authError } = await client.auth.getUser()
          
          if (authError) {
            return {
              success: false,
              error: new RepositoryError(
                `Authentication failed: ${authError.message}`,
                'AUTH_ERROR',
                { originalError: authError },
                'high',
                true
              )
            }
          }
          
          if (!user) {
            return {
              success: false,
              error: new RepositoryError(
                'User not authenticated',
                'UNAUTHENTICATED',
                {},
                'medium',
                true
              )
            }
          }
          
          // Get user profile from users table
          const { data: userProfile, error: profileError } = await client
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (profileError) {
            return {
              success: false,
              error: new RepositoryError(
                `Failed to fetch user profile: ${profileError.message}`,
                'PROFILE_ERROR',
                { originalError: profileError, userId: user.id },
                'medium',
                true
              )
            }
          }
          
          if (!userProfile) {
            return {
              success: false,
              error: new RepositoryError(
                'User profile not found',
                'PROFILE_NOT_FOUND',
                { userId: user.id },
                'medium',
                true
              )
            }
          }
          
          return { success: true, data: userProfile }
        } catch (error) {
          return {
            success: false,
            error: new RepositoryError(
              `Unexpected authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              'UNEXPECTED_ERROR',
              { originalError: error },
              'critical',
              false
            )
          }
        }
      },
      
      getRepositoryClient() {
        return client
      }
    }

    return { success: true, data: enhancedClient }
  } catch (error) {
    return {
      success: false,
      error: new RepositoryError(
        `Failed to create Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLIENT_CREATION_ERROR',
        { originalError: error },
        'critical',
        false
      )
    }
  }
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
 * Enhanced API route context with Result pattern
 */
export interface EnhancedApiRouteContext {
  supabase: EnhancedTypedSupabaseClient
  user: Database['public']['Tables']['users']['Row']
  request: Request
  params: Record<string, string>
}

/**
 * Utility function to get authenticated user from Supabase client
 * @deprecated Use EnhancedTypedSupabaseClient.getAuthenticatedUser() for Result pattern
 */
export async function getAuthenticatedUser(supabase: TypedSupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

/**
 * Type guard for Supabase operations
 */
export function isSupabaseOperation<T>(value: any): value is SupabaseOperation<T> {
  return value && typeof value === 'object' && '__supabaseOp' in value
}