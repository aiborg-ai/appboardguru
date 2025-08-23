import { BaseService } from './base.service'
import { 
  Result, 
  success, 
  failure, 
  isSuccess, 
  isFailure,
  RepositoryError,
  flatMapResult,
  combineResults
} from '../repositories/result'
import { z } from 'zod'
import type { 
  Vault, 
  VaultInsert, 
  VaultUpdate,
  VaultWithDetails,
  VaultBroadcast
} from '@/types/entities/vault.types'
import type {
  CreateVaultRequest,
  UpdateVaultRequest,
  VaultInviteRequest
} from '@/types/api/requests'

// Validation schemas
const createVaultSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  organizationId: z.string().uuid(),
  meetingDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
})

const updateVaultSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  meetingDate: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['draft', 'active', 'archived', 'published']).optional(),
  tags: z.array(z.string()).optional(),
})

export class VaultService extends BaseService {
  /**
   * Create a new vault with Result pattern
   */
  async createVault(data: CreateVaultRequest): Promise<Result<VaultWithDetails>> {
    // Get current user
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }
    const user = userResult.data

    // Validate input data
    const validationResult = this.validateWithContext<CreateVaultRequest>(
      data,
      createVaultSchema,
      'vault creation',
      'createVaultData'
    )
    if (!validationResult.success) {
      return failure(validationResult.error)
    }
    const validatedData = validationResult.data

    // Check permissions
    const permissionResult = await this.checkPermissionWithContext(
      user.id,
      'vault',
      'create',
      validatedData.organizationId,
      { organizationId: validatedData.organizationId }
    )
    if (!permissionResult.success) {
      return failure(permissionResult.error)
    }

    // Create vault data
    const vaultData: VaultInsert = {
      title: validatedData.name,
      description: validatedData.description,
      organization_id: validatedData.organizationId,
      uploaded_by: user.id,
      status: 'processing',
      file_path: '',
      file_name: '',
      file_size: 0,
      file_type: 'vault',
    }

    // Execute vault creation with database operation wrapper
    const createResult = await this.executeDbOperation(
      () => this.repositories.vaults.create(vaultData),
      'create_vault',
      { vaultData }
    )

    if (!createResult.success) {
      return failure(createResult.error)
    }
    const vault = createResult.data

    // Add creator as vault owner
    const addMemberResult = await this.executeDbOperation(
      () => this.repositories.vaults.addMember(vault.id, user.id, 'owner'),
      'add_vault_owner',
      { vaultId: vault.id, userId: user.id }
    )

    if (!addMemberResult.success) {
      // Log error but don't fail the entire operation
      await this.logActivity('vault_owner_assignment_failed', 'vault', vault.id, {
        error: addMemberResult.error.message,
        userId: user.id
      })
    }

    // Log successful creation
    await this.logActivity('create_vault', 'vault', vault.id, {
      vaultName: vault.title,
      organizationId: vault.organization_id,
    })

