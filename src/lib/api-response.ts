/**
 * Standardized API Response Utilities
 * Provides consistent response formats and error handling across all API routes
 */

import { NextResponse } from 'next/server'
import { isProduction } from '@/config/environment'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errors?: string[]
  message?: string
  timestamp: string
  requestId?: string
}

export interface ApiError {
  message: string
  code?: string
  statusCode: number
  details?: any
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }
  
  return NextResponse.json(response, { status: statusCode })
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string | Error | ApiError,
  statusCode: number = 500,
  details?: any
): NextResponse<ApiResponse> {
  let errorMessage: string
  let errorCode: string | undefined
  let errorDetails: any = details
  
  if (error instanceof Error) {
    errorMessage = error.message
    errorCode = error.name
    if (!isProduction()) {
      errorDetails = {
        stack: error.stack,
        ...details
      }
    }
  } else if (typeof error === 'object' && 'message' in error) {
    errorMessage = error.message
    errorCode = error.code
    if (error.details) {
      errorDetails = error.details
    }
  } else {
    errorMessage = String(error)
  }
  
  const response: ApiResponse = {
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString()
  }
  
  // Only include sensitive details in development
  if (!isProduction() && errorDetails) {
    response.data = errorDetails
  }
  
  return NextResponse.json(response, { status: statusCode })
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  errors: string[],
  message: string = 'Validation failed'
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error: message,
    errors,
    timestamp: new Date().toISOString()
  }
  
  return NextResponse.json(response, { status: 400 })
}

/**
 * Create a rate limit error response
 */
export function createRateLimitErrorResponse(
  retryAfter?: number
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString()
  }
  
  const headers: Record<string, string> = {}
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString()
  }
  
  return NextResponse.json(response, { 
    status: 429,
    headers
  })
}

/**
 * Create an unauthorized error response
 */
export function createUnauthorizedResponse(
  message: string = 'Unauthorized access'
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  }
  
  return NextResponse.json(response, { status: 401 })
}

/**
 * Create a not found error response
 */
export function createNotFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error: `${resource} not found`,
    timestamp: new Date().toISOString()
  }
  
  return NextResponse.json(response, { status: 404 })
}

/**
 * Wrap API handler with error catching and logging
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('API Error:', error)
      
      // Handle specific error types
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return createErrorResponse('Invalid JSON in request body', 400)
      }
      
      if (error instanceof TypeError) {
        return createErrorResponse('Invalid request format', 400)
      }
      
      // Generic error response
      return createErrorResponse(
        isProduction() 
          ? 'Internal server error' 
          : error instanceof Error ? error.message : 'Unknown error',
        500
      )
    }
  }
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  if (isProduction()) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  return response
}

/**
 * Validate request method
 */
export function validateRequestMethod(
  request: Request,
  allowedMethods: string[]
): boolean {
  return allowedMethods.includes(request.method)
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  return 'unknown'
}