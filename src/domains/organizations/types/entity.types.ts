/**
 * Organization Entity Types
 * Core entity structure for organization domain
 */

// Base entity interface
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

// Main entity interface
export interface OrganizationEntity extends BaseEntity {
  // Core fields
  name: string
  slug: string
  description?: string
  status: OrganizationStatus
  
  // Relationships
  created_by: string
  
  // Metadata
  logo_url?: string
  website?: string
  industry?: string
  organization_size?: OrganizationSize
  settings: Record<string, unknown>
  compliance_settings: Record<string, unknown>
  billing_settings: Record<string, unknown>
  
  // Business fields
  is_active: boolean
  deleted_at?: string
  deletion_scheduled_for?: string
}

// Entity status enum
export type OrganizationStatus = 'active' | 'inactive' | 'pending' | 'suspended'
export type OrganizationSize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise'

// Related entities
export interface OrganizationMemberEntity extends BaseEntity {
  organization_id: string
  user_id: string
  role: OrganizationRole
  custom_permissions: Record<string, unknown>
  invited_by?: string
  approved_by?: string
  joined_at: string
  last_accessed: string
  access_count: number
  status: MembershipStatus
  is_primary: boolean
  receive_notifications: boolean
  invitation_accepted_ip?: string
  last_login_ip?: string
  suspicious_activity_count: number
}

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'
export type MembershipStatus = 'active' | 'suspended' | 'pending_activation'

// Entity with relations (for API responses)
export interface OrganizationEntityWithRelations extends OrganizationEntity {
  // Joined data
  created_by_user?: {
    id: string
    full_name?: string
    email?: string
  }
  
  // Computed fields
  member_count?: number
  last_activity?: string
  
  // User's role in this organization
  user_role?: OrganizationRole
  user_status?: MembershipStatus
}

// Entity permissions
export interface OrganizationEntityPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManageMembers: boolean
  canManageSettings: boolean
  canViewBilling: boolean
  canManageBilling: boolean
}

// Entity with permissions
export interface OrganizationEntityWithPermissions extends OrganizationEntity {
  permissions: OrganizationEntityPermissions
}