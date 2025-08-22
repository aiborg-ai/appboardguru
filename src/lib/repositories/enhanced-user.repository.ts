/**
 * Enhanced User Repository
 * Example implementation showcasing all advanced repository features:
 * - Type-safe query builder
 * - Intelligent caching
 * - Batch operations
 * - Optimistic locking
 * - Transaction management
 * - Performance monitoring
 */

import { EnhancedBaseRepository, BatchOperation } from './enhanced-base'
import { CachedRepository, CachePresets } from './cached-repository'
import { TypeSafeQueryBuilder, createQueryBuilder } from './query-builder'
import { SagaOrchestrator, SagaDefinition } from './transaction-manager'
import { PerformanceMonitor } from './performance/performance-monitor'
import { Result, success, failure, RepositoryError } from './result'
import type { Database } from '../../types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// Type definitions
type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

interface EnhancedUser extends User {
  organization_count?: number
  vault_count?: number
  last_activity?: string
  role_permissions?: string[]
}

interface UserSearchFilters {
  organizationId?: string
  status?: 'active' | 'inactive' | 'pending'
  role?: string
  lastActivitySince?: Date
  emailDomain?: string
}

interface UserBatchCreateRequest {
  users: UserInsert[]
  sendWelcomeEmail?: boolean
  assignToOrganization?: string
  defaultRole?: string
}

/**
 * Enhanced User Repository with all advanced features
 */
export class EnhancedUserRepository extends EnhancedBaseRepository {
  private performanceMonitor: PerformanceMonitor
  private sagaOrchestrator: SagaOrchestrator

  constructor(
    supabase: SupabaseClient<Database>,
    performanceMonitor?: PerformanceMonitor,
    sagaOrchestrator?: SagaOrchestrator
  ) {
    super(supabase)
    this.performanceMonitor = performanceMonitor || new PerformanceMonitor()
    this.sagaOrchestrator = sagaOrchestrator || new SagaOrchestrator(supabase)
    
    this.initializeHooks()
    this.registerSagas()
  }

  protected getEntityName(): string {
    return 'User'
  }

  protected getSearchFields(): string[] {
    return ['email', 'full_name', 'username']
  }

  protected getTableName(): string {
    return 'users'
  }

  /**
   * Find user by ID with caching and performance monitoring
   */
  async findById(id: string): Promise<Result<EnhancedUser | null>> {
    const startTime = Date.now()

    try {
      const result = await this.cachedFindById(
        id,
        async () => {
          const builder = createQueryBuilder('users')
            .selectAll()
            .whereEqual('id', id)
            .leftJoin('organization_members', 'id,organization_id,role')

          return await builder.executeSingle(this.supabase)
        },
        CachePresets.USER_DATA
      )

      const duration = Date.now() - startTime
      this.performanceMonitor.recordQuery(
        `findById:${id}`,
        'UserRepository',
        duration,
        result.success ? undefined : result.error as any,
        result.metadata?.cached || false
      )

      if (result.success && result.data) {
        return success(await this.enrichUser(result.data as User))
      }

      return result as Result<EnhancedUser | null>
    } catch (error) {
      const duration = Date.now() - startTime
      this.performanceMonitor.recordQuery(
        `findById:${id}`,
        'UserRepository',
        duration,
        error as Error
      )
      
      return failure(RepositoryError.internal('Failed to find user by ID', error))
    }
  }

