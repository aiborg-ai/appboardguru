/**
 * Security Enforcer - Advanced Security Policy Enforcement
 * Provides DDoS protection, IP filtering, rate limiting, and security policies
 */

import { NextRequest } from 'next/server'
import { Result, Ok, Err } from '../../result'

export interface SecurityConfig {
  enableTLS: boolean
  enableMTLS: boolean
  corsPolicy: {
    origins: string[]
    methods: string[]
    headers: string[]
    credentials: boolean
  }
  rateLimitTiers: Record<string, {
    requests: number
    windowMs: number
    burstLimit: number
  }>
  ipWhitelist: string[]
  ipBlacklist: string[]
  enableDDoSProtection: boolean
}

export interface SecurityCheckResult {
  allowed: boolean
  reason?: string
  tier?: string
  rateLimitInfo?: {
    remaining: number
    resetTime: number
    retryAfter?: number
  }
}

export interface DDoSMetrics {
  requestsPerSecond: number
  uniqueIPs: number
  suspiciousPatterns: number
  blockedRequests: number
}

export class SecurityEnforcer {
  private requestCounts: Map<string, { count: number; firstRequest: number; blocked: boolean }> = new Map()
  private ipReputationCache: Map<string, { reputation: number; lastUpdate: number }> = new Map()
  private ddosMetrics: DDoSMetrics = {
    requestsPerSecond: 0,
    uniqueIPs: 0,
    suspiciousPatterns: 0,
    blockedRequests: 0
  }
  private config: SecurityConfig
  private cleanupInterval: NodeJS.Timeout

