/**
 * Transaction Coordinator with Advanced ACID Support
 * 
 * This module provides comprehensive transaction management for the repository layer,
 * including optimistic locking, distributed transactions, compensation patterns,
 * and sophisticated rollback strategies.
 */

import { EventEmitter } from 'events'
import { Result, success, failure, RepositoryError } from './result'
import { SagaOrchestrator, TransactionManager } from './transaction-manager'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// Enhanced transaction types
export type TransactionIsolationLevel = 
  | 'READ_UNCOMMITTED' 
  | 'READ_COMMITTED' 
  | 'REPEATABLE_READ' 
  | 'SERIALIZABLE'

export type TransactionMode = 
  | 'SINGLE_DOMAIN'     // Operations within one domain/aggregate
  | 'CROSS_DOMAIN'      // Operations across multiple domains 
  | 'DISTRIBUTED'       // Operations across multiple services/databases
  | 'COMPENSATING'      // Saga-based compensation pattern

export interface TransactionOptions {
  mode: TransactionMode
  isolationLevel?: TransactionIsolationLevel
  timeout?: number
  retries?: number
  enableOptimisticLocking?: boolean
  enableDeadlockDetection?: boolean
  enableMetrics?: boolean
  metadata?: Record<string, unknown>
}

export interface TransactionContext {
  id: string
  mode: TransactionMode
  isolationLevel: TransactionIsolationLevel
  startTime: Date
  endTime?: Date
  timeout?: number
  userId?: string
  organizationId?: string
  metadata?: Record<string, unknown>
  operations: TransactionOperation[]
  compensations: CompensationAction[]
  locks: OptimisticLock[]
  status: TransactionStatus
}

export type TransactionStatus = 
  | 'PENDING' 
  | 'RUNNING' 
  | 'COMMITTING' 
  | 'COMMITTED' 
  | 'ABORTING' 
  | 'ABORTED' 
  | 'FAILED' 
  | 'COMPENSATING' 
  | 'COMPENSATED'

export interface TransactionOperation {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ'
  table: string
  entityId?: string
  data?: any
  originalData?: any
  timestamp: Date
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'COMPENSATED'
  result?: any
  error?: RepositoryError
}

export interface CompensationAction {
  id: string
  operationId: string
  action: () => Promise<Result<void>>
  description: string
  priority: number // Higher priority executes first during compensation
}

export interface OptimisticLock {
  table: string
  entityId: string
  expectedVersion: number
  currentVersion?: number
  lockedAt: Date
  expiresAt?: Date
}

export interface DeadlockInfo {
  transactionIds: string[]
  resources: Array<{
    table: string
    entityId: string
    lockType: string
  }>
  detectedAt: Date
  resolution: 'ABORT_YOUNGEST' | 'ABORT_OLDEST' | 'ABORT_RANDOM'
}

export interface TransactionMetrics {
  transactionId: string
  duration: number
  operationCount: number
  retryCount: number
  lockWaitTime: number
  deadlockCount: number
  compensationCount: number
  throughput: number
  errorRate: number
}

/**
 * Advanced Transaction Coordinator with ACID support
 */
export class TransactionCoordinator extends EventEmitter {
  private activeTransactions: Map<string, TransactionContext> = new Map()
  private lockRegistry: Map<string, OptimisticLock[]> = new Map()
  private deadlockDetector: DeadlockDetector
  private metricsCollector: TransactionMetricsCollector
  private sagaOrchestrator: SagaOrchestrator
  private retryPolicy: RetryPolicy

  constructor(
    private supabase: SupabaseClient<Database>,
    private options: {
      maxConcurrentTransactions?: number
      defaultTimeout?: number
      enableDeadlockDetection?: boolean
      enableMetrics?: boolean
    } = {}
  ) {
    super()
    
    this.deadlockDetector = new DeadlockDetector(this.lockRegistry)
    this.metricsCollector = new TransactionMetricsCollector()
    this.sagaOrchestrator = new SagaOrchestrator(this.supabase)
    this.retryPolicy = new RetryPolicy()
    
    this.setupEventHandlers()
    
    if (this.options.enableDeadlockDetection) {
      this.startDeadlockDetection()
    }
  }

