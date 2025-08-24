/**
 * Document-Specific Offline Store
 * Specialized state management for document management offline functionality
 */

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useOfflineStore } from './offline-store'
import type { Document } from '../offline-db/schema'

export interface DocumentStoreState {
  favorites: string[]
  recentDocuments: { id: string; accessed_at: string }[]
  
  offline: {
    cached_documents: string[]
    pending_uploads: string[]
    pending_annotations: string[]
    storage_usage: number
  }
  
  preferences: {
    auto_save_annotations: boolean
    cache_strategy: 'auto' | 'manual' | 'favorites_only'
    max_cache_size: number
  }
  
  actions: {
    loadDocument: (id: string) => Promise<Document | null>
    uploadDocument: (file: File, metadata?: Partial<Document>) => Promise<Document>
    cacheDocument: (documentId: string) => Promise<void>
    syncOfflineChanges: () => Promise<{ success: number; failed: number }>
    addToFavorites: (documentId: string) => void
    removeFromFavorites: (documentId: string) => void
    addToRecent: (documentId: string) => void
    updatePreferences: (updates: Partial<DocumentStoreState['preferences']>) => void
  }
}

export const useDocumentStore = create<DocumentStoreState>()(
  persist(
    immer((set, get) => ({
      favorites: [],
      recentDocuments: [],
      
      offline: {
        cached_documents: [],
        pending_uploads: [],
        pending_annotations: [],
        storage_usage: 0
      },
      
      preferences: {
        auto_save_annotations: true,
        cache_strategy: 'auto',
        max_cache_size: 500
      },
      
      actions: {
        loadDocument: async (id: string): Promise<Document | null> => {
          const offlineStore = useOfflineStore.getState()
          return await offlineStore.actions.loadEntity<Document>('documents', id)
        },
        
        uploadDocument: async (file: File, metadata: Partial<Document> = {}): Promise<Document> => {
          const offlineStore = useOfflineStore.getState()
          
          const document = await offlineStore.actions.uploadDocument({
            ...metadata,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type
          }, file)
          
          set(state => {
            state.offline.cached_documents.push(document.id)
            state.offline.storage_usage += file.size
          })
          
          return document
        },
        
        cacheDocument: async (documentId: string): Promise<void> => {
          try {
            const document = await get().actions.loadDocument(documentId)
            if (!document) return
            
            set(state => {
              if (!state.offline.cached_documents.includes(documentId)) {
                state.offline.cached_documents.push(documentId)
              }
            })
            
          } catch (error) {
            console.error(`Failed to cache document ${documentId}:`, error)
          }
        },
        
        syncOfflineChanges: async (): Promise<{ success: number; failed: number }> => {
          const { pending_annotations, pending_uploads } = get().offline
          let success = 0
          let failed = 0
          
          for (const annotationId of pending_annotations) {
            try {
              console.log(`Syncing annotation ${annotationId}`)
              success++
            } catch (error) {
              failed++
            }
          }
          
          for (const docId of pending_uploads) {
            try {
              console.log(`Syncing document ${docId}`)
              success++
            } catch (error) {
              failed++
            }
          }
          
          return { success, failed }
        },
        
        addToFavorites: (documentId: string): void => {
          set(state => {
            if (!state.favorites.includes(documentId)) {
              state.favorites.push(documentId)
            }
          })
        },
        
        removeFromFavorites: (documentId: string): void => {
          set(state => {
            state.favorites = state.favorites.filter(id => id !== documentId)
          })
        },
        
        addToRecent: (documentId: string): void => {
          set(state => {
            state.recentDocuments = state.recentDocuments.filter(doc => doc.id !== documentId)
            
            state.recentDocuments.unshift({
              id: documentId,
              accessed_at: new Date().toISOString()
            })
            
            state.recentDocuments = state.recentDocuments.slice(0, 20)
          })
        },
        
        updatePreferences: (updates: Partial<DocumentStoreState['preferences']>): void => {
          set(state => {
            state.preferences = { ...state.preferences, ...updates }
          })
        }
      }
    })),
    {
      name: 'document-store'
    }
  )
)