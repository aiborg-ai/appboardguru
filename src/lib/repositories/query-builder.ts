/**
 * Type-Safe Query Builder for Repository Layer
 * Provides fluent API with type-safe field selection, complex query composition,
 * and comprehensive filtering capabilities
 */

import { PostgrestFilterBuilder, PostgrestQueryBuilder, PostgrestBuilder } from '@supabase/postgrest-js'
import type { Database } from '../../types/database'
import { Result, success, failure, RepositoryError } from './result'

// Type utilities for extracting table types
type DatabaseTables = Database['public']['Tables']
type TableName = keyof DatabaseTables
type TableRow<T extends TableName> = DatabaseTables[T]['Row']
type TableInsert<T extends TableName> = DatabaseTables[T]['Insert']
type TableUpdate<T extends TableName> = DatabaseTables[T]['Update']

// Utility types for field selection
type FieldKeys<T> = {
  [K in keyof T]: T[K] extends object ? 
    K | `${K & string}.${FieldKeys<T[K]> & string}` : K
}[keyof T]

type SelectableFields<T extends TableName> = FieldKeys<TableRow<T>>

// Query operators with proper typing
export type QueryOperator = 
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'in' | 'not_in' | 'is' | 'not_is'
  | 'fts' | 'plfts' | 'phfts' | 'wfts'

export interface FilterCondition<T = any> {
  field: string
  operator: QueryOperator
  value: T | T[]
  negate?: boolean
}

export interface SortCondition {
  field: string
  ascending?: boolean
  nullsFirst?: boolean
  referencedTable?: string
}

export interface PaginationOptions {
  limit?: number
  offset?: number
  page?: number
}

export interface JoinCondition {
  table: string
  fields?: string | string[]
  inner?: boolean
  condition?: FilterCondition[]
}

export interface AggregationOptions {
  count?: boolean | string
  sum?: string[]
  avg?: string[]
  min?: string[]
  max?: string[]
  groupBy?: string[]
  having?: FilterCondition[]
}

/**
 * Type-safe query builder with fluent API
 */
export class TypeSafeQueryBuilder<T extends TableName, TResult = TableRow<T>> {
  private tableName: T
  private selectedFields: string[] = []
  private filters: FilterCondition[] = []
  private sorts: SortCondition[] = []
  private joins: JoinCondition[] = []
  private pagination?: PaginationOptions
  private aggregation?: AggregationOptions
  private searchQuery?: string
  private searchFields: string[] = []
  
  constructor(tableName: T) {
    this.tableName = tableName
  }

  /**
   * Type-safe field selection with IntelliSense support
   */
  select<TFields extends SelectableFields<T>[]>(
    ...fields: TFields
  ): TypeSafeQueryBuilder<T, Pick<TableRow<T>, TFields[number]>> {
    this.selectedFields = fields as string[]
    return this as any
  }

  /**
   * Select all fields
   */
  selectAll(): TypeSafeQueryBuilder<T, TableRow<T>> {
    this.selectedFields = ['*']
    return this as any
  }

  /**
   * Add filter condition with type safety
   */
  where<TField extends keyof TableRow<T>>(
    field: TField,
    operator: QueryOperator,
    value: TableRow<T>[TField] | TableRow<T>[TField][]
  ): this {
    this.filters.push({
      field: field as string,
      operator,
      value
    })
    return this
  }

  /**
   * Add multiple filter conditions (AND)
   */
  whereAnd(conditions: FilterCondition[]): this {
    this.filters.push(...conditions)
    return this
  }

  /**
   * Add OR filter condition
   */
  whereOr(conditions: FilterCondition[]): this {
    // Group OR conditions together
    this.filters.push({
      field: '_or',
      operator: 'eq',
      value: conditions
    } as any)
    return this
  }

  /**
   * Add equality filter
   */
  whereEqual<TField extends keyof TableRow<T>>(
    field: TField,
    value: TableRow<T>[TField]
  ): this {
    return this.where(field, 'eq', value)
  }

