/**
 * useMeetingStores Hook
 * Comprehensive hook for managing meeting resolutions and actionables
 */

import { useEffect, useCallback, useMemo } from 'react'
import { 
  resolutionsStore, 
  actionablesStore,
  MeetingStoreManager,
  MeetingRealTimeHandler,
  MeetingOfflineSupport
} from '../lib/stores/meeting-stores'
import type { 
  ResolutionFilters, 
  ActionableFilters,
  CreateResolutionRequest,
  CreateActionableRequest,
  UpdateResolutionRequest,
  UpdateActionableRequest,
  CastVoteRequest
} from '../types/meetings'

interface UseMeetingStoresOptions {
  meetingId?: string
  organizationId: string
  userId: string
  enableRealTime?: boolean
  autoFetch?: boolean
  pollInterval?: number
}

interface MeetingStoresState {
  // Data
  resolutions: any[]
  actionables: any[]
  resolutionAnalytics: any
  actionableAnalytics: any
  meetingOverview: any
  productivityDashboard: any
  
  // UI State
  isLoading: boolean
  hasErrors: boolean
  isConnected: boolean
  hasPendingUpdates: boolean
  
  // Filtered data
  filteredResolutions: any[]
  filteredActionables: any[]
  myActionables: any[]
  overdueActionables: any[]
  dueSoonActionables: any[]
  upcomingReminders: any[]
  
  // Actions - Resolutions
  createResolution: (request: CreateResolutionRequest) => Promise<any>
  updateResolution: (id: string, updates: UpdateResolutionRequest) => Promise<any>
  deleteResolution: (id: string) => Promise<boolean>
  castVote: (voteRequest: CastVoteRequest) => Promise<any>
  startVoting: (resolutionId: string, votingMethod: any) => Promise<boolean>
  concludeVoting: (resolutionId: string) => Promise<boolean>
  
  // Actions - Actionables
  createActionable: (request: CreateActionableRequest) => Promise<any>
  updateActionable: (id: string, updates: UpdateActionableRequest) => Promise<any>
  deleteActionable: (id: string) => Promise<boolean>
  updateProgress: (actionableId: string, progress: number, notes?: string) => Promise<boolean>
  markCompleted: (actionableId: string, notes: string) => Promise<boolean>
  markBlocked: (actionableId: string, reason: string) => Promise<boolean>
  delegateActionable: (actionableId: string, delegatedTo: string, reason: string) => Promise<boolean>
  escalateActionable: (actionableId: string, reason: string, escalatedTo?: string) => Promise<boolean>
  
  // Actions - Filtering & Search
  updateResolutionFilters: (filters: Partial<ResolutionFilters>) => void
  updateActionableFilters: (filters: Partial<ActionableFilters>) => void
  clearAllFilters: () => void
  
  // Actions - Data Management
  fetchMeetingData: () => Promise<void>
  refreshAnalytics: () => Promise<void>
  syncPendingUpdates: () => Promise<void>
  
  // Actions - Real-time
  enableRealTime: () => Promise<void>
  disableRealTime: () => Promise<void>
  
  // Actions - Utility
  clearErrors: () => void
  cleanup: () => void
}

