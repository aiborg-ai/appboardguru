/**
 * Share Document Command Handlers
 * Handles document sharing operations
 */

import { CommandHandler } from '@/01-shared/types/core.types';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { eventBus } from '@/01-shared/lib/event-bus';
import { 
  ShareDocumentWithUserCommand,
  UnshareDocumentWithUserCommand,
  AddDocumentToVaultCommand,
  RemoveDocumentFromVaultCommand
} from '@/application/cqrs/commands/document/share-document.command';
import { IDocumentRepository } from '@/application/interfaces/repositories/document.repository.interface';

export class ShareDocumentWithUserCommandHandler implements CommandHandler<ShareDocumentWithUserCommand> {
  constructor(
    private readonly documentRepository: IDocumentRepository
  ) {}

  async execute(command: ShareDocumentWithUserCommand): Promise<Result<void>> {
    try {
      const { payload } = command;

      // Get the document
      const documentResult = await this.documentRepository.findById(payload.documentId);
      if (!documentResult.success) {
        return ResultUtils.fail(`Document not found: ${documentResult.error}`);
      }

      const document = documentResult.data;

      // Check if the user has permission to share
      if (!document.hasAccess(payload.sharedBy, 'admin') && document.ownerId !== payload.sharedBy) {
        return ResultUtils.fail('You do not have permission to share this document');
      }

      // Add collaborator
      const addResult = document.addCollaborator({
        userId: payload.userId,
        accessLevel: payload.accessLevel,
        addedBy: payload.sharedBy,
        canDownload: payload.canDownload,
        canPrint: payload.canPrint,
        canShare: payload.canShare,
        expiresAt: payload.expiresAt
      });

      if (!addResult.success) {
        return ResultUtils.fail(addResult.error as any);
      }

      // Save the document
      const saveResult = await this.documentRepository.save(document);
      if (!saveResult.success) {
        return ResultUtils.fail(`Failed to save document: ${saveResult.error}`);
      }

      // Publish events
      const events = document.getDomainEvents();
      for (const event of events) {
        eventBus.publish(event.eventName, event.eventData);
      }
      document.clearDomainEvents();

      return ResultUtils.ok();
    } catch (error) {
      return ResultUtils.fail(`Error sharing document: ${error}`);
    }
  }
}

export class AddDocumentToVaultCommandHandler implements CommandHandler<AddDocumentToVaultCommand> {
  constructor(
    private readonly documentRepository: IDocumentRepository
  ) {}

  async execute(command: AddDocumentToVaultCommand): Promise<Result<void>> {
    try {
      const { payload } = command;

      // Get the document
      const documentResult = await this.documentRepository.findById(payload.documentId);
      if (!documentResult.success) {
        return ResultUtils.fail(`Document not found: ${documentResult.error}`);
      }

      const document = documentResult.data;

      // Check permissions
      if (!document.hasAccess(payload.addedBy, 'edit')) {
        return ResultUtils.fail('You do not have permission to add this document to a vault');
      }

      // For now, we'll store vault associations in the document metadata
      // In a real implementation, this would be handled through a proper vault service
      const vaultIds = document.metadata.vaultIds || [];
      if (!vaultIds.includes(payload.vaultId)) {
        vaultIds.push(payload.vaultId);
        document.metadata.vaultIds = vaultIds;
        
        // Emit event
        document.addDomainEvent('DocumentAddedToVault', {
          documentId: document.id,
          vaultId: payload.vaultId,
          addedBy: payload.addedBy
        });
      }

      // Save the document
      const saveResult = await this.documentRepository.save(document);
      if (!saveResult.success) {
        return ResultUtils.fail(`Failed to save document: ${saveResult.error}`);
      }

      // Publish events
      const events = document.getDomainEvents();
      for (const event of events) {
        eventBus.publish(event.eventName, event.eventData);
      }
      document.clearDomainEvents();

      return ResultUtils.ok();
    } catch (error) {
      return ResultUtils.fail(`Error adding document to vault: ${error}`);
    }
  }
}