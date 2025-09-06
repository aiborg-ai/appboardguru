/**
 * Update Asset Command
 * CQRS Command for updating asset metadata and properties
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Asset, AssetVisibility } from '../../../domain/entities/asset.entity';
import { IAssetRepository } from '../../interfaces/repositories/asset.repository.interface';
import { AssetId, UserId, VaultId, OrganizationId } from '../../../types/core';
import { EventBus } from '../../../01-shared/lib/event-bus';

/**
 * Update Asset Command
 * Updates asset metadata, properties, or location
 */
export class UpdateAssetCommand implements Command<Asset> {
  readonly commandType = 'UpdateAsset';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'UpdateAsset';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      assetId: AssetId;
      updatedBy: UserId;
      updates: {
        title?: string;
        description?: string;
        tags?: string[];
        category?: string;
        folderPath?: string;
        visibility?: AssetVisibility;
        vaultId?: VaultId | null;
        organizationId?: OrganizationId | null;
      };
    }
  ) {
    this.userId = payload.updatedBy;
  }

  private generateCommandId(): string {
    return `cmd_update_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.assetId) {
      return ResultUtils.fail(new Error('Asset ID is required'));
    }

    if (!this.payload.updatedBy) {
      return ResultUtils.fail(new Error('Updated by user ID is required'));
    }

    if (!this.payload.updates || Object.keys(this.payload.updates).length === 0) {
      return ResultUtils.fail(new Error('At least one update field must be provided'));
    }

    // Validate update fields
    const { updates } = this.payload;

    if (updates.title !== undefined) {
      if (!updates.title || updates.title.trim().length === 0) {
        return ResultUtils.fail(new Error('Title cannot be empty'));
      }
      if (updates.title.length > 255) {
        return ResultUtils.fail(new Error('Title must be less than 255 characters'));
      }
    }

    if (updates.description !== undefined && updates.description.length > 5000) {
      return ResultUtils.fail(new Error('Description must be less than 5000 characters'));
    }

    if (updates.tags !== undefined) {
      if (updates.tags.length > 20) {
        return ResultUtils.fail(new Error('Maximum 20 tags allowed'));
      }
      for (const tag of updates.tags) {
        if (tag.length > 50) {
          return ResultUtils.fail(new Error('Each tag must be less than 50 characters'));
        }
      }
    }

    if (updates.category !== undefined) {
      const validCategories = ['document', 'image', 'spreadsheet', 'presentation', 'archive', 'other'];
      if (!validCategories.includes(updates.category)) {
        return ResultUtils.fail(new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`));
      }
    }

    if (updates.visibility !== undefined) {
      const validVisibilities = ['private', 'organization', 'public'];
      if (!validVisibilities.includes(updates.visibility)) {
        return ResultUtils.fail(new Error(`Invalid visibility. Must be one of: ${validVisibilities.join(', ')}`));
      }
    }

    if (updates.folderPath !== undefined && updates.folderPath.length > 500) {
      return ResultUtils.fail(new Error('Folder path must be less than 500 characters'));
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
 * Update Asset Command Handler
 */
export class UpdateAssetCommandHandler {
  constructor(
    private readonly assetRepository: IAssetRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: UpdateAssetCommand): Promise<Result<Asset>> {
    // Validate command
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[UpdateAssetCommand] Executing:', {
      assetId: command.payload.assetId,
      updatedBy: command.payload.updatedBy,
      updateFields: Object.keys(command.payload.updates)
    });

    try {
      // Check if user has permission to update
      const permissionResult = await this.assetRepository.checkPermission(
        command.payload.assetId,
        command.payload.updatedBy,
        'write'
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
        if (asset.ownerId !== command.payload.updatedBy) {
          return ResultUtils.fail(new Error('You do not have permission to update this asset'));
        }
      }

      // Get the current asset
      const currentAssetResult = await this.assetRepository.findById(command.payload.assetId);
      if (!currentAssetResult.success) {
        return currentAssetResult;
      }

      const currentAsset = currentAssetResult.data;

      // Apply updates to the domain entity
      const { updates } = command.payload;

      // Update metadata
      if (updates.title || updates.description || updates.tags || updates.category) {
        const metadataResult = currentAsset.updateMetadata({
          title: updates.title,
          description: updates.description,
          tags: updates.tags,
          category: updates.category
        });

        if (!metadataResult.success) {
          return ResultUtils.fail(metadataResult.error);
        }
      }

      // Update visibility
      if (updates.visibility) {
        const visibilityResult = currentAsset.changeVisibility(updates.visibility);
        if (!visibilityResult.success) {
          return ResultUtils.fail(visibilityResult.error);
        }
      }

      // Update vault
      if (updates.vaultId !== undefined) {
        if (updates.vaultId) {
          const vaultResult = currentAsset.moveToVault(updates.vaultId);
          if (!vaultResult.success) {
            return ResultUtils.fail(vaultResult.error);
          }
        }
      }

      // Save the updated asset
      const saveResult = await this.assetRepository.update(currentAsset);

      if (!saveResult.success) {
        console.error('[UpdateAssetCommand] Failed to save:', saveResult.error);
        return saveResult;
      }

      // Also update specific metadata fields if needed
      if (updates.folderPath) {
        await this.assetRepository.updateMetadata(
          command.payload.assetId,
          { category: updates.category },
          command.payload.updatedBy
        );
      }

      console.log('[UpdateAssetCommand] Success:', {
        assetId: saveResult.data.id,
        title: saveResult.data.title
      });

      // Emit update event
      if (this.eventBus) {
        await this.eventBus.publish({
          eventName: 'AssetUpdated',
          aggregateId: saveResult.data.id,
          payload: {
            assetId: saveResult.data.id,
            title: updates.title,
            description: updates.description,
            tags: updates.tags,
            category: updates.category,
            visibility: updates.visibility,
            timestamp: new Date()
          }
        });
      }

      return saveResult;
    } catch (error) {
      console.error('[UpdateAssetCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update asset')
      );
    }
  }
}

