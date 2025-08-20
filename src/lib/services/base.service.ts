import { RepositoryFactory } from '@/lib/repositories'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

export abstract class BaseService {
  protected repositories: RepositoryFactory
  protected supabase: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
    this.repositories = new RepositoryFactory(supabase)
  }

  /**
   * Get current authenticated user
   */
  protected async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error || !user) {
      throw new Error('User not authenticated')
    }
    return user
  }

  /**
   * Check if user has permission for a resource
   */
  protected async checkPermission(
    userId: string, 
    resource: string, 
    action: string,
    resourceId?: string
  ): Promise<boolean> {
    // Implement permission checking logic
    // This would integrate with your permission system
    return true // Placeholder
  }

  /**
   * Log service activity for audit purposes
   */
  protected async logActivity(
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>
  ) {
    try {
      const user = await this.getCurrentUser()
      
      await this.supabase.from('audit_logs').insert({
        user_id: user.id,
        event_type: 'user_action',
        event_category: 'service',
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        event_description: `${action} ${resourceType}${resourceId ? ` ${resourceId}` : ''}`,
        details,
        severity: 'low',
        outcome: 'success',
      })
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }

  /**
   * Handle service errors consistently
   */
  protected handleError(error: any, operation: string, context?: Record<string, any>): never {
    console.error(`Service error in ${operation}:`, error, context)
    
    // Log error for monitoring
    this.logActivity(`error_${operation}`, 'service', undefined, {
      error: error.message,
      context,
    }).catch(() => {}) // Silent fail for logging

    // Throw user-friendly error
    if (error.code === 'PGRST116') {
      throw new Error('Resource not found')
    } else if (error.code === '23505') {
      throw new Error('Duplicate entry')
    } else if (error.code === '23503') {
      throw new Error('Referenced resource not found')
    } else if (error.message?.includes('permission')) {
      throw new Error('Permission denied')
    } else {
      throw new Error(`Operation failed: ${operation}`)
    }
  }

  /**
   * Validate input data
   */
  protected validateInput<T>(data: T, schema: any): T {
    try {
      return schema.parse(data)
    } catch (error) {
      throw new Error(`Invalid input: ${error}`)
    }
  }

  /**
   * Execute operation with retry logic
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        if (attempt === maxAttempts) break
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
      }
    }
    
    throw lastError
  }

  /**
   * Execute multiple operations in parallel with error handling
   */
  protected async parallel<T>(operations: (() => Promise<T>)[]): Promise<T[]> {
    const results = await Promise.allSettled(operations.map(op => op()))
    
    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason)
    
    if (errors.length > 0) {
      throw new Error(`Parallel operations failed: ${errors.map(e => e.message).join(', ')}`)
    }
    
    return results
      .filter((result): result is PromiseFulfilledResult<T> => result.status === 'fulfilled')
      .map(result => result.value)
  }

  /**
   * Create pagination metadata
   */
  protected createPaginationMeta(
    total: number,
    page: number = 1,
    limit: number = 20
  ) {
    const totalPages = Math.ceil(total / limit)
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  }
}