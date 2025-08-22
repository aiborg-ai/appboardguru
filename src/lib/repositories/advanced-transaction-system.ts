/**
 * Advanced Transaction System - Comprehensive Integration
 * 
 * This module provides a unified interface for all advanced transaction capabilities
 * including ACID compliance, optimistic locking, cross-domain coordination,
 * sophisticated rollback strategies, and comprehensive monitoring.
 */

import { Result, success, failure, RepositoryError } from './result'
import { BaseRepository } from './base.repository'
import { TransactionCoordinator, TransactionOptions, TransactionUtils } from './transaction-coordinator'
import { CrossDomainTransactionCoordinator, DomainOperation, DomainTransactionContext } from './cross-domain-transaction'
import { OptimisticLockingManager, OptimisticUpdateRequest, VersionedEntity } from './optimistic-locking'
import { RollbackManager, RollbackContext, RollbackStrategy, FailureScenario } from './rollback-strategies'
import { ConnectionPoolOptimizer, ConnectionPoolFactory } from './connection-pool-optimizer'
import { TransactionMonitor, TransactionMonitoringFactory, TransactionEvent } from './transaction-monitoring'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// Unified configuration for the entire transaction system
export interface AdvancedTransactionConfig {
  // Core transaction settings
  enableACIDCompliance: boolean
  defaultIsolationLevel: 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE'
  maxConcurrentTransactions: number
  defaultTimeoutMs: number

  // Optimistic locking settings
  enableOptimisticLocking: boolean
  lockTimeoutMs: number
  maxRetries: number

  // Cross-domain transaction settings
  enableCrossDomainTransactions: boolean
  enableEventSourcing: boolean
  sagaTimeoutMs: number

  // Rollback settings
  enableAdvancedRollback: boolean
  enableCheckpoints: boolean
  rollbackStrategy: RollbackStrategy

  // Connection pool settings
  connectionPool: {
    minConnections: number
    maxConnections: number
    enableOptimization: boolean
    enableLoadBalancing: boolean
  }

  // Monitoring settings
  enableMonitoring: boolean
  enableRealTimeMetrics: boolean
  enableAnomalyDetection: boolean
  metricsRetentionDays: number
}

// Transaction execution context with all capabilities
export interface AdvancedTransactionContext {
  id: string
  type: 'SIMPLE' | 'OPTIMISTIC' | 'CROSS_DOMAIN' | 'SAGA'
  isolationLevel: string
  userId?: string
  organizationId?: string
  enableMonitoring: boolean
  enableRollback: boolean
  rollbackStrategy: RollbackStrategy
  metadata?: Record<string, unknown>
}

// Comprehensive transaction result
export interface AdvancedTransactionResult<T = any> {
  transactionId: string
  type: string
  success: boolean
  data?: T
  error?: RepositoryError
  metrics: {
    duration: number
    operationCount: number
    rollbackCount: number
    retryCount: number
    lockWaitTime: number
  }
  events: TransactionEvent[]
  rollbackOperations: Array<{
    id: string
    success: boolean
    error?: RepositoryError
  }>
}

/**
 * Advanced Transaction System - Main Orchestrator
 */
export class AdvancedTransactionSystem {
  private transactionCoordinator: TransactionCoordinator
  private crossDomainCoordinator: CrossDomainTransactionCoordinator
  private optimisticLockingManager: OptimisticLockingManager
  private rollbackManager: RollbackManager
  private connectionPool: ConnectionPoolOptimizer
  private monitor?: TransactionMonitor
  private activeTransactions: Map<string, AdvancedTransactionContext> = new Map()

  constructor(
    private supabase: SupabaseClient<Database>,
    private config: AdvancedTransactionConfig
  ) {
    this.initializeComponents()
    this.setupEventHandlers()
  }

