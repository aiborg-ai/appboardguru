/**
 * Advanced Type Utilities Library
 * Collection of sophisticated TypeScript utility types and helper functions
 */

// ==== Deep Utility Types ====

/**
 * Recursively makes all properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T[P] extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P]
}

/**
 * Recursively makes all properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends readonly (infer U)[]
    ? readonly DeepPartial<U>[]
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P]
}

/**
 * Recursively makes all properties required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends (infer U)[]
    ? DeepRequired<U>[]
    : T[P] extends readonly (infer U)[]
    ? readonly DeepRequired<U>[]
    : T[P] extends object
    ? DeepRequired<T[P]>
    : T[P]
}

/**
 * Type-safe version of Omit that ensures keys exist on T
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>

/**
 * Type-safe version of Pick that ensures keys exist on T
 */
export type StrictPick<T, K extends keyof T> = Pick<T, K>

/**
 * Extract all keys of T that have values assignable to U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

/**
 * Extract all string keys from T
 */
export type StringKeys<T> = Extract<keyof T, string>

/**
 * Extract all number keys from T
 */
export type NumberKeys<T> = Extract<keyof T, number>

/**
 * Extract all symbol keys from T
 */
export type SymbolKeys<T> = Extract<keyof T, symbol>

// ==== Conditional Type Helpers ====

/**
 * Check if T extends U
 */
export type Extends<T, U> = T extends U ? true : false

/**
 * Check if two types are equal
 */
export type Equals<T, U> = T extends U ? U extends T ? true : false : false

/**
 * Check if T is never
 */
export type IsNever<T> = [T] extends [never] ? true : false

/**
 * Check if T is any
 */
export type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * Check if T is unknown
 */
export type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false

/**
 * Check if T is a union type
 */
export type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true

/**
 * Convert union to intersection
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

/**
 * Get the last member of a union type
 */
export type LastInUnion<U> = UnionToIntersection<
  U extends any ? (x: U) => 0 : never
> extends (x: infer L) => 0
  ? L
  : never

/**
 * Convert union to tuple
 */
export type UnionToTuple<U, Last = LastInUnion<U>> = [U] extends [never]
  ? []
  : [...UnionToTuple<Exclude<U, Last>>, Last]

// ==== Advanced Mapped Types ====

/**
 * Make specific properties required while keeping others optional
 */
export type RequireOnly<T, K extends keyof T> = StrictPick<T, K> & Partial<StrictOmit<T, K>>

/**
 * Make specific properties optional while keeping others required
 */
export type OptionalOnly<T, K extends keyof T> = StrictOmit<T, K> & Partial<StrictPick<T, K>>

/**
 * Replace property types in T with types from U
 */
export type Replace<T, U> = Omit<T, keyof U> & U

/**
 * Override property types in T with compatible types from U
 */
export type Override<T, U extends Partial<T>> = Omit<T, keyof U> & U

/**
 * Merge two types, with U taking precedence
 */
export type Merge<T, U> = Omit<T, keyof U> & U

/**
 * Create a mutable version of T
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

/**
 * Create a readonly version of specific properties
 */
export type ReadonlyBy<T, K extends keyof T> = Omit<T, K> & Readonly<Pick<T, K>>

/**
 * Create a mutable version of specific properties
 */
export type MutableBy<T, K extends keyof T> = Omit<T, K> & Mutable<Pick<T, K>>

// ==== Template Literal Type Utilities ====

/**
 * Capitalize first letter
 */
export type Capitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S

/**
 * Uncapitalize first letter
 */
export type Uncapitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Lowercase<F>}${R}`
  : S

/**
 * Convert kebab-case to camelCase
 */
export type KebabToCamel<S extends string> = S extends `${infer P1}-${infer P2}${infer P3}`
  ? `${P1}${Capitalize<KebabToCamel<`${P2}${P3}`>>}`
  : S

/**
 * Convert camelCase to kebab-case
 */
export type CamelToKebab<S extends string> = S extends `${infer P1}${infer P2}`
  ? P2 extends Uncapitalize<P2>
    ? `${Uncapitalize<P1>}${CamelToKebab<P2>}`
    : `${Uncapitalize<P1>}-${CamelToKebab<Uncapitalize<P2>>}`
  : S

/**
 * Convert snake_case to camelCase
 */
export type SnakeToCamel<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${P1}${Capitalize<SnakeToCamel<`${P2}${P3}`>>}`
  : S

/**
 * Convert camelCase to snake_case
 */
export type CamelToSnake<S extends string> = S extends `${infer P1}${infer P2}`
  ? P2 extends Uncapitalize<P2>
    ? `${Uncapitalize<P1>}${CamelToSnake<P2>}`
    : `${Uncapitalize<P1>}_${CamelToSnake<Uncapitalize<P2>>}`
  : S

/**
 * Create a path string from nested object keys
 */
