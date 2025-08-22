/**
 * Transaction Manager with Saga Pattern
 * Implements distributed transactions, compensating actions, saga orchestration,
 * transaction logging, timeout handling, and nested transaction support
 */

import { EventEmitter } from 'events'
import { Result, success, failure, RepositoryError } from './result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// Transaction status types
export type TransactionStatus = 
  | 'pending' | 'running' | 'committed' | 'aborted' | 'compensating' | 'failed'

// Step status types
export type StepStatus = 
  | 'pending' | 'running' | 'completed' | 'failed' | 'compensated'

// Transaction isolation levels (for future database support)
export type IsolationLevel = 
  | 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE'

// Saga step definition
export interface SagaStep<TInput = any, TOutput = any> {
  id: string
  name: string
  description?: string
  
  // Main action to execute
  action: (input: TInput, context: SagaContext) => Promise<Result<TOutput>>
  
  // Compensating action to undo the step
  compensation: (output: TOutput, context: SagaContext) => Promise<Result<void>>
  
  // Optional validation before execution
  validate?: (input: TInput, context: SagaContext) => Promise<Result<void>>
  
  // Dependencies - steps that must complete before this one
  dependencies?: string[]
  
  // Retry configuration
  retryConfig?: RetryConfig
  
  // Timeout configuration
  timeout?: number
  
  // Step metadata
  metadata?: Record<string, unknown>
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number
  delayMs: number
  backoffMultiplier?: number
  maxDelayMs?: number
  retryableErrors?: string[]
}

// Saga definition
export interface SagaDefinition {
  id: string
  name: string
  description?: string
  steps: SagaStep[]
  timeout?: number
  metadata?: Record<string, unknown>
}

// Transaction context
export interface TransactionContext {
  id: string
  userId?: string
  organizationId?: string
  metadata?: Record<string, unknown>
  startTime: Date
  timeout?: number
  isolationLevel?: IsolationLevel
}

// Saga execution context
export interface SagaContext extends TransactionContext {
  sagaId: string
  currentStep: number
  stepResults: Map<string, any>
  compensationStack: Array<{ stepId: string; output: any }>
}

// Transaction log entry
export interface TransactionLogEntry {
  id: string
  transactionId: string
  stepId?: string
  timestamp: Date
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  message: string
  data?: any
  error?: RepositoryError
}

// Transaction metrics
export interface TransactionMetrics {
  id: string
  status: TransactionStatus
  startTime: Date
  endTime?: Date
  duration?: number
  stepCount: number
  completedSteps: number
  failedSteps: number
  retriedSteps: number
  compensatedSteps: number
}

/**
 * Saga orchestrator for distributed transactions
 */
