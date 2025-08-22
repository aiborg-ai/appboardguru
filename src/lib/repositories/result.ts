/**
 * Comprehensive Result pattern for functional error handling
 * Provides a consistent way to handle success/failure states across the application
 */

// Core Result types
export interface ResultSuccess<T> {
  success: true
  data: T
  metadata?: Record<string, unknown>
}

export interface ResultFailure<E = RepositoryError> {
  success: false
  error: E
  metadata?: Record<string, unknown>
}

export type Result<T, E = RepositoryError> = ResultSuccess<T> | ResultFailure<E>

// Domain-specific error categories
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  RESOURCE = 'RESOURCE',
  BUSINESS_RULE = 'BUSINESS_RULE',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  SYSTEM = 'SYSTEM'
}

// Comprehensive error codes
export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  VALUE_OUT_OF_RANGE = 'VALUE_OUT_OF_RANGE',
  
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  
  // Authorization errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ROLE_REQUIRED = 'ROLE_REQUIRED',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  RESOURCE_DELETED = 'RESOURCE_DELETED',
  
  // Business rule errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  WORKFLOW_VIOLATION = 'WORKFLOW_VIOLATION',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  DEADLINE_PASSED = 'DEADLINE_PASSED',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_TIMEOUT = 'QUERY_TIMEOUT',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  DNS_RESOLUTION_FAILED = 'DNS_RESOLUTION_FAILED',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED'
}