  constructor(config: SecurityConfig) {
    this.config = config
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData()
    }, 60000) // Cleanup every minute
    
    if (config.enableDDoSProtection) {
      this.startDDoSMonitoring()
    }
  }

  /**
   * Enforce security policies for incoming request
   */
  async enforceRequest(request: NextRequest): Promise<SecurityCheckResult> {
    const clientIP = this.extractClientIP(request)
    
    try {
      // 1. IP Blacklist check
      if (this.isIPBlacklisted(clientIP)) {
        await this.recordBlockedRequest(clientIP, 'blacklisted')
        return {
          allowed: false,
          reason: 'IP address is blacklisted'
        }
      }
      
      // 2. IP Whitelist check (if configured)
      if (this.config.ipWhitelist.length > 0 && !this.isIPWhitelisted(clientIP)) {
        await this.recordBlockedRequest(clientIP, 'not_whitelisted')
        return {
          allowed: false,
          reason: 'IP address is not whitelisted'
        }
      }
      
      // 3. DDoS protection
      if (this.config.enableDDoSProtection) {
        const ddosCheck = await this.checkDDoSProtection(request, clientIP)
        if (!ddosCheck.allowed) {
          return ddosCheck
        }
      }
      
      // 4. Rate limiting (basic - tier-specific limits would be applied at gateway level)
      const rateLimitCheck = await this.checkBasicRateLimit(clientIP)
      if (!rateLimitCheck.allowed) {
        return rateLimitCheck
      }
      
      // 5. Request pattern analysis
      const patternCheck = await this.analyzeRequestPattern(request, clientIP)
      if (!patternCheck.allowed) {
        return patternCheck
      }
      
      // 6. TLS/HTTPS enforcement
      if (this.config.enableTLS && !this.isHTTPS(request)) {
        return {
          allowed: false,
          reason: 'HTTPS required'
        }
      }
      
      return { allowed: true }
      
    } catch (error) {
      console.error('Security enforcement error:', error)
      // Fail secure - deny if security check fails
      return {
        allowed: false,
        reason: 'Security check failed'
      }
    }
  }

  /**
   * Check CORS policy
   */
  checkCORSPolicy(origin: string, method: string, headers: string[]): {
    allowed: boolean
    allowedOrigin?: string
    allowedMethods?: string[]
    allowedHeaders?: string[]
    allowCredentials?: boolean
  } {
    const corsPolicy = this.config.corsPolicy
    
    // Check origin
    let allowedOrigin: string | undefined
    if (corsPolicy.origins.includes('*')) {
      allowedOrigin = '*'
    } else if (corsPolicy.origins.includes(origin)) {
      allowedOrigin = origin
    } else {
      // Check for wildcard patterns
      const wildcardMatch = corsPolicy.origins.find(allowed => {
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*')
          return new RegExp(`^${pattern}$`).test(origin)
        }
        return false
      })
      if (wildcardMatch) {
        allowedOrigin = origin
      }
    }
    
    if (!allowedOrigin) {
      return { allowed: false }
    }
    
    // Check method
    const allowedMethods = corsPolicy.methods
    if (!allowedMethods.includes(method.toUpperCase()) && method !== 'OPTIONS') {
      return { allowed: false }
    }
    
    // Check headers
    const allowedHeaders = corsPolicy.headers.map(h => h.toLowerCase())
    const requestHeaders = headers.map(h => h.toLowerCase())
    const hasDisallowedHeaders = requestHeaders.some(header => 
      !allowedHeaders.includes(header) && 
      !this.isSimpleHeader(header)
    )
    
    if (hasDisallowedHeaders) {
      return { allowed: false }
    }
    
    return {
      allowed: true,
      allowedOrigin,
      allowedMethods,
      allowedHeaders: corsPolicy.headers,
      allowCredentials: corsPolicy.credentials
    }
  }

  /**
   * Validate API key
   */
  async validateAPIKey(apiKey: string): Promise<{
    valid: boolean
    tier?: string
    scopes?: string[]
    userId?: string
    rateLimitTier?: string
    error?: string
  }> {
    try {
      // In a real implementation, this would validate against a database/cache
      if (!apiKey || apiKey.length < 32) {
        return {
          valid: false,
          error: 'Invalid API key format'
        }
      }
      
      // Mock validation - in production, this would be a database lookup
      if (apiKey.startsWith('ak_test_')) {
        return {
          valid: true,
          tier: 'free',
          scopes: ['read'],
          userId: 'test-user',
          rateLimitTier: 'free'
        }
      } else if (apiKey.startsWith('ak_prod_')) {
        return {
          valid: true,
          tier: 'pro',
          scopes: ['read', 'write'],
          userId: 'prod-user',
          rateLimitTier: 'pro'
        }
      } else if (apiKey.startsWith('ak_ent_')) {
        return {
          valid: true,
          tier: 'enterprise',
          scopes: ['read', 'write', 'admin'],
          userId: 'enterprise-user',
          rateLimitTier: 'enterprise'
        }
      }
      
      return {
        valid: false,
        error: 'API key not found'
      }
      
    } catch (error) {
      return {
        valid: false,
        error: 'API key validation failed'
      }
    }
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): {
    ddos: DDoSMetrics
    blockedIPs: number
    rateLimitHits: number
    totalRequests: number
    threatLevel: 'low' | 'medium' | 'high'
  } {
    const blockedIPs = Array.from(this.requestCounts.values()).filter(data => data.blocked).length
    const rateLimitHits = Array.from(this.requestCounts.values()).reduce((sum, data) => sum + data.count, 0)
    const totalRequests = rateLimitHits
    
    // Calculate threat level based on metrics
    let threatLevel: 'low' | 'medium' | 'high' = 'low'
    if (this.ddosMetrics.blockedRequests > 100 || blockedIPs > 50) {
      threatLevel = 'high'
    } else if (this.ddosMetrics.blockedRequests > 20 || blockedIPs > 10) {
      threatLevel = 'medium'
    }
    
    return {
      ddos: { ...this.ddosMetrics },
      blockedIPs,
      rateLimitHits,
      totalRequests,
      threatLevel
    }
  }

  /**
   * Add IP to blacklist
   */
  blacklistIP(ip: string, reason: string): void {
    if (!this.config.ipBlacklist.includes(ip)) {
      this.config.ipBlacklist.push(ip)
      console.warn(`IP ${ip} blacklisted: ${reason}`)
    }
  }

  /**
   * Remove IP from blacklist
   */
  unblacklistIP(ip: string): void {
    const index = this.config.ipBlacklist.indexOf(ip)
    if (index > -1) {
      this.config.ipBlacklist.splice(index, 1)
      console.info(`IP ${ip} removed from blacklist`)
    }
  }

  /**
   * Get IP reputation
   */
  getIPReputation(ip: string): number {
    const cached = this.ipReputationCache.get(ip)
    if (cached && Date.now() - cached.lastUpdate < 3600000) { // 1 hour cache
      return cached.reputation
    }
    
    // Calculate reputation based on request patterns
    const requestData = this.requestCounts.get(ip)
    if (!requestData) {
      return 100 // New IP starts with good reputation
    }
    
    let reputation = 100
    
    // Reduce reputation for high request rates
    if (requestData.count > 1000) {
      reputation -= 30
    } else if (requestData.count > 100) {
      reputation -= 10
    }
    
    // Reduce reputation if blocked
    if (requestData.blocked) {
      reputation -= 50
    }
    
    reputation = Math.max(0, Math.min(100, reputation))
    
    this.ipReputationCache.set(ip, {
      reputation,
      lastUpdate: Date.now()
    })
    
    return reputation
  }

  private isIPBlacklisted(ip: string): boolean {
    return this.config.ipBlacklist.includes(ip) || 
           this.config.ipBlacklist.some(blocked => this.matchIPPattern(ip, blocked))
  }

  private isIPWhitelisted(ip: string): boolean {
    if (this.config.ipWhitelist.length === 0) return true
    
    return this.config.ipWhitelist.includes(ip) ||
           this.config.ipWhitelist.some(allowed => this.matchIPPattern(ip, allowed))
  }

  private matchIPPattern(ip: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '\\d+') + '$')
      return regex.test(ip)
    }
    if (pattern.includes('/')) {
      // CIDR notation - simplified check
      const [network, bits] = pattern.split('/')
      // In production, use proper CIDR matching
      return ip.startsWith(network.split('.').slice(0, Math.ceil(parseInt(bits) / 8)).join('.'))
    }
    return ip === pattern
  }

  private async checkDDoSProtection(request: NextRequest, clientIP: string): Promise<SecurityCheckResult> {
    const now = Date.now()
    const windowSize = 60000 // 1 minute window
    
    // Track requests per IP
    const requestData = this.requestCounts.get(clientIP) || { count: 0, firstRequest: now, blocked: false }
    
    // Reset counter if window expired
    if (now - requestData.firstRequest > windowSize) {
      requestData.count = 0
      requestData.firstRequest = now
      requestData.blocked = false
    }
    
    requestData.count++
    this.requestCounts.set(clientIP, requestData)
    
    // DDoS detection thresholds
    const requestThreshold = 100 // requests per minute
    const burstThreshold = 20 // requests per 10 seconds
    
    if (requestData.count > requestThreshold) {
      requestData.blocked = true
      this.ddosMetrics.blockedRequests++
      
      // Auto-blacklist for severe abuse
      if (requestData.count > requestThreshold * 3) {
        this.blacklistIP(clientIP, 'DDoS attack detected')
      }
      
      return {
        allowed: false,
        reason: 'DDoS protection triggered',
        rateLimitInfo: {
          remaining: 0,
          resetTime: requestData.firstRequest + windowSize,
          retryAfter: Math.ceil((requestData.firstRequest + windowSize - now) / 1000)
        }
      }
    }
    
    // Check for burst patterns
    const recentWindow = 10000 // 10 seconds
    if (now - requestData.firstRequest < recentWindow && requestData.count > burstThreshold) {
      this.ddosMetrics.suspiciousPatterns++
      
      return {
        allowed: false,
        reason: 'Request burst detected',
        rateLimitInfo: {
          remaining: 0,
          resetTime: requestData.firstRequest + recentWindow,
          retryAfter: Math.ceil((requestData.firstRequest + recentWindow - now) / 1000)
        }
      }
    }
    
    return { allowed: true }
  }

  private async checkBasicRateLimit(clientIP: string): Promise<SecurityCheckResult> {
    // Basic rate limiting - more sophisticated rate limiting would be handled by the gateway
    const basicLimit = 1000 // requests per minute
    const windowSize = 60000
    const now = Date.now()
    
    const requestData = this.requestCounts.get(clientIP)
    if (!requestData) {
      return { allowed: true }
    }
    
    if (now - requestData.firstRequest < windowSize && requestData.count > basicLimit) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        rateLimitInfo: {
          remaining: 0,
          resetTime: requestData.firstRequest + windowSize
        }
      }
    }
    
    return { allowed: true }
  }

  private async analyzeRequestPattern(request: NextRequest, clientIP: string): Promise<SecurityCheckResult> {
    const userAgent = request.headers.get('user-agent') || ''
    const url = new URL(request.url)
    
    // Check for suspicious user agents
    const suspiciousUserAgents = [
      'bot', 'crawler', 'spider', 'scanner', 'curl', 'wget', 'python-requests',
      'go-http-client', 'okhttp', 'apache-httpclient'
    ]
    
    if (suspiciousUserAgents.some(pattern => userAgent.toLowerCase().includes(pattern))) {
      const reputation = this.getIPReputation(clientIP)
      if (reputation < 50) { // Low reputation + suspicious user agent
        this.ddosMetrics.suspiciousPatterns++
        return {
          allowed: false,
          reason: 'Suspicious request pattern detected'
        }
      }
    }
    
    // Check for suspicious paths
    const suspiciousPaths = [
      '/admin', '/.env', '/config', '/.git', '/wp-admin', '/phpmyadmin',
      '/sql', '/backup', '/debug', '/test', '/.well-known'
    ]
    
    if (suspiciousPaths.some(path => url.pathname.includes(path))) {
      this.ddosMetrics.suspiciousPatterns++
      
      // Reduce IP reputation
      const currentReputation = this.getIPReputation(clientIP)
      this.ipReputationCache.set(clientIP, {
        reputation: Math.max(0, currentReputation - 10),
        lastUpdate: Date.now()
      })
      
      return {
        allowed: false,
        reason: 'Suspicious path access attempt'
      }
    }
    
    // Check for SQL injection patterns in query parameters
    const sqlInjectionPatterns = [
      'union select', 'drop table', 'delete from', 'insert into',
      '1=1', '1\'=\'1', 'or 1=1', 'and 1=1', '\' or \'', '" or "'
    ]
    
    const queryString = url.search.toLowerCase()
    if (sqlInjectionPatterns.some(pattern => queryString.includes(pattern))) {
      this.ddosMetrics.suspiciousPatterns++
      this.blacklistIP(clientIP, 'SQL injection attempt')
      
      return {
        allowed: false,
        reason: 'SQL injection attempt detected'
      }
    }
    
    return { allowed: true }
  }

  private isHTTPS(request: NextRequest): boolean {
    return request.url.startsWith('https://') ||
           request.headers.get('x-forwarded-proto') === 'https' ||
           request.headers.get('x-forwarded-ssl') === 'on'
  }

  private isSimpleHeader(header: string): boolean {
    const simpleHeaders = [
      'accept', 'accept-language', 'content-language', 'content-type',
      'cache-control', 'expires', 'last-modified', 'pragma'
    ]
    return simpleHeaders.includes(header.toLowerCase())
  }

  private extractClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           request.headers.get('x-client-ip') ||
           'unknown'
  }

  private async recordBlockedRequest(clientIP: string, reason: string): Promise<void> {
    this.ddosMetrics.blockedRequests++
    
    // Update request data to mark as blocked
    const requestData = this.requestCounts.get(clientIP) || { count: 0, firstRequest: Date.now(), blocked: false }
    requestData.blocked = true
    requestData.count++
    this.requestCounts.set(clientIP, requestData)
    
    console.warn(`Blocked request from ${clientIP}: ${reason}`)
  }

  private startDDoSMonitoring(): void {
    setInterval(() => {
      this.updateDDoSMetrics()
    }, 10000) // Update every 10 seconds
  }

  private updateDDoSMetrics(): void {
    const now = Date.now()
    const uniqueIPs = new Set()
    let totalRequests = 0
    
    this.requestCounts.forEach((data, ip) => {
      if (now - data.firstRequest < 60000) { // Within last minute
        uniqueIPs.add(ip)
        totalRequests += data.count
      }
    })
    
    this.ddosMetrics.requestsPerSecond = totalRequests / 60
    this.ddosMetrics.uniqueIPs = uniqueIPs.size
  }

  private cleanupOldData(): void {
    const now = Date.now()
    const maxAge = 3600000 // 1 hour
    
    // Cleanup old request data
    for (const [ip, data] of this.requestCounts.entries()) {
      if (now - data.firstRequest > maxAge && !data.blocked) {
        this.requestCounts.delete(ip)
      }
    }
    
    // Cleanup old reputation data
    for (const [ip, data] of this.ipReputationCache.entries()) {
      if (now - data.lastUpdate > maxAge * 24) { // 24 hours
        this.ipReputationCache.delete(ip)
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.requestCounts.clear()
    this.ipReputationCache.clear()
    
    console.log('Security enforcer destroyed')
  }
}