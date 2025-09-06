/**
 * Asset Entity - Core Domain Model
 * Represents a document or file in the system with its business rules
 */

import { AggregateRoot } from '../core';
import type { DomainEvent } from '../core';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import { 
  AssetId, 
  UserId, 
  OrganizationId, 
  VaultId 
} from '../../types/core';

// Value Objects
export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileType: string;
  filePath?: string;
  thumbnailUrl?: string;
  checksum?: string;
}

export interface AssetPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
}

// Asset Status
export enum AssetStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  DELETED = 'deleted'
}

// Asset Visibility
export enum AssetVisibility {
  PRIVATE = 'private',
  ORGANIZATION = 'organization',
  PUBLIC = 'public'
}

// Domain Events
export class AssetUploadedEvent implements DomainEvent {
  public readonly eventType = 'AssetUploaded';
  public readonly occurredAt: Date;
  public readonly aggregateId: string;
  public readonly eventData: any;

  constructor(
    public readonly assetId: AssetId,
    public readonly fileName: string,
    public readonly uploadedBy: UserId,
    public readonly organizationId?: OrganizationId
  ) {
    this.aggregateId = assetId;
    this.occurredAt = new Date();
    this.eventData = { fileName, uploadedBy, organizationId };
  }
}

export class AssetSharedEvent implements DomainEvent {
  public readonly eventType = 'AssetShared';
  public readonly occurredAt: Date;
  public readonly aggregateId: string;
  public readonly eventData: any;

  constructor(
    public readonly assetId: AssetId,
    public readonly sharedWith: UserId,
    public readonly sharedBy: UserId,
    public readonly permissions: string[]
  ) {
    this.aggregateId = assetId;
    this.occurredAt = new Date();
    this.eventData = { sharedWith, sharedBy, permissions };
  }
}

export class AssetDeletedEvent implements DomainEvent {
  public readonly eventType = 'AssetDeleted';
  public readonly occurredAt: Date;
  public readonly aggregateId: string;
  public readonly eventData: any;

  constructor(
    public readonly assetId: AssetId,
    public readonly deletedBy: UserId,
    public readonly reason?: string
  ) {
    this.aggregateId = assetId;
    this.occurredAt = new Date();
    this.eventData = { deletedBy, reason };
  }
}

// Asset Properties
export interface AssetProps {
  id: AssetId;
  title: string;
  description?: string;
  fileMetadata: FileMetadata;
  ownerId: UserId;
  organizationId?: OrganizationId;
  vaultId?: VaultId;
  status: AssetStatus;
  visibility: AssetVisibility;
  tags: string[];
  category: string;
  folderPath: string;
  viewCount: number;
  downloadCount: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy: UserId;
}

// Asset Entity
export class Asset extends AggregateRoot {
  private constructor(private props: AssetProps) {
    super();
  }

