/**
 * Organization Service
 * Handles core organization CRUD operations, membership management, and organization-level features
 */

import { supabaseAdmin } from '../supabase-admin'
import { createClient } from '@supabase/supabase-js'

// Organization types based on the database schema
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'
export type MembershipStatus = 'active' | 'suspended' | 'pending_activation'
export type OrganizationSize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise'

export interface CreateOrganizationData {
  name: string
  slug: string
  description?: string
  logo_url?: string
  website?: string
  industry?: string
  organization_size?: OrganizationSize
  settings?: Record<string, unknown>
  compliance_settings?: Record<string, unknown>
  billing_settings?: Record<string, unknown>
}

export interface UpdateOrganizationData {
  name?: string
  slug?: string
  description?: string
  logo_url?: string
  website?: string
  industry?: string
  organization_size?: OrganizationSize
  settings?: Record<string, unknown>
  compliance_settings?: Record<string, unknown>
  billing_settings?: Record<string, unknown>
}

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  website?: string
  industry?: string
  organization_size?: OrganizationSize
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
  deleted_at?: string
  deletion_scheduled_for?: string
  settings: Record<string, unknown>
  compliance_settings: Record<string, unknown>
  billing_settings: Record<string, unknown>
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole
  custom_permissions: Record<string, unknown>
  invited_by?: string
  approved_by?: string
  joined_at: string
  last_accessed: string
  access_count: number
  status: MembershipStatus
  is_primary: boolean
  receive_notifications: boolean
  invitation_accepted_ip?: string
  last_login_ip?: string
  suspicious_activity_count: number
  user?: {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
  }
}

/**
 * Create a new organization
 */
