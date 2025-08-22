/**
 * Rollback Strategies for Transaction Management
 * 
 * Provides comprehensive rollback mechanisms for different failure scenarios,
 * including compensation patterns, checkpoints, and recovery strategies.
 */

import { EventEmitter } from 'events'
import { Result, success, failure, RepositoryError } from './result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// Rollback strategy types
export type RollbackStrategy = 
  | 'IMMEDIATE'           // Rollback immediately when failure detected
  | 'DEFERRED'           // Batch rollbacks at transaction end
  | 'CHECKPOINT'         // Use checkpoints and partial rollbacks
  | 'COMPENSATION'       // Use compensating actions (saga pattern)
  | 'HYBRID'             // Combine multiple strategies based on operation type

// Failure scenarios
export type FailureScenario = 
  | 'OPERATION_FAILURE'      // Individual operation failed
  | 'TIMEOUT'               // Operation or transaction timeout
  | 'DEADLOCK'              // Deadlock detected
  | 'CONSTRAINT_VIOLATION'   // Database constraint violation
  | 'NETWORK_FAILURE'       // Network connectivity issues
  | 'RESOURCE_EXHAUSTED'    // System resources exhausted
  | 'CONCURRENCY_CONFLICT'  // Optimistic locking conflict
  | 'BUSINESS_RULE_VIOLATION' // Domain business rule violation
  | 'EXTERNAL_SERVICE_FAILURE' // External service unavailable
  | 'SYSTEM_FAILURE'        // Critical system failure

// Rollback operation record
export interface RollbackOperation {
  id: string
  transactionId: string
  operationId: string
  type: 'UNDO' | 'COMPENSATE' | 'CHECKPOINT_RESTORE'
  description: string
  executor: () => Promise<Result<void>>
  priority: number // Higher priority executes first
  maxRetries: number
  retryDelayMs: number
  dependencies?: string[] // Other rollback operations that must complete first
  metadata?: Record<string, unknown>
}

// Rollback execution result
export interface RollbackResult {
  operationId: string
  success: boolean
  error?: RepositoryError
  executionTimeMs: number
  retryCount: number
  compensationData?: any
}

// Rollback context
export interface RollbackContext {
  transactionId: string
  failureScenario: FailureScenario
  failureDetails: any
  strategy: RollbackStrategy
  operations: RollbackOperation[]
  checkpoints: Map<string, CheckpointData>
  startTime: Date
  metadata?: Record<string, unknown>
}

// Checkpoint data for rollback points
export interface CheckpointData {
  id: string
  transactionId: string
  operationIndex: number
  timestamp: Date
  state: any
  metadata?: Record<string, unknown>
}

// Recovery strategy configuration
export interface RecoveryConfig {
  enableCheckpoints: boolean
  checkpointInterval: number // Operations between checkpoints
  maxRollbackRetries: number
  rollbackTimeoutMs: number
  enablePartialRecovery: boolean
  recoveryCriteria: RecoveryCriteria
}

export interface RecoveryCriteria {
  minSuccessRate: number // Minimum success rate to consider recovery viable
  maxFailureCount: number // Maximum failures before giving up
  criticalOperations: string[] // Operations that must succeed for recovery
}

/**
 * Comprehensive Rollback Manager
 */
export class RollbackManager extends EventEmitter {
  private activeRollbacks: Map<string, RollbackExecution> = new Map()
  private checkpointStore: Map<string, CheckpointData[]> = new Map()
  private rollbackHistory: Map<string, RollbackResult[]> = new Map()

  constructor(
    private supabase: SupabaseClient<Database>,
    private config: RecoveryConfig = {
      enableCheckpoints: true,
      checkpointInterval: 5,
      maxRollbackRetries: 3,
      rollbackTimeoutMs: 60000,
      enablePartialRecovery: false,
      recoveryCriteria: {
        minSuccessRate: 0.7,
        maxFailureCount: 3,
        criticalOperations: []
      }
    }
  ) {
    super()
    this.setupCleanupHandlers()
  }

