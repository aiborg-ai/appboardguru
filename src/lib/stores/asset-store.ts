import { createStore, createSelectors } from './store-config'
import { AssetWithMetadata, LoadingState, ErrorState, StoreSlice, FilterState, SortState, PaginationState } from './types'
import { apiClient } from '@/lib/api/client'
import { authStore } from './auth-store'
import { organizationStore } from './organization-store'

// Asset upload interface
export interface AssetUpload {
  id: string
  file: File
  filename: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'
  error?: string
  assetId?: string
  organizationId?: string
  vaultId?: string
}

// Asset share interface
export interface AssetShare {
  id: string
  asset_id: string
  shared_by: string
  shared_with?: string
  share_type: 'public' | 'private' | 'organization' | 'vault'
  permissions: ('read' | 'write' | 'comment' | 'download')[]
  expires_at?: string
  password?: string
  created_at: string
  download_count: number
  last_accessed_at?: string
  asset: Pick<AssetWithMetadata, 'id' | 'filename' | 'file_type' | 'file_size'>
}

// Asset annotation interface
export interface AssetAnnotation {
  id: string
  asset_id: string
  user_id: string
  page_number?: number
  position: {
    x: number
    y: number
    width?: number
    height?: number
  }
  content: string
  type: 'text' | 'highlight' | 'drawing' | 'note'
  color?: string
  created_at: string
  updated_at: string
  user: {
    id: string
    full_name: string
    avatar_url?: string
  }
  replies?: AssetAnnotation[]
}

// Asset version interface
export interface AssetVersion {
  id: string
  asset_id: string
  version_number: number
  file_url: string
  file_size: number
  created_at: string
  created_by: string
  changelog?: string
  is_current: boolean
  user: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

// Asset store state
export interface AssetState extends StoreSlice {
  // Core data
  assets: AssetWithMetadata[]
  currentAsset: AssetWithMetadata | null
  uploads: AssetUpload[]
  shares: AssetShare[]
  annotations: AssetAnnotation[]
  versions: AssetVersion[]
  
  // UI state
  loading: LoadingState
  errors: ErrorState
  filters: FilterState
  sort: SortState
  pagination: PaginationState
  
  // Selection and view state
  selectedAssetIds: string[]
  viewMode: 'grid' | 'list' | 'kanban'
  groupBy: 'none' | 'type' | 'vault' | 'owner' | 'date'
  
  // Actions - Asset CRUD
  fetchAssets: (organizationId?: string, vaultId?: string) => Promise<void>
  fetchAsset: (id: string) => Promise<void>
  createAsset: (data: CreateAssetData) => Promise<string | null>
  updateAsset: (id: string, data: UpdateAssetData) => Promise<void>
  deleteAsset: (id: string) => Promise<void>
  duplicateAsset: (id: string, name?: string) => Promise<string | null>
  
  // Actions - File operations
  uploadAssets: (files: File[], organizationId: string, vaultId?: string) => Promise<void>
  resumeUpload: (uploadId: string) => Promise<void>
  cancelUpload: (uploadId: string) => void
  retryUpload: (uploadId: string) => Promise<void>
  downloadAsset: (id: string) => Promise<void>
  
  // Actions - Sharing
  shareAsset: (assetId: string, shareData: CreateShareData) => Promise<string | null>
  updateShare: (shareId: string, data: UpdateShareData) => Promise<void>
  revokeShare: (shareId: string) => Promise<void>
  fetchShares: (assetId: string) => Promise<void>
  
  // Actions - Annotations
  fetchAnnotations: (assetId: string) => Promise<void>
  createAnnotation: (assetId: string, annotation: CreateAnnotationData) => Promise<string | null>
  updateAnnotation: (annotationId: string, data: UpdateAnnotationData) => Promise<void>
  deleteAnnotation: (annotationId: string) => Promise<void>
  replyToAnnotation: (annotationId: string, content: string) => Promise<void>
  
  // Actions - Versions
  fetchVersions: (assetId: string) => Promise<void>
  createVersion: (assetId: string, file: File, changelog?: string) => Promise<string | null>
  restoreVersion: (versionId: string) => Promise<void>
  deleteVersion: (versionId: string) => Promise<void>
  
