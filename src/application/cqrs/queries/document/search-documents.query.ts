/**
 * Search Documents Queries
 * Queries for searching and analyzing documents
 */

import { Query } from '@/01-shared/types/core.types';
import { UserId, OrganizationId } from '@/types/core';
import { Document } from '@/domain/entities/document.entity';
import { 
  DocumentFilters, 
  DocumentSortOptions, 
  PaginationOptions,
  PaginatedResult 
} from '@/application/interfaces/repositories/document.repository.interface';

export class SearchDocumentsQuery implements Query<PaginatedResult<Document>> {
  readonly type = 'SearchDocumentsQuery';

  constructor(
    public readonly payload: {
      searchTerm: string;
      userId: UserId;
      organizationId?: OrganizationId;
      searchIn?: ('title' | 'content' | 'tags' | 'comments')[];
      filters?: DocumentFilters;
      sort?: DocumentSortOptions;
      pagination?: PaginationOptions;
    }
  ) {}
}

export class GetDocumentStatisticsQuery implements Query<{
  totalDocuments: number;
  totalSize: number;
  byType: Record<string, { count: number; size: number }>;
  byStatus: Record<string, number>;
  byClassification: Record<string, number>;
  recentActivity: {
    created: number;
    updated: number;
    viewed: number;
    downloaded: number;
  };
  topContributors: Array<{
    userId: string;
    name: string;
    documentCount: number;
  }>;
}> {
  readonly type = 'GetDocumentStatisticsQuery';

  constructor(
    public readonly payload: {
      organizationId: OrganizationId;
      boardId?: string;
      dateRange?: {
        from: Date;
        to: Date;
      };
    }
  ) {}
}

export class GetDocumentActivityQuery implements Query<Array<{
  id: string;
  type: string;
  documentId: string;
  documentTitle: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: Date;
  details?: any;
}>> {
  readonly type = 'GetDocumentActivityQuery';

  constructor(
    public readonly payload: {
      documentId?: string;
      userId?: UserId;
      organizationId?: OrganizationId;
      activityTypes?: string[];
      limit?: number;
      offset?: number;
    }
  ) {}
}

export class GetExpiringSoonDocumentsQuery implements Query<Document[]> {
  readonly type = 'GetExpiringSoonDocumentsQuery';

  constructor(
    public readonly payload: {
      organizationId?: OrganizationId;
      userId: UserId;
      daysAhead?: number;
      includeRetention?: boolean;
      includeApprovals?: boolean;
    }
  ) {}
}

export class GetDocumentsForRetentionReviewQuery implements Query<Document[]> {
  readonly type = 'GetDocumentsForRetentionReviewQuery';

  constructor(
    public readonly payload: {
      organizationId: OrganizationId;
      reviewerId: UserId;
      overdueOnly?: boolean;
    }
  ) {}
}