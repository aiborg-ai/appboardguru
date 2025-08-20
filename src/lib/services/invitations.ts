/**
 * Invitation Service
 * Comprehensive invitation management system with advanced security features
 * Handles organization invitations, token validation, acceptance, and security measures
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateSecureApprovalToken, RateLimiter } from '@/lib/security'
import crypto from 'crypto'

// Types
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface CreateInvitationData {
  email: string
  role: OrganizationRole
  personalMessage?: string
  expiresIn?: number // Hours, defaults to 72
}

export interface InvitationWithOrganization {
  id: string
  organization_id: string
  email: string
  role: OrganizationRole
  invitation_token: string
  email_verification_code: string
  created_at: string
  token_expires_at: string
  accepted_at?: string
  invited_by: string
  accepted_by?: string
  personal_message?: string
  status: InvitationStatus
  attempt_count: number
  max_attempts: number
  created_ip?: string
  accepted_ip?: string
  device_fingerprint?: string
  organization?: {
    id: string
    name: string
    slug: string
    logo_url?: string
  }
  inviter?: {
    id: string
    email: string
    full_name?: string
  }
}

export interface AcceptInvitationData {
  token: string
  verificationCode?: string
  deviceInfo?: {
    userAgent: string
    fingerprint: string
    ip: string
  }
}

export interface DeviceInfo {
  userAgent: string
  fingerprint: string
  ip: string
}

// Rate limiters for security
const invitationRateLimiter = new RateLimiter(10, 5, 60 * 60 * 1000) // 5 invitations per hour per organization
const acceptanceRateLimiter = new RateLimiter(20, 10, 15 * 60 * 1000) // 10 attempts per 15 minutes per IP

/**
 * Generate a cryptographically secure invitation token
 */
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate a 6-digit numeric verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Create a new organization invitation with security features
 */
