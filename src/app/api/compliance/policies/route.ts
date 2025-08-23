import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PolicyLifecycleManagementService } from '@/lib/services/policy-lifecycle-management.service'
import { createRouteHandler } from '@/lib/middleware/apiHandler'
import { withPermissionCheck } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rateLimiting'
import { withValidation } from '@/lib/middleware/validation'
import { withAuditLog } from '@/lib/middleware/auditLog'
import { createClient } from '@/lib/supabase-server'
import { createOrganizationId, createComplianceFrameworkId, createUserId, createCompliancePolicyId } from '@/types/branded'

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const GetPoliciesQuerySchema = z.object({
  organizationId: z.string().min(1),
  frameworkId: z.string().optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'active', 'expired', 'deprecated', 'archived']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  tags: z.string().optional().transform(val => val ? val.split(',') : undefined),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 25),
  includeContent: z.string().optional().transform(val => val === 'true'),
  includeMetrics: z.string().optional().transform(val => val === 'true'),
  sortBy: z.enum(['title', 'created_at', 'updated_at', 'effective_date', 'status']).optional().default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

const CreatePolicyFromTemplateSchema = z.object({
  organizationId: z.string().min(1),
  templateId: z.string().min(1),
  title: z.string().min(1).max(500),
  policyCode: z.string().min(1).max(100),
  variables: z.record(z.any()),
  distribution: z.object({
    target: z.object({
      departments: z.array(z.string()).default([]),
      roles: z.array(z.string()).default([]),
      specificUsers: z.array(z.string()).default([]),
      locations: z.array(z.string()).default([]),
      subsidiaries: z.array(z.string()).default([])
    }),
    method: z.enum(['email', 'portal', 'training', 'all']),
    acknowledgment: z.object({
      required: z.boolean(),
      deadline: z.string().datetime().optional()
    }),
    training: z.object({
      required: z.boolean(),
      trainingModuleId: z.string().optional(),
      deadline: z.string().datetime().optional()
    })
  }),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
})

const CreatePolicyDirectSchema = z.object({
  organizationId: z.string().min(1),
  frameworkId: z.string().min(1),
  title: z.string().min(1).max(500),
  policyCode: z.string().min(1).max(100),
  content: z.object({
    sections: z.array(z.object({
      sectionId: z.string(),
      title: z.string(),
      content: z.string(),
      order: z.number()
    })),
    variables: z.record(z.any()).default({}),
    attachments: z.array(z.any()).default([])
  }),
  distribution: z.object({
    target: z.object({
      departments: z.array(z.string()).default([]),
      roles: z.array(z.string()).default([]),
      specificUsers: z.array(z.string()).default([]),
      locations: z.array(z.string()).default([]),
      subsidiaries: z.array(z.string()).default([])
    }),
    method: z.enum(['email', 'portal', 'training', 'all']),
    acknowledgment: z.object({
      required: z.boolean(),
      deadline: z.string().datetime().optional()
    }),
    training: z.object({
      required: z.boolean(),
      trainingModuleId: z.string().optional(),
      deadline: z.string().datetime().optional()
    })
  }),
  lifecycle: z.object({
    effectiveDate: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional(),
    reviewDate: z.string().datetime().optional()
  }).optional(),
  tags: z.array(z.string()).default([]),
  searchKeywords: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
})

const UpdatePolicySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'active', 'expired', 'deprecated', 'archived']).optional(),
  content: z.object({
    sections: z.array(z.object({
      sectionId: z.string(),
      title: z.string(),
      content: z.string(),
      order: z.number(),
      comments: z.string().optional()
    })).optional(),
    variables: z.record(z.any()).optional(),
    attachments: z.array(z.any()).optional()
  }).optional(),
  lifecycle: z.object({
    effectiveDate: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional(),
    reviewDate: z.string().datetime().optional(),
    retirementDate: z.string().datetime().optional()
  }).optional(),
  distribution: z.object({
    target: z.object({
      departments: z.array(z.string()).optional(),
      roles: z.array(z.string()).optional(),
      specificUsers: z.array(z.string()).optional(),
      locations: z.array(z.string()).optional(),
      subsidiaries: z.array(z.string()).optional()
    }).optional(),
    method: z.enum(['email', 'portal', 'training', 'all']).optional(),
    acknowledgment: z.object({
      required: z.boolean().optional(),
      deadline: z.string().datetime().optional()
    }).optional(),
    training: z.object({
      required: z.boolean().optional(),
      trainingModuleId: z.string().optional(),
      deadline: z.string().datetime().optional()
    }).optional()
  }).optional(),
  tags: z.array(z.string()).optional(),
  searchKeywords: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
})

