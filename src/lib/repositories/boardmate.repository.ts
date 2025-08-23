/**
 * BoardMate Repository
 * Handles board member invitations, management, and related operations
 * Following DDD patterns with Result types and enterprise features
 */

import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError, wrapAsync, ErrorCode, ErrorCategory } from './result'
import { 
  QueryOptions, 
  PaginatedResult,
  UserId,
  OrganizationId,
  BoardId,
  createUserId,
  createOrganizationId,
  createBoardId
} from './types'
import { Database } from '../../types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// Database types
type BoardMember = Database['public']['Tables']['board_members']['Row']
type BoardMemberInsert = Database['public']['Tables']['board_members']['Insert']
type BoardMemberUpdate = Database['public']['Tables']['board_members']['Update']
type User = Database['public']['Tables']['users']['Row']
type Organization = Database['public']['Tables']['organizations']['Row']

// Enhanced types for business operations
export interface BoardMateInvitation {
  id: string
  invitation_token: string
  board_member_id: string
  organization_id: string
  expires_at: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  access_level: string
  custom_message?: string
  created_at: string
  accepted_at?: string
  accepted_by?: string
  board_members?: {
    id: string
    full_name: string
    email: string
    board_role: string
    organization_name: string
  }
  organizations?: {
    id: string
    name: string
    slug: string
  }
}

export interface CreateBoardMateInvitationRequest {
  boardMemberId: string
  organizationId: string
  accessLevel: string
  customMessage?: string
  expiresInHours?: number
}

export interface AcceptInvitationRequest {
  token: string
  password: string
  firstName: string
  lastName: string
}

export interface BoardMateProfile extends User {
  board_memberships?: BoardMember[]
  organization_roles?: {
    organization_id: string
    organization_name: string
    role: string
    status: string
  }[]
}

/**
 * BoardMate Repository
 * Manages board member invitations, profiles, and related operations
 */
