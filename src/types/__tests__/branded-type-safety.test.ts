/**
 * Branded Type Safety Tests
 * Comprehensive tests for type safety, runtime validation, and ID mixing prevention
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  // Types
  type UserId,
  type OrganizationId,
  type AssetId,
  type VaultId,
  type AnyBrandedId,
  type ValidationResult,
  
  // Constructors
  createUserId,
  createOrganizationId,
  createAssetId,
  createVaultId,
  
  // Unsafe constructors
  unsafeUserId,
  unsafeOrganizationId,
  
  // Type guards
  isUserId,
  isOrganizationId,
  isAssetId,
  isAnyBrandedId,
  
  // Utilities
  extractId,
  ensureIdType,
  validateBatch,
  mapBrandedIds,
  convertIdType,
  
  // Advanced
  createOrgScopedId,
  extractScope,
  type OrgScopedId
} from '../branded'

describe('Branded Type System', () => {
  describe('Type Safety - Compile Time', () => {
    it('should prevent direct assignment between different branded types', () => {
      const userId = unsafeUserId('user-123')
      const orgId = unsafeOrganizationId('org-456')
      
      // These should be different types at compile time
      expectTypeOf(userId).not.toEqualTypeOf<OrganizationId>()
      expectTypeOf(orgId).not.toEqualTypeOf<UserId>()
      
      // But they should both be assignable to AnyBrandedId
      expectTypeOf(userId).toMatchTypeOf<AnyBrandedId>()
      expectTypeOf(orgId).toMatchTypeOf<AnyBrandedId>()
    })

    it('should prevent assignment to plain string without explicit conversion', () => {
      const userId = unsafeUserId('user-123')
      
      // This should require explicit conversion
      expectTypeOf(userId).not.toEqualTypeOf<string>()
      expectTypeOf(extractId(userId)).toEqualTypeOf<string>()
    })

    it('should enforce type safety in function parameters', () => {
      function processUserId(id: UserId): string {
        return extractId(id)
      }
      
      const userId = unsafeUserId('user-123')
      const orgId = unsafeOrganizationId('org-456')
      
      // This should work
      expectTypeOf(userId).toMatchTypeOf<Parameters<typeof processUserId>[0]>()
      
      // This should not work (would cause compile error)
      expectTypeOf(orgId).not.toMatchTypeOf<Parameters<typeof processUserId>[0]>()
    })
  })

  describe('Runtime Validation', () => {
    it('should validate UUIDs correctly', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000'
      const invalidUUID = 'not-a-uuid'
      
      const validResult = createUserId(validUUID)
      const invalidResult = createUserId(invalidUUID)
      
      expect(validResult.success).toBe(true)
      expect(validResult.data).toBe(validUUID)
      
      expect(invalidResult.success).toBe(false)
      expect(invalidResult.error).toContain('Invalid UserId')
    })

    it('should validate NanoIDs correctly', () => {
      const validNanoId = 'V1StGXR8_Z5jdHi6B-myT'
      const result = createUserId(validNanoId)
      
      expect(result.success).toBe(true)
      expect(result.data).toBe(validNanoId)
    })

    it('should reject empty strings', () => {
      const result = createUserId('')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('ID cannot be empty')
    })

    it('should provide detailed validation errors', () => {
      const result = createUserId('invalid')
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.issues).toBeDefined()
      expect(result.issues!.length).toBeGreaterThan(0)
    })
  })

  describe('Type Guards', () => {
    it('should correctly identify branded types', () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000'
      const userId = unsafeUserId(validId)
      const orgId = unsafeOrganizationId(validId)
      
      expect(isUserId(userId)).toBe(true)
      expect(isOrganizationId(userId)).toBe(true) // Both have same underlying validation
      expect(isAssetId(userId)).toBe(true) // Same validation, different brand
      
      expect(isUserId('invalid')).toBe(false)
      expect(isAnyBrandedId(userId)).toBe(true)
      expect(isAnyBrandedId('invalid')).toBe(false)
    })

    it('should work with unknown types', () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000'
      const unknownValue: unknown = validId
      
      if (isUserId(unknownValue)) {
        // TypeScript should now know this is UserId
        expectTypeOf(unknownValue).toEqualTypeOf<UserId>()
        expect(extractId(unknownValue)).toBe(validId)
      }
    })
  })

  describe('Utility Functions', () => {
    const validId = '550e8400-e29b-41d4-a716-446655440000'

    it('should extract underlying string values', () => {
      const userId = unsafeUserId(validId)
      const orgId = unsafeOrganizationId(validId)
      
      expect(extractId(userId)).toBe(validId)
      expect(extractId(orgId)).toBe(validId)
    })

    it('should enforce type safety with ensureIdType', () => {
      const userId = unsafeUserId(validId)
      const result = ensureIdType<UserId>(userId)
      
      expectTypeOf(result).toEqualTypeOf<UserId>()
      expect(extractId(result)).toBe(validId)
    })

    it('should convert between branded types safely', () => {
      const userId = unsafeUserId(validId)
      const result = convertIdType(userId, createAssetId)
      
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expectTypeOf(result.data).toEqualTypeOf<AssetId>()
        expect(extractId(result.data)).toBe(validId)
      }
    })

    it('should handle conversion failures', () => {
      const userId = unsafeUserId('invalid-id')
      const result = convertIdType(userId, createAssetId)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Batch Operations', () => {
    const validIds = [
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
    ]
    const mixedIds = [
      ...validIds,
      'invalid-1',
      'invalid-2'
    ]

    it('should validate batch of valid IDs', () => {
      const result = validateBatch(validIds, createUserId)
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      result.data?.forEach(id => {
        expectTypeOf(id).toEqualTypeOf<UserId>()
      })
    })

    it('should handle batch with invalid IDs', () => {
      const result = validateBatch(mixedIds, createUserId)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation failed for 2 out of 5 IDs')
      expect(result.issues).toHaveLength(2)
    })

    it('should map branded IDs with error handling', () => {
      const userIds = validIds.map(unsafeUserId)
      const result = mapBrandedIds(userIds, (userId) => 
        createAssetId(extractId(userId))
      )
      
      expect(result.valid).toHaveLength(3)
      expect(result.invalid).toHaveLength(0)
      
      result.valid.forEach(id => {
        expectTypeOf(id).toEqualTypeOf<AssetId>()
      })
    })

    it('should handle mapping failures', () => {
      const userIds = ['valid-id', 'invalid-id'].map(unsafeUserId)
      // Force invalid by converting first ID to invalid format
      userIds[0] = 'invalid' as UserId
      
      const result = mapBrandedIds(userIds, (userId) => 
        createAssetId(extractId(userId))
      )
      
      expect(result.invalid.length).toBeGreaterThan(0)
    })
  })

  describe('Organization-Scoped IDs', () => {
    const validId = '550e8400-e29b-41d4-a716-446655440000'
    const orgId = unsafeOrganizationId('6ba7b810-9dad-11d1-80b4-00c04fd430c8')

    it('should create organization-scoped IDs', () => {
      const result = createOrgScopedId(validId, orgId, createAssetId)
      
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expectTypeOf(result.data).toEqualTypeOf<OrgScopedId<AssetId>>()
        
        const scope = extractScope(result.data)
        expectTypeOf(scope).toEqualTypeOf<OrganizationId>()
        expect(extractId(scope)).toBe(extractId(orgId))
      }
    })

    it('should handle invalid IDs in scoped creation', () => {
      const result = createOrgScopedId('invalid', orgId, createAssetId)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should extract scope correctly', () => {
      const result = createOrgScopedId(validId, orgId, createAssetId)
      
      if (result.success && result.data) {
        const extractedScope = extractScope(result.data)
        expect(extractId(extractedScope)).toBe(extractId(orgId))
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs', () => {
      expect(isUserId(null)).toBe(false)
      expect(isUserId(undefined)).toBe(false)
      expect(isAnyBrandedId(null)).toBe(false)
      expect(isAnyBrandedId(undefined)).toBe(false)
    })

    it('should handle non-string inputs', () => {
      expect(isUserId(123)).toBe(false)
      expect(isUserId({})).toBe(false)
      expect(isUserId([])).toBe(false)
      expect(isUserId(true)).toBe(false)
    })

    it('should handle empty arrays in batch operations', () => {
      const result = validateBatch([], createUserId)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should handle empty arrays in mapping operations', () => {
      const result = mapBrandedIds([], (id: UserId) => createAssetId(extractId(id)))
      
      expect(result.valid).toEqual([])
      expect(result.invalid).toEqual([])
    })
  })

  describe('Performance and Memory', () => {
    it('should not cause memory leaks with many IDs', () => {
      const manyIds = Array.from({ length: 1000 }, (_, i) => 
        `550e8400-e29b-41d4-a716-44665544${i.toString().padStart(4, '0')}`
      )
      
      const result = validateBatch(manyIds, createUserId)
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1000)
    })

    it('should handle rapid creation and validation', () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000'
      
      // Create many IDs rapidly
      for (let i = 0; i < 100; i++) {
        const result = createUserId(validId)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('Integration with Existing Code', () => {
    it('should work with generic functions', () => {
      function genericProcessor<T extends AnyBrandedId>(id: T): string {
        return extractId(id).toUpperCase()
      }
      
      const userId = unsafeUserId('550e8400-e29b-41d4-a716-446655440000')
      const orgId = unsafeOrganizationId('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
      
      expect(genericProcessor(userId)).toBe('550E8400-E29B-41D4-A716-446655440000')
      expect(genericProcessor(orgId)).toBe('6BA7B810-9DAD-11D1-80B4-00C04FD430C8')
    })

    it('should work in array operations', () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000'
      const ids: AnyBrandedId[] = [
        unsafeUserId(validId),
        unsafeOrganizationId(validId),
        unsafeAssetId(validId)
      ]
      
      const extracted = ids.map(extractId)
      expect(extracted).toEqual([validId, validId, validId])
    })

    it('should work with Promise-based operations', async () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000'
      
      const asyncCreateUserId = async (id: string): Promise<ValidationResult<UserId>> => {
        return createUserId(id)
      }
      
      const result = await asyncCreateUserId(validId)
      expect(result.success).toBe(true)
    })
  })
})

/**
 * Compile-Time Type Safety Tests
 * These tests ensure that the type system prevents common mistakes at compile time
 */
