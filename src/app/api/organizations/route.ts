import { createAPIHandler } from '@/lib/api/createAPIHandler'
import { OrganizationService } from '@/domains/organizations'
import type { 
  CreateOrganizationDTO, 
  UpdateOrganizationDTO, 
  OrganizationListFilters 
} from '@/domains/organizations'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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
  organization_size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  compliance_settings: z.record(z.string(), z.any()).optional(),
  billing_settings: z.record(z.string(), z.any()).optional()
})

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

// Helper function to create Supabase client
async function createSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        }
      }
    }
  )
}

/**
 * POST /api/organizations - Create a new organization
 */
export const POST = createAPIHandler({
  validation: { body: CreateOrganizationSchema },
  authenticate: true,
  rateLimit: { requests: 5, window: '1h' }, // 5 per hour
  featureFlag: 'USE_NEW_API_LAYER'
}, async (req) => {
  const supabase = await createSupabase()
  const organizationService = new OrganizationService(supabase)
  
  const organization = await organizationService.create(req.validatedBody!, req.user!.id)
  
  return {
    data: organization,
    message: 'Organization created successfully'
  }
})

/**
 * GET /api/organizations - List user's organizations or get single organization
 */
export const GET = createAPIHandler({
  validation: { query: OrganizationListFiltersSchema },
  authenticate: true,
  rateLimit: { requests: 30, window: '1m' }, // 30 per minute
  cache: { ttl: 300 }, // 5 minutes
  featureFlag: 'USE_NEW_API_LAYER'
}, async (req) => {
  const supabase = await createSupabase()
  const organizationService = new OrganizationService(supabase)
  
  const { searchParams } = new URL(req.url)
  const organizationId = searchParams.get('id')
  
  if (organizationId) {
    // Get single organization
    const organization = await organizationService.getById(organizationId, req.user!.id)
    
    return {
      data: organization,
      message: 'Organization retrieved successfully'
    }
  } else {
    // List user's organizations with filters
    const result = await organizationService.listForUser(req.user!.id)
    
    return {
      data: result,
      message: 'Organizations retrieved successfully'
    }
  }
})

/**
 * PUT /api/organizations - Update organization
 */
export const PUT = createAPIHandler({
  validation: { body: UpdateOrganizationSchema.extend({
    organizationId: z.string().uuid('Organization ID must be a valid UUID')
  }) },
  authenticate: true,
  rateLimit: { requests: 10, window: '1h' }, // 10 per hour
  featureFlag: 'USE_NEW_API_LAYER'
}, async (req) => {
  const supabase = await createSupabase()
  const organizationService = new OrganizationService(supabase)
  
  const { organizationId, ...updateData } = req.validatedBody!
  const organization = await organizationService.update(organizationId, updateData, req.user!.id)
  
  return {
    data: organization,
    message: 'Organization updated successfully'
  }
})

/**
 * DELETE /api/organizations - Delete organization
 */
const DeleteOrganizationSchema = z.object({
  organizationId: z.string().uuid('Organization ID must be a valid UUID'),
  immediate: z.boolean().optional()
})

export const DELETE = createAPIHandler({
  validation: { query: DeleteOrganizationSchema },
  authenticate: true,
  rateLimit: { requests: 5, window: '1h' }, // 5 per hour
  featureFlag: 'USE_NEW_API_LAYER'
}, async (req) => {
  const supabase = await createSupabase()
  const organizationService = new OrganizationService(supabase)
  
  const { searchParams } = new URL(req.url)
  const organizationId = searchParams.get('id')
  const immediate = searchParams.get('immediate') === 'true'
  
  if (!organizationId) {
    throw new Error('Organization ID is required')
  }
  
  await organizationService.delete(organizationId, req.user!.id, immediate)
  
  return {
    data: { 
      organizationId, 
      scheduledDeletion: !immediate
    },
    message: immediate ? 'Organization deleted immediately' : 'Organization scheduled for deletion'
  }
})