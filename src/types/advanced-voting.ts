/**
 * ============================================================================
 * ADVANCED BOARD MEETING VOTING SYSTEM TYPES
 * Enterprise-grade voting with proxy support, workflows, and Robert's Rules
 * ============================================================================
 */

import { UserId } from './branded'
import {
  MeetingId,
  MeetingVoteId,
  MeetingProxyId,
  MeetingWorkflowId,
  MeetingRoleId,
  VotingSessionId,
  WorkflowTransitionId,
  VotingSessionItemId,
  MeetingResolutionId
} from './branded'

// ============================================================================
// MEETING ROLES TYPES
// ============================================================================

export type MeetingRole = 
  | 'chair' 
  | 'vice_chair' 
  | 'secretary' 
  | 'treasurer' 
  | 'parliamentarian'
  | 'board_member' 
  | 'observer' 
  | 'guest' 
  | 'advisor' 
  | 'legal_counsel'

export type RoleStatus = 'active' | 'inactive' | 'delegated' | 'substituted'

export interface MeetingRoleAssignment {
  readonly id: MeetingRoleId
  readonly meetingId: MeetingId
  readonly userId: UserId
  readonly assignedBy: UserId
  
  // Role Details
  readonly role: MeetingRole
  readonly roleTitle?: string
  readonly status: RoleStatus
  
  // Permissions and Responsibilities
  readonly canStartVoting: boolean
  readonly canCloseVoting: boolean
  readonly canAssignSpeakers: boolean
  readonly canManageAgenda: boolean
  readonly canDeclareQuorum: boolean
  readonly canAdjournMeeting: boolean
  readonly votingWeight: number
  
  // Delegation
  readonly delegatedTo?: UserId
  readonly delegationStart?: string
  readonly delegationEnd?: string
  readonly delegationReason?: string
  
  // Substitution (temporary replacement)
  readonly substitutedBy?: UserId
  readonly substitutionReason?: string
  
  // Timestamps
  readonly appointedAt: string
  readonly effectiveFrom: string
  readonly effectiveUntil?: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface CreateMeetingRoleRequest {
  readonly meetingId: MeetingId
  readonly userId: UserId
  readonly role: MeetingRole
  readonly roleTitle?: string
  readonly canStartVoting?: boolean
  readonly canCloseVoting?: boolean
  readonly canAssignSpeakers?: boolean
  readonly canManageAgenda?: boolean
  readonly canDeclareQuorum?: boolean
  readonly canAdjournMeeting?: boolean
  readonly votingWeight?: number
  readonly effectiveFrom?: string
  readonly effectiveUntil?: string
}

export interface UpdateMeetingRoleRequest {
  readonly status?: RoleStatus
  readonly roleTitle?: string
  readonly delegatedTo?: UserId
  readonly delegationStart?: string
  readonly delegationEnd?: string
  readonly delegationReason?: string
  readonly substitutedBy?: UserId
  readonly substitutionReason?: string
  readonly effectiveUntil?: string
}

// ============================================================================
// MEETING PROXIES TYPES
// ============================================================================

export type ProxyType = 'general' | 'specific' | 'instructed' | 'discretionary'
export type ProxyStatus = 'active' | 'revoked' | 'expired' | 'executed' | 'delegated'

export interface MeetingProxy {
  readonly id: MeetingProxyId
  readonly meetingId: MeetingId
  
  // Proxy Participants
  readonly grantorUserId: UserId // Person giving proxy
  readonly proxyHolderUserId: UserId // Person receiving proxy
  
  // Proxy Details
  readonly proxyType: ProxyType
  readonly status: ProxyStatus
  
  // Instructions and Limitations
  readonly votingInstructions: Record<string, unknown>
  readonly scopeLimitations: readonly string[]
  readonly resolutionRestrictions: readonly MeetingResolutionId[]
  
  // Delegation Chain Support
  readonly canSubDelegate: boolean
  readonly subDelegatedTo?: UserId
  readonly delegationChainLevel: number
  readonly parentProxyId?: MeetingProxyId
  
  // Authority and Weight
  readonly votingWeight: number
  readonly maxVotesAllowed?: number
  readonly votesCastCount: number
  
