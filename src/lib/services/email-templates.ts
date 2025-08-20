/**
 * Email Templates for Organization Invitations
 * Professional HTML email templates with security features and branding
 */

export interface OrganizationInvitationData {
  invitationToken: string
  organizationName: string
  organizationSlug: string
  organizationLogo?: string
  inviterName: string
  inviterEmail: string
  recipientEmail: string
  role: string
  personalMessage?: string
  expiresAt: string
  acceptUrl: string
  rejectUrl?: string
}

export interface InvitationReminderData {
  invitationToken: string
  organizationName: string
  organizationSlug: string
  organizationLogo?: string
  inviterName: string
  recipientEmail: string
  role: string
  expiresAt: string
  acceptUrl: string
  daysRemaining: number
}

export interface InvitationAcceptedData {
  organizationName: string
  organizationSlug: string
  organizationLogo?: string
  memberName: string
  memberEmail: string
  role: string
  acceptedAt: string
  dashboardUrl: string
}

export interface InvitationRevokedData {
  organizationName: string
  organizationSlug: string
  organizationLogo?: string
  memberEmail: string
  role: string
  revokedBy: string
  reason?: string
}

/**
 * Generate the base email styles and header
 */
function getEmailHeader(organizationName: string, organizationLogo?: string): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        ${organizationLogo ? `
          <img src="${organizationLogo}" alt="${organizationName}" style="height: 40px; margin-bottom: 16px; border-radius: 4px;">
        ` : ''}
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎯 BoardGuru</h1>
        <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">${organizationName}</p>
      </div>
  `
}

/**
 * Generate the email footer
 */
function getEmailFooter(): string {
  return `
      <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 8px 0;">This email was sent automatically from the BoardGuru platform.</p>
        <p style="margin: 0;">If you have questions, please contact your organization administrator.</p>
      </div>
    </div>
  `
}

/**
 * Security notice component
 */
function getSecurityNotice(): string {
  return `
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">🔒 Security Notice</h4>
      <p style="color: #92400e; margin: 0; font-size: 12px; line-height: 1.4;">
        This invitation contains secure tokens. Never forward this email or share the invitation links.
        If you didn't expect this invitation, please ignore this email or contact your IT administrator.
      </p>
    </div>
  `
}

/**
 * Organization invitation email template
 */
export function organizationInvitationTemplate(data: OrganizationInvitationData): { subject: string; html: string } {
  const roleDisplayNames = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Member',
    viewer: 'Viewer'
  }

  const expiryDate = new Date(data.expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  const subject = `🎯 You're invited to join ${data.organizationName} on BoardGuru`

  const html = `
    ${getEmailHeader(data.organizationName, data.organizationLogo)}
        
        <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-bottom: 24px; font-size: 24px;">You're Invited to Join Our Team! 🎉</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
            <strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> 
            on BoardGuru as a <strong>${roleDisplayNames[data.role as keyof typeof roleDisplayNames] || data.role}</strong>.
          </p>

          ${data.personalMessage ? `
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <h4 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Personal Message from ${data.inviterName}:</h4>
              <p style="color: #1e40af; margin: 0; line-height: 1.5; font-style: italic;">"${data.personalMessage}"</p>
            </div>
          ` : ''}
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 30px 0;">
            <h3 style="color: #374151; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Invitation Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151; width: 40%;">Organization:</td>
                <td style="padding: 8px 0; color: #6b7280;">${data.organizationName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Your Role:</td>
                <td style="padding: 8px 0; color: #6b7280;">
                  <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 500;">
                    ${roleDisplayNames[data.role as keyof typeof roleDisplayNames] || data.role}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Invited by:</td>
                <td style="padding: 8px 0; color: #6b7280;">${data.inviterName} (${data.inviterEmail})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Expires:</td>
                <td style="padding: 8px 0; color: #ef4444; font-weight: 500;">${expiryDate}</td>
              </tr>
            </table>
          </div>
          
          <!-- Action Buttons -->
          <div style="text-align: center; margin: 40px 0;">
            <h3 style="color: #1f2937; margin-bottom: 24px; font-size: 20px;">Ready to Get Started?</h3>
            
            <a href="${data.acceptUrl}" 
               style="display: inline-block; background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin: 0 8px;">
              ✅ Accept Invitation
            </a>
            
            ${data.rejectUrl ? `
              <a href="${data.rejectUrl}" 
                 style="display: inline-block; background: #6b7280; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin: 0 8px;">
                ❌ Decline
              </a>
            ` : ''}
          </div>
          
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h4 style="color: #0c4a6e; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">🚀 What You Can Do Next:</h4>
            <ul style="color: #0c4a6e; margin: 0; padding-left: 24px; line-height: 1.6;">
              <li>Access board packs and organizational documents</li>
              <li>Collaborate with team members on board materials</li>
              <li>Use AI-powered summarization tools</li>
              <li>Participate in secure document sharing</li>
            </ul>
          </div>

          ${getSecurityNotice()}
          
          <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Need help? Contact your organization administrator or visit our help center.
            </p>
          </div>
        </div>
        
    ${getEmailFooter()}
  `

  return { subject, html }
}

