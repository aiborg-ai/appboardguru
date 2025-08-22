"use server"

import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

interface InvitationFormData {
  organizationId: string
  invitations: Array<{
    email: string
    role: 'admin' | 'member' | 'viewer'
  }>
  personalMessage?: string
  expiresIn: number
}

interface ActionResult {
  success: boolean
  error?: string
  data?: any[]
  fieldErrors?: Record<string, string>
}

/**
 * Modern server action for creating invitations
 * Uses React 19 patterns with proper error handling and validation
 */
export async function createInvitationsAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  try {
    // Extract and validate form data
    const organizationId = formData.get('organizationId') as string
    const invitationsJson = formData.get('invitations') as string
    const personalMessage = formData.get('personalMessage') as string
    const expiresIn = parseInt(formData.get('expiresIn') as string)

    if (!organizationId) {
      return { success: false, error: 'Organization ID is required' }
    }

    let invitations: Array<{ email: string; role: 'admin' | 'member' | 'viewer' }>
    
    try {
      invitations = JSON.parse(invitationsJson)
    } catch {
      return { success: false, error: 'Invalid invitation data' }
    }

    // Server-side validation
    const fieldErrors: Record<string, string> = {}
    
    if (!Array.isArray(invitations) || invitations.length === 0) {
      return { success: false, error: 'At least one invitation is required' }
    }

    if (invitations.length > 10) {
      return { success: false, error: 'Maximum 10 invitations allowed' }
    }

    // Validate each invitation
    invitations.forEach((invitation, index) => {
      if (!invitation.email || typeof invitation.email !== 'string') {
        fieldErrors[`invitation-${index}-email`] = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.email)) {
        fieldErrors[`invitation-${index}-email`] = 'Invalid email format'
      }

      if (!invitation.role || !['admin', 'member', 'viewer'].includes(invitation.role)) {
        fieldErrors[`invitation-${index}-role`] = 'Invalid role'
      }
    })

    if (personalMessage && personalMessage.length > 500) {
      fieldErrors.personalMessage = 'Personal message must be less than 500 characters'
    }

    if (isNaN(expiresIn) || expiresIn < 1 || expiresIn > 168) {
      fieldErrors.expiresIn = 'Expiration must be between 1 and 168 hours'
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, error: 'Validation failed', fieldErrors }
    }

    // Get current user from Supabase
    const supabase = await createSupabaseServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Verify user has permission to invite to this organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single() as any

    if (membershipError || !membership) {
      return { success: false, error: 'You do not have permission to invite members to this organization' }
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Only owners and admins can invite members' }
    }

    // Process invitations
    const results = []
    const errors = []

    for (const invitation of invitations) {
      try {
        // Check if user is already a member
        const { data: existingMember } = await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('email', invitation.email.toLowerCase())
          .single()

        if (existingMember) {
          errors.push(`${invitation.email} is already a member`)
          continue
        }

        // Check for existing pending invitation
        const { data: existingInvitation } = await supabase
          .from('organization_invitations')
          .select('id, status')
          .eq('organization_id', organizationId)
          .eq('email', invitation.email.toLowerCase())
          .eq('status', 'pending')
          .single()

        if (existingInvitation) {
          errors.push(`${invitation.email} already has a pending invitation`)
          continue
        }

        // Create invitation via API route
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/invitations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organizationId,
            email: invitation.email.toLowerCase(),
            role: invitation.role,
            personalMessage: personalMessage || undefined,
            expiresIn,
            invitedBy: user.id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          errors.push(`Failed to invite ${invitation.email}: ${errorData.message || 'Unknown error'}`)
          continue
        }

        const result = await response.json()
        results.push(result.data)

      } catch (error) {
        console.error('Error processing invitation:', error)
        errors.push(`Failed to invite ${invitation.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Revalidate relevant pages
    revalidatePath(`/organizations/${organizationId}/members`)
    revalidatePath(`/organizations/${organizationId}/settings`)

    if (results.length === 0) {
      return { 
        success: false, 
        error: `Failed to send invitations: ${errors.join(', ')}` 
      }
    }

    if (errors.length > 0) {
      return {
        success: true,
        data: results,
        error: `Some invitations failed: ${errors.join(', ')}`
      }
    }

    return {
      success: true,
      data: results
    }

  } catch (error) {
    console.error('Server action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Server action for optimistic invitation management
 */
export async function updateInvitationAction(
  invitationId: string,
  action: 'resend' | 'revoke',
  reason?: string
): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('organization_invitations')
      .select('organization_id, email')
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      return { success: false, error: 'Invitation not found' }
    }

    // Verify permissions
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (invitation as any)?.organization_id)
      .eq('user_id', user.id)
      .single() as any

    if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Permission denied' }
    }

    // Call API endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/invitations`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        invitationId,
        userId: user.id,
        reason,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.message || 'Action failed' }
    }

    const result = await response.json()

    // Revalidate relevant pages
    revalidatePath(`/organizations/${(invitation as any)?.organization_id}/members`)

    return {
      success: true,
      data: result.data
    }

  } catch (error) {
    console.error('Update invitation action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Server action for bulk invitation operations
 */
export async function bulkInvitationAction(
  organizationId: string,
  action: 'resend-all' | 'revoke-all',
  invitationIds: string[]
): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Verify permissions
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single() as any

    if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Permission denied' }
    }

    const results = []
    const errors = []

    for (const invitationId of invitationIds) {
      try {
        const result = await updateInvitationAction(
          invitationId, 
          action === 'resend-all' ? 'resend' : 'revoke'
        )
        
        if (result.success) {
          results.push(result.data)
        } else {
          errors.push(result.error || 'Unknown error')
        }
      } catch (error) {
        errors.push(`Failed to ${action} invitation: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (results.length === 0) {
      return { 
        success: false, 
        error: `Failed to ${action}: ${errors.join(', ')}` 
      }
    }

    return {
      success: true,
      data: results,
      error: errors.length > 0 ? `Some operations failed: ${errors.join(', ')}` : undefined
    }

  } catch (error) {
    console.error('Bulk invitation action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}