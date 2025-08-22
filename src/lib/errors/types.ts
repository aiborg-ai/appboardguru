/**
 * Specific Error Types
 * Domain-specific error classes for different scenarios
 */

import { BaseError, EnhancedBaseError, ErrorCategory, ErrorSeverity } from './base'

/**
 * Validation Error
 * Used for input validation failures
 */
export class ValidationError extends EnhancedBaseError {
  public readonly field?: string
  public readonly value?: any
  public readonly validationRules?: string[]

  constructor(
    message: string,
    field?: string,
    value?: any,
    validationRules?: string[],
    context?: Record<string, any>,
    correlationId?: string
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      {
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.VALIDATION,
        userFacing: true,
        retryable: false,
        alerting: false,
        tags: ['validation', 'user-input']
      },
      context,
      undefined,
      correlationId
    )

    this.field = field
    this.value = value
    this.validationRules = validationRules
  }

  static required(field: string, correlationId?: string): ValidationError {
    return new ValidationError(`${field} is required`, field, undefined, ['required'], undefined, correlationId)
  }

  static invalid(field: string, value: any, reason: string, correlationId?: string): ValidationError {
    return new ValidationError(
      `${field} is invalid: ${reason}`,
      field,
      value,
      ['format'],
      undefined,
      correlationId
    )
  }

  static tooLong(field: string, value: any, maxLength: number, correlationId?: string): ValidationError {
    return new ValidationError(
      `${field} exceeds maximum length of ${maxLength} characters`,
      field,
      value,
      ['maxLength'],
      { maxLength },
      correlationId
    )
  }

  static tooShort(field: string, value: any, minLength: number, correlationId?: string): ValidationError {
    return new ValidationError(
      `${field} must be at least ${minLength} characters`,
      field,
      value,
      ['minLength'],
      { minLength },
      correlationId
    )
  }
}

/**
 * Authentication Error
 * Used for authentication failures
 */
export class AuthenticationError extends EnhancedBaseError {
  public readonly authMethod?: string
  public readonly userId?: string

  constructor(
    message: string = 'Authentication failed',
    authMethod?: string,
    userId?: string,
    context?: Record<string, any>,
    cause?: Error,
    correlationId?: string
  ) {
    super(
      message,
      'AUTHENTICATION_ERROR',
      401,
      {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.AUTHENTICATION,
        userFacing: true,
        retryable: false,
        alerting: false,
        tags: ['authentication', 'security']
      },
      context,
      cause,
      correlationId
    )

    this.authMethod = authMethod
    this.userId = userId
  }

  static invalidCredentials(correlationId?: string): AuthenticationError {
    return new AuthenticationError('Invalid email or password', 'password', undefined, undefined, undefined, correlationId)
  }

  static tokenExpired(userId?: string, correlationId?: string): AuthenticationError {
    return new AuthenticationError('Authentication token has expired', 'jwt', userId, undefined, undefined, correlationId)
  }

  static invalidToken(correlationId?: string): AuthenticationError {
    return new AuthenticationError('Invalid authentication token', 'jwt', undefined, undefined, undefined, correlationId)
  }

  static sessionExpired(userId?: string, correlationId?: string): AuthenticationError {
    return new AuthenticationError('Session has expired', 'session', userId, undefined, undefined, correlationId)
  }
}

/**
 * Authorization Error
 * Used for access control failures
 */
export class AuthorizationError extends EnhancedBaseError {
  public readonly userId?: string
  public readonly resource?: string
  public readonly action?: string
  public readonly requiredRole?: string
  public readonly currentRole?: string

  constructor(
    message: string = 'Access denied',
    userId?: string,
    resource?: string,
    action?: string,
    requiredRole?: string,
    currentRole?: string,
    context?: Record<string, any>,
    correlationId?: string
  ) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403,
      {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.AUTHORIZATION,
        userFacing: true,
        retryable: false,
        alerting: true,
        tags: ['authorization', 'security', 'access-control']
      },
      context,
      undefined,
      correlationId
    )

    this.userId = userId
    this.resource = resource
    this.action = action
    this.requiredRole = requiredRole
    this.currentRole = currentRole
  }

  static insufficientPermissions(
    userId: string,
    resource: string,
    action: string,
    requiredRole: string,
    currentRole?: string,
    correlationId?: string
  ): AuthorizationError {
    return new AuthorizationError(
      `Insufficient permissions to ${action} ${resource}. Required role: ${requiredRole}`,
      userId,
      resource,
      action,
      requiredRole,
      currentRole,
      undefined,
      correlationId
    )
  }

  static resourceNotFound(userId: string, resource: string, resourceId: string, correlationId?: string): AuthorizationError {
    return new AuthorizationError(
      `Resource not found or access denied`,
      userId,
      resource,
      'read',
      undefined,
      undefined,
      { resourceId },
      correlationId
    )
  }
}

