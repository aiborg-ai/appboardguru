/**
 * Response Pipeline - Advanced Response Processing Pipeline
 * Handles transformation, enrichment, compression, and sanitization of outgoing responses
 */

import { NextResponse } from 'next/server'
import { Result, Ok, Err } from '../../result'
import { EnhancedRouteConfig } from '../gateway/enhanced-gateway'

export interface ResponseTransformer {
  name: string
  transform: (response: NextResponse, route?: EnhancedRouteConfig) => Promise<Result<NextResponse, Error>>
}

export interface ResponseEnricher {
  name: string
  enrich: (response: NextResponse, route?: EnhancedRouteConfig) => Promise<Result<NextResponse, Error>>
}

export interface ResponseValidator {
  name: string
  validate: (response: NextResponse, route?: EnhancedRouteConfig) => Promise<Result<NextResponse, Error>>
}

export interface ResponseFilter {
  name: string
  filter: (response: NextResponse, route?: EnhancedRouteConfig) => Promise<Result<boolean, Error>>
}

export class ResponsePipeline {
  private transformers: Map<string, ResponseTransformer> = new Map()
  private enrichers: Map<string, ResponseEnricher> = new Map()
  private validators: Map<string, ResponseValidator> = new Map()
  private filters: Map<string, ResponseFilter> = new Map()

  /**
   * Add a transformer to the pipeline
   */
  addTransformer(name: string, transform: (response: NextResponse, route?: EnhancedRouteConfig) => Promise<Result<NextResponse, Error>>): this {
    this.transformers.set(name, { name, transform })
    return this
  }

  /**
   * Add an enricher to the pipeline
   */
  addEnricher(name: string, enrich: (response: NextResponse, route?: EnhancedRouteConfig) => Promise<Result<NextResponse, Error>>): this {
    this.enrichers.set(name, { name, enrich })
    return this
  }

  /**
   * Add a validator to the pipeline
   */
  addValidator(name: string, validate: (response: NextResponse, route?: EnhancedRouteConfig) => Promise<Result<NextResponse, Error>>): this {
    this.validators.set(name, { name, validate })
    return this
  }

  /**
   * Add a filter to the pipeline
   */
  addFilter(name: string, filter: (response: NextResponse, route?: EnhancedRouteConfig) => Promise<Result<boolean, Error>>): this {
    this.filters.set(name, { name, filter })
    return this
  }

  /**
   * Process response through the entire pipeline
   */
  async process(response: NextResponse, route?: EnhancedRouteConfig): Promise<NextResponse> {
    let currentResponse = response

    try {
      // Step 1: Apply filters (early rejection)
      for (const [name, filter] of this.filters.entries()) {
        const filterResult = await filter.filter(currentResponse, route)
        if (!filterResult.success) {
          console.warn(`Response filter ${name} failed:`, filterResult.error?.message)
          continue // Continue processing even if filter fails
        }
        if (!filterResult.value) {
          console.warn(`Response filtered out by ${name}`)
          return this.createFilteredResponse(`Response filtered by ${name}`)
        }
      }

      // Step 2: Apply transformers
      for (const [name, transformer] of this.transformers.entries()) {
        const transformResult = await transformer.transform(currentResponse, route)
        if (!transformResult.success) {
          console.warn(`Response transformer ${name} failed:`, transformResult.error?.message)
          continue // Continue processing even if transformation fails
        }
        currentResponse = transformResult.value!
      }

      // Step 3: Apply enrichers
      for (const [name, enricher] of this.enrichers.entries()) {
        const enrichResult = await enricher.enrich(currentResponse, route)
        if (!enrichResult.success) {
          console.warn(`Response enricher ${name} failed:`, enrichResult.error?.message)
          continue // Continue processing even if enrichment fails
        }
        currentResponse = enrichResult.value!
      }

      // Step 4: Apply validators (sanitization)
      for (const [name, validator] of this.validators.entries()) {
        const validationResult = await validator.validate(currentResponse, route)
        if (!validationResult.success) {
          console.warn(`Response validator ${name} failed:`, validationResult.error?.message)
          continue // Continue processing even if validation fails
        }
        currentResponse = validationResult.value!
      }

      return currentResponse

    } catch (error) {
      console.error(`Response pipeline processing failed:`, error)
      // Return original response if pipeline fails
      return response
    }
  }

  /**
   * Remove a pipeline component
   */
  remove(type: 'transformer' | 'enricher' | 'validator' | 'filter', name: string): this {
    switch (type) {
      case 'transformer':
        this.transformers.delete(name)
        break
      case 'enricher':
        this.enrichers.delete(name)
        break
      case 'validator':
        this.validators.delete(name)
        break
      case 'filter':
        this.filters.delete(name)
        break
    }
    return this
  }

