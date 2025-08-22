'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'

// Types for document viewer state
export interface DocumentAnnotation {
  id: string
  type: 'comment' | 'question' | 'note' | 'voice'
  content: string
  voiceUrl?: string
  sectionReference: {
    page: number
    coordinates?: { x: number; y: number; width: number; height: number }
    text?: string
  }
  userId: string
  userName: string
  createdAt: string
  updatedAt: string
  isShared: boolean
  sharedWith: string[] // user IDs
  replies?: DocumentAnnotation[]
}

export interface TableOfContentsItem {
  id: string
  title: string
  page: number
  level: number
  children?: TableOfContentsItem[]
}

export interface DocumentSummary {
  id: string
  title: string
  keyPoints: string[]
  generatedAt: string
  wordCount: number
}

export interface DocumentPodcast {
  id: string
  title: string
  duration: number
  audioUrl: string
  transcript: string
  generatedAt: string
}

export interface DocumentSearchResult {
  page: number
  text: string
  context: string
  coordinates: { x: number; y: number; width: number; height: number }
}

export interface DocumentState {
  // Document metadata
  assetId: string
  assetUrl: string
  assetName: string
  assetType: string
  totalPages: number
  
  // Current view state
  currentPage: number
  zoom: number
  isFullscreen: boolean
  rightPanelOpen: boolean
  activeTab: 'toc' | 'annotations' | 'search' | 'ai-chat' | 'quick-actions'
  
  // Content state
  tableOfContents: TableOfContentsItem[]
  annotations: DocumentAnnotation[]
  searchResults: DocumentSearchResult[]
  searchQuery: string
  selectedAnnotation: string | null
  
  // AI-generated content
  summary: DocumentSummary | null
  podcast: DocumentPodcast | null
  
  // Loading states
  isLoadingToc: boolean
  isLoadingSummary: boolean
  isLoadingPodcast: boolean
  isSearching: boolean
  isGeneratingAnnotation: boolean
  
  // Error states
  error: string | null
  
  // Collaboration
  collaborators: Array<{ id: string; name: string; avatar?: string; isOnline: boolean }>
  realTimeAnnotations: DocumentAnnotation[]
}

type DocumentAction =
  | { type: 'SET_ASSET'; payload: { id: string; url: string; name: string; type: string; totalPages: number } }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'TOGGLE_RIGHT_PANEL' }
  | { type: 'SET_ACTIVE_TAB'; payload: DocumentState['activeTab'] }
  | { type: 'SET_TOC'; payload: TableOfContentsItem[] }
  | { type: 'SET_TOC_LOADING'; payload: boolean }
  | { type: 'SET_ANNOTATIONS'; payload: DocumentAnnotation[] }
  | { type: 'ADD_ANNOTATION'; payload: DocumentAnnotation }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; annotation: Partial<DocumentAnnotation> } }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'SELECT_ANNOTATION'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: DocumentSearchResult[] }
  | { type: 'SET_SEARCHING'; payload: boolean }
  | { type: 'SET_SUMMARY'; payload: DocumentSummary | null }
  | { type: 'SET_PODCAST'; payload: DocumentPodcast | null }
  | { type: 'SET_LOADING_SUMMARY'; payload: boolean }
  | { type: 'SET_LOADING_PODCAST'; payload: boolean }
  | { type: 'SET_GENERATING_ANNOTATION'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_COLLABORATORS'; payload: DocumentState['collaborators'] }
  | { type: 'ADD_REAL_TIME_ANNOTATION'; payload: DocumentAnnotation }
  | { type: 'REMOVE_REAL_TIME_ANNOTATION'; payload: string }

const initialState: DocumentState = {
  assetId: '',
  assetUrl: '',
  assetName: '',
  assetType: '',
  totalPages: 0,
  currentPage: 1,
  zoom: 1,
  isFullscreen: false,
  rightPanelOpen: true,
  activeTab: 'toc',
  tableOfContents: [],
  annotations: [],
  searchResults: [],
  searchQuery: '',
  selectedAnnotation: null,
  summary: null,
  podcast: null,
  isLoadingToc: false,
  isLoadingSummary: false,
  isLoadingPodcast: false,
  isSearching: false,
  isGeneratingAnnotation: false,
  error: null,
  collaborators: [],
  realTimeAnnotations: []
}

function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
  switch (action.type) {
    case 'SET_ASSET':
      return {
        ...state,
        assetId: action.payload.id,
        assetUrl: action.payload.url,
        assetName: action.payload.name,
        assetType: action.payload.type,
        totalPages: action.payload.totalPages
      }
    
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload }
    
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload }
    
    case 'TOGGLE_FULLSCREEN':
      return { ...state, isFullscreen: !state.isFullscreen }
    
    case 'TOGGLE_RIGHT_PANEL':
      return { ...state, rightPanelOpen: !state.rightPanelOpen }
    
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload }
    
    case 'SET_TOC':
      return { ...state, tableOfContents: action.payload, isLoadingToc: false }
    
    case 'SET_TOC_LOADING':
      return { ...state, isLoadingToc: action.payload }
    
    case 'SET_ANNOTATIONS':
      return { ...state, annotations: action.payload }
    
    case 'ADD_ANNOTATION':
      return { 
        ...state, 
        annotations: [...state.annotations, action.payload],
        isGeneratingAnnotation: false
      }
    
    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map(annotation =>
          annotation.id === action.payload.id
            ? { ...annotation, ...action.payload.annotation }
            : annotation
        )
      }
    
    case 'DELETE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter(annotation => annotation.id !== action.payload),
        selectedAnnotation: state.selectedAnnotation === action.payload ? null : state.selectedAnnotation
      }
    
    case 'SELECT_ANNOTATION':
      return { ...state, selectedAnnotation: action.payload }
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload, isSearching: false }
    
    case 'SET_SEARCHING':
      return { ...state, isSearching: action.payload }
    
    case 'SET_SUMMARY':
      return { ...state, summary: action.payload, isLoadingSummary: false }
    
    case 'SET_PODCAST':
      return { ...state, podcast: action.payload, isLoadingPodcast: false }
    
    case 'SET_LOADING_SUMMARY':
      return { ...state, isLoadingSummary: action.payload }
    
    case 'SET_LOADING_PODCAST':
      return { ...state, isLoadingPodcast: action.payload }
    
    case 'SET_GENERATING_ANNOTATION':
      return { ...state, isGeneratingAnnotation: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'SET_COLLABORATORS':
      return { ...state, collaborators: action.payload }
    
    case 'ADD_REAL_TIME_ANNOTATION':
      return {
        ...state,
        realTimeAnnotations: [...state.realTimeAnnotations, action.payload]
      }
    
    case 'REMOVE_REAL_TIME_ANNOTATION':
      return {
        ...state,
        realTimeAnnotations: state.realTimeAnnotations.filter(annotation => annotation.id !== action.payload)
      }
    
    default:
      return state
  }
}

