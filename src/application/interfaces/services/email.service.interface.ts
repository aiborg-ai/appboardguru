/**
 * Email Service Interface
 * Defines the contract for email operations
 */

import { Result } from '@/01-shared/lib/result';

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface WelcomeEmailData {
  to: string;
  name: string;
  activationLink: string;
}

export interface PasswordResetEmailData {
  to: string;
  name: string;
  resetLink: string;
  expiresIn: string;
}

export interface MeetingInviteEmailData {
  to: string;
  name: string;
  meetingTitle: string;
  meetingDate: Date;
  meetingLink?: string;
  agenda?: string;
}

export interface NotificationEmailData {
  to: string;
  subject: string;
  message: string;
  actionLink?: string;
  actionText?: string;
}

export interface BulkEmailData {
  recipients: string[];
  subject: string;
  template: EmailTemplate;
  variables?: Record<string, unknown>;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  tags?: string[];
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface EmailSendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  pending?: string[];
}

export interface IEmailService {
  // Core email sending methods
  sendWelcomeEmail(data: WelcomeEmailData): Promise<Result<EmailSendResult>>;
  
  sendPasswordResetEmail(data: PasswordResetEmailData): Promise<Result<EmailSendResult>>;
  
  sendMeetingInviteEmail(data: MeetingInviteEmailData): Promise<Result<EmailSendResult>>;
  
  sendNotificationEmail(data: NotificationEmailData): Promise<Result<EmailSendResult>>;
  
  sendBulkEmail(data: BulkEmailData, options?: SendEmailOptions): Promise<Result<EmailSendResult>>;
  
  // Template management
  renderTemplate(templateName: string, variables: Record<string, unknown>): Promise<Result<EmailTemplate>>;
  
  // Email validation
  validateEmailAddress(email: string): Promise<Result<boolean>>;
  
  validateBulkEmails(emails: string[]): Promise<Result<{ valid: string[]; invalid: string[] }>>;
  
  // Queue management
  queueEmail(
    template: EmailTemplate,
    recipients: string[],
    sendAt?: Date,
    options?: SendEmailOptions
  ): Promise<Result<string>>; // Returns queue ID
  
  getQueueStatus(queueId: string): Promise<Result<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    processed: number;
    total: number;
    errors?: string[];
  }>>;
  
  cancelQueuedEmail(queueId: string): Promise<Result<void>>;
}