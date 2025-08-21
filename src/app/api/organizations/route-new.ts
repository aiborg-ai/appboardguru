/**
 * Organizations API Route (Refactored)
 * Example implementation using the new unified API handler
 */

import { z } from 'zod'
import { createAPIHandler, createCRUDHandler } from '@/lib/api/createAPIHandler'
import { 
  createOrganization,
  listUserOrganizations,
  updateOrganization,
  deleteOrganization,
  getOrganization,
  type CreateOrganizationData,
  type UpdateOrganizationData
} from '@/lib/services/organization'

// Validation schemas
const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(50),
  description: z.string().max(500).optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  organizationSize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional()
})

const UpdateOrganizationSchema = CreateOrganizationSchema.partial().extend({
  organizationId: z.string().uuid()
})

const QuerySchema = z.object({
  userId: z.string().uuid(),
  id: z.string().uuid().optional()
})

/**
 * GET /api/organizations - List user's organizations or get single organization
 */
export const GET = createAPIHandler<any, any>(
  { 
    authenticate: true, 
    cache: { ttl: 300 },
    rateLimit: { requests: 100, window: '1m' },
    validation: { query: QuerySchema }
  },
  async (req) => {
    const { userId, id } = req.validatedQuery
    
    if (id) {
      // Get single organization
      const result = await getOrganization(id, userId)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get organization')
      }

      return {
        success: true,
        data: result.organization
      }
    } else {
      // Get user's organizations
      const result = await listUserOrganizations(userId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to list organizations')
      }

      return {
        success: true,
        data: {
          organizations: result.organizations || [],
          total: result.organizations?.length || 0
        }
      }
    }
  }
)

/**
 * POST /api/organizations - Create a new organization
 */
export const POST = createCRUDHandler.create(
  CreateOrganizationSchema.extend({
    createdBy: z.string().uuid()
  }),
  async (req) => {
    const { createdBy, ...organizationData } = req.validatedBody!
    
    const result = await createOrganization(organizationData as CreateOrganizationData, createdBy)

    if (!result.success) {
      throw new Error(result.error || 'Failed to create organization')
    }

    return {
      success: true,
      data: result.organization,
      message: 'Organization created successfully'
    }
  }
)

/**
 * PUT /api/organizations - Update organization
 */
export const PUT = createCRUDHandler.update(
  UpdateOrganizationSchema.extend({
    userId: z.string().uuid()
  }),
  async (req) => {
    const { organizationId, userId, ...updateData } = req.validatedBody!

    const result = await updateOrganization(
      organizationId,
      updateData as UpdateOrganizationData,
      userId
    )

    if (!result.success) {
      throw new Error(result.error || 'Failed to update organization')
    }

    return {
      success: true,
      data: result.organization,
      message: 'Organization updated successfully'
    }
  }
)

/**
 * DELETE /api/organizations - Delete organization
 */
export const DELETE = createAPIHandler(
  {
    authenticate: true,
    audit: 'delete_organization',
    rateLimit: { requests: 10, window: '1h' },
    validation: {
      query: z.object({
        id: z.string().uuid(),
        userId: z.string().uuid(),
        immediate: z.string().optional()
      })
    }
  },
  async (req) => {
    const { id: organizationId, userId, immediate } = req.validatedQuery!
    const deleteImmediately = immediate === 'true'

    const result = await deleteOrganization(organizationId, userId)

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete organization')
    }

    return {
      success: true,
      data: { 
        organizationId, 
        scheduledDeletion: !deleteImmediately
      },
      message: deleteImmediately 
        ? 'Organization deleted immediately' 
        : 'Organization scheduled for deletion'
    }
  }
)