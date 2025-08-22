/**
 * Type Utilities Tests
 * Comprehensive tests for advanced TypeScript utility types
 */

import { 
  DeepReadonly, 
  DeepPartial, 
  DeepRequired, 
  StrictOmit, 
  StrictPick,
  KeysOfType,
  StringKeys,
  RequireOnly,
  OptionalOnly,
  Replace,
  Override,
  Merge,
  Mutable,
  Paths,
  PathValue,
  Equals,
  IsNever,
  IsAny,
  UnionToTuple,
  isDefined,
  isNullish,
  filterDefined,
  assertDefined,
  createBuilder,
  assertNever,
  identity,
  compose,
  pipe,
  createTypeGuard,
  and,
  or
} from '../utilities'

// ==== Type Tests (Compile-time) ====

// Test interface for type testing
interface TestUser {
  id: number
  name: string
  email: string
  profile: {
    avatar: string
    bio: string | null
    settings: {
      theme: 'light' | 'dark'
      notifications: boolean
    }
  }
  roles: string[]
  metadata?: Record<string, unknown>
}

// DeepReadonly tests
type ReadonlyUser = DeepReadonly<TestUser>
const readonlyUser: ReadonlyUser = {
  id: 1,
  name: 'Test',
  email: 'test@example.com',
  profile: {
    avatar: 'avatar.jpg',
    bio: null,
    settings: {
      theme: 'light',
      notifications: true
    }
  },
  roles: ['user']
}

// This should cause a TypeScript error:
// readonlyUser.name = 'New Name' // Error: Cannot assign to 'name' because it is a read-only property
// readonlyUser.profile.settings.theme = 'dark' // Error: Cannot assign to 'theme' because it is a read-only property

// DeepPartial tests
type PartialUser = DeepPartial<TestUser>
const partialUser: PartialUser = {
  name: 'Partial User',
  profile: {
    settings: {
      theme: 'dark'
      // notifications is optional due to DeepPartial
    }
  }
  // All other fields are optional
}

// DeepRequired tests
type RequiredUser = DeepRequired<TestUser>
const requiredUser: RequiredUser = {
  id: 1,
  name: 'Required User',
  email: 'required@example.com',
  profile: {
    avatar: 'avatar.jpg',
    bio: 'Must have bio', // Can't be null due to DeepRequired
    settings: {
      theme: 'light',
      notifications: true
    }
  },
  roles: ['user'],
  metadata: {} // Must be present due to DeepRequired
}

// StrictOmit tests
type UserWithoutEmail = StrictOmit<TestUser, 'email'>
const userWithoutEmail: UserWithoutEmail = {
  id: 1,
  name: 'No Email',
  profile: {
    avatar: 'avatar.jpg',
    bio: null,
    settings: {
      theme: 'light',
      notifications: true
    }
  },
  roles: ['user']
}

// StrictPick tests
type UserIdAndName = StrictPick<TestUser, 'id' | 'name'>
const userIdAndName: UserIdAndName = {
  id: 1,
  name: 'Name Only'
}

// KeysOfType tests
type StringKeysOfUser = KeysOfType<TestUser, string>
// Should be: 'name' | 'email'

type StringKeysTest = StringKeys<TestUser>
// Should be: 'name' | 'email'

// RequireOnly tests
type UserWithRequiredName = RequireOnly<TestUser, 'name'>
const userWithRequiredName: UserWithRequiredName = {
  name: 'Required Name'
  // All other fields are optional
}

// OptionalOnly tests
type UserWithOptionalName = OptionalOnly<TestUser, 'name'>
const userWithOptionalName: UserWithOptionalName = {
  id: 1,
  email: 'test@example.com',
  profile: {
    avatar: 'avatar.jpg',
    bio: null,
    settings: {
      theme: 'light',
      notifications: true
    }
  },
  roles: ['user']
  // name is optional
}

// Replace tests
type UserWithStringId = Replace<TestUser, { id: string }>
const userWithStringId: UserWithStringId = {
  id: 'string-id', // Now a string instead of number
  name: 'String ID User',
  email: 'stringid@example.com',
  profile: {
    avatar: 'avatar.jpg',
    bio: null,
    settings: {
      theme: 'light',
      notifications: true
    }
  },
  roles: ['user']
}