  /**
   * Begin a new transaction with specified options
   */
  async begin(options: TransactionOptions): Promise<Result<TransactionContext>> {
    const transactionId = this.generateTransactionId()
    
    // Check concurrent transaction limit
    if (this.options.maxConcurrentTransactions && 
        this.activeTransactions.size >= this.options.maxConcurrentTransactions) {
      return failure(RepositoryError.quotaExceeded(
        'concurrent_transactions',
        this.options.maxConcurrentTransactions,
        this.activeTransactions.size
      ))
    }

    const context: TransactionContext = {
      id: transactionId,
      mode: options.mode,
      isolationLevel: options.isolationLevel || 'READ_COMMITTED',
      startTime: new Date(),
      timeout: options.timeout || this.options.defaultTimeout || 30000,
      metadata: options.metadata,
      operations: [],
      compensations: [],
      locks: [],
      status: 'PENDING'
    }

    this.activeTransactions.set(transactionId, context)
    
    this.emit('transaction:started', { transactionId, context })
    
    if (this.options.enableMetrics) {
      this.metricsCollector.start(transactionId)
    }

    return success(context)
  }

  /**
   * Execute operations within a transaction with rollback support
   */
  async execute<T>(
    transactionId: string,
    operations: Array<{
      execute: () => Promise<Result<T>>
      compensate?: () => Promise<Result<void>>
      description?: string
      lockRequirements?: OptimisticLock[]
    }>
  ): Promise<Result<T[]>> {
    const context = this.activeTransactions.get(transactionId)
    if (!context) {
      return failure(RepositoryError.notFound('Transaction', transactionId))
    }

    context.status = 'RUNNING'
    const results: T[] = []

    try {
      // Handle different transaction modes
      switch (context.mode) {
        case 'SINGLE_DOMAIN':
          return await this.executeSingleDomain(context, operations)
        
        case 'CROSS_DOMAIN':
          return await this.executeCrossDomain(context, operations)
        
        case 'DISTRIBUTED':
          return await this.executeDistributed(context, operations)
        
        case 'COMPENSATING':
          return await this.executeCompensating(context, operations)
        
        default:
          return failure(RepositoryError.validation(
            `Unsupported transaction mode: ${context.mode}`
          ))
      }
    } catch (error) {
      return failure(RepositoryError.internal(
        'Transaction execution failed',
        error,
        { transactionId, operationsCount: operations.length }
      ))
    }
  }

  /**
   * Commit a transaction
   */
  async commit(transactionId: string): Promise<Result<void>> {
    const context = this.activeTransactions.get(transactionId)
    if (!context) {
      return failure(RepositoryError.notFound('Transaction', transactionId))
    }

    if (context.status !== 'RUNNING') {
      return failure(RepositoryError.businessRule(
        'transaction_invalid_state',
        `Cannot commit transaction in ${context.status} state`
      ))
    }

    context.status = 'COMMITTING'

    try {
      // Release all optimistic locks
      await this.releaseAllLocks(transactionId)
      
      context.status = 'COMMITTED'
      context.endTime = new Date()
      
      this.emit('transaction:committed', { transactionId, context })
      
      if (this.options.enableMetrics) {
        const metrics = this.metricsCollector.finish(transactionId, context)
        this.emit('transaction:metrics', metrics)
      }

      // Clean up after delay to allow event handlers to process
      setTimeout(() => {
        this.activeTransactions.delete(transactionId)
      }, 1000)

      return success(undefined)
    } catch (error) {
      context.status = 'FAILED'
      return failure(RepositoryError.internal('Transaction commit failed', error))
    }
  }

  /**
   * Rollback a transaction with compensation
   */
  async rollback(transactionId: string, reason?: string): Promise<Result<void>> {
    const context = this.activeTransactions.get(transactionId)
    if (!context) {
      return failure(RepositoryError.notFound('Transaction', transactionId))
    }

    context.status = 'ABORTING'

    try {
      // Execute compensations in reverse order of execution
      await this.executeCompensations(context)
      
      // Release all locks
      await this.releaseAllLocks(transactionId)
      
      context.status = 'ABORTED'
      context.endTime = new Date()
      
      this.emit('transaction:rolled_back', { 
        transactionId, 
        context, 
        reason 
      })
      
      if (this.options.enableMetrics) {
        const metrics = this.metricsCollector.finish(transactionId, context)
        this.emit('transaction:metrics', metrics)
      }

      this.activeTransactions.delete(transactionId)

      return success(undefined)
    } catch (error) {
      context.status = 'FAILED'
      return failure(RepositoryError.internal('Transaction rollback failed', error))
    }
  }

