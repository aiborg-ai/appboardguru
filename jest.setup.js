/**
 * Jest Setup Configuration
 * Global test setup for the AI Board Secretary system
 */

import '@testing-library/jest-dom'

// Mock Next.js environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENROUTER_API_KEY = 'test-openrouter-key'
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3000'

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

// Mock HTMLElement.scrollIntoView
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: jest.fn(),
})

// Mock console methods to reduce noise in tests
const originalConsole = { ...console }

beforeEach(() => {
  // Reset console mocks before each test
  console.error = jest.fn()
  console.warn = jest.fn()
  console.log = jest.fn()
})

afterEach(() => {
  // Restore console methods after each test
  console.error = originalConsole.error
  console.warn = originalConsole.warn
  console.log = originalConsole.log
})

// Mock fetch globally
global.fetch = jest.fn()

// Mock File and FileReader for file upload tests
class MockFile {
  constructor(parts, filename, properties) {
    this.name = filename
    this.size = parts.reduce((acc, part) => acc + part.length, 0)
    this.type = properties?.type || ''
    this.lastModified = Date.now()
  }
}

global.File = MockFile
global.FileReader = class MockFileReader {
  readAsDataURL = jest.fn()
  readAsText = jest.fn()
  readAsArrayBuffer = jest.fn()
  result = null
  error = null
  onload = null
  onerror = null
  onloadend = null
}

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-blob-url')
global.URL.revokeObjectURL = jest.fn()

// Mock crypto for UUID generation in tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mocked-uuid-' + Math.random().toString(36).substr(2, 9))
  }
})

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(void 0),
    readText: jest.fn().mockResolvedValue(''),
  },
  configurable: true,
})

// Mock mediaDevices for voice recording tests
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([
        {
          stop: jest.fn(),
          kind: 'audio',
          enabled: true,
        }
      ])
    }),
  },
  configurable: true,
})

// Mock MediaRecorder for audio recording
global.MediaRecorder = class MockMediaRecorder {
  constructor(stream, options) {
    this.stream = stream
    this.options = options
    this.state = 'inactive'
    this.ondataavailable = null
    this.onstop = null
    this.onstart = null
  }

  start() {
    this.state = 'recording'
    this.onstart?.()
  }

  stop() {
    this.state = 'inactive'
    this.ondataavailable?.(new Event('dataavailable'))
    this.onstop?.()
  }

  pause() {
    this.state = 'paused'
  }

  resume() {
    this.state = 'recording'
  }

  static isTypeSupported(type) {
    return true
  }
}

// Mock AudioContext for audio processing
global.AudioContext = class MockAudioContext {
  createAnalyser() {
    return {
      frequencyBinCount: 512,
      getByteFrequencyData: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    }
  }
  
  createMediaStreamSource() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
    }
  }
  
  resume() {
    return Promise.resolve()
  }
  
  close() {
    return Promise.resolve()
  }
}

// Mock Speech Recognition API for voice commands
global.SpeechRecognition = class MockSpeechRecognition {
  constructor() {
    this.continuous = false
    this.interimResults = false
    this.lang = 'en-US'
    this.onstart = null
    this.onresult = null
    this.onerror = null
    this.onend = null
  }

  start() {
    this.onstart?.()
  }

  stop() {
    this.onend?.()
  }

  abort() {
    this.onend?.()
  }
}

global.webkitSpeechRecognition = global.SpeechRecognition

// Mock performance API
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
}

// Suppress specific warnings in tests
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  // Suppress React warnings about missing act() in tests
  if (typeof args[0] === 'string' && args[0].includes('Warning: An update to')) {
    return
  }
  // Suppress other known warnings
  if (typeof args[0] === 'string' && args[0].includes('componentWillReceiveProps')) {
    return
  }
  originalConsoleWarn(...args)
}

// Global test timeout
jest.setTimeout(10000)

// Add custom matchers
expect.extend({
  toHaveBeenCalledWithEventType(received, eventType) {
    const calls = received.mock.calls
    const pass = calls.some(call => 
      call.length > 0 && 
      typeof call[0] === 'object' && 
      call[0].type === eventType
    )

    return {
      message: () => 
        `expected function to ${pass ? 'not ' : ''}have been called with event type "${eventType}"`,
      pass
    }
  }
})