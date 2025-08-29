/**
 * Create User Command
 * CQRS command for creating a new user
 */

import { Command, CommandHandler } from '@/01-shared/types/core.types';
import { Result } from '@/01-shared/lib/result';
import { CreateUserUseCase, CreateUserInput, CreateUserOutput } from '@/application/use-cases/user/create-user.use-case';
import { IUserRepository } from '@/application/interfaces/repositories/user.repository.interface';
import { IEmailService } from '@/application/interfaces/services/email.service.interface';
import { eventBus } from '@/01-shared/lib/event-bus';

export class CreateUserCommand implements Command<CreateUserInput> {
  readonly commandId: string;
  readonly commandType = 'CreateUser';
  readonly timestamp: Date;
  readonly userId?: string;

  constructor(
    public readonly payload: CreateUserInput,
    userId?: string
  ) {
    this.commandId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    this.timestamp = new Date();
    this.userId = userId;
  }
}

export class CreateUserCommandHandler implements CommandHandler<CreateUserCommand> {
  private useCase: CreateUserUseCase;

  constructor(
    userRepository: IUserRepository,
    emailService: IEmailService
  ) {
    this.useCase = new CreateUserUseCase(userRepository, emailService);
  }

  async handle(command: CreateUserCommand): Promise<Result<CreateUserOutput>> {
    // Log command execution
    await eventBus.publish({
      eventId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      eventType: 'CommandExecuted',
      aggregateId: command.commandId,
      occurredAt: new Date(),
      payload: {
        commandType: command.commandType,
        commandId: command.commandId,
        userId: command.userId
      }
    });

    // Execute use case
    const result = await this.useCase.execute(command.payload);

    // Log command result
    await eventBus.publish({
      eventId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      eventType: result.success ? 'CommandSucceeded' : 'CommandFailed',
      aggregateId: command.commandId,
      occurredAt: new Date(),
      payload: {
        commandType: command.commandType,
        commandId: command.commandId,
        success: result.success,
        error: result.success ? null : (result as any).error.message
      }
    });

    return result;
  }
}