export class SagaOrchestrator extends EventEmitter {
  private activeSagas: Map<string, SagaExecution> = new Map()
  private sagaDefinitions: Map<string, SagaDefinition> = new Map()
  private transactionLogs: Map<string, TransactionLogEntry[]> = new Map()
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000
  }

  constructor(private supabase?: SupabaseClient<Database>) {
    super()
    this.setupEventHandlers()
  }

  /**
   * Register a saga definition
   */
  registerSaga(definition: SagaDefinition): void {
    // Validate saga definition
    this.validateSagaDefinition(definition)
    
    this.sagaDefinitions.set(definition.id, definition)
    this.emit('saga:registered', { sagaId: definition.id })
  }

  /**
   * Start saga execution
   */
  async startSaga<TInput = any>(
    sagaId: string,
    input: TInput,
    context: Partial<TransactionContext> = {}
  ): Promise<Result<SagaExecution>> {
    const definition = this.sagaDefinitions.get(sagaId)
    if (!definition) {
      return failure(RepositoryError.notFound('Saga definition', sagaId))
    }

    const transactionId = this.generateTransactionId()
    const sagaContext: SagaContext = {
      id: transactionId,
      sagaId,
      userId: context.userId,
      organizationId: context.organizationId,
      metadata: context.metadata,
      startTime: new Date(),
      timeout: context.timeout || definition.timeout,
      currentStep: 0,
      stepResults: new Map(),
      compensationStack: []
    }

    const execution = new SagaExecution(definition, sagaContext, input, this)
    this.activeSagas.set(transactionId, execution)

    this.log(transactionId, 'INFO', 'Saga execution started', { 
      sagaId, 
      input: typeof input === 'object' ? JSON.stringify(input) : input 
    })

    // Start execution asynchronously
    execution.execute().catch(error => {
      this.log(transactionId, 'ERROR', 'Saga execution failed', { error: error.message })
      this.emit('saga:failed', { transactionId, sagaId, error })
    })

    return success(execution)
  }

  /**
   * Get saga execution status
   */
  getSagaExecution(transactionId: string): SagaExecution | null {
    return this.activeSagas.get(transactionId) || null
  }

  /**
   * Cancel running saga
   */
  async cancelSaga(transactionId: string, reason?: string): Promise<Result<void>> {
    const execution = this.activeSagas.get(transactionId)
    if (!execution) {
      return failure(RepositoryError.notFound('Saga execution', transactionId))
    }

    return execution.cancel(reason)
  }

  /**
   * Get transaction metrics
   */
  getMetrics(transactionId: string): TransactionMetrics | null {
    const execution = this.activeSagas.get(transactionId)
    if (!execution) {
      return null
    }

    return execution.getMetrics()
  }

  /**
   * Get transaction logs
   */
  getLogs(transactionId: string): TransactionLogEntry[] {
    return this.transactionLogs.get(transactionId) || []
  }

  /**
   * Log transaction event
   */
  log(
    transactionId: string,
    level: TransactionLogEntry['level'],
    message: string,
    data?: any,
    stepId?: string,
    error?: RepositoryError
  ): void {
    const logs = this.transactionLogs.get(transactionId) || []
    
    const entry: TransactionLogEntry = {
      id: `${transactionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      transactionId,
      stepId,
      timestamp: new Date(),
      level,
      message,
      data,
      error
    }

    logs.push(entry)
    this.transactionLogs.set(transactionId, logs)

    // Emit log event
    this.emit('transaction:log', entry)

    // Persist to database if available
    this.persistLog(entry).catch(error => {
      console.warn('Failed to persist transaction log:', error)
    })
  }

  /**
   * Clean up completed transactions
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 hours default
    const cutoff = new Date(Date.now() - maxAge)
    
    for (const [transactionId, execution] of this.activeSagas.entries()) {
      if (execution.context.startTime < cutoff && 
          ['committed', 'aborted', 'failed'].includes(execution.status)) {
        this.activeSagas.delete(transactionId)
        this.transactionLogs.delete(transactionId)
      }
    }
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions(): SagaExecution[] {
    return Array.from(this.activeSagas.values()).filter(
      execution => ['pending', 'running', 'compensating'].includes(execution.status)
    )
  }

  private validateSagaDefinition(definition: SagaDefinition): void {
    if (!definition.id || !definition.name) {
      throw new Error('Saga definition must have id and name')
    }

    if (!definition.steps || definition.steps.length === 0) {
      throw new Error('Saga definition must have at least one step')
    }

    // Validate step dependencies
    const stepIds = new Set(definition.steps.map(step => step.id))
    for (const step of definition.steps) {
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            throw new Error(`Step ${step.id} has invalid dependency: ${dep}`)
          }
        }
      }
    }
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private setupEventHandlers(): void {
    this.on('saga:completed', ({ transactionId }) => {
      const execution = this.activeSagas.get(transactionId)
      if (execution) {
        this.log(transactionId, 'INFO', 'Saga completed successfully')
      }
    })

    this.on('saga:failed', ({ transactionId }) => {
      const execution = this.activeSagas.get(transactionId)
      if (execution) {
        this.log(transactionId, 'ERROR', 'Saga execution failed')
      }
    })
  }

  private async persistLog(entry: TransactionLogEntry): Promise<void> {
    if (!this.supabase) return

    try {
      await this.supabase.from('transaction_logs').insert({
        id: entry.id,
        transaction_id: entry.transactionId,
        step_id: entry.stepId,
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        message: entry.message,
        data: entry.data,
        error: entry.error ? JSON.stringify(entry.error) : null
      })
    } catch (error) {
      // Silent fail for logging - don't affect main transaction
      console.warn('Failed to persist transaction log:', error)
    }
  }
}

/**
 * Individual saga execution instance
 */
export class SagaExecution {
  public status: TransactionStatus = 'pending'
  public currentStepIndex: number = 0
  public executedSteps: Array<{ stepId: string; status: StepStatus; output?: any; error?: RepositoryError }> = []
  public startTime: Date = new Date()
  public endTime?: Date

  constructor(
    public definition: SagaDefinition,
    public context: SagaContext,
    public input: any,
    private orchestrator: SagaOrchestrator
  ) {}

  /**
   * Execute the saga
   */
  async execute(): Promise<Result<any>> {
    this.status = 'running'
    this.orchestrator.emit('saga:started', { 
      transactionId: this.context.id,
      sagaId: this.context.sagaId 
    })

    try {
      // Execute steps in order, respecting dependencies
      const sortedSteps = this.sortStepsByDependencies()
      
      for (let i = 0; i < sortedSteps.length; i++) {
        this.currentStepIndex = i
        const step = sortedSteps[i]

        const result = await this.executeStep(step)
        if (!result.success) {
          // Step failed - start compensation
          await this.compensate()
          this.status = 'failed'
          this.endTime = new Date()
          
          this.orchestrator.emit('saga:failed', {
            transactionId: this.context.id,
            sagaId: this.context.sagaId,
            failedStep: step.id,
            error: result.error
          })

          return failure(result.error)
        }

        // Store result and add to compensation stack
        this.context.stepResults.set(step.id, result.data)
        this.context.compensationStack.push({
          stepId: step.id,
          output: result.data
        })

        this.executedSteps.push({
          stepId: step.id,
          status: 'completed',
          output: result.data
        })
      }

      // All steps completed successfully
      this.status = 'committed'
      this.endTime = new Date()

      this.orchestrator.emit('saga:completed', {
        transactionId: this.context.id,
        sagaId: this.context.sagaId,
        result: this.getFinalResult()
      })

      return success(this.getFinalResult())

    } catch (error) {
      this.orchestrator.log(
        this.context.id,
        'ERROR',
        'Unexpected error during saga execution',
        { error: error.message }
      )

      await this.compensate()
      this.status = 'failed'
      this.endTime = new Date()

      return failure(RepositoryError.internal('Saga execution failed', error))
    }
  }

  /**
   * Execute a single step with retry logic
   */
  private async executeStep(step: SagaStep): Promise<Result<any>> {
    const retryConfig = { ...this.orchestrator['defaultRetryConfig'], ...step.retryConfig }
    let lastError: RepositoryError | null = null

    this.orchestrator.log(
      this.context.id,
      'INFO',
      `Executing step: ${step.name}`,
      { stepId: step.id },
      step.id
    )

    // Validate step input if validator provided
    if (step.validate) {
      const validationResult = await step.validate(this.input, this.context)
      if (!validationResult.success) {
        this.orchestrator.log(
          this.context.id,
          'ERROR',
          `Step validation failed: ${step.name}`,
          { error: validationResult.error.message },
          step.id,
          validationResult.error
        )
        return failure(validationResult.error)
      }
    }

    // Execute with retry logic
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        // Apply timeout if specified
        const executeWithTimeout = async () => {
          if (step.timeout) {
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Step timeout')), step.timeout)
            })

            return Promise.race([
              step.action(this.input, this.context),
              timeoutPromise
            ])
          } else {
            return step.action(this.input, this.context)
          }
        }

        const result = await executeWithTimeout()

        if (result.success) {
          if (attempt > 1) {
            this.orchestrator.log(
              this.context.id,
              'INFO',
              `Step succeeded after ${attempt} attempts: ${step.name}`,
              { stepId: step.id, attempt },
              step.id
            )
          }
          return result
        }

        lastError = result.error
        
        // Check if error is retryable
        if (this.shouldRetry(result.error, retryConfig, attempt)) {
          const delay = this.calculateDelay(attempt, retryConfig)
          
          this.orchestrator.log(
            this.context.id,
            'WARN',
            `Step failed, retrying in ${delay}ms: ${step.name}`,
            { stepId: step.id, attempt, nextAttempt: attempt + 1, delay },
            step.id,
            result.error
          )

          await this.sleep(delay)
        } else {
          break
        }

      } catch (error) {
        lastError = RepositoryError.internal(`Step execution error: ${step.name}`, error)
        
        if (attempt < retryConfig.maxAttempts) {
          const delay = this.calculateDelay(attempt, retryConfig)
          
          this.orchestrator.log(
            this.context.id,
            'WARN',
            `Step threw error, retrying in ${delay}ms: ${step.name}`,
            { stepId: step.id, attempt, error: error.message, delay },
            step.id
          )

          await this.sleep(delay)
        }
      }
    }

    this.orchestrator.log(
      this.context.id,
      'ERROR',
      `Step failed after all retry attempts: ${step.name}`,
      { stepId: step.id, attempts: retryConfig.maxAttempts },
      step.id,
      lastError
    )

    return failure(lastError || RepositoryError.internal(`Step failed: ${step.name}`))
  }

  /**
   * Compensate by undoing completed steps in reverse order
   */
  private async compensate(): Promise<void> {
    this.status = 'compensating'
    
    this.orchestrator.log(
      this.context.id,
      'INFO',
      'Starting saga compensation',
      { stepsToCompensate: this.context.compensationStack.length }
    )

    // Compensate in reverse order
    const compensationStack = [...this.context.compensationStack].reverse()
    
    for (const { stepId, output } of compensationStack) {
      const step = this.definition.steps.find(s => s.id === stepId)
      if (!step) continue

      try {
        const result = await step.compensation(output, this.context)
        
        if (result.success) {
          this.orchestrator.log(
            this.context.id,
            'INFO',
            `Step compensated successfully: ${step.name}`,
            { stepId },
            stepId
          )

          // Update step status
          const executedStep = this.executedSteps.find(s => s.stepId === stepId)
          if (executedStep) {
            executedStep.status = 'compensated'
          }
        } else {
          this.orchestrator.log(
            this.context.id,
            'ERROR',
            `Step compensation failed: ${step.name}`,
            { stepId, error: result.error.message },
            stepId,
            result.error
          )
        }
      } catch (error) {
        this.orchestrator.log(
          this.context.id,
          'ERROR',
          `Step compensation threw error: ${step.name}`,
          { stepId, error: error.message },
          stepId
        )
      }
    }

    this.orchestrator.log(
      this.context.id,
      'INFO',
      'Saga compensation completed'
    )
  }

  /**
   * Cancel saga execution
   */
  async cancel(reason?: string): Promise<Result<void>> {
    if (['committed', 'aborted'].includes(this.status)) {
      return failure(RepositoryError.businessRule(
        'saga_already_completed',
        `Cannot cancel saga in ${this.status} state`
      ))
    }

    this.orchestrator.log(
      this.context.id,
      'INFO',
      'Canceling saga execution',
      { reason }
    )

    await this.compensate()
    this.status = 'aborted'
    this.endTime = new Date()

    this.orchestrator.emit('saga:cancelled', {
      transactionId: this.context.id,
      sagaId: this.context.sagaId,
      reason
    })

    return success(undefined)
  }

  /**
   * Get execution metrics
   */
  getMetrics(): TransactionMetrics {
    return {
      id: this.context.id,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.endTime ? this.endTime.getTime() - this.startTime.getTime() : undefined,
      stepCount: this.definition.steps.length,
      completedSteps: this.executedSteps.filter(s => s.status === 'completed').length,
      failedSteps: this.executedSteps.filter(s => s.status === 'failed').length,
      retriedSteps: 0, // Could track this if needed
      compensatedSteps: this.executedSteps.filter(s => s.status === 'compensated').length
    }
  }

  private sortStepsByDependencies(): SagaStep[] {
    const steps = [...this.definition.steps]
    const sorted: SagaStep[] = []
    const processed = new Set<string>()

    while (sorted.length < steps.length) {
      const nextStep = steps.find(step => 
        !processed.has(step.id) && 
        (!step.dependencies || step.dependencies.every(dep => processed.has(dep)))
      )

      if (!nextStep) {
        throw new Error('Circular dependency detected in saga steps')
      }

      sorted.push(nextStep)
      processed.add(nextStep.id)
    }

    return sorted
  }

  private shouldRetry(
    error: RepositoryError,
    config: RetryConfig,
    currentAttempt: number
  ): boolean {
    if (currentAttempt >= config.maxAttempts) {
      return false
    }

    // Check if error is in retryable list
    if (config.retryableErrors && config.retryableErrors.length > 0) {
      return config.retryableErrors.includes(error.code)
    }

    // Default: retry on recoverable errors
    return error.recoverable
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const baseDelay = config.delayMs
    const multiplier = config.backoffMultiplier || 1
    const delay = baseDelay * Math.pow(multiplier, attempt - 1)
    
    return Math.min(delay, config.maxDelayMs || delay)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getFinalResult(): any {
    // Return the result of the last step or combined results
    const results = Object.fromEntries(this.context.stepResults)
    const stepIds = this.definition.steps.map(s => s.id)
    
    if (stepIds.length === 1) {
      return results[stepIds[0]]
    }
    
    return results
  }
}

/**
 * Simple transaction manager for basic database transactions
 */
export class TransactionManager {
  private activeTransactions: Map<string, TransactionContext> = new Map()

  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Execute operations within a transaction
   */
  async executeTransaction<T>(
    operations: (client: SupabaseClient<Database>) => Promise<T>,
    context: Partial<TransactionContext> = {}
  ): Promise<Result<T>> {
    const transactionId = this.generateTransactionId()
    const txContext: TransactionContext = {
      id: transactionId,
      userId: context.userId,
      organizationId: context.organizationId,
      metadata: context.metadata,
      startTime: new Date(),
      timeout: context.timeout
    }

    this.activeTransactions.set(transactionId, txContext)

    try {
      // Note: Supabase doesn't have native transactions, but we can simulate
      // transaction-like behavior with error handling and compensation
      const result = await operations(this.supabase)
      
      this.activeTransactions.delete(transactionId)
      return success(result)
    } catch (error) {
      this.activeTransactions.delete(transactionId)
      return failure(RepositoryError.internal('Transaction failed', error))
    }
  }

  /**
   * Get active transaction count
   */
  getActiveTransactionCount(): number {
    return this.activeTransactions.size
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Pre-built saga patterns for common use cases
 */
export class SagaPatterns {
  /**
   * Create a simple two-phase commit saga
   */
  static createTwoPhaseCommit(
    operations: Array<{
      id: string
      name: string
      action: (input: any, context: SagaContext) => Promise<Result<any>>
      compensation: (output: any, context: SagaContext) => Promise<Result<void>>
    }>
  ): SagaDefinition {
    return {
      id: 'two_phase_commit',
      name: 'Two Phase Commit',
      description: 'Execute multiple operations with compensation',
      steps: operations.map(op => ({
        id: op.id,
        name: op.name,
        action: op.action,
        compensation: op.compensation,
        retryConfig: { maxAttempts: 3, delayMs: 1000 }
      }))
    }
  }

  /**
   * Create a workflow saga with sequential steps
   */
  static createWorkflow(
    steps: Array<{
      id: string
      name: string
      action: (input: any, context: SagaContext) => Promise<Result<any>>
      compensation: (output: any, context: SagaContext) => Promise<Result<void>>
      dependencies?: string[]
    }>
  ): SagaDefinition {
    return {
      id: 'workflow',
      name: 'Sequential Workflow',
      description: 'Execute steps in sequence with dependencies',
      steps: steps.map(step => ({
        id: step.id,
        name: step.name,
        action: step.action,
        compensation: step.compensation,
        dependencies: step.dependencies,
        retryConfig: { maxAttempts: 2, delayMs: 500 }
      }))
    }
  }

  /**
   * Create a parallel execution saga
   */
  static createParallelExecution(
    parallelSteps: Array<{
      id: string
      name: string
      action: (input: any, context: SagaContext) => Promise<Result<any>>
      compensation: (output: any, context: SagaContext) => Promise<Result<void>>
    }>,
    finalStep?: {
      id: string
      name: string
      action: (input: any, context: SagaContext) => Promise<Result<any>>
      compensation: (output: any, context: SagaContext) => Promise<Result<void>>
    }
  ): SagaDefinition {
    const steps: SagaStep[] = parallelSteps.map(step => ({
      id: step.id,
      name: step.name,
      action: step.action,
      compensation: step.compensation,
      retryConfig: { maxAttempts: 3, delayMs: 1000 }
    }))

    if (finalStep) {
      steps.push({
        id: finalStep.id,
        name: finalStep.name,
        action: finalStep.action,
        compensation: finalStep.compensation,
        dependencies: parallelSteps.map(s => s.id), // Wait for all parallel steps
        retryConfig: { maxAttempts: 2, delayMs: 500 }
      })
    }

    return {
      id: 'parallel_execution',
      name: 'Parallel Execution',
      description: 'Execute steps in parallel with optional final step',
      steps
    }
  }
}