/**
 * Advanced Rate Limiting and Quota Management Middleware
 * Supports multiple rate limiting strategies and quota enforcement
 */

import { NextRequest, NextResponse } from 'next/server'
import { MiddlewareContext } from './types'

export interface RateLimitRule {
  requests: number
  window: string | number // '1m', '1h', '1d' or milliseconds
  burst?: number // Allow burst requests
  skipSuccessful?: boolean // Only count failed requests
  skipOptions?: boolean // Skip OPTIONS requests
  keyGenerator?: (request: NextRequest) => string
  condition?: (request: NextRequest) => boolean
}

export interface QuotaConfig {
  daily?: number
  monthly?: number
  concurrent?: number
  bandwidth?: number // bytes per window
  storage?: number // total storage limit in bytes
}

export interface RateLimitConfig {
  rules: RateLimitRule[]
  quota?: QuotaConfig
  storage: RateLimitStorage
  onExceeded?: (request: NextRequest, rule: RateLimitRule) => NextResponse
  onQuotaExceeded?: (request: NextRequest, quota: QuotaConfig) => NextResponse
  whitelist?: string[] // IPs or user IDs to exempt
  identifier?: 'ip' | 'user' | 'api-key' | ((request: NextRequest) => string)
  skipOnError?: boolean
}

export interface RateLimitStorage {
  get(key: string): Promise<RateLimitRecord | null>
  set(key: string, record: RateLimitRecord, ttl?: number): Promise<void>
  increment(key: string, amount?: number): Promise<number>
  delete(key: string): Promise<void>
  keys(pattern: string): Promise<string[]>
}

export interface RateLimitRecord {
  count: number
  resetTime: number
  firstRequest: number
  lastRequest: number
  burst?: number
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
  'X-RateLimit-RetryAfter'?: string
}

/**
 * In-memory rate limit storage (for development/testing)
 */
export class MemoryRateLimitStorage implements RateLimitStorage {
  private records: Map<string, RateLimitRecord> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()

  async get(key: string): Promise<RateLimitRecord | null> {
    return this.records.get(key) || null
  }

  async set(key: string, record: RateLimitRecord, ttl?: number): Promise<void> {
    this.records.set(key, record)
    
    if (ttl) {
      // Clear existing timer
      const existingTimer = this.timers.get(key)
      if (existingTimer) clearTimeout(existingTimer)
      
      // Set new timer
      const timer = setTimeout(() => {
        this.records.delete(key)
        this.timers.delete(key)
      }, ttl)
      
      this.timers.set(key, timer)
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    const record = await this.get(key)
    const newCount = (record?.count || 0) + amount
    
    if (record) {
      record.count = newCount
      record.lastRequest = Date.now()
      await this.set(key, record)
    }
    
    return newCount
  }

  async delete(key: string): Promise<void> {
    this.records.delete(key)
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return Array.from(this.records.keys()).filter(key => regex.test(key))
  }
}

/**
 * Redis-based rate limit storage
 */
export class RedisRateLimitStorage implements RateLimitStorage {
  constructor(private redis: any) {} // Redis client

  async get(key: string): Promise<RateLimitRecord | null> {
    try {
      const data = await this.redis.get(`ratelimit:${key}`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Redis rate limit get error:', error)
      return null
    }
  }

  async set(key: string, record: RateLimitRecord, ttl?: number): Promise<void> {
    try {
      const data = JSON.stringify(record)
      if (ttl) {
        await this.redis.setex(`ratelimit:${key}`, Math.ceil(ttl / 1000), data)
      } else {
        await this.redis.set(`ratelimit:${key}`, data)
      }
    } catch (error) {
      console.error('Redis rate limit set error:', error)
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(`ratelimit:${key}:counter`, amount)
    } catch (error) {
      console.error('Redis rate limit increment error:', error)
      return 0
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(`ratelimit:${key}`)
      await this.redis.del(`ratelimit:${key}:counter`)
    } catch (error) {
      console.error('Redis rate limit delete error:', error)
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(`ratelimit:${pattern}`)
    } catch (error) {
      console.error('Redis rate limit keys error:', error)
      return []
    }
  }
}

/**
 * Parse time window string to milliseconds
 */
function parseTimeWindow(window: string | number): number {
  if (typeof window === 'number') return window
  
  const match = window.match(/^(\d+)([smhd])$/)
  if (!match) throw new Error(`Invalid time window: ${window}`)
  
  const value = parseInt(match[1], 10)
  const unit = match[2]
  
  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: throw new Error(`Invalid time unit: ${unit}`)
  }
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest, identifier?: string | ((req: NextRequest) => string)): string {
  if (typeof identifier === 'function') {
    return identifier(request)
  }

  switch (identifier) {
    case 'user':
      return request.headers.get('x-user-id') || 'anonymous'
    case 'api-key':
      return request.headers.get('x-api-key') || request.headers.get('authorization') || 'no-key'
    case 'ip':
    default:
      return getClientIP(request)
  }
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip',
    'fastly-client-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // Handle comma-separated IPs (x-forwarded-for)
      const ip = value.split(',')[0].trim()
      if (ip && ip !== 'unknown') {
        return ip
      }
    }
  }

  return 'unknown'
}