export class RepositoryError extends Error {
  public readonly code: ErrorCode
  public readonly category: ErrorCategory
  public readonly details?: Record<string, unknown>
  public readonly originalError?: unknown
  public readonly timestamp: Date
  public readonly context?: Record<string, unknown>
  public readonly recoverable: boolean
  public readonly severity: 'low' | 'medium' | 'high' | 'critical'

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    details?: Record<string, unknown>,
    originalError?: unknown,
    context?: Record<string, unknown>,
    recoverable = false,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message)
    this.name = 'RepositoryError'
    this.code = code
    this.category = category
    this.details = details
    this.originalError = originalError
    this.timestamp = new Date()
    this.context = context
    this.recoverable = recoverable
    this.severity = severity
  }

  static fromSupabaseError(error: any, operation?: string): RepositoryError {
    const message = error.message || 'Unknown database error'
    let code = ErrorCode.DATABASE_ERROR
    let category = ErrorCategory.DATABASE
    let recoverable = false
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    
    // Map specific Supabase error codes
    switch (error.code) {
      case 'PGRST116':
        code = ErrorCode.NOT_FOUND
        category = ErrorCategory.RESOURCE
        recoverable = true
        severity = 'low'
        break
      case '23505': // unique_violation
        code = ErrorCode.ALREADY_EXISTS
        category = ErrorCategory.RESOURCE
        recoverable = true
        severity = 'low'
        break
      case '23503': // foreign_key_violation
        code = ErrorCode.CONSTRAINT_VIOLATION
        category = ErrorCategory.DATABASE
        recoverable = false
        severity = 'high'
        break
      case '23514': // check_violation
        code = ErrorCode.VALIDATION_ERROR
        category = ErrorCategory.VALIDATION
        recoverable = true
        severity = 'medium'
        break
      case '42501': // insufficient_privilege
        code = ErrorCode.INSUFFICIENT_PERMISSIONS
        category = ErrorCategory.AUTHORIZATION
        recoverable = false
        severity = 'high'
        break
      case '08003': // connection_does_not_exist
      case '08006': // connection_failure
        code = ErrorCode.CONNECTION_FAILED
        category = ErrorCategory.DATABASE
        recoverable = true
        severity = 'critical'
        break
      case '57014': // query_canceled (timeout)
        code = ErrorCode.QUERY_TIMEOUT
        category = ErrorCategory.DATABASE
        recoverable = true
        severity = 'medium'
        break
    }
    
    return new RepositoryError(
      operation ? `${operation} failed: ${message}` : message,
      code,
      category,
      {
        operation,
        hint: error.hint,
        details: error.details,
        supabaseCode: error.code
      },
      error,
      { operation },
      recoverable,
      severity
    )
  }

  static validation(message: string, details?: Record<string, unknown>, field?: string): RepositoryError {
    return new RepositoryError(
      message,
      ErrorCode.VALIDATION_ERROR,
      ErrorCategory.VALIDATION,
      { ...details, field },
      undefined,
      { field },
      true, // validation errors are usually recoverable
      'low'
    )
  }

  static notFound(resource: string, identifier?: string): RepositoryError {
    return new RepositoryError(
      identifier 
        ? `${resource} with identifier '${identifier}' not found`
        : `${resource} not found`,
      ErrorCode.NOT_FOUND,
      ErrorCategory.RESOURCE,
      { resource, identifier },
      undefined,
      { resource, identifier },
      true,
      'low'
    )
  }

  static unauthorized(operation: string, reason?: string): RepositoryError {
    return new RepositoryError(
      reason 
        ? `Unauthorized: ${operation} - ${reason}`
        : `Unauthorized to perform operation: ${operation}`,
      ErrorCode.UNAUTHORIZED,
      ErrorCategory.AUTHENTICATION,
      { operation, reason },
      undefined,
      { operation },
      false,
      'high'
    )
  }

  static forbidden(operation: string, reason?: string): RepositoryError {
    return new RepositoryError(
      reason 
        ? `Forbidden: ${operation} - ${reason}`
        : `Forbidden: ${operation}`,
      ErrorCode.FORBIDDEN,
      ErrorCategory.AUTHORIZATION,
      { operation, reason },
      undefined,
      { operation },
      false,
      'high'
    )
  }

  static conflict(resource: string, reason: string, existing?: any): RepositoryError {
    return new RepositoryError(
      `Conflict with ${resource}: ${reason}`,
      ErrorCode.CONFLICT,
      ErrorCategory.RESOURCE,
      { resource, reason, existing },
      undefined,
      { resource },
      true,
      'medium'
    )
  }

  static businessRule(rule: string, message?: string, context?: Record<string, unknown>): RepositoryError {
    return new RepositoryError(
      message || `Business rule violation: ${rule}`,
      ErrorCode.BUSINESS_RULE_VIOLATION,
      ErrorCategory.BUSINESS_RULE,
      { rule, ...context },
      undefined,
      { rule },
      false,
      'high'
    )
  }

  static quotaExceeded(resource: string, limit: number, current: number): RepositoryError {
    return new RepositoryError(
      `Quota exceeded for ${resource}: ${current}/${limit}`,
      ErrorCode.QUOTA_EXCEEDED,
      ErrorCategory.BUSINESS_RULE,
      { resource, limit, current },
      undefined,
      { resource },
      false,
      'medium'
    )
  }

  static timeout(operation: string, timeoutMs: number): RepositoryError {
    return new RepositoryError(
      `Operation timeout: ${operation} exceeded ${timeoutMs}ms`,
      ErrorCode.TIMEOUT,
      ErrorCategory.NETWORK,
      { operation, timeoutMs },
      undefined,
      { operation },
      true,
      'medium'
    )
  }

  static internal(message: string, originalError?: unknown, context?: Record<string, unknown>): RepositoryError {
    return new RepositoryError(
      `Internal error: ${message}`,
      ErrorCode.INTERNAL_ERROR,
      ErrorCategory.SYSTEM,
      context,
      originalError,
      context,
      false,
      'critical'
    )
  }

  static externalService(service: string, message: string, originalError?: unknown): RepositoryError {
    return new RepositoryError(
      `External service error (${service}): ${message}`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorCategory.EXTERNAL_SERVICE,
      { service },
      originalError,
      { service },
      true,
      'medium'
    )
  }
}

// Helper functions for creating results
export const success = <T>(data: T, metadata?: Record<string, unknown>): ResultSuccess<T> => ({
  success: true,
  data,
  metadata
})

export const failure = (error: RepositoryError, metadata?: Record<string, unknown>): ResultFailure => ({
  success: false,
  error,
  metadata
})

// Enhanced type guards
export const isSuccess = <T, E = RepositoryError>(result: Result<T, E>): result is ResultSuccess<T> => result.success
export const isFailure = <T, E = RepositoryError>(result: Result<T, E>): result is ResultFailure<E> => !result.success

