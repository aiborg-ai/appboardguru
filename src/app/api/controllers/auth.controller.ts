/**
 * AuthController
 * Consolidates authentication-related routes
 * Replaces: auth/verify-otp, auth/resend-otp, request-magic-link, 
 * approve-registration, reject-registration, send-registration-email
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { EnhancedHandlers } from '@/lib/middleware/apiHandler'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { 
  validateOtpCode, 
  markOtpAsUsed, 
  generateOtpCode,
  OtpRateLimiter 
} from '@/lib/otp'
import { 
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  getClientIP
} from '@/lib/api-response'

// Validation schemas
const VerifyOtpSchema = z.object({
  email: z.string().email('Valid email is required'),
  otpCode: z.string().regex(/^\d{6}$/, 'OTP code must be exactly 6 digits'),
  purpose: z.enum(['first_login', 'password_reset']).default('first_login')
})

const ResendOtpSchema = z.object({
  email: z.string().email('Valid email is required'),
  purpose: z.enum(['first_login', 'password_reset']).default('first_login')
})

const RequestMagicLinkSchema = z.object({
  email: z.string().email('Valid email is required'),
  redirectTo: z.string().url().optional()
})

const RegistrationActionSchema = z.object({
  email: z.string().email('Valid email is required'),
  userId: z.string().uuid().optional(),
  message: z.string().optional()
})

const SendRegistrationEmailSchema = z.object({
  email: z.string().email('Valid email is required'),
  organizationName: z.string().min(2, 'Organization name is required'),
  inviterName: z.string().min(2, 'Inviter name is required'),
  role: z.enum(['member', 'admin', 'owner']).default('member')
})

// Rate limiters
const otpVerificationRateLimiter = new OtpRateLimiter(5, 15) // 5 attempts per 15 minutes
const otpResendRateLimiter = new OtpRateLimiter(3, 10) // 3 resends per 10 minutes
const magicLinkRateLimiter = new OtpRateLimiter(5, 60) // 5 requests per hour

/**
 * POST /api/auth/verify-otp
 * Verify OTP code and create temporary session for password setup
 */
export const verifyOtp = EnhancedHandlers.post(
  VerifyOtpSchema,
  {
    rateLimit: { requests: 5, window: '15m' },
    authenticate: false,
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const clientIP = getClientIP(req.request as NextRequest)
    const { email, otpCode, purpose } = req.validatedBody!

    // Check rate limiting
    if (!otpVerificationRateLimiter.isAllowed(clientIP)) {
      const resetTime = otpVerificationRateLimiter.getResetTime(clientIP)
      const remainingMinutes = Math.ceil((resetTime - Date.now()) / (1000 * 60))
      throw new Error(`Too many verification attempts. Try again in ${remainingMinutes} minutes.`)
    }

    console.log(`🔐 OTP verification attempt for ${email} (purpose: ${purpose})`)

    // Validate the OTP code
    const validation = await validateOtpCode(email, otpCode, purpose)
    
    if (!validation.success || !validation.isValid || !validation.otpRecord) {
      console.log(`❌ OTP verification failed for ${email}: ${validation.error}`)
      throw new Error(validation.error || 'Invalid or expired OTP code')
    }

    // Mark OTP as used
    const markUsedResult = await markOtpAsUsed(validation.otpRecord.id)
    if (!markUsedResult.success) {
      console.error(`Failed to mark OTP as used for ${email}:`, markUsedResult.error)
    }

    if (purpose === 'first_login') {
      // Check if user exists and needs password setup
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, password_set, status')
        .eq('email', email)
        .eq('status', 'approved')
        .single()

      if (userError || !userData) {
        throw new Error('User account not found or not approved')
      }

      if (userData.password_set) {
        throw new Error('Password has already been set. Please use regular sign-in.')
      }

      // Generate temporary access token for password setup
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'}/auth/set-password?verified=true&source=otp`
        }
      })

      if (authError || !authData.properties?.action_link) {
        throw new Error('Failed to create temporary access. Please try again.')
      }

      console.log(`✅ OTP verification successful for ${email} - password setup required`)
      
      return {
        verified: true,
        requiresPasswordSetup: true,
        userId: userData.id,
        email: userData.email,
        setupLink: authData.properties.action_link,
        message: 'OTP verified successfully. Please set up your password.'
      }
    }

    if (purpose === 'password_reset') {
      throw new Error('Password reset via OTP not yet implemented')
    }

    throw new Error('Invalid OTP purpose')
  }
)

/**
 * POST /api/auth/resend-otp
 * Resend OTP code to user's email
 */
