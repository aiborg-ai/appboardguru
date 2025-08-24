/**
 * Voting-Specific Offline Store
 * Specialized state management for voting and proxy management offline functionality
 */

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useOfflineStore } from './offline-store'
import type { Vote, CastVote, ProxyAssignment, VoteResults } from '../offline-db/schema'
import * as CryptoJS from 'crypto-js'

export interface VotingSession {
  vote_id: string
  is_active: boolean
  start_time: string
  remaining_time: number
  participants_present: string[]
  votes_cast: number
  total_eligible: number
  real_time_results?: VoteResults
  anonymous_mode: boolean
}

export interface VoteOption {
  id: string
  text: string
  description?: string
  supporting_documents?: string[]
}

export interface VotingBallot {
  id: string
  vote_id: string
  voter_id: string
  options: VoteOption[]
  selected_option?: string
  cast_at?: string
  encrypted_ballot?: string
  signature?: string
  is_proxy_vote: boolean
  proxy_for?: string
}

export interface ProxyRequest {
  id: string
  assignor_id: string
  assignee_id: string
  assignor_name: string
  assignee_name: string
  scope: 'all' | 'meeting' | 'specific_vote'
  meeting_id?: string
  vote_id?: string
  message?: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expires_at: string
  created_at: string
}

export interface VotingStoreState {
  // Active voting sessions
  activeSessions: VotingSession[]
  
  // Vote ballots for offline voting
  ballots: Record<string, VotingBallot> // vote_id -> ballot
  
  // Proxy management
  proxyRequests: ProxyRequest[]
  activeProxies: ProxyAssignment[]
  
  // Voting history
  votingHistory: {
    vote_id: string
    vote_title: string
    user_choice: string
    cast_at: string
    is_proxy: boolean
    result: string
  }[]
  
  // Emergency voting
  emergencyVotes: {
    vote_id: string
    priority: 'high' | 'critical'
    deadline: string
    status: 'pending' | 'cast' | 'expired'
  }[]
  
  // Offline voting queue
  offlineQueue: {
    votes: string[] // Vote IDs pending sync
    proxies: string[] // Proxy assignments pending sync
    ballots: string[] // Ballots pending submission
  }
  
  // Voting preferences
  preferences: {
    show_real_time_results: boolean
    enable_vote_reminders: boolean
    reminder_intervals: number[] // Minutes before deadline
    require_confirmation: boolean
    enable_proxy_notifications: boolean
    auto_accept_trusted_proxies: boolean
    trusted_proxy_users: string[]
    voting_privacy_level: 'public' | 'private' | 'anonymous'
  }
  
