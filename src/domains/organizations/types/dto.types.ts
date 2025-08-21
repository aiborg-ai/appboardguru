/**
 * Organization Data Transfer Object Types
 * Define the data structures for API requests and responses
 */

import { OrganizationEntity, OrganizationStatus, OrganizationSize, OrganizationEntityWithRelations } from './entity.types'

// Create DTO
export interface CreateOrganizationDTO {
  name: string
  slug: string
  description?: string
  logo_url?: string
  website?: string
  industry?: string
  organization_size?: OrganizationSize
  settings?: Record<string, any>
  compliance_settings?: Record<string, any>
  billing_settings?: Record<string, any>
}

// Update DTO
export interface UpdateOrganizationDTO {
  name?: string
  slug?: string
  description?: string
  logo_url?: string
  website?: string
  industry?: string
  organization_size?: OrganizationSize
  settings?: Record<string, any>
  compliance_settings?: Record<string, any>
  billing_settings?: Record<string, any>
}

// List filters
export interface OrganizationListFilters {
  // Pagination
  page?: number
  limit?: number
  
  // Search
  search?: string
  
  // Filtering
  status?: OrganizationStatus | OrganizationStatus[]
  created_by?: string
  organization_size?: OrganizationSize | OrganizationSize[]
  industry?: string
  
  // Date filters
  created_after?: string
  created_before?: string
  updated_after?: string
  updated_before?: string
  
  // Sorting
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'status' | 'member_count'
  sort_order?: 'asc' | 'desc'
}

// List response
export interface OrganizationListResponse {
  items: OrganizationEntityWithRelations[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
  filters?: OrganizationListFilters
}

// Detail response
export interface OrganizationDetailResponse extends OrganizationEntityWithRelations {
  // Additional data that's only loaded for detail view
  members?: any[]
  activity_log?: any[]
  features?: any[]
}

// Member management DTOs
export interface InviteMemberDTO {
  email: string
  role: 'admin' | 'member' | 'viewer'
  custom_permissions?: Record<string, any>
  message?: string
}

export interface UpdateMemberDTO {
  role?: 'admin' | 'member' | 'viewer'
  custom_permissions?: Record<string, any>
}

// Bulk operations
export interface BulkOrganizationOperation {
  operation: 'update' | 'delete' | 'archive' | 'activate'
  ids: string[]
  data?: Partial<UpdateOrganizationDTO> // For bulk updates
}

export interface BulkOrganizationResponse {
  successful_ids: string[]
  failed_ids: { id: string; error: string }[]
  total_processed: number
}

// Import/Export
export interface OrganizationImportDTO {
  items: CreateOrganizationDTO[]
  options?: {
    skip_duplicates?: boolean
    update_existing?: boolean
  }
}

export interface OrganizationExportOptions {
  format: 'json' | 'csv' | 'xlsx'
  filters?: OrganizationListFilters
  include_members?: boolean
  include_settings?: boolean
}

// Validation errors
export interface OrganizationValidationError {
  field: string
  message: string
  code: string
}

// API Response wrapper
export interface OrganizationAPIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: OrganizationValidationError[]
  }
  meta?: {
    pagination?: OrganizationListResponse['pagination']
    timing?: {
      duration: number
      cached: boolean
    }
  }
  request_id?: string
}