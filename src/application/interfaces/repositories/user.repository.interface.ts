/**
 * User Repository Interface
 * Defines the contract for user data access operations
 */

import { Result } from '@/01-shared/types/core.types';
import { User, UserRole, UserStatus } from '@/domain/entities/user.entity';
import type { UserId, OrganizationId } from '@/types/core';

export interface UserFilters {
  organizationId?: OrganizationId;
  role?: UserRole | UserRole[];
  status?: UserStatus | UserStatus[];
  emailVerified?: boolean;
  searchQuery?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface UserListOptions {
  filters?: UserFilters;
  sortBy?: 'email' | 'name' | 'createdAt' | 'lastLoginAt' | 'status';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  verifiedUsers: number;
  twoFactorEnabledUsers: number;
  usersByRole: Record<UserRole, number>;
  userGrowth: {
    period: string;
    newUsers: number;
    activeLogins: number;
  }[];
  averageLoginFrequency: number;
}

export interface IUserRepository {
  // Basic CRUD Operations
  create(user: User): Promise<Result<User>>;
  update(userId: UserId, user: User): Promise<Result<User>>;
  delete(userId: UserId): Promise<Result<void>>;
  findById(userId: UserId): Promise<Result<User>>;
  
  // Authentication-specific queries
  findByEmail(email: string): Promise<Result<User | null>>;
  findByResetToken(token: string): Promise<Result<User | null>>;
  findByInviteToken(token: string): Promise<Result<User | null>>;
  
  // List and search operations
  list(options: UserListOptions): Promise<Result<{ users: User[]; total: number }>>;
  findByOrganization(organizationId: OrganizationId, role?: UserRole): Promise<Result<User[]>>;
  search(query: string, limit?: number): Promise<Result<User[]>>;
  
  // Batch operations
  findByIds(userIds: UserId[]): Promise<Result<User[]>>;
  bulkUpdateStatus(userIds: UserId[], status: UserStatus): Promise<Result<number>>;
  
  // Statistics and analytics
  getStatistics(organizationId?: OrganizationId, dateRange?: { from: Date; to: Date }): Promise<Result<UserStatistics>>;
  getLoginActivity(userId: UserId, days?: number): Promise<Result<{ date: Date; loginCount: number }[]>>;
  
  // Authentication helpers
  updateLastLogin(userId: UserId, timestamp: Date): Promise<Result<void>>;
  updatePasswordHash(userId: UserId, passwordHash: string): Promise<Result<void>>;
  updateEmailVerification(userId: UserId, verified: boolean, verifiedAt?: Date): Promise<Result<void>>;
  updateTwoFactorAuth(userId: UserId, enabled: boolean, secret?: string): Promise<Result<void>>;
  updateFailedLoginAttempts(userId: UserId, attempts: number, lockedUntil?: Date): Promise<Result<void>>;
  
  // Token management
  saveResetToken(userId: UserId, token: string, expiry: Date): Promise<Result<void>>;
  clearResetToken(userId: UserId): Promise<Result<void>>;
  saveInviteToken(userId: UserId, token: string, expiry: Date): Promise<Result<void>>;
  clearInviteToken(userId: UserId): Promise<Result<void>>;
  
  // Validation helpers
  emailExists(email: string, excludeUserId?: UserId): Promise<Result<boolean>>;
  canCreateUser(email: string, organizationId?: OrganizationId): Promise<Result<boolean>>;
}