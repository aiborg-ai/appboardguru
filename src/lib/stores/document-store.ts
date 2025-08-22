import { createStore, createSelectors } from './store-config'
import { LoadingState, ErrorState, StoreSlice } from './types'
import { 
  DocumentAnnotation, 
  DocumentTableOfContents, 
  DocumentSummary, 
  DocumentPodcast,
  DocumentSearchResult,
  DocumentMetadata,
  DocumentId,
  createDocumentId
} from '../repositories/document.repository'

// Document viewer state interfaces
export interface DocumentCollaborator {
  id: string
  name: string
  avatar?: string
  isOnline: boolean
  lastSeen?: string
  currentPage?: number
  cursor?: { x: number; y: number }
}

export interface DocumentViewSettings {
  zoom: number
  currentPage: number
  totalPages: number
  viewMode: 'single' | 'continuous' | 'facing'
  isFullscreen: boolean
  rightPanelOpen: boolean
  activeTab: 'toc' | 'annotations' | 'search' | 'ai-chat' | 'quick-actions'
}

export interface DocumentAIChat {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  context?: {
    pageNumber?: number
    selectedText?: string
    annotations?: string[]
  }
  isGenerating?: boolean
}

// Document store state
export interface DocumentState extends StoreSlice {
  // Document metadata
  currentDocument: DocumentMetadata | null
  
  // Content data
  annotations: DocumentAnnotation[]
  tableOfContents: DocumentTableOfContents[]
  summaries: DocumentSummary[]
  podcast: DocumentPodcast | null
  searchResults: DocumentSearchResult[]
  
  // View state
  viewSettings: DocumentViewSettings
  collaborators: DocumentCollaborator[]
  
  // UI state
  loading: LoadingState
  errors: ErrorState
  
  // AI Chat
  chatHistory: DocumentAIChat[]
  
  // Actions - Document loading
  loadDocument: (assetId: string) => Promise<void>
  unloadDocument: () => void
  
  // Actions - View controls
  setZoom: (zoom: number) => void
  setCurrentPage: (page: number) => void
  goToPage: (page: number) => void
  toggleFullscreen: () => void
  toggleRightPanel: () => void
  setActiveTab: (tab: 'toc' | 'annotations' | 'search' | 'ai-chat' | 'quick-actions') => void
  setViewMode: (mode: 'single' | 'continuous' | 'facing') => void
  
  // Actions - Content operations
  generateTableOfContents: () => Promise<void>
  generateSummary: (type: 'executive' | 'detailed' | 'bullet_points' | 'key_insights') => Promise<void>
  generatePodcast: () => Promise<void>
  
  // Actions - Annotations
  fetchAnnotations: () => Promise<void>
  createAnnotation: (data: {
    type: 'comment' | 'question' | 'note' | 'voice'
    content: string
    pageNumber?: number
    position?: { x: number; y: number; width?: number; height?: number }
    highlightedText?: string
    voiceUrl?: string
    isShared?: boolean
    sharedWith?: string[]
  }) => Promise<string | null>
  updateAnnotation: (id: string, data: {
    content?: string
    position?: { x: number; y: number; width?: number; height?: number }
    highlightedText?: string
    voiceUrl?: string
    isShared?: boolean
    sharedWith?: string[]
  }) => Promise<void>
  deleteAnnotation: (id: string) => Promise<void>
  shareAnnotation: (id: string, userIds: string[]) => Promise<void>
  
  // Actions - Search
  searchDocument: (query: string, options?: {
    caseSensitive?: boolean
    wholeWord?: boolean
    pageNumber?: number
  }) => Promise<void>
  clearSearch: () => void
  goToSearchResult: (resultIndex: number) => void
  
  // Actions - AI Chat
  sendChatMessage: (message: string, context?: {
    pageNumber?: number
    selectedText?: string
    annotations?: string[]
  }) => Promise<void>
  clearChatHistory: () => void
  
  // Actions - Collaboration
  updateCollaborator: (collaborator: DocumentCollaborator) => void
  removeCollaborator: (userId: string) => void
  
  // Actions - Utilities
  clearError: (key?: string) => void
  reset: () => void
}

