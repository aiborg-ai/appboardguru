/**
 * Enhanced Base Repository
 * Adds batch operations, optimistic locking, soft delete patterns,
 * repository hooks system, and event emission capabilities
 */

import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError, combineResults, partitionResults } from './result'
import { TypeSafeQueryBuilder } from './query-builder'
import type { Database } from '../../types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EventEmitter } from 'events'

// Hook types
export type HookType = 
  | 'beforeCreate' | 'afterCreate'
  | 'beforeUpdate' | 'afterUpdate'
  | 'beforeDelete' | 'afterDelete'
  | 'beforeFind' | 'afterFind'

export interface HookContext<T = any> {
  entity: string
  operation: string
  data?: T
  existingData?: T
  userId?: string
  metadata?: Record<string, unknown>
  timestamp: Date
}

export type HookFunction<T = any> = (context: HookContext<T>) => Promise<void | Result<void>>

// Batch operation types
export interface BatchOperation<T = any> {
  type: 'create' | 'update' | 'delete'
  data: T
  id?: string
  metadata?: Record<string, unknown>
}

export interface BatchResult<T = any> {
  successful: Array<{ operation: BatchOperation<T>; result: T }>
  failed: Array<{ operation: BatchOperation<T>; error: RepositoryError }>
  total: number
  successCount: number
  failureCount: number
}

// Optimistic locking types
export interface VersionedEntity {
  id: string
  version: number
  updated_at: string
}

export interface OptimisticLockUpdate<T> {
  id: string
  expectedVersion: number
  data: T
}

// Soft delete types
export interface SoftDeletable {
  deleted_at: string | null
  is_deleted?: boolean
}

// Event types
export interface RepositoryEvent {
  type: string
  entity: string
  entityId: string
  operation: string
  data?: any
  userId?: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

/**
 * Enhanced repository with advanced operations
 */
export abstract class EnhancedBaseRepository extends BaseRepository {
  protected hooks: Map<HookType, HookFunction[]> = new Map()
  protected eventEmitter: EventEmitter = new EventEmitter()
  protected batchSize: number = 100 // Default batch size for bulk operations

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.initializeHooks()
  }

  /**
   * Initialize default hooks
   */
  protected initializeHooks(): void {
    // Override in subclasses to add default hooks
  }

  /**
   * Register a hook function
   */
  addHook<T = any>(type: HookType, fn: HookFunction<T>): void {
    const hooks = this.hooks.get(type) || []
    hooks.push(fn as HookFunction)
    this.hooks.set(type, hooks)
  }

  /**
   * Remove a hook function
   */
  removeHook<T = any>(type: HookType, fn: HookFunction<T>): void {
    const hooks = this.hooks.get(type) || []
    const index = hooks.indexOf(fn as HookFunction)
    if (index > -1) {
      hooks.splice(index, 1)
      this.hooks.set(type, hooks)
    }
  }

