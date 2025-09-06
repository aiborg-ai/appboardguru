/**
 * Upload Asset Use Case
 * Handles the business logic for uploading a new asset
 */

import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { EventBus } from '../../../01-shared/lib/event-bus';
import { Asset } from '../../../domain/entities/asset.entity';
import { FileMetadata } from '../../../domain/value-objects/file-metadata.vo';
import { IAssetRepository } from '../../interfaces/repositories/asset.repository.interface';
import { 
  AssetId, 
  UserId, 
  OrganizationId, 
  VaultId,
  createAssetId 
} from '../../../types/core';

export interface UploadAssetInput {
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
  
  // Storage options
  storageBucket?: string;
  generateThumbnail?: boolean;
  processDocument?: boolean;
}

export interface UploadAssetOutput {
  asset: Asset;
  uploadUrl?: string;
  thumbnailUrl?: string;
}

export interface IStorageService {
  uploadFile(params: {
    bucket: string;
    path: string;
    content: Buffer;
    mimeType: string;
    metadata?: Record<string, string>;
  }): Promise<Result<{ path: string; url: string }>>;
  
  generateThumbnail(params: {
    bucket: string;
    filePath: string;
    mimeType: string;
  }): Promise<Result<string>>;
}

export interface IDocumentProcessor {
  extractText(content: Buffer, mimeType: string): Promise<Result<string>>;
  generateSearchableContent(text: string): Promise<Result<string>>;
}

export class UploadAssetUseCase {
  constructor(
    private readonly assetRepository: IAssetRepository,
    private readonly storageService: IStorageService,
    private readonly documentProcessor?: IDocumentProcessor,
    private readonly eventBus?: EventBus
  ) {}

