/**
 * Result pattern for repository operations
 * Provides a consistent way to handle success/failure states
 */

export interface ResultSuccess<T> {
  success: true
  data: T
  metadata?: Record<string, any>
}

export interface ResultFailure {
  success: false
  error: RepositoryError
  metadata?: Record<string, any>
}

export type Result<T> = ResultSuccess<T> | ResultFailure

export class RepositoryError extends Error {
  public readonly code: string
  public readonly details?: Record<string, any>
  public readonly originalError?: unknown

  constructor(
    message: string,
    code: string = 'REPOSITORY_ERROR',
    details?: Record<string, any>,
    originalError?: unknown
  ) {
    super(message)
    this.name = 'RepositoryError'
    this.code = code
    this.details = details
    this.originalError = originalError
  }

  static fromSupabaseError(error: any, operation?: string): RepositoryError {
    const message = error.message || 'Unknown database error'
    const code = error.code || 'SUPABASE_ERROR'
    
    return new RepositoryError(
      operation ? `${operation} failed: ${message}` : message,
      code,
      {
        operation,
        hint: error.hint,
        details: error.details
      },
      error
    )
  }

  static validation(message: string, details?: Record<string, any>): RepositoryError {
    return new RepositoryError(message, 'VALIDATION_ERROR', details)
  }

  static notFound(resource: string, identifier?: string): RepositoryError {
    return new RepositoryError(
      identifier 
        ? `${resource} with identifier '${identifier}' not found`
        : `${resource} not found`,
      'NOT_FOUND',
      { resource, identifier }
    )
  }

  static unauthorized(operation: string): RepositoryError {
    return new RepositoryError(
      `Unauthorized to perform operation: ${operation}`,
      'UNAUTHORIZED',
      { operation }
    )
  }

  static forbidden(operation: string, reason?: string): RepositoryError {
    return new RepositoryError(
      reason 
        ? `Forbidden: ${operation} - ${reason}`
        : `Forbidden: ${operation}`,
      'FORBIDDEN',
      { operation, reason }
    )
  }

  static conflict(resource: string, reason: string): RepositoryError {
    return new RepositoryError(
      `Conflict with ${resource}: ${reason}`,
      'CONFLICT',
      { resource, reason }
    )
  }

  static internal(message: string, originalError?: unknown): RepositoryError {
    return new RepositoryError(
      `Internal error: ${message}`,
      'INTERNAL_ERROR',
      undefined,
      originalError
    )
  }
}

// Helper functions for creating results
export const success = <T>(data: T, metadata?: Record<string, any>): ResultSuccess<T> => ({
  success: true,
  data,
  metadata
})

export const failure = (error: RepositoryError, metadata?: Record<string, any>): ResultFailure => ({
  success: false,
  error,
  metadata
})

// Type guards
export const isSuccess = <T>(result: Result<T>): result is ResultSuccess<T> => result.success
export const isFailure = <T>(result: Result<T>): result is ResultFailure => !result.success

// Utility functions for working with results
export const mapResult = <T, U>(
  result: Result<T>, 
  mapper: (data: T) => U
): Result<U> => {
  if (isSuccess(result)) {
    try {
      return success(mapper(result.data), result.metadata)
    } catch (error) {
      return failure(
        RepositoryError.internal('Result mapping failed', error),
        result.metadata
      )
    }
  }
  return result
}

export const flatMapResult = <T, U>(
  result: Result<T>,
  mapper: (data: T) => Result<U>
): Result<U> => {
  if (isSuccess(result)) {
    return mapper(result.data)
  }
  return result
}

export const combineResults = <T extends readonly unknown[]>(
  ...results: { [K in keyof T]: Result<T[K]> }
): Result<T> => {
  const data: any[] = []
  
  for (const result of results) {
    if (isFailure(result)) {
      return result
    }
    data.push(result.data)
  }
  
  return success(data as T)
}

// Async result helpers
export const wrapAsync = async <T>(
  operation: () => Promise<T>
): Promise<Result<T>> => {
  try {
    const data = await operation()
    return success(data)
  } catch (error) {
    if (error instanceof RepositoryError) {
      return failure(error)
    }
    return failure(RepositoryError.internal('Async operation failed', error))
  }
}

export const unwrapResult = <T>(result: Result<T>): T => {
  if (isSuccess(result)) {
    return result.data
  }
  throw result.error
}

export const unwrapResultOr = <T>(result: Result<T>, defaultValue: T): T => {
  if (isSuccess(result)) {
    return result.data
  }
  return defaultValue
}