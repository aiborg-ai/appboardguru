/**
 * Asset Repository Implementation
 * Concrete implementation of the asset repository using Supabase
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import { Asset, AssetStatus, AssetVisibility } from '../../domain/entities/asset.entity';
import { FileMetadata } from '../../domain/value-objects/file-metadata.vo';
import {
  IAssetRepository,
  AssetSearchCriteria,
  AssetListOptions,
  PaginatedAssets,
  AssetStorageInfo,
  AssetShareInfo,
  AssetStatistics
} from '../../application/interfaces/repositories/asset.repository.interface';
import {
  AssetId,
  UserId,
  OrganizationId,
  VaultId,
  createAssetId,
  createUserId
} from '../../types/core';
import type { Database } from '../../types/database';

type AssetRow = Database['public']['Tables']['assets']['Row'];
type AssetInsert = Database['public']['Tables']['assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['assets']['Update'];

export class AssetRepositoryImpl implements IAssetRepository {
  private transaction: SupabaseClient | null = null;

  constructor(
    private readonly supabase: SupabaseClient<Database>
  ) {}

  // Create operations
  async create(asset: Asset): Promise<Result<Asset>> {
    try {
      const assetData = this.domainToDb(asset);
      
      const { data, error } = await this.getClient()
        .from('assets')
        .insert(assetData)
        .select()
        .single();

      if (error) {
        console.error('[AssetRepository] Create failed:', error);
        return ResultUtils.fail(new Error(`Failed to create asset: ${error.message}`));
      }

      const createdAsset = this.dbToDomain(data);
      return ResultUtils.ok(createdAsset);
    } catch (error) {
      console.error('[AssetRepository] Unexpected error during create:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create asset')
      );
    }
  }

  async createBatch(assets: Asset[]): Promise<Result<Asset[]>> {
    try {
      const assetData = assets.map(asset => this.domainToDb(asset));
      
      const { data, error } = await this.getClient()
        .from('assets')
        .insert(assetData)
        .select();

      if (error) {
        return ResultUtils.fail(new Error(`Failed to create assets: ${error.message}`));
      }

      const createdAssets = data.map(row => this.dbToDomain(row));
      return ResultUtils.ok(createdAssets);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create assets')
      );
    }
  }

  // Read operations
  async findById(id: AssetId): Promise<Result<Asset>> {
    try {
      const { data, error } = await this.getClient()
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.fail(new Error('Asset not found'));
        }
        return ResultUtils.fail(new Error(`Failed to fetch asset: ${error.message}`));
      }

      const asset = this.dbToDomain(data);
      return ResultUtils.ok(asset);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to fetch asset')
      );
    }
  }

  async findByIds(ids: AssetId[]): Promise<Result<Asset[]>> {
    try {
      const { data, error } = await this.getClient()
        .from('assets')
        .select('*')
        .in('id', ids);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to fetch assets: ${error.message}`));
      }

      const assets = data.map(row => this.dbToDomain(row));
      return ResultUtils.ok(assets);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to fetch assets')
      );
    }
  }

  async findByOwner(ownerId: UserId, options?: AssetListOptions): Promise<Result<PaginatedAssets>> {
    return this.search({ ownerId }, options);
  }

  async findByOrganization(organizationId: OrganizationId, options?: AssetListOptions): Promise<Result<PaginatedAssets>> {
    return this.search({ organizationId }, options);
  }

  async findByVault(vaultId: VaultId, options?: AssetListOptions): Promise<Result<PaginatedAssets>> {
    return this.search({ vaultId }, options);
  }

  async search(criteria: AssetSearchCriteria, options?: AssetListOptions): Promise<Result<PaginatedAssets>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const offset = (page - 1) * limit;
      const sortBy = options?.sortBy || 'createdAt';
      const sortOrder = options?.sortOrder || 'desc';

      let query = this.getClient()
        .from('assets')
        .select('*', { count: 'exact' });

      // Apply filters
      if (criteria.ownerId) {
        query = query.eq('owner_id', criteria.ownerId);
      }
      if (criteria.organizationId) {
        query = query.eq('organization_id', criteria.organizationId);
      }
      if (criteria.vaultId) {
        query = query.eq('vault_id', criteria.vaultId);
      }
      if (criteria.category) {
        query = query.eq('category', criteria.category);
      }
      if (criteria.status) {
        query = query.eq('status', criteria.status);
      }
      if (criteria.visibility) {
        query = query.eq('visibility', criteria.visibility);
      }
      if (criteria.folderPath) {
        query = query.eq('folder_path', criteria.folderPath);
      }

      // Handle deleted items
      if (!criteria.includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      // Search term
      if (criteria.searchTerm) {
        query = query.or(
          `title.ilike.%${criteria.searchTerm}%,` +
          `description.ilike.%${criteria.searchTerm}%,` +
          `file_name.ilike.%${criteria.searchTerm}%`
        );
      }

      // Tags filter
      if (criteria.tags && criteria.tags.length > 0) {
        query = query.contains('tags', criteria.tags);
      }

      // MIME types filter
      if (criteria.mimeTypes && criteria.mimeTypes.length > 0) {
        query = query.in('mime_type', criteria.mimeTypes);
      }

      // Size filters
      if (criteria.minSize !== undefined) {
        query = query.gte('file_size', criteria.minSize);
      }
      if (criteria.maxSize !== undefined) {
        query = query.lte('file_size', criteria.maxSize);
      }

      // Date filters
      if (criteria.createdAfter) {
        query = query.gte('created_at', criteria.createdAfter.toISOString());
      }
      if (criteria.createdBefore) {
        query = query.lte('created_at', criteria.createdBefore.toISOString());
      }

      // Apply sorting
      const sortColumn = this.mapSortColumn(sortBy);
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return ResultUtils.fail(new Error(`Failed to search assets: ${error.message}`));
      }

      const assets = (data || []).map(row => this.dbToDomain(row));
      const total = count || 0;

      return ResultUtils.ok({
        assets,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to search assets')
      );
    }
  }

  // Update operations
  async update(asset: Asset): Promise<Result<Asset>> {
    try {
      const updateData = this.domainToDbUpdate(asset);
      
      const { data, error } = await this.getClient()
        .from('assets')
        .update(updateData)
        .eq('id', asset.id)
        .select()
        .single();

      if (error) {
        return ResultUtils.fail(new Error(`Failed to update asset: ${error.message}`));
      }

      const updatedAsset = this.dbToDomain(data);
      return ResultUtils.ok(updatedAsset);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update asset')
      );
    }
  }

  async updateStatus(id: AssetId, status: string, updatedBy: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .from('assets')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to update status: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update status')
      );
    }
  }

  async updateMetadata(
    id: AssetId,
    metadata: Partial<{ title: string; description: string; tags: string[]; category: string }>,
    updatedBy: UserId
  ): Promise<Result<void>> {
    try {
      const updateData: AssetUpdate = {
        ...metadata,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.getClient()
        .from('assets')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to update metadata: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update metadata')
      );
    }
  }

  // Delete operations
  async delete(id: AssetId, deletedBy: UserId): Promise<Result<void>> {
    return this.softDelete(id, deletedBy);
  }

  async softDelete(id: AssetId, deletedBy: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .from('assets')
        .update({
          is_deleted: true,
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to delete asset: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to delete asset')
      );
    }
  }

  async restore(id: AssetId, restoredBy: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .from('assets')
        .update({
          is_deleted: false,
          status: 'ready',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to restore asset: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to restore asset')
      );
    }
  }

  async permanentDelete(id: AssetId): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to permanently delete asset: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to permanently delete asset')
      );
    }
  }

  // Storage operations
  async getStorageInfo(id: AssetId): Promise<Result<AssetStorageInfo>> {
    try {
      const { data, error } = await this.getClient()
        .from('assets')
        .select('file_path, storage_bucket')
        .eq('id', id)
        .single();

      if (error) {
        return ResultUtils.fail(new Error(`Failed to get storage info: ${error.message}`));
      }

      const storageInfo: AssetStorageInfo = {
        filePath: data.file_path || '',
        storageBucket: data.storage_bucket || 'assets',
        storageProvider: 'supabase'
      };

      return ResultUtils.ok(storageInfo);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get storage info')
      );
    }
  }

  async generateSignedUrl(id: AssetId, expiresInSeconds: number = 3600): Promise<Result<string>> {
    try {
      const storageInfoResult = await this.getStorageInfo(id);
      if (!storageInfoResult.success) {
        return storageInfoResult;
      }

      const { filePath, storageBucket } = storageInfoResult.data;

      const { data, error } = await this.supabase.storage
        .from(storageBucket)
        .createSignedUrl(filePath, expiresInSeconds);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to generate signed URL: ${error.message}`));
      }

      return ResultUtils.ok(data.signedUrl);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to generate signed URL')
      );
    }
  }

  async moveToVault(id: AssetId, vaultId: VaultId, movedBy: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .from('assets')
        .update({
          vault_id: vaultId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to move to vault: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to move to vault')
      );
    }
  }

  // Sharing operations
  async share(shareInfo: AssetShareInfo): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .from('asset_shares')
        .insert({
          asset_id: shareInfo.assetId,
          shared_with_user_id: shareInfo.sharedWithUserId,
          shared_by_user_id: shareInfo.sharedByUserId,
          permission_level: shareInfo.permissionLevel,
          expires_at: shareInfo.expiresAt?.toISOString(),
          message: shareInfo.message,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        return ResultUtils.fail(new Error(`Failed to share asset: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to share asset')
      );
    }
  }

  async unshare(assetId: AssetId, userId: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .from('asset_shares')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('asset_id', assetId)
        .eq('shared_with_user_id', userId);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to unshare asset: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to unshare asset')
      );
    }
  }

  async getSharedUsers(assetId: AssetId): Promise<Result<AssetShareInfo[]>> {
    try {
      const { data, error } = await this.getClient()
        .from('asset_shares')
        .select('*')
        .eq('asset_id', assetId)
        .eq('is_active', true);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to get shared users: ${error.message}`));
      }

      const shareInfo = data.map(row => ({
        assetId: createAssetId(row.asset_id),
        sharedWithUserId: createUserId(row.shared_with_user_id),
        sharedByUserId: createUserId(row.shared_by_user_id),
        permissionLevel: row.permission_level,
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        message: row.message
      }));

      return ResultUtils.ok(shareInfo);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get shared users')
      );
    }
  }

  async getSharedAssets(userId: UserId, options?: AssetListOptions): Promise<Result<PaginatedAssets>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const offset = (page - 1) * limit;

      // First get shared asset IDs
      const { data: shares, error: sharesError } = await this.getClient()
        .from('asset_shares')
        .select('asset_id')
        .eq('shared_with_user_id', userId)
        .eq('is_active', true);

      if (sharesError) {
        return ResultUtils.fail(new Error(`Failed to get shared assets: ${sharesError.message}`));
      }

      if (!shares || shares.length === 0) {
        return ResultUtils.ok({
          assets: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        });
      }

      const assetIds = shares.map(s => s.asset_id);

      // Then fetch the assets
      const { data, error, count } = await this.getClient()
        .from('assets')
        .select('*', { count: 'exact' })
        .in('id', assetIds)
        .eq('is_deleted', false)
        .range(offset, offset + limit - 1);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to fetch shared assets: ${error.message}`));
      }

      const assets = (data || []).map(row => this.dbToDomain(row));
      const total = count || 0;

      return ResultUtils.ok({
        assets,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get shared assets')
      );
    }
  }

  // Analytics operations
  async incrementViewCount(id: AssetId): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .rpc('increment_asset_view_count', { asset_id: id });

      if (error) {
        // Fallback to manual increment if RPC doesn't exist
        const { error: updateError } = await this.getClient()
          .from('assets')
          .update({ 
            view_count: this.supabase.sql`view_count + 1`,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', id);

        if (updateError) {
          return ResultUtils.fail(new Error(`Failed to increment view count: ${updateError.message}`));
        }
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to increment view count')
      );
    }
  }

  async incrementDownloadCount(id: AssetId): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .rpc('increment_asset_download_count', { asset_id: id });

      if (error) {
        // Fallback to manual increment
        const { error: updateError } = await this.getClient()
          .from('assets')
          .update({ 
            download_count: this.supabase.sql`download_count + 1`,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', id);

        if (updateError) {
          return ResultUtils.fail(new Error(`Failed to increment download count: ${updateError.message}`));
        }
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to increment download count')
      );
    }
  }

  async recordAccess(id: AssetId, userId: UserId, action: 'view' | 'download' | 'edit'): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .from('asset_access_logs')
        .insert({
          asset_id: id,
          user_id: userId,
          action,
          accessed_at: new Date().toISOString()
        });

      if (error) {
        // Non-critical, just log
        console.warn('[AssetRepository] Failed to record access:', error);
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      // Non-critical error
      return ResultUtils.ok(undefined);
    }
  }

  async getStatistics(organizationId?: OrganizationId): Promise<Result<AssetStatistics>> {
    try {
      let query = this.getClient()
        .from('assets')
        .select('*')
        .eq('is_deleted', false);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        return ResultUtils.fail(new Error(`Failed to get statistics: ${error.message}`));
      }

      const assets = data || [];
      
      // Calculate statistics
      const totalAssets = assets.length;
      const totalSize = assets.reduce((sum, a) => sum + (a.file_size || 0), 0);
      
      const assetsByCategory = assets.reduce((acc, a) => {
        const category = a.category || 'other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const assetsByType = assets.reduce((acc, a) => {
        const type = a.file_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get recently viewed (sorted by updated_at)
      const recentlyViewed = assets
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 10)
        .map(row => this.dbToDomain(row));

      // Get most viewed
      const mostViewed = assets
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 10)
        .map(row => this.dbToDomain(row));

      // Get most downloaded
      const mostDownloaded = assets
        .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        .slice(0, 10)
        .map(row => this.dbToDomain(row));

      return ResultUtils.ok({
        totalAssets,
        totalSize,
        assetsByCategory,
        assetsByType,
        recentlyViewed,
        mostViewed,
        mostDownloaded
      });
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get statistics')
      );
    }
  }

  // Permission checks
  async checkPermission(
    assetId: AssetId,
    userId: UserId,
    permission: 'read' | 'write' | 'delete' | 'share'
  ): Promise<Result<boolean>> {
    try {
      // First check if user is owner
      const { data: asset, error: assetError } = await this.getClient()
        .from('assets')
        .select('owner_id, organization_id')
        .eq('id', assetId)
        .single();

      if (assetError) {
        return ResultUtils.fail(new Error(`Failed to check permission: ${assetError.message}`));
      }

      if (asset.owner_id === userId) {
        return ResultUtils.ok(true); // Owner has all permissions
      }

      // Check if user has shared access
      const { data: share, error: shareError } = await this.getClient()
        .from('asset_shares')
        .select('permission_level')
        .eq('asset_id', assetId)
        .eq('shared_with_user_id', userId)
        .eq('is_active', true)
        .single();

      if (!shareError && share) {
        // Map permission level to specific permissions
        const hasPermission = this.checkPermissionLevel(share.permission_level, permission);
        return ResultUtils.ok(hasPermission);
      }

      // Check organization membership if applicable
      if (asset.organization_id) {
        const { data: membership, error: memberError } = await this.getClient()
          .from('organization_members')
          .select('role')
          .eq('organization_id', asset.organization_id)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (!memberError && membership) {
          // Organization members can read, admins can do everything
          if (permission === 'read') {
            return ResultUtils.ok(true);
          }
          if (membership.role === 'admin' || membership.role === 'owner') {
            return ResultUtils.ok(true);
          }
        }
      }

      return ResultUtils.ok(false);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check permission')
      );
    }
  }

  async getUserPermissions(assetId: AssetId, userId: UserId): Promise<Result<string[]>> {
    try {
      const permissions: string[] = [];

      // Check all permissions
      const readResult = await this.checkPermission(assetId, userId, 'read');
      const writeResult = await this.checkPermission(assetId, userId, 'write');
      const deleteResult = await this.checkPermission(assetId, userId, 'delete');
      const shareResult = await this.checkPermission(assetId, userId, 'share');

      if (readResult.success && readResult.data) permissions.push('read');
      if (writeResult.success && writeResult.data) permissions.push('write');
      if (deleteResult.success && deleteResult.data) permissions.push('delete');
      if (shareResult.success && shareResult.data) permissions.push('share');

      return ResultUtils.ok(permissions);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get user permissions')
      );
    }
  }

  // Bulk operations
  async bulkUpdateStatus(ids: AssetId[], status: string, updatedBy: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .from('assets')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', ids);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to bulk update status: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to bulk update status')
      );
    }
  }

  async bulkDelete(ids: AssetId[], deletedBy: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .from('assets')
        .update({
          is_deleted: true,
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .in('id', ids);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to bulk delete: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to bulk delete')
      );
    }
  }

  async bulkMoveToVault(ids: AssetId[], vaultId: VaultId, movedBy: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.getClient()
        .from('assets')
        .update({
          vault_id: vaultId,
          updated_at: new Date().toISOString()
        })
        .in('id', ids);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to bulk move to vault: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to bulk move to vault')
      );
    }
  }

  // Transaction support
  async beginTransaction(): Promise<void> {
    // Supabase doesn't support traditional transactions in the client
    // We'll use the same client for now
    this.transaction = this.supabase;
  }

  async commitTransaction(): Promise<void> {
    this.transaction = null;
  }

  async rollbackTransaction(): Promise<void> {
    this.transaction = null;
  }

  // Helper methods
  private getClient(): SupabaseClient<Database> {
    return this.transaction || this.supabase;
  }

  private domainToDb(asset: Asset): AssetInsert {
    const props = asset.toPersistence();
    return {
      id: props.id,
      title: props.title,
      description: props.description,
      file_name: props.fileMetadata.fileName,
      file_size: props.fileMetadata.fileSize,
      file_type: props.fileMetadata.fileType,
      mime_type: props.fileMetadata.mimeType,
      file_path: props.fileMetadata.filePath,
      thumbnail_url: props.fileMetadata.thumbnailUrl,
      original_file_name: props.fileMetadata.originalFileName,
      storage_bucket: props.fileMetadata.storageBucket || 'assets',
      owner_id: props.ownerId,
      uploaded_by: props.uploadedBy,
      organization_id: props.organizationId,
      vault_id: props.vaultId,
      status: props.status,
      visibility: props.visibility,
      tags: props.tags,
      category: props.category,
      folder_path: props.folderPath,
      view_count: props.viewCount,
      download_count: props.downloadCount,
      is_deleted: props.isDeleted,
      created_at: props.createdAt.toISOString(),
      updated_at: props.updatedAt.toISOString()
    };
  }

  private domainToDbUpdate(asset: Asset): AssetUpdate {
    const props = asset.toPersistence();
    return {
      title: props.title,
      description: props.description,
      status: props.status,
      visibility: props.visibility,
      tags: props.tags,
      category: props.category,
      folder_path: props.folderPath,
      view_count: props.viewCount,
      download_count: props.downloadCount,
      is_deleted: props.isDeleted,
      updated_at: props.updatedAt.toISOString()
    };
  }

  private dbToDomain(row: AssetRow): Asset {
    const fileMetadata: FileMetadata = FileMetadata.create({
      fileName: row.file_name || '',
      fileSize: row.file_size || 0,
      mimeType: row.mime_type || 'application/octet-stream',
      fileType: row.file_type || 'unknown',
      filePath: row.file_path,
      thumbnailUrl: row.thumbnail_url,
      originalFileName: row.original_file_name,
      storageBucket: row.storage_bucket
    }).data!; // We know this will succeed with DB data

    return Asset.fromPersistence({
      id: createAssetId(row.id),
      title: row.title || '',
      description: row.description,
      fileMetadata: fileMetadata.toJSON(),
      ownerId: createUserId(row.owner_id),
      organizationId: row.organization_id ? row.organization_id as OrganizationId : undefined,
      vaultId: row.vault_id ? row.vault_id as VaultId : undefined,
      status: (row.status as AssetStatus) || AssetStatus.READY,
      visibility: (row.visibility as AssetVisibility) || AssetVisibility.PRIVATE,
      tags: row.tags || [],
      category: row.category || 'document',
      folderPath: row.folder_path || '/',
      viewCount: row.view_count || 0,
      downloadCount: row.download_count || 0,
      isDeleted: row.is_deleted || false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      uploadedBy: createUserId(row.uploaded_by || row.owner_id)
    });
  }

  private mapSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'title': 'title',
      'fileSize': 'file_size',
      'viewCount': 'view_count'
    };
    return columnMap[sortBy] || 'created_at';
  }

  private checkPermissionLevel(level: string, permission: 'read' | 'write' | 'delete' | 'share'): boolean {
    const permissions: Record<string, string[]> = {
      'view': ['read'],
      'comment': ['read'],
      'edit': ['read', 'write'],
      'admin': ['read', 'write', 'delete', 'share'],
      'owner': ['read', 'write', 'delete', 'share']
    };

    const allowedPermissions = permissions[level] || [];
    return allowedPermissions.includes(permission);
  }

  // Transaction support methods
  async executeTransaction<T>(
    callback: (repository: IAssetRepository) => Promise<T>
  ): Promise<Result<T>> {
    try {
      // Note: Supabase doesn't support traditional transactions
      // We'll implement a basic version with error handling
      // For production, consider using Supabase Edge Functions with proper transactions
      
      console.log('[AssetRepository] Executing transaction');
      
      // Create a new instance with the same client for the transaction
      const transactionRepo = new AssetRepositoryImpl(this.supabase);
      
      try {
        // Execute the callback with the transaction repository
        const result = await callback(transactionRepo);
        
        console.log('[AssetRepository] Transaction completed successfully');
        return ResultUtils.ok(result);
      } catch (error) {
        console.error('[AssetRepository] Transaction failed:', error);
        
        // In a real transaction, we would rollback here
        // With Supabase, we need to implement compensating actions
        
        return ResultUtils.fail(
          error instanceof Error ? error : new Error('Transaction failed')
        );
      }
    } catch (error) {
      console.error('[AssetRepository] Failed to execute transaction:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to execute transaction')
      );
    }
  }

  // Helper method to start a transaction (for future implementation)
  async startTransaction(): Promise<Result<void>> {
    try {
      // Supabase doesn't support explicit transaction start
      // This is a placeholder for future implementation
      this.transaction = this.supabase;
      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to start transaction')
      );
    }
  }

  // Helper method to commit a transaction (for future implementation)
  async commitTransaction(): Promise<Result<void>> {
    try {
      // Supabase auto-commits, this is a placeholder
      this.transaction = null;
      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to commit transaction')
      );
    }
  }

  // Helper method to rollback a transaction (for future implementation)
  async rollbackTransaction(): Promise<Result<void>> {
    try {
      // Supabase doesn't support explicit rollback
      // Would need to implement compensating actions
      this.transaction = null;
      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to rollback transaction')
      );
    }
  }
}