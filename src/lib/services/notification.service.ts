import { BaseService } from './base.service'
import { emailConfig, emailSubjects } from '@/config/email.config'
import * as nodemailer from 'nodemailer'
import type { 
  NotificationType, 
  Notification,
  InviteUserRequest,
  VaultBroadcast 
} from '../../types'
import type {
  NotificationPayload,
  NotificationChannel,
  NotificationPriority,
  NotificationDelivery,
  NotificationDeliveryStatus,
  NotificationCategory,
  ActivityMetadata,
  EmailDeliveryConfig,
  RetryPolicy
} from '@/types/entities/activity.types'

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
  metadata?: ActivityMetadata
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
  private initializeTransporter(): void {
    if (!emailConfig.features.enabled) {
      return
    }

    try {
      this.transporter = nodemailer.createTransport({
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
        error: error instanceof Error ? error.message : String(error),
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
          user_id: data.userId!,
          type: data.type,
          title: data.title,
          message: data.message,
          metadata: data.metadata as Record<string, unknown>,
          created_at: new Date().toISOString(),
          read_at: null,
        } as any)
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
  ): Promise<{
    notifications: any[]
    pagination: any
    unreadCount?: number
  }> {
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
  private createInvitationTemplate(data: {
    type: string
    email: string
    organizationName: string
    inviterName: string
    role: string
    invitationUrl: string
    personalMessage?: string
  }): EmailTemplate {
    const subject = `You've been invited to join ${data.organizationName}`
    
    return {
      subject,
      html: this.generateInvitationHTML(data),
      text: this.generateInvitationText(data),
    }
  }

  private createVaultInvitationTemplate(data: {
    email: string
    vaultName: string
    organizationName: string
    inviterName: string
    invitationUrl: string
    message?: string
  }): EmailTemplate {
    const subject = `New vault shared: ${data.vaultName}`
    
    return {
      subject,
      html: this.generateVaultInvitationHTML(data),
      text: this.generateVaultInvitationText(data),
    }
  }

  private createWelcomeTemplate(data: {
    email: string
    fullName: string
    tempPassword: string
    loginUrl: string
  }): EmailTemplate {
    return {
      subject: 'Welcome to BoardGuru',
      html: this.generateWelcomeHTML(data),
      text: this.generateWelcomeText(data),
    }
  }

  private createPasswordResetTemplate(data: {
    email: string
    resetUrl: string
  }): EmailTemplate {
    return {
      subject: 'Reset your BoardGuru password',
      html: this.generatePasswordResetHTML(data),
      text: this.generatePasswordResetText(data),
    }
  }

  private createRegistrationNotificationTemplate(data: {
    userEmail: string
    fullName: string
    company?: string
    message?: string
    adminUrl: string
  }): EmailTemplate {
    return {
      subject: 'New user registration requires approval',
      html: this.generateRegistrationNotificationHTML(data),
      text: this.generateRegistrationNotificationText(data),
    }
  }

  private createAssetShareTemplate(data: {
    assetTitle: string
    sharedBy: string
    message?: string
  }): EmailTemplate {
    return {
      subject: `New document shared: ${data.assetTitle}`,
      html: this.generateAssetShareHTML(data),
      text: this.generateAssetShareText(data),
    }
  }

  private createGenericNotificationTemplate(data: {
    title: string
    message: string
  }): EmailTemplate {
    return {
      subject: data.title,
      html: this.generateGenericNotificationHTML(data),
      text: this.generateGenericNotificationText(data),
    }
  }

  // HTML template generators (simplified versions)
  private generateInvitationHTML(data: {
    type: string
    organizationName: string
    inviterName: string
    role: string
    invitationUrl: string
    personalMessage?: string
  }): string {
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

  private generateInvitationText(data: {
    organizationName: string
    inviterName: string
    role: string
    invitationUrl: string
    personalMessage?: string
  }): string {
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
  private generateVaultInvitationHTML(data: { vaultName: string }): string {
    return `<div>Vault invitation HTML template for ${data.vaultName}</div>`
  }

  private generateVaultInvitationText(data: { vaultName: string }): string {
    return `Vault invitation text template for ${data.vaultName}`
  }

  private generateWelcomeHTML(data: { fullName: string }): string {
    return `<div>Welcome HTML template for ${data.fullName}</div>`
  }

  private generateWelcomeText(data: { fullName: string }): string {
    return `Welcome text template for ${data.fullName}`
  }

  private generatePasswordResetHTML(data: Record<string, unknown>): string {
    return `<div>Password reset HTML template</div>`
  }

  private generatePasswordResetText(data: Record<string, unknown>): string {
    return `Password reset text template`
  }

  private generateRegistrationNotificationHTML(data: { fullName: string }): string {
    return `<div>Registration notification HTML template for ${data.fullName}</div>`
  }

  private generateRegistrationNotificationText(data: { fullName: string }): string {
    return `Registration notification text template for ${data.fullName}`
  }

  private generateAssetShareHTML(data: { assetTitle: string }): string {
    return `<div>Asset share HTML template for ${data.assetTitle}</div>`
  }

  private generateAssetShareText(data: { assetTitle: string }): string {
    return `Asset share text template for ${data.assetTitle}`
  }

  private generateGenericNotificationHTML(data: { title: string }): string {
    return `<div>Generic notification HTML template: ${data.title}</div>`
  }

  private generateGenericNotificationText(data: { title: string }): string {
    return `Generic notification text template: ${data.title}`
  }

  // =============================================
  // COMPLIANCE-SPECIFIC NOTIFICATION METHODS
  // =============================================

  /**
   * Create compliance deadline reminder notification
   */
  async createComplianceDeadlineNotification(data: {
    userId: string
    organizationId: string
    title: string
    regulationType: string
    dueDate: string
    priority: NotificationPriority
    actionUrl?: string
    requiresAcknowledgment?: boolean
    calendarEntryId?: string
  }): Promise<void> {
    try {
      const daysUntilDue = Math.ceil(
        (new Date(data.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )

      let urgencyText = ''
      if (daysUntilDue <= 0) {
        urgencyText = 'OVERDUE: '
      } else if (daysUntilDue <= 3) {
        urgencyText = 'URGENT: '
      } else if (daysUntilDue <= 7) {
        urgencyText = 'Important: '
      }

      const message = `${data.regulationType} compliance deadline is ${
        daysUntilDue <= 0 ? 'overdue' : `due in ${daysUntilDue} days`
      }. Please review and take necessary action.`

      await this.supabase
        .from('notifications')
        .insert({
          user_id: data.userId,
          organization_id: data.organizationId,
          type: 'reminder',
          category: 'compliance_deadline',
          title: `${urgencyText}${data.title}`,
          message,
          priority: data.priority,
          action_url: data.actionUrl,
          action_text: 'View Compliance Details',
          icon: 'alert-triangle',
          color: this.getPriorityColor(data.priority),
          resource_type: 'compliance_calendar',
          resource_id: data.calendarEntryId,
          compliance_type: data.regulationType,
          deadline_type: 'regulatory',
          requires_acknowledgment: data.requiresAcknowledgment || false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })

      // Send email notification for critical/high priority items
      if (['critical', 'high'].includes(data.priority)) {
        const { data: user } = await this.supabase
          .from('users')
          .select('email, full_name')
          .eq('id', data.userId)
          .single()

        if (user?.email) {
          const template = this.createComplianceDeadlineTemplate({
            title: data.title,
            regulationType: data.regulationType,
            dueDate: data.dueDate,
            daysUntilDue,
            actionUrl: data.actionUrl,
            urgencyText
          })

          await this.sendEmail(user.email, template, 'compliance_deadline')
        }
      }

      await this.logActivity('create_compliance_deadline_notification', 'compliance_notification', undefined, data)
    } catch (error) {
      this.handleError(error, 'createComplianceDeadlineNotification', data)
    }
  }

  /**
   * Create workflow assignment notification
   */
  async createWorkflowAssignmentNotification(data: {
    userId: string
    organizationId: string
    workflowId: string
    workflowName: string
    regulationType: string
    stepName?: string
    dueDate?: string
    assignerName: string
    actionUrl?: string
  }): Promise<void> {
    try {
      const title = `Compliance Task Assigned: ${data.workflowName}`
      const message = `${data.assignerName} has assigned you to a compliance workflow${
        data.stepName ? ` - Step: ${data.stepName}` : ''
      }. ${data.dueDate ? `Due: ${new Date(data.dueDate).toLocaleDateString()}` : ''}`

      await this.supabase
        .from('notifications')
        .insert({
          user_id: data.userId,
          organization_id: data.organizationId,
          type: 'reminder',
          category: 'workflow_assignment',
          title,
          message,
          priority: 'medium',
          action_url: data.actionUrl,
          action_text: 'View Workflow',
          icon: 'briefcase',
          color: '#3B82F6',
          resource_type: 'notification_workflows',
          resource_id: data.workflowId,
          workflow_id: data.workflowId,
          compliance_type: data.regulationType,
          requires_acknowledgment: true
        })

      await this.logActivity('create_workflow_assignment_notification', 'compliance_notification', data.workflowId, data)
    } catch (error) {
      this.handleError(error, 'createWorkflowAssignmentNotification', data)
    }
  }

  /**
   * Create escalation notification
   */
  async createEscalationNotification(data: {
    userId: string
    organizationId: string
    workflowId: string
    workflowName: string
    originalAssignee: string
    escalationLevel: number
    overdueDays: number
    actionUrl?: string
  }): Promise<void> {
    try {
      const title = `ESCALATED: ${data.workflowName}`
      const message = `Compliance workflow escalated to you (Level ${data.escalationLevel}). Originally assigned to ${data.originalAssignee}. Overdue by ${data.overdueDays} days.`

      await this.supabase
        .from('notifications')
        .insert({
          user_id: data.userId,
          organization_id: data.organizationId,
          type: 'security',
          category: 'escalation',
          title,
          message,
          priority: 'critical',
          action_url: data.actionUrl,
          action_text: 'Review Escalated Task',
          icon: 'alert-circle',
          color: '#DC2626',
          resource_type: 'notification_workflows',
          resource_id: data.workflowId,
          workflow_id: data.workflowId,
          escalation_level: data.escalationLevel,
          requires_acknowledgment: true
        })

      await this.logActivity('create_escalation_notification', 'compliance_notification', data.workflowId, data)
    } catch (error) {
      this.handleError(error, 'createEscalationNotification', data)
    }
  }

  /**
   * Create workflow completion notification
   */
  async createWorkflowCompletionNotification(data: {
    userId: string
    organizationId: string
    workflowId: string
    workflowName: string
    completedBy: string
    completionDate: string
    actionUrl?: string
  }): Promise<void> {
    try {
      const title = `Compliance Task Completed: ${data.workflowName}`
      const message = `${data.completedBy} completed the compliance workflow on ${new Date(data.completionDate).toLocaleDateString()}.`

      await this.supabase
        .from('notifications')
        .insert({
          user_id: data.userId,
          organization_id: data.organizationId,
          type: 'system',
          category: 'workflow_completion',
          title,
          message,
          priority: 'low',
          action_url: data.actionUrl,
          action_text: 'View Completed Workflow',
          icon: 'check-circle',
          color: '#10B981',
          resource_type: 'notification_workflows',
          resource_id: data.workflowId,
          workflow_id: data.workflowId
        })

      await this.logActivity('create_workflow_completion_notification', 'compliance_notification', data.workflowId, data)
    } catch (error) {
      this.handleError(error, 'createWorkflowCompletionNotification', data)
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkComplianceNotifications(
    userIds: readonly string[],
    notificationData: {
      readonly organizationId: string
      readonly type: 'deadline_reminder' | 'workflow_assignment' | 'escalation' | 'completion'
      readonly title: string
      readonly message: string
      readonly priority: NotificationPriority
      readonly actionUrl?: string
      readonly resourceType?: string
      readonly resourceId?: string
      readonly requiresAcknowledgment?: boolean
    }
  ): Promise<{ readonly successful: number; readonly failed: number }> {
    let successful = 0
    let failed = 0

    for (const userId of userIds) {
      try {
        await this.supabase
          .from('notifications')
          .insert({
            user_id: userId,
            organization_id: notificationData.organizationId,
            type: 'reminder',
            category: `compliance_${notificationData.type}`,
            title: notificationData.title,
            message: notificationData.message,
            priority: notificationData.priority,
            action_url: notificationData.actionUrl,
            action_text: 'Take Action',
            icon: this.getComplianceIcon(notificationData.type),
            color: this.getPriorityColor(notificationData.priority),
            resource_type: notificationData.resourceType,
            resource_id: notificationData.resourceId,
            requires_acknowledgment: notificationData.requiresAcknowledgment || false
          })
        
        successful++
      } catch (error) {
        console.error(`Failed to send notification to user ${userId}:`, error)
        failed++
      }
    }

    await this.logActivity('send_bulk_compliance_notifications', 'compliance_notification', undefined, {
      userCount: userIds.length,
      successful,
      failed,
      notificationType: notificationData.type
    })

    return { successful, failed }
  }

  // =============================================
  // COMPLIANCE EMAIL TEMPLATES
  // =============================================

  private createComplianceDeadlineTemplate(data: {
    title: string
    regulationType: string
    dueDate: string
    daysUntilDue: number
    actionUrl?: string
    urgencyText: string
  }): EmailTemplate {
    const subject = `${data.urgencyText}Compliance Deadline: ${data.title}`
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: ${data.daysUntilDue <= 0 ? '#DC2626' : data.daysUntilDue <= 3 ? '#F59E0B' : '#3B82F6'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${data.urgencyText}Compliance Deadline</h1>
        </div>
        
        <div style="padding: 20px; background: #F9FAFB; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1F2937; margin-top: 0;">${data.title}</h2>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p><strong>Regulation Type:</strong> ${data.regulationType}</p>
            <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${
              data.daysUntilDue <= 0 
                ? `<span style="color: #DC2626; font-weight: bold;">OVERDUE by ${Math.abs(data.daysUntilDue)} days</span>`
                : `<span style="color: #059669;">${data.daysUntilDue} days remaining</span>`
            }</p>
          </div>
          
          <p>This compliance requirement needs your immediate attention. Please review and take the necessary actions to ensure compliance.</p>
          
          ${data.actionUrl ? `
            <div style="text-align: center; margin: 20px 0;">
              <a href="${data.actionUrl}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View Compliance Details
              </a>
            </div>
          ` : ''}
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 14px; color: #6B7280;">
            <p>This is an automated compliance notification from BoardGuru.</p>
          </div>
        </div>
      </div>
    `

    const text = `
${data.urgencyText}Compliance Deadline: ${data.title}

Regulation Type: ${data.regulationType}
Due Date: ${new Date(data.dueDate).toLocaleDateString()}
Status: ${data.daysUntilDue <= 0 ? `OVERDUE by ${Math.abs(data.daysUntilDue)} days` : `${data.daysUntilDue} days remaining`}

This compliance requirement needs your immediate attention. Please review and take the necessary actions to ensure compliance.

${data.actionUrl ? `View Details: ${data.actionUrl}` : ''}

This is an automated compliance notification from BoardGuru.
    `.trim()

    return { subject, html, text }
  }

  // =============================================
  // HELPER METHODS FOR COMPLIANCE
  // =============================================

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical': return '#DC2626'
      case 'high': return '#F59E0B'
      case 'medium': return '#3B82F6'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  private getComplianceIcon(type: string): string {
    switch (type) {
      case 'deadline_reminder': return 'clock'
      case 'workflow_assignment': return 'briefcase'
      case 'escalation': return 'alert-triangle'
      case 'completion': return 'check-circle'
      default: return 'bell'
    }
  }

  /**
   * Get compliance notification statistics for dashboard
   */
  async getComplianceNotificationStats(organizationId: string): Promise<{
    readonly total: number
    readonly unread: number
    readonly byType: Record<string, number>
    readonly byPriority: Record<string, number>
  }> {
    try {
      const { data: notifications } = await this.supabase
        .from('notifications')
        .select('compliance_type, priority, status')
        .eq('organization_id', organizationId)
        .not('compliance_type', 'is', null)

      const stats = {
        total: notifications?.length || 0,
        unread: notifications?.filter(n => n.status === 'unread').length || 0,
        byType: {} as Record<string, number>,
        byPriority: {} as Record<string, number>
      }

      notifications?.forEach(notification => {
        if (notification.compliance_type) {
          stats.byType[notification.compliance_type] = (stats.byType[notification.compliance_type] || 0) + 1
        }
        const priority = notification.priority
        if (priority && typeof priority === 'string') {
          stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1
        }
      })

      return stats
    } catch (error) {
      this.handleError(error, 'getComplianceNotificationStats', { organizationId })
      return { total: 0, unread: 0, byType: {}, byPriority: {} }
    }
  }
}