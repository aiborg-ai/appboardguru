/**
 * Delete Document Commands
 * Commands for deleting and archiving documents
 */

import { Command } from '@/01-shared/types/core.types';
import { DocumentId, UserId } from '@/types/core';

export class DeleteDocumentCommand implements Command {
  readonly type = 'DeleteDocumentCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      deletedBy: UserId;
      permanent?: boolean; // If true, hard delete; otherwise soft delete
    }
  ) {}
}

export class ArchiveDocumentCommand implements Command {
  readonly type = 'ArchiveDocumentCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      archivedBy: UserId;
      reason?: string;
    }
  ) {}
}

export class RestoreDocumentCommand implements Command {
  readonly type = 'RestoreDocumentCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      restoredBy: UserId;
    }
  ) {}
}

export class BulkDeleteDocumentsCommand implements Command {
  readonly type = 'BulkDeleteDocumentsCommand';

  constructor(
    public readonly payload: {
      documentIds: DocumentId[];
      deletedBy: UserId;
      permanent?: boolean;
    }
  ) {}
}

export class BulkArchiveDocumentsCommand implements Command {
  readonly type = 'BulkArchiveDocumentsCommand';

  constructor(
    public readonly payload: {
      documentIds: DocumentId[];
      archivedBy: UserId;
      reason?: string;
    }
  ) {}
}