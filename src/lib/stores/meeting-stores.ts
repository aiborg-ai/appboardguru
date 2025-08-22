/**
 * Meeting Stores Index
 * Centralized exports and utilities for meeting-related Zustand stores
 */

// Store exports
export { 
  resolutionsStore, 
  resolutionStoreSelectors,
  resolutionSelectors,
  useResolutions,
  useResolution,
  useResolutionLoading,
  useResolutionErrors,
  useResolutionAnalytics,
  useFilteredResolutions,
  useResolutionStats
} from './meeting-resolutions.store'

export {
  actionablesStore,
  actionableStoreSelectors,
  actionableSelectors,
  useActionables,
  useActionable,
  useActionableLoading,
  useActionableErrors,
  useActionableAnalytics,
  useMyActionables,
  useOverdueActionables,
  useDueSoonActionables,
  useFilteredActionables,
  useActionableStats,
  useProductivityMetrics,
  useUpcomingReminders
} from './meeting-actionables.store'

// Type exports
export type { ResolutionsState } from './meeting-resolutions.store'
export type { ActionablesState } from './meeting-actionables.store'

// Utility functions for cross-store operations
import { resolutionsStore } from './meeting-resolutions.store'
import { actionablesStore } from './meeting-actionables.store'
import type { 
  MeetingResolution, 
  MeetingActionable,
  ResolutionStatus,
  ActionableStatus
} from '../../types/meetings'

/**
 * Meeting Store Manager
 * Provides utilities for managing both resolutions and actionables stores
 */
export class MeetingStoreManager {
  /**
   * Initialize both stores with real-time sync for an organization
   */
  static async initializeRealTimeSync(organizationId: string): Promise<void> {
    await Promise.all([
      resolutionsStore.getState().enableRealTimeSync(organizationId),
      actionablesStore.getState().enableRealTimeSync(organizationId)
    ])
  }

  /**
   * Disconnect real-time sync for both stores
   */
  static async disconnectRealTimeSync(): Promise<void> {
    await Promise.all([
      resolutionsStore.getState().disableRealTimeSync(),
      actionablesStore.getState().disableRealTimeSync()
    ])
  }

  /**
   * Force sync both stores
   */
  static async forceSyncAll(): Promise<void> {
    await Promise.all([
      resolutionsStore.getState().forceSyncResolutions(),
      actionablesStore.getState().syncPendingUpdates()
    ])
  }

  /**
   * Clear all errors from both stores
   */
  static clearAllErrors(): void {
    resolutionsStore.getState().clearErrors()
    actionablesStore.getState().clearErrors()
  }

  /**
   * Cleanup both stores
   */
  static cleanup(): void {
    resolutionsStore.getState().cleanup()
    actionablesStore.getState().cleanup()
  }

  /**
   * Get combined loading state
   */
  static isAnyLoading(): boolean {
    const resolutionsLoading = Object.values(resolutionsStore.getState().loading).some(Boolean)
    const actionablesLoading = Object.values(actionablesStore.getState().loading).some(Boolean)
    return resolutionsLoading || actionablesLoading
  }

  /**
   * Get combined error state
   */
  static hasAnyErrors(): boolean {
    const resolutionsErrors = Object.values(resolutionsStore.getState().errors).some(Boolean)
    const actionablesErrors = Object.values(actionablesStore.getState().errors).some(Boolean)
    const resolutionsSyncErrors = resolutionsStore.getState().syncErrors.length > 0
    const actionablesSyncErrors = actionablesStore.getState().syncErrors.length > 0
    
    return resolutionsErrors || actionablesErrors || resolutionsSyncErrors || actionablesSyncErrors
  }

  /**
   * Get meeting overview data
   */
  static getMeetingOverview(meetingId: string) {
    const resolutionsState = resolutionsStore.getState()
    const actionablesState = actionablesStore.getState()

    const meetingResolutions = Object.values(resolutionsState.resolutions)
      .filter(r => r.meetingId === meetingId)

    const meetingActionables = Object.values(actionablesState.actionables)
      .filter(a => a.meetingId === meetingId)

    return {
      resolutions: {
        total: meetingResolutions.length,
        passed: meetingResolutions.filter(r => r.status === 'passed').length,
        rejected: meetingResolutions.filter(r => r.status === 'rejected').length,
        pending: meetingResolutions.filter(r => r.status === 'proposed').length
      },
      actionables: {
        total: meetingActionables.length,
        completed: meetingActionables.filter(a => a.status === 'completed').length,
        inProgress: meetingActionables.filter(a => a.status === 'in_progress').length,
        overdue: meetingActionables.filter(a => {
          const now = new Date()
          return new Date(a.dueDate) < now && a.status !== 'completed' && a.status !== 'cancelled'
        }).length,
        blocked: meetingActionables.filter(a => a.status === 'blocked').length
      }
    }
  }

