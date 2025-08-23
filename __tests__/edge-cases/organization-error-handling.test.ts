/**
 * @jest-environment jsdom
 */
import { testDb } from '../../tests/utils/test-database'
import { createApiMocks, mockAuthenticatedUser, createTestScenario } from '../utils/test-helpers'
import { OrganizationFactory, UserFactory } from '../factories'
import organizationsHandler from '@/pages/api/organizations/route'
import vaultCreateHandler from '@/pages/api/vaults/create/route'

describe('Organization Error Handling and Edge Cases', () => {
  let testUser: any
  let testScenario: any

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    testScenario = await createTestScenario('basic')
    testUser = testScenario.users[0]
  })

  afterEach(async () => {
    await testDb.clearTestData()
  })

  describe('Slug Generation and Validation Edge Cases', () => {
    it('should handle empty slug gracefully', async () => {
      const orgData = OrganizationFactory.build(testUser.id, {
        name: 'Organization Without Slug',
        slug: '', // Empty slug
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      const responseData = JSON.parse(res._getData())
      // Should auto-generate slug from name
      expect(responseData.organization.slug).toBe('organization-without-slug')
      expect(responseData.organization.name).toBe('Organization Without Slug')
    })

    it('should handle slug with special characters and normalize', async () => {
      const orgData = OrganizationFactory.build(testUser.id, {
        name: 'Test Org with Special Chars!',
        slug: 'test-org-with-special-chars!@#$%^&*()',
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      const responseData = JSON.parse(res._getData())
      // Should normalize slug to valid format
      expect(responseData.organization.slug).toMatch(/^[a-z0-9-]+$/)
      expect(responseData.organization.slug).not.toContain('!')
      expect(responseData.organization.slug).not.toContain('@')
    })

    it('should handle extremely long slug', async () => {
      const longSlug = 'a'.repeat(200) // 200 characters
      
      const orgData = OrganizationFactory.build(testUser.id, {
        name: 'Organization with Very Long Slug',
        slug: longSlug,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      const responseData = JSON.parse(res._getData())
      // Should truncate slug to reasonable length
      expect(responseData.organization.slug.length).toBeLessThanOrEqual(100)
      expect(responseData.organization.slug).toMatch(/^[a-z0-9-]+$/)
    })

    it('should handle Unicode characters in slug', async () => {
      const orgData = OrganizationFactory.build(testUser.id, {
        name: 'Organizaçión Española',
        slug: 'organizaçión-española',
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      const responseData = JSON.parse(res._getData())
      // Should convert to ASCII-safe slug
      expect(responseData.organization.slug).toMatch(/^[a-z0-9-]+$/)
      expect(responseData.organization.slug).toContain('organizacion')
      expect(responseData.organization.slug).toContain('espanola')
    })
  })

  describe('Authentication Edge Cases', () => {
    it('should handle expired JWT tokens', async () => {
      const orgData = OrganizationFactory.build(testUser.id)

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: 'Bearer expired-token' },
      })

      // Mock expired token
      jest.spyOn(req, 'auth' as any, 'get').mockImplementation(() => {
        throw new Error('Token expired')
      })

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(401)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('Unauthorized')
      expect(responseData.code).toBe('TOKEN_EXPIRED')
    })

    it('should handle malformed authorization header', async () => {
      const orgData = OrganizationFactory.build(testUser.id)

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: 'InvalidFormat' },
      })

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(401)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('Unauthorized')
      expect(responseData.code).toBe('INVALID_AUTH_HEADER')
    })

    it('should handle user with revoked permissions', async () => {
      // Create user with revoked permissions
      const revokedUser = await testDb.createUser({ 
        role: 'viewer',
        is_active: false, // Deactivated user
      })

      const orgData = OrganizationFactory.build(revokedUser.id)

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${revokedUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(revokedUser.id, 'viewer')
      mockAuth.isActive = false
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(403)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('Account deactivated')
    })

    it('should handle concurrent authentication sessions', async () => {
      const orgData = OrganizationFactory.build(testUser.id)

      // Simulate multiple concurrent requests with different session IDs
      const requests = Array.from({ length: 5 }, (_, i) => {
        const { req, res } = createApiMocks({
          method: 'POST',
          body: { ...orgData, name: `${orgData.name} ${i + 1}` },
          headers: { 
            authorization: `Bearer test-token-${testUser.id}`,
            'x-session-id': `session-${i + 1}`,
          },
        })

        const mockAuth = mockAuthenticatedUser(testUser.id)
        jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

        return { req, res }
      })

      // Execute all requests concurrently
      const results = await Promise.all(
        requests.map(({ req, res }) => organizationsHandler(req, res))
      )

      // All should succeed (authentication should handle concurrency)
      requests.forEach(({ res }) => {
        expect(res._getStatusCode()).toBe(201)
      })

      // Should create 5 different organizations
      const orgCount = await testDb.countRecords('organizations', { created_by: testUser.id })
      expect(orgCount).toBe(5)
    })
  })

  describe('Database Connection Edge Cases', () => {
    it('should handle database connection timeout', async () => {
      const mockTimeout = jest.spyOn(testDb, 'createOrganization')
      mockTimeout.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        })
      })

      const orgData = OrganizationFactory.build(testUser.id)

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(500)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('Database connection failed')
      expect(responseData.retry).toBe(true)

      mockTimeout.mockRestore()
    })

    it('should handle database constraint violations', async () => {
      const mockConstraint = jest.spyOn(testDb, 'createOrganization')
      mockConstraint.mockRejectedValue({
        code: '23505', // PostgreSQL unique constraint violation
        constraint: 'organizations_slug_unique',
        detail: 'Key (slug) already exists',
      })

      const orgData = OrganizationFactory.build(testUser.id)

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(409)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('already exists')
      expect(responseData.field).toBe('slug')

      mockConstraint.mockRestore()
    })

    it('should handle transaction rollback scenarios', async () => {
      let orgCreated = false
      let membershipCreated = false

      // Mock organization creation to succeed
      jest.spyOn(testDb, 'createOrganization').mockImplementation(async (data) => {
        orgCreated = true
        return { id: 'test-org-id', ...data }
      })

      // Mock membership creation to fail
      jest.spyOn(testDb, 'addOrganizationMember').mockImplementation(async () => {
        membershipCreated = true
        throw new Error('Failed to add member')
      })

      const orgData = OrganizationFactory.build(testUser.id)

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(500)

      // Transaction should rollback - organization should not exist
      const orgCount = await testDb.countRecords('organizations', { 
        created_by: testUser.id,
        name: orgData.name,
      })
      expect(orgCount).toBe(0)
    })
  })

  describe('Vault-Organization Creation Edge Cases', () => {
    it('should handle partial vault creation failure with organization rollback', async () => {
      const orgData = OrganizationFactory.build(testUser.id, {
        name: 'Test Rollback Organization',
      })

      const vaultData = {
        name: 'Test Rollback Vault',
        create_organization: true,
        organization_data: orgData,
        files: [], // Empty files array
      }

      // Mock vault creation to fail after organization creation
      jest.spyOn(testDb, 'createVault').mockRejectedValueOnce(
        new Error('Vault storage initialization failed')
      )

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(500)

      // Organization should be rolled back
      const orgCount = await testDb.countRecords('organizations', { 
        created_by: testUser.id,
        name: orgData.name,
      })
      expect(orgCount).toBe(0)

      // No orphaned vault should exist
      const vaultCount = await testDb.countRecords('vaults', { 
        created_by: testUser.id,
        name: vaultData.name,
      })
      expect(vaultCount).toBe(0)
    })

    it('should handle organization creation with invalid features', async () => {
      const orgData = OrganizationFactory.build(testUser.id, {
        features: ['invalid-feature', 'another-invalid-feature'], // Invalid features
      })

      const vaultData = {
        name: 'Test Invalid Features Vault',
        create_organization: true,
        organization_data: orgData,
      }

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(201) // Should succeed

      const responseData = JSON.parse(res._getData())
      
      // Should filter out invalid features
      expect(responseData.organization.features).not.toContain('invalid-feature')
      expect(responseData.organization.features).not.toContain('another-invalid-feature')
      
      // Should have warnings about invalid features
      expect(responseData.warnings).toContainEqual(
        expect.objectContaining({
          type: 'invalid_feature',
          feature: 'invalid-feature',
        })
      )
    })
  })

  describe('Context Refresh Edge Cases', () => {
    it('should handle context refresh failure gracefully', async () => {
      // Mock React Query cache failure (simulating frontend context refresh failure)
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      const orgData = OrganizationFactory.build(testUser.id)

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      // Organization should still be created even if context refresh fails
      const responseData = JSON.parse(res._getData())
      expect(responseData.organization).toBeDefined()

      // Should include refresh instructions in response
      expect(responseData.refresh_required).toBe(true)

      consoleSpy.mockRestore()
    })

    it('should handle stale organization data during navigation', async () => {
      // Create organization
      const orgData = OrganizationFactory.build(testUser.id, {
        name: 'Stale Data Test Organization',
        slug: 'stale-data-test-org',
      })

      const createReq = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(createReq.req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(createReq.req, createReq.res)
      expect(createReq.res._getStatusCode()).toBe(201)

      const createData = JSON.parse(createReq.res._getData())

      // Simulate fetching organization with stale data
      const fetchReq = createApiMocks({
        method: 'GET',
        query: { id: createData.organization.id },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      // Mock returning old timestamp to simulate stale data
      jest.spyOn(testDb, 'findOrganization').mockResolvedValueOnce({
        ...createData.organization,
        updated_at: new Date(Date.now() - 60000).toISOString(), // 1 minute old
      })

      jest.spyOn(fetchReq.req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(fetchReq.req, fetchReq.res)

      expect(fetchReq.res._getStatusCode()).toBe(200)

      const fetchData = JSON.parse(fetchReq.res._getData())
      
      // Should include cache headers for proper handling
      expect(fetchReq.res.getHeader('Cache-Control')).toContain('no-cache')
      expect(fetchData.organization.updated_at).toBeDefined()
    })
  })

  describe('Validation Edge Cases', () => {
    it('should handle malformed JSON payloads', async () => {
      const { req, res } = createApiMocks({
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          authorization: `Bearer test-token-${testUser.id}`,
        },
      })

      // Simulate malformed JSON
      req.body = '{"name": "Test Org", "invalid": json}'

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('Invalid JSON')
      expect(responseData.code).toBe('MALFORMED_JSON')
    })

    it('should handle extremely large payloads', async () => {
      const largeDescription = 'a'.repeat(1000000) // 1MB of text
      
      const orgData = OrganizationFactory.build(testUser.id, {
        description: largeDescription,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(413) // Payload too large
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('Payload too large')
    })

    it('should handle null and undefined values gracefully', async () => {
      const orgData = {
        name: 'Test Organization',
        slug: 'test-org',
        description: null,
        website: undefined,
        industry: '',
        features: null,
      }

      const { req, res } = createApiMocks({
        method: 'POST',
        body: orgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      const responseData = JSON.parse(res._getData())
      
      // Should handle null values gracefully
      expect(responseData.organization.description).toBe('')
      expect(responseData.organization.website).toBe('')
      expect(responseData.organization.industry).toBe('')
      expect(responseData.organization.features).toEqual([])
    })
  })

  describe('Rate Limiting Edge Cases', () => {
    it('should handle burst creation attempts', async () => {
      const requests = Array.from({ length: 20 }, (_, i) => {
        const orgData = OrganizationFactory.build(testUser.id, {
          name: `Burst Test Organization ${i + 1}`,
          slug: `burst-test-org-${i + 1}`,
        })

        const { req, res } = createApiMocks({
          method: 'POST',
          body: orgData,
          headers: { authorization: `Bearer test-token-${testUser.id}` },
        })

        const mockAuth = mockAuthenticatedUser(testUser.id)
        jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

        return organizationsHandler(req, res).then(() => ({ req, res }))
      })

      const results = await Promise.all(requests)

      // Some requests should be rate limited
      const rateLimited = results.filter(({ res }) => res._getStatusCode() === 429)
      const successful = results.filter(({ res }) => res._getStatusCode() === 201)

      expect(rateLimited.length).toBeGreaterThan(0) // Some should be rate limited
      expect(successful.length).toBeGreaterThan(0) // Some should succeed
      expect(rateLimited.length + successful.length).toBe(20) // All should have responses
    })
  })
})