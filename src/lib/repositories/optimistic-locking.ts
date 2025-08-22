/**
 * Optimistic Locking Implementation for Repository Layer
 * 
 * Provides comprehensive optimistic concurrency control with version management,
 * conflict resolution, and automatic retry mechanisms.
 */

import { Result, success, failure, RepositoryError } from './result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// Version-aware entity interface
export interface VersionedEntity {
  id: string
  version: number
  updated_at: string
  created_at?: string
}

// Lock information for entities
export interface EntityLock {
  table: string
  entityId: string
  version: number
  lockedBy: string // transaction ID or user ID
  lockedAt: Date
  expiresAt: Date
  lockType: 'READ' | 'WRITE'
  metadata?: Record<string, unknown>
}

// Version conflict information
export interface VersionConflict {
  table: string
  entityId: string
  expectedVersion: number
  currentVersion: number
  conflictedAt: Date
  conflictType: 'VERSION_MISMATCH' | 'CONCURRENT_MODIFICATION' | 'LOCK_TIMEOUT'
  details?: Record<string, unknown>
}

// Optimistic update request
export interface OptimisticUpdateRequest<T extends VersionedEntity> {
  table: string
  entityId: string
  expectedVersion: number
  updates: Partial<Omit<T, 'id' | 'version' | 'created_at'>>
  metadata?: Record<string, unknown>
}

// Update result with version information
export interface OptimisticUpdateResult<T extends VersionedEntity> {
  entity: T
  previousVersion: number
  newVersion: number
  conflictsResolved?: VersionConflict[]
  retryCount?: number
}

// Conflict resolution strategies
export type ConflictResolutionStrategy = 
  | 'FAIL_FAST'           // Fail immediately on conflict
  | 'RETRY_AUTOMATIC'     // Automatically retry with fresh data
  | 'MERGE_FIELDS'        // Attempt field-level merge
  | 'LAST_WRITER_WINS'    // Override with latest changes
  | 'MANUAL_RESOLUTION'   // Return conflict for manual handling

export interface ConflictResolutionOptions {
  strategy: ConflictResolutionStrategy
  maxRetries?: number
  retryDelayMs?: number
  mergeRules?: MergeRule[]
  conflictHandler?: (conflict: VersionConflict) => Promise<Result<Partial<VersionedEntity>>>
}

export interface MergeRule {
  field: string
  strategy: 'KEEP_CURRENT' | 'KEEP_INCOMING' | 'MERGE_ARRAYS' | 'CUSTOM'
  customMerger?: (current: any, incoming: any) => any
}

/**
 * Optimistic Locking Manager
 */
export class OptimisticLockingManager {
  private lockRegistry: Map<string, EntityLock> = new Map()
  private conflictHistory: Map<string, VersionConflict[]> = new Map()

  constructor(private supabase: SupabaseClient<Database>) {
    this.startLockCleanup()
  }

