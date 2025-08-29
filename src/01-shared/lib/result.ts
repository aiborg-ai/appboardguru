/**
 * Result Utility - Functional Error Handling
 * Provides utilities for working with Result types
 */

import { Result } from '../types/core.types';

export class ResultUtils {
  static ok<T>(data: T): Result<T> {
    return { success: true, data };
  }

  static fail<E = Error>(error: E): Result<never, E> {
    return { success: false, error };
  }

  static combine<T>(results: Result<T>[]): Result<T[]> {
    const errors = results.filter(r => !r.success);
    
    if (errors.length > 0) {
      return {
        success: false,
        error: new Error(
          `Multiple errors occurred: ${errors.map(e => 
            (e as any).error.message
          ).join(', ')}`
        ) as any
      };
    }

    return {
      success: true,
      data: results.map(r => (r as any).data)
    };
  }

  static async fromPromise<T>(
    promise: Promise<T>,
    errorTransform?: (error: unknown) => Error
  ): Promise<Result<T>> {
    try {
      const data = await promise;
      return this.ok(data);
    } catch (error) {
      const transformedError = errorTransform 
        ? errorTransform(error)
        : error instanceof Error 
          ? error 
          : new Error(String(error));
      return this.fail(transformedError);
    }
  }

  static map<T, U>(
    result: Result<T>,
    fn: (value: T) => U
  ): Result<U> {
    if (result.success) {
      return this.ok(fn(result.data));
    }
    return result as any;
  }

  static async mapAsync<T, U>(
    result: Result<T>,
    fn: (value: T) => Promise<U>
  ): Promise<Result<U>> {
    if (result.success) {
      try {
        const data = await fn(result.data);
        return this.ok(data);
      } catch (error) {
        return this.fail(error instanceof Error ? error : new Error(String(error)));
      }
    }
    return result as any;
  }

  static flatMap<T, U>(
    result: Result<T>,
    fn: (value: T) => Result<U>
  ): Result<U> {
    if (result.success) {
      return fn(result.data);
    }
    return result as any;
  }

  static unwrapOr<T>(result: Result<T>, defaultValue: T): T {
    return result.success ? result.data : defaultValue;
  }

  static isOk<T>(result: Result<T>): result is { success: true; data: T } {
    return result.success;
  }

  static isFail<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return !result.success;
  }
}