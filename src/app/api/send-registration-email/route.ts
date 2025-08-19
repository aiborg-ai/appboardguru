import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { generateApprovalUrls, logUrlConfig } from '@/utils/url'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, email, company, position, message, registrationId } = body

    // Validate required fields
    if (!fullName || !email || !company || !position || !registrationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Log URL configuration for debugging
    logUrlConfig()

    // ENHANCED DEBUGGING: Log all environment variables and URL generation
    console.log('🚨 DEBUGGING APPROVAL URL GENERATION:')
    console.log('   NODE_ENV:', process.env.NODE_ENV)
    console.log('   APP_URL:', process.env.APP_URL)
    console.log('   VERCEL_URL:', process.env.VERCEL_URL)
    console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
    console.log('   getAppUrl() result:', getAppUrl())

    // Generate secure token for approve/reject links
    const securityToken = crypto
      .createHash('sha256')
      .update(`${registrationId}-${process.env.NEXTAUTH_SECRET || 'fallback-secret'}`)
      .digest('hex')
      .substring(0, 32)

    // Generate environment-aware URLs
    const { approveUrl, rejectUrl, adminPanelUrl } = generateApprovalUrls(registrationId, securityToken)
    
    // LOG THE ACTUAL GENERATED URLS
    console.log('🚨 GENERATED APPROVAL URLS:')
    console.log('   Approve URL:', approveUrl)
    console.log('   Reject URL:', rejectUrl)
    console.log('   Admin Panel URL:', adminPanelUrl)

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Admin notification email with approve/reject buttons
    const adminEmailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔔 New Registration Request</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Review Registration Request</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 30%;">Full Name:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Email:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Company:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${company}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Position:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${position}</td>
            </tr>
            ${message ? `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Message:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${message}</td>
            </tr>
            ` : ''}
          </table>
          
          <!-- Action Buttons -->
          <div style="text-align: center; margin: 40px 0;">
            <h3 style="color: #1f2937; margin-bottom: 20px;">Take Action:</h3>
            
            <!-- Approve Button -->
            <a href="${approveUrl}" 
               style="display: inline-block; background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 0 10px; font-weight: 600; font-size: 16px;">
              ✅ APPROVE REQUEST
            </a>
            
            <!-- Reject Button -->
            <a href="${rejectUrl}" 
               style="display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 0 10px; font-weight: 600; font-size: 16px;">
              ❌ REJECT REQUEST
            </a>
          </div>
          
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 14px;">⚡ One-Click Actions:</h4>
            <p style="color: #0c4a6e; margin: 0; font-size: 14px;">
              Click the buttons above to instantly approve or reject this registration request. 
              The user will be automatically notified of your decision via email.
            </p>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">🔐 Security Note:</h4>
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              These links are secured with cryptographic tokens and can only be used once. 
              They will expire automatically after processing.
            </p>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
          This email was sent automatically from BoardGuru registration system.
          <br>Registration ID: ${registrationId}
        </div>
      </div>
    `

    // Send admin notification
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL || 'hirendra.vikram@boardguru.ai',
      subject: `🔔 New BoardGuru Registration Request - ${fullName}`,
      html: adminEmailHTML,
    })

    // User confirmation email
    const userEmailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Registration Request Received</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Thank you for your interest in BoardGuru!</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
            Dear ${fullName},
          </p>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
            We have received your registration request for BoardGuru, our enterprise board management platform. 
            Your request is being reviewed and you'll receive an email notification once it's processed.
          </p>
          
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px;">What happens next?</h3>
            <ul style="color: #0c4a6e; margin: 0; padding-left: 20px;">
              <li>Our team reviews your request (typically within 24 hours)</li>
              <li>We verify your company and position details</li>
              <li>You'll receive an email with the decision and next steps</li>
              <li>If approved, you'll get immediate access to BoardGuru</li>
            </ul>
          </div>
          
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 14px;">Your Registration Details:</h4>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              <strong>Email:</strong> ${email}<br>
              <strong>Company:</strong> ${company}<br>
              <strong>Position:</strong> ${position}
            </p>
          </div>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
            If you have any questions in the meantime, please don't hesitate to contact our support team.
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

    // Send user confirmation
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: '✅ BoardGuru Registration Request Received',
      html: userEmailHTML,
    })

    console.log(`📧 Registration emails sent successfully`)
    console.log(`   Admin notification: ${process.env.ADMIN_EMAIL}`)
    console.log(`   User confirmation: ${email}`)
    console.log(`   Registration ID: ${registrationId}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Registration request submitted successfully' 
    })

  } catch (error) {
    console.error('Email sending error:', error)
    
    // Provide more specific error message
    let errorMessage = 'Failed to send registration notification'
    if (error instanceof Error) {
      if (error.message.includes('Invalid login') || error.message.includes('authentication failed')) {
        errorMessage = 'Email authentication failed - please check SMTP credentials'
      } else if (error.message.includes('API key')) {
        errorMessage = 'API key error - but email sending should not require API keys'
      } else {
        errorMessage = `Email error: ${error.message}`
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}