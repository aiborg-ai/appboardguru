/**
 * Advanced Rate Limiting System
 * Implements multiple rate limiting algorithms with IP blocking and cleanup
 */

import { logSecurityEvent } from './audit'

/**
 * Rate limit configuration interface
 */
export interface RateLimitConfig {
  requests: number
  windowMs: number
  algorithm?: 'sliding_window' | 'token_bucket' | 'fixed_window'
  burst?: number // For token bucket algorithm
  blockDurationMs?: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
  blocked?: boolean
}

/**
 * IP block information interface
 */
export interface IPBlockInfo {
  blockedUntil: number
  reason: string
  blockCount: number
  firstBlockTime: number
}

/**
 * Request attempt tracking
 */
interface RequestAttempt {
  timestamp: number
  success: boolean
}

/**
 * Sliding window data
 */
interface SlidingWindowData {
  requests: RequestAttempt[]
  lastCleanup: number
}

/**
 * Token bucket data
 */
interface TokenBucketData {
  tokens: number
  lastRefill: number
  burstUsed: number
}

/**
 * Fixed window data
 */
interface FixedWindowData {
  count: number
  windowStart: number
}

/**
 * Rate limiter storage (in production, use Redis or similar distributed cache)
 */
class RateLimitStorage {
  private slidingWindows = new Map<string, SlidingWindowData>()
  private tokenBuckets = new Map<string, TokenBucketData>()
  private fixedWindows = new Map<string, FixedWindowData>()
  private ipBlocks = new Map<string, IPBlockInfo>()
  private violationCounts = new Map<string, { count: number; firstViolation: number }>()

