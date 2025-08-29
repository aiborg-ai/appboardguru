/**
 * User Repository Interface
 * Defines the contract for user data persistence
 */

import { Repository, PaginationParams, PaginatedResult } from '@/01-shared/types/core.types';
import { Result } from '@/01-shared/lib/result';
import { User, UserRole, UserStatus } from '@/domain/entities/user.entity';

export interface UserSearchCriteria {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  organizationId?: string;
  searchTerm?: string;
}

export interface IUserRepository extends Repository<User> {
  // Basic CRUD operations inherited from Repository interface
  
  // Additional user-specific methods
  findByEmail(email: string): Promise<Result<User | null>>;
  
  findByOrganization(
    organizationId: string,
    params?: PaginationParams
  ): Promise<Result<PaginatedResult<User>>>;
  
  findByRole(
    role: UserRole,
    params?: PaginationParams
  ): Promise<Result<PaginatedResult<User>>>;
  
  search(
    criteria: UserSearchCriteria,
    params?: PaginationParams
  ): Promise<Result<PaginatedResult<User>>>;
  
  findActiveUsers(
    params?: PaginationParams
  ): Promise<Result<PaginatedResult<User>>>;
  
  countByOrganization(organizationId: string): Promise<Result<number>>;
  
  countByRole(role: UserRole): Promise<Result<number>>;
  
  existsByEmail(email: string): Promise<Result<boolean>>;
  
  bulkSave(users: User[]): Promise<Result<User[]>>;
  
  bulkDelete(ids: string[]): Promise<Result<void>>;
}