  /**
   * Execute a simple ACID transaction
   */
  async executeTransaction<T>(
    operations: Array<() => Promise<Result<T>>>,
    options: Partial<TransactionOptions & { 
      context?: Partial<AdvancedTransactionContext> 
    }> = {}
  ): Promise<Result<AdvancedTransactionResult<T[]>>> {
    const transactionId = this.generateTransactionId()
    const context = this.createTransactionContext(transactionId, 'SIMPLE', options.context)
    
    this.activeTransactions.set(transactionId, context)

    if (context.enableMonitoring && this.monitor) {
      this.monitor.recordEvent({
        type: 'TRANSACTION_STARTED',
        transactionId,
        timestamp: new Date(),
        metadata: { operationCount: operations.length, type: 'SIMPLE' }
      })
    }

    try {
      const startTime = Date.now()
      
      let result: Result<T[]>
      
      if (this.config.enableACIDCompliance) {
        result = await TransactionUtils.withTransaction(
          this.transactionCoordinator,
          operations,
          {
            mode: 'SINGLE_DOMAIN',
            isolationLevel: this.config.defaultIsolationLevel,
            timeout: options.timeout || this.config.defaultTimeoutMs,
            enableOptimisticLocking: this.config.enableOptimisticLocking,
            enableMetrics: context.enableMonitoring,
            ...options
          }
        )
      } else {
        // Fallback to basic execution
        const results: T[] = []
        for (const operation of operations) {
          const opResult = await operation()
          if (opResult.success) {
            results.push(opResult.data)
          } else {
            result = failure(opResult.error)
            break
          }
        }
        if (!result!) {
          result = success(results)
        }
      }

      const duration = Date.now() - startTime
      
      const transactionResult: AdvancedTransactionResult<T[]> = {
        transactionId,
        type: 'SIMPLE',
        success: result.success,
        data: result.success ? result.data : undefined,
        error: result.success ? undefined : result.error,
        metrics: {
          duration,
          operationCount: operations.length,
          rollbackCount: 0,
          retryCount: 0,
          lockWaitTime: 0
        },
        events: [],
        rollbackOperations: []
      }

      if (context.enableMonitoring && this.monitor) {
        this.monitor.recordEvent({
          type: result.success ? 'TRANSACTION_COMMITTED' : 'TRANSACTION_ABORTED',
          transactionId,
          timestamp: new Date(),
          duration,
          metadata: { success: result.success, operationCount: operations.length }
        })
      }

      return success(transactionResult)

    } catch (error) {
      const transactionResult: AdvancedTransactionResult<T[]> = {
        transactionId,
        type: 'SIMPLE',
        success: false,
        error: RepositoryError.internal('Transaction execution failed', error),
        metrics: {
          duration: Date.now() - Date.now(),
          operationCount: operations.length,
          rollbackCount: 0,
          retryCount: 0,
          lockWaitTime: 0
        },
        events: [],
        rollbackOperations: []
      }

      return failure(RepositoryError.internal('Advanced transaction failed', error))
    } finally {
      this.activeTransactions.delete(transactionId)
    }
  }

  /**
   * Execute transaction with optimistic locking
   */
  async executeWithOptimisticLocking<T extends VersionedEntity>(
    entity: T,
    updateRequest: OptimisticUpdateRequest<T>,
    options: {
      conflictResolution?: 'FAIL_FAST' | 'RETRY_AUTOMATIC' | 'MERGE_FIELDS'
      maxRetries?: number
      context?: Partial<AdvancedTransactionContext>
    } = {}
  ): Promise<Result<AdvancedTransactionResult<T>>> {
    if (!this.config.enableOptimisticLocking) {
      return failure(RepositoryError.businessRule(
        'optimistic_locking_disabled',
        'Optimistic locking is not enabled in configuration'
      ))
    }

    const transactionId = this.generateTransactionId()
    const context = this.createTransactionContext(transactionId, 'OPTIMISTIC', options.context)
    
    this.activeTransactions.set(transactionId, context)

    try {
      const startTime = Date.now()
      
      const result = await this.optimisticLockingManager.updateWithOptimisticLocking(
        updateRequest,
        {
          strategy: options.conflictResolution || 'FAIL_FAST',
          maxRetries: options.maxRetries || this.config.maxRetries
        }
      )

      const duration = Date.now() - startTime

      const transactionResult: AdvancedTransactionResult<T> = {
        transactionId,
        type: 'OPTIMISTIC',
        success: result.success,
        data: result.success ? result.data.entity : undefined,
        error: result.success ? undefined : result.error,
        metrics: {
          duration,
          operationCount: 1,
          rollbackCount: 0,
          retryCount: result.success ? result.data.retryCount || 0 : 0,
          lockWaitTime: 0
        },
        events: [],
        rollbackOperations: []
      }

      return success(transactionResult)

    } catch (error) {
      return failure(RepositoryError.internal('Optimistic locking transaction failed', error))
    } finally {
      this.activeTransactions.delete(transactionId)
    }
  }