export function useMeetingStores(options: UseMeetingStoresOptions): MeetingStoresState {
  const {
    meetingId,
    organizationId,
    userId,
    enableRealTime = true,
    autoFetch = true,
    pollInterval = 30000 // 30 seconds
  } = options

  // Subscribe to store states
  const resolutionsState = resolutionsStore()
  const actionablesState = actionablesStore()

  // Computed values
  const computedState = useMemo(() => {
    const resolutions = Object.values(resolutionsState.resolutions)
    const actionables = Object.values(actionablesState.actionables)
    
    // Filter by meeting if specified
    const meetingResolutions = meetingId 
      ? resolutions.filter(r => r.meetingId === meetingId)
      : resolutions
    
    const meetingActionables = meetingId
      ? actionables.filter(a => a.meetingId === meetingId)
      : actionables

    // Get filtered data
    const filteredResolutions = resolutionsState.resolutions 
      ? Object.values(resolutionsState.resolutions).filter(r => {
          const filters = resolutionsState.filters
          if (meetingId && r.meetingId !== meetingId) return false
          if (filters.status && r.status !== filters.status) return false
          if (filters.resolutionType && r.resolutionType !== filters.resolutionType) return false
          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase()
            return r.title.toLowerCase().includes(term) ||
                   r.description.toLowerCase().includes(term) ||
                   r.resolutionText.toLowerCase().includes(term)
          }
          return true
        })
      : []

    const filteredActionables = actionablesState.actionables
      ? Object.values(actionablesState.actionables).filter(a => {
          const filters = actionablesState.filters
          if (meetingId && a.meetingId !== meetingId) return false
          if (filters.status && a.status !== filters.status) return false
          if (filters.priority && a.priority !== filters.priority) return false
          if (filters.assignedTo && a.assignedTo !== filters.assignedTo) return false
          if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase()
            return a.title.toLowerCase().includes(term) ||
                   a.description.toLowerCase().includes(term)
          }
          return true
        })
      : []

    // User-specific data
    const myActionables = actionables.filter(a => a.assignedTo === userId)
    
    const now = new Date()
    const overdueActionables = actionables.filter(a => 
      new Date(a.dueDate) < now && 
      a.status !== 'completed' && 
      a.status !== 'cancelled'
    )
    
    const dueSoonActionables = actionables.filter(a => {
      const dueDate = new Date(a.dueDate)
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000))
      return dueDate >= now && 
             dueDate <= threeDaysFromNow && 
             a.status !== 'completed' && 
             a.status !== 'cancelled'
    })

    // Get upcoming reminders
    const upcomingReminders: any[] = []
    Object.entries(actionablesState.reminderSchedule).forEach(([actionableId, reminders]) => {
      const actionable = actionablesState.actionables[actionableId]
      if (actionable && actionable.status !== 'completed') {
        reminders.forEach((reminderTime: number) => {
          if (reminderTime > now.getTime() && reminderTime < now.getTime() + (24 * 60 * 60 * 1000)) {
            upcomingReminders.push({ actionableId, actionable, reminderTime })
          }
        })
      }
    })
    upcomingReminders.sort((a, b) => a.reminderTime - b.reminderTime)

    // Get meeting overview
    const meetingOverview = meetingId ? MeetingStoreManager.getMeetingOverview(meetingId) : null

    // Get productivity dashboard
    const productivityDashboard = MeetingStoreManager.getProductivityDashboard(userId, organizationId)

    return {
      resolutions: meetingResolutions,
      actionables: meetingActionables,
      filteredResolutions,
      filteredActionables,
      myActionables,
      overdueActionables,
      dueSoonActionables,
      upcomingReminders,
      meetingOverview,
      productivityDashboard
    }
  }, [resolutionsState, actionablesState, meetingId, userId, organizationId])

  // State flags
  const isLoading = MeetingStoreManager.isAnyLoading()
  const hasErrors = MeetingStoreManager.hasAnyErrors()
  const isConnected = resolutionsState.isConnected && actionablesState.isConnected
  const hasPendingUpdates = MeetingOfflineSupport.hasPendingUpdates()

  // Resolution actions
  const resolutionActions = useMemo(() => ({
    createResolution: resolutionsState.createResolution,
    updateResolution: resolutionsState.updateResolution,
    deleteResolution: resolutionsState.deleteResolution,
    castVote: resolutionsState.castVote,
    startVoting: resolutionsState.startVoting,
    concludeVoting: resolutionsState.concludeVoting
  }), [resolutionsState])

  // Actionable actions
  const actionableActions = useMemo(() => ({
    createActionable: actionablesState.createActionable,
    updateActionable: actionablesState.updateActionable,
    deleteActionable: actionablesState.deleteActionable,
    updateProgress: actionablesState.updateProgress,
    markCompleted: actionablesState.markCompleted,
    markBlocked: actionablesState.markBlocked,
    delegateActionable: actionablesState.delegateActionable,
    escalateActionable: actionablesState.escalateActionable
  }), [actionablesState])

  // Filter actions
  const updateResolutionFilters = useCallback((filters: Partial<ResolutionFilters>) => {
    resolutionsState.updateFilters(filters)
  }, [resolutionsState])

  const updateActionableFilters = useCallback((filters: Partial<ActionableFilters>) => {
    actionablesState.updateFilters(filters)
  }, [actionablesState])

  const clearAllFilters = useCallback(() => {
    resolutionsState.updateFilters({})
    actionablesState.updateFilters({})
  }, [resolutionsState, actionablesState])

  // Data management actions
  const fetchMeetingData = useCallback(async () => {
    const promises = []
    
    if (meetingId) {
      promises.push(resolutionsState.fetchResolutions(meetingId))
      promises.push(actionablesState.fetchActionables(meetingId))
    } else {
      promises.push(resolutionsState.fetchResolutions())
      promises.push(actionablesState.fetchActionables())
    }
    
    await Promise.all(promises)
  }, [meetingId, resolutionsState, actionablesState])

  const refreshAnalytics = useCallback(async () => {
    await Promise.all([
      resolutionsState.fetchAnalytics(organizationId),
      actionablesState.fetchAnalytics(organizationId)
    ])
  }, [organizationId, resolutionsState, actionablesState])

  const syncPendingUpdates = useCallback(async () => {
    await MeetingOfflineSupport.syncWhenOnline()
  }, [])

  // Real-time actions
  const enableRealTimeSync = useCallback(async () => {
    await MeetingStoreManager.initializeRealTimeSync(organizationId)
  }, [organizationId])

  const disableRealTimeSync = useCallback(async () => {
    await MeetingStoreManager.disconnectRealTimeSync()
  }, [])

  // Utility actions
  const clearErrors = useCallback(() => {
    MeetingStoreManager.clearAllErrors()
  }, [])

  const cleanup = useCallback(() => {
    MeetingStoreManager.cleanup()
  }, [])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchMeetingData()
      refreshAnalytics()
    }
  }, [autoFetch, fetchMeetingData, refreshAnalytics])

  // Enable real-time sync
  useEffect(() => {
    if (enableRealTime) {
      enableRealTimeSync()
    }
    
    return () => {
      if (enableRealTime) {
        disableRealTimeSync()
      }
    }
  }, [enableRealTime, enableRealTimeSync, disableRealTimeSync])

  // Polling fallback when real-time is not available
  useEffect(() => {
    if (!enableRealTime && pollInterval > 0) {
      const interval = setInterval(() => {
        fetchMeetingData()
      }, pollInterval)
      
      return () => clearInterval(interval)
    }
  }, [enableRealTime, pollInterval, fetchMeetingData])

  // Sync pending updates when coming back online
  useEffect(() => {
    if (isConnected && hasPendingUpdates) {
      syncPendingUpdates()
    }
  }, [isConnected, hasPendingUpdates, syncPendingUpdates])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (enableRealTime) {
        disableRealTimeSync()
      }
    }
  }, [enableRealTime, disableRealTimeSync])

  return {
    // Data
    ...computedState,
    resolutionAnalytics: resolutionsState.analytics,
    actionableAnalytics: actionablesState.analytics,
    
    // State flags
    isLoading,
    hasErrors,
    isConnected,
    hasPendingUpdates,
    
    // Actions
    ...resolutionActions,
    ...actionableActions,
    
    // Filter actions
    updateResolutionFilters,
    updateActionableFilters,
    clearAllFilters,
    
    // Data management
    fetchMeetingData,
    refreshAnalytics,
    syncPendingUpdates,
    
    // Real-time
    enableRealTime: enableRealTimeSync,
    disableRealTime: disableRealTimeSync,
    
    // Utility
    clearErrors,
    cleanup
  }
}