export async function createOrganization(
  data: CreateOrganizationData,
  createdBy: string
): Promise<{ success: boolean; organization?: Organization; error?: string }> {
  try {
    // Start a transaction-like operation
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        ...data,
        created_by: createdBy,
        is_active: true,
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      return { success: false, error: orgError.message }
    }

    // Add the creator as owner
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: createdBy,
        role: 'owner',
        invited_by: createdBy,
        approved_by: createdBy,
        status: 'active',
        is_primary: true, // First organization for user could be primary
      })

    if (memberError) {
      console.error('Error adding creator as owner:', memberError)
      // Try to cleanup the organization
      await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', organization.id)
      
      return { success: false, error: memberError.message }
    }

    // Initialize organization features
    const { error: featuresError } = await supabaseAdmin
      .from('organization_features')
      .insert({
        organization_id: organization.id,
        ai_summarization: true,
        advanced_permissions: false,
        sso_enabled: false,
        audit_logs: true,
        api_access: false,
        white_label: false,
        max_board_packs: 100,
        max_file_size_mb: 50,
        max_storage_gb: 10.0,
        plan_type: 'free',
      })

    if (featuresError) {
      console.error('Error creating organization features:', featuresError)
      // Continue - features can be created later
    }

    // Create audit log
    await createAuditLog({
      organization_id: organization.id,
      user_id: createdBy,
      event_type: 'user_action',
      action: 'create_organization',
      resource_type: 'organization',
      resource_id: organization.id,
      details: { name: data.name, slug: data.slug },
      outcome: 'success',
      severity: 'low',
    })

    return { success: true, organization }
  } catch (error) {
    console.error('Unexpected error creating organization:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get organization by ID with user access check
 */
export async function getOrganization(
  id: string,
  userId: string
): Promise<{ success: boolean; organization?: Organization; error?: string }> {
  try {
    // First check if user has access to this organization
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return { success: false, error: 'Access denied' }
    }

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching organization:', error)
      return { success: false, error: error.message }
    }

    return { success: true, organization }
  } catch (error) {
    console.error('Unexpected error fetching organization:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Update organization
 */
export async function updateOrganization(
  id: string,
  data: UpdateOrganizationData,
  userId: string
): Promise<{ success: boolean; organization?: Organization; error?: string }> {
  try {
    // Check if user is admin/owner
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_active', true)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return { success: false, error: error.message }
    }

    // Create audit log
    await createAuditLog({
      organization_id: id,
      user_id: userId,
      event_type: 'data_modification',
      action: 'update_organization',
      resource_type: 'organization',
      resource_id: id,
      details: data,
      outcome: 'success',
      severity: 'low',
    })

    return { success: true, organization }
  } catch (error) {
    console.error('Unexpected error updating organization:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Delete organization (soft delete)
 */
export async function deleteOrganization(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user is owner
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!membership || membership.role !== 'owner') {
      return { success: false, error: 'Only owners can delete organizations' }
    }

    // Check if there are other owners
    const { data: owners } = await supabaseAdmin
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', id)
      .eq('role', 'owner')
      .eq('status', 'active')

    if (owners && owners.length > 1) {
      return { 
        success: false, 
        error: 'Cannot delete organization with multiple owners. Transfer ownership first.' 
      }
    }

    // Soft delete
    const deletionScheduledFor = new Date()
    deletionScheduledFor.setDate(deletionScheduledFor.getDate() + 30) // 30 day grace period

    const { error } = await supabaseAdmin
      .from('organizations')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deletion_scheduled_for: deletionScheduledFor.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting organization:', error)
      return { success: false, error: error.message }
    }

    // Create audit log
    await createAuditLog({
      organization_id: id,
      user_id: userId,
      event_type: 'data_modification',
      action: 'delete_organization',
      resource_type: 'organization',
      resource_id: id,
      details: { soft_delete: true, grace_period_days: 30 },
      outcome: 'success',
      severity: 'medium',
    })

    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting organization:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * List user's organizations
 */
export async function listUserOrganizations(
  userId: string
): Promise<{ success: boolean; organizations?: Organization[]; error?: string }> {
  try {
    const { data: organizations, error } = await supabaseAdmin
      .from('organization_members')
      .select(`
        role,
        status,
        is_primary,
        joined_at,
        organizations!inner (
          id,
          name,
          slug,
          description,
          logo_url,
          website,
          industry,
          organization_size,
          created_by,
          created_at,
          updated_at,
          is_active,
          settings,
          compliance_settings,
          billing_settings
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('organizations.is_active', true)
      .order('is_primary', { ascending: false })
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Error fetching user organizations:', error)
      return { success: false, error: error.message }
    }

    const formattedOrganizations = organizations?.map((item: unknown) => ({
      ...item.organizations,
      user_role: item.role,
      user_status: item.status,
      is_primary: item.is_primary,
      joined_at: item.joined_at,
    }))

    return { success: true, organizations: formattedOrganizations }
  } catch (error) {
    console.error('Unexpected error fetching user organizations:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get organization members
 */
export async function getOrganizationMembers(
  orgId: string,
  userId: string
): Promise<{ success: boolean; members?: OrganizationMember[]; error?: string }> {
  try {
    // Check if user has access to this organization
    const { data: userMembership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!userMembership) {
      return { success: false, error: 'Access denied' }
    }

    const { data: members, error } = await supabaseAdmin
      .from('organization_members')
      .select(`
        *,
        users!inner (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('organization_id', orgId)
      .in('status', ['active', 'suspended'])
      .order('role')
      .order('joined_at')

    if (error) {
      console.error('Error fetching organization members:', error)
      return { success: false, error: error.message }
    }

    const formattedMembers = members?.map((member: any) => ({
      ...member,
      user: member.users,
      users: undefined, // Remove the users property
    }))

    return { success: true, members: formattedMembers }
  } catch (error) {
    console.error('Unexpected error fetching organization members:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Check if organization slug is available
 */
export async function checkOrganizationSlugAvailability(
  slug: string
): Promise<{ success: boolean; available?: boolean; error?: string }> {
  try {
    const { data: existingOrg, error } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking slug availability:', error)
      return { success: false, error: error.message }
    }

    // If no organization found with this slug, it's available
    const available = !existingOrg

    return { success: true, available }
  } catch (error) {
    console.error('Unexpected error checking slug availability:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Utility function to create audit log entries
 */
async function createAuditLog(logData: {
  organization_id?: string
  user_id?: string
  event_type: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, unknown>
  outcome: 'success' | 'failure' | 'error' | 'blocked'
  severity: 'low' | 'medium' | 'high' | 'critical'
}) {
  try {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        ...logData,
        event_category: logData.event_type,
        event_description: `${logData.outcome} ${logData.action} on ${logData.resource_type} ${logData.resource_id || ''}`,
        created_at: new Date().toISOString(),
      })
  } catch (error) {
    console.error('Error creating audit log:', error)
    // Don't throw - audit logging failures shouldn't break business operations
  }
}