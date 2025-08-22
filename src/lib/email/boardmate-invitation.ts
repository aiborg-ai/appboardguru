/**
 * BoardMate Invitation Email Service
 * Handles sending invitation emails to new BoardMates
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

export interface BoardMateInvitationEmailData {
  to: string
  boardMateName: string
  organizationName: string
  inviterName: string
  invitationToken: string
  customMessage?: string
  accessLevel: 'full' | 'restricted' | 'view_only'
  expiresAt: string
}

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

/**
 * Generate BoardMate invitation email template
 */
export function generateBoardMateInvitationEmail(data: BoardMateInvitationEmailData): EmailTemplate {
  const inviteUrl = `${process.env['NEXT_PUBLIC_APP_URL']}/invite/boardmate?token=${data.invitationToken}`
  const expiryDate = new Date(data.expiresAt).toLocaleDateString()
  
  const accessLevelDescriptions = {
    full: 'You will have complete access to all board materials, meetings, and collaborative features.',
    restricted: 'You will have limited access to specific board materials and features.',
    view_only: 'You will have read-only access to assigned board materials.'
  }

  const subject = `Invitation to join ${data.organizationName} on BoardGuru`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BoardGuru Invitation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #3b82f6;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 10px;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #1e293b;
            margin: 20px 0;
        }
        .subtitle {
            font-size: 18px;
            color: #64748b;
            margin-bottom: 30px;
        }
        .content {
            margin-bottom: 30px;
        }
        .highlight-box {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .info-section {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
        }
        .info-section h3 {
            color: #1e293b;
            margin-top: 0;
            font-size: 16px;
            font-weight: 600;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .custom-message {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #f59e0b;
        }
        .custom-message h3 {
            color: #92400e;
            margin-top: 0;
            font-size: 16px;
            font-weight: 600;
        }
        .custom-message p {
            color: #92400e;
            margin-bottom: 0;
            font-style: italic;
        }
        .steps {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .steps h3 {
            color: #1e293b;
            margin-top: 0;
        }
        .steps ol {
            color: #475569;
            padding-left: 20px;
        }
        .steps li {
            margin-bottom: 8px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
        }
        .warning {
            background: #fef2f2;
            border: 1px solid #fca5a5;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #ef4444;
        }
        .warning p {
            color: #dc2626;
            margin: 0;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 20px;
            }
            .title {
                font-size: 24px;
            }
            .subtitle {
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">BoardGuru</div>
            <p>Professional Board Management Platform</p>
        </div>
        
        <h1 class="title">You're Invited to Join ${data.organizationName}</h1>
        <p class="subtitle">Welcome to the future of board governance</p>
        
        <div class="content">
            <p>Hello <strong>${data.boardMateName}</strong>,</p>
            
            <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on BoardGuru, 
            our secure board management platform designed for modern governance.</p>
            
            ${data.customMessage ? `
            <div class="custom-message">
                <h3>Personal Message from ${data.inviterName}</h3>
                <p>"${data.customMessage}"</p>
            </div>
            ` : ''}
            
            <div class="highlight-box">
                <h2 style="margin: 0 0 10px 0; font-size: 20px;">🎯 Your Role & Access</h2>
                <p style="margin: 0; font-size: 16px;">${accessLevelDescriptions[data.accessLevel]}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" class="cta-button">Accept Invitation & Create Account</a>
            </div>
            
            <div class="info-section">
                <h3>🚀 What is BoardGuru?</h3>
                <p>BoardGuru is an enterprise-grade board management platform that streamlines governance with:</p>
                <ul>
                    <li><strong>Secure Document Management</strong> - Centralized board pack distribution</li>
                    <li><strong>AI-Powered Insights</strong> - Intelligent document analysis and summaries</li>
                    <li><strong>Collaborative Tools</strong> - Real-time discussions and annotations</li>
                    <li><strong>Meeting Management</strong> - Integrated scheduling and minutes</li>
                    <li><strong>Compliance Tracking</strong> - Automated governance workflows</li>
                </ul>
            </div>
            
            <div class="steps">
                <h3>📋 Getting Started (2 minutes)</h3>
                <ol>
                    <li>Click the "Accept Invitation" button above</li>
                    <li>Create your secure BoardGuru account</li>
                    <li>Verify your email address</li>
                    <li>Complete your profile setup</li>
                    <li>Start accessing board materials immediately</li>
                </ol>
            </div>
            
            <div class="info-section">
                <h3>🔒 Security & Privacy</h3>
                <p>Your data security is our top priority. BoardGuru features:</p>
                <ul>
                    <li>Enterprise-grade encryption (AES-256)</li>
                    <li>Two-factor authentication</li>
                    <li>SOC 2 Type II compliance</li>
                    <li>Regular security audits</li>
                    <li>GDPR compliance</li>
                </ul>
            </div>
            
            <div class="warning">
                <p><strong>⏰ This invitation expires on ${expiryDate}.</strong> 
                Please accept it soon to ensure uninterrupted access to board materials.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>If you have any questions, please contact your board administrator or reach out to our support team.</p>
            <p>
                <a href="mailto:support@boardguru.ai" style="color: #3b82f6;">support@boardguru.ai</a> | 
                <a href="${process.env['NEXT_PUBLIC_APP_URL']}/help" style="color: #3b82f6;">Help Center</a> | 
                <a href="${process.env['NEXT_PUBLIC_APP_URL']}/privacy" style="color: #3b82f6;">Privacy Policy</a>
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
                This invitation was sent to ${data.to} by ${data.inviterName} on behalf of ${data.organizationName}.
                <br>If you believe this was sent in error, please contact the sender directly.
            </p>
        </div>
    </div>
</body>
</html>`

  const text = `
Welcome to BoardGuru - You're Invited to Join ${data.organizationName}

Hello ${data.boardMateName},

${data.inviterName} has invited you to join ${data.organizationName} on BoardGuru, our secure board management platform.

${data.customMessage ? `
Personal Message from ${data.inviterName}:
"${data.customMessage}"
` : ''}

Your Access Level: ${data.accessLevel}
${accessLevelDescriptions[data.accessLevel]}

To accept this invitation and create your account, visit:
${inviteUrl}

What is BoardGuru?
BoardGuru is an enterprise-grade board management platform that provides:
- Secure Document Management
- AI-Powered Insights
- Collaborative Tools
- Meeting Management
- Compliance Tracking

Getting Started:
1. Click the invitation link above
2. Create your secure BoardGuru account
3. Verify your email address
4. Complete your profile setup
5. Start accessing board materials

Security & Privacy:
Your data is protected with enterprise-grade encryption, two-factor authentication, and SOC 2 compliance.

IMPORTANT: This invitation expires on ${expiryDate}. Please accept it soon to ensure access.

Questions? Contact support@boardguru.ai or your board administrator.

---
This invitation was sent to ${data.to} by ${data.inviterName} on behalf of ${data.organizationName}.
BoardGuru - Professional Board Management Platform
`

  return { subject, html, text }
}

/**
 * Send BoardMate invitation email
 * This function would integrate with your email service provider
 */
export async function sendBoardMateInvitationEmail(data: BoardMateInvitationEmailData): Promise<boolean> {
  try {
    // TODO: Integrate with your email service provider
    // Examples: SendGrid, Mailgun, AWS SES, Postmark, etc.
    
    const emailTemplate = generateBoardMateInvitationEmail(data)
    
    // Example integration with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env['SENDGRID_API_KEY'])
    
    const msg = {
      to: data.to,
      from: {
        email: process.env['FROM_EMAIL'] || 'noreply@boardguru.ai',
        name: 'BoardGuru'
      },
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    }
    
    await sgMail.send(msg)
    */
    
    // For now, log the email content for testing
    console.log('📧 BoardMate Invitation Email:')
    console.log('To:', data.to)
    console.log('Subject:', emailTemplate.subject)
    console.log('Invitation URL:', `${process.env['NEXT_PUBLIC_APP_URL']}/invite/boardmate?token=${data.invitationToken}`)
    
    // Log email sent event
    await supabaseAdmin
      .from('email_logs')
      .insert({
        recipient: data.to,
        email_type: 'boardmate_invitation',
        subject: emailTemplate.subject,
        status: 'sent',
        metadata: {
          boardmate_name: data.boardMateName,
          organization_name: data.organizationName,
          inviter_name: data.inviterName,
          invitation_token: data.invitationToken,
          access_level: data.accessLevel
        },
        sent_at: new Date().toISOString()
      })
    
    return true
  } catch (error) {
    console.error('Error sending BoardMate invitation email:', error)
    
    // Log email failure
    try {
      await supabaseAdmin
        .from('email_logs')
        .insert({
          recipient: data.to,
          email_type: 'boardmate_invitation',
          subject: `Invitation to join ${data.organizationName} on BoardGuru`,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            boardmate_name: data.boardMateName,
            organization_name: data.organizationName,
            inviter_name: data.inviterName,
            access_level: data.accessLevel
          },
          sent_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Error logging email failure:', logError)
    }
    
    return false
  }
}

/**
 * Send BoardMate reminder email
 */
export async function sendBoardMateReminderEmail(data: BoardMateInvitationEmailData): Promise<boolean> {
  try {
    const reminderData = {
      ...data,
      customMessage: `This is a friendly reminder about your pending invitation. ${data.customMessage || ''}`
    }
    
    const emailTemplate = generateBoardMateInvitationEmail(reminderData)
    emailTemplate.subject = `Reminder: ${emailTemplate.subject}`
    
    // TODO: Send reminder email using your email service
    console.log('📧 BoardMate Reminder Email sent to:', data.to)
    
    return true
  } catch (error) {
    console.error('Error sending BoardMate reminder email:', error)
    return false
  }
}

/**
 * Get invitation email template for preview
 */
export function previewBoardMateInvitationEmail(data: BoardMateInvitationEmailData): EmailTemplate {
  return generateBoardMateInvitationEmail(data)
}