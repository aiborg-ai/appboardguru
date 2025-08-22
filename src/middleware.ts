/**
 * Next.js 15 Security Middleware
 * Provides comprehensive security features for request processing
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClientIP } from '@/lib/api-response'

/**
 * Rate limiting cache (in production, use Redis or similar)
 */
const rateLimitCache = new Map<string, { count: number; resetTime: number; blocked: boolean }>()
const ipBlockCache = new Map<string, { blockedUntil: number; reason: string }>()

/**
 * Security configuration
 */
const SECURITY_CONFIG = {
  rateLimit: {
    global: { requests: 1000, windowMs: 15 * 60 * 1000 }, // 1000 requests per 15 minutes
    api: { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute for API
    auth: { requests: 10, windowMs: 15 * 60 * 1000 }, // 10 auth requests per 15 minutes
    admin: { requests: 50, windowMs: 60 * 1000 }, // 50 admin requests per minute
    upload: { requests: 20, windowMs: 60 * 1000 }, // 20 uploads per minute
  },
  security: {
    maxRequestSize: 50 * 1024 * 1024, // 50MB max request size
    suspiciousUserAgents: [
      'sqlmap', 'nikto', 'nmap', 'masscan', 'zap', 'w3af', 'burp',
      'acunetix', 'nessus', 'openvas', 'skipfish', 'wpscan'
    ],
    blockedCountries: [], // Add country codes if geofencing needed
    trustedProxies: ['127.0.0.1', '::1'], // Trusted proxy IPs
  },
  headers: {
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'https://openrouter.ai', 'https://*.supabase.co'],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
    }
  }
}

/**
 * Get rate limit key for different contexts
 */
function getRateLimitKey(ip: string, context: string): string {
  return `${context}:${ip}`
}

/**
 * Check and update rate limit
 */
function checkRateLimit(ip: string, context: string): {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
} {
  const config = SECURITY_CONFIG.rateLimit[context as keyof typeof SECURITY_CONFIG.rateLimit] 
    || SECURITY_CONFIG.rateLimit.global
  
  const key = getRateLimitKey(ip, context)
  const now = Date.now()
  
  const existing = rateLimitCache.get(key)
  
  if (!existing || now >= existing.resetTime) {
    // New window or expired window
    const resetTime = now + config.windowMs
    rateLimitCache.set(key, { count: 1, resetTime, blocked: false })
    return { allowed: true, remaining: config.requests - 1, resetTime }
  }
  
  if (existing.blocked) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfter: Math.ceil((existing.resetTime - now) / 1000)
    }
  }
  
  existing.count++
  
  if (existing.count > config.requests) {
    existing.blocked = true
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfter: Math.ceil((existing.resetTime - now) / 1000)
    }
  }
  
  return {
    allowed: true,
    remaining: config.requests - existing.count,
    resetTime: existing.resetTime
  }
}

/**
 * Check if IP is blocked
 */
function isIPBlocked(ip: string): { blocked: boolean; reason?: string; unblockTime?: number } {
  const blocked = ipBlockCache.get(ip)
  if (!blocked) return { blocked: false }
  
  if (Date.now() >= blocked.blockedUntil) {
    ipBlockCache.delete(ip)
    return { blocked: false }
  }
  
  return {
    blocked: true,
    reason: blocked.reason,
    unblockTime: blocked.blockedUntil
  }
}

/**
 * Block IP address
 */
function blockIP(ip: string, durationMs: number, reason: string): void {
  ipBlockCache.set(ip, {
    blockedUntil: Date.now() + durationMs,
    reason
  })
}

/**
 * Detect suspicious user agent
 */
function isSuspiciousUserAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return SECURITY_CONFIG.security.suspiciousUserAgents.some(suspicious => 
    ua.includes(suspicious.toLowerCase())
  )
}

/**
 * Generate security headers
 */