/**
 * Create rate limit headers
 */
function createRateLimitHeaders(
  rule: RateLimitRule,
  record: RateLimitRecord | null,
  remaining: number
): RateLimitHeaders {
  const windowMs = parseTimeWindow(rule.window)
  const resetTime = record ? record.resetTime : Date.now() + windowMs

  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': rule.requests.toString(),
    'X-RateLimit-Remaining': Math.max(0, remaining).toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
  }

  if (remaining <= 0) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
    headers['X-RateLimit-RetryAfter'] = retryAfter.toString()
  }

  return headers
}

/**
 * Check if request should be skipped
 */
function shouldSkipRequest(request: NextRequest, rule: RateLimitRule): boolean {
  // Skip OPTIONS requests if configured
  if (rule.skipOptions && request.method === 'OPTIONS') {
    return true
  }

  // Check custom condition
  if (rule.condition && !rule.condition(request)) {
    return true
  }

  return false
}

/**
 * Rate limiting middleware
 */
export function rateLimitingMiddleware(config: RateLimitConfig) {
  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    const { request } = context

    try {
      const clientId = getClientIdentifier(request, config.identifier)
      
      // Check whitelist
      if (config.whitelist?.includes(clientId)) {
        await next()
        return
      }

      // Check each rate limit rule
      for (const rule of config.rules) {
        if (shouldSkipRequest(request, rule)) {
          continue
        }

        const key = rule.keyGenerator ? rule.keyGenerator(request) : 
          `${clientId}:${request.nextUrl.pathname}:${rule.window}`
        
        const windowMs = parseTimeWindow(rule.window)
        const now = Date.now()
        const resetTime = now + windowMs

        // Get current record
        let record = await config.storage.get(key)
        
        // Initialize or reset if window expired
        if (!record || now >= record.resetTime) {
          record = {
            count: 0,
            resetTime,
            firstRequest: now,
            lastRequest: now,
            burst: rule.burst || 0
          }
        }

        // Check if limit exceeded
        const remaining = rule.requests - record.count
        const burstRemaining = (rule.burst || 0) - (record.burst || 0)
        
        if (remaining <= 0 && burstRemaining <= 0) {
          // Rate limit exceeded
          const headers = createRateLimitHeaders(rule, record, remaining)
          
          let response: NextResponse
          if (config.onExceeded) {
            response = config.onExceeded(request, rule)
          } else {
            response = NextResponse.json({
              success: false,
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              limit: rule.requests,
              window: rule.window,
              resetTime: record.resetTime,
              retryAfter: Math.ceil((record.resetTime - now) / 1000)
            }, { status: 429 })
          }

          // Add rate limit headers
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value)
          })

          context.response = response
          return
        }

        // Increment counter
        record.count += 1
        record.lastRequest = now
        
        // Handle burst allowance
        if (remaining <= 0 && burstRemaining > 0) {
          record.burst = (record.burst || 0) + 1
        }

        // Save updated record
        const ttl = record.resetTime - now
        await config.storage.set(key, record, ttl)

        // Add rate limit headers to context for later use
        const headers = createRateLimitHeaders(rule, record, remaining - 1)
        context.rateLimitHeaders = { ...context.rateLimitHeaders, ...headers }
      }

      // Check quotas
      if (config.quota) {
        const quotaViolation = await checkQuotas(request, config.quota, clientId, config.storage)
        if (quotaViolation) {
          let response: NextResponse
          if (config.onQuotaExceeded) {
            response = config.onQuotaExceeded(request, config.quota)
          } else {
            response = NextResponse.json({
              success: false,
              error: 'Quota exceeded',
              code: 'QUOTA_EXCEEDED',
              quotaType: quotaViolation.type,
              limit: quotaViolation.limit,
              used: quotaViolation.used,
              resetTime: quotaViolation.resetTime
            }, { status: 429 })
          }

          context.response = response
          return
        }
      }

      // Continue to next middleware
      await next()

      // Add rate limit headers to final response
      if (context.rateLimitHeaders && context.response) {
        Object.entries(context.rateLimitHeaders).forEach(([key, value]) => {
          context.response!.headers.set(key, value)
        })
      }

    } catch (error) {
      console.error('Rate limiting error:', error)
      
      if (config.skipOnError) {
        await next()
      } else {
        context.response = NextResponse.json({
          success: false,
          error: 'Rate limiting service unavailable',
          code: 'RATE_LIMIT_ERROR'
        }, { status: 503 })
      }
    }
  }
}

