import { BaseRepository } from './base.repository'
import type { Database } from '../../types/database'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']
type OrganizationMember = Database['public']['Tables']['organization_members']['Row']

export class OrganizationRepository extends BaseRepository {
  async findById(id: string): Promise<Organization | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('organizations')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'findById')
      }

      return (data as any) || null
    } catch (error: any) {
      this.handleError(error, 'findById')
    }
  }

  async findByUser(userId: string): Promise<Organization[]> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('organizations')
        .select(`
          *,
          organization_members!inner(
            id,
            user_id,
            role,
            status,
            joined_at
          )
        `)
        .eq('organization_members.user_id', userId)
        .eq('organization_members.status', 'active')
        .eq('is_active', true)
        .order('organization_members.joined_at', { ascending: false })

      if (error) {
        this.handleError(error, 'findByUser')
      }

      return (data as any) || []
    } catch (error: any) {
      this.handleError(error, 'findByUser')
    }
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'findBySlug')
      }

      return (data as any) || null
    } catch (error: any) {
      this.handleError(error, 'findBySlug')
    }
  }

  async create(organization: OrganizationInsert): Promise<Organization> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('organizations')
        .insert(organization)
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

  async update(id: string, updates: OrganizationUpdate): Promise<Organization> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('organizations')
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
      // Soft delete by marking as inactive
      const { error } = await (this.supabase as any)
        .from('organizations')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        this.handleError(error, 'delete')
      }
    } catch (error: any) {
      this.handleError(error, 'delete')
    }
  }

  async addMember(organizationId: string, userId: string, role: Database['public']['Enums']['organization_role'] = 'member', invitedBy?: string): Promise<OrganizationMember> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          role: role as any,
          invited_by: invitedBy,
          joined_at: new Date().toISOString(),
          status: 'active' as any
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

  async updateMemberRole(organizationId: string, userId: string, role: Database['public']['Enums']['organization_role']): Promise<OrganizationMember> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('organization_members')
        .update({ role: role as any })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        this.handleError(error, 'updateMemberRole')
      }

      return (data as any)!
    } catch (error: any) {
      this.handleError(error, 'updateMemberRole')
    }
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    try {
      const { error } = await (this.supabase as any)
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', userId)

      if (error) {
        this.handleError(error, 'removeMember')
      }
    } catch (error: any) {
      this.handleError(error, 'removeMember')
    }
  }

  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('organization_members')
        .select(`
          *,
          user:users(*)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false })

      if (error) {
        this.handleError(error, 'getMembers')
      }

      return (data as any) || []
    } catch (error: any) {
      this.handleError(error, 'getMembers')
    }
  }

  async getMemberRole(organizationId: string, userId: string): Promise<string | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'getMemberRole')
      }

      return (data as any)?.role || null
    } catch (error: any) {
      return null
    }
  }

  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    try {
      let query = (this.supabase as any)
        .from('organizations')
        .select('id')
        .eq('slug', slug)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') {
        this.handleError(error, 'isSlugAvailable')
      }

      return !(data as any)
    } catch (error: any) {
      return false
    }
  }
}