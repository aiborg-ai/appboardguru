/**
 * Mobile Repository Adapter
 * Adapts existing web repositories for mobile use with offline capabilities
 * Maintains DDD patterns and Result types while adding mobile-specific features
 */

import type { 
  Result, 
  UserId, 
  OrganizationId, 
  AssetId, 
  VaultId,
  MeetingId,
  NotificationId,
} from '@/types/mobile';

// Import existing repositories from web app
import type { BaseRepository } from '@/shared-repositories/base.repository';
import type { UserRepository } from '@/shared-repositories/user.repository';
import type { AssetRepository } from '@/shared-repositories/asset.repository';
import type { VaultRepository } from '@/shared-repositories/vault.repository';
import type { MeetingRepository } from '@/shared-repositories/meeting.repository';
import type { NotificationRepository } from '@/shared-repositories/notification.repository';
import type { OrganizationRepository } from '@/shared-repositories/organization.repository';

import { mobileApiClient } from '../api/MobileApiClient';
import { offlineStorageService } from '../storage/OfflineStorageService';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MobileRepositoryAdapter');

/**
 * Base Mobile Repository Adapter
 * Provides offline capabilities to existing repositories
 */
export abstract class MobileRepositoryAdapter<T> {
  protected readonly tableName: string;
  protected readonly cacheTtl = 5 * 60 * 1000; // 5 minutes

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Enhanced find with offline support
   */
  protected async findWithOfflineSupport<TResult>(
    cacheKey: string,
    onlineQuery: () => Promise<Result<TResult>>,
    priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'
  ): Promise<Result<TResult>> {
    try {
      // Try online query first
      const onlineResult = await onlineQuery();
      
      if (onlineResult.success) {
        // Cache successful result
        await offlineStorageService.cacheData(cacheKey, onlineResult.data, this.cacheTtl);
        return onlineResult;
      }

      // If online fails, try cache
      logger.warn('Online query failed, trying cache', { cacheKey });
      const cachedResult = await offlineStorageService.getCachedData<TResult>(cacheKey);
      
      if (cachedResult.success && cachedResult.data) {
        logger.info('Returning cached data', { cacheKey });
        return { success: true, data: cachedResult.data };
      }

      // Return original online error if no cache
      return onlineResult;
    } catch (error) {
      logger.error('Find with offline support failed', { error, cacheKey });
      return {
        success: false,
        error: {
          code: 'OFFLINE_QUERY_FAILED',
          message: 'Query failed and no cached data available',
          details: error,
        },
      };
    }
  }

  /**
   * Enhanced create with offline queuing
   */
  protected async createWithOfflineSupport<TData, TResult>(
    data: TData,
    onlineCreate: (data: TData) => Promise<Result<TResult>>,
    actionType: string,
    priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'
  ): Promise<Result<TResult>> {
    try {
      // Try online create first
      const onlineResult = await onlineCreate(data);
      
      if (onlineResult.success) {
        return onlineResult;
      }

      // Queue for offline processing
      logger.info('Queueing create action for offline processing', { actionType });
      const queueResult = await offlineStorageService.queueAction({
        id: `${actionType}_${Date.now()}` as any,
        type: actionType as any,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        priority,
      });

      if (queueResult.success) {
        // Return optimistic result for UI
        return {
          success: true,
          data: {
            ...data,
            id: `temp_${Date.now()}`,
            _offline: true,
          } as unknown as TResult,
        };
      }

      return onlineResult;
    } catch (error) {
      logger.error('Create with offline support failed', { error, actionType });
      return {
        success: false,
        error: {
          code: 'OFFLINE_CREATE_FAILED',
          message: 'Create operation failed and could not be queued',
          details: error,
        },
      };
    }
  }

  /**
   * Enhanced update with offline queuing
   */
  protected async updateWithOfflineSupport<TData, TResult>(
    id: string,
    data: TData,
    onlineUpdate: (id: string, data: TData) => Promise<Result<TResult>>,
    actionType: string,
    priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'
  ): Promise<Result<TResult>> {
    try {
      // Try online update first
      const onlineResult = await onlineUpdate(id, data);
      
      if (onlineResult.success) {
        // Invalidate cache
        await this.invalidateRelatedCache(id);
        return onlineResult;
      }

      // Queue for offline processing
      logger.info('Queueing update action for offline processing', { actionType, id });
      const queueResult = await offlineStorageService.queueAction({
        id: `${actionType}_${id}_${Date.now()}` as any,
        type: actionType as any,
        data: { id, ...data },
        timestamp: Date.now(),
        retryCount: 0,
        priority,
      });

      if (queueResult.success) {
        // Apply optimistic update to cache
        await this.applyOptimisticUpdate(id, data);
        
        return {
          success: true,
          data: {
            id,
            ...data,
            _offline: true,
          } as unknown as TResult,
        };
      }

      return onlineResult;
    } catch (error) {
      logger.error('Update with offline support failed', { error, actionType, id });
      return {
        success: false,
        error: {
          code: 'OFFLINE_UPDATE_FAILED',
          message: 'Update operation failed and could not be queued',
          details: error,
        },
      };
    }
  }

