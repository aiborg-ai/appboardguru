/**
 * Security Headers Utility
 * Comprehensive security header management with CSP, CORS, and other security headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { env, isProduction } from '@/config/environment'

/**
 * Security header configuration
 */
export interface SecurityHeaderConfig {
  csp?: {
    'default-src'?: string[]
    'script-src'?: string[]
    'style-src'?: string[]
    'img-src'?: string[]
    'font-src'?: string[]
    'connect-src'?: string[]
    'frame-src'?: string[]
    'object-src'?: string[]
    'media-src'?: string[]
    'child-src'?: string[]
    'base-uri'?: string[]
    'form-action'?: string[]
    'upgrade-insecure-requests'?: boolean
    'block-all-mixed-content'?: boolean
  }
  hsts?: {
    maxAge: number
    includeSubDomains: boolean
    preload: boolean
  }
  cors?: {
    origin: string[] | string | boolean
    methods: string[]
    allowedHeaders: string[]
    credentials: boolean
    maxAge?: number
    optionsSuccessStatus?: number
  }
  customHeaders?: Record<string, string>
  removeHeaders?: string[]
}

/**
 * Default security configuration
 */
const DEFAULT_SECURITY_CONFIG: SecurityHeaderConfig = {
  csp: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'", // Required for Next.js
      "'unsafe-inline'", // Required for Next.js
      'https://openrouter.ai'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'" // Required for CSS-in-JS
    ],
    'img-src': [
      "'self'",
      'data:',
      'https:',
      'blob:'
    ],
    'font-src': [
      "'self'",
      'data:'
    ],
    'connect-src': [
      "'self'",
      'https://openrouter.ai',
      'https://*.supabase.co',
      'wss://*.supabase.co'
    ],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'media-src': ["'self'", 'data:', 'blob:'],
    'child-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': true,
    'block-all-mixed-content': true
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  cors: {
    origin: [
      env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'https://localhost:3000',
      ...(env.VERCEL_URL ? [`https://${env.VERCEL_URL}`] : [])
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Device-Fingerprint',
      'X-Organization-ID',
      'X-Request-ID',
      'Cache-Control'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  customHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-Powered-By': 'BoardGuru'
  }
}

/**
 * Environment-specific security configurations
 */
const ENVIRONMENT_CONFIGS = {
  development: {
    csp: {
      ...DEFAULT_SECURITY_CONFIG.csp,
      'script-src': [
        "'self'",
        "'unsafe-eval'",
        "'unsafe-inline'",
        'localhost:3000',
        '127.0.0.1:3000'
      ],
      'connect-src': [
        ...DEFAULT_SECURITY_CONFIG.csp!['connect-src']!,
        'localhost:*',
        '127.0.0.1:*',
        'ws://localhost:*',
        'wss://localhost:*'
      ]
    },
    cors: {
      ...DEFAULT_SECURITY_CONFIG.cors,
      origin: ['http://localhost:3000', 'https://localhost:3000']
    }
  },
  production: DEFAULT_SECURITY_CONFIG,
  test: {
    ...DEFAULT_SECURITY_CONFIG,
    hsts: undefined // Disable HSTS in test environment
  }
}

/**
 * Get environment-specific security configuration
 */
function getSecurityConfig(): SecurityHeaderConfig {
  const envConfig = ENVIRONMENT_CONFIGS[env.NODE_ENV as keyof typeof ENVIRONMENT_CONFIGS]
  return (envConfig || DEFAULT_SECURITY_CONFIG) as SecurityHeaderConfig
}

/**
 * Generate Content Security Policy header value
 */
function generateCSPHeader(csp: NonNullable<SecurityHeaderConfig['csp']>): string {
  const policies: string[] = []

  // Add directive policies
  Object.entries(csp).forEach(([directive, value]) => {
    if (directive === 'upgrade-insecure-requests' && value === true) {
      policies.push('upgrade-insecure-requests')
    } else if (directive === 'block-all-mixed-content' && value === true) {
      policies.push('block-all-mixed-content')
    } else if (Array.isArray(value)) {
      policies.push(`${directive} ${value.join(' ')}`)
    }
  })

  return policies.join('; ')
}

/**
 * Generate HSTS header value
 */