  /**
   * Execute cross-domain transaction
   */
  async executeCrossDomainTransaction(
    operations: DomainOperation[],
    context: Partial<DomainTransactionContext> = {},
    options: {
      enableEventSourcing?: boolean
      compensationStrategy?: 'IMMEDIATE' | 'DEFERRED' | 'PARALLEL'
      context?: Partial<AdvancedTransactionContext>
    } = {}
  ): Promise<Result<AdvancedTransactionResult<any[]>>> {
    if (!this.config.enableCrossDomainTransactions) {
      return failure(RepositoryError.businessRule(
        'cross_domain_disabled',
        'Cross-domain transactions are not enabled in configuration'
      ))
    }

    const transactionId = this.generateTransactionId()
    const txContext = this.createTransactionContext(transactionId, 'CROSS_DOMAIN', options.context)
    
    this.activeTransactions.set(transactionId, txContext)

    try {
      const domainContext: DomainTransactionContext = {
        transactionId,
        correlationId: this.generateCorrelationId(),
        startTime: new Date(),
        timeout: this.config.sagaTimeoutMs,
        initiator: { service: 'advanced-transaction-system' },
        ...context
      }

      const executionPlan = {
        enableEventSourcing: options.enableEventSourcing || this.config.enableEventSourcing,
        compensationStrategy: options.compensationStrategy || 'SEQUENTIAL',
        timeoutMs: this.config.sagaTimeoutMs
      }

      const result = await this.crossDomainCoordinator.executeTransaction(
        operations,
        domainContext,
        executionPlan
      )

      if (result.success) {
        const transactionResult: AdvancedTransactionResult<any[]> = {
          transactionId,
          type: 'CROSS_DOMAIN',
          success: true,
          data: Array.from(result.data.results.values()),
          metrics: {
            duration: result.data.metrics.totalDuration,
            operationCount: result.data.metrics.operationCount,
            rollbackCount: result.data.metrics.compensationCount,
            retryCount: result.data.metrics.retryCount,
            lockWaitTime: 0
          },
          events: result.data.events,
          rollbackOperations: result.data.compensations.map(comp => ({
            id: comp.operationId,
            success: comp.success,
            error: comp.error
          }))
        }

        return success(transactionResult)
      } else {
        return failure(result.error)
      }

    } catch (error) {
      return failure(RepositoryError.internal('Cross-domain transaction failed', error))
    } finally {
      this.activeTransactions.delete(transactionId)
    }
  }

  /**
   * Execute saga-based transaction with explicit compensation
   */
  async executeSaga<T>(
    steps: Array<{
      domain: string
      operation: string
      input: any
      compensate?: () => Promise<Result<void>>
      description: string
    }>,
    context: Partial<DomainTransactionContext> = {}
  ): Promise<Result<AdvancedTransactionResult<T[]>>> {
    const operations: DomainOperation[] = steps.map(step => ({
      domain: step.domain,
      operation: step.operation,
      input: step.input
    }))

    return this.executeCrossDomainTransaction(
      operations,
      context,
      {
        enableEventSourcing: true,
        compensationStrategy: 'DEFERRED',
        context: { type: 'SAGA' }
      }
    ) as Promise<Result<AdvancedTransactionResult<T[]>>>
  }

