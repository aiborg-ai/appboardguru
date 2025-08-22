import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  QueryOptions, 
  PaginatedResult,
  UserId,
  OrganizationId,
  CommitteeId,
  createCommitteeId
} from './types'
import { Database } from '../../types/database'

type Committee = Database['public']['Tables']['committees']['Row']
type CommitteeInsert = Database['public']['Tables']['committees']['Insert']
type CommitteeUpdate = Database['public']['Tables']['committees']['Update']

type CommitteeMember = Database['public']['Tables']['committee_members']['Row']
type CommitteeMemberInsert = Database['public']['Tables']['committee_members']['Insert']

export interface CommitteeWithMembers extends Committee {
  committee_members: CommitteeMember[]
}

export class CommitteeRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'Committee'
  }

  protected getSearchFields(): string[] {
    return ['name', 'description', 'purpose']
  }

  /**
   * Find all committees for an organization
   */
  async findByOrganization(
    organizationId: OrganizationId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<Committee>>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Check organization permission
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        organizationId
      )
      if (!permissionResult.success) return permissionResult

      let query = this.supabase
        .from('committees')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findByOrganization'))
      }

      return this.createPaginatedResult(data || [], count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find committees by organization', error))
    }
  }

  /**
   * Find a committee by ID with members
   */
  async findByIdWithMembers(committeeId: CommitteeId): Promise<Result<CommitteeWithMembers>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const { data, error } = await this.supabase
        .from('committees')
        .select(`
          *,
          committee_members (
            *,
            user:users (
              id,
              email,
              full_name
            )
          )
        `)
        .eq('id', committeeId)
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findByIdWithMembers'))
      }

      // Check if user has access to this committee
      const orgPermissionResult = await this.checkOrganizationPermission(
        userResult.data,
        data.organization_id
      )
      if (!orgPermissionResult.success) return orgPermissionResult

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find committee with members', error))
    }
  }

  /**
   * Create a new committee
   */
  async create(
    committeeData: Omit<CommitteeInsert, 'id' | 'created_at' | 'updated_at'>,
    memberUserIds: UserId[] = []
  ): Promise<Result<Committee>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Validate required fields
      const validationResult = this.validateRequired(committeeData, ['name', 'organization_id'])
      if (!validationResult.success) return validationResult

      // Check organization permission
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        committeeData.organization_id,
        ['admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      return await this.transaction(async (client) => {
        // Create the committee
        const { data: committee, error: committeeError } = await client
          .from('committees')
          .insert({
            ...committeeData,
            created_by: userResult.data
          })
          .select()
          .single()

        if (committeeError) {
          throw RepositoryError.fromSupabaseError(committeeError, 'create committee')
        }

        // Add committee members if specified
        if (memberUserIds.length > 0) {
          const committeeMembers: CommitteeMemberInsert[] = memberUserIds.map(userId => ({
            committee_id: committee.id,
            user_id: userId,
            role: 'member',
            status: 'active',
            added_by: userResult.data
          }))

          const { error: membersError } = await client
            .from('committee_members')
            .insert(committeeMembers)

          if (membersError) {
            throw RepositoryError.fromSupabaseError(membersError, 'add committee members')
          }
        }

        // Log activity
        await this.logActivity({
          user_id: userResult.data,
          organization_id: committeeData.organization_id,
          event_type: 'committee.created',
          event_category: 'governance',
          action: 'create',
          resource_type: 'committee',
          resource_id: committee.id,
          event_description: `Created committee: ${committee.name}`,
          outcome: 'success',
          severity: 'medium'
        })

        return committee
      })
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to create committee', error))
    }
  }

  /**
   * Update a committee
   */
  async update(
    committeeId: CommitteeId,
    updates: CommitteeUpdate
  ): Promise<Result<Committee>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // First get the current committee to check permissions
      const currentCommitteeResult = await this.findById(committeeId)
      if (!currentCommitteeResult.success) return currentCommitteeResult

      const currentCommittee = currentCommitteeResult.data
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        currentCommittee.organization_id,
        ['admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      const { data, error } = await this.supabase
        .from('committees')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', committeeId)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'update'))
      }

      // Log activity
      await this.logActivity({
        user_id: userResult.data,
        organization_id: currentCommittee.organization_id,
        event_type: 'committee.updated',
        event_category: 'governance',
        action: 'update',
        resource_type: 'committee',
        resource_id: committeeId,
        event_description: `Updated committee: ${data.name}`,
        outcome: 'success',
        severity: 'low',
        details: updates
      })

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to update committee', error))
    }
  }

  /**
   * Delete a committee
   */
  async delete(committeeId: CommitteeId): Promise<Result<void>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // First get the current committee to check permissions
      const currentCommitteeResult = await this.findById(committeeId)
      if (!currentCommitteeResult.success) return currentCommitteeResult

      const currentCommittee = currentCommitteeResult.data
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        currentCommittee.organization_id,
        ['admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      return await this.transaction(async (client) => {
        // Delete committee members first
        const { error: membersError } = await client
          .from('committee_members')
          .delete()
          .eq('committee_id', committeeId)

        if (membersError) {
          throw RepositoryError.fromSupabaseError(membersError, 'delete committee members')
        }

        // Delete the committee
        const { error: committeeError } = await client
          .from('committees')
          .delete()
          .eq('id', committeeId)

        if (committeeError) {
          throw RepositoryError.fromSupabaseError(committeeError, 'delete committee')
        }

        // Log activity
        await this.logActivity({
          user_id: userResult.data,
          organization_id: currentCommittee.organization_id,
          event_type: 'committee.deleted',
          event_category: 'governance',
          action: 'delete',
          resource_type: 'committee',
          resource_id: committeeId,
          event_description: `Deleted committee: ${currentCommittee.name}`,
          outcome: 'success',
          severity: 'high'
        })
      })
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to delete committee', error))
    }
  }

  /**
   * Add a member to a committee
   */
  async addMember(
    committeeId: CommitteeId,
    userId: UserId,
    role: string = 'member'
  ): Promise<Result<CommitteeMember>> {
    try {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) return currentUserResult

      // Get committee to check permissions
      const committeeResult = await this.findById(committeeId)
      if (!committeeResult.success) return committeeResult

      const committee = committeeResult.data
      const permissionResult = await this.checkOrganizationPermission(
        currentUserResult.data,
        committee.organization_id,
        ['admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      const { data, error } = await this.supabase
        .from('committee_members')
        .insert({
          committee_id: committeeId,
          user_id: userId,
          role,
          status: 'active',
          added_by: currentUserResult.data
        })
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'addMember'))
      }

      // Log activity
      await this.logActivity({
        user_id: currentUserResult.data,
        organization_id: committee.organization_id,
        event_type: 'committee.member_added',
        event_category: 'governance',
        action: 'create',
        resource_type: 'committee_member',
        resource_id: data.id,
        event_description: `Added member to committee: ${committee.name}`,
        outcome: 'success',
        severity: 'medium',
        details: { committee_id: committeeId, member_user_id: userId, role }
      })

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to add committee member', error))
    }
  }

  /**
   * Remove a member from a committee
   */
  async removeMember(committeeId: CommitteeId, userId: UserId): Promise<Result<void>> {
    try {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) return currentUserResult

      // Get committee to check permissions
      const committeeResult = await this.findById(committeeId)
      if (!committeeResult.success) return committeeResult

      const committee = committeeResult.data
      const permissionResult = await this.checkOrganizationPermission(
        currentUserResult.data,
        committee.organization_id,
        ['admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      const { error } = await this.supabase
        .from('committee_members')
        .delete()
        .eq('committee_id', committeeId)
        .eq('user_id', userId)

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'removeMember'))
      }

      // Log activity
      await this.logActivity({
        user_id: currentUserResult.data,
        organization_id: committee.organization_id,
        event_type: 'committee.member_removed',
        event_category: 'governance',
        action: 'delete',
        resource_type: 'committee_member',
        resource_id: `${committeeId}-${userId}`,
        event_description: `Removed member from committee: ${committee.name}`,
        outcome: 'success',
        severity: 'medium',
        details: { committee_id: committeeId, member_user_id: userId }
      })

      return success(undefined)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to remove committee member', error))
    }
  }

  /**
   * Find a committee by ID
   */
  private async findById(committeeId: CommitteeId): Promise<Result<Committee>> {
    try {
      const { data, error } = await this.supabase
        .from('committees')
        .select('*')
        .eq('id', committeeId)
        .single()

      return this.createResult(data, error, 'findById')
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find committee by ID', error))
    }
  }

  /**
   * Get committee members
   */
  async getMembers(committeeId: CommitteeId): Promise<Result<CommitteeMember[]>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get committee to check permissions
      const committeeResult = await this.findById(committeeId)
      if (!committeeResult.success) return committeeResult

      const committee = committeeResult.data
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        committee.organization_id
      )
      if (!permissionResult.success) return permissionResult

      const { data, error } = await this.supabase
        .from('committee_members')
        .select(`
          *,
          user:users (
            id,
            email,
            full_name
          )
        `)
        .eq('committee_id', committeeId)
        .eq('status', 'active')

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'getMembers'))
      }

      return success(data || [])
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get committee members', error))
    }
  }

  /**
   * Find committees by user membership
   */
  async findByUserMembership(
    userId: UserId,
    organizationId: OrganizationId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<Committee>>> {
    try {
      const currentUserResult = await this.getCurrentUserId()
      if (!currentUserResult.success) return currentUserResult

      // Check organization permission
      const permissionResult = await this.checkOrganizationPermission(
        currentUserResult.data,
        organizationId
      )
      if (!permissionResult.success) return permissionResult

      let query = this.supabase
        .from('committees')
        .select(`
          *,
          committee_members!inner (
            user_id,
            role,
            status
          )
        `, { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('committee_members.user_id', userId)
        .eq('committee_members.status', 'active')

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findByUserMembership'))
      }

      return this.createPaginatedResult(data || [], count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find committees by user membership', error))
    }
  }
}