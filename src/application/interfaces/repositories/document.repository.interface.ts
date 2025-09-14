/**
 * Document Repository Interface
 * Defines the contract for document persistence operations
 */

import { Result } from '@/01-shared/lib/result';
import { Document } from '@/domain/entities/document.entity';
import { 
  DocumentId, 
  UserId, 
  OrganizationId, 
  BoardId,
  VaultId 
} from '@/types/core';

export interface DocumentFilters {
  organizationId?: OrganizationId;
  boardId?: BoardId;
  ownerId?: UserId;
  vaultId?: VaultId;
  status?: string[];
  type?: string[];
  tags?: string[];
  searchTerm?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  hasApprovals?: boolean;
  isTemplate?: boolean;
}

export interface DocumentSortOptions {
  field: 'title' | 'createdAt' | 'updatedAt' | 'viewCount' | 'downloadCount';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IDocumentRepository {
  /**
   * Find document by ID
   */
  findById(id: DocumentId): Promise<Result<Document>>;

  /**
   * Find documents by organization
   */
  findByOrganization(
    organizationId: OrganizationId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>>;

  /**
   * Find documents by board
   */
  findByBoard(
    boardId: BoardId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>>;

  /**
   * Find documents by owner
   */
  findByOwner(
    ownerId: UserId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>>;

  /**
   * Find documents accessible by user
   * Includes owned documents and documents where user is a collaborator
   */
  findAccessibleByUser(
    userId: UserId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>>;

  /**
   * Find documents in vault
   */
  findByVault(
    vaultId: VaultId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>>;

  /**
   * Find documents requiring approval from user
   */
  findPendingApproval(
    userId: UserId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>>;

  /**
   * Find document templates
   */
  findTemplates(
    organizationId?: OrganizationId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>>;

  /**
   * Search documents by text
   */
  search(
    searchTerm: string,
    userId: UserId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>>;

  /**
   * Save document (create or update)
   */
  save(document: Document): Promise<Result<void>>;

  /**
   * Delete document
   */
  delete(id: DocumentId): Promise<Result<void>>;

  /**
   * Check if document exists
   */
  exists(id: DocumentId): Promise<Result<boolean>>;

  /**
   * Get document count by filters
   */
  count(filters?: DocumentFilters): Promise<Result<number>>;

  /**
   * Get documents by IDs
   */
  findByIds(ids: DocumentId[]): Promise<Result<Document[]>>;

  /**
   * Get related documents
   */
  findRelated(
    documentId: DocumentId,
    limit?: number
  ): Promise<Result<Document[]>>;

  /**
   * Get document versions
   */
  getVersionHistory(documentId: DocumentId): Promise<Result<any[]>>;

  /**
   * Check if user has access to document
   */
  checkAccess(
    documentId: DocumentId,
    userId: UserId,
    accessLevel: 'view' | 'comment' | 'edit' | 'approve' | 'admin'
  ): Promise<Result<boolean>>;

  /**
   * Get documents expiring soon
   */
  findExpiringSoon(
    days: number,
    organizationId?: OrganizationId
  ): Promise<Result<Document[]>>;

  /**
   * Get documents for retention review
   */
  findForRetentionReview(
    organizationId?: OrganizationId
  ): Promise<Result<Document[]>>;

  /**
   * Bulk update documents
   */
  bulkUpdate(
    ids: DocumentId[],
    updates: Partial<{
      status: string;
      tags: string[];
      classification: string;
    }>
  ): Promise<Result<void>>;

  /**
   * Get storage statistics
   */
  getStorageStats(organizationId: OrganizationId): Promise<Result<{
    totalDocuments: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
    byStatus: Record<string, number>;
  }>>;
}