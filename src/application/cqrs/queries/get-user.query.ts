/**
 * User Queries
 * CQRS Queries for retrieving user information
 */

import { Query } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { User, UserRole, UserStatus } from '../../../domain/entities/user.entity';
import { IUserRepository, UserStatistics } from '../../interfaces/repositories/user.repository.interface';
import type { UserId, OrganizationId } from '../../../types/core';

/**
 * Get User By ID Query
 */
export class GetUserQuery implements Query<User> {
  readonly queryType = 'GetUser';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetUser';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      userId: UserId;
      requestedBy: UserId;
    }
  ) {
    this.userId = payload.requestedBy;
  }

  private generateQueryId(): string {
    return `qry_get_user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get User Query Handler
 */
export class GetUserQueryHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async handle(query: GetUserQuery): Promise<Result<User>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetUserQuery] Executing:', {
      userId: query.payload.userId,
      requestedBy: query.payload.requestedBy
    });

    try {
      // Get user
      const userResult = await this.userRepository.findById(query.payload.userId);
      if (!userResult.success) {
        return userResult;
      }

      const user = userResult.data;

      // Check permissions - users can view their own profile or admins can view any
      if (query.payload.userId !== query.payload.requestedBy) {
        // Get requester to check if they're an admin
        const requesterResult = await this.userRepository.findById(query.payload.requestedBy);
        if (!requesterResult.success) {
          return ResultUtils.fail(new Error('Requester not found'));
        }

        const requester = requesterResult.data;
        if (!requester.canPerformAdminActions()) {
          return ResultUtils.fail(new Error('Insufficient permissions to view this user'));
        }
      }

      console.log('[GetUserQuery] Success:', {
        userId: user.id,
        email: user.getEmail()
      });

      return ResultUtils.ok(user);
    } catch (error) {
      console.error('[GetUserQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get user')
      );
    }
  }
}

/**
 * Get Current User Query
 */
export class GetCurrentUserQuery implements Query<User> {
  readonly queryType = 'GetCurrentUser';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetCurrentUser';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      userId: UserId;
    }
  ) {
    this.userId = payload.userId;
  }

  private generateQueryId(): string {
    return `qry_current_user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Current User Query Handler
 */
export class GetCurrentUserQueryHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async handle(query: GetCurrentUserQuery): Promise<Result<User>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetCurrentUserQuery] Executing:', {
      userId: query.payload.userId
    });

    try {
      const userResult = await this.userRepository.findById(query.payload.userId);
      if (!userResult.success) {
        return userResult;
      }

      console.log('[GetCurrentUserQuery] Success:', {
        userId: userResult.data.id,
        email: userResult.data.getEmail()
      });

      return userResult;
    } catch (error) {
      console.error('[GetCurrentUserQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get current user')
      );
    }
  }
}

/**
 * List Users Query
 */
export class ListUsersQuery implements Query<{ users: User[]; total: number }> {
  readonly queryType = 'ListUsers';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'ListUsers';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      requestedBy: UserId;
      filters?: {
        organizationId?: OrganizationId;
        role?: UserRole | UserRole[];
        status?: UserStatus | UserStatus[];
        emailVerified?: boolean;
        searchQuery?: string;
      };
      sortBy?: 'email' | 'name' | 'createdAt' | 'lastLoginAt' | 'status';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ) {
    this.userId = payload.requestedBy;
  }

  private generateQueryId(): string {
    return `qry_list_users_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    if (this.payload.limit && this.payload.limit > 100) {
      return ResultUtils.fail(new Error('Limit cannot exceed 100'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * List Users Query Handler
 */
export class ListUsersQueryHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async handle(query: ListUsersQuery): Promise<Result<{ users: User[]; total: number }>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[ListUsersQuery] Executing:', {
      requestedBy: query.payload.requestedBy,
      filters: query.payload.filters
    });

    try {
      // Check if requester has permission to list users
      const requesterResult = await this.userRepository.findById(query.payload.requestedBy);
      if (!requesterResult.success) {
        return ResultUtils.fail(new Error('Requester not found'));
      }

      const requester = requesterResult.data;
      
      // Only admins can list all users
      // Non-admins can only see users in their organization
      let filters = query.payload.filters || {};
      if (!requester.canPerformAdminActions()) {
        const requesterOrgId = requester.getOrganizationId();
        if (!requesterOrgId) {
          return ResultUtils.fail(new Error('Insufficient permissions to list users'));
        }
        filters.organizationId = requesterOrgId;
      }

      const result = await this.userRepository.list({
        filters,
        sortBy: query.payload.sortBy,
        sortOrder: query.payload.sortOrder,
        limit: query.payload.limit || 20,
        offset: query.payload.offset || 0
      });

      if (!result.success) {
        return result;
      }

      console.log('[ListUsersQuery] Success:', {
        count: result.data.users.length,
        total: result.data.total
      });

      return result;
    } catch (error) {
      console.error('[ListUsersQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to list users')
      );
    }
  }
}

/**
 * Search Users Query
 */
export class SearchUsersQuery implements Query<User[]> {
  readonly queryType = 'SearchUsers';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'SearchUsers';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      searchQuery: string;
      requestedBy: UserId;
      limit?: number;
    }
  ) {
    this.userId = payload.requestedBy;
  }

  private generateQueryId(): string {
    return `qry_search_users_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.searchQuery || this.payload.searchQuery.trim().length < 2) {
      return ResultUtils.fail(new Error('Search query must be at least 2 characters'));
    }

    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Search Users Query Handler
 */
