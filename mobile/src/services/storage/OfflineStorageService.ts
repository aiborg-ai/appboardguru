/**
 * Offline Storage Service
 * Enterprise-grade offline storage with WatermelonDB and encryption
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Platform } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';

import type { 
  Result, 
  OfflineAction, 
  OfflineActionId, 
  CacheKey,
  OfflineStorageInfo,
  SyncStatus,
} from '@/types/mobile';
import { OFFLINE, PERFORMANCE } from '@/config/constants';
import { Environment } from '@/config/env';
import { createLogger } from '@/utils/logger';

// Import schema and models
import { schema } from './schema/database.schema';
import { 
  OfflineActionModel,
  CachedDataModel,
  SyncLogModel,
  UserDataModel,
  AssetDataModel,
  MeetingDataModel,
  NotificationDataModel,
} from './models';

const logger = createLogger('OfflineStorageService');

export class OfflineStorageService {
  private database: Database | null = null;
  private isInitialized = false;
  private syncInProgress = false;
  private readonly maxStorageSize = Environment.offlineStorageQuotaBytes;

  /**
   * Initialize the offline database
   */
  async initialize(): Promise<Result<void>> {
    try {
      if (this.isInitialized && this.database) {
        return { success: true, data: undefined };
      }

      logger.info('Initializing offline storage database');

      // Configure SQLite adapter with encryption
      const adapter = new SQLiteAdapter({
        schema,
        jsi: Platform.OS === 'ios',
        onSetUpError: (error) => {
          logger.error('Database setup error', { error });
        },
        // Enable encryption in production
        encryptionKey: Environment.isProduction ? await this.getEncryptionKey() : undefined,
      });

      // Create database instance
      this.database = new Database({
        adapter,
        modelClasses: [
          OfflineActionModel,
          CachedDataModel,
          SyncLogModel,
          UserDataModel,
          AssetDataModel,
          MeetingDataModel,
          NotificationDataModel,
        ],
      });

      // Perform initial cleanup
      await this.performMaintenanceTasks();

      this.isInitialized = true;
      logger.info('Offline storage database initialized successfully');

      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to initialize offline storage', { error });
      return {
        success: false,
        error: {
          code: 'STORAGE_INIT_FAILED',
          message: 'Failed to initialize offline storage',
          details: error,
        },
      };
    }
  }

  /**
   * Queue an action for offline processing
   */
  async queueAction(action: OfflineAction): Promise<Result<void>> {
    try {
      if (!this.database) {
        throw new Error('Database not initialized');
      }

      logger.info('Queueing offline action', { 
        actionId: action.id, 
        type: action.type,
        priority: action.priority,
      });

      await this.database.write(async () => {
        await this.database!.collections
          .get<OfflineActionModel>('offline_actions')
          .create((offlineAction) => {
            offlineAction.actionId = action.id;
            offlineAction.actionType = action.type;
            offlineAction.data = JSON.stringify(action.data);
            offlineAction.priority = action.priority;
            offlineAction.retryCount = action.retryCount;
            offlineAction.createdAt = action.timestamp;
          });
      });

      // Check storage quota
      await this.checkStorageQuota();

      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to queue offline action', { error, actionId: action.id });
      return {
        success: false,
        error: {
          code: 'ACTION_QUEUE_FAILED',
          message: 'Failed to queue offline action',
          details: error,
        },
      };
    }
  }

  /**
   * Get all queued actions
   */
  async getQueuedActions(): Promise<Result<OfflineAction[]>> {
    try {
      if (!this.database) {
        throw new Error('Database not initialized');
      }

      const offlineActions = await this.database.collections
        .get<OfflineActionModel>('offline_actions')
        .query()
        .fetch();

      const actions: OfflineAction[] = offlineActions.map(action => ({
        id: action.actionId as OfflineActionId,
        type: action.actionType as OfflineAction['type'],
        data: JSON.parse(action.data),
        timestamp: action.createdAt,
        retryCount: action.retryCount,
        priority: action.priority as OfflineAction['priority'],
      }));

      // Sort by priority and timestamp
      actions.sort((a, b) => {
        const priorityOrder = { critical: 1, high: 2, normal: 3, low: 4 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.timestamp - b.timestamp;
      });

      return { success: true, data: actions };
    } catch (error) {
      logger.error('Failed to get queued actions', { error });
      return {
        success: false,
        error: {
          code: 'ACTION_RETRIEVAL_FAILED',
          message: 'Failed to retrieve queued actions',
          details: error,
        },
      };
    }
  }

  /**
   * Remove action from queue
   */
  async removeAction(actionId: OfflineActionId): Promise<Result<void>> {
    try {
      if (!this.database) {
        throw new Error('Database not initialized');
      }

      await this.database.write(async () => {
        const action = await this.database!.collections
          .get<OfflineActionModel>('offline_actions')
          .find(actionId);
        
        await action.destroyPermanently();
      });

      logger.info('Offline action removed', { actionId });
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to remove offline action', { error, actionId });
      return {
        success: false,
        error: {
          code: 'ACTION_REMOVAL_FAILED',
          message: 'Failed to remove offline action',
          details: error,
        },
      };
    }
  }

  /**
   * Increment retry count for failed action
   */
  async incrementRetryCount(actionId: OfflineActionId): Promise<Result<void>> {
    try {
      if (!this.database) {
        throw new Error('Database not initialized');
      }

      await this.database.write(async () => {
        const action = await this.database!.collections
          .get<OfflineActionModel>('offline_actions')
          .find(actionId);
        
        await action.update((updatedAction) => {
          updatedAction.retryCount = action.retryCount + 1;
          updatedAction.lastRetryAt = Date.now();
        });
      });

      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to increment retry count', { error, actionId });
      return {
        success: false,
        error: {
          code: 'RETRY_COUNT_UPDATE_FAILED',
          message: 'Failed to update retry count',
          details: error,
        },
      };
    }
  }

  /**
   * Cache data with TTL
   */
  async cacheData<T>(
    key: CacheKey | string, 
    data: T, 
    ttl: number = 5 * 60 * 1000
  ): Promise<Result<void>> {
    try {
      if (!this.database) {
        throw new Error('Database not initialized');
      }

      const expiresAt = Date.now() + ttl;

      await this.database.write(async () => {
        // Try to find existing cache entry
        try {
          const existing = await this.database!.collections
            .get<CachedDataModel>('cached_data')
            .find(key as string);
          
          // Update existing
          await existing.update((cachedData) => {
            cachedData.data = JSON.stringify(data);
            cachedData.expiresAt = expiresAt;
            cachedData.updatedAt = Date.now();
          });
        } catch {
          // Create new entry
          await this.database!.collections
            .get<CachedDataModel>('cached_data')
            .create((cachedData) => {
              cachedData._raw.id = key as string;
              cachedData.cacheKey = key as string;
              cachedData.data = JSON.stringify(data);
              cachedData.expiresAt = expiresAt;
              cachedData.createdAt = Date.now();
              cachedData.updatedAt = Date.now();
            });
        }
      });

      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to cache data', { error, key });
      return {
        success: false,
        error: {
          code: 'CACHE_STORAGE_FAILED',
          message: 'Failed to cache data',
          details: error,
        },
      };
    }
  }

  /**
   * Get cached data
   */
  async getCachedData<T>(key: CacheKey | string): Promise<Result<T | null>> {
    try {
      if (!this.database) {
        throw new Error('Database not initialized');
      }

      const cached = await this.database.collections
        .get<CachedDataModel>('cached_data')
        .find(key as string);

      // Check if expired
      if (cached.expiresAt <= Date.now()) {
        await this.invalidateCache(key);
        return { success: true, data: null };
      }

      const data = JSON.parse(cached.data) as T;
      return { success: true, data };
    } catch (error) {
      // If not found, return null instead of error
      if (error.message?.includes('not find')) {
        return { success: true, data: null };
      }

      logger.error('Failed to get cached data', { error, key });
      return {
        success: false,
        error: {
          code: 'CACHE_RETRIEVAL_FAILED',
          message: 'Failed to retrieve cached data',
          details: error,
        },
      };
    }
  }

  /**
   * Get cached response (alias for getCachedData for API responses)
   */
  async getCachedResponse<T>(url: string): Promise<Result<T | null>> {
    const cacheKey = `api_response_${this.hashUrl(url)}`;
    return this.getCachedData<T>(cacheKey);
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidateCache(key: CacheKey | string): Promise<void> {
    try {
      if (!this.database) {
        return;
      }

      await this.database.write(async () => {
        try {
          const cached = await this.database!.collections
            .get<CachedDataModel>('cached_data')
            .find(key as string);
          
          await cached.destroyPermanently();
          logger.debug('Cache entry invalidated', { key });
        } catch {
          // Entry doesn't exist, which is fine
        }
      });
    } catch (error) {
      logger.warn('Failed to invalidate cache entry', { error, key });
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (!this.database) {
        return;
      }

      // Convert pattern to regex (simple glob-style)
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`);

      const allCached = await this.database.collections
        .get<CachedDataModel>('cached_data')
        .query()
        .fetch();

      const toDelete = allCached.filter(cached => regex.test(cached.cacheKey));

      if (toDelete.length > 0) {
        await this.database.write(async () => {
          await Promise.all(toDelete.map(cached => cached.destroyPermanently()));
        });

        logger.debug('Cache entries invalidated by pattern', { 
          pattern, 
          count: toDelete.length 
        });
      }
    } catch (error) {
      logger.warn('Failed to invalidate cache by pattern', { error, pattern });
    }
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<Result<OfflineStorageInfo>> {
    try {
      if (!this.database) {
        throw new Error('Database not initialized');
      }

      // Get count of each table
      const [
        actionCount,
        cacheCount,
        userDataCount,
        assetDataCount,
        meetingDataCount,
        notificationCount,
      ] = await Promise.all([
        this.database.collections.get('offline_actions').query().fetchCount(),
        this.database.collections.get('cached_data').query().fetchCount(),
        this.database.collections.get('user_data').query().fetchCount(),
        this.database.collections.get('asset_data').query().fetchCount(),
        this.database.collections.get('meeting_data').query().fetchCount(),
        this.database.collections.get('notification_data').query().fetchCount(),
      ]);

      // Rough estimation of used storage (each record ~1KB average)
      const totalRecords = actionCount + cacheCount + userDataCount + 
                          assetDataCount + meetingDataCount + notificationCount;
      const estimatedUsedBytes = totalRecords * 1024; // 1KB per record average
      const usedSizeMB = estimatedUsedBytes / (1024 * 1024);

      const maxSizeMB = this.maxStorageSize / (1024 * 1024);
      const availableSizeMB = Math.max(0, maxSizeMB - usedSizeMB);
      const isNearLimit = usedSizeMB > (maxSizeMB * OFFLINE.CACHE_CLEANUP_THRESHOLD);

      // Get last cleanup time
      const lastCleanupData = await EncryptedStorage.getItem('last_storage_cleanup');
      const lastCleanup = lastCleanupData ? 
        JSON.parse(lastCleanupData).timestamp : 
        new Date(0).toISOString();

      const storageInfo: OfflineStorageInfo = {
        totalSizeMB: maxSizeMB,
        usedSizeMB,
        availableSizeMB,
        isNearLimit,
        lastCleanup,
      };

      return { success: true, data: storageInfo };
    } catch (error) {
      logger.error('Failed to get storage info', { error });
      return {
        success: false,
        error: {
          code: 'STORAGE_INFO_FAILED',
          message: 'Failed to get storage information',
          details: error,
        },
      };
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<Result<void>> {
    try {
      if (!this.database) {
        throw new Error('Database not initialized');
      }

      await this.database.write(async () => {
        const allCached = await this.database!.collections
          .get<CachedDataModel>('cached_data')
          .query()
          .fetch();

        await Promise.all(allCached.map(cached => cached.destroyPermanently()));
      });

      logger.info('All cache data cleared');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to clear cache', { error });
      return {
        success: false,
        error: {
          code: 'CACHE_CLEAR_FAILED',
          message: 'Failed to clear cache',
          details: error,
        },
      };
    }
  }

  /**
   * Perform maintenance tasks
   */
  private async performMaintenanceTasks(): Promise<void> {
    try {
      logger.info('Performing offline storage maintenance');

      // Clean expired cache entries
      await this.cleanExpiredCache();

      // Clean old sync logs
      await this.cleanOldSyncLogs();

      // Check storage quota
      await this.checkStorageQuota();

      // Update last cleanup time
      await EncryptedStorage.setItem('last_storage_cleanup', JSON.stringify({
        timestamp: new Date().toISOString(),
      }));

      logger.info('Storage maintenance completed');
    } catch (error) {
      logger.error('Storage maintenance failed', { error });
    }
  }

  /**
   * Clean expired cache entries
   */
  private async cleanExpiredCache(): Promise<void> {
    if (!this.database) return;

    try {
      const now = Date.now();
      const expiredCached = await this.database.collections
        .get<CachedDataModel>('cached_data')
        .query()
        .fetch();

      const expired = expiredCached.filter(cached => cached.expiresAt <= now);

      if (expired.length > 0) {
        await this.database.write(async () => {
          await Promise.all(expired.map(cached => cached.destroyPermanently()));
        });

        logger.info('Cleaned expired cache entries', { count: expired.length });
      }
    } catch (error) {
      logger.warn('Failed to clean expired cache', { error });
    }
  }

  /**
   * Clean old sync logs
   */
  private async cleanOldSyncLogs(): Promise<void> {
    if (!this.database) return;

    try {
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const oldLogs = await this.database.collections
        .get<SyncLogModel>('sync_logs')
        .query()
        .fetch();

      const toDelete = oldLogs.filter(log => log.createdAt < oneWeekAgo);

      if (toDelete.length > 0) {
        await this.database.write(async () => {
          await Promise.all(toDelete.map(log => log.destroyPermanently()));
        });

        logger.info('Cleaned old sync logs', { count: toDelete.length });
      }
    } catch (error) {
      logger.warn('Failed to clean old sync logs', { error });
    }
  }

  /**
   * Check storage quota and cleanup if needed
   */
  private async checkStorageQuota(): Promise<void> {
    const storageResult = await this.getStorageInfo();
    if (!storageResult.success) return;

    const { isNearLimit, usedSizeMB, totalSizeMB } = storageResult.data;

    if (isNearLimit) {
      logger.warn('Storage quota near limit', { usedSizeMB, totalSizeMB });
      
      // Perform aggressive cleanup
      await this.aggressiveCleanup();
    }
  }

  /**
   * Aggressive cleanup when near storage limit
   */
  private async aggressiveCleanup(): Promise<void> {
    if (!this.database) return;

    try {
      logger.info('Performing aggressive storage cleanup');

      // Remove oldest cache entries first
      const allCached = await this.database.collections
        .get<CachedDataModel>('cached_data')
        .query()
        .fetch();

      // Sort by creation time and remove oldest 50%
      allCached.sort((a, b) => a.createdAt - b.createdAt);
      const toRemove = allCached.slice(0, Math.floor(allCached.length * 0.5));

      if (toRemove.length > 0) {
        await this.database.write(async () => {
          await Promise.all(toRemove.map(cached => cached.destroyPermanently()));
        });

        logger.info('Removed oldest cache entries', { count: toRemove.length });
      }

      // Remove old completed actions
      const completedActions = await this.database.collections
        .get<OfflineActionModel>('offline_actions')
        .query()
        .fetch();

      const oldCompleted = completedActions.filter(
        action => action.completedAt && (Date.now() - action.completedAt) > (24 * 60 * 60 * 1000)
      );

      if (oldCompleted.length > 0) {
        await this.database.write(async () => {
          await Promise.all(oldCompleted.map(action => action.destroyPermanently()));
        });

        logger.info('Removed old completed actions', { count: oldCompleted.length });
      }
    } catch (error) {
      logger.error('Aggressive cleanup failed', { error });
    }
  }

  /**
   * Get or create encryption key for database
   */
  private async getEncryptionKey(): Promise<string> {
    try {
      let encryptionKey = await EncryptedStorage.getItem('db_encryption_key');
      
      if (!encryptionKey) {
        // Generate new key
        encryptionKey = this.generateEncryptionKey();
        await EncryptedStorage.setItem('db_encryption_key', encryptionKey);
        logger.info('Generated new database encryption key');
      }
      
      return encryptionKey;
    } catch (error) {
      logger.error('Failed to get encryption key', { error });
      throw error;
    }
  }

  /**
   * Generate random encryption key
   */
  private generateEncryptionKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create hash for URL to use as cache key
   */
  private hashUrl(url: string): string {
    let hash = 0;
    if (url.length === 0) return hash.toString();
    
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.database) {
      // WatermelonDB doesn't have explicit close, just set to null
      this.database = null;
      this.isInitialized = false;
      logger.info('Database connection closed');
    }
  }
}

export const offlineStorageService = new OfflineStorageService();