function generateHSTSHeader(hsts: NonNullable<SecurityHeaderConfig['hsts']>): string {
  let header = `max-age=${hsts.maxAge}`
  
  if (hsts.includeSubDomains) {
    header += '; includeSubDomains'
  }
  
  if (hsts.preload) {
    header += '; preload'
  }
  
  return header
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[] | string | boolean): boolean {
  if (!origin) return false
  
  if (allowedOrigins === true) return true
  if (allowedOrigins === false) return false
  
  if (typeof allowedOrigins === 'string') {
    return allowedOrigins === origin || allowedOrigins === '*'
  }
  
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.includes(origin) || allowedOrigins.includes('*')
  }
  
  return false
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  config?: Partial<SecurityHeaderConfig>
): NextResponse {
  const securityConfig = { ...getSecurityConfig(), ...config }

  // Content Security Policy
  if (securityConfig.csp) {
    const cspHeader = generateCSPHeader(securityConfig.csp)
    if (cspHeader) {
      response.headers.set('Content-Security-Policy', cspHeader)
      // Also set report-only version for monitoring in development
      if (!isProduction()) {
        response.headers.set('Content-Security-Policy-Report-Only', cspHeader)
      }
    }
  }

  // HSTS (only in production)
  if (isProduction() && securityConfig.hsts) {
    const hstsHeader = generateHSTSHeader(securityConfig.hsts)
    response.headers.set('Strict-Transport-Security', hstsHeader)
  }

  // Custom security headers
  if (securityConfig.customHeaders) {
    Object.entries(securityConfig.customHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }

  // Remove headers
  if (securityConfig.removeHeaders) {
    securityConfig.removeHeaders.forEach(header => {
      response.headers.delete(header)
    })
  }

  // Add security-related headers
  response.headers.set('X-Security-Headers-Applied', 'true')
  response.headers.set('X-Security-Version', '1.0.0')

  return response
}

/**
 * Apply CORS headers to response
 */
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse,
  config?: Partial<SecurityHeaderConfig['cors']>
): NextResponse {
  const corsConfig = { ...getSecurityConfig().cors!, ...config }
  const origin = request.headers.get('origin')

  // Check if origin is allowed
  if (origin && isOriginAllowed(origin, corsConfig.origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Vary', 'Origin')
  } else if (corsConfig.origin === true) {
    response.headers.set('Access-Control-Allow-Origin', '*')
  }

  // Set other CORS headers
  response.headers.set('Access-Control-Allow-Methods', corsConfig.methods.join(', '))
  response.headers.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '))
  
  if (corsConfig.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  if (corsConfig.maxAge) {
    response.headers.set('Access-Control-Max-Age', corsConfig.maxAge.toString())
  }

  return response
}

/**
 * Handle CORS preflight requests
 */
export function handlePreflightRequest(
  request: NextRequest,
  config?: Partial<SecurityHeaderConfig['cors']>
): NextResponse {
  const corsConfig = { ...getSecurityConfig().cors!, ...config }
  const origin = request.headers.get('origin')

  // Create preflight response
  const response = new NextResponse(null, {
    status: corsConfig.optionsSuccessStatus || 204,
    headers: {
      'Content-Length': '0'
    }
  })

  // Apply CORS headers
  applyCorsHeaders(request, response, corsConfig)

  // Add security headers to preflight response
  applySecurityHeaders(response, { cors: corsConfig })

  return response
}

/**
 * Create security headers for API responses
 */
export function createApiSecurityHeaders(request?: NextRequest): Record<string, string> {
  const config = getSecurityConfig()
  const headers: Record<string, string> = {}

  // Basic security headers
  if (config.customHeaders) {
    Object.assign(headers, config.customHeaders)
  }

  // CORS headers for API
  if (request) {
    const origin = request.headers.get('origin')
    if (origin && config.cors && isOriginAllowed(origin, config.cors.origin)) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Vary'] = 'Origin'
    }
  }

  // Cache control for API responses
  headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate'
  headers['Pragma'] = 'no-cache'
  headers['Expires'] = '0'

  return headers
}

/**
 * Security header validator
 */
export class SecurityHeaderValidator {
  /**
   * Validate CSP header
   */
  static validateCSP(csp: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!csp || csp.trim().length === 0) {
      errors.push('CSP header is empty')
      return { valid: false, errors }
    }

    // Check for unsafe inline/eval in production
    if (isProduction()) {
      if (csp.includes("'unsafe-inline'") && !csp.includes('script-src')) {
        errors.push("Unsafe inline styles detected in production")
      }
      
      if (csp.includes("'unsafe-eval'")) {
        errors.push("Unsafe eval detected in production - consider using strict CSP")
      }
    }

    // Check for missing important directives
    const requiredDirectives = ['default-src', 'script-src', 'object-src']
    requiredDirectives.forEach(directive => {
      if (!csp.includes(directive)) {
        errors.push(`Missing required CSP directive: ${directive}`)
      }
    })

    return { valid: errors.length === 0, errors }
  }

  /**
   * Validate security headers completeness
   */
  static validateSecurityHeaders(headers: Record<string, string>): {
    valid: boolean
    errors: string[]
    warnings: string[]
    score: number
  } {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 0

    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Referrer-Policy'
    ]

    const recommendedHeaders = [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'Permissions-Policy'
    ]

    // Check required headers
    requiredHeaders.forEach(header => {
      if (headers[header]) {
        score += 10
      } else {
        errors.push(`Missing required security header: ${header}`)
      }
    })

    // Check recommended headers
    recommendedHeaders.forEach(header => {
      if (headers[header]) {
        score += 15
      } else {
        warnings.push(`Missing recommended security header: ${header}`)
      }
    })

    // Validate specific header values
    if (headers['X-Frame-Options'] && !['DENY', 'SAMEORIGIN'].includes(headers['X-Frame-Options'])) {
      warnings.push('X-Frame-Options should be DENY or SAMEORIGIN')
    }

    if (headers['X-Content-Type-Options'] !== 'nosniff') {
      warnings.push('X-Content-Type-Options should be nosniff')
    }

    // Validate CSP if present
    if (headers['Content-Security-Policy']) {
      const cspValidation = this.validateCSP(headers['Content-Security-Policy'])
      if (!cspValidation.valid) {
        warnings.push(...cspValidation.errors)
      } else {
        score += 20 // Bonus for valid CSP
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score
    }
  }
}

