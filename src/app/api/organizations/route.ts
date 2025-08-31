import { EnhancedHandlers, useServices } from '@/lib/middleware/apiHandler'
import type { 
  CreateOrganizationDTO, 
  UpdateOrganizationDTO, 
  OrganizationListFilters 
} from '@/domains/organizations'
import { z } from 'zod'
import { 
  ValidationError, 
  AuthorizationError,
  AuthenticationError, 
  ConflictError, 
  NotFoundError, 
  BusinessLogicError,
  RateLimitError,
  DatabaseError
} from '@/lib/errors/types'
import { globalErrorHandler } from '@/lib/errors/handler'
import { Logger } from '@/lib/logging/logger'

// Initialize logger for this module
const logger = Logger.getLogger('OrganizationsAPI')

// Enhanced validation with security and business rules
const CreateOrganizationSchema = z.object({
  name: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be at most 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.&()]+$/, 'Organization name contains invalid characters')
    .transform(name => name.trim()),
  slug: z.string()
    .min(2, 'Organization slug must be at least 2 characters')
    .max(50, 'Organization slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), {
      message: 'Slug cannot start or end with a hyphen'
    })
    .refine(slug => !slug.includes('--'), {
      message: 'Slug cannot contain consecutive hyphens'
    })
    .refine(slug => !['api', 'admin', 'www', 'app', 'help', 'support', 'blog'].includes(slug), {
      message: 'This slug is reserved and cannot be used'
    }),
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .transform(desc => desc?.trim()),
  logo_url: z.string()
    .url('Logo URL must be a valid URL')
    .refine(url => {
      try {
        const parsedUrl = new URL(url)
        return ['http:', 'https:'].includes(parsedUrl.protocol)
      } catch {
        return false
      }
    }, 'Logo URL must use HTTP or HTTPS protocol')
    .optional(),
  website: z.string()
    .url('Website must be a valid URL')
    .refine(url => {
      try {
        const parsedUrl = new URL(url)
        return ['http:', 'https:'].includes(parsedUrl.protocol)
      } catch {
        return false
      }
    }, 'Website URL must use HTTP or HTTPS protocol')
    .optional(),
  industry: z.string()
    .max(100, 'Industry must be at most 100 characters')
    .optional()
    .transform(industry => industry?.trim()),
  // Support both camelCase (from frontend) and snake_case (for database)
  organizationSize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise'], {
    errorMap: () => ({ message: 'Organization size must be one of: startup, small, medium, large, enterprise' })
  }).optional(),
  organization_size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise'], {
    errorMap: () => ({ message: 'Organization size must be one of: startup, small, medium, large, enterprise' })
  }).optional(),
  settings: z.record(z.string(), z.any())
    .refine(settings => Object.keys(settings || {}).length <= 50, {
      message: 'Too many settings keys (maximum 50 allowed)'
    })
    .optional(),
  compliance_settings: z.record(z.string(), z.any())
    .refine(settings => Object.keys(settings || {}).length <= 20, {
      message: 'Too many compliance settings keys (maximum 20 allowed)'
    })
    .optional(),
  billing_settings: z.record(z.string(), z.any())
    .refine(settings => Object.keys(settings || {}).length <= 20, {
      message: 'Too many billing settings keys (maximum 20 allowed)'
    })
    .optional()
}).transform((data) => ({
  ...data,
  // Map camelCase to snake_case for database consistency
  organization_size: data.organizationSize || data.organization_size,
  organizationSize: undefined // Remove camelCase version
})).refine(data => {
  // Business rule: Either organizationSize or organization_size must be provided if any is specified
  if (data.organizationSize || data.organization_size) {
    return data.organization_size !== undefined
  }
  return true
}, {
  message: 'Organization size must be specified',
  path: ['organization_size']
})

