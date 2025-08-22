import { Database } from '@/types/database'

// Base types
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

// Database entity types
export type User = Database['public']['Tables']['users']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row'] 
export type Asset = Database['public']['Tables']['assets']['Row']
export type Vault = Database['public']['Tables']['vaults']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type VaultInvitation = Database['public']['Tables']['vault_invitations']['Row']

// Extended types with computed properties
export interface UserWithProfile extends User {
  profile?: {
    avatar_url?: string
    display_name?: string
    bio?: string
    timezone?: string
    language?: string
  }
  preferences?: UserPreferences
}

export interface OrganizationWithRole extends Organization {
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
  membershipStatus: 'active' | 'suspended' | 'pending_activation'
  memberCount?: number
  vaultCount?: number
  assetCount?: number
}

export interface AssetWithMetadata extends Asset {
  owner?: Pick<User, 'id' | 'full_name' | 'email'>
  organization?: Pick<Organization, 'id' | 'name' | 'slug'>
  vault?: Pick<Vault, 'id' | 'name'>
  collaborators?: Pick<User, 'id' | 'full_name' | 'avatar_url'>[]
  annotations_count?: number
  shares_count?: number
  views_count?: number
  isUploading?: boolean
  uploadProgress?: number
}

export interface VaultWithDetails extends Vault {
  owner?: Pick<User, 'id' | 'full_name' | 'email'>
  organization?: Pick<Organization, 'id' | 'name' | 'slug'>
  members?: VaultMember[]
  assets_count?: number
  pending_invitations?: VaultInvitation[]
  userRole?: 'owner' | 'admin' | 'member' | 'viewer'
  permissions?: VaultPermissions
}

export interface NotificationWithMetadata extends Notification {
  actor?: Pick<User, 'id' | 'full_name' | 'avatar_url'>
  organization?: Pick<Organization, 'id' | 'name' | 'slug'>
  vault?: Pick<Vault, 'id' | 'name'>
  asset?: Pick<Asset, 'id' | 'filename' | 'file_type'>
  timeAgo?: string
}

// Supporting types
export interface VaultMember {
  id: string
  user_id: string
  vault_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  permissions: string[]
  joined_at: string
  user: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url'>
}

export interface VaultPermissions {
  can_read: boolean
  can_write: boolean
  can_delete: boolean
  can_share: boolean
  can_invite: boolean
  can_manage: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  email_notifications: boolean
  push_notifications: boolean
  desktop_notifications: boolean
  notification_frequency: 'real_time' | 'hourly' | 'daily' | 'weekly'
  auto_save: boolean
  default_view: 'grid' | 'list' | 'kanban'
}

// State management types
export interface LoadingState {
  [key: string]: boolean
}

export interface ErrorState {
  [key: string]: string | null
}

export interface PaginationState {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface FilterState {
  search?: string
  status?: string
  type?: string
  priority?: string
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
  owners?: string[]
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

// UI State types
export interface ModalState {
  [key: string]: {
    isOpen: boolean
    data?: unknown
    step?: number
  }
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Real-time update types
export interface RealtimeEvent<T = unknown> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  schema: string
  table: string
  old: T
  new: T
}

// Offline sync types
export interface SyncQueueItem {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: string
  entityId: string
  data: unknown
  timestamp: number
  retryCount: number
  maxRetries: number
  error?: string
}

export interface OfflineState {
  isOnline: boolean
  syncQueue: SyncQueueItem[]
  lastSync: number
  isSyncing: boolean
  syncErrors: string[]
}

// Store interfaces
export interface StoreSlice {
  _meta: {
    version: number
    lastUpdated: number
    hydrated: boolean
  }
}

export interface StoreSubscription<T = unknown, R = unknown> {
  id: string
  selector: (state: T) => R
  callback: (state: R, previousState: R) => void
}

// Action types for optimistic updates
export interface OptimisticAction<T = unknown> {
  id: string
  type: string
  entity: string
  optimisticData: T
  rollbackData?: T
  timestamp: number
}

// WebSocket message types
export interface WebSocketMessage<T = unknown> {
  type: 'notification' | 'asset_update' | 'vault_update' | 'organization_update'
  data: T
  timestamp: number
  userId?: string
  organizationId?: string
}

// Migration types
export interface StoreMigration<T = unknown, R = unknown> {
  version: number
  migrate: (persistedState: T) => R
}

// Performance tracking
export interface PerformanceMetrics {
  storeSize: number
  lastActionTime: number
  actionCounts: { [action: string]: number }
  renderCounts: { [component: string]: number }
}