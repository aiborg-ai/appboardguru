/**
 * CRDT Service - Conflict-free Replicated Data Types
 * Handles real-time collaborative document editing using Yjs
 * Following CLAUDE.md patterns with DDD and Result handling
 */

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { BaseService } from './base.service'
import { Result } from '../types/result'
import type { AssetId, UserId, OrganizationId } from '../../types/database'
import type { DocumentChange, RoomId } from '../../types/websocket'
import { createRoomId } from '../../types/websocket'

export interface DocumentCRDTState {
  content: Y.Text
  metadata: Y.Map<any>
  cursors: Y.Map<any>
  comments: Y.Array<any>
  version: number
  lastModified: Date
}

export interface CRDTSyncEvent {
  type: 'update' | 'sync' | 'awareness'
  data: Uint8Array
  origin?: string
}

export interface DocumentSnapshot {
  assetId: AssetId
  content: string
  metadata: Record<string, any>
  version: number
  timestamp: string
}

export interface CRDTAwareness {
  userId: UserId
  cursor?: { line: number; column: number }
  selection?: { start: number; end: number }
  name: string
  color: string
  timestamp: number
}

export class CRDTService extends BaseService {
  private documents = new Map<AssetId, Y.Doc>()
  private providers = new Map<AssetId, WebsocketProvider>()
  private subscriptions = new Map<AssetId, Set<Function>>()
  private readonly wsUrl: string

  constructor(
    repositoryFactory: any,
    wsUrl: string = process.env.WEBSOCKET_URL || 'ws://localhost:3001'
  ) {
    super(repositoryFactory)
    this.wsUrl = wsUrl
  }

