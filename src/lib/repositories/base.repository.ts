import { SupabaseClient, PostgrestFilterBuilder } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { Result, success, failure, RepositoryError, wrapAsync } from './result'
import { 
  QueryOptions, 
  PaginatedResult, 
  FilterCriteria, 
  QueryBuilder,
  AuditLogEntry,
  UserId,
  OrganizationId,
  createUserId
} from './types'
import { 
  TransactionCoordinator, 
  TransactionOptions, 
  TransactionUtils,
  OptimisticLock 
} from './transaction-coordinator'
import { getDemoData, isDemoMode } from '../demo/demo-data-provider'

export abstract class BaseRepository {
  protected supabase: SupabaseClient<Database>
  protected transactionCoordinator?: TransactionCoordinator
  protected demoMode: boolean = false

  constructor(
    supabase: SupabaseClient<Database>,
    transactionCoordinator?: TransactionCoordinator
  ) {
    this.supabase = supabase
    this.transactionCoordinator = transactionCoordinator
    this.demoMode = isDemoMode()
  }

  /**
   * Check if repository is in demo mode
   */
  protected isDemoMode(): boolean {
    return this.demoMode || isDemoMode()
  }

  /**
   * Get demo data for a specific entity type
   */
  protected async getDemoData<T>(entityType: string, id?: string): Promise<Result<T>> {
    return getDemoData<T>(entityType, id)
  }

  /**
   * Execute a simple database transaction
   * Legacy method - prefer withTransaction for new code
   */
  protected async transaction<T>(
    callback: (client: SupabaseClient<Database>) => Promise<T>
  ): Promise<Result<T>> {
    return wrapAsync(async () => {
      return await callback(this.supabase)
    })
  }

  /**
   * Execute operations within a managed transaction with ACID support
   */
  protected async withTransaction<T>(
    operations: Array<() => Promise<Result<T>>>,
    options: Partial<TransactionOptions> = {}
  ): Promise<Result<T[]>> {
    if (!this.transactionCoordinator) {
      // Fallback to legacy transaction behavior
      const results: T[] = []
      for (const operation of operations) {
        const result = await operation()
        if (!result.success) {
          return failure(result.error)
        }
        results.push(result.data)
      }
      return success(results)
    }

    return TransactionUtils.withTransaction(
      this.transactionCoordinator,
      operations,
      options
    )
  }

  /**
   * Execute a saga-based distributed transaction
   */
  protected async withSaga<T>(
    steps: Array<{
      execute: () => Promise<Result<T>>
      compensate: () => Promise<Result<void>>
      description: string
    }>
  ): Promise<Result<T[]>> {
    if (!this.transactionCoordinator) {
      return failure(RepositoryError.internal(
        'Transaction coordinator required for saga operations'
      ))
    }

    return TransactionUtils.withSaga(this.transactionCoordinator, steps)
  }

  /**
   * Create optimistic lock for entity updates
   */
  protected async withOptimisticLock<T extends { id: string; version: number }>(
    entity: T,
    updateOperation: (locked: OptimisticLock) => Promise<Result<T>>
  ): Promise<Result<T>> {
    if (!this.transactionCoordinator) {
      // Fallback to direct update without locking
      return failure(RepositoryError.internal(
        'Transaction coordinator required for optimistic locking'
      ))
    }

    const beginResult = await this.transactionCoordinator.begin({
      mode: 'SINGLE_DOMAIN',
      enableOptimisticLocking: true,
      timeout: 10000
    })

    if (!beginResult.success) {
      return failure(beginResult.error)
    }

    const transactionId = beginResult.data.id

    try {
      // Acquire optimistic lock
      const lockResult = await this.transactionCoordinator.acquireOptimisticLock(
        transactionId,
        this.getTableName(),
        entity.id,
        entity.version
      )

      if (!lockResult.success) {
        await this.transactionCoordinator.rollback(transactionId, 'Lock acquisition failed')
        return failure(lockResult.error)
      }

      // Execute update operation
      const updateResult = await updateOperation(lockResult.data)

      if (updateResult.success) {
        const commitResult = await this.transactionCoordinator.commit(transactionId)
        if (commitResult.success) {
          return updateResult
        } else {
          await this.transactionCoordinator.rollback(transactionId, 'Commit failed')
          return failure(commitResult.error)
        }
      } else {
        await this.transactionCoordinator.rollback(transactionId, 'Update operation failed')
        return failure(updateResult.error)
      }
    } catch (error) {
      await this.transactionCoordinator.rollback(transactionId, 'Exception occurred')
      return failure(RepositoryError.internal('Optimistic lock operation failed', error))
    }
  }

  /**
   * Execute batch operations within a transaction
   */
  protected async batchWithTransaction<T>(
    operations: Array<{
      operation: () => Promise<Result<T>>
      compensate?: () => Promise<Result<void>>
      description?: string
    }>,
    options: {
      continueOnError?: boolean
      mode?: TransactionOptions['mode']
    } = {}
  ): Promise<Result<T[]>> {
    const txOptions: Partial<TransactionOptions> = {
      mode: options.mode || 'SINGLE_DOMAIN',
      enableMetrics: true
    }

    if (options.continueOnError) {
      // Use saga pattern for fault tolerance
      return this.withSaga(
        operations.map(op => ({
          execute: op.operation,
          compensate: op.compensate || (async () => success(undefined)),
          description: op.description || 'Batch operation'
        }))
      )
    } else {
      // Use simple transaction - fail fast
      return this.withTransaction(
        operations.map(op => op.operation),
        txOptions
      )
    }
  }

