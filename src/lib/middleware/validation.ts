/**
 * Request/Response Validation Middleware
 * Validates requests and responses against OpenAPI schemas
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import { MiddlewareContext } from './types'

// Initialize AJV for OpenAPI schema validation
const ajv = new Ajv({ 
  allErrors: true, 
  removeAdditional: true,
  useDefaults: true,
  coerceTypes: true
})
addFormats(ajv)

export interface ValidationConfig {
  requestBody?: ZodSchema | any // OpenAPI schema object
  queryParameters?: ZodSchema | any
  pathParameters?: ZodSchema | any
  headers?: ZodSchema | any
  response?: Record<number, ZodSchema | any> // Response schemas by status code
  skipValidation?: boolean
  strictMode?: boolean
  sanitizeInput?: boolean
}

export interface ValidationError {
  field: string
  message: string
  value?: any
  code?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  data?: any
}

/**
 * Validate data against Zod schema
 */
function validateWithZod(schema: ZodSchema, data: any): ValidationResult {
  try {
    const result = schema.parse(data)
    return {
      valid: true,
      errors: [],
      data: result
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.input,
        code: err.code
      }))
      
      return {
        valid: false,
        errors
      }
    }
    
    return {
      valid: false,
      errors: [{
        field: 'unknown',
        message: 'Validation failed',
        code: 'UNKNOWN_ERROR'
      }]
    }
  }
}

/**
 * Validate data against OpenAPI schema
 */
function validateWithOpenAPI(schema: any, data: any): ValidationResult {
  try {
    const validate: ValidateFunction = ajv.compile(schema)
    const valid = validate(data)
    
    if (valid) {
      return {
        valid: true,
        errors: [],
        data
      }
    }
    
    const errors: ValidationError[] = (validate.errors || []).map(err => ({
      field: err.instancePath?.substring(1) || err.schemaPath,
      message: err.message || 'Validation failed',
      value: err.data,
      code: err.keyword?.toUpperCase()
    }))
    
    return {
      valid: false,
      errors
    }
  } catch (error) {
    return {
      valid: false,
      errors: [{
        field: 'schema',
        message: 'Schema validation error',
        code: 'SCHEMA_ERROR'
      }]
    }
  }
}

/**
 * Generic validation function
 */
function validateData(schema: ZodSchema | any, data: any): ValidationResult {
  if (schema instanceof ZodSchema || (schema && typeof schema.parse === 'function')) {
    return validateWithZod(schema, data)
  } else if (schema && typeof schema === 'object') {
    return validateWithOpenAPI(schema, data)
  }
  
  return {
    valid: true,
    errors: [],
    data
  }
}

/**
 * Parse and validate request body
 */
async function parseRequestBody(request: NextRequest): Promise<any> {
  const contentType = request.headers.get('content-type') || ''
  
  if (contentType.includes('application/json')) {
    try {
      return await request.json()
    } catch {
      throw new Error('Invalid JSON in request body')
    }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData()
    const data: Record<string, any> = {}
    
    for (const [key, value] of formData.entries()) {
      if (data[key]) {
        // Handle multiple values for same key
        if (Array.isArray(data[key])) {
          data[key].push(value)
        } else {
          data[key] = [data[key], value]
        }
      } else {
        data[key] = value
      }
    }
    
    return data
  } else if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const data: Record<string, any> = {}
    
    for (const [key, value] of formData.entries()) {
      data[key] = value
    }
    
    return data
  }
  
  return null
}

/**
 * Parse query parameters
 */
function parseQueryParameters(request: NextRequest): Record<string, any> {
  const params: Record<string, any> = {}
  
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    if (params[key]) {
      // Handle multiple values
      if (Array.isArray(params[key])) {
        params[key].push(value)
      } else {
        params[key] = [params[key], value]
      }
    } else {
      // Try to parse as number or boolean
      if (/^\d+$/.test(value)) {
        params[key] = parseInt(value, 10)
      } else if (/^\d*\.\d+$/.test(value)) {
        params[key] = parseFloat(value)
      } else if (value === 'true') {
        params[key] = true
      } else if (value === 'false') {
        params[key] = false
      } else {
        params[key] = value
      }
    }
  }
  
  return params
}

/**
 * Parse path parameters from URL
 */
