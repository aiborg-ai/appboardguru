// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  errors?: ValidationError[]
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ValidationError {
  field: string
  message: string
  code?: string
}

// Auth responses
export interface AuthResponse extends ApiResponse {
  data: {
    user: {
      id: string
      email: string
      full_name: string | null
      role: string
      status: string
    }
    session?: {
      access_token: string
      refresh_token: string
      expires_at: number
    }
    requiresOtp?: boolean
    requiresPasswordSetup?: boolean
  }
}

export interface OtpResponse extends ApiResponse {
  data: {
    otpSent: boolean
    expiresAt: string
  }
}

// User responses
export interface UserResponse extends ApiResponse {
  data: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    role: string
    status: string
    company: string | null
    position: string | null
    created_at: string
    organizations?: Array<{
      id: string
      name: string
      role: string
    }>
  }
}

export interface UsersListResponse extends PaginatedResponse<UserResponse['data']> {}

// Organization responses
export interface OrganizationResponse extends ApiResponse {
  data: {
    id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    website: string | null
    industry: string | null
    organization_size: string | null
    created_at: string
    memberCount?: number
    vaultCount?: number
    assetCount?: number
  }
}

export interface OrganizationsListResponse extends PaginatedResponse<OrganizationResponse['data']> {}

export interface OrganizationMembersResponse extends PaginatedResponse<{
  id: string
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
  role: string
  status: string
  joined_at: string
  last_accessed: string | null
}> {}

// Vault responses
export interface VaultResponse extends ApiResponse {
  data: {
    id: string
    name: string
    description: string | null
    organization_id: string
    meeting_date: string | null
    status: string
    priority: string
    created_by: string
    created_at: string
    updated_at: string
    tags: string[] | null
    memberCount?: number
    assetCount?: number
    organization?: {
      id: string
      name: string
      slug: string
    }
  }
}

export interface VaultsListResponse extends PaginatedResponse<VaultResponse['data']> {}

export interface VaultMembersResponse extends PaginatedResponse<{
  id: string
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
  role: string
  permissions: Record<string, boolean>
  joined_at: string
}> {}

export interface VaultInvitationResponse extends ApiResponse {
  data: {
    invitationId: string
    invitedUsers: Array<{
      email: string
      status: 'sent' | 'failed'
      error?: string
    }>
  }
}

// Asset responses
export interface AssetResponse extends ApiResponse {
  data: {
    id: string
    title: string
    description: string | null
    file_name: string
    file_type: string
    file_size: number
    status: 'processing' | 'ready' | 'failed'
    summary: string | null
    audio_summary_url: string | null
    visibility: string
    tags: string[] | null
    created_at: string
    updated_at: string
    organization: {
      id: string
      name: string
    }
    uploader: {
      id: string
      full_name: string | null
      email: string
    }
    metrics?: {
      viewCount: number
      downloadCount: number
      commentCount: number
    }
  }
}

export interface AssetsListResponse extends PaginatedResponse<AssetResponse['data']> {}

export interface AssetUploadResponse extends ApiResponse {
  data: {
    assetId: string
    uploadUrl?: string
    processingStatus: 'queued' | 'processing' | 'completed' | 'failed'
  }
}

export interface AssetDownloadResponse extends ApiResponse {
  data: {
    downloadUrl: string
    expiresAt: string
    filename: string
  }
}

// AI responses
export interface SummaryResponse extends ApiResponse {
  data: {
    summary: string
    audioUrl?: string
    processingTime: number
    language: string
    wordCount: number
  }
}

export interface AIChatResponse extends ApiResponse {
  data: {
    response: string
    conversationId: string
    sources?: Array<{
      assetId: string
      title: string
      relevance: number
    }>
    usage?: {
      tokensUsed: number
      cost: number
    }
  }
}

// Search responses
export interface SearchResponse<T> extends PaginatedResponse<T> {
  data: T[]
  facets?: {
    types: Record<string, number>
    organizations: Record<string, number>
    tags: Record<string, number>
    status: Record<string, number>
  }
  suggestions?: string[]
}

// Activity responses
export interface ActivityResponse extends PaginatedResponse<{
  id: string
  event_type: string
  action: string
  resource_type: string
  resource_id: string | null
  event_description: string
  created_at: string
  user: {
    id: string
    full_name: string | null
    email: string
  } | null
  organization: {
    id: string
    name: string
  } | null
}> {}

// Invitation responses
export interface InvitationResponse extends ApiResponse {
  data: {
    id: string
    email: string
    role: string
    status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'
    created_at: string
    expires_at: string
    organization: {
      id: string
      name: string
    }
    invitedBy: {
      id: string
      full_name: string | null
      email: string
    }
  }
}

export interface InvitationsListResponse extends PaginatedResponse<InvitationResponse['data']> {}

// Health check and status responses
export interface HealthResponse extends ApiResponse {
  data: {
    status: 'healthy' | 'degraded' | 'down'
    timestamp: string
    version: string
    dependencies: {
      database: 'healthy' | 'down'
      storage: 'healthy' | 'down'
      ai: 'healthy' | 'down'
    }
  }
}