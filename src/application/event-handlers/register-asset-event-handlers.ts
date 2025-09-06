/**
 * Register Asset Event Handlers
 * Wires up all asset-related event handlers with the event bus
 */

import { EventBus } from '../../01-shared/lib/event-bus';
import { 
  AssetUploadNotificationHandler,
  createAssetUploadNotificationHandler,
  INotificationService,
  IUserRepository as INotificationUserRepository
} from './asset-upload-notification.handler';
import {
  AssetSearchIndexHandler,
  createAssetSearchIndexHandler,
  ISearchService,
  IAssetContentExtractor
} from './asset-search-index.handler';
import {
  AssetThumbnailHandler,
  createAssetThumbnailHandler,
  IThumbnailService,
  IAssetRepository as IThumbnailAssetRepository,
  ThumbnailConfig
} from './asset-thumbnail.handler';

export interface AssetEventHandlerDependencies {
  // Notification dependencies
  notificationService?: INotificationService;
  userRepository?: INotificationUserRepository;
  
  // Search dependencies
  searchService?: ISearchService;
  contentExtractor?: IAssetContentExtractor;
  
  // Thumbnail dependencies
  thumbnailService?: IThumbnailService;
  assetRepository?: IThumbnailAssetRepository;
  thumbnailConfig?: ThumbnailConfig;
}

/**
 * Register all asset event handlers with the event bus
 */
export function registerAssetEventHandlers(
  eventBus: EventBus,
  dependencies: AssetEventHandlerDependencies
): void {
  console.log('[RegisterAssetEventHandlers] Registering asset event handlers...');

  let registeredHandlers: string[] = [];

  // Register notification handler if dependencies are available
  if (dependencies.notificationService && dependencies.userRepository) {
    const notificationHandler = createAssetUploadNotificationHandler({
      notificationService: dependencies.notificationService,
      userRepository: dependencies.userRepository
    });

    eventBus.subscribe('AssetUploaded', notificationHandler);
    registeredHandlers.push('AssetUploadNotificationHandler');
    
    console.log('[RegisterAssetEventHandlers] Registered notification handler');
  } else {
    console.warn('[RegisterAssetEventHandlers] Notification handler not registered - missing dependencies');
  }

  // Register search index handler if dependencies are available
  if (dependencies.searchService) {
    const searchHandler = createAssetSearchIndexHandler({
      searchService: dependencies.searchService,
      contentExtractor: dependencies.contentExtractor
    });

    // Subscribe to multiple events
    eventBus.subscribe('AssetCreated', searchHandler);
    eventBus.subscribe('AssetUploaded', searchHandler);
    eventBus.subscribe('AssetUpdated', searchHandler);
    eventBus.subscribe('AssetDeleted', searchHandler);
    eventBus.subscribe('AssetRestored', searchHandler);
    
    registeredHandlers.push('AssetSearchIndexHandler');
    
    console.log('[RegisterAssetEventHandlers] Registered search index handler');
  } else {
    console.warn('[RegisterAssetEventHandlers] Search index handler not registered - missing dependencies');
  }

  // Register thumbnail handler if dependencies are available
  if (dependencies.thumbnailService && dependencies.assetRepository) {
    const thumbnailHandler = createAssetThumbnailHandler({
      thumbnailService: dependencies.thumbnailService,
      assetRepository: dependencies.assetRepository,
      config: dependencies.thumbnailConfig
    });

    // Subscribe to upload events
    eventBus.subscribe('AssetUploaded', thumbnailHandler);
    eventBus.subscribe('AssetCreated', thumbnailHandler);
    
    registeredHandlers.push('AssetThumbnailHandler');
    
    console.log('[RegisterAssetEventHandlers] Registered thumbnail handler');
  } else {
    console.warn('[RegisterAssetEventHandlers] Thumbnail handler not registered - missing dependencies');
  }

  console.log('[RegisterAssetEventHandlers] Successfully registered handlers:', registeredHandlers);
}

/**
 * Create a fully configured event bus with asset event handlers
 */
export function createAssetEventBus(
  dependencies: AssetEventHandlerDependencies
): EventBus {
  const eventBus = EventBus.getInstance();
  registerAssetEventHandlers(eventBus, dependencies);
  return eventBus;
}

/**
 * Emit common asset events helper functions
 */
export class AssetEventEmitter {
  constructor(private readonly eventBus: EventBus) {}

  async emitAssetUploaded(params: {
    assetId: string;
    title: string;
    fileName: string;
    fileType: string;
    mimeType: string;
    filePath: string;
    storageBucket: string;
    fileSize: number;
    uploadedBy: string;
    organizationId?: string;
    vaultId?: string;
  }): Promise<void> {
    await this.eventBus.publish({
      eventName: 'AssetUploaded',
      aggregateId: params.assetId,
      payload: {
        ...params,
        timestamp: new Date()
      }
    });
  }

  async emitAssetUpdated(params: {
    assetId: string;
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
    visibility?: string;
  }): Promise<void> {
    await this.eventBus.publish({
      eventName: 'AssetUpdated',
      aggregateId: params.assetId,
      payload: {
        ...params,
        timestamp: new Date()
      }
    });
  }

  async emitAssetDeleted(params: {
    assetId: string;
    permanent: boolean;
  }): Promise<void> {
    await this.eventBus.publish({
      eventName: 'AssetDeleted',
      aggregateId: params.assetId,
      payload: {
        ...params,
        timestamp: new Date()
      }
    });
  }

  async emitAssetRestored(params: {
    assetId: string;
  }): Promise<void> {
    await this.eventBus.publish({
      eventName: 'AssetRestored',
      aggregateId: params.assetId,
      payload: {
        ...params,
        timestamp: new Date()
      }
    });
  }

  async emitAssetShared(params: {
    assetId: string;
    sharedWithUserId: string;
    sharedByUserId: string;
    permissionLevel: string;
    expiresAt?: Date;
  }): Promise<void> {
    await this.eventBus.publish({
      eventName: 'AssetShared',
      aggregateId: params.assetId,
      payload: {
        ...params,
        timestamp: new Date()
      }
    });
  }
}