function parsePathParameters(request: NextRequest, pattern?: string): Record<string, string> {
  const params: Record<string, string> = {}
  
  if (!pattern) return params
  
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const patternParts = pattern.split('/')
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    if (patternPart.startsWith('{') && patternPart.endsWith('}')) {
      const paramName = patternPart.slice(1, -1)
      params[paramName] = pathParts[i] || ''
    }
  }
  
  return params
}

/**
 * Sanitize input data
 */
function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    // Basic XSS protection
    return data
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim()
  } else if (Array.isArray(data)) {
    return data.map(sanitizeInput)
  } else if (data && typeof data === 'object') {
    const sanitized: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      // Sanitize key names
      const cleanKey = key.replace(/[^\w.-]/g, '')
      sanitized[cleanKey] = sanitizeInput(value)
    }
    return sanitized
  }
  
  return data
}

/**
 * Request Validation Middleware
 */
export function requestValidationMiddleware(config: ValidationConfig) {
  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    const { request } = context
    
    if (config.skipValidation) {
      await next()
      return
    }

    const validationErrors: ValidationError[] = []
    const validatedData: Record<string, any> = {}

    try {
      // Validate request body
      if (config.requestBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const body = await parseRequestBody(request)
        
        if (body !== null) {
          const sanitizedBody = config.sanitizeInput ? sanitizeInput(body) : body
          const validation = validateData(config.requestBody, sanitizedBody)
          
          if (!validation.valid) {
            validationErrors.push(...validation.errors.map(err => ({
              ...err,
              field: `body.${err.field}`
            })))
          } else {
            validatedData.body = validation.data
          }
        }
      }

      // Validate query parameters
      if (config.queryParameters) {
        const query = parseQueryParameters(request)
        const sanitizedQuery = config.sanitizeInput ? sanitizeInput(query) : query
        const validation = validateData(config.queryParameters, sanitizedQuery)
        
        if (!validation.valid) {
          validationErrors.push(...validation.errors.map(err => ({
            ...err,
            field: `query.${err.field}`
          })))
        } else {
          validatedData.query = validation.data
        }
      }

      // Validate path parameters
      if (config.pathParameters) {
        const pathParams = parsePathParameters(request)
        const validation = validateData(config.pathParameters, pathParams)
        
        if (!validation.valid) {
          validationErrors.push(...validation.errors.map(err => ({
            ...err,
            field: `path.${err.field}`
          })))
        } else {
          validatedData.path = validation.data
        }
      }

      // Validate headers
      if (config.headers) {
        const headers: Record<string, string> = {}
        request.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value
        })
        
        const validation = validateData(config.headers, headers)
        
        if (!validation.valid) {
          validationErrors.push(...validation.errors.map(err => ({
            ...err,
            field: `headers.${err.field}`
          })))
        } else {
          validatedData.headers = validation.data
        }
      }

      // Check if validation failed
      if (validationErrors.length > 0) {
        const response = NextResponse.json({
          success: false,
          error: 'Request validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors,
          timestamp: new Date().toISOString()
        }, { status: 400 })

        context.response = response
        return
      }

      // Add validated data to context
      context.validatedRequest = validatedData
      context.validatedBody = validatedData.body
      context.validatedQuery = validatedData.query
      context.validatedPath = validatedData.path
      context.validatedHeaders = validatedData.headers

      await next()

    } catch (error) {
      const response = NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Request parsing failed',
        code: 'REQUEST_PARSING_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 400 })

      context.response = response
    }
  }
}

/**
 * Response Validation Middleware
 */
export function responseValidationMiddleware(config: ValidationConfig) {
  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    await next()

    if (config.skipValidation || !config.response || !context.response) {
      return
    }

    try {
      const response = context.response
      const status = response.status
      const responseSchema = config.response[status]

      if (!responseSchema) {
        // No schema defined for this status code
        return
      }

      // Clone response to read body
      const clonedResponse = response.clone()
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        const responseBody = await clonedResponse.json()
        const validation = validateData(responseSchema, responseBody)

        if (!validation.valid && config.strictMode) {
          // In strict mode, return validation error
          console.error('Response validation failed:', validation.errors)
          
          const errorResponse = NextResponse.json({
            success: false,
            error: 'Response validation failed',
            code: 'RESPONSE_VALIDATION_ERROR',
            details: validation.errors,
            timestamp: new Date().toISOString()
          }, { status: 500 })

          context.response = errorResponse
        } else if (!validation.valid) {
          // In non-strict mode, just log the error
          console.warn('Response validation warning:', {
            status,
            errors: validation.errors,
            url: context.request.url,
            method: context.request.method
          })
        }
      }

    } catch (error) {
      if (config.strictMode) {
        const errorResponse = NextResponse.json({
          success: false,
          error: 'Response validation error',
          code: 'RESPONSE_VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        }, { status: 500 })

        context.response = errorResponse
      } else {
        console.warn('Response validation error:', error)
      }
    }
  }
}