  // Validity Period
  readonly effectiveFrom: string
  readonly effectiveUntil: string
  
  // Legal and Audit Trail
  readonly witnessUserId?: UserId
  readonly legalDocumentPath?: string
  readonly notarizationRequired: boolean
  readonly notarizedAt?: string
  readonly notarizedBy?: string
  
  // Revocation
  readonly revokedAt?: string
  readonly revokedBy?: UserId
  readonly revocationReason?: string
  
  // Timestamps
  readonly createdAt: string
  readonly updatedAt: string
}

export interface CreateProxyRequest {
  readonly meetingId: MeetingId
  readonly proxyHolderUserId: UserId
  readonly proxyType?: ProxyType
  readonly votingInstructions?: Record<string, unknown>
  readonly scopeLimitations?: readonly string[]
  readonly resolutionRestrictions?: readonly MeetingResolutionId[]
  readonly canSubDelegate?: boolean
  readonly votingWeight?: number
  readonly maxVotesAllowed?: number
  readonly effectiveFrom?: string
  readonly effectiveUntil: string
  readonly witnessUserId?: UserId
  readonly legalDocumentPath?: string
  readonly notarizationRequired?: boolean
}

export interface UpdateProxyRequest {
  readonly status?: ProxyStatus
  readonly votingInstructions?: Record<string, unknown>
  readonly scopeLimitations?: readonly string[]
  readonly subDelegatedTo?: UserId
  readonly revokedAt?: string
  readonly revocationReason?: string
  readonly notarizedAt?: string
  readonly notarizedBy?: string
}

// ============================================================================
// ADVANCED VOTING TYPES
// ============================================================================

export type VoteType = 'resolution' | 'motion' | 'amendment' | 'procedural' | 'straw_poll'
export type VoteMethod = 'voice' | 'show_of_hands' | 'secret_ballot' | 'electronic' | 'roll_call' | 'written_ballot'
export type VoteAnonymity = 'public' | 'anonymous' | 'secret' | 'confidential'
export type VoteChoice = 'for' | 'against' | 'abstain' | 'absent' | 'present'

export interface AdvancedVote {
  readonly id: MeetingVoteId
  
  // Context References
  readonly meetingId: MeetingId
  readonly resolutionId?: MeetingResolutionId
  readonly agendaItemId?: string
  
  // Voter Information
  readonly voterUserId: UserId
  readonly roleId?: MeetingRoleId
  readonly proxyId?: MeetingProxyId
  
  // Vote Details
  readonly voteType: VoteType
  readonly voteMethod: VoteMethod
  readonly voteChoice: VoteChoice
  readonly voteWeight: number
  
  // Anonymity and Privacy
  readonly anonymityLevel: VoteAnonymity
  readonly isAnonymous: boolean
  
  // Vote Metadata
  readonly voteSequence?: number
  readonly voteRound: number
  readonly isFinalVote: boolean
  
  // Rationale and Context
  readonly voteRationale?: string
  readonly voteConfidence?: number
  readonly conditionsOrAmendments?: string
  
  // Proxy Information (if applicable)
  readonly votingAsProxyFor?: UserId
  readonly proxyInstructionsFollowed?: boolean
  readonly proxyInstructionOverrideReason?: string
  
  // Technical Metadata
  readonly votingDeviceInfo?: Record<string, unknown>
  readonly ipAddress?: string
  readonly geolocation?: Record<string, unknown>
  readonly votingDurationSeconds?: number
  
  // Audit and Verification
  readonly voteHash?: string
  readonly blockchainTransactionId?: string
  readonly verifiedBy?: UserId
  readonly verificationTimestamp?: string
  
