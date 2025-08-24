'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface CollaborationUser {
  id: string
  name: string
  avatar?: string
  status: 'viewing' | 'editing' | 'commenting' | 'offline'
  cursor?: { 
    x: number
    y: number
    selection?: string
    page?: number
  }
  lastSeen: Date
  role: 'owner' | 'editor' | 'reviewer' | 'viewer'
  permissions: {
    canEdit: boolean
    canComment: boolean
    canShare: boolean
    canDelete: boolean
  }
}

export interface DocumentComment {
  id: string
  documentId: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  position: { 
    page?: number
    x?: number
    y?: number
    selection?: string
    elementId?: string
  }
  type: 'comment' | 'suggestion' | 'approval' | 'question' | 'change_request'
  status: 'open' | 'resolved' | 'acknowledged' | 'rejected'
  priority: 'low' | 'medium' | 'high' | 'critical'
  replies: DocumentComment[]
  attachments?: {
    id: string
    name: string
    url: string
    type: 'image' | 'file' | 'voice' | 'video'
    size?: number
  }[]
  mentions?: string[]
  reactions?: {
    emoji: string
    users: string[]
    count: number
  }[]
  createdAt: Date
  updatedAt?: Date
  resolvedAt?: Date
  resolvedBy?: string
}

export interface DocumentVersion {
  id: string
  documentId: string
  version: string
  createdBy: string
  createdByName: string
  createdAt: Date
  changes: string[]
  changesSummary: string
  size: number
  downloadUrl?: string
  compareUrl?: string
  isSnapshot: boolean
  tags?: string[]
}

export interface DocumentChange {
  id: string
  userId: string
  userName: string
  type: 'insert' | 'delete' | 'modify' | 'format' | 'move'
  position: { start: number; end: number; page?: number }
  content: {
    before?: string
    after?: string
    metadata?: Record<string, any>
  }
  timestamp: Date
  applied: boolean
}

export interface CollaborationSession {
  id: string
  documentId: string
  startedAt: Date
  endedAt?: Date
  participants: string[]
  activeUsers: string[]
  totalChanges: number
  totalComments: number
}

// WebSocket event types
type WebSocketEvent = 
  | { type: 'user_joined'; payload: { user: CollaborationUser } }
  | { type: 'user_left'; payload: { userId: string } }
  | { type: 'cursor_moved'; payload: { userId: string; cursor: CollaborationUser['cursor'] } }
  | { type: 'document_change'; payload: { change: DocumentChange } }
  | { type: 'comment_added'; payload: { comment: DocumentComment } }
  | { type: 'comment_updated'; payload: { comment: DocumentComment } }
  | { type: 'comment_resolved'; payload: { commentId: string; resolvedBy: string } }
  | { type: 'document_locked'; payload: { userId: string; reason: string } }
  | { type: 'document_unlocked'; payload: { userId: string } }
  | { type: 'typing_start'; payload: { userId: string; position: any } }
  | { type: 'typing_stop'; payload: { userId: string } }

export interface UseRealTimeCollaborationOptions {
  enableRealTime?: boolean
  autoSave?: boolean
  autoSaveInterval?: number
  maxConcurrentEditors?: number
  conflictResolution?: 'last_writer_wins' | 'operational_transform' | 'manual'
}

