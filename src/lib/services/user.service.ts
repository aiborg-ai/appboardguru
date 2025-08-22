import { BaseService } from './base.service'
import { Result, success, failure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  phone?: string
  designation?: string
  linkedin_url?: string
  created_at: string
  updated_at: string
  last_login?: string
  email_verified: boolean
  is_active: boolean
}

export interface CreateUserRequest {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  designation?: string
  linkedin_url?: string
}

export interface UpdateUserRequest {
  first_name?: string
  last_name?: string
  avatar_url?: string
  phone?: string
  designation?: string
  linkedin_url?: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  privacy: {
    profile_visibility: 'public' | 'organization' | 'private'
    activity_visibility: 'public' | 'organization' | 'private'
  }
  language: string
  timezone: string
}

export interface UserActivity {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  timestamp: string
  details?: Record<string, any>
}

export class UserService extends BaseService {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<Result<UserProfile>> {
    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        throw error
      }

      return data as UserProfile
    }, 'getUserProfile', { userId })
  }

  /**
   * Get current user profile
   */
  async getCurrentUserProfile(): Promise<Result<UserProfile>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return userResult
    }

    return this.getUserProfile(userResult.data.id)
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: UpdateUserRequest): Promise<Result<UserProfile>> {
    // Check permissions
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    const permissionResult = await this.checkPermissionWithContext(
      currentUserResult.data.id,
      'user',
      'update',
      userId
    )
    if (!permissionResult.success) {
      return permissionResult
    }

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        throw error
      }

      // Log the activity
      await this.logActivity('update_profile', 'user', userId, updates)

      return data as UserProfile
    }, 'updateUserProfile', { userId, updates })
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<Result<UserPreferences>> {
    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      // Return default preferences if none exist
      if (!data) {
        return {
          theme: 'system',
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          privacy: {
            profile_visibility: 'organization',
            activity_visibility: 'organization'
          },
          language: 'en',
          timezone: 'UTC'
        } as UserPreferences
      }

      return data as UserPreferences
    }, 'getUserPreferences', { userId })
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<Result<UserPreferences>> {
    // Check permissions
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    const permissionResult = await this.checkPermissionWithContext(
      currentUserResult.data.id,
      'user_preferences',
      'update',
      userId
    )
    if (!permissionResult.success) {
      return permissionResult
    }

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Log the activity
      await this.logActivity('update_preferences', 'user_preferences', userId, preferences)

      return data as UserPreferences
    }, 'updateUserPreferences', { userId, preferences })
  }

  /**
   * Get user activity history
   */
  async getUserActivity(
    userId: string,
    options: {
      page?: number
      limit?: number
      startDate?: string
      endDate?: string
      resourceType?: string
    } = {}
  ): Promise<Result<{ activities: UserActivity[], meta: any }>> {
    const { page = 1, limit = 20, startDate, endDate, resourceType } = options

    // Check permissions
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    const permissionResult = await this.checkPermissionWithContext(
      currentUserResult.data.id,
      'user_activity',
      'read',
      userId
    )
    if (!permissionResult.success) {
      return permissionResult
    }

    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (startDate) {
        query = query.gte('created_at', startDate)
      }

      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      if (resourceType) {
        query = query.eq('resource_type', resourceType)
      }

      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw error
      }

      const metaResult = this.createPaginationMeta(count || 0, page, limit)
      if (!metaResult.success) {
        return metaResult
      }

      return {
        activities: data as UserActivity[],
        meta: metaResult.data
      }
    }, 'getUserActivity', { userId, options })
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string, reason?: string): Promise<Result<void>> {
    // Check permissions
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    const permissionResult = await this.checkPermissionWithContext(
      currentUserResult.data.id,
      'user',
      'deactivate',
      userId
    )
    if (!permissionResult.success) {
      return permissionResult
    }

    return this.executeDbOperation(async () => {
      const { error } = await this.supabase
        .from('users')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        throw error
      }

      // Log the deactivation
      await this.logActivity('deactivate_user', 'user', userId, { reason })

    }, 'deactivateUser', { userId, reason })
  }

  /**
   * Reactivate user account
   */
  async reactivateUser(userId: string): Promise<Result<void>> {
    // Check permissions
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    const permissionResult = await this.checkPermissionWithContext(
      currentUserResult.data.id,
      'user',
      'reactivate',
      userId
    )
    if (!permissionResult.success) {
      return permissionResult
    }

    return this.executeDbOperation(async () => {
      const { error } = await this.supabase
        .from('users')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        throw error
      }

      // Log the reactivation
      await this.logActivity('reactivate_user', 'user', userId)

    }, 'reactivateUser', { userId })
  }

  /**
   * Search users within organization
   */
  async searchUsers(
    query: string,
    organizationId?: string,
    options: {
      page?: number
      limit?: number
      includeInactive?: boolean
    } = {}
  ): Promise<Result<{ users: UserProfile[], meta: any }>> {
    const { page = 1, limit = 20, includeInactive = false } = options

    return this.executeDbOperation(async () => {
      let dbQuery = this.supabase
        .from('users')
        .select('*', { count: 'exact' })

      // Add search conditions
      if (query.trim()) {
        dbQuery = dbQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      }

      // Filter by organization if provided
      if (organizationId) {
        dbQuery = dbQuery.eq('organization_id', organizationId)
      }

      // Filter active users unless explicitly including inactive
      if (!includeInactive) {
        dbQuery = dbQuery.eq('is_active', true)
      }

      const offset = (page - 1) * limit
      dbQuery = dbQuery
        .order('first_name', { ascending: true })
        .range(offset, offset + limit - 1)

      const { data, error, count } = await dbQuery

      if (error) {
        throw error
      }

      const metaResult = this.createPaginationMeta(count || 0, page, limit)
      if (!metaResult.success) {
        return metaResult
      }

      return {
        users: data as UserProfile[],
        meta: metaResult.data
      }
    }, 'searchUsers', { query, organizationId, options })
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<Result<void>> {
    return this.executeDbOperation(async () => {
      const { error } = await this.supabase
        .from('users')
        .update({
          last_login: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        throw error
      }
    }, 'updateLastLogin', { userId })
  }

  /**
   * Get users by role within organization
   */
  async getUsersByRole(
    organizationId: string,
    role: string,
    options: {
      page?: number
      limit?: number
    } = {}
  ): Promise<Result<{ users: UserProfile[], meta: any }>> {
    const { page = 1, limit = 20 } = options

    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('organization_members')
        .select(`
          role,
          users (
            id,
            email,
            first_name,
            last_name,
            avatar_url,
            phone,
            designation,
            linkedin_url,
            created_at,
            updated_at,
            last_login,
            email_verified,
            is_active
          )
        `, { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('role', role)
        .eq('users.is_active', true)

      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw error
      }

      const users = data?.map(item => item.users).filter(Boolean) as UserProfile[]

      const metaResult = this.createPaginationMeta(count || 0, page, limit)
      if (!metaResult.success) {
        return metaResult
      }

      return {
        users,
        meta: metaResult.data
      }
    }, 'getUsersByRole', { organizationId, role, options })
  }
}