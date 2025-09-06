/**
 * User Update and Delete Commands
 * CQRS Commands for updating and deleting users
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { User, UserRole, UserStatus } from '../../../domain/entities/user.entity';
import { IUserRepository } from '../../interfaces/repositories/user.repository.interface';
import { EventBus } from '../../../01-shared/lib/event-bus';
import type { UserId, OrganizationId } from '../../../types/core';

/**
 * Update User Command
 */
export class UpdateUserCommand implements Command<User> {
  readonly commandType = 'UpdateUser';
  readonly commandId = this.generateCommandId();

  constructor(
    public readonly payload: {
      userId: UserId;
      updates: {
        name?: string;
        email?: string;
        role?: UserRole;
        status?: UserStatus;
        organizationId?: OrganizationId | null;
        twoFactorEnabled?: boolean;
      };
      updatedBy: UserId;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_update_user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    if (!this.payload.updatedBy) {
      return ResultUtils.fail(new Error('Updater ID is required'));
    }

    if (!this.payload.updates || Object.keys(this.payload.updates).length === 0) {
      return ResultUtils.fail(new Error('No updates provided'));
    }

    // Validate email format if provided
    if (this.payload.updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.payload.updates.email)) {
        return ResultUtils.fail(new Error('Invalid email format'));
      }
    }

    // Validate role if provided
    if (this.payload.updates.role && !Object.values(UserRole).includes(this.payload.updates.role)) {
      return ResultUtils.fail(new Error('Invalid user role'));
    }

    // Validate status if provided
    if (this.payload.updates.status && !Object.values(UserStatus).includes(this.payload.updates.status)) {
      return ResultUtils.fail(new Error('Invalid user status'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Update User Command Handler
 */
export class UpdateUserCommandHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: UpdateUserCommand): Promise<Result<User>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[UpdateUserCommand] Executing:', {
      userId: command.payload.userId,
      updatedBy: command.payload.updatedBy
    });

    try {
      // Get the user to update
      const userResult = await this.userRepository.findById(command.payload.userId);
      if (!userResult.success) {
        return ResultUtils.fail(new Error('User not found'));
      }

      const user = userResult.data;

      // Check permissions - only admins can update other users
      if (command.payload.userId !== command.payload.updatedBy) {
        const updaterResult = await this.userRepository.findById(command.payload.updatedBy);
        if (!updaterResult.success) {
          return ResultUtils.fail(new Error('Updater not found'));
        }

        const updater = updaterResult.data;
        if (!updater.canPerformAdminActions()) {
          return ResultUtils.fail(new Error('Insufficient permissions to update this user'));
        }
      }

      // Check if email is being changed and if it's available
      if (command.payload.updates.email && command.payload.updates.email !== user.getEmail()) {
        const emailExistsResult = await this.userRepository.emailExists(
          command.payload.updates.email,
          command.payload.userId
        );
        if (!emailExistsResult.success) {
          return emailExistsResult;
        }
        if (emailExistsResult.data) {
          return ResultUtils.fail(new Error('Email already exists'));
        }
      }

      // Apply updates to the user entity
      if (command.payload.updates.name !== undefined) {
        const nameResult = user.updateName(command.payload.updates.name);
        if (!nameResult.success) {
          return nameResult;
        }
      }

      if (command.payload.updates.email !== undefined) {
        const emailResult = user.updateEmail(command.payload.updates.email);
        if (!emailResult.success) {
          return emailResult;
        }
      }

      if (command.payload.updates.role !== undefined) {
        const roleResult = user.updateRole(command.payload.updates.role);
        if (!roleResult.success) {
          return roleResult;
        }
      }

      if (command.payload.updates.status !== undefined) {
        const statusResult = user.updateStatus(command.payload.updates.status);
        if (!statusResult.success) {
          return statusResult;
        }
      }

      if (command.payload.updates.organizationId !== undefined) {
        const orgResult = user.updateOrganization(command.payload.updates.organizationId);
        if (!orgResult.success) {
          return orgResult;
        }
      }

      // Handle two-factor authentication update
      if (command.payload.updates.twoFactorEnabled !== undefined) {
        if (command.payload.updates.twoFactorEnabled) {
          // Generate a secret for 2FA (in real app, use proper library)
          const secret = Math.random().toString(36).substring(2, 15);
          const tfaResult = user.enableTwoFactor(secret);
          if (!tfaResult.success) {
            return tfaResult;
          }
        } else {
          user.disableTwoFactor();
        }
      }

      // Save the updated user
      const updateResult = await this.userRepository.update(command.payload.userId, user);
      if (!updateResult.success) {
        return updateResult;
      }

      // Publish domain events
      await user.publishDomainEvents(this.eventBus);

      console.log('[UpdateUserCommand] Success:', {
        userId: user.id,
        updatedFields: Object.keys(command.payload.updates)
      });

      return ResultUtils.ok(updateResult.data);
    } catch (error) {
      console.error('[UpdateUserCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update user')
      );
    }
  }
}

