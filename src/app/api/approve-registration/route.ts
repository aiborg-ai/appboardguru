import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { getAppUrl } from '@/utils/url'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const token = searchParams.get('token')

    if (!id || !token) {
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Invalid Request&message=Missing registration ID or security token&details=The approval link appears to be malformed or incomplete`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Verify the token (simple hash-based verification)
    const expectedToken = crypto
      .createHash('sha256')
      .update(`${id}-${process.env.NEXTAUTH_SECRET || 'fallback-secret'}`)
      .digest('hex')
      .substring(0, 32)

    if (token !== expectedToken) {
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Security Error&message=Invalid security token&details=This link may have expired or been tampered with. Please contact support if you believe this is an error.`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Get the registration request
    const { data: registrationRequest, error: fetchError } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !registrationRequest) {
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Request Not Found&message=Registration request not found&details=The request may have already been processed or the link has expired.`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Check if already processed
    if (registrationRequest.status !== 'pending') {
      const warningUrl = `${getAppUrl()}/approval-result?type=warning&title=Already Processed&message=This registration request has already been ${registrationRequest.status}&details=No further action is needed&name=${encodeURIComponent(registrationRequest.full_name)}&email=${encodeURIComponent(registrationRequest.email)}`
      return NextResponse.redirect(warningUrl, 302)
    }

    // Approve the registration request
    const { error: updateError } = await supabase
      .from('registration_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      throw new Error('Failed to update registration status')
    }

    // Create user account in Supabase Auth
    const tempPassword = crypto.randomBytes(16).toString('hex')
    
    // Note: In production, you'd use Supabase Admin API to create users
    // For now, we'll send them instructions to create their own account

    // Send approval email to the user
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })

      const approvalEmailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Registration Approved!</h1>
          </div>
          
          <div style="padding: 30px; background: white; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome to BoardGuru!</h2>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
              Dear ${registrationRequest.full_name},
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
              Congratulations! Your registration request for BoardGuru has been approved. 
              You can now access our enterprise board management platform.
            </p>
            
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px;">Next Steps:</h3>
              <ol style="color: #0c4a6e; margin: 0; padding-left: 20px;">
                <li>Visit the BoardGuru platform: <a href="${getAppUrl()}/auth/signin">Sign In Here</a></li>
                <li>Use your registered email: <strong>${registrationRequest.email}</strong></li>
                <li>Create your secure password during first login</li>
                <li>Complete your profile setup</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getAppUrl()}/auth/signin" 
                 style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                Access BoardGuru Now
              </a>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6;">
              Best regards,<br>
              The BoardGuru Team
            </p>
          </div>
          
          <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
            This email was sent automatically from BoardGuru registration system.
          </div>
        </div>
      `

      await transporter.sendMail({
        from: process.env.SMTP_USER,
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
    return NextResponse.redirect(successUrl, 302)

  } catch (error) {
    console.error('Approval error:', error)
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Server Error&message=An error occurred while processing the approval&details=Please try again later or contact support if the problem persists`
    return NextResponse.redirect(errorUrl, 302)
  }
}