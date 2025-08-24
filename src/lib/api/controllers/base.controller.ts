/**
 * Base Controller for Enterprise API Architecture
 * Provides common functionality for all API controllers
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Result } from '@/lib/repositories/result'
import { RepositoryError } from '@/lib/repositories/document-errors'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
  requestId?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export interface ApiErrorResponse {
  success: false
  error: string
  message: string
  details?: any
  timestamp: string
  requestId?: string
}

/**
 * Base Controller class with common API functionality
 */
export abstract class BaseController {
  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Create success response
   */
  protected success<T>(data: T, message?: string, status: number = 200): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
        message,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      },
      { status }
    )
  }

  /**
   * Create created response (201)
   */
  protected created<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
    return this.success(data, message, 201)
  }

  /**
   * Create error response
   */
  protected error(
    message: string,
    status: number = 500,
    details?: any
  ): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error: this.getErrorCode(status),
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      },
      { status }
    )
  }

  /**
   * Create bad request response (400)
   */
  protected badRequest(message: string, details?: any): NextResponse<ApiErrorResponse> {
    return this.error(message, 400, details)
  }

  /**
   * Create unauthorized response (401)
   */
  protected unauthorized(message: string = 'Authentication required'): NextResponse<ApiErrorResponse> {
    return this.error(message, 401)
  }

  /**
   * Create forbidden response (403)
   */
  protected forbidden(message: string = 'Access denied'): NextResponse<ApiErrorResponse> {
    return this.error(message, 403)
  }

  /**
   * Create not found response (404)
   */
  protected notFound(message: string = 'Resource not found'): NextResponse<ApiErrorResponse> {
    return this.error(message, 404)
  }

  /**
   * Create conflict response (409)
   */
  protected conflict(message: string, details?: any): NextResponse<ApiErrorResponse> {
    return this.error(message, 409, details)
  }

  /**
   * Create unprocessable entity response (422)
   */
  protected unprocessableEntity(message: string, details?: any): NextResponse<ApiErrorResponse> {
    return this.error(message, 422, details)
  }

  /**
   * Create internal server error response (500)
   */
  protected internalError(message: string = 'Internal server error'): NextResponse<ApiErrorResponse> {
    return this.error(message, 500)
  }

  /**
   * Handle Result pattern from services/repositories
   */
  protected handleResult<T>(
    result: Result<T>,
    successMessage?: string,
    successStatus: number = 200
  ): NextResponse<ApiResponse<T> | ApiErrorResponse> {
    if (result.success) {
      return this.success(result.data, successMessage, successStatus)
    }

    // Map repository errors to HTTP status codes
    const status = this.mapErrorToStatus(result.error)
    return this.error(result.error.message, status, {
      code: result.error.code,
      severity: result.error.severity,
      recoverable: result.error.recoverable,
      context: result.error.context
    })
  }

  /**
   * Create paginated response
   */
  protected paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): NextResponse<PaginatedResponse<T>> {
    const totalPages = Math.ceil(total / limit)
    const hasMore = page < totalPages

    return NextResponse.json(
      {
        success: true,
        data,
        message,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore
        }
      },
      { status: 200 }
    )
  }

  /**
   * Validate request body with Zod schema
   */
  protected async validateBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<Result<T>> {
    try {
      const body = await request.json()
      const result = schema.safeParse(body)
      
      if (!result.success) {
        return {
          success: false,
          error: new RepositoryError(
            'Validation failed',
            'VALIDATION_ERROR',
            { errors: result.error.errors },
            'medium',
            true
          )
        }
      }

      return { success: true, data: result.data }
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Invalid JSON body',
          'INVALID_JSON',
          { originalError: error },
          'medium',
          true
        )
      }
    }
  }

  /**
   * Extract query parameters with validation
   */
  protected extractQueryParams(url: string): Record<string, string> {
    const urlObj = new URL(url)
    const params: Record<string, string> = {}
    
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value
    })
    
    return params
  }

  /**
   * Extract pagination parameters
   */
  protected extractPagination(url: string): { page: number; limit: number } {
    const params = this.extractQueryParams(url)
    const page = Math.max(1, parseInt(params.page || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10)))
    
    return { page, limit }
  }

  /**
   * Map repository errors to HTTP status codes
   */
  private mapErrorToStatus(error: RepositoryError): number {
    switch (error.code) {
      case 'NOT_FOUND':
      case 'PROFILE_NOT_FOUND':
        return 404
      case 'VALIDATION_ERROR':
      case 'INVALID_JSON':
        return 400
      case 'AUTH_ERROR':
      case 'UNAUTHENTICATED':
        return 401
      case 'FORBIDDEN':
      case 'INSUFFICIENT_PERMISSIONS':
        return 403
      case 'CONFLICT':
      case 'DUPLICATE_ENTRY':
        return 409
      case 'MUTATION_ERROR':
      case 'QUERY_ERROR':
        return 422
      case 'RATE_LIMIT_EXCEEDED':
        return 429
      default:
        return 500
    }
  }

  /**
   * Get error code from HTTP status
   */
  private getErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST'
      case 401:
        return 'UNAUTHORIZED'
      case 403:
        return 'FORBIDDEN'
      case 404:
        return 'NOT_FOUND'
      case 409:
        return 'CONFLICT'
      case 422:
        return 'UNPROCESSABLE_ENTITY'
      case 429:
        return 'RATE_LIMIT_EXCEEDED'
      case 500:
      default:
        return 'INTERNAL_SERVER_ERROR'
    }
  }
}

/**
 * API Response utility functions for non-class usage
 */
export const ApiResponse = {
  success: <T>(data: T, message?: string, status: number = 200): NextResponse<ApiResponse<T>> => {
    return NextResponse.json(
      {
        success: true,
        data,
        message,
        timestamp: new Date().toISOString()
      },
      { status }
    )
  },

  error: (message: string, status: number = 500): NextResponse<ApiErrorResponse> => {
    return NextResponse.json(
      {
        success: false,
        error: getErrorCodeFromStatus(status),
        message,
        timestamp: new Date().toISOString()
      },
      { status }
    )
  },

  created: <T>(data: T, message?: string): NextResponse<ApiResponse<T>> => {
    return ApiResponse.success(data, message, 201)
  },

  badRequest: (message: string): NextResponse<ApiErrorResponse> => {
    return ApiResponse.error(message, 400)
  },

  unauthorized: (message: string = 'Authentication required'): NextResponse<ApiErrorResponse> => {
    return ApiResponse.error(message, 401)
  },

  forbidden: (message: string = 'Access denied'): NextResponse<ApiErrorResponse> => {
    return ApiResponse.error(message, 403)
  },

  notFound: (message: string = 'Resource not found'): NextResponse<ApiErrorResponse> => {
    return ApiResponse.error(message, 404)
  },

  internalError: (message: string = 'Internal server error'): NextResponse<ApiErrorResponse> => {
    return ApiResponse.error(message, 500)
  }
}

function getErrorCodeFromStatus(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST'
    case 401: return 'UNAUTHORIZED'
    case 403: return 'FORBIDDEN'
    case 404: return 'NOT_FOUND'
    case 409: return 'CONFLICT'
    case 422: return 'UNPROCESSABLE_ENTITY'
    case 429: return 'RATE_LIMIT_EXCEEDED'
    case 500: default: return 'INTERNAL_SERVER_ERROR'
  }
}