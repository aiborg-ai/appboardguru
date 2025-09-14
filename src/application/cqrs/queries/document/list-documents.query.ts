/**
 * List Documents Queries
 * Queries for retrieving multiple documents with filtering and pagination
 */

import { Query } from '@/01-shared/types/core.types';
import { UserId, OrganizationId, BoardId, VaultId } from '@/types/core';
import { Document } from '@/domain/entities/document.entity';
import { 
  DocumentFilters, 
  DocumentSortOptions, 
  PaginationOptions,
  PaginatedResult 
} from '@/application/interfaces/repositories/document.repository.interface';

export class ListDocumentsByOrganizationQuery implements Query<PaginatedResult<Document>> {
  readonly type = 'ListDocumentsByOrganizationQuery';

  constructor(
    public readonly payload: {
      organizationId: OrganizationId;
      userId: UserId;
      filters?: DocumentFilters;
      sort?: DocumentSortOptions;
      pagination?: PaginationOptions;
    }
  ) {}
}

export class ListDocumentsByBoardQuery implements Query<PaginatedResult<Document>> {
  readonly type = 'ListDocumentsByBoardQuery';

  constructor(
    public readonly payload: {
      boardId: BoardId;
      userId: UserId;
      filters?: DocumentFilters;
      sort?: DocumentSortOptions;
      pagination?: PaginationOptions;
    }
  ) {}
}

export class ListUserDocumentsQuery implements Query<PaginatedResult<Document>> {
  readonly type = 'ListUserDocumentsQuery';

  constructor(
    public readonly payload: {
      userId: UserId;
      includeShared?: boolean;
      filters?: DocumentFilters;
      sort?: DocumentSortOptions;
      pagination?: PaginationOptions;
    }
  ) {}
}

export class ListDocumentsByVaultQuery implements Query<PaginatedResult<Document>> {
  readonly type = 'ListDocumentsByVaultQuery';

  constructor(
    public readonly payload: {
      vaultId: VaultId;
      userId: UserId;
      filters?: DocumentFilters;
      sort?: DocumentSortOptions;
      pagination?: PaginationOptions;
    }
  ) {}
}

export class ListPendingApprovalDocumentsQuery implements Query<PaginatedResult<Document>> {
  readonly type = 'ListPendingApprovalDocumentsQuery';

  constructor(
    public readonly payload: {
      userId: UserId;
      organizationId?: OrganizationId;
      filters?: DocumentFilters;
      sort?: DocumentSortOptions;
      pagination?: PaginationOptions;
    }
  ) {}
}

export class ListRecentDocumentsQuery implements Query<Document[]> {
  readonly type = 'ListRecentDocumentsQuery';

  constructor(
    public readonly payload: {
      userId: UserId;
      organizationId?: OrganizationId;
      limit?: number;
      includeViewed?: boolean;
      includeEdited?: boolean;
      includeCreated?: boolean;
    }
  ) {}
}

export class ListDocumentTemplatesQuery implements Query<PaginatedResult<Document>> {
  readonly type = 'ListDocumentTemplatesQuery';

  constructor(
    public readonly payload: {
      organizationId?: OrganizationId;
      userId: UserId;
      category?: string;
      filters?: DocumentFilters;
      sort?: DocumentSortOptions;
      pagination?: PaginationOptions;
    }
  ) {}
}

export class ListRelatedDocumentsQuery implements Query<Document[]> {
  readonly type = 'ListRelatedDocumentsQuery';

  constructor(
    public readonly payload: {
      documentId: string;
      userId: UserId;
      limit?: number;
      relationTypes?: ('supersedes' | 'references' | 'similar')[];
    }
  ) {}
}