import { createStore, createSelectors } from './store-config'
import { VaultWithDetails, LoadingState, ErrorState, StoreSlice, FilterState, SortState, PaginationState, VaultInvitation } from './types'
import { apiClient } from '@/lib/api/client'
import { authStore } from './auth-store'
import { organizationStore } from './organization-store'

// Vault store state
export interface VaultState extends StoreSlice {
  // Core data
  vaults: VaultWithDetails[]
  currentVault: VaultWithDetails | null
  invitations: VaultInvitation[]
  
  // UI state
  loading: LoadingState
  errors: ErrorState
  filters: FilterState
  sort: SortState
  pagination: PaginationState
  
  // Selection state
  selectedVaultIds: string[]
  selectedInvitationIds: string[]
  
  // Actions - Vault CRUD
  fetchVaults: (organizationId?: string) => Promise<void>
  fetchVault: (id: string) => Promise<void>
  createVault: (data: CreateVaultData) => Promise<string | null>
  updateVault: (id: string, data: UpdateVaultData) => Promise<void>
  deleteVault: (id: string) => Promise<void>
  setCurrentVault: (vault: VaultWithDetails | null) => void
  
  // Actions - Member management
  inviteToVault: (vaultId: string, email: string, role: string) => Promise<void>
  updateMemberRole: (vaultId: string, userId: string, role: string) => Promise<void>
  removeMember: (vaultId: string, userId: string) => Promise<void>
  
  // Actions - Invitation management
  fetchInvitations: (organizationId?: string) => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<void>
  rejectInvitation: (invitationId: string) => Promise<void>
  cancelInvitation: (invitationId: string) => Promise<void>
  
  // Actions - Utilities
  setFilters: (filters: Partial<FilterState>) => void
  setSort: (sort: SortState) => void
  setPagination: (pagination: Partial<PaginationState>) => void
  setSelectedVaults: (vaultIds: string[]) => void
  setSelectedInvitations: (invitationIds: string[]) => void
  clearSelection: () => void
  reset: () => void
}

// Data interfaces
export interface CreateVaultData {
  name: string
  description?: string
  organization_id: string
  is_private: boolean
  default_permissions: {
    read: boolean
    write: boolean
    delete: boolean
    share: boolean
    invite: boolean
  }
  tags?: string[]
}

export interface UpdateVaultData {
  name?: string
  description?: string
  is_private?: boolean
  default_permissions?: {
    read?: boolean
    write?: boolean
    delete?: boolean
    share?: boolean
    invite?: boolean
  }
  tags?: string[]
}

// Initial state values
const initialFilters: FilterState = {
  search: '',
  status: undefined,
  tags: []
}

const initialSort: SortState = {
  field: 'updated_at',
  direction: 'desc'
}

const initialPagination: PaginationState = {
  page: 1,
  limit: 20,
  total: 0,
  hasMore: false
}

