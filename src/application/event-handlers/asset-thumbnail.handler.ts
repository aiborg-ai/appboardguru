/**
 * Asset Thumbnail Generation Handler
 * Generates thumbnails asynchronously when assets are uploaded
 */

import { EventHandler } from '../../01-shared/lib/event-bus';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import type { AssetId } from '../../types/core';

export interface AssetUploadedForThumbnailEvent {
  eventName: 'AssetUploaded' | 'AssetCreated';
  aggregateId: AssetId;
  payload: {
    assetId: AssetId;
    fileName: string;
    fileType: string;
    mimeType: string;
    filePath: string;
    storageBucket: string;
    fileSize: number;
    timestamp: Date;
  };
}

export interface ThumbnailConfig {
  sizes: Array<{
    name: string;
    width: number;
    height: number;
    quality?: number;
  }>;
  formats?: string[];
  defaultQuality?: number;
}

export interface IThumbnailService {
  generateThumbnail(params: {
    sourcePath: string;
    bucket: string;
    outputPath: string;
    width: number;
    height: number;
    quality?: number;
    format?: string;
  }): Promise<Result<string>>;

  generateMultipleThumbnails(params: {
    sourcePath: string;
    bucket: string;
    sizes: Array<{
      name: string;
      width: number;
      height: number;
      quality?: number;
    }>;
  }): Promise<Result<Record<string, string>>>;

  extractFirstPage(params: {
    pdfPath: string;
    bucket: string;
    outputPath: string;
  }): Promise<Result<string>>;

  generateVideoThumbnail(params: {
    videoPath: string;
    bucket: string;
    outputPath: string;
    timestamp?: number;
  }): Promise<Result<string>>;
}

export interface IAssetRepository {
  updateThumbnails(
    assetId: AssetId,
    thumbnails: Record<string, string>
  ): Promise<Result<void>>;
}

/**
 * Asset Thumbnail Generation Handler
 * Generates thumbnails for uploaded assets
 */
export class AssetThumbnailHandler implements EventHandler<AssetUploadedForThumbnailEvent> {
  private readonly defaultConfig: ThumbnailConfig = {
    sizes: [
      { name: 'small', width: 150, height: 150, quality: 85 },
      { name: 'medium', width: 400, height: 400, quality: 90 },
      { name: 'large', width: 800, height: 800, quality: 95 }
    ],
    formats: ['webp', 'jpg'],
    defaultQuality: 90
  };

  constructor(
    private readonly thumbnailService: IThumbnailService,
    private readonly assetRepository: IAssetRepository,
    private readonly config: ThumbnailConfig = {}
  ) {
    // Merge default config with provided config
    this.config = { ...this.defaultConfig, ...config };
  }

