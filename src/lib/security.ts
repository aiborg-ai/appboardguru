/**
 * Security Utilities
 * Handles token generation, input validation, and sanitization
 */

import crypto from 'crypto'
import validator from 'validator'
import DOMPurify from 'isomorphic-dompurify'
import { env } from '@/config/environment'

/**
 * Generate a cryptographically secure token for approval URLs
 */
export function generateSecureApprovalToken(registrationId: string): string {
  const timestamp = Date.now()
  const randomBytes = crypto.randomBytes(32).toString('hex')
  const secret = env.NEXTAUTH_SECRET
  
  // Create a hash with multiple entropy sources
  return crypto
    .createHash('sha256')
    .update(`${registrationId}-${timestamp}-${randomBytes}-${secret}`)
    .digest('hex')
    .substring(0, 32)
}

/**
 * Verify approval token
 */
export function verifyApprovalToken(
  registrationId: string, 
  token: string, 
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): boolean {
  // For now, we'll use the simple token verification
  // In production, you'd want to store tokens with timestamps
  const expectedToken = crypto
    .createHash('sha256')
    .update(`${registrationId}-${env.NEXTAUTH_SECRET}`)
    .digest('hex')
    .substring(0, 32)
    
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(expectedToken, 'hex')
  )
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // First sanitize HTML
  const sanitized = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  })
  
  // Then escape any remaining special characters
  return validator.escape(sanitized)
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }
  
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
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return validator.isEmail(email, {
    domain_specific_validation: true,
    blacklisted_chars: '()<>[]\\,;:\\s@"'
  })
}

/**
 * Validate and sanitize user registration data
 */
export interface RegistrationData {
  fullName: string
  email: string
  company: string
  position: string
  message?: string
}

export function validateRegistrationData(data: any): {
  isValid: boolean
  errors: string[]
  sanitizedData?: RegistrationData
} {
  const errors: string[] = []
  
  // Validate required fields
  if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.trim().length < 2) {
    errors.push('Full name is required and must be at least 2 characters')
  }
  
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email address is required')
  }
  
  if (!data.company || typeof data.company !== 'string' || data.company.trim().length < 2) {
    errors.push('Company name is required and must be at least 2 characters')
  }
  
  if (!data.position || typeof data.position !== 'string' || data.position.trim().length < 2) {
    errors.push('Position/title is required and must be at least 2 characters')
  }
  
  // Check field lengths
  if (data.fullName && data.fullName.length > 100) {
    errors.push('Full name must be less than 100 characters')
  }
  
  if (data.company && data.company.length > 100) {
    errors.push('Company name must be less than 100 characters')
  }
  
  if (data.position && data.position.length > 100) {
    errors.push('Position must be less than 100 characters')
  }
  
  if (data.message && data.message.length > 1000) {
    errors.push('Message must be less than 1000 characters')
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors }
  }
  
  // Sanitize data
  const sanitizedData: RegistrationData = {
    fullName: sanitizeInput(data.fullName).trim(),
    email: sanitizeEmail(data.email),
    company: sanitizeInput(data.company).trim(),
    position: sanitizeInput(data.position).trim(),
    message: data.message ? sanitizeInput(data.message).trim() : undefined
  }
  
  return { isValid: true, errors: [], sanitizedData }
}

/**
 * Rate limiting token bucket implementation
 */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>()
  
  constructor(
    private maxTokens: number = 10,
    private refillRate: number = 1, // tokens per minute
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  /**
   * Check if request is allowed for given identifier
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const bucket = this.buckets.get(identifier) || { 
      tokens: this.maxTokens, 
      lastRefill: now 
    }
    
    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill
    const tokensToAdd = Math.floor((timePassed / this.windowMs) * this.refillRate)
    
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now
    
    // Check if request is allowed
    if (bucket.tokens > 0) {
      bucket.tokens--
      this.buckets.set(identifier, bucket)
      return true
    }
    
    this.buckets.set(identifier, bucket)
    return false
  }
  
  /**
   * Get remaining tokens for identifier
   */
  getRemainingTokens(identifier: string): number {
    const bucket = this.buckets.get(identifier)
    return bucket ? bucket.tokens : this.maxTokens
  }
}

/**
 * Generate Content Security Policy header
 */
export function generateCSPHeader(): string {
  const policies = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js needs unsafe-eval
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://openrouter.ai https://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ]
  
  return policies.join('; ')
}