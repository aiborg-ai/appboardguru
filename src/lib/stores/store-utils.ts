import { OptimisticAction, SyncQueueItem, OfflineState } from './types'
import { authStore } from './auth-store'
import { organizationStore } from './organization-store'
import { assetStore } from './asset-store'
import { vaultStore } from './vault-store'
import { notificationStore } from './notification-store'
import { uiStore } from './ui-store'
import { v4 as uuidv4 } from 'uuid'

// Store registry for easy access
export const stores = {
  auth: authStore,
  organization: organizationStore,
  asset: assetStore,
  vault: vaultStore,
  notification: notificationStore,
  ui: uiStore
} as const

export type StoreNames = keyof typeof stores

// Optimistic updates manager
class OptimisticUpdatesManager {
  private actions: Map<string, OptimisticAction> = new Map()
  private timeouts: Map<string, NodeJS.Timeout> = new Map()

  // Add an optimistic action
  add<T>(
    actionId: string,
    type: string,
    entity: string,
    optimisticData: T,
    rollbackData?: T,
    timeoutMs = 10000
  ): void {
    const action: OptimisticAction<T> = {
      id: actionId,
      type,
      entity,
      optimisticData,
      rollbackData,
      timestamp: Date.now()
    }

    this.actions.set(actionId, action)

    // Auto-rollback after timeout
    const timeout = setTimeout(() => {
      this.rollback(actionId)
    }, timeoutMs)

    this.timeouts.set(actionId, timeout)
  }

  // Confirm an optimistic action
  confirm(actionId: string): void {
    const timeout = this.timeouts.get(actionId)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(actionId)
    }
    this.actions.delete(actionId)
  }

  // Rollback an optimistic action
  rollback(actionId: string): void {
    const action = this.actions.get(actionId)
    if (!action) return

    const timeout = this.timeouts.get(actionId)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(actionId)
    }

    // Apply rollback data if available
    if (action.rollbackData) {
      // This would need to be implemented based on the specific store
      console.warn(`Rolling back optimistic action: ${actionId}`)
    }

    this.actions.delete(actionId)
  }

  // Get all pending actions
  getPending(): OptimisticAction[] {
    return Array.from(this.actions.values())
  }

  // Clear all actions
  clear(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts.clear()
    this.actions.clear()
  }
}

// Global optimistic updates manager
export const optimisticUpdates = new OptimisticUpdatesManager()

