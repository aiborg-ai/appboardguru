/**
 * Automated API Test Generator
 * Generates comprehensive test suites for API endpoints
 */

import { z } from 'zod'

export interface DomainTestConfig {
  domainName: string
  entityName: string
  tableName: string
  createSchema: z.ZodSchema
  updateSchema: z.ZodSchema
  endpoints: {
    list: string
    get: string
    create: string
    update: string
    delete: string
  }
  testData: {
    valid: any
    invalid: any[]
    edge: any[]
  }
  permissions?: {
    roles: string[]
    scenarios: PermissionScenario[]
  }
}

export interface PermissionScenario {
  role: string
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
}

/**
 * Generate comprehensive API test suite
 */
export function generateAPITests(config: DomainTestConfig): string {
  return `
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '../helpers/testClient'
import { createTestUser, createTestOrganization } from '../helpers/testData'
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/testDatabase'

${generateImports(config)}

describe('${config.entityName} API', () => {
  let testClient: any
  let testUser: any
  let testOrganization: any
  let testDb: any

  beforeAll(async () => {
    testDb = await setupTestDatabase()
    testOrganization = await createTestOrganization(testDb)
    testUser = await createTestUser(testDb, { organizationId: testOrganization.id })
    testClient = createTestClient(testUser.accessToken)
  })

  afterAll(async () => {
    await cleanupTestDatabase(testDb)
  })

  beforeEach(async () => {
    // Clean up any test data between tests
    await testDb.from('${config.tableName}').delete().neq('id', '')
  })

  ${generateCRUDTests(config)}
  
  ${generateValidationTests(config)}
  
  ${generatePermissionTests(config)}
  
  ${generatePerformanceTests(config)}
  
  ${generateErrorHandlingTests(config)}
  
  ${generateSecurityTests(config)}
})
`
}

/**
 * Generate CRUD operation tests
 */