  /**
   * Manual rollback for failed transactions
   */
  async rollbackTransaction(
    transactionId: string,
    scenario: FailureScenario,
    rollbackOperations: Array<{
      id: string
      executor: () => Promise<Result<void>>
      description: string
    }>
  ): Promise<Result<AdvancedTransactionResult<void>>> {
    if (!this.config.enableAdvancedRollback) {
      return failure(RepositoryError.businessRule(
        'rollback_disabled',
        'Advanced rollback is not enabled in configuration'
      ))
    }

    const context = this.activeTransactions.get(transactionId)
    if (!context) {
      return failure(RepositoryError.notFound('Transaction', transactionId))
    }

    try {
      const rollbackContext: RollbackContext = {
        transactionId,
        failureScenario: scenario,
        failureDetails: {},
        strategy: context.rollbackStrategy,
        operations: rollbackOperations.map((op, index) => ({
          id: op.id,
          transactionId,
          operationId: op.id,
          type: 'UNDO',
          description: op.description,
          executor: op.executor,
          priority: rollbackOperations.length - index,
          maxRetries: 3,
          retryDelayMs: 1000
        })),
        checkpoints: new Map(),
        startTime: new Date()
      }

      const result = await this.rollbackManager.executeRollback(rollbackContext)

      if (result.success) {
        const transactionResult: AdvancedTransactionResult<void> = {
          transactionId,
          type: 'ROLLBACK',
          success: true,
          metrics: {
            duration: Date.now() - rollbackContext.startTime.getTime(),
            operationCount: rollbackOperations.length,
            rollbackCount: rollbackOperations.length,
            retryCount: result.data.reduce((sum, r) => sum + r.retryCount, 0),
            lockWaitTime: 0
          },
          events: [],
          rollbackOperations: result.data.map(r => ({
            id: r.operationId,
            success: r.success,
            error: r.error
          }))
        }

        return success(transactionResult)
      } else {
        return failure(result.error)
      }

    } catch (error) {
      return failure(RepositoryError.internal('Manual rollback failed', error))
    }
  }

  /**
   * Get system health and metrics
   */
  getSystemHealth(): {
    status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
    activeTransactions: number
    connectionPoolStatus: any
    recentAlerts: number
    performanceMetrics: any
    uptime: number
  } {
    const activeTransactions = this.activeTransactions.size
    const connectionPoolStats = this.connectionPool.getStatistics()
    const recentAlerts = this.monitor?.getActiveAlerts().length || 0
    const currentMetrics = this.monitor?.getCurrentMetrics()

    let status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY'

    if (recentAlerts > 5 || activeTransactions > this.config.maxConcurrentTransactions) {
      status = 'DEGRADED'
    }

    if (recentAlerts > 10 || connectionPoolStats.errorRate > 0.1) {
      status = 'CRITICAL'
    }

    return {
      status,
      activeTransactions,
      connectionPoolStatus: connectionPoolStats,
      recentAlerts,
      performanceMetrics: currentMetrics,
      uptime: Date.now() - this.startTime.getTime()
    }
  }

  /**
   * Get comprehensive system statistics
   */
  getSystemStatistics(timeRange?: { start: Date; end: Date }): {
    transactions: {
      total: number
      successful: number
      failed: number
      averageDuration: number
    }
    connectionPool: any
    monitoring: any
    rollbacks: {
      total: number
      successful: number
      failed: number
    }
  } {
    const connectionPoolStats = this.connectionPool.getStatistics()
    const monitoringStats = this.monitor?.getCurrentMetrics()
    const performanceAnalytics = timeRange && this.monitor 
      ? this.monitor.getPerformanceAnalytics(timeRange)
      : null

    return {
      transactions: performanceAnalytics ? {
        total: performanceAnalytics.totalTransactions,
        successful: performanceAnalytics.successfulTransactions,
        failed: performanceAnalytics.failedTransactions,
        averageDuration: performanceAnalytics.averageDuration
      } : {
        total: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0
      },
      connectionPool: connectionPoolStats,
      monitoring: monitoringStats,
      rollbacks: {
        total: 0, // Would need to be tracked
        successful: 0,
        failed: 0
      }
    }
  }

