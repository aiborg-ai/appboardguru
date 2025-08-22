/**
 * Email Inbound Processing API Endpoint
 * Handles webhook from email service providers (SendGrid, Mailgun, etc.)
 * Creates assets from email attachments following DDD architecture
 */

import { NextRequest, NextResponse } from 'next/server'
import { EmailProcessingService } from '../../../../lib/services/email-processing.service'
import { createSupabaseClient } from '../../../../lib/supabase/client'
import { SendGridWebhookPayload, ProcessEmailRequest } from '../../../../types/email-processing'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/**
 * POST /api/email/inbound
 * Process inbound email webhook from email service provider
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request origin (basic security check)
    const userAgent = request.headers.get('user-agent') || ''
    if (!userAgent.includes('SendGrid') && !userAgent.includes('Mailgun')) {
      console.warn('Suspicious email webhook request:', {
        userAgent,
        origin: request.headers.get('origin'),
        ip: request.ip || 'unknown'
      })
    }

    // Parse webhook payload
    const contentType = request.headers.get('content-type') || ''
    let payload: SendGridWebhookPayload

    if (contentType.includes('multipart/form-data')) {
      // SendGrid sends form data for attachments
      const formData = await request.formData()
      payload = Object.fromEntries(formData.entries()) as unknown as SendGridWebhookPayload
    } else {
      // JSON payload
      payload = await request.json()
    }

    // Basic rate limiting by sender email
    const senderEmail = payload.from
    if (senderEmail) {
      const now = Date.now()
      const key = `email_rate_${senderEmail}`
      const limit = rateLimitStore.get(key)
      
      if (limit && limit.resetAt > now) {
        if (limit.count >= 10) { // 10 emails per hour max
          return NextResponse.json(
            { 
              error: 'Rate limit exceeded', 
              message: 'Too many emails from this sender',
              resetAt: new Date(limit.resetAt).toISOString()
            },
            { status: 429 }
          )
        }
        limit.count++
      } else {
        rateLimitStore.set(key, {
          count: 1,
          resetAt: now + 60 * 60 * 1000 // 1 hour from now
        })
      }
    }

    // Initialize email processing service
    const supabase = createSupabaseClient()
    const emailService = new EmailProcessingService(supabase)

    // Parse webhook payload to internal format
    const parseResult = emailService.parseWebhookPayload(payload)
    if (!parseResult.success) {
      console.error('Failed to parse webhook payload:', parseResult.error)
      return NextResponse.json(
        { 
          error: 'Invalid payload format',
          message: parseResult.error.message 
        },
        { status: 400 }
      )
    }

    const emailData = parseResult.data

    // Log the processing attempt
    console.log('Processing inbound email:', {
      messageId: emailData.messageId,
      from: emailData.from,
      subject: emailData.subject,
      attachmentCount: emailData.attachments.length
    })

    // Create processing request
    const processRequest: ProcessEmailRequest = {
      emailData,
      config: {
        // Override default config if needed
        maxAttachmentSize: 50 * 1024 * 1024, // 50MB
        rateLimitPerUser: 10
      }
    }

    // Process the email asynchronously for better webhook response time
    processEmailAsync(emailService, processRequest)
      .catch(error => {
        console.error('Async email processing failed:', error)
      })

    // Return success immediately to email service provider
    return NextResponse.json({
      success: true,
      message: 'Email received and queued for processing',
      messageId: emailData.messageId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Email webhook processing error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process email webhook',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Process email asynchronously to avoid webhook timeout
 */
async function processEmailAsync(
  emailService: EmailProcessingService,
  request: ProcessEmailRequest
): Promise<void> {
  try {
    const result = await emailService.processInboundEmail(request)
    
    if (result.success) {
      console.log('Email processing completed:', {
        processingId: result.data.processingId,
        status: result.data.status,
        assetsCreated: result.data.assetsCreated.length,
        processingTimeMs: result.data.processingTimeMs
      })
    } else {
      console.error('Email processing failed:', {
        error: result.error.message,
        messageId: request.emailData.messageId
      })
    }
  } catch (error) {
    console.error('Unexpected error in async email processing:', error)
  }
}

/**
 * GET /api/email/inbound
 * Health check endpoint for email webhook
 */
export async function GET() {
  return NextResponse.json({
    service: 'email-inbound-processor',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
}