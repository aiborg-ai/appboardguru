/**
 * Create Document Command
 * Command to create a new document in the system
 */

import { Command } from '@/01-shared/types/core.types';
import { UserId, OrganizationId, BoardId, AssetId } from '@/types/core';
import { DocumentType, DocumentClassification } from '@/domain/entities/document.entity';

export class CreateDocumentCommand implements Command {
  readonly type = 'CreateDocumentCommand';

  constructor(
    public readonly payload: {
      title: string;
      description?: string;
      type: DocumentType;
      classification?: DocumentClassification;
      assetId: AssetId;
      boardId?: BoardId;
      organizationId: OrganizationId;
      createdBy: UserId;
      ownerId: UserId;
      approvalRequired?: boolean;
      approvalThreshold?: number;
      tags?: string[];
      metadata?: {
        author?: string;
        keywords?: string[];
        language?: string;
        pageCount?: number;
        wordCount?: number;
      };
      isTemplate?: boolean;
      templateId?: string;
    }
  ) {}
}