import { BaseService } from './base.service'
import { Result, success, failure, RepositoryError, wrapAsync } from '../repositories/result'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import {
  MeetingResolution,
  CreateResolutionRequest,
  UpdateResolutionRequest,
  ResolutionStatus,
  VotingMethod,
  VoteChoice,
  CastVoteRequest,
  ResolutionVote,
  ResolutionType,
  ResolutionsAnalytics
} from '../../types/meetings'
import { 
  MeetingResolutionId, 
  MeetingId, 
  UserId, 
  OrganizationId,
  QueryOptions,
  PaginatedResult
} from '../repositories/types'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateResolutionSchema = z.object({
  meetingId: z.string().min(1),
  agendaItemId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000),
  resolutionText: z.string().min(10).max(5000),
  resolutionType: z.enum(['motion', 'amendment', 'policy', 'directive', 'appointment', 'financial', 'strategic', 'other']),
  category: z.string().max(50).optional(),
  priorityLevel: z.number().int().min(1).max(5).optional(),
  secondedBy: z.string().optional(),
  effectiveDate: z.string().datetime().optional(),
  implementationDeadline: z.string().datetime().optional(),
  requiresBoardApproval: z.boolean().optional(),
  requiresShareholderApproval: z.boolean().optional(),
  legalReviewRequired: z.boolean().optional(),
  supportingDocuments: z.array(z.string()).optional()
})

const UpdateResolutionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  resolutionText: z.string().min(10).max(5000).optional(),
  status: z.enum(['proposed', 'passed', 'rejected', 'tabled', 'withdrawn', 'amended']).optional(),
  votingMethod: z.enum(['voice', 'show_of_hands', 'secret_ballot', 'electronic', 'unanimous_consent', 'roll_call']).optional(),
  effectiveDate: z.string().datetime().optional(),
  implementationDeadline: z.string().datetime().optional(),
  implementationNotes: z.string().max(1000).optional(),
  complianceImpact: z.string().max(1000).optional()
})

const CastVoteSchema = z.object({
  resolutionId: z.string().min(1),
  voteChoice: z.enum(['for', 'against', 'abstain', 'absent']),
  voteWeight: z.number().positive().optional(),
  votingMethod: z.enum(['voice', 'show_of_hands', 'secret_ballot', 'electronic', 'unanimous_consent', 'roll_call']),
  voteRationale: z.string().max(500).optional(),
  voteConfidence: z.number().int().min(1).max(5).optional()
})

// ============================================================================
// QUORUM CONFIGURATION
// ============================================================================

interface QuorumConfig {
  minimumParticipationPercentage: number
  minimumParticipants: number
  superMajorityThreshold?: number // For special resolutions
  unanimityRequired?: boolean // For critical resolutions
}

