/**
 * Authentication Middleware
 * Following CLAUDE.md security and authentication patterns
 */

import { NextRequest } from 'next/server'
import { createServerRepositoryFactory } from '../repositories'
import type { Result } from '../repositories/result'
import type { UserId, OrganizationId } from '../../types/branded'
import { createUserId, createOrganizationId } from '../../types/branded'

// Authentication result interface
interface AuthResult {
  user: {
    id: string
    email: string
    organizationId?: string
  }
  organizationId: string
}

/**
 * Require authentication middleware
 * Validates JWT token and extracts user information
 */
export async function requireAuth(request: NextRequest): Promise<Result<AuthResult>> {
  try {
    // Extract authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return {
        success: false,
        error: {
          message: 'Authorization token required',
          code: 'MISSING_TOKEN',
          context: { header: 'authorization' }
        }
      }
    }

    // Create repository factory for auth validation
    const repositoryFactory = await createServerRepositoryFactory()
    const supabase = repositoryFactory['monitoredClient']

    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return {
        success: false,
        error: {
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
          context: { error: error?.message }
        }
      }
    }

    // Get user's organization (simplified - would use proper repository)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    const organizationId = profile?.organization_id

    if (!organizationId) {
      return {
        success: false,
        error: {
          message: 'User not associated with organization',
          code: 'NO_ORGANIZATION',
          context: { userId: user.id }
        }
      }
    }

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email || '',
          organizationId
        },
        organizationId
      }
    }

  } catch (error) {
    console.error('Authentication middleware error:', error)
    
    return {
      success: false,
      error: {
        message: 'Authentication verification failed',
        code: 'AUTH_ERROR',
        context: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

/**
 * Optional authentication middleware
 * Returns user if authenticated, null if not
 */
export async function optionalAuth(request: NextRequest): Promise<Result<AuthResult | null>> {
  const authResult = await requireAuth(request)
  
  if (authResult.success) {
    return authResult
  } else {
    // Return successful result with null data for optional auth
    return { success: true, data: null }
  }
}

/**
 * Require specific role/permission middleware
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: 'owner' | 'admin' | 'member' | 'viewer'
): Promise<Result<AuthResult>> {
  const authResult = await requireAuth(request)
  
  if (!authResult.success) {
    return authResult
  }

  try {
    const { user } = authResult.data
    const repositoryFactory = await createServerRepositoryFactory()
    const supabase = repositoryFactory['monitoredClient']

    // Get user role in organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', user.organizationId)
      .single()

    if (!membership) {
      return {
        success: false,
        error: {
          message: 'User not found in organization',
          code: 'NOT_MEMBER',
          context: { userId: user.id, organizationId: user.organizationId }
        }
      }
    }

    // Check role hierarchy
    const roleHierarchy = ['viewer', 'member', 'admin', 'owner']
    const userRoleLevel = roleHierarchy.indexOf(membership.role)
    const requiredRoleLevel = roleHierarchy.indexOf(requiredRole)

    if (userRoleLevel < requiredRoleLevel) {
      return {
        success: false,
        error: {
          message: `Insufficient permissions. Required: ${requiredRole}, User: ${membership.role}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          context: { 
            userRole: membership.role, 
            requiredRole,
            userId: user.id 
          }
        }
      }
    }

    return authResult

  } catch (error) {
    console.error('Role validation error:', error)
    
    return {
      success: false,
      error: {
        message: 'Role validation failed',
        code: 'ROLE_CHECK_ERROR',
        context: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

/**
 * Higher-order function for route authentication
 */
export function withAuth(handler: (request: NextRequest, authResult: AuthResult) => Promise<Response> | Response) {
  return async (request: NextRequest) => {
    const authResult = await requireAuth(request)
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify({
          error: authResult.error.code,
          message: authResult.error.message
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="API"'
          }
        }
      )
    }

    return handler(request, authResult.data)
  }
}

export type { AuthResult }