  /**
   * Execute hooks for a given type
   */
  protected async executeHooks<T = any>(
    type: HookType,
    context: HookContext<T>
  ): Promise<Result<void>> {
    const hooks = this.hooks.get(type) || []
    
    if (hooks.length === 0) {
      return success(undefined)
    }

    try {
      const results = await Promise.all(
        hooks.map(async (hook) => {
          try {
            const result = await hook(context)
            return result || success(undefined)
          } catch (error) {
            return failure(RepositoryError.internal(
              `Hook execution failed: ${type}`,
              error,
              { hookType: type, entity: context.entity }
            ))
          }
        })
      )

      // Check if any hooks failed
      const failures = results.filter(result => !result.success)
      if (failures.length > 0) {
        return failure(RepositoryError.internal(
          `${failures.length} hook(s) failed for ${type}`,
          undefined,
          { failures: failures.map(f => f.error) }
        ))
      }

      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal(`Hook execution error: ${type}`, error))
    }
  }

  /**
   * Emit repository event
   */
  protected emitEvent(event: RepositoryEvent): void {
    this.eventEmitter.emit('repository:event', event)
    this.eventEmitter.emit(`repository:${event.operation}`, event)
    this.eventEmitter.emit(`repository:${event.entity}:${event.operation}`, event)
  }

  /**
   * Register event listener
   */
  on(event: string, listener: (event: RepositoryEvent) => void): void {
    this.eventEmitter.on(event, listener)
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: (event: RepositoryEvent) => void): void {
    this.eventEmitter.off(event, listener)
  }

  // ==== Batch Operations ====

  /**
   * Execute multiple operations in batches
   */
  async executeBatch<T>(
    operations: BatchOperation<T>[],
    options: {
      continueOnError?: boolean
      batchSize?: number
      validateBeforeExecute?: boolean
    } = {}
  ): Promise<Result<BatchResult<T>>> {
    const {
      continueOnError = false,
      batchSize = this.batchSize,
      validateBeforeExecute = true
    } = options

    if (operations.length === 0) {
      return success({
        successful: [],
        failed: [],
        total: 0,
        successCount: 0,
        failureCount: 0
      })
    }

    // Validate operations if requested
    if (validateBeforeExecute) {
      const validationResult = this.validateBatchOperations(operations)
      if (!validationResult.success) {
        return failure(validationResult.error)
      }
    }

    const results: Array<{ operation: BatchOperation<T>; result: T; error?: RepositoryError }> = []
    
    // Process in batches
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize)
      
      try {
        const batchResults = await this.processBatch(batch, continueOnError)
        results.push(...batchResults)
        
        // If not continuing on error and we have failures, stop here
        if (!continueOnError && batchResults.some(r => r.error)) {
          break
        }
      } catch (error) {
        if (!continueOnError) {
          return failure(RepositoryError.internal('Batch execution failed', error))
        }
        
        // Mark all operations in this batch as failed
        batch.forEach(operation => {
          results.push({
            operation,
            result: null as any,
            error: RepositoryError.internal('Batch processing error', error)
          })
        })
      }
    }

    // Separate successful and failed results
    const successful = results
      .filter(r => !r.error)
      .map(r => ({ operation: r.operation, result: r.result }))
    
    const failed = results
      .filter(r => r.error)
      .map(r => ({ operation: r.operation, error: r.error! }))

    const batchResult: BatchResult<T> = {
      successful,
      failed,
      total: operations.length,
      successCount: successful.length,
      failureCount: failed.length
    }

    return success(batchResult)
  }

  /**
   * Process a single batch of operations
   */
  protected async processBatch<T>(
    operations: BatchOperation<T>[],
    continueOnError: boolean
  ): Promise<Array<{ operation: BatchOperation<T>; result: T; error?: RepositoryError }>> {
    const results = await Promise.allSettled(
      operations.map(async (operation) => {
        try {
          const result = await this.executeSingleOperation(operation)
          if (result.success) {
            return { operation, result: result.data }
          } else {
            return { operation, result: null as any, error: result.error }
          }
        } catch (error) {
          return {
            operation,
            result: null as any,
            error: RepositoryError.internal('Operation execution failed', error)
          }
        }
      })
    )

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          operation: operations[index],
          result: null as any,
          error: RepositoryError.internal('Promise rejection', result.reason)
        }
      }
    })
  }

  /**
   * Execute a single operation (implemented by subclasses)
   */
  protected abstract executeSingleOperation<T>(
    operation: BatchOperation<T>
  ): Promise<Result<T>>

  /**
   * Validate batch operations
   */
  protected validateBatchOperations<T>(
    operations: BatchOperation<T>[]
  ): Result<void> {
    // Basic validation - override in subclasses for specific validation
    const invalidOps = operations.filter(op => 
      !op.type || !['create', 'update', 'delete'].includes(op.type)
    )

    if (invalidOps.length > 0) {
      return failure(RepositoryError.validation(
        `Invalid operation types found: ${invalidOps.length} operations`,
        { invalidOperations: invalidOps }
      ))
    }

    const updateOpsWithoutId = operations.filter(op => 
      (op.type === 'update' || op.type === 'delete') && !op.id
    )

    if (updateOpsWithoutId.length > 0) {
      return failure(RepositoryError.validation(
        'Update and delete operations require an ID',
        { operationsWithoutId: updateOpsWithoutId }
      ))
    }

    return success(undefined)
  }

  /**
   * Batch create multiple records
   */
  async createMany<T>(
    records: T[],
    options: { continueOnError?: boolean; batchSize?: number } = {}
  ): Promise<Result<BatchResult<T>>> {
    const operations: BatchOperation<T>[] = records.map(record => ({
      type: 'create',
      data: record
    }))

    return this.executeBatch(operations, options)
  }

  /**
   * Batch update multiple records
   */
  async updateMany<T>(
    updates: Array<{ id: string; data: Partial<T> }>,
    options: { continueOnError?: boolean; batchSize?: number } = {}
  ): Promise<Result<BatchResult<T>>> {
    const operations: BatchOperation<Partial<T>>[] = updates.map(update => ({
      type: 'update',
      id: update.id,
      data: update.data
    }))

    return this.executeBatch(operations, options)
  }

  /**
   * Batch delete multiple records
   */
  async deleteMany(
    ids: string[],
    options: { continueOnError?: boolean; batchSize?: number; soft?: boolean } = {}
  ): Promise<Result<BatchResult<void>>> {
    const operations: BatchOperation<any>[] = ids.map(id => ({
      type: 'delete',
      id,
      data: options.soft ? { deleted_at: new Date().toISOString() } : undefined
    }))

    return this.executeBatch(operations, options)
  }

  // ==== Optimistic Locking ====

  /**
   * Update with optimistic locking
   */
  async updateWithOptimisticLock<T extends VersionedEntity>(
    update: OptimisticLockUpdate<Partial<T>>
  ): Promise<Result<T>> {
    const { id, expectedVersion, data } = update

    try {
      // Execute hooks
      const beforeHookResult = await this.executeHooks('beforeUpdate', {
        entity: this.getEntityName(),
        operation: 'updateWithOptimisticLock',
        data,
        userId: await this.getCurrentUserId().then(r => r.success ? r.data : undefined),
        metadata: { expectedVersion },
        timestamp: new Date()
      })

      if (!beforeHookResult.success) {
        return failure(beforeHookResult.error)
      }

      // Perform atomic update with version check
      const updateData = {
        ...data,
        version: expectedVersion + 1,
        updated_at: new Date().toISOString()
      }

      const { data: result, error } = await this.supabase
        .from(this.getTableName())
        .update(updateData as any)
        .eq('id', id)
        .eq('version', expectedVersion)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return failure(RepositoryError.conflict(
            this.getEntityName(),
            'Version mismatch - record may have been updated by another process',
            { id, expectedVersion, currentVersion: 'unknown' }
          ))
        }
        return failure(RepositoryError.fromSupabaseError(error, 'optimistic lock update'))
      }

      // Execute after hooks
      await this.executeHooks('afterUpdate', {
        entity: this.getEntityName(),
        operation: 'updateWithOptimisticLock',
        data: result,
        userId: await this.getCurrentUserId().then(r => r.success ? r.data : undefined),
        metadata: { previousVersion: expectedVersion },
        timestamp: new Date()
      })

      // Emit event
      this.emitEvent({
        type: 'entity:updated',
        entity: this.getEntityName(),
        entityId: id,
        operation: 'updateWithOptimisticLock',
        data: result,
        timestamp: new Date(),
        metadata: { versionChanged: `${expectedVersion} -> ${expectedVersion + 1}` }
      })

      return success(result as T)
    } catch (error) {
      return failure(RepositoryError.internal('Optimistic lock update failed', error))
    }
  }

  /**
   * Batch update with optimistic locking
   */
  async updateManyWithOptimisticLock<T extends VersionedEntity>(
    updates: OptimisticLockUpdate<Partial<T>>[],
    options: { continueOnError?: boolean } = {}
  ): Promise<Result<BatchResult<T>>> {
    const results: Array<{ operation: OptimisticLockUpdate<Partial<T>>; result?: T; error?: RepositoryError }> = []

    for (const update of updates) {
      try {
        const result = await this.updateWithOptimisticLock<T>(update)
        if (result.success) {
          results.push({ operation: update, result: result.data })
        } else {
          results.push({ operation: update, error: result.error })
          
          if (!options.continueOnError) {
            break
          }
        }
      } catch (error) {
        const repoError = RepositoryError.internal('Batch optimistic update failed', error)
        results.push({ operation: update, error: repoError })
        
        if (!options.continueOnError) {
          break
        }
      }
    }

    const successful = results
      .filter(r => r.result)
      .map(r => ({ operation: r.operation as any, result: r.result! }))
    
    const failed = results
      .filter(r => r.error)
      .map(r => ({ operation: r.operation as any, error: r.error! }))

    return success({
      successful,
      failed,
      total: updates.length,
      successCount: successful.length,
      failureCount: failed.length
    })
  }

  // ==== Soft Delete Operations ====

  /**
   * Soft delete a record
   */
  async softDelete(id: string): Promise<Result<void>> {
    try {
      const beforeHookResult = await this.executeHooks('beforeDelete', {
        entity: this.getEntityName(),
        operation: 'softDelete',
        data: { id },
        userId: await this.getCurrentUserId().then(r => r.success ? r.data : undefined),
        timestamp: new Date()
      })

      if (!beforeHookResult.success) {
        return failure(beforeHookResult.error)
      }

      const { error } = await this.supabase
        .from(this.getTableName())
        .update({
          deleted_at: new Date().toISOString(),
          is_deleted: true
        } as any)
        .eq('id', id)

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'soft delete'))
      }

      await this.executeHooks('afterDelete', {
        entity: this.getEntityName(),
        operation: 'softDelete',
        data: { id },
        userId: await this.getCurrentUserId().then(r => r.success ? r.data : undefined),
        timestamp: new Date()
      })

      this.emitEvent({
        type: 'entity:soft_deleted',
        entity: this.getEntityName(),
        entityId: id,
        operation: 'softDelete',
        timestamp: new Date()
      })

      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal('Soft delete failed', error))
    }
  }

  /**
   * Restore a soft-deleted record
   */
  async restoreDeleted(id: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from(this.getTableName())
        .update({
          deleted_at: null,
          is_deleted: false
        } as any)
        .eq('id', id)

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'restore deleted'))
      }

      this.emitEvent({
        type: 'entity:restored',
        entity: this.getEntityName(),
        entityId: id,
        operation: 'restore',
        timestamp: new Date()
      })

      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal('Restore failed', error))
    }
  }

  /**
   * Find with soft delete filtering
   */
  protected createQueryBuilder(): TypeSafeQueryBuilder<any> {
    return new TypeSafeQueryBuilder(this.getTableName() as any)
  }

  /**
   * Apply soft delete filter
   */
  protected applySoftDeleteFilter<T>(
    query: TypeSafeQueryBuilder<any, T>,
    includeDeleted: boolean = false
  ): TypeSafeQueryBuilder<any, T> {
    if (!includeDeleted) {
      query.where('deleted_at' as any, 'is', null)
    }
    return query
  }

  // ==== Abstract methods that subclasses must implement ====

  /**
   * Get the table name for database operations
   */
  protected abstract getTableName(): string

  // ==== Utility methods ====

  /**
   * Create a new entity with hooks and events
   */
  protected async createWithHooks<T>(
    data: T,
    operation: string = 'create'
  ): Promise<Result<T>> {
    const userId = await this.getCurrentUserId().then(r => r.success ? r.data : undefined)

    const beforeHookResult = await this.executeHooks('beforeCreate', {
      entity: this.getEntityName(),
      operation,
      data,
      userId,
      timestamp: new Date()
    })

    if (!beforeHookResult.success) {
      return failure(beforeHookResult.error)
    }

    // Actual creation logic should be implemented in subclasses
    // This is a template method pattern
    
    return failure(RepositoryError.internal('createWithHooks must be implemented by subclass'))
  }

  /**
   * Update an entity with hooks and events
   */
  protected async updateWithHooks<T>(
    id: string,
    data: Partial<T>,
    operation: string = 'update'
  ): Promise<Result<T>> {
    const userId = await this.getCurrentUserId().then(r => r.success ? r.data : undefined)

    const beforeHookResult = await this.executeHooks('beforeUpdate', {
      entity: this.getEntityName(),
      operation,
      data,
      userId,
      timestamp: new Date()
    })

    if (!beforeHookResult.success) {
      return failure(beforeHookResult.error)
    }

    // Actual update logic should be implemented in subclasses
    return failure(RepositoryError.internal('updateWithHooks must be implemented by subclass'))
  }

  /**
   * Delete an entity with hooks and events
   */
  protected async deleteWithHooks(
    id: string,
    operation: string = 'delete'
  ): Promise<Result<void>> {
    const userId = await this.getCurrentUserId().then(r => r.success ? r.data : undefined)

    const beforeHookResult = await this.executeHooks('beforeDelete', {
      entity: this.getEntityName(),
      operation,
      data: { id },
      userId,
      timestamp: new Date()
    })

    if (!beforeHookResult.success) {
      return failure(beforeHookResult.error)
    }

    // Actual delete logic should be implemented in subclasses
    return failure(RepositoryError.internal('deleteWithHooks must be implemented by subclass'))
  }
}

