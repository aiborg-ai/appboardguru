/**
 * Runtime Type Validation System
 * Zod schemas, validation decorators, and automatic schema generation
 */

import { z, ZodSchema, ZodType, ZodRawShape, ZodObject, ZodError } from 'zod'
import { Result, Ok, Err, AppError, AppErrorFactory } from '../repositories/result'
import { 
  UserId, OrganizationId, VaultId, AssetId, NotificationId,
  UserIdSchema, OrganizationIdSchema, VaultIdSchema, AssetIdSchema, NotificationIdSchema,
  MeetingId, BoardId, CommitteeId, DocumentId, AnnotationId,
  MeetingIdSchema, BoardIdSchema, CommitteeIdSchema, DocumentIdSchema, AnnotationIdSchema
} from './branded'

// ==== Core Validation Types ====

export interface ValidationOptions {
  abortEarly?: boolean
  allowUnknown?: boolean
  stripUnknown?: boolean
  context?: Record<string, unknown>
}

export interface ValidationMetadata {
  path: string[]
  message: string
  code: string
  received?: any
  expected?: any
}

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: ValidationMetadata[]
  warning?: string[]
}

// ==== Domain Entity Schemas ====

export const TimestampSchema = z.string().datetime()
export const EmailSchema = z.string().email()
export const UrlSchema = z.string().url()
export const SlugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Must be lowercase letters, numbers, and hyphens only')
export const PhoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Must be a valid phone number')

// User Schemas
export const UserBaseSchema = z.object({
  id: UserIdSchema,
  email: EmailSchema,
  full_name: z.string().min(1, 'Full name is required'),
  avatar_url: z.string().url().optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema.optional(),
  last_sign_in_at: TimestampSchema.optional()
})

export const UserCreateSchema = UserBaseSchema.omit({ id: true, created_at: true, updated_at: true })
export const UserUpdateSchema = UserCreateSchema.partial().omit({ email: true })

// Organization Schemas
export const OrganizationBaseSchema = z.object({
  id: OrganizationIdSchema,
  name: z.string().min(1, 'Organization name is required'),
  slug: SlugSchema,
  description: z.string().optional(),
  industry: z.string().optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  website: UrlSchema.optional(),
  logo_url: UrlSchema.optional(),
  settings: z.record(z.any()).optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema.optional()
})

export const OrganizationCreateSchema = OrganizationBaseSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
})

export const OrganizationUpdateSchema = OrganizationCreateSchema.partial().omit({ slug: true })

// Vault Schemas
export const VaultBaseSchema = z.object({
  id: VaultIdSchema,
  organization_id: OrganizationIdSchema,
  name: z.string().min(1, 'Vault name is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'deleted']).default('active'),
  visibility: z.enum(['private', 'organization', 'public']).default('private'),
  settings: z.record(z.any()).optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema.optional(),
  created_by: UserIdSchema
})

export const VaultCreateSchema = VaultBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const VaultUpdateSchema = VaultCreateSchema.partial().omit({ organization_id: true, created_by: true })

// Asset Schemas
export const AssetBaseSchema = z.object({
  id: AssetIdSchema,
  organization_id: OrganizationIdSchema,
  vault_id: VaultIdSchema.optional(),
  name: z.string().min(1, 'Asset name is required'),
  description: z.string().optional(),
  file_path: z.string().min(1, 'File path is required'),
  file_size: z.number().positive('File size must be positive'),
  file_type: z.string().min(1, 'File type is required'),
  mime_type: z.string().min(1, 'MIME type is required'),
  checksum: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  status: z.enum(['uploading', 'active', 'processing', 'error', 'deleted']).default('uploading'),
  created_at: TimestampSchema,
  updated_at: TimestampSchema.optional(),
  created_by: UserIdSchema
})

export const AssetCreateSchema = AssetBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const AssetUpdateSchema = AssetCreateSchema.partial().omit({ 
  organization_id: true, 
  created_by: true,
  file_path: true 
})

// Meeting Schemas
export const MeetingBaseSchema = z.object({
  id: MeetingIdSchema,
  organization_id: OrganizationIdSchema,
  title: z.string().min(1, 'Meeting title is required'),
  description: z.string().optional(),
  scheduled_for: TimestampSchema,
  duration_minutes: z.number().positive().optional(),
  location: z.string().optional(),
  type: z.enum(['board', 'committee', 'general', 'emergency']),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  agenda: z.array(z.string()).optional(),
  attendees: z.array(UserIdSchema).optional(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema.optional(),
  created_by: UserIdSchema
})

export const MeetingCreateSchema = MeetingBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const MeetingUpdateSchema = MeetingCreateSchema.partial().omit({ 
  organization_id: true, 
  created_by: true 
})

// Notification Schemas
export const NotificationBaseSchema = z.object({
  id: NotificationIdSchema,
  user_id: UserIdSchema,
  organization_id: OrganizationIdSchema.optional(),
  title: z.string().min(1, 'Notification title is required'),
  message: z.string().min(1, 'Notification message is required'),
  type: z.enum(['info', 'warning', 'error', 'success']).default('info'),
  category: z.enum(['system', 'meeting', 'vault', 'asset', 'compliance', 'social']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  channels: z.array(z.enum(['email', 'sms', 'push', 'in_app'])).default(['in_app']),
  data: z.record(z.any()).optional(),
  read_at: TimestampSchema.optional(),
  created_at: TimestampSchema,
  expires_at: TimestampSchema.optional()
})

export const NotificationCreateSchema = NotificationBaseSchema.omit({
  id: true,
  created_at: true,
  read_at: true
})

export const NotificationUpdateSchema = z.object({
  read_at: TimestampSchema.optional()
})

// ==== Validation Decorator Factory ====

export function Validate<T>(schema: ZodSchema<T>, options: ValidationOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const input = args[0] // Assume first argument is the data to validate
      
      try {
        const validated = schema.parse(input)
        args[0] = validated // Replace with validated data
        return await method.apply(this, args)
      } catch (error) {
        if (error instanceof ZodError) {
          const appError = AppErrorFactory.validation(
            'Validation failed',
            {
              issues: error.issues.map(issue => ({
                path: issue.path,
                message: issue.message,
                code: issue.code,
                received: issue.received
              }))
            }
          )
          return Err(appError)
        }
        throw error
      }
    }
  }
}

// ==== Service Method Validation Decorators ====

export function ValidateInput<T>(schema: ZodSchema<T>) {
  return Validate(schema, { abortEarly: false })
}

export function ValidateOutput<T>(schema: ZodSchema<T>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args)
      
      // If it's a Result type, validate the data
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success && result.data) {
          try {
            const validated = schema.parse(result.data)
            return { ...result, data: validated }
          } catch (error) {
            if (error instanceof ZodError) {
              const appError = AppErrorFactory.internal(
                'Output validation failed',
                error,
                { issues: error.issues }
              )
              return Err(appError)
            }
          }
        }
        return result
      }
      
      // Direct validation for non-Result returns
      try {
        return schema.parse(result)
      } catch (error) {
        if (error instanceof ZodError) {
          throw new Error(`Output validation failed: ${error.message}`)
        }
        throw error
      }
    }
  }
}