// Create the vault store
export const vaultStore = createStore<VaultState>(
  (set, get) => ({
    // Initial state
    vaults: [],
    currentVault: null,
    invitations: [],
    loading: {},
    errors: {},
    filters: initialFilters,
    sort: initialSort,
    pagination: initialPagination,
    selectedVaultIds: [],
    selectedInvitationIds: [],

    // Fetch vaults
    fetchVaults: async (organizationId?: string) => {
      const currentOrg = organizationId || organizationStore.getState().currentOrganization?.id
      if (!currentOrg) return

      set(draft => {
        draft.loading.fetchVaults = true
        draft.errors.fetchVaults = null
      })

      try {
        const params = new URLSearchParams({
          organizationId: currentOrg,
          page: get().pagination.page.toString(),
          limit: get().pagination.limit.toString()
        })

        if (get().filters.search) params.set('search', get().filters.search)
        if (get().filters.status) params.set('status', get().filters.status)
        if (get().sort.field) {
          params.set('sortField', get().sort.field)
          params.set('sortDirection', get().sort.direction)
        }

        const response = await apiClient.get<{
          success: boolean
          data: {
            vaults: VaultWithDetails[]
            pagination: PaginationState
          }
        }>(`/api/vaults?${params}`)

        set(draft => {
          draft.vaults = response.data.vaults
          draft.pagination = response.data.pagination
          draft.loading.fetchVaults = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchVaults = false
          draft.errors.fetchVaults = error instanceof Error ? error.message : 'Failed to fetch vaults'
        })
      }
    },

    // Fetch single vault
    fetchVault: async (id: string) => {
      set(draft => {
        draft.loading.fetchVault = true
        draft.errors.fetchVault = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: VaultWithDetails
        }>(`/api/vaults/${id}`)

        set(draft => {
          draft.currentVault = response.data
          draft.loading.fetchVault = false
          
          // Update in vaults list if it exists
          const index = draft.vaults.findIndex(vault => vault.id === id)
          if (index >= 0) {
            draft.vaults[index] = response.data
          }
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchVault = false
          draft.errors.fetchVault = error instanceof Error ? error.message : 'Failed to fetch vault'
        })
      }
    },

    // Create vault
    createVault: async (data: CreateVaultData) => {
      set(draft => {
        draft.loading.createVault = true
        draft.errors.createVault = null
      })

      try {
        const response = await apiClient.post<{
          success: boolean
          data: VaultWithDetails
        }>('/api/vaults/create', data)

        const newVault = response.data

        set(draft => {
          draft.vaults.unshift(newVault)
          draft.currentVault = newVault
          draft.loading.createVault = false
        })

        return newVault.id
      } catch (error) {
        set(draft => {
          draft.loading.createVault = false
          draft.errors.createVault = error instanceof Error ? error.message : 'Failed to create vault'
        })
        return null
      }
    },

    // Update vault
    updateVault: async (id: string, data: UpdateVaultData) => {
      set(draft => {
        draft.loading.updateVault = true
        draft.errors.updateVault = null
      })

      try {
        const response = await apiClient.put<{
          success: boolean
          data: VaultWithDetails
        }>(`/api/vaults/${id}`, data)

        const updatedVault = response.data

        set(draft => {
          // Update in vaults list
          const index = draft.vaults.findIndex(vault => vault.id === id)
          if (index >= 0) {
            draft.vaults[index] = updatedVault
          }
          
          // Update current vault if it matches
          if (draft.currentVault?.id === id) {
            draft.currentVault = updatedVault
          }
          
          draft.loading.updateVault = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.updateVault = false
          draft.errors.updateVault = error instanceof Error ? error.message : 'Failed to update vault'
        })
      }
    },

    // Delete vault
    deleteVault: async (id: string) => {
      set(draft => {
        draft.loading.deleteVault = true
        draft.errors.deleteVault = null
      })

      try {
        await apiClient.delete(`/api/vaults/${id}`)

        set(draft => {
          draft.vaults = draft.vaults.filter(vault => vault.id !== id)
          draft.selectedVaultIds = draft.selectedVaultIds.filter(vaultId => vaultId !== id)
          
          if (draft.currentVault?.id === id) {
            draft.currentVault = null
          }
          
          draft.loading.deleteVault = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.deleteVault = false
          draft.errors.deleteVault = error instanceof Error ? error.message : 'Failed to delete vault'
        })
      }
    },

    // Set current vault
    setCurrentVault: (vault: VaultWithDetails | null) => {
      set(draft => {
        draft.currentVault = vault
      })
    },

    // Invite to vault
    inviteToVault: async (vaultId: string, email: string, role: string) => {
      set(draft => {
        draft.loading.inviteToVault = true
        draft.errors.inviteToVault = null
      })

      try {
        await apiClient.post(`/api/vaults/${vaultId}/invite`, {
          email,
          role
        })

        set(draft => {
          draft.loading.inviteToVault = false
        })

        // Refresh vault to get updated members
        await get().fetchVault(vaultId)
      } catch (error) {
        set(draft => {
          draft.loading.inviteToVault = false
          draft.errors.inviteToVault = error instanceof Error ? error.message : 'Failed to invite to vault'
        })
      }
    },

    // Update member role
    updateMemberRole: async (vaultId: string, userId: string, role: string) => {
      set(draft => {
        draft.loading.updateMemberRole = true
        draft.errors.updateMemberRole = null
      })

      try {
        await apiClient.put(`/api/vaults/${vaultId}/members/${userId}`, {
          role
        })

        set(draft => {
          draft.loading.updateMemberRole = false
        })

        // Refresh vault to get updated members
        await get().fetchVault(vaultId)
      } catch (error) {
        set(draft => {
          draft.loading.updateMemberRole = false
          draft.errors.updateMemberRole = error instanceof Error ? error.message : 'Failed to update member role'
        })
      }
    },

    // Remove member
    removeMember: async (vaultId: string, userId: string) => {
      set(draft => {
        draft.loading.removeMember = true
        draft.errors.removeMember = null
      })

      try {
        await apiClient.delete(`/api/vaults/${vaultId}/members/${userId}`)

        set(draft => {
          draft.loading.removeMember = false
        })

        // Refresh vault to get updated members
        await get().fetchVault(vaultId)
      } catch (error) {
        set(draft => {
          draft.loading.removeMember = false
          draft.errors.removeMember = error instanceof Error ? error.message : 'Failed to remove member'
        })
      }
    },

    // Fetch invitations
    fetchInvitations: async (organizationId?: string) => {
      const currentOrg = organizationId || organizationStore.getState().currentOrganization?.id
      if (!currentOrg) return

      set(draft => {
        draft.loading.fetchInvitations = true
        draft.errors.fetchInvitations = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: { invitations: VaultInvitation[] }
        }>(`/api/vault-invitations?organizationId=${currentOrg}`)

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

    // Accept invitation
    acceptInvitation: async (invitationId: string) => {
      set(draft => {
        draft.loading.acceptInvitation = true
        draft.errors.acceptInvitation = null
      })

      try {
        const response = await apiClient.post<{
          success: boolean
          data: { vault: VaultWithDetails }
        }>(`/api/vault-invitations/${invitationId}/accept`)

        set(draft => {
          // Add to vaults list
          draft.vaults.unshift(response.data.vault)
          
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
        await apiClient.post(`/api/vault-invitations/${invitationId}/reject`)

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

    // Cancel invitation
    cancelInvitation: async (invitationId: string) => {
      set(draft => {
        draft.loading.cancelInvitation = true
        draft.errors.cancelInvitation = null
      })

      try {
        await apiClient.delete(`/api/vault-invitations/${invitationId}`)

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

    setSelectedVaults: (vaultIds: string[]) => {
      set(draft => {
        draft.selectedVaultIds = vaultIds
      })
    },

    setSelectedInvitations: (invitationIds: string[]) => {
      set(draft => {
        draft.selectedInvitationIds = invitationIds
      })
    },

    clearSelection: () => {
      set(draft => {
        draft.selectedVaultIds = []
        draft.selectedInvitationIds = []
      })
    },

    reset: () => {
      set(draft => {
        draft.vaults = []
        draft.currentVault = null
        draft.invitations = []
        draft.loading = {}
        draft.errors = {}
        draft.filters = initialFilters
        draft.sort = initialSort
        draft.pagination = initialPagination
        draft.selectedVaultIds = []
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
    name: 'vault',
    version: 1,
    partialize: (state) => ({
      currentVault: state.currentVault,
      filters: state.filters,
      sort: state.sort,
      _meta: state._meta
    })
  }
)

// Create selectors
export const vaultSelectors = createSelectors(vaultStore)

// Utility hooks
export const useVaults = () => vaultStore(state => state.vaults)
export const useCurrentVault = () => vaultStore(state => state.currentVault)
export const useVaultInvitations = () => vaultStore(state => state.invitations)
export const useVaultLoading = () => vaultStore(state => state.loading)
export const useVaultErrors = () => vaultStore(state => state.errors)
export const useVaultSelection = () => vaultStore(state => state.selectedVaultIds)