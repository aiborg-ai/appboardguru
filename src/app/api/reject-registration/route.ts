import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import nodemailer from 'nodemailer'
import { getAppUrl } from '@/utils/url'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const token = searchParams.get('token')

    // Debug logging for troubleshooting
    console.log('🔍 Rejection Request Debug:', {
      id,
      tokenReceived: !!token,
      tokenLength: token?.length,
      timestamp: new Date().toISOString()
    })

    if (!id || !token) {
      console.error('❌ Missing required parameters:', { id: !!id, token: !!token })
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Invalid Request&message=Missing registration ID or security token&details=The rejection link appears to be malformed or incomplete`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      console.error('❌ Invalid ID format:', id)
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Invalid Request&message=Invalid registration ID format&details=The registration ID in the link appears to be malformed`
      return NextResponse.redirect(errorUrl, 302)
    }

    console.log('📊 Attempting to query registration_requests with ID:', id)
    // Get the registration request with token verification
    // Use supabaseAdmin (service role) to bypass RLS and read registration request
    const { data: registrationRequest, error: fetchError } = await supabaseAdmin
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .single()
    
    console.log('📊 Database query result:', {
      found: !!registrationRequest,
      hasError: !!fetchError,
      errorCode: fetchError?.code,
      errorMessage: fetchError?.message
    })

    if (fetchError || !registrationRequest) {
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
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Link Expired&message=This rejection link has expired&details=For security reasons, approval links expire after 24 hours. Please contact support if needed.`
      return NextResponse.redirect(errorUrl, 302)
    }

    // Check if already processed
    if ((registrationRequest as any).status !== 'pending') {
      const warningUrl = `${getAppUrl()}/approval-result?type=warning&title=Already Processed&message=This registration request has already been ${(registrationRequest as any).status}&details=No further action is needed&name=${encodeURIComponent((registrationRequest as any).full_name)}&email=${encodeURIComponent((registrationRequest as any).email)}`
      return NextResponse.redirect(warningUrl, 302)
    }

    // Reject the registration request and clear the token (one-time use)
    // Use supabaseAdmin to ensure we can update the registration
    const { error: updateError } = await supabaseAdmin
      .from('registration_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        approval_token: null,
        token_expires_at: null
      })
      .eq('id', id)

    if (updateError) {
      throw new Error('Failed to update registration status')
    }

    // Send rejection email to the user
    try {
      const transporter = nodemailer.createTransport({
        host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
        port: parseInt(process.env['SMTP_PORT'] || '587'),
        secure: false,
        auth: {
          user: process.env['SMTP_USER'],
          pass: process.env['SMTP_PASS'],
        },
      })

      const rejectionEmailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Registration Update</h1>
          </div>
          
          <div style="padding: 30px; background: white; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Thank you for your interest in BoardGuru</h2>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
              Dear ${(registrationRequest as any).full_name},
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
              Thank you for your interest in BoardGuru. After reviewing your registration request, 
              we are unable to approve access at this time.
            </p>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">Reasons may include:</h3>
              <ul style="color: #991b1b; margin: 0; padding-left: 20px;">
                <li>Application does not meet current criteria</li>
                <li>Incomplete or insufficient information provided</li>
                <li>Current capacity limitations</li>
                <li>Other business considerations</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
              If you believe this decision was made in error or if your circumstances have changed, 
              you may submit a new registration request in the future.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
              For any questions regarding this decision, please feel free to contact our support team.
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
        from: process.env['SMTP_USER'],
        to: (registrationRequest as any).email,
        subject: 'BoardGuru Registration Update',
        html: rejectionEmailHTML,
      })

      console.log(`❌ Rejection email sent to ${(registrationRequest as any).email}`)
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError)
      // Don't fail the rejection process if email fails
    }

    // Redirect to beautiful rejection page
    const rejectionUrl = `${getAppUrl()}/approval-result?type=error&title=Registration Rejected&message=${encodeURIComponent(`${(registrationRequest as any).full_name}'s registration request has been rejected`)}&details=A notification email has been sent to the applicant&name=${encodeURIComponent((registrationRequest as any).full_name)}&email=${encodeURIComponent((registrationRequest as any).email)}&company=${encodeURIComponent((registrationRequest as any).company)}&position=${encodeURIComponent((registrationRequest as any).position)}`
    return NextResponse.redirect(rejectionUrl, 302)

  } catch (error) {
    console.error('Rejection error:', error)
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Server Error&message=An error occurred while processing the rejection&details=Please try again later or contact support if the problem persists`
    return NextResponse.redirect(errorUrl, 302)
  }
}