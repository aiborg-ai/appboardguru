/**
 * Rate Limiting Analytics
 * Provides insights into API usage patterns, abuse detection, and performance metrics
 */

import Redis from 'ioredis'
import { AdaptiveRateLimiter } from './adaptive-limiter'

export interface RateLimitMetrics {
  totalRequests: number
  allowedRequests: number
  blockedRequests: number
  rateLimitViolations: number
  uniqueUsers: number
  suspiciousActivityCount: number
  averageRequestsPerUser: number
  peakRequestsPerMinute: number
  errorRate: number
}

export interface UserAnalytics {
  userId: string
  totalRequests: number
  blockedRequests: number
  errorRate: number
  avgRequestsPerMinute: number
  peakRequestsPerMinute: number
  topEndpoints: Array<{ endpoint: string; count: number }>
  tier: string
  adaptationFactor: number
  suspiciousActivity: boolean
  firstSeen: Date
  lastSeen: Date
}

export interface EndpointAnalytics {
  endpoint: string
  method: string
  totalRequests: number
  uniqueUsers: number
  blockedRequests: number
  averageResponseTime: number
  errorRate: number
  complexity: string
  costMultiplier: number
  peakUsage: Array<{ timestamp: Date; count: number }>
}

export interface TimeSeriesData {
  timestamp: Date
  totalRequests: number
  allowedRequests: number
  blockedRequests: number
  uniqueUsers: number
  errorRate: number
}

export interface AnomalyDetection {
  timestamp: Date
  userId: string
  anomalyType: 'rate_spike' | 'error_spike' | 'pattern_change' | 'abuse_attempt'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  metrics: Record<string, number>
  autoBlocked: boolean
}