function generateSecurityHeaders(): Record<string, string> {
  const cspPolicies = Object.entries(SECURITY_CONFIG.headers.csp)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ')

  return {
    // Content Security Policy
    'Content-Security-Policy': cspPolicies,
    
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
    
    // HSTS (only in production)
    ...(process.env['NODE_ENV'] === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    
    // Additional security headers
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  }
}

/**
 * Set CORS headers
 */
function setCorsHeaders(request: NextRequest, response: NextResponse): void {
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    process.env['NEXT_PUBLIC_APP_URL'],
    process.env['VERCEL_URL'] ? `https://${process.env['VERCEL_URL']}` : null,
    'http://localhost:3000', // Development
    'https://localhost:3000',
  ].filter(Boolean)

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Fingerprint, X-Requested-With')
  response.headers.set('Access-Control-Max-Age', '86400')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
}

/**
 * Log security event
 */
async function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<void> {
  // In production, this would send to your logging service
  console.log(`[SECURITY:${severity.toUpperCase()}] ${event}`, details)
  
  // For critical events, you might want to send alerts
  if (severity === 'critical') {
    // Send alert to monitoring service
    console.error(`CRITICAL SECURITY EVENT: ${event}`, details)
  }
}

/**
 * Extract organization context from request
 */
function extractOrganizationContext(request: NextRequest): {
  organizationId?: string
  organizationSlug?: string
} {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Extract from API routes like /api/organizations/[id]
  const apiOrgMatch = pathname.match(/^\/api\/organizations\/([^\/]+)/)
  if (apiOrgMatch && apiOrgMatch[1]) {
    return { organizationId: apiOrgMatch[1] }
  }
  
  // Extract from dashboard routes like /dashboard/[orgSlug]
  const dashboardOrgMatch = pathname.match(/^\/dashboard\/([^\/]+)/)
  if (dashboardOrgMatch && dashboardOrgMatch[1] && dashboardOrgMatch[1] !== 'settings') {
    return { organizationSlug: dashboardOrgMatch[1] }
  }
  
  // Extract from query parameters
  const orgId = url.searchParams.get('orgId') || url.searchParams.get('organizationId')
  const orgSlug = url.searchParams.get('orgSlug') || url.searchParams.get('organizationSlug')
  
  return {
    ...(orgId && { organizationId: orgId }),
    ...(orgSlug && { organizationSlug: orgSlug })
  }
}

/**
 * Get rate limit context based on request path
 */
