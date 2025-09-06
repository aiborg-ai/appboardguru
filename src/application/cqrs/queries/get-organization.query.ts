/**
 * Organization Queries
 * CQRS Queries for retrieving organization information
 */

import { Query } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Organization } from '../../../domain/entities/organization.entity';
import { IOrganizationRepository, OrganizationStatistics, MemberStatistics } from '../../interfaces/repositories/organization.repository.interface';
import type { OrganizationId, UserId } from '../../../types/core';

/**
 * Get Organization By ID Query
 */
export class GetOrganizationQuery implements Query<Organization> {
  readonly queryType = 'GetOrganization';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetOrganization';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      organizationId: OrganizationId;
      userId: UserId;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_get_org_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.organizationId) {
      return ResultUtils.fail(new Error('Organization ID is required'));
    }

    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Organization Query Handler
 */
export class GetOrganizationQueryHandler {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  async handle(query: GetOrganizationQuery): Promise<Result<Organization>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetOrganizationQuery] Executing:', {
      organizationId: query.payload.organizationId,
      userId: query.payload.userId
    });

    try {
      // Get organization
      const orgResult = await this.organizationRepository.findById(query.payload.organizationId);
      if (!orgResult.success) {
        return orgResult;
      }

      const organization = orgResult.data;

      // Check if user has access to the organization
      const isMember = organization.members.some(m => m.userId === query.payload.userId);
      if (!isMember) {
        return ResultUtils.fail(new Error('You do not have access to this organization'));
      }

      console.log('[GetOrganizationQuery] Success:', {
        organizationId: organization.id,
        name: organization.name
      });

      return ResultUtils.ok(organization);
    } catch (error) {
      console.error('[GetOrganizationQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get organization')
      );
    }
  }
}

/**
 * List Organizations Query
 */
export class ListOrganizationsQuery implements Query<{ organizations: Organization[]; total: number }> {
  readonly queryType = 'ListOrganizations';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'ListOrganizations';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      userId: UserId;
      filters?: {
        type?: 'enterprise' | 'nonprofit' | 'government' | 'educational' | 'startup';
        size?: 'small' | 'medium' | 'large' | 'enterprise';
        status?: 'active' | 'inactive' | 'suspended';
        verified?: boolean;
        searchQuery?: string;
      };
      sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'memberCount';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_list_orgs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    if (this.payload.limit && this.payload.limit > 100) {
      return ResultUtils.fail(new Error('Limit cannot exceed 100'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * List Organizations Query Handler
 */
export class ListOrganizationsQueryHandler {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  async handle(query: ListOrganizationsQuery): Promise<Result<{ organizations: Organization[]; total: number }>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[ListOrganizationsQuery] Executing:', {
      userId: query.payload.userId,
      filters: query.payload.filters
    });

    try {
      const result = await this.organizationRepository.list({
        filters: query.payload.filters,
        sortBy: query.payload.sortBy,
        sortOrder: query.payload.sortOrder,
        limit: query.payload.limit || 20,
        offset: query.payload.offset || 0
      });

      if (!result.success) {
        return result;
      }

      console.log('[ListOrganizationsQuery] Success:', {
        count: result.data.organizations.length,
        total: result.data.total
      });

      return result;
    } catch (error) {
      console.error('[ListOrganizationsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to list organizations')
      );
    }
  }
}

/**
 * Get My Organizations Query
 */
export class GetMyOrganizationsQuery implements Query<Organization[]> {
  readonly queryType = 'GetMyOrganizations';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetMyOrganizations';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      userId: UserId;
      role?: 'owner' | 'admin' | 'member' | 'viewer';
      limit?: number;
      offset?: number;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_my_orgs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get My Organizations Query Handler
 */
export class GetMyOrganizationsQueryHandler {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  async handle(query: GetMyOrganizationsQuery): Promise<Result<Organization[]>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetMyOrganizationsQuery] Executing:', {
      userId: query.payload.userId,
      role: query.payload.role
    });

    try {
      const result = await this.organizationRepository.findByMember(
        query.payload.userId,
        query.payload.role
      );

      if (!result.success) {
        return result;
      }

      // Apply pagination if specified
      let organizations = result.data;
      if (query.payload.offset || query.payload.limit) {
        const offset = query.payload.offset || 0;
        const limit = query.payload.limit || 20;
        organizations = organizations.slice(offset, offset + limit);
      }

      console.log('[GetMyOrganizationsQuery] Success:', {
        count: organizations.length
      });

      return ResultUtils.ok(organizations);
    } catch (error) {
      console.error('[GetMyOrganizationsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get user organizations')
      );
    }
  }
}

/**
 * Get Organization Statistics Query
 */
export class GetOrganizationStatisticsQuery implements Query<OrganizationStatistics> {
  readonly queryType = 'GetOrganizationStatistics';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetOrganizationStatistics';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      organizationId: OrganizationId;
      userId: UserId;
      fromDate?: Date;
      toDate?: Date;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_org_stats_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.organizationId) {
      return ResultUtils.fail(new Error('Organization ID is required'));
    }

    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Organization Statistics Query Handler
 */