export class RateLimitAnalytics {
  private redis: Redis
  private rateLimiter: AdaptiveRateLimiter

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379')
    this.rateLimiter = new AdaptiveRateLimiter(redisUrl)
    this.setupAnalyticsCollection()
  }

  /**
   * Record a rate limit event for analytics
   */
  async recordEvent(
    userId: string,
    endpoint: string,
    method: string,
    allowed: boolean,
    responseTime: number,
    userAgent?: string,
    ip?: string
  ): Promise<void> {
    const timestamp = Date.now()
    const minute = Math.floor(timestamp / 60000) * 60000
    const hour = Math.floor(timestamp / 3600000) * 3600000
    const day = Math.floor(timestamp / 86400000) * 86400000

    const multi = this.redis.multi()

    // Global metrics by time period
    multi.hincrby(`metrics:minute:${minute}`, 'total_requests', 1)
    multi.hincrby(`metrics:hour:${hour}`, 'total_requests', 1)
    multi.hincrby(`metrics:day:${day}`, 'total_requests', 1)

    if (allowed) {
      multi.hincrby(`metrics:minute:${minute}`, 'allowed_requests', 1)
      multi.hincrby(`metrics:hour:${hour}`, 'allowed_requests', 1)
      multi.hincrby(`metrics:day:${day}`, 'allowed_requests', 1)
    } else {
      multi.hincrby(`metrics:minute:${minute}`, 'blocked_requests', 1)
      multi.hincrby(`metrics:hour:${hour}`, 'blocked_requests', 1)
      multi.hincrby(`metrics:day:${day}`, 'blocked_requests', 1)
    }

    // User-specific metrics
    multi.hincrby(`user_metrics:${userId}:day:${day}`, 'total_requests', 1)
    multi.hincrby(`user_metrics:${userId}:day:${day}`, allowed ? 'allowed_requests' : 'blocked_requests', 1)
    multi.zadd(`user_metrics:${userId}:endpoints`, 1, `${method}:${endpoint}`, 'INCR')

    // Endpoint-specific metrics
    const endpointKey = `${method}:${endpoint}`
    multi.hincrby(`endpoint_metrics:${endpointKey}:day:${day}`, 'total_requests', 1)
    multi.hincrby(`endpoint_metrics:${endpointKey}:day:${day}`, allowed ? 'allowed_requests' : 'blocked_requests', 1)
    multi.sadd(`endpoint_users:${endpointKey}:day:${day}`, userId)

    // Response time tracking
    if (allowed && responseTime > 0) {
      multi.lpush(`response_times:${endpointKey}`, responseTime)
      multi.ltrim(`response_times:${endpointKey}`, 0, 999) // Keep last 1000 response times
    }

    // IP and User Agent tracking for security
    if (ip) {
      multi.sadd(`ips:day:${day}`, ip)
      multi.hincrby(`ip_metrics:${ip}:day:${day}`, 'total_requests', 1)
    }

    if (userAgent) {
      multi.sadd(`user_agents:day:${day}`, userAgent)
    }

    // Set expiration for time-based keys (30 days)
    multi.expire(`metrics:minute:${minute}`, 1800) // 30 minutes for minute-level data
    multi.expire(`metrics:hour:${hour}`, 86400 * 7) // 7 days for hour-level data
    multi.expire(`metrics:day:${day}`, 86400 * 30) // 30 days for day-level data
    multi.expire(`user_metrics:${userId}:day:${day}`, 86400 * 30)
    multi.expire(`endpoint_metrics:${endpointKey}:day:${day}`, 86400 * 30)

    await multi.exec()

    // Real-time anomaly detection
    await this.detectAnomalies(userId, endpoint, method, allowed, timestamp)
  }

  /**
   * Get overall rate limiting metrics for a time period
   */
  async getMetrics(timeRange: { from: Date; to: Date }): Promise<RateLimitMetrics> {
    const { from, to } = timeRange
    const days = []
    
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      days.push(Math.floor(d.getTime() / 86400000) * 86400000)
    }

    let totalRequests = 0
    let allowedRequests = 0
    let blockedRequests = 0
    let uniqueUsersSet = new Set<string>()

    for (const day of days) {
      const metrics = await this.redis.hgetall(`metrics:day:${day}`)
      totalRequests += parseInt(metrics.total_requests || '0')
      allowedRequests += parseInt(metrics.allowed_requests || '0')
      blockedRequests += parseInt(metrics.blocked_requests || '0')

      // Get unique users for this day
      const users = await this.redis.keys(`user_metrics:*:day:${day}`)
      users.forEach(key => {
        const userId = key.split(':')[1]
        uniqueUsersSet.add(userId)
      })
    }

    // Get suspicious activity count
    const suspiciousActivityCount = await this.getSuspiciousActivityCount(timeRange)

    // Calculate peak requests per minute
    const peakRequestsPerMinute = await this.getPeakRequestsPerMinute(timeRange)

    return {
      totalRequests,
      allowedRequests,
      blockedRequests,
      rateLimitViolations: blockedRequests,
      uniqueUsers: uniqueUsersSet.size,
      suspiciousActivityCount,
      averageRequestsPerUser: uniqueUsersSet.size > 0 ? totalRequests / uniqueUsersSet.size : 0,
      peakRequestsPerMinute,
      errorRate: totalRequests > 0 ? blockedRequests / totalRequests : 0
    }
  }

  /**
   * Get detailed analytics for a specific user
   */
  async getUserAnalytics(userId: string, timeRange: { from: Date; to: Date }): Promise<UserAnalytics | null> {
    const { from, to } = timeRange
    const days = []
    
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      days.push(Math.floor(d.getTime() / 86400000) * 86400000)
    }

    let totalRequests = 0
    let blockedRequests = 0
    let firstSeen: Date | null = null
    let lastSeen: Date | null = null

    for (const day of days) {
      const metrics = await this.redis.hgetall(`user_metrics:${userId}:day:${day}`)
      const dayTotal = parseInt(metrics.total_requests || '0')
      const dayBlocked = parseInt(metrics.blocked_requests || '0')
      
      totalRequests += dayTotal
      blockedRequests += dayBlocked

      if (dayTotal > 0) {
        const dayDate = new Date(day)
        if (!firstSeen || dayDate < firstSeen) firstSeen = dayDate
        if (!lastSeen || dayDate > lastSeen) lastSeen = dayDate
      }
    }

    if (totalRequests === 0) return null

    // Get top endpoints
    const endpointScores = await this.redis.zrevrange(`user_metrics:${userId}:endpoints`, 0, 9, 'WITHSCORES')
    const topEndpoints = []
    for (let i = 0; i < endpointScores.length; i += 2) {
      topEndpoints.push({
        endpoint: endpointScores[i],
        count: parseInt(endpointScores[i + 1])
      })
    }

    // Get behavior pattern data
    const behaviorData = await this.redis.get(`behavior:${userId}`)
    let avgRequestsPerMinute = 0
    let peakRequestsPerMinute = 0
    let adaptationFactor = 1.0
    let suspiciousActivity = false

    if (behaviorData) {
      const behavior = JSON.parse(behaviorData)
      avgRequestsPerMinute = behavior.avgRequestsPerMinute || 0
      peakRequestsPerMinute = behavior.peakRequestsPerMinute || 0
      adaptationFactor = behavior.adaptationFactor || 1.0
      suspiciousActivity = behavior.suspiciousActivity || false
    }

    // Get user tier
    const tierData = await this.redis.get(`user_tier:${userId}`)
    const tier = tierData ? JSON.parse(tierData).name : 'free'

    return {
      userId,
      totalRequests,
      blockedRequests,
      errorRate: totalRequests > 0 ? blockedRequests / totalRequests : 0,
      avgRequestsPerMinute,
      peakRequestsPerMinute,
      topEndpoints,
      tier,
      adaptationFactor,
      suspiciousActivity,
      firstSeen: firstSeen!,
      lastSeen: lastSeen!
    }
  }

  /**
   * Get analytics for a specific endpoint
   */
  async getEndpointAnalytics(endpoint: string, method: string, timeRange: { from: Date; to: Date }): Promise<EndpointAnalytics> {
    const { from, to } = timeRange
    const endpointKey = `${method}:${endpoint}`
    const days = []
    
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      days.push(Math.floor(d.getTime() / 86400000) * 86400000)
    }

    let totalRequests = 0
    let blockedRequests = 0
    let uniqueUsersSet = new Set<string>()
    let peakUsage: Array<{ timestamp: Date; count: number }> = []

    for (const day of days) {
      const metrics = await this.redis.hgetall(`endpoint_metrics:${endpointKey}:day:${day}`)
      const dayTotal = parseInt(metrics.total_requests || '0')
      const dayBlocked = parseInt(metrics.blocked_requests || '0')
      
      totalRequests += dayTotal
      blockedRequests += dayBlocked

      if (dayTotal > 0) {
        peakUsage.push({
          timestamp: new Date(day),
          count: dayTotal
        })
      }

      // Get unique users for this endpoint
      const users = await this.redis.smembers(`endpoint_users:${endpointKey}:day:${day}`)
      users.forEach(user => uniqueUsersSet.add(user))
    }

    // Calculate average response time
    const responseTimes = await this.redis.lrange(`response_times:${endpointKey}`, 0, -1)
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + parseInt(time), 0) / responseTimes.length
      : 0

    return {
      endpoint,
      method,
      totalRequests,
      uniqueUsers: uniqueUsersSet.size,
      blockedRequests,
      averageResponseTime,
      errorRate: totalRequests > 0 ? blockedRequests / totalRequests : 0,
      complexity: 'medium', // Would be determined by endpoint complexity config
      costMultiplier: 1.0, // Would be determined by endpoint complexity config
      peakUsage: peakUsage.sort((a, b) => b.count - a.count).slice(0, 10)
    }
  }

  /**
   * Get time series data for dashboard charts
   */
  async getTimeSeriesData(timeRange: { from: Date; to: Date }, granularity: 'minute' | 'hour' | 'day' = 'hour'): Promise<TimeSeriesData[]> {
    const { from, to } = timeRange
    const data: TimeSeriesData[] = []
    
    let interval: number
    let keyPrefix: string
    
    switch (granularity) {
      case 'minute':
        interval = 60000
        keyPrefix = 'metrics:minute'
        break
      case 'hour':
        interval = 3600000
        keyPrefix = 'metrics:hour'
        break
      case 'day':
        interval = 86400000
        keyPrefix = 'metrics:day'
        break
    }

    for (let timestamp = from.getTime(); timestamp <= to.getTime(); timestamp += interval) {
      const periodStart = Math.floor(timestamp / interval) * interval
      const metrics = await this.redis.hgetall(`${keyPrefix}:${periodStart}`)
      
      const totalRequests = parseInt(metrics.total_requests || '0')
      const allowedRequests = parseInt(metrics.allowed_requests || '0')
      const blockedRequests = parseInt(metrics.blocked_requests || '0')
      
      // Get unique users count for this period
      const uniqueUsers = await this.getUniqueUsersForPeriod(periodStart, granularity)
      
      data.push({
        timestamp: new Date(periodStart),
        totalRequests,
        allowedRequests,
        blockedRequests,
        uniqueUsers,
        errorRate: totalRequests > 0 ? blockedRequests / totalRequests : 0
      })
    }

    return data
  }

  /**
   * Get anomaly detections for the time range
   */
  async getAnomalies(timeRange: { from: Date; to: Date }): Promise<AnomalyDetection[]> {
    const { from, to } = timeRange
    const anomalies: AnomalyDetection[] = []

    // Get all anomaly keys for the time range
    const pattern = `anomaly:*`
    const keys = await this.redis.keys(pattern)

    for (const key of keys) {
      const anomalyData = await this.redis.get(key)
      if (!anomalyData) continue

      const anomaly: AnomalyDetection = JSON.parse(anomalyData)
      const anomalyTime = new Date(anomaly.timestamp)

      if (anomalyTime >= from && anomalyTime <= to) {
        anomalies.push(anomaly)
      }
    }

    return anomalies.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  /**
   * Generate a comprehensive analytics report
   */
  async generateReport(timeRange: { from: Date; to: Date }): Promise<{
    summary: RateLimitMetrics
    timeSeriesData: TimeSeriesData[]
    topUsers: UserAnalytics[]
    topEndpoints: EndpointAnalytics[]
    anomalies: AnomalyDetection[]
    recommendations: string[]
  }> {
    const [summary, timeSeriesData, anomalies] = await Promise.all([
      this.getMetrics(timeRange),
      this.getTimeSeriesData(timeRange),
      this.getAnomalies(timeRange)
    ])

    // Get top users by request count
    const topUsers = await this.getTopUsers(timeRange, 10)
    
    // Get top endpoints by request count
    const topEndpoints = await this.getTopEndpoints(timeRange, 10)

    // Generate recommendations based on the data
    const recommendations = this.generateRecommendations(summary, anomalies, topUsers, topEndpoints)

    return {
      summary,
      timeSeriesData,
      topUsers,
      topEndpoints,
      anomalies,
      recommendations
    }
  }

  private async detectAnomalies(
    userId: string,
    endpoint: string,
    method: string,
    allowed: boolean,
    timestamp: number
  ): Promise<void> {
    const minute = Math.floor(timestamp / 60000)
    const userMinuteKey = `user_rate:${userId}:${minute}`
    
    // Track requests per minute for this user
    const requestsThisMinute = await this.redis.incr(userMinuteKey)
    await this.redis.expire(userMinuteKey, 120) // 2 minute expiration

    // Check for rate spikes
    if (requestsThisMinute > 100) { // Threshold for spike detection
      await this.recordAnomaly({
        timestamp: new Date(timestamp),
        userId,
        anomalyType: 'rate_spike',
        severity: 'high',
        description: `User ${userId} made ${requestsThisMinute} requests in one minute`,
        metrics: { requestsPerMinute: requestsThisMinute },
        autoBlocked: false
      })
    }

    // Check for error spikes if request was blocked
    if (!allowed) {
      const errorKey = `user_errors:${userId}:${minute}`
      const errorsThisMinute = await this.redis.incr(errorKey)
      await this.redis.expire(errorKey, 120)

      if (errorsThisMinute > 10) {
        await this.recordAnomaly({
          timestamp: new Date(timestamp),
          userId,
          anomalyType: 'error_spike',
          severity: 'medium',
          description: `User ${userId} had ${errorsThisMinute} rate limit violations in one minute`,
          metrics: { errorsPerMinute: errorsThisMinute },
          autoBlocked: false
        })
      }
    }
  }

  private async recordAnomaly(anomaly: AnomalyDetection): Promise<void> {
    const key = `anomaly:${anomaly.timestamp.getTime()}:${anomaly.userId}`
    await this.redis.setex(key, 86400 * 7, JSON.stringify(anomaly)) // Keep for 7 days
  }

  private async getSuspiciousActivityCount(timeRange: { from: Date; to: Date }): Promise<number> {
    const pattern = `anomaly:*`
    const keys = await this.redis.keys(pattern)
    
    let count = 0
    for (const key of keys) {
      const anomalyData = await this.redis.get(key)
      if (!anomalyData) continue
      
      const anomaly: AnomalyDetection = JSON.parse(anomalyData)
      const anomalyTime = new Date(anomaly.timestamp)
      
      if (anomalyTime >= timeRange.from && anomalyTime <= timeRange.to) {
        count++
      }
    }
    
    return count
  }

  private async getPeakRequestsPerMinute(timeRange: { from: Date; to: Date }): Promise<number> {
    let peak = 0
    const interval = 60000 // 1 minute
    
    for (let timestamp = timeRange.from.getTime(); timestamp <= timeRange.to.getTime(); timestamp += interval) {
      const periodStart = Math.floor(timestamp / interval) * interval
      const metrics = await this.redis.hgetall(`metrics:minute:${periodStart}`)
      const requests = parseInt(metrics.total_requests || '0')
      if (requests > peak) {
        peak = requests
      }
    }
    
    return peak
  }

  private async getUniqueUsersForPeriod(timestamp: number, granularity: string): Promise<number> {
    // This is a simplified implementation - in practice, you'd track unique users per period
    return 0
  }

  private async getTopUsers(timeRange: { from: Date; to: Date }, limit: number): Promise<UserAnalytics[]> {
    // Implementation would aggregate user metrics and return top users
    return []
  }

  private async getTopEndpoints(timeRange: { from: Date; to: Date }, limit: number): Promise<EndpointAnalytics[]> {
    // Implementation would aggregate endpoint metrics and return top endpoints
    return []
  }

  private generateRecommendations(
    summary: RateLimitMetrics,
    anomalies: AnomalyDetection[],
    topUsers: UserAnalytics[],
    topEndpoints: EndpointAnalytics[]
  ): string[] {
    const recommendations: string[] = []

    // High error rate recommendations
    if (summary.errorRate > 0.1) {
      recommendations.push('High error rate detected. Consider reviewing rate limit configurations or user behavior patterns.')
    }

    // Anomaly-based recommendations
    if (anomalies.length > 0) {
      const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length
      if (criticalAnomalies > 0) {
        recommendations.push(`${criticalAnomalies} critical anomalies detected. Review security policies and consider temporary restrictions.`)
      }
    }

    // Usage pattern recommendations
    if (summary.averageRequestsPerUser > 1000) {
      recommendations.push('High average requests per user. Consider implementing tier-based rate limiting.')
    }

    if (topEndpoints.some(e => e.errorRate > 0.2)) {
      recommendations.push('Some endpoints have high error rates. Review endpoint-specific rate limits.')
    }

    return recommendations
  }

  private setupAnalyticsCollection(): void {
    // Setup periodic cleanup of old analytics data
    setInterval(async () => {
      await this.cleanupOldData()
    }, 60000 * 60 * 24) // Daily cleanup
  }

  private async cleanupOldData(): Promise<void> {
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000) // 30 days ago
    
    // Clean up old minute-level metrics (keep only 24 hours)
    const minuteCutoff = Date.now() - (24 * 60 * 60 * 1000)
    const minutePattern = `metrics:minute:*`
    const minuteKeys = await this.redis.keys(minutePattern)
    
    for (const key of minuteKeys) {
      const timestamp = parseInt(key.split(':')[2])
      if (timestamp < minuteCutoff) {
        await this.redis.del(key)
      }
    }

    // Clean up old anomaly data
    const anomalyPattern = `anomaly:*`
    const anomalyKeys = await this.redis.keys(anomalyPattern)
    
    for (const key of anomalyKeys) {
      const timestamp = parseInt(key.split(':')[1])
      if (timestamp < cutoffTime) {
        await this.redis.del(key)
      }
    }
  }
}