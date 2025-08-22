/**
 * Annotation Store
 * Zustand store for annotation state management following DDD patterns
 */

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { 
  AssetAnnotation, 
  AnnotationId, 
  AssetId, 
  CreateAnnotationRequest,
  UpdateAnnotationRequest,
  AnnotationEvent
} from '@/types/annotation-types'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// Loading states using discriminated unions
type LoadingState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; error: string }

interface AnnotationStoreState {
  // State properties
  annotations: Record<AssetId, AssetAnnotation[]>
  selectedAnnotationId: AnnotationId | null
  loadingStates: Record<string, LoadingState>
  realTimeEnabled: boolean
  supabaseChannel: any | null
  
  // Filter and display options
  filters: {
    pageNumber?: number
    annotationType?: string
    showPrivate: boolean
    showResolved: boolean
  }
  
  // UI state
  isCreatingAnnotation: boolean
  annotationMode: 'select' | 'highlight' | 'comment' | 'drawing'
  
  // Actions
  setAnnotations: (assetId: AssetId, annotations: AssetAnnotation[]) => void
  addAnnotation: (assetId: AssetId, annotation: AssetAnnotation) => void
  updateAnnotation: (assetId: AssetId, annotationId: AnnotationId, updates: Partial<AssetAnnotation>) => void
  removeAnnotation: (assetId: AssetId, annotationId: AnnotationId) => void
  selectAnnotation: (annotationId: AnnotationId | null) => void
  setLoadingState: (key: string, state: LoadingState) => void
  setFilters: (filters: Partial<AnnotationStoreState['filters']>) => void
  setAnnotationMode: (mode: AnnotationStoreState['annotationMode']) => void
  setCreatingAnnotation: (creating: boolean) => void
  
  // Async actions
  loadAnnotations: (assetId: AssetId) => Promise<void>
  createAnnotation: (assetId: AssetId, data: CreateAnnotationRequest) => Promise<AssetAnnotation | null>
  updateAnnotationById: (assetId: AssetId, annotationId: AnnotationId, data: UpdateAnnotationRequest) => Promise<AssetAnnotation | null>
  deleteAnnotation: (assetId: AssetId, annotationId: AnnotationId) => Promise<boolean>
  
  // Real-time subscriptions
  enableRealTimeUpdates: (assetId: AssetId) => void
  disableRealTimeUpdates: () => void
  handleRealTimeEvent: (event: AnnotationEvent) => void
  
  // Utility methods
  getAnnotationsForAsset: (assetId: AssetId) => AssetAnnotation[]
  getAnnotationsForPage: (assetId: AssetId, pageNumber: number) => AssetAnnotation[]
  getSelectedAnnotation: (assetId: AssetId) => AssetAnnotation | null
  getLoadingState: (key: string) => LoadingState
  clearAnnotationsForAsset: (assetId: AssetId) => void
  clearAll: () => void
}

