import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import {
  QueryOptions,
  PaginatedResult,
  UserId,
  OrganizationId,
  MeetingId,
  MeetingVoteId,
  MeetingProxyId,
  MeetingRoleId,
  VotingSessionId,
  createMeetingVoteId
} from './types'
import { Database } from '../../types/database'
import { 
  AdvancedVote,
  CastAdvancedVoteRequest,
  MeetingProxy,
  CreateProxyRequest,
  UpdateProxyRequest,
  VotingSession,
  CreateVotingSessionRequest,
  VotingParticipationStats,
  QuorumAnalytics,
  AdvancedVotingFilters,
  ProxyFilters,
  VoteMethod,
  VoteAnonymity,
  ProxyStatus,
  SessionStatus
} from '../../types/advanced-voting'

// Database types from schema
type MeetingVoteRow = Database['public']['Tables']['meeting_votes']['Row']
type MeetingVoteInsert = Database['public']['Tables']['meeting_votes']['Insert']
type MeetingProxyRow = Database['public']['Tables']['meeting_proxies']['Row']
type MeetingProxyInsert = Database['public']['Tables']['meeting_proxies']['Insert']
type VotingSessionRow = Database['public']['Tables']['meeting_voting_sessions']['Row']
type VotingSessionInsert = Database['public']['Tables']['meeting_voting_sessions']['Insert']

// Extended interfaces for repository operations
export interface VoteWithContext extends AdvancedVote {
  voterName?: string
  proxyHolderName?: string
  roleName?: string
}

export interface ProxyWithDetails extends MeetingProxy {
  grantorName?: string
  proxyHolderName?: string
  witnessName?: string
  subProxies?: MeetingProxy[]
}

export interface VotingStatistics {
  totalVotes: number
  votesByMethod: Record<VoteMethod, number>
  votesByAnonymity: Record<VoteAnonymity, number>
  participationRate: number
  proxyUsageRate: number
  averageVotingTime: number
  confidenceDistribution: Record<number, number>
}

export interface ProxyChain {
  originalGrantor: UserId
  currentHolder: UserId
  chainPath: Array<{
    proxyId: MeetingProxyId
    grantor: UserId
    holder: UserId
    level: number
  }>
  totalWeight: number
  isValid: boolean
}

