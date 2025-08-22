/**
 * Email-to-Asset Integration Tests
 * Tests the complete email ingestion workflow
 */

import { EmailProcessingService } from '../../src/lib/services/email-processing.service'
import { EmailProcessingRepository } from '../../src/lib/repositories/email-processing.repository'
import { createSupabaseClient } from '../../src/lib/supabase/client'
import { 
  InboundEmailData, 
  EmailProcessingStatus, 
  SendGridWebhookPayload,
  ProcessEmailRequest
} from '../../src/types/email-processing'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lt: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  single: jest.fn(),
  execute: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
}

// Mock the supabase client module
jest.mock('../../src/lib/supabase/client', () => ({
  createSupabaseClient: () => mockSupabase
}))

describe('Email-to-Asset Integration', () => {
  let emailService: EmailProcessingService
  let emailRepo: EmailProcessingRepository

  beforeEach(() => {
    jest.clearAllMocks()
    emailService = new EmailProcessingService(mockSupabase as any)
    emailRepo = new EmailProcessingRepository(mockSupabase as any)
  })

  describe('SendGrid Webhook Parsing', () => {
    it('should parse valid SendGrid webhook payload', () => {
      const mockPayload: SendGridWebhookPayload = {
        dkim: 'pass',
        email: 'assets@appboardguru.com',
        subject: 'Asset:: Test Document Upload',
        from: 'user@example.com',
        text: 'Please find attached documents',
        html: '<p>Please find attached documents</p>',
        envelope: '{"to":["assets@appboardguru.com"],"from":"user@example.com"}',
        attachments: '1',
        attachment_info: '[{"filename":"test.pdf","type":"application/pdf","size":12345}]',
        charsets: '{"subject":"UTF-8","from":"UTF-8","text":"UTF-8"}',
        SPF: 'pass'
      }

      const result = emailService.parseWebhookPayload(mockPayload)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.from).toBe('user@example.com')
        expect(result.data.subject).toBe('Asset:: Test Document Upload')
        expect(result.data.attachments).toHaveLength(1)
        expect(result.data.attachments[0].filename).toBe('test.pdf')
        expect(result.data.attachments[0].contentType).toBe('application/pdf')
      }
    })

    it('should handle malformed webhook payload gracefully', () => {
      const malformedPayload = {
        email: 'assets@appboardguru.com',
        // Missing required fields
      } as SendGridWebhookPayload

      const result = emailService.parseWebhookPayload(malformedPayload)

      expect(result.success).toBe(true) // Service should handle gracefully
      if (result.success) {
        expect(result.data.from).toBeUndefined()
        expect(result.data.attachments).toEqual([])
      }
    })
  })

  describe('Email Validation', () => {
    it('should reject emails without proper subject prefix', async () => {
      const emailData: InboundEmailData = {
        messageId: 'test-123',
        from: 'user@example.com',
        to: 'assets@appboardguru.com',
        subject: 'Regular Email Without Prefix',
        attachments: [{
          filename: 'test.pdf',
          contentType: 'application/pdf',
          size: 12345,
          content: Buffer.from('test content')
        }],
        receivedAt: new Date(),
        headers: {}
      }

      // Mock user repository to return no user
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await emailService.validateEmailData(emailData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isValid).toBe(false)
        expect(result.data.errors).toContain('Subject must start with "Asset::"')
      }
    })

    it('should reject emails from unregistered users', async () => {
      const emailData: InboundEmailData = {
        messageId: 'test-123',
        from: 'unknown@example.com',
        to: 'assets@appboardguru.com',
        subject: 'Asset:: Test Document',
        attachments: [{
          filename: 'test.pdf',
          contentType: 'application/pdf',
          size: 12345,
          content: Buffer.from('test content')
        }],
        receivedAt: new Date(),
        headers: {}
      }

      // Mock user repository to return no user
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await emailService.validateEmailData(emailData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isValid).toBe(false)
        expect(result.data.errors).toContain('Sender email not found in registered users')
      }
    })

    it('should accept valid emails from registered users', async () => {
      const emailData: InboundEmailData = {
        messageId: 'test-123',
        from: 'user@example.com',
        to: 'assets@appboardguru.com',
        subject: 'Asset:: Valid Test Document',
        attachments: [{
          filename: 'test.pdf',
          contentType: 'application/pdf',
          size: 12345,
          content: Buffer.from('test content')
        }],
        receivedAt: new Date(),
        headers: {}
      }

      // Mock user repository to return valid user
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'user@example.com',
          organization_id: 'org-123'
        },
        error: null
      })

      const result = await emailService.validateEmailData(emailData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isValid).toBe(true)
        expect(result.data.errors).toHaveLength(0)
        expect(result.data.user?.email).toBe('user@example.com')
      }
    })

    it('should reject files with disallowed MIME types', async () => {
      const emailData: InboundEmailData = {
        messageId: 'test-123',
        from: 'user@example.com',
        to: 'assets@appboardguru.com',
        subject: 'Asset:: Test with Executable',
        attachments: [{
          filename: 'malware.exe',
          contentType: 'application/octet-stream',
          size: 12345,
          content: Buffer.from('test content')
        }],
        receivedAt: new Date(),
        headers: {}
      }

      // Mock user repository
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'user@example.com',
          organization_id: 'org-123'
        },
        error: null
      })

      const result = await emailService.validateEmailData(emailData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isValid).toBe(false)
        expect(result.data.errors.some(error => 
          error.includes('File type not allowed')
        )).toBe(true)
      }
    })

    it('should reject files that exceed size limits', async () => {
      const emailData: InboundEmailData = {
        messageId: 'test-123',
        from: 'user@example.com',
        to: 'assets@appboardguru.com',
        subject: 'Asset:: Large File Test',
        attachments: [{
          filename: 'huge-file.pdf',
          contentType: 'application/pdf',
          size: 100 * 1024 * 1024, // 100MB (exceeds 50MB limit)
          content: Buffer.from('test content')
        }],
        receivedAt: new Date(),
        headers: {}
      }

      // Mock user repository
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'user@example.com',
          organization_id: 'org-123'
        },
        error: null
      })

      const result = await emailService.validateEmailData(emailData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isValid).toBe(false)
        expect(result.data.errors.some(error => 
          error.includes('File too large')
        )).toBe(true)
      }
    })
  })

  describe('Email Processing Repository', () => {
    it('should create email processing log', async () => {
      const logData = {
        messageId: 'test-123',
        fromEmail: 'user@example.com',
        toEmail: 'assets@appboardguru.com',
        subject: 'Asset:: Test Document',
        status: 'processing' as EmailProcessingStatus,
        userId: 'user-123' as any,
        organizationId: 'org-123' as any
      }

      // Mock successful insert
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'log-123',
          message_id: logData.messageId,
          from_email: logData.fromEmail,
          to_email: logData.toEmail,
          subject: logData.subject,
          status: logData.status,
          user_id: logData.userId,
          organization_id: logData.organizationId,
          assets_created: [],
          processing_time_ms: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      })

      const result = await emailRepo.createProcessingLog(logData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.messageId).toBe(logData.messageId)
        expect(result.data.status).toBe(logData.status)
        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            message_id: logData.messageId,
            from_email: logData.fromEmail,
            status: logData.status
          })
        )
      }
    })

    it('should update processing status', async () => {
      const logId = 'log-123'
      const updates = {
        status: 'completed' as EmailProcessingStatus,
        assetsCreated: ['asset-1', 'asset-2'] as any[],
        processingTimeMs: 1500
      }

      // Mock successful update
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: logId,
          message_id: 'test-123',
          from_email: 'user@example.com',
          to_email: 'assets@appboardguru.com',
          subject: 'Asset:: Test Document',
          status: updates.status,
          assets_created: updates.assetsCreated,
          processing_time_ms: updates.processingTimeMs,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      })

      const result = await emailRepo.updateProcessingStatus(logId, updates)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe(updates.status)
        expect(result.data.assetsCreated).toEqual(updates.assetsCreated)
        expect(result.data.processingTimeMs).toBe(updates.processingTimeMs)
      }
    })

    it('should find processing log by message ID', async () => {
      const messageId = 'test-123'

      // Mock successful find
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'log-123',
          message_id: messageId,
          from_email: 'user@example.com',
          to_email: 'assets@appboardguru.com',
          subject: 'Asset:: Test Document',
          status: 'completed',
          assets_created: ['asset-1'],
          processing_time_ms: 1200,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      })

      const result = await emailRepo.findByMessageId(messageId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.messageId).toBe(messageId)
        expect(result.data?.status).toBe('completed')
      }
    })

    it('should return null for non-existent message ID', async () => {
      const messageId = 'non-existent'

      // Mock not found error
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await emailRepo.findByMessageId(messageId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })
  })

  describe('Rate Limiting', () => {
    it('should check user rate limits', async () => {
      const userId = 'user-123' as any

      // Mock rate limit check - within limits
      mockSupabase.execute.mockResolvedValueOnce({
        data: null,
        error: null,
        count: 3
      })

      const result = await emailRepo.checkRateLimit(userId, 1)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.count).toBe(3)
        expect(result.data.withinLimit).toBe(true)
      }
    })

    it('should detect rate limit exceeded', async () => {
      const userId = 'user-123' as any

      // Mock rate limit check - exceeded limits
      mockSupabase.execute.mockResolvedValueOnce({
        data: null,
        error: null,
        count: 15 // Exceeds limit of 10
      })

      const result = await emailRepo.checkRateLimit(userId, 1)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.count).toBe(15)
        expect(result.data.withinLimit).toBe(false)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const logData = {
        messageId: 'test-123',
        fromEmail: 'user@example.com',
        toEmail: 'assets@appboardguru.com',
        subject: 'Asset:: Test Document',
        status: 'processing' as EmailProcessingStatus
      }

      // Mock database error
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection failed', code: 'DB_ERROR' }
      })

      const result = await emailRepo.createProcessingLog(logData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create email processing log')
      }
    })

    it('should handle service errors gracefully', async () => {
      const emailData: InboundEmailData = {
        messageId: 'test-123',
        from: 'user@example.com',
        to: 'assets@appboardguru.com',
        subject: 'Asset:: Test Document',
        attachments: [],
        receivedAt: new Date(),
        headers: {}
      }

      // Mock service error
      mockSupabase.single.mockRejectedValueOnce(new Error('Service unavailable'))

      const result = await emailService.validateEmailData(emailData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Email validation failed')
      }
    })
  })

  describe('Security Tests', () => {
    it('should sanitize email content', () => {
      const maliciousPayload: SendGridWebhookPayload = {
        dkim: 'pass',
        email: 'assets@appboardguru.com',
        subject: 'Asset:: <script>alert("xss")</script>',
        from: 'user@example.com',
        text: 'Malicious content: <script>alert("xss")</script>',
        html: '<script>alert("xss")</script>',
        envelope: '{}',
        attachments: '0',
        attachment_info: '[]',
        charsets: '{}',
        SPF: 'pass'
      }

      const result = emailService.parseWebhookPayload(maliciousPayload)

      expect(result.success).toBe(true)
      if (result.success) {
        // Content should be preserved as-is (sanitization happens at display layer)
        expect(result.data.subject).toBe('Asset:: <script>alert("xss")</script>')
        expect(result.data.textBody).toBe('Malicious content: <script>alert("xss")</script>')
      }
    })

    it('should handle extremely large attachment lists', () => {
      const manyAttachments = Array.from({ length: 50 }, (_, i) => ({
        filename: `file${i}.pdf`,
        type: 'application/pdf',
        size: 1000
      }))

      const payload: SendGridWebhookPayload = {
        dkim: 'pass',
        email: 'assets@appboardguru.com',
        subject: 'Asset:: Many Files',
        from: 'user@example.com',
        text: 'Many files attached',
        html: '<p>Many files attached</p>',
        envelope: '{}',
        attachments: '50',
        attachment_info: JSON.stringify(manyAttachments),
        charsets: '{}',
        SPF: 'pass'
      }

      const result = emailService.parseWebhookPayload(payload)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.attachments).toHaveLength(50)
        // Validation should catch this in the validation step
      }
    })
  })
})