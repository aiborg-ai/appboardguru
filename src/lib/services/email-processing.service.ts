/**
 * Email Processing Service
 * Business logic for email-to-asset ingestion system
 * Follows CLAUDE.md DDD architecture patterns
 */

import { BaseService } from './base.service'
import { EmailProcessingRepository } from '../repositories/email-processing.repository'
import { AssetService } from './asset.service'
import { UserRepository } from '../repositories/user.repository'
import { NotificationService } from './notification.service'
import { Result, success, failure, RepositoryError } from '../repositories/result'
import { 
  InboundEmailData,
  EmailProcessingResult,
  EmailValidationResult,
  EmailProcessingConfig,
  ProcessEmailRequest,
  ProcessEmailResponse,
  EmailAssetCreationResult,
  EmailProcessingStatus,
  EmailProcessingNotification,
  SendGridWebhookPayload
} from '../../types/email-processing'
import { UserId, AssetId, OrganizationId, VaultId } from '../../types/branded'
import { createSupabaseClient } from '../supabase/client'

export interface IEmailProcessingService {
  processInboundEmail(request: ProcessEmailRequest): Promise<Result<EmailProcessingResult>>
  validateEmailData(emailData: InboundEmailData): Promise<Result<EmailValidationResult>>
  parseWebhookPayload(payload: SendGridWebhookPayload): Result<InboundEmailData>
  getUserProcessingStats(userId: UserId): Promise<Result<any>>
  checkUserRateLimit(userId: UserId): Promise<Result<{ withinLimit: boolean; resetAt: Date }>>
}

export class EmailProcessingService extends BaseService implements IEmailProcessingService {
  private emailRepo: EmailProcessingRepository
  private assetService: AssetService
  private userRepo: UserRepository
  private notificationService: NotificationService

