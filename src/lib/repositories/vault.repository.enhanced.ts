import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  UserId, 
  OrganizationId, 
  VaultId,
  AssetId,
  QueryOptions, 
  PaginatedResult,
  Priority,
  PermissionLevel,
  createUserId,
  createOrganizationId,
  createVaultId,
  createAssetId
} from './types'
import type { Database } from '../../types/database'

type Vault = Database['public']['Tables']['vaults']['Row']
type VaultInsert = Database['public']['Tables']['vaults']['Insert']
type VaultUpdate = Database['public']['Tables']['vaults']['Update']
type VaultMember = Database['public']['Tables']['vault_members']['Row']
type VaultAsset = Database['public']['Tables']['vault_assets']['Row']
type VaultInvitation = Database['public']['Tables']['vault_invitations']['Row']

export interface VaultWithDetails extends Vault {
  members?: Array<{
    id: string
    user_id: string
    role: 'owner' | 'admin' | 'member' | 'viewer'
    status: 'active' | 'inactive' | 'pending'
    joined_at: string
    user: {
      id: string
      full_name: string | null
      email: string
      avatar_url: string | null
    }
  }>
  assets?: Array<{
    id: string
    asset_id: string
    added_at: string
    asset: {
      id: string
      title: string
      file_name: string
      file_type: string
      file_size: number
      created_at: string
    }
  }>
  organization?: {
    id: string
    name: string
    slug: string
  }
  created_by_user?: {
    id: string
    full_name: string | null
    email: string
  }
  invitations?: VaultInvitation[]
  analytics?: {
    member_count: number
    asset_count: number
    total_size_bytes: number
    last_activity_at: string | null
    activity_score: number
  }
}

export interface VaultFilters {
  status?: 'draft' | 'active' | 'archived' | 'expired' | 'cancelled'
  priority?: Priority
  category?: string
  organizationId?: OrganizationId
  createdBy?: UserId
  memberUserId?: UserId
  hasAssets?: boolean
  isPublic?: boolean
  tags?: string[]
  dateFrom?: Date
  dateTo?: Date
  location?: string
}

export interface VaultCreateData {
  organization_id: OrganizationId
  name: string
  description?: string
  meeting_date?: Date
  location?: string
  priority?: Priority
  category?: string
  is_public?: boolean
  requires_invitation?: boolean
  access_code?: string
  expires_at?: Date
  settings?: {
    allow_comments: boolean
    allow_downloads: boolean
    watermark_files: boolean
    require_approval_for_uploads: boolean
    max_file_size_mb: number
    allowed_file_types: string[]
  }
  tags?: string[]
  metadata?: Record<string, any>
}

export interface VaultMemberData {
  vault_id: VaultId
  user_id: UserId
  organization_id: OrganizationId
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joined_via: 'invitation' | 'request' | 'admin_added'
  permissions?: {
    can_invite: boolean
    can_upload: boolean
    can_download: boolean
    can_comment: boolean
    can_manage_members: boolean
  }
}

export interface VaultStats {
  totalVaults: number
  activeVaults: number
  archivedVaults: number
  expiredVaults: number
  totalMembers: number
  totalAssets: number
  totalStorageGB: number
  byCategory: Record<string, number>
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  membershipTrends: {
    newMembersThisWeek: number
    newMembersThisMonth: number
    averageMembersPerVault: number
  }
  assetTrends: {
    newAssetsThisWeek: number
    newAssetsThisMonth: number
    averageAssetsPerVault: number
  }
  activityMetrics: {
    mostActiveVaults: Array<{
      vault_id: string
      vault_name: string
      activity_score: number
      last_activity: string
    }>
    leastActiveVaults: Array<{
      vault_id: string
      vault_name: string
      days_since_activity: number
    }>
  }
}

export interface VaultPermission {
  user_id: UserId
  vault_id: VaultId
  permissions: {
    can_view: boolean
    can_upload: boolean
    can_download: boolean
    can_comment: boolean
    can_invite: boolean
    can_manage_members: boolean
    can_manage_settings: boolean
    can_delete: boolean
  }
  inherited_from?: 'organization' | 'vault_role'
}