  /**
   * Sync data from server and merge with offline changes
   */
  async syncWithServer(): Promise<Result<void>> {
    try {
      logger.info('Starting sync with server', { tableName: this.tableName });

      // Get all offline actions for this entity
      const actionsResult = await offlineStorageService.getQueuedActions();
      if (!actionsResult.success) {
        return {
          success: false,
          error: {
            code: 'SYNC_FAILED',
            message: 'Failed to get queued actions',
            details: actionsResult.error,
          },
        };
      }

      const relevantActions = actionsResult.data.filter(action => 
        action.type.includes(this.getActionPrefix())
      );

      // Process actions in order
      for (const action of relevantActions) {
        const result = await this.processOfflineAction(action);
        if (result.success) {
          await offlineStorageService.removeAction(action.id);
        } else {
          logger.error('Failed to process offline action', { 
            actionId: action.id, 
            error: result.error 
          });
        }
      }

      logger.info('Sync completed', { 
        tableName: this.tableName, 
        processedActions: relevantActions.length 
      });

      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Sync with server failed', { error, tableName: this.tableName });
      return {
        success: false,
        error: {
          code: 'SYNC_FAILED',
          message: 'Sync with server failed',
          details: error,
        },
      };
    }
  }

  // Abstract methods to be implemented by concrete adapters
  protected abstract getActionPrefix(): string;
  protected abstract processOfflineAction(action: any): Promise<Result<any>>;
  protected abstract invalidateRelatedCache(id: string): Promise<void>;
  protected abstract applyOptimisticUpdate(id: string, data: any): Promise<void>;
}

/**
 * Mobile User Repository Adapter
 */
export class MobileUserRepositoryAdapter extends MobileRepositoryAdapter<any> {
  constructor() {
    super('users');
  }

  async findById(userId: UserId): Promise<Result<any>> {
    return this.findWithOfflineSupport(
      `user_${userId}`,
      () => mobileApiClient.request({
        method: 'GET',
        url: `/api/users/${userId}`,
        offlineCapable: true,
        priority: 'high',
      }),
      'high'
    );
  }

  async updateProfile(userId: UserId, profileData: any): Promise<Result<any>> {
    return this.updateWithOfflineSupport(
      userId,
      profileData,
      (id, data) => mobileApiClient.request({
        method: 'PUT',
        url: `/api/users/${id}/profile`,
        data,
        offlineCapable: true,
        priority: 'normal',
      }),
      'update_profile',
      'normal'
    );
  }

  protected getActionPrefix(): string {
    return 'update_profile';
  }

  protected async processOfflineAction(action: any): Promise<Result<any>> {
    return this.updateProfile(action.data.id, action.data);
  }

  protected async invalidateRelatedCache(id: string): Promise<void> {
    await offlineStorageService.invalidateCache(`user_${id}`);
  }

  protected async applyOptimisticUpdate(id: string, data: any): Promise<void> {
    const cacheKey = `user_${id}`;
    const cached = await offlineStorageService.getCachedData(cacheKey);
    
    if (cached.success && cached.data) {
      const updated = { ...cached.data, ...data, _offline: true };
      await offlineStorageService.cacheData(cacheKey, updated, this.cacheTtl);
    }
  }
}

/**
 * Mobile Asset Repository Adapter
 */
export class MobileAssetRepositoryAdapter extends MobileRepositoryAdapter<any> {
  constructor() {
    super('assets');
  }

  async findByVault(vaultId: VaultId): Promise<Result<any[]>> {
    return this.findWithOfflineSupport(
      `vault_assets_${vaultId}`,
      () => mobileApiClient.request({
        method: 'GET',
        url: `/api/vaults/${vaultId}/assets`,
        offlineCapable: true,
        priority: 'high',
      }),
      'high'
    );
  }

  async createAsset(assetData: any): Promise<Result<any>> {
    return this.createWithOfflineSupport(
      assetData,
      (data) => mobileApiClient.request({
        method: 'POST',
        url: '/api/assets',
        data,
        offlineCapable: true,
        priority: 'high',
      }),
      'create_asset',
      'high'
    );
  }

  async updateAsset(assetId: AssetId, updates: any): Promise<Result<any>> {
    return this.updateWithOfflineSupport(
      assetId,
      updates,
      (id, data) => mobileApiClient.request({
        method: 'PUT',
        url: `/api/assets/${id}`,
        data,
        offlineCapable: true,
        priority: 'normal',
      }),
      'update_asset',
      'normal'
    );
  }

  protected getActionPrefix(): string {
    return 'asset';
  }

