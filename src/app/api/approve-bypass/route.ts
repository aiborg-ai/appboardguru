import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAppUrl, env, getSmtpConfig, isEmailServiceConfigured } from '@/config/environment'
import nodemailer from 'nodemailer'
import { createOtpCode } from '@/lib/otp'
import { generatePasswordSetupMagicLink } from '@/lib/supabase-admin'

/**
 * Bypass approval route that approves without creating user
 * This allows approval to succeed even if user creation fails
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const token = url.searchParams.get('token')
  const createUser = url.searchParams.get('createUser') !== 'false'
  
  console.log('🔧 BYPASS APPROVAL:', { id, tokenProvided: !!token, createUser })
  
  if (!id || !token) {
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Missing Parameters&message=Registration ID or token missing`
    return NextResponse.redirect(errorUrl, 302)
  }
  
  try {
    // Create a fresh Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase configuration')
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Configuration Error&message=Server configuration incomplete`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // 1. Get the registration
    const { data: registration, error: fetchError } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !registration) {
      console.error('Registration not found:', fetchError)
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Not Found&message=Registration request not found`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    // 2. Verify token (optional - can skip with &skipToken=true)
    const skipToken = url.searchParams.get('skipToken') === 'true'
    if (!skipToken && registration.approval_token !== token) {
      console.error('Token mismatch')
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Invalid Token&message=Security token does not match`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    // 3. Check if already processed
    if (registration.status !== 'pending') {
      const warningUrl = `${getAppUrl()}/approval-result?type=warning&title=Already Processed&message=This registration has already been ${registration.status}`
      return NextResponse.redirect(warningUrl, 302)
    }
    
    // 4. Update registration status ONLY
    const { error: updateError } = await supabase
      .from('registration_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        approval_token: null
      })
      .eq('id', id)
    
    if (updateError) {
      console.error('Failed to update registration:', updateError)
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Update Failed&message=Could not update registration status`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    console.log('✅ Registration approved successfully')
    
    // 5. Optionally try to create user (but don't fail if it doesn't work)
    let userMessage = ''
    if (createUser) {
      try {
        // Check if user already exists
        const { data: authListData } = await supabase.auth.admin.listUsers()
        const userExists = authListData?.users?.some(u => u.email === registration.email)
        
        if (!userExists) {
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: registration.email,
            email_confirm: true,
            user_metadata: {
              full_name: registration.full_name
            }
          })
          
          if (authError) {
            console.error('User creation failed (non-fatal):', authError)
            userMessage = ' (Manual user setup required)'
          } else if (authUser?.user) {
            console.log('User created:', authUser.user.id)
            userMessage = ' and user account created'
            
            // Try to add to users table (don't fail if it doesn't work)
            try {
              await supabase
                .from('users')
                .insert({
                  id: authUser.user.id,
                  email: registration.email,
                  full_name: registration.full_name,
                  status: 'approved',
                  role: 'director',
                  password_set: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
            } catch (e) {
              console.log('Users table insert failed (non-fatal):', e)
            }
            
            // Send approval email with login credentials
            await sendApprovalEmail(registration)
          }
        } else {
          userMessage = ' (User already exists)'
        }
      } catch (e) {
        console.error('User creation error (non-fatal):', e)
        userMessage = ' (Manual user setup may be required)'
      }
    }
    
    // 6. Success - registration is approved
    const message = `${registration.full_name} has been approved${userMessage}`
    const successUrl = `${getAppUrl()}/approval-result?type=success&title=Registration Approved&message=${encodeURIComponent(message)}&email=${encodeURIComponent(registration.email)}`
    
    return NextResponse.redirect(successUrl, 302)
    
  } catch (error) {
    console.error('Bypass approval error:', error)
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=System Error&message=An unexpected error occurred`
    return NextResponse.redirect(errorUrl, 302)
  }
}

/**
 * Send approval email with login credentials
 */