  // Factory method for creating new assets
  static create(params: {
    id: AssetId;
    title: string;
    description?: string;
    fileMetadata: FileMetadata;
    ownerId: UserId;
    uploadedBy: UserId;
    organizationId?: OrganizationId;
    vaultId?: VaultId;
    tags?: string[];
    category?: string;
    folderPath?: string;
    visibility?: AssetVisibility;
  }): Result<Asset> {
    // Business rule validations
    if (!params.title || params.title.trim().length === 0) {
      return ResultUtils.fail(new Error('Asset title is required'));
    }

    if (params.title.length > 255) {
      return ResultUtils.fail(new Error('Asset title must be less than 255 characters'));
    }

    if (!params.fileMetadata.fileName) {
      return ResultUtils.fail(new Error('File name is required'));
    }

    if (params.fileMetadata.fileSize <= 0) {
      return ResultUtils.fail(new Error('File size must be greater than 0'));
    }

    if (params.fileMetadata.fileSize > 50 * 1024 * 1024) { // 50MB limit
      return ResultUtils.fail(new Error('File size exceeds maximum limit of 50MB'));
    }

    // Validate MIME type
    const allowedMimeTypes = [
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
      'image/webp'
    ];

    if (!allowedMimeTypes.includes(params.fileMetadata.mimeType)) {
      return ResultUtils.fail(new Error(`File type ${params.fileMetadata.mimeType} is not allowed`));
    }

    // Sanitize folder path
    const sanitizedFolderPath = params.folderPath
      ? params.folderPath.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
      : '/';

    // Create the asset
    const asset = new Asset({
      id: params.id,
      title: params.title.trim(),
      description: params.description?.trim(),
      fileMetadata: params.fileMetadata,
      ownerId: params.ownerId,
      uploadedBy: params.uploadedBy,
      organizationId: params.organizationId,
      vaultId: params.vaultId,
      status: AssetStatus.PENDING,
      visibility: params.visibility || AssetVisibility.PRIVATE,
      tags: params.tags || [],
      category: params.category || 'document',
      folderPath: sanitizedFolderPath,
      viewCount: 0,
      downloadCount: 0,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add domain event
    asset.addDomainEvent('AssetUploaded', {
      assetId: params.id,
      fileName: params.fileMetadata.fileName,
      uploadedBy: params.uploadedBy,
      organizationId: params.organizationId
    });

    return ResultUtils.ok(asset);
  }

  // Factory method for reconstituting from persistence
  static fromPersistence(props: AssetProps): Asset {
    return new Asset(props);
  }

  // Business methods
  markAsReady(): Result<void> {
    if (this.props.status === AssetStatus.DELETED) {
      return ResultUtils.fail(new Error('Cannot mark deleted asset as ready'));
    }

    this.props.status = AssetStatus.READY;
    this.props.updatedAt = new Date();
    return ResultUtils.ok(undefined);
  }

  markAsFailed(reason?: string): Result<void> {
    this.props.status = AssetStatus.FAILED;
    this.props.updatedAt = new Date();
    
    if (reason) {
      this.addDomainEvent('AssetProcessingFailed', { 
        assetId: this.props.id, 
        reason 
      });
    }
    
    return ResultUtils.ok(undefined);
  }

  updateMetadata(updates: {
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
  }): Result<void> {
    if (this.props.isDeleted) {
      return ResultUtils.fail(new Error('Cannot update deleted asset'));
    }

    if (updates.title !== undefined) {
      if (!updates.title || updates.title.trim().length === 0) {
        return ResultUtils.fail(new Error('Asset title cannot be empty'));
      }
      this.props.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      this.props.description = updates.description.trim();
    }

    if (updates.tags !== undefined) {
      this.props.tags = updates.tags;
    }

    if (updates.category !== undefined) {
      this.props.category = updates.category;
    }

    this.props.updatedAt = new Date();
    return ResultUtils.ok(undefined);
  }

  share(sharedWith: UserId, sharedBy: UserId, permissions: string[]): Result<void> {
    if (this.props.isDeleted) {
      return ResultUtils.fail(new Error('Cannot share deleted asset'));
    }

    if (this.props.status !== AssetStatus.READY) {
      return ResultUtils.fail(new Error('Cannot share asset that is not ready'));
    }

    if (sharedWith === this.props.ownerId) {
      return ResultUtils.fail(new Error('Cannot share asset with its owner'));
    }

    this.addDomainEvent('AssetShared', {
      assetId: this.props.id,
      sharedWith,
      sharedBy,
      permissions
    });

    return ResultUtils.ok(undefined);
  }

  delete(deletedBy: UserId, reason?: string): Result<void> {
    if (this.props.isDeleted) {
      return ResultUtils.fail(new Error('Asset is already deleted'));
    }

    // Only owner or admin can delete
    if (deletedBy !== this.props.ownerId) {
      // In real implementation, check if deletedBy is admin
      return ResultUtils.fail(new Error('Only asset owner can delete the asset'));
    }

    this.props.isDeleted = true;
    this.props.status = AssetStatus.DELETED;
    this.props.updatedAt = new Date();

    this.addDomainEvent('AssetDeleted', {
      assetId: this.props.id,
      deletedBy,
      reason
    });

    return ResultUtils.ok(undefined);
  }

  incrementViewCount(): void {
    this.props.viewCount++;
    this.props.updatedAt = new Date();
  }

  incrementDownloadCount(): void {
    this.props.downloadCount++;
    this.props.updatedAt = new Date();
  }

  changeVisibility(visibility: AssetVisibility): Result<void> {
    if (this.props.isDeleted) {
      return ResultUtils.fail(new Error('Cannot change visibility of deleted asset'));
    }

    this.props.visibility = visibility;
    this.props.updatedAt = new Date();
    return ResultUtils.ok(undefined);
  }

  moveToVault(vaultId: VaultId): Result<void> {
    if (this.props.isDeleted) {
      return ResultUtils.fail(new Error('Cannot move deleted asset to vault'));
    }

    this.props.vaultId = vaultId;
    this.props.updatedAt = new Date();
    return ResultUtils.ok(undefined);
  }

  // Getters
  get id(): AssetId { return this.props.id; }
  get title(): string { return this.props.title; }
  get description(): string | undefined { return this.props.description; }
  get fileMetadata(): FileMetadata { return this.props.fileMetadata; }
  get ownerId(): UserId { return this.props.ownerId; }
  get organizationId(): OrganizationId | undefined { return this.props.organizationId; }
  get vaultId(): VaultId | undefined { return this.props.vaultId; }
  get status(): AssetStatus { return this.props.status; }
  get visibility(): AssetVisibility { return this.props.visibility; }
  get tags(): string[] { return this.props.tags; }
  get category(): string { return this.props.category; }
  get folderPath(): string { return this.props.folderPath; }
  get viewCount(): number { return this.props.viewCount; }
  get downloadCount(): number { return this.props.downloadCount; }
  get isDeleted(): boolean { return this.props.isDeleted; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get uploadedBy(): UserId { return this.props.uploadedBy; }

  // Serialization for persistence
  toPersistence(): AssetProps {
    return { ...this.props };
  }
}