const UpdateOrganizationSchema = z.object({
  name: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be at most 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.&()]+$/, 'Organization name contains invalid characters')
    .transform(name => name.trim())
    .optional(),
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .transform(desc => desc?.trim())
    .optional(),
  logo_url: z.string()
    .url('Logo URL must be a valid URL')
    .refine(url => {
      try {
        const parsedUrl = new URL(url)
        return ['http:', 'https:'].includes(parsedUrl.protocol)
      } catch {
        return false
      }
    }, 'Logo URL must use HTTP or HTTPS protocol')
    .optional(),
  website: z.string()
    .url('Website must be a valid URL')
    .refine(url => {
      try {
        const parsedUrl = new URL(url)
        return ['http:', 'https:'].includes(parsedUrl.protocol)
      } catch {
        return false
      }
    }, 'Website URL must use HTTP or HTTPS protocol')
    .optional(),
  industry: z.string()
    .max(100, 'Industry must be at most 100 characters')
    .transform(industry => industry?.trim())
    .optional(),
  organizationSize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise'], {
    errorMap: () => ({ message: 'Organization size must be one of: startup, small, medium, large, enterprise' })
  }).optional(),
  organization_size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise'], {
    errorMap: () => ({ message: 'Organization size must be one of: startup, small, medium, large, enterprise' })
  }).optional(),
  settings: z.record(z.string(), z.any())
    .refine(settings => Object.keys(settings || {}).length <= 50, {
      message: 'Too many settings keys (maximum 50 allowed)'
    })
    .optional(),
  compliance_settings: z.record(z.string(), z.any())
    .refine(settings => Object.keys(settings || {}).length <= 20, {
      message: 'Too many compliance settings keys (maximum 20 allowed)'
    })
    .optional(),
  billing_settings: z.record(z.string(), z.any())
    .refine(settings => Object.keys(settings || {}).length <= 20, {
      message: 'Too many billing settings keys (maximum 20 allowed)'
    })
    .optional()
}).transform((data) => ({
  ...data,
  organization_size: data.organizationSize || data.organization_size,
  organizationSize: undefined
})).refine(data => {
  // Ensure at least one field is being updated
  const updateFields = ['name', 'description', 'logo_url', 'website', 'industry', 'organization_size', 'settings', 'compliance_settings', 'billing_settings']
  const hasUpdates = updateFields.some(field => data[field] !== undefined)
  return hasUpdates
}, {
  message: 'At least one field must be provided for update'
})

const OrganizationListFiltersSchema = z.object({
  page: z.coerce.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page cannot exceed 1000')
    .optional()
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  search: z.string()
    .max(200, 'Search query cannot exceed 200 characters')
    .transform(search => search?.trim())
    .optional(),
  status: z.union([
    z.enum(['active', 'inactive'], {
      errorMap: () => ({ message: 'Status must be active or inactive' })
    }),
    z.array(z.enum(['active', 'inactive'], {
      errorMap: () => ({ message: 'Status array must contain only active or inactive values' })
    })).max(2, 'Status array cannot contain more than 2 values')
  ]).optional(),
  created_by: z.string()
    .uuid('Created by must be a valid UUID')
    .optional(),
  organization_size: z.union([
    z.enum(['startup', 'small', 'medium', 'large', 'enterprise'], {
      errorMap: () => ({ message: 'Organization size must be one of: startup, small, medium, large, enterprise' })
    }),
    z.array(z.enum(['startup', 'small', 'medium', 'large', 'enterprise'], {
      errorMap: () => ({ message: 'Organization size array must contain valid size values' })
    })).max(5, 'Organization size array cannot contain more than 5 values')
  ]).optional(),
  industry: z.string()
    .max(100, 'Industry filter cannot exceed 100 characters')
    .transform(industry => industry?.trim())
    .optional(),
  created_after: z.string()
    .datetime('Created after must be a valid ISO datetime')
    .optional(),
  created_before: z.string()
    .datetime('Created before must be a valid ISO datetime')
    .optional(),
  updated_after: z.string()
    .datetime('Updated after must be a valid ISO datetime')
    .optional(),
  updated_before: z.string()
    .datetime('Updated before must be a valid ISO datetime')
    .optional(),
  sort_by: z.enum(['name', 'created_at', 'updated_at', 'status', 'member_count'], {
    errorMap: () => ({ message: 'Sort by must be one of: name, created_at, updated_at, status, member_count' })
  }).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc'], {
    errorMap: () => ({ message: 'Sort order must be asc or desc' })
  }).optional().default('desc')
}).refine(data => {
  // Validate date ranges
  if (data.created_after && data.created_before) {
    return new Date(data.created_after) < new Date(data.created_before)
  }
  return true
}, {
  message: 'Created after date must be before created before date',
  path: ['created_after']
}).refine(data => {
  // Validate update date ranges
  if (data.updated_after && data.updated_before) {
    return new Date(data.updated_after) < new Date(data.updated_before)
  }
  return true
}, {
  message: 'Updated after date must be before updated before date',
  path: ['updated_after']
})


