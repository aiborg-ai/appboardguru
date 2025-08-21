/**
 * Unified API Handler Factory
 * Creates consistent API handlers with built-in features:
 * - Authentication
 * - Rate limiting
 * - Validation
 * - Caching
 * - Monitoring
 * - Error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { monitor } from '@/lib/monitoring'
import { featureFlags } from '@/lib/features/flags'

// Rate limiting configuration
export interface RateLimitConfig {
  requests: number
  window: string // e.g., '1m', '1h', '1d'
  skipSuccessfulGET?: boolean
}

// Caching configuration  
export interface CacheConfig {
  ttl: number // seconds
  varyBy?: string[] // headers to vary cache by
  tags?: string[] // cache tags for invalidation
}

// API handler configuration
export interface APIHandlerConfig<T = any> {
  authenticate?: boolean
  authorize?: (user: any, req: ValidatedRequest<T>) => Promise<boolean>
  rateLimit?: RateLimitConfig
  validation?: {
    body?: ZodSchema<T>
    query?: ZodSchema<any>
    params?: ZodSchema<any>
  }
  cache?: CacheConfig
  audit?: boolean | string
  timeout?: number
  featureFlag?: string
}

// Enhanced request type with validated data
export interface ValidatedRequest<T = any> extends NextRequest {
  user?: {
    id: string
    email?: string
    role?: string
    organizationId?: string
  }
  validatedBody?: T
  validatedQuery?: any
  validatedParams?: any
  startTime: number
  requestId: string
}

// Standardized API response
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    timing?: {
      duration: number
      cached: boolean
    }
  }
  requestId?: string
}

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

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

/**
 * Main API handler factory
 */
export function createAPIHandler<TInput = any, TOutput = any>(
  config: APIHandlerConfig<TInput>,
  handler: (req: ValidatedRequest<TInput>) => Promise<TOutput | APIResponse<TOutput>>
) {
  return async (request: NextRequest, params?: any): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const startTime = Date.now()
    
    // Add request metadata
    const req = request as ValidatedRequest<TInput>
    req.startTime = startTime
    req.requestId = requestId
    req.validatedParams = params

    try {
      // Feature flag check
      if (config.featureFlag) {
        const isEnabled = await featureFlags.isEnabled(config.featureFlag as any)
        if (!isEnabled) {
          throw new APIError(404, 'FEATURE_DISABLED', 'Feature not available')
        }
      }

      // Rate limiting
      if (config.rateLimit && !(await featureFlags.isEnabled('USE_API_RATE_LIMITING'))) {
        await checkRateLimit(request, config.rateLimit)
      }

      // Authentication
      if (config.authenticate) {
        req.user = await authenticateRequest(request)
      }

      // Authorization
      if (config.authorize && req.user) {
        const authorized = await config.authorize(req.user, req)
        if (!authorized) {
          throw new APIError(403, 'FORBIDDEN', 'Insufficient permissions')
        }
      }

      // Request validation
      await validateRequest(req, config.validation)

      // Cache check (for GET requests)
      if (config.cache && request.method === 'GET') {
        const cacheKey = generateCacheKey(request, config.cache)
        const cached = await getFromCache(cacheKey)
        if (cached) {
          return createSuccessResponse(cached, {
            meta: { timing: { duration: Date.now() - startTime, cached: true } },
            requestId
          })
        }
      }

      // Execute handler with timeout
      const timeoutMs = config.timeout || 30000
      const result = await Promise.race([
        handler(req),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new APIError(408, 'TIMEOUT', 'Request timeout')), timeoutMs)
        )
      ])

      // Determine if result is already a formatted response
      const isFormattedResponse = result && typeof result === 'object' && 'success' in result
      const responseData = isFormattedResponse ? result as APIResponse<TOutput> : result as TOutput

      // Cache result (for GET requests)
      if (config.cache && request.method === 'GET' && !isFormattedResponse) {
        const cacheKey = generateCacheKey(request, config.cache)
        await setInCache(cacheKey, responseData, config.cache.ttl)
      }

      // Create response
      const response = isFormattedResponse 
        ? responseData as APIResponse<TOutput>
        : {
            success: true,
            data: responseData,
            meta: {
              timing: { duration: Date.now() - startTime, cached: false }
            },
            requestId
          }

      // Audit logging
      if (config.audit) {
        await logAuditEvent(req, config.audit, 'success', Date.now() - startTime)
      }

      // Performance monitoring
      const routeName = typeof config.audit === 'string' ? config.audit : getRouteName(request)
      monitor.trackAPICall(routeName, Date.now() - startTime, {
        method: request.method,
        statusCode: 200,
        userId: req.user?.id
      })

      return createSuccessResponse(response.data, {
        meta: response.meta,
        requestId: response.requestId
      })

    } catch (error) {
      return handleAPIError(error, req, config, startTime)
    }
  }
}

