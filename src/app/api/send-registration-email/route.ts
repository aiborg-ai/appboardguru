import { NextRequest } from 'next/server'
import nodemailer from 'nodemailer'
import { generateApprovalUrls } from '@/utils/url'
import { env, getSmtpConfig } from '@/config/environment'
import { supabase } from '@/lib/supabase'
import { 
  validateRegistrationData, 
  generateSecureApprovalToken,
  RateLimiter 
} from '@/lib/security'
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

// Rate limiter for email sending (5 emails per 15 minutes per IP)
const emailRateLimiter = new RateLimiter(5, 5, 15 * 60 * 1000)

async function handleRegistrationEmail(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['POST'])) {
    return createErrorResponse('Method not allowed', 405)
  }

  // Check rate limiting
  const clientIP = getClientIP(request)
  if (!emailRateLimiter.isAllowed(clientIP)) {
    return createRateLimitErrorResponse(900) // 15 minutes
  }

  // Environment info logging removed for production builds

  let body: any
  try {
    body = await request.json()
  } catch (error) {
    return createErrorResponse('Invalid JSON in request body', 400)
  }

  // Validate and sanitize user data
  const validation = validateRegistrationData(body)
  if (!validation.isValid) {
    return createValidationErrorResponse(validation.errors)
  }

  const { sanitizedData } = validation
  
  // TypeScript assertion: sanitizedData is guaranteed to be defined when isValid is true
  if (!sanitizedData) {
    return createErrorResponse('Data validation failed', 500)
  }

  try {
    // Check if email already has a registration request
    const { data: existingRequest, error: checkError } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('email', sanitizedData.email)
      .single()

    if (existingRequest) {
      // Email already has a registration request
      if ((existingRequest as any).status === 'pending') {
        return createErrorResponse('A registration request for this email is already pending review', 409)
      } else if ((existingRequest as any).status === 'approved') {
        return createErrorResponse('This email has already been approved. Please sign in or request a password reset link.', 409)
      } else if ((existingRequest as any).status === 'rejected') {
        // Allow resubmission after rejection
        console.log(`Allowing resubmission for previously rejected email: ${sanitizedData.email}`)
      }
    }

    // Insert registration request into database
    const { data: insertData, error: dbError } = await supabase
      .from('registration_requests')
      .upsert([
        {
          email: sanitizedData.email,
          full_name: sanitizedData.fullName,
          company: sanitizedData.company,
          position: sanitizedData.position,
          message: sanitizedData.message || null,
          status: 'pending'
        }
      ])
      .select()

    if (dbError || !insertData || insertData.length === 0) {
      console.error('Database insertion error:', dbError)
      console.error('Error details:', {
        code: dbError?.code,
        message: dbError?.message,
        details: dbError?.details,
        hint: dbError?.hint
      })
      
      // Provide more specific error messages
      if (dbError?.code === '23505') {
        return createErrorResponse('A registration request for this email already exists', 409)
      }
      
      return createErrorResponse(`Failed to create registration request: ${dbError?.message || 'Unknown database error'}`, 500)
    }

    const registrationId = insertData[0]?.id
    if (!registrationId) {
      return createErrorResponse('Failed to create registration request: Missing ID', 500)
    }

    // Generate secure token for approval links
    const securityToken = generateSecureApprovalToken(registrationId)
    
    // Calculate token expiration (24 hours from now)
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Update registration with token and expiration
    const { error: tokenUpdateError } = await supabase
      .from('registration_requests')
      .update({
        approval_token: securityToken,
        token_expires_at: tokenExpiresAt
      })
      .eq('id', registrationId)

    if (tokenUpdateError) {
      console.error('Token update error:', tokenUpdateError)
      return createErrorResponse('Failed to generate approval token', 500)
    }

    // Generate approval URLs
    const { approveUrl, rejectUrl } = generateApprovalUrls(registrationId, securityToken)

    // Create email transporter with validated config
    const transporter = nodemailer.createTransport(getSmtpConfig())

    // Verify SMTP connection (in development)
    if (env.NODE_ENV === 'development') {
      try {
        await transporter.verify()
        console.log('✅ SMTP connection verified')
      } catch (error) {
        console.error('❌ SMTP connection failed:', error)
        return createErrorResponse('Email service configuration error', 500)
      }
    }

    // Admin notification email template
    const adminEmailHTML = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🔔 New Registration Request</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">BoardGuru Platform Access Request</p>
        </div>
        
        <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-bottom: 30px; font-size: 24px;">Review Registration Request</h2>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151; width: 30%;">Full Name:</td>
                <td style="padding: 8px 0; color: #6b7280;">${sanitizedData.fullName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Email:</td>
                <td style="padding: 8px 0; color: #6b7280;">${sanitizedData.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Company:</td>
                <td style="padding: 8px 0; color: #6b7280;">${sanitizedData.company}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Position:</td>
                <td style="padding: 8px 0; color: #6b7280;">${sanitizedData.position}</td>
              </tr>
              ${sanitizedData.message ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151; vertical-align: top;">Message:</td>
                <td style="padding: 8px 0; color: #6b7280; line-height: 1.5;">${sanitizedData.message}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <!-- Action Buttons -->
          <div style="text-align: center; margin: 40px 0;">
            <h3 style="color: #1f2937; margin-bottom: 24px; font-size: 20px;">Take Action:</h3>
            
            <div style="display: inline-block; margin: 0 8px;">
              <a href="${approveUrl}" 
                 style="display: inline-block; background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                ✅ APPROVE REQUEST
              </a>
            </div>
            
            <div style="display: inline-block; margin: 0 8px;">
              <a href="${rejectUrl}" 
                 style="display: inline-block; background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                ❌ REJECT REQUEST
              </a>
            </div>
          </div>
          
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h4 style="color: #0c4a6e; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">⚡ One-Click Actions:</h4>
            <p style="color: #0c4a6e; margin: 0; font-size: 14px; line-height: 1.5;">
              Click the buttons above to instantly approve or reject this registration request. 
              The user will be automatically notified of your decision via email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Registration ID: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${registrationId}</code>
            </p>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
          This email was sent automatically from the BoardGuru registration system.
        </div>
      </div>
    `

    // User confirmation email template
    const userEmailHTML = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Registration Request Received</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">Thank you for your interest in BoardGuru</p>
        </div>
        
        <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-bottom: 24px; font-size: 24px;">Thank you for your interest in BoardGuru!</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
            Dear ${sanitizedData.fullName},
          </p>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
            We have received your registration request for BoardGuru, our enterprise board management platform. 
            Your request is being reviewed and you'll receive an email notification once it's processed.
          </p>
          
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 24px; margin: 30px 0;">
            <h3 style="color: #0c4a6e; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">What happens next?</h3>
            <ul style="color: #0c4a6e; margin: 0; padding-left: 24px; line-height: 1.6;">
              <li>Our team reviews your request (typically within 24 hours)</li>
              <li>You'll receive an email notification of the decision</li>
              <li>If approved, you'll get access instructions and login details</li>
              <li>You can then start using BoardGuru's powerful features</li>
            </ul>
          </div>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Your Request Details:</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #6b7280; width: 30%;">Email:</td>
                <td style="padding: 4px 0; color: #374151; font-weight: 500;">${sanitizedData.email}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6b7280;">Company:</td>
                <td style="padding: 4px 0; color: #374151; font-weight: 500;">${sanitizedData.company}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6b7280;">Position:</td>
                <td style="padding: 4px 0; color: #374151; font-weight: 500;">${sanitizedData.position}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
            If you have any questions or need immediate assistance, please don't hesitate to contact our support team.
          </p>
          
          <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
            Best regards,<br>
            <strong style="color: #374151;">The BoardGuru Team</strong>
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
          This email was sent automatically from the BoardGuru registration system.
        </div>
      </div>
    `

    // Send admin notification email
    await transporter.sendMail({
      from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
      to: env.ADMIN_EMAIL,
      subject: `🔔 New BoardGuru Registration Request - ${sanitizedData.fullName}`,
      html: adminEmailHTML,
    })

    // Send user confirmation email
    await transporter.sendMail({
      from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
      to: sanitizedData.email,
      subject: '✅ BoardGuru Registration Request Received',
      html: userEmailHTML,
    })

    console.log(`📧 Registration emails sent successfully`)
    console.log(`   Admin notification: ${env.ADMIN_EMAIL}`)
    console.log(`   User confirmation: ${sanitizedData.email}`)
    console.log(`   Registration ID: ${registrationId}`)

    const response = createSuccessResponse(
      { 
        registrationId,
        adminEmail: env.ADMIN_EMAIL,
        userEmail: sanitizedData.email 
      },
      'Registration request submitted successfully'
    )

    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Email sending error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid login') || error.message.includes('authentication failed')) {
        return createErrorResponse('Email service authentication failed', 500)
      }
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return createErrorResponse('Email service unavailable', 503)
      }
    }
    
    return createErrorResponse('Failed to send registration notification', 500)
  }
}

export const POST = withErrorHandling(handleRegistrationEmail)