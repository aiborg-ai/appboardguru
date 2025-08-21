/**
 * Email Templates for Feedback System
 * HTML email templates for admin notifications and user confirmations
 */

export interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'other'
  title: string
  description: string
  userEmail: string
  userName?: string
  screenshot?: string
  timestamp: string
  userAgent?: string
  url?: string
}

export interface ConfirmationData {
  title: string
  type: string
  userEmail: string
  userName?: string
  timestamp: string
  referenceId: string
}

/**
 * Generate the base email styles and header
 */
function getEmailHeader(title: string, backgroundColor = '#3b82f6'): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, ${backgroundColor} 0%, #1e40af 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎯 BoardGuru</h1>
        <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">${title}</p>
      </div>
  `
}

/**
 * Generate the email footer
 */
function getEmailFooter(): string {
  return `
      <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 8px 0;">This email was sent automatically from the BoardGuru feedback system.</p>
        <p style="margin: 0;">© 2024 BoardGuru. All rights reserved.</p>
      </div>
    </div>
  `
}

/**
 * Get feedback type display information
 */
function getFeedbackTypeInfo(type: string) {
  const types = {
    bug: { emoji: '🐛', label: 'Bug Report', color: '#dc2626' },
    feature: { emoji: '✨', label: 'Feature Request', color: '#059669' },
    improvement: { emoji: '📈', label: 'Improvement Suggestion', color: '#d97706' },
    other: { emoji: '💬', label: 'General Feedback', color: '#6366f1' }
  }
  return types[type as keyof typeof types] || types.other
}

/**
 * Admin notification email template
 */
export function createAdminFeedbackTemplate(data: FeedbackData): { subject: string; html: string } {
  const typeInfo = getFeedbackTypeInfo(data.type)
  const subject = `${typeInfo.emoji} New Feedback: ${data.title}`

  const html = `
    ${getEmailHeader('New Feedback Received', typeInfo.color)}
        
        <div style="padding: 30px; background: white; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-bottom: 20px; font-size: 24px;">
            ${typeInfo.emoji} ${typeInfo.label}
          </h2>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">${data.title}</h3>
            <div style="white-space: pre-wrap; line-height: 1.6; color: #4b5563; margin: 0;">${data.description}</div>
          </div>
          
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">📋 Submission Details</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151; width: 25%;">From:</td>
                <td style="padding: 8px 0; color: #6b7280;">
                  ${data.userName ? `${data.userName} (${data.userEmail})` : data.userEmail}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Type:</td>
                <td style="padding: 8px 0; color: #6b7280;">
                  <span style="background: ${typeInfo.color}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">
                    ${typeInfo.emoji} ${typeInfo.label}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Submitted:</td>
                <td style="padding: 8px 0; color: #6b7280;">${new Date(data.timestamp).toLocaleString()}</td>
              </tr>
              ${data.url ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #374151;">Page URL:</td>
                  <td style="padding: 8px 0; color: #6b7280; word-break: break-all;">
                    <a href="${data.url}" style="color: #2563eb; text-decoration: none;">${data.url}</a>
                  </td>
                </tr>
              ` : ''}
              ${data.userAgent ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #374151; vertical-align: top;">Browser:</td>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 12px; line-height: 1.4;">${data.userAgent}</td>
                </tr>
              ` : ''}
            </table>
          </div>

          ${data.screenshot ? `
            <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #15803d; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">📷 Screenshot Included</h4>
              <div style="text-align: center;">
                <img src="${data.screenshot}" alt="User screenshot" style="max-width: 100%; height: auto; border: 2px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              </div>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #059669; text-align: center;">
                Screenshot captured by the user to help illustrate their feedback
              </p>
            </div>
          ` : ''}
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h4 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">⚡ Quick Actions</h4>
            <p style="color: #92400e; margin: 0 0 15px 0; font-size: 14px; line-height: 1.5;">
              • Reply directly to this email to respond to the user<br>
              • Forward to the relevant team member if needed<br>
              • Add to your project management system for tracking
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <a href="mailto:${data.userEmail}?subject=Re: ${data.title}&body=Hi ${data.userName || 'there'},%0D%0A%0D%0AThank you for your feedback regarding: ${data.title}%0D%0A%0D%0A"
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 8px;">
              📧 Reply to User
            </a>
          </div>
        </div>
        
    ${getEmailFooter()}
  `

  return { subject, html }
}

/**
 * User confirmation email template
 */
export function createUserConfirmationTemplate(data: ConfirmationData): { subject: string; html: string } {
  const typeInfo = getFeedbackTypeInfo(data.type)
  const subject = `✅ Your feedback has been received - ${data.title}`

  const html = `
    ${getEmailHeader('Feedback Confirmation', '#059669')}
        
        <div style="padding: 30px; background: white; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-bottom: 20px; font-size: 24px;">
            ✅ Thank You for Your Feedback!
          </h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; font-size: 16px;">
            Hi ${data.userName || 'there'},
          </p>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; font-size: 16px;">
            We've successfully received your ${typeInfo.label.toLowerCase()} and wanted to let you know that 
            we take all feedback seriously. Your input helps us improve BoardGuru for everyone.
          </p>

          <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="color: #15803d; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">📋 Your Feedback Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151; width: 25%;">Reference ID:</td>
                <td style="padding: 8px 0; color: #15803d; font-family: monospace;">#${data.referenceId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Type:</td>
                <td style="padding: 8px 0; color: #15803d;">
                  <span style="background: ${typeInfo.color}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">
                    ${typeInfo.emoji} ${typeInfo.label}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Title:</td>
                <td style="padding: 8px 0; color: #15803d;">${data.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Submitted:</td>
                <td style="padding: 8px 0; color: #15803d;">${new Date(data.timestamp).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h4 style="color: #0c4a6e; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">🚀 What Happens Next?</h4>
            <ul style="color: #0c4a6e; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li style="margin-bottom: 8px;">Our team will review your feedback within 1-2 business days</li>
              <li style="margin-bottom: 8px;">We'll respond via email if we need more information</li>
              <li style="margin-bottom: 8px;">For bug reports, we'll investigate and provide updates on fixes</li>
              <li style="margin-bottom: 8px;">For feature requests, we'll consider them for future releases</li>
              <li style="margin-bottom: 0;">You can reference your feedback using ID: <strong>#${data.referenceId}</strong></li>
            </ul>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h4 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">💡 Have More Feedback?</h4>
            <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
              We're always looking to improve! Feel free to submit additional feedback anytime through 
              the feedback form in your dashboard, or simply reply to this email.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Thank you for helping us make BoardGuru better! 🙏
            </p>
          </div>
        </div>
        
    ${getEmailFooter()}
  `

  return { subject, html }
}

/**
 * Generate a simple text fallback for email clients that don't support HTML
 */
export function generateFeedbackTextFallback(data: { subject: string; title: string; description: string; userEmail: string }): string {
  return `
${data.subject}

New feedback received:

Title: ${data.title}
From: ${data.userEmail}
Description: ${data.description}

This email requires HTML support to display properly. Please use an email client that supports HTML emails.

---
BoardGuru Feedback System
  `.trim()
}

/**
 * Generate confirmation text fallback
 */
export function generateConfirmationTextFallback(data: { subject: string; title: string; referenceId: string }): string {
  return `
${data.subject}

Thank you for your feedback!

Your feedback "${data.title}" has been received and assigned reference ID #${data.referenceId}.

Our team will review your submission within 1-2 business days and respond if needed.

This email requires HTML support to display properly. Please use an email client that supports HTML emails.

---
BoardGuru
  `.trim()
}