export class SearchUsersQueryHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async handle(query: SearchUsersQuery): Promise<Result<User[]>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[SearchUsersQuery] Executing:', {
      searchQuery: query.payload.searchQuery,
      requestedBy: query.payload.requestedBy
    });

    try {
      // Check if requester exists
      const requesterResult = await this.userRepository.findById(query.payload.requestedBy);
      if (!requesterResult.success) {
        return ResultUtils.fail(new Error('Requester not found'));
      }

      const result = await this.userRepository.search(
        query.payload.searchQuery,
        query.payload.limit || 10
      );

      if (!result.success) {
        return result;
      }

      // Filter out deleted users
      const activeUsers = result.data.filter(user => user.getStatus() !== UserStatus.DELETED);

      console.log('[SearchUsersQuery] Success:', {
        resultCount: activeUsers.length
      });

      return ResultUtils.ok(activeUsers);
    } catch (error) {
      console.error('[SearchUsersQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to search users')
      );
    }
  }
}

/**
 * Get User Statistics Query
 */
export class GetUserStatisticsQuery implements Query<UserStatistics> {
  readonly queryType = 'GetUserStatistics';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetUserStatistics';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      requestedBy: UserId;
      organizationId?: OrganizationId;
      dateRange?: {
        from: Date;
        to: Date;
      };
    }
  ) {
    this.userId = payload.requestedBy;
  }

  private generateQueryId(): string {
    return `qry_user_stats_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    if (this.payload.dateRange) {
      if (this.payload.dateRange.from >= this.payload.dateRange.to) {
        return ResultUtils.fail(new Error('Invalid date range'));
      }
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get User Statistics Query Handler
 */
export class GetUserStatisticsQueryHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async handle(query: GetUserStatisticsQuery): Promise<Result<UserStatistics>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetUserStatisticsQuery] Executing:', {
      requestedBy: query.payload.requestedBy,
      organizationId: query.payload.organizationId
    });

    try {
      // Check if requester has permission
      const requesterResult = await this.userRepository.findById(query.payload.requestedBy);
      if (!requesterResult.success) {
        return ResultUtils.fail(new Error('Requester not found'));
      }

      const requester = requesterResult.data;
      
      // Only admins can view statistics
      if (!requester.canPerformAdminActions()) {
        // Non-admins can only view their organization's statistics
        if (!query.payload.organizationId || query.payload.organizationId !== requester.getOrganizationId()) {
          return ResultUtils.fail(new Error('Insufficient permissions to view statistics'));
        }
      }

      const result = await this.userRepository.getStatistics(
        query.payload.organizationId,
        query.payload.dateRange
      );

      if (!result.success) {
        return result;
      }

      console.log('[GetUserStatisticsQuery] Success:', {
        totalUsers: result.data.totalUsers,
        activeUsers: result.data.activeUsers
      });

      return result;
    } catch (error) {
      console.error('[GetUserStatisticsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get user statistics')
      );
    }
  }
}

/**
 * Check Email Availability Query
 */
export class CheckEmailAvailabilityQuery implements Query<boolean> {
  readonly queryType = 'CheckEmailAvailability';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'CheckEmailAvailability';
  readonly timestamp = new Date();
  readonly userId: UserId = '' as UserId;

  constructor(
    public readonly payload: {
      email: string;
      excludeUserId?: UserId;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_check_email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.email || !this.payload.email.includes('@')) {
      return ResultUtils.fail(new Error('Valid email is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Check Email Availability Query Handler
 */
export class CheckEmailAvailabilityQueryHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async handle(query: CheckEmailAvailabilityQuery): Promise<Result<boolean>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[CheckEmailAvailabilityQuery] Executing:', {
      email: query.payload.email,
      excludeUserId: query.payload.excludeUserId
    });

    try {
      const result = await this.userRepository.emailExists(
        query.payload.email,
        query.payload.excludeUserId
      );

      if (!result.success) {
        return result;
      }

      // Email is available if it doesn't exist
      const isAvailable = !result.data;

      console.log('[CheckEmailAvailabilityQuery] Success:', {
        email: query.payload.email,
        available: isAvailable
      });

      return ResultUtils.ok(isAvailable);
    } catch (error) {
      console.error('[CheckEmailAvailabilityQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check email availability')
      );
    }
  }
}

/**
 * Factory functions to create query handlers with dependencies
 */
export function createGetUserQueryHandler(dependencies: {
  userRepository: IUserRepository;
}): GetUserQueryHandler {
  return new GetUserQueryHandler(dependencies.userRepository);
}

export function createGetCurrentUserQueryHandler(dependencies: {
  userRepository: IUserRepository;
}): GetCurrentUserQueryHandler {
  return new GetCurrentUserQueryHandler(dependencies.userRepository);
}

export function createListUsersQueryHandler(dependencies: {
  userRepository: IUserRepository;
}): ListUsersQueryHandler {
  return new ListUsersQueryHandler(dependencies.userRepository);
}

export function createSearchUsersQueryHandler(dependencies: {
  userRepository: IUserRepository;
}): SearchUsersQueryHandler {
  return new SearchUsersQueryHandler(dependencies.userRepository);
}

export function createGetUserStatisticsQueryHandler(dependencies: {
  userRepository: IUserRepository;
}): GetUserStatisticsQueryHandler {
  return new GetUserStatisticsQueryHandler(dependencies.userRepository);
}

export function createCheckEmailAvailabilityQueryHandler(dependencies: {
  userRepository: IUserRepository;
}): CheckEmailAvailabilityQueryHandler {
  return new CheckEmailAvailabilityQueryHandler(dependencies.userRepository);
}