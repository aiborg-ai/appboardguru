/**
 * Asset Search Index Handler
 * Updates search index when assets are created, updated, or deleted
 */

import { EventHandler } from '../../01-shared/lib/event-bus';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import type { AssetId, UserId } from '../../types/core';

export interface AssetCreatedEvent {
  eventName: 'AssetCreated' | 'AssetUploaded';
  aggregateId: AssetId;
  payload: {
    assetId: AssetId;
    title: string;
    description?: string;
    fileName: string;
    fileType: string;
    tags?: string[];
    category?: string;
    ownerId: UserId;
    organizationId?: string;
    vaultId?: string;
    timestamp: Date;
  };
}

export interface AssetUpdatedEvent {
  eventName: 'AssetUpdated';
  aggregateId: AssetId;
  payload: {
    assetId: AssetId;
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
    visibility?: string;
    timestamp: Date;
  };
}

export interface AssetDeletedEvent {
  eventName: 'AssetDeleted';
  aggregateId: AssetId;
  payload: {
    assetId: AssetId;
    permanent: boolean;
    timestamp: Date;
  };
}

export interface AssetRestoredEvent {
  eventName: 'AssetRestored';
  aggregateId: AssetId;
  payload: {
    assetId: AssetId;
    timestamp: Date;
  };
}

export type AssetSearchEvent = AssetCreatedEvent | AssetUpdatedEvent | AssetDeletedEvent | AssetRestoredEvent;

export interface SearchDocument {
  id: string;
  title: string;
  description?: string;
  content?: string;
  tags?: string[];
  category?: string;
  fileType?: string;
  fileName?: string;
  ownerId?: string;
  organizationId?: string;
  vaultId?: string;
  visibility?: string;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface ISearchService {
  index(document: SearchDocument): Promise<Result<void>>;
  update(documentId: string, updates: Partial<SearchDocument>): Promise<Result<void>>;
  delete(documentId: string): Promise<Result<void>>;
  bulkIndex(documents: SearchDocument[]): Promise<Result<void>>;
  search(query: string, options?: {
    filters?: Record<string, any>;
    limit?: number;
    offset?: number;
  }): Promise<Result<SearchDocument[]>>;
}

export interface IAssetContentExtractor {
  extractText(assetId: AssetId): Promise<Result<string>>;
  extractMetadata(assetId: AssetId): Promise<Result<Record<string, any>>>;
}

/**
 * Asset Search Index Handler
 * Updates the search index when asset events occur
 */
export class AssetSearchIndexHandler implements EventHandler<AssetSearchEvent> {
  constructor(
    private readonly searchService: ISearchService,
    private readonly contentExtractor?: IAssetContentExtractor
  ) {}

  async handle(event: AssetSearchEvent): Promise<Result<void>> {
    console.log('[AssetSearchIndexHandler] Processing event:', {
      eventName: event.eventName,
      assetId: event.aggregateId
    });

    try {
      switch (event.eventName) {
        case 'AssetCreated':
        case 'AssetUploaded':
          return await this.handleAssetCreated(event as AssetCreatedEvent);
        
        case 'AssetUpdated':
          return await this.handleAssetUpdated(event as AssetUpdatedEvent);
        
        case 'AssetDeleted':
          return await this.handleAssetDeleted(event as AssetDeletedEvent);
        
        case 'AssetRestored':
          return await this.handleAssetRestored(event as AssetRestoredEvent);
        
        default:
          console.warn('[AssetSearchIndexHandler] Unknown event type:', event.eventName);
          return ResultUtils.ok(undefined);
      }
    } catch (error) {
      console.error('[AssetSearchIndexHandler] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update search index')
      );
    }
  }