  /**
   * Execute rollback with specified strategy
   */
  async executeRollback(context: RollbackContext): Promise<Result<RollbackResult[]>> {
    const execution = new RollbackExecution(context, this.config, this)
    this.activeRollbacks.set(context.transactionId, execution)

    this.emit('rollback:started', {
      transactionId: context.transactionId,
      strategy: context.strategy,
      failureScenario: context.failureScenario
    })

    try {
      const result = await execution.execute()
      
      // Store results in history
      if (result.success) {
        this.rollbackHistory.set(context.transactionId, result.data)
      }

      this.emit('rollback:completed', {
        transactionId: context.transactionId,
        success: result.success,
        results: result.success ? result.data : null,
        error: result.success ? null : result.error
      })

      return result
    } finally {
      // Clean up after delay
      setTimeout(() => {
        this.activeRollbacks.delete(context.transactionId)
      }, 30000)
    }
  }

  /**
   * Create checkpoint for transaction state
   */
  async createCheckpoint(
    transactionId: string,
    operationIndex: number,
    state: any,
    metadata?: Record<string, unknown>
  ): Promise<Result<CheckpointData>> {
    if (!this.config.enableCheckpoints) {
      return failure(RepositoryError.businessRule(
        'checkpoints_disabled',
        'Checkpoints are disabled in configuration'
      ))
    }

    const checkpoint: CheckpointData = {
      id: this.generateCheckpointId(),
      transactionId,
      operationIndex,
      timestamp: new Date(),
      state: this.deepClone(state),
      metadata
    }

    try {
      // Store checkpoint in memory
      const checkpoints = this.checkpointStore.get(transactionId) || []
      checkpoints.push(checkpoint)
      this.checkpointStore.set(transactionId, checkpoints)

      // Optionally persist to database
      await this.persistCheckpoint(checkpoint)

      this.emit('checkpoint:created', { transactionId, checkpoint })
      return success(checkpoint)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to create checkpoint', error))
    }
  }

  /**
   * Restore from checkpoint
   */
  async restoreFromCheckpoint(
    transactionId: string,
    checkpointId: string
  ): Promise<Result<CheckpointData>> {
    const checkpoints = this.checkpointStore.get(transactionId)
    if (!checkpoints) {
      return failure(RepositoryError.notFound('Transaction checkpoints', transactionId))
    }

    const checkpoint = checkpoints.find(cp => cp.id === checkpointId)
    if (!checkpoint) {
      return failure(RepositoryError.notFound('Checkpoint', checkpointId))
    }

    try {
      // Restore state would be handled by the calling code
      this.emit('checkpoint:restored', { transactionId, checkpoint })
      return success(checkpoint)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to restore checkpoint', error))
    }
  }

  /**
   * Get rollback history for transaction
   */
  getRollbackHistory(transactionId: string): RollbackResult[] {
    return this.rollbackHistory.get(transactionId) || []
  }

  /**
   * Get active rollback status
   */
  getRollbackStatus(transactionId: string): {
    isActive: boolean
    strategy?: RollbackStrategy
    progress?: number
  } {
    const execution = this.activeRollbacks.get(transactionId)
    if (!execution) {
      return { isActive: false }
    }

    return {
      isActive: true,
      strategy: execution.getContext().strategy,
      progress: execution.getProgress()
    }
  }

  /**
   * Persist checkpoint to database
   */
  private async persistCheckpoint(checkpoint: CheckpointData): Promise<void> {
    try {
      await this.supabase
        .from('transaction_checkpoints' as any)
        .insert({
          id: checkpoint.id,
          transaction_id: checkpoint.transactionId,
          operation_index: checkpoint.operationIndex,
          timestamp: checkpoint.timestamp.toISOString(),
          state: checkpoint.state,
          metadata: checkpoint.metadata
        })
    } catch (error) {
      // Log but don't fail - checkpoints are performance optimization
      console.warn('Failed to persist checkpoint:', error)
    }
  }