/**
 * Invitation reminder email template
 */
export function invitationReminderTemplate(data: InvitationReminderData): { subject: string; html: string } {
  const roleDisplayNames = {
    owner: 'Owner',
    admin: 'Administrator', 
    member: 'Member',
    viewer: 'Viewer'
  }

  const expiryDate = new Date(data.expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const urgencyColor = data.daysRemaining <= 1 ? '#ef4444' : data.daysRemaining <= 3 ? '#f59e0b' : '#3b82f6'
  const urgencyIcon = data.daysRemaining <= 1 ? '🚨' : data.daysRemaining <= 3 ? '⚠️' : '⏰'

  const subject = `${urgencyIcon} Invitation Expires ${data.daysRemaining <= 1 ? 'Soon' : `in ${data.daysRemaining} days`} - ${data.organizationName}`

  const html = `
    ${getEmailHeader(data.organizationName, data.organizationLogo)}
        
        <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-bottom: 24px; font-size: 24px;">
            ${urgencyIcon} Your Invitation is Expiring Soon
          </h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
            You still have a pending invitation to join <strong>${data.organizationName}</strong> 
            as a <strong>${roleDisplayNames[data.role as keyof typeof roleDisplayNames] || data.role}</strong>.
          </p>

          <div style="background: ${urgencyColor === '#ef4444' ? '#fef2f2' : urgencyColor === '#f59e0b' ? '#fef3c7' : '#f0f9ff'}; border: 1px solid ${urgencyColor}; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: ${urgencyColor}; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
              ${urgencyIcon} Time Sensitive
            </h3>
            <p style="color: ${urgencyColor}; margin: 0; font-size: 16px; font-weight: 500;">
              ${data.daysRemaining <= 1 
                ? `Your invitation expires today at ${expiryDate}` 
                : `Your invitation expires in ${data.daysRemaining} days on ${expiryDate}`
              }
            </p>
          </div>
          
          <!-- Action Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${data.acceptUrl}" 
               style="display: inline-block; background: #059669; color: white; padding: 20px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              ✅ Accept Invitation Now
            </a>
          </div>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Quick Reminder:</h4>
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5;">
              <strong>Organization:</strong> ${data.organizationName}<br>
              <strong>Role:</strong> ${roleDisplayNames[data.role as keyof typeof roleDisplayNames] || data.role}<br>
              <strong>Invited by:</strong> ${data.inviterName}
            </p>
          </div>

          ${getSecurityNotice()}
        </div>
        
    ${getEmailFooter()}
  `

  return { subject, html }
}

/**
 * Invitation accepted notification email template (sent to inviter)
 */
export function invitationAcceptedTemplate(data: InvitationAcceptedData): { subject: string; html: string } {
  const roleDisplayNames = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Member', 
    viewer: 'Viewer'
  }

  const acceptedDate = new Date(data.acceptedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  const subject = `✅ ${data.memberName} accepted your invitation to ${data.organizationName}`

  const html = `
    ${getEmailHeader(data.organizationName, data.organizationLogo)}
        
        <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-bottom: 24px; font-size: 24px;">Great News! 🎉</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
            <strong>${data.memberName}</strong> (${data.memberEmail}) has accepted your invitation 
            to join <strong>${data.organizationName}</strong> as a 
            <strong>${roleDisplayNames[data.role as keyof typeof roleDisplayNames] || data.role}</strong>.
          </p>

          <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 24px; margin: 30px 0;">
            <h3 style="color: #15803d; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">✅ Invitation Accepted</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #374151; width: 30%;">New Member:</td>
                <td style="padding: 6px 0; color: #15803d;">${data.memberName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #374151;">Email:</td>
                <td style="padding: 6px 0; color: #15803d;">${data.memberEmail}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #374151;">Role:</td>
                <td style="padding: 6px 0; color: #15803d;">
                  <span style="background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 500;">
                    ${roleDisplayNames[data.role as keyof typeof roleDisplayNames] || data.role}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #374151;">Joined:</td>
                <td style="padding: 6px 0; color: #15803d;">${acceptedDate}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h4 style="color: #0c4a6e; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">🚀 Next Steps:</h4>
            <ul style="color: #0c4a6e; margin: 0; padding-left: 24px; line-height: 1.6;">
              <li>${data.memberName} can now access your organization's board packs</li>
              <li>They'll appear in your team member list</li>
              <li>You can manage their permissions from the organization settings</li>
              <li>Consider introducing them to the team and key resources</li>
            </ul>
          </div>
          
          <!-- Action Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${data.dashboardUrl}" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              🏠 Go to Organization Dashboard
            </a>
          </div>
        </div>
        
    ${getEmailFooter()}
  `

  return { subject, html }
}

/**
 * Invitation revoked notification email template
 */
export function invitationRevokedTemplate(data: InvitationRevokedData): { subject: string; html: string } {
  const roleDisplayNames = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Member',
    viewer: 'Viewer'
  }

  const subject = `Invitation to ${data.organizationName} has been withdrawn`

  const html = `
    ${getEmailHeader(data.organizationName, data.organizationLogo)}
        
        <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-bottom: 24px; font-size: 24px;">Invitation Update</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
            We wanted to let you know that your invitation to join <strong>${data.organizationName}</strong> 
            as a <strong>${roleDisplayNames[data.role as keyof typeof roleDisplayNames] || data.role}</strong> 
            has been withdrawn by an organization administrator.
          </p>

          <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 24px; margin: 30px 0;">
            <h3 style="color: #dc2626; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">📋 Invitation Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #374151; width: 30%;">Organization:</td>
                <td style="padding: 6px 0; color: #dc2626;">${data.organizationName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #374151;">Role:</td>
                <td style="padding: 6px 0; color: #dc2626;">${roleDisplayNames[data.role as keyof typeof roleDisplayNames] || data.role}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #374151;">Revoked by:</td>
                <td style="padding: 6px 0; color: #dc2626;">${data.revokedBy}</td>
              </tr>
              ${data.reason ? `
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #374151; vertical-align: top;">Reason:</td>
                  <td style="padding: 6px 0; color: #dc2626; line-height: 1.4;">${data.reason}</td>
                </tr>
              ` : ''}
            </table>
          </div>

          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h4 style="color: #0c4a6e; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">ℹ️ What This Means:</h4>
            <ul style="color: #0c4a6e; margin: 0; padding-left: 24px; line-height: 1.6;">
              <li>Your invitation link is no longer valid</li>
              <li>You cannot join this organization with the previous invitation</li>
              <li>If this was done in error, please contact the organization administrator</li>
              <li>You may receive a new invitation if appropriate</li>
            </ul>
          </div>

          <p style="color: #6b7280; line-height: 1.6; margin-top: 30px; font-size: 16px;">
            If you believe this was done in error or have questions about this decision, 
            please reach out to the organization administrator or the person who originally invited you.
          </p>
        </div>
        
    ${getEmailFooter()}
  `

  return { subject, html }
}

/**
 * Generate a simple text fallback for email clients that don't support HTML
 */
export function generateTextFallback(data: { subject: string; organizationName: string; inviterName?: string }): string {
  return `
${data.subject}

You've been invited to join ${data.organizationName} on BoardGuru.

${data.inviterName ? `Invited by: ${data.inviterName}` : ''}

This email requires HTML support to display properly. Please use an email client that supports HTML emails or contact your organization administrator for assistance.

If you're having trouble viewing this email, please make sure your email client supports HTML content.

---
BoardGuru Platform
  `.trim()
}