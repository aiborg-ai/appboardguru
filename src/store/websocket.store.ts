/**
 * WebSocket Store
 * Zustand store for WebSocket state management
 */

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  WebSocketMessage,
  UserPresence,
  DocumentCursor,
  DocumentChange,
  RealtimeComment,
  RoomId,
  SocketId,
  WebSocketEventType,
  WebSocketMetrics
} from '../types/websocket'
import type { UserId } from '../types/database'

// =============================================
// STORE TYPES
// =============================================

interface WebSocketState {
  // Connection state
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastError: string | null
  socketId: SocketId | null
  metrics: WebSocketMetrics | null

  // Rooms
  currentRooms: Set<RoomId>
  roomPresence: Map<RoomId, UserPresence[]>

  // Document collaboration
  documentCursors: Map<string, DocumentCursor[]> // key: assetId
  documentChanges: Map<string, DocumentChange[]> // key: assetId
  pendingChanges: Map<string, DocumentChange[]> // key: assetId

  // Comments
  realtimeComments: Map<string, RealtimeComment[]> // key: assetId
  commentLoading: Map<string, boolean> // key: assetId

  // Message history
  messageHistory: Map<RoomId, WebSocketMessage[]>
  unreadMessages: Map<RoomId, number>

  // Event handlers
  eventHandlers: Map<WebSocketEventType, Set<data: unknown) => void>>
}

interface WebSocketActions {
  // Connection actions
  setConnection: (connected: boolean, status: WebSocketState['connectionStatus']) => void
  setError: (error: string | null) => void
  setSocketId: (socketId: SocketId | null) => void
  setMetrics: (metrics: WebSocketMetrics) => void

  // Room actions
  joinRoom: (roomId: RoomId) => void
  leaveRoom: (roomId: RoomId) => void
  setRoomPresence: (roomId: RoomId, presence: UserPresence[]) => void
  updateUserPresence: (roomId: RoomId, userId: UserId, presence: Partial<UserPresence>) => void

  // Document collaboration actions
  addDocumentCursor: (assetId: string, cursor: DocumentCursor) => void
  removeDocumentCursor: (assetId: string, userId: UserId) => void
  clearDocumentCursors: (assetId: string) => void
  addDocumentChange: (assetId: string, change: DocumentChange) => void
  addPendingChange: (assetId: string, change: DocumentChange) => void
  removePendingChange: (assetId: string, changeId: string) => void
  clearDocumentChanges: (assetId: string) => void

  // Comment actions
  setComments: (assetId: string, comments: RealtimeComment[]) => void
  addComment: (assetId: string, comment: RealtimeComment) => void
  updateComment: (assetId: string, commentId: string, updates: Partial<RealtimeComment>) => void
  removeComment: (assetId: string, commentId: string) => void
  setCommentLoading: (assetId: string, loading: boolean) => void

  // Message actions
  addMessage: (roomId: RoomId, message: WebSocketMessage) => void
  markMessagesRead: (roomId: RoomId) => void
  incrementUnreadCount: (roomId: RoomId) => void

  // Event handler actions
  addEventListener: (event: WebSocketEventType, handler: data: unknown) => void) => () => void
  removeEventListener: (event: WebSocketEventType, handler: data: unknown) => void) => void
  triggerEvent: (event: WebSocketEventType, data: any) => void

  // Utility actions
  reset: () => void
  cleanup: (assetId?: string, roomId?: RoomId) => void
}

type WebSocketStore = WebSocketState & WebSocketActions

// =============================================
// INITIAL STATE
// =============================================

const initialState: WebSocketState = {
  isConnected: false,
  connectionStatus: 'disconnected',
  lastError: null,
  socketId: null,
  metrics: null,
  currentRooms: new Set(),
  roomPresence: new Map(),
  documentCursors: new Map(),
  documentChanges: new Map(),
  pendingChanges: new Map(),
  realtimeComments: new Map(),
  commentLoading: new Map(),
  messageHistory: new Map(),
  unreadMessages: new Map(),
  eventHandlers: new Map()
}

// =============================================
// STORE IMPLEMENTATION
// =============================================

