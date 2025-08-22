/**
 * Result Factory and Combinators Tests
 * Tests for advanced Result pattern utilities
 */

import {
  ResultFactory,
  ResultCombinators,
  ResultArray,
  AsyncResult,
  ResultPattern,
  ResultBuilder,
  chain,
  type ResultFactory as ResultFactoryType,
  type AsyncResultFactory,
  type ResultTransform,
  type AsyncResultTransform
} from '../result-factory'

import { Ok, Err, Result, AppError, AppErrorFactory } from '../../result'

describe('Result Factory and Combinators', () => {
  describe('ResultFactory', () => {
    describe('fromThrowable', () => {
      it('should return Ok for successful functions', () => {
        const result = ResultFactory.fromThrowable(() => 'success')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('success')
        }
      })

      it('should return Err for throwing functions', () => {
        const result = ResultFactory.fromThrowable(() => {
          throw new Error('Test error')
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('INTERNAL_ERROR')
        }
      })
    })

    describe('fromThrowableAsync', () => {
      it('should return Ok for successful async functions', async () => {
        const result = await ResultFactory.fromThrowableAsync(async () => 'async success')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('async success')
        }
      })

      it('should return Err for rejecting async functions', async () => {
        const result = await ResultFactory.fromThrowableAsync(async () => {
          throw new Error('Async error')
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('INTERNAL_ERROR')
        }
      })
    })

    describe('fromNullable', () => {
      it('should return Ok for non-null values', () => {
        const result = ResultFactory.fromNullable('value')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('value')
        }
      })

      it('should return Ok for falsy but defined values', () => {
        const results = [
          ResultFactory.fromNullable(0),
          ResultFactory.fromNullable(''),
          ResultFactory.fromNullable(false)
        ]
        
        results.forEach(result => {
          expect(result.success).toBe(true)
        })
      })

      it('should return Err for null and undefined', () => {
        const nullResult = ResultFactory.fromNullable(null)
        const undefinedResult = ResultFactory.fromNullable(undefined)
        
        expect(nullResult.success).toBe(false)
        expect(undefinedResult.success).toBe(false)
      })

      it('should use custom error message', () => {
        const result = ResultFactory.fromNullable(null, 'Custom error')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.message).toBe('Custom error')
        }
      })
    })

    describe('fromCondition', () => {
      it('should return Ok when condition is true', () => {
        const result = ResultFactory.fromCondition(true, 'value')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('value')
        }
      })

      it('should return Err when condition is false', () => {
        const result = ResultFactory.fromCondition(false, 'value')
        expect(result.success).toBe(false)
      })

      it('should use custom error', () => {
        const customError = AppErrorFactory.validation('Custom condition error')
        const result = ResultFactory.fromCondition(false, 'value', customError)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBe(customError)
        }
      })
    })

    describe('fromPredicate', () => {
      const isPositive = (n: number) => n > 0

      it('should return Ok when predicate passes', () => {
        const result = ResultFactory.fromPredicate(5, isPositive)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(5)
        }
      })

      it('should return Err when predicate fails', () => {
        const result = ResultFactory.fromPredicate(-1, isPositive)
        expect(result.success).toBe(false)
      })
    })

    describe('succeed and fail', () => {
      it('should create successful Result', () => {
        const result = ResultFactory.succeed('success')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('success')
        }
      })

      it('should create failed Result', () => {
        const error = AppErrorFactory.validation('Test error')
        const result = ResultFactory.fail(error)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBe(error)
        }
      })
    })

    describe('lazy', () => {
      it('should create lazy Result that evaluates only when called', () => {
        let callCount = 0
        const lazyFactory = ResultFactory.lazy(() => {
          callCount++
          return Ok('lazy value')
        })

        expect(callCount).toBe(0) // Not called yet

        const result1 = lazyFactory()
        expect(callCount).toBe(1)
        expect(result1.success).toBe(true)

        const result2 = lazyFactory()
        expect(callCount).toBe(1) // Should be cached
        expect(result2.success).toBe(true)
      })
    })
  })

  describe('ResultCombinators', () => {
    describe('map', () => {
      it('should transform successful Result', () => {
        const result = ResultCombinators.map(Ok(5), x => x * 2)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(10)
        }
      })

      it('should pass through failed Result', () => {
        const error = AppErrorFactory.validation('Error')
        const result = ResultCombinators.map(Err(error), x => x * 2)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBe(error)
        }
      })
    })

    describe('mapAsync', () => {
      it('should transform successful Result asynchronously', async () => {
        const result = await ResultCombinators.mapAsync(Ok(5), async x => {
          await new Promise(resolve => setTimeout(resolve, 1))
          return x * 2
        })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(10)
        }
      })

      it('should handle async function errors', async () => {
        const result = await ResultCombinators.mapAsync(Ok(5), async () => {
          throw new Error('Async error')
        })
        expect(result.success).toBe(false)
      })
    })

    describe('flatMap', () => {
      it('should chain successful Results', () => {
        const result = ResultCombinators.flatMap(Ok(5), x => Ok(x * 2))
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(10)
        }
      })

      it('should propagate first error', () => {
        const error = AppErrorFactory.validation('First error')
        const result = ResultCombinators.flatMap(Err(error), x => Ok(x * 2))
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBe(error)
        }
      })

      it('should propagate second error', () => {
        const error = AppErrorFactory.validation('Second error')
        const result = ResultCombinators.flatMap(Ok(5), () => Err(error))
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBe(error)
        }
      })
    })

    describe('filter', () => {
      const isPositive = (n: number) => n > 0

      it('should keep value that passes predicate', () => {
        const result = ResultCombinators.filter(Ok(5), isPositive)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(5)
        }
      })

      it('should reject value that fails predicate', () => {
        const result = ResultCombinators.filter(Ok(-1), isPositive)
        expect(result.success).toBe(false)
      })
    })

    describe('orElse', () => {
      it('should return value for successful Result', () => {
        const result = ResultCombinators.orElse(Ok('success'), 'default')
        expect(result).toBe('success')
      })

      it('should return default for failed Result', () => {
        const error = AppErrorFactory.validation('Error')
        const result = ResultCombinators.orElse(Err(error), 'default')
        expect(result).toBe('default')
      })
    })

    describe('tap', () => {
      it('should call function on success without changing Result', () => {
        let sideEffect = ''
        const result = ResultCombinators.tap(Ok('success'), value => {
          sideEffect = value
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('success')
        }
        expect(sideEffect).toBe('success')
      })

      it('should not call function on error', () => {
        let called = false
        const error = AppErrorFactory.validation('Error')
        const result = ResultCombinators.tap(Err(error), () => {
          called = true
        })

        expect(result.success).toBe(false)
        expect(called).toBe(false)
      })
    })

    describe('fold', () => {
      it('should apply success function for Ok', () => {
        const result = ResultCombinators.fold(
          Ok(5),
          x => x * 2,
          () => 0
        )
        expect(result).toBe(10)
      })

      it('should apply error function for Err', () => {
        const error = AppErrorFactory.validation('Error')
        const result = ResultCombinators.fold(
          Err(error),
          x => x * 2,
          () => 0
        )
        expect(result).toBe(0)
      })
    })
  })

  describe('ResultArray', () => {
    describe('sequence', () => {
      it('should convert array of successful Results to Result of array', () => {
        const results = [Ok(1), Ok(2), Ok(3)]
        const sequenced = ResultArray.sequence(results)
        
        expect(sequenced.success).toBe(true)
        if (sequenced.success) {
          expect(sequenced.data).toEqual([1, 2, 3])
        }
      })

      it('should fail fast on first error', () => {
        const error = AppErrorFactory.validation('Error')
        const results = [Ok(1), Err(error), Ok(3)]
        const sequenced = ResultArray.sequence(results)
        
        expect(sequenced.success).toBe(false)
        if (!sequenced.success) {
          expect(sequenced.error).toBe(error)
        }
      })
    })

    describe('sequenceAccumulating', () => {
      it('should accumulate all errors', () => {
        const error1 = AppErrorFactory.validation('Error 1')
        const error2 = AppErrorFactory.validation('Error 2')
        const results = [Ok(1), Err(error1), Err(error2), Ok(4)]
        const sequenced = ResultArray.sequenceAccumulating(results)
        
        expect(sequenced.success).toBe(false)
        if (!sequenced.success) {
          expect(sequenced.error).toHaveLength(2)
          expect(sequenced.error).toContain(error1)
          expect(sequenced.error).toContain(error2)
        }
      })
    })

    describe('traverse', () => {
      it('should apply function to each element', () => {
        const numbers = [1, 2, 3]
        const result = ResultArray.traverse(numbers, n => Ok(n * 2))
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual([2, 4, 6])
        }
      })

      it('should fail if any transformation fails', () => {
        const numbers = [1, -2, 3]
        const result = ResultArray.traverse(numbers, n => 
          n > 0 ? Ok(n * 2) : Err(AppErrorFactory.validation('Negative number'))
        )
        
        expect(result.success).toBe(false)
      })
    })

    describe('filterSuccessful and filterErrors', () => {
      it('should separate successes and errors', () => {
        const error = AppErrorFactory.validation('Error')
        const results = [Ok(1), Err(error), Ok(3)]
        
        const successes = ResultArray.filterSuccessful(results)
        const errors = ResultArray.filterErrors(results)
        
        expect(successes).toEqual([1, 3])
        expect(errors).toEqual([error])
      })
    })

    describe('partition', () => {
      it('should partition into successes and failures', () => {
        const error = AppErrorFactory.validation('Error')
        const results = [Ok(1), Err(error), Ok(3)]
        
        const { successes, failures } = ResultArray.partition(results)
        
        expect(successes).toEqual([1, 3])
        expect(failures).toEqual([error])
      })
    })
  })

  describe('AsyncResult', () => {
    describe('fromPromise', () => {
      it('should convert successful Promise to Ok', async () => {
        const promise = Promise.resolve('success')
        const result = await AsyncResult.fromPromise(promise)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('success')
        }
      })

      it('should convert rejected Promise to Err', async () => {
        const promise = Promise.reject(new Error('Promise error'))
        const result = await AsyncResult.fromPromise(promise)
        
        expect(result.success).toBe(false)
      })

      it('should use custom error mapper', async () => {
        const promise = Promise.reject('string error')
        const result = await AsyncResult.fromPromise(
          promise,
          () => AppErrorFactory.validation('Custom error')
        )
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.message).toBe('Custom error')
        }
      })
    })

    describe('withTimeout', () => {
      it('should resolve within timeout', async () => {
        const promise = Promise.resolve(Ok('fast'))
        const result = await AsyncResult.withTimeout(promise, 100)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('fast')
        }
      })

      it('should timeout slow operations', async () => {
        const promise = new Promise<Result<string, AppError>>(resolve => {
          setTimeout(() => resolve(Ok('slow')), 200)
        })
        const result = await AsyncResult.withTimeout(promise, 50)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.message).toContain('timed out')
        }
      })
    })

    describe('retry', () => {
      it('should succeed on first attempt', async () => {
        const operation = async () => Ok('success')
        const result = await AsyncResult.retry(operation, 3)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('success')
        }
      })

      it('should retry failed operations', async () => {
        let attempts = 0
        const operation = async () => {
          attempts++
          if (attempts < 3) {
            return Err(AppErrorFactory.internal('Temporary failure'))
          }
          return Ok('success')
        }
        
        const result = await AsyncResult.retry(operation, 3, 1)
        
        expect(result.success).toBe(true)
        expect(attempts).toBe(3)
      })

      it('should fail after max retries', async () => {
        const operation = async () => Err(AppErrorFactory.internal('Always fails'))
        const result = await AsyncResult.retry(operation, 2, 1)
        
        expect(result.success).toBe(false)
      })
    })
  })

  describe('ResultBuilder', () => {
    it('should chain operations fluently', () => {
      const result = ResultBuilder
        .create<number>()
        .map(x => x * 2)
        .filter(x => x > 0, 'Must be positive')
        .map(x => x + 1)
        .build(5)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(11) // (5 * 2) + 1 = 11
      }
    })

    it('should fail at first error', () => {
      const result = ResultBuilder
        .create<number>()
        .map(x => x * 2)
        .filter(x => x < 0, 'Must be negative')
        .map(x => x + 1) // This shouldn't execute
        .build(5)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Chain utility', () => {
    it('should provide fluent chaining interface', () => {
      const result = chain(Ok(5))
        .map(x => x * 2)
        .filter(x => x > 0)
        .map(x => x.toString())
        .build()
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('10')
      }
    })

    it('should fold to final value', () => {
      const result = chain(Ok(5))
        .map(x => x * 2)
        .fold(
          x => `Success: ${x}`,
          () => 'Error occurred'
        )
      
      expect(result).toBe('Success: 10')
    })

    it('should handle errors in chain', () => {
      const error = AppErrorFactory.validation('Invalid')
      const result = chain(Err(error))
        .map(x => x * 2)
        .fold(
          x => `Success: ${x}`,
          () => 'Error occurred'
        )
      
      expect(result).toBe('Error occurred')
    })
  })

  describe('Complex Integration Tests', () => {
    it('should handle complex async workflow', async () => {
      // Simulate API calls
      const fetchUser = async (id: number): Promise<Result<{ id: number; name: string }, AppError>> => {
        if (id === 0) return Err(AppErrorFactory.notFound('User', id.toString()))
        return Ok({ id, name: `User ${id}` })
      }

      const fetchPermissions = async (userId: number): Promise<Result<string[], AppError>> => {
        return Ok(['read', 'write'])
      }

      // Chain operations
      const result = await chain(Ok(1))
        .flatMap(async id => await fetchUser(id))
        .flatMap(async user => {
          const permsResult = await fetchPermissions(user.id)
          return ResultCombinators.map(permsResult, perms => ({ user, permissions: perms }))
        })
        .build()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.user.name).toBe('User 1')
        expect(result.data.permissions).toEqual(['read', 'write'])
      }
    })

    it('should accumulate validation errors', () => {
      interface FormData {
        name: string
        email: string
        age: number
      }

      const validateName = (name: string): Result<string, AppError> =>
        name.length > 0 ? Ok(name) : Err(AppErrorFactory.validation('Name required'))

      const validateEmail = (email: string): Result<string, AppError> =>
        email.includes('@') ? Ok(email) : Err(AppErrorFactory.validation('Invalid email'))

      const validateAge = (age: number): Result<number, AppError> =>
        age >= 0 ? Ok(age) : Err(AppErrorFactory.validation('Age must be positive'))

      const validateForm = (data: FormData): Result<FormData, AppError[]> => {
        const results = [
          validateName(data.name),
          validateEmail(data.email),
          validateAge(data.age)
        ]

        return ResultArray.sequenceAccumulating(results).success
          ? Ok(data)
          : ResultArray.sequenceAccumulating(results)
      }

      const invalidData: FormData = {
        name: '',
        email: 'invalid',
        age: -1
      }

      const result = validateForm(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toHaveLength(3)
      }
    })
  })
})