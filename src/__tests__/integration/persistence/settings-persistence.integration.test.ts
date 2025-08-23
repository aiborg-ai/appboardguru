/**
 * Settings Persistence Integration Tests
 * Tests database operations and data integrity for settings system
 * Following CLAUDE.md testing guidelines with 85% repository coverage target
 */

import { createClient } from '@supabase/supabase-js'
import { userSettingsRepository } from '@/lib/repositories/settings.repository'
import { SettingsTestFactories } from '@/testing/settings-test-factories'
import type { Database } from '@/types/database'
import type { UserId } from '@/types/branded'

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321'
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-key'

describe('Settings Persistence Integration Tests', () => {
  let testClient: ReturnType<typeof createClient<Database>>
  let testUserId: UserId
  let testOrganizationId: string

  beforeAll(async () => {
    // Create test client for database operations
    testClient = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)
    
    // Create test user and organization
    const { data: userData, error: userError } = await testClient
      .from('users')
      .insert({
        email: 'test-settings@appboardguru.com',
        full_name: 'Settings Test User'
      })
      .select()
      .single()

    if (userError) {
      throw new Error(`Failed to create test user: ${userError.message}`)
    }

    testUserId = userData.id as UserId

    const { data: orgData, error: orgError } = await testClient
      .from('organizations')
      .insert({
        name: 'Test Organization',
        slug: 'test-org-settings',
        owner_id: testUserId
      })
      .select()
      .single()

    if (orgError) {
      throw new Error(`Failed to create test organization: ${orgError.message}`)
    }

    testOrganizationId = orgData.id
  })

  afterAll(async () => {
    // Clean up test data
    if (testUserId && testOrganizationId) {
      await testClient.from('user_settings').delete().eq('user_id', testUserId)
      await testClient.from('notification_preferences').delete().eq('user_id', testUserId)
      await testClient.from('fyi_preferences').delete().eq('user_id', testUserId)
      await testClient.from('organizations').delete().eq('id', testOrganizationId)
      await testClient.from('users').delete().eq('id', testUserId)
    }
  })

  beforeEach(async () => {
    // Clean up any existing test data before each test
    await testClient.from('user_settings').delete().eq('user_id', testUserId)
    await testClient.from('notification_preferences').delete().eq('user_id', testUserId)
    await testClient.from('fyi_preferences').delete().eq('user_id', testUserId)
  })

  describe('User Settings Persistence', () => {
    test('should create and retrieve user settings', async () => {
      const settingsData = SettingsTestFactories.createUserSettings({
        userId: testUserId,
        theme: 'dark',
        language: 'en-US',
        timezone: 'America/New_York',
        dateFormat: 'MM/dd/yyyy',
        emailNotifications: true,
        pushNotifications: false
      })

      // Create settings
      const createResult = await userSettingsRepository.createUserSettings(
        testUserId,
        settingsData
      )

      expect(createResult.success).toBe(true)
      expect(createResult.data).toMatchObject({
        user_id: testUserId,
        theme: 'dark',
        language: 'en-US',
        timezone: 'America/New_York',
        date_format: 'MM/dd/yyyy',
        email_notifications: true,
        push_notifications: false
      })

      // Retrieve settings
      const retrieveResult = await userSettingsRepository.getUserSettings(testUserId)

      expect(retrieveResult.success).toBe(true)
      expect(retrieveResult.data).toMatchObject({
        user_id: testUserId,
        theme: 'dark',
        language: 'en-US',
        timezone: 'America/New_York'
      })
    })

    test('should update existing user settings', async () => {
      // Create initial settings
      const initialSettings = SettingsTestFactories.createUserSettings({
        userId: testUserId,
        theme: 'light',
        language: 'en-US'
      })

      await userSettingsRepository.createUserSettings(testUserId, initialSettings)

      // Update settings
      const updateData = {
        theme: 'dark' as const,
        language: 'es-ES' as const,
        emailNotifications: false
      }

      const updateResult = await userSettingsRepository.updateUserSettings(
        testUserId,
        updateData
      )

      expect(updateResult.success).toBe(true)
      expect(updateResult.data).toMatchObject({
        theme: 'dark',
        language: 'es-ES',
        email_notifications: false
      })

      // Verify persistence
      const retrieveResult = await userSettingsRepository.getUserSettings(testUserId)
      expect(retrieveResult.data).toMatchObject({
        theme: 'dark',
        language: 'es-ES',
        email_notifications: false
      })
    })

    test('should handle optimistic locking conflicts', async () => {
      // Create initial settings
      const settings = await userSettingsRepository.createUserSettings(
        testUserId,
        SettingsTestFactories.createUserSettings({ userId: testUserId })
      )

      expect(settings.success).toBe(true)
      const initialVersion = settings.data!.version

      // Simulate concurrent update (outdated version)
      const updateResult = await userSettingsRepository.updateUserSettings(
        testUserId,
        { theme: 'dark' },
        initialVersion - 1 // Outdated version
      )

      expect(updateResult.success).toBe(false)
      expect(updateResult.error.code).toBe('OPTIMISTIC_LOCK_CONFLICT')
      expect(updateResult.error.message).toContain('has been modified')
    })

    test('should handle non-existent user settings gracefully', async () => {
      const nonExistentUserId = 'non-existent-user' as UserId

      const result = await userSettingsRepository.getUserSettings(nonExistentUserId)

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toContain('User settings not found')
    })
  })

  describe('Notification Preferences Persistence', () => {
    test('should store and retrieve notification preferences', async () => {
      const preferences = SettingsTestFactories.createNotificationPreferences({
        userId: testUserId,
        emailEnabled: true,
        pushEnabled: false,
        smsEnabled: true,
        frequency: 'daily',
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'America/New_York'
        }
      })

      // Insert notification preferences directly to test persistence
      const { data: insertedData, error: insertError } = await testClient
        .from('notification_preferences')
        .insert({
          user_id: testUserId,
          email_enabled: preferences.emailEnabled,
          push_enabled: preferences.pushEnabled,
          sms_enabled: preferences.smsEnabled,
          frequency: preferences.frequency,
          quiet_hours: preferences.quietHours,
          categories: preferences.categories || {},
          delivery_methods: preferences.deliveryMethods || {}
        })
        .select()
        .single()

      expect(insertError).toBeNull()
      expect(insertedData).toMatchObject({
        user_id: testUserId,
        email_enabled: true,
        push_enabled: false,
        sms_enabled: true,
        frequency: 'daily'
      })

      // Retrieve and verify
      const { data: retrievedData, error: retrieveError } = await testClient
        .from('notification_preferences')
        .select('*')
        .eq('user_id', testUserId)
        .single()

      expect(retrieveError).toBeNull()
      expect(retrievedData).toMatchObject({
        email_enabled: true,
        push_enabled: false,
        sms_enabled: true,
        frequency: 'daily',
        quiet_hours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'America/New_York'
        }
      })
    })

    test('should handle complex notification category preferences', async () => {
      const complexCategories = {
        'Document Management': {
          'New Document Uploaded': { email: true, push: false, inApp: true },
          'Document Shared': { email: false, push: true, inApp: true },
          'Document Expired': { email: true, push: true, inApp: true }
        },
        'Task Management': {
          'Task Assigned': { email: true, push: true, inApp: true },
          'Task Due Soon': { email: true, push: false, inApp: true },
          'Task Completed': { email: false, push: false, inApp: true }
        },
        'System': {
          'Maintenance Scheduled': { email: true, push: false, inApp: true },
          'Security Alert': { email: true, push: true, inApp: true }
        }
      }

      const { data, error } = await testClient
        .from('notification_preferences')
        .insert({
          user_id: testUserId,
          email_enabled: true,
          push_enabled: true,
          categories: complexCategories
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.categories).toEqual(complexCategories)

      // Test category-specific updates
      const updatedCategories = {
        ...complexCategories,
        'Document Management': {
          ...complexCategories['Document Management'],
          'New Document Uploaded': { email: false, push: true, inApp: true }
        }
      }

      const { error: updateError } = await testClient
        .from('notification_preferences')
        .update({ categories: updatedCategories })
        .eq('user_id', testUserId)

      expect(updateError).toBeNull()
    })
  })

  describe('FYI Preferences Persistence', () => {
    test('should store and retrieve FYI preferences', async () => {
      const fyiPreferences = {
        user_id: testUserId,
        news_categories: ['technology', 'business', 'science'],
        update_frequency: 'daily',
        digest_enabled: true,
        insight_types: {
          market: true,
          news: true,
          weather: false,
          calendar: true
        },
        notification_settings: {
          email: true,
          push: false,
          inApp: true
        },
        quiet_hours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'America/New_York'
        }
      }

      const { data: insertedData, error: insertError } = await testClient
        .from('fyi_preferences')
        .insert(fyiPreferences)
        .select()
        .single()

      expect(insertError).toBeNull()
      expect(insertedData).toMatchObject({
        user_id: testUserId,
        news_categories: ['technology', 'business', 'science'],
        update_frequency: 'daily',
        digest_enabled: true
      })

      // Test complex JSON field storage
      expect(insertedData.insight_types).toEqual({
        market: true,
        news: true,
        weather: false,
        calendar: true
      })
    })

    test('should handle FYI preference updates with version control', async () => {
      // Insert initial preferences
      const { data: initialData, error: insertError } = await testClient
        .from('fyi_preferences')
        .insert({
          user_id: testUserId,
          news_categories: ['technology'],
          update_frequency: 'hourly',
          digest_enabled: false,
          version: 1
        })
        .select()
        .single()

      expect(insertError).toBeNull()
      expect(initialData.version).toBe(1)

      // Update preferences with version increment
      const { data: updatedData, error: updateError } = await testClient
        .from('fyi_preferences')
        .update({
          news_categories: ['technology', 'business'],
          digest_enabled: true,
          version: initialData.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', testUserId)
        .eq('version', initialData.version) // Optimistic locking
        .select()
        .single()

      expect(updateError).toBeNull()
      expect(updatedData.version).toBe(2)
      expect(updatedData.news_categories).toEqual(['technology', 'business'])
      expect(updatedData.digest_enabled).toBe(true)
    })
  })

  describe('Transaction Management and Data Integrity', () => {
    test('should maintain consistency across related tables', async () => {
      // Begin transaction-like operations
      const settingsData = SettingsTestFactories.createUserSettings({
        userId: testUserId
      })

      const notificationPrefs = SettingsTestFactories.createNotificationPreferences({
        userId: testUserId
      })

      // Insert user settings
      const settingsResult = await userSettingsRepository.createUserSettings(
        testUserId,
        settingsData
      )
      expect(settingsResult.success).toBe(true)

      // Insert notification preferences
      const { data: notifData, error: notifError } = await testClient
        .from('notification_preferences')
        .insert({
          user_id: testUserId,
          email_enabled: notificationPrefs.emailEnabled,
          push_enabled: notificationPrefs.pushEnabled,
          frequency: notificationPrefs.frequency
        })
        .select()
        .single()

      expect(notifError).toBeNull()

      // Verify both records exist and are linked
      const { data: joinedData, error: joinError } = await testClient
        .from('user_settings')
        .select(`
          *,
          notification_preferences!inner(*)
        `)
        .eq('user_id', testUserId)
        .single()

      expect(joinError).toBeNull()
      expect(joinedData.user_id).toBe(testUserId)
      expect(joinedData.notification_preferences).toBeDefined()
    })

    test('should handle concurrent modifications correctly', async () => {
      // Create initial settings
      const initialSettings = await userSettingsRepository.createUserSettings(
        testUserId,
        SettingsTestFactories.createUserSettings({ userId: testUserId })
      )

      expect(initialSettings.success).toBe(true)
      const version = initialSettings.data!.version

      // Simulate two concurrent updates
      const update1Promise = userSettingsRepository.updateUserSettings(
        testUserId,
        { theme: 'dark' },
        version
      )

      const update2Promise = userSettingsRepository.updateUserSettings(
        testUserId,
        { language: 'es-ES' },
        version
      )

      const [result1, result2] = await Promise.all([update1Promise, update2Promise])

      // One should succeed, one should fail with optimistic lock conflict
      const successCount = [result1, result2].filter(r => r.success).length
      const conflictCount = [result1, result2].filter(r => 
        !r.success && r.error.code === 'OPTIMISTIC_LOCK_CONFLICT'
      ).length

      expect(successCount).toBe(1)
      expect(conflictCount).toBe(1)
    })

    test('should enforce foreign key constraints', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000' as UserId

      // Attempt to insert notification preferences for non-existent user
      const { error } = await testClient
        .from('notification_preferences')
        .insert({
          user_id: nonExistentUserId,
          email_enabled: true,
          push_enabled: false
        })

      expect(error).not.toBeNull()
      expect(error?.code).toBe('23503') // Foreign key constraint violation
    })
  })

  describe('Data Migration and Schema Evolution', () => {
    test('should handle schema changes gracefully', async () => {
      // Test that existing data remains valid after schema updates
      const settings = await userSettingsRepository.createUserSettings(
        testUserId,
        SettingsTestFactories.createUserSettings({
          userId: testUserId,
          theme: 'light'
        })
      )

      expect(settings.success).toBe(true)

      // Simulate adding a new field by updating with additional data
      const { data: updatedData, error } = await testClient
        .from('user_settings')
        .update({
          preferences: {
            theme: 'light',
            newFeature: true, // New field
            experimentalSettings: {
              betaFeatures: true,
              advancedMode: false
            }
          }
        })
        .eq('user_id', testUserId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(updatedData.preferences).toMatchObject({
        theme: 'light',
        newFeature: true,
        experimentalSettings: {
          betaFeatures: true,
          advancedMode: false
        }
      })
    })

    test('should maintain backward compatibility', async () => {
      // Test that old data structures still work
      const legacyPreferences = {
        user_id: testUserId,
        email_enabled: true,
        push_enabled: false,
        // Missing newer fields like 'frequency', 'categories'
      }

      const { data, error } = await testClient
        .from('notification_preferences')
        .insert(legacyPreferences)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toMatchObject(legacyPreferences)

      // Verify defaults are applied for missing fields
      expect(data.frequency).toBeDefined() // Should have default value
    })
  })

  describe('Performance and Scalability', () => {
    test('should handle bulk operations efficiently', async () => {
      const batchSize = 100
      const notifications = Array(batchSize).fill(0).map((_, i) => ({
        user_id: testUserId,
        type: 'bulk_test',
        category: 'Test',
        title: `Bulk Notification ${i}`,
        message: `Test message ${i}`,
        priority: 'low' as const,
        status: 'unread' as const
      }))

      const startTime = Date.now()
      
      const { data, error } = await testClient
        .from('notifications')
        .insert(notifications)
        .select()

      const endTime = Date.now()

      expect(error).toBeNull()
      expect(data).toHaveLength(batchSize)
      expect(endTime - startTime).toBeLessThan(2000) // Should complete within 2 seconds

      // Clean up
      await testClient
        .from('notifications')
        .delete()
        .eq('type', 'bulk_test')
    })

    test('should handle large JSON objects efficiently', async () => {
      const largeMetadata = {
        complexObject: Array(1000).fill(0).reduce((acc, _, i) => ({
          ...acc,
          [`property${i}`]: {
            value: `value${i}`,
            timestamp: new Date().toISOString(),
            nested: {
              level1: `data${i}`,
              level2: Array(10).fill(0).map((_, j) => ({
                id: `${i}-${j}`,
                data: `nested-data-${i}-${j}`
              }))
            }
          }
        }), {})
      }

      const startTime = Date.now()

      const { data, error } = await testClient
        .from('user_settings')
        .insert({
          user_id: testUserId,
          theme: 'light',
          language: 'en-US',
          preferences: largeMetadata
        })
        .select()
        .single()

      const endTime = Date.now()

      expect(error).toBeNull()
      expect(data.preferences).toEqual(largeMetadata)
      expect(endTime - startTime).toBeLessThan(1000) // Should handle large JSON efficiently
    })
  })
})