    // Get vault with details
    return this.getVaultWithDetails(vault.id)
  }

  /**
   * Get vault with full details using Result pattern
   */
  async getVaultWithDetails(vaultId: string): Promise<Result<VaultWithDetails>> {
    // Validate vault ID
    if (!vaultId || typeof vaultId !== 'string') {
      return failure(RepositoryError.validation('Valid vault ID is required'))
    }

    // Get current user
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }
    const user = userResult.data

    // Check access permission
    const accessResult = await this.executeDbOperation(
      () => this.repositories.vaults.hasAccess(vaultId, user.id),
      'check_vault_access',
      { vaultId, userId: user.id }
    )

    if (!accessResult.success) {
      return failure(accessResult.error)
    }

    if (!accessResult.data) {
      return failure(RepositoryError.forbidden(
        'vault_access',
        'Access denied to vault',
        { vaultId, userId: user.id }
      ))
    }

    // Get vault details
    const vaultResult = await this.executeDbOperation(
      () => this.repositories.vaults.findById(vaultId),
      'get_vault',
      { vaultId }
    )

    if (!vaultResult.success) {
      return failure(vaultResult.error)
    }

    if (!vaultResult.data) {
      return failure(RepositoryError.notFound('Vault', vaultId))
    }
    const vault = vaultResult.data

    // Get additional details in parallel using Result pattern
    const [membersResult, assetsResult, organizationResult] = await Promise.all([
      this.executeDbOperation(
        () => this.repositories.vaults.getMembers(vaultId),
        'get_vault_members',
        { vaultId }
      ),
      this.executeDbOperation(
        () => this.repositories.assets.findByVault(vaultId),
        'get_vault_assets',
        { vaultId }
      ),
      vault.organization_id ? this.executeDbOperation(
        () => this.repositories.organizations.findById(vault.organization_id || ''),
        'get_vault_organization',
        { organizationId: vault.organization_id }
      ) : Promise.resolve(success(null))
    ])

    // Process results - continue even if some fail (graceful degradation)
    const members = membersResult.success ? membersResult.data : []
    const assets = assetsResult.success ? assetsResult.data : []
    const organization = organizationResult.success ? organizationResult.data : null

    // Log any failures for monitoring
    if (!membersResult.success) {
      await this.logActivity('vault_members_fetch_failed', 'vault', vaultId, {
        error: membersResult.error.message
      })
    }
    if (!assetsResult.success) {
      await this.logActivity('vault_assets_fetch_failed', 'vault', vaultId, {
        error: assetsResult.error.message
      })
    }
    if (!organizationResult.success && vault.organization_id) {
      await this.logActivity('vault_organization_fetch_failed', 'vault', vaultId, {
        error: organizationResult.error.message,
        organizationId: vault.organization_id
      })
    }

    const vaultWithDetails: VaultWithDetails = {
      ...vault,
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      } : null,
      members: members ? members.map((member) => ({
        ...member,
        user: {
          id: member.granted_to_user_id || '',
          email: '',
          full_name: '',
          avatar_url: '',
        },
      })) : [],
      assets: assets ? assets.map((asset) => ({
        id: asset.id,
        asset: {
          id: asset.id,
          title: asset.title,
          file_name: asset.file_name,
          file_type: asset.file_type,
          file_size: asset.file_size,
          status: asset.status,
          summary: asset.summary,
          created_at: asset.created_at,
        },
        vault_id: vaultId,
        added_by: asset.uploaded_by,
        added_at: asset.created_at,
      })) : [],
      memberCount: members ? members.length : 0,
      assetCount: assets ? assets.length : 0,
    } as unknown as VaultWithDetails

    return success(vaultWithDetails)
  }

  /**
   * Update vault with Result pattern
   */
  async updateVault(vaultId: string, data: UpdateVaultRequest): Promise<Result<VaultWithDetails>> {
    // Validate vault ID
    if (!vaultId || typeof vaultId !== 'string') {
      return failure(RepositoryError.validation('Valid vault ID is required'))
    }

    // Get current user
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }
    const user = userResult.data

    // Validate input data
    const validationResult = this.validateWithContext<UpdateVaultRequest>(
      data,
      updateVaultSchema,
      'vault update',
      'updateVaultData'
    )
    if (!validationResult.success) {
      return failure(validationResult.error)
    }
    const validatedData = validationResult.data

    // Check edit permission
    const permissionResult = await this.checkPermissionWithContext(
      user.id,
      'vault',
      'edit',
      vaultId,
      { vaultId }
    )
    if (!permissionResult.success) {
      return failure(permissionResult.error)
    }

    // Prepare update data
    const updateData: VaultUpdate = {
      title: validatedData.name,
      description: validatedData.description,
      updated_at: new Date().toISOString(),
    }

    // Execute update
    const updateResult = await this.executeDbOperation(
      () => this.repositories.vaults.update(vaultId, updateData),
      'update_vault',
      { vaultId, updateData }
    )

    if (!updateResult.success) {
      return failure(updateResult.error)
    }

    // Log successful update
    await this.logActivity('update_vault', 'vault', vaultId, {
      changes: Object.keys(validatedData).filter(key => validatedData[key as keyof UpdateVaultRequest] !== undefined),
    })

    // Return updated vault details
    return this.getVaultWithDetails(vaultId)
  }

  /**
   * Delete vault with Result pattern
   */
  async deleteVault(vaultId: string): Promise<Result<void>> {
    // Validate vault ID
    if (!vaultId || typeof vaultId !== 'string') {
      return failure(RepositoryError.validation('Valid vault ID is required'))
    }

    // Get current user
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }
    const user = userResult.data

    // Check delete permission
    const permissionResult = await this.checkPermissionWithContext(
      user.id,
      'vault',
      'delete',
      vaultId,
      { vaultId }
    )
    if (!permissionResult.success) {
      return failure(permissionResult.error)
    }

    // Get vault to ensure it exists and for logging
    const vaultResult = await this.executeDbOperation(
      () => this.repositories.vaults.findById(vaultId),
      'get_vault_for_delete',
      { vaultId }
    )

    if (!vaultResult.success) {
      return failure(vaultResult.error)
    }

    if (!vaultResult.data) {
      return failure(RepositoryError.notFound('Vault', vaultId))
    }
    const vault = vaultResult.data

    // Execute deletion
    const deleteResult = await this.executeDbOperation(
      () => this.repositories.vaults.delete(vaultId),
      'delete_vault',
      { vaultId, vaultName: vault.title }
    )

    if (!deleteResult.success) {
      return failure(deleteResult.error)
    }

    // Log successful deletion
    await this.logActivity('delete_vault', 'vault', vaultId, {
      vaultName: vault.title,
    })

    return success(undefined)
  }

  /**
   * Invite users to vault with Result pattern
   */
  async inviteUsers(vaultId: string, data: VaultInviteRequest): Promise<Result<{
    invitations: Array<{ userId?: string; email?: string; status: string }>
    successCount: number
    errorCount: number
  }>> {
    // Validate inputs
    if (!vaultId || typeof vaultId !== 'string') {
      return failure(RepositoryError.validation('Valid vault ID is required'))
    }
    
    if (!data.userIds?.length && !data.emails?.length) {
      return failure(RepositoryError.validation('At least one user ID or email is required'))
    }

    // Get current user
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }
    const user = userResult.data

    // Check invite permission
    const permissionResult = await this.checkPermissionWithContext(
      user.id,
      'vault',
      'invite',
      vaultId,
      { vaultId, userIds: data.userIds?.length, emails: data.emails?.length }
    )
    if (!permissionResult.success) {
      return failure(permissionResult.error)
    }

    // Verify vault exists
    const vaultResult = await this.executeDbOperation(
      () => this.repositories.vaults.findById(vaultId),
      'get_vault_for_invite',
      { vaultId }
    )

    if (!vaultResult.success) {
      return failure(vaultResult.error)
    }

    if (!vaultResult.data) {
      return failure(RepositoryError.notFound('Vault', vaultId))
    }

    const invitations: Array<{ userId?: string; email?: string; status: string; error?: string }> = []

    // Process user IDs (existing users)
    if (data.userIds?.length) {
      for (const userId of data.userIds) {
        try {
          const existingUserResult = await this.executeDbOperation(
            () => this.repositories.users.findById(userId),
            'get_user_for_invite',
            { userId }
          )

          if (existingUserResult.success && existingUserResult.data) {
            // Check if already a member
            const accessResult = await this.executeDbOperation(
              () => this.repositories.vaults.hasAccess(vaultId, userId),
              'check_vault_access_for_invite',
              { vaultId, userId }
            )

            if (accessResult.success && !accessResult.data) {
              const addMemberResult = await this.executeDbOperation(
                () => this.repositories.vaults.addMember(vaultId, userId, data.role || 'viewer'),
                'add_vault_member_via_invite',
                { vaultId, userId, role: data.role }
              )

              if (addMemberResult.success) {
                invitations.push({
                  userId,
                  email: existingUserResult.data.email,
                  status: 'added'
                })
              } else {
                invitations.push({
                  userId,
                  status: 'error',
                  error: addMemberResult.error.message
                })
              }
            } else {
              invitations.push({
                userId,
                status: 'already_member'
              })
            }
          } else {
            invitations.push({
              userId,
              status: 'user_not_found'
            })
          }
        } catch (error) {
          invitations.push({
            userId,
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
    }

    // Process emails (for new users)
    if (data.emails?.length) {
      for (const email of data.emails) {
        try {
          const inviteResult = await this.executeDbOperation(
            async () => {
              const { error } = await this.supabase.from('vault_invitations').insert({
                vault_id: vaultId,
                email,
                invited_by: user.id,
                role: data.role || 'viewer',
                status: 'pending',
                invitation_token: crypto.randomUUID(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              })
              
              if (error) {
                throw RepositoryError.database('Failed to create invitation', error)
              }
              return true
            },
            'create_vault_invitation',
            { vaultId, email }
          )

          if (inviteResult.success) {
            invitations.push({ email, status: 'invited' })
          } else {
            invitations.push({
              email,
              status: 'error',
              error: inviteResult.error.message
            })
          }
        } catch (error) {
          invitations.push({
            email,
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      // Send invitation emails (non-blocking)
      const emailsToSend = invitations
        .filter(inv => inv.status === 'invited' && inv.email)
        .map(inv => inv.email!)

      if (emailsToSend.length > 0) {
        this.sendInvitationEmails(vaultId, emailsToSend, data.message)
          .catch(error => console.error('Failed to send invitation emails:', error))
      }
    }

    const successCount = invitations.filter(inv => inv.status === 'added' || inv.status === 'invited').length
    const errorCount = invitations.filter(inv => inv.status === 'error').length

    // Log activity
    await this.logActivity('invite_vault_users', 'vault', vaultId, {
      invitedCount: successCount,
      errorCount,
      role: data.role,
    })

    return success({
      invitations,
      successCount,
      errorCount
    })
  }

  /**
   * Broadcast vault to multiple users
   */
  async broadcastVault(data: VaultBroadcast): Promise<void> {
    try {
      const user = await this.getCurrentUser()
      
      // Check broadcast permission
      const canBroadcast = await this.checkPermission(user.id, 'vault', 'broadcast', data.vaultId)
      if (!canBroadcast) {
        throw new Error('Insufficient permissions to broadcast vault')
      }

      const vault = await this.repositories.vaults.findById(data.vaultId)
      if (!vault) {
        throw new Error('Vault not found')
      }

      // Create broadcast invitations - cast to any to handle schema mismatch
      const invitations = data.userIds.map((userId: string) => ({
        vault_id: data.vaultId,
        email: `user-${userId}@placeholder.com`, // Placeholder email for existing users
        invited_by: user.id,
        role: 'viewer',
        status: 'pending' as const,
        invitation_token: crypto.randomUUID(),
        expires_at: data.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }))

      await this.supabase.from('vault_invitations').insert(invitations)

      // Send notification emails
      const users = await Promise.all(
        data.userIds.map((id: string) => this.repositories.users.findById(id))
      )
      
      const emails = users
        .filter(Boolean)
        .map((user: any) => user!.email)
        .filter(Boolean) as string[]

      if (emails.length > 0) {
        await this.sendBroadcastEmails(data.vaultId, emails, data.message)
      }

      await this.logActivity('broadcast_vault', 'vault', data.vaultId, {
        userCount: data.userIds.length,
        requiresAcceptance: data.requireAcceptance,
      })
    } catch (error) {
      this.handleError(error, 'broadcastVault', data)
    }
  }

  /**
   * Accept vault invitation with Result pattern
   */
  async acceptInvitation(invitationId: string): Promise<Result<void>> {
    // Validate invitation ID
    if (!invitationId || typeof invitationId !== 'string') {
      return failure(RepositoryError.validation('Valid invitation ID is required'))
    }

    // Get current user
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }
    const user = userResult.data

    // Get invitation details
    const invitationResult = await this.executeDbOperation(
      async () => {
        const { data: invitation, error } = await this.supabase
          .from('vault_invitations')
          .select('*')
          .eq('id', invitationId)
          .eq('status', 'pending')
          .single()

        if (error) {
          throw RepositoryError.database('Failed to get invitation', error)
        }
        
        if (!invitation) {
          throw RepositoryError.notFound('Invitation', invitationId)
        }

        return invitation
      },
      'get_vault_invitation',
      { invitationId, userId: user.id }
    )

    if (!invitationResult.success) {
      return failure(invitationResult.error)
    }
    const invitation = invitationResult.data

    // Check if invitation is still valid
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return failure(RepositoryError.businessRule(
        'invitation_expired',
        'Invitation has expired',
        { invitationId, expiresAt: invitation.expires_at }
      ))
    }

    // Add user to vault
    const addMemberResult = await this.executeDbOperation(
      () => this.repositories.vaults.addMember(
        invitation.vault_id,
        user.id,
        invitation.role || 'viewer'
      ),
      'accept_vault_invitation_add_member',
      { vaultId: invitation.vault_id, userId: user.id, role: invitation.role }
    )

    if (!addMemberResult.success) {
      return failure(addMemberResult.error)
    }

    // Update invitation status
    const updateResult = await this.executeDbOperation(
      async () => {
        const { error } = await this.supabase
          .from('vault_invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          })
          .eq('id', invitationId)

        if (error) {
          throw RepositoryError.database('Failed to update invitation status', error)
        }
        return true
      },
      'update_invitation_status',
      { invitationId }
    )

    if (!updateResult.success) {
      // Log warning but don't fail the operation
      console.warn('Failed to update invitation status:', updateResult.error)
    }

    // Log successful acceptance
    await this.logActivity('accept_vault_invitation', 'vault', invitation.vault_id, {
      invitationId,
    })

    return success(undefined)
  }

  /**
   * Get vaults for user with pagination using Result pattern
   */
  async getUserVaults(
    userId: string,
    options: { page?: number; limit?: number; organizationId?: string } = {}
  ): Promise<Result<{
    vaults: any[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }>> {
    // Validate user ID
    if (!userId || typeof userId !== 'string') {
      return failure(RepositoryError.validation('Valid user ID is required'))
    }

    const { page = 1, limit = 20, organizationId } = options

    // Validate pagination parameters
    const paginationResult = this.createPaginationMeta(0, page, limit) // temporary validation
    if (!paginationResult.success) {
      return failure(paginationResult.error)
    }

    // Get vaults for user
    const vaultsResult = await this.executeDbOperation(
      () => this.repositories.vaults.findByUser(userId),
      'get_user_vaults',
      { userId, organizationId }
    )

    if (!vaultsResult.success) {
      return failure(vaultsResult.error)
    }

    let vaults = vaultsResult.data || []

    // Filter by organization if specified
    if (organizationId) {
      vaults = vaults.filter(vault => vault.organization_id === organizationId)
    }

    const total = vaults.length
    const offset = (page - 1) * limit
    const paginatedVaults = vaults.slice(offset, offset + limit)

    // Create final pagination metadata
    const finalPaginationResult = this.createPaginationMeta(total, page, limit)
    if (!finalPaginationResult.success) {
      return failure(finalPaginationResult.error)
    }

    return success({
      vaults: paginatedVaults,
      pagination: finalPaginationResult.data,
    })
  }

  /**
   * Add asset to vault with Result pattern
   */
  async addAsset(vaultId: string, assetId: string): Promise<Result<void>> {
    // Validate IDs
    if (!vaultId || typeof vaultId !== 'string') {
      return failure(RepositoryError.validation('Valid vault ID is required'))
    }
    if (!assetId || typeof assetId !== 'string') {
      return failure(RepositoryError.validation('Valid asset ID is required'))
    }

    // Get current user
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }
    const user = userResult.data

    // Check permission
    const permissionResult = await this.checkPermissionWithContext(
      user.id,
      'vault',
      'manage_assets',
      vaultId,
      { vaultId, assetId }
    )
    if (!permissionResult.success) {
      return failure(permissionResult.error)
    }

    // Add asset to vault
    const addResult = await this.executeDbOperation(
      () => this.repositories.assets.addToVault(assetId, vaultId, user.id),
      'add_asset_to_vault',
      { vaultId, assetId, userId: user.id }
    )

    if (!addResult.success) {
      return failure(addResult.error)
    }

    // Log successful addition
    await this.logActivity('add_vault_asset', 'vault', vaultId, {
      assetId,
    })

    return success(undefined)
  }

  /**
   * Remove asset from vault with Result pattern
   */
  async removeAsset(vaultId: string, assetId: string): Promise<Result<void>> {
    // Validate IDs
    if (!vaultId || typeof vaultId !== 'string') {
      return failure(RepositoryError.validation('Valid vault ID is required'))
    }
    if (!assetId || typeof assetId !== 'string') {
      return failure(RepositoryError.validation('Valid asset ID is required'))
    }

    // Get current user
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }
    const user = userResult.data

    // Check permission
    const permissionResult = await this.checkPermissionWithContext(
      user.id,
      'vault',
      'manage_assets',
      vaultId,
      { vaultId, assetId }
    )
    if (!permissionResult.success) {
      return failure(permissionResult.error)
    }

    // Remove asset from vault
    const removeResult = await this.executeDbOperation(
      () => this.repositories.assets.removeFromVault(assetId, vaultId),
      'remove_asset_from_vault',
      { vaultId, assetId }
    )

    if (!removeResult.success) {
      return failure(removeResult.error)
    }

    // Log successful removal
    await this.logActivity('remove_vault_asset', 'vault', vaultId, {
      assetId,
    })

    return success(undefined)
  }

  /**
   * Send invitation emails with Result pattern
   */
  private async sendInvitationEmails(vaultId: string, emails: string[], message?: string): Promise<Result<void>> {
    return this.executeWithRecovery(
      async () => {
        // This would integrate with your email service
        // Placeholder implementation with mock delay
        await new Promise(resolve => setTimeout(resolve, 100))
        console.log(`Sending vault invitations to: ${emails.join(', ')}`)
        
        // TODO: Integrate with actual email service
        // Example: await emailService.sendVaultInvitations(vaultId, emails, message)
        
        return success(undefined)
      },
      'external_services'
    )
  }

  /**
   * Send broadcast emails with Result pattern
   */
  private async sendBroadcastEmails(vaultId: string, emails: string[], message?: string): Promise<Result<void>> {
    return this.executeWithRecovery(
      async () => {
        // This would integrate with your email service
        // Placeholder implementation with mock delay
        await new Promise(resolve => setTimeout(resolve, 100))
        console.log(`Broadcasting vault ${vaultId} to: ${emails.join(', ')}`)
        
        // TODO: Integrate with actual email service
        // Example: await emailService.sendVaultBroadcast(vaultId, emails, message)
        
        return success(undefined)
      },
      'external_services'
    )
  }
}