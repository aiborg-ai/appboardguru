/**
 * Document Repository Implementation
 * Handles document persistence using Supabase
 */

import { Result, ResultUtils } from '@/01-shared/lib/result';
import { IDocumentRepository, DocumentFilters, DocumentSortOptions, PaginationOptions, PaginatedResult } from '@/application/interfaces/repositories/document.repository.interface';
import { Document, DocumentProps } from '@/domain/entities/document.entity';
import { DocumentId, UserId, OrganizationId, BoardId, VaultId } from '@/types/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export class DocumentRepositoryImpl implements IDocumentRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database>
  ) {}

  async findById(id: DocumentId): Promise<Result<Document>> {
    try {
      // For now, we'll use the assets table as our document storage
      // In a real implementation, we'd have a dedicated documents table
      const { data, error } = await this.supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return ResultUtils.fail(`Failed to find document: ${error.message}`);
      }

      if (!data) {
        return ResultUtils.fail('Document not found');
      }

      // Map from database to domain entity
      const document = this.mapToDomainEntity(data);
      return ResultUtils.ok(document);
    } catch (error) {
      return ResultUtils.fail(`Error finding document: ${error}`);
    }
  }

  async findByOrganization(
    organizationId: OrganizationId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>> {
    try {
      let query = this.supabase
        .from('assets')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId);

      // Apply filters
      if (filters) {
        if (filters.status?.length) {
          query = query.in('status', filters.status);
        }
        if (filters.type?.length) {
          query = query.in('file_type', filters.type);
        }
        if (filters.searchTerm) {
          query = query.or(`title.ilike.%${filters.searchTerm}%,file_name.ilike.%${filters.searchTerm}%`);
        }
      }

      // Apply sorting
      if (sort) {
        const column = this.mapSortField(sort.field);
        query = query.order(column, { ascending: sort.direction === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        return ResultUtils.fail(`Failed to find documents: ${error.message}`);
      }

      const documents = (data || []).map(item => this.mapToDomainEntity(item));
      
      return ResultUtils.ok({
        items: documents,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      });
    } catch (error) {
      return ResultUtils.fail(`Error finding organization documents: ${error}`);
    }
  }

  async findByBoard(
    boardId: BoardId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>> {
    // Similar implementation to findByOrganization but filtering by board_id
    // For now, using a simplified version
    return this.findByOrganization('' as any, { ...filters, boardId }, sort, pagination);
  }

  async findByOwner(
    ownerId: UserId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>> {
    try {
      let query = this.supabase
        .from('assets')
        .select('*', { count: 'exact' })
        .eq('owner_id', ownerId);

      // Apply filters and sorting similar to findByOrganization
      if (filters?.searchTerm) {
        query = query.or(`title.ilike.%${filters.searchTerm}%,file_name.ilike.%${filters.searchTerm}%`);
      }

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        return ResultUtils.fail(`Failed to find user documents: ${error.message}`);
      }

      const documents = (data || []).map(item => this.mapToDomainEntity(item));
      
      return ResultUtils.ok({
        items: documents,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      });
    } catch (error) {
      return ResultUtils.fail(`Error finding user documents: ${error}`);
    }
  }

  async findAccessibleByUser(
    userId: UserId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>> {
    try {
      // Find documents where user is owner OR has been granted access
      let query = this.supabase
        .from('assets')
        .select('*', { count: 'exact' })
        .or(`owner_id.eq.${userId}`);

      // Apply filters
      if (filters?.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
      }
      if (filters?.searchTerm) {
        query = query.or(`title.ilike.%${filters.searchTerm}%,file_name.ilike.%${filters.searchTerm}%`);
      }

      // Apply sorting
      const sortColumn = sort ? this.mapSortField(sort.field) : 'created_at';
      query = query.order(sortColumn, { ascending: sort?.direction === 'asc' });

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        return ResultUtils.fail(`Failed to find accessible documents: ${error.message}`);
      }

      const documents = (data || []).map(item => this.mapToDomainEntity(item));
      
      return ResultUtils.ok({
        items: documents,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      });
    } catch (error) {
      return ResultUtils.fail(`Error finding accessible documents: ${error}`);
    }
  }

  async findByVault(
    vaultId: VaultId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>> {
    // In a real implementation, this would query through a vault_assets junction table
    // For now, returning empty result
    return ResultUtils.ok({
      items: [],
      total: 0,
      page: 1,
      totalPages: 0
    });
  }

  async findPendingApproval(
    userId: UserId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>> {
    // Would filter by documents where user is in approvers list and status is pending_approval
    return ResultUtils.ok({
      items: [],
      total: 0,
      page: 1,
      totalPages: 0
    });
  }

  async findTemplates(
    organizationId?: OrganizationId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>> {
    // Would filter by is_template = true
    return ResultUtils.ok({
      items: [],
      total: 0,
      page: 1,
      totalPages: 0
    });
  }

  async search(
    searchTerm: string,
    userId: UserId,
    filters?: DocumentFilters,
    sort?: DocumentSortOptions,
    pagination?: PaginationOptions
  ): Promise<Result<PaginatedResult<Document>>> {
    return this.findAccessibleByUser(userId, { ...filters, searchTerm }, sort, pagination);
  }

  async save(document: Document): Promise<Result<void>> {
    try {
      const data = this.mapToDatabase(document);
      
      const { error } = await this.supabase
        .from('assets')
        .upsert(data);

      if (error) {
        return ResultUtils.fail(`Failed to save document: ${error.message}`);
      }

      return ResultUtils.ok();
    } catch (error) {
      return ResultUtils.fail(`Error saving document: ${error}`);
    }
  }

  async delete(id: DocumentId): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('assets')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) {
        return ResultUtils.fail(`Failed to delete document: ${error.message}`);
      }

      return ResultUtils.ok();
    } catch (error) {
      return ResultUtils.fail(`Error deleting document: ${error}`);
    }
  }

  async exists(id: DocumentId): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('assets')
        .select('id')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        return ResultUtils.fail(`Failed to check document existence: ${error.message}`);
      }

      return ResultUtils.ok(!!data);
    } catch (error) {
      return ResultUtils.fail(`Error checking document existence: ${error}`);
    }
  }

  async count(filters?: DocumentFilters): Promise<Result<number>> {
    try {
      let query = this.supabase
        .from('assets')
        .select('*', { count: 'exact', head: true });

      if (filters?.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
      }

      const { count, error } = await query;

      if (error) {
        return ResultUtils.fail(`Failed to count documents: ${error.message}`);
      }

      return ResultUtils.ok(count || 0);
    } catch (error) {
      return ResultUtils.fail(`Error counting documents: ${error}`);
    }
  }

  async findByIds(ids: DocumentId[]): Promise<Result<Document[]>> {
    try {
      const { data, error } = await this.supabase
        .from('assets')
        .select('*')
        .in('id', ids);

      if (error) {
        return ResultUtils.fail(`Failed to find documents: ${error.message}`);
      }

      const documents = (data || []).map(item => this.mapToDomainEntity(item));
      return ResultUtils.ok(documents);
    } catch (error) {
      return ResultUtils.fail(`Error finding documents by IDs: ${error}`);
    }
  }

  async findRelated(documentId: DocumentId, limit?: number): Promise<Result<Document[]>> {
    // Would implement logic to find related documents based on tags, type, etc.
    return ResultUtils.ok([]);
  }

  async getVersionHistory(documentId: DocumentId): Promise<Result<any[]>> {
    // Would query document_versions table
    return ResultUtils.ok([]);
  }

  async checkAccess(
    documentId: DocumentId,
    userId: UserId,
    accessLevel: 'view' | 'comment' | 'edit' | 'approve' | 'admin'
  ): Promise<Result<boolean>> {
    const documentResult = await this.findById(documentId);
    if (!documentResult.success) {
      return ResultUtils.ok(false);
    }

    const document = documentResult.data;
    return ResultUtils.ok(document.hasAccess(userId, accessLevel));
  }

  async findExpiringSoon(days: number, organizationId?: OrganizationId): Promise<Result<Document[]>> {
    // Would filter by expiry date
    return ResultUtils.ok([]);
  }

  async findForRetentionReview(organizationId?: OrganizationId): Promise<Result<Document[]>> {
    // Would filter by retention review date
    return ResultUtils.ok([]);
  }

  async bulkUpdate(
    ids: DocumentId[],
    updates: Partial<{ status: string; tags: string[]; classification: string; }>
  ): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('assets')
        .update(updates as any)
        .in('id', ids);

      if (error) {
        return ResultUtils.fail(`Failed to bulk update documents: ${error.message}`);
      }

      return ResultUtils.ok();
    } catch (error) {
      return ResultUtils.fail(`Error bulk updating documents: ${error}`);
    }
  }

  async getStorageStats(organizationId: OrganizationId): Promise<Result<any>> {
    // Would aggregate storage statistics
    return ResultUtils.ok({
      totalDocuments: 0,
      totalSize: 0,
      byType: {},
      byStatus: {}
    });
  }

  // Helper methods
  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      title: 'title',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      viewCount: 'view_count',
      downloadCount: 'download_count'
    };
    return fieldMap[field] || 'created_at';
  }

  private mapToDomainEntity(data: any): Document {
    // Map database record to Document domain entity
    // This is a simplified version - in production would handle all fields properly
    const props: DocumentProps = {
      id: data.id,
      title: data.title || data.file_name,
      type: data.document_type || 'other',
      status: data.status || 'draft',
      classification: data.classification || 'internal',
      assetId: data.id, // Using the asset ID as both
      organizationId: data.organization_id,
      boardId: data.board_id,
      versions: [],
      currentVersion: '1.0',
      approvals: [],
      approvalRequired: false,
      comments: [],
      collaborators: [],
      metadata: data.metadata || {},
      tags: data.tags || [],
      createdBy: data.owner_id,
      ownerId: data.owner_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      viewCount: data.view_count || 0,
      downloadCount: data.download_count || 0,
      isTemplate: false,
      isLocked: false
    };

    return Document.fromPersistence(props);
  }

  private mapToDatabase(document: Document): any {
    const props = document.toPersistence();
    
    // Map domain entity to database record
    return {
      id: props.id,
      title: props.title,
      file_name: props.title,
      document_type: props.type,
      status: props.status,
      classification: props.classification,
      organization_id: props.organizationId,
      board_id: props.boardId,
      owner_id: props.ownerId,
      metadata: props.metadata,
      tags: props.tags,
      view_count: props.viewCount,
      download_count: props.downloadCount,
      updated_at: props.updatedAt.toISOString()
    };
  }
}