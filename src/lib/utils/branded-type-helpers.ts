/**
 * Branded Type Helper Utilities
 * Migration helpers, conversion utilities, and convenience functions
 * for working with branded types throughout the application
 */

import {
  type AnyBrandedId,
  type ValidationResult,
  type UserId,
  type OrganizationId,
  type AssetId,
  type VaultId,
  type BrandedTypeName,
  BrandedTypeConstructors,
  BrandedTypeGuards,
  extractId,
  isAnyBrandedId,
  validateBatch
} from '../../types/branded'

// ==== Migration Helpers ====

/**
 * Safely migrate from plain string IDs to branded types
 * Useful during the migration process from legacy code
 */
export class BrandedIdMigrator {
  private static readonly MIGRATION_WARNINGS = new Set<string>()
  
  /**
   * Convert a plain string to a branded ID with migration warning
   */
  static migrate<T extends AnyBrandedId>(
    id: string,
    typeName: BrandedTypeName,
    context?: string
  ): ValidationResult<T> {
    const constructor = BrandedTypeConstructors[typeName] as (id: string) => ValidationResult<T>
    const result = constructor(id)
    
    if (!result.success) {
      const warning = `Migration warning: Invalid ${typeName} in ${context || 'unknown context'}: ${id}`
      if (!this.MIGRATION_WARNINGS.has(warning)) {
        console.warn(warning)
        this.MIGRATION_WARNINGS.add(warning)
      }
    }
    
    return result
  }
  
  /**
   * Batch migrate multiple IDs with detailed reporting
   */
  static batchMigrate<T extends AnyBrandedId>(
    ids: string[],
    typeName: BrandedTypeName,
    context?: string
  ): {
    successful: T[]
    failed: Array<{ id: string; error: string }>
    report: {
      total: number
      successCount: number
      failureCount: number
      successRate: number
    }
  } {
    const constructor = BrandedTypeConstructors[typeName] as (id: string) => ValidationResult<T>
    const successful: T[] = []
    const failed: Array<{ id: string; error: string }> = []
    
    for (const id of ids) {
      const result = this.migrate<T>(id, typeName, context)
      if (result.success && result.data) {
        successful.push(result.data)
      } else {
        failed.push({ id, error: result.error || 'Unknown error' })
      }
    }
    
    const total = ids.length
    const successCount = successful.length
    const failureCount = failed.length
    
    return {
      successful,
      failed,
      report: {
        total,
        successCount,
        failureCount,
        successRate: total > 0 ? (successCount / total) * 100 : 0
      }
    }
  }
  
  /**
   * Clear migration warnings cache (useful for testing)
   */
  static clearWarnings(): void {
    this.MIGRATION_WARNINGS.clear()
  }
}

// ==== Request/Response Helpers ====

/**
 * Safely extract and validate IDs from API requests/responses
 */
export class ApiIdExtractor {
  /**
   * Extract and validate an ID from a request body/query
   */
  static extractId<T extends AnyBrandedId>(
    source: any,
    field: string,
    typeName: BrandedTypeName
  ): ValidationResult<T> {
    if (!source || typeof source !== 'object') {
      return {
        success: false,
        error: `Source object is null or not an object`
      }
    }
    
    const rawId = source[field]
    if (typeof rawId !== 'string') {
      return {
        success: false,
        error: `Field '${field}' is missing or not a string`
      }
    }
    
    const constructor = BrandedTypeConstructors[typeName] as (id: string) => ValidationResult<T>
    return constructor(rawId)
  }
  
  /**
   * Extract multiple IDs from an object
   */
  static extractIds<T extends AnyBrandedId>(
    source: any,
    field: string,
    typeName: BrandedTypeName
  ): ValidationResult<T[]> {
    if (!source || typeof source !== 'object') {
      return {
        success: false,
        error: `Source object is null or not an object`
      }
    }
    
    const rawIds = source[field]
    if (!Array.isArray(rawIds)) {
      return {
        success: false,
        error: `Field '${field}' is missing or not an array`
      }
    }
    
    if (!rawIds.every(id => typeof id === 'string')) {
      return {
        success: false,
        error: `All items in '${field}' must be strings`
      }
    }
    
    const constructor = BrandedTypeConstructors[typeName] as (id: string) => ValidationResult<T>
    return validateBatch(rawIds, constructor)
  }
  
