/**
 * WebSocket Types and Interfaces
 * Real-time collaboration and communication types
 */

import type { UserId, OrganizationId, AssetId, VaultId } from './database'

// Branded types for WebSocket-specific IDs
export type SocketId = string & { readonly __brand: unique symbol }
export type RoomId = string & { readonly __brand: unique symbol }
export type SessionId = string & { readonly __brand: unique symbol }

export const createSocketId = (id: string): SocketId => id as SocketId
export const createRoomId = (id: string): RoomId => id as RoomId
export const createSessionId = (id: string): SessionId => id as SessionId

/**
 * WebSocket Event Types
 */
export type WebSocketEventType = 
  | 'user_presence'
  | 'document_collaboration'
  | 'cursor_movement' 
  | 'text_change'
  | 'comment_added'
  | 'comment_updated'
  | 'comment_deleted'
  | 'notification'
  | 'board_chat'
  | 'meeting_started'
  | 'meeting_ended'
  | 'workflow_updated'
  | 'system_alert'

/**
 * User Presence Data
 */
export interface UserPresence {
  userId: UserId
  socketId: SocketId
  sessionId: SessionId
  organizationId: OrganizationId
  status: 'online' | 'away' | 'busy' | 'offline'
  lastSeen: string
  currentRoom?: RoomId
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet'
    browser: string
    os: string
  }
  metadata?: Record<string, unknown>
}

/**
 * Document Collaboration Types
 */
export interface DocumentCursor {
  userId: UserId
  assetId: AssetId
  position: {
    line: number
    column: number
  }
  selection?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
  color: string
  timestamp: string
}

export interface DocumentChange {
  id: string
  userId: UserId
  assetId: AssetId
  type: 'insert' | 'delete' | 'format'
  position: {
    line: number
    column: number
  }
  content?: string
  length?: number
  timestamp: string
  metadata?: Record<string, unknown>
}

/**
 * Real-time Comment System
 */
export interface RealtimeComment {
  id: string
  userId: UserId
  assetId: AssetId
  content: string
  position: {
    x: number
    y: number
    page?: number
  }
  timestamp: string
  mentions: UserId[]
  resolved: boolean
  replies: RealtimeCommentReply[]
  metadata?: Record<string, unknown>
}

export interface RealtimeCommentReply {
  id: string
  userId: UserId
  commentId: string
  content: string
  timestamp: string
  mentions: UserId[]
}

/**
 * WebSocket Message Structure
 */
export interface WebSocketMessage<T = unknown> {
  id: string
  type: WebSocketEventType
  roomId: RoomId
  userId: UserId
  timestamp: string
  data: T
  metadata?: {
    priority: 'low' | 'normal' | 'high' | 'critical'
    persistent: boolean
    broadcast: boolean
    targetUsers?: UserId[]
  }
}

/**
 * Room Management
 */
export interface Room {
  id: RoomId
  type: 'document' | 'board-chat' | 'meeting' | 'vault' | 'organization'
  name: string
  organizationId: OrganizationId
  resourceId: string // AssetId, VaultId, etc.
  participants: UserPresence[]
  permissions: RoomPermissions
  settings: RoomSettings
  createdAt: string
  updatedAt: string
}

export interface RoomPermissions {
  canView: UserId[]
  canEdit: UserId[]
  canComment: UserId[]
  canModerate: UserId[]
  publicAccess: boolean
}

export interface RoomSettings {
  maxParticipants: number
  allowAnonymous: boolean
  recordSession: boolean
  requireApproval: boolean
  notificationSettings: {
    mentions: boolean
    allMessages: boolean
    presenceChanges: boolean
  }
}

/**
 * WebSocket Server Types
 */
export interface WebSocketConnection {
  id: SocketId
  userId: UserId
  organizationId: OrganizationId
  sessionId: SessionId
  rooms: Set<RoomId>
  isAuthenticated: boolean
  connectedAt: string
  lastActivity: string
  metadata: Record<string, unknown>
}

export interface WebSocketServer {
  connections: Map<SocketId, WebSocketConnection>
  rooms: Map<RoomId, Room>
  userSessions: Map<UserId, Set<SocketId>>
  
  // Connection management
  handleConnection(socketId: SocketId, userId: UserId, organizationId: OrganizationId): Promise<void>
  handleDisconnection(socketId: SocketId): Promise<void>
  
  // Room management
  joinRoom(socketId: SocketId, roomId: RoomId): Promise<void>
  leaveRoom(socketId: SocketId, roomId: RoomId): Promise<void>
  
  // Message handling
  broadcastToRoom(roomId: RoomId, message: WebSocketMessage): Promise<void>
  sendToUser(userId: UserId, message: WebSocketMessage): Promise<void>
  sendToSocket(socketId: SocketId, message: WebSocketMessage): Promise<void>
}

