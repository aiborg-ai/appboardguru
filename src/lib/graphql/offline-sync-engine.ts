/**
 * Offline Sync Engine with Conflict Resolution
 * Handles data synchronization between offline and online states
 */

import { createSupabaseServerClient } from '@/lib/supabase-server';

export interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: string;
  data: any;
  timestamp: number;
  userId: string;
  retry_count: number;
  status: 'QUEUED' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'CONFLICT';
  conflict_resolution?: 'CLIENT_WINS' | 'SERVER_WINS' | 'MERGE' | 'MANUAL';
}

export interface ConflictResolution {
  operationId: string;
  strategy: 'CLIENT_WINS' | 'SERVER_WINS' | 'MERGE' | 'MANUAL';
  clientData: any;
  serverData: any;
  mergedData?: any;
  timestamp: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number | null;
  pendingOperations: number;
  queuedOperations: number;
  failedOperations: number;
  conflictedOperations: number;
  estimatedSyncTime: number;
}

export class OfflineSyncEngine {
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private conflictHandlers = new Map<string, Function>();
  private syncListeners = new Set<Function>();

  constructor() {
    this.initializeDatabase();
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BoardGuruSync', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sync operations store
        if (!db.objectStoreNames.contains('sync_operations')) {
          const operationsStore = db.createObjectStore('sync_operations', { keyPath: 'id' });
          operationsStore.createIndex('entity', 'entity', { unique: false });
          operationsStore.createIndex('status', 'status', { unique: false });
          operationsStore.createIndex('timestamp', 'timestamp', { unique: false });
          operationsStore.createIndex('userId', 'userId', { unique: false });
        }

        // Create conflict resolutions store
        if (!db.objectStoreNames.contains('conflict_resolutions')) {
          const conflictsStore = db.createObjectStore('conflict_resolutions', { keyPath: 'operationId' });
          conflictsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create sync metadata store
        if (!db.objectStoreNames.contains('sync_metadata')) {
          const metadataStore = db.createObjectStore('sync_metadata', { keyPath: 'key' });
        }

        // Create cached data store for offline access
        if (!db.objectStoreNames.contains('cached_data')) {
          const cacheStore = db.createObjectStore('cached_data', { keyPath: 'key' });
          cacheStore.createIndex('entity', 'entity', { unique: false });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Queue an operation for sync
   */
  async queueOperation(operation: Omit<SyncOperation, 'id' | 'retry_count' | 'status'>): Promise<SyncOperation> {
    const fullOperation: SyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      retry_count: 0,
      status: 'QUEUED',
    };

    await this.storeOperation(fullOperation);
    
    // Trigger sync if online
    if (navigator.onLine) {
      this.scheduleSync();
    }

    this.notifyListeners('operation-queued', fullOperation);
    return fullOperation;
  }

  /**
   * Process sync queue
   */
  async processQueue(userId: string): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners('sync-started');

    try {
      const operations = await this.getQueuedOperations(userId);
      
      for (const operation of operations) {
        try {
          await this.processOperation(operation);
        } catch (error) {
          console.error(`Failed to process operation ${operation.id}:`, error);
          await this.markOperationFailed(operation.id);
        }
      }

      await this.updateLastSyncTime(userId);
      this.notifyListeners('sync-completed');

    } catch (error) {
      console.error('Sync queue processing failed:', error);
      this.notifyListeners('sync-failed', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process individual sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    await this.updateOperationStatus(operation.id, 'SYNCING');
    
    try {
      const supabase = createSupabaseServerClient();
      let result;

      switch (operation.type) {
        case 'CREATE':
          result = await this.processCreateOperation(supabase, operation);
          break;
        case 'UPDATE':
          result = await this.processUpdateOperation(supabase, operation);
          break;
        case 'DELETE':
          result = await this.processDeleteOperation(supabase, operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      if (result.conflict) {
        await this.handleConflict(operation, result.serverData);
      } else {
        await this.markOperationCompleted(operation.id);
        this.notifyListeners('operation-completed', operation);
      }

    } catch (error) {
      await this.incrementRetryCount(operation.id);
      throw error;
    }
  }

  /**
   * Process CREATE operation
   */
  private async processCreateOperation(supabase: any, operation: SyncOperation): Promise<any> {
    const { data, error } = await supabase
      .from(operation.entity)
      .insert(operation.data)
      .select()
      .single();

    if (error) {
      // Check for unique constraint violations (conflicts)
      if (error.code === '23505') {
        const { data: existingData } = await supabase
          .from(operation.entity)
          .select()
          .eq('id', operation.data.id)
          .single();

        return { conflict: true, serverData: existingData };
      }
      throw error;
    }

    return { data, conflict: false };
  }

  /**
   * Process UPDATE operation
   */
  private async processUpdateOperation(supabase: any, operation: SyncOperation): Promise<any> {
    // First, get current server data
    const { data: serverData, error: fetchError } = await supabase
      .from(operation.entity)
      .select()
      .eq('id', operation.entityId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Check for conflicts based on timestamp
    if (this.hasConflict(operation.data, serverData)) {
      return { conflict: true, serverData };
    }

    // Perform the update
    const { data, error } = await supabase
      .from(operation.entity)
      .update(operation.data)
      .eq('id', operation.entityId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, conflict: false };
  }

  /**
   * Process DELETE operation
   */
  private async processDeleteOperation(supabase: any, operation: SyncOperation): Promise<any> {
    const { error } = await supabase
      .from(operation.entity)
      .delete()
      .eq('id', operation.entityId);

    if (error) {
      // If record doesn't exist, it might have been deleted already
      if (error.code === 'PGRST116') {
        return { data: null, conflict: false };
      }
      throw error;
    }

    return { data: null, conflict: false };
  }

  /**
   * Check for data conflicts
   */
  private hasConflict(clientData: any, serverData: any): boolean {
    // Simple timestamp-based conflict detection
    if (clientData.updated_at && serverData.updated_at) {
      return new Date(serverData.updated_at) > new Date(clientData.updated_at);
    }

    // Version-based conflict detection
    if (clientData.version && serverData.version) {
      return serverData.version > clientData.version;
    }

    return false;
  }

  /**
   * Handle conflict resolution
   */
  private async handleConflict(operation: SyncOperation, serverData: any): Promise<void> {
    await this.updateOperationStatus(operation.id, 'CONFLICT');

    const conflictResolution: ConflictResolution = {
      operationId: operation.id,
      strategy: 'MANUAL', // Default to manual resolution
      clientData: operation.data,
      serverData,
      timestamp: Date.now(),
    };

    // Check for registered conflict handlers
    const handler = this.conflictHandlers.get(operation.entity);
    if (handler) {
      try {
        const resolution = await handler(conflictResolution);
        conflictResolution.strategy = resolution.strategy;
        conflictResolution.mergedData = resolution.mergedData;
      } catch (error) {
        console.error('Conflict handler failed:', error);
      }
    }

    await this.storeConflictResolution(conflictResolution);
    
    // Apply automatic resolution if strategy is determined
    if (conflictResolution.strategy !== 'MANUAL') {
      await this.resolveConflict(conflictResolution);
    }

    this.notifyListeners('conflict-detected', conflictResolution);
  }

  /**
   * Resolve conflict based on strategy
   */
  async resolveConflict(resolution: ConflictResolution): Promise<void> {
    const operation = await this.getOperation(resolution.operationId);
    if (!operation) {
      throw new Error(`Operation ${resolution.operationId} not found`);
    }

    let finalData: any;

    switch (resolution.strategy) {
      case 'CLIENT_WINS':
        finalData = resolution.clientData;
        break;
      case 'SERVER_WINS':
        finalData = resolution.serverData;
        await this.updateCachedData(operation.entity, operation.entityId, finalData);
        await this.markOperationCompleted(operation.id);
        return;
      case 'MERGE':
        finalData = resolution.mergedData || this.mergeData(resolution.clientData, resolution.serverData);
        break;
      default:
        throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
    }

    // Apply the resolution
    try {
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase
        .from(operation.entity)
        .update(finalData)
        .eq('id', operation.entityId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await this.updateCachedData(operation.entity, operation.entityId, data);
      await this.markOperationCompleted(operation.id);
      this.notifyListeners('conflict-resolved', resolution);

    } catch (error) {
      console.error('Failed to apply conflict resolution:', error);
      throw error;
    }
  }

  /**
   * Merge data using default strategy
   */
  private mergeData(clientData: any, serverData: any): any {
    // Simple merge strategy - prefer client data for most fields
    const merged = { ...serverData };

    Object.keys(clientData).forEach(key => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        merged[key] = clientData[key];
      }
    });

    // Update timestamp
    merged.updated_at = new Date().toISOString();

    return merged;
  }

  /**
   * Register conflict handler for entity type
   */
  registerConflictHandler(entityType: string, handler: Function): void {
    this.conflictHandlers.set(entityType, handler);
  }

  /**
   * Get global sync status
   */
  async getGlobalSyncStatus(userId: string): Promise<SyncStatus> {
    const [pending, queued, failed, conflicted] = await Promise.all([
      this.getOperationCount(userId, 'SYNCING'),
      this.getOperationCount(userId, 'QUEUED'),
      this.getOperationCount(userId, 'FAILED'),
      this.getOperationCount(userId, 'CONFLICT'),
    ]);

    const lastSyncTime = await this.getLastSyncTime(userId);
    const estimatedSyncTime = this.estimateSyncTime(pending + queued);

    return {
      isOnline: navigator.onLine,
      lastSyncTime,
      pendingOperations: pending,
      queuedOperations: queued,
      failedOperations: failed,
      conflictedOperations: conflicted,
      estimatedSyncTime,
    };
  }

  /**
   * Get offline operation queue
   */
  async getOfflineQueue(userId: string): Promise<{
    operations: SyncOperation[];
    totalSize: number;
    estimatedSyncTime: number;
  }> {
    const operations = await this.getAllOperations(userId);
    const estimatedSyncTime = this.estimateSyncTime(operations.length);

    return {
      operations,
      totalSize: operations.length,
      estimatedSyncTime,
    };
  }

  /**
   * Cache data for offline access
   */
  async cacheData(entity: string, entityId: string, data: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['cached_data'], 'readwrite');
    const store = transaction.objectStore('cached_data');

    const cacheEntry = {
      key: `${entity}:${entityId}`,
      entity,
      entityId,
      data,
      timestamp: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(cacheEntry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached data
   */
  async getCachedData(entity: string, entityId?: string): Promise<any> {
    if (!this.db) {
      return null;
    }

    const transaction = this.db.transaction(['cached_data'], 'readonly');
    const store = transaction.objectStore('cached_data');

    if (entityId) {
      const key = `${entity}:${entityId}`;
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.data);
        request.onerror = () => reject(request.error);
      });
    } else {
      // Get all cached data for entity type
      return new Promise((resolve, reject) => {
        const index = store.index('entity');
        const request = index.getAll(entity);
        request.onsuccess = () => {
          const results = request.result.map(item => item.data);
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Database operation helpers
   */
  private async storeOperation(operation: SyncOperation): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['sync_operations'], 'readwrite');
    const store = transaction.objectStore('sync_operations');

    return new Promise<void>((resolve, reject) => {
      const request = store.put(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getOperation(operationId: string): Promise<SyncOperation | null> {
    if (!this.db) {
      return null;
    }

    const transaction = this.db.transaction(['sync_operations'], 'readonly');
    const store = transaction.objectStore('sync_operations');

    return new Promise((resolve, reject) => {
      const request = store.get(operationId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async getQueuedOperations(userId: string): Promise<SyncOperation[]> {
    if (!this.db) {
      return [];
    }

    const transaction = this.db.transaction(['sync_operations'], 'readonly');
    const store = transaction.objectStore('sync_operations');
    const index = store.index('status');

    return new Promise((resolve, reject) => {
      const request = index.getAll('QUEUED');
      request.onsuccess = () => {
        const operations = request.result.filter(op => op.userId === userId);
        operations.sort((a, b) => a.timestamp - b.timestamp);
        resolve(operations);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllOperations(userId: string): Promise<SyncOperation[]> {
    if (!this.db) {
      return [];
    }

    const transaction = this.db.transaction(['sync_operations'], 'readonly');
    const store = transaction.objectStore('sync_operations');
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getOperationCount(userId: string, status: string): Promise<number> {
    if (!this.db) {
      return 0;
    }

    const transaction = this.db.transaction(['sync_operations'], 'readonly');
    const store = transaction.objectStore('sync_operations');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const count = request.result.filter(op => 
          op.userId === userId && op.status === status
        ).length;
        resolve(count);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async updateOperationStatus(operationId: string, status: string): Promise<void> {
    const operation = await this.getOperation(operationId);
    if (operation) {
      operation.status = status as any;
      await this.storeOperation(operation);
    }
  }

  private async markOperationCompleted(operationId: string): Promise<void> {
    await this.updateOperationStatus(operationId, 'COMPLETED');
  }

  private async markOperationFailed(operationId: string): Promise<void> {
    await this.updateOperationStatus(operationId, 'FAILED');
  }

  private async incrementRetryCount(operationId: string): Promise<void> {
    const operation = await this.getOperation(operationId);
    if (operation) {
      operation.retry_count++;
      
      // Mark as failed after max retries
      if (operation.retry_count >= 5) {
        operation.status = 'FAILED';
      }
      
      await this.storeOperation(operation);
    }
  }

  private async storeConflictResolution(resolution: ConflictResolution): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(['conflict_resolutions'], 'readwrite');
    const store = transaction.objectStore('conflict_resolutions');

    return new Promise<void>((resolve, reject) => {
      const request = store.put(resolution);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateCachedData(entity: string, entityId: string, data: any): Promise<void> {
    await this.cacheData(entity, entityId, data);
  }

  private async getLastSyncTime(userId: string): Promise<number | null> {
    if (!this.db) {
      return null;
    }

    const transaction = this.db.transaction(['sync_metadata'], 'readonly');
    const store = transaction.objectStore('sync_metadata');

    return new Promise((resolve, reject) => {
      const request = store.get(`last_sync:${userId}`);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async updateLastSyncTime(userId: string): Promise<void> {
    if (!this.db) {
      return;
    }

    const transaction = this.db.transaction(['sync_metadata'], 'readwrite');
    const store = transaction.objectStore('sync_metadata');

    const metadata = {
      key: `last_sync:${userId}`,
      value: Date.now(),
    };

    return new Promise<void>((resolve, reject) => {
      const request = store.put(metadata);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private estimateSyncTime(operationCount: number): number {
    // Estimate ~500ms per operation
    return operationCount * 500;
  }

  private generateOperationId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private scheduleSync(): void {
    // Debounce sync operations
    setTimeout(() => {
      if (navigator.onLine && !this.syncInProgress) {
        // In a real implementation, you'd get the current user ID
        this.processQueue('current-user-id');
      }
    }, 1000);
  }

  /**
   * Event listener management
   */
  onSyncEvent(callback: Function): void {
    this.syncListeners.add(callback);
  }

  offSyncEvent(callback: Function): void {
    this.syncListeners.delete(callback);
  }

  private notifyListeners(event: string, data?: any): void {
    this.syncListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Sync event listener error:', error);
      }
    });
  }

  /**
   * Request sync for specific scope
   */
  async requestSync(userId: string, scope: 'ALL' | 'ORGANIZATION' | 'ASSETS_ONLY' | 'PREFERENCES_ONLY', priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL'): Promise<{
    id: string;
    estimatedDuration: number;
    priority: string;
    queuePosition: number;
  }> {
    // For now, just trigger a full sync
    await this.processQueue(userId);
    
    return {
      id: this.generateOperationId(),
      estimatedDuration: 5000, // 5 seconds
      priority,
      queuePosition: 0,
    };
  }
}

export default OfflineSyncEngine;