// Offline sync manager
class OfflineSyncManager {
  private syncQueue: SyncQueueItem[] = []
  private isOnline = true
  private lastSync = 0
  private syncInProgress = false
  private maxRetries = 3

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      this.setupOnlineListeners()
      this.loadPersistedQueue()
    }
  }

  private setupOnlineListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.sync()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  private loadPersistedQueue(): void {
    try {
      const saved = localStorage.getItem('appboardguru-sync-queue')
      if (saved) {
        this.syncQueue = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error)
    }
  }

  private persistQueue(): void {
    try {
      localStorage.setItem('appboardguru-sync-queue', JSON.stringify(this.syncQueue))
    } catch (error) {
      console.error('Failed to persist sync queue:', error)
    }
  }

  // Add item to sync queue
  enqueue(
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    entity: string,
    entityId: string,
    data: any
  ): void {
    const item: SyncQueueItem = {
      id: uuidv4(),
      type,
      entity,
      entityId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.maxRetries
    }

    this.syncQueue.push(item)
    this.persistQueue()

    // Try to sync immediately if online
    if (this.isOnline) {
      this.sync()
    }
  }

  // Process sync queue
  async sync(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || this.syncQueue.length === 0) {
      return
    }

    this.syncInProgress = true

    const itemsToSync = [...this.syncQueue]
    const successfulIds: string[] = []

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item)
        successfulIds.push(item.id)
      } catch (error) {
        item.retryCount++
        item.error = error instanceof Error ? error.message : 'Sync failed'

        if (item.retryCount >= item.maxRetries) {
          // Remove failed items after max retries
          successfulIds.push(item.id)
          console.error(`Sync failed permanently for item ${item.id}:`, error)
        }
      }
    }

    // Remove successfully synced items
    this.syncQueue = this.syncQueue.filter(item => !successfulIds.includes(item.id))
    this.persistQueue()

    this.lastSync = Date.now()
    this.syncInProgress = false
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const { type, entity, entityId, data } = item

    switch (entity) {
      case 'organization':
        return this.syncOrganization(type, entityId, data)
      case 'asset':
        return this.syncAsset(type, entityId, data)
      case 'vault':
        return this.syncVault(type, entityId, data)
      case 'notification':
        return this.syncNotification(type, entityId, data)
      default:
        throw new Error(`Unknown entity type: ${entity}`)
    }
  }

  private async syncOrganization(type: string, entityId: string, data: any): Promise<void> {
    const orgStore = organizationStore.getState()
    
    switch (type) {
      case 'CREATE':
        await orgStore.createOrganization(data)
        break
      case 'UPDATE':
        await orgStore.updateOrganization(entityId, data)
        break
      case 'DELETE':
        await orgStore.deleteOrganization(entityId)
        break
    }
  }

  private async syncAsset(type: string, entityId: string, data: any): Promise<void> {
    const assetStoreState = assetStore.getState()
    
    switch (type) {
      case 'CREATE':
        await assetStoreState.createAsset(data)
        break
      case 'UPDATE':
        await assetStoreState.updateAsset(entityId, data)
        break
      case 'DELETE':
        await assetStoreState.deleteAsset(entityId)
        break
    }
  }

  private async syncVault(type: string, entityId: string, data: any): Promise<void> {
    const vaultStoreState = vaultStore.getState()
    
    switch (type) {
      case 'CREATE':
        await vaultStoreState.createVault(data)
        break
      case 'UPDATE':
        await vaultStoreState.updateVault(entityId, data)
        break
      case 'DELETE':
        await vaultStoreState.deleteVault(entityId)
        break
    }
  }

  private async syncNotification(type: string, entityId: string, data: any): Promise<void> {
    const notificationStoreState = notificationStore.getState()
    
    switch (type) {
      case 'UPDATE':
        if (data.status === 'read') {
          await notificationStoreState.markAsRead(entityId)
        } else if (data.status === 'unread') {
          await notificationStoreState.markAsUnread(entityId)
        } else if (data.status === 'archived') {
          await notificationStoreState.archiveNotification(entityId)
        }
        break
      case 'DELETE':
        await notificationStoreState.deleteNotification(entityId)
        break
    }
  }

  // Get current state
  getState(): OfflineState {
    return {
      isOnline: this.isOnline,
      syncQueue: this.syncQueue,
      lastSync: this.lastSync,
      isSyncing: this.syncInProgress,
      syncErrors: this.syncQueue
        .filter(item => item.error)
        .map(item => item.error!)
    }
  }

  // Clear the queue
  clearQueue(): void {
    this.syncQueue = []
    this.persistQueue()
  }

  // Force sync
  forcSync(): Promise<void> {
    return this.sync()
  }
}

// Global offline sync manager
export const offlineSync = new OfflineSyncManager()

// Cache invalidation utilities
export class CacheManager {
  private static instance: CacheManager
  private invalidationRules: Map<string, string[]> = new Map()

  private constructor() {
    this.setupInvalidationRules()
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  private setupInvalidationRules(): void {
    // Define what should be invalidated when something changes
    this.invalidationRules.set('organization:created', ['organizations', 'user:organizations'])
    this.invalidationRules.set('organization:updated', ['organization', 'organizations'])
    this.invalidationRules.set('organization:deleted', ['organizations', 'user:organizations'])
    
    this.invalidationRules.set('asset:created', ['assets', 'vault:assets', 'organization:assets'])
    this.invalidationRules.set('asset:updated', ['asset', 'assets'])
    this.invalidationRules.set('asset:deleted', ['assets', 'vault:assets'])
    
    this.invalidationRules.set('vault:created', ['vaults', 'organization:vaults'])
    this.invalidationRules.set('vault:updated', ['vault', 'vaults'])
    this.invalidationRules.set('vault:deleted', ['vaults', 'organization:vaults'])
    
    this.invalidationRules.set('notification:created', ['notifications', 'notification:counts'])
    this.invalidationRules.set('notification:updated', ['notification', 'notifications', 'notification:counts'])
    this.invalidationRules.set('notification:deleted', ['notifications', 'notification:counts'])
  }

  // Invalidate caches based on action
  invalidate(action: string, entityId?: string): void {
    const keysToInvalidate = this.invalidationRules.get(action) || []
    
    keysToInvalidate.forEach(key => {
      // This would integrate with React Query or other caching solutions
      console.log(`Invalidating cache: ${key}${entityId ? `:${entityId}` : ''}`)
    })
  }

  // Add custom invalidation rule
  addRule(action: string, keysToInvalidate: string[]): void {
    this.invalidationRules.set(action, keysToInvalidate)
  }
}

// Global cache manager
export const cacheManager = CacheManager.getInstance()

// Store action logger for debugging
export class StoreLogger {
  private static instance: StoreLogger
  private logs: Array<{
    timestamp: number
    store: string
    action: string
    payload?: any
    duration?: number
  }> = []

