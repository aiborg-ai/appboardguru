import { EnhancedHandlers, useServices } from '@/lib/middleware/apiHandler'
import type { 
  CreateOrganizationDTO, 
  UpdateOrganizationDTO, 
  OrganizationListFilters 
} from '@/domains/organizations'
import { z } from 'zod'

// Validation schemas
const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  logo_url: z.string().url('Logo URL must be a valid URL').optional(),
  website: z.string().url('Website must be a valid URL').optional(),
  industry: z.string().optional(),
  // Support both camelCase (from frontend) and snake_case (for database)
  organizationSize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  organization_size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  compliance_settings: z.record(z.string(), z.any()).optional(),
  billing_settings: z.record(z.string(), z.any()).optional()
}).transform((data) => ({
  ...data,
  // Map camelCase to snake_case for database consistency
  organization_size: data.organizationSize || data.organization_size,
  organizationSize: undefined // Remove camelCase version
}))

const UpdateOrganizationSchema = CreateOrganizationSchema.partial().omit({ slug: true })

const OrganizationListFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.union([
    z.enum(['active', 'inactive']),
    z.array(z.enum(['active', 'inactive']))
  ]).optional(),
  created_by: z.string().uuid().optional(),
  organization_size: z.union([
    z.enum(['startup', 'small', 'medium', 'large', 'enterprise']),
    z.array(z.enum(['startup', 'small', 'medium', 'large', 'enterprise']))
  ]).optional(),
  industry: z.string().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  updated_after: z.string().datetime().optional(),
  updated_before: z.string().datetime().optional(),
  sort_by: z.enum(['name', 'created_at', 'updated_at', 'status', 'member_count']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
})


/**
 * POST /api/organizations - Create a new organization
 */
export const POST = EnhancedHandlers.post(
  CreateOrganizationSchema,
  {
    rateLimit: { requests: 5, window: '1h' }, // 5 per hour
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const { organizationService } = useServices(req)
    
    const organization = await organizationService.create(req.validatedBody!, req.user!.id)
    
    return organization
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
    const { organizationService } = useServices(req)
    
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('id')
    
    if (organizationId) {
      // Get single organization
      return await organizationService.getById(organizationId, req.user!.id)
    } else {
      // List user's organizations with filters
      return await organizationService.listForUser(req.user!.id)
    }
  }
)

/**
 * PUT /api/organizations - Update organization
 */
const UpdateOrganizationWithIdSchema = UpdateOrganizationSchema.extend({
  organizationId: z.string().uuid('Organization ID must be a valid UUID')
})

export const PUT = EnhancedHandlers.put(
  UpdateOrganizationSchema,
  {
    rateLimit: { requests: 10, window: '1h' }, // 10 per hour
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const { organizationService } = useServices(req)
    
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('id')
    
    if (!organizationId) {
      throw new Error('Organization ID is required')
    }
    
    return await organizationService.update(organizationId, req.validatedBody!, req.user!.id)
  }
)

/**
 * DELETE /api/organizations - Delete organization
 */
export const DELETE = EnhancedHandlers.delete(
  {
    rateLimit: { requests: 5, window: '1h' }, // 5 per hour
    featureFlag: 'USE_NEW_API_LAYER'
  },
  async (req) => {
    const { organizationService } = useServices(req)
    
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('id')
    const immediate = searchParams.get('immediate') === 'true'
    
    if (!organizationId) {
      throw new Error('Organization ID is required')
    }
    
    await organizationService.delete(organizationId, req.user!.id, immediate)
    
    return { 
      organizationId, 
      scheduledDeletion: !immediate,
      message: immediate ? 'Organization deleted immediately' : 'Organization scheduled for deletion'
    }
  }
)