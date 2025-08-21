/**
 * Result Pattern Implementation
 * Functional utilities for Result<T, E> type
 */

import { Result, AppError, ErrorCode, ResultTransformer, AsyncResultTransformer } from './types'

// Result constructors
export const Ok = <T>(data: T): Result<T, never> => ({
  success: true,
  data
})

export const Err = <E>(error: E): Result<never, E> => ({
  success: false,
  error
})

// Utility functions for working with Results
export class ResultUtils {
  /**
   * Check if result is successful
   */
  static isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
    return result.success
  }

  /**
   * Check if result is an error
   */
  static isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return !result.success
  }

  /**
   * Map over the success value
   */
  static map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    if (result.success) {
      return Ok(fn(result.data))
    }
    return result
  }

  /**
   * Map over the error value
   */
  static mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    if (!result.success) {
      return Err(fn(result.error))
    }
    return result
  }

  /**
   * Chain operations that return Results
   */
  static flatMap<T, U, E>(result: Result<T, E>, fn: ResultTransformer<T, U, E>): Result<U, E> {
    if (result.success) {
      return fn(result.data)
    }
    return result
  }

  /**
   * Async version of flatMap
   */
  static async flatMapAsync<T, U, E>(
    result: Result<T, E>, 
    fn: AsyncResultTransformer<T, U, E>
  ): Promise<Result<U, E>> {
    if (result.success) {
      return await fn(result.data)
    }
    return result
  }

  /**
   * Get the value or return a default
   */
  static getOrElse<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.success ? result.data : defaultValue
  }

  /**
   * Get the value or throw the error
   */
  static unwrap<T, E>(result: Result<T, E>): T {
    if (result.success) {
      return result.data
    }
    throw result.error
  }

  /**
   * Get the error or return null
   */
  static getError<T, E>(result: Result<T, E>): E | null {
    return result.success ? null : result.error
  }

  /**
   * Convert multiple Results into a single Result with array
   */
  static all<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = []
    
    for (const result of results) {
      if (!result.success) {
        return result
      }
      values.push(result.data)
    }
    
    return Ok(values)
  }

  /**
   * Take the first successful result
   */
  static firstOk<T, E>(results: Result<T, E>[]): Result<T, E[]> {
    const errors: E[] = []
    
    for (const result of results) {
      if (result.success) {
        return result
      }
      errors.push(result.error)
    }
    
    return Err(errors)
  }

  /**
   * Convert a Promise to a Result
   */
  static async fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
    try {
      const data = await promise
      return Ok(data)
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Convert a callback-style function to Result
   */
  static fromCallback<T>(
    fn: (callback: (error: Error | null, result?: T) => void) => void
  ): Promise<Result<T, Error>> {
    return new Promise(resolve => {
      fn((error, result) => {
        if (error) {
          resolve(Err(error))
        } else {
          resolve(Ok(result as T))
        }
      })
    })
  }
}

// App-specific error creation utilities
export class AppErrorFactory {
  static create(
    code: ErrorCode,
    message: string,
    details?: any,
    cause?: Error,
    context?: Record<string, any>
  ): AppError {
    return {
      code,
      message,
      details,
      cause,
      timestamp: new Date(),
      context
    }
  }

  static validation(message: string, details?: any): AppError {
    return this.create(ErrorCode.VALIDATION_ERROR, message, details)
  }

  static notFound(resource: string, identifier?: string): AppError {
    return this.create(
      ErrorCode.NOT_FOUND,
      `${resource} not found${identifier ? `: ${identifier}` : ''}`,
      { resource, identifier }
    )
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return this.create(ErrorCode.UNAUTHORIZED, message)
  }

  static forbidden(message = 'Access denied'): AppError {
    return this.create(ErrorCode.FORBIDDEN, message)
  }

  static conflict(resource: string, message?: string): AppError {
    return this.create(
      ErrorCode.CONFLICT,
      message || `${resource} already exists`,
      { resource }
    )
  }

  static businessRule(rule: string, message?: string): AppError {
    return this.create(
      ErrorCode.BUSINESS_RULE_VIOLATION,
      message || `Business rule violation: ${rule}`,
      { rule }
    )
  }

  static database(message: string, cause?: Error, query?: string): AppError {
    return this.create(
      ErrorCode.DATABASE_ERROR,
      message,
      { query },
      cause
    )
  }

  static internal(message: string, cause?: Error, context?: Record<string, any>): AppError {
    return this.create(
      ErrorCode.INTERNAL_ERROR,
      message,
      undefined,
      cause,
      context
    )
  }
}

// Pattern matching utilities
export function match<T, E, R>(
  result: Result<T, E>,
  patterns: {
    ok: (data: T) => R
    err: (error: E) => R
  }
): R {
  if (result.success) {
    return patterns.ok(result.data)
  } else {
    return patterns.err(result.error)
  }
}

// Async pattern matching
export async function matchAsync<T, E, R>(
  result: Result<T, E>,
  patterns: {
    ok: (data: T) => Promise<R> | R
    err: (error: E) => Promise<R> | R
  }
): Promise<R> {
  if (result.success) {
    return await patterns.ok(result.data)
  } else {
    return await patterns.err(result.error)
  }
}

// Convenience exports
export { Ok, Err, ResultUtils as Result }