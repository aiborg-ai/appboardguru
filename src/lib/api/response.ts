/**
 * API Response Utilities
 * Standardized API responses following CLAUDE.md patterns
 */

import { NextResponse } from 'next/server'

/**
 * Standardized API response structure
 */
interface ApiResponseData<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
  requestId?: string
}

/**
 * API Response Builder Class
 * Following CLAUDE.md enterprise patterns
 */
export class ApiResponse {
  /**
   * Success response (200)
   */
  static success<T>(data: T, message?: string): NextResponse {
    const response: ApiResponseData<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 200 })
  }

  /**
   * Created response (201)
   */
  static created<T>(data: T, message?: string): NextResponse {
    const response: ApiResponseData<T> = {
      success: true,
      data,
      message: message || 'Resource created successfully',
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 201 })
  }

  /**
   * No content response (204)
   */
  static noContent(message?: string): NextResponse {
    return new NextResponse(null, { status: 204 })
  }

  /**
   * Bad request response (400)
   */
  static badRequest(message: string, details?: unknown): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(details && { data: details })
    }

    return NextResponse.json(response, { status: 400 })
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(message: string = 'Authentication required'): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 401 })
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(message: string = 'Access denied'): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 403 })
  }

  /**
   * Not found response (404)
   */
  static notFound(message: string = 'Resource not found'): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 404 })
  }

  /**
   * Conflict response (409)
   */
  static conflict(message: string, details?: unknown): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(details && { data: details })
    }

    return NextResponse.json(response, { status: 409 })
  }

  /**
   * Too many requests response (429)
   */
  static tooManyRequests(message: string = 'Rate limit exceeded'): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { 
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    })
  }

  /**
   * Internal server error response (500)
   */
  static internalError(message: string, details?: string): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(details && { data: { details } })
    }

    return NextResponse.json(response, { status: 500 })
  }

  /**
   * Service unavailable response (503)
   */
  static serviceUnavailable(message: string = 'Service temporarily unavailable'): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 503 })
  }
}

/**
 * Error response helper for Result pattern integration
 */
export function handleServiceResult<T>(
  result: { success: boolean; data?: T; error?: { message: string } },
  successMessage?: string
): NextResponse {
  if (result.success) {
    return ApiResponse.success(result.data, successMessage)
  } else {
    return ApiResponse.internalError(
      'Service operation failed',
      result.error?.message
    )
  }
}

export type { ApiResponseData }