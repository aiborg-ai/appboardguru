/**
 * Result-Enhanced API Handler
 * API handlers that work with Result<T, E> pattern
 */

import { Result, AppError, match } from './result'
import { createEnhancedAPIHandler } from '@/lib/middleware/apiHandler'
import { APIHandlerConfig } from '@/lib/api/createAPIHandler'
import { DIRequest, useServices } from '@/lib/middleware/apiHandler'

// Result-based handler type
export type ResultHandler<TInput, TOutput> = (
  req: DIRequest<TInput>
) => Promise<Result<TOutput, AppError>>

/**
 * Create API handler that works with Result pattern
 */
export function createResultAPIHandler<TInput = any, TOutput = any>(
  config: APIHandlerConfig<TInput>,
  handler: ResultHandler<TInput, TOutput>
) {
  return createEnhancedAPIHandler(config, async (req: DIRequest<TInput>) => {
    const result = await handler(req)
    
    return match(result, {
      ok: (data) => ({ data }),
      err: (error) => {
        // Convert AppError to API response error
        throw new APIError(
          getHTTPStatusFromError(error),
          error.code,
          error.message,
          error.details
        )
      }
    })
  })
}

// API Error class for compatibility
class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// Convert AppError codes to HTTP status codes
function getHTTPStatusFromError(error: AppError): number {
  switch (error.code) {
    case 'VALIDATION_ERROR':
    case 'INVALID_INPUT':
    case 'MISSING_FIELD':
      return 400
      
    case 'UNAUTHORIZED':
    case 'TOKEN_EXPIRED':
      return 401
      
    case 'FORBIDDEN':
    case 'INSUFFICIENT_PERMISSIONS':
      return 403
      
    case 'NOT_FOUND':
      return 404
      
    case 'ALREADY_EXISTS':
    case 'CONFLICT':
      return 409
      
    case 'BUSINESS_RULE_VIOLATION':
      return 422
      
    case 'RATE_LIMITED':
      return 429
      
    case 'INTERNAL_ERROR':
    case 'DATABASE_ERROR':
      return 500
      
    case 'SERVICE_UNAVAILABLE':
      return 503
      
    case 'TIMEOUT':
      return 504
      
    default:
      return 500
  }
}

// Result-based handler factory methods
export const ResultHandlers = {
  /**
   * GET handler with Result pattern
   */
  get: <TOutput>(
    config: Omit<APIHandlerConfig, 'validation'> & { validation?: { query?: any } } = {},
    handler: ResultHandler<any, TOutput>
  ) => createResultAPIHandler(
    {
      authenticate: true,
      cache: { ttl: 300 },
      rateLimit: { requests: 100, window: '1m' },
      ...config
    },
    handler
  ),

  /**
   * POST handler with Result pattern
   */
  post: <TInput, TOutput>(
    schema: any,
    config: Omit<APIHandlerConfig<TInput>, 'validation'> = {},
    handler: ResultHandler<TInput, TOutput>
  ) => createResultAPIHandler(
    {
      authenticate: true,
      validation: { body: schema },
      rateLimit: { requests: 50, window: '1m' },
      audit: true,
      ...config
    },
    handler
  ),

  /**
   * PUT handler with Result pattern
   */
  put: <TInput, TOutput>(
    schema: any,
    config: Omit<APIHandlerConfig<TInput>, 'validation'> = {},
    handler: ResultHandler<TInput, TOutput>
  ) => createResultAPIHandler(
    {
      authenticate: true,
      validation: { body: schema },
      rateLimit: { requests: 100, window: '1m' },
      audit: true,
      ...config
    },
    handler
  ),

  /**
   * DELETE handler with Result pattern
   */
  delete: <TOutput>(
    config: Omit<APIHandlerConfig, 'validation'> & { validation?: { query?: any } } = {},
    handler: ResultHandler<any, TOutput>
  ) => createResultAPIHandler(
    {
      authenticate: true,
      audit: true,
      rateLimit: { requests: 50, window: '1m' },
      ...config
    },
    handler
  )
}