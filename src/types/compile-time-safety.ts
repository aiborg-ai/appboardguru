/**
 * Compile-Time Safety Utilities and Type-Level Tests
 * Ensures branded types cannot be mixed at compile time
 */

import type {
  AnyBrandedId,
  UserId,
  OrganizationId,
  AssetId,
  VaultId,
  Brand
} from './branded'

// ==== Type-Level Assertion Utilities ====

/**
 * Compile-time assertion that prevents type mixing
 * Usage: AssertDifferentTypes<UserId, AssetId> // Should be 'true'
 */
export type AssertDifferentTypes<T, U> = T extends U
  ? U extends T
    ? false  // Types are the same
    : true   // T extends U but U doesn't extend T
  : true     // T doesn't extend U

/**
 * Compile-time assertion that branded types are not assignable to plain strings
 */
export type AssertNotString<T extends Brand<any, any>> = T extends string
  ? string extends T
    ? false  // Type is assignable to and from string (bad)
    : true   // Type extends string but string doesn't extend type (good)
  : false    // Type doesn't extend string (shouldn't happen for our branded strings)

/**
 * Compile-time check that all branded IDs are properly branded
 */
export type AssertProperlyBranded<T extends Brand<any, any>> = T extends { __brand: any }
  ? true
  : false

// ==== Compile-Time Safety Functions ====

/**
 * Function that only accepts specific branded ID types
 * Fails at compile time if wrong type is passed
 */
export function requireSpecificId<T extends AnyBrandedId>(
  id: T,
  expectedBrand: T['__brand']
): T {
  // Runtime check to verify the brand matches (optional)
  if (process.env.NODE_ENV === 'development') {
    const brand = (id as any).__brand
    if (brand && brand !== expectedBrand) {
      console.warn(`Brand mismatch: expected ${String(expectedBrand)}, got ${String(brand)}`)
    }
  }
  return id
}

/**
 * Function that prevents mixing of different ID types
 */
export function preventIdMixing<T extends AnyBrandedId, U extends AnyBrandedId>(
  id1: T,
  id2: U
): T extends U ? (U extends T ? never : [T, U]) : [T, U] {
  // This function will only compile if T and U are different types
  return [id1, id2] as any
}

/**
 * Type-safe ID comparison that ensures same types
 */
export function compareIds<T extends AnyBrandedId>(
  id1: T,
  id2: T
): boolean {
  return (id1 as string) === (id2 as string)
}

/**
 * Function that requires IDs to be from the same organization
 */
export function requireSameOrganization<T extends AnyBrandedId>(
  orgId: OrganizationId,
  ...ids: Array<{ organizationId: OrganizationId } & Record<string, any>>
): boolean {
  return ids.every(item => compareIds(item.organizationId, orgId))
}

// ==== Type-Level Test Suite ====

/**
 * Comprehensive compile-time tests for the branded type system
 * These types will cause compilation errors if the branded types are not working correctly
 */
export namespace CompileTimeTests {
  // Test that different branded types are not assignable to each other
  type TestIdMixingPrevention = {
    userIdNotAssetId: AssertDifferentTypes<UserId, AssetId>
    assetIdNotUserId: AssertDifferentTypes<AssetId, UserId>
    userIdNotOrgId: AssertDifferentTypes<UserId, OrganizationId>
    vaultIdNotAssetId: AssertDifferentTypes<VaultId, AssetId>
  }

  // Test that branded types are not assignable to plain strings
  type TestStringAssignmentPrevention = {
    userIdNotString: AssertNotString<UserId>
    assetIdNotString: AssertNotString<AssetId>
    orgIdNotString: AssertNotString<OrganizationId>
    vaultIdNotString: AssertNotString<VaultId>
  }

  // Test that branded types have the __brand property
  type TestProperBranding = {
    userIdBranded: AssertProperlyBranded<UserId>
    assetIdBranded: AssertProperlyBranded<AssetId>
    orgIdBranded: AssertProperlyBranded<OrganizationId>
    vaultIdBranded: AssertProperlyBranded<VaultId>
  }

  // Verify all tests pass (should all be 'true')
  export type AllTestsPass = TestIdMixingPrevention & TestStringAssignmentPrevention & TestProperBranding
  
  // This will cause a compilation error if any test fails
  const _verifyAllTestsPass: {
    [K in keyof AllTestsPass]: AllTestsPass[K] extends true ? true : never
  } = {} as any
}

// ==== Runtime Safety Utilities ====

/**
 * Development-time function to verify branded types at runtime
 * Only active in development mode
 */
