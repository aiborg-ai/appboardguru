/**
 * Authentication Guards
 * Provides role-based access control and authentication validation
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { logSecurityEvent } from './audit'

type UserRole = 'pending' | 'director' | 'admin' | 'viewer'
type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  status: 'pending' | 'approved' | 'rejected'
  full_name?: string
  organizations?: Array<{
    id: string
    role: OrganizationRole
    status: 'active' | 'suspended' | 'pending_activation'
  }>
}

export interface OrganizationPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManageMembers: boolean
  canManageSettings: boolean
  canManageBilling: boolean
  canViewAuditLogs: boolean
  canManageRoles: boolean
  canInviteMembers: boolean
  canRemoveMembers: boolean
}

/**
 * Extract JWT token from request headers
 */
function extractTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Check cookies for session token
  const cookies = request.headers.get('cookie')
  if (cookies) {
    const match = cookies.match(/supabase\.auth\.token=([^;]+)/)
    if (match) {
      try {
        const tokenData = JSON.parse(decodeURIComponent(match[1]!))
        return tokenData.access_token || null
      } catch {
        // Invalid cookie format
      }
    }
  }
  
  return null
}

/**
 * Validate JWT token and get user information
 */
async function validateToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    // Verify JWT with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      return null
    }
    
    // Get user details from database
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        organization_members (
          organization_id,
          role,
          status
        )
      `)
      .eq('id', user.id)
      .single()
    
    if (userError || !userRecord) {
      await logSecurityEvent('auth_user_not_found', {
        userId: user.id,
        email: user.email
      }, 'medium')
      return null
    }
    
    return {
      id: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
      status: userRecord.status,
      full_name: userRecord.full_name,
      organizations: userRecord.organization_members?.map(member => ({
        id: member.organization_id,
        role: member.role,
        status: member.status
      }))
    }
  } catch (error) {
    await logSecurityEvent('auth_token_validation_error', {
      error: error instanceof Error ? error.message : 'unknown error'
    }, 'high')
    return null
  }
}

/**
 * Get organization permissions for user
 */
function getOrganizationPermissions(
  userRole: UserRole,
  organizationRole?: OrganizationRole
): OrganizationPermissions {
  // System admin has all permissions
  if (userRole === 'admin') {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canManageMembers: true,
      canManageSettings: true,
      canManageBilling: true,
      canViewAuditLogs: true,
      canManageRoles: true,
      canInviteMembers: true,
      canRemoveMembers: true
    }
  }
  
  if (!organizationRole) {
    return {
      canView: false,
      canEdit: false,
      canDelete: false,
      canManageMembers: false,
      canManageSettings: false,
      canManageBilling: false,
      canViewAuditLogs: false,
      canManageRoles: false,
      canInviteMembers: false,
      canRemoveMembers: false
    }
  }
  
  switch (organizationRole) {
    case 'owner':
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canManageMembers: true,
        canManageSettings: true,
        canManageBilling: true,
        canViewAuditLogs: true,
        canManageRoles: true,
        canInviteMembers: true,
        canRemoveMembers: true
      }
    
    case 'admin':
      return {
        canView: true,
        canEdit: true,
        canDelete: false,
        canManageMembers: true,
        canManageSettings: true,
        canManageBilling: false,
        canViewAuditLogs: true,
        canManageRoles: true,
        canInviteMembers: true,
        canRemoveMembers: true
      }
    
    case 'member':
      return {
        canView: true,
        canEdit: true,
        canDelete: false,
        canManageMembers: false,
        canManageSettings: false,
        canManageBilling: false,
        canViewAuditLogs: false,
        canManageRoles: false,
        canInviteMembers: false,
        canRemoveMembers: false
      }
    
    case 'viewer':
      return {
        canView: true,
        canEdit: false,
        canDelete: false,
        canManageMembers: false,
        canManageSettings: false,
        canManageBilling: false,
        canViewAuditLogs: false,
        canManageRoles: false,
        canInviteMembers: false,
        canRemoveMembers: false
      }
    
    default:
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageMembers: false,
        canManageSettings: false,
        canManageBilling: false,
        canViewAuditLogs: false,
        canManageRoles: false,
        canInviteMembers: false,
        canRemoveMembers: false
      }
  }
}

/**
 * Require user authentication
 */
export async function requireAuth(request: NextRequest): Promise<{
  success: boolean
  user?: AuthenticatedUser
  error?: string
}> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 'unknown'
  
  const token = extractTokenFromRequest(request)
  
  if (!token) {
    await logSecurityEvent('auth_missing_token', {
      ip,
      path: request.nextUrl.pathname
    }, 'low')
    return { success: false, error: 'Authentication token required' }
  }
  
  const user = await validateToken(token)
  
  if (!user) {
    await logSecurityEvent('auth_invalid_token', {
      ip,
      path: request.nextUrl.pathname
    }, 'medium')
    return { success: false, error: 'Invalid authentication token' }
  }
  
  // Check if user is approved
  if (user.status !== 'approved') {
    await logSecurityEvent('auth_unapproved_user_access', {
      userId: user.id,
      status: user.status,
      ip,
      path: request.nextUrl.pathname
    }, 'medium')
    return { success: false, error: 'User account not approved' }
  }
  
  await logSecurityEvent('auth_success', {
    userId: user.id,
    ip,
    path: request.nextUrl.pathname
  }, 'low')
  
  return { success: true, user }
}

/**
 * Require specific user role
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: UserRole | UserRole[]
): Promise<{
  success: boolean
  user?: AuthenticatedUser
  error?: string
}> {
  const authResult = await requireAuth(request)
  
  if (!authResult.success || !authResult.user) {
    return authResult
  }
  
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  
  if (!allowedRoles.includes(authResult.user.role)) {
    await logSecurityEvent('auth_insufficient_role', {
      userId: authResult.user.id,
      userRole: authResult.user.role,
      requiredRole: allowedRoles,
      path: request.nextUrl.pathname
    }, 'medium')
    
    return { success: false, error: 'Insufficient privileges' }
  }
  
  return authResult
}

/**
 * Require organization access
 */
export async function requireOrganizationAccess(
  request: NextRequest,
  organizationId: string,
  minimumRole: OrganizationRole = 'viewer'
): Promise<{
  success: boolean
  user?: AuthenticatedUser
  organizationRole?: OrganizationRole
  permissions?: OrganizationPermissions
  error?: string
}> {
  const authResult = await requireAuth(request)
  
  if (!authResult.success || !authResult.user) {
    return authResult
  }
  
  const user = authResult.user
  
  // System admin has access to all organizations
  if (user.role === 'admin') {
    const permissions = getOrganizationPermissions(user.role, 'owner')
    return {
      success: true,
      user,
      organizationRole: 'owner',
      permissions
    }
  }
  
  // Check organization membership
  const membership = user.organizations?.find(org => org.id === organizationId)
  
  if (!membership) {
    await logSecurityEvent('auth_no_organization_access', {
      userId: user.id,
      organizationId,
      path: request.nextUrl.pathname
    }, 'medium')
    
    return { success: false, error: 'No access to organization' }
  }
  
  // Check if membership is active
  if (membership.status !== 'active') {
    await logSecurityEvent('auth_inactive_organization_membership', {
      userId: user.id,
      organizationId,
      membershipStatus: membership.status,
      path: request.nextUrl.pathname
    }, 'medium')
    
    return { success: false, error: 'Organization membership not active' }
  }
  
  // Check minimum role requirement
  const roleHierarchy: Record<OrganizationRole, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4
  }
  
  if (roleHierarchy[membership.role] < roleHierarchy[minimumRole]) {
    await logSecurityEvent('auth_insufficient_organization_role', {
      userId: user.id,
      organizationId,
      userRole: membership.role,
      requiredRole: minimumRole,
      path: request.nextUrl.pathname
    }, 'medium')
    
    return { success: false, error: 'Insufficient organization privileges' }
  }
  
  const permissions = getOrganizationPermissions(user.role, membership.role)
  
  return {
    success: true,
    user,
    organizationRole: membership.role,
    permissions
  }
}

/**
 * Require specific organization permission
 */
export async function requireOrganizationPermission(
  request: NextRequest,
  organizationId: string,
  permission: keyof OrganizationPermissions
): Promise<{
  success: boolean
  user?: AuthenticatedUser
  organizationRole?: OrganizationRole
  permissions?: OrganizationPermissions
  error?: string
}> {
  const accessResult = await requireOrganizationAccess(request, organizationId)
  
  if (!accessResult.success || !accessResult.permissions) {
    return accessResult
  }
  
  if (!accessResult.permissions[permission]) {
    await logSecurityEvent('auth_insufficient_organization_permission', {
      userId: accessResult.user!.id,
      organizationId,
      permission,
      userRole: accessResult.organizationRole,
      path: request.nextUrl.pathname
    }, 'medium')
    
    return { success: false, error: `Missing permission: ${permission}` }
  }
  
  return accessResult
}

/**
 * Check if user has admin privileges (system admin or organization owner/admin)
 */
export async function requireAdminAccess(
  request: NextRequest,
  organizationId?: string
): Promise<{
  success: boolean
  user?: AuthenticatedUser
  isSystemAdmin?: boolean
  organizationRole?: OrganizationRole
  error?: string
}> {
  const authResult = await requireAuth(request)
  
  if (!authResult.success || !authResult.user) {
    return authResult
  }
  
  const user = authResult.user
  
  // Check system admin
  if (user.role === 'admin') {
    return {
      success: true,
      user,
      isSystemAdmin: true
    }
  }
  
  // If organization is specified, check organization admin access
  if (organizationId) {
    const orgAccess = await requireOrganizationAccess(request, organizationId, 'admin')
    
    if (orgAccess.success) {
      return {
        success: true,
        user,
        isSystemAdmin: false,
        organizationRole: orgAccess.organizationRole
      }
    }
  }
  
  await logSecurityEvent('auth_admin_access_denied', {
    userId: user.id,
    userRole: user.role,
    organizationId,
    path: request.nextUrl.pathname
  }, 'medium')
  
  return { success: false, error: 'Admin privileges required' }
}

/**
 * Validate API key for service-to-service communication
 */
export async function validateApiKey(apiKey: string): Promise<{
  success: boolean
  service?: string
  permissions?: string[]
  error?: string
}> {
  // In production, store API keys in database with proper hashing
  const validApiKeys = new Map([
    [process.env.INTERNAL_API_KEY || '', {
      service: 'internal',
      permissions: ['read', 'write', 'admin']
    }],
    [process.env.WEBHOOK_API_KEY || '', {
      service: 'webhook',
      permissions: ['write']
    }]
  ])
  
  const keyData = validApiKeys.get(apiKey)
  
  if (!keyData) {
    await logSecurityEvent('auth_invalid_api_key', {
      apiKey: apiKey.substring(0, 8) + '...' // Log only first 8 chars
    }, 'high')
    
    return { success: false, error: 'Invalid API key' }
  }
  
  await logSecurityEvent('auth_api_key_success', {
    service: keyData.service
  }, 'low')
  
  return {
    success: true,
    service: keyData.service,
    permissions: keyData.permissions
  }
}

/**
 * Rate limit authentication attempts per IP
 */
const authAttempts = new Map<string, { count: number; resetTime: number }>()

export async function checkAuthRateLimit(ip: string): Promise<{
  allowed: boolean
  remaining: number
  resetTime: number
}> {
  const maxAttempts = 10
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const now = Date.now()
  
  const existing = authAttempts.get(ip)
  
  if (!existing || now >= existing.resetTime) {
    const resetTime = now + windowMs
    authAttempts.set(ip, { count: 1, resetTime })
    return { allowed: true, remaining: maxAttempts - 1, resetTime }
  }
  
  existing.count++
  
  if (existing.count > maxAttempts) {
    return { allowed: false, remaining: 0, resetTime: existing.resetTime }
  }
  
  return { allowed: true, remaining: maxAttempts - existing.count, resetTime: existing.resetTime }
}

/**
 * Create middleware wrapper for authentication guards
 */
export function withAuthGuard<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  guard: (request: NextRequest) => Promise<{ success: boolean; error?: string }>
) {
  return async (...args: T): Promise<Response> => {
    const [request] = args as unknown as [NextRequest, ...any[]]
    
    const guardResult = await guard(request)
    
    if (!guardResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: guardResult.error,
        timestamp: new Date().toISOString()
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return handler(...args)
  }
}