function generateCRUDTests(config: DomainTestConfig): string {
  return `
  describe('CRUD Operations', () => {
    describe('POST ${config.endpoints.create}', () => {
      it('should create a new ${config.entityName.toLowerCase()}', async () => {
        const createData = ${JSON.stringify(config.testData.valid, null, 2)}
        
        const response = await testClient.post('${config.endpoints.create}', createData)
        
        expect(response.status).toBe(201)
        expect(response.data.success).toBe(true)
        expect(response.data.data).toMatchObject(createData)
        expect(response.data.data.id).toBeValidUUID()
        expect(response.data.data.created_at).toBeRecentDate()
      })

      it('should return created ${config.entityName.toLowerCase()} with all fields', async () => {
        const createData = ${JSON.stringify(config.testData.valid, null, 2)}
        
        const response = await testClient.post('${config.endpoints.create}', createData)
        
        expect(response.data.data).toHaveProperty('id')
        expect(response.data.data).toHaveProperty('created_at')
        expect(response.data.data).toHaveProperty('updated_at')
        expect(response.data.data).toHaveProperty('organization_id')
        expect(response.data.data).toHaveProperty('created_by')
      })
    })

    describe('GET ${config.endpoints.list}', () => {
      it('should return empty list when no ${config.entityName.toLowerCase()}s exist', async () => {
        const response = await testClient.get('${config.endpoints.list}')
        
        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.data.items).toEqual([])
        expect(response.data.data.pagination.total).toBe(0)
      })

      it('should return list of ${config.entityName.toLowerCase()}s', async () => {
        // Create test data
        const item1 = await testClient.post('${config.endpoints.create}', ${JSON.stringify(config.testData.valid)})
        const item2 = await testClient.post('${config.endpoints.create}', {
          ...${JSON.stringify(config.testData.valid)},
          name: 'Test Item 2'
        })

        const response = await testClient.get('${config.endpoints.list}')
        
        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.data.items).toHaveLength(2)
        expect(response.data.data.pagination.total).toBe(2)
      })

      it('should support pagination', async () => {
        // Create multiple items
        for (let i = 0; i < 5; i++) {
          await testClient.post('${config.endpoints.create}', {
            ...${JSON.stringify(config.testData.valid)},
            name: \`Test Item \${i + 1}\`
          })
        }

        const response = await testClient.get('${config.endpoints.list}?page=1&limit=2')
        
        expect(response.status).toBe(200)
        expect(response.data.data.items).toHaveLength(2)
        expect(response.data.data.pagination.page).toBe(1)
        expect(response.data.data.pagination.limit).toBe(2)
        expect(response.data.data.pagination.total).toBe(5)
        expect(response.data.data.pagination.has_next).toBe(true)
      })
    })

    describe('GET ${config.endpoints.get}', () => {
      it('should return specific ${config.entityName.toLowerCase()}', async () => {
        const created = await testClient.post('${config.endpoints.create}', ${JSON.stringify(config.testData.valid)})
        const id = created.data.data.id

        const response = await testClient.get(\`${config.endpoints.get}/\${id}\`)
        
        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.data.id).toBe(id)
      })

      it('should return 404 for non-existent ${config.entityName.toLowerCase()}', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000'
        
        const response = await testClient.get(\`${config.endpoints.get}/\${fakeId}\`)
        
        expect(response.status).toBe(404)
        expect(response.data.success).toBe(false)
        expect(response.data.error.code).toBe('NOT_FOUND')
      })
    })

    describe('PUT ${config.endpoints.update}', () => {
      it('should update existing ${config.entityName.toLowerCase()}', async () => {
        const created = await testClient.post('${config.endpoints.create}', ${JSON.stringify(config.testData.valid)})
        const id = created.data.data.id
        
        const updateData = { name: 'Updated Name' }
        const response = await testClient.put(\`${config.endpoints.update}/\${id}\`, updateData)
        
        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.data.name).toBe('Updated Name')
        expect(response.data.data.updated_at).not.toBe(created.data.data.updated_at)
      })
    })

    describe('DELETE ${config.endpoints.delete}', () => {
      it('should delete existing ${config.entityName.toLowerCase()}', async () => {
        const created = await testClient.post('${config.endpoints.create}', ${JSON.stringify(config.testData.valid)})
        const id = created.data.data.id

        const response = await testClient.delete(\`${config.endpoints.delete}/\${id}\`)
        
        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)

        // Verify it's deleted
        const getResponse = await testClient.get(\`${config.endpoints.get}/\${id}\`)
        expect(getResponse.status).toBe(404)
      })
    })
  })
  `
}

/**
 * Generate validation tests
 */
function generateValidationTests(config: DomainTestConfig): string {
  const invalidTests = config.testData.invalid.map((invalidData, index) => `
    it('should reject invalid data case ${index + 1}', async () => {
      const response = await testClient.post('${config.endpoints.create}', ${JSON.stringify(invalidData)})
      
      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
      expect(response.data.error.code).toBe('VALIDATION_ERROR')
      expect(response.data.error.details).toBeDefined()
    })
  `).join('\n')

  return `
  describe('Data Validation', () => {
    describe('Create validation', () => {
      ${invalidTests}
      
      it('should reject empty request body', async () => {
        const response = await testClient.post('${config.endpoints.create}', {})
        
        expect(response.status).toBe(400)
        expect(response.data.error.code).toBe('VALIDATION_ERROR')
      })

      it('should reject null values for required fields', async () => {
        const invalidData = { ...${JSON.stringify(config.testData.valid)}, name: null }
        const response = await testClient.post('${config.endpoints.create}', invalidData)
        
        expect(response.status).toBe(400)
        expect(response.data.error.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('Update validation', () => {
      it('should allow partial updates', async () => {
        const created = await testClient.post('${config.endpoints.create}', ${JSON.stringify(config.testData.valid)})
        const id = created.data.data.id
        
        const response = await testClient.put(\`${config.endpoints.update}/\${id}\`, { name: 'New Name' })
        
        expect(response.status).toBe(200)
        expect(response.data.data.name).toBe('New Name')
      })
    })
  })
  `
}

/**
 * Generate permission tests
 */
