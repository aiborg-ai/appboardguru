/**
 * SQL Injection Protection Middleware
 * Advanced SQL injection detection and prevention with query validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { logSecurityEvent } from '../audit'

export interface SQLInjectionConfig {
  enabled: boolean
  blockSuspiciousQueries: boolean
  logViolations: boolean
  maxQueryComplexity: number
  allowedPatterns: RegExp[]
  forbiddenPatterns: RegExp[]
  strictMode: boolean
  sanitizeInputs: boolean
  validateParameters: boolean
}

export interface SQLInjectionViolation {
  type: 'union_injection' | 'boolean_injection' | 'time_based' | 'error_based' | 'blind_injection' | 'stacked_queries' | 'command_injection'
  pattern: string
  field: string
  value: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  blocked: boolean
  suggestion?: string
}

export interface QueryAnalysis {
  safe: boolean
  violations: SQLInjectionViolation[]
  riskScore: number
  complexity: number
  sanitizedQuery?: string
}

/**
 * SQL Injection Protection implementation
 */
export class SQLInjectionProtection {
  private config: SQLInjectionConfig

  // Common SQL injection patterns
  private static readonly INJECTION_PATTERNS = [
    // Union-based injections
    {
      pattern: /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/gi,
      type: 'union_injection' as const,
      severity: 'critical' as const,
      confidence: 0.9
    },
    
    // Boolean-based blind injections
    {
      pattern: /(\b(and|or)\b\s+\d+\s*[=<>!]+\s*\d+)|(\b(and|or)\b\s+['"]\w+['"]?\s*[=<>!]+\s*['"]\w+['"]?)/gi,
      type: 'boolean_injection' as const,
      severity: 'high' as const,
      confidence: 0.8
    },
    
    // Time-based blind injections
    {
      pattern: /\b(sleep|waitfor|delay|benchmark|pg_sleep)\s*\(/gi,
      type: 'time_based' as const,
      severity: 'critical' as const,
      confidence: 0.95
    },
    
    // Error-based injections
    {
      pattern: /\b(extractvalue|updatexml|exp|cast|convert)\s*\(/gi,
      type: 'error_based' as const,
      severity: 'high' as const,
      confidence: 0.85
    },
    
    // Common SQL keywords that shouldn't appear in user input
    {
      pattern: /\b(drop|truncate|delete|alter|create|insert|update)\s+(table|database|schema|view|index|procedure|function)/gi,
      type: 'stacked_queries' as const,
      severity: 'critical' as const,
      confidence: 0.9
    },
    
    // Information schema queries
    {
      pattern: /\b(information_schema|sys\.|mysql\.|pg_|sqlite_master)/gi,
      type: 'blind_injection' as const,
      severity: 'high' as const,
      confidence: 0.8
    },
    
    // Comment-based injections
    {
      pattern: /(\bor\b|\band\b)\s+\d+\s*[=<>!]+\s*\d+\s*(--|#|\/\*)/gi,
      type: 'boolean_injection' as const,
      severity: 'high' as const,
      confidence: 0.85
    },
    
    // Hex/ASCII conversions
    {
      pattern: /\b(char|ascii|hex|unhex|ord|conv)\s*\(/gi,
      type: 'blind_injection' as const,
      severity: 'medium' as const,
      confidence: 0.7
    },
    
    // String concatenation functions
    {
      pattern: /\b(concat|group_concat|string_agg)\s*\(/gi,
      type: 'union_injection' as const,
      severity: 'medium' as const,
      confidence: 0.6
    },
    
    // Version disclosure attempts
    {
      pattern: /\b(@@version|version\(\)|@@global|@@session)/gi,
      type: 'blind_injection' as const,
      severity: 'medium' as const,
      confidence: 0.75
    },
    
    // File operations
    {
      pattern: /\b(load_file|into\s+outfile|into\s+dumpfile|bulk\s+insert)/gi,
      type: 'command_injection' as const,
      severity: 'critical' as const,
      confidence: 0.9
    },
    
    // Stored procedure calls
    {
      pattern: /\b(exec|execute|sp_|xp_)\s*\(/gi,
      type: 'command_injection' as const,
      severity: 'high' as const,
      confidence: 0.8
    },
    
    // Semicolon injection (stacked queries)
    {
      pattern: /;\s*(drop|delete|insert|update|create|alter|truncate|grant|revoke)/gi,
      type: 'stacked_queries' as const,
      severity: 'critical' as const,
      confidence: 0.95
    },
    
    // Quote manipulation
    {
      pattern: /['"](\s*(or|and)\s+['"]?\w+['"]?\s*[=<>!]+\s*['"]?\w+['"]?|;\s*\w+)/gi,
      type: 'boolean_injection' as const,
      severity: 'high' as const,
      confidence: 0.7
    },
    
    // Common blind injection patterns
    {
      pattern: /\b(and|or)\s+\d+\s*[=<>!]+\s*\d+(\s*--|#|\/\*)?/gi,
      type: 'boolean_injection' as const,
      severity: 'high' as const,
      confidence: 0.8
    },
    
    // Function calls that shouldn't appear in user input
    {
      pattern: /\b(count|sum|avg|min|max|group_by|order_by|having|limit|offset)\s*\(/gi,
      type: 'union_injection' as const,
      severity: 'medium' as const,
      confidence: 0.6
    },
    
    // Database-specific functions
    {
      pattern: /\b(substring|substr|mid|left|right|length|len)\s*\(/gi,
      type: 'blind_injection' as const,
      severity: 'medium' as const,
      confidence: 0.65
    }
  ]

  // Suspicious character sequences
  private static readonly SUSPICIOUS_SEQUENCES = [
    // Multiple quotes
    /'{2,}|"{2,}/g,
    
    // Quote combinations
    /['"].*['"].*['"]|['"][^'"]*['"][^'"]*['"]/g,
    
    // SQL comments
    /-{2,}|\/\*.*?\*\/|#/g,
    
    // Parentheses manipulation
    /\)\s*(and|or|union)\s*\(/gi,
    
    // Multiple operators
    /[=<>!]{2,}|[\+\-\*\/]{2,}/g,
    
    // Suspicious numeric patterns
    /\b\d+\s*[=<>!]+\s*\d+\s*[=<>!]+\s*\d+/g
  ]

  constructor(config?: Partial<SQLInjectionConfig>) {
    this.config = {
      enabled: true,
      blockSuspiciousQueries: true,
      logViolations: true,
      maxQueryComplexity: 100,
      allowedPatterns: [],
      forbiddenPatterns: SQLInjectionProtection.INJECTION_PATTERNS.map(p => p.pattern),
      strictMode: true,
      sanitizeInputs: true,
      validateParameters: true,
      ...config
    }
  }

  /**
   * Analyze request for SQL injection patterns
   */
  async analyzeRequest(request: NextRequest): Promise<QueryAnalysis> {
    const violations: SQLInjectionViolation[] = []
    let complexity = 0

    if (!this.config.enabled) {
      return { safe: true, violations, riskScore: 0, complexity }
    }

    // Analyze URL parameters
    const url = new URL(request.url)
    for (const [key, value] of url.searchParams.entries()) {
      const analysis = this.analyzeValue(value, `query.${key}`)
      violations.push(...analysis.violations)
      complexity += analysis.complexity
    }

    // Analyze headers
    for (const [name, value] of request.headers.entries()) {
      // Skip safe headers
      if (this.isSafeHeader(name)) continue
      
      const analysis = this.analyzeValue(value, `header.${name}`)
      violations.push(...analysis.violations)
      complexity += analysis.complexity
    }

    // Analyze request body
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const body = await this.getRequestBody(request)
        if (body) {
          const analysis = this.analyzeObject(body, 'body')
          violations.push(...analysis.violations)
          complexity += analysis.complexity
        }
      } catch (error) {
        console.warn('Could not analyze request body for SQL injection:', error)
      }
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(violations, complexity)

    // Log violations if configured
    if (this.config.logViolations && violations.length > 0) {
      await this.logSQLInjectionViolations(request, violations)
    }

    // Determine if request is safe
    const safe = !this.config.blockSuspiciousQueries || 
                 violations.length === 0 || 
                 !violations.some(v => v.severity === 'high' || v.severity === 'critical') ||
                 complexity <= this.config.maxQueryComplexity

    return { safe, violations, riskScore, complexity }
  }

  /**
   * Sanitize query parameters
   */
  sanitizeQuery(query: string): string {
    if (!this.config.sanitizeInputs) {
      return query
    }

    let sanitized = query

    // Remove SQL comments
    sanitized = sanitized.replace(/-{2,}.*$/gm, '')
    sanitized = sanitized.replace(/\/\*.*?\*\//g, '')
    sanitized = sanitized.replace(/#.*$/gm, '')

    // Escape single quotes
    sanitized = sanitized.replace(/'/g, "''")

    // Remove suspicious patterns
    for (const pattern of SQLInjectionProtection.INJECTION_PATTERNS) {
      if (pattern.severity === 'critical') {
        sanitized = sanitized.replace(pattern.pattern, '')
      }
    }

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim()

    return sanitized
  }

  /**
   * Validate query parameters
   */
  validateParameters(params: Record<string, any>): {
    valid: boolean
    violations: SQLInjectionViolation[]
    sanitizedParams: Record<string, any>
  } {
    const violations: SQLInjectionViolation[] = []
    const sanitizedParams: Record<string, any> = {}

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        const analysis = this.analyzeValue(value, key)
        violations.push(...analysis.violations)
        
        if (this.config.sanitizeInputs) {
          sanitizedParams[key] = this.sanitizeQuery(value)
        } else {
          sanitizedParams[key] = value
        }
      } else {
        sanitizedParams[key] = value
      }
    }

    const valid = !this.config.validateParameters || 
                  violations.length === 0 || 
                  !violations.some(v => v.severity === 'high' || v.severity === 'critical')

    return { valid, violations, sanitizedParams }
  }

  /**
   * Create SQL injection protection middleware
   */
  middleware() {
    return async (request: NextRequest): Promise<NextResponse | undefined> => {
      const analysis = await this.analyzeRequest(request)

      if (!analysis.safe) {
        const response = NextResponse.json({
          success: false,
          error: 'Request blocked due to potential SQL injection attack',
          code: 'SQL_INJECTION_DETECTED',
          violations: analysis.violations.map(v => ({
            type: v.type,
            field: v.field,
            severity: v.severity
          })),
          riskScore: analysis.riskScore,
          timestamp: new Date().toISOString()
        }, { status: 400 })

        // Add security headers
        this.addSecurityHeaders(response)

        return response
      }

      return undefined
    }
  }

  /**
   * Analyze object recursively for SQL injection patterns
   */
  private analyzeObject(obj: any, context: string): {
    violations: SQLInjectionViolation[]
    complexity: number
  } {
    const violations: SQLInjectionViolation[] = []
    let complexity = 0

    if (obj === null || obj === undefined) {
      return { violations, complexity }
    }

    if (typeof obj === 'string') {
      const analysis = this.analyzeValue(obj, context)
      violations.push(...analysis.violations)
      complexity += analysis.complexity
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const analysis = this.analyzeObject(item, `${context}[${index}]`)
        violations.push(...analysis.violations)
        complexity += analysis.complexity
      })
    } else if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        const keyAnalysis = this.analyzeValue(key, `${context}.key`)
        const valueAnalysis = this.analyzeObject(value, `${context}.${key}`)
        violations.push(...keyAnalysis.violations)
        violations.push(...valueAnalysis.violations)
        complexity += keyAnalysis.complexity + valueAnalysis.complexity
      })
    }

    return { violations, complexity }
  }

  /**
   * Analyze individual value for SQL injection patterns
   */
  private analyzeValue(value: string, field: string): {
    violations: SQLInjectionViolation[]
    complexity: number
  } {
    const violations: SQLInjectionViolation[] = []
    let complexity = 0

    if (!value || typeof value !== 'string') {
      return { violations, complexity }
    }

    // Basic complexity calculation
    complexity = value.length + (value.match(/[(){}[\]]/g) || []).length * 2

    // Check against injection patterns
    for (const injectionPattern of SQLInjectionProtection.INJECTION_PATTERNS) {
      const matches = value.match(injectionPattern.pattern)
      if (matches) {
        violations.push({
          type: injectionPattern.type,
          pattern: injectionPattern.pattern.toString(),
          field,
          value: matches[0],
          severity: injectionPattern.severity,
          confidence: injectionPattern.confidence,
          blocked: this.config.blockSuspiciousQueries,
          suggestion: this.getSuggestion(injectionPattern.type)
        })
        
        complexity += 20 // Increase complexity for suspicious patterns
      }
    }

    // Check suspicious character sequences
    for (const sequence of SQLInjectionProtection.SUSPICIOUS_SEQUENCES) {
      const matches = value.match(sequence)
      if (matches) {
        violations.push({
          type: 'boolean_injection',
          pattern: sequence.toString(),
          field,
          value: matches[0],
          severity: 'medium',
          confidence: 0.6,
          blocked: this.config.blockSuspiciousQueries,
          suggestion: 'Remove suspicious character sequences'
        })
        
        complexity += 10
      }
    }

    // Additional heuristics for strict mode
    if (this.config.strictMode) {
      // Check for excessive special characters
      const specialChars = (value.match(/['"`;\\(){}[\]<>=!-]/g) || []).length
      if (specialChars > value.length * 0.3) {
        violations.push({
          type: 'boolean_injection',
          pattern: 'excessive_special_characters',
          field,
          value: value.substring(0, 50) + '...',
          severity: 'low',
          confidence: 0.4,
          blocked: false,
          suggestion: 'Reduce special character usage'
        })
        
        complexity += specialChars
      }

      // Check for SQL keywords in unexpected contexts
      const sqlKeywords = /\b(select|insert|update|delete|drop|create|alter|grant|revoke|union|where|having|group|order|limit|offset|join|inner|outer|left|right|exists|not|null|like|between|in|any|all|some)\b/gi
      const keywordMatches = value.match(sqlKeywords)
      if (keywordMatches && keywordMatches.length > 2) {
        violations.push({
          type: 'union_injection',
          pattern: 'multiple_sql_keywords',
          field,
          value: keywordMatches.join(', '),
          severity: 'medium',
          confidence: 0.5,
          blocked: this.config.blockSuspiciousQueries,
          suggestion: 'Avoid using multiple SQL keywords in user input'
        })
        
        complexity += keywordMatches.length * 5
      }
    }

    return { violations, complexity }
  }

  /**
   * Calculate risk score based on violations and complexity
   */
  private calculateRiskScore(violations: SQLInjectionViolation[], complexity: number): number {
    let score = 0

    // Score based on violations
    for (const violation of violations) {
      const baseScore = (() => {
        switch (violation.severity) {
          case 'critical': return 40
          case 'high': return 25
          case 'medium': return 15
          case 'low': return 5
          default: return 0
        }
      })()
      
      score += baseScore * violation.confidence
    }

    // Score based on complexity
    if (complexity > this.config.maxQueryComplexity) {
      score += Math.min((complexity - this.config.maxQueryComplexity) / 10, 20)
    }

    return Math.min(score, 100)
  }

  /**
   * Get suggestion for violation type
   */
  private getSuggestion(type: SQLInjectionViolation['type']): string {
    switch (type) {
      case 'union_injection':
        return 'Use parameterized queries instead of string concatenation'
      case 'boolean_injection':
        return 'Validate and sanitize boolean conditions'
      case 'time_based':
        return 'Remove time-based functions from user input'
      case 'error_based':
        return 'Implement proper error handling without exposing database errors'
      case 'blind_injection':
        return 'Use prepared statements and input validation'
      case 'stacked_queries':
        return 'Disable multiple statement execution'
      case 'command_injection':
        return 'Remove system commands and file operations'
      default:
        return 'Use parameterized queries and input validation'
    }
  }

  /**
   * Check if header is safe to analyze
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
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  }

  /**
   * Log SQL injection violations
   */
  private async logSQLInjectionViolations(
    request: NextRequest,
    violations: SQLInjectionViolation[]
  ): Promise<void> {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
              request.headers.get('x-real-ip') ||
              'unknown'

    for (const violation of violations) {
      await logSecurityEvent('sql_injection_attempt', {
        violationType: violation.type,
        pattern: violation.pattern,
        field: violation.field,
        value: violation.value.substring(0, 200),
        severity: violation.severity,
        confidence: violation.confidence,
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
export const sqlInjectionProtection = new SQLInjectionProtection()

/**
 * Convenience function to create SQL injection middleware
 */
export function createSQLInjectionMiddleware(config?: Partial<SQLInjectionConfig>) {
  const protection = new SQLInjectionProtection(config)
  return protection.middleware()
}

/**
 * Higher-order function to wrap API handlers with SQL injection protection
 */
export function withSQLInjectionProtection<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  config?: Partial<SQLInjectionConfig>
) {
  const protection = new SQLInjectionProtection(config)

  return async (...args: T): Promise<Response> => {
    const [request] = args as unknown as [NextRequest, ...any[]]
    
    const analysis = await protection.analyzeRequest(request)
    
    if (!analysis.safe) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Request blocked due to potential SQL injection attack',
        code: 'SQL_INJECTION_DETECTED',
        riskScore: analysis.riskScore,
        timestamp: new Date().toISOString()
      }), {
        status: 400,
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

/**
 * Utility function to sanitize SQL query
 */
export function sanitizeSQLQuery(query: string): string {
  return sqlInjectionProtection.sanitizeQuery(query)
}

/**
 * Utility function to validate query parameters
 */
export function validateQueryParameters(params: Record<string, any>): {
  valid: boolean
  violations: SQLInjectionViolation[]
  sanitizedParams: Record<string, any>
} {
  return sqlInjectionProtection.validateParameters(params)
}