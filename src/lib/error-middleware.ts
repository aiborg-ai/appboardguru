/**
 * Error Handling Middleware
 * - Standardized error responses
 * - Error logging and monitoring
 * - Stack trace sanitization
 */

export interface ApiError {
  code: string
  message: string
  statusCode: number
  details?: any
  timestamp?: string
  requestId?: string
}

export interface ErrorResponse {
  error: string
  message: string
  details?: any
  timestamp: string
  requestId?: string
}

/**
 * Standard error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN'
} as const

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: ApiError,
  requestId?: string
): Response {
  const errorResponse: ErrorResponse = {
    error: error.code,
    message: error.message,
    details: error.details,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  }

  // Log error for monitoring
  console.error('API Error:', {
    ...errorResponse,
    statusCode: error.statusCode,
    stack: process.env.NODE_ENV === 'development' ? error.details?.stack : undefined
  })

  return new Response(
    JSON.stringify(errorResponse),
    {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': errorResponse.requestId
      }
    }
  )
}

/**
 * Handle different types of errors
 */
export function handleError(error: unknown, context?: any): Response {
  const requestId = generateRequestId()

  // Handle known API errors
  if (isApiError(error)) {
    return createErrorResponse(error, requestId)
  }

  // Handle validation errors (e.g., from Zod)
  if (error instanceof Error && error.name === 'ZodError') {
    return createErrorResponse({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Validation failed',
      statusCode: 400,
      details: (error as any).errors
    }, requestId)
  }

  // Handle database errors
  if (error instanceof Error && isDatabaseError(error)) {
    return createErrorResponse({
      code: ErrorCodes.DATABASE_ERROR,
      message: 'Database operation failed',
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, requestId)
  }

  // Handle generic errors
  if (error instanceof Error) {
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An unexpected error occurred',
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        context
      } : undefined
    }, requestId)
  }

  // Handle unknown errors
  return createErrorResponse({
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
    statusCode: 500
  }, requestId)
}

/**
 * Validation error helper
 */
export function validationError(message: string, details?: any): Response {
  return createErrorResponse({
    code: ErrorCodes.VALIDATION_ERROR,
    message,
    statusCode: 400,
    details
  })
}

/**
 * Not found error helper
 */
export function notFoundError(resource: string): Response {
  return createErrorResponse({
    code: ErrorCodes.NOT_FOUND,
    message: `${resource} not found`,
    statusCode: 404
  })
}

/**
 * Unauthorized error helper
 */
export function unauthorizedError(message: string = 'Authentication required'): Response {
  return createErrorResponse({
    code: ErrorCodes.AUTHENTICATION_ERROR,
    message,
    statusCode: 401
  })
}

/**
 * Forbidden error helper
 */
export function forbiddenError(message: string = 'Access denied'): Response {
  return createErrorResponse({
    code: ErrorCodes.FORBIDDEN,
    message,
    statusCode: 403
  })
}

/**
 * Conflict error helper
 */
export function conflictError(message: string, details?: any): Response {
  return createErrorResponse({
    code: ErrorCodes.CONFLICT,
    message,
    statusCode: 409,
    details
  })
}

/**
 * Rate limit error helper
 */
export function rateLimitError(retryAfter?: number): Response {
  return new Response(
    JSON.stringify({
      error: ErrorCodes.RATE_LIMIT,
      message: 'Too many requests',
      timestamp: new Date().toISOString(),
      retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter?.toString() || '60'
      }
    }
  )
}

/**
 * Database error helper
 */
export function databaseError(message: string = 'Database operation failed'): Response {
  return createErrorResponse({
    code: ErrorCodes.DATABASE_ERROR,
    message,
    statusCode: 500
  })
}

/**
 * External service error helper
 */
export function externalServiceError(service: string, message?: string): Response {
  return createErrorResponse({
    code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
    message: message || `External service ${service} is unavailable`,
    statusCode: 502,
    details: { service }
  })
}

/**
 * Type guards
 */
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'statusCode' in error
  )
}

function isDatabaseError(error: Error): boolean {
  // Check for common database error patterns
  const dbErrorPatterns = [
    'connection',
    'timeout',
    'constraint',
    'foreign key',
    'unique',
    'duplicate',
    'deadlock',
    'relation',
    'column',
    'table'
  ]
  
  const message = error.message.toLowerCase()
  return dbErrorPatterns.some(pattern => message.includes(pattern))
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Error boundary for API routes
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleError(error, { args })
    }
  }
}

/**
 * Async error handler wrapper
 */
export function asyncHandler(
  fn: (request: Request, context?: any) => Promise<Response>
) {
  return async (request: Request, context?: any): Promise<Response> => {
    try {
      return await fn(request, context)
    } catch (error) {
      return handleError(error, context)
    }
  }
}