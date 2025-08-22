/**
 * Branded Types Tests
 * Tests for enhanced branded type system with validation
 */

import {
  createUserId,
  createOrganizationId,
  createVaultId,
  createAssetId,
  isUserId,
  isOrganizationId,
  isVaultId,
  isAssetId,
  extractId,
  isAnyBrandedId,
  serializeBrandedId,
  deserializeBrandedId,
  mapBrandedIds,
  validateBrandedIds,
  createOrgScopedId,
  extractScope,
  BrandedTypeMap,
  TypeGuardMap,
  unsafeCreateUserId,
  unsafeCreateOrganizationId,
  type UserId,
  type OrganizationId,
  type VaultId,
  type AssetId,
  type OrgScopedId,
  type ValidationResult
} from '../branded'

describe('Branded Types', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000'
  const invalidUUID = 'not-a-uuid'
  const shortId = '123'

  describe('Branded Type Creation with Validation', () => {
    describe('createUserId', () => {
      it('should create valid UserId', () => {
        const result = createUserId(validUUID)
        expect(result.success).toBe(true)
        expect(result.data).toBe(validUUID)
        expect(result.error).toBeUndefined()
      })

      it('should reject invalid UUID', () => {
        const result = createUserId(invalidUUID)
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.issues).toBeDefined()
      })

      it('should reject empty string', () => {
        const result = createUserId('')
        expect(result.success).toBe(false)
        expect(result.error).toContain('cannot be empty')
      })

      it('should reject short ID', () => {
        const result = createUserId(shortId)
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    describe('createOrganizationId', () => {
      it('should create valid OrganizationId', () => {
        const result = createOrganizationId(validUUID)
        expect(result.success).toBe(true)
        expect(result.data).toBe(validUUID)
      })

      it('should reject invalid UUID', () => {
        const result = createOrganizationId(invalidUUID)
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    describe('createVaultId', () => {
      it('should create valid VaultId', () => {
        const result = createVaultId(validUUID)
        expect(result.success).toBe(true)
        expect(result.data).toBe(validUUID)
      })

      it('should reject invalid UUID', () => {
        const result = createVaultId(invalidUUID)
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    describe('createAssetId', () => {
      it('should create valid AssetId', () => {
        const result = createAssetId(validUUID)
        expect(result.success).toBe(true)
        expect(result.data).toBe(validUUID)
      })

      it('should reject invalid UUID', () => {
        const result = createAssetId(invalidUUID)
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('Unsafe Constructors', () => {
    it('should create branded types without validation', () => {
      const userId = unsafeCreateUserId('any-string')
      const orgId = unsafeCreateOrganizationId('another-string')
      
      // These should pass TypeScript compilation
      expect(typeof userId).toBe('string')
      expect(typeof orgId).toBe('string')
      expect(userId).toBe('any-string')
      expect(orgId).toBe('another-string')
    })
  })

  describe('Type Guards', () => {
    describe('isUserId', () => {
      it('should return true for valid UserId format', () => {
        expect(isUserId(validUUID)).toBe(true)
      })

      it('should return false for invalid format', () => {
        expect(isUserId(invalidUUID)).toBe(false)
        expect(isUserId('')).toBe(false)
        expect(isUserId(123)).toBe(false)
        expect(isUserId(null)).toBe(false)
        expect(isUserId(undefined)).toBe(false)
      })
    })

    describe('isOrganizationId', () => {
      it('should return true for valid OrganizationId format', () => {
        expect(isOrganizationId(validUUID)).toBe(true)
      })

      it('should return false for invalid format', () => {
        expect(isOrganizationId(invalidUUID)).toBe(false)
        expect(isOrganizationId(123)).toBe(false)
      })
    })

    describe('isVaultId', () => {
      it('should return true for valid VaultId format', () => {
        expect(isVaultId(validUUID)).toBe(true)
      })

      it('should return false for invalid format', () => {
        expect(isVaultId(invalidUUID)).toBe(false)
      })
    })

    describe('isAssetId', () => {
      it('should return true for valid AssetId format', () => {
        expect(isAssetId(validUUID)).toBe(true)
      })

      it('should return false for invalid format', () => {
        expect(isAssetId(invalidUUID)).toBe(false)
      })
    })

    describe('isAnyBrandedId', () => {
      it('should return true for any valid branded ID format', () => {
        expect(isAnyBrandedId(validUUID)).toBe(true)
      })

      it('should return false for invalid formats', () => {
        expect(isAnyBrandedId(invalidUUID)).toBe(false)
        expect(isAnyBrandedId(123)).toBe(false)
        expect(isAnyBrandedId({})).toBe(false)
      })
    })
  })

  describe('Generic Brand Utilities', () => {
    describe('extractId', () => {
      it('should extract underlying string from branded type', () => {
        const userResult = createUserId(validUUID)
        if (userResult.success && userResult.data) {
          const extracted = extractId(userResult.data)
          expect(extracted).toBe(validUUID)
          expect(typeof extracted).toBe('string')
        }
      })
    })
  })

  describe('Serialization', () => {
    describe('serializeBrandedId', () => {
      it('should serialize branded ID with type information', () => {
        const userResult = createUserId(validUUID)
        if (userResult.success && userResult.data) {
          const serialized = serializeBrandedId(userResult.data, 'UserId')
          expect(serialized).toEqual({
            value: validUUID,
            type: 'UserId'
          })
        }
      })
    })

    describe('deserializeBrandedId', () => {
      it('should deserialize branded ID', () => {
        const serialized = {
          value: validUUID,
          type: 'UserId'
        }

        const result = deserializeBrandedId(serialized, createUserId)
        expect(result.success).toBe(true)
        expect(result.data).toBe(validUUID)
      })

      it('should fail for invalid serialized data', () => {
        const serialized = {
          value: invalidUUID,
          type: 'UserId'
        }

        const result = deserializeBrandedId(serialized, createUserId)
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('Batch Operations', () => {
    describe('mapBrandedIds', () => {
      it('should map valid IDs successfully', () => {
        const userIds = [unsafeCreateUserId(validUUID), unsafeCreateUserId(validUUID)]
        
        const result = mapBrandedIds(userIds, (id) => createOrganizationId(extractId(id)))
        
        expect(result.valid).toHaveLength(2)
        expect(result.invalid).toHaveLength(0)
      })

      it('should handle invalid IDs', () => {
        const userIds = [
          unsafeCreateUserId(validUUID),
          unsafeCreateUserId(invalidUUID)
        ]
        
        const result = mapBrandedIds(userIds, (id) => createOrganizationId(extractId(id)))
        
        expect(result.valid).toHaveLength(1)
        expect(result.invalid).toHaveLength(1)
        expect(result.invalid[0].error).toBeDefined()
      })
    })

    describe('validateBrandedIds', () => {
      it('should validate all IDs successfully', () => {
        const ids = [validUUID, validUUID]
        
        const result = validateBrandedIds(ids, createUserId)
        
        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
      })

      it('should fail if any ID is invalid', () => {
        const ids = [validUUID, invalidUUID]
        
        const result = validateBrandedIds(ids, createUserId)
        
        expect(result.success).toBe(false)
        expect(result.error).toContain('Validation failed for 1 out of 2 IDs')
        expect(result.issues).toBeDefined()
      })
    })
  })

  describe('Organization-Scoped IDs', () => {
    describe('createOrgScopedId', () => {
      it('should create organization-scoped ID', () => {
        const orgResult = createOrganizationId(validUUID)
        const userResult = createUserId(validUUID)

        if (orgResult.success && orgResult.data && userResult.success) {
          const scopedResult = createOrgScopedId(validUUID, orgResult.data, createUserId)
          
          expect(scopedResult.success).toBe(true)
          if (scopedResult.data) {
            const scope = extractScope(scopedResult.data)
            expect(scope).toBe(orgResult.data)
          }
        }
      })

      it('should fail for invalid ID', () => {
        const orgResult = createOrganizationId(validUUID)

        if (orgResult.success && orgResult.data) {
          const scopedResult = createOrgScopedId(invalidUUID, orgResult.data, createUserId)
          
          expect(scopedResult.success).toBe(false)
          expect(scopedResult.error).toBeDefined()
        }
      })
    })
  })

  describe('Type Maps', () => {
    describe('BrandedTypeMap', () => {
      it('should contain all branded type constructors', () => {
        expect(BrandedTypeMap.UserId).toBe(createUserId)
        expect(BrandedTypeMap.OrganizationId).toBe(createOrganizationId)
        expect(BrandedTypeMap.VaultId).toBe(createVaultId)
        expect(BrandedTypeMap.AssetId).toBe(createAssetId)
      })

      it('should work with dynamic type creation', () => {
        const typeName = 'UserId' as keyof typeof BrandedTypeMap
        const constructor = BrandedTypeMap[typeName]
        const result = constructor(validUUID)
        
        expect(result.success).toBe(true)
      })
    })

    describe('TypeGuardMap', () => {
      it('should contain all type guards', () => {
        expect(TypeGuardMap.UserId).toBe(isUserId)
        expect(TypeGuardMap.OrganizationId).toBe(isOrganizationId)
        expect(TypeGuardMap.VaultId).toBe(isVaultId)
        expect(TypeGuardMap.AssetId).toBe(isAssetId)
      })

      it('should work with dynamic type checking', () => {
        const typeName = 'UserId' as keyof typeof TypeGuardMap
        const guard = TypeGuardMap[typeName]
        
        expect(guard(validUUID)).toBe(true)
        expect(guard(invalidUUID)).toBe(false)
      })
    })
  })

  describe('Validation Results Structure', () => {
    it('should have consistent ValidationResult structure', () => {
      const successResult = createUserId(validUUID)
      expect(successResult).toHaveProperty('success')
      expect(successResult.success).toBe(true)
      expect(successResult).toHaveProperty('data')
      expect(successResult.error).toBeUndefined()
      expect(successResult.issues).toBeUndefined()

      const failureResult = createUserId(invalidUUID)
      expect(failureResult).toHaveProperty('success')
      expect(failureResult.success).toBe(false)
      expect(failureResult).toHaveProperty('error')
      expect(failureResult).toHaveProperty('issues')
      expect(failureResult.data).toBeUndefined()
    })

    it('should provide detailed error information', () => {
      const result = createUserId(invalidUUID)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.issues).toBeDefined()
      
      if (result.issues) {
        expect(result.issues.length).toBeGreaterThan(0)
        expect(result.issues[0]).toHaveProperty('message')
      }
    })
  })
})

// ==== Type-level Tests ====

// These tests ensure TypeScript compilation works correctly
describe('Compile-time Type Tests', () => {
  it('should enforce branded type separation', () => {
    const userResult = createUserId(validUUID)
    const orgResult = createOrganizationId(validUUID)

    if (userResult.success && orgResult.success && userResult.data && orgResult.data) {
      // These should be different types even with same underlying value
      const userId: UserId = userResult.data
      const orgId: OrganizationId = orgResult.data

      // TypeScript should prevent direct assignment
      // const wrongAssignment: UserId = orgId // Should cause compile error
      
      // But we can extract and compare the underlying values
      expect(extractId(userId)).toBe(extractId(orgId))
      expect(userId === orgId).toBe(false) // Different brands
    }
  })

  it('should work with generic functions', () => {
    function processId<T extends { success: boolean; data?: any }>(result: T): T {
      return result
    }

    const userResult = createUserId(validUUID)
    const processed = processId(userResult)
    
    expect(processed).toBe(userResult)
  })

  it('should maintain type safety in collections', () => {
    const userResults = [
      createUserId(validUUID),
      createUserId(validUUID)
    ]

    const validUserIds = userResults
      .filter((result): result is { success: true; data: UserId } => result.success)
      .map(result => result.data)

    expect(validUserIds).toHaveLength(2)
    validUserIds.forEach(id => {
      expect(isUserId(extractId(id))).toBe(true)
    })
  })
})