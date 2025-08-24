import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { NotificationService } from '@/lib/services/notification.service'
import { createAdminFeedbackTemplate, createUserConfirmationTemplate, generateFeedbackTextFallback, generateConfirmationTextFallback } from '@/lib/services/feedback-templates'
import { z } from 'zod'

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Validation schema
const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'other']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  screenshot: z.string().nullable().optional()
})

// Rate limiting function
function checkRateLimit(userEmail: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxRequests = 5

  const userLimit = rateLimitStore.get(userEmail)
  
  if (!userLimit) {
    rateLimitStore.set(userEmail, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (now > userLimit.resetTime) {
    rateLimitStore.set(userEmail, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (userLimit.count >= maxRequests) {
    return false
  }

  userLimit.count += 1
  return true
}

// Generate reference ID
function generateReferenceId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `FB-${timestamp}${random}`.toUpperCase()
}

// Get user info from request
async function getUserInfo(request: NextRequest) {
  try {
    // Try to get user from session/auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return null
    }

    // In a real implementation, you'd validate the auth token here
    // For now, we'll try to get user from Supabase
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    return user
  } catch (error) {
    console.error('Error getting user info:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    
    // Validate input
    const validation = feedbackSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { type, title, description, screenshot } = validation.data

    // Get user information
    const user = await getUserInfo(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check rate limiting
    if (!checkRateLimit(user.email!)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before submitting more feedback.' },
        { status: 429 }
      )
    }

    // Validate screenshot size if provided
    if (screenshot) {
      const sizeInBytes = (screenshot.length * 3) / 4 // Rough base64 size calculation
      const maxSize = 5 * 1024 * 1024 // 5MB
      
      if (sizeInBytes > maxSize) {
        return NextResponse.json(
          { error: 'Screenshot too large. Maximum size is 5MB.' },
          { status: 400 }
        )
      }
    }

    // Generate reference ID
    const referenceId = generateReferenceId()
    const timestamp = new Date().toISOString()

    // Get additional context
    const userAgent = request.headers.get('user-agent') || undefined
    const referer = request.headers.get('referer') || undefined

    // Prepare feedback data
    const feedbackData = {
      type,
      title,
      description,
      userEmail: user.email!,
      userName: user.user_metadata?.full_name || user.email!.split('@')[0],
      screenshot: screenshot ?? '',
      timestamp,
      userAgent: userAgent ?? '',
      url: referer ?? ''
    }

    // Initialize notification service
    const notificationService = new NotificationService(supabase)

    // Create admin email
    const adminTemplate = createAdminFeedbackTemplate(feedbackData)
    const adminTextFallback = generateFeedbackTextFallback({
      subject: adminTemplate.subject,
      title,
      description,
      userEmail: user.email!
    })

    // Create user confirmation email
    const confirmationTemplate = createUserConfirmationTemplate({
      title,
      type,
      userEmail: user.email!,
      userName: feedbackData.userName,
      timestamp,
      referenceId
    })
    const confirmationTextFallback = generateConfirmationTextFallback({
      subject: confirmationTemplate.subject,
      title,
      referenceId
    })

    // Send emails
    const adminEmailPromise = notificationService.sendEmail(
      'hirendra.vikram@boardguru.ai',
      {
        subject: adminTemplate.subject,
        html: adminTemplate.html,
        text: adminTextFallback
      },
      'feedback'
    )

    const userEmailPromise = notificationService.sendEmail(
      user.email!,
      {
        subject: confirmationTemplate.subject,
        html: confirmationTemplate.html,
        text: confirmationTextFallback
      },
      'feedback_confirmation'
    )

    // Send both emails in parallel
    const [adminEmailSent, userEmailSent] = await Promise.all([
      adminEmailPromise,
      userEmailPromise
    ])

    // Log the feedback submission (optional - store in database for tracking)
    try {
      await supabase
        .from('feedback_submissions')
        .insert({
          reference_id: referenceId,
          user_id: user.id,
          user_email: user.email,
          type,
          title,
          description,
          screenshot_included: !!screenshot,
          user_agent: userAgent,
          page_url: referer,
          admin_email_sent: adminEmailSent,
          user_email_sent: userEmailSent,
          created_at: timestamp
        })
    } catch (dbError) {
      console.warn('Failed to log feedback to database:', dbError)
      // Continue anyway - email sending is the critical part
    }

    // Create response
    const response = {
      success: true,
      referenceId,
      message: 'Feedback submitted successfully',
      emailsSent: {
        admin: adminEmailSent,
        user: userEmailSent
      }
    }

    // Add warnings if emails failed
    if (!adminEmailSent || !userEmailSent) {
      response.message += '. Note: Some email notifications may have failed to send.'
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Feedback submission error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again later.',
        details: process.env['NODE_ENV'] === 'development' ? error instanceof Error ? error.message : String(error) : undefined
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit feedback.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit feedback.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit feedback.' },
    { status: 405 }
  )
}