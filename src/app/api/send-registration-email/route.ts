import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, email, company, position, message } = body

    // Validate required fields
    if (!fullName || !email || !company || !position) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create email transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Admin notification email
    const adminEmailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Registration Request</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Registration Details</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Full Name:</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Email:</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Company:</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${company}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Position:</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${position}</td>
            </tr>
            ${message ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Message:</td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${message}</td>
            </tr>
            ` : ''}
          </table>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXTAUTH_URL}/admin/registration-requests" 
               style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              Review Request
            </a>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
          This email was sent automatically from BoardGuru registration system.
        </div>
      </div>
    `

    // Send admin notification
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL || 'hirendra.vikram@boardguru.ai',
      subject: `New BoardGuru Registration Request - ${fullName}`,
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
            Our team will review your request and respond within 1-2 business days.
          </p>
          
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px;">What happens next?</h3>
            <ul style="color: #0c4a6e; margin: 0; padding-left: 20px;">
              <li>Our team reviews your request</li>
              <li>We verify your company and position details</li>
              <li>You'll receive an email with your access decision</li>
              <li>If approved, you'll get setup instructions and login credentials</li>
            </ul>
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
      subject: 'BoardGuru Registration Request Received',
      html: userEmailHTML,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Registration request submitted successfully' 
    })

  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { error: 'Failed to send registration notification' },
      { status: 500 }
    )
  }
}