// Specific error type guards
export const isValidationError = (error: RepositoryError): boolean => 
  error.category === ErrorCategory.VALIDATION

export const isAuthError = (error: RepositoryError): boolean => 
  error.category === ErrorCategory.AUTHENTICATION || error.category === ErrorCategory.AUTHORIZATION

export const isResourceError = (error: RepositoryError): boolean => 
  error.category === ErrorCategory.RESOURCE

export const isRecoverableError = (error: RepositoryError): boolean => 
  error.recoverable

export const isCriticalError = (error: RepositoryError): boolean => 
  error.severity === 'critical'

// Enhanced utility functions for working with results
export const mapResult = <T, U, E = RepositoryError>(
  result: Result<T, E>, 
  mapper: (data: T) => U
): Result<U, E> => {
  if (isSuccess(result)) {
    try {
      return success(mapper(result.data), result.metadata)
    } catch (error) {
      return failure(
        RepositoryError.internal('Result mapping failed', error) as E,
        result.metadata
      )
    }
  }
  return result
}

export const mapError = <T, E, F>(
  result: Result<T, E>,
  mapper: (error: E) => F
): Result<T, F> => {
  if (isFailure(result)) {
    return failure(mapper(result.error), result.metadata)
  }
  return result as Result<T, F>
}

export const flatMapResult = <T, U, E = RepositoryError>(
  result: Result<T, E>,
  mapper: (data: T) => Result<U, E>
): Result<U, E> => {
  if (isSuccess(result)) {
    return mapper(result.data)
  }
  return result
}

export const flatMapError = <T, E, F>(
  result: Result<T, E>,
  mapper: (error: E) => Result<T, F>
): Result<T, F> => {
  if (isFailure(result)) {
    return mapper(result.error)
  }
  return result as Result<T, F>
}

export const combineResults = <T extends readonly unknown[], E = RepositoryError>(
  ...results: { [K in keyof T]: Result<T[K], E> }
): Result<T, E> => {
  const data: any[] = []
  
  for (const result of results) {
    if (isFailure(result)) {
      return result
    }
    data.push(result.data)
  }
  
  return success(data as T)
}

// Collect all successful results, return array of successes and failures
export const partitionResults = <T, E = RepositoryError>(
  results: Result<T, E>[]
): { successes: T[]; failures: E[] } => {
  const successes: T[] = []
  const failures: E[] = []
  
  for (const result of results) {
    if (isSuccess(result)) {
      successes.push(result.data)
    } else {
      failures.push(result.error)
    }
  }
  
  return { successes, failures }
}

// Find first successful result
export const firstSuccess = <T, E = RepositoryError>(
  results: Result<T, E>[]
): Result<T, E[]> => {
  const errors: E[] = []
  
  for (const result of results) {
    if (isSuccess(result)) {
      return result
    }
    errors.push(result.error)
  }
  
  return failure(errors)
}

// Enhanced async result helpers
export const wrapAsync = async <T, E = RepositoryError>(
  operation: () => Promise<T>
): Promise<Result<T, E>> => {
  try {
    const data = await operation()
    return success(data)
  } catch (error) {
    if (error instanceof RepositoryError) {
      return failure(error as E)
    }
    return failure(RepositoryError.internal('Async operation failed', error) as E)
  }
}

// Wrap async operation with timeout
export const wrapAsyncWithTimeout = async <T, E = RepositoryError>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName = 'operation'
): Promise<Result<T, E>> => {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    })
    
    const data = await Promise.race([operation(), timeoutPromise])
    return success(data)
  } catch (error) {
    if (error instanceof RepositoryError) {
      return failure(error as E)
    }
    
    if (error instanceof Error && error.message === 'Operation timeout') {
      return failure(RepositoryError.timeout(operationName, timeoutMs) as E)
    }
    
    return failure(RepositoryError.internal('Async operation failed', error) as E)
  }
}

// Parallel execution with individual error handling
export const executeParallel = async <T, E = RepositoryError>(
  operations: (() => Promise<Result<T, E>>)[]
): Promise<Result<T[], E[]>> => {
  try {
    const results = await Promise.all(operations.map(op => op()))
    const partition = partitionResults(results)
    
    if (partition.failures.length === 0) {
      return success(partition.successes)
    }
    
    // If there are failures, return them
    return failure(partition.failures)
  } catch (error) {
    return failure([RepositoryError.internal('Parallel execution failed', error)] as E[])
  }
}

