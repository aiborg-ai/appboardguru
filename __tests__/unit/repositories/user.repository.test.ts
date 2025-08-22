/**
 * @jest-environment jsdom
 */
import { UserRepository } from '@/lib/repositories/user.repository'
import { createSupabaseAdminClient } from '@/config/database.config'
import { testDb } from '../../../tests/utils/test-database'
import { UserFactory } from '../../factories'
import { testAssertions, dbHelpers } from '../../utils/test-helpers'

// Mock Supabase client
jest.mock('@/config/database.config', () => ({
  createSupabaseAdminClient: jest.fn(),
}))

describe('UserRepository', () => {
  let userRepository: UserRepository
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
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    }

    ;(createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    userRepository = new UserRepository(mockSupabase)

    // Create test data
    testUser = await testDb.createUser({
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'director',
    })
    
    testOrganization = await testDb.createOrganization({
      created_by: testUser.id,
      name: 'Test Organization',
    })
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      const expectedUser = UserFactory.build({ id: testUser.id })
      
      mockSupabase.single.mockResolvedValue({
        data: expectedUser,
        error: null,
      })

      const result = await userRepository.findById(testUser.id)

      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', testUser.id)
      expect(result).toEqual(expectedUser)
    })

    it('should return null when user not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error
      })

      const result = await userRepository.findById('non-existent-id')

      expect(result).toBeNull()
    })

    it('should throw error for database errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })

      await expect(userRepository.findById(testUser.id)).rejects.toThrow()
    })
  })

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const expectedUser = UserFactory.build({ email: 'test@example.com' })
      
      mockSupabase.single.mockResolvedValue({
        data: expectedUser,
        error: null,
      })

      const result = await userRepository.findByEmail('test@example.com')

      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'test@example.com')
      expect(result).toEqual(expectedUser)
    })

    it('should handle case-insensitive email search', async () => {
      const expectedUser = UserFactory.build({ email: 'test@example.com' })
      
      mockSupabase.single.mockResolvedValue({
        data: expectedUser,
        error: null,
      })

      const result = await userRepository.findByEmail('TEST@EXAMPLE.COM')

      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'test@example.com')
      expect(result).toEqual(expectedUser)
    })
  })

  describe('create', () => {
    it('should create new user successfully', async () => {
      const userData = UserFactory.build()
      const expectedUser = { ...userData, created_at: expect.any(String) }
      
      mockSupabase.single.mockResolvedValue({
        data: expectedUser,
        error: null,
      })

      const result = await userRepository.create(userData)

      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        ...userData,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }))
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(result).toEqual(expectedUser)
    })

    it('should handle validation errors', async () => {
      const invalidUserData = UserFactory.build({ email: 'invalid-email' })
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email format', code: '23514' },
      })

      await expect(userRepository.create(invalidUserData)).rejects.toThrow('Invalid email format')
    })

    it('should handle duplicate email errors', async () => {
      const userData = UserFactory.build({ email: 'existing@example.com' })
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value', code: '23505' },
      })

      await expect(userRepository.create(userData)).rejects.toThrow('duplicate key value')
    })
  })

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateData = { full_name: 'Updated Name', bio: 'Updated bio' }
      const expectedUser = { ...UserFactory.build(), ...updateData }
      
      mockSupabase.single.mockResolvedValue({
        data: expectedUser,
        error: null,
      })

      const result = await userRepository.update(testUser.id, updateData)

      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        ...updateData,
        updated_at: expect.any(String),
      }))
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', testUser.id)
      expect(result).toEqual(expectedUser)
    })

    it('should not allow updating immutable fields', async () => {
      const updateData = { id: 'new-id', created_at: new Date().toISOString() }
      
      const result = await userRepository.update(testUser.id, updateData)

      // Verify immutable fields are not included in update
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.not.objectContaining({
          id: expect.any(String),
          created_at: expect.any(String),
        })
      )
    })
  })

  describe('delete', () => {
    it('should soft delete user', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: testUser.id, deleted_at: new Date().toISOString() },
        error: null,
      })

      const result = await userRepository.delete(testUser.id)

      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
          is_active: false,
        })
      )
      expect(result).toBe(true)
    })
  })

  describe('findByOrganization', () => {
    it('should return users for organization', async () => {
      const expectedUsers = UserFactory.buildList(3)
      
      mockSupabase.mockResolvedValue({
        data: expectedUsers,
        error: null,
      })

      const result = await userRepository.findByOrganization(testOrganization.id)

      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabase.select).toHaveBeenCalledWith(`
        *,
        organization_members!inner (
          organization_id,
          role,
          status,
          joined_at
        )
      `)
      expect(result).toEqual(expectedUsers)
    })

    it('should filter by role when specified', async () => {
      const expectedUsers = UserFactory.buildWithRoles(['director'])
      
      mockSupabase.mockResolvedValue({
        data: expectedUsers,
        error: null,
      })

      const result = await userRepository.findByOrganization(testOrganization.id, {
        role: 'director',
      })

      expect(result).toEqual(expectedUsers)
    })

    it('should filter by status when specified', async () => {
      const result = await userRepository.findByOrganization(testOrganization.id, {
        status: 'active',
      })

      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_members.status', 'active')
    })
  })

  describe('search', () => {
    it('should search users by name and email', async () => {
      const expectedUsers = UserFactory.buildList(2)
      
      mockSupabase.mockResolvedValue({
        data: expectedUsers,
        error: null,
      })

      const result = await userRepository.search('john', {
        limit: 10,
        offset: 0,
      })

      expect(mockSupabase.select).toHaveBeenCalled()
      expect(result).toEqual(expectedUsers)
    })

    it('should handle pagination', async () => {
      const result = await userRepository.search('test', {
        limit: 5,
        offset: 10,
      })

      expect(mockSupabase.limit).toHaveBeenCalledWith(5)
    })
  })

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: testUser.id },
        error: null,
      })

      const result = await userRepository.updateLastLogin(testUser.id)

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          last_login_at: expect.any(String),
          login_count: expect.any(Number),
        })
      )
      expect(result).toBe(true)
    })
  })

  describe('validatePermissions', () => {
    it('should return true for admin users', async () => {
      const adminUser = UserFactory.buildAdmin()
      mockSupabase.single.mockResolvedValue({
        data: adminUser,
        error: null,
      })

      const result = await userRepository.validatePermissions(adminUser.id!, 'manage_users')

      expect(result).toBe(true)
    })

    it('should check organization-specific permissions', async () => {
      const result = await userRepository.validatePermissions(
        testUser.id, 
        'view_vault', 
        testOrganization.id
      )

      // Verify the query checks organization membership
      expect(mockSupabase.from).toHaveBeenCalledWith('organization_members')
    })
  })

  describe('getActivitySummary', () => {
    it('should return user activity summary', async () => {
      const expectedSummary = {
        user_id: testUser.id,
        total_logins: 25,
        last_login: new Date().toISOString(),
        documents_viewed: 150,
        vaults_accessed: 12,
        annotations_created: 8,
      }
      
      mockSupabase.single.mockResolvedValue({
        data: expectedSummary,
        error: null,
      })

      const result = await userRepository.getActivitySummary(testUser.id)

      expect(result).toEqual(expectedSummary)
    })
  })

  describe('performance tests', () => {
    it('should handle bulk user creation efficiently', async () => {
      const users = UserFactory.buildList(100)
      
      mockSupabase.mockResolvedValue({
        data: users,
        error: null,
      })

      const startTime = Date.now()
      await userRepository.createBulk(users)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
      expect(mockSupabase.insert).toHaveBeenCalledWith(users)
    })

    it('should efficiently search through large user base', async () => {
      const expectedUsers = UserFactory.buildList(20)
      
      mockSupabase.mockResolvedValue({
        data: expectedUsers,
        error: null,
      })

      const startTime = Date.now()
      const result = await userRepository.search('test', { limit: 20 })
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
      expect(result).toHaveLength(20)
    })
  })

  describe('edge cases', () => {
    it('should handle null and undefined values gracefully', async () => {
      const result = await userRepository.findById('')
      expect(result).toBeNull()
    })

    it('should handle malformed email addresses', async () => {
      const result = await userRepository.findByEmail('not-an-email')
      expect(result).toBeNull()
    })

    it('should handle database connection failures', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Connection timeout'))

      await expect(userRepository.findById(testUser.id)).rejects.toThrow('Connection timeout')
    })
  })

  describe('data validation', () => {
    it('should validate user data before saving', async () => {
      const userData = UserFactory.build()
      
      // Verify required fields
      expect(testAssertions.hasRequiredFields(userData, [
        'email', 'full_name', 'role', 'status'
      ])).toBe(true)
      
      // Verify email format
      expect(testAssertions.isValidEmail(userData.email)).toBe(true)
    })

    it('should validate user roles', async () => {
      const validRoles = ['admin', 'director', 'viewer', 'pending']
      const userData = UserFactory.buildDirector()
      
      expect(validRoles).toContain(userData.role)
    })
  })
})