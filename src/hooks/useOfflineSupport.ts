/**
 * Offline Support Hook
 * Manages offline detection, data synchronization, and queue management
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export interface OfflineQueueItem {
  id: string
  type: 'create' | 'update' | 'delete' | 'refresh'
  resource: string
  data: any
  timestamp: number
  retryCount: number
  maxRetries: number
  priority: 'low' | 'normal' | 'high' | 'urgent'
  requiresAuth: boolean
  optimistic?: boolean
}

export interface OfflineState {
  isOnline: boolean
  isOfflineMode: boolean
  lastOnline: Date | null
  lastOffline: Date | null
  reconnectAttempts: number
  syncInProgress: boolean
  queuedItems: number
  failedItems: number
}

export interface UseOfflineSupportOptions {
  enableQueue?: boolean
  maxQueueSize?: number
  syncOnReconnect?: boolean
  retryDelays?: number[] // Progressive retry delays in ms
  enableOptimisticUpdates?: boolean
  storageKey?: string
  onOnline?: () => void
  onOffline?: () => void
  onSyncStart?: () => void
  onSyncComplete?: (success: number, failed: number) => void
  onQueueFull?: () => void
}

export interface UseOfflineSupportReturn {
  state: OfflineState
  queue: {
    add: (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) => void
    remove: (id: string) => void
    clear: () => void
    retry: (id?: string) => Promise<void>
    getItems: () => OfflineQueueItem[]
    getFailedItems: () => OfflineQueueItem[]
  }
  sync: {
    start: () => Promise<void>
    stop: () => void
    isInProgress: boolean
  }
  network: {
    forceOffline: () => void
    forceOnline: () => void
    resetMode: () => void
  }
}

const defaultOptions: Required<UseOfflineSupportOptions> = {
  enableQueue: true,
  maxQueueSize: 100,
  syncOnReconnect: true,
  retryDelays: [1000, 2000, 5000, 10000, 30000], // 1s, 2s, 5s, 10s, 30s
  enableOptimisticUpdates: true,
  storageKey: 'appboardguru_offline_queue',
  onOnline: () => {},
  onOffline: () => {},
  onSyncStart: () => {},
  onSyncComplete: () => {},
  onQueueFull: () => {}
}

export function useOfflineSupport(options: UseOfflineSupportOptions = {}): UseOfflineSupportReturn {
  const config = { ...defaultOptions, ...options }
  const queryClient = useQueryClient()

  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOfflineMode: false,
    lastOnline: null,
    lastOffline: null,
    reconnectAttempts: 0,
    syncInProgress: false,
    queuedItems: 0,
    failedItems: 0
  })

  const queueRef = useRef<OfflineQueueItem[]>([])
  const syncTimeoutRef = useRef<NodeJS.Timeout>()
  const isManualModeRef = useRef(false)
  const syncInProgressRef = useRef(false)

  // Load queue from storage on initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(config.storageKey)
        if (stored) {
          const items = JSON.parse(stored) as OfflineQueueItem[]
          queueRef.current = items.filter(item => 
            Date.now() - item.timestamp < 7 * 24 * 60 * 60 * 1000 // Keep for 7 days
          )
          
          setState(prev => ({
            ...prev,
            queuedItems: queueRef.current.length,
            failedItems: queueRef.current.filter(item => item.retryCount >= item.maxRetries).length
          }))
        }
      } catch (error) {
        console.error('Failed to load offline queue:', error)
      }
    }
  }, [config.storageKey])

  // Save queue to storage
  const saveQueue = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(config.storageKey, JSON.stringify(queueRef.current))
      } catch (error) {
        console.error('Failed to save offline queue:', error)
      }
    }
  }, [config.storageKey])

  // Update state counters
  const updateCounters = useCallback(() => {
    setState(prev => ({
      ...prev,
      queuedItems: queueRef.current.length,
      failedItems: queueRef.current.filter(item => item.retryCount >= item.maxRetries).length
    }))
  }, [])

  // Add item to queue
  const addToQueue = useCallback((item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) => {
    if (!config.enableQueue) return

    // Check queue size limit
    if (queueRef.current.length >= config.maxQueueSize) {
      config.onQueueFull()
      return
    }

    const queueItem: OfflineQueueItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    }

    // Insert based on priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
    const insertIndex = queueRef.current.findIndex(
      existing => priorityOrder[queueItem.priority] < priorityOrder[existing.priority]
    )

    if (insertIndex === -1) {
      queueRef.current.push(queueItem)
    } else {
      queueRef.current.splice(insertIndex, 0, queueItem)
    }

    // Apply optimistic update if enabled
    if (config.enableOptimisticUpdates && item.optimistic) {
      applyOptimisticUpdate(queueItem)
    }

    saveQueue()
    updateCounters()

    console.log(`Added item to offline queue: ${queueItem.type} ${queueItem.resource}`)
  }, [config.enableQueue, config.maxQueueSize, config.enableOptimisticUpdates, config.onQueueFull, saveQueue, updateCounters])

  // Remove item from queue
  const removeFromQueue = useCallback((id: string) => {
    const index = queueRef.current.findIndex(item => item.id === id)
    if (index !== -1) {
      queueRef.current.splice(index, 1)
      saveQueue()
      updateCounters()
    }
  }, [saveQueue, updateCounters])

  // Clear entire queue
  const clearQueue = useCallback(() => {
    queueRef.current = []
    saveQueue()
    updateCounters()
  }, [saveQueue, updateCounters])

  // Apply optimistic update to React Query cache
  const applyOptimisticUpdate = useCallback((item: OfflineQueueItem) => {
    try {
      switch (item.type) {
        case 'create':
          queryClient.setQueryData([item.resource], (old: any[] | undefined) => {
            if (!old) return [item.data]
            return [{ ...item.data, _optimistic: true }, ...old]
          })
          break

        case 'update':
          queryClient.setQueryData([item.resource], (old: any[] | undefined) => {
            if (!old) return old
            return old.map(existing => 
              existing.id === item.data.id 
                ? { ...existing, ...item.data, _optimistic: true }
                : existing
            )
          })
          break

        case 'delete':
          queryClient.setQueryData([item.resource], (old: any[] | undefined) => {
            if (!old) return old
            return old.filter(existing => existing.id !== item.data.id)
          })
          break
      }
    } catch (error) {
      console.error('Failed to apply optimistic update:', error)
    }
  }, [queryClient])

  // Process single queue item
  const processQueueItem = useCallback(async (item: OfflineQueueItem): Promise<boolean> => {
    try {
      // Simulate API call based on item type
      await new Promise(resolve => setTimeout(resolve, 100)) // Placeholder for actual API call

      switch (item.type) {
        case 'refresh':
          // Invalidate queries to trigger fresh data fetch
          queryClient.invalidateQueries({ queryKey: [item.resource] })
          break

        case 'create':
          // Would make actual API call to create resource
          console.log(`Creating ${item.resource}:`, item.data)
          break

        case 'update':
          // Would make actual API call to update resource
          console.log(`Updating ${item.resource}:`, item.data)
          break

        case 'delete':
          // Would make actual API call to delete resource
          console.log(`Deleting ${item.resource}:`, item.data)
          break
      }

      return true
    } catch (error) {
      console.error(`Failed to process queue item ${item.id}:`, error)
      return false
    }
  }, [queryClient])

  // Process queue with retry logic
  const processQueue = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (syncInProgressRef.current || !state.isOnline) {
      return { success: 0, failed: 0 }
    }

    syncInProgressRef.current = true
    setState(prev => ({ ...prev, syncInProgress: true }))

    let successCount = 0
    let failedCount = 0
    const itemsToProcess = [...queueRef.current]

    for (const item of itemsToProcess) {
      // Skip items that have exceeded max retries
      if (item.retryCount >= item.maxRetries) {
        failedCount++
        continue
      }

      const success = await processQueueItem(item)

      if (success) {
        successCount++
        removeFromQueue(item.id)
      } else {
        // Increment retry count and schedule retry
        const itemIndex = queueRef.current.findIndex(q => q.id === item.id)
        if (itemIndex !== -1) {
          queueRef.current[itemIndex].retryCount++
          
          if (queueRef.current[itemIndex].retryCount >= item.maxRetries) {
            failedCount++
          } else {
            // Schedule retry with exponential backoff
            const delay = config.retryDelays[Math.min(item.retryCount, config.retryDelays.length - 1)]
            setTimeout(() => {
              if (state.isOnline) {
                processQueueItem(item).then(retrySuccess => {
                  if (retrySuccess) {
                    removeFromQueue(item.id)
                  }
                })
              }
            }, delay)
          }
        }
      }

      // Small delay between items to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    saveQueue()
    updateCounters()

    syncInProgressRef.current = false
    setState(prev => ({ ...prev, syncInProgress: false }))

    return { success: successCount, failed: failedCount }
  }, [state.isOnline, config.retryDelays, processQueueItem, removeFromQueue, saveQueue, updateCounters])

  // Start sync process
  const startSync = useCallback(async (): Promise<void> => {
    if (!state.isOnline || syncInProgressRef.current) return

    config.onSyncStart()

    const result = await processQueue()
    
    config.onSyncComplete(result.success, result.failed)

    console.log(`Sync completed: ${result.success} success, ${result.failed} failed`)
  }, [state.isOnline, config.onSyncStart, config.onSyncComplete, processQueue])

  // Stop sync process
  const stopSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = undefined
    }

    syncInProgressRef.current = false
    setState(prev => ({ ...prev, syncInProgress: false }))
  }, [])

  // Retry specific item or all failed items
  const retryQueue = useCallback(async (id?: string): Promise<void> => {
    if (!state.isOnline) return

    if (id) {
      const item = queueRef.current.find(item => item.id === id)
      if (item) {
        const success = await processQueueItem(item)
        if (success) {
          removeFromQueue(id)
        }
      }
    } else {
      // Retry all failed items
      const failedItems = queueRef.current.filter(item => item.retryCount >= item.maxRetries)
      for (const item of failedItems) {
        item.retryCount = 0 // Reset retry count
        const success = await processQueueItem(item)
        if (success) {
          removeFromQueue(item.id)
        }
      }
    }

    saveQueue()
    updateCounters()
  }, [state.isOnline, processQueueItem, removeFromQueue, saveQueue, updateCounters])

  // Manual network mode controls
  const forceOffline = useCallback(() => {
    isManualModeRef.current = true
    setState(prev => ({
      ...prev,
      isOfflineMode: true,
      isOnline: false,
      lastOffline: new Date()
    }))
    config.onOffline()
  }, [config.onOffline])

  const forceOnline = useCallback(() => {
    isManualModeRef.current = true
    setState(prev => ({
      ...prev,
      isOfflineMode: false,
      isOnline: true,
      lastOnline: new Date(),
      reconnectAttempts: 0
    }))
    config.onOnline()

    // Start sync if enabled
    if (config.syncOnReconnect) {
      setTimeout(startSync, 1000)
    }
  }, [config.onOnline, config.syncOnReconnect, startSync])

  const resetMode = useCallback(() => {
    isManualModeRef.current = false
    setState(prev => ({
      ...prev,
      isOfflineMode: false,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
    }))
  }, [])

  // Handle browser online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      if (isManualModeRef.current) return

      setState(prev => ({
        ...prev,
        isOnline: true,
        lastOnline: new Date(),
        reconnectAttempts: 0
      }))

      config.onOnline()

      // Start sync after a short delay to allow network to stabilize
      if (config.syncOnReconnect) {
        syncTimeoutRef.current = setTimeout(startSync, 2000)
      }
    }

    const handleOffline = () => {
      if (isManualModeRef.current) return

      setState(prev => ({
        ...prev,
        isOnline: false,
        lastOffline: new Date(),
        reconnectAttempts: prev.reconnectAttempts + 1
      }))

      config.onOffline()
      stopSync()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [config.onOnline, config.onOffline, config.syncOnReconnect, startSync, stopSync])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSync()
    }
  }, [stopSync])

  return {
    state,
    queue: {
      add: addToQueue,
      remove: removeFromQueue,
      clear: clearQueue,
      retry: retryQueue,
      getItems: () => [...queueRef.current],
      getFailedItems: () => queueRef.current.filter(item => item.retryCount >= item.maxRetries)
    },
    sync: {
      start: startSync,
      stop: stopSync,
      isInProgress: syncInProgressRef.current
    },
    network: {
      forceOffline,
      forceOnline,
      resetMode
    }
  }
}