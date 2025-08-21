/**
 * Endpoint Registry Initialization
 * Registers all API endpoints with OpenAPI documentation
 */

import { openAPIRegistry } from './registry'
import { z } from 'zod'

// Schema definitions for Organizations API
const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  logo_url: z.string().url().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  organization_size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional()
})

const OrganizationResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  logo_url: z.string().url().nullable(),
  website: z.string().url().nullable(),
  industry: z.string().nullable(),
  organization_size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).nullable(),
  created_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  is_active: z.boolean()
})

const OrganizationListResponseSchema = z.object({
  items: z.array(OrganizationResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_next: z.boolean(),
    has_prev: z.boolean()
  })
})

const UpdateOrganizationSchema = CreateOrganizationSchema.partial()

const OrganizationQuerySchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  search: z.string().optional(),
  industry: z.string().optional(),
  organization_size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  sort_by: z.enum(['name', 'created_at', 'updated_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
})

// Common response schemas
const ErrorResponseSchema = z.object({
  success: z.boolean(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.string()).optional()
  })
})

const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema,
  meta: z.object({
    timing: z.object({
      duration: z.number(),
      cached: z.boolean()
    }).optional()
  }).optional()
})

/**
 * Initialize all API endpoints with OpenAPI registry
 */
export function initializeEndpointRegistry(): void {
  console.log('[OpenAPI] Initializing endpoint registry...')
  
  // Organizations API endpoints
  registerOrganizationsEndpoints()
  
  // Future: Add other domain endpoints here
  // registerAssetsEndpoints()
  // registerBoardmatesEndpoints()
  // registerVaultsEndpoints()

  const stats = openAPIRegistry.getStats()
  console.log(`[OpenAPI] Registry initialized with ${stats.total} endpoints`)
}

/**
 * Register all Organizations API endpoints
 */
