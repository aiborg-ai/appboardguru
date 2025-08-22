/**
 * Cross-Domain Transaction Coordinator
 * 
 * Manages transactions that span multiple domains/aggregates using advanced patterns
 * including saga orchestration, event sourcing, and distributed consistency.
 */

import { EventEmitter } from 'events'
import { Result, success, failure, RepositoryError } from './result'
import { SagaOrchestrator, SagaDefinition, SagaStep } from './transaction-manager'
import { OptimisticLockingManager, VersionedEntity } from './optimistic-locking'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// Domain operation interface
export interface DomainOperation<TInput = any, TOutput = any> {
  domain: string
  operation: string
  input: TInput
  idempotencyKey?: string
  timeout?: number
  retryPolicy?: RetryPolicy
  dependencies?: string[] // IDs of operations this depends on
}

// Domain transaction context
export interface DomainTransactionContext {
  transactionId: string
  correlationId: string
  causationId?: string
  initiator: {
    userId?: string
    organizationId?: string
    service: string
  }
  startTime: Date
  timeout?: number
  metadata?: Record<string, unknown>
}

// Cross-domain transaction state
export type CrossDomainTransactionState = 
  | 'PENDING'
  | 'ORCHESTRATING' 
  | 'EXECUTING'
  | 'COMPENSATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

// Domain event for event sourcing
export interface DomainEvent {
  id: string
  type: string
  aggregateId: string
  aggregateType: string
  version: number
  data: any
  metadata: {
    transactionId?: string
    correlationId?: string
    causationId?: string
    timestamp: Date
    userId?: string
  }
}

// Compensation strategy
export type CompensationStrategy = 
  | 'IMMEDIATE'     // Compensate as soon as failure is detected
  | 'DEFERRED'      // Batch compensations at the end
  | 'PARALLEL'      // Execute compensations in parallel
  | 'SEQUENTIAL'    // Execute compensations in sequence

// Transaction execution plan
export interface ExecutionPlan {
  phases: ExecutionPhase[]
  compensationStrategy: CompensationStrategy
  timeoutMs: number
  maxRetries: number
  enableEventSourcing: boolean
}

export interface ExecutionPhase {
  name: string
  operations: DomainOperation[]
  parallel: boolean // Can operations in this phase run in parallel?
  continueOnPartialFailure: boolean
  rollbackOnFailure: boolean
}

// Retry policy configuration
export interface RetryPolicy {
  maxAttempts: number
  backoffStrategy: 'FIXED' | 'LINEAR' | 'EXPONENTIAL'
  baseDelayMs: number
  maxDelayMs: number
  jitterMs?: number
  retryableErrors?: string[]
}

// Transaction result
export interface CrossDomainTransactionResult {
  transactionId: string
  state: CrossDomainTransactionState
  results: Map<string, any>
  events: DomainEvent[]
  compensations: CompensationRecord[]
  metrics: TransactionMetrics
}

export interface CompensationRecord {
  operationId: string
  domain: string
  operation: string
  executedAt: Date
  success: boolean
  error?: RepositoryError
  retryCount: number
}

export interface TransactionMetrics {
  totalDuration: number
  phaseTimings: Map<string, number>
  operationCount: number
  compensationCount: number
  retryCount: number
  eventCount: number
  errorRate: number
}

/**
 * Cross-Domain Transaction Coordinator
 */
export class CrossDomainTransactionCoordinator extends EventEmitter {
  private activeTransactions: Map<string, CrossDomainTransactionExecution> = new Map()
  private eventStore: DomainEventStore
  private sagaOrchestrator: SagaOrchestrator
  private lockingManager: OptimisticLockingManager
  
  constructor(
    private supabase: SupabaseClient<Database>,
    private options: {
      enableEventSourcing?: boolean
      maxConcurrentTransactions?: number
      defaultTimeoutMs?: number
      enableMetrics?: boolean
    } = {}
  ) {
    super()
    
    this.eventStore = new DomainEventStore(this.supabase)
    this.sagaOrchestrator = new SagaOrchestrator(this.supabase)
    this.lockingManager = new OptimisticLockingManager(this.supabase)
    
    this.setupEventHandlers()
  }

