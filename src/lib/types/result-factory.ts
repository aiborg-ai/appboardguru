/**
 * Result Type Factories and Combinators
 * Advanced Result pattern utilities with async support, error accumulation, and functional composition
 */

import { Result, Ok, Err, AppError, AppErrorFactory } from '../repositories/result'
import { match } from 'ts-pattern'

// ==== Result Factory Types ====

export type ResultFactory<T, E = AppError> = (...args: any[]) => Result<T, E>
export type AsyncResultFactory<T, E = AppError> = (...args: any[]) => Promise<Result<T, E>>

export type ResultTransform<T, U, E = AppError> = (value: T) => Result<U, E>
export type AsyncResultTransform<T, U, E = AppError> = (value: T) => Promise<Result<U, E>>

export type ResultPredicate<T, E = AppError> = (value: T) => Result<boolean, E>
export type AsyncResultPredicate<T, E = AppError> = (value: T) => Promise<Result<boolean, E>>

// ==== Core Result Factories ====

export class ResultFactory {
  /**
   * Create a Result from a value that might throw
   */
  static fromThrowable<T>(fn: () => T): Result<T, AppError> {
    try {
      return Ok(fn())
    } catch (error) {
      return Err(AppErrorFactory.internal(
        'Function threw an error',
        error instanceof Error ? error : new Error(String(error))
      ))
    }
  }

  /**
   * Async version of fromThrowable
   */
  static async fromThrowableAsync<T>(fn: () => Promise<T>): Promise<Result<T, AppError>> {
    try {
      const result = await fn()
      return Ok(result)
    } catch (error) {
      return Err(AppErrorFactory.internal(
        'Async function threw an error',
        error instanceof Error ? error : new Error(String(error))
      ))
    }
  }

  /**
   * Create a Result from a nullable value
   */
  static fromNullable<T>(value: T | null | undefined, errorMessage = 'Value is null or undefined'): Result<T, AppError> {
    if (value === null || value === undefined) {
      return Err(AppErrorFactory.notFound('Value', errorMessage))
    }
    return Ok(value)
  }

  /**
   * Create a Result from a boolean condition
   */
  static fromCondition<T>(
    condition: boolean,
    value: T,
    error: AppError | string = 'Condition failed'
  ): Result<T, AppError> {
    if (condition) {
      return Ok(value)
    }
    const appError = typeof error === 'string' ? AppErrorFactory.validation(error) : error
    return Err(appError)
  }

  /**
   * Create a Result from a predicate function
   */
  static fromPredicate<T>(
    value: T,
    predicate: (value: T) => boolean,
    error: AppError | string = 'Predicate failed'
  ): Result<T, AppError> {
    const appError = typeof error === 'string' ? AppErrorFactory.validation(error) : error
    return predicate(value) ? Ok(value) : Err(appError)
  }

  /**
   * Create a Result that always succeeds
   */
  static succeed<T>(value: T): Result<T, never> {
    return Ok(value)
  }

  /**
   * Create a Result that always fails
   */
  static fail<E extends AppError>(error: E): Result<never, E> {
    return Err(error)
  }

  /**
   * Create a lazy Result that's evaluated when needed
   */
  static lazy<T, E extends AppError>(factory: () => Result<T, E>): () => Result<T, E> {
    let cached: Result<T, E> | null = null
    return () => {
      if (cached === null) {
        cached = factory()
      }
      return cached
    }
  }
}

// ==== Result Combinators ====