  // Timestamps
  readonly voteTimestamp: string
  readonly recordedAt: string
}

export interface CastAdvancedVoteRequest {
  readonly resolutionId?: MeetingResolutionId
  readonly voteType: VoteType
  readonly voteMethod: VoteMethod
  readonly voteChoice: VoteChoice
  readonly voteWeight?: number
  readonly anonymityLevel?: VoteAnonymity
  readonly voteRound?: number
  readonly voteRationale?: string
  readonly voteConfidence?: number
  readonly conditionsOrAmendments?: string
  readonly proxyId?: MeetingProxyId
  readonly votingAsProxyFor?: UserId
  readonly proxyInstructionsFollowed?: boolean
  readonly proxyInstructionOverrideReason?: string
  readonly votingDeviceInfo?: Record<string, unknown>
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export type WorkflowType = 'standard_board' | 'agm' | 'emergency' | 'committee' | 'custom'
export type WorkflowStage = 
  | 'pre_meeting' 
  | 'opening' 
  | 'roll_call' 
  | 'quorum_check' 
  | 'agenda_approval'
  | 'regular_business' 
  | 'voting_session' 
  | 'new_business' 
  | 'executive_session'
  | 'closing' 
  | 'post_meeting' 
  | 'completed' 
  | 'suspended' 
  | 'cancelled'

export type WorkflowStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'failed' | 'cancelled'

export interface MeetingWorkflow {
  readonly id: MeetingWorkflowId
  readonly meetingId: MeetingId
  
  // Workflow Definition
  readonly workflowType: WorkflowType
  readonly workflowName?: string
  readonly workflowDescription?: string
  
  // Current State
  readonly currentStage: WorkflowStage
  readonly status: WorkflowStatus
  readonly progressPercentage: number
  
  // Stage Management
  readonly stagesCompleted: readonly WorkflowStage[]
  readonly stagesSequence: readonly WorkflowStage[]
  readonly currentStageIndex: number
  
  // Automation Settings
  readonly autoProgression: boolean
  readonly requireChairApproval: boolean
  readonly stageTimeLimits: Record<string, unknown>
  
  // Process Control
  readonly initiatedBy: UserId
  readonly currentController?: UserId
  
  // Quorum Management
  readonly quorumRequired?: number
  readonly quorumAchieved: boolean
  readonly quorumCheckedAt?: string
  readonly attendanceCount: number
  
  // Voting Management
  readonly activeVotingSession: boolean
  readonly votingMethod?: VoteMethod
  readonly votesInProgress: readonly MeetingResolutionId[]
  
  // Robert's Rules Compliance
  readonly robertsRulesEnabled: boolean
  readonly pointOfOrderRaised: boolean
  readonly motionOnFloor?: MeetingResolutionId
  readonly speakingOrder: readonly UserId[]
  readonly currentSpeaker?: UserId
  
  // Stage Timing
  readonly stageStartedAt?: string
  readonly stageDeadline?: string
  readonly estimatedCompletion?: string
  readonly actualCompletion?: string
  
  // Configuration
  readonly allowLateArrivals: boolean
  readonly requireUnanimousConsent: boolean
  readonly enableExecutiveSession: boolean
  
  // Error Handling
  readonly errorState: boolean
  readonly errorMessage?: string
  readonly lastErrorAt?: string
  readonly recoveryAttempted: boolean
  
  // Timestamps
  readonly workflowStartedAt?: string
  readonly workflowCompletedAt?: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface CreateWorkflowRequest {
  readonly meetingId: MeetingId
  readonly workflowType: WorkflowType
  readonly workflowName?: string
  readonly workflowDescription?: string
  readonly stagesSequence?: readonly WorkflowStage[]
  readonly autoProgression?: boolean
  readonly requireChairApproval?: boolean
  readonly stageTimeLimits?: Record<string, unknown>
  readonly quorumRequired?: number
  readonly robertsRulesEnabled?: boolean
  readonly allowLateArrivals?: boolean
  readonly requireUnanimousConsent?: boolean
  readonly enableExecutiveSession?: boolean
}

export interface UpdateWorkflowRequest {
  readonly currentStage?: WorkflowStage
  readonly status?: WorkflowStatus
  readonly currentController?: UserId
  readonly quorumAchieved?: boolean
  readonly attendanceCount?: number
  readonly activeVotingSession?: boolean
  readonly votingMethod?: VoteMethod
  readonly votesInProgress?: readonly MeetingResolutionId[]
  readonly pointOfOrderRaised?: boolean
  readonly motionOnFloor?: MeetingResolutionId
  readonly speakingOrder?: readonly UserId[]
  readonly currentSpeaker?: UserId
  readonly stageDeadline?: string
  readonly errorState?: boolean
  readonly errorMessage?: string
}

// ============================================================================
// WORKFLOW TRANSITIONS TYPES
// ============================================================================

export interface WorkflowTransition {
  readonly id: WorkflowTransitionId
  readonly workflowId: MeetingWorkflowId
  readonly meetingId: MeetingId
  