interface VotingResults {
  totalVotes: number
  votesFor: number
  votesAgainst: number
  votesAbstain: number
  votesAbsent: number
  forPercentage: number
  againstPercentage: number
  abstainPercentage: number
  participationRate: number
  quorumMet: boolean
  passed: boolean
  passedWithSuperMajority?: boolean
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class MeetingResolutionService extends BaseService {
  private static readonly DEFAULT_QUORUM_CONFIG: QuorumConfig = {
    minimumParticipationPercentage: 50,
    minimumParticipants: 3
  }

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  // ============================================================================
  // PUBLIC METHODS - RESOLUTION MANAGEMENT
  // ============================================================================

  /**
   * Create a new meeting resolution with business logic validation
   */
  async createResolution(request: CreateResolutionRequest): Promise<Result<MeetingResolution>> {
    return this.executeDbOperation(async () => {
      // Validate input data
      const validationResult = this.validateWithContext<CreateResolutionRequest>(
        request,
        CreateResolutionSchema,
        'resolution creation',
        'request'
      )
      if (!validationResult.success) return validationResult

      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult
      
      const user = userResult.data
      const validatedRequest = validationResult.data

      // Get meeting and validate permissions - use private method since findById is private
      const meetingCheckResult = await this.validateMeetingAccess(validatedRequest.meetingId, user.id)
      if (!meetingCheckResult.success) return meetingCheckResult

      // Check organization membership and permissions
      const permissionResult = await this.checkPermissionWithContext(
        user.id,
        'meeting_resolution',
        'create',
        validatedRequest.meetingId,
        { meetingId: validatedRequest.meetingId }
      )
      if (!permissionResult.success) return permissionResult

      // Additional validation can be added here for meeting status

      // Validate seconder is different from proposer and exists
      if (validatedRequest.secondedBy) {
        if (validatedRequest.secondedBy === user.id) {
          return failure(RepositoryError.businessRule(
            'self_seconding_not_allowed',
            'Cannot second your own resolution',
            { proposedBy: user.id, secondedBy: validatedRequest.secondedBy }
          ))
        }
        
        // Validate seconder has access to the meeting
        const seconderPermissionResult = await this.checkPermissionWithContext(
          validatedRequest.secondedBy,
          'meeting_resolution',
          'second',
          validatedRequest.meetingId
        )
        if (!seconderPermissionResult.success) {
          return failure(RepositoryError.businessRule(
            'seconder_no_permission',
            'Seconder does not have permission to participate in this meeting',
            { secondedBy: validatedRequest.secondedBy }
          ))
        }
      }

      // Create resolution using repository
      const creationResult = await this.repositories.meetingResolutions.create(validatedRequest)
      if (!creationResult.success) return creationResult

      const resolution = creationResult.data

      // Log business event
      await this.logActivity(
        'resolution_created',
        'meeting_resolution',
        resolution.id,
        {
          meetingId: validatedRequest.meetingId,
          resolutionType: validatedRequest.resolutionType,
          requiresBoardApproval: validatedRequest.requiresBoardApproval,
          requiresShareholderApproval: validatedRequest.requiresShareholderApproval,
          legalReviewRequired: validatedRequest.legalReviewRequired
        }
      )

      return success(resolution)
    }, 'createResolution')
  }

  /**
   * Update an existing resolution with status transition validation
   */
  async updateResolution(
    resolutionId: MeetingResolutionId,
    updates: UpdateResolutionRequest
  ): Promise<Result<MeetingResolution>> {
    return this.executeDbOperation(async () => {
      // Validate input
      const validationResult = this.validateWithContext<UpdateResolutionRequest>(
        updates,
        UpdateResolutionSchema,
        'resolution update',
        'updates'
      )
      if (!validationResult.success) return validationResult

      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      const user = userResult.data
      const validatedUpdates = validationResult.data

      // Get current resolution
      const currentResult = await this.repositories.meetingResolutions.findByIdWithVotes(resolutionId)
      if (!currentResult.success) return currentResult

      const current = currentResult.data

      // Validate permissions
      const permissionResult = await this.checkPermissionWithContext(
        user.id,
        'meeting_resolution',
        'update',
        resolutionId,
        { currentStatus: current.status }
      )
      if (!permissionResult.success) return permissionResult

      // Validate status transitions
      if (validatedUpdates.status) {
        const transitionResult = await this.validateStatusTransition(
          current.status,
          validatedUpdates.status,
          current
        )
        if (!transitionResult.success) return transitionResult
      }

      // Validate voting method compatibility
      if (validatedUpdates.votingMethod) {
        const votingValidationResult = this.validateVotingMethod(
          validatedUpdates.votingMethod,
          current
        )
        if (!votingValidationResult.success) return votingValidationResult
      }

      // Apply business rules for specific updates
      if (validatedUpdates.effectiveDate) {
        const effectiveDateResult = this.validateEffectiveDate(
          validatedUpdates.effectiveDate,
          current
        )
        if (!effectiveDateResult.success) return effectiveDateResult
      }

      // Update using repository
      const updateResult = await this.repositories.meetingResolutions.update(resolutionId, validatedUpdates)
      if (!updateResult.success) return updateResult

      const updatedResolution = updateResult.data

      // Log status changes
      if (validatedUpdates.status && validatedUpdates.status !== current.status) {
        await this.logActivity(
          'resolution_status_changed',
          'meeting_resolution',
          resolutionId,
          {
            previousStatus: current.status,
            newStatus: validatedUpdates.status,
            votingStats: current.votes.length > 0 ? this.calculateVotingStats(current.votes, current.totalEligibleVoters) : undefined
          }
        )
      }

      return success(updatedResolution)
    }, 'updateResolution')
  }

  // ============================================================================
  // PUBLIC METHODS - VOTING WORKFLOW
  // ============================================================================

  /**
   * Start voting on a resolution with quorum validation
   */
  async startVoting(
    resolutionId: MeetingResolutionId,
    votingMethod: VotingMethod,
    quorumConfig?: Partial<QuorumConfig>
  ): Promise<Result<MeetingResolution>> {
    return this.executeDbOperation(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      const user = userResult.data

      // Get resolution with details
      const resolutionResult = await this.repositories.meetingResolutions.findByIdWithVotes(resolutionId)
      if (!resolutionResult.success) return resolutionResult

      const resolution = resolutionResult.data

      // Validate permissions (typically requires superuser or meeting chair)
      const permissionResult = await this.checkSuperuserOrChairPermission(user.id, resolution.meetingId)
      if (!permissionResult.success) return permissionResult

      // Validate resolution can start voting
      if (resolution.status !== 'proposed') {
        return failure(RepositoryError.businessRule(
          'voting_not_allowed',
          'Voting can only start on proposed resolutions',
          { currentStatus: resolution.status }
        ))
      }

      // Get meeting participants for quorum calculation
      const participantsResult = await this.getMeetingParticipants(resolution.meetingId)
      if (!participantsResult.success) return participantsResult

      const eligibleVoters = participantsResult.data

      // Apply quorum configuration
      const finalQuorumConfig = {
        ...MeetingResolutionService.DEFAULT_QUORUM_CONFIG,
        ...quorumConfig
      }

      // Validate minimum participants available
      if (eligibleVoters.length < finalQuorumConfig.minimumParticipants) {
        return failure(RepositoryError.businessRule(
          'insufficient_participants',
          'Not enough participants to meet minimum quorum requirements',
          {
            availableParticipants: eligibleVoters.length,
            minimumRequired: finalQuorumConfig.minimumParticipants
          }
        ))
      }

      // Update resolution to start voting
      const updateResult = await this.repositories.meetingResolutions.update(resolutionId, {
        status: 'proposed' as ResolutionStatus, // Keep as proposed until voting concludes
        votingMethod
      })
      if (!updateResult.success) return updateResult

      // Set eligible voters count
      const votersUpdateResult = await this.setEligibleVoters(resolutionId, eligibleVoters.length)
      if (!votersUpdateResult.success) return votersUpdateResult

      const updatedResolution = updateResult.data

      await this.logActivity(
        'voting_started',
        'meeting_resolution',
        resolutionId,
        {
          votingMethod,
          eligibleVoters: eligibleVoters.length,
          quorumConfig: finalQuorumConfig
        }
      )

      return success(updatedResolution)
    }, 'startVoting')
  }