function generatePermissionTests(config: DomainTestConfig): string {
  if (!config.permissions) return ''

  const roleTests = config.permissions.scenarios.map(scenario => `
    describe('${scenario.role} permissions', () => {
      let roleUser: any
      let roleClient: any

      beforeEach(async () => {
        roleUser = await createTestUser(testDb, { 
          organizationId: testOrganization.id,
          role: '${scenario.role}'
        })
        roleClient = createTestClient(roleUser.accessToken)
      })

      it('${scenario.canCreate ? 'should allow' : 'should deny'} creating ${config.entityName.toLowerCase()}', async () => {
        const response = await roleClient.post('${config.endpoints.create}', ${JSON.stringify(config.testData.valid)})
        
        expect(response.status).toBe(${scenario.canCreate ? '201' : '403'})
        expect(response.data.success).toBe(${scenario.canCreate})
        ${scenario.canCreate ? '' : "expect(response.data.error.code).toBe('FORBIDDEN')"}
      })

      it('${scenario.canRead ? 'should allow' : 'should deny'} reading ${config.entityName.toLowerCase()}s', async () => {
        const response = await roleClient.get('${config.endpoints.list}')
        
        expect(response.status).toBe(${scenario.canRead ? '200' : '403'})
        expect(response.data.success).toBe(${scenario.canRead})
        ${scenario.canRead ? '' : "expect(response.data.error.code).toBe('FORBIDDEN')"}
      })

      it('${scenario.canUpdate ? 'should allow' : 'should deny'} updating ${config.entityName.toLowerCase()}', async () => {
        // Create item as admin first
        const created = await testClient.post('${config.endpoints.create}', ${JSON.stringify(config.testData.valid)})
        const id = created.data.data.id
        
        const response = await roleClient.put(\`${config.endpoints.update}/\${id}\`, { name: 'Updated' })
        
        expect(response.status).toBe(${scenario.canUpdate ? '200' : '403'})
        expect(response.data.success).toBe(${scenario.canUpdate})
        ${scenario.canUpdate ? '' : "expect(response.data.error.code).toBe('FORBIDDEN')"}
      })

      it('${scenario.canDelete ? 'should allow' : 'should deny'} deleting ${config.entityName.toLowerCase()}', async () => {
        const created = await testClient.post('${config.endpoints.create}', ${JSON.stringify(config.testData.valid)})
        const id = created.data.data.id
        
        const response = await roleClient.delete(\`${config.endpoints.delete}/\${id}\`)
        
        expect(response.status).toBe(${scenario.canDelete ? '200' : '403'})
        expect(response.data.success).toBe(${scenario.canDelete})
        ${scenario.canDelete ? '' : "expect(response.data.error.code).toBe('FORBIDDEN')"}
      })
    })
  `).join('\n')

  return `
  describe('Permission Tests', () => {
    ${roleTests}

    it('should deny access without authentication', async () => {
      const unauthenticatedClient = createTestClient()
      
      const response = await unauthenticatedClient.get('${config.endpoints.list}')
      
      expect(response.status).toBe(401)
      expect(response.data.error.code).toBe('UNAUTHORIZED')
    })
  })
  `
}

/**
 * Generate performance tests
 */
function generatePerformanceTests(config: DomainTestConfig): string {
  return `
  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Create multiple items
      const createPromises = []
      for (let i = 0; i < 100; i++) {
        createPromises.push(
          testClient.post('${config.endpoints.create}', {
            ...${JSON.stringify(config.testData.valid)},
            name: \`Performance Test Item \${i + 1}\`
          })
        )
      }
      
      await Promise.all(createPromises)
      
      const start = Date.now()
      const response = await testClient.get('${config.endpoints.list}?limit=100')
      const duration = Date.now() - start
      
      expect(response.status).toBe(200)
      expect(response.data.data.items).toHaveLength(100)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should respond quickly to individual requests', async () => {
      const created = await testClient.post('${config.endpoints.create}', ${JSON.stringify(config.testData.valid)})
      const id = created.data.data.id
      
      const start = Date.now()
      const response = await testClient.get(\`${config.endpoints.get}/\${id}\`)
      const duration = Date.now() - start
      
      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(200) // Should complete within 200ms
    })

    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array(10).fill(null).map(() =>
        testClient.post('${config.endpoints.create}', {
          ...${JSON.stringify(config.testData.valid)},
          name: \`Concurrent Test \${Math.random()}\`
        })
      )
      
      const start = Date.now()
      const results = await Promise.all(concurrentRequests)
      const duration = Date.now() - start
      
      results.forEach(result => {
        expect(result.status).toBe(201)
        expect(result.data.success).toBe(true)
      })
      
      expect(duration).toBeLessThan(2000) // All should complete within 2 seconds
    })
  })
  `
}

