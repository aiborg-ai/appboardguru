import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface UpdateVaultRequest {
  name?: string
  description?: string
  meetingDate?: string
  location?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'draft' | 'active' | 'archived' | 'expired' | 'cancelled'
  settings?: Record<string, any>
  tags?: string[]
  category?: string
  isPublic?: boolean
  requiresInvitation?: boolean
  accessCode?: string
  expiresAt?: string
}

// GET /api/vaults/[id] - Get vault details
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

    // Get vault with detailed information
    const { data: vault, error: vaultError } = await supabase
      .from('vaults')
      .select(`
        *,
        organization:organizations!vaults_organization_id_fkey(
          id, name, slug, logo_url, description, website
        ),
        created_by_user:auth.users!vaults_created_by_fkey(
          id, email
        ),
        vault_members(
          id, role, status, joined_at, last_accessed_at, access_count,
          user:auth.users!vault_members_user_id_fkey(
            id, email
          )
        )
      `)
      .eq('id', vaultId)
      .single()

    if (vaultError) {
      if (vaultError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Vault not found' }, { status: 404 })
      }
      console.error('Vault fetch error:', vaultError)
      return NextResponse.json({ error: 'Failed to fetch vault' }, { status: 500 })
    }

    // Check if user has access to this vault
    const userMembership = vault.vault_members?.find(
      (member: any) => member.user.id === user.id && member.status === 'active'
    )

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get vault assets
    const { data: vaultAssets, error: assetsError } = await supabase
      .from('vault_assets')
      .select(`
        id, folder_path, display_order, is_featured, is_required_reading,
        added_at, view_count, download_count,
        asset:assets!vault_assets_asset_id_fkey(
          id, title, description, file_name, original_file_name,
          file_size, file_type, mime_type, thumbnail_url, created_at,
          owner:auth.users!assets_owner_id_fkey(id, email)
        ),
        added_by:auth.users!vault_assets_added_by_user_id_fkey(
          id, email
        )
      `)
      .eq('vault_id', vaultId)
      .order('display_order', { ascending: true })

    if (assetsError) {
      console.error('Vault assets fetch error:', assetsError)
    }

    // Get recent activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('vault_activity_log')
      .select(`
        id, activity_type, activity_description, timestamp,
        activity_details, risk_level,
        performed_by:auth.users!vault_activity_log_performed_by_user_id_fkey(
          id, email
        )
      `)
      .eq('vault_id', vaultId)
      .order('timestamp', { ascending: false })
      .limit(20)

    if (activityError) {
      console.error('Vault activity fetch error:', activityError)
    }

    // Transform response data
    const transformedVault = {
      id: vault.id,
      name: vault.name,
      description: vault.description,
      meetingDate: vault.meeting_date,
      location: vault.location,
      status: vault.status,
      priority: vault.priority,
      createdAt: vault.created_at,
      updatedAt: vault.updated_at,
      expiresAt: vault.expires_at,
      archivedAt: vault.archived_at,
      memberCount: vault.member_count,
      assetCount: vault.asset_count,
      totalSizeBytes: vault.total_size_bytes,
      lastActivityAt: vault.last_activity_at,
      tags: vault.tags,
      category: vault.category,
      organization: vault.organization,
      createdBy: vault.created_by_user,
      settings: vault.settings,
      isPublic: vault.is_public,
      requiresInvitation: vault.requires_invitation,
      accessCode: vault.access_code,
      
      // User-specific data
      userRole: userMembership.role,
      userJoinedAt: userMembership.joined_at,
      userLastAccessed: userMembership.last_accessed_at,
      
      // Related data
      members: vault.vault_members?.map((member: any) => ({
        id: member.id,
        role: member.role,
        status: member.status,
        joinedAt: member.joined_at,
        lastAccessedAt: member.last_accessed_at,
        accessCount: member.access_count,
        user: {
          id: member.user.id,
          email: member.user.email
        }
      })) || [],
      
      assets: vaultAssets?.map(asset => ({
        id: asset.id,
        folderPath: asset.folder_path,
        displayOrder: asset.display_order,
        isFeatured: asset.is_featured,
        isRequiredReading: asset.is_required_reading,
        addedAt: asset.added_at,
        viewCount: asset.view_count,
        downloadCount: asset.download_count,
        asset: {
          id: asset.asset.id,
          title: asset.asset.title,
          description: asset.asset.description,
          fileName: asset.asset.file_name,
          originalFileName: asset.asset.original_file_name,
          fileSize: asset.asset.file_size,
          fileType: asset.asset.file_type,
          mimeType: asset.asset.mime_type,
          thumbnailUrl: asset.asset.thumbnail_url,
          createdAt: asset.asset.created_at,
          owner: asset.asset.owner
        },
        addedBy: asset.added_by
      })) || [],
      
      recentActivity: recentActivity?.map(activity => ({
        id: activity.id,
        type: activity.activity_type,
        description: activity.activity_description,
        timestamp: activity.timestamp,
        details: activity.activity_details,
        riskLevel: activity.risk_level,
        performedBy: activity.performed_by
      })) || []
    }

    // Update last access time for the user
    await supabase
      .from('vault_members')
      .update({ 
        last_accessed_at: new Date().toISOString(),
        access_count: userMembership.access_count + 1
      })
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)

    // Log access activity
    await supabase
      .from('vault_activity_log')
      .insert({
        vault_id: vaultId,
        organization_id: vault.organization_id,
        activity_type: 'access_granted',
        performed_by_user_id: user.id,
        activity_details: {
          access_method: 'api',
          user_role: userMembership.role
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      success: true,
      vault: transformedVault
    })

  } catch (error) {
    console.error('Vault details API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/vaults/[id] - Update vault
export async function PUT(
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
    const updates: UpdateVaultRequest = await request.json()

    // Check user's permission to update this vault
    const { data: membership, error: membershipError } = await supabase
      .from('vault_members')
      .select('role, status, vault_id, organization_id')
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only owners, admins, and moderators can update vaults
    if (!['owner', 'admin', 'moderator'].includes(membership.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to update vault' 
      }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.name !== undefined) updateData.name = updates.name.trim()
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null
    if (updates.meetingDate !== undefined) updateData.meeting_date = updates.meetingDate ? new Date(updates.meetingDate).toISOString() : null
    if (updates.location !== undefined) updateData.location = updates.location?.trim() || null
    if (updates.priority !== undefined) updateData.priority = updates.priority
    if (updates.status !== undefined) {
      updateData.status = updates.status
      if (updates.status === 'archived') {
        updateData.archived_at = new Date().toISOString()
      }
    }
    if (updates.settings !== undefined) updateData.settings = updates.settings
    if (updates.tags !== undefined) updateData.tags = updates.tags
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic
    if (updates.requiresInvitation !== undefined) updateData.requires_invitation = updates.requiresInvitation
    if (updates.accessCode !== undefined) updateData.access_code = updates.accessCode
    if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt ? new Date(updates.expiresAt).toISOString() : null

    // Update vault
    const { data: updatedVault, error: updateError } = await supabase
      .from('vaults')
      .update(updateData)
      .eq('id', vaultId)
      .select(`
        *,
        organization:organizations!vaults_organization_id_fkey(
          id, name, slug, logo_url
        )
      `)
      .single()

    if (updateError) {
      console.error('Vault update error:', updateError)
      return NextResponse.json({ error: 'Failed to update vault' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('vault_activity_log')
      .insert({
        vault_id: vaultId,
        organization_id: membership.organization_id,
        activity_type: 'vault_updated',
        performed_by_user_id: user.id,
        activity_details: {
          updated_fields: Object.keys(updates),
          previous_status: updates.status ? 'changed' : 'unchanged',
          updated_via: 'api'
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    // Transform response
    const transformedVault = {
      id: updatedVault.id,
      name: updatedVault.name,
      description: updatedVault.description,
      meetingDate: updatedVault.meeting_date,
      location: updatedVault.location,
      status: updatedVault.status,
      priority: updatedVault.priority,
      createdAt: updatedVault.created_at,
      updatedAt: updatedVault.updated_at,
      expiresAt: updatedVault.expires_at,
      archivedAt: updatedVault.archived_at,
      memberCount: updatedVault.member_count,
      assetCount: updatedVault.asset_count,
      totalSizeBytes: updatedVault.total_size_bytes,
      lastActivityAt: updatedVault.last_activity_at,
      tags: updatedVault.tags,
      category: updatedVault.category,
      organization: updatedVault.organization,
      settings: updatedVault.settings,
      isPublic: updatedVault.is_public,
      requiresInvitation: updatedVault.requires_invitation,
      userRole: membership.role
    }

    return NextResponse.json({
      success: true,
      vault: transformedVault,
      message: 'Vault updated successfully'
    })

  } catch (error) {
    console.error('Vault update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/vaults/[id] - Delete vault
export async function DELETE(
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

    // Check user's permission to delete this vault
    const { data: vault, error: vaultError } = await supabase
      .from('vaults')
      .select(`
        id, name, organization_id, created_by,
        vault_members!inner(role, status)
      `)
      .eq('id', vaultId)
      .eq('vault_members.user_id', user.id)
      .eq('vault_members.status', 'active')
      .single()

    if (vaultError || !vault) {
      return NextResponse.json({ error: 'Vault not found or access denied' }, { status: 404 })
    }

    const userRole = vault.vault_members?.[0]?.role

    // Only vault owners or organization owners/admins can delete vaults
    const canDelete = userRole === 'owner' || vault.created_by === user.id

    if (!canDelete) {
      // Check if user is org owner/admin
      const { data: orgMembership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', vault.organization_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!orgMembership || !['owner', 'admin'].includes(orgMembership.role)) {
        return NextResponse.json({ 
          error: 'Insufficient permissions to delete vault' 
        }, { status: 403 })
      }
    }

    // Soft delete: Archive the vault instead of hard delete
    const { error: deleteError } = await supabase
      .from('vaults')
      .update({ 
        status: 'cancelled',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', vaultId)

    if (deleteError) {
      console.error('Vault deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete vault' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('vault_activity_log')
      .insert({
        vault_id: vaultId,
        organization_id: vault.organization_id,
        activity_type: 'vault_deleted',
        performed_by_user_id: user.id,
        activity_details: {
          vault_name: vault.name,
          deletion_type: 'soft_delete',
          deleted_via: 'api'
        },
        risk_level: 'medium',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })

    return NextResponse.json({
      success: true,
      message: 'Vault deleted successfully'
    })

  } catch (error) {
    console.error('Vault deletion API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}