export class ResultCombinators {
  /**
   * Apply a function to the success value
   */
  static map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return result.success ? Ok(fn(result.data)) : result
  }

  /**
   * Async version of map
   */
  static async mapAsync<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Promise<U>
  ): Promise<Result<U, E>> {
    if (result.success) {
      try {
        const mapped = await fn(result.data)
        return Ok(mapped)
      } catch (error) {
        return Err(AppErrorFactory.internal(
          'Async map function failed',
          error instanceof Error ? error : new Error(String(error))
        ) as E)
      }
    }
    return result
  }

  /**
   * Apply a function to the error value
   */
  static mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    return result.success ? result : Err(fn(result.error))
  }

  /**
   * Chain Results (flatMap/bind)
   */
  static flatMap<T, U, E>(result: Result<T, E>, fn: ResultTransform<T, U, E>): Result<U, E> {
    return result.success ? fn(result.data) : result
  }

  /**
   * Async version of flatMap
   */
  static async flatMapAsync<T, U, E>(
    result: Result<T, E>,
    fn: AsyncResultTransform<T, U, E>
  ): Promise<Result<U, E>> {
    return result.success ? await fn(result.data) : result
  }

  /**
   * Filter Result values based on a predicate
   */
  static filter<T, E extends AppError>(
    result: Result<T, E>,
    predicate: (value: T) => boolean,
    error: E | string = 'Filter predicate failed'
  ): Result<T, E> {
    if (!result.success) return result
    
    const appError = typeof error === 'string' 
      ? AppErrorFactory.validation(error) as E
      : error
      
    return predicate(result.data) ? result : Err(appError)
  }

  /**
   * Async version of filter
   */
  static async filterAsync<T, E extends AppError>(
    result: Result<T, E>,
    predicate: (value: T) => Promise<boolean>,
    error: E | string = 'Async filter predicate failed'
  ): Promise<Result<T, E>> {
    if (!result.success) return result
    
    try {
      const passes = await predicate(result.data)
      const appError = typeof error === 'string' 
        ? AppErrorFactory.validation(error) as E
        : error
      return passes ? result : Err(appError)
    } catch (err) {
      return Err(AppErrorFactory.internal(
        'Filter predicate threw error',
        err instanceof Error ? err : new Error(String(err))
      ) as E)
    }
  }

  /**
   * Provide a default value for failed Results
   */
  static orElse<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.success ? result.data : defaultValue
  }

  /**
   * Provide an alternative Result for failed Results
   */
  static orElseResult<T, E>(
    result: Result<T, E>,
    alternative: Result<T, E>
  ): Result<T, E> {
    return result.success ? result : alternative
  }

  /**
   * Provide a lazy alternative Result for failed Results
   */
  static orElseLazy<T, E>(
    result: Result<T, E>,
    alternativeFn: () => Result<T, E>
  ): Result<T, E> {
    return result.success ? result : alternativeFn()
  }

  /**
   * Tap into success values without changing the Result
   */
  static tap<T, E>(result: Result<T, E>, fn: (value: T) => void): Result<T, E> {
    if (result.success) {
      fn(result.data)
    }
    return result
  }

  /**
   * Tap into error values without changing the Result
   */
  static tapError<T, E>(result: Result<T, E>, fn: (error: E) => void): Result<T, E> {
    if (!result.success) {
      fn(result.error)
    }
    return result
  }

  /**
   * Swap success and error types
   */
  static swap<T, E>(result: Result<T, E>): Result<E, T> {
    return result.success ? Err(result.data) : Ok(result.error)
  }

  /**
   * Fold a Result into a single value
   */
  static fold<T, E, U>(
    result: Result<T, E>,
    onSuccess: (value: T) => U,
    onError: (error: E) => U
  ): U {
    return result.success ? onSuccess(result.data) : onError(result.error)
  }

  /**
   * Async version of fold
   */
  static async foldAsync<T, E, U>(
    result: Result<T, E>,
    onSuccess: (value: T) => Promise<U>,
    onError: (error: E) => Promise<U>
  ): Promise<U> {
    return result.success ? await onSuccess(result.data) : await onError(result.error)
  }
}

// ==== Array Utilities ====