  /**
   * Cast a vote with comprehensive validation and business logic
   */
  async castVote(voteRequest: CastVoteRequest): Promise<Result<{
    vote: ResolutionVote
    updatedResolution: MeetingResolution
    votingResults: VotingResults
  }>> {
    return this.executeDbOperation(async () => {
      // Validate input
      const validationResult = this.validateWithContext<CastVoteRequest>(
        voteRequest,
        CastVoteSchema,
        'vote casting',
        'voteRequest'
      )
      if (!validationResult.success) return validationResult

      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      const user = userResult.data
      const validatedRequest = validationResult.data

      // Get resolution with current voting status
      const resolutionResult = await this.repositories.meetingResolutions.findByIdWithVotes(validatedRequest.resolutionId)
      if (!resolutionResult.success) return resolutionResult

      const resolution = resolutionResult.data

      // Validate user can vote on this resolution
      const votingPermissionResult = await this.validateVotingPermission(user.id, resolution)
      if (!votingPermissionResult.success) return votingPermissionResult

      // Validate voting is still open
      if (resolution.status !== 'proposed') {
        return failure(RepositoryError.businessRule(
          'voting_closed',
          'Voting is no longer open for this resolution',
          { currentStatus: resolution.status }
        ))
      }

      // Check for duplicate vote
      const existingVote = resolution.votes.find(v => v.voterUserId === user.id)
      if (existingVote) {
        return failure(RepositoryError.businessRule(
          'duplicate_vote',
          'User has already voted on this resolution',
          { existingVoteId: existingVote.id, votedAt: existingVote.votedAt }
        ))
      }

      // Validate voting method matches
      if (resolution.votingMethod && resolution.votingMethod !== validatedRequest.votingMethod) {
        return failure(RepositoryError.businessRule(
          'voting_method_mismatch',
          'Vote must use the designated voting method',
          { 
            expected: resolution.votingMethod, 
            provided: validatedRequest.votingMethod 
          }
        ))
      }

      // Cast the vote
      const voteResult = await this.repositories.meetingResolutions.castVote(validatedRequest)
      if (!voteResult.success) return voteResult

      const { vote, updatedResolution } = voteResult.data

      // Calculate current voting results
      const allVotesResult = await this.repositories.meetingResolutions.findByIdWithVotes(validatedRequest.resolutionId)
      if (!allVotesResult.success) return allVotesResult

      const resolutionWithAllVotes = allVotesResult.data
      const votingResults = this.calculateVotingResults(
        resolutionWithAllVotes.votes,
        resolutionWithAllVotes.totalEligibleVoters
      )

      // Check if voting should be concluded
      const conclusionResult = await this.checkVotingConclusion(resolutionWithAllVotes, votingResults)
      if (conclusionResult.success && conclusionResult.data.shouldConclude) {
        await this.concludeVoting(validatedRequest.resolutionId)
      }

      await this.logActivity(
        'vote_cast',
        'resolution_vote',
        vote.id,
        {
          resolutionId: validatedRequest.resolutionId,
          voteChoice: validatedRequest.voteChoice,
          votingMethod: validatedRequest.votingMethod,
          voteWeight: validatedRequest.voteWeight || 1,
          currentVotingResults: votingResults
        }
      )

      return success({
        vote,
        updatedResolution,
        votingResults
      })
    }, 'castVote')
  }