  /**
   * Execute cross-domain transaction with comprehensive orchestration
   */
  async executeTransaction(
    operations: DomainOperation[],
    context: DomainTransactionContext,
    plan?: Partial<ExecutionPlan>
  ): Promise<Result<CrossDomainTransactionResult>> {
    // Check concurrency limits
    if (this.options.maxConcurrentTransactions && 
        this.activeTransactions.size >= this.options.maxConcurrentTransactions) {
      return failure(RepositoryError.quotaExceeded(
        'concurrent_transactions',
        this.options.maxConcurrentTransactions,
        this.activeTransactions.size
      ))
    }

    // Create execution plan
    const executionPlan = this.createExecutionPlan(operations, plan)
    
    // Create transaction execution instance
    const execution = new CrossDomainTransactionExecution(
      context,
      operations,
      executionPlan,
      this.eventStore,
      this.sagaOrchestrator,
      this.lockingManager,
      this
    )

    this.activeTransactions.set(context.transactionId, execution)

    try {
      // Start execution
      const result = await execution.execute()
      
      // Clean up after delay
      setTimeout(() => {
        this.activeTransactions.delete(context.transactionId)
      }, 60000) // Keep for 1 minute for debugging

      return result
    } catch (error) {
      this.activeTransactions.delete(context.transactionId)
      return failure(RepositoryError.internal(
        'Cross-domain transaction execution failed',
        error,
        { transactionId: context.transactionId }
      ))
    }
  }

  /**
   * Cancel active transaction
   */
  async cancelTransaction(transactionId: string, reason?: string): Promise<Result<void>> {
    const execution = this.activeTransactions.get(transactionId)
    if (!execution) {
      return failure(RepositoryError.notFound('Transaction', transactionId))
    }

    return execution.cancel(reason)
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId: string): CrossDomainTransactionState | null {
    const execution = this.activeTransactions.get(transactionId)
    return execution?.getState() || null
  }

  /**
   * Get transaction metrics
   */
  getTransactionMetrics(transactionId: string): TransactionMetrics | null {
    const execution = this.activeTransactions.get(transactionId)
    return execution?.getMetrics() || null
  }

  /**
   * Create execution plan from operations
   */
  private createExecutionPlan(
    operations: DomainOperation[],
    planOverrides?: Partial<ExecutionPlan>
  ): ExecutionPlan {
    // Default plan
    const defaultPlan: ExecutionPlan = {
      phases: this.createPhases(operations),
      compensationStrategy: 'SEQUENTIAL',
      timeoutMs: this.options.defaultTimeoutMs || 300000, // 5 minutes
      maxRetries: 3,
      enableEventSourcing: this.options.enableEventSourcing || false
    }

    return { ...defaultPlan, ...planOverrides }
  }

  /**
   * Create execution phases with dependency resolution
   */
  private createPhases(operations: DomainOperation[]): ExecutionPhase[] {
    const phases: ExecutionPhase[] = []
    const processed = new Set<string>()
    const operationsMap = new Map<string, DomainOperation>()
    
    // Index operations by ID (using domain + operation as ID)
    operations.forEach(op => {
      const id = `${op.domain}:${op.operation}`
      operationsMap.set(id, op)
    })

    // Build dependency graph and create phases
    let phaseIndex = 0
    while (processed.size < operations.length) {
      const readyOperations: DomainOperation[] = []
      
      for (const operation of operations) {
        const operationId = `${operation.domain}:${operation.operation}`
        if (processed.has(operationId)) continue

        // Check if all dependencies are satisfied
        const dependenciesSatisfied = !operation.dependencies || 
          operation.dependencies.every(dep => processed.has(dep))

        if (dependenciesSatisfied) {
          readyOperations.push(operation)
          processed.add(operationId)
        }
      }

      if (readyOperations.length === 0) {
        throw new Error('Circular dependency detected in cross-domain operations')
      }

      // Group operations by domain for better performance
      const domainGroups = this.groupOperationsByDomain(readyOperations)
      
      phases.push({
        name: `phase_${phaseIndex}`,
        operations: readyOperations,
        parallel: domainGroups.size > 1, // Can parallelize if multiple domains
        continueOnPartialFailure: false,
        rollbackOnFailure: true
      })

      phaseIndex++
    }

    return phases
  }