/**
 * Authenticate request and return user info
 */
async function authenticateRequest(request: NextRequest) {
  try {
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
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new APIError(401, 'UNAUTHORIZED', 'Authentication required')
    }

    return {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role,
      organizationId: user.user_metadata?.organizationId
    }
  } catch (error) {
    throw new APIError(401, 'UNAUTHORIZED', 'Invalid authentication')
  }
}

/**
 * Check rate limits
 */
async function checkRateLimit(request: NextRequest, config: RateLimitConfig) {
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  const key = `rate_limit:${clientIP}:${getRouteName(request)}`
  const windowMs = parseTimeWindow(config.window)
  const now = Date.now()
  
  const current = rateLimitStore.get(key)
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return
  }
  
  if (current.count >= config.requests) {
    const resetInSeconds = Math.ceil((current.resetTime - now) / 1000)
    throw new APIError(429, 'RATE_LIMIT_EXCEEDED', `Rate limit exceeded. Try again in ${resetInSeconds} seconds`)
  }
  
  current.count++
}

/**
 * Validate request data
 */
async function validateRequest<T>(
  req: ValidatedRequest<T>, 
  validation?: APIHandlerConfig<T>['validation']
) {
  if (!validation) return

  try {
    // Validate body
    if (validation.body && req.method !== 'GET') {
      const body = await req.json()
      req.validatedBody = validation.body.parse(body)
    }

    // Validate query parameters
    if (validation.query) {
      const url = new URL(req.url)
      const queryParams = Object.fromEntries(url.searchParams.entries())
      req.validatedQuery = validation.query.parse(queryParams)
    }

    // Validate URL parameters
    if (validation.params && req.validatedParams) {
      req.validatedParams = validation.params.parse(req.validatedParams)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new APIError(400, 'VALIDATION_ERROR', 'Invalid request data', error.errors)
    }
    throw error
  }
}

/**
 * Cache utilities
 */
async function getFromCache(key: string): Promise<any | null> {
  // In production, use Redis or similar
  // For now, implement in-memory cache with TTL
  return null // TODO: Implement caching
}

async function setInCache(key: string, data: any, ttl: number): Promise<void> {
  // In production, use Redis or similar
  // TODO: Implement caching
}

/**
 * Generate cache key from request
 */
function generateCacheKey(request: NextRequest, config: CacheConfig): string {
  const url = new URL(request.url)
  const baseKey = `${request.method}:${url.pathname}:${url.search}`
  
  if (config.varyBy) {
    const varyValues = config.varyBy
      .map(header => request.headers.get(header) || '')
      .join(':')
    return `${baseKey}:${varyValues}`
  }
  
  return baseKey
}

/**
 * Audit event logging
 */