// Override tests
type UserWithOptionalEmail = Override<TestUser, { email?: string }>
const userWithOptionalEmail: UserWithOptionalEmail = {
  id: 1,
  name: 'Optional Email',
  // email is now optional
  profile: {
    avatar: 'avatar.jpg',
    bio: null,
    settings: {
      theme: 'light',
      notifications: true
    }
  },
  roles: ['user']
}

// Merge tests
type UserWithAge = Merge<TestUser, { age: number }>
const userWithAge: UserWithAge = {
  id: 1,
  name: 'User With Age',
  email: 'age@example.com',
  age: 25, // New field from merge
  profile: {
    avatar: 'avatar.jpg',
    bio: null,
    settings: {
      theme: 'light',
      notifications: true
    }
  },
  roles: ['user']
}

// Mutable tests
const readonlyProfile = {
  readonly avatar: 'avatar.jpg',
  readonly bio: 'Bio'
} as const

type MutableProfile = Mutable<typeof readonlyProfile>
const mutableProfile: MutableProfile = {
  avatar: 'new-avatar.jpg', // Can now be modified
  bio: 'New Bio'
}

// Paths tests
type UserPaths = Paths<TestUser>
// Should include: 'id' | 'name' | 'profile' | 'profile.avatar' | 'profile.settings.theme' etc.

// PathValue tests
type UserNameType = PathValue<TestUser, 'name'> // Should be string
type UserThemeType = PathValue<TestUser, 'profile.settings.theme'> // Should be 'light' | 'dark'

// Conditional type tests
type IsStringEqualToString = Equals<string, string> // Should be true
type IsStringEqualToNumber = Equals<string, number> // Should be false

type NeverTest = IsNever<never> // Should be true
type NotNeverTest = IsNever<string> // Should be false

type AnyTest = IsAny<any> // Should be true
type NotAnyTest = IsAny<string> // Should be false

// Union to tuple tests
type UnionType = 'a' | 'b' | 'c'
type TupleFromUnion = UnionToTuple<UnionType> // Should be ['a', 'b', 'c'] (order may vary)

// ==== Runtime Tests ====

describe('Type Utilities - Runtime Functions', () => {
  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined(0)).toBe(true)
      expect(isDefined('')).toBe(true)
      expect(isDefined(false)).toBe(true)
      expect(isDefined([])).toBe(true)
      expect(isDefined({})).toBe(true)
    })

    it('should return false for null and undefined', () => {
      expect(isDefined(null)).toBe(false)
      expect(isDefined(undefined)).toBe(false)
    })
  })

  describe('isNullish', () => {
    it('should return true for null and undefined', () => {
      expect(isNullish(null)).toBe(true)
      expect(isNullish(undefined)).toBe(true)
    })

    it('should return false for defined values', () => {
      expect(isNullish(0)).toBe(false)
      expect(isNullish('')).toBe(false)
      expect(isNullish(false)).toBe(false)
    })
  })

  describe('filterDefined', () => {
    it('should filter out null and undefined values', () => {
      const input = [1, null, 2, undefined, 3, null, 4]
      const result = filterDefined(input)
      expect(result).toEqual([1, 2, 3, 4])
    })

    it('should preserve other falsy values', () => {
      const input = [0, '', false, null, undefined]
      const result = filterDefined(input)
      expect(result).toEqual([0, '', false])
    })
  })

  describe('assertDefined', () => {
    it('should not throw for defined values', () => {
      expect(() => assertDefined(0)).not.toThrow()
      expect(() => assertDefined('')).not.toThrow()
      expect(() => assertDefined(false)).not.toThrow()
    })

    it('should throw for null and undefined', () => {
      expect(() => assertDefined(null)).toThrow('Expected value to be defined')
      expect(() => assertDefined(undefined)).toThrow('Expected value to be defined')
    })

    it('should use custom error message', () => {
      expect(() => assertDefined(null, 'Custom error')).toThrow('Custom error')
    })
  })

  describe('createBuilder', () => {
    it('should create a fluent builder', () => {
      interface Product {
        name: string
        price: number
        category: string
      }

      const builder = createBuilder<Product>()
      const product = builder
        .setName('Test Product')
        .setPrice(99.99)
        .setCategory('Electronics')
        .build()

      expect(product).toEqual({
        name: 'Test Product',
        price: 99.99,
        category: 'Electronics'
      })
    })
  })

  describe('assertNever', () => {
    it('should throw with the unexpected value', () => {
      expect(() => assertNever('unexpected' as never)).toThrow('Unexpected value: unexpected')
    })
  })

  describe('identity', () => {
    it('should return the same value', () => {
      expect(identity(42)).toBe(42)
      expect(identity('hello')).toBe('hello')
      expect(identity(true)).toBe(true)
      
      const obj = { test: true }
      expect(identity(obj)).toBe(obj)
    })
  })

  describe('compose', () => {
    it('should compose two functions', () => {
      const add1 = (x: number) => x + 1
      const multiply2 = (x: number) => x * 2
      
      const composed = compose(multiply2, add1)
      expect(composed(5)).toBe(12) // (5 + 1) * 2 = 12
    })
  })

  describe('pipe', () => {
    it('should pipe value through functions', () => {
      const add1 = (x: number) => x + 1
      const multiply2 = (x: number) => x * 2
      const toString = (x: number) => x.toString()
      
      const result = pipe(5, add1, multiply2, toString)
      expect(result).toBe('12') // 5 -> 6 -> 12 -> '12'
    })

    it('should work with no functions', () => {
      const result = pipe(42)
      expect(result).toBe(42)
    })
  })

  describe('createTypeGuard', () => {
    it('should create a type guard from validation function', () => {
      const isNumber = createTypeGuard<unknown, number>((x): x is number => typeof x === 'number')
      
      expect(isNumber(42)).toBe(true)
      expect(isNumber('42')).toBe(false)
      expect(isNumber(null)).toBe(false)
    })
  })

  describe('and', () => {
    it('should combine type guards with AND logic', () => {
      const isNumber = (x: unknown): x is number => typeof x === 'number'
      const isPositive = (x: number): x is number => x > 0
      
      const isPositiveNumber = and(isNumber, isPositive)
      
      expect(isPositiveNumber(42)).toBe(true)
      expect(isPositiveNumber(-5)).toBe(false)
      expect(isPositiveNumber('42')).toBe(false)
    })
  })

  describe('or', () => {
    it('should combine type guards with OR logic', () => {
      const isString = (x: unknown): x is string => typeof x === 'string'
      const isNumber = (x: unknown): x is number => typeof x === 'number'
      
      const isStringOrNumber = or(isString, isNumber)
      
      expect(isStringOrNumber('hello')).toBe(true)
      expect(isStringOrNumber(42)).toBe(true)
      expect(isStringOrNumber(true)).toBe(false)
      expect(isStringOrNumber(null)).toBe(false)
    })
  })
})

