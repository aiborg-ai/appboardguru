/**
 * @jest-environment jsdom
 */
import { testDb } from '../../../tests/utils/test-database'
import { createApiMocks, mockAuthenticatedUser, apiHelpers, createTestScenario } from '../../utils/test-helpers'
import { VaultFactory, AssetFactory } from '../../factories'
import vaultsHandler from '@/pages/api/vaults/route'

describe('Vaults API Integration Tests', () => {
  let testUser: any
  let testOrganization: any
  let testVault: any

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    const scenario = await createTestScenario('basic')
    testUser = scenario.users[0]
    testOrganization = scenario.organizations[0]
    testVault = scenario.vaults[0]
  })

  describe('GET /api/vaults', () => {
    it('should return user accessible vaults', async () => {
      const { req, res } = createApiMocks({
        method: 'GET',
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      apiHelpers.validateApiResponse(responseData, {
        vaults: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
      })

      expect(responseData.vaults).toContainEqual(
        expect.objectContaining({
          id: testVault.id,
          name: testVault.name,
          status: testVault.status,
        })
      )
    })

    it('should filter vaults by status', async () => {
      // Create vaults with different statuses
      await testDb.createVault({
        organization_id: testOrganization.id,
        created_by: testUser.id,
        status: 'active',
        name: 'Active Vault',
      })
      
      await testDb.createVault({
        organization_id: testOrganization.id,
        created_by: testUser.id,
        status: 'draft',
        name: 'Draft Vault',
      })

      const { req, res } = createApiMocks({
        method: 'GET',
        query: { status: 'active' },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      responseData.vaults.forEach((vault: any) => {
        expect(vault.status).toBe('active')
      })
    })

    it('should filter by organization', async () => {
      // Create another organization and vault
      const otherOrg = await testDb.createOrganization({
        created_by: testUser.id,
        name: 'Other Organization',
      })
      
      await testDb.createVault({
        organization_id: otherOrg.id,
        created_by: testUser.id,
        name: 'Other Org Vault',
      })

      const { req, res } = createApiMocks({
        method: 'GET',
        query: { organization_id: testOrganization.id },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      responseData.vaults.forEach((vault: any) => {
        expect(vault.organization_id).toBe(testOrganization.id)
      })
    })
  })

  describe('POST /api/vaults', () => {
    it('should create new vault successfully', async () => {
      const newVaultData = VaultFactory.build(testOrganization.id, testUser.id, {
        name: 'New Board Meeting Vault',
        description: 'Materials for upcoming board meeting',
        meeting_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        body: newVaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id, 'director')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)
      
      const responseData = JSON.parse(res._getData())
      apiHelpers.validateApiResponse(responseData, {
        vault: expect.objectContaining({
          id: expect.any(String),
          name: 'New Board Meeting Vault',
          organization_id: testOrganization.id,
          created_by: testUser.id,
          status: 'draft', // Default status
          priority: 'high',
        }),
      })

      // Verify vault was created in database
      await expectAsync(testDb.recordExists('vaults', responseData.vault.id)).resolves.toBe(true)
    })

    it('should validate required fields', async () => {
      const invalidVaultData = {
        name: '', // Empty name
        // Missing organization_id
      }

      const { req, res } = createApiMocks({
        method: 'POST',
        body: invalidVaultData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      
      const responseData = JSON.parse(res._getData())
      apiHelpers.validateErrorResponse(responseData, 400)
      expect(responseData.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'organization_id' }),
        ])
      )
    })

    it('should create vault from template', async () => {
      // First create a template vault
      const templateVault = await testDb.createVault({
        organization_id: testOrganization.id,
        created_by: testUser.id,
        is_template: true,
        name: 'Quarterly Board Meeting Template',
        agenda_items: [
          'Call to Order',
          'Financial Review',
          'Strategic Update',
          'New Business',
        ],
      })

      const vaultFromTemplate = {
        name: 'Q4 2024 Board Meeting',
        template_id: templateVault.id,
        meeting_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }

      const { req, res } = createApiMocks({
        method: 'POST',
        body: vaultFromTemplate,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.vault.template_id).toBe(templateVault.id)
      expect(responseData.vault.agenda_items).toEqual(templateVault.agenda_items)
    })
  })

  describe('GET /api/vaults/[id]', () => {
    it('should return vault details with assets', async () => {
      // Add some assets to the vault
      const asset1 = await testDb.createAsset({
        organization_id: testOrganization.id,
        uploaded_by: testUser.id,
        title: 'Financial Report',
      })
      
      const asset2 = await testDb.createAsset({
        organization_id: testOrganization.id,
        uploaded_by: testUser.id,
        title: 'Strategic Plan',
      })

      // Associate assets with vault
      await testDb.supabase
        .from('vault_assets')
        .insert([
          { vault_id: testVault.id, asset_id: asset1.id, added_by: testUser.id },
          { vault_id: testVault.id, asset_id: asset2.id, added_by: testUser.id },
        ])

      const { req, res } = createApiMocks({
        method: 'GET',
        query: { id: testVault.id, include: 'assets,members' },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      apiHelpers.validateApiResponse(responseData, {
        vault: expect.objectContaining({
          id: testVault.id,
          name: testVault.name,
          assets: expect.arrayContaining([
            expect.objectContaining({ title: 'Financial Report' }),
            expect.objectContaining({ title: 'Strategic Plan' }),
          ]),
          members: expect.any(Array),
        }),
      })
    })

    it('should check vault access permissions', async () => {
      // Create a user who is not a member of the organization
      const unauthorizedUser = await testDb.createUser({
        email: 'unauthorized@example.com',
        role: 'viewer',
      })

      const { req, res } = createApiMocks({
        method: 'GET',
        query: { id: testVault.id },
        headers: { authorization: `Bearer test-token-${unauthorizedUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(unauthorizedUser.id, 'viewer')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(403)
      apiHelpers.validateErrorResponse(
        JSON.parse(res._getData()),
        403,
        'Access denied'
      )
    })
  })

  describe('PUT /api/vaults/[id]', () => {
    it('should update vault successfully', async () => {
      const updateData = {
        name: 'Updated Vault Name',
        description: 'Updated description',
        status: 'active',
        priority: 'critical',
        meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }

      const { req, res } = createApiMocks({
        method: 'PUT',
        query: { id: testVault.id },
        body: updateData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id, 'director')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      apiHelpers.validateApiResponse(responseData, {
        vault: expect.objectContaining({
          id: testVault.id,
          name: 'Updated Vault Name',
          status: 'active',
          priority: 'critical',
          updated_at: expect.any(String),
        }),
      })
    })

    it('should validate status transitions', async () => {
      // Try to change from draft to archived without going through active
      const invalidUpdate = {
        status: 'archived',
      }

      const { req, res } = createApiMocks({
        method: 'PUT',
        query: { id: testVault.id },
        body: invalidUpdate,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      apiHelpers.validateErrorResponse(
        JSON.parse(res._getData()),
        400,
        'Invalid status transition'
      )
    })
  })

  describe('POST /api/vaults/[id]/assets', () => {
    it('should add asset to vault', async () => {
      const asset = await testDb.createAsset({
        organization_id: testOrganization.id,
        uploaded_by: testUser.id,
        title: 'New Board Document',
      })

      const { req, res } = createApiMocks({
        method: 'POST',
        url: `/api/vaults/${testVault.id}/assets`,
        body: { asset_id: asset.id },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)
      
      // Verify asset was associated with vault
      const association = await testDb.supabase
        .from('vault_assets')
        .select('*')
        .eq('vault_id', testVault.id)
        .eq('asset_id', asset.id)
        .single()

      expect(association.data).not.toBeNull()
    })

    it('should prevent adding duplicate assets', async () => {
      const asset = await testDb.createAsset({
        organization_id: testOrganization.id,
        uploaded_by: testUser.id,
      })

      // First addition
      await testDb.supabase
        .from('vault_assets')
        .insert({ vault_id: testVault.id, asset_id: asset.id, added_by: testUser.id })

      // Attempt duplicate addition
      const { req, res } = createApiMocks({
        method: 'POST',
        url: `/api/vaults/${testVault.id}/assets`,
        body: { asset_id: asset.id },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(409)
      apiHelpers.validateErrorResponse(
        JSON.parse(res._getData()),
        409,
        'Asset already in vault'
      )
    })
  })

  describe('POST /api/vaults/[id]/invite', () => {
    it('should invite user to vault', async () => {
      const userToInvite = await testDb.createUser({
        email: 'invited@example.com',
        role: 'director',
      })

      // Add user to organization first
      await testDb.addOrganizationMember(testOrganization.id, userToInvite.id, 'member')

      const invitationData = {
        user_id: userToInvite.id,
        role: 'viewer',
        message: 'Please review the board materials',
      }

      const { req, res } = createApiMocks({
        method: 'POST',
        url: `/api/vaults/${testVault.id}/invite`,
        body: invitationData,
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id, 'director')
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)
      
      const responseData = JSON.parse(res._getData())
      apiHelpers.validateApiResponse(responseData, {
        invitation: expect.objectContaining({
          vault_id: testVault.id,
          user_id: userToInvite.id,
          role: 'viewer',
          status: 'pending',
        }),
      })

      // Verify invitation was created
      await expectAsync(
        testDb.recordExists('vault_invitations', responseData.invitation.id)
      ).resolves.toBe(true)
    })

    it('should send notification email for invitation', async () => {
      const userToInvite = await testDb.createUser({
        email: 'boardmember@example.com',
      })

      await testDb.addOrganizationMember(testOrganization.id, userToInvite.id, 'member')

      const { req, res } = createApiMocks({
        method: 'POST',
        url: `/api/vaults/${testVault.id}/invite`,
        body: { user_id: userToInvite.id, role: 'viewer' },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(201)
      
      // Verify email service was called
      expect(mockServices.emailService.sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'boardmember@example.com',
          vaultName: testVault.name,
        })
      )
    })
  })

  describe('Performance and Load Tests', () => {
    it('should handle large vault lists efficiently', async () => {
      // Create many vaults
      const manyVaults = Array.from({ length: 50 }, (_, i) =>
        VaultFactory.build(testOrganization.id, testUser.id, {
          name: `Vault ${i + 1}`,
        })
      )

      for (const vault of manyVaults) {
        await testDb.createVault(vault)
      }

      const { req, res } = createApiMocks({
        method: 'GET',
        query: { limit: '25' },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      const startTime = Date.now()
      await vaultsHandler(req, res)
      const duration = Date.now() - startTime

      expect(res._getStatusCode()).toBe(200)
      expect(duration).toBeLessThan(2000) // Should complete in under 2 seconds

      const responseData = JSON.parse(res._getData())
      expect(responseData.vaults).toHaveLength(25)
    })

    it('should handle concurrent vault access efficiently', async () => {
      // Simulate multiple users accessing the same vault
      const concurrentRequests = Array.from({ length: 10 }, () => {
        const { req, res } = createApiMocks({
          method: 'GET',
          query: { id: testVault.id },
          headers: { authorization: `Bearer test-token-${testUser.id}` },
        })

        const mockAuth = mockAuthenticatedUser(testUser.id)
        jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

        return vaultsHandler(req, res)
      })

      const startTime = Date.now()
      await Promise.all(concurrentRequests)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(3000) // All requests should complete in under 3 seconds
    })
  })

  describe('Search and Filtering', () => {
    it('should search vaults by name and description', async () => {
      await testDb.createVault({
        organization_id: testOrganization.id,
        created_by: testUser.id,
        name: 'Emergency Board Session',
        description: 'Urgent decision required',
      })

      const { req, res } = createApiMocks({
        method: 'GET',
        query: { search: 'emergency' },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.vaults.length).toBeGreaterThan(0)
      
      responseData.vaults.forEach((vault: any) => {
        expect(
          vault.name.toLowerCase().includes('emergency') ||
          vault.description?.toLowerCase().includes('emergency')
        ).toBe(true)
      })
    })

    it('should filter by meeting date range', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      
      await testDb.createVault({
        organization_id: testOrganization.id,
        created_by: testUser.id,
        meeting_date: futureDate.toISOString(),
        name: 'Future Meeting',
      })

      const { req, res } = createApiMocks({
        method: 'GET',
        query: {
          meeting_date_from: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          meeting_date_to: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        },
        headers: { authorization: `Bearer test-token-${testUser.id}` },
      })

      const mockAuth = mockAuthenticatedUser(testUser.id)
      jest.spyOn(req, 'auth' as any, 'get').mockReturnValue(mockAuth)

      await vaultsHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      responseData.vaults.forEach((vault: any) => {
        if (vault.meeting_date) {
          const meetingDate = new Date(vault.meeting_date)
          expect(meetingDate.getTime()).toBeGreaterThan(Date.now() + 15 * 24 * 60 * 60 * 1000)
          expect(meetingDate.getTime()).toBeLessThan(Date.now() + 45 * 24 * 60 * 60 * 1000)
        }
      })
    })
  })
})