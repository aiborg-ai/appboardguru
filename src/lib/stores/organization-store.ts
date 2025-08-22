import { createStore, createSelectors } from './store-config'
import { OrganizationWithRole, LoadingState, ErrorState, StoreSlice, FilterState, SortState, PaginationState } from './types'
import { apiClient } from '@/lib/api/client'
import { authStore } from './auth-store'

// Organization invitation interface
export interface OrganizationInvitation {
  id: string
  organization_id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  invited_by: string
  invited_at: string
  expires_at: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  organization: Pick<OrganizationWithRole, 'id' | 'name' | 'slug'>
  inviter: {
    id: string
    full_name: string
    email: string
  }
}

// Organization member interface
export interface OrganizationMember {
  id: string
  user_id: string
  organization_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joined_at: string
  last_active_at?: string
  user: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  permissions: string[]
}

// Organization settings interface
export interface OrganizationSettings {
  id: string
  organization_id: string
  allow_public_signup: boolean
  require_email_verification: boolean
  max_file_size_mb: number
  allowed_file_types: string[]
  retention_days: number
  enable_audit_log: boolean
  enable_2fa: boolean
  enable_sso: boolean
  sso_provider?: string
  sso_config?: Record<string, any>
  branding: {
    logo_url?: string
    primary_color?: string
    secondary_color?: string
    theme?: 'light' | 'dark' | 'auto'
  }
  integrations: {
    slack?: { webhook_url: string; enabled: boolean }
    teams?: { webhook_url: string; enabled: boolean }
    email?: { provider: string; config: Record<string, any> }
  }
}

// Organization store state
export interface OrganizationState extends StoreSlice {
  // Core data
  organizations: OrganizationWithRole[]
  currentOrganization: OrganizationWithRole | null
  members: OrganizationMember[]
  invitations: OrganizationInvitation[]
  settings: OrganizationSettings | null
  
  // UI state
  loading: LoadingState
  errors: ErrorState
  filters: FilterState
  sort: SortState
  pagination: PaginationState
  
  // Selection state
  selectedMemberIds: string[]
  selectedInvitationIds: string[]
  
  // Actions - Organization CRUD
  fetchOrganizations: () => Promise<void>
  fetchOrganization: (id: string) => Promise<void>
  createOrganization: (data: CreateOrganizationData) => Promise<string | null>
  updateOrganization: (id: string, data: UpdateOrganizationData) => Promise<void>
  deleteOrganization: (id: string, immediate?: boolean) => Promise<void>
  setCurrentOrganization: (organization: OrganizationWithRole | null) => void
  
  // Actions - Member management
  fetchMembers: (organizationId: string) => Promise<void>
  inviteMember: (organizationId: string, email: string, role: string) => Promise<void>
  updateMemberRole: (memberId: string, role: string) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  
  // Actions - Invitation management
  fetchInvitations: (organizationId: string) => Promise<void>
  resendInvitation: (invitationId: string) => Promise<void>
  cancelInvitation: (invitationId: string) => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<void>
  rejectInvitation: (invitationId: string) => Promise<void>
  
  // Actions - Settings
  fetchSettings: (organizationId: string) => Promise<void>
  updateSettings: (organizationId: string, settings: Partial<OrganizationSettings>) => Promise<void>
  
  // Actions - Utilities
  setFilters: (filters: Partial<FilterState>) => void
  setSort: (sort: SortState) => void
  setPagination: (pagination: Partial<PaginationState>) => void
  setSelectedMembers: (memberIds: string[]) => void
  setSelectedInvitations: (invitationIds: string[]) => void
  clearSelection: () => void
  reset: () => void
}

// Data interfaces
export interface CreateOrganizationData {
  name: string
  slug: string
  description?: string
  website?: string
  industry?: string
  organizationSize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  logo_url?: string
}

export interface UpdateOrganizationData {
  name?: string
  description?: string
  website?: string
  industry?: string
  organizationSize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  logo_url?: string
}

// Initial state values
const initialFilters: FilterState = {
  search: '',
  status: undefined,
  type: undefined
}

const initialSort: SortState = {
  field: 'created_at',
  direction: 'desc'
}

const initialPagination: PaginationState = {
  page: 1,
  limit: 20,
  total: 0,
  hasMore: false
}

