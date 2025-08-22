/**
 * Test Isolation Utilities
 * Provides comprehensive test isolation, cleanup, and environment management
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { Result, Ok, Err } from '../../lib/result'
import { DatabaseSeeder, SeedResult, IsolatedEnvironment } from './database-seeding'
import type { AppError } from '../../lib/result/types'

export interface TestIsolationConfig {
  isolationType: 'transaction' | 'schema' | 'tenant' | 'database'
  autoCleanup: boolean
  rollbackOnFailure: boolean
  preserveOnSuccess?: boolean
  timeout: number
  concurrencyLevel: 'none' | 'read' | 'write' | 'snapshot'
  snapshotData?: boolean
}

export interface TestContext {
  contextId: string
  testName: string
  isolationConfig: TestIsolationConfig
  environment?: IsolatedEnvironment
  seedData?: SeedResult
  supabaseClient: SupabaseClient<Database>
  startTime: Date
  resources: TestResource[]
  snapshots: TestSnapshot[]
  metrics: TestMetrics
}

export interface TestResource {
  type: 'table' | 'schema' | 'user' | 'policy' | 'function'
  name: string
  id: string
  cleanup: () => Promise<Result<void, AppError>>
  dependencies: string[]
  critical: boolean
}

export interface TestSnapshot {
  snapshotId: string
  timestamp: Date
  tables: string[]
  data: Record<string, any[]>
  metadata: {
    recordCounts: Record<string, number>
    checksums: Record<string, string>
    relationships: Record<string, string[]>
  }
}

export interface TestMetrics {
  setupTime: number
  executionTime: number
  cleanupTime: number
  resourceCount: number
  snapshotSize: number
  isolationOverhead: number
  concurrentTests: number
}

export interface TestHooks {
  beforeSetup?: (context: TestContext) => Promise<Result<void, AppError>>
  afterSetup?: (context: TestContext) => Promise<Result<void, AppError>>
  beforeCleanup?: (context: TestContext) => Promise<Result<void, AppError>>
  afterCleanup?: (context: TestContext) => Promise<Result<void, AppError>>
  onFailure?: (context: TestContext, error: AppError) => Promise<Result<void, AppError>>
}

export class TestIsolationManager {
  private supabase: SupabaseClient<Database>
  private seeder: DatabaseSeeder
  private activeContexts: Map<string, TestContext> = new Map()
  private globalHooks: TestHooks = {}
  private concurrencyManager: ConcurrencyManager

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
    this.seeder = new DatabaseSeeder(supabase)
    this.concurrencyManager = new ConcurrencyManager()
  }

  /**
   * Create isolated test context
   */
  async createTestContext(
    testName: string,
    config: Partial<TestIsolationConfig> = {},
    hooks: TestHooks = {}
  ): Promise<Result<TestContext, AppError>> {
    const contextId = `ctx_${testName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = new Date()

    const fullConfig: TestIsolationConfig = {
      isolationType: 'transaction',
      autoCleanup: true,
      rollbackOnFailure: true,
      preserveOnSuccess: false,
      timeout: 300000, // 5 minutes
      concurrencyLevel: 'read',
      snapshotData: false,
      ...config
    }

    try {
      // Check concurrency limits
      const concurrencyCheck = await this.concurrencyManager.acquireSlot(
        contextId, 
        fullConfig.concurrencyLevel
      )
      
      if (!concurrencyCheck.success) {
        return concurrencyCheck
      }

      const context: TestContext = {
        contextId,
        testName,
        isolationConfig: fullConfig,
        supabaseClient: this.supabase,
        startTime,
        resources: [],
        snapshots: [],
        metrics: {
          setupTime: 0,
          executionTime: 0,
          cleanupTime: 0,
          resourceCount: 0,
          snapshotSize: 0,
          isolationOverhead: 0,
          concurrentTests: this.concurrencyManager.getActiveCount()
        }
      }

      this.activeContexts.set(contextId, context)

      // Execute before setup hooks
      if (this.globalHooks.beforeSetup) {
        const hookResult = await this.globalHooks.beforeSetup(context)
        if (!hookResult.success) {
          await this.cleanupContext(contextId)
          return hookResult
        }
      }
      
      if (hooks.beforeSetup) {
        const hookResult = await hooks.beforeSetup(context)
        if (!hookResult.success) {
          await this.cleanupContext(contextId)
          return hookResult
        }
      }

      // Set up isolation based on type
      const isolationResult = await this.setupIsolation(context)
      if (!isolationResult.success) {
        await this.cleanupContext(contextId)
        return isolationResult
      }

      // Take initial snapshot if requested
      if (fullConfig.snapshotData) {
        const snapshotResult = await this.createSnapshot(context, 'initial')
        if (!snapshotResult.success) {
          console.warn('Failed to create initial snapshot:', snapshotResult.error)
        }
      }

      // Execute after setup hooks
      if (this.globalHooks.afterSetup) {
        const hookResult = await this.globalHooks.afterSetup(context)
        if (!hookResult.success) {
          await this.cleanupContext(contextId)
          return hookResult
        }
      }
      
      if (hooks.afterSetup) {
        const hookResult = await hooks.afterSetup(context)
        if (!hookResult.success) {
          await this.cleanupContext(contextId)
          return hookResult
        }
      }

      context.metrics.setupTime = Date.now() - startTime.getTime()

      return Ok(context)

    } catch (error) {
      await this.cleanupContext(contextId)
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Failed to create test context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Execute test with automatic cleanup
   */
  async withIsolatedTest<T>(
    testName: string,
    testFunction: (context: TestContext) => Promise<Result<T, AppError>>,
    config: Partial<TestIsolationConfig> = {},
    hooks: TestHooks = {}
  ): Promise<Result<T, AppError>> {
    const contextResult = await this.createTestContext(testName, config, hooks)
    if (!contextResult.success) {
      return contextResult
    }

    const context = contextResult.data
    const executionStart = Date.now()

    try {
      // Execute test function
      const testResult = await this.executeWithTimeout(
        () => testFunction(context),
        config.timeout || 300000
      )

      context.metrics.executionTime = Date.now() - executionStart

      // Handle test result
      if (!testResult.success) {
        if (config.rollbackOnFailure !== false) {
          // Execute failure hooks
          if (this.globalHooks.onFailure) {
            await this.globalHooks.onFailure(context, testResult.error)
          }
          if (hooks.onFailure) {
            await hooks.onFailure(context, testResult.error)
          }

          // Create failure snapshot
          if (config.snapshotData) {
            await this.createSnapshot(context, 'failure')
          }

          // Rollback changes
          await this.rollbackContext(context)
        }
      } else {
        // Create success snapshot
        if (config.snapshotData) {
          await this.createSnapshot(context, 'success')
        }
      }

      // Cleanup unless preserving successful test data
      if (config.autoCleanup !== false) {
        if (!testResult.success || config.preserveOnSuccess !== true) {
          await this.cleanupContext(context.contextId)
        }
      }

      return testResult

    } catch (error) {
      context.metrics.executionTime = Date.now() - executionStart

      const appError: AppError = {
        code: 'INTERNAL_ERROR' as any,
        message: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      }

      // Execute failure hooks
      if (this.globalHooks.onFailure) {
        await this.globalHooks.onFailure(context, appError)
      }
      if (hooks.onFailure) {
        await hooks.onFailure(context, appError)
      }

      // Always cleanup on exception
      await this.cleanupContext(context.contextId)

      return Err(appError)
    }
  }

  /**
   * Get test context
   */
  getContext(contextId: string): TestContext | undefined {
    return this.activeContexts.get(contextId)
  }

  /**
   * List active contexts
   */
  getActiveContexts(): TestContext[] {
    return Array.from(this.activeContexts.values())
  }

  /**
   * Clean up specific context
   */
  async cleanupContext(contextId: string): Promise<Result<void, AppError>> {
    const context = this.activeContexts.get(contextId)
    if (!context) {
      return Ok(undefined)
    }

    const cleanupStart = Date.now()

    try {
      // Execute before cleanup hooks
      if (this.globalHooks.beforeCleanup) {
        await this.globalHooks.beforeCleanup(context)
      }

      // Clean up resources in reverse order
      const sortedResources = [...context.resources]
        .sort((a, b) => {
          // Critical resources first, then by dependencies
          if (a.critical !== b.critical) {
            return a.critical ? 1 : -1
          }
          return b.dependencies.length - a.dependencies.length
        })

      const cleanupResults: Array<{ resource: TestResource; result: Result<void, AppError> }> = []

      for (const resource of sortedResources) {
        try {
          const result = await resource.cleanup()
          cleanupResults.push({ resource, result })
          
          if (!result.success) {
            console.warn(`Failed to cleanup resource ${resource.name}:`, result.error)
          }
        } catch (error) {
          console.error(`Exception during resource cleanup ${resource.name}:`, error)
        }
      }

      // Clean up isolation environment
      if (context.environment) {
        await context.environment.cleanup()
      }

      // Release concurrency slot
      await this.concurrencyManager.releaseSlot(contextId)

      // Execute after cleanup hooks
      if (this.globalHooks.afterCleanup) {
        await this.globalHooks.afterCleanup(context)
      }

      context.metrics.cleanupTime = Date.now() - cleanupStart
      this.activeContexts.delete(contextId)

      // Check for cleanup failures
      const failedCleanups = cleanupResults.filter(r => !r.result.success)
      if (failedCleanups.length > 0) {
        console.warn(`${failedCleanups.length} resources failed to cleanup properly`)
      }

      return Ok(undefined)

    } catch (error) {
      context.metrics.cleanupTime = Date.now() - cleanupStart
      
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Context cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Clean up all active contexts
   */
  async cleanupAll(): Promise<Result<void, AppError>> {
    const contextIds = Array.from(this.activeContexts.keys())
    const results = await Promise.allSettled(
      contextIds.map(id => this.cleanupContext(id))
    )

    const failures = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason)

    if (failures.length > 0) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Failed to cleanup ${failures.length} contexts`,
        timestamp: new Date(),
        context: { failures }
      })
    }

    return Ok(undefined)
  }

  /**
   * Set global hooks
   */
  setGlobalHooks(hooks: TestHooks): void {
    this.globalHooks = { ...this.globalHooks, ...hooks }
  }

  /**
   * Create data snapshot
   */
  async createSnapshot(context: TestContext, label: string): Promise<Result<TestSnapshot, AppError>> {
    try {
      const snapshotId = `snapshot_${context.contextId}_${label}_${Date.now()}`
      const tables = ['organizations', 'users', 'vaults', 'assets', 'meetings', 'activities']
      const data: Record<string, any[]> = {}
      const recordCounts: Record<string, number> = {}
      const checksums: Record<string, string> = {}

      for (const table of tables) {
        const { data: tableData, error, count } = await this.supabase
          .from(table as any)
          .select('*', { count: 'exact' })

        if (!error && tableData) {
          data[table] = tableData
          recordCounts[table] = count || 0
          checksums[table] = this.calculateChecksum(tableData)
        }
      }

      const snapshot: TestSnapshot = {
        snapshotId,
        timestamp: new Date(),
        tables,
        data,
        metadata: {
          recordCounts,
          checksums,
          relationships: this.analyzeRelationships(data)
        }
      }

      context.snapshots.push(snapshot)
      context.metrics.snapshotSize += JSON.stringify(data).length

      return Ok(snapshot)

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Snapshot creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  // Private helper methods

  private async setupIsolation(context: TestContext): Promise<Result<void, AppError>> {
    switch (context.isolationConfig.isolationType) {
      case 'transaction':
        return this.setupTransactionIsolation(context)
      
      case 'schema':
        return this.setupSchemaIsolation(context)
      
      case 'tenant':
        return this.setupTenantIsolation(context)
      
      case 'database':
        return this.setupDatabaseIsolation(context)
      
      default:
        return Err({
          code: 'VALIDATION_ERROR' as any,
          message: `Unsupported isolation type: ${context.isolationConfig.isolationType}`,
          timestamp: new Date()
        })
    }
  }

  private async setupTransactionIsolation(context: TestContext): Promise<Result<void, AppError>> {
    try {
      // Begin transaction with appropriate isolation level
      const { error } = await this.supabase.rpc('begin_test_transaction', {
        context_id: context.contextId,
        isolation_level: this.mapConcurrencyLevel(context.isolationConfig.concurrencyLevel)
      })

      if (error) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to setup transaction isolation: ${error.message}`,
          timestamp: new Date(),
          cause: error
        })
      }

      // Register cleanup resource
      context.resources.push({
        type: 'table',
        name: 'transaction',
        id: context.contextId,
        cleanup: async () => this.rollbackTransaction(context.contextId),
        dependencies: [],
        critical: true
      })

      return Ok(undefined)

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Transaction isolation setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async setupSchemaIsolation(context: TestContext): Promise<Result<void, AppError>> {
    try {
      const envResult = await this.seeder.createIsolatedEnvironment(context.testName)
      if (!envResult.success) {
        return envResult
      }

      context.environment = envResult.data
      context.supabaseClient = envResult.data.supabaseClient

      context.resources.push({
        type: 'schema',
        name: context.environment.schemaName,
        id: context.environment.environmentId,
        cleanup: context.environment.cleanup,
        dependencies: [],
        critical: true
      })

      return Ok(undefined)

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Schema isolation setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async setupTenantIsolation(context: TestContext): Promise<Result<void, AppError>> {
    // Tenant-based isolation using RLS policies
    try {
      const tenantId = `tenant_${context.contextId}`

      const { error } = await this.supabase.rpc('setup_tenant_isolation', {
        tenant_id: tenantId,
        context_id: context.contextId
      })

      if (error) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Failed to setup tenant isolation: ${error.message}`,
          timestamp: new Date(),
          cause: error
        })
      }

      context.resources.push({
        type: 'policy',
        name: 'tenant_isolation',
        id: tenantId,
        cleanup: async () => this.cleanupTenantIsolation(tenantId),
        dependencies: [],
        critical: true
      })

      return Ok(undefined)

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Tenant isolation setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async setupDatabaseIsolation(context: TestContext): Promise<Result<void, AppError>> {
    // Full database isolation - typically for load testing or major integration tests
    // This would involve creating a separate database instance
    return Err({
      code: 'NOT_IMPLEMENTED' as any,
      message: 'Database-level isolation not implemented - use schema isolation instead',
      timestamp: new Date()
    })
  }

  private async rollbackContext(context: TestContext): Promise<Result<void, AppError>> {
    try {
      switch (context.isolationConfig.isolationType) {
        case 'transaction':
          return this.rollbackTransaction(context.contextId)
        
        case 'schema':
        case 'tenant':
          // Schema and tenant isolation use cleanup rather than rollback
          return Ok(undefined)
        
        default:
          return Ok(undefined)
      }
    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Context rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async rollbackTransaction(contextId: string): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.supabase.rpc('rollback_test_transaction', {
        context_id: contextId
      })

      if (error) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Transaction rollback failed: ${error.message}`,
          timestamp: new Date(),
          cause: error
        })
      }

      return Ok(undefined)

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Transaction rollback error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async cleanupTenantIsolation(tenantId: string): Promise<Result<void, AppError>> {
    try {
      const { error } = await this.supabase.rpc('cleanup_tenant_isolation', {
        tenant_id: tenantId
      })

      if (error) {
        return Err({
          code: 'DATABASE_ERROR' as any,
          message: `Tenant cleanup failed: ${error.message}`,
          timestamp: new Date(),
          cause: error
        })
      }

      return Ok(undefined)

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Tenant cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<Result<T, AppError>>,
    timeout: number
  ): Promise<Result<T, AppError>> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(Err({
          code: 'TIMEOUT' as any,
          message: `Test execution timed out after ${timeout}ms`,
          timestamp: new Date()
        }))
      }, timeout)

      operation()
        .then((result) => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timer)
          resolve(Err({
            code: 'INTERNAL_ERROR' as any,
            message: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date(),
            cause: error instanceof Error ? error : undefined
          }))
        })
    })
  }

  private mapConcurrencyLevel(level: TestIsolationConfig['concurrencyLevel']): string {
    const mapping = {
      'none': 'SERIALIZABLE',
      'read': 'REPEATABLE READ',
      'write': 'READ COMMITTED',
      'snapshot': 'READ UNCOMMITTED'
    }
    return mapping[level] || 'READ COMMITTED'
  }

  private calculateChecksum(data: any[]): string {
    // Simple checksum calculation - in production use crypto hashing
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  private analyzeRelationships(data: Record<string, any[]>): Record<string, string[]> {
    const relationships: Record<string, string[]> = {}
    
    // Analyze foreign key relationships
    if (data.organizations && data.users) {
      relationships.organizationUsers = data.users
        .filter(u => u.organization_id)
        .map(u => `${u.organization_id}-${u.id}`)
    }
    
    if (data.vaults && data.assets) {
      relationships.vaultAssets = data.assets
        .filter(a => a.vault_ids?.length > 0)
        .flatMap(a => a.vault_ids.map((vId: string) => `${vId}-${a.id}`))
    }

    return relationships
  }
}

class ConcurrencyManager {
  private activeSlots: Map<string, { level: string; timestamp: Date }> = new Map()
  private readonly maxConcurrentTests = 10
  private readonly maxSerializableTests = 1

  async acquireSlot(
    contextId: string, 
    level: TestIsolationConfig['concurrencyLevel']
  ): Promise<Result<void, AppError>> {
    const activeCount = this.activeSlots.size
    const serializableCount = Array.from(this.activeSlots.values())
      .filter(slot => slot.level === 'SERIALIZABLE').length

    // Check general concurrency limit
    if (activeCount >= this.maxConcurrentTests) {
      return Err({
        code: 'RESOURCE_EXHAUSTED' as any,
        message: `Maximum concurrent tests reached (${this.maxConcurrentTests})`,
        timestamp: new Date(),
        context: { activeCount, requestedLevel: level }
      })
    }

    // Check serializable test limit
    if (level === 'none' && serializableCount >= this.maxSerializableTests) {
      return Err({
        code: 'RESOURCE_EXHAUSTED' as any,
        message: `Maximum serializable tests reached (${this.maxSerializableTests})`,
        timestamp: new Date(),
        context: { serializableCount, activeCount }
      })
    }

    this.activeSlots.set(contextId, {
      level: level,
      timestamp: new Date()
    })

    return Ok(undefined)
  }

  async releaseSlot(contextId: string): Promise<void> {
    this.activeSlots.delete(contextId)
  }

  getActiveCount(): number {
    return this.activeSlots.size
  }

  getActiveSlots(): Array<{ contextId: string; level: string; timestamp: Date }> {
    return Array.from(this.activeSlots.entries()).map(([contextId, info]) => ({
      contextId,
      ...info
    }))
  }
}

// Export singleton and factory functions
export function createTestIsolationManager(supabase: SupabaseClient<Database>): TestIsolationManager {
  return new TestIsolationManager(supabase)
}

// Convenience functions for common isolation patterns
export async function withTransactionIsolation<T>(
  supabase: SupabaseClient<Database>,
  testName: string,
  testFunction: (context: TestContext) => Promise<Result<T, AppError>>
): Promise<Result<T, AppError>> {
  const manager = createTestIsolationManager(supabase)
  return manager.withIsolatedTest(testName, testFunction, {
    isolationType: 'transaction',
    concurrencyLevel: 'read',
    autoCleanup: true,
    rollbackOnFailure: true
  })
}

export async function withSchemaIsolation<T>(
  supabase: SupabaseClient<Database>,
  testName: string,
  testFunction: (context: TestContext) => Promise<Result<T, AppError>>
): Promise<Result<T, AppError>> {
  const manager = createTestIsolationManager(supabase)
  return manager.withIsolatedTest(testName, testFunction, {
    isolationType: 'schema',
    concurrencyLevel: 'write',
    autoCleanup: true,
    snapshotData: true
  })
}