  // Transition Details
  readonly fromStage?: WorkflowStage
  readonly toStage: WorkflowStage
  readonly transitionType: string // 'manual' | 'automatic' | 'timeout' | 'error'
  
  // User and Authorization
  readonly triggeredBy?: UserId
  readonly authorizedBy?: UserId
  readonly requiresApproval: boolean
  readonly approvedBy?: UserId
  
  // Conditions and Context
  readonly conditionsMet: Record<string, unknown>
  readonly contextData: Record<string, unknown>
  
  // Timing
  readonly transitionDuration?: number
  readonly plannedAt?: string
  readonly executedAt: string
  
  // Validation and Checks
  readonly quorumCheckPassed?: boolean
  readonly votingCompleted?: boolean
  readonly requiredApprovalsReceived?: boolean
  
  // Notes and Comments
  readonly transitionNotes?: string
  readonly systemNotes?: string
  
  // Timestamps
  readonly createdAt: string
}

// ============================================================================
// VOTING SESSIONS TYPES
// ============================================================================

export type SessionStatus = 'preparing' | 'open' | 'closed' | 'counting' | 'completed' | 'cancelled'

export interface VotingSession {
  readonly id: VotingSessionId
  readonly meetingId: MeetingId
  readonly workflowId?: MeetingWorkflowId
  
  // Session Details
  readonly sessionName: string
  readonly sessionDescription?: string
  readonly sessionType: string
  
  // Status and Control
  readonly status: SessionStatus
  readonly controlledBy?: UserId
  
  // Voting Configuration
  readonly votingMethod: VoteMethod
  readonly anonymityLevel: VoteAnonymity
  readonly allowAbstentions: boolean
  readonly allowProxyVoting: boolean
  readonly requireUnanimousConsent: boolean
  
  // Timing
  readonly scheduledStart?: string
  readonly actualStart?: string
  readonly scheduledEnd?: string
  readonly actualEnd?: string
  readonly votingDeadline?: string
  
  // Quorum and Participation
  readonly requiredQuorum?: number
  readonly eligibleVotersCount: number
  readonly registeredVotersCount: number
  readonly actualVotersCount: number
  readonly proxyVotesCount: number
  
  // Results
  readonly votesFor: number
  readonly votesAgainst: number
  readonly votesAbstain: number
  readonly votesAbsent: number
  readonly totalVotes: number
  
  // Outcome
  readonly quorumAchieved: boolean
  readonly sessionPassed?: boolean
  readonly passThreshold: number
  readonly actualPassPercentage?: number
  
  // Timestamps
  readonly createdAt: string
  readonly updatedAt: string
}

export interface CreateVotingSessionRequest {
  readonly meetingId: MeetingId
  readonly sessionName: string
  readonly sessionDescription?: string
  readonly sessionType?: string
  readonly votingMethod: VoteMethod
  readonly anonymityLevel?: VoteAnonymity
  readonly allowAbstentions?: boolean
  readonly allowProxyVoting?: boolean
  readonly requireUnanimousConsent?: boolean
  readonly scheduledStart?: string
  readonly scheduledEnd?: string
  readonly votingDeadline?: string
  readonly requiredQuorum?: number
  readonly passThreshold?: number
}

// ============================================================================
// VOTING SESSION ITEMS TYPES
// ============================================================================

export interface VotingSessionItem {
  readonly id: VotingSessionItemId
  readonly votingSessionId: VotingSessionId
  readonly resolutionId?: MeetingResolutionId
  readonly motionTitle: string
  readonly motionText: string
  
  // Item Configuration
  readonly itemOrder: number
  readonly votingMethodOverride?: VoteMethod
  readonly passThresholdOverride?: number
  
  // Status and Results
  readonly status: SessionStatus
  readonly votesFor: number
  readonly votesAgainst: number
  readonly votesAbstain: number
  readonly totalItemVotes: number
  
  // Outcome
  readonly itemPassed?: boolean
  readonly passPercentage?: number
  