  /**
   * Create a response-safe object with branded IDs converted to strings
   */
  static serializeForResponse<T extends Record<string, unknown>>(obj: T): T {
    const result = { ...obj } as Record<string, unknown>
    
    for (const [key, value] of Object.entries(result)) {
      if (isAnyBrandedId(value)) {
        result[key] = extractId(value)
      } else if (Array.isArray(value)) {
        result[key] = value.map(item => 
          isAnyBrandedId(item) ? extractId(item) : item
        )
      } else if (value && typeof value === 'object' && value.constructor === Object) {
        result[key] = this.serializeForResponse(value as Record<string, unknown>)
      }
    }
    
    return result as T
  }
}

// ==== Database Helpers ====

/**
 * Helpers for working with database queries and results
 */
export class DatabaseIdHelpers {
  /**
   * Convert branded IDs to strings for database queries
   */
  static toQueryParams<T extends Record<string, unknown>>(params: T): T {
    const result = { ...params } as Record<string, unknown>
    
    for (const [key, value] of Object.entries(result)) {
      if (isAnyBrandedId(value)) {
        result[key] = extractId(value)
      }
    }
    
    return result as T
  }
  
  /**
   * Process database query results to include branded IDs
   */
  static processQueryResult<T extends Record<string, unknown>>(
    row: T,
    idMappings: Record<string, BrandedTypeName>
  ): T & { _brandedIds?: Record<string, AnyBrandedId> } {
    const result = { ...row } as Record<string, unknown>
    const brandedIds: Record<string, AnyBrandedId> = {}
    
    for (const [field, typeName] of Object.entries(idMappings)) {
      const rawId = row[field]
      if (typeof rawId === 'string') {
        const constructor = BrandedTypeConstructors[typeName]
        const validationResult = constructor(rawId)
        if (validationResult.success && validationResult.data) {
          brandedIds[field] = validationResult.data
        }
      }
    }
    
    // Attach branded IDs for easy access while preserving original structure
    if (Object.keys(brandedIds).length > 0) {
      result._brandedIds = brandedIds
    }
    
    return result as T & { _brandedIds?: Record<string, AnyBrandedId> }
  }
}

// ==== Validation Helpers ====

/**
 * Advanced validation helpers for complex scenarios
 */
export class ValidationHelpers {
  /**
   * Validate an object with multiple branded ID fields
   */
  static validateObject<T extends Record<string, unknown>>(
    obj: T,
    validations: Record<keyof T, BrandedTypeName>
  ): ValidationResult<T & { _validatedIds: Record<string, AnyBrandedId> }> {
    const errors: string[] = []
    const validatedIds: Record<string, AnyBrandedId> = {}
    
    for (const [field, typeName] of Object.entries(validations)) {
      const value = obj[field as keyof T]
      
      if (typeof value !== 'string') {
        errors.push(`Field '${String(field)}' must be a string`)
        continue
      }
      
      const constructor = BrandedTypeConstructors[typeName]
      const result = constructor(value)
      
      if (!result.success) {
        errors.push(`Invalid ${typeName} in field '${String(field)}': ${result.error}`)
      } else if (result.data) {
        validatedIds[String(field)] = result.data
      }
    }
    
    if (errors.length > 0) {
      return {
        success: false,
        error: `Validation failed: ${errors.join(', ')}`,
        issues: errors.map(error => ({ message: error }))
      }
    }
    
    return {
      success: true,
      data: {
        ...obj,
        _validatedIds: validatedIds
      }
    }
  }
  
  /**
   * Create a type-safe validator function
   */
  static createValidator<T extends AnyBrandedId>(typeName: BrandedTypeName) {
    const constructor = BrandedTypeConstructors[typeName] as (id: string) => ValidationResult<T>
    const guard = BrandedTypeGuards[typeName] as (value: unknown) => value is T
    
    return {
      validate: constructor,
      isValid: guard,
      validateOrThrow: (id: string): T => {
        const result = constructor(id)
        if (!result.success || !result.data) {
          throw new Error(result.error || `Invalid ${typeName}`)
        }
        return result.data
      }
    }
  }
}

// ==== Utility Functions ====

/**
 * Create commonly used validators for easy import
 */
export const userIdValidator = ValidationHelpers.createValidator<UserId>('UserId')
export const orgIdValidator = ValidationHelpers.createValidator<OrganizationId>('OrganizationId')
export const assetIdValidator = ValidationHelpers.createValidator<AssetId>('AssetId')
export const vaultIdValidator = ValidationHelpers.createValidator<VaultId>('VaultId')

/**
 * Common ID conversion utilities
 */
export function stringToUserId(id: string): UserId {
  return userIdValidator.validateOrThrow(id)
}

