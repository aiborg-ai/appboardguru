/**
 * Get Document Queries
 * Queries for retrieving individual documents
 */

import { Query } from '@/01-shared/types/core.types';
import { DocumentId, UserId } from '@/types/core';
import { Document } from '@/domain/entities/document.entity';

export class GetDocumentByIdQuery implements Query<Document> {
  readonly type = 'GetDocumentByIdQuery';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      userId: UserId; // For access control
      includeVersions?: boolean;
      includeComments?: boolean;
      includeCollaborators?: boolean;
    }
  ) {}
}

export class GetDocumentVersionQuery implements Query<any> {
  readonly type = 'GetDocumentVersionQuery';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      versionNumber: string;
      userId: UserId;
    }
  ) {}
}

export class GetDocumentByAssetIdQuery implements Query<Document> {
  readonly type = 'GetDocumentByAssetIdQuery';

  constructor(
    public readonly payload: {
      assetId: string;
      userId: UserId;
    }
  ) {}
}

export class GetDocumentAccessLevelQuery implements Query<{
  hasAccess: boolean;
  accessLevel?: string;
  permissions: {
    canView: boolean;
    canComment: boolean;
    canEdit: boolean;
    canApprove: boolean;
    canDelete: boolean;
    canShare: boolean;
    canDownload: boolean;
    canPrint: boolean;
  };
}> {
  readonly type = 'GetDocumentAccessLevelQuery';

  constructor(
    public readonly payload: {
      documentId: DocumentId;
      userId: UserId;
    }
  ) {}
}