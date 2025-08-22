/**
 * Error Serialization and Response Formatting
 * Handles conversion of errors to API responses with appropriate formatting
 */

import { NextResponse } from 'next/server'
import { BaseError, EnhancedBaseError, ErrorSeverity } from './base'
import {
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

/**
 * API error response format
 */
export interface APIErrorResponse {
  error: {
    message: string
    code: string
    type: string
    correlationId: string
    timestamp: string
    details?: any
    field?: string
    validationErrors?: Array<{
      field: string
      message: string
      value?: any
    }>
  }
  success: false
  statusCode: number
}

/**
 * User-friendly error messages mapping
 */
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check your input and try again',
  AUTHENTICATION_ERROR: 'Please sign in to continue',
  AUTHORIZATION_ERROR: 'You do not have permission to perform this action',
  NOT_FOUND_ERROR: 'The requested resource could not be found',
  CONFLICT_ERROR: 'This action conflicts with existing data',
  SERVICE_UNAVAILABLE_ERROR: 'This service is temporarily unavailable',
  BUSINESS_LOGIC_ERROR: 'This action cannot be completed due to business rules',
  EXTERNAL_SERVICE_ERROR: 'An external service is currently unavailable',
  DATABASE_ERROR: 'A data storage error occurred',
  RATE_LIMIT_ERROR: 'Too many requests. Please wait and try again',
  GENERIC_ERROR: 'An unexpected error occurred'
}

/**
 * Error serializer class
 */
export class ErrorSerializer {
  private static isProduction = process.env['NODE_ENV'] === 'production'

  /**
   * Serialize error to API response
   */
  static toAPIResponse(error: Error): APIErrorResponse {
    // Handle enhanced base errors
    if (error instanceof EnhancedBaseError) {
      return this.serializeEnhancedError(error)
    }

    // Handle basic base errors
    if (error instanceof BaseError) {
      return this.serializeBaseError(error)
    }

    // Handle validation errors specifically
    if (error instanceof ValidationError) {
      return this.serializeValidationError(error)
    }

    // Handle built-in JavaScript errors
    return this.serializeGenericError(error)
  }

  /**
   * Convert error to Next.js response
   */
  static toNextResponse(error: Error): NextResponse<APIErrorResponse> {
    const apiResponse = this.toAPIResponse(error)
    const headers: Record<string, string> = {}

    // Add retry headers for rate limiting
    if (error instanceof RateLimitError) {
      headers['Retry-After'] = error.retryAfter.toString()
      headers['X-RateLimit-Limit'] = error.limit.toString()
      headers['X-RateLimit-Window'] = error.window
    }

    // Add retry headers for service unavailable
    if (error instanceof ServiceUnavailableError && error.retryAfter) {
      headers['Retry-After'] = error.retryAfter.toString()
    }

    return NextResponse.json(apiResponse, {
      status: apiResponse.statusCode,
      headers
    })
  }

  /**
   * Serialize enhanced error
   */
  private static serializeEnhancedError(error: EnhancedBaseError): APIErrorResponse {
    const baseResponse = this.serializeBaseError(error)
    
    return {
      ...baseResponse,
      error: {
        ...baseResponse.error,
        severity: error.metadata.severity,
        category: error.metadata.category,
        retryable: error.metadata.retryable,
        tags: error.metadata.tags,
        ...(this.shouldIncludeDetails(error) && {
          details: this.sanitizeDetails(error)
        })
      }
    }
  }

  /**
   * Serialize base error
   */
  private static serializeBaseError(error: BaseError): APIErrorResponse {
    const message = this.getUserFriendlyMessage(error)
    
    return {
      error: {
        message,
        code: error.code,
        type: error.constructor.name,
        correlationId: error.correlationId,
        timestamp: error.timestamp.toISOString(),
        ...(this.shouldIncludeDetails(error) && {
          details: this.sanitizeDetails(error)
        })
      },
      success: false,
      statusCode: error.statusCode
    }
  }

