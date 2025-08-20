import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface BulkInviteRequest {
  userIds?: string[]
  emails?: string[]
  permissionLevel?: 'viewer' | 'contributor' | 'moderator' | 'admin'
  personalMessage?: string
  expiresAt?: string
  sendNotification?: boolean
}

interface InviteUserRequest {
  userId?: string
  email?: string
  permissionLevel?: 'viewer' | 'contributor' | 'moderator' | 'admin'
  personalMessage?: string
  expiresAt?: string
  sendNotification?: boolean
}

// POST /api/vaults/[id]/invite - Send vault invitations
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

    const vaultId = (await params).id
    const body: BulkInviteRequest = await request.json()

    // Validate request
    if ((!body.userIds || body.userIds.length === 0) && (!body.emails || body.emails.length === 0)) {
      return NextResponse.json({ 
        error: 'Either userIds or emails must be provided' 
      }, { status: 400 })
    }

    // Check user's permission to invite to this vault
    const { data: membership, error: membershipError } = await supabase
      .from('vault_members')
      .select(`
        role, status, organization_id,
        vault:vaults!inner(
          id, name, status, organization_id,
          organization:organizations!vaults_organization_id_fkey(id, name)
        )
      `)
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only owners, admins, and moderators can invite users
    if (!['owner', 'admin', 'moderator'].includes((membership as any).role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to invite users to this vault' 
      }, { status: 403 })
    }

    // Check if vault is in a state that allows invitations
    if (!['draft', 'active'].includes((membership as any).vault.status)) {
      return NextResponse.json({ 
        error: 'Cannot send invitations to archived or cancelled vaults' 
      }, { status: 400 })
    }

    const results: {
      successful: any[]
      failed: any[]
      duplicates: any[]
    } = {
      successful: [],
      failed: [],
      duplicates: []
    }

    // Process user IDs
    if (body.userIds && body.userIds.length > 0) {
      for (const userId of body.userIds) {
        try {
          // Check if user exists
          const { data: targetUser, error: userError } = await supabase
            .from('auth.users')
            .select('id, email')
            .eq('id', userId)
            .single()

          if (userError || !targetUser) {
            results.failed.push({ userId, error: 'User not found' })
            continue
          }

          // Check if user is already a member
          const { data: existingMember } = await supabase
            .from('vault_members')
            .select('id, status')
            .eq('vault_id', vaultId)
            .eq('user_id', userId)
            .single()

          if (existingMember && existingMember.status === 'active') {
            results.duplicates.push({ userId, email: targetUser.email, reason: 'Already a member' })
            continue
          }

          // Check for existing pending invitation
          const { data: existingInvitation } = await supabase
            .from('vault_invitations')
            .select('id, status')
            .eq('vault_id', vaultId)
            .eq('invited_user_id', userId)
            .eq('status', 'pending')
            .single()

          if (existingInvitation) {
            results.duplicates.push({ userId, email: targetUser.email, reason: 'Invitation already pending' })
            continue
          }

          // Create invitation
          const invitationData = {
            vault_id: vaultId,
            invited_user_id: userId,
            invited_by_user_id: user.id,
            organization_id: (membership as any).organization_id,
            permission_level: body.permissionLevel || 'viewer',
            personal_message: body.personalMessage || null,
            expires_at: body.expiresAt ? new Date(body.expiresAt).toISOString() : 
                        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days default
            status: 'pending',
            sent_via: 'api',
            created_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            device_fingerprint: request.headers.get('user-agent')?.substring(0, 255)
          }

          const { data: invitation, error: inviteError } = await supabase
            .from('vault_invitations')
            .insert(invitationData)
            .select(`
              id, invitation_token, expires_at,
              vault:vaults!inner(id, name),
              organization:organizations!inner(id, name)
            `)
            .single()

          if (inviteError) {
            console.error('Invitation creation error:', inviteError)
            results.failed.push({ userId, error: 'Failed to create invitation' })
            continue
          }

          // Log activity
          await supabase
            .from('vault_activity_log')
            .insert({
              vault_id: vaultId,
              organization_id: (membership as any).organization_id,
              activity_type: 'member_invited',
              performed_by_user_id: user.id,
              affected_user_id: userId,
              activity_details: {
                invitation_id: (invitation as any).id,
                permission_level: body.permissionLevel || 'viewer',
                expires_at: (invitation as any).expires_at,
                invitation_method: 'bulk_invite_api'
              },
              ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
              user_agent: request.headers.get('user-agent')
            })

          results.successful.push({
            userId,
            email: targetUser.email,
            invitationId: (invitation as any).id,
            invitationToken: (invitation as any).invitation_token,
            expiresAt: (invitation as any).expires_at
          })

          // TODO: Send email notification if requested
          if (body.sendNotification !== false) {
            // Email sending logic will be implemented separately
            console.log(`TODO: Send invitation email to ${targetUser.email} for vault ${(membership as any).vault.name}`)
          }

        } catch (error) {
          console.error('Error processing invitation for user', userId, error)
          results.failed.push({ userId, error: 'Internal error processing invitation' })
        }
      }
    }

    // Process emails (for users not in the system yet)
    if (body.emails && body.emails.length > 0) {
      for (const email of body.emails) {
        try {
          // Validate email format
          if (!email.includes('@') || email.length < 5) {
            results.failed.push({ email, error: 'Invalid email format' })
            continue
          }

          // Check if user exists with this email
          const { data: existingUser } = await supabase
            .from('auth.users')
            .select('id, email')
            .eq('email', email)
            .single()

          if (existingUser) {
            // If user exists, process like userIds
            const userId = existingUser.id

            // Check if user is already a member
            const { data: existingMember } = await supabase
              .from('vault_members')
              .select('id, status')
              .eq('vault_id', vaultId)
              .eq('user_id', userId)
              .single()

            if (existingMember && existingMember.status === 'active') {
              results.duplicates.push({ email, reason: 'User is already a member' })
              continue
            }

            // Check for existing pending invitation
            const { data: existingInvitation } = await supabase
              .from('vault_invitations')
              .select('id, status')
              .eq('vault_id', vaultId)
              .eq('invited_user_id', userId)
              .eq('status', 'pending')
              .single()

            if (existingInvitation) {
              results.duplicates.push({ email, reason: 'Invitation already pending' })
              continue
            }

            // Create invitation for existing user
            const invitationData = {
              vault_id: vaultId,
              invited_user_id: userId,
              invited_by_user_id: user.id,
              organization_id: (membership as any).organization_id,
              permission_level: body.permissionLevel || 'viewer',
              personal_message: body.personalMessage || null,
              expires_at: body.expiresAt ? new Date(body.expiresAt).toISOString() : 
                          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }

            const { data: invitation, error: inviteError } = await supabase
              .from('vault_invitations')
              .insert(invitationData)
              .select('id, invitation_token, expires_at')
              .single()

            if (inviteError) {
              results.failed.push({ email, error: 'Failed to create invitation' })
              continue
            }

            results.successful.push({
              email,
              userId,
              invitationId: (invitation as any).id,
              invitationToken: (invitation as any).invitation_token,
              expiresAt: (invitation as any).expires_at
            })

          } else {
            // For non-existing users, we could create a pending invitation by email
            // This would require extending the schema to support email-only invitations
            results.failed.push({ 
              email, 
              error: 'User not found. User must register first to receive vault invitations.' 
            })
          }

        } catch (error) {
          console.error('Error processing invitation for email', email, error)
          results.failed.push({ email, error: 'Internal error processing invitation' })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${body.userIds?.length || 0} user IDs and ${body.emails?.length || 0} emails`,
      results: {
        successful: results.successful.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length,
        details: results
      }
    })

  } catch (error) {
    console.error('Vault invitation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/vaults/[id]/invite - List pending invitations for vault
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

    const vaultId = (await params).id

    // Check user's access to view vault invitations
    const { data: membership, error: membershipError } = await supabase
      .from('vault_members')
      .select('role, status')
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only owners, admins, and moderators can view invitations
    if (!['owner', 'admin', 'moderator'].includes((membership as any).role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to view vault invitations' 
      }, { status: 403 })
    }

    // Get invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('vault_invitations')
      .select(`
        id, permission_level, personal_message, status,
        created_at, expires_at, responded_at, accepted_at,
        attempt_count, sent_via,
        invited_user:auth.users!vault_invitations_invited_user_id_fkey(
          id, email
        ),
        invited_by:auth.users!vault_invitations_invited_by_user_id_fkey(
          id, email
        )
      `)
      .eq('vault_id', vaultId)
      .order('created_at', { ascending: false })

    if (invitationsError) {
      console.error('Invitations fetch error:', invitationsError)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    const transformedInvitations = invitations.map(invitation => ({
      id: (invitation as any).id,
      permissionLevel: (invitation as any).permission_level,
      personalMessage: (invitation as any).personal_message,
      status: (invitation as any).status,
      createdAt: (invitation as any).created_at,
      expiresAt: (invitation as any).expires_at,
      respondedAt: (invitation as any).responded_at,
      acceptedAt: (invitation as any).accepted_at,
      attemptCount: (invitation as any).attempt_count,
      sentVia: (invitation as any).sent_via,
      invitedUser: {
        id: (invitation as any).invited_user.id,
        email: (invitation as any).invited_user.email
      },
      invitedBy: {
        id: (invitation as any).invited_by.id,
        email: (invitation as any).invited_by.email
      }
    }))

    return NextResponse.json({
      success: true,
      invitations: transformedInvitations,
      summary: {
        total: invitations.length,
        pending: invitations.filter((i: any) => i.status === 'pending').length,
        accepted: invitations.filter((i: any) => i.status === 'accepted').length,
        rejected: invitations.filter((i: any) => i.status === 'rejected').length,
        expired: invitations.filter((i: any) => i.status === 'expired').length
      }
    })

  } catch (error) {
    console.error('Vault invitations list API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}