/**
 * Get Asset Query
 * CQRS Query for fetching a single asset by ID
 */

import { Query } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Asset } from '../../../domain/entities/asset.entity';
import { IAssetRepository } from '../../interfaces/repositories/asset.repository.interface';
import { AssetId, UserId } from '../../../types/core';

/**
 * Get Asset Query
 * Fetches a single asset by ID with permission check
 */
export class GetAssetQuery implements Query<Asset> {
  readonly queryType = 'GetAsset';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetAsset';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      assetId: AssetId;
      userId: UserId;
      includeDeleted?: boolean;
    }
  ) {
    this.userId = payload.userId;
  }

  private generateQueryId(): string {
    return `qry_get_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
 * Get Asset Query Handler
 */
export class GetAssetQueryHandler {
  constructor(
    private readonly assetRepository: IAssetRepository
  ) {}

  async handle(query: GetAssetQuery): Promise<Result<Asset>> {
    // Validate query
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetAssetQuery] Executing:', {
      assetId: query.payload.assetId,
      userId: query.payload.userId
    });

    try {
      // Check if user has permission to view this asset
      const permissionResult = await this.assetRepository.checkPermission(
        query.payload.assetId,
        query.payload.userId,
        'read'
      );

      if (!permissionResult.success) {
        return ResultUtils.fail(new Error('Failed to check permissions'));
      }

      if (!permissionResult.data) {
        return ResultUtils.fail(new Error('You do not have permission to view this asset'));
      }

      // Fetch the asset
      const assetResult = await this.assetRepository.findById(query.payload.assetId);
      
      if (!assetResult.success) {
        return assetResult;
      }

      const asset = assetResult.data;

      // Check if asset is deleted and user didn't request deleted assets
      if (asset.isDeleted && !query.payload.includeDeleted) {
        return ResultUtils.fail(new Error('Asset not found'));
      }

      // Increment view count
      await this.assetRepository.incrementViewCount(query.payload.assetId);

      console.log('[GetAssetQuery] Success:', {
        assetId: asset.id,
        title: asset.title
      });

      return ResultUtils.ok(asset);
    } catch (error) {
      console.error('[GetAssetQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to fetch asset')
      );
    }
  }
}

/**
 * List Assets Query
 * Fetches multiple assets based on criteria
 */
export class ListAssetsQuery implements Query<{
  assets: Asset[];
  total: number;
  page: number;
  totalPages: number;
}> {
  readonly queryType = 'ListAssets';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'ListAssets';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      userId: UserId;
      filters?: {
        organizationId?: string;
        vaultId?: string;
        category?: string;
        tags?: string[];
        searchTerm?: string;
        folderPath?: string;
        status?: string;
        visibility?: string;
      };
      pagination?: {
        page: number;
        limit: number;
        sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'fileSize';
        sortOrder?: 'asc' | 'desc';
      };
      includeShared?: boolean;
      includeDeleted?: boolean;
    }
  ) {
    this.userId = payload.userId;
  }

  private generateQueryId(): string {
    return `qry_list_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    if (this.payload.pagination) {
      if (this.payload.pagination.page < 1) {
        return ResultUtils.fail(new Error('Page must be greater than 0'));
      }
      
      if (this.payload.pagination.limit < 1 || this.payload.pagination.limit > 100) {
        return ResultUtils.fail(new Error('Limit must be between 1 and 100'));
      }
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * List Assets Query Handler
 */
export class ListAssetsQueryHandler {
  constructor(
    private readonly assetRepository: IAssetRepository
  ) {}

  async handle(query: ListAssetsQuery): Promise<Result<{
    assets: Asset[];
    total: number;
    page: number;
    totalPages: number;
  }>> {
    // Validate query
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[ListAssetsQuery] Executing:', {
      userId: query.payload.userId,
      filters: query.payload.filters,
      pagination: query.payload.pagination
    });

    try {
      // Build search criteria
      const searchCriteria = {
        ownerId: query.payload.userId,
        ...query.payload.filters,
        includeDeleted: query.payload.includeDeleted
      };

      // Set pagination options
      const listOptions = {
        page: query.payload.pagination?.page || 1,
        limit: query.payload.pagination?.limit || 20,
        sortBy: query.payload.pagination?.sortBy || 'createdAt' as const,
        sortOrder: query.payload.pagination?.sortOrder || 'desc' as const
      };

      // Fetch user's own assets
      const ownAssetsResult = await this.assetRepository.search(
        searchCriteria,
        listOptions
      );

      if (!ownAssetsResult.success) {
        return ResultUtils.fail(ownAssetsResult.error);
      }

      let combinedAssets = ownAssetsResult.data.assets;
      let totalCount = ownAssetsResult.data.total;

      // Include shared assets if requested
      if (query.payload.includeShared) {
        const sharedAssetsResult = await this.assetRepository.getSharedAssets(
          query.payload.userId,
          listOptions
        );

        if (sharedAssetsResult.success) {
          // Merge and deduplicate assets
          const assetMap = new Map<AssetId, Asset>();
          
          [...combinedAssets, ...sharedAssetsResult.data.assets].forEach(asset => {
            assetMap.set(asset.id, asset);
          });
          
          combinedAssets = Array.from(assetMap.values());
          totalCount += sharedAssetsResult.data.total;
        }
      }

      // Sort combined results
      if (listOptions.sortBy) {
        combinedAssets.sort((a, b) => {
          let aValue: any;
          let bValue: any;

          switch (listOptions.sortBy) {
            case 'title':
              aValue = a.title;
              bValue = b.title;
              break;
            case 'fileSize':
              aValue = a.fileMetadata.fileSize;
              bValue = b.fileMetadata.fileSize;
              break;
            case 'updatedAt':
              aValue = a.updatedAt;
              bValue = b.updatedAt;
              break;
            case 'createdAt':
            default:
              aValue = a.createdAt;
              bValue = b.createdAt;
              break;
          }

          if (listOptions.sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
      }

      // Apply pagination to combined results
      const startIndex = (listOptions.page - 1) * listOptions.limit;
      const endIndex = startIndex + listOptions.limit;
      const paginatedAssets = combinedAssets.slice(startIndex, endIndex);

      const result = {
        assets: paginatedAssets,
        total: totalCount,
        page: listOptions.page,
        totalPages: Math.ceil(totalCount / listOptions.limit)
      };

      console.log('[ListAssetsQuery] Success:', {
        assetCount: result.assets.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      });

      return ResultUtils.ok(result);
    } catch (error) {
      console.error('[ListAssetsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to list assets')
      );
    }
  }
}

/**
 * Factory functions to create query handlers with dependencies
 */
export function createGetAssetQueryHandler(
  dependencies: {
    assetRepository: IAssetRepository;
  }
): GetAssetQueryHandler {
  return new GetAssetQueryHandler(dependencies.assetRepository);
}

export function createListAssetsQueryHandler(
  dependencies: {
    assetRepository: IAssetRepository;
  }
): ListAssetsQueryHandler {
  return new ListAssetsQueryHandler(dependencies.assetRepository);
}