// Helper function to handle service errors
function handleServiceError(error: any, operation: string, context?: Record<string, unknown>) {
  logger.error(`Service error in ${operation}:`, { error: error.message, context, stack: error.stack })
  
  // Map service errors to appropriate API errors
  if (error.message?.includes('already exists')) {
    throw ConflictError.duplicate('Organization', 'slug', context?.slug)
  }
  
  if (error.message?.includes('not found')) {
    throw new NotFoundError('Organization', context?.id as string)
  }
  
  if (error.message?.includes('permission') || error.message?.includes('access denied')) {
    throw new AuthorizationError('Insufficient permissions to perform this action', context?.userId as string)
  }
  
  if (error.message?.includes('validation')) {
    throw new ValidationError(error.message, 'general')
  }
  
  if (error.code === 'PGRST116') {
    throw new NotFoundError('Organization')
  }
  
  if (error.code === '23505') {
    const field = error.message?.includes('slug') ? 'slug' : 'name'
    throw ConflictError.duplicate('Organization', field, context?.[field])
  }
  
  if (error.code === '23503') {
    throw new ValidationError('Referenced resource not found', 'foreign_key')
  }
  
  // Database connection errors
  if (error.code === 'ECONNREFUSED' || error.message?.includes('connection')) {
    throw new DatabaseError('Database connection failed', 'connect')
  }
  
  // Generic service error
  throw new BusinessLogicError(
    `Organization ${operation} failed: ${error.message}`,
    operation,
    'organizations',
    context
  )
}

/**
 * POST /api/organizations - Create a new organization
 */
export const POST = EnhancedHandlers.post(
  CreateOrganizationSchema,
  {
    rateLimit: { requests: 5, window: '1h' }, // 5 per hour for security
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const startTime = Date.now()
    const correlationId = req.headers.get('x-correlation-id') || `org-create-${Date.now()}`
    
    try {
      logger.info('Creating organization', {
        correlationId,
        userId: req.user!.id,
        organizationName: req.validatedBody!.name,
        slug: req.validatedBody!.slug
      })
      
      const { organizationService } = useServices(req)
      
      // Additional business validation
      if (!req.user!.id) {
        throw new AuthenticationError('User authentication required')
      }
      
      // Check if user has reached organization creation limit
      const userOrganizations = await organizationService.listForUser(req.user!.id)
      const maxOrganizations = process.env['MAX_ORGANIZATIONS_PER_USER'] ? 
        parseInt(process.env['MAX_ORGANIZATIONS_PER_USER']) : 10
        
      if (userOrganizations.length >= maxOrganizations) {
        throw new BusinessLogicError(
          `You have reached the maximum limit of ${maxOrganizations} organizations`,
          'max_organizations_exceeded',
          'organizations',
          { currentCount: userOrganizations.length, maxAllowed: maxOrganizations }
        )
      }
      
      const organization = await organizationService.create(req.validatedBody!, req.user!.id)
      
      logger.info('Organization created successfully', {
        correlationId,
        organizationId: organization.id,
        userId: req.user!.id,
        duration: Date.now() - startTime
      })
      
      return {
        ...organization,
        message: 'Organization created successfully'
      }
      
    } catch (error: any) {
      handleServiceError(error, 'create', {
        correlationId,
        userId: req.user!.id,
        name: req.validatedBody!.name,
        slug: req.validatedBody!.slug,
        duration: Date.now() - startTime
      })
    }
  }
)

/**
 * GET /api/organizations - List user's organizations or get single organization
 */
export const GET = EnhancedHandlers.get(
  {
    validation: { query: OrganizationListFiltersSchema },
    rateLimit: { requests: 30, window: '1m' }, // 30 per minute
    cache: { ttl: 300 }, // 5 minutes
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const startTime = Date.now()
    const correlationId = req.headers.get('x-correlation-id') || `org-list-${Date.now()}`
    
    try {
      const { organizationService } = useServices(req)
      
      const { searchParams } = new URL(req.url)
      const organizationId = searchParams.get('id')
      
      logger.info('Fetching organizations', {
        correlationId,
        userId: req.user!.id,
        organizationId: organizationId || 'all',
        filters: req.validatedQuery
      })
      
      if (organizationId) {
        // Validate UUID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)) {
          throw new ValidationError('Invalid organization ID format', 'id', organizationId)
        }
        
        // Get single organization
        const organization = await organizationService.getById(organizationId, req.user!.id)
        
        logger.info('Organization fetched successfully', {
          correlationId,
          organizationId,
          userId: req.user!.id,
          duration: Date.now() - startTime
        })
        
        return organization
      } else {
        // Remove demo organizations for test director - use real organizations
        // List user's organizations with filters
        const organizations = await organizationService.listForUser(req.user!.id)
        
        logger.info('Organizations listed successfully', {
          correlationId,
          userId: req.user!.id,
          count: organizations.length,
          duration: Date.now() - startTime
        })
        
        return {
          organizations,
          total: organizations.length,
          message: `Found ${organizations.length} organization${organizations.length === 1 ? '' : 's'}`
        }
        
      }
      
    } catch (error: any) {
      const { searchParams } = new URL(req.url)
      const organizationId = searchParams.get('id')
      
      handleServiceError(error, 'fetch', {
        correlationId,
        userId: req.user!.id,
        organizationId,
        filters: req.validatedQuery,
        duration: Date.now() - startTime
      })
    }
  }
)

