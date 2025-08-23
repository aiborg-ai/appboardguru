/**
 * Request Pipeline - Advanced Request Processing Pipeline
 * Handles validation, transformation, enrichment, and filtering of incoming requests
 */

import { NextRequest } from 'next/server'
import { Result, Ok, Err } from '../../result'

export interface PipelineStep<T, R = T> {
  name: string
  execute: (input: T) => Promise<Result<R, Error>>
  enabled: boolean
  order: number
}

export interface RequestValidator {
  name: string
  validate: (request: NextRequest) => Promise<Result<NextRequest, Error>>
}

export interface RequestTransformer {
  name: string
  transform: (request: NextRequest) => Promise<Result<NextRequest, Error>>
}

export interface RequestEnricher {
  name: string
  enrich: (request: NextRequest) => Promise<Result<NextRequest, Error>>
}

export interface RequestFilter {
  name: string
  filter: (request: NextRequest) => Promise<Result<boolean, Error>>
}

export class RequestPipeline {
  private validators: Map<string, RequestValidator> = new Map()
  private transformers: Map<string, RequestTransformer> = new Map()
  private enrichers: Map<string, RequestEnricher> = new Map()
  private filters: Map<string, RequestFilter> = new Map()
  private processingOrder: string[] = []

  /**
   * Add a validator to the pipeline
   */
  addValidator(name: string, validate: (request: NextRequest) => Promise<Result<NextRequest, Error>>): this {
    this.validators.set(name, { name, validate })
    this.updateProcessingOrder()
    return this
  }

  /**
   * Add a transformer to the pipeline
   */
  addTransformer(name: string, transform: (request: NextRequest) => Promise<Result<NextRequest, Error>>): this {
    this.transformers.set(name, { name, transform })
    this.updateProcessingOrder()
    return this
  }

  /**
   * Add an enricher to the pipeline
   */
  addEnricher(name: string, enrich: (request: NextRequest) => Promise<Result<NextRequest, Error>>): this {
    this.enrichers.set(name, { name, enrich })
    this.updateProcessingOrder()
    return this
  }

  /**
   * Add a filter to the pipeline
   */
  addFilter(name: string, filter: (request: NextRequest) => Promise<Result<boolean, Error>>): this {
    this.filters.set(name, { name, filter })
    this.updateProcessingOrder()
    return this
  }

