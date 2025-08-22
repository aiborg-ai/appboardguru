/**
 * Factory functions for creating test data with consistent structure
 * 
 * These factories create realistic test data with proper relationships
 * and can be used across different test files for consistency.
 */

export * from './user.factory'
export * from './organization.factory'
export * from './vault.factory'
export * from './asset.factory'
export * from './invitation.factory'
export * from './notification.factory'
export * from './activity.factory'
export * from './compliance.factory'

// Re-export commonly used types
export type {
  User,
  Organization,
  Vault,
  Asset,
  UserInsert,
  OrganizationInsert,
  VaultInsert,
  AssetInsert,
} from '@/types'