// Sequential execution with early termination on first error
export const executeSequential = async <T, E = RepositoryError>(
  operations: (() => Promise<Result<T, E>>)[]
): Promise<Result<T[], E>> => {
  const results: T[] = []
  
  for (const operation of operations) {
    const result = await operation()
    if (isFailure(result)) {
      return result
    }
    results.push(result.data)
  }
  
  return success(results)
}

export const unwrapResult = <T>(result: Result<T>): T => {
  if (isSuccess(result)) {
    return result.data
  }
  throw result.error
}

export const unwrapResultOr = <T>(result: Result<T>, defaultValue: T): T => {
  if (isSuccess(result)) {
    return result.data
  }
  return defaultValue
}

// Enhanced result unwrapping and utilities
export const unwrapResultOrThrow = <T, E = RepositoryError>(
  result: Result<T, E>, 
  errorTransformer?: (error: E) => Error
): T => {
  if (isSuccess(result)) {
    return result.data
  }
  
  if (errorTransformer) {
    throw errorTransformer(result.error)
  }
  
  if (result.error instanceof Error) {
    throw result.error
  }
  
  throw new Error(`Operation failed: ${String(result.error)}`)
}

// Convert Result to Promise (useful for interop)
export const resultToPromise = <T, E = RepositoryError>(result: Result<T, E>): Promise<T> => {
  if (isSuccess(result)) {
    return Promise.resolve(result.data)
  }
  return Promise.reject(result.error)
}

// Convert Promise to Result
export const promiseToResult = async <T, E = RepositoryError>(
  promise: Promise<T>,
  errorMapper?: (error: unknown) => E
): Promise<Result<T, E>> => {
  try {
    const data = await promise
    return success(data)
  } catch (error) {
    const mappedError = errorMapper ? errorMapper(error) : error as E
    return failure(mappedError)
  }
}

// Error recovery strategies
export interface RecoveryStrategy<T, E = RepositoryError> {
  canRecover: (error: E) => boolean
  recover: (error: E) => Promise<Result<T, E>> | Result<T, E>
}

export const withRecovery = async <T, E = RepositoryError>(
  result: Result<T, E>,
  strategies: RecoveryStrategy<T, E>[]
): Promise<Result<T, E>> => {
  if (isSuccess(result)) {
    return result
  }
  
  for (const strategy of strategies) {
    if (strategy.canRecover(result.error)) {
      const recoveryResult = await strategy.recover(result.error)
      if (isSuccess(recoveryResult)) {
        return recoveryResult
      }
    }
  }
  
  return result
}

// Common recovery strategies
export const RetryStrategy = <T, E = RepositoryError>(
  operation: () => Promise<Result<T, E>>,
  maxAttempts = 3,
  delayMs = 1000
): RecoveryStrategy<T, E> => ({
  canRecover: (error: E) => {
    if (error instanceof RepositoryError) {
      return error.recoverable && (
        error.code === ErrorCode.NETWORK_ERROR ||
        error.code === ErrorCode.TIMEOUT ||
        error.code === ErrorCode.CONNECTION_FAILED ||
        error.code === ErrorCode.SERVICE_UNAVAILABLE
      )
    }
    return false
  },
  recover: async (error: E) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 2)))
      }
      
      const result = await operation()
      if (isSuccess(result)) {
        return result
      }
    }
    
    return failure(error)
  }
})

export const FallbackStrategy = <T, E = RepositoryError>(
  fallbackValue: T
): RecoveryStrategy<T, E> => ({
  canRecover: (error: E) => {
    if (error instanceof RepositoryError) {
      return error.severity !== 'critical' && (
        error.code === ErrorCode.NOT_FOUND ||
        error.code === ErrorCode.EXTERNAL_SERVICE_ERROR
      )
    }
    return false
  },
  recover: () => success(fallbackValue)
})

export const CacheStrategy = <T, E = RepositoryError>(
  getCachedValue: () => T | null
): RecoveryStrategy<T, E> => ({
  canRecover: (error: E) => {
    const cached = getCachedValue()
    return cached !== null
  },
  recover: () => {
    const cached = getCachedValue()
    return cached !== null 
      ? success(cached) 
      : failure(RepositoryError.internal('No cached value available') as E)
  }
})

// Pattern matching for Results
export const match = <T, E, R>(
  result: Result<T, E>,
  patterns: {
    success: (data: T) => R
    failure: (error: E) => R
  }
): R => {
  if (isSuccess(result)) {
    return patterns.success(result.data)
  } else {
    return patterns.failure(result.error)
  }
}

export const matchAsync = async <T, E, R>(
  result: Result<T, E>,
  patterns: {
    success: (data: T) => Promise<R> | R
    failure: (error: E) => Promise<R> | R
  }
): Promise<R> => {
  if (isSuccess(result)) {
    return await patterns.success(result.data)
  } else {
    return await patterns.failure(result.error)
  }
}

// API Integration utilities
export interface APIHandlerResult<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

export const resultToAPIResponse = <T, E = RepositoryError>(
  result: Result<T, E>
): APIHandlerResult<T> => {
  if (isSuccess(result)) {
    return {
      success: true,
      data: result.data
    }
  }

  const error = result.error
  return {
    success: false,
    error: {
      code: error instanceof RepositoryError ? error.code : ErrorCode.INTERNAL_ERROR,
      message: error instanceof Error ? error.message : String(error),
      details: error instanceof RepositoryError ? error.details : undefined
    }
  }
}

export const getHTTPStatusFromError = (error: RepositoryError): number => {
  switch (error.code) {
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.INVALID_INPUT:
    case ErrorCode.MISSING_REQUIRED_FIELD:
    case ErrorCode.INVALID_FORMAT:
    case ErrorCode.VALUE_OUT_OF_RANGE:
      return 400
      
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.INVALID_CREDENTIALS:
    case ErrorCode.TOKEN_EXPIRED:
    case ErrorCode.TOKEN_INVALID:
      return 401
      
    case ErrorCode.FORBIDDEN:
    case ErrorCode.INSUFFICIENT_PERMISSIONS:
    case ErrorCode.ROLE_REQUIRED:
      return 403
      
    case ErrorCode.NOT_FOUND:
      return 404
      
    case ErrorCode.ALREADY_EXISTS:
    case ErrorCode.CONFLICT:
    case ErrorCode.RESOURCE_LOCKED:
      return 409
      
    case ErrorCode.BUSINESS_RULE_VIOLATION:
    case ErrorCode.WORKFLOW_VIOLATION:
    case ErrorCode.QUOTA_EXCEEDED:
      return 422
      
    case ErrorCode.RATE_LIMITED:
    case ErrorCode.API_QUOTA_EXCEEDED:
      return 429
      
    case ErrorCode.INTERNAL_ERROR:
    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.CONFIGURATION_ERROR:
    case ErrorCode.DEPENDENCY_ERROR:
      return 500
      
    case ErrorCode.SERVICE_UNAVAILABLE:
    case ErrorCode.EXTERNAL_SERVICE_ERROR:
      return 503
      
    case ErrorCode.TIMEOUT:
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.CONNECTION_REFUSED:
      return 504
      
    default:
      return 500
  }
}

// Express/Next.js middleware compatible error handler
export const handleResultError = (error: RepositoryError, res: any) => {
  const status = getHTTPStatusFromError(error)
  const response = resultToAPIResponse(failure(error))
  
  res.status(status).json(response)
}

// Validation helpers for Results
export const validateAndWrap = <T>(
  data: any,
  validator: (data: unknown) => T,
  validationErrorPrefix = 'Validation failed'
): Result<T> => {
  try {
    const validated = validator(data)
    return success(validated)
  } catch (error) {
    if (error instanceof Error) {
      return failure(RepositoryError.validation(
        `${validationErrorPrefix}: ${error.message}`,
        { originalData: data },
        'validation'
      ))
    }
    return failure(RepositoryError.validation(
      `${validationErrorPrefix}: ${String(error)}`,
      { originalData: data },
      'validation'
    ))
  }
}