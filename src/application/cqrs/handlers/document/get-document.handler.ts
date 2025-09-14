/**
 * Get Document Query Handlers
 * Handles document retrieval queries
 */

import { QueryHandler } from '@/01-shared/types/core.types';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { 
  GetDocumentByIdQuery,
  GetDocumentAccessLevelQuery 
} from '@/application/cqrs/queries/document/get-document.query';
import { IDocumentRepository } from '@/application/interfaces/repositories/document.repository.interface';
import { Document } from '@/domain/entities/document.entity';

export class GetDocumentByIdQueryHandler implements QueryHandler<GetDocumentByIdQuery, Document> {
  constructor(
    private readonly documentRepository: IDocumentRepository
  ) {}

  async execute(query: GetDocumentByIdQuery): Promise<Result<Document>> {
    try {
      const { payload } = query;

      // Get the document
      const documentResult = await this.documentRepository.findById(payload.documentId);
      if (!documentResult.success) {
        return ResultUtils.fail(`Document not found: ${documentResult.error}`);
      }

      const document = documentResult.data;

      // Check access
      if (!document.hasAccess(payload.userId, 'view')) {
        return ResultUtils.fail('You do not have permission to view this document');
      }

      // Record access
      document.recordAccess(payload.userId);
      document.incrementViewCount();

      // Save the updated view count (in background, don't wait)
      this.documentRepository.save(document).catch(err => {
        console.error('Failed to update document view count:', err);
      });

      return ResultUtils.ok(document);
    } catch (error) {
      return ResultUtils.fail(`Error retrieving document: ${error}`);
    }
  }
}

export class GetDocumentAccessLevelQueryHandler implements QueryHandler<
  GetDocumentAccessLevelQuery,
  {
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
  }
> {
  constructor(
    private readonly documentRepository: IDocumentRepository
  ) {}

  async execute(query: GetDocumentAccessLevelQuery): Promise<Result<any>> {
    try {
      const { payload } = query;

      // Get the document
      const documentResult = await this.documentRepository.findById(payload.documentId);
      if (!documentResult.success) {
        return ResultUtils.fail(`Document not found: ${documentResult.error}`);
      }

      const document = documentResult.data;
      const isOwner = document.ownerId === payload.userId;

      // Find user's collaborator entry
      const collaborator = document.collaborators.find(c => c.userId === payload.userId);
      const accessLevel = isOwner ? 'admin' : collaborator?.accessLevel;

      const result = {
        hasAccess: isOwner || !!collaborator,
        accessLevel,
        permissions: {
          canView: isOwner || document.hasAccess(payload.userId, 'view'),
          canComment: isOwner || document.hasAccess(payload.userId, 'comment'),
          canEdit: isOwner || document.hasAccess(payload.userId, 'edit'),
          canApprove: isOwner || document.hasAccess(payload.userId, 'approve'),
          canDelete: isOwner,
          canShare: isOwner || (collaborator?.canShare ?? false),
          canDownload: isOwner || (collaborator?.canDownload ?? true),
          canPrint: isOwner || (collaborator?.canPrint ?? true)
        }
      };

      return ResultUtils.ok(result);
    } catch (error) {
      return ResultUtils.fail(`Error checking document access: ${error}`);
    }
  }
}