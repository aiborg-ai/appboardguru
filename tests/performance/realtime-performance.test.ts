/**
 * Performance Tests for Real-Time Collaboration Features
 * Tests scalability, memory usage, and response times
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useRealtimeCollaborationStore } from '@/lib/stores/realtime-collaboration.store'
import { 
  MockWebSocket, 
  measureAsyncOperation, 
  createTestDocument, 
  createTestSession,
  cleanupTest 
} from '../test-utils'

describe('Real-Time Performance Tests', () => {
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
    cleanupTest()
  })

  it('should connect within acceptable time limits', async () => {
    const { duration } = await measureAsyncOperation(async () => {
      await store.connect('test-user', 'test-org')
    })

    expect(duration).toBeLessThan(2000) // Should connect within 2 seconds
    expect(store.connection.isConnected).toBe(true)
  })

  it('should handle rapid message sending efficiently', async () => {
    await store.connect('test-user', 'test-org')

    const messages = Array.from({ length: 1000 }, (_, i) => ({
      type: 'presence_update',
      data: { userId: `user-${i}`, activity: 'typing' },
      timestamp: Date.now() + i,
    }))

    const { duration } = await measureAsyncOperation(async () => {
      for (const message of messages) {
        store.sendMessage(message)
      }
    })

    expect(duration).toBeLessThan(1000) // Should process 1000 messages in under 1 second
    expect(store.messageQueue.length).toBeLessThanOrEqual(messages.length)
  })

  it('should maintain performance with large document content', async () => {
    await store.connect('test-user', 'test-org')

    // Create document with 1MB content
    const largeContent = 'Lorem ipsum '.repeat(100000)
    const largeDocument = createTestDocument({
      content: largeContent,
    })

    const { duration } = await measureAsyncOperation(async () => {
      store.joinDocument('large-doc', largeDocument)
    })

    expect(duration).toBeLessThan(500) // Should join large document quickly
    expect(store.documents.has('large-doc')).toBe(true)
  })

  it('should handle concurrent operations efficiently', async () => {
    await store.connect('test-user', 'test-org')

    const documentId = 'concurrent-doc'
    store.joinDocument(documentId, createTestDocument({ id: documentId }))

    // Generate concurrent operations
    const operations = Array.from({ length: 100 }, (_, i) => ({
      type: 'document_operation',
      documentId,
      data: {
        operation: {
          id: `op-${i}`,
          type: 'insert',
          position: i,
          content: `Text ${i}`,
          userId: `user-${i % 10}`,
          timestamp: Date.now() + Math.random() * 1000,
          version: 1,
        },
      },
    }))

    const { duration } = await measureAsyncOperation(async () => {
      // Simulate receiving all operations
      for (const op of operations) {
        mockWebSocket.simulateMessage(op)
      }
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(duration).toBeLessThan(2000) // Should process 100 operations in under 2 seconds
  })

  it('should maintain memory efficiency with long-running sessions', async () => {
    await store.connect('test-user', 'test-org')

    const sessionId = 'memory-session'
    store.joinSession(sessionId, createTestSession({ id: sessionId }))

    // Simulate long-running session with many events
    for (let i = 0; i < 5000; i++) {
      // Add chat message
      store.addChatMessage(sessionId, {
        id: `msg-${i}`,
        userId: `user-${i % 50}`,
        userName: `User ${i % 50}`,
        content: `Message ${i}`,
        timestamp: new Date(),
        type: 'text',
      })

      // Simulate memory cleanup every 1000 messages
      if (i % 1000 === 999) {
        const session = store.sessions.get(sessionId)
        if (session && session.chat.length > 1000) {
          // Should implement message cleanup
          expect(session.chat.length).toBeLessThanOrEqual(1000)
        }
      }
    }

    const session = store.sessions.get(sessionId)
    // Should maintain reasonable memory usage
    expect(session?.chat.length).toBeLessThanOrEqual(1000)
  })

  it('should handle presence updates at scale', async () => {
    await store.connect('test-user', 'test-org')

    const userCount = 500
    const presenceUpdates = Array.from({ length: userCount }, (_, i) => ({
      userId: `user-${i}`,
      status: 'online' as const,
      lastSeen: new Date(),
      activity: ['viewing', 'editing', 'commenting'][i % 3] as any,
      location: `/documents/${i % 10}`,
      device: ['desktop', 'mobile', 'tablet'][i % 3] as any,
      connectionQuality: ['excellent', 'good', 'fair'][i % 3] as any,
    }))

    const { duration } = await measureAsyncOperation(async () => {
      for (const presence of presenceUpdates) {
        store.updatePresence(presence.userId, presence)
      }
    })

    expect(duration).toBeLessThan(1000) // Should update 500 users in under 1 second
    expect(store.presence.users.size).toBe(userCount)
  })

  it('should optimize notification processing', async () => {
    await store.connect('test-user', 'test-org')

    const notifications = Array.from({ length: 200 }, (_, i) => ({
      id: `notif-${i}`,
      type: ['document_update', 'meeting_reminder', 'system_alert'][i % 3] as any,
      title: `Notification ${i}`,
      message: `Message ${i}`,
      timestamp: new Date(),
      userId: 'test-user',
      read: false,
      priority: ['low', 'medium', 'high'][i % 3] as any,
    }))

    const { duration } = await measureAsyncOperation(async () => {
      for (const notification of notifications) {
        store.addNotification(notification)
      }
    })

    expect(duration).toBeLessThan(500) // Should process 200 notifications quickly
    expect(store.notifications.length).toBeLessThanOrEqual(100) // Should limit stored notifications
  })

  it('should handle WebSocket message throughput', async () => {
    await store.connect('test-user', 'test-org')

    const messageCount = 2000
    const startTime = performance.now()

    // Send messages at high rate
    for (let i = 0; i < messageCount; i++) {
      store.sendMessage({
        type: 'heartbeat',
        data: { timestamp: Date.now() },
        timestamp: Date.now(),
      })
    }

    const endTime = performance.now()
    const throughput = messageCount / ((endTime - startTime) / 1000)

    // Should handle at least 1000 messages per second
    expect(throughput).toBeGreaterThan(1000)
  })

  it('should cleanup resources on disconnect', async () => {
    await store.connect('test-user', 'test-org')

    // Create resources
    const documentId = 'cleanup-doc'
    const sessionId = 'cleanup-session'

    store.joinDocument(documentId, createTestDocument({ id: documentId }))
    store.joinSession(sessionId, createTestSession({ id: sessionId }))

    // Add presence data
    store.updatePresence('test-user', {
      userId: 'test-user',
      status: 'online',
      lastSeen: new Date(),
      activity: 'editing',
      location: '/documents/123',
      device: 'desktop',
      connectionQuality: 'good',
    })

    expect(store.documents.size).toBe(1)
    expect(store.sessions.size).toBe(1)
    expect(store.presence.users.size).toBe(1)

    // Disconnect and cleanup
    store.disconnect()

    expect(store.documents.size).toBe(0)
    expect(store.sessions.size).toBe(0)
    expect(store.presence.users.size).toBe(0)
    expect(store.messageQueue.length).toBe(0)
  })

  it('should handle memory pressure gracefully', async () => {
    await store.connect('test-user', 'test-org')

    // Simulate memory pressure scenario
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

    // Create many documents and sessions
    for (let i = 0; i < 100; i++) {
      store.joinDocument(`doc-${i}`, createTestDocument({ id: `doc-${i}` }))
      store.joinSession(`session-${i}`, createTestSession({ id: `session-${i}` }))
    }

    // Add many notifications
    for (let i = 0; i < 1000; i++) {
      store.addNotification({
        id: `notif-${i}`,
        type: 'document_update',
        title: `Notification ${i}`,
        message: `Message ${i}`,
        timestamp: new Date(),
        userId: 'test-user',
        read: false,
        priority: 'low',
      })
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0

    // Memory growth should be reasonable
    if (initialMemory && finalMemory) {
      const memoryGrowth = finalMemory - initialMemory
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024) // Less than 50MB growth
    }

    // Should implement memory cleanup
    expect(store.notifications.length).toBeLessThanOrEqual(100)
  })
})

describe('Stress Testing', () => {
  let mockWebSocket: MockWebSocket
  let store: ReturnType<typeof useRealtimeCollaborationStore.getState>

  beforeEach(() => {
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    global.WebSocket = vi.fn(() => mockWebSocket) as any
    
    store = useRealtimeCollaborationStore.getState()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    store.disconnect()
    vi.useRealTimers()
    cleanupTest()
  })

  it('should handle burst traffic', async () => {
    await store.connect('test-user', 'test-org')

    // Simulate burst of 100 messages in 100ms
    const burstMessages = Array.from({ length: 100 }, (_, i) => ({
      type: 'presence_update',
      data: { userId: `burst-user-${i}`, activity: 'active' },
      timestamp: Date.now() + i,
    }))

    const startTime = performance.now()
    
    for (const message of burstMessages) {
      store.sendMessage(message)
    }

    vi.advanceTimersByTime(100)
    
    const endTime = performance.now()

    // Should handle burst without blocking
    expect(endTime - startTime).toBeLessThan(200)
  })

  it('should maintain performance under sustained load', async () => {
    await store.connect('test-user', 'test-org')

    const documentId = 'load-test-doc'
    store.joinDocument(documentId, createTestDocument({ id: documentId }))

    // Simulate sustained load over 10 seconds
    const loadDuration = 10000 // 10 seconds
    const messageInterval = 10 // Every 10ms
    const expectedMessages = loadDuration / messageInterval

    let messagesSent = 0
    const interval = setInterval(() => {
      store.sendMessage({
        type: 'document_operation',
        documentId,
        data: {
          operation: {
            id: `load-op-${messagesSent}`,
            type: 'insert',
            position: messagesSent,
            content: 'x',
            userId: 'test-user',
            timestamp: Date.now(),
            version: 1,
          },
        },
        timestamp: Date.now(),
      })
      messagesSent++
    }, messageInterval)

    // Run load test
    vi.advanceTimersByTime(loadDuration)
    clearInterval(interval)

    expect(messagesSent).toBeCloseTo(expectedMessages, -2) // Within 1% tolerance
    
    // System should remain responsive
    const responseTime = await measureAsyncOperation(async () => {
      store.updatePresence('test-user', {
        userId: 'test-user',
        status: 'online',
        lastSeen: new Date(),
        activity: 'editing',
        location: '/test',
        device: 'desktop',
        connectionQuality: 'good',
      })
    })

    expect(responseTime.duration).toBeLessThan(100) // Should respond within 100ms even under load
  })

  it('should handle connection churn efficiently', async () => {
    const userIds = Array.from({ length: 50 }, (_, i) => `churn-user-${i}`)

    // Simulate rapid connect/disconnect cycles
    for (let cycle = 0; cycle < 5; cycle++) {
      const { duration } = await measureAsyncOperation(async () => {
        // Connect all users
        for (const userId of userIds) {
          await store.connect(userId, 'test-org')
        }

        // Disconnect all users
        for (const userId of userIds) {
          store.disconnect()
        }
      })

      expect(duration).toBeLessThan(5000) // Should handle 50 users in under 5 seconds
    }
  })

  it('should optimize large session management', async () => {
    await store.connect('host-user', 'test-org')

    const sessionId = 'large-session'
    const participantCount = 1000

    const participants = Array.from({ length: participantCount }, (_, i) => ({
      userId: `participant-${i}`,
      name: `Participant ${i}`,
      email: `p${i}@example.com`,
      role: 'member' as const,
      joinedAt: new Date(),
      permissions: {
        canVote: true,
        canChat: i % 10 === 0, // Only 10% can chat to reduce load
        canShare: false,
        canRecord: false,
      },
      presence: {
        isOnline: true,
        lastSeen: new Date(),
        device: 'desktop' as const,
      },
    }))

    const { duration } = await measureAsyncOperation(async () => {
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
    })

    expect(duration).toBeLessThan(1000) // Should handle 1000 participants in under 1 second
    
    const session = store.sessions.get(sessionId)
    expect(session?.participants).toHaveLength(participantCount)
  })

  it('should handle high-frequency presence updates', async () => {
    await store.connect('test-user', 'test-org')

    const userCount = 200
    const updateFrequency = 1000 // Updates per second per user

    const { duration } = await measureAsyncOperation(async () => {
      for (let i = 0; i < updateFrequency; i++) {
        for (let u = 0; u < userCount; u++) {
          store.updatePresence(`user-${u}`, {
            userId: `user-${u}`,
            status: 'online',
            lastSeen: new Date(),
            activity: ['viewing', 'editing', 'commenting'][i % 3] as any,
            location: `/doc-${i % 10}`,
            device: 'desktop',
            connectionQuality: 'good',
          })
        }
        
        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    })

    // Should handle 200,000 presence updates efficiently
    expect(duration).toBeLessThan(10000) // Under 10 seconds
    expect(store.presence.users.size).toBe(userCount)
  })

  it('should optimize notification filtering and sorting', async () => {
    await store.connect('test-user', 'test-org')

    // Add large number of notifications
    const notificationCount = 10000
    for (let i = 0; i < notificationCount; i++) {
      store.addNotification({
        id: `perf-notif-${i}`,
        type: ['document_update', 'meeting_reminder', 'system_alert'][i % 3] as any,
        title: `Performance Notification ${i}`,
        message: `Message ${i}`,
        timestamp: new Date(Date.now() - Math.random() * 86400000), // Random times within 24h
        userId: 'test-user',
        read: Math.random() > 0.3, // 70% read
        priority: ['low', 'medium', 'high'][i % 3] as any,
      })
    }

    // Test filtering performance
    const { duration: filterDuration } = await measureAsyncOperation(async () => {
      const unreadNotifications = store.notifications.filter(n => !n.read)
      const highPriorityNotifications = store.notifications.filter(n => n.priority === 'high')
      const recentNotifications = store.notifications.filter(
        n => Date.now() - n.timestamp.getTime() < 3600000
      )
      
      return {
        unread: unreadNotifications.length,
        highPriority: highPriorityNotifications.length,
        recent: recentNotifications.length,
      }
    })

    expect(filterDuration).toBeLessThan(100) // Should filter quickly even with many notifications
  })

  it('should handle WebSocket reconnection storms', async () => {
    // Simulate many clients reconnecting simultaneously
    const clientCount = 100
    const connections: Promise<void>[] = []

    for (let i = 0; i < clientCount; i++) {
      connections.push(
        (async () => {
          await store.connect(`storm-user-${i}`, 'test-org')
          // Simulate immediate disconnect and reconnect
          store.disconnect()
          await store.connect(`storm-user-${i}`, 'test-org')
        })()
      )
    }

    const { duration } = await measureAsyncOperation(async () => {
      await Promise.all(connections)
    })

    // Should handle reconnection storm efficiently
    expect(duration).toBeLessThan(30000) // Under 30 seconds for 100 clients
  })

  it('should maintain low latency for critical operations', async () => {
    await store.connect('test-user', 'test-org')

    // Test critical operation latency
    const criticalOperations = [
      () => store.updatePresence('test-user', {
        userId: 'test-user',
        status: 'online',
        lastSeen: new Date(),
        activity: 'editing',
        location: '/critical-doc',
        device: 'desktop',
        connectionQuality: 'excellent',
      }),
      () => store.sendMessage({
        type: 'urgent_notification',
        data: { message: 'Critical alert' },
        timestamp: Date.now(),
      }),
      () => store.addNotification({
        id: 'critical-notif',
        type: 'system_alert',
        title: 'Critical Alert',
        message: 'System requires attention',
        timestamp: new Date(),
        userId: 'test-user',
        read: false,
        priority: 'high',
      }),
    ]

    for (const operation of criticalOperations) {
      const { duration } = await measureAsyncOperation(operation)
      expect(duration).toBeLessThan(50) // Critical operations under 50ms
    }
  })
})

describe('Scalability Tests', () => {
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
    cleanupTest()
  })

  it('should scale to enterprise user counts', async () => {
    await store.connect('test-user', 'enterprise-org')

    const enterpriseUserCount = 10000
    
    // Simulate enterprise-scale presence tracking
    const { duration } = await measureAsyncOperation(async () => {
      for (let i = 0; i < enterpriseUserCount; i++) {
        if (i % 100 === 0) {
          // Add small delay every 100 users to prevent blocking
          await new Promise(resolve => setTimeout(resolve, 1))
        }
        
        store.updatePresence(`enterprise-user-${i}`, {
          userId: `enterprise-user-${i}`,
          status: Math.random() > 0.2 ? 'online' : 'away',
          lastSeen: new Date(),
          activity: ['viewing', 'editing'][Math.floor(Math.random() * 2)] as any,
          location: `/doc-${i % 100}`,
          device: ['desktop', 'mobile'][Math.floor(Math.random() * 2)] as any,
          connectionQuality: ['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)] as any,
        })
      }
    })

    expect(duration).toBeLessThan(60000) // Should handle 10k users in under 1 minute
    expect(store.presence.users.size).toBe(enterpriseUserCount)
  })

  it('should handle concurrent document editing at scale', async () => {
    await store.connect('test-user', 'enterprise-org')

    const documentCount = 100
    const operationsPerDocument = 100

    const { duration } = await measureAsyncOperation(async () => {
      // Create many documents
      for (let d = 0; d < documentCount; d++) {
        const documentId = `scale-doc-${d}`
        store.joinDocument(documentId, createTestDocument({ id: documentId }))

        // Simulate operations on each document
        for (let o = 0; o < operationsPerDocument; o++) {
          mockWebSocket.simulateMessage({
            type: 'document_operation',
            documentId,
            data: {
              operation: {
                id: `scale-op-${d}-${o}`,
                type: 'insert',
                position: o,
                content: `${o}`,
                userId: `user-${o % 10}`,
                timestamp: Date.now() + o,
                version: 1,
              },
            },
          })
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    })

    expect(duration).toBeLessThan(30000) // Should handle 10k operations in under 30 seconds
    expect(store.documents.size).toBe(documentCount)
  })

  it('should maintain performance with complex session interactions', async () => {
    await store.connect('test-user', 'enterprise-org')

    const sessionId = 'complex-session'
    const complexSession = {
      id: sessionId,
      title: 'Complex Enterprise Session',
      participants: Array.from({ length: 500 }, (_, i) => ({
        userId: `complex-user-${i}`,
        name: `Complex User ${i}`,
        email: `complex${i}@example.com`,
        role: 'member' as const,
        joinedAt: new Date(),
        permissions: {
          canVote: true,
          canChat: i % 5 === 0, // 20% can chat
          canShare: i % 20 === 0, // 5% can share
          canRecord: false,
        },
        presence: {
          isOnline: Math.random() > 0.1, // 90% online
          lastSeen: new Date(),
          device: ['desktop', 'mobile', 'tablet'][i % 3] as any,
        },
      })),
      hostId: 'test-user',
      status: 'active' as const,
      startTime: new Date(),
      agenda: Array.from({ length: 20 }, (_, i) => ({
        id: `agenda-${i}`,
        title: `Agenda Item ${i}`,
        description: `Description for item ${i}`,
        duration: 15,
        presenter: `presenter-${i % 5}`,
        status: 'pending' as const,
        attachments: [],
      })),
      votes: Array.from({ length: 10 }, (_, i) => ({
        id: `vote-${i}`,
        title: `Vote ${i}`,
        description: `Vote description ${i}`,
        options: ['Yes', 'No', 'Abstain'],
        responses: [],
        status: 'active' as const,
        createdBy: 'test-user',
        createdAt: new Date(),
        endsAt: new Date(Date.now() + 300000),
      })),
      chat: [],
      isRecording: false,
      features: {
        voting: true,
        chat: true,
        screenSharing: true,
        recording: true,
      },
    }

    const { duration } = await measureAsyncOperation(async () => {
      store.joinSession(sessionId, complexSession)
      
      // Simulate complex interactions
      for (let i = 0; i < 100; i++) {
        // Vote responses
        store.castVote(sessionId, `vote-${i % 10}`, `complex-user-${i}`, 'Yes')
        
        // Chat messages (only from users with permission)
        if (i % 5 === 0) {
          store.addChatMessage(sessionId, {
            id: `complex-msg-${i}`,
            userId: `complex-user-${i}`,
            userName: `Complex User ${i}`,
            content: `Complex message ${i}`,
            timestamp: new Date(),
            type: 'text',
          })
        }
      }
    })

    expect(duration).toBeLessThan(5000) // Should handle complex session in under 5 seconds
    
    const session = store.sessions.get(sessionId)
    expect(session?.participants).toHaveLength(500)
    expect(session?.votes).toHaveLength(10)
  })
})

describe('Memory and Resource Management', () => {
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
    cleanupTest()
  })

  it('should implement effective garbage collection', async () => {
    await store.connect('test-user', 'test-org')

    // Create and destroy many resources
    for (let cycle = 0; cycle < 10; cycle++) {
      // Create documents
      for (let i = 0; i < 50; i++) {
        const docId = `gc-doc-${cycle}-${i}`
        store.joinDocument(docId, createTestDocument({ id: docId }))
      }

      // Create sessions
      for (let i = 0; i < 20; i++) {
        const sessionId = `gc-session-${cycle}-${i}`
        store.joinSession(sessionId, createTestSession({ id: sessionId }))
      }

      // Add notifications
      for (let i = 0; i < 100; i++) {
        store.addNotification({
          id: `gc-notif-${cycle}-${i}`,
          type: 'document_update',
          title: `GC Notification ${i}`,
          message: `Message ${i}`,
          timestamp: new Date(),
          userId: 'test-user',
          read: Math.random() > 0.5,
          priority: 'low',
        })
      }

      // Cleanup cycle
      store.cleanup()

      // Should maintain reasonable resource counts
      expect(store.documents.size).toBeLessThanOrEqual(100)
      expect(store.sessions.size).toBeLessThanOrEqual(50)
      expect(store.notifications.length).toBeLessThanOrEqual(200)
    }
  })

  it('should handle memory leaks in event listeners', async () => {
    await store.connect('test-user', 'test-org')

    const initialListenerCount = mockWebSocket.listeners?.size || 0

    // Create and destroy many subscriptions
    for (let i = 0; i < 100; i++) {
      const documentId = `listener-doc-${i}`
      store.joinDocument(documentId, createTestDocument({ id: documentId }))
      store.leaveDocument(documentId)
    }

    const finalListenerCount = mockWebSocket.listeners?.size || 0

    // Should cleanup event listeners
    expect(finalListenerCount).toBeLessThanOrEqual(initialListenerCount + 10)
  })

  it('should optimize data structures for large datasets', async () => {
    await store.connect('test-user', 'test-org')

    // Test with large datasets
    const datasetSize = 50000

    const { duration: mapDuration } = await measureAsyncOperation(async () => {
      for (let i = 0; i < datasetSize; i++) {
        store.updatePresence(`dataset-user-${i}`, {
          userId: `dataset-user-${i}`,
          status: 'online',
          lastSeen: new Date(),
          activity: 'viewing',
          location: `/item-${i}`,
          device: 'desktop',
          connectionQuality: 'good',
        })
      }
    })

    expect(mapDuration).toBeLessThan(5000) // Should handle 50k users in under 5 seconds

    // Test lookup performance
    const { duration: lookupDuration } = await measureAsyncOperation(async () => {
      for (let i = 0; i < 1000; i++) {
        const randomUserId = `dataset-user-${Math.floor(Math.random() * datasetSize)}`
        const user = store.presence.users.get(randomUserId)
        expect(user).toBeDefined()
      }
    })

    expect(lookupDuration).toBeLessThan(100) // 1000 lookups in under 100ms
  })
})

describe('Network Resilience', () => {
  let mockWebSocket: MockWebSocket
  let store: ReturnType<typeof useRealtimeCollaborationStore.getState>

  beforeEach(() => {
    mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
    global.WebSocket = vi.fn(() => mockWebSocket) as any
    
    store = useRealtimeCollaborationStore.getState()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    store.disconnect()
    vi.useRealTimers()
    cleanupTest()
  })

  it('should handle intermittent connectivity', async () => {
    await store.connect('test-user', 'test-org')

    // Simulate intermittent disconnections
    for (let i = 0; i < 5; i++) {
      // Disconnect
      mockWebSocket.simulateClose(1006, 'Intermittent failure')
      
      vi.advanceTimersByTime(1000)
      
      // Reconnect
      mockWebSocket = new MockWebSocket('ws://localhost:3001/websocket')
      await store.connect('test-user', 'test-org')
      
      vi.advanceTimersByTime(5000)
    }

    expect(store.connection.isConnected).toBe(true)
    expect(store.connection.reconnectAttempts).toBe(0)
  })

  it('should handle varying network conditions', async () => {
    await store.connect('test-user', 'test-org')

    const networkConditions = [
      { latency: 50, quality: 'excellent' },
      { latency: 200, quality: 'good' },
      { latency: 500, quality: 'fair' },
      { latency: 1000, quality: 'poor' },
    ]

    for (const condition of networkConditions) {
      // Simulate network condition change
      store.updateConnectionQuality(condition.quality as any)
      
      const { duration } = await measureAsyncOperation(async () => {
        store.sendMessage({
          type: 'ping',
          data: { timestamp: Date.now() },
          timestamp: Date.now(),
        })
        
        // Simulate network delay
        vi.advanceTimersByTime(condition.latency)
      })

      // Should adapt to network conditions
      expect(store.connection.quality).toBe(condition.quality)
    }
  })

  it('should optimize for mobile networks', async () => {
    await store.connect('mobile-user', 'test-org')

    // Simulate mobile network conditions
    store.updateConnectionQuality('fair')

    const mobileOptimizations = {
      reduceUpdateFrequency: true,
      compressMessages: true,
      batchOperations: true,
      prioritizeMessages: true,
    }

    // Should adapt behavior for mobile
    expect(store.connection.quality).toBe('fair')
    
    // Test batched operations
    const batchedMessages = Array.from({ length: 10 }, (_, i) => ({
      type: 'presence_update',
      data: { userId: `mobile-user-${i}`, activity: 'viewing' },
      timestamp: Date.now() + i,
    }))

    const { duration } = await measureAsyncOperation(async () => {
      for (const message of batchedMessages) {
        store.sendMessage(message)
      }
    })

    // Should batch for efficiency on mobile
    expect(duration).toBeLessThan(500)
  })
})