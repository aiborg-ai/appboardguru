/**
 * CSRF Protection Middleware
 * Comprehensive Cross-Site Request Forgery protection with token validation
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { logSecurityEvent } from '../audit'
import { env } from '@/config/environment'

export interface CSRFConfig {
  tokenName: string
  headerName: string
  cookieName: string
  tokenLength: number
  tokenLifetime: number // in milliseconds
  ignoredMethods: string[]
  ignoredPaths: string[]
  sameSitePolicy: 'strict' | 'lax' | 'none'
  secureOnly: boolean
  httpOnly: boolean
}

export interface CSRFToken {
  token: string
  hash: string
  created: number
  expires: number
  userId?: string
  sessionId?: string
}

/**
 * CSRF Protection implementation
 */
export class CSRFProtection {
  private config: CSRFConfig
  private tokenStore: Map<string, CSRFToken> = new Map()
  private readonly secretKey: string
  private cleanupInterval?: NodeJS.Timeout

  constructor(config?: Partial<CSRFConfig>) {
    this.config = {
      tokenName: 'csrf_token',
      headerName: 'x-csrf-token',
      cookieName: 'csrf_token',
      tokenLength: 32,
      tokenLifetime: 3600000, // 1 hour
      ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
      ignoredPaths: ['/api/health', '/api/docs'],
      sameSitePolicy: 'strict',
      secureOnly: true,
      httpOnly: true,
      ...config
    }

    this.secretKey = env.CSRF_SECRET_KEY || this.generateSecretKey()
    this.startCleanupProcess()
  }

  /**
   * Generate CSRF token for user session
   */
  generateToken(userId?: string, sessionId?: string): CSRFToken {
    const token = crypto.randomBytes(this.config.tokenLength).toString('hex')
    const hash = this.hashToken(token)
    const created = Date.now()
    const expires = created + this.config.tokenLifetime

    const csrfToken: CSRFToken = {
      token,
      hash,
      created,
      expires,
      userId,
      sessionId
    }

    this.tokenStore.set(hash, csrfToken)
    
    // Log token generation for audit trail
    logSecurityEvent('csrf_token_generated', {
      userId,
      sessionId,
      tokenHash: hash.substring(0, 8) + '...',
      expiresAt: new Date(expires).toISOString()
    }, 'low').catch(console.error)

    return csrfToken
  }

  /**
   * Validate CSRF token from request
   */
  async validateToken(request: NextRequest): Promise<{
    valid: boolean
    token?: CSRFToken
    error?: string
    riskScore: number
  }> {
    const method = request.method
    const pathname = request.nextUrl.pathname

    // Skip validation for ignored methods
    if (this.config.ignoredMethods.includes(method)) {
      return { valid: true, riskScore: 0 }
    }

    // Skip validation for ignored paths
    if (this.config.ignoredPaths.some(path => pathname.startsWith(path))) {
      return { valid: true, riskScore: 0 }
    }

    // Extract token from header or body
    const tokenFromHeader = request.headers.get(this.config.headerName)
    const tokenFromCookie = this.extractTokenFromCookie(request)
    
    const token = tokenFromHeader || tokenFromCookie

    if (!token) {
      await this.logCSRFViolation(request, 'missing_token')
      return {
        valid: false,
        error: 'CSRF token missing',
        riskScore: 80
      }
    }

    // Validate token
    const validation = this.validateTokenInternal(token)
    
    if (!validation.valid) {
      await this.logCSRFViolation(request, validation.error || 'invalid_token', {
        providedToken: token.substring(0, 8) + '...'
      })
      return {
        valid: false,
        error: validation.error,
        riskScore: validation.riskScore
      }
    }

    return validation
  }

  /**
   * Middleware function for Next.js
   */
  middleware() {
    return async (request: NextRequest): Promise<NextResponse | undefined> => {
      const validation = await this.validateToken(request)

      if (!validation.valid) {
        const response = NextResponse.json(
          {
            success: false,
            error: 'CSRF validation failed',
            code: 'CSRF_TOKEN_INVALID',
            timestamp: new Date().toISOString()
          },
          { status: 403 }
        )

        // Add security headers
        this.addSecurityHeaders(response)

        return response
      }

      // Token is valid, continue with request
      return undefined
    }
  }

  /**
   * Create response with CSRF token
   */
  createTokenResponse(userId?: string, sessionId?: string): NextResponse {
    const csrfToken = this.generateToken(userId, sessionId)
    
    const response = NextResponse.json({
      success: true,
      csrf_token: csrfToken.token
    })

    // Set CSRF token cookie
    response.cookies.set({
      name: this.config.cookieName,
      value: csrfToken.token,
      httpOnly: this.config.httpOnly,
      secure: this.config.secureOnly,
      sameSite: this.config.sameSitePolicy,
      maxAge: Math.floor(this.config.tokenLifetime / 1000),
      path: '/'
    })

    this.addSecurityHeaders(response)

    return response
  }