  private async handleAssetCreated(event: AssetCreatedEvent): Promise<Result<void>> {
    const { payload } = event;
    
    // Extract content if content extractor is available
    let extractedContent: string | undefined;
    let extractedMetadata: Record<string, any> | undefined;
    
    if (this.contentExtractor) {
      // Extract text content for searchable documents
      if (this.isSearchableFileType(payload.fileType)) {
        const contentResult = await this.contentExtractor.extractText(payload.assetId);
        if (contentResult.success) {
          extractedContent = contentResult.data;
        }
      }
      
      // Extract metadata
      const metadataResult = await this.contentExtractor.extractMetadata(payload.assetId);
      if (metadataResult.success) {
        extractedMetadata = metadataResult.data;
      }
    }
    
    // Create search document
    const searchDocument: SearchDocument = {
      id: payload.assetId,
      title: payload.title,
      description: payload.description,
      content: extractedContent,
      tags: payload.tags,
      category: payload.category,
      fileType: payload.fileType,
      fileName: payload.fileName,
      ownerId: payload.ownerId,
      organizationId: payload.organizationId,
      vaultId: payload.vaultId,
      createdAt: payload.timestamp,
      updatedAt: payload.timestamp,
      metadata: extractedMetadata
    };
    
    // Index the document
    const indexResult = await this.searchService.index(searchDocument);
    
    if (!indexResult.success) {
      console.error('[AssetSearchIndexHandler] Failed to index document:', indexResult.error);
      return indexResult;
    }
    
    console.log('[AssetSearchIndexHandler] Successfully indexed asset:', payload.assetId);
    return ResultUtils.ok(undefined);
  }

  private async handleAssetUpdated(event: AssetUpdatedEvent): Promise<Result<void>> {
    const { payload } = event;
    
    // Prepare updates
    const updates: Partial<SearchDocument> = {
      updatedAt: payload.timestamp
    };
    
    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.tags !== undefined) updates.tags = payload.tags;
    if (payload.category !== undefined) updates.category = payload.category;
    if (payload.visibility !== undefined) updates.visibility = payload.visibility;
    
    // Update the search index
    const updateResult = await this.searchService.update(payload.assetId, updates);
    
    if (!updateResult.success) {
      console.error('[AssetSearchIndexHandler] Failed to update document:', updateResult.error);
      return updateResult;
    }
    
    console.log('[AssetSearchIndexHandler] Successfully updated asset in index:', payload.assetId);
    return ResultUtils.ok(undefined);
  }

  private async handleAssetDeleted(event: AssetDeletedEvent): Promise<Result<void>> {
    const { payload } = event;
    
    if (payload.permanent) {
      // Remove from search index if permanently deleted
      const deleteResult = await this.searchService.delete(payload.assetId);
      
      if (!deleteResult.success) {
        console.error('[AssetSearchIndexHandler] Failed to delete document:', deleteResult.error);
        return deleteResult;
      }
      
      console.log('[AssetSearchIndexHandler] Successfully removed asset from index:', payload.assetId);
    } else {
      // Mark as deleted in search index (soft delete)
      const updateResult = await this.searchService.update(payload.assetId, {
        metadata: { isDeleted: true, deletedAt: payload.timestamp }
      });
      
      if (!updateResult.success) {
        console.error('[AssetSearchIndexHandler] Failed to mark document as deleted:', updateResult.error);
        return updateResult;
      }
      
      console.log('[AssetSearchIndexHandler] Successfully marked asset as deleted in index:', payload.assetId);
    }
    
    return ResultUtils.ok(undefined);
  }

  private async handleAssetRestored(event: AssetRestoredEvent): Promise<Result<void>> {
    const { payload } = event;
    
    // Remove deleted flag from search index
    const updateResult = await this.searchService.update(payload.assetId, {
      metadata: { isDeleted: false, restoredAt: payload.timestamp }
    });
    
    if (!updateResult.success) {
      console.error('[AssetSearchIndexHandler] Failed to restore document:', updateResult.error);
      return updateResult;
    }
    
    console.log('[AssetSearchIndexHandler] Successfully restored asset in index:', payload.assetId);
    return ResultUtils.ok(undefined);
  }

  private isSearchableFileType(fileType: string): boolean {
    const searchableTypes = [
      'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
      'xls', 'xlsx', 'csv', 'ods',
      'ppt', 'pptx', 'odp',
      'html', 'xml', 'json', 'md'
    ];
    
    return searchableTypes.includes(fileType.toLowerCase());
  }
}

/**
 * Factory function to create handler with dependencies
 */
export function createAssetSearchIndexHandler(dependencies: {
  searchService: ISearchService;
  contentExtractor?: IAssetContentExtractor;
}): AssetSearchIndexHandler {
  return new AssetSearchIndexHandler(
    dependencies.searchService,
    dependencies.contentExtractor
  );
}