  /**
   * Process request through the entire pipeline
   */
  async process(request: NextRequest): Promise<Result<NextRequest, Error>> {
    let currentRequest = request

    try {
      // Step 1: Apply filters (early rejection)
      for (const [name, filter] of this.filters.entries()) {
        const filterResult = await filter.filter(currentRequest)
        if (!filterResult.value) {
          return Err(new Error(`Request filtered out by ${name}`))
        }
        if (!filterResult.success) {
          return Err(filterResult.error!)
        }
      }

      // Step 2: Apply validators
      for (const [name, validator] of this.validators.entries()) {
        const validationResult = await validator.validate(currentRequest)
        if (!validationResult.success) {
          return Err(new Error(`Validation failed at ${name}: ${validationResult.error?.message}`))
        }
        currentRequest = validationResult.value!
      }

      // Step 3: Apply transformers
      for (const [name, transformer] of this.transformers.entries()) {
        const transformResult = await transformer.transform(currentRequest)
        if (!transformResult.success) {
          return Err(new Error(`Transformation failed at ${name}: ${transformResult.error?.message}`))
        }
        currentRequest = transformResult.value!
      }

      // Step 4: Apply enrichers
      for (const [name, enricher] of this.enrichers.entries()) {
        const enrichResult = await enricher.enrich(currentRequest)
        if (!enrichResult.success) {
          return Err(new Error(`Enrichment failed at ${name}: ${enrichResult.error?.message}`))
        }
        currentRequest = enrichResult.value!
      }

      return Ok(currentRequest)

    } catch (error) {
      return Err(new Error(`Pipeline processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  }

  /**
   * Remove a pipeline component
   */
  remove(type: 'validator' | 'transformer' | 'enricher' | 'filter', name: string): this {
    switch (type) {
      case 'validator':
        this.validators.delete(name)
        break
      case 'transformer':
        this.transformers.delete(name)
        break
      case 'enricher':
        this.enrichers.delete(name)
        break
      case 'filter':
        this.filters.delete(name)
        break
    }
    this.updateProcessingOrder()
    return this
  }

  /**
   * Clear all pipeline components of a specific type
   */
  clear(type: 'validator' | 'transformer' | 'enricher' | 'filter' | 'all'): this {
    switch (type) {
      case 'validator':
        this.validators.clear()
        break
      case 'transformer':
        this.transformers.clear()
        break
      case 'enricher':
        this.enrichers.clear()
        break
      case 'filter':
        this.filters.clear()
        break
      case 'all':
        this.validators.clear()
        this.transformers.clear()
        this.enrichers.clear()
        this.filters.clear()
        break
    }
    this.updateProcessingOrder()
    return this
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    validators: number
    transformers: number
    enrichers: number
    filters: number
    totalSteps: number
  } {
    return {
      validators: this.validators.size,
      transformers: this.transformers.size,
      enrichers: this.enrichers.size,
      filters: this.filters.size,
      totalSteps: this.validators.size + this.transformers.size + this.enrichers.size + this.filters.size
    }
  }

  private updateProcessingOrder(): void {
    // Update processing order based on component types and names
    this.processingOrder = [
      ...Array.from(this.filters.keys()).map(name => `filter:${name}`),
      ...Array.from(this.validators.keys()).map(name => `validator:${name}`),
      ...Array.from(this.transformers.keys()).map(name => `transformer:${name}`),
      ...Array.from(this.enrichers.keys()).map(name => `enricher:${name}`)
    ]
  }
}

/**
 * Built-in Request Validators
 */
export class BuiltInValidators {
  /**
   * Validate Content-Type header
   */
  static contentType(allowedTypes: string[]): RequestValidator {
    return {
      name: 'content-type-validator',
      validate: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const contentType = request.headers.get('content-type')
        
        if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
          if (!contentType) {
            return Err(new Error('Content-Type header is required'))
          }
          
          const isAllowed = allowedTypes.some(type => 
            contentType.toLowerCase().includes(type.toLowerCase())
          )
          
          if (!isAllowed) {
            return Err(new Error(`Content-Type ${contentType} is not allowed`))
          }
        }
        
        return Ok(request)
      }
    }
  }

  /**
   * Validate request size
   */
  static requestSize(maxSizeBytes: number): RequestValidator {
    return {
      name: 'request-size-validator',
      validate: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const contentLength = request.headers.get('content-length')
        
        if (contentLength) {
          const size = parseInt(contentLength, 10)
          if (size > maxSizeBytes) {
            return Err(new Error(`Request size ${size} exceeds maximum ${maxSizeBytes} bytes`))
          }
        }
        
        return Ok(request)
      }
    }
  }

  /**
   * Validate required headers
   */
  static requiredHeaders(headers: string[]): RequestValidator {
    return {
      name: 'required-headers-validator',
      validate: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const missingHeaders: string[] = []
        
        for (const header of headers) {
          if (!request.headers.has(header.toLowerCase())) {
            missingHeaders.push(header)
          }
        }
        
        if (missingHeaders.length > 0) {
          return Err(new Error(`Missing required headers: ${missingHeaders.join(', ')}`))
        }
        
        return Ok(request)
      }
    }
  }

  /**
   * Validate JSON body structure
   */
  static jsonBody(): RequestValidator {
    return {
      name: 'json-body-validator',
      validate: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const contentType = request.headers.get('content-type')
        
        if (contentType?.includes('application/json')) {
          try {
            // Clone the request to avoid consuming the body
            const clonedRequest = request.clone()
            await clonedRequest.json()
          } catch (error) {
            return Err(new Error('Invalid JSON body'))
          }
        }
        
        return Ok(request)
      }
    }
  }

  /**
   * Validate API version
   */
  static apiVersion(supportedVersions: string[]): RequestValidator {
    return {
      name: 'api-version-validator',
      validate: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const url = new URL(request.url)
        const pathVersion = url.pathname.match(/\/api\/v(\d+)\//)?.[1]
        const headerVersion = request.headers.get('api-version')
        const queryVersion = url.searchParams.get('version')
        
        const version = pathVersion ? `v${pathVersion}` : (headerVersion || queryVersion)
        
        if (version && !supportedVersions.includes(version)) {
          return Err(new Error(`API version ${version} is not supported`))
        }
        
        return Ok(request)
      }
    }
  }
}

/**
 * Built-in Request Transformers
 */
export class BuiltInTransformers {
  /**
   * Normalize headers (lowercase, trim)
   */
  static normalizeHeaders(): RequestTransformer {
    return {
      name: 'normalize-headers-transformer',
      transform: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const normalizedHeaders = new Headers()
        
        request.headers.forEach((value, key) => {
          normalizedHeaders.set(key.toLowerCase().trim(), value.trim())
        })
        
        return Ok(new NextRequest(request.url, {
          method: request.method,
          headers: normalizedHeaders,
          body: request.body
        }))
      }
    }
  }

  /**
   * Add default headers
   */
  static addDefaultHeaders(defaultHeaders: Record<string, string>): RequestTransformer {
    return {
      name: 'add-default-headers-transformer',
      transform: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const headers = new Headers(request.headers)
        
        for (const [key, value] of Object.entries(defaultHeaders)) {
          if (!headers.has(key)) {
            headers.set(key, value)
          }
        }
        
        return Ok(new NextRequest(request.url, {
          method: request.method,
          headers,
          body: request.body
        }))
      }
    }
  }

  /**
   * URL normalization
   */
  static normalizeUrl(): RequestTransformer {
    return {
      name: 'normalize-url-transformer',
      transform: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const url = new URL(request.url)
        
        // Remove duplicate slashes
        url.pathname = url.pathname.replace(/\/+/g, '/')
        
        // Remove trailing slash (except for root)
        if (url.pathname !== '/' && url.pathname.endsWith('/')) {
          url.pathname = url.pathname.slice(0, -1)
        }
        
        return Ok(new NextRequest(url.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body
        }))
      }
    }
  }

  /**
   * Query parameter transformation
   */
  static transformQueryParams(transformers: Record<string, (value: string) => string>): RequestTransformer {
    return {
      name: 'transform-query-params-transformer',
      transform: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const url = new URL(request.url)
        
        for (const [param, transformer] of Object.entries(transformers)) {
          const value = url.searchParams.get(param)
          if (value) {
            url.searchParams.set(param, transformer(value))
          }
        }
        
        return Ok(new NextRequest(url.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body
        }))
      }
    }
  }
}

/**
 * Built-in Request Enrichers
 */
export class BuiltInEnrichers {
  /**
   * Add timestamp header
   */
  static addTimestamp(): RequestEnricher {
    return {
      name: 'add-timestamp-enricher',
      enrich: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const headers = new Headers(request.headers)
        headers.set('X-Request-Timestamp', new Date().toISOString())
        
        return Ok(new NextRequest(request.url, {
          method: request.method,
          headers,
          body: request.body
        }))
      }
    }
  }

  /**
   * Add request ID
   */
  static addRequestId(idGenerator?: () => string): RequestEnricher {
    const generateId = idGenerator || (() => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
    
    return {
      name: 'add-request-id-enricher',
      enrich: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const headers = new Headers(request.headers)
        
        if (!headers.has('x-request-id')) {
          headers.set('X-Request-ID', generateId())
        }
        
        return Ok(new NextRequest(request.url, {
          method: request.method,
          headers,
          body: request.body
        }))
      }
    }
  }

  /**
   * Add client information
   */
  static addClientInfo(): RequestEnricher {
    return {
      name: 'add-client-info-enricher',
      enrich: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const headers = new Headers(request.headers)
        
        // Extract client IP
        const clientIp = headers.get('x-forwarded-for')?.split(',')[0] ||
                        headers.get('x-real-ip') ||
                        headers.get('x-client-ip') ||
                        'unknown'
        
        headers.set('X-Client-IP', clientIp)
        
        // Extract user agent
        const userAgent = headers.get('user-agent') || 'unknown'
        headers.set('X-User-Agent', userAgent)
        
        return Ok(new NextRequest(request.url, {
          method: request.method,
          headers,
          body: request.body
        }))
      }
    }
  }

  /**
   * Add geolocation information (placeholder - would integrate with IP geolocation service)
   */
  static addGeolocation(): RequestEnricher {
    return {
      name: 'add-geolocation-enricher',
      enrich: async (request: NextRequest): Promise<Result<NextRequest, Error>> => {
        const headers = new Headers(request.headers)
        const clientIp = headers.get('X-Client-IP') || headers.get('x-forwarded-for')?.split(',')[0]
        
        if (clientIp && clientIp !== 'unknown') {
          // In a real implementation, you'd call a geolocation service here
          // For now, we'll add placeholder headers
          headers.set('X-Client-Country', 'US') // Placeholder
          headers.set('X-Client-Region', 'CA') // Placeholder
          headers.set('X-Client-City', 'San Francisco') // Placeholder
        }
        
        return Ok(new NextRequest(request.url, {
          method: request.method,
          headers,
          body: request.body
        }))
      }
    }
  }
}

/**
 * Built-in Request Filters
 */
export class BuiltInFilters {
  /**
   * IP whitelist filter
   */
  static ipWhitelist(allowedIPs: string[]): RequestFilter {
    return {
      name: 'ip-whitelist-filter',
      filter: async (request: NextRequest): Promise<Result<boolean, Error>> => {
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                        request.headers.get('x-real-ip') ||
                        request.headers.get('x-client-ip')
        
        if (!clientIp || clientIp === 'unknown') {
          return Ok(true) // Allow if we can't determine IP
        }
        
        const isAllowed = allowedIPs.includes(clientIp) || allowedIPs.includes('*')
        return Ok(isAllowed)
      }
    }
  }

  /**
   * IP blacklist filter
   */
  static ipBlacklist(blockedIPs: string[]): RequestFilter {
    return {
      name: 'ip-blacklist-filter',
      filter: async (request: NextRequest): Promise<Result<boolean, Error>> => {
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                        request.headers.get('x-real-ip') ||
                        request.headers.get('x-client-ip')
        
        if (!clientIp || clientIp === 'unknown') {
          return Ok(true) // Allow if we can't determine IP
        }
        
        const isBlocked = blockedIPs.includes(clientIp)
        return Ok(!isBlocked)
      }
    }
  }

  /**
   * User agent filter
   */
  static userAgentFilter(blockedPatterns: string[]): RequestFilter {
    return {
      name: 'user-agent-filter',
      filter: async (request: NextRequest): Promise<Result<boolean, Error>> => {
        const userAgent = request.headers.get('user-agent') || ''
        
        const isBlocked = blockedPatterns.some(pattern => {
          const regex = new RegExp(pattern, 'i')
          return regex.test(userAgent)
        })
        
        return Ok(!isBlocked)
      }
    }
  }

  /**
   * Method filter
   */
  static methodFilter(allowedMethods: string[]): RequestFilter {
    return {
      name: 'method-filter',
      filter: async (request: NextRequest): Promise<Result<boolean, Error>> => {
        const isAllowed = allowedMethods.map(m => m.toUpperCase()).includes(request.method.toUpperCase())
        return Ok(isAllowed)
      }
    }
  }
}