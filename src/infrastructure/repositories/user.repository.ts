/**
 * User Repository Implementation
 * Handles user data persistence using Supabase
 */

import { IUserRepository, UserSearchCriteria } from '@/application/interfaces/repositories/user.repository.interface';
import { User, UserRole, UserStatus, Email, UserName } from '@/domain/entities/user.entity';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { PaginationParams, PaginatedResult } from '@/01-shared/types/core.types';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { SupabaseClient } from '@supabase/supabase-js';

interface UserDTO {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  organization_id?: string;
  last_login_at?: string;
  preferences?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  version: number;
}

export class UserRepository implements IUserRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createSupabaseBrowserClient();
  }

  async findById(id: string): Promise<Result<User | null>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.ok(null);
        }
        return ResultUtils.fail(new Error(error.message));
      }

      if (!data) {
        return ResultUtils.ok(null);
      }

      const user = this.mapToDomain(data as UserDTO);
      return ResultUtils.ok(user);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find user')
      );
    }
  }

  async findByEmail(email: string): Promise<Result<User | null>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.ok(null);
        }
        return ResultUtils.fail(new Error(error.message));
      }

      if (!data) {
        return ResultUtils.ok(null);
      }

      const user = this.mapToDomain(data as UserDTO);
      return ResultUtils.ok(user);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find user by email')
      );
    }
  }

  async findAll(params?: PaginationParams): Promise<Result<PaginatedResult<User>>> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const offset = (page - 1) * limit;

      // Get total count
      const { count, error: countError } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        return ResultUtils.fail(new Error(countError.message));
      }

      // Get paginated data
      let query = this.supabase
        .from('users')
        .select('*')
        .range(offset, offset + limit - 1);

      if (params?.sortBy) {
        query = query.order(params.sortBy, {
          ascending: params.sortOrder === 'asc'
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        return ResultUtils.fail(new Error(error.message));
      }

      const users = (data as UserDTO[]).map(dto => this.mapToDomain(dto));

      return ResultUtils.ok({
        items: users,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      });
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find all users')
      );
    }
  }

  async findByOrganization(
    organizationId: string,
    params?: PaginationParams
  ): Promise<Result<PaginatedResult<User>>> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const offset = (page - 1) * limit;

      // Get total count
      const { count, error: countError } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (countError) {
        return ResultUtils.fail(new Error(countError.message));
      }

      // Get paginated data
      let query = this.supabase
        .from('users')
        .select('*')
        .eq('organization_id', organizationId)
        .range(offset, offset + limit - 1);

      if (params?.sortBy) {
        query = query.order(params.sortBy, {
          ascending: params.sortOrder === 'asc'
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        return ResultUtils.fail(new Error(error.message));
      }

      const users = (data as UserDTO[]).map(dto => this.mapToDomain(dto));

      return ResultUtils.ok({
        items: users,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      });
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find users by organization')
      );
    }
  }

  async findByRole(
    role: UserRole,
    params?: PaginationParams
  ): Promise<Result<PaginatedResult<User>>> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const offset = (page - 1) * limit;

      // Get total count
      const { count, error: countError } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', role);

      if (countError) {
        return ResultUtils.fail(new Error(countError.message));
      }

      // Get paginated data
      let query = this.supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .range(offset, offset + limit - 1);

      if (params?.sortBy) {
        query = query.order(params.sortBy, {
          ascending: params.sortOrder === 'asc'
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        return ResultUtils.fail(new Error(error.message));
      }

      const users = (data as UserDTO[]).map(dto => this.mapToDomain(dto));

      return ResultUtils.ok({
        items: users,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      });
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find users by role')
      );
    }
  }

  async search(
    criteria: UserSearchCriteria,
    params?: PaginationParams
  ): Promise<Result<PaginatedResult<User>>> {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const offset = (page - 1) * limit;

      let countQuery = this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      let dataQuery = this.supabase
        .from('users')
        .select('*');

      // Apply search criteria
      if (criteria.email) {
        countQuery = countQuery.eq('email', criteria.email.toLowerCase());
        dataQuery = dataQuery.eq('email', criteria.email.toLowerCase());
      }

      if (criteria.role) {
        countQuery = countQuery.eq('role', criteria.role);
        dataQuery = dataQuery.eq('role', criteria.role);
      }

      if (criteria.status) {
        countQuery = countQuery.eq('status', criteria.status);
        dataQuery = dataQuery.eq('status', criteria.status);
      }

      if (criteria.organizationId) {
        countQuery = countQuery.eq('organization_id', criteria.organizationId);
        dataQuery = dataQuery.eq('organization_id', criteria.organizationId);
      }

      if (criteria.searchTerm) {
        const searchPattern = `%${criteria.searchTerm}%`;
        countQuery = countQuery.or(
          `email.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`
        );
        dataQuery = dataQuery.or(
          `email.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`
        );
      }

      // Get total count
      const { count, error: countError } = await countQuery;

      if (countError) {
        return ResultUtils.fail(new Error(countError.message));
      }

      // Apply pagination
      dataQuery = dataQuery.range(offset, offset + limit - 1);

      if (params?.sortBy) {
        dataQuery = dataQuery.order(params.sortBy, {
          ascending: params.sortOrder === 'asc'
        });
      } else {
        dataQuery = dataQuery.order('created_at', { ascending: false });
      }

      const { data, error } = await dataQuery;

      if (error) {
        return ResultUtils.fail(new Error(error.message));
      }

      const users = (data as UserDTO[]).map(dto => this.mapToDomain(dto));

      return ResultUtils.ok({
        items: users,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      });
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to search users')
      );
    }
  }

  async findActiveUsers(params?: PaginationParams): Promise<Result<PaginatedResult<User>>> {
    return this.search({ status: UserStatus.ACTIVE }, params);
  }

  async save(entity: User): Promise<Result<User>> {
    try {
      const dto = this.mapToDTO(entity);

      const { data, error } = await this.supabase
        .from('users')
        .upsert(dto)
        .select()
        .single();

      if (error) {
        return ResultUtils.fail(new Error(error.message));
      }

      const savedUser = this.mapToDomain(data as UserDTO);
      return ResultUtils.ok(savedUser);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to save user')
      );
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        return ResultUtils.fail(new Error(error.message));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to delete user')
      );
    }
  }

  async countByOrganization(organizationId: string): Promise<Result<number>> {
    try {
      const { count, error } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (error) {
        return ResultUtils.fail(new Error(error.message));
      }

      return ResultUtils.ok(count || 0);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to count users by organization')
      );
    }
  }

  async countByRole(role: UserRole): Promise<Result<number>> {
    try {
      const { count, error } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', role);

      if (error) {
        return ResultUtils.fail(new Error(error.message));
      }

      return ResultUtils.ok(count || 0);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to count users by role')
      );
    }
  }

  async existsByEmail(email: string): Promise<Result<boolean>> {
    try {
      const { count, error } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('email', email.toLowerCase());

      if (error) {
        return ResultUtils.fail(new Error(error.message));
      }

      return ResultUtils.ok((count || 0) > 0);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check if user exists')
      );
    }
  }

  async bulkSave(users: User[]): Promise<Result<User[]>> {
    try {
      const dtos = users.map(user => this.mapToDTO(user));

      const { data, error } = await this.supabase
        .from('users')
        .upsert(dtos)
        .select();

      if (error) {
        return ResultUtils.fail(new Error(error.message));
      }

      const savedUsers = (data as UserDTO[]).map(dto => this.mapToDomain(dto));
      return ResultUtils.ok(savedUsers);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to bulk save users')
      );
    }
  }

  async bulkDelete(ids: string[]): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .in('id', ids);

      if (error) {
        return ResultUtils.fail(new Error(error.message));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to bulk delete users')
      );
    }
  }

  // Private mapping methods
  private mapToDomain(dto: UserDTO): User {
    const emailResult = Email.create(dto.email);
    const nameResult = UserName.create(dto.first_name, dto.last_name);

    if (!emailResult.success || !nameResult.success) {
      throw new Error('Invalid user data from database');
    }

    return User.restore(
      dto.id,
      emailResult.data,
      nameResult.data,
      dto.role as UserRole,
      dto.status as UserStatus,
      dto.organization_id,
      dto.last_login_at ? new Date(dto.last_login_at) : undefined,
      dto.preferences,
      new Date(dto.created_at),
      new Date(dto.updated_at),
      dto.version
    );
  }

  private mapToDTO(user: User): UserDTO {
    const json = user.toJSON() as any;
    
    return {
      id: json.id,
      email: json.email,
      first_name: json.firstName,
      last_name: json.lastName,
      role: json.role,
      status: json.status,
      organization_id: json.organizationId,
      last_login_at: json.lastLoginAt?.toISOString(),
      preferences: json.preferences,
      created_at: json.createdAt.toISOString(),
      updated_at: json.updatedAt.toISOString(),
      version: json.version
    };
  }
}