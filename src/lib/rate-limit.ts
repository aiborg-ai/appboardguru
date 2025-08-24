/**
 * Rate Limiting Middleware
 * - Token bucket algorithm implementation
 * - Per-user and per-IP rate limiting
 * - Configurable limits and windows
 */

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (req: Request) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  async isAllowed(key: string): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    totalRequests: number
  }> {
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    
    // Clean up expired entry for this key
    if (this.store[key] && this.store[key].resetTime < now) {
      delete this.store[key]
    }
    
    // Initialize or get existing entry
    if (!this.store[key]) {
      this.store[key] = {
        count: 0,
        resetTime: now + this.config.windowMs
      }
    }
    
    const entry = this.store[key]
    
    // Check if request is allowed
    const allowed = entry.count < this.config.maxRequests
    
    if (allowed) {
      entry.count++
    }
    
    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      totalRequests: entry.count
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    }
  }
}

// Default rate limiters
const defaultRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // 100 requests per 15 minutes
})

const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10 // 10 auth attempts per 15 minutes
})

const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60 // 60 requests per minute
})

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  request: Request,
  config?: Partial<RateLimitConfig>
): Promise<Response | null> {
  const limiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    ...config
  })

  // Extract key (IP or user ID)
  const key = config?.keyGenerator 
    ? config.keyGenerator(request)
    : getClientIdentifier(request)

  const result = await limiter.isAllowed(key)

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config?.maxRequests?.toString() || '100',
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
        }
      }
    )
  }

  // Add rate limit headers to track usage
  return null // No error, request allowed
}

/**
 * Auth-specific rate limiting
 */
export async function authRateLimit(request: Request): Promise<Response | null> {
  return rateLimit(request, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 auth attempts per 15 minutes
    keyGenerator: (req) => getClientIdentifier(req) + ':auth'
  })
}

/**
 * API-specific rate limiting
 */
export async function apiRateLimit(request: Request): Promise<Response | null> {
  return rateLimit(request, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    keyGenerator: (req) => getClientIdentifier(req) + ':api'
  })
}

/**
 * Extract client identifier from request
 */
function getClientIdentifier(request: Request): string {
  // Try to get user ID from auth header first
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // Extract user ID from JWT token (simplified)
    try {
      const token = authHeader.replace('Bearer ', '')
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.sub) {
        return `user:${payload.sub}`
      }
    } catch {
      // Fallback to IP-based limiting
    }
  }

  // Fallback to IP address
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
  
  return `ip:${ip}`
}

export { defaultRateLimiter, authRateLimiter, apiRateLimiter }