  /**
   * Create actionables from passed resolutions
   */
  static async createActionablesFromResolution(
    resolution: MeetingResolution,
    assignedTo: string,
    dueDate: string
  ): Promise<MeetingActionable | null> {
    if (resolution.status !== 'passed') {
      throw new Error('Can only create actionables from passed resolutions')
    }

    const actionableRequest = {
      meetingId: resolution.meetingId,
      resolutionId: resolution.id,
      assignedTo,
      title: `Implement: ${resolution.title}`,
      description: `Implementation of resolution: ${resolution.resolutionText}`,
      detailedRequirements: resolution.implementationNotes || resolution.description,
      category: 'implementation' as const,
      priority: resolution.priorityLevel <= 2 ? 'high' as const : 'medium' as const,
      dueDate,
      requiresApproval: resolution.requiresBoardApproval || resolution.requiresShareholderApproval
    }

    return actionablesStore.getState().createActionable(actionableRequest)
  }

  /**
   * Get productivity dashboard data
   */
  static getProductivityDashboard(userId: string, organizationId: string) {
    const resolutionsState = resolutionsStore.getState()
    const actionablesState = actionablesStore.getState()

    // User's voting participation
    const userVotes = Object.keys(resolutionsState.userVotes).length
    const totalVotableResolutions = Object.values(resolutionsState.resolutions)
      .filter(r => r.status === 'proposed' && resolutionsState.activeVotes[r.id]).length

    // User's actionable performance
    const userActionables = Object.values(actionablesState.actionables)
      .filter(a => a.assignedTo === userId)
    
    const completedActionables = userActionables.filter(a => a.status === 'completed')
    const overdueActionables = userActionables.filter(a => {
      const now = new Date()
      return new Date(a.dueDate) < now && a.status !== 'completed' && a.status !== 'cancelled'
    })

    const onTimeCompletions = completedActionables.filter(a => 
      a.completedAt && new Date(a.completedAt) <= new Date(a.dueDate)
    )

    return {
      voting: {
        participationRate: totalVotableResolutions > 0 ? (userVotes / totalVotableResolutions) * 100 : 0,
        totalVotes: userVotes,
        availableVotes: totalVotableResolutions
      },
      actionables: {
        assigned: userActionables.length,
        completed: completedActionables.length,
        overdue: overdueActionables.length,
        completionRate: userActionables.length > 0 ? (completedActionables.length / userActionables.length) * 100 : 0,
        onTimeRate: completedActionables.length > 0 ? (onTimeCompletions.length / completedActionables.length) * 100 : 0,
        averageProgress: userActionables.length > 0 
          ? userActionables.reduce((sum, a) => sum + a.progressPercentage, 0) / userActionables.length 
          : 0
      }
    }
  }
}

/**
 * Real-time Event Handlers
 * Handles WebSocket events for both stores
 */
export class MeetingRealTimeHandler {
  /**
   * Handle resolution real-time updates
   */
  static handleResolutionUpdate(resolutionId: string, updates: Partial<MeetingResolution>): void {
    const currentResolution = resolutionsStore.getState().resolutions[resolutionId]
    if (currentResolution) {
      resolutionsStore.getState().setResolution({
        ...currentResolution,
        ...updates,
        updatedAt: new Date().toISOString()
      })
    }
  }

  /**
   * Handle vote updates
   */
  static handleVoteUpdate(resolutionId: string, votes: any[]): void {
    resolutionsStore.getState().updateResolutionVotes(resolutionId, votes)
  }

  /**
   * Handle actionable real-time updates
   */
  static handleActionableUpdate(actionableId: string, updates: Partial<MeetingActionable>): void {
    const currentActionable = actionablesStore.getState().actionables[actionableId]
    if (currentActionable) {
      actionablesStore.getState().setActionable({
        ...currentActionable,
        ...updates,
        updatedAt: new Date().toISOString()
      })
    }
  }

  /**
   * Handle progress updates
   */
  static handleProgressUpdate(actionableId: string, update: any): void {
    actionablesStore.getState().addActionableUpdate(actionableId, update)
    
    if (update.newProgress !== undefined) {
      actionablesStore.getState().updateActionableProgress(actionableId, update.newProgress)
    }
  }

  /**
   * Handle reminder notifications
   */
  static handleReminderNotification(actionableId: string, reminderTime: number): void {
    actionablesStore.getState().scheduleReminder(actionableId, reminderTime)
  }
}

/**
 * Offline Support Utilities
 */
export class MeetingOfflineSupport {
  /**
   * Queue an update for offline processing
   */
  static queueOfflineUpdate(update: any): void {
    const state = actionablesStore.getState()
    
    // Add to pending updates
    actionablesStore.setState(draft => {
      draft.pendingUpdates.push(update)
      draft.lastOfflineAction = Date.now()
    })
  }

  /**
   * Check if offline updates are pending
   */
  static hasPendingUpdates(): boolean {
    return actionablesStore.getState().pendingUpdates.length > 0
  }

  /**
   * Sync all pending updates when back online
   */
  static async syncWhenOnline(): Promise<void> {
    const state = actionablesStore.getState()
    
    if (state.pendingUpdates.length > 0) {
      await state.syncPendingUpdates()
    }
  }
}

// Export utilities
export { MeetingStoreManager, MeetingRealTimeHandler, MeetingOfflineSupport }