  /**
   * Add IN filter
   */
  whereIn<TField extends keyof TableRow<T>>(
    field: TField,
    values: TableRow<T>[TField][]
  ): this {
    return this.where(field, 'in', values)
  }

  /**
   * Add text search filter
   */
  whereLike<TField extends keyof TableRow<T>>(
    field: TField,
    pattern: string,
    caseInsensitive = true
  ): this {
    return this.where(field, caseInsensitive ? 'ilike' : 'like', pattern)
  }

  /**
   * Add date range filter
   */
  whereDateRange<TField extends keyof TableRow<T>>(
    field: TField,
    start: string | Date,
    end: string | Date
  ): this {
    const startValue = start instanceof Date ? start.toISOString() : start
    const endValue = end instanceof Date ? end.toISOString() : end
    
    this.where(field, 'gte', startValue as any)
    this.where(field, 'lte', endValue as any)
    return this
  }

  /**
   * Add full-text search
   */
  search(query: string, fields?: (keyof TableRow<T>)[]): this {
    this.searchQuery = query
    if (fields) {
      this.searchFields = fields as string[]
    }
    return this
  }

  /**
   * Add sorting with type safety
   */
  orderBy<TField extends keyof TableRow<T>>(
    field: TField,
    ascending = true,
    nullsFirst = false
  ): this {
    this.sorts.push({
      field: field as string,
      ascending,
      nullsFirst
    })
    return this
  }

  /**
   * Add multiple sort conditions
   */
  orderByMultiple(sorts: SortCondition[]): this {
    this.sorts.push(...sorts)
    return this
  }

  /**
   * Add pagination
   */
  paginate(options: PaginationOptions): this {
    this.pagination = options
    return this
  }

  /**
   * Limit results
   */
  limit(count: number): this {
    this.pagination = { ...this.pagination, limit: count }
    return this
  }

  /**
   * Skip results
   */
  offset(count: number): this {
    this.pagination = { ...this.pagination, offset: count }
    return this
  }

  /**
   * Set page-based pagination
   */
  page(pageNumber: number, pageSize = 20): this {
    this.pagination = {
      page: pageNumber,
      limit: pageSize,
      offset: (pageNumber - 1) * pageSize
    }
    return this
  }

  /**
   * Add join with another table
   */
  join(condition: JoinCondition): this {
    this.joins.push(condition)
    return this
  }

  /**
   * Add inner join
   */
  innerJoin(table: string, fields?: string | string[]): this {
    return this.join({
      table,
      fields,
      inner: true
    })
  }

  /**
   * Add left join
   */
  leftJoin(table: string, fields?: string | string[]): this {
    return this.join({
      table,
      fields,
      inner: false
    })
  }

  /**
   * Add aggregation functions
   */
  aggregate(options: AggregationOptions): this {
    this.aggregation = options
    return this
  }

  /**
   * Count records
   */
  count(field = '*'): this {
    this.aggregation = {
      ...this.aggregation,
      count: field === '*' ? true : field
    }
    return this
  }

  /**
   * Group by fields
   */
  groupBy(...fields: (keyof TableRow<T>)[]): this {
    this.aggregation = {
      ...this.aggregation,
      groupBy: fields as string[]
    }
    return this
  }

  /**
   * Build Supabase query
   */
  buildQuery(client: any): PostgrestFilterBuilder<any, any, any> {
    // Start with base query
    let query = client.from(this.tableName)

    // Apply field selection
    const selectFields = this.buildSelectFields()
    if (selectFields) {
      query = query.select(selectFields, {
        count: this.aggregation?.count ? 'exact' : undefined
      })
    }

    // Apply filters
    query = this.applyFilters(query)

    // Apply full-text search
    if (this.searchQuery && this.searchFields.length > 0) {
      const searchConditions = this.searchFields.map(field => 
        `${field}.ilike.%${this.searchQuery}%`
      ).join(',')
      query = query.or(searchConditions)
    }

    // Apply sorting
    this.sorts.forEach(sort => {
      query = query.order(sort.field, {
        ascending: sort.ascending,
        nullsFirst: sort.nullsFirst,
        referencedTable: sort.referencedTable
      })
    })

    // Apply pagination
    if (this.pagination) {
      if (this.pagination.limit || this.pagination.offset) {
        const limit = this.pagination.limit || 50
        const offset = this.pagination.offset || 0
        query = query.range(offset, offset + limit - 1)
      }
    }

    return query
  }

