/**
 * Error Handling System - Main Export
 * Central point for importing all error handling functionality
 */

// Base error classes
export {
  BaseError,
  EnhancedBaseError,
  ErrorFactory,
  ErrorSeverity,
  ErrorCategory,
  type IBaseError,
  type ErrorMetadata
} from './base'

// Specific error types
export {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  BusinessLogicError,
  ExternalServiceError,
  DatabaseError,
  RateLimitError
} from './types'

// Error recovery and resilience
export {
  retry,
  retryWithCircuitBreaker,
  circuitBreakers,
  CircuitBreaker,
  CircuitBreakerState,
  HealthCheck,
  executeBulkOperation,
  withGracefulDegradation,
  DEFAULT_RETRY_CONFIGS,
  type RetryConfig,
  type CircuitBreakerConfig,
  type BulkOperationResult
} from './recovery'

// Error serialization and API responses
export {
  ErrorSerializer,
  ValidationErrorAggregator,
  ErrorResponse,
  type APIErrorResponse
} from './serialization'

// Global error handler
export {
  GlobalErrorHandler,
  globalErrorHandler,
  withErrorHandler,
  useErrorHandler,
  type ErrorContext,
  type ErrorHandlerOptions
} from './handler'

// Convenience functions for common error scenarios
export const Errors = {
  // Validation errors
  required: (field: string, correlationId?: string) => 
    ValidationError.required(field, correlationId),
  
  invalid: (field: string, value: any, reason: string, correlationId?: string) =>
    ValidationError.invalid(field, value, reason, correlationId),
  
  tooLong: (field: string, value: any, maxLength: number, correlationId?: string) =>
    ValidationError.tooLong(field, value, maxLength, correlationId),
  
  tooShort: (field: string, value: any, minLength: number, correlationId?: string) =>
    ValidationError.tooShort(field, value, minLength, correlationId),

  // Authentication errors
  invalidCredentials: (correlationId?: string) =>
    AuthenticationError.invalidCredentials(correlationId),
  
  tokenExpired: (userId?: string, correlationId?: string) =>
    AuthenticationError.tokenExpired(userId, correlationId),
  
  invalidToken: (correlationId?: string) =>
    AuthenticationError.invalidToken(correlationId),
  
  sessionExpired: (userId?: string, correlationId?: string) =>
    AuthenticationError.sessionExpired(userId, correlationId),

  // Authorization errors
  insufficientPermissions: (
    userId: string,
    resource: string,
    action: string,
    requiredRole: string,
    currentRole?: string,
    correlationId?: string
  ) => AuthorizationError.insufficientPermissions(
    userId, resource, action, requiredRole, currentRole, correlationId
  ),
  
  resourceNotFound: (userId: string, resource: string, resourceId: string, correlationId?: string) =>
    AuthorizationError.resourceNotFound(userId, resource, resourceId, correlationId),

  // Not found errors
  notFound: (resource: string, id?: string, correlationId?: string) =>
    id ? NotFoundError.byId(resource, id, correlationId) : 
        new NotFoundError(resource, undefined, undefined, undefined, correlationId),

  // Conflict errors
  duplicate: (resource: string, field: string, value: any, correlationId?: string) =>
    ConflictError.duplicate(resource, field, value, correlationId),
  
  stateConflict: (resource: string, currentState: string, requiredState: string, correlationId?: string) =>
    ConflictError.stateConflict(resource, currentState, requiredState, correlationId),

  // Service unavailable errors
  maintenance: (service: string, startTime: Date, endTime: Date, correlationId?: string) =>
    ServiceUnavailableError.maintenance(service, startTime, endTime, correlationId),
  
  overloaded: (service: string, retryAfter: number, correlationId?: string) =>
    ServiceUnavailableError.overloaded(service, retryAfter, correlationId),

  // External service errors
  timeout: (service: string, operation: string, timeout: number, correlationId?: string) =>
    ExternalServiceError.timeout(service, operation, timeout, correlationId),
  
  httpError: (service: string, operation: string, statusCode: number, response: any, correlationId?: string) =>
    ExternalServiceError.httpError(service, operation, statusCode, response, correlationId),

  // Database errors
  connectionFailed: (correlationId?: string) =>
    DatabaseError.connectionFailed(correlationId),
  
  queryFailed: (query: string, table?: string, cause?: Error, correlationId?: string) =>
    DatabaseError.queryFailed(query, table, cause, correlationId),
  
  constraintViolation: (constraint: string, table?: string, correlationId?: string) =>
    DatabaseError.constraintViolation(constraint, table, correlationId),

  // Business logic errors
  ruleViolation: (rule: string, domain: string, message: string, context?: Record<string, unknown>, correlationId?: string) =>
    BusinessLogicError.ruleViolation(rule, domain, message, context, correlationId)
}

