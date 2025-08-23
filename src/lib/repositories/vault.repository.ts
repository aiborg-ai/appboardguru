import { BaseRepository } from './base.repository'
import type { Database } from '../../types/database'

type Vault = Database['public']['Tables']['board_packs']['Row']
type VaultInsert = Database['public']['Tables']['board_packs']['Insert'] 
type VaultUpdate = Database['public']['Tables']['board_packs']['Update']
type VaultMember = Database['public']['Tables']['board_pack_permissions']['Row']

export class VaultRepository extends BaseRepository {
  async findById(id: string): Promise<Vault | null> {
    try {
      const { data, error } = await this.supabase
        .from('board_packs')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'findById')
      }

      return data || null
    } catch (error: unknown) {
      this.handleError(error, 'findById')
    }
  }

  async findByOrganization(organizationId: string, userId?: string): Promise<Vault[]> {
    try {
      let query = this.supabase
        .from('board_packs')
        .select(`
          *,
          organization:organizations(*),
          board_pack_permissions(
            id,
            granted_to_user_id,
            granted_to_role,
            can_view,
            can_download,
            granted_at
          )
        `)
        .eq('organization_id', organizationId)

      if (userId) {
        query = query.or(`status.eq.published,board_pack_permissions.granted_to_user_id.eq.${userId}`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        this.handleError(error, 'findByOrganization')
      }

      return data || []
    } catch (error: unknown) {
      this.handleError(error, 'findByOrganization')
    }
  }

  async findByUser(userId: string): Promise<Vault[]> {
    try {
      const { data, error } = await this.supabase
        .from('board_packs')
        .select(`
          *,
          organization:organizations(*),
          board_pack_permissions!inner(
            id,
            granted_to_user_id,
            granted_to_role,
            can_view,
            granted_at
          )
        `)
        .eq('board_pack_permissions.granted_to_user_id', userId)
        .order('board_pack_permissions.granted_at', { ascending: false })

      if (error) {
        this.handleError(error, 'findByUser')
      }

      return data || []
    } catch (error: unknown) {
      this.handleError(error, 'findByUser')
    }
  }

  async create(vault: VaultInsert): Promise<Vault> {
    try {
      const { data, error } = await this.supabase
        .from('board_packs')
        .insert(vault)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'create')
      }

      return data!
    } catch (error: unknown) {
      this.handleError(error, 'create')
    }
  }

  async update(id: string, updates: VaultUpdate): Promise<Vault> {
    try {
      const { data, error } = await this.supabase
        .from('board_packs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'update')
      }

      return data!
    } catch (error: unknown) {
      this.handleError(error, 'update')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('board_packs')
        .delete()
        .eq('id', id)

      if (error) {
        this.handleError(error, 'delete')
      }
    } catch (error: unknown) {
      this.handleError(error, 'delete')
    }
  }

  async addMember(vaultId: string, userId: string, role: string = 'member'): Promise<VaultMember> {
    try {
      const { data, error } = await this.supabase
        .from('board_pack_permissions')
        .insert({
          board_pack_id: vaultId,
          granted_to_user_id: userId,
          granted_to_role: role,
          granted_by: 'system', // This should be set to actual user
          granted_at: new Date().toISOString(),
          organization_id: 'default' // This should be set properly
        })
        .select()
        .single()

      if (error) {
        this.handleError(error, 'addMember')
      }

      return data!
    } catch (error: unknown) {
      this.handleError(error, 'addMember')
    }
  }

  async removeMember(vaultId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('board_pack_permissions')
        .delete()
        .eq('board_pack_id', vaultId)
        .eq('granted_to_user_id', userId)

      if (error) {
        this.handleError(error, 'removeMember')
      }
    } catch (error: unknown) {
      this.handleError(error, 'removeMember')
    }
  }

  async getMembers(vaultId: string): Promise<VaultMember[]> {
    try {
      const { data, error } = await this.supabase
        .from('board_pack_permissions')
        .select(`
          *,
          user:users(*)
        `)
        .eq('board_pack_id', vaultId)

      if (error) {
        this.handleError(error, 'getMembers')
      }

      return data || []
    } catch (error: unknown) {
      this.handleError(error, 'getMembers')
    }
  }

  async hasAccess(vaultId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('board_pack_permissions')
        .select('id')
        .eq('board_pack_id', vaultId)
        .eq('granted_to_user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'hasAccess')
      }

      return !!data
    } catch (error: unknown) {
      return false
    }
  }

  async createInvitation(invitationData: {
    vault_id: string
    invited_email: string
    invited_by: string
    role: string
    expires_at?: string
  }): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('vault_invitations')
        .insert({
          id: `vi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          vault_id: invitationData.vault_id,
          invited_email: invitationData.invited_email,
          invited_by: invitationData.invited_by,
          role: invitationData.role,
          status: 'pending',
          expires_at: invitationData.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        this.handleError(error, 'createInvitation')
      }

      return data
    } catch (error: unknown) {
      this.handleError(error, 'createInvitation')
      return null
    }
  }

  async bulkCreateInvitations(invitations: Array<{
    vault_id: string
    invited_email: string
    invited_by: string
    role: string
    expires_at?: string
  }>): Promise<any[]> {
    try {
      const invitationRecords = invitations.map(invitation => ({
        id: `vi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        vault_id: invitation.vault_id,
        invited_email: invitation.invited_email,
        invited_by: invitation.invited_by,
        role: invitation.role,
        status: 'pending',
        expires_at: invitation.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      }))

      const { data, error } = await this.supabase
        .from('vault_invitations')
        .insert(invitationRecords)
        .select()

      if (error) {
        this.handleError(error, 'bulkCreateInvitations')
      }

      return data || []
    } catch (error: unknown) {
      this.handleError(error, 'bulkCreateInvitations')
      return []
    }
  }

  async findInvitationsByVault(vaultId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('vault_invitations')
        .select('*')
        .eq('vault_id', vaultId)
        .order('created_at', { ascending: false })

      if (error) {
        this.handleError(error, 'findInvitationsByVault')
      }

      return data || []
    } catch (error: unknown) {
      this.handleError(error, 'findInvitationsByVault')
      return []
    }
  }
}