  /**
   * Group operations by domain for optimization
   */
  private groupOperationsByDomain(operations: DomainOperation[]): Map<string, DomainOperation[]> {
    const groups = new Map<string, DomainOperation[]>()
    
    for (const operation of operations) {
      const domainOps = groups.get(operation.domain) || []
      domainOps.push(operation)
      groups.set(operation.domain, domainOps)
    }

    return groups
  }

  private setupEventHandlers(): void {
    this.on('transaction:started', ({ transactionId }) => {
      console.log(`Cross-domain transaction started: ${transactionId}`)
    })

    this.on('transaction:completed', ({ transactionId, result }) => {
      console.log(`Cross-domain transaction completed: ${transactionId}`)
    })

    this.on('transaction:failed', ({ transactionId, error }) => {
      console.error(`Cross-domain transaction failed: ${transactionId}`, error)
    })
  }
}

/**
 * Individual cross-domain transaction execution
 */
class CrossDomainTransactionExecution {
  private state: CrossDomainTransactionState = 'PENDING'
  private results: Map<string, any> = new Map()
  private events: DomainEvent[] = []
  private compensations: CompensationRecord[] = []
  private startTime: Date = new Date()
  private phaseTimings: Map<string, number> = new Map()

  constructor(
    private context: DomainTransactionContext,
    private operations: DomainOperation[],
    private plan: ExecutionPlan,
    private eventStore: DomainEventStore,
    private sagaOrchestrator: SagaOrchestrator,
    private lockingManager: OptimisticLockingManager,
    private coordinator: CrossDomainTransactionCoordinator
  ) {}

  async execute(): Promise<Result<CrossDomainTransactionResult>> {
    this.state = 'ORCHESTRATING'
    this.coordinator.emit('transaction:started', { 
      transactionId: this.context.transactionId,
      context: this.context 
    })

    try {
      // Execute phases
      this.state = 'EXECUTING'
      
      for (const phase of this.plan.phases) {
        const phaseStartTime = Date.now()
        
        const phaseResult = await this.executePhase(phase)
        
        const phaseEndTime = Date.now()
        this.phaseTimings.set(phase.name, phaseEndTime - phaseStartTime)
        
        if (!phaseResult.success) {
          if (phase.rollbackOnFailure) {
            await this.executeCompensations()
            this.state = 'FAILED'
            
            this.coordinator.emit('transaction:failed', {
              transactionId: this.context.transactionId,
              phase: phase.name,
              error: phaseResult.error
            })
            
            return failure(phaseResult.error)
          }
        }
      }

      this.state = 'COMPLETED'
      const result = this.buildResult()
      
      this.coordinator.emit('transaction:completed', {
        transactionId: this.context.transactionId,
        result
      })

      return success(result)

    } catch (error) {
      this.state = 'FAILED'
      await this.executeCompensations()
      
      return failure(RepositoryError.internal(
        'Transaction execution failed',
        error,
        { transactionId: this.context.transactionId }
      ))
    }
  }

  async cancel(reason?: string): Promise<Result<void>> {
    if (this.state === 'COMPLETED' || this.state === 'FAILED') {
      return failure(RepositoryError.businessRule(
        'transaction_immutable',
        `Cannot cancel transaction in ${this.state} state`
      ))
    }

    this.state = 'CANCELLED'
    await this.executeCompensations()
    
    this.coordinator.emit('transaction:cancelled', {
      transactionId: this.context.transactionId,
      reason
    })

    return success(undefined)
  }

