import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/vault-invitations - Get user's pending vault invitations
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    // Get invitations for current user
    let query = supabase
      .from('vault_invitations')
      .select(`
        id, permission_level, personal_message, status,
        created_at, expires_at, responded_at, accepted_at,
        invitation_token,
        vault:vaults!inner(
          id, name, description, meeting_date, status as vault_status,
          priority, category, member_count, asset_count,
          organization:organizations!vaults_organization_id_fkey(
            id, name, slug, logo_url
          )
        ),
        invited_by:auth.users!vault_invitations_invited_by_user_id_fkey(
          id, email
        )
      `)
      .eq('invited_user_id', user.id)

    // Filter by status if specified
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Add pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: invitations, error: invitationsError, count } = await query

    if (invitationsError) {
      console.error('User invitations fetch error:', invitationsError)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    // Transform response data
    const transformedInvitations = invitations?.map(invitation => ({
      id: invitation.id,
      permissionLevel: invitation.permission_level,
      personalMessage: invitation.personal_message,
      status: invitation.status,
      createdAt: invitation.created_at,
      expiresAt: invitation.expires_at,
      respondedAt: invitation.responded_at,
      acceptedAt: invitation.accepted_at,
      invitationToken: invitation.invitation_token,
      vault: {
        id: invitation.vault.id,
        name: invitation.vault.name,
        description: invitation.vault.description,
        meetingDate: invitation.vault.meeting_date,
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
      daysUntilExpiry: Math.ceil(
        (new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    })) || []

    return NextResponse.json({
      success: true,
      invitations: transformedInvitations,
      pagination: {
        limit,
        offset,
        total: count || 0
      },
      summary: {
        total: transformedInvitations.length,
        expiredCount: transformedInvitations.filter(i => i.isExpired).length,
        urgentCount: transformedInvitations.filter(i => i.daysUntilExpiry <= 1 && !i.isExpired).length
      }
    })

  } catch (error) {
    console.error('Vault invitations API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}