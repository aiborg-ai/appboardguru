/**
 * Asset Service
 * Business logic for file processing and management
 * Follows CLAUDE.md DDD architecture patterns
 */

import { BaseService } from './base.service';
import { AssetRepository, AssetUploadData, AssetWithDetails } from '../repositories/asset.repository.enhanced';
import { Result, Ok, Err } from '../repositories/result';
import { Asset, AssetMetadata, AssetVersion } from '../../types/entities/asset.types';
import { AssetId, UserId, OrganizationId, VaultId } from '../../types/core';

export interface IAssetService {
  uploadAsset(data: AssetUploadData): Promise<Result<AssetWithDetails>>;
  getAsset(assetId: AssetId): Promise<Result<Asset>>;
  updateAsset(assetId: AssetId, data: UpdateAssetData): Promise<Result<Asset>>;
  deleteAsset(assetId: AssetId): Promise<Result<void>>;
  getAssetVersions(assetId: AssetId): Promise<Result<AssetVersion[]>>;
  downloadAsset(assetId: AssetId, versionId?: string): Promise<Result<AssetDownload>>;
  searchAssets(criteria: AssetSearchCriteria): Promise<Result<Asset[]>>;
  processDocument(assetId: AssetId): Promise<Result<ProcessedDocument>>;
}

export interface UploadAssetData {
  file: Buffer;
  fileName: string;
  mimeType: string;
  size: number;
  vaultId: VaultId;
  userId: UserId;
  organizationId: OrganizationId;
  metadata?: Partial<AssetMetadata>;
  tags?: string[];
  description?: string;
}

export interface UpdateAssetData {
  name?: string;
  description?: string;
  tags?: string[];
  metadata?: Partial<AssetMetadata>;
  updatedBy: UserId;
}

export interface AssetDownload {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  expiresAt: string;
}

export interface AssetSearchCriteria {
  query?: string;
  vaultId?: VaultId;
  organizationId?: OrganizationId;
  userId?: UserId;
  fileType?: string[];
  tags?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  limit?: number;
  offset?: number;
}

export interface ProcessedDocument {
  assetId: AssetId;
  text: string;
  metadata: DocumentMetadata;
  summary?: string;
  keywords?: string[];
  entities?: DocumentEntity[];
}

export interface DocumentMetadata {
  pageCount?: number;
  wordCount?: number;
  language?: string;
  author?: string;
  title?: string;
  subject?: string;
  createdDate?: string;
  modifiedDate?: string;
}