  async execute(input: UploadAssetInput): Promise<Result<UploadAssetOutput>> {
    try {
      // Step 1: Validate input
      const validationResult = this.validateInput(input);
      if (!validationResult.success) {
        return ResultUtils.fail(validationResult.error);
      }

      // Step 2: Check user permissions (if organization/vault provided)
      if (input.organizationId || input.vaultId) {
        const permissionCheck = await this.checkUploadPermissions(
          input.userId,
          input.organizationId,
          input.vaultId
        );
        if (!permissionCheck.success) {
          return ResultUtils.fail(permissionCheck.error);
        }
      }

      // Step 3: Generate storage path
      const storagePath = this.generateStoragePath(
        input.fileName,
        input.userId,
        input.organizationId
      );

      // Step 4: Upload file to storage
      const storageBucket = input.storageBucket || 'assets';
      const uploadResult = await this.storageService.uploadFile({
        bucket: storageBucket,
        path: storagePath,
        content: input.fileContent,
        mimeType: input.mimeType,
        metadata: {
          userId: input.userId,
          organizationId: input.organizationId || '',
          originalFileName: input.fileName,
          uploadedAt: new Date().toISOString()
        }
      });

      if (!uploadResult.success) {
        return ResultUtils.fail(uploadResult.error);
      }

      // Step 5: Create FileMetadata value object
      const fileMetadataResult = FileMetadata.create({
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileType: this.extractFileType(input.fileName),
        filePath: uploadResult.data.path,
        storageBucket: storageBucket,
        originalFileName: input.fileName
      });

      if (!fileMetadataResult.success) {
        // Cleanup uploaded file if metadata creation fails
        // await this.storageService.deleteFile({ bucket: storageBucket, path: storagePath });
        return ResultUtils.fail(fileMetadataResult.error);
      }

      // Step 6: Generate thumbnail if requested and applicable
      let thumbnailUrl: string | undefined;
      if (input.generateThumbnail && this.isImageOrPdf(input.mimeType)) {
        const thumbnailResult = await this.storageService.generateThumbnail({
          bucket: storageBucket,
          filePath: uploadResult.data.path,
          mimeType: input.mimeType
        });
        
        if (thumbnailResult.success) {
          thumbnailUrl = thumbnailResult.data;
        }
      }

      // Step 7: Create Asset domain entity
      const assetId = createAssetId(this.generateAssetId());
      const assetResult = Asset.create({
        id: assetId,
        title: input.title,
        description: input.description,
        fileMetadata: {
          ...fileMetadataResult.data.toJSON(),
          thumbnailUrl
        },
        ownerId: input.userId,
        uploadedBy: input.userId,
        organizationId: input.organizationId,
        vaultId: input.vaultId,
        tags: input.tags,
        category: input.category,
        folderPath: input.folderPath
      });

      if (!assetResult.success) {
        // Cleanup uploaded file if asset creation fails
        // await this.storageService.deleteFile({ bucket: storageBucket, path: storagePath });
        return ResultUtils.fail(assetResult.error);
      }

      const asset = assetResult.data;

      // Step 8: Process document content if requested
      if (input.processDocument && this.documentProcessor) {
        this.processDocumentAsync(asset, input.fileContent, input.mimeType);
      }

      // Step 9: Persist asset to repository
      const saveResult = await this.assetRepository.create(asset);
      if (!saveResult.success) {
        // Cleanup uploaded file if save fails
        // await this.storageService.deleteFile({ bucket: storageBucket, path: storagePath });
        return ResultUtils.fail(saveResult.error);
      }

      // Step 10: Mark asset as ready
      asset.markAsReady();
      await this.assetRepository.update(asset);

      // Step 11: Publish domain events
      if (this.eventBus) {
        await asset.publishDomainEvents(this.eventBus);
        
        // Emit specific event for handlers
        await this.eventBus.publish({
          eventName: 'AssetUploaded',
          aggregateId: asset.id,
          payload: {
            assetId: asset.id,
            title: asset.title || input.title,
            fileName: input.fileName,
            fileType: this.extractFileType(input.fileName),
            mimeType: input.mimeType,
            filePath: storagePath,
            storageBucket,
            fileSize: input.fileSize,
            uploadedBy: input.userId,
            ownerId: input.userId,
            organizationId: input.organizationId,
            vaultId: input.vaultId,
            tags: input.tags,
            category: input.category,
            description: input.description,
            timestamp: new Date()
          }
        });
      }

      // Step 12: Return result
      return ResultUtils.ok({
        asset: saveResult.data,
        uploadUrl: uploadResult.data.url,
        thumbnailUrl
      });

    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Unknown error during asset upload')
      );
    }
  }

  private validateInput(input: UploadAssetInput): Result<void> {
    if (!input.fileName || input.fileName.trim().length === 0) {
      return ResultUtils.fail(new Error('File name is required'));
    }

    if (!input.title || input.title.trim().length === 0) {
      return ResultUtils.fail(new Error('Title is required'));
    }

    if (input.fileSize <= 0) {
      return ResultUtils.fail(new Error('Invalid file size'));
    }

    if (input.fileSize > 50 * 1024 * 1024) { // 50MB limit
      return ResultUtils.fail(new Error('File size exceeds 50MB limit'));
    }

    if (!input.mimeType) {
      return ResultUtils.fail(new Error('MIME type is required'));
    }

    if (!input.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }

  private async checkUploadPermissions(
    userId: UserId,
    organizationId?: OrganizationId,
    vaultId?: VaultId
  ): Promise<Result<void>> {
    // In a real implementation, check if user has permission to upload to the org/vault
    // For now, assume permission is granted
    return ResultUtils.ok(undefined);
  }

  private generateStoragePath(
    fileName: string,
    userId: UserId,
    organizationId?: OrganizationId
  ): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    if (organizationId) {
      return `organizations/${organizationId}/assets/${userId}/${timestamp}_${randomSuffix}_${safeName}`;
    }
    
    return `users/${userId}/assets/${timestamp}_${randomSuffix}_${safeName}`;
  }

  private generateAssetId(): string {
    // Generate a UUID v4 for the asset ID
    // Supabase requires UUID format for the id column
    return crypto.randomUUID();
  }

  private extractFileType(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex > 0) {
      return fileName.substring(lastDotIndex + 1).toLowerCase();
    }
    return 'unknown';
  }

  private isImageOrPdf(mimeType: string): boolean {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf';
  }

  private async processDocumentAsync(
    asset: Asset,
    content: Buffer,
    mimeType: string
  ): Promise<void> {
    // Process document in background
    if (!this.documentProcessor) return;

    try {
      // Extract text from document
      const textResult = await this.documentProcessor.extractText(content, mimeType);
      if (!textResult.success) return;

      // Generate searchable content
      const searchableResult = await this.documentProcessor.generateSearchableContent(textResult.data);
      if (!searchableResult.success) return;

      // Update asset with searchable content
      // This would typically update a search index or metadata
      // For now, we'll add it as a tag or description update
      await this.assetRepository.updateMetadata(
        asset.id,
        {
          description: asset.description 
            ? `${asset.description}\n\nSearchable content: ${searchableResult.data.substring(0, 500)}...`
            : `Searchable content: ${searchableResult.data.substring(0, 500)}...`
        },
        asset.uploadedBy
      );
    } catch (error) {
      console.error('Failed to process document:', error);
      // Don't fail the upload if document processing fails
    }
  }
}