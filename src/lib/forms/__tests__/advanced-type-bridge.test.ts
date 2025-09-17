/**
 * Tests for Advanced Type Bridge Solution
 */

import { transformFieldProps, createFormBridge, createFieldValueTransformer } from '../advanced-type-bridge'
import type { FieldProps } from '../lightweight-form'

describe('Advanced Type Bridge', () => {
  describe('transformFieldProps', () => {
    it('should transform field props to React-compatible types', () => {
      const mockFieldProps: FieldProps = {
        name: 'expiresIn',
        value: '72',
        onChange: jest.fn(),
        onBlur: jest.fn(),
        'aria-invalid': false
      }

      const transformed = transformFieldProps(mockFieldProps, 'expiresIn')

      expect(transformed).toHaveProperty('name', 'expiresIn')
      expect(transformed).toHaveProperty('value', '72')
      expect(typeof transformed.onChange).toBe('function')
      expect(typeof transformed.onBlur).toBe('function')
    })

    it('should convert React events to native events', () => {
      const mockOriginalHandler = jest.fn()
      const mockFieldProps: FieldProps = {
        name: 'expiresIn',
        value: '72',
        onChange: mockOriginalHandler,
        onBlur: jest.fn(),
        'aria-invalid': false
      }

      const transformed = transformFieldProps(mockFieldProps, 'expiresIn')

      // Create a mock React ChangeEvent
      const mockReactEvent = {
        target: { value: '48' },
        currentTarget: { value: '48' },
        type: 'change'
      } as React.ChangeEvent<HTMLSelectElement>

      // Call the transformed onChange handler
      transformed.onChange!(mockReactEvent)

      // Verify the original handler was called with a native Event
      expect(mockOriginalHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: '48' }),
          type: 'change'
        })
      )
    })
  })

  describe('createFieldValueTransformer', () => {
    it('should create type-safe field transformers', () => {
      const transformer = createFieldValueTransformer<string, number>(
        (value: string) => {
          const num = parseInt(value, 10)
          if (isNaN(num)) throw new Error('Invalid number')
          return num
        },
        (value: number) => String(value)
      )

      expect(transformer.transform('72')).toBe(72)
      expect(transformer.toNative(48)).toBe('48')
      expect(transformer.validate('72')).toBe(true)
      expect(transformer.validate('invalid')).toBe(false)
    })
  })

  describe('FormTypeBridge', () => {
    it('should create a form bridge with type transformations', () => {
      interface TestFormData {
        expiresIn: number
        personalMessage: string
      }

      const initialData: TestFormData = {
        expiresIn: 72,
        personalMessage: ''
      }

      const formBridge = createFormBridge(initialData, {
        fieldTransformers: {
          expiresIn: (value: unknown) => typeof value === 'string' ? parseInt(value, 10) : value
        },
        fieldValidators: {
          expiresIn: (value: unknown) => {
            const num = typeof value === 'string' ? parseInt(value, 10) : value
            return (num >= 1 && num <= 168) ? true : 'Invalid expiration time'
          }
        }
      })

      expect(formBridge).toBeDefined()
      expect(formBridge.validateField('expiresIn', 72)).toBe(true)
      expect(formBridge.validateField('expiresIn', 200)).toBe('Invalid expiration time')
    })

    it('should transform field props with enhanced type safety', () => {
      interface TestFormData {
        expiresIn: number
      }

      const formBridge = createFormBridge<TestFormData>({ expiresIn: 72 })

      const mockFieldProps: FieldProps = {
        name: 'expiresIn',
        value: '72',
        onChange: jest.fn(),
        onBlur: jest.fn()
      }

      const transformed = formBridge.transformFieldProps(mockFieldProps, 'expiresIn')

      expect(transformed).toHaveProperty('onChange')
      expect(transformed).toHaveProperty('onBlur')
      expect(typeof transformed.onChange).toBe('function')
      expect(typeof transformed.onBlur).toBe('function')
    })
  })
})

// Type-level tests (these should compile without errors)
type TestFormData = {
  expiresIn: number
  personalMessage: string
}

// Test conditional types
type TestRequired = {
  expiresIn: { required: true; type: 'number' }
  personalMessage: { required: false; type: 'string' }
}

// Test template literal types
type TestValidationKey = `validate_${'expiresIn'}`  // Should be "validate_expiresIn"
type TestTransformKey = `transform_${'personalMessage'}`  // Should be "transform_personalMessage"

// Test mapped types
type TestTransformed = {
  [K in keyof TestFormData]: TestFormData[K] extends number ? string : TestFormData[K]
}

// These type tests verify our advanced TypeScript features work correctly
const _typeTest1: TestValidationKey = 'validate_expiresIn'  // Should compile
const _typeTest2: TestTransformKey = 'transform_personalMessage'  // Should compile
const _typeTest3: TestTransformed = { expiresIn: '72', personalMessage: 'test' }  // Should compile