// Additional specialized hooks
export function useMeetingOverview(meetingId: string) {
  return useMeetingStores({ 
    meetingId, 
    organizationId: '', 
    userId: '',
    autoFetch: true,
    enableRealTime: true
  })
}

export function useUserProductivity(userId: string, organizationId: string) {
  const stores = useMeetingStores({ 
    organizationId, 
    userId,
    autoFetch: true,
    enableRealTime: false
  })
  
  return {
    myActionables: stores.myActionables,
    overdueActionables: stores.overdueActionables.filter(a => a.assignedTo === userId),
    dueSoonActionables: stores.dueSoonActionables.filter(a => a.assignedTo === userId),
    upcomingReminders: stores.upcomingReminders,
    productivityDashboard: stores.productivityDashboard,
    updateProgress: stores.updateProgress,
    markCompleted: stores.markCompleted,
    markBlocked: stores.markBlocked
  }
}

export function useOrganizationDashboard(organizationId: string) {
  const stores = useMeetingStores({ 
    organizationId, 
    userId: '',
    autoFetch: true,
    enableRealTime: true
  })
  
  return {
    resolutionAnalytics: stores.resolutionAnalytics,
    actionableAnalytics: stores.actionableAnalytics,
    overdueActionables: stores.overdueActionables,
    refreshAnalytics: stores.refreshAnalytics,
    isLoading: stores.isLoading,
    hasErrors: stores.hasErrors
  }
}