function registerOrganizationsEndpoints(): void {
  // POST /api/organizations - Create Organization
  openAPIRegistry.register({
    method: 'POST',
    path: '/api/organizations',
    summary: 'Create a new organization',
    description: 'Creates a new organization with the provided details. The creator becomes the owner with full administrative privileges.',
    tags: ['Organizations'],
    requestSchema: CreateOrganizationSchema,
    responseSchema: SuccessResponseSchema(OrganizationResponseSchema),
    requiresAuth: true,
    rateLimit: '5 requests per hour',
    examples: {
      request: {
        name: 'Acme Corporation',
        slug: 'acme-corp',
        description: 'Leading provider of innovative solutions',
        logo_url: 'https://example.com/logo.png',
        website: 'https://acmecorp.com',
        industry: 'Technology',
        organization_size: 'medium'
      },
      response: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Acme Corporation',
          slug: 'acme-corp',
          description: 'Leading provider of innovative solutions',
          logo_url: 'https://example.com/logo.png',
          website: 'https://acmecorp.com',
          industry: 'Technology',
          organization_size: 'medium',
          created_by: '456e7890-e89b-12d3-a456-426614174001',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_active: true
        }
      }
    }
  }, 'src/app/api/organizations/route.ts')

  // GET /api/organizations - List Organizations
  openAPIRegistry.register({
    method: 'GET',
    path: '/api/organizations',
    summary: 'List organizations',
    description: 'Retrieves a paginated list of organizations the authenticated user has access to, with optional filtering and sorting.',
    tags: ['Organizations'],
    querySchema: OrganizationQuerySchema,
    responseSchema: SuccessResponseSchema(OrganizationListResponseSchema),
    requiresAuth: true,
    examples: {
      response: {
        success: true,
        data: {
          items: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Acme Corporation',
              slug: 'acme-corp',
              description: 'Leading provider of innovative solutions',
              logo_url: 'https://example.com/logo.png',
              website: 'https://acmecorp.com',
              industry: 'Technology',
              organization_size: 'medium',
              created_by: '456e7890-e89b-12d3-a456-426614174001',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              is_active: true
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false
          }
        }
      }
    }
  }, 'src/app/api/organizations/route.ts')

  // GET /api/organizations/{id} - Get Organization by ID
  openAPIRegistry.register({
    method: 'GET',
    path: '/api/organizations/{id}',
    summary: 'Get organization by ID',
    description: 'Retrieves a specific organization by its unique identifier. Returns detailed organization information including member count and creator details.',
    tags: ['Organizations'],
    responseSchema: SuccessResponseSchema(OrganizationResponseSchema),
    requiresAuth: true,
    examples: {
      response: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Acme Corporation',
          slug: 'acme-corp',
          description: 'Leading provider of innovative solutions',
          logo_url: 'https://example.com/logo.png',
          website: 'https://acmecorp.com',
          industry: 'Technology',
          organization_size: 'medium',
          created_by: '456e7890-e89b-12d3-a456-426614174001',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_active: true
        }
      }
    }
  }, 'src/app/api/organizations/[id]/route.ts')

  // PUT /api/organizations/{id} - Update Organization
  openAPIRegistry.register({
    method: 'PUT',
    path: '/api/organizations/{id}',
    summary: 'Update organization',
    description: 'Updates an existing organization. Only organization owners or administrators can perform this operation.',
    tags: ['Organizations'],
    requestSchema: UpdateOrganizationSchema,
    responseSchema: SuccessResponseSchema(OrganizationResponseSchema),
    requiresAuth: true,
    rateLimit: '10 requests per hour',
    examples: {
      request: {
        name: 'Acme Corporation Ltd',
        description: 'Updated description for the company'
      },
      response: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Acme Corporation Ltd',
          slug: 'acme-corp',
          description: 'Updated description for the company',
          logo_url: 'https://example.com/logo.png',
          website: 'https://acmecorp.com',
          industry: 'Technology',
          organization_size: 'medium',
          created_by: '456e7890-e89b-12d3-a456-426614174001',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
          is_active: true
        }
      }
    }
  }, 'src/app/api/organizations/[id]/route.ts')

  // DELETE /api/organizations/{id} - Delete Organization
  openAPIRegistry.register({
    method: 'DELETE',
    path: '/api/organizations/{id}',
    summary: 'Delete organization',
    description: 'Soft deletes an organization. The organization will be scheduled for permanent deletion after 30 days. Only organization owners can perform this operation.',
    tags: ['Organizations'],
    responseSchema: SuccessResponseSchema(z.object({ message: z.string() })),
    requiresAuth: true,
    rateLimit: '3 requests per hour',
    examples: {
      response: {
        success: true,
        data: {
          message: 'Organization scheduled for deletion in 30 days'
        }
      }
    }
  }, 'src/app/api/organizations/[id]/route.ts')

  console.log('[OpenAPI] Registered Organizations endpoints')
}

/**
 * Register Assets API endpoints (placeholder for future implementation)
 */
function registerAssetsEndpoints(): void {
  // This would register endpoints like:
  // GET /api/assets
  // POST /api/assets/upload
  // GET /api/assets/{id}
  // DELETE /api/assets/{id}
  // POST /api/assets/{id}/annotations
  // GET /api/assets/{id}/download
  
  console.log('[OpenAPI] Assets endpoints not yet registered')
}

/**
 * Register Vaults API endpoints (placeholder for future implementation)  
 */
function registerVaultsEndpoints(): void {
  // This would register endpoints like:
  // GET /api/vaults
  // POST /api/vaults/create  
  // GET /api/vaults/{id}
  // PUT /api/vaults/{id}
  // DELETE /api/vaults/{id}
  // GET /api/vaults/{id}/assets
  // POST /api/vaults/{id}/assets
  
  console.log('[OpenAPI] Vaults endpoints not yet registered')
}

/**
 * Register Boardmates API endpoints (placeholder for future implementation)
 */
function registerBoardmatesEndpoints(): void {
  // This would register endpoints like:
  // GET /api/boardmates
  // POST /api/boardmates
  // GET /api/boardmates/{id}
  // PUT /api/boardmates/{id}
  // DELETE /api/boardmates/{id}
  
  console.log('[OpenAPI] Boardmates endpoints not yet registered')
}