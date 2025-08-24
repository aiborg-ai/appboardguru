/**
 * Test Setup for Real-Time Collaboration Tests
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock WebSocket globally
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: WebSocket.OPEN,
}))

// Mock WebRTC APIs
global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
  createOffer: vi.fn().mockResolvedValue({}),
  createAnswer: vi.fn().mockResolvedValue({}),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
}))

global.RTCSessionDescription = vi.fn()
global.RTCIceCandidate = vi.fn()

// Mock MediaStream APIs
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
    getDisplayMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
})

// Mock Notification API
global.Notification = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
})) as any

Object.defineProperty(Notification, 'permission', {
  value: 'granted',
  writable: true,
})

Object.defineProperty(Notification, 'requestPermission', {
  value: vi.fn().mockResolvedValue('granted'),
  writable: true,
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
  },
  writable: true,
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock TextEncoder/TextDecoder
global.TextEncoder = vi.fn().mockImplementation(() => ({
  encode: vi.fn((text: string) => new Uint8Array(text.length)),
}))

global.TextDecoder = vi.fn().mockImplementation(() => ({
  decode: vi.fn((buffer: Uint8Array) => String.fromCharCode(...buffer)),
}))

// Mock crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    getRandomValues: vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
  },
})

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Setup fetch mock
global.fetch = vi.fn()

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
  vi.clearAllTimers()
  
  // Clear localStorage/sessionStorage mocks
  vi.mocked(localStorage.clear).mockClear()
  vi.mocked(sessionStorage.clear).mockClear()
})