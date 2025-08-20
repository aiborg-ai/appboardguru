// Type system barrel exports

// Database types
export * from './database'

// Entity types (specific exports to avoid conflicts)
export type { User, UserInsert, UserUpdate, UserRole, UserStatus } from './entities/user.types'
export type { 
  Organization, 
  OrganizationInsert, 
  OrganizationUpdate, 
  OrganizationMember,
  OrganizationInvitation,
  OrganizationFeatures,
  OrganizationSize
} from './entities/organization.types'
export type { 
  Vault, 
  VaultInsert, 
  VaultUpdate, 
  VaultMember, 
  VaultInvitation, 
  VaultAsset,
  VaultWithDetails,
  VaultBroadcast,
  VaultStatus,
  VaultPriority,
  VaultRole
} from './entities/vault.types'
export type { Asset, AssetInsert, AssetUpdate, AssetPermission, AssetAnnotation } from './entities/asset.types'

// API types
export * from './api/requests'
export * from './api/responses'

// Common types
export * from './common'

// Legacy exports for backward compatibility
export type { Database } from './database'