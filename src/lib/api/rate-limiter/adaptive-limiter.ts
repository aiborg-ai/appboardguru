/**
 * Adaptive Rate Limiter
 * Implements intelligent rate limiting based on user tier, endpoint complexity, and behavior patterns
 */

import Redis from 'ioredis'
import { RateLimitConfig, RateLimitResult } from '../../security/rate-limiter'
import { logSecurityEvent } from '../../security/audit'

export interface UserTier {
  name: string
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
  burstMultiplier: number
  priorityWeight: number
}

export interface EndpointComplexity {
  path: string
  method: string
  complexity: 'low' | 'medium' | 'high' | 'critical'
  costMultiplier: number
  maxConcurrent?: number
}

export interface BehaviorPattern {
  userId: string
  avgRequestsPerMinute: number
  peakRequestsPerMinute: number
  requestDistribution: Record<string, number> // endpoint -> request count
  errorRate: number
  lastActive: Date
  suspiciousActivity: boolean
  adaptationFactor: number // 0.5 to 2.0, affects rate limits
}

export interface AdaptiveRateLimitConfig extends RateLimitConfig {
  userTier?: UserTier
  endpoint?: EndpointComplexity
  behaviorPattern?: BehaviorPattern
  enableAdaptation?: boolean
  enablePredictiveScaling?: boolean
  enableAnomalyDetection?: boolean
}

