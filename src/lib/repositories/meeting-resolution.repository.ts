import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import {
  QueryOptions,
  PaginatedResult,
  UserId,
  OrganizationId,
  MeetingId,
  MeetingResolutionId,
  createMeetingResolutionId
} from './types'
import { Database } from '../../types/database'
import { 
  MeetingResolution,
  CreateResolutionRequest,
  UpdateResolutionRequest,
  ResolutionStatus,
  VotingMethod,
  VoteChoice,
  CastVoteRequest,
  ResolutionVote
} from '../../types/meetings'

// Database types from schema
type MeetingResolutionRow = Database['public']['Tables']['meeting_resolutions']['Row']
type MeetingResolutionInsert = Database['public']['Tables']['meeting_resolutions']['Insert']
type MeetingResolutionUpdate = Database['public']['Tables']['meeting_resolutions']['Update']

// Extended interface for resolution with complete data
export interface ResolutionWithDetails extends MeetingResolution {
  votes: ResolutionVote[]
  votingParticipation: number
  proposerName?: string
  seconderName?: string
}

export interface VotingStats {
  totalVotes: number
  forPercentage: number
  againstPercentage: number
  abstainPercentage: number
  participationRate: number
}

export class MeetingResolutionRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'MeetingResolution'
  }

  protected getSearchFields(): string[] {
    return ['resolution_title', 'resolution_text']
  }

  protected getTableName(): string {
    return 'meeting_resolutions'
  }

  /**
   * Find all resolutions for a meeting
   */
  async findByMeeting(
    meetingId: MeetingId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<MeetingResolution>>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // First get the meeting to check organization permissions
      const meetingResult = await this.getMeetingWithOrgCheck(meetingId, userResult.data)
      if (!meetingResult.success) return meetingResult

      let query = this.supabase
        .from('meeting_resolutions')
        .select('*', { count: 'exact' })
        .eq('meeting_id', meetingId)

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findByMeeting'))
      }

      // Transform database rows to domain objects
      const resolutions = (data || []).map(this.transformToDomain)

      return this.createPaginatedResult(resolutions, count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find resolutions by meeting', error))
    }
  }

  /**
   * Find a resolution by ID with full details including votes
   */
  async findByIdWithVotes(resolutionId: MeetingResolutionId): Promise<Result<ResolutionWithDetails>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get resolution with related data
      const { data: resolutionData, error: resolutionError } = await this.supabase
        .from('meeting_resolutions')
        .select(`
          *,
          proposer:proposed_by(full_name),
          seconder:seconded_by(full_name)
        `)
        .eq('id', resolutionId)
        .single()

      if (resolutionError) {
        return failure(RepositoryError.fromSupabaseError(resolutionError, 'findByIdWithVotes'))
      }

      // Check organization permissions via meeting
      const meetingResult = await this.getMeetingWithOrgCheck(resolutionData.meeting_id, userResult.data)
      if (!meetingResult.success) return meetingResult

      // Get votes for this resolution
      const { data: votesData, error: votesError } = await this.supabase
        .from('resolution_votes')
        .select(`
          *,
          voter:voter_user_id(full_name, email)
        `)
        .eq('resolution_id', resolutionId)
        .order('voted_at', { ascending: true })

      if (votesError) {
        return failure(RepositoryError.fromSupabaseError(votesError, 'get resolution votes'))
      }

      // Transform to domain object with votes
      const resolution = this.transformToDomain(resolutionData)
      const votes = (votesData || []).map(this.transformVoteToDomain)
      
      // Calculate voting participation
      const totalEligibleVoters = resolution.totalEligibleVoters
      const actualVotes = votes.length
      const votingParticipation = totalEligibleVoters > 0 ? (actualVotes / totalEligibleVoters) * 100 : 0

      const resolutionWithDetails: ResolutionWithDetails = {
        ...resolution,
        votes,
        votingParticipation,
        proposerName: resolutionData.proposer?.full_name,
        seconderName: resolutionData.seconder?.full_name
      }

      return success(resolutionWithDetails)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find resolution with votes', error))
    }
  }

  /**
   * Create a new resolution
   */
  async create(
    requestData: CreateResolutionRequest
  ): Promise<Result<MeetingResolution>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Validate required fields
      const validationResult = this.validateRequired(requestData, [
        'meetingId', 'title', 'resolutionText', 'resolutionType'
      ])
      if (!validationResult.success) return validationResult

      // Check meeting exists and user has permissions
      const meetingResult = await this.getMeetingWithOrgCheck(requestData.meetingId, userResult.data)
      if (!meetingResult.success) return meetingResult

      return await this.withTransaction([
        async () => {
          // Generate resolution number
          const resolutionNumber = await this.generateResolutionNumber(
            requestData.meetingId, 
            new Date().getFullYear()
          )

          if (!resolutionNumber.success) return resolutionNumber

          // Create the resolution
          const insertData: MeetingResolutionInsert = {
            meeting_id: requestData.meetingId,
            resolution_title: requestData.title,
            resolution_text: requestData.resolutionText,
            resolution_type: requestData.resolutionType,
            category: requestData.category,
            priority_level: requestData.priorityLevel || 3,
            proposed_by: userResult.data,
            seconded_by: requestData.secondedBy,
            status: 'proposed' as ResolutionStatus,
            effective_date: requestData.effectiveDate,
            implementation_deadline: requestData.implementationDeadline,
            requires_board_approval: requestData.requiresBoardApproval || false,
            requires_shareholder_approval: requestData.requiresShareholderApproval || false,
            legal_review_required: requestData.legalReviewRequired || false,
            supporting_documents: requestData.supportingDocuments || [],
            resolution_number: resolutionNumber.data,
            votes_for: 0,
            votes_against: 0,
            votes_abstain: 0,
            total_eligible_voters: 0, // Will be updated when voting starts
            discussion_duration_minutes: 0,
            amendments_proposed: 0,
            was_amended: false,
            proposed_at: new Date().toISOString()
          }

          const { data, error } = await this.supabase
            .from('meeting_resolutions')
            .insert(insertData)
            .select()
            .single()

          if (error) {
            throw RepositoryError.fromSupabaseError(error, 'create resolution')
          }

          // Log activity
          await this.logActivity({
            user_id: userResult.data,
            organization_id: meetingResult.data.organization_id,
            event_type: 'resolution.created',
            event_category: 'governance',
            action: 'create',
            resource_type: 'meeting_resolution',
            resource_id: data.id,
            event_description: `Created resolution: ${data.resolution_title}`,
            outcome: 'success',
            severity: 'medium',
            details: {
              meeting_id: requestData.meetingId,
              resolution_type: requestData.resolutionType,
              resolution_number: resolutionNumber.data
            }
          })

          return success(this.transformToDomain(data))
        }
      ])
        .then(results => results.success ? success(results.data[0]) : results)
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to create resolution', error))
    }
  }

  /**
   * Update a resolution
   */
  async update(
    resolutionId: MeetingResolutionId,
    updates: UpdateResolutionRequest
  ): Promise<Result<MeetingResolution>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get current resolution
      const currentResult = await this.findById(resolutionId)
      if (!currentResult.success) return currentResult

      const current = currentResult.data

      // Check permissions via meeting
      const meetingResult = await this.getMeetingWithOrgCheck(current.meetingId, userResult.data)
      if (!meetingResult.success) return meetingResult

      // Check if resolution can be updated (business rules)
      if (current.status === 'passed' || current.status === 'rejected') {
        return failure(RepositoryError.businessRule(
          'resolution_update_forbidden',
          'Cannot update a resolution that has already been voted on',
          { current_status: current.status }
        ))
      }

      // Use optimistic locking for concurrent updates
      return await this.withOptimisticLock(
        { id: resolutionId, version: current.version || 0 },
        async (lock) => {
          const updateData: MeetingResolutionUpdate = {
            resolution_title: updates.title,
            resolution_text: updates.resolutionText,
            status: updates.status,
            voting_method: updates.votingMethod,
            effective_date: updates.effectiveDate,
            implementation_deadline: updates.implementationDeadline,
            implementation_notes: updates.implementationNotes,
            compliance_impact: updates.complianceImpact,
            updated_at: new Date().toISOString(),
            version: (current.version || 0) + 1
          }

          // Remove undefined values
          Object.keys(updateData).forEach(key => {
            if (updateData[key as keyof typeof updateData] === undefined) {
              delete updateData[key as keyof typeof updateData]
            }
          })

          const { data, error } = await this.supabase
            .from('meeting_resolutions')
            .update(updateData)
            .eq('id', resolutionId)
            .eq('version', current.version || 0) // Optimistic locking check
            .select()
            .single()

          if (error) {
            if (error.code === 'PGRST116') { // No rows updated - version conflict
              throw RepositoryError.conflict(
                'resolution',
                'Resolution was modified by another user',
                { expected_version: current.version, resolution_id: resolutionId }
              )
            }
            throw RepositoryError.fromSupabaseError(error, 'update resolution')
          }

          // Log activity
          await this.logActivity({
            user_id: userResult.data,
            organization_id: meetingResult.data.organization_id,
            event_type: 'resolution.updated',
            event_category: 'governance',
            action: 'update',
            resource_type: 'meeting_resolution',
            resource_id: resolutionId,
            event_description: `Updated resolution: ${data.resolution_title}`,
            outcome: 'success',
            severity: 'low',
            details: {
              changes: updates,
              previous_version: current.version
            }
          })

          return success(this.transformToDomain(data))
        }
      )
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to update resolution', error))
    }
  }

  /**
   * Cast a vote on a resolution with transaction support
   */
  async castVote(
    voteRequest: CastVoteRequest
  ): Promise<Result<{ vote: ResolutionVote; updatedResolution: MeetingResolution }>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      // Get resolution and validate voting is allowed
      const resolutionResult = await this.findById(voteRequest.resolutionId)
      if (!resolutionResult.success) return resolutionResult

      const resolution = resolutionResult.data

      // Check permissions via meeting
      const meetingResult = await this.getMeetingWithOrgCheck(resolution.meetingId, userResult.data)
      if (!meetingResult.success) return meetingResult

      // Validate voting is allowed
      if (resolution.status !== 'proposed') {
        return failure(RepositoryError.businessRule(
          'voting_not_allowed',
          'Voting is only allowed on proposed resolutions',
          { current_status: resolution.status }
        ))
      }

      // Use transaction to ensure vote and resolution update are atomic
      return await this.withTransaction([
        async () => {
          // Check if user already voted
          const { data: existingVote } = await this.supabase
            .from('resolution_votes')
            .select('id')
            .eq('resolution_id', voteRequest.resolutionId)
            .eq('voter_user_id', userResult.data)
            .single()

          if (existingVote) {
            throw RepositoryError.conflict(
              'vote',
              'User has already voted on this resolution',
              { existing_vote_id: existingVote.id }
            )
          }

          // Insert the vote
          const voteData = {
            resolution_id: voteRequest.resolutionId,
            voter_user_id: userResult.data,
            vote_choice: voteRequest.voteChoice,
            vote_weight: voteRequest.voteWeight || 1,
            voting_method: voteRequest.votingMethod,
            vote_rationale: voteRequest.voteRationale,
            vote_confidence: voteRequest.voteConfidence,
            voted_at: new Date().toISOString()
          }

          const { data: vote, error: voteError } = await this.supabase
            .from('resolution_votes')
            .insert(voteData)
            .select()
            .single()

          if (voteError) {
            throw RepositoryError.fromSupabaseError(voteError, 'cast vote')
          }

          // Update resolution vote counts
          const voteIncrement = voteRequest.voteWeight || 1
          let updateField: string
          
          switch (voteRequest.voteChoice) {
            case 'for':
              updateField = 'votes_for'
              break
            case 'against':
              updateField = 'votes_against'
              break
            case 'abstain':
              updateField = 'votes_abstain'
              break
            default:
              throw RepositoryError.validation('Invalid vote choice', { choice: voteRequest.voteChoice })
          }

          const { data: updatedResolution, error: updateError } = await this.supabase
            .from('meeting_resolutions')
            .update({
              [updateField]: resolution[updateField as keyof MeetingResolution] + voteIncrement,
              voted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', voteRequest.resolutionId)
            .select()
            .single()

          if (updateError) {
            throw RepositoryError.fromSupabaseError(updateError, 'update vote counts')
          }

          // Log activity
          await this.logActivity({
            user_id: userResult.data,
            organization_id: meetingResult.data.organization_id,
            event_type: 'resolution.vote_cast',
            event_category: 'governance',
            action: 'create',
            resource_type: 'resolution_vote',
            resource_id: vote.id,
            event_description: `Cast ${voteRequest.voteChoice} vote on resolution: ${resolution.title}`,
            outcome: 'success',
            severity: 'medium',
            details: {
              resolution_id: voteRequest.resolutionId,
              vote_choice: voteRequest.voteChoice,
              vote_weight: voteIncrement
            }
          })

          return success({
            vote: this.transformVoteToDomain(vote),
            updatedResolution: this.transformToDomain(updatedResolution)
          })
        }
      ])
        .then(results => results.success ? success(results.data[0]) : results)
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to cast vote', error))
    }
  }

  /**
   * Get voting statistics for a resolution
   */
  async getVotingStats(resolutionId: MeetingResolutionId): Promise<Result<VotingStats>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const resolutionResult = await this.findById(resolutionId)
      if (!resolutionResult.success) return resolutionResult

      const resolution = resolutionResult.data

      // Check permissions
      const meetingResult = await this.getMeetingWithOrgCheck(resolution.meetingId, userResult.data)
      if (!meetingResult.success) return meetingResult

      const totalVotes = resolution.votesFor + resolution.votesAgainst + resolution.votesAbstain
      const eligibleVoters = resolution.totalEligibleVoters

      const stats: VotingStats = {
        totalVotes,
        forPercentage: totalVotes > 0 ? (resolution.votesFor / totalVotes) * 100 : 0,
        againstPercentage: totalVotes > 0 ? (resolution.votesAgainst / totalVotes) * 100 : 0,
        abstainPercentage: totalVotes > 0 ? (resolution.votesAbstain / totalVotes) * 100 : 0,
        participationRate: eligibleVoters > 0 ? (totalVotes / eligibleVoters) * 100 : 0
      }

      return success(stats)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get voting stats', error))
    }
  }

  /**
   * Generate auto-numbered resolution identifier
   */
  private async generateResolutionNumber(
    meetingId: MeetingId,
    year: number
  ): Promise<Result<string>> {
    try {
      // Get count of resolutions for this year
      const { count, error } = await this.supabase
        .from('meeting_resolutions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${year}-01-01`)
        .lt('created_at', `${year + 1}-01-01`)

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'generate resolution number'))
      }

      const sequenceNumber = (count || 0) + 1
      const resolutionNumber = `R${year}-${sequenceNumber.toString().padStart(3, '0')}`

      return success(resolutionNumber)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to generate resolution number', error))
    }
  }

  /**
   * Helper to get meeting and check organization permissions
   */
  private async getMeetingWithOrgCheck(
    meetingId: MeetingId,
    userId: UserId
  ): Promise<Result<{ organization_id: string }>> {
    const { data: meeting, error } = await this.supabase
      .from('meetings')
      .select('organization_id')
      .eq('id', meetingId)
      .single()

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'get meeting'))
    }

    const permissionResult = await this.checkOrganizationPermission(
      userId,
      meeting.organization_id
    )
    if (!permissionResult.success) return permissionResult

    return success(meeting)
  }

  /**
   * Get resolution by ID (internal method)
   */
  private async findById(resolutionId: MeetingResolutionId): Promise<Result<MeetingResolution>> {
    try {
      const { data, error } = await this.supabase
        .from('meeting_resolutions')
        .select('*')
        .eq('id', resolutionId)
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'findById'))
      }

      return success(this.transformToDomain(data))
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find resolution by ID', error))
    }
  }

  /**
   * Transform database row to domain object
   */
  private transformToDomain(row: MeetingResolutionRow): MeetingResolution {
    return {
      id: row.id,
      meetingId: row.meeting_id,
      resolutionNumber: row.resolution_number || undefined,
      title: row.resolution_title,
      description: '', // Not in current schema, may need to add
      resolutionText: row.resolution_text,
      resolutionType: row.resolution_type as any,
      category: row.category || undefined,
      priorityLevel: (row.priority_level as 1 | 2 | 3 | 4 | 5) || 3,
      proposedBy: row.proposed_by,
      secondedBy: row.seconded_by || undefined,
      status: row.status as ResolutionStatus,
      votingMethod: row.voting_method as VotingMethod || undefined,
      votesFor: row.votes_for || 0,
      votesAgainst: row.votes_against || 0,
      votesAbstain: row.votes_abstain || 0,
      totalEligibleVoters: row.total_eligible_voters || 0,
      effectiveDate: row.effective_date || undefined,
      expiryDate: undefined, // Not in current schema
      implementationDeadline: row.implementation_deadline || undefined,
      implementationNotes: row.implementation_notes || undefined,
      requiresBoardApproval: row.requires_board_approval || false,
      requiresShareholderApproval: row.requires_shareholder_approval || false,
      legalReviewRequired: row.legal_review_required || false,
      complianceImpact: row.compliance_impact || undefined,
      supportingDocuments: (row.supporting_documents as string[]) || [],
      relatedResolutions: [], // Not in current schema
      supersedesResolutionId: undefined, // Not in current schema
      discussionDurationMinutes: row.discussion_duration_minutes || 0,
      amendmentsProposed: row.amendments_proposed || 0,
      wasAmended: row.was_amended || false,
      proposedAt: row.proposed_at || row.created_at || '',
      votedAt: row.voted_at || undefined,
      effectiveAt: row.effective_at || undefined,
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
      version: row.version || 0
    } as MeetingResolution
  }

  /**
   * Transform vote database row to domain object
   */
  private transformVoteToDomain(row: any): ResolutionVote {
    return {
      id: row.id,
      resolutionId: row.resolution_id,
      voterUserId: row.voter_user_id,
      voteChoice: row.vote_choice as VoteChoice,
      voteWeight: row.vote_weight || 1,
      votingMethod: row.voting_method as VotingMethod,
      voteOrder: row.vote_order || undefined,
      voteRationale: row.vote_rationale || undefined,
      voteConfidence: row.vote_confidence || undefined,
      votedAt: row.voted_at
    }
  }
}