/**
 * Generate error handling tests
 */
function generateErrorHandlingTests(config: DomainTestConfig): string {
  return `
  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection
      // Implementation depends on your testing setup
    })

    it('should return consistent error format', async () => {
      const response = await testClient.get('${config.endpoints.get}/invalid-id')
      
      expect(response.data).toHaveProperty('success', false)
      expect(response.data).toHaveProperty('error')
      expect(response.data.error).toHaveProperty('code')
      expect(response.data.error).toHaveProperty('message')
      expect(response.data).toHaveProperty('requestId')
    })

    it('should handle malformed JSON gracefully', async () => {
      const response = await testClient.post('${config.endpoints.create}', 'invalid json', {
        headers: { 'Content-Type': 'application/json' }
      })
      
      expect(response.status).toBe(400)
      expect(response.data.error.code).toMatch(/VALIDATION_ERROR|INVALID_JSON/)
    })
  })
  `
}

/**
 * Generate security tests
 */
function generateSecurityTests(config: DomainTestConfig): string {
  return `
  describe('Security Tests', () => {
    it('should prevent SQL injection in query parameters', async () => {
      const maliciousQuery = "'; DROP TABLE users; --"
      
      const response = await testClient.get(\`${config.endpoints.list}?search=\${encodeURIComponent(maliciousQuery)}\`)
      
      // Should not crash and should return proper response
      expect([200, 400]).toContain(response.status)
      expect(response.data).toHaveProperty('success')
    })

    it('should validate UUIDs properly', async () => {
      const invalidId = 'not-a-uuid'
      
      const response = await testClient.get(\`${config.endpoints.get}/\${invalidId}\`)
      
      expect(response.status).toBe(400)
      expect(response.data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should sanitize input data', async () => {
      const xssPayload = '<script>alert("xss")</script>'
      const maliciousData = {
        ...${JSON.stringify(config.testData.valid)},
        name: xssPayload,
        description: xssPayload
      }
      
      const response = await testClient.post('${config.endpoints.create}', maliciousData)
      
      if (response.status === 201) {
        // Data should be sanitized
        expect(response.data.data.name).not.toContain('<script>')
        expect(response.data.data.description).not.toContain('<script>')
      }
    })

    it('should enforce rate limits', async () => {
      // This test would need to be configured based on your rate limiting setup
      const requests = Array(100).fill(null).map(() => 
        testClient.get('${config.endpoints.list}')
      )
      
      const results = await Promise.allSettled(requests)
      const rateLimitedResponses = results.filter(
        result => result.status === 'fulfilled' && 
        (result.value as any).status === 429
      )
      
      // Some requests should be rate limited
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })
  `
}

/**
 * Generate necessary imports
 */
function generateImports(config: DomainTestConfig): string {
  return `
// Import domain-specific types and utilities
import { ${config.entityName} } from '@/domains/${config.domainName.toLowerCase()}'
  `
}

/**
 * Generate property-based tests using fast-check
 */
export function generatePropertyTests(config: DomainTestConfig): string {
  return `
import { fc } from 'fast-check'

describe('${config.entityName} Property-Based Tests', () => {
  it('should handle any valid ${config.entityName.toLowerCase()} data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.option(fc.string({ maxLength: 500 })),
          // Add more properties based on your schema
        }),
        async (data) => {
          const response = await testClient.post('${config.endpoints.create}', data)
          
          if (response.status === 201) {
            expect(response.data.success).toBe(true)
            expect(response.data.data).toMatchObject(data)
          } else {
            // If creation fails, it should be due to validation
            expect(response.status).toBe(400)
            expect(response.data.error.code).toBe('VALIDATION_ERROR')
          }
        }
      ),
      { numRuns: 50 } // Run 50 random test cases
    )
  })
})
  `
}