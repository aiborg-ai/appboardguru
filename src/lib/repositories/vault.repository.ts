import { BaseRepository } from './base.repository'
import type { Database } from '../../types/database'

type Vault = Database['public']['Tables']['board_packs']['Row']
type VaultInsert = Database['public']['Tables']['board_packs']['Insert'] 
type VaultUpdate = Database['public']['Tables']['board_packs']['Update']
type VaultMember = Database['public']['Tables']['board_pack_permissions']['Row']

export class VaultRepository extends BaseRepository {
  async findById(id: string): Promise<Vault | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('board_packs')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'findById')
      }

      return (data as any) || null
    } catch (error: any) {
      this.handleError(error, 'findById')
    }
  }

  async findByOrganization(organizationId: string, userId?: string): Promise<Vault[]> {
    try {
      let query = (this.supabase as any)
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

      return (data as any) || []
    } catch (error: any) {
      this.handleError(error, 'findByOrganization')
    }
  }

  async findByUser(userId: string): Promise<Vault[]> {
    try {
      const { data, error } = await (this.supabase as any)
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

      return (data as any) || []
    } catch (error: any) {
      this.handleError(error, 'findByUser')
    }
  }

  async create(vault: VaultInsert): Promise<Vault> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('board_packs')
        .insert(vault)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'create')
      }

      return (data as any)!
    } catch (error: any) {
      this.handleError(error, 'create')
    }
  }

  async update(id: string, updates: VaultUpdate): Promise<Vault> {
    try {
      const { data, error } = await (this.supabase as any)
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

      return (data as any)!
    } catch (error: any) {
      this.handleError(error, 'update')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await (this.supabase as any)
        .from('board_packs')
        .delete()
        .eq('id', id)

      if (error) {
        this.handleError(error, 'delete')
      }
    } catch (error: any) {
      this.handleError(error, 'delete')
    }
  }

  async addMember(vaultId: string, userId: string, role: string = 'member'): Promise<VaultMember> {
    try {
      const { data, error } = await (this.supabase as any)
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

      return (data as any)!
    } catch (error: any) {
      this.handleError(error, 'addMember')
    }
  }

  async removeMember(vaultId: string, userId: string): Promise<void> {
    try {
      const { error } = await (this.supabase as any)
        .from('board_pack_permissions')
        .delete()
        .eq('board_pack_id', vaultId)
        .eq('granted_to_user_id', userId)

      if (error) {
        this.handleError(error, 'removeMember')
      }
    } catch (error: any) {
      this.handleError(error, 'removeMember')
    }
  }

  async getMembers(vaultId: string): Promise<VaultMember[]> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('board_pack_permissions')
        .select(`
          *,
          user:users(*)
        `)
        .eq('board_pack_id', vaultId)

      if (error) {
        this.handleError(error, 'getMembers')
      }

      return (data as any) || []
    } catch (error: any) {
      this.handleError(error, 'getMembers')
    }
  }

  async hasAccess(vaultId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('board_pack_permissions')
        .select('id')
        .eq('board_pack_id', vaultId)
        .eq('granted_to_user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'hasAccess')
      }

      return !!(data as any)
    } catch (error: any) {
      return false
    }
  }
}