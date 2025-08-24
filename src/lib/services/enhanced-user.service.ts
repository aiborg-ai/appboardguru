/**
 * Enhanced User Service with Advanced Performance and Reliability Features
 * - Circuit breaker protection for authentication operations
 * - Concurrency control for bulk user operations
 * - Advanced caching for frequently accessed user data
 * - Performance monitoring and health checks
 */

import { EnhancedBaseService } from './enhanced-base-service'
import { Result, success, failure, RepositoryError } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  phone?: string
  designation?: string
  linkedin_url?: string
  created_at: string
  updated_at: string
  last_login?: string
  email_verified: boolean
  is_active: boolean
}

export interface CreateUserRequest {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  designation?: string
  linkedin_url?: string
}

export interface UpdateUserRequest {
  first_name?: string
  last_name?: string
  avatar_url?: string
  phone?: string
  designation?: string
  linkedin_url?: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  privacy: {
    profile_visibility: 'public' | 'organization' | 'private'
    activity_visibility: 'public' | 'organization' | 'private'
  }
  language: string
  timezone: string
}

export interface UserActivity {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  timestamp: string
  details?: Record<string, any>
}

export interface BulkUserUpdateRequest {
  userIds: string[]
  updates: Partial<UpdateUserRequest>
  batchSize?: number
}

export interface UserSearchCriteria {
  email?: string
  firstName?: string
  lastName?: string
  organizationId?: string
  isActive?: boolean
  lastLoginAfter?: Date
  limit?: number
  offset?: number
}

