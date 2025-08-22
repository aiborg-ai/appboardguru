/**
 * Enhanced Test Isolation System
 * Provides comprehensive test isolation with automatic cleanup and resource management
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { Result, success, failure } from '../../lib/result'
import { TransactionCoordinator } from '../../lib/repositories/transaction-coordinator'
import { EnhancedDatabaseSeeder, SeededData } from './enhanced-database-seeding'

export interface IsolationOptions {
  strategy: 'transaction' | 'schema' | 'database' | 'namespace'
  autoCleanup: boolean
  timeoutMs: number
  retainOnFailure: boolean
  parallelSafe: boolean
  resourceLimits: {
    maxMemoryMB?: number
    maxExecutionTimeMs?: number
    maxConcurrentOperations?: number
  }
}

export interface TestIsolationContext {
  isolationId: string
  strategy: IsolationOptions['strategy']
  createdAt: Date
  resources: IsolatedResource[]
  transactions: string[]
  schemas: string[]
  namespaces: string[]
  seededData?: SeededData
  metrics: IsolationMetrics
  cleanup: CleanupRegistry
}

export interface IsolatedResource {
  type: 'table' | 'schema' | 'transaction' | 'connection' | 'file' | 'process'
  id: string
  name: string
  metadata: Record<string, any>
  cleanup: () => Promise<void>
  createdAt: Date
  lastAccessed: Date
}

export interface IsolationMetrics {
  resourceCount: number
  memoryUsage: NodeJS.MemoryUsage
  transactionCount: number
  operationCount: number
  errorCount: number
  cleanupDuration: number
  isolationOverhead: number
}

export interface CleanupRegistry {
  functions: Array<{
    id: string
    name: string
    priority: number
    fn: () => Promise<void>
    timeout: number
  }>
  resources: Map<string, IsolatedResource>
  order: string[] // Resource cleanup order
}

export class TestIsolationManager {
  private supabase: SupabaseClient<Database>
  private transactionCoordinator?: TransactionCoordinator
  private seeder: EnhancedDatabaseSeeder
  private activeContexts: Map<string, TestIsolationContext> = new Map()
  private globalCleanupScheduled = false

  constructor(
    supabase: SupabaseClient<Database>,
    transactionCoordinator?: TransactionCoordinator
  ) {
    this.supabase = supabase
    this.transactionCoordinator = transactionCoordinator
    this.seeder = new EnhancedDatabaseSeeder(supabase, transactionCoordinator)
    
    this.setupGlobalCleanup()
  }

  /**
   * Create isolated test environment
   */
  async createIsolation(options: Partial<IsolationOptions> = {}): Promise<Result<TestIsolationContext>> {
    const isolationId = this.generateIsolationId()
    const startTime = Date.now()

    const defaultOptions: IsolationOptions = {
      strategy: 'transaction',
      autoCleanup: true,
      timeoutMs: 300000, // 5 minutes
      retainOnFailure: false,
      parallelSafe: true,
      resourceLimits: {
        maxMemoryMB: 512,
        maxExecutionTimeMs: 300000,
        maxConcurrentOperations: 10
      },
      ...options
    }

    try {
      const context: TestIsolationContext = {
        isolationId,
        strategy: defaultOptions.strategy,
        createdAt: new Date(),
        resources: [],
        transactions: [],
        schemas: [],
        namespaces: [],
        metrics: {
          resourceCount: 0,
          memoryUsage: process.memoryUsage(),
          transactionCount: 0,
          operationCount: 0,
          errorCount: 0,
          cleanupDuration: 0,
          isolationOverhead: 0
        },
        cleanup: {
          functions: [],
          resources: new Map(),
          order: []
        }
      }

      // Apply isolation strategy
      await this.applyIsolationStrategy(context, defaultOptions)

      // Register context
      this.activeContexts.set(isolationId, context)

      // Set up auto-cleanup timeout
      if (defaultOptions.autoCleanup) {
        setTimeout(async () => {
          if (this.activeContexts.has(isolationId)) {
            await this.cleanup(isolationId)
          }
        }, defaultOptions.timeoutMs)
      }

      context.metrics.isolationOverhead = Date.now() - startTime
      
      return success(context)

    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Failed to create isolation'))
    }
  }

  /**
   * Apply specific isolation strategy
   */
  private async applyIsolationStrategy(
    context: TestIsolationContext,
    options: IsolationOptions
  ): Promise<void> {
    switch (options.strategy) {
      case 'transaction':
        await this.setupTransactionIsolation(context, options)
        break
      case 'schema':
        await this.setupSchemaIsolation(context, options)
        break
      case 'database':
        await this.setupDatabaseIsolation(context, options)
        break
      case 'namespace':
        await this.setupNamespaceIsolation(context, options)
        break
      default:
        throw new Error(`Unknown isolation strategy: ${options.strategy}`)
    }
  }

  /**
   * Set up transaction-based isolation
   */
  private async setupTransactionIsolation(
    context: TestIsolationContext,
    options: IsolationOptions
  ): Promise<void> {
    if (!this.transactionCoordinator) {
      throw new Error('Transaction coordinator required for transaction isolation')
    }

    const beginResult = await this.transactionCoordinator.begin({
      mode: 'SINGLE_DOMAIN',
      timeout: options.timeoutMs,
      enableOptimisticLocking: true,
      enableMetrics: true
    })

    if (!beginResult.success) {
      throw new Error(`Failed to begin transaction: ${beginResult.error.message}`)
    }

    const transactionId = beginResult.data.id
    context.transactions.push(transactionId)
    context.metrics.transactionCount++

    // Register transaction cleanup
    this.registerCleanup(context, {
      id: `transaction-${transactionId}`,
      name: 'Rollback Transaction',
      priority: 1000, // High priority
      fn: async () => {
        await this.transactionCoordinator!.rollback(transactionId, 'Test cleanup')
      },
      timeout: 10000
    })

    // Create isolated transaction resource
    const resource: IsolatedResource = {
      type: 'transaction',
      id: transactionId,
      name: `Transaction ${transactionId}`,
      metadata: { isolationStrategy: 'transaction' },
      cleanup: async () => {
        await this.transactionCoordinator!.rollback(transactionId, 'Resource cleanup')
      },
      createdAt: new Date(),
      lastAccessed: new Date()
    }

    this.addResource(context, resource)
  }

  /**
   * Set up schema-based isolation
   */
  private async setupSchemaIsolation(
    context: TestIsolationContext,
    options: IsolationOptions
  ): Promise<void> {
    const schemaName = `test_${context.isolationId.replace(/-/g, '_')}`
    
    // Create isolated schema
    const { error } = await this.supabase.rpc('create_test_schema', {
      schema_name: schemaName
    })

    if (error) {
      throw new Error(`Failed to create schema ${schemaName}: ${error.message}`)
    }

    context.schemas.push(schemaName)

    // Register schema cleanup
    this.registerCleanup(context, {
      id: `schema-${schemaName}`,
      name: 'Drop Schema',
      priority: 900,
      fn: async () => {
        await this.supabase.rpc('drop_test_schema', {
          schema_name: schemaName
        })
      },
      timeout: 30000
    })

    // Create schema resource
    const resource: IsolatedResource = {
      type: 'schema',
      id: schemaName,
      name: `Schema ${schemaName}`,
      metadata: { 
        isolationStrategy: 'schema',
        searchPath: schemaName
      },
      cleanup: async () => {
        await this.supabase.rpc('drop_test_schema', {
          schema_name: schemaName
        })
      },
      createdAt: new Date(),
      lastAccessed: new Date()
    }

    this.addResource(context, resource)
  }

  /**
   * Set up database-based isolation (for integration tests)
   */
  private async setupDatabaseIsolation(
    context: TestIsolationContext,
    options: IsolationOptions
  ): Promise<void> {
    // This would typically involve creating a separate database instance
    // For now, we'll use schema isolation as a fallback
    await this.setupSchemaIsolation(context, options)
  }

  /**
   * Set up namespace-based isolation
   */
  private async setupNamespaceIsolation(
    context: TestIsolationContext,
    options: IsolationOptions
  ): Promise<void> {
    const namespace = `ns_${context.isolationId}`
    context.namespaces.push(namespace)

    // Namespace isolation uses prefixed table names
    const resource: IsolatedResource = {
      type: 'table',
      id: namespace,
      name: `Namespace ${namespace}`,
      metadata: { 
        isolationStrategy: 'namespace',
        prefix: namespace
      },
      cleanup: async () => {
        // Clean up all tables with this namespace prefix
        const tables = ['organizations', 'users', 'vaults', 'assets', 'meetings']
        for (const table of tables) {
          try {
            await this.supabase
              .from(table as any)
              .delete()
              .like('id', `${namespace}_%`)
          } catch (error) {
            console.warn(`Failed to cleanup namespace table ${table}:`, error)
          }
        }
      },
      createdAt: new Date(),
      lastAccessed: new Date()
    }

    this.addResource(context, resource)
  }

  /**
   * Seed data within isolated environment
   */
  async seedInIsolation(
    isolationId: string,
    seedingOptions: Parameters<EnhancedDatabaseSeeder['seedDatabase']>[0] = {}
  ): Promise<Result<SeededData>> {
    const context = this.activeContexts.get(isolationId)
    if (!context) {
      return failure(new Error(`Isolation context not found: ${isolationId}`))
    }

    try {
      // Adjust seeding options based on isolation strategy
      const adjustedOptions = {
        ...seedingOptions,
        isolation: context.strategy === 'transaction' ? 'transaction' : 'none'
      }

      const result = await this.seeder.seedDatabase(adjustedOptions)
      
      if (result.success) {
        context.seededData = result.data
        
        // Register seeded data cleanup
        this.registerCleanup(context, {
          id: `seeded-data-${isolationId}`,
          name: 'Cleanup Seeded Data',
          priority: 500,
          fn: async () => {
            await this.seeder.cleanup(result.data.metadata.seedId)
          },
          timeout: 60000
        })
      }

      return result

    } catch (error) {
      context.metrics.errorCount++
      return failure(error instanceof Error ? error : new Error('Seeding failed'))
    }
  }

  /**
   * Execute operation within isolated context
   */
  async executeInIsolation<T>(
    isolationId: string,
    operation: (context: TestIsolationContext) => Promise<T>,
    options: {
      timeout?: number
      retryCount?: number
      rollbackOnError?: boolean
    } = {}
  ): Promise<Result<T>> {
    const context = this.activeContexts.get(isolationId)
    if (!context) {
      return failure(new Error(`Isolation context not found: ${isolationId}`))
    }

    const startTime = Date.now()
    const timeout = options.timeout || 30000
    const retryCount = options.retryCount || 0

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        // Execute with timeout
        const result = await Promise.race([
          operation(context),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          })
        ])

        context.metrics.operationCount++
        context.metrics.isolationOverhead += Date.now() - startTime
        
        return success(result)

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        context.metrics.errorCount++

        if (attempt < retryCount) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    if (options.rollbackOnError && context.transactions.length > 0) {
      // Rollback transactions on error
      for (const transactionId of context.transactions) {
        try {
          await this.transactionCoordinator?.rollback(transactionId, 'Operation failed')
        } catch (rollbackError) {
          console.warn('Failed to rollback transaction:', rollbackError)
        }
      }
    }

    return failure(lastError || new Error('Operation failed after retries'))
  }

  /**
   * Register cleanup function
   */
  private registerCleanup(
    context: TestIsolationContext,
    cleanupFn: CleanupRegistry['functions'][0]
  ): void {
    context.cleanup.functions.push(cleanupFn)
    context.cleanup.functions.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Add resource to context
   */
  private addResource(context: TestIsolationContext, resource: IsolatedResource): void {
    context.resources.push(resource)
    context.cleanup.resources.set(resource.id, resource)
    context.cleanup.order.unshift(resource.id) // LIFO order
    context.metrics.resourceCount++
  }

  /**
   * Clean up isolated environment
   */
  async cleanup(isolationId: string): Promise<Result<void>> {
    const context = this.activeContexts.get(isolationId)
    if (!context) {
      return success(undefined) // Already cleaned up
    }

    const startTime = Date.now()
    const errors: Error[] = []

    try {
      // Execute cleanup functions in priority order
      for (const cleanupFn of context.cleanup.functions) {
        try {
          await Promise.race([
            cleanupFn.fn(),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Cleanup timeout')), cleanupFn.timeout)
            })
          ])
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error('Cleanup failed'))
          console.warn(`Cleanup function ${cleanupFn.name} failed:`, error)
        }
      }

      // Clean up resources in LIFO order
      for (const resourceId of context.cleanup.order) {
        const resource = context.cleanup.resources.get(resourceId)
        if (resource) {
          try {
            await resource.cleanup()
          } catch (error) {
            errors.push(error instanceof Error ? error : new Error('Resource cleanup failed'))
            console.warn(`Resource cleanup ${resource.name} failed:`, error)
          }
        }
      }

      context.metrics.cleanupDuration = Date.now() - startTime
      this.activeContexts.delete(isolationId)

      if (errors.length > 0) {
        return failure(new Error(`Cleanup completed with ${errors.length} errors`))
      }

      return success(undefined)

    } catch (error) {
      return failure(error instanceof Error ? error : new Error('Cleanup failed'))
    }
  }

  /**
   * Clean up all active isolations
   */
  async cleanupAll(): Promise<Result<void>> {
    const errors: Error[] = []

    for (const isolationId of this.activeContexts.keys()) {
      const result = await this.cleanup(isolationId)
      if (!result.success) {
        errors.push(result.error)
      }
    }

    if (errors.length > 0) {
      return failure(new Error(`Global cleanup completed with ${errors.length} errors`))
    }

    return success(undefined)
  }

  /**
   * Get isolation statistics
   */
  getIsolationStatistics(isolationId?: string): TestIsolationContext[] {
    if (isolationId) {
      const context = this.activeContexts.get(isolationId)
      return context ? [context] : []
    }
    return Array.from(this.activeContexts.values())
  }

  /**
   * Check resource limits
   */
  checkResourceLimits(context: TestIsolationContext, limits: IsolationOptions['resourceLimits']): boolean {
    if (limits.maxMemoryMB) {
      const memoryMB = context.metrics.memoryUsage.heapUsed / (1024 * 1024)
      if (memoryMB > limits.maxMemoryMB) {
        return false
      }
    }

    if (limits.maxConcurrentOperations) {
      if (context.metrics.operationCount > limits.maxConcurrentOperations) {
        return false
      }
    }

    return true
  }

  /**
   * Set up global cleanup on process exit
   */
  private setupGlobalCleanup(): void {
    if (this.globalCleanupScheduled) return

    const cleanup = async () => {
      console.log('Performing global test isolation cleanup...')
      await this.cleanupAll()
    }

    process.on('exit', cleanup)
    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
    process.on('uncaughtException', cleanup)
    process.on('unhandledRejection', cleanup)

    this.globalCleanupScheduled = true
  }

  /**
   * Utility methods
   */
  private generateIsolationId(): string {
    return `isolation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const testIsolationManager = new TestIsolationManager(
  // Will be initialized with actual client in test setup
  {} as SupabaseClient<Database>
)

// Export factory function
export function createTestIsolationManager(
  supabase: SupabaseClient<Database>,
  transactionCoordinator?: TransactionCoordinator
): TestIsolationManager {
  return new TestIsolationManager(supabase, transactionCoordinator)
}

// Export convenience functions for common patterns
export async function withIsolation<T>(
  operation: (context: TestIsolationContext) => Promise<T>,
  options: Partial<IsolationOptions> = {}
): Promise<Result<T>> {
  const manager = testIsolationManager
  
  const isolationResult = await manager.createIsolation(options)
  if (!isolationResult.success) {
    return failure(isolationResult.error)
  }

  const context = isolationResult.data

  try {
    const result = await manager.executeInIsolation(
      context.isolationId,
      operation,
      { rollbackOnError: true }
    )

    return result
  } finally {
    await manager.cleanup(context.isolationId)
  }
}

export async function withSeededIsolation<T>(
  operation: (context: TestIsolationContext, data: SeededData) => Promise<T>,
  isolationOptions: Partial<IsolationOptions> = {},
  seedingOptions: Parameters<EnhancedDatabaseSeeder['seedDatabase']>[0] = {}
): Promise<Result<T>> {
  const manager = testIsolationManager
  
  const isolationResult = await manager.createIsolation(isolationOptions)
  if (!isolationResult.success) {
    return failure(isolationResult.error)
  }

  const context = isolationResult.data

  try {
    const seedResult = await manager.seedInIsolation(context.isolationId, seedingOptions)
    if (!seedResult.success) {
      return failure(seedResult.error)
    }

    const result = await manager.executeInIsolation(
      context.isolationId,
      async (ctx) => operation(ctx, seedResult.data),
      { rollbackOnError: true }
    )

    return result
  } finally {
    await manager.cleanup(context.isolationId)
  }
}