// Initial view settings
const initialViewSettings: DocumentViewSettings = {
  zoom: 1.0,
  currentPage: 1,
  totalPages: 0,
  viewMode: 'single',
  isFullscreen: false,
  rightPanelOpen: true,
  activeTab: 'toc'
}

// Helper functions
const generateChatId = () => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Create the document store
export const documentStore = createStore<DocumentState>(
  (set, get) => ({
    // Initial state
    currentDocument: null,
    annotations: [],
    tableOfContents: [],
    summaries: [],
    podcast: null,
    searchResults: [],
    viewSettings: initialViewSettings,
    collaborators: [],
    loading: {},
    errors: {},
    chatHistory: [],

    // Load document
    loadDocument: async (assetId: string) => {
      set(draft => {
        draft.loading.loadDocument = true
        draft.errors.loadDocument = null
      })

      try {
        // Load document metadata
        const response = await fetch(`/api/documents/${assetId}`)
        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.statusText}`)
        }

        const result = await response.json()
        const documentData = result.data

        set(draft => {
          draft.currentDocument = {
            id: createDocumentId(documentData.id),
            assetId: documentData.assetId,
            filename: documentData.filename,
            fileType: documentData.fileType,
            fileSize: documentData.fileSize,
            fileUrl: documentData.fileUrl,
            totalPages: documentData.totalPages || 1,
            organizationId: documentData.organizationId,
            vaultId: documentData.vaultId,
            uploadedBy: documentData.uploadedBy,
            createdAt: documentData.createdAt,
            updatedAt: documentData.updatedAt
          }
          draft.viewSettings.totalPages = documentData.totalPages || 1
          draft.loading.loadDocument = false
        })

        // Load existing content in parallel
        await Promise.all([
          get().fetchAnnotations(),
          get().loadTableOfContents(),
          get().loadSummaries(),
          get().loadPodcast()
        ])

      } catch (error) {
        set(draft => {
          draft.loading.loadDocument = false
          draft.errors.loadDocument = error instanceof Error ? error.message : 'Failed to load document'
        })
      }
    },

    // Unload document
    unloadDocument: () => {
      set(draft => {
        draft.currentDocument = null
        draft.annotations = []
        draft.tableOfContents = []
        draft.summaries = []
        draft.podcast = null
        draft.searchResults = []
        draft.chatHistory = []
        draft.collaborators = []
        draft.viewSettings = initialViewSettings
        draft.loading = {}
        draft.errors = {}
      })
    },

    // View controls
    setZoom: (zoom: number) => {
      set(draft => {
        draft.viewSettings.zoom = Math.max(0.5, Math.min(3.0, zoom))
      })
    },

    setCurrentPage: (page: number) => {
      set(draft => {
        const { totalPages } = draft.viewSettings
        draft.viewSettings.currentPage = Math.max(1, Math.min(totalPages, page))
      })
    },

    goToPage: (page: number) => {
      get().setCurrentPage(page)
    },

    toggleFullscreen: () => {
      set(draft => {
        draft.viewSettings.isFullscreen = !draft.viewSettings.isFullscreen
      })
    },

    toggleRightPanel: () => {
      set(draft => {
        draft.viewSettings.rightPanelOpen = !draft.viewSettings.rightPanelOpen
      })
    },

    setActiveTab: (tab) => {
      set(draft => {
        draft.viewSettings.activeTab = tab
      })
    },

    setViewMode: (mode) => {
      set(draft => {
        draft.viewSettings.viewMode = mode
      })
    },

    // Content generation
    generateTableOfContents: async () => {
      const document = get().currentDocument
      if (!document) return

      set(draft => {
        draft.loading.generateToc = true
        draft.errors.generateToc = null
      })

      try {
        const response = await fetch(`/api/documents/${document.assetId}/toc`, {
          method: 'POST'
        })

        if (!response.ok) {
          throw new Error(`Failed to generate TOC: ${response.statusText}`)
        }

        const result = await response.json()

        set(draft => {
          draft.tableOfContents = result.data || []
          draft.loading.generateToc = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.generateToc = false
          draft.errors.generateToc = error instanceof Error ? error.message : 'Failed to generate TOC'
        })
      }
    },

    generateSummary: async (type) => {
      const document = get().currentDocument
      if (!document) return

      const loadingKey = `generateSummary_${type}`
      const errorKey = `generateSummary_${type}`

      set(draft => {
        draft.loading[loadingKey] = true
        draft.errors[errorKey] = null
      })

      try {
        const response = await fetch(`/api/documents/${document.assetId}/summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type })
        })

        if (!response.ok) {
          throw new Error(`Failed to generate summary: ${response.statusText}`)
        }

        const result = await response.json()

        set(draft => {
          // Add or update summary in the list
          const existingIndex = draft.summaries.findIndex(s => s.summaryType === type)
          if (existingIndex >= 0) {
            draft.summaries[existingIndex] = result.data
          } else {
            draft.summaries.unshift(result.data)
          }
          draft.loading[loadingKey] = false
        })
      } catch (error) {
        set(draft => {
          draft.loading[loadingKey] = false
          draft.errors[errorKey] = error instanceof Error ? error.message : 'Failed to generate summary'
        })
      }
    },

    generatePodcast: async () => {
      const document = get().currentDocument
      if (!document) return

      set(draft => {
        draft.loading.generatePodcast = true
        draft.errors.generatePodcast = null
      })

      try {
        const response = await fetch(`/api/documents/${document.assetId}/podcast`, {
          method: 'POST'
        })

        if (!response.ok) {
          throw new Error(`Failed to generate podcast: ${response.statusText}`)
        }

        const result = await response.json()

        set(draft => {
          draft.podcast = result.data
          draft.loading.generatePodcast = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.generatePodcast = false
          draft.errors.generatePodcast = error instanceof Error ? error.message : 'Failed to generate podcast'
        })
      }
    },

    // Annotations
    fetchAnnotations: async () => {
      const document = get().currentDocument
      if (!document) return

      set(draft => {
        draft.loading.fetchAnnotations = true
        draft.errors.fetchAnnotations = null
      })

      try {
        const response = await fetch(`/api/documents/${document.assetId}/annotations`)
        if (!response.ok) {
          throw new Error(`Failed to fetch annotations: ${response.statusText}`)
        }

        const result = await response.json()

        set(draft => {
          draft.annotations = result.data || []
          draft.loading.fetchAnnotations = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.fetchAnnotations = false
          draft.errors.fetchAnnotations = error instanceof Error ? error.message : 'Failed to fetch annotations'
        })
      }
    },

    createAnnotation: async (data) => {
      const document = get().currentDocument
      if (!document) return null

      set(draft => {
        draft.loading.createAnnotation = true
        draft.errors.createAnnotation = null
      })

      try {
        const response = await fetch(`/api/documents/${document.assetId}/annotations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: data.type,
            content: data.content,
            sectionReference: {
              page: data.pageNumber,
              coordinates: data.position,
              text: data.highlightedText
            },
            voiceUrl: data.voiceUrl,
            isShared: data.isShared || false,
            sharedWith: data.sharedWith || []
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to create annotation: ${response.statusText}`)
        }

        const result = await response.json()

        set(draft => {
          draft.annotations.unshift(result.data)
          draft.loading.createAnnotation = false
        })

        return result.data.id
      } catch (error) {
        set(draft => {
          draft.loading.createAnnotation = false
          draft.errors.createAnnotation = error instanceof Error ? error.message : 'Failed to create annotation'
        })
        return null
      }
    },

    updateAnnotation: async (id, data) => {
      set(draft => {
        draft.loading.updateAnnotation = true
        draft.errors.updateAnnotation = null
      })

      try {
        const response = await fetch(`/api/documents/annotations/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: data.content,
            sectionReference: data.position ? {
              coordinates: data.position,
              text: data.highlightedText
            } : undefined,
            voiceUrl: data.voiceUrl,
            isShared: data.isShared,
            sharedWith: data.sharedWith
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to update annotation: ${response.statusText}`)
        }

        const result = await response.json()

        set(draft => {
          const index = draft.annotations.findIndex(a => a.id === id)
          if (index >= 0) {
            draft.annotations[index] = result.data
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

    deleteAnnotation: async (id) => {
      set(draft => {
        draft.loading.deleteAnnotation = true
        draft.errors.deleteAnnotation = null
      })

      try {
        const response = await fetch(`/api/documents/annotations/${id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error(`Failed to delete annotation: ${response.statusText}`)
        }

        set(draft => {
          draft.annotations = draft.annotations.filter(a => a.id !== id)
          draft.loading.deleteAnnotation = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.deleteAnnotation = false
          draft.errors.deleteAnnotation = error instanceof Error ? error.message : 'Failed to delete annotation'
        })
      }
    },

    shareAnnotation: async (id, userIds) => {
      set(draft => {
        draft.loading.shareAnnotation = true
        draft.errors.shareAnnotation = null
      })

      try {
        const response = await fetch(`/api/documents/annotations/${id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds })
        })

        if (!response.ok) {
          throw new Error(`Failed to share annotation: ${response.statusText}`)
        }

        const result = await response.json()

        set(draft => {
          const index = draft.annotations.findIndex(a => a.id === id)
          if (index >= 0) {
            draft.annotations[index] = result.data
          }
          draft.loading.shareAnnotation = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.shareAnnotation = false
          draft.errors.shareAnnotation = error instanceof Error ? error.message : 'Failed to share annotation'
        })
      }
    },

    // Search
    searchDocument: async (query, options = {}) => {
      const document = get().currentDocument
      if (!document || !query.trim()) return

      set(draft => {
        draft.loading.searchDocument = true
        draft.errors.searchDocument = null
      })

      try {
        const params = new URLSearchParams({
          q: query,
          caseSensitive: options.caseSensitive ? 'true' : 'false',
          wholeWord: options.wholeWord ? 'true' : 'false'
        })

        if (options.pageNumber) {
          params.set('page', options.pageNumber.toString())
        }

        const response = await fetch(`/api/documents/${document.assetId}/search?${params}`)
        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`)
        }

        const result = await response.json()

        set(draft => {
          draft.searchResults = result.data || []
          draft.loading.searchDocument = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.searchDocument = false
          draft.errors.searchDocument = error instanceof Error ? error.message : 'Search failed'
        })
      }
    },

    clearSearch: () => {
      set(draft => {
        draft.searchResults = []
      })
    },

    goToSearchResult: (resultIndex) => {
      const result = get().searchResults[resultIndex]
      if (result) {
        get().goToPage(result.pageNumber)
      }
    },

    // AI Chat
    sendChatMessage: async (message, context) => {
      const document = get().currentDocument
      if (!document || !message.trim()) return

      const userMessage: DocumentAIChat = {
        id: generateChatId(),
        role: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString(),
        context
      }

      set(draft => {
        draft.chatHistory.push(userMessage)
        draft.loading.aiChat = true
        draft.errors.aiChat = null
      })

      try {
        const response = await fetch(`/api/documents/${document.assetId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.trim(),
            context,
            history: get().chatHistory.slice(-10) // Send last 10 messages for context
          })
        })

        if (!response.ok) {
          throw new Error(`Chat failed: ${response.statusText}`)
        }

        const result = await response.json()

        const assistantMessage: DocumentAIChat = {
          id: generateChatId(),
          role: 'assistant',
          content: result.data.message,
          timestamp: new Date().toISOString()
        }

        set(draft => {
          draft.chatHistory.push(assistantMessage)
          draft.loading.aiChat = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.aiChat = false
          draft.errors.aiChat = error instanceof Error ? error.message : 'Chat failed'
        })
      }
    },

    clearChatHistory: () => {
      set(draft => {
        draft.chatHistory = []
      })
    },

    // Collaboration
    updateCollaborator: (collaborator) => {
      set(draft => {
        const index = draft.collaborators.findIndex(c => c.id === collaborator.id)
        if (index >= 0) {
          draft.collaborators[index] = collaborator
        } else {
          draft.collaborators.push(collaborator)
        }
      })
    },

    removeCollaborator: (userId) => {
      set(draft => {
        draft.collaborators = draft.collaborators.filter(c => c.id !== userId)
      })
    },

    // Helper methods (need to be implemented)
    loadTableOfContents: async () => {
      const document = get().currentDocument
      if (!document) return

      try {
        const response = await fetch(`/api/documents/${document.assetId}/toc`)
        if (response.ok) {
          const result = await response.json()
          set(draft => {
            draft.tableOfContents = result.data || []
          })
        }
      } catch (error) {
        // Ignore errors for optional content
      }
    },

    loadSummaries: async () => {
      const document = get().currentDocument
      if (!document) return

      try {
        const response = await fetch(`/api/documents/${document.assetId}/summary`)
        if (response.ok) {
          const result = await response.json()
          set(draft => {
            draft.summaries = Array.isArray(result.data) ? result.data : []
          })
        }
      } catch (error) {
        // Ignore errors for optional content
      }
    },

    loadPodcast: async () => {
      const document = get().currentDocument
      if (!document) return

      try {
        const response = await fetch(`/api/documents/${document.assetId}/podcast`)
        if (response.ok) {
          const result = await response.json()
          set(draft => {
            draft.podcast = result.data || null
          })
        }
      } catch (error) {
        // Ignore errors for optional content
      }
    },

    // Utilities
    clearError: (key) => {
      set(draft => {
        if (key) {
          draft.errors[key] = null
        } else {
          draft.errors = {}
        }
      })
    },

    reset: () => {
      set(draft => {
        draft.currentDocument = null
        draft.annotations = []
        draft.tableOfContents = []
        draft.summaries = []
        draft.podcast = null
        draft.searchResults = []
        draft.chatHistory = []
        draft.collaborators = []
        draft.viewSettings = initialViewSettings
        draft.loading = {}
        draft.errors = {}
      })
    },

    _meta: {
      version: 1,
      lastUpdated: Date.now(),
      hydrated: false
    }
  }),
  {
    name: 'document',
    version: 1,
    storage: 'sessionStorage', // Use session storage for document state
    partialize: (state) => ({
      viewSettings: {
        zoom: state.viewSettings.zoom,
        viewMode: state.viewSettings.viewMode,
        rightPanelOpen: state.viewSettings.rightPanelOpen,
        activeTab: state.viewSettings.activeTab
      },
      _meta: state._meta
    })
  }
)

