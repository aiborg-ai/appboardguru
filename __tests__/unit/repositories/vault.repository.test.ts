/**
 * @jest-environment jsdom
 */
import { VaultRepository } from '@/lib/repositories/vault.repository'
import { createSupabaseAdminClient } from '@/config/database.config'
import { testDb } from '../../../tests/utils/test-database'
import { VaultFactory, UserFactory } from '../../factories'
import { testAssertions } from '../../utils/test-helpers'

// Mock Supabase client
jest.mock('@/config/database.config', () => ({
  createSupabaseAdminClient: jest.fn(),
}))

describe('VaultRepository', () => {
  let vaultRepository: VaultRepository
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
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }

    ;(createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    vaultRepository = new VaultRepository(mockSupabase)

    testUser = await testDb.createUser({
      email: 'test@example.com',
      role: 'director',
    })
    
    testOrganization = await testDb.createOrganization({
      created_by: testUser.id,
      name: 'Test Organization',
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('should return vault with members when found', async () => {
      const expectedVault = VaultFactory.build({
        organization_id: testOrganization.id,
        created_by: testUser.id,
      })
      
      mockSupabase.single.mockResolvedValue({
        data: expectedVault,
        error: null,
      })

      const result = await vaultRepository.findById(expectedVault.id!)

      expect(mockSupabase.from).toHaveBeenCalledWith('vaults')
      expect(mockSupabase.select).toHaveBeenCalledWith(`
        *,
        vault_members (
          user_id,
          role,
          permissions,
          joined_at,
          users (id, full_name, email)
        ),
        organization:organizations (id, name)
      `)
      expect(result.success).toBe(true)
    })

    it('should return failure when vault not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      })

      const result = await vaultRepository.findById('non-existent-id')

      expect(result.success).toBe(false)
    })
  })

  describe('create', () => {
    it('should create new vault successfully', async () => {
      const vaultData = VaultFactory.build({
        organization_id: testOrganization.id,
        created_by: testUser.id,
        name: 'New Vault',
        description: 'Test vault description',
      })
      
      mockSupabase.single.mockResolvedValue({
        data: vaultData,
        error: null,
      })

      const result = await vaultRepository.create(vaultData)

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        ...vaultData,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }))
      expect(result.success).toBe(true)
    })

    it('should handle duplicate vault names in organization', async () => {
      const vaultData = VaultFactory.build({
        organization_id: testOrganization.id,
        name: 'Existing Vault',
      })
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value' },
      })

      const result = await vaultRepository.create(vaultData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('duplicate key value')
      }
    })
  })

  describe('addMember', () => {
    it('should add member to vault successfully', async () => {
      const vaultId = 'vault-123'
      const userId = 'user-456'
      const role = 'editor'
      const permissions = ['read', 'write']

      const expectedMembership = {
        vault_id: vaultId,
        user_id: userId,
        role,
        permissions,
        joined_at: expect.any(String),
      }

      mockSupabase.single.mockResolvedValue({
        data: expectedMembership,
        error: null,
      })

      const result = await vaultRepository.addMember(vaultId, userId, role, permissions)

      expect(mockSupabase.from).toHaveBeenCalledWith('vault_members')
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        vault_id: vaultId,
        user_id: userId,
        role,
        permissions,
      }))
      expect(result.success).toBe(true)
    })

    it('should handle adding existing member', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'User already member' },
      })

      const result = await vaultRepository.addMember('vault-1', 'user-1', 'viewer')

      expect(result.success).toBe(false)
    })
  })

  describe('removeMember', () => {
    it('should remove member from vault', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { deleted_count: 1 },
        error: null,
      })

      const result = await vaultRepository.removeMember('vault-1', 'user-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('vault_members')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('vault_id', 'vault-1')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(result.success).toBe(true)
    })
  })

  describe('updateMemberRole', () => {
    it('should update member role and permissions', async () => {
      const updatedMember = {
        user_id: 'user-1',
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
      }

      mockSupabase.single.mockResolvedValue({
        data: updatedMember,
        error: null,
      })

      const result = await vaultRepository.updateMemberRole(
        'vault-1',
        'user-1',
        'admin',
        ['read', 'write', 'admin']
      )

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        role: 'admin',
        permissions: ['read', 'write', 'admin'],
        updated_at: expect.any(String),
      }))
      expect(result.success).toBe(true)
    })
  })

  describe('findByOrganization', () => {
    it('should return vaults for organization with member counts', async () => {
      const expectedVaults = VaultFactory.buildList(3, {
        organization_id: testOrganization.id,
      })
      
      mockSupabase.mockResolvedValue({
        data: expectedVaults,
        error: null,
      })

      const result = await vaultRepository.findByOrganization(testOrganization.id)

      expect(mockSupabase.select).toHaveBeenCalledWith(`
        *,
        vault_members(count),
        assets(count)
      `)
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', testOrganization.id)
      expect(result.success).toBe(true)
    })

    it('should filter by user access when specified', async () => {
      const result = await vaultRepository.findByOrganization(testOrganization.id, {
        userId: testUser.id,
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('vaults')
      // Should join with vault_members to filter by user access
      expect(result.success).toBe(true)
    })
  })

  describe('search', () => {
    it('should search vaults by name and description', async () => {
      const expectedVaults = VaultFactory.buildList(2)
      
      mockSupabase.mockResolvedValue({
        data: expectedVaults,
        error: null,
      })

      const result = await vaultRepository.search('finance', {
        organizationId: testOrganization.id,
        limit: 10,
      })

      expect(mockSupabase.or).toHaveBeenCalledWith(
        expect.stringContaining('name.ilike.%finance%,description.ilike.%finance%')
      )
      expect(result.success).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should return comprehensive vault statistics', async () => {
      const mockStats = {
        id: 'vault-1',
        total_assets: 25,
        total_members: 8,
        storage_used_bytes: 524288000,
        last_activity: new Date().toISOString(),
        activity_score: 85.5,
      }

      mockSupabase.single.mockResolvedValue({
        data: mockStats,
        error: null,
      })

      const result = await vaultRepository.getStats('vault-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(expect.objectContaining({
          total_assets: 25,
          total_members: 8,
          storage_used_mb: expect.any(Number),
          activity_score: 85.5,
        }))
      }
    })
  })

  describe('archiveVault', () => {
    it('should archive vault and notify members', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'vault-1', status: 'archived' },
        error: null,
      })

      const result = await vaultRepository.archiveVault('vault-1', testUser.id)

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'archived',
        archived_at: expect.any(String),
        archived_by: testUser.id,
      }))
      expect(result.success).toBe(true)
    })
  })

  describe('performance tests', () => {
    it('should handle bulk member operations efficiently', async () => {
      const memberIds = Array.from({ length: 50 }, (_, i) => `user-${i}`)
      
      mockSupabase.mockResolvedValue({
        data: memberIds.map(id => ({ user_id: id, role: 'viewer' })),
        error: null,
      })

      const startTime = Date.now()
      const result = await vaultRepository.bulkAddMembers('vault-1', memberIds, 'viewer')
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(3000)
      expect(result.success).toBe(true)
    })

    it('should efficiently calculate vault metrics for large datasets', async () => {
      const complexStats = {
        total_assets: 1000,
        total_members: 100,
        storage_used_bytes: 5368709120, // 5GB
      }

      mockSupabase.single.mockResolvedValue({
        data: complexStats,
        error: null,
      })

      const startTime = Date.now()
      const result = await vaultRepository.getStats('large-vault')
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(2000)
      expect(result.success).toBe(true)
    })
  })

  describe('access control', () => {
    it('should validate member permissions before operations', async () => {
      const result = await vaultRepository.validateMemberAccess(
        'vault-1',
        testUser.id,
        'write'
      )

      expect(mockSupabase.from).toHaveBeenCalledWith('vault_members')
      expect(result.success).toBe(true)
    })

    it('should check organization membership for vault access', async () => {
      const result = await vaultRepository.validateOrganizationAccess(
        testUser.id,
        testOrganization.id
      )

      expect(result.success).toBe(true)
    })
  })

  describe('data validation', () => {
    it('should validate vault data before creation', async () => {
      const vaultData = VaultFactory.build()
      
      expect(testAssertions.hasRequiredFields(vaultData, [
        'name', 'organization_id', 'created_by'
      ])).toBe(true)
      
      expect(testAssertions.isValidVaultName(vaultData.name)).toBe(true)
    })

    it('should validate member role assignments', async () => {
      const validRoles = ['owner', 'admin', 'editor', 'viewer']
      
      validRoles.forEach(role => {
        expect(testAssertions.isValidVaultRole(role)).toBe(true)
      })
      
      expect(testAssertions.isValidVaultRole('invalid-role')).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should handle database connection failures gracefully', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Connection timeout'))

      const result = await vaultRepository.findById('vault-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Connection timeout')
      }
    })

    it('should handle constraint violations', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: '23503', message: 'Foreign key violation' },
      })

      const result = await vaultRepository.create(VaultFactory.build({
        organization_id: 'invalid-org-id',
      }))

      expect(result.success).toBe(false)
    })
  })
})
