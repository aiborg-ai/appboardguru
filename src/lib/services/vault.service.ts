import { BaseService } from './base.service'
import { z } from 'zod'
import type { 
  Vault, 
  VaultInsert, 
  VaultUpdate,
  VaultWithDetails,
  VaultBroadcast,
  CreateVaultRequest,
  UpdateVaultRequest,
  VaultInviteRequest
} from '@/types'

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
   * Create a new vault
   */
  async createVault(data: CreateVaultRequest): Promise<VaultWithDetails> {
    try {
      const user = await this.getCurrentUser()
      const validatedData = this.validateInput(data, createVaultSchema)

      // Check if user has permission to create vaults in this organization
      const canCreate = await this.checkPermission(
        user.id, 
        'vault', 
        'create', 
        validatedData.organizationId
      )
      if (!canCreate) {
        throw new Error('Insufficient permissions to create vault')
      }

      // Create vault
      const vaultData: VaultInsert = {
        name: validatedData.name,
        description: validatedData.description,
        organization_id: validatedData.organizationId,
        meeting_date: validatedData.meetingDate,
        priority: validatedData.priority || 'medium',
        created_by: user.id,
        status: 'draft',
        tags: validatedData.tags,
      }

      const vault = await this.repositories.vaults.create(vaultData)

      // Add creator as vault owner
      await this.repositories.vaults.addMember(vault.id, user.id, 'owner')

      await this.logActivity('create_vault', 'vault', vault.id, {
        vaultName: vault.name,
        organizationId: vault.organization_id,
      })

      return await this.getVaultWithDetails(vault.id)
    } catch (error) {
      this.handleError(error, 'createVault', data)
    }
  }

  /**
   * Get vault with full details
   */
  async getVaultWithDetails(vaultId: string): Promise<VaultWithDetails> {
    try {
      const user = await this.getCurrentUser()
      
      // Check access permission
      const hasAccess = await this.repositories.vaults.hasAccess(vaultId, user.id)
      if (!hasAccess) {
        throw new Error('Access denied to vault')
      }

      const vault = await this.repositories.vaults.findById(vaultId)
      if (!vault) {
        throw new Error('Vault not found')
      }

      // Get additional details in parallel
      const [members, assets, organization] = await this.parallel([
        () => this.repositories.vaults.getMembers(vaultId),
        () => this.repositories.assets.findByVault(vaultId),
        () => this.repositories.organizations.findById(vault.organization_id),
      ])

      return {
        ...vault,
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        } : null,
        members: members.map(member => ({
          ...member,
          user: {
            id: member.user.id,
            email: member.user.email,
            full_name: member.user.full_name,
            avatar_url: member.user.avatar_url,
          },
        })),
        assets: assets.map(asset => ({
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
        })),
        memberCount: members.length,
        assetCount: assets.length,
      } as VaultWithDetails
    } catch (error) {
      this.handleError(error, 'getVaultWithDetails', { vaultId })
    }
  }

  /**
   * Update vault
   */
  async updateVault(vaultId: string, data: UpdateVaultRequest): Promise<VaultWithDetails> {
    try {
      const user = await this.getCurrentUser()
      const validatedData = this.validateInput(data, updateVaultSchema)

      // Check edit permission
      const canEdit = await this.checkPermission(user.id, 'vault', 'edit', vaultId)
      if (!canEdit) {
        throw new Error('Insufficient permissions to edit vault')
      }

      const updateData: VaultUpdate = {
        ...validatedData,
        meeting_date: validatedData.meetingDate,
        updated_at: new Date().toISOString(),
      }

      await this.repositories.vaults.update(vaultId, updateData)

      await this.logActivity('update_vault', 'vault', vaultId, {
        changes: Object.keys(validatedData),
      })

      return await this.getVaultWithDetails(vaultId)
    } catch (error) {
      this.handleError(error, 'updateVault', { vaultId, data })
    }
  }

  /**
   * Delete vault
   */
  async deleteVault(vaultId: string): Promise<void> {
    try {
      const user = await this.getCurrentUser()

      // Check delete permission
      const canDelete = await this.checkPermission(user.id, 'vault', 'delete', vaultId)
      if (!canDelete) {
        throw new Error('Insufficient permissions to delete vault')
      }

      const vault = await this.repositories.vaults.findById(vaultId)
      if (!vault) {
        throw new Error('Vault not found')
      }

      await this.repositories.vaults.delete(vaultId)

      await this.logActivity('delete_vault', 'vault', vaultId, {
        vaultName: vault.name,
      })
    } catch (error) {
      this.handleError(error, 'deleteVault', { vaultId })
    }
  }

  /**
   * Invite users to vault
   */
  async inviteUsers(vaultId: string, data: VaultInviteRequest): Promise<void> {
    try {
      const user = await this.getCurrentUser()
      
      // Check invite permission
      const canInvite = await this.checkPermission(user.id, 'vault', 'invite', vaultId)
      if (!canInvite) {
        throw new Error('Insufficient permissions to invite users')
      }

      const vault = await this.repositories.vaults.findById(vaultId)
      if (!vault) {
        throw new Error('Vault not found')
      }

      const invitations = []

      // Process user IDs (existing users)
      for (const userId of data.userIds) {
        const existingUser = await this.repositories.users.findById(userId)
        if (existingUser) {
          // Check if already a member
          const hasAccess = await this.repositories.vaults.hasAccess(vaultId, userId)
          if (!hasAccess) {
            await this.repositories.vaults.addMember(vaultId, userId, data.role || 'viewer')
            invitations.push({ userId, email: existingUser.email, status: 'added' })
          }
        }
      }

      // Process emails (for new users)
      if (data.emails && data.emails.length > 0) {
        for (const email of data.emails) {
          // Create invitation record
          await this.supabase.from('vault_invitations').insert({
            vault_id: vaultId,
            email,
            role: data.role || 'viewer',
            message: data.message,
            deadline: data.deadline,
            invited_by: user.id,
            status: 'pending',
          })

          invitations.push({ email, status: 'invited' })
        }

        // Send invitation emails
        await this.sendInvitationEmails(vaultId, data.emails, data.message)
      }

      await this.logActivity('invite_vault_users', 'vault', vaultId, {
        invitedCount: invitations.length,
        role: data.role,
      })
    } catch (error) {
      this.handleError(error, 'inviteUsers', { vaultId, data })
    }
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

      // Create broadcast invitations
      const invitations = data.userIds.map(userId => ({
        vault_id: data.vaultId,
        user_id: userId,
        message: data.message,
        requires_acceptance: data.requireAcceptance || false,
        deadline: data.deadline,
        invited_by: user.id,
        status: 'pending' as const,
      }))

      await this.supabase.from('vault_invitations').insert(invitations)

      // Send notification emails
      const users = await Promise.all(
        data.userIds.map(id => this.repositories.users.findById(id))
      )
      
      const emails = users
        .filter(Boolean)
        .map(user => user!.email)
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
   * Accept vault invitation
   */
  async acceptInvitation(invitationId: string): Promise<void> {
    try {
      const user = await this.getCurrentUser()

      const { data: invitation, error } = await this.supabase
        .from('vault_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single()

      if (error || !invitation) {
        throw new Error('Invitation not found or already processed')
      }

      // Check if invitation is still valid
      if (invitation.deadline && new Date(invitation.deadline) < new Date()) {
        throw new Error('Invitation has expired')
      }

      // Add user to vault
      await this.repositories.vaults.addMember(
        invitation.vault_id, 
        user.id, 
        invitation.role || 'viewer'
      )

      // Update invitation status
      await this.supabase
        .from('vault_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitationId)

      await this.logActivity('accept_vault_invitation', 'vault', invitation.vault_id, {
        invitationId,
      })
    } catch (error) {
      this.handleError(error, 'acceptInvitation', { invitationId })
    }
  }

  /**
   * Get vaults for user with pagination
   */
  async getUserVaults(
    userId: string,
    options: { page?: number; limit?: number; organizationId?: string } = {}
  ) {
    try {
      const { page = 1, limit = 20, organizationId } = options
      
      let vaults = await this.repositories.vaults.findByUser(userId)
      
      if (organizationId) {
        vaults = vaults.filter(vault => vault.organization_id === organizationId)
      }

      const total = vaults.length
      const offset = (page - 1) * limit
      const paginatedVaults = vaults.slice(offset, offset + limit)

      return {
        vaults: paginatedVaults,
        pagination: this.createPaginationMeta(total, page, limit),
      }
    } catch (error) {
      this.handleError(error, 'getUserVaults', { userId, options })
    }
  }

  /**
   * Add asset to vault
   */
  async addAsset(vaultId: string, assetId: string): Promise<void> {
    try {
      const user = await this.getCurrentUser()
      
      // Check permission
      const canManageAssets = await this.checkPermission(user.id, 'vault', 'manage_assets', vaultId)
      if (!canManageAssets) {
        throw new Error('Insufficient permissions to manage vault assets')
      }

      await this.repositories.assets.addToVault(assetId, vaultId, user.id)

      await this.logActivity('add_vault_asset', 'vault', vaultId, {
        assetId,
      })
    } catch (error) {
      this.handleError(error, 'addAsset', { vaultId, assetId })
    }
  }

  /**
   * Remove asset from vault
   */
  async removeAsset(vaultId: string, assetId: string): Promise<void> {
    try {
      const user = await this.getCurrentUser()
      
      // Check permission
      const canManageAssets = await this.checkPermission(user.id, 'vault', 'manage_assets', vaultId)
      if (!canManageAssets) {
        throw new Error('Insufficient permissions to manage vault assets')
      }

      await this.repositories.assets.removeFromVault(assetId, vaultId)

      await this.logActivity('remove_vault_asset', 'vault', vaultId, {
        assetId,
      })
    } catch (error) {
      this.handleError(error, 'removeAsset', { vaultId, assetId })
    }
  }

  /**
   * Send invitation emails
   */
  private async sendInvitationEmails(vaultId: string, emails: string[], message?: string): Promise<void> {
    // This would integrate with your email service
    // Placeholder implementation
    console.log(`Sending vault invitations to: ${emails.join(', ')}`)
  }

  /**
   * Send broadcast emails
   */
  private async sendBroadcastEmails(vaultId: string, emails: string[], message?: string): Promise<void> {
    // This would integrate with your email service
    // Placeholder implementation
    console.log(`Broadcasting vault ${vaultId} to: ${emails.join(', ')}`)
  }
}