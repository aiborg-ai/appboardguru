import { BaseService } from './base.service'
import { emailConfig, emailSubjects } from '@/config/email.config'
import nodemailer from 'nodemailer'
import type { 
  NotificationType, 
  Notification,
  InviteUserRequest,
  VaultBroadcast 
} from '@/types'

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

interface NotificationData {
  type: NotificationType
  title: string
  message?: string
  userId?: string
  email?: string
  metadata?: Record<string, any>
}

export class NotificationService extends BaseService {
  private transporter?: nodemailer.Transporter

  constructor(supabase: any) {
    super(supabase)
    this.initializeTransporter()
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter() {
    if (!emailConfig.features.enabled) {
      return
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: emailConfig.smtp.auth,
        tls: emailConfig.smtp.tls,
      })
    } catch (error) {
      console.error('Failed to initialize email transporter:', error)
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(
    to: string | string[],
    template: EmailTemplate,
    category: string = 'transactional'
  ): Promise<boolean> {
    if (!this.transporter || !emailConfig.features.enabled) {
      console.warn('Email service not configured, skipping email send')
      return false
    }

    try {
      const recipients = Array.isArray(to) ? to : [to]
      
      const mailOptions = {
        from: {
          name: emailConfig.defaults.from.name,
          address: emailConfig.defaults.from.address,
        },
        to: recipients.join(', '),
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: emailConfig.defaults.replyTo,
        headers: {
          'X-Category': category,
          'X-Priority': 'normal',
        },
      }

      const result = await this.transporter.sendMail(mailOptions)
      
      await this.logActivity('send_email', 'notification', undefined, {
        to: recipients,
        subject: template.subject,
        category,
        messageId: result.messageId,
      })

      return true
    } catch (error) {
      console.error('Failed to send email:', error)
      await this.logActivity('email_failed', 'notification', undefined, {
        to,
        error: error.message,
        category,
      })
      return false
    }
  }

  /**
   * Send organization invitation
   */
  async sendOrganizationInvitation(
    email: string,
    organizationName: string,
    inviterName: string,
    invitationToken: string,
    role: string,
    personalMessage?: string
  ): Promise<boolean> {
    const invitationUrl = `${emailConfig.templates.baseUrl}/invitations/accept?token=${invitationToken}`
    
    const template = this.createInvitationTemplate({
      type: 'organization',
      email,
      organizationName,
      inviterName,
      role,
      invitationUrl,
      personalMessage,
    })

    return await this.sendEmail(email, template, 'invitations')
  }

  /**
   * Send vault invitation
   */
  async sendVaultInvitation(
    email: string,
    vaultName: string,
    organizationName: string,
    inviterName: string,
    invitationToken: string,
    message?: string
  ): Promise<boolean> {
    const invitationUrl = `${emailConfig.templates.baseUrl}/vaults/accept?token=${invitationToken}`
    
    const template = this.createVaultInvitationTemplate({
      email,
      vaultName,
      organizationName,
      inviterName,
      invitationUrl,
      message,
    })

    return await this.sendEmail(email, template, 'invitations')
  }

  /**
   * Send welcome email after registration approval
   */
  async sendWelcomeEmail(
    email: string,
    fullName: string,
    tempPassword: string
  ): Promise<boolean> {
    const loginUrl = `${emailConfig.templates.baseUrl}/auth/signin`
    
    const template = this.createWelcomeTemplate({
      email,
      fullName,
      tempPassword,
      loginUrl,
    })

    return await this.sendEmail(email, template, 'authentication')
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${emailConfig.templates.baseUrl}/auth/reset-password?token=${resetToken}`
    
    const template = this.createPasswordResetTemplate({
      email,
      resetUrl,
    })

    return await this.sendEmail(email, template, 'authentication')
  }

  /**
   * Send registration request notification to admin
   */
  async sendRegistrationRequestNotification(
    userEmail: string,
    fullName: string,
    company?: string,
    message?: string
  ): Promise<boolean> {
    const adminUrl = `${emailConfig.templates.baseUrl}/admin/registrations`
    
    const template = this.createRegistrationNotificationTemplate({
      userEmail,
      fullName,
      company,
      message,
      adminUrl,
    })

    return await this.sendEmail(emailConfig.addresses.admin, template, 'notifications')
  }

  /**
   * Send asset share notification
   */
  async sendAssetShareNotification(
    emails: string[],
    assetTitle: string,
    sharedBy: string,
    message?: string
  ): Promise<boolean> {
    const template = this.createAssetShareTemplate({
      assetTitle,
      sharedBy,
      message,
    })

    return await this.sendEmail(emails, template, 'notifications')
  }

  /**
   * Create in-app notification
   */
  async createNotification(data: NotificationData): Promise<void> {
    try {
      if (data.userId) {
        // Store in database for in-app notifications
        await this.supabase.from('notifications').insert({
          user_id: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          metadata: data.metadata,
          created_at: new Date().toISOString(),
          read_at: null,
        })
      }

      // Also send email if configured
      if (data.email && data.type === 'info') {
        const template = this.createGenericNotificationTemplate({
          title: data.title,
          message: data.message || '',
        })
        
        await this.sendEmail(data.email, template, 'notifications')
      }

      await this.logActivity('create_notification', 'notification', undefined, data)
    } catch (error) {
      this.handleError(error, 'createNotification', data)
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await this.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId)

      await this.logActivity('mark_notification_read', 'notification', notificationId)
    } catch (error) {
      this.handleError(error, 'markAsRead', { notificationId, userId })
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = options
      const offset = (page - 1) * limit

      let query = this.supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)

      if (unreadOnly) {
        query = query.is('read_at', null)
      }

      const { data: notifications, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        throw error
      }

      return {
        notifications: notifications || [],
        pagination: this.createPaginationMeta(count || 0, page, limit),
        unreadCount: unreadOnly ? count || 0 : undefined,
      }
    } catch (error) {
      this.handleError(error, 'getUserNotifications', { userId, options })
    }
  }

  // Template creation methods
  private createInvitationTemplate(data: any): EmailTemplate {
    const subject = `You've been invited to join ${data.organizationName}`
    
    return {
      subject,
      html: this.generateInvitationHTML(data),
      text: this.generateInvitationText(data),
    }
  }

  private createVaultInvitationTemplate(data: any): EmailTemplate {
    const subject = `New vault shared: ${data.vaultName}`
    
    return {
      subject,
      html: this.generateVaultInvitationHTML(data),
      text: this.generateVaultInvitationText(data),
    }
  }

  private createWelcomeTemplate(data: any): EmailTemplate {
    return {
      subject: 'Welcome to BoardGuru',
      html: this.generateWelcomeHTML(data),
      text: this.generateWelcomeText(data),
    }
  }

  private createPasswordResetTemplate(data: any): EmailTemplate {
    return {
      subject: 'Reset your BoardGuru password',
      html: this.generatePasswordResetHTML(data),
      text: this.generatePasswordResetText(data),
    }
  }

  private createRegistrationNotificationTemplate(data: any): EmailTemplate {
    return {
      subject: 'New user registration requires approval',
      html: this.generateRegistrationNotificationHTML(data),
      text: this.generateRegistrationNotificationText(data),
    }
  }

  private createAssetShareTemplate(data: any): EmailTemplate {
    return {
      subject: `New document shared: ${data.assetTitle}`,
      html: this.generateAssetShareHTML(data),
      text: this.generateAssetShareText(data),
    }
  }

  private createGenericNotificationTemplate(data: any): EmailTemplate {
    return {
      subject: data.title,
      html: this.generateGenericNotificationHTML(data),
      text: this.generateGenericNotificationText(data),
    }
  }

  // HTML template generators (simplified versions)
  private generateInvitationHTML(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited to join ${data.organizationName}</h2>
        <p>Hi there,</p>
        <p>${data.inviterName} has invited you to join ${data.organizationName} as a ${data.role}.</p>
        ${data.personalMessage ? `<div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;"><em>"${data.personalMessage}"</em></div>` : ''}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.invitationUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
        </div>
        <p>This invitation will expire in 7 days.</p>
        <hr>
        <p style="color: #666; font-size: 14px;">${emailConfig.templates.footerText}</p>
      </div>
    `
  }

  private generateInvitationText(data: any): string {
    return `
You're invited to join ${data.organizationName}

Hi there,

${data.inviterName} has invited you to join ${data.organizationName} as a ${data.role}.

${data.personalMessage ? `Personal message: "${data.personalMessage}"` : ''}

Accept your invitation: ${data.invitationUrl}

This invitation will expire in 7 days.

${emailConfig.templates.footerText}
    `.trim()
  }

  // Additional template generators would follow similar patterns...
  private generateVaultInvitationHTML(data: any): string {
    return `<div>Vault invitation HTML template for ${data.vaultName}</div>`
  }

  private generateVaultInvitationText(data: any): string {
    return `Vault invitation text template for ${data.vaultName}`
  }

  private generateWelcomeHTML(data: any): string {
    return `<div>Welcome HTML template for ${data.fullName}</div>`
  }

  private generateWelcomeText(data: any): string {
    return `Welcome text template for ${data.fullName}`
  }

  private generatePasswordResetHTML(data: any): string {
    return `<div>Password reset HTML template</div>`
  }

  private generatePasswordResetText(data: any): string {
    return `Password reset text template`
  }

  private generateRegistrationNotificationHTML(data: any): string {
    return `<div>Registration notification HTML template for ${data.fullName}</div>`
  }

  private generateRegistrationNotificationText(data: any): string {
    return `Registration notification text template for ${data.fullName}`
  }

  private generateAssetShareHTML(data: any): string {
    return `<div>Asset share HTML template for ${data.assetTitle}</div>`
  }

  private generateAssetShareText(data: any): string {
    return `Asset share text template for ${data.assetTitle}`
  }

  private generateGenericNotificationHTML(data: any): string {
    return `<div>Generic notification HTML template: ${data.title}</div>`
  }

  private generateGenericNotificationText(data: any): string {
    return `Generic notification text template: ${data.title}`
  }
}