export class ResultArray {
  /**
   * Convert array of Results to Result of array (fail fast)
   */
  static sequence<T, E>(results: Result<T, E>[]): Result<T[], E> {
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
   * Convert array of Results to Result of array with error accumulation
   */
  static sequenceAccumulating<T>(results: Result<T, AppError>[]): Result<T[], AppError[]> {
    const values: T[] = []
    const errors: AppError[] = []
    
    for (const result of results) {
      if (result.success) {
        values.push(result.data)
      } else {
        errors.push(result.error)
      }
    }
    
    return errors.length > 0 ? Err(errors) : Ok(values)
  }

  /**
   * Apply a function to each element, collecting successes and failures
   */
  static traverse<T, U, E>(
    array: T[],
    fn: (item: T, index: number) => Result<U, E>
  ): Result<U[], E> {
    const results = array.map(fn)
    return ResultArray.sequence(results)
  }

  /**
   * Async version of traverse
   */
  static async traverseAsync<T, U, E>(
    array: T[],
    fn: (item: T, index: number) => Promise<Result<U, E>>
  ): Promise<Result<U[], E>> {
    const promises = array.map(fn)
    const results = await Promise.all(promises)
    return ResultArray.sequence(results)
  }

  /**
   * Traverse with error accumulation
   */
  static traverseAccumulating<T, U>(
    array: T[],
    fn: (item: T, index: number) => Result<U, AppError>
  ): Result<U[], AppError[]> {
    const results = array.map(fn)
    return ResultArray.sequenceAccumulating(results)
  }

  /**
   * Filter array keeping only successful Results
   */
  static filterSuccessful<T, E>(results: Result<T, E>[]): T[] {
    return results
      .filter((result): result is { success: true; data: T } => result.success)
      .map(result => result.data)
  }

  /**
   * Filter array keeping only failed Results
   */
  static filterErrors<T, E>(results: Result<T, E>[]): E[] {
    return results
      .filter((result): result is { success: false; error: E } => !result.success)
      .map(result => result.error)
  }

  /**
   * Partition array of Results into successes and failures
   */
  static partition<T, E>(results: Result<T, E>[]): { successes: T[]; failures: E[] } {
    const successes: T[] = []
    const failures: E[] = []
    
    for (const result of results) {
      if (result.success) {
        successes.push(result.data)
      } else {
        failures.push(result.error)
      }
    }
    
    return { successes, failures }
  }

  /**
   * Find the first successful Result
   */
  static findFirst<T, E>(results: Result<T, E>[]): Result<T, E[]> {
    const errors: E[] = []
    
    for (const result of results) {
      if (result.success) {
        return result
      }
      errors.push(result.error)
    }
    
    return Err(errors)
  }
}

// ==== Async Result Utilities ====

export class AsyncResult {
  /**
   * Create an async Result from a Promise
   */
  static async fromPromise<T>(
    promise: Promise<T>,
    errorMapper?: (error: unknown) => AppError
  ): Promise<Result<T, AppError>> {
    try {
      const result = await promise
      return Ok(result)
    } catch (error) {
      const appError = errorMapper 
        ? errorMapper(error)
        : AppErrorFactory.internal(
            'Promise rejected',
            error instanceof Error ? error : new Error(String(error))
          )
      return Err(appError)
    }
  }

  /**
   * Race multiple async Results, returning the first to complete
   */
  static async race<T, E>(
    results: Promise<Result<T, E>>[]
  ): Promise<Result<T, E>> {
    return await Promise.race(results)
  }

  /**
   * Wait for all async Results to complete
   */
  static async all<T, E>(
    results: Promise<Result<T, E>>[]
  ): Promise<Result<T[], E>> {
    const resolved = await Promise.all(results)
    return ResultArray.sequence(resolved)
  }

  /**
   * Wait for all async Results with error accumulation
   */
  static async allAccumulating<T>(
    results: Promise<Result<T, AppError>>[]
  ): Promise<Result<T[], AppError[]>> {
    const resolved = await Promise.all(results)
    return ResultArray.sequenceAccumulating(resolved)
  }

