/**
 * Base Repository Interface
 * Defines common repository operations following DDD patterns
 */

import { Result } from '@/01-shared/lib/result'

export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface QueryOptions {
  include?: string[]
  select?: string[]
  where?: Record<string, any>
  orderBy?: Record<string, 'asc' | 'desc'>
}

export interface Transaction {
  commit(): Promise<void>
  rollback(): Promise<void>
}

/**
 * Base repository interface for all domain repositories
 */
export interface IBaseRepository<T, ID = string> {
  // Basic CRUD operations
  findById(id: ID, options?: QueryOptions): Promise<Result<T | null>>
  findOne(criteria: Partial<T>, options?: QueryOptions): Promise<Result<T | null>>
  findMany(criteria: Partial<T>, options?: QueryOptions): Promise<Result<T[]>>
  findAll(options?: QueryOptions): Promise<Result<T[]>>
  
  // Pagination
  findPaginated(
    criteria: Partial<T>,
    pagination: PaginationParams,
    options?: QueryOptions
  ): Promise<Result<PaginatedResult<T>>>
  
  // Write operations
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<T>>
  createMany(entities: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Result<T[]>>
  update(id: ID, updates: Partial<T>): Promise<Result<T>>
  updateMany(criteria: Partial<T>, updates: Partial<T>): Promise<Result<number>>
  delete(id: ID): Promise<Result<boolean>>
  deleteMany(criteria: Partial<T>): Promise<Result<number>>
  
  // Existence checks
  exists(criteria: Partial<T>): Promise<Result<boolean>>
  count(criteria?: Partial<T>): Promise<Result<number>>
  
  // Transactions
  beginTransaction(): Promise<Transaction>
  executeInTransaction<R>(
    operation: (transaction: Transaction) => Promise<R>
  ): Promise<Result<R>>
}

/**
 * Repository interface with soft delete support
 */
export interface ISoftDeleteRepository<T, ID = string> extends IBaseRepository<T, ID> {
  softDelete(id: ID): Promise<Result<boolean>>
  softDeleteMany(criteria: Partial<T>): Promise<Result<number>>
  restore(id: ID): Promise<Result<T>>
  restoreMany(criteria: Partial<T>): Promise<Result<number>>
  findDeleted(criteria?: Partial<T>, options?: QueryOptions): Promise<Result<T[]>>
  findWithDeleted(criteria?: Partial<T>, options?: QueryOptions): Promise<Result<T[]>>
}

/**
 * Repository interface with audit support
 */
export interface IAuditableRepository<T, ID = string> extends IBaseRepository<T, ID> {
  findWithHistory(id: ID): Promise<Result<T & { history: any[] }>>
  getRevisions(id: ID): Promise<Result<any[]>>
  getRevisionAt(id: ID, timestamp: Date): Promise<Result<T | null>>
}

/**
 * Repository interface with cache support
 */
export interface ICacheableRepository<T, ID = string> extends IBaseRepository<T, ID> {
  invalidateCache(id?: ID): Promise<void>
  preloadCache(ids: ID[]): Promise<void>
  getCacheStats(): Promise<{
    hits: number
    misses: number
    size: number
    ttl: number
  }>
}

/**
 * Unit of Work pattern interface
 */
export interface IUnitOfWork {
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  getRepository<T>(name: string): IBaseRepository<T>
  registerRepository<T>(name: string, repository: IBaseRepository<T>): void
}

/**
 * Specification pattern for complex queries
 */
export interface ISpecification<T> {
  isSatisfiedBy(entity: T): boolean
  and(specification: ISpecification<T>): ISpecification<T>
  or(specification: ISpecification<T>): ISpecification<T>
  not(): ISpecification<T>
  toCriteria(): Partial<T>
}

/**
 * Repository factory interface
 */
export interface IRepositoryFactory {
  createRepository<T, ID = string>(
    entityName: string,
    options?: Record<string, any>
  ): IBaseRepository<T, ID>
}