  protected async processOfflineAction(action: any): Promise<Result<any>> {
    switch (action.type) {
      case 'create_asset':
        return this.createAsset(action.data);
      case 'update_asset':
        return this.updateAsset(action.data.id, action.data);
      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ACTION',
            message: `Unknown action type: ${action.type}`,
          },
        };
    }
  }

  protected async invalidateRelatedCache(id: string): Promise<void> {
    await offlineStorageService.invalidateCache(`asset_${id}`);
    // Also invalidate vault assets cache if we know the vault
    // This would require additional metadata in the action
  }

  protected async applyOptimisticUpdate(id: string, data: any): Promise<void> {
    const cacheKey = `asset_${id}`;
    const cached = await offlineStorageService.getCachedData(cacheKey);
    
    if (cached.success && cached.data) {
      const updated = { ...cached.data, ...data, _offline: true };
      await offlineStorageService.cacheData(cacheKey, updated, this.cacheTtl);
    }
  }
}

/**
 * Mobile Meeting Repository Adapter
 */
export class MobileMeetingRepositoryAdapter extends MobileRepositoryAdapter<any> {
  constructor() {
    super('meetings');
  }

  async findUpcoming(organizationId: OrganizationId): Promise<Result<any[]>> {
    return this.findWithOfflineSupport(
      `upcoming_meetings_${organizationId}`,
      () => mobileApiClient.request({
        method: 'GET',
        url: `/api/organizations/${organizationId}/meetings/upcoming`,
        offlineCapable: true,
        priority: 'critical',
      }),
      'critical'
    );
  }

  async submitVote(meetingId: MeetingId, voteData: any): Promise<Result<any>> {
    return this.createWithOfflineSupport(
      { meetingId, ...voteData },
      (data) => mobileApiClient.request({
        method: 'POST',
        url: `/api/meetings/${data.meetingId}/votes`,
        data,
        offlineCapable: true,
        priority: 'critical',
      }),
      'submit_vote',
      'critical'
    );
  }

  protected getActionPrefix(): string {
    return 'meeting';
  }

  protected async processOfflineAction(action: any): Promise<Result<any>> {
    if (action.type === 'submit_vote') {
      return this.submitVote(action.data.meetingId, action.data);
    }
    
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ACTION',
        message: `Unknown action type: ${action.type}`,
      },
    };
  }

  protected async invalidateRelatedCache(id: string): Promise<void> {
    await offlineStorageService.invalidateCache(`meeting_${id}`);
    await offlineStorageService.invalidatePattern('upcoming_meetings_*');
  }

  protected async applyOptimisticUpdate(id: string, data: any): Promise<void> {
    // Meetings are mostly read-only from mobile perspective
    // Votes are separate entities
  }
}

/**
 * Mobile Notification Repository Adapter
 */
export class MobileNotificationRepositoryAdapter extends MobileRepositoryAdapter<any> {
  constructor() {
    super('notifications');
  }

  async findUnread(userId: UserId): Promise<Result<any[]>> {
    return this.findWithOfflineSupport(
      `unread_notifications_${userId}`,
      () => mobileApiClient.request({
        method: 'GET',
        url: `/api/users/${userId}/notifications/unread`,
        offlineCapable: true,
        priority: 'normal',
      }),
      'normal'
    );
  }

  async markAsRead(notificationId: NotificationId): Promise<Result<any>> {
    return this.updateWithOfflineSupport(
      notificationId,
      { read: true },
      (id, data) => mobileApiClient.request({
        method: 'PUT',
        url: `/api/notifications/${id}`,
        data,
        offlineCapable: true,
        priority: 'low',
      }),
      'mark_notification_read',
      'low'
    );
  }

  protected getActionPrefix(): string {
    return 'notification';
  }

  protected async processOfflineAction(action: any): Promise<Result<any>> {
    if (action.type === 'mark_notification_read') {
      return this.markAsRead(action.data.id);
    }
    
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ACTION',
        message: `Unknown action type: ${action.type}`,
      },
    };
  }

  protected async invalidateRelatedCache(id: string): Promise<void> {
    await offlineStorageService.invalidateCache(`notification_${id}`);
    await offlineStorageService.invalidatePattern('unread_notifications_*');
  }

  protected async applyOptimisticUpdate(id: string, data: any): Promise<void> {
    const cacheKey = `notification_${id}`;
    const cached = await offlineStorageService.getCachedData(cacheKey);
    
    if (cached.success && cached.data) {
      const updated = { ...cached.data, ...data, _offline: true };
      await offlineStorageService.cacheData(cacheKey, updated, this.cacheTtl);
    }
  }
}

// Export repository instances
export const mobileUserRepository = new MobileUserRepositoryAdapter();
export const mobileAssetRepository = new MobileAssetRepositoryAdapter();
export const mobileMeetingRepository = new MobileMeetingRepositoryAdapter();
export const mobileNotificationRepository = new MobileNotificationRepositoryAdapter();