interface RateLimiterConfig {
  requests: number
  window: number // in milliseconds
}

interface RequestRecord {
  count: number
  resetTime: number
}

class RateLimiter {
  private storage = new Map<string, RequestRecord>()
  private configs: Record<string, RateLimiterConfig> = {
    'newsapi': { requests: 100, window: 24 * 60 * 60 * 1000 }, // 100 requests per day
    'alphavantage': { requests: 5, window: 60 * 1000 }, // 5 requests per minute
    'fyi-user': { requests: 50, window: 60 * 60 * 1000 }, // 50 requests per hour per user
  }

  constructor() {
    // Clean up expired entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000)
  }

  async checkLimit(key: string, identifier: string): Promise<{ allowed: boolean; resetTime?: number }> {
    const config = this.configs[key]
    if (!config) {
      return { allowed: true }
    }

    const cacheKey = `${key}:${identifier}`
    const now = Date.now()
    const record = this.storage.get(cacheKey)

    if (!record || now > record.resetTime) {
      // Create new window
      this.storage.set(cacheKey, {
        count: 1,
        resetTime: now + config.window
      })
      return { allowed: true }
    }

    if (record.count >= config.requests) {
      return { 
        allowed: false, 
        resetTime: record.resetTime 
      }
    }

    // Increment counter
    record.count++
    this.storage.set(cacheKey, record)
    return { allowed: true }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, record] of this.storage.entries()) {
      if (now > record.resetTime) {
        this.storage.delete(key)
      }
    }
  }

  getStats(key: string, identifier: string): { count: number; limit: number; resetTime: number } | null {
    const config = this.configs[key]
    if (!config) return null

    const cacheKey = `${key}:${identifier}`
    const record = this.storage.get(cacheKey)
    
    if (!record || Date.now() > record.resetTime) {
      return {
        count: 0,
        limit: config.requests,
        resetTime: Date.now() + config.window
      }
    }

    return {
      count: record.count,
      limit: config.requests,
      resetTime: record.resetTime
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter()

export { rateLimiter }