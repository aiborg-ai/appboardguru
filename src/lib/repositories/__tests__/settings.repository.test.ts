/**
 * Settings Repository Tests
 * Following CLAUDE.md testing guidelines - 85% coverage target for repositories
 * Testing Repository Pattern with Result pattern and branded types
 */

import { jest } from '@jest/globals'
import { SettingsRepository, UserSettingsRepository, OrganizationSettingsRepository } from '../settings.repository'
import { setupTestEnvironment } from '@/testing/settings-test-config'
import { UserContextFactory, NotificationPreferenceFactory, ExportJobFactory } from '@/testing/settings-test-factories'
import type { UserId, OrganizationId } from '@/types/branded'
import type { Result } from '@/lib/repositories/result'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
    execute: jest.fn()
  })),
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn()
  }
}

jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabaseClient
}))

describe('SettingsRepository', () => {
  let settingsRepository: SettingsRepository
  let userSettingsRepository: UserSettingsRepository
  let organizationSettingsRepository: OrganizationSettingsRepository

  beforeEach(() => {
    setupTestEnvironment()
    jest.clearAllMocks()
    
    settingsRepository = new SettingsRepository(mockSupabaseClient as any)
    userSettingsRepository = new UserSettingsRepository(mockSupabaseClient as any)
    organizationSettingsRepository = new OrganizationSettingsRepository(mockSupabaseClient as any)
  })

  describe('UserSettingsRepository', () => {
    const mockUserId = 'user-123' as UserId
    const mockUserSettings = {
      userId: mockUserId,
      preferences: {
        theme: 'dark',
        language: 'en',
        timezone: 'America/New_York'
      },
      notifications: {
        email: true,
        push: false,
        frequency: 'digest_daily'
      },
      privacy: {
        shareProfile: false,
        allowAnalytics: true
      },
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: mockUserId
    }

    describe('getUserSettings', () => {
      test('should successfully retrieve user settings', async () => {
        // Arrange
        mockSupabaseClient.from().single.mockResolvedValue({
          data: mockUserSettings,
          error: null
        })

        // Act
        const result = await userSettingsRepository.getUserSettings(mockUserId)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockUserSettings)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_settings')
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('user_id', mockUserId)
      })

      test('should return null when user settings not found', async () => {
        // Arrange
        mockSupabaseClient.from().single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows returned' }
        })

        // Act
        const result = await userSettingsRepository.getUserSettings(mockUserId)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data).toBeNull()
      })

      test('should return error result when database query fails', async () => {
        // Arrange
        const mockError = { code: 'CONNECTION_ERROR', message: 'Database connection failed' }
        mockSupabaseClient.from().single.mockResolvedValue({
          data: null,
          error: mockError
        })

        // Act
        const result = await userSettingsRepository.getUserSettings(mockUserId)

        // Assert
        expect(result.success).toBe(false)
        expect(result.error.code).toBe('DATABASE_ERROR')
        expect(result.error.message).toContain('Database connection failed')
      })
    })

    describe('updateUserSettings', () => {
      const mockUpdateData = {
        preferences: {
          theme: 'light',
          language: 'es',
          timezone: 'Europe/Madrid'
        },
        notifications: {
          email: false,
          push: true,
          frequency: 'immediate'
        }
      }

      test('should successfully update user settings with optimistic locking', async () => {
        // Arrange
        const updatedSettings = {
          ...mockUserSettings,
          ...mockUpdateData,
          version: 2,
          updatedAt: new Date().toISOString()
        }
        
        mockSupabaseClient.from().eq().single.mockResolvedValue({
          data: updatedSettings,
          error: null
        })

        // Act
        const result = await userSettingsRepository.updateUserSettings(
          mockUserId, 
          mockUpdateData, 
          1 // current version
        )

        // Assert
        expect(result.success).toBe(true)
        expect(result.data?.version).toBe(2)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_settings')
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('user_id', mockUserId)
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('version', 1)
      })

      test('should handle optimistic locking conflicts', async () => {
        // Arrange
        mockSupabaseClient.from().eq().single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows returned' }
        })

        // Act
        const result = await userSettingsRepository.updateUserSettings(
          mockUserId,
          mockUpdateData,
          1 // outdated version
        )

        // Assert
        expect(result.success).toBe(false)
        expect(result.error.code).toBe('OPTIMISTIC_LOCK_CONFLICT')
        expect(result.error.message).toContain('version conflict')
      })

      test('should create new settings if user settings do not exist', async () => {
        // Arrange
        const newSettings = {
          userId: mockUserId,
          ...mockUpdateData,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: mockUserId
        }
        
        mockSupabaseClient.from().upsert().single.mockResolvedValue({
          data: newSettings,
          error: null
        })

        // Act
        const result = await userSettingsRepository.updateUserSettings(
          mockUserId,
          mockUpdateData
        )

        // Assert
        expect(result.success).toBe(true)
        expect(result.data?.version).toBe(1)
        expect(mockSupabaseClient.from().upsert).toHaveBeenCalled()
      })
    })

    describe('deleteUserSettings', () => {
      test('should successfully delete user settings', async () => {
        // Arrange
        mockSupabaseClient.from().eq().execute.mockResolvedValue({
          data: [{ id: mockUserId }],
          error: null
        })

        // Act
        const result = await userSettingsRepository.deleteUserSettings(mockUserId)

        // Assert
        expect(result.success).toBe(true)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_settings')
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('user_id', mockUserId)
        expect(mockSupabaseClient.from().delete).toHaveBeenCalled()
      })

      test('should handle deletion errors gracefully', async () => {
        // Arrange
        const mockError = { code: 'PERMISSION_DENIED', message: 'Insufficient permissions' }
        mockSupabaseClient.from().eq().execute.mockResolvedValue({
          data: null,
          error: mockError
        })

        // Act
        const result = await userSettingsRepository.deleteUserSettings(mockUserId)

        // Assert
        expect(result.success).toBe(false)
        expect(result.error.code).toBe('DATABASE_ERROR')
        expect(result.error.message).toContain('Insufficient permissions')
      })
    })

    describe('Notification Preferences', () => {
      test('should retrieve notification preferences for user', async () => {
        // Arrange
        const mockPreferences = [
          NotificationPreferenceFactory.createBoardGovernance(),
          NotificationPreferenceFactory.createCriticalAlert()
        ]
        
        mockSupabaseClient.from().execute.mockResolvedValue({
          data: mockPreferences,
          error: null
        })

        // Act
        const result = await userSettingsRepository.getNotificationPreferences(mockUserId)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('notification_preferences')
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('user_id', mockUserId)
      })

      test('should update notification preference', async () => {
        // Arrange
        const mockPreference = NotificationPreferenceFactory.createBoardGovernance()
        const updateData = { enabled: false, frequency: 'digest_weekly' }
        
        mockSupabaseClient.from().eq().single.mockResolvedValue({
          data: { ...mockPreference, ...updateData },
          error: null
        })

        // Act
        const result = await userSettingsRepository.updateNotificationPreference(
          mockUserId,
          'board_meeting_scheduled',
          updateData
        )

        // Assert
        expect(result.success).toBe(true)
        expect(result.data?.enabled).toBe(false)
        expect(result.data?.frequency).toBe('digest_weekly')
      })
    })

    describe('Export Preferences', () => {
      test('should retrieve export jobs for user', async () => {
        // Arrange
        const mockJobs = [
          ExportJobFactory.create({ userId: mockUserId }),
          ExportJobFactory.createScheduled()
        ]
        
        mockSupabaseClient.from().execute.mockResolvedValue({
          data: mockJobs,
          error: null
        })

        // Act
        const result = await userSettingsRepository.getExportJobs(mockUserId)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('export_jobs')
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('user_id', mockUserId)
      })

      test('should create new export job', async () => {
        // Arrange
        const mockJobData = {
          name: 'Test Export',
          categories: ['board_governance'],
          format: 'json' as const,
          scheduled: false
        }
        
        const createdJob = ExportJobFactory.create({
          userId: mockUserId,
          ...mockJobData
        })
        
        mockSupabaseClient.from().insert().single.mockResolvedValue({
          data: createdJob,
          error: null
        })

        // Act
        const result = await userSettingsRepository.createExportJob(mockUserId, mockJobData)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data?.name).toBe('Test Export')
        expect(result.data?.userId).toBe(mockUserId)
      })
    })
  })

  describe('OrganizationSettingsRepository', () => {
    const mockOrgId = 'org-456' as OrganizationId
    const mockOrgSettings = {
      organizationId: mockOrgId,
      policies: {
        mfaRequired: true,
        passwordPolicy: {
          minLength: 12,
          requireSpecialChars: true
        },
        sessionTimeout: 480
      },
      backupPolicies: [
        {
          enabled: true,
          frequency: 'daily',
          retentionDays: 365
        }
      ],
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin-123' as UserId
    }

    describe('getOrganizationSettings', () => {
      test('should retrieve organization settings', async () => {
        // Arrange
        mockSupabaseClient.from().single.mockResolvedValue({
          data: mockOrgSettings,
          error: null
        })

        // Act
        const result = await organizationSettingsRepository.getOrganizationSettings(mockOrgId)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockOrgSettings)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_settings')
        expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('organization_id', mockOrgId)
      })

      test('should return default settings when not found', async () => {
        // Arrange
        mockSupabaseClient.from().single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows returned' }
        })

        // Act
        const result = await organizationSettingsRepository.getOrganizationSettings(mockOrgId)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data).toBeNull()
      })
    })

    describe('updateOrganizationSettings', () => {
      test('should update organization settings with audit trail', async () => {
        // Arrange
        const updateData = {
          policies: {
            ...mockOrgSettings.policies,
            mfaRequired: false
          }
        }
        const updatedBy = 'admin-456' as UserId
        
        const updatedSettings = {
          ...mockOrgSettings,
          ...updateData,
          version: 2,
          updatedAt: new Date().toISOString(),
          updatedBy
        }
        
        mockSupabaseClient.from().eq().single.mockResolvedValue({
          data: updatedSettings,
          error: null
        })

        // Act
        const result = await organizationSettingsRepository.updateOrganizationSettings(
          mockOrgId,
          updateData,
          updatedBy,
          1 // current version
        )

        // Assert
        expect(result.success).toBe(true)
        expect(result.data?.version).toBe(2)
        expect(result.data?.updatedBy).toBe(updatedBy)
        expect(result.data?.policies.mfaRequired).toBe(false)
      })
    })

    describe('Backup Policies', () => {
      test('should retrieve backup policies for organization', async () => {
        // Arrange
        const mockPolicies = [
          {
            id: 'policy-1',
            organizationId: mockOrgId,
            name: 'Daily Backup',
            enabled: true,
            frequency: 'daily'
          },
          {
            id: 'policy-2',
            organizationId: mockOrgId,
            name: 'Weekly Archive',
            enabled: true,
            frequency: 'weekly'
          }
        ]
        
        mockSupabaseClient.from().execute.mockResolvedValue({
          data: mockPolicies,
          error: null
        })

        // Act
        const result = await organizationSettingsRepository.getBackupPolicies(mockOrgId)

        // Assert
        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('backup_policies')
      })
    })
  })

  describe('Transaction Management', () => {
    test('should handle transactions with rollback on failure', async () => {
      // Arrange
      const mockTransaction = {
        rollback: jest.fn(),
        commit: jest.fn()
      }
      
      mockSupabaseClient.transaction = jest.fn().mockResolvedValue(mockTransaction)
      
      const updateData = { theme: 'dark' }
      const mockError = new Error('Transaction failed')
      
      mockSupabaseClient.from().update().eq().single.mockRejectedValue(mockError)

      // Act
      const result = await userSettingsRepository.updateUserSettingsWithTransaction(
        mockUserId,
        updateData
      )

      // Assert
      expect(result.success).toBe(false)
      expect(mockTransaction.rollback).toHaveBeenCalled()
      expect(mockTransaction.commit).not.toHaveBeenCalled()
    })

    test('should commit transaction on success', async () => {
      // Arrange
      const mockTransaction = {
        rollback: jest.fn(),
        commit: jest.fn()
      }
      
      mockSupabaseClient.transaction = jest.fn().mockResolvedValue(mockTransaction)
      
      const updateData = { theme: 'dark' }
      const updatedSettings = { ...mockUserSettings, ...updateData, version: 2 }
      
      mockSupabaseClient.from().update().eq().single.mockResolvedValue({
        data: updatedSettings,
        error: null
      })

      // Act
      const result = await userSettingsRepository.updateUserSettingsWithTransaction(
        mockUserId,
        updateData
      )

      // Assert
      expect(result.success).toBe(true)
      expect(mockTransaction.commit).toHaveBeenCalled()
      expect(mockTransaction.rollback).not.toHaveBeenCalled()
    })
  })

  describe('Result Pattern Integration', () => {
    test('should return Result<T> for all operations', async () => {
      // Arrange
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUserSettings,
        error: null
      })

      // Act
      const result = await userSettingsRepository.getUserSettings(mockUserId)

      // Assert - Type checking for Result pattern
      expect(result).toHaveProperty('success')
      
      if (result.success) {
        expect(result).toHaveProperty('data')
        expect(result.data).toBeDefined()
      } else {
        expect(result).toHaveProperty('error')
        expect(result.error).toHaveProperty('code')
        expect(result.error).toHaveProperty('message')
      }
    })

    test('should maintain branded type safety throughout operations', async () => {
      // Arrange
      const userId: UserId = 'user-123' as UserId
      const orgId: OrganizationId = 'org-456' as OrganizationId
      
      mockSupabaseClient.from().single.mockResolvedValue({
        data: { userId, organizationId: orgId },
        error: null
      })

      // Act
      const result = await userSettingsRepository.getUserSettings(userId)

      // Assert - TypeScript should enforce branded types
      expect(result.success).toBe(true)
      
      if (result.success && result.data) {
        const retrievedUserId: UserId = result.data.userId
        const retrievedOrgId: OrganizationId = result.data.organizationId
        
        expect(retrievedUserId).toBe(userId)
        expect(retrievedOrgId).toBe(orgId)
      }
    })
  })

  describe('Error Recovery and Retry Logic', () => {
    test('should retry failed operations with exponential backoff', async () => {
      // Arrange
      let attemptCount = 0
      mockSupabaseClient.from().single.mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          return Promise.resolve({
            data: null,
            error: { code: 'NETWORK_ERROR', message: 'Connection timeout' }
          })
        }
        return Promise.resolve({
          data: mockUserSettings,
          error: null
        })
      })

      // Act
      const result = await userSettingsRepository.getUserSettingsWithRetry(mockUserId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUserSettings)
      expect(attemptCount).toBe(3) // Should have retried twice before success
    })

    test('should fail after maximum retry attempts', async () => {
      // Arrange
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PERSISTENT_ERROR', message: 'Permanent failure' }
      })

      // Act
      const result = await userSettingsRepository.getUserSettingsWithRetry(
        mockUserId,
        { maxRetries: 2, baseDelay: 100 }
      )

      // Assert
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('MAX_RETRIES_EXCEEDED')
    })
  })
})