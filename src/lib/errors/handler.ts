/**
 * Global Error Handler Middleware
 * Centralized error handling for Next.js API routes and pages
 */

import { NextRequest, NextResponse } from 'next/server'
import { BaseError, EnhancedBaseError, ErrorFactory } from './base'
import { ErrorSerializer, APIErrorResponse } from './serialization'
import { Logger } from '../logging/logger'

/**
 * Error context for tracking request information
 */
export interface ErrorContext {
  requestId: string
  method: string
  url: string
  userAgent?: string
  userId?: string
  organizationId?: string
  clientIP?: string
  timestamp: Date
}

/**
 * Global error handler options
 */
export interface ErrorHandlerOptions {
  logger?: Logger
  includeStackTrace?: boolean
  enableAlerting?: boolean
  sensitiveFields?: string[]
  customErrorMap?: Map<string, (error: Error, context: ErrorContext) => BaseError>
}

/**
 * Global error handler class
 */
export class GlobalErrorHandler {
  private logger: Logger
  private options: Required<ErrorHandlerOptions>

  constructor(options: ErrorHandlerOptions = {}) {
    this.logger = options.logger || Logger.getLogger('ErrorHandler')
    this.options = {
      logger: this.logger,
      includeStackTrace: process.env['NODE_ENV'] !== 'production',
      enableAlerting: true,
      sensitiveFields: ['password', 'token', 'secret', 'key', 'auth'],
      customErrorMap: new Map(),
      ...options
    }
  }

  /**
   * Handle error in API route context
   */
  async handleAPIError(
    error: Error,
    request: NextRequest,
    context: Partial<ErrorContext> = {}
  ): Promise<NextResponse<APIErrorResponse>> {
    const errorContext = this.buildErrorContext(request, context)
    const processedError = await this.processError(error, errorContext)
    
    return ErrorSerializer.toNextResponse(processedError)
  }

  /**
   * Handle error in page context (for error boundaries)
   */
  async handlePageError(
    error: Error,
    request: NextRequest,
    context: Partial<ErrorContext> = {}
  ): Promise<{ error: BaseError; shouldRedirect: boolean; redirectUrl?: string }> {
    const errorContext = this.buildErrorContext(request, context)
    const processedError = await this.processError(error, errorContext)

    // Determine if we should redirect based on error type
    let shouldRedirect = false
    let redirectUrl: string | undefined

    if (processedError.statusCode === 401) {
      shouldRedirect = true
      redirectUrl = `/auth/signin?redirect=${encodeURIComponent(request.url)}`
    } else if (processedError.statusCode === 403) {
      shouldRedirect = true
      redirectUrl = '/error/forbidden'
    }

    return { error: processedError, shouldRedirect, redirectUrl }
  }

  /**
   * Process and enhance error
   */
  private async processError(error: Error, context: ErrorContext): Promise<BaseError> {
    // Set correlation ID for error factory
    ErrorFactory.setCorrelationId(context.requestId)

    let processedError: BaseError

    try {
      // Check custom error mappings first
      const customMapping = this.options.customErrorMap.get(error.constructor.name)
      if (customMapping) {
        processedError = customMapping(error, context)
      } else {
        processedError = this.mapError(error, context)
      }

      // Enhance with context
      processedError.withContext({
        request: {
          method: context.method,
          url: context.url,
          userAgent: context.userAgent,
          clientIP: context.clientIP
        },
        user: {
          userId: context.userId,
          organizationId: context.organizationId
        },
        timestamp: context.timestamp
      })

      // Log the error
      await this.logError(processedError, context)

      // Send alerts if needed
      if (this.options.enableAlerting && this.shouldAlert(processedError)) {
        await this.sendAlert(processedError, context)
      }

      return processedError

    } catch (processingError) {
      // If error processing fails, create a basic error
      this.logger.error('Error processing failed', {
        originalError: error,
        processingError,
        context
      })

      return new BaseError(
        'An unexpected error occurred',
        'ERROR_PROCESSING_FAILED',
        500,
        { originalMessage: error.message },
        error,
        context.requestId
      )
    } finally {
      ErrorFactory.clearCorrelationId()
    }
  }