export class BoardMateRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'BoardMate'
  }

  protected getSearchFields(): string[] {
    return ['full_name', 'email', 'board_role', 'organization_name']
  }

  /**
   * Create a new board member invitation
   */
  async createInvitation(
    request: CreateBoardMateInvitationRequest
  ): Promise<Result<BoardMateInvitation>> {
    return wrapAsync(async () => {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) throw currentUserResult.error

      // Validate organization access
      const organizationIdResult = createOrganizationId(request.organizationId)
      if (!organizationIdResult.success) throw organizationIdResult.error

      const permissionResult = await this.checkOrganizationPermission(
        currentUserResult.data,
        organizationIdResult.data
      )
      if (!permissionResult.success) throw permissionResult.error

      // Generate unique invitation token
      const invitationToken = this.generateSecureToken()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + (request.expiresInHours || 72)) // Default 3 days

      const invitationData = {
        invitation_token: invitationToken,
        board_member_id: request.boardMemberId,
        organization_id: request.organizationId,
        expires_at: expiresAt.toISOString(),
        status: 'pending' as const,
        access_level: request.accessLevel,
        custom_message: request.customMessage,
        created_by: currentUserResult.data,
        created_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('board_member_invitations')
        .insert(invitationData)
        .select(`
          id,
          invitation_token,
          board_member_id,
          organization_id,
          expires_at,
          status,
          access_level,
          custom_message,
          created_at,
          board_members!inner (
            id,
            full_name,
            email,
            board_role,
            organization_name
          ),
          organizations!inner (
            id,
            name,
            slug
          )
        `)
        .single()

      if (error) {
        throw new RepositoryError(
          `Failed to create invitation: ${error.message}`,
          ErrorCode.DATABASE_ERROR,
          { error, request },
          'medium'
        )
      }

      // Log activity
      await this.logActivity('create_boardmate_invitation', 'invitation', data.id, {
        board_member_id: request.boardMemberId,
        organization_id: request.organizationId,
        expires_at: expiresAt.toISOString()
      })

      return data as BoardMateInvitation
    })
  }

  /**
   * Find invitation by token
   */
  async findInvitationByToken(token: string): Promise<Result<BoardMateInvitation | null>> {
    return wrapAsync(async () => {
      if (!token || token.length < 10) {
        throw new RepositoryError(
          'Invalid invitation token format',
          ErrorCode.VALIDATION_ERROR,
          { token: 'redacted' }
        )
      }

      const { data, error } = await this.supabase
        .from('board_member_invitations')
        .select(`
          id,
          invitation_token,
          board_member_id,
          organization_id,
          expires_at,
          status,
          access_level,
          custom_message,
          created_at,
          accepted_at,
          accepted_by,
          board_members!inner (
            id,
            full_name,
            email,
            board_role,
            organization_name
          ),
          organizations!inner (
            id,
            name,
            slug
          )
        `)
        .eq('invitation_token', token)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new RepositoryError(
          `Failed to find invitation: ${error.message}`,
          ErrorCode.DATABASE_ERROR,
          { error }
        )
      }

      return data as BoardMateInvitation | null
    })
  }

  /**
   * Update invitation status
   */
  async updateInvitationStatus(
    invitationId: string,
    status: 'accepted' | 'rejected' | 'expired',
    acceptedBy?: UserId
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'accepted' && acceptedBy) {
        updateData.accepted_at = new Date().toISOString()
        updateData.accepted_by = acceptedBy
      }

      const { error } = await this.supabase
        .from('board_member_invitations')
        .update(updateData)
        .eq('id', invitationId)

      if (error) {
        throw new RepositoryError(
          `Failed to update invitation status: ${error.message}`,
          ErrorCode.DATABASE_ERROR,
          { error, invitationId, status }
        )
      }

      // Log activity
      await this.logActivity('update_invitation_status', 'invitation', invitationId, {
        status,
        accepted_by: acceptedBy
      })
    })
  }

  /**
   * Create user account from invitation
   */
  async createUserFromInvitation(
    invitation: BoardMateInvitation,
    userData: {
      authUserId: string
      email: string
      firstName: string
      lastName: string
    }
  ): Promise<Result<User>> {
    return wrapAsync(async () => {
      // Create user profile
      const userProfileData = {
        id: userData.authUserId,
        email: userData.email,
        full_name: `${userData.firstName.trim()} ${userData.lastName.trim()}`,
        first_name: userData.firstName.trim(),
        last_name: userData.lastName.trim(),
        avatar_url: null,
        role: 'board_member',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: userProfile, error: profileError } = await this.supabase
        .from('users')
        .insert(userProfileData)
        .select()
        .single()

      if (profileError) {
        throw new RepositoryError(
          `Failed to create user profile: ${profileError.message}`,
          ErrorCode.DATABASE_ERROR,
          { error: profileError }
        )
      }

      return userProfile
    })
  }

  /**
   * Link user to board member record
   */
  async linkUserToBoardMember(
    userId: UserId,
    boardMemberId: string
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const { error } = await this.supabase
        .from('board_members')
        .update({
          user_id: userId,
          status: 'active',
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', boardMemberId)

      if (error) {
        throw new RepositoryError(
          `Failed to link user to board member: ${error.message}`,
          ErrorCode.DATABASE_ERROR,
          { error, userId, boardMemberId }
        )
      }

      // Log activity
      await this.logActivity('link_user_board_member', 'board_member', boardMemberId, {
        user_id: userId,
        status: 'active'
      })
    })
  }

  /**
   * Add user to organization
   */
  async addUserToOrganization(
    userId: UserId,
    organizationId: OrganizationId,
    invitedBy: string,
    role: string = 'member'
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const { error } = await this.supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          role,
          invited_by: invitedBy,
          approved_by: invitedBy,
          status: 'active',
          is_primary: false,
          receive_notifications: true,
          joined_at: new Date().toISOString()
        })

      if (error) {
        throw new RepositoryError(
          `Failed to add user to organization: ${error.message}`,
          ErrorCode.DATABASE_ERROR,
          { error, userId, organizationId, role }
        )
      }

      // Log activity
      await this.logActivity('add_user_organization', 'organization_member', `${userId}:${organizationId}`, {
        user_id: userId,
        organization_id: organizationId,
        role,
        invited_by: invitedBy
      })
    })
  }

  /**
   * Get BoardMate profile with memberships
   */
  async getBoardMateProfile(userId: UserId): Promise<Result<BoardMateProfile | null>> {
    return wrapAsync(async () => {
      const userIdResult = createUserId(userId)
      if (!userIdResult.success) throw userIdResult.error

      const { data, error } = await this.supabase
        .from('users')
        .select(`
          *,
          board_members:board_members!user_id (
            id,
            board_id,
            role,
            status,
            appointed_date,
            term_start_date,
            term_end_date,
            is_voting_member,
            attendance_rate,
            expertise_areas
          ),
          organization_members:organization_members!user_id (
            organization_id,
            role,
            status,
            joined_at,
            organizations!inner (
              name
            )
          )
        `)
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new RepositoryError(
          `Failed to get BoardMate profile: ${error.message}`,
          ErrorCode.DATABASE_ERROR,
          { error, userId: 'redacted' }
        )
      }

      if (!data) return null

      // Transform organization roles
      const organizationRoles = data.organization_members?.map((om: any) => ({
        organization_id: om.organization_id,
        organization_name: om.organizations?.name || 'Unknown',
        role: om.role,
        status: om.status
      })) || []

      return {
        ...data,
        board_memberships: data.board_members || [],
        organization_roles: organizationRoles
      } as BoardMateProfile
    })
  }

  /**
   * Check if user already exists by email
   */
  async checkExistingUserByEmail(email: string): Promise<Result<User | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, email, status')
        .eq('email', email)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new RepositoryError(
          `Failed to check existing user: ${error.message}`,
          ErrorCode.DATABASE_ERROR,
          { error }
        )
      }

      return data || null
    })
  }

  /**
   * Generate secure invitation token
   */
  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const length = 32
    let result = ''
    const randomArray = new Uint8Array(length)
    crypto.getRandomValues(randomArray)
    
    for (let i = 0; i < length; i++) {
      result += chars[randomArray[i] % chars.length]
    }
    
    return result
  }
}