export function stringToOrganizationId(id: string): OrganizationId {
  return orgIdValidator.validateOrThrow(id)
}

export function stringToAssetId(id: string): AssetId {
  return assetIdValidator.validateOrThrow(id)
}

export function stringToVaultId(id: string): VaultId {
  return vaultIdValidator.validateOrThrow(id)
}

/**
 * Safe conversion that returns null on failure instead of throwing
 */
export function safeStringToUserId(id: string): UserId | null {
  const result = userIdValidator.validate(id)
  return result.success && result.data ? result.data : null
}

export function safeStringToOrganizationId(id: string): OrganizationId | null {
  const result = orgIdValidator.validate(id)
  return result.success && result.data ? result.data : null
}

export function safeStringToAssetId(id: string): AssetId | null {
  const result = assetIdValidator.validate(id)
  return result.success && result.data ? result.data : null
}

export function safeStringToVaultId(id: string): VaultId | null {
  const result = vaultIdValidator.validate(id)
  return result.success && result.data ? result.data : null
}

// ==== Debug and Development Helpers ====

/**
 * Development-time helpers for debugging and introspection
 */
export class DebugHelpers {
  /**
   * Analyze an object to find potential branded ID fields
   */
  static analyzeObject(obj: Record<string, unknown>): {
    potentialIds: Array<{ field: string; value: string; validTypes: BrandedTypeName[] }>
    analysis: {
      totalFields: number
      stringFields: number
      potentialIdFields: number
    }
  } {
    const potentialIds: Array<{ field: string; value: string; validTypes: BrandedTypeName[] }> = []
    let stringFields = 0
    
    for (const [field, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        stringFields++
        
        // Check if it looks like an ID (UUID or similar pattern)
        if (/^[a-f0-9-]{20,}|^[A-Za-z0-9_-]{20,}/.test(value)) {
          const validTypes: BrandedTypeName[] = []
          
          // Test against all branded types
          for (const [typeName, guard] of Object.entries(BrandedTypeGuards)) {
            if (guard(value)) {
              validTypes.push(typeName as BrandedTypeName)
            }
          }
          
          if (validTypes.length > 0) {
            potentialIds.push({ field, value, validTypes })
          }
        }
      }
    }
    
    return {
      potentialIds,
      analysis: {
        totalFields: Object.keys(obj).length,
        stringFields,
        potentialIdFields: potentialIds.length
      }
    }
  }
  
  /**
   * Generate a migration plan for converting plain string IDs to branded types
   */
  static generateMigrationPlan(
    objects: Record<string, unknown>[],
    fieldMappings: Record<string, BrandedTypeName>
  ): {
    plan: Array<{
      field: string
      type: BrandedTypeName
      sampleValues: string[]
      validCount: number
      invalidCount: number
      confidence: 'high' | 'medium' | 'low'
    }>
    summary: {
      totalObjects: number
      fieldsToMigrate: number
      estimatedSuccessRate: number
    }
  } {
    const plan: any[] = []
    let totalValid = 0
    let totalChecked = 0
    
    for (const [field, typeName] of Object.entries(fieldMappings)) {
      const validator = BrandedTypeGuards[typeName]
      const sampleValues: string[] = []
      let validCount = 0
      let invalidCount = 0
      
      for (const obj of objects) {
        const value = obj[field]
        if (typeof value === 'string') {
          totalChecked++
          
          if (sampleValues.length < 3) {
            sampleValues.push(value)
          }
          
          if (validator(value)) {
            validCount++
            totalValid++
          } else {
            invalidCount++
          }
        }
      }
      
      const total = validCount + invalidCount
      const successRate = total > 0 ? validCount / total : 0
      const confidence = successRate > 0.9 ? 'high' : successRate > 0.7 ? 'medium' : 'low'
      
      plan.push({
        field,
        type: typeName,
        sampleValues,
        validCount,
        invalidCount,
        confidence
      })
    }
    
    return {
      plan,
      summary: {
        totalObjects: objects.length,
        fieldsToMigrate: Object.keys(fieldMappings).length,
        estimatedSuccessRate: totalChecked > 0 ? (totalValid / totalChecked) * 100 : 0
      }
    }
  }
}

// ==== Re-exports for Convenience ====

export {
  // Core types
  type AnyBrandedId,
  type ValidationResult,
  
  // Main functions
  extractId,
  isAnyBrandedId,
  validateBatch,
  
  // Type constructors map
  BrandedTypeConstructors,
  BrandedTypeGuards
} from '../../types/branded'