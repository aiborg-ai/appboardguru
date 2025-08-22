/**
 * Base Error Classes
 * Comprehensive error handling infrastructure with correlation IDs
 */

import { nanoid } from 'nanoid'

/**
 * Base error interface for all application errors
 */
export interface IBaseError {
  name: string
  message: string
  code: string
  statusCode: number
  correlationId: string
  timestamp: Date
  context?: Record<string, unknown>
  cause?: Error
  stack?: string
}

/**
 * Base application error class
 * All custom errors should extend from this class
 */
export class BaseError extends Error implements IBaseError {
  public readonly code: string
  public readonly statusCode: number
  public readonly correlationId: string
  public readonly timestamp: Date
  public readonly context: Record<string, unknown>
  public readonly cause?: Error

  constructor(
    message: string,
    code: string,
    statusCode: number,
    context?: Record<string, unknown>,
    cause?: Error,
    correlationId?: string
  ) {
    super(message)
    
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.correlationId = correlationId || nanoid()
    this.timestamp = new Date()
    this.context = context || {}
    this.cause = cause
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
    
    // Include cause stack trace if available
    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined
    }
  }

  /**
   * Get sanitized error for API responses
   */
  toAPIResponse(includeStack: boolean = false): Record<string, unknown> {
    return {
      error: this.message,
      code: this.code,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      ...(includeStack && { stack: this.stack })
    }
  }

  /**
   * Check if this error is of a specific type
   */
  isType<T extends BaseError>(errorClass: new (...args: any[]) => T): this is T {
    return this instanceof errorClass
  }

  /**
   * Add context to the error
   */
  withContext(additionalContext: Record<string, unknown>): this {
    Object.assign(this.context, additionalContext)
    return this
  }
}

/**
 * Error factory for creating errors with consistent patterns
 */
export class ErrorFactory {
  private static correlationId?: string

  /**
   * Set correlation ID for subsequent error creation
   */
  static setCorrelationId(correlationId: string): void {
    ErrorFactory.correlationId = correlationId
  }

  /**
   * Clear correlation ID
   */
  static clearCorrelationId(): void {
    ErrorFactory.correlationId = undefined
  }

  /**
   * Create error with current correlation ID
   */
  static create<T extends BaseError>(
    errorClass: new (...args: any[]) => T,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error
  ): T {
    // Get constructor parameters dynamically
    if (errorClass === BaseError) {
      return new BaseError(
        message,
        'GENERIC_ERROR',
        500,
        context,
        cause,
        ErrorFactory.correlationId
      ) as T
    }

    // For other error classes, try to create with minimal parameters
    try {
      return new errorClass(message, context, cause, ErrorFactory.correlationId)
    } catch {
      // Fallback to BaseError if constructor fails
      return new BaseError(
        message,
        errorClass.name.replace('Error', '').toUpperCase(),
        500,
        context,
        cause,
        ErrorFactory.correlationId
      ) as T
    }
  }
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for monitoring and alerting
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  SYSTEM = 'system',
  SECURITY = 'security'
}

/**
 * Enhanced error metadata
 */
export interface ErrorMetadata {
  severity: ErrorSeverity
  category: ErrorCategory
  userFacing: boolean
  retryable: boolean
  alerting: boolean
  tags: string[]
}

/**
 * Enhanced base error with metadata
 */
export class EnhancedBaseError extends BaseError {
  public readonly metadata: ErrorMetadata

  constructor(
    message: string,
    code: string,
    statusCode: number,
    metadata: Partial<ErrorMetadata> = {},
    context?: Record<string, unknown>,
    cause?: Error,
    correlationId?: string
  ) {
    super(message, code, statusCode, context, cause, correlationId)

    this.metadata = {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.SYSTEM,
      userFacing: statusCode < 500,
      retryable: false,
      alerting: statusCode >= 500,
      tags: [],
      ...metadata
    }
  }

  /**
   * Check if error should trigger alerts
   */
  shouldAlert(): boolean {
    return this.metadata.alerting || this.metadata.severity === ErrorSeverity.CRITICAL
  }

  /**
   * Check if error is user-facing
   */
  isUserFacing(): boolean {
    return this.metadata.userFacing
  }

  /**
   * Check if operation is retryable
   */
  isRetryable(): boolean {
    return this.metadata.retryable
  }

  /**
   * Add tags for categorization
   */
  withTags(...tags: string[]): this {
    this.metadata.tags.push(...tags)
    return this
  }

  /**
   * Enhanced JSON serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      metadata: this.metadata
    }
  }
}