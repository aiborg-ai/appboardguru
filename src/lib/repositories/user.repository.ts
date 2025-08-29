import { BaseRepository } from './base.repository'
import { Result } from './result'
import { RepositoryError } from './document-errors'
import type { Database } from '../../types/database'

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']
type UserRole = 'admin' | 'superuser' | 'user' | 'viewer' | 'reviewer' | 'pending'

export class UserRepository extends BaseRepository {
  async findById(id: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'findById')
      }

      return data || null
    } catch (error) {
      this.handleError(error, 'findById')
      return null
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'findByEmail')
      }

      return data || null
    } catch (error) {
      this.handleError(error, 'findByEmail')
      return null
    }
  }

  async create(user: UserInsert): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert(user)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'create')
      }

      if (!data) {
        throw new Error('Failed to create user: no data returned')
      }

      return data
    } catch (error) {
      this.handleError(error, 'create')
      throw error
    }
  }

  async update(id: string, updates: UserUpdate): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from('users')
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

      if (!data) {
        throw new Error('Failed to update user: no data returned')
      }

      return data
    } catch (error) {
      this.handleError(error, 'update')
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) {
        this.handleError(error, 'delete')
      }
    } catch (error) {
      this.handleError(error, 'delete')
    }
  }

  async findByOrganization(organizationId: string): Promise<User[]> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select(`
          *,
          organization_members!inner(
            organization_id,
            role,
            status
          )
        `)
        .eq('organization_members.organization_id', organizationId)
        .eq('organization_members.status', 'active')

      if (error) {
        this.handleError(error, 'findByOrganization')
      }

      return data || []
    } catch (error) {
      this.handleError(error, 'findByOrganization')
      return []
    }
  }

  async updateLastAccess(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('organization_members')
        .update({
          last_accessed: new Date().toISOString(),
          access_count: 1 // Will be incremented via SQL trigger or separate query
        })
        .eq('user_id', id)

      if (error) {
        this.handleError(error, 'updateLastAccess')
      }
    } catch (error) {
      this.handleError(error, 'updateLastAccess')
    }
  }
}