export class GetOrganizationStatisticsQueryHandler {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  async handle(query: GetOrganizationStatisticsQuery): Promise<Result<OrganizationStatistics>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetOrganizationStatisticsQuery] Executing:', {
      organizationId: query.payload.organizationId,
      dateRange: {
        from: query.payload.fromDate,
        to: query.payload.toDate
      }
    });

    try {
      // Check user has access
      const orgResult = await this.organizationRepository.findById(query.payload.organizationId);
      if (!orgResult.success) {
        return ResultUtils.fail(new Error('Organization not found'));
      }

      const organization = orgResult.data;
      const member = organization.members.find(m => m.userId === query.payload.userId);
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return ResultUtils.fail(new Error('Insufficient permissions to view statistics'));
      }

      // Get statistics
      const result = await this.organizationRepository.getStatistics(
        query.payload.organizationId,
        query.payload.fromDate && query.payload.toDate ? {
          from: query.payload.fromDate,
          to: query.payload.toDate
        } : undefined
      );

      if (!result.success) {
        return result;
      }

      console.log('[GetOrganizationStatisticsQuery] Success:', result.data);

      return result;
    } catch (error) {
      console.error('[GetOrganizationStatisticsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get organization statistics')
      );
    }
  }
}

/**
 * Get Member Statistics Query
 */
export class GetMemberStatisticsQuery implements Query<MemberStatistics> {
  readonly queryType = 'GetMemberStatistics';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetMemberStatistics';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      organizationId: OrganizationId;
      memberId: UserId;
      requestedBy: UserId;
      fromDate?: Date;
      toDate?: Date;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_member_stats_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.organizationId) {
      return ResultUtils.fail(new Error('Organization ID is required'));
    }

    if (!this.payload.memberId) {
      return ResultUtils.fail(new Error('Member ID is required'));
    }

    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Member Statistics Query Handler
 */
export class GetMemberStatisticsQueryHandler {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  async handle(query: GetMemberStatisticsQuery): Promise<Result<MemberStatistics>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetMemberStatisticsQuery] Executing:', {
      organizationId: query.payload.organizationId,
      memberId: query.payload.memberId,
      requestedBy: query.payload.requestedBy
    });

    try {
      // Check permissions
      const orgResult = await this.organizationRepository.findById(query.payload.organizationId);
      if (!orgResult.success) {
        return ResultUtils.fail(new Error('Organization not found'));
      }

      const organization = orgResult.data;
      const requester = organization.members.find(m => m.userId === query.payload.requestedBy);
      
      // Allow users to view their own statistics or admins/owners to view any member's statistics
      const canViewStats = query.payload.memberId === query.payload.requestedBy ||
        (requester && (requester.role === 'owner' || requester.role === 'admin'));

      if (!canViewStats) {
        return ResultUtils.fail(new Error('Insufficient permissions to view member statistics'));
      }

      // Get statistics
      const result = await this.organizationRepository.getMemberStatistics(
        query.payload.organizationId,
        query.payload.memberId,
        query.payload.fromDate && query.payload.toDate ? {
          from: query.payload.fromDate,
          to: query.payload.toDate
        } : undefined
      );

      if (!result.success) {
        return result;
      }

      console.log('[GetMemberStatisticsQuery] Success:', {
        memberId: query.payload.memberId,
        activitiesCount: result.data.activitiesCount
      });

      return result;
    } catch (error) {
      console.error('[GetMemberStatisticsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get member statistics')
      );
    }
  }
}

/**
 * Search Organizations Query
 */
export class SearchOrganizationsQuery implements Query<Organization[]> {
  readonly queryType = 'SearchOrganizations';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'SearchOrganizations';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      searchQuery: string;
      userId: UserId;
      filters?: {
        type?: 'enterprise' | 'nonprofit' | 'government' | 'educational' | 'startup';
        size?: 'small' | 'medium' | 'large' | 'enterprise';
        verified?: boolean;
      };
      limit?: number;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_search_orgs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.searchQuery || this.payload.searchQuery.trim().length < 2) {
      return ResultUtils.fail(new Error('Search query must be at least 2 characters'));
    }

    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Search Organizations Query Handler
 */
export class SearchOrganizationsQueryHandler {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  async handle(query: SearchOrganizationsQuery): Promise<Result<Organization[]>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[SearchOrganizationsQuery] Executing:', {
      searchQuery: query.payload.searchQuery,
      filters: query.payload.filters
    });

    try {
      const result = await this.organizationRepository.search(
        query.payload.searchQuery,
        {
          ...query.payload.filters,
          limit: query.payload.limit || 20
        }
      );

      if (!result.success) {
        return result;
      }

      console.log('[SearchOrganizationsQuery] Success:', {
        resultCount: result.data.length
      });

      return result;
    } catch (error) {
      console.error('[SearchOrganizationsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to search organizations')
      );
    }
  }
}

/**
 * Factory functions to create query handlers with dependencies
 */
export function createGetOrganizationQueryHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
}): GetOrganizationQueryHandler {
  return new GetOrganizationQueryHandler(dependencies.organizationRepository);
}

export function createListOrganizationsQueryHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
}): ListOrganizationsQueryHandler {
  return new ListOrganizationsQueryHandler(dependencies.organizationRepository);
}

export function createGetMyOrganizationsQueryHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
}): GetMyOrganizationsQueryHandler {
  return new GetMyOrganizationsQueryHandler(dependencies.organizationRepository);
}

export function createGetOrganizationStatisticsQueryHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
}): GetOrganizationStatisticsQueryHandler {
  return new GetOrganizationStatisticsQueryHandler(dependencies.organizationRepository);
}

export function createGetMemberStatisticsQueryHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
}): GetMemberStatisticsQueryHandler {
  return new GetMemberStatisticsQueryHandler(dependencies.organizationRepository);
}

export function createSearchOrganizationsQueryHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
}): SearchOrganizationsQueryHandler {
  return new SearchOrganizationsQueryHandler(dependencies.organizationRepository);
}