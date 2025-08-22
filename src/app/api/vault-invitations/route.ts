import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/vault-invitations - Get user's pending vault invitations
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
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
          id, name, description, meeting_date, status,
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
      id: (invitation as any).id,
      permissionLevel: (invitation as any).permission_level,
      personalMessage: (invitation as any).personal_message,
      status: (invitation as any).status,
      createdAt: (invitation as any).created_at,
      expiresAt: (invitation as any).expires_at,
      respondedAt: (invitation as any).responded_at,
      acceptedAt: (invitation as any).accepted_at,
      invitationToken: (invitation as any).invitation_token,
      vault: {
        id: (invitation as any).vault.id,
        name: (invitation as any).vault.name,
        description: (invitation as any).vault.description,
        meetingDate: (invitation as any).vault.meeting_date,
        status: (invitation as any).vault.status,
        priority: (invitation as any).vault.priority,
        category: (invitation as any).vault.category,
        memberCount: (invitation as any).vault.member_count,
        assetCount: (invitation as any).vault.asset_count,
        organization: (invitation as any).vault.organization
      },
      invitedBy: {
        id: (invitation as any).invited_by.id,
        email: (invitation as any).invited_by.email
      },
      
      // Computed fields
      isExpired: new Date() > new Date((invitation as any).expires_at),
      daysUntilExpiry: Math.ceil(
        (new Date((invitation as any).expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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