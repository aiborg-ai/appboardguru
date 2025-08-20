import { BaseRepository } from './base.repository'
import type { Database } from '@/types/database'

type Vault = Database['public']['Tables']['vaults']['Row']
type VaultInsert = Database['public']['Tables']['vaults']['Insert']
type VaultUpdate = Database['public']['Tables']['vaults']['Update']
type VaultMember = Database['public']['Tables']['vault_members']['Row']

export class VaultRepository extends BaseRepository {
  async findById(id: string): Promise<Vault | null> {
    try {
      const { data, error } = await this.supabase
        .from('vaults')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'findById')
      }

      return data || null
    } catch (error) {
      this.handleError(error, 'findById')
    }
  }

  async findByOrganization(organizationId: string, userId?: string): Promise<Vault[]> {
    try {
      let query = this.supabase
        .from('vaults')
        .select(`
          *,
          organization:organizations(*),
          vault_members(
            id,
            user_id,
            role,
            permissions,
            joined_at
          )
        `)
        .eq('organization_id', organizationId)

      if (userId) {
        query = query.or(`status.eq.published,vault_members.user_id.eq.${userId}`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        this.handleError(error, 'findByOrganization')
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'findByOrganization')
    }
  }

  async findByUser(userId: string): Promise<Vault[]> {
    try {
      const { data, error } = await this.supabase
        .from('vaults')
        .select(`
          *,
          organization:organizations(*),
          vault_members!inner(
            id,
            user_id,
            role,
            permissions,
            joined_at
          )
        `)
        .eq('vault_members.user_id', userId)
        .order('vault_members.joined_at', { ascending: false })

      if (error) {
        this.handleError(error, 'findByUser')
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'findByUser')
    }
  }

  async create(vault: VaultInsert): Promise<Vault> {
    try {
      const { data, error } = await this.supabase
        .from('vaults')
        .insert(vault)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'create')
      }

      return data!
    } catch (error) {
      this.handleError(error, 'create')
    }
  }

  async update(id: string, updates: VaultUpdate): Promise<Vault> {
    try {
      const { data, error } = await this.supabase
        .from('vaults')
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
    } catch (error) {
      this.handleError(error, 'update')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('vaults')
        .delete()
        .eq('id', id)

      if (error) {
        this.handleError(error, 'delete')
      }
    } catch (error) {
      this.handleError(error, 'delete')
    }
  }

  async addMember(vaultId: string, userId: string, role: string = 'member'): Promise<VaultMember> {
    try {
      const { data, error } = await this.supabase
        .from('vault_members')
        .insert({
          vault_id: vaultId,
          user_id: userId,
          role,
          joined_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        this.handleError(error, 'addMember')
      }

      return data!
    } catch (error) {
      this.handleError(error, 'addMember')
    }
  }

  async removeMember(vaultId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('vault_members')
        .delete()
        .eq('vault_id', vaultId)
        .eq('user_id', userId)

      if (error) {
        this.handleError(error, 'removeMember')
      }
    } catch (error) {
      this.handleError(error, 'removeMember')
    }
  }

  async getMembers(vaultId: string): Promise<VaultMember[]> {
    try {
      const { data, error } = await this.supabase
        .from('vault_members')
        .select(`
          *,
          user:users(*)
        `)
        .eq('vault_id', vaultId)

      if (error) {
        this.handleError(error, 'getMembers')
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'getMembers')
    }
  }

  async hasAccess(vaultId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('vault_members')
        .select('id')
        .eq('vault_id', vaultId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'hasAccess')
      }

      return !!data
    } catch (error) {
      return false
    }
  }
}