  getState(): CrossDomainTransactionState {
    return this.state
  }

  getMetrics(): TransactionMetrics {
    const now = Date.now()
    const totalDuration = now - this.startTime.getTime()
    
    return {
      totalDuration,
      phaseTimings: this.phaseTimings,
      operationCount: this.operations.length,
      compensationCount: this.compensations.length,
      retryCount: this.compensations.reduce((sum, comp) => sum + comp.retryCount, 0),
      eventCount: this.events.length,
      errorRate: this.compensations.filter(c => !c.success).length / Math.max(1, this.compensations.length)
    }
  }

  /**
   * Execute a single phase of operations
   */
  private async executePhase(phase: ExecutionPhase): Promise<Result<void>> {
    if (phase.parallel && phase.operations.length > 1) {
      return this.executePhaseParallel(phase)
    } else {
      return this.executePhaseSequential(phase)
    }
  }

  /**
   * Execute phase operations in parallel
   */
  private async executePhaseParallel(phase: ExecutionPhase): Promise<Result<void>> {
    const promises = phase.operations.map(op => this.executeOperation(op))
    const results = await Promise.allSettled(promises)
    
    const failures: RepositoryError[] = []
    let successCount = 0

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++
        const operationId = this.getOperationId(phase.operations[i])
        this.results.set(operationId, result.value.data)
      } else {
        const error = result.status === 'fulfilled' 
          ? result.value.error 
          : RepositoryError.internal('Operation promise rejected', result.reason)
        failures.push(error)
      }
    }

    if (failures.length > 0) {
      if (phase.continueOnPartialFailure && successCount > 0) {
        // Some operations succeeded, continue with partial success
        return success(undefined)
      } else {
        return failure(failures[0]) // Return first failure
      }
    }

    return success(undefined)
  }

  /**
   * Execute phase operations sequentially
   */
  private async executePhaseSequential(phase: ExecutionPhase): Promise<Result<void>> {
    for (const operation of phase.operations) {
      const result = await this.executeOperation(operation)
      
      if (result.success) {
        const operationId = this.getOperationId(operation)
        this.results.set(operationId, result.data)
      } else {
        if (!phase.continueOnPartialFailure) {
          return failure(result.error)
        }
      }
    }

    return success(undefined)
  }

  /**
   * Execute single domain operation
   */
  private async executeOperation(operation: DomainOperation): Promise<Result<any>> {
    const operationId = this.getOperationId(operation)
    const retryPolicy = operation.retryPolicy || this.getDefaultRetryPolicy()
    
    // Record operation start event
    if (this.plan.enableEventSourcing) {
      const event = this.createOperationEvent('OPERATION_STARTED', operation)
      this.events.push(event)
      await this.eventStore.append(event)
    }

    // Execute with retry
    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        // Simulate domain operation execution
        // In real implementation, this would dispatch to domain handlers
        const result = await this.dispatchToDomain(operation)
        
        if (result.success) {
          if (this.plan.enableEventSourcing) {
            const event = this.createOperationEvent('OPERATION_COMPLETED', operation, result.data)
            this.events.push(event)
            await this.eventStore.append(event)
          }
          return result
        }

        // Operation failed - check if retryable
        if (this.shouldRetry(result.error, retryPolicy, attempt)) {
          const delay = this.calculateRetryDelay(attempt, retryPolicy)
          await this.sleep(delay)
          continue
        } else {
          break
        }
      } catch (error) {
        if (attempt < retryPolicy.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt, retryPolicy)
          await this.sleep(delay)
          continue
        }
        
        return failure(RepositoryError.internal(
          `Operation ${operationId} failed after ${attempt} attempts`,
          error
        ))
      }
    }

    return failure(RepositoryError.internal(
      `Operation ${operationId} failed after all retry attempts`
    ))
  }

  /**
   * Dispatch operation to appropriate domain handler
   */
  private async dispatchToDomain(operation: DomainOperation): Promise<Result<any>> {
    // This is a placeholder for actual domain dispatch logic
    // In a real implementation, this would route to domain-specific handlers
    
    // Simulate domain operation
    await this.sleep(Math.random() * 100 + 50) // 50-150ms latency
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) { // 10% failure rate
      return failure(RepositoryError.internal(`Simulated failure in ${operation.domain}`))
    }

    return success({
      domain: operation.domain,
      operation: operation.operation,
      result: `Completed ${operation.operation} in ${operation.domain}`,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Execute compensations for failed transaction
   */
  private async executeCompensations(): Promise<void> {
    this.state = 'COMPENSATING'
    
    // Get operations that were successfully executed (in reverse order)
    const executedOperations = Array.from(this.results.entries()).reverse()
    
    for (const [operationId, result] of executedOperations) {
      try {
        const compensation = await this.compensateOperation(operationId, result)
        this.compensations.push(compensation)
      } catch (error) {
        const compensation: CompensationRecord = {
          operationId,
          domain: 'unknown',
          operation: 'compensate',
          executedAt: new Date(),
          success: false,
          error: RepositoryError.internal('Compensation failed', error),
          retryCount: 0
        }
        this.compensations.push(compensation)
      }
    }
  }

  /**
   * Compensate a single operation
   */
  private async compensateOperation(
    operationId: string,
    operationResult: any
  ): Promise<CompensationRecord> {
    const [domain, operation] = operationId.split(':')
    
    // This is a placeholder for actual compensation logic
    // In a real implementation, each domain would provide compensation handlers
    
    try {
      // Simulate compensation
      await this.sleep(50)
      
      return {
        operationId,
        domain,
        operation: `compensate_${operation}`,
        executedAt: new Date(),
        success: true,
        retryCount: 0
      }
    } catch (error) {
      return {
        operationId,
        domain,
        operation: `compensate_${operation}`,
        executedAt: new Date(),
        success: false,
        error: RepositoryError.internal('Compensation execution failed', error),
        retryCount: 0
      }
    }
  }

  private createOperationEvent(
    eventType: string,
    operation: DomainOperation,
    data?: any
  ): DomainEvent {
    return {
      id: this.generateEventId(),
      type: eventType,
      aggregateId: `${operation.domain}:${operation.operation}`,
      aggregateType: operation.domain,
      version: 1,
      data: data || operation.input,
      metadata: {
        transactionId: this.context.transactionId,
        correlationId: this.context.correlationId,
        causationId: this.context.causationId,
        timestamp: new Date(),
        userId: this.context.initiator.userId
      }
    }
  }

  private buildResult(): CrossDomainTransactionResult {
    return {
      transactionId: this.context.transactionId,
      state: this.state,
      results: this.results,
      events: this.events,
      compensations: this.compensations,
      metrics: this.getMetrics()
    }
  }

  private getOperationId(operation: DomainOperation): string {
    return `${operation.domain}:${operation.operation}`
  }

  private getDefaultRetryPolicy(): RetryPolicy {
    return {
      maxAttempts: 3,
      backoffStrategy: 'EXPONENTIAL',
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      jitterMs: 500
    }
  }

  private shouldRetry(
    error: RepositoryError,
    policy: RetryPolicy,
    attempt: number
  ): boolean {
    if (attempt >= policy.maxAttempts) return false
    
    if (policy.retryableErrors) {
      return policy.retryableErrors.includes(error.code)
    }

    // Default retryable conditions
    return error.recoverable || 
           error.code === 'NETWORK_ERROR' ||
           error.code === 'TIMEOUT' ||
           error.code === 'SERVICE_UNAVAILABLE'
  }

  private calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
    let delay: number

    switch (policy.backoffStrategy) {
      case 'FIXED':
        delay = policy.baseDelayMs
        break
      case 'LINEAR':
        delay = policy.baseDelayMs * attempt
        break
      case 'EXPONENTIAL':
        delay = policy.baseDelayMs * Math.pow(2, attempt - 1)
        break
      default:
        delay = policy.baseDelayMs
    }

    // Apply maximum delay
    delay = Math.min(delay, policy.maxDelayMs)

    // Apply jitter if specified
    if (policy.jitterMs) {
      const jitter = (Math.random() - 0.5) * policy.jitterMs
      delay += jitter
    }

    return Math.max(0, delay)
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Domain Event Store for event sourcing
 */
class DomainEventStore {
  constructor(private supabase: SupabaseClient<Database>) {}

  async append(event: DomainEvent): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('domain_events' as any)
        .insert({
          id: event.id,
          type: event.type,
          aggregate_id: event.aggregateId,
          aggregate_type: event.aggregateType,
          version: event.version,
          data: event.data,
          metadata: event.metadata,
          created_at: new Date().toISOString()
        })

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'append event'))
      }

      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to append event', error))
    }
  }

  async getEventStream(
    aggregateId: string,
    fromVersion?: number
  ): Promise<Result<DomainEvent[]>> {
    try {
      let query = this.supabase
        .from('domain_events' as any)
        .select('*')
        .eq('aggregate_id', aggregateId)
        .order('version', { ascending: true })

      if (fromVersion !== undefined) {
        query = query.gte('version', fromVersion)
      }

      const { data, error } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'get event stream'))
      }

      const events: DomainEvent[] = (data || []).map((row: any) => ({
        id: row.id,
        type: row.type,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        version: row.version,
        data: row.data,
        metadata: row.metadata
      }))

      return success(events)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get event stream', error))
    }
  }
}

