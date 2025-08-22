import { RepositoryFactory } from '../repositories'
import {
  Result,
  RepositoryError,
  ErrorCode,
  ErrorCategory,
  success,
  failure,
  wrapAsync,
  wrapAsyncWithTimeout,
  withRecovery,
  RetryStrategy,
  FallbackStrategy,
  CacheStrategy,
  type RecoveryStrategy
} from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export abstract class BaseService {
  protected repositories: RepositoryFactory
  protected supabase: SupabaseClient<Database>
  private recoveryStrategies: Map<string, RecoveryStrategy<any>[]> = new Map()

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
    this.repositories = new RepositoryFactory(supabase)
    this.setupDefaultRecoveryStrategies()
  }

  /**
   * Get current authenticated user with Result pattern
   */
  protected async getCurrentUser(): Promise<Result<any>> {
    return wrapAsync(async () => {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      if (error) {
        throw RepositoryError.unauthorized('Authentication failed', error.message)
      }
      if (!user) {
        throw RepositoryError.unauthorized('No authenticated user found')
      }
      return user
    })
  }

  /**
   * Check if user has permission for a resource with Result pattern
   */
  protected async checkPermission(
    userId: string, 
    resource: string, 
    action: string,
    resourceId?: string
  ): Promise<Result<boolean>> {
    return wrapAsync(async () => {
      // TODO: Implement actual permission checking logic
      // This would integrate with your permission system
      
      // For now, return true as placeholder but in real implementation
      // this would check against roles, permissions, etc.
      const hasPermission = true // Placeholder logic
      
      if (!hasPermission) {
        throw RepositoryError.forbidden(action, `Insufficient permissions for ${resource}`)
      }
      
      return hasPermission
    })
  }

  /**
   * Log service activity for audit purposes with Result pattern
   */
  protected async logActivity(
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, unknown>
  ): Promise<Result<void>> {
    const userResult = await this.getCurrentUser()
    if (userResult.success === false) {
      // If we can't get user, log anonymously or skip
      console.warn('Could not get user for audit logging:', userResult.error)
      return success(undefined)
    }
    
    return wrapAsync(async () => {
      const { error } = await this.supabase.from('audit_logs').insert({
        user_id: userResult.data.id,
        event_type: 'user_action',
        event_category: 'service',
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        event_description: `${action} ${resourceType}${resourceId ? ` ${resourceId}` : ''}`,
        details,
        severity: 'low',
        outcome: 'success',
      } as any)
      
      if (error) {
        throw RepositoryError.database('Failed to log activity', error, 'insert audit_logs')
      }
    })
  }

  /**
   * Handle service errors consistently with Result pattern
   */
  protected async handleError<T>(error: any, operation: string, context?: Record<string, unknown>): Promise<Result<T>> {
    console.error(`Service error in ${operation}:`, error, context)
    
    // Log error for monitoring (non-blocking)
    this.logActivity(`error_${operation}`, 'service', undefined, {
      error: error.message || String(error),
      context,
      stack: error.stack,
    }).catch(() => {}) // Silent fail for logging

    // Convert to RepositoryError if it isn't already
    if (error instanceof RepositoryError) {
      return failure(error)
    }
    
    // Map common error patterns to appropriate RepositoryErrors
    if (error.code === 'PGRST116') {
      return failure(RepositoryError.notFound('Resource'))
    } else if (error.code === '23505') {
      return failure(RepositoryError.conflict('Resource', 'Duplicate entry'))
    } else if (error.code === '23503') {
      return failure(RepositoryError.validation('Referenced resource not found'))
    } else if (error.message?.toLowerCase().includes('permission')) {
      return failure(RepositoryError.forbidden(operation, 'Permission denied'))
    } else if (error.message?.toLowerCase().includes('timeout')) {
      return failure(RepositoryError.timeout(operation, 30000))
    } else {
      return failure(RepositoryError.internal(
        `Operation failed: ${operation}`,
        error,
        { operation, context }
      ))
    }
  }

  /**
   * Validate input data with Result pattern
   */
  protected validateInput<T>(data: any, schema: any): Result<T> {
    try {
      const validated = schema.parse(data)
      return success(validated)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return failure(RepositoryError.validation(
        `Invalid input: ${message}`,
        { originalData: data, validationError: error },
        'input_validation'
      ))
    }
  }

  /**
   * Execute operation with retry logic using Result pattern
   */
  protected async retry<T>(
    operation: () => Promise<Result<T>>,
    maxAttempts: number = 3,
    delay: number = 1000,
    operationName = 'operation'
  ): Promise<Result<T>> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await operation()
      
      if (result.success) {
        return result
      }
      
      // Check if this error type should be retried
      if (result.error instanceof RepositoryError) {
        const shouldRetry = result.error.recoverable && (
          result.error.code === ErrorCode.NETWORK_ERROR ||
          result.error.code === ErrorCode.TIMEOUT ||
          result.error.code === ErrorCode.CONNECTION_FAILED ||
          result.error.code === ErrorCode.SERVICE_UNAVAILABLE
        )
        
        if (!shouldRetry || attempt === maxAttempts) {
          return result
        }
      } else if (attempt === maxAttempts) {
        return result
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
    }
    
    return failure(RepositoryError.internal(
      `All retry attempts failed for ${operationName}`,
      undefined,
      { maxAttempts, operationName }
    ))
  }

  /**
   * Execute multiple operations in parallel with Result pattern
   */
  protected async parallel<T>(
    operations: (() => Promise<Result<T>>)[],
    failFast = false
  ): Promise<Result<T[]>> {
    const results = await Promise.all(operations.map(op => op()))
    
    const successes: T[] = []
    const failures: RepositoryError[] = []
    
    for (const result of results) {
      if (result.success) {
        successes.push(result.data)
      } else {
        failures.push(result.error as RepositoryError)
        if (failFast) {
          return failure(result.error as RepositoryError)
        }
      }
    }
    
    if (failures.length > 0 && !failFast) {
      return failure(RepositoryError.internal(
        `${failures.length} of ${operations.length} parallel operations failed`,
        undefined,
        {
          successCount: successes.length,
          failureCount: failures.length,
          failures: failures.map(f => ({ code: f.code, message: f.message }))
        }
      ))
    }
    
    return success(successes)
  }

  /**
   * Create pagination metadata with validation
   */
  protected createPaginationMeta(
    total: number,
    page: number = 1,
    limit: number = 20
  ): Result<{
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }> {
    if (page < 1) {
      return failure(RepositoryError.validation('Page number must be greater than 0'))
    }
    
    if (limit < 1 || limit > 100) {
      return failure(RepositoryError.validation('Limit must be between 1 and 100'))
    }
    
    if (total < 0) {
      return failure(RepositoryError.validation('Total must be non-negative'))
    }
    
    const totalPages = Math.ceil(total / limit)
    
    return success({
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    })
  }

  /**
   * Setup default recovery strategies for common errors
   */
  private setupDefaultRecoveryStrategies(): void {
    // Network errors - retry strategy
    this.recoveryStrategies.set('network_operations', [
      RetryStrategy(
        async () => failure(RepositoryError.internal('Placeholder')), // This will be overridden
        3,
        1000
      )
    ])
    
    // External service errors - retry with fallback
    this.recoveryStrategies.set('external_services', [
      RetryStrategy(
        async () => failure(RepositoryError.externalService('service', 'error')),
        2,
        2000
      ),
      FallbackStrategy(null) // Fallback to null/empty result
    ])
  }

  /**
   * Execute operation with configured recovery strategies
   */
  protected async executeWithRecovery<T>(
    operation: () => Promise<Result<T>>,
    strategyKey?: string
  ): Promise<Result<T>> {
    const result = await operation()
    
    if (result.success || !strategyKey) {
      return result
    }
    
    const strategies = this.recoveryStrategies.get(strategyKey)
    if (!strategies) {
      return result
    }
    
    return withRecovery(result, strategies)
  }

  /**
   * Execute operation with timeout and recovery
   */
  protected async executeWithTimeoutAndRecovery<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string,
    recoveryKey?: string
  ): Promise<Result<T>> {
    const wrappedOperation = () => wrapAsyncWithTimeout(
      operation,
      timeoutMs,
      operationName
    )
    
    return this.executeWithRecovery(wrappedOperation, recoveryKey)
  }

  /**
   * Helper method for common database operations with error handling
   */
  protected async executeDbOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, unknown>
  ): Promise<Result<T>> {
    try {
      const result = await this.executeWithTimeoutAndRecovery(
        operation,
        10000, // 10 second timeout
        operationName,
        'network_operations'
      )
      
      if (!result.success) {
        await this.logActivity(`db_error_${operationName}`, 'database', undefined, {
          error: result.error instanceof Error ? result.error.message : String(result.error),
          context
        })
      }
      
      return result
    } catch (error) {
      return this.handleError(error, operationName, context)
    }
  }

  /**
   * Helper method for validation with detailed error context
   */
  protected validateWithContext<T>(
    data: any,
    schema: any,
    context: string,
    fieldName?: string
  ): Result<T> {
    const validationResult = this.validateInput<T>(data, schema)
    
    if (!validationResult.success) {
      // Enhance error with context information
      const enhancedError = new RepositoryError(
        `Validation failed for ${context}: ${validationResult.error.message}`,
        validationResult.error.code,
        validationResult.error.category,
        {
          ...validationResult.error.details,
          context,
          fieldName,
          originalData: data
        },
        validationResult.error.originalError,
        { context, fieldName },
        true, // validation errors are recoverable
        'low'
      )
      
      return failure(enhancedError)
    }
    
    return validationResult
  }

  /**
   * Helper method to check permissions with detailed error context
   */
  protected async checkPermissionWithContext(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string,
    additionalContext?: Record<string, unknown>
  ): Promise<Result<boolean>> {
    const permissionResult = await this.checkPermission(userId, resource, action, resourceId)
    
    if (!permissionResult.success) {
      // Log permission denial
      await this.logActivity(`permission_denied_${action}`, resource, resourceId, {
        userId,
        action,
        resource,
        resourceId,
        ...additionalContext
      })
    }
    
    return permissionResult
  }
}