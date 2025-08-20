/**
 * OTP Verification API Endpoint
 * Handles verification of OTP codes for first-time login and password setup
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateOtpCode, markOtpAsUsed, OtpRateLimiter } from '@/lib/otp'
import { 
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createRateLimitErrorResponse,
  withErrorHandling,
  addSecurityHeaders,
  validateRequestMethod,
  getClientIP
} from '@/lib/api-response'

// Rate limiter for OTP verification attempts (5 attempts per 15 minutes per IP)
const otpVerificationRateLimiter = new OtpRateLimiter(5, 15)

// Request validation schema
const verifyOtpSchema = z.object({
  email: z.string().email('Valid email is required'),
  otpCode: z.string().regex(/^\d{6}$/, 'OTP code must be exactly 6 digits'),
  purpose: z.enum(['first_login', 'password_reset']).default('first_login')
})

/**
 * POST /api/auth/verify-otp
 * Verify OTP code and create temporary session for password setup
 */
async function handleVerifyOtp(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['POST'])) {
    return createErrorResponse('Method not allowed', 405)
  }

  const clientIP = getClientIP(request)

  // Check rate limiting
  if (!otpVerificationRateLimiter.isAllowed(clientIP)) {
    const resetTime = otpVerificationRateLimiter.getResetTime(clientIP)
    const remainingMinutes = Math.ceil((resetTime - Date.now()) / (1000 * 60))
    
    return createRateLimitErrorResponse(
      remainingMinutes * 60, // Convert to seconds for Retry-After header
    )
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const { email, otpCode, purpose } = verifyOtpSchema.parse(body)

    console.log(`🔐 OTP verification attempt for ${email} (purpose: ${purpose})`)

    // Validate the OTP code
    const validation = await validateOtpCode(email, otpCode, purpose)
    
    if (!validation.success) {
      return createErrorResponse(validation.error || 'OTP verification failed', 500)
    }

    if (!validation.isValid || !validation.otpRecord) {
      // Log failed attempt for security monitoring
      console.log(`❌ OTP verification failed for ${email}: ${validation.error}`)
      
      return createErrorResponse(
        validation.error || 'Invalid or expired OTP code',
        400
      )
    }

    // Mark OTP as used to prevent reuse
    const markUsedResult = await markOtpAsUsed(validation.otpRecord.id)
    if (!markUsedResult.success) {
      console.error(`Failed to mark OTP as used for ${email}:`, markUsedResult.error)
      // Continue anyway - the main validation succeeded
    }

    // For first_login, verify user exists and needs password setup
    if (purpose === 'first_login') {
      // Check if user exists in users table and needs password setup
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, password_set, status')
        .eq('email', email)
        .eq('status', 'approved')
        .single()

      if (userError || !userData) {
        console.error(`User not found for OTP verification: ${email}`, userError)
        return createErrorResponse('User account not found or not approved', 404)
      }

      if (userData.password_set) {
        console.log(`User ${email} already has password set, OTP not needed`)
        return createErrorResponse('Password has already been set. Please use regular sign-in.', 400)
      }

      // Generate a temporary access token for password setup
      // We'll create a short-lived session that allows only password setup
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/set-password?verified=true&source=otp`
        }
      })

      if (authError || !authData.properties?.action_link) {
        console.error('Failed to generate temporary access link:', authError)
        return createErrorResponse('Failed to create temporary access. Please try again.', 500)
      }

      console.log(`✅ OTP verification successful for ${email} - password setup required`)
      
      return createSuccessResponse({
        verified: true,
        requiresPasswordSetup: true,
        userId: userData.id,
        email: userData.email,
        setupLink: authData.properties.action_link,
        message: 'OTP verified successfully. Please set up your password.'
      }, 'OTP verified successfully')
    }

    // For password_reset purpose (if implemented later)
    if (purpose === 'password_reset') {
      // Implementation for password reset flow would go here
      return createErrorResponse('Password reset via OTP not yet implemented', 501)
    }

    // Should not reach here due to enum validation
    return createErrorResponse('Invalid OTP purpose', 400)

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`)
      return createValidationErrorResponse(errors)
    }

    console.error('OTP verification error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'OTP verification failed',
      500
    )
  }
}

/**
 * Export the POST handler wrapped with error handling and security headers
 */
export async function POST(request: NextRequest) {
  const response = await withErrorHandling(handleVerifyOtp)(request)
  return addSecurityHeaders(response)
}