  private constructor() {}

  static getInstance(): StoreLogger {
    if (!StoreLogger.instance) {
      StoreLogger.instance = new StoreLogger()
    }
    return StoreLogger.instance
  }

  log(store: string, action: string, payload?: any, duration?: number): void {
    if (process.env['NODE_ENV'] === 'development') {
      this.logs.push({
        timestamp: Date.now(),
        store,
        action,
        payload,
        duration
      })

      // Keep only last 100 logs
      if (this.logs.length > 100) {
        this.logs = this.logs.slice(-100)
      }

      console.log(`[${store}] ${action}`, payload ? { payload, duration } : { duration })
    }
  }

  getLogs(): typeof this.logs {
    return [...this.logs]
  }

  clear(): void {
    this.logs = []
  }
}

// Global store logger
export const storeLogger = StoreLogger.getInstance()

// Store reset utility
export const resetAllStores = () => {
  Object.values(stores).forEach(store => {
    if ('reset' in store.getState()) {
      ;(store.getState() as any).reset()
    }
  })

  // Clear optimistic updates
  optimisticUpdates.clear()

  // Clear sync queue
  offlineSync.clearQueue()

  // Clear logs
  storeLogger.clear()

  console.log('All stores have been reset')
}

// Store hydration utility
export const waitForStoreHydration = async (storeNames?: StoreNames[]): Promise<void> => {
  const storesToWait = storeNames || Object.keys(stores) as StoreNames[]
  
  const promises = storesToWait.map(storeName => {
    const store = stores[storeName]
    return new Promise<void>((resolve) => {
      const unsubscribe = store.subscribe(
        (state: any) => state._meta?.hydrated,
        (hydrated: boolean) => {
          if (hydrated) {
            unsubscribe()
            resolve()
          }
        },
        { fireImmediately: true }
      )

      // Fallback timeout
      setTimeout(() => {
        unsubscribe()
        resolve()
      }, 2000)
    })
  })

  await Promise.all(promises)
}

// Store performance monitor
export const monitorStorePerformance = () => {
  if (process.env['NODE_ENV'] !== 'development') return

  Object.entries(stores).forEach(([name, store]) => {
    const originalSubscribe = store.subscribe

    store.subscribe = (...args: any[]) => {
      const start = performance.now()
      const result = originalSubscribe.call(store, ...args)
      const duration = performance.now() - start

      storeLogger.log(name, 'subscribe', undefined, duration)

      return result
    }
  })
}

// Type-safe store selector hook
export function useStoreSelector<T, U>(
  storeName: StoreNames,
  selector: (state: T) => U
): U {
  const store = stores[storeName]
  return (store as any)(selector)
}

// Batch store updates for better performance
export const batchStoreUpdates = (updates: Array<() => void>) => {
  const start = performance.now()
  
  // Execute all updates
  updates.forEach(update => update())
  
  if (process.env['NODE_ENV'] === 'development') {
    const duration = performance.now() - start
    console.log(`Batched ${updates.length} store updates in ${duration}ms`)
  }
}

// Global error handler for store operations
export const handleStoreError = (error: Error, context: { store: string; action: string }) => {
  console.error(`Store error in ${context.store}:${context.action}:`, error)
  
  // Show user-friendly error message
  uiStore.getState().showToast({
    type: 'error',
    title: 'Something went wrong',
    message: error.message || 'An unexpected error occurred',
    duration: 5000
  })

  // Log error for monitoring (in production, this would go to error tracking service)
  storeLogger.log(context.store, `error:${context.action}`, { message: error.message, stack: error.stack })
}

// Store initialization utility
export const initializeStores = async () => {
  try {
    // Initialize auth store first
    await authStore.getState().initialize()
    
    // Wait for stores to hydrate
    await waitForStoreHydration()
    
    // Set up performance monitoring in development
    if (process.env['NODE_ENV'] === 'development') {
      monitorStorePerformance()
    }
    
    console.log('All stores initialized successfully')
  } catch (error) {
    console.error('Failed to initialize stores:', error)
  }
}