/**
 * User Repository Implementation
 * Concrete implementation using Supabase for user data persistence
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { 
  User, 
  UserRole, 
  UserStatus, 
  Email, 
  UserName 
} from '@/domain/entities/user.entity';
import { 
  IUserRepository, 
  UserListOptions, 
  UserStatistics 
} from '@/application/interfaces/repositories/user.repository.interface';
import type { UserId, OrganizationId } from '@/types/core';

export class UserRepositoryImpl implements IUserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(user: User): Promise<Result<User>> {
    try {
      const userData = this.toPersistence(user);
      
      const { data, error } = await this.supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) {
        console.error('[UserRepository] Create error:', error);
        return ResultUtils.fail(new Error(`Failed to create user: ${error.message}`));
      }

      return this.findById(data.id);
    } catch (error) {
      console.error('[UserRepository] Unexpected create error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create user')
      );
    }
  }

  async update(userId: UserId, user: User): Promise<Result<User>> {
    try {
      const userData = this.toPersistence(user);
      delete userData.id; // Remove ID from update data
      delete userData.created_at; // Remove created_at from update

      const { error } = await this.supabase
        .from('users')
        .update(userData)
        .eq('id', userId);

      if (error) {
        console.error('[UserRepository] Update error:', error);
        return ResultUtils.fail(new Error(`Failed to update user: ${error.message}`));
      }

      return this.findById(userId);
    } catch (error) {
      console.error('[UserRepository] Unexpected update error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update user')
      );
    }
  }

  async delete(userId: UserId): Promise<Result<void>> {
    try {
      // Soft delete by updating status
      const { error } = await this.supabase
        .from('users')
        .update({ 
          status: UserStatus.DELETED,
          deleted_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[UserRepository] Delete error:', error);
        return ResultUtils.fail(new Error(`Failed to delete user: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UserRepository] Unexpected delete error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to delete user')
      );
    }
  }

  async findById(userId: UserId): Promise<Result<User>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.fail(new Error('User not found'));
        }
        console.error('[UserRepository] FindById error:', error);
        return ResultUtils.fail(new Error(`Failed to find user: ${error.message}`));
      }

      const user = this.toDomain(data);
      return ResultUtils.ok(user);
    } catch (error) {
      console.error('[UserRepository] Unexpected findById error:', error);
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
        console.error('[UserRepository] FindByEmail error:', error);
        return ResultUtils.fail(new Error(`Failed to find user by email: ${error.message}`));
      }

      const user = this.toDomain(data);
      return ResultUtils.ok(user);
    } catch (error) {
      console.error('[UserRepository] Unexpected findByEmail error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find user by email')
      );
    }
  }

  async findByResetToken(token: string): Promise<Result<User | null>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('reset_password_token', token)
        .gt('reset_password_expiry', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.ok(null);
        }
        console.error('[UserRepository] FindByResetToken error:', error);
        return ResultUtils.fail(new Error(`Failed to find user by reset token: ${error.message}`));
      }

      const user = this.toDomain(data);
      return ResultUtils.ok(user);
    } catch (error) {
      console.error('[UserRepository] Unexpected findByResetToken error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find user by reset token')
      );
    }
  }

  async findByInviteToken(token: string): Promise<Result<User | null>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('invite_token', token)
        .gt('invite_expiry', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.ok(null);
        }
        console.error('[UserRepository] FindByInviteToken error:', error);
        return ResultUtils.fail(new Error(`Failed to find user by invite token: ${error.message}`));
      }

      const user = this.toDomain(data);
      return ResultUtils.ok(user);
    } catch (error) {
      console.error('[UserRepository] Unexpected findByInviteToken error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find user by invite token')
      );
    }
  }

  async list(options: UserListOptions): Promise<Result<{ users: User[]; total: number }>> {
    try {
      let query = this.supabase
        .from('users')
        .select('*', { count: 'exact' });

      // Apply filters
      if (options.filters) {
        const { filters } = options;

        if (filters.organizationId) {
          query = query.eq('organization_id', filters.organizationId);
        }

        if (filters.role) {
          if (Array.isArray(filters.role)) {
            query = query.in('role', filters.role);
          } else {
            query = query.eq('role', filters.role);
          }
        }

        if (filters.status) {
          if (Array.isArray(filters.status)) {
            query = query.in('status', filters.status);
          } else {
            query = query.eq('status', filters.status);
          }
        }

        if (filters.emailVerified !== undefined) {
          query = query.eq('email_verified', filters.emailVerified);
        }

        if (filters.searchQuery) {
          query = query.or(
            `email.ilike.%${filters.searchQuery}%,` +
            `first_name.ilike.%${filters.searchQuery}%,` +
            `last_name.ilike.%${filters.searchQuery}%`
          );
        }

        if (filters.createdAfter) {
          query = query.gte('created_at', filters.createdAfter.toISOString());
        }

        if (filters.createdBefore) {
          query = query.lte('created_at', filters.createdBefore.toISOString());
        }
      }

      // Apply sorting
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';
      const columnMap: Record<string, string> = {
        email: 'email',
        name: 'first_name',
        createdAt: 'created_at',
        lastLoginAt: 'last_login_at',
        status: 'status'
      };
      
      query = query.order(columnMap[sortBy] || 'created_at', { ascending: sortOrder === 'asc' });

      // Apply pagination
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('[UserRepository] List error:', error);
        return ResultUtils.fail(new Error(`Failed to list users: ${error.message}`));
      }

      const users = (data || []).map(userData => this.toDomain(userData));

      return ResultUtils.ok({
        users,
        total: count || 0
      });
    } catch (error) {
      console.error('[UserRepository] Unexpected list error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to list users')
      );
    }
  }

  async findByOrganization(organizationId: OrganizationId, role?: UserRole): Promise<Result<User[]>> {
    try {
      let query = this.supabase
        .from('users')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('status', UserStatus.DELETED);

      if (role) {
        query = query.eq('role', role);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[UserRepository] FindByOrganization error:', error);
        return ResultUtils.fail(new Error(`Failed to find users by organization: ${error.message}`));
      }

      const users = (data || []).map(userData => this.toDomain(userData));
      return ResultUtils.ok(users);
    } catch (error) {
      console.error('[UserRepository] Unexpected findByOrganization error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find users by organization')
      );
    }
  }

  async search(query: string, limit: number = 10): Promise<Result<User[]>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .or(
          `email.ilike.%${query}%,` +
          `first_name.ilike.%${query}%,` +
          `last_name.ilike.%${query}%`
        )
        .neq('status', UserStatus.DELETED)
        .limit(limit);

      if (error) {
        console.error('[UserRepository] Search error:', error);
        return ResultUtils.fail(new Error(`Failed to search users: ${error.message}`));
      }

      const users = (data || []).map(userData => this.toDomain(userData));
      return ResultUtils.ok(users);
    } catch (error) {
      console.error('[UserRepository] Unexpected search error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to search users')
      );
    }
  }

  async findByIds(userIds: UserId[]): Promise<Result<User[]>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .in('id', userIds);

      if (error) {
        console.error('[UserRepository] FindByIds error:', error);
        return ResultUtils.fail(new Error(`Failed to find users by IDs: ${error.message}`));
      }

      const users = (data || []).map(userData => this.toDomain(userData));
      return ResultUtils.ok(users);
    } catch (error) {
      console.error('[UserRepository] Unexpected findByIds error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find users by IDs')
      );
    }
  }

  async bulkUpdateStatus(userIds: UserId[], status: UserStatus): Promise<Result<number>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', userIds)
        .select();

      if (error) {
        console.error('[UserRepository] BulkUpdateStatus error:', error);
        return ResultUtils.fail(new Error(`Failed to bulk update status: ${error.message}`));
      }

      return ResultUtils.ok(data?.length || 0);
    } catch (error) {
      console.error('[UserRepository] Unexpected bulkUpdateStatus error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to bulk update status')
      );
    }
  }

  async getStatistics(
    organizationId?: OrganizationId,
    dateRange?: { from: Date; to: Date }
  ): Promise<Result<UserStatistics>> {
    try {
      let query = this.supabase
        .from('users')
        .select('status, role, email_verified, two_factor_enabled, created_at');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('[UserRepository] GetStatistics error:', error);
        return ResultUtils.fail(new Error(`Failed to get statistics: ${error.message}`));
      }

      const users = data || [];
      
      const statistics: UserStatistics = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === UserStatus.ACTIVE).length,
        pendingUsers: users.filter(u => u.status === UserStatus.PENDING).length,
        suspendedUsers: users.filter(u => u.status === UserStatus.SUSPENDED).length,
        verifiedUsers: users.filter(u => u.email_verified).length,
        twoFactorEnabledUsers: users.filter(u => u.two_factor_enabled).length,
        usersByRole: {
          [UserRole.ADMIN]: users.filter(u => u.role === UserRole.ADMIN).length,
          [UserRole.DIRECTOR]: users.filter(u => u.role === UserRole.DIRECTOR).length,
          [UserRole.MEMBER]: users.filter(u => u.role === UserRole.MEMBER).length,
          [UserRole.VIEWER]: users.filter(u => u.role === UserRole.VIEWER).length
        },
        userGrowth: [], // Would need additional logic to calculate growth periods
        averageLoginFrequency: 0 // Would need login history data
      };

      return ResultUtils.ok(statistics);
    } catch (error) {
      console.error('[UserRepository] Unexpected getStatistics error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get statistics')
      );
    }
  }

  async getLoginActivity(
    userId: UserId,
    days: number = 30
  ): Promise<Result<{ date: Date; loginCount: number }[]>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // This would typically query a login_history table
      // For now, returning empty array as we don't have login history tracking yet
      return ResultUtils.ok([]);
    } catch (error) {
      console.error('[UserRepository] Unexpected getLoginActivity error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get login activity')
      );
    }
  }

  async updateLastLogin(userId: UserId, timestamp: Date): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({ 
          last_login_at: timestamp.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[UserRepository] UpdateLastLogin error:', error);
        return ResultUtils.fail(new Error(`Failed to update last login: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UserRepository] Unexpected updateLastLogin error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update last login')
      );
    }
  }

  async updatePasswordHash(userId: UserId, passwordHash: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({ 
          password_hash: passwordHash,
          password_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[UserRepository] UpdatePasswordHash error:', error);
        return ResultUtils.fail(new Error(`Failed to update password: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UserRepository] Unexpected updatePasswordHash error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update password')
      );
    }
  }

  async updateEmailVerification(
    userId: UserId,
    verified: boolean,
    verifiedAt?: Date
  ): Promise<Result<void>> {
    try {
      const updateData: any = {
        email_verified: verified,
        updated_at: new Date().toISOString()
      };

      if (verifiedAt) {
        updateData.email_verified_at = verifiedAt.toISOString();
      }

      const { error } = await this.supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('[UserRepository] UpdateEmailVerification error:', error);
        return ResultUtils.fail(new Error(`Failed to update email verification: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UserRepository] Unexpected updateEmailVerification error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update email verification')
      );
    }
  }

  async updateTwoFactorAuth(
    userId: UserId,
    enabled: boolean,
    secret?: string
  ): Promise<Result<void>> {
    try {
      const updateData: any = {
        two_factor_enabled: enabled,
        updated_at: new Date().toISOString()
      };

      if (secret) {
        updateData.two_factor_secret = secret;
      }

      const { error } = await this.supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('[UserRepository] UpdateTwoFactorAuth error:', error);
        return ResultUtils.fail(new Error(`Failed to update two-factor auth: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UserRepository] Unexpected updateTwoFactorAuth error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update two-factor auth')
      );
    }
  }

  async updateFailedLoginAttempts(
    userId: UserId,
    attempts: number,
    lockedUntil?: Date
  ): Promise<Result<void>> {
    try {
      const updateData: any = {
        failed_login_attempts: attempts,
        updated_at: new Date().toISOString()
      };

      if (lockedUntil) {
        updateData.locked_until = lockedUntil.toISOString();
      } else {
        updateData.locked_until = null;
      }

      const { error } = await this.supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('[UserRepository] UpdateFailedLoginAttempts error:', error);
        return ResultUtils.fail(new Error(`Failed to update failed login attempts: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UserRepository] Unexpected updateFailedLoginAttempts error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update failed login attempts')
      );
    }
  }

  async saveResetToken(userId: UserId, token: string, expiry: Date): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          reset_password_token: token,
          reset_password_expiry: expiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[UserRepository] SaveResetToken error:', error);
        return ResultUtils.fail(new Error(`Failed to save reset token: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UserRepository] Unexpected saveResetToken error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to save reset token')
      );
    }
  }

  async clearResetToken(userId: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          reset_password_token: null,
          reset_password_expiry: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[UserRepository] ClearResetToken error:', error);
        return ResultUtils.fail(new Error(`Failed to clear reset token: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UserRepository] Unexpected clearResetToken error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to clear reset token')
      );
    }
  }

  async saveInviteToken(userId: UserId, token: string, expiry: Date): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          invite_token: token,
          invite_expiry: expiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[UserRepository] SaveInviteToken error:', error);
        return ResultUtils.fail(new Error(`Failed to save invite token: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UserRepository] Unexpected saveInviteToken error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to save invite token')
      );
    }
  }

  async clearInviteToken(userId: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          invite_token: null,
          invite_expiry: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[UserRepository] ClearInviteToken error:', error);
        return ResultUtils.fail(new Error(`Failed to clear invite token: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UserRepository] Unexpected clearInviteToken error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to clear invite token')
      );
    }
  }

  async emailExists(email: string, excludeUserId?: UserId): Promise<Result<boolean>> {
    try {
      let query = this.supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase());

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[UserRepository] EmailExists error:', error);
        return ResultUtils.fail(new Error(`Failed to check email existence: ${error.message}`));
      }

      return ResultUtils.ok((data?.length || 0) > 0);
    } catch (error) {
      console.error('[UserRepository] Unexpected emailExists error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check email existence')
      );
    }
  }

  async canCreateUser(email: string, organizationId?: OrganizationId): Promise<Result<boolean>> {
    try {
      // Check if email already exists
      const emailExistsResult = await this.emailExists(email);
      if (!emailExistsResult.success) {
        return emailExistsResult;
      }

      if (emailExistsResult.data) {
        return ResultUtils.ok(false);
      }

      // If organizationId provided, check organization limits
      if (organizationId) {
        // This would typically check organization member limits
        // For now, always return true
        return ResultUtils.ok(true);
      }

      return ResultUtils.ok(true);
    } catch (error) {
      console.error('[UserRepository] Unexpected canCreateUser error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check if user can be created')
      );
    }
  }

  // Helper methods for data transformation
  private toPersistence(user: User): any {
    return {
      id: user.id,
      email: user.getEmail(),
      first_name: user.getFirstName(),
      last_name: user.getLastName(),
      role: user.getRole(),
      status: user.getStatus(),
      organization_id: user.getOrganizationId(),
      last_login_at: user.getLastLoginAt()?.toISOString(),
      preferences: user.getPreferences(),
      email_verified: user.isEmailVerified(),
      email_verified_at: user.getEmailVerifiedAt()?.toISOString(),
      password_hash: user.getPasswordHash(),
      two_factor_enabled: user.isTwoFactorEnabled(),
      two_factor_secret: user.getTwoFactorSecret(),
      reset_password_token: user.getResetPasswordToken(),
      reset_password_expiry: user.getResetPasswordExpiry()?.toISOString(),
      failed_login_attempts: user.getFailedLoginAttempts(),
      locked_until: user.getLockedUntil()?.toISOString(),
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
      version: user.version
    };
  }

  private toDomain(data: any): User {
    const emailResult = Email.create(data.email);
    if (!emailResult.success) {
      throw new Error(`Invalid email in database: ${data.email}`);
    }

    const nameResult = UserName.create(data.first_name, data.last_name);
    if (!nameResult.success) {
      throw new Error(`Invalid name in database: ${data.first_name} ${data.last_name}`);
    }

    return User.restore(
      data.id,
      emailResult.data,
      nameResult.data,
      data.role as UserRole,
      data.status as UserStatus,
      data.organization_id,
      data.last_login_at ? new Date(data.last_login_at) : undefined,
      data.preferences || {},
      data.email_verified || false,
      data.email_verified_at ? new Date(data.email_verified_at) : undefined,
      data.password_hash,
      data.password_changed_at ? new Date(data.password_changed_at) : undefined,
      data.two_factor_enabled || false,
      data.two_factor_secret,
      data.reset_password_token,
      data.reset_password_expiry ? new Date(data.reset_password_expiry) : undefined,
      data.invite_token,
      data.invite_expiry ? new Date(data.invite_expiry) : undefined,
      data.failed_login_attempts || 0,
      data.locked_until ? new Date(data.locked_until) : undefined,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.version || 0
    );
  }
}