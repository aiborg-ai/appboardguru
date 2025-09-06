/**
 * Asset Repository Interface
 * Defines the contract for asset data persistence
 * This is a PORT in hexagonal architecture - no implementation details
 */

import { Result } from '../../../01-shared/types/core.types';
import { Asset } from '../../../domain/entities/asset.entity';
import { 
  AssetId, 
  UserId, 
  OrganizationId, 
  VaultId 
} from '../../../types/core';

export interface AssetSearchCriteria {
  ownerId?: UserId;
  organizationId?: OrganizationId;
  vaultId?: VaultId;
  category?: string;
  tags?: string[];
  searchTerm?: string;
  folderPath?: string;
  status?: string;
  visibility?: string;
  mimeTypes?: string[];
  minSize?: number;
  maxSize?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  includeDeleted?: boolean;
}

export interface AssetListOptions {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'fileSize' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedAssets {
  assets: Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssetStorageInfo {
  filePath: string;
  storageBucket: string;
  storageProvider: 'supabase' | 's3' | 'local';
  publicUrl?: string;
  signedUrl?: string;
  expiresAt?: Date;
}

export interface AssetShareInfo {
  assetId: AssetId;
  sharedWithUserId: UserId;
  sharedByUserId: UserId;
  permissionLevel: string;
  expiresAt?: Date;
  message?: string;
}

export interface AssetStatistics {
  totalAssets: number;
  totalSize: number;
  assetsByCategory: Record<string, number>;
  assetsByType: Record<string, number>;
  recentlyViewed: Asset[];
  mostViewed: Asset[];
  mostDownloaded: Asset[];
}

/**
 * Asset Repository Interface
 * All methods return Result types for consistent error handling
 */
export interface IAssetRepository {
  // Create operations
  create(asset: Asset): Promise<Result<Asset>>;
  createBatch(assets: Asset[]): Promise<Result<Asset[]>>;

  // Read operations
  findById(id: AssetId): Promise<Result<Asset>>;
  findByIds(ids: AssetId[]): Promise<Result<Asset[]>>;
  findByOwner(ownerId: UserId, options?: AssetListOptions): Promise<Result<PaginatedAssets>>;
  findByOrganization(organizationId: OrganizationId, options?: AssetListOptions): Promise<Result<PaginatedAssets>>;
  findByVault(vaultId: VaultId, options?: AssetListOptions): Promise<Result<PaginatedAssets>>;
  search(criteria: AssetSearchCriteria, options?: AssetListOptions): Promise<Result<PaginatedAssets>>;
  
  // Update operations
  update(asset: Asset): Promise<Result<Asset>>;
  updateStatus(id: AssetId, status: string, updatedBy: UserId): Promise<Result<void>>;
  updateMetadata(id: AssetId, metadata: Partial<{
    title: string;
    description: string;
    tags: string[];
    category: string;
  }>, updatedBy: UserId): Promise<Result<void>>;

  // Delete operations
  delete(id: AssetId, deletedBy: UserId): Promise<Result<void>>;
  softDelete(id: AssetId, deletedBy: UserId): Promise<Result<void>>;
  restore(id: AssetId, restoredBy: UserId): Promise<Result<void>>;
  permanentDelete(id: AssetId): Promise<Result<void>>;

  // Storage operations
  getStorageInfo(id: AssetId): Promise<Result<AssetStorageInfo>>;
  generateSignedUrl(id: AssetId, expiresInSeconds?: number): Promise<Result<string>>;
  moveToVault(id: AssetId, vaultId: VaultId, movedBy: UserId): Promise<Result<void>>;
  
  // Sharing operations
  share(shareInfo: AssetShareInfo): Promise<Result<void>>;
  unshare(assetId: AssetId, userId: UserId): Promise<Result<void>>;
  getSharedUsers(assetId: AssetId): Promise<Result<AssetShareInfo[]>>;
  getSharedAssets(userId: UserId, options?: AssetListOptions): Promise<Result<PaginatedAssets>>;
  
  // Analytics operations
  incrementViewCount(id: AssetId): Promise<Result<void>>;
  incrementDownloadCount(id: AssetId): Promise<Result<void>>;
  recordAccess(id: AssetId, userId: UserId, action: 'view' | 'download' | 'edit'): Promise<Result<void>>;
  getStatistics(organizationId?: OrganizationId): Promise<Result<AssetStatistics>>;

  // Permission checks
  checkPermission(assetId: AssetId, userId: UserId, permission: 'read' | 'write' | 'delete' | 'share'): Promise<Result<boolean>>;
  getUserPermissions(assetId: AssetId, userId: UserId): Promise<Result<string[]>>;

  // Bulk operations
  bulkUpdateStatus(ids: AssetId[], status: string, updatedBy: UserId): Promise<Result<void>>;
  bulkDelete(ids: AssetId[], deletedBy: UserId): Promise<Result<void>>;
  bulkMoveToVault(ids: AssetId[], vaultId: VaultId, movedBy: UserId): Promise<Result<void>>;

  // Transaction support
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
}