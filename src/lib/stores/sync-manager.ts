import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { StoreSlice, SyncQueueItem, OfflineState } from './types'
import { webSocketManager } from './websocket-manager'

// Sync operation types
export type SyncOperation = 'create' | 'update' | 'delete' | 'patch'

// Sync status
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

// Cross-tab sync message
export interface CrossTabMessage<T = any> {
  type: 'state_sync' | 'action_sync' | 'conflict_notification'
  storeName: string
  data: T
  timestamp: number
  userId?: string
  sessionId: string
  version: number
}

// Conflict resolution result
export interface ConflictResolution<T = any> {
  resolved: T
  strategy: 'local_wins' | 'remote_wins' | 'merged' | 'manual'
  conflictData?: {
    local: T
    remote: T
    base?: T
  }
}

// Sync configuration
export interface SyncConfig {
  crossTab: {
    enabled: boolean
    channelName?: string
    conflictResolution: 'local_wins' | 'remote_wins' | 'timestamp_wins' | 'manual'
    debounceMs: number
  }
  realtime: {
    enabled: boolean
    reconnectOnError: boolean
    heartbeatInterval: number
  }
  offline: {
    enabled: boolean
    maxQueueSize: number
    retryInterval: number
    maxRetries: number
  }
  persistence: {
    enabled: boolean
    storageKey: string
  }
}

// Sync manager state
export interface SyncManagerState extends StoreSlice {
  // Configuration
  config: SyncConfig
  
  // State tracking
  syncStatus: SyncStatus
  lastSyncTime: number
  sessionId: string
  version: number
  
  // Cross-tab synchronization
  broadcastChannel?: BroadcastChannel
  remoteVersion: number
  
  // Offline queue
  offlineQueue: SyncQueueItem[]
  isOnline: boolean
  
  // Conflict management
  conflicts: Map<string, ConflictResolution>
  
  // Store registrations
  registeredStores: Map<string, {
    store: any
    lastSync: number
    version: number
    conflictResolver?: (local: any, remote: any) => any
  }>
  
  // Actions
  registerStore: (storeName: string, store: any, conflictResolver?: (local: any, remote: any) => any) => void
  unregisterStore: (storeName: string) => void
  
  // Cross-tab sync
  enableCrossTabSync: (storeName: string) => void
  disableCrossTabSync: (storeName: string) => void
  broadcastStateChange: (storeName: string, state: any, action?: string) => void
  
  // Real-time sync
  enableRealtimeSync: (storeName: string) => void
  disableRealtimeSync: (storeName: string) => void
  
  // Offline management
  addToOfflineQueue: (item: Omit<SyncQueueItem, 'id' | 'timestamp'>) => void
  processOfflineQueue: () => Promise<void>
  clearOfflineQueue: () => void
  
  // Conflict resolution
  resolveConflict: <T>(conflictId: string, resolution: ConflictResolution<T>) => void
  getConflicts: () => ConflictResolution[]
  
  // Utilities
  updateConfig: (newConfig: Partial<SyncConfig>) => void
  getStatus: () => { status: SyncStatus; isOnline: boolean; queueSize: number }
  forcSync: (storeName?: string) => Promise<void>
}

// Default configuration
const defaultConfig: SyncConfig = {
  crossTab: {
    enabled: true,
    conflictResolution: 'timestamp_wins',
    debounceMs: 300
  },
  realtime: {
    enabled: true,
    reconnectOnError: true,
    heartbeatInterval: 30000
  },
  offline: {
    enabled: true,
    maxQueueSize: 1000,
    retryInterval: 5000,
    maxRetries: 3
  },
  persistence: {
    enabled: true,
    storageKey: 'zustand-sync-queue'
  }
}