export class MeetingVotingRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'MeetingVoting'
  }

  protected getSearchFields(): string[] {
    return ['vote_rationale', 'conditions_or_amendments']
  }

  protected getTableName(): string {
    return 'meeting_votes'
  }

  // ============================================================================
  // ADVANCED VOTING OPERATIONS
  // ============================================================================

  /**
   * Cast an advanced vote with comprehensive validation
   */
  async castAdvancedVote(
    meetingId: MeetingId,
    request: CastAdvancedVoteRequest
  ): Promise<Result<VoteWithContext>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Validate meeting access
      const meetingResult = await this.getMeetingWithOrgCheck(meetingId, userId)
      if (!meetingResult.success) return meetingResult

      return await this.withTransaction([
        async () => {
          // Check for duplicate vote
          const duplicateResult = await this.checkDuplicateVote(
            meetingId, 
            userId, 
            request.resolutionId, 
            request.voteRound || 1
          )
          if (!duplicateResult.success) return duplicateResult

          // Validate proxy if applicable
          let effectiveWeight = request.voteWeight || 1
          let proxyValidation: Result<MeetingProxy | null> = success(null)
          
          if (request.proxyId) {
            proxyValidation = await this.validateProxyVoting(request.proxyId, userId)
            if (!proxyValidation.success) return proxyValidation
            
            if (proxyValidation.data) {
              effectiveWeight = proxyValidation.data.votingWeight
            }
          }

          // Get role-based voting weight if applicable
          const roleWeightResult = await this.getRoleVotingWeight(meetingId, userId)
          if (roleWeightResult.success && roleWeightResult.data > effectiveWeight) {
            effectiveWeight = roleWeightResult.data
          }

          // Generate vote hash for verification
          const voteHash = await this.generateVoteHash({
            meetingId,
            voterUserId: userId,
            voteChoice: request.voteChoice,
            timestamp: new Date().toISOString()
          })

          // Create vote record
          const voteData: MeetingVoteInsert = {
            meeting_id: meetingId,
            resolution_id: request.resolutionId,
            voter_user_id: userId,
            proxy_id: request.proxyId,
            vote_type: request.voteType,
            vote_method: request.voteMethod,
            vote_choice: request.voteChoice,
            vote_weight: effectiveWeight,
            anonymity_level: request.anonymityLevel || 'public',
            vote_round: request.voteRound || 1,
            is_final_vote: true,
            vote_rationale: request.voteRationale,
            vote_confidence: request.voteConfidence,
            conditions_or_amendments: request.conditionsOrAmendments,
            voting_as_proxy_for: request.votingAsProxyFor,
            proxy_instructions_followed: request.proxyInstructionsFollowed,
            proxy_instruction_override_reason: request.proxyInstructionOverrideReason,
            voting_device_info: request.votingDeviceInfo,
            vote_hash: voteHash,
            vote_timestamp: new Date().toISOString(),
            recorded_at: new Date().toISOString()
          }

          const { data: voteRecord, error: voteError } = await this.supabase
            .from('meeting_votes')
            .insert(voteData)
            .select(`
              *,
              voter:voter_user_id(full_name),
              proxy_holder:proxy_id(proxy_holder_user_id(full_name)),
              role:role_id(role)
            `)
            .single()

          if (voteError) {
            throw RepositoryError.fromSupabaseError(voteError, 'cast advanced vote')
          }

          // Update proxy vote count if applicable
          if (request.proxyId) {
            await this.incrementProxyVoteCount(request.proxyId)
          }

          // Log the vote activity
          await this.logActivity({
            user_id: userId,
            organization_id: meetingResult.data.organization_id,
            event_type: 'vote.cast',
            event_category: 'governance',
            action: 'create',
            resource_type: 'meeting_vote',
            resource_id: voteRecord.id,
            event_description: `Cast ${request.voteChoice} vote`,
            outcome: 'success',
            severity: 'medium',
            details: {
              meeting_id: meetingId,
              vote_method: request.voteMethod,
              anonymity_level: request.anonymityLevel,
              vote_weight: effectiveWeight,
              used_proxy: !!request.proxyId
            }
          })

          return success(this.transformVoteToDomain(voteRecord))
        }
      ])
        .then(results => results.success ? success(results.data[0]) : results)
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to cast advanced vote', error))
    }
  }

  /**
   * Find votes with advanced filtering
   */
  async findVotesWithFilters(
    filters: AdvancedVotingFilters,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<VoteWithContext>>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      let query = this.supabase
        .from('meeting_votes')
        .select(`
          *,
          voter:voter_user_id(full_name),
          proxy_holder:proxy_id(proxy_holder_user_id(full_name)),
          role:role_id(role)
        `, { count: 'exact' })

      // Apply filters
      if (filters.meetingId) {
        // Check meeting access
        const meetingResult = await this.getMeetingWithOrgCheck(filters.meetingId, userId)
        if (!meetingResult.success) return meetingResult
        
        query = query.eq('meeting_id', filters.meetingId)
      }

      if (filters.voterUserId) {
        query = query.eq('voter_user_id', filters.voterUserId)
      }

      if (filters.voteType) {
        query = query.eq('vote_type', filters.voteType)
      }

      if (filters.voteMethod) {
        query = query.eq('vote_method', filters.voteMethod)
      }

      if (filters.anonymityLevel) {
        query = query.eq('anonymity_level', filters.anonymityLevel)
      }

      if (filters.voteChoice) {
        query = query.eq('vote_choice', filters.voteChoice)
      }

      if (filters.proxyVoting !== undefined) {
        if (filters.proxyVoting) {
          query = query.not('proxy_id', 'is', null)
        } else {
          query = query.is('proxy_id', null)
        }
      }

      if (filters.dateFrom) {
        query = query.gte('vote_timestamp', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('vote_timestamp', filters.dateTo)
      }

      if (filters.confidenceLevel) {
        query = query.eq('vote_confidence', filters.confidenceLevel)
      }

      // Apply privacy filters for anonymous votes
      query = this.applyVotingPrivacyFilter(query, userId)

      // Apply query options
      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'find votes with filters'))
      }

      const votes = (data || []).map(this.transformVoteToDomain)
      return this.createPaginatedResult(votes, count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find votes with filters', error))
    }
  }

  /**
   * Get voting statistics for a meeting
   */
  async getVotingStatistics(meetingId: MeetingId): Promise<Result<VotingStatistics>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Check meeting access
      const meetingResult = await this.getMeetingWithOrgCheck(meetingId, userId)
      if (!meetingResult.success) return meetingResult

      const { data: votes, error } = await this.supabase
        .from('meeting_votes')
        .select('*')
        .eq('meeting_id', meetingId)

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'get voting statistics'))
      }

      const stats = this.calculateVotingStatistics(votes || [])
      return success(stats)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get voting statistics', error))
    }
  }

  // ============================================================================
  // PROXY VOTING OPERATIONS  
  // ============================================================================

  /**
   * Create a meeting proxy
   */
  async createProxy(request: CreateProxyRequest): Promise<Result<ProxyWithDetails>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const grantorUserId = userResult.data

      // Validate required fields
      const validationResult = this.validateRequired(request, [
        'meetingId', 'proxyHolderUserId', 'effectiveUntil'
      ])
      if (!validationResult.success) return validationResult

      // Check meeting access
      const meetingResult = await this.getMeetingWithOrgCheck(request.meetingId, grantorUserId)
      if (!meetingResult.success) return meetingResult

      // Validate proxy holder has access to the meeting
      const holderAccessResult = await this.getMeetingWithOrgCheck(request.meetingId, request.proxyHolderUserId)
      if (!holderAccessResult.success) {
        return failure(RepositoryError.businessRule(
          'proxy_holder_no_access',
          'Proxy holder must have access to the meeting',
          { proxyHolderUserId: request.proxyHolderUserId }
        ))
      }

      return await this.withTransaction([
        async () => {
          // Check for existing active proxies (will be revoked by trigger)
          const proxyData: MeetingProxyInsert = {
            meeting_id: request.meetingId,
            grantor_user_id: grantorUserId,
            proxy_holder_user_id: request.proxyHolderUserId,
            proxy_type: request.proxyType || 'general',
            status: 'active',
            voting_instructions: request.votingInstructions || {},
            scope_limitations: request.scopeLimitations || [],
            resolution_restrictions: request.resolutionRestrictions || [],
            can_sub_delegate: request.canSubDelegate || false,
            voting_weight: request.votingWeight || 1,
            max_votes_allowed: request.maxVotesAllowed,
            effective_from: request.effectiveFrom || new Date().toISOString(),
            effective_until: request.effectiveUntil,
            witness_user_id: request.witnessUserId,
            legal_document_path: request.legalDocumentPath,
            notarization_required: request.notarizationRequired || false,
            votes_cast_count: 0,
            delegation_chain_level: 1
          }

          const { data: proxy, error: proxyError } = await this.supabase
            .from('meeting_proxies')
            .insert(proxyData)
            .select(`
              *,
              grantor:grantor_user_id(full_name),
              proxy_holder:proxy_holder_user_id(full_name),
              witness:witness_user_id(full_name)
            `)
            .single()

          if (proxyError) {
            throw RepositoryError.fromSupabaseError(proxyError, 'create proxy')
          }

          // Log proxy creation
          await this.logActivity({
            user_id: grantorUserId,
            organization_id: meetingResult.data.organization_id,
            event_type: 'proxy.created',
            event_category: 'governance',
            action: 'create',
            resource_type: 'meeting_proxy',
            resource_id: proxy.id,
            event_description: `Created proxy for ${proxy.proxy_holder?.full_name}`,
            outcome: 'success',
            severity: 'medium',
            details: {
              meeting_id: request.meetingId,
              proxy_type: request.proxyType,
              can_sub_delegate: request.canSubDelegate,
              effective_until: request.effectiveUntil
            }
          })

          return success(this.transformProxyToDomain(proxy))
        }
      ])
        .then(results => results.success ? success(results.data[0]) : results)
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to create proxy', error))
    }
  }

  /**
   * Update a proxy
   */
  async updateProxy(
    proxyId: MeetingProxyId,
    updates: UpdateProxyRequest
  ): Promise<Result<ProxyWithDetails>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Get current proxy
      const currentResult = await this.findProxyById(proxyId)
      if (!currentResult.success) return currentResult

      const current = currentResult.data

      // Check permissions (grantor or admin)
      if (current.grantorUserId !== userId) {
        const meetingResult = await this.getMeetingWithOrgCheck(current.meetingId, userId)
        if (!meetingResult.success) return meetingResult

        const permissionResult = await this.checkOrganizationPermission(
          userId,
          meetingResult.data.organization_id,
          ['admin', 'owner']
        )
        if (!permissionResult.success) return permissionResult
      }

      const updateData: Partial<MeetingProxyRow> = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData]
        }
      })

      const { data: proxy, error } = await this.supabase
        .from('meeting_proxies')
        .update(updateData)
        .eq('id', proxyId)
        .select(`
          *,
          grantor:grantor_user_id(full_name),
          proxy_holder:proxy_holder_user_id(full_name),
          witness:witness_user_id(full_name)
        `)
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'update proxy'))
      }

      // Log proxy update
      await this.logActivity({
        user_id: userId,
        organization_id: (await this.getMeetingWithOrgCheck(current.meetingId, userId)).data?.organization_id || '',
        event_type: 'proxy.updated',
        event_category: 'governance',
        action: 'update',
        resource_type: 'meeting_proxy',
        resource_id: proxyId,
        event_description: 'Updated meeting proxy',
        outcome: 'success',
        severity: 'low',
        details: { changes: updates }
      })

      return success(this.transformProxyToDomain(proxy))
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to update proxy', error))
    }
  }

  /**
   * Find proxies with filters
   */
  async findProxiesWithFilters(
    filters: ProxyFilters,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<ProxyWithDetails>>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      let query = this.supabase
        .from('meeting_proxies')
        .select(`
          *,
          grantor:grantor_user_id(full_name),
          proxy_holder:proxy_holder_user_id(full_name),
          witness:witness_user_id(full_name)
        `, { count: 'exact' })

      // Apply filters
      if (filters.meetingId) {
        const meetingResult = await this.getMeetingWithOrgCheck(filters.meetingId, userId)
        if (!meetingResult.success) return meetingResult
        
        query = query.eq('meeting_id', filters.meetingId)
      }

      if (filters.grantorUserId) {
        query = query.eq('grantor_user_id', filters.grantorUserId)
      }

      if (filters.proxyHolderUserId) {
        query = query.eq('proxy_holder_user_id', filters.proxyHolderUserId)
      }

      if (filters.proxyType) {
        query = query.eq('proxy_type', filters.proxyType)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.canSubDelegate !== undefined) {
        query = query.eq('can_sub_delegate', filters.canSubDelegate)
      }

      if (filters.effectiveFrom) {
        query = query.gte('effective_from', filters.effectiveFrom)
      }

      if (filters.effectiveTo) {
        query = query.lte('effective_until', filters.effectiveTo)
      }

      // Apply RLS - users can only see proxies they're involved in or in their org
      query = query.or(
        `grantor_user_id.eq.${userId},proxy_holder_user_id.eq.${userId}`
      )

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'find proxies with filters'))
      }

      const proxies = (data || []).map(this.transformProxyToDomain)
      return this.createPaginatedResult(proxies, count, options)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to find proxies with filters', error))
    }
  }

  /**
   * Get proxy delegation chain
   */
  async getProxyChain(proxyId: MeetingProxyId): Promise<Result<ProxyChain>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const { data, error } = await this.supabase
        .rpc('get_proxy_chain', { proxy_id: proxyId })

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'get proxy chain'))
      }

      const chain = this.buildProxyChainFromData(data)
      return success(chain)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get proxy chain', error))
    }
  }

  // ============================================================================
  // VOTING SESSION OPERATIONS
  // ============================================================================

  /**
   * Create a voting session
   */
  async createVotingSession(request: CreateVotingSessionRequest): Promise<Result<VotingSession>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Check meeting access and permissions
      const meetingResult = await this.getMeetingWithOrgCheck(request.meetingId, userId)
      if (!meetingResult.success) return meetingResult

      const sessionData: VotingSessionInsert = {
        meeting_id: request.meetingId,
        session_name: request.sessionName,
        session_description: request.sessionDescription,
        session_type: request.sessionType || 'standard',
        status: 'preparing',
        controlled_by: userId,
        voting_method: request.votingMethod,
        anonymity_level: request.anonymityLevel || 'public',
        allow_abstentions: request.allowAbstentions ?? true,
        allow_proxy_voting: request.allowProxyVoting ?? true,
        require_unanimous_consent: request.requireUnanimousConsent || false,
        scheduled_start: request.scheduledStart,
        scheduled_end: request.scheduledEnd,
        voting_deadline: request.votingDeadline,
        required_quorum: request.requiredQuorum,
        pass_threshold: request.passThreshold || 50.0,
        eligible_voters_count: 0,
        registered_voters_count: 0,
        actual_voters_count: 0,
        proxy_votes_count: 0,
        votes_for: 0,
        votes_against: 0,
        votes_abstain: 0,
        votes_absent: 0,
        quorum_achieved: false
      }

      const { data: session, error } = await this.supabase
        .from('meeting_voting_sessions')
        .insert(sessionData)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'create voting session'))
      }

      // Log session creation
      await this.logActivity({
        user_id: userId,
        organization_id: meetingResult.data.organization_id,
        event_type: 'voting_session.created',
        event_category: 'governance',
        action: 'create',
        resource_type: 'voting_session',
        resource_id: session.id,
        event_description: `Created voting session: ${session.session_name}`,
        outcome: 'success',
        severity: 'medium',
        details: {
          meeting_id: request.meetingId,
          voting_method: request.votingMethod,
          session_type: request.sessionType
        }
      })

      return success(this.transformVotingSessionToDomain(session))
    } catch (error) {
      if (error instanceof RepositoryError) {
        return failure(error)
      }
      return failure(RepositoryError.internal('Failed to create voting session', error))
    }
  }

  // ============================================================================
  // ANALYTICS AND REPORTING
  // ============================================================================

  /**
   * Get participation analytics for a meeting
   */
  async getParticipationAnalytics(meetingId: MeetingId): Promise<Result<VotingParticipationStats>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Check meeting access
      const meetingResult = await this.getMeetingWithOrgCheck(meetingId, userId)
      if (!meetingResult.success) return meetingResult

      const { data, error } = await this.supabase
        .rpc('get_meeting_participation_stats', { meeting_id: meetingId })

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'get participation analytics'))
      }

      const analytics = this.transformParticipationStats(data)
      return success(analytics)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get participation analytics', error))
    }
  }

  /**
   * Get quorum analytics for a meeting
   */
  async getQuorumAnalytics(meetingId: MeetingId): Promise<Result<QuorumAnalytics>> {
    try {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) return userResult

      const userId = userResult.data

      // Check meeting access
      const meetingResult = await this.getMeetingWithOrgCheck(meetingId, userId)
      if (!meetingResult.success) return meetingResult

      const { data, error } = await this.supabase
        .rpc('get_meeting_quorum_analytics', { meeting_id: meetingId })

      if (error) {
        return failure(RepositoryError.fromSupabaseError(error, 'get quorum analytics'))
      }

      const analytics = this.transformQuorumAnalytics(data)
      return success(analytics)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to get quorum analytics', error))
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async checkDuplicateVote(
    meetingId: MeetingId,
    userId: UserId,
    resolutionId?: string,
    voteRound: number = 1
  ): Promise<Result<void>> {
    const { data, error } = await this.supabase
      .from('meeting_votes')
      .select('id')
      .eq('meeting_id', meetingId)
      .eq('voter_user_id', userId)
      .eq('vote_round', voteRound)
      .maybeSingle()

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'check duplicate vote'))
    }

    if (data) {
      return failure(RepositoryError.conflict(
        'vote',
        'User has already voted in this round',
        { existingVoteId: data.id, voteRound }
      ))
    }

    return success(undefined)
  }

  private async validateProxyVoting(
    proxyId: MeetingProxyId,
    userId: UserId
  ): Promise<Result<MeetingProxy | null>> {
    const { data: proxy, error } = await this.supabase
      .from('meeting_proxies')
      .select('*')
      .eq('id', proxyId)
      .eq('proxy_holder_user_id', userId)
      .eq('status', 'active')
      .single()

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'validate proxy voting'))
    }

    // Check if proxy is still valid
    const now = new Date()
    const effectiveUntil = new Date(proxy.effective_until)
    
    if (effectiveUntil < now) {
      return failure(RepositoryError.businessRule(
        'proxy_expired',
        'Proxy authorization has expired',
        { expiredAt: proxy.effective_until }
      ))
    }

    // Check vote limits
    if (proxy.max_votes_allowed && proxy.votes_cast_count >= proxy.max_votes_allowed) {
      return failure(RepositoryError.businessRule(
        'proxy_vote_limit_exceeded',
        'Proxy has reached maximum vote limit',
        { 
          maxVotes: proxy.max_votes_allowed, 
          votesCast: proxy.votes_cast_count 
        }
      ))
    }

    return success(this.transformProxyToDomain(proxy))
  }

  private async getRoleVotingWeight(
    meetingId: MeetingId,
    userId: UserId
  ): Promise<Result<number>> {
    const { data: role, error } = await this.supabase
      .from('meeting_roles')
      .select('voting_weight')
      .eq('meeting_id', meetingId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'get role voting weight'))
    }

    return success(role?.voting_weight || 1)
  }

  private async generateVoteHash(voteData: {
    meetingId: MeetingId
    voterUserId: UserId
    voteChoice: string
    timestamp: string
  }): Promise<string> {
    // Create a hash for vote verification (simplified version)
    const hashInput = `${voteData.meetingId}-${voteData.voterUserId}-${voteData.voteChoice}-${voteData.timestamp}`
    return `vote_hash_${Buffer.from(hashInput).toString('base64').slice(0, 32)}`
  }

  private async incrementProxyVoteCount(proxyId: MeetingProxyId): Promise<void> {
    await this.supabase
      .from('meeting_proxies')
      .update({ 
        votes_cast_count: this.supabase.sql`votes_cast_count + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', proxyId)
  }

  private applyVotingPrivacyFilter(query: any, userId: UserId): any {
    // Apply privacy filters - users can only see:
    // 1. Their own votes
    // 2. Public votes in meetings they can access
    // 3. Non-secret votes if they're meeting admin
    return query.or(
      `voter_user_id.eq.${userId},anonymity_level.neq.secret`
    )
  }

  private calculateVotingStatistics(votes: MeetingVoteRow[]): VotingStatistics {
    const totalVotes = votes.length
    
    const votesByMethod = votes.reduce((acc, vote) => {
      const method = vote.vote_method as VoteMethod
      acc[method] = (acc[method] || 0) + 1
      return acc
    }, {} as Record<VoteMethod, number>)

    const votesByAnonymity = votes.reduce((acc, vote) => {
      const anonymity = vote.anonymity_level as VoteAnonymity
      acc[anonymity] = (acc[anonymity] || 0) + 1
      return acc
    }, {} as Record<VoteAnonymity, number>)

    const proxyVotes = votes.filter(v => v.proxy_id).length
    const proxyUsageRate = totalVotes > 0 ? (proxyVotes / totalVotes) * 100 : 0

    const votingTimes = votes
      .filter(v => v.voting_duration_seconds)
      .map(v => v.voting_duration_seconds!)
    const averageVotingTime = votingTimes.length > 0 
      ? votingTimes.reduce((sum, time) => sum + time, 0) / votingTimes.length 
      : 0

    const confidenceDistribution = votes
      .filter(v => v.vote_confidence)
      .reduce((acc, vote) => {
        const confidence = vote.vote_confidence!
        acc[confidence] = (acc[confidence] || 0) + 1
        return acc
      }, {} as Record<number, number>)

    return {
      totalVotes,
      votesByMethod,
      votesByAnonymity,
      participationRate: 0, // Would need eligible voter count
      proxyUsageRate,
      averageVotingTime,
      confidenceDistribution
    }
  }

  private buildProxyChainFromData(data: any[]): ProxyChain {
    // Build proxy chain from recursive query result
    const chainPath = data.map((item, index) => ({
      proxyId: item.id,
      grantor: item.grantor_user_id,
      holder: item.proxy_holder_user_id,
      level: index + 1
    }))

    return {
      originalGrantor: data[0]?.grantor_user_id || '',
      currentHolder: data[data.length - 1]?.proxy_holder_user_id || '',
      chainPath,
      totalWeight: data[data.length - 1]?.voting_weight || 0,
      isValid: data.every(item => item.status === 'active')
    }
  }

  private async findProxyById(proxyId: MeetingProxyId): Promise<Result<MeetingProxy>> {
    const { data, error } = await this.supabase
      .from('meeting_proxies')
      .select('*')
      .eq('id', proxyId)
      .single()

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'find proxy by id'))
    }

    return success(this.transformProxyToDomain(data))
  }

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

  // ============================================================================
  // DOMAIN TRANSFORMATION METHODS
  // ============================================================================

  private transformVoteToDomain(row: any): VoteWithContext {
    return {
      id: row.id,
      meetingId: row.meeting_id,
      resolutionId: row.resolution_id,
      agendaItemId: row.agenda_item_id,
      voterUserId: row.voter_user_id,
      roleId: row.role_id,
      proxyId: row.proxy_id,
      voteType: row.vote_type,
      voteMethod: row.vote_method,
      voteChoice: row.vote_choice,
      voteWeight: row.vote_weight,
      anonymityLevel: row.anonymity_level,
      isAnonymous: row.anonymity_level !== 'public',
      voteSequence: row.vote_sequence,
      voteRound: row.vote_round,
      isFinalVote: row.is_final_vote,
      voteRationale: row.vote_rationale,
      voteConfidence: row.vote_confidence,
      conditionsOrAmendments: row.conditions_or_amendments,
      votingAsProxyFor: row.voting_as_proxy_for,
      proxyInstructionsFollowed: row.proxy_instructions_followed,
      proxyInstructionOverrideReason: row.proxy_instruction_override_reason,
      votingDeviceInfo: row.voting_device_info,
      ipAddress: row.ip_address,
      geolocation: row.geolocation,
      votingDurationSeconds: row.voting_duration_seconds,
      voteHash: row.vote_hash,
      blockchainTransactionId: row.blockchain_transaction_id,
      verifiedBy: row.verified_by,
      verificationTimestamp: row.verification_timestamp,
      voteTimestamp: row.vote_timestamp,
      recordedAt: row.recorded_at,
      voterName: row.voter?.full_name,
      proxyHolderName: row.proxy_holder?.proxy_holder_user_id?.full_name,
      roleName: row.role?.role
    }
  }

  private transformProxyToDomain(row: any): ProxyWithDetails {
    return {
      id: row.id,
      meetingId: row.meeting_id,
      grantorUserId: row.grantor_user_id,
      proxyHolderUserId: row.proxy_holder_user_id,
      proxyType: row.proxy_type,
      status: row.status,
      votingInstructions: row.voting_instructions || {},
      scopeLimitations: row.scope_limitations || [],
      resolutionRestrictions: row.resolution_restrictions || [],
      canSubDelegate: row.can_sub_delegate,
      subDelegatedTo: row.sub_delegated_to,
      delegationChainLevel: row.delegation_chain_level,
      parentProxyId: row.parent_proxy_id,
      votingWeight: row.voting_weight,
      maxVotesAllowed: row.max_votes_allowed,
      votesCastCount: row.votes_cast_count,
      effectiveFrom: row.effective_from,
      effectiveUntil: row.effective_until,
      witnessUserId: row.witness_user_id,
      legalDocumentPath: row.legal_document_path,
      notarizationRequired: row.notarization_required,
      notarizedAt: row.notarized_at,
      notarizedBy: row.notarized_by,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
      revocationReason: row.revocation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      grantorName: row.grantor?.full_name,
      proxyHolderName: row.proxy_holder?.full_name,
      witnessName: row.witness?.full_name
    }
  }

  private transformVotingSessionToDomain(row: VotingSessionRow): VotingSession {
    return {
      id: row.id,
      meetingId: row.meeting_id,
      workflowId: row.workflow_id,
      sessionName: row.session_name,
      sessionDescription: row.session_description,
      sessionType: row.session_type,
      status: row.status as SessionStatus,
      controlledBy: row.controlled_by,
      votingMethod: row.voting_method as VoteMethod,
      anonymityLevel: row.anonymity_level as VoteAnonymity,
      allowAbstentions: row.allow_abstentions,
      allowProxyVoting: row.allow_proxy_voting,
      requireUnanimousConsent: row.require_unanimous_consent,
      scheduledStart: row.scheduled_start,
      actualStart: row.actual_start,
      scheduledEnd: row.scheduled_end,
      actualEnd: row.actual_end,
      votingDeadline: row.voting_deadline,
      requiredQuorum: row.required_quorum,
      eligibleVotersCount: row.eligible_voters_count,
      registeredVotersCount: row.registered_voters_count,
      actualVotersCount: row.actual_voters_count,
      proxyVotesCount: row.proxy_votes_count,
      votesFor: row.votes_for,
      votesAgainst: row.votes_against,
      votesAbstain: row.votes_abstain,
      votesAbsent: row.votes_absent,
      totalVotes: row.votes_for + row.votes_against + row.votes_abstain,
      quorumAchieved: row.quorum_achieved,
      sessionPassed: row.session_passed,
      passThreshold: row.pass_threshold,
      actualPassPercentage: row.actual_pass_percentage,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private transformParticipationStats(data: any): VotingParticipationStats {
    return {
      totalEligibleVoters: data.total_eligible_voters || 0,
      actualVoters: data.actual_voters || 0,
      participationRate: data.participation_rate || 0,
      proxyVotes: data.proxy_votes || 0,
      proxyRate: data.proxy_rate || 0,
      averageVotingTime: data.average_voting_time || 0,
      votingMethodBreakdown: data.voting_method_breakdown || {},
      anonymityLevelBreakdown: data.anonymity_level_breakdown || {}
    }
  }

  private transformQuorumAnalytics(data: any): QuorumAnalytics {
    return {
      requiredQuorum: data.required_quorum || 0,
      achievedQuorum: data.achieved_quorum || 0,
      quorumMetPercentage: data.quorum_met_percentage || 0,
      averageAttendance: data.average_attendance || 0,
      lateArrivals: data.late_arrivals || 0,
      earlyDepartures: data.early_departures || 0,
      remoteParticipants: data.remote_participants || 0
    }
  }
}