  /**
   * Execute query and return results
   */
  async execute(client: any): Promise<Result<TResult[]>> {
    try {
      const query = this.buildQuery(client)
      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'query execution'))
      }

      const metadata = {
        count,
        pagination: this.pagination,
        filters: this.filters.length,
        sorts: this.sorts.length,
        joins: this.joins.length
      }

      return success(data as TResult[], metadata)
    } catch (error) {
      return failure(RepositoryError.internal('Query execution failed', error))
    }
  }

  /**
   * Execute query and return single result
   */
  async executeSingle(client: any): Promise<Result<TResult | null>> {
    try {
      const query = this.buildQuery(client)
      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') {
          return success(null)
        }
        return failure(RepositoryError.fromSupabaseError(error, 'single query execution'))
      }

      return success(data as TResult)
    } catch (error) {
      return failure(RepositoryError.internal('Single query execution failed', error))
    }
  }

  /**
   * Execute query with pagination metadata
   */
  async executePaginated(client: any): Promise<Result<{
    data: TResult[]
    count: number
    page: number
    pageSize: number
    totalPages: number
  }>> {
    try {
      const query = this.buildQuery(client)
      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'paginated query execution'))
      }

      const pageSize = this.pagination?.limit || 20
      const currentPage = this.pagination?.page || 1
      const totalPages = count ? Math.ceil(count / pageSize) : 1

      return success({
        data: data as TResult[],
        count: count || 0,
        page: currentPage,
        pageSize,
        totalPages
      })
    } catch (error) {
      return failure(RepositoryError.internal('Paginated query execution failed', error))
    }
  }

  /**
   * Build select fields string
   */
  private buildSelectFields(): string {
    if (this.selectedFields.length === 0 || this.selectedFields.includes('*')) {
      // Handle joins in select
      if (this.joins.length > 0) {
        const joinSelects = this.joins.map(join => {
          if (join.fields) {
            if (Array.isArray(join.fields)) {
              return `${join.table}(${join.fields.join(',')})`
            }
            return `${join.table}(${join.fields})`
          }
          return `${join.table}(*)`
        }).join(',')
        
        return this.selectedFields.includes('*') 
          ? `*,${joinSelects}` 
          : joinSelects
      }
      return '*'
    }

    let selectStr = this.selectedFields.join(',')

    // Add joins to select
    if (this.joins.length > 0) {
      const joinSelects = this.joins.map(join => {
        if (join.fields) {
          if (Array.isArray(join.fields)) {
            return `${join.table}(${join.fields.join(',')})`
          }
          return `${join.table}(${join.fields})`
        }
        return `${join.table}(*)`
      }).join(',')
      
      selectStr += `,${joinSelects}`
    }

    return selectStr
  }

  /**
   * Apply filter conditions to query
   */
  private applyFilters(query: any): any {
    let filteredQuery = query

    this.filters.forEach(filter => {
      if (filter.field === '_or') {
        // Handle OR conditions
        const orConditions = (filter.value as FilterCondition[])
          .map(condition => {
            return this.buildFilterString(condition)
          })
          .join(',')
        
        filteredQuery = filteredQuery.or(orConditions)
        return
      }

      // Handle regular filters
      const { field, operator, value, negate } = filter

      switch (operator) {
        case 'eq':
          filteredQuery = negate ? filteredQuery.neq(field, value) : filteredQuery.eq(field, value)
          break
        case 'neq':
          filteredQuery = negate ? filteredQuery.eq(field, value) : filteredQuery.neq(field, value)
          break
        case 'gt':
          filteredQuery = negate ? filteredQuery.lte(field, value) : filteredQuery.gt(field, value)
          break
        case 'gte':
          filteredQuery = negate ? filteredQuery.lt(field, value) : filteredQuery.gte(field, value)
          break
        case 'lt':
          filteredQuery = negate ? filteredQuery.gte(field, value) : filteredQuery.lt(field, value)
          break
        case 'lte':
          filteredQuery = negate ? filteredQuery.gt(field, value) : filteredQuery.lte(field, value)
          break
        case 'like':
          filteredQuery = negate ? filteredQuery.not.like(field, value) : filteredQuery.like(field, value)
          break
        case 'ilike':
          filteredQuery = negate ? filteredQuery.not.ilike(field, value) : filteredQuery.ilike(field, value)
          break
        case 'in':
          filteredQuery = negate ? filteredQuery.not.in(field, value as any[]) : filteredQuery.in(field, value as any[])
          break
        case 'not_in':
          filteredQuery = negate ? filteredQuery.in(field, value as any[]) : filteredQuery.not.in(field, value as any[])
          break
        case 'is':
          filteredQuery = negate ? filteredQuery.not.is(field, value) : filteredQuery.is(field, value)
          break
        case 'not_is':
          filteredQuery = negate ? filteredQuery.is(field, value) : filteredQuery.not.is(field, value)
          break
        case 'fts':
          filteredQuery = filteredQuery.textSearch(field, value as string)
          break
        case 'plfts':
          filteredQuery = filteredQuery.textSearch(field, value as string, { type: 'plain' })
          break
        case 'phfts':
          filteredQuery = filteredQuery.textSearch(field, value as string, { type: 'phrase' })
          break
        case 'wfts':
          filteredQuery = filteredQuery.textSearch(field, value as string, { type: 'websearch' })
          break
      }
    })

    return filteredQuery
  }

  /**
   * Build filter string for OR conditions
   */
  private buildFilterString(condition: FilterCondition): string {
    const { field, operator, value } = condition

    switch (operator) {
      case 'eq':
        return `${field}.eq.${value}`
      case 'neq':
        return `${field}.neq.${value}`
      case 'gt':
        return `${field}.gt.${value}`
      case 'gte':
        return `${field}.gte.${value}`
      case 'lt':
        return `${field}.lt.${value}`
      case 'lte':
        return `${field}.lte.${value}`
      case 'like':
        return `${field}.like.${value}`
      case 'ilike':
        return `${field}.ilike.${value}`
      case 'in':
        return `${field}.in.(${(value as any[]).join(',')})`
      case 'not_in':
        return `${field}.not.in.(${(value as any[]).join(',')})`
      case 'is':
        return `${field}.is.${value}`
      case 'not_is':
        return `${field}.not.is.${value}`
      default:
        return `${field}.eq.${value}`
    }
  }

  /**
   * Clone builder for reuse
   */
  clone(): TypeSafeQueryBuilder<T, TResult> {
    const cloned = new TypeSafeQueryBuilder(this.tableName)
    cloned.selectedFields = [...this.selectedFields]
    cloned.filters = [...this.filters]
    cloned.sorts = [...this.sorts]
    cloned.joins = [...this.joins]
    cloned.pagination = this.pagination ? { ...this.pagination } : undefined
    cloned.aggregation = this.aggregation ? { ...this.aggregation } : undefined
    cloned.searchQuery = this.searchQuery
    cloned.searchFields = [...this.searchFields]
    return cloned as any
  }

  /**
   * Reset builder state
   */
  reset(): this {
    this.selectedFields = []
    this.filters = []
    this.sorts = []
    this.joins = []
    this.pagination = undefined
    this.aggregation = undefined
    this.searchQuery = undefined
    this.searchFields = []
    return this
  }

  /**
   * Get query summary for debugging
   */
  getSummary() {
    return {
      table: this.tableName,
      fields: this.selectedFields.length || 'all',
      filters: this.filters.length,
      sorts: this.sorts.length,
      joins: this.joins.length,
      pagination: this.pagination,
      aggregation: this.aggregation,
      search: this.searchQuery ? `"${this.searchQuery}" in [${this.searchFields.join(', ')}]` : null
    }
  }
}