export class AdaptiveRateLimiter {
  private redis: Redis
  private userTiers: Map<string, UserTier> = new Map()
  private endpointComplexity: Map<string, EndpointComplexity> = new Map()
  private behaviorPatterns: Map<string, BehaviorPattern> = new Map()
  private anomalyThreshold = 3.0 // Standard deviations from normal

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379')
    this.initializeUserTiers()
    this.initializeEndpointComplexity()
    this.startBehaviorAnalysis()
  }

  private initializeUserTiers() {
    const tiers: UserTier[] = [
      {
        name: 'free',
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        burstMultiplier: 1.2,
        priorityWeight: 1.0
      },
      {
        name: 'premium',
        requestsPerMinute: 300,
        requestsPerHour: 10000,
        requestsPerDay: 100000,
        burstMultiplier: 1.5,
        priorityWeight: 2.0
      },
      {
        name: 'enterprise',
        requestsPerMinute: 1000,
        requestsPerHour: 50000,
        requestsPerDay: 500000,
        burstMultiplier: 2.0,
        priorityWeight: 5.0
      },
      {
        name: 'admin',
        requestsPerMinute: 5000,
        requestsPerHour: 100000,
        requestsPerDay: 1000000,
        burstMultiplier: 3.0,
        priorityWeight: 10.0
      }
    ]

    tiers.forEach(tier => this.userTiers.set(tier.name, tier))
  }

  private initializeEndpointComplexity() {
    const complexityConfigs: EndpointComplexity[] = [
      // Authentication endpoints - critical
      { path: '/api/auth/*', method: 'POST', complexity: 'critical', costMultiplier: 3.0, maxConcurrent: 5 },
      
      // Asset upload - high complexity
      { path: '/api/assets', method: 'POST', complexity: 'high', costMultiplier: 2.5, maxConcurrent: 3 },
      
      // Asset download - medium complexity
      { path: '/api/assets/*/download', method: 'GET', complexity: 'medium', costMultiplier: 2.0 },
      
      // Search operations - medium complexity
      { path: '/api/search', method: 'POST', complexity: 'medium', costMultiplier: 1.5 },
      { path: '/api/assets/search', method: 'GET', complexity: 'medium', costMultiplier: 1.5 },
      
      // GraphQL endpoint - varies by query complexity
      { path: '/api/graphql', method: 'POST', complexity: 'high', costMultiplier: 2.0 },
      
      // Analytics and reporting - high complexity
      { path: '/api/analytics/*', method: 'GET', complexity: 'high', costMultiplier: 2.5 },
      
      // Bulk operations - critical
      { path: '/api/*/bulk', method: 'POST', complexity: 'critical', costMultiplier: 4.0, maxConcurrent: 2 },
      
      // AI/ML operations - critical
      { path: '/api/ai/*', method: 'POST', complexity: 'critical', costMultiplier: 5.0, maxConcurrent: 2 },
      { path: '/api/summarize-document', method: 'POST', complexity: 'critical', costMultiplier: 4.0, maxConcurrent: 3 },
      
      // Real-time features - medium to high
      { path: '/api/websocket', method: 'GET', complexity: 'medium', costMultiplier: 1.8 },
      { path: '/api/notifications', method: 'GET', complexity: 'low', costMultiplier: 0.8 },
      
      // Standard CRUD operations - low to medium
      { path: '/api/organizations', method: 'GET', complexity: 'low', costMultiplier: 1.0 },
      { path: '/api/organizations', method: 'POST', complexity: 'medium', costMultiplier: 1.5 },
      { path: '/api/vaults', method: 'GET', complexity: 'low', costMultiplier: 1.0 },
      { path: '/api/assets', method: 'GET', complexity: 'low', costMultiplier: 1.0 },
      
      // Health checks and monitoring - very low
      { path: '/api/health', method: 'GET', complexity: 'low', costMultiplier: 0.1 },
      { path: '/api/metrics', method: 'GET', complexity: 'low', costMultiplier: 0.5 }
    ]

    complexityConfigs.forEach(config => {
      const key = `${config.method}:${config.path}`
      this.endpointComplexity.set(key, config)
    })
  }

  /**
   * Calculate adaptive rate limit for user and endpoint
   */
  async checkAdaptiveRateLimit(
    identifier: string,
    endpoint: string,
    method: string,
    config: AdaptiveRateLimitConfig
  ): Promise<RateLimitResult> {
    try {
      // Get user tier and behavior pattern
      const userTier = await this.getUserTier(identifier)
      const behaviorPattern = await this.getBehaviorPattern(identifier)
      const endpointConfig = this.getEndpointComplexity(endpoint, method)

      // Calculate adaptive limits
      const adaptedConfig = this.calculateAdaptiveLimits(config, {
        userTier,
        behaviorPattern,
        endpointConfig
      })

      // Check if user is exhibiting anomalous behavior
      if (config.enableAnomalyDetection && behaviorPattern?.suspiciousActivity) {
        await this.handleSuspiciousActivity(identifier, endpoint, method)
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60000, // 1 minute
          retryAfter: 60,
          blocked: true
        }
      }

      // Apply rate limiting with Redis-based distributed storage
      const result = await this.applyDistributedRateLimit(identifier, endpoint, adaptedConfig)

      // Update behavior patterns
      if (config.enableAdaptation) {
        await this.updateBehaviorPattern(identifier, endpoint, method, result.allowed)
      }

      // Log rate limit events
      await this.logRateLimitEvent(identifier, endpoint, method, result, adaptedConfig)

      return result
    } catch (error) {
      console.error('Adaptive rate limiter error:', error)
      // Fallback to basic rate limiting
      return this.fallbackRateLimit(config)
    }
  }

  private async getUserTier(identifier: string): Promise<UserTier> {
    // Try to get from cache first
    const cached = await this.redis.get(`user_tier:${identifier}`)
    if (cached) {
      return JSON.parse(cached)
    }

    // Default to free tier, should be determined by actual user data
    const tier = this.userTiers.get('free')!
    
    // Cache for 5 minutes
    await this.redis.setex(`user_tier:${identifier}`, 300, JSON.stringify(tier))
    
    return tier
  }

  private async getBehaviorPattern(identifier: string): Promise<BehaviorPattern | null> {
    const cached = await this.redis.get(`behavior:${identifier}`)
    if (!cached) return null

    const pattern = JSON.parse(cached)
    return {
      ...pattern,
      lastActive: new Date(pattern.lastActive)
    }
  }

  private getEndpointComplexity(endpoint: string, method: string): EndpointComplexity | null {
    // Exact match first
    const exactKey = `${method}:${endpoint}`
    let config = this.endpointComplexity.get(exactKey)
    
    if (!config) {
      // Try pattern matching
      for (const [pattern, cfg] of this.endpointComplexity.entries()) {
        const [patternMethod, patternPath] = pattern.split(':')
        if (patternMethod === method && this.matchesPattern(endpoint, patternPath)) {
          config = cfg
          break
        }
      }
    }

    return config || null
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Convert pattern to regex (simple implementation)
    const regexPattern = pattern
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
    
    return new RegExp(`^${regexPattern}$`).test(path)
  }

  private calculateAdaptiveLimits(
    baseConfig: AdaptiveRateLimitConfig,
    context: {
      userTier?: UserTier
      behaviorPattern?: BehaviorPattern | null
      endpointConfig?: EndpointComplexity | null
    }
  ): AdaptiveRateLimitConfig {
    let adaptedConfig = { ...baseConfig }

    // Apply user tier adjustments
    if (context.userTier) {
      adaptedConfig.requests = Math.floor(baseConfig.requests * context.userTier.priorityWeight)
      adaptedConfig.burst = Math.floor((baseConfig.burst || baseConfig.requests) * context.userTier.burstMultiplier)
    }

    // Apply endpoint complexity adjustments
    if (context.endpointConfig) {
      const costMultiplier = context.endpointConfig.costMultiplier
      adaptedConfig.requests = Math.floor(adaptedConfig.requests / costMultiplier)
      adaptedConfig.burst = Math.floor((adaptedConfig.burst || adaptedConfig.requests) / costMultiplier)
    }

    // Apply behavior pattern adjustments
    if (context.behaviorPattern && baseConfig.enableAdaptation) {
      const adaptationFactor = context.behaviorPattern.adaptationFactor
      adaptedConfig.requests = Math.floor(adaptedConfig.requests * adaptationFactor)
      adaptedConfig.burst = Math.floor((adaptedConfig.burst || adaptedConfig.requests) * adaptationFactor)

      // Reduce limits for high error rates
      if (context.behaviorPattern.errorRate > 0.1) { // > 10% error rate
        const errorPenalty = Math.max(0.5, 1 - (context.behaviorPattern.errorRate - 0.1))
        adaptedConfig.requests = Math.floor(adaptedConfig.requests * errorPenalty)
      }
    }

    // Ensure minimum limits
    adaptedConfig.requests = Math.max(1, adaptedConfig.requests)
    adaptedConfig.burst = Math.max(1, adaptedConfig.burst || adaptedConfig.requests)

    return adaptedConfig
  }

  private async applyDistributedRateLimit(
    identifier: string,
    endpoint: string,
    config: AdaptiveRateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}:${endpoint}`
    const window = config.windowMs || 60000 // 1 minute default
    const requests = config.requests
    const now = Date.now()
    const windowStart = Math.floor(now / window) * window

    // Use Redis for distributed rate limiting
    const multi = this.redis.multi()
    
    // Sliding window counter approach
    multi.zremrangebyscore(key, 0, now - window)
    multi.zcard(key)
    multi.zadd(key, now, `${now}-${Math.random()}`)
    multi.expire(key, Math.ceil(window / 1000) + 1)
    
    const results = await multi.exec()
    
    if (!results || results.some(([err]) => err)) {
      throw new Error('Redis rate limit operation failed')
    }

    const currentRequests = results[1][1] as number
    
    if (currentRequests >= requests) {
      // Get oldest request timestamp for retry-after calculation
      const oldestRequests = await this.redis.zrange(key, 0, 0, 'WITHSCORES')
      const retryAfter = oldestRequests.length > 0 
        ? Math.ceil((parseInt(oldestRequests[1]) + window - now) / 1000)
        : Math.ceil(window / 1000)

      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + window,
        retryAfter
      }
    }

    return {
      allowed: true,
      remaining: requests - currentRequests - 1,
      resetTime: windowStart + window
    }
  }

  private async updateBehaviorPattern(
    identifier: string,
    endpoint: string,
    method: string,
    allowed: boolean
  ): Promise<void> {
    const key = `behavior:${identifier}`
    const now = Date.now()
    
    let pattern = await this.getBehaviorPattern(identifier)
    
    if (!pattern) {
      pattern = {
        userId: identifier,
        avgRequestsPerMinute: 1,
        peakRequestsPerMinute: 1,
        requestDistribution: {},
        errorRate: 0,
        lastActive: new Date(),
        suspiciousActivity: false,
        adaptationFactor: 1.0
      }
    }

    // Update request distribution
    const endpointKey = `${method}:${endpoint}`
    pattern.requestDistribution[endpointKey] = (pattern.requestDistribution[endpointKey] || 0) + 1

    // Calculate request rate (simple moving average)
    const minutesSinceLastActive = Math.max(1, (now - pattern.lastActive.getTime()) / 60000)
    const newRequestRate = 1 / minutesSinceLastActive
    pattern.avgRequestsPerMinute = (pattern.avgRequestsPerMinute * 0.9) + (newRequestRate * 0.1)
    pattern.peakRequestsPerMinute = Math.max(pattern.peakRequestsPerMinute, newRequestRate)

    // Update error rate
    if (!allowed) {
      pattern.errorRate = (pattern.errorRate * 0.95) + 0.05 // Increase error rate
    } else {
      pattern.errorRate = pattern.errorRate * 0.98 // Decrease error rate
    }

    // Check for anomalous behavior
    pattern.suspiciousActivity = this.detectAnomalousActivity(pattern)

    // Update adaptation factor based on behavior
    pattern.adaptationFactor = this.calculateAdaptationFactor(pattern)

    pattern.lastActive = new Date()

    // Store with 24 hour expiration
    await this.redis.setex(key, 86400, JSON.stringify(pattern))
  }

  private detectAnomalousActivity(pattern: BehaviorPattern): boolean {
    // Simple anomaly detection based on request rate spikes
    if (pattern.avgRequestsPerMinute > 0) {
      const requestRateRatio = pattern.peakRequestsPerMinute / pattern.avgRequestsPerMinute
      if (requestRateRatio > this.anomalyThreshold) {
        return true
      }
    }

    // High error rate indicates potential abuse
    if (pattern.errorRate > 0.5) {
      return true
    }

    // Check for unusual request distribution patterns
    const totalRequests = Object.values(pattern.requestDistribution).reduce((sum, count) => sum + count, 0)
    const uniqueEndpoints = Object.keys(pattern.requestDistribution).length
    
    // Too many requests to too few endpoints (potential DoS)
    if (totalRequests > 1000 && uniqueEndpoints < 3) {
      return true
    }

    return false
  }

  private calculateAdaptationFactor(pattern: BehaviorPattern): number {
    let factor = 1.0

    // Reward consistent, low-error behavior
    if (pattern.errorRate < 0.01) {
      factor *= 1.2
    }

    // Penalize high error rates
    if (pattern.errorRate > 0.1) {
      factor *= (1 - pattern.errorRate)
    }

    // Consider request distribution diversity
    const totalRequests = Object.values(pattern.requestDistribution).reduce((sum, count) => sum + count, 0)
    const uniqueEndpoints = Object.keys(pattern.requestDistribution).length
    
    if (totalRequests > 0) {
      const diversityFactor = Math.min(2.0, uniqueEndpoints / Math.sqrt(totalRequests))
      factor *= (0.5 + diversityFactor * 0.5)
    }

    // Clamp between 0.1 and 2.0
    return Math.max(0.1, Math.min(2.0, factor))
  }

  private async handleSuspiciousActivity(
    identifier: string,
    endpoint: string,
    method: string
  ): Promise<void> {
    await logSecurityEvent('suspicious_activity_detected', {
      identifier,
      endpoint,
      method,
      timestamp: new Date().toISOString()
    }, 'high')

    // Auto-block for 5 minutes
    const blockKey = `blocked:${identifier}`
    await this.redis.setex(blockKey, 300, 'suspicious_activity')
  }

  private async logRateLimitEvent(
    identifier: string,
    endpoint: string,
    method: string,
    result: RateLimitResult,
    config: AdaptiveRateLimitConfig
  ): Promise<void> {
    if (!result.allowed) {
      await logSecurityEvent('rate_limit_exceeded', {
        identifier,
        endpoint,
        method,
        remaining: result.remaining,
        resetTime: result.resetTime,
        retryAfter: result.retryAfter,
        config: {
          requests: config.requests,
          windowMs: config.windowMs,
          algorithm: config.algorithm
        }
      }, 'medium')
    }
  }

  private fallbackRateLimit(config: AdaptiveRateLimitConfig): RateLimitResult {
    return {
      allowed: true,
      remaining: config.requests - 1,
      resetTime: Date.now() + (config.windowMs || 60000)
    }
  }

  /**
   * Get rate limiting analytics
   */
  async getAnalytics(timeRange: { from: Date; to: Date }) {
    // Implementation for analytics would query Redis/database for rate limit data
    return {
      totalRequests: 0,
      blockedRequests: 0,
      topUsers: [],
      topEndpoints: [],
      anomaliesDetected: 0
    }
  }

  /**
   * Manual override for user rate limits
   */
  async setUserTierOverride(identifier: string, tier: UserTier, durationHours: number) {
    const key = `user_tier_override:${identifier}`
    await this.redis.setex(key, durationHours * 3600, JSON.stringify(tier))
  }

  /**
   * Start background behavior analysis
   */
  private startBehaviorAnalysis() {
    // Run behavior analysis every 5 minutes
    setInterval(async () => {
      try {
        await this.analyzeBehaviorPatterns()
      } catch (error) {
        console.error('Behavior analysis error:', error)
      }
    }, 5 * 60 * 1000)
  }

  private async analyzeBehaviorPatterns() {
    // Get all behavior patterns
    const keys = await this.redis.keys('behavior:*')
    
    for (const key of keys) {
      const patternData = await this.redis.get(key)
      if (!patternData) continue

      const pattern: BehaviorPattern = JSON.parse(patternData)
      
      // Update adaptation factors and anomaly detection
      pattern.suspiciousActivity = this.detectAnomalousActivity(pattern)
      pattern.adaptationFactor = this.calculateAdaptationFactor(pattern)
      
      // Store updated pattern
      await this.redis.setex(key, 86400, JSON.stringify(pattern))
    }
  }
}