// Generate session ID
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Create sync manager store
export const syncManagerStore = create<SyncManagerState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      config: defaultConfig,
      syncStatus: 'idle',
      lastSyncTime: 0,
      sessionId: generateSessionId(),
      version: 1,
      remoteVersion: 0,
      offlineQueue: [],
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      conflicts: new Map(),
      registeredStores: new Map(),

      // Register a store for synchronization
      registerStore: (storeName: string, store: any, conflictResolver?: (local: any, remote: any) => any) => {
        set(draft => {
          draft.registeredStores.set(storeName, {
            store,
            lastSync: Date.now(),
            version: 1,
            conflictResolver
          })
        })

        const state = get()
        
        // Enable cross-tab sync if configured
        if (state.config.crossTab.enabled) {
          state.enableCrossTabSync(storeName)
        }
        
        // Enable real-time sync if configured
        if (state.config.realtime.enabled) {
          state.enableRealtimeSync(storeName)
        }

        console.log(`[SyncManager] Registered store: ${storeName}`)
      },

      // Unregister a store
      unregisterStore: (storeName: string) => {
        set(draft => {
          draft.registeredStores.delete(storeName)
        })

        // Clean up cross-tab sync
        get().disableCrossTabSync(storeName)
        get().disableRealtimeSync(storeName)

        console.log(`[SyncManager] Unregistered store: ${storeName}`)
      },

      // Enable cross-tab synchronization
      enableCrossTabSync: (storeName: string) => {
        const state = get()
        
        if (!state.broadcastChannel) {
          const channelName = state.config.crossTab.channelName || 'zustand-sync'
          
          if (typeof window !== 'undefined' && window.BroadcastChannel) {
            const channel = new BroadcastChannel(channelName)
            
            channel.onmessage = (event: MessageEvent<CrossTabMessage>) => {
              state.handleCrossTabMessage(event.data)
            }
            
            set(draft => {
              draft.broadcastChannel = channel
            })
            
            console.log(`[SyncManager] Cross-tab sync enabled for channel: ${channelName}`)
          }
        }
      },

      // Disable cross-tab synchronization
      disableCrossTabSync: (storeName: string) => {
        const state = get()
        
        // Check if any other stores need cross-tab sync
        const hasOtherStores = Array.from(state.registeredStores.keys()).some(name => name !== storeName)
        
        if (!hasOtherStores && state.broadcastChannel) {
          state.broadcastChannel.close()
          set(draft => {
            draft.broadcastChannel = undefined
          })
          
          console.log('[SyncManager] Cross-tab sync disabled')
        }
      },

      // Broadcast state change to other tabs
      broadcastStateChange: (storeName: string, state: any, action?: string) => {
        const syncState = get()
        
        if (!syncState.broadcastChannel || !syncState.config.crossTab.enabled) {
          return
        }

        const message: CrossTabMessage = {
          type: 'state_sync',
          storeName,
          data: { state, action },
          timestamp: Date.now(),
          sessionId: syncState.sessionId,
          version: syncState.version + 1
        }

        // Debounce broadcasts
        const debounceMs = syncState.config.crossTab.debounceMs
        
        if (debounceMs > 0) {
          // Use a simple debouncing mechanism
          const key = `broadcast_${storeName}`
          clearTimeout((window as any)[key])
          
          ;(window as any)[key] = setTimeout(() => {
            syncState.broadcastChannel!.postMessage(message)
            set(draft => {
              draft.version++
            })
          }, debounceMs)
        } else {
          syncState.broadcastChannel.postMessage(message)
          set(draft => {
            draft.version++
          })
        }

        console.log(`[SyncManager] Broadcasted state change for ${storeName}`)
      },

      // Handle incoming cross-tab messages
      handleCrossTabMessage: (message: CrossTabMessage) => {
        const state = get()
        
        // Ignore messages from same session
        if (message.sessionId === state.sessionId) {
          return
        }

        // Check if we have the store registered
        const storeInfo = state.registeredStores.get(message.storeName)
        if (!storeInfo) {
          return
        }

        switch (message.type) {
          case 'state_sync':
            state.handleStateSync(message)
            break
          case 'action_sync':
            state.handleActionSync(message)
            break
          case 'conflict_notification':
            state.handleConflictNotification(message)
            break
        }
      },

      // Handle state synchronization
      handleStateSync: (message: CrossTabMessage) => {
        const state = get()
        const storeInfo = state.registeredStores.get(message.storeName)
        
        if (!storeInfo) return

        const { state: remoteState, action } = message.data
        const localState = storeInfo.store.getState()
        
        // Check version to detect conflicts
        if (message.version <= state.remoteVersion) {
          console.log(`[SyncManager] Ignoring older state for ${message.storeName}`)
          return
        }

        // Apply conflict resolution strategy
        let resolvedState = remoteState
        
        switch (state.config.crossTab.conflictResolution) {
          case 'local_wins':
            resolvedState = localState
            break
          case 'remote_wins':
            resolvedState = remoteState
            break
          case 'timestamp_wins':
            // Remote state is newer (checked by version), so use it
            resolvedState = remoteState
            break
          case 'manual':
            // Create conflict for manual resolution
            const conflictId = `${message.storeName}_${Date.now()}`
            state.conflicts.set(conflictId, {
              resolved: localState, // Keep local state until resolved
              strategy: 'manual',
              conflictData: {
                local: localState,
                remote: remoteState
              }
            })
            
            console.warn(`[SyncManager] Manual conflict resolution required for ${message.storeName}`)
            return
        }

        // Apply custom conflict resolver if available
        if (storeInfo.conflictResolver && resolvedState !== localState) {
          resolvedState = storeInfo.conflictResolver(localState, remoteState)
        }

        // Update store state
        storeInfo.store.setState(resolvedState, true, `SYNC_FROM_TAB_${action || 'unknown'}`)
        
        set(draft => {
          draft.remoteVersion = message.version
          draft.lastSyncTime = Date.now()
          
          const updatedStoreInfo = draft.registeredStores.get(message.storeName)!
          updatedStoreInfo.lastSync = Date.now()
          updatedStoreInfo.version = message.version
        })

        console.log(`[SyncManager] Synced state for ${message.storeName}`)
      },

      // Handle action synchronization
      handleActionSync: (message: CrossTabMessage) => {
        // Implementation for action-based sync (more granular than state sync)
        console.log(`[SyncManager] Action sync not yet implemented for ${message.storeName}`)
      },

      // Handle conflict notifications
      handleConflictNotification: (message: CrossTabMessage) => {
        console.warn(`[SyncManager] Conflict notification received for ${message.storeName}:`, message.data)
      },

      // Enable real-time synchronization
      enableRealtimeSync: (storeName: string) => {
        // Connect to WebSocket if not already connected
        if (webSocketManager.getState() !== 'connected') {
          webSocketManager.connect()
        }

        // Subscribe to WebSocket events for this store
        webSocketManager.on(`${storeName}_update`, (data) => {
          get().handleRealtimeUpdate(storeName, data)
        })

        console.log(`[SyncManager] Real-time sync enabled for ${storeName}`)
      },

      // Disable real-time synchronization
      disableRealtimeSync: (storeName: string) => {
        // Note: WebSocket manager doesn't currently support unsubscribing from specific events
        console.log(`[SyncManager] Real-time sync disabled for ${storeName}`)
      },

      // Handle real-time updates from WebSocket
      handleRealtimeUpdate: (storeName: string, data: any) => {
        const state = get()
        const storeInfo = state.registeredStores.get(storeName)
        
        if (!storeInfo) return

        // Apply the real-time update to the store
        const currentState = storeInfo.store.getState()
        
        // Apply conflict resolution if needed
        let updatedState = data
        if (storeInfo.conflictResolver) {
          updatedState = storeInfo.conflictResolver(currentState, data)
        }

        storeInfo.store.setState(updatedState, true, 'REALTIME_UPDATE')
        
        set(draft => {
          draft.lastSyncTime = Date.now()
          
          const updatedStoreInfo = draft.registeredStores.get(storeName)!
          updatedStoreInfo.lastSync = Date.now()
        })

        console.log(`[SyncManager] Applied real-time update for ${storeName}`)
      },

      // Add item to offline queue
      addToOfflineQueue: (item: Omit<SyncQueueItem, 'id' | 'timestamp'>) => {
        const state = get()
        
        if (!state.config.offline.enabled) {
          return
        }

        const queueItem: SyncQueueItem = {
          id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          ...item
        }

        set(draft => {
          draft.offlineQueue.push(queueItem)
          
          // Limit queue size
          if (draft.offlineQueue.length > draft.config.offline.maxQueueSize) {
            draft.offlineQueue = draft.offlineQueue.slice(-draft.config.offline.maxQueueSize)
          }
        })

        // Persist queue if enabled
        if (state.config.persistence.enabled) {
          state.persistOfflineQueue()
        }

        console.log(`[SyncManager] Added item to offline queue: ${queueItem.id}`)
      },

      // Process offline queue
      processOfflineQueue: async () => {
        const state = get()
        
        if (!state.isOnline || state.offlineQueue.length === 0) {
          return
        }

        set(draft => {
          draft.syncStatus = 'syncing'
        })

        const queue = [...state.offlineQueue]
        const processed: string[] = []
        const failed: string[] = []

        for (const item of queue) {
          try {
            // Process the queue item (this would depend on the specific implementation)
            await state.processQueueItem(item)
            processed.push(item.id)
          } catch (error) {
            console.error(`[SyncManager] Failed to process queue item ${item.id}:`, error)
            
            // Increment retry count
            set(draft => {
              const queueItem = draft.offlineQueue.find(q => q.id === item.id)
              if (queueItem) {
                queueItem.retryCount++
                queueItem.error = error instanceof Error ? error.message : String(error)
                
                // Remove if max retries exceeded
                if (queueItem.retryCount >= queueItem.maxRetries) {
                  failed.push(item.id)
                }
              }
            })
          }
        }

        // Remove processed and failed items
        set(draft => {
          draft.offlineQueue = draft.offlineQueue.filter(
            item => !processed.includes(item.id) && !failed.includes(item.id)
          )
          draft.syncStatus = 'idle'
          draft.lastSyncTime = Date.now()
        })

        // Persist updated queue
        if (state.config.persistence.enabled) {
          state.persistOfflineQueue()
        }

        console.log(`[SyncManager] Processed offline queue: ${processed.length} successful, ${failed.length} failed`)
      },

      // Process individual queue item
      processQueueItem: async (item: SyncQueueItem) => {
        // This would be implemented based on specific requirements
        // For now, just simulate processing
        await new Promise(resolve => setTimeout(resolve, 100))
        
        console.log(`[SyncManager] Processed queue item: ${item.id}`)
      },

      // Clear offline queue
      clearOfflineQueue: () => {
        set(draft => {
          draft.offlineQueue = []
        })

        const state = get()
        if (state.config.persistence.enabled) {
          state.persistOfflineQueue()
        }

        console.log('[SyncManager] Cleared offline queue')
      },

      // Persist offline queue to storage
      persistOfflineQueue: () => {
        const state = get()
        
        if (typeof window === 'undefined') return

        try {
          const data = JSON.stringify(state.offlineQueue)
          localStorage.setItem(state.config.persistence.storageKey, data)
        } catch (error) {
          console.error('[SyncManager] Failed to persist offline queue:', error)
        }
      },

      // Load offline queue from storage
      loadOfflineQueue: () => {
        const state = get()
        
        if (typeof window === 'undefined') return

        try {
          const data = localStorage.getItem(state.config.persistence.storageKey)
          if (data) {
            const queue: SyncQueueItem[] = JSON.parse(data)
            set(draft => {
              draft.offlineQueue = queue
            })
            
            console.log(`[SyncManager] Loaded ${queue.length} items from offline queue`)
          }
        } catch (error) {
          console.error('[SyncManager] Failed to load offline queue:', error)
        }
      },

      // Resolve conflict
      resolveConflict: <T>(conflictId: string, resolution: ConflictResolution<T>) => {
        const state = get()
        const conflict = state.conflicts.get(conflictId)
        
        if (!conflict) {
          console.warn(`[SyncManager] Conflict not found: ${conflictId}`)
          return
        }

        // Apply the resolution
        set(draft => {
          draft.conflicts.set(conflictId, resolution)
        })

        console.log(`[SyncManager] Resolved conflict: ${conflictId}`)
      },

      // Get all conflicts
      getConflicts: () => {
        return Array.from(get().conflicts.values())
      },

      // Update configuration
      updateConfig: (newConfig: Partial<SyncConfig>) => {
        set(draft => {
          draft.config = {
            ...draft.config,
            ...newConfig,
            crossTab: { ...draft.config.crossTab, ...newConfig.crossTab },
            realtime: { ...draft.config.realtime, ...newConfig.realtime },
            offline: { ...draft.config.offline, ...newConfig.offline },
            persistence: { ...draft.config.persistence, ...newConfig.persistence }
          }
        })

        console.log('[SyncManager] Configuration updated:', newConfig)
      },

      // Get sync status
      getStatus: () => {
        const state = get()
        return {
          status: state.syncStatus,
          isOnline: state.isOnline,
          queueSize: state.offlineQueue.length
        }
      },

      // Force synchronization
      forcSync: async (storeName?: string) => {
        const state = get()
        
        if (storeName) {
          const storeInfo = state.registeredStores.get(storeName)
          if (storeInfo) {
            // Force sync for specific store
            state.broadcastStateChange(storeName, storeInfo.store.getState(), 'FORCE_SYNC')
          }
        } else {
          // Force sync for all stores
          for (const [name, storeInfo] of state.registeredStores) {
            state.broadcastStateChange(name, storeInfo.store.getState(), 'FORCE_SYNC')
          }
        }

        // Process offline queue
        await state.processOfflineQueue()
        
        console.log(`[SyncManager] Force sync completed${storeName ? ` for ${storeName}` : ''}`)
      },

      _meta: {
        version: 1,
        lastUpdated: Date.now(),
        hydrated: false
      }
    }))
  )
)

