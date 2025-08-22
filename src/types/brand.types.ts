/**
 * @deprecated This file is deprecated. Use the centralized branded type system from './branded' instead.
 * Re-exporting for backward compatibility only.
 */

// Re-export all branded types from the centralized system
export type {
  // Core brand utility
  Brand,
  
  // ID types
  UserId,
  OrganizationId,
  VaultId,
  AssetId,
  BoardId,
  NotificationId,
  SessionId,
  InvitationId,
  AnnotationId,
  
  // Utility types
  Email,
  Slug,
  Url,
  FilePath,
  MimeType,
  JsonString,
  ISODateString,
  JWT,
  ApiKey,
  
  // Number types
  Percentage,
  FileSize,
  Timestamp,
  Port,
  Version
} from './branded'

// Re-export constructors and utilities from centralized system
export {
  // Safe constructors (with validation)
  createUserId,
  createOrganizationId,
  createVaultId,
  createAssetId,
  createEmail,
  createSlug,
  createUrl,
  createPercentage,
  createFileSize,
  createISODateString,
  
  // Type guards
  isUserId,
  isOrganizationId,
  isVaultId,
  isAssetId,
  
  // Utilities
  extractId as UnBrand
} from './branded'

// Legacy type utilities for backward compatibility
export type ExtractBrand<T> = T extends Brand<any, infer B> ? B : never