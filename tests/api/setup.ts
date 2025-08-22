/**
 * Global test setup for API tests
 */

import { config } from 'dotenv'
import { beforeAll, afterAll, jest } from '@jest/globals'

// Load environment variables for testing
config({ path: '.env.test' })

// Global test configuration
const TEST_CONFIG = {
  API_BASE_URL: process.env.TEST_API_URL || 'http://localhost:3000/api',
  API_VERSION: process.env.TEST_API_VERSION || 'v2',
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'test@example.com',
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'test-password',
  TEST_AUTH_TOKEN: process.env.TEST_AUTH_TOKEN,
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  REDIS_URL: process.env.TEST_REDIS_URL,
  CLEANUP_AFTER_TESTS: process.env.CLEANUP_AFTER_TESTS !== 'false',
  PARALLEL_TESTS: process.env.PARALLEL_TESTS !== 'false',
  LOG_LEVEL: process.env.LOG_LEVEL || 'error'
}

// Store original environment
const originalEnv = { ...process.env }

// Global setup
beforeAll(async () => {
  console.log('🔧 Setting up API tests...')

  // Set test environment variables
  Object.assign(process.env, TEST_CONFIG)

  // Setup test database if needed
  if (TEST_CONFIG.DATABASE_URL) {
    // This would run database migrations or setup test data
    console.log('📊 Setting up test database...')
  }

  // Setup Redis for rate limiting tests if needed
  if (TEST_CONFIG.REDIS_URL) {
    console.log('🔴 Setting up test Redis...')
  }

  // Configure timeouts for all tests
  jest.setTimeout(30000)

  console.log('✅ API test setup completed')
})

// Global cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up after API tests...')

  if (TEST_CONFIG.CLEANUP_AFTER_TESTS) {
    // Cleanup test data
    console.log('🗑️ Cleaning up test data...')
    
    // This would cleanup test users, assets, notifications etc.
    await cleanupTestData()
  }

  // Restore original environment
  process.env = originalEnv

  console.log('✅ API test cleanup completed')
})

/**
 * Cleanup test data from database
 */
async function cleanupTestData(): Promise<void> {
  try {
    // This is where you'd implement actual cleanup logic
    // For example, deleting test users, assets, notifications, etc.
    
    console.log('🧽 Cleaning up test assets...')
    console.log('🧽 Cleaning up test notifications...')
    console.log('🧽 Cleaning up test users...')
    
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error)
  }
}

// Custom matchers
expect.extend({
  /**
   * Custom matcher to check API response structure
   */
  toBeAPIResponse(received: any, expectedStatus?: number) {
    const pass = (
      received &&
      typeof received === 'object' &&
      'status' in received &&
      'body' in received &&
      'headers' in received &&
      (!expectedStatus || received.status === expectedStatus)
    )

    if (pass) {
      return {
        message: () => `Expected response not to be a valid API response`,
        pass: true
      }
    } else {
      return {
        message: () => `Expected response to be a valid API response with status ${expectedStatus || 'any'}`,
        pass: false
      }
    }
  },

  /**
   * Custom matcher to check API error response
   */
  toBeAPIError(received: any, expectedCode?: string) {
    const pass = (
      received &&
      received.body &&
      received.body.success === false &&
      received.body.error &&
      (!expectedCode || received.body.code === expectedCode)
    )

    if (pass) {
      return {
        message: () => `Expected response not to be an API error response`,
        pass: true
      }
    } else {
      return {
        message: () => `Expected response to be an API error response${expectedCode ? ` with code ${expectedCode}` : ''}`,
        pass: false
      }
    }
  },

  /**
   * Custom matcher to check pagination structure
   */
  toHavePagination(received: any) {
    const pass = (
      received &&
      received.body &&
      received.body.pagination &&
      'page' in received.body.pagination &&
      'limit' in received.body.pagination &&
      'total' in received.body.pagination
    )

    if (pass) {
      return {
        message: () => `Expected response not to have pagination`,
        pass: true
      }
    } else {
      return {
        message: () => `Expected response to have pagination structure`,
        pass: false
      }
    }
  },

  /**
   * Custom matcher to check rate limit headers
   */
  toHaveRateLimitHeaders(received: any) {
    const requiredHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']
    const pass = requiredHeaders.every(header => header in received.headers)

    if (pass) {
      return {
        message: () => `Expected response not to have rate limit headers`,
        pass: true
      }
    } else {
      return {
        message: () => `Expected response to have rate limit headers: ${requiredHeaders.join(', ')}`,
        pass: false
      }
    }
  }
})

// Global test utilities
global.testUtils = {
  /**
   * Generate test data
   */
  generateTestAsset: () => ({
    title: `Test Asset ${Date.now()}`,
    description: 'Generated test asset',
    fileName: 'test-file.pdf',
    filePath: '/test/test-file.pdf',
    fileSize: Math.floor(Math.random() * 1000000) + 1000,
    fileType: 'application/pdf',
    category: 'test',
    tags: ['test', 'generated'],
    visibility: 'private' as const
  }),

  generateTestNotification: () => ({
    type: 'test_notification',
    category: 'test',
    title: `Test Notification ${Date.now()}`,
    message: 'Generated test notification',
    priority: 'medium' as const,
    action_url: '/test',
    action_text: 'View Test'
  }),

  generateTestOrganization: () => ({
    name: `Test Organization ${Date.now()}`,
    description: 'Generated test organization',
    slug: `test-org-${Date.now()}`.toLowerCase()
  }),

  /**
   * Wait for a condition to be met
   */
  waitFor: async (condition: () => Promise<boolean>, timeout = 5000, interval = 100): Promise<void> => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    throw new Error(`Condition not met within ${timeout}ms`)
  },

  /**
   * Retry a function with exponential backoff
   */
  retry: async <T>(fn: () => Promise<T>, maxAttempts = 3, baseDelay = 1000): Promise<T> => {
    let attempt = 1
    while (attempt <= maxAttempts) {
      try {
        return await fn()
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error
        }
        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
        attempt++
      }
    }
    throw new Error('Max attempts exceeded')
  },

  /**
   * Generate random test data
   */
  randomString: (length = 10): string => {
    return Math.random().toString(36).substring(2, length + 2)
  },

  randomEmail: (): string => {
    return `test-${Math.random().toString(36).substring(2)}@example.com`
  },

  randomUUID: (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
}

// Export test configuration for use in tests
export { TEST_CONFIG }

// Type declarations for global utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAPIResponse(expectedStatus?: number): R
      toBeAPIError(expectedCode?: string): R
      toHavePagination(): R
      toHaveRateLimitHeaders(): R
    }
  }

  var testUtils: {
    generateTestAsset: () => any
    generateTestNotification: () => any
    generateTestOrganization: () => any
    waitFor: (condition: () => Promise<boolean>, timeout?: number, interval?: number) => Promise<void>
    retry: <T>(fn: () => Promise<T>, maxAttempts?: number, baseDelay?: number) => Promise<T>
    randomString: (length?: number) => string
    randomEmail: () => string
    randomUUID: () => string
  }
}