export const resendOtp = EnhancedHandlers.post(
  ResendOtpSchema,
  {
    rateLimit: { requests: 3, window: '10m' },
    authenticate: false,
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const clientIP = getClientIP(req.request as NextRequest)
    const { email, purpose } = req.validatedBody!

    // Check rate limiting
    if (!otpResendRateLimiter.isAllowed(clientIP)) {
      const resetTime = otpResendRateLimiter.getResetTime(clientIP)
      const remainingMinutes = Math.ceil((resetTime - Date.now()) / (1000 * 60))
      throw new Error(`Too many resend attempts. Try again in ${remainingMinutes} minutes.`)
    }

    // Verify user exists
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, status')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      throw new Error('User not found')
    }

    if (userData.status !== 'approved') {
      throw new Error('User account is not approved')
    }

    // Generate new OTP code
    const otpResult = await generateOtpCode(email, purpose, userData.id)
    if (!otpResult.success) {
      throw new Error(otpResult.error || 'Failed to generate OTP code')
    }

    console.log(`📱 OTP resent to ${email} (purpose: ${purpose})`)

    return {
      success: true,
      message: 'OTP code has been resent to your email',
      email: email,
      expiresIn: 10 // minutes
    }
  }
)

/**
 * POST /api/auth/magic-link
 * Request magic link for authentication
 */
export const requestMagicLink = EnhancedHandlers.post(
  RequestMagicLinkSchema,
  {
    rateLimit: { requests: 5, window: '1h' },
    authenticate: false,
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const clientIP = getClientIP(req.request as NextRequest)
    const { email, redirectTo } = req.validatedBody!

    // Check rate limiting
    if (!magicLinkRateLimiter.isAllowed(clientIP)) {
      const resetTime = magicLinkRateLimiter.getResetTime(clientIP)
      const remainingMinutes = Math.ceil((resetTime - Date.now()) / (1000 * 60))
      throw new Error(`Too many magic link requests. Try again in ${remainingMinutes} minutes.`)
    }

    // Generate magic link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectTo || `${process.env['NEXT_PUBLIC_APP_URL']}/dashboard`
      }
    })

    if (error) {
      console.error('Magic link generation error:', error)
      throw new Error('Failed to generate magic link')
    }

    console.log(`🔗 Magic link sent to ${email}`)

    return {
      success: true,
      message: 'Magic link has been sent to your email',
      email: email
    }
  }
)

/**
 * POST /api/auth/registration/approve
 * Approve user registration
 */
export const approveRegistration = EnhancedHandlers.post(
  RegistrationActionSchema,
  {
    rateLimit: { requests: 20, window: '1h' },
    authenticate: true, // Admin only
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const { email, userId, message } = req.validatedBody!
    
    // Update user status to approved
    const { data: userData, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: req.user!.id
      })
      .eq('email', email)
      .select()
      .single()

    if (updateError || !userData) {
      throw new Error('Failed to approve registration')
    }

    // Generate OTP for first login
    const otpResult = await generateOtpCode(email, 'first_login', userData.id)
    if (!otpResult.success) {
      console.error('Failed to generate OTP after approval:', otpResult.error)
      // Don't fail the approval, just log the error
    }

    console.log(`✅ Registration approved for ${email}`)

    return {
      success: true,
      message: 'Registration approved successfully',
      user: {
        id: userData.id,
        email: userData.email,
        status: userData.status
      }
    }
  }
)

/**
 * POST /api/auth/registration/reject
 * Reject user registration
 */
export const rejectRegistration = EnhancedHandlers.post(
  RegistrationActionSchema,
  {
    rateLimit: { requests: 20, window: '1h' },
    authenticate: true, // Admin only
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const { email, message } = req.validatedBody!
    
    // Update user status to rejected
    const { data: userData, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: req.user!.id,
        rejection_reason: message
      })
      .eq('email', email)
      .select()
      .single()

    if (updateError || !userData) {
      throw new Error('Failed to reject registration')
    }

    // TODO: Send rejection email notification

    console.log(`❌ Registration rejected for ${email}`)

    return {
      success: true,
      message: 'Registration rejected successfully',
      user: {
        id: userData.id,
        email: userData.email,
        status: userData.status
      }
    }
  }
)

/**
 * POST /api/auth/registration/send-email
 * Send registration invitation email
 */
export const sendRegistrationEmail = EnhancedHandlers.post(
  SendRegistrationEmailSchema,
  {
    rateLimit: { requests: 10, window: '1h' },
    authenticate: true,
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const { email, organizationName, inviterName, role } = req.validatedBody!
    
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email, status')
      .eq('email', email)
      .single()

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Create pending user record
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        status: 'pending',
        role,
        invited_by: req.user!.id,
        invited_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError || !newUser) {
      throw new Error('Failed to create user invitation')
    }

    // TODO: Send invitation email with registration link

    console.log(`📧 Registration invitation sent to ${email}`)

    return {
      success: true,
      message: 'Registration invitation sent successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        status: newUser.status,
        role: newUser.role
      }
    }
  }
)

// Export all handlers
export {
  verifyOtp as POST_verify_otp,
  resendOtp as POST_resend_otp,
  requestMagicLink as POST_magic_link,
  approveRegistration as POST_approve_registration,
  rejectRegistration as POST_reject_registration,
  sendRegistrationEmail as POST_send_registration_email
}