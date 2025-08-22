import { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'
import { testDb } from '../../tests/utils/test-database'
import type { 
  User, 
  Organization, 
  Vault, 
  Asset,
  UserInsert,
  OrganizationInsert,
  VaultInsert,
  AssetInsert
} from '@/types'

/**
 * Create mocked Next.js API request/response objects
 */
export function createApiMocks(options: {
  method?: string
  url?: string
  query?: Record<string, string | string[]>
  body?: any
  headers?: Record<string, string>
} = {}) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: options.method || 'GET',
    url: options.url || '/',
    query: options.query,
    body: options.body,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  // Add custom properties that might be needed
  Object.defineProperty(req, 'json', {
    value: async () => req.body,
  })

  return { req, res }
}

/**
 * Mock authenticated user context
 */
export function mockAuthenticatedUser(userId: string, userRole: string = 'director') {
  const mockAuth = {
    getUser: jest.fn().mockResolvedValue({
      data: { 
        user: { 
          id: userId, 
          role: userRole,
          email: `test-${userId}@example.com`,
        } 
      },
      error: null
    }),
    getSession: jest.fn().mockResolvedValue({
      data: {
        session: {
          user: { 
            id: userId, 
            role: userRole,
            email: `test-${userId}@example.com`,
          },
          access_token: `test-token-${userId}`,
        }
      },
      error: null
    })
  }

  return mockAuth
}

/**
 * Create test scenario with related data
 */
export async function createTestScenario(scenario: 'basic' | 'multiVault' | 'multiOrg' | 'permissions') {
  const scenarioData: any = {
    users: [],
    organizations: [],
    vaults: [],
    assets: [],
  }

  switch (scenario) {
    case 'basic':
      // Single user, organization, vault, and asset
      const user = await testDb.createUser({ role: 'director' })
      const org = await testDb.createOrganization({ created_by: user.id })
      const vault = await testDb.createVault({ organization_id: org.id, created_by: user.id })
      const asset = await testDb.createAsset({ organization_id: org.id, uploaded_by: user.id })
      
      scenarioData.users = [user]
      scenarioData.organizations = [org]
      scenarioData.vaults = [vault]
      scenarioData.assets = [asset]
      break

    case 'multiVault':
      // One user with multiple vaults
      const multiVaultUser = await testDb.createUser({ role: 'director' })
      const multiVaultOrg = await testDb.createOrganization({ created_by: multiVaultUser.id })
      
      const vaults = await Promise.all([
        testDb.createVault({ organization_id: multiVaultOrg.id, created_by: multiVaultUser.id, status: 'active' }),
        testDb.createVault({ organization_id: multiVaultOrg.id, created_by: multiVaultUser.id, status: 'draft' }),
        testDb.createVault({ organization_id: multiVaultOrg.id, created_by: multiVaultUser.id, status: 'archived' }),
      ])

      scenarioData.users = [multiVaultUser]
      scenarioData.organizations = [multiVaultOrg]
      scenarioData.vaults = vaults
      break

    case 'multiOrg':
      // Multiple organizations with different users
      const admin = await testDb.createUser({ role: 'admin' })
      const director1 = await testDb.createUser({ role: 'director' })
      const director2 = await testDb.createUser({ role: 'director' })
      
      const org1 = await testDb.createOrganization({ created_by: admin.id })
      const org2 = await testDb.createOrganization({ created_by: admin.id })
      
      // Add users to organizations
      await testDb.addOrganizationMember(org1.id, director1.id, 'member')
      await testDb.addOrganizationMember(org2.id, director2.id, 'member')

      scenarioData.users = [admin, director1, director2]
      scenarioData.organizations = [org1, org2]
      break

    case 'permissions':
      // Complex permission scenarios
      const owner = await testDb.createUser({ role: 'director' })
      const admin2 = await testDb.createUser({ role: 'admin' })
      const viewer = await testDb.createUser({ role: 'viewer' })
      
      const permOrg = await testDb.createOrganization({ created_by: owner.id })
      await testDb.addOrganizationMember(permOrg.id, admin2.id, 'admin')
      await testDb.addOrganizationMember(permOrg.id, viewer.id, 'member')
      
      const permVault = await testDb.createVault({ organization_id: permOrg.id, created_by: owner.id })
      await testDb.addVaultMember(permVault.id, admin2.id, 'editor')
      await testDb.addVaultMember(permVault.id, viewer.id, 'viewer')

      scenarioData.users = [owner, admin2, viewer]
      scenarioData.organizations = [permOrg]
      scenarioData.vaults = [permVault]
      break
  }

  return scenarioData
}

/**
 * Clean up test scenario data
 */
