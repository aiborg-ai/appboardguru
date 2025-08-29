/**
 * Create User Use Case
 * Handles the business logic for creating new users
 */

import { UseCase } from '@/01-shared/types/core.types';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { User, UserRole } from '@/domain/entities/user.entity';
import { IUserRepository } from '@/application/interfaces/repositories/user.repository.interface';
import { IEmailService } from '@/application/interfaces/services/email.service.interface';
import { eventBus } from '@/01-shared/lib/event-bus';

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  organizationId?: string;
  sendWelcomeEmail?: boolean;
}

export interface CreateUserOutput {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: string;
}

export class CreateUserUseCase implements UseCase<CreateUserInput, CreateUserOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute(input: CreateUserInput): Promise<Result<CreateUserOutput>> {
    try {
      // Check if user already exists
      const existingUserResult = await this.userRepository.findByEmail(input.email);
      
      if (existingUserResult.success && existingUserResult.data) {
        return ResultUtils.fail(new Error('User with this email already exists'));
      }

      // Generate unique ID (in real app, this would be handled by infrastructure)
      const userId = this.generateUserId();

      // Create user entity
      const userResult = User.create(
        userId,
        input.email,
        input.firstName,
        input.lastName,
        input.role || UserRole.MEMBER,
        input.organizationId
      );

      if (!userResult.success) {
        return ResultUtils.fail(userResult.error);
      }

      const user = userResult.data;

      // Save to repository
      const saveResult = await this.userRepository.save(user);
      
      if (!saveResult.success) {
        return ResultUtils.fail(saveResult.error);
      }

      // Publish domain events
      await user.publishDomainEvents();

      // Send welcome email if requested
      if (input.sendWelcomeEmail) {
        await this.sendWelcomeEmail(user);
      }

      // Return output
      return ResultUtils.ok({
        id: user.id,
        email: user.getEmail(),
        fullName: user.getName(),
        role: user.getRole(),
        status: user.getStatus()
      });

    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create user')
      );
    }
  }

  private generateUserId(): string {
    // In production, use a proper ID generation strategy
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendWelcomeEmail(user: User): Promise<void> {
    try {
      await this.emailService.sendWelcomeEmail({
        to: user.getEmail(),
        name: user.getName(),
        activationLink: `${process.env.NEXT_PUBLIC_APP_URL}/activate/${user.id}`
      });

      // Publish email sent event
      await eventBus.publish({
        eventId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        eventType: 'WelcomeEmailSent',
        aggregateId: user.id,
        occurredAt: new Date(),
        payload: {
          userId: user.id,
          email: user.getEmail()
        }
      });
    } catch (error) {
      // Log error but don't fail the use case
      console.error('Failed to send welcome email:', error);
      
      // Publish email failed event for monitoring
      await eventBus.publish({
        eventId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        eventType: 'WelcomeEmailFailed',
        aggregateId: user.id,
        occurredAt: new Date(),
        payload: {
          userId: user.id,
          email: user.getEmail(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
}