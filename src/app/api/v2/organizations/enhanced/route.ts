/**
 * Enhanced Organizations API Endpoint
 * Uses enhanced repository and service with comprehensive error handling,
 * transaction support, and database validation
 */

import { EnhancedHandlers } from '@/lib/middleware/apiHandler'
import { z } from 'zod'

// Enhanced validation schemas with comprehensive business rules
const CreateOrganizationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim()
    .refine(name => name.length > 0, 'Name cannot be empty'),
  
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), 'Slug cannot start or end with a hyphen')
    .refine(slug => !slug.includes('--'), 'Slug cannot contain consecutive hyphens'),
  
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .transform(desc => desc?.trim() || undefined),
  
  logo_url: z.string()
    .url('Logo URL must be a valid URL')
    .optional()
    .refine(url => !url || (url.startsWith('http://') || url.startsWith('https://')), 'Logo URL must start with http:// or https://'),
  
  website: z.string()
    .url('Website must be a valid URL')
    .optional()
    .refine(url => !url || (url.startsWith('http://') || url.startsWith('https://')), 'Website URL must start with http:// or https://'),
  
  industry: z.string()
    .max(100, 'Industry must be at most 100 characters')
    .optional()
    .transform(industry => industry?.trim() || undefined),
  
  organization_size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise'])
    .optional(),
  
  settings: z.record(z.string(), z.any())
    .optional()
    .default({}),
  
  compliance_settings: z.record(z.string(), z.any())
    .optional()
    .default({}),
  
  billing_settings: z.record(z.string(), z.any())
    .optional()
    .default({})
})

const UpdateOrganizationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim()
    .optional(),
  
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), 'Slug cannot start or end with a hyphen')
    .refine(slug => !slug.includes('--'), 'Slug cannot contain consecutive hyphens')
    .optional(),
  
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .transform(desc => desc?.trim() || undefined),
  
  logo_url: z.string()
    .url('Logo URL must be a valid URL')
    .optional()
    .refine(url => !url || (url.startsWith('http://') || url.startsWith('https://')), 'Logo URL must start with http:// or https://'),
  
  website: z.string()
    .url('Website must be a valid URL')
    .optional()
    .refine(url => !url || (url.startsWith('http://') || url.startsWith('https://')), 'Website URL must start with http:// or https://'),
  
  industry: z.string()
    .max(100, 'Industry must be at most 100 characters')
    .optional()
    .transform(industry => industry?.trim() || undefined),
  
  organization_size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise'])
    .optional(),
  
  settings: z.record(z.string(), z.any()).optional(),
  compliance_settings: z.record(z.string(), z.any()).optional(),
  billing_settings: z.record(z.string(), z.any()).optional()
})

/**
 * POST /api/v2/organizations/enhanced - Create organization with enhanced validation and transactions
 */
export const POST = EnhancedHandlers.post(
  CreateOrganizationSchema,
  {
    rateLimit: { requests: 3, window: '1h' }, // Stricter rate limiting for creation
    audit: true,
    featureFlag: 'USE_ENHANCED_ORGANIZATION_API'
  },
  async (req) => {
    // Get enhanced service from DI container
    const enhancedOrganizationService = req.services.get('EnhancedOrganizationService')
    
    try {
      // Create organization using enhanced service with transaction support
      const organization = await enhancedOrganizationService.createOrganization(
        req.validatedBody!,
        req.user!.id
      )
      
      return {
        organization,
        message: 'Organization created successfully with full transaction support',
        metadata: {
          created_with_enhanced_api: true,
          transaction_completed: true,
          features_initialized: true
        }
      }
    } catch (error: any) {
      // Enhanced error handling with business logic error transformation
      const enhancedError = {
        code: error.code || 'ORGANIZATION_CREATE_FAILED',
        message: error.message || 'Failed to create organization',
        suggestion: error.suggestion || 'Please check your input and try again',
        details: error.details,
        timestamp: new Date().toISOString()
      }

      // Log the error for debugging
      console.error('🚨 Enhanced organization creation failed:', {
        user_id: req.user?.id,
        request_body: req.validatedBody,
        error: enhancedError
      })

      throw new Error(`${enhancedError.message}. ${enhancedError.suggestion}`)
    }
  }
)

/**
 * GET /api/v2/organizations/enhanced - Get organization with enhanced permissions
 */
