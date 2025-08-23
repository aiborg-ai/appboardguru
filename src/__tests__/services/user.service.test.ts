import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { UserService } from '../../lib/services/user.service'
import { BaseService } from '../../lib/services/base.service'
import { success, failure, RepositoryError } from '../../lib/repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// Mock base service and repositories
vi.mock('../../lib/services/base.service')
vi.mock('../../lib/repositories/user.repository')
vi.mock('../../lib/repositories/enhanced-user.repository')

const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    updateUser: vi.fn()
  }
} as unknown as SupabaseClient<Database>

const mockUserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  updateLastAccess: vi.fn()
}

const mockEnhancedUserRepository = {
  findById: vi.fn(),
  searchUsers: vi.fn(),
  create: vi.fn(),
  createBatch: vi.fn(),
  updateWithLock: vi.fn()
}

const mockAuditRepository = {
  create: vi.fn()
}

const mockNotificationRepository = {
  create: vi.fn()
}

describe('UserService', () => {
  let userService: UserService

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock BaseService constructor
    vi.mocked(BaseService).mockImplementation(() => ({
      supabase: mockSupabaseClient,
      repositories: {
        users: mockUserRepository,
        enhancedUsers: mockEnhancedUserRepository,
        audit: mockAuditRepository,
        notifications: mockNotificationRepository
      },
      logActivity: vi.fn(),
      validateRequired: vi.fn()
    } as any))

    userService = new UserService(mockSupabaseClient)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      const userId = 'user_123'
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        phone: '+1234567890',
        designation: 'CEO',
        linkedin_url: 'https://linkedin.com/in/johndoe',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        last_login: '2024-01-15T10:00:00Z',
        email_verified: true,
        is_active: true
      }

      mockUserRepository.findById.mockResolvedValue(mockUser)

      const result = await userService.getUserProfile(userId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: userId,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      })
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId)
    })

    it('should handle user not found', async () => {
      const userId = 'nonexistent'
      
      mockUserRepository.findById.mockResolvedValue(null)

      const result = await userService.getUserProfile(userId)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('not_found')
    })

    it('should handle database errors', async () => {
      const userId = 'user_123'
      
      mockUserRepository.findById.mockRejectedValue(new Error('Database connection failed'))

      const result = await userService.getUserProfile(userId)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('internal')
    })
  })

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user_123'
      const updateData = {
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+0987654321',
        designation: 'CTO'
      }

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      }

      const updatedUser = {
        ...existingUser,
        ...updateData,
        updated_at: '2024-01-02T10:00:00Z'
      }

      mockUserRepository.findById.mockResolvedValue(existingUser)
      mockUserRepository.update.mockResolvedValue(updatedUser)
      mockAuditRepository.create.mockResolvedValue(success({}))

      const result = await userService.updateUserProfile(userId, updateData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        first_name: 'Jane',
        last_name: 'Smith',
        designation: 'CTO'
      })
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData)
    })

    it('should validate required fields', async () => {
      const userId = 'user_123'
      const invalidData = {
        first_name: '', // Empty string should fail validation
        email: 'invalid-email'
      }

      const result = await userService.updateUserProfile(userId, invalidData as any)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('validation')
    })

    it('should handle user not found during update', async () => {
      const userId = 'nonexistent'
      const updateData = { first_name: 'Jane' }

      mockUserRepository.findById.mockResolvedValue(null)

      const result = await userService.updateUserProfile(userId, updateData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('not_found')
    })
  })

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User',
        phone: '+1234567890',
        designation: 'Manager'
      }

      const createdUser = {
        id: 'new_user_123',
        ...userData,
        email_verified: false,
        is_active: true,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      }

      mockUserRepository.findByEmail.mockResolvedValue(null) // Email not taken
      mockUserRepository.create.mockResolvedValue(createdUser)
      mockAuditRepository.create.mockResolvedValue(success({}))
      mockNotificationRepository.create.mockResolvedValue(success({}))

      const result = await userService.createUser(userData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User'
      })
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          email_verified: false,
          is_active: true
        })
      )
    })

    it('should handle duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        first_name: 'New',
        last_name: 'User'
      }

      const existingUser = {
        id: 'existing_123',
        email: 'existing@example.com'
      }

      mockUserRepository.findByEmail.mockResolvedValue(existingUser)

      const result = await userService.createUser(userData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('validation')
      expect(result.error.message).toContain('already exists')
    })

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        first_name: 'Test',
        last_name: 'User'
      }

      const result = await userService.createUser(userData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('validation')
    })
  })

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const searchQuery = 'john'
      const mockUsers = [
        {
          id: 'user1',
          email: 'john@example.com',
          full_name: 'John Doe'
        },
        {
          id: 'user2',
          email: 'johnny@example.com',
          full_name: 'Johnny Smith'
        }
      ]

      mockEnhancedUserRepository.searchUsers.mockResolvedValue(success(mockUsers))

      const result = await userService.searchUsers(searchQuery)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].full_name).toBe('John Doe')
      expect(mockEnhancedUserRepository.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({ query: searchQuery })
      )
    })

    it('should apply filters in search', async () => {
      const searchQuery = 'test'
      const filters = {
        is_active: true,
        organization_id: 'org_123',
        role: 'admin'
      }

      mockEnhancedUserRepository.searchUsers.mockResolvedValue(success([]))

      const result = await userService.searchUsers(searchQuery, filters)

      expect(result.success).toBe(true)
      expect(mockEnhancedUserRepository.searchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          query: searchQuery,
          ...filters
        })
      )
    })

    it('should handle empty search results', async () => {
      mockEnhancedUserRepository.searchUsers.mockResolvedValue(success([]))

      const result = await userService.searchUsers('nonexistent')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('getUserPreferences', () => {
    it('should get user preferences with defaults', async () => {
      const userId = 'user_123'
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        preferences: null // No preferences set
      }

      mockUserRepository.findById.mockResolvedValue(mockUser)

      const result = await userService.getUserPreferences(userId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        theme: 'system', // Default value
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        privacy: {
          profile_visibility: 'organization',
          activity_visibility: 'organization'
        }
      })
    })

    it('should return existing preferences', async () => {
      const userId = 'user_123'
      const customPreferences = {
        theme: 'dark' as const,
        notifications: {
          email: false,
          push: true,
          sms: true
        },
        privacy: {
          profile_visibility: 'private' as const,
          activity_visibility: 'private' as const
        }
      }

      const mockUser = {
        id: userId,
        preferences: customPreferences
      }

      mockUserRepository.findById.mockResolvedValue(mockUser)

      const result = await userService.getUserPreferences(userId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject(customPreferences)
    })
  })

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const userId = 'user_123'
      const preferencesUpdate = {
        theme: 'dark' as const,
        notifications: {
          email: false,
          push: true,
          sms: false
        }
      }

      const existingUser = {
        id: userId,
        preferences: {
          theme: 'light' as const,
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        }
      }

      const updatedUser = {
        ...existingUser,
        preferences: {
          ...existingUser.preferences,
          ...preferencesUpdate
        }
      }

      mockUserRepository.findById.mockResolvedValue(existingUser)
      mockUserRepository.update.mockResolvedValue(updatedUser)

      const result = await userService.updateUserPreferences(userId, preferencesUpdate)

      expect(result.success).toBe(true)
      expect(result.data.theme).toBe('dark')
      expect(result.data.notifications.email).toBe(false)
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          preferences: expect.objectContaining({
            theme: 'dark'
          })
        })
      )
    })

    it('should validate preference values', async () => {
      const userId = 'user_123'
      const invalidPreferences = {
        theme: 'invalid_theme' as any,
        notifications: {
          email: 'not_boolean' as any
        }
      }

      const result = await userService.updateUserPreferences(userId, invalidPreferences)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('validation')
    })
  })

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const userId = 'user_123'
      const reason = 'User requested account closure'

      const existingUser = {
        id: userId,
        is_active: true,
        email: 'test@example.com'
      }

      const deactivatedUser = {
        ...existingUser,
        is_active: false,
        deactivated_at: '2024-01-02T10:00:00Z',
        deactivation_reason: reason
      }

      mockUserRepository.findById.mockResolvedValue(existingUser)
      mockUserRepository.update.mockResolvedValue(deactivatedUser)
      mockAuditRepository.create.mockResolvedValue(success({}))

      const result = await userService.deactivateUser(userId, reason)

      expect(result.success).toBe(true)
      expect(result.data.is_active).toBe(false)
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          is_active: false,
          deactivation_reason: reason
        })
      )
    })

    it('should handle already deactivated user', async () => {
      const userId = 'user_123'
      const existingUser = {
        id: userId,
        is_active: false
      }

      mockUserRepository.findById.mockResolvedValue(existingUser)

      const result = await userService.deactivateUser(userId, 'Test reason')

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('business_rule')
    })
  })

  describe('reactivateUser', () => {
    it('should reactivate user successfully', async () => {
      const userId = 'user_123'

      const existingUser = {
        id: userId,
        is_active: false,
        deactivated_at: '2024-01-01T10:00:00Z'
      }

      const reactivatedUser = {
        ...existingUser,
        is_active: true,
        reactivated_at: '2024-01-02T10:00:00Z',
        deactivated_at: null,
        deactivation_reason: null
      }

      mockUserRepository.findById.mockResolvedValue(existingUser)
      mockUserRepository.update.mockResolvedValue(reactivatedUser)
      mockAuditRepository.create.mockResolvedValue(success({}))

      const result = await userService.reactivateUser(userId)

      expect(result.success).toBe(true)
      expect(result.data.is_active).toBe(true)
    })

    it('should handle already active user', async () => {
      const userId = 'user_123'
      const existingUser = {
        id: userId,
        is_active: true
      }

      mockUserRepository.findById.mockResolvedValue(existingUser)

      const result = await userService.reactivateUser(userId)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('business_rule')
    })
  })

  describe('updateLastAccess', () => {
    it('should update last access timestamp', async () => {
      const userId = 'user_123'

      mockUserRepository.updateLastAccess.mockResolvedValue(undefined)

      const result = await userService.updateLastAccess(userId)

      expect(result.success).toBe(true)
      expect(mockUserRepository.updateLastAccess).toHaveBeenCalledWith(userId)
    })

    it('should handle update errors gracefully', async () => {
      const userId = 'user_123'

      mockUserRepository.updateLastAccess.mockRejectedValue(new Error('Database error'))

      const result = await userService.updateLastAccess(userId)

      expect(result.success).toBe(false)
    })
  })

  describe('bulkCreateUsers', () => {
    it('should create multiple users successfully', async () => {
      const usersData = [
        {
          email: 'user1@example.com',
          first_name: 'User',
          last_name: 'One'
        },
        {
          email: 'user2@example.com',
          first_name: 'User',
          last_name: 'Two'
        }
      ]

      const createdUsers = usersData.map((userData, index) => ({
        id: `user_${index + 1}`,
        ...userData,
        created_at: '2024-01-01T10:00:00Z'
      }))

      mockEnhancedUserRepository.createBatch.mockResolvedValue(success({
        successful: createdUsers,
        failed: [],
        total: 2,
        successCount: 2,
        failureCount: 0
      }))

      const result = await userService.bulkCreateUsers(usersData)

      expect(result.success).toBe(true)
      expect(result.data.successCount).toBe(2)
      expect(result.data.successful).toHaveLength(2)
      expect(result.data.failed).toHaveLength(0)
    })

    it('should handle partial failures in bulk create', async () => {
      const usersData = [
        { email: 'valid@example.com', first_name: 'Valid', last_name: 'User' },
        { email: 'duplicate@example.com', first_name: 'Duplicate', last_name: 'User' }
      ]

      mockEnhancedUserRepository.createBatch.mockResolvedValue(success({
        successful: [{ id: 'user_1', ...usersData[0] }],
        failed: [{
          data: usersData[1],
          error: 'Email already exists',
          index: 1
        }],
        total: 2,
        successCount: 1,
        failureCount: 1
      }))

      const result = await userService.bulkCreateUsers(usersData)

      expect(result.success).toBe(true)
      expect(result.data.successCount).toBe(1)
      expect(result.data.failureCount).toBe(1)
      expect(result.data.failed).toHaveLength(1)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle malformed user data gracefully', async () => {
      const malformedData = {
        email: null as any,
        first_name: 123 as any,
        preferences: 'invalid_json' as any
      }

      const result = await userService.createUser(malformedData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('validation')
    })

    it('should handle concurrent user updates', async () => {
      const userId = 'user_123'
      const updateData = { first_name: 'Updated' }

      // Simulate concurrent modification
      mockEnhancedUserRepository.updateWithLock.mockResolvedValue(
        failure(RepositoryError.conflict('User was modified by another operation'))
      )

      const result = await userService.updateUserProfile(userId, updateData, { useLocking: true })

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('conflict')
    })

    it('should validate complex preference structures', async () => {
      const userId = 'user_123'
      const complexPreferences = {
        theme: 'dark' as const,
        notifications: {
          email: true,
          push: false,
          sms: true,
          categories: {
            board_updates: true,
            asset_changes: false,
            compliance_alerts: true,
            system_maintenance: false
          }
        },
        privacy: {
          profile_visibility: 'organization' as const,
          activity_visibility: 'private' as const,
          share_analytics: false
        },
        ui_preferences: {
          sidebar_collapsed: true,
          table_density: 'compact' as const,
          default_view: 'list' as const
        }
      }

      const existingUser = { id: userId, preferences: {} }
      const updatedUser = { ...existingUser, preferences: complexPreferences }

      mockUserRepository.findById.mockResolvedValue(existingUser)
      mockUserRepository.update.mockResolvedValue(updatedUser)

      const result = await userService.updateUserPreferences(userId, complexPreferences)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject(complexPreferences)
    })

    it('should handle service dependencies gracefully', async () => {
      const userId = 'user_123'

      // Simulate audit service failure
      mockUserRepository.findById.mockResolvedValue({ id: userId })
      mockAuditRepository.create.mockResolvedValue(
        failure(RepositoryError.internal('Audit service unavailable'))
      )

      // Service should continue operation even if audit fails
      const result = await userService.updateLastAccess(userId)

      expect(result.success).toBe(true) // Should succeed despite audit failure
    })
  })
})