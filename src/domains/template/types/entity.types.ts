/**
 * Template Entity Types
 * Define the core entity structure for your domain
 */

// Base entity interface
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

// Main entity interface
export interface TemplateEntity extends BaseEntity {
  // Core fields
  name: string
  description?: string
  status: TemplateStatus
  
  // Relationships
  organization_id: string
  created_by: string
  
  // Metadata
  metadata?: Record<string, any>
  tags?: string[]
  
  // Business specific fields
  // TODO: Add your domain-specific fields here
}

// Entity status enum
export type TemplateStatus = 'draft' | 'active' | 'inactive' | 'archived'

// Related entities (if any)
export interface TemplateRelatedEntity extends BaseEntity {
  template_id: string
  related_field: string
  // Add other fields as needed
}

// Entity with relations (for API responses)
export interface TemplateEntityWithRelations extends TemplateEntity {
  // Joined data
  organization?: {
    id: string
    name: string
    slug: string
  }
  
  created_by_user?: {
    id: string
    full_name?: string
    email?: string
  }
  
  // Computed fields
  related_count?: number
  last_activity?: string
}

// Entity permissions
export interface TemplateEntityPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
  canManage: boolean
}

// Entity with permissions
export interface TemplateEntityWithPermissions extends TemplateEntity {
  permissions: TemplateEntityPermissions
}