async function sendApprovalEmail(registration: any) {
  try {
    // Check if email service is configured
    if (!isEmailServiceConfigured()) {
      console.log('⚠️  Email service not configured - skipping approval email')
      console.log('📧 User details for manual notification:')
      console.log(`   Email: ${registration.email}`)
      console.log(`   Name: ${registration.full_name}`)
      return
    }
    
    // Generate OTP code for first-time login
    let otpCode: string | null = null
    let magicLink: string | null = null
    
    try {
      const { success: otpSuccess, otpCode: generatedOtpCode } = await createOtpCode(
        registration.email,
        'first_login',
        24 // 24 hours
      )
      
      if (otpSuccess && generatedOtpCode) {
        otpCode = generatedOtpCode
        console.log(`✅ OTP code generated for ${registration.email}: ${otpCode}`)
      }
    } catch (e) {
      console.error('Failed to generate OTP:', e)
    }
    
    // Try to generate magic link as fallback
    try {
      const { magicLink: generatedLink, success: linkSuccess } = await generatePasswordSetupMagicLink(
        registration.email
      )
      
      if (linkSuccess && generatedLink) {
        magicLink = generatedLink
        console.log(`✅ Magic link generated for ${registration.email}`)
      }
    } catch (e) {
      console.error('Failed to generate magic link:', e)
    }
    
    // If we have neither OTP nor magic link, don't send email
    if (!otpCode && !magicLink) {
      console.log('⚠️  No login credentials generated - skipping email')
      return
    }
    
    // Send email with credentials
    const smtpConfig = getSmtpConfig()
    if (!smtpConfig) {
      console.log('⚠️  SMTP not configured - cannot send email')
      console.log(`📧 OTP Code for ${registration.email}: ${otpCode || 'Not generated'}`)
      return
    }
    
    const transporter = nodemailer.createTransport(smtpConfig)
    
    const emailHTML = generateApprovalEmailHTML(registration, otpCode, magicLink)
    
    await transporter.sendMail({
      from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
      to: registration.email,
      subject: '🎉 BoardGuru Registration Approved - Welcome!',
      html: emailHTML,
    })
    
    console.log(`✅ Approval email sent to ${registration.email}`)
    
  } catch (error) {
    console.error('Failed to send approval email:', error)
    // Don't fail the approval process if email fails
  }
}

/**
 * Generate approval email HTML
 */
function generateApprovalEmailHTML(registration: any, otpCode: string | null, magicLink: string | null): string {
  const appUrl = getAppUrl()
  
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Registration Approved!</h1>
        <p style="color: #bbf7d0; margin: 10px 0 0 0; font-size: 16px;">Welcome to BoardGuru</p>
      </div>
      
      <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-bottom: 24px; font-size: 24px;">Welcome to BoardGuru!</h2>
        
        <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
          Dear ${registration.full_name},
        </p>
        
        <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
          Congratulations! Your registration request for BoardGuru has been approved. 
          You can now access our enterprise board management platform.
        </p>
        
        ${otpCode ? `
          <div style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
            <h3 style="color: #1e40af; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">🔐 Your Sign-In Code</h3>
            <div style="background: #ffffff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #374151; font-size: 16px; margin: 0 0 12px 0;">Enter this code when signing in:</p>
              <div style="font-size: 36px; font-weight: 900; color: #1e40af; font-family: 'Courier New', monospace; letter-spacing: 8px; margin: 12px 0;">${otpCode}</div>
              <p style="color: #6b7280; font-size: 14px; margin: 12px 0 0 0;">Valid for 24 hours</p>
            </div>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          ${otpCode ? `
            <a href="${appUrl}/auth/signin" 
               style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
              🚀 Sign In with Your Code
            </a>
          ` : magicLink ? `
            <a href="${magicLink}" 
               style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
              🔐 Set Up Your Password
            </a>
          ` : `
            <a href="${appUrl}/auth/signin" 
               style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
              Sign In Now
            </a>
          `}
        </div>
        
        <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
          Best regards,<br>
          <strong style="color: #374151;">The BoardGuru Team</strong>
        </p>
      </div>
    </div>
  `
}