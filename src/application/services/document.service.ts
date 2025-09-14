/**
 * Document Service
 * Provides a clean interface for UI components to interact with document CQRS handlers
 */

import { CommandBus } from '@/application/cqrs/command-bus';
import { Result } from '@/01-shared/lib/result';
import { Document } from '@/domain/entities/document.entity';
import { DocumentId, UserId, OrganizationId, VaultId } from '@/types/core/index';
import { PaginatedResult, DocumentFilters, DocumentSortOptions, PaginationOptions } from '@/application/interfaces/repositories/document.repository.interface';

// Commands
import { CreateDocumentCommand } from '@/application/cqrs/commands/document/create-document.command';
import { UpdateDocumentCommand } from '@/application/cqrs/commands/document/update-document.command';
import { ShareDocumentWithUserCommand, AddDocumentToVaultCommand } from '@/application/cqrs/commands/document/share-document.command';
import { DeleteDocumentCommand } from '@/application/cqrs/commands/document/delete-document.command';

// Queries
import { GetDocumentByIdQuery, GetDocumentAccessLevelQuery } from '@/application/cqrs/queries/document/get-document.query';
import { ListUserDocumentsQuery, ListDocumentsByOrganizationQuery, ListRecentDocumentsQuery } from '@/application/cqrs/queries/document/list-documents.query';
import { SearchDocumentsQuery } from '@/application/cqrs/queries/document/search-documents.query';

export class DocumentService {
  constructor(
    private readonly commandBus: CommandBus
  ) {}

  // Queries
  async getDocumentById(documentId: DocumentId, userId: UserId): Promise<Result<Document>> {
    const query = new GetDocumentByIdQuery({ documentId, userId });
    return this.commandBus.executeQuery(query);
  }

  async getUserDocuments(
    userId: UserId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions,
    includeShared: boolean = true
  ): Promise<Result<PaginatedResult<Document>>> {
    const query = new ListUserDocumentsQuery({
      userId,
      filters,
      sort,
      pagination,
      includeShared
    });
    return this.commandBus.executeQuery(query);
  }

  async getOrganizationDocuments(
    organizationId: OrganizationId,
    userId: UserId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>> {
    const query = new ListDocumentsByOrganizationQuery({
      organizationId,
      userId,
      filters,
      sort,
      pagination
    });
    return this.commandBus.executeQuery(query);
  }

  async getRecentDocuments(
    userId: UserId,
    organizationId?: OrganizationId,
    limit: number = 10
  ): Promise<Result<Document[]>> {
    const query = new ListRecentDocumentsQuery({
      userId,
      organizationId,
      limit
    });
    return this.commandBus.executeQuery(query);
  }

  async searchDocuments(
    searchTerm: string,
    userId: UserId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>> {
    const query = new SearchDocumentsQuery({
      searchTerm,
      userId,
      filters,
      sort,
      pagination
    });
    return this.commandBus.executeQuery(query);
  }

  async getDocumentAccessLevel(
    documentId: DocumentId,
    userId: UserId
  ): Promise<Result<{
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
  }>> {
    const query = new GetDocumentAccessLevelQuery({ documentId, userId });
    return this.commandBus.executeQuery(query);
  }

  // Commands
  async createDocument(
    data: {
      title: string;
      type: string;
      assetId: string;
      organizationId?: OrganizationId;
      boardId?: string;
      description?: string;
      tags?: string[];
      classification?: string;
      approvalRequired?: boolean;
      approvers?: UserId[];
      retentionPeriod?: number;
      expiryDate?: Date;
      accessControl?: {
        isPublic?: boolean;
        allowedUsers?: UserId[];
        allowedRoles?: string[];
      };
      metadata?: Record<string, any>;
    },
    createdBy: UserId
  ): Promise<Result<DocumentId>> {
    const command = new CreateDocumentCommand({
      ...data,
      createdBy
    });
    return this.commandBus.executeCommand(command);
  }

  async updateDocument(
    documentId: DocumentId,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      classification?: string;
      retentionPeriod?: number;
      expiryDate?: Date;
      metadata?: Record<string, any>;
    },
    updatedBy: UserId
  ): Promise<Result<void>> {
    const command = new UpdateDocumentCommand({
      documentId,
      updates,
      updatedBy
    });
    return this.commandBus.executeCommand(command);
  }

  async shareDocument(
    documentId: DocumentId,
    userId: UserId,
    accessLevel: 'view' | 'comment' | 'edit' | 'approve' | 'admin',
    sharedBy: UserId,
    options?: {
      canDownload?: boolean;
      canPrint?: boolean;
      canShare?: boolean;
      expiresAt?: Date;
    }
  ): Promise<Result<void>> {
    const command = new ShareDocumentWithUserCommand({
      documentId,
      userId,
      accessLevel,
      sharedBy,
      ...options
    });
    return this.commandBus.executeCommand(command);
  }

  async addDocumentToVault(
    documentId: DocumentId,
    vaultId: VaultId,
    addedBy: UserId
  ): Promise<Result<void>> {
    const command = new AddDocumentToVaultCommand({
      documentId,
      vaultId,
      addedBy
    });
    return this.commandBus.executeCommand(command);
  }

  async deleteDocument(
    documentId: DocumentId,
    deletedBy: UserId,
    reason?: string
  ): Promise<Result<void>> {
    const command = new DeleteDocumentCommand({
      documentId,
      deletedBy,
      reason
    });
    return this.commandBus.executeCommand(command);
  }

  // Utility methods for UI
  async uploadAndCreateDocument(
    file: File,
    assetId: string,
    organizationId: OrganizationId | undefined,
    userId: UserId,
    metadata?: Record<string, any>
  ): Promise<Result<DocumentId>> {
    // Extract file information
    const title = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const type = this.getDocumentType(file.type);

    return this.createDocument(
      {
        title,
        type,
        assetId,
        organizationId,
        metadata: {
          ...metadata,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        }
      },
      userId
    );
  }

  private getDocumentType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'other';
  }
}

// Singleton instance
let documentServiceInstance: DocumentService | null = null;

export function getDocumentService(commandBus: CommandBus): DocumentService {
  if (!documentServiceInstance) {
    documentServiceInstance = new DocumentService(commandBus);
  }
  return documentServiceInstance;
}