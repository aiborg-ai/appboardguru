/**
 * Share Document Commands
 * Commands for sharing documents with users and adding to vaults
 */

import { Command } from '@/01-shared/types/core.types';
import { DocumentId, UserId, VaultId } from '@/types/core';
import { AccessLevel } from '@/domain/entities/document.entity';

export class ShareDocumentWithUserCommand implements Command {
  readonly type = 'ShareDocumentWithUserCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      userId: UserId;
      sharedBy: UserId;
      accessLevel: AccessLevel;
      canDownload?: boolean;
      canPrint?: boolean;
      canShare?: boolean;
      expiresAt?: Date;
      notes?: string;
    }
  ) {}
}

export class UnshareDocumentWithUserCommand implements Command {
  readonly type = 'UnshareDocumentWithUserCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      userId: UserId;
      unsharedBy: UserId;
    }
  ) {}
}

export class AddDocumentToVaultCommand implements Command {
  readonly type = 'AddDocumentToVaultCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      vaultId: VaultId;
      addedBy: UserId;
    }
  ) {}
}

export class RemoveDocumentFromVaultCommand implements Command {
  readonly type = 'RemoveDocumentFromVaultCommand';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      vaultId: VaultId;
      removedBy: UserId;
    }
  ) {}
}

export class BulkShareDocumentsCommand implements Command {
  readonly type = 'BulkShareDocumentsCommand';

  constructor(
    public readonly payload: {
      documentIds: DocumentId[];
      userIds: UserId[];
      sharedBy: UserId;
      accessLevel: AccessLevel;
      canDownload?: boolean;
      canPrint?: boolean;
      canShare?: boolean;
      expiresAt?: Date;
    }
  ) {}
}