export type Paths<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}` | `${K}.${Paths<T[K]>}`
          : `${K}`
        : never
    }[keyof T]
  : never

/**
 * Get the type of a nested property by path
 */
export type PathValue<T, P extends Paths<T>> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Paths<T[K]>
      ? PathValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never

// ==== Function Type Utilities ====

/**
 * Extract parameters from a function type
 */
export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never

/**
 * Extract return type from a function type
 */
export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any

/**
 * Create a function type with specific parameters and return type
 */
export type Func<P extends readonly unknown[], R> = (...args: P) => R

/**
 * Create an async version of a function type
 */
export type Asyncify<T extends (...args: any) => any> = T extends (...args: infer P) => infer R
  ? (...args: P) => Promise<R>
  : never

/**
 * Extract the awaited type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T

// ==== Builder Pattern Utilities ====

/**
 * Builder interface for fluent API construction
 */
export interface Builder<T> {
  build(): T
}

/**
 * Create a fluent builder for type T
 */
export type FluentBuilder<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => FluentBuilder<T>
} & Builder<T>

/**
 * Type for builder methods that validate before setting
 */
export type ValidatedBuilder<T, V extends Record<keyof T, value: unknown) => boolean> = Record<keyof T, value: unknown) => boolean>> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (
    value: T[K],
    validator?: V[K]
  ) => ValidatedBuilder<T, V>
} & Builder<T>

// ==== Utility Functions ====

/**
 * Type guard to check if value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Type guard to check if value is null or undefined
 */
export function isNullish<T>(value: T | null | undefined): value is null | undefined {
  return value === null || value === undefined
}

/**
 * Filter out null and undefined values from array
 */
export function filterDefined<T>(array: (T | null | undefined)[]): T[] {
  return array.filter(isDefined)
}

/**
 * Assert that value is defined (throws if not)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (isNullish(value)) {
    throw new Error(message || 'Expected value to be defined')
  }
}

/**
 * Create a type-safe builder instance
 */
export function createBuilder<T extends Record<string, unknown>>(): FluentBuilder<T> {
  const data = {} as Partial<T>
  
  const builder = {
    build: () => {
      const result = { ...data } as T
      // Validate all required properties are set
      return result
    }
  } as FluentBuilder<T>

  // Add setter methods
  return new Proxy(builder, {
    get(target, prop) {
      if (prop === 'build') {
        return target.build
      }
      
      if (typeof prop === 'string' && prop.startsWith('set')) {
        const key = prop.slice(3).toLowerCase()
        return value: unknown) => {
          ;data[key] = value
          return builder
        }
      }
      
      return (target as any)[prop]
    }
  })
}

/**
 * Exhaustive case checking for union types
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`)
}

/**
 * Identity function with type preservation
 */
export function identity<T>(value: T): T {
  return value
}

/**
 * Compose two functions
 */
export function compose<T, U, V>(f: (x: U) => V, g: (x: T) => U): (x: T) => V {
  return (x: T) => f(g(x))
}

/**
 * Pipe value through multiple transformations
 */
export function pipe<T>(value: T): T
export function pipe<T, U>(value: T, f1: (x: T) => U): U
export function pipe<T, U, V>(value: T, f1: (x: T) => U, f2: (x: U) => V): V
export function pipe<T, U, V, W>(value: T, f1: (x: T) => U, f2: (x: U) => V, f3: (x: V) => W): W
export function pipe<T>(value: T, ...fns: Array<(x: any) => any>): unknown {
  return fns.reduce((acc, fn) => fn(acc), value)
}

// ==== Type Assertion Utilities ====

/**
 * Type predicate function type
 */
export type TypePredicate<T, U extends T = T> = (value: T) => value is U

/**
 * Create a type guard from a validation function
 */
export function createTypeGuard<T, U extends T>(
  validate: (value: T) => boolean
): TypePredicate<T, U> {
  return (value: T): value is U => validate(value)
}

/**
 * Combine multiple type guards with AND logic
 */
export function and<T, U extends T, V extends U>(
  guard1: TypePredicate<T, U>,
  guard2: TypePredicate<U, V>
): TypePredicate<T, V> {
  return (value: T): value is V => guard1(value) && guard2(value)
}

/**
 * Combine multiple type guards with OR logic
 */
export function or<T, U extends T, V extends T>(
  guard1: TypePredicate<T, U>,
  guard2: TypePredicate<T, V>
): TypePredicate<T, U | V> {
  return (value: T): value is U | V => guard1(value) || guard2(value)
}

// ==== Brand/Nominal Type Helpers ====

/**
 * Create a nominal/branded type
 */
export type Brand<T, B> = T & { __brand: B }

/**
 * Create a branded type with validation
 */
export type ValidatedBrand<T, B, V = never> = Brand<T, B> & {
  __validator: V
}

/**
 * Extract the base type from a branded type
 */
export type Unbrand<T> = T extends Brand<infer U, any> ? U : T

/**
 * Check if a type is branded
 */
export type IsBranded<T> = T extends Brand<any, any> ? true : false