  /**
   * Initialize a CRDT document for collaborative editing
   */
  async initializeDocument(
    assetId: AssetId,
    organizationId: OrganizationId,
    initialContent?: string
  ): Promise<Result<Y.Doc>> {
    try {
      // Check if document already exists
      if (this.documents.has(assetId)) {
        return Result.success(this.documents.get(assetId)!)
      }

      // Create new Yjs document
      const ydoc = new Y.Doc()
      const roomId = createRoomId(`crdt_${assetId}`)

      // Initialize document structure
      const ytext = ydoc.getText('content')
      const metadata = ydoc.getMap('metadata')
      const cursors = ydoc.getMap('cursors')
      const comments = ydoc.getArray('comments')

      // Set initial content if provided
      if (initialContent) {
        ytext.insert(0, initialContent)
      }

      // Set metadata
      metadata.set('assetId', assetId)
      metadata.set('organizationId', organizationId)
      metadata.set('createdAt', new Date().toISOString())
      metadata.set('version', 1)

      // Create WebSocket provider for real-time sync
      const provider = new WebsocketProvider(
        this.wsUrl,
        roomId,
        ydoc,
        {
          connect: true,
          maxBackoffTime: 5000,
          resyncInterval: 30000
        }
      )

      // Store references
      this.documents.set(assetId, ydoc)
      this.providers.set(assetId, provider)
      this.subscriptions.set(assetId, new Set())

      // Set up event listeners
      this.setupDocumentListeners(assetId, ydoc, provider)

      await this.logActivity('crdt_document_initialized', {
        assetId,
        organizationId,
        hasInitialContent: !!initialContent
      })

      return Result.success(ydoc)

    } catch (error) {
      return Result.failure(
        'CRDT_INIT_ERROR',
        `Failed to initialize CRDT document: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get existing CRDT document
   */
  getDocument(assetId: AssetId): Result<Y.Doc | null> {
    try {
      const doc = this.documents.get(assetId) || null
      return Result.success(doc)
    } catch (error) {
      return Result.failure(
        'CRDT_GET_ERROR',
        `Failed to get CRDT document: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Apply text operation to document
   */
  async applyTextOperation(
    assetId: AssetId,
    operation: {
      type: 'insert' | 'delete' | 'format'
      position: number
      content?: string
      length?: number
      attributes?: Record<string, any>
    },
    userId: UserId
  ): Promise<Result<void>> {
    try {
      const doc = this.documents.get(assetId)
      if (!doc) {
        return Result.failure('DOCUMENT_NOT_FOUND', 'CRDT document not found')
      }

      const ytext = doc.getText('content')
      const metadata = doc.getMap('metadata')

      // Apply operation atomically
      doc.transact(() => {
        switch (operation.type) {
          case 'insert':
            if (operation.content) {
              ytext.insert(operation.position, operation.content, operation.attributes)
            }
            break

          case 'delete':
            if (operation.length) {
              ytext.delete(operation.position, operation.length)
            }
            break

          case 'format':
            if (operation.length && operation.attributes) {
              ytext.format(operation.position, operation.length, operation.attributes)
            }
            break
        }

        // Update metadata
        metadata.set('lastModifiedBy', userId)
        metadata.set('lastModifiedAt', new Date().toISOString())
        metadata.set('version', (metadata.get('version') || 0) + 1)
      }, userId)

      await this.logActivity('crdt_operation_applied', {
        assetId,
        userId,
        operation: operation.type,
        position: operation.position,
        contentLength: operation.content?.length || operation.length || 0
      })

      return Result.success(undefined)

    } catch (error) {
      return Result.failure(
        'CRDT_OPERATION_ERROR',
        `Failed to apply operation: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Update user awareness (cursor position, selection)
   */
  async updateAwareness(
    assetId: AssetId,
    userId: UserId,
    awareness: Partial<CRDTAwareness>
  ): Promise<Result<void>> {
    try {
      const provider = this.providers.get(assetId)
      if (!provider) {
        return Result.failure('PROVIDER_NOT_FOUND', 'WebSocket provider not found')
      }

      const awarenessData = {
        userId,
        timestamp: Date.now(),
        ...awareness
      }

      provider.awareness.setLocalStateField('user', awarenessData)

      return Result.success(undefined)

    } catch (error) {
      return Result.failure(
        'AWARENESS_UPDATE_ERROR',
        `Failed to update awareness: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get current document state as snapshot
   */
  async getDocumentSnapshot(assetId: AssetId): Promise<Result<DocumentSnapshot>> {
    try {
      const doc = this.documents.get(assetId)
      if (!doc) {
        return Result.failure('DOCUMENT_NOT_FOUND', 'CRDT document not found')
      }

      const ytext = doc.getText('content')
      const metadata = doc.getMap('metadata')

      const snapshot: DocumentSnapshot = {
        assetId,
        content: ytext.toString(),
        metadata: metadata.toJSON(),
        version: metadata.get('version') || 1,
        timestamp: new Date().toISOString()
      }

      return Result.success(snapshot)

    } catch (error) {
      return Result.failure(
        'SNAPSHOT_ERROR',
        `Failed to create snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Subscribe to document changes
   */
  subscribeToChanges(
    assetId: AssetId,
    callback: (event: CRDTSyncEvent) => void
  ): Result<() => void> {
    try {
      const doc = this.documents.get(assetId)
      if (!doc) {
        return Result.failure('DOCUMENT_NOT_FOUND', 'CRDT document not found')
      }

      const subscriptions = this.subscriptions.get(assetId)!

      const updateHandler = (update: Uint8Array, origin: any) => {
        callback({
          type: 'update',
          data: update,
          origin: origin?.toString()
        })
      }

      const syncHandler = (isSynced: boolean) => {
        if (isSynced) {
          callback({
            type: 'sync',
            data: new Uint8Array()
          })
        }
      }

      doc.on('update', updateHandler)
      
      const provider = this.providers.get(assetId)
      if (provider) {
        provider.on('sync', syncHandler)
      }

      subscriptions.add(updateHandler)
      subscriptions.add(syncHandler)

      // Return unsubscribe function
      const unsubscribe = () => {
        doc.off('update', updateHandler)
        if (provider) {
          provider.off('sync', syncHandler)
        }
        subscriptions.delete(updateHandler)
        subscriptions.delete(syncHandler)
      }

      return Result.success(unsubscribe)

    } catch (error) {
      return Result.failure(
        'SUBSCRIPTION_ERROR',
        `Failed to subscribe to changes: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Merge external document state
   */
  async mergeDocumentState(
    assetId: AssetId,
    externalState: Uint8Array
  ): Promise<Result<void>> {
    try {
      const doc = this.documents.get(assetId)
      if (!doc) {
        return Result.failure('DOCUMENT_NOT_FOUND', 'CRDT document not found')
      }

      Y.applyUpdate(doc, externalState)

      await this.logActivity('crdt_state_merged', {
        assetId,
        updateSize: externalState.length
      })

      return Result.success(undefined)

    } catch (error) {
      return Result.failure(
        'MERGE_ERROR',
        `Failed to merge document state: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get document update since specific state
   */
  getDocumentUpdate(assetId: AssetId, stateVector: Uint8Array): Result<Uint8Array> {
    try {
      const doc = this.documents.get(assetId)
      if (!doc) {
        return Result.failure('DOCUMENT_NOT_FOUND', 'CRDT document not found')
      }

      const update = Y.encodeStateAsUpdate(doc, stateVector)
      return Result.success(update)

    } catch (error) {
      return Result.failure(
        'UPDATE_ENCODING_ERROR',
        `Failed to encode document update: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Cleanup document resources
   */
  async cleanupDocument(assetId: AssetId): Promise<Result<void>> {
    try {
      const provider = this.providers.get(assetId)
      if (provider) {
        provider.destroy()
        this.providers.delete(assetId)
      }

      const doc = this.documents.get(assetId)
      if (doc) {
        doc.destroy()
        this.documents.delete(assetId)
      }

      this.subscriptions.delete(assetId)

      await this.logActivity('crdt_document_cleanup', { assetId })

      return Result.success(undefined)

    } catch (error) {
      return Result.failure(
        'CLEANUP_ERROR',
        `Failed to cleanup document: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Setup document event listeners
   */
  private setupDocumentListeners(
    assetId: AssetId,
    doc: Y.Doc,
    provider: WebsocketProvider
  ): void {
    // Document update handler
    doc.on('update', (update: Uint8Array, origin: any) => {
      this.handleDocumentUpdate(assetId, update, origin).catch(error => {
        console.error('Failed to handle document update:', error)
      })
    })

    // Provider connection status
    provider.on('status', (event: { status: string }) => {
      this.handleProviderStatus(assetId, event.status).catch(error => {
        console.error('Failed to handle provider status:', error)
      })
    })

    // Awareness changes
    provider.awareness.on('change', () => {
      this.handleAwarenessChange(assetId, provider.awareness).catch(error => {
        console.error('Failed to handle awareness change:', error)
      })
    })
  }

  /**
   * Handle document updates
   */
  private async handleDocumentUpdate(
    assetId: AssetId,
    update: Uint8Array,
    origin: any
  ): Promise<void> {
    await this.logActivity('crdt_document_updated', {
      assetId,
      updateSize: update.length,
      origin: origin?.toString()
    })
  }

  /**
   * Handle provider connection status changes
   */
  private async handleProviderStatus(assetId: AssetId, status: string): Promise<void> {
    await this.logActivity('crdt_provider_status', {
      assetId,
      status
    })
  }

  /**
   * Handle awareness changes (cursors, selections)
   */
  private async handleAwarenessChange(
    assetId: AssetId,
    awareness: any
  ): Promise<void> {
    const states = Array.from(awareness.getStates().values())
    
    await this.logActivity('crdt_awareness_changed', {
      assetId,
      activeUsers: states.length,
      users: states.map((state: any) => state.user?.userId).filter(Boolean)
    })
  }

  /**
   * Get conflict resolution statistics
   */
  async getConflictStats(assetId: AssetId): Promise<Result<{
    totalOperations: number
    conflictResolutions: number
    lastActivity: string
  }>> {
    try {
      const doc = this.documents.get(assetId)
      if (!doc) {
        return Result.failure('DOCUMENT_NOT_FOUND', 'CRDT document not found')
      }

      const metadata = doc.getMap('metadata')
      
      const stats = {
        totalOperations: metadata.get('version') || 0,
        conflictResolutions: metadata.get('conflicts') || 0,
        lastActivity: metadata.get('lastModifiedAt') || new Date().toISOString()
      }

      return Result.success(stats)

    } catch (error) {
      return Result.failure(
        'STATS_ERROR',
        `Failed to get conflict stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}