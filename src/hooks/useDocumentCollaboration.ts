/**
 * Document Collaboration Hook
 * Real-time collaborative editing functionality
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '../lib/stores'
import { useWebSocket } from './useWebSocket'
import type {
  UseDocumentCollaborationReturn,
  DocumentCursor,
  DocumentChange,
  UserPresence,
  RoomId
} from '../types/websocket'
import type { AssetId, UserId } from '../types/database'
import { createRoomId } from '../types/websocket'
import { nanoid } from 'nanoid'

interface UseDocumentCollaborationOptions {
  assetId: AssetId
  enabled?: boolean
  conflictResolution?: 'manual' | 'automatic' | 'last-writer-wins'
  debounceMs?: number
}

export function useDocumentCollaboration({
  assetId,
  enabled = true,
  conflictResolution = 'last-writer-wins',
  debounceMs = 500
}: UseDocumentCollaborationOptions): UseDocumentCollaborationReturn {
  const user = useUser()
  const roomId = createRoomId(`document_${assetId}`)
  
  // WebSocket connection
  const {
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage,
    onMessage,
    onPresenceChange
  } = useWebSocket()

  // State
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([])
  const [cursors, setCursors] = useState<DocumentCursor[]>([])
  const [pendingChanges, setPendingChanges] = useState<DocumentChange[]>([])

  // Refs
  const currentCursor = useRef<{ line: number; column: number }>({ line: 0, column: 0 })
  const debounceTimeout = useRef<NodeJS.Timeout>()
  const changeQueue = useRef<DocumentChange[]>([])
  const lastChangeId = useRef<string>()

  // Join document room when connected and enabled
  useEffect(() => {
    if (isConnected && enabled && user) {
      joinRoom(roomId)
      
      return () => {
        leaveRoom(roomId)
      }
    }
  }, [isConnected, enabled, user, roomId, joinRoom, leaveRoom])

  // Listen for presence changes
  useEffect(() => {
    const cleanup = onPresenceChange((presence) => {
      setActiveUsers(presence.filter(p => p.currentRoom === roomId))
    })

    return cleanup
  }, [onPresenceChange, roomId])

  // Listen for cursor updates
  useEffect(() => {
    const cleanup = onMessage('cursor_movement', (data: { cursor: DocumentCursor }) => {
      setCursors(prev => {
        const filtered = prev.filter(c => c.userId !== data.cursor.userId)
        return [...filtered, data.cursor]
      })
    })

    return cleanup
  }, [onMessage])

  // Listen for document changes
  useEffect(() => {
    const cleanup = onMessage('text_change', (data: { change: DocumentChange }) => {
      const change = data.change
      
      if (change.userId === user?.id) {
        // Remove from pending changes if it's our change
        setPendingChanges(prev => prev.filter(c => c.id !== change.id))
      } else {
        // Apply remote change
        applyRemoteChange(change)
      }
    })

    return cleanup
  }, [onMessage, user?.id])

  // Update cursor position
  const updateCursor = useCallback((position: { line: number; column: number }): void => {
    if (!user || !isConnected) return

    currentCursor.current = position

    // Debounce cursor updates
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    debounceTimeout.current = setTimeout(() => {
      const cursor: DocumentCursor = {
        userId: user?.id as UserId,
        assetId,
        position,
        color: generateUserColor(user?.id || ''),
        timestamp: new Date().toISOString()
      }

      sendMessage('cursor_movement', { cursor }, roomId)
    }, 100) // Short debounce for cursors
  }, [user, isConnected, assetId, sendMessage, roomId])

  // Apply document change
  const applyChange = useCallback((
    change: Omit<DocumentChange, 'id' | 'userId' | 'timestamp'>
  ): void => {
    if (!user || !isConnected) return

    const fullChange: DocumentChange = {
      ...change,
      id: nanoid(),
      userId: user?.id as UserId,
      assetId,
      timestamp: new Date().toISOString()
    }

    // Add to pending changes
    setPendingChanges(prev => [...prev, fullChange])
    
    // Add to queue for potential conflict resolution
    changeQueue.current.push(fullChange)

    // Send change immediately
    sendMessage('text_change', { change: fullChange }, roomId)
    lastChangeId.current = fullChange.id

    // Clean up old changes in queue
    setTimeout(() => {
      changeQueue.current = changeQueue.current.filter(c => c.id !== fullChange.id)
    }, 30000) // Keep for 30 seconds for conflict resolution
  }, [user, isConnected, assetId, sendMessage, roomId])

  // Apply remote change with conflict resolution
  const applyRemoteChange = useCallback((remoteChange: DocumentChange): void => {
    // Find conflicting local changes
    const conflicts = changeQueue.current.filter(localChange => 
      isConflicting(localChange, remoteChange)
    )

    if (conflicts.length === 0) {
      // No conflicts, apply directly
      onChangeApplied(remoteChange)
      return
    }

    // Handle conflicts based on resolution strategy
    switch (conflictResolution) {
      case 'last-writer-wins':
        // Apply the most recent change
        const mostRecent = [...conflicts, remoteChange]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
        
        if (mostRecent.id !== remoteChange.id) {
          // Local change wins, reject remote
          return
        }
        
        onChangeApplied(remoteChange)
        break

      case 'automatic':
        // Use operational transform to merge changes
        const transformedChange = transformChange(remoteChange, conflicts)
        onChangeApplied(transformedChange)
        break

      case 'manual':
        // Add to pending for manual resolution
        setPendingChanges(prev => [...prev, remoteChange])
        break
    }
  }, [conflictResolution])

  // Resolve conflict manually
  const resolveConflict = useCallback((
    changeId: string, 
    resolution: 'accept' | 'reject'
  ): void => {
    setPendingChanges(prev => {
      const change = prev.find(c => c.id === changeId)
      const filtered = prev.filter(c => c.id !== changeId)

      if (change && resolution === 'accept') {
        onChangeApplied(change)
      }

      return filtered
    })
  }, [])

  // Helper function to check if changes conflict
  const isConflicting = (change1: DocumentChange, change2: DocumentChange): boolean => {
    // Simple conflict detection based on position overlap
    if (change1.position.line !== change2.position.line) {
      return false
    }

    // Check if positions overlap
    const c1End = change1.position.column + (change1.length || change1.content?.length || 0)
    const c2End = change2.position.column + (change2.length || change2.content?.length || 0)

    return !(c1End <= change2.position.column || c2End <= change1.position.column)
  }

  // Simple operational transform for text changes
  const transformChange = (change: DocumentChange, conflicts: DocumentChange[]): DocumentChange => {
    let transformedChange = { ...change }

    for (const conflict of conflicts) {
      if (conflict.position.line === change.position.line) {
        // Adjust column position based on earlier changes
        if (conflict.position.column < change.position.column) {
          const offset = conflict.type === 'insert' 
            ? (conflict.content?.length || 0)
            : -(conflict.length || 0)
          
          transformedChange.position.column += offset
        }
      }
    }

    return transformedChange
  }

  // Generate consistent color for user
  const generateUserColor = (userId: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]
    
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  // Callback for when changes are applied (to be implemented by consumer)
  const onChangeApplied = useCallback((change: DocumentChange) => {
    // Default implementation - this can be extended by consumers
    console.log('Remote change applied:', change)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [])

  return {
    activeUsers,
    cursors: cursors.filter(c => c.userId !== user?.id), // Exclude own cursor
    pendingChanges,
    conflictResolution,
    updateCursor,
    applyChange,
    resolveConflict
  }
}