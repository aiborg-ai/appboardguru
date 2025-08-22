/**
 * XSS Protection Middleware
 * Comprehensive Cross-Site Scripting prevention with content sanitization
 */

import { NextRequest, NextResponse } from 'next/server'
import DOMPurify from 'isomorphic-dompurify'
import { logSecurityEvent } from '../audit'

export interface XSSConfig {
  enabled: boolean
  sanitizeInputs: boolean
  sanitizeOutputs: boolean
  blockSuspiciousRequests: boolean
  allowedTags: string[]
  allowedAttributes: Record<string, string[]>
  forbiddenPatterns: RegExp[]
  maxInputLength: number
  logViolations: boolean
  blockOnViolation: boolean
  contentSecurityPolicy: string
}

export interface XSSViolation {
  type: 'suspicious_pattern' | 'script_injection' | 'html_injection' | 'attribute_injection'
  pattern: string
  field: string
  value: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  blocked: boolean
}

export interface SanitizationResult {
  sanitized: any
  violations: XSSViolation[]
  wasSanitized: boolean
  originalValue?: any
}

/**
 * XSS Protection implementation
 */
export class XSSProtection {
  private config: XSSConfig

  // Common XSS patterns
  private static readonly SUSPICIOUS_PATTERNS = [
    // Script tags
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<script[\s\S]*?>/gi,
    
    // JavaScript URLs
    /javascript:/gi,
    /vbscript:/gi,
    /livescript:/gi,
    /mocha:/gi,
    
    // Event handlers
    /on\w+\s*=/gi,
    
    // Data URLs with scripts
    /data:text\/html/gi,
    /data:application\/javascript/gi,
    
    // Meta refresh redirects
    /<meta[\s\S]*?http-equiv[\s\S]*?refresh/gi,
    
    // Object/embed tags
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /<applet[\s\S]*?>/gi,
    
    // Form tags
    /<form[\s\S]*?>/gi,
    
    // Link tags with suspicious content
    /<link[\s\S]*?href[\s\S]*?javascript:/gi,
    
    // Style tags with expressions
    /<style[\s\S]*?>[\s\S]*?expression[\s\S]*?<\/style>/gi,
    
    // Common XSS vectors
    /alert\s*\(/gi,
    /confirm\s*\(/gi,
    /prompt\s*\(/gi,
    /document\.cookie/gi,
    /document\.write/gi,
    /window\.location/gi,
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    
    // SQL injection patterns (overlapping with XSS)
    /union[\s\S]*?select/gi,
    /drop[\s\S]*?table/gi,
    /insert[\s\S]*?into/gi,
    /update[\s\S]*?set/gi,
    /delete[\s\S]*?from/gi,
    
    // Command injection
    /;[\s]*?(rm|del|format|shutdown|reboot)/gi,
    
    // Path traversal
    /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/gi,
    
    // Null bytes
    /%00/gi,
    /\x00/gi
  ]

  // Encoding patterns to catch encoded attacks
  private static readonly ENCODED_PATTERNS = [
    /%3c%73%63%72%69%70%74/gi, // <script
    /%3c%2f%73%63%72%69%70%74/gi, // </script
    /&#x3c;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;/gi, // <script in hex entities
    /&lt;script/gi,
    /&lt;\/script/gi
  ]

  constructor(config?: Partial<XSSConfig>) {
    this.config = {
      enabled: true,
      sanitizeInputs: true,
      sanitizeOutputs: true,
      blockSuspiciousRequests: true,
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
      allowedAttributes: {
        'a': ['href', 'title'],
        '*': ['class', 'id']
      },
      forbiddenPatterns: XSSProtection.SUSPICIOUS_PATTERNS,
      maxInputLength: 100000,
      logViolations: true,
      blockOnViolation: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'",
      ...config
    }
  }

  /**
   * Scan request for XSS patterns
   */
  async scanRequest(request: NextRequest): Promise<{
    safe: boolean
    violations: XSSViolation[]
    riskScore: number
  }> {
    const violations: XSSViolation[] = []
    let riskScore = 0

    if (!this.config.enabled) {
      return { safe: true, violations, riskScore }
    }

    // Scan URL parameters
    const url = new URL(request.url)
    for (const [key, value] of url.searchParams.entries()) {
      const result = this.scanValue(value, `query.${key}`)
      violations.push(...result.violations)
    }

    // Scan headers
    for (const [name, value] of request.headers.entries()) {
      // Skip common safe headers
      if (this.isSafeHeader(name)) continue
      
      const result = this.scanValue(value, `header.${name}`)
      violations.push(...result.violations)
    }

    // Scan request body if present
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const body = await this.getRequestBody(request)
        if (body) {
          const result = this.scanObject(body, 'body')
          violations.push(...result.violations)
        }
      } catch (error) {
        // If we can't read the body, it might be binary or already consumed
        console.warn('Could not scan request body for XSS:', error)
      }
    }

    // Calculate risk score
    riskScore = this.calculateRiskScore(violations)

    // Log violations if configured
    if (this.config.logViolations && violations.length > 0) {
      await this.logXSSViolations(request, violations)
    }

    const safe = !this.config.blockOnViolation || violations.length === 0 || 
                 !violations.some(v => v.severity === 'high' || v.severity === 'critical')

    return { safe, violations, riskScore }
  }

  /**
   * Sanitize input data
   */
  sanitizeInput(data: any): SanitizationResult {
    if (!this.config.sanitizeInputs) {
      return {
        sanitized: data,
        violations: [],
        wasSanitized: false
      }
    }

    return this.sanitizeValue(data, 'input')
  }

  /**
   * Sanitize output data
   */
  sanitizeOutput(data: any): SanitizationResult {
    if (!this.config.sanitizeOutputs) {
      return {
        sanitized: data,
        violations: [],
        wasSanitized: false
      }
    }

    return this.sanitizeValue(data, 'output')
  }

  /**
   * Create XSS protection middleware
   */
  middleware() {
    return async (request: NextRequest): Promise<NextResponse | undefined> => {
      const scanResult = await this.scanRequest(request)

      if (!scanResult.safe) {
        const response = NextResponse.json({
          success: false,
          error: 'Request blocked due to potential XSS attack',
          code: 'XSS_DETECTED',
          violations: scanResult.violations.map(v => ({
            type: v.type,
            field: v.field,
            severity: v.severity
          })),
          timestamp: new Date().toISOString()
        }, { status: 400 })

        // Add security headers
        this.addSecurityHeaders(response)

        return response
      }

      // Request is safe, continue processing
      return undefined
    }
  }

  /**
   * Sanitize arbitrary value recursively
   */
  private sanitizeValue(data: any, context: string): SanitizationResult {
    const violations: XSSViolation[] = []
    let wasSanitized = false
    const originalValue = data

    if (data === null || data === undefined) {
      return { sanitized: data, violations, wasSanitized }
    }

    if (typeof data === 'string') {
      const scanResult = this.scanValue(data, context)
      violations.push(...scanResult.violations)

      if (scanResult.violations.length > 0) {
        // Sanitize the string
        let sanitized = this.sanitizeString(data)
        wasSanitized = sanitized !== data
        
        return {
          sanitized,
          violations,
          wasSanitized,
          originalValue
        }
      }

      return { sanitized: data, violations, wasSanitized }
    }

    if (Array.isArray(data)) {
      const sanitizedArray: any[] = []
      
      for (let i = 0; i < data.length; i++) {
        const result = this.sanitizeValue(data[i], `${context}[${i}]`)
        sanitizedArray.push(result.sanitized)
        violations.push(...result.violations)
        if (result.wasSanitized) wasSanitized = true
      }

      return {
        sanitized: sanitizedArray,
        violations,
        wasSanitized,
        originalValue: wasSanitized ? originalValue : undefined
      }
    }

    if (typeof data === 'object') {
      const sanitizedObject: any = {}
      
      for (const [key, value] of Object.entries(data)) {
        // Sanitize key as well
        const keyResult = this.sanitizeValue(key, `${context}.key`)
        const valueResult = this.sanitizeValue(value, `${context}.${key}`)
        
        sanitizedObject[keyResult.sanitized] = valueResult.sanitized
        violations.push(...keyResult.violations)
        violations.push(...valueResult.violations)
        
        if (keyResult.wasSanitized || valueResult.wasSanitized) {
          wasSanitized = true
        }
      }

      return {
        sanitized: sanitizedObject,
        violations,
        wasSanitized,
        originalValue: wasSanitized ? originalValue : undefined
      }
    }

    // For other types (number, boolean, etc.), return as-is
    return { sanitized: data, violations, wasSanitized }
  }

  /**
   * Scan object recursively for XSS patterns
   */
  private scanObject(obj: any, context: string): { violations: XSSViolation[] } {
    const violations: XSSViolation[] = []

    if (obj === null || obj === undefined) {
      return { violations }
    }

    if (typeof obj === 'string') {
      const result = this.scanValue(obj, context)
      violations.push(...result.violations)
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const result = this.scanObject(item, `${context}[${index}]`)
        violations.push(...result.violations)
      })
    } else if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        // Scan both key and value
        const keyResult = this.scanValue(key, `${context}.key`)
        const valueResult = this.scanObject(value, `${context}.${key}`)
        violations.push(...keyResult.violations)
        violations.push(...valueResult.violations)
      })
    }

    return { violations }
  }

  /**
   * Scan individual value for XSS patterns
   */
  private scanValue(value: string, field: string): { violations: XSSViolation[] } {
    const violations: XSSViolation[] = []

    if (!value || typeof value !== 'string') {
      return { violations }
    }

    // Check input length
    if (value.length > this.config.maxInputLength) {
      violations.push({
        type: 'suspicious_pattern',
        pattern: 'excessive_length',
        field,
        value: value.substring(0, 100) + '...',
        severity: 'medium',
        blocked: this.config.blockOnViolation
      })
    }

    // Check against suspicious patterns
    for (const pattern of this.config.forbiddenPatterns) {
      const matches = value.match(pattern)
      if (matches) {
        violations.push({
          type: this.categorizePattern(pattern),
          pattern: pattern.toString(),
          field,
          value: matches[0],
          severity: this.getSeverityForPattern(pattern),
          blocked: this.config.blockOnViolation
        })
      }
    }

    // Check against encoded patterns
    for (const pattern of XSSProtection.ENCODED_PATTERNS) {
      const matches = value.match(pattern)
      if (matches) {
        violations.push({
          type: 'script_injection',
          pattern: pattern.toString(),
          field,
          value: matches[0],
          severity: 'high',
          blocked: this.config.blockOnViolation
        })
      }
    }

    return { violations }
  }

  /**
   * Sanitize string using DOMPurify
   */
  private sanitizeString(value: string): string {
    try {
      return DOMPurify.sanitize(value, {
        ALLOWED_TAGS: this.config.allowedTags,
        ALLOWED_ATTR: Object.values(this.config.allowedAttributes).flat(),
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false
      })
    } catch (error) {
      console.error('DOMPurify sanitization failed:', error)
      // Fallback: basic HTML encoding
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
    }
  }

  /**
   * Categorize pattern type
   */
  private categorizePattern(pattern: RegExp): XSSViolation['type'] {
    const patternStr = pattern.toString().toLowerCase()
    
    if (patternStr.includes('script') || patternStr.includes('javascript')) {
      return 'script_injection'
    }
    if (patternStr.includes('on\\w+') || patternStr.includes('event')) {
      return 'attribute_injection'
    }
    if (patternStr.includes('<') || patternStr.includes('tag')) {
      return 'html_injection'
    }
    
    return 'suspicious_pattern'
  }

  /**
   * Get severity for pattern
   */
  private getSeverityForPattern(pattern: RegExp): XSSViolation['severity'] {
    const patternStr = pattern.toString().toLowerCase()
    
    // Critical patterns
    if (patternStr.includes('script') || patternStr.includes('eval') || 
        patternStr.includes('document.cookie') || patternStr.includes('document.write')) {
      return 'critical'
    }
    
    // High severity patterns
    if (patternStr.includes('on\\w+') || patternStr.includes('javascript:') ||
        patternStr.includes('alert') || patternStr.includes('confirm')) {
      return 'high'
    }
    
    // Medium severity patterns
    if (patternStr.includes('<') || patternStr.includes('meta') ||
        patternStr.includes('object') || patternStr.includes('embed')) {
      return 'medium'
    }
    
    return 'low'
  }

  /**
   * Calculate risk score based on violations
   */
  private calculateRiskScore(violations: XSSViolation[]): number {
    let score = 0
    
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical': score += 40; break
        case 'high': score += 25; break
        case 'medium': score += 15; break
        case 'low': score += 5; break
      }
    }
    
    return Math.min(score, 100)
  }

  /**
   * Check if header is generally safe to scan
   */
  private isSafeHeader(name: string): boolean {
    const safeHeaders = [
      'accept',
      'accept-encoding',
      'accept-language',
      'cache-control',
      'connection',
      'content-length',
      'content-type',
      'host',
      'pragma',
      'upgrade-insecure-requests'
    ]
    
    return safeHeaders.includes(name.toLowerCase())
  }

  /**
   * Get request body safely
   */
  private async getRequestBody(request: NextRequest): Promise<any> {
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      try {
        return await request.json()
      } catch {
        return null
      }
    }
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await request.formData()
        const obj: any = {}
        for (const [key, value] of formData.entries()) {
          obj[key] = value
        }
        return obj
      } catch {
        return null
      }
    }
    
    if (contentType.includes('text/')) {
      try {
        return await request.text()
      } catch {
        return null
      }
    }
    
    return null
  }

  /**
   * Add security headers to response
   */
  private addSecurityHeaders(response: NextResponse): void {
    response.headers.set('Content-Security-Policy', this.config.contentSecurityPolicy)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  }

  /**
   * Log XSS violations
   */
  private async logXSSViolations(request: NextRequest, violations: XSSViolation[]): Promise<void> {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
              request.headers.get('x-real-ip') ||
              'unknown'

    for (const violation of violations) {
      await logSecurityEvent('xss_violation', {
        violationType: violation.type,
        pattern: violation.pattern,
        field: violation.field,
        value: violation.value.substring(0, 200), // Limit logged value length
        severity: violation.severity,
        blocked: violation.blocked,
        method: request.method,
        pathname: request.nextUrl.pathname,
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        ip
      }, violation.severity === 'critical' ? 'critical' : 'high')
    }
  }
}

// Export singleton instance
export const xssProtection = new XSSProtection()

/**
 * Convenience function to create XSS middleware
 */
export function createXSSMiddleware(config?: Partial<XSSConfig>) {
  const protection = new XSSProtection(config)
  return protection.middleware()
}

/**
 * Higher-order function to wrap API handlers with XSS protection
 */
export function withXSSProtection<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  config?: Partial<XSSConfig>
) {
  const protection = new XSSProtection(config)

  return async (...args: T): Promise<Response> => {
    const [request] = args as unknown as [NextRequest, ...any[]]
    
    const scanResult = await protection.scanRequest(request)
    
    if (!scanResult.safe) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Request blocked due to potential XSS attack',
        code: 'XSS_DETECTED',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Content-Security-Policy': protection['config'].contentSecurityPolicy,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        }
      })
    }
    
    return handler(...args)
  }
}

/**
 * Utility function to sanitize user input
 */
export function sanitizeUserInput(input: any): any {
  return xssProtection.sanitizeInput(input).sanitized
}

/**
 * Utility function to sanitize output data
 */
export function sanitizeOutput(output: any): any {
  return xssProtection.sanitizeOutput(output).sanitized
}