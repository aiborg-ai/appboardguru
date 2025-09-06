/**
 * Asset Upload Notification Handler
 * Sends notifications when assets are uploaded
 */

import { EventHandler } from '../../01-shared/lib/event-bus';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import type { AssetId, UserId } from '../../types/core';

export interface AssetUploadedEvent {
  eventName: 'AssetUploaded';
  aggregateId: AssetId;
  payload: {
    assetId: AssetId;
    title: string;
    fileName: string;
    fileSize: number;
    uploadedBy: UserId;
    organizationId?: string;
    vaultId?: string;
    timestamp: Date;
  };
}

export interface INotificationService {
  sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    templateId?: string;
    data?: Record<string, any>;
  }): Promise<Result<void>>;

  sendInAppNotification(params: {
    userId: UserId;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    data?: Record<string, any>;
  }): Promise<Result<void>>;

  sendBulkNotifications(params: {
    userIds: UserId[];
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }): Promise<Result<void>>;
}

export interface IUserRepository {
  findById(userId: UserId): Promise<Result<{ id: string; email: string; name?: string }>>;
  findByOrganization(organizationId: string): Promise<Result<Array<{ id: string; email: string; name?: string }>>>;
  findByVault(vaultId: string): Promise<Result<Array<{ id: string; email: string; name?: string }>>>;
}

/**
 * Asset Upload Notification Handler
 * Handles notifications when assets are uploaded
 */
export class AssetUploadNotificationHandler implements EventHandler<AssetUploadedEvent> {
  constructor(
    private readonly notificationService: INotificationService,
    private readonly userRepository: IUserRepository
  ) {}

  async handle(event: AssetUploadedEvent): Promise<Result<void>> {
    console.log('[AssetUploadNotificationHandler] Processing event:', {
      assetId: event.payload.assetId,
      title: event.payload.title,
      uploadedBy: event.payload.uploadedBy
    });

    try {
      // Get uploader details
      const uploaderResult = await this.userRepository.findById(event.payload.uploadedBy);
      if (!uploaderResult.success) {
        console.error('[AssetUploadNotificationHandler] Failed to get uploader details:', uploaderResult.error);
        return ResultUtils.fail(new Error('Failed to get uploader details'));
      }

      const uploader = uploaderResult.data;
      const uploaderName = uploader.name || uploader.email;

      // Format file size
      const formattedSize = this.formatFileSize(event.payload.fileSize);

      // Send in-app notification to the uploader
      const selfNotificationResult = await this.notificationService.sendInAppNotification({
        userId: event.payload.uploadedBy,
        title: 'Asset Upload Successful',
        message: `Your file "${event.payload.title}" (${formattedSize}) has been uploaded successfully.`,
        type: 'success',
        data: {
          assetId: event.payload.assetId,
          fileName: event.payload.fileName
        }
      });

      if (!selfNotificationResult.success) {
        console.warn('[AssetUploadNotificationHandler] Failed to send self notification:', selfNotificationResult.error);
      }

      // Notify organization members if applicable
      if (event.payload.organizationId) {
        const orgMembersResult = await this.userRepository.findByOrganization(event.payload.organizationId);
        
        if (orgMembersResult.success) {
          const otherMembers = orgMembersResult.data.filter(
            member => member.id !== event.payload.uploadedBy
          );

          if (otherMembers.length > 0) {
            const bulkNotificationResult = await this.notificationService.sendBulkNotifications({
              userIds: otherMembers.map(m => m.id as UserId),
              title: 'New Asset Uploaded',
              message: `${uploaderName} uploaded "${event.payload.title}" (${formattedSize})`,
              type: 'info'
            });

            if (!bulkNotificationResult.success) {
              console.warn('[AssetUploadNotificationHandler] Failed to send org notifications:', bulkNotificationResult.error);
            }
          }
        }
      }

      // Notify vault members if applicable
      if (event.payload.vaultId) {
        const vaultMembersResult = await this.userRepository.findByVault(event.payload.vaultId);
        
        if (vaultMembersResult.success) {
          const otherMembers = vaultMembersResult.data.filter(
            member => member.id !== event.payload.uploadedBy
          );

          if (otherMembers.length > 0) {
            const bulkNotificationResult = await this.notificationService.sendBulkNotifications({
              userIds: otherMembers.map(m => m.id as UserId),
              title: 'New Vault Asset',
              message: `${uploaderName} added "${event.payload.title}" to the vault`,
              type: 'info'
            });

            if (!bulkNotificationResult.success) {
              console.warn('[AssetUploadNotificationHandler] Failed to send vault notifications:', bulkNotificationResult.error);
            }
          }
        }
      }

      // Send email notification to uploader (optional, based on preferences)
      const emailResult = await this.notificationService.sendEmail({
        to: uploader.email,
        subject: 'Asset Upload Confirmation',
        body: `Your file "${event.payload.title}" has been successfully uploaded.`,
        templateId: 'asset-upload-success',
        data: {
          userName: uploaderName,
          assetTitle: event.payload.title,
          fileName: event.payload.fileName,
          fileSize: formattedSize,
          uploadTime: event.payload.timestamp.toISOString()
        }
      });

      if (!emailResult.success) {
        console.warn('[AssetUploadNotificationHandler] Failed to send email notification:', emailResult.error);
      }

      console.log('[AssetUploadNotificationHandler] Successfully processed notifications for asset:', event.payload.assetId);
      return ResultUtils.ok(undefined);

    } catch (error) {
      console.error('[AssetUploadNotificationHandler] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to send notifications')
      );
    }
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

/**
 * Factory function to create handler with dependencies
 */
export function createAssetUploadNotificationHandler(dependencies: {
  notificationService: INotificationService;
  userRepository: IUserRepository;
}): AssetUploadNotificationHandler {
  return new AssetUploadNotificationHandler(
    dependencies.notificationService,
    dependencies.userRepository
  );
}