// Create the organization store
export const organizationStore = createStore<OrganizationState>(
  (set, get) => ({
    // Initial state
    organizations: [],
    currentOrganization: null,
    members: [],
    invitations: [],
    settings: null,
    loading: {},
    errors: {},
    filters: initialFilters,
    sort: initialSort,
    pagination: initialPagination,
    selectedMemberIds: [],
    selectedInvitationIds: [],

    // Fetch all user organizations
    fetchOrganizations: async () => {
      const user = authStore.getState().user
      if (!user) return

      set(draft => {
        draft.loading.fetchOrganizations = true
        draft.errors.fetchOrganizations = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: { organizations: OrganizationWithRole[] }
        }>(`/api/organizations?userId=${user.id}`)

        set(draft => {
          draft.organizations = response.data.organizations
          draft.loading.fetchOrganizations = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchOrganizations = false
          draft.errors.fetchOrganizations = error instanceof Error ? error.message : 'Failed to fetch organizations'
        })
      }
    },

    // Fetch single organization
    fetchOrganization: async (id: string) => {
      const user = authStore.getState().user
      if (!user) return

      set(draft => {
        draft.loading.fetchOrganization = true
        draft.errors.fetchOrganization = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: OrganizationWithRole
        }>(`/api/organizations?id=${id}&userId=${user.id}`)

        set(draft => {
          draft.currentOrganization = response.data
          draft.loading.fetchOrganization = false
          
          // Update in organizations list if it exists
          const index = draft.organizations.findIndex(org => org.id === id)
          if (index >= 0) {
            draft.organizations[index] = response.data
          }
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchOrganization = false
          draft.errors.fetchOrganization = error instanceof Error ? error.message : 'Failed to fetch organization'
        })
      }
    },

    // Create organization
    createOrganization: async (data: CreateOrganizationData) => {
      const user = authStore.getState().user
      if (!user) return null

      set(draft => {
        draft.loading.createOrganization = true
        draft.errors.createOrganization = null
      })

      try {
        const response = await apiClient.post<{
          success: boolean
          data: OrganizationWithRole
        }>('/api/organizations', {
          ...data,
          createdBy: user.id
        })

        const newOrganization = response.data

        set(draft => {
          draft.organizations.unshift(newOrganization)
          draft.currentOrganization = newOrganization
          draft.loading.createOrganization = false
        })

        return newOrganization.id
      } catch (error) {
        set(draft => {
          draft.loading.createOrganization = false
          draft.errors.createOrganization = error instanceof Error ? error.message : 'Failed to create organization'
        })
        return null
      }
    },

    // Update organization
    updateOrganization: async (id: string, data: UpdateOrganizationData) => {
      const user = authStore.getState().user
      if (!user) return

      set(draft => {
        draft.loading.updateOrganization = true
        draft.errors.updateOrganization = null
      })

      try {
        const response = await apiClient.put<{
          success: boolean
          data: OrganizationWithRole
        }>('/api/organizations', {
          organizationId: id,
          userId: user.id,
          ...data
        })

        const updatedOrganization = response.data

        set(draft => {
          // Update in organizations list
          const index = draft.organizations.findIndex(org => org.id === id)
          if (index >= 0) {
            draft.organizations[index] = updatedOrganization
          }
          
          // Update current organization if it matches
          if (draft.currentOrganization?.id === id) {
            draft.currentOrganization = updatedOrganization
          }
          
          draft.loading.updateOrganization = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.updateOrganization = false
          draft.errors.updateOrganization = error instanceof Error ? error.message : 'Failed to update organization'
        })
      }
    },

    // Delete organization
    deleteOrganization: async (id: string, immediate = false) => {
      const user = authStore.getState().user
      if (!user) return

      set(draft => {
        draft.loading.deleteOrganization = true
        draft.errors.deleteOrganization = null
      })

      try {
        await apiClient.delete(`/api/organizations?id=${id}&userId=${user.id}&immediate=${immediate}`)

        set(draft => {
          draft.organizations = draft.organizations.filter(org => org.id !== id)
          
          if (draft.currentOrganization?.id === id) {
            draft.currentOrganization = null
          }
          
          draft.loading.deleteOrganization = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.deleteOrganization = false
          draft.errors.deleteOrganization = error instanceof Error ? error.message : 'Failed to delete organization'
        })
      }
    },

    // Set current organization
    setCurrentOrganization: (organization: OrganizationWithRole | null) => {
      set(draft => {
        draft.currentOrganization = organization
      })
    },

    // Fetch organization members
    fetchMembers: async (organizationId: string) => {
      set(draft => {
        draft.loading.fetchMembers = true
        draft.errors.fetchMembers = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: { members: OrganizationMember[] }
        }>(`/api/organizations/${organizationId}/members`)

        set(draft => {
          draft.members = response.data.members
          draft.loading.fetchMembers = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchMembers = false
          draft.errors.fetchMembers = error instanceof Error ? error.message : 'Failed to fetch members'
        })
      }
    },

    // Invite member
    inviteMember: async (organizationId: string, email: string, role: string) => {
      set(draft => {
        draft.loading.inviteMember = true
        draft.errors.inviteMember = null
      })

      try {
        const response = await apiClient.post<{
          success: boolean
          data: OrganizationInvitation
        }>(`/api/organizations/${organizationId}/invitations`, {
          email,
          role
        })

        set(draft => {
          draft.invitations.unshift(response.data)
          draft.loading.inviteMember = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.inviteMember = false
          draft.errors.inviteMember = error instanceof Error ? error.message : 'Failed to invite member'
        })
      }
    },

    // Update member role
    updateMemberRole: async (memberId: string, role: string) => {
      set(draft => {
        draft.loading.updateMemberRole = true
        draft.errors.updateMemberRole = null
      })

      try {
        const response = await apiClient.put<{
          success: boolean
          data: OrganizationMember
        }>(`/api/organizations/members/${memberId}`, { role })

        set(draft => {
          const index = draft.members.findIndex(member => member.id === memberId)
          if (index >= 0) {
            draft.members[index] = response.data
          }
          draft.loading.updateMemberRole = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.updateMemberRole = false
          draft.errors.updateMemberRole = error instanceof Error ? error.message : 'Failed to update member role'
        })
      }
    },

    // Remove member
    removeMember: async (memberId: string) => {
      set(draft => {
        draft.loading.removeMember = true
        draft.errors.removeMember = null
      })

      try {
        await apiClient.delete(`/api/organizations/members/${memberId}`)

        set(draft => {
          draft.members = draft.members.filter(member => member.id !== memberId)
          draft.selectedMemberIds = draft.selectedMemberIds.filter(id => id !== memberId)
          draft.loading.removeMember = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.removeMember = false
          draft.errors.removeMember = error instanceof Error ? error.message : 'Failed to remove member'
        })
      }
    },

    // Fetch invitations
    fetchInvitations: async (organizationId: string) => {
      set(draft => {
        draft.loading.fetchInvitations = true
        draft.errors.fetchInvitations = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: { invitations: OrganizationInvitation[] }
        }>(`/api/organizations/${organizationId}/invitations`)

        set(draft => {
          draft.invitations = response.data.invitations
          draft.loading.fetchInvitations = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchInvitations = false
          draft.errors.fetchInvitations = error instanceof Error ? error.message : 'Failed to fetch invitations'
        })
      }
    },

    // Resend invitation
    resendInvitation: async (invitationId: string) => {
      set(draft => {
        draft.loading.resendInvitation = true
        draft.errors.resendInvitation = null
      })

      try {
        await apiClient.post(`/api/organizations/invitations/${invitationId}/resend`)

        set(draft => {
          const index = draft.invitations.findIndex(inv => inv.id === invitationId)
          if (index >= 0) {
            draft.invitations[index].expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
          draft.loading.resendInvitation = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.resendInvitation = false
          draft.errors.resendInvitation = error instanceof Error ? error.message : 'Failed to resend invitation'
        })
      }
    },

    // Cancel invitation
    cancelInvitation: async (invitationId: string) => {
      set(draft => {
        draft.loading.cancelInvitation = true
        draft.errors.cancelInvitation = null
      })

      try {
        await apiClient.delete(`/api/organizations/invitations/${invitationId}`)

        set(draft => {
          draft.invitations = draft.invitations.filter(inv => inv.id !== invitationId)
          draft.selectedInvitationIds = draft.selectedInvitationIds.filter(id => id !== invitationId)
          draft.loading.cancelInvitation = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.cancelInvitation = false
          draft.errors.cancelInvitation = error instanceof Error ? error.message : 'Failed to cancel invitation'
        })
      }
    },

    // Accept invitation
    acceptInvitation: async (invitationId: string) => {
      set(draft => {
        draft.loading.acceptInvitation = true
        draft.errors.acceptInvitation = null
      })

      try {
        const response = await apiClient.post<{
          success: boolean
          data: { organization: OrganizationWithRole }
        }>(`/api/organizations/invitations/${invitationId}/accept`)

        set(draft => {
          // Add to organizations list
          draft.organizations.unshift(response.data.organization)
          
          // Remove from invitations
          draft.invitations = draft.invitations.filter(inv => inv.id !== invitationId)
          
          draft.loading.acceptInvitation = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.acceptInvitation = false
          draft.errors.acceptInvitation = error instanceof Error ? error.message : 'Failed to accept invitation'
        })
      }
    },

    // Reject invitation
    rejectInvitation: async (invitationId: string) => {
      set(draft => {
        draft.loading.rejectInvitation = true
        draft.errors.rejectInvitation = null
      })

      try {
        await apiClient.post(`/api/organizations/invitations/${invitationId}/reject`)

        set(draft => {
          draft.invitations = draft.invitations.filter(inv => inv.id !== invitationId)
          draft.loading.rejectInvitation = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.rejectInvitation = false
          draft.errors.rejectInvitation = error instanceof Error ? error.message : 'Failed to reject invitation'
        })
      }
    },

    // Fetch settings
    fetchSettings: async (organizationId: string) => {
      set(draft => {
        draft.loading.fetchSettings = true
        draft.errors.fetchSettings = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: OrganizationSettings
        }>(`/api/organizations/${organizationId}/settings`)

        set(draft => {
          draft.settings = response.data
          draft.loading.fetchSettings = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchSettings = false
          draft.errors.fetchSettings = error instanceof Error ? error.message : 'Failed to fetch settings'
        })
      }
    },

    // Update settings
    updateSettings: async (organizationId: string, settings: Partial<OrganizationSettings>) => {
      set(draft => {
        draft.loading.updateSettings = true
        draft.errors.updateSettings = null
      })

      try {
        const response = await apiClient.put<{
          success: boolean
          data: OrganizationSettings
        }>(`/api/organizations/${organizationId}/settings`, settings)

        set(draft => {
          draft.settings = response.data
          draft.loading.updateSettings = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.updateSettings = false
          draft.errors.updateSettings = error instanceof Error ? error.message : 'Failed to update settings'
        })
      }
    },

    // Utility actions
    setFilters: (filters: Partial<FilterState>) => {
      set(draft => {
        draft.filters = { ...draft.filters, ...filters }
      })
    },

    setSort: (sort: SortState) => {
      set(draft => {
        draft.sort = sort
      })
    },

    setPagination: (pagination: Partial<PaginationState>) => {
      set(draft => {
        draft.pagination = { ...draft.pagination, ...pagination }
      })
    },

    setSelectedMembers: (memberIds: string[]) => {
      set(draft => {
        draft.selectedMemberIds = memberIds
      })
    },

    setSelectedInvitations: (invitationIds: string[]) => {
      set(draft => {
        draft.selectedInvitationIds = invitationIds
      })
    },

    clearSelection: () => {
      set(draft => {
        draft.selectedMemberIds = []
        draft.selectedInvitationIds = []
      })
    },

    reset: () => {
      set(draft => {
        draft.organizations = []
        draft.currentOrganization = null
        draft.members = []
        draft.invitations = []
        draft.settings = null
        draft.loading = {}
        draft.errors = {}
        draft.filters = initialFilters
        draft.sort = initialSort
        draft.pagination = initialPagination
        draft.selectedMemberIds = []
        draft.selectedInvitationIds = []
      })
    },

    _meta: {
      version: 1,
      lastUpdated: Date.now(),
      hydrated: false
    }
  }),
  {
    name: 'organization',
    version: 1,
    partialize: (state) => ({
      currentOrganization: state.currentOrganization,
      filters: state.filters,
      sort: state.sort,
      _meta: state._meta
    })
  }
)

// Create selectors
export const organizationSelectors = createSelectors(organizationStore)

// Utility hooks
export const useOrganizations = () => organizationStore(state => state.organizations)
export const useCurrentOrganization = () => organizationStore(state => state.currentOrganization)
export const useOrganizationMembers = () => organizationStore(state => state.members)
export const useOrganizationInvitations = () => organizationStore(state => state.invitations)
export const useOrganizationSettings = () => organizationStore(state => state.settings)
export const useOrganizationLoading = () => organizationStore(state => state.loading)
export const useOrganizationErrors = () => organizationStore(state => state.errors)