  /**
   * Map generic errors to application errors
   */
  private mapError(error: Error, context: ErrorContext): BaseError {
    // Already a BaseError - return as is
    if (error instanceof BaseError) {
      return error
    }

    // Map common JavaScript errors
    if (error instanceof TypeError) {
      return new BaseError(
        'Invalid data type or structure',
        'TYPE_ERROR',
        400,
        { originalMessage: error.message },
        error,
        context.requestId
      )
    }

    if (error instanceof ReferenceError) {
      return new BaseError(
        'Internal reference error',
        'REFERENCE_ERROR',
        500,
        { originalMessage: error.message },
        error,
        context.requestId
      )
    }

    if (error instanceof RangeError) {
      return new BaseError(
        'Value out of range',
        'RANGE_ERROR',
        400,
        { originalMessage: error.message },
        error,
        context.requestId
      )
    }

    if (error instanceof SyntaxError) {
      return new BaseError(
        'Invalid syntax in request',
        'SYNTAX_ERROR',
        400,
        { originalMessage: error.message },
        error,
        context.requestId
      )
    }

    // Handle database connection errors
    if (error.message?.includes('connection') && error.message?.includes('database')) {
      return new BaseError(
        'Database connection error',
        'DATABASE_CONNECTION_ERROR',
        503,
        { originalMessage: error.message },
        error,
        context.requestId
      )
    }

    // Handle network timeout errors
    if (error.message?.includes('timeout') || error.message?.includes('ECONNRESET')) {
      return new BaseError(
        'Network timeout error',
        'NETWORK_TIMEOUT_ERROR',
        504,
        { originalMessage: error.message },
        error,
        context.requestId
      )
    }

    // Handle JSON parsing errors
    if (error.message?.includes('JSON') || error.message?.includes('parse')) {
      return new BaseError(
        'Invalid JSON in request',
        'JSON_PARSE_ERROR',
        400,
        { originalMessage: error.message },
        error,
        context.requestId
      )
    }

    // Generic error fallback
    return new BaseError(
      process.env['NODE_ENV'] === 'production' 
        ? 'An unexpected error occurred'
        : error.message,
      'GENERIC_ERROR',
      500,
      { originalMessage: error.message, stack: error.stack },
      error,
      context.requestId
    )
  }

  /**
   * Build error context from request
   */
  private buildErrorContext(request: NextRequest, context: Partial<ErrorContext> = {}): ErrorContext {
    const requestId = this.generateRequestId(request)
    
    return {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent') || undefined,
      clientIP: this.getClientIP(request),
      timestamp: new Date(),
      ...context
    }
  }

  /**
   * Generate request ID
   */
  private generateRequestId(request: NextRequest): string {
    // Try to get existing correlation ID
    const existingId = request.headers.get('x-correlation-id') || 
                      request.headers.get('x-request-id')
    
    if (existingId) {
      return existingId
    }

    // Generate new ID
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string | undefined {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')

    if (forwarded) {
      return forwarded.split(',')[0]?.trim()
    }

    return realIP || cfConnectingIP || undefined
  }

  /**
   * Log error with appropriate level
   */
  private async logError(error: BaseError, context: ErrorContext): Promise<void> {
    const logData = {
      error: error.toJSON(),
      context,
      performance: {
        timestamp: Date.now()
      }
    }

    if (error.statusCode >= 500) {
      this.logger.error('Server Error', logData)
    } else if (error.statusCode >= 400) {
      this.logger.warn('Client Error', logData)
    } else {
      this.logger.info('Error Handled', logData)
    }
  }

  /**
   * Determine if error should trigger alerts
   */
  private shouldAlert(error: BaseError): boolean {
    // Always alert on server errors
    if (error.statusCode >= 500) {
      return true
    }

    // Alert on enhanced errors marked for alerting
    if (error instanceof EnhancedBaseError && error.shouldAlert()) {
      return true
    }

    return false
  }

  /**
   * Send alert for critical errors
   */
  private async sendAlert(error: BaseError, context: ErrorContext): Promise<void> {
    try {
      // In production, this would integrate with alerting services like:
      // - Slack webhooks
      // - PagerDuty
      // - Email notifications
      // - Monitoring services (DataDog, New Relic, etc.)
      
      const alertData = {
        title: `Application Error: ${error.code}`,
        message: error.message,
        severity: error instanceof EnhancedBaseError ? error.metadata.severity : 'high',
        context: {
          correlationId: error.correlationId,
          requestId: context.requestId,
          method: context.method,
          url: context.url,
          userId: context.userId,
          timestamp: context.timestamp
        },
        error: {
          name: error.name,
          code: error.code,
          statusCode: error.statusCode,
          stack: this.options.includeStackTrace ? error.stack : undefined
        }
      }

      // Log alert for now (replace with actual alerting service)
      this.logger.error('ALERT: Critical Error', alertData)

      // TODO: Implement actual alerting
      // await this.alertingService.send(alertData)

    } catch (alertError) {
      this.logger.error('Failed to send alert', {
        originalError: error.toJSON(),
        alertError
      })
    }
  }

  /**
   * Add custom error mapping
   */
  addErrorMapping(
    errorType: string,
    mapper: (error: Error, context: ErrorContext) => BaseError
  ): void {
    this.options.customErrorMap.set(errorType, mapper)
  }

  /**
   * Remove custom error mapping
   */
  removeErrorMapping(errorType: string): boolean {
    return this.options.customErrorMap.delete(errorType)
  }
}

/**
 * Default global error handler instance
 */
export const globalErrorHandler = new GlobalErrorHandler()

/**
 * Wrapper function for API routes
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Assume first argument is NextRequest
      const request = args[0] as NextRequest
      return globalErrorHandler.handleAPIError(error as Error, request)
    }
  }
}

/**
 * Error boundary hook for React components
 */
export function useErrorHandler() {
  return {
    handleError: async (error: Error, errorInfo?: any) => {
      // This would be used in React error boundaries
      globalErrorHandler.logger.error('React Error Boundary', {
        error: error.message,
        stack: error.stack,
        errorInfo
      })

      // Could also send to external error tracking service
      // await errorTrackingService.captureException(error, errorInfo)
    }
  }
}