  // Sliding Window Implementation
  slidingWindow(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now()
    const windowStart = now - config.windowMs
    
    let data = this.slidingWindows.get(key)
    if (!data) {
      data = { requests: [], lastCleanup: now }
      this.slidingWindows.set(key, data)
    }
    
    // Cleanup old requests (optimize by doing this periodically)
    if (now - data.lastCleanup > config.windowMs / 4) {
      data.requests = data.requests.filter(req => req.timestamp > windowStart)
      data.lastCleanup = now
    }
    
    // Count valid requests in window
    const validRequests = data.requests.filter(req => req.timestamp > windowStart)
    
    if (validRequests.length >= config.requests) {
      const oldestRequest = validRequests[0]
      if (!oldestRequest) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + config.windowMs,
          retryAfter: Math.ceil(config.windowMs / 1000)
        }
      }
      const retryAfter = Math.ceil((oldestRequest.timestamp + config.windowMs - now) / 1000)
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: oldestRequest.timestamp + config.windowMs,
        retryAfter
      }
    }
    
    // Add current request
    data.requests.push({ timestamp: now, success: true })
    
    return {
      allowed: true,
      remaining: config.requests - (validRequests.length + 1),
      resetTime: now + config.windowMs
    }
  }

  // Token Bucket Implementation
  tokenBucket(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now()
    const refillRate = config.requests / (config.windowMs / 1000) // tokens per second
    const maxTokens = config.requests
    const burstSize = config.burst || Math.ceil(config.requests * 1.5)
    
    let data = this.tokenBuckets.get(key)
    if (!data) {
      data = { tokens: maxTokens, lastRefill: now, burstUsed: 0 }
      this.tokenBuckets.set(key, data)
    }
    
    // Refill tokens based on time passed
    const timePassed = (now - data.lastRefill) / 1000
    const tokensToAdd = timePassed * refillRate
    
    data.tokens = Math.min(maxTokens, data.tokens + tokensToAdd)
    data.lastRefill = now
    
    // Reset burst if tokens are full
    if (data.tokens >= maxTokens) {
      data.burstUsed = 0
    }
    
    // Check if request can be served
    if (data.tokens >= 1) {
      data.tokens--
      return {
        allowed: true,
        remaining: Math.floor(data.tokens),
        resetTime: now + (maxTokens - data.tokens) / refillRate * 1000
      }
    }
    
    // Check burst capacity
    if (data.burstUsed < burstSize - maxTokens) {
      data.burstUsed++
      return {
        allowed: true,
        remaining: 0,
        resetTime: now + (1 / refillRate) * 1000
      }
    }
    
    const retryAfter = Math.ceil((1 / refillRate))
    return {
      allowed: false,
      remaining: 0,
      resetTime: now + retryAfter * 1000,
      retryAfter
    }
  }

  // Fixed Window Implementation
  fixedWindow(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now()
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs
    
    let data = this.fixedWindows.get(key)
    if (!data || data.windowStart !== windowStart) {
      data = { count: 0, windowStart }
      this.fixedWindows.set(key, data)
    }
    
    if (data.count >= config.requests) {
      const retryAfter = Math.ceil((windowStart + config.windowMs - now) / 1000)
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + config.windowMs,
        retryAfter
      }
    }
    
    data.count++
    
    return {
      allowed: true,
      remaining: config.requests - data.count,
      resetTime: windowStart + config.windowMs
    }
  }

  // IP Blocking
  isIPBlocked(ip: string): { blocked: boolean; info?: IPBlockInfo } {
    const blockInfo = this.ipBlocks.get(ip)
    if (!blockInfo) return { blocked: false }
    
    if (Date.now() >= blockInfo.blockedUntil) {
      this.ipBlocks.delete(ip)
      return { blocked: false }
    }
    
    return { blocked: true, info: blockInfo }
  }

  blockIP(ip: string, durationMs: number, reason: string): void {
    const existing = this.ipBlocks.get(ip)
    const now = Date.now()
    
    if (existing) {
      // Extend block and increase count
      this.ipBlocks.set(ip, {
        blockedUntil: now + durationMs,
        reason,
        blockCount: existing.blockCount + 1,
        firstBlockTime: existing.firstBlockTime
      })
    } else {
      this.ipBlocks.set(ip, {
        blockedUntil: now + durationMs,
        reason,
        blockCount: 1,
        firstBlockTime: now
      })
    }
    
    const blockInfo = this.ipBlocks.get(ip)
    if (blockInfo) {
      logSecurityEvent('ip_blocked', {
        ip,
        reason,
        durationMs,
        blockCount: blockInfo.blockCount
      }, 'high')
    }
  }

  unblockIP(ip: string): boolean {
    const existed = this.ipBlocks.has(ip)
    this.ipBlocks.delete(ip)
    
    if (existed) {
      logSecurityEvent('ip_unblocked', { ip }, 'medium')
    }
    
    return existed
  }

  // Violation tracking
  recordViolation(key: string): number {
    const now = Date.now()
    const existing = this.violationCounts.get(key)
    
    if (!existing) {
      this.violationCounts.set(key, { count: 1, firstViolation: now })
      return 1
    }
    
    // Reset violations if they're old (24 hour window)
    if (now - existing.firstViolation > 24 * 60 * 60 * 1000) {
      this.violationCounts.set(key, { count: 1, firstViolation: now })
      return 1
    }
    
    existing.count++
    return existing.count
  }

  getViolationCount(key: string): number {
    const violations = this.violationCounts.get(key)
    if (!violations) return 0
    
    // Check if violations are expired
    if (Date.now() - violations.firstViolation > 24 * 60 * 60 * 1000) {
      this.violationCounts.delete(key)
      return 0
    }
    
    return violations.count
  }

  // Cleanup expired data
  cleanup(): void {
    const now = Date.now()
    
    // Cleanup sliding windows
    for (const [key, data] of this.slidingWindows.entries()) {
      if (now - data.lastCleanup > 60 * 60 * 1000) { // 1 hour cleanup interval
        this.slidingWindows.delete(key)
      }
    }
    
    // Cleanup token buckets (keep them longer for refill calculations)
    for (const [key, data] of this.tokenBuckets.entries()) {
      if (now - data.lastRefill > 2 * 60 * 60 * 1000) { // 2 hour cleanup
        this.tokenBuckets.delete(key)
      }
    }
    
    // Cleanup fixed windows
    for (const [key, data] of this.fixedWindows.entries()) {
      if (now > data.windowStart + 60 * 60 * 1000) { // 1 hour after window
        this.fixedWindows.delete(key)
      }
    }
    
    // Cleanup expired IP blocks
    for (const [ip, info] of this.ipBlocks.entries()) {
      if (now >= info.blockedUntil) {
        this.ipBlocks.delete(ip)
      }
    }
    
    // Cleanup old violations
    for (const [key, data] of this.violationCounts.entries()) {
      if (now - data.firstViolation > 24 * 60 * 60 * 1000) {
        this.violationCounts.delete(key)
      }
    }
  }

  // Get statistics
  getStats(): {
    activeWindows: number
    activeBuckets: number
    activeFixedWindows: number
    blockedIPs: number
    totalViolations: number
  } {
    return {
      activeWindows: this.slidingWindows.size,
      activeBuckets: this.tokenBuckets.size,
      activeFixedWindows: this.fixedWindows.size,
      blockedIPs: this.ipBlocks.size,
      totalViolations: Array.from(this.violationCounts.values())
        .reduce((sum, v) => sum + v.count, 0)
    }
  }
}

