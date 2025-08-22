import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { StoreSlice } from './types'

// Optimistic update status
export type OptimisticStatus = 'pending' | 'committed' | 'failed' | 'rolled_back'

// Conflict resolution strategies
export type ConflictResolutionStrategy = 'server_wins' | 'client_wins' | 'merge' | 'manual'

// Optimistic update definition
export interface OptimisticUpdate<T = any> {
  id: string
  type: string
  entity: string
  entityId: string
  status: OptimisticStatus
  timestamp: number
  retryCount: number
  maxRetries: number
  
  // Data states
  optimisticData: T
  rollbackData?: T
  serverData?: T
  
  // Operations
  operation: 'create' | 'update' | 'delete'
  apiCall: () => Promise<T>
  rollbackCall?: () => Promise<void>
  
  // Conflict resolution
  conflictStrategy: ConflictResolutionStrategy
  conflictResolver?: (client: T, server: T) => T
  
  // Retry configuration
  retryDelay: number
  backoffMultiplier: number
  
  // Metadata
  metadata?: Record<string, any>
  dependencies?: string[]
}

// Update queue configuration
export interface UpdateQueueConfig {
  maxConcurrentUpdates: number
  batchSize: number
  batchDelay: number
  retryDelay: number
  maxRetries: number
  conflictStrategy: ConflictResolutionStrategy
}

// Optimistic store state
export interface OptimisticStoreState extends StoreSlice {
  updates: Map<string, OptimisticUpdate>
  queue: string[]
  processing: Set<string>
  config: UpdateQueueConfig
  paused: boolean
  
  // Statistics
  stats: {
    totalUpdates: number
    successfulUpdates: number
    failedUpdates: number
    rolledBackUpdates: number
    averageProcessingTime: number
  }
  
  // Actions
  addOptimisticUpdate: <T>(update: Omit<OptimisticUpdate<T>, 'id' | 'timestamp' | 'status' | 'retryCount'>) => string
  commitUpdate: (updateId: string, serverData?: any) => void
  rollbackUpdate: (updateId: string, reason?: string) => Promise<void>
  retryUpdate: (updateId: string) => Promise<void>
  cancelUpdate: (updateId: string) => void
  
  // Queue management
  processQueue: () => Promise<void>
  pauseQueue: () => void
  resumeQueue: () => void
  clearQueue: () => void
  
  // Batch operations
  addBatch: <T>(updates: Omit<OptimisticUpdate<T>, 'id' | 'timestamp' | 'status' | 'retryCount'>[]) => string[]
  commitBatch: (updateIds: string[], serverData?: any[]) => void
  rollbackBatch: (updateIds: string[], reason?: string) => Promise<void>
  
  // Conflict resolution
  resolveConflict: <T>(updateId: string, serverData: T) => Promise<T>
  setConflictStrategy: (strategy: ConflictResolutionStrategy) => void
  
  // Configuration
  updateConfig: (config: Partial<UpdateQueueConfig>) => void
  
  // Utilities
  getUpdate: (updateId: string) => OptimisticUpdate | undefined
  getPendingUpdates: () => OptimisticUpdate[]
  getFailedUpdates: () => OptimisticUpdate[]
  getUpdatesByEntity: (entity: string, entityId?: string) => OptimisticUpdate[]
  getStats: () => typeof OptimisticStoreState.prototype.stats
}

// Default configuration
const defaultConfig: UpdateQueueConfig = {
  maxConcurrentUpdates: 5,
  batchSize: 10,
  batchDelay: 100,
  retryDelay: 1000,
  maxRetries: 3,
  conflictStrategy: 'server_wins'
}

