/**
 * Command Bus
 * Central dispatcher for CQRS commands and queries
 */

import { Command, Query, CommandHandler, QueryHandler } from '@/01-shared/types/core.types';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { eventBus } from '@/01-shared/lib/event-bus';

type HandlerMap = Map<string, CommandHandler<any> | QueryHandler<any, any>>;

export class CommandBus {
  private static instance: CommandBus;
  private commandHandlers: HandlerMap;
  private queryHandlers: HandlerMap;
  private middleware: CommandMiddleware[];

  private constructor() {
    this.commandHandlers = new Map();
    this.queryHandlers = new Map();
    this.middleware = [];
  }

  static getInstance(): CommandBus {
    if (!CommandBus.instance) {
      CommandBus.instance = new CommandBus();
    }
    return CommandBus.instance;
  }

  // Register handlers
  registerCommandHandler<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void {
    if (this.commandHandlers.has(commandType)) {
      throw new Error(`Command handler for ${commandType} already registered`);
    }
    this.commandHandlers.set(commandType, handler);
  }

  registerQueryHandler<T extends Query, R>(
    queryType: string,
    handler: QueryHandler<T, R>
  ): void {
    if (this.queryHandlers.has(queryType)) {
      throw new Error(`Query handler for ${queryType} already registered`);
    }
    this.queryHandlers.set(queryType, handler);
  }

  // Add middleware
  use(middleware: CommandMiddleware): void {
    this.middleware.push(middleware);
  }

  // Execute command
  async executeCommand<T extends Command, R>(command: T): Promise<Result<R>> {
    try {
      // Run pre-execution middleware
      for (const mw of this.middleware) {
        if (mw.preExecute) {
          const result = await mw.preExecute(command);
          if (!result.success) {
            return result as Result<R>;
          }
        }
      }

      // Get handler
      const handler = this.commandHandlers.get(command.commandType);
      if (!handler) {
        return ResultUtils.fail(
          new Error(`No handler registered for command type: ${command.commandType}`)
        );
      }

      // Execute command
      const result = await handler.handle(command);

      // Run post-execution middleware
      for (const mw of this.middleware) {
        if (mw.postExecute) {
          await mw.postExecute(command, result);
        }
      }

      // Publish command executed event
      await eventBus.publish({
        eventId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        eventType: 'CommandExecuted',
        aggregateId: command.commandId,
        occurredAt: new Date(),
        payload: {
          commandType: command.commandType,
          success: result.success,
          userId: command.userId
        }
      });

      return result as Result<R>;
    } catch (error) {
      // Run error middleware
      for (const mw of this.middleware) {
        if (mw.onError) {
          await mw.onError(command, error);
        }
      }

      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Command execution failed')
      );
    }
  }

  // Execute query
  async executeQuery<T extends Query, R>(query: T): Promise<Result<R>> {
    try {
      // Get handler
      const handler = this.queryHandlers.get(query.queryType);
      if (!handler) {
        return ResultUtils.fail(
          new Error(`No handler registered for query type: ${query.queryType}`)
        );
      }

      // Execute query
      const result = await handler.handle(query);

      // Publish query executed event (for monitoring)
      await eventBus.publish({
        eventId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        eventType: 'QueryExecuted',
        aggregateId: query.queryId,
        occurredAt: new Date(),
        payload: {
          queryType: query.queryType,
          success: result.success,
          userId: query.userId
        }
      });

      return result as Result<R>;
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Query execution failed')
      );
    }
  }

  // Clear all handlers (useful for testing)
  clearHandlers(): void {
    this.commandHandlers.clear();
    this.queryHandlers.clear();
  }

  // Get handler counts (for monitoring)
  getHandlerCounts(): { commands: number; queries: number } {
    return {
      commands: this.commandHandlers.size,
      queries: this.queryHandlers.size
    };
  }
}

// Middleware interface
export interface CommandMiddleware {
  preExecute?<T extends Command>(command: T): Promise<Result<void>>;
  postExecute?<T extends Command>(command: T, result: Result<unknown>): Promise<void>;
  onError?<T extends Command>(command: T, error: unknown): Promise<void>;
}

// Common middleware implementations
export class LoggingMiddleware implements CommandMiddleware {
  async preExecute<T extends Command>(command: T): Promise<Result<void>> {
    console.log(`[CommandBus] Executing ${command.commandType}`, {
      commandId: command.commandId,
      userId: command.userId,
      timestamp: command.timestamp
    });
    return ResultUtils.ok(undefined);
  }

  async postExecute<T extends Command>(command: T, result: Result<unknown>): Promise<void> {
    console.log(`[CommandBus] Completed ${command.commandType}`, {
      commandId: command.commandId,
      success: result.success,
      duration: Date.now() - command.timestamp.getTime()
    });
  }

  async onError<T extends Command>(command: T, error: unknown): Promise<void> {
    console.error(`[CommandBus] Error in ${command.commandType}`, {
      commandId: command.commandId,
      error: error instanceof Error ? error.message : error
    });
  }
}

export class ValidationMiddleware implements CommandMiddleware {
  async preExecute<T extends Command>(command: T): Promise<Result<void>> {
    // Validate command has required fields
    if (!command.commandId || !command.commandType || !command.timestamp) {
      return ResultUtils.fail(new Error('Invalid command structure'));
    }

    // Validate payload exists
    if (!command.payload) {
      return ResultUtils.fail(new Error('Command payload is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

export class AuthorizationMiddleware implements CommandMiddleware {
  constructor(
    private readonly authorizeFunc: (command: Command) => Promise<boolean>
  ) {}

  async preExecute<T extends Command>(command: T): Promise<Result<void>> {
    const isAuthorized = await this.authorizeFunc(command);
    
    if (!isAuthorized) {
      return ResultUtils.fail(new Error('Unauthorized to execute this command'));
    }

    return ResultUtils.ok(undefined);
  }
}

// Export singleton instance
export const commandBus = CommandBus.getInstance();

// Add default middleware
commandBus.use(new LoggingMiddleware());
commandBus.use(new ValidationMiddleware());