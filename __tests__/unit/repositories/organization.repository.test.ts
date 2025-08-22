/**
 * @jest-environment jsdom
 */
import { OrganizationRepository } from '@/lib/repositories/organization.repository'
import { createSupabaseAdminClient } from '@/config/database.config'
import { testDb } from '../../../tests/utils/test-database'
import { OrganizationFactory, UserFactory } from '../../factories'
import { testAssertions, dbHelpers } from '../../utils/test-helpers'

// Mock Supabase client
jest.mock('@/config/database.config', () => ({
  createSupabaseAdminClient: jest.fn(),
}))

describe('OrganizationRepository', () => {
  let organizationRepository: OrganizationRepository
  let mockSupabase: any
  let testUser: any
  let testOrganization: any

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    }

    ;(createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    organizationRepository = new OrganizationRepository(mockSupabase)

    // Create test data
    testUser = await testDb.createUser({
      email: 'owner@example.com',
      full_name: 'Organization Owner',
      role: 'admin',
    })
    
    testOrganization = await testDb.createOrganization({
      created_by: testUser.id,
      name: 'Test Organization',
      slug: 'test-organization',
    })
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('should return organization when found', async () => {
      const expectedOrg = OrganizationFactory.build(testUser.id, {
        id: testOrganization.id,
      })
      
      mockSupabase.single.mockResolvedValue({
        data: expectedOrg,
        error: null,
      })

      const result = await organizationRepository.findById(testOrganization.id)

      expect(mockSupabase.from).toHaveBeenCalledWith('organizations')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', testOrganization.id)
      expect(result).toEqual(expectedOrg)
    })

    it('should return null when organization not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      })

      const result = await organizationRepository.findById('non-existent-id')

      expect(result).toBeNull()
    })

    it('should include member count when requested', async () => {
      const expectedOrg = OrganizationFactory.build(testUser.id, {
        member_count: 5,
      })
      
      mockSupabase.single.mockResolvedValue({
        data: expectedOrg,
        error: null,
      })

      const result = await organizationRepository.findById(testOrganization.id, {
        includeMemberCount: true,
      })

      expect(mockSupabase.select).toHaveBeenCalledWith(`
        *,
        member_count:organization_members(count)
      `)
      expect(result.member_count).toBeDefined()
    })
  })

  describe('findBySlug', () => {
    it('should return organization by slug', async () => {
      const expectedOrg = OrganizationFactory.build(testUser.id, {
        slug: 'test-organization',
      })
      
      mockSupabase.single.mockResolvedValue({
        data: expectedOrg,
        error: null,
      })

      const result = await organizationRepository.findBySlug('test-organization')

      expect(mockSupabase.eq).toHaveBeenCalledWith('slug', 'test-organization')
      expect(result).toEqual(expectedOrg)
    })

    it('should handle case-insensitive slug search', async () => {
      const result = await organizationRepository.findBySlug('TEST-ORGANIZATION')

      expect(mockSupabase.eq).toHaveBeenCalledWith('slug', 'test-organization')
    })
  })

  describe('create', () => {
    it('should create organization successfully', async () => {
      const orgData = OrganizationFactory.build(testUser.id)
      const expectedOrg = { ...orgData, created_at: expect.any(String) }
      
      mockSupabase.single.mockResolvedValue({
        data: expectedOrg,
        error: null,
      })

      const result = await organizationRepository.create(orgData)

      expect(mockSupabase.from).toHaveBeenCalledWith('organizations')
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        ...orgData,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }))
      expect(result).toEqual(expectedOrg)
    })

    it('should handle duplicate slug errors', async () => {
      const orgData = OrganizationFactory.build(testUser.id, {
        slug: 'existing-org',
      })
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value', code: '23505' },
      })

      await expect(organizationRepository.create(orgData)).rejects.toThrow('duplicate key value')
    })

    it('should auto-generate slug if not provided', async () => {
      const orgData = OrganizationFactory.build(testUser.id, {
        name: 'New Organization',
        slug: undefined,
      })

      const result = await organizationRepository.create(orgData)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: expect.stringMatching(/^new-organization/),
        })
      )
    })
  })

  describe('update', () => {
    it('should update organization successfully', async () => {
      const updateData = {
        name: 'Updated Organization Name',
        description: 'Updated description',
        website: 'https://updated.example.com',
      }
      const expectedOrg = OrganizationFactory.build(testUser.id, updateData)
      
      mockSupabase.single.mockResolvedValue({
        data: expectedOrg,
        error: null,
      })

      const result = await organizationRepository.update(testOrganization.id, updateData)

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        ...updateData,
        updated_at: expect.any(String),
      }))
      expect(result).toEqual(expectedOrg)
    })

    it('should not allow updating immutable fields', async () => {
      const updateData = {
        id: 'new-id',
        created_by: 'different-user',
        created_at: new Date().toISOString(),
      }
      
      await organizationRepository.update(testOrganization.id, updateData)

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.not.objectContaining({
          id: expect.any(String),
          created_by: expect.any(String),
          created_at: expect.any(String),
        })
      )
    })
  })

  describe('addMember', () => {
    it('should add member to organization', async () => {
      const memberId = 'new-member-id'
      const memberData = {
        organization_id: testOrganization.id,
        user_id: memberId,
        role: 'member',
        status: 'active',
      }
      
      mockSupabase.single.mockResolvedValue({
        data: memberData,
        error: null,
      })

      const result = await organizationRepository.addMember(
        testOrganization.id,
        memberId,
        'member'
      )

      expect(mockSupabase.from).toHaveBeenCalledWith('organization_members')
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        organization_id: testOrganization.id,
        user_id: memberId,
        role: 'member',
        status: 'active',
        joined_at: expect.any(String),
      }))
      expect(result).toEqual(memberData)
    })

    it('should handle duplicate member addition', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value', code: '23505' },
      })

      await expect(organizationRepository.addMember(
        testOrganization.id,
        'existing-member',
        'member'
      )).rejects.toThrow('duplicate key value')
    })
  })

  describe('removeMember', () => {
    it('should remove member from organization', async () => {
      mockSupabase.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await organizationRepository.removeMember(
        testOrganization.id,
        'member-to-remove'
      )

      expect(mockSupabase.from).toHaveBeenCalledWith('organization_members')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', testOrganization.id)
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'member-to-remove')
      expect(result).toBe(true)
    })

    it('should prevent removing the last owner', async () => {
      // Mock query to return that user is the only owner
      mockSupabase.mockResolvedValueOnce({
        data: [{ user_id: testUser.id, role: 'owner' }],
        error: null,
      })

      await expect(organizationRepository.removeMember(
        testOrganization.id,
        testUser.id
      )).rejects.toThrow('Cannot remove the last owner')
    })
  })

  describe('updateMemberRole', () => {
    it('should update member role successfully', async () => {
      const updatedMember = {
        user_id: 'member-id',
        role: 'admin',
        organization_id: testOrganization.id,
      }
      
      mockSupabase.single.mockResolvedValue({
        data: updatedMember,
        error: null,
      })

      const result = await organizationRepository.updateMemberRole(
        testOrganization.id,
        'member-id',
        'admin'
      )

      expect(mockSupabase.from).toHaveBeenCalledWith('organization_members')
      expect(mockSupabase.update).toHaveBeenCalledWith({
        role: 'admin',
        updated_at: expect.any(String),
      })
      expect(result).toEqual(updatedMember)
    })
  })

  describe('getMembers', () => {
    it('should return organization members', async () => {
      const expectedMembers = [
        {
          user_id: 'member-1',
          role: 'admin',
          status: 'active',
          user: UserFactory.build(),
        },
        {
          user_id: 'member-2',
          role: 'member',
          status: 'active',
          user: UserFactory.build(),
        },
      ]
      
      mockSupabase.mockResolvedValue({
        data: expectedMembers,
        error: null,
      })

      const result = await organizationRepository.getMembers(testOrganization.id)

      expect(mockSupabase.from).toHaveBeenCalledWith('organization_members')
      expect(mockSupabase.select).toHaveBeenCalledWith(`
        *,
        user:users (*)
      `)
      expect(result).toEqual(expectedMembers)
    })

    it('should filter members by role', async () => {
      const result = await organizationRepository.getMembers(testOrganization.id, {
        role: 'admin',
      })

      expect(mockSupabase.eq).toHaveBeenCalledWith('role', 'admin')
    })

    it('should filter members by status', async () => {
      const result = await organizationRepository.getMembers(testOrganization.id, {
        status: 'active',
      })

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active')
    })
  })

  describe('search', () => {
    it('should search organizations by name', async () => {
      const expectedOrgs = OrganizationFactory.buildList(testUser.id, 3)
      
      mockSupabase.mockResolvedValue({
        data: expectedOrgs,
        error: null,
      })

      const result = await organizationRepository.search('tech', {
        limit: 10,
        offset: 0,
      })

      expect(mockSupabase.or).toHaveBeenCalledWith(
        'name.ilike.%tech%,description.ilike.%tech%'
      )
      expect(result).toEqual(expectedOrgs)
    })

    it('should handle pagination', async () => {
      const result = await organizationRepository.search('test', {
        limit: 5,
        offset: 10,
      })

      expect(mockSupabase.range).toHaveBeenCalledWith(10, 14) // offset to offset+limit-1
    })
  })

  describe('findByUser', () => {
    it('should return organizations for user', async () => {
      const expectedOrgs = OrganizationFactory.buildList(testUser.id, 2)
      
      mockSupabase.mockResolvedValue({
        data: expectedOrgs,
        error: null,
      })

      const result = await organizationRepository.findByUser(testUser.id)

      expect(mockSupabase.from).toHaveBeenCalledWith('organizations')
      expect(mockSupabase.select).toHaveBeenCalledWith(`
        *,
        organization_members!inner (
          role,
          status,
          joined_at
        )
      `)
      expect(result).toEqual(expectedOrgs)
    })

    it('should filter by user role in organization', async () => {
      const result = await organizationRepository.findByUser(testUser.id, {
        role: 'owner',
      })

      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_members.role', 'owner')
    })
  })

  describe('getStats', () => {
    it('should return organization statistics', async () => {
      const expectedStats = {
        total_members: 15,
        active_members: 12,
        pending_members: 3,
        total_vaults: 8,
        active_vaults: 6,
        total_assets: 45,
        storage_used_bytes: 1073741824, // 1GB
      }
      
      mockSupabase.single.mockResolvedValue({
        data: expectedStats,
        error: null,
      })

      const result = await organizationRepository.getStats(testOrganization.id)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_organization_stats', {
        org_id: testOrganization.id,
      })
      expect(result).toEqual(expectedStats)
    })
  })

  describe('updateSubscription', () => {
    it('should update subscription details', async () => {
      const subscriptionData = {
        subscription_tier: 'enterprise',
        subscription_status: 'active',
        billing_cycle: 'annual',
        features_enabled: {
          advanced_analytics: true,
          ai_insights: true,
          compliance_tracking: true,
        },
      }
      
      mockSupabase.single.mockResolvedValue({
        data: { ...OrganizationFactory.build(testUser.id), ...subscriptionData },
        error: null,
      })

      const result = await organizationRepository.updateSubscription(
        testOrganization.id,
        subscriptionData
      )

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining(subscriptionData))
      expect(result.subscription_tier).toBe('enterprise')
    })
  })

  describe('validateSlugAvailability', () => {
    it('should return true for available slug', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      })

      const result = await organizationRepository.validateSlugAvailability('new-org-slug')

      expect(result).toBe(true)
    })

    it('should return false for taken slug', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'existing-org', slug: 'taken-slug' },
        error: null,
      })

      const result = await organizationRepository.validateSlugAvailability('taken-slug')

      expect(result).toBe(false)
    })

    it('should allow current organization to keep its slug', async () => {
      const result = await organizationRepository.validateSlugAvailability(
        'existing-slug',
        'org-id'
      )

      expect(mockSupabase.eq).toHaveBeenCalledWith('slug', 'existing-slug')
    })
  })

  describe('performance tests', () => {
    it('should handle large member lists efficiently', async () => {
      const largeUserList = Array.from({ length: 1000 }, (_, i) => `user-${i}`)
      
      mockSupabase.mockResolvedValue({
        data: largeUserList.map(userId => ({ user_id: userId, role: 'member' })),
        error: null,
      })

      const startTime = Date.now()
      const result = await organizationRepository.getMembers(testOrganization.id)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(2000) // Should complete in under 2 seconds
      expect(result).toHaveLength(1000)
    })

    it('should efficiently search across many organizations', async () => {
      const manyOrgs = OrganizationFactory.buildList(testUser.id, 500)
      
      mockSupabase.mockResolvedValue({
        data: manyOrgs.slice(0, 20), // Return first 20 results
        error: null,
      })

      const startTime = Date.now()
      const result = await organizationRepository.search('test', { limit: 20 })
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
      expect(result).toHaveLength(20)
    })
  })

  describe('data validation', () => {
    it('should validate organization data structure', async () => {
      const orgData = OrganizationFactory.build(testUser.id)
      
      // Verify required fields
      expect(testAssertions.hasRequiredFields(orgData, [
        'name', 'slug', 'created_by', 'organization_size'
      ])).toBe(true)
      
      // Verify slug format (lowercase, hyphenated)
      expect(orgData.slug).toMatch(/^[a-z0-9-]+$/)
    })

    it('should validate subscription tiers', async () => {
      const validTiers = ['free', 'standard', 'premium', 'enterprise']
      const orgData = OrganizationFactory.build(testUser.id)
      
      expect(validTiers).toContain(orgData.subscription_tier)
    })
  })

  describe('edge cases', () => {
    it('should handle concurrent member additions gracefully', async () => {
      // Simulate race condition
      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: { code: '23505' } }) // First attempt fails
        .mockResolvedValueOnce({ data: { user_id: 'member' }, error: null }) // Second succeeds

      // Should not throw error and handle gracefully
      const result = await organizationRepository.addMember(
        testOrganization.id,
        'member',
        'member'
      )

      expect(result).toBeNull() // Member already exists
    })
  })
})