// Create optimistic store
export const optimisticStore = create<OptimisticStoreState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      updates: new Map(),
      queue: [],
      processing: new Set(),
      config: defaultConfig,
      paused: false,
      
      stats: {
        totalUpdates: 0,
        successfulUpdates: 0,
        failedUpdates: 0,
        rolledBackUpdates: 0,
        averageProcessingTime: 0
      },

      // Add optimistic update
      addOptimisticUpdate: <T>(updateData: Omit<OptimisticUpdate<T>, 'id' | 'timestamp' | 'status' | 'retryCount'>) => {
        const id = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const timestamp = Date.now()
        
        const update: OptimisticUpdate<T> = {
          id,
          timestamp,
          status: 'pending',
          retryCount: 0,
          maxRetries: updateData.maxRetries || get().config.maxRetries,
          retryDelay: updateData.retryDelay || get().config.retryDelay,
          backoffMultiplier: updateData.backoffMultiplier || 2,
          conflictStrategy: updateData.conflictStrategy || get().config.conflictStrategy,
          ...updateData
        }

        set(draft => {
          draft.updates.set(id, update)
          draft.queue.push(id)
          draft.stats.totalUpdates++
        })

        // Start processing if not paused
        if (!get().paused) {
          setTimeout(() => get().processQueue(), 0)
        }

        console.log(`[OptimisticStore] Added optimistic update: ${id} (${update.type})`)
        
        return id
      },

      // Commit update (mark as successful)
      commitUpdate: (updateId: string, serverData?: any) => {
        set(draft => {
          const update = draft.updates.get(updateId)
          if (update && update.status === 'pending') {
            update.status = 'committed'
            update.serverData = serverData
            draft.stats.successfulUpdates++
            draft.processing.delete(updateId)
          }
        })

        console.log(`[OptimisticStore] Committed update: ${updateId}`)
      },

      // Rollback update
      rollbackUpdate: async (updateId: string, reason?: string) => {
        const update = get().updates.get(updateId)
        if (!update) return

        set(draft => {
          draft.processing.add(updateId)
        })

        try {
          // Execute rollback if provided
          if (update.rollbackCall) {
            await update.rollbackCall()
          }

          set(draft => {
            const updatedUpdate = draft.updates.get(updateId)
            if (updatedUpdate) {
              updatedUpdate.status = 'rolled_back'
              updatedUpdate.metadata = {
                ...updatedUpdate.metadata,
                rollbackReason: reason
              }
              draft.stats.rolledBackUpdates++
            }
            draft.processing.delete(updateId)
          })

          console.log(`[OptimisticStore] Rolled back update: ${updateId}`, reason)
        } catch (error) {
          console.error(`[OptimisticStore] Rollback failed for update: ${updateId}`, error)
          
          set(draft => {
            const updatedUpdate = draft.updates.get(updateId)
            if (updatedUpdate) {
              updatedUpdate.status = 'failed'
              updatedUpdate.metadata = {
                ...updatedUpdate.metadata,
                rollbackError: error instanceof Error ? error.message : String(error)
              }
            }
            draft.processing.delete(updateId)
          })
        }
      },

      // Retry update
      retryUpdate: async (updateId: string) => {
        const update = get().updates.get(updateId)
        if (!update || update.retryCount >= update.maxRetries) {
          return
        }

        const delay = update.retryDelay * Math.pow(update.backoffMultiplier, update.retryCount)
        
        set(draft => {
          const updatedUpdate = draft.updates.get(updateId)
          if (updatedUpdate) {
            updatedUpdate.retryCount++
            updatedUpdate.status = 'pending'
          }
        })

        console.log(`[OptimisticStore] Retrying update: ${updateId} (attempt ${update.retryCount + 1}) in ${delay}ms`)

        setTimeout(() => {
          const currentUpdate = get().updates.get(updateId)
          if (currentUpdate && currentUpdate.status === 'pending') {
            get().queue.push(updateId)
            get().processQueue()
          }
        }, delay)
      },

      // Cancel update
      cancelUpdate: (updateId: string) => {
        set(draft => {
          draft.updates.delete(updateId)
          draft.queue = draft.queue.filter(id => id !== updateId)
          draft.processing.delete(updateId)
        })

        console.log(`[OptimisticStore] Cancelled update: ${updateId}`)
      },

      // Process update queue
      processQueue: async () => {
        const state = get()
        if (state.paused || state.queue.length === 0) {
          return
        }

        const availableSlots = state.config.maxConcurrentUpdates - state.processing.size
        if (availableSlots <= 0) {
          return
        }

        const toProcess = state.queue.splice(0, Math.min(availableSlots, state.config.batchSize))
        
        set(draft => {
          toProcess.forEach(id => {
            draft.processing.add(id)
            draft.queue = draft.queue.filter(queueId => queueId !== id)
          })
        })

        // Process updates concurrently
        const promises = toProcess.map(async (updateId) => {
          const update = get().updates.get(updateId)
          if (!update) return

          const startTime = performance.now()

          try {
            console.log(`[OptimisticStore] Processing update: ${updateId}`)
            
            const result = await update.apiCall()
            
            // Check for conflicts
            if (update.serverData && update.conflictStrategy !== 'server_wins') {
              const resolvedData = await get().resolveConflict(updateId, result)
              get().commitUpdate(updateId, resolvedData)
            } else {
              get().commitUpdate(updateId, result)
            }

            // Update processing time statistics
            const processingTime = performance.now() - startTime
            set(draft => {
              const stats = draft.stats
              stats.averageProcessingTime = 
                (stats.averageProcessingTime * (stats.successfulUpdates - 1) + processingTime) / 
                stats.successfulUpdates
            })

          } catch (error) {
            console.error(`[OptimisticStore] Update failed: ${updateId}`, error)
            
            set(draft => {
              const failedUpdate = draft.updates.get(updateId)
              if (failedUpdate) {
                failedUpdate.status = 'failed'
                failedUpdate.metadata = {
                  ...failedUpdate.metadata,
                  error: error instanceof Error ? error.message : String(error)
                }
                draft.stats.failedUpdates++
              }
              draft.processing.delete(updateId)
            })

            // Retry if under limit
            if (update.retryCount < update.maxRetries) {
              await get().retryUpdate(updateId)
            } else {
              // Rollback if max retries exceeded
              await get().rollbackUpdate(updateId, 'Max retries exceeded')
            }
          }
        })

        await Promise.allSettled(promises)

        // Continue processing if there are more items in queue
        if (get().queue.length > 0) {
          setTimeout(() => get().processQueue(), get().config.batchDelay)
        }
      },

      // Pause queue processing
      pauseQueue: () => {
        set(draft => {
          draft.paused = true
        })
        console.log('[OptimisticStore] Queue processing paused')
      },

      // Resume queue processing
      resumeQueue: () => {
        set(draft => {
          draft.paused = false
        })
        console.log('[OptimisticStore] Queue processing resumed')
        get().processQueue()
      },

      // Clear queue
      clearQueue: () => {
        set(draft => {
          draft.queue = []
          draft.processing.clear()
        })
        console.log('[OptimisticStore] Queue cleared')
      },

      // Add batch of updates
      addBatch: <T>(updates: Omit<OptimisticUpdate<T>, 'id' | 'timestamp' | 'status' | 'retryCount'>[]) => {
        const ids: string[] = []
        
        updates.forEach(updateData => {
          const id = get().addOptimisticUpdate(updateData)
          ids.push(id)
        })

        console.log(`[OptimisticStore] Added batch of ${updates.length} updates:`, ids)
        return ids
      },

      // Commit batch of updates
      commitBatch: (updateIds: string[], serverData?: any[]) => {
        updateIds.forEach((id, index) => {
          const data = serverData?.[index]
          get().commitUpdate(id, data)
        })

        console.log(`[OptimisticStore] Committed batch of ${updateIds.length} updates`)
      },

      // Rollback batch of updates
      rollbackBatch: async (updateIds: string[], reason?: string) => {
        const promises = updateIds.map(id => get().rollbackUpdate(id, reason))
        await Promise.allSettled(promises)

        console.log(`[OptimisticStore] Rolled back batch of ${updateIds.length} updates`)
      },

      // Resolve conflict between client and server data
      resolveConflict: async <T>(updateId: string, serverData: T): Promise<T> => {
        const update = get().updates.get(updateId)
        if (!update) return serverData

        switch (update.conflictStrategy) {
          case 'server_wins':
            return serverData

          case 'client_wins':
            return update.optimisticData

          case 'merge':
            if (update.conflictResolver) {
              return update.conflictResolver(update.optimisticData, serverData)
            }
            // Default merge strategy (shallow merge)
            return { ...serverData, ...update.optimisticData }

          case 'manual':
            // Emit event for manual resolution
            console.warn(`[OptimisticStore] Manual conflict resolution required for update: ${updateId}`)
            // For now, default to server wins
            return serverData

          default:
            return serverData
        }
      },

      // Set global conflict resolution strategy
      setConflictStrategy: (strategy: ConflictResolutionStrategy) => {
        set(draft => {
          draft.config.conflictStrategy = strategy
        })
        console.log(`[OptimisticStore] Conflict strategy set to: ${strategy}`)
      },

      // Update configuration
      updateConfig: (newConfig: Partial<UpdateQueueConfig>) => {
        set(draft => {
          draft.config = { ...draft.config, ...newConfig }
        })
        console.log('[OptimisticStore] Configuration updated:', newConfig)
      },

      // Get specific update
      getUpdate: (updateId: string) => {
        return get().updates.get(updateId)
      },

      // Get pending updates
      getPendingUpdates: () => {
        return Array.from(get().updates.values()).filter(update => update.status === 'pending')
      },

      // Get failed updates
      getFailedUpdates: () => {
        return Array.from(get().updates.values()).filter(update => update.status === 'failed')
      },

      // Get updates by entity
      getUpdatesByEntity: (entity: string, entityId?: string) => {
        return Array.from(get().updates.values()).filter(update => 
          update.entity === entity && (!entityId || update.entityId === entityId)
        )
      },

      // Get statistics
      getStats: () => {
        return { ...get().stats }
      },

      _meta: {
        version: 1,
        lastUpdated: Date.now(),
        hydrated: false
      }
    }))
  )
)