  /**
   * Refresh CSRF token
   */
  refreshToken(oldToken: string, userId?: string, sessionId?: string): CSRFToken | null {
    const hash = this.hashToken(oldToken)
    const existingToken = this.tokenStore.get(hash)

    if (!existingToken || this.isTokenExpired(existingToken)) {
      return null
    }

    // Remove old token
    this.tokenStore.delete(hash)

    // Generate new token
    return this.generateToken(userId, sessionId)
  }

  /**
   * Revoke CSRF token
   */
  revokeToken(token: string): boolean {
    const hash = this.hashToken(token)
    const existed = this.tokenStore.has(hash)
    
    if (existed) {
      this.tokenStore.delete(hash)
      
      logSecurityEvent('csrf_token_revoked', {
        tokenHash: hash.substring(0, 8) + '...',
        revokedAt: new Date().toISOString()
      }, 'low').catch(console.error)
    }

    return existed
  }

  /**
   * Internal token validation
   */
  private validateTokenInternal(token: string): {
    valid: boolean
    token?: CSRFToken
    error?: string
    riskScore: number
  } {
    // Check token format
    if (!token || typeof token !== 'string' || token.length !== this.config.tokenLength * 2) {
      return {
        valid: false,
        error: 'Invalid token format',
        riskScore: 90
      }
    }

    // Check if token exists
    const hash = this.hashToken(token)
    const storedToken = this.tokenStore.get(hash)

    if (!storedToken) {
      return {
        valid: false,
        error: 'Token not found',
        riskScore: 85
      }
    }

    // Check expiration
    if (this.isTokenExpired(storedToken)) {
      this.tokenStore.delete(hash)
      return {
        valid: false,
        error: 'Token expired',
        riskScore: 60
      }
    }

    // Token is valid
    return {
      valid: true,
      token: storedToken,
      riskScore: 0
    }
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(token)
      .digest('hex')
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: CSRFToken): boolean {
    return Date.now() > token.expires
  }

  /**
   * Extract token from cookie
   */
  private extractTokenFromCookie(request: NextRequest): string | null {
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) return null

    const cookies = cookieHeader.split(';').map(c => c.trim())
    const csrfCookie = cookies.find(c => c.startsWith(`${this.config.cookieName}=`))
    
    if (!csrfCookie) return null

    return csrfCookie.split('=')[1] || null
  }

  /**
   * Add security headers to response
   */
  private addSecurityHeaders(response: NextResponse): void {
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  }

  /**
   * Log CSRF violation
   */
  private async logCSRFViolation(
    request: NextRequest,
    violationType: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
              request.headers.get('x-real-ip') ||
              'unknown'

    await logSecurityEvent('csrf_violation', {
      violationType,
      method: request.method,
      pathname: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      ip,
      ...details
    }, 'high')
  }

  /**
   * Start cleanup process for expired tokens
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens()
    }, 300000) // Clean up every 5 minutes
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [hash, token] of this.tokenStore.entries()) {
      if (now > token.expires) {
        this.tokenStore.delete(hash)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired CSRF tokens`)
    }
  }

  /**
   * Generate secret key for token hashing
   */
  private generateSecretKey(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Stop cleanup process
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalTokens: number
    expiredTokens: number
    validTokens: number
    oldestToken: Date | null
    newestToken: Date | null
  } {
    const now = Date.now()
    let expiredCount = 0
    let validCount = 0
    let oldestTime = Number.MAX_SAFE_INTEGER
    let newestTime = 0

    for (const token of this.tokenStore.values()) {
      if (now > token.expires) {
        expiredCount++
      } else {
        validCount++
      }

      if (token.created < oldestTime) {
        oldestTime = token.created
      }
      if (token.created > newestTime) {
        newestTime = token.created
      }
    }

    return {
      totalTokens: this.tokenStore.size,
      expiredTokens: expiredCount,
      validTokens: validCount,
      oldestToken: oldestTime === Number.MAX_SAFE_INTEGER ? null : new Date(oldestTime),
      newestToken: newestTime === 0 ? null : new Date(newestTime)
    }
  }
}

// Export singleton instance
export const csrfProtection = new CSRFProtection()

/**
 * Convenience function to create CSRF middleware
 */
export function createCSRFMiddleware(config?: Partial<CSRFConfig>) {
  const protection = new CSRFProtection(config)
  return protection.middleware()
}

/**
 * Higher-order function to wrap API handlers with CSRF protection
 */
export function withCSRFProtection<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  config?: Partial<CSRFConfig>
) {
  const protection = new CSRFProtection(config)

  return async (...args: T): Promise<Response> => {
    const [request] = args as unknown as [NextRequest, ...any[]]
    
    const validation = await protection.validateToken(request)
    
    if (!validation.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'CSRF validation failed',
        code: 'CSRF_TOKEN_INVALID',
        timestamp: new Date().toISOString()
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        }
      })
    }
    
    return handler(...args)
  }
}