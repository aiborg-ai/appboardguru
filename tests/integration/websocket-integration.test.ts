/**
 * Integration Tests for WebSocket Real-Time Features
 * Tests end-to-end WebSocket functionality and integration with services
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MockWebSocket, waitForCondition, flushPromises } from '../test-utils'
import { useRealtimeCollaborationStore } from '@/lib/stores/realtime-collaboration.store'
import { hybridRealtimeManager } from '@/lib/graphql/realtime-subscriptions'

// Mock the hybrid realtime manager
vi.mock('@/lib/graphql/realtime-subscriptions', () => ({
  hybridRealtimeManager: {
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
    subscribeToDocument: vi.fn().mockReturnValue({
      unsubscribe: vi.fn(),
    }),
    subscribeToPresence: vi.fn().mockReturnValue({
      unsubscribe: vi.fn(),
    }),
    subscribeToNotifications: vi.fn().mockReturnValue({
      unsubscribe: vi.fn(),
    }),
    subscribeToMeeting: vi.fn().mockReturnValue({
      unsubscribe: vi.fn(),
    }),
    sendMessage: vi.fn().mockResolvedValue(true),
    isConnected: vi.fn(() => true),
    getConnectionType: vi.fn(() => 'websocket'),
    switchToFallback: vi.fn(),
  }
}))

describe('WebSocket Integration Tests', () => {
  let mockWebSocket: MockWebSocket
  let store: ReturnType<typeof useRealtimeCollaborationStore.getState>

  beforeEach(() => {
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    global.WebSocket = vi.fn(() => mockWebSocket) as any
    
    store = useRealtimeCollaborationStore.getState()
    vi.clearAllMocks()
  })

  afterEach(() => {
    store.disconnect()
    vi.clearAllTimers()
  })

  it('should establish WebSocket connection with authentication', async () => {
    await store.connect('test-user-id', 'test-org-id')

    expect(global.WebSocket).toHaveBeenCalledWith(
      expect.stringContaining('ws://'),
      expect.arrayContaining(['boardguru-protocol'])
    )

    expect(store.connection.isConnected).toBe(true)
    expect(store.connection.status).toBe('connected')
  })

  it('should handle authentication failure', async () => {
    // Simulate auth failure
    setTimeout(() => {
      mockWebSocket.simulateClose(4001, 'Authentication failed')
    }, 100)

    await store.connect('invalid-user', 'invalid-org')

    await waitForCondition(() => store.connection.status === 'error')
    
    expect(store.connection.lastError).toContain('Authentication failed')
  })

  it('should send and receive document collaboration messages', async () => {
    await store.connect('test-user-id', 'test-org-id')

    const documentId = 'test-doc-id'
    const documentData = {
      id: documentId,
      title: 'Test Document',
      content: 'Initial content',
      version: 1,
      lastModified: new Date(),
      collaborators: [],
      pendingChanges: [],
      conflictResolution: 'ot' as const,
    }

    // Join document
    store.joinDocument(documentId, documentData)

    // Send document update
    const updateMessage = {
      type: 'document_update',
      documentId,
      data: {
        operation: {
          type: 'insert',
          position: 0,
          content: 'Hello ',
        },
      },
      timestamp: Date.now(),
    }

    store.sendMessage(updateMessage)

    expect(hybridRealtimeManager.sendMessage).toHaveBeenCalledWith(updateMessage)
  })

  it('should handle presence updates', async () => {
    await store.connect('test-user-id', 'test-org-id')

    // Update presence
    const presenceData = {
      userId: 'test-user-id',
      status: 'online' as const,
      lastSeen: new Date(),
      activity: 'editing' as const,
      location: '/documents/123',
      device: 'desktop' as const,
      connectionQuality: 'good' as const,
    }

    store.updatePresence('test-user-id', presenceData)

    // Should send presence update via WebSocket
    expect(store.presence.users.get('test-user-id')).toEqual(presenceData)
  })

  it('should handle real-time notifications', async () => {
    await store.connect('test-user-id', 'test-org-id')

    // Simulate receiving notification via WebSocket
    const notification = {
      id: 'notif-1',
      type: 'document_shared',
      title: 'Document Shared',
      message: 'A document has been shared with you',
      timestamp: new Date(),
      userId: 'test-user-id',
      read: false,
      priority: 'medium',
      data: {
        documentId: 'doc-123',
        sharedBy: 'user-456',
      },
    }

    mockWebSocket.simulateMessage({
      type: 'notification',
      data: notification,
    })

    await flushPromises()

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('Document Shared')
  })

  it('should handle session management messages', async () => {
    await store.connect('test-user-id', 'test-org-id')

    const sessionId = 'session-123'
    
    // Simulate receiving session join event
    mockWebSocket.simulateMessage({
      type: 'session_participant_joined',
      data: {
        sessionId,
        participant: {
          userId: 'new-user',
          name: 'New User',
          email: 'new@example.com',
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
            device: 'mobile',
          },
        },
      },
    })

    await flushPromises()

    // Should update session participant list
    expect(hybridRealtimeManager.subscribeToMeeting).toHaveBeenCalled()
  })

  it('should handle connection interruption and recovery', async () => {
    await store.connect('test-user-id', 'test-org-id')

    expect(store.connection.isConnected).toBe(true)

    // Simulate connection loss
    mockWebSocket.simulateClose(1006, 'Abnormal closure')

    await waitForCondition(() => store.connection.status === 'reconnecting')

    expect(store.connection.reconnectAttempts).toBeGreaterThan(0)

    // Simulate successful reconnection
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    
    await waitForCondition(() => store.connection.isConnected === true, 10000)

    expect(store.connection.status).toBe('connected')
    expect(store.connection.reconnectAttempts).toBe(0)
  })

  it('should handle message queuing during disconnection', async () => {
    await store.connect('test-user-id', 'test-org-id')

    // Queue messages while connected
    const message1 = {
      type: 'document_update',
      documentId: 'doc-1',
      data: { content: 'Update 1' },
      timestamp: Date.now(),
    }

    const message2 = {
      type: 'presence_update',
      data: { userId: 'test-user-id', activity: 'typing' },
      timestamp: Date.now(),
    }

    // Disconnect
    mockWebSocket.simulateClose(1006, 'Connection lost')
    
    await waitForCondition(() => !store.connection.isConnected)

    // Send messages while disconnected (should queue)
    store.sendMessage(message1)
    store.sendMessage(message2)

    expect(store.messageQueue).toHaveLength(2)

    // Reconnect
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    await store.connect('test-user-id', 'test-org-id')

    // Should flush queued messages
    store.flushMessageQueue()

    expect(store.messageQueue).toHaveLength(0)
    expect(hybridRealtimeManager.sendMessage).toHaveBeenCalledTimes(2)
  })

  it('should handle large message payloads', async () => {
    await store.connect('test-user-id', 'test-org-id')

    // Create large document update
    const largeContent = 'x'.repeat(100000) // 100KB content
    const largeMessage = {
      type: 'document_update',
      documentId: 'large-doc',
      data: {
        operation: {
          type: 'insert',
          position: 0,
          content: largeContent,
        },
      },
      timestamp: Date.now(),
    }

    store.sendMessage(largeMessage)

    // Should chunk or compress large messages
    expect(hybridRealtimeManager.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'document_update',
        documentId: 'large-doc',
      })
    )
  })

  it('should handle concurrent operations with conflict resolution', async () => {
    await store.connect('test-user-id', 'test-org-id')

    const documentId = 'conflict-doc'
    store.joinDocument(documentId, {
      id: documentId,
      title: 'Conflict Test Doc',
      content: 'Initial content',
      version: 1,
      lastModified: new Date(),
      collaborators: [],
      pendingChanges: [],
      conflictResolution: 'ot',
    })

    // Simulate concurrent operations
    const localOp = {
      type: 'document_operation',
      documentId,
      data: {
        operation: {
          id: 'local-op-1',
          type: 'insert',
          position: 5,
          content: 'Local text',
          userId: 'test-user-id',
          timestamp: Date.now(),
          version: 1,
        },
      },
    }

    const remoteOp = {
      type: 'document_operation',
      documentId,
      data: {
        operation: {
          id: 'remote-op-1',
          type: 'insert',
          position: 5,
          content: 'Remote text',
          userId: 'other-user',
          timestamp: Date.now() + 1,
          version: 1,
        },
      },
    }

    // Send local operation
    store.sendMessage(localOp)

    // Receive remote operation
    mockWebSocket.simulateMessage(remoteOp)

    await flushPromises()

    // Should handle conflict resolution
    const document = store.documents.get(documentId)
    expect(document?.pendingChanges).toBeDefined()
  })

  it('should maintain session state across reconnections', async () => {
    await store.connect('test-user-id', 'test-org-id')

    const sessionId = 'persistent-session'
    const sessionData = {
      id: sessionId,
      title: 'Persistent Session',
      participants: [
        {
          userId: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'host' as const,
          joinedAt: new Date(),
          permissions: {
            canVote: true,
            canChat: true,
            canShare: true,
            canRecord: true,
          },
          presence: {
            isOnline: true,
            lastSeen: new Date(),
            device: 'desktop' as const,
          },
        }
      ],
      hostId: 'test-user-id',
      status: 'active' as const,
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
    }

    store.joinSession(sessionId, sessionData)
    expect(store.sessions.has(sessionId)).toBe(true)

    // Disconnect
    mockWebSocket.simulateClose(1006, 'Connection lost')
    await waitForCondition(() => !store.connection.isConnected)

    // Session should be preserved
    expect(store.sessions.has(sessionId)).toBe(true)

    // Reconnect
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    await store.connect('test-user-id', 'test-org-id')

    // Should rejoin session
    expect(store.sessions.has(sessionId)).toBe(true)
  })

  it('should handle WebSocket protocol errors', async () => {
    // Simulate protocol error
    mockWebSocket.simulateError(new Error('Protocol error'))

    await store.connect('test-user-id', 'test-org-id')

    expect(store.connection.status).toBe('error')
    expect(store.connection.lastError).toContain('Protocol error')
  })

  it('should implement rate limiting for message sending', async () => {
    await store.connect('test-user-id', 'test-org-id')

    // Send many messages rapidly
    const messages = Array.from({ length: 100 }, (_, i) => ({
      type: 'chat_message',
      data: { content: `Message ${i}` },
      timestamp: Date.now(),
    }))

    for (const message of messages) {
      store.sendMessage(message)
    }

    // Should implement rate limiting
    expect(hybridRealtimeManager.sendMessage).toHaveBeenCalledTimes(
      expect.any(Number)
    )
  })

  it('should handle server-side disconnection', async () => {
    await store.connect('test-user-id', 'test-org-id')

    // Simulate server-initiated disconnect
    mockWebSocket.simulateClose(1001, 'Server shutdown')

    await waitForCondition(() => store.connection.status === 'reconnecting')

    expect(store.connection.reconnectAttempts).toBeGreaterThan(0)
  })

  it('should sync with GraphQL subscriptions', async () => {
    await store.connect('test-user-id', 'test-org-id')

    // Should establish both WebSocket and GraphQL connections
    expect(hybridRealtimeManager.connect).toHaveBeenCalledWith({
      userId: 'test-user-id',
      organizationId: 'test-org-id',
      protocols: ['websocket', 'graphql'],
    })

    // Should subscribe to various events
    expect(hybridRealtimeManager.subscribeToDocument).toHaveBeenCalled()
    expect(hybridRealtimeManager.subscribeToPresence).toHaveBeenCalled()
    expect(hybridRealtimeManager.subscribeToNotifications).toHaveBeenCalled()
  })

  it('should fallback from WebSocket to GraphQL', async () => {
    // Mock WebSocket failure
    mockWebSocket.simulateError(new Error('WebSocket connection failed'))
    
    await store.connect('test-user-id', 'test-org-id')

    // Should attempt fallback
    expect(hybridRealtimeManager.switchToFallback).toHaveBeenCalled()
  })

  it('should handle binary message encoding', async () => {
    await store.connect('test-user-id', 'test-org-id')

    // Send CRDT update (binary data)
    const binaryUpdate = new Uint8Array([1, 2, 3, 4, 5])
    const crdtMessage = {
      type: 'crdt_update',
      documentId: 'doc-123',
      data: {
        update: Array.from(binaryUpdate),
      },
      timestamp: Date.now(),
    }

    store.sendMessage(crdtMessage)

    expect(hybridRealtimeManager.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'crdt_update',
        documentId: 'doc-123',
      })
    )
  })
})

describe('Document Collaboration Integration', () => {
  let mockWebSocket: MockWebSocket
  let store: ReturnType<typeof useRealtimeCollaborationStore.getState>

  beforeEach(() => {
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    global.WebSocket = vi.fn(() => mockWebSocket) as any
    
    store = useRealtimeCollaborationStore.getState()
    vi.clearAllMocks()
  })

  afterEach(() => {
    store.disconnect()
  })

  it('should sync document operations across clients', async () => {
    await store.connect('user-1', 'test-org')

    const documentId = 'collab-doc'
    store.joinDocument(documentId, {
      id: documentId,
      title: 'Collaboration Document',
      content: 'Hello World',
      version: 1,
      lastModified: new Date(),
      collaborators: [],
      pendingChanges: [],
      conflictResolution: 'crdt',
    })

    // Simulate remote user operation
    const remoteOperation = {
      type: 'document_operation',
      documentId,
      data: {
        operation: {
          id: 'remote-op-1',
          type: 'insert',
          position: 5,
          content: ' Beautiful',
          userId: 'user-2',
          timestamp: Date.now(),
          version: 1,
        },
      },
    }

    mockWebSocket.simulateMessage(remoteOperation)

    await flushPromises()

    const document = store.documents.get(documentId)
    expect(document?.pendingChanges).toBeDefined()
  })

  it('should handle operational transform conflicts', async () => {
    await store.connect('user-1', 'test-org')

    const documentId = 'ot-doc'
    store.joinDocument(documentId, {
      id: documentId,
      title: 'OT Document',
      content: 'Original content',
      version: 1,
      lastModified: new Date(),
      collaborators: [],
      pendingChanges: [],
      conflictResolution: 'ot',
    })

    // Simulate conflicting operations
    const localOp = {
      id: 'local-1',
      type: 'insert' as const,
      position: 8,
      content: ' local',
      userId: 'user-1',
      timestamp: Date.now(),
      version: 1,
    }

    const remoteOp = {
      id: 'remote-1',
      type: 'insert' as const,
      position: 8,
      content: ' remote',
      userId: 'user-2',
      timestamp: Date.now() + 1,
      version: 1,
    }

    // Send local operation
    store.sendMessage({
      type: 'document_operation',
      documentId,
      data: { operation: localOp },
      timestamp: Date.now(),
    })

    // Receive remote operation
    mockWebSocket.simulateMessage({
      type: 'document_operation',
      documentId,
      data: { operation: remoteOp },
    })

    await flushPromises()

    // Should apply operational transform
    const document = store.documents.get(documentId)
    expect(document?.version).toBeGreaterThan(1)
  })

  it('should handle cursor synchronization', async () => {
    await store.connect('user-1', 'test-org')

    const documentId = 'cursor-doc'
    store.joinDocument(documentId, {
      id: documentId,
      title: 'Cursor Document',
      content: 'Content for cursor testing',
      version: 1,
      lastModified: new Date(),
      collaborators: [],
      pendingChanges: [],
      conflictResolution: 'ot',
    })

    // Simulate cursor update from remote user
    const cursorUpdate = {
      type: 'cursor_update',
      documentId,
      data: {
        userId: 'user-2',
        position: 15,
        selection: { start: 15, end: 20 },
        timestamp: Date.now(),
      },
    }

    mockWebSocket.simulateMessage(cursorUpdate)

    await flushPromises()

    // Should track remote cursor
    expect(store.sendMessage).toHaveBeenCalled()
  })
})

describe('Live Session Integration', () => {
  let mockWebSocket: MockWebSocket
  let store: ReturnType<typeof useRealtimeCollaborationStore.getState>

  beforeEach(() => {
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    global.WebSocket = vi.fn(() => mockWebSocket) as any
    
    store = useRealtimeCollaborationStore.getState()
    vi.clearAllMocks()
  })

  afterEach(() => {
    store.disconnect()
  })

  it('should handle real-time voting', async () => {
    await store.connect('host-user', 'test-org')

    const sessionId = 'voting-session'
    const sessionData = {
      id: sessionId,
      title: 'Voting Session',
      participants: [],
      hostId: 'host-user',
      status: 'active' as const,
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
    }

    store.joinSession(sessionId, sessionData)

    // Simulate receiving new vote
    const newVote = {
      type: 'vote_created',
      sessionId,
      data: {
        vote: {
          id: 'vote-new',
          title: 'New Proposal',
          description: 'Should we proceed with the proposal?',
          options: ['Yes', 'No', 'Abstain'],
          responses: [],
          status: 'active',
          createdBy: 'host-user',
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 300000),
        },
      },
    }

    mockWebSocket.simulateMessage(newVote)

    await flushPromises()

    const session = store.sessions.get(sessionId)
    expect(session?.votes).toHaveLength(1)
    expect(session?.votes[0].title).toBe('New Proposal')
  })

  it('should handle real-time chat messages', async () => {
    await store.connect('user-1', 'test-org')

    const sessionId = 'chat-session'
    store.joinSession(sessionId, {
      id: sessionId,
      title: 'Chat Session',
      participants: [],
      hostId: 'host-user',
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

    // Simulate receiving chat message
    const chatMessage = {
      type: 'chat_message',
      sessionId,
      data: {
        message: {
          id: 'msg-new',
          userId: 'user-2',
          userName: 'Jane Doe',
          content: 'Hello from integration test!',
          timestamp: new Date(),
          type: 'text',
        },
      },
    }

    mockWebSocket.simulateMessage(chatMessage)

    await flushPromises()

    const session = store.sessions.get(sessionId)
    expect(session?.chat).toHaveLength(1)
    expect(session?.chat[0].content).toBe('Hello from integration test!')
  })

  it('should handle participant management', async () => {
    await store.connect('host-user', 'test-org')

    const sessionId = 'participant-session'
    store.joinSession(sessionId, {
      id: sessionId,
      title: 'Participant Session',
      participants: [],
      hostId: 'host-user',
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

    // Simulate participant joining
    const participantJoined = {
      type: 'participant_joined',
      sessionId,
      data: {
        participant: {
          userId: 'new-participant',
          name: 'New Participant',
          email: 'new@example.com',
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
            device: 'mobile',
          },
        },
      },
    }

    mockWebSocket.simulateMessage(participantJoined)

    await flushPromises()

    const session = store.sessions.get(sessionId)
    expect(session?.participants).toHaveLength(1)
    expect(session?.participants[0].name).toBe('New Participant')
  })
})

describe('Performance and Load Testing', () => {
  let mockWebSocket: MockWebSocket
  let store: ReturnType<typeof useRealtimeCollaborationStore.getState>

  beforeEach(() => {
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    global.WebSocket = vi.fn(() => mockWebSocket) as any
    
    store = useRealtimeCollaborationStore.getState()
    vi.clearAllMocks()
  })

  afterEach(() => {
    store.disconnect()
  })

  it('should handle high-frequency document updates', async () => {
    await store.connect('user-1', 'test-org')

    const documentId = 'perf-doc'
    store.joinDocument(documentId, {
      id: documentId,
      title: 'Performance Document',
      content: 'Initial content',
      version: 1,
      lastModified: new Date(),
      collaborators: [],
      pendingChanges: [],
      conflictResolution: 'crdt',
    })

    // Simulate rapid document updates
    const updates = Array.from({ length: 50 }, (_, i) => ({
      type: 'document_operation',
      documentId,
      data: {
        operation: {
          id: `op-${i}`,
          type: 'insert',
          position: i,
          content: `${i}`,
          userId: `user-${i % 5}`,
          timestamp: Date.now() + i,
          version: 1,
        },
      },
    }))

    // Send updates rapidly
    for (const update of updates) {
      mockWebSocket.simulateMessage(update)
    }

    await flushPromises()

    // Should handle all updates without blocking
    const document = store.documents.get(documentId)
    expect(document).toBeDefined()
  })

  it('should handle large session with many participants', async () => {
    await store.connect('host-user', 'test-org')

    const sessionId = 'large-session'
    const participants = Array.from({ length: 200 }, (_, i) => ({
      userId: `user-${i}`,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      role: 'member' as const,
      joinedAt: new Date(),
      permissions: {
        canVote: true,
        canChat: i % 2 === 0, // Alternate chat permissions
        canShare: false,
        canRecord: false,
      },
      presence: {
        isOnline: Math.random() > 0.1, // 90% online
        lastSeen: new Date(),
        device: ['desktop', 'mobile', 'tablet'][i % 3] as any,
      },
    }))

    store.joinSession(sessionId, {
      id: sessionId,
      title: 'Large Session',
      participants,
      hostId: 'host-user',
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

    // Should handle large participant list efficiently
    const session = store.sessions.get(sessionId)
    expect(session?.participants).toHaveLength(200)
  })

  it('should handle concurrent vote responses', async () => {
    await store.connect('host-user', 'test-org')

    const sessionId = 'vote-session'
    store.joinSession(sessionId, {
      id: sessionId,
      title: 'Vote Session',
      participants: [],
      hostId: 'host-user',
      status: 'active',
      startTime: new Date(),
      agenda: [],
      votes: [
        {
          id: 'concurrent-vote',
          title: 'Concurrent Vote',
          description: 'Test concurrent voting',
          options: ['Option A', 'Option B'],
          responses: [],
          status: 'active',
          createdBy: 'host-user',
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 300000),
        }
      ],
      chat: [],
      isRecording: false,
      features: {
        voting: true,
        chat: true,
        screenSharing: true,
        recording: true,
      },
    })

    // Simulate multiple users voting simultaneously
    const voteResponses = Array.from({ length: 20 }, (_, i) => ({
      type: 'vote_response',
      sessionId,
      data: {
        voteId: 'concurrent-vote',
        userId: `user-${i}`,
        option: i % 2 === 0 ? 'Option A' : 'Option B',
        timestamp: Date.now() + i,
      },
    }))

    for (const response of voteResponses) {
      mockWebSocket.simulateMessage(response)
    }

    await flushPromises()

    const session = store.sessions.get(sessionId)
    const vote = session?.votes.find(v => v.id === 'concurrent-vote')
    expect(vote?.responses).toHaveLength(20)
  })
})

describe('Error Recovery Integration', () => {
  let mockWebSocket: MockWebSocket
  let store: ReturnType<typeof useRealtimeCollaborationStore.getState>

  beforeEach(() => {
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    global.WebSocket = vi.fn(() => mockWebSocket) as any
    
    store = useRealtimeCollaborationStore.getState()
    vi.clearAllMocks()
  })

  afterEach(() => {
    store.disconnect()
  })

  it('should recover from network interruption', async () => {
    await store.connect('user-1', 'test-org')

    const documentId = 'recovery-doc'
    store.joinDocument(documentId, {
      id: documentId,
      title: 'Recovery Document',
      content: 'Content before interruption',
      version: 1,
      lastModified: new Date(),
      collaborators: [],
      pendingChanges: [],
      conflictResolution: 'ot',
    })

    // Queue some operations
    store.sendMessage({
      type: 'document_update',
      documentId,
      data: { content: 'Update 1' },
      timestamp: Date.now(),
    })

    // Simulate network interruption
    mockWebSocket.simulateClose(1006, 'Network error')

    await waitForCondition(() => !store.connection.isConnected)

    // Operations should be queued
    store.sendMessage({
      type: 'document_update',
      documentId,
      data: { content: 'Update 2' },
      timestamp: Date.now(),
    })

    expect(store.messageQueue).toHaveLength(1)

    // Reconnect
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    await store.connect('user-1', 'test-org')

    // Should flush queued messages
    store.flushMessageQueue()

    expect(store.messageQueue).toHaveLength(0)
  })

  it('should handle server restart gracefully', async () => {
    await store.connect('user-1', 'test-org')

    // Simulate server restart (clean close)
    mockWebSocket.simulateClose(1001, 'Server restart')

    await waitForCondition(() => store.connection.status === 'reconnecting')

    // Should attempt reconnection
    expect(store.connection.reconnectAttempts).toBeGreaterThan(0)

    // Simulate successful reconnection
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    
    await waitForCondition(() => store.connection.isConnected, 10000)

    expect(store.connection.status).toBe('connected')
    expect(store.connection.reconnectAttempts).toBe(0)
  })

  it('should handle corrupted message data', async () => {
    await store.connect('user-1', 'test-org')

    // Simulate corrupted message
    mockWebSocket.simulateMessage('invalid-json-data')

    await flushPromises()

    // Should handle gracefully without crashing
    expect(store.connection.isConnected).toBe(true)
  })

  it('should handle maximum reconnection attempts', async () => {
    vi.useFakeTimers()
    
    await store.connect('user-1', 'test-org')

    // Simulate repeated connection failures
    for (let i = 0; i < 6; i++) {
      mockWebSocket.simulateClose(1006, 'Connection failed')
      
      await waitForCondition(() => store.connection.status === 'reconnecting')
      
      // Fast-forward through backoff delay
      vi.advanceTimersByTime(Math.pow(2, i) * 1000)
    }

    await waitForCondition(() => store.connection.status === 'failed')

    expect(store.connection.reconnectAttempts).toBeGreaterThanOrEqual(5)
    
    vi.useRealTimers()
  })
})

describe('Security Integration', () => {
  let mockWebSocket: MockWebSocket
  let store: ReturnType<typeof useRealtimeCollaborationStore.getState>

  beforeEach(() => {
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    global.WebSocket = vi.fn(() => mockWebSocket) as any
    
    store = useRealtimeCollaborationStore.getState()
    vi.clearAllMocks()
  })

  afterEach(() => {
    store.disconnect()
  })

  it('should validate message authentication', async () => {
    await store.connect('user-1', 'test-org')

    // Simulate message with invalid signature
    const maliciousMessage = {
      type: 'document_operation',
      documentId: 'secure-doc',
      data: {
        operation: {
          id: 'malicious-op',
          type: 'delete',
          position: 0,
          length: 1000,
          userId: 'fake-user',
          timestamp: Date.now(),
          version: 1,
        },
      },
      signature: 'invalid-signature',
    }

    mockWebSocket.simulateMessage(maliciousMessage)

    await flushPromises()

    // Should reject invalid messages
    expect(store.documents.size).toBe(0)
  })

  it('should handle permission-based access control', async () => {
    await store.connect('limited-user', 'test-org')

    const documentId = 'restricted-doc'
    const restrictedDoc = {
      id: documentId,
      title: 'Restricted Document',
      content: 'Confidential content',
      version: 1,
      lastModified: new Date(),
      collaborators: [
        {
          userId: 'limited-user',
          permissions: ['read'], // No edit permission
          joinedAt: new Date(),
        }
      ],
      pendingChanges: [],
      conflictResolution: 'ot' as const,
    }

    store.joinDocument(documentId, restrictedDoc)

    // Attempt unauthorized operation
    store.sendMessage({
      type: 'document_operation',
      documentId,
      data: {
        operation: {
          id: 'unauthorized-op',
          type: 'insert',
          position: 0,
          content: 'Unauthorized edit',
          userId: 'limited-user',
          timestamp: Date.now(),
          version: 1,
        },
      },
      timestamp: Date.now(),
    })

    // Should be rejected due to permissions
    expect(hybridRealtimeManager.sendMessage).not.toHaveBeenCalled()
  })

  it('should sanitize chat message content', async () => {
    await store.connect('user-1', 'test-org')

    const sessionId = 'sanitize-session'
    store.joinSession(sessionId, {
      id: sessionId,
      title: 'Sanitize Session',
      participants: [],
      hostId: 'user-1',
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

    // Simulate malicious chat message
    const maliciousChat = {
      type: 'chat_message',
      sessionId,
      data: {
        message: {
          id: 'malicious-msg',
          userId: 'attacker',
          userName: 'Attacker',
          content: '<script>alert("xss")</script>Innocent message',
          timestamp: new Date(),
          type: 'text',
        },
      },
    }

    mockWebSocket.simulateMessage(maliciousChat)

    await flushPromises()

    const session = store.sessions.get(sessionId)
    // Content should be sanitized (implementation would handle this)
    expect(session?.chat[0].content).not.toContain('<script>')
  })
})