  /**
   * Shutdown system gracefully
   */
  async shutdown(): Promise<Result<void>> {
    try {
      // Wait for active transactions to complete
      const maxWaitMs = 30000 // 30 seconds
      const startTime = Date.now()
      
      while (this.activeTransactions.size > 0 && 
             (Date.now() - startTime) < maxWaitMs) {
        await this.sleep(1000)
      }

      // Shutdown components
      if (this.connectionPool) {
        await this.connectionPool.drain()
      }

      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal('System shutdown failed', error))
    }
  }

  private startTime = new Date()

  /**
   * Initialize all system components
   */
  private initializeComponents(): void {
    // Initialize connection pool
    const databaseConfig = {
      url: process.env['NEXT_PUBLIC_SUPABASE_URL'] || '',
      anonKey: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '',
      serviceKey: process.env['SUPABASE_SERVICE_ROLE_KEY']
    }

    if (this.config.connectionPool.enableOptimization) {
      this.connectionPool = ConnectionPoolFactory.createHighThroughputPool(databaseConfig)
    } else {
      this.connectionPool = ConnectionPoolFactory.createBalancedPool(databaseConfig)
    }

    // Initialize transaction coordinator
    this.transactionCoordinator = new TransactionCoordinator(this.supabase, {
      maxConcurrentTransactions: this.config.maxConcurrentTransactions,
      defaultTimeout: this.config.defaultTimeoutMs,
      enableDeadlockDetection: true,
      enableMetrics: this.config.enableMonitoring
    })

    // Initialize cross-domain coordinator
    if (this.config.enableCrossDomainTransactions) {
      this.crossDomainCoordinator = new CrossDomainTransactionCoordinator(this.supabase, {
        enableEventSourcing: this.config.enableEventSourcing,
        maxConcurrentTransactions: this.config.maxConcurrentTransactions,
        defaultTimeoutMs: this.config.sagaTimeoutMs,
        enableMetrics: this.config.enableMonitoring
      })
    }

    // Initialize optimistic locking manager
    if (this.config.enableOptimisticLocking) {
      this.optimisticLockingManager = new OptimisticLockingManager(this.supabase)
    }

    // Initialize rollback manager
    if (this.config.enableAdvancedRollback) {
      this.rollbackManager = new RollbackManager(this.supabase, {
        enableCheckpoints: this.config.enableCheckpoints,
        checkpointInterval: 5,
        maxRollbackRetries: 3,
        rollbackTimeoutMs: 60000,
        enablePartialRecovery: false,
        recoveryCriteria: {
          minSuccessRate: 0.7,
          maxFailureCount: 3,
          criticalOperations: []
        }
      })
    }

    // Initialize monitoring
    if (this.config.enableMonitoring) {
      this.monitor = TransactionMonitoringFactory.createProductionMonitor(this.supabase)
    }
  }

  /**
   * Setup event handlers for component coordination
   */
  private setupEventHandlers(): void {
    // Connection pool events
    if (this.connectionPool) {
      this.connectionPool.on('connection:error', (event) => {
        if (this.monitor) {
          this.monitor.recordEvent({
            type: 'OPERATION_FAILED',
            transactionId: 'system',
            timestamp: new Date(),
            metadata: { component: 'connection_pool', error: event.error }
          })
        }
      })
    }

    // Transaction coordinator events
    if (this.transactionCoordinator) {
      this.transactionCoordinator.on('saga:failed', (event) => {
        if (this.monitor) {
          this.monitor.recordEvent({
            type: 'TRANSACTION_ABORTED',
            transactionId: event.transactionId,
            timestamp: new Date(),
            metadata: { component: 'saga', error: event.error }
          })
        }
      })

      this.transactionCoordinator.on('deadlock:detected', (event) => {
        if (this.monitor) {
          this.monitor.recordEvent({
            type: 'DEADLOCK_DETECTED',
            transactionId: event.transactionIds[0] || 'unknown',
            timestamp: new Date(),
            metadata: { affectedTransactions: event.transactionIds }
          })
        }
      })
    }

    // Monitor alerts
    if (this.monitor) {
      this.monitor.on('alert:triggered', (alert) => {
        console.warn('Transaction system alert:', alert)
      })
    }
  }

  private createTransactionContext(
    transactionId: string,
    type: AdvancedTransactionContext['type'],
    override?: Partial<AdvancedTransactionContext>
  ): AdvancedTransactionContext {
    return {
      id: transactionId,
      type,
      isolationLevel: this.config.defaultIsolationLevel,
      enableMonitoring: this.config.enableMonitoring,
      enableRollback: this.config.enableAdvancedRollback,
      rollbackStrategy: this.config.rollbackStrategy,
      ...override
    }
  }

  private generateTransactionId(): string {
    return `adv_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Factory for creating pre-configured transaction systems
 */
export class AdvancedTransactionSystemFactory {
  /**
   * Create production-ready transaction system
   */
  static createProductionSystem(supabase: SupabaseClient<Database>): AdvancedTransactionSystem {
    const config: AdvancedTransactionConfig = {
      enableACIDCompliance: true,
      defaultIsolationLevel: 'READ_COMMITTED',
      maxConcurrentTransactions: 100,
      defaultTimeoutMs: 30000,
      
      enableOptimisticLocking: true,
      lockTimeoutMs: 10000,
      maxRetries: 3,
      
      enableCrossDomainTransactions: true,
      enableEventSourcing: true,
      sagaTimeoutMs: 300000, // 5 minutes
      
      enableAdvancedRollback: true,
      enableCheckpoints: true,
      rollbackStrategy: 'HYBRID',
      
      connectionPool: {
        minConnections: 10,
        maxConnections: 50,
        enableOptimization: true,
        enableLoadBalancing: true
      },
      
      enableMonitoring: true,
      enableRealTimeMetrics: true,
      enableAnomalyDetection: true,
      metricsRetentionDays: 7
    }

    return new AdvancedTransactionSystem(supabase, config)
  }

  /**
   * Create development transaction system
   */
  static createDevelopmentSystem(supabase: SupabaseClient<Database>): AdvancedTransactionSystem {
    const config: AdvancedTransactionConfig = {
      enableACIDCompliance: true,
      defaultIsolationLevel: 'READ_COMMITTED',
      maxConcurrentTransactions: 25,
      defaultTimeoutMs: 60000,
      
      enableOptimisticLocking: true,
      lockTimeoutMs: 5000,
      maxRetries: 2,
      
      enableCrossDomainTransactions: false,
      enableEventSourcing: false,
      sagaTimeoutMs: 60000,
      
      enableAdvancedRollback: false,
      enableCheckpoints: false,
      rollbackStrategy: 'IMMEDIATE',
      
      connectionPool: {
        minConnections: 2,
        maxConnections: 10,
        enableOptimization: false,
        enableLoadBalancing: false
      },
      
      enableMonitoring: false,
      enableRealTimeMetrics: false,
      enableAnomalyDetection: false,
      metricsRetentionDays: 1
    }

    return new AdvancedTransactionSystem(supabase, config)
  }

  /**
   * Create minimal transaction system for testing
   */
  static createTestSystem(supabase: SupabaseClient<Database>): AdvancedTransactionSystem {
    const config: AdvancedTransactionConfig = {
      enableACIDCompliance: false,
      defaultIsolationLevel: 'READ_COMMITTED',
      maxConcurrentTransactions: 5,
      defaultTimeoutMs: 30000,
      
      enableOptimisticLocking: false,
      lockTimeoutMs: 1000,
      maxRetries: 1,
      
      enableCrossDomainTransactions: false,
      enableEventSourcing: false,
      sagaTimeoutMs: 30000,
      
      enableAdvancedRollback: false,
      enableCheckpoints: false,
      rollbackStrategy: 'IMMEDIATE',
      
      connectionPool: {
        minConnections: 1,
        maxConnections: 3,
        enableOptimization: false,
        enableLoadBalancing: false
      },
      
      enableMonitoring: false,
      enableRealTimeMetrics: false,
      enableAnomalyDetection: false,
      metricsRetentionDays: 1
    }

    return new AdvancedTransactionSystem(supabase, config)
  }
}

// Re-export all major types and classes for easy access
export * from './transaction-coordinator'
export * from './cross-domain-transaction'
export * from './optimistic-locking'
export * from './rollback-strategies'
export * from './connection-pool-optimizer'
export * from './transaction-monitoring'