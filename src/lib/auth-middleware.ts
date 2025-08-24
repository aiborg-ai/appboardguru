/**
 * Authentication Middleware
 * - JWT token validation
 * - User session verification
 * - Role-based access control
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface AuthContext {
  user: {
    id: string
    email: string
    role?: string
    organizationId?: string
  } | null
  session: any | null
  isAuthenticated: boolean
}

export interface AuthError {
  code: string
  message: string
  statusCode: number
}

/**
 * Verify authentication from request
 */
export async function verifyAuth(request: Request): Promise<{
  success: boolean
  context?: AuthContext
  error?: AuthError
}> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
          statusCode: 401
        }
      }
    }

    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client for token verification
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {}
        }
      }
    )

    // Verify the token
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          statusCode: 401
        }
      }
    }

    // Get user session
    const { data: session } = await supabase.auth.getSession()

    return {
      success: true,
      context: {
        user: {
          id: user.id,
          email: user.email!,
          role: user.user_metadata?.role,
          organizationId: user.user_metadata?.organizationId
        },
        session: session.session,
        isAuthenticated: true
      }
    }

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication verification failed',
        statusCode: 500
      }
    }
  }
}

/**
 * Require authentication middleware
 */
export async function requireAuth(request: Request): Promise<{
  response?: Response
  context?: AuthContext
}> {
  const authResult = await verifyAuth(request)

  if (!authResult.success) {
    return {
      response: new Response(
        JSON.stringify({
          error: authResult.error?.code,
          message: authResult.error?.message
        }),
        {
          status: authResult.error?.statusCode || 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="API"'
          }
        }
      )
    }
  }

  return {
    context: authResult.context
  }
}

/**
 * Require specific role
 */
export async function requireRole(
  request: Request, 
  allowedRoles: string[]
): Promise<{
  response?: Response
  context?: AuthContext
}> {
  const authResult = await requireAuth(request)
  
  if (authResult.response) {
    return authResult // Authentication failed
  }

  const userRole = authResult.context?.user?.role
  if (!userRole || !allowedRoles.includes(userRole)) {
    return {
      response: new Response(
        JSON.stringify({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this operation'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }
  }

  return {
    context: authResult.context
  }
}

/**
 * Optional authentication middleware
 */
export async function optionalAuth(request: Request): Promise<AuthContext> {
  const authResult = await verifyAuth(request)
  
  if (authResult.success && authResult.context) {
    return authResult.context
  }

  return {
    user: null,
    session: null,
    isAuthenticated: false
  }
}

/**
 * Organization-specific authentication
 */
export async function requireOrganization(
  request: Request,
  organizationId?: string
): Promise<{
  response?: Response
  context?: AuthContext
}> {
  const authResult = await requireAuth(request)
  
  if (authResult.response) {
    return authResult // Authentication failed
  }

  // If specific organization ID is required
  if (organizationId && authResult.context?.user?.organizationId !== organizationId) {
    return {
      response: new Response(
        JSON.stringify({
          error: 'ORGANIZATION_ACCESS_DENIED',
          message: 'Access denied to this organization'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }
  }

  // If user doesn't belong to any organization
  if (!authResult.context?.user?.organizationId) {
    return {
      response: new Response(
        JSON.stringify({
          error: 'NO_ORGANIZATION',
          message: 'User must belong to an organization'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }
  }

  return {
    context: authResult.context
  }
}