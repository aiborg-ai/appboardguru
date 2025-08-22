import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Vault status and priority types
type VaultStatus = 'draft' | 'active' | 'archived' | 'expired' | 'cancelled'
type VaultPriority = 'low' | 'medium' | 'high' | 'urgent'

interface CreateVaultRequest {
  organizationId: string
  name: string
  description?: string
  meetingDate?: string
  location?: string
  priority?: VaultPriority
  settings?: Record<string, unknown>
  tags?: string[]
  category?: string
  isPublic?: boolean
  requiresInvitation?: boolean
  accessCode?: string
  expiresAt?: string
}

interface VaultQueryParams {
  organizationId?: string
  status?: VaultStatus
  limit?: number
  offset?: number
  search?: string
  sortBy?: 'created_at' | 'updated_at' | 'meeting_date' | 'name'
  sortOrder?: 'asc' | 'desc'
}

// GET /api/vaults - List vaults with filtering
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
    const queryParams: VaultQueryParams = {
      status: searchParams.get('status') as VaultStatus || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      sortBy: searchParams.get('sortBy') as any || 'updated_at',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    }
    
    // Add optional fields only if they have values
    const organizationId = searchParams.get('organizationId')
    if (organizationId) {
      queryParams.organizationId = organizationId
    }
    
    const search = searchParams.get('search')
    if (search) {
      queryParams.search = search
    }

    // Build query
    let query = supabase
      .from('vaults')
      .select(`
        *,
        organization:organizations!vaults_organization_id_fkey(
          id, name, slug, logo_url
        ),
        created_by_user:auth.users!vaults_created_by_fkey(
          id, email
        ),
        vault_members!inner(
          id, role, status, joined_at
        )
      `)

    // Apply filters
    if (queryParams.organizationId) {
      query = query.eq('organization_id', queryParams.organizationId)
    }

    if (queryParams.status) {
      query = query.eq('status', queryParams.status)
    }

    // Text search
    if (queryParams.search) {
      query = query.or(`name.ilike.%${queryParams.search}%,description.ilike.%${queryParams.search}%`)
    }

    // Only show vaults where user is a member
    query = query.eq('vault_members.user_id', user.id)
    query = query.eq('vault_members.status', 'active')

    // Sorting
    const ascending = queryParams.sortOrder === 'asc'
    query = query.order(queryParams.sortBy!, { ascending })

    // Pagination
    query = query.range(queryParams.offset!, queryParams.offset! + queryParams.limit! - 1)

    const { data: vaults, error, count } = await query

    if (error) {
      console.error('Vaults query error:', error)
      return NextResponse.json({ error: 'Failed to fetch vaults' }, { status: 500 })
    }

    // Transform the data for frontend consumption
    const transformedVaults = vaults?.map(vault => ({
      id: vault.id,
      name: (vault as any).name,
      description: (vault as any).description,
      meetingDate: (vault as any).meeting_date,
      location: (vault as any).location,
      status: (vault as any).status,
      priority: (vault as any).priority,
      createdAt: (vault as any).created_at,
      updatedAt: (vault as any).updated_at,
      expiresAt: (vault as any).expires_at,
      memberCount: (vault as any).member_count,
      assetCount: (vault as any).asset_count,
      totalSizeBytes: (vault as any).total_size_bytes,
      lastActivityAt: (vault as any).last_activity_at,
      tags: (vault as any).tags,
      category: (vault as any).category,
      organization: (vault as any).organization,
      createdBy: (vault as any).created_by_user,
      userRole: (vault as any).vault_members?.[0]?.role,
      userJoinedAt: (vault as any).vault_members?.[0]?.joined_at,
      settings: (vault as any).settings,
      isPublic: (vault as any).is_public,
      requiresInvitation: (vault as any).requires_invitation
    }))

    return NextResponse.json({
      success: true,
      vaults: transformedVaults,
      pagination: {
        limit: queryParams.limit,
        offset: queryParams.offset,
        total: count
      }
    })

  } catch (error) {
    console.error('Vaults API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/vaults - Create a new vault
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: CreateVaultRequest = await request.json()

    // Validate required fields
    if (!body.organizationId || !body.name) {
      return NextResponse.json({ 
        error: 'Organization ID and name are required' 
      }, { status: 400 })
    }

    // Check if user has permission to create vaults in this organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', body.organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ 
        error: 'Not authorized to create vaults in this organization' 
      }, { status: 403 })
    }

    // Only owners, admins, and members can create vaults
    if (!['owner', 'admin', 'member'].includes((membership as any).role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to create vaults' 
      }, { status: 403 })
    }

    // Prepare vault data
    const vaultData = {
      organization_id: body.organizationId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      meeting_date: body.meetingDate ? new Date(body.meetingDate).toISOString() : null,
      location: body.location?.trim() || null,
      created_by: user.id,
      priority: body.priority || 'medium',
      settings: body.settings || {},
      tags: body.tags || [],
      category: body.category || 'board_meeting',
      is_public: body.isPublic || false,
      requires_invitation: body.requiresInvitation !== false, // default true
      access_code: body.accessCode || null,
      expires_at: body.expiresAt ? new Date(body.expiresAt).toISOString() : null,
      status: 'draft' // New vaults start as draft
    }

    // Create vault
    const { data: vault, error: vaultError } = await supabase
      .from('vaults')
      .insert(vaultData)
      .select(`
        *,
        organization:organizations!vaults_organization_id_fkey(
          id, name, slug, logo_url
        )
      `)
      .single()

    if (vaultError) {
      console.error('Vault creation error:', vaultError)
      return NextResponse.json({ 
        error: 'Failed to create vault' 
      }, { status: 500 })
    }

    // Add creator as vault owner
    const { error: memberError } = await supabase
      .from('vault_members')
      .insert({
        vault_id: vault.id,
        user_id: user.id,
        organization_id: body.organizationId,
        role: 'owner',
        status: 'active',
        joined_via: 'creator'
      })

    if (memberError) {
      console.error('Vault member creation error:', memberError)
      // Clean up the vault if member creation fails
      await supabase.from('vaults').delete().eq('id', vault.id)
      return NextResponse.json({ 
        error: 'Failed to set up vault permissions' 
      }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('vault_activity_log')
      .insert({
        vault_id: vault.id,
        organization_id: body.organizationId,
        activity_type: 'vault_created',
        performed_by_user_id: user.id,
        activity_details: {
          vault_name: (vault as any).name,
          vault_category: (vault as any).category,
          created_via: 'api'
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    // Transform response
    const transformedVault = {
      id: vault.id,
      name: (vault as any).name,
      description: (vault as any).description,
      meetingDate: (vault as any).meeting_date,
      location: (vault as any).location,
      status: (vault as any).status,
      priority: (vault as any).priority,
      createdAt: (vault as any).created_at,
      updatedAt: (vault as any).updated_at,
      expiresAt: (vault as any).expires_at,
      memberCount: 1, // Just the creator
      assetCount: 0,
      totalSizeBytes: 0,
      lastActivityAt: (vault as any).last_activity_at,
      tags: (vault as any).tags,
      category: (vault as any).category,
      organization: (vault as any).organization,
      userRole: 'owner',
      settings: (vault as any).settings,
      isPublic: (vault as any).is_public,
      requiresInvitation: (vault as any).requires_invitation
    }

    return NextResponse.json({
      success: true,
      vault: transformedVault,
      message: 'Vault created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Vault creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}