/**
 * Utility functions for working with versioned entities
 */
export class OptimisticLockingUtils {
  /**
   * Check if an entity supports optimistic locking
   */
  static isVersioned(entity: any): entity is VersionedEntity {
    return entity && typeof entity === 'object' && 
           'id' in entity && 'version' in entity && typeof entity.version === 'number'
  }

  /**
   * Increment version for an entity
   */
  static incrementVersion<T extends VersionedEntity>(entity: T): T {
    return {
      ...entity,
      version: entity.version + 1,
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Create an optimistic lock update
   */
  static createUpdate<T extends VersionedEntity>(
    entity: T,
    updates: Partial<T>
  ): OptimisticLockUpdate<Partial<T>> {
    return {
      id: entity.id,
      expectedVersion: entity.version,
      data: updates
    }
  }

  /**
   * Validate version compatibility
   */
  static validateVersion(
    entity: VersionedEntity,
    expectedVersion: number
  ): Result<void> {
    if (entity.version !== expectedVersion) {
      return failure(RepositoryError.conflict(
        'Entity',
        `Version mismatch: expected ${expectedVersion}, got ${entity.version}`,
        { expectedVersion, actualVersion: entity.version, entityId: entity.id }
      ))
    }
    return success(undefined)
  }
}

/**
 * Hook utilities for common patterns
 */
export class RepositoryHooks {
  /**
   * Create a validation hook
   */
  static validation<T>(
    validator: (data: T) => Result<void>
  ): HookFunction<T> {
    return async (context: HookContext<T>) => {
      if (context.data) {
        return validator(context.data)
      }
      return success(undefined)
    }
  }

  /**
   * Create an audit logging hook
   */
  static auditLog(): HookFunction {
    return async (context: HookContext) => {
      // Log to audit table
      console.log('Audit log:', {
        entity: context.entity,
        operation: context.operation,
        userId: context.userId,
        timestamp: context.timestamp
      })
      return success(undefined)
    }
  }

  /**
   * Create a cache invalidation hook
   */
  static cacheInvalidation(
    cacheManager: any,
    patterns: string[]
  ): HookFunction {
    return async (context: HookContext) => {
      try {
        await Promise.allSettled(
          patterns.map(pattern => cacheManager.invalidate(pattern))
        )
        return success(undefined)
      } catch (error) {
        return failure(RepositoryError.internal('Cache invalidation failed', error))
      }
    }
  }

  /**
   * Create a notification hook
   */
  static notification(
    notificationService: any,
    eventType: string
  ): HookFunction {
    return async (context: HookContext) => {
      try {
        await notificationService.send({
          type: eventType,
          entity: context.entity,
          operation: context.operation,
          data: context.data,
          timestamp: context.timestamp
        })
        return success(undefined)
      } catch (error) {
        // Don't fail the operation for notification errors
        console.warn('Notification failed:', error)
        return success(undefined)
      }
    }
  }
}