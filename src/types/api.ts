import type { Database } from './database'
import type { SupabaseClient } from '@supabase/supabase-js'

// Common API types
export type TypedSupabaseClient = SupabaseClient<Database>

// Database table type helpers
export type DatabaseTables = Database['public']['Tables']
export type VaultRow = DatabaseTables['vaults']['Row']
export type VaultInsert = DatabaseTables['vaults']['Insert']
export type VaultUpdate = DatabaseTables['vaults']['Update']

export type AssetRow = DatabaseTables['assets']['Row']
export type AssetInsert = DatabaseTables['assets']['Insert']
export type AssetUpdate = DatabaseTables['assets']['Update']

export type VaultAssetRow = DatabaseTables['vault_assets']['Row']
export type VaultAssetInsert = DatabaseTables['vault_assets']['Insert']
export type VaultAssetUpdate = DatabaseTables['vault_assets']['Update']

export type VaultMemberRow = DatabaseTables['vault_members']['Row']
export type VaultMemberInsert = DatabaseTables['vault_members']['Insert']
export type VaultMemberUpdate = DatabaseTables['vault_members']['Update']

export type OrganizationRow = DatabaseTables['organizations']['Row']
export type UserRow = DatabaseTables['users']['Row']

export type VaultActivityLogRow = DatabaseTables['vault_activity_log']['Row']
export type VaultActivityLogInsert = DatabaseTables['vault_activity_log']['Insert']

// Common response types for vault operations
export interface VaultWithRelations extends VaultRow {
  organization?: OrganizationRow
  created_by_user?: UserRow
  vault_members?: Array<VaultMemberWithUser>
}

export interface VaultMemberWithUser extends VaultMemberRow {
  user: UserRow
}

export interface VaultAssetWithRelations extends VaultAssetRow {
  asset: AssetWithOwner
  added_by: UserRow
}

export interface AssetWithOwner extends AssetRow {
  owner: UserRow
}

export interface VaultActivityWithUser extends VaultActivityLogRow {
  performed_by: UserRow
}

// API request/response interfaces
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Common parameter types
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// User context type for API handlers
export interface AuthenticatedUser {
  id: string
  email?: string
  role?: string
  organizationId?: string
}

// Request context type
export interface RequestContext {
  user: AuthenticatedUser
  supabase: TypedSupabaseClient
  headers: Headers
  ip?: string
  userAgent?: string
}

// Common error types
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ValidationError extends ApiError {
  field?: string
  value?: unknown
}