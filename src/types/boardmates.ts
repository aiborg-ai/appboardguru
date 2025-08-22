/**
 * BoardMates Component Types
 * Type definitions for BoardMates pages and components
 */

import { ReactNode, MouseEventHandler, ChangeEventHandler } from 'react'
import type { VaultStatus } from './entities/vault.types'

// Core BoardMates Types
export type BoardMembershipStatus = 'active' | 'inactive' | 'resigned' | 'terminated'
export type BoardType = 'main_board' | 'advisory_board' | 'subsidiary_board' | 'committee_board'
export type BoardStatus = 'active' | 'inactive' | 'dissolved'

export type BoardRole = 
  | 'chairman' 
  | 'vice_chairman' 
  | 'ceo' 
  | 'cfo' 
  | 'cto' 
  | 'independent_director' 
  | 'executive_director' 
  | 'non_executive_director' 
  | 'board_member' 
  | 'board_observer'

export type CommitteeType = 
  | 'audit' 
  | 'compensation' 
  | 'governance' 
  | 'risk' 
  | 'nomination' 
  | 'strategy' 
  | 'technology' 
  | 'investment' 
  | 'ethics' 
  | 'executive' 
  | 'other'

export type CommitteeRole = 'chair' | 'vice_chair' | 'member' | 'secretary' | 'advisor' | 'observer'
export type CommitteeStatus = 'active' | 'inactive' | 'dissolved' | 'temporary'

export type VaultRole = 'owner' | 'admin' | 'moderator' | 'contributor' | 'viewer'
// VaultStatus is defined in entities/vault.types.ts - import from there
export type VaultMemberStatus = 'active' | 'suspended' | 'pending' | 'left'

export type UserStatus = 'pending' | 'approved' | 'rejected'
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'
export type OrganizationStatus = 'active' | 'suspended' | 'pending_activation'

// BoardMembership Interface
export interface BoardMembership {
  board_id: string
  board_name: string
  board_type: BoardType
  board_status: BoardStatus
  member_role: BoardRole
  member_status: BoardMembershipStatus
  appointed_date: string
  term_start_date?: string
  term_end_date?: string
  is_voting_member: boolean
  attendance_rate?: number
}

// CommitteeMembership Interface
export interface CommitteeMembership {
  committee_id: string
  committee_name: string
  committee_type: CommitteeType
  committee_status: CommitteeStatus
  board_name: string
  member_role: CommitteeRole
  member_status: BoardMembershipStatus
  appointed_date: string
  term_start_date?: string
  term_end_date?: string
  is_voting_member: boolean
  attendance_rate?: number
}

// VaultMembership Interface
export interface VaultMembership {
  vault_id: string
  vault_name: string
  vault_status: VaultStatus
  member_role: VaultRole
  member_status: VaultMemberStatus
  joined_at: string
  last_accessed_at?: string
  access_count: number
}

// Core BoardMate Profile
export interface BoardMateProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  designation?: string
  linkedin_url?: string
  bio?: string
  company?: string
  position?: string
  user_status: UserStatus
  organization_name: string
  organization_logo?: string
  org_role: OrganizationRole
  org_status: OrganizationStatus
  org_joined_at: string
  org_last_accessed?: string
  board_memberships: BoardMembership[]
  committee_memberships: CommitteeMembership[]
  vault_memberships: VaultMembership[]
}

// Component Props
export interface BoardMateCardProps {
  boardmate: BoardMateProfile
  onEdit?: (boardmate: BoardMateProfile) => void
  onMessage?: (boardmate: BoardMateProfile) => void
  onManageAssociations?: (boardmate: BoardMateProfile) => void
  className?: string
  viewMode?: 'grid' | 'list'
}

export interface BoardMatesPageProps {
  initialBoardmates?: BoardMateProfile[]
  organizationId?: string
}

// Filter and Search Types
export interface BoardMateFilters {
  search: string
  status: string
  role: string
  boardType?: string
  committee?: string
}

export interface BoardMateSearchProps {
  filters: BoardMateFilters
  onFiltersChange: (filters: Partial<BoardMateFilters>) => void
  onClearFilters: () => void
  className?: string
}

