import { vi, beforeEach, afterEach } from 'vitest'

// Global test configuration for new features
// This setup ensures consistent test environment across all test suites

// Mock console methods for cleaner test output
const originalConsoleError = console.error
const originalConsoleWarn = console.warn
const originalConsoleLog = console.log

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
  
  // Mock console methods to avoid noise during tests
  console.error = vi.fn()
  console.warn = vi.fn()
  console.log = vi.fn()
  
  // Set up environment variables for tests
  process.env.NODE_ENV = 'test'
  process.env.VITEST = 'true'
  process.env.NEW_FEATURES_TEST = 'true'
})

afterEach(() => {
  // Restore console methods
  console.error = originalConsoleError
  console.warn = originalConsoleWarn 
  console.log = originalConsoleLog
  
  // Reset all mocks after each test
  vi.resetAllMocks()
  
  // Clear any timers
  vi.clearAllTimers()
})

// Mock Date.now for consistent timestamps in tests
vi.mock('Date', () => {
  const actualDate = vi.importActual('Date')
  return {
    ...actualDate,
    now: vi.fn(() => 1704067200000), // Fixed timestamp: 2024-01-01T00:00:00.000Z
  }
})

// Mock crypto for consistent UUIDs in tests
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto')
  return {
    ...actual,
    randomUUID: vi.fn(() => 'test-uuid-123456789'),
    randomBytes: vi.fn((size) => Buffer.alloc(size, 'test'))
  }
})

// Global test utilities
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeSuccess(): void
      toBeFailure(): void
      toHaveErrorType(type: string): void
      toRespondWithin(ms: number): void
    }
  }
}

// Custom matchers for Result pattern testing
expect.extend({
  toBeSuccess(received) {
    const pass = received && received.success === true
    return {
      pass,
      message: () => 
        pass 
          ? `Expected result not to be successful`
          : `Expected result to be successful, but got: ${JSON.stringify(received)}`
    }
  },
  
  toBeFailure(received) {
    const pass = received && received.success === false && received.error
    return {
      pass,
      message: () =>
        pass
          ? `Expected result not to be a failure`
          : `Expected result to be a failure with error, but got: ${JSON.stringify(received)}`
    }
  },
  
  toHaveErrorType(received, expectedType) {
    const pass = received && received.success === false && received.error?.type === expectedType
    return {
      pass,
      message: () =>
        pass
          ? `Expected error type not to be ${expectedType}`
          : `Expected error type to be ${expectedType}, but got: ${received?.error?.type || 'no error'}`
    }
  },

  async toRespondWithin(received, ms) {
    const startTime = Date.now()
    try {
      await received()
      const duration = Date.now() - startTime
      const pass = duration <= ms
      return {
        pass,
        message: () =>
          pass
            ? `Expected operation to take longer than ${ms}ms, but took ${duration}ms`
            : `Expected operation to complete within ${ms}ms, but took ${duration}ms`
      }
    } catch (error) {
      return {
        pass: false,
        message: () => `Operation failed with error: ${error.message}`
      }
    }
  }
})

// Mock Supabase client factory for consistent testing
export const createMockSupabaseClient = (overrides = {}) => {
  const defaultMock = {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'mock_id' }, error: null })
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'mock_id' }, error: null }),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          }))
        })),
        or: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis()
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
        lt: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
      }))
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test_user', email: 'test@example.com' } },
        error: null
      }),
      updateUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test_user' } },
        error: null
      })
    },
    sql: vi.fn((query) => query)
  }

  return { ...defaultMock, ...overrides }
}

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<any>) => {
  const startTime = performance.now()
  const result = await fn()
  const endTime = performance.now()
  const duration = endTime - startTime
  
  return {
    result,
    duration,
    success: duration < 200, // CLAUDE.md requirement: sub-200ms
  }
}

// Test data factories for consistent test data
export const createTestUser = (overrides = {}) => ({
  id: 'test_user_123',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_active: true,
  email_verified: true,
  ...overrides
})

export const createTestVoiceSession = (overrides = {}) => ({
  id: 'vs_test_123',
  host_user_id: 'test_user_123',
  name: 'Test Voice Session',
  description: 'Test session for unit tests',
  collaboration_type: 'brainstorming' as const,
  spatial_audio_config: {
    enabled: true,
    room_size: 'medium' as const,
    acoustics: 'conference' as const
  },
  permissions: {
    allow_screen_share: true,
    allow_file_share: false,
    allow_recording: false,
    participant_limit: 10
  },
  status: 'scheduled' as const,
  participants: [],
  created_at: new Date().toISOString(),
  ...overrides
})

export const createTestAuditLog = (overrides = {}) => ({
  id: 'audit_test_123',
  user_id: 'test_user_123',
  organization_id: 'test_org_123',
  action: 'TEST_ACTION',
  resource_type: 'test',
  resource_id: 'test_resource_123',
  severity: 'low' as const,
  category: 'system' as const,
  created_at: new Date().toISOString(),
  ...overrides
})

export const createTestSmartSharingRule = (overrides = {}) => ({
  id: 'rule_test_123',
  user_id: 'test_user_123',
  organization_id: 'test_org_123',
  name: 'Test Smart Sharing Rule',
  description: 'Test rule for unit tests',
  conditions: {
    file_types: ['pdf'],
    content_keywords: ['test'],
    file_size_limit: 1048576
  },
  actions: {
    auto_share_with: ['test@example.com'],
    notification_recipients: [],
    apply_tags: ['test'],
    set_permissions: {
      can_view: true,
      can_download: false,
      can_share: false
    }
  },
  is_active: true,
  priority: 1,
  trigger_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

// Console output for test suite initialization
console.log('🧪 New Features Test Suite Setup Complete')
console.log('✅ Custom matchers loaded')
console.log('✅ Mock factories available')
console.log('✅ Performance utilities ready')
console.log('✅ Test data factories initialized')
console.log('')