export async function createInvitation(
  orgId: string,
  data: CreateInvitationData,
  invitedBy: string,
  deviceInfo?: DeviceInfo
): Promise<{ success: boolean; invitation?: InvitationWithOrganization; error?: string }> {
  try {
    // Check rate limiting per organization
    if (!invitationRateLimiter.isAllowed(orgId)) {
      return { 
        success: false, 
        error: 'Too many invitations sent. Please try again in an hour.' 
      }
    }

    // Validate inviter permissions
    const { data: inviterMembership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', invitedBy)
      .eq('status', 'active')
      .single()

    if (!inviterMembership || !['owner', 'admin'].includes(inviterMembership.role)) {
      return { success: false, error: 'Insufficient permissions to send invitations' }
    }

    // Check if user already exists in the system
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', data.email.toLowerCase())
      .single()

    // If user exists, check if already a member
    if (existingUser) {
      const { data: existingMembership } = await supabaseAdmin
        .from('organization_members')
        .select('status, role')
        .eq('organization_id', orgId)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMembership && existingMembership.status === 'active') {
        return { 
          success: false, 
          error: `${data.email} is already a member of this organization with role: ${existingMembership.role}` 
        }
      }
    }

    // Check for existing pending invitations
    const { data: existingInvitation } = await supabaseAdmin
      .from('organization_invitations')
      .select('id, status, attempt_count')
      .eq('organization_id', orgId)
      .eq('email', data.email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      return { 
        success: false, 
        error: 'A pending invitation already exists for this email address' 
      }
    }

    // Generate secure tokens
    const invitationToken = generateInvitationToken()
    const verificationCode = generateVerificationCode()
    const expiresAt = new Date(Date.now() + (data.expiresIn || 72) * 60 * 60 * 1000)

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('organization_invitations')
      .insert({
        organization_id: orgId,
        email: data.email.toLowerCase(),
        role: data.role,
        invitation_token: invitationToken,
        email_verification_code: verificationCode,
        token_expires_at: expiresAt.toISOString(),
        invited_by: invitedBy,
        personal_message: data.personalMessage,
        status: 'pending',
        attempt_count: 0,
        max_attempts: 3,
        created_ip: deviceInfo?.ip,
      })
      .select(`
        *,
        organizations!inner (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .single()

    if (invitationError) {
      console.error('Error creating invitation:', invitationError)
      return { success: false, error: invitationError.message }
    }

    // Get inviter details for email
    const { data: inviter } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('id', invitedBy)
      .single()

    // Create audit log
    await createAuditLog({
      organization_id: orgId,
      user_id: invitedBy,
      event_type: 'user_action',
      action: 'create_invitation',
      resource_type: 'organization_invitation',
      resource_id: invitation.id,
      details: {
        email: data.email,
        role: data.role,
        expires_at: expiresAt.toISOString(),
        has_personal_message: !!data.personalMessage,
        existing_user: !!existingUser
      },
      outcome: 'success',
      severity: 'low',
      ip_address: deviceInfo?.ip,
      user_agent: deviceInfo?.userAgent,
      device_fingerprint: deviceInfo?.fingerprint,
    })

    const result: InvitationWithOrganization = {
      ...invitation,
      organization: invitation.organizations,
      inviter
    }

    return { success: true, invitation: result }
  } catch (error) {
    console.error('Unexpected error creating invitation:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Validate an invitation token and return invitation details
 */
export async function validateInvitationToken(
  token: string
): Promise<{ success: boolean; invitation?: InvitationWithOrganization; error?: string }> {
  try {
    const { data: invitation, error } = await supabaseAdmin
      .from('organization_invitations')
      .select(`
        *,
        organizations!inner (
          id,
          name,
          slug,
          logo_url,
          is_active
        )
      `)
      .eq('invitation_token', token)
      .single()

    if (error || !invitation) {
      return { success: false, error: 'Invalid invitation token' }
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return { 
        success: false, 
        error: `Invitation is ${invitation.status}` 
      }
    }

    // Check expiration
    if (new Date(invitation.token_expires_at) < new Date()) {
      // Auto-expire the invitation
      await supabaseAdmin
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return { success: false, error: 'Invitation has expired' }
    }

    // Check organization is still active
    if (!invitation.organizations.is_active) {
      return { success: false, error: 'Organization is no longer active' }
    }

    // Check attempt count
    if (invitation.attempt_count >= invitation.max_attempts) {
      await supabaseAdmin
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return { success: false, error: 'Too many failed attempts. Invitation expired.' }
    }

    // Get inviter details
    const { data: inviter } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('id', invitation.invited_by)
      .single()

    const result: InvitationWithOrganization = {
      ...invitation,
      organization: invitation.organizations,
      inviter
    }

    return { success: true, invitation: result }
  } catch (error) {
    console.error('Error validating invitation token:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Accept an organization invitation with security measures
 */
export async function acceptInvitation(
  token: string,
  userId: string,
  deviceInfo?: DeviceInfo
): Promise<{ success: boolean; membership?: any; error?: string }> {
  try {
    // Rate limiting check
    if (deviceInfo?.ip && !acceptanceRateLimiter.isAllowed(deviceInfo.ip)) {
      return { 
        success: false, 
        error: 'Too many acceptance attempts. Please try again in 15 minutes.' 
      }
    }

    // Validate the invitation first
    const validation = await validateInvitationToken(token)
    if (!validation.success || !validation.invitation) {
      // Increment attempt count on failed validation
      await supabaseAdmin
        .from('organization_invitations')
        .update({ 
          attempt_count: validation.invitation?.attempt_count ? validation.invitation.attempt_count + 1 : 1 
        })
        .eq('invitation_token', token)

      return validation
    }

    const invitation = validation.invitation

    // Verify the user accepting matches the invited email
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      // Increment attempt count for mismatched user
      await supabaseAdmin
        .from('organization_invitations')
        .update({ 
          attempt_count: invitation.attempt_count + 1 
        })
        .eq('id', invitation.id)

      return { success: false, error: 'User email does not match invitation' }
    }

    // Check if user is already a member (race condition protection)
    const { data: existingMembership } = await supabaseAdmin
      .from('organization_members')
      .select('status, role')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', userId)
      .single()

    if (existingMembership && existingMembership.status === 'active') {
      // Mark invitation as accepted since user is already member
      await supabaseAdmin
        .from('organization_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
          accepted_ip: deviceInfo?.ip,
          device_fingerprint: deviceInfo?.fingerprint
        })
        .eq('id', invitation.id)

      return { 
        success: false, 
        error: `You are already a member of ${invitation.organization?.name} with role: ${existingMembership.role}` 
      }
    }

    // Create or update membership record
    const membershipData = {
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
      custom_permissions: {},
      invited_by: invitation.invited_by,
      approved_by: invitation.invited_by, // Auto-approve invited users
      status: 'active' as const,
      is_primary: false, // Can be updated later by user
      receive_notifications: true,
      invitation_accepted_ip: deviceInfo?.ip,
      last_login_ip: deviceInfo?.ip,
    }

    let membership
    if (existingMembership) {
      // Update existing membership
      const { data: updatedMembership, error: updateError } = await supabaseAdmin
        .from('organization_members')
        .update({
          ...membershipData,
          joined_at: new Date().toISOString(),
        })
        .eq('organization_id', invitation.organization_id)
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

      if (updateError) {
        console.error('Error updating membership:', updateError)
        return { success: false, error: updateError.message }
      }
      membership = updatedMembership
    } else {
      // Create new membership
      const { data: newMembership, error: membershipError } = await supabaseAdmin
        .from('organization_members')
        .insert(membershipData)
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

      if (membershipError) {
        console.error('Error creating membership:', membershipError)
        return { success: false, error: membershipError.message }
      }
      membership = newMembership
    }

    // Mark invitation as accepted
    const { error: acceptError } = await supabaseAdmin
      .from('organization_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
        accepted_ip: deviceInfo?.ip,
        device_fingerprint: deviceInfo?.fingerprint
      })
      .eq('id', invitation.id)

    if (acceptError) {
      console.error('Error accepting invitation:', acceptError)
      // Don't fail the whole operation since membership was created
    }

    // Create audit logs
    await Promise.all([
      createAuditLog({
        organization_id: invitation.organization_id,
        user_id: userId,
        event_type: 'user_action',
        action: 'accept_invitation',
        resource_type: 'organization_invitation',
        resource_id: invitation.id,
        details: {
          invitation_id: invitation.id,
          role: invitation.role,
          invited_by: invitation.invited_by,
          organization_name: invitation.organization?.name
        },
        outcome: 'success',
        severity: 'low',
        ip_address: deviceInfo?.ip,
        user_agent: deviceInfo?.userAgent,
        device_fingerprint: deviceInfo?.fingerprint,
      }),
      createAuditLog({
        organization_id: invitation.organization_id,
        user_id: userId,
        event_type: 'user_action',
        action: 'join_organization',
        resource_type: 'organization_member',
        resource_id: membership.id,
        details: {
          role: invitation.role,
          via_invitation: true,
          invited_by: invitation.invited_by
        },
        outcome: 'success',
        severity: 'low',
        ip_address: deviceInfo?.ip,
        user_agent: deviceInfo?.userAgent,
        device_fingerprint: deviceInfo?.fingerprint,
      })
    ])

    return { success: true, membership }
  } catch (error) {
    console.error('Unexpected error accepting invitation:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Reject an invitation
 */
export async function rejectInvitation(
  token: string,
  reason?: string,
  deviceInfo?: DeviceInfo
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: invitation, error } = await supabaseAdmin
      .from('organization_invitations')
      .select('id, organization_id, email, status, invited_by')
      .eq('invitation_token', token)
      .single()

    if (error || !invitation) {
      return { success: false, error: 'Invalid invitation token' }
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: `Invitation is already ${invitation.status}` }
    }

    // Update invitation status
    const { error: rejectError } = await supabaseAdmin
      .from('organization_invitations')
      .update({
        status: 'rejected',
        accepted_ip: deviceInfo?.ip, // Store IP for audit purposes
        device_fingerprint: deviceInfo?.fingerprint
      })
      .eq('id', invitation.id)

    if (rejectError) {
      console.error('Error rejecting invitation:', rejectError)
      return { success: false, error: rejectError.message }
    }

    // Create audit log
    await createAuditLog({
      organization_id: invitation.organization_id,
      event_type: 'user_action',
      action: 'reject_invitation',
      resource_type: 'organization_invitation',
      resource_id: invitation.id,
      details: {
        email: invitation.email,
        reason: reason || 'No reason provided',
        invited_by: invitation.invited_by
      },
      outcome: 'success',
      severity: 'low',
      ip_address: deviceInfo?.ip,
      user_agent: deviceInfo?.userAgent,
      device_fingerprint: deviceInfo?.fingerprint,
    })

    return { success: true }
  } catch (error) {
    console.error('Unexpected error rejecting invitation:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Revoke an invitation (admin/owner only)
 */
export async function revokeInvitation(
  invitationId: string,
  revokedBy: string,
  reason?: string,
  deviceInfo?: DeviceInfo
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get invitation details
    const { data: invitation, error } = await supabaseAdmin
      .from('organization_invitations')
      .select('id, organization_id, email, status, invited_by')
      .eq('id', invitationId)
      .single()

    if (error || !invitation) {
      return { success: false, error: 'Invitation not found' }
    }

    // Check revoker permissions
    const { data: revokerMembership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', revokedBy)
      .eq('status', 'active')
      .single()

    if (!revokerMembership || !['owner', 'admin'].includes(revokerMembership.role)) {
      return { success: false, error: 'Insufficient permissions to revoke invitations' }
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: `Cannot revoke ${invitation.status} invitation` }
    }

    // Revoke the invitation
    const { error: revokeError } = await supabaseAdmin
      .from('organization_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)

    if (revokeError) {
      console.error('Error revoking invitation:', revokeError)
      return { success: false, error: revokeError.message }
    }

    // Create audit log
    await createAuditLog({
      organization_id: invitation.organization_id,
      user_id: revokedBy,
      event_type: 'user_action',
      action: 'revoke_invitation',
      resource_type: 'organization_invitation',
      resource_id: invitation.id,
      details: {
        email: invitation.email,
        reason: reason || 'No reason provided',
        invited_by: invitation.invited_by
      },
      outcome: 'success',
      severity: 'medium',
      ip_address: deviceInfo?.ip,
      user_agent: deviceInfo?.userAgent,
      device_fingerprint: deviceInfo?.fingerprint,
    })

    return { success: true }
  } catch (error) {
    console.error('Unexpected error revoking invitation:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Resend an invitation (generates new token and extends expiry)
 */
export async function resendInvitation(
  invitationId: string,
  resentBy: string,
  deviceInfo?: DeviceInfo
): Promise<{ success: boolean; invitation?: InvitationWithOrganization; error?: string }> {
  try {
    // Get invitation details
    const { data: invitation, error } = await supabaseAdmin
      .from('organization_invitations')
      .select('id, organization_id, email, status, invited_by, attempt_count')
      .eq('id', invitationId)
      .single()

    if (error || !invitation) {
      return { success: false, error: 'Invitation not found' }
    }

    // Check permissions
    const { data: senderMembership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', resentBy)
      .eq('status', 'active')
      .single()

    if (!senderMembership || !['owner', 'admin'].includes(senderMembership.role)) {
      return { success: false, error: 'Insufficient permissions to resend invitations' }
    }

    // Check rate limiting
    if (!invitationRateLimiter.isAllowed(invitation.organization_id)) {
      return { 
        success: false, 
        error: 'Too many invitations sent recently. Please try again in an hour.' 
      }
    }

    if (!['pending', 'expired'].includes(invitation.status)) {
      return { success: false, error: `Cannot resend ${invitation.status} invitation` }
    }

    // Generate new tokens and extend expiry
    const newToken = generateInvitationToken()
    const newVerificationCode = generateVerificationCode()
    const newExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours

    // Update invitation
    const { data: updatedInvitation, error: updateError } = await supabaseAdmin
      .from('organization_invitations')
      .update({
        invitation_token: newToken,
        email_verification_code: newVerificationCode,
        token_expires_at: newExpiresAt.toISOString(),
        status: 'pending',
        attempt_count: 0, // Reset attempt count
        created_ip: deviceInfo?.ip
      })
      .eq('id', invitationId)
      .select(`
        *,
        organizations!inner (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .single()

    if (updateError) {
      console.error('Error resending invitation:', updateError)
      return { success: false, error: updateError.message }
    }

    // Get sender details
    const { data: sender } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('id', resentBy)
      .single()

    // Create audit log
    await createAuditLog({
      organization_id: invitation.organization_id,
      user_id: resentBy,
      event_type: 'user_action',
      action: 'resend_invitation',
      resource_type: 'organization_invitation',
      resource_id: invitation.id,
      details: {
        email: invitation.email,
        original_invited_by: invitation.invited_by,
        resent_by: resentBy,
        new_expires_at: newExpiresAt.toISOString()
      },
      outcome: 'success',
      severity: 'low',
      ip_address: deviceInfo?.ip,
      user_agent: deviceInfo?.userAgent,
      device_fingerprint: deviceInfo?.fingerprint,
    })

    const result: InvitationWithOrganization = {
      ...updatedInvitation,
      organization: updatedInvitation.organizations,
      inviter: sender
    }

    return { success: true, invitation: result }
  } catch (error) {
    console.error('Unexpected error resending invitation:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * List pending invitations for an organization
 */
export async function listPendingInvitations(
  orgId: string,
  userId: string
): Promise<{ success: boolean; invitations?: InvitationWithOrganization[]; error?: string }> {
  try {
    // Check user permissions
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Insufficient permissions to view invitations' }
    }

    const { data: invitations, error } = await supabaseAdmin
      .from('organization_invitations')
      .select(`
        *,
        organizations!inner (
          id,
          name,
          slug,
          logo_url
        ),
        inviter:users!invited_by (
          id,
          email,
          full_name
        )
      `)
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing invitations:', error)
      return { success: false, error: error.message }
    }

    const formattedInvitations: InvitationWithOrganization[] = invitations?.map((inv: any) => ({
      ...inv,
      organization: inv.organizations,
      inviter: inv.inviter
    })) || []

    return { success: true, invitations: formattedInvitations }
  } catch (error) {
    console.error('Unexpected error listing invitations:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Cleanup expired invitations (should be run periodically)
 */
export async function cleanupExpiredInvitations(): Promise<{ success: boolean; cleaned?: number; error?: string }> {
  try {
    const { data: expiredInvitations, error: selectError } = await supabaseAdmin
      .from('organization_invitations')
      .select('id, organization_id, email')
      .eq('status', 'pending')
      .lt('token_expires_at', new Date().toISOString())

    if (selectError) {
      console.error('Error selecting expired invitations:', selectError)
      return { success: false, error: selectError.message }
    }

    if (!expiredInvitations || expiredInvitations.length === 0) {
      return { success: true, cleaned: 0 }
    }

    // Update expired invitations
    const { error: updateError } = await supabaseAdmin
      .from('organization_invitations')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('token_expires_at', new Date().toISOString())

    if (updateError) {
      console.error('Error updating expired invitations:', updateError)
      return { success: false, error: updateError.message }
    }

    // Create audit logs for cleanup
    const auditPromises = expiredInvitations.map(invitation =>
      createAuditLog({
        organization_id: invitation.organization_id,
        event_type: 'system_admin',
        action: 'expire_invitation',
        resource_type: 'organization_invitation',
        resource_id: invitation.id,
        details: {
          email: invitation.email,
          cleanup_reason: 'automatic_expiry'
        },
        outcome: 'success',
        severity: 'low',
      })
    )

    await Promise.all(auditPromises)

    console.log(`Cleaned up ${expiredInvitations.length} expired invitations`)
    return { success: true, cleaned: expiredInvitations.length }
  } catch (error) {
    console.error('Unexpected error cleaning up invitations:', error)
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
  details?: Record<string, any>
  outcome: 'success' | 'failure' | 'error' | 'blocked'
  severity: 'low' | 'medium' | 'high' | 'critical'
  ip_address?: string
  user_agent?: string
  device_fingerprint?: string
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