// ==== Automatic Schema Generation ====

/**
 * Generate Zod schema from TypeScript interface at runtime
 * Note: This is a simplified version - in practice you'd use tools like zod-to-ts
 */
export function generateSchemaFromType<T>(
  typeDefinition: Record<string, unknown>,
  options: { optional?: string[]; required?: string[] } = {}
): ZodSchema<T> {
  const shape: ZodRawShape = {}
  
  Object.entries(typeDefinition).forEach(([key, type]) => {
    const isOptional = options.optional?.includes(key) || false
    const isRequired = options.required?.includes(key) || false
    
    let zodType: ZodType<any>
    
    switch (type) {
      case 'string':
        zodType = z.string()
        break
      case 'number':
        zodType = z.number()
        break
      case 'boolean':
        zodType = z.boolean()
        break
      case 'date':
        zodType = z.date()
        break
      case 'email':
        zodType = EmailSchema
        break
      case 'url':
        zodType = UrlSchema
        break
      default:
        zodType = z.unknown()
    }
    
    if (isOptional && !isRequired) {
      zodType = zodType.optional()
    }
    
    shape[key] = zodType
  })
  
  return z.object(shape) as ZodSchema<T>
}

// ==== Validation Middleware for API Routes ====

export interface ValidationMiddlewareConfig<TBody = any, TQuery = any, TParams = any> {
  body?: ZodSchema<TBody>
  query?: ZodSchema<TQuery>
  params?: ZodSchema<TParams>
  options?: ValidationOptions
}

export function createValidationMiddleware<TBody = any, TQuery = any, TParams = any>(
  config: ValidationMiddlewareConfig<TBody, TQuery, TParams>
) {
  return async (req: any, res: any, next: any) => {
    const errors: ValidationMetadata[] = []
    
    // Validate body
    if (config.body && req.body) {
      const bodyResult = config.body.safeParse(req.body)
      if (!bodyResult.success) {
        errors.push(...bodyResult.error.issues.map(issue => ({
          path: ['body', ...issue.path.map(String)],
          message: issue.message,
          code: issue.code,
          received: issue.received
        })))
      } else {
        req.body = bodyResult.data
      }
    }
    
    // Validate query
    if (config.query && req.query) {
      const queryResult = config.query.safeParse(req.query)
      if (!queryResult.success) {
        errors.push(...queryResult.error.issues.map(issue => ({
          path: ['query', ...issue.path.map(String)],
          message: issue.message,
          code: issue.code,
          received: issue.received
        })))
      } else {
        req.query = queryResult.data
      }
    }
    
    // Validate params
    if (config.params && req.params) {
      const paramsResult = config.params.safeParse(req.params)
      if (!paramsResult.success) {
        errors.push(...paramsResult.error.issues.map(issue => ({
          path: ['params', ...issue.path.map(String)],
          message: issue.message,
          code: issue.code,
          received: issue.received
        })))
      } else {
        req.params = paramsResult.data
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      })
    }
    
    next()
  }
}

// ==== Generic Validation Utilities ====