const PolicyApprovalSchema = z.object({
  stageId: z.string().min(1),
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().max(2000).optional(),
  conditions: z.array(z.string()).optional()
})

// ==========================================
// API HANDLERS
// ==========================================

/**
 * GET /api/compliance/policies
 * Retrieve policies with filtering and search
 */
export const GET = createRouteHandler({
  middleware: [
    withRateLimit({ maxRequests: 100, windowMs: 60000 }),
    withPermissionCheck(['policy:read', 'compliance:read']),
    withValidation({ query: GetPoliciesQuerySchema }),
    withAuditLog({
      action: 'list_policies',
      resourceType: 'policy_document',
      severity: 'low'
    })
  ],
  handler: async (req: NextRequest, context: any) => {
    try {
      const supabase = createClient()
      const service = new PolicyLifecycleManagementService(supabase)
      
      const query = context.validatedQuery as z.infer<typeof GetPoliciesQuerySchema>
      const organizationIdResult = createOrganizationId(query.organizationId)
      
      if (!organizationIdResult.success) {
        return NextResponse.json(
          { error: 'Invalid organization ID', code: 'INVALID_ORGANIZATION_ID' },
          { status: 400 }
        )
      }
      
      const organizationId = organizationIdResult.data!
      
      // Get policies from repository (this would be implemented)
      const policies = await service.complianceRepository.findPoliciesByOrganization(
        organizationId,
        query.frameworkId ? createComplianceFrameworkId(query.frameworkId).data : undefined,
        {
          search: query.search,
          page: query.page,
          limit: query.limit,
          filters: {
            status: query.status,
            category: query.category,
            tags: query.tags
          }
        }
      )
      
      if (!policies.success) {
        return NextResponse.json(
          { error: policies.error.message, code: 'POLICIES_RETRIEVAL_FAILED' },
          { status: policies.error.statusCode || 500 }
        )
      }
      
      // Transform policies data
      const transformedPolicies = policies.data.data.map(policy => {
        const transformed: any = {
          id: policy.id,
          title: policy.title,
          policyCode: policy.policy_code,
          version: policy.version,
          status: policy.status,
          frameworkId: policy.framework_id,
          createdAt: policy.created_at,
          updatedAt: policy.updated_at,
          effectiveDate: policy.effective_date,
          expiryDate: policy.expiry_date,
          reviewDate: policy.review_date,
          tags: policy.tags,
          createdBy: policy.created_by
        }
        
        // Include content if requested
        if (query.includeContent) {
          transformed.content = {
            summary: policy.summary,
            scope: policy.scope,
            sections: policy.content ? JSON.parse(policy.content) : []
          }
        }
        
        // Include metrics if requested
        if (query.includeMetrics) {
          transformed.metrics = {
            acknowledgementsCount: 0, // Would be calculated
            trainingCompletions: 0,
            violationsCount: 0,
            lastAccessed: null,
            popularityScore: 0
          }
        }
        
        return transformed
      })
      
      const response = {
        success: true,
        data: {
          policies: transformedPolicies,
          summary: {
            total: policies.data.total,
            byStatus: transformedPolicies.reduce((acc, policy) => {
              acc[policy.status] = (acc[policy.status] || 0) + 1
              return acc
            }, {} as Record<string, number>),
            byFramework: transformedPolicies.reduce((acc, policy) => {
              acc[policy.frameworkId] = (acc[policy.frameworkId] || 0) + 1
              return acc
            }, {} as Record<string, number>),
            upcomingReviews: transformedPolicies.filter(p => {
              if (!p.reviewDate) return false
              const reviewDate = new Date(p.reviewDate)
              const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              return reviewDate <= thirtyDaysFromNow
            }).length,
            expiringSoon: transformedPolicies.filter(p => {
              if (!p.expiryDate) return false
              const expiryDate = new Date(p.expiryDate)
              const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
              return expiryDate <= ninetyDaysFromNow
            }).length
          }
        },
        pagination: {
          page: query.page || 1,
          limit: query.limit || 25,
          total: policies.data.total,
          pages: Math.ceil(policies.data.total / (query.limit || 25))
        },
        metadata: {
          filters: {
            organizationId: query.organizationId,
            frameworkId: query.frameworkId,
            status: query.status,
            category: query.category,
            search: query.search,
            tags: query.tags
          },
          includeContent: query.includeContent,
          includeMetrics: query.includeMetrics,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          generatedAt: new Date().toISOString()
        }
      }
      
      return NextResponse.json(response, {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300',
          'X-Total-Count': policies.data.total.toString()
        }
      })
      
    } catch (error) {
      console.error('Error retrieving policies:', error)
      return NextResponse.json(
        {
          error: 'Failed to retrieve policies',
          code: 'POLICIES_RETRIEVAL_FAILED',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
})

/**
 * POST /api/compliance/policies
 * Create a new policy from template or directly
 */
export const POST = createRouteHandler({
  middleware: [
    withRateLimit({ maxRequests: 20, windowMs: 60000 }),
    withPermissionCheck(['policy:write', 'compliance:write']),
    withAuditLog({
      action: 'create_policy',
      resourceType: 'policy_document',
      severity: 'medium',
      includeRequestBody: true
    })
  ],
  handler: async (req: NextRequest, context: any) => {
    try {
      const supabase = createClient()
      const service = new PolicyLifecycleManagementService(supabase)
      const body = await req.json()
      const userId = createUserId(context.user.id)
      
      if (!userId.success) {
        return NextResponse.json(
          { error: 'Invalid user ID', code: 'INVALID_USER_ID' },
          { status: 400 }
        )
      }
      
      // Determine if creating from template or directly
      if (body.templateId) {
        // Create from template
        const validation = CreatePolicyFromTemplateSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json(
            {
              error: 'Invalid policy template data',
              code: 'VALIDATION_FAILED',
              details: validation.error.issues
            },
            { status: 400 }
          )
        }
        
        const organizationIdResult = createOrganizationId(validation.data.organizationId)
        if (!organizationIdResult.success) {
          return NextResponse.json(
            { error: 'Invalid organization ID', code: 'INVALID_ORGANIZATION_ID' },
            { status: 400 }
          )
        }
        
        const policyData = {
          organizationId: organizationIdResult.data!,
          title: validation.data.title,
          policyCode: validation.data.policyCode,
          variables: validation.data.variables,
          distribution: {
            ...validation.data.distribution,
            acknowledgment: {
              ...validation.data.distribution.acknowledgment,
              deadline: validation.data.distribution.acknowledgment.deadline ? 
                new Date(validation.data.distribution.acknowledgment.deadline) : undefined
            },
            training: {
              ...validation.data.distribution.training,
              deadline: validation.data.distribution.training.deadline ? 
                new Date(validation.data.distribution.training.deadline) : undefined
            }
          }
        }
        
        const result = await service.createPolicyFromTemplate(
          validation.data.templateId,
          policyData,
          userId.data!
        )
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.error.message, code: 'POLICY_TEMPLATE_CREATION_FAILED' },
            { status: result.error.statusCode || 500 }
          )
        }
        
        return NextResponse.json({
          success: true,
          data: {
            ...result.data,
            creationMethod: 'template'
          },
          message: 'Policy created from template successfully'
        }, { status: 201 })
        
      } else {
        // Create directly
        const validation = CreatePolicyDirectSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json(
            {
              error: 'Invalid policy data',
              code: 'VALIDATION_FAILED',
              details: validation.error.issues
            },
            { status: 400 }
          )
        }
        
        const organizationIdResult = createOrganizationId(validation.data.organizationId)
        const frameworkIdResult = createComplianceFrameworkId(validation.data.frameworkId)
        
        if (!organizationIdResult.success || !frameworkIdResult.success) {
          return NextResponse.json(
            { error: 'Invalid organization or framework ID', code: 'INVALID_IDS' },
            { status: 400 }
          )
        }
        
        const policyData = {
          organization_id: organizationIdResult.data!,
          framework_id: frameworkIdResult.data!,
          title: validation.data.title,
          policy_code: validation.data.policyCode,
          version: '1.0',
          content: JSON.stringify(validation.data.content),
          summary: validation.data.content.sections.find(s => s.sectionId === 'summary')?.content,
          scope: validation.data.content.sections.find(s => s.sectionId === 'scope')?.content,
          effective_date: validation.data.lifecycle?.effectiveDate ? 
            new Date(validation.data.lifecycle.effectiveDate).toISOString() : undefined,
          expiry_date: validation.data.lifecycle?.expiryDate ? 
            new Date(validation.data.lifecycle.expiryDate).toISOString() : undefined,
          review_date: validation.data.lifecycle?.reviewDate ? 
            new Date(validation.data.lifecycle.reviewDate).toISOString() : undefined,
          tags: validation.data.tags,
          metadata: validation.data.metadata
        }
        
        const result = await service.complianceRepository.createCompliancePolicy(
          policyData,
          userId.data!
        )
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.error.message, code: 'POLICY_CREATION_FAILED' },
            { status: result.error.statusCode || 500 }
          )
        }
        
        return NextResponse.json({
          success: true,
          data: {
            ...result.data,
            creationMethod: 'direct'
          },
          message: 'Policy created successfully'
        }, { status: 201 })
      }
      
    } catch (error) {
      console.error('Error creating policy:', error)
      return NextResponse.json(
        {
          error: 'Failed to create policy',
          code: 'POLICY_CREATION_FAILED',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
})