export const useWebSocketStore = create<WebSocketStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Connection actions
        setConnection: (connected, status) => {
          set((state) => {
            state.isConnected = connected
            state.connectionStatus = status
            if (connected) {
              state.lastError = null
            }
          })
        },

        setError: (error) => {
          set((state) => {
            state.lastError = error
            if (error) {
              state.connectionStatus = 'error'
            }
          })
        },

        setSocketId: (socketId) => {
          set((state) => {
            state.socketId = socketId
          })
        },

        setMetrics: (metrics) => {
          set((state) => {
            state.metrics = metrics
          })
        },

        // Room actions
        joinRoom: (roomId) => {
          set((state) => {
            state.currentRooms.add(roomId)
            if (!state.roomPresence.has(roomId)) {
              state.roomPresence.set(roomId, [])
            }
            if (!state.messageHistory.has(roomId)) {
              state.messageHistory.set(roomId, [])
            }
            if (!state.unreadMessages.has(roomId)) {
              state.unreadMessages.set(roomId, 0)
            }
          })
        },

        leaveRoom: (roomId) => {
          set((state) => {
            state.currentRooms.delete(roomId)
            state.roomPresence.delete(roomId)
            state.messageHistory.delete(roomId)
            state.unreadMessages.delete(roomId)
          })
        },

        setRoomPresence: (roomId, presence) => {
          set((state) => {
            state.roomPresence.set(roomId, presence)
          })
        },

        updateUserPresence: (roomId, userId, presenceUpdates) => {
          set((state) => {
            const presence = state.roomPresence.get(roomId) || []
            const updated = presence.map(p => 
              p.userId === userId ? { ...p, ...presenceUpdates } : p
            )
            state.roomPresence.set(roomId, updated)
          })
        },

        // Document collaboration actions
        addDocumentCursor: (assetId, cursor) => {
          set((state) => {
            const cursors = state.documentCursors.get(assetId) || []
            const filtered = cursors.filter(c => c.userId !== cursor.userId)
            state.documentCursors.set(assetId, [...filtered, cursor])
          })
        },

        removeDocumentCursor: (assetId, userId) => {
          set((state) => {
            const cursors = state.documentCursors.get(assetId) || []
            const filtered = cursors.filter(c => c.userId !== userId)
            state.documentCursors.set(assetId, filtered)
          })
        },

        clearDocumentCursors: (assetId) => {
          set((state) => {
            state.documentCursors.delete(assetId)
          })
        },

        addDocumentChange: (assetId, change) => {
          set((state) => {
            const changes = state.documentChanges.get(assetId) || []
            state.documentChanges.set(assetId, [...changes, change])
          })
        },

        addPendingChange: (assetId, change) => {
          set((state) => {
            const pending = state.pendingChanges.get(assetId) || []
            state.pendingChanges.set(assetId, [...pending, change])
          })
        },

        removePendingChange: (assetId, changeId) => {
          set((state) => {
            const pending = state.pendingChanges.get(assetId) || []
            const filtered = pending.filter(c => c.id !== changeId)
            state.pendingChanges.set(assetId, filtered)
          })
        },

        clearDocumentChanges: (assetId) => {
          set((state) => {
            state.documentChanges.delete(assetId)
            state.pendingChanges.delete(assetId)
          })
        },

        // Comment actions
        setComments: (assetId, comments) => {
          set((state) => {
            state.realtimeComments.set(assetId, comments)
          })
        },

        addComment: (assetId, comment) => {
          set((state) => {
            const comments = state.realtimeComments.get(assetId) || []
            // Avoid duplicates
            if (!comments.some(c => c.id === comment.id)) {
              state.realtimeComments.set(assetId, [...comments, comment])
            }
          })
        },

        updateComment: (assetId, commentId, updates) => {
          set((state) => {
            const comments = state.realtimeComments.get(assetId) || []
            const updated = comments.map(c => 
              c.id === commentId ? { ...c, ...updates } : c
            )
            state.realtimeComments.set(assetId, updated)
          })
        },

        removeComment: (assetId, commentId) => {
          set((state) => {
            const comments = state.realtimeComments.get(assetId) || []
            const filtered = comments.filter(c => c.id !== commentId)
            state.realtimeComments.set(assetId, filtered)
          })
        },

        setCommentLoading: (assetId, loading) => {
          set((state) => {
            state.commentLoading.set(assetId, loading)
          })
        },

        // Message actions
        addMessage: (roomId, message) => {
          set((state) => {
            const messages = state.messageHistory.get(roomId) || []
            state.messageHistory.set(roomId, [...messages, message])
          })
        },

        markMessagesRead: (roomId) => {
          set((state) => {
            state.unreadMessages.set(roomId, 0)
          })
        },

        incrementUnreadCount: (roomId) => {
          set((state) => {
            const current = state.unreadMessages.get(roomId) || 0
            state.unreadMessages.set(roomId, current + 1)
          })
        },

        // Event handler actions
        addEventListener: (event, handler) => {
          set((state) => {
            if (!state.eventHandlers.has(event)) {
              state.eventHandlers.set(event, new Set())
            }
            state.eventHandlers.get(event)!.add(handler)
          })

          // Return cleanup function
          return () => {
            const state = get()
            const handlers = state.eventHandlers.get(event)
            if (handlers) {
              handlers.delete(handler)
              if (handlers.size === 0) {
                state.eventHandlers.delete(event)
              }
            }
          }
        },

        removeEventListener: (event, handler) => {
          set((state) => {
            const handlers = state.eventHandlers.get(event)
            if (handlers) {
              handlers.delete(handler)
              if (handlers.size === 0) {
                state.eventHandlers.delete(event)
              }
            }
          })
        },

        triggerEvent: (event, data) => {
          const state = get()
          const handlers = state.eventHandlers.get(event)
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(data)
              } catch (error) {
                console.error(`Error in WebSocket event handler for ${event}:`, error)
              }
            })
          }
        },

        // Utility actions
        reset: () => {
          set(() => ({ ...initialState }))
        },

        cleanup: (assetId, roomId) => {
          set((state) => {
            if (assetId) {
              state.documentCursors.delete(assetId)
              state.documentChanges.delete(assetId)
              state.pendingChanges.delete(assetId)
              state.realtimeComments.delete(assetId)
              state.commentLoading.delete(assetId)
            }
            if (roomId) {
              state.roomPresence.delete(roomId)
              state.messageHistory.delete(roomId)
              state.unreadMessages.delete(roomId)
              state.currentRooms.delete(roomId)
            }
          })
        }
      })),
      {
        name: 'websocket-store',
        version: 1
      }
    )
  )
)

