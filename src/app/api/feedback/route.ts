import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
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


export async function POST(request: NextRequest) {
  console.log('[Feedback API] Starting feedback submission')
  
  try {
    const supabase = await createSupabaseServerClient()
    
    // Parse request body first (before auth check for better error messages)
    const body = await request.json()
    console.log('[Feedback API] Received feedback type:', body.type)
    
    // Validate input
    const validation = feedbackSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { type, title, description, screenshot } = validation.data

    // Get authenticated user from session with proper error handling
    let user = null
    let userEmail = ''
    let userName = ''
    
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('[Feedback API] Auth error:', authError.message)
        
        // Check if we're in demo mode or development
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
          console.log('[Feedback API] Using demo fallback for feedback submission')
          // Allow submission with mock user in demo/dev mode
          userEmail = 'demo.user@appboardguru.com'
          userName = 'Demo User'
          user = { id: 'demo-user-id', email: userEmail } as any
        } else {
          return NextResponse.json(
            { error: 'Session expired. Please refresh the page and try again.' },
            { status: 401 }
          )
        }
      } else if (!authUser) {
        console.log('[Feedback API] No authenticated user found')
        return NextResponse.json(
          { error: 'Please sign in to submit feedback.' },
          { status: 401 }
        )
      } else {
        user = authUser
        userEmail = user.email || ''
        userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        console.log('[Feedback API] Authenticated user:', userEmail)
      }
    } catch (authCheckError) {
      console.error('[Feedback API] Error checking authentication:', authCheckError)
      // Continue with demo user in development
      if (process.env.NODE_ENV === 'development') {
        userEmail = 'demo.user@appboardguru.com'
        userName = 'Demo User'
        user = { id: 'demo-user-id', email: userEmail } as any
      } else {
        return NextResponse.json(
          { error: 'Authentication service unavailable. Please try again later.' },
          { status: 503 }
        )
      }
    }

    // Check rate limiting
    if (!checkRateLimit(userEmail)) {
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
      userEmail,
      userName,
      screenshot: screenshot ?? '',
      timestamp,
      userAgent: userAgent ?? '',
      url: referer ?? ''
    }

    // Initialize notification service with proper error handling
    let notificationService: NotificationService | null = null
    try {
      console.log('[Feedback API] Initializing notification service...')
      notificationService = new NotificationService(supabase)
      console.log('[Feedback API] Notification service initialized successfully')
    } catch (serviceError) {
      console.error('[Feedback API] Failed to initialize notification service:', serviceError)
      console.error('[Feedback API] Stack trace:', serviceError instanceof Error ? serviceError.stack : 'N/A')
      // Continue without email notifications - feedback will still be saved
      console.log('[Feedback API] Continuing without email notifications')
    }

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

    // Send emails with fallback handling
    let adminEmailSent = false
    let userEmailSent = false
    
    if (notificationService) {
      try {
        // Try to send emails but don't fail if they don't work
        const emailPromises = []
        
        // Admin email
        emailPromises.push(
          notificationService.sendEmail(
            'hirendra.vikram@boardguru.ai',
            {
              subject: adminTemplate.subject,
              html: adminTemplate.html,
              text: adminTextFallback
            },
            'feedback'
          ).catch(err => {
            console.error('[Feedback API] Admin email failed:', err)
            return false
          })
        )
        
        // User confirmation email
        if (userEmail && userEmail !== 'demo.user@appboardguru.com') {
          emailPromises.push(
            notificationService.sendEmail(
              userEmail,
              {
                subject: confirmationTemplate.subject,
                html: confirmationTemplate.html,
                text: confirmationTextFallback
              },
              'feedback_confirmation'
            ).catch(err => {
              console.error('[Feedback API] User email failed:', err)
              return false
            })
          )
        } else {
          emailPromises.push(Promise.resolve(false))
        }
        
        const results = await Promise.all(emailPromises)
        adminEmailSent = results[0]
        userEmailSent = results[1]
        
        console.log('[Feedback API] Email status - Admin:', adminEmailSent, 'User:', userEmailSent)
      } catch (emailError) {
        console.error('[Feedback API] Email sending error:', emailError)
        // Continue without emails
      }
    }

    // Store feedback in database with comprehensive error handling
    let dbSaveSuccess = false
    let dbError: any = null
    
    try {
      // First check if table exists
      const { error: tableCheckError } = await supabase
        .from('feedback_submissions')
        .select('id')
        .limit(1)
      
      if (tableCheckError && tableCheckError.code === '42P01') {
        console.error('[Feedback API] Table feedback_submissions does not exist')
        dbError = 'Database table not configured'
      } else {
        // Try to insert the feedback
        const { error: insertError } = await supabase
          .from('feedback_submissions')
          .insert({
            reference_id: referenceId,
            user_id: user?.id === 'demo-user-id' ? null : user?.id,
            user_email: userEmail,
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
        
        if (insertError) {
          console.error('[Feedback API] Database insert error:', insertError)
          dbError = insertError.message
          
          // If it's a permissions error, try without user_id
          if (insertError.code === '42501' || insertError.message?.includes('permission')) {
            console.log('[Feedback API] Retrying without user_id due to permission error')
            const { error: retryError } = await supabase
              .from('feedback_submissions')
              .insert({
                reference_id: referenceId,
                user_id: null,
                user_email: userEmail,
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
            
            if (retryError) {
              console.error('[Feedback API] Retry also failed:', retryError)
            } else {
              dbSaveSuccess = true
              dbError = null
            }
          }
        } else {
          dbSaveSuccess = true
          console.log('[Feedback API] Feedback saved to database successfully')
        }
      }
    } catch (dbException) {
      console.error('[Feedback API] Database operation failed:', dbException)
      dbError = dbException instanceof Error ? dbException.message : 'Database error'
    }
    
    // Store feedback locally as backup if database fails
    if (!dbSaveSuccess) {
      try {
        // In production, you might want to store this in Redis or a queue
        console.log('[Feedback API] Storing feedback in fallback storage')
        // For now, just log the complete feedback for manual recovery
        console.log('[Feedback API] Fallback storage:', JSON.stringify({
          referenceId,
          feedbackData,
          dbError
        }))
      } catch (fallbackError) {
        console.error('[Feedback API] Fallback storage also failed:', fallbackError)
      }
    }

    // Determine overall success
    // Consider it successful if we at least stored the feedback somewhere
    const overallSuccess = dbSaveSuccess || adminEmailSent
    
    if (!overallSuccess) {
      // If nothing worked, return an error but with the reference ID
      return NextResponse.json(
        {
          success: false,
          referenceId,
          error: 'Failed to submit feedback. Please try again or contact support with reference: ' + referenceId,
          details: process.env['NODE_ENV'] === 'development' ? {
            dbError,
            emailStatus: { admin: adminEmailSent, user: userEmailSent }
          } : undefined
        },
        { status: 500 }
      )
    }
    
    // Create response with appropriate warnings
    const response: any = {
      success: true,
      referenceId,
      message: 'Feedback received successfully',
      emailsSent: {
        admin: adminEmailSent,
        user: userEmailSent
      }
    }
    
    // Add specific status messages
    if (!dbSaveSuccess) {
      response.message = 'Feedback received and will be processed. Reference: ' + referenceId
      response.warning = 'Some features may be limited. Your feedback has been logged for review.'
    } else if (!adminEmailSent && !userEmailSent) {
      response.message = 'Feedback saved successfully. Reference: ' + referenceId
      response.warning = 'Email notifications are currently unavailable.'
    } else if (!userEmailSent) {
      response.message = 'Feedback submitted successfully. Reference: ' + referenceId
      response.warning = 'Confirmation email could not be sent.'
    }
    
    console.log('[Feedback API] Final response:', response)
    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('[Feedback API] Unexpected error:', error)
    
    // Generate a reference ID even for errors so users can reference it
    const errorReferenceId = generateReferenceId()
    
    // Try to provide a more helpful error message
    let errorMessage = 'An error occurred while submitting your feedback.'
    let statusCode = 500
    
    if (error instanceof Error) {
      console.error('[Feedback API] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      
      if (error.message.includes('auth') || error.message.includes('session')) {
        errorMessage = 'Session expired. Please refresh the page and try again.'
        statusCode = 401
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.'
        statusCode = 429
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.'
        statusCode = 503
      } else if (error.message.includes('constructor')) {
        // This might be our NotificationService issue
        errorMessage = 'Service configuration error. Your feedback will be recorded.'
        console.error('[Feedback API] Constructor error detected - likely NotificationService issue')
      }
    }
    
    // Always include the reference ID for support purposes
    errorMessage = `Failed to submit feedback. Please try again or contact support with reference: ${errorReferenceId}`
    
    return NextResponse.json(
      { 
        error: errorMessage,
        referenceId: errorReferenceId,
        details: process.env['NODE_ENV'] === 'development' ? {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        } : undefined,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
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