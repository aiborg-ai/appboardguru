import { createStore, createSelectors } from './store-config'
import { LoadingState, ErrorState, StoreSlice, OptimisticAction } from './types'
import { 
  MeetingResolution, 
  ResolutionWithVotes,
  CreateResolutionRequest, 
  UpdateResolutionRequest,
  CastVoteRequest,
  ResolutionVote,
  ResolutionStatus,
  VotingMethod,
  VoteChoice,
  ResolutionsAnalytics,
  ResolutionFilters
} from '../../types/meetings'
import { MeetingResolutionService } from '../services/meeting-resolution.service'
import { WebSocketService } from '../services/websocket.service'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { nanoid } from 'nanoid'

// ============================================================================
// STATE INTERFACE
// ============================================================================

export interface ResolutionsState extends StoreSlice {
  // Core data
  resolutions: Record<string, ResolutionWithVotes>
  analytics: ResolutionsAnalytics | null
  
  // Current state
  currentResolutionId: string | null
  activeVotes: Record<string, boolean> // resolutionId -> voting in progress
  userVotes: Record<string, VoteChoice> // resolutionId -> user's vote choice
  
  // UI state
  loading: LoadingState
  errors: ErrorState
  filters: ResolutionFilters
  sortBy: 'createdAt' | 'title' | 'status' | 'priority'
  sortOrder: 'asc' | 'desc'
  
  // Real-time state
  isConnected: boolean
  lastSyncTime: number
  syncErrors: string[]
  
  // Optimistic updates
  optimisticActions: OptimisticAction<MeetingResolution>[]
  
  // Pagination
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  
  // Actions - Resolution Management
  createResolution: (request: CreateResolutionRequest) => Promise<MeetingResolution | null>
  updateResolution: (id: string, updates: UpdateResolutionRequest) => Promise<MeetingResolution | null>
  deleteResolution: (id: string) => Promise<boolean>
  
  // Actions - Voting Management
  startVoting: (resolutionId: string, votingMethod: VotingMethod) => Promise<boolean>
  castVote: (voteRequest: CastVoteRequest) => Promise<{ vote: ResolutionVote; resolution: MeetingResolution } | null>
  concludeVoting: (resolutionId: string) => Promise<boolean>
  
  // Actions - Data Fetching
  fetchResolutions: (meetingId?: string, filters?: ResolutionFilters) => Promise<void>
  fetchResolution: (id: string) => Promise<MeetingResolution | null>
  fetchAnalytics: (organizationId: string, timeframe?: { from: string; to: string }) => Promise<void>
  
  // Actions - Real-time & Sync
  enableRealTimeSync: (organizationId: string) => Promise<void>
  disableRealTimeSync: () => Promise<void>
  forceSyncResolutions: () => Promise<void>
  
  // Actions - UI State Management
  setCurrentResolution: (id: string | null) => void
  updateFilters: (filters: Partial<ResolutionFilters>) => void
  updateSort: (sortBy: ResolutionsState['sortBy'], sortOrder: ResolutionsState['sortOrder']) => void
  clearErrors: () => void
  
  // Actions - Optimistic Updates
  addOptimisticAction: (action: OptimisticAction<MeetingResolution>) => void
  removeOptimisticAction: (actionId: string) => void
  rollbackOptimisticAction: (actionId: string) => void
  
  // Internal actions
  setLoading: (key: string, loading: boolean) => void
  setError: (key: string, error: string | null) => void
  setResolution: (resolution: ResolutionWithVotes) => void
  updateResolutionVotes: (resolutionId: string, votes: ResolutionVote[]) => void
  cleanup: () => void
}

// ============================================================================
// COMPUTED SELECTORS
// ============================================================================

