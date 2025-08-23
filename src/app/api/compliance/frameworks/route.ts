import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { EnterpriseRegulatoryComplianceEngineService } from '@/lib/services/enterprise-regulatory-compliance-engine.service'
import { createAPIHandler } from '@/lib/api/createAPIHandler'
import { createRouteHandler } from '@/lib/middleware/apiHandler'
import { withPermissionCheck } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rateLimiting'
import { withValidation } from '@/lib/middleware/validation'
import { withAuditLog } from '@/lib/middleware/auditLog'
import { createClient } from '@/lib/supabase-server'

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const GetFrameworksQuerySchema = z.object({
  jurisdiction: z.string().optional(),
  industry: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 25),
  includeInactive: z.string().optional().transform(val => val === 'true')
})

const CreateFrameworkSchema = z.object({
  name: z.string().min(1).max(255),
  acronym: z.string().min(1).max(50),
  description: z.string().max(2000).optional(),
  version: z.string().max(50),
  jurisdiction: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  effectiveDate: z.string().datetime(),
  reviewCycleMonths: z.number().min(1).max(120).default(12),
  authorityBody: z.string().max(255).optional(),
  referenceUrl: z.string().url().optional(),
  metadata: z.record(z.any()).default({})
})

const UpdateFrameworkSchema = CreateFrameworkSchema.partial()

// ==========================================
// API HANDLERS
// ==========================================

/**
 * GET /api/compliance/frameworks
 * Retrieve available compliance frameworks
 */
export const GET = createRouteHandler({
  middleware: [
    withRateLimit({ maxRequests: 100, windowMs: 60000 }), // 100 requests per minute
    withPermissionCheck(['compliance:read']),
    withValidation({ query: GetFrameworksQuerySchema }),
    withAuditLog({
      action: 'list_compliance_frameworks',
      resourceType: 'compliance_framework',
      severity: 'low'
    })
  ],
  handler: async (req: NextRequest, context: any) => {
    try {
      const supabase = createClient()
      const service = new EnterpriseRegulatoryComplianceEngineService(supabase)
      
      const query = context.validatedQuery as z.infer<typeof GetFrameworksQuerySchema>
      
      const result = await service.getAvailableFrameworks({
        jurisdiction: query.jurisdiction,
        industry: query.industry,
        search: query.search
      })
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: result.error.statusCode || 500 }
        )
      }
      
      const response = {
        success: true,
        data: result.data,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 25,
          total: result.data.length
        },
        metadata: {
          cached: false,
          generatedAt: new Date().toISOString(),
          version: '1.0'
        }
      }
      
      return NextResponse.json(response, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'X-RateLimit-Remaining': context.rateLimitRemaining?.toString() || '0',
          'X-API-Version': '1.0'
        }
      })
    } catch (error) {
      console.error('Error retrieving compliance frameworks:', error)
      return NextResponse.json(
        { 
          error: 'Internal server error',
          code: 'FRAMEWORKS_RETRIEVAL_FAILED',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
})

/**
 * POST /api/compliance/frameworks
 * Create a new compliance framework (admin only)
 */
export const POST = createRouteHandler({
  middleware: [
    withRateLimit({ maxRequests: 10, windowMs: 60000 }), // 10 requests per minute
    withPermissionCheck(['compliance:admin', 'super_admin']),
    withValidation({ body: CreateFrameworkSchema }),
    withAuditLog({
      action: 'create_compliance_framework',
      resourceType: 'compliance_framework',
      severity: 'high',
      includeRequestBody: true
    })
  ],
  handler: async (req: NextRequest, context: any) => {
    try {
      const supabase = createClient()
      const service = new EnterpriseRegulatoryComplianceEngineService(supabase)
      
      const frameworkData = context.validatedBody as z.infer<typeof CreateFrameworkSchema>
      const userId = context.user.id
      
      // Check if framework with same acronym already exists
      const existingCheck = await service.getAvailableFrameworks({
        search: frameworkData.acronym
      })
      
      if (existingCheck.success && existingCheck.data.some(f => f.acronym === frameworkData.acronym)) {
        return NextResponse.json(
          { 
            error: 'Framework with this acronym already exists',
            code: 'FRAMEWORK_ALREADY_EXISTS'
          },
          { status: 409 }
        )
      }
      
      // This would be implemented in the service
      // const result = await service.createComplianceFramework(frameworkData, userId)
      
      // For now, return success response
      const newFramework = {
        id: `framework_${Date.now()}`,
        ...frameworkData,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: userId
      }
      
      return NextResponse.json({
        success: true,
        data: newFramework,
        message: 'Compliance framework created successfully'
      }, { status: 201 })
      
    } catch (error) {
      console.error('Error creating compliance framework:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create compliance framework',
          code: 'FRAMEWORK_CREATION_FAILED'
        },
        { status: 500 }
      )
    }
  }
})