// =============================================
// SELECTORS
// =============================================

// Connection selectors
export const useWebSocketConnection = () => useWebSocketStore((state) => ({
  isConnected: state.isConnected,
  connectionStatus: state.connectionStatus,
  lastError: state.lastError,
  socketId: state.socketId
}))

// Room selectors
export const useRoomPresence = (roomId: RoomId) => 
  useWebSocketStore((state) => state.roomPresence.get(roomId) || [])

export const useCurrentRooms = () => 
  useWebSocketStore((state) => Array.from(state.currentRooms))

// Document collaboration selectors
export const useDocumentCursors = (assetId: string) =>
  useWebSocketStore((state) => state.documentCursors.get(assetId) || [])

export const useDocumentChanges = (assetId: string) =>
  useWebSocketStore((state) => ({
    changes: state.documentChanges.get(assetId) || [],
    pending: state.pendingChanges.get(assetId) || []
  }))

// Comment selectors
export const useRealtimeCommentsData = (assetId: string) =>
  useWebSocketStore((state) => ({
    comments: state.realtimeComments.get(assetId) || [],
    loading: state.commentLoading.get(assetId) || false
  }))

// Message selectors
export const useRoomMessages = (roomId: RoomId) =>
  useWebSocketStore((state) => ({
    messages: state.messageHistory.get(roomId) || [],
    unreadCount: state.unreadMessages.get(roomId) || 0
  }))

// Metrics selector
export const useWebSocketMetrics = () =>
  useWebSocketStore((state) => state.metrics)