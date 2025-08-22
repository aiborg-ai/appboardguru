import { AssetId, UserId, OrganizationId } from './branded'

/**
 * Email Processing Types
 * Defines the structure for email-to-asset ingestion system
 */

// Email processing status tracking
export type EmailProcessingStatus = 
  | 'received'      // Email received by webhook
  | 'processing'    // Currently processing attachments
  | 'completed'     // Successfully processed all attachments
  | 'failed'        // Processing failed
  | 'rejected'      // Email rejected (invalid sender, format, etc.)

// Email attachment information
export interface EmailAttachment {
  filename: string
  contentType: string
  size: number
  content: Buffer | string  // Base64 encoded content
  contentId?: string
}

// Parsed email data from webhook
export interface InboundEmailData {
  messageId: string
  from: string
  to: string
  subject: string
  textBody?: string
  htmlBody?: string
  attachments: EmailAttachment[]
  receivedAt: Date
  headers: Record<string, string>
}

// Email processing validation result
export interface EmailValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  user?: {
    id: UserId
    email: string
    organizationId: OrganizationId
  }
}

// Asset creation result from email
export interface EmailAssetCreationResult {
  assetId: AssetId
  originalFilename: string
  processedFilename: string
  contentType: string
  size: number
  createdAt: Date
}

// Complete email processing result
export interface EmailProcessingResult {
  processingId: string
  status: EmailProcessingStatus
  assetsCreated: EmailAssetCreationResult[]
  errors: string[]
  warnings: string[]
  processedAt: Date
  processingTimeMs: number
}

// Database record for email processing logs
export interface EmailProcessingLog {
  id: string
  messageId: string
  fromEmail: string
  toEmail: string
  subject: string
  status: EmailProcessingStatus
  userId?: UserId
  organizationId?: OrganizationId
  assetsCreated: AssetId[]
  errorMessage?: string
  processingTimeMs: number
  createdAt: Date
  updatedAt: Date
}

// Configuration for email processing
export interface EmailProcessingConfig {
  maxAttachmentSize: number        // Maximum file size in bytes
  allowedMimeTypes: string[]       // Allowed MIME types for attachments
  maxAttachmentsPerEmail: number   // Maximum number of attachments per email
  virusScanningEnabled: boolean    // Enable virus scanning
  rateLimitPerUser: number         // Max emails per user per hour
  subjectPrefix: string            // Required subject prefix (e.g., "Asset::")
}

// SendGrid inbound parse webhook payload
export interface SendGridWebhookPayload {
  dkim: string
  email: string
  subject: string
  from: string
  text: string
  html: string
  envelope: string
  attachments: string
  attachment_info: string
  charsets: string
  SPF: string
}

// Email processing request (internal)
export interface ProcessEmailRequest {
  emailData: InboundEmailData
  config?: Partial<EmailProcessingConfig>
}

// Email processing response (internal)
export interface ProcessEmailResponse {
  success: boolean
  result?: EmailProcessingResult
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// User notification data for processed emails
export interface EmailProcessingNotification {
  userId: UserId
  type: 'success' | 'failure' | 'warning'
  emailSubject: string
  assetsCreated: number
  message: string
  processingId: string
}

// Email template data for confirmations
export interface EmailConfirmationData {
  recipientEmail: string
  recipientName: string
  senderEmail: string
  originalSubject: string
  assetsCreated: EmailAssetCreationResult[]
  processingTime: number
  dashboardUrl: string
}