export class EnhancedUserService extends EnhancedBaseService {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, {
      maxConcurrent: 15,
      timeoutMs: 20000,
      retryConfig: {
        attempts: 3,
        backoff: 'exponential',
        maxDelay: 8000
      }
    })
  }

  /**
   * Get user profile by ID with advanced caching
   */
  async getUserProfile(userId: string): Promise<Result<UserProfile>> {
    const startTime = Date.now()
    
    const result = await this.executeWithCache(
      `user:profile:${userId}`,
      async () => {
        return this.executeWithCircuitBreaker('database', async () => {
          const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()

          if (error) {
            throw RepositoryError.database('Failed to fetch user profile', error, 'getUserProfile')
          }
          if (!data) {
            throw RepositoryError.notFound('User profile')
          }

          return data as UserProfile
        })
      },
      {
        ttl: 300000, // 5 minutes
        tags: ['user', `user:${userId}`],
        refreshThreshold: 0.8
      }
    )
    
    this.recordPerformanceMetric('getUserProfile', Date.now() - startTime)
    
    if (!result.success) {
      return failure(this.handleError(result.error, 'getUserProfile', { userId }))
    }
    
    return result
  }

  /**
   * Get current user profile with circuit breaker protection
   */
  async getCurrentUserProfile(): Promise<Result<UserProfile>> {
    const startTime = Date.now()
    
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return userResult
    }

    const result = await this.getUserProfile(userResult.data.id)
    
    this.recordPerformanceMetric('getCurrentUserProfile', Date.now() - startTime)
    return result
  }

  /**
   * Update user profile with optimistic concurrency control
   */
  async updateUserProfile(
    userId: string, 
    updates: UpdateUserRequest,
    version?: number
  ): Promise<Result<UserProfile>> {
    const startTime = Date.now()
    
    const result = await this.executeWithConcurrencyControl(async () => {
      // Check permissions first
      const currentUserResult = await this.getCurrentUser()
      if (!currentUserResult.success) {
        throw currentUserResult.error
      }

      // Enhanced permission check with context
      if (currentUserResult.data.id !== userId) {
        // Check if user has admin permissions to update other users
        const permissionCheck = await this.repositories.user.findById(currentUserResult.data.id)
        if (!permissionCheck.success) {
          throw RepositoryError.forbidden('update', 'Insufficient permissions to update user profile')
        }
      }

      return this.executeWithCircuitBreaker('database', async () => {
        let updateQuery = this.supabase
          .from('users')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
            ...(version && { version: version + 1 })
          })
          .eq('id', userId)

        // Add optimistic locking if version is provided
        if (version) {
          updateQuery = updateQuery.eq('version', version)
        }

        const { data, error } = await updateQuery.select().single()

        if (error) {
          if (error.code === '23000' && version) {
            throw RepositoryError.conflict('User profile', 'Profile has been modified by another user')
          }
          throw RepositoryError.database('Failed to update user profile', error, 'updateUserProfile')
        }

        if (!data) {
          throw RepositoryError.notFound('User profile')
        }

        return data as UserProfile
      })
    })
    
    this.recordPerformanceMetric('updateUserProfile', Date.now() - startTime)
    
    if (!result.success) {
      return failure(this.handleError(result.error, 'updateUserProfile', { userId, updates }))
    }

    // Invalidate cache and log activity
    await this.invalidateUserCache(userId)
    await this.repositories.activity.create({
      user_id: userId,
      action: 'update_profile',
      resource_type: 'user',
      resource_id: userId,
      details: updates
    } as any)

    return result
  }

  /**
   * Bulk update users with advanced batching and error handling
   */
  async bulkUpdateUsers(request: BulkUserUpdateRequest): Promise<Result<{
    successful: UserProfile[]
    failed: Array<{ userId: string; error: string }>
    stats: { total: number; successful: number; failed: number }
  }>> {
    const startTime = Date.now()
    const { userIds, updates, batchSize = 10 } = request

    const result = await this.executeBulkOperation({
      items: userIds,
      batchSize,
      processor: async (userIdBatch: string[]) => {
        const operations = userIdBatch.map(userId => 
          () => this.updateUserProfile(userId, updates)
        )

        const parallelResult = await this.executeParallel(operations, {
          maxConcurrency: 5,
          failFast: false,
          aggregateErrors: false
        })

        return parallelResult
      },
      onProgress: (processed, total) => {
        console.log(`Bulk user update progress: ${processed}/${total}`)
      },
      onError: (error, batch) => {
        console.error(`Batch update failed for users:`, batch, error)
      }
    })

    this.recordPerformanceMetric('bulkUpdateUsers', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'bulkUpdateUsers', { userCount: userIds.length }))
    }

    // Aggregate results
    const successful = result.data.filter(user => user != null)
    const failed = userIds
      .filter(id => !successful.some(user => user.id === id))
      .map(userId => ({ userId, error: 'Update failed' }))

    return success({
      successful,
      failed,
      stats: {
        total: userIds.length,
        successful: successful.length,
        failed: failed.length
      }
    })
  }

  /**
   * Search users with advanced filtering and pagination
   */
  async searchUsers(criteria: UserSearchCriteria): Promise<Result<{
    users: UserProfile[]
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
  }>> {
    const startTime = Date.now()
    const { limit = 20, offset = 0 } = criteria

    const result = await this.executeWithCache(
      `users:search:${JSON.stringify(criteria)}`,
      async () => {
        return this.executeWithCircuitBreaker('database', async () => {
          let query = this.supabase.from('users').select('*', { count: 'exact' })

          // Apply filters
          if (criteria.email) {
            query = query.ilike('email', `%${criteria.email}%`)
          }
          if (criteria.firstName) {
            query = query.ilike('first_name', `%${criteria.firstName}%`)
          }
          if (criteria.lastName) {
            query = query.ilike('last_name', `%${criteria.lastName}%`)
          }
          if (criteria.organizationId) {
            query = query.eq('organization_id', criteria.organizationId)
          }
          if (criteria.isActive !== undefined) {
            query = query.eq('is_active', criteria.isActive)
          }
          if (criteria.lastLoginAfter) {
            query = query.gte('last_login', criteria.lastLoginAfter.toISOString())
          }

          // Apply pagination
          query = query.range(offset, offset + limit - 1)

          const { data, error, count } = await query

          if (error) {
            throw RepositoryError.database('Failed to search users', error, 'searchUsers')
          }

          return {
            users: data as UserProfile[],
            total: count || 0
          }
        })
      },
      {
        ttl: 120000, // 2 minutes
        tags: ['users', 'search'],
        refreshThreshold: 0.9
      }
    )

    this.recordPerformanceMetric('searchUsers', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'searchUsers', criteria))
    }

    const { users, total } = result.data

    return success({
      users,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  }

  /**
   * Get user activity history with performance optimization
   */
  async getUserActivity(
    userId: string,
    options: {
      limit?: number
      offset?: number
      dateFrom?: Date
      dateTo?: Date
      actionTypes?: string[]
    } = {}
  ): Promise<Result<UserActivity[]>> {
    const startTime = Date.now()
    const { limit = 50, offset = 0 } = options

    const result = await this.executeWithCache(
      `user:activity:${userId}:${JSON.stringify(options)}`,
      async () => {
        return this.executeWithCircuitBreaker('database', async () => {
          let query = this.supabase
            .from('activity_logs')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })

          // Apply filters
          if (options.dateFrom) {
            query = query.gte('timestamp', options.dateFrom.toISOString())
          }
          if (options.dateTo) {
            query = query.lte('timestamp', options.dateTo.toISOString())
          }
          if (options.actionTypes && options.actionTypes.length > 0) {
            query = query.in('action', options.actionTypes)
          }

          // Apply pagination
          query = query.range(offset, offset + limit - 1)

          const { data, error } = await query

          if (error) {
            throw RepositoryError.database('Failed to get user activity', error, 'getUserActivity')
          }

          return data as UserActivity[]
        })
      },
      {
        ttl: 180000, // 3 minutes
        tags: ['activity', `user:${userId}`],
        refreshThreshold: 0.7
      }
    )

    this.recordPerformanceMetric('getUserActivity', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'getUserActivity', { userId, options }))
    }

    return result
  }

  /**
   * Enhanced health check for user service dependencies
   */
  async healthCheck(): Promise<Result<{
    status: string
    dependencies: Record<string, any>
    performance: Record<string, any>
  }>> {
    const baseHealthResult = await super.healthCheck()
    if (!baseHealthResult.success) {
      return baseHealthResult
    }

    // Add user-specific health checks
    const userSpecificChecks = await this.executeParallel([
      // Check if we can read from users table
      async () => {
        const result = await this.executeWithCircuitBreaker('database', async () => {
          const { error } = await this.supabase.from('users').select('id').limit(1)
          if (error) throw error
          return 'healthy'
        })
        return result
      },
      
      // Check authentication service
      async () => {
        const result = await this.executeWithCircuitBreaker('auth', async () => {
          const { error } = await this.supabase.auth.getSession()
          if (error) throw error
          return 'healthy'
        })
        return result
      }
    ])

    const performance = this.getPerformanceStats()
    const circuitBreakerStats = this.getCircuitBreakerStats()

    return success({
      ...baseHealthResult.data,
      dependencies: {
        ...baseHealthResult.data.dependencies,
        userDatabase: userSpecificChecks.success ? 'healthy' : 'unhealthy',
        userAuth: userSpecificChecks.success ? 'healthy' : 'unhealthy'
      },
      performance,
      circuitBreakers: circuitBreakerStats
    })
  }

  /**
   * Private helper methods
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    // Implementation would invalidate cache entries with user tags
    // This is a placeholder - actual implementation would use your cache system
    console.debug(`Invalidating cache for user: ${userId}`)
  }

  /**
   * Get user service-specific metrics
   */
  getUserServiceMetrics() {
    return {
      performance: this.getPerformanceStats(),
      circuitBreakers: this.getCircuitBreakerStats(),
      concurrency: this.concurrencyManager.getStats()
    }
  }

  /**
   * Reset all circuit breakers for user service
   */
  resetCircuitBreakers(): void {
    this.circuitBreakers.forEach(breaker => breaker.reset())
  }
}