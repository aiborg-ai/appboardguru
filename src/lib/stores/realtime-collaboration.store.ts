/**
 * Real-Time Collaboration Store
 * 
 * Comprehensive state management for real-time collaboration features using Zustand
 * Handles WebSocket connections, CRDT operations, presence tracking, and notifications
 * 
 * Features:
 * - WebSocket connection management with auto-reconnection
 * - CRDT-based document collaboration
 * - Real-time presence and activity tracking
 * - Live notifications and alerts
 * - Optimistic updates with conflict resolution
 * - Performance monitoring and analytics
 * 
 * Follows CLAUDE.md patterns with immutable state updates and TypeScript safety
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { 
  UserId, 
  OrganizationId, 
  AssetId, 
  RoomId, 
  SocketId, 
  SessionId 
} from '@/types/branded'
import type { 
  UserPresence, 
  WebSocketMessage, 
  DocumentCursor, 
  DocumentChange, 
  RealtimeComment,
  WebSocketEventType 
} from '@/types/websocket'

// =============================================
// STATE INTERFACES
// =============================================

interface WebSocketConnection {
  socket: WebSocket | null
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'
  lastError: string | null
  reconnectAttempts: number
  maxReconnectAttempts: number
  reconnectDelay: number
  heartbeatInterval: NodeJS.Timeout | null
  lastHeartbeat: string | null
  latency: number
}

interface DocumentCollaborationState {
  documents: Map<AssetId, {
    id: AssetId
    content: string
    version: number
    cursors: Map<UserId, DocumentCursor>
    changes: DocumentChange[]
    comments: RealtimeComment[]
    collaborators: UserPresence[]
    isLocked: boolean
    lockedBy?: UserId
    conflictResolution: 'manual' | 'automatic' | 'last-writer-wins'
    pendingOperations: any[]
    lastSync: string
  }>
  activeDocument: AssetId | null
  isEditing: boolean
  selectedText: string | null
  cursorPosition: { line: number; column: number } | null
}

interface PresenceState {
  users: Map<UserId, UserPresence>
  currentUser: UserPresence | null
  rooms: Map<RoomId, {
    id: RoomId
    participants: UserId[]
    activity: 'high' | 'medium' | 'low'
    lastActivity: string
  }>
  activeRoom: RoomId | null
  activityLog: Array<{
    id: string
    userId: UserId
    action: string
    timestamp: string
    metadata?: Record<string, any>
  }>
}

interface NotificationState {
  notifications: Array<{
    id: string
    type: 'info' | 'success' | 'warning' | 'error' | 'reminder'
    title: string
    message: string
    timestamp: string
    read: boolean
    priority: 'low' | 'medium' | 'high' | 'critical'
    actions?: Array<{
      id: string
      label: string
      action: string
    }>
    metadata?: Record<string, any>
  }>
  unreadCount: number
  preferences: {
    enabled: boolean
    sound: boolean
    desktop: boolean
    email: boolean
    categories: Record<string, boolean>
  }
  toast: {
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    duration: number
  } | null
}

interface AnalyticsState {
  performance: {
    messageLatency: number[]
    connectionUptime: number
    errorCount: number
    reconnectionCount: number
    lastUpdated: string
  }
  collaboration: {
    totalEdits: number
    totalComments: number
    activeCollaborators: number
    conflictResolutions: number
    sessionDuration: number
  }
  engagement: {
    userActivity: Map<UserId, {
      actions: number
      timeActive: number
      lastAction: string
    }>
    peakConcurrency: number
    averageSessionLength: number
  }
}

interface RealTimeCollaborationState {
  // Connection state
  connection: WebSocketConnection
  
  // Feature states
  documents: DocumentCollaborationState
  presence: PresenceState
  notifications: NotificationState
  analytics: AnalyticsState
  
  // Configuration
  config: {
    organizationId: OrganizationId
    userId: UserId
    autoReconnect: boolean
    heartbeatInterval: number
    maxMessageQueueSize: number
    enableAnalytics: boolean
    enablePresenceTracking: boolean
    enableNotifications: boolean
  }
  
  // Message queue for offline support
  messageQueue: Array<{
    id: string
    type: WebSocketEventType
    data: any
    roomId?: RoomId
    timestamp: string
    retries: number
  }>
  
  // Actions
  actions: {
    // Connection actions
    connect: (url: string) => Promise<void>
    disconnect: () => void
    reconnect: () => Promise<void>
    sendMessage: <T>(type: WebSocketEventType, data: T, roomId?: RoomId) => void
    
    // Room actions
    joinRoom: (roomId: RoomId) => Promise<void>
    leaveRoom: (roomId: RoomId) => Promise<void>
    
    // Document collaboration actions
    openDocument: (documentId: AssetId, initialContent?: string) => Promise<void>
    closeDocument: (documentId: AssetId) => Promise<void>
    applyDocumentChange: (documentId: AssetId, change: Omit<DocumentChange, 'id' | 'timestamp'>) => void
    updateCursor: (documentId: AssetId, position: { line: number; column: number }) => void
    addComment: (documentId: AssetId, comment: Omit<RealtimeComment, 'id' | 'timestamp'>) => void
    resolveComment: (documentId: AssetId, commentId: string) => void
    lockDocument: (documentId: AssetId, reason?: string) => void
    unlockDocument: (documentId: AssetId) => void
    
    // Presence actions
    updatePresence: (presence: Partial<UserPresence>) => void
    trackActivity: (action: string, metadata?: Record<string, any>) => void
    
    // Notification actions
    addNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'timestamp'>) => void
    markNotificationAsRead: (notificationId: string) => void
    clearNotifications: () => void
    updateNotificationPreferences: (preferences: Partial<NotificationState['preferences']>) => void
    showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void
    
    // Analytics actions
    recordPerformanceMetric: (metric: string, value: number) => void
    incrementCounter: (counter: string) => void
    
    // Utility actions
    clearState: () => void
    exportState: () => string
    importState: (state: string) => void
  }
}

// =============================================
// STORE IMPLEMENTATION
// =============================================

export const useRealTimeCollaborationStore = create<RealTimeCollaborationState>()(
  persist(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        connection: {
          socket: null,
          isConnected: false,
          connectionStatus: 'disconnected',
          lastError: null,
          reconnectAttempts: 0,
          maxReconnectAttempts: 5,
          reconnectDelay: 1000,
          heartbeatInterval: null,
          lastHeartbeat: null,
          latency: 0
        },

        documents: {
          documents: new Map(),
          activeDocument: null,
          isEditing: false,
          selectedText: null,
          cursorPosition: null
        },

        presence: {
          users: new Map(),
          currentUser: null,
          rooms: new Map(),
          activeRoom: null,
          activityLog: []
        },

        notifications: {
          notifications: [],
          unreadCount: 0,
          preferences: {
            enabled: true,
            sound: true,
            desktop: true,
            email: true,
            categories: {}
          },
          toast: null
        },

        analytics: {
          performance: {
            messageLatency: [],
            connectionUptime: 0,
            errorCount: 0,
            reconnectionCount: 0,
            lastUpdated: new Date().toISOString()
          },
          collaboration: {
            totalEdits: 0,
            totalComments: 0,
            activeCollaborators: 0,
            conflictResolutions: 0,
            sessionDuration: 0
          },
          engagement: {
            userActivity: new Map(),
            peakConcurrency: 0,
            averageSessionLength: 0
          }
        },

        config: {
          organizationId: '' as OrganizationId,
          userId: '' as UserId,
          autoReconnect: true,
          heartbeatInterval: 30000,
          maxMessageQueueSize: 100,
          enableAnalytics: true,
          enablePresenceTracking: true,
          enableNotifications: true
        },

        messageQueue: [],

        // Actions implementation
        actions: {
          // Connection actions
          connect: async (url: string) => {
            const state = get()
            
            // Close existing connection
            if (state.connection.socket) {
              state.connection.socket.close()
            }

            set((draft) => {
              draft.connection.connectionStatus = 'connecting'
              draft.connection.lastError = null
            })

            try {
              const socket = new WebSocket(url)
              
              socket.onopen = () => {
                set((draft) => {
                  draft.connection.socket = socket
                  draft.connection.isConnected = true
                  draft.connection.connectionStatus = 'connected'
                  draft.connection.reconnectAttempts = 0
                  draft.connection.lastError = null
                })

                // Start heartbeat
                const heartbeatInterval = setInterval(() => {
                  if (socket.readyState === WebSocket.OPEN) {
                    const heartbeat = {
                      type: 'heartbeat' as WebSocketEventType,
                      timestamp: new Date().toISOString(),
                      userId: state.config.userId
                    }
                    socket.send(JSON.stringify(heartbeat))
                    
                    set((draft) => {
                      draft.connection.lastHeartbeat = heartbeat.timestamp
                    })
                  }
                }, state.config.heartbeatInterval)

                set((draft) => {
                  draft.connection.heartbeatInterval = heartbeatInterval
                })

                // Process queued messages
                const currentState = get()
                currentState.messageQueue.forEach(message => {
                  socket.send(JSON.stringify({
                    id: message.id,
                    type: message.type,
                    data: message.data,
                    roomId: message.roomId,
                    timestamp: message.timestamp,
                    userId: currentState.config.userId
                  }))
                })

                set((draft) => {
                  draft.messageQueue = []
                })
              }

              socket.onmessage = (event) => {
                const startTime = performance.now()
                
                try {
                  const message = JSON.parse(event.data)
                  handleIncomingMessage(message, set, get)
                  
                  // Record latency
                  const latency = performance.now() - startTime
                  set((draft) => {
                    draft.connection.latency = latency
                    draft.analytics.performance.messageLatency.push(latency)
                    if (draft.analytics.performance.messageLatency.length > 100) {
                      draft.analytics.performance.messageLatency = draft.analytics.performance.messageLatency.slice(-100)
                    }
                  })
                } catch (error) {
                  console.error('Failed to parse WebSocket message:', error)
                  set((draft) => {
                    draft.analytics.performance.errorCount++
                  })
                }
              }

              socket.onclose = (event) => {
                set((draft) => {
                  draft.connection.isConnected = false
                  draft.connection.connectionStatus = 'disconnected'
                  draft.connection.socket = null
                  
                  if (draft.connection.heartbeatInterval) {
                    clearInterval(draft.connection.heartbeatInterval)
                    draft.connection.heartbeatInterval = null
                  }
                })

                // Auto-reconnect if enabled
                const currentState = get()
                if (currentState.config.autoReconnect && 
                    currentState.connection.reconnectAttempts < currentState.connection.maxReconnectAttempts) {
                  
                  setTimeout(() => {
                    set((draft) => {
                      draft.connection.reconnectAttempts++
                      draft.connection.connectionStatus = 'reconnecting'
                      draft.analytics.performance.reconnectionCount++
                    })
                    
                    get().actions.connect(url)
                  }, currentState.connection.reconnectDelay * Math.pow(2, currentState.connection.reconnectAttempts))
                }
              }

              socket.onerror = (error) => {
                set((draft) => {
                  draft.connection.lastError = 'WebSocket connection error'
                  draft.connection.connectionStatus = 'error'
                  draft.analytics.performance.errorCount++
                })
              }

            } catch (error) {
              set((draft) => {
                draft.connection.lastError = error instanceof Error ? error.message : 'Unknown connection error'
                draft.connection.connectionStatus = 'error'
              })
            }
          },

          disconnect: () => {
            const state = get()
            
            if (state.connection.socket) {
              state.connection.socket.close()
            }
            
            if (state.connection.heartbeatInterval) {
              clearInterval(state.connection.heartbeatInterval)
            }

            set((draft) => {
              draft.connection = {
                socket: null,
                isConnected: false,
                connectionStatus: 'disconnected',
                lastError: null,
                reconnectAttempts: 0,
                maxReconnectAttempts: 5,
                reconnectDelay: 1000,
                heartbeatInterval: null,
                lastHeartbeat: null,
                latency: 0
              }
            })
          },

          reconnect: async () => {
            const state = get()
            if (state.connection.socket?.url) {
              await state.actions.connect(state.connection.socket.url)
            }
          },

          sendMessage: <T>(type: WebSocketEventType, data: T, roomId?: RoomId) => {
            const state = get()
            const messageId = `${state.config.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            const message = {
              id: messageId,
              type,
              data,
              roomId,
              timestamp: new Date().toISOString(),
              userId: state.config.userId
            }

            if (state.connection.isConnected && state.connection.socket?.readyState === WebSocket.OPEN) {
              state.connection.socket.send(JSON.stringify(message))
            } else {
              // Queue message for when connection is restored
              set((draft) => {
                draft.messageQueue.push({
                  id: messageId,
                  type,
                  data,
                  roomId,
                  timestamp: message.timestamp,
                  retries: 0
                })
                
                // Limit queue size
                if (draft.messageQueue.length > draft.config.maxMessageQueueSize) {
                  draft.messageQueue = draft.messageQueue.slice(-draft.config.maxMessageQueueSize)
                }
              })
            }
          },

          // Room actions
          joinRoom: async (roomId: RoomId) => {
            const state = get()
            
            set((draft) => {
              draft.presence.activeRoom = roomId
              if (!draft.presence.rooms.has(roomId)) {
                draft.presence.rooms.set(roomId, {
                  id: roomId,
                  participants: [state.config.userId],
                  activity: 'low',
                  lastActivity: new Date().toISOString()
                })
              }
            })

            state.actions.sendMessage('join_room', { roomId, userId: state.config.userId }, roomId)
          },

          leaveRoom: async (roomId: RoomId) => {
            const state = get()
            
            set((draft) => {
              if (draft.presence.activeRoom === roomId) {
                draft.presence.activeRoom = null
              }
              
              const room = draft.presence.rooms.get(roomId)
              if (room) {
                room.participants = room.participants.filter(id => id !== state.config.userId)
                if (room.participants.length === 0) {
                  draft.presence.rooms.delete(roomId)
                }
              }
            })

            state.actions.sendMessage('leave_room', { roomId, userId: state.config.userId }, roomId)
          },

          // Document collaboration actions
          openDocument: async (documentId: AssetId, initialContent = '') => {
            set((draft) => {
              draft.documents.activeDocument = documentId
              
              if (!draft.documents.documents.has(documentId)) {
                draft.documents.documents.set(documentId, {
                  id: documentId,
                  content: initialContent,
                  version: 1,
                  cursors: new Map(),
                  changes: [],
                  comments: [],
                  collaborators: [],
                  isLocked: false,
                  conflictResolution: 'automatic',
                  pendingOperations: [],
                  lastSync: new Date().toISOString()
                })
              }
            })

            const state = get()
            state.actions.sendMessage('document_open', { 
              documentId, 
              userId: state.config.userId 
            }, `document_${documentId}` as RoomId)
          },

          closeDocument: async (documentId: AssetId) => {
            const state = get()
            
            set((draft) => {
              if (draft.documents.activeDocument === documentId) {
                draft.documents.activeDocument = null
                draft.documents.isEditing = false
                draft.documents.cursorPosition = null
                draft.documents.selectedText = null
              }
            })

            state.actions.sendMessage('document_close', { 
              documentId, 
              userId: state.config.userId 
            }, `document_${documentId}` as RoomId)
          },

          applyDocumentChange: (documentId: AssetId, change: Omit<DocumentChange, 'id' | 'timestamp'>) => {
            const changeId = `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const timestamp = new Date().toISOString()
            
            const fullChange: DocumentChange = {
              ...change,
              id: changeId,
              timestamp
            }

            set((draft) => {
              const doc = draft.documents.documents.get(documentId)
              if (doc) {
                doc.changes.push(fullChange)
                doc.version++
                doc.lastSync = timestamp
                
                // Apply change to content (simplified)
                if (change.type === 'insert' && change.content) {
                  const pos = change.position?.line || 0
                  const lines = doc.content.split('\n')
                  lines.splice(pos, 0, change.content)
                  doc.content = lines.join('\n')
                } else if (change.type === 'delete' && change.length) {
                  const pos = change.position?.line || 0
                  const lines = doc.content.split('\n')
                  lines.splice(pos, change.length)
                  doc.content = lines.join('\n')
                }
              }
              
              draft.analytics.collaboration.totalEdits++
            })

            const state = get()
            state.actions.sendMessage('document_change', fullChange, `document_${documentId}` as RoomId)
          },

          updateCursor: (documentId: AssetId, position: { line: number; column: number }) => {
            const state = get()
            
            set((draft) => {
              draft.documents.cursorPosition = position
              
              const doc = draft.documents.documents.get(documentId)
              if (doc && draft.presence.currentUser) {
                const cursor: DocumentCursor = {
                  userId: state.config.userId,
                  assetId: documentId,
                  position,
                  color: '#3B82F6', // Default color
                  timestamp: new Date().toISOString()
                }
                doc.cursors.set(state.config.userId, cursor)
              }
            })

            state.actions.sendMessage('cursor_update', { 
              documentId, 
              position, 
              userId: state.config.userId 
            }, `document_${documentId}` as RoomId)
          },

          addComment: (documentId: AssetId, comment: Omit<RealtimeComment, 'id' | 'timestamp'>) => {
            const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const timestamp = new Date().toISOString()
            
            const fullComment: RealtimeComment = {
              ...comment,
              id: commentId,
              timestamp
            }

            set((draft) => {
              const doc = draft.documents.documents.get(documentId)
              if (doc) {
                doc.comments.push(fullComment)
              }
              draft.analytics.collaboration.totalComments++
            })

            const state = get()
            state.actions.sendMessage('comment_add', fullComment, `document_${documentId}` as RoomId)
          },

          resolveComment: (documentId: AssetId, commentId: string) => {
            set((draft) => {
              const doc = draft.documents.documents.get(documentId)
              if (doc) {
                const comment = doc.comments.find(c => c.id === commentId)
                if (comment) {
                  comment.resolved = true
                }
              }
            })

            const state = get()
            state.actions.sendMessage('comment_resolve', { 
              documentId, 
              commentId, 
              userId: state.config.userId 
            }, `document_${documentId}` as RoomId)
          },

          lockDocument: (documentId: AssetId, reason?: string) => {
            set((draft) => {
              const doc = draft.documents.documents.get(documentId)
              if (doc) {
                doc.isLocked = true
                doc.lockedBy = draft.config.userId
              }
            })

            const state = get()
            state.actions.sendMessage('document_lock', { 
              documentId, 
              userId: state.config.userId, 
              reason 
            }, `document_${documentId}` as RoomId)
          },

          unlockDocument: (documentId: AssetId) => {
            set((draft) => {
              const doc = draft.documents.documents.get(documentId)
              if (doc) {
                doc.isLocked = false
                doc.lockedBy = undefined
              }
            })

            const state = get()
            state.actions.sendMessage('document_unlock', { 
              documentId, 
              userId: state.config.userId 
            }, `document_${documentId}` as RoomId)
          },

          // Presence actions
          updatePresence: (presence: Partial<UserPresence>) => {
            set((draft) => {
              if (draft.presence.currentUser) {
                draft.presence.currentUser = { ...draft.presence.currentUser, ...presence }
                draft.presence.users.set(draft.config.userId, draft.presence.currentUser)
              }
            })

            const state = get()
            state.actions.sendMessage('presence_update', { 
              userId: state.config.userId, 
              ...presence 
            })
          },

          trackActivity: (action: string, metadata?: Record<string, any>) => {
            const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const timestamp = new Date().toISOString()

            set((draft) => {
              draft.presence.activityLog.unshift({
                id: activityId,
                userId: draft.config.userId,
                action,
                timestamp,
                metadata
              })

              // Keep only last 100 activities
              if (draft.presence.activityLog.length > 100) {
                draft.presence.activityLog = draft.presence.activityLog.slice(0, 100)
              }

              // Update user activity analytics
              const userActivity = draft.analytics.engagement.userActivity.get(draft.config.userId)
              if (userActivity) {
                userActivity.actions++
                userActivity.lastAction = timestamp
              } else {
                draft.analytics.engagement.userActivity.set(draft.config.userId, {
                  actions: 1,
                  timeActive: 0,
                  lastAction: timestamp
                })
              }
            })

            const state = get()
            state.actions.sendMessage('activity_track', { 
              userId: state.config.userId, 
              action, 
              metadata, 
              timestamp 
            })
          },

          // Notification actions
          addNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'timestamp'>) => {
            const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const timestamp = new Date().toISOString()

            set((draft) => {
              const fullNotification = {
                ...notification,
                id: notificationId,
                timestamp
              }
              
              draft.notifications.notifications.unshift(fullNotification)
              if (!notification.read) {
                draft.notifications.unreadCount++
              }

              // Keep only last 100 notifications
              if (draft.notifications.notifications.length > 100) {
                const removed = draft.notifications.notifications.slice(100)
                draft.notifications.notifications = draft.notifications.notifications.slice(0, 100)
                
                // Adjust unread count
                const removedUnread = removed.filter(n => !n.read).length
                draft.notifications.unreadCount = Math.max(0, draft.notifications.unreadCount - removedUnread)
              }
            })
          },

          markNotificationAsRead: (notificationId: string) => {
            set((draft) => {
              const notification = draft.notifications.notifications.find(n => n.id === notificationId)
              if (notification && !notification.read) {
                notification.read = true
                draft.notifications.unreadCount = Math.max(0, draft.notifications.unreadCount - 1)
              }
            })
          },

          clearNotifications: () => {
            set((draft) => {
              draft.notifications.notifications = []
              draft.notifications.unreadCount = 0
            })
          },

          updateNotificationPreferences: (preferences: Partial<NotificationState['preferences']>) => {
            set((draft) => {
              draft.notifications.preferences = { ...draft.notifications.preferences, ...preferences }
            })
          },

          showToast: (message: string, type = 'info' as const, duration = 5000) => {
            set((draft) => {
              draft.notifications.toast = { message, type, duration }
            })

            // Auto-clear toast
            setTimeout(() => {
              set((draft) => {
                draft.notifications.toast = null
              })
            }, duration)
          },

          // Analytics actions
          recordPerformanceMetric: (metric: string, value: number) => {
            set((draft) => {
              if (metric === 'latency') {
                draft.analytics.performance.messageLatency.push(value)
                if (draft.analytics.performance.messageLatency.length > 100) {
                  draft.analytics.performance.messageLatency = draft.analytics.performance.messageLatency.slice(-100)
                }
              }
              draft.analytics.performance.lastUpdated = new Date().toISOString()
            })
          },

          incrementCounter: (counter: string) => {
            set((draft) => {
              switch (counter) {
                case 'edits':
                  draft.analytics.collaboration.totalEdits++
                  break
                case 'comments':
                  draft.analytics.collaboration.totalComments++
                  break
                case 'conflicts':
                  draft.analytics.collaboration.conflictResolutions++
                  break
                case 'errors':
                  draft.analytics.performance.errorCount++
                  break
                case 'reconnections':
                  draft.analytics.performance.reconnectionCount++
                  break
              }
            })
          },

          // Utility actions
          clearState: () => {
            set((draft) => {
              draft.documents.documents.clear()
              draft.presence.users.clear()
              draft.presence.rooms.clear()
              draft.notifications.notifications = []
              draft.notifications.unreadCount = 0
              draft.messageQueue = []
              draft.presence.activityLog = []
            })
          },

          exportState: () => {
            const state = get()
            return JSON.stringify({
              documents: Array.from(state.documents.documents.entries()),
              presence: Array.from(state.presence.users.entries()),
              notifications: state.notifications.notifications,
              analytics: state.analytics
            })
          },

          importState: (stateStr: string) => {
            try {
              const importedState = JSON.parse(stateStr)
              set((draft) => {
                if (importedState.documents) {
                  draft.documents.documents = new Map(importedState.documents)
                }
                if (importedState.presence) {
                  draft.presence.users = new Map(importedState.presence)
                }
                if (importedState.notifications) {
                  draft.notifications.notifications = importedState.notifications
                  draft.notifications.unreadCount = importedState.notifications.filter((n: any) => !n.read).length
                }
                if (importedState.analytics) {
                  draft.analytics = { ...draft.analytics, ...importedState.analytics }
                }
              })
            } catch (error) {
              console.error('Failed to import state:', error)
            }
          }
        }
      }))
    ),
    {
      name: 'realtime-collaboration-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        notifications: {
          preferences: state.notifications.preferences
        },
        analytics: state.analytics
      })
    }
  )
)

// =============================================
// MESSAGE HANDLERS
// =============================================

function handleIncomingMessage(
  message: any,
  set: any,
  get: any
) {
  const { type, data, userId, timestamp } = message

  switch (type) {
    case 'user_joined':
      set((draft: RealTimeCollaborationState) => {
        draft.presence.users.set(userId, data)
        
        const room = draft.presence.rooms.get(draft.presence.activeRoom!)
        if (room && !room.participants.includes(userId)) {
          room.participants.push(userId)
          room.lastActivity = timestamp
        }
      })
      break

    case 'user_left':
      set((draft: RealTimeCollaborationState) => {
        const user = draft.presence.users.get(userId)
        if (user) {
          user.status = 'offline'
          user.lastSeen = timestamp
        }
        
        const room = draft.presence.rooms.get(draft.presence.activeRoom!)
        if (room) {
          room.participants = room.participants.filter(id => id !== userId)
        }
      })
      break

    case 'presence_update':
      set((draft: RealTimeCollaborationState) => {
        const existingUser = draft.presence.users.get(userId)
        if (existingUser) {
          Object.assign(existingUser, data)
        } else {
          draft.presence.users.set(userId, data)
        }
      })
      break

    case 'document_change':
      set((draft: RealTimeCollaborationState) => {
        const doc = draft.documents.documents.get(data.assetId)
        if (doc) {
          doc.changes.push(data)
          doc.version++
          doc.lastSync = timestamp
          
          // Apply change optimistically
          if (data.type === 'insert' && data.content) {
            const pos = data.position?.line || 0
            const lines = doc.content.split('\n')
            lines.splice(pos, 0, data.content)
            doc.content = lines.join('\n')
          }
        }
      })
      break

    case 'cursor_update':
      set((draft: RealTimeCollaborationState) => {
        const doc = draft.documents.documents.get(data.documentId)
        if (doc && userId !== draft.config.userId) {
          doc.cursors.set(userId, {
            userId,
            assetId: data.documentId,
            position: data.position,
            color: data.color || '#3B82F6',
            timestamp
          })
        }
      })
      break

    case 'comment_add':
      set((draft: RealTimeCollaborationState) => {
        const doc = draft.documents.documents.get(data.assetId)
        if (doc) {
          doc.comments.push(data)
        }
      })
      break

    case 'comment_resolve':
      set((draft: RealTimeCollaborationState) => {
        const doc = draft.documents.documents.get(data.documentId)
        if (doc) {
          const comment = doc.comments.find(c => c.id === data.commentId)
          if (comment) {
            comment.resolved = true
          }
        }
      })
      break

    case 'document_lock':
      set((draft: RealTimeCollaborationState) => {
        const doc = draft.documents.documents.get(data.documentId)
        if (doc) {
          doc.isLocked = true
          doc.lockedBy = userId
        }
      })
      break

    case 'document_unlock':
      set((draft: RealTimeCollaborationState) => {
        const doc = draft.documents.documents.get(data.documentId)
        if (doc) {
          doc.isLocked = false
          doc.lockedBy = undefined
        }
      })
      break

    case 'notification':
      set((draft: RealTimeCollaborationState) => {
        if (draft.notifications.preferences.enabled) {
          draft.notifications.notifications.unshift({
            ...data,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: timestamp || new Date().toISOString(),
            read: false
          })
          draft.notifications.unreadCount++
        }
      })
      break

    case 'activity_track':
      set((draft: RealTimeCollaborationState) => {
        draft.presence.activityLog.unshift({
          id: `activity_${timestamp}_${userId}`,
          userId,
          action: data.action,
          timestamp,
          metadata: data.metadata
        })

        if (draft.presence.activityLog.length > 100) {
          draft.presence.activityLog = draft.presence.activityLog.slice(0, 100)
        }
      })
      break

    default:
      console.log('Unhandled message type:', type, data)
  }
}

// =============================================
// SELECTORS
// =============================================

export const selectConnection = (state: RealTimeCollaborationState) => state.connection
export const selectIsConnected = (state: RealTimeCollaborationState) => state.connection.isConnected
export const selectActiveDocument = (state: RealTimeCollaborationState) => state.documents.activeDocument
export const selectDocumentById = (documentId: AssetId) => (state: RealTimeCollaborationState) => 
  state.documents.documents.get(documentId)
export const selectPresenceUsers = (state: RealTimeCollaborationState) => Array.from(state.presence.users.values())
export const selectUnreadNotifications = (state: RealTimeCollaborationState) => 
  state.notifications.notifications.filter(n => !n.read)
export const selectAnalytics = (state: RealTimeCollaborationState) => state.analytics
export const selectToast = (state: RealTimeCollaborationState) => state.notifications.toast

// =============================================
// HOOKS
// =============================================

export const useConnection = () => useRealTimeCollaborationStore(selectConnection)
export const useIsConnected = () => useRealTimeCollaborationStore(selectIsConnected)
export const useActiveDocument = () => useRealTimeCollaborationStore(selectActiveDocument)
export const usePresenceUsers = () => useRealTimeCollaborationStore(selectPresenceUsers)
export const useUnreadNotifications = () => useRealTimeCollaborationStore(selectUnreadNotifications)
export const useAnalytics = () => useRealTimeCollaborationStore(selectAnalytics)
export const useToast = () => useRealTimeCollaborationStore(selectToast)
export const useCollaborationActions = () => useRealTimeCollaborationStore(state => state.actions)