  async handle(event: AssetUploadedForThumbnailEvent): Promise<Result<void>> {
    console.log('[AssetThumbnailHandler] Processing event:', {
      assetId: event.payload.assetId,
      fileType: event.payload.fileType,
      mimeType: event.payload.mimeType
    });

    try {
      // Check if file type supports thumbnails
      if (!this.supportsThumbnails(event.payload.mimeType, event.payload.fileType)) {
        console.log('[AssetThumbnailHandler] File type does not support thumbnails:', event.payload.fileType);
        return ResultUtils.ok(undefined);
      }

      let thumbnailUrls: Record<string, string> = {};

      // Handle different file types
      if (this.isImage(event.payload.mimeType)) {
        thumbnailUrls = await this.generateImageThumbnails(event);
      } else if (this.isPDF(event.payload.mimeType)) {
        thumbnailUrls = await this.generatePDFThumbnails(event);
      } else if (this.isVideo(event.payload.mimeType)) {
        thumbnailUrls = await this.generateVideoThumbnails(event);
      } else if (this.isDocument(event.payload.fileType)) {
        thumbnailUrls = await this.generateDocumentThumbnails(event);
      }

      // Update asset with thumbnail URLs
      if (Object.keys(thumbnailUrls).length > 0) {
        const updateResult = await this.assetRepository.updateThumbnails(
          event.payload.assetId,
          thumbnailUrls
        );

        if (!updateResult.success) {
          console.error('[AssetThumbnailHandler] Failed to update asset with thumbnails:', updateResult.error);
          return updateResult;
        }

        console.log('[AssetThumbnailHandler] Successfully generated thumbnails:', {
          assetId: event.payload.assetId,
          thumbnailCount: Object.keys(thumbnailUrls).length
        });
      }

      return ResultUtils.ok(undefined);

    } catch (error) {
      console.error('[AssetThumbnailHandler] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to generate thumbnails')
      );
    }
  }

  private async generateImageThumbnails(
    event: AssetUploadedForThumbnailEvent
  ): Promise<Record<string, string>> {
    const result = await this.thumbnailService.generateMultipleThumbnails({
      sourcePath: event.payload.filePath,
      bucket: event.payload.storageBucket,
      sizes: this.config.sizes!
    });

    if (!result.success) {
      console.error('[AssetThumbnailHandler] Failed to generate image thumbnails:', result.error);
      return {};
    }

    return result.data;
  }

  private async generatePDFThumbnails(
    event: AssetUploadedForThumbnailEvent
  ): Promise<Record<string, string>> {
    const thumbnails: Record<string, string> = {};

    // Extract first page as image
    const outputPath = `thumbnails/${event.payload.assetId}/pdf-preview.png`;
    const extractResult = await this.thumbnailService.extractFirstPage({
      pdfPath: event.payload.filePath,
      bucket: event.payload.storageBucket,
      outputPath
    });

    if (!extractResult.success) {
      console.error('[AssetThumbnailHandler] Failed to extract PDF first page:', extractResult.error);
      return {};
    }

    thumbnails['preview'] = extractResult.data;

    // Generate thumbnails from the extracted page
    const thumbResult = await this.thumbnailService.generateMultipleThumbnails({
      sourcePath: extractResult.data,
      bucket: event.payload.storageBucket,
      sizes: this.config.sizes!
    });

    if (thumbResult.success) {
      Object.assign(thumbnails, thumbResult.data);
    }

    return thumbnails;
  }

  private async generateVideoThumbnails(
    event: AssetUploadedForThumbnailEvent
  ): Promise<Record<string, string>> {
    const thumbnails: Record<string, string> = {};

    // Generate thumbnail at 2 seconds (or 0 if video is shorter)
    const outputPath = `thumbnails/${event.payload.assetId}/video-preview.jpg`;
    const videoThumbResult = await this.thumbnailService.generateVideoThumbnail({
      videoPath: event.payload.filePath,
      bucket: event.payload.storageBucket,
      outputPath,
      timestamp: 2 // seconds
    });

    if (!videoThumbResult.success) {
      console.error('[AssetThumbnailHandler] Failed to generate video thumbnail:', videoThumbResult.error);
      return {};
    }

    thumbnails['preview'] = videoThumbResult.data;

    // Generate different sizes from the video thumbnail
    const thumbResult = await this.thumbnailService.generateMultipleThumbnails({
      sourcePath: videoThumbResult.data,
      bucket: event.payload.storageBucket,
      sizes: this.config.sizes!
    });

    if (thumbResult.success) {
      Object.assign(thumbnails, thumbResult.data);
    }

    return thumbnails;
  }

  private async generateDocumentThumbnails(
    event: AssetUploadedForThumbnailEvent
  ): Promise<Record<string, string>> {
    // For documents like Word, Excel, PowerPoint, we might need to convert to PDF first
    // or use a specialized service. For now, return a placeholder or icon
    console.log('[AssetThumbnailHandler] Document thumbnail generation not yet implemented for:', event.payload.fileType);
    
    // You could return default icons based on file type
    const iconMap: Record<string, string> = {
      'doc': '/icons/word-icon.png',
      'docx': '/icons/word-icon.png',
      'xls': '/icons/excel-icon.png',
      'xlsx': '/icons/excel-icon.png',
      'ppt': '/icons/powerpoint-icon.png',
      'pptx': '/icons/powerpoint-icon.png'
    };

    const iconPath = iconMap[event.payload.fileType.toLowerCase()];
    if (iconPath) {
      return {
        'icon': iconPath,
        'small': iconPath,
        'medium': iconPath
      };
    }

    return {};
  }

  private supportsThumbnails(mimeType: string, fileType: string): boolean {
    return this.isImage(mimeType) || 
           this.isPDF(mimeType) || 
           this.isVideo(mimeType) || 
           this.isDocument(fileType);
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private isPDF(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  private isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  private isDocument(fileType: string): boolean {
    const documentTypes = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
    return documentTypes.includes(fileType.toLowerCase());
  }
}

/**
 * Factory function to create handler with dependencies
 */
export function createAssetThumbnailHandler(dependencies: {
  thumbnailService: IThumbnailService;
  assetRepository: IAssetRepository;
  config?: ThumbnailConfig;
}): AssetThumbnailHandler {
  return new AssetThumbnailHandler(
    dependencies.thumbnailService,
    dependencies.assetRepository,
    dependencies.config
  );
}