export const GET = EnhancedHandlers.get(
  {
    validation: { 
      query: z.object({
        id: z.string().uuid('Organization ID must be a valid UUID').optional()
      })
    },
    rateLimit: { requests: 100, window: '1m' },
    cache: { ttl: 60 }, // 1 minute cache
    featureFlag: 'USE_ENHANCED_ORGANIZATION_API'
  },
  async (req) => {
    const enhancedOrganizationService = req.services.get('EnhancedOrganizationService')
    
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('id')
    
    if (!organizationId) {
      throw new Error('Organization ID is required')
    }

    try {
      const organization = await enhancedOrganizationService.getOrganizationById(
        organizationId,
        req.user!.id
      )
      
      return {
        organization,
        metadata: {
          retrieved_with_enhanced_api: true,
          permissions_calculated: true,
          access_validated: true
        }
      }
    } catch (error: any) {
      const enhancedError = {
        code: error.code || 'ORGANIZATION_FETCH_FAILED',
        message: error.message || 'Failed to fetch organization',
        suggestion: error.suggestion || 'Check the organization ID and your permissions'
      }

      console.error('🚨 Enhanced organization fetch failed:', {
        user_id: req.user?.id,
        organization_id: organizationId,
        error: enhancedError
      })

      throw new Error(`${enhancedError.message}. ${enhancedError.suggestion}`)
    }
  }
)

/**
 * PUT /api/v2/organizations/enhanced - Update organization with enhanced validation
 */
export const PUT = EnhancedHandlers.put(
  UpdateOrganizationSchema,
  {
    validation: {
      query: z.object({
        id: z.string().uuid('Organization ID must be a valid UUID')
      })
    },
    rateLimit: { requests: 10, window: '1h' },
    audit: true,
    featureFlag: 'USE_ENHANCED_ORGANIZATION_API'
  },
  async (req) => {
    const enhancedOrganizationService = req.services.get('EnhancedOrganizationService')
    
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('id')
    
    if (!organizationId) {
      throw new Error('Organization ID is required')
    }

    try {
      const organization = await enhancedOrganizationService.updateOrganization(
        organizationId,
        req.validatedBody!,
        req.user!.id
      )
      
      return {
        organization,
        message: 'Organization updated successfully',
        metadata: {
          updated_with_enhanced_api: true,
          validation_passed: true,
          permissions_checked: true
        }
      }
    } catch (error: any) {
      const enhancedError = {
        code: error.code || 'ORGANIZATION_UPDATE_FAILED',
        message: error.message || 'Failed to update organization',
        suggestion: error.suggestion || 'Check your permissions and input data'
      }

      console.error('🚨 Enhanced organization update failed:', {
        user_id: req.user?.id,
        organization_id: organizationId,
        request_body: req.validatedBody,
        error: enhancedError
      })

      throw new Error(`${enhancedError.message}. ${enhancedError.suggestion}`)
    }
  }
)

/**
 * DELETE /api/v2/organizations/enhanced - Delete organization with enhanced validation
 */
export const DELETE = EnhancedHandlers.delete(
  {
    validation: {
      query: z.object({
        id: z.string().uuid('Organization ID must be a valid UUID')
      })
    },
    rateLimit: { requests: 2, window: '1h' }, // Very strict rate limiting for deletions
    audit: true,
    featureFlag: 'USE_ENHANCED_ORGANIZATION_API'
  },
  async (req) => {
    const enhancedOrganizationService = req.services.get('EnhancedOrganizationService')
    
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('id')
    
    if (!organizationId) {
      throw new Error('Organization ID is required')
    }

    try {
      await enhancedOrganizationService.deleteOrganization(
        organizationId,
        req.user!.id
      )
      
      return {
        organization_id: organizationId,
        message: 'Organization scheduled for deletion successfully',
        deletion_info: {
          type: 'soft_delete',
          grace_period_days: 30,
          permanent_deletion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        metadata: {
          deleted_with_enhanced_api: true,
          business_rules_validated: true,
          audit_logged: true
        }
      }
    } catch (error: any) {
      const enhancedError = {
        code: error.code || 'ORGANIZATION_DELETE_FAILED',
        message: error.message || 'Failed to delete organization',
        suggestion: error.suggestion || 'Check your ownership permissions'
      }

      console.error('🚨 Enhanced organization deletion failed:', {
        user_id: req.user?.id,
        organization_id: organizationId,
        error: enhancedError
      })

      throw new Error(`${enhancedError.message}. ${enhancedError.suggestion}`)
    }
  }
)