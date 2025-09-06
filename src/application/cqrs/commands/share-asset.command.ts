/**
 * Share Asset Command
 * CQRS Command for sharing an asset with other users
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { IAssetRepository, AssetShareInfo } from '../../interfaces/repositories/asset.repository.interface';
import { AssetId, UserId } from '../../../types/core';

export type PermissionLevel = 'view' | 'comment' | 'edit' | 'admin';

/**
 * Share Asset Command
 * Shares an asset with one or more users
 */
export class ShareAssetCommand implements Command<void> {
  readonly commandType = 'ShareAsset';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'ShareAsset';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      assetId: AssetId;
      sharedBy: UserId;
      shareWith: Array<{
        userId: UserId;
        permissionLevel: PermissionLevel;
        expiresAt?: Date;
        message?: string;
      }>;
      notifyUsers?: boolean;
    }
  ) {
    this.userId = payload.sharedBy;
  }

  private generateCommandId(): string {
    return `cmd_share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.assetId) {
      return ResultUtils.fail(new Error('Asset ID is required'));
    }

    if (!this.payload.sharedBy) {
      return ResultUtils.fail(new Error('Shared by user ID is required'));
    }

    if (!this.payload.shareWith || this.payload.shareWith.length === 0) {
      return ResultUtils.fail(new Error('At least one user must be specified for sharing'));
    }

    if (this.payload.shareWith.length > 100) {
      return ResultUtils.fail(new Error('Cannot share with more than 100 users at once'));
    }

    // Validate each share recipient
    for (const share of this.payload.shareWith) {
      if (!share.userId) {
        return ResultUtils.fail(new Error('User ID is required for each share recipient'));
      }

      if (!share.permissionLevel) {
        return ResultUtils.fail(new Error('Permission level is required for each share recipient'));
      }

      const validPermissions: PermissionLevel[] = ['view', 'comment', 'edit', 'admin'];
      if (!validPermissions.includes(share.permissionLevel)) {
        return ResultUtils.fail(new Error(`Invalid permission level: ${share.permissionLevel}`));
      }

      if (share.userId === this.payload.sharedBy) {
        return ResultUtils.fail(new Error('Cannot share asset with yourself'));
      }

      if (share.expiresAt && share.expiresAt < new Date()) {
        return ResultUtils.fail(new Error('Expiration date cannot be in the past'));
      }

      if (share.message && share.message.length > 500) {
        return ResultUtils.fail(new Error('Share message must be less than 500 characters'));
      }
    }

    return ResultUtils.ok(undefined);
  }

  toJSON() {
    return {
      commandName: this.commandName,
      timestamp: this.timestamp,
      payload: {
        ...this.payload,
        shareWith: this.payload.shareWith.map(s => ({
          ...s,
          expiresAt: s.expiresAt?.toISOString()
        }))
      }
    };
  }
}

/**
 * Share Asset Command Handler
 */
export class ShareAssetCommandHandler {
  constructor(
    private readonly assetRepository: IAssetRepository
  ) {}

  async handle(command: ShareAssetCommand): Promise<Result<void>> {
    // Validate command
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[ShareAssetCommand] Executing:', {
      assetId: command.payload.assetId,
      sharedBy: command.payload.sharedBy,
      shareCount: command.payload.shareWith.length
    });

    try {
      // Check if user has permission to share
      const permissionResult = await this.assetRepository.checkPermission(
        command.payload.assetId,
        command.payload.sharedBy,
        'share'
      );

      if (!permissionResult.success) {
        return ResultUtils.fail(new Error('Failed to check permissions'));
      }

      if (!permissionResult.data) {
        // Check if user is the owner
        const assetResult = await this.assetRepository.findById(command.payload.assetId);
        if (!assetResult.success) {
          return ResultUtils.fail(new Error('Asset not found'));
        }

        const asset = assetResult.data;
        if (asset.ownerId !== command.payload.sharedBy) {
          return ResultUtils.fail(new Error('You do not have permission to share this asset'));
        }
      }

      // Share with each user
      const shareResults: Result<void>[] = [];
      
      for (const share of command.payload.shareWith) {
        const shareInfo: AssetShareInfo = {
          assetId: command.payload.assetId,
          sharedWithUserId: share.userId,
          sharedByUserId: command.payload.sharedBy,
          permissionLevel: share.permissionLevel,
          expiresAt: share.expiresAt,
          message: share.message
        };

        const result = await this.assetRepository.share(shareInfo);
        shareResults.push(result);

        if (!result.success) {
          console.error('[ShareAssetCommand] Failed to share with user:', {
            userId: share.userId,
            error: result.error
          });
        }
      }

      // Check if all shares were successful
      const failedShares = shareResults.filter(r => !r.success);
      if (failedShares.length > 0) {
        const partialSuccess = shareResults.some(r => r.success);
        if (partialSuccess) {
          console.warn('[ShareAssetCommand] Partial success:', {
            successful: shareResults.filter(r => r.success).length,
            failed: failedShares.length
          });
          // Return success with warning
          return ResultUtils.ok(undefined);
        } else {
          return ResultUtils.fail(new Error('Failed to share asset with any users'));
        }
      }

      console.log('[ShareAssetCommand] Success:', {
        assetId: command.payload.assetId,
        sharedWith: command.payload.shareWith.length
      });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[ShareAssetCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to share asset')
      );
    }
  }
}

/**
 * Unshare Asset Command
 * Removes sharing permissions for specific users
 */
export class UnshareAssetCommand implements Command<void> {
  readonly commandType = 'UnshareAsset';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'UnshareAsset';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      assetId: AssetId;
      unsharedBy: UserId;
      unshareWith: UserId[]; // Users to remove sharing from
    }
  ) {
    this.userId = payload.unsharedBy;
  }

  private generateCommandId(): string {
    return `cmd_unshare_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.assetId) {
      return ResultUtils.fail(new Error('Asset ID is required'));
    }

    if (!this.payload.unsharedBy) {
      return ResultUtils.fail(new Error('Unshared by user ID is required'));
    }

    if (!this.payload.unshareWith || this.payload.unshareWith.length === 0) {
      return ResultUtils.fail(new Error('At least one user must be specified for unsharing'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Unshare Asset Command Handler
 */
export class UnshareAssetCommandHandler {
  constructor(
    private readonly assetRepository: IAssetRepository
  ) {}

  async handle(command: UnshareAssetCommand): Promise<Result<void>> {
    // Validate command
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[UnshareAssetCommand] Executing:', {
      assetId: command.payload.assetId,
      unsharedBy: command.payload.unsharedBy,
      unshareCount: command.payload.unshareWith.length
    });

    try {
      // Check if user has permission to manage sharing
      const permissionResult = await this.assetRepository.checkPermission(
        command.payload.assetId,
        command.payload.unsharedBy,
        'share'
      );

      if (!permissionResult.success) {
        return ResultUtils.fail(new Error('Failed to check permissions'));
      }

      if (!permissionResult.data) {
        // Check if user is the owner
        const assetResult = await this.assetRepository.findById(command.payload.assetId);
        if (!assetResult.success) {
          return ResultUtils.fail(new Error('Asset not found'));
        }

        const asset = assetResult.data;
        if (asset.ownerId !== command.payload.unsharedBy) {
          return ResultUtils.fail(new Error('You do not have permission to manage sharing for this asset'));
        }
      }

      // Unshare with each user
      const unshareResults: Result<void>[] = [];
      
      for (const userId of command.payload.unshareWith) {
        const result = await this.assetRepository.unshare(
          command.payload.assetId,
          userId
        );
        unshareResults.push(result);

        if (!result.success) {
          console.error('[UnshareAssetCommand] Failed to unshare with user:', {
            userId,
            error: result.error
          });
        }
      }

      // Check if all unshares were successful
      const failedUnshares = unshareResults.filter(r => !r.success);
      if (failedUnshares.length > 0) {
        const partialSuccess = unshareResults.some(r => r.success);
        if (partialSuccess) {
          console.warn('[UnshareAssetCommand] Partial success:', {
            successful: unshareResults.filter(r => r.success).length,
            failed: failedUnshares.length
          });
          return ResultUtils.ok(undefined);
        } else {
          return ResultUtils.fail(new Error('Failed to unshare asset with any users'));
        }
      }

      console.log('[UnshareAssetCommand] Success:', {
        assetId: command.payload.assetId,
        unsharedWith: command.payload.unshareWith.length
      });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UnshareAssetCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to unshare asset')
      );
    }
  }
}

/**
 * Factory functions to create command handlers with dependencies
 */
export function createShareAssetCommandHandler(
  dependencies: {
    assetRepository: IAssetRepository;
  }
): ShareAssetCommandHandler {
  return new ShareAssetCommandHandler(dependencies.assetRepository);
}

export function createUnshareAssetCommandHandler(
  dependencies: {
    assetRepository: IAssetRepository;
  }
): UnshareAssetCommandHandler {
  return new UnshareAssetCommandHandler(dependencies.assetRepository);
}