  actions: {
    // Vote lifecycle
    initializeVotingSession: (voteId: string) => Promise<void>
    endVotingSession: (voteId: string) => Promise<void>
    
    // Ballot management
    createBallot: (voteId: string) => Promise<VotingBallot>
    castVote: (voteId: string, choice: string, isProxy?: boolean, proxyFor?: string) => Promise<void>
    updateBallot: (ballotId: string, updates: Partial<VotingBallot>) => Promise<void>
    submitBallot: (ballotId: string) => Promise<void>
    
    // Proxy management
    sendProxyRequest: (assigneeId: string, scope: ProxyRequest['scope'], options?: {
      meetingId?: string
      voteId?: string
      message?: string
      expiresIn?: number // Hours
    }) => Promise<void>
    respondToProxyRequest: (requestId: string, response: 'accept' | 'decline') => Promise<void>
    revokeProxy: (assigneeId: string, scope?: ProxyRequest['scope']) => Promise<void>
    getActiveProxies: (userId?: string) => ProxyAssignment[]
    getProxyCapabilities: (userId: string, voteId: string) => {
      canVoteAsProxy: boolean
      proxiesFor: string[]
      hasProxy: boolean
      proxyUserId?: string
    }
    
    // Voting actions
    getVoteEligibility: (voteId: string, userId?: string) => Promise<{
      eligible: boolean
      reasons: string[]
      hasAlreadyVoted: boolean
      hasProxy: boolean
      canVoteAsProxy: boolean
    }>
    calculateResults: (voteId: string, includePartial?: boolean) => Promise<VoteResults>
    getVotingDeadline: (voteId: string) => { deadline: Date; timeRemaining: number; isExpired: boolean }
    
    // Emergency voting
    flagEmergencyVote: (voteId: string, priority: 'high' | 'critical') => Promise<void>
    processEmergencyVotes: () => Promise<void>
    
    // Offline capabilities
    queueOfflineVote: (voteId: string, choice: string, encryptedBallot?: string) => Promise<void>
    syncOfflineVotes: () => Promise<{ success: number; failed: number }>
    getOfflineVotingCapability: (voteId: string) => 'full' | 'limited' | 'none'
    
    // Security and encryption
    encryptBallot: (ballot: VotingBallot, publicKey?: string) => string
    verifyBallotIntegrity: (ballotId: string) => Promise<boolean>
    generateVoteSignature: (ballot: VotingBallot) => string
    
    // Compliance and audit
    exportVotingRecord: (voteId: string, format: 'json' | 'pdf' | 'csv') => Promise<Blob>
    getAuditTrail: (voteId: string) => Promise<{
      timestamp: string
      action: string
      user_id: string
      details: Record<string, any>
    }[]>
    validateVoteCompliance: (voteId: string) => Promise<{
      isCompliant: boolean
      issues: string[]
      recommendations: string[]
    }>
    
    // Analytics and reporting
    getVotingStatistics: (timeRange?: { from: Date; to: Date }) => Promise<{
      total_votes: number
      participation_rate: number
      proxy_usage_rate: number
      average_voting_time: number
      compliance_score: number
    }>
    getUserVotingPattern: (userId: string) => Promise<{
      total_eligible: number
      total_cast: number
      participation_rate: number
      proxy_frequency: number
      voting_speed: number // Average time to cast vote
    }>
    
    // Utilities
    updatePreferences: (updates: Partial<VotingStoreState['preferences']>) => void
    clearVotingData: (olderThan?: Date) => Promise<void>
    importVotingData: (data: any) => Promise<void>
  }
}