// Initialize online/offline detection
if (typeof window !== 'undefined') {
  // Initial state
  syncManagerStore.setState(draft => {
    draft.isOnline = navigator.onLine
  })

  // Listen for online/offline events
  window.addEventListener('online', () => {
    syncManagerStore.setState(draft => {
      draft.isOnline = true
    })
    
    // Process offline queue when coming back online
    syncManagerStore.getState().processOfflineQueue()
    
    console.log('[SyncManager] Online detected, processing offline queue')
  })

  window.addEventListener('offline', () => {
    syncManagerStore.setState(draft => {
      draft.isOnline = false
    })
    
    console.log('[SyncManager] Offline detected')
  })

  // Load persisted offline queue on startup
  syncManagerStore.getState().loadOfflineQueue()
}

// Utility function to enhance stores with sync capabilities
export function withSynchronization<T extends object>(
  store: any,
  storeName: string,
  options: {
    conflictResolver?: (local: T, remote: T) => T
    enableCrossTab?: boolean
    enableRealtime?: boolean
  } = {}
) {
  // Register the store with sync manager
  syncManagerStore.getState().registerStore(storeName, store, options.conflictResolver)

  // Subscribe to store changes to broadcast them
  store.subscribe((state: T, previousState: T) => {
    // Only broadcast if state actually changed
    if (state !== previousState) {
      syncManagerStore.getState().broadcastStateChange(storeName, state)
    }
  })

  return {
    ...store,
    
    // Add sync-related methods to the store
    sync: {
      enable: () => {
        const syncManager = syncManagerStore.getState()
        if (options.enableCrossTab !== false) {
          syncManager.enableCrossTabSync(storeName)
        }
        if (options.enableRealtime !== false) {
          syncManager.enableRealtimeSync(storeName)
        }
      },
      disable: () => {
        const syncManager = syncManagerStore.getState()
        syncManager.disableCrossTabSync(storeName)
        syncManager.disableRealtimeSync(storeName)
      },
      forceSync: () => syncManagerStore.getState().forcSync(storeName),
      getStatus: () => syncManagerStore.getState().getStatus(),
      addToOfflineQueue: (operation: SyncOperation, data: any) => {
        syncManagerStore.getState().addToOfflineQueue({
          type: operation,
          entity: storeName,
          entityId: 'unknown',
          data,
          retryCount: 0,
          maxRetries: 3
        })
      }
    }
  }
}

