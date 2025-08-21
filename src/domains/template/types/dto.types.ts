/**
 * Template Data Transfer Object Types
 * Define the data structures for API requests and responses
 */

import { TemplateEntity, TemplateStatus, TemplateEntityWithRelations } from './entity.types'

// Create DTO
export interface CreateTemplateDTO {
  name: string
  description?: string
  status?: TemplateStatus
  organization_id: string
  metadata?: Record<string, any>
  tags?: string[]
  
  // Add other fields that can be set during creation
}

// Update DTO
export interface UpdateTemplateDTO {
  name?: string
  description?: string
  status?: TemplateStatus
  metadata?: Record<string, any>
  tags?: string[]
  
  // Add other fields that can be updated
}

// List filters
export interface TemplateListFilters {
  // Pagination
  page?: number
  limit?: number
  
  // Search
  search?: string
  
  // Filtering
  status?: TemplateStatus | TemplateStatus[]
  organization_id?: string
  created_by?: string
  tags?: string[]
  
  // Date filters
  created_after?: string
  created_before?: string
  updated_after?: string
  updated_before?: string
  
  // Sorting
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'status'
  sort_order?: 'asc' | 'desc'
}

// List response
export interface TemplateListResponse {
  items: TemplateEntityWithRelations[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
  filters?: TemplateListFilters
}

// Detail response
export interface TemplateDetailResponse extends TemplateEntityWithRelations {
  // Additional data that's only loaded for detail view
  related_items?: any[]
  activity_log?: any[]
}

// Bulk operations
export interface BulkTemplateOperation {
  operation: 'update' | 'delete' | 'archive'
  ids: string[]
  data?: Partial<UpdateTemplateDTO> // For bulk updates
}

export interface BulkTemplateResponse {
  successful_ids: string[]
  failed_ids: { id: string; error: string }[]
  total_processed: number
}

// Import/Export
export interface TemplateImportDTO {
  items: CreateTemplateDTO[]
  options?: {
    skip_duplicates?: boolean
    update_existing?: boolean
  }
}

export interface TemplateExportOptions {
  format: 'json' | 'csv' | 'xlsx'
  filters?: TemplateListFilters
  include_metadata?: boolean
}

// Validation errors
export interface TemplateValidationError {
  field: string
  message: string
  code: string
}

// API Response wrapper
export interface TemplateAPIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: TemplateValidationError[]
  }
  meta?: {
    pagination?: TemplateListResponse['pagination']
    timing?: {
      duration: number
      cached: boolean
    }
  }
  request_id?: string
}