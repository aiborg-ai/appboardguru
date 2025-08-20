import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface RespondToInvitationRequest {
  action: 'accept' | 'reject'
  message?: string // Optional response message
}

// POST /api/vault-invitations/[id] - Accept or reject vault invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invitationId = (await params).id
    const body: RespondToInvitationRequest = await request.json()

    // Validate action
    if (!['accept', 'reject'].includes(body.action)) {
      return NextResponse.json({ 
        error: 'Action must be either "accept" or "reject"' 
      }, { status: 400 })
    }

    // Get the invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('vault_invitations')
      .select(`
        id, vault_id, invited_user_id, organization_id, 
        permission_level, status, expires_at,
        vault:vaults!inner(
          id, name, status as vault_status,
          organization:organizations!vaults_organization_id_fkey(id, name)
        ),
        invited_by:auth.users!vault_invitations_invited_by_user_id_fkey(
          id, email
        )
      `)
      .eq('id', invitationId)
      .eq('invited_user_id', user.id) // Ensure user can only respond to their own invitations
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found or access denied' 
      }, { status: 404 })
    }

    // Check invitation status and expiry
    if (invitation.status !== 'pending') {
      return NextResponse.json({ 
        error: `Invitation has already been ${invitation.status}` 
      }, { status: 400 })
    }

    if (new Date() > new Date(invitation.expires_at)) {
      // Mark as expired
      await supabase
        .from('vault_invitations')
        .update({ 
          status: 'expired',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      return NextResponse.json({ 
        error: 'Invitation has expired' 
      }, { status: 400 })
    }

    // Check if vault is still accepting new members
    if (!['draft', 'active'].includes(invitation.vault.vault_status)) {
      return NextResponse.json({ 
        error: 'Vault is no longer accepting new members' 
      }, { status: 400 })
    }

    const now = new Date().toISOString()
    
    if (body.action === 'accept') {
      // Start transaction-like operations
      
      // 1. Check if user is already a member (race condition protection)
      const { data: existingMember } = await supabase
        .from('vault_members')
        .select('id, status')
        .eq('vault_id', invitation.vault_id)
        .eq('user_id', user.id)
        .single()

      if (existingMember && existingMember.status === 'active') {
        // Update invitation status to accepted even if already a member
        await supabase
          .from('vault_invitations')
          .update({
            status: 'accepted',
            responded_at: now,
            accepted_at: now,
            accepted_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
          })
          .eq('id', invitationId)

        return NextResponse.json({
          success: true,
          message: 'You are already a member of this vault',
          alreadyMember: true
        })
      }

      // 2. Add user to vault members
      const { error: memberError } = await supabase
        .from('vault_members')
        .insert({
          vault_id: invitation.vault_id,
          user_id: user.id,
          organization_id: invitation.organization_id,
          role: invitation.permission_level === 'admin' ? 'admin' : 
                invitation.permission_level === 'moderator' ? 'moderator' :
                invitation.permission_level === 'contributor' ? 'contributor' : 'viewer',
          status: 'active',
          invitation_id: invitationId,
          joined_via: 'invitation',
          joined_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
        })

      if (memberError) {
        console.error('Vault member creation error:', memberError)
        return NextResponse.json({ 
          error: 'Failed to add you to the vault' 
        }, { status: 500 })
      }

      // 3. Update invitation status to accepted
      const { error: updateError } = await supabase
        .from('vault_invitations')
        .update({
          status: 'accepted',
          responded_at: now,
          accepted_at: now,
          accepted_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
        })
        .eq('id', invitationId)

      if (updateError) {
        console.error('Invitation update error:', updateError)
        // Try to clean up the member record
        await supabase
          .from('vault_members')
          .delete()
          .eq('vault_id', invitation.vault_id)
          .eq('user_id', user.id)
          .eq('invitation_id', invitationId)

        return NextResponse.json({ 
          error: 'Failed to update invitation status' 
        }, { status: 500 })
      }

      // 4. Log activity
      await supabase
        .from('vault_activity_log')
        .insert({
          vault_id: invitation.vault_id,
          organization_id: invitation.organization_id,
          activity_type: 'member_joined',
          performed_by_user_id: user.id,
          activity_details: {
            invitation_id: invitationId,
            joined_via: 'invitation_acceptance',
            assigned_role: invitation.permission_level,
            response_message: body.message || null
          },
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent')
        })

      return NextResponse.json({
        success: true,
        message: `Successfully joined ${invitation.vault.name}`,
        vault: {
          id: invitation.vault.id,
          name: invitation.vault.name,
          organization: invitation.vault.organization
        },
        role: invitation.permission_level
      })

    } else if (body.action === 'reject') {
      // Update invitation status to rejected
      const { error: updateError } = await supabase
        .from('vault_invitations')
        .update({
          status: 'rejected',
          responded_at: now
        })
        .eq('id', invitationId)

      if (updateError) {
        console.error('Invitation rejection error:', updateError)
        return NextResponse.json({ 
          error: 'Failed to reject invitation' 
        }, { status: 500 })
      }

      // Log activity
      await supabase
        .from('vault_activity_log')
        .insert({
          vault_id: invitation.vault_id,
          organization_id: invitation.organization_id,
          activity_type: 'member_invited', // Keep as invited but with rejection details
          performed_by_user_id: invitation.invited_by.id, // Original inviter
          affected_user_id: user.id,
          activity_details: {
            invitation_id: invitationId,
            invitation_response: 'rejected',
            response_message: body.message || null,
            rejected_at: now
          },
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent')
        })

      return NextResponse.json({
        success: true,
        message: `Invitation to ${invitation.vault.name} has been rejected`,
        vault: {
          id: invitation.vault.id,
          name: invitation.vault.name,
          organization: invitation.vault.organization
        }
      })
    }

  } catch (error) {
    console.error('Vault invitation response API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/vault-invitations/[id] - Get specific invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invitationId = (await params).id

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('vault_invitations')
      .select(`
        id, permission_level, personal_message, status,
        created_at, expires_at, responded_at, accepted_at,
        vault:vaults!inner(
          id, name, description, meeting_date, status as vault_status,
          priority, category, member_count, asset_count, location,
          organization:organizations!vaults_organization_id_fkey(
            id, name, slug, logo_url, description
          )
        ),
        invited_by:auth.users!vault_invitations_invited_by_user_id_fkey(
          id, email
        )
      `)
      .eq('id', invitationId)
      .eq('invited_user_id', user.id)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found or access denied' 
      }, { status: 404 })
    }

    // Transform response
    const transformedInvitation = {
      id: invitation.id,
      permissionLevel: invitation.permission_level,
      personalMessage: invitation.personal_message,
      status: invitation.status,
      createdAt: invitation.created_at,
      expiresAt: invitation.expires_at,
      respondedAt: invitation.responded_at,
      acceptedAt: invitation.accepted_at,
      vault: {
        id: invitation.vault.id,
        name: invitation.vault.name,
        description: invitation.vault.description,
        meetingDate: invitation.vault.meeting_date,
        location: invitation.vault.location,
        status: invitation.vault.vault_status,
        priority: invitation.vault.priority,
        category: invitation.vault.category,
        memberCount: invitation.vault.member_count,
        assetCount: invitation.vault.asset_count,
        organization: invitation.vault.organization
      },
      invitedBy: {
        id: invitation.invited_by.id,
        email: invitation.invited_by.email
      },
      
      // Computed fields
      isExpired: new Date() > new Date(invitation.expires_at),
      canRespond: invitation.status === 'pending' && new Date() <= new Date(invitation.expires_at),
      daysUntilExpiry: Math.ceil(
        (new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    }

    return NextResponse.json({
      success: true,
      invitation: transformedInvitation
    })

  } catch (error) {
    console.error('Vault invitation details API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}