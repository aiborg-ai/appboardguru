/**
 * Option Pattern Implementation
 * Handles nullable values safely
 */

import { Option } from './types'

// Option constructors
export const Some = <T>(value: T): Option<T> => ({
  some: true,
  value
})

export const None: Option<never> = {
  some: false
}

// Utility functions for working with Options
export class OptionUtils {
  /**
   * Check if option has a value
   */
  static isSome<T>(option: Option<T>): option is { some: true; value: T } {
    return option.some
  }

  /**
   * Check if option is empty
   */
  static isNone<T>(option: Option<T>): option is { some: false } {
    return !option.some
  }

  /**
   * Map over the contained value
   */
  static map<T, U>(option: Option<T>, fn: (value: T) => U): Option<U> {
    if (option.some) {
      return Some(fn(option.value))
    }
    return None
  }

  /**
   * Chain operations that return Options
   */
  static flatMap<T, U>(option: Option<T>, fn: (value: T) => Option<U>): Option<U> {
    if (option.some) {
      return fn(option.value)
    }
    return None
  }

  /**
   * Filter option based on predicate
   */
  static filter<T>(option: Option<T>, predicate: (value: T) => boolean): Option<T> {
    if (option.some && predicate(option.value)) {
      return option
    }
    return None
  }

  /**
   * Get the value or return a default
   */
  static getOrElse<T>(option: Option<T>, defaultValue: T): T {
    return option.some ? option.value : defaultValue
  }

  /**
   * Get the value or call a function to get default
   */
  static getOrElseGet<T>(option: Option<T>, fn: () => T): T {
    return option.some ? option.value : fn()
  }

  /**
   * Get the value or throw an error
   */
  static unwrap<T>(option: Option<T>): T {
    if (option.some) {
      return option.value
    }
    throw new Error('Attempted to unwrap None')
  }

  /**
   * Get the value or return null
   */
  static toNull<T>(option: Option<T>): T | null {
    return option.some ? option.value : null
  }

  /**
   * Get the value or return undefined
   */
  static toUndefined<T>(option: Option<T>): T | undefined {
    return option.some ? option.value : undefined
  }

  /**
   * Create Option from nullable value
   */
  static fromNullable<T>(value: T | null | undefined): Option<T> {
    return value != null ? Some(value) : None
  }

  /**
   * Create Option from array (first element)
   */
  static fromArray<T>(array: T[]): Option<T> {
    return array.length > 0 ? Some(array[0]) : None
  }

  /**
   * Convert Option to array
   */
  static toArray<T>(option: Option<T>): T[] {
    return option.some ? [option.value] : []
  }

  /**
   * Combine multiple Options into one containing an array
   */
  static all<T>(options: Option<T>[]): Option<T[]> {
    const values: T[] = []
    
    for (const option of options) {
      if (!option.some) {
        return None
      }
      values.push(option.value)
    }
    
    return Some(values)
  }

  /**
   * Get the first Some from a list of Options
   */
  static firstSome<T>(options: Option<T>[]): Option<T> {
    for (const option of options) {
      if (option.some) {
        return option
      }
    }
    return None
  }
}

// Pattern matching for Options
export function matchOption<T, R>(
  option: Option<T>,
  patterns: {
    some: (value: T) => R
    none: () => R
  }
): R {
  if (option.some) {
    return patterns.some(option.value)
  } else {
    return patterns.none()
  }
}

// Async pattern matching for Options
export async function matchOptionAsync<T, R>(
  option: Option<T>,
  patterns: {
    some: (value: T) => Promise<R> | R
    none: () => Promise<R> | R
  }
): Promise<R> {
  if (option.some) {
    return await patterns.some(option.value)
  } else {
    return await patterns.none()
  }
}

// Convenience exports
export { OptionUtils as Option }