  /**
   * Search users with advanced filtering and type-safe query building
   */
  async searchUsers(
    filters: UserSearchFilters,
    options: {
      page?: number
      limit?: number
      sortBy?: keyof User
      sortOrder?: 'asc' | 'desc'
      includeInactive?: boolean
    } = {}
  ): Promise<Result<{
    users: EnhancedUser[]
    total: number
    page: number
    totalPages: number
  }>> {
    const startTime = Date.now()
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = options

    try {
      const cacheKey = `search:${JSON.stringify({ filters, options })}`
      
      const result = await this.cachedSearch(
        { filters, options },
        async () => {
          const builder = createQueryBuilder('users')
            .selectAll()
            .leftJoin('organization_members', 'organization_id,role,status')
            .page(page, limit)
            .orderBy(sortBy, sortOrder === 'asc')

          // Apply filters
          if (filters.organizationId) {
            builder.whereEqual('organization_members.organization_id' as any, filters.organizationId)
          }

          if (filters.status) {
            builder.whereEqual('status' as any, filters.status)
          }

          if (filters.emailDomain) {
            builder.whereLike('email', `%@${filters.emailDomain}`)
          }

          if (filters.lastActivitySince) {
            builder.where('last_sign_in_at' as any, 'gte', filters.lastActivitySince.toISOString())
          }

          if (!options.includeInactive) {
            builder.whereEqual('is_active' as any, true)
          }

          return await builder.executePaginated(this.supabase)
        },
        CachePresets.USER_DATA
      )

      const duration = Date.now() - startTime
      this.performanceMonitor.recordQuery(
        'searchUsers',
        'UserRepository',
        duration,
        result.success ? undefined : result.error as any,
        result.metadata?.cached || false
      )

      if (result.success) {
        const enrichedUsers = await Promise.all(
          result.data.data.map(user => this.enrichUser(user as User))
        )

        return success({
          users: enrichedUsers,
          total: result.data.count,
          page: result.data.page,
          totalPages: result.data.totalPages
        })
      }

      return failure(result.error)
    } catch (error) {
      const duration = Date.now() - startTime
      this.performanceMonitor.recordQuery(
        'searchUsers',
        'UserRepository',
        duration,
        error as Error
      )
      
      return failure(RepositoryError.internal('User search failed', error))
    }
  }

