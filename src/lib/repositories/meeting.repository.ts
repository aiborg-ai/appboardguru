import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  QueryOptions, 
  PaginatedResult,
  UserId,
  OrganizationId,
  MeetingId,
  createMeetingId
} from './types'
import { Database } from '../../types/database'

type Meeting = Database['public']['Tables']['meetings']['Row']
type MeetingInsert = Database['public']['Tables']['meetings']['Insert']
type MeetingUpdate = Database['public']['Tables']['meetings']['Update']

type MeetingActionable = Database['public']['Tables']['meeting_actionables']['Row']
type MeetingActionableInsert = Database['public']['Tables']['meeting_actionables']['Insert']
type MeetingActionableUpdate = Database['public']['Tables']['meeting_actionables']['Update']

type MeetingResolution = Database['public']['Tables']['meeting_resolutions']['Row']
type MeetingResolutionInsert = Database['public']['Tables']['meeting_resolutions']['Insert']
type MeetingResolutionUpdate = Database['public']['Tables']['meeting_resolutions']['Update']

export interface MeetingWithDetails extends Meeting {
  meeting_actionables?: MeetingActionable[]
  meeting_resolutions?: MeetingResolution[]
}

export class MeetingRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'Meeting'
  }

  protected getSearchFields(): string[] {
    return ['title', 'description', 'location']
  }

  /**
   * Find all meetings for an organization
   */
  async findByOrganization(
    organizationId: OrganizationId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<Meeting>>> {
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
        .from('meetings')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)

      // Add default ordering by start_time
      if (!options.sortBy) {
        query = query.order('start_time', { ascending: false })
      }

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findByOrganization'))
      }

      return this.createPaginatedResult(data || [], count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find meetings by organization', error))
    }
  }

  /**
   * Find a meeting by ID with actionables and resolutions
   */
  async findByIdWithDetails(meetingId: MeetingId): Promise<Result<MeetingWithDetails>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const { data, error } = await this.supabase
        .from('meetings')
        .select(`
          *,
          meeting_actionables (*),
          meeting_resolutions (*)
        `)
        .eq('id', meetingId)
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findByIdWithDetails'))
      }

      // Check if user has access to this meeting
      const orgPermissionResult = await this.checkOrganizationPermission(
        userResult.data,
        data.organization_id
      )
      if (!orgPermissionResult.success) return orgPermissionResult

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find meeting with details', error))
    }
  }

  /**
   * Create a new meeting
   */
  async create(
    meetingData: Omit<MeetingInsert, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Result<Meeting>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Validate required fields
      const validationResult = this.validateRequired(meetingData, ['title', 'organization_id', 'start_time'])
      if (!validationResult.success) return validationResult

      // Check organization permission
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        meetingData.organization_id,
        ['member', 'admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      const { data, error } = await this.supabase
        .from('meetings')
        .insert({
          ...meetingData,
          created_by: userResult.data
        })
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'create'))
      }

      // Log activity
      await this.logActivity({
        user_id: userResult.data,
        organization_id: meetingData.organization_id,
        event_type: 'meeting.created',
        event_category: 'governance',
        action: 'create',
        resource_type: 'meeting',
        resource_id: data.id,
        event_description: `Created meeting: ${data.title}`,
        outcome: 'success',
        severity: 'medium'
      })

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to create meeting', error))
    }
  }

  /**
   * Update a meeting
   */
  async update(
    meetingId: MeetingId,
    updates: MeetingUpdate
  ): Promise<Result<Meeting>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // First get the current meeting to check permissions
      const currentMeetingResult = await this.findById(meetingId)
      if (!currentMeetingResult.success) return currentMeetingResult

      const currentMeeting = currentMeetingResult.data
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        currentMeeting.organization_id,
        ['member', 'admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      const { data, error } = await this.supabase
        .from('meetings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'update'))
      }

      // Log activity
      await this.logActivity({
        user_id: userResult.data,
        organization_id: currentMeeting.organization_id,
        event_type: 'meeting.updated',
        event_category: 'governance',
        action: 'update',
        resource_type: 'meeting',
        resource_id: meetingId,
        event_description: `Updated meeting: ${data.title}`,
        outcome: 'success',
        severity: 'low',
        details: updates
      })

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to update meeting', error))
    }
  }

  /**
   * Delete a meeting
   */
  async delete(meetingId: MeetingId): Promise<Result<void>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // First get the current meeting to check permissions
      const currentMeetingResult = await this.findById(meetingId)
      if (!currentMeetingResult.success) return currentMeetingResult

      const currentMeeting = currentMeetingResult.data
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        currentMeeting.organization_id,
        ['admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      return await this.transaction(async (client) => {
        // Delete meeting actionables first
        await client
          .from('meeting_actionables')
          .delete()
          .eq('meeting_id', meetingId)

        // Delete meeting resolutions
        await client
          .from('meeting_resolutions')
          .delete()
          .eq('meeting_id', meetingId)

        // Delete the meeting
        const { error: meetingError } = await client
          .from('meetings')
          .delete()
          .eq('id', meetingId)

        if (meetingError) {
          throw RepositoryError.fromSupabaseError(meetingError, 'delete meeting')
        }

        // Log activity
        await this.logActivity({
          user_id: userResult.data,
          organization_id: currentMeeting.organization_id,
          event_type: 'meeting.deleted',
          event_category: 'governance',
          action: 'delete',
          resource_type: 'meeting',
          resource_id: meetingId,
          event_description: `Deleted meeting: ${currentMeeting.title}`,
          outcome: 'success',
          severity: 'high'
        })
      })
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to delete meeting', error))
    }
  }

  /**
   * Add an actionable to a meeting
   */
  async addActionable(
    meetingId: MeetingId,
    actionableData: Omit<MeetingActionableInsert, 'id' | 'meeting_id' | 'created_at' | 'updated_at'>
  ): Promise<Result<MeetingActionable>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get meeting to check permissions
      const meetingResult = await this.findById(meetingId)
      if (!meetingResult.success) return meetingResult

      const meeting = meetingResult.data
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        meeting.organization_id,
        ['member', 'admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      // Validate required fields
      const validationResult = this.validateRequired(actionableData, ['title', 'description'])
      if (!validationResult.success) return validationResult

      const { data, error } = await this.supabase
        .from('meeting_actionables')
        .insert({
          ...actionableData,
          meeting_id: meetingId,
          created_by: userResult.data
        })
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'addActionable'))
      }

      // Log activity
      await this.logActivity({
        user_id: userResult.data,
        organization_id: meeting.organization_id,
        event_type: 'meeting.actionable_added',
        event_category: 'governance',
        action: 'create',
        resource_type: 'meeting_actionable',
        resource_id: data.id,
        event_description: `Added actionable to meeting: ${meeting.title}`,
        outcome: 'success',
        severity: 'medium',
        details: { meeting_id: meetingId, actionable_title: data.title }
      })

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to add meeting actionable', error))
    }
  }

  /**
   * Update a meeting actionable
   */
  async updateActionable(
    actionableId: string,
    updates: MeetingActionableUpdate
  ): Promise<Result<MeetingActionable>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get current actionable to check permissions
      const { data: currentActionable, error: currentError } = await this.supabase
        .from('meeting_actionables')
        .select('*, meeting:meetings(organization_id)')
        .eq('id', actionableId)
        .single()

      if (currentError || !currentActionable) {
        return failure(RepositoryError.fromSupabaseError(currentError, 'get current actionable'))
      }

      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        (currentActionable.meeting as any).organization_id,
        ['member', 'admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      const { data, error } = await this.supabase
        .from('meeting_actionables')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', actionableId)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'updateActionable'))
      }

      // Log activity
      await this.logActivity({
        user_id: userResult.data,
        organization_id: (currentActionable.meeting as any).organization_id,
        event_type: 'meeting.actionable_updated',
        event_category: 'governance',
        action: 'update',
        resource_type: 'meeting_actionable',
        resource_id: actionableId,
        event_description: `Updated meeting actionable: ${data.title}`,
        outcome: 'success',
        severity: 'low',
        details: updates
      })

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to update meeting actionable', error))
    }
  }

  /**
   * Add a resolution to a meeting
   */
  async addResolution(
    meetingId: MeetingId,
    resolutionData: Omit<MeetingResolutionInsert, 'id' | 'meeting_id' | 'created_at' | 'updated_at'>
  ): Promise<Result<MeetingResolution>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get meeting to check permissions
      const meetingResult = await this.findById(meetingId)
      if (!meetingResult.success) return meetingResult

      const meeting = meetingResult.data
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        meeting.organization_id,
        ['member', 'admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      // Validate required fields
      const validationResult = this.validateRequired(resolutionData, ['title', 'description', 'status'])
      if (!validationResult.success) return validationResult

      const { data, error } = await this.supabase
        .from('meeting_resolutions')
        .insert({
          ...resolutionData,
          meeting_id: meetingId,
          created_by: userResult.data
        })
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'addResolution'))
      }

      // Log activity
      await this.logActivity({
        user_id: userResult.data,
        organization_id: meeting.organization_id,
        event_type: 'meeting.resolution_added',
        event_category: 'governance',
        action: 'create',
        resource_type: 'meeting_resolution',
        resource_id: data.id,
        event_description: `Added resolution to meeting: ${meeting.title}`,
        outcome: 'success',
        severity: 'medium',
        details: { meeting_id: meetingId, resolution_title: data.title }
      })

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to add meeting resolution', error))
    }
  }

  /**
   * Update a meeting resolution
   */
  async updateResolution(
    resolutionId: string,
    updates: MeetingResolutionUpdate
  ): Promise<Result<MeetingResolution>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get current resolution to check permissions
      const { data: currentResolution, error: currentError } = await this.supabase
        .from('meeting_resolutions')
        .select('*, meeting:meetings(organization_id)')
        .eq('id', resolutionId)
        .single()

      if (currentError || !currentResolution) {
        return failure(RepositoryError.fromSupabaseError(currentError, 'get current resolution'))
      }

      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        (currentResolution.meeting as any).organization_id,
        ['member', 'admin', 'owner']
      )
      if (!permissionResult.success) return permissionResult

      const { data, error } = await this.supabase
        .from('meeting_resolutions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', resolutionId)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'updateResolution'))
      }

      // Log activity
      await this.logActivity({
        user_id: userResult.data,
        organization_id: (currentResolution.meeting as any).organization_id,
        event_type: 'meeting.resolution_updated',
        event_category: 'governance',
        action: 'update',
        resource_type: 'meeting_resolution',
        resource_id: resolutionId,
        event_description: `Updated meeting resolution: ${data.title}`,
        outcome: 'success',
        severity: 'low',
        details: updates
      })

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to update meeting resolution', error))
    }
  }

  /**
   * Get upcoming meetings for an organization
   */
  async findUpcoming(
    organizationId: OrganizationId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<Meeting>>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Check organization permission
      const permissionResult = await this.checkOrganizationPermission(
        userResult.data,
        organizationId
      )
      if (!permissionResult.success) return permissionResult

      const now = new Date().toISOString()

      let query = this.supabase
        .from('meetings')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .gte('start_time', now)
        .order('start_time', { ascending: true })

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findUpcoming'))
      }

      return this.createPaginatedResult(data || [], count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find upcoming meetings', error))
    }
  }

  /**
   * Find a meeting by ID
   */
  private async findById(meetingId: MeetingId): Promise<Result<Meeting>> {
    try {
      const { data, error } = await this.supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      return this.createResult(data, error, 'findById')
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find meeting by ID', error))
    }
  }
}