/**
 * Middleware Pipeline
 * Orchestrates middleware execution in order
 */

import { NextRequest } from 'next/server'
import { MiddlewareFunction, MiddlewareContext, MiddlewareConfig } from './types'
import { nanoid } from 'nanoid'

// Registered middleware with config
interface RegisteredMiddleware {
  middleware: MiddlewareFunction
  config: MiddlewareConfig
}

export class MiddlewarePipeline {
  private middlewares: RegisteredMiddleware[] = []
  
  /**
   * Register middleware with configuration
   */
  register(
    middleware: MiddlewareFunction,
    config: MiddlewareConfig
  ): MiddlewarePipeline {
    this.middlewares.push({ middleware, config })
    
    // Sort by order
    this.middlewares.sort((a, b) => a.config.order - b.config.order)
    
    return this
  }
  
  /**
   * Execute middleware pipeline
   */
  async execute(
    request: NextRequest,
    handler: (context: MiddlewareContext) => Promise<any>
  ): Promise<any> {
    const startTime = Date.now()
    const requestId = nanoid()
    
    const context: MiddlewareContext = {
      request,
      metadata: {},
      startTime,
      requestId
    }
    
    // Filter applicable middleware
    const applicableMiddleware = this.middlewares.filter(({ config }) => {
      if (!config.enabled) return false
      
      if (config.conditions) {
        const { methods, paths, excludePaths } = config.conditions
        
        // Check HTTP method
        if (methods && !methods.includes(request.method)) {
          return false
        }
        
        // Check path inclusion
        if (paths && !paths.some(path => request.nextUrl.pathname.startsWith(path))) {
          return false
        }
        
        // Check path exclusion
        if (excludePaths && excludePaths.some(path => request.nextUrl.pathname.startsWith(path))) {
          return false
        }
      }
      
      return true
    })
    
    let currentIndex = 0
    
    const next = async (): Promise<void> => {
      if (currentIndex >= applicableMiddleware.length) {
        // All middleware executed, call the handler
        try {
          context.data = await handler(context)
        } catch (error) {
          context.error = error
        }
        return
      }
      
      const middlewareItem = applicableMiddleware[currentIndex++]
      if (!middlewareItem) return;
      const { middleware } = middlewareItem
      await middleware(context, next)
    }
    
    // Start the pipeline
    await next()
    
    // Return result or throw error
    if (context.error) {
      throw context.error
    }
    
    return context.data
  }
  
  /**
   * Get registered middleware info
   */
  getMiddleware(): MiddlewareConfig[] {
    return this.middlewares.map(({ config }) => config)
  }
  
  /**
   * Remove middleware by name
   */
  remove(name: string): boolean {
    const initialLength = this.middlewares.length
    this.middlewares = this.middlewares.filter(({ config }) => config.name !== name)
    return this.middlewares.length < initialLength
  }
  
  /**
   * Clear all middleware
   */
  clear(): void {
    this.middlewares = []
  }
}

// Global pipeline instance
export const globalPipeline = new MiddlewarePipeline()