/**
 * Delete User Command
 */
export class DeleteUserCommand implements Command<void> {
  readonly commandType = 'DeleteUser';
  readonly commandId = this.generateCommandId();

  constructor(
    public readonly payload: {
      userId: UserId;
      deletedBy: UserId;
      hardDelete?: boolean; // If true, permanently delete. Otherwise, soft delete.
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_delete_user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    if (!this.payload.deletedBy) {
      return ResultUtils.fail(new Error('Deleter ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Delete User Command Handler
 */
export class DeleteUserCommandHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: DeleteUserCommand): Promise<Result<void>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[DeleteUserCommand] Executing:', {
      userId: command.payload.userId,
      deletedBy: command.payload.deletedBy,
      hardDelete: command.payload.hardDelete
    });

    try {
      // Get the user to delete
      const userResult = await this.userRepository.findById(command.payload.userId);
      if (!userResult.success) {
        return ResultUtils.fail(new Error('User not found'));
      }

      const user = userResult.data;

      // Check permissions - only admins can delete users
      const deleterResult = await this.userRepository.findById(command.payload.deletedBy);
      if (!deleterResult.success) {
        return ResultUtils.fail(new Error('Deleter not found'));
      }

      const deleter = deleterResult.data;
      if (!deleter.canPerformAdminActions()) {
        return ResultUtils.fail(new Error('Insufficient permissions to delete users'));
      }

      // Prevent self-deletion
      if (command.payload.userId === command.payload.deletedBy) {
        return ResultUtils.fail(new Error('Cannot delete your own account'));
      }

      if (command.payload.hardDelete) {
        // Permanent deletion
        const deleteResult = await this.userRepository.delete(command.payload.userId);
        if (!deleteResult.success) {
          return deleteResult;
        }

        // Publish deletion event
        await this.eventBus.publish({
          eventType: 'UserDeleted',
          aggregateId: command.payload.userId,
          eventData: {
            userId: command.payload.userId,
            deletedBy: command.payload.deletedBy,
            deletedAt: new Date(),
            hardDelete: true
          },
          occurredAt: new Date()
        });
      } else {
        // Soft deletion
        const softDeleteResult = user.softDelete();
        if (!softDeleteResult.success) {
          return softDeleteResult;
        }

        const updateResult = await this.userRepository.update(command.payload.userId, user);
        if (!updateResult.success) {
          return updateResult;
        }

        // Publish domain events from the user entity
        await user.publishDomainEvents(this.eventBus);
      }

      console.log('[DeleteUserCommand] Success:', {
        userId: command.payload.userId,
        hardDelete: command.payload.hardDelete
      });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[DeleteUserCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to delete user')
      );
    }
  }
}

/**
 * Factory functions to create command handlers with dependencies
 */
export function createUpdateUserCommandHandler(dependencies: {
  userRepository: IUserRepository;
  eventBus: EventBus;
}): UpdateUserCommandHandler {
  return new UpdateUserCommandHandler(dependencies.userRepository, dependencies.eventBus);
}

export function createDeleteUserCommandHandler(dependencies: {
  userRepository: IUserRepository;
  eventBus: EventBus;
}): DeleteUserCommandHandler {
  return new DeleteUserCommandHandler(dependencies.userRepository, dependencies.eventBus);
}