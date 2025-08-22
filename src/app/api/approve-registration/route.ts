import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createUserForApprovedRegistration, generatePasswordSetupMagicLink } from '@/lib/supabase-admin'
import { createOtpCode } from '@/lib/otp'
import nodemailer from 'nodemailer'
import { getAppUrl } from '@/config/environment'
import { env, getSmtpConfig } from '@/config/environment'
import {
  addSecurityHeaders,
  validateRequestMethod
} from '@/lib/api-response'

async function handleApprovalRequest(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['GET'])) {
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Method Not Allowed&message=Invalid request method&details=Please use the approval link from your email`
    return NextResponse.redirect(errorUrl, 302)
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const token = searchParams.get('token')

  if (!id || !token) {
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Invalid Request&message=Missing registration ID or security token&details=The approval link appears to be malformed or incomplete`
    return NextResponse.redirect(errorUrl, 302)
  }

  try {
    // Get the registration request with token verification
    const { data: registrationRequest, error: fetchError } = await (supabase as any)
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !registrationRequest) {
      console.error('Registration request fetch error:', fetchError)
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Request Not Found&message=Registration request not found&details=The request may have already been processed or the link has expired.`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Verify the security token from database
    if (!(registrationRequest as any).approval_token || (registrationRequest as any).approval_token !== token) {
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Security Error&message=Invalid security token&details=This link appears to be invalid or tampered with. Please contact support if you believe this is an error.`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Check if token has expired
    if ((registrationRequest as any).token_expires_at && new Date((registrationRequest as any).token_expires_at) < new Date()) {
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Link Expired&message=This approval link has expired&details=For security reasons, approval links expire after 24 hours. Please contact support to request a new approval link.`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Check if already processed
    if ((registrationRequest as any).status !== 'pending') {
      const warningUrl = `${getAppUrl()}/approval-result?type=warning&title=Already Processed&message=This registration request has already been ${(registrationRequest as any).status}&details=No further action is needed&name=${encodeURIComponent((registrationRequest as any).full_name)}&email=${encodeURIComponent((registrationRequest as any).email)}`
      return NextResponse.redirect(warningUrl, 302)
    }

    // Approve the registration request and clear the token (one-time use)
    const { error: updateError } = await (supabase as any)
      .from('registration_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        approval_token: null,
        token_expires_at: null
      })
      .eq('id', id)

    if (updateError) {
      console.error('Database update error:', updateError)
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Database Error&message=Failed to update registration status&details=Please try again or contact support`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Create Supabase auth user, generate magic link and OTP code for password setup
    let magicLink: string | null = null
    let otpCode: string | null = null
    let userRecord: any = null
    
    try {
      // Import debug logger
      const { debugLogger } = await import('@/lib/debug-logger')
      
      debugLogger.approvalStart((registrationRequest as any).email, (registrationRequest as any).id)
      
      // Create auth user without password - THIS IS MANDATORY
      const { success: userCreateSuccess, error: userCreateError, userRecord: createdUserRecord } = await createUserForApprovedRegistration(
        (registrationRequest as any).email,
        (registrationRequest as any).full_name
      )

      if (!userCreateSuccess) {
        debugLogger.error('USER_CREATION_MANDATORY_FAILED', (registrationRequest as any).email, { 
          error: userCreateError,
          registrationId: (registrationRequest as any).id 
        })
        
        // User creation is MANDATORY for approval to succeed
        const errorUrl = `${getAppUrl()}/approval-result?type=error&title=User Account Creation Failed&message=Failed to create user account during approval process&details=System error occurred. Please try again or contact support.`
        return NextResponse.redirect(errorUrl, 302)
      }
      
      userRecord = createdUserRecord
      debugLogger.info('USER_CREATION_SUCCESS', (registrationRequest as any).email, {
        userId: userRecord?.id,
        passwordSet: userRecord?.password_set
      })

      // Generate OTP code for first-time login (24-hour expiry)
      const { success: otpSuccess, otpCode: generatedOtpCode, error: otpError } = await createOtpCode(
        (registrationRequest as any).email,
        'first_login',
        24 // 24 hours
      )

      if (otpSuccess && generatedOtpCode) {
        otpCode = generatedOtpCode
        debugLogger.info('OTP_GENERATION_SUCCESS', (registrationRequest as any).email, { hasOtp: true })
        console.log(`✅ OTP code generated for first-time login: ${(registrationRequest as any).email}`)
      } else {
        debugLogger.error('OTP_GENERATION_FAILED', (registrationRequest as any).email, { error: otpError })
        console.error('Failed to generate OTP code:', otpError)
        // OTP generation failure should not stop the approval, but user will need magic link
      }

      // Generate magic link for password setup (fallback option)
      console.log(`🔗 Attempting magic link generation for ${(registrationRequest as any).email}`)
      const { magicLink: generatedMagicLink, success: linkSuccess, error: linkError } = await generatePasswordSetupMagicLink(
        (registrationRequest as any).email
      )

      if (linkSuccess && generatedMagicLink) {
        magicLink = generatedMagicLink
        debugLogger.magicLinkGenerate((registrationRequest as any).email, true, { 
          hasLink: true,
          linkLength: generatedMagicLink.length,
          linkPreview: generatedMagicLink.substring(0, 100) + '...'
        })
        console.log(`✅ Magic link successfully generated for ${(registrationRequest as any).email}`)
      } else {
        debugLogger.magicLinkGenerate((registrationRequest as any).email, false, { 
          error: linkError,
          hasOtp: !!otpCode
        })
        console.error('❌ Failed to generate magic link:', linkError)
        console.log(`📱 OTP available as fallback: ${!!otpCode}`)
        // Continue - if we have OTP, that's the primary method now
      }
      
    } catch (authError) {
      // Import debug logger in catch block too
      const { debugLogger } = await import('@/lib/debug-logger')
      
      debugLogger.error('AUTH_USER_CREATION_EXCEPTION', (registrationRequest as any).email, {
        error: authError instanceof Error ? authError.message : authError,
        registrationId: (registrationRequest as any).id
      })
      
      console.error('Auth user creation error:', authError)
      
      // User creation failure should stop the approval process
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=System Error&message=Failed to create user account&details=A system error occurred during approval. Please contact support.`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Send approval email to the user
    try {
      const transporter = nodemailer.createTransport(getSmtpConfig())

      const approvalEmailHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Registration Approved!</h1>
            <p style="color: #bbf7d0; margin: 10px 0 0 0; font-size: 16px;">Welcome to BoardGuru</p>
          </div>
          
          <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1f2937; margin-bottom: 24px; font-size: 24px;">Welcome to BoardGuru!</h2>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
              Dear ${(registrationRequest as any).full_name},
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
              Congratulations! Your registration request for BoardGuru has been approved. 
              You can now access our enterprise board management platform.
            </p>
            
            ${otpCode ? `
              <!-- OTP Code Section (Primary Method) -->
              <div style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
                <h3 style="color: #1e40af; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">🔐 Your Sign-In Code</h3>
                <div style="background: #ffffff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="color: #374151; font-size: 16px; margin: 0 0 12px 0;">Enter this code when signing in:</p>
                  <div style="font-size: 36px; font-weight: 900; color: #1e40af; font-family: 'Courier New', monospace; letter-spacing: 8px; margin: 12px 0;">${otpCode}</div>
                  <p style="color: #6b7280; font-size: 14px; margin: 12px 0 0 0;">Valid for 24 hours</p>
                </div>
                <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <h4 style="color: #065f46; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Easy Sign-In Steps:</h4>
                  <ol style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.6; font-size: 14px; text-align: left;">
                    <li>Visit: <a href="${getAppUrl()}/auth/signin" style="color: #059669; text-decoration: none; font-weight: 600;">BoardGuru Sign In</a></li>
                    <li>Enter your email: <strong>${(registrationRequest as any).email}</strong></li>
                    <li>Enter your 6-digit code above</li>
                    <li>Set up your permanent password</li>
                    <li>Start using BoardGuru!</li>
                  </ol>
                </div>
              </div>
            ` : `
              <!-- Fallback to Magic Link -->
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 24px; margin: 30px 0;">
                <h3 style="color: #0c4a6e; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Next Steps:</h3>
                <ol style="color: #0c4a6e; margin: 0; padding-left: 24px; line-height: 1.6;">
                  ${magicLink ? `
                    <li><strong>Click the secure access link below to set up your password</strong></li>
                    <li>Create your secure password during first login</li>
                    <li>Complete your profile setup</li>
                  ` : `
                    <li>Visit the BoardGuru platform: <a href="${getAppUrl()}/auth/signin" style="color: #059669; text-decoration: none; font-weight: 600;">Sign In Here</a></li>
                    <li>Use your registered email: <strong>${(registrationRequest as any).email}</strong></li>
                    <li>Request a password setup link during first login</li>
                    <li>Complete your profile setup</li>
                  `}
                </ol>
              </div>
            `}
            
            <div style="text-align: center; margin: 30px 0;">
              ${otpCode ? `
                <!-- Primary CTA for OTP Login -->
                <a href="${getAppUrl()}/auth/signin" 
                   style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 12px;">
                  🚀 Sign In with Your Code
                </a>
                <p style="color: #6b7280; font-size: 12px; margin: 0;">Use the 6-digit code above to sign in</p>
                ${magicLink ? `
                  <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px 0;">Prefer a direct setup link?</p>
                    <a href="${magicLink}" 
                       style="color: #059669; text-decoration: none; font-weight: 600; font-size: 14px;">
                      🔐 Use Magic Link (expires in 1 hour)
                    </a>
                  </div>
                ` : ''}
              ` : magicLink ? `
                <!-- Fallback to Magic Link -->
                <a href="${magicLink}" 
                   style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 12px;">
                  🔐 Set Up Your Password
                </a>
                <p style="color: #6b7280; font-size: 12px; margin: 0;">This secure link expires in 1 hour for your security</p>
              ` : `
                <!-- No OTP or Magic Link Available -->
                <a href="${getAppUrl()}/auth/signin" 
                   style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  Sign In Now
                </a>
              `}
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
            This email was sent automatically from BoardGuru registration system.
          </div>
        </div>
      `

      await transporter.sendMail({
        from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
        to: (registrationRequest as any).email,
        subject: '🎉 BoardGuru Registration Approved - Welcome!',
        html: approvalEmailHTML,
      })

      console.log(`✅ Approval email sent to ${(registrationRequest as any).email}`)
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError)
      // Don't fail the approval process if email fails
    }

    // Redirect to beautiful success page
    console.log(`✅ Approval process completed for ${(registrationRequest as any).email}`)
    console.log(`📧 Approval email sent: ${!!magicLink || !!otpCode}`)
    
    const successUrl = `${getAppUrl()}/approval-result?type=success&title=Registration Approved&message=${encodeURIComponent(`${(registrationRequest as any).full_name} has been successfully approved for access to BoardGuru`)}&details=An approval email with login instructions has been sent&name=${encodeURIComponent((registrationRequest as any).full_name)}&email=${encodeURIComponent((registrationRequest as any).email)}&company=${encodeURIComponent((registrationRequest as any).company)}&position=${encodeURIComponent((registrationRequest as any).position)}`
    
    const response = NextResponse.redirect(successUrl, 302)
    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Approval process error:', error)
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Server Error&message=An error occurred while processing the approval&details=Please try again later or contact support if the problem persists`
    return NextResponse.redirect(errorUrl, 302)
  }
}

export const GET = handleApprovalRequest