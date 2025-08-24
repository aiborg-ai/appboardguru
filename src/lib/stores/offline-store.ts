/**
 * Offline-Aware State Management Store
 * Uses Zustand for reactive state management with offline capabilities
 */

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import { getOfflineDB, type OfflineGovernanceDB } from '../offline-db/database'
import { getSyncEngine, type SyncResult, type SyncProgress } from '../offline-db/sync-engine'
import type { Meeting, Document, Vote, Annotation, Participant, ComplianceItem } from '../offline-db/schema'

// Base interfaces
export interface OfflineState {
  isOnline: boolean
  isOfflineMode: boolean
  lastSync: string | null
  syncInProgress: boolean
  syncProgress: SyncProgress | null
  queuedOperations: number
  storageUsed: number
  encryptionEnabled: boolean
  autoSyncEnabled: boolean
}

export interface EntityState<T> {
  items: Record<string, T>
  loading: boolean
  error: string | null
  lastUpdated: string | null
  pendingSync: string[] // IDs of items pending sync
  conflicts: string[] // IDs of items with sync conflicts
}

// Complete store state
export interface OfflineStoreState {
  // Connection state
  offline: OfflineState
  
  // Entity states
  meetings: EntityState<Meeting>
  documents: EntityState<Document>
  votes: EntityState<Vote>
  annotations: EntityState<Annotation>
  participants: EntityState<Participant>
  compliance_items: EntityState<ComplianceItem>
  
  // Actions
  actions: {
    // Network actions
    setOnlineStatus: (isOnline: boolean) => void
    toggleOfflineMode: () => void
    setAutoSync: (enabled: boolean) => void
    
    // Sync actions
    startSync: (entities?: string[]) => Promise<SyncResult>
    stopSync: () => void
    resolveSyncConflict: (entityType: string, entityId: string, resolution: 'local' | 'server' | 'merge') => Promise<void>
    
    // Entity actions
    loadEntity: <T>(entityType: keyof EntityState<any>, id: string) => Promise<T | null>
    saveEntity: <T>(entityType: keyof EntityState<any>, entity: T) => Promise<void>
    deleteEntity: (entityType: keyof EntityState<any>, id: string) => Promise<void>
    loadEntities: <T>(entityType: keyof EntityState<any>, filters?: Record<string, any>) => Promise<T[]>
    
    // Meeting actions
    createMeeting: (meeting: Partial<Meeting>) => Promise<Meeting>
    updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<void>
    deleteMeeting: (id: string) => Promise<void>
    joinMeeting: (meetingId: string) => Promise<void>
    leaveMeeting: (meetingId: string) => Promise<void>
    addMeetingNote: (meetingId: string, note: string) => Promise<void>
    
    // Document actions
    uploadDocument: (document: Partial<Document>, file?: File) => Promise<Document>
    downloadDocument: (id: string) => Promise<Blob | null>
    addAnnotation: (documentId: string, annotation: Partial<Annotation>) => Promise<Annotation>
    updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>
    
    // Vote actions
    createVote: (vote: Partial<Vote>) => Promise<Vote>
    castVote: (voteId: string, choice: 'for' | 'against' | 'abstain') => Promise<void>
    assignProxy: (voteId: string, proxyUserId: string) => Promise<void>
    
    // Compliance actions
    createComplianceItem: (item: Partial<ComplianceItem>) => Promise<ComplianceItem>
    updateComplianceStatus: (id: string, status: ComplianceItem['status']) => Promise<void>
    addComplianceEvidence: (id: string, documentIds: string[]) => Promise<void>
    
    // Utility actions
    clearOfflineData: () => Promise<void>
    getStorageInfo: () => Promise<{ size: number; usage: string }>
    optimizeStorage: () => Promise<void>
    exportData: (entityType?: string) => Promise<Blob>
    importData: (data: Blob) => Promise<void>
  }
}