export const useVotingStore = create<VotingStoreState>()(
  persist(
    immer((set, get) => ({
      activeSessions: [],
      ballots: {},
      proxyRequests: [],
      activeProxies: [],
      votingHistory: [],
      emergencyVotes: [],
      
      offlineQueue: {
        votes: [],
        proxies: [],
        ballots: []
      },
      
      preferences: {
        show_real_time_results: false,
        enable_vote_reminders: true,
        reminder_intervals: [60, 15, 5], // 1 hour, 15 mins, 5 mins before deadline
        require_confirmation: true,
        enable_proxy_notifications: true,
        auto_accept_trusted_proxies: false,
        trusted_proxy_users: [],
        voting_privacy_level: 'private'
      },
      
      actions: {
        initializeVotingSession: async (voteId: string): Promise<void> => {
          const offlineStore = useOfflineStore.getState()
          const vote = await offlineStore.actions.loadEntity<Vote>('votes', voteId)
          
          if (!vote) throw new Error('Vote not found')
          
          const session: VotingSession = {
            vote_id: voteId,
            is_active: vote.status === 'open',
            start_time: vote.start_time,
            remaining_time: new Date(vote.end_time).getTime() - Date.now(),
            participants_present: vote.eligible_voters,
            votes_cast: vote.cast_votes.length,
            total_eligible: vote.eligible_voters.length,
            anonymous_mode: vote.is_anonymous
          }
          
          set(state => {
            const existingIndex = state.activeSessions.findIndex(s => s.vote_id === voteId)
            if (existingIndex >= 0) {
              state.activeSessions[existingIndex] = session
            } else {
              state.activeSessions.push(session)
            }
          })
          
          // Create ballot if user is eligible
          const currentUserId = 'current_user' // TODO: Get from auth
          if (vote.eligible_voters.includes(currentUserId)) {
            await get().actions.createBallot(voteId)
          }
        },
        
        endVotingSession: async (voteId: string): Promise<void> => {
          const offlineStore = useOfflineStore.getState()
          
          // Update vote status
          await offlineStore.actions.saveEntity('votes', {
            id: voteId,
            status: 'closed',
            updated_at: new Date().toISOString()
          } as any)
          
          // Remove from active sessions
          set(state => {
            state.activeSessions = state.activeSessions.filter(s => s.vote_id !== voteId)
          })
          
          // Calculate final results
          await get().actions.calculateResults(voteId, false)
        },
        
        createBallot: async (voteId: string): Promise<VotingBallot> => {
          const offlineStore = useOfflineStore.getState()
          const vote = await offlineStore.actions.loadEntity<Vote>('votes', voteId)
          
          if (!vote) throw new Error('Vote not found')
          
          const currentUserId = 'current_user' // TODO: Get from auth
          const ballotId = `ballot_${voteId}_${currentUserId}`
          
          const ballot: VotingBallot = {
            id: ballotId,
            vote_id: voteId,
            voter_id: currentUserId,
            options: [
              { id: 'for', text: 'For', description: 'Vote in favor of the motion' },
              { id: 'against', text: 'Against', description: 'Vote against the motion' }
            ],
            is_proxy_vote: false
          }
          
          if (vote.allow_abstention) {
            ballot.options.push({
              id: 'abstain',
              text: 'Abstain',
              description: 'Choose not to vote either way'
            })
          }
          
          set(state => {
            state.ballots[ballotId] = ballot
          })
          
          return ballot
        },
        
        castVote: async (
          voteId: string, 
          choice: string, 
          isProxy = false, 
          proxyFor?: string
        ): Promise<void> => {
          const offlineStore = useOfflineStore.getState()
          const vote = await offlineStore.actions.loadEntity<Vote>('votes', voteId)
          
          if (!vote) throw new Error('Vote not found')
          
          const currentUserId = 'current_user' // TODO: Get from auth
          const ballotId = `ballot_${voteId}_${currentUserId}`
          const ballot = get().ballots[ballotId]
          
          if (!ballot) throw new Error('Ballot not found')
          
          // Check eligibility
          const eligibility = await get().actions.getVoteEligibility(voteId, currentUserId)
          if (!eligibility.eligible) {
            throw new Error(`Not eligible to vote: ${eligibility.reasons.join(', ')}`)
          }
          
          if (eligibility.hasAlreadyVoted && !isProxy) {
            throw new Error('Vote already cast')
          }
          
          // Create cast vote record
          const castVote: CastVote = {
            id: `cast_vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            voter_id: currentUserId,
            vote_choice: choice as any,
            is_proxy: isProxy,
            proxy_for: proxyFor,
            cast_at: new Date().toISOString()
          }
          
          // Encrypt ballot if required
          if (vote.is_anonymous || get().preferences.voting_privacy_level === 'anonymous') {
            castVote.encrypted_ballot = get().actions.encryptBallot(ballot)
          }
          
          // Generate signature for verification
          castVote.signature = get().actions.generateVoteSignature({
            ...ballot,
            selected_option: choice,
            cast_at: castVote.cast_at
          })
          
          // Update ballot
          set(state => {
            const ballot = state.ballots[ballotId]
            if (ballot) {
              ballot.selected_option = choice
              ballot.cast_at = castVote.cast_at
              ballot.encrypted_ballot = castVote.encrypted_ballot
              ballot.signature = castVote.signature
              ballot.is_proxy_vote = isProxy
              ballot.proxy_for = proxyFor
            }
          })
          
          // Update vote record
          const updatedCastVotes = [...vote.cast_votes, castVote]
          await offlineStore.actions.saveEntity('votes', {
            ...vote,
            cast_votes: updatedCastVotes,
            updated_at: new Date().toISOString()
          })
          
          // Add to voting history
          set(state => {
            state.votingHistory.push({
              vote_id: voteId,
              vote_title: vote.title,
              user_choice: choice,
              cast_at: castVote.cast_at,
              is_proxy: isProxy,
              result: 'pending'
            })
          })
          
          // Update active session
          set(state => {
            const session = state.activeSessions.find(s => s.vote_id === voteId)
            if (session) {
              session.votes_cast += 1
            }
          })
          
          // Queue for offline sync if needed
          if (!navigator.onLine) {
            set(state => {
              if (!state.offlineQueue.ballots.includes(ballotId)) {
                state.offlineQueue.ballots.push(ballotId)
              }
            })
          }
        },
        
        updateBallot: async (ballotId: string, updates: Partial<VotingBallot>): Promise<void> => {
          set(state => {
            const ballot = state.ballots[ballotId]
            if (ballot) {
              Object.assign(ballot, updates)
            }
          })
        },
        
        submitBallot: async (ballotId: string): Promise<void> => {
          const ballot = get().ballots[ballotId]
          if (!ballot) throw new Error('Ballot not found')
          
          if (!ballot.selected_option) {
            throw new Error('No option selected')
          }
          
          await get().actions.castVote(
            ballot.vote_id,
            ballot.selected_option,
            ballot.is_proxy_vote,
            ballot.proxy_for
          )
        },
        
        sendProxyRequest: async (
          assigneeId: string,
          scope: ProxyRequest['scope'],
          options: {
            meetingId?: string
            voteId?: string
            message?: string
            expiresIn?: number // Hours
          } = {}
        ): Promise<void> => {
          const currentUserId = 'current_user' // TODO: Get from auth
          const expiresIn = options.expiresIn || 24 // Default 24 hours
          
          const request: ProxyRequest = {
            id: `proxy_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            assignor_id: currentUserId,
            assignee_id: assigneeId,
            assignor_name: 'Current User', // TODO: Get actual name
            assignee_name: 'Assignee User', // TODO: Get actual name
            scope,
            meeting_id: options.meetingId,
            vote_id: options.voteId,
            message: options.message,
            status: 'pending',
            expires_at: new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          }
          
          set(state => {
            state.proxyRequests.push(request)
          })
          
          // Queue for sync if offline
          if (!navigator.onLine) {
            set(state => {
              if (!state.offlineQueue.proxies.includes(request.id)) {
                state.offlineQueue.proxies.push(request.id)
              }
            })
          } else {
            // Send notification in production
            console.log(`Proxy request sent to ${assigneeId}`)
          }
        },
        
        respondToProxyRequest: async (requestId: string, response: 'accept' | 'decline'): Promise<void> => {
          const request = get().proxyRequests.find(r => r.id === requestId)
          if (!request) throw new Error('Proxy request not found')
          
          set(state => {
            const req = state.proxyRequests.find(r => r.id === requestId)
            if (req) {
              req.status = response === 'accept' ? 'accepted' : 'declined'
            }
          })
          
          if (response === 'accept') {
            // Create proxy assignment
            const assignment: ProxyAssignment = {
              assignor_id: request.assignor_id,
              assignee_id: request.assignee_id,
              scope: request.scope,
              meeting_id: request.meeting_id,
              vote_id: request.vote_id,
              valid_from: new Date().toISOString(),
              valid_until: request.expires_at,
              created_at: new Date().toISOString()
            }
            
            set(state => {
              state.activeProxies.push(assignment)
            })
          }
        },
        
        revokeProxy: async (assigneeId: string, scope?: ProxyRequest['scope']): Promise<void> => {
          set(state => {
            state.activeProxies = state.activeProxies.filter(proxy =>
              !(proxy.assignee_id === assigneeId && (!scope || proxy.scope === scope))
            )
          })
        },
        
        getActiveProxies: (userId?: string): ProxyAssignment[] => {
          const currentUserId = userId || 'current_user'
          const now = new Date().toISOString()
          
          return get().activeProxies.filter(proxy =>
            (proxy.assignor_id === currentUserId || proxy.assignee_id === currentUserId) &&
            proxy.valid_until > now
          )
        },
        
        getProxyCapabilities: (userId: string, voteId: string) => {
          const proxies = get().getActiveProxies(userId)
          const now = new Date().toISOString()
          
          const validProxies = proxies.filter(proxy =>
            proxy.valid_from <= now &&
            proxy.valid_until > now &&
            (proxy.scope === 'all' || proxy.vote_id === voteId)
          )
          
          const proxiesFor = validProxies
            .filter(p => p.assignee_id === userId)
            .map(p => p.assignor_id)
          
          const hasProxy = validProxies.some(p => p.assignor_id === userId)
          const proxyUser = validProxies.find(p => p.assignor_id === userId)
          
          return {
            canVoteAsProxy: proxiesFor.length > 0,
            proxiesFor,
            hasProxy,
            proxyUserId: proxyUser?.assignee_id
          }
        },
        
        getVoteEligibility: async (voteId: string, userId?: string) => {
          const currentUserId = userId || 'current_user'
          const offlineStore = useOfflineStore.getState()
          const vote = await offlineStore.actions.loadEntity<Vote>('votes', voteId)
          
          if (!vote) {
            return {
              eligible: false,
              reasons: ['Vote not found'],
              hasAlreadyVoted: false,
              hasProxy: false,
              canVoteAsProxy: false
            }
          }
          
          const reasons: string[] = []
          let eligible = true
          
          // Check if user is in eligible voters list
          if (!vote.eligible_voters.includes(currentUserId)) {
            eligible = false
            reasons.push('User not in eligible voters list')
          }
          
          // Check if voting period is active
          const now = new Date()
          const startTime = new Date(vote.start_time)
          const endTime = new Date(vote.end_time)
          
          if (now < startTime) {
            eligible = false
            reasons.push('Voting has not started yet')
          }
          
          if (now > endTime) {
            eligible = false
            reasons.push('Voting period has ended')
          }
          
          // Check if vote is open
          if (vote.status !== 'open') {
            eligible = false
            reasons.push(`Vote status is ${vote.status}`)
          }
          
          // Check if already voted
          const hasAlreadyVoted = vote.cast_votes.some(castVote => 
            castVote.voter_id === currentUserId && !castVote.is_proxy
          )
          
          // Check proxy capabilities
          const proxyCapabilities = get().actions.getProxyCapabilities(currentUserId, voteId)
          
          return {
            eligible,
            reasons,
            hasAlreadyVoted,
            hasProxy: proxyCapabilities.hasProxy,
            canVoteAsProxy: proxyCapabilities.canVoteAsProxy
          }
        },
        
        calculateResults: async (voteId: string, includePartial = false): Promise<VoteResults> => {
          const offlineStore = useOfflineStore.getState()
          const vote = await offlineStore.actions.loadEntity<Vote>('votes', voteId)
          
          if (!vote) throw new Error('Vote not found')
          
          const castVotes = includePartial ? vote.cast_votes : vote.cast_votes
          const totalEligible = vote.eligible_voters.length
          const totalCast = castVotes.length
          
          const forCount = castVotes.filter(v => v.vote_choice === 'for').length
          const againstCount = castVotes.filter(v => v.vote_choice === 'against').length
          const abstainCount = castVotes.filter(v => v.vote_choice === 'abstain').length
          const proxyCount = castVotes.filter(v => v.is_proxy).length
          
          const percentageFor = totalCast > 0 ? (forCount / totalCast) * 100 : 0
          const percentageAgainst = totalCast > 0 ? (againstCount / totalCast) * 100 : 0
          const percentageAbstain = totalCast > 0 ? (abstainCount / totalCast) * 100 : 0
          
          // Determine quorum (simplified - would be configurable)
          const quorumThreshold = Math.ceil(totalEligible * 0.5) // 50% quorum
          const quorumMet = totalCast >= quorumThreshold
          
          // Determine result based on voting method
          let result: VoteResults['result'] = 'pending'
          
          if (vote.status === 'closed') {
            switch (vote.voting_method) {
              case 'simple_majority':
                if (quorumMet) {
                  result = forCount > againstCount ? 'passed' : 'failed'
                  if (forCount === againstCount) result = 'tied'
                } else {
                  result = 'failed' // Failed due to lack of quorum
                }
                break
              
              case 'super_majority':
                const requiredPercentage = vote.required_threshold || 66.67
                if (quorumMet && percentageFor >= requiredPercentage) {
                  result = 'passed'
                } else {
                  result = 'failed'
                }
                break
              
              case 'unanimous':
                if (quorumMet && againstCount === 0 && abstainCount === 0) {
                  result = 'passed'
                } else {
                  result = 'failed'
                }
                break
            }
          }
          
          const results: VoteResults = {
            total_eligible: totalEligible,
            total_cast: totalCast,
            for_count: forCount,
            against_count: againstCount,
            abstain_count: abstainCount,
            proxy_count: proxyCount,
            percentage_for: Math.round(percentageFor * 100) / 100,
            percentage_against: Math.round(percentageAgainst * 100) / 100,
            percentage_abstain: Math.round(percentageAbstain * 100) / 100,
            quorum_met: quorumMet,
            result,
            calculated_at: new Date().toISOString()
          }
          
          // Update vote with results
          await offlineStore.actions.saveEntity('votes', {
            ...vote,
            results,
            updated_at: new Date().toISOString()
          })
          
          // Update voting history with results
          set(state => {
            state.votingHistory.forEach(history => {
              if (history.vote_id === voteId) {
                history.result = result
              }
            })
          })
          
          return results
        },
        
        getVotingDeadline: (voteId: string) => {
          const session = get().activeSessions.find(s => s.vote_id === voteId)
          
          if (session) {
            const deadline = new Date(session.start_time)
            deadline.setTime(deadline.getTime() + session.remaining_time)
            const timeRemaining = deadline.getTime() - Date.now()
            
            return {
              deadline,
              timeRemaining: Math.max(0, timeRemaining),
              isExpired: timeRemaining <= 0
            }
          }
          
          return {
            deadline: new Date(),
            timeRemaining: 0,
            isExpired: true
          }
        },
        
        flagEmergencyVote: async (voteId: string, priority: 'high' | 'critical'): Promise<void> => {
          const deadline = new Date(Date.now() + (priority === 'critical' ? 2 : 6) * 60 * 60 * 1000) // 2 or 6 hours
          
          set(state => {
            const existingIndex = state.emergencyVotes.findIndex(ev => ev.vote_id === voteId)
            const emergencyVote = {
              vote_id: voteId,
              priority,
              deadline: deadline.toISOString(),
              status: 'pending' as const
            }
            
            if (existingIndex >= 0) {
              state.emergencyVotes[existingIndex] = emergencyVote
            } else {
              state.emergencyVotes.push(emergencyVote)
            }
          })
          
          // Send emergency notifications in production
          console.log(`Emergency vote flagged: ${voteId} (${priority})`)
        },
        
        processEmergencyVotes: async (): Promise<void> => {
          const now = new Date()
          
          set(state => {
            state.emergencyVotes.forEach(emergency => {
              if (new Date(emergency.deadline) <= now && emergency.status === 'pending') {
                emergency.status = 'expired'
              }
            })
          })
        },
        
        queueOfflineVote: async (voteId: string, choice: string, encryptedBallot?: string): Promise<void> => {
          const currentUserId = 'current_user'
          const ballotId = `ballot_${voteId}_${currentUserId}`
          
          // Create offline ballot
          const ballot: VotingBallot = {
            id: ballotId,
            vote_id: voteId,
            voter_id: currentUserId,
            options: [], // Would be populated from vote data
            selected_option: choice,
            cast_at: new Date().toISOString(),
            encrypted_ballot: encryptedBallot,
            is_proxy_vote: false
          }
          
          set(state => {
            state.ballots[ballotId] = ballot
            if (!state.offlineQueue.ballots.includes(ballotId)) {
              state.offlineQueue.ballots.push(ballotId)
            }
          })
        },
        
        syncOfflineVotes: async (): Promise<{ success: number; failed: number }> => {
          const { ballots: queuedBallots } = get().offlineQueue
          let success = 0
          let failed = 0
          
          for (const ballotId of queuedBallots) {
            try {
              const ballot = get().ballots[ballotId]
              if (ballot && ballot.selected_option) {
                await get().actions.castVote(
                  ballot.vote_id,
                  ballot.selected_option,
                  ballot.is_proxy_vote,
                  ballot.proxy_for
                )
                success++
                
                // Remove from queue
                set(state => {
                  state.offlineQueue.ballots = state.offlineQueue.ballots.filter(id => id !== ballotId)
                })
              }
            } catch (error) {
              console.error(`Failed to sync ballot ${ballotId}:`, error)
              failed++
            }
          }
          
          return { success, failed }
        },
        
        getOfflineVotingCapability: (voteId: string): 'full' | 'limited' | 'none' => {
          // Check if vote data is cached and accessible offline
          const ballot = Object.values(get().ballots).find(b => b.vote_id === voteId)
          
          if (ballot) {
            return 'full' // Can vote completely offline
          }
          
          // Check if partial data is available
          const session = get().activeSessions.find(s => s.vote_id === voteId)
          if (session) {
            return 'limited' // Can prepare vote but needs connection to submit
          }
          
          return 'none' // No offline capability
        },
        
        encryptBallot: (ballot: VotingBallot, publicKey?: string): string => {
          const ballotData = JSON.stringify({
            vote_id: ballot.vote_id,
            voter_id: ballot.voter_id,
            selected_option: ballot.selected_option,
            cast_at: ballot.cast_at,
            is_proxy_vote: ballot.is_proxy_vote,
            proxy_for: ballot.proxy_for
          })
          
          // Use AES encryption with a derived key
          const encryptionKey = publicKey || 'default_voting_key' // Would use proper key management
          return CryptoJS.AES.encrypt(ballotData, encryptionKey).toString()
        },
        
        verifyBallotIntegrity: async (ballotId: string): Promise<boolean> => {
          const ballot = get().ballots[ballotId]
          if (!ballot) return false
          
          // Verify signature matches ballot content
          const expectedSignature = get().actions.generateVoteSignature(ballot)
          return ballot.signature === expectedSignature
        },
        
        generateVoteSignature: (ballot: VotingBallot): string => {
          const signatureData = `${ballot.vote_id}:${ballot.voter_id}:${ballot.selected_option}:${ballot.cast_at}`
          return CryptoJS.SHA256(signatureData).toString()
        },
        
        exportVotingRecord: async (voteId: string, format: 'json' | 'pdf' | 'csv'): Promise<Blob> => {
          const offlineStore = useOfflineStore.getState()
          const vote = await offlineStore.actions.loadEntity<Vote>('votes', voteId)
          
          if (!vote) throw new Error('Vote not found')
          
          if (format === 'json') {
            return new Blob([JSON.stringify(vote, null, 2)], { type: 'application/json' })
          }
          
          // For CSV format
          if (format === 'csv') {
            const csvData = [
              'Voter ID,Choice,Cast At,Is Proxy,Proxy For',
              ...vote.cast_votes.map(cv => 
                `${cv.voter_id},${cv.vote_choice},${cv.cast_at},${cv.is_proxy},${cv.proxy_for || ''}`
              )
            ].join('\n')
            
            return new Blob([csvData], { type: 'text/csv' })
          }
          
          // PDF would require a PDF generation library
          return new Blob(['PDF not implemented'], { type: 'application/pdf' })
        },
        
        getAuditTrail: async (voteId: string) => {
          // Would retrieve from audit logs in production
          return [
            {
              timestamp: new Date().toISOString(),
              action: 'vote_created',
              user_id: 'system',
              details: { vote_id: voteId }
            }
          ]
        },
        
        validateVoteCompliance: async (voteId: string) => {
          const offlineStore = useOfflineStore.getState()
          const vote = await offlineStore.actions.loadEntity<Vote>('votes', voteId)
          
          if (!vote) {
            return {
              isCompliant: false,
              issues: ['Vote not found'],
              recommendations: ['Verify vote ID']
            }
          }
          
          const issues: string[] = []
          const recommendations: string[] = []
          
          // Check quorum requirements
          if (vote.results && !vote.results.quorum_met) {
            issues.push('Quorum not met')
            recommendations.push('Consider extending voting period or reducing quorum threshold')
          }
          
          // Check voting period
          const votingPeriod = new Date(vote.end_time).getTime() - new Date(vote.start_time).getTime()
          const minPeriod = 24 * 60 * 60 * 1000 // 24 hours
          
          if (votingPeriod < minPeriod) {
            issues.push('Voting period less than 24 hours')
            recommendations.push('Consider extending voting period for better participation')
          }
          
          // Check participation rate
          const participationRate = vote.results ? (vote.results.total_cast / vote.results.total_eligible) * 100 : 0
          if (participationRate < 50) {
            issues.push('Low participation rate')
            recommendations.push('Send reminders to increase participation')
          }
          
          return {
            isCompliant: issues.length === 0,
            issues,
            recommendations
          }
        },
        
        getVotingStatistics: async (timeRange?: { from: Date; to: Date }) => {
          const history = get().votingHistory
          const relevantHistory = timeRange 
            ? history.filter(h => {
                const castDate = new Date(h.cast_at)
                return castDate >= timeRange.from && castDate <= timeRange.to
              })
            : history
          
          const totalVotes = relevantHistory.length
          const proxyVotes = relevantHistory.filter(h => h.is_proxy).length
          
          return {
            total_votes: totalVotes,
            participation_rate: 85, // Would calculate from actual data
            proxy_usage_rate: totalVotes > 0 ? (proxyVotes / totalVotes) * 100 : 0,
            average_voting_time: 300, // 5 minutes - would calculate from actual data
            compliance_score: 92 // Would calculate based on compliance checks
          }
        },
        
        getUserVotingPattern: async (userId: string) => {
          const history = get().votingHistory
          const userVotes = history.filter(h => h.user_choice) // User actually voted
          const proxyVotes = history.filter(h => h.is_proxy)
          
          return {
            total_eligible: history.length,
            total_cast: userVotes.length,
            participation_rate: history.length > 0 ? (userVotes.length / history.length) * 100 : 0,
            proxy_frequency: userVotes.length > 0 ? (proxyVotes.length / userVotes.length) * 100 : 0,
            voting_speed: 180 // 3 minutes average - would calculate from timing data
          }
        },
        
        updatePreferences: (updates: Partial<VotingStoreState['preferences']>): void => {
          set(state => {
            state.preferences = { ...state.preferences, ...updates }
          })
        },
        
        clearVotingData: async (olderThan?: Date): Promise<void> => {
          const cutoffDate = olderThan || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days
          
          set(state => {
            // Clear old voting history
            state.votingHistory = state.votingHistory.filter(h => 
              new Date(h.cast_at) > cutoffDate
            )
            
            // Clear old proxy requests
            state.proxyRequests = state.proxyRequests.filter(r => 
              new Date(r.created_at) > cutoffDate
            )
            
            // Clear expired emergency votes
            state.emergencyVotes = state.emergencyVotes.filter(ev => 
              new Date(ev.deadline) > cutoffDate
            )
          })
        },
        
        importVotingData: async (data: any): Promise<void> => {
          // Implementation for importing voting data
          console.log('Importing voting data:', data)
        }
      }
    })),
    {
      name: 'voting-store',
      partialize: (state) => ({
        ballots: state.ballots,
        proxyRequests: state.proxyRequests,
        activeProxies: state.activeProxies,
        votingHistory: state.votingHistory,
        preferences: state.preferences,
        offlineQueue: state.offlineQueue
      })
    }
  )
)