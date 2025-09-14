/**
 * List Documents Query Handlers
 * Handles queries for retrieving multiple documents
 */

import { QueryHandler } from '@/01-shared/types/core.types';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { 
  ListUserDocumentsQuery,
  ListDocumentsByOrganizationQuery,
  ListDocumentsByVaultQuery,
  ListRecentDocumentsQuery
} from '@/application/cqrs/queries/document/list-documents.query';
import { IDocumentRepository } from '@/application/interfaces/repositories/document.repository.interface';
import { Document } from '@/domain/entities/document.entity';
import { PaginatedResult } from '@/application/interfaces/repositories/document.repository.interface';

export class ListUserDocumentsQueryHandler implements QueryHandler<ListUserDocumentsQuery, PaginatedResult<Document>> {
  constructor(
    private readonly documentRepository: IDocumentRepository
  ) {}

  async execute(query: ListUserDocumentsQuery): Promise<Result<PaginatedResult<Document>>> {
    try {
      const { payload } = query;

      // Get documents accessible by the user
      const result = payload.includeShared
        ? await this.documentRepository.findAccessibleByUser(
            payload.userId,
            payload.filters,
            payload.sort,
            payload.pagination
          )
        : await this.documentRepository.findByOwner(
            payload.userId,
            payload.filters,
            payload.sort,
            payload.pagination
          );

      if (!result.success) {
        return ResultUtils.fail(`Failed to retrieve documents: ${result.error}`);
      }

      return ResultUtils.ok(result.data);
    } catch (error) {
      return ResultUtils.fail(`Error retrieving user documents: ${error}`);
    }
  }
}

export class ListDocumentsByOrganizationQueryHandler implements QueryHandler<
  ListDocumentsByOrganizationQuery,
  PaginatedResult<Document>
> {
  constructor(
    private readonly documentRepository: IDocumentRepository
  ) {}

  async execute(query: ListDocumentsByOrganizationQuery): Promise<Result<PaginatedResult<Document>>> {
    try {
      const { payload } = query;

      // Get organization documents
      const result = await this.documentRepository.findByOrganization(
        payload.organizationId,
        payload.filters,
        payload.sort,
        payload.pagination
      );

      if (!result.success) {
        return ResultUtils.fail(`Failed to retrieve organization documents: ${result.error}`);
      }

      // Filter out documents the user doesn't have access to
      const accessibleDocuments = result.data.items.filter(doc => 
        doc.hasAccess(payload.userId, 'view')
      );

      return ResultUtils.ok({
        ...result.data,
        items: accessibleDocuments
      });
    } catch (error) {
      return ResultUtils.fail(`Error retrieving organization documents: ${error}`);
    }
  }
}

export class ListDocumentsByVaultQueryHandler implements QueryHandler<
  ListDocumentsByVaultQuery,
  PaginatedResult<Document>
> {
  constructor(
    private readonly documentRepository: IDocumentRepository
  ) {}

  async execute(query: ListDocumentsByVaultQuery): Promise<Result<PaginatedResult<Document>>> {
    try {
      const { payload } = query;

      // Get vault documents
      const result = await this.documentRepository.findByVault(
        payload.vaultId,
        payload.filters,
        payload.sort,
        payload.pagination
      );

      if (!result.success) {
        return ResultUtils.fail(`Failed to retrieve vault documents: ${result.error}`);
      }

      // Filter out documents the user doesn't have access to
      const accessibleDocuments = result.data.items.filter(doc => 
        doc.hasAccess(payload.userId, 'view')
      );

      return ResultUtils.ok({
        ...result.data,
        items: accessibleDocuments
      });
    } catch (error) {
      return ResultUtils.fail(`Error retrieving vault documents: ${error}`);
    }
  }
}

export class ListRecentDocumentsQueryHandler implements QueryHandler<ListRecentDocumentsQuery, Document[]> {
  constructor(
    private readonly documentRepository: IDocumentRepository
  ) {}

  async execute(query: ListRecentDocumentsQuery): Promise<Result<Document[]>> {
    try {
      const { payload } = query;
      const limit = payload.limit || 10;

      // Build filters based on what types of recent documents to include
      const filters: any = {
        organizationId: payload.organizationId
      };

      // Get recent documents
      const result = await this.documentRepository.findAccessibleByUser(
        payload.userId,
        filters,
        { field: 'updatedAt', direction: 'desc' },
        { page: 1, limit }
      );

      if (!result.success) {
        return ResultUtils.fail(`Failed to retrieve recent documents: ${result.error}`);
      }

      return ResultUtils.ok(result.data.items);
    } catch (error) {
      return ResultUtils.fail(`Error retrieving recent documents: ${error}`);
    }
  }
}