// Global storage instance
const storage = new RateLimitStorage()

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig) {
  const algorithm = config.algorithm || 'sliding_window'
  
  return {
    /**
     * Check if request should be rate limited
     */
    async checkRateLimit(identifier: string, action = 'request'): Promise<RateLimitResult> {
      const key = `${identifier}:${action}`
      
      // Check if IP is blocked
      const blockStatus = storage.isIPBlocked(identifier)
      if (blockStatus.blocked) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: blockStatus.info!.blockedUntil,
          retryAfter: Math.ceil((blockStatus.info!.blockedUntil - Date.now()) / 1000),
          blocked: true
        }
      }
      
      let result: RateLimitResult
      
      // Apply rate limiting algorithm
      switch (algorithm) {
        case 'token_bucket':
          result = storage.tokenBucket(key, config)
          break
        case 'fixed_window':
          result = storage.fixedWindow(key, config)
          break
        case 'sliding_window':
        default:
          result = storage.slidingWindow(key, config)
          break
      }
      
      // Handle violations
      if (!result.allowed) {
        const violations = storage.recordViolation(identifier)
        
        await logSecurityEvent('rate_limit_violation', {
          identifier,
          action,
          algorithm,
          violations,
          remaining: result.remaining,
          retryAfter: result.retryAfter
        }, violations > 5 ? 'high' : 'medium')
        
        // Auto-block for excessive violations
        if (violations >= 10) {
          const blockDuration = config.blockDurationMs || 60 * 60 * 1000 // 1 hour default
          storage.blockIP(identifier, blockDuration, 'excessive_rate_limit_violations')
          
          result.blocked = true
          result.retryAfter = Math.ceil(blockDuration / 1000)
        }
      }
      
      return result
    },

    /**
     * Block an identifier (usually IP address)
     */
    async blockIdentifier(identifier: string, durationMs: number, reason: string): Promise<void> {
      storage.blockIP(identifier, durationMs, reason)
    },

    /**
     * Unblock an identifier
     */
    async unblockIdentifier(identifier: string): Promise<boolean> {
      return storage.unblockIP(identifier)
    },

    /**
     * Check if identifier is blocked
     */
    isBlocked(identifier: string): { blocked: boolean; info?: IPBlockInfo } {
      return storage.isIPBlocked(identifier)
    },

    /**
     * Get violation count for identifier
     */
    getViolationCount(identifier: string): number {
      return storage.getViolationCount(identifier)
    },

    /**
     * Get rate limiter statistics
     */
    getStats(): ReturnType<typeof storage.getStats> {
      return storage.getStats()
    }
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Global API rate limiting
  globalAPI: createRateLimiter({
    requests: 1000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    algorithm: 'sliding_window'
  }),

  // Authentication attempts
  auth: createRateLimiter({
    requests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    algorithm: 'fixed_window',
    blockDurationMs: 30 * 60 * 1000 // 30 minutes
  }),

  // API endpoints
  api: createRateLimiter({
    requests: 100,
    windowMs: 60 * 1000, // 1 minute
    algorithm: 'token_bucket',
    burst: 150
  }),

  // File uploads
  upload: createRateLimiter({
    requests: 20,
    windowMs: 60 * 1000, // 1 minute
    algorithm: 'fixed_window',
    blockDurationMs: 10 * 60 * 1000 // 10 minutes
  }),

  // Admin operations
  admin: createRateLimiter({
    requests: 50,
    windowMs: 60 * 1000, // 1 minute
    algorithm: 'sliding_window'
  }),

  // Password reset
  passwordReset: createRateLimiter({
    requests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    algorithm: 'fixed_window',
    blockDurationMs: 24 * 60 * 60 * 1000 // 24 hours
  }),

  // Email sending
  email: createRateLimiter({
    requests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    algorithm: 'token_bucket',
    burst: 15
  }),

  // Search operations
  search: createRateLimiter({
    requests: 50,
    windowMs: 60 * 1000, // 1 minute
    algorithm: 'sliding_window'
  })
}

/**
 * Cleanup expired rate limits
 * Should be called periodically (e.g., every 5 minutes)
 */
export function cleanupRateLimits(): void {
  storage.cleanup()
}

/**
 * Get global rate limiting statistics
 */
export function getRateLimitStats(): ReturnType<typeof storage.getStats> {
  return storage.getStats()
}

/**
 * Create middleware for rate limiting
 */
export function withRateLimit(
  rateLimiter: ReturnType<typeof createRateLimiter>,
  getIdentifier: (request: Request) => string = (req) => 
    req.headers.get('x-forwarded-for')?.split(',')[0] || 
    req.headers.get('x-real-ip') || 
    'unknown'
) {
  return async function rateLimitMiddleware(
    request: Request,
    next: () => Promise<Response>
  ): Promise<Response> {
    const identifier = getIdentifier(request)
    const result = await rateLimiter.checkRateLimit(identifier)
    
    if (!result.allowed) {
      const headers: Record<string, string> = {
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
        'Content-Type': 'application/json'
      }
      
      if (result.retryAfter) {
        headers['Retry-After'] = result.retryAfter.toString()
      }
      
      const responseBody = {
        success: false,
        error: result.blocked ? 'IP address blocked' : 'Rate limit exceeded',
        blocked: result.blocked,
        retryAfter: result.retryAfter,
        timestamp: new Date().toISOString()
      }
      
      return new Response(JSON.stringify(responseBody), {
        status: result.blocked ? 403 : 429,
        headers
      })
    }
    
    // Add rate limit headers to successful responses
    const response = await next()
    
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
    
    return response
  }
}

// Setup automatic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000) // Every 5 minutes
}