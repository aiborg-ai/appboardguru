import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { testDb } from './utils/test-database'

// Global test setup
beforeAll(async () => {
  // Initialize test database
  await testDb.setup()
})

// Global test cleanup
afterAll(async () => {
  // Cleanup test database
  await testDb.cleanup()
})

// Per-test setup
beforeEach(async () => {
  // Any per-test setup can go here
})

// Per-test cleanup
afterEach(async () => {
  // Clean up test data after each test
  // Note: Full cleanup is handled in afterAll
})

// Mock environment variables for testing
process.env['NODE_ENV'] = 'test'
process.env['NEXT_PUBLIC_SUPABASE_URL'] = process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://test.supabase.co'
process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 'test-anon-key'
process.env['SUPABASE_SERVICE_ROLE_KEY'] = process.env['SUPABASE_SERVICE_ROLE_KEY'] || 'test-service-key'

// Extend global expect matchers if needed
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const pass = uuidRegex.test(received)
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass,
    }
  },
  
  toBeRecentDate(received: string | Date, maxAgeMs: number = 5000) {
    const date = new Date(received)
    const now = new Date()
    const age = now.getTime() - date.getTime()
    const pass = age >= 0 && age <= maxAgeMs
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be within ${maxAgeMs}ms of now`,
      pass,
    }
  },
})

// Declare custom matchers for TypeScript
declare global {
  namespace Vi {
    interface AsymmetricMatchersContaining {
      toBeValidUUID(): any
      toBeRecentDate(maxAgeMs?: number): any
    }
  }
}