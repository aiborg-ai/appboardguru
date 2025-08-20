/**
 * Resend OTP API Endpoint
 * Allows users to request a new OTP code if their previous one expired or was lost
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { supabase } from '@/lib/supabase'
import { createOtpCode, OtpRateLimiter } from '@/lib/otp'
import { env, getSmtpConfig, getAppUrl } from '@/config/environment'
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

// Rate limiter for OTP resend requests (3 requests per 15 minutes per IP)
const otpResendRateLimiter = new OtpRateLimiter(3, 15)

// Request validation schema
const resendOtpSchema = z.object({
  email: z.string().email('Valid email is required'),
  purpose: z.enum(['first_login', 'password_reset']).default('first_login')
})

/**
 * POST /api/auth/resend-otp
 * Generate and send a new OTP code to the user
 */
async function handleResendOtp(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['POST'])) {
    return createErrorResponse('Method not allowed', 405)
  }

  const clientIP = getClientIP(request)

  // Check rate limiting
  if (!otpResendRateLimiter.isAllowed(clientIP)) {
    const resetTime = otpResendRateLimiter.getResetTime(clientIP)
    const remainingMinutes = Math.ceil((resetTime - Date.now()) / (1000 * 60))
    
    return createRateLimitErrorResponse(
      remainingMinutes * 60, // Convert to seconds for Retry-After header
    )
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const { email, purpose } = resendOtpSchema.parse(body)

    console.log(`📧 OTP resend request for ${email} (purpose: ${purpose})`)

    // For first_login, verify user exists and needs password setup
    if (purpose === 'first_login') {
      // Check if user exists in registration_requests as approved
      const { data: registrationData, error: regError } = await supabase
        .from('registration_requests')
        .select('*')
        .eq('email', email)
        .eq('status', 'approved')
        .single()

      if (regError || !registrationData) {
        return createErrorResponse('No approved registration found for this email address', 404)
      }

      // Check if user has already set password
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('password_set')
        .eq('email', email)
        .single()

      if (userData?.password_set) {
        return createErrorResponse('Password has already been set for this account. Please use the regular sign-in process.', 400)
      }

      // Generate new OTP code (24-hour expiry)
      const { success: otpSuccess, otpCode, error: otpError } = await createOtpCode(
        email,
        'first_login',
        24 // 24 hours
      )

      if (!otpSuccess || !otpCode) {
        console.error('Failed to generate OTP code:', otpError)
        return createErrorResponse('Failed to generate OTP code. Please try again.', 500)
      }

      // Send OTP email
      try {
        const transporter = nodemailer.createTransport(getSmtpConfig())

        const resendOtpEmailHTML = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🔐 New Sign-In Code</h1>
              <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">Your requested access code</p>
            </div>
            
            <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #1f2937; margin-bottom: 24px; font-size: 24px;">Your New Access Code</h2>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
                Hello ${registrationData.full_name},
              </p>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 30px; font-size: 16px;">
                You requested a new sign-in code for your BoardGuru account. Here's your fresh code:
              </p>
              
              <!-- OTP Code Section -->
              <div style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
                <div style="background: #ffffff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="color: #374151; font-size: 16px; margin: 0 0 12px 0;">Your 6-digit access code:</p>
                  <div style="font-size: 36px; font-weight: 900; color: #1e40af; font-family: 'Courier New', monospace; letter-spacing: 8px; margin: 12px 0;">${otpCode}</div>
                  <p style="color: #6b7280; font-size: 14px; margin: 12px 0 0 0;">Valid for 24 hours</p>
                </div>
              </div>
              
              <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <h4 style="color: #065f46; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Sign-In Steps:</h4>
                <ol style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.6; font-size: 14px;">
                  <li>Visit: <a href="${getAppUrl()}/auth/signin" style="color: #059669; text-decoration: none; font-weight: 600;">BoardGuru Sign In</a></li>
                  <li>Enter your email: <strong>${email}</strong></li>
                  <li>Enter your 6-digit code above</li>
                  <li>Set up your permanent password</li>
                </ol>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getAppUrl()}/auth/signin" 
                   style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  🚀 Sign In Now
                </a>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 30px 0;">
                <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Security Notice:</h4>
                <p style="color: #92400e; margin: 0; font-size: 12px; line-height: 1.4;">
                  • This code replaces any previous codes<br>
                  • Keep this code private and don't share it<br>
                  • If you didn't request this, please contact support
                </p>
              </div>
              
              <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
                Best regards,<br>
                <strong style="color: #374151;">The BoardGuru Team</strong>
              </p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
              This email was sent automatically from BoardGuru's secure authentication system.
            </div>
          </div>
        `

        await transporter.sendMail({
          from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
          to: email,
          subject: '🔐 BoardGuru - New Sign-In Code',
          html: resendOtpEmailHTML,
        })

        console.log(`✅ Resend OTP email sent to ${email}`)

        return createSuccessResponse({
          emailSent: true,
          expiresIn: '24 hours'
        }, 'New OTP code sent to your email address. Please check your inbox.')

      } catch (emailError) {
        console.error('Failed to send resend OTP email:', emailError)
        return createErrorResponse('Failed to send email. Please try again or contact support.', 500)
      }
    }

    // For password_reset purpose (if implemented later)
    if (purpose === 'password_reset') {
      return createErrorResponse('Password reset via OTP not yet implemented', 501)
    }

    // Should not reach here due to enum validation
    return createErrorResponse('Invalid OTP purpose', 400)

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`)
      return createValidationErrorResponse(errors)
    }

    console.error('OTP resend error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to resend OTP code',
      500
    )
  }
}

/**
 * Export the POST handler wrapped with error handling and security headers
 */
export async function POST(request: NextRequest) {
  const response = await withErrorHandling(handleResendOtp)(request)
  return addSecurityHeaders(response)
}