/**
 * Not Found Error
 * Used when resources are not found
 */
export class NotFoundError extends EnhancedBaseError {
  public readonly resource: string
  public readonly resourceId?: string
  public readonly query?: Record<string, any>

  constructor(
    resource: string,
    resourceId?: string,
    query?: Record<string, any>,
    context?: Record<string, any>,
    correlationId?: string
  ) {
    const message = resourceId 
      ? `${resource} with ID '${resourceId}' not found`
      : `${resource} not found`

    super(
      message,
      'NOT_FOUND_ERROR',
      404,
      {
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.BUSINESS_LOGIC,
        userFacing: true,
        retryable: false,
        alerting: false,
        tags: ['not-found', 'resource']
      },
      context,
      undefined,
      correlationId
    )

    this.resource = resource
    this.resourceId = resourceId
    this.query = query
  }

  static byId(resource: string, id: string, correlationId?: string): NotFoundError {
    return new NotFoundError(resource, id, undefined, undefined, correlationId)
  }

  static byQuery(resource: string, query: Record<string, any>, correlationId?: string): NotFoundError {
    return new NotFoundError(resource, undefined, query, undefined, correlationId)
  }
}

/**
 * Conflict Error
 * Used for resource conflicts (e.g., duplicate creation)
 */
export class ConflictError extends EnhancedBaseError {
  public readonly resource: string
  public readonly conflictingField?: string
  public readonly conflictingValue?: any

  constructor(
    message: string,
    resource: string,
    conflictingField?: string,
    conflictingValue?: any,
    context?: Record<string, any>,
    correlationId?: string
  ) {
    super(
      message,
      'CONFLICT_ERROR',
      409,
      {
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.BUSINESS_LOGIC,
        userFacing: true,
        retryable: false,
        alerting: false,
        tags: ['conflict', 'duplicate']
      },
      context,
      undefined,
      correlationId
    )

    this.resource = resource
    this.conflictingField = conflictingField
    this.conflictingValue = conflictingValue
  }

  static duplicate(
    resource: string,
    field: string,
    value: any,
    correlationId?: string
  ): ConflictError {
    return new ConflictError(
      `${resource} with ${field} '${value}' already exists`,
      resource,
      field,
      value,
      undefined,
      correlationId
    )
  }

  static stateConflict(
    resource: string,
    currentState: string,
    requiredState: string,
    correlationId?: string
  ): ConflictError {
    return new ConflictError(
      `${resource} is in '${currentState}' state, but '${requiredState}' state is required`,
      resource,
      'state',
      { current: currentState, required: requiredState },
      undefined,
      correlationId
    )
  }
}

/**
 * Service Unavailable Error
 * Used for temporary service outages
 */
export class ServiceUnavailableError extends EnhancedBaseError {
  public readonly service: string
  public readonly retryAfter?: number
  public readonly maintainanceWindow?: { start: Date; end: Date }

  constructor(
    service: string,
    message?: string,
    retryAfter?: number,
    maintainanceWindow?: { start: Date; end: Date },
    context?: Record<string, any>,
    cause?: Error,
    correlationId?: string
  ) {
    super(
      message || `${service} is temporarily unavailable`,
      'SERVICE_UNAVAILABLE_ERROR',
      503,
      {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.EXTERNAL_SERVICE,
        userFacing: true,
        retryable: true,
        alerting: true,
        tags: ['service-unavailable', 'temporary']
      },
      context,
      cause,
      correlationId
    )

    this.service = service
    this.retryAfter = retryAfter
    this.maintainanceWindow = maintainanceWindow
  }

  static maintenance(
    service: string,
    startTime: Date,
    endTime: Date,
    correlationId?: string
  ): ServiceUnavailableError {
    return new ServiceUnavailableError(
      service,
      `${service} is undergoing scheduled maintenance`,
      Math.ceil((endTime.getTime() - Date.now()) / 1000),
      { start: startTime, end: endTime },
      undefined,
      undefined,
      correlationId
    )
  }

  static overloaded(service: string, retryAfter: number, correlationId?: string): ServiceUnavailableError {
    return new ServiceUnavailableError(
      service,
      `${service} is currently overloaded`,
      retryAfter,
      undefined,
      undefined,
      undefined,
      correlationId
    )
  }
}

/**
 * Business Logic Error
 * Used for domain-specific business rule violations
 */
export class BusinessLogicError extends EnhancedBaseError {
  public readonly rule: string
  public readonly domain: string