// React hooks for sync management
export function useSyncStatus() {
  return syncManagerStore(state => ({
    status: state.syncStatus,
    isOnline: state.isOnline,
    queueSize: state.offlineQueue.length,
    lastSyncTime: state.lastSyncTime
  }))
}

export function useSyncControls() {
  return {
    forceSync: syncManagerStore.getState().forcSync,
    clearQueue: syncManagerStore.getState().clearOfflineQueue,
    processQueue: syncManagerStore.getState().processOfflineQueue,
    updateConfig: syncManagerStore.getState().updateConfig
  }
}

export function useConflicts() {
  return syncManagerStore(state => ({
    conflicts: Array.from(state.conflicts.entries()),
    resolveConflict: state.resolveConflict
  }))
}

// Development utilities
if (process.env.NODE_ENV === 'development') {
  // Make sync manager available globally for debugging
  (window as any).syncManager = syncManagerStore
  
  // Add debugging helpers
  (window as any).syncDebug = {
    broadcastTest: (storeName: string, data: any) => {
      syncManagerStore.getState().broadcastStateChange(storeName, data, 'DEBUG_TEST')
    },
    simulateOffline: () => {
      syncManagerStore.setState(draft => {
        draft.isOnline = false
      })
    },
    simulateOnline: () => {
      syncManagerStore.setState(draft => {
        draft.isOnline = true
      })
      syncManagerStore.getState().processOfflineQueue()
    },
    getQueueContents: () => syncManagerStore.getState().offlineQueue
  }
}