  /**
   * Acquire optimistic lock for an entity
   */
  async acquireOptimisticLock(
    transactionId: string,
    table: string,
    entityId: string,
    expectedVersion: number,
    timeoutMs: number = 5000
  ): Promise<Result<OptimisticLock>> {
    const context = this.activeTransactions.get(transactionId)
    if (!context) {
      return failure(RepositoryError.notFound('Transaction', transactionId))
    }

    const lockKey = `${table}:${entityId}`
    const existingLocks = this.lockRegistry.get(lockKey) || []
    
    // Check if already locked by another transaction
    const conflictingLock = existingLocks.find(lock => 
      lock.expectedVersion !== expectedVersion &&
      lock.expiresAt && lock.expiresAt > new Date()
    )
    
    if (conflictingLock) {
      return failure(RepositoryError.conflict(
        'optimistic_lock',
        `Entity ${entityId} is locked with version ${conflictingLock.expectedVersion}`,
        { 
          table, 
          entityId, 
          expectedVersion, 
          conflictingVersion: conflictingLock.expectedVersion 
        }
      ))
    }

    const lock: OptimisticLock = {
      table,
      entityId,
      expectedVersion,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + timeoutMs)
    }

    // Add lock to registry
    if (!this.lockRegistry.has(lockKey)) {
      this.lockRegistry.set(lockKey, [])
    }
    this.lockRegistry.get(lockKey)!.push(lock)
    
    // Add to transaction context
    context.locks.push(lock)

    this.emit('lock:acquired', { transactionId, lock })