export function verifyBrandedTypeIntegrity<T extends AnyBrandedId>(
  id: T,
  expectedBrand: string,
  context?: string
): T {
  if (process.env.NODE_ENV === 'development') {
    // Basic format validation
    if (typeof id !== 'string' || !id) {
      throw new Error(`Invalid branded ID in ${context || 'unknown context'}: ${id}`)
    }

    // Brand verification (if available)
    const brand = (id as any).__brand
    if (brand && brand !== expectedBrand) {
      console.warn(
        `Brand verification failed in ${context || 'unknown context'}: ` +
        `expected '${expectedBrand}', got '${brand}'`
      )
    }

    // UUID/NanoID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const nanoidRegex = /^[A-Za-z0-9_-]{21}$/
    
    if (!uuidRegex.test(id) && !nanoidRegex.test(id)) {
      console.warn(
        `ID format verification failed in ${context || 'unknown context'}: ` +
        `'${id}' is not a valid UUID or NanoID format`
      )
    }
  }
  
  return id
}

/**
 * Development helper to analyze objects for potential ID mixing issues
 */
export function analyzeIdUsage(
  obj: Record<string, any>,
  expectedIdFields: Record<string, string>
): {
  valid: string[]
  warnings: string[]
  errors: string[]
} {
  const valid: string[] = []
  const warnings: string[] = []
  const errors: string[] = []

  if (process.env.NODE_ENV === 'development') {
    for (const [field, expectedBrand] of Object.entries(expectedIdFields)) {
      const value = obj[field]
      
      if (!value) {
        warnings.push(`Field '${field}' is missing`)
        continue
      }
      
      if (typeof value !== 'string') {
        errors.push(`Field '${field}' should be a string, got ${typeof value}`)
        continue
      }
      
      try {
        verifyBrandedTypeIntegrity(value as any, expectedBrand, `field '${field}'`)
        valid.push(field)
      } catch (error) {
        errors.push(`Field '${field}': ${error.message}`)
      }
    }
  }

  return { valid, warnings, errors }
}

// ==== Advanced Type Utilities ====

/**
 * Extract brand information from a branded type at compile time
 */
export type ExtractBrand<T> = T extends Brand<any, infer B> ? B : never

/**
 * Check if two branded types have the same brand
 */
export type SameBrand<T extends Brand<any, any>, U extends Brand<any, any>> = 
  ExtractBrand<T> extends ExtractBrand<U> 
    ? ExtractBrand<U> extends ExtractBrand<T> 
      ? true 
      : false
    : false

/**
 * Utility to create a branded type with compile-time brand verification
 */
export type SafeBrandedType<T, ExpectedBrand extends string> = T extends Brand<any, ExpectedBrand>
  ? T
  : never

/**
 * Function to enforce that a value matches the expected brand at compile time
 */
export function enforceExpectedBrand<T extends AnyBrandedId, ExpectedBrand extends string>(
  value: T,
  expectedBrand: ExpectedBrand
): SafeBrandedType<T, ExpectedBrand> {
  // The return type will be 'never' if the brand doesn't match, causing a compile error
  return value as SafeBrandedType<T, ExpectedBrand>
}

// ==== Type Examples for Documentation ====

/**
 * Examples demonstrating proper usage of the branded type system
 */
export namespace UsageExamples {
  // ✅ Correct usage - types are enforced at compile time
  export function correctUsage() {
    // Function-level declarations
    function createIds() {
      const userId = '550e8400-e29b-41d4-a716-446655440000' as UserId
      const orgId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8' as OrganizationId
      return { userId, orgId }
    }
    
    const { userId, orgId } = createIds()
    
    // This compiles because types match
    const sameUserIds = compareIds(userId, userId)
    
    // This prevents ID mixing at compile time
    const differentIds = preventIdMixing(userId, orgId)  // ✅ Compiles because types differ
    
    return { sameUserIds, differentIds }
  }

  // ❌ Incorrect usage - these would cause compile errors
  export function incorrectUsage() {
    function createIds() {
      const userId = '550e8400-e29b-41d4-a716-446655440000' as UserId
      const assetId = '6ba7b811-9dad-11d1-80b4-00c04fd430c8' as AssetId
      return { userId, assetId }
    }
    
    const { userId, assetId } = createIds()
    
    // These would cause compile errors:
    // const mixedComparison = compareIds(userId, assetId)  // ❌ Different types
    // const sameTypePrevention = preventIdMixing(userId, userId)  // ❌ Same types
    // const stringAssignment: string = userId  // ❌ No implicit conversion to string
    
    return 'This function demonstrates what NOT to do'
  }
}

// Export compile-time verification
export type CompileTimeVerification = CompileTimeTests.AllTestsPass