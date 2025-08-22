import { createStore, createSelectors } from './store-config'
import { LoadingState, ErrorState, StoreSlice, OptimisticAction } from './types'
import { 
  MeetingActionable,
  ActionableWithUpdates,
  CreateActionableRequest,
  UpdateActionableRequest,
  CreateActionableUpdateRequest,
  ActionableUpdate,
  ActionableStatus,
  ActionablePriority,
  ActionableCategory,
  ActionablesAnalytics,
  ActionableFilters
} from '../../types/meetings'
import { MeetingActionableService } from '../services/meeting-actionable.service'
import { WebSocketService } from '../services/websocket.service'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { nanoid } from 'nanoid'

// ============================================================================
// STATE INTERFACE
// ============================================================================

export interface ActionablesState extends StoreSlice {
  // Core data
  actionables: Record<string, ActionableWithUpdates>
  analytics: ActionablesAnalytics | null
  
  // Current state
  currentActionableId: string | null
  myActionables: string[] // Actionable IDs assigned to current user
  overdueActionables: string[] // Overdue actionable IDs
  
  // Progress tracking
  progressUpdates: Record<string, ActionableUpdate[]> // actionableId -> updates
  reminderSchedule: Record<string, number[]> // actionableId -> reminder timestamps
  
  // UI state
  loading: LoadingState
  errors: ErrorState
  filters: ActionableFilters
  sortBy: 'dueDate' | 'priority' | 'status' | 'createdAt' | 'progress'
  sortOrder: 'asc' | 'desc'
  
  // Real-time state
  isConnected: boolean
  lastSyncTime: number
  syncErrors: string[]
  
  // Optimistic updates
  optimisticActions: OptimisticAction<MeetingActionable>[]
  
  // Pagination
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  
  // Offline support
  pendingUpdates: CreateActionableUpdateRequest[]
  lastOfflineAction: number
  
  // Actions - Actionable Management
  createActionable: (request: CreateActionableRequest) => Promise<MeetingActionable | null>
  updateActionable: (id: string, updates: UpdateActionableRequest) => Promise<MeetingActionable | null>
  deleteActionable: (id: string) => Promise<boolean>
  
  // Actions - Progress Management
  addProgressUpdate: (updateRequest: CreateActionableUpdateRequest) => Promise<{ update: ActionableUpdate; actionable: MeetingActionable } | null>
  updateProgress: (actionableId: string, progressPercentage: number, notes?: string) => Promise<boolean>
  markCompleted: (actionableId: string, completionNotes: string) => Promise<boolean>
  markBlocked: (actionableId: string, blockReason: string) => Promise<boolean>
  
  // Actions - Assignment Management
  delegateActionable: (actionableId: string, delegatedTo: string, reason: string) => Promise<boolean>
  escalateActionable: (actionableId: string, reason: string, escalatedTo?: string) => Promise<boolean>
  
  // Actions - Data Fetching
  fetchActionables: (meetingId?: string, filters?: ActionableFilters) => Promise<void>
  fetchActionable: (id: string) => Promise<MeetingActionable | null>
  fetchMyActionables: () => Promise<void>
  fetchOverdueActionables: (organizationId: string) => Promise<void>
  fetchAnalytics: (organizationId: string, timeframe?: { from: string; to: string }) => Promise<void>
  
  // Actions - Real-time & Sync
  enableRealTimeSync: (organizationId: string) => Promise<void>
  disableRealTimeSync: () => Promise<void>
  syncPendingUpdates: () => Promise<void>
  
  // Actions - Reminder Management
  scheduleReminder: (actionableId: string, reminderTime: number) => Promise<void>
  dismissReminder: (actionableId: string) => void
  snoozeReminder: (actionableId: string, snoozeMinutes: number) => void
  
  // Actions - Dependency Management
  addDependency: (actionableId: string, dependsOnId: string) => Promise<boolean>
  removeDependency: (actionableId: string, dependsOnId: string) => Promise<boolean>
  checkDependencyStatus: (actionableId: string) => Promise<{ canStart: boolean; blockingItems: string[] }>
  
