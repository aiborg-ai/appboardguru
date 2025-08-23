/**
 * Organization Controller
 * Consolidated controller for all organization management features
 * Following enterprise architecture with Repository Pattern and Result<T> types
 * 
 * Consolidates 8 organization API routes into a single controller:
 * - Organization CRUD operations
 * - Member management and invitations
 * - Organization analytics and insights
 * - Subscription management
 * - Bulk operations
 * - Slug availability checking
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { OrganizationRepository } from '@/lib/repositories/organization.repository'
import { OrganizationService } from '@/lib/services/organization.service'
import { NotificationService } from '@/lib/services/notification.service'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { RepositoryFactory } from '@/lib/repositories'
import { Result } from '@/lib/repositories/result'
import { createUserId, createOrganizationId } from '@/lib/utils/branded-type-helpers'
import { logError, logActivity } from '@/lib/utils/logging'
import { validateRequest } from '@/lib/utils/validation'
import { withAuth } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Organization Types
export interface Organization {
  id?: string
  name: string
  slug: string
  description?: string
  industry?: string
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  headquarters?: {
    address?: string
    city?: string
    state?: string
    country: string
    postalCode?: string
  }
  contact?: {
    email?: string
    phone?: string
    website?: string
  }
  settings: {
    timezone: string
    language: string
    dateFormat: string
    currency: string
    fiscalYearStart: string // MM-DD format
    features: {
      aiAssistant: boolean
      voiceFeatures: boolean
      advancedAnalytics: boolean
      complianceTracking: boolean
      customBranding: boolean
    }
    branding?: {
      logo?: string
      primaryColor?: string
      secondaryColor?: string
      fontFamily?: string
    }
    security: {
      mfaRequired: boolean
      passwordPolicy: string
      sessionTimeout: number // minutes
      ipWhitelist?: string[]
      auditLogging: boolean
    }
  }
  subscription?: {
    plan: 'free' | 'starter' | 'professional' | 'enterprise'
    status: 'active' | 'canceled' | 'past_due' | 'unpaid'
    billingCycle: 'monthly' | 'yearly'
    nextBillingDate?: string
    usage?: {
      users: number
      storage: number // bytes
      apiCalls: number
    }
    limits?: {
      maxUsers: number
      maxStorage: number // bytes
      maxApiCalls: number
    }
  }
  metadata?: {
    createdBy: string
    foundedYear?: number
    tags?: string[]
    customFields?: Record<string, any>
  }
}

interface OrganizationMember {
  id?: string
  userId: string
  organizationId: string
  role: 'owner' | 'admin' | 'member' | 'viewer' | 'guest'
  permissions: string[]
  status: 'active' | 'invited' | 'suspended'
  invitedBy?: string
  invitedAt?: string
  joinedAt?: string
  lastActiveAt?: string
  user?: {
    email: string
    name?: string
    avatar?: string
  }
}

interface OrganizationInvitation {
  email: string
  role: OrganizationMember['role']
  permissions?: string[]
  message?: string
  expiresAt?: string
}

interface BulkOperationRequest {
  operation: 'invite' | 'remove' | 'update_role' | 'suspend' | 'activate'
  targets: string[] // user IDs or emails
  data?: any // operation-specific data
}

// Validation Schemas
const organizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description too long').optional(),
  industry: z.string().max(100, 'Industry too long').optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  headquarters: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().min(1, 'Country is required'),
    postalCode: z.string().optional()
  }).optional(),
  contact: z.object({
    email: z.string().email('Invalid email').optional(),
    phone: z.string().optional(),
    website: z.string().url('Invalid website URL').optional()
  }).optional(),
  settings: z.object({
    timezone: z.string().min(1, 'Timezone is required'),
    language: z.string().min(1, 'Language is required'),
    dateFormat: z.string().min(1, 'Date format is required'),
    currency: z.string().min(1, 'Currency is required'),
    fiscalYearStart: z.string().regex(/^\d{2}-\d{2}$/, 'Fiscal year start must be MM-DD format'),
    features: z.object({
      aiAssistant: z.boolean(),
      voiceFeatures: z.boolean(),
      advancedAnalytics: z.boolean(),
      complianceTracking: z.boolean(),
      customBranding: z.boolean()
    }),
    branding: z.object({
      logo: z.string().url().optional(),
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      fontFamily: z.string().optional()
    }).optional(),
    security: z.object({
      mfaRequired: z.boolean(),
      passwordPolicy: z.string(),
      sessionTimeout: z.number().min(15).max(480), // 15 minutes to 8 hours
      ipWhitelist: z.array(z.string().ip()).optional(),
      auditLogging: z.boolean()
    })
  }),
  subscription: z.object({
    plan: z.enum(['free', 'starter', 'professional', 'enterprise']),
    status: z.enum(['active', 'canceled', 'past_due', 'unpaid']),
    billingCycle: z.enum(['monthly', 'yearly']),
    nextBillingDate: z.string().datetime().optional()
  }).optional(),
  metadata: z.object({
    foundedYear: z.number().min(1800).max(new Date().getFullYear()).optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional()
  }).optional()
})

const memberInvitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'member', 'viewer', 'guest']),
  permissions: z.array(z.string()).optional(),
  message: z.string().max(500, 'Message too long').optional(),
  expiresAt: z.string().datetime().optional()
})

const bulkInvitationSchema = z.object({
  invitations: z.array(memberInvitationSchema).min(1).max(100)
})

const memberUpdateSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer', 'guest']).optional(),
  permissions: z.array(z.string()).optional(),
  status: z.enum(['active', 'suspended']).optional()
})

const bulkOperationSchema = z.object({
  operation: z.enum(['invite', 'remove', 'update_role', 'suspend', 'activate']),
  targets: z.array(z.string()).min(1).max(100),
  data: z.any().optional()
})

const subscriptionUpdateSchema = z.object({
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional()
})

export class OrganizationController {
  private organizationService: OrganizationService
  private notificationService: NotificationService
  private analyticsService: AnalyticsService
  private repositoryFactory: RepositoryFactory

  constructor() {
    this.repositoryFactory = new RepositoryFactory(this.createSupabaseClient())
    this.organizationService = new OrganizationService(this.repositoryFactory)
    this.notificationService = new NotificationService(this.repositoryFactory)
    this.analyticsService = new AnalyticsService(this.repositoryFactory)
  }

  private createSupabaseClient() {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
  }

  /**
   * GET /api/organizations
   * Get organizations for current user
   */
  async getOrganizations(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const role = url.searchParams.get('role')

      const organizationsResult = await this.organizationService.getUserOrganizations({
        userId: createUserId(user.id),
        role: role as OrganizationMember['role'] || undefined,
        limit,
        offset
      })

      if (!organizationsResult.success) {
        return NextResponse.json(
          { success: false, error: organizationsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: organizationsResult.data
      })

    } catch (error) {
      logError('Organizations retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Organizations retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/organizations
   * Create a new organization
   */
  async createOrganization(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, organizationSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const organizationData = validation.data as Organization

      // Check slug availability
      const slugResult = await this.organizationService.checkSlugAvailability(organizationData.slug)
      if (!slugResult.success || !slugResult.data.available) {
        return NextResponse.json(
          { success: false, error: 'Organization slug is not available' },
          { status: 409 }
        )
      }

      // Create organization
      const orgResult = await this.organizationService.createOrganization({
        ...organizationData,
        metadata: {
          ...organizationData.metadata,
          createdBy: user.id
        }
      }, createUserId(user.id))

      if (!orgResult.success) {
        return NextResponse.json(
          { success: false, error: orgResult.error },
          { status: 500 }
        )
      }

      // Log organization creation
      await logActivity({
        userId: user.id,
        action: 'organization_created',
        details: {
          organizationId: orgResult.data.id,
          organizationName: organizationData.name,
          plan: organizationData.subscription?.plan || 'free'
        }
      })

      return NextResponse.json({
        success: true,
        data: orgResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Organization creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Organization creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/organizations/[id]
   * Get a specific organization
   */
  async getOrganization(request: NextRequest, organizationId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const orgResult = await this.organizationService.getOrganizationById({
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(user.id)
      })

      if (!orgResult.success) {
        return NextResponse.json(
          { success: false, error: orgResult.error },
          { status: orgResult.error === 'Organization not found' ? 404 : 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: orgResult.data
      })

    } catch (error) {
      logError('Organization retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Organization retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * PUT /api/organizations/[id]
   * Update an organization
   */
  async updateOrganization(request: NextRequest, organizationId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, organizationSchema.partial())
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const updateData = validation.data

      // Check slug availability if slug is being changed
      if (updateData.slug) {
        const slugResult = await this.organizationService.checkSlugAvailability(updateData.slug, organizationId)
        if (!slugResult.success || !slugResult.data.available) {
          return NextResponse.json(
            { success: false, error: 'Organization slug is not available' },
            { status: 409 }
          )
        }
      }

      const orgResult = await this.organizationService.updateOrganization({
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(user.id),
        updateData
      })

      if (!orgResult.success) {
        return NextResponse.json(
          { success: false, error: orgResult.error },
          { status: orgResult.error === 'Organization not found' ? 404 : 500 }
        )
      }

      // Log organization update
      await logActivity({
        userId: user.id,
        action: 'organization_updated',
        details: {
          organizationId,
          changesCount: Object.keys(updateData).length
        }
      })

      return NextResponse.json({
        success: true,
        data: orgResult.data
      })

    } catch (error) {
      logError('Organization update failed', error)
      return NextResponse.json(
        { success: false, error: 'Organization update failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/organizations/check-slug
   * Check if organization slug is available
   */
  async checkSlugAvailability(request: NextRequest): Promise<NextResponse> {
    try {
      const url = new URL(request.url)
      const slug = url.searchParams.get('slug')
      const excludeId = url.searchParams.get('excludeId')

      if (!slug) {
        return NextResponse.json(
          { success: false, error: 'Slug parameter is required' },
          { status: 400 }
        )
      }

      const slugResult = await this.organizationService.checkSlugAvailability(slug, excludeId || undefined)

      if (!slugResult.success) {
        return NextResponse.json(
          { success: false, error: slugResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: slugResult.data
      })

    } catch (error) {
      logError('Slug availability check failed', error)
      return NextResponse.json(
        { success: false, error: 'Slug availability check failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/organizations/[id]/members
   * Get organization members
   */
  async getMembers(request: NextRequest, organizationId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const role = url.searchParams.get('role')
      const status = url.searchParams.get('status')

      const membersResult = await this.organizationService.getOrganizationMembers({
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(user.id),
        role: role as OrganizationMember['role'] || undefined,
        status: status as OrganizationMember['status'] || undefined,
        limit,
        offset
      })

      if (!membersResult.success) {
        return NextResponse.json(
          { success: false, error: membersResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: membersResult.data
      })

    } catch (error) {
      logError('Organization members retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Members retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/organizations/[id]/members
   * Invite member to organization
   */
  async inviteMember(request: NextRequest, organizationId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, memberInvitationSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const invitationData = validation.data as OrganizationInvitation

      const inviteResult = await this.organizationService.inviteMember({
        organizationId: createOrganizationId(organizationId),
        invitedBy: createUserId(user.id),
        invitation: invitationData
      })

      if (!inviteResult.success) {
        return NextResponse.json(
          { success: false, error: inviteResult.error },
          { status: 500 }
        )
      }

      // Send invitation email
      await this.notificationService.sendOrganizationInvitation({
        invitation: inviteResult.data,
        organizationName: inviteResult.data.organizationName,
        inviterName: user.user_metadata?.name || user.email!
      })

      // Log member invitation
      await logActivity({
        userId: user.id,
        action: 'organization_member_invited',
        details: {
          organizationId,
          inviteeEmail: invitationData.email,
          role: invitationData.role
        }
      })

      return NextResponse.json({
        success: true,
        data: inviteResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Member invitation failed', error)
      return NextResponse.json(
        { success: false, error: 'Member invitation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/organizations/[id]/members/bulk
   * Bulk invite members
   */
  async bulkInviteMembers(request: NextRequest, organizationId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, bulkInvitationSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { invitations } = validation.data

      const bulkResult = await this.organizationService.bulkInviteMembers({
        organizationId: createOrganizationId(organizationId),
        invitedBy: createUserId(user.id),
        invitations
      })

      if (!bulkResult.success) {
        return NextResponse.json(
          { success: false, error: bulkResult.error },
          { status: 500 }
        )
      }

      // Send bulk invitation emails
      for (const invitation of bulkResult.data.successful) {
        await this.notificationService.sendOrganizationInvitation({
          invitation,
          organizationName: invitation.organizationName,
          inviterName: user.user_metadata?.name || user.email!
        })
      }

      // Log bulk invitation
      await logActivity({
        userId: user.id,
        action: 'organization_bulk_invite',
        details: {
          organizationId,
          totalInvitations: invitations.length,
          successful: bulkResult.data.successful.length,
          failed: bulkResult.data.failed.length
        }
      })

      return NextResponse.json({
        success: true,
        data: bulkResult.data
      })

    } catch (error) {
      logError('Bulk member invitation failed', error)
      return NextResponse.json(
        { success: false, error: 'Bulk invitation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/organizations/[id]/analytics
   * Get organization analytics
   */
  async getAnalytics(request: NextRequest, organizationId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const timeRange = url.searchParams.get('timeRange') || '30d'
      const metrics = url.searchParams.getAll('metrics')

      const analyticsResult = await this.analyticsService.getOrganizationAnalytics({
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(user.id),
        timeRange,
        metrics: metrics.length > 0 ? metrics : undefined
      })

      if (!analyticsResult.success) {
        return NextResponse.json(
          { success: false, error: analyticsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: analyticsResult.data
      })

    } catch (error) {
      logError('Organization analytics retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Analytics retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * PUT /api/organizations/[id]/subscription
   * Update organization subscription
   */
  async updateSubscription(request: NextRequest, organizationId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, subscriptionUpdateSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const subscriptionData = validation.data

      const subResult = await this.organizationService.updateSubscription({
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(user.id),
        subscriptionData
      })

      if (!subResult.success) {
        return NextResponse.json(
          { success: false, error: subResult.error },
          { status: 500 }
        )
      }

      // Log subscription update
      await logActivity({
        userId: user.id,
        action: 'organization_subscription_updated',
        details: {
          organizationId,
          newPlan: subscriptionData.plan,
          newBillingCycle: subscriptionData.billingCycle
        }
      })

      return NextResponse.json({
        success: true,
        data: subResult.data
      })

    } catch (error) {
      logError('Organization subscription update failed', error)
      return NextResponse.json(
        { success: false, error: 'Subscription update failed' },
        { status: 500 }
      )
    }
  }

  private async getCurrentUser() {
    try {
      const supabase = this.createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      logError('Failed to get current user', error)
      return null
    }
  }
}

// Export controller instance
export const organizationController = new OrganizationController()

// Route handlers for different HTTP methods and endpoints
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, {
    limit: 100,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/check-slug')) {
    return await organizationController.checkSlugAvailability(request)
  } else if (pathname.includes('/analytics')) {
    const orgId = pathname.split('/organizations/')[1]?.split('/')[0]
    if (orgId) {
      return await organizationController.getAnalytics(request, orgId)
    }
  } else if (pathname.includes('/members')) {
    const orgId = pathname.split('/organizations/')[1]?.split('/')[0]
    if (orgId) {
      return await organizationController.getMembers(request, orgId)
    }
  } else if (pathname.includes('/organizations/')) {
    const orgId = pathname.split('/organizations/')[1]?.split('/')[0]
    if (orgId) {
      return await organizationController.getOrganization(request, orgId)
    }
  } else if (pathname.includes('/organizations')) {
    return await organizationController.getOrganizations(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for POST operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 30,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const orgId = pathname.split('/organizations/')[1]?.split('/')[0]

  if (pathname.includes('/members/bulk')) {
    if (orgId) {
      return await organizationController.bulkInviteMembers(request, orgId)
    }
  } else if (pathname.includes('/members')) {
    if (orgId) {
      return await organizationController.inviteMember(request, orgId)
    }
  } else if (pathname.includes('/organizations') && !orgId) {
    return await organizationController.createOrganization(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for PUT operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 50,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const orgId = pathname.split('/organizations/')[1]?.split('/')[0]
  
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'Organization ID required' },
      { status: 400 }
    )
  }

  if (pathname.includes('/subscription')) {
    return await organizationController.updateSubscription(request, orgId)
  } else {
    return await organizationController.updateOrganization(request, orgId)
  }
}