  /**
   * Timeout an async Result
   */
  static withTimeout<T, E>(
    result: Promise<Result<T, E>>,
    timeoutMs: number,
    timeoutError?: E
  ): Promise<Result<T, E>> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        const error = timeoutError || AppErrorFactory.internal(`Operation timed out after ${timeoutMs}ms`) as E
        resolve(Err(error))
      }, timeoutMs)

      result.then((res) => {
        clearTimeout(timeoutId)
        resolve(res)
      })
    })
  }

  /**
   * Retry an async operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<Result<T, AppError>>,
    maxRetries = 3,
    baseDelayMs = 1000
  ): Promise<Result<T, AppError>> {
    let lastError: AppError | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await operation()
      
      if (result.success) {
        return result
      }
      
      lastError = result.error
      
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    return Err(lastError || AppErrorFactory.internal('Retry operation failed'))
  }
}

// ==== Pattern Matching with ts-pattern ====

export class ResultPattern {
  /**
   * Pattern match on Result using ts-pattern
   */
  static match<T, E, R>(
    result: Result<T, E>
  ) {
    return match(result)
      .with({ success: true }, (r) => ({
        success: <U>(fn: (data: T) => U) => fn(r.data)
      }))
      .with({ success: false }, (r) => ({
        error: <U>(fn: (error: E) => U) => fn(r.error)
      }))
  }

  /**
   * Advanced pattern matching with multiple conditions
   */
  static matchAdvanced<T, E, R>(
    result: Result<T, E>
  ) {
    return {
      success: (fn: (data: T) => R) => result.success ? fn(result.data) : null,
      error: (fn: (error: E) => R) => !result.success ? fn(result.error) : null,
      when: (predicate: (result: Result<T, E>) => boolean, fn: (result: Result<T, E>) => R) =>
        predicate(result) ? fn(result) : null,
      fold: (onSuccess: (data: T) => R, onError: (error: E) => R): R =>
        result.success ? onSuccess(result.data) : onError(result.error)
    }
  }
}

// ==== Result Builders ====

export class ResultBuilder<T, E = AppError> {
  private operations: Array<(value: unknown) => Result<any, E>> = []

  static create<T, E = AppError>(): ResultBuilder<T, E> {
    return new ResultBuilder<T, E>()
  }

  map<U>(fn: (value: T) => U): ResultBuilder<U, E> {
    this.operations.push((value: T) => {
      try {
        return Ok(fn(value))
      } catch (error) {
        return Err(AppErrorFactory.internal(
          'Map function failed',
          error instanceof Error ? error : new Error(String(error))
        ) as E)
      }
    })
    return this as any
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): ResultBuilder<U, E> {
    this.operations.push(fn)
    return this as any
  }

  filter(predicate: (value: T) => boolean, error: E | string): ResultBuilder<T, E> {
    this.operations.push((value: T) => {
      const appError = typeof error === 'string' 
        ? AppErrorFactory.validation(error) as E
        : error
      return predicate(value) ? Ok(value) : Err(appError)
    })
    return this
  }

  validate(validator: (value: T) => Result<T, E>): ResultBuilder<T, E> {
    this.operations.push(validator)
    return this
  }

  build(initialValue: T): Result<T, E> {
    let current: Result<any, E> = Ok(initialValue)
    
    for (const operation of this.operations) {
      if (!current.success) break
      current = operation(current.data)
    }
    
    return current
  }
}

// ==== Export everything ====

export {
  ResultFactory,
  ResultCombinators,
  ResultArray,
  AsyncResult,
  ResultPattern,
  ResultBuilder
}

// Re-export for convenience
export type {
  ResultFactory as RF,
  ResultCombinators as RC,
  ResultArray as RA,
  AsyncResult as AR,
  ResultPattern as RP,
  ResultBuilder as RB
}

// Utility type for chaining operations
export type Chain<T, E = AppError> = {
  map: <U>(fn: (value: T) => U) => Chain<U, E>
  flatMap: <U>(fn: (value: T) => Result<U, E>) => Chain<U, E>
  filter: (predicate: (value: T) => boolean, error?: E | string) => Chain<T, E>
  fold: <U>(onSuccess: (value: T) => U, onError: (error: E) => U) => U
  build: () => Result<T, E>
}

/**
 * Create a chainable Result operations pipeline
 */
export function chain<T, E = AppError>(result: Result<T, E>): Chain<T, E> {
  const ops: Array<(value: unknown) => Result<any, E>> = []
  let current = result

  const createChain = <U>(newResult: Result<U, E>): Chain<U, E> => {
    return {
      map: <V>(fn: (value: U) => V) =>
        createChain(ResultCombinators.map(newResult, fn)),
      
      flatMap: <V>(fn: (value: U) => Result<V, E>) =>
        createChain(ResultCombinators.flatMap(newResult, fn)),
      
      filter: (predicate: (value: U) => boolean, error?: E | string) =>
        createChain(ResultCombinators.filter(newResult, predicate, error as E)),
      
      fold: <V>(onSuccess: (value: U) => V, onError: (error: E) => V): V =>
        ResultCombinators.fold(newResult, onSuccess, onError),
      
      build: () => newResult
    }
  }

  return createChain(current)
}