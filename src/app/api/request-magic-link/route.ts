import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { generatePasswordSetupMagicLink } from '@/lib/supabase-admin'
import nodemailer from 'nodemailer'
import { getAppUrl, env, getSmtpConfig } from '@/config/environment'
import { z } from 'zod'
import {
  createSuccessResponse,
  createErrorResponse,
  addSecurityHeaders,
  validateRequestMethod,
  withErrorHandling
} from '@/lib/api-response'

const requestSchema = z.object({
  email: z.string().email('Valid email is required')
})

async function handleMagicLinkRequest(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['POST'])) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    // Parse and validate request body
    const body = await request.json()
    const { email } = requestSchema.parse(body)

    // Check if user exists and is approved but hasn't set password
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

    if ((userData as any)?.password_set) {
      return createErrorResponse('Password has already been set for this account. Please use the regular sign-in process.', 400)
    }

    // Generate magic link for password setup
    const { magicLink, success: linkSuccess, error: linkError } = await generatePasswordSetupMagicLink(email)

    if (!linkSuccess || !magicLink) {
      console.error('Failed to generate magic link:', linkError)
      return createErrorResponse('Failed to generate secure access link', 500)
    }

    // Send magic link email
    try {
      const transporter = nodemailer.createTransport(getSmtpConfig())

      const magicLinkEmailHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🔐 Password Setup Link</h1>
            <p style="color: #bbf7d0; margin: 10px 0 0 0; font-size: 16px;">Your secure access link</p>
          </div>
          
          <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1f2937; margin-bottom: 24px; font-size: 24px;">Set Up Your Password</h2>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
              Hello ${(registrationData as any).full_name},
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
              You requested a secure link to set up your BoardGuru password. Click the button below to create your password and access the platform.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" 
                 style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 12px;">
                🔐 Set Up Your Password
              </a>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">This secure link expires in 1 hour for your security</p>
            </div>
            
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 24px; margin: 30px 0;">
              <h3 style="color: #0c4a6e; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">For Your Security:</h3>
              <ul style="color: #0c4a6e; margin: 0; padding-left: 24px; line-height: 1.6; font-size: 14px;">
                <li>This link is valid for 1 hour only</li>
                <li>It can only be used once</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              Best regards,<br>
              <strong style="color: #374151;">The BoardGuru Team</strong>
            </p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
            This email was sent automatically from BoardGuru password setup system.
          </div>
        </div>
      `

      await transporter.sendMail({
        from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
        to: email,
        subject: '🔐 BoardGuru - Set Up Your Password',
        html: magicLinkEmailHTML,
      })

      console.log(`✅ Magic link email sent to ${email}`)

      return createSuccessResponse(
        { emailSent: true },
        'Secure access link sent to your email address. Please check your inbox.'
      )

    } catch (emailError) {
      console.error('Failed to send magic link email:', emailError)
      return createErrorResponse('Failed to send email. Please try again or contact support.', 500)
    }

  } catch (error) {
    console.error('Magic link request error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Magic link request failed',
      500
    )
  }
}

export async function POST(request: NextRequest) {
  const response = await handleMagicLinkRequest(request)
  return addSecurityHeaders(response)
}