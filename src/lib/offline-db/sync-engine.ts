/**
 * Comprehensive Sync Engine
 * Handles bi-directional synchronization with conflict resolution
 */

'use client'

import { getOfflineDB, type OfflineGovernanceDB } from './database'
import type { SyncMetadata } from './schema'

export interface SyncOptions {
  batchSize?: number
  maxRetries?: number
  retryDelay?: number
  conflictResolution?: 'server_wins' | 'client_wins' | 'merge' | 'manual'
  priorityEntities?: string[]
  syncDirection?: 'up' | 'down' | 'both'
  onProgress?: (progress: SyncProgress) => void
  onConflict?: (conflict: SyncConflict) => Promise<ConflictResolution>
}

export interface SyncProgress {
  phase: 'initializing' | 'downloading' | 'uploading' | 'resolving_conflicts' | 'finalizing'
  entityType: string
  processed: number
  total: number
  errors: number
  conflicts: number
  percentage: number
}

export interface SyncConflict {
  entityType: string
  entityId: string
  localVersion: any
  serverVersion: any
  conflictType: 'update_conflict' | 'delete_conflict' | 'create_conflict'
  metadata: SyncMetadata
}

export interface ConflictResolution {
  strategy: 'use_local' | 'use_server' | 'merge' | 'skip'
  mergedData?: any
  reason?: string
}

export interface SyncResult {
  success: boolean
  phase: string
  processed: number
  created: number
  updated: number
  deleted: number
  errors: SyncError[]
  conflicts: SyncConflict[]
  duration: number
  dataTransferred: number
}

export interface SyncError {
  entityType: string
  entityId: string
  operation: string
  error: string
  recoverable: boolean
}

class SyncEngine {
  private db: OfflineGovernanceDB
  private abortController: AbortController | null = null
  private isRunning = false
  
  constructor() {
    this.db = getOfflineDB()
  }
  