  // Timing
  readonly itemStart?: string
  readonly itemEnd?: string
  
  // Timestamps
  readonly createdAt: string
  readonly updatedAt: string
}

// ============================================================================
// ANALYTICS AND REPORTING TYPES
// ============================================================================

export interface VotingParticipationStats {
  readonly totalEligibleVoters: number
  readonly actualVoters: number
  readonly participationRate: number
  readonly proxyVotes: number
  readonly proxyRate: number
  readonly averageVotingTime: number
  readonly votingMethodBreakdown: Record<VoteMethod, number>
  readonly anonymityLevelBreakdown: Record<VoteAnonymity, number>
}

export interface QuorumAnalytics {
  readonly requiredQuorum: number
  readonly achievedQuorum: number
  readonly quorumMetPercentage: number
  readonly averageAttendance: number
  readonly lateArrivals: number
  readonly earlyDepartures: number
  readonly remoteParticipants: number
}

export interface WorkflowEfficiencyMetrics {
  readonly totalWorkflowTime: number
  readonly averageStageTime: Record<WorkflowStage, number>
  readonly stageCompletionRate: Record<WorkflowStage, number>
  readonly automationEffectiveness: number
  readonly manualInterventions: number
  readonly errorsEncountered: number
  readonly recoverySuccessRate: number
}

export interface RobertsRulesCompliance {
  readonly motionsProposed: number
  readonly motionsSeconded: number
  readonly amendmentsOffered: number
  readonly pointsOfOrderRaised: number
  readonly privilegedMotions: number
  readonly complianceScore: number
  readonly procedureViolations: readonly string[]
}

// ============================================================================
// FILTER AND QUERY TYPES
// ============================================================================

export interface AdvancedVotingFilters {
  readonly meetingId?: MeetingId
  readonly voterUserId?: UserId
  readonly voteType?: VoteType
  readonly voteMethod?: VoteMethod
  readonly anonymityLevel?: VoteAnonymity
  readonly voteChoice?: VoteChoice
  readonly proxyVoting?: boolean
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly confidenceLevel?: number
}

export interface ProxyFilters {
  readonly meetingId?: MeetingId
  readonly grantorUserId?: UserId
  readonly proxyHolderUserId?: UserId
  readonly proxyType?: ProxyType
  readonly status?: ProxyStatus
  readonly canSubDelegate?: boolean
  readonly effectiveFrom?: string
  readonly effectiveTo?: string
}

export interface WorkflowFilters {
  readonly meetingId?: MeetingId
  readonly workflowType?: WorkflowType
  readonly currentStage?: WorkflowStage
  readonly status?: WorkflowStatus
  readonly initiatedBy?: UserId
  readonly robertsRulesEnabled?: boolean
  readonly dateFrom?: string
  readonly dateTo?: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface AdvancedVotingSystemStatus {
  readonly totalActiveMeetings: number
  readonly activeVotingSessions: number
  readonly activeProxies: number
  readonly currentWorkflows: number
  readonly realTimeVotes: number
  readonly systemHealth: 'healthy' | 'degraded' | 'critical'
  readonly lastHealthCheck: string
}

export interface MeetingVotingReport {
  readonly meeting: {
    readonly id: MeetingId
    readonly title: string
    readonly scheduledStart: string
  }
  readonly participationStats: VotingParticipationStats
  readonly quorumAnalytics: QuorumAnalytics
  readonly workflowMetrics: WorkflowEfficiencyMetrics
  readonly robertsRulesCompliance: RobertsRulesCompliance
  readonly resolutionsSummary: {
    readonly total: number
    readonly passed: number
    readonly rejected: number
    readonly tabled: number
  }
  readonly proxyUsage: {
    readonly totalProxies: number
    readonly activeProxies: number
    readonly subDelegations: number
  }
}

export interface RealTimeVotingUpdate {
  readonly type: 'vote_cast' | 'session_started' | 'session_ended' | 'quorum_achieved' | 'workflow_transition'
  readonly meetingId: MeetingId
  readonly sessionId?: VotingSessionId
  readonly workflowId?: MeetingWorkflowId
  readonly data: Record<string, unknown>
  readonly timestamp: string
}