export const useAnnotationStore = create<AnnotationStoreState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        annotations: {},
        selectedAnnotationId: null,
        loadingStates: {},
        realTimeEnabled: false,
        supabaseChannel: null,
        filters: {
          showPrivate: true,
          showResolved: true
        },
        isCreatingAnnotation: false,
        annotationMode: 'select',
        
        // Sync actions
        setAnnotations: (assetId, annotations) => set((state) => ({
          annotations: {
            ...state.annotations,
            [assetId]: annotations
          }
        })),
        
        addAnnotation: (assetId, annotation) => set((state) => ({
          annotations: {
            ...state.annotations,
            [assetId]: [...(state.annotations[assetId] || []), annotation]
          }
        })),
        
        updateAnnotation: (assetId, annotationId, updates) => set((state) => ({
          annotations: {
            ...state.annotations,
            [assetId]: (state.annotations[assetId] || []).map(annotation =>
              annotation.id === annotationId 
                ? { ...annotation, ...updates }
                : annotation
            )
          }
        })),
        
        removeAnnotation: (assetId, annotationId) => set((state) => ({
          annotations: {
            ...state.annotations,
            [assetId]: (state.annotations[assetId] || []).filter(
              annotation => annotation.id !== annotationId
            )
          },
          selectedAnnotationId: state.selectedAnnotationId === annotationId 
            ? null 
            : state.selectedAnnotationId
        })),
        
        selectAnnotation: (annotationId) => set({ selectedAnnotationId: annotationId }),
        
        setLoadingState: (key, state) => set((prevState) => ({
          loadingStates: {
            ...prevState.loadingStates,
            [key]: state
          }
        })),
        
        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters }
        })),
        
        setAnnotationMode: (mode) => set({ annotationMode: mode }),
        
        setCreatingAnnotation: (creating) => set({ isCreatingAnnotation: creating }),
        
        // Async actions
        loadAnnotations: async (assetId: AssetId) => {
          const loadingKey = `load-${assetId}`
          const { setLoadingState, setAnnotations } = get()
          
          setLoadingState(loadingKey, { status: 'loading' })
          
          try {
            const response = await fetch(`/api/assets/${assetId}/annotations`)
            
            if (!response.ok) {
              throw new Error(`Failed to load annotations: ${response.statusText}`)
            }
            
            const data = await response.json()
            
            if (data.success) {
              setAnnotations(assetId, data.data.annotations || [])
              setLoadingState(loadingKey, { status: 'success' })
            } else {
              throw new Error(data.error || 'Failed to load annotations')
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            setLoadingState(loadingKey, { status: 'error', error: errorMessage })
            console.error('Error loading annotations:', error)
          }
        },
        
        createAnnotation: async (assetId: AssetId, data: CreateAnnotationRequest) => {
          const { setCreatingAnnotation, addAnnotation } = get()
          
          setCreatingAnnotation(true)
          
          try {
            const response = await fetch(`/api/assets/${assetId}/annotations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            })
            
            if (!response.ok) {
              throw new Error(`Failed to create annotation: ${response.statusText}`)
            }
            
            const result = await response.json()
            
            if (result.success) {
              const newAnnotation = result.data.annotation
              addAnnotation(assetId, newAnnotation)
              return newAnnotation
            } else {
              throw new Error(result.error || 'Failed to create annotation')
            }
          } catch (error) {
            console.error('Error creating annotation:', error)
            return null
          } finally {
            setCreatingAnnotation(false)
          }
        },
        
        updateAnnotationById: async (assetId: AssetId, annotationId: AnnotationId, data: UpdateAnnotationRequest) => {
          const { updateAnnotation } = get()
          
          try {
            const response = await fetch(`/api/assets/${assetId}/annotations/${annotationId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            })
            
            if (!response.ok) {
              throw new Error(`Failed to update annotation: ${response.statusText}`)
            }
            
            const result = await response.json()
            
            if (result.success) {
              const updatedAnnotation = result.data.annotation
              updateAnnotation(assetId, annotationId, updatedAnnotation)
              return updatedAnnotation
            } else {
              throw new Error(result.error || 'Failed to update annotation')
            }
          } catch (error) {
            console.error('Error updating annotation:', error)
            return null
          }
        },
        
        deleteAnnotation: async (assetId: AssetId, annotationId: AnnotationId) => {
          const { removeAnnotation } = get()
          
          try {
            const response = await fetch(`/api/assets/${assetId}/annotations/${annotationId}`, {
              method: 'DELETE'
            })
            
            if (!response.ok) {
              throw new Error(`Failed to delete annotation: ${response.statusText}`)
            }
            
            const result = await response.json()
            
            if (result.success) {
              removeAnnotation(assetId, annotationId)
              return true
            } else {
              throw new Error(result.error || 'Failed to delete annotation')
            }
          } catch (error) {
            console.error('Error deleting annotation:', error)
            return false
          }
        },
        
        // Real-time subscriptions
        enableRealTimeUpdates: (assetId: AssetId) => {
          const { supabaseChannel, realTimeEnabled, handleRealTimeEvent } = get()
          
          if (realTimeEnabled && supabaseChannel) {
            return // Already enabled
          }
          
          const supabase = createSupabaseBrowserClient()
          const channel = supabase
            .channel(`annotations:${assetId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'asset_annotations',
                filter: `asset_id=eq.${assetId}`,
              },
              (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload
                
                switch (eventType) {
                  case 'INSERT':
                    handleRealTimeEvent({
                      type: 'annotation_created',
                      annotation: newRecord as AssetAnnotation
                    })
                    break
                  case 'UPDATE':
                    handleRealTimeEvent({
                      type: 'annotation_updated',
                      annotation: newRecord as AssetAnnotation
                    })
                    break
                  case 'DELETE':
                    handleRealTimeEvent({
                      type: 'annotation_deleted',
                      annotationId: oldRecord.id as AnnotationId
                    })
                    break
                }
              }
            )
            .subscribe()
          
          set({ realTimeEnabled: true, supabaseChannel: channel })
        },
        
        disableRealTimeUpdates: () => {
          const { supabaseChannel } = get()
          
          if (supabaseChannel) {
            const supabase = createSupabaseBrowserClient()
            supabase.removeChannel(supabaseChannel)
          }
          
          set({ realTimeEnabled: false, supabaseChannel: null })
        },
        
        handleRealTimeEvent: (event: AnnotationEvent) => {
          const { addAnnotation, updateAnnotation, removeAnnotation } = get()
          
          switch (event.type) {
            case 'annotation_created':
              addAnnotation(event.annotation.assetId, event.annotation)
              break
            case 'annotation_updated':
              updateAnnotation(
                event.annotation.assetId, 
                event.annotation.id, 
                event.annotation
              )
              break
            case 'annotation_deleted':
              // Need to determine assetId from existing annotations
              const state = get()
              for (const [assetId, annotations] of Object.entries(state.annotations)) {
                if (annotations.some(a => a.id === event.annotationId)) {
                  removeAnnotation(assetId as AssetId, event.annotationId)
                  break
                }
              }
              break
          }
        },
        
        // Utility methods
        getAnnotationsForAsset: (assetId: AssetId) => {
          const { annotations, filters } = get()
          let assetAnnotations = annotations[assetId] || []
          
          // Apply filters
          if (filters.pageNumber !== undefined) {
            assetAnnotations = assetAnnotations.filter(a => a.pageNumber === filters.pageNumber)
          }
          
          if (filters.annotationType) {
            assetAnnotations = assetAnnotations.filter(a => a.annotationType === filters.annotationType)
          }
          
          if (!filters.showPrivate) {
            assetAnnotations = assetAnnotations.filter(a => !a.isPrivate)
          }
          
          if (!filters.showResolved) {
            assetAnnotations = assetAnnotations.filter(a => !a.isResolved)
          }
          
          return assetAnnotations.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        },
        
        getAnnotationsForPage: (assetId: AssetId, pageNumber: number) => {
          const annotations = get().annotations[assetId] || []
          return annotations.filter(annotation => annotation.pageNumber === pageNumber)
        },
        
        getSelectedAnnotation: (assetId: AssetId) => {
          const { selectedAnnotationId, annotations } = get()
          if (!selectedAnnotationId) return null
          
          const assetAnnotations = annotations[assetId] || []
          return assetAnnotations.find(a => a.id === selectedAnnotationId) || null
        },
        
        getLoadingState: (key: string) => {
          return get().loadingStates[key] || { status: 'idle' }
        },
        
        clearAnnotationsForAsset: (assetId: AssetId) => set((state) => {
          const newAnnotations = { ...state.annotations }
          delete newAnnotations[assetId]
          return { annotations: newAnnotations }
        }),
        
        clearAll: () => set({
          annotations: {},
          selectedAnnotationId: null,
          loadingStates: {},
          filters: {
            showPrivate: true,
            showResolved: true
          },
          isCreatingAnnotation: false
        })
      }),
      {
        name: 'annotation-store',
        partialize: (state) => ({
          // Persist filters and UI preferences, but not annotations or loading states
          filters: state.filters,
          annotationMode: state.annotationMode
        })
      }
    )
  )
)

// Selectors for optimized re-renders
export const useAnnotationsForAsset = (assetId: AssetId) => 
  useAnnotationStore(state => state.getAnnotationsForAsset(assetId))

export const useSelectedAnnotation = (assetId: AssetId) => 
  useAnnotationStore(state => state.getSelectedAnnotation(assetId))

export const useAnnotationLoadingState = (assetId: AssetId) => 
  useAnnotationStore(state => state.getLoadingState(`load-${assetId}`))

export const useAnnotationFilters = () => 
  useAnnotationStore(state => state.filters)

export const useAnnotationMode = () => 
  useAnnotationStore(state => state.annotationMode)

export const useIsCreatingAnnotation = () => 
  useAnnotationStore(state => state.isCreatingAnnotation)