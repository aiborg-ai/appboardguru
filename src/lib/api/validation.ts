/**
 * API Validation Utilities
 * Request validation following CLAUDE.md patterns with Zod
 */

import { NextRequest } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import type { Result } from '../repositories/result'

/**
 * Validation result type
 */
interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: Array<{
    field: string
    message: string
    code: string
  }>
}

/**
 * Validate request body against Zod schema
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (result.success) {
      return {
        success: true,
        data: result.data
      }
    } else {
      return {
        success: false,
        errors: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }
    }
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'body',
        message: 'Invalid JSON in request body',
        code: 'invalid_json'
      }]
    }
  }
}

/**
 * Validate query parameters against Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const result = schema.safeParse(params)

    if (result.success) {
      return {
        success: true,
        data: result.data
      }
    } else {
      return {
        success: false,
        errors: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }
    }
  } catch (error) {
    return {
      success: false,
      errors: [{
        field: 'query',
        message: 'Invalid query parameters',
        code: 'invalid_query'
      }]
    }
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // ID validation
  id: z.string().uuid('Invalid ID format'),
  
  // Pagination
  pagination: z.object({
    page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional()
  }),
  
  // Search
  search: z.object({
    q: z.string().min(1).max(100),
    filters: z.string().optional()
  }),
  
  // File upload validation
  fileUpload: z.object({
    fileName: z.string().min(1).max(255),
    fileSize: z.number().min(1).max(100 * 1024 * 1024), // 100MB max
    fileType: z.string().regex(/^[a-zA-Z0-9\/\-\+\.]+$/, 'Invalid MIME type'),
    organizationId: z.string().uuid()
  }),
  
  // Date range validation
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate)
    }
    return true
  }, {
    message: 'Start date must be before end date'
  })
}

/**
 * Validation middleware helper
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (data: T, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const validation = await validateRequest(request, schema)
    
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    return handler(validation.data, request)
  }
}

/**
 * Sanitize input data
 */
export function sanitizeInput(input: unknown): unknown {
  if (typeof input === 'string') {
    // Basic XSS prevention
    return input
      .replace(/[<>]/g, '')
      .trim()
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }
  
  if (input && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  
  return input
}

export type { ValidationResult }