/**
 * Utility functions for cross-domain transactions
 */
export class CrossDomainTransactionUtils {
  /**
   * Create a simple cross-domain transaction
   */
  static async executeSimple(
    coordinator: CrossDomainTransactionCoordinator,
    operations: DomainOperation[],
    context: Partial<DomainTransactionContext>
  ): Promise<Result<any[]>> {
    const fullContext: DomainTransactionContext = {
      transactionId: CrossDomainTransactionUtils.generateTransactionId(),
      correlationId: CrossDomainTransactionUtils.generateCorrelationId(),
      startTime: new Date(),
      initiator: { service: 'cross-domain-coordinator' },
      ...context
    }

    const result = await coordinator.executeTransaction(operations, fullContext)
    
    if (result.success) {
      return success(Array.from(result.data.results.values()))
    } else {
      return failure(result.error)
    }
  }

  /**
   * Create a saga-based transaction with explicit compensation
   */
  static async executeSaga(
    coordinator: CrossDomainTransactionCoordinator,
    steps: Array<{
      domain: string
      operation: string
      input: any
      compensate?: any
    }>,
    context: Partial<DomainTransactionContext>
  ): Promise<Result<any[]>> {
    const operations: DomainOperation[] = steps.map(step => ({
      domain: step.domain,
      operation: step.operation,
      input: step.input
    }))

    const fullContext: DomainTransactionContext = {
      transactionId: CrossDomainTransactionUtils.generateTransactionId(),
      correlationId: CrossDomainTransactionUtils.generateCorrelationId(),
      startTime: new Date(),
      initiator: { service: 'saga-coordinator' },
      ...context
    }

    const plan: Partial<ExecutionPlan> = {
      compensationStrategy: 'SEQUENTIAL',
      enableEventSourcing: true
    }

    const result = await coordinator.executeTransaction(operations, fullContext, plan)
    
    if (result.success) {
      return success(Array.from(result.data.results.values()))
    } else {
      return failure(result.error)
    }
  }

  static generateTransactionId(): string {
    return `cross_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateCausationId(): string {
    return `cause_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}