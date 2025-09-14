/**
 * Create Document Command Handler
 * Handles the creation of new documents
 */

import { CommandHandler } from '@/01-shared/types/core.types';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { eventBus } from '@/01-shared/lib/event-bus';
import { CreateDocumentCommand } from '@/application/cqrs/commands/document/create-document.command';
import { IDocumentRepository } from '@/application/interfaces/repositories/document.repository.interface';
import { Document } from '@/domain/entities/document.entity';
import { createDocumentId } from '@/types/core';

export class CreateDocumentCommandHandler implements CommandHandler<CreateDocumentCommand> {
  constructor(
    private readonly documentRepository: IDocumentRepository
  ) {}

  async execute(command: CreateDocumentCommand): Promise<Result<string>> {
    try {
      const { payload } = command;

      // Create the document entity
      const documentResult = Document.create({
        id: createDocumentId(),
        title: payload.title,
        description: payload.description,
        type: payload.type,
        classification: payload.classification,
        assetId: payload.assetId,
        boardId: payload.boardId,
        organizationId: payload.organizationId,
        createdBy: payload.createdBy,
        ownerId: payload.ownerId,
        approvalRequired: payload.approvalRequired,
        approvalThreshold: payload.approvalThreshold,
        tags: payload.tags,
        metadata: payload.metadata,
        isTemplate: payload.isTemplate,
        templateId: payload.templateId as any
      });

      if (!documentResult.success) {
        return ResultUtils.fail(`Failed to create document: ${documentResult.error}`);
      }

      const document = documentResult.data;

      // Save to repository
      const saveResult = await this.documentRepository.save(document);
      if (!saveResult.success) {
        return ResultUtils.fail(`Failed to save document: ${saveResult.error}`);
      }

      // Publish domain events
      const events = document.getDomainEvents();
      for (const event of events) {
        eventBus.publish(event.eventName, event.eventData);
      }
      document.clearDomainEvents();

      // Return the document ID
      return ResultUtils.ok(document.id);
    } catch (error) {
      return ResultUtils.fail(`Error creating document: ${error}`);
    }
  }
}