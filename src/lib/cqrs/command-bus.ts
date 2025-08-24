/**
 * CQRS Command Bus - Command Handling Infrastructure
 * Implements command pattern with validation, authorization, and error handling
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { Result, success, failure } from '../repositories/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { EventStore, DomainEvent } from '../events/event-store'
import { nanoid } from 'nanoid'

// Base command interface
export interface Command {
  id: string
  type: string
  aggregateId: string
  userId?: string
  timestamp: string
  version: number
  metadata: Record<string, any>
  payload: Record<string, any>
}

// Command handler interface
export interface CommandHandler<TCommand extends Command = Command> {
  handle(command: TCommand, context: CommandContext): Promise<Result<DomainEvent[], string>>
  canHandle(commandType: string): boolean
  validateCommand?(command: TCommand): Result<void, string>
  authorize?(command: TCommand, context: CommandContext): Promise<Result<void, string>>
}

// Command context
export interface CommandContext {
  userId?: string
  roles: string[]
  permissions: string[]
  metadata: Record<string, any>
  traceId: string
}

// Command middleware interface
export interface CommandMiddleware {
  execute(
    command: Command,
    context: CommandContext,
    next: () => Promise<Result<DomainEvent[], string>>
  ): Promise<Result<DomainEvent[], string>>
}

// Command bus options
export interface CommandBusOptions {
  enableMetrics?: boolean
  enableTracing?: boolean
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

export class CommandBus extends EventEmitter {
  private handlers: Map<string, CommandHandler> = new Map()
  private middleware: CommandMiddleware[] = []
  private metrics: MetricsCollector
  private tracer: DistributedTracer
  private options: Required<CommandBusOptions>

  constructor(
    private eventStore: EventStore,
    options: CommandBusOptions = {}
  ) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
    
    this.options = {
      enableMetrics: options.enableMetrics ?? true,
      enableTracing: options.enableTracing ?? true,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      timeout: options.timeout ?? 30000
    }
  }

  /**
   * Register a command handler
   */
  registerHandler(handler: CommandHandler): void {
    const handlerTypes = this.getHandlerTypes(handler)
    
    handlerTypes.forEach(type => {
      if (this.handlers.has(type)) {
        throw new Error(`Handler for command type '${type}' already registered`)
      }
      this.handlers.set(type, handler)
    })

    console.log(`Registered command handler for types: ${handlerTypes.join(', ')}`)
  }

  /**
   * Register multiple handlers
   */
  registerHandlers(handlers: CommandHandler[]): void {
    handlers.forEach(handler => this.registerHandler(handler))
  }

  /**
   * Add middleware to the command pipeline
   */
  use(middleware: CommandMiddleware): void {
    this.middleware.push(middleware)
  }

  /**
   * Send a command for execution
   */
  async send<TCommand extends Command>(
    command: TCommand,
    context: CommandContext
  ): Promise<Result<DomainEvent[], string>> {
    const span = this.tracer.startSpan('command_bus_send', {
      commandType: command.type,
      aggregateId: command.aggregateId,
      userId: context.userId
    })

    const startTime = Date.now()

    try {
      // Validate command structure
      const validationResult = this.validateCommandStructure(command)
      if (!validationResult.success) {
        return failure(validationResult.error)
      }

      // Find handler
      const handler = this.handlers.get(command.type)
      if (!handler) {
        const error = `No handler registered for command type: ${command.type}`
        this.emit('commandFailed', { command, error, context })
        return failure(error)
      }

      // Create execution chain with middleware
      const executeCommand = this.buildExecutionChain(command, context, handler)

      // Execute with timeout
      const result = await Promise.race([
        executeCommand(),
        this.createTimeoutPromise()
      ])

      // Record metrics
      if (this.options.enableMetrics) {
        const duration = Date.now() - startTime
        this.metrics.recordCommandExecution(
          command.type,
          result.success ? 'success' : 'failure',
          duration
        )
      }

      // Emit events
      if (result.success) {
        this.emit('commandSucceeded', { command, events: result.data, context })
        
        // Store events in event store
        if (result.data.length > 0) {
          await this.eventStore.appendToStream(
            command.aggregateId,
            this.extractAggregateType(command.type),
            result.data.map(event => ({
              eventType: event.eventType,
              eventVersion: event.eventVersion,
              aggregateVersion: event.aggregateVersion,
              userId: command.userId,
              metadata: event.metadata,
              payload: event.payload
            }))
          )
        }
      } else {
        this.emit('commandFailed', { command, error: result.error, context })
      }

      return result

    } catch (error) {
      span.recordError(error as Error)
      const errorMessage = `Command execution failed: ${(error as Error).message}`
      this.emit('commandFailed', { command, error: errorMessage, context })
      return failure(errorMessage)
    } finally {
      span.end()
    }
  }

  /**
   * Send command with automatic retry
   */
  async sendWithRetry<TCommand extends Command>(
    command: TCommand,
    context: CommandContext
  ): Promise<Result<DomainEvent[], string>> {
    let lastError = ''
    
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      const result = await this.send(command, context)
      
      if (result.success) {
        return result
      }

      lastError = result.error
      
      if (attempt < this.options.maxRetries) {
        await this.delay(this.options.retryDelay * attempt)
        this.emit('commandRetrying', { command, attempt, error: lastError, context })
      }
    }

    return failure(`Command failed after ${this.options.maxRetries} attempts: ${lastError}`)
  }

  /**
   * Create command from template
   */
  createCommand<T extends Record<string, any>>(
    type: string,
    aggregateId: string,
    payload: T,
    options: {
      userId?: string
      version?: number
      metadata?: Record<string, any>
    } = {}
  ): Command {
    return {
      id: nanoid(),
      type,
      aggregateId,
      userId: options.userId,
      timestamp: new Date().toISOString(),
      version: options.version || 1,
      metadata: options.metadata || {},
      payload
    }
  }

  /**
   * Get registered command types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * Check if handler is registered for command type
   */
  hasHandler(commandType: string): boolean {
    return this.handlers.has(commandType)
  }

  /**
   * Get command execution statistics
   */
  getStatistics(): {
    handlersCount: number
    middlewareCount: number
    registeredTypes: string[]
  } {
    return {
      handlersCount: this.handlers.size,
      middlewareCount: this.middleware.length,
      registeredTypes: this.getRegisteredTypes()
    }
  }

  /**
   * Private helper methods
   */
  private validateCommandStructure(command: Command): Result<void, string> {
    const CommandSchema = z.object({
      id: z.string(),
      type: z.string(),
      aggregateId: z.string(),
      userId: z.string().optional(),
      timestamp: z.string(),
      version: z.number().positive(),
      metadata: z.record(z.any()),
      payload: z.record(z.any())
    })

    try {
      CommandSchema.parse(command)
      return success(undefined)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return failure(`Command validation failed: ${error.errors.map(e => e.message).join(', ')}`)
      }
      return failure(`Command validation failed: ${(error as Error).message}`)
    }
  }

  private getHandlerTypes(handler: CommandHandler): string[] {
    // In a real implementation, this could use reflection or decorators
    // For now, we'll assume handlers implement a method to return their types
    if ('getSupportedTypes' in handler && typeof handler.getSupportedTypes === 'function') {
      return (handler as any).getSupportedTypes()
    }
    
    // Fallback: extract from class name or manually specified
    return []
  }

  private buildExecutionChain(
    command: Command,
    context: CommandContext,
    handler: CommandHandler
  ): () => Promise<Result<DomainEvent[], string>> {
    // Build middleware chain
    const middlewareChain = [...this.middleware].reverse()
    
    const executeHandler = async (): Promise<Result<DomainEvent[], string>> => {
      // Command-specific validation
      if (handler.validateCommand) {
        const validationResult = handler.validateCommand(command)
        if (!validationResult.success) {
          return validationResult
        }
      }

      // Authorization check
      if (handler.authorize) {
        const authResult = await handler.authorize(command, context)
        if (!authResult.success) {
          return authResult
        }
      }

      // Execute handler
      return handler.handle(command, context)
    }

    // Build execution chain with middleware
    return middlewareChain.reduce(
      (next, middleware) => () => middleware.execute(command, context, next),
      executeHandler
    )
  }

  private async createTimeoutPromise(): Promise<Result<DomainEvent[], string>> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Command execution timed out after ${this.options.timeout}ms`))
      }, this.options.timeout)
    })
  }

  private extractAggregateType(commandType: string): string {
    // Extract aggregate type from command type (e.g., 'CreateAsset' -> 'Asset')
    const match = commandType.match(/^(Create|Update|Delete|Archive)(.+)$/)
    return match ? match[2] : 'Unknown'
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Abstract base command handler
 */
export abstract class BaseCommandHandler<TCommand extends Command = Command> 
  implements CommandHandler<TCommand> {
  
  abstract handle(command: TCommand, context: CommandContext): Promise<Result<DomainEvent[], string>>
  abstract canHandle(commandType: string): boolean
  abstract getSupportedTypes(): string[]

  /**
   * Default validation - can be overridden
   */
  validateCommand(command: TCommand): Result<void, string> {
    return success(undefined)
  }

  /**
   * Default authorization - can be overridden
   */
  async authorize(command: TCommand, context: CommandContext): Promise<Result<void, string>> {
    return success(undefined)
  }

  /**
   * Helper to create domain events
   */
  protected createDomainEvent(
    eventType: string,
    payload: Record<string, any>,
    options: {
      eventVersion?: number
      aggregateVersion?: number
      metadata?: Record<string, any>
    } = {}
  ): DomainEvent {
    return {
      id: nanoid(),
      streamId: '', // Will be set by event store
      streamType: '', // Will be set by event store
      eventType,
      eventVersion: options.eventVersion || 1,
      aggregateVersion: options.aggregateVersion || 1,
      timestamp: new Date().toISOString(),
      metadata: options.metadata || {},
      payload
    }
  }
}

/**
 * Built-in middleware implementations
 */

// Logging middleware
export class LoggingMiddleware implements CommandMiddleware {
  async execute(
    command: Command,
    context: CommandContext,
    next: () => Promise<Result<DomainEvent[], string>>
  ): Promise<Result<DomainEvent[], string>> {
    console.log(`Executing command: ${command.type} for aggregate: ${command.aggregateId}`)
    
    const result = await next()
    
    if (result.success) {
      console.log(`Command ${command.type} succeeded with ${result.data.length} events`)
    } else {
      console.error(`Command ${command.type} failed: ${result.error}`)
    }
    
    return result
  }
}

// Metrics middleware
export class MetricsMiddleware implements CommandMiddleware {
  constructor(private metrics: MetricsCollector) {}

  async execute(
    command: Command,
    context: CommandContext,
    next: () => Promise<Result<DomainEvent[], string>>
  ): Promise<Result<DomainEvent[], string>> {
    const startTime = Date.now()
    
    try {
      const result = await next()
      const duration = Date.now() - startTime
      
      this.metrics.recordCommandExecution(
        command.type,
        result.success ? 'success' : 'failure',
        duration
      )
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.metrics.recordCommandExecution(command.type, 'error', duration)
      throw error
    }
  }
}

// Validation middleware
export class ValidationMiddleware implements CommandMiddleware {
  constructor(private schemas: Map<string, z.ZodSchema>) {}

  async execute(
    command: Command,
    context: CommandContext,
    next: () => Promise<Result<DomainEvent[], string>>
  ): Promise<Result<DomainEvent[], string>> {
    const schema = this.schemas.get(command.type)
    
    if (schema) {
      try {
        schema.parse(command.payload)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return failure(`Command validation failed: ${error.errors.map(e => e.message).join(', ')}`)
        }
        return failure(`Command validation failed: ${(error as Error).message}`)
      }
    }
    
    return next()
  }

  addSchema(commandType: string, schema: z.ZodSchema): void {
    this.schemas.set(commandType, schema)
  }
}

// Authorization middleware
export class AuthorizationMiddleware implements CommandMiddleware {
  constructor(
    private authRules: Map<string, (command: Command, context: CommandContext) => boolean>
  ) {}

  async execute(
    command: Command,
    context: CommandContext,
    next: () => Promise<Result<DomainEvent[], string>>
  ): Promise<Result<DomainEvent[], string>> {
    const authRule = this.authRules.get(command.type)
    
    if (authRule && !authRule(command, context)) {
      return failure(`Unauthorized to execute command: ${command.type}`)
    }
    
    return next()
  }

  addAuthRule(
    commandType: string,
    rule: (command: Command, context: CommandContext) => boolean
  ): void {
    this.authRules.set(commandType, rule)
  }
}