  async startSync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync is already running')
    }
    
    this.isRunning = true
    this.abortController = new AbortController()
    
    const startTime = Date.now()
    const result: SyncResult = {
      success: false,
      phase: 'initializing',
      processed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
      conflicts: [],
      duration: 0,
      dataTransferred: 0
    }
    
    try {
      // Phase 1: Initialize and check connectivity
      result.phase = 'initializing'
      options.onProgress?.(this.createProgress('initializing', '', 0, 1))
      
      const isOnline = await this.checkConnectivity()
      if (!isOnline) {
        throw new Error('No internet connectivity available')
      }
      
      // Phase 2: Determine sync plan
      const syncPlan = await this.createSyncPlan(options)
      
      // Phase 3: Download server changes (if needed)
      if (options.syncDirection !== 'up') {
        result.phase = 'downloading'
        await this.downloadServerChanges(syncPlan, result, options)
      }
      
      // Phase 4: Upload local changes (if needed)
      if (options.syncDirection !== 'down') {
        result.phase = 'uploading'
        await this.uploadLocalChanges(syncPlan, result, options)
      }
      
      // Phase 5: Resolve conflicts
      if (result.conflicts.length > 0) {
        result.phase = 'resolving_conflicts'
        await this.resolveConflicts(result.conflicts, result, options)
      }
      
      // Phase 6: Finalize
      result.phase = 'finalizing'
      await this.finalizSync(result)
      
      result.success = true
      result.duration = Date.now() - startTime
      
    } catch (error) {
      console.error('Sync failed:', error)
      result.errors.push({
        entityType: 'system',
        entityId: 'sync_engine',
        operation: result.phase,
        error: error instanceof Error ? error.message : String(error),
        recoverable: false
      })
    } finally {
      this.isRunning = false
      this.abortController = null
    }
    
    return result
  }
  
  stopSync(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }
  
  private async checkConnectivity(): Promise<boolean> {
    try {
      // Try to reach the API health endpoint
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: this.abortController?.signal,
        timeout: 5000
      } as RequestInit)
      return response.ok
    } catch (error) {
      console.error('Connectivity check failed:', error)
      return false
    }
  }
  
  private async createSyncPlan(options: SyncOptions): Promise<SyncPlan> {
    const entities = options.priorityEntities || [
      'meetings', 'documents', 'votes', 'annotations', 
      'participants', 'compliance_items'
    ]
    
    const plan: SyncPlan = {
      entities,
      batchSize: options.batchSize || 50,
      totalEstimate: 0
    }
    
    // Estimate total work
    for (const entityType of entities) {
      const table = this.db[entityType as keyof OfflineGovernanceDB] as any
      if (table) {
        const count = await table.where('sync_status').anyOf(['pending', 'conflict']).count()
        plan.totalEstimate += count
      }
    }
    
    return plan
  }
  
  private async downloadServerChanges(
    plan: SyncPlan, 
    result: SyncResult, 
    options: SyncOptions
  ): Promise<void> {
    for (const entityType of plan.entities) {
      if (this.abortController?.signal.aborted) break
      
      try {
        const serverChanges = await this.fetchServerChanges(entityType)
        await this.applyServerChanges(entityType, serverChanges, result, options)
        
        options.onProgress?.(this.createProgress(
          'downloading', 
          entityType, 
          result.processed, 
          plan.totalEstimate
        ))
        
      } catch (error) {
        result.errors.push({
          entityType,
          entityId: 'batch',
          operation: 'download',
          error: error instanceof Error ? error.message : String(error),
          recoverable: true
        })
      }
    }
  }
  
  private async uploadLocalChanges(
    plan: SyncPlan, 
    result: SyncResult, 
    options: SyncOptions
  ): Promise<void> {
    for (const entityType of plan.entities) {
      if (this.abortController?.signal.aborted) break
      
      try {
        const localChanges = await this.getLocalChanges(entityType, plan.batchSize)
        await this.uploadChanges(entityType, localChanges, result, options)
        
        options.onProgress?.(this.createProgress(
          'uploading', 
          entityType, 
          result.processed, 
          plan.totalEstimate
        ))
        
      } catch (error) {
        result.errors.push({
          entityType,
          entityId: 'batch',
          operation: 'upload',
          error: error instanceof Error ? error.message : String(error),
          recoverable: true
        })
      }
    }
  }
  
  private async fetchServerChanges(entityType: string): Promise<any[]> {
    const lastSync = await this.getLastSyncTimestamp(entityType)
    const response = await fetch(`/api/sync/${entityType}?since=${lastSync}`, {
      method: 'GET',
      signal: this.abortController?.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      throw new Error(`Server request failed: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  private async applyServerChanges(
    entityType: string,
    serverChanges: any[],
    result: SyncResult,
    options: SyncOptions
  ): Promise<void> {
    const table = this.db[entityType as keyof OfflineGovernanceDB] as any
    if (!table) return
    
    for (const serverItem of serverChanges) {
      try {
        const existingItem = await table.get(serverItem.id)
        
        if (!existingItem) {
          // Create new item
          await table.add({
            ...serverItem,
            sync_status: 'synced',
            last_synced: new Date().toISOString(),
            offline_changes: false
          })
          result.created++
        } else if (!existingItem.offline_changes) {
          // Update item (no local changes)
          await table.update(serverItem.id, {
            ...serverItem,
            sync_status: 'synced',
            last_synced: new Date().toISOString(),
            offline_changes: false
          })
          result.updated++
        } else {
          // Conflict detected
          const conflict: SyncConflict = {
            entityType,
            entityId: serverItem.id,
            localVersion: existingItem,
            serverVersion: serverItem,
            conflictType: 'update_conflict',
            metadata: await this.getSyncMetadata(entityType, serverItem.id)
          }
          result.conflicts.push(conflict)
        }
        
        result.processed++
        
      } catch (error) {
        result.errors.push({
          entityType,
          entityId: serverItem.id,
          operation: 'apply_server_change',
          error: error instanceof Error ? error.message : String(error),
          recoverable: true
        })
      }
    }
  }
  
  private async getLocalChanges(entityType: string, batchSize: number): Promise<any[]> {
    const table = this.db[entityType as keyof OfflineGovernanceDB] as any
    if (!table) return []
    
    return table
      .where('sync_status')
      .anyOf(['pending', 'failed'])
      .limit(batchSize)
      .toArray()
  }
  
  private async uploadChanges(
    entityType: string,
    localChanges: any[],
    result: SyncResult,
    options: SyncOptions
  ): Promise<void> {
    if (localChanges.length === 0) return
    
    const response = await fetch(`/api/sync/${entityType}`, {
      method: 'POST',
      signal: this.abortController?.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(localChanges)
    })
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }
    
    const uploadResult = await response.json()
    const table = this.db[entityType as keyof OfflineGovernanceDB] as any
    
    // Update sync status for successfully uploaded items
    for (const item of uploadResult.success || []) {
      await table.update(item.id, {
        sync_status: 'synced',
        last_synced: new Date().toISOString(),
        offline_changes: false
      })
      result.updated++
    }
    
    // Handle upload errors
    for (const error of uploadResult.errors || []) {
      result.errors.push({
        entityType,
        entityId: error.id,
        operation: 'upload',
        error: error.message,
        recoverable: error.recoverable || false
      })
      
      // Update retry count
      await this.incrementRetryCount(entityType, error.id)
    }
    
    result.processed += localChanges.length
  }
  
  private async resolveConflicts(
    conflicts: SyncConflict[],
    result: SyncResult,
    options: SyncOptions
  ): Promise<void> {
    for (const conflict of conflicts) {
      try {
        let resolution: ConflictResolution
        
        if (options.onConflict) {
          resolution = await options.onConflict(conflict)
        } else {
          resolution = this.getDefaultResolution(conflict, options.conflictResolution)
        }
        
        await this.applyConflictResolution(conflict, resolution)
        
      } catch (error) {
        result.errors.push({
          entityType: conflict.entityType,
          entityId: conflict.entityId,
          operation: 'resolve_conflict',
          error: error instanceof Error ? error.message : String(error),
          recoverable: false
        })
      }
    }
  }
  
  private getDefaultResolution(
    conflict: SyncConflict, 
    strategy?: string
  ): ConflictResolution {
    switch (strategy) {
      case 'server_wins':
        return { strategy: 'use_server', reason: 'Default server wins policy' }
      case 'client_wins':
        return { strategy: 'use_local', reason: 'Default client wins policy' }
      case 'merge':
        return {
          strategy: 'merge',
          mergedData: this.mergeObjects(conflict.localVersion, conflict.serverVersion),
          reason: 'Automatic merge'
        }
      default:
        // Default to server wins for safety
        return { strategy: 'use_server', reason: 'Default fallback policy' }
    }
  }
  
  private mergeObjects(local: any, server: any): any {
    // Simple merge strategy - in production, this would be more sophisticated
    return {
      ...local,
      ...server,
      // Keep local offline changes
      offline_changes: local.offline_changes,
      // Use most recent timestamp
      updated_at: local.updated_at > server.updated_at ? local.updated_at : server.updated_at,
      // Merge arrays
      ...(local.tags && server.tags ? { tags: [...new Set([...local.tags, ...server.tags])] } : {}),
      ...(local.participants && server.participants ? { 
        participants: [...new Set([...local.participants, ...server.participants])] 
      } : {})
    }
  }
  
  private async applyConflictResolution(
    conflict: SyncConflict,
    resolution: ConflictResolution
  ): Promise<void> {
    const table = this.db[conflict.entityType as keyof OfflineGovernanceDB] as any
    if (!table) return
    
    let finalData: any
    
    switch (resolution.strategy) {
      case 'use_server':
        finalData = {
          ...conflict.serverVersion,
          sync_status: 'synced',
          last_synced: new Date().toISOString(),
          offline_changes: false
        }
        break
      case 'use_local':
        finalData = {
          ...conflict.localVersion,
          sync_status: 'pending', // Will be uploaded in next sync
          offline_changes: true
        }
        break
      case 'merge':
        finalData = {
          ...resolution.mergedData,
          sync_status: 'pending', // Merged data needs to be uploaded
          last_synced: new Date().toISOString(),
          offline_changes: true
        }
        break
      case 'skip':
        // Mark as conflict for manual resolution
        finalData = {
          ...conflict.localVersion,
          sync_status: 'conflict'
        }
        break
    }
    
    await table.update(conflict.entityId, finalData)
    
    // Update sync metadata
    await this.updateSyncMetadata(conflict.entityType, conflict.entityId, {
      sync_status: finalData.sync_status,
      last_sync_timestamp: new Date().toISOString(),
      conflict_resolution_strategy: resolution.strategy
    })
  }
  
  private async finalizSync(result: SyncResult): Promise<void> {
    // Update global sync timestamp
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_full_sync', new Date().toISOString())
    }
    
    // Perform database maintenance
    await this.db.performMaintenance()
    
    console.log('Sync completed:', result)
  }
  
  private createProgress(
    phase: string,
    entityType: string,
    processed: number,
    total: number
  ): SyncProgress {
    return {
      phase: phase as any,
      entityType,
      processed,
      total,
      errors: 0,
      conflicts: 0,
      percentage: total > 0 ? Math.round((processed / total) * 100) : 0
    }
  }
  
  private async getLastSyncTimestamp(entityType: string): Promise<string> {
    const metadata = await this.db.sync_metadata
      .where('[entity_type+last_sync_timestamp]')
      .between([entityType, ''], [entityType, 'zzz'])
      .reverse()
      .first()
    
    return metadata?.last_sync_timestamp || '1970-01-01T00:00:00Z'
  }
  
  private async getSyncMetadata(entityType: string, entityId: string): Promise<SyncMetadata> {
    const existing = await this.db.sync_metadata
      .where({ entity_type: entityType, entity_id: entityId })
      .first()
    
    if (existing) return existing
    
    // Create new metadata
    const metadata: SyncMetadata = {
      id: `${entityType}_${entityId}_${Date.now()}`,
      entity_type: entityType as any,
      entity_id: entityId,
      last_server_version: 0,
      last_local_version: 1,
      last_sync_timestamp: new Date().toISOString(),
      sync_status: 'pending',
      conflict_resolution_strategy: 'server_wins',
      change_vector: '',
      retry_count: 0,
      max_retries: 3,
      client_metadata: {},
      server_metadata: {}
    }
    
    await this.db.sync_metadata.add(metadata)
    return metadata
  }
  
  private async updateSyncMetadata(
    entityType: string,
    entityId: string,
    updates: Partial<SyncMetadata>
  ): Promise<void> {
    await this.db.sync_metadata
      .where({ entity_type: entityType, entity_id: entityId })
      .modify(updates)
  }
  
  private async incrementRetryCount(entityType: string, entityId: string): Promise<void> {
    const metadata = await this.getSyncMetadata(entityType, entityId)
    const newRetryCount = metadata.retry_count + 1
    
    await this.updateSyncMetadata(entityType, entityId, {
      retry_count: newRetryCount,
      sync_status: newRetryCount >= metadata.max_retries ? 'failed' : 'pending',
      next_retry_at: new Date(Date.now() + Math.pow(2, newRetryCount) * 1000).toISOString()
    })
  }
}

interface SyncPlan {
  entities: string[]
  batchSize: number
  totalEstimate: number
}

// Singleton instance
let syncEngineInstance: SyncEngine | null = null

export function getSyncEngine(): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine()
  }
  return syncEngineInstance
}

export { SyncEngine }