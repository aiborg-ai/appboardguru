/**
 * Register Asset Handlers
 * Sets up all asset-related command and query handlers in the command bus
 */

import { CommandBus } from './command-bus';
import { 
  UploadAssetCommand, 
  UploadAssetCommandHandler, 
  createUploadAssetCommandHandler 
} from './commands/upload-asset.command';
import {
  UpdateAssetCommand,
  UpdateAssetCommandHandler,
  MoveAssetToVaultCommand,
  MoveAssetToVaultCommandHandler,
  createUpdateAssetCommandHandler,
  createMoveAssetToVaultCommandHandler
} from './commands/update-asset.command';
import {
  DeleteAssetCommand,
  DeleteAssetCommandHandler,
  RestoreAssetCommand,
  RestoreAssetCommandHandler,
  createDeleteAssetCommandHandler,
  createRestoreAssetCommandHandler
} from './commands/delete-asset.command';
import {
  ShareAssetCommand,
  ShareAssetCommandHandler,
  UnshareAssetCommand,
  UnshareAssetCommandHandler,
  createShareAssetCommandHandler,
  createUnshareAssetCommandHandler
} from './commands/share-asset.command';
import {
  GetAssetQuery,
  GetAssetQueryHandler,
  ListAssetsQuery,
  ListAssetsQueryHandler,
  createGetAssetQueryHandler,
  createListAssetsQueryHandler
} from './queries/get-asset.query';
import { UploadAssetUseCase } from '../use-cases/assets/upload-asset.use-case';
import { IAssetRepository } from '../interfaces/repositories/asset.repository.interface';
import { IStorageService, IDocumentProcessor } from '../use-cases/assets/upload-asset.use-case';
import { EventBus } from '../../01-shared/lib/event-bus';

export interface AssetHandlerDependencies {
  assetRepository: IAssetRepository;
  storageService: IStorageService;
  documentProcessor?: IDocumentProcessor;
  eventBus?: EventBus;
}

/**
 * Register all asset-related handlers with the command bus
 */
export function registerAssetHandlers(
  commandBus: CommandBus,
  dependencies: AssetHandlerDependencies
): void {
  console.log('[RegisterAssetHandlers] Registering asset command and query handlers...');

  // Create use cases
  const uploadAssetUseCase = new UploadAssetUseCase(
    dependencies.assetRepository,
    dependencies.storageService,
    dependencies.documentProcessor,
    dependencies.eventBus
  );

  // Register command handlers
  const uploadAssetHandler = createUploadAssetCommandHandler({
    uploadAssetUseCase
  });
  
  commandBus.registerCommandHandler(
    'UploadAsset',
    uploadAssetHandler
  );

  // Register update command handler
  const updateAssetHandler = createUpdateAssetCommandHandler({
    assetRepository: dependencies.assetRepository,
    eventBus: dependencies.eventBus
  });
  
  commandBus.registerCommandHandler(
    'UpdateAsset',
    updateAssetHandler
  );

  // Register move to vault command handler
  const moveAssetToVaultHandler = createMoveAssetToVaultCommandHandler({
    assetRepository: dependencies.assetRepository
  });
  
  commandBus.registerCommandHandler(
    'MoveAssetToVault',
    moveAssetToVaultHandler
  );

  // Register delete command handler
  const deleteAssetHandler = createDeleteAssetCommandHandler({
    assetRepository: dependencies.assetRepository,
    eventBus: dependencies.eventBus
  });
  
  commandBus.registerCommandHandler(
    'DeleteAsset',
    deleteAssetHandler
  );

  // Register restore command handler
  const restoreAssetHandler = createRestoreAssetCommandHandler({
    assetRepository: dependencies.assetRepository,
    eventBus: dependencies.eventBus
  });
  
  commandBus.registerCommandHandler(
    'RestoreAsset',
    restoreAssetHandler
  );

  // Register share command handler
  const shareAssetHandler = createShareAssetCommandHandler({
    assetRepository: dependencies.assetRepository
  });
  
  commandBus.registerCommandHandler(
    'ShareAsset',
    shareAssetHandler
  );

  // Register unshare command handler
  const unshareAssetHandler = createUnshareAssetCommandHandler({
    assetRepository: dependencies.assetRepository
  });
  
  commandBus.registerCommandHandler(
    'UnshareAsset',
    unshareAssetHandler
  );

  // Register query handlers
  const getAssetHandler = createGetAssetQueryHandler({
    assetRepository: dependencies.assetRepository
  });
  
  commandBus.registerQueryHandler(
    'GetAsset',
    getAssetHandler
  );

  const listAssetsHandler = createListAssetsQueryHandler({
    assetRepository: dependencies.assetRepository
  });
  
  commandBus.registerQueryHandler(
    'ListAssets',
    listAssetsHandler
  );

  console.log('[RegisterAssetHandlers] Successfully registered:', {
    commands: ['UploadAsset', 'UpdateAsset', 'MoveAssetToVault', 'DeleteAsset', 'RestoreAsset', 'ShareAsset', 'UnshareAsset'],
    queries: ['GetAsset', 'ListAssets']
  });
}

/**
 * Helper function to create a fully configured command bus with asset handlers
 */
export function createAssetCommandBus(
  dependencies: AssetHandlerDependencies
): CommandBus {
  const commandBus = CommandBus.getInstance();
  registerAssetHandlers(commandBus, dependencies);
  return commandBus;
}