export class VaultRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'Vault'
  }

  protected getSearchFields(): string[] {
    return ['name', 'description', 'location', 'category']
  }

  async findById(id: VaultId): Promise<Result<Vault>> {
    const { data, error } = await this.supabase
      .from('vaults')
      .select('*')
      .eq('id', id)
      .single()

    return this.createResult(data, error, 'findById')
  }

  async findWithDetails(id: VaultId): Promise<Result<VaultWithDetails>> {
    const { data, error } = await this.supabase
      .from('vaults')
      .select(`
        *,
        members:vault_members(
          id, user_id, role, status, joined_at,
          user:users(id, full_name, email, avatar_url)
        ),
        assets:vault_assets(
          id, asset_id, added_at,
          asset:assets(id, title, file_name, file_type, file_size, created_at)
        ),
        organization:organizations(id, name, slug),
        created_by_user:users!created_by(id, full_name, email),
        invitations:vault_invitations(
          id, email, role, status, expires_at, created_at
        )
      `)
      .eq('id', id)
      .single()

    // Calculate analytics
    if (data) {
      const vault = data as VaultWithDetails
      vault.analytics = {
        member_count: vault.members?.filter(m => m.status === 'active').length || 0,
        asset_count: vault.assets?.length || 0,
        total_size_bytes: vault.assets?.reduce((sum, a) => sum + (a.asset?.file_size || 0), 0) || 0,
        last_activity_at: vault.last_activity_at,
        activity_score: this.calculateActivityScore(vault)
      }
    }

    return this.createResult(data as VaultWithDetails, error, 'findWithDetails')
  }

  async findByUser(
    userId: UserId,
    filters: VaultFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<VaultWithDetails>>> {
    let query = this.supabase
      .from('vaults')
      .select(`
        *,
        members:vault_members!inner(
          id, user_id, role, status, joined_at,
          user:users(id, full_name, email, avatar_url)
        ),
        organization:organizations(id, name, slug),
        created_by_user:users!created_by(id, full_name, email)
      `, { count: 'exact' })
      .eq('members.user_id', userId)
      .eq('members.status', 'active')

    query = this.applyFilters(query, filters)
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as VaultWithDetails[] || [], count, options, error)
  }

  async findByOrganization(
    organizationId: OrganizationId,
    userId: UserId,
    filters: VaultFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<VaultWithDetails>>> {
    // Check user has access to organization
    const permissionCheck = await this.checkOrganizationPermission(userId, organizationId)
    if (!permissionCheck.success) {
      return permissionCheck
    }

    let query = this.supabase
      .from('vaults')
      .select(`
        *,
        organization:organizations(id, name, slug),
        created_by_user:users!created_by(id, full_name, email)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)

    query = this.applyFilters(query, filters)
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as VaultWithDetails[] || [], count, options, error)
  }

  async create(
    vaultData: VaultCreateData,
    createdBy: UserId
  ): Promise<Result<Vault>> {
    // Validate required fields
    const validation = this.validateRequired(vaultData, ['organization_id', 'name'])
    if (!validation.success) {
      return validation
    }

    // Check organization permission
    const permissionCheck = await this.checkOrganizationPermission(
      createdBy, 
      vaultData.organization_id,
      ['member', 'admin', 'owner']
    )
    if (!permissionCheck.success) {
      return permissionCheck
    }

    return await this.transaction(async (client) => {
      // Create the vault
      const insertData: VaultInsert = {
        organization_id: vaultData.organization_id,
        name: vaultData.name.trim(),
        description: vaultData.description?.trim(),
        meeting_date: vaultData.meeting_date?.toISOString(),
        location: vaultData.location?.trim(),
        created_by: createdBy,
        priority: vaultData.priority || 'medium',
        category: vaultData.category || 'board_meeting',
        is_public: vaultData.is_public || false,
        requires_invitation: vaultData.requires_invitation !== false,
        access_code: vaultData.access_code,
        expires_at: vaultData.expires_at?.toISOString(),
        settings: vaultData.settings || {
          allow_comments: true,
          allow_downloads: true,
          watermark_files: false,
          require_approval_for_uploads: false,
          max_file_size_mb: 100,
          allowed_file_types: []
        },
        tags: vaultData.tags || [],
        metadata: vaultData.metadata,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: vault, error: vaultError } = await client
        .from('vaults')
        .insert(insertData)
        .select()
        .single()

      if (vaultError || !vault) {
        throw RepositoryError.fromSupabaseError(vaultError, 'create vault')
      }

      // Add creator as owner
      const { error: memberError } = await client
        .from('vault_members')
        .insert({
          vault_id: vault.id,
          user_id: createdBy,
          organization_id: vaultData.organization_id,
          role: 'owner',
          status: 'active',
          joined_via: 'creator',
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        throw RepositoryError.fromSupabaseError(memberError, 'add creator as member')
      }

      // Log vault creation
      await this.logActivity({
        user_id: createdBy,
        organization_id: vaultData.organization_id,
        event_type: 'vault_management',
        event_category: 'vault_lifecycle',
        action: 'create',
        resource_type: 'vault',
        resource_id: vault.id,
        event_description: `Vault created: ${vault.name}`,
        outcome: 'success',
        severity: 'low',
        details: {
          category: vault.category,
          is_public: vault.is_public,
          requires_invitation: vault.requires_invitation
        }
      })

      return vault
    })
  }

  async update(
    id: VaultId,
    updates: Partial<VaultCreateData>,
    updatedBy: UserId
  ): Promise<Result<Vault>> {
    // Check user permissions for this vault
    const permissionCheck = await this.checkVaultPermission(id, updatedBy, ['admin', 'owner'])
    if (!permissionCheck.success) {
      return permissionCheck
    }

    const updateData: VaultUpdate = {
      ...updates,
      meeting_date: updates.meeting_date?.toISOString(),
      expires_at: updates.expires_at?.toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('vaults')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    const result = this.createResult(data, error, 'update')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: updatedBy,
        organization_id: data.organization_id ? createOrganizationId(data.organization_id) : undefined,
        event_type: 'vault_management',
        event_category: 'vault_lifecycle',
        action: 'update',
        resource_type: 'vault',
        resource_id: data.id,
        event_description: `Vault updated: ${data.name}`,
        outcome: 'success',
        severity: 'low',
        details: Object.keys(updates)
      })
    }

    return result
  }

  async delete(id: VaultId, deletedBy: UserId): Promise<Result<void>> {
    // Check user permissions
    const permissionCheck = await this.checkVaultPermission(id, deletedBy, ['owner'])
    if (!permissionCheck.success) {
      return permissionCheck
    }

    // Get vault details for logging
    const vaultResult = await this.findById(id)
    if (!vaultResult.success) {
      return vaultResult
    }

    const { error } = await this.supabase
      .from('vaults')
      .delete()
      .eq('id', id)

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'delete'))
    }

    await this.logActivity({
      user_id: deletedBy,
      organization_id: vaultResult.data.organization_id ? createOrganizationId(vaultResult.data.organization_id) : undefined,
      event_type: 'vault_management',
      event_category: 'vault_lifecycle',
      action: 'delete',
      resource_type: 'vault',
      resource_id: id,
      event_description: `Vault deleted: ${vaultResult.data.name}`,
      outcome: 'success',
      severity: 'medium'
    })

    return success(undefined)
  }

  async addMember(
    vaultId: VaultId,
    memberData: Omit<VaultMemberData, 'vault_id'>,
    addedBy: UserId
  ): Promise<Result<VaultMember>> {
    // Check permissions
    const permissionCheck = await this.checkVaultPermission(vaultId, addedBy, ['admin', 'owner'])
    if (!permissionCheck.success) {
      return permissionCheck
    }

    // Check if user is already a member
    const { data: existingMember, error: checkError } = await this.supabase
      .from('vault_members')
      .select('id')
      .eq('vault_id', vaultId)
      .eq('user_id', memberData.user_id)
      .single()

    if (existingMember) {
      return failure(RepositoryError.conflict('member', 'User is already a member of this vault'))
    }

    const insertData = {
      vault_id: vaultId,
      ...memberData,
      joined_at: new Date().toISOString(),
      status: 'active' as const
    }

    const { data, error } = await this.supabase
      .from('vault_members')
      .insert(insertData)
      .select()
      .single()

    const result = this.createResult(data, error, 'addMember')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: addedBy,
        organization_id: memberData.organization_id,
        event_type: 'vault_management',
        event_category: 'member_management',
        action: 'add_member',
        resource_type: 'vault',
        resource_id: vaultId,
        event_description: `Member added to vault with role: ${memberData.role}`,
        outcome: 'success',
        severity: 'low'
      })
    }

    return result
  }

  async updateMemberRole(
    vaultId: VaultId,
    userId: UserId,
    newRole: 'owner' | 'admin' | 'member' | 'viewer',
    updatedBy: UserId
  ): Promise<Result<VaultMember>> {
    // Check permissions
    const permissionCheck = await this.checkVaultPermission(vaultId, updatedBy, ['admin', 'owner'])
    if (!permissionCheck.success) {
      return permissionCheck
    }

    const { data, error } = await this.supabase
      .from('vault_members')
      .update({
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('vault_id', vaultId)
      .eq('user_id', userId)
      .select()
      .single()

    const result = this.createResult(data, error, 'updateMemberRole')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: updatedBy,
        organization_id: data.organization_id ? createOrganizationId(data.organization_id) : undefined,
        event_type: 'vault_management',
        event_category: 'member_management',
        action: 'update_role',
        resource_type: 'vault',
        resource_id: vaultId,
        event_description: `Member role updated to: ${newRole}`,
        outcome: 'success',
        severity: 'low'
      })
    }

    return result
  }

  async removeMember(
    vaultId: VaultId,
    userId: UserId,
    removedBy: UserId
  ): Promise<Result<void>> {
    // Check permissions
    const permissionCheck = await this.checkVaultPermission(vaultId, removedBy, ['admin', 'owner'])
    if (!permissionCheck.success) {
      return permissionCheck
    }

    // Don't allow removing the last owner
    const { data: owners, error: ownerCheckError } = await this.supabase
      .from('vault_members')
      .select('id')
      .eq('vault_id', vaultId)
      .eq('role', 'owner')
      .eq('status', 'active')

    if (ownerCheckError) {
      return failure(RepositoryError.fromSupabaseError(ownerCheckError, 'check owners'))
    }

    if (owners && owners.length <= 1) {
      // Check if the user being removed is an owner
      const { data: memberToRemove } = await this.supabase
        .from('vault_members')
        .select('role')
        .eq('vault_id', vaultId)
        .eq('user_id', userId)
        .single()

      if (memberToRemove?.role === 'owner') {
        return failure(RepositoryError.validation('Cannot remove the last owner from the vault'))
      }
    }

    const { error } = await this.supabase
      .from('vault_members')
      .delete()
      .eq('vault_id', vaultId)
      .eq('user_id', userId)

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'removeMember'))
    }

    await this.logActivity({
      user_id: removedBy,
      event_type: 'vault_management',
      event_category: 'member_management',
      action: 'remove_member',
      resource_type: 'vault',
      resource_id: vaultId,
      event_description: `Member removed from vault`,
      outcome: 'success',
      severity: 'low'
    })

    return success(undefined)
  }

  async addAsset(
    vaultId: VaultId,
    assetId: AssetId,
    addedBy: UserId
  ): Promise<Result<VaultAsset>> {
    // Check permissions
    const permissionCheck = await this.checkVaultPermission(vaultId, addedBy, ['member', 'admin', 'owner'])
    if (!permissionCheck.success) {
      return permissionCheck
    }

    // Check if asset is already in vault
    const { data: existingAsset } = await this.supabase
      .from('vault_assets')
      .select('id')
      .eq('vault_id', vaultId)
      .eq('asset_id', assetId)
      .single()

    if (existingAsset) {
      return failure(RepositoryError.conflict('asset', 'Asset is already in this vault'))
    }

    const { data, error } = await this.supabase
      .from('vault_assets')
      .insert({
        vault_id: vaultId,
        asset_id: assetId,
        added_by: addedBy,
        added_at: new Date().toISOString()
      })
      .select()
      .single()

    const result = this.createResult(data, error, 'addAsset')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: addedBy,
        event_type: 'vault_management',
        event_category: 'asset_management',
        action: 'add_asset',
        resource_type: 'vault',
        resource_id: vaultId,
        event_description: `Asset added to vault`,
        outcome: 'success',
        severity: 'low'
      })
    }

    return result
  }

  async removeAsset(
    vaultId: VaultId,
    assetId: AssetId,
    removedBy: UserId
  ): Promise<Result<void>> {
    // Check permissions
    const permissionCheck = await this.checkVaultPermission(vaultId, removedBy, ['admin', 'owner'])
    if (!permissionCheck.success) {
      return permissionCheck
    }

    const { error } = await this.supabase
      .from('vault_assets')
      .delete()
      .eq('vault_id', vaultId)
      .eq('asset_id', assetId)

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'removeAsset'))
    }

    await this.logActivity({
      user_id: removedBy,
      event_type: 'vault_management',
      event_category: 'asset_management',
      action: 'remove_asset',
      resource_type: 'vault',
      resource_id: vaultId,
      event_description: `Asset removed from vault`,
      outcome: 'success',
      severity: 'low'
    })

    return success(undefined)
  }

  async getStats(
    organizationId?: OrganizationId,
    userId?: UserId
  ): Promise<Result<VaultStats>> {
    let query = this.supabase
      .from('vaults')
      .select(`
        id, name, status, priority, category, created_at, last_activity_at,
        vault_members(id, status, joined_at),
        vault_assets(id, added_at, asset:assets(file_size))
      `)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (userId) {
      query = query.eq('vault_members.user_id', userId)
    }

    const { data: vaults, error } = await query

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'getStats'))
    }

    const stats: VaultStats = {
      totalVaults: vaults?.length || 0,
      activeVaults: 0,
      archivedVaults: 0,
      expiredVaults: 0,
      totalMembers: 0,
      totalAssets: 0,
      totalStorageGB: 0,
      byCategory: {},
      byStatus: {},
      byPriority: {},
      membershipTrends: {
        newMembersThisWeek: 0,
        newMembersThisMonth: 0,
        averageMembersPerVault: 0
      },
      assetTrends: {
        newAssetsThisWeek: 0,
        newAssetsThisMonth: 0,
        averageAssetsPerVault: 0
      },
      activityMetrics: {
        mostActiveVaults: [],
        leastActiveVaults: []
      }
    }

    if (vaults) {
      const now = new Date()
      const oneWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const oneMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      let totalStorage = 0
      let totalMembers = 0
      let totalAssets = 0

      const activityData: Array<{
        vault_id: string
        vault_name: string
        activity_score: number
        last_activity: string | null
      }> = []

      vaults.forEach((vault: any) => {
        // Count by status
        stats.byStatus[vault.status] = (stats.byStatus[vault.status] || 0) + 1
        if (vault.status === 'active') stats.activeVaults++
        if (vault.status === 'archived') stats.archivedVaults++
        if (vault.status === 'expired') stats.expiredVaults++

        // Count by category
        stats.byCategory[vault.category] = (stats.byCategory[vault.category] || 0) + 1

        // Count by priority
        stats.byPriority[vault.priority] = (stats.byPriority[vault.priority] || 0) + 1

        // Count members
        const activeMembers = vault.vault_members?.filter((m: any) => m.status === 'active') || []
        totalMembers += activeMembers.length

        // Count recent members
        activeMembers.forEach((member: any) => {
          const joinedAt = new Date(member.joined_at)
          if (joinedAt >= oneWeek) stats.membershipTrends.newMembersThisWeek++
          if (joinedAt >= oneMonth) stats.membershipTrends.newMembersThisMonth++
        })

        // Count assets and storage
        const vaultAssets = vault.vault_assets || []
        totalAssets += vaultAssets.length

        vaultAssets.forEach((vaultAsset: any) => {
          const addedAt = new Date(vaultAsset.added_at)
          if (addedAt >= oneWeek) stats.assetTrends.newAssetsThisWeek++
          if (addedAt >= oneMonth) stats.assetTrends.newAssetsThisMonth++

          totalStorage += vaultAsset.asset?.file_size || 0
        })

        // Calculate activity metrics
        const activityScore = this.calculateActivityScore({
          ...vault,
          members: activeMembers,
          assets: vaultAssets
        })

        activityData.push({
          vault_id: vault.id,
          vault_name: vault.name,
          activity_score: activityScore,
          last_activity: vault.last_activity_at
        })
      })

      stats.totalMembers = totalMembers
      stats.totalAssets = totalAssets
      stats.totalStorageGB = Math.round((totalStorage / (1024 * 1024 * 1024)) * 100) / 100

      // Calculate averages
      stats.membershipTrends.averageMembersPerVault = vaults.length > 0 
        ? Math.round((totalMembers / vaults.length) * 100) / 100
        : 0

      stats.assetTrends.averageAssetsPerVault = vaults.length > 0 
        ? Math.round((totalAssets / vaults.length) * 100) / 100
        : 0

      // Sort activity data
      activityData.sort((a, b) => b.activity_score - a.activity_score)
      stats.activityMetrics.mostActiveVaults = activityData.slice(0, 5)

      // Find least active vaults (those with no recent activity)
      const inactiveVaults = activityData
        .filter(v => v.last_activity)
        .map(v => ({
          vault_id: v.vault_id,
          vault_name: v.vault_name,
          days_since_activity: Math.floor(
            (now.getTime() - new Date(v.last_activity!).getTime()) / (24 * 60 * 60 * 1000)
          )
        }))
        .sort((a, b) => b.days_since_activity - a.days_since_activity)
        .slice(0, 5)

      stats.activityMetrics.leastActiveVaults = inactiveVaults
    }

    return success(stats)
  }

  async checkVaultPermission(
    vaultId: VaultId,
    userId: UserId,
    requiredRoles: string[] = ['member']
  ): Promise<Result<boolean>> {
    const { data: member, error } = await this.supabase
      .from('vault_members')
      .select('role, status')
      .eq('vault_id', vaultId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error || !member) {
      return failure(RepositoryError.forbidden('Vault access denied'))
    }

    if (!requiredRoles.includes(member.role)) {
      return failure(RepositoryError.forbidden(`Insufficient role. Required: ${requiredRoles.join(', ')}`))
    }

    return success(true)
  }

  private calculateActivityScore(vault: any): number {
    let score = 0
    const now = new Date()
    const oneWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Score based on recent member activity
    const recentMembers = vault.members?.filter((m: any) => 
      new Date(m.joined_at) >= oneMonth
    ).length || 0
    score += recentMembers * 10

    // Score based on recent asset additions
    const recentAssets = vault.assets?.filter((a: any) => 
      new Date(a.added_at) >= oneMonth
    ).length || 0
    score += recentAssets * 5

    // Score based on last activity
    if (vault.last_activity_at) {
      const daysSinceActivity = (now.getTime() - new Date(vault.last_activity_at).getTime()) / (24 * 60 * 60 * 1000)
      if (daysSinceActivity <= 1) score += 20
      else if (daysSinceActivity <= 7) score += 10
      else if (daysSinceActivity <= 30) score += 5
    }

    return Math.round(score)
  }

  private applyFilters(query: any, filters: VaultFilters): any {
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }
    if (filters.createdBy) {
      query = query.eq('created_by', filters.createdBy)
    }
    if (filters.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic)
    }
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`)
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString())
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString())
    }

    return query
  }
}