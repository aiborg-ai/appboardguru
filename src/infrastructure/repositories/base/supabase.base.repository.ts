/**
 * Supabase Base Repository Implementation
 * Provides common database operations using Supabase
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { 
  IBaseRepository, 
  PaginationParams, 
  PaginatedResult, 
  QueryOptions,
  Transaction 
} from '@/application/interfaces/repositories/base.repository.interface'
import { Result, success, failure } from '@/01-shared/lib/result'
import { Database } from '@/types/database'

export class SupabaseTransaction implements Transaction {
  private committed = false
  private rolledBack = false

  constructor(
    private client: SupabaseClient<Database>,
    private operations: Array<() => Promise<any>> = []
  ) {}

  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed')
    }

    try {
      for (const operation of this.operations) {
        await operation()
      }
      this.committed = true
    } catch (error) {
      await this.rollback()
      throw error
    }
  }

  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed')
    }
    this.rolledBack = true
    // In real implementation, would need to track and reverse operations
  }

  addOperation(operation: () => Promise<any>): void {
    if (this.committed || this.rolledBack) {
      throw new Error('Cannot add operations to completed transaction')
    }
    this.operations.push(operation)
  }
}

export abstract class SupabaseBaseRepository<T extends { id: string }, ID = string> 
  implements IBaseRepository<T, ID> {
  
  protected constructor(
    protected readonly client: SupabaseClient<Database>,
    protected readonly tableName: string
  ) {}

  async findById(id: ID, options?: QueryOptions): Promise<Result<T | null>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.buildSelectQuery(options))
        .eq('id', id as string)

      if (options?.include) {
        // Handle joins based on include array
        query = this.applyIncludes(query, options.include)
      }

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') {
        return failure(`Failed to find by id: ${error.message}`)
      }

      return success(data as T | null)
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async findOne(criteria: Partial<T>, options?: QueryOptions): Promise<Result<T | null>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.buildSelectQuery(options))

      query = this.applyCriteria(query, criteria)
      query = this.applyOptions(query, options)

      const { data, error } = await query.limit(1).single()

      if (error && error.code !== 'PGRST116') {
        return failure(`Failed to find one: ${error.message}`)
      }

      return success(data as T | null)
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async findMany(criteria: Partial<T>, options?: QueryOptions): Promise<Result<T[]>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.buildSelectQuery(options))

      query = this.applyCriteria(query, criteria)
      query = this.applyOptions(query, options)

      const { data, error } = await query

      if (error) {
        return failure(`Failed to find many: ${error.message}`)
      }

      return success((data as T[]) || [])
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async findAll(options?: QueryOptions): Promise<Result<T[]>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.buildSelectQuery(options))

      query = this.applyOptions(query, options)

      const { data, error } = await query

      if (error) {
        return failure(`Failed to find all: ${error.message}`)
      }

      return success((data as T[]) || [])
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async findPaginated(
    criteria: Partial<T>,
    pagination: PaginationParams,
    options?: QueryOptions
  ): Promise<Result<PaginatedResult<T>>> {
    try {
      const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination
      const offset = (page - 1) * limit

      // Get total count
      const countResult = await this.count(criteria)
      if (!countResult.success) {
        return failure(countResult.error)
      }

      // Get paginated items
      let query = this.client
        .from(this.tableName)
        .select(this.buildSelectQuery(options))

      query = this.applyCriteria(query, criteria)
      query = this.applyOptions(query, options)
      
      query = query
        .order(sortBy as any, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) {
        return failure(`Failed to find paginated: ${error.message}`)
      }

      return success({
        items: (data as T[]) || [],
        total: countResult.data,
        page,
        limit,
        totalPages: Math.ceil(countResult.data / limit)
      })
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<T>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .insert(entity as any)
        .select()
        .single()

      if (error) {
        return failure(`Failed to create: ${error.message}`)
      }

      return success(data as T)
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async createMany(entities: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Result<T[]>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .insert(entities as any)
        .select()

      if (error) {
        return failure(`Failed to create many: ${error.message}`)
      }

      return success((data as T[]) || [])
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async update(id: ID, updates: Partial<T>): Promise<Result<T>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update(updates as any)
        .eq('id', id as string)
        .select()
        .single()

      if (error) {
        return failure(`Failed to update: ${error.message}`)
      }

      return success(data as T)
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async updateMany(criteria: Partial<T>, updates: Partial<T>): Promise<Result<number>> {
    try {
      let query = this.client
        .from(this.tableName)
        .update(updates as any)

      query = this.applyCriteria(query, criteria)

      const { data, error, count } = await query.select('id')

      if (error) {
        return failure(`Failed to update many: ${error.message}`)
      }

      return success(count || 0)
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async delete(id: ID): Promise<Result<boolean>> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id as string)

      if (error) {
        return failure(`Failed to delete: ${error.message}`)
      }

      return success(true)
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async deleteMany(criteria: Partial<T>): Promise<Result<number>> {
    try {
      let query = this.client.from(this.tableName).delete()
      query = this.applyCriteria(query, criteria)

      const { error, count } = await query.select('id')

      if (error) {
        return failure(`Failed to delete many: ${error.message}`)
      }

      return success(count || 0)
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async exists(criteria: Partial<T>): Promise<Result<boolean>> {
    try {
      const countResult = await this.count(criteria)
      if (!countResult.success) {
        return failure(countResult.error)
      }
      return success(countResult.data > 0)
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async count(criteria?: Partial<T>): Promise<Result<number>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('id', { count: 'exact', head: true })

      if (criteria) {
        query = this.applyCriteria(query, criteria)
      }

      const { count, error } = await query

      if (error) {
        return failure(`Failed to count: ${error.message}`)
      }

      return success(count || 0)
    } catch (error) {
      return failure(`Unexpected error: ${error}`)
    }
  }

  async beginTransaction(): Promise<Transaction> {
    return new SupabaseTransaction(this.client)
  }

  async executeInTransaction<R>(
    operation: (transaction: Transaction) => Promise<R>
  ): Promise<Result<R>> {
    const transaction = await this.beginTransaction()
    try {
      const result = await operation(transaction)
      await transaction.commit()
      return success(result)
    } catch (error) {
      await transaction.rollback()
      return failure(`Transaction failed: ${error}`)
    }
  }

  // Helper methods
  protected buildSelectQuery(options?: QueryOptions): string {
    if (options?.select && options.select.length > 0) {
      return options.select.join(',')
    }
    return '*'
  }

  protected applyCriteria(query: any, criteria: Partial<T>): any {
    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    }
    return query
  }

  protected applyOptions(query: any, options?: QueryOptions): any {
    if (!options) return query

    if (options.where) {
      for (const [key, value] of Object.entries(options.where)) {
        if (typeof value === 'object' && value !== null) {
          // Handle complex where conditions
          if ('gt' in value) query = query.gt(key, value.gt)
          if ('gte' in value) query = query.gte(key, value.gte)
          if ('lt' in value) query = query.lt(key, value.lt)
          if ('lte' in value) query = query.lte(key, value.lte)
          if ('like' in value) query = query.like(key, value.like)
          if ('ilike' in value) query = query.ilike(key, value.ilike)
          if ('is' in value) query = query.is(key, value.is)
          if ('in' in value) query = query.in(key, value.in)
          if ('contains' in value) query = query.contains(key, value.contains)
          if ('containedBy' in value) query = query.containedBy(key, value.containedBy)
        } else {
          query = query.eq(key, value)
        }
      }
    }

    if (options.orderBy) {
      for (const [key, order] of Object.entries(options.orderBy)) {
        query = query.order(key, { ascending: order === 'asc' })
      }
    }

    return query
  }

  protected applyIncludes(query: any, includes: string[]): any {
    // Override in specific repositories to handle joins
    return query
  }
}