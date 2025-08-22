/**
 * Rate Limiting Middleware
 * Following CLAUDE.md performance and security patterns
 */

import { NextRequest } from 'next/server'
import type { Result } from '../repositories/result'

// Rate limit configuration
interface RateLimitConfig {
  requestsPerMinute: number
  identifier: string
  keyGenerator?: (request: NextRequest) => string
}

// Rate limit storage (in production, use Redis)
const rateLimitStore = new Map<string, {
  count: number
  resetTime: number
}>()

/**
 * Apply rate limiting to requests
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<Result<void>> {
  try {
    const key = config.keyGenerator 
      ? config.keyGenerator(request)
      : `${config.identifier}:${getClientIdentifier(request)}`

    const now = Date.now()
    const windowMs = 60000 // 1 minute window
    const resetTime = now + windowMs

    // Get current rate limit data
    const current = rateLimitStore.get(key)

    if (!current || now > current.resetTime) {
      // Reset or create new rate limit entry
      rateLimitStore.set(key, {
        count: 1,
        resetTime
      })
      
      return { success: true, data: undefined }
    }

    // Check if limit exceeded
    if (current.count >= config.requestsPerMinute) {
      return {
        success: false,
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          context: {
            limit: config.requestsPerMinute,
            resetTime: current.resetTime,
            identifier: config.identifier
          }
        }
      }
    }

    // Increment counter
    current.count++
    rateLimitStore.set(key, current)

    return { success: true, data: undefined }

  } catch (error) {
    console.error('Rate limiting error:', error)
    
    // On error, allow the request (fail open)
    return { success: true, data: undefined }
  }
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get client IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown'

  // Include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const userAgentHash = simpleHash(userAgent)

  return `${clientIp}:${userAgentHash}`
}

/**
 * Simple hash function for user agent
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

/**
 * Cleanup expired rate limit entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now()
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000)
}