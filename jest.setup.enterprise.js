/**
 * Jest Setup for Enterprise Features Testing
 * Global test environment configuration
 */

import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(() => Promise.resolve()),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock Web APIs that might not be available in test environment
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

// Mock Web Speech API
global.SpeechRecognition = jest.fn().mockImplementation(() => ({
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  maxAlternatives: 1,
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onstart: null,
  onresult: null,
  onerror: null,
  onend: null,
}))

global.webkitSpeechRecognition = global.SpeechRecognition

// Mock Audio Context for voice processing
global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: jest.fn(),
  createMediaStreamSource: jest.fn(),
  decodeAudioData: jest.fn().mockResolvedValue({
    getChannelData: jest.fn().mockReturnValue(new Float32Array(1024))
  }),
  close: jest.fn(),
  state: 'running'
}))

// Mock Media Devices API
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    }),
    enumerateDevices: jest.fn().mockResolvedValue([]),
  },
})

// Mock Permissions API
Object.defineProperty(navigator, 'permissions', {
  writable: true,
  value: {
    query: jest.fn().mockResolvedValue({
      state: 'granted',
      onchange: null
    })
  },
})

// Mock MediaRecorder API
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
  onerror: null,
  stream: null,
}))

// Mock performance API
global.performance = global.performance || {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn().mockReturnValue([]),
  getEntriesByType: jest.fn().mockReturnValue([]),
}

// Mock window.matchMedia
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

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
})

// Mock file API for upload testing
global.File = jest.fn().mockImplementation((bits, filename, options) => ({
  name: filename,
  size: bits.length,
  type: options?.type || '',
  lastModified: Date.now(),
  slice: jest.fn(),
  stream: jest.fn(),
  text: jest.fn().mockResolvedValue(bits.join('')),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(bits.length)),
}))

global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(),
  readAsText: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  onload: null,
  onerror: null,
  result: null,
}))

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-object-url')
global.URL.revokeObjectURL = jest.fn()

// Mock download functionality
global.HTMLAnchorElement.prototype.click = jest.fn()

// Mock crypto for ID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => '12345678-1234-1234-1234-123456789abc'),
    getRandomValues: jest.fn().mockImplementation((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
  },
})

// Mock console for cleaner test output
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    // Suppress expected warnings in tests
    const message = args[0]
    if (
      typeof message === 'string' &&
      (message.includes('Warning: ReactDOM.render is deprecated') ||
       message.includes('Warning: componentWillReceiveProps has been renamed') ||
       message.includes('Warning: componentWillMount has been renamed'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
  
  console.warn = (...args) => {
    // Suppress expected warnings
    const message = args[0]
    if (
      typeof message === 'string' &&
      (message.includes('deprecated') ||
       message.includes('legacy'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Global test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create mock event
  createMockEvent: (type, properties = {}) => ({
    type,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: { value: '' },
    ...properties,
  }),
  
  // Mock API responses
  mockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  }),
  
  // Performance measurement
  measurePerformance: async (fn) => {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    return {
      result,
      duration: end - start,
    }
  },
}

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_ENTERPRISE_FEATURES = 'true'
process.env.NEXT_PUBLIC_AI_FEATURES = 'true'
process.env.NEXT_PUBLIC_VOICE_COMMANDS = 'true'
process.env.NEXT_PUBLIC_COMPLIANCE_CHECKING = 'true'

// Set up fake timers for tests that need them
jest.useFakeTimers({
  legacyFakeTimers: true,
  doNotFake: [
    'nextTick',
    'setImmediate',
    'clearImmediate',
    'clearInterval',
    'clearTimeout',
    'setTimeout',
    'setInterval'
  ]
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  jest.clearAllTimers()
  
  // Clean up DOM
  if (document.body) {
    document.body.innerHTML = ''
  }
  
  // Reset local storage
  if (global.localStorage) {
    global.localStorage.clear()
  }
  
  // Reset session storage
  if (global.sessionStorage) {
    global.sessionStorage.clear()
  }
})

// Global error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Set up axios mock defaults if using axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: {
        use: jest.fn(),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn(),
        eject: jest.fn(),
      },
    },
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
  })),
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  patch: jest.fn(() => Promise.resolve({ data: {} })),
}))

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
}))

// Mock Zustand stores
jest.mock('zustand', () => ({
  create: (fn) => {
    const state = fn(() => {}, () => {})
    return () => state
  },
}))

console.log('🧪 Enterprise testing environment initialized')
console.log('📊 Test coverage thresholds: 80% (85% for services)')
console.log('🎯 Features enabled: AI, Voice, Compliance, Analytics')
console.log('⚡ Performance testing: Enabled')
console.log('♿ Accessibility testing: WCAG 2.1 AA')
console.log('---')