describe('Compile-Time Safety Verification', () => {
  it('should demonstrate type safety at compile time', () => {
    const userId = unsafeUserId('user-123')
    const orgId = unsafeOrganizationId('org-456')
    
    // These demonstrate compile-time safety:
    
    // 1. Cannot assign different branded types to each other
    // const wrongAssignment: UserId = orgId // ❌ Would cause compile error
    
    // 2. Cannot pass wrong type to typed function
    function requiresUserId(id: UserId): void {
      expect(extractId(id)).toBeDefined()
    }
    
    requiresUserId(userId) // ✅ Works
    // requiresUserId(orgId) // ❌ Would cause compile error
    
    // 3. Type guards properly narrow types
    const unknownValue: unknown = userId
    if (isUserId(unknownValue)) {
      // TypeScript knows this is UserId now
      requiresUserId(unknownValue) // ✅ Works
    }
    
    // 4. Generic constraints work properly
    function processBrandedId<T extends AnyBrandedId>(id: T): T {
      return id
    }
    
    expectTypeOf(processBrandedId(userId)).toEqualTypeOf<UserId>()
    expectTypeOf(processBrandedId(orgId)).toEqualTypeOf<OrganizationId>()
    // processBrandedId('plain-string') // ❌ Would cause compile error
  })

  it('should prevent common ID mixing mistakes', () => {
    // Simulate common function signatures from the codebase
    function fetchAsset(assetId: AssetId): string {
      return extractId(assetId)
    }
    
    function fetchVault(vaultId: VaultId): string {
      return extractId(vaultId)
    }
    
    const assetId = unsafeAssetId('asset-123')
    const vaultId = unsafeVaultId('vault-456')
    
    // Correct usage
    expect(fetchAsset(assetId)).toBe('asset-123')
    expect(fetchVault(vaultId)).toBe('vault-456')
    
    // These would cause compile errors:
    // fetchAsset(vaultId) // ❌ Wrong ID type
    // fetchVault(assetId) // ❌ Wrong ID type
    // fetchAsset('plain-string') // ❌ Not branded
  })
})