  /**
   * Create user with hooks, caching, and performance monitoring
   */
  async create(userData: UserInsert): Promise<Result<EnhancedUser>> {
    const startTime = Date.now()

    try {
      const result = await this.cachedCreate(
        async () => {
          // Validate required fields
          const validation = this.validateRequired(userData as any, [
            'email', 'full_name'
          ])
          if (!validation.success) {
            return failure(validation.error)
          }

          // Check for duplicate email
          const existing = await this.findByEmail(userData.email!)
          if (existing.success && existing.data) {
            return failure(RepositoryError.conflict(
              'User',
              'Email already exists',
              { email: userData.email }
            ))
          }

          const { data, error } = await this.supabase
            .from('users')
            .insert({
              ...userData,
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (error) {
            return failure(RepositoryError.fromSupabaseError(error, 'create user'))
          }

          return success(data as User)
        },
        [`users:*`, `users:email:${userData.email}`]
      )

      const duration = Date.now() - startTime
      this.performanceMonitor.recordQuery(
        'createUser',
        'UserRepository',
        duration,
        result.success ? undefined : result.error as any
      )

      if (result.success) {
        const enhancedUser = await this.enrichUser(result.data)
        
        // Emit creation event
        this.emitEvent({
          type: 'user:created',
          entity: 'User',
          entityId: result.data.id,
          operation: 'create',
          data: enhancedUser,
          timestamp: new Date()
        })

        return success(enhancedUser)
      }

      return failure(result.error)
    } catch (error) {
      const duration = Date.now() - startTime
      this.performanceMonitor.recordQuery(
        'createUser',
        'UserRepository',
        duration,
        error as Error
      )
      
      return failure(RepositoryError.internal('User creation failed', error))
    }
  }

  /**
   * Batch create users with transaction support
   */
  async createBatch(request: UserBatchCreateRequest): Promise<Result<{
    successful: EnhancedUser[]
    failed: Array<{ user: UserInsert; error: string }>
    total: number
  }>> {
    const startTime = Date.now()

    try {
      // Use saga for complex batch operation
      const sagaResult = await this.sagaOrchestrator.startSaga(
        'user_batch_create',
        request
      )

      if (!sagaResult.success) {
        return failure(sagaResult.error)
      }

      // Wait for saga completion
      const saga = sagaResult.data
      const result = await saga.execute()

      const duration = Date.now() - startTime
      this.performanceMonitor.recordQuery(
        `createBatch:${request.users.length}`,
        'UserRepository',
        duration,
        result.success ? undefined : result.error as any
      )

      return result
    } catch (error) {
      return failure(RepositoryError.internal('Batch user creation failed', error))
    }
  }

  /**
   * Update user with optimistic locking
   */
  async updateWithLock(
    id: string,
    updates: Partial<UserUpdate>,
    expectedVersion: number
  ): Promise<Result<EnhancedUser>> {
    const startTime = Date.now()

    try {
      const result = await this.updateWithOptimisticLock({
        id,
        expectedVersion,
        data: {
          ...updates,
          updated_at: new Date().toISOString()
        }
      })

      const duration = Date.now() - startTime
      this.performanceMonitor.recordQuery(
        `updateWithLock:${id}`,
        'UserRepository',
        duration,
        result.success ? undefined : result.error as any
      )

      if (result.success) {
        const enhancedUser = await this.enrichUser(result.data as User)
        return success(enhancedUser)
      }

      return failure(result.error)
    } catch (error) {
      const duration = Date.now() - startTime
      this.performanceMonitor.recordQuery(
        `updateWithLock:${id}`,
        'UserRepository',
        duration,
        error as Error
      )
      
      return failure(RepositoryError.internal('Optimistic update failed', error))
    }
  }

  /**
   * Find user by email with caching
   */
  async findByEmail(email: string): Promise<Result<EnhancedUser | null>> {
    const startTime = Date.now()

    try {
      const result = await this.executeWithCache(
        async () => {
          const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

          if (error && error.code !== 'PGRST116') {
            return failure(RepositoryError.fromSupabaseError(error, 'find by email'))
          }

          return success(data as User | null)
        },
        'findByEmail',
        { email },
        CachePresets.USER_DATA
      )

      const duration = Date.now() - startTime
      this.performanceMonitor.recordQuery(
        `findByEmail:${email}`,
        'UserRepository',
        duration,
        result.success ? undefined : result.error as any,
        result.metadata?.cached || false
      )

      if (result.success && result.data) {
        const enhancedUser = await this.enrichUser(result.data)
        return success(enhancedUser)
      }

      return result as Result<EnhancedUser | null>
    } catch (error) {
      const duration = Date.now() - startTime
      this.performanceMonitor.recordQuery(
        `findByEmail:${email}`,
        'UserRepository',
        duration,
        error as Error
      )
      
      return failure(RepositoryError.internal('Find by email failed', error))
    }
  }

  /**
   * Execute single batch operation (required by EnhancedBaseRepository)
   */
  protected async executeSingleOperation<T>(
    operation: BatchOperation<T>
  ): Promise<Result<T>> {
    switch (operation.type) {
      case 'create':
        const createResult = await this.create(operation.data as UserInsert)
        return createResult as Result<T>

      case 'update':
        if (!operation.id) {
          return failure(RepositoryError.validation('Update operation requires ID'))
        }
        // Implementation would go here
        return failure(RepositoryError.internal('Update operation not implemented'))

      case 'delete':
        if (!operation.id) {
          return failure(RepositoryError.validation('Delete operation requires ID'))
        }
        const deleteResult = await this.softDelete(operation.id)
        return deleteResult as Result<T>

      default:
        return failure(RepositoryError.validation(`Unknown operation type: ${operation.type}`))
    }
  }

  /**
   * Initialize repository hooks
   */
  private initializeHooks(): void {
    // Add audit logging hook
    this.addHook('afterCreate', async (context) => {
      await this.logActivity({
        user_id: context.userId || 'system',
        organization_id: context.data?.organization_id,
        event_type: 'user_created',
        event_category: 'user_management',
        action: 'create',
        resource_type: 'user',
        resource_id: context.data?.id || '',
        event_description: `User created: ${context.data?.email}`,
        outcome: 'success',
        severity: 'low',
        details: { userEmail: context.data?.email }
      })
    })

    // Add cache invalidation hook
    this.addHook('afterUpdate', async (context) => {
      const patterns = [
        `users:findById:${context.data?.id}`,
        `users:findByEmail:${context.data?.email}`,
        'users:search:*'
      ]
      
      // Would integrate with cache manager
      console.log('Invalidating cache patterns:', patterns)
    })

    // Add validation hook
    this.addHook('beforeCreate', async (context) => {
      if (!context.data?.email || !context.data?.full_name) {
        return failure(RepositoryError.validation(
          'Email and full name are required',
          { providedFields: Object.keys(context.data || {}) }
        ))
      }
    })
  }

  /**
   * Register sagas for complex operations
   */
  private registerSagas(): void {
    const batchCreateSaga: SagaDefinition = {
      id: 'user_batch_create',
      name: 'Batch User Creation',
      description: 'Create multiple users with rollback support',
      steps: [
        {
          id: 'validate_users',
          name: 'Validate User Data',
          action: async (input: UserBatchCreateRequest) => {
            // Validate all users
            for (const user of input.users) {
              if (!user.email || !user.full_name) {
                return failure(RepositoryError.validation(
                  'All users must have email and full name'
                ))
              }
            }
            return success(input)
          },
          compensation: async () => success(undefined)
        },
        {
          id: 'create_users',
          name: 'Create Users in Database',
          action: async (input: UserBatchCreateRequest) => {
            const operations: BatchOperation<UserInsert>[] = input.users.map(user => ({
              type: 'create',
              data: user
            }))

            const result = await this.executeBatch(operations, { continueOnError: true })
            return result as Result<any>
          },
          compensation: async (output: any) => {
            // Rollback created users
            if (output.successful) {
              const deleteOperations = output.successful.map((item: any) => ({
                type: 'delete',
                id: item.result.id,
                data: undefined
              }))
              await this.executeBatch(deleteOperations, { continueOnError: true })
            }
            return success(undefined)
          },
          dependencies: ['validate_users']
        },
        {
          id: 'send_welcome_emails',
          name: 'Send Welcome Emails',
          action: async (input: UserBatchCreateRequest, context) => {
            if (!input.sendWelcomeEmail) {
              return success({ skipped: true })
            }

            // Mock email sending
            const createdUsers = context.stepResults.get('create_users')?.successful || []
            console.log(`Sending welcome emails to ${createdUsers.length} users`)
            
            return success({ emailsSent: createdUsers.length })
          },
          compensation: async () => {
            // Can't really undo sent emails, but could send apology emails
            console.log('Would send apology emails for cancelled user creation')
            return success(undefined)
          },
          dependencies: ['create_users']
        }
      ]
    }

    this.sagaOrchestrator.registerSaga(batchCreateSaga)
  }

  /**
   * Enrich user with additional data
   */
  private async enrichUser(user: User): Promise<EnhancedUser> {
    try {
      // Get organization count
      const { count: orgCount } = await this.supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active')

      // Get vault count (if user has access)
      const { count: vaultCount } = await this.supabase
        .from('board_pack_permissions')
        .select('*', { count: 'exact', head: true })
        .eq('granted_to_user_id', user.id)

      return {
        ...user,
        organization_count: orgCount || 0,
        vault_count: vaultCount || 0,
        last_activity: user.last_sign_in_at,
        role_permissions: [] // Would be populated from roles
      }
    } catch (error) {
      console.warn('Failed to enrich user data:', error)
      return user as EnhancedUser
    }
  }
}