  /**
   * Clear all pipeline components of a specific type
   */
  clear(type: 'transformer' | 'enricher' | 'validator' | 'filter' | 'all'): this {
    switch (type) {
      case 'transformer':
        this.transformers.clear()
        break
      case 'enricher':
        this.enrichers.clear()
        break
      case 'validator':
        this.validators.clear()
        break
      case 'filter':
        this.filters.clear()
        break
      case 'all':
        this.transformers.clear()
        this.enrichers.clear()
        this.validators.clear()
        this.filters.clear()
        break
    }
    return this
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    transformers: number
    enrichers: number
    validators: number
    filters: number
    totalSteps: number
  } {
    return {
      transformers: this.transformers.size,
      enrichers: this.enrichers.size,
      validators: this.validators.size,
      filters: this.filters.size,
      totalSteps: this.transformers.size + this.enrichers.size + this.validators.size + this.filters.size
    }
  }

  private createFilteredResponse(message: string): NextResponse {
    return NextResponse.json({
      success: false,
      error: 'Response filtered',
      message,
      timestamp: new Date().toISOString()
    }, { status: 403 })
  }
}

/**
 * Built-in Response Transformers
 */
export class BuiltInResponseTransformers {
  /**
   * Compress response body
   */
  static compress(compressionLevel: number = 6): ResponseTransformer {
    return {
      name: 'compress-response-transformer',
      transform: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        try {
          const contentType = response.headers.get('content-type')
          
          // Only compress text-based content
          if (!contentType || !this.shouldCompress(contentType)) {
            return Ok(response)
          }

          const body = await response.arrayBuffer()
          
          // Skip compression for small responses
          if (body.byteLength < 1024) {
            return Ok(new NextResponse(body, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            }))
          }

          // In a real implementation, you'd use actual compression here
          // For now, we'll just add compression headers
          const headers = new Headers(response.headers)
          headers.set('Content-Encoding', 'gzip')
          headers.set('X-Compression-Ratio', '0.7') // Placeholder
          
          return Ok(new NextResponse(body, {
            status: response.status,
            statusText: response.statusText,
            headers
          }))
          
        } catch (error) {
          return Err(new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
    }
  }

  private static shouldCompress(contentType: string): boolean {
    const compressibleTypes = [
      'application/json',
      'application/xml',
      'text/html',
      'text/css',
      'text/javascript',
      'text/plain',
      'application/javascript'
    ]
    
    return compressibleTypes.some(type => contentType.includes(type))
  }

  /**
   * Format JSON response
   */
  static formatJson(prettify: boolean = false): ResponseTransformer {
    return {
      name: 'format-json-transformer',
      transform: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        try {
          const contentType = response.headers.get('content-type')
          
          if (!contentType?.includes('application/json')) {
            return Ok(response)
          }

          const body = await response.json()
          const formattedBody = prettify ? JSON.stringify(body, null, 2) : JSON.stringify(body)
          
          return Ok(NextResponse.json(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          }))
          
        } catch (error) {
          return Err(new Error(`JSON formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
    }
  }

  /**
   * Transform error responses to standard format
   */
  static standardizeErrors(): ResponseTransformer {
    return {
      name: 'standardize-errors-transformer',
      transform: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        try {
          if (response.status < 400) {
            return Ok(response)
          }

          let body: any
          try {
            body = await response.json()
          } catch {
            // If not JSON, create standard error format
            body = {
              success: false,
              error: response.statusText || 'Unknown error',
              status: response.status,
              timestamp: new Date().toISOString()
            }
          }

          // Ensure standard error format
          const standardError = {
            success: false,
            error: body.error || body.message || response.statusText || 'Unknown error',
            status: response.status,
            timestamp: body.timestamp || new Date().toISOString(),
            requestId: body.requestId,
            details: body.details,
            code: body.code
          }

          return Ok(NextResponse.json(standardError, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          }))
          
        } catch (error) {
          return Err(new Error(`Error standardization failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
    }
  }

  /**
   * Add response wrapper
   */
  static addWrapper(wrapperFormat: 'envelope' | 'minimal' = 'envelope'): ResponseTransformer {
    return {
      name: 'add-wrapper-transformer',
      transform: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        try {
          if (response.status >= 400) {
            return Ok(response) // Don't wrap error responses
          }

          const contentType = response.headers.get('content-type')
          if (!contentType?.includes('application/json')) {
            return Ok(response) // Only wrap JSON responses
          }

          const body = await response.json()
          
          let wrappedBody: any
          if (wrapperFormat === 'envelope') {
            wrappedBody = {
              success: true,
              data: body,
              metadata: {
                timestamp: new Date().toISOString(),
                version: 'v1',
                count: Array.isArray(body) ? body.length : undefined
              }
            }
          } else {
            wrappedBody = {
              data: body,
              success: true
            }
          }

          return Ok(NextResponse.json(wrappedBody, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          }))
          
        } catch (error) {
          return Err(new Error(`Response wrapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
    }
  }
}

/**
 * Built-in Response Enrichers
 */
export class BuiltInResponseEnrichers {
  /**
   * Add standard security headers
   */
  static addSecurityHeaders(): ResponseEnricher {
    return {
      name: 'add-security-headers-enricher',
      enrich: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        const headers = new Headers(response.headers)
        
        // Add security headers
        headers.set('X-Content-Type-Options', 'nosniff')
        headers.set('X-Frame-Options', 'DENY')
        headers.set('X-XSS-Protection', '1; mode=block')
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
        headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        
        // Add HSTS header for HTTPS
        if (process.env.NODE_ENV === 'production') {
          headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        }

        const body = await response.arrayBuffer()
        
        return Ok(new NextResponse(body, {
          status: response.status,
          statusText: response.statusText,
          headers
        }))
      }
    }
  }

  /**
   * Add CORS headers
   */
  static addCorsHeaders(corsPolicy: {
    origins: string[]
    methods: string[]
    headers: string[]
    credentials: boolean
  }): ResponseEnricher {
    return {
      name: 'add-cors-headers-enricher',
      enrich: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        const headers = new Headers(response.headers)
        
        // Add CORS headers
        const origin = corsPolicy.origins.includes('*') ? '*' : corsPolicy.origins.join(', ')
        headers.set('Access-Control-Allow-Origin', origin)
        headers.set('Access-Control-Allow-Methods', corsPolicy.methods.join(', '))
        headers.set('Access-Control-Allow-Headers', corsPolicy.headers.join(', '))
        
        if (corsPolicy.credentials) {
          headers.set('Access-Control-Allow-Credentials', 'true')
        }

        const body = await response.arrayBuffer()
        
        return Ok(new NextResponse(body, {
          status: response.status,
          statusText: response.statusText,
          headers
        }))
      }
    }
  }

  /**
   * Add performance headers
   */
  static addPerformanceHeaders(): ResponseEnricher {
    return {
      name: 'add-performance-headers-enricher',
      enrich: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        const headers = new Headers(response.headers)
        
        // Add performance-related headers
        headers.set('X-Response-Time', response.headers.get('X-Response-Time') || '0')
        headers.set('X-RateLimit-Remaining', response.headers.get('X-RateLimit-Remaining') || '100')
        headers.set('X-Cache-Status', response.headers.get('X-Cache') || 'MISS')
        
        // Add ETag for caching (simplified)
        if (!headers.has('ETag') && response.status === 200) {
          const body = await response.arrayBuffer()
          const etag = `"${Buffer.from(body).toString('base64').slice(0, 16)}"`
          headers.set('ETag', etag)
          
          return Ok(new NextResponse(body, {
            status: response.status,
            statusText: response.statusText,
            headers
          }))
        }

        const body = await response.arrayBuffer()
        
        return Ok(new NextResponse(body, {
          status: response.status,
          statusText: response.statusText,
          headers
        }))
      }
    }
  }

  /**
   * Add API versioning headers
   */
  static addVersionHeaders(version: string): ResponseEnricher {
    return {
      name: 'add-version-headers-enricher',
      enrich: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        const headers = new Headers(response.headers)
        
        headers.set('API-Version', version)
        headers.set('X-API-Version', version)
        
        // Add deprecation warnings if needed
        const deprecatedVersions = ['v1', 'v1.1']
        if (deprecatedVersions.includes(version)) {
          headers.set('Deprecation', 'true')
          headers.set('Sunset', new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString()) // 6 months
          headers.set('Link', '<https://api.boardguru.ai/v2>; rel="successor-version"')
        }

        const body = await response.arrayBuffer()
        
        return Ok(new NextResponse(body, {
          status: response.status,
          statusText: response.statusText,
          headers
        }))
      }
    }
  }

  /**
   * Add request tracking headers
   */
  static addTrackingHeaders(): ResponseEnricher {
    return {
      name: 'add-tracking-headers-enricher',
      enrich: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        const headers = new Headers(response.headers)
        
        // Add tracking headers (these would typically be set by the gateway)
        if (!headers.has('X-Request-ID')) {
          headers.set('X-Request-ID', `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
        }
        
        headers.set('X-Gateway-Version', 'enhanced-v1')
        headers.set('X-Processed-By', 'AppBoardGuru-Gateway')
        headers.set('X-Processing-Time', Date.now().toString())

        const body = await response.arrayBuffer()
        
        return Ok(new NextResponse(body, {
          status: response.status,
          statusText: response.statusText,
          headers
        }))
      }
    }
  }
}

/**
 * Built-in Response Validators
 */
export class BuiltInResponseValidators {
  /**
   * Sanitize sensitive data from responses
   */
  static sanitizeSensitiveData(sensitiveFields: string[] = ['password', 'token', 'secret', 'key']): ResponseValidator {
    return {
      name: 'sanitize-sensitive-data-validator',
      validate: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        try {
          const contentType = response.headers.get('content-type')
          
          if (!contentType?.includes('application/json')) {
            return Ok(response)
          }

          const body = await response.json()
          const sanitizedBody = this.sanitizeObject(body, sensitiveFields)
          
          return Ok(NextResponse.json(sanitizedBody, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          }))
          
        } catch (error) {
          return Err(new Error(`Sensitive data sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
    }
  }

  private static sanitizeObject(obj: any, sensitiveFields: string[]): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, sensitiveFields))
    }

    const sanitized = { ...obj }
    
    for (const key in sanitized) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeObject(sanitized[key], sensitiveFields)
      }
    }

    return sanitized
  }

  /**
   * Validate response structure
   */
  static validateStructure(requiredFields: string[] = []): ResponseValidator {
    return {
      name: 'validate-structure-validator',
      validate: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        try {
          if (response.status >= 400 || !requiredFields.length) {
            return Ok(response) // Skip validation for errors or when no fields required
          }

          const contentType = response.headers.get('content-type')
          
          if (!contentType?.includes('application/json')) {
            return Ok(response)
          }

          const body = await response.json()
          const missingFields: string[] = []
          
          for (const field of requiredFields) {
            if (!(field in body)) {
              missingFields.push(field)
            }
          }
          
          if (missingFields.length > 0) {
            console.warn(`Response missing required fields: ${missingFields.join(', ')}`)
            // Add missing fields with null values
            const correctedBody = { ...body }
            for (const field of missingFields) {
              correctedBody[field] = null
            }
            
            return Ok(NextResponse.json(correctedBody, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            }))
          }
          
          return Ok(NextResponse.json(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          }))
          
        } catch (error) {
          return Err(new Error(`Structure validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
    }
  }

  /**
   * Validate response size
   */
  static validateSize(maxSizeBytes: number): ResponseValidator {
    return {
      name: 'validate-size-validator',
      validate: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<NextResponse, Error>> => {
        try {
          const body = await response.arrayBuffer()
          
          if (body.byteLength > maxSizeBytes) {
            console.warn(`Response size ${body.byteLength} exceeds limit ${maxSizeBytes}`)
            
            // Truncate response or return error
            const errorBody = {
              success: false,
              error: 'Response too large',
              message: `Response size ${body.byteLength} bytes exceeds limit of ${maxSizeBytes} bytes`,
              timestamp: new Date().toISOString()
            }
            
            return Ok(NextResponse.json(errorBody, {
              status: 413,
              statusText: 'Payload Too Large',
              headers: response.headers
            }))
          }
          
          return Ok(new NextResponse(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          }))
          
        } catch (error) {
          return Err(new Error(`Size validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
    }
  }
}

/**
 * Built-in Response Filters
 */
export class BuiltInResponseFilters {
  /**
   * Filter responses based on content type
   */
  static contentTypeFilter(allowedTypes: string[]): ResponseFilter {
    return {
      name: 'content-type-filter',
      filter: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<boolean, Error>> => {
        const contentType = response.headers.get('content-type')
        
        if (!contentType) {
          return Ok(true) // Allow responses without content type
        }
        
        const isAllowed = allowedTypes.some(type => contentType.includes(type))
        return Ok(isAllowed)
      }
    }
  }

  /**
   * Filter responses based on status code
   */
  static statusCodeFilter(allowedCodes: number[]): ResponseFilter {
    return {
      name: 'status-code-filter',
      filter: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<boolean, Error>> => {
        const isAllowed = allowedCodes.includes(response.status)
        return Ok(isAllowed)
      }
    }
  }

  /**
   * Filter responses based on size
   */
  static sizeFilter(maxSize: number): ResponseFilter {
    return {
      name: 'size-filter',
      filter: async (response: NextResponse, route?: EnhancedRouteConfig): Promise<Result<boolean, Error>> => {
        try {
          const body = await response.arrayBuffer()
          return Ok(body.byteLength <= maxSize)
        } catch (error) {
          return Err(new Error(`Size filtering failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }
    }
  }
}