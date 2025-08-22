/**
 * @jest-environment jsdom
 */
import { OrganizationService } from '@/lib/services/organization'
import { OrganizationRepository } from '@/lib/repositories/organization.repository'
import { UserRepository } from '@/lib/repositories/user.repository'
import { testDb } from '../../../tests/utils/test-database'
import { OrganizationFactory, UserFactory } from '../../factories'
import { testAssertions, mockServices, performanceHelpers } from '../../utils/test-helpers'

// Mock repositories
jest.mock('@/lib/repositories/organization.repository')
jest.mock('@/lib/repositories/user.repository')

describe('OrganizationService', () => {
  let organizationService: OrganizationService
  let mockOrgRepository: jest.Mocked<OrganizationRepository>
  let mockUserRepository: jest.Mocked<UserRepository>
  let testUser: any
  let testOrganization: any

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Create mock repositories
    mockOrgRepository = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
      updateMemberRole: jest.fn(),
      getMembers: jest.fn(),
      search: jest.fn(),
      findByUser: jest.fn(),
      getStats: jest.fn(),
      updateSubscription: jest.fn(),
      validateSlugAvailability: jest.fn(),
    } as any

    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      validatePermissions: jest.fn(),
    } as any

    organizationService = new OrganizationService(mockOrgRepository, mockUserRepository)

    // Create test data
    testUser = await testDb.createUser({
      email: 'owner@example.com',
      role: 'admin',
    })

    testOrganization = await testDb.createOrganization({
      created_by: testUser.id,
      name: 'Test Organization',
      slug: 'test-org',
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createOrganization', () => {
    it('should create organization successfully', async () => {
      const orgData = OrganizationFactory.build(testUser.id, {
        name: 'New Organization',
        slug: 'new-org',
      })

      mockOrgRepository.validateSlugAvailability.mockResolvedValue(true)
      mockOrgRepository.create.mockResolvedValue(orgData)
      mockOrgRepository.addMember.mockResolvedValue({
        user_id: testUser.id,
        role: 'owner',
      })

      const result = await organizationService.createOrganization(testUser.id, orgData)

      expect(mockOrgRepository.validateSlugAvailability).toHaveBeenCalledWith('new-org')
      expect(mockOrgRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Organization',
        slug: 'new-org',
        created_by: testUser.id,
      }))
      expect(mockOrgRepository.addMember).toHaveBeenCalledWith(
        orgData.id,
        testUser.id,
        'owner'
      )
      expect(result).toEqual(orgData)
    })

    it('should auto-generate slug if not provided', async () => {
      const orgData = OrganizationFactory.build(testUser.id, {
        name: 'My New Organization',
        slug: undefined,
      })

      mockOrgRepository.validateSlugAvailability.mockResolvedValue(true)
      mockOrgRepository.create.mockResolvedValue(orgData)
      mockOrgRepository.addMember.mockResolvedValue({})

      const result = await organizationService.createOrganization(testUser.id, orgData)

      expect(mockOrgRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        slug: expect.stringMatching(/^my-new-organization/),
      }))
    })

    it('should handle slug conflicts by appending number', async () => {
      mockOrgRepository.validateSlugAvailability
        .mockResolvedValueOnce(false) // First attempt fails
        .mockResolvedValueOnce(false) // Second attempt fails
        .mockResolvedValueOnce(true)  // Third attempt succeeds

      const orgData = OrganizationFactory.build(testUser.id, {
        name: 'Duplicate Name',
        slug: 'duplicate-name',
      })

      mockOrgRepository.create.mockResolvedValue(orgData)
      mockOrgRepository.addMember.mockResolvedValue({})

      await organizationService.createOrganization(testUser.id, orgData)

      expect(mockOrgRepository.validateSlugAvailability).toHaveBeenCalledTimes(3)
      expect(mockOrgRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'duplicate-name-2',
      }))
    })

    it('should throw error if user already has too many organizations', async () => {
      mockOrgRepository.findByUser.mockResolvedValue(
        Array(10).fill(OrganizationFactory.build(testUser.id)) // Max limit reached
      )

      const orgData = OrganizationFactory.build(testUser.id)

      await expect(
        organizationService.createOrganization(testUser.id, orgData)
      ).rejects.toThrow('Maximum number of organizations reached')
    })
  })

  describe('inviteMember', () => {
    it('should invite new member successfully', async () => {
      const invitedUser = UserFactory.build({ email: 'newmember@example.com' })
      
      mockUserRepository.validatePermissions.mockResolvedValue(true) // User can invite
      mockUserRepository.findByEmail.mockResolvedValue(invitedUser)
      mockOrgRepository.getMembers.mockResolvedValue([]) // User not already member
      mockOrgRepository.addMember.mockResolvedValue({
        user_id: invitedUser.id,
        role: 'member',
      })

      const result = await organizationService.inviteMember(
        testOrganization.id,
        testUser.id,
        'newmember@example.com',
        'member'
      )

      expect(mockUserRepository.validatePermissions).toHaveBeenCalledWith(
        testUser.id,
        'invite_members',
        testOrganization.id
      )
      expect(mockOrgRepository.addMember).toHaveBeenCalledWith(
        testOrganization.id,
        invitedUser.id,
        'member'
      )
      expect(mockServices.emailService.sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newmember@example.com',
          organizationName: expect.any(String),
          inviterName: expect.any(String),
        })
      )
    })

    it('should throw error if user lacks permission to invite', async () => {
      mockUserRepository.validatePermissions.mockResolvedValue(false)

      await expect(
        organizationService.inviteMember(
          testOrganization.id,
          testUser.id,
          'newmember@example.com',
          'member'
        )
      ).rejects.toThrow('Insufficient permissions to invite members')
    })

    it('should throw error if user already a member', async () => {
      const existingUser = UserFactory.build()
      
      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockUserRepository.findByEmail.mockResolvedValue(existingUser)
      mockOrgRepository.getMembers.mockResolvedValue([
        { user_id: existingUser.id, role: 'member', status: 'active' }
      ])

      await expect(
        organizationService.inviteMember(
          testOrganization.id,
          testUser.id,
          existingUser.email,
          'member'
        )
      ).rejects.toThrow('User is already a member of this organization')
    })

    it('should handle inviting non-existent user by creating invitation', async () => {
      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockUserRepository.findByEmail.mockResolvedValue(null) // User doesn't exist

      const result = await organizationService.inviteMember(
        testOrganization.id,
        testUser.id,
        'nonexistent@example.com',
        'member'
      )

      expect(result.type).toBe('invitation_created')
      expect(result.email).toBe('nonexistent@example.com')
    })
  })

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      const memberToRemove = UserFactory.build()
      
      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockOrgRepository.getMembers.mockResolvedValue([
        { user_id: testUser.id, role: 'owner' },
        { user_id: memberToRemove.id, role: 'member' },
      ])
      mockOrgRepository.removeMember.mockResolvedValue(true)

      const result = await organizationService.removeMember(
        testOrganization.id,
        testUser.id,
        memberToRemove.id!
      )

      expect(mockOrgRepository.removeMember).toHaveBeenCalledWith(
        testOrganization.id,
        memberToRemove.id
      )
      expect(result).toBe(true)
    })

    it('should prevent removing the last owner', async () => {
      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockOrgRepository.getMembers.mockResolvedValue([
        { user_id: testUser.id, role: 'owner' }, // Only owner
      ])

      await expect(
        organizationService.removeMember(
          testOrganization.id,
          testUser.id,
          testUser.id
        )
      ).rejects.toThrow('Cannot remove the last owner')
    })

    it('should allow owner to remove themselves if other owners exist', async () => {
      const otherOwner = UserFactory.build()
      
      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockOrgRepository.getMembers.mockResolvedValue([
        { user_id: testUser.id, role: 'owner' },
        { user_id: otherOwner.id, role: 'owner' }, // Another owner exists
      ])
      mockOrgRepository.removeMember.mockResolvedValue(true)

      const result = await organizationService.removeMember(
        testOrganization.id,
        testUser.id,
        testUser.id
      )

      expect(result).toBe(true)
    })
  })

  describe('updateMemberRole', () => {
    it('should update member role successfully', async () => {
      const memberToUpdate = UserFactory.build()
      
      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockOrgRepository.getMembers.mockResolvedValue([
        { user_id: testUser.id, role: 'owner' },
        { user_id: memberToUpdate.id, role: 'member' },
      ])
      mockOrgRepository.updateMemberRole.mockResolvedValue({
        user_id: memberToUpdate.id,
        role: 'admin',
      })

      const result = await organizationService.updateMemberRole(
        testOrganization.id,
        testUser.id,
        memberToUpdate.id!,
        'admin'
      )

      expect(mockOrgRepository.updateMemberRole).toHaveBeenCalledWith(
        testOrganization.id,
        memberToUpdate.id,
        'admin'
      )
      expect(result.role).toBe('admin')
    })

    it('should prevent demoting the last owner', async () => {
      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockOrgRepository.getMembers.mockResolvedValue([
        { user_id: testUser.id, role: 'owner' }, // Only owner
      ])

      await expect(
        organizationService.updateMemberRole(
          testOrganization.id,
          testUser.id,
          testUser.id,
          'admin'
        )
      ).rejects.toThrow('Cannot demote the last owner')
    })
  })

  describe('getOrganizationStats', () => {
    it('should return comprehensive organization statistics', async () => {
      const mockStats = {
        total_members: 15,
        active_members: 12,
        pending_members: 3,
        total_vaults: 8,
        active_vaults: 6,
        total_assets: 45,
        storage_used_bytes: 1073741824,
      }

      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockOrgRepository.getStats.mockResolvedValue(mockStats)

      const result = await organizationService.getOrganizationStats(
        testOrganization.id,
        testUser.id
      )

      expect(result).toEqual(expect.objectContaining({
        ...mockStats,
        storage_used_gb: 1, // Converted from bytes
        growth_metrics: expect.any(Object),
        activity_summary: expect.any(Object),
      }))
    })

    it('should calculate growth metrics correctly', async () => {
      const mockStats = {
        total_members: 20,
        total_vaults: 10,
        total_assets: 50,
      }

      mockOrgRepository.getStats.mockResolvedValue(mockStats)
      
      // Mock historical data for growth calculation
      mockOrgRepository.getStats
        .mockResolvedValueOnce(mockStats) // Current
        .mockResolvedValueOnce({ // Previous month
          total_members: 18,
          total_vaults: 8,
          total_assets: 40,
        })

      const result = await organizationService.getOrganizationStats(
        testOrganization.id,
        testUser.id
      )

      expect(result.growth_metrics).toEqual(expect.objectContaining({
        members_growth_rate: expect.any(Number),
        vaults_growth_rate: expect.any(Number),
        assets_growth_rate: expect.any(Number),
      }))
    })
  })

  describe('updateSubscription', () => {
    it('should update subscription tier successfully', async () => {
      const subscriptionData = {
        subscription_tier: 'enterprise',
        features_enabled: {
          advanced_analytics: true,
          ai_insights: true,
          compliance_tracking: true,
        },
      }

      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockOrgRepository.updateSubscription.mockResolvedValue({
        ...testOrganization,
        ...subscriptionData,
      })

      const result = await organizationService.updateSubscription(
        testOrganization.id,
        testUser.id,
        subscriptionData
      )

      expect(mockOrgRepository.updateSubscription).toHaveBeenCalledWith(
        testOrganization.id,
        subscriptionData
      )
      expect(result.subscription_tier).toBe('enterprise')
    })

    it('should validate subscription tier transitions', async () => {
      mockUserRepository.validatePermissions.mockResolvedValue(true)
      
      // Try to downgrade from enterprise to free (should fail)
      await expect(
        organizationService.updateSubscription(
          testOrganization.id,
          testUser.id,
          { subscription_tier: 'free' }
        )
      ).rejects.toThrow('Invalid subscription tier transition')
    })

    it('should handle billing integration', async () => {
      const subscriptionData = {
        subscription_tier: 'premium',
        billing_cycle: 'annual',
      }

      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockOrgRepository.updateSubscription.mockResolvedValue({
        ...testOrganization,
        ...subscriptionData,
      })

      await organizationService.updateSubscription(
        testOrganization.id,
        testUser.id,
        subscriptionData
      )

      // Verify billing system was notified
      expect(mockServices.billingService?.updateSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: testOrganization.id,
          tier: 'premium',
          cycle: 'annual',
        })
      )
    })
  })

  describe('searchOrganizations', () => {
    it('should search organizations with filters', async () => {
      const expectedOrgs = OrganizationFactory.buildList(testUser.id, 5)
      
      mockOrgRepository.search.mockResolvedValue(expectedOrgs)

      const result = await organizationService.searchOrganizations('tech', {
        limit: 10,
        offset: 0,
        industry: 'Technology',
        organization_size: 'medium',
      })

      expect(mockOrgRepository.search).toHaveBeenCalledWith('tech', expect.objectContaining({
        limit: 10,
        offset: 0,
        filters: expect.objectContaining({
          industry: 'Technology',
          organization_size: 'medium',
        }),
      }))
      expect(result).toEqual(expectedOrgs)
    })

    it('should handle empty search results', async () => {
      mockOrgRepository.search.mockResolvedValue([])

      const result = await organizationService.searchOrganizations('nonexistent')

      expect(result).toEqual([])
    })
  })

  describe('performance tests', () => {
    it('should handle bulk member operations efficiently', async () => {
      const memberEmails = Array.from({ length: 100 }, (_, i) => `member${i}@example.com`)
      
      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockOrgRepository.getMembers.mockResolvedValue([])
      
      // Mock user lookup and addition for each email
      memberEmails.forEach((email, index) => {
        mockUserRepository.findByEmail.mockResolvedValueOnce(
          UserFactory.build({ id: `user-${index}`, email })
        )
        mockOrgRepository.addMember.mockResolvedValueOnce({
          user_id: `user-${index}`,
          role: 'member',
        })
      })

      const startTime = Date.now()
      await organizationService.bulkInviteMembers(
        testOrganization.id,
        testUser.id,
        memberEmails,
        'member'
      )
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
    })

    it('should efficiently calculate organization metrics', async () => {
      const complexStats = {
        total_members: 1000,
        total_vaults: 200,
        total_assets: 5000,
        storage_used_bytes: 10737418240, // 10GB
      }

      mockOrgRepository.getStats.mockResolvedValue(complexStats)

      const { result, duration } = await performanceHelpers.measureExecutionTime(
        () => organizationService.getOrganizationStats(testOrganization.id, testUser.id)
      )

      expect(duration).toBeLessThan(2000) // Should complete in under 2 seconds
      expect(result).toHaveProperty('total_members', 1000)
    })
  })

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockOrgRepository.findById.mockRejectedValue(new Error('Database connection failed'))

      await expect(
        organizationService.getOrganization(testOrganization.id, testUser.id)
      ).rejects.toThrow('Database connection failed')
    })

    it('should rollback transaction on create failure', async () => {
      const orgData = OrganizationFactory.build(testUser.id)
      
      mockOrgRepository.validateSlugAvailability.mockResolvedValue(true)
      mockOrgRepository.create.mockResolvedValue(orgData)
      mockOrgRepository.addMember.mockRejectedValue(new Error('Failed to add owner'))

      await expect(
        organizationService.createOrganization(testUser.id, orgData)
      ).rejects.toThrow('Failed to add owner')

      // Verify rollback attempts
      expect(mockOrgRepository.delete).toHaveBeenCalledWith(orgData.id)
    })
  })

  describe('data validation', () => {
    it('should validate organization size values', async () => {
      const invalidOrg = OrganizationFactory.build(testUser.id, {
        organization_size: 'invalid-size' as any,
      })

      await expect(
        organizationService.createOrganization(testUser.id, invalidOrg)
      ).rejects.toThrow('Invalid organization size')
    })

    it('should validate member role assignments', async () => {
      await expect(
        organizationService.updateMemberRole(
          testOrganization.id,
          testUser.id,
          'member-id',
          'invalid-role' as any
        )
      ).rejects.toThrow('Invalid role')
    })
  })

  describe('authorization', () => {
    it('should enforce organization-level permissions', async () => {
      mockUserRepository.validatePermissions.mockResolvedValue(false)

      await expect(
        organizationService.updateOrganization(
          testOrganization.id,
          'unauthorized-user',
          { name: 'New Name' }
        )
      ).rejects.toThrow('Insufficient permissions')
    })

    it('should allow organization owners full access', async () => {
      mockUserRepository.validatePermissions.mockResolvedValue(true)
      mockOrgRepository.update.mockResolvedValue({
        ...testOrganization,
        name: 'Updated Name',
      })

      const result = await organizationService.updateOrganization(
        testOrganization.id,
        testUser.id,
        { name: 'Updated Name' }
      )

      expect(result.name).toBe('Updated Name')
    })
  })
})