    return success(lock)
  }

  /**
   * Execute single-domain transaction (ACID within one aggregate)
   */
  private async executeSingleDomain<T>(
    context: TransactionContext,
    operations: Array<{
      execute: () => Promise<Result<T>>
      compensate?: () => Promise<Result<void>>
      description?: string
      lockRequirements?: OptimisticLock[]
    }>
  ): Promise<Result<T[]>> {
    const results: T[] = []
    
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i]
      
      try {
        // Acquire required locks
        if (op.lockRequirements) {
          for (const lockReq of op.lockRequirements) {
            const lockResult = await this.acquireOptimisticLock(
              context.id,
              lockReq.table,
              lockReq.entityId,
              lockReq.expectedVersion
            )
            if (!lockResult.success) {
              // Rollback already executed operations
              await this.executeCompensations(context)
              return failure(lockResult.error)
            }
          }
        }

        // Execute operation
        const result = await op.execute()
        
        if (result.success) {
          results.push(result.data)
          
          // Record successful operation
          const transactionOp: TransactionOperation = {
            id: this.generateOperationId(),
            type: 'UPDATE', // Could be inferred from operation
            table: 'unknown', // Could be passed in
            timestamp: new Date(),
            status: 'EXECUTED',
            result: result.data
          }
          context.operations.push(transactionOp)
          
          // Add compensation if provided
          if (op.compensate) {
            context.compensations.push({
              id: this.generateCompensationId(),
              operationId: transactionOp.id,
              action: op.compensate,
              description: op.description || `Compensate operation ${i}`,
              priority: operations.length - i // Reverse order priority
            })
          }
        } else {
          // Operation failed - rollback
          await this.executeCompensations(context)
          return failure(result.error)
        }
        
      } catch (error) {
        await this.executeCompensations(context)
        return failure(RepositoryError.internal(
          `Operation ${i} failed: ${op.description}`,
          error
        ))
      }
    }

    return success(results)
  }

  /**
   * Execute cross-domain transaction (multiple aggregates with eventual consistency)
   */
  private async executeCrossDomain<T>(
    context: TransactionContext,
    operations: Array<{
      execute: () => Promise<Result<T>>
      compensate?: () => Promise<Result<void>>
      description?: string
    }>
  ): Promise<Result<T[]>> {
    // Cross-domain transactions use saga pattern
    context.status = 'COMPENSATING'
    
    const sagaSteps = operations.map((op, index) => ({
      id: `step_${index}`,
      name: op.description || `Operation ${index}`,
      action: async (input: any, sagaContext: any) => {
        const result = await op.execute()
        return result
      },
      compensation: async (output: any, sagaContext: any) => {
        if (op.compensate) {
          return await op.compensate()
        }
        return success(undefined)
      }
    }))

    const sagaDefinition = {
      id: `transaction_saga_${context.id}`,
      name: `Cross-domain transaction ${context.id}`,
      steps: sagaSteps
    }

    this.sagaOrchestrator.registerSaga(sagaDefinition)
    
    const sagaResult = await this.sagaOrchestrator.startSaga(
      sagaDefinition.id,
      {},
      {
        userId: context.userId,
        organizationId: context.organizationId,
        metadata: context.metadata
      }
    )

    if (!sagaResult.success) {
      return failure(sagaResult.error)
    }

    // Wait for saga completion
    const execution = sagaResult.data
    const finalResult = await new Promise<Result<T[]>>((resolve) => {
      const checkCompletion = () => {
        if (execution.status === 'committed') {
          resolve(success(execution.getFinalResult()))
        } else if (['failed', 'aborted'].includes(execution.status)) {
          resolve(failure(RepositoryError.internal('Saga execution failed')))
        } else {
          setTimeout(checkCompletion, 100)
        }
      }
      checkCompletion()
    })

    return finalResult
  }

  /**
   * Execute distributed transaction across multiple services
   */
  private async executeDistributed<T>(
    context: TransactionContext,
    operations: Array<{
      execute: () => Promise<Result<T>>
      compensate?: () => Promise<Result<void>>
      description?: string
    }>
  ): Promise<Result<T[]>> {
    // For distributed transactions, we use 2PC (Two-Phase Commit) simulation
    // Phase 1: Prepare all operations
    const prepareResults: Array<{ success: boolean; data?: T; error?: RepositoryError }> = []
    
    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i].execute()
        prepareResults.push({
          success: result.success,
          data: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error
        })
        
        if (!result.success) {
          // Abort all - execute compensations for prepared operations
          await this.executeCompensations(context)
          return failure(result.error)
        }
      } catch (error) {
        await this.executeCompensations(context)
        return failure(RepositoryError.internal(
          `Distributed operation ${i} failed`,
          error
        ))
      }
    }
    
    // Phase 2: If all prepared successfully, commit all
    const results = prepareResults
      .filter(r => r.success)
      .map(r => r.data!)
    
    return success(results)
  }

  /**
   * Execute compensating transaction (saga pattern)
   */
  private async executeCompensating<T>(
    context: TransactionContext,
    operations: Array<{
      execute: () => Promise<Result<T>>
      compensate?: () => Promise<Result<void>>
      description?: string
    }>
  ): Promise<Result<T[]>> {
    return this.executeCrossDomain(context, operations)
  }

  /**
   * Execute all compensations in reverse order
   */
  private async executeCompensations(context: TransactionContext): Promise<void> {
    context.status = 'COMPENSATING'
    
    // Sort by priority (higher first) then by reverse execution order
    const sortedCompensations = [...context.compensations].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return b.id.localeCompare(a.id) // Reverse order by ID (assuming chronological)
    })

    for (const compensation of sortedCompensations) {
      try {
        const result = await compensation.action()
        if (result.success) {
          this.emit('compensation:executed', {
            transactionId: context.id,
            compensationId: compensation.id,
            description: compensation.description
          })
        } else {
          this.emit('compensation:failed', {
            transactionId: context.id,
            compensationId: compensation.id,
            error: result.error
          })
        }
      } catch (error) {
        this.emit('compensation:error', {
          transactionId: context.id,
          compensationId: compensation.id,
          error
        })
      }
    }

    context.status = 'COMPENSATED'
  }

  /**
   * Release all optimistic locks for a transaction
   */
  private async releaseAllLocks(transactionId: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId)
    if (!context) return

    for (const lock of context.locks) {
      const lockKey = `${lock.table}:${lock.entityId}`
      const locks = this.lockRegistry.get(lockKey)
      
      if (locks) {
        const index = locks.findIndex(l => 
          l.table === lock.table && 
          l.entityId === lock.entityId &&
          l.expectedVersion === lock.expectedVersion &&
          l.lockedAt.getTime() === lock.lockedAt.getTime()
        )
        
        if (index > -1) {
          locks.splice(index, 1)
          
          if (locks.length === 0) {
            this.lockRegistry.delete(lockKey)
          }
          
          this.emit('lock:released', { transactionId, lock })
        }
      }
    }

    context.locks = []
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId: string): TransactionStatus | null {
    const context = this.activeTransactions.get(transactionId)
    return context?.status || null
  }

  /**
   * Get active transactions count
   */
  getActiveTransactionsCount(): number {
    return this.activeTransactions.size
  }

  /**
   * Get transaction metrics
   */
  getTransactionMetrics(): TransactionMetrics[] {
    return this.metricsCollector.getAllMetrics()
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Transaction timeout handler
    setInterval(() => {
      const now = new Date()
      for (const [transactionId, context] of this.activeTransactions) {
        if (context.timeout) {
          const timeoutAt = new Date(context.startTime.getTime() + context.timeout)
          if (now > timeoutAt && ['PENDING', 'RUNNING'].includes(context.status)) {
            this.rollback(transactionId, 'Transaction timeout').catch(error => {
              this.emit('error', { transactionId, error })
            })
          }
        }
      }
    }, 1000)

    // Lock cleanup handler
    setInterval(() => {
      const now = new Date()
      for (const [lockKey, locks] of this.lockRegistry) {
        const validLocks = locks.filter(lock => 
          !lock.expiresAt || lock.expiresAt > now
        )
        
        if (validLocks.length !== locks.length) {
          if (validLocks.length === 0) {
            this.lockRegistry.delete(lockKey)
          } else {
            this.lockRegistry.set(lockKey, validLocks)
          }
        }
      }
    }, 5000)
  }

  /**
   * Start deadlock detection
   */
  private startDeadlockDetection(): void {
    setInterval(() => {
      const deadlocks = this.deadlockDetector.detectDeadlocks(this.activeTransactions)
      for (const deadlock of deadlocks) {
        this.handleDeadlock(deadlock)
      }
    }, 2000)
  }

  /**
   * Handle detected deadlock
   */
  private handleDeadlock(deadlock: DeadlockInfo): void {
    this.emit('deadlock:detected', deadlock)
    
    // Simple resolution: abort youngest transaction
    const sortedTransactionIds = deadlock.transactionIds.sort()
    const victimTransactionId = sortedTransactionIds[sortedTransactionIds.length - 1]
    
    this.rollback(victimTransactionId, 'Deadlock resolution').catch(error => {
      this.emit('error', { transactionId: victimTransactionId, error })
    })
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCompensationId(): string {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Deadlock detection implementation
 */
class DeadlockDetector {
  constructor(private lockRegistry: Map<string, OptimisticLock[]>) {}

  detectDeadlocks(
    activeTransactions: Map<string, TransactionContext>
  ): DeadlockInfo[] {
    // Simplified deadlock detection based on lock waiting
    // In a real implementation, this would build a wait-for graph
    const deadlocks: DeadlockInfo[] = []
    
    // This is a simplified implementation
    // Real deadlock detection would require tracking lock dependencies
    
    return deadlocks
  }
}

/**
 * Transaction metrics collection
 */
class TransactionMetricsCollector {
  private metrics: Map<string, {
    startTime: Date
    operationCount: number
    retryCount: number
    lockWaitTime: number
    deadlockCount: number
  }> = new Map()

  start(transactionId: string): void {
    this.metrics.set(transactionId, {
      startTime: new Date(),
      operationCount: 0,
      retryCount: 0,
      lockWaitTime: 0,
      deadlockCount: 0
    })
  }

  recordOperation(transactionId: string): void {
    const metric = this.metrics.get(transactionId)
    if (metric) {
      metric.operationCount++
    }
  }

  recordRetry(transactionId: string): void {
    const metric = this.metrics.get(transactionId)
    if (metric) {
      metric.retryCount++
    }
  }

  recordLockWait(transactionId: string, waitTime: number): void {
    const metric = this.metrics.get(transactionId)
    if (metric) {
      metric.lockWaitTime += waitTime
    }
  }

  recordDeadlock(transactionId: string): void {
    const metric = this.metrics.get(transactionId)
    if (metric) {
      metric.deadlockCount++
    }
  }

  finish(transactionId: string, context: TransactionContext): TransactionMetrics {
    const metric = this.metrics.get(transactionId)
    const endTime = new Date()
    const duration = endTime.getTime() - (metric?.startTime.getTime() || endTime.getTime())
    
    const result: TransactionMetrics = {
      transactionId,
      duration,
      operationCount: metric?.operationCount || 0,
      retryCount: metric?.retryCount || 0,
      lockWaitTime: metric?.lockWaitTime || 0,
      deadlockCount: metric?.deadlockCount || 0,
      compensationCount: context.compensations.length,
      throughput: metric ? (metric.operationCount / (duration / 1000)) : 0,
      errorRate: context.operations.filter(op => op.status === 'FAILED').length / context.operations.length
    }

    this.metrics.delete(transactionId)
    return result
  }

  getAllMetrics(): TransactionMetrics[] {
    // Return current metrics for active transactions
    return Array.from(this.metrics.entries()).map(([transactionId, metric]) => ({
      transactionId,
      duration: Date.now() - metric.startTime.getTime(),
      operationCount: metric.operationCount,
      retryCount: metric.retryCount,
      lockWaitTime: metric.lockWaitTime,
      deadlockCount: metric.deadlockCount,
      compensationCount: 0, // Not available for active transactions
      throughput: metric.operationCount / ((Date.now() - metric.startTime.getTime()) / 1000),
      errorRate: 0 // Not available for active transactions
    }))
  }
}

/**
 * Retry policy for failed operations
 */
class RetryPolicy {
  async executeWithRetry<T>(
    operation: () => Promise<Result<T>>,
    maxRetries: number = 3,
    backoffMs: number = 1000,
    retryPredicate?: (error: RepositoryError) => boolean
  ): Promise<Result<T>> {
    let lastError: RepositoryError | null = null
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const result = await operation()
        
        if (result.success) {
          return result
        }
        
        lastError = result.error
        
        // Check if error is retryable
        if (retryPredicate && !retryPredicate(result.error)) {
          break
        }
        
        // Don't wait after last attempt
        if (attempt <= maxRetries) {
          const delay = backoffMs * Math.pow(2, attempt - 1) + Math.random() * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        lastError = RepositoryError.internal('Operation execution error', error)
        
        if (attempt <= maxRetries) {
          const delay = backoffMs * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    return failure(lastError || RepositoryError.internal('Operation failed after retries'))
  }
}

/**
 * Transaction utilities for common patterns
 */
export class TransactionUtils {
  /**
   * Create a simple ACID transaction wrapper
   */
  static async withTransaction<T>(
    coordinator: TransactionCoordinator,
    operations: Array<() => Promise<Result<T>>>,
    options: Partial<TransactionOptions> = {}
  ): Promise<Result<T[]>> {
    const txOptions: TransactionOptions = {
      mode: 'SINGLE_DOMAIN',
      isolationLevel: 'READ_COMMITTED',
      timeout: 30000,
      enableOptimisticLocking: true,
      enableMetrics: true,
      ...options
    }

    const beginResult = await coordinator.begin(txOptions)
    if (!beginResult.success) {
      return failure(beginResult.error)
    }

    const transactionId = beginResult.data.id

    try {
      const executeResult = await coordinator.execute(
        transactionId,
        operations.map(op => ({ execute: op }))
      )

      if (executeResult.success) {
        const commitResult = await coordinator.commit(transactionId)
        if (commitResult.success) {
          return executeResult
        } else {
          await coordinator.rollback(transactionId, 'Commit failed')
          return failure(commitResult.error)
        }
      } else {
        await coordinator.rollback(transactionId, 'Execution failed')
        return executeResult
      }
    } catch (error) {
      await coordinator.rollback(transactionId, 'Exception occurred')
      return failure(RepositoryError.internal('Transaction failed', error))
    }
  }

  /**
   * Create a saga-based distributed transaction
   */
  static async withSaga<T>(
    coordinator: TransactionCoordinator,
    steps: Array<{
      execute: () => Promise<Result<T>>
      compensate: () => Promise<Result<void>>
      description: string
    }>
  ): Promise<Result<T[]>> {
    const beginResult = await coordinator.begin({
      mode: 'DISTRIBUTED',
      enableMetrics: true,
      timeout: 60000
    })

    if (!beginResult.success) {
      return failure(beginResult.error)
    }

    const transactionId = beginResult.data.id

    try {
      const executeResult = await coordinator.execute(transactionId, steps)
      
      if (executeResult.success) {
        await coordinator.commit(transactionId)
        return executeResult
      } else {
        await coordinator.rollback(transactionId, 'Saga execution failed')
        return executeResult
      }
    } catch (error) {
      await coordinator.rollback(transactionId, 'Exception in saga')
      return failure(RepositoryError.internal('Saga transaction failed', error))
    }
  }
}