// Context
export const DocumentContext = createContext<{
  state: DocumentState
  dispatch: React.Dispatch<DocumentAction>
  actions: {
    // Navigation actions
    goToPage: (page: number) => void
    setZoom: (zoom: number) => void
    toggleFullscreen: () => void
    toggleRightPanel: () => void
    setActiveTab: (tab: DocumentState['activeTab']) => void
    
    // Content actions
    loadTableOfContents: () => Promise<void>
    searchInDocument: (query: string) => Promise<void>
    generateSummary: () => Promise<void>
    generatePodcast: () => Promise<void>
    
    // Annotation actions
    addAnnotation: (annotation: Omit<DocumentAnnotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
    updateAnnotation: (id: string, updates: Partial<DocumentAnnotation>) => Promise<void>
    deleteAnnotation: (id: string) => Promise<void>
    selectAnnotation: (id: string | null) => void
    
    // Error handling
    clearError: () => void
  }
} | undefined>(undefined)

// Provider component
interface DocumentContextProviderProps {
  children: ReactNode
  assetId: string
  assetUrl: string
  assetName: string
  assetType: string
}

export function DocumentContextProvider({ 
  children, 
  assetId, 
  assetUrl, 
  assetName, 
  assetType 
}: DocumentContextProviderProps) {
  const [state, dispatch] = useReducer(documentReducer, initialState)

  // Initialize asset data
  useEffect(() => {
    dispatch({
      type: 'SET_ASSET',
      payload: { id: assetId, url: assetUrl, name: assetName, type: assetType, totalPages: 0 }
    })
    
    // Load annotations when asset is set
    loadAnnotations()
  }, [assetId, assetUrl, assetName, assetType])

  // Load annotations from API
  const loadAnnotations = async () => {
    try {
      const response = await fetch(`/api/assets/${assetId}/annotations`)
      if (!response.ok) {
        console.warn('Failed to load annotations:', response.statusText)
        return
      }
      const data = await response.json()
      
      // Transform API annotations to DocumentAnnotation format
      const transformedAnnotations: DocumentAnnotation[] = (data.annotations || []).map((annotation: any) => ({
        id: annotation.id,
        type: mapAnnotationType(annotation.annotation_type),
        content: annotation.comment_text || annotation.content?.text || '',
        sectionReference: {
          page: annotation.page_number,
          coordinates: annotation.position?.boundingRect ? {
            x: annotation.position.boundingRect.x1,
            y: annotation.position.boundingRect.y1,
            width: annotation.position.boundingRect.width,
            height: annotation.position.boundingRect.height
          } : { x: 100, y: 100, width: 200, height: 50 },
          text: annotation.selected_text
        },
        userId: annotation.created_by,
        userName: annotation.user?.full_name || 'Unknown User',
        createdAt: annotation.created_at,
        updatedAt: annotation.updated_at || annotation.created_at,
        isShared: !annotation.is_private,
        sharedWith: [],
        replies: (annotation.replies || []).map((reply: any) => ({
          id: reply.id,
          type: 'comment' as const,
          content: reply.reply_text,
          sectionReference: { page: annotation.page_number },
          userId: reply.created_by,
          userName: reply.user?.full_name || 'Unknown User',
          createdAt: reply.created_at,
          updatedAt: reply.created_at,
          isShared: false,
          sharedWith: []
        }))
      }))
      
      // Clear existing annotations and set new ones
      dispatch({ type: 'SET_ANNOTATIONS', payload: transformedAnnotations })
      
    } catch (error) {
      console.error('Error loading annotations:', error)
    }
  }

  // Helper function to map API annotation types to DocumentAnnotation types
  const mapAnnotationType = (apiType: string): DocumentAnnotation['type'] => {
    switch (apiType) {
      case 'textbox': return 'note'
      case 'stamp': return 'comment'
      default: return 'comment'
    }
  }

  // Helper function to map DocumentAnnotation types to API annotation types
  const mapToApiAnnotationType = (docType: DocumentAnnotation['type']): string => {
    switch (docType) {
      case 'note': return 'textbox'
      case 'comment': return 'area'
      case 'question': return 'area'
      case 'voice': return 'stamp'
      default: return 'textbox'
    }
  }

  // Actions
  const actions = {
    // Navigation actions
    goToPage: (page: number) => {
      dispatch({ type: 'SET_CURRENT_PAGE', payload: page })
    },

    setZoom: (zoom: number) => {
      dispatch({ type: 'SET_ZOOM', payload: zoom })
    },

    toggleFullscreen: () => {
      dispatch({ type: 'TOGGLE_FULLSCREEN' })
    },

    toggleRightPanel: () => {
      dispatch({ type: 'TOGGLE_RIGHT_PANEL' })
    },

    setActiveTab: (tab: DocumentState['activeTab']) => {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: tab })
    },

    // Content actions
    loadTableOfContents: async () => {
      dispatch({ type: 'SET_TOC_LOADING', payload: true })
      try {
        const response = await fetch(`/api/documents/${assetId}/toc`)
        if (!response.ok) throw new Error('Failed to load table of contents')
        const toc = await response.json()
        dispatch({ type: 'SET_TOC', payload: toc })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load table of contents' })
        dispatch({ type: 'SET_TOC_LOADING', payload: false })
      }
    },

    searchInDocument: async (query: string) => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: query })
      if (!query.trim()) {
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] })
        return
      }

      dispatch({ type: 'SET_SEARCHING', payload: true })
      try {
        const response = await fetch(`/api/documents/${assetId}/search?q=${encodeURIComponent(query)}`)
        if (!response.ok) throw new Error('Failed to search document')
        const results = await response.json()
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: results })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Search failed' })
        dispatch({ type: 'SET_SEARCHING', payload: false })
      }
    },

    generateSummary: async () => {
      dispatch({ type: 'SET_LOADING_SUMMARY', payload: true })
      try {
        const response = await fetch(`/api/documents/${assetId}/summary`, { method: 'POST' })
        if (!response.ok) throw new Error('Failed to generate summary')
        const summary = await response.json()
        dispatch({ type: 'SET_SUMMARY', payload: summary })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to generate summary' })
        dispatch({ type: 'SET_LOADING_SUMMARY', payload: false })
      }
    },

    generatePodcast: async () => {
      dispatch({ type: 'SET_LOADING_PODCAST', payload: true })
      try {
        const response = await fetch(`/api/documents/${assetId}/podcast`, { method: 'POST' })
        if (!response.ok) throw new Error('Failed to generate podcast')
        const podcast = await response.json()
        dispatch({ type: 'SET_PODCAST', payload: podcast })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to generate podcast' })
        dispatch({ type: 'SET_LOADING_PODCAST', payload: false })
      }
    },

    // Annotation actions
    addAnnotation: async (annotation: Omit<DocumentAnnotation, 'id' | 'createdAt' | 'updatedAt'>) => {
      dispatch({ type: 'SET_GENERATING_ANNOTATION', payload: true })
      try {
        // Transform DocumentAnnotation to API format
        const apiAnnotation = {
          annotation_type: mapToApiAnnotationType(annotation.type),
          content: {
            text: annotation.content
          },
          page_number: annotation.sectionReference.page,
          position: {
            pageNumber: annotation.sectionReference.page,
            rects: [{
              x1: annotation.sectionReference.coordinates?.x || 100,
              y1: annotation.sectionReference.coordinates?.y || 100,
              x2: (annotation.sectionReference.coordinates?.x || 100) + (annotation.sectionReference.coordinates?.width || 200),
              y2: (annotation.sectionReference.coordinates?.y || 100) + (annotation.sectionReference.coordinates?.height || 50),
              width: annotation.sectionReference.coordinates?.width || 200,
              height: annotation.sectionReference.coordinates?.height || 50,
            }],
            boundingRect: {
              x1: annotation.sectionReference.coordinates?.x || 100,
              y1: annotation.sectionReference.coordinates?.y || 100,
              x2: (annotation.sectionReference.coordinates?.x || 100) + (annotation.sectionReference.coordinates?.width || 200),
              y2: (annotation.sectionReference.coordinates?.y || 100) + (annotation.sectionReference.coordinates?.height || 50),
              width: annotation.sectionReference.coordinates?.width || 200,
              height: annotation.sectionReference.coordinates?.height || 50,
            }
          },
          selected_text: annotation.sectionReference.text,
          comment_text: annotation.content,
          color: '#FFFF00',
          opacity: 0.3,
          is_private: !annotation.isShared
        }

        const response = await fetch(`/api/assets/${assetId}/annotations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiAnnotation)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create annotation')
        }
        
        const data = await response.json()
        const newApiAnnotation = data.annotation
        
        // Transform back to DocumentAnnotation format
        const newAnnotation: DocumentAnnotation = {
          id: newApiAnnotation.id,
          type: mapAnnotationType(newApiAnnotation.annotation_type),
          content: newApiAnnotation.comment_text || newApiAnnotation.content?.text || '',
          sectionReference: {
            page: newApiAnnotation.page_number,
            coordinates: newApiAnnotation.position?.boundingRect ? {
              x: newApiAnnotation.position.boundingRect.x1,
              y: newApiAnnotation.position.boundingRect.y1,
              width: newApiAnnotation.position.boundingRect.width,
              height: newApiAnnotation.position.boundingRect.height
            } : annotation.sectionReference.coordinates,
            text: newApiAnnotation.selected_text
          },
          userId: newApiAnnotation.created_by,
          userName: newApiAnnotation.user?.full_name || 'Current User',
          createdAt: newApiAnnotation.created_at,
          updatedAt: newApiAnnotation.created_at,
          isShared: !newApiAnnotation.is_private,
          sharedWith: [],
          replies: []
        }
        
        dispatch({ type: 'ADD_ANNOTATION', payload: newAnnotation })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create annotation' })
        dispatch({ type: 'SET_GENERATING_ANNOTATION', payload: false })
      }
    },

    updateAnnotation: async (id: string, updates: Partial<DocumentAnnotation>) => {
      try {
        const response = await fetch(`/api/assets/${assetId}/annotations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
        if (!response.ok) throw new Error('Failed to update annotation')
        const updatedAnnotation = await response.json()
        dispatch({ type: 'UPDATE_ANNOTATION', payload: { id, annotation: updatedAnnotation } })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update annotation' })
      }
    },

    deleteAnnotation: async (id: string) => {
      try {
        const response = await fetch(`/api/assets/${assetId}/annotations/${id}`, {
          method: 'DELETE'
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete annotation')
        }
        dispatch({ type: 'DELETE_ANNOTATION', payload: id })
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete annotation' })
      }
    },

    selectAnnotation: (id: string | null) => {
      dispatch({ type: 'SELECT_ANNOTATION', payload: id })
    },

    clearError: () => {
      dispatch({ type: 'SET_ERROR', payload: null })
    }
  }

  return (
    <DocumentContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </DocumentContext.Provider>
  )
}

// Hook to use document context
export function useDocumentContext() {
  const context = useContext(DocumentContext)
  if (context === undefined) {
    throw new Error('useDocumentContext must be used within a DocumentContextProvider')
  }
  return context
}

// Hook for specific parts of state to optimize re-renders
export function useDocumentState<T>(selector: (state: DocumentState) => T): T {
  const { state } = useDocumentContext()
  return selector(state)
}

export function useDocumentActions() {
  const { actions } = useDocumentContext()
  return actions
}