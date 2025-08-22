/**
 * Membership Service
 * Handles organization membership management, role assignments, and member operations
 */

import { supabaseAdmin } from '../supabase-admin'

// Re-export types from organization service
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'
export type MembershipStatus = 'active' | 'suspended' | 'pending_activation'

export interface AddMemberData {
  email: string
  role: OrganizationRole
  personalMessage?: string
  customPermissions?: Record<string, unknown>
}

export interface UpdateMemberRoleData {
  role: OrganizationRole
  customPermissions?: Record<string, unknown>
}

export interface MemberPermissions {
  canViewOrganization: boolean
  canEditOrganization: boolean
  canDeleteOrganization: boolean
  canManageMembers: boolean
  canViewMembers: boolean
  canManageBoardPacks: boolean
  canViewBoardPacks: boolean
  canManageSettings: boolean
  canViewAuditLogs: boolean
  customPermissions: Record<string, unknown>
}

/**
 * Add a new member to organization (by email invitation)
 */
export async function addMember(
  orgId: string,
  data: AddMemberData,
  invitedBy: string
): Promise<{ success: boolean; invitation?: any; error?: string }> {
  try {
    // Check if inviter has admin permissions
    const { data: inviterMembership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', invitedBy)
      .eq('status', 'active')
      .single()

    if (!inviterMembership || !['owner', 'admin'].includes(inviterMembership.role)) {
      return { success: false, error: 'Insufficient permissions to invite members' }
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', data.email)
      .single()

    // If user exists, check if already a member
    if (existingUser) {
      const { data: existingMembership } = await supabaseAdmin
        .from('organization_members')
        .select('status')
        .eq('organization_id', orgId)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMembership && existingMembership.status === 'active') {
        return { success: false, error: 'User is already a member of this organization' }
      }
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabaseAdmin
      .from('organization_invitations')
      .select('status')
      .eq('organization_id', orgId)
      .eq('email', data.email)
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      return { success: false, error: 'A pending invitation already exists for this email' }
    }

    // Create invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('organization_invitations')
      .insert({
        organization_id: orgId,
        email: data.email,
        role: data.role,
        invited_by: invitedBy,
        personal_message: data.personalMessage,
        status: 'pending',
        token_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
      })
      .select()
      .single()

    if (invitationError) {
      console.error('Error creating invitation:', invitationError)
      return { success: false, error: invitationError.message }
    }

    // If user already exists, also create membership record in pending state
    if (existingUser) {
      const { error: membershipError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: orgId,
          user_id: existingUser.id,
          role: data.role,
          custom_permissions: data.customPermissions || {},
          invited_by: invitedBy,
          status: 'pending_activation',
        })

      if (membershipError && membershipError.code !== '23505') { // Ignore duplicate key error
        console.error('Error creating pending membership:', membershipError)
      }
    }

    // Create audit log
    await createAuditLog({
      organization_id: orgId,
      user_id: invitedBy,
      event_type: 'user_action',
      action: 'invite_member',
      resource_type: 'organization_invitation',
      resource_id: invitation.id,
      details: { 
        email: data.email, 
        role: data.role, 
        existing_user: !!existingUser 
      },
      outcome: 'success',
      severity: 'low',
    })

    return { success: true, invitation }
  } catch (error) {
    console.error('Unexpected error adding member:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(
  orgId: string,
  userId: string,
  data: UpdateMemberRoleData,
  updatedBy: string
): Promise<{ success: boolean; member?: any; error?: string }> {
  try {
    // Check if updater has admin permissions
    const { data: updaterMembership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', updatedBy)
      .eq('status', 'active')
      .single()

    if (!updaterMembership || !['owner', 'admin'].includes(updaterMembership.role)) {
      return { success: false, error: 'Insufficient permissions to update member roles' }
    }

    // Get current member info
    const { data: currentMember } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single()

    if (!currentMember) {
      return { success: false, error: 'Member not found' }
    }

    // Prevent non-owners from changing owner roles
    if (currentMember.role === 'owner' && updaterMembership.role !== 'owner') {
      return { success: false, error: 'Only owners can modify owner roles' }
    }

    // Prevent creating multiple owners unless transferring ownership
    if (data.role === 'owner' && currentMember.role !== 'owner') {
      // This should go through transferOwnership function instead
      return { success: false, error: 'Use transferOwnership function to change ownership' }
    }

    // Update member role
    const { data: updatedMember, error } = await supabaseAdmin
      .from('organization_members')
      .update({
        role: data.role,
        custom_permissions: data.customPermissions || currentMember.role,
        last_accessed: new Date().toISOString(),
      })
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .select(`
        *,
        users!inner (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error updating member role:', error)
      return { success: false, error: error.message }
    }

    // Create audit log
    await createAuditLog({
      organization_id: orgId,
      user_id: updatedBy,
      event_type: 'user_action',
      action: 'update_member_role',
      resource_type: 'organization_member',
      resource_id: updatedMember.id,
      details: { 
        target_user_id: userId,
        old_role: currentMember.role,
        new_role: data.role 
      },
      outcome: 'success',
      severity: 'medium',
    })

    return { success: true, member: updatedMember }
  } catch (error) {
    console.error('Unexpected error updating member role:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Remove member from organization
 */
export async function removeMember(
  orgId: string,
  userId: string,
  removedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if remover has admin permissions or is removing themselves
    const { data: removerMembership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', removedBy)
      .eq('status', 'active')
      .single()

    if (!removerMembership) {
      return { success: false, error: 'Access denied' }
    }

    const isSelfRemoval = userId === removedBy
    const hasAdminPermissions = ['owner', 'admin'].includes(removerMembership.role)

    if (!isSelfRemoval && !hasAdminPermissions) {
      return { success: false, error: 'Insufficient permissions to remove members' }
    }

    // Get member to be removed
    const { data: memberToRemove } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single()

    if (!memberToRemove) {
      return { success: false, error: 'Member not found' }
    }

    // Prevent removing the last owner
    if (memberToRemove.role === 'owner') {
      const { data: owners } = await supabaseAdmin
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId)
        .eq('role', 'owner')
        .eq('status', 'active')

      if (owners && owners.length <= 1) {
        return { success: false, error: 'Cannot remove the last owner. Transfer ownership first.' }
      }
    }

    // Remove member
    const { error } = await supabaseAdmin
      .from('organization_members')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing member:', error)
      return { success: false, error: error.message }
    }

    // Create audit log
    await createAuditLog({
      organization_id: orgId,
      user_id: removedBy,
      event_type: 'user_action',
      action: isSelfRemoval ? 'leave_organization' : 'remove_member',
      resource_type: 'organization_member',
      resource_id: userId,
      details: { 
        target_user_id: userId,
        removed_role: memberToRemove.role,
        self_removal: isSelfRemoval
      },
      outcome: 'success',
      severity: 'medium',
    })

    return { success: true }
  } catch (error) {
    console.error('Unexpected error removing member:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get member permissions based on role and custom permissions
 */
export async function getMemberPermissions(
  orgId: string,
  userId: string
): Promise<{ success: boolean; permissions?: MemberPermissions; error?: string }> {
  try {
    const { data: member } = await supabaseAdmin
      .from('organization_members')
      .select('role, custom_permissions, status')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!member) {
      return { success: false, error: 'Member not found or inactive' }
    }

    // Base permissions by role
    const basePermissions = getBasePermissionsByRole(member.role)
    
    // Merge with custom permissions
    const permissions: MemberPermissions = {
      ...basePermissions,
      customPermissions: member.custom_permissions || {},
    }

    // Apply custom permission overrides
    if (member.custom_permissions) {
      Object.keys(member.custom_permissions).forEach(key => {
        if (key in permissions) {
          (permissions as any)[key] = member.custom_permissions[key]
        }
      })
    }

    return { success: true, permissions }
  } catch (error) {
    console.error('Unexpected error getting member permissions:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Transfer ownership from one user to another
 */
export async function transferOwnership(
  orgId: string,
  fromUserId: string,
  toUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify current owner
    const { data: currentOwner } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', fromUserId)
      .eq('status', 'active')
      .single()

    if (!currentOwner || currentOwner.role !== 'owner') {
      return { success: false, error: 'Only current owners can transfer ownership' }
    }

    // Verify target user is a member
    const { data: targetMember } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', toUserId)
      .eq('status', 'active')
      .single()

    if (!targetMember) {
      return { success: false, error: 'Target user is not an active member of this organization' }
    }

    // Start transaction-like operations
    // 1. Change current owner to admin
    const { error: demoteError } = await supabaseAdmin
      .from('organization_members')
      .update({ 
        role: 'admin',
        last_accessed: new Date().toISOString(),
      })
      .eq('organization_id', orgId)
      .eq('user_id', fromUserId)

    if (demoteError) {
      console.error('Error demoting current owner:', demoteError)
      return { success: false, error: demoteError.message }
    }

    // 2. Promote target user to owner
    const { error: promoteError } = await supabaseAdmin
      .from('organization_members')
      .update({ 
        role: 'owner',
        is_primary: true, // New owner gets primary organization
        last_accessed: new Date().toISOString(),
      })
      .eq('organization_id', orgId)
      .eq('user_id', toUserId)

    if (promoteError) {
      console.error('Error promoting new owner:', promoteError)
      
      // Rollback: restore original owner
      await supabaseAdmin
        .from('organization_members')
        .update({ role: 'owner' })
        .eq('organization_id', orgId)
        .eq('user_id', fromUserId)
      
      return { success: false, error: promoteError.message }
    }

    // 3. Update old owner's primary organization status
    const { error: primaryError } = await supabaseAdmin
      .from('organization_members')
      .update({ is_primary: false })
      .eq('organization_id', orgId)
      .eq('user_id', fromUserId)

    if (primaryError) {
      console.error('Error updating primary organization status:', primaryError)
      // Don't rollback for this - ownership transfer succeeded
    }

    // Create audit log
    await createAuditLog({
      organization_id: orgId,
      user_id: fromUserId,
      event_type: 'user_action',
      action: 'transfer_ownership',
      resource_type: 'organization',
      resource_id: orgId,
      details: { 
        from_user_id: fromUserId,
        to_user_id: toUserId,
        previous_role: targetMember.role
      },
      outcome: 'success',
      severity: 'high',
    })

    return { success: true }
  } catch (error) {
    console.error('Unexpected error transferring ownership:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get base permissions by role
 */
function getBasePermissionsByRole(role: OrganizationRole): Omit<MemberPermissions, 'customPermissions'> {
  switch (role) {
    case 'owner':
      return {
        canViewOrganization: true,
        canEditOrganization: true,
        canDeleteOrganization: true,
        canManageMembers: true,
        canViewMembers: true,
        canManageBoardPacks: true,
        canViewBoardPacks: true,
        canManageSettings: true,
        canViewAuditLogs: true,
      }
    case 'admin':
      return {
        canViewOrganization: true,
        canEditOrganization: true,
        canDeleteOrganization: false,
        canManageMembers: true,
        canViewMembers: true,
        canManageBoardPacks: true,
        canViewBoardPacks: true,
        canManageSettings: true,
        canViewAuditLogs: true,
      }
    case 'member':
      return {
        canViewOrganization: true,
        canEditOrganization: false,
        canDeleteOrganization: false,
        canManageMembers: false,
        canViewMembers: true,
        canManageBoardPacks: true,
        canViewBoardPacks: true,
        canManageSettings: false,
        canViewAuditLogs: false,
      }
    case 'viewer':
      return {
        canViewOrganization: true,
        canEditOrganization: false,
        canDeleteOrganization: false,
        canManageMembers: false,
        canViewMembers: true,
        canManageBoardPacks: false,
        canViewBoardPacks: true,
        canManageSettings: false,
        canViewAuditLogs: false,
      }
    default:
      return {
        canViewOrganization: false,
        canEditOrganization: false,
        canDeleteOrganization: false,
        canManageMembers: false,
        canViewMembers: false,
        canManageBoardPacks: false,
        canViewBoardPacks: false,
        canManageSettings: false,
        canViewAuditLogs: false,
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