export function useRealTimeCollaboration(
  documentId: string,
  options: UseRealTimeCollaborationOptions = {}
) {
  const {
    enableRealTime = true,
    autoSave = true,
    autoSaveInterval = 5000,
    maxConcurrentEditors = 10,
    conflictResolution = 'operational_transform'
  } = options

  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [currentUserId] = useState('current-user') // Would come from auth context
  const [isEditing, setIsEditing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null)

  // Fetch active users
  const {
    data: activeUsers = [],
    isLoading: usersLoading
  } = useQuery({
    queryKey: ['collaboration', 'users', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/collaboration/users`)
      if (!response.ok) throw new Error('Failed to fetch active users')
      return response.json()
    },
    refetchInterval: enableRealTime ? 30000 : undefined
  })

  // Fetch comments
  const {
    data: comments = [],
    isLoading: commentsLoading
  } = useQuery({
    queryKey: ['collaboration', 'comments', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/comments`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      return response.json()
    },
    refetchInterval: enableRealTime ? 10000 : undefined
  })

  // Fetch versions
  const {
    data: versions = [],
    isLoading: versionsLoading
  } = useQuery({
    queryKey: ['collaboration', 'versions', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/versions`)
      if (!response.ok) throw new Error('Failed to fetch versions')
      return response.json()
    }
  })

  // Fetch current session
  const {
    data: currentSession,
    isLoading: sessionLoading
  } = useQuery({
    queryKey: ['collaboration', 'session', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/collaboration/session`)
      if (!response.ok) throw new Error('Failed to fetch session')
      return response.json()
    },
    enabled: enableRealTime
  })

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (commentData: Omit<DocumentComment, 'id' | 'createdAt' | 'replies'>) => {
      const response = await fetch(`/api/documents/${documentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentData)
      })
      if (!response.ok) throw new Error('Failed to add comment')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration', 'comments', documentId] })
    }
  })

  // Resolve comment mutation
  const resolveCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`/api/documents/${documentId}/comments/${commentId}/resolve`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to resolve comment')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration', 'comments', documentId] })
    }
  })

  // Start editing mutation
  const startEditingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/collaboration/start-editing`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to start editing')
      return response.json()
    },
    onSuccess: () => {
      setIsEditing(true)
      queryClient.invalidateQueries({ queryKey: ['collaboration', 'users', documentId] })
    }
  })

  // Stop editing mutation
  const stopEditingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/collaboration/stop-editing`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to stop editing')
      return response.json()
    },
    onSuccess: () => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['collaboration', 'users', documentId] })
    }
  })

  // Lock/unlock document mutations
  const lockDocumentMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(`/api/documents/${documentId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      if (!response.ok) throw new Error('Failed to lock document')
      return response.json()
    }
  })

  const unlockDocumentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/unlock`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to unlock document')
      return response.json()
    }
  })

  // Share document mutation
  const shareDocumentMutation = useMutation({
    mutationFn: async (shareData: { emails: string[]; permissions: string; message?: string }) => {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareData)
      })
      if (!response.ok) throw new Error('Failed to share document')
      return response.json()
    }
  })

  // WebSocket connection management
  useEffect(() => {
    if (!enableRealTime || !documentId) return

    const connectWebSocket = () => {
      try {
        setConnectionStatus('connecting')
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/documents/${documentId}/collaboration`
        wsRef.current = new WebSocket(wsUrl)

        wsRef.current.onopen = () => {
          setIsConnected(true)
          setConnectionStatus('connected')
          console.log('Collaboration WebSocket connected')
          
          // Join collaboration session
          wsRef.current?.send(JSON.stringify({
            type: 'join_session',
            payload: { userId: currentUserId }
          }))
        }

        wsRef.current.onmessage = (event) => {
          try {
            const wsEvent: WebSocketEvent = JSON.parse(event.data)
            handleWebSocketEvent(wsEvent)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        wsRef.current.onclose = () => {
          setIsConnected(false)
          setConnectionStatus('disconnected')
          console.log('Collaboration WebSocket disconnected')
          
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              connectWebSocket()
            }
          }, 5000)
        }

        wsRef.current.onerror = (error) => {
          setConnectionStatus('error')
          console.error('Collaboration WebSocket error:', error)
        }
      } catch (error) {
        setConnectionStatus('error')
        console.error('Failed to connect WebSocket:', error)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [documentId, enableRealTime, currentUserId])

  // Handle WebSocket events
  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    switch (event.type) {
      case 'user_joined':
        queryClient.setQueryData(
          ['collaboration', 'users', documentId],
          (old: CollaborationUser[] = []) => [
            ...old.filter(u => u.id !== event.payload.user.id),
            event.payload.user
          ]
        )
        break

      case 'user_left':
        queryClient.setQueryData(
          ['collaboration', 'users', documentId],
          (old: CollaborationUser[] = []) => old.filter(u => u.id !== event.payload.userId)
        )
        break

      case 'cursor_moved':
        queryClient.setQueryData(
          ['collaboration', 'users', documentId],
          (old: CollaborationUser[] = []) => old.map(user =>
            user.id === event.payload.userId
              ? { ...user, cursor: event.payload.cursor }
              : user
          )
        )
        break

      case 'comment_added':
        queryClient.setQueryData(
          ['collaboration', 'comments', documentId],
          (old: DocumentComment[] = []) => [event.payload.comment, ...old]
        )
        break

      case 'comment_updated':
        queryClient.setQueryData(
          ['collaboration', 'comments', documentId],
          (old: DocumentComment[] = []) => old.map(comment =>
            comment.id === event.payload.comment.id ? event.payload.comment : comment
          )
        )
        break

      case 'comment_resolved':
        queryClient.setQueryData(
          ['collaboration', 'comments', documentId],
          (old: DocumentComment[] = []) => old.map(comment =>
            comment.id === event.payload.commentId
              ? { ...comment, status: 'resolved' as const, resolvedBy: event.payload.resolvedBy, resolvedAt: new Date() }
              : comment
          )
        )
        break

      case 'document_change':
        // Handle real-time document changes
        setHasUnsavedChanges(true)
        // Apply operational transformation if needed
        break

      default:
        console.log('Unhandled WebSocket event:', event)
    }
  }, [documentId, queryClient])

  // Send cursor position updates
  const updateCursorPosition = useCallback((x: number, y: number, selection?: string) => {
    setCursorPosition({ x, y })
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor_move',
        payload: {
          userId: currentUserId,
          cursor: { x, y, selection }
        }
      }))
    }
  }, [currentUserId])

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !hasUnsavedChanges) return

    const interval = setInterval(() => {
      // Implement auto-save logic here
      console.log('Auto-saving document...')
      setHasUnsavedChanges(false)
    }, autoSaveInterval)

    return () => clearInterval(interval)
  }, [autoSave, hasUnsavedChanges, autoSaveInterval])

  // Convenience functions
  const addComment = useCallback((commentData: Omit<DocumentComment, 'id' | 'createdAt' | 'replies'>) => {
    addCommentMutation.mutate(commentData)
  }, [addCommentMutation])

  const resolveComment = useCallback((commentId: string) => {
    resolveCommentMutation.mutate(commentId)
  }, [resolveCommentMutation])

  const startEditing = useCallback(() => {
    startEditingMutation.mutate()
  }, [startEditingMutation])

  const stopEditing = useCallback(() => {
    stopEditingMutation.mutate()
  }, [stopEditingMutation])

  const lockDocument = useCallback((reason: string) => {
    lockDocumentMutation.mutate(reason)
  }, [lockDocumentMutation])

  const unlockDocument = useCallback(() => {
    unlockDocumentMutation.mutate()
  }, [unlockDocumentMutation])

  const shareDocument = useCallback((shareData: { emails: string[]; permissions: string; message?: string }) => {
    shareDocumentMutation.mutate(shareData)
  }, [shareDocumentMutation])

  return {
    // Data
    activeUsers,
    comments,
    versions,
    currentSession,
    
    // Connection status
    isConnected,
    connectionStatus,
    
    // User state
    isEditing,
    hasUnsavedChanges,
    cursorPosition,
    
    // Loading states
    isLoading: usersLoading || commentsLoading || versionsLoading,
    usersLoading,
    commentsLoading,
    versionsLoading,
    sessionLoading,
    
    // Actions
    addComment,
    resolveComment,
    startEditing,
    stopEditing,
    lockDocument,
    unlockDocument,
    shareDocument,
    updateCursorPosition,
    
    // Mutation states
    isAddingComment: addCommentMutation.isPending,
    isResolvingComment: resolveCommentMutation.isPending,
    isStartingEdit: startEditingMutation.isPending,
    isStoppingEdit: stopEditingMutation.isPending,
    isLocking: lockDocumentMutation.isPending,
    isSharing: shareDocumentMutation.isPending
  }
}