  constructor(
    message: string,
    rule: string,
    domain: string,
    context?: Record<string, any>,
    correlationId?: string
  ) {
    super(
      message,
      'BUSINESS_LOGIC_ERROR',
      422,
      {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.BUSINESS_LOGIC,
        userFacing: true,
        retryable: false,
        alerting: false,
        tags: ['business-logic', 'rule-violation']
      },
      context,
      undefined,
      correlationId
    )

    this.rule = rule
    this.domain = domain
  }

  static ruleViolation(
    rule: string,
    domain: string,
    message: string,
    context?: Record<string, any>,
    correlationId?: string
  ): BusinessLogicError {
    return new BusinessLogicError(message, rule, domain, context, correlationId)
  }
}

/**
 * External Service Error
 * Used for third-party service integration failures
 */
export class ExternalServiceError extends EnhancedBaseError {
  public readonly service: string
  public readonly operation: string
  public readonly serviceStatusCode?: number
  public readonly serviceResponse?: any

  constructor(
    service: string,
    operation: string,
    message?: string,
    serviceStatusCode?: number,
    serviceResponse?: any,
    context?: Record<string, any>,
    cause?: Error,
    correlationId?: string
  ) {
    super(
      message || `External service ${service} failed during ${operation}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.EXTERNAL_SERVICE,
        userFacing: false,
        retryable: true,
        alerting: true,
        tags: ['external-service', 'integration']
      },
      context,
      cause,
      correlationId
    )

    this.service = service
    this.operation = operation
    this.serviceStatusCode = serviceStatusCode
    this.serviceResponse = serviceResponse
  }

  static timeout(service: string, operation: string, timeout: number, correlationId?: string): ExternalServiceError {
    return new ExternalServiceError(
      service,
      operation,
      `${service} request timed out after ${timeout}ms during ${operation}`,
      undefined,
      undefined,
      { timeout },
      undefined,
      correlationId
    )
  }

  static httpError(
    service: string,
    operation: string,
    statusCode: number,
    response: any,
    correlationId?: string
  ): ExternalServiceError {
    return new ExternalServiceError(
      service,
      operation,
      `${service} returned HTTP ${statusCode} during ${operation}`,
      statusCode,
      response,
      undefined,
      undefined,
      correlationId
    )
  }
}

/**
 * Database Error
 * Used for database operation failures
 */
export class DatabaseError extends EnhancedBaseError {
  public readonly operation: string
  public readonly table?: string
  public readonly constraint?: string

  constructor(
    message: string,
    operation: string,
    table?: string,
    constraint?: string,
    context?: Record<string, any>,
    cause?: Error,
    correlationId?: string
  ) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.DATABASE,
        userFacing: false,
        retryable: true,
        alerting: true,
        tags: ['database', 'persistence']
      },
      context,
      cause,
      correlationId
    )

    this.operation = operation
    this.table = table
    this.constraint = constraint
  }

  static connectionFailed(correlationId?: string): DatabaseError {
    return new DatabaseError(
      'Database connection failed',
      'connect',
      undefined,
      undefined,
      undefined,
      undefined,
      correlationId
    )
  }

  static queryFailed(query: string, table?: string, cause?: Error, correlationId?: string): DatabaseError {
    return new DatabaseError(
      'Database query failed',
      'query',
      table,
      undefined,
      { query },
      cause,
      correlationId
    )
  }

  static constraintViolation(constraint: string, table?: string, correlationId?: string): DatabaseError {
    return new DatabaseError(
      `Database constraint violation: ${constraint}`,
      'insert',
      table,
      constraint,
      undefined,
      undefined,
      correlationId
    )
  }
}

/**
 * Rate Limit Error
 * Used when rate limits are exceeded
 */
export class RateLimitError extends EnhancedBaseError {
  public readonly limit: number
  public readonly window: string
  public readonly retryAfter: number
  public readonly key: string

  constructor(
    limit: number,
    window: string,
    retryAfter: number,
    key: string,
    context?: Record<string, any>,
    correlationId?: string
  ) {
    super(
      `Rate limit exceeded: ${limit} requests per ${window}`,
      'RATE_LIMIT_ERROR',
      429,
      {
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.SECURITY,
        userFacing: true,
        retryable: true,
        alerting: false,
        tags: ['rate-limit', 'throttling']
      },
      context,
      undefined,
      correlationId
    )

    this.limit = limit
    this.window = window
    this.retryAfter = retryAfter
    this.key = key
  }
}

/**
 * Export all error types
 */
export {
  BaseError,
  EnhancedBaseError,
  ErrorCategory,
  ErrorSeverity
} from './base'