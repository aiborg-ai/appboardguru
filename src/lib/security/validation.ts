/**
 * Input Validation and Sanitization
 * Comprehensive security validation using Zod schemas and sanitization utilities
 */

import { z } from 'zod'
import validator from 'validator'
import DOMPurify from 'isomorphic-dompurify'
import { logSecurityEvent } from './audit'

/**
 * Common validation patterns
 */
const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9-]+$/,
  phoneNumber: /^\+?[1-9]\d{1,14}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
}

/**
 * Common Zod schema builders
 */
export const CommonSchemas = {
  id: z.string().uuid('Invalid ID format'),
  
  email: z.string()
    .email('Invalid email address')
    .min(5, 'Email too short')
    .max(254, 'Email too long')
    .transform(email => email.toLowerCase().trim()),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(ValidationPatterns.strongPassword, 'Password must contain uppercase, lowercase, number and special character'),
  
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')
    .transform(name => name.trim()),
  
  slug: z.string()
    .min(2, 'Slug too short')
    .max(50, 'Slug too long')
    .regex(ValidationPatterns.slug, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .transform(slug => slug.toLowerCase().trim()),
  
  url: z.string()
    .url('Invalid URL format')
    .max(2048, 'URL too long')
    .optional(),
  
  phoneNumber: z.string()
    .regex(ValidationPatterns.phoneNumber, 'Invalid phone number format')
    .optional(),
  
  text: (maxLength = 1000) => z.string()
    .max(maxLength, `Text too long (max ${maxLength} characters)`)
    .optional(),
  
  description: z.string()
    .max(2000, 'Description too long')
    .optional(),
  
  tags: z.array(z.string().min(1).max(50))
    .max(20, 'Too many tags')
    .optional(),
  
  ipAddress: z.string()
    .regex(ValidationPatterns.ipAddress, 'Invalid IP address'),
  
  userAgent: z.string()
    .max(500, 'User agent too long'),
  
  organizationSize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  
  userRole: z.enum(['pending', 'director', 'admin', 'viewer']),
  
  organizationRole: z.enum(['owner', 'admin', 'member', 'viewer']),
  
  fileSize: z.number()
    .min(1, 'File cannot be empty')
    .max(100 * 1024 * 1024, 'File too large (max 100MB)'),
  
  contentType: z.string()
    .refine(type => [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ].includes(type), 'Unsupported file type')
}

/**
 * API Input validation schemas
 */
export const ApiSchemas = {
  // User registration
  registration: z.object({
    fullName: CommonSchemas.name,
    email: CommonSchemas.email,
    company: z.string()
      .min(1, 'Company name is required')
      .max(200, 'Company name too long')
      .regex(/^[a-zA-Z\s\-'\.&]+$/, 'Company name contains invalid characters')
      .transform(name => name.trim()),
    position: z.string()
      .min(1, 'Position is required')
      .max(100, 'Position too long')
      .regex(/^[a-zA-Z\s\-'\.]+$/, 'Position contains invalid characters')
      .transform(name => name.trim()),
    message: CommonSchemas.text(1000)
  }),

  // User authentication
  signIn: z.object({
    email: CommonSchemas.email,
    password: z.string().min(1, 'Password required')
  }),

  // Password reset
  passwordReset: z.object({
    email: CommonSchemas.email
  }),

  // Set new password
  setPassword: z.object({
    token: z.string().min(10, 'Invalid token'),
    password: CommonSchemas.password,
    confirmPassword: z.string()
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }),

  // Organization creation
  createOrganization: z.object({
    name: z.string()
      .min(1, 'Organization name is required')
      .max(200, 'Organization name too long')
      .regex(/^[a-zA-Z\s\-'\.&]+$/, 'Organization name contains invalid characters')
      .transform(name => name.trim()),
    slug: CommonSchemas.slug,
    description: CommonSchemas.description,
    website: CommonSchemas.url,
    industry: CommonSchemas.text(100),
    organizationSize: CommonSchemas.organizationSize,
    createdBy: CommonSchemas.id
  }),

  // Organization update
  updateOrganization: z.object({
    organizationId: CommonSchemas.id,
    userId: CommonSchemas.id,
    name: z.string()
      .min(1, 'Organization name is required')
      .max(200, 'Organization name too long')
      .regex(/^[a-zA-Z\s\-'\.&]+$/, 'Organization name contains invalid characters')
      .transform(name => name.trim())
      .optional(),
    description: CommonSchemas.description.optional(),
    website: CommonSchemas.url.optional(),
    industry: CommonSchemas.text(100).optional(),
    organizationSize: CommonSchemas.organizationSize.optional(),
    logoUrl: CommonSchemas.url.optional()
  }),

  // Invitation
  createInvitation: z.object({
    organizationId: CommonSchemas.id,
    email: CommonSchemas.email,
    role: CommonSchemas.organizationRole,
    personalMessage: CommonSchemas.text(500).optional(),
    invitedBy: CommonSchemas.id
  }),

  // Accept invitation
  acceptInvitation: z.object({
    token: z.string().min(10, 'Invalid invitation token'),
    verificationCode: z.string().length(6, 'Invalid verification code')
  }),

  // File upload
  fileUpload: z.object({
    fileName: z.string()
      .min(1, 'File name required')
      .max(255, 'File name too long')
      .regex(/^[^<>:"/\\|?*]+$/, 'Invalid file name characters'),
    fileSize: CommonSchemas.fileSize,
    contentType: CommonSchemas.contentType,
    organizationId: CommonSchemas.id.optional()
  }),

  // AI chat
  aiChat: z.object({
    message: z.string()
      .min(1, 'Message required')
      .max(5000, 'Message too long'),
    organizationId: CommonSchemas.id.optional(),
    scope: z.enum(['organization', 'global']).optional()
  }),

  // Security report
  securityReport: z.object({
    eventType: z.enum(['suspicious_activity', 'data_breach', 'unauthorized_access', 'malware', 'other']),
    description: z.string()
      .min(10, 'Description too short')
      .max(2000, 'Description too long'),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    additionalInfo: z.record(z.string(), z.unknown()).optional()
  }),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().min(1, 'Invalid page number').default(1),
    limit: z.coerce.number().min(1, 'Invalid limit').max(100, 'Limit too high').default(20),
    sortBy: z.string().max(50, 'Sort field too long').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),

  // Search
  search: z.object({
    query: z.string()
      .min(1, 'Search query required')
      .max(200, 'Search query too long')
      .regex(/^[a-zA-Z0-9\s\-_\.@]+$/, 'Invalid search characters'),
    filters: z.record(z.string(), z.string()).optional(),
    organizationId: CommonSchemas.id.optional()
  })
}

/**
 * Sanitization functions
 */
export class InputSanitizer {
  /**
   * Sanitize HTML input to prevent XSS
   */
  static sanitizeHtml(input: string, allowedTags: string[] = []): string {
    if (!input || typeof input !== 'string') return ''
    
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM: false
    })
  }

  /**
   * Sanitize text input (remove HTML, escape special characters)
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return ''
    
    // Remove HTML tags
    const withoutHtml = this.sanitizeHtml(input, [])
    
    // Escape special characters
    return validator.escape(withoutHtml.trim())
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return ''
    
    const normalizedEmail = validator.normalizeEmail(email, {
      gmail_lowercase: true,
      gmail_remove_dots: false,
      outlookdotcom_lowercase: true,
      yahoo_lowercase: true,
      icloud_lowercase: true
    })
    
    return normalizedEmail || ''
  }

  /**
   * Sanitize URL input
   */
  static sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') return ''
    
    try {
      const parsed = new URL(url)
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return ''
      }
      return parsed.toString()
    } catch {
      return ''
    }
  }

  /**
   * Sanitize file name
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') return ''
    
    // Remove path traversal attempts
    fileName = fileName.replace(/\.\./g, '')
    
    // Remove or replace invalid characters
    fileName = fileName.replace(/[<>:"/\\|?*]/g, '_')
    
    // Limit length
    if (fileName.length > 255) {
      const ext = fileName.split('.').pop()
      const name = fileName.substring(0, 255 - (ext ? ext.length + 1 : 0))
      fileName = ext ? `${name}.${ext}` : name
    }
    
    return fileName.trim()
  }

  /**
   * Sanitize SQL-like input (prevent injection)
   */
  static sanitizeSqlInput(input: string): string {
    if (!input || typeof input !== 'string') return ''
    
    // Remove common SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(--|\/*|\*\/)/g,
      /(\bOR\b|\bAND\b).*?(\=|\<|\>)/gi,
      /['"`;]/g
    ]
    
    let sanitized = input
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })
    
    return sanitized.trim()
  }

  /**
   * Sanitize JSON input
   */
  static sanitizeJson(input: any, maxDepth = 5): any {
    if (maxDepth <= 0) return null
    
    if (input === null || input === undefined) return input
    
    if (typeof input === 'string') {
      return this.sanitizeText(input)
    }
    
    if (typeof input === 'number' || typeof input === 'boolean') {
      return input
    }
    
    if (Array.isArray(input)) {
      return input
        .slice(0, 100) // Limit array size
        .map(item => this.sanitizeJson(item, maxDepth - 1))
    }
    
    if (typeof input === 'object') {
      const sanitized: any = {}
      let keyCount = 0
      
      for (const [key, value] of Object.entries(input)) {
        if (keyCount >= 50) break // Limit object size
        
        const sanitizedKey = this.sanitizeText(key)
        if (sanitizedKey && sanitizedKey.length <= 100) {
          sanitized[sanitizedKey] = this.sanitizeJson(value, maxDepth - 1)
          keyCount++
        }
      }
      
      return sanitized
    }
    
    return null
  }
}

/**
 * File upload validation
 */
export class FileValidator {
  private static readonly ALLOWED_EXTENSIONS = [
    'pdf', 'docx', 'pptx', 'xlsx', 'txt', 'csv'
  ]
  
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]

  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  private static readonly MALICIOUS_SIGNATURES = [
    Buffer.from([0x4D, 0x5A]), // PE executable
    Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
    Buffer.from([0xFE, 0xED, 0xFA]), // Mach-O executable
    Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP (check further)
  ]

  /**
   * Validate file upload
   */
  static async validateFileUpload(file: {
    name: string
    size: number
    type: string
    buffer?: Buffer
  }): Promise<{
    isValid: boolean
    errors: string[]
    sanitizedName?: string
  }> {
    const errors: string[] = []

    // Validate file name
    if (!file.name || file.name.length === 0) {
      errors.push('File name is required')
    } else if (file.name.length > 255) {
      errors.push('File name too long')
    }

    const sanitizedName = InputSanitizer.sanitizeFileName(file.name)
    
    // Validate file extension
    const extension = sanitizedName.split('.').pop()?.toLowerCase()
    if (!extension || !this.ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`File type not allowed. Allowed types: ${this.ALLOWED_EXTENSIONS.join(', ')}`)
    }

    // Validate MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push('Invalid file MIME type')
    }

    // Validate file size
    if (file.size <= 0) {
      errors.push('File cannot be empty')
    } else if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File too large. Maximum size: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`)
    }

    // Validate file content if buffer is provided
    if (file.buffer) {
      const contentValidation = await this.validateFileContent(file.buffer, file.type)
      if (!contentValidation.isValid) {
        errors.push(...contentValidation.errors)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedName
    }
  }

  /**
   * Validate file content for malicious patterns
   */
  private static async validateFileContent(buffer: Buffer, mimeType: string): Promise<{
    isValid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    // Check for malicious file signatures
    for (const signature of this.MALICIOUS_SIGNATURES) {
      if (buffer.subarray(0, signature.length).equals(signature)) {
        if (signature.equals(Buffer.from([0x50, 0x4B, 0x03, 0x04]))) {
          // ZIP file - validate it's actually a valid Office document
          if (!mimeType.includes('openxmlformats')) {
            errors.push('File appears to be a ZIP archive disguised as Office document')
          }
        } else {
          errors.push('File contains malicious executable signature')
        }
      }
    }

    // Check for embedded scripts in PDF
    if (mimeType === 'application/pdf') {
      const content = buffer.toString()
      if (content.includes('/JavaScript') || content.includes('/JS')) {
        errors.push('PDF contains JavaScript which is not allowed')
      }
    }

    // Check file size consistency
    if (buffer.length === 0) {
      errors.push('File content is empty')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Email domain validation
 */
export class EmailValidator {
  private static readonly BLOCKED_DOMAINS = [
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'temp-mail.org'
  ]

  private static readonly SUSPICIOUS_PATTERNS = [
    /\d{4,}/, // Many consecutive digits
    /[a-z]{20,}/, // Very long lowercase strings
    /test|demo|fake|spam/i
  ]

  /**
   * Validate email domain
   */
  static async validateEmailDomain(email: string): Promise<{
    isValid: boolean
    errors: string[]
    risk: 'low' | 'medium' | 'high'
  }> {
    const errors: string[] = []
    let risk: 'low' | 'medium' | 'high' = 'low'

    try {
      const domain = email.split('@')[1]?.toLowerCase()
      
      if (!domain) {
        errors.push('Invalid email format')
        return { isValid: false, errors, risk: 'high' }
      }

      // Check blocked domains
      if (this.BLOCKED_DOMAINS.includes(domain)) {
        errors.push('Email domain is not allowed')
        risk = 'high'
      }

      // Check suspicious patterns in local part
      const localPart = email.split('@')[0]
      if (localPart) {
        for (const pattern of this.SUSPICIOUS_PATTERNS) {
          if (pattern.test(localPart)) {
            risk = 'medium'
            break
          }
        }
      }

      // Basic domain validation
      if (!validator.isFQDN(domain)) {
        errors.push('Invalid email domain format')
        risk = 'high'
      }

      await logSecurityEvent('email_domain_validation', {
        email: email.substring(0, email.indexOf('@')) + '@***',
        domain,
        risk,
        errors: errors.length
      }, risk === 'high' ? 'medium' : 'low')

      return {
        isValid: errors.length === 0,
        errors,
        risk
      }
    } catch (error) {
      await logSecurityEvent('email_validation_error', {
        error: error instanceof Error ? error.message : 'unknown error'
      }, 'medium')

      return {
        isValid: false,
        errors: ['Email validation failed'],
        risk: 'high'
      }
    }
  }
}

/**
 * Main validation function for API inputs
 */
export async function validateApiInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options: {
    sanitize?: boolean
    logValidation?: boolean
    context?: string
  } = {}
): Promise<{
  success: boolean
  data?: T
  errors?: string[]
}> {
  const { sanitize = true, logValidation = false, context = 'api_input' } = options

  try {
    // Pre-sanitize if requested
    let sanitizedData = data
    if (sanitize && typeof data === 'object' && data !== null) {
      sanitizedData = InputSanitizer.sanitizeJson(data)
    }

    // Validate with Zod
    const result = schema.safeParse(sanitizedData)

    if (!result.success) {
      const errors = result.error.issues.map(err => 
        `${err.path.join('.')}: ${err.message}`
      )

      if (logValidation) {
        await logSecurityEvent('validation_failed', {
          context,
          errors,
          dataType: typeof data
        }, 'low')
      }

      return { success: false, errors }
    }

    if (logValidation) {
      await logSecurityEvent('validation_success', {
        context,
        dataType: typeof data
      }, 'low')
    }

    return { success: true, data: result.data }
  } catch (error) {
    await logSecurityEvent('validation_error', {
      context,
      error: error instanceof Error ? error.message : 'unknown error'
    }, 'medium')

    return {
      success: false,
      errors: ['Validation failed due to internal error']
    }
  }
}

/**
 * Validate and sanitize user input with comprehensive security checks
 */
export async function secureValidateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  securityContext: {
    userIp?: string
    userAgent?: string
    userId?: string
    endpoint?: string
  } = {}
): Promise<{
  success: boolean
  data?: T
  errors?: string[]
  securityWarnings?: string[]
}> {
  const securityWarnings: string[] = []

  // Check for potential security issues in input
  if (typeof data === 'string') {
    // Check for potential XSS
    if (/<script|javascript:|on\w+\s*=/i.test(data)) {
      securityWarnings.push('Potential XSS attempt detected')
    }

    // Check for SQL injection patterns
    if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b|--|\/*|\*\/)/i.test(data)) {
      securityWarnings.push('Potential SQL injection attempt detected')
    }

    // Check for path traversal
    if (/\.\.[\\/]/.test(data)) {
      securityWarnings.push('Potential path traversal attempt detected')
    }
  }

  // Log security warnings
  if (securityWarnings.length > 0) {
    await logSecurityEvent('security_warning_validation', {
      ...securityContext,
      warnings: securityWarnings,
      dataPreview: typeof data === 'string' ? data.substring(0, 100) : typeof data
    }, 'high')
  }

  // Perform normal validation
  const validationResult = await validateApiInput(schema, data, {
    sanitize: true,
    logValidation: true,
    context: securityContext.endpoint || 'secure_validation'
  })

  return {
    ...validationResult,
    securityWarnings
  }
}