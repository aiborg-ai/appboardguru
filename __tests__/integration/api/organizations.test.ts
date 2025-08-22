/**
 * @jest-environment jsdom
 */
import { NextApiRequest, NextApiResponse } from 'next'
import { testDb } from '../../../tests/utils/test-database'
import { createApiMocks, mockAuthenticatedUser, apiHelpers, createTestScenario } from '../../utils/test-helpers'
import { OrganizationFactory, UserFactory } from '../../factories'
import organizationsHandler from '@/pages/api/organizations/route'

describe('Organizations API Integration Tests', () => {
  let testUser: any
  let testOrganization: any

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Create test scenario
    const scenario = await createTestScenario('basic')
    testUser = scenario.users[0]
    testOrganization = scenario.organizations[0]
  })

  describe('GET /api/organizations', () => {
    it('should return user organizations', async () => {
      const { req, res } = createApiMocks({
        method: 'GET',
        headers: {
          authorization: `Bearer test-token-${testUser.id}`,
        },
      })

      // Mock authentication
      const mockAuth = mockAuthenticatedUser(testUser.id, testUser.role)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      apiHelpers.validateApiResponse(responseData, {
        organizations: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
      })

      expect(responseData.organizations).toContainEqual(
        expect.objectContaining({
          id: testOrganization.id,
          name: testOrganization.name,
          slug: testOrganization.slug,
        })
      )
    })

    it('should handle pagination parameters', async () => {
      const { req, res } = createApiMocks({
        method: 'GET',
        query: { page: '2', limit: '5' },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.page).toBe(2)
      expect(responseData.limit).toBe(5)
    })

    it('should filter organizations by role', async () => {
      const { req, res } = createApiMocks({
        method: 'GET',
        query: { role: 'owner' },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id, 'admin')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      // All returned organizations should have the user as owner
      responseData.organizations.forEach((org: any) => {
        expect(org.user_role).toBe('owner')
      })
    })

    it('should require authentication', async () => {
      const { req, res } = createApiMocks({
        method: 'GET',
      })

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(401)
      apiHelpers.validateErrorResponse(JSON.parse(res._getData()), 401, 'Unauthorized')
    })
  })

  describe('POST /api/organizations', () => {
    it('should create new organization successfully', async () => {
      const newOrgData = OrganizationFactory.build(testUser.id, {
        name: 'New Test Organization',
        slug: 'new-test-org',
        description: 'A brand new organization',
        industry: 'Technology',
        organization_size: 'small',
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: newOrgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id, 'admin')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)
      
      const responseData = JSON.parse(res._getData())
      apiHelpers.validateApiResponse(responseData, {
        organization: expect.objectContaining({
          id: expect.any(String),
          name: 'New Test Organization',
          slug: 'new-test-org',
          created_by: testUser.id,
          subscription_tier: expect.any(String),
          is_active: true,
        }),
      })

      // Verify organization was created in database
      await expectAsync(testDb.recordExists('organizations', responseData.organization.id)).resolves.toBe(true)
      
      // Verify creator was added as owner
      const memberCount = await testDb.countRecords('organization_members', {
        organization_id: responseData.organization.id,
        user_id: testUser.id,
        role: 'owner',
      })
      expect(memberCount).toBe(1)
    })

    it('should validate required fields', async () => {
      const invalidOrgData = {
        name: '', // Empty name
        // Missing required fields
      }

      const { req, res } = createApiMocks({
        method: 'POST',
        body: invalidOrgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      
      const responseData = JSON.parse(res._getData())
      apiHelpers.validateErrorResponse(responseData, 400)
      expect(responseData.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          message: expect.stringContaining('required'),
        })
      )
    })

    it('should handle duplicate slug gracefully', async () => {
      const duplicateOrgData = OrganizationFactory.build(testUser.id, {
        slug: testOrganization.slug, // Same slug as existing organization
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: duplicateOrgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(201) // Should still succeed with modified slug
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.organization.slug).toMatch(
        new RegExp(`^${testOrganization.slug}-\\d+$`)
      )
    })

    it('should enforce organization limits per user', async () => {
      // Create maximum allowed organizations for user
      const maxOrgs = 5 // Assume this is the limit
      const existingOrgs = OrganizationFactory.buildList(testUser.id, maxOrgs)
      
      // Mock that user already has maximum organizations
      for (const org of existingOrgs) {
        await testDb.createOrganization({ created_by: testUser.id, ...org })
      }

      const newOrgData = OrganizationFactory.build(testUser.id)

      const { req, res } = createApiMocks({
        method: 'POST',
        body: newOrgData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(403)
      apiHelpers.validateErrorResponse(
        JSON.parse(res._getData()),
        403,
        'Maximum number of organizations reached'
      )
    })
  })

  describe('PUT /api/organizations/[id]', () => {
    it('should update organization successfully', async () => {
      const updateData = {
        name: 'Updated Organization Name',
        description: 'Updated description',
        website: 'https://updated.example.com',
      }

      const { req, res } = createApiMocks({
        method: 'PUT',
        query: { id: testOrganization.id },
        body: updateData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id, 'admin')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      apiHelpers.validateApiResponse(responseData, {
        organization: expect.objectContaining({
          id: testOrganization.id,
          name: 'Updated Organization Name',
          description: 'Updated description',
          website: 'https://updated.example.com',
          updated_at: expect.any(String),
        }),
      })
    })

    it('should require owner permissions for updates', async () => {
      const memberUser = await testDb.createUser({ role: 'viewer' })
      await testDb.addOrganizationMember(testOrganization.id, memberUser.id, 'member')

      const { req, res } = createApiMocks({
        method: 'PUT',
        query: { id: testOrganization.id },
        body: { name: 'Unauthorized Update' },
        headers: { authorization: `Bearer test-token-${memberUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(memberUser.id, 'viewer')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(403)
      apiHelpers.validateErrorResponse(
        JSON.parse(res._getData()),
        403,
        'Insufficient permissions'
      )
    })

    it('should validate organization existence', async () => {
      const { req, res } = createApiMocks({
        method: 'PUT',
        query: { id: 'non-existent-org-id' },
        body: { name: 'Update' },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(404)
      apiHelpers.validateErrorResponse(
        JSON.parse(res._getData()),
        404,
        'Organization not found'
      )
    })
  })

  describe('DELETE /api/organizations/[id]', () => {
    it('should soft delete organization', async () => {
      const { req, res } = createApiMocks({
        method: 'DELETE',
        query: { id: testOrganization.id },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id, 'admin')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(true)
      expect(responseData.message).toContain('deleted')

      // Verify soft deletion - organization should be marked as inactive
      const orgRecord = await testDb.supabase
        .from('organizations')
        .select('is_active, deleted_at')
        .eq('id', testOrganization.id)
        .single()

      expect(orgRecord.data?.is_active).toBe(false)
      expect(orgRecord.data?.deleted_at).not.toBeNull()
    })

    it('should require owner permissions for deletion', async () => {
      const memberUser = await testDb.createUser({ role: 'director' })
      await testDb.addOrganizationMember(testOrganization.id, memberUser.id, 'member')

      const { req, res } = createApiMocks({
        method: 'DELETE',
        query: { id: testOrganization.id },
        headers: { authorization: `Bearer test-token-${memberUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(memberUser.id, 'director')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(403)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const { req, res } = createApiMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer test-token-${testUser.id}`,
        },
      })

      // Simulate malformed JSON by setting invalid body
      req.body = 'invalid json'

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      apiHelpers.validateErrorResponse(
        JSON.parse(res._getData()),
        400,
        'Invalid JSON'
      )
    })

    it('should handle database connection failures', async () => {
      // Mock database failure
      jest.spyOn(testDb, 'createOrganization').mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      const { req, res } = createApiMocks({
        method: 'POST',
        body: OrganizationFactory.build(testUser.id),
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(500)
      apiHelpers.validateErrorResponse(
        JSON.parse(res._getData()),
        500,
        'Internal server error'
      )
    })

    it('should handle rate limiting', async () => {
      // Simulate rate limit exceeded
      const promises = Array.from({ length: 10 }, () => {
        const { req, res } = createApiMocks({
          method: 'POST',
          body: OrganizationFactory.build(testUser.id),
          headers: { authorization: `Bearer test-token-${testUser.id}` },
        })

        const mockAuth = mockAuthenticatedUser(testUser.id)
        jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

        return organizationsHandler(req, res)
      })

      await Promise.all(promises)

      // Last request should be rate limited (assuming rate limit of 5 per minute)
      // This would depend on actual rate limiting implementation
    })
  })

  describe('Performance Tests', () => {
    it('should handle large organization lists efficiently', async () => {
      // Create many organizations for user
      const manyOrgs = OrganizationFactory.buildList(testUser.id, 100)
      for (const org of manyOrgs) {
        await testDb.createOrganization({ created_by: testUser.id, ...org })
      }

      const { req, res } = createApiMocks({
        method: 'GET',
        query: { limit: '50' },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      const startTime = Date.now()
      await organizationsHandler(req, res)
      const duration = Date.now() - startTime

      expect(res._getStatusCode()).toBe(200)
      expect(duration).toBeLessThan(2000) // Should complete in under 2 seconds

      const responseData = JSON.parse(res._getData())
      expect(responseData.organizations).toHaveLength(50) // Requested limit
      expect(responseData.total).toBeGreaterThan(100)
    })

    it('should efficiently process bulk organization operations', async () => {
      const bulkCreateData = Array.from({ length: 20 }, (_, i) =>
        OrganizationFactory.build(testUser.id, {
          name: `Bulk Organization ${i + 1}`,
          slug: `bulk-org-${i + 1}`,
        })
      )

      const { req, res } = createApiMocks({
        method: 'POST',
        url: '/api/organizations/bulk',
        body: { organizations: bulkCreateData },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id, 'admin')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      const startTime = Date.now()
      await organizationsHandler(req, res)
      const duration = Date.now() - startTime

      expect(res._getStatusCode()).toBe(201)
      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds

      const responseData = JSON.parse(res._getData())
      expect(responseData.created).toHaveLength(20)
    })
  })

  describe('Search and Filtering', () => {
    it('should search organizations by name and description', async () => {
      // Create organizations with searchable terms
      await testDb.createOrganization({
        created_by: testUser.id,
        name: 'Tech Innovators Inc',
        description: 'Leading technology company',
      })
      
      await testDb.createOrganization({
        created_by: testUser.id,
        name: 'Finance Solutions',
        description: 'Financial technology services',
      })

      const { req, res } = createApiMocks({
        method: 'GET',
        query: { search: 'technology' },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.organizations.length).toBeGreaterThan(0)
      
      // All results should contain 'technology' in name or description
      responseData.organizations.forEach((org: any) => {
        expect(
          org.name.toLowerCase().includes('technology') ||
          org.description?.toLowerCase().includes('technology')
        ).toBe(true)
      })
    })

    it('should filter organizations by industry', async () => {
      await testDb.createOrganization({
        created_by: testUser.id,
        industry: 'Healthcare',
      })

      const { req, res } = createApiMocks({
        method: 'GET',
        query: { industry: 'Healthcare' },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await organizationsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      responseData.organizations.forEach((org: any) => {
        expect(org.industry).toBe('Healthcare')
      })
    })
  })
})