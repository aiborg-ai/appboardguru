/**
 * Real-time Comments Hook
 * Live commenting system with mentions and replies
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '../lib/stores'
import { useWebSocket } from './useWebSocket'
import type {
  UseRealtimeCommentsReturn,
  RealtimeComment,
  RealtimeCommentReply,
  RoomId
} from '../types/websocket'
import type { AssetId, UserId } from '../types/database'
import { createRoomId } from '../types/websocket'
import { nanoid } from 'nanoid'

interface UseRealtimeCommentsOptions {
  assetId: AssetId
  enabled?: boolean
  autoSync?: boolean
  mentionNotifications?: boolean
}

export function useRealtimeComments({
  assetId,
  enabled = true,
  autoSync = true,
  mentionNotifications = true
}: UseRealtimeCommentsOptions): UseRealtimeCommentsReturn {
  const user = useUser()
  const roomId = createRoomId(`comments_${assetId}`)
  
  // WebSocket connection
  const {
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage,
    onMessage
  } = useWebSocket()

  // State
  const [comments, setComments] = useState<RealtimeComment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Refs
  const syncedComments = useRef<Set<string>>(new Set())
  const pendingOperations = useRef<Map<string, () => void>>(new Map())

  // Join comments room when connected and enabled
  useEffect(() => {
    if (isConnected && enabled && user) {
      joinRoom(roomId)
      loadExistingComments()
      
      return () => {
        leaveRoom(roomId)
      }
    }
  }, [isConnected, enabled, user, roomId])

  // Load existing comments from server
  const loadExistingComments = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      
      // Request existing comments from server
      sendMessage('comment_sync_request', { assetId }, roomId)
      
      // Server will respond with existing comments
    } catch (error) {
      console.error('Failed to load existing comments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [sendMessage, assetId, roomId])

  // Listen for comment events
  useEffect(() => {
    const cleanups: (() => void)[] = []

    // Comment added
    cleanups.push(onMessage('comment_added', (data: { comment: RealtimeComment }) => {
      const { comment } = data
      
      setComments(prev => {
        // Avoid duplicates
        if (prev.some(c => c.id === comment.id)) {
          return prev
        }
        return [...prev, comment]
      })

      syncedComments.current.add(comment.id)

      // Handle mentions if enabled
      if (mentionNotifications && user?.id && comment.mentions.includes(user.id as UserId)) {
        showMentionNotification(comment)
      }
    }))

    // Comment updated
    cleanups.push(onMessage('comment_updated', (data: { comment: RealtimeComment }) => {
      const { comment } = data
      
      setComments(prev => prev.map(c => 
        c.id === comment.id ? { ...comment } : c
      ))

      syncedComments.current.add(comment.id)
    }))

    // Comment deleted
    cleanups.push(onMessage('comment_deleted', (data: { commentId: string }) => {
      const { commentId } = data
      
      setComments(prev => prev.filter(c => c.id !== commentId))
      syncedComments.current.delete(commentId)
    }))

    // Comment resolved
    cleanups.push(onMessage('comment_resolved', (data: { commentId: string, resolved: boolean }) => {
      const { commentId, resolved } = data
      
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, resolved } : c
      ))
    }))

    // Comment sync response
    cleanups.push(onMessage('comment_sync_response', (data: { comments: RealtimeComment[] }) => {
      const { comments: existingComments } = data
      
      setComments(existingComments)
      existingComments.forEach(comment => {
        syncedComments.current.add(comment.id)
      })
      
      setIsLoading(false)
    }))

    // Reply added
    cleanups.push(onMessage('comment_reply_added', (data: { commentId: string, reply: RealtimeCommentReply }) => {
      const { commentId, reply } = data
      
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { ...c, replies: [...c.replies, reply] }
          : c
      ))

      // Handle mentions in replies
      if (mentionNotifications && user?.id && reply.mentions.includes(user.id as UserId)) {
        showReplyMentionNotification(commentId, reply)
      }
    }))

    return () => {
      cleanups.forEach(cleanup => cleanup())
    }
  }, [onMessage, user?.id, mentionNotifications])

  // Add new comment
  const addComment = useCallback(async (
    comment: Omit<RealtimeComment, 'id' | 'userId' | 'timestamp' | 'replies'>
  ): Promise<void> => {
    if (!user || !isConnected) {
      throw new Error('User not authenticated or WebSocket not connected')
    }

    const newComment: RealtimeComment = {
      ...comment,
      id: nanoid(),
      userId: user?.id as UserId,
      timestamp: new Date().toISOString(),
      replies: []
    }

    // Optimistically update local state
    setComments(prev => [...prev, newComment])

    // Send to server
    sendMessage('comment_added', { comment: newComment }, roomId)

    // Mark as pending sync
    pendingOperations.current.set(newComment.id, () => {
      // Retry logic if needed
      sendMessage('comment_added', { comment: newComment }, roomId)
    })

    // Clean up pending operation after timeout
    setTimeout(() => {
      pendingOperations.current.delete(newComment.id)
    }, 30000)
  }, [user, isConnected, sendMessage, roomId])

  // Update existing comment
  const updateComment = useCallback(async (
    commentId: string,
    updates: Partial<Pick<RealtimeComment, 'content' | 'position' | 'mentions' | 'resolved'>>
  ): Promise<void> => {
    if (!user || !isConnected) {
      throw new Error('User not authenticated or WebSocket not connected')
    }

    // Optimistically update local state
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, ...updates } : c
    ))

    // Send to server
    sendMessage('comment_updated', { 
      commentId, 
      updates: {
        ...updates,
        timestamp: new Date().toISOString()
      }
    }, roomId)
  }, [user, isConnected, sendMessage, roomId])

  // Delete comment
  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    if (!user || !isConnected) {
      throw new Error('User not authenticated or WebSocket not connected')
    }

    // Check if user owns the comment
    const comment = comments.find(c => c.id === commentId)
    if (!comment || comment.userId !== user?.id) {
      throw new Error('Cannot delete comment: permission denied')
    }

    // Optimistically update local state
    setComments(prev => prev.filter(c => c.id !== commentId))

    // Send to server
    sendMessage('comment_deleted', { commentId }, roomId)
  }, [user, isConnected, comments, sendMessage, roomId])

  // Resolve/unresolve comment
  const resolveComment = useCallback(async (commentId: string): Promise<void> => {
    if (!user || !isConnected) {
      throw new Error('User not authenticated or WebSocket not connected')
    }

    const comment = comments.find(c => c.id === commentId)
    if (!comment) return

    const resolved = !comment.resolved

    // Optimistically update local state
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, resolved } : c
    ))

    // Send to server
    sendMessage('comment_resolved', { commentId, resolved }, roomId)
  }, [user, isConnected, comments, sendMessage, roomId])

  // Add reply to comment
  const addReply = useCallback(async (
    commentId: string,
    reply: Omit<RealtimeCommentReply, 'id' | 'userId' | 'timestamp'>
  ): Promise<void> => {
    if (!user || !isConnected) {
      throw new Error('User not authenticated or WebSocket not connected')
    }

    const newReply: RealtimeCommentReply = {
      ...reply,
      id: nanoid(),
      userId: user?.id as UserId,
      timestamp: new Date().toISOString()
    }

    // Optimistically update local state
    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { ...c, replies: [...c.replies, newReply] }
        : c
    ))

    // Send to server
    sendMessage('comment_reply_added', { commentId, reply: newReply }, roomId)
  }, [user, isConnected, sendMessage, roomId])

  // Show mention notification
  const showMentionNotification = useCallback((comment: RealtimeComment): void => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'granted') {
      new Notification('You were mentioned in a comment', {
        body: comment.content.substring(0, 100) + '...',
        icon: '/favicon.ico',
        tag: `comment_${comment.id}`
      })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showMentionNotification(comment)
        }
      })
    }
  }, [])

  // Show reply mention notification
  const showReplyMentionNotification = useCallback((
    commentId: string, 
    reply: RealtimeCommentReply
  ): void => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'granted') {
      new Notification('You were mentioned in a reply', {
        body: reply.content.substring(0, 100) + '...',
        icon: '/favicon.ico',
        tag: `reply_${reply.id}`
      })
    }
  }, [])

  // Get comments sorted by timestamp
  const sortedComments = comments.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  return {
    comments: sortedComments,
    isLoading,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    addReply
  }
}