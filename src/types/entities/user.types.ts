import { Database } from '../database'

// Base user types from database
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

// Extended types for application use
export interface UserProfile extends User {
  organizations?: OrganizationMembership[]
  currentOrganization?: Organization | null
}

export interface UserWithPermissions extends User {
  permissions: {
    canCreateVaults: boolean
    canManageOrganization: boolean
    canInviteUsers: boolean
    canViewAuditLogs: boolean
  }
}

export interface OrganizationMembership {
  id: string
  organizationId: string
  role: OrganizationRole
  status: MembershipStatus
  joinedAt: string
  permissions?: Record<string, boolean>
}

export type UserRole = 'pending' | 'director' | 'admin' | 'viewer'
export type UserStatus = 'pending' | 'approved' | 'rejected'
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'
export type MembershipStatus = 'active' | 'suspended' | 'pending_activation'

// Import Organization type
import { Organization } from './organization.types'