  /**
   * Create a Result from a Supabase response
   */
  protected createResult<T>(
    data: T | null,
    error: any,
    operation: string,
    metadata?: Record<string, unknown>
  ): Result<T> {
    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, operation), metadata)
    }
    
    if (data === null && operation.includes('find')) {
      return failure(RepositoryError.notFound(this.getEntityName()), metadata)
    }
    
    if (data === null) {
      return failure(RepositoryError.internal(`No data returned from ${operation}`), metadata)
    }
    
    return success(data, metadata)
  }

  /**
   * Create a paginated result
   */
  protected createPaginatedResult<T>(
    data: T[],
    count: number | null,
    options: QueryOptions,
    error?: any
  ): Result<PaginatedResult<T>> {
    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'paginated query'))
    }

    const limit = options.limit || 50
    const offset = options.offset || 0
    const page = options.page || Math.floor(offset / limit) + 1
    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return success({
      data,
      total,
      limit,
      offset,
      page,
      totalPages
    })
  }

  /**
   * Get current user ID from auth context
   */
  protected async getCurrentUserId(): Promise<Result<UserId>> {
    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error || !user) {
      return failure(RepositoryError.unauthorized('Authentication required'))
    }
    return success(createUserId(user.id))
  }

  /**
   * Apply common query filters and sorting
   */
  protected applyQueryOptions<T>(
    query: PostgrestFilterBuilder<Database['public'], T, any>,
    options: QueryOptions
  ): PostgrestFilterBuilder<Database['public'], T, any> {
    let modifiedQuery = query

    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            modifiedQuery = modifiedQuery.in(key, value)
          } else {
            modifiedQuery = modifiedQuery.eq(key, value)
          }
        }
      })
    }

    // Apply search if specified
    if (options.search && this.getSearchFields().length > 0) {
      const searchFields = this.getSearchFields()
      const searchTerms = searchFields.map(field => `${field}.ilike.%${options.search}%`)
      modifiedQuery = modifiedQuery.or(searchTerms.join(','))
    }

    // Apply sorting
    if (options.sortBy) {
      const ascending = options.sortOrder === 'asc'
      modifiedQuery = modifiedQuery.order(options.sortBy, { ascending })
    }

    // Apply pagination
    if (options.limit || options.offset) {
      const limit = options.limit || 50
      const offset = options.offset || 0
      modifiedQuery = modifiedQuery.range(offset, offset + limit - 1)
    }

    return modifiedQuery
  }

  /**
   * Log audit activity
   */
  protected async logActivity(entry: AuditLogEntry): Promise<void> {
    try {
      await this.supabase
        .from('audit_logs')
        .insert({
          user_id: entry.user_id,
          organization_id: entry.organization_id,
          event_type: entry.event_type,
          event_category: entry.event_category,
          action: entry.action,
          resource_type: entry.resource_type,
          resource_id: entry.resource_id,
          event_description: entry.event_description,
          outcome: entry.outcome,
          severity: entry.severity,
          details: entry.details,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      // Log audit failures but don't fail the main operation
      console.warn('Failed to log audit activity:', error)
    }
  }

  /**
   * Validate required fields
   */
  protected validateRequired(data: Record<string, unknown>, fields: string[]): Result<void> {
    const missing = fields.filter(field => !data[field] || data[field] === '')
    if (missing.length > 0) {
      return failure(
        RepositoryError.validation(`Missing required fields: ${missing.join(', ')}`, {
          missingFields: missing
        })
      )
    }
    return success(undefined)
  }

  /**
   * Check if user has permission for organization
   */
  protected async checkOrganizationPermission(
    userId: UserId,
    organizationId: OrganizationId,
    requiredRole: string[] = ['member', 'admin', 'owner']
  ): Promise<Result<boolean>> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('role, status')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      return failure(RepositoryError.forbidden('Organization access denied'))
    }

    if (!requiredRole.includes(data.role)) {
      return failure(RepositoryError.forbidden(`Insufficient role. Required: ${requiredRole.join(', ')}`))
    }

    return success(true)
  }

  /**
   * Build complex queries with advanced filtering
   */
  protected buildQuery(builder: QueryBuilder): string {
    const conditions: string[] = []

    // Add filters
    builder.filters.forEach(filter => {
      switch (filter.operator) {
        case 'eq':
          conditions.push(`${filter.field}.eq.${filter.value}`)
          break
        case 'neq':
          conditions.push(`${filter.field}.neq.${filter.value}`)
          break
        case 'gt':
          conditions.push(`${filter.field}.gt.${filter.value}`)
          break
        case 'gte':
          conditions.push(`${filter.field}.gte.${filter.value}`)
          break
        case 'lt':
          conditions.push(`${filter.field}.lt.${filter.value}`)
          break
        case 'lte':
          conditions.push(`${filter.field}.lte.${filter.value}`)
          break
        case 'in':
          conditions.push(`${filter.field}.in.(${filter.value.join(',')})`)
          break
        case 'not_in':
          conditions.push(`${filter.field}.not.in.(${filter.value.join(',')})`)
          break
        case 'like':
          conditions.push(`${filter.field}.like.${filter.value}`)
          break
        case 'ilike':
          conditions.push(`${filter.field}.ilike.${filter.value}`)
          break
        case 'is':
          conditions.push(`${filter.field}.is.${filter.value}`)
          break
        case 'not_is':
          conditions.push(`${filter.field}.not.is.${filter.value}`)
          break
      }
    })

    return conditions.length > 0 ? conditions.join(',') : ''
  }

  // Abstract methods that subclasses should implement
  protected abstract getEntityName(): string
  protected abstract getSearchFields(): string[]
  protected abstract getTableName(): string
}