/**
 * PUT /api/organizations - Update organization
 */
export const PUT = EnhancedHandlers.put(
  UpdateOrganizationSchema,
  {
    rateLimit: { requests: 10, window: '1h' }, // 10 per hour
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const startTime = Date.now()
    const correlationId = req.headers.get('x-correlation-id') || `org-update-${Date.now()}`
    
    try {
      const { organizationService } = useServices(req)
      
      const { searchParams } = new URL(req.url)
      const organizationId = searchParams.get('id')
      
      if (!organizationId) {
        throw new ValidationError('Organization ID is required in query parameters', 'id')
      }
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)) {
        throw new ValidationError('Invalid organization ID format', 'id', organizationId)
      }
      
      logger.info('Updating organization', {
        correlationId,
        organizationId,
        userId: req.user!.id,
        updates: Object.keys(req.validatedBody || {})
      })
      
      // Check if organization exists and user has access before attempting update
      try {
        await organizationService.getById(organizationId, req.user!.id)
      } catch (error: any) {
        if (error.message?.includes('not found')) {
          throw new NotFoundError('Organization', organizationId)
        }
        if (error.message?.includes('access denied')) {
          throw new AuthorizationError(
            'You do not have permission to update this organization',
            req.user!.id,
            'organization',
            'update'
          )
        }
        throw error
      }
      
      const updatedOrganization = await organizationService.update(
        organizationId, 
        req.validatedBody!, 
        req.user!.id
      )
      
      logger.info('Organization updated successfully', {
        correlationId,
        organizationId,
        userId: req.user!.id,
        updates: Object.keys(req.validatedBody || {}),
        duration: Date.now() - startTime
      })
      
      return {
        ...updatedOrganization,
        message: 'Organization updated successfully'
      }
      
    } catch (error: any) {
      const { searchParams } = new URL(req.url)
      const organizationId = searchParams.get('id')
      
      handleServiceError(error, 'update', {
        correlationId,
        organizationId,
        userId: req.user!.id,
        updates: req.validatedBody,
        duration: Date.now() - startTime
      })
    }
  }
)

/**
 * DELETE /api/organizations - Delete organization
 */
export const DELETE = EnhancedHandlers.delete(
  {
    rateLimit: { requests: 5, window: '1h' }, // 5 per hour for security
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const startTime = Date.now()
    const correlationId = req.headers.get('x-correlation-id') || `org-delete-${Date.now()}`
    
    try {
      const { organizationService } = useServices(req)
      
      const { searchParams } = new URL(req.url)
      const organizationId = searchParams.get('id')
      const immediate = searchParams.get('immediate') === 'true'
      
      if (!organizationId) {
        throw new ValidationError('Organization ID is required in query parameters', 'id')
      }
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)) {
        throw new ValidationError('Invalid organization ID format', 'id', organizationId)
      }
      
      logger.warn('Deleting organization', {
        correlationId,
        organizationId,
        userId: req.user!.id,
        immediate
      })
      
      // Check if organization exists and user has permission before attempting delete
      try {
        const organization = await organizationService.getById(organizationId, req.user!.id)
        
        // Additional validation for immediate deletion
        if (immediate) {
          logger.warn('Immediate organization deletion requested', {
            correlationId,
            organizationId,
            userId: req.user!.id,
            organizationName: organization.name
          })
        }
      } catch (error: any) {
        if (error.message?.includes('not found')) {
          throw new NotFoundError('Organization', organizationId)
        }
        if (error.message?.includes('access denied')) {
          throw new AuthorizationError(
            'You do not have permission to delete this organization',
            req.user!.id,
            'organization',
            'delete'
          )
        }
        throw error
      }
      
      await organizationService.delete(organizationId, req.user!.id, immediate)
      
      const message = immediate ? 
        'Organization deleted immediately' : 
        'Organization scheduled for deletion in 30 days'
      
      logger.warn('Organization deletion completed', {
        correlationId,
        organizationId,
        userId: req.user!.id,
        immediate,
        duration: Date.now() - startTime
      })
      
      return { 
        organizationId, 
        scheduledDeletion: !immediate,
        immediate,
        message,
        deletedAt: immediate ? new Date().toISOString() : null,
        scheduledDeletionDate: !immediate ? 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
      }
      
    } catch (error: any) {
      const { searchParams } = new URL(req.url)
      const organizationId = searchParams.get('id')
      const immediate = searchParams.get('immediate') === 'true'
      
      handleServiceError(error, 'delete', {
        correlationId,
        organizationId,
        userId: req.user!.id,
        immediate,
        duration: Date.now() - startTime
      })
    }
  }
)