export async function cleanupTestScenario() {
  await testDb.cleanup()
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now()
  
  while (Date.now() - start < timeout) {
    const result = await condition()
    if (result) return
    
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  throw new Error(`Condition not met within ${timeout}ms timeout`)
}

/**
 * Generate random test data
 */
export const testDataGenerators = {
  email: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}@example.com`,
  username: () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  orgName: () => `Test Organization ${Date.now()}`,
  vaultName: () => `Test Vault ${Date.now()}`,
  assetTitle: () => `Test Asset ${Date.now()}`,
  uuid: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
}

/**
 * Assertion helpers
 */
export const testAssertions = {
  isValidUUID: (value: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  },
  
  isRecentDate: (dateString: string, maxAgeMs: number = 5000) => {
    const date = new Date(dateString)
    const now = new Date()
    const age = now.getTime() - date.getTime()
    return age >= 0 && age <= maxAgeMs
  },
  
  hasRequiredFields: (obj: any, fields: string[]) => {
    return fields.every(field => obj.hasOwnProperty(field) && obj[field] !== null && obj[field] !== undefined)
  },
  
  isValidEmail: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

/**
 * Mock external services
 */
export const mockServices = {
  emailService: {
    sendInvitationEmail: jest.fn().mockResolvedValue({ success: true }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
    sendNotificationEmail: jest.fn().mockResolvedValue({ success: true }),
  },
  
  storageService: {
    uploadFile: jest.fn().mockResolvedValue({ 
      path: 'test-uploads/test-file.pdf',
      url: 'https://storage.test.com/test-uploads/test-file.pdf'
    }),
    deleteFile: jest.fn().mockResolvedValue({ success: true }),
    generateSignedUrl: jest.fn().mockResolvedValue('https://storage.test.com/signed-url'),
  },
  
  aiService: {
    summarizeDocument: jest.fn().mockResolvedValue({
      summary: 'This is a test document summary',
      key_points: ['Point 1', 'Point 2', 'Point 3'],
    }),
    generateInsights: jest.fn().mockResolvedValue({
      insights: ['Insight 1', 'Insight 2'],
    }),
  }
}

/**
 * Database test helpers
 */
export const dbHelpers = {
  /**
   * Verify a record exists in the database
   */
  async assertRecordExists(table: string, id: string) {
    const exists = await testDb.recordExists(table, id)
    expect(exists).toBe(true)
  },

  /**
   * Verify a record does not exist in the database
   */
  async assertRecordNotExists(table: string, id: string) {
    const exists = await testDb.recordExists(table, id)
    expect(exists).toBe(false)
  },

  /**
   * Count records matching criteria
   */
  async countRecords(table: string, filters: Record<string, any> = {}) {
    return await testDb.countRecords(table, filters)
  },

  /**
   * Assert record count matches expectation
   */
  async assertRecordCount(table: string, expectedCount: number, filters: Record<string, any> = {}) {
    const actualCount = await testDb.countRecords(table, filters)
    expect(actualCount).toBe(expectedCount)
  }
}

/**
 * Performance testing helpers
 */
export const performanceHelpers = {
  /**
   * Measure execution time
   */
  async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now()
    const result = await fn()
    const duration = performance.now() - start
    return { result, duration }
  },

  /**
   * Assert operation completes within time limit
   */
  async assertWithinTimeLimit<T>(fn: () => Promise<T>, maxDurationMs: number): Promise<T> {
    const { result, duration } = await this.measureExecutionTime(fn)
    expect(duration).toBeLessThan(maxDurationMs)
    return result
  }
}

/**
 * API response validation helpers
 */
export const apiHelpers = {
  /**
   * Validate API response structure
   */
  validateApiResponse(response: any, expectedSchema: any) {
    expect(response).toMatchObject(expectedSchema)
  },

  /**
   * Validate error response
   */
  validateErrorResponse(response: any, expectedCode?: number, expectedMessage?: string) {
    expect(response).toHaveProperty('error')
    if (expectedCode) expect(response).toHaveProperty('code', expectedCode)
    if (expectedMessage) expect(response.error).toContain(expectedMessage)
  },

  /**
   * Validate paginated response
   */
  validatePaginatedResponse(response: any, expectedItemSchema: any) {
    expect(response).toHaveProperty('data')
    expect(response).toHaveProperty('pagination')
    expect(response.pagination).toHaveProperty('page')
    expect(response.pagination).toHaveProperty('limit')
    expect(response.pagination).toHaveProperty('total')
    
    if (response.data.length > 0) {
      response.data.forEach((item: any) => {
        expect(item).toMatchObject(expectedItemSchema)
      })
    }
  }
}

export default {
  createApiMocks,
  mockAuthenticatedUser,
  createTestScenario,
  cleanupTestScenario,
  waitFor,
  testDataGenerators,
  testAssertions,
  mockServices,
  dbHelpers,
  performanceHelpers,
  apiHelpers,
}