// Utility function to enhance any Zustand store with optimistic updates
export function withOptimisticUpdates<T extends object>(store: any) {
  return {
    ...store,
    
    // Add optimistic update methods to the store
    optimistic: {
      add: optimisticStore.getState().addOptimisticUpdate,
      commit: optimisticStore.getState().commitUpdate,
      rollback: optimisticStore.getState().rollbackUpdate,
      retry: optimisticStore.getState().retryUpdate,
      cancel: optimisticStore.getState().cancelUpdate,
      
      // Batch operations
      addBatch: optimisticStore.getState().addBatch,
      commitBatch: optimisticStore.getState().commitBatch,
      rollbackBatch: optimisticStore.getState().rollbackBatch,
      
      // Queue management
      pauseQueue: optimisticStore.getState().pauseQueue,
      resumeQueue: optimisticStore.getState().resumeQueue,
      clearQueue: optimisticStore.getState().clearQueue,
      
      // Utilities
      getUpdate: optimisticStore.getState().getUpdate,
      getPendingUpdates: optimisticStore.getState().getPendingUpdates,
      getFailedUpdates: optimisticStore.getState().getFailedUpdates,
      getUpdatesByEntity: optimisticStore.getState().getUpdatesByEntity,
      getStats: optimisticStore.getState().getStats
    }
  }
}

