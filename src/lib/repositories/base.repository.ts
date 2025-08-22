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

export abstract class BaseRepository {
  protected supabase: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  /**
   * Execute a database transaction
   * Note: Supabase doesn't have native transactions, but we can implement
   * compensating actions and better error handling
   */
  protected async transaction<T>(
    callback: (client: SupabaseClient<Database>) => Promise<T>
  ): Promise<Result<T>> {
    return wrapAsync(async () => {
      return await callback(this.supabase)
    })
  }

  /**
   * Create a Result from a Supabase response
   */
  protected createResult<T>(
    data: T | null,
    error: any,
    operation: string,
    metadata?: Record<string, any>
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
  protected validateRequired(data: Record<string, any>, fields: string[]): Result<void> {
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
}