/**
 * Check quota violations
 */
async function checkQuotas(
  request: NextRequest,
  quota: QuotaConfig,
  clientId: string,
  storage: RateLimitStorage
): Promise<{ type: string, limit: number, used: number, resetTime: number } | null> {
  const now = Date.now()
  
  // Daily quota
  if (quota.daily) {
    const key = `quota:daily:${clientId}:${new Date().toDateString()}`
    const record = await storage.get(key)
    const used = record?.count || 0
    
    if (used >= quota.daily) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      return {
        type: 'daily',
        limit: quota.daily,
        used,
        resetTime: tomorrow.getTime()
      }
    }
  }

  // Monthly quota
  if (quota.monthly) {
    const key = `quota:monthly:${clientId}:${new Date().toISOString().substring(0, 7)}`
    const record = await storage.get(key)
    const used = record?.count || 0
    
    if (used >= quota.monthly) {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1)
      nextMonth.setHours(0, 0, 0, 0)
      
      return {
        type: 'monthly',
        limit: quota.monthly,
        used,
        resetTime: nextMonth.getTime()
      }
    }
  }

  // Concurrent requests quota
  if (quota.concurrent) {
    const key = `quota:concurrent:${clientId}`
    const concurrent = await storage.get(key)
    
    if (concurrent && concurrent.count >= quota.concurrent) {
      return {
        type: 'concurrent',
        limit: quota.concurrent,
        used: concurrent.count,
        resetTime: now + 60000 // 1 minute
      }
    }
  }

  return null
}

/**
 * Quota tracking middleware
 */
export function quotaTrackingMiddleware(storage: RateLimitStorage) {
  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    const { request } = context
    const clientId = getClientIdentifier(request)
    
    // Track concurrent requests
    const concurrentKey = `quota:concurrent:${clientId}`
    await storage.increment(concurrentKey)
    
    try {
      await next()
    } finally {
      // Decrement concurrent counter
      const record = await storage.get(concurrentKey)
      if (record && record.count > 0) {
        record.count -= 1
        await storage.set(concurrentKey, record, 300000) // 5 minutes TTL
      }
    }

    // Track daily/monthly usage
    if (context.response?.status && context.response.status < 400) {
      const now = new Date()
      
      // Daily quota
      const dailyKey = `quota:daily:${clientId}:${now.toDateString()}`
      await storage.increment(dailyKey)
      
      // Monthly quota
      const monthlyKey = `quota:monthly:${clientId}:${now.toISOString().substring(0, 7)}`
      await storage.increment(monthlyKey)
    }
  }
}

/**
 * Rate limit analytics
 */
export class RateLimitAnalytics {
  constructor(private storage: RateLimitStorage) {}

  async getTopClients(limit: number = 10): Promise<Array<{client: string, requests: number}>> {
    const keys = await this.storage.keys('*')
    const clientCounts: Record<string, number> = {}
    
    for (const key of keys) {
      const record = await this.storage.get(key)
      if (record) {
        const client = key.split(':')[0]
        clientCounts[client] = (clientCounts[client] || 0) + record.count
      }
    }
    
    return Object.entries(clientCounts)
      .map(([client, requests]) => ({ client, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit)
  }

  async getRateLimitViolations(hours: number = 24): Promise<Array<{key: string, violations: number}>> {
    // This would require additional tracking of violations
    // Implementation depends on storage backend
    return []
  }

  async getQuotaUsage(clientId: string): Promise<{
    daily: {used: number, limit: number}
    monthly: {used: number, limit: number}
    concurrent: {used: number, limit: number}
  }> {
    const now = new Date()
    
    const dailyKey = `quota:daily:${clientId}:${now.toDateString()}`
    const monthlyKey = `quota:monthly:${clientId}:${now.toISOString().substring(0, 7)}`
    const concurrentKey = `quota:concurrent:${clientId}`
    
    const [daily, monthly, concurrent] = await Promise.all([
      this.storage.get(dailyKey),
      this.storage.get(monthlyKey),
      this.storage.get(concurrentKey)
    ])
    
    return {
      daily: { used: daily?.count || 0, limit: 0 }, // Limit would need to be stored/configured
      monthly: { used: monthly?.count || 0, limit: 0 },
      concurrent: { used: concurrent?.count || 0, limit: 0 }
    }
  }
}