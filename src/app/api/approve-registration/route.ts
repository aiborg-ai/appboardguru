import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import nodemailer from 'nodemailer'
import { getAppUrl } from '@/utils/url'
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
    const { data: registrationRequest, error: fetchError } = await supabase
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
    if (!registrationRequest.approval_token || registrationRequest.approval_token !== token) {
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Security Error&message=Invalid security token&details=This link appears to be invalid or tampered with. Please contact support if you believe this is an error.`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Check if token has expired
    if (registrationRequest.token_expires_at && new Date(registrationRequest.token_expires_at) < new Date()) {
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Link Expired&message=This approval link has expired&details=For security reasons, approval links expire after 24 hours. Please contact support to request a new approval link.`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Check if already processed
    if (registrationRequest.status !== 'pending') {
      const warningUrl = `${getAppUrl()}/approval-result?type=warning&title=Already Processed&message=This registration request has already been ${registrationRequest.status}&details=No further action is needed&name=${encodeURIComponent(registrationRequest.full_name)}&email=${encodeURIComponent(registrationRequest.email)}`
      return NextResponse.redirect(warningUrl, 302)
    }

    // Approve the registration request and clear the token (one-time use)
    const { error: updateError } = await supabase
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
              Dear ${registrationRequest.full_name},
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
              Congratulations! Your registration request for BoardGuru has been approved. 
              You can now access our enterprise board management platform.
            </p>
            
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 24px; margin: 30px 0;">
              <h3 style="color: #0c4a6e; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Next Steps:</h3>
              <ol style="color: #0c4a6e; margin: 0; padding-left: 24px; line-height: 1.6;">
                <li>Visit the BoardGuru platform: <a href="${getAppUrl()}/auth/signin" style="color: #059669; text-decoration: none; font-weight: 600;">Sign In Here</a></li>
                <li>Use your registered email: <strong>${registrationRequest.email}</strong></li>
                <li>Create your secure password during first login</li>
                <li>Complete your profile setup</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getAppUrl()}/auth/signin" 
                 style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                Access BoardGuru Now
              </a>
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
        to: registrationRequest.email,
        subject: '🎉 BoardGuru Registration Approved - Welcome!',
        html: approvalEmailHTML,
      })

      console.log(`✅ Approval email sent to ${registrationRequest.email}`)
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError)
      // Don't fail the approval process if email fails
    }

    // Redirect to beautiful success page
    const successUrl = `${getAppUrl()}/approval-result?type=success&title=Registration Approved&message=${encodeURIComponent(`${registrationRequest.full_name} has been successfully approved for access to BoardGuru`)}&details=An approval email with login instructions has been sent&name=${encodeURIComponent(registrationRequest.full_name)}&email=${encodeURIComponent(registrationRequest.email)}&company=${encodeURIComponent(registrationRequest.company)}&position=${encodeURIComponent(registrationRequest.position)}`
    
    const response = NextResponse.redirect(successUrl, 302)
    return addSecurityHeaders(response)

  } catch (error) {
    console.error('Approval process error:', error)
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Server Error&message=An error occurred while processing the approval&details=Please try again later or contact support if the problem persists`
    return NextResponse.redirect(errorUrl, 302)
  }
}

export const GET = handleApprovalRequest