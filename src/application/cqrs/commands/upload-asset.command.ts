/**
 * Upload Asset Command
 * CQRS Command for uploading a new asset
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Asset } from '../../../domain/entities/asset.entity';
import { UploadAssetUseCase, UploadAssetInput, UploadAssetOutput } from '../../use-cases/assets/upload-asset.use-case';
import { 
  UserId, 
  OrganizationId, 
  VaultId 
} from '../../../types/core';

/**
 * Upload Asset Command
 * Contains all data needed to upload a new asset
 */
export class UploadAssetCommand implements Command<UploadAssetOutput> {
  readonly commandType = 'UploadAsset';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'UploadAsset';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      // File information
      fileName: string;
      fileSize: number;
      mimeType: string;
      fileContent: Buffer;
      
      // Metadata
      title: string;
      description?: string;
      tags?: string[];
      category?: string;
      folderPath?: string;
      
      // Context
      userId: UserId;
      organizationId?: OrganizationId;
      vaultId?: VaultId;
      
      // Options
      generateThumbnail?: boolean;
      processDocument?: boolean;
      storageBucket?: string;
    }
  ) {
    this.userId = payload.userId;
  }

  private generateCommandId(): string {
    return `cmd_upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    // Basic validation that can be done without external dependencies
    if (!this.payload.fileName || this.payload.fileName.trim().length === 0) {
      return ResultUtils.fail(new Error('File name is required'));
    }

    if (!this.payload.title || this.payload.title.trim().length === 0) {
      return ResultUtils.fail(new Error('Title is required'));
    }

    if (this.payload.title.length > 255) {
      return ResultUtils.fail(new Error('Title must be less than 255 characters'));
    }

    if (!this.payload.fileContent || this.payload.fileContent.length === 0) {
      return ResultUtils.fail(new Error('File content is required'));
    }

    if (this.payload.fileSize <= 0) {
      return ResultUtils.fail(new Error('Invalid file size'));
    }

    if (this.payload.fileSize > 50 * 1024 * 1024) { // 50MB limit
      return ResultUtils.fail(new Error('File size exceeds 50MB limit'));
    }

    if (!this.payload.mimeType) {
      return ResultUtils.fail(new Error('MIME type is required'));
    }

    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    // Validate tags if provided
    if (this.payload.tags) {
      if (this.payload.tags.length > 20) {
        return ResultUtils.fail(new Error('Maximum 20 tags allowed'));
      }
      
      for (const tag of this.payload.tags) {
        if (tag.length > 50) {
          return ResultUtils.fail(new Error('Each tag must be less than 50 characters'));
        }
      }
    }

    // Validate category if provided
    if (this.payload.category) {
      const allowedCategories = [
        'document',
        'image',
        'spreadsheet',
        'presentation',
        'archive',
        'other'
      ];
      
      if (!allowedCategories.includes(this.payload.category)) {
        return ResultUtils.fail(new Error(`Invalid category. Must be one of: ${allowedCategories.join(', ')}`));
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
        fileContent: `<Buffer ${this.payload.fileContent.length} bytes>`
      }
    };
  }
}

/**
 * Upload Asset Command Handler
 * Processes the upload command using the use case
 */
export class UploadAssetCommandHandler {
  constructor(
    private readonly uploadAssetUseCase: UploadAssetUseCase
  ) {}

  async handle(command: UploadAssetCommand): Promise<Result<UploadAssetOutput>> {
    // Validate command
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    // Log command execution (without file content)
    console.log('[UploadAssetCommand] Executing:', {
      fileName: command.payload.fileName,
      fileSize: command.payload.fileSize,
      mimeType: command.payload.mimeType,
      title: command.payload.title,
      userId: command.payload.userId,
      organizationId: command.payload.organizationId,
      vaultId: command.payload.vaultId
    });

    try {
      // Execute the use case
      const result = await this.uploadAssetUseCase.execute({
        fileName: command.payload.fileName,
        fileSize: command.payload.fileSize,
        mimeType: command.payload.mimeType,
        fileContent: command.payload.fileContent,
        title: command.payload.title,
        description: command.payload.description,
        tags: command.payload.tags,
        category: command.payload.category || 'document',
        folderPath: command.payload.folderPath || '/',
        userId: command.payload.userId,
        organizationId: command.payload.organizationId,
        vaultId: command.payload.vaultId,
        storageBucket: command.payload.storageBucket,
        generateThumbnail: command.payload.generateThumbnail ?? true,
        processDocument: command.payload.processDocument ?? false
      });

      if (result.success) {
        console.log('[UploadAssetCommand] Success:', {
          assetId: result.data.asset.id,
          title: result.data.asset.title,
          uploadUrl: result.data.uploadUrl
        });
      } else {
        console.error('[UploadAssetCommand] Failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[UploadAssetCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to upload asset')
      );
    }
  }
}

/**
 * Factory function to create the command handler with dependencies
 */
export function createUploadAssetCommandHandler(
  dependencies: {
    uploadAssetUseCase: UploadAssetUseCase;
  }
): UploadAssetCommandHandler {
  return new UploadAssetCommandHandler(
    dependencies.uploadAssetUseCase
  );
}