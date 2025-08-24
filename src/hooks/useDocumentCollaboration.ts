'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRealTimeCollaborationStore } from '@/lib/stores/realtime-collaboration.store'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { AssetId, UserId } from '@/types/branded'
import type { DocumentCursor, DocumentChange } from '@/types/websocket'

interface OperationalTransform {
  id: string
  operation: DocumentChange
  transformedBy: UserId[]
  applied: boolean
  timestamp: string
}

interface ConflictResolution {
  id: string
  conflictType: 'concurrent_edit' | 'ordering_issue' | 'state_divergence'
  operations: DocumentChange[]
  resolution: 'accept_local' | 'accept_remote' | 'merge' | 'manual'
  resolvedBy?: UserId
  resolvedAt?: string
}

export interface UseDocumentCollaborationOptions {
  enableOperationalTransform?: boolean
  conflictResolution?: 'manual' | 'automatic' | 'last-writer-wins'
  maxPendingChanges?: number
  transformTimeout?: number
}

export function useDocumentCollaboration(
  documentId: AssetId,
  options: UseDocumentCollaborationOptions = {}
) {
  const {
    enableOperationalTransform = true,
    conflictResolution = 'automatic',
    maxPendingChanges = 50,
    transformTimeout = 5000
  } = options

  const queryClient = useQueryClient()
  const collaborationStore = useRealTimeCollaborationStore()
  const { sendMessage, onMessage } = useWebSocket()

  // Local state
  const [cursors, setCursors] = useState<DocumentCursor[]>([])
  const [pendingChanges, setPendingChanges] = useState<DocumentChange[]>([])
  const [transformQueue, setTransformQueue] = useState<OperationalTransform[]>([])
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([])
  const [isProcessingChanges, setIsProcessingChanges] = useState(false)

  // Refs for tracking state
  const operationIdCounter = useRef(0)
  const pendingTransforms = useRef(new Map<string, NodeJS.Timeout>())
  const lastProcessedTimestamp = useRef<string | null>(null)

  // Get document state from collaboration store
  const documentState = collaborationStore.documents.documents.get(documentId)
  const currentUserId = collaborationStore.config.userId

  // Fetch initial collaboration data
  const { data: collaborationData } = useQuery({
    queryKey: ['document-collaboration', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/collaboration`)
      if (!response.ok) throw new Error('Failed to fetch collaboration data')
      return response.json()
    },
    enabled: !!documentId
  })

  // Apply change mutation
  const applyChangeMutation = useMutation({
    mutationFn: async (change: DocumentChange) => {
      const response = await fetch(`/api/documents/${documentId}/changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change)
      })
      if (!response.ok) throw new Error('Failed to apply change')
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Update local state
      setPendingChanges(prev => prev.filter(c => c.id !== variables.id))
      
      // Update collaboration store
      collaborationStore.actions.applyDocumentChange(documentId, variables)
    }
  })

  // Resolve conflict mutation
  const resolveConflictMutation = useMutation({
    mutationFn: async ({ conflictId, resolution }: { 
      conflictId: string
      resolution: 'accept' | 'reject' | 'merge'
    }) => {
      const response = await fetch(`/api/documents/${documentId}/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      })
      if (!response.ok) throw new Error('Failed to resolve conflict')
      return response.json()
    },
    onSuccess: (_, { conflictId }) => {
      setConflicts(prev => prev.filter(c => c.id !== conflictId))
    }
  })

  // Load initial data
  useEffect(() => {
    if (collaborationData) {
      setCursors(collaborationData.cursors || [])
      setPendingChanges(collaborationData.pendingChanges || [])
      setConflicts(collaborationData.conflicts || [])
      lastProcessedTimestamp.current = collaborationData.lastProcessed
    }
  }, [collaborationData])

  // Set up WebSocket listeners for real-time updates
  useEffect(() => {
    const unsubscribeCursor = onMessage('cursor_update', handleCursorUpdate)
    const unsubscribeChange = onMessage('document_change', handleRemoteChange)
    const unsubscribeConflict = onMessage('conflict_detected', handleConflictDetected)
    const unsubscribeResolution = onMessage('conflict_resolved', handleConflictResolved)
    const unsubscribeTransform = onMessage('operation_transformed', handleOperationTransformed)

    return () => {
      unsubscribeCursor()
      unsubscribeChange()
      unsubscribeConflict()
      unsubscribeResolution()
      unsubscribeTransform()
    }
  }, [documentId])

  // Handle cursor updates from other users
  const handleCursorUpdate = useCallback((data: any) => {
    if (data.userId !== currentUserId && data.assetId === documentId) {
      setCursors(prev => {
        const existing = prev.findIndex(c => c.userId === data.userId)
        const cursor: DocumentCursor = {
          userId: data.userId,
          assetId: documentId,
          position: data.position,
          selection: data.selection,
          color: data.color || '#3B82F6',
          timestamp: data.timestamp || new Date().toISOString()
        }

        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = cursor
          return updated
        } else {
          return [...prev, cursor]
        }
      })
    }
  }, [currentUserId, documentId])

  // Handle remote document changes
  const handleRemoteChange = useCallback((data: DocumentChange) => {
    if (data.userId !== currentUserId && data.assetId === documentId) {
      if (enableOperationalTransform) {
        processRemoteChangeWithOT(data)
      } else {
        applyRemoteChangeDirectly(data)
      }
    }
  }, [currentUserId, documentId, enableOperationalTransform])

  // Handle conflict detection
  const handleConflictDetected = useCallback((data: any) => {
    const conflict: ConflictResolution = {
      id: data.conflictId,
      conflictType: data.type,
      operations: data.operations,
      resolution: conflictResolution,
    }

    setConflicts(prev => [...prev, conflict])

    // Auto-resolve if configured
    if (conflictResolution === 'automatic') {
      setTimeout(() => {
        resolveConflict(conflict.id, 'merge')
      }, 1000)
    } else if (conflictResolution === 'last-writer-wins') {
      setTimeout(() => {
        resolveConflict(conflict.id, 'accept')
      }, 100)
    }
  }, [conflictResolution])

  // Handle conflict resolution
  const handleConflictResolved = useCallback((data: any) => {
    setConflicts(prev => prev.filter(c => c.id !== data.conflictId))
    
    // Apply resolved operations
    if (data.resolvedOperations) {
      data.resolvedOperations.forEach((op: DocumentChange) => {
        applyRemoteChangeDirectly(op)
      })
    }
  }, [])

  // Handle operational transform results
  const handleOperationTransformed = useCallback((data: any) => {
    const transformId = data.transformId
    const timeout = pendingTransforms.current.get(transformId)
    
    if (timeout) {
      clearTimeout(timeout)
      pendingTransforms.current.delete(transformId)
    }

    // Apply transformed operation
    if (data.transformedOperation) {
      applyRemoteChangeDirectly(data.transformedOperation)
    }

    // Update transform queue
    setTransformQueue(prev => 
      prev.map(t => 
        t.id === transformId 
          ? { ...t, applied: true, transformedBy: [...t.transformedBy, data.transformedBy] }
          : t
      )
    )
  }, [])

  // Process remote change with Operational Transform
  const processRemoteChangeWithOT = useCallback((change: DocumentChange) => {
    const transformId = `transform_${operationIdCounter.current++}`
    
    // Add to transform queue
    const transform: OperationalTransform = {
      id: transformId,
      operation: change,
      transformedBy: [],
      applied: false,
      timestamp: new Date().toISOString()
    }

    setTransformQueue(prev => [...prev, transform])

    // Set up timeout for transformation
    const timeout = setTimeout(() => {
      console.warn(`Transform timeout for ${transformId}, applying directly`)
      applyRemoteChangeDirectly(change)
      
      setTransformQueue(prev => prev.filter(t => t.id !== transformId))
      pendingTransforms.current.delete(transformId)
    }, transformTimeout)

    pendingTransforms.current.set(transformId, timeout)

    // Request transformation from server
    sendMessage('transform_operation', {
      transformId,
      operation: change,
      currentState: documentState ? {
        content: documentState.content,
        version: documentState.version,
        pendingOperations: documentState.pendingOperations
      } : null
    }, `document_${documentId}`)
  }, [documentId, documentState, transformTimeout, sendMessage])

  // Apply remote change directly (without OT)
  const applyRemoteChangeDirectly = useCallback((change: DocumentChange) => {
    // Update cursors based on change (simple position adjustment)
    setCursors(prev => prev.map(cursor => {
      if (cursor.userId === change.userId) return cursor
      
      const adjustedCursor = { ...cursor }
      
      if (change.type === 'insert' && change.position && 
          cursor.position.line >= change.position.line) {
        if (cursor.position.line === change.position.line && 
            cursor.position.column >= change.position.column) {
          adjustedCursor.position.column += change.content?.length || 0
        }
      } else if (change.type === 'delete' && change.position && change.length &&
                 cursor.position.line >= change.position.line) {
        if (cursor.position.line === change.position.line && 
            cursor.position.column >= change.position.column) {
          adjustedCursor.position.column = Math.max(
            change.position.column,
            cursor.position.column - change.length
          )
        }
      }
      
      return adjustedCursor
    }))

    // Track processed timestamp
    lastProcessedTimestamp.current = change.timestamp
  }, [])

  // Apply a local change
  const applyChange = useCallback((change: Omit<DocumentChange, 'id' | 'userId' | 'timestamp'>) => {
    const fullChange: DocumentChange = {
      ...change,
      id: `change_${Date.now()}_${operationIdCounter.current++}`,
      userId: currentUserId,
      assetId: documentId,
      timestamp: new Date().toISOString()
    }

    // Add to pending changes
    setPendingChanges(prev => {
      const updated = [...prev, fullChange]
      // Keep only recent changes
      return updated.length > maxPendingChanges 
        ? updated.slice(-maxPendingChanges)
        : updated
    })

    // Apply optimistically to local state
    collaborationStore.actions.applyDocumentChange(documentId, fullChange)

    // Send to server
    applyChangeMutation.mutate(fullChange)

    // Broadcast to other users
    sendMessage('document_change', fullChange, `document_${documentId}`)
  }, [currentUserId, documentId, maxPendingChanges, sendMessage])

  // Resolve a conflict
  const resolveConflict = useCallback((conflictId: string, resolution: 'accept' | 'reject' | 'merge') => {
    const conflict = conflicts.find(c => c.id === conflictId)
    if (!conflict) return

    // Apply resolution logic
    switch (resolution) {
      case 'accept':
        // Accept the remote operations
        conflict.operations.forEach(op => {
          if (op.userId !== currentUserId) {
            applyRemoteChangeDirectly(op)
          }
        })
        break
        
      case 'reject':
        // Keep local state, reject remote operations
        break
        
      case 'merge':
        // Attempt to merge operations (simplified)
        const sortedOps = [...conflict.operations].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        sortedOps.forEach(op => applyRemoteChangeDirectly(op))
        break
    }

    // Submit resolution
    resolveConflictMutation.mutate({ conflictId, resolution })

    // Broadcast resolution
    sendMessage('conflict_resolved', {
      conflictId,
      resolution,
      resolvedBy: currentUserId
    }, `document_${documentId}`)
  }, [conflicts, currentUserId, documentId, sendMessage])

  // Update cursor position
  const updateCursor = useCallback((position: { line: number; column: number }, selection?: any) => {
    const cursor: DocumentCursor = {
      userId: currentUserId,
      assetId: documentId,
      position,
      selection,
      color: '#3B82F6', // Default blue
      timestamp: new Date().toISOString()
    }

    // Update local cursors
    setCursors(prev => {
      const existing = prev.findIndex(c => c.userId === currentUserId)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = cursor
        return updated
      } else {
        return [...prev, cursor]
      }
    })

    // Update collaboration store
    collaborationStore.actions.updateCursor(documentId, position)

    // Broadcast cursor update
    sendMessage('cursor_update', {
      userId: currentUserId,
      assetId: documentId,
      position,
      selection,
      timestamp: cursor.timestamp
    }, `document_${documentId}`)
  }, [currentUserId, documentId, sendMessage])

  // Get collaboration statistics
  const getCollaborationStats = useCallback(() => {
    return {
      activeCursors: cursors.filter(c => 
        Date.now() - new Date(c.timestamp).getTime() < 60000 // Active in last minute
      ).length,
      pendingChanges: pendingChanges.length,
      unresolvedConflicts: conflicts.length,
      transformQueueSize: transformQueue.filter(t => !t.applied).length,
      lastActivity: lastProcessedTimestamp.current
    }
  }, [cursors, pendingChanges, conflicts, transformQueue])

  // Clear expired cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCursors(prev => 
        prev.filter(cursor => 
          now - new Date(cursor.timestamp).getTime() < 300000 // 5 minutes
        )
      )
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  // Cleanup pending transforms on unmount
  useEffect(() => {
    return () => {
      pendingTransforms.current.forEach(timeout => clearTimeout(timeout))
      pendingTransforms.current.clear()
    }
  }, [])

  return {
    // State
    cursors: cursors.filter(c => c.userId !== currentUserId), // Exclude own cursor
    pendingChanges,
    conflicts,
    transformQueue,
    isProcessingChanges,
    
    // Actions
    applyChange,
    resolveConflict,
    updateCursor,
    
    // Utilities
    getCollaborationStats,
    
    // Status
    isOperationalTransformEnabled: enableOperationalTransform,
    conflictResolutionMode: conflictResolution,
    
    // Loading states
    isApplyingChange: applyChangeMutation.isPending,
    isResolvingConflict: resolveConflictMutation.isPending
  }
}