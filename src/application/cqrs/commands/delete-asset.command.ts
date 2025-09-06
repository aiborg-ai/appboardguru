/**
 * Delete Asset Command
 * CQRS Command for deleting an asset
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { IAssetRepository } from '../../interfaces/repositories/asset.repository.interface';
import { AssetId, UserId } from '../../../types/core';
import { EventBus } from '../../../01-shared/lib/event-bus';

/**
 * Delete Asset Command
 * Soft deletes an asset (can be restored)
 */
export class DeleteAssetCommand implements Command<void> {
  readonly commandType = 'DeleteAsset';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'DeleteAsset';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      assetId: AssetId;
      userId: UserId;
      reason?: string;
      permanent?: boolean; // If true, permanently delete (cannot be restored)
    }
  ) {
    this.userId = payload.userId;
  }

  private generateCommandId(): string {
    return `cmd_delete_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.assetId) {
      return ResultUtils.fail(new Error('Asset ID is required'));
    }

    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    if (this.payload.reason && this.payload.reason.length > 500) {
      return ResultUtils.fail(new Error('Deletion reason must be less than 500 characters'));
    }

    return ResultUtils.ok(undefined);
  }

  toJSON() {
    return {
      commandName: this.commandName,
      timestamp: this.timestamp,
      payload: this.payload
    };
  }
}

/**
 * Delete Asset Command Handler
 */
export class DeleteAssetCommandHandler {
  constructor(
    private readonly assetRepository: IAssetRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: DeleteAssetCommand): Promise<Result<void>> {
    // Validate command
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[DeleteAssetCommand] Executing:', {
      assetId: command.payload.assetId,
      userId: command.payload.userId,
      permanent: command.payload.permanent
    });

    try {
      // Check if user has permission to delete
      const permissionResult = await this.assetRepository.checkPermission(
        command.payload.assetId,
        command.payload.userId,
        'delete'
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
        if (asset.ownerId !== command.payload.userId) {
          return ResultUtils.fail(new Error('You do not have permission to delete this asset'));
        }
      }

      // Perform deletion
      let result: Result<void>;
      if (command.payload.permanent) {
        // Permanent deletion (cannot be restored)
        result = await this.assetRepository.permanentDelete(command.payload.assetId);
      } else {
        // Soft delete (can be restored)
        result = await this.assetRepository.softDelete(
          command.payload.assetId,
          command.payload.userId
        );
      }

      if (result.success) {
        console.log('[DeleteAssetCommand] Success:', {
          assetId: command.payload.assetId,
          permanent: command.payload.permanent
        });
        
        // Emit delete event
        if (this.eventBus) {
          await this.eventBus.publish({
            eventName: 'AssetDeleted',
            aggregateId: command.payload.assetId,
            payload: {
              assetId: command.payload.assetId,
              permanent: command.payload.permanent || false,
              timestamp: new Date()
            }
          });
        }
      } else {
        console.error('[DeleteAssetCommand] Failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[DeleteAssetCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to delete asset')
      );
    }
  }
}

/**
 * Restore Asset Command
 * Restores a soft-deleted asset
 */
export class RestoreAssetCommand implements Command<void> {
  readonly commandType = 'RestoreAsset';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'RestoreAsset';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      assetId: AssetId;
      userId: UserId;
    }
  ) {
    this.userId = payload.userId;
  }

  private generateCommandId(): string {
    return `cmd_restore_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.assetId) {
      return ResultUtils.fail(new Error('Asset ID is required'));
    }

    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Restore Asset Command Handler
 */
export class RestoreAssetCommandHandler {
  constructor(
    private readonly assetRepository: IAssetRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: RestoreAssetCommand): Promise<Result<void>> {
    // Validate command
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[RestoreAssetCommand] Executing:', {
      assetId: command.payload.assetId,
      userId: command.payload.userId
    });

    try {
      // Get the deleted asset to check ownership
      const assetResult = await this.assetRepository.findById(command.payload.assetId);
      if (!assetResult.success) {
        return ResultUtils.fail(new Error('Asset not found'));
      }

      const asset = assetResult.data;
      
      // Check if asset is actually deleted
      if (!asset.isDeleted) {
        return ResultUtils.fail(new Error('Asset is not deleted'));
      }

      // Check if user has permission to restore (must be owner or admin)
      if (asset.ownerId !== command.payload.userId) {
        const permissionResult = await this.assetRepository.checkPermission(
          command.payload.assetId,
          command.payload.userId,
          'delete' // Same permission as delete
        );

        if (!permissionResult.success || !permissionResult.data) {
          return ResultUtils.fail(new Error('You do not have permission to restore this asset'));
        }
      }

      // Restore the asset
      const result = await this.assetRepository.restore(
        command.payload.assetId,
        command.payload.userId
      );

      if (result.success) {
        console.log('[RestoreAssetCommand] Success:', {
          assetId: command.payload.assetId
        });
        
        // Emit restore event
        if (this.eventBus) {
          await this.eventBus.publish({
            eventName: 'AssetRestored',
            aggregateId: command.payload.assetId,
            payload: {
              assetId: command.payload.assetId,
              timestamp: new Date()
            }
          });
        }
      } else {
        console.error('[RestoreAssetCommand] Failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[RestoreAssetCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to restore asset')
      );
    }
  }
}

/**
 * Factory functions to create command handlers with dependencies
 */
export function createDeleteAssetCommandHandler(
  dependencies: {
    assetRepository: IAssetRepository;
    eventBus?: EventBus;
  }
): DeleteAssetCommandHandler {
  return new DeleteAssetCommandHandler(dependencies.assetRepository, dependencies.eventBus);
}

export function createRestoreAssetCommandHandler(
  dependencies: {
    assetRepository: IAssetRepository;
    eventBus?: EventBus;
  }
): RestoreAssetCommandHandler {
  return new RestoreAssetCommandHandler(dependencies.assetRepository, dependencies.eventBus);
}