// ==== Template Literal Type Tests ====

// These are compile-time tests to ensure template literal types work correctly
type TestKebab = 'hello-world-test'
type TestCamel = 'helloWorldTest' 
type TestSnake = 'hello_world_test'

// Test conversions - these should compile without errors
// type KebabToCamelTest = KebabToCamel<TestKebab> // Should be 'helloWorldTest'
// type CamelToKebabTest = CamelToKebab<TestCamel> // Should be 'hello-world-test'
// type SnakeToCamelTest = SnakeToCamel<TestSnake> // Should be 'helloWorldTest'
// type CamelToSnakeTest = CamelToSnake<TestCamel> // Should be 'hello_world_test'

// ==== Builder Pattern Tests ====

interface TestBuilderProduct {
  name: string
  price: number
  description?: string
  inStock: boolean
}

// This should compile and provide type-safe fluent API
const builderTest = createBuilder<TestBuilderProduct>()
  .setName('Test Product')
  .setPrice(29.99)
  .setInStock(true)
  .build()

// ==== Export for external tests ====

export {
  readonlyUser,
  partialUser,
  requiredUser,
  userWithoutEmail,
  userIdAndName,
  userWithRequiredName,
  userWithOptionalName,
  userWithStringId,
  userWithOptionalEmail,
  userWithAge,
  mutableProfile,
  builderTest
}

// Type-only exports for compile-time testing
export type {
  ReadonlyUser,
  PartialUser,
  RequiredUser,
  UserWithoutEmail,
  UserIdAndName,
  UserWithRequiredName,
  UserWithOptionalName,
  UserWithStringId,
  UserWithOptionalEmail,
  UserWithAge,
  MutableProfile,
  UserPaths,
  UserNameType,
  UserThemeType,
  IsStringEqualToString,
  IsStringEqualToNumber,
  NeverTest,
  NotNeverTest,
  AnyTest,
  NotAnyTest,
  UnionType,
  TupleFromUnion,
  TestBuilderProduct
}