// React hooks for optimistic updates
export function useOptimisticUpdate() {
  return {
    add: optimisticStore.getState().addOptimisticUpdate,
    commit: optimisticStore.getState().commitUpdate,
    rollback: optimisticStore.getState().rollbackUpdate,
    retry: optimisticStore.getState().retryUpdate,
    cancel: optimisticStore.getState().cancelUpdate
  }
}

export function useOptimisticStats() {
  return optimisticStore(state => state.stats)
}

export function useOptimisticQueue() {
  return optimisticStore(state => ({
    queue: state.queue,
    processing: state.processing,
    paused: state.paused,
    pendingCount: state.queue.length,
    processingCount: state.processing.size
  }))
}

// Helper function to create optimistic CRUD operations
export function createOptimisticCRUD<T>(entity: string, apiClient: any) {
  return {
    create: (data: Partial<T>, options?: Partial<OptimisticUpdate>) => {
      return optimisticStore.getState().addOptimisticUpdate({
        type: 'create',
        entity,
        entityId: 'temp_' + Date.now(),
        operation: 'create',
        optimisticData: data,
        apiCall: () => apiClient.create(data),
        conflictStrategy: 'server_wins',
        ...options
      })
    },

    update: (id: string, data: Partial<T>, rollbackData?: T, options?: Partial<OptimisticUpdate>) => {
      return optimisticStore.getState().addOptimisticUpdate({
        type: 'update',
        entity,
        entityId: id,
        operation: 'update',
        optimisticData: data,
        rollbackData,
        apiCall: () => apiClient.update(id, data),
        rollbackCall: rollbackData ? () => apiClient.update(id, rollbackData) : undefined,
        conflictStrategy: 'merge',
        ...options
      })
    },

    delete: (id: string, rollbackData?: T, options?: Partial<OptimisticUpdate>) => {
      return optimisticStore.getState().addOptimisticUpdate({
        type: 'delete',
        entity,
        entityId: id,
        operation: 'delete',
        optimisticData: { deleted: true },
        rollbackData,
        apiCall: () => apiClient.delete(id),
        rollbackCall: rollbackData ? () => apiClient.create(rollbackData) : undefined,
        conflictStrategy: 'server_wins',
        ...options
      })
    }
  }
}

// Development utilities
if (process.env.NODE_ENV === 'development') {
  // Make optimistic store available globally for debugging
  (window as any).optimisticStore = optimisticStore
  
  // Add performance monitoring
  setInterval(() => {
    const stats = optimisticStore.getState().getStats()
    if (stats.totalUpdates > 0) {
      console.log('[OptimisticStore] Performance Stats:', {
        totalUpdates: stats.totalUpdates,
        successRate: ((stats.successfulUpdates / stats.totalUpdates) * 100).toFixed(1) + '%',
        avgProcessingTime: stats.averageProcessingTime.toFixed(2) + 'ms',
        pendingUpdates: optimisticStore.getState().queue.length,
        processingUpdates: optimisticStore.getState().processing.size
      })
    }
  }, 30000) // Log every 30 seconds
}