export const resolutionSelectors = {
  // Basic selectors
  getAllResolutions: (state: ResolutionsState) => Object.values(state.resolutions),
  
  getResolutionById: (state: ResolutionsState, id: string) => state.resolutions[id] || null,
  
  getCurrentResolution: (state: ResolutionsState) => 
    state.currentResolutionId ? state.resolutions[state.currentResolutionId] : null,
  
  // Filtered selectors
  getFilteredResolutions: (state: ResolutionsState) => {
    let resolutions = Object.values(state.resolutions)
    
    if (state.filters.status) {
      resolutions = resolutions.filter(r => r.status === state.filters.status)
    }
    
    if (state.filters.resolutionType) {
      resolutions = resolutions.filter(r => r.resolutionType === state.filters.resolutionType)
    }
    
    if (state.filters.meetingId) {
      resolutions = resolutions.filter(r => r.meetingId === state.filters.meetingId)
    }
    
    if (state.filters.searchTerm) {
      const term = state.filters.searchTerm.toLowerCase()
      resolutions = resolutions.filter(r => 
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.resolutionText.toLowerCase().includes(term)
      )
    }
    
    // Apply sorting
    resolutions.sort((a, b) => {
      const field = state.sortBy
      const order = state.sortOrder === 'asc' ? 1 : -1
      
      if (field === 'createdAt') {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order
      } else if (field === 'priority') {
        return (a.priorityLevel - b.priorityLevel) * order
      } else {
        return a[field].localeCompare(b[field]) * order
      }
    })
    
    return resolutions
  },
  
  // Status-based selectors
  getResolutionsByStatus: (state: ResolutionsState, status: ResolutionStatus) =>
    Object.values(state.resolutions).filter(r => r.status === status),
  
  getPendingResolutions: (state: ResolutionsState) =>
    Object.values(state.resolutions).filter(r => r.status === 'proposed'),
  
  getPassedResolutions: (state: ResolutionsState) =>
    Object.values(state.resolutions).filter(r => r.status === 'passed'),
  
  // Voting selectors
  getActiveVotingResolutions: (state: ResolutionsState) =>
    Object.values(state.resolutions).filter(r => 
      r.status === 'proposed' && r.votingMethod && state.activeVotes[r.id]
    ),
  
  getUserVoteForResolution: (state: ResolutionsState, resolutionId: string) =>
    state.userVotes[resolutionId] || null,
  
  // Analytics selectors
  getResolutionStats: (state: ResolutionsState) => {
    const resolutions = Object.values(state.resolutions)
    const total = resolutions.length
    const passed = resolutions.filter(r => r.status === 'passed').length
    const rejected = resolutions.filter(r => r.status === 'rejected').length
    const pending = resolutions.filter(r => r.status === 'proposed').length
    
    return {
      total,
      passed,
      rejected,
      pending,
      passRate: total > 0 ? (passed / total) * 100 : 0
    }
  },
  
  // Loading and error selectors
  isAnyLoading: (state: ResolutionsState) => Object.values(state.loading).some(Boolean),
  hasErrors: (state: ResolutionsState) => Object.values(state.errors).some(Boolean),
  
  // Real-time selectors
  isRealTimeActive: (state: ResolutionsState) => state.isConnected,
  getLastSyncTime: (state: ResolutionsState) => new Date(state.lastSyncTime),
  
  // Optimistic updates selectors
  getPendingActions: (state: ResolutionsState) => state.optimisticActions
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const resolutionsStore = createStore<ResolutionsState>(
  (set, get) => ({
    // Initial state
    resolutions: {},
    analytics: null,
    currentResolutionId: null,
    activeVotes: {},
    userVotes: {},
    
    loading: {},
    errors: {},
    filters: {},
    sortBy: 'createdAt',
    sortOrder: 'desc',
    
    isConnected: false,
    lastSyncTime: 0,
    syncErrors: [],
    
    optimisticActions: [],
    
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      hasMore: false
    },
    
    // ========================================================================
    // RESOLUTION MANAGEMENT ACTIONS
    // ========================================================================
    
    createResolution: async (request: CreateResolutionRequest) => {
      const optimisticId = nanoid()
      const service = new MeetingResolutionService(createSupabaseBrowserClient())
      
      set(draft => {
        draft.loading.createResolution = true
        draft.errors.createResolution = null
      })
      
      // Add optimistic update
      const optimisticResolution: MeetingResolution = {
        id: optimisticId,
        ...request,
        proposedBy: '', // Would be set by service
        status: 'proposed',
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        totalEligibleVoters: 0,
        priorityLevel: request.priorityLevel || 3,
        requiresBoardApproval: request.requiresBoardApproval || false,
        requiresShareholderApproval: request.requiresShareholderApproval || false,
        legalReviewRequired: request.legalReviewRequired || false,
        supportingDocuments: request.supportingDocuments || [],
        relatedResolutions: [],
        discussionDurationMinutes: 0,
        amendmentsProposed: 0,
        wasAmended: false,
        proposedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const optimisticAction: OptimisticAction<MeetingResolution> = {
        id: optimisticId,
        type: 'CREATE_RESOLUTION',
        entity: 'resolution',
        optimisticData: optimisticResolution,
        timestamp: Date.now()
      }
      
      get().addOptimisticAction(optimisticAction)
      
      // Set optimistic resolution
      set(draft => {
        draft.resolutions[optimisticId] = {
          ...optimisticResolution,
          votes: [],
          votingParticipation: 0,
          votingResults: {
            forPercentage: 0,
            againstPercentage: 0,
            abstainPercentage: 0
          }
        }
      })
      
      try {
        const result = await service.createResolution(request)
        
        if (result.success) {
          const resolution = result.data
          
          set(draft => {
            // Remove optimistic data
            delete draft.resolutions[optimisticId]
            
            // Add real data
            draft.resolutions[resolution.id] = {
              ...resolution,
              votes: [],
              votingParticipation: 0,
              votingResults: {
                forPercentage: 0,
                againstPercentage: 0,
                abstainPercentage: 0
              }
            }
            
            draft.loading.createResolution = false
          })
          
          get().removeOptimisticAction(optimisticId)
          return resolution
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.createResolution = false
          draft.errors.createResolution = error instanceof Error ? error.message : 'Failed to create resolution'
          
          // Remove optimistic update
          delete draft.resolutions[optimisticId]
        })
        
        get().rollbackOptimisticAction(optimisticId)
        return null
      }
    },
    
    updateResolution: async (id: string, updates: UpdateResolutionRequest) => {
      const service = new MeetingResolutionService(createSupabaseBrowserClient())
      const currentResolution = get().resolutions[id]
      
      if (!currentResolution) {
        set(draft => {
          draft.errors.updateResolution = 'Resolution not found'
        })
        return null
      }
      
      set(draft => {
        draft.loading.updateResolution = true
        draft.errors.updateResolution = null
      })
      
      // Apply optimistic update
      const optimisticAction: OptimisticAction<MeetingResolution> = {
        id: nanoid(),
        type: 'UPDATE_RESOLUTION',
        entity: 'resolution',
        optimisticData: { ...currentResolution, ...updates },
        rollbackData: currentResolution,
        timestamp: Date.now()
      }
      
      get().addOptimisticAction(optimisticAction)
      
      set(draft => {
        draft.resolutions[id] = {
          ...draft.resolutions[id],
          ...updates,
          updatedAt: new Date().toISOString()
        }
      })
      
      try {
        const result = await service.updateResolution(id, updates)
        
        if (result.success) {
          const resolution = result.data
          
          set(draft => {
            draft.resolutions[id] = {
              ...draft.resolutions[id],
              ...resolution
            }
            draft.loading.updateResolution = false
          })
          
          get().removeOptimisticAction(optimisticAction.id)
          return resolution
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.updateResolution = false
          draft.errors.updateResolution = error instanceof Error ? error.message : 'Failed to update resolution'
          
          // Rollback optimistic update
          if (optimisticAction.rollbackData) {
            draft.resolutions[id] = optimisticAction.rollbackData as ResolutionWithVotes
          }
        })
        
        get().rollbackOptimisticAction(optimisticAction.id)
        return null
      }
    },
    
    deleteResolution: async (id: string) => {
      // Implementation would be similar with optimistic updates
      set(draft => {
        draft.loading.deleteResolution = true
        draft.errors.deleteResolution = null
      })
      
      try {
        // Service call would go here
        // await service.deleteResolution(id)
        
        set(draft => {
          delete draft.resolutions[id]
          draft.loading.deleteResolution = false
        })
        
        return true
      } catch (error) {
        set(draft => {
          draft.loading.deleteResolution = false
          draft.errors.deleteResolution = error instanceof Error ? error.message : 'Failed to delete resolution'
        })
        
        return false
      }
    },
    
    // ========================================================================
    // VOTING MANAGEMENT ACTIONS
    // ========================================================================
    
    startVoting: async (resolutionId: string, votingMethod: VotingMethod) => {
      const service = new MeetingResolutionService(createSupabaseBrowserClient())
      
      set(draft => {
        draft.loading.startVoting = true
        draft.errors.startVoting = null
        draft.activeVotes[resolutionId] = true
      })
      
      try {
        const result = await service.startVoting(resolutionId, votingMethod)
        
        if (result.success) {
          set(draft => {
            draft.resolutions[resolutionId] = {
              ...draft.resolutions[resolutionId],
              ...result.data,
              votingMethod
            }
            draft.loading.startVoting = false
          })
          
          return true
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.startVoting = false
          draft.errors.startVoting = error instanceof Error ? error.message : 'Failed to start voting'
          draft.activeVotes[resolutionId] = false
        })
        
        return false
      }
    },
    
    castVote: async (voteRequest: CastVoteRequest) => {
      const service = new MeetingResolutionService(createSupabaseBrowserClient())
      
      set(draft => {
        draft.loading.castVote = true
        draft.errors.castVote = null
        
        // Optimistic vote update
        draft.userVotes[voteRequest.resolutionId] = voteRequest.voteChoice
      })
      
      try {
        const result = await service.castVote(voteRequest)
        
        if (result.success) {
          const { vote, updatedResolution, votingResults } = result.data
          
          set(draft => {
            // Update resolution with new vote counts
            draft.resolutions[voteRequest.resolutionId] = {
              ...draft.resolutions[voteRequest.resolutionId],
              ...updatedResolution,
              votingResults: {
                forPercentage: votingResults.forPercentage,
                againstPercentage: votingResults.againstPercentage,
                abstainPercentage: votingResults.abstainPercentage
              },
              votingParticipation: votingResults.participationRate
            }
            
            // Add vote to resolution
            if (!draft.resolutions[voteRequest.resolutionId].votes) {
              draft.resolutions[voteRequest.resolutionId].votes = []
            }
            draft.resolutions[voteRequest.resolutionId].votes.push(vote)
            
            draft.loading.castVote = false
          })
          
          return { vote, resolution: updatedResolution }
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.castVote = false
          draft.errors.castVote = error instanceof Error ? error.message : 'Failed to cast vote'
          
          // Remove optimistic vote
          delete draft.userVotes[voteRequest.resolutionId]
        })
        
        return null
      }
    },
    
    concludeVoting: async (resolutionId: string) => {
      const service = new MeetingResolutionService(createSupabaseBrowserClient())
      
      set(draft => {
        draft.loading.concludeVoting = true
        draft.errors.concludeVoting = null
      })
      
      try {
        const result = await service.concludeVoting(resolutionId)
        
        if (result.success) {
          const { resolution, votingResults, finalStatus } = result.data
          
          set(draft => {
            draft.resolutions[resolutionId] = {
              ...draft.resolutions[resolutionId],
              ...resolution,
              status: finalStatus,
              votingResults: {
                forPercentage: votingResults.forPercentage,
                againstPercentage: votingResults.againstPercentage,
                abstainPercentage: votingResults.abstainPercentage
              }
            }
            
            draft.activeVotes[resolutionId] = false
            draft.loading.concludeVoting = false
          })
          
          return true
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.concludeVoting = false
          draft.errors.concludeVoting = error instanceof Error ? error.message : 'Failed to conclude voting'
        })
        
        return false
      }
    },
    
    // ========================================================================
    // DATA FETCHING ACTIONS
    // ========================================================================
    
    fetchResolutions: async (meetingId?: string, filters?: ResolutionFilters) => {
      set(draft => {
        draft.loading.fetchResolutions = true
        draft.errors.fetchResolutions = null
      })
      
      try {
        // Implementation would fetch from service
        // For now, just clear loading state
        set(draft => {
          draft.loading.fetchResolutions = false
          draft.lastSyncTime = Date.now()
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchResolutions = false
          draft.errors.fetchResolutions = error instanceof Error ? error.message : 'Failed to fetch resolutions'
        })
      }
    },
    
    fetchResolution: async (id: string) => {
      set(draft => {
        draft.loading.fetchResolution = true
        draft.errors.fetchResolution = null
      })
      
      try {
        // Service call would go here
        set(draft => {
          draft.loading.fetchResolution = false
        })
        
        return null // Would return the resolution
      } catch (error) {
        set(draft => {
          draft.loading.fetchResolution = false
          draft.errors.fetchResolution = error instanceof Error ? error.message : 'Failed to fetch resolution'
        })
        
        return null
      }
    },
    
    fetchAnalytics: async (organizationId: string, timeframe?: { from: string; to: string }) => {
      const service = new MeetingResolutionService(createSupabaseBrowserClient())
      
      set(draft => {
        draft.loading.fetchAnalytics = true
        draft.errors.fetchAnalytics = null
      })
      
      try {
        const result = await service.getResolutionAnalytics(organizationId, timeframe)
        
        if (result.success) {
          set(draft => {
            draft.analytics = result.data
            draft.loading.fetchAnalytics = false
          })
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.fetchAnalytics = false
          draft.errors.fetchAnalytics = error instanceof Error ? error.message : 'Failed to fetch analytics'
        })
      }
    },
    
    // ========================================================================
    // REAL-TIME & SYNC ACTIONS
    // ========================================================================
    
    enableRealTimeSync: async (organizationId: string) => {
      try {
        // WebSocket connection would be established here
        set(draft => {
          draft.isConnected = true
          draft.lastSyncTime = Date.now()
        })
      } catch (error) {
        set(draft => {
          draft.syncErrors.push(error instanceof Error ? error.message : 'Connection failed')
        })
      }
    },
    
    disableRealTimeSync: async () => {
      try {
        // WebSocket disconnection would happen here
        set(draft => {
          draft.isConnected = false
        })
      } catch (error) {
        set(draft => {
          draft.syncErrors.push(error instanceof Error ? error.message : 'Disconnection failed')
        })
      }
    },
    
    forceSyncResolutions: async () => {
      set(draft => {
        draft.loading.sync = true
      })
      
      try {
        // Force sync implementation
        set(draft => {
          draft.loading.sync = false
          draft.lastSyncTime = Date.now()
        })
      } catch (error) {
        set(draft => {
          draft.loading.sync = false
          draft.syncErrors.push(error instanceof Error ? error.message : 'Sync failed')
        })
      }
    },
    
    // ========================================================================
    // UI STATE MANAGEMENT ACTIONS
    // ========================================================================
    
    setCurrentResolution: (id: string | null) => {
      set(draft => {
        draft.currentResolutionId = id
      })
    },
    
    updateFilters: (filters: Partial<ResolutionFilters>) => {
      set(draft => {
        draft.filters = { ...draft.filters, ...filters }
      })
    },
    
    updateSort: (sortBy: ResolutionsState['sortBy'], sortOrder: ResolutionsState['sortOrder']) => {
      set(draft => {
        draft.sortBy = sortBy
        draft.sortOrder = sortOrder
      })
    },
    
    clearErrors: () => {
      set(draft => {
        draft.errors = {}
        draft.syncErrors = []
      })
    },
    
    // ========================================================================
    // OPTIMISTIC UPDATES ACTIONS
    // ========================================================================
    
    addOptimisticAction: (action: OptimisticAction<MeetingResolution>) => {
      set(draft => {
        draft.optimisticActions.push(action)
      })
    },
    
    removeOptimisticAction: (actionId: string) => {
      set(draft => {
        draft.optimisticActions = draft.optimisticActions.filter(a => a.id !== actionId)
      })
    },
    
    rollbackOptimisticAction: (actionId: string) => {
      set(draft => {
        const action = draft.optimisticActions.find(a => a.id === actionId)
        if (action && action.rollbackData) {
          // Apply rollback logic based on action type
          if (action.type === 'UPDATE_RESOLUTION') {
            const resolutionId = action.rollbackData.id
            draft.resolutions[resolutionId] = action.rollbackData as ResolutionWithVotes
          }
        }
        
        draft.optimisticActions = draft.optimisticActions.filter(a => a.id !== actionId)
      })
    },
    
    // ========================================================================
    // INTERNAL ACTIONS
    // ========================================================================
    
    setLoading: (key: string, loading: boolean) => {
      set(draft => {
        draft.loading[key] = loading
      })
    },
    
    setError: (key: string, error: string | null) => {
      set(draft => {
        draft.errors[key] = error
      })
    },
    
    setResolution: (resolution: ResolutionWithVotes) => {
      set(draft => {
        draft.resolutions[resolution.id] = resolution
      })
    },
    
    updateResolutionVotes: (resolutionId: string, votes: ResolutionVote[]) => {
      set(draft => {
        if (draft.resolutions[resolutionId]) {
          draft.resolutions[resolutionId].votes = votes
          
          // Recalculate voting results
          const totalVotes = votes.length
          const forVotes = votes.filter(v => v.voteChoice === 'for').length
          const againstVotes = votes.filter(v => v.voteChoice === 'against').length
          const abstainVotes = votes.filter(v => v.voteChoice === 'abstain').length
          
          draft.resolutions[resolutionId].votingResults = {
            forPercentage: totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0,
            againstPercentage: totalVotes > 0 ? (againstVotes / totalVotes) * 100 : 0,
            abstainPercentage: totalVotes > 0 ? (abstainVotes / totalVotes) * 100 : 0
          }
          
          const totalEligible = draft.resolutions[resolutionId].totalEligibleVoters
          draft.resolutions[resolutionId].votingParticipation = totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0
        }
      })
    },
    
    cleanup: () => {
      set(draft => {
        draft.resolutions = {}
        draft.analytics = null
        draft.currentResolutionId = null
        draft.activeVotes = {}
        draft.userVotes = {}
        draft.loading = {}
        draft.errors = {}
        draft.filters = {}
        draft.isConnected = false
        draft.syncErrors = []
        draft.optimisticActions = []
      })
    },
    
    _meta: {
      version: 1,
      lastUpdated: Date.now(),
      hydrated: false
    }
  }),
  {
    name: 'meeting-resolutions',
    version: 1,
    partialize: (state) => ({
      // Persist user preferences and non-sensitive data
      filters: state.filters,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
      userVotes: state.userVotes, // User's voting history
      lastSyncTime: state.lastSyncTime,
      _meta: state._meta
    })
  }
)

// ============================================================================
// SELECTOR EXPORTS
// ============================================================================

export const resolutionStoreSelectors = createSelectors(resolutionsStore)

// ============================================================================
// UTILITY HOOKS
// ============================================================================

export const useResolutions = () => resolutionsStore()
export const useResolution = (id: string) => resolutionsStore(state => state.resolutions[id])
export const useResolutionLoading = () => resolutionsStore(state => Object.values(state.loading).some(Boolean))
export const useResolutionErrors = () => resolutionsStore(state => state.errors)
export const useResolutionAnalytics = () => resolutionsStore(state => state.analytics)
export const useFilteredResolutions = () => resolutionsStore(resolutionSelectors.getFilteredResolutions)
export const useResolutionStats = () => resolutionsStore(resolutionSelectors.getResolutionStats)

// Initialize real-time connections on client side
if (typeof window !== 'undefined') {
  // Auto-connect would be handled by a higher-level component
}