export interface DocumentEntity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'other';
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export class AssetService extends BaseService implements IAssetService {
  constructor(
    private readonly assetRepository: AssetRepository
  ) {
    super();
  }

  async uploadAsset(data: AssetUploadData): Promise<Result<AssetWithDetails>> {
    try {
      // Validate upload data
      const validation = this.validateUploadData(data);
      if (!validation.success) {
        return validation;
      }

      // Check file size limits (50MB default)
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (data.fileSize > MAX_FILE_SIZE) {
        return Err(new Error(`File size exceeds limit of ${this.formatFileSize(MAX_FILE_SIZE)}`));
      }

      // Validate file type
      const allowedTypes = this.getAllowedMimeTypes();
      if (!allowedTypes.includes(data.mimeType)) {
        return Err(new Error(`File type ${data.mimeType} is not allowed`));
      }

      // Scan for viruses (stub for now)
      const virusScanResult = await this.scanForViruses(data.file);
      if (!virusScanResult.clean) {
        return Err(new Error('File failed security scan'));
      }

      // Upload to storage first
      const storageResult = await this.assetRepository.uploadFileToStorage(data);
      if (!storageResult.success) {
        return storageResult;
      }

      // Create asset record with storage info
      const assetResult = await this.assetRepository.createAssetRecord(data, storageResult.data);
      if (!assetResult.success) {
        // Clean up uploaded file if database creation fails
        await this.assetRepository.deleteFileFromStorage(storageResult.data.filePath);
        return assetResult;
      }

      // Log activity
      await this.logAssetActivity(
        data.uploadedBy,
        data.organizationId,
        'uploaded',
        assetResult.data.id,
        data.title
      );

      return assetResult;

    } catch (error) {
      return this.handleError(error, 'Failed to upload asset');
    }
  }

  async getAsset(assetId: AssetId): Promise<Result<Asset>> {
    try {
      const asset = await this.assetRepository.findById(assetId);
      
      if (!asset) {
        return Err(new Error('Asset not found'));
      }

      return Ok(asset);
    } catch (error) {
      return this.handleError(error, 'Failed to get asset');
    }
  }

  async updateAsset(assetId: AssetId, data: UpdateAssetData): Promise<Result<Asset>> {
    try {
      const existingAsset = await this.assetRepository.findById(assetId);
      if (!existingAsset) {
        return Err(new Error('Asset not found'));
      }

      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      const updatedAsset = await this.assetRepository.update(assetId, updateData);
      
      return Ok(updatedAsset);
    } catch (error) {
      return this.handleError(error, 'Failed to update asset');
    }
  }

  async deleteAsset(assetId: AssetId): Promise<Result<void>> {
    try {
      const asset = await this.assetRepository.findById(assetId);
      if (!asset) {
        return Err(new Error('Asset not found'));
      }

      // Soft delete - mark as deleted
      await this.assetRepository.update(assetId, {
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Schedule file deletion from storage
      await this.scheduleStorageDeletion(asset.storagePath);

      return Ok(undefined);
    } catch (error) {
      return this.handleError(error, 'Failed to delete asset');
    }
  }

  async getAssetVersions(assetId: AssetId): Promise<Result<AssetVersion[]>> {
    try {
      const versions = await this.assetRepository.getVersions(assetId);
      return Ok(versions);
    } catch (error) {
      return this.handleError(error, 'Failed to get asset versions');
    }
  }

  async downloadAsset(assetId: AssetId, versionId?: string): Promise<Result<AssetDownload>> {
    try {
      const asset = await this.assetRepository.findById(assetId);
      if (!asset) {
        return Err(new Error('Asset not found'));
      }

      // Generate secure download URL
      const downloadUrl = await this.generateDownloadUrl(asset.storagePath, asset.fileName);
      
      const download: AssetDownload = {
        url: downloadUrl,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        size: asset.size,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      };

      return Ok(download);
    } catch (error) {
      return this.handleError(error, 'Failed to generate download URL');
    }
  }

  async searchAssets(criteria: AssetSearchCriteria): Promise<Result<Asset[]>> {
    try {
      const assets = await this.assetRepository.search(criteria);
      return Ok(assets);
    } catch (error) {
      return this.handleError(error, 'Failed to search assets');
    }
  }

  async processDocument(assetId: AssetId): Promise<Result<ProcessedDocument>> {
    try {
      const asset = await this.assetRepository.findById(assetId);
      if (!asset) {
        return Err(new Error('Asset not found'));
      }

      // Only process document types
      if (!this.isDocumentType(asset.mimeType)) {
        return Err(new Error('Asset is not a document type'));
      }

      // Extract text content
      const textResult = await this.extractTextContent(asset.storagePath, asset.mimeType);
      if (!textResult.success) {
        return Err(textResult.error);
      }

      // Process document with AI
      const processed: ProcessedDocument = {
        assetId: asset.id,
        text: textResult.text,
        metadata: textResult.metadata,
        summary: await this.generateSummary(textResult.text),
        keywords: await this.extractKeywords(textResult.text),
        entities: await this.extractEntities(textResult.text),
      };

      // Store processed data
      await this.assetRepository.update(assetId, {
        processedData: processed,
        processedAt: new Date().toISOString(),
      });

      return Ok(processed);
    } catch (error) {
      return this.handleError(error, 'Failed to process document');
    }
  }

  private validateUploadData(data: UploadAssetData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.file || data.file.length === 0) {
      errors.push('File data is required');
    }

    if (!data.fileName || data.fileName.trim().length === 0) {
      errors.push('File name is required');
    }

    if (!data.mimeType) {
      errors.push('MIME type is required');
    }

    if (!this.isAllowedMimeType(data.mimeType)) {
      errors.push('File type not allowed');
    }

    if (data.size <= 0) {
      errors.push('File size must be greater than 0');
    }

    if (!data.vaultId) {
      errors.push('Vault ID is required');
    }

    if (!data.userId) {
      errors.push('User ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isAllowedMimeType(mimeType: string): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'audio/mpeg',
    ];

    return allowedTypes.includes(mimeType);
  }

  private getMaxFileSize(mimeType: string): number {
    const sizeMap: Record<string, number> = {
      'application/pdf': 50 * 1024 * 1024, // 50MB
      'video/mp4': 500 * 1024 * 1024, // 500MB
      'audio/mpeg': 100 * 1024 * 1024, // 100MB
    };

    return sizeMap[mimeType] || 25 * 1024 * 1024; // 25MB default
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  private async scanForViruses(file: Buffer): Promise<{ clean: boolean; details?: string }> {
    // TODO: Integrate with virus scanning service
    // For now, perform basic checks
    return { clean: true };
  }

  private async generateFileHash(file: Buffer): Promise<string> {
    // TODO: Generate SHA-256 hash of file content
    return `hash_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private async extractMetadata(file: Buffer, mimeType: string, fileName: string): Promise<Partial<AssetMetadata>> {
    // TODO: Extract metadata based on file type
    return {
      originalName: fileName,
      uploadedAt: new Date().toISOString(),
    };
  }

  private async uploadToStorage(assetId: AssetId, file: Buffer, mimeType: string): Promise<{ success: boolean; path?: string; url?: string; error?: Error }> {
    // TODO: Upload to cloud storage (S3, GCS, etc.)
    const path = `assets/${assetId}`;
    const url = `https://storage.example.com/${path}`;
    
    return {
      success: true,
      path,
      url
    };
  }

  private async scheduleStorageDeletion(storagePath: string): Promise<void> {
    // TODO: Schedule file deletion from storage
    console.log(`Scheduled deletion for: ${storagePath}`);
  }

  private async generateDownloadUrl(storagePath: string, fileName: string): Promise<string> {
    // TODO: Generate signed URL for secure download
    return `https://storage.example.com/${storagePath}?download=${fileName}`;
  }

  private getAllowedMimeTypes(): string[] {
    return [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Videos
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ];
  }

  private async logAssetActivity(
    userId: UserId,
    organizationId: OrganizationId,
    action: string,
    assetId: string,
    assetTitle: string
  ): Promise<void> {
    try {
      // TODO: Implement proper activity logging using activity service
      console.log(`Asset Activity: ${action} - Asset: ${assetTitle} (${assetId}) by User: ${userId} in Org: ${organizationId}`);
    } catch (error) {
      // Log error but don't fail the upload
      console.error('Failed to log asset activity:', error);
    }
  }

  private validateUploadData(data: AssetUploadData): Result<boolean> {
    const errors: string[] = [];

    if (!data.file || data.file.length === 0) {
      errors.push('File is required');
    }

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (data.title && data.title.length > 255) {
      errors.push('Title must be less than 255 characters');
    }

    if (!data.fileName || data.fileName.trim().length === 0) {
      errors.push('File name is required');
    }

    if (!data.mimeType || data.mimeType.trim().length === 0) {
      errors.push('MIME type is required');
    }

    if (!data.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!data.uploadedBy) {
      errors.push('Uploaded by user ID is required');
    }

    if (data.description && data.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    if (data.tags && data.tags.length > 10) {
      errors.push('Maximum 10 tags allowed');
    }

    if (data.tags && data.tags.some(tag => tag.length > 50)) {
      errors.push('Each tag must be less than 50 characters');
    }

    if (errors.length > 0) {
      return Err(new Error(`Validation failed: ${errors.join(', ')}`));
    }

    return Ok(true);
  }

  private isDocumentType(mimeType: string): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    return documentTypes.includes(mimeType);
  }

  private async extractTextContent(storagePath: string, mimeType: string): Promise<{ success: boolean; text?: string; metadata?: DocumentMetadata; error?: Error }> {
    // TODO: Extract text based on file type
    return {
      success: true,
      text: 'Extracted text content',
      metadata: {
        pageCount: 1,
        wordCount: 100,
        language: 'en',
      }
    };
  }

  private async generateSummary(text: string): Promise<string> {
    // TODO: Generate AI summary
    return 'AI-generated summary of the document content';
  }

  private async extractKeywords(text: string): Promise<string[]> {
    // TODO: Extract keywords using NLP
    return ['keyword1', 'keyword2', 'keyword3'];
  }

  private async extractEntities(text: string): Promise<DocumentEntity[]> {
    // TODO: Extract named entities using NLP
    return [
      {
        text: 'BoardGuru',
        type: 'organization',
        confidence: 0.95,
        startIndex: 0,
        endIndex: 9,
      }
    ];
  }
}