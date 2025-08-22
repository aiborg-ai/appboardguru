/**
 * Runtime Type Validation Tests
 * Tests for Zod schemas, validation decorators, and validation utilities
 */

import {
  UserBaseSchema,
  UserCreateSchema,
  UserUpdateSchema,
  OrganizationBaseSchema,
  OrganizationCreateSchema,
  OrganizationUpdateSchema,
  VaultBaseSchema,
  VaultCreateSchema,
  VaultUpdateSchema,
  AssetBaseSchema,
  AssetCreateSchema,
  AssetUpdateSchema,
  TimestampSchema,
  EmailSchema,
  UrlSchema,
  SlugSchema,
  PhoneSchema,
  Validate,
  ValidateInput,
  ValidateOutput,
  validateWithSchema,
  validatePartialWithSchema,
  validateAsync,
  validateBatch,
  SchemaRegistry,
  defaultSchemaRegistry,
  createValidationMiddleware,
  type ValidationResult,
  type ValidationOptions
} from '../validation'

import { Ok, Err, Result, AppError } from '../../result'
import { z } from 'zod'

describe('Runtime Type Validation', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000'
  const validTimestamp = '2023-12-01T10:00:00.000Z'
  const validEmail = 'test@example.com'
  const validUrl = 'https://example.com'
  const validSlug = 'valid-slug-123'
  const validPhone = '+1234567890'

  describe('Basic Schemas', () => {
    describe('TimestampSchema', () => {
      it('should validate ISO timestamp strings', () => {
        const result = TimestampSchema.safeParse(validTimestamp)
        expect(result.success).toBe(true)
      })

      it('should reject invalid timestamps', () => {
        const result = TimestampSchema.safeParse('invalid-timestamp')
        expect(result.success).toBe(false)
      })
    })

    describe('EmailSchema', () => {
      it('should validate email addresses', () => {
        const result = EmailSchema.safeParse(validEmail)
        expect(result.success).toBe(true)
      })

      it('should reject invalid emails', () => {
        const result = EmailSchema.safeParse('not-an-email')
        expect(result.success).toBe(false)
      })
    })

    describe('UrlSchema', () => {
      it('should validate URLs', () => {
        const result = UrlSchema.safeParse(validUrl)
        expect(result.success).toBe(true)
      })

      it('should reject invalid URLs', () => {
        const result = UrlSchema.safeParse('not-a-url')
        expect(result.success).toBe(false)
      })
    })

    describe('SlugSchema', () => {
      it('should validate slugs', () => {
        const result = SlugSchema.safeParse(validSlug)
        expect(result.success).toBe(true)
      })

      it('should reject invalid slugs', () => {
        const result = SlugSchema.safeParse('Invalid Slug!')
        expect(result.success).toBe(false)
      })
    })

    describe('PhoneSchema', () => {
      it('should validate phone numbers', () => {
        const result = PhoneSchema.safeParse(validPhone)
        expect(result.success).toBe(true)
      })

      it('should reject invalid phone numbers', () => {
        const result = PhoneSchema.safeParse('123')
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Domain Entity Schemas', () => {
    const validUser = {
      id: validUUID,
      email: validEmail,
      full_name: 'John Doe',
      avatar_url: validUrl,
      created_at: validTimestamp,
      updated_at: validTimestamp
    }

    const validOrganization = {
      id: validUUID,
      name: 'Test Organization',
      slug: validSlug,
      description: 'Test description',
      website: validUrl,
      created_at: validTimestamp
    }

    describe('UserBaseSchema', () => {
      it('should validate complete user data', () => {
        const result = UserBaseSchema.safeParse(validUser)
        expect(result.success).toBe(true)
      })

      it('should reject user with missing required fields', () => {
        const invalidUser = { ...validUser }
        delete invalidUser.email

        const result = UserBaseSchema.safeParse(invalidUser)
        expect(result.success).toBe(false)
      })

      it('should reject user with invalid email', () => {
        const invalidUser = { ...validUser, email: 'invalid-email' }

        const result = UserBaseSchema.safeParse(invalidUser)
        expect(result.success).toBe(false)
      })
    })

    describe('UserCreateSchema', () => {
      it('should validate user creation data', () => {
        const createData = {
          email: validEmail,
          full_name: 'Jane Doe',
          avatar_url: validUrl
        }

        const result = UserCreateSchema.safeParse(createData)
        expect(result.success).toBe(true)
      })

      it('should allow optional fields to be missing', () => {
        const minimalData = {
          email: validEmail,
          full_name: 'Minimal User'
        }

        const result = UserCreateSchema.safeParse(minimalData)
        expect(result.success).toBe(true)
      })
    })

    describe('UserUpdateSchema', () => {
      it('should validate user update data', () => {
        const updateData = {
          full_name: 'Updated Name',
          avatar_url: validUrl
        }

        const result = UserUpdateSchema.safeParse(updateData)
        expect(result.success).toBe(true)
      })

      it('should allow empty updates', () => {
        const result = UserUpdateSchema.safeParse({})
        expect(result.success).toBe(true)
      })
    })

    describe('OrganizationBaseSchema', () => {
      it('should validate complete organization data', () => {
        const result = OrganizationBaseSchema.safeParse(validOrganization)
        expect(result.success).toBe(true)
      })

      it('should reject organization with invalid slug', () => {
        const invalidOrg = { ...validOrganization, slug: 'Invalid Slug!' }
        const result = OrganizationBaseSchema.safeParse(invalidOrg)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Validation Utilities', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
      email: z.string().email()
    })

    describe('validateWithSchema', () => {
      it('should return Ok for valid data', () => {
        const validData = {
          name: 'John',
          age: 30,
          email: validEmail
        }

        const result = validateWithSchema(validData, testSchema)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(validData)
        }
      })

      it('should return Err for invalid data', () => {
        const invalidData = {
          name: '',
          age: -5,
          email: 'invalid'
        }

        const result = validateWithSchema(invalidData, testSchema)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR')
          expect(result.error.details.issues).toBeDefined()
        }
      })
    })

    describe('validatePartialWithSchema', () => {
      it('should validate partial data', () => {
        const partialData = { name: 'John' }

        const result = validatePartialWithSchema(partialData, testSchema)
        expect(result.success).toBe(true)
      })

      it('should reject invalid partial data', () => {
        const partialData = { age: -5 }

        const result = validatePartialWithSchema(partialData, testSchema)
        expect(result.success).toBe(false)
      })
    })

    describe('validateAsync', () => {
      const asyncSchema = z.object({
        name: z.string().refine(async (name) => {
          // Simulate async validation (e.g., checking uniqueness)
          await new Promise(resolve => setTimeout(resolve, 10))
          return name !== 'taken'
        }, 'Name is already taken')
      })

      it('should validate async schemas', async () => {
        const result = await validateAsync({ name: 'available' }, asyncSchema)
        expect(result.success).toBe(true)
      })

      it('should handle async validation failures', async () => {
        const result = await validateAsync({ name: 'taken' }, asyncSchema)
        expect(result.success).toBe(false)
      })
    })

    describe('validateBatch', () => {
      it('should validate all items successfully', () => {
        const items = [
          { name: 'John', age: 30, email: 'john@example.com' },
          { name: 'Jane', age: 25, email: 'jane@example.com' }
        ]

        const result = validateBatch(items, testSchema)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toHaveLength(2)
        }
      })

      it('should fail if any item is invalid', () => {
        const items = [
          { name: 'John', age: 30, email: 'john@example.com' },
          { name: '', age: -5, email: 'invalid' }
        ]

        const result = validateBatch(items, testSchema)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.details.issues).toBeDefined()
          expect(result.error.message).toContain('Batch validation failed')
        }
      })
    })
  })

  describe('Validation Decorators', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      value: z.number().positive()
    })

    class TestService {
      @ValidateInput(testSchema)
      async processData(data: any): Promise<Result<string, AppError>> {
        return Ok(`Processed: ${data.name}`)
      }

      @ValidateOutput(z.string())
      async getProcessedValue(): Promise<string> {
        return 'valid string'
      }

      @ValidateOutput(z.string())
      async getInvalidValue(): Promise<number> {
        return 123 // This should cause validation failure
      }
    }

    describe('@ValidateInput', () => {
      it('should validate input and allow valid data through', async () => {
        const service = new TestService()
        const validData = { name: 'test', value: 42 }

        const result = await service.processData(validData)
        expect(result.success).toBe(true)
      })

      it('should reject invalid input data', async () => {
        const service = new TestService()
        const invalidData = { name: '', value: -1 }

        const result = await service.processData(invalidData)
        expect(result.success).toBe(false)
      })
    })

    describe('@ValidateOutput', () => {
      it('should validate output and allow valid data through', async () => {
        const service = new TestService()
        const result = await service.getProcessedValue()
        expect(result).toBe('valid string')
      })

      it('should throw for invalid output data', async () => {
        const service = new TestService()
        await expect(service.getInvalidValue()).rejects.toThrow()
      })
    })
  })

  describe('Schema Registry', () => {
    let registry: SchemaRegistry

    beforeEach(() => {
      registry = SchemaRegistry.getInstance()
      registry.clear()
    })

    it('should register and retrieve schemas', () => {
      const schema = z.string()
      registry.register('test', schema)

      const retrieved = registry.get('test')
      expect(retrieved).toBe(schema)
    })

    it('should validate using registered schemas', () => {
      const schema = z.string().min(3)
      registry.register('stringSchema', schema)

      const validResult = registry.validate('stringSchema', 'hello')
      expect(validResult.success).toBe(true)

      const invalidResult = registry.validate('stringSchema', 'hi')
      expect(invalidResult.success).toBe(false)
    })

    it('should handle missing schemas', () => {
      const result = registry.validate('nonexistent', 'data')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain("Schema 'nonexistent' not found")
      }
    })

    it('should list registered schemas', () => {
      registry.register('schema1', z.string())
      registry.register('schema2', z.number())

      const list = registry.list()
      expect(list).toContain('schema1')
      expect(list).toContain('schema2')
      expect(list).toHaveLength(2)
    })
  })

  describe('Default Schema Registry', () => {
    it('should have pre-registered domain schemas', () => {
      const userSchema = defaultSchemaRegistry.get('User')
      expect(userSchema).toBeDefined()

      const orgSchema = defaultSchemaRegistry.get('Organization')
      expect(orgSchema).toBeDefined()

      const vaultSchema = defaultSchemaRegistry.get('Vault')
      expect(vaultSchema).toBeDefined()
    })

    it('should validate with pre-registered schemas', () => {
      const userData = {
        id: validUUID,
        email: validEmail,
        full_name: 'Test User',
        created_at: validTimestamp
      }

      const result = defaultSchemaRegistry.validate('User', userData)
      expect(result.success).toBe(true)
    })
  })

  describe('Validation Middleware', () => {
    const bodySchema = z.object({
      name: z.string(),
      email: z.string().email()
    })

    const querySchema = z.object({
      page: z.string().transform(Number).pipe(z.number().min(1))
    })

    const middleware = createValidationMiddleware({
      body: bodySchema,
      query: querySchema
    })

    it('should validate request body and query', async () => {
      const req = {
        body: { name: 'John', email: validEmail },
        query: { page: '1' },
        params: {}
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await middleware(req, res, next)

      expect(req.query.page).toBe(1) // Should be transformed to number
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should reject invalid request data', async () => {
      const req = {
        body: { name: '', email: 'invalid' },
        query: { page: '0' },
        params: {}
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      const next = jest.fn()

      await middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed'
        })
      )
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should provide detailed error information', () => {
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        age: z.number().min(0, 'Age must be positive'),
        email: z.string().email('Invalid email format')
      })

      const invalidData = {
        name: '',
        age: -5,
        email: 'not-email'
      }

      const result = validateWithSchema(invalidData, schema)
      expect(result.success).toBe(false)

      if (!result.success) {
        expect(result.error.details.issues).toBeDefined()
        const issues = result.error.details.issues

        expect(issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['name'],
              message: 'Name is required'
            }),
            expect.objectContaining({
              path: ['age'],
              message: 'Age must be positive'
            }),
            expect.objectContaining({
              path: ['email'],
              message: 'Invalid email format'
            })
          ])
        )
      }
    })
  })
})