import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'

export abstract class BaseRepository {
  protected supabase: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  /**
   * Execute a database transaction
   */
  protected async transaction<T>(
    callback: (client: SupabaseClient<Database>) => Promise<T>
  ): Promise<T> {
    // Supabase doesn't have native transactions yet, but we can implement
    // basic error handling and rollback mechanisms here in the future
    try {
      return await callback(this.supabase as any)
    } catch (error: any) {
      console.error('Transaction failed:', error)
      throw error
    }
  }

  /**
   * Handle common query errors
   */
  protected handleError(error: any, operation: string): never {
    console.error(`${operation} failed:`, error)
    throw new Error(`Database operation failed: ${operation}`)
  }

  /**
   * Get current user ID from auth context
   */
  protected async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await (this.supabase as any).auth.getUser()
    if (error || !user) {
      throw new Error('User not authenticated')
    }
    return (user as any).id
  }
}