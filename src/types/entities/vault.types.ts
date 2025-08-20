import { Database } from '../database'

// Base vault types from database
export type Vault = Database['public']['Tables']['vaults']['Row']
export type VaultInsert = Database['public']['Tables']['vaults']['Insert']
export type VaultUpdate = Database['public']['Tables']['vaults']['Update']

export type VaultMember = Database['public']['Tables']['vault_members']['Row']
export type VaultInvitation = Database['public']['Tables']['vault_invitations']['Row']
export type VaultAsset = Database['public']['Tables']['vault_assets']['Row']

// Extended types
export interface VaultWithDetails extends Vault {
  organization: {
    id: string
    name: string
    slug: string
  }
  members: VaultMemberWithUser[]
  assets: VaultAssetWithDetails[]
  memberCount: number
  assetCount: number
  invitations?: VaultInvitationWithUser[]
}

export interface VaultMemberWithUser extends VaultMember {
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface VaultAssetWithDetails extends VaultAsset {
  asset: {
    id: string
    title: string
    file_name: string
    file_type: string
    file_size: number
    status: AssetStatus
    summary: string | null
    created_at: string
  }
}

export interface VaultInvitationWithUser extends VaultInvitation {
  invitedBy: {
    id: string
    full_name: string | null
    email: string
  }
  invitedUser?: {
    id: string
    full_name: string | null
    email: string
  }
}

export interface VaultPermissions {
  canView: boolean
  canEdit: boolean
  canInvite: boolean
  canManageAssets: boolean
  canDelete: boolean
  canExport: boolean
}

export interface VaultBroadcast {
  vaultId: string
  userIds: string[]
  message?: string
  deadline?: string
  requireAcceptance: boolean
}

export interface VaultActivity {
  id: string
  vaultId: string
  userId: string
  action: VaultAction
  details: Record<string, any>
  timestamp: string
  user: {
    full_name: string | null
    email: string
  }
}

export type VaultStatus = 'draft' | 'active' | 'archived' | 'published'
export type VaultPriority = 'low' | 'medium' | 'high' | 'urgent'
export type VaultRole = 'owner' | 'editor' | 'viewer'
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export type AssetStatus = 'processing' | 'ready' | 'failed'
export type VaultAction = 'created' | 'updated' | 'archived' | 'asset_added' | 'asset_removed' | 'member_added' | 'member_removed' | 'invitation_sent'