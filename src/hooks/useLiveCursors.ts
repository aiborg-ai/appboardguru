/**
 * Live Cursors Hook
 * React hook for real-time cursor tracking and management
 * Following CLAUDE.md patterns with Result handling
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '../lib/stores'
import { CursorTrackingService, type UserCursor, type CursorPosition, type SelectionRange, type CursorUpdateEvent } from '../lib/services/cursor-tracking.service'
import type { AssetId, UserId } from '../types/database'
import type { Result } from '../lib/types/result'

export interface UseLiveCursorsOptions {
  assetId: AssetId
  enabled?: boolean
  updateThrottleMs?: number
  excludeOwnCursor?: boolean
  maxCursors?: number
  trackHistory?: boolean
}

export interface UseLiveCursorsReturn {
  // Cursor data
  cursors: UserCursor[]
  ownCursor: UserCursor | null
  isConnected: boolean
  isTracking: boolean
  
  // Cursor actions
  updateCursor: (
    position: CursorPosition,
    selection?: SelectionRange,
    metadata?: UserCursor['metadata']
  ) => Promise<Result<UserCursor>>
  
  // Selection actions
  updateSelection: (selection: SelectionRange) => Promise<Result<UserCursor>>
  clearSelection: () => Promise<Result<UserCursor>>
  
  // Connection management
  startTracking: () => Promise<Result<void>>
  stopTracking: () => Promise<Result<void>>
  
  // Utilities
  getCursorHistory: (userId?: UserId) => Result<CursorPosition[]>
  getCursorById: (userId: UserId) => UserCursor | null
  getCursorStats: () => {
    total: number
    active: number
    typing: number
    idle: number
  }
  
  // Error handling
  error: string | null
  clearError: () => void
}

export function useLiveCursors({
  assetId,
  enabled = true,
  updateThrottleMs = 100,
  excludeOwnCursor = true,
  maxCursors = 50,
  trackHistory = false
}: UseLiveCursorsOptions): UseLiveCursorsReturn {
  const user = useUser()

  // State
  const [cursors, setCursors] = useState<UserCursor[]>([])
  const [ownCursor, setOwnCursor] = useState<UserCursor | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const serviceRef = useRef<CursorTrackingService | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const updateTimeoutRef = useRef<NodeJS.Timeout>()
  const lastUpdateRef = useRef<number>(0)
  const pendingUpdateRef = useRef<{
    position: CursorPosition
    selection?: SelectionRange
    metadata?: UserCursor['metadata']
  } | null>(null)

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Initialize cursor tracking service
  const initializeService = useCallback(async (): Promise<Result<void>> => {
    try {
      if (!user || serviceRef.current) {
        return Result.success(undefined)
      }

      // Create cursor tracking service
      serviceRef.current = new CursorTrackingService({})

      // Subscribe to cursor updates
      const subscribeResult = serviceRef.current.subscribeToCursors(
        assetId,
        handleCursorUpdate
      )

      if (subscribeResult.success) {
        unsubscribeRef.current = subscribeResult.data
      }

      setIsConnected(true)
      clearError()

      return Result.success(undefined)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize cursor tracking'
      setError(errorMessage)
      return Result.failure('CURSOR_INIT_ERROR', errorMessage)
    }
  }, [user, assetId])

  // Handle cursor updates from service
  const handleCursorUpdate = useCallback((event: CursorUpdateEvent) => {
    try {
      const { cursor } = event

      if (cursor.userId === user?.id) {
        // Update own cursor
        setOwnCursor(cursor)
      } else {
        // Update other users' cursors
        setCursors(prevCursors => {
          const filtered = prevCursors.filter(c => c.userId !== cursor.userId)
          const newCursors = [...filtered, cursor]
          
          // Apply max cursors limit
          if (newCursors.length > maxCursors) {
            newCursors.sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime())
            return newCursors.slice(0, maxCursors)
          }
          
          return newCursors
        })
      }

    } catch (error) {
      console.error('Error handling cursor update:', error)
    }
  }, [user?.id, maxCursors])

  // Load cursors from service
  const loadCursors = useCallback(async () => {
    if (!serviceRef.current) return

    try {
      const result = await serviceRef.current.getDocumentCursors(
        assetId,
        excludeOwnCursor ? (user?.id as UserId) : undefined
      )

      if (result.success) {
        setCursors(result.data)
      }

    } catch (error) {
      console.error('Error loading cursors:', error)
    }
  }, [assetId, user?.id, excludeOwnCursor])

  // Throttled cursor update
  const throttledUpdate = useCallback((
    position: CursorPosition,
    selection?: SelectionRange,
    metadata?: UserCursor['metadata']
  ) => {
    const now = Date.now()
    
    // Store pending update
    pendingUpdateRef.current = { position, selection, metadata }

    // Check if we should throttle
    if (now - lastUpdateRef.current < updateThrottleMs) {
      // Clear existing timeout and set new one
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      updateTimeoutRef.current = setTimeout(() => {
        const pending = pendingUpdateRef.current
        if (pending && serviceRef.current && user) {
          serviceRef.current.updateCursor(
            user.id as UserId,
            assetId,
            pending.position,
            pending.selection,
            pending.metadata
          ).catch(error => {
            console.error('Error in throttled cursor update:', error)
          })
          
          lastUpdateRef.current = Date.now()
          pendingUpdateRef.current = null
        }
      }, updateThrottleMs)

      return
    }

    // Update immediately
    if (serviceRef.current && user) {
      serviceRef.current.updateCursor(
        user.id as UserId,
        assetId,
        position,
        selection,
        metadata
      ).catch(error => {
        console.error('Error in immediate cursor update:', error)
      })
      
      lastUpdateRef.current = now
    }
  }, [assetId, user, updateThrottleMs])

  // Update cursor position
  const updateCursor = useCallback(async (
    position: CursorPosition,
    selection?: SelectionRange,
    metadata?: UserCursor['metadata']
  ): Promise<Result<UserCursor>> => {
    if (!serviceRef.current || !user) {
      return Result.failure('SERVICE_NOT_READY', 'Cursor tracking service not initialized')
    }

    try {
      clearError()

      // Use throttled update for better performance
      throttledUpdate(position, selection, metadata)

      // Return current cursor state (optimistic update)
      const currentCursor: UserCursor = {
        userId: user.id as UserId,
        assetId,
        position,
        selection,
        color: generateUserColor(user.id),
        userName: user.name || user.email || 'Unknown User',
        userAvatar: user.avatar_url,
        isActive: true,
        lastUpdate: new Date(),
        metadata
      }

      setOwnCursor(currentCursor)
      return Result.success(currentCursor)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update cursor'
      setError(errorMessage)
      return Result.failure('CURSOR_UPDATE_ERROR', errorMessage)
    }
  }, [user, assetId, throttledUpdate])

  // Update selection
  const updateSelection = useCallback(async (selection: SelectionRange): Promise<Result<UserCursor>> => {
    if (!ownCursor) {
      return Result.failure('NO_CURSOR', 'No active cursor found')
    }

    return await updateCursor(ownCursor.position, selection, ownCursor.metadata)
  }, [ownCursor, updateCursor])

  // Clear selection
  const clearSelection = useCallback(async (): Promise<Result<UserCursor>> => {
    if (!ownCursor) {
      return Result.failure('NO_CURSOR', 'No active cursor found')
    }

    return await updateCursor(ownCursor.position, undefined, ownCursor.metadata)
  }, [ownCursor, updateCursor])

  // Start cursor tracking
  const startTracking = useCallback(async (): Promise<Result<void>> => {
    try {
      if (!enabled || isTracking) {
        return Result.success(undefined)
      }

      const initResult = await initializeService()
      if (!initResult.success) {
        return initResult
      }

      await loadCursors()
      setIsTracking(true)

      return Result.success(undefined)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start cursor tracking'
      setError(errorMessage)
      return Result.failure('START_TRACKING_ERROR', errorMessage)
    }
  }, [enabled, isTracking, initializeService, loadCursors])

  // Stop cursor tracking
  const stopTracking = useCallback(async (): Promise<Result<void>> => {
    try {
      if (!isTracking) {
        return Result.success(undefined)
      }

      // Remove own cursor
      if (serviceRef.current && user) {
        await serviceRef.current.removeCursor(user.id as UserId, assetId)
      }

      // Cleanup
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      setIsTracking(false)
      setIsConnected(false)
      setCursors([])
      setOwnCursor(null)

      return Result.success(undefined)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop cursor tracking'
      setError(errorMessage)
      return Result.failure('STOP_TRACKING_ERROR', errorMessage)
    }
  }, [isTracking, user, assetId])

  // Get cursor history
  const getCursorHistory = useCallback((userId?: UserId): Result<CursorPosition[]> => {
    if (!serviceRef.current) {
      return Result.failure('SERVICE_NOT_READY', 'Cursor tracking service not initialized')
    }

    const targetUserId = userId || (user?.id as UserId)
    return serviceRef.current.getCursorHistory(targetUserId, assetId)
  }, [user?.id, assetId])

  // Get cursor by user ID
  const getCursorById = useCallback((userId: UserId): UserCursor | null => {
    if (userId === user?.id) {
      return ownCursor
    }
    
    return cursors.find(cursor => cursor.userId === userId) || null
  }, [cursors, ownCursor, user?.id])

  // Get cursor statistics
  const getCursorStats = useCallback(() => {
    const allCursors = ownCursor ? [ownCursor, ...cursors] : cursors
    
    return {
      total: allCursors.length,
      active: allCursors.filter(c => c.isActive).length,
      typing: allCursors.filter(c => c.metadata?.isTyping).length,
      idle: allCursors.filter(c => c.metadata?.isIdle).length
    }
  }, [cursors, ownCursor])

  // Generate user color
  const generateUserColor = useCallback((userId: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]
    
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }, [])

  // Initialize on mount
  useEffect(() => {
    if (enabled && user) {
      startTracking()
    }

    return () => {
      stopTracking()
    }
  }, [enabled, user])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  return {
    // Cursor data
    cursors: excludeOwnCursor ? cursors : (ownCursor ? [ownCursor, ...cursors] : cursors),
    ownCursor,
    isConnected,
    isTracking,
    
    // Cursor actions
    updateCursor,
    updateSelection,
    clearSelection,
    
    // Connection management
    startTracking,
    stopTracking,
    
    // Utilities
    getCursorHistory,
    getCursorById,
    getCursorStats,
    
    // Error handling
    error,
    clearError
  }
}