  /**
   * Perform optimistic update with conflict resolution
   */
  async updateWithOptimisticLocking<T extends VersionedEntity>(
    request: OptimisticUpdateRequest<T>,
    options: ConflictResolutionOptions = { strategy: 'FAIL_FAST' }
  ): Promise<Result<OptimisticUpdateResult<T>>> {
    const lockKey = `${request.table}:${request.entityId}`
    let retryCount = 0
    const maxRetries = options.maxRetries || 3

    while (retryCount <= maxRetries) {
      try {
        // Check for existing locks
        const existingLock = this.lockRegistry.get(lockKey)
        if (existingLock && existingLock.expiresAt > new Date()) {
          return failure(RepositoryError.conflict(
            'entity_locked',
            `Entity ${request.entityId} is locked by ${existingLock.lockedBy}`,
            { lock: existingLock }
          ))
        }

        // Attempt atomic update with version check
        const updateResult = await this.performAtomicUpdate(request)
        
        if (updateResult.success) {
          const result: OptimisticUpdateResult<T> = {
            entity: updateResult.data.entity,
            previousVersion: request.expectedVersion,
            newVersion: updateResult.data.entity.version,
            retryCount
          }
          
          return success(result)
        }

        // Handle version conflict
        const conflict: VersionConflict = {
          table: request.table,
          entityId: request.entityId,
          expectedVersion: request.expectedVersion,
          currentVersion: updateResult.data?.currentVersion || -1,
          conflictedAt: new Date(),
          conflictType: 'VERSION_MISMATCH'
        }

        // Record conflict
        this.recordConflict(lockKey, conflict)

        // Apply conflict resolution strategy
        const resolutionResult = await this.resolveConflict(
          request,
          conflict,
          options
        )

        if (!resolutionResult.success) {
          return failure(resolutionResult.error)
        }

        if (resolutionResult.data.shouldRetry) {
          // Update request with resolved data
          if (resolutionResult.data.resolvedRequest) {
            Object.assign(request, resolutionResult.data.resolvedRequest)
          }
          
          retryCount++
          
          if (options.retryDelayMs) {
            await this.sleep(options.retryDelayMs * Math.pow(2, retryCount - 1))
          }
          
          continue
        } else {
          // Manual resolution required
          return failure(RepositoryError.conflict(
            'version_conflict',
            'Version conflict requires manual resolution',
            { conflict, request }
          ))
        }

      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++
          await this.sleep(1000 * retryCount)
          continue
        }
        
        return failure(RepositoryError.internal(
          'Optimistic update failed',
          error,
          { request, retryCount }
        ))
      }
    }