/**
 * Factory function to create type-safe query builder
 */
export function createQueryBuilder<T extends TableName>(
  tableName: T
): TypeSafeQueryBuilder<T, TableRow<T>> {
  return new TypeSafeQueryBuilder(tableName)
}

/**
 * Utility functions for common query patterns
 */
export class QueryBuilderUtils {
  /**
   * Create a paginated query with common filters
   */
  static createPaginatedQuery<T extends TableName>(
    tableName: T,
    page: number = 1,
    pageSize: number = 20,
    sortBy?: keyof TableRow<T>,
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const builder = createQueryBuilder(tableName)
      .page(page, pageSize)

    if (sortBy) {
      builder.orderBy(sortBy, sortOrder === 'asc')
    }

    return builder
  }

  /**
   * Create a search query with multiple fields
   */
  static createSearchQuery<T extends TableName>(
    tableName: T,
    searchTerm: string,
    searchFields: (keyof TableRow<T>)[],
    limit: number = 50
  ) {
    return createQueryBuilder(tableName)
      .search(searchTerm, searchFields)
      .limit(limit)
      .orderBy('created_at' as keyof TableRow<T>, false) // Most recent first
  }

  /**
   * Create a date range query
   */
  static createDateRangeQuery<T extends TableName>(
    tableName: T,
    dateField: keyof TableRow<T>,
    startDate: Date,
    endDate: Date
  ) {
    return createQueryBuilder(tableName)
      .whereDateRange(dateField, startDate, endDate)
      .orderBy(dateField, false)
  }

