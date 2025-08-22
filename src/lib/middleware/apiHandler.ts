/**
 * Middleware-Enhanced API Handler
 * Integrates middleware pipeline with API handlers
 */

import { NextRequest } from 'next/server'
import { createDIAPIHandler, DIRequest } from '@/lib/di/apiHandler'
import { APIHandlerConfig } from '@/lib/api/createAPIHandler'
import { globalPipeline } from './pipeline'
import { 
  correlationMiddleware,
  requestTransformMiddleware,
  responseTransformMiddleware,
  auditMiddleware,
  securityHeadersMiddleware,
  errorHandlingMiddleware,
  performanceMiddleware
} from './builtin'

// Initialize default middleware pipeline
function initializeDefaultMiddleware() {
  if (globalPipeline.getMiddleware().length === 0) {
    globalPipeline
      .register(errorHandlingMiddleware(), {
        name: 'error-handling',
        enabled: true,
        order: 0 // First to catch all errors
      })
      .register(correlationMiddleware(), {
        name: 'correlation',
        enabled: true,
        order: 10
      })
      .register(performanceMiddleware(), {
        name: 'performance',
        enabled: true,
        order: 20
      })
      .register(securityHeadersMiddleware(), {
        name: 'security-headers',
        enabled: true,
        order: 30
      })
      .register(auditMiddleware(), {
        name: 'audit',
        enabled: process.env['NODE_ENV'] === 'development',
        order: 40
      })
      .register(requestTransformMiddleware(), {
        name: 'request-transform',
        enabled: true,
        order: 50
      })
      .register(responseTransformMiddleware(), {
        name: 'response-transform',
        enabled: true,
        order: 60
      })
  }
}

/**
 * Enhanced API handler with middleware pipeline
 */
export function createEnhancedAPIHandler<TInput = any, TOutput = any>(
  config: APIHandlerConfig<TInput>,
  handler: (req: DIRequest<TInput>) => Promise<TOutput | { data: TOutput; message?: string }>
) {
  // Initialize default middleware if not already done
  initializeDefaultMiddleware()
  
  return createDIAPIHandler(config, async (req: DIRequest<TInput>) => {
    // Execute through middleware pipeline
    return await globalPipeline.execute(req, async (context) => {
      // Set validated request in context for middleware access
      context.validatedRequest = req
      
      // Call the actual handler
      const result = await handler(req)
      
      return result
    })
  })
}

// Enhanced handler factory methods
export const EnhancedHandlers = {
  /**
   * GET handler with middleware
   */
  get: <TOutput>(
    config: Omit<APIHandlerConfig, 'validation'> & { validation?: { query?: any } } = {},
    handler: (req: DIRequest) => Promise<TOutput>
  ) => createEnhancedAPIHandler(
    {
      authenticate: true,
      cache: { ttl: 300 },
      rateLimit: { requests: 100, window: '1m' },
      ...config
    },
    async (req) => {
      const result = await handler(req)
      return { data: result }
    }
  ),

  /**
   * POST handler with middleware
   */
  post: <TInput, TOutput>(
    schema: any,
    config: Omit<APIHandlerConfig<TInput>, 'validation'> = {},
    handler: (req: DIRequest<TInput>) => Promise<TOutput>
  ) => createEnhancedAPIHandler(
    {
      authenticate: true,
      validation: { body: schema },
      rateLimit: { requests: 50, window: '1m' },
      audit: true,
      ...config
    },
    async (req) => {
      const result = await handler(req)
      return { data: result }
    }
  ),

  /**
   * PUT handler with middleware
   */
  put: <TInput, TOutput>(
    schema: any,
    config: Omit<APIHandlerConfig<TInput>, 'validation'> = {},
    handler: (req: DIRequest<TInput>) => Promise<TOutput>
  ) => createEnhancedAPIHandler(
    {
      authenticate: true,
      validation: { body: schema },
      rateLimit: { requests: 100, window: '1m' },
      audit: true,
      ...config
    },
    async (req) => {
      const result = await handler(req)
      return { data: result }
    }
  ),

  /**
   * DELETE handler with middleware
   */
  delete: <TOutput>(
    config: Omit<APIHandlerConfig, 'validation'> & { validation?: { query?: any } } = {},
    handler: (req: DIRequest) => Promise<TOutput>
  ) => createEnhancedAPIHandler(
    {
      authenticate: true,
      audit: true,
      rateLimit: { requests: 50, window: '1m' },
      ...config
    },
    async (req) => {
      const result = await handler(req)
      return { data: result }
    }
  )
}

// Service helper for accessing common services
export function useServices(req: any) {
  return {
    organizationService: req.services.get('OrganizationService'),
    organizationRepository: req.services.get('OrganizationRepository')
  }
}

// Middleware management utilities
export const MiddlewareManager = {
  /**
   * Add custom middleware
   */
  add(middleware: any, config: any) {
    globalPipeline.register(middleware, config)
  },
  
  /**
   * Remove middleware by name
   */
  remove(name: string) {
    return globalPipeline.remove(name)
  },
  
  /**
   * Get all middleware
   */
  list() {
    return globalPipeline.getMiddleware()
  },
  
  /**
   * Clear all middleware (use with caution)
   */
  clear() {
    globalPipeline.clear()
  }
}