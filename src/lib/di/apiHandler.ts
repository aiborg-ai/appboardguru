/**
 * DI-Aware API Handler
 * Extends createAPIHandler with dependency injection support
 */

import { NextRequest } from 'next/server'
import { createAPIHandler, APIHandlerConfig, ValidatedRequest } from '@/lib/api/createAPIHandler'
import { Container, registerServices, ServiceMap } from './container'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Enhanced request with service container
export interface DIRequest<T = any> extends ValidatedRequest<T> {
  services: ServiceContainer
}

// Service container wrapper for type safety
export class ServiceContainer {
  constructor(private container: Container) {}
  
  get<K extends keyof ServiceMap>(key: K): ServiceMap[K] {
    return this.container.resolve(key)
  }
  
  resolve<T>(key: string): T {
    return this.container.resolve(key)
  }
}

/**
 * Create DI-aware API handler
 */
export function createDIAPIHandler<TInput = any, TOutput = any>(
  config: APIHandlerConfig<TInput>,
  handler: (req: DIRequest<TInput>) => Promise<TOutput | { data: TOutput; message?: string }>
) {
  return createAPIHandler(config, async (req: ValidatedRequest<TInput>) => {
    // Create request-scoped container
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )
    
    // Register services with the current Supabase client
    const scopedContainer = registerServices(supabase).createScope()
    
    // Add service container to request
    const diRequest = req as DIRequest<TInput>
    diRequest.services = new ServiceContainer(scopedContainer)
    
    // Call the handler with DI support
    return handler(diRequest)
  })
}

// Convenience factory methods with DI support
export const DIHandlers = {
  /**
   * GET handler with DI
   */
  get: <TOutput>(
    config: Omit<APIHandlerConfig, 'validation'> & { validation?: { query?: any } } = {},
    handler: (req: DIRequest) => Promise<TOutput>
  ) => createDIAPIHandler(
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
   * POST handler with DI
   */
  post: <TInput, TOutput>(
    schema: any,
    config: Omit<APIHandlerConfig<TInput>, 'validation'> = {},
    handler: (req: DIRequest<TInput>) => Promise<TOutput>
  ) => createDIAPIHandler(
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
   * PUT handler with DI
   */
  put: <TInput, TOutput>(
    schema: any,
    config: Omit<APIHandlerConfig<TInput>, 'validation'> = {},
    handler: (req: DIRequest<TInput>) => Promise<TOutput>
  ) => createDIAPIHandler(
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
   * DELETE handler with DI
   */
  delete: <TOutput>(
    config: Omit<APIHandlerConfig, 'validation'> & { validation?: { query?: any } } = {},
    handler: (req: DIRequest) => Promise<TOutput>
  ) => createDIAPIHandler(
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
export function useServices(req: DIRequest) {
  return {
    organizationService: req.services.get('OrganizationService'),
    organizationRepository: req.services.get('OrganizationRepository')
  }
}