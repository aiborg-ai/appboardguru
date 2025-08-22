/**
 * Authentication and authorization middleware for API handlers
 */

import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export interface AuthContext {
  user: {
    id: string
    email: string
    role?: string
  }
  supabase: SupabaseClient<Database>
}

/**
 * Validates authentication and returns user context
 */
export async function validateAuth(req: NextRequest): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return {
    user: {
      id: user.id,
      email: user.email!,
      role: user.user_metadata?.role
    },
    supabase: supabase as any
  }
}

/**
 * Validates that user has access to the specified organization
 */
export async function validateOrgAccess(
  supabase: SupabaseClient<Database>, 
  userId: string, 
  organizationId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    throw new Error('Forbidden: No access to organization')
  }
}

/**
 * Validates that user has a specific role in the organization
 */
export async function validateRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  organizationId: string,
  requiredRole: 'owner' | 'admin' | 'member' | 'viewer'
): Promise<void> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    throw new Error('Forbidden: No access to organization')
  }

  const roleHierarchy = ['viewer', 'member', 'admin', 'owner']
  const userRoleIndex = roleHierarchy.indexOf(data.role)
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)

  if (userRoleIndex < requiredRoleIndex) {
    throw new Error(`Forbidden: Requires ${requiredRole} role`)
  }
}