/**
 * Update Document Command
 * Command to update document metadata and properties
 */

import { Command } from '@/01-shared/types/core.types';
import { DocumentId, UserId, OrganizationId, BoardId } from '@/types/core';
import { DocumentType, DocumentClassification } from '@/domain/entities/document.entity';

export class UpdateDocumentCommand implements Command {
  readonly type = 'UpdateDocumentCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      updatedBy: UserId;
      updates: {
        title?: string;
        description?: string;
        type?: DocumentType;
        classification?: DocumentClassification;
        boardId?: BoardId;
        organizationId?: OrganizationId;
        tags?: string[];
        metadata?: Record<string, any>;
      };
    }
  ) {}
}

export class AddDocumentVersionCommand implements Command {
  readonly type = 'AddDocumentVersionCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      assetId: AssetId;
      createdBy: UserId;
      changeLog: string;
      versionNumber?: string;
      size: number;
      checksum: string;
    }
  ) {}
}

export class CheckOutDocumentCommand implements Command {
  readonly type = 'CheckOutDocumentCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      userId: UserId;
    }
  ) {}
}

export class CheckInDocumentCommand implements Command {
  readonly type = 'CheckInDocumentCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      userId: UserId;
      changeLog?: string;
    }
  ) {}
}