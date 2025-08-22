import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { UserId, createUserId } from './types'
import { Database } from '../../types/database'
import { User, Session } from '@supabase/supabase-js'

export interface AuthenticatedUser {
  id: UserId
  email: string
  emailConfirmed: boolean
  phone?: string
  createdAt: string
  lastSignInAt?: string
  userMetadata: Record<string, any>
  appMetadata: Record<string, any>
}

export interface UserProfile {
  id: UserId
  userId: UserId
  fullName?: string
  avatarUrl?: string
  timezone?: string
  locale?: string
  theme?: string
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  id: string
  userId: UserId
  notifications: {
    email: boolean
    push: boolean
    inApp: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'private' | 'organization'
    activityTracking: boolean
  }
  accessibility: {
    highContrast: boolean
    screenReader: boolean
    fontSize: 'small' | 'medium' | 'large'
  }
  createdAt: string
  updatedAt: string
}

export class AuthRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'Auth'
  }

  protected getSearchFields(): string[] {
    return []
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<Result<AuthenticatedUser>> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      
      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'getCurrentUser'))
      }

      if (!user) {
        return failure(RepositoryError.unauthorized('No authenticated user'))
      }

      return success({
        id: createUserId(user.id),
        email: user.email!,
        emailConfirmed: user.email_confirmed_at !== null,
        phone: user.phone,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        userMetadata: user.user_metadata || {},
        appMetadata: user.app_metadata || {}
      })
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get current user', error))
    }
  }

  /**
   * Get the current session
   */
  async getCurrentSession(): Promise<Result<Session | null>> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'getCurrentSession'))
      }

      return success(session)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get current session', error))
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId?: UserId): Promise<Result<UserProfile | null>> {
    try {
      let targetUserId: UserId

      if (userId) {
        targetUserId = userId
      } else {
        const currentUserResult = await this.getCurrentUserId()
        if (!currentUserResult.success) return currentUserResult
        targetUserId = currentUserResult.data
      }

      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single()

      if (error) {
        // Return null for not found instead of error for profiles
        if (error.code === 'PGRST116') {
          return success(null)
        }
        return failure(RepositoryError.fromSupabaseError(error, 'getUserProfile'))
      }

      return success({
        id: createUserId(data.id),
        userId: createUserId(data.user_id),
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        timezone: data.timezone,
        locale: data.locale,
        theme: data.theme,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      })
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get user profile', error))
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    updates: Partial<Pick<UserProfile, 'fullName' | 'avatarUrl' | 'timezone' | 'locale' | 'theme'>>
  ): Promise<Result<UserProfile>> {
    try {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) return currentUserResult

      const { data, error } = await this.supabase
        .from('user_profiles')
        .update({
          full_name: updates.fullName,
          avatar_url: updates.avatarUrl,
          timezone: updates.timezone,
          locale: updates.locale,
          theme: updates.theme,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUserResult.data)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'updateUserProfile'))
      }

      return success({
        id: createUserId(data.id),
        userId: createUserId(data.user_id),
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        timezone: data.timezone,
        locale: data.locale,
        theme: data.theme,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      })
    } catch (error) {
      return failure(RepositoryError.internal('Failed to update user profile', error))
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId?: UserId): Promise<Result<UserPreferences | null>> {
    try {
      let targetUserId: UserId

      if (userId) {
        targetUserId = userId
      } else {
        const currentUserResult = await this.getCurrentUserId()
        if (!currentUserResult.success) return currentUserResult
        targetUserId = currentUserResult.data
      }

      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', targetUserId)
        .single()

      if (error) {
        // Return null for not found instead of error for preferences
        if (error.code === 'PGRST116') {
          return success(null)
        }
        return failure(RepositoryError.fromSupabaseError(error, 'getUserPreferences'))
      }

      return success({
        id: data.id,
        userId: createUserId(data.user_id),
        notifications: data.notifications || {
          email: true,
          push: true,
          inApp: true
        },
        privacy: data.privacy || {
          profileVisibility: 'organization',
          activityTracking: true
        },
        accessibility: data.accessibility || {
          highContrast: false,
          screenReader: false,
          fontSize: 'medium'
        },
        createdAt: data.created_at,
        updatedAt: data.updated_at
      })
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get user preferences', error))
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    updates: Partial<Pick<UserPreferences, 'notifications' | 'privacy' | 'accessibility'>>
  ): Promise<Result<UserPreferences>> {
    try {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) return currentUserResult

      const { data, error } = await this.supabase
        .from('user_preferences')
        .update({
          notifications: updates.notifications,
          privacy: updates.privacy,
          accessibility: updates.accessibility,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUserResult.data)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'updateUserPreferences'))
      }

      return success({
        id: data.id,
        userId: createUserId(data.user_id),
        notifications: data.notifications,
        privacy: data.privacy,
        accessibility: data.accessibility,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      })
    } catch (error) {
      return failure(RepositoryError.internal('Failed to update user preferences', error))
    }
  }

  /**
   * Create initial user profile and preferences
   */
  async createUserProfile(
    userId: UserId,
    profileData: Partial<Pick<UserProfile, 'fullName' | 'avatarUrl' | 'timezone' | 'locale'>>
  ): Promise<Result<UserProfile>> {
    try {
      return await this.transaction(async (client) => {
        // Create profile
        const { data: profile, error: profileError } = await client
          .from('user_profiles')
          .insert({
            user_id: userId,
            full_name: profileData.fullName,
            avatar_url: profileData.avatarUrl,
            timezone: profileData.timezone || 'UTC',
            locale: profileData.locale || 'en-US',
            theme: 'light'
          })
          .select()
          .single()

        if (profileError) {
          throw RepositoryError.fromSupabaseError(profileError, 'create user profile')
        }

        // Create default preferences
        const { error: preferencesError } = await client
          .from('user_preferences')
          .insert({
            user_id: userId,
            notifications: {
              email: true,
              push: true,
              inApp: true
            },
            privacy: {
              profileVisibility: 'organization',
              activityTracking: true
            },
            accessibility: {
              highContrast: false,
              screenReader: false,
              fontSize: 'medium'
            }
          })

        if (preferencesError) {
          throw RepositoryError.fromSupabaseError(preferencesError, 'create user preferences')
        }

        return {
          id: createUserId(profile.id),
          userId: createUserId(profile.user_id),
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          timezone: profile.timezone,
          locale: profile.locale,
          theme: profile.theme,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }
      })
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to create user profile', error))
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.auth.signOut()
      
      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'signOut'))
      }

      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to sign out', error))
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<Result<Session>> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession()
      
      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'refreshSession'))
      }

      if (!data.session) {
        return failure(RepositoryError.unauthorized('No session to refresh'))
      }

      return success(data.session)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to refresh session', error))
    }
  }

  /**
   * Verify if user has a specific role in an organization
   */
  async hasOrganizationRole(
    userId: UserId,
    organizationId: string,
    requiredRoles: string[]
  ): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return success(false) // User is not a member
        }
        return failure(RepositoryError.fromSupabaseError(error, 'hasOrganizationRole'))
      }

      return success(requiredRoles.includes(data.role))
    } catch (error) {
      return failure(RepositoryError.internal('Failed to check organization role', error))
    }
  }

  /**
   * Get user's organization memberships
   */
  async getUserOrganizations(userId?: UserId): Promise<Result<Array<{
    organizationId: string
    role: string
    status: string
    joinedAt: string
    organization: {
      id: string
      name: string
      slug: string
    }
  }>>> {
    try {
      let targetUserId: UserId

      if (userId) {
        targetUserId = userId
      } else {
        const currentUserResult = await this.getCurrentUserId()
        if (!currentUserResult.success) return currentUserResult
        targetUserId = currentUserResult.data
      }

      const { data, error } = await this.supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          status,
          created_at,
          organization:organizations (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', targetUserId)
        .eq('status', 'active')

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'getUserOrganizations'))
      }

      const organizations = data.map(item => ({
        organizationId: item.organization_id,
        role: item.role,
        status: item.status,
        joinedAt: item.created_at,
        organization: {
          id: (item.organization as any).id,
          name: (item.organization as any).name,
          slug: (item.organization as any).slug
        }
      }))

      return success(organizations)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get user organizations', error))
    }
  }

  /**
   * Update user's last activity timestamp
   */
  async updateLastActivity(userId?: UserId): Promise<Result<void>> {
    try {
      let targetUserId: UserId

      if (userId) {
        targetUserId = userId
      } else {
        const currentUserResult = await this.getCurrentUserId()
        if (!currentUserResult.success) return currentUserResult
        targetUserId = currentUserResult.data
      }

      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', targetUserId)

      if (error) {
        // Don't fail the operation if activity update fails
        console.warn('Failed to update last activity:', error)
      }

      return success(undefined)
    } catch (error) {
      // Don't fail the operation if activity update fails
      console.warn('Failed to update last activity:', error)
      return success(undefined)
    }
  }
}