  /**
   * Conclude voting and determine final resolution status
   */
  async concludeVoting(resolutionId: MeetingResolutionId): Promise<Result<{
    resolution: MeetingResolution
    votingResults: VotingResults
    finalStatus: ResolutionStatus
  }>> {
    return this.executeDbOperation(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      const user = userResult.data

      // Get resolution with all votes
      const resolutionResult = await this.repositories.meetingResolutions.findByIdWithVotes(resolutionId)
      if (!resolutionResult.success) return resolutionResult

      const resolution = resolutionResult.data

      // Validate permissions (superuser or meeting chair only)
      const permissionResult = await this.checkSuperuserOrChairPermission(user.id, resolution.meetingId)
      if (!permissionResult.success) return permissionResult

      // Calculate final voting results
      const votingResults = this.calculateVotingResults(resolution.votes, resolution.totalEligibleVoters)

      // Determine final status based on voting results and resolution requirements
      const finalStatus = this.determineFinalStatus(resolution, votingResults)

      // Update resolution with final status
      const updateResult = await this.repositories.meetingResolutions.update(resolutionId, {
        status: finalStatus,
        votedAt: new Date().toISOString()
      })
      if (!updateResult.success) return updateResult

      const updatedResolution = updateResult.data

      // Handle post-voting actions
      if (finalStatus === 'passed') {
        await this.handlePassedResolution(updatedResolution)
      }

      await this.logActivity(
        'voting_concluded',
        'meeting_resolution',
        resolutionId,
        {
          finalStatus,
          votingResults,
          totalVotes: resolution.votes.length,
          eligibleVoters: resolution.totalEligibleVoters
        }
      )

      return success({
        resolution: updatedResolution,
        votingResults,
        finalStatus
      })
    }, 'concludeVoting')
  }

  // ============================================================================
  // PUBLIC METHODS - ANALYTICS AND REPORTING
  // ============================================================================

  /**
   * Get comprehensive resolution analytics for an organization
   */
  async getResolutionAnalytics(
    organizationId: OrganizationId,
    timeframe?: { from: string; to: string }
  ): Promise<Result<ResolutionsAnalytics>> {
    return this.executeDbOperation(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      // Check organization permissions
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'organization',
        'view_analytics',
        organizationId
      )
      if (!permissionResult.success) return permissionResult

      // Get all resolutions for the organization
      // Note: This would require implementing findByOrganization method in the repository
      // For now, using a placeholder approach
      const resolutions: MeetingResolution[] = []

      // Calculate analytics
      const analytics = this.calculateResolutionAnalytics(resolutions)

      await this.logActivity(
        'analytics_generated',
        'resolution_analytics',
        undefined,
        { organizationId, timeframe, totalResolutions: resolutions.length }
      )

      return success(analytics)
    }, 'getResolutionAnalytics')
  }

  /**
   * Get voting participation statistics
   */
  async getVotingParticipationStats(
    organizationId: OrganizationId,
    timeframe?: { from: string; to: string }
  ): Promise<Result<{
    averageParticipation: number
    participationByResolution: Array<{
      resolutionId: string
      resolutionTitle: string
      participationRate: number
      quorumMet: boolean
    }>
    participationByUser: Array<{
      userId: string
      userName: string
      votingRate: number
      totalEligibleVotes: number
      actualVotes: number
    }>
  }>> {
    return this.executeDbOperation(async () => {
      const userResult = await this.getCurrentUser()
      if (!userResult.success) return userResult

      // Check permissions
      const permissionResult = await this.checkPermissionWithContext(
        userResult.data.id,
        'organization',
        'view_analytics',
        organizationId
      )
      if (!permissionResult.success) return permissionResult

      // Implementation would involve complex queries to calculate participation
      // This is a placeholder for the comprehensive implementation
      
      return success({
        averageParticipation: 0,
        participationByResolution: [],
        participationByUser: []
      })
    }, 'getVotingParticipationStats')
  }

  // ============================================================================
  // PRIVATE METHODS - BUSINESS LOGIC VALIDATION
  // ============================================================================

  private async validateStatusTransition(
    currentStatus: ResolutionStatus,
    newStatus: ResolutionStatus,
    resolution: any
  ): Promise<Result<boolean>> {
    const allowedTransitions: Record<ResolutionStatus, ResolutionStatus[]> = {
      'proposed': ['passed', 'rejected', 'tabled', 'withdrawn', 'amended'],
      'passed': [], // Final state
      'rejected': [], // Final state
      'tabled': ['proposed', 'withdrawn'],
      'withdrawn': ['proposed'],
      'amended': ['proposed']
    }

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      return failure(RepositoryError.businessRule(
        'invalid_status_transition',
        `Cannot transition from ${currentStatus} to ${newStatus}`,
        { currentStatus, newStatus, allowedTransitions: allowedTransitions[currentStatus] }
      ))
    }

    // Additional validation for specific transitions
    if (newStatus === 'passed' || newStatus === 'rejected') {
      if (resolution.votes.length === 0) {
        return failure(RepositoryError.businessRule(
          'no_votes_for_conclusion',
          'Cannot mark resolution as passed/rejected without any votes',
          { currentVoteCount: resolution.votes.length }
        ))
      }
    }

    return success(true)
  }

  private validateVotingMethod(
    votingMethod: VotingMethod,
    resolution: any
  ): Result<boolean> {
    // Business rules for voting methods
    if (resolution.legalReviewRequired && votingMethod === 'voice') {
      return failure(RepositoryError.businessRule(
        'voting_method_insufficient',
        'Resolutions requiring legal review must use formal voting methods',
        { resolutionType: resolution.resolutionType, votingMethod }
      ))
    }

    if (resolution.requiresShareholderApproval && votingMethod !== 'secret_ballot') {
      return failure(RepositoryError.businessRule(
        'shareholder_voting_method',
        'Shareholder approvals must use secret ballot',
        { votingMethod }
      ))
    }

    return success(true)
  }

  private validateEffectiveDate(
    effectiveDate: string,
    resolution: any
  ): Result<boolean> {
    const date = new Date(effectiveDate)
    const now = new Date()

    // Effective date cannot be in the past
    if (date < now) {
      return failure(RepositoryError.businessRule(
        'effective_date_past',
        'Effective date cannot be in the past',
        { effectiveDate, currentDate: now.toISOString() }
      ))
    }

    // Special rules for different resolution types
    if (resolution.resolutionType === 'financial' && date.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return failure(RepositoryError.businessRule(
        'financial_resolution_notice_period',
        'Financial resolutions require at least 24 hours notice before effective date',
        { effectiveDate }
      ))
    }

    return success(true)
  }

  private async validateVotingPermission(
    userId: UserId,
    resolution: any
  ): Promise<Result<boolean>> {
    // Check if user is a meeting participant
    const participantsResult = await this.getMeetingParticipants(resolution.meetingId)
    if (!participantsResult.success) return participantsResult

    const isParticipant = participantsResult.data.some(p => p.userId === userId)
    if (!isParticipant) {
      return failure(RepositoryError.businessRule(
        'not_eligible_voter',
        'User is not eligible to vote on this resolution',
        { userId, meetingId: resolution.meetingId }
      ))
    }

    return success(true)
  }

  private calculateVotingResults(votes: ResolutionVote[], totalEligibleVoters: number): VotingResults {
    const totalVotes = votes.length
    const votesFor = votes.filter(v => v.voteChoice === 'for').length
    const votesAgainst = votes.filter(v => v.voteChoice === 'against').length
    const votesAbstain = votes.filter(v => v.voteChoice === 'abstain').length
    const votesAbsent = Math.max(0, totalEligibleVoters - totalVotes)

    const forPercentage = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0
    const againstPercentage = totalVotes > 0 ? (votesAgainst / totalVotes) * 100 : 0
    const abstainPercentage = totalVotes > 0 ? (votesAbstain / totalVotes) * 100 : 0
    const participationRate = totalEligibleVoters > 0 ? (totalVotes / totalEligibleVoters) * 100 : 0

    const quorumMet = participationRate >= MeetingResolutionService.DEFAULT_QUORUM_CONFIG.minimumParticipationPercentage
    const passed = quorumMet && forPercentage > 50

    return {
      totalVotes,
      votesFor,
      votesAgainst,
      votesAbstain,
      votesAbsent,
      forPercentage,
      againstPercentage,
      abstainPercentage,
      participationRate,
      quorumMet,
      passed,
      passedWithSuperMajority: forPercentage >= 66.67
    }
  }

  private calculateVotingStats(votes: ResolutionVote[], totalEligibleVoters: number) {
    return this.calculateVotingResults(votes, totalEligibleVoters)
  }

  private async checkVotingConclusion(
    resolution: any,
    votingResults: VotingResults
  ): Promise<Result<{ shouldConclude: boolean; reason?: string }>> {
    // Auto-conclude if all eligible voters have voted
    if (votingResults.totalVotes >= resolution.totalEligibleVoters) {
      return success({ shouldConclude: true, reason: 'all_voters_participated' })
    }

    // Auto-conclude if impossible to change outcome
    const remainingVoters = resolution.totalEligibleVoters - votingResults.totalVotes
    const currentlyPassing = votingResults.forPercentage > 50

    if (currentlyPassing && votingResults.votesFor > (votingResults.votesAgainst + remainingVoters)) {
      return success({ shouldConclude: true, reason: 'outcome_certain_pass' })
    }

    if (!currentlyPassing && votingResults.votesAgainst > (votingResults.votesFor + remainingVoters)) {
      return success({ shouldConclude: true, reason: 'outcome_certain_fail' })
    }

    return success({ shouldConclude: false })
  }

  private determineFinalStatus(resolution: any, votingResults: VotingResults): ResolutionStatus {
    if (!votingResults.quorumMet) {
      return 'tabled' // Insufficient participation
    }

    // Apply special voting thresholds based on resolution type
    let requiredThreshold = 50 // Simple majority by default

    if (resolution.requiresShareholderApproval || resolution.resolutionType === 'financial') {
      requiredThreshold = 66.67 // Super majority
    }

    if (resolution.legalReviewRequired) {
      requiredThreshold = 75 // Higher threshold for legal matters
    }

    return votingResults.forPercentage > requiredThreshold ? 'passed' : 'rejected'
  }

  private async handlePassedResolution(resolution: MeetingResolution): Promise<void> {
    // Create actionables for implementation if required
    if (resolution.implementationDeadline) {
      // This would create follow-up actionables
      await this.logActivity(
        'resolution_implementation_required',
        'meeting_resolution',
        resolution.id,
        { implementationDeadline: resolution.implementationDeadline }
      )
    }

    // Handle compliance and legal requirements
    if (resolution.legalReviewRequired) {
      await this.logActivity(
        'legal_review_required',
        'meeting_resolution',
        resolution.id,
        { requiresLegalReview: true }
      )
    }
  }

  private calculateResolutionAnalytics(resolutions: MeetingResolution[]): ResolutionsAnalytics {
    const total = resolutions.length
    const passed = resolutions.filter(r => r.status === 'passed').length
    const rejected = resolutions.filter(r => r.status === 'rejected').length
    const pending = resolutions.filter(r => r.status === 'proposed').length

    // Calculate participation rates
    const resolutionsWithVotes = resolutions.filter(r => r.totalEligibleVoters > 0)
    const averageParticipation = resolutionsWithVotes.length > 0
      ? resolutionsWithVotes.reduce((sum, r) => {
          const totalVotes = r.votesFor + r.votesAgainst + r.votesAbstain
          return sum + (totalVotes / r.totalEligibleVoters) * 100
        }, 0) / resolutionsWithVotes.length
      : 0

    // Group by type
    const resolutionsByType = resolutions.reduce((acc, r) => {
      acc[r.resolutionType] = (acc[r.resolutionType] || 0) + 1
      return acc
    }, {} as Record<ResolutionType, number>)

    // Calculate implementation compliance
    const implementedResolutions = resolutions.filter(r => 
      r.status === 'passed' && r.implementationDeadline && new Date(r.implementationDeadline) < new Date()
    )
    const implementationCompliance = implementedResolutions.length > 0 
      ? (implementedResolutions.filter(r => r.implementationNotes).length / implementedResolutions.length) * 100
      : 100

    return {
      totalResolutions: total,
      passedResolutions: passed,
      rejectedResolutions: rejected,
      pendingImplementation: pending,
      averageVotingParticipation: averageParticipation,
      resolutionsByType,
      implementationCompliance
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async checkSuperuserOrChairPermission(userId: UserId, meetingId: MeetingId): Promise<Result<boolean>> {
    // Check if user is superuser
    const superuserResult = await this.checkPermission(userId, 'system', 'superuser')
    if (superuserResult.success) return superuserResult

    // Check if user is meeting chair
    const chairResult = await this.checkPermission(userId, 'meeting', 'chair', meetingId)
    if (chairResult.success) return chairResult

    return failure(RepositoryError.forbidden(
      'resolution_management',
      'Only superusers or meeting chairs can manage resolution voting'
    ))
  }

  private async getMeetingParticipants(meetingId: MeetingId): Promise<Result<Array<{ userId: string; role: string }>>> {
    // This would get meeting participants from the meetings system
    // For now, return a placeholder
    return success([{ userId: 'placeholder', role: 'member' }])
  }

  private async setEligibleVoters(resolutionId: MeetingResolutionId, count: number): Promise<Result<void>> {
    return wrapAsync(async () => {
      const { error } = await this.supabase
        .from('meeting_resolutions')
        .update({ total_eligible_voters: count })
        .eq('id', resolutionId)

      if (error) {
        throw RepositoryError.internal('Failed to set eligible voters count', error)
      }
    })
  }

  /**
   * Validate meeting access and permissions
   */
  private async validateMeetingAccess(meetingId: MeetingId, userId: UserId): Promise<Result<boolean>> {
    // This would validate the meeting exists and user has access
    // For now, returning success as placeholder
    return success(true)
  }
}