// Create selectors
export const documentSelectors = createSelectors(documentStore)

// Utility hooks
export const useCurrentDocument = () => documentStore(state => state.currentDocument)
export const useDocumentAnnotations = () => documentStore(state => state.annotations)
export const useDocumentToc = () => documentStore(state => state.tableOfContents)
export const useDocumentSummaries = () => documentStore(state => state.summaries)
export const useDocumentPodcast = () => documentStore(state => state.podcast)
export const useDocumentSearch = () => documentStore(state => state.searchResults)
export const useDocumentViewSettings = () => documentStore(state => state.viewSettings)
export const useDocumentCollaborators = () => documentStore(state => state.collaborators)
export const useDocumentChatHistory = () => documentStore(state => state.chatHistory)
export const useDocumentLoading = () => documentStore(state => state.loading)
export const useDocumentErrors = () => documentStore(state => state.errors)

// Action hooks
export const useDocumentActions = () => ({
  loadDocument: documentStore.getState().loadDocument,
  unloadDocument: documentStore.getState().unloadDocument,
  setZoom: documentStore.getState().setZoom,
  setCurrentPage: documentStore.getState().setCurrentPage,
  goToPage: documentStore.getState().goToPage,
  toggleFullscreen: documentStore.getState().toggleFullscreen,
  toggleRightPanel: documentStore.getState().toggleRightPanel,
  setActiveTab: documentStore.getState().setActiveTab,
  setViewMode: documentStore.getState().setViewMode,
  generateTableOfContents: documentStore.getState().generateTableOfContents,
  generateSummary: documentStore.getState().generateSummary,
  generatePodcast: documentStore.getState().generatePodcast,
  fetchAnnotations: documentStore.getState().fetchAnnotations,
  createAnnotation: documentStore.getState().createAnnotation,
  updateAnnotation: documentStore.getState().updateAnnotation,
  deleteAnnotation: documentStore.getState().deleteAnnotation,
  shareAnnotation: documentStore.getState().shareAnnotation,
  searchDocument: documentStore.getState().searchDocument,
  clearSearch: documentStore.getState().clearSearch,
  goToSearchResult: documentStore.getState().goToSearchResult,
  sendChatMessage: documentStore.getState().sendChatMessage,
  clearChatHistory: documentStore.getState().clearChatHistory,
  updateCollaborator: documentStore.getState().updateCollaborator,
  removeCollaborator: documentStore.getState().removeCollaborator,
  clearError: documentStore.getState().clearError,
  reset: documentStore.getState().reset
})