import { Ok as success, Err as failure } from '../result/result'
import type { Result } from '../result/types'
import { createSupabaseClient } from '@/lib/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export abstract class BaseService {
  protected supabase: SupabaseClient<Database>

  constructor(supabaseClient?: SupabaseClient<Database> | any) {
    // Use provided client or create a new one
    this.supabase = supabaseClient || createSupabaseClient()
  }

  /**
   * Get current authenticated user with Result pattern
   */
  protected async getCurrentUser(): Promise<Result<any, string>> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      if (error) {
        return failure(`Authentication failed: ${error.message}`)
      }
      if (!user) {
        return failure('No authenticated user found')
      }
      return success(user)
    } catch (error) {
      return failure(`Authentication error: ${(error as Error).message}`)
    }
  }

  /**
   * Handle service errors consistently with Result pattern
   */
  protected async handleError<T>(error: any, operation: string): Promise<Result<T, string>> {
    console.error(`Service error in ${operation}:`, error)
    const message = error.message || String(error)
    return failure(`Operation failed: ${operation} - ${message}`)
  }

  /**
   * Validate input data with Result pattern
   */
  protected validateInput<T>(data: any, schema: any): Result<T, string> {
    try {
      const validated = schema.parse(data)
      return success(validated)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return failure(`Invalid input: ${message}`)
    }
  }
}