/**
 * Move Asset to Vault Command
 * Specialized command for moving assets between vaults
 */
export class MoveAssetToVaultCommand implements Command<void> {
  readonly commandType = 'MoveAssetToVault';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'MoveAssetToVault';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      assetIds: AssetId[];
      vaultId: VaultId;
      movedBy: UserId;
    }
  ) {
    this.userId = payload.movedBy;
  }

  private generateCommandId(): string {
    return `cmd_move_vault_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.assetIds || this.payload.assetIds.length === 0) {
      return ResultUtils.fail(new Error('At least one asset ID is required'));
    }

    if (this.payload.assetIds.length > 100) {
      return ResultUtils.fail(new Error('Cannot move more than 100 assets at once'));
    }

    if (!this.payload.vaultId) {
      return ResultUtils.fail(new Error('Vault ID is required'));
    }

    if (!this.payload.movedBy) {
      return ResultUtils.fail(new Error('Moved by user ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Move Asset to Vault Command Handler
 */
export class MoveAssetToVaultCommandHandler {
  constructor(
    private readonly assetRepository: IAssetRepository
  ) {}

  async handle(command: MoveAssetToVaultCommand): Promise<Result<void>> {
    // Validate command
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[MoveAssetToVaultCommand] Executing:', {
      assetCount: command.payload.assetIds.length,
      vaultId: command.payload.vaultId,
      movedBy: command.payload.movedBy
    });

    try {
      // Check permissions for each asset
      const permissionChecks = await Promise.all(
        command.payload.assetIds.map(assetId =>
          this.assetRepository.checkPermission(assetId, command.payload.movedBy, 'write')
        )
      );

      const unauthorizedAssets = command.payload.assetIds.filter(
        (_, index) => !permissionChecks[index].success || !permissionChecks[index].data
      );

      if (unauthorizedAssets.length > 0) {
        return ResultUtils.fail(new Error(
          `You do not have permission to move ${unauthorizedAssets.length} asset(s)`
        ));
      }

      // Bulk move to vault
      const result = await this.assetRepository.bulkMoveToVault(
        command.payload.assetIds,
        command.payload.vaultId,
        command.payload.movedBy
      );

      if (result.success) {
        console.log('[MoveAssetToVaultCommand] Success:', {
          assetCount: command.payload.assetIds.length,
          vaultId: command.payload.vaultId
        });
      } else {
        console.error('[MoveAssetToVaultCommand] Failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[MoveAssetToVaultCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to move assets to vault')
      );
    }
  }
}

/**
 * Factory functions to create command handlers with dependencies
 */
export function createUpdateAssetCommandHandler(
  dependencies: {
    assetRepository: IAssetRepository;
    eventBus?: EventBus;
  }
): UpdateAssetCommandHandler {
  return new UpdateAssetCommandHandler(dependencies.assetRepository, dependencies.eventBus);
}

export function createMoveAssetToVaultCommandHandler(
  dependencies: {
    assetRepository: IAssetRepository;
  }
): MoveAssetToVaultCommandHandler {
  return new MoveAssetToVaultCommandHandler(dependencies.assetRepository);
}