export function validateWithSchema<T>(
  data: unknown,
  schema: ZodSchema<T>
): Result<T, AppError> {
  try {
    const validated = schema.parse(data)
    return Ok(validated)
  } catch (error) {
    if (error instanceof ZodError) {
      const appError = AppErrorFactory.validation(
        'Schema validation failed',
        {
          issues: error.issues.map(issue => ({
            path: issue.path,
            message: issue.message,
            code: issue.code
          }))
        }
      )
      return Err(appError)
    }
    return Err(AppErrorFactory.internal('Unexpected validation error', error as Error))
  }
}

export function validatePartialWithSchema<T>(
  data: unknown,
  schema: ZodSchema<T>
): Result<Partial<T>, AppError> {
  const partialSchema = schema.deepPartial()
  return validateWithSchema(data, partialSchema)
}

export async function validateAsync<T>(
  data: unknown,
  schema: ZodSchema<T>
): Promise<Result<T, AppError>> {
  try {
    const validated = await schema.parseAsync(data)
    return Ok(validated)
  } catch (error) {
    if (error instanceof ZodError) {
      const appError = AppErrorFactory.validation(
        'Async validation failed',
        { issues: error.issues }
      )
      return Err(appError)
    }
    return Err(AppErrorFactory.internal('Unexpected async validation error', error as Error))
  }
}

// ==== Batch Validation ====

export function validateBatch<T>(
  items: unknown[],
  schema: ZodSchema<T>
): Result<T[], AppError> {
  const results: T[] = []
  const errors: ValidationMetadata[] = []
  
  items.forEach((item, index) => {
    const result = schema.safeParse(item)
    if (result.success) {
      results.push(result.data)
    } else {
      errors.push(...result.error.issues.map(issue => ({
        path: [String(index), ...issue.path.map(String)],
        message: issue.message,
        code: issue.code,
        received: issue.received
      })))
    }
  })
  
  if (errors.length > 0) {
    return Err(AppErrorFactory.validation(
      `Batch validation failed for ${errors.length} items`,
      { issues: errors }
    ))
  }
  
  return Ok(results)
}

// ==== Schema Registry ====

export class SchemaRegistry {
  private static instance: SchemaRegistry
  private schemas = new Map<string, ZodSchema<any>>()
  
  static getInstance(): SchemaRegistry {
    if (!SchemaRegistry.instance) {
      SchemaRegistry.instance = new SchemaRegistry()
    }
    return SchemaRegistry.instance
  }
  
  register<T>(name: string, schema: ZodSchema<T>): void {
    this.schemas.set(name, schema)
  }
  
  get<T>(name: string): ZodSchema<T> | undefined {
    return this.schemas.get(name)
  }
  
  validate<T>(name: string, data: unknown): Result<T, AppError> {
    const schema = this.get<T>(name)
    if (!schema) {
      return Err(AppErrorFactory.internal(`Schema '${name}' not found in registry`))
    }
    
    return validateWithSchema(data, schema)
  }
  
  list(): string[] {
    return Array.from(this.schemas.keys())
  }
  
  clear(): void {
    this.schemas.clear()
  }
}

// ==== Initialize Default Schemas ====

const registry = SchemaRegistry.getInstance()

// Register all our domain schemas
registry.register('User', UserBaseSchema)
registry.register('UserCreate', UserCreateSchema)
registry.register('UserUpdate', UserUpdateSchema)
registry.register('Organization', OrganizationBaseSchema)
registry.register('OrganizationCreate', OrganizationCreateSchema)
registry.register('OrganizationUpdate', OrganizationUpdateSchema)
registry.register('Vault', VaultBaseSchema)
registry.register('VaultCreate', VaultCreateSchema)
registry.register('VaultUpdate', VaultUpdateSchema)
registry.register('Asset', AssetBaseSchema)
registry.register('AssetCreate', AssetCreateSchema)
registry.register('AssetUpdate', AssetUpdateSchema)
registry.register('Meeting', MeetingBaseSchema)
registry.register('MeetingCreate', MeetingCreateSchema)
registry.register('MeetingUpdate', MeetingUpdateSchema)
registry.register('Notification', NotificationBaseSchema)
registry.register('NotificationCreate', NotificationCreateSchema)
registry.register('NotificationUpdate', NotificationUpdateSchema)

// Register meeting resolution and actionable schemas
try {
  const { ResolutionValidationSchemas } = require('../validation/meeting-resolution.validation')
  const { ActionableValidationSchemas } = require('../validation/meeting-actionable.validation')
  
  // Register resolution schemas
  Object.entries(ResolutionValidationSchemas).forEach(([name, schema]) => {
    registry.register(`Resolution${name.replace('Schema', '')}`, schema as any)
  })
  
  // Register actionable schemas  
  Object.entries(ActionableValidationSchemas).forEach(([name, schema]) => {
    registry.register(`Actionable${name.replace('Schema', '')}`, schema as any)
  })
} catch (error) {
  // Schemas not available during build time, will be registered at runtime
  console.warn('Meeting validation schemas not registered during build:', error)
}

export { registry as defaultSchemaRegistry }