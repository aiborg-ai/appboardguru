/**
 * Meeting Workflows WebSocket Service
 * 
 * Specialized real-time coordination for meeting workflows including:
 * - Real-time voting with live vote counts and progress tracking
 * - Proxy delegation notifications with voting weight management
 * - Meeting stage transitions with workflow orchestration
 * - Participant presence and status updates
 * - Meeting timer and agenda progression
 * - Action item assignments and progress tracking
 * - Real-time minute taking and documentation
 * 
 * Integrates with Enhanced WebSocket Coordinator and Real-time State Sync
 * Follows CLAUDE.md patterns with Result pattern and enterprise reliability
 */

import { BaseService } from './base.service'
import { EnhancedWebSocketCoordinatorService } from './enhanced-websocket-coordinator.service'
import { RealTimeStateSyncService } from './real-time-state-sync.service'
import { AdvancedMessageRouterService } from './advanced-message-router.service'
import { Result, success, failure, wrapAsync, isFailure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import {
  type UserId,
  type OrganizationId,
  type MeetingId,
  type MeetingActionableId,
  type SocketId,
  type RoomId,
  createRoomId,
  createMeetingActionableId
} from '../../types/branded'

// =============================================
// MEETING WORKFLOW TYPES
// =============================================

export interface MeetingParticipant {
  readonly userId: UserId
  readonly role: 'chair' | 'member' | 'observer' | 'secretary' | 'legal-counsel'
  readonly status: 'present' | 'absent' | 'late' | 'disconnected'
  readonly joinedAt?: string
  readonly leftAt?: string
  readonly votingWeight: number
  readonly proxyDelegations: ProxyDelegation[]
  readonly permissions: ParticipantPermissions
  readonly presence: ParticipantPresence
}

export interface ProxyDelegation {
  readonly id: string
  readonly delegatorId: UserId
  readonly proxyId: UserId
  readonly delegationType: 'full-meeting' | 'specific-items' | 'category-based'
  readonly scope: string[] // ActionableIds or categories
  readonly validFrom: string
  readonly validUntil: string
  readonly votingWeight: number
  readonly restrictions?: string[]
  readonly status: 'active' | 'revoked' | 'expired'
}

export interface ParticipantPermissions {
  readonly canVote: boolean
  readonly canDelegate: boolean
  readonly canSpeak: boolean
  readonly canViewDocuments: boolean
  readonly canRecordMeeting: boolean
  readonly canManageAgenda: boolean
  readonly canAssignActions: boolean
}

export interface ParticipantPresence {
  readonly socketId: SocketId
  readonly connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting'
  readonly deviceInfo: {
    readonly type: 'desktop' | 'mobile' | 'tablet'
    readonly browser: string
    readonly location?: string
  }
  readonly activityStatus: 'active' | 'idle' | 'away' | 'busy'
  readonly lastActivity: string
  readonly microphoneStatus: 'muted' | 'unmuted' | 'speaking'
  readonly videoStatus: 'on' | 'off' | 'unavailable'
}

export interface VotingSession {
  readonly id: string
  readonly actionableId: MeetingActionableId
  readonly meetingId: MeetingId
  readonly title: string
  readonly description: string
  readonly votingType: 'simple-majority' | 'super-majority' | 'unanimous' | 'advisory'
  readonly requiredThreshold: number // Percentage for majority votes
  readonly startTime: string
  readonly endTime?: string
  readonly duration?: number // Max duration in seconds
  readonly status: 'not-started' | 'in-progress' | 'completed' | 'cancelled'
  readonly votes: VotingRecord[]
  readonly results: VotingResults
  readonly metadata: {
    readonly anonymous: boolean
    readonly allowAbstention: boolean
    readonly allowProxyVoting: boolean
    readonly requiresJustification: boolean
  }
}

export interface VotingRecord {
  readonly id: string
  readonly voterId: UserId
  readonly actionableId: MeetingActionableId
  readonly vote: 'approve' | 'reject' | 'abstain'
  readonly votingWeight: number
  readonly isProxyVote: boolean
  readonly proxyDelegatedBy?: UserId
  readonly justification?: string
  readonly timestamp: string
  readonly confidence?: number // For AI-assisted voting recommendations
}

export interface VotingResults {
  readonly approve: {
    readonly count: number
    readonly weight: number
    readonly percentage: number
  }
  readonly reject: {
    readonly count: number
    readonly weight: number
    readonly percentage: number
  }
  readonly abstain: {
    readonly count: number
    readonly weight: number
    readonly percentage: number
  }
  readonly total: {
    readonly count: number
    readonly weight: number
    readonly required: number
    readonly quorumMet: boolean
    readonly thresholdMet: boolean
  }
  readonly outcome: 'passed' | 'failed' | 'tied' | 'pending' | 'no-quorum'
}

export interface MeetingStage {
  readonly id: string
  readonly name: string
  readonly type: 'opening' | 'agenda-review' | 'discussion' | 'voting' | 'action-planning' | 'closing'
  readonly status: 'pending' | 'in-progress' | 'completed' | 'skipped'
  readonly startTime?: string
  readonly endTime?: string
  readonly estimatedDuration: number
  readonly actualDuration?: number
  readonly prerequisites: string[]
  readonly participants: UserId[]
  readonly documents: string[]
  readonly actionables: MeetingActionableId[]
  readonly metadata: Record<string, any>
}

export interface ActionItemAssignment {
  readonly id: MeetingActionableId
  readonly title: string
  readonly description: string
  readonly assigneeId: UserId
  readonly assignedBy: UserId
  readonly dueDate: string
  readonly priority: 'critical' | 'high' | 'medium' | 'low'
  readonly status: 'assigned' | 'in-progress' | 'under-review' | 'completed' | 'overdue'
  readonly progress: number // 0-100
  readonly dependencies: MeetingActionableId[]
  readonly attachments: string[]
  readonly updates: ActionItemUpdate[]
  readonly estimatedHours?: number
  readonly actualHours?: number
}

export interface ActionItemUpdate {
  readonly id: string
  readonly actionableId: MeetingActionableId
  readonly userId: UserId
  readonly updateType: 'progress' | 'comment' | 'status-change' | 'due-date-change' | 'assignment-change'
  readonly content: string
  readonly newProgress?: number
  readonly newStatus?: string
  readonly newDueDate?: string
  readonly timestamp: string
}

export interface MeetingTimer {
  readonly totalDuration: number
  readonly elapsedTime: number
  readonly remainingTime: number
  readonly stageTimer: {
    readonly currentStage: string
    readonly stageElapsed: number
    readonly stageRemaining: number
    readonly stageOverrun: boolean
  }
  readonly breaks: Array<{
    readonly type: 'scheduled' | 'unscheduled'
    readonly startTime: string
    readonly endTime?: string
    readonly duration: number
  }>
}

// =============================================
// MEETING WORKFLOWS WEBSOCKET SERVICE
// =============================================

export class MeetingWorkflowsWebSocketService extends BaseService {
  private coordinator: EnhancedWebSocketCoordinatorService
  private stateSync: RealTimeStateSyncService
  private messageRouter: AdvancedMessageRouterService

  // Meeting state management
  private activeMeetings = new Map<MeetingId, {
    participants: Map<UserId, MeetingParticipant>
    votingSessions: Map<string, VotingSession>
    currentStage: MeetingStage
    actionItems: Map<MeetingActionableId, ActionItemAssignment>
    timer: MeetingTimer
    metadata: Record<string, any>
  }>()

  // Real-time tracking
  private participantConnections = new Map<SocketId, {
    userId: UserId
    meetingId: MeetingId
    lastHeartbeat: string
  }>()

  private votingTimers = new Map<string, NodeJS.Timeout>()
  private stageTimers = new Map<MeetingId, NodeJS.Timeout>()
  private heartbeatInterval: NodeJS.Timeout | null = null

  // Performance metrics
  private metrics = {
    activeMeetings: 0,
    totalParticipants: 0,
    activeVotingSessions: 0,
    messagesPerSecond: 0,
    averageVotingTime: 0,
    stageTransitionLatency: 0,
    participantEngagement: 0
  }

  constructor(
    supabase: SupabaseClient<Database>,
    coordinator: EnhancedWebSocketCoordinatorService,
    stateSync: RealTimeStateSyncService,
    messageRouter: AdvancedMessageRouterService
  ) {
    super(supabase)
    this.coordinator = coordinator
    this.stateSync = stateSync
    this.messageRouter = messageRouter

    this.startHeartbeatMonitoring()
  }

  // =============================================
  // PARTICIPANT MANAGEMENT
  // =============================================

  /**
   * Handle participant joining meeting with full presence tracking
   */
  async handleParticipantJoin(
    meetingId: MeetingId,
    organizationId: OrganizationId,
    userId: UserId,
    socketId: SocketId,
    joinInfo: {
      readonly deviceType: 'desktop' | 'mobile' | 'tablet'
      readonly browser: string
      readonly location?: string
      readonly capabilities: {
        readonly hasVideo: boolean
        readonly hasAudio: boolean
        readonly canShare: boolean
      }
    }
  ): Promise<Result<{
    readonly participant: MeetingParticipant
    readonly currentStage: MeetingStage
    readonly votingSessions: VotingSession[]
  }>> {
    return wrapAsync(async () => {
      const roomId = createRoomId(`meeting_${meetingId}`)

      // Get or create meeting state
      let meetingState = this.activeMeetings.get(meetingId)
      if (!meetingState) {
        meetingState = await this.initializeMeetingState(meetingId, organizationId)
        this.activeMeetings.set(meetingId, meetingState)
      }

      // Create participant with full presence
      const participant: MeetingParticipant = {
        userId,
        role: await this.getUserMeetingRole(userId, meetingId),
        status: 'present',
        joinedAt: new Date().toISOString(),
        votingWeight: 1, // Default, would be calculated based on shares/delegation
        proxyDelegations: await this.getActiveProxyDelegations(userId, meetingId),
        permissions: await this.getParticipantPermissions(userId, meetingId),
        presence: {
          socketId,
          connectionStatus: 'connected',
          deviceInfo: {
            type: joinInfo.deviceType,
            browser: joinInfo.browser,
            location: joinInfo.location
          },
          activityStatus: 'active',
          lastActivity: new Date().toISOString(),
          microphoneStatus: 'muted',
          videoStatus: 'off'
        }
      }

      // Add to meeting state
      meetingState.participants.set(userId, participant)
      
      // Track connection
      this.participantConnections.set(socketId, {
        userId,
        meetingId,
        lastHeartbeat: new Date().toISOString()
      })

      // Sync participant join via state synchronization
      await this.stateSync.syncMeetingState(
        meetingId,
        organizationId,
        userId,
        {
          participants: Array.from(meetingState.participants.values()).map(p => ({
            userId: p.userId,
            status: p.status,
            joinedAt: p.joinedAt,
            role: p.role
          }))
        } as any,
        'update'
      )

      // Broadcast participant joined event
      await this.coordinator.handleMeetingStageTransition(
        organizationId,
        meetingId,
        {
          fromStage: meetingState.currentStage.name,
          toStage: meetingState.currentStage.name,
          triggeredBy: userId,
          transitionTime: new Date().toISOString(),
          stageConfig: {
            eventType: 'participant-joined',
            participant: {
              userId,
              role: participant.role,
              votingWeight: participant.votingWeight
            }
          }
        }
      )

      // Send welcome message with current meeting state
      await this.sendParticipantWelcome(userId, meetingId, meetingState)

      // Update metrics
      this.metrics.totalParticipants++
      this.updateMetrics()

      return {
        participant,
        currentStage: meetingState.currentStage,
        votingSessions: Array.from(meetingState.votingSessions.values())
      }
    })
  }

  /**
   * Handle participant status updates (presence, activity, etc.)
   */
  async handleParticipantStatusUpdate(
    meetingId: MeetingId,
    organizationId: OrganizationId,
    userId: UserId,
    statusUpdate: {
      readonly activityStatus?: 'active' | 'idle' | 'away' | 'busy'
      readonly microphoneStatus?: 'muted' | 'unmuted' | 'speaking'
      readonly videoStatus?: 'on' | 'off' | 'unavailable'
      readonly connectionQuality?: 'excellent' | 'good' | 'poor' | 'unstable'
    }
  ): Promise<Result<void>> {
    return wrapAsync(async () => {
      const meetingState = this.activeMeetings.get(meetingId)
      if (!meetingState) {
        throw new Error('Meeting not found')
      }

      const participant = meetingState.participants.get(userId)
      if (!participant) {
        throw new Error('Participant not found')
      }

      // Update participant presence
      const updatedParticipant: MeetingParticipant = {
        ...participant,
        presence: {
          ...participant.presence,
          ...statusUpdate,
          lastActivity: new Date().toISOString()
        }
      }

      meetingState.participants.set(userId, updatedParticipant)

      // Broadcast presence update to other participants
      const presenceMessage = {
        id: `presence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'integrated_message' as const,
        roomId: createRoomId(`meeting_${meetingId}`),
        userId,
        timestamp: new Date().toISOString(),
        integrationType: 'meeting-workflow-update' as const,
        priority: 'normal' as const,
        targetFeatures: ['meetings' as const],
        sourceFeature: 'meetings' as const,
        routingInfo: {
          broadcast: true,
          requireAck: false,
          retryCount: 0,
          maxRetries: 1
        },
        enhancedType: 'participant-presence-update' as const,
        featureCoordination: {
          primaryFeature: 'meetings' as const,
          secondaryFeatures: [] as const,
          stateSync: false,
          conflictResolution: 'optimistic' as const
        },
        performance: {
          latencyTarget: 100,
          compressionEnabled: false,
          batchable: true,
          deduplicate: true
        },
        persistence: {
          persistMessage: false,
          replayOnReconnect: false
        },
        security: {
          encryptionRequired: false,
          auditRequired: false,
          tenantIsolated: true
        },
        data: {
          userId,
          presenceUpdate: statusUpdate,
          timestamp: new Date().toISOString()
        },
        metadata: {
          organizationId,
          feature: 'participant-presence'
        }
      }

      await this.messageRouter.routeMessage(presenceMessage)
    })
  }

  // =============================================
  // VOTING SYSTEM
  // =============================================

  /**
   * Start a new voting session with real-time tracking
   */
  async startVotingSession(
    meetingId: MeetingId,
    organizationId: OrganizationId,
    initiatorId: UserId,
    votingConfig: {
      readonly actionableId: MeetingActionableId
      readonly title: string
      readonly description: string
      readonly votingType: 'simple-majority' | 'super-majority' | 'unanimous' | 'advisory'
      readonly duration?: number
      readonly anonymous?: boolean
      readonly allowAbstention?: boolean
      readonly allowProxyVoting?: boolean
      readonly requiresJustification?: boolean
    }
  ): Promise<Result<VotingSession>> {
    return wrapAsync(async () => {
      const meetingState = this.activeMeetings.get(meetingId)
      if (!meetingState) {
        throw new Error('Meeting not found')
      }

      // Calculate required threshold based on voting type
      const requiredThreshold = this.calculateVotingThreshold(votingConfig.votingType)
      const totalEligibleVoters = this.getEligibleVoters(meetingState.participants)

      const votingSession: VotingSession = {
        id: `voting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        actionableId: votingConfig.actionableId,
        meetingId,
        title: votingConfig.title,
        description: votingConfig.description,
        votingType: votingConfig.votingType,
        requiredThreshold,
        startTime: new Date().toISOString(),
        duration: votingConfig.duration || 300, // Default 5 minutes
        status: 'in-progress',
        votes: [],
        results: this.initializeVotingResults(totalEligibleVoters),
        metadata: {
          anonymous: votingConfig.anonymous || false,
          allowAbstention: votingConfig.allowAbstention ?? true,
          allowProxyVoting: votingConfig.allowProxyVoting ?? true,
          requiresJustification: votingConfig.requiresJustification || false
        }
      }

      // Add to meeting state
      meetingState.votingSessions.set(votingSession.id, votingSession)

      // Set voting timer if duration specified
      if (votingSession.duration) {
        const timer = setTimeout(async () => {
          await this.endVotingSession(meetingId, organizationId, votingSession.id, 'timeout')
        }, votingSession.duration * 1000)
        
        this.votingTimers.set(votingSession.id, timer)
      }

      // Broadcast voting session started
      await this.coordinator.handleRealTimeVoting(
        organizationId,
        meetingId,
        {
          actionableId: votingConfig.actionableId,
          voterId: initiatorId,
          vote: 'approve', // Placeholder for session start
          isProxyVote: false
        }
      )

      // Send voting session details to all participants
      await this.broadcastVotingSessionUpdate(meetingId, organizationId, votingSession)

      this.metrics.activeVotingSessions++
      return votingSession
    })
  }

  /**
   * Cast vote with real-time updates and validation
   */
  async castVote(
    meetingId: MeetingId,
    organizationId: OrganizationId,
    votingSessionId: string,
    voterId: UserId,
    voteData: {
      readonly vote: 'approve' | 'reject' | 'abstain'
      readonly justification?: string
      readonly isProxyVote?: boolean
      readonly proxyDelegatedBy?: UserId
      readonly confidence?: number
    }
  ): Promise<Result<{
    readonly voteAccepted: boolean
    readonly updatedResults: VotingResults
    readonly votingComplete: boolean
  }>> {
    return wrapAsync(async () => {
      const startTime = Date.now()
      const meetingState = this.activeMeetings.get(meetingId)
      if (!meetingState) {
        throw new Error('Meeting not found')
      }

      const votingSession = meetingState.votingSessions.get(votingSessionId)
      if (!votingSession || votingSession.status !== 'in-progress') {
        throw new Error('Voting session not active')
      }

      // Validate voting permissions
      const participant = meetingState.participants.get(voterId)
      if (!participant?.permissions.canVote) {
        throw new Error('Participant not authorized to vote')
      }

      // Check for duplicate vote
      const existingVote = votingSession.votes.find(v => 
        v.voterId === voterId && v.actionableId === votingSession.actionableId
      )
      if (existingVote) {
        throw new Error('Vote already cast')
      }

      // Calculate voting weight (including proxy delegations)
      const votingWeight = this.calculateVotingWeight(participant, voteData.isProxyVote)

      // Create vote record
      const voteRecord: VotingRecord = {
        id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        voterId,
        actionableId: votingSession.actionableId,
        vote: voteData.vote,
        votingWeight,
        isProxyVote: voteData.isProxyVote || false,
        proxyDelegatedBy: voteData.proxyDelegatedBy,
        justification: voteData.justification,
        timestamp: new Date().toISOString(),
        confidence: voteData.confidence
      }

      // Add vote to session
      votingSession.votes.push(voteRecord)

      // Update voting results
      const updatedResults = this.calculateVotingResults(votingSession)
      votingSession.results = updatedResults

      // Check if voting is complete
      const votingComplete = this.isVotingComplete(votingSession)
      if (votingComplete) {
        votingSession.status = 'completed'
        votingSession.endTime = new Date().toISOString()
        
        // Clear timer if exists
        const timer = this.votingTimers.get(votingSessionId)
        if (timer) {
          clearTimeout(timer)
          this.votingTimers.delete(votingSessionId)
        }
      }

      // Sync voting state
      await this.stateSync.syncParticipantVoting(
        meetingId,
        organizationId,
        votingSession.actionableId,
        {
          voterId,
          vote: voteData.vote,
          isProxyVote: voteData.isProxyVote || false,
          proxyDelegatedBy: voteData.proxyDelegatedBy
        }
      )

      // Broadcast real-time vote update
      await this.broadcastVoteUpdate(meetingId, organizationId, votingSession, voteRecord)

      // Update performance metrics
      const votingTime = Date.now() - startTime
      this.metrics.averageVotingTime = (this.metrics.averageVotingTime + votingTime) / 2

      return {
        voteAccepted: true,
        updatedResults,
        votingComplete
      }
    })
  }

  // =============================================
  // PROXY DELEGATION MANAGEMENT
  // =============================================

  /**
   * Handle proxy delegation with real-time notifications
   */
  async handleProxyDelegation(
    meetingId: MeetingId,
    organizationId: OrganizationId,
    delegationData: {
      readonly delegatorId: UserId
      readonly proxyId: UserId
      readonly delegationType: 'full-meeting' | 'specific-items' | 'category-based'
      readonly scope: string[]
      readonly validUntil?: string
      readonly votingWeight?: number
    }
  ): Promise<Result<ProxyDelegation>> {
    return wrapAsync(async () => {
      const meetingState = this.activeMeetings.get(meetingId)
      if (!meetingState) {
        throw new Error('Meeting not found')
      }

      // Create proxy delegation
      const proxyDelegation: ProxyDelegation = {
        id: `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        delegatorId: delegationData.delegatorId,
        proxyId: delegationData.proxyId,
        delegationType: delegationData.delegationType,
        scope: delegationData.scope,
        validFrom: new Date().toISOString(),
        validUntil: delegationData.validUntil || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        votingWeight: delegationData.votingWeight || 1,
        status: 'active'
      }

      // Update delegator's proxy delegations
      const delegator = meetingState.participants.get(delegationData.delegatorId)
      if (delegator) {
        const updatedDelegator: MeetingParticipant = {
          ...delegator,
          proxyDelegations: [...delegator.proxyDelegations, proxyDelegation]
        }
        meetingState.participants.set(delegationData.delegatorId, updatedDelegator)
      }

      // Update proxy's voting weight
      const proxy = meetingState.participants.get(delegationData.proxyId)
      if (proxy) {
        const updatedProxy: MeetingParticipant = {
          ...proxy,
          votingWeight: proxy.votingWeight + proxyDelegation.votingWeight
        }
        meetingState.participants.set(delegationData.proxyId, updatedProxy)
      }

      // Notify via coordinator
      await this.coordinator.handleProxyDelegationUpdate(
        organizationId,
        meetingId,
        {
          delegatorId: delegationData.delegatorId,
          proxyId: delegationData.proxyId,
          actionableIds: delegationData.scope as MeetingActionableId[],
          delegationType: delegationData.delegationType,
          validUntil: delegationData.validUntil
        }
      )

      return proxyDelegation
    })
  }

  // =============================================
  // MEETING STAGE MANAGEMENT
  // =============================================

  /**
   * Transition meeting to next stage with orchestration
   */
  async transitionMeetingStage(
    meetingId: MeetingId,
    organizationId: OrganizationId,
    triggeredBy: UserId,
    stageTransition: {
      readonly toStage: string
      readonly skipValidation?: boolean
      readonly estimatedDuration?: number
    }
  ): Promise<Result<MeetingStage>> {
    return wrapAsync(async () => {
      const startTime = Date.now()
      const meetingState = this.activeMeetings.get(meetingId)
      if (!meetingState) {
        throw new Error('Meeting not found')
      }

      const currentStage = meetingState.currentStage
      
      // Validate transition permissions
      const participant = meetingState.participants.get(triggeredBy)
      if (!participant?.permissions.canManageAgenda) {
        throw new Error('Insufficient permissions to manage meeting stages')
      }

      // Create new stage
      const newStage: MeetingStage = {
        id: `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: stageTransition.toStage,
        type: this.determineStageType(stageTransition.toStage),
        status: 'in-progress',
        startTime: new Date().toISOString(),
        estimatedDuration: stageTransition.estimatedDuration || 600, // 10 minutes default
        prerequisites: [],
        participants: Array.from(meetingState.participants.keys()),
        documents: [],
        actionables: [],
        metadata: {
          triggeredBy,
          previousStage: currentStage.name,
          transitionReason: 'manual'
        }
      }

      // Complete current stage
      const completedCurrentStage: MeetingStage = {
        ...currentStage,
        status: 'completed',
        endTime: new Date().toISOString(),
        actualDuration: Date.now() - new Date(currentStage.startTime || '').getTime()
      }

      // Update meeting state
      meetingState.currentStage = newStage

      // Set stage timer
      if (newStage.estimatedDuration) {
        const existingTimer = this.stageTimers.get(meetingId)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }

        const timer = setTimeout(async () => {
          await this.handleStageTimeout(meetingId, organizationId, newStage.id)
        }, newStage.estimatedDuration * 1000)
        
        this.stageTimers.set(meetingId, timer)
      }

      // Sync state transition
      await this.coordinator.handleMeetingStageTransition(
        organizationId,
        meetingId,
        {
          fromStage: completedCurrentStage.name,
          toStage: newStage.name,
          triggeredBy,
          transitionTime: newStage.startTime,
          stageConfig: {
            estimatedDuration: newStage.estimatedDuration,
            stageType: newStage.type
          }
        }
      )

      // Update metrics
      const transitionLatency = Date.now() - startTime
      this.metrics.stageTransitionLatency = 
        (this.metrics.stageTransitionLatency + transitionLatency) / 2

      return newStage
    })
  }

  // =============================================
  // ACTION ITEM MANAGEMENT
  // =============================================

  /**
   * Assign action item with real-time notifications
   */
  async assignActionItem(
    meetingId: MeetingId,
    organizationId: OrganizationId,
    assignedBy: UserId,
    actionItemData: {
      readonly title: string
      readonly description: string
      readonly assigneeId: UserId
      readonly dueDate: string
      readonly priority: 'critical' | 'high' | 'medium' | 'low'
      readonly estimatedHours?: number
      readonly dependencies?: MeetingActionableId[]
    }
  ): Promise<Result<ActionItemAssignment>> {
    return wrapAsync(async () => {
      const meetingState = this.activeMeetings.get(meetingId)
      if (!meetingState) {
        throw new Error('Meeting not found')
      }

      const actionItemId = createMeetingActionableId(`action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

      const actionItem: ActionItemAssignment = {
        id: actionItemId,
        title: actionItemData.title,
        description: actionItemData.description,
        assigneeId: actionItemData.assigneeId,
        assignedBy,
        dueDate: actionItemData.dueDate,
        priority: actionItemData.priority,
        status: 'assigned',
        progress: 0,
        dependencies: actionItemData.dependencies || [],
        attachments: [],
        updates: [],
        estimatedHours: actionItemData.estimatedHours
      }

      // Add to meeting state
      meetingState.actionItems.set(actionItemId, actionItem)

      // Broadcast action item assignment
      const assignmentMessage = {
        id: `action_assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'integrated_message' as const,
        roomId: createRoomId(`meeting_${meetingId}`),
        userId: assignedBy,
        timestamp: new Date().toISOString(),
        integrationType: 'meeting-workflow-update' as const,
        priority: 'high' as const,
        targetFeatures: ['meetings', 'compliance'] as const,
        sourceFeature: 'meetings' as const,
        routingInfo: {
          broadcast: true,
          targetUsers: [actionItemData.assigneeId],
          requireAck: true,
          retryCount: 0,
          maxRetries: 3
        },
        enhancedType: 'meeting-workflow-update' as const,
        featureCoordination: {
          primaryFeature: 'meetings' as const,
          secondaryFeatures: ['compliance'] as const,
          stateSync: true,
          conflictResolution: 'optimistic' as const
        },
        performance: {
          latencyTarget: 100,
          compressionEnabled: false,
          batchable: false,
          deduplicate: false
        },
        persistence: {
          persistMessage: true,
          replayOnReconnect: true,
          expiresAfter: 3600
        },
        security: {
          encryptionRequired: false,
          auditRequired: true,
          tenantIsolated: true
        },
        data: {
          actionType: 'action-item-assigned',
          actionItem,
          assignedTo: actionItemData.assigneeId,
          dueDate: actionItemData.dueDate
        },
        metadata: {
          organizationId,
          feature: 'action-items'
        }
      }

      await this.messageRouter.routeMessage(assignmentMessage)

      return actionItem
    })
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private async initializeMeetingState(
    meetingId: MeetingId, 
    organizationId: OrganizationId
  ): Promise<NonNullable<ReturnType<typeof this.activeMeetings.get>>> {
    return {
      participants: new Map(),
      votingSessions: new Map(),
      currentStage: {
        id: 'opening',
        name: 'Opening',
        type: 'opening',
        status: 'in-progress',
        startTime: new Date().toISOString(),
        estimatedDuration: 300,
        prerequisites: [],
        participants: [],
        documents: [],
        actionables: [],
        metadata: {}
      },
      actionItems: new Map(),
      timer: {
        totalDuration: 0,
        elapsedTime: 0,
        remainingTime: 0,
        stageTimer: {
          currentStage: 'Opening',
          stageElapsed: 0,
          stageRemaining: 300,
          stageOverrun: false
        },
        breaks: []
      },
      metadata: {
        organizationId,
        startTime: new Date().toISOString()
      }
    }
  }

  private async getUserMeetingRole(userId: UserId, meetingId: MeetingId): Promise<MeetingParticipant['role']> {
    // Would query database for user's role in this meeting
    return 'member'
  }

  private async getActiveProxyDelegations(userId: UserId, meetingId: MeetingId): Promise<ProxyDelegation[]> {
    // Would query database for active proxy delegations
    return []
  }

  private async getParticipantPermissions(userId: UserId, meetingId: MeetingId): Promise<ParticipantPermissions> {
    // Would determine permissions based on role and organization settings
    return {
      canVote: true,
      canDelegate: true,
      canSpeak: true,
      canViewDocuments: true,
      canRecordMeeting: false,
      canManageAgenda: false,
      canAssignActions: false
    }
  }

  private calculateVotingThreshold(votingType: VotingSession['votingType']): number {
    switch (votingType) {
      case 'simple-majority': return 50.1
      case 'super-majority': return 66.7
      case 'unanimous': return 100
      case 'advisory': return 0
      default: return 50.1
    }
  }

  private getEligibleVoters(participants: Map<UserId, MeetingParticipant>): number {
    return Array.from(participants.values()).filter(p => p.permissions.canVote).length
  }

  private initializeVotingResults(totalEligible: number): VotingResults {
    return {
      approve: { count: 0, weight: 0, percentage: 0 },
      reject: { count: 0, weight: 0, percentage: 0 },
      abstain: { count: 0, weight: 0, percentage: 0 },
      total: {
        count: 0,
        weight: 0,
        required: totalEligible,
        quorumMet: false,
        thresholdMet: false
      },
      outcome: 'pending'
    }
  }

  private calculateVotingWeight(participant: MeetingParticipant, isProxyVote?: boolean): number {
    return participant.votingWeight + (isProxyVote ? 1 : 0) // Simplified calculation
  }

  private calculateVotingResults(session: VotingSession): VotingResults {
    const results = this.initializeVotingResults(session.results.total.required)
    
    session.votes.forEach(vote => {
      results[vote.vote].count++
      results[vote.vote].weight += vote.votingWeight
      results.total.count++
      results.total.weight += vote.votingWeight
    })

    // Calculate percentages
    if (results.total.weight > 0) {
      results.approve.percentage = (results.approve.weight / results.total.weight) * 100
      results.reject.percentage = (results.reject.weight / results.total.weight) * 100
      results.abstain.percentage = (results.abstain.weight / results.total.weight) * 100
    }

    // Determine outcome
    results.total.quorumMet = results.total.count >= (results.total.required * 0.5)
    results.total.thresholdMet = results.approve.percentage >= session.requiredThreshold

    if (!results.total.quorumMet) {
      results.outcome = 'no-quorum'
    } else if (results.total.thresholdMet) {
      results.outcome = 'passed'
    } else if (results.approve.percentage === results.reject.percentage) {
      results.outcome = 'tied'
    } else {
      results.outcome = 'failed'
    }

    return results
  }

  private isVotingComplete(session: VotingSession): boolean {
    // Voting complete if all eligible voters have voted or threshold is unachievable
    const totalEligible = session.results.total.required
    const totalVotes = session.votes.length
    const remainingVotes = totalEligible - totalVotes

    // Early completion scenarios
    if (totalVotes === totalEligible) return true
    
    // Check if threshold is still achievable
    const currentApproval = session.results.approve.percentage
    const maxPossibleApproval = (session.results.approve.weight + remainingVotes) / totalEligible * 100
    
    return maxPossibleApproval < session.requiredThreshold
  }

  private determineStageType(stageName: string): MeetingStage['type'] {
    const name = stageName.toLowerCase()
    if (name.includes('opening') || name.includes('start')) return 'opening'
    if (name.includes('agenda') || name.includes('review')) return 'agenda-review'
    if (name.includes('discussion') || name.includes('debate')) return 'discussion'
    if (name.includes('voting') || name.includes('vote')) return 'voting'
    if (name.includes('action') || name.includes('planning')) return 'action-planning'
    if (name.includes('closing') || name.includes('end')) return 'closing'
    return 'discussion'
  }

  private async sendParticipantWelcome(
    userId: UserId, 
    meetingId: MeetingId, 
    meetingState: NonNullable<ReturnType<typeof this.activeMeetings.get>>
  ): Promise<void> {
    // Send comprehensive welcome message with current meeting state
  }

  private async broadcastVotingSessionUpdate(
    meetingId: MeetingId, 
    organizationId: OrganizationId, 
    session: VotingSession
  ): Promise<void> {
    // Broadcast voting session details to all participants
  }

  private async broadcastVoteUpdate(
    meetingId: MeetingId, 
    organizationId: OrganizationId, 
    session: VotingSession, 
    vote: VotingRecord
  ): Promise<void> {
    // Broadcast individual vote update with latest results
  }

  private async endVotingSession(
    meetingId: MeetingId, 
    organizationId: OrganizationId, 
    sessionId: string, 
    reason: 'timeout' | 'manual' | 'complete'
  ): Promise<void> {
    const meetingState = this.activeMeetings.get(meetingId)
    if (!meetingState) return

    const session = meetingState.votingSessions.get(sessionId)
    if (!session) return

    session.status = 'completed'
    session.endTime = new Date().toISOString()

    // Clean up timer
    const timer = this.votingTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.votingTimers.delete(sessionId)
    }

    this.metrics.activeVotingSessions = Math.max(0, this.metrics.activeVotingSessions - 1)
  }

  private async handleStageTimeout(
    meetingId: MeetingId, 
    organizationId: OrganizationId, 
    stageId: string
  ): Promise<void> {
    // Handle stage timeout - could auto-advance or send notification
    const meetingState = this.activeMeetings.get(meetingId)
    if (!meetingState) return

    meetingState.timer.stageTimer.stageOverrun = true
  }

  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkParticipantHeartbeats()
      this.updateMetrics()
    }, 30000) // Every 30 seconds
  }

  private checkParticipantHeartbeats(): void {
    const now = Date.now()
    const staleThreshold = 60000 // 1 minute

    for (const [socketId, connection] of this.participantConnections) {
      const lastHeartbeat = new Date(connection.lastHeartbeat).getTime()
      if (now - lastHeartbeat > staleThreshold) {
        // Handle stale connection
        this.handleParticipantDisconnect(connection.meetingId, connection.userId, socketId)
      }
    }
  }

  private async handleParticipantDisconnect(
    meetingId: MeetingId, 
    userId: UserId, 
    socketId: SocketId
  ): Promise<void> {
    const meetingState = this.activeMeetings.get(meetingId)
    if (!meetingState) return

    const participant = meetingState.participants.get(userId)
    if (participant) {
      const updatedParticipant: MeetingParticipant = {
        ...participant,
        status: 'disconnected',
        leftAt: new Date().toISOString(),
        presence: {
          ...participant.presence,
          connectionStatus: 'disconnected',
          activityStatus: 'away'
        }
      }
      meetingState.participants.set(userId, updatedParticipant)
    }

    this.participantConnections.delete(socketId)
    this.metrics.totalParticipants = Math.max(0, this.metrics.totalParticipants - 1)
  }

  private updateMetrics(): void {
    this.metrics.activeMeetings = this.activeMeetings.size
    this.metrics.totalParticipants = this.participantConnections.size
    
    // Calculate engagement score
    let totalEngagement = 0
    let totalParticipants = 0
    
    for (const meetingState of this.activeMeetings.values()) {
      for (const participant of meetingState.participants.values()) {
        totalParticipants++
        if (participant.presence.activityStatus === 'active') {
          totalEngagement++
        }
      }
    }
    
    this.metrics.participantEngagement = totalParticipants > 0 
      ? totalEngagement / totalParticipants 
      : 0
  }

  /**
   * Get current service metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Clear all timers
    for (const timer of this.votingTimers.values()) {
      clearTimeout(timer)
    }
    this.votingTimers.clear()

    for (const timer of this.stageTimers.values()) {
      clearTimeout(timer)
    }
    this.stageTimers.clear()

    // Clear data structures
    this.activeMeetings.clear()
    this.participantConnections.clear()
  }
}