// API Request types
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface FilterParams {
  status?: string
  organizationId?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
}

// User API requests
export interface CreateUserRequest {
  email: string
  full_name: string
  company?: string
  position?: string
  role?: string
}

export interface UpdateUserRequest {
  full_name?: string
  company?: string
  position?: string
  avatar_url?: string
}

export interface InviteUserRequest {
  email: string
  role: string
  organizationId: string
  personalMessage?: string
}

// Organization API requests
export interface CreateOrganizationRequest {
  name: string
  slug: string
  description?: string
  website?: string
  industry?: string
  organizationSize?: string
}

export interface UpdateOrganizationRequest {
  name?: string
  description?: string
  website?: string
  industry?: string
  organizationSize?: string
  settings?: Record<string, unknown>
}

export interface InviteOrganizationMemberRequest {
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  personalMessage?: string
}

// Vault API requests
export interface CreateVaultRequest {
  name: string
  description?: string
  organizationId: string
  meetingDate?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  tags?: string[]
}

export interface UpdateVaultRequest {
  name?: string
  description?: string
  meetingDate?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'draft' | 'active' | 'archived' | 'published'
  tags?: string[]
}

export interface VaultInviteRequest {
  userIds: string[]
  emails?: string[]
  role?: 'owner' | 'editor' | 'viewer'
  message?: string
  deadline?: string
}

export interface VaultBroadcastRequest {
  vaultId: string
  userIds: string[]
  message?: string
  requireAcceptance?: boolean
  deadline?: string
}

// Asset API requests
export interface CreateAssetRequest {
  title: string
  description?: string
  organizationId: string
  visibility: 'organization' | 'public' | 'private'
  tags?: string[]
}

export interface UpdateAssetRequest {
  title?: string
  description?: string
  visibility?: 'organization' | 'public' | 'private'
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface ShareAssetRequest {
  emails: string[]
  message?: string
  permissions: {
    canView: boolean
    canDownload: boolean
    canComment: boolean
  }
  expiresAt?: string
}

export interface AddAssetToVaultRequest {
  assetId: string
  vaultId: string
}

// Search requests
export interface SearchRequest extends PaginationParams, SortParams {
  query: string
  filters?: {
    type?: 'assets' | 'vaults' | 'organizations'
    organizationId?: string
    tags?: string[]
    status?: string
    dateRange?: {
      from: string
      to: string
    }
  }
}

// Authentication requests
export interface SignInRequest {
  email: string
  password?: string
  otpCode?: string
}

export interface SignUpRequest {
  email: string
  fullName: string
  company?: string
  position?: string
  message?: string
}

export interface ResetPasswordRequest {
  email: string
}

export interface SetPasswordRequest {
  token: string
  password: string
  confirmPassword: string
}

// AI requests
export interface SummarizeDocumentRequest {
  assetId: string
  summaryType?: 'brief' | 'detailed' | 'executive'
  generateAudio?: boolean
  language?: string
}

export interface AIChatRequest {
  message: string
  context?: {
    assetIds?: string[]
    vaultId?: string
    organizationId?: string
  }
  conversationId?: string
}