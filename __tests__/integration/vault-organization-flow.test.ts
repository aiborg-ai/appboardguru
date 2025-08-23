/**
 * @jest-environment jsdom
 */
import { testDb } from '../../tests/utils/test-database'
import { createApiMocks, mockAuthenticatedUser, createTestScenario } from '../utils/test-helpers'
import { OrganizationFactory, VaultFactory } from '../factories'
import vaultCreateHandler from '@/pages/api/vaults/create/route'
import organizationsHandler from '@/pages/api/organizations/route'

describe('Vault-Organization Creation Flow Integration', () => {
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

  describe('Organization Creation During Vault Creation', () => {
    it('should create organization and vault in single flow', async () => {
      const organizationData = OrganizationFactory.build(testUser.id, {
        name: 'Vault Flow Test Organization',
        slug: 'vault-flow-test-org',
        description: 'Created during vault creation flow',
      })

      const vaultData = VaultFactory.build({
        name: 'Integration Test Vault',
        description: 'Test vault with new organization',
        create_organization: true,
        organization_data: organizationData,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id, 'admin')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      const responseData = JSON.parse(res._getData())
      
      // Verify vault was created
      expect(responseData.vault).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Integration Test Vault',
          description: 'Test vault with new organization',
        })
      )

      // Verify organization was created
      expect(responseData.organization).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Vault Flow Test Organization',
          slug: 'vault-flow-test-org',
          description: 'Created during vault creation flow',
        })
      )

      // Verify vault is linked to organization
      expect(responseData.vault.organization_id).toBe(responseData.organization.id)

      // Verify in database
      const orgExists = await testDb.recordExists('organizations', responseData.organization.id)
      const vaultExists = await testDb.recordExists('vaults', responseData.vault.id)
      
      expect(orgExists).toBe(true)
      expect(vaultExists).toBe(true)

      // Verify organization membership
      const membershipCount = await testDb.countRecords('organization_members', {
        organization_id: responseData.organization.id,
        user_id: testUser.id,
        role: 'owner',
      })
      expect(membershipCount).toBe(1)
    })

    it('should handle existing organization selection during vault creation', async () => {
      // Create an existing organization first
      const existingOrg = await testDb.createOrganization({
        created_by: testUser.id,
        name: 'Existing Organization',
        slug: 'existing-org',
      })

      await testDb.addOrganizationMember(existingOrg.id, testUser.id, 'owner')

      const vaultData = VaultFactory.build({
        name: 'Test Vault with Existing Org',
        organization_id: existingOrg.id,
        create_organization: false,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id, 'admin')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      const responseData = JSON.parse(res._getData())
      
      // Should use existing organization
      expect(responseData.vault.organization_id).toBe(existingOrg.id)
      expect(responseData.organization).toEqual(
        expect.objectContaining({
          id: existingOrg.id,
          name: 'Existing Organization',
        })
      )
    })

    it('should validate organization data when creating new organization', async () => {
      const invalidOrgData = {
        name: '', // Empty name - invalid
        slug: 'invalid slug with spaces', // Invalid slug format
      }

      const vaultData = VaultFactory.build({
        name: 'Test Vault',
        create_organization: true,
        organization_data: invalidOrgData,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(400)

      const responseData = JSON.parse(res._getData())
      expect(responseData.errors).toContainEqual(
        expect.objectContaining({
          field: 'organization_data.name',
          message: expect.stringContaining('required'),
        })
      )
      expect(responseData.errors).toContainEqual(
        expect.objectContaining({
          field: 'organization_data.slug',
          message: expect.stringContaining('format'),
        })
      )
    })

    it('should handle duplicate organization slug gracefully', async () => {
      // Create organization with specific slug first
      await testDb.createOrganization({
        created_by: testUser.id,
        slug: 'duplicate-slug',
        name: 'Existing Organization',
      })

      const organizationData = OrganizationFactory.build(testUser.id, {
        name: 'New Organization',
        slug: 'duplicate-slug', // Same slug as existing
      })

      const vaultData = VaultFactory.build({
        name: 'Test Vault',
        create_organization: true,
        organization_data: organizationData,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      const responseData = JSON.parse(res._getData())
      
      // Should create organization with modified slug
      expect(responseData.organization.slug).toMatch(/^duplicate-slug-\d+$/)
      expect(responseData.organization.name).toBe('New Organization')
    })
  })

  describe('Organization Context Refresh Integration', () => {
    it('should refresh organization list after vault-organization creation', async () => {
      // Get initial organization count
      const initialReq = createApiMocks({
        method: 'GET',
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const initialAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(initialReq.req, 'auth' as any, 'get').mockReturnValue(initialAuth)

      await organizationsHandler(initialReq.req, initialReq.res)
      const initialData = JSON.parse(initialReq.res._getData())
      const initialCount = initialData.total

      // Create vault with new organization
      const organizationData = OrganizationFactory.build(testUser.id, {
        name: 'Context Refresh Test Organization',
        slug: 'context-refresh-test-org',
      })

      const vaultData = VaultFactory.build({
        name: 'Context Refresh Test Vault',
        create_organization: true,
        organization_data: organizationData,
      })

      const createReq = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const createAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(createReq.req, 'auth' as any, 'get').mockReturnValue(createAuth)

      await vaultCreateHandler(createReq.req, createReq.res)
      expect(createReq.res._getStatusCode()).toBe(201)

      // Get updated organization list
      const updatedReq = createApiMocks({
        method: 'GET',
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const updatedAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(updatedReq.req, 'auth' as any, 'get').mockReturnValue(updatedAuth)

      await organizationsHandler(updatedReq.req, updatedReq.res)
      const updatedData = JSON.parse(updatedReq.res._getData())
      
      // Should have one more organization
      expect(updatedData.total).toBe(initialCount + 1)
      
      // Should contain the newly created organization
      expect(updatedData.organizations).toContainEqual(
        expect.objectContaining({
          name: 'Context Refresh Test Organization',
          slug: 'context-refresh-test-org',
        })
      )
    })
  })

  describe('Vault Creation with Organization Features', () => {
    it('should inherit features from organization when creating vault', async () => {
      const organizationData = OrganizationFactory.build(testUser.id, {
        name: 'Feature Test Organization',
        features: ['vault-management', 'board-chat', 'document-annotations', 'ai-insights'],
      })

      const vaultData = VaultFactory.build({
        name: 'Feature Inheritance Vault',
        create_organization: true,
        organization_data: organizationData,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      const responseData = JSON.parse(res._getData())
      
      // Organization should have all specified features
      expect(responseData.organization.features).toEqual([
        'vault-management',
        'board-chat', 
        'document-annotations',
        'ai-insights',
      ])

      // Vault should inherit organization features
      expect(responseData.vault.enabled_features).toEqual(
        expect.arrayContaining(['vault-management', 'board-chat'])
      )
    })

    it('should handle organization with limited features', async () => {
      const organizationData = OrganizationFactory.build(testUser.id, {
        name: 'Limited Features Organization',
        subscription_tier: 'basic',
        features: ['vault-management'], // Only basic feature
      })

      const vaultData = VaultFactory.build({
        name: 'Limited Features Vault',
        create_organization: true,
        organization_data: organizationData,
        requested_features: ['vault-management', 'ai-insights'], // Request unavailable feature
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      const responseData = JSON.parse(res._getData())
      
      // Should only enable available features
      expect(responseData.vault.enabled_features).toEqual(['vault-management'])
      
      // Should include warnings about unavailable features
      expect(responseData.warnings).toContainEqual(
        expect.objectContaining({
          type: 'feature_unavailable',
          feature: 'ai-insights',
          message: expect.stringContaining('not available'),
        })
      )
    })
  })

  describe('Error Handling in Vault-Organization Flow', () => {
    it('should handle organization creation failure during vault creation', async () => {
      // Mock organization creation failure
      const mockOrgCreate = jest.spyOn(testDb, 'createOrganization')
      mockOrgCreate.mockRejectedValueOnce(new Error('Database constraint violation'))

      const organizationData = OrganizationFactory.build(testUser.id)
      const vaultData = VaultFactory.build({
        create_organization: true,
        organization_data: organizationData,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(500)

      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('Failed to create organization')
      
      // Should not create vault if organization creation fails
      const vaultCount = await testDb.countRecords('vaults', { created_by: testUser.id })
      expect(vaultCount).toBe(0)

      mockOrgCreate.mockRestore()
    })

    it('should handle vault creation failure after organization creation', async () => {
      // Mock vault creation failure
      const mockVaultCreate = jest.spyOn(testDb, 'createVault')
      mockVaultCreate.mockRejectedValueOnce(new Error('Vault creation failed'))

      const organizationData = OrganizationFactory.build(testUser.id)
      const vaultData = VaultFactory.build({
        create_organization: true,
        organization_data: organizationData,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(500)

      // Should rollback organization creation
      const orgCount = await testDb.countRecords('organizations', { 
        created_by: testUser.id,
        name: organizationData.name,
      })
      expect(orgCount).toBe(0)

      mockVaultCreate.mockRestore()
    })

    it('should handle permission errors for organization creation', async () => {
      const organizationData = OrganizationFactory.build(testUser.id)
      const vaultData = VaultFactory.build({
        create_organization: true,
        organization_data: organizationData,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      // Mock user with insufficient permissions
      const mockAuth = mockAuthenticatedUser(testUser.id, 'viewer')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(403)

      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('Insufficient permissions')
    })
  })

  describe('Audit Logging for Vault-Organization Flow', () => {
    it('should create audit logs for both organization and vault creation', async () => {
      const organizationData = OrganizationFactory.build(testUser.id, {
        name: 'Audit Log Test Organization',
      })

      const vaultData = VaultFactory.build({
        name: 'Audit Log Test Vault',
        create_organization: true,
        organization_data: organizationData,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultCreateHandler(req, res)

      expect(res._getStatusCode()).toBe(201)

      const responseData = JSON.parse(res._getData())

      // Check organization creation audit log
      const orgAuditCount = await testDb.countRecords('audit_logs', {
        user_id: testUser.id,
        resource_type: 'organization',
        resource_id: responseData.organization.id,
        action: 'create',
      })
      expect(orgAuditCount).toBe(1)

      // Check vault creation audit log
      const vaultAuditCount = await testDb.countRecords('audit_logs', {
        user_id: testUser.id,
        resource_type: 'vault',
        resource_id: responseData.vault.id,
        action: 'create',
      })
      expect(vaultAuditCount).toBe(1)
    })
  })

  describe('Performance Testing', () => {
    it('should create vault with organization efficiently', async () => {
      const organizationData = OrganizationFactory.build(testUser.id)
      const vaultData = VaultFactory.build({
        create_organization: true,
        organization_data: organizationData,
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      const startTime = Date.now()
      await vaultCreateHandler(req, res)
      const duration = Date.now() - startTime

      expect(res._getStatusCode()).toBe(201)
      expect(duration).toBeLessThan(3000) // Should complete in under 3 seconds
    })
  })
})