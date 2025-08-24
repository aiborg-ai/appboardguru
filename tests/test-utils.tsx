/**
 * Test utilities for real-time collaboration features
 * Provides test wrappers, mocks, and helpers
 */

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'

// Create a test wrapper with providers
export function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

// Custom render function with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: createTestWrapper(),
    ...options,
  })
}

// Mock WebSocket implementation for testing
export class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.OPEN
  url: string
  protocol: string
  
  private listeners: { [key: string]: ((event: any) => void)[] } = {}

  constructor(url: string, protocols?: string | string[]) {
    this.url = url
    this.protocol = Array.isArray(protocols) ? protocols[0] : protocols || ''
    
    // Simulate connection opening
    setTimeout(() => {
      this.dispatchEvent('open', {})
    }, 0)
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    this.listeners[type].push(listener)
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(l => l !== listener)
    }
  }

  send(data: string | ArrayBuffer | Blob) {
    // Simulate server echo for testing
    setTimeout(() => {
      this.dispatchEvent('message', { data })
    }, 10)
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED
    setTimeout(() => {
      this.dispatchEvent('close', { code: code || 1000, reason: reason || 'Normal closure' })
    }, 0)
  }

  private dispatchEvent(type: string, event: any) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(listener => listener(event))
    }
  }

  // Helper methods for testing
  simulateMessage(data: any) {
    this.dispatchEvent('message', { data: JSON.stringify(data) })
  }

  simulateError(error: Error) {
    this.dispatchEvent('error', error)
  }

  simulateClose(code: number = 1000, reason: string = 'Test closure') {
    this.readyState = MockWebSocket.CLOSED
    this.dispatchEvent('close', { code, reason })
  }
}

// Mock CRDT document for testing
export class MockCRDTDocument {
  private content = ''
  private observers: ((event: any) => void)[] = []

  getText() {
    return {
      insert: (index: number, text: string) => {
        this.content = this.content.slice(0, index) + text + this.content.slice(index)
        this.notifyObservers({ type: 'insert', index, text })
      },
      delete: (index: number, length: number) => {
        this.content = this.content.slice(0, index) + this.content.slice(index + length)
        this.notifyObservers({ type: 'delete', index, length })
      },
      toString: () => this.content,
      observe: (callback: (event: any) => void) => {
        this.observers.push(callback)
      },
      unobserve: (callback: (event: any) => void) => {
        this.observers = this.observers.filter(obs => obs !== callback)
      },
    }
  }

  getMap() {
    const map = new Map()
    return {
      set: (key: string, value: any) => {
        map.set(key, value)
        this.notifyObservers({ type: 'map-set', key, value })
      },
      get: (key: string) => map.get(key),
      observe: (callback: (event: any) => void) => {
        this.observers.push(callback)
      },
      unobserve: (callback: (event: any) => void) => {
        this.observers = this.observers.filter(obs => obs !== callback)
      },
    }
  }

  on(event: string, callback: (event: any) => void) {
    this.observers.push(callback)
  }

  off(event: string, callback: (event: any) => void) {
    this.observers = this.observers.filter(obs => obs !== callback)
  }

  destroy() {
    this.observers = []
  }

  private notifyObservers(event: any) {
    this.observers.forEach(observer => {
      try {
        observer(event)
      } catch (error) {
        console.error('Mock CRDT observer error:', error)
      }
    })
  }
}

// Test data factories
export const createTestDocument = (overrides: any = {}) => ({
  id: 'test-doc-id',
  title: 'Test Document',
  content: 'Initial test content',
  version: 1,
  lastModified: new Date(),
  collaborators: [],
  pendingChanges: [],
  conflictResolution: 'ot' as const,
  ...overrides,
})

export const createTestUser = (overrides: any = {}) => ({
  userId: 'test-user-id',
  status: 'online' as const,
  lastSeen: new Date(),
  activity: 'viewing' as const,
  location: '/dashboard',
  device: 'desktop' as const,
  connectionQuality: 'good' as const,
  ...overrides,
})

export const createTestSession = (overrides: any = {}) => ({
  id: 'test-session-id',
  title: 'Test Board Meeting',
  participants: [],
  hostId: 'host-user-id',
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
  ...overrides,
})

export const createTestNotification = (overrides: any = {}) => ({
  id: 'test-notif-id',
  type: 'document_update' as const,
  title: 'Test Notification',
  message: 'This is a test notification',
  timestamp: new Date(),
  userId: 'test-user-id',
  read: false,
  priority: 'medium' as const,
  ...overrides,
})

// Performance testing helpers
export function measureAsyncOperation<T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  return new Promise(async (resolve, reject) => {
    const start = performance.now()
    try {
      const result = await operation()
      const duration = performance.now() - start
      resolve({ result, duration })
    } catch (error) {
      reject(error)
    }
  })
}

// WebSocket message helpers
export const createWebSocketMessage = (type: string, data: any) => ({
  type,
  data,
  timestamp: Date.now(),
  messageId: `msg-${Math.random().toString(36).substr(2, 9)}`,
})

// Conflict simulation helpers
export const simulateConflict = (
  localOp: any,
  remoteOp: any,
  documentState: string
) => {
  // Simulate operational transform conflict
  return {
    localOperation: localOp,
    remoteOperation: remoteOp,
    documentState,
    conflictType: 'concurrent_edit',
    resolution: 'ot_transform',
    resolvedState: documentState, // Simplified for testing
  }
}

// Analytics helpers
export const mockAnalyticsData = {
  totalMessages: 150,
  averageLatency: 45,
  connectionUptime: 0.998,
  documentOperations: 1250,
  sessionParticipants: 25,
  notificationsSent: 89,
  conflictsResolved: 3,
  presenceUpdates: 420,
}

// Error simulation helpers
export const simulateNetworkError = () => {
  const error = new Error('Network error')
  ;(error as any).code = 'NETWORK_ERROR'
  return error
}

export const simulateTimeoutError = () => {
  const error = new Error('Request timeout')
  ;(error as any).code = 'TIMEOUT'
  return error
}

export const simulatePermissionError = () => {
  const error = new Error('Permission denied')
  ;(error as any).code = 'PERMISSION_DENIED'
  return error
}

// Async testing helpers
export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000
): Promise<void> => {
  const start = Date.now()
  while (!condition() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`)
  }
}

export const flushPromises = () => new Promise(setImmediate)

// Component testing helpers
export const createMockProps = (overrides: any = {}) => ({
  userId: 'test-user-id',
  organizationId: 'test-org-id',
  ...overrides,
})

// Cleanup helper
export const cleanupTest = () => {
  // Reset all stores
  useRealtimeCollaborationStore.getState().disconnect()
  
  // Clear all timers
  vi.clearAllTimers()
  
  // Clear all mocks
  vi.clearAllMocks()
}