  // Actions - Utilities
  setCurrentAsset: (asset: AssetWithMetadata | null) => void
  setFilters: (filters: Partial<FilterState>) => void
  setSort: (sort: SortState) => void
  setPagination: (pagination: Partial<PaginationState>) => void
  setSelectedAssets: (assetIds: string[]) => void
  setViewMode: (mode: 'grid' | 'list' | 'kanban') => void
  setGroupBy: (groupBy: 'none' | 'type' | 'vault' | 'owner' | 'date') => void
  clearSelection: () => void
  reset: () => void
}

// Data interfaces
export interface CreateAssetData {
  filename: string
  file_type: string
  file_size: number
  file_url: string
  organization_id: string
  vault_id?: string
  description?: string
  tags?: string[]
}

export interface UpdateAssetData {
  filename?: string
  description?: string
  tags?: string[]
  vault_id?: string
}

export interface CreateShareData {
  share_type: 'public' | 'private' | 'organization' | 'vault'
  permissions: ('read' | 'write' | 'comment' | 'download')[]
  expires_at?: string
  password?: string
  shared_with?: string
}

export interface UpdateShareData {
  permissions?: ('read' | 'write' | 'comment' | 'download')[]
  expires_at?: string
  password?: string
}

export interface CreateAnnotationData {
  page_number?: number
  position: {
    x: number
    y: number
    width?: number
    height?: number
  }
  content: string
  type: 'text' | 'highlight' | 'drawing' | 'note'
  color?: string
}

export interface UpdateAnnotationData {
  content?: string
  position?: {
    x: number
    y: number
    width?: number
    height?: number
  }
  color?: string
}

// Initial state values
const initialFilters: FilterState = {
  search: '',
  type: undefined,
  tags: [],
  owners: []
}

const initialSort: SortState = {
  field: 'updated_at',
  direction: 'desc'
}

const initialPagination: PaginationState = {
  page: 1,
  limit: 50,
  total: 0,
  hasMore: false
}

// Helper functions
const generateUploadId = () => `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Create the asset store
export const assetStore = createStore<AssetState>(
  (set, get) => ({
    // Initial state
    assets: [],
    currentAsset: null,
    uploads: [],
    shares: [],
    annotations: [],
    versions: [],
    loading: {},
    errors: {},
    filters: initialFilters,
    sort: initialSort,
    pagination: initialPagination,
    selectedAssetIds: [],
    viewMode: 'grid',
    groupBy: 'none',

    // Fetch assets
    fetchAssets: async (organizationId?: string, vaultId?: string) => {
      const currentOrg = organizationId || organizationStore.getState().currentOrganization?.id
      if (!currentOrg) return

      set(draft => {
        draft.loading.fetchAssets = true
        draft.errors.fetchAssets = null
      })

      try {
        const params = new URLSearchParams({
          organizationId: currentOrg,
          page: get().pagination.page.toString(),
          limit: get().pagination.limit.toString()
        })

        if (vaultId) params.set('vaultId', vaultId)
        if (get().filters.search) params.set('search', get().filters.search)
        if (get().filters.type) params.set('type', get().filters.type)
        if (get().sort.field) {
          params.set('sortField', get().sort.field)
          params.set('sortDirection', get().sort.direction)
        }

        const response = await apiClient.get<{
          success: boolean
          data: {
            assets: AssetWithMetadata[]
            pagination: PaginationState
          }
        }>(`/api/assets?${params}`)

        set(draft => {
          draft.assets = response.data.assets
          draft.pagination = response.data.pagination
          draft.loading.fetchAssets = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchAssets = false
          draft.errors.fetchAssets = error instanceof Error ? error.message : 'Failed to fetch assets'
        })
      }
    },

    // Fetch single asset
    fetchAsset: async (id: string) => {
      set(draft => {
        draft.loading.fetchAsset = true
        draft.errors.fetchAsset = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: AssetWithMetadata
        }>(`/api/assets/${id}`)

        set(draft => {
          draft.currentAsset = response.data
          draft.loading.fetchAsset = false
          
          // Update in assets list if it exists
          const index = draft.assets.findIndex(asset => asset.id === id)
          if (index >= 0) {
            draft.assets[index] = response.data
          }
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchAsset = false
          draft.errors.fetchAsset = error instanceof Error ? error.message : 'Failed to fetch asset'
        })
      }
    },

    // Create asset
    createAsset: async (data: CreateAssetData) => {
      set(draft => {
        draft.loading.createAsset = true
        draft.errors.createAsset = null
      })

      try {
        const response = await apiClient.post<{
          success: boolean
          data: AssetWithMetadata
        }>('/api/assets', data)

        const newAsset = response.data

        set(draft => {
          draft.assets.unshift(newAsset)
          draft.currentAsset = newAsset
          draft.loading.createAsset = false
        })

        return newAsset.id
      } catch (error) {
        set(draft => {
          draft.loading.createAsset = false
          draft.errors.createAsset = error instanceof Error ? error.message : 'Failed to create asset'
        })
        return null
      }
    },

    // Update asset
    updateAsset: async (id: string, data: UpdateAssetData) => {
      set(draft => {
        draft.loading.updateAsset = true
        draft.errors.updateAsset = null
      })

      try {
        const response = await apiClient.put<{
          success: boolean
          data: AssetWithMetadata
        }>(`/api/assets/${id}`, data)

        const updatedAsset = response.data

        set(draft => {
          // Update in assets list
          const index = draft.assets.findIndex(asset => asset.id === id)
          if (index >= 0) {
            draft.assets[index] = updatedAsset
          }
          
          // Update current asset if it matches
          if (draft.currentAsset?.id === id) {
            draft.currentAsset = updatedAsset
          }
          
          draft.loading.updateAsset = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.updateAsset = false
          draft.errors.updateAsset = error instanceof Error ? error.message : 'Failed to update asset'
        })
      }
    },

    // Delete asset
    deleteAsset: async (id: string) => {
      set(draft => {
        draft.loading.deleteAsset = true
        draft.errors.deleteAsset = null
      })

      try {
        await apiClient.delete(`/api/assets/${id}`)

        set(draft => {
          draft.assets = draft.assets.filter(asset => asset.id !== id)
          draft.selectedAssetIds = draft.selectedAssetIds.filter(assetId => assetId !== id)
          
          if (draft.currentAsset?.id === id) {
            draft.currentAsset = null
          }
          
          draft.loading.deleteAsset = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.deleteAsset = false
          draft.errors.deleteAsset = error instanceof Error ? error.message : 'Failed to delete asset'
        })
      }
    },

    // Duplicate asset
    duplicateAsset: async (id: string, name?: string) => {
      set(draft => {
        draft.loading.duplicateAsset = true
        draft.errors.duplicateAsset = null
      })

      try {
        const response = await apiClient.post<{
          success: boolean
          data: AssetWithMetadata
        }>(`/api/assets/${id}/duplicate`, { name })

        const duplicatedAsset = response.data

        set(draft => {
          // Insert after the original asset
          const index = draft.assets.findIndex(asset => asset.id === id)
          if (index >= 0) {
            draft.assets.splice(index + 1, 0, duplicatedAsset)
          } else {
            draft.assets.unshift(duplicatedAsset)
          }
          
          draft.loading.duplicateAsset = false
        })

        return duplicatedAsset.id
      } catch (error) {
        set(draft => {
          draft.loading.duplicateAsset = false
          draft.errors.duplicateAsset = error instanceof Error ? error.message : 'Failed to duplicate asset'
        })
        return null
      }
    },

    // Upload assets
    uploadAssets: async (files: File[], organizationId: string, vaultId?: string) => {
      const uploads: AssetUpload[] = files.map(file => ({
        id: generateUploadId(),
        file,
        filename: file.name,
        progress: 0,
        status: 'pending',
        organizationId,
        vaultId
      }))

      set(draft => {
        draft.uploads.push(...uploads)
      })

      // Process uploads concurrently
      const uploadPromises = uploads.map(async (upload) => {
        try {
          set(draft => {
            const index = draft.uploads.findIndex(u => u.id === upload.id)
            if (index >= 0) {
              draft.uploads[index].status = 'uploading'
            }
          })

          const formData = new FormData()
          formData.append('file', upload.file)
          formData.append('organizationId', organizationId)
          if (vaultId) formData.append('vaultId', vaultId)

          const response = await fetch('/api/assets/upload', {
            method: 'POST',
            body: formData,
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              set(draft => {
                const index = draft.uploads.findIndex(u => u.id === upload.id)
                if (index >= 0) {
                  draft.uploads[index].progress = progress
                }
              })
            }
          })

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`)
          }

          const result = await response.json()

          set(draft => {
            const index = draft.uploads.findIndex(u => u.id === upload.id)
            if (index >= 0) {
              draft.uploads[index].status = 'completed'
              draft.uploads[index].assetId = result.data.id
              draft.uploads[index].progress = 100
            }
            
            // Add to assets list
            draft.assets.unshift(result.data)
          })
        } catch (error) {
          set(draft => {
            const index = draft.uploads.findIndex(u => u.id === upload.id)
            if (index >= 0) {
              draft.uploads[index].status = 'failed'
              draft.uploads[index].error = error instanceof Error ? error.message : 'Upload failed'
            }
          })
        }
      })

      await Promise.all(uploadPromises)
    },

    // Resume upload
    resumeUpload: async (uploadId: string) => {
      const upload = get().uploads.find(u => u.id === uploadId)
      if (!upload || upload.status !== 'failed') return

      try {
        set(draft => {
          const index = draft.uploads.findIndex(u => u.id === uploadId)
          if (index >= 0) {
            draft.uploads[index].status = 'uploading'
            draft.uploads[index].error = undefined
          }
        })

        // Retry upload logic here
        await get().uploadAssets([upload.file], upload.organizationId!, upload.vaultId)
      } catch (error) {
        set(draft => {
          const index = draft.uploads.findIndex(u => u.id === uploadId)
          if (index >= 0) {
            draft.uploads[index].status = 'failed'
            draft.uploads[index].error = error instanceof Error ? error.message : 'Upload failed'
          }
        })
      }
    },

    // Cancel upload
    cancelUpload: (uploadId: string) => {
      set(draft => {
        draft.uploads = draft.uploads.filter(u => u.id !== uploadId)
      })
    },

    // Retry upload
    retryUpload: async (uploadId: string) => {
      await get().resumeUpload(uploadId)
    },

    // Download asset
    downloadAsset: async (id: string) => {
      set(draft => {
        draft.loading.downloadAsset = true
        draft.errors.downloadAsset = null
      })

      try {
        const response = await apiClient.get(`/api/assets/${id}/download`, {
          responseType: 'blob'
        })

        // Create download link
        const blob = new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        const asset = get().assets.find(a => a.id === id) || get().currentAsset
        link.download = asset?.filename || 'download'
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        set(draft => {
          draft.loading.downloadAsset = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.downloadAsset = false
          draft.errors.downloadAsset = error instanceof Error ? error.message : 'Failed to download asset'
        })
      }
    },

    // Share asset
    shareAsset: async (assetId: string, shareData: CreateShareData) => {
      set(draft => {
        draft.loading.shareAsset = true
        draft.errors.shareAsset = null
      })

      try {
        const response = await apiClient.post<{
          success: boolean
          data: AssetShare
        }>(`/api/assets/${assetId}/shares`, shareData)

        const newShare = response.data

        set(draft => {
          draft.shares.unshift(newShare)
          draft.loading.shareAsset = false
        })

        return newShare.id
      } catch (error) {
        set(draft => {
          draft.loading.shareAsset = false
          draft.errors.shareAsset = error instanceof Error ? error.message : 'Failed to share asset'
        })
        return null
      }
    },

    // Update share
    updateShare: async (shareId: string, data: UpdateShareData) => {
      set(draft => {
        draft.loading.updateShare = true
        draft.errors.updateShare = null
      })

      try {
        const response = await apiClient.put<{
          success: boolean
          data: AssetShare
        }>(`/api/assets/shares/${shareId}`, data)

        const updatedShare = response.data

        set(draft => {
          const index = draft.shares.findIndex(share => share.id === shareId)
          if (index >= 0) {
            draft.shares[index] = updatedShare
          }
          draft.loading.updateShare = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.updateShare = false
          draft.errors.updateShare = error instanceof Error ? error.message : 'Failed to update share'
        })
      }
    },

    // Revoke share
    revokeShare: async (shareId: string) => {
      set(draft => {
        draft.loading.revokeShare = true
        draft.errors.revokeShare = null
      })

      try {
        await apiClient.delete(`/api/assets/shares/${shareId}`)

        set(draft => {
          draft.shares = draft.shares.filter(share => share.id !== shareId)
          draft.loading.revokeShare = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.revokeShare = false
          draft.errors.revokeShare = error instanceof Error ? error.message : 'Failed to revoke share'
        })
      }
    },

    // Fetch shares
    fetchShares: async (assetId: string) => {
      set(draft => {
        draft.loading.fetchShares = true
        draft.errors.fetchShares = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: { shares: AssetShare[] }
        }>(`/api/assets/${assetId}/shares`)

        set(draft => {
          draft.shares = response.data.shares
          draft.loading.fetchShares = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchShares = false
          draft.errors.fetchShares = error instanceof Error ? error.message : 'Failed to fetch shares'
        })
      }
    },

    // Fetch annotations
    fetchAnnotations: async (assetId: string) => {
      set(draft => {
        draft.loading.fetchAnnotations = true
        draft.errors.fetchAnnotations = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: { annotations: AssetAnnotation[] }
        }>(`/api/assets/${assetId}/annotations`)

        set(draft => {
          draft.annotations = response.data.annotations
          draft.loading.fetchAnnotations = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchAnnotations = false
          draft.errors.fetchAnnotations = error instanceof Error ? error.message : 'Failed to fetch annotations'
        })
      }
    },

    // Create annotation
    createAnnotation: async (assetId: string, annotation: CreateAnnotationData) => {
      set(draft => {
        draft.loading.createAnnotation = true
        draft.errors.createAnnotation = null
      })

      try {
        const response = await apiClient.post<{
          success: boolean
          data: AssetAnnotation
        }>(`/api/assets/${assetId}/annotations`, annotation)

        const newAnnotation = response.data

        set(draft => {
          draft.annotations.unshift(newAnnotation)
          draft.loading.createAnnotation = false
        })

        return newAnnotation.id
      } catch (error) {
        set(draft => {
          draft.loading.createAnnotation = false
          draft.errors.createAnnotation = error instanceof Error ? error.message : 'Failed to create annotation'
        })
        return null
      }
    },

    // Update annotation
    updateAnnotation: async (annotationId: string, data: UpdateAnnotationData) => {
      set(draft => {
        draft.loading.updateAnnotation = true
        draft.errors.updateAnnotation = null
      })

      try {
        const response = await apiClient.put<{
          success: boolean
          data: AssetAnnotation
        }>(`/api/assets/annotations/${annotationId}`, data)

        const updatedAnnotation = response.data

        set(draft => {
          const index = draft.annotations.findIndex(ann => ann.id === annotationId)
          if (index >= 0) {
            draft.annotations[index] = updatedAnnotation
          }
          draft.loading.updateAnnotation = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.updateAnnotation = false
          draft.errors.updateAnnotation = error instanceof Error ? error.message : 'Failed to update annotation'
        })
      }
    },

    // Delete annotation
    deleteAnnotation: async (annotationId: string) => {
      set(draft => {
        draft.loading.deleteAnnotation = true
        draft.errors.deleteAnnotation = null
      })

      try {
        await apiClient.delete(`/api/assets/annotations/${annotationId}`)

        set(draft => {
          draft.annotations = draft.annotations.filter(ann => ann.id !== annotationId)
          draft.loading.deleteAnnotation = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.deleteAnnotation = false
          draft.errors.deleteAnnotation = error instanceof Error ? error.message : 'Failed to delete annotation'
        })
      }
    },

    // Reply to annotation
    replyToAnnotation: async (annotationId: string, content: string) => {
      set(draft => {
        draft.loading.replyToAnnotation = true
        draft.errors.replyToAnnotation = null
      })

      try {
        const response = await apiClient.post<{
          success: boolean
          data: AssetAnnotation
        }>(`/api/assets/annotations/${annotationId}/replies`, { content })

        const reply = response.data

        set(draft => {
          const index = draft.annotations.findIndex(ann => ann.id === annotationId)
          if (index >= 0) {
            if (!draft.annotations[index].replies) {
              draft.annotations[index].replies = []
            }
            draft.annotations[index].replies!.push(reply)
          }
          draft.loading.replyToAnnotation = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.replyToAnnotation = false
          draft.errors.replyToAnnotation = error instanceof Error ? error.message : 'Failed to reply to annotation'
        })
      }
    },

    // Fetch versions
    fetchVersions: async (assetId: string) => {
      set(draft => {
        draft.loading.fetchVersions = true
        draft.errors.fetchVersions = null
      })

      try {
        const response = await apiClient.get<{
          success: boolean
          data: { versions: AssetVersion[] }
        }>(`/api/assets/${assetId}/versions`)

        set(draft => {
          draft.versions = response.data.versions
          draft.loading.fetchVersions = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchVersions = false
          draft.errors.fetchVersions = error instanceof Error ? error.message : 'Failed to fetch versions'
        })
      }
    },

    // Create version
    createVersion: async (assetId: string, file: File, changelog?: string) => {
      set(draft => {
        draft.loading.createVersion = true
        draft.errors.createVersion = null
      })

      try {
        const formData = new FormData()
        formData.append('file', file)
        if (changelog) formData.append('changelog', changelog)

        const response = await fetch(`/api/assets/${assetId}/versions`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error(`Version creation failed: ${response.statusText}`)
        }

        const result = await response.json()
        const newVersion = result.data

        set(draft => {
          draft.versions.unshift(newVersion)
          draft.loading.createVersion = false
        })

        return newVersion.id
      } catch (error) {
        set(draft => {
          draft.loading.createVersion = false
          draft.errors.createVersion = error instanceof Error ? error.message : 'Failed to create version'
        })
        return null
      }
    },

    // Restore version
    restoreVersion: async (versionId: string) => {
      set(draft => {
        draft.loading.restoreVersion = true
        draft.errors.restoreVersion = null
      })

      try {
        const response = await apiClient.post<{
          success: boolean
          data: AssetVersion
        }>(`/api/assets/versions/${versionId}/restore`)

        const restoredVersion = response.data

        set(draft => {
          // Update versions list
          draft.versions = draft.versions.map(v => ({
            ...v,
            is_current: v.id === versionId
          }))
          
          draft.loading.restoreVersion = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.restoreVersion = false
          draft.errors.restoreVersion = error instanceof Error ? error.message : 'Failed to restore version'
        })
      }
    },

    // Delete version
    deleteVersion: async (versionId: string) => {
      set(draft => {
        draft.loading.deleteVersion = true
        draft.errors.deleteVersion = null
      })

      try {
        await apiClient.delete(`/api/assets/versions/${versionId}`)

        set(draft => {
          draft.versions = draft.versions.filter(v => v.id !== versionId)
          draft.loading.deleteVersion = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.deleteVersion = false
          draft.errors.deleteVersion = error instanceof Error ? error.message : 'Failed to delete version'
        })
      }
    },

    // Utility actions
    setCurrentAsset: (asset: AssetWithMetadata | null) => {
      set(draft => {
        draft.currentAsset = asset
      })
    },

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

    setSelectedAssets: (assetIds: string[]) => {
      set(draft => {
        draft.selectedAssetIds = assetIds
      })
    },

    setViewMode: (mode: 'grid' | 'list' | 'kanban') => {
      set(draft => {
        draft.viewMode = mode
      })
    },

    setGroupBy: (groupBy: 'none' | 'type' | 'vault' | 'owner' | 'date') => {
      set(draft => {
        draft.groupBy = groupBy
      })
    },

    clearSelection: () => {
      set(draft => {
        draft.selectedAssetIds = []
      })
    },

    reset: () => {
      set(draft => {
        draft.assets = []
        draft.currentAsset = null
        draft.uploads = []
        draft.shares = []
        draft.annotations = []
        draft.versions = []
        draft.loading = {}
        draft.errors = {}
        draft.filters = initialFilters
        draft.sort = initialSort
        draft.pagination = initialPagination
        draft.selectedAssetIds = []
        draft.viewMode = 'grid'
        draft.groupBy = 'none'
      })
    },

    _meta: {
      version: 1,
      lastUpdated: Date.now(),
      hydrated: false
    }
  }),
  {
    name: 'asset',
    version: 1,
    partialize: (state) => ({
      viewMode: state.viewMode,
      groupBy: state.groupBy,
      filters: state.filters,
      sort: state.sort,
      _meta: state._meta
    })
  }
)

// Create selectors
export const assetSelectors = createSelectors(assetStore)

// Utility hooks
export const useAssets = () => assetStore(state => state.assets)
export const useCurrentAsset = () => assetStore(state => state.currentAsset)
export const useAssetUploads = () => assetStore(state => state.uploads)
export const useAssetShares = () => assetStore(state => state.shares)
export const useAssetAnnotations = () => assetStore(state => state.annotations)
export const useAssetVersions = () => assetStore(state => state.versions)
export const useAssetLoading = () => assetStore(state => state.loading)
export const useAssetErrors = () => assetStore(state => state.errors)
export const useAssetSelection = () => assetStore(state => state.selectedAssetIds)
export const useAssetViewMode = () => assetStore(state => state.viewMode)