/**
 * Combined validation middleware factory
 */
export function validationMiddleware(config: ValidationConfig) {
  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    // Apply request validation
    const requestValidator = requestValidationMiddleware(config)
    await requestValidator(context, async () => {
      // Continue to next middleware/handler
      await next()
    })

    // Apply response validation if request validation passed
    if (!context.response || context.response.status < 400) {
      const responseValidator = responseValidationMiddleware(config)
      await responseValidator(context, async () => {
        // No-op, response validation is post-processing
      })
    }
  }
}

/**
 * Schema validation utilities
 */
export const ValidationUtils = {
  /**
   * Create validation middleware from OpenAPI spec
   */
  fromOpenAPISpec(spec: any, operationId: string): ValidationConfig {
    const operation = findOperationInSpec(spec, operationId)
    if (!operation) {
      return { skipValidation: true }
    }

    const config: ValidationConfig = {}

    // Extract request body schema
    if (operation.requestBody?.content?.['application/json']?.schema) {
      config.requestBody = operation.requestBody.content['application/json'].schema
    }

    // Extract query parameter schemas
    const queryParams = operation.parameters?.filter((p: any) => p.in === 'query')
    if (queryParams?.length > 0) {
      config.queryParameters = {
        type: 'object',
        properties: queryParams.reduce((acc: any, param: any) => {
          acc[param.name] = param.schema
          return acc
        }, {}),
        required: queryParams.filter((p: any) => p.required).map((p: any) => p.name)
      }
    }

    // Extract path parameter schemas
    const pathParams = operation.parameters?.filter((p: any) => p.in === 'path')
    if (pathParams?.length > 0) {
      config.pathParameters = {
        type: 'object',
        properties: pathParams.reduce((acc: any, param: any) => {
          acc[param.name] = param.schema
          return acc
        }, {}),
        required: pathParams.map((p: any) => p.name)
      }
    }

    // Extract response schemas
    if (operation.responses) {
      config.response = {}
      for (const [status, response] of Object.entries(operation.responses as any)) {
        const statusCode = parseInt(status, 10)
        if (!isNaN(statusCode) && response.content?.['application/json']?.schema) {
          config.response[statusCode] = response.content['application/json'].schema
        }
      }
    }

    return config
  },

  /**
   * Validate against multiple schemas (oneOf, anyOf)
   */
  validateOneOf(schemas: (ZodSchema | any)[], data: any): ValidationResult {
    const errors: ValidationError[] = []
    
    for (const schema of schemas) {
      const result = validateData(schema, data)
      if (result.valid) {
        return result
      }
      errors.push(...result.errors)
    }

    return {
      valid: false,
      errors: [{
        field: 'root',
        message: 'Data does not match any of the expected schemas',
        code: 'ONE_OF_FAILED'
      }]
    }
  }
}

/**
 * Find operation in OpenAPI spec by operationId
 */
function findOperationInSpec(spec: any, operationId: string): any {
  if (!spec.paths) return null

  for (const path of Object.values(spec.paths)) {
    for (const method of Object.values(path as any)) {
      if (typeof method === 'object' && method.operationId === operationId) {
        return method
      }
    }
  }

  return null
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  uuid: z.string().uuid(),
  email: z.string().email(),
  url: z.string().url(),
  dateTime: z.string().datetime(),
  positiveInt: z.number().int().positive(),
  nonEmptyString: z.string().min(1),
  
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(50),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),

  standardResponse: z.object({
    success: z.boolean(),
    message: z.string().optional(),
    timestamp: z.string().datetime(),
    requestId: z.string().uuid().optional()
  }),

  errorResponse: z.object({
    success: z.boolean().default(false),
    error: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
    timestamp: z.string().datetime(),
    requestId: z.string().uuid().optional()
  })
}