  /**
   * Create a relationship query with joins
   */
  static createRelationshipQuery<T extends TableName>(
    tableName: T,
    joins: JoinCondition[]
  ) {
    const builder = createQueryBuilder(tableName)
    
    joins.forEach(join => {
      builder.join(join)
    })

    return builder
  }
}

/**
 * Pre-built query templates for common use cases
 */
export class QueryTemplates {
  /**
   * Active records only
   */
  static activeOnly<T extends TableName>(builder: TypeSafeQueryBuilder<T, any>) {
    return builder.whereEqual('is_active' as keyof TableRow<T>, true as any)
  }

  /**
   * Recent records (last 30 days)
   */
  static recent<T extends TableName>(
    builder: TypeSafeQueryBuilder<T, any>,
    dateField: keyof TableRow<T> = 'created_at' as keyof TableRow<T>
  ) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    return builder.where(dateField, 'gte', thirtyDaysAgo.toISOString() as any)
  }

  /**
   * Soft-deleted records only
   */
  static softDeleted<T extends TableName>(builder: TypeSafeQueryBuilder<T, any>) {
    return builder.whereEqual('deleted_at' as keyof TableRow<T>, null as any)
  }

  /**
   * User-owned records
   */
  static ownedBy<T extends TableName>(
    builder: TypeSafeQueryBuilder<T, any>,
    userId: string,
    userField: keyof TableRow<T> = 'user_id' as keyof TableRow<T>
  ) {
    return builder.whereEqual(userField, userId as any)
  }

  /**
   * Organization-scoped records
   */
  static forOrganization<T extends TableName>(
    builder: TypeSafeQueryBuilder<T, any>,
    organizationId: string,
    orgField: keyof TableRow<T> = 'organization_id' as keyof TableRow<T>
  ) {
    return builder.whereEqual(orgField, organizationId as any)
  }
}