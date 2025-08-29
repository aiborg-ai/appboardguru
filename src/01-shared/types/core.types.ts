/**
 * Core Types - Shared Kernel
 * Foundation types used across all layers of the application
 */

// Result type for functional error handling
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Base entity interface
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Domain event interface
export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  occurredAt: Date;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

// Command interface for CQRS
export interface Command<T = unknown> {
  commandId: string;
  commandType: string;
  payload: T;
  timestamp: Date;
  userId?: string;
}

// Query interface for CQRS
export interface Query<T = unknown> {
  queryId: string;
  queryType: string;
  parameters: T;
  timestamp: Date;
  userId?: string;
}

// Value object base
export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}

// Pagination interface
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Repository interface
export interface Repository<T extends BaseEntity> {
  findById(id: string): Promise<Result<T | null>>;
  findAll(params?: PaginationParams): Promise<Result<PaginatedResult<T>>>;
  save(entity: T): Promise<Result<T>>;
  delete(id: string): Promise<Result<void>>;
}

// Use case interface
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput>>;
}

// Event handler interface
export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

// Command handler interface
export interface CommandHandler<T extends Command> {
  handle(command: T): Promise<Result<unknown>>;
}

// Query handler interface
export interface QueryHandler<T extends Query, R> {
  handle(query: T): Promise<Result<R>>;
}