  /**
   * Serialize validation error with field details
   */
  private static serializeValidationError(error: ValidationError): APIErrorResponse {
    const baseResponse = this.serializeBaseError(error)
    
    return {
      ...baseResponse,
      error: {
        ...baseResponse.error,
        field: error.field,
        validationErrors: [{
          field: error.field || 'unknown',
          message: error.message,
          value: this.isProduction ? undefined : error.value
        }]
      }
    }
  }

  /**
   * Serialize generic JavaScript error
   */
  private static serializeGenericError(error: Error): APIErrorResponse {
    const correlationId = this.generateCorrelationId()
    
    return {
      error: {
        message: this.isProduction 
          ? USER_FRIENDLY_MESSAGES.GENERIC_ERROR
          : error.message,
        code: 'GENERIC_ERROR',
        type: error.constructor.name,
        correlationId,
        timestamp: new Date().toISOString(),
        ...(!this.isProduction && {
          details: {
            stack: error.stack,
            name: error.name
          }
        })
      },
      success: false,
      statusCode: 500
    }
  }

  /**
   * Get user-friendly message
   */
  private static getUserFriendlyMessage(error: BaseError): string {
    // For user-facing errors, use the original message
    if (error instanceof EnhancedBaseError && error.isUserFacing()) {
      return error.message
    }

    // For development, always show the actual message
    if (!this.isProduction) {
      return error.message
    }

    // For production, use friendly messages
    return USER_FRIENDLY_MESSAGES[error.code] || USER_FRIENDLY_MESSAGES.GENERIC_ERROR
  }

  /**
   * Check if details should be included
   */
  private static shouldIncludeDetails(error: BaseError): boolean {
    // Always include details in development
    if (!this.isProduction) {
      return true
    }

    // Include details for user-facing errors
    if (error instanceof EnhancedBaseError) {
      return error.isUserFacing()
    }

    // Include details for client errors (4xx)
    return error.statusCode >= 400 && error.statusCode < 500
  }

  /**
   * Sanitize error details for API response
   */
  private static sanitizeDetails(error: BaseError): any {
    const details: any = { ...error.context }

    // Add specific error details based on type
    if (error instanceof ValidationError) {
      details.field = error.field
      details.validationRules = error.validationRules
      if (!this.isProduction) {
        details.value = error.value
      }
    }

    if (error instanceof AuthenticationError) {
      details.authMethod = error.authMethod
      // Never include userId in production
      if (!this.isProduction) {
        details.userId = error.userId
      }
    }

    if (error instanceof AuthorizationError) {
      details.resource = error.resource
      details.action = error.action
      details.requiredRole = error.requiredRole
      // Only include current role in development
      if (!this.isProduction) {
        details.userId = error.userId
        details.currentRole = error.currentRole
      }
    }

    if (error instanceof NotFoundError) {
      details.resource = error.resource
      if (!this.isProduction) {
        details.resourceId = error.resourceId
        details.query = error.query
      }
    }

    if (error instanceof ConflictError) {
      details.resource = error.resource
      details.conflictingField = error.conflictingField
      if (!this.isProduction) {
        details.conflictingValue = error.conflictingValue
      }
    }

    if (error instanceof BusinessLogicError) {
      details.rule = error.rule
      details.domain = error.domain
    }

    if (error instanceof ExternalServiceError) {
      details.service = error.service
      details.operation = error.operation
      if (!this.isProduction) {
        details.serviceStatusCode = error.serviceStatusCode
        details.serviceResponse = error.serviceResponse
      }
    }

    if (error instanceof DatabaseError) {
      details.operation = error.operation
      if (!this.isProduction) {
        details.table = error.table
        details.constraint = error.constraint
      }
    }

    if (error instanceof RateLimitError) {
      details.limit = error.limit
      details.window = error.window
      details.retryAfter = error.retryAfter
    }

    if (error instanceof ServiceUnavailableError) {
      details.service = error.service
      details.retryAfter = error.retryAfter
      if (error.maintainanceWindow) {
        details.maintenanceWindow = error.maintainanceWindow
      }
    }

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth']
    const sanitized = this.removeSensitiveFields(details, sensitiveFields)

    return Object.keys(sanitized).length > 0 ? sanitized : undefined
  }

