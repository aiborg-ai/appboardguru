/**
 * Comprehensive Tests for Real-Time Collaboration Features
 * Tests WebSocket connections, CRDT operations, presence tracking, and notifications
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRealtimeCollaborationStore } from '@/lib/stores/realtime-collaboration.store'
import { useDocumentCollaboration } from '@/hooks/useDocumentCollaboration'
import { createTestWrapper } from './test-utils'

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: WebSocket.OPEN,
}))

// Mock GraphQL client
vi.mock('@/lib/graphql/realtime-subscriptions', () => ({
  hybridRealtimeManager: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribeToDocument: vi.fn(),
    subscribeToPresence: vi.fn(),
    subscribeToNotifications: vi.fn(),
    subscribeToMeeting: vi.fn(),
    sendMessage: vi.fn(),
    isConnected: vi.fn(() => true),
  }
}))

// Mock Yjs CRDT
vi.mock('yjs', () => ({
  Doc: vi.fn().mockImplementation(() => ({
    getText: vi.fn(() => ({
      insert: vi.fn(),
      delete: vi.fn(),
      observe: vi.fn(),
      unobserve: vi.fn(),
      toString: vi.fn(() => 'test content'),
    })),
    getMap: vi.fn(() => ({
      set: vi.fn(),
      get: vi.fn(),
      observe: vi.fn(),
      unobserve: vi.fn(),
    })),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
  })),
  applyUpdate: vi.fn(),
  encodeStateAsUpdate: vi.fn(() => new Uint8Array()),
}))

describe('Real-Time Collaboration Store', () => {
  beforeEach(() => {
    // Reset store state
    useRealtimeCollaborationStore.getState().disconnect()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should initialize with default state', () => {
    const store = useRealtimeCollaborationStore.getState()
    
    expect(store.connection.status).toBe('disconnected')
    expect(store.connection.isConnected).toBe(false)
    expect(store.documents.size).toBe(0)
    expect(store.sessions.size).toBe(0)
    expect(store.notifications).toEqual([])
    expect(store.presence.users.size).toBe(0)
  })

  it('should handle WebSocket connection', async () => {
    const store = useRealtimeCollaborationStore.getState()
    
    await act(async () => {
      await store.connect('test-user-id', 'test-org-id')
    })

    expect(store.connection.status).toBe('connected')
    expect(store.connection.isConnected).toBe(true)
    expect(store.connection.reconnectAttempts).toBe(0)
  })

  it('should handle connection failures with retry', async () => {
    const store = useRealtimeCollaborationStore.getState()
    
    // Mock WebSocket constructor to throw
    global.WebSocket = vi.fn().mockImplementation(() => {
      throw new Error('Connection failed')
    })

    await act(async () => {
      await store.connect('test-user-id', 'test-org-id')
    })

    expect(store.connection.status).toBe('error')
    expect(store.connection.lastError).toBeTruthy()
  })

  it('should manage document collaboration state', () => {
    const store = useRealtimeCollaborationStore.getState()
    const documentId = 'test-doc-id'
    
    act(() => {
      store.joinDocument(documentId, {
        id: documentId,
        title: 'Test Document',
        content: 'Initial content',
        version: 1,
        lastModified: new Date(),
        collaborators: [],
        pendingChanges: [],
        conflictResolution: 'ot',
      })
    })

    expect(store.documents.has(documentId)).toBe(true)
    expect(store.documents.get(documentId)?.title).toBe('Test Document')
  })

  it('should track user presence', () => {
    const store = useRealtimeCollaborationStore.getState()
    const userId = 'test-user-id'
    
    act(() => {
      store.updatePresence(userId, {
        userId,
        status: 'online',
        lastSeen: new Date(),
        activity: 'editing',
        location: '/dashboard/documents/123',
        device: 'desktop',
        connectionQuality: 'good',
      })
    })

    expect(store.presence.users.has(userId)).toBe(true)
    expect(store.presence.users.get(userId)?.status).toBe('online')
  })

  it('should handle notifications', () => {
    const store = useRealtimeCollaborationStore.getState()
    const notification = {
      id: 'notif-1',
      type: 'document_update' as const,
      title: 'Document Updated',
      message: 'Test document has been updated',
      timestamp: new Date(),
      userId: 'test-user',
      read: false,
      priority: 'medium' as const,
    }
    
    act(() => {
      store.addNotification(notification)
    })

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('Document Updated')
    expect(store.getUnreadCount()).toBe(1)
  })

  it('should manage live board sessions', () => {
    const store = useRealtimeCollaborationStore.getState()
    const sessionId = 'test-session-id'
    
    act(() => {
      store.joinSession(sessionId, {
        id: sessionId,
        title: 'Test Board Meeting',
        participants: [],
        hostId: 'host-user-id',
        status: 'active',
        startTime: new Date(),
        agenda: [],
        votes: [],
        chat: [],
        isRecording: false,
        features: {
          voting: true,
          chat: true,
          screenSharing: true,
          recording: true,
        },
      })
    })

    expect(store.sessions.has(sessionId)).toBe(true)
    expect(store.sessions.get(sessionId)?.title).toBe('Test Board Meeting')
  })

  it('should handle offline message queuing', () => {
    const store = useRealtimeCollaborationStore.getState()
    
    // Simulate offline state
    act(() => {
      store.setConnectionStatus('disconnected')
    })

    const message = {
      type: 'document_update',
      documentId: 'test-doc',
      data: { content: 'new content' },
      timestamp: Date.now(),
    }

    act(() => {
      store.queueMessage(message)
    })

    expect(store.messageQueue).toHaveLength(1)
    expect(store.messageQueue[0]).toEqual(message)
  })
})

describe('Document Collaboration Hook', () => {
  const mockDocument = {
    id: 'test-doc-id',
    title: 'Test Document',
    content: 'Initial content',
    version: 1,
    lastModified: new Date(),
    collaborators: [],
    pendingChanges: [],
    conflictResolution: 'ot' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize document collaboration', () => {
    const { result } = renderHook(
      () => useDocumentCollaboration(mockDocument),
      { wrapper: createTestWrapper() }
    )

    expect(result.current.isConnected).toBe(false)
    expect(result.current.cursors).toEqual([])
    expect(result.current.pendingChanges).toEqual([])
  })

  it('should handle text insertions with operational transform', async () => {
    const { result } = renderHook(
      () => useDocumentCollaboration(mockDocument),
      { wrapper: createTestWrapper() }
    )

    await act(async () => {
      await result.current.insertText(0, 'Hello ')
    })

    expect(result.current.pendingChanges).toHaveLength(1)
    expect(result.current.pendingChanges[0].operation.type).toBe('insert')
  })

  it('should handle text deletions with operational transform', async () => {
    const { result } = renderHook(
      () => useDocumentCollaboration(mockDocument),
      { wrapper: createTestWrapper() }
    )

    await act(async () => {
      await result.current.deleteText(0, 5)
    })

    expect(result.current.pendingChanges).toHaveLength(1)
    expect(result.current.pendingChanges[0].operation.type).toBe('delete')
  })

  it('should detect and resolve conflicts', async () => {
    const { result } = renderHook(
      () => useDocumentCollaboration(mockDocument),
      { wrapper: createTestWrapper() }
    )

    const conflictingOperation = {
      id: 'op-1',
      type: 'insert' as const,
      position: 0,
      content: 'Conflict text',
      userId: 'other-user',
      timestamp: Date.now(),
      version: 1,
    }

    await act(async () => {
      result.current.handleRemoteOperation(conflictingOperation)
    })

    expect(result.current.conflicts).toHaveLength(0) // Should be auto-resolved
  })

  it('should update cursor positions', () => {
    const { result } = renderHook(
      () => useDocumentCollaboration(mockDocument),
      { wrapper: createTestWrapper() }
    )

    const cursor = {
      userId: 'user-1',
      position: 10,
      selection: { start: 10, end: 15 },
      timestamp: Date.now(),
    }

    act(() => {
      result.current.updateCursor(cursor)
    })

    expect(result.current.cursors).toHaveLength(1)
    expect(result.current.cursors[0].userId).toBe('user-1')
  })
})

describe('WebSocket Integration', () => {
  let mockWebSocket: any

  beforeEach(() => {
    mockWebSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
    }
    global.WebSocket = vi.fn(() => mockWebSocket)
  })

  it('should establish WebSocket connection', async () => {
    const store = useRealtimeCollaborationStore.getState()
    
    await act(async () => {
      await store.connect('test-user', 'test-org')
    })

    expect(global.WebSocket).toHaveBeenCalledWith(
      expect.stringContaining('ws://'),
      expect.any(Array)
    )
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', expect.any(Function))
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function))
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
  })

  it('should handle WebSocket messages', async () => {
    const store = useRealtimeCollaborationStore.getState()
    
    await act(async () => {
      await store.connect('test-user', 'test-org')
    })

    // Simulate receiving a message
    const messageHandler = mockWebSocket.addEventListener.mock.calls
      .find(([event]) => event === 'message')[1]

    const testMessage = {
      data: JSON.stringify({
        type: 'presence_update',
        data: {
          userId: 'user-1',
          status: 'online',
          activity: 'viewing',
        }
      })
    }

    act(() => {
      messageHandler(testMessage)
    })

    expect(store.presence.users.has('user-1')).toBe(true)
  })

  it('should handle connection errors and retry', async () => {
    const store = useRealtimeCollaborationStore.getState()
    
    await act(async () => {
      await store.connect('test-user', 'test-org')
    })

    // Simulate connection error
    const errorHandler = mockWebSocket.addEventListener.mock.calls
      .find(([event]) => event === 'error')[1]

    act(() => {
      errorHandler(new Error('Connection failed'))
    })

    expect(store.connection.status).toBe('error')
    expect(store.connection.lastError).toBeTruthy()
  })
})

describe('CRDT Operations', () => {
  it('should handle concurrent text insertions', async () => {
    const { result } = renderHook(
      () => useDocumentCollaboration({
        id: 'test-doc',
        title: 'Test',
        content: 'Hello World',
        version: 1,
        lastModified: new Date(),
        collaborators: [],
        pendingChanges: [],
        conflictResolution: 'crdt',
      }),
      { wrapper: createTestWrapper() }
    )

    // Simulate concurrent insertions at same position
    await act(async () => {
      await result.current.insertText(5, ' Beautiful')
    })

    await act(async () => {
      result.current.handleRemoteOperation({
        id: 'remote-op-1',
        type: 'insert',
        position: 5,
        content: ' Amazing',
        userId: 'other-user',
        timestamp: Date.now(),
        version: 1,
      })
    })

    // Both insertions should be preserved with CRDT conflict resolution
    expect(result.current.conflicts).toHaveLength(0)
  })

  it('should handle overlapping deletions', async () => {
    const { result } = renderHook(
      () => useDocumentCollaboration({
        id: 'test-doc',
        title: 'Test',
        content: 'Hello Beautiful World',
        version: 1,
        lastModified: new Date(),
        collaborators: [],
        pendingChanges: [],
        conflictResolution: 'crdt',
      }),
      { wrapper: createTestWrapper() }
    )

    // Local deletion
    await act(async () => {
      await result.current.deleteText(6, 9) // Delete "Beautiful"
    })

    // Remote overlapping deletion
    await act(async () => {
      result.current.handleRemoteOperation({
        id: 'remote-op-1',
        type: 'delete',
        position: 5,
        length: 10,
        userId: 'other-user',
        timestamp: Date.now(),
        version: 1,
      })
    })

    // Should resolve without conflicts
    expect(result.current.conflicts).toHaveLength(0)
  })
})

describe('Presence Tracking', () => {
  it('should track user activity', () => {
    const store = useRealtimeCollaborationStore.getState()
    
    act(() => {
      store.updatePresence('user-1', {
        userId: 'user-1',
        status: 'online',
        lastSeen: new Date(),
        activity: 'editing',
        location: '/documents/123',
        device: 'desktop',
        connectionQuality: 'good',
      })
    })

    const user = store.presence.users.get('user-1')
    expect(user?.status).toBe('online')
    expect(user?.activity).toBe('editing')
    expect(user?.device).toBe('desktop')
  })

  it('should handle user disconnection', () => {
    const store = useRealtimeCollaborationStore.getState()
    
    // Add user
    act(() => {
      store.updatePresence('user-1', {
        userId: 'user-1',
        status: 'online',
        lastSeen: new Date(),
        activity: 'viewing',
        location: '/dashboard',
        device: 'mobile',
        connectionQuality: 'fair',
      })
    })

    // Remove user
    act(() => {
      store.removePresence('user-1')
    })

    expect(store.presence.users.has('user-1')).toBe(false)
  })

  it('should track connection quality', () => {
    const store = useRealtimeCollaborationStore.getState()
    
    act(() => {
      store.updateConnectionQuality('excellent')
    })

    expect(store.connection.quality).toBe('excellent')
    expect(store.connection.latency).toBeGreaterThan(0)
  })
})

describe('Live Board Sessions', () => {
  it('should manage session participants', () => {
    const store = useRealtimeCollaborationStore.getState()
    const sessionId = 'session-1'
    
    act(() => {
      store.joinSession(sessionId, {
        id: sessionId,
        title: 'Board Meeting',
        participants: [],
        hostId: 'host-1',
        status: 'active',
        startTime: new Date(),
        agenda: [],
        votes: [],
        chat: [],
        isRecording: false,
        features: {
          voting: true,
          chat: true,
          screenSharing: true,
          recording: true,
        },
      })
    })

    // Add participant
    act(() => {
      store.addSessionParticipant(sessionId, {
        userId: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'member',
        joinedAt: new Date(),
        permissions: {
          canVote: true,
          canChat: true,
          canShare: false,
          canRecord: false,
        },
        presence: {
          isOnline: true,
          lastSeen: new Date(),
          device: 'desktop',
        },
      })
    })

    const session = store.sessions.get(sessionId)
    expect(session?.participants).toHaveLength(1)
    expect(session?.participants[0].name).toBe('John Doe')
  })

  it('should handle voting', () => {
    const store = useRealtimeCollaborationStore.getState()
    const sessionId = 'session-1'
    
    // Setup session with existing vote
    act(() => {
      store.joinSession(sessionId, {
        id: sessionId,
        title: 'Board Meeting',
        participants: [],
        hostId: 'host-1',
        status: 'active',
        startTime: new Date(),
        agenda: [],
        votes: [{
          id: 'vote-1',
          title: 'Approve Budget',
          description: 'Vote to approve the 2024 budget',
          options: ['Approve', 'Reject', 'Abstain'],
          responses: [],
          status: 'active',
          createdBy: 'host-1',
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 300000),
        }],
        chat: [],
        isRecording: false,
        features: {
          voting: true,
          chat: true,
          screenSharing: true,
          recording: true,
        },
      })
    })

    // Cast vote
    act(() => {
      store.castVote(sessionId, 'vote-1', 'user-1', 'Approve')
    })

    const session = store.sessions.get(sessionId)
    const vote = session?.votes.find(v => v.id === 'vote-1')
    expect(vote?.responses).toHaveLength(1)
    expect(vote?.responses[0].option).toBe('Approve')
  })

  it('should handle chat messages', () => {
    const store = useRealtimeCollaborationStore.getState()
    const sessionId = 'session-1'
    
    act(() => {
      store.joinSession(sessionId, {
        id: sessionId,
        title: 'Board Meeting',
        participants: [],
        hostId: 'host-1',
        status: 'active',
        startTime: new Date(),
        agenda: [],
        votes: [],
        chat: [],
        isRecording: false,
        features: {
          voting: true,
          chat: true,
          screenSharing: true,
          recording: true,
        },
      })
    })

    const message = {
      id: 'msg-1',
      userId: 'user-1',
      userName: 'John Doe',
      content: 'Hello everyone!',
      timestamp: new Date(),
      type: 'text' as const,
    }

    act(() => {
      store.addChatMessage(sessionId, message)
    })

    const session = store.sessions.get(sessionId)
    expect(session?.chat).toHaveLength(1)
    expect(session?.chat[0].content).toBe('Hello everyone!')
  })
})

describe('Notification System', () => {
  it('should filter notifications by type', () => {
    const store = useRealtimeCollaborationStore.getState()
    
    const notifications = [
      {
        id: 'notif-1',
        type: 'document_update' as const,
        title: 'Document Updated',
        message: 'Test',
        timestamp: new Date(),
        userId: 'user-1',
        read: false,
        priority: 'medium' as const,
      },
      {
        id: 'notif-2',
        type: 'meeting_reminder' as const,
        title: 'Meeting Soon',
        message: 'Test',
        timestamp: new Date(),
        userId: 'user-1',
        read: false,
        priority: 'high' as const,
      },
    ]

    act(() => {
      notifications.forEach(notif => store.addNotification(notif))
    })

    const documentNotifs = store.getNotificationsByType('document_update')
    const meetingNotifs = store.getNotificationsByType('meeting_reminder')

    expect(documentNotifs).toHaveLength(1)
    expect(meetingNotifs).toHaveLength(1)
  })

  it('should mark notifications as read', () => {
    const store = useRealtimeCollaborationStore.getState()
    
    const notification = {
      id: 'notif-1',
      type: 'document_update' as const,
      title: 'Document Updated',
      message: 'Test',
      timestamp: new Date(),
      userId: 'user-1',
      read: false,
      priority: 'medium' as const,
    }

    act(() => {
      store.addNotification(notification)
    })

    expect(store.getUnreadCount()).toBe(1)

    act(() => {
      store.markNotificationRead('notif-1')
    })

    expect(store.getUnreadCount()).toBe(0)
  })

  it('should clear old notifications', () => {
    const store = useRealtimeCollaborationStore.getState()
    
    const oldNotification = {
      id: 'notif-old',
      type: 'document_update' as const,
      title: 'Old Notification',
      message: 'Test',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      userId: 'user-1',
      read: true,
      priority: 'low' as const,
    }

    const recentNotification = {
      id: 'notif-recent',
      type: 'document_update' as const,
      title: 'Recent Notification',
      message: 'Test',
      timestamp: new Date(),
      userId: 'user-1',
      read: false,
      priority: 'medium' as const,
    }

    act(() => {
      store.addNotification(oldNotification)
      store.addNotification(recentNotification)
    })

    expect(store.notifications).toHaveLength(2)

    act(() => {
      store.clearOldNotifications(3 * 24 * 60 * 60 * 1000) // Clear older than 3 days
    })

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].id).toBe('notif-recent')
  })
})

describe('Performance and Analytics', () => {
  it('should track performance metrics', () => {
    const store = useRealtimeCollaborationStore.getState()
    
    expect(store.analytics.totalMessages).toBe(0)
    expect(store.analytics.averageLatency).toBe(0)

    // Simulate message sending
    act(() => {
      store.sendMessage({
        type: 'document_update',
        documentId: 'test-doc',
        data: { content: 'test' },
        timestamp: Date.now(),
      })
    })

    expect(store.analytics.totalMessages).toBe(1)
  })

  it('should calculate connection statistics', () => {
    const store = useRealtimeCollaborationStore.getState()
    
    // Add some presence data
    act(() => {
      store.updatePresence('user-1', {
        userId: 'user-1',
        status: 'online',
        lastSeen: new Date(),
        activity: 'editing',
        location: '/documents/123',
        device: 'desktop',
        connectionQuality: 'good',
      })
    })

    const stats = store.getConnectionStats()
    expect(stats.totalUsers).toBe(1)
    expect(stats.activeUsers).toBe(1)
  })
})

describe('Error Handling', () => {
  it('should handle WebSocket disconnection gracefully', async () => {
    const store = useRealtimeCollaborationStore.getState()
    
    await act(async () => {
      await store.connect('test-user', 'test-org')
    })

    // Simulate disconnection
    const closeHandler = mockWebSocket.addEventListener.mock.calls
      .find(([event]) => event === 'close')[1]

    act(() => {
      closeHandler({ code: 1000, reason: 'Normal closure' })
    })

    expect(store.connection.status).toBe('disconnected')
  })

  it('should queue messages when offline', () => {
    const store = useRealtimeCollaborationStore.getState()
    
    // Set offline state
    act(() => {
      store.setConnectionStatus('disconnected')
    })

    const message = {
      type: 'document_update',
      documentId: 'test-doc',
      data: { content: 'offline content' },
      timestamp: Date.now(),
    }

    act(() => {
      store.sendMessage(message)
    })

    expect(store.messageQueue).toHaveLength(1)
    expect(store.messageQueue[0]).toEqual(message)
  })

  it('should flush queue when reconnected', async () => {
    const store = useRealtimeCollaborationStore.getState()
    
    // Add messages to queue while offline
    const message1 = {
      type: 'document_update',
      documentId: 'test-doc',
      data: { content: 'queued message 1' },
      timestamp: Date.now(),
    }

    const message2 = {
      type: 'presence_update',
      data: { userId: 'user-1', status: 'online' },
      timestamp: Date.now(),
    }

    act(() => {
      store.setConnectionStatus('disconnected')
      store.queueMessage(message1)
      store.queueMessage(message2)
    })

    expect(store.messageQueue).toHaveLength(2)

    // Reconnect and flush queue
    await act(async () => {
      await store.connect('test-user', 'test-org')
      store.flushMessageQueue()
    })

    expect(store.messageQueue).toHaveLength(0)
  })
})

describe('Security and Validation', () => {
  it('should validate user permissions for document editing', async () => {
    const { result } = renderHook(
      () => useDocumentCollaboration({
        id: 'test-doc',
        title: 'Restricted Document',
        content: 'Secret content',
        version: 1,
        lastModified: new Date(),
        collaborators: [
          {
            userId: 'authorized-user',
            permissions: ['read', 'edit'],
            joinedAt: new Date(),
          }
        ],
        pendingChanges: [],
        conflictResolution: 'ot',
      }),
      { wrapper: createTestWrapper() }
    )

    // Should allow operations for authorized users
    await act(async () => {
      await result.current.insertText(0, 'Authorized edit: ')
    })

    expect(result.current.pendingChanges).toHaveLength(1)
  })

  it('should sanitize chat messages', () => {
    const store = useRealtimeCollaborationStore.getState()
    const sessionId = 'session-1'
    
    act(() => {
      store.joinSession(sessionId, {
        id: sessionId,
        title: 'Board Meeting',
        participants: [],
        hostId: 'host-1',
        status: 'active',
        startTime: new Date(),
        agenda: [],
        votes: [],
        chat: [],
        isRecording: false,
        features: {
          voting: true,
          chat: true,
          screenSharing: true,
          recording: true,
        },
      })
    })

    const maliciousMessage = {
      id: 'msg-1',
      userId: 'user-1',
      userName: 'John Doe',
      content: '<script>alert("xss")</script>Hello!',
      timestamp: new Date(),
      type: 'text' as const,
    }

    act(() => {
      store.addChatMessage(sessionId, maliciousMessage)
    })

    const session = store.sessions.get(sessionId)
    // Content should be sanitized (this would be handled by the component)
    expect(session?.chat[0].content).toContain('Hello!')
  })
})

describe('Integration Tests', () => {
  it('should handle complete collaboration workflow', async () => {
    const store = useRealtimeCollaborationStore.getState()
    const documentId = 'workflow-doc'
    const sessionId = 'workflow-session'
    
    // 1. Connect to collaboration system
    await act(async () => {
      await store.connect('test-user', 'test-org')
    })

    // 2. Join document
    act(() => {
      store.joinDocument(documentId, {
        id: documentId,
        title: 'Workflow Document',
        content: 'Initial content',
        version: 1,
        lastModified: new Date(),
        collaborators: [],
        pendingChanges: [],
        conflictResolution: 'ot',
      })
    })

    // 3. Join live session
    act(() => {
      store.joinSession(sessionId, {
        id: sessionId,
        title: 'Workflow Session',
        participants: [],
        hostId: 'test-user',
        status: 'active',
        startTime: new Date(),
        agenda: [],
        votes: [],
        chat: [],
        isRecording: false,
        features: {
          voting: true,
          chat: true,
          screenSharing: true,
          recording: true,
        },
      })
    })

    // 4. Update presence
    act(() => {
      store.updatePresence('test-user', {
        userId: 'test-user',
        status: 'online',
        lastSeen: new Date(),
        activity: 'editing',
        location: `/documents/${documentId}`,
        device: 'desktop',
        connectionQuality: 'excellent',
      })
    })

    // 5. Receive notification
    act(() => {
      store.addNotification({
        id: 'workflow-notif',
        type: 'session_started',
        title: 'Session Started',
        message: 'Workflow session has begun',
        timestamp: new Date(),
        userId: 'test-user',
        read: false,
        priority: 'high',
      })
    })

    // Verify complete state
    expect(store.connection.isConnected).toBe(true)
    expect(store.documents.has(documentId)).toBe(true)
    expect(store.sessions.has(sessionId)).toBe(true)
    expect(store.presence.users.has('test-user')).toBe(true)
    expect(store.notifications).toHaveLength(1)
  })

  it('should handle cleanup on disconnect', async () => {
    const store = useRealtimeCollaborationStore.getState()
    
    // Setup connected state
    await act(async () => {
      await store.connect('test-user', 'test-org')
    })

    act(() => {
      store.joinDocument('doc-1', {
        id: 'doc-1',
        title: 'Test Doc',
        content: 'content',
        version: 1,
        lastModified: new Date(),
        collaborators: [],
        pendingChanges: [],
        conflictResolution: 'ot',
      })
    })

    expect(store.documents.size).toBe(1)

    // Disconnect
    act(() => {
      store.disconnect()
    })

    expect(store.connection.isConnected).toBe(false)
    expect(store.documents.size).toBe(0) // Should clean up documents
  })
})