    return failure(RepositoryError.timeout(
      'optimistic_update',
      (options.retryDelayMs || 1000) * maxRetries
    ))
  }

  /**
   * Acquire explicit lock for entity
   */
  async acquireLock(
    table: string,
    entityId: string,
    lockType: 'READ' | 'WRITE',
    lockedBy: string,
    timeoutMs: number = 10000
  ): Promise<Result<EntityLock>> {
    const lockKey = `${table}:${entityId}`
    const existingLock = this.lockRegistry.get(lockKey)

    // Check for conflicting locks
    if (existingLock && existingLock.expiresAt > new Date()) {
      if (existingLock.lockType === 'WRITE' || lockType === 'WRITE') {
        return failure(RepositoryError.conflict(
          'lock_conflict',
          `Cannot acquire ${lockType} lock - entity is locked by ${existingLock.lockedBy}`,
          { existingLock, requested: { table, entityId, lockType, lockedBy } }
        ))
      }
    }

    // Create new lock
    const lock: EntityLock = {
      table,
      entityId,
      version: -1, // Will be set when entity is loaded
      lockedBy,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + timeoutMs),
      lockType
    }

    this.lockRegistry.set(lockKey, lock)
    return success(lock)
  }

  /**
   * Release lock for entity
   */
  async releaseLock(
    table: string,
    entityId: string,
    lockedBy: string
  ): Promise<Result<void>> {
    const lockKey = `${table}:${entityId}`
    const existingLock = this.lockRegistry.get(lockKey)

    if (!existingLock) {
      return failure(RepositoryError.notFound('Entity lock', lockKey))
    }

    if (existingLock.lockedBy !== lockedBy) {
      return failure(RepositoryError.forbidden(
        'lock_release',
        `Lock is owned by ${existingLock.lockedBy}, not ${lockedBy}`
      ))
    }

    this.lockRegistry.delete(lockKey)
    return success(undefined)
  }

  /**
   * Get version information for entity
   */
  async getEntityVersion(
    table: string,
    entityId: string
  ): Promise<Result<{ version: number; updatedAt: string }>> {
    try {
      const { data, error } = await this.supabase
        .from(table as any)
        .select('version, updated_at')
        .eq('id', entityId)
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'get entity version'))
      }

      if (!data) {
        return failure(RepositoryError.notFound('Entity', entityId))
      }

      return success({
        version: data.version || 1,
        updatedAt: data.updated_at
      })
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get entity version', error))
    }
  }

  /**
   * Batch optimistic updates with conflict detection
   */
  async batchUpdateWithOptimisticLocking<T extends VersionedEntity>(
    requests: OptimisticUpdateRequest<T>[],
    options: ConflictResolutionOptions & {
      continueOnConflict?: boolean
    } = { strategy: 'FAIL_FAST' }
  ): Promise<Result<{
    successful: OptimisticUpdateResult<T>[]
    failed: Array<{ request: OptimisticUpdateRequest<T>; error: RepositoryError }>
    conflicts: VersionConflict[]
  }>> {
    const successful: OptimisticUpdateResult<T>[] = []
    const failed: Array<{ request: OptimisticUpdateRequest<T>; error: RepositoryError }> = []
    const conflicts: VersionConflict[] = []

    for (const request of requests) {
      try {
        const result = await this.updateWithOptimisticLocking(request, options)
        
        if (result.success) {
          successful.push(result.data)
        } else {
          failed.push({ request, error: result.error })
          
          // Check if it's a version conflict
          if (result.error.code === 'CONFLICT') {
            // Extract conflict information if available
            const conflictData = result.error.details as any
            if (conflictData?.conflict) {
              conflicts.push(conflictData.conflict)
            }
          }

          if (!options.continueOnConflict) {
            break
          }
        }
      } catch (error) {
        const repoError = RepositoryError.internal('Batch update failed', error)
        failed.push({ request, error: repoError })
        
        if (!options.continueOnConflict) {
          break
        }
      }
    }

    return success({
      successful,
      failed,
      conflicts
    })
  }

  /**
   * Get conflict history for entity
   */
  getConflictHistory(table: string, entityId: string): VersionConflict[] {
    const lockKey = `${table}:${entityId}`
    return this.conflictHistory.get(lockKey) || []
  }

  /**
   * Clear conflict history for entity
   */
  clearConflictHistory(table: string, entityId: string): void {
    const lockKey = `${table}:${entityId}`
    this.conflictHistory.delete(lockKey)
  }

  /**
   * Get active locks summary
   */
  getActiveLocks(): EntityLock[] {
    const now = new Date()
    return Array.from(this.lockRegistry.values()).filter(
      lock => lock.expiresAt > now
    )
  }

  /**
   * Perform atomic update with version checking
   */
  private async performAtomicUpdate<T extends VersionedEntity>(
    request: OptimisticUpdateRequest<T>
  ): Promise<Result<{ entity: T; currentVersion?: number }>> {
    try {
      const updateData = {
        ...request.updates,
        version: request.expectedVersion + 1,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from(request.table as any)
        .update(updateData as any)
        .eq('id', request.entityId)
        .eq('version', request.expectedVersion)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows updated - version mismatch
          const currentVersionResult = await this.getEntityVersion(
            request.table,
            request.entityId
          )
          
          return failure(RepositoryError.conflict(
            'version_mismatch',
            `Version mismatch: expected ${request.expectedVersion}`,
            {
              expectedVersion: request.expectedVersion,
              currentVersion: currentVersionResult.success 
                ? currentVersionResult.data.version 
                : -1
            }
          ), {
            currentVersion: currentVersionResult.success 
              ? currentVersionResult.data.version 
              : undefined
          })
        }
        
        return failure(RepositoryError.fromSupabaseError(error, 'atomic update'))
      }

      return success({ entity: data as T })
    } catch (error) {
      return failure(RepositoryError.internal('Atomic update failed', error))
    }
  }

  /**
   * Resolve version conflict based on strategy
   */
  private async resolveConflict<T extends VersionedEntity>(
    request: OptimisticUpdateRequest<T>,
    conflict: VersionConflict,
    options: ConflictResolutionOptions
  ): Promise<Result<{
    shouldRetry: boolean
    resolvedRequest?: OptimisticUpdateRequest<T>
  }>> {
    switch (options.strategy) {
      case 'FAIL_FAST':
        return success({ shouldRetry: false })

      case 'RETRY_AUTOMATIC':
        // Get fresh entity data and retry
        const freshDataResult = await this.getEntityVersion(
          request.table,
          request.entityId
        )
        
        if (freshDataResult.success) {
          const resolvedRequest = {
            ...request,
            expectedVersion: freshDataResult.data.version
          }
          return success({ shouldRetry: true, resolvedRequest })
        } else {
          return failure(freshDataResult.error)
        }

      case 'LAST_WRITER_WINS':
        // Override version check and apply updates
        const currentVersionResult = await this.getEntityVersion(
          request.table,
          request.entityId
        )
        
        if (currentVersionResult.success) {
          const resolvedRequest = {
            ...request,
            expectedVersion: currentVersionResult.data.version
          }
          return success({ shouldRetry: true, resolvedRequest })
        } else {
          return failure(currentVersionResult.error)
        }

      case 'MERGE_FIELDS':
        // Attempt field-level merge
        return this.performFieldMerge(request, conflict, options)

      case 'MANUAL_RESOLUTION':
        if (options.conflictHandler) {
          const handlerResult = await options.conflictHandler(conflict)
          if (handlerResult.success) {
            const resolvedRequest = {
              ...request,
              updates: { ...request.updates, ...handlerResult.data } as any,
              expectedVersion: conflict.currentVersion
            }
            return success({ shouldRetry: true, resolvedRequest })
          }
          return failure(handlerResult.error)
        }
        return success({ shouldRetry: false })

      default:
        return failure(RepositoryError.validation(
          `Unsupported conflict resolution strategy: ${options.strategy}`
        ))
    }
  }

  /**
   * Perform field-level merge for conflict resolution
   */
  private async performFieldMerge<T extends VersionedEntity>(
    request: OptimisticUpdateRequest<T>,
    conflict: VersionConflict,
    options: ConflictResolutionOptions
  ): Promise<Result<{
    shouldRetry: boolean
    resolvedRequest?: OptimisticUpdateRequest<T>
  }>> {
    try {
      // Get current entity state
      const { data, error } = await this.supabase
        .from(request.table as any)
        .select()
        .eq('id', request.entityId)
        .single()

      if (error || !data) {
        return failure(RepositoryError.fromSupabaseError(
          error || new Error('Entity not found'),
          'merge entity fetch'
        ))
      }

      const currentEntity = data as T
      const mergeRules = options.mergeRules || []
      const mergedUpdates: Partial<T> = { ...request.updates }

      // Apply merge rules
      for (const rule of mergeRules) {
        const currentValue = (currentEntity as any)[rule.field]
        const incomingValue = (request.updates as any)[rule.field]

        if (incomingValue !== undefined && currentValue !== incomingValue) {
          switch (rule.strategy) {
            case 'KEEP_CURRENT':
              delete (mergedUpdates as any)[rule.field]
              break
            case 'KEEP_INCOMING':
              // Keep the incoming value (already in mergedUpdates)
              break
            case 'MERGE_ARRAYS':
              if (Array.isArray(currentValue) && Array.isArray(incomingValue)) {
                (mergedUpdates as any)[rule.field] = [
                  ...new Set([...currentValue, ...incomingValue])
                ]
              }
              break
            case 'CUSTOM':
              if (rule.customMerger) {
                (mergedUpdates as any)[rule.field] = rule.customMerger(
                  currentValue,
                  incomingValue
                )
              }
              break
          }
        }
      }

      const resolvedRequest = {
        ...request,
        expectedVersion: currentEntity.version,
        updates: mergedUpdates
      }

      return success({ shouldRetry: true, resolvedRequest })
    } catch (error) {
      return failure(RepositoryError.internal('Field merge failed', error))
    }
  }

  /**
   * Record conflict for analytics and debugging
   */
  private recordConflict(lockKey: string, conflict: VersionConflict): void {
    const conflicts = this.conflictHistory.get(lockKey) || []
    conflicts.push(conflict)
    
    // Keep only last 100 conflicts per entity
    if (conflicts.length > 100) {
      conflicts.splice(0, conflicts.length - 100)
    }
    
    this.conflictHistory.set(lockKey, conflicts)
  }

  /**
   * Start background cleanup of expired locks
   */
  private startLockCleanup(): void {
    setInterval(() => {
      const now = new Date()
      for (const [lockKey, lock] of this.lockRegistry.entries()) {
        if (lock.expiresAt <= now) {
          this.lockRegistry.delete(lockKey)
        }
      }
    }, 5000) // Clean up every 5 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Utility functions for optimistic locking
 */
export class OptimisticLockingUtils {
  /**
   * Check if entity supports versioning
   */
  static isVersioned(entity: any): entity is VersionedEntity {
    return entity && 
           typeof entity === 'object' && 
           'id' in entity && 
           'version' in entity && 
           typeof entity.version === 'number' &&
           'updated_at' in entity &&
           typeof entity.updated_at === 'string'
  }

  /**
   * Initialize version for new entity
   */
  static initializeVersion<T extends Partial<VersionedEntity>>(entity: T): T & Pick<VersionedEntity, 'version' | 'updated_at'> {
    return {
      ...entity,
      version: 1,
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Increment version for entity update
   */
  static incrementVersion<T extends VersionedEntity>(entity: T): T {
    return {
      ...entity,
      version: entity.version + 1,
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Create update request with version checking
   */
  static createUpdateRequest<T extends VersionedEntity>(
    table: string,
    entity: T,
    updates: Partial<Omit<T, 'id' | 'version' | 'created_at'>>,
    metadata?: Record<string, unknown>
  ): OptimisticUpdateRequest<T> {
    return {
      table,
      entityId: entity.id,
      expectedVersion: entity.version,
      updates,
      metadata
    }
  }

  /**
   * Validate version consistency across entities
   */
  static validateVersionConsistency<T extends VersionedEntity>(
    entities: T[]
  ): Result<void> {
    const versionMap = new Map<string, number>()
    
    for (const entity of entities) {
      const existingVersion = versionMap.get(entity.id)
      if (existingVersion !== undefined && existingVersion !== entity.version) {
        return failure(RepositoryError.conflict(
          'version_inconsistency',
          `Entity ${entity.id} has inconsistent versions: ${existingVersion} vs ${entity.version}`,
          { entityId: entity.id, versions: [existingVersion, entity.version] }
        ))
      }
      versionMap.set(entity.id, entity.version)
    }

    return success(undefined)
  }

  /**
   * Generate merge rules for common scenarios
   */
  static createCommonMergeRules(): MergeRule[] {
    return [
      // Keep current timestamps
      {
        field: 'created_at',
        strategy: 'KEEP_CURRENT'
      },
      // Always update modified timestamp
      {
        field: 'updated_at',
        strategy: 'KEEP_INCOMING'
      },
      // Merge array fields
      {
        field: 'tags',
        strategy: 'MERGE_ARRAYS'
      },
      {
        field: 'categories',
        strategy: 'MERGE_ARRAYS'
      },
      // Custom merge for status transitions
      {
        field: 'status',
        strategy: 'CUSTOM',
        customMerger: (current: string, incoming: string) => {
          // Define valid status transitions
          const validTransitions: Record<string, string[]> = {
            'draft': ['active', 'archived'],
            'active': ['archived', 'inactive'],
            'inactive': ['active', 'archived'],
            'archived': ['active']
          }
          
          const allowed = validTransitions[current] || []
          return allowed.includes(incoming) ? incoming : current
        }
      }
    ]
  }
}

/**
 * Database schema migration utility for optimistic locking
 */
export class OptimisticLockingMigration {
  /**
   * Generate SQL to add version column to existing table
   */
  static generateVersionColumnSQL(tableName: string): string {
    return `
      -- Add version column for optimistic locking
      ALTER TABLE ${tableName} 
      ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

      -- Add updated_at trigger for automatic timestamp updates
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        NEW.version = COALESCE(OLD.version, 0) + 1;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger for the table
      DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON ${tableName};
      CREATE TRIGGER update_${tableName}_updated_at
        BEFORE UPDATE ON ${tableName}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- Create index on version for better query performance
      CREATE INDEX IF NOT EXISTS idx_${tableName}_version 
      ON ${tableName} (version);

      -- Create composite index on id and version for atomic updates
      CREATE INDEX IF NOT EXISTS idx_${tableName}_id_version 
      ON ${tableName} (id, version);
    `
  }

  /**
   * Generate SQL to add optimistic locking to multiple tables
   */
  static generateBatchVersioningSQL(tableNames: string[]): string {
    return tableNames
      .map(tableName => this.generateVersionColumnSQL(tableName))
      .join('\n\n')
  }
}