  // Actions - UI State Management
  setCurrentActionable: (id: string | null) => void
  updateFilters: (filters: Partial<ActionableFilters>) => void
  updateSort: (sortBy: ActionablesState['sortBy'], sortOrder: ActionablesState['sortOrder']) => void
  clearErrors: () => void
  
  // Actions - Optimistic Updates
  addOptimisticAction: (action: OptimisticAction<MeetingActionable>) => void
  removeOptimisticAction: (actionId: string) => void
  rollbackOptimisticAction: (actionId: string) => void
  
  // Internal actions
  setLoading: (key: string, loading: boolean) => void
  setError: (key: string, error: string | null) => void
  setActionable: (actionable: ActionableWithUpdates) => void
  addActionableUpdate: (actionableId: string, update: ActionableUpdate) => void
  updateActionableProgress: (actionableId: string, progress: number) => void
  cleanup: () => void
}

// ============================================================================
// COMPUTED SELECTORS
// ============================================================================

export const actionableSelectors = {
  // Basic selectors
  getAllActionables: (state: ActionablesState) => Object.values(state.actionables),
  
  getActionableById: (state: ActionablesState, id: string) => state.actionables[id] || null,
  
  getCurrentActionable: (state: ActionablesState) => 
    state.currentActionableId ? state.actionables[state.currentActionableId] : null,
  
  // Filtered selectors
  getFilteredActionables: (state: ActionablesState) => {
    let actionables = Object.values(state.actionables)
    
    if (state.filters.status) {
      actionables = actionables.filter(a => a.status === state.filters.status)
    }
    
    if (state.filters.priority) {
      actionables = actionables.filter(a => a.priority === state.filters.priority)
    }
    
    if (state.filters.category) {
      actionables = actionables.filter(a => a.category === state.filters.category)
    }
    
    if (state.filters.assignedTo) {
      actionables = actionables.filter(a => a.assignedTo === state.filters.assignedTo)
    }
    
    if (state.filters.overdueOnly) {
      const now = new Date()
      actionables = actionables.filter(a => new Date(a.dueDate) < now && a.status !== 'completed')
    }
    
    if (state.filters.searchTerm) {
      const term = state.filters.searchTerm.toLowerCase()
      actionables = actionables.filter(a => 
        a.title.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term) ||
        (a.detailedRequirements && a.detailedRequirements.toLowerCase().includes(term))
      )
    }
    
    // Apply sorting
    actionables.sort((a, b) => {
      const field = state.sortBy
      const order = state.sortOrder === 'asc' ? 1 : -1
      
      if (field === 'dueDate') {
        return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * order
      } else if (field === 'priority') {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return (priorityOrder[a.priority] - priorityOrder[b.priority]) * order
      } else if (field === 'progress') {
        return (a.progressPercentage - b.progressPercentage) * order
      } else if (field === 'createdAt') {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order
      } else {
        return a[field].localeCompare(b[field]) * order
      }
    })
    
    return actionables
  },
  
  // Status-based selectors
  getActionablesByStatus: (state: ActionablesState, status: ActionableStatus) =>
    Object.values(state.actionables).filter(a => a.status === status),
  
  getMyActionables: (state: ActionablesState, userId: string) =>
    Object.values(state.actionables).filter(a => a.assignedTo === userId),
  
  getOverdueActionables: (state: ActionablesState) => {
    const now = new Date()
    return Object.values(state.actionables).filter(a => 
      new Date(a.dueDate) < now && 
      a.status !== 'completed' && 
      a.status !== 'cancelled'
    )
  },
  
  getDueSoonActionables: (state: ActionablesState, daysAhead: number = 3) => {
    const now = new Date()
    const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000))
    
    return Object.values(state.actionables).filter(a => {
      const dueDate = new Date(a.dueDate)
      return dueDate >= now && 
             dueDate <= futureDate && 
             a.status !== 'completed' && 
             a.status !== 'cancelled'
    })
  },
  
  // Priority-based selectors
  getCriticalActionables: (state: ActionablesState) =>
    Object.values(state.actionables).filter(a => a.priority === 'critical' && a.status !== 'completed'),
  
  getHighPriorityActionables: (state: ActionablesState) =>
    Object.values(state.actionables).filter(a => a.priority === 'high' && a.status !== 'completed'),
  
  // Progress selectors
  getActionablesInProgress: (state: ActionablesState) =>
    Object.values(state.actionables).filter(a => a.status === 'in_progress'),
  
  getBlockedActionables: (state: ActionablesState) =>
    Object.values(state.actionables).filter(a => a.status === 'blocked'),
  
  getActionablesNeedingReview: (state: ActionablesState) =>
    Object.values(state.actionables).filter(a => a.status === 'under_review'),
  
  // Dependency selectors
  getActionableDependencies: (state: ActionablesState, actionableId: string) => {
    const actionable = state.actionables[actionableId]
    if (!actionable) return []
    
    return actionable.dependsOnActionableIds
      .map(id => state.actionables[id])
      .filter(Boolean)
  },
  
  getDependentActionables: (state: ActionablesState, actionableId: string) =>
    Object.values(state.actionables).filter(a => 
      a.dependsOnActionableIds.includes(actionableId)
    ),
  
  // Analytics selectors
  getActionableStats: (state: ActionablesState) => {
    const actionables = Object.values(state.actionables)
    const total = actionables.length
    const completed = actionables.filter(a => a.status === 'completed').length
    const inProgress = actionables.filter(a => a.status === 'in_progress').length
    const overdue = actionables.filter(a => {
      const now = new Date()
      return new Date(a.dueDate) < now && a.status !== 'completed' && a.status !== 'cancelled'
    }).length
    
    const avgProgress = total > 0 
      ? actionables.reduce((sum, a) => sum + a.progressPercentage, 0) / total 
      : 0
    
    return {
      total,
      completed,
      inProgress,
      overdue,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      averageProgress: avgProgress
    }
  },
  
  getProductivityMetrics: (state: ActionablesState, userId: string) => {
    const userActionables = Object.values(state.actionables).filter(a => a.assignedTo === userId)
    const completed = userActionables.filter(a => a.status === 'completed')
    const onTime = completed.filter(a => 
      a.completedAt && new Date(a.completedAt) <= new Date(a.dueDate)
    )
    
    return {
      assigned: userActionables.length,
      completed: completed.length,
      completedOnTime: onTime.length,
      completionRate: userActionables.length > 0 ? (completed.length / userActionables.length) * 100 : 0,
      onTimeRate: completed.length > 0 ? (onTime.length / completed.length) * 100 : 0
    }
  },
  
  // Loading and error selectors
  isAnyLoading: (state: ActionablesState) => Object.values(state.loading).some(Boolean),
  hasErrors: (state: ActionablesState) => Object.values(state.errors).some(Boolean),
  
  // Real-time selectors
  isRealTimeActive: (state: ActionablesState) => state.isConnected,
  getLastSyncTime: (state: ActionablesState) => new Date(state.lastSyncTime),
  hasPendingUpdates: (state: ActionablesState) => state.pendingUpdates.length > 0,
  
  // Optimistic updates selectors
  getPendingActions: (state: ActionablesState) => state.optimisticActions,
  
  // Reminder selectors
  getUpcomingReminders: (state: ActionablesState) => {
    const now = Date.now()
    const upcoming: Array<{ actionableId: string; actionable: MeetingActionable; reminderTime: number }> = []
    
    Object.entries(state.reminderSchedule).forEach(([actionableId, reminders]) => {
      const actionable = state.actionables[actionableId]
      if (actionable && actionable.status !== 'completed') {
        reminders.forEach(reminderTime => {
          if (reminderTime > now && reminderTime < now + (24 * 60 * 60 * 1000)) { // Next 24 hours
            upcoming.push({ actionableId, actionable, reminderTime })
          }
        })
      }
    })
    
    return upcoming.sort((a, b) => a.reminderTime - b.reminderTime)
  }
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const actionablesStore = createStore<ActionablesState>(
  (set, get) => ({
    // Initial state
    actionables: {},
    analytics: null,
    currentActionableId: null,
    myActionables: [],
    overdueActionables: [],
    
    progressUpdates: {},
    reminderSchedule: {},
    
    loading: {},
    errors: {},
    filters: {},
    sortBy: 'dueDate',
    sortOrder: 'asc',
    
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
    
    pendingUpdates: [],
    lastOfflineAction: 0,
    
    // ========================================================================
    // ACTIONABLE MANAGEMENT ACTIONS
    // ========================================================================
    
    createActionable: async (request: CreateActionableRequest) => {
      const optimisticId = nanoid()
      const service = new MeetingActionableService(createSupabaseBrowserClient())
      
      set(draft => {
        draft.loading.createActionable = true
        draft.errors.createActionable = null
      })
      
      // Add optimistic update
      const optimisticActionable: MeetingActionable = {
        id: optimisticId,
        ...request,
        assignedBy: '', // Would be set by service
        status: 'assigned',
        progressPercentage: 0,
        category: request.category || 'other',
        priority: request.priority || 'medium',
        estimatedEffortHours: request.estimatedEffortHours,
        actualEffortHours: 0,
        reminderIntervals: request.reminderIntervals || [7, 3, 1],
        dependsOnActionableIds: request.dependsOnActionableIds || [],
        blocksActionableIds: [],
        requiresApproval: request.requiresApproval || false,
        stakeholdersToNotify: request.stakeholdersToNotify || [],
        communicationRequired: request.communicationRequired || false,
        escalationLevel: 1,
        escalationPath: request.escalationPath || [],
        assignedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const optimisticAction: OptimisticAction<MeetingActionable> = {
        id: optimisticId,
        type: 'CREATE_ACTIONABLE',
        entity: 'actionable',
        optimisticData: optimisticActionable,
        timestamp: Date.now()
      }
      
      get().addOptimisticAction(optimisticAction)
      
      // Set optimistic actionable
      set(draft => {
        draft.actionables[optimisticId] = {
          ...optimisticActionable,
          updates: [],
          dependentActionables: [],
          blockingActionables: []
        }
      })
      
      try {
        const result = await service.createActionable(request)
        
        if (result.success) {
          const actionable = result.data
          
          set(draft => {
            // Remove optimistic data
            delete draft.actionables[optimisticId]
            
            // Add real data
            draft.actionables[actionable.id] = {
              ...actionable,
              updates: [],
              dependentActionables: [],
              blockingActionables: []
            }
            
            draft.loading.createActionable = false
          })
          
          get().removeOptimisticAction(optimisticId)
          return actionable
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.createActionable = false
          draft.errors.createActionable = error instanceof Error ? error.message : 'Failed to create actionable'
          
          // Remove optimistic update
          delete draft.actionables[optimisticId]
        })
        
        get().rollbackOptimisticAction(optimisticId)
        return null
      }
    },
    
    updateActionable: async (id: string, updates: UpdateActionableRequest) => {
      const service = new MeetingActionableService(createSupabaseBrowserClient())
      const currentActionable = get().actionables[id]
      
      if (!currentActionable) {
        set(draft => {
          draft.errors.updateActionable = 'Actionable not found'
        })
        return null
      }
      
      set(draft => {
        draft.loading.updateActionable = true
        draft.errors.updateActionable = null
      })
      
      // Apply optimistic update
      const optimisticAction: OptimisticAction<MeetingActionable> = {
        id: nanoid(),
        type: 'UPDATE_ACTIONABLE',
        entity: 'actionable',
        optimisticData: { ...currentActionable, ...updates },
        rollbackData: currentActionable,
        timestamp: Date.now()
      }
      
      get().addOptimisticAction(optimisticAction)
      
      set(draft => {
        draft.actionables[id] = {
          ...draft.actionables[id],
          ...updates,
          updatedAt: new Date().toISOString()
        }
      })
      
      try {
        const result = await service.updateActionable(id, updates)
        
        if (result.success) {
          const actionable = result.data
          
          set(draft => {
            draft.actionables[id] = {
              ...draft.actionables[id],
              ...actionable
            }
            draft.loading.updateActionable = false
          })
          
          get().removeOptimisticAction(optimisticAction.id)
          return actionable
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.updateActionable = false
          draft.errors.updateActionable = error instanceof Error ? error.message : 'Failed to update actionable'
          
          // Rollback optimistic update
          if (optimisticAction.rollbackData) {
            draft.actionables[id] = optimisticAction.rollbackData as ActionableWithUpdates
          }
        })
        
        get().rollbackOptimisticAction(optimisticAction.id)
        return null
      }
    },
    
    deleteActionable: async (id: string) => {
      set(draft => {
        draft.loading.deleteActionable = true
        draft.errors.deleteActionable = null
      })
      
      try {
        // Service call would go here
        // await service.deleteActionable(id)
        
        set(draft => {
          delete draft.actionables[id]
          draft.loading.deleteActionable = false
        })
        
        return true
      } catch (error) {
        set(draft => {
          draft.loading.deleteActionable = false
          draft.errors.deleteActionable = error instanceof Error ? error.message : 'Failed to delete actionable'
        })
        
        return false
      }
    },
    
    // ========================================================================
    // PROGRESS MANAGEMENT ACTIONS
    // ========================================================================
    
    addProgressUpdate: async (updateRequest: CreateActionableUpdateRequest) => {
      const service = new MeetingActionableService(createSupabaseBrowserClient())
      
      set(draft => {
        draft.loading.addProgressUpdate = true
        draft.errors.addProgressUpdate = null
      })
      
      try {
        const result = await service.addProgressUpdate(updateRequest)
        
        if (result.success) {
          const { update, actionable } = result.data
          
          set(draft => {
            // Update actionable
            draft.actionables[actionable.id] = {
              ...draft.actionables[actionable.id],
              ...actionable
            }
            
            // Add update to history
            if (!draft.progressUpdates[actionable.id]) {
              draft.progressUpdates[actionable.id] = []
            }
            draft.progressUpdates[actionable.id].push(update)
            
            // Add to actionable updates
            if (draft.actionables[actionable.id]) {
              draft.actionables[actionable.id].updates.push(update)
            }
            
            draft.loading.addProgressUpdate = false
          })
          
          return { update, actionable }
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.addProgressUpdate = false
          draft.errors.addProgressUpdate = error instanceof Error ? error.message : 'Failed to add progress update'
        })
        
        return null
      }
    },
    
    updateProgress: async (actionableId: string, progressPercentage: number, notes?: string) => {
      const updateRequest: CreateActionableUpdateRequest = {
        actionableId,
        updateType: 'progress',
        newProgress: progressPercentage,
        updateNotes: notes
      }
      
      const result = await get().addProgressUpdate(updateRequest)
      return result !== null
    },
    
    markCompleted: async (actionableId: string, completionNotes: string) => {
      const updateRequest: CreateActionableUpdateRequest = {
        actionableId,
        updateType: 'completion',
        newStatus: 'completed',
        newProgress: 100,
        updateNotes: completionNotes
      }
      
      const result = await get().addProgressUpdate(updateRequest)
      return result !== null
    },
    
    markBlocked: async (actionableId: string, blockReason: string) => {
      const updateRequest: CreateActionableUpdateRequest = {
        actionableId,
        updateType: 'status_change',
        newStatus: 'blocked',
        updateNotes: blockReason,
        challengesFaced: blockReason
      }
      
      const result = await get().addProgressUpdate(updateRequest)
      return result !== null
    },
    
    // ========================================================================
    // ASSIGNMENT MANAGEMENT ACTIONS
    // ========================================================================
    
    delegateActionable: async (actionableId: string, delegatedTo: string, reason: string) => {
      const service = new MeetingActionableService(createSupabaseBrowserClient())
      
      set(draft => {
        draft.loading.delegateActionable = true
        draft.errors.delegateActionable = null
      })
      
      try {
        const result = await service.delegateActionable(actionableId, delegatedTo, reason)
        
        if (result.success) {
          const actionable = result.data
          
          set(draft => {
            draft.actionables[actionableId] = {
              ...draft.actionables[actionableId],
              ...actionable
            }
            draft.loading.delegateActionable = false
          })
          
          return true
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.delegateActionable = false
          draft.errors.delegateActionable = error instanceof Error ? error.message : 'Failed to delegate actionable'
        })
        
        return false
      }
    },
    
    escalateActionable: async (actionableId: string, reason: string, escalatedTo?: string) => {
      const service = new MeetingActionableService(createSupabaseBrowserClient())
      
      set(draft => {
        draft.loading.escalateActionable = true
        draft.errors.escalateActionable = null
      })
      
      try {
        const result = await service.escalateActionable(actionableId, reason, escalatedTo)
        
        if (result.success) {
          const actionable = result.data
          
          set(draft => {
            draft.actionables[actionableId] = {
              ...draft.actionables[actionableId],
              ...actionable
            }
            draft.loading.escalateActionable = false
          })
          
          return true
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.escalateActionable = false
          draft.errors.escalateActionable = error instanceof Error ? error.message : 'Failed to escalate actionable'
        })
        
        return false
      }
    },
    
    // ========================================================================
    // DATA FETCHING ACTIONS
    // ========================================================================
    
    fetchActionables: async (meetingId?: string, filters?: ActionableFilters) => {
      set(draft => {
        draft.loading.fetchActionables = true
        draft.errors.fetchActionables = null
      })
      
      try {
        // Implementation would fetch from service
        // For now, just clear loading state
        set(draft => {
          draft.loading.fetchActionables = false
          draft.lastSyncTime = Date.now()
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchActionables = false
          draft.errors.fetchActionables = error instanceof Error ? error.message : 'Failed to fetch actionables'
        })
      }
    },
    
    fetchActionable: async (id: string) => {
      set(draft => {
        draft.loading.fetchActionable = true
        draft.errors.fetchActionable = null
      })
      
      try {
        // Service call would go here
        set(draft => {
          draft.loading.fetchActionable = false
        })
        
        return null // Would return the actionable
      } catch (error) {
        set(draft => {
          draft.loading.fetchActionable = false
          draft.errors.fetchActionable = error instanceof Error ? error.message : 'Failed to fetch actionable'
        })
        
        return null
      }
    },
    
    fetchMyActionables: async () => {
      set(draft => {
        draft.loading.fetchMyActionables = true
        draft.errors.fetchMyActionables = null
      })
      
      try {
        // Implementation would fetch current user's actionables
        set(draft => {
          draft.loading.fetchMyActionables = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchMyActionables = false
          draft.errors.fetchMyActionables = error instanceof Error ? error.message : 'Failed to fetch my actionables'
        })
      }
    },
    
    fetchOverdueActionables: async (organizationId: string) => {
      const service = new MeetingActionableService(createSupabaseBrowserClient())
      
      set(draft => {
        draft.loading.fetchOverdueActionables = true
        draft.errors.fetchOverdueActionables = null
      })
      
      try {
        const result = await service.getOverdueActionables(organizationId)
        
        if (result.success) {
          const overdueItems = result.data.items
          
          set(draft => {
            draft.overdueActionables = overdueItems.map(item => item.id)
            
            // Update actionables with overdue data
            overdueItems.forEach(item => {
              if (draft.actionables[item.id]) {
                draft.actionables[item.id] = {
                  ...draft.actionables[item.id],
                  ...item
                }
              }
            })
            
            draft.loading.fetchOverdueActionables = false
          })
        } else {
          throw new Error(result.error.message)
        }
      } catch (error) {
        set(draft => {
          draft.loading.fetchOverdueActionables = false
          draft.errors.fetchOverdueActionables = error instanceof Error ? error.message : 'Failed to fetch overdue actionables'
        })
      }
    },
    
    fetchAnalytics: async (organizationId: string, timeframe?: { from: string; to: string }) => {
      const service = new MeetingActionableService(createSupabaseBrowserClient())
      
      set(draft => {
        draft.loading.fetchAnalytics = true
        draft.errors.fetchAnalytics = null
      })
      
      try {
        const result = await service.getActionableAnalytics(organizationId, timeframe)
        
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
    
    syncPendingUpdates: async () => {
      const { pendingUpdates } = get()
      
      if (pendingUpdates.length === 0) return
      
      set(draft => {
        draft.loading.sync = true
      })
      
      try {
        // Process pending updates
        for (const update of pendingUpdates) {
          await get().addProgressUpdate(update)
        }
        
        set(draft => {
          draft.pendingUpdates = []
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
    // REMINDER MANAGEMENT ACTIONS
    // ========================================================================
    
    scheduleReminder: async (actionableId: string, reminderTime: number) => {
      set(draft => {
        if (!draft.reminderSchedule[actionableId]) {
          draft.reminderSchedule[actionableId] = []
        }
        draft.reminderSchedule[actionableId].push(reminderTime)
        draft.reminderSchedule[actionableId].sort()
      })
    },
    
    dismissReminder: (actionableId: string) => {
      set(draft => {
        const now = Date.now()
        if (draft.reminderSchedule[actionableId]) {
          draft.reminderSchedule[actionableId] = draft.reminderSchedule[actionableId]
            .filter(time => time > now)
        }
      })
    },
    
    snoozeReminder: (actionableId: string, snoozeMinutes: number) => {
      const snoozeTime = Date.now() + (snoozeMinutes * 60 * 1000)
      get().scheduleReminder(actionableId, snoozeTime)
    },
    
    // ========================================================================
    // DEPENDENCY MANAGEMENT ACTIONS
    // ========================================================================
    
    addDependency: async (actionableId: string, dependsOnId: string) => {
      set(draft => {
        if (draft.actionables[actionableId] && !draft.actionables[actionableId].dependsOnActionableIds.includes(dependsOnId)) {
          draft.actionables[actionableId].dependsOnActionableIds.push(dependsOnId)
        }
        
        if (draft.actionables[dependsOnId] && !draft.actionables[dependsOnId].blocksActionableIds.includes(actionableId)) {
          draft.actionables[dependsOnId].blocksActionableIds.push(actionableId)
        }
      })
      
      return true
    },
    
    removeDependency: async (actionableId: string, dependsOnId: string) => {
      set(draft => {
        if (draft.actionables[actionableId]) {
          draft.actionables[actionableId].dependsOnActionableIds = 
            draft.actionables[actionableId].dependsOnActionableIds.filter(id => id !== dependsOnId)
        }
        
        if (draft.actionables[dependsOnId]) {
          draft.actionables[dependsOnId].blocksActionableIds = 
            draft.actionables[dependsOnId].blocksActionableIds.filter(id => id !== actionableId)
        }
      })
      
      return true
    },
    
    checkDependencyStatus: async (actionableId: string) => {
      const actionable = get().actionables[actionableId]
      if (!actionable) {
        return { canStart: false, blockingItems: [] }
      }
      
      const blockingItems = actionable.dependsOnActionableIds.filter(depId => {
        const dependency = get().actionables[depId]
        return dependency && dependency.status !== 'completed'
      })
      
      return {
        canStart: blockingItems.length === 0,
        blockingItems
      }
    },
    
    // ========================================================================
    // UI STATE MANAGEMENT ACTIONS
    // ========================================================================
    
    setCurrentActionable: (id: string | null) => {
      set(draft => {
        draft.currentActionableId = id
      })
    },
    
    updateFilters: (filters: Partial<ActionableFilters>) => {
      set(draft => {
        draft.filters = { ...draft.filters, ...filters }
      })
    },
    
    updateSort: (sortBy: ActionablesState['sortBy'], sortOrder: ActionablesState['sortOrder']) => {
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
    
    addOptimisticAction: (action: OptimisticAction<MeetingActionable>) => {
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
          if (action.type === 'UPDATE_ACTIONABLE') {
            const actionableId = action.rollbackData.id
            draft.actionables[actionableId] = action.rollbackData as ActionableWithUpdates
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
    
    setActionable: (actionable: ActionableWithUpdates) => {
      set(draft => {
        draft.actionables[actionable.id] = actionable
      })
    },
    
    addActionableUpdate: (actionableId: string, update: ActionableUpdate) => {
      set(draft => {
        if (!draft.progressUpdates[actionableId]) {
          draft.progressUpdates[actionableId] = []
        }
        draft.progressUpdates[actionableId].push(update)
        
        if (draft.actionables[actionableId]) {
          draft.actionables[actionableId].updates.push(update)
        }
      })
    },
    
    updateActionableProgress: (actionableId: string, progress: number) => {
      set(draft => {
        if (draft.actionables[actionableId]) {
          draft.actionables[actionableId].progressPercentage = progress
          draft.actionables[actionableId].updatedAt = new Date().toISOString()
        }
      })
    },
    
    cleanup: () => {
      set(draft => {
        draft.actionables = {}
        draft.analytics = null
        draft.currentActionableId = null
        draft.myActionables = []
        draft.overdueActionables = []
        draft.progressUpdates = {}
        draft.reminderSchedule = {}
        draft.loading = {}
        draft.errors = {}
        draft.filters = {}
        draft.isConnected = false
        draft.syncErrors = []
        draft.optimisticActions = []
        draft.pendingUpdates = []
      })
    },
    
    _meta: {
      version: 1,
      lastUpdated: Date.now(),
      hydrated: false
    }
  }),
  {
    name: 'meeting-actionables',
    version: 1,
    partialize: (state) => ({
      // Persist user preferences and non-sensitive data
      filters: state.filters,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
      reminderSchedule: state.reminderSchedule,
      lastSyncTime: state.lastSyncTime,
      pendingUpdates: state.pendingUpdates, // For offline support
      _meta: state._meta
    })
  }
)

// ============================================================================
// SELECTOR EXPORTS
// ============================================================================

export const actionableStoreSelectors = createSelectors(actionablesStore)

// ============================================================================
// UTILITY HOOKS
// ============================================================================

export const useActionables = () => actionablesStore()
export const useActionable = (id: string) => actionablesStore(state => state.actionables[id])
export const useActionableLoading = () => actionablesStore(state => Object.values(state.loading).some(Boolean))
export const useActionableErrors = () => actionablesStore(state => state.errors)
export const useActionableAnalytics = () => actionablesStore(state => state.analytics)
export const useMyActionables = (userId: string) => actionablesStore(state => actionableSelectors.getMyActionables(state, userId))
export const useOverdueActionables = () => actionablesStore(actionableSelectors.getOverdueActionables)
export const useDueSoonActionables = (daysAhead?: number) => actionablesStore(state => actionableSelectors.getDueSoonActionables(state, daysAhead))
export const useFilteredActionables = () => actionablesStore(actionableSelectors.getFilteredActionables)
export const useActionableStats = () => actionablesStore(actionableSelectors.getActionableStats)
export const useProductivityMetrics = (userId: string) => actionablesStore(state => actionableSelectors.getProductivityMetrics(state, userId))
export const useUpcomingReminders = () => actionablesStore(actionableSelectors.getUpcomingReminders)

// Initialize real-time connections on client side
if (typeof window !== 'undefined') {
  // Auto-connect would be handled by a higher-level component
}