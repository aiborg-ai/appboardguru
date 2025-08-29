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

  /**
   * Update user's role (with Result pattern)
   * Agent: REPO-02 Enhancement
   */
  async updateUserRole(userId: string, role: UserRole): Promise<Result<User>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({
          role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to update user role',
            'UPDATE_ERROR',
            { userId, role, error: error.message }
          )
        }
      }

      if (!data) {
        return {
          success: false,
          error: new RepositoryError(
            'No data returned after role update',
            'NO_DATA',
            { userId, role }
          )
        }
      }

      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error updating user role',
          'INTERNAL_ERROR',
          { userId, role, error }
        )
      }
    }
  }

  /**
   * Get all users with reviewer role
   * Agent: REPO-02 Enhancement
   */
  async getReviewers(organizationId?: string): Promise<Result<User[]>> {
    try {
      let query = this.supabase
        .from('users')
        .select('*')
        .or('role.eq.reviewer,is_reviewer.eq.true')

      if (organizationId) {
        // Join with organization_members to filter by organization
        query = query
          .select(`
            *,
            organization_members!inner(
              organization_id
            )
          `)
          .eq('organization_members.organization_id', organizationId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to get reviewers',
            'QUERY_ERROR',
            { organizationId, error: error.message }
          )
        }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error getting reviewers',
          'INTERNAL_ERROR',
          { organizationId, error }
        )
      }
    }
  }

  /**
   * Check if user has a specific permission
   * Agent: REPO-02 Enhancement
   */
  async checkPermission(userId: string, permission: string): Promise<Result<boolean>> {
    try {
      // First get the user's role
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        return {
          success: false,
          error: new RepositoryError(
            'User not found',
            'NOT_FOUND',
            { userId }
          )
        }
      }

      // Check permission based on role using the database function
      const { data, error } = await this.supabase
        .rpc('check_permission', {
          p_user_id: userId,
          p_permission_key: permission
        })

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to check permission',
            'RPC_ERROR',
            { userId, permission, error: error.message }
          )
        }
      }

      return { success: true, data: data || false }
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error checking permission',
          'INTERNAL_ERROR',
          { userId, permission, error }
        )
      }
    }
  }

  /**
   * Get users by role
   * Agent: REPO-02 Enhancement
   */
  async getUsersByRole(role: UserRole, organizationId?: string): Promise<Result<User[]>> {
    try {
      let query = this.supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .eq('status', 'approved')

      if (organizationId) {
        query = query
          .select(`
            *,
            organization_members!inner(
              organization_id,
              status
            )
          `)
          .eq('organization_members.organization_id', organizationId)
          .eq('organization_members.status', 'active')
      }

      const { data, error } = await query.order('full_name')

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to get users by role',
            'QUERY_ERROR',
            { role, organizationId, error: error.message }
          )
        }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error getting users by role',
          'INTERNAL_ERROR',
          { role, organizationId, error }
        )
      }
    }
  }

  /**
   * Create a reviewer account with special permissions
   * Agent: REPO-02 Enhancement
   */
  async createReviewer(
    email: string,
    fullName: string,
    testEnvAccess: boolean = false
  ): Promise<Result<User>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          email,
          full_name: fullName,
          role: 'reviewer' as UserRole,
          is_reviewer: true,
          test_environment_access: testEnvAccess,
          reviewer_metadata: {
            created_as_reviewer: true,
            created_at: new Date().toISOString()
          },
          status: 'approved',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to create reviewer account',
            'INSERT_ERROR',
            { email, error: error.message }
          )
        }
      }

      if (!data) {
        return {
          success: false,
          error: new RepositoryError(
            'No data returned after creating reviewer',
            'NO_DATA',
            { email }
          )
        }
      }

      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error creating reviewer',
          'INTERNAL_ERROR',
          { email, error }
        )
      }
    }
  }
}