// Association Management Types
export interface AssociationUpdate {
  type: 'board' | 'committee' | 'vault'
  id: string
  action: 'add' | 'remove' | 'update_role'
  role?: string
  current_role?: string
}

export interface Board {
  id: string
  name: string
  board_type: BoardType
  status: BoardStatus
  description?: string
  created_at?: string
}

export interface Committee {
  id: string
  name: string
  committee_type: CommitteeType
  board_id: string
  board_name: string
  status: CommitteeStatus
  description?: string
  created_at?: string
}

export interface Vault {
  id: string
  name: string
  status: VaultStatus
  description?: string
  meeting_date?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  member_count?: number
  asset_count?: number
  created_at?: string
}

export interface AssociationManagerProps {
  boardmate: BoardMateProfile
  isOpen: boolean
  onClose: () => void
  onUpdate: (updates: AssociationUpdate[]) => Promise<void>
}

// Role Configuration Types
export interface RoleConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

export interface RoleOption {
  value: string
  label: string
}

// Status Configuration
export interface StatusConfig {
  label: string
  color: string
  icon: React.ComponentType<{ className?: string }>
}

// Event Handlers
export interface BoardMateEventHandlers {
  onEdit: (boardmate: BoardMateProfile) => void
  onMessage: (boardmate: BoardMateProfile) => void
  onManageAssociations: (boardmate: BoardMateProfile) => void
  onDelete?: (boardmate: BoardMateProfile) => void
  onActivate?: (boardmate: BoardMateProfile) => void
  onSuspend?: (boardmate: BoardMateProfile) => void
}

// Statistics Types
export interface BoardMateStats {
  total: number
  active: number
  pending: number
  executive: number
  directors: number
}

export interface BoardMateStatsProps {
  stats: BoardMateStats
  onStatClick?: (type: keyof BoardMateStats) => void
  className?: string
}

// Data Loading Types
export interface BoardMateLoadingState {
  boardmates: boolean
  associations: boolean
  stats: boolean
}

export interface BoardMateError {
  message: string
  type: 'load' | 'save' | 'delete' | 'association'
}

// Form Types
export interface BoardMateFormData {
  full_name: string
  email: string
  designation?: string
  linkedin_url?: string
  bio?: string
  company?: string
  position?: string
}

export interface BoardMateFormProps {
  initialData?: Partial<BoardMateFormData>
  onSubmit: (data: BoardMateFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  error?: string
}

// Invitation Types
export interface VaultInvitation {
  id: string
  permission_level: VaultRole
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  vault: {
    id: string
    name: string
    organization: {
      id: string
      name: string
    }
  }
  expires_at: string
  created_at: string
}

export interface InvitationProps {
  invitation: VaultInvitation
  onAccept: (id: string) => Promise<boolean>
  onReject: (id: string) => Promise<boolean>
  className?: string
}

// Bulk Actions
export interface BulkAction {
  id: string
  label: string
  icon: ReactNode
  action: (selectedIds: string[]) => Promise<void>
  destructive?: boolean
  disabled?: boolean
}

export interface BulkActionsProps {
  selectedIds: string[]
  actions: BulkAction[]
  onClearSelection: () => void
  className?: string
}

// Export/Import Types
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf'
  fields: string[]
  filters?: BoardMateFilters
}

export interface ImportResult {
  success: number
  errors: Array<{
    row: number
    error: string
  }>
}

// Pagination Types
export interface BoardMatesPagination {
  page: number
  pageSize: number
  total: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedBoardMates {
  boardmates: BoardMateProfile[]
  pagination: BoardMatesPagination
}

// Sort Types
export type SortField = 'name' | 'email' | 'role' | 'status' | 'joined_at' | 'last_accessed'
export type SortOrder = 'asc' | 'desc'

export interface SortOptions {
  field: SortField
  order: SortOrder
}

// API Response Types
export interface BoardMatesApiResponse {
  boardmates: BoardMateProfile[]
  total: number
  page: number
  pageSize: number
}

export interface AssociationApiResponse {
  boards: Board[]
  committees: Committee[]
  vaults: Vault[]
}

export interface UpdateAssociationApiRequest {
  organization_id: string
  updates: AssociationUpdate[]
}