/**
 * Middleware for applying security headers
 */
export function withSecurityHeaders(
  config?: Partial<SecurityHeaderConfig>
) {
  return function securityHeadersMiddleware(
    request: NextRequest,
    response: NextResponse
  ): NextResponse {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handlePreflightRequest(request, config?.cors)
    }

    // Apply security headers
    applySecurityHeaders(response, config)

    // Apply CORS headers for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      applyCorsHeaders(request, response, config?.cors)
    }

    return response
  }
}

/**
 * Get security headers for specific use cases
 */
export const SecurityHeaders = {
  /**
   * Get headers for API endpoints
   */
  api: (request?: NextRequest) => createApiSecurityHeaders(request),

  /**
   * Get headers for file uploads
   */
  upload: () => ({
    ...createApiSecurityHeaders(),
    'Content-Security-Policy': "default-src 'self'; object-src 'none'",
    'X-Upload-Security': 'enabled'
  }),

  /**
   * Get headers for admin endpoints
   */
  admin: (request?: NextRequest) => ({
    ...createApiSecurityHeaders(request),
    'X-Admin-Security': 'enabled',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
  }),

  /**
   * Get headers for authentication endpoints
   */
  auth: () => ({
    ...createApiSecurityHeaders(),
    'X-Auth-Security': 'enabled',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Clear-Site-Data': '"cache", "cookies", "storage"'
  }),

  /**
   * Get headers for webhook endpoints
   */
  webhook: () => ({
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store'
  })
}

/**
 * Security header report generator
 */
export function generateSecurityReport(): {
  configuration: SecurityHeaderConfig
  validation: ReturnType<typeof SecurityHeaderValidator.validateSecurityHeaders>
  recommendations: string[]
} {
  const config = getSecurityConfig()
  const headers = config.customHeaders || {}
  
  if (config.csp) {
    headers['Content-Security-Policy'] = generateCSPHeader(config.csp)
  }
  
  if (config.hsts && isProduction()) {
    headers['Strict-Transport-Security'] = generateHSTSHeader(config.hsts)
  }

  const validation = SecurityHeaderValidator.validateSecurityHeaders(headers)
  
  const recommendations: string[] = []
  
  if (validation.score < 80) {
    recommendations.push('Consider implementing all recommended security headers')
  }
  
  if (!config.csp) {
    recommendations.push('Implement Content Security Policy for better XSS protection')
  }
  
  if (!config.hsts && isProduction()) {
    recommendations.push('Enable HSTS in production for better transport security')
  }

  return {
    configuration: config,
    validation,
    recommendations
  }
}