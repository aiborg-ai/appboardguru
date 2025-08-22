/**
 * @jest-environment jsdom
 */
import {
  createNotificationId,
  createUserId,
  createOrganizationId,
  isNotificationId,
  isUserId,
  isOrganizationId,
  NotificationId,
  UserId,
  OrganizationId,
  extractId,
  ValidationResult
} from '@/types/branded'

describe('Notification Branded Types', () => {
  describe('NotificationId', () => {
    it('should create valid notification ID', () => {
      const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const result = createNotificationId(validUuid)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(validUuid)
      expect(isNotificationId(result.data)).toBe(true)
    })

    it('should create valid notification ID with NanoID format', () => {
      const validNanoId = 'V1StGXR8_Z5jdHi6B-myT'
      const result = createNotificationId(validNanoId)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(validNanoId)
      expect(isNotificationId(result.data)).toBe(true)
    })

    it('should reject invalid notification ID format', () => {
      const invalidId = 'invalid-id'
      const result = createNotificationId(invalidId)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid NotificationId')
    })

    it('should reject empty notification ID', () => {
      const result = createNotificationId('')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('ID cannot be empty')
    })

    it('should provide detailed validation issues', () => {
      const result = createNotificationId('invalid')
      
      expect(result.success).toBe(false)
      expect(result.issues).toBeDefined()
      expect(result.issues!.length).toBeGreaterThan(0)
      expect(result.issues![0].message).toContain('ID must be a valid UUID or NanoID format')
    })
  })

  describe('UserId', () => {
    it('should create valid user ID', () => {
      const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const result = createUserId(validUuid)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(validUuid)
      expect(isUserId(result.data)).toBe(true)
    })

    it('should reject invalid user ID format', () => {
      const invalidId = 'not-a-uuid'
      const result = createUserId(invalidId)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid UserId')
    })
  })

  describe('OrganizationId', () => {
    it('should create valid organization ID', () => {
      const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const result = createOrganizationId(validUuid)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(validUuid)
      expect(isOrganizationId(result.data)).toBe(true)
    })

    it('should reject invalid organization ID format', () => {
      const invalidId = 'not-a-uuid'
      const result = createOrganizationId(invalidId)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid OrganizationId')
    })
  })

  describe('Type Safety', () => {
    it('should prevent mixing different branded types at compile time', () => {
      const notificationId = createNotificationId('f47ac10b-58cc-4372-a567-0e02b2c3d479').data!
      const userId = createUserId('f47ac10b-58cc-4372-a567-0e02b2c3d480').data!
      
      // These should be different types even though they're both strings
      expect(typeof notificationId).toBe('string')
      expect(typeof userId).toBe('string')
      
      // But they should not be assignable to each other
      // This is checked at compile time, not runtime
      expect(notificationId).not.toBe(userId)
    })

    it('should allow extracting underlying string value', () => {
      const originalId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const notificationId = createNotificationId(originalId).data!
      
      const extractedId = extractId(notificationId)
      expect(extractedId).toBe(originalId)
      expect(typeof extractedId).toBe('string')
    })
  })

  describe('Type Guards', () => {
    it('should correctly identify notification IDs', () => {
      const validId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const invalidId = 'invalid-id'
      
      expect(isNotificationId(validId)).toBe(true)
      expect(isNotificationId(invalidId)).toBe(false)
      expect(isNotificationId(null)).toBe(false)
      expect(isNotificationId(undefined)).toBe(false)
      expect(isNotificationId(123)).toBe(false)
    })

    it('should correctly identify user IDs', () => {
      const validId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const invalidId = 'invalid-id'
      
      expect(isUserId(validId)).toBe(true)
      expect(isUserId(invalidId)).toBe(false)
      expect(isUserId(null)).toBe(false)
      expect(isUserId(undefined)).toBe(false)
    })

    it('should correctly identify organization IDs', () => {
      const validId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const invalidId = 'invalid-id'
      
      expect(isOrganizationId(validId)).toBe(true)
      expect(isOrganizationId(invalidId)).toBe(false)
      expect(isOrganizationId(null)).toBe(false)
      expect(isOrganizationId(undefined)).toBe(false)
    })
  })

  describe('Validation Results', () => {
    it('should provide consistent validation result structure', () => {
      const validId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const invalidId = 'invalid'
      
      const validResult = createNotificationId(validId)
      const invalidResult = createNotificationId(invalidId)
      
      // Valid result structure
      expect(validResult).toHaveProperty('success', true)
      expect(validResult).toHaveProperty('data', validId)
      expect(validResult).not.toHaveProperty('error')
      expect(validResult).not.toHaveProperty('issues')
      
      // Invalid result structure
      expect(invalidResult).toHaveProperty('success', false)
      expect(invalidResult).toHaveProperty('error')
      expect(invalidResult).toHaveProperty('issues')
      expect(invalidResult).not.toHaveProperty('data')
    })

    it('should handle edge cases in validation', () => {
      const edgeCases = [
        '', // Empty string
        ' ', // Whitespace
        'f47ac10b-58cc-4372-a567-0e02b2c3d47', // Too short UUID
        'f47ac10b-58cc-4372-a567-0e02b2c3d4790', // Too long UUID
        'g47ac10b-58cc-4372-a567-0e02b2c3d479', // Invalid UUID character
        'f47ac10b_58cc_4372_a567_0e02b2c3d479', // Wrong separators
      ]
      
      edgeCases.forEach(testCase => {
        const result = createNotificationId(testCase)
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.issues).toBeDefined()
      })
    })
  })

  describe('Integration with Notification System', () => {
    interface NotificationData {
      id: NotificationId
      user_id: UserId
      organization_id?: OrganizationId
      title: string
      message: string
    }

    it('should work correctly in notification data structures', () => {
      const notificationId = createNotificationId('f47ac10b-58cc-4372-a567-0e02b2c3d479').data!
      const userId = createUserId('f47ac10b-58cc-4372-a567-0e02b2c3d480').data!
      const organizationId = createOrganizationId('f47ac10b-58cc-4372-a567-0e02b2c3d481').data!
      
      const notificationData: NotificationData = {
        id: notificationId,
        user_id: userId,
        organization_id: organizationId,
        title: 'Test Notification',
        message: 'This is a test notification',
      }
      
      expect(notificationData.id).toBe(notificationId)
      expect(notificationData.user_id).toBe(userId)
      expect(notificationData.organization_id).toBe(organizationId)
      expect(isNotificationId(notificationData.id)).toBe(true)
      expect(isUserId(notificationData.user_id)).toBe(true)
      expect(isOrganizationId(notificationData.organization_id!)).toBe(true)
    })

    it('should prevent assignment of wrong ID types', () => {
      const notificationId = createNotificationId('f47ac10b-58cc-4372-a567-0e02b2c3d479').data!
      const userId = createUserId('f47ac10b-58cc-4372-a567-0e02b2c3d480').data!
      
      // This would cause TypeScript compile error (tested at compile time)
      // const wrongAssignment: NotificationId = userId
      
      // But we can verify they're different at runtime level
      expect(extractId(notificationId)).not.toBe(extractId(userId))
    })
  })

  describe('Performance and Memory Usage', () => {
    it('should not add significant overhead', () => {
      const originalId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const brandedId = createNotificationId(originalId).data!
      
      // Branded types should be zero-cost abstractions
      expect(brandedId).toBe(originalId)
      expect(typeof brandedId).toBe('string')
      expect(JSON.stringify(brandedId)).toBe(JSON.stringify(originalId))
    })

    it('should handle large batches efficiently', () => {
      const batchSize = 1000
      const ids = Array.from({ length: batchSize }, (_, i) => 
        `f47ac10b-58cc-4372-a567-${i.toString().padStart(12, '0')}`
      )
      
      const start = performance.now()
      const brandedIds = ids.map(id => createNotificationId(id))
      const end = performance.now()
      
      expect(brandedIds.every(result => result.success)).toBe(true)
      expect(end - start).toBeLessThan(100) // Should complete within 100ms
    })
  })
})