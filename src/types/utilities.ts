/**
 * Type utilities for handling strict TypeScript configurations
 * Provides helpers for optional properties and null safety
 */

/**
 * Makes specified properties optional while preserving exact optional property types
 */
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Makes all properties optional while preserving exact optional property types
 */
export type PartialStrict<T> = {
  [P in keyof T]?: T[P] | undefined
}

/**
 * Removes undefined from optional properties for exact optional property types
 */
export type ExactOptional<T> = {
  [P in keyof T as undefined extends T[P] ? never : P]: T[P]
} & {
  [P in keyof T as undefined extends T[P] ? P : never]?: T[P]
}

/**
 * Safely extracts non-undefined value from potentially undefined
 */
export type NonUndefined<T> = T extends undefined ? never : T

/**
 * Helper for creating objects with optional properties that satisfy exactOptionalPropertyTypes
 */
export function createOptionalObject<T>(
  obj: { [K in keyof T]: T[K] extends undefined ? T[K] | undefined : T[K] }
): T {
  const result = {} as any
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}

/**
 * Safely get property that might be undefined
 */
export function safeGet<T, K extends keyof T>(
  obj: T | undefined,
  key: K
): T[K] | undefined {
  return obj?.[key]
}

/**
 * Safely get nested property that might be undefined
 */
export function safeGetNested<T, K1 extends keyof T, K2 extends keyof T[K1]>(
  obj: T | undefined,
  key1: K1,
  key2: K2
): T[K1] extends object ? T[K1][K2] | undefined : undefined {
  return (obj?.[key1] as any)?.[key2]
}

/**
 * Type guard to check if value is not undefined
 */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

/**
 * Type guard to check if value is not null or undefined
 */
export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value != null
}

/**
 * Filter array removing undefined values
 */
export function filterDefined<T>(array: (T | undefined)[]): T[] {
  return array.filter(isDefined)
}

/**
 * Filter array removing null and undefined values
 */
export function filterNotNullish<T>(array: (T | null | undefined)[]): T[] {
  return array.filter(isNotNullish)
}

/**
 * Safely assign properties only if they are defined
 */
export function safeAssign<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target }
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      result[key as keyof T] = value
    }
  }
  return result
}

/**
 * Create a type-safe optional object builder
 */
export class OptionalObjectBuilder<T extends Record<string, unknown>> {
  private obj: Partial<T> = {}

  set<K extends keyof T>(key: K, value: T[K] | undefined): this {
    if (value !== undefined) {
      this.obj[key] = value
    }
    return this
  }

  setIf<K extends keyof T>(condition: boolean, key: K, value: T[K]): this {
    if (condition) {
      this.obj[key] = value
    }
    return this
  }

  build(): Partial<T> {
    return { ...this.obj }
  }
}

/**
 * Create an optional object builder
 */
export function createOptionalBuilder<T extends Record<string, unknown>>(): OptionalObjectBuilder<T> {
  return new OptionalObjectBuilder<T>()
}

/**
 * Result type for operations that might fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E }

/**
 * Create a successful result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data }
}

/**
 * Create a failed result
 */
export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error }
}

/**
 * Type-safe way to handle async operations with error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>
): Promise<Result<T, Error>> {
  try {
    const data = await operation()
    return success(data)
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Utility to ensure all cases of a union are handled
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`)
}

/**
 * Deep partial type that makes all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Pick only defined properties from an object
 */
export function pickDefined<T extends Record<string, unknown>>(
  obj: T
): { [K in keyof T as T[K] extends undefined ? never : K]: T[K] } {
  const result = {} as any
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}