  // Default configuration
  private readonly defaultConfig: EmailProcessingConfig = {
    maxAttachmentSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif'
    ],
    maxAttachmentsPerEmail: 10,
    virusScanningEnabled: true,
    rateLimitPerUser: 10, // emails per hour
    subjectPrefix: 'Asset::'
  }

  constructor(supabase: any) {
    super(supabase)
    this.emailRepo = new EmailProcessingRepository(supabase)
    this.assetService = new AssetService(supabase)
    this.userRepo = new UserRepository(supabase)
    this.notificationService = new NotificationService(supabase)
  }

  /**
   * Parse SendGrid webhook payload to internal email data format
   */
  parseWebhookPayload(payload: SendGridWebhookPayload): Result<InboundEmailData> {
    try {
      // Extract attachments from SendGrid format
      const attachments = payload.attachment_info 
        ? JSON.parse(payload.attachment_info) 
        : []

      const emailData: InboundEmailData = {
        messageId: payload.email || `${Date.now()}-${Math.random()}`,
        from: payload.from,
        to: payload.email,
        subject: payload.subject,
        textBody: payload.text,
        htmlBody: payload.html,
        attachments: attachments.map((att: any) => ({
          filename: att.filename,
          contentType: att.type,
          size: att.size || 0,
          content: payload[att.filename] || '', // SendGrid puts file content in separate field
        })),
        receivedAt: new Date(),
        headers: {
          dkim: payload.dkim,
          spf: payload.SPF,
          envelope: payload.envelope
        }
      }

      return success(emailData)
    } catch (error) {
      return failure(new RepositoryError(
        `Failed to parse webhook payload: ${error}`,
        'PARSE_WEBHOOK_FAILED',
        { error, payload }
      ))
    }
  }

  /**
   * Validate email data before processing
   */
  async validateEmailData(emailData: InboundEmailData): Promise<Result<EmailValidationResult>> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Check subject prefix
      if (!emailData.subject.startsWith(this.defaultConfig.subjectPrefix)) {
        errors.push(`Subject must start with "${this.defaultConfig.subjectPrefix}"`)
      }

      // Validate sender email
      const userResult = await this.userRepo.findByEmail(emailData.from)
      if (!userResult.success) {
        errors.push('Failed to validate sender email')
      } else if (!userResult.data) {
        errors.push('Sender email not found in registered users')
      }

      // Validate attachments
      if (emailData.attachments.length === 0) {
        warnings.push('No attachments found in email')
      } else if (emailData.attachments.length > this.defaultConfig.maxAttachmentsPerEmail) {
        errors.push(`Too many attachments (max: ${this.defaultConfig.maxAttachmentsPerEmail})`)
      }

      // Check file types and sizes
      for (const attachment of emailData.attachments) {
        if (!this.defaultConfig.allowedMimeTypes.includes(attachment.contentType)) {
          errors.push(`File type not allowed: ${attachment.contentType} (${attachment.filename})`)
        }
        
        if (attachment.size > this.defaultConfig.maxAttachmentSize) {
          errors.push(`File too large: ${attachment.filename} (${attachment.size} bytes)`)
        }
      }

      const result: EmailValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        user: userResult.success && userResult.data ? {
          id: userResult.data.id,
          email: userResult.data.email,
          organizationId: userResult.data.organization_id
        } : undefined
      }

      return success(result)
    } catch (error) {
      return failure(new RepositoryError(
        `Email validation failed: ${error}`,
        'EMAIL_VALIDATION_FAILED',
        { error, emailData }
      ))
    }
  }

  /**
   * Process inbound email and create assets from attachments
   */
  async processInboundEmail(request: ProcessEmailRequest): Promise<Result<EmailProcessingResult>> {
    const startTime = Date.now()
    const config = { ...this.defaultConfig, ...request.config }
    const { emailData } = request

    try {
      // Create initial processing log
      const logResult = await this.emailRepo.createProcessingLog({
        messageId: emailData.messageId,
        fromEmail: emailData.from,
        toEmail: emailData.to,
        subject: emailData.subject,
        status: 'processing'
      })

      if (!logResult.success) {
        return failure(logResult.error)
      }

      const processingId = logResult.data.id

      // Validate email data
      const validationResult = await this.validateEmailData(emailData)
      if (!validationResult.success) {
        await this.emailRepo.updateProcessingStatus(processingId, {
          status: 'failed',
          errorMessage: 'Validation failed',
          processingTimeMs: Date.now() - startTime
        })
        return failure(validationResult.error)
      }

      const validation = validationResult.data
      if (!validation.isValid) {
        await this.emailRepo.updateProcessingStatus(processingId, {
          status: 'rejected',
          errorMessage: validation.errors.join(', '),
          processingTimeMs: Date.now() - startTime
        })

        return success({
          processingId,
          status: 'rejected',
          assetsCreated: [],
          errors: validation.errors,
          warnings: validation.warnings,
          processedAt: new Date(),
          processingTimeMs: Date.now() - startTime
        })
      }

      // Check rate limiting
      const rateLimitResult = await this.checkUserRateLimit(validation.user!.id)
      if (!rateLimitResult.success || !rateLimitResult.data.withinLimit) {
        await this.emailRepo.updateProcessingStatus(processingId, {
          status: 'rejected',
          errorMessage: 'Rate limit exceeded',
          processingTimeMs: Date.now() - startTime
        })

        return success({
          processingId,
          status: 'rejected',
          assetsCreated: [],
          errors: ['Rate limit exceeded'],
          warnings: [],
          processedAt: new Date(),
          processingTimeMs: Date.now() - startTime
        })
      }

      // Process attachments and create assets
      const assetsCreated: EmailAssetCreationResult[] = []
      const processingErrors: string[] = []

      for (const attachment of emailData.attachments) {
        try {
          // Create asset from attachment
          const assetResult = await this.createAssetFromAttachment(
            attachment,
            validation.user!,
            emailData
          )

          if (assetResult.success) {
            assetsCreated.push(assetResult.data)
          } else {
            processingErrors.push(`Failed to process ${attachment.filename}: ${assetResult.error.message}`)
          }
        } catch (error) {
          processingErrors.push(`Error processing ${attachment.filename}: ${error}`)
        }
      }

      // Determine final status
      const finalStatus: EmailProcessingStatus = 
        processingErrors.length === 0 ? 'completed' :
        assetsCreated.length > 0 ? 'completed' : 'failed'

      // Update processing log with results
      await this.emailRepo.updateProcessingStatus(processingId, {
        status: finalStatus,
        assetsCreated: assetsCreated.map(asset => asset.assetId),
        errorMessage: processingErrors.length > 0 ? processingErrors.join('; ') : undefined,
        processingTimeMs: Date.now() - startTime
      })

      // Send notifications
      if (assetsCreated.length > 0) {
        await this.sendProcessingNotification({
          userId: validation.user!.id,
          type: processingErrors.length > 0 ? 'warning' : 'success',
          emailSubject: emailData.subject,
          assetsCreated: assetsCreated.length,
          message: `Successfully processed ${assetsCreated.length} assets from email`,
          processingId
        })
      }

      const result: EmailProcessingResult = {
        processingId,
        status: finalStatus,
        assetsCreated,
        errors: processingErrors,
        warnings: validation.warnings,
        processedAt: new Date(),
        processingTimeMs: Date.now() - startTime
      }

      return success(result)
    } catch (error) {
      return failure(new RepositoryError(
        `Email processing failed: ${error}`,
        'EMAIL_PROCESSING_FAILED',
        { error, emailData }
      ))
    }
  }

  /**
   * Create asset from email attachment
   */
  private async createAssetFromAttachment(
    attachment: any,
    user: { id: UserId; organizationId: OrganizationId },
    emailData: InboundEmailData
  ): Promise<Result<EmailAssetCreationResult>> {
    try {
      // Convert attachment content to Buffer
      const buffer = Buffer.isBuffer(attachment.content) 
        ? attachment.content 
        : Buffer.from(attachment.content, 'base64')

      // Create asset using asset service
      const assetData = {
        file: buffer,
        fileName: attachment.filename,
        mimeType: attachment.contentType,
        size: attachment.size,
        vaultId: 'default-vault' as VaultId, // TODO: Determine appropriate vault
        userId: user.id,
        organizationId: user.organizationId,
        description: `Asset created from email: ${emailData.subject}`,
        metadata: {
          source: 'email',
          originalSubject: emailData.subject,
          senderEmail: emailData.from,
          processedAt: new Date().toISOString()
        }
      }

      const createResult = await this.assetService.uploadAsset(assetData)
      
      if (!createResult.success) {
        return failure(createResult.error)
      }

      const asset = createResult.data
      const result: EmailAssetCreationResult = {
        assetId: asset.id,
        originalFilename: attachment.filename,
        processedFilename: asset.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        createdAt: new Date()
      }

      return success(result)
    } catch (error) {
      return failure(new RepositoryError(
        `Failed to create asset from attachment: ${error}`,
        'CREATE_ASSET_FROM_ATTACHMENT_FAILED',
        { error, attachment, user }
      ))
    }
  }

  /**
   * Send notification about email processing result
   */
  private async sendProcessingNotification(notification: EmailProcessingNotification): Promise<void> {
    try {
      await this.notificationService.createNotification({
        userId: notification.userId,
        type: 'email_processing',
        title: `Email Assets ${notification.type === 'success' ? 'Processed' : 'Processing Issues'}`,
        message: notification.message,
        metadata: {
          processingId: notification.processingId,
          emailSubject: notification.emailSubject,
          assetsCreated: notification.assetsCreated
        }
      })
    } catch (error) {
      console.error('Failed to send processing notification:', error)
    }
  }

  /**
   * Get processing statistics for a user
   */
  async getUserProcessingStats(userId: UserId): Promise<Result<any>> {
    return this.emailRepo.getUserProcessingStats(userId)
  }

  /**
   * Check if user is within rate limits
   */
  async checkUserRateLimit(userId: UserId): Promise<Result<{ withinLimit: boolean; resetAt: Date }>> {
    return this.emailRepo.checkRateLimit(userId, 1) // 1 hour window
  }
}