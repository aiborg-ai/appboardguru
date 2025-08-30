/**
 * Enhanced User Repository Implementation
 * Adds support for atomic operations with events and optimistic locking
 */

import { UserRepository } from './user.repository';
import { User } from '@/domain/entities/user.entity';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { DomainEvent } from '@/01-shared/types/core.types';
import { EventOutbox } from '@/infrastructure/event-outbox/event-outbox';
import { SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

export interface SaveWithEventsOptions {
  events?: DomainEvent[];
  checkVersion?: boolean;
  retryOnConflict?: boolean;
  maxRetries?: number;
}

export class EnhancedUserRepository extends UserRepository {
  constructor(
    private eventOutbox: EventOutbox,
    supabaseClient?: SupabaseClient
  ) {
    super();
  }

  /**
   * Save user with events atomically
   * Ensures user and events are persisted together
   */
  async saveWithEvents(
    user: User,
    options: SaveWithEventsOptions = {}
  ): Promise<Result<User>> {
    const {
      events = user.getDomainEvents(),
      checkVersion = true,
      retryOnConflict = true,
      maxRetries = 3
    } = options;

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < maxRetries) {
      attempts++;

      try {
        // Start transaction-like operation
        const result = await this.executeAtomicSave(
          user,
          events,
          checkVersion
        );

        if (result.success) {
          // Clear events from entity after successful save
          user.clearDomainEvents();
          return result;
        }

        // Check if error is due to version conflict
        if (this.isVersionConflict(result.error)) {
          if (!retryOnConflict || attempts >= maxRetries) {
            return ResultUtils.fail(
              new Error(`Version conflict after ${attempts} attempts: ${result.error.message}`)
            );
          }

          // Fetch latest version and retry
          const latestUserResult = await this.findById(user.id);
          if (!latestUserResult.success || !latestUserResult.data) {
            return ResultUtils.fail(
              new Error('Failed to fetch latest user version for retry')
            );
          }

          // Update version and retry
          (user as any).version = latestUserResult.data.version + 1;
          lastError = result.error;
          
          // Add exponential backoff
          await this.sleep(Math.min(1000 * Math.pow(2, attempts - 1), 5000));
          continue;
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempts >= maxRetries) {
          return ResultUtils.fail(
            new Error(`Failed to save user after ${attempts} attempts: ${lastError.message}`)
          );
        }

        await this.sleep(Math.min(1000 * Math.pow(2, attempts - 1), 5000));
      }
    }

    return ResultUtils.fail(
      lastError || new Error('Failed to save user with events')
    );
  }

  /**
   * Execute atomic save operation
   */
  private async executeAtomicSave(
    user: User,
    events: DomainEvent[],
    checkVersion: boolean
  ): Promise<Result<User>> {
    const supabase = (this as any).supabase;
    
    try {
      // Prepare user data
      const userData = this.mapUserToDTO(user);

      // Save user with version check if enabled
      let query = supabase
        .from('users')
        .upsert(userData)
        .select();

      if (checkVersion && user.version > 1) {
        // For updates, check version to prevent concurrent modifications
        const { data: currentUser, error: fetchError } = await supabase
          .from('users')
          .select('version')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          return ResultUtils.fail(new Error(`Failed to fetch current version: ${fetchError.message}`));
        }

        if (currentUser && currentUser.version !== user.version - 1) {
          return ResultUtils.fail(
            this.createVersionConflictError(currentUser.version, user.version - 1)
          );
        }
      }

      const { data: savedUserData, error: saveError } = await query;

      if (saveError) {
        return ResultUtils.fail(new Error(`Failed to save user: ${saveError.message}`));
      }

      if (!savedUserData || savedUserData.length === 0) {
        return ResultUtils.fail(new Error('No data returned after save'));
      }

      // Store events in outbox if any
      if (events.length > 0) {
        const outboxResult = await this.eventOutbox.storeEvents(events);
        
        if (!outboxResult.success) {
          // Rollback user save if event storage fails
          await this.rollbackUserSave(user.id, user.version - 1);
          return ResultUtils.fail(
            new Error(`Failed to store events: ${outboxResult.error.message}`)
          );
        }
      }

      // Map saved data back to domain entity
      const savedUser = this.mapDTOToUser(savedUserData[0]);
      return ResultUtils.ok(savedUser);

    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to execute atomic save')
      );
    }
  }

  /**
   * Update user with optimistic locking
   */
  async updateWithLocking(
    user: User,
    updateFn: (user: User) => Result<void>
  ): Promise<Result<User>> {
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;

      // Fetch latest version
      const latestResult = await this.findById(user.id);
      if (!latestResult.success || !latestResult.data) {
        return ResultUtils.fail(new Error('User not found'));
      }

      const latestUser = latestResult.data;

      // Apply update
      const updateResult = updateFn(latestUser);
      if (!updateResult.success) {
        return ResultUtils.fail(updateResult.error);
      }

      // Try to save with version check
      const saveResult = await this.saveWithEvents(latestUser, {
        checkVersion: true,
        retryOnConflict: false
      });

      if (saveResult.success) {
        return saveResult;
      }

      // If version conflict, retry
      if (this.isVersionConflict(saveResult.error)) {
        if (attempts >= maxRetries) {
          return ResultUtils.fail(
            new Error(`Failed to update after ${attempts} attempts due to version conflicts`)
          );
        }

        await this.sleep(Math.min(1000 * attempts, 3000));
        continue;
      }

      return saveResult;
    }

    return ResultUtils.fail(new Error('Failed to update user'));
  }

  /**
   * Bulk save with events
   */
  async bulkSaveWithEvents(
    users: User[]
  ): Promise<Result<User[]>> {
    const results: User[] = [];
    const errors: Error[] = [];

    // Process in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const batchPromises = batch.map(user => 
        this.saveWithEvents(user, { checkVersion: false })
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          results.push(result.value.data);
        } else {
          const error = result.status === 'rejected' 
            ? new Error(result.reason)
            : (result as any).value.error;
          errors.push(error);
        }
      });
    }

    if (errors.length > 0) {
      return ResultUtils.fail(
        new Error(`Failed to save ${errors.length} users: ${errors[0].message}`)
      );
    }

    return ResultUtils.ok(results);
  }

  /**
   * Find user by ID with version info
   */
  async findByIdWithVersion(id: string): Promise<Result<{
    user: User;
    version: number;
  } | null>> {
    const result = await this.findById(id);
    
    if (!result.success) {
      return ResultUtils.fail(result.error);
    }

    if (!result.data) {
      return ResultUtils.ok(null);
    }

    return ResultUtils.ok({
      user: result.data,
      version: result.data.version
    });
  }

  /**
   * Helper: Check if error is a version conflict
   */
  private isVersionConflict(error: Error): boolean {
    return error.message.includes('version conflict') || 
           error.message.includes('Version conflict') ||
           error.message.includes('concurrent modification');
  }

  /**
   * Helper: Create version conflict error
   */
  private createVersionConflictError(
    currentVersion: number,
    expectedVersion: number
  ): Error {
    return new Error(
      `Version conflict: expected version ${expectedVersion}, but current version is ${currentVersion}`
    );
  }

  /**
   * Helper: Rollback user save
   */
  private async rollbackUserSave(
    userId: string,
    previousVersion: number
  ): Promise<void> {
    try {
      const supabase = (this as any).supabase;
      
      if (previousVersion === 0) {
        // New user - delete it
        await supabase
          .from('users')
          .delete()
          .eq('id', userId);
      } else {
        // Existing user - restore version
        await supabase
          .from('users')
          .update({ version: previousVersion })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Failed to rollback user save:', error);
    }
  }

  /**
   * Helper: Map user to DTO
   */
  private mapUserToDTO(user: User): any {
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

  /**
   * Helper: Map DTO to user
   */
  private mapDTOToUser(dto: any): User {
    // Use the parent class's mapping method
    return (this as any).mapToDomain(dto);
  }

  /**
   * Helper: Sleep for backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get repository statistics
   */
  async getStatistics(): Promise<Result<{
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    averageVersion: number;
  }>> {
    try {
      const supabase = (this as any).supabase;
      
      const { data, error } = await supabase
        .from('users')
        .select('status, version');

      if (error) {
        return ResultUtils.fail(new Error(`Failed to get statistics: ${error.message}`));
      }

      const stats = {
        totalUsers: data?.length || 0,
        activeUsers: data?.filter((u: any) => u.status === 'active').length || 0,
        pendingUsers: data?.filter((u: any) => u.status === 'pending').length || 0,
        averageVersion: data?.length 
          ? data.reduce((sum: number, u: any) => sum + u.version, 0) / data.length 
          : 0
      };

      return ResultUtils.ok(stats);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get statistics')
      );
    }
  }
}