/**
 * Event Payloads
 */
export interface UserPresencePayload {
  presence: UserPresence
  action: 'joined' | 'left' | 'updated'
}

export interface DocumentCollaborationPayload {
  type: 'cursor_update' | 'text_change' | 'selection_change'
  cursor?: DocumentCursor
  change?: DocumentChange
  assetId: AssetId
}

export interface CommentPayload {
  comment: RealtimeComment
  action: 'added' | 'updated' | 'deleted' | 'resolved'
}

export interface NotificationPayload {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  actions?: Array<{
    label: string
    action: string
    style: 'primary' | 'secondary' | 'danger'
  }>
  persistent: boolean
  autoHide: boolean
  hideAfter?: number
}

/**
 * Client-side Hook Return Types
 */
export interface UseWebSocketReturn {
  socket: WebSocket | null
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastError: string | null
  
  // Connection methods
  connect(): Promise<void>
  disconnect(): void
  reconnect(): Promise<void>
  
  // Room methods
  joinRoom(roomId: RoomId): Promise<void>
  leaveRoom(roomId: RoomId): Promise<void>
  
  // Messaging methods
  sendMessage<T>(type: WebSocketEventType, data: T, roomId?: RoomId): void
  
  // Event listeners
  onMessage<T>(type: WebSocketEventType, handler: (data: T) => void): () => void
  onPresenceChange(handler: (presence: UserPresence[]) => void): () => void
  onError(handler: (error: string) => void): () => void
}

export interface UseDocumentCollaborationReturn {
  // Presence
  activeUsers: UserPresence[]
  cursors: DocumentCursor[]
  
  // Document changes
  pendingChanges: DocumentChange[]
  conflictResolution: 'manual' | 'automatic' | 'last-writer-wins'
  
  // Methods
  updateCursor(position: { line: number; column: number }): void
  applyChange(change: Omit<DocumentChange, 'id' | 'userId' | 'timestamp'>): void
  resolveConflict(changeId: string, resolution: 'accept' | 'reject'): void
}

export interface UseRealtimeCommentsReturn {
  comments: RealtimeComment[]
  isLoading: boolean
  
  // Methods
  addComment(comment: Omit<RealtimeComment, 'id' | 'userId' | 'timestamp' | 'replies'>): Promise<void>
  updateComment(commentId: string, updates: Partial<RealtimeComment>): Promise<void>
  deleteComment(commentId: string): Promise<void>
  resolveComment(commentId: string): Promise<void>
  addReply(commentId: string, reply: Omit<RealtimeCommentReply, 'id' | 'userId' | 'timestamp'>): Promise<void>
}

/**
 * Configuration Types
 */
export interface WebSocketConfig {
  url: string
  protocols?: string[]
  heartbeatInterval: number
  reconnectAttempts: number
  reconnectDelay: number
  maxMessageSize: number
  compression: boolean
  authentication: {
    type: 'jwt' | 'api-key' | 'session'
    refreshThreshold: number
  }
  rooms: {
    maxParticipants: number
    defaultPermissions: RoomPermissions
    sessionRecording: boolean
  }
  rateLimit: {
    messagesPerSecond: number
    burstLimit: number
    windowMs: number
  }
}

/**
 * Error Types
 */
export interface WebSocketError {
  code: string
  message: string
  type: 'connection' | 'authentication' | 'permission' | 'rate-limit' | 'server'
  timestamp: string
  context?: Record<string, unknown>
}

export type WebSocketErrorCode = 
  | 'CONNECTION_FAILED'
  | 'AUTHENTICATION_FAILED'  
  | 'PERMISSION_DENIED'
  | 'ROOM_FULL'
  | 'RATE_LIMITED'
  | 'MESSAGE_TOO_LARGE'
  | 'INVALID_FORMAT'
  | 'SERVER_ERROR'

/**
 * Utility Types
 */
export type WebSocketEventHandler<T = unknown> = (data: T) => void | Promise<void>
export type WebSocketEventMap = {
  [K in WebSocketEventType]: WebSocketEventHandler<any>
}

export interface WebSocketMetrics {
  connections: {
    total: number
    authenticated: number
    rooms: Record<string, number>
  }
  messages: {
    sent: number
    received: number
    errors: number
    rateLimit: number
  }
  performance: {
    averageLatency: number
    messageQueue: number
    memoryUsage: number
  }
  uptime: number
}

/**
 * Integration Types
 */
export interface WebSocketIntegration {
  name: string
  enabled: boolean
  config: Record<string, unknown>
  events: WebSocketEventType[]
  handler: (event: WebSocketEventType, data: unknown) => Promise<void>
}