async function logAuditEvent(
  req: ValidatedRequest,
  auditConfig: boolean | string,
  outcome: string,
  duration: number
) {
  try {
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
          },
        },
      }
    )

    await supabase.from('audit_logs').insert({
      user_id: req.user?.id,
      organization_id: req.user?.organizationId,
      event_type: 'data_access',
      event_category: 'api',
      action: req.method?.toLowerCase(),
      resource_type: typeof auditConfig === 'string' ? auditConfig : 'api_endpoint',
      resource_id: req.requestId,
      event_description: `${req.method} ${getRouteName(req)}`,
      outcome: outcome as any,
      severity: 'low',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
      response_time_ms: duration,
      http_method: req.method,
      endpoint: getRouteName(req)
    })
  } catch (error) {
    console.error('Failed to log audit event:', error)
  }
}

/**
 * Error handling
 */
function handleAPIError(
  error: any, 
  req: ValidatedRequest, 
  config: APIHandlerConfig,
  startTime: number
): NextResponse {
  const duration = Date.now() - startTime
  let statusCode = 500
  let errorCode = 'INTERNAL_ERROR'
  let message = 'An unexpected error occurred'
  let details: any = undefined

  if (error instanceof APIError) {
    statusCode = error.statusCode
    errorCode = error.code
    message = error.message
    details = error.details
  } else if (error.code === 'PGRST116') {
    statusCode = 404
    errorCode = 'NOT_FOUND'
    message = 'Resource not found'
  } else if (error.code === '23505') {
    statusCode = 409
    errorCode = 'CONFLICT'
    message = 'Resource already exists'
  }

  // Log error for monitoring
  monitor.trackError(getRouteName(req), error)

  // Audit log for failed requests
  if (config.audit) {
    logAuditEvent(req, config.audit, 'error', duration).catch(console.error)
  }

  const response: APIResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details })
    },
    meta: {
      timing: { duration, cached: false }
    },
    requestId: req.requestId
  }

  return NextResponse.json(response, { status: statusCode })
}

/**
 * Create success response
 */
function createSuccessResponse<T>(
  data: T, 
  options?: { meta?: any; requestId?: string }
): NextResponse {
  const response: APIResponse<T> = {
    success: true,
    data,
    ...options
  }
  
  return NextResponse.json(response)
}

/**
 * Utility functions
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getRouteName(req: NextRequest | ValidatedRequest): string {
  const url = new URL(req.url)
  return url.pathname
}

function parseTimeWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/)
  if (!match) throw new Error(`Invalid time window format: ${window}`)
  
  const [, amount, unit] = match
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
  
  return parseInt(amount) * multipliers[unit as keyof typeof multipliers]
}

/**
 * Pre-configured handler creators for common patterns
 */
export const createCRUDHandler = {
  list: <T>(handler: (req: ValidatedRequest) => Promise<T[]>) =>
    createAPIHandler(
      { 
        authenticate: true, 
        cache: { ttl: 300 },
        rateLimit: { requests: 100, window: '1m' }
      }, 
      handler
    ),
    
  get: <T>(handler: (req: ValidatedRequest) => Promise<T>) =>
    createAPIHandler(
      { 
        authenticate: true,
        cache: { ttl: 600 },
        rateLimit: { requests: 200, window: '1m' }
      }, 
      handler
    ),
    
  create: <TInput, TOutput>(
    validation: ZodSchema<TInput>,
    handler: (req: ValidatedRequest<TInput>) => Promise<TOutput>
  ) =>
    createAPIHandler(
      { 
        authenticate: true,
        validation: { body: validation },
        audit: true,
        rateLimit: { requests: 50, window: '1m' }
      }, 
      handler
    ),
    
  update: <TInput, TOutput>(
    validation: ZodSchema<TInput>,
    handler: (req: ValidatedRequest<TInput>) => Promise<TOutput>
  ) =>
    createAPIHandler(
      { 
        authenticate: true,
        validation: { body: validation },
        audit: true,
        rateLimit: { requests: 100, window: '1m' }
      }, 
      handler
    ),
    
  delete: <T>(handler: (req: ValidatedRequest) => Promise<T>) =>
    createAPIHandler(
      { 
        authenticate: true,
        audit: true,
        rateLimit: { requests: 50, window: '1m' }
      }, 
      handler
    )
}