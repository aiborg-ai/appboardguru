/**
 * Middleware System Types
 * Defines interfaces for the middleware pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { ValidatedRequest } from '@/lib/api/createAPIHandler'

// Middleware context passed through the pipeline
export interface MiddlewareContext {
  request: NextRequest
  validatedRequest?: ValidatedRequest
  response?: NextResponse
  data?: any
  error?: any
  metadata: Record<string, any>
  startTime: number
  requestId: string
}

// Middleware function signature
export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>

// Middleware configuration
export interface MiddlewareConfig {
  name: string
  enabled: boolean
  order: number
  conditions?: {
    methods?: string[]
    paths?: string[]
    excludePaths?: string[]
  }
}

// Built-in middleware types
export interface RequestTransformConfig {
  camelCaseToSnakeCase?: boolean
  snakeCaseToCamelCase?: boolean
  customTransforms?: Record<string, (value: any) => any>
}

export interface ResponseTransformConfig {
  snakeCaseToCamelCase?: boolean
  camelCaseToSnakeCase?: boolean
  customTransforms?: Record<string, (value: any) => any>
}

export interface AuditConfig {
  logRequests?: boolean
  logResponses?: boolean
  logErrors?: boolean
  includeHeaders?: boolean
  includeBody?: boolean
  excludeFields?: string[]
}

export interface CorrelationConfig {
  headerName?: string
  generateId?: () => string
}

export interface SecurityConfig {
  corsOrigins?: string[]
  corsCredentials?: boolean
  rateLimitByIP?: boolean
  requireHttps?: boolean
  contentSecurityPolicy?: string
}