function getRateLimitContext(pathname: string): string {
  if (pathname.startsWith('/api/auth/') || pathname.includes('signin') || pathname.includes('signup')) {
    return 'auth'
  }
  if (pathname.startsWith('/api/admin/') || pathname.includes('/admin/')) {
    return 'admin'
  }
  if (pathname.includes('upload') || pathname.includes('file')) {
    return 'upload'
  }
  if (pathname.startsWith('/api/')) {
    return 'api'
  }
  return 'global'
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Create response
  let response = NextResponse.next()
  
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    response = new NextResponse(null, { status: 200 })
    setCorsHeaders(request, response)
    return response
  }
  
  try {
    // 1. IP Blocking Check
    const ipBlockStatus = isIPBlocked(ip)
    if (ipBlockStatus.blocked) {
      await logSecurityEvent('blocked_ip_access_attempt', {
        ip,
        userAgent,
        pathname,
        reason: ipBlockStatus.reason,
        unblockTime: ipBlockStatus.unblockTime
      }, 'high')
      
      return new NextResponse('Access denied', {
        status: 403,
        headers: {
          'Retry-After': Math.ceil((ipBlockStatus.unblockTime! - Date.now()) / 1000).toString()
        }
      })
    }
    
    // 2. Suspicious User Agent Detection
    if (isSuspiciousUserAgent(userAgent)) {
      blockIP(ip, 24 * 60 * 60 * 1000, 'suspicious_user_agent') // 24 hour block
      
      await logSecurityEvent('suspicious_user_agent_blocked', {
        ip,
        userAgent,
        pathname
      }, 'critical')
      
      return new NextResponse('Access denied', { status: 403 })
    }
    
    // 3. Rate Limiting
    const rateLimitContext = getRateLimitContext(pathname)
    const rateLimit = checkRateLimit(ip, rateLimitContext)
    
    if (!rateLimit.allowed) {
      // Log rate limit exceeded
      await logSecurityEvent('rate_limit_exceeded', {
        ip,
        userAgent,
        pathname,
        context: rateLimitContext,
        retryAfter: rateLimit.retryAfter
      }, 'medium')
      
      // Block IP if excessive rate limiting violations
      const violationKey = `violations:${ip}`
      const existingViolations = rateLimitCache.get(violationKey)
      const violations = (existingViolations?.count || 0) + 1
      
      if (violations >= 5) {
        blockIP(ip, 60 * 60 * 1000, 'excessive_rate_limiting') // 1 hour block
        await logSecurityEvent('ip_blocked_excessive_rate_limiting', { ip, violations }, 'high')
      } else {
        rateLimitCache.set(violationKey, { 
          count: violations, 
          resetTime: Date.now() + 60 * 60 * 1000,
          blocked: false
        })
      }
      
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': rateLimit.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': SECURITY_CONFIG.rateLimit[rateLimitContext as keyof typeof SECURITY_CONFIG.rateLimit]?.requests.toString() || '1000',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString()
        }
      })
    }
    
    // 4. Request Size Validation
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.security.maxRequestSize) {
      await logSecurityEvent('request_too_large', {
        ip,
        userAgent,
        pathname,
        contentLength: parseInt(contentLength)
      }, 'medium')
      
      return new NextResponse('Request too large', { status: 413 })
    }
    
    // 5. Extract Organization Context
    const orgContext = extractOrganizationContext(request)
    
    // 6. Set Security Headers
    const securityHeaders = generateSecurityHeaders()
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    // 7. Set CORS Headers for API routes
    if (pathname.startsWith('/api/')) {
      setCorsHeaders(request, response)
    }
    
    // 8. Add Rate Limit Headers
    response.headers.set('X-RateLimit-Limit', SECURITY_CONFIG.rateLimit[rateLimitContext as keyof typeof SECURITY_CONFIG.rateLimit]?.requests.toString() || '1000')
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString())
    
    // 9. Add Organization Context Headers (for downstream middleware/API routes)
    if (orgContext.organizationId) {
      response.headers.set('X-Organization-ID', orgContext.organizationId)
    }
    if (orgContext.organizationSlug) {
      response.headers.set('X-Organization-Slug', orgContext.organizationSlug)
    }
    
    // 10. Add Request Tracking Headers
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
    response.headers.set('X-Request-ID', requestId)
    
    // 11. Performance Monitoring
    const processingTime = Date.now() - startTime
    response.headers.set('X-Response-Time', `${processingTime}ms`)
    
    // 12. Log Request (for audit purposes)
    if (pathname.startsWith('/api/') || pathname.includes('/admin/')) {
      await logSecurityEvent('api_request', {
        ip,
        userAgent,
        method: request.method,
        pathname,
        organizationContext: orgContext,
        processingTime,
        requestId
      }, 'low')
    }
    
    return response
    
  } catch (error) {
    // Log middleware error
    await logSecurityEvent('middleware_error', {
      ip,
      userAgent,
      pathname,
      error: error instanceof Error ? error.message : 'unknown error'
    }, 'high')
    
    console.error('Middleware error:', error)
    
    // Return response with basic security headers even on error
    const basicHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
    
    Object.entries(basicHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
}

/**
 * Configure middleware to run on specific paths - temporarily disabled
 */
export const config = {
  matcher: [
    // Temporarily disable middleware to debug the app
    // '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}

/**
 * Cleanup expired rate limits (call this periodically in production)
 */
export function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [key, value] of rateLimitCache.entries()) {
    if (now >= value.resetTime) {
      rateLimitCache.delete(key)
    }
  }
  
  for (const [key, value] of ipBlockCache.entries()) {
    if (now >= value.blockedUntil) {
      ipBlockCache.delete(key)
    }
  }
}

// Run cleanup every 5 minutes - disabled for edge runtime compatibility
// if (typeof setInterval !== 'undefined') {
//   setInterval(cleanupRateLimits, 5 * 60 * 1000)
// }