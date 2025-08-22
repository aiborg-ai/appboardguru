/**
 * Built-in Middleware Functions
 * Common middleware for request/response processing
 */

import { NextResponse } from 'next/server'
import { MiddlewareFunction } from './types'
import { nanoid } from 'nanoid'

/**
 * Request correlation middleware - adds correlation ID to requests
 */
export function correlationMiddleware(): MiddlewareFunction {
  return async (context, next) => {
    // Generate or extract correlation ID
    const correlationId = context.request.headers.get('x-correlation-id') || nanoid()
    
    // Add to metadata
    context.metadata.correlationId = correlationId
    
    // Continue pipeline
    await next()
    
    // Add to response if it exists
    if (context.response) {
      context.response.headers.set('x-correlation-id', correlationId)
    }
  }
}

/**
 * Request transformation middleware - transforms request data
 */
export function requestTransformMiddleware(): MiddlewareFunction {
  return async (context, next) => {
    if (context.validatedRequest?.validatedBody) {
      // Transform camelCase to snake_case for database compatibility
      context.validatedRequest.validatedBody = transformKeys(
        context.validatedRequest.validatedBody,
        camelToSnakeCase
      )
    }
    
    if (context.validatedRequest?.validatedQuery) {
      // Transform query parameters
      context.validatedRequest.validatedQuery = transformKeys(
        context.validatedRequest.validatedQuery,
        camelToSnakeCase
      )
    }
    
    await next()
  }
}

/**
 * Response transformation middleware - transforms response data
 */
export function responseTransformMiddleware(): MiddlewareFunction {
  return async (context, next) => {
    await next()
    
    if (context.data) {
      // Transform snake_case to camelCase for API responses
      context.data = transformKeys(context.data, snakeToCamelCase)
    }
  }
}

/**
 * Audit logging middleware - logs requests and responses
 */
export function auditMiddleware(): MiddlewareFunction {
  return async (context, next) => {
    const startTime = Date.now()
    
    // Log request
    console.log(`[${context.requestId}] ${context.request.method} ${context.request.url}`, {
      headers: Object.fromEntries(context.request.headers.entries()),
      timestamp: new Date().toISOString()
    })
    
    await next()
    
    const duration = Date.now() - startTime
    
    // Log response/error
    if (context.error) {
      console.error(`[${context.requestId}] ERROR after ${duration}ms:`, context.error)
    } else {
      console.log(`[${context.requestId}] SUCCESS after ${duration}ms`, {
        dataKeys: context.data ? Object.keys(context.data) : []
      })
    }
  }
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(): MiddlewareFunction {
  return async (context, next) => {
    await next()
    
    // Apply security headers to response
    if (!context.response) {
      context.response = NextResponse.json(context.data || {})
    }
    
    const headers = context.response.headers
    
    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'DENY')
    headers.set('X-XSS-Protection', '1; mode=block')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    
    // CORS headers for API routes
    if (context.request.nextUrl.pathname.startsWith('/api/')) {
      headers.set('Access-Control-Allow-Origin', process.env['NEXT_PUBLIC_APP_URL'] || '*')
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-correlation-id')
      headers.set('Access-Control-Allow-Credentials', 'true')
    }
  }
}

/**
 * Error handling middleware
 */
export function errorHandlingMiddleware(): MiddlewareFunction {
  return async (context, next) => {
    try {
      await next()
    } catch (error: any) {
      // Enhanced error handling with context
      console.error(`[${context.requestId}] Middleware error:`, error)
      
      // Add error context
      const enhancedError = new Error(error.message)
      ;(enhancedError as any).originalError = error
      ;(enhancedError as any).requestId = context.requestId
      ;(enhancedError as any).path = context.request.nextUrl.pathname
      ;(enhancedError as any).method = context.request.method
      ;(enhancedError as any).timestamp = new Date().toISOString()
      
      context.error = enhancedError
    }
  }
}

/**
 * Performance monitoring middleware
 */
export function performanceMiddleware(): MiddlewareFunction {
  return async (context, next) => {
    const startTime = performance.now()
    
    await next()
    
    const duration = performance.now() - startTime
    context.metadata.duration = duration
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`[${context.requestId}] Slow request: ${context.request.method} ${context.request.url} took ${duration.toFixed(2)}ms`)
    }
    
    // Add performance headers
    if (context.response) {
      context.response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`)
    }
  }
}

// Utility functions for key transformation
function transformKeys(obj: any, transform: (key: string) => string): any {
  if (obj === null || obj === undefined) return obj
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeys(item, transform))
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const newKey = transform(key)
      result[newKey] = transformKeys(value, transform)
    }
    return result
  }
  
  return obj
}

function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}