// Create the store
export const useOfflineStore = create<OfflineStoreState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => {
        const db = getOfflineDB()
        const syncEngine = getSyncEngine()
        
        return {
          // Initial state
          offline: {
            isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
            isOfflineMode: false,
            lastSync: null,
            syncInProgress: false,
            syncProgress: null,
            queuedOperations: 0,
            storageUsed: 0,
            encryptionEnabled: false,
            autoSyncEnabled: true
          },
          
          meetings: {
            items: {},
            loading: false,
            error: null,
            lastUpdated: null,
            pendingSync: [],
            conflicts: []
          },
          
          documents: {
            items: {},
            loading: false,
            error: null,
            lastUpdated: null,
            pendingSync: [],
            conflicts: []
          },
          
          votes: {
            items: {},
            loading: false,
            error: null,
            lastUpdated: null,
            pendingSync: [],
            conflicts: []
          },
          
          annotations: {
            items: {},
            loading: false,
            error: null,
            lastUpdated: null,
            pendingSync: [],
            conflicts: []
          },
          
          participants: {
            items: {},
            loading: false,
            error: null,
            lastUpdated: null,
            pendingSync: [],
            conflicts: []
          },
          
          compliance_items: {
            items: {},
            loading: false,
            error: null,
            lastUpdated: null,
            pendingSync: [],
            conflicts: []
          },
          
          actions: {
            // Network actions
            setOnlineStatus: (isOnline: boolean) => {
              set(state => {
                state.offline.isOnline = isOnline
                
                // Auto-sync when coming online
                if (isOnline && state.offline.autoSyncEnabled && !state.offline.syncInProgress) {
                  setTimeout(() => get().actions.startSync(), 1000)
                }
              })
            },
            
            toggleOfflineMode: () => {
              set(state => {
                state.offline.isOfflineMode = !state.offline.isOfflineMode
              })
            },
            
            setAutoSync: (enabled: boolean) => {
              set(state => {
                state.offline.autoSyncEnabled = enabled
              })
            },
            
            // Sync actions
            startSync: async (entities?: string[]): Promise<SyncResult> => {
              set(state => {
                state.offline.syncInProgress = true
                state.offline.syncProgress = null
              })
              
              try {
                const result = await syncEngine.startSync({
                  priorityEntities: entities,
                  onProgress: (progress) => {
                    set(state => {
                      state.offline.syncProgress = progress
                    })
                  },
                  onConflict: async (conflict) => {
                    // Add to conflicts list for manual resolution
                    set(state => {
                      const entityState = state[conflict.entityType as keyof typeof state] as EntityState<any>
                      if (entityState && !entityState.conflicts.includes(conflict.entityId)) {
                        entityState.conflicts.push(conflict.entityId)
                      }
                    })
                    
                    // Default to server wins for now
                    return { strategy: 'use_server', reason: 'Automatic resolution' }
                  }
                })
                
                // Update last sync time
                set(state => {
                  state.offline.lastSync = new Date().toISOString()
                  state.offline.syncInProgress = false
                  state.offline.syncProgress = null
                })
                
                // Refresh entity data after sync
                await get().actions.refreshAllEntities()
                
                return result
                
              } catch (error) {
                set(state => {
                  state.offline.syncInProgress = false
                  state.offline.syncProgress = null
                })
                throw error
              }
            },
            
            stopSync: () => {
              syncEngine.stopSync()
              set(state => {
                state.offline.syncInProgress = false
                state.offline.syncProgress = null
              })
            },
            
            resolveSyncConflict: async (
              entityType: string, 
              entityId: string, 
              resolution: 'local' | 'server' | 'merge'
            ) => {
              // Implementation would depend on specific conflict resolution logic
              console.log(`Resolving conflict for ${entityType}:${entityId} with ${resolution}`)
              
              set(state => {
                const entityState = state[entityType as keyof typeof state] as EntityState<any>
                if (entityState) {
                  entityState.conflicts = entityState.conflicts.filter(id => id !== entityId)
                }
              })
            },
            
            // Generic entity actions
            loadEntity: async <T>(entityType: keyof EntityState<any>, id: string): Promise<T | null> => {
              try {
                const table = db[entityType as keyof OfflineGovernanceDB] as any
                if (!table) return null
                
                const entity = await table.get(id)
                
                if (entity) {
                  set(state => {
                    const entityState = state[entityType] as EntityState<T>
                    entityState.items[id] = entity
                    entityState.lastUpdated = new Date().toISOString()
                  })
                }
                
                return entity || null
              } catch (error) {
                console.error(`Failed to load ${entityType}:`, error)
                set(state => {
                  const entityState = state[entityType] as EntityState<T>
                  entityState.error = error instanceof Error ? error.message : String(error)
                })
                return null
              }
            },
            
            saveEntity: async <T>(entityType: keyof EntityState<any>, entity: T & { id: string }) => {
              try {
                const table = db[entityType as keyof OfflineGovernanceDB] as any
                if (!table) return
                
                const now = new Date().toISOString()
                const entityWithMeta = {
                  ...entity,
                  updated_at: now,
                  sync_status: 'pending',
                  offline_changes: true,
                  last_synced: now
                }
                
                await table.put(entityWithMeta)
                
                set(state => {
                  const entityState = state[entityType] as EntityState<T>
                  entityState.items[entity.id] = entityWithMeta as T
                  entityState.lastUpdated = now
                  
                  // Add to pending sync if not already there
                  if (!entityState.pendingSync.includes(entity.id)) {
                    entityState.pendingSync.push(entity.id)
                  }
                })
                
              } catch (error) {
                console.error(`Failed to save ${entityType}:`, error)
                set(state => {
                  const entityState = state[entityType] as EntityState<T>
                  entityState.error = error instanceof Error ? error.message : String(error)
                })
              }
            },
            
            deleteEntity: async (entityType: keyof EntityState<any>, id: string) => {
              try {
                const table = db[entityType as keyof OfflineGovernanceDB] as any
                if (!table) return
                
                await table.delete(id)
                
                set(state => {
                  const entityState = state[entityType] as EntityState<any>
                  delete entityState.items[id]
                  entityState.pendingSync = entityState.pendingSync.filter(pid => pid !== id)
                  entityState.conflicts = entityState.conflicts.filter(cid => cid !== id)
                  entityState.lastUpdated = new Date().toISOString()
                })
                
              } catch (error) {
                console.error(`Failed to delete ${entityType}:`, error)
                set(state => {
                  const entityState = state[entityType] as EntityState<any>
                  entityState.error = error instanceof Error ? error.message : String(error)
                })
              }
            },
            
            loadEntities: async <T>(
              entityType: keyof EntityState<any>, 
              filters?: Record<string, any>
            ): Promise<T[]> => {
              try {
                set(state => {
                  const entityState = state[entityType] as EntityState<T>
                  entityState.loading = true
                  entityState.error = null
                })
                
                const table = db[entityType as keyof OfflineGovernanceDB] as any
                if (!table) return []
                
                let query = table.toCollection()
                
                // Apply filters
                if (filters) {
                  for (const [key, value] of Object.entries(filters)) {
                    query = query.filter((item: any) => item[key] === value)
                  }
                }
                
                const entities = await query.toArray()
                
                set(state => {
                  const entityState = state[entityType] as EntityState<T>
                  entityState.loading = false
                  entityState.items = {}
                  entities.forEach((entity: T & { id: string }) => {
                    entityState.items[entity.id] = entity
                  })
                  entityState.lastUpdated = new Date().toISOString()
                })
                
                return entities
                
              } catch (error) {
                console.error(`Failed to load ${entityType} entities:`, error)
                set(state => {
                  const entityState = state[entityType] as EntityState<T>
                  entityState.loading = false
                  entityState.error = error instanceof Error ? error.message : String(error)
                })
                return []
              }
            },
            
            // Meeting-specific actions
            createMeeting: async (meeting: Partial<Meeting>): Promise<Meeting> => {
              const id = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              const now = new Date().toISOString()
              
              const newMeeting: Meeting = {
                id,
                title: meeting.title || 'New Meeting',
                description: meeting.description || '',
                meeting_date: meeting.meeting_date || now,
                start_time: meeting.start_time || now,
                end_time: meeting.end_time || now,
                status: meeting.status || 'draft',
                organization_id: meeting.organization_id || '',
                created_by: meeting.created_by || '',
                agenda_items: meeting.agenda_items || [],
                participants: meeting.participants || [],
                documents: meeting.documents || [],
                votes: meeting.votes || [],
                meeting_notes: meeting.meeting_notes || '',
                action_items: meeting.action_items || [],
                attendance: meeting.attendance || [],
                location: meeting.location || '',
                is_virtual: meeting.is_virtual || false,
                created_at: now,
                updated_at: now,
                last_synced: now,
                sync_status: 'pending',
                offline_changes: true
              }
              
              await get().actions.saveEntity('meetings', newMeeting)
              return newMeeting
            },
            
            updateMeeting: async (id: string, updates: Partial<Meeting>) => {
              const existing = await get().actions.loadEntity<Meeting>('meetings', id)
              if (!existing) throw new Error('Meeting not found')
              
              const updated = {
                ...existing,
                ...updates,
                updated_at: new Date().toISOString()
              }
              
              await get().actions.saveEntity('meetings', updated)
            },
            
            deleteMeeting: async (id: string) => {
              await get().actions.deleteEntity('meetings', id)
            },
            
            joinMeeting: async (meetingId: string) => {
              // Implementation for joining a meeting
              console.log(`Joining meeting: ${meetingId}`)
            },
            
            leaveMeeting: async (meetingId: string) => {
              // Implementation for leaving a meeting
              console.log(`Leaving meeting: ${meetingId}`)
            },
            
            addMeetingNote: async (meetingId: string, note: string) => {
              const meeting = await get().actions.loadEntity<Meeting>('meetings', meetingId)
              if (!meeting) throw new Error('Meeting not found')
              
              const updatedNotes = meeting.meeting_notes + '\n' + note
              await get().actions.updateMeeting(meetingId, { meeting_notes: updatedNotes })
            },
            
            // Document-specific actions
            uploadDocument: async (document: Partial<Document>, file?: File): Promise<Document> => {
              const id = `document_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              const now = new Date().toISOString()
              
              // If file is provided, we'd normally upload it and get the path
              // For now, we'll just store the metadata
              
              const newDocument: Document = {
                id,
                title: document.title || file?.name || 'New Document',
                description: document.description || '',
                file_path: document.file_path || '',
                file_name: file?.name || 'document.pdf',
                file_size: file?.size || 0,
                mime_type: file?.type || 'application/pdf',
                organization_id: document.organization_id || '',
                uploaded_by: document.uploaded_by || '',
                category: document.category || 'other',
                tags: document.tags || [],
                version: document.version || 1,
                status: document.status || 'draft',
                confidentiality_level: document.confidentiality_level || 'internal',
                annotations: document.annotations || [],
                download_count: 0,
                last_accessed: now,
                access_permissions: document.access_permissions || [],
                watermark_applied: false,
                content_hash: '',
                created_at: now,
                updated_at: now,
                last_synced: now,
                sync_status: 'pending',
                offline_changes: true
              }
              
              await get().actions.saveEntity('documents', newDocument)
              return newDocument
            },
            
            downloadDocument: async (id: string): Promise<Blob | null> => {
              // Implementation would fetch from offline storage or server
              console.log(`Downloading document: ${id}`)
              return null
            },
            
            addAnnotation: async (documentId: string, annotation: Partial<Annotation>): Promise<Annotation> => {
              const id = `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              const now = new Date().toISOString()
              
              const newAnnotation: Annotation = {
                id,
                document_id: documentId,
                user_id: annotation.user_id || '',
                page_number: annotation.page_number || 1,
                x_coordinate: annotation.x_coordinate || 0,
                y_coordinate: annotation.y_coordinate || 0,
                width: annotation.width || 100,
                height: annotation.height || 20,
                annotation_type: annotation.annotation_type || 'note',
                content: annotation.content || '',
                color: annotation.color || '#ffff00',
                is_private: annotation.is_private || false,
                replies: annotation.replies || [],
                resolved: false,
                created_at: now,
                updated_at: now,
                last_synced: now,
                sync_status: 'pending',
                offline_changes: true
              }
              
              await get().actions.saveEntity('annotations', newAnnotation)
              return newAnnotation
            },
            
            updateAnnotation: async (id: string, updates: Partial<Annotation>) => {
              const existing = await get().actions.loadEntity<Annotation>('annotations', id)
              if (!existing) throw new Error('Annotation not found')
              
              const updated = {
                ...existing,
                ...updates,
                updated_at: new Date().toISOString()
              }
              
              await get().actions.saveEntity('annotations', updated)
            },
            
            // Vote-specific actions
            createVote: async (vote: Partial<Vote>): Promise<Vote> => {
              const id = `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              const now = new Date().toISOString()
              
              const newVote: Vote = {
                id,
                title: vote.title || 'New Vote',
                description: vote.description || '',
                meeting_id: vote.meeting_id || '',
                organization_id: vote.organization_id || '',
                vote_type: vote.vote_type || 'resolution',
                voting_method: vote.voting_method || 'simple_majority',
                required_threshold: vote.required_threshold || 50,
                status: vote.status || 'draft',
                start_time: vote.start_time || now,
                end_time: vote.end_time || now,
                deadline: vote.deadline || now,
                is_anonymous: vote.is_anonymous || false,
                allow_abstention: vote.allow_abstention || true,
                allow_proxy: vote.allow_proxy || false,
                eligible_voters: vote.eligible_voters || [],
                cast_votes: vote.cast_votes || [],
                proxy_assignments: vote.proxy_assignments || [],
                results: vote.results || {
                  total_eligible: 0,
                  total_cast: 0,
                  for_count: 0,
                  against_count: 0,
                  abstain_count: 0,
                  proxy_count: 0,
                  percentage_for: 0,
                  percentage_against: 0,
                  percentage_abstain: 0,
                  quorum_met: false,
                  result: 'pending',
                  calculated_at: now
                },
                created_by: vote.created_by || '',
                created_at: now,
                updated_at: now,
                last_synced: now,
                sync_status: 'pending',
                offline_changes: true
              }
              
              await get().actions.saveEntity('votes', newVote)
              return newVote
            },
            
            castVote: async (voteId: string, choice: 'for' | 'against' | 'abstain') => {
              const vote = await get().actions.loadEntity<Vote>('votes', voteId)
              if (!vote) throw new Error('Vote not found')
              
              // Add the cast vote
              const castVote = {
                id: `cast_vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                voter_id: 'current_user', // Would get from auth context
                vote_choice: choice,
                is_proxy: false,
                cast_at: new Date().toISOString()
              }
              
              const updatedVote = {
                ...vote,
                cast_votes: [...vote.cast_votes, castVote],
                updated_at: new Date().toISOString()
              }
              
              await get().actions.saveEntity('votes', updatedVote)
            },
            
            assignProxy: async (voteId: string, proxyUserId: string) => {
              // Implementation for proxy assignment
              console.log(`Assigning proxy for vote ${voteId} to user ${proxyUserId}`)
            },
            
            // Compliance-specific actions
            createComplianceItem: async (item: Partial<ComplianceItem>): Promise<ComplianceItem> => {
              const id = `compliance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              const now = new Date().toISOString()
              
              const newItem: ComplianceItem = {
                id,
                title: item.title || 'New Compliance Item',
                description: item.description || '',
                category: item.category || 'internal_policy',
                priority: item.priority || 'medium',
                status: item.status || 'pending',
                assigned_to: item.assigned_to || '',
                organization_id: item.organization_id || '',
                due_date: item.due_date || now,
                evidence_documents: item.evidence_documents || [],
                risk_level: item.risk_level || 'medium',
                automated_check: item.automated_check || false,
                compliance_framework: item.compliance_framework || '',
                regulatory_reference: item.regulatory_reference || '',
                penalty_description: item.penalty_description || '',
                mitigation_steps: item.mitigation_steps || [],
                progress_notes: item.progress_notes || [],
                created_at: now,
                updated_at: now,
                last_synced: now,
                sync_status: 'pending',
                offline_changes: true
              }
              
              await get().actions.saveEntity('compliance_items', newItem)
              return newItem
            },
            
            updateComplianceStatus: async (id: string, status: ComplianceItem['status']) => {
              const item = await get().actions.loadEntity<ComplianceItem>('compliance_items', id)
              if (!item) throw new Error('Compliance item not found')
              
              const updates: Partial<ComplianceItem> = {
                status,
                updated_at: new Date().toISOString()
              }
              
              if (status === 'completed') {
                updates.completion_date = new Date().toISOString()
              }
              
              const updated = { ...item, ...updates }
              await get().actions.saveEntity('compliance_items', updated)
            },
            
            addComplianceEvidence: async (id: string, documentIds: string[]) => {
              const item = await get().actions.loadEntity<ComplianceItem>('compliance_items', id)
              if (!item) throw new Error('Compliance item not found')
              
              const updatedDocuments = [...new Set([...item.evidence_documents, ...documentIds])]
              
              await get().actions.saveEntity('compliance_items', {
                ...item,
                evidence_documents: updatedDocuments,
                updated_at: new Date().toISOString()
              })
            },
            
            // Utility actions
            clearOfflineData: async () => {
              await db.clearAllData()
              
              // Reset store state
              set(state => {
                state.meetings.items = {}
                state.documents.items = {}
                state.votes.items = {}
                state.annotations.items = {}
                state.participants.items = {}
                state.compliance_items.items = {}
                
                // Reset all entity states
                Object.values(state).forEach(entityState => {
                  if (typeof entityState === 'object' && 'items' in entityState) {
                    entityState.items = {}
                    entityState.pendingSync = []
                    entityState.conflicts = []
                    entityState.error = null
                    entityState.lastUpdated = null
                  }
                })
                
                state.offline.lastSync = null
                state.offline.queuedOperations = 0
                state.offline.storageUsed = 0
              })
            },
            
            getStorageInfo: async () => {
              const info = await db.getStorageInfo()
              
              set(state => {
                state.offline.storageUsed = info.storageSize
                state.offline.encryptionEnabled = info.encryptionEnabled
                if (info.lastSync) {
                  state.offline.lastSync = info.lastSync
                }
              })
              
              const sizeInMB = (info.storageSize / (1024 * 1024)).toFixed(2)
              return {
                size: info.storageSize,
                usage: `${sizeInMB} MB (${info.totalRecords} records)`
              }
            },
            
            optimizeStorage: async () => {
              await db.performMaintenance()
              await get().actions.getStorageInfo() // Refresh storage info
            },
            
            exportData: async (entityType?: string): Promise<Blob> => {
              // Implementation would export data to JSON/CSV
              const data = entityType 
                ? get()[entityType as keyof OfflineStoreState]
                : get()
              
              return new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
              })
            },
            
            importData: async (data: Blob) => {
              // Implementation would import data from JSON
              const text = await data.text()
              const importedData = JSON.parse(text)
              console.log('Importing data:', importedData)
            },
            
            // Internal helper for refreshing all entities after sync
            refreshAllEntities: async () => {
              const entityTypes = ['meetings', 'documents', 'votes', 'annotations', 'participants', 'compliance_items'] as const
              
              for (const entityType of entityTypes) {
                await get().actions.loadEntities(entityType)
              }
            }
          }
        }
      }),
      {
        name: 'offline-governance-store',
        partialize: (state) => ({
          // Only persist offline state and basic entity metadata
          offline: state.offline,
          // Don't persist large entity data - that's handled by IndexedDB
        }),
      }
    )
  )
)

// Network status listener
if (typeof window !== 'undefined') {
  const handleOnline = () => useOfflineStore.getState().actions.setOnlineStatus(true)
  const handleOffline = () => useOfflineStore.getState().actions.setOnlineStatus(false)
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  // Initial status
  useOfflineStore.getState().actions.setOnlineStatus(navigator.onLine)
}