  private setupCleanupHandlers(): void {
    // Clean up old checkpoints periodically
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      
      for (const [transactionId, checkpoints] of this.checkpointStore) {
        const validCheckpoints = checkpoints.filter(cp => cp.timestamp > cutoff)
        if (validCheckpoints.length !== checkpoints.length) {
          if (validCheckpoints.length === 0) {
            this.checkpointStore.delete(transactionId)
          } else {
            this.checkpointStore.set(transactionId, validCheckpoints)
          }
        }
      }
    }, 60000) // Every minute
  }

  private generateCheckpointId(): string {
    return `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private deepClone(obj: any): any {
    return JSON.parse(JSON.stringify(obj))
  }
}

/**
 * Individual rollback execution
 */
class RollbackExecution {
  private results: RollbackResult[] = []
  private currentOperation = 0

  constructor(
    private context: RollbackContext,
    private config: RecoveryConfig,
    private manager: RollbackManager
  ) {}

  async execute(): Promise<Result<RollbackResult[]>> {
    try {
      switch (this.context.strategy) {
        case 'IMMEDIATE':
          return await this.executeImmediate()
        case 'DEFERRED':
          return await this.executeDeferred()
        case 'CHECKPOINT':
          return await this.executeWithCheckpoints()
        case 'COMPENSATION':
          return await this.executeCompensation()
        case 'HYBRID':
          return await this.executeHybrid()
        default:
          return failure(RepositoryError.validation(
            `Unsupported rollback strategy: ${this.context.strategy}`
          ))
      }
    } catch (error) {
      return failure(RepositoryError.internal('Rollback execution failed', error))
    }
  }

  getContext(): RollbackContext {
    return this.context
  }

  getProgress(): number {
    if (this.context.operations.length === 0) return 1.0
    return this.currentOperation / this.context.operations.length
  }

  /**
   * Execute immediate rollback strategy
   */
  private async executeImmediate(): Promise<Result<RollbackResult[]>> {
    // Sort operations by priority (highest first)
    const sortedOps = [...this.context.operations].sort((a, b) => b.priority - a.priority)

    for (const operation of sortedOps) {
      this.currentOperation++
      
      const result = await this.executeRollbackOperation(operation)
      this.results.push(result)

      // Fail fast on critical failures
      if (!result.success && this.isCriticalOperation(operation)) {
        this.manager.emit('rollback:critical_failure', {
          transactionId: this.context.transactionId,
          operationId: operation.id,
          error: result.error
        })
        
        return failure(RepositoryError.internal(
          `Critical rollback operation failed: ${operation.id}`,
          result.error
        ))
      }
    }

    return success(this.results)
  }

  /**
   * Execute deferred rollback strategy
   */
  private async executeDeferred(): Promise<Result<RollbackResult[]>> {
    // Group operations for batch execution
    const operationGroups = this.groupOperationsByDependency()
    
    for (const group of operationGroups) {
      const groupResults = await Promise.allSettled(
        group.map(op => this.executeRollbackOperation(op))
      )

      for (const result of groupResults) {
        if (result.status === 'fulfilled') {
          this.results.push(result.value)
        } else {
          this.results.push({
            operationId: 'unknown',
            success: false,
            error: RepositoryError.internal('Promise rejected', result.reason),
            executionTimeMs: 0,
            retryCount: 0
          })
        }
      }

      this.currentOperation += group.length
    }

    return success(this.results)
  }

  /**
   * Execute rollback with checkpoint restoration
   */
  private async executeWithCheckpoints(): Promise<Result<RollbackResult[]>> {
    const checkpoints = this.manager['checkpointStore'].get(this.context.transactionId) || []
    
    if (checkpoints.length === 0) {
      // No checkpoints available, fall back to immediate strategy
      return this.executeImmediate()
    }

    // Find the best checkpoint to restore to
    const bestCheckpoint = this.selectBestCheckpoint(checkpoints)
    
    if (bestCheckpoint) {
      this.manager.emit('rollback:checkpoint_restore', {
        transactionId: this.context.transactionId,
        checkpointId: bestCheckpoint.id
      })

      // Only rollback operations that occurred after the checkpoint
      const operationsToRollback = this.context.operations.filter(op => 
        this.getOperationIndex(op) > bestCheckpoint.operationIndex
      )

      // Create new context with filtered operations
      const checkpointContext: RollbackContext = {
        ...this.context,
        operations: operationsToRollback
      }

      // Execute partial rollback
      return this.executePartialRollback(checkpointContext)
    } else {
      // No suitable checkpoint found, full rollback
      return this.executeImmediate()
    }
  }

  /**
   * Execute compensation-based rollback (saga pattern)
   */
  private async executeCompensation(): Promise<Result<RollbackResult[]>> {
    // Execute compensations in reverse order of original operations
    const reversedOps = [...this.context.operations].reverse()

    for (const operation of reversedOps) {
      this.currentOperation++
      
      const result = await this.executeCompensationOperation(operation)
      this.results.push(result)

      // Continue even if compensation fails (best effort)
      if (!result.success) {
        this.manager.emit('rollback:compensation_failed', {
          transactionId: this.context.transactionId,
          operationId: operation.id,
          error: result.error
        })
      }
    }

    return success(this.results)
  }

  /**
   * Execute hybrid rollback strategy
   */
  private async executeHybrid(): Promise<Result<RollbackResult[]>> {
    // Use different strategies based on operation type and failure scenario
    const strategyGroups = this.groupOperationsByStrategy()

    for (const [strategy, operations] of strategyGroups) {
      const groupContext: RollbackContext = {
        ...this.context,
        strategy,
        operations
      }

      let groupResult: Result<RollbackResult[]>

      switch (strategy) {
        case 'IMMEDIATE':
          groupResult = await this.executeImmediate()
          break
        case 'COMPENSATION':
          groupResult = await this.executeCompensation()
          break
        case 'CHECKPOINT':
          groupResult = await this.executeWithCheckpoints()
          break
        default:
          groupResult = await this.executeImmediate()
      }

      if (groupResult.success) {
        this.results.push(...groupResult.data)
      } else {
        // If any group fails, continue with best effort
        this.manager.emit('rollback:group_failed', {
          transactionId: this.context.transactionId,
          strategy,
          error: groupResult.error
        })
      }
    }

    return success(this.results)
  }

  /**
   * Execute single rollback operation with retries
   */
  private async executeRollbackOperation(operation: RollbackOperation): Promise<RollbackResult> {
    const startTime = Date.now()
    let lastError: RepositoryError | null = null
    let retryCount = 0

    for (let attempt = 1; attempt <= operation.maxRetries + 1; attempt++) {
      try {
        const result = await operation.executor()
        
        if (result.success) {
          return {
            operationId: operation.id,
            success: true,
            executionTimeMs: Date.now() - startTime,
            retryCount
          }
        } else {
          lastError = result.error
          
          if (attempt <= operation.maxRetries) {
            retryCount++
            await this.sleep(operation.retryDelayMs * Math.pow(2, attempt - 1))
          }
        }
      } catch (error) {
        lastError = RepositoryError.internal('Rollback operation threw exception', error)
        
        if (attempt <= operation.maxRetries) {
          retryCount++
          await this.sleep(operation.retryDelayMs * Math.pow(2, attempt - 1))
        }
      }
    }

    return {
      operationId: operation.id,
      success: false,
      error: lastError || RepositoryError.internal('Rollback operation failed'),
      executionTimeMs: Date.now() - startTime,
      retryCount
    }
  }

  /**
   * Execute compensation operation
   */
  private async executeCompensationOperation(operation: RollbackOperation): Promise<RollbackResult> {
    // Compensation operations have specific semantics
    const startTime = Date.now()
    
    try {
      const result = await operation.executor()
      
      return {
        operationId: operation.id,
        success: result.success,
        error: result.success ? undefined : result.error,
        executionTimeMs: Date.now() - startTime,
        retryCount: 0,
        compensationData: operation.metadata
      }
    } catch (error) {
      return {
        operationId: operation.id,
        success: false,
        error: RepositoryError.internal('Compensation operation failed', error),
        executionTimeMs: Date.now() - startTime,
        retryCount: 0
      }
    }
  }

  /**
   * Execute partial rollback from checkpoint
   */
  private async executePartialRollback(context: RollbackContext): Promise<Result<RollbackResult[]>> {
    const partialResults: RollbackResult[] = []

    for (const operation of context.operations) {
      const result = await this.executeRollbackOperation(operation)
      partialResults.push(result)
    }

    return success(partialResults)
  }

  /**
   * Group operations by dependency order
   */
  private groupOperationsByDependency(): RollbackOperation[][] {
    const groups: RollbackOperation[][] = []
    const processed = new Set<string>()
    const operations = [...this.context.operations]

    while (processed.size < operations.length) {
      const readyOps: RollbackOperation[] = []

      for (const op of operations) {
        if (processed.has(op.id)) continue

        const dependenciesMet = !op.dependencies || 
          op.dependencies.every(dep => processed.has(dep))

        if (dependenciesMet) {
          readyOps.push(op)
          processed.add(op.id)
        }
      }

      if (readyOps.length === 0) {
        // Circular dependency - add remaining operations anyway
        const remaining = operations.filter(op => !processed.has(op.id))
        readyOps.push(...remaining)
        remaining.forEach(op => processed.add(op.id))
      }

      groups.push(readyOps)
    }

    return groups
  }

  /**
   * Group operations by appropriate rollback strategy
   */
  private groupOperationsByStrategy(): Map<RollbackStrategy, RollbackOperation[]> {
    const groups = new Map<RollbackStrategy, RollbackOperation[]>()

    for (const operation of this.context.operations) {
      // Determine best strategy based on operation characteristics
      const strategy = this.determineOperationStrategy(operation)
      
      const group = groups.get(strategy) || []
      group.push(operation)
      groups.set(strategy, group)
    }

    return groups
  }

  /**
   * Determine best rollback strategy for operation
   */
  private determineOperationStrategy(operation: RollbackOperation): RollbackStrategy {
    // Strategy selection logic based on operation type and context
    if (operation.type === 'COMPENSATE') {
      return 'COMPENSATION'
    }

    if (this.isCriticalOperation(operation)) {
      return 'IMMEDIATE'
    }

    if (operation.dependencies && operation.dependencies.length > 0) {
      return 'IMMEDIATE' // Dependencies require careful ordering
    }

    switch (this.context.failureScenario) {
      case 'TIMEOUT':
      case 'NETWORK_FAILURE':
        return 'COMPENSATION' // Best effort recovery
      case 'DEADLOCK':
      case 'CONCURRENCY_CONFLICT':
        return 'IMMEDIATE' // Need immediate resolution
      case 'CONSTRAINT_VIOLATION':
      case 'BUSINESS_RULE_VIOLATION':
        return 'CHECKPOINT' // May need partial rollback
      default:
        return 'IMMEDIATE'
    }
  }

  /**
   * Select best checkpoint for restoration
   */
  private selectBestCheckpoint(checkpoints: CheckpointData[]): CheckpointData | null {
    if (checkpoints.length === 0) return null

    // Sort by operation index (descending) to get most recent first
    const sortedCheckpoints = [...checkpoints].sort((a, b) => b.operationIndex - a.operationIndex)

    // Select the most recent checkpoint that's before the failure point
    for (const checkpoint of sortedCheckpoints) {
      // Additional criteria could be added here (e.g., state validation)
      return checkpoint
    }

    return sortedCheckpoints[0] // Fallback to most recent
  }

  private isCriticalOperation(operation: RollbackOperation): boolean {
    return this.config.recoveryCriteria.criticalOperations.includes(operation.id)
  }

  private getOperationIndex(operation: RollbackOperation): number {
    // This would need to be provided in the operation metadata
    return (operation.metadata?.operationIndex as number) || 0
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Rollback strategy factory for common scenarios
 */
export class RollbackStrategyFactory {
  /**
   * Create rollback strategy for database operations
   */
  static createDatabaseRollback(
    transactionId: string,
    operations: Array<{
      table: string
      operation: 'INSERT' | 'UPDATE' | 'DELETE'
      data: any
      originalData?: any
    }>
  ): RollbackOperation[] {
    return operations.map((op, index) => ({
      id: `db_rollback_${index}`,
      transactionId,
      operationId: `${op.table}_${op.operation}`,
      type: 'UNDO',
      description: `Rollback ${op.operation} on ${op.table}`,
      executor: async () => {
        // Implement actual database rollback logic
        return success(undefined)
      },
      priority: 100 - index, // Reverse order
      maxRetries: 3,
      retryDelayMs: 1000
    }))
  }

  /**
   * Create rollback strategy for file operations
   */
  static createFileRollback(
    transactionId: string,
    fileOperations: Array<{
      path: string
      operation: 'CREATE' | 'UPDATE' | 'DELETE'
      backup?: any
    }>
  ): RollbackOperation[] {
    return fileOperations.map((op, index) => ({
      id: `file_rollback_${index}`,
      transactionId,
      operationId: `file_${op.operation}`,
      type: 'UNDO',
      description: `Rollback file ${op.operation} at ${op.path}`,
      executor: async () => {
        // Implement file system rollback logic
        return success(undefined)
      },
      priority: 90 - index,
      maxRetries: 2,
      retryDelayMs: 500
    }))
  }

  /**
   * Create rollback strategy for external service calls
   */
  static createExternalServiceRollback(
    transactionId: string,
    serviceOperations: Array<{
      service: string
      operation: string
      compensationEndpoint?: string
      compensationData?: any
    }>
  ): RollbackOperation[] {
    return serviceOperations.map((op, index) => ({
      id: `service_rollback_${index}`,
      transactionId,
      operationId: `${op.service}_${op.operation}`,
      type: 'COMPENSATE',
      description: `Compensate ${op.operation} on ${op.service}`,
      executor: async () => {
        // Implement external service compensation logic
        return success(undefined)
      },
      priority: 80 - index,
      maxRetries: 5, // Higher retries for network operations
      retryDelayMs: 2000
    }))
  }

  /**
   * Create comprehensive rollback strategy
   */
  static createComprehensiveRollback(
    transactionId: string,
    scenario: FailureScenario,
    operations: {
      database?: Array<any>
      files?: Array<any>
      services?: Array<any>
    }
  ): { strategy: RollbackStrategy; operations: RollbackOperation[] } {
    const rollbackOps: RollbackOperation[] = []

    if (operations.database) {
      rollbackOps.push(...this.createDatabaseRollback(transactionId, operations.database))
    }

    if (operations.files) {
      rollbackOps.push(...this.createFileRollback(transactionId, operations.files))
    }

    if (operations.services) {
      rollbackOps.push(...this.createExternalServiceRollback(transactionId, operations.services))
    }

    // Determine strategy based on scenario
    let strategy: RollbackStrategy
    switch (scenario) {
      case 'DEADLOCK':
      case 'CONCURRENCY_CONFLICT':
        strategy = 'IMMEDIATE'
        break
      case 'NETWORK_FAILURE':
      case 'EXTERNAL_SERVICE_FAILURE':
        strategy = 'COMPENSATION'
        break
      case 'TIMEOUT':
      case 'RESOURCE_EXHAUSTED':
        strategy = 'CHECKPOINT'
        break
      default:
        strategy = 'HYBRID'
    }

    return { strategy, operations: rollbackOps }
  }
}