  /**
   * Remove sensitive fields from object
   */
  private static removeSensitiveFields(obj: any, sensitiveFields: string[]): any {
    if (!obj || typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeSensitiveFields(item, sensitiveFields))
    }

    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase()
      const isSensitive = sensitiveFields.some(field => 
        lowerKey.includes(field) || lowerKey.endsWith(field)
      )

      if (isSensitive) {
        result[key] = '[REDACTED]'
      } else if (typeof value === 'object') {
        result[key] = this.removeSensitiveFields(value, sensitiveFields)
      } else {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Generate correlation ID
   */
  private static generateCorrelationId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }
}

/**
 * Validation error aggregator for multiple field errors
 */
export class ValidationErrorAggregator {
  private errors: ValidationError[] = []

  add(error: ValidationError): this {
    this.errors.push(error)
    return this
  }

  addField(field: string, message: string, value?: any): this {
    this.errors.push(new ValidationError(message, field, value))
    return this
  }

  hasErrors(): boolean {
    return this.errors.length > 0
  }

  getErrors(): ValidationError[] {
    return [...this.errors]
  }

  toAPIResponse(): APIErrorResponse {
    if (this.errors.length === 0) {
      throw new Error('No validation errors to serialize')
    }

    const firstError = this.errors[0]
    const baseResponse = ErrorSerializer.toAPIResponse(firstError)

    return {
      ...baseResponse,
      error: {
        ...baseResponse.error,
        message: `Validation failed for ${this.errors.length} field${this.errors.length > 1 ? 's' : ''}`,
        validationErrors: this.errors.map(error => ({
          field: error.field || 'unknown',
          message: error.message,
          value: process.env['NODE_ENV'] === 'production' ? undefined : error.value
        }))
      }
    }
  }

  toNextResponse(): NextResponse<APIErrorResponse> {
    const apiResponse = this.toAPIResponse()
    return NextResponse.json(apiResponse, { status: apiResponse.statusCode })
  }

  throwIfErrors(): void {
    if (this.hasErrors()) {
      // Throw the first error with context about all errors
      const firstError = this.errors[0]
      firstError.withContext({
        totalValidationErrors: this.errors.length,
        allFields: this.errors.map(e => e.field).filter(Boolean)
      })
      throw firstError
    }
  }
}

/**
 * Error response utilities
 */
export const ErrorResponse = {
  /**
   * Create validation error response with multiple fields
   */
  validation: (errors: Array<{ field: string; message: string; value?: any }>): NextResponse => {
    const aggregator = new ValidationErrorAggregator()
    errors.forEach(({ field, message, value }) => {
      aggregator.addField(field, message, value)
    })
    return aggregator.toNextResponse()
  },

  /**
   * Create not found error response
   */
  notFound: (resource: string, id?: string): NextResponse => {
    const error = id ? NotFoundError.byId(resource, id) : new NotFoundError(resource)
    return ErrorSerializer.toNextResponse(error)
  },

  /**
   * Create unauthorized error response
   */
  unauthorized: (message?: string): NextResponse => {
    const error = new AuthenticationError(message)
    return ErrorSerializer.toNextResponse(error)
  },

  /**
   * Create forbidden error response
   */
  forbidden: (resource?: string, action?: string): NextResponse => {
    const error = new AuthorizationError(
      resource && action ? `Access denied for ${action} on ${resource}` : 'Access denied'
    )
    return ErrorSerializer.toNextResponse(error)
  },

  /**
   * Create conflict error response
   */
  conflict: (resource: string, field?: string, value?: any): NextResponse => {
    const error = field 
      ? ConflictError.duplicate(resource, field, value)
      : new ConflictError(`${resource} conflict`, resource)
    return ErrorSerializer.toNextResponse(error)
  },

  /**
   * Create internal server error response
   */
  internal: (message?: string, correlationId?: string): NextResponse => {
    const error = new BaseError(
      message || 'Internal server error',
      'INTERNAL_SERVER_ERROR',
      500,
      undefined,
      undefined,
      correlationId
    )
    return ErrorSerializer.toNextResponse(error)
  }
}