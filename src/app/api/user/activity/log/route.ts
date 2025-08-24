/**
 * User Activity Logging API Endpoint
 * Handles client-side activity logging requests
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { 
  UserActivityLogger,
  getRequestContext,
  type UserActivityEvent
} from '@/lib/services/activity-logger'
import { 
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  withErrorHandling,
  addSecurityHeaders,
  validateRequestMethod
} from '@/lib/api-response'

const logActivitySchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
  organizationId: z.string().uuid().optional(),
  activityType: z.enum([
    'asset_opened', 'asset_downloaded', 'asset_uploaded', 'asset_shared', 'asset_deleted',
    'vault_created', 'vault_opened', 'vault_updated', 'vault_deleted', 'vault_shared',
    'organization_created', 'organization_joined', 'organization_left',
    'annotation_created', 'annotation_updated', 'annotation_deleted',
    'search_performed', 'ai_chat_started', 'report_generated',
    'user_invited', 'invitation_accepted', 'settings_updated',
    'login', 'logout', 'password_changed'
  ]),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  resourceType: z.string().max(50).optional(),
  resourceId: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

/**
 * POST /api/user/activity/log
 * Log a user activity event
 */
async function handleLogActivity(request: NextRequest) {
  if (!validateRequestMethod(request, ['POST'])) {
    return createErrorResponse('Method not allowed', 405)
  }

  try {
    // Get current user session
    const supabase = await createSupabaseServerClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return createErrorResponse('Authentication required', 401)
    }

    // Parse request body
    const body = await request.json()
    const validated = logActivitySchema.parse(body)

    // Verify user can only log their own activities
    if (validated.userId !== session.user.id) {
      return createErrorResponse('Cannot log activity for other users', 403)
    }

    // Get request context (IP, User Agent)
    const requestContext = getRequestContext(request)

    // Prepare activity event with proper type handling
    const activityEvent: UserActivityEvent = {
      userId: validated.userId,
      activityType: validated.activityType,
      title: validated.title,
      ...requestContext,
      ...(validated.organizationId && { organizationId: validated.organizationId }),
      ...(validated.description && { description: validated.description }),
      ...(validated.resourceType && { resourceType: validated.resourceType }),
      ...(validated.resourceId && { resourceId: validated.resourceId }),
      ...(validated.metadata && { metadata: validated.metadata })
    }

    // Log the activity
    const correlationId = await UserActivityLogger.logActivity(activityEvent)

    console.log(`✅ Activity logged for user ${validated.userId}: ${validated.title}`)

    return createSuccessResponse(
      { correlationId },
      'Activity logged successfully'
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`)
      return createValidationErrorResponse(errors)
    }

    console.error('Activity logging error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to log activity',
      500
    )
  }
}

/**
 * Export the POST handler wrapped with error handling and security headers
 */
export async function POST(request: NextRequest) {
  const response = await withErrorHandling(handleLogActivity)(request)
  return addSecurityHeaders(response)
}