// Error checking utilities
export const ErrorUtils = {
  /**
   * Check if error is retryable
   */
  isRetryable: (error: Error): boolean => {
    if (error instanceof EnhancedBaseError) {
      return error.isRetryable()
    }
    
    // Common retryable errors
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN'
    ]
    
    return retryableErrors.some(code => 
      error.message.includes(code) || (error as any).code === code
    )
  },

  /**
   * Check if error is user-facing
   */
  isUserFacing: (error: Error): boolean => {
    if (error instanceof EnhancedBaseError) {
      return error.isUserFacing()
    }
    
    if (error instanceof BaseError) {
      return error.statusCode >= 400 && error.statusCode < 500
    }
    
    return false
  },

  /**
   * Extract correlation ID from error
   */
  getCorrelationId: (error: Error): string | undefined => {
    if (error instanceof BaseError) {
      return error.correlationId
    }
    
    return (error as any).correlationId
  },

  /**
   * Check if error should trigger alerts
   */
  shouldAlert: (error: Error): boolean => {
    if (error instanceof EnhancedBaseError) {
      return error.shouldAlert()
    }
    
    if (error instanceof BaseError) {
      return error.statusCode >= 500
    }
    
    return true // Default to alerting for unknown errors
  },

  /**
   * Get error severity
   */
  getSeverity: (error: Error): ErrorSeverity => {
    if (error instanceof EnhancedBaseError) {
      return error.metadata.severity
    }
    
    if (error instanceof BaseError) {
      if (error.statusCode >= 500) return ErrorSeverity.HIGH
      if (error.statusCode >= 400) return ErrorSeverity.MEDIUM
      return ErrorSeverity.LOW
    }
    
    return ErrorSeverity.HIGH // Default to high for unknown errors
  },

  /**
   * Get error category
   */
  getCategory: (error: Error): ErrorCategory => {
    if (error instanceof EnhancedBaseError) {
      return error.metadata.category
    }
    
    // Try to infer category from error type/message
    const message = error.message.toLowerCase()
    const name = error.constructor.name.toLowerCase()
    
    if (name.includes('validation') || message.includes('validation')) {
      return ErrorCategory.VALIDATION
    }
    if (name.includes('auth') || message.includes('auth')) {
      return ErrorCategory.AUTHENTICATION
    }
    if (name.includes('permission') || message.includes('permission')) {
      return ErrorCategory.AUTHORIZATION
    }
    if (message.includes('database') || message.includes('sql')) {
      return ErrorCategory.DATABASE
    }
    if (message.includes('network') || message.includes('timeout')) {
      return ErrorCategory.NETWORK
    }
    
    return ErrorCategory.SYSTEM
  }
}

/**
 * Error middleware factory for different frameworks
 */
export const ErrorMiddleware = {
  /**
   * Next.js API route wrapper
   */
  nextjs: withErrorHandler,

  /**
   * Express.js middleware (if needed)
   */
  express: (handler: Function) => {
    return async (req: any, res: any, next: any) => {
      try {
        await handler(req, res, next)
      } catch (error) {
        const processedError = new BaseError(
          error instanceof Error ? error.message : 'Unknown error',
          'EXPRESS_ERROR',
          500,
          undefined,
          error instanceof Error ? error : undefined
        )
        
        const response = ErrorSerializer.toAPIResponse(processedError)
        res.status(response.statusCode).json(response)
      }
